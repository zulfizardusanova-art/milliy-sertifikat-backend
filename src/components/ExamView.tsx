import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Clock,
  Infinity as InfinityIcon,
  LayoutGrid,
  List,
} from 'lucide-react';
import type { LanguageCode, TestItem } from '../types';
import { trText } from '../utils/i18n';
import { toTexPreview } from '../utils/mathEval';
import { MathText } from './MathText';
import katex from 'katex';

interface ExamViewProps {
  test: TestItem;
  startedAt: number;
  images: Record<string, string>;
  lang: LanguageCode;
  onFinish: (answers: (number | string)[]) => Promise<void>;
}

const MATH_BUTTONS: [string, string, number][] = [
  ['√', '√', 0],
  ['a/b', '/', 0],
  ['xⁿ', '^', 0],
  ['π', 'π', 0],
  ['( )', '()', 1],
  ['−', '-', 0],
];

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (h > 0 ? `${h}:` : '') + `${pad(m)}:${pad(r)}`;
}

export const ExamView: React.FC<ExamViewProps> = ({
  test,
  startedAt,
  images,
  lang,
  onFinish,
}) => {
  const tx = (s: string) => trText(s, lang);
  const storageKey = `ms_exam_ans_${test.id}`;
  const [answers, setAnswers] = useState<Record<number, number | string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [showAllMode, setShowAllMode] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const writtenInputRef = useRef<HTMLInputElement | null>(null);
  const autoSubmittedRef = useRef(false);

  const deadline = test.isUnlimitedTime
    ? Number.MAX_SAFE_INTEGER
    : Math.min(
        startedAt + test.dur * 60_000,
        !test.isLifetime && test.end > 0 ? test.end : Number.MAX_SAFE_INTEGER
      );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // ignore storage quota
    }
  }, [answers, storageKey]);

  const submitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload = test.q.map((q, i) => {
      const val = answers[i];
      if (val !== undefined) return val;
      return q.k === 'w' ? '' : -1;
    });
    localStorage.removeItem(storageKey);
    await onFinish(payload);
  };

  useEffect(() => {
    if (!test.isUnlimitedTime && now >= deadline && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      submitExam();
    }
  }, [now, deadline, test.isUnlimitedTime]);

  const remainingSec = test.isUnlimitedTime
    ? Math.max(0, (now - startedAt) / 1000)
    : Math.max(0, (deadline - now) / 1000);

  const answeredCount = Object.keys(answers).filter((k) => {
    const v = answers[Number(k)];
    return v !== undefined && String(v).trim() !== '';
  }).length;

  const setMcAnswer = (qIdx: number, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const setWrittenAnswer = (qIdx: number, value: string) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      if (value.trim()) copy[qIdx] = value;
      else delete copy[qIdx];
      return copy;
    });
  };

  const insertMathSymbol = (qIdx: number, btnIdx: number) => {
    const inp = writtenInputRef.current;
    const [, sym, cursorBack] = MATH_BUTTONS[btnIdx];
    if (!inp) {
      setWrittenAnswer(qIdx, String(answers[qIdx] || '') + sym);
      return;
    }
    const start = inp.selectionStart ?? inp.value.length;
    const end = inp.selectionEnd ?? inp.value.length;
    const nextVal =
      inp.value.slice(0, start) + sym + inp.value.slice(end);
    setWrittenAnswer(qIdx, nextVal);
    requestAnimationFrame(() => {
      const pos = start + sym.length - cursorBack;
      inp.focus();
      inp.setSelectionRange(pos, pos);
    });
  };

  const renderQuestionCard = (qIdx: number) => {
    const q = test.q[qIdx];
    if (!q) return null;
    const qLabel = q.n || String(qIdx + 1);
    const imgData = q.im ? images[`${test.id}_${q.im}`] : undefined;
    const val = answers[qIdx];
    const texPreview =
      q.k === 'w' && typeof val === 'string' ? toTexPreview(val) : null;

    return (
      <div
        key={qIdx}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-5 sm:p-7 space-y-5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-lg bg-indigo-600/12 text-indigo-600 dark:text-indigo-400 font-display font-bold text-sm tabular-nums">
              {qLabel}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {q.k === 'w' ? tx('Yozma javobli savol') : tx('Test savoli')}
              {q.topic ? ` · ${q.topic}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setFlagged((p) => ({ ...p, [qIdx]: !p[qIdx] }))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              flagged[qIdx]
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{flagged[qIdx] ? tx('Belgilangan') : tx('Keyinroq ko‘rish')}</span>
          </button>
        </div>

        {imgData && (
          <img
            src={imgData}
            alt={`${qLabel}-savol rasmi`}
            className="max-h-80 rounded-lg border border-slate-200 dark:border-slate-800 object-contain"
          />
        )}

        <div className="text-base sm:text-[17px] leading-relaxed font-medium text-slate-900 dark:text-slate-100">
          <MathText text={q.s} />
        </div>

        {q.k === 'mc' ? (
          <div className="space-y-2.5 pt-1">
            {q.o.map((opt, optIdx) => {
              const letter = 'ABCD'[optIdx];
              const isSelected = val === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => setMcAnswer(qIdx, optIdx)}
                  aria-pressed={isSelected}
                  className={`w-full text-left flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600/10 dark:border-indigo-500 dark:bg-indigo-500/15 ring-1 ring-indigo-500/40'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-xs shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1 text-sm sm:text-base pt-0.5">
                    <MathText text={opt} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tx('Javobingizni kiriting (masalan: 1/2, √2/2, 5)')}
            </label>
            <input
              ref={!showAllMode ? writtenInputRef : undefined}
              value={typeof val === 'string' ? val : ''}
              onChange={(e) => setWrittenAnswer(qIdx, e.target.value)}
              placeholder="Javob..."
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex flex-wrap gap-1.5">
              {MATH_BUTTONS.map(([lbl], bIdx) => (
                <button
                  key={lbl}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertMathSymbol(qIdx, bIdx)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {lbl}
                </button>
              ))}
            </div>
            {texPreview && (
              <div className="text-sm text-slate-600 dark:text-slate-300 pt-1 flex items-center gap-2">
                <span className="text-xs text-slate-400">{tx('Ko‘rinishi')}:</span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(texPreview, {
                      throwOnError: false,
                    }),
                  }}
                />
              </div>
            )}
          </div>
        )}

        {!showAllMode && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{tx('Oldingi')}</span>
            </button>
            <button
              type="button"
              disabled={currentIdx >= test.q.length - 1}
              onClick={() =>
                setCurrentIdx((i) => Math.min(test.q.length - 1, i + 1))
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-40"
            >
              <span>{tx('Keyingi')}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090f1d] text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1526]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-xs sm:text-base truncate">
              {test.title}
            </h1>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {answeredCount}/{test.q.length} {tx('javob berildi')}
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono font-bold text-sm sm:text-2xl tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
            {test.isUnlimitedTime ? (
              <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm sm:text-lg">
                <InfinityIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{formatClock(remainingSec)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                <span>{formatClock(remainingSec)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAllMode((v) => !v)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {showAllMode ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{tx('Raqam bo‘yicha')}</span>
                </>
              ) : (
                <>
                  <List className="w-3.5 h-3.5" />
                  <span>{tx('Barcha savollar')}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              disabled={submitting}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors"
            >
              {tx('Testni yakunlash')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Question Stage */}
        <div className="lg:col-span-8 space-y-5">
          {showAllMode
            ? test.q.map((_, idx) => renderQuestionCard(idx))
            : renderQuestionCard(currentIdx)}
        </div>

        {/* Numbered Question Navigator (Replaces separate A/B/C/D bubble sheet!) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-22 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-sm">
              {tx('Savol raqamlari')}
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {answeredCount}/{test.q.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tx('Istalgan raqam ustiga bosing — savol va uning javob variantlari ochiladi.')}
          </p>

          <div
            data-testid="question-number-grid"
            className="grid grid-cols-5 gap-2"
          >
            {test.q.map((q, idx) => {
              const label = q.n || String(idx + 1);
              const isCurrent = !showAllMode && currentIdx === idx;
              const isAnswered =
                answers[idx] !== undefined && String(answers[idx]).trim() !== '';
              const isFlag = !!flagged[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setShowAllMode(false);
                    setCurrentIdx(idx);
                  }}
                  aria-label={`${label}-savol`}
                  className={`relative h-10 rounded-lg font-mono text-sm font-bold tabular-nums border transition-all ${
                    isCurrent
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : isAnswered
                        ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {label}
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {tx('Belgilangan javob')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              {tx('Keyinroq ko‘rish')}
            </span>
          </div>
        </aside>
      </div>

      {confirmEnd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display font-bold text-lg">
              {tx('Testni yakunlaysizmi?')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {tx('Siz')} {answeredCount} / {test.q.length}{' '}
              {tx('ta savolga javob berdingiz. Yakunlagandan so‘ng natija Rasch modeli bo‘yicha hisoblanadi.')}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                {tx('Orqaga')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submitExam}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
              >
                {submitting ? tx('Yuborilmoqda…') : tx('Ha, yakunlash')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
