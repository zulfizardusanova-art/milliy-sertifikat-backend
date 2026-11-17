import React, { useMemo, useState } from 'react';
import { BarChart3, Info } from 'lucide-react';
import type { Attempt, LanguageCode, TestItem, UserProfile } from '../types';
import { formatDurationSpan, trText } from '../utils/i18n';
import { computeTestRaschRankings, levelNameOf } from '../utils/rasch';

interface LeaderboardViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  tests: TestItem[];
  attempts: Attempt[];
  lang: LanguageCode;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUser,
  users,
  tests,
  attempts,
  lang,
}) => {
  const tx = (s: string) => trText(s, lang);
  const [selectedTestId, setSelectedTestId] = useState<string>(
    () => tests[0]?.id || ''
  );

  const selectedTest =
    tests.find((t) => t.id === selectedTestId) || tests[0] || null;

  const { entries, items } = useMemo(() => {
    if (!selectedTest) return { entries: [], items: [] };
    return computeTestRaschRankings(selectedTest, attempts, users);
  }, [selectedTest, attempts, users]);

  const isAttestation = selectedTest?.category === 'attestation';
  const isOlympiad = selectedTest?.category === 'olympiad';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {tx('Reyting (Testlar kesimida)')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tx(
              'Har bir test alohida Rasch modeli bo‘yicha baholanadi: qiyin savolga to‘g‘ri javob ko‘proq ball beradi va turli testlar bir-biriga aralashmaydi.'
            )}
          </p>
        </div>

        {tests.length > 0 && (
          <div className="sm:min-w-[300px]">
            <label
              htmlFor="leaderboard-test-select"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
            >
              {tx('Testni tanlang')}
            </label>
            <select
              id="leaderboard-test-select"
              value={selectedTest?.id || ''}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0d1526] text-sm font-medium"
            >
              {tests.map((t) => {
                const count = attempts.filter((a) => a.tid === t.id).length;
                return (
                  <option key={t.id} value={t.id}>
                    {t.title} ({count} ta ishtirokchi)
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {!selectedTest ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-8 text-center text-sm text-slate-500">
          {tx('Hozircha testlar mavjud emas.')}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedTest.title}
              </span>
              <span className="tabular-nums">
                {entries.length} {tx('ta natija')} · {selectedTest.q.length}{' '}
                {tx('ta savol')}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">{tx('Ism')}</th>
                    <th className="py-3 px-4">{tx('Daraja')}</th>
                    <th className="py-3 px-4">{tx('To‘g‘ri')}</th>
                    <th className="py-3 px-4">{tx('Vaqt')}</th>
                    <th className="py-3 px-4 text-right">
                      {isAttestation
                        ? tx('Attestatsiya balli')
                        : isOlympiad
                          ? tx('O‘rin / Ball')
                          : tx('Rasch ball (0–75)')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-slate-500 dark:text-slate-400"
                      >
                        {tx('Bu testni hali hech kim yechmagan.')}
                      </td>
                    </tr>
                  ) : (
                    entries.map((row, idx) => {
                      const isMe = row.uid === currentUser.id;
                      return (
                        <tr
                          key={row.uid}
                          className={`border-b border-slate-100 dark:border-slate-800/70 ${
                            isMe
                              ? 'bg-indigo-500/8 dark:bg-indigo-500/12'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-3 px-4 font-display font-bold tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {row.user.avatar ? (
                                <img
                                  src={row.user.avatar}
                                  alt={row.user.nm}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                                  {row.user.nm.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                              <span className="font-semibold">
                                {row.user.nm}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {tx(levelNameOf(row.user, row.rawCorrect * 25))}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            {row.rawCorrect}/{row.totalQuestions}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 tabular-nums">
                            {formatDurationSpan(row.timeSec, lang)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                            {isAttestation ? (
                              <span>
                                {row.attestationScore}/100{' '}
                                <span className="text-xs font-sans font-semibold text-indigo-600 dark:text-indigo-400">
                                  ({row.attestationCategory})
                                </span>
                              </span>
                            ) : (
                              <span>
                                {row.raschScore}{' '}
                                <span className="text-xs font-sans font-semibold text-indigo-600 dark:text-indigo-400">
                                  ({row.grade})
                                </span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {items.length > 0 && entries.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-display font-bold">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span>{tx('Savollar qiyinlik tahlili (Rasch bᵢ kalibratsiyasi)')}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {tx('Qiyinlik bᵢ musbat bo‘lgan savollar murakkabroq hisoblanadi va to‘g‘ri javob uchun yuqoriroq Rasch vazni beradi.')}
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {items.map((it) => (
                  <div
                    key={it.index}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span>#{it.label}</span>
                      <span
                        className={
                          it.difficultyB > 0.2
                            ? 'text-amber-600 dark:text-amber-400'
                            : it.difficultyB < -0.2
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500'
                        }
                      >
                        b={it.difficultyB >= 0 ? `+${it.difficultyB.toFixed(2)}` : it.difficultyB.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                      {it.correctRate}% {tx('to‘g‘ri')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
