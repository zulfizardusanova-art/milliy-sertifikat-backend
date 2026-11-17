import React from 'react';
import { Menu } from 'lucide-react';
import type { LanguageCode, UserProfile } from '../types';
import { trText } from '../utils/i18n';
import { levelNameOf } from '../utils/rasch';
import type { NavSection } from './Sidebar';

interface TopBarProps {
  section: NavSection;
  user: UserProfile;
  xp: number;
  lang: LanguageCode;
  onOpenMobileMenu: () => void;
  onOpenProfile: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  home: 'Mock testlar',
  attestation: 'Attestatsiya',
  olympiad: 'Olimpiada',
  rating: 'Reyting',
  premium: 'Premium',
  profile: 'Profil va sozlamalar',
  admin: 'Admin panel',
};

export const TopBar: React.FC<TopBarProps> = ({
  section,
  user,
  xp,
  lang,
  onOpenMobileMenu,
  onOpenProfile,
}) => {
  const tx = (s: string) => trText(s, lang);
  const rankName = tx(levelNameOf(user, xp));

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 lg:px-8 h-14 border-b border-slate-200 dark:border-slate-800/90 bg-white/85 dark:bg-[#090f1d]/85 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Menyuni ochish"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
          <span>{tx('Bosh sahifa')}</span>
          <span className="mx-2">/</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {tx(SECTION_TITLES[section])}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap shrink-0"
      >
        <span className="hidden sm:inline text-xs font-semibold text-amber-600 dark:text-amber-400">
          {rankName}
        </span>
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.nm}
            className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
            {user.nm.slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>
    </header>
  );
};
