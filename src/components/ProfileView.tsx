import React, { useState } from 'react';
import { Camera, Trash2, Save, KeyRound } from 'lucide-react';
import type { LanguageCode, UserProfile } from '../types';
import { trText } from '../utils/i18n';
import { shrinkImageFile } from '../utils/imageShrink';

interface ProfileViewProps {
  user: UserProfile;
  lang: LanguageCode;
  onUpdateProfile: (payload: {
    nm?: string;
    lg?: string;
    school?: string;
    subject?: string;
    avatar?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<string | null>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  lang,
  onUpdateProfile,
}) => {
  const tx = (s: string) => trText(s, lang);
  const [nm, setNm] = useState(user.nm);
  const [lg, setLg] = useState(user.lg);
  const [school, setSchool] = useState(user.school || '');
  const [subject, setSubject] = useState(user.subject || '');
  const [avatar, setAvatar] = useState(user.avatar || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileErr('');
    try {
      const dataUrl = await shrinkImageFile(file, 320, 180_000);
      setAvatar(dataUrl);
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Rasm yuklanmadi.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setBusy(true);
    const err = await onUpdateProfile({ nm, lg, school, subject, avatar });
    setBusy(false);
    if (err) setProfileErr(err);
    else setProfileMsg('Profil ma’lumotlari saqlandi.');
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwErr('');
    if (newPassword !== confirmPassword) {
      setPwErr('Yangi parollar mos kelmadi.');
      return;
    }
    setBusy(true);
    const err = await onUpdateProfile({ currentPassword, newPassword });
    setBusy(false);
    if (err) {
      setPwErr(err);
    } else {
      setPwMsg('Parol muvaffaqiyatli almashtirildi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {tx('Profil va sozlamalar')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {tx('Profil rasmi, ismingiz, maktab/fan ma’lumotlari va parolni shu yerdan yangilang.')}
        </p>
      </div>

      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 space-y-5"
      >
        <h2 className="font-display font-bold text-base">
          {tx('Shaxsiy ma’lumotlar va rasm')}
        </h2>

        <div className="flex flex-wrap items-center gap-5">
          {avatar ? (
            <img
              src={avatar}
              alt={nm}
              className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/40"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-600 text-white font-display font-extrabold text-2xl flex items-center justify-center">
              {nm.slice(0, 1).toUpperCase() || 'U'}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Camera className="w-4 h-4 text-indigo-500" />
              <span>{tx('Rasm yuklash')}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar('')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-500/10"
              >
                <Trash2 className="w-4 h-4" />
                <span>{tx('Rasmni olib tashlash')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-nm" className="block text-xs font-semibold mb-1.5">
              {tx('Ism va familiya')}
            </label>
            <input
              id="prof-nm"
              value={nm}
              onChange={(e) => setNm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label htmlFor="prof-lg" className="block text-xs font-semibold mb-1.5">
              {tx('Login')}
            </label>
            <input
              id="prof-lg"
              value={lg}
              onChange={(e) => setLg(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label htmlFor="prof-sch" className="block text-xs font-semibold mb-1.5">
              {tx('Maktab / Ta’lim muassasasi')}
            </label>
            <input
              id="prof-sch"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Masalan: 15-umumta’lim maktabi"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label htmlFor="prof-sub" className="block text-xs font-semibold mb-1.5">
              {tx('Fan / Yo‘nalish')}
            </label>
            <input
              id="prof-sub"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Masalan: Matematika"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        </div>

        {profileErr && (
          <p className="text-sm font-medium text-rose-500">{tx(profileErr)}</p>
        )}
        {profileMsg && (
          <p className="text-sm font-medium text-emerald-500">{tx(profileMsg)}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{tx('Saqlash')}</span>
        </button>
      </form>

      <form
        onSubmit={handleSavePassword}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 space-y-4"
      >
        <h2 className="font-display font-bold text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-500" />
          <span>{tx('Parolni almashtirish')}</span>
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pw-cur" className="block text-xs font-semibold mb-1.5">
              {tx('Joriy parol')}
            </label>
            <input
              id="pw-cur"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label htmlFor="pw-new" className="block text-xs font-semibold mb-1.5">
              {tx('Yangi parol')}
            </label>
            <input
              id="pw-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
          <div>
            <label htmlFor="pw-cfm" className="block text-xs font-semibold mb-1.5">
              {tx('Yangi parolni tasdiqlang')}
            </label>
            <input
              id="pw-cfm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>
        </div>

        {pwErr && <p className="text-sm font-medium text-rose-500">{tx(pwErr)}</p>}
        {pwMsg && (
          <p className="text-sm font-medium text-emerald-500">{tx(pwMsg)}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold"
        >
          {tx('Parolni yangilash')}
        </button>
      </form>
    </div>
  );
};
