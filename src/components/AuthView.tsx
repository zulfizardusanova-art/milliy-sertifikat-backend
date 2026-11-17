import React, { useState } from 'react';
import { Moon, Sun, Globe, ArrowRight } from 'lucide-react';
import type { LanguageCode, SiteConfig } from '../types';
import { LANGUAGES, trText } from '../utils/i18n';

interface AuthViewProps {
  lang: LanguageCode;
  theme: 'dark' | 'light';
  siteConfig: SiteConfig;
  onLangChange: (l: LanguageCode) => void;
  onToggleTheme: () => void;
  onLogin: (lg: string, pw: string) => Promise<string | null>;
  onRegister: (nm: string, lg: string, pw: string) => Promise<string | null>;
}

export const AuthView: React.FC<AuthViewProps> = ({
  lang,
  theme,
  siteConfig,
  onLangChange,
  onToggleTheme,
  onLogin,
  onRegister,
}) => {
  const [mode, setMode] = useState<'login' | 'reg'>('login');
  const [nm, setNm] = useState('');
  const [lg, setLg] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const tx = (s: string) => trText(s, lang);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const errorMsg =
      mode === 'login' ? await onLogin(lg, pw) : await onRegister(nm, lg, pw);
    setBusy(false);
    if (errorMsg) setErr(errorMsg);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#090f1d] text-slate-900 dark:text-slate-100">
      <div className="max-w-5xl w-full mx-auto px-5 pt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/platform_logo_emblem_1794849878215.jpg"
            alt="Milliy Sertifikat logotipi"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-cyan-400/30"
          />
          <span className="font-display font-bold text-lg tracking-tight whitespace-nowrap">
            Milliy Sertifikat
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              aria-label="Tilni tanlash"
              value={lang}
              onChange={(e) => onLangChange(e.target.value as LanguageCode)}
              className="pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LANGUAGES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Mavzuni almashtirish"
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <main className="max-w-5xl w-full mx-auto px-5 py-10 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {tx('Milliy sertifikat · Ustozlar attestatsiyasi · Rasch reytingi')}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-balance leading-tight">
            {tx('Bilimingizni aniq Rasch modeli va real imtihon muhitida sinab ko‘ring')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
            {tx(
              'Har bir test bo‘yicha alohida Rasch balli, maktab o‘qituvchilari uchun attestatsiya sinovlari, formulalarni aniq ko‘rsatuvchi interaktiv savollar va qulay to‘lov nazorati.'
            )}
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div>
              <div className="font-display font-bold text-xl tabular-nums">0–75</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tx('Testlar kesimida Rasch')}
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-xl tabular-nums">100 ball</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tx('Ustozlar attestatsiyasi')}
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-xl">KaTeX</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tx('Aniq daraja va ildizlar')}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7">
            <div className="grid grid-cols-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErr('');
                }}
                className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tx('Kirish')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reg');
                  setErr('');
                }}
                className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                  mode === 'reg'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tx('Ro‘yxatdan o‘tish')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'reg' && (
                <div>
                  <label
                    htmlFor="auth-nm"
                    className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
                  >
                    {tx('Ism va familiya')}
                  </label>
                  <input
                    id="auth-nm"
                    value={nm}
                    onChange={(e) => setNm(e.target.value)}
                    placeholder={tx('Ism va familiya')}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-lg"
                  className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
                >
                  {tx('Login')}
                </label>
                <input
                  id="auth-lg"
                  value={lg}
                  onChange={(e) => setLg(e.target.value)}
                  placeholder={tx('Login')}
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-pw"
                  className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
                >
                  {tx('Parol')}
                </label>
                <input
                  id="auth-pw"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder={tx('Parol')}
                  autoComplete={mode === 'reg' ? 'new-password' : 'current-password'}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {mode === 'reg' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {tx('Kamida 8 belgi, harf va raqam bilan.')}
                  </p>
                )}
              </div>

              {err && (
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                  {tx(err)}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <span>{mode === 'login' ? tx('Kirish') : tx('Hisob yaratish')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-5 px-5 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
        {(() => {
          const handle = siteConfig.telegramHandle?.replace(/^@/, '').trim();
          return (
            <>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {siteConfig.authorLabel || 'Milliy Sertifikat'}
              </span>
              {siteConfig.contactText ? ` · ${tx(siteConfig.contactText)}` : ''}
              {handle && (
                <>
                  {' · '}
                  <a
                    href={`https://t.me/${handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    @{handle}
                  </a>{' '}
                  (Telegram)
                </>
              )}
            </>
          );
        })()}
      </footer>
    </div>
  );
};
