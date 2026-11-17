import React from 'react';
import { Trophy, Play, CheckCircle2, Clock, Lock } from 'lucide-react';
import type {
  Attempt,
  LanguageCode,
  TestItem,
  UserProfile,
} from '../types';
import { formatDurationSpan, formatSom, trText } from '../utils/i18n';
import { computeTestRaschRankings } from '../utils/rasch';

interface OlympiadViewProps {
  user: UserProfile;
  users: UserProfile[];
  tests: TestItem[];
  attempts: Attempt[];
  lang: LanguageCode;
  onStartTest: (testId: string) => void;
  onOpenPayModal: (test: TestItem) => void;
  onGrantPremium: (uid: string, days: number) => void;
}

export const OlympiadView: React.FC<OlympiadViewProps> = ({
  user,
  users,
  tests,
  attempts,
  lang,
  onStartTest,
  onOpenPayModal,
  onGrantPremium,
}) => {
  const tx = (s: string) => trText(s, lang);
  const olympiads = tests
    .filter((t) => t.category === 'olympiad')
    .sort((a, b) => b.at - a.at);
  const isOwner = user.role === 'owner';
  const isStaff = user.role !== 'user';
  const hasPremium = isStaff || (user.prem || 0) > Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
          <Trophy className="w-6 h-6 text-amber-500" />
          <span>{tx('Olimpiada')}</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {tx(
            'Natijalar to‘g‘ri javoblar soni, teng bo‘lganda sarflangan vaqt bo‘yicha tartiblanadi.'
          )}
        </p>
      </div>

      {olympiads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-8 text-center text-sm text-slate-500">
          {tx('Hozircha olimpiada yo‘q.')}
        </div>
      ) : (
        <div className="space-y-6">
          {olympiads.map((t) => {
            const att = attempts.find(
              (a) => a.uid === user.id && a.tid === t.id
            );
            const accessOk =
              isStaff ||
              t.price <= 0 ||
              hasPremium ||
              (user.unlockedTests?.includes(t.id) ?? false);
            const { entries } = computeTestRaschRankings(t, attempts, users);

            return (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] overflow-hidden"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="font-display font-bold text-lg">{t.title}</h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {t.isUnlimitedTime
                          ? tx('Cheklanmagan vaqt')
                          : `${t.dur} ${tx('daqiqa')}`}
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {t.q.length} {tx('ta savol')}
                      </span>
                      {t.price > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {formatSom(t.price, lang)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    {att ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        {att.ok.reduce((a, b) => a + b, 0)}/{t.q.length} ·{' '}
                        {formatDurationSpan(att.t, lang)}
                      </span>
                    ) : !accessOk ? (
                      <button
                        type="button"
                        onClick={() => onOpenPayModal(t)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold"
                      >
                        <Lock className="w-4 h-4" />
                        <span>{tx('To‘lov qilish')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartTest(t.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
                      >
                        <Play className="w-4 h-4" />
                        <span>{tx('Testni boshlash')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {entries.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                          <th className="py-2.5 px-4 w-10">#</th>
                          <th className="py-2.5 px-4">{tx('Ism')}</th>
                          <th className="py-2.5 px-4">{tx('To‘g‘ri')}</th>
                          <th className="py-2.5 px-4">{tx('Vaqt')}</th>
                          {isOwner && <th className="py-2.5 px-4 text-right"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {entries.slice(0, 10).map((e, i) => (
                          <tr
                            key={e.uid}
                            className="border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                          >
                            <td className="py-2.5 px-4 font-bold">{i + 1}</td>
                            <td className="py-2.5 px-4 font-medium">{e.user.nm}</td>
                            <td className="py-2.5 px-4 font-mono tabular-nums">
                              {e.rawCorrect}/{e.totalQuestions}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 tabular-nums">
                              {formatDurationSpan(e.timeSec, lang)}
                            </td>
                            {isOwner && (
                              <td className="py-2.5 px-4 text-right">
                                {i < 3 && e.user.role === 'user' && (
                                  <button
                                    type="button"
                                    onClick={() => onGrantPremium(e.uid, 30)}
                                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    +30 kun Premium
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
