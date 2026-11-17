import React, { useMemo } from 'react';
import { X, CheckCircle2, XCircle, Award, Clock } from 'lucide-react';
import type {
  Attempt,
  LanguageCode,
  TestItem,
  UserProfile,
} from '../types';
import { formatDurationSpan, trText } from '../utils/i18n';
import { attestationCategory, computeTestRaschRankings } from '../utils/rasch';
import { MathText } from './MathText';

interface ResultModalProps {
  test: TestItem;
  attempt: Attempt;
  attempts: Attempt[];
  users: UserProfile[];
  currentUserId: string;
  lang: LanguageCode;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  test,
  attempt,
  attempts,
  users,
  currentUserId,
  lang,
  onClose,
}) => {
  const tx = (s: string) => trText(s, lang);
  const correct = attempt.ok.reduce((acc, v) => acc + (v ? 1 : 0), 0);
  const total = test.q.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const myRanking = useMemo(() => {
    const { entries } = computeTestRaschRankings(test, attempts, users);
    const idx = entries.findIndex((e) => e.uid === currentUserId);
    return idx >= 0 ? { rank: idx + 1, totalUsers: entries.length, entry: entries[idx] } : null;
  }, [test, attempts, users, currentUserId]);

  const isAttestation = test.category === 'attestation';
  const score100 = myRanking?.entry.attestationScore ?? pct;
  const toifa = myRanking?.entry.attestationCategory ?? attestationCategory(score100);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <Award className="w-4 h-4" />
              <span>{tx('Test natijasi va savollar tahlili')}</span>
            </div>
            <h2 className="font-display font-bold text-lg mt-1">
              {test.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5">
            <div className="font-display font-extrabold text-xl tabular-nums">
              {correct}/{total}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tx('To‘g‘ri javob')} ({pct}%)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5">
            <div className="font-display font-extrabold text-xl tabular-nums text-indigo-600 dark:text-indigo-400">
              {isAttestation
                ? `${score100}/100`
                : `${myRanking?.entry.raschScore ?? 0}`}
              {!isAttestation && myRanking && (
                <span className="text-sm ml-1">({myRanking.entry.grade})</span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAttestation ? tx(toifa) : tx('Rasch ball (0–75)')}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5">
            <div className="font-display font-extrabold text-lg tabular-nums flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{formatDurationSpan(attempt.t, lang)}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tx('Sarflangan vaqt')}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5">
            <div className="font-display font-extrabold text-xl tabular-nums">
              {myRanking ? `${myRanking.rank} / ${myRanking.totalUsers}` : '—'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tx('Ushbu testdagi o‘rningiz')}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold text-sm text-slate-700 dark:text-slate-300">
            {tx('Savollar bo‘yicha natijalar')}
          </h3>
          <div className="space-y-2.5">
            {test.q.map((q, idx) => {
              const isOk = Boolean(attempt.ok[idx]);
              const hasSavedAnswers = Array.isArray(attempt.answers);
              const userAns = hasSavedAnswers ? attempt.answers![idx] : undefined;
              const userDisplay =
                q.k === 'mc'
                  ? typeof userAns === 'number' && userAns >= 0 && q.o[userAns]
                    ? `${'ABCD'[userAns]}. ${q.o[userAns]}`
                    : tx('Belgilanmagan')
                  : userAns
                    ? String(userAns)
                    : tx('Kiritilmagan');
              const correctDisplay =
                q.k === 'mc' && q.c !== undefined && q.o[q.c]
                  ? `${'ABCD'[q.c]}. ${q.o[q.c]}`
                  : q.a
                    ? q.a.split(/\n/)[0]
                    : '—';

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 space-y-2 ${
                    isOk
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-rose-500/30 bg-rose-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800">
                        #{q.n || idx + 1}
                      </span>
                      {isOk ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {tx('To‘g‘ri')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          <XCircle className="w-3.5 h-3.5" />
                          {tx('Xato')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-slate-900 dark:text-slate-100">
                    <MathText text={q.s} />
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs pt-1">
                    {hasSavedAnswers && (
                      <div className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{tx('Sizning javobingiz')}:</span>{' '}
                        <MathText text={userDisplay} />
                      </div>
                    )}
                    {(!isOk || !hasSavedAnswers) && (
                      <div className="text-emerald-700 dark:text-emerald-300">
                        <span className="font-semibold">{tx('To‘g‘ri javob')}:</span>{' '}
                        <MathText text={correctDisplay} />
                      </div>
                    )}
                  </div>

                  {q.explanation && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="font-semibold">{tx('Izoh')}:</span>{' '}
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
          >
            {tx('Yopish')}
          </button>
        </div>
      </div>
    </div>
  );
};
