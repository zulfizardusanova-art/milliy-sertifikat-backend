import React, { useState } from 'react';
import {
  GraduationCap,
  Play,
  Lock,
  CheckCircle2,
  Clock,
  Infinity as InfinityIcon,
  Wand2,
} from 'lucide-react';
import type {
  Attempt,
  LanguageCode,
  PaymentRequest,
  Question,
  TestItem,
  UserProfile,
} from '../types';
import { formatDurationSpan, formatSom, trText } from '../utils/i18n';
import { attestationCategory } from '../utils/rasch';
import { ATTESTATION_SUBJECTS } from '../utils/attestationBank';
import { canUseAiGenerator } from '../utils/aiTestGen';

interface AttestatsiyaViewProps {
  user: UserProfile;
  tests: TestItem[];
  attempts: Attempt[];
  starts: Record<string, number>;
  myRequests: PaymentRequest[];
  lang: LanguageCode;
  onStartTest: (testId: string) => void;
  onOpenPayModal: (test: TestItem) => void;
  onViewResult: (test: TestItem, attempt: Attempt) => void;
  onAutoCreateAttestation: (payload: {
    title: string;
    subject: string;
    targetGrade: string;
    count: number;
    dur: number;
    isUnlimitedTime: boolean;
    price: number;
    promptNote?: string;
    mode?: 'ai' | 'bank';
  }) => Promise<string | null>;
}

export const AttestatsiyaView: React.FC<AttestatsiyaViewProps> = ({
  user,
  tests,
  attempts,
  starts,
  myRequests,
  lang,
  onStartTest,
  onOpenPayModal,
  onViewResult,
  onAutoCreateAttestation,
}) => {
  const tx = (s: string) => trText(s, lang);
  const isStaff = user.role !== 'user';
  const isOwner = canUseAiGenerator(user.role);
  const hasPremium = isStaff || (user.prem || 0) > Date.now();
  const now = Date.now();

  const [showBuilder, setShowBuilder] = useState(false);
  const [subject, setSubject] = useState('matematika');
  const [targetGrade, setTargetGrade] = useState('Oliy va 1-toifa');
  const [count, setCount] = useState(50);
  const [dur, setDur] = useState(120);
  const [isUnlimitedTime, setIsUnlimitedTime] = useState(false);
  const [price, setPrice] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [promptNote, setPromptNote] = useState('');
  const [genMode, setGenMode] = useState<'ai' | 'bank'>('ai');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const attestationTests = tests
    .filter((t) => t.category === 'attestation')
    .sort((a, b) => b.at - a.at);

  const canTake = (t: TestItem) => {
    if (isStaff || t.price <= 0 || hasPremium) return true;
    return user.unlockedTests?.includes(t.id) ?? false;
  };

  const handleGenerate = async (e: React.FormEvent, modeOverride?: 'ai' | 'bank') => {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    const chosenMode = modeOverride || genMode;
    const subjObj = ATTESTATION_SUBJECTS.find((s) => s.id === subject);
    const title =
      customTitle.trim() ||
      `Attestatsiya: ${subjObj?.label || subject} (${targetGrade})`;
    const err = await onAutoCreateAttestation({
      title,
      subject,
      targetGrade,
      count,
      dur,
      isUnlimitedTime,
      price,
      promptNote: promptNote.trim(),
      mode: chosenMode,
    });
    setBusy(false);
    if (err) {
      setMsg(err);
    } else {
      setShowBuilder(false);
      setCustomTitle('');
      setPromptNote('');
    }
  };

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/10 dark:via-[#10182b] dark:to-[#10182b] p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <GraduationCap className="w-4 h-4" />
              <span>{tx('Maktab o‘qituvchilari malaka sinovi')}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              {tx('Ustozlar Attestatsiyasi')}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {tx(
                'O‘zbekiston Maktabgacha va maktab ta’limi vazirligi attestatsiya mezonlari asosida: 50 ta test savoli (35 mutaxassislik fani, 5 kasb standarti, 10 pedagogika va psixologiya), 120 daqiqa, 100 ballik tizim (har to‘g‘ri javob 2 ball).'
              )}
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setShowBuilder((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold whitespace-nowrap transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              <span>{tx('AI bilan Attestatsiya yaratish')}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {[
            ['80–100 ball', 'Oliy toifa', 'text-emerald-600 dark:text-emerald-400'],
            ['70–79 ball', 'Birinchi toifa', 'text-indigo-600 dark:text-indigo-400'],
            ['60–69 ball', 'Ikkinchi toifa', 'text-amber-600 dark:text-amber-400'],
            ['55–59 ball', 'Mutaxassis', 'text-sky-600 dark:text-sky-400'],
            ['0–54 ball', 'O‘tmagan', 'text-rose-500 dark:text-rose-400'],
          ].map(([range, label, color]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-3.5"
            >
              <div className={`font-mono font-bold text-sm tabular-nums ${color}`}>
                {range}
              </div>
              <div className="text-xs font-semibold mt-0.5 text-slate-700 dark:text-slate-300">
                {tx(label)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isOwner && showBuilder && (
        <form
          onSubmit={(e) => handleGenerate(e)}
          className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-[#0d1526] p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-lg">
                {tx('Owner AI Attestatsiya generatori')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tx('Faqat Owner boshqaradi: AI savollar va to‘g‘ri javoblarni avtomatik tuzadi')}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setGenMode('ai')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  genMode === 'ai'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-500'
                }`}
              >
                {tx('AI (Gemini)')}
              </button>
              <button
                type="button"
                onClick={() => setGenMode('bank')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  genMode === 'bank'
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
                    : 'text-slate-500'
                }`}
              >
                {tx('O‘quv banki')}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {tx('Fan va yo‘nalish')}
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                {ATTESTATION_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {tx('Maqsadli toifa')}
              </label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="Oliy va 1-toifa">Oliy va 1-toifa</option>
                <option value="2-toifa va Mutaxassis">2-toifa va Mutaxassis</option>
                <option value="Barcha toifalar">Barcha toifalar</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">
                {tx('Test nomi (ixtiyoriy)')}
              </label>
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Avtomatik nom qo‘yiladi"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {tx('Savollar soni (standart: 50)')}
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {tx('Narxi (so‘m, 0 = bepul)')}
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="w-40">
              <label className="block text-xs font-semibold mb-1">
                {tx('Vaqt (daqiqa)')}
              </label>
              <input
                type="number"
                min={5}
                disabled={isUnlimitedTime}
                value={dur}
                onChange={(e) => setDur(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-50"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium pt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isUnlimitedTime}
                onChange={(e) => setIsUnlimitedTime(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>{tx('Cheklanmagan vaqt (xohlagancha vaqt)')}</span>
            </label>
          </div>

          {genMode === 'ai' && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                {tx('AI uchun qo‘shimcha ko‘rsatma (ixtiyoriy)')}
              </label>
              <input
                value={promptNote}
                onChange={(e) => setPromptNote(e.target.value)}
                placeholder="Masalan: Ko‘proq amaliy masalalar va zamonaviy pedagogik metodlar bo‘lsin"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          )}

          {msg && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400 flex flex-wrap items-center justify-between gap-2">
              <span>{msg}</span>
              {genMode === 'ai' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => handleGenerate(e, 'bank')}
                  className="px-3 py-1 rounded-md bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                >
                  {tx('O‘quv bankidan 50 ta savol tuzish')}
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold"
            >
              {tx('Bekor qilish')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {busy
                ? tx('Savollar tuzilmoqda…')
                : genMode === 'ai'
                  ? tx('AI bilan yaratish va saqlash')
                  : tx('O‘quv bankidan yaratish')}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">
          {tx('Mavjud Attestatsiya sinovlari')}
        </h2>
        {attestationTests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-8 text-center text-sm text-slate-500">
            {tx('Hozircha attestatsiya testlari yo‘q.')}
          </div>
        ) : (
          <div className="space-y-3">
            {attestationTests.map((t) => {
              const att = attempts.find(
                (a) => a.uid === user.id && a.tid === t.id
              );
              const started = starts[t.id];
              const expired = !t.isLifetime && t.end > 0 && now > t.end;
              const accessOk = canTake(t);
              const pendingReq = myRequests.find(
                (r) =>
                  r.type === 'test' && r.tid === t.id && r.status === 'pending'
              );
              const correctCount = att
                ? att.ok.reduce((acc, v) => acc + (v ? 1 : 0), 0)
                : 0;
              const score100 =
                att && t.q.length > 0
                  ? Math.round((correctCount / t.q.length) * 100)
                  : 0;

              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold text-base">
                        {t.title}
                      </h3>
                      <span
                        className={`text-xs font-semibold ${
                          t.price > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        · {t.price > 0 ? formatSom(t.price, lang) : tx('Bepul')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {t.targetGrade && (
                        <>
                          <span>{t.targetGrade}</span>
                          <span>·</span>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1">
                        {t.isUnlimitedTime ? (
                          <>
                            <InfinityIcon className="w-3.5 h-3.5 text-indigo-500" />
                            {tx('Cheklanmagan vaqt')}
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            {t.dur} {tx('daqiqa')}
                          </>
                        )}
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {t.q.length} {tx('ta savol')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {att ? (
                      <button
                        type="button"
                        onClick={() => onViewResult(t, att)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/8 hover:bg-emerald-500/15 text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {score100}/100 ({attestationCategory(score100)}) ·{' '}
                          {formatDurationSpan(att.t, lang)} · {tx('Tahlil')}
                        </span>
                      </button>
                    ) : expired ? (
                      <span className="text-xs text-slate-500">
                        {tx('Muddati tugagan')}
                      </span>
                    ) : !accessOk ? (
                      pendingReq ? (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {tx('To‘lov kutilmoqda')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenPayModal(t)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold"
                        >
                          <Lock className="w-4 h-4" />
                          <span>
                            {tx('To‘lov qilish')} ({formatSom(t.price, lang)})
                          </span>
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartTest(t.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                      >
                        <Play className="w-4 h-4" />
                        <span>
                          {started ? tx('Davom ettirish') : tx('Testni boshlash')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
