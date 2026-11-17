import React from 'react';
import {
  ClipboardCheck,
  GraduationCap,
  Trophy,
  BarChart3,
  Crown,
  UserCog,
  Shield,
  LogOut,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import type { LanguageCode, UserProfile } from '../types';
import { LANGUAGES, trText } from '../utils/i18n';
import { levelNameOf } from '../utils/rasch';

export type NavSection =
  | 'home'
  | 'attestation'
  | 'olympiad'
  | 'rating'
  | 'premium'
  | 'profile'
  | 'admin';

interface SidebarProps {
  user: UserProfile;
  xp: number;
  active: NavSection;
  pendingPayCount: number;
  lang: LanguageCode;
  theme: 'dark' | 'light';
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (sec: NavSection) => void;
  onLangChange: (l: LanguageCode) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  xp,
  active,
  pendingPayCount,
  lang,
  theme,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onLangChange,
  onToggleTheme,
  onLogout,
}) => {
  const tx = (s: string) => trText(s, lang);
  const rankLabel = tx(levelNameOf(user, xp));

  const navBtn = (
    sec: NavSection,
    label: string,
    icon: React.ReactNode,
    badge?: number
  ) => {
    const isOn = active === sec;
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate(sec);
          onCloseMobile();
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
          isOn
            ? 'bg-indigo-600/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{tx(label)}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto text-xs font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[264px] shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0d1526] px-3.5 py-4 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-1.5 pb-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/src/assets/images/platform_logo_emblem_1794849878215.jpg"
              alt="Milliy Sertifikat logotipi"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-cyan-400/30"
            />
            <span className="font-display font-bold text-base tracking-tight whitespace-nowrap">
              Milliy Sertifikat
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Menyuni yopish"
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1">
          <div className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
            {tx('Mashq va sinov')}
          </div>
          {navBtn('home', 'Mock testlar', <ClipboardCheck className="w-4 h-4" />)}
          {navBtn('attestation', 'Attestatsiya', <GraduationCap className="w-4 h-4" />)}
          {navBtn('olympiad', 'Olimpiada', <Trophy className="w-4 h-4" />)}
          {navBtn('rating', 'Reyting', <BarChart3 className="w-4 h-4" />)}
          {navBtn('premium', 'Premium', <Crown className="w-4 h-4" />)}

          <div className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
            {tx('Shaxsiy kabinet')}
          </div>
          {navBtn('profile', 'Profil va sozlamalar', <UserCog className="w-4 h-4" />)}

          {user.role !== 'user' && (
            <>
              <div className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                {tx('Boshqaruv')}
              </div>
              {navBtn(
                'admin',
                'Admin panel',
                <Shield className="w-4 h-4" />,
                user.role === 'owner' ? pendingPayCount : 0
              )}
            </>
          )}
        </nav>

        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onNavigate('profile');
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 text-left transition-colors"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.nm}
                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {user.nm.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user.nm}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {rankLabel}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <select
              aria-label="Tilni tanlash"
              value={lang}
              onChange={(e) => onLangChange(e.target.value as LanguageCode)}
              className="flex-1 min-w-0 px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              {LANGUAGES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Mavzuni o‘zgartirish"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{tx('Chiqish')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
