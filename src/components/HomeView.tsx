import React, { useState } from 'react';
import {
  Play,
  Lock,
  CheckCircle2,
  Clock,
  Infinity as InfinityIcon,
  CreditCard,
  Wand2,
} from 'lucide-react';
import type {
  Attempt,
  LanguageCode,
  PaymentRequest,
  TestItem,
  UserProfile,
} from '../types';
import { formatDurationSpan, formatSom, trText } from '../utils/i18n';
import {
  UZ_LEVELS,
  computeUserSummaryStats,
  levelIndexOf,
  levelNameOf,
} from '../utils/rasch';
import {
  MOCK_SUBJECTS,
  canUseAiGenerator,
  resolveMockSubject,
  summarizeMockSubjects,
  type MockDifficulty,
} from '../utils/aiTestGen';

interface HomeViewProps {
  user: UserProfile;
  users: UserProfile[];
  tests: TestItem[];
  attempts: Attempt[];
  starts: Record<string, number>;
  myRequests: PaymentRequest[];
  lang: LanguageCode;
  onStartTest: (testId: string) => void;
  onOpenPayModal: (test: TestItem) => void;
  onViewResult: (test: TestItem, attempt: Attempt) => void;
  onGoPremium: () => void;
  onAutoCreateMock: (payload: {
    title: string;
    subject: string;
    topic: string;
    difficulty: MockDifficulty;
    mcCount: number;
    writtenCount: number;
    dur: number;
    isUnlimitedTime: boolean;
    price: number;
    promptNote?: string;
    mode?: 'ai' | 'bank';
  }) => Promise<string | null>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  users,
  tests,
  attempts,
  starts,
  myRequests,
  lang,
  onStartTest,
  onOpenPayModal,
  onViewResult,
  onGoPremium,
  onAutoCreateMock,
}) => {
  const tx = (s: string) => trText(s, lang);
  const now = Date.now();
  const stats = computeUserSummaryStats(user.id, tests, attempts, users);
  const lvIdx = levelIndexOf(stats.xp);
  const nextLv = UZ_LEVELS[lvIdx + 1];
  const isStaff = user.role !== 'user';
  const isOwner = canUseAiGenerator(user.role);
  const hasPremium = isStaff || (user.prem || 0) > now;
  const pct = nextLv
    ? Math.min(
        100,
        Math.round(
          ((stats.xp - UZ_LEVELS[lvIdx][1]) /
            (nextLv[1] - UZ_LEVELS[lvIdx][1])) *
            100
        )
      )
    : 100;

  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [showAiMock, setShowAiMock] = useState(false);
  const [aiSubject, setAiSubject] = useState('Matematika');
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<MockDifficulty>('medium');
  const [aiMcCount, setAiMcCount] = useState(15);
  const [aiWrittenCount, setAiWrittenCount] = useState(2);
  const [aiDur, setAiDur] = useState(90);
  const [aiUnlimited, setAiUnlimited] = useState(false);
  const [aiPrice, setAiPrice] = useState(0);
  const [aiTitle, setAiTitle] = useState('');
  const [aiPromptNote, setAiPromptNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');

  const createMockWithMode = async (mode: 'ai' | 'bank') => {
    setAiErr('');
    setAiBusy(true);
    const title =
      aiTitle.trim() ||
      `${aiSubject}: ${mode === 'bank' ? 'Mock test' : 'AI Mock test'}${
        aiTopic.trim() ? ` (${aiTopic.trim()})` : ''
      }`;
    const err = await onAutoCreateMock({
      title,
      subject: aiSubject,
      topic: aiTopic.trim(),
      difficulty: aiDifficulty,
      mcCount: aiMcCount,
      writtenCount: aiWrittenCount,
      dur: aiDur,
      isUnlimitedTime: aiUnlimited,
      price: aiPrice,
      promptNote: aiPromptNote.trim(),
      mode,
    });
    setAiBusy(false);
    if (err) {
      setAiErr(err);
    } else {
      setSelectedSubject(aiSubject);
      setShowAiMock(false);
      setAiTitle('');
      setAiTopic('');
      setAiPromptNote('');
    }
  };

  const handleAiMockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMockWithMode('ai');
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? 'Xayrli tun'
      : hour < 12
        ? 'Xayrli tong'
        : hour < 18
          ? 'Xayrli kun'
          : 'Xayrli kech';

  const mockTests = tests
    .filter((t) => t.category === 'mock')
    .sort((a, b) => a.at - b.at);

  const { counts: subjectCounts, subjects: subjectList } =
    summarizeMockSubjects(mockTests);
  const visibleMockTests =
    selectedSubject === 'ALL'
      ? mockTests
      : mockTests.filter((t) => resolveMockSubject(t) === selectedSubject);

  const canTakeTest = (t: TestItem) => {
    if (isStaff) return true;
    if (t.price <= 0) return true;
    if (hasPremium) return true;
    return user.unlockedTests?.includes(t.id) ?? false;
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-500/12 dark:via-[#10182b] dark:to-[#10182b] p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tx(greeting)}!
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
              {tx('Xush kelibsiz')}, {user.nm}
            </h1>
            {user.school && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {user.school}
                {user.subject ? ` · ${user.subject}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-amber-600 dark:text-amber-400">
              {tx(levelNameOf(user, stats.xp))}
            </span>
            {user.role === 'user' && (user.prem || 0) > now && (
              <span className="text-emerald-600 dark:text-emerald-400">
                · Premium ({Math.ceil(((user.prem || 0) - now) / 864e5)} kun)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-4">
            <div className="font-display text-2xl sm:text-3xl font-extrabold tabular-nums">
              {stats.testsSolved}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tx('yechilgan testlar')}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-4">
            <div className="font-display text-2xl sm:text-3xl font-extrabold tabular-nums">
              {stats.testsSolved
                ? formatDurationSpan(stats.totalTimeSec, lang)
                : '0 daq'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tx('ishlangan vaqt')}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-4">
            <div className="font-display text-2xl sm:text-3xl font-extrabold tabular-nums">
              {stats.avgRaschScore === null ? '—' : `${stats.avgRaschScore}`}
              {stats.avgRaschScore !== null && (
                <span className="text-base font-semibold text-indigo-600 dark:text-indigo-400 ml-1.5">
                  ({stats.bestGrade})
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tx('o‘rtacha Rasch ball')} (0–75)
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              {isStaff
                ? `${tx('Maxsus maqom')}: ${tx(levelNameOf(user, stats.xp))}`
                : `${lvIdx + 1}-daraja: ${tx(UZ_LEVELS[lvIdx][0])}`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {isStaff
                ? tx('Sayt boshqaruvchisi')
                : nextLv
                  ? `${stats.xp} / ${nextLv[1]} ball · ${tx('Keyingisi')}: ${tx(nextLv[0])}`
                  : tx('Eng yuqori darajaga erishdingiz!')}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${isStaff ? 100 : pct}%` }}
            />
          </div>
          {!hasPremium && (
            <div className="pt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 flex-wrap">
              <span>
                {tx('Bepul testlarni cheklovsiz ishlashingiz mumkin. Pullik testlar uchun alohida yoki Premium orqali to‘lov qiling.')}
              </span>
              <button
                type="button"
                onClick={onGoPremium}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                {tx('Premium olish')}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold">{tx('Mock testlar')}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {mockTests.length} {tx('ta test')}
            </span>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                if (!showAiMock && selectedSubject !== 'ALL') {
                  setAiSubject(selectedSubject);
                }
                setShowAiMock((v) => !v);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              <span>{tx('AI bilan Mock test yaratish')}</span>
            </button>
          )}
        </div>

        {/* Fanlar bo‘yicha bo‘limlar */}
        <div
          role="tablist"
          aria-label={tx('Fanlar bo‘yicha')}
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedSubject === 'ALL'}
            onClick={() => setSelectedSubject('ALL')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              selectedSubject === 'ALL'
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {tx('Barchasi')}{' '}
            <span className="opacity-75 font-mono tabular-nums ml-1">
              {mockTests.length}
            </span>
          </button>
          {subjectList.map((subj) => {
            const cnt = subjectCounts[subj] || 0;
            const active = selectedSubject === subj;
            return (
              <button
                key={subj}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedSubject(subj);
                  setAiSubject(subj);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {tx(subj)}
                {cnt > 0 && (
                  <span className="opacity-80 font-mono tabular-nums ml-1.5">
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isOwner && showAiMock && (
          <form
            onSubmit={handleAiMockSubmit}
            className="rounded-2xl border border-indigo-500/30 bg-white dark:bg-[#0d1526] p-6 space-y-4"
          >
            <div>
              <h3 className="font-display font-bold text-base">
                {tx('Owner AI Mock test generatori')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tx('Faqat Owner boshqaradi: AI yopiq (A–D) va yozma savollarni javoblari bilan avtomatik tuzadi')}
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Fan')}
                </label>
                <select
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  {MOCK_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Qiyinlik darajasi')}
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as MockDifficulty)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="easy">Oson (Maktab bazasi)</option>
                  <option value="medium">O‘rta (Milliy sertifikat)</option>
                  <option value="hard">Murakkab (Olimpiada)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Test nomi (ixtiyoriy)')}
                </label>
                <input
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                  placeholder="Avtomatik nom qo‘yiladi"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  {tx('Mavzu (ixtiyoriy)')}
                </label>
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Masalan: Logarifmlar, Integrallar, Trigonometriya"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Test savollari (1–35)')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={35}
                  value={aiMcCount}
                  onChange={(e) => setAiMcCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Yozma savollar (0–10)')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={aiWrittenCount}
                  onChange={(e) => setAiWrittenCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Ishlash vaqti (daqiqa)')}
                </label>
                <input
                  type="number"
                  min={5}
                  disabled={aiUnlimited}
                  value={aiDur}
                  onChange={(e) => setAiDur(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-50"
                />
              </div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-medium pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiUnlimited}
                  onChange={(e) => setAiUnlimited(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>{tx('Cheklanmagan vaqt')}</span>
              </label>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Narxi (so‘m, 0 = bepul)')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={aiPrice}
                  onChange={(e) => setAiPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {tx('AI uchun qo‘shimcha ko‘rsatma (ixtiyoriy)')}
              </label>
              <input
                value={aiPromptNote}
                onChange={(e) => setAiPromptNote(e.target.value)}
                placeholder="Masalan: Har bir savolga qisqa yechim izohi ham yozilsin"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>

            {aiErr && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
                {aiErr}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAiMock(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold"
              >
                {tx('Bekor qilish')}
              </button>
              <button
                type="button"
                disabled={aiBusy}
                onClick={() => createMockWithMode('bank')}
                className="px-4 py-2 rounded-lg border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 text-sm font-semibold disabled:opacity-50"
              >
                {tx('O‘quv bazasidan tezkor tuzish')}
              </button>
              <button
                type="submit"
                disabled={aiBusy}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {aiBusy ? tx('AI savollar tuzmoqda…') : tx('AI bilan yaratish va saqlash')}
              </button>
            </div>
          </form>
        )}

        {visibleMockTests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-8 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {selectedSubject === 'ALL'
                ? tx('Hozircha mock testlar yo‘q.')
                : `${tx(selectedSubject)}: ${tx('Ushbu fan bo‘yicha hozircha mock testlar yo‘q.')}`}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (selectedSubject !== 'ALL') setAiSubject(selectedSubject);
                  setShowAiMock(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{tx('AI bilan Mock test yaratish')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMockTests.map((t) => {
              const att = attempts.find(
                (a) => a.uid === user.id && a.tid === t.id
              );
              const started = starts[t.id];
              const expired = !t.isLifetime && t.end > 0 && now > t.end;
              const notStartedYet = t.at > now;
              const accessOk = canTakeTest(t);
              const pendingReq = myRequests.find(
                (r) => r.type === 'test' && r.tid === t.id && r.status === 'pending'
              );
              const correctCount = att
                ? att.ok.reduce((acc, v) => acc + (v ? 1 : 0), 0)
                : 0;
              const testSubject = resolveMockSubject(t);

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
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {tx(testSubject)}
                      </span>
                      <span>·</span>
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
                      <span>
                        {t.isLifetime
                          ? tx('Butun umrlik')
                          : new Date(t.end).toLocaleDateString('uz-UZ')}
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
                          {correctCount}/{t.q.length} ·{' '}
                          {formatDurationSpan(att.t, lang)} · {tx('Tahlil')}
                        </span>
                      </button>
                    ) : notStartedYet ? (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {tx('Tez kunda ochiladi')}
                      </span>
                    ) : expired ? (
                      <span className="text-xs font-medium text-slate-500">
                        {tx('Test yopilgan')}
                      </span>
                    ) : !accessOk ? (
                      pendingReq ? (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {tx('To‘lov tekshirilmoqda (Kutilmoqda)')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenPayModal(t)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold whitespace-nowrap transition-colors"
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
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold whitespace-nowrap transition-colors"
                      >
                        {started ? (
                          <>
                            <Play className="w-4 h-4" />
                            <span>{tx('Davom ettirish')}</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 hidden" />
                            <Play className="w-4 h-4" />
                            <span>{tx('Testni boshlash')}</span>
                          </>
                        )}
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
