import React, { useMemo, useRef, useState } from 'react';
import {
  FileUp,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit3,
  Plus,
  ImagePlus,
  Wand2,
  Download,
  Upload,
  Database,
} from 'lucide-react';
import type {
  Attempt,
  LanguageCode,
  PayConfig,
  PaymentRequest,
  Question,
  Role,
  SiteConfig,
  TestCategory,
  TestItem,
  UserProfile,
} from '../types';
import { formatSom, trText } from '../utils/i18n';
import { importPdfToQuestions } from '../utils/pdfClient';
import { shrinkImageFile } from '../utils/imageShrink';
import { ATTESTATION_SUBJECTS } from '../utils/attestationBank';
import {
  MOCK_SUBJECTS,
  canUseAiGenerator,
  resolveMockSubject,
  type MockDifficulty,
} from '../utils/aiTestGen';
import { MathText } from './MathText';

interface AdminViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  tests: TestItem[];
  attempts: Attempt[];
  payConfig: PayConfig;
  siteConfig: SiteConfig;
  payRequests: PaymentRequest[];
  images: Record<string, string>;
  lang: LanguageCode;
  onSaveTest: (
    payload: Omit<TestItem, 'id' | 'by'> & {
      id?: string;
      images?: Record<string, string>;
    }
  ) => Promise<string | null>;
  onDeleteTest: (id: string) => Promise<string | null>;
  onVerifyPayment: (id: string, status: 'ok' | 'no') => Promise<string | null>;
  onSavePayConfig: (cfg: PayConfig) => Promise<string | null>;
  onSaveSiteConfig: (cfg: SiteConfig) => Promise<string | null>;
  onExportBackup: () => Promise<{ backup?: unknown; error?: string }>;
  onRestoreBackup: (payload: unknown) => Promise<{
    usersAdded?: number;
    testsAdded?: number;
    attemptsAdded?: number;
    error?: string;
  }>;
  onImportFirebase: (lg: string, pw: string) => Promise<{
    usersAdded?: number;
    testsAdded?: number;
    attemptsAdded?: number;
    error?: string;
  }>;
  onSetRole: (uid: string, role: Role) => Promise<string | null>;
  onSetPremium: (
    uid: string,
    days: number,
    mode: 'set' | 'add' | 'clear'
  ) => Promise<string | null>;
  onGenerateAttestation: (
    subject: string,
    targetGrade: string,
    count: number,
    mode?: 'ai' | 'bank',
    promptNote?: string
  ) => Promise<{ questions?: Question[]; error?: string }>;
  onGenerateMock: (payload: {
    subject: string;
    topic: string;
    difficulty: MockDifficulty;
    mcCount: number;
    writtenCount: number;
    promptNote?: string;
    mode?: 'ai' | 'bank';
  }) => Promise<{ questions?: Question[]; error?: string }>;
  onAiCleanPdf: (
    items: { id: string; s: string; o: string[] }[]
  ) => Promise<{
    items?: { id: string; s: string; o: string[] }[];
    error?: string;
  }>;
}

interface SlotDef {
  id: string;
  k: 'mc' | 'w';
  n: number;
  p?: string;
}

const SLOTS: SlotDef[] = (() => {
  const arr: SlotDef[] = [];
  for (let n = 1; n <= 35; n++) arr.push({ id: String(n), k: 'mc', n });
  for (let n = 36; n <= 45; n++) {
    arr.push({ id: `${n}a`, k: 'w', n, p: 'a' });
    arr.push({ id: `${n}b`, k: 'w', n, p: 'b' });
  }
  return arr;
})();

const ATTESTATION_SLOTS: SlotDef[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  k: 'mc',
  n: i + 1,
}));

const LATEX_SNIPPETS: [string, string][] = [
  ['√', '$\\sqrt{}$'],
  ['∛', '$\\sqrt[3]{}$'],
  ['a/b', '$\\dfrac{}{}$'],
  ['x²', '$x^{2}$'],
  ['xₙ', '$x_{n}$'],
  ['∫', '$\\int_{}^{} \\,dx$'],
  ['∑', '$\\sum_{k=1}^{n}$'],
  ['lim', '$\\lim_{x\\to 0}$'],
  ['log', '$\\log_{2}{}$'],
  ['sin', '$\\sin x$'],
  ['π', '$\\pi$'],
  ['≤', '$\\le$'],
  ['≥', '$\\ge$'],
  ['≠', '$\\ne$'],
];

type DraftItem = { s: string; o: string[]; c: number; a: string; topic?: string; explanation?: string };

function emptyDraftItem(): DraftItem {
  return { s: '', o: ['', '', '', ''], c: -1, a: '' };
}

function toLocalDatetimeValue(ms: number): string {
  const d = new Date(ms - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  users,
  tests,
  attempts,
  payConfig,
  siteConfig,
  payRequests,
  images,
  lang,
  onSaveTest,
  onDeleteTest,
  onVerifyPayment,
  onSavePayConfig,
  onSaveSiteConfig,
  onExportBackup,
  onRestoreBackup,
  onImportFirebase,
  onSetRole,
  onSetPremium,
  onGenerateAttestation,
  onGenerateMock,
  onAiCleanPdf,
}) => {
  const tx = (s: string) => trText(s, lang);
  const isOwner = canUseAiGenerator(currentUser.role);
  const isRootOwner = currentUser.id === 'u_owner';
  const [tab, setTab] = useState<'tests' | 'payments' | 'users'>('tests');

  // Test editor state
  const [editId, setEditId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TestCategory>('mock');
  const [subject, setSubject] = useState('Matematika');
  const [targetGrade, setTargetGrade] = useState('Oliy va 1-toifa');
  const [startAt, setStartAt] = useState(() => toLocalDatetimeValue(Date.now()));
  const [endAt, setEndAt] = useState('');
  const [isLifetime, setIsLifetime] = useState(true);
  const [dur, setDur] = useState(90);
  const [isUnlimitedTime, setIsUnlimitedTime] = useState(false);
  const [price, setPrice] = useState(0);
  const [draftItems, setDraftItems] = useState<Record<string, DraftItem>>({});
  const [draftImages, setDraftImages] = useState<Record<string, string>>({});
  const [selectedSlot, setSelectedSlot] = useState<string>('1');
  const [formErr, setFormErr] = useState('');
  const [formOk, setFormOk] = useState('');
  const [savingTest, setSavingTest] = useState(false);

  // Owner AI Mock generator inside Admin editor
  const [showAiMockBox, setShowAiMockBox] = useState(false);
  const [aiMockTopic, setAiMockTopic] = useState('');
  const [aiMockDifficulty, setAiMockDifficulty] = useState<MockDifficulty>('medium');
  const [aiMockMcCount, setAiMockMcCount] = useState(15);
  const [aiMockWrittenCount, setAiMockWrittenCount] = useState(2);
  const [aiMockNote, setAiMockNote] = useState('');

  // PDF import state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfKeyFile, setPdfKeyFile] = useState<File | null>(null);
  const [manualKeys, setManualKeys] = useState('');
  const [pdfStatus, setPdfStatus] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  // Payment config & filter state
  const [cfgPrice, setCfgPrice] = useState(payConfig.price || 25000);
  const [cfgCard, setCfgCard] = useState(payConfig.card || '');
  const [cfgHolder, setCfgHolder] = useState(payConfig.holder || '');
  const [cfgNote, setCfgNote] = useState(payConfig.note || '');
  const [payFilter, setPayFilter] = useState<'all' | 'pending' | 'ok' | 'no'>('all');
  const [payMsg, setPayMsg] = useState('');

  // Site author/contact config state
  const [siteAuthor, setSiteAuthor] = useState(siteConfig.authorLabel || '');
  const [siteTelegram, setSiteTelegram] = useState(siteConfig.telegramHandle || '');
  const [siteContactText, setSiteContactText] = useState(siteConfig.contactText || '');
  const [siteCfgMsg, setSiteCfgMsg] = useState('');

  // Users search, backup & Firebase import state
  const [userSearch, setUserSearch] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [fbLg, setFbLg] = useState('');
  const [fbPw, setFbPw] = useState('');

  // Premium day inputs per user
  const [premDays, setPremDays] = useState<Record<string, number>>({});

  const activeFieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const activeSlots = category === 'attestation' ? ATTESTATION_SLOTS : SLOTS;
  const curSlotDef = activeSlots.find((x) => x.id === selectedSlot) || activeSlots[0];
  const curItem = draftItems[selectedSlot] || emptyDraftItem();
  const imgKey = curSlotDef.k === 'mc' ? curSlotDef.id : String(curSlotDef.n);

  const isSlotFilled = (slot: SlotDef) => {
    const it = draftItems[slot.id];
    if (!it) return false;
    return Boolean(
      it.s.trim() ||
        it.o.some((x) => x.trim()) ||
        it.a.trim() ||
        (slot.k === 'mc' && draftImages[slot.id])
    );
  };

  const updateSlot = (patch: Partial<DraftItem>) => {
    setDraftItems((prev) => ({
      ...prev,
      [selectedSlot]: { ...(prev[selectedSlot] || emptyDraftItem()), ...patch },
    }));
  };

  const insertSnippet = (snippetIdx: number) => {
    let z = LATEX_SNIPPETS[snippetIdx][1];
    const target = activeFieldRef.current;
    if (!target) {
      updateSlot({ s: (curItem.s || '') + z });
      return;
    }
    const a = target.selectionStart ?? target.value.length;
    const b = target.selectionEnd ?? target.value.length;
    if (((target.value.slice(0, a).match(/\$/g) || []).length) % 2 === 1) {
      z = z.slice(1, -1);
    }
    const nextVal = target.value.slice(0, a) + z + target.value.slice(b);
    if (target.dataset.optIdx !== undefined) {
      const idx = Number(target.dataset.optIdx);
      const nextOpts = [...curItem.o];
      nextOpts[idx] = nextVal;
      updateSlot({ o: nextOpts });
    } else {
      updateSlot({ s: nextVal });
    }
    requestAnimationFrame(() => {
      target.focus();
      const braceIdx = z.indexOf('{}');
      const pos = braceIdx >= 0 ? a + braceIdx + 1 : a + z.length;
      target.setSelectionRange(pos, pos);
    });
  };

  const handleImportPdf = async () => {
    if (!pdfFile) {
      setPdfStatus('Avval savollar PDF faylini tanlang.');
      return;
    }
    setPdfBusy(true);
    setPdfStatus('PDF o‘qilmoqda va formulalar tozalanmoqda…');
    try {
      const parsed = await importPdfToQuestions(pdfFile, pdfKeyFile, manualKeys);
      if (parsed.parsedCount === 0) {
        setPdfStatus(
          'Savollar topilmadi. Agar PDF skanerlangan rasm bo‘lsa, matn ajratib bo‘lmaydi.'
        );
        setPdfBusy(false);
        return;
      }
      setDraftItems((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(parsed.questions)) {
          next[k] = { s: v.s, o: v.o, c: v.c, a: v.a };
        }
        return next;
      });
      const firstId = Object.keys(parsed.questions)[0] || '1';
      setSelectedSlot(firstId);
      setPdfStatus(
        `${parsed.parsedCount} ta savol o‘qildi, ${parsed.keyCount} ta javob kaliti topildi, ${parsed.strippedWatermarks} ta reklama/pastki yozuv olib tashlandi.${
          parsed.badOptions.length
            ? ` Variantlari ajratilmagan savollar: ${parsed.badOptions.join(', ')}.`
            : ''
        }`
      );
    } catch (e) {
      setPdfStatus(
        `PDF o‘qishda xato: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    setPdfBusy(false);
  };

  const handleAiPolishPdf = async () => {
    const entries = Object.entries(draftItems)
      .filter(([, v]) => v.s.trim())
      .slice(0, 25)
      .map(([id, v]) => ({ id, s: v.s, o: v.o }));
    if (entries.length === 0) {
      setPdfStatus('Avval PDF dan savollarni o‘qing.');
      return;
    }
    setPdfBusy(true);
    setPdfStatus('AI yordamida daraja, ildiz va kasrlar KaTeX formatiga o‘tkazilmoqda…');
    const res = await onAiCleanPdf(entries);
    setPdfBusy(false);
    if (res.error) {
      setPdfStatus(res.error);
      return;
    }
    if (res.items) {
      setDraftItems((prev) => {
        const next = { ...prev };
        for (const item of res.items!) {
          if (next[item.id]) {
            next[item.id] = {
              ...next[item.id],
              s: item.s,
              o: item.o?.length === 4 ? item.o : next[item.id].o,
            };
          }
        }
        return next;
      });
      setPdfStatus('Savollar va formulalar AI yordamida tozalandi.');
    }
  };

  const handleAutoFillAttestation = async (mode: 'ai' | 'bank' = 'ai') => {
    if (!isOwner) return;
    setPdfBusy(true);
    setFormErr('');
    setFormOk('');
    const subjId =
      ATTESTATION_SUBJECTS.find((s) =>
        subject.toLowerCase().includes(s.id)
      )?.id || 'matematika';
    const res = await onGenerateAttestation(subjId, targetGrade, 50, mode);
    setPdfBusy(false);
    if (res.error || !res.questions) {
      setFormErr(res.error || 'Generatsiya qilib bo‘lmadi.');
      return;
    }
    const nextMap: Record<string, DraftItem> = {};
    res.questions.forEach((q, idx) => {
      const id = String(idx + 1);
      nextMap[id] = {
        s: q.s,
        o: q.o,
        c: q.c ?? 0,
        a: '',
        topic: q.topic,
        explanation: q.explanation,
      };
    });
    setDraftItems(nextMap);
    setSelectedSlot('1');
    setDur(120);
    if (!title.trim()) {
      setTitle(`Attestatsiya: ${subject} (${targetGrade})`);
    }
    setFormOk(`${res.questions.length} ta attestatsiya savoli va javoblari avtomatik kiritildi.`);
  };

  const handleAutoFillMock = async (mode: 'ai' | 'bank' = 'ai') => {
    if (!isOwner) return;
    setPdfBusy(true);
    setFormErr('');
    setFormOk('');
    const res = await onGenerateMock({
      subject,
      topic: aiMockTopic.trim(),
      difficulty: aiMockDifficulty,
      mcCount: aiMockMcCount,
      writtenCount: aiMockWrittenCount,
      promptNote: aiMockNote.trim(),
      mode,
    });
    setPdfBusy(false);
    if (res.error || !res.questions || res.questions.length === 0) {
      setFormErr(res.error || 'Mock test savollarini tuzib bo‘lmadi.');
      return;
    }
    const nextMap: Record<string, DraftItem> = {};
    res.questions.forEach((q) => {
      nextMap[q.n] = {
        s: q.s,
        o: q.o?.length === 4 ? q.o : ['', '', '', ''],
        c: q.c ?? -1,
        a: q.a || '',
        topic: q.topic,
        explanation: q.explanation,
      };
    });
    setDraftItems(nextMap);
    setSelectedSlot(res.questions[0]?.n || '1');
    if (!title.trim()) {
      setTitle(
        `${subject}: ${mode === 'bank' ? 'Mock test' : 'AI Mock test'}${
          aiMockTopic.trim() ? ` (${aiMockTopic.trim()})` : ''
        }`
      );
    }
    setShowAiMockBox(false);
    setFormOk(
      `${res.questions.length} ta Mock savoli slatlarga joylandi. Kerakli joyini tahrirlab saqlang.`
    );
  };

  const resetForm = () => {
    setEditId('');
    setTitle('');
    setCategory('mock');
    setSubject('Matematika');
    setStartAt(toLocalDatetimeValue(Date.now()));
    setEndAt('');
    setIsLifetime(true);
    setDur(90);
    setIsUnlimitedTime(false);
    setPrice(0);
    setDraftItems({});
    setDraftImages({});
    setSelectedSlot('1');
    setFormErr('');
    setFormOk('');
  };

  const startEdit = (t: TestItem) => {
    setEditId(t.id);
    setTitle(t.title);
    setCategory(t.category);
    setSubject(t.subject || 'Matematika');
    setTargetGrade(t.targetGrade || 'Oliy va 1-toifa');
    setStartAt(toLocalDatetimeValue(t.at));
    setEndAt(t.end ? toLocalDatetimeValue(t.end) : '');
    setIsLifetime(t.isLifetime);
    setDur(t.dur);
    setIsUnlimitedTime(t.isUnlimitedTime);
    setPrice(t.price || 0);

    const map: Record<string, DraftItem> = {};
    const imgs: Record<string, string> = {};
    t.q.forEach((q) => {
      map[q.n] = {
        s: q.s,
        o: q.o?.length ? [...q.o] : ['', '', '', ''],
        c: q.c ?? -1,
        a: q.a || '',
        topic: q.topic,
        explanation: q.explanation,
      };
      if (q.im && images[`${t.id}_${q.im}`]) {
        imgs[q.im] = images[`${t.id}_${q.im}`];
      }
    });
    setDraftItems(map);
    setDraftImages(imgs);
    setSelectedSlot(t.q[0]?.n || '1');
    setFormErr('');
    setFormOk('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    setFormOk('');

    const qList: Question[] = [];
    const incomplete: string[] = [];

    for (const slot of activeSlots) {
      if (!isSlotFilled(slot)) continue;
      const item = draftItems[slot.id] || emptyDraftItem();
      const k = slot.k === 'mc' ? slot.id : String(slot.n);
      const hasImg = Boolean(draftImages[k]);

      if (slot.k === 'mc') {
        if ((!item.s.trim() && !hasImg) || item.o.some((o) => !o.trim()) || item.c < 0) {
          incomplete.push(slot.id);
          continue;
        }
        qList.push({
          n: slot.id,
          k: 'mc',
          s: item.s.trim(),
          o: item.o.map((o) => o.trim()),
          c: item.c,
          im: hasImg ? k : undefined,
          topic: item.topic,
          explanation: item.explanation,
        });
      } else {
        if (!item.s.trim() || !item.a.trim()) {
          incomplete.push(slot.id);
          continue;
        }
        qList.push({
          n: slot.id,
          k: 'w',
          s: item.s.trim(),
          o: [],
          a: item.a.trim(),
          im: hasImg ? k : undefined,
          topic: item.topic,
        });
      }
    }

    const atMs = new Date(startAt).getTime();
    const endMs = !isLifetime && endAt ? new Date(endAt).getTime() : 0;

    if (!title.trim()) {
      setFormErr('Test nomini kiriting.');
      return;
    }
    if (Number.isNaN(atMs)) {
      setFormErr('Boshlanish vaqtini kiriting.');
      return;
    }
    if (!isLifetime && endMs > 0 && endMs <= atMs) {
      setFormErr('Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak.');
      return;
    }
    if (incomplete.length > 0) {
      setFormErr(
        `To‘liq emas: ${incomplete.join(', ')}. Har bir savolda matn, 4 ta variant va to‘g‘ri javob belgisi bo‘lishi shart.`
      );
      return;
    }
    if (qList.length === 0) {
      setFormErr('Kamida bitta savol kiriting.');
      return;
    }

    setSavingTest(true);
    const err = await onSaveTest({
      id: editId || undefined,
      title: title.trim(),
      category,
      subject,
      targetGrade: category === 'attestation' ? targetGrade : undefined,
      at: atMs,
      end: endMs,
      isLifetime,
      dur: isUnlimitedTime ? 999 : Math.max(1, Number(dur) || 60),
      isUnlimitedTime,
      price: Math.max(0, Number(price) || 0),
      q: qList,
      images: draftImages,
    });
    setSavingTest(false);

    if (err) {
      setFormErr(err);
    } else {
      resetForm();
      setFormOk(editId ? 'Test yangilandi.' : 'Yangi test saqlandi.');
    }
  };

  // Payment statistics for Owner
  const paymentStats = useMemo(() => {
    const confirmed = payRequests.filter((r) => r.status === 'ok');
    const pending = payRequests.filter((r) => r.status === 'pending');
    const totalRevenue = confirmed.reduce((acc, r) => acc + (r.amount || 0), 0);
    return {
      totalRevenue,
      confirmedCount: confirmed.length,
      pendingCount: pending.length,
    };
  }, [payRequests]);

  const filteredRequests = useMemo(() => {
    const list =
      payFilter === 'all'
        ? payRequests
        : payRequests.filter((r) => r.status === payFilter);
    return [...list].sort((a, b) => b.at - a.at);
  }, [payRequests, payFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {tx('Admin panel')}
        </h1>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setTab('tests')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === 'tests'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tx('Testlar va Attestatsiya')}
          </button>
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => setTab('payments')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tab === 'payments'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tx('To‘lovlar va Tushumlar')}
                {paymentStats.pendingCount > 0 && (
                  <span className="ml-1.5 text-amber-500 font-mono">
                    ({paymentStats.pendingCount})
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTab('users')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tab === 'users'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tx('Foydalanuvchilar')}
              </button>
            </>
          )}
        </div>
      </div>

      {tab === 'tests' && (
        <div className="space-y-8">
          <form
            onSubmit={handleSaveTest}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-bold text-lg">
                {editId ? tx('Testni tahrirlash') : tx('Yangi test yaratish')}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {isOwner && category === 'attestation' && (
                  <>
                    <button
                      type="button"
                      disabled={pdfBusy}
                      onClick={() => handleAutoFillAttestation('ai')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{tx('AI bilan Attestatsiya tuzish')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={pdfBusy}
                      onClick={() => handleAutoFillAttestation('bank')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      <span>{tx('O‘quv bankidan 50 ta')}</span>
                    </button>
                  </>
                )}
                {isOwner && category !== 'attestation' && (
                  <button
                    type="button"
                    disabled={pdfBusy}
                    onClick={() => setShowAiMockBox((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{tx('AI bilan Mock test tuzish')}</span>
                  </button>
                )}
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-semibold text-rose-500 hover:underline"
                  >
                    {tx('Bekor qilish')}
                  </button>
                )}
              </div>
            </div>

            {isOwner && showAiMockBox && category !== 'attestation' && (
              <div className="rounded-xl border border-indigo-500/35 bg-indigo-500/5 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-sm">
                      {tx('Owner AI Mock test generatori')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tx('AI savollar, A–D variantlar, yozma javoblar va KaTeX formulalarni slatlarga to‘ldiradi.')}
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {tx('Fan')}
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
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
                      {tx('Qiyinlik')}
                    </label>
                    <select
                      value={aiMockDifficulty}
                      onChange={(e) =>
                        setAiMockDifficulty(e.target.value as MockDifficulty)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="easy">Oson</option>
                      <option value="medium">O‘rta (Milliy sertifikat)</option>
                      <option value="hard">Murakkab (Olimpiada)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {tx('Test savollari (1–35)')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={35}
                      value={aiMockMcCount}
                      onChange={(e) => setAiMockMcCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
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
                      value={aiMockWrittenCount}
                      onChange={(e) => setAiMockWrittenCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={aiMockTopic}
                    onChange={(e) => setAiMockTopic(e.target.value)}
                    placeholder="Mavzu (masalan: Logarifmlar, Geometrik progressiya)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <input
                    value={aiMockNote}
                    onChange={(e) => setAiMockNote(e.target.value)}
                    placeholder="Qo‘shimcha ko‘rsatma (ixtiyoriy)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAiMockBox(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    {tx('Yopish')}
                  </button>
                  <button
                    type="button"
                    disabled={pdfBusy}
                    onClick={() => handleAutoFillMock('bank')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 text-xs font-semibold disabled:opacity-50"
                  >
                    <span>{tx('O‘quv bazasidan tezkor tuzish')}</span>
                  </button>
                  <button
                    type="button"
                    disabled={pdfBusy}
                    onClick={() => handleAutoFillMock('ai')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>
                      {pdfBusy ? tx('Savollar tuzilmoqda…') : tx('AI bilan slatlarni to‘ldirish')}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">
                  {tx('Test nomi')}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: 3-mock: Matematika Milliy Sertifikat"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Bo‘lim turi')}
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const nextCat = e.target.value as TestCategory;
                    setCategory(nextCat);
                    if (nextCat === 'attestation' && dur === 90) setDur(120);
                    if (nextCat !== 'attestation' && Number(selectedSlot) > 35) {
                      setSelectedSlot('1');
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="mock">Mock test</option>
                  <option value="attestation">Attestatsiya (Ustozlar)</option>
                  {isOwner && <option value="olympiad">Olimpiada</option>}
                </select>
              </div>
              <div>
                <label htmlFor="admin-test-subject" className="block text-xs font-semibold mb-1">
                  {tx('Fan (bo‘lim)')}
                </label>
                <select
                  id="admin-test-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  {(category === 'attestation'
                    ? ATTESTATION_SUBJECTS.map((s) => ({ id: s.label, label: s.label }))
                    : MOCK_SUBJECTS
                  ).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Boshlanish vaqti')}
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Tugash vaqti')}
                </label>
                <input
                  type="datetime-local"
                  disabled={isLifetime}
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-40"
                />
                <label className="flex items-center gap-2 mt-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLifetime}
                    onChange={(e) => setIsLifetime(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>{tx('Butun umrlik test (tugamaydi)')}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Ishlash vaqti (daqiqa)')}
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={isUnlimitedTime}
                  value={dur}
                  onChange={(e) => setDur(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-40"
                />
                <label className="flex items-center gap-2 mt-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnlimitedTime}
                    onChange={(e) => setIsUnlimitedTime(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>{tx('Xohlagancha vaqt (cheklanmagan)')}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Test narxi (so‘m, 0 = bepul)')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {[0, 10000, 15000, 25000].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrice(p)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        price === p
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      {p === 0 ? 'Bepul' : `${p / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PDF Importer Box */}
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-sm">
                    {tx('PDF dan savollarni aqlli o‘qish')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tx(
                      'So‘z oraliqlarini tiklaydi, Telegram/reklama yozuvlarini olib tashlaydi va daraja/indekslarni KaTeX ko‘rinishiga o‘tkazadi.'
                    )}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    {tx('Test PDF fayli')}
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    {tx('Kalitlar PDF (ixtiyoriy)')}
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfKeyFile(e.target.files?.[0] || null)}
                    className="text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    {tx('Yoki kalit matni (1.A 2.C...)')}
                  </label>
                  <input
                    value={manualKeys}
                    onChange={(e) => setManualKeys(e.target.value)}
                    placeholder="1.A 2.C 3.B ..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pdfBusy}
                  onClick={handleImportPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>{tx('PDF ni o‘qish')}</span>
                </button>
                {isOwner && (
                  <button
                    type="button"
                    disabled={pdfBusy}
                    onClick={handleAiPolishPdf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-500/10 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{tx('AI bilan formulalarni tiklash')}</span>
                  </button>
                )}
              </div>
              {pdfStatus && (
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {pdfStatus}
                </p>
              )}
            </div>

            {/* Question Slots */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {category === 'attestation'
                  ? tx(
                      'Attestatsiya savollari (1–50: 35 mutaxassislik, 5 kasb standarti, 10 pedagogika)'
                    )
                  : tx('Test savollari (1–35) va Yozma savollar (36a–45b)')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeSlots.map((sl) => {
                  const active = selectedSlot === sl.id;
                  const ok = isSlotFilled(sl);
                  return (
                    <button
                      key={sl.id}
                      type="button"
                      onClick={() => setSelectedSlot(sl.id)}
                      className={`min-w-9 px-2 h-8 rounded-md font-mono text-xs font-bold border transition-colors ${
                        active
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : ok
                            ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {sl.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Slot Editor */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold text-sm">
                  {curSlotDef.k === 'w'
                    ? `${curSlotDef.n}-savol, ${curSlotDef.p})`
                    : `${curSlotDef.id}-savol`}
                </h3>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>
                    {draftImages[imgKey] ? tx('Rasmni almashtirish') : tx('Rasm qo‘shish')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await shrinkImageFile(f, 900);
                      setDraftImages((prev) => ({ ...prev, [imgKey]: url }));
                    }}
                  />
                </label>
              </div>

              {draftImages[imgKey] && (
                <div className="flex items-start gap-3">
                  <img
                    src={draftImages[imgKey]}
                    alt="Savol rasmi"
                    className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraftImages((prev) => {
                        const c = { ...prev };
                        delete c[imgKey];
                        return c;
                      })
                    }
                    className="text-xs text-rose-500 font-semibold hover:underline"
                  >
                    {tx('Rasmni o‘chirish')}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {LATEX_SNIPPETS.map(([lbl], idx) => (
                  <button
                    key={lbl}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertSnippet(idx)}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={curItem.s}
                onFocus={(e) => {
                  activeFieldRef.current = e.target;
                }}
                onChange={(e) => updateSlot({ s: e.target.value })}
                placeholder="Savol matnini yozing. Formulalar uchun $...$ dan foydalaning."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
              />

              {curSlotDef.k === 'mc' ? (
                <div className="space-y-2">
                  {curItem.o.map((optVal, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0">
                        <input
                          type="radio"
                          name={`ans_${selectedSlot}`}
                          checked={curItem.c === oIdx}
                          onChange={() => updateSlot({ c: oIdx })}
                        />
                        <span>{'ABCD'[oIdx]}</span>
                      </label>
                      <input
                        data-opt-idx={oIdx}
                        value={optVal}
                        onFocus={(e) => {
                          activeFieldRef.current = e.target;
                        }}
                        onChange={(e) => {
                          const next = [...curItem.o];
                          next[oIdx] = e.target.value;
                          updateSlot({ o: next });
                        }}
                        placeholder={`${'ABCD'[oIdx]} javobi`}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {tx('To‘g‘ri javob (har bir muqobil ko‘rinish yangi qatorda)')}
                  </label>
                  <textarea
                    rows={2}
                    value={curItem.a}
                    onChange={(e) => updateSlot({ a: e.target.value })}
                    placeholder="Masalan: 4√2"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                </div>
              )}

              {(curItem.s.trim() || curItem.o.some((o) => o.trim())) && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400">
                    {tx('Jonli ko‘rinish (KaTeX)')}
                  </div>
                  <div className="text-sm font-medium">
                    <MathText text={curItem.s} />
                  </div>
                  {curSlotDef.k === 'mc' && (
                    <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
                      {curItem.o.map((o, j) => (
                        <div
                          key={j}
                          className={`px-2.5 py-1.5 rounded border ${
                            curItem.c === j
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-semibold'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <b>{'ABCD'[j]}.</b> <MathText text={o} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {formErr && (
              <p className="text-sm font-semibold text-rose-500">{formErr}</p>
            )}
            {formOk && (
              <p className="text-sm font-semibold text-emerald-500">{formOk}</p>
            )}

            <button
              type="submit"
              disabled={savingTest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>
                {savingTest
                  ? tx('Saqlanmoqda…')
                  : editId
                    ? tx('O‘zgarishlarni saqlash')
                    : tx('Testni saqlash')}
              </span>
            </button>
          </form>

          {/* Existing Tests List */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold">
              {tx('Mavjud testlar ro‘yxati')}
            </h2>
            {tests.map((t) => {
              const subCount = attempts.filter((a) => a.tid === t.id).length;
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-display font-bold text-sm sm:text-base">
                      {t.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-2">
                      <span>{t.category}</span>
                      <span>·</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {tx(resolveMockSubject(t))}
                      </span>
                      <span>·</span>
                      <span>
                        {t.price > 0 ? formatSom(t.price, lang) : tx('Bepul')}
                      </span>
                      <span>·</span>
                      <span>
                        {t.isUnlimitedTime
                          ? tx('Xohlagancha vaqt')
                          : `${t.dur} daq`}
                      </span>
                      <span>·</span>
                      <span>
                        {t.q.length} savol · {subCount} topshirgan
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{tx('Tahrirlash')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTest(t.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tx('O‘chirish')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}

      {tab === 'payments' && isOwner && (
        <div className="space-y-6">
          {/* Revenue & Payment Tracking Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {tx('Tasdiqlangan tushum (Pul tushgan)')}
              </div>
              <div className="font-display text-2xl font-extrabold font-mono tabular-nums mt-1 text-emerald-700 dark:text-emerald-300">
                {formatSom(paymentStats.totalRevenue, lang)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {tx('Tekshirilmagan (Kutilmoqda)')}
              </div>
              <div className="font-display text-2xl font-extrabold font-mono tabular-nums mt-1 text-amber-700 dark:text-amber-300">
                {paymentStats.pendingCount} ta
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {tx('Jami tasdiqlangan to‘lovlar')}
              </div>
              <div className="font-display text-2xl font-extrabold font-mono tabular-nums mt-1">
                {paymentStats.confirmedCount} ta
              </div>
            </div>
          </div>

          {/* Card Config */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 space-y-4">
            <h2 className="font-display font-bold text-base">
              {tx('Karta va Premium narxi sozlamalari')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Premium narxi (so‘m / oy)')}
                </label>
                <input
                  type="number"
                  value={cfgPrice}
                  onChange={(e) => setCfgPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Karta raqami')}
                </label>
                <input
                  value={cfgCard}
                  onChange={(e) => setCfgCard(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Karta egasi')}
                </label>
                <input
                  value={cfgHolder}
                  onChange={(e) => setCfgHolder(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {tx('Izoh')}
                </label>
                <input
                  value={cfgNote}
                  onChange={(e) => setCfgNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  const err = await onSavePayConfig({
                    price: cfgPrice,
                    card: cfgCard,
                    holder: cfgHolder,
                    note: cfgNote,
                  });
                  setPayMsg(err || 'To‘lov sozlamalari saqlandi.');
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
              >
                {tx('Saqlash')}
              </button>
              {payMsg && (
                <span className="text-xs font-medium text-emerald-500">
                  {payMsg}
                </span>
              )}
            </div>
          </div>

          {/* Site Author & Contact Settings */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 space-y-4">
            <h2 className="font-display font-bold text-base">
              {tx('Muallif va aloqa (Sayt pastki qismi)')}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="site-author-label"
                  className="block text-xs font-semibold mb-1"
                >
                  {tx('Muallif yoki platforma nomi')}
                </label>
                <input
                  id="site-author-label"
                  value={siteAuthor}
                  onChange={(e) => setSiteAuthor(e.target.value)}
                  placeholder="Masalan: Sherbek · Milliy Sertifikat"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="site-telegram-handle"
                  className="block text-xs font-semibold mb-1"
                >
                  {tx('Telegram username (ixtiyoriy)')}
                </label>
                <input
                  id="site-telegram-handle"
                  value={siteTelegram}
                  onChange={(e) => setSiteTelegram(e.target.value)}
                  placeholder="Masalan: username (@ siz)"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                />
              </div>
              <div>
                <label
                  htmlFor="site-contact-text"
                  className="block text-xs font-semibold mb-1"
                >
                  {tx('Qo‘shimcha aloqa matni')}
                </label>
                <input
                  id="site-contact-text"
                  value={siteContactText}
                  onChange={(e) => setSiteContactText(e.target.value)}
                  placeholder="Onlayn test va attestatsiya platformasi"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  const err = await onSaveSiteConfig({
                    authorLabel: siteAuthor,
                    telegramHandle: siteTelegram,
                    contactText: siteContactText,
                  });
                  setSiteCfgMsg(err || 'Sayt aloqa ma’lumotlari saqlandi.');
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
              >
                {tx('Aloqani saqlash')}
              </button>
              {siteCfgMsg && (
                <span className="text-xs font-medium text-emerald-500">
                  {siteCfgMsg}
                </span>
              )}
            </div>
          </div>

          {/* Payment Requests & Ledger */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-bold text-base">
                {tx('To‘lovlar nazorati (Pul tushgan / Tushmagan)')}
              </h2>
              <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
                {(
                  [
                    ['all', 'Barchasi'],
                    ['pending', 'Kutilmoqda'],
                    ['ok', 'Pul tushgan'],
                    ['no', 'Rad etilgan'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPayFilter(k)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      payFilter === k
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    {tx(lbl)}
                  </button>
                ))}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                {tx('Tanlangan holat bo‘yicha to‘lovlar yo‘q.')}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{r.nm}</span>
                        <span className="text-xs text-slate-500">@{r.lg}</span>
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {formatSom(r.amount, lang)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {r.type === 'test'
                          ? `${tx('Test')}: ${r.testTitle || r.tid}`
                          : `Premium · ${r.months || 1} oy`}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(r.at).toLocaleString('uz-UZ')}
                        {r.note ? ` · ${r.note}` : ''}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {r.img && (
                        <img
                          src={r.img}
                          alt="Chek"
                          className="h-16 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                      )}
                      {r.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onVerifyPayment(r.id, 'ok')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{tx('Pul tushdi (Tasdiqlash)')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onVerifyPayment(r.id, 'no')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/40 text-rose-500 text-xs font-semibold hover:bg-rose-500/10"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{tx('Rad etish')}</span>
                          </button>
                        </div>
                      ) : r.status === 'ok' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                          <CheckCircle2 className="w-4 h-4" />
                          {tx('Pul tushgan · Ochildi')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500">
                          <Clock className="w-4 h-4" />
                          {tx('Rad etildi')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && isOwner && (
        <div className="space-y-6">
          {isRootOwner && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-base flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span>{tx('Zaxira nusxa va Eski Firebase dan tiklash')}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {tx(
                      'Mavjud foydalanuvchilar va testlarni JSON faylga saqlab qo‘ying yoki eski milliy-sertifikat-cca37 saytidagi hisoblar va testlarni o‘chirmasdan qo‘shib oling.'
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={backupBusy}
                    onClick={async () => {
                      setBackupBusy(true);
                      setBackupStatus('');
                      const res = await onExportBackup();
                      setBackupBusy(false);
                      if (res.error || !res.backup) {
                        setBackupStatus(res.error || 'Zaxira olinmadi.');
                        return;
                      }
                      const blob = new Blob([JSON.stringify(res.backup, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `milliy-sertifikat-backup-${new Date()
                        .toISOString()
                        .slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setBackupStatus('To‘liq zaxira JSON fayli yuklab olindi.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{tx('Zaxira yuklab olish (JSON)')}</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{tx('JSON fayldan birlashtirish')}</span>
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBackupBusy(true);
                        setBackupStatus('');
                        try {
                          const text = await file.text();
                          const parsed = JSON.parse(text);
                          const res = await onRestoreBackup(parsed);
                          if (res.error) {
                            setBackupStatus(res.error);
                          } else {
                            setBackupStatus(
                              `Birlashtirildi: +${res.usersAdded || 0} foydalanuvchi, +${res.testsAdded || 0} test, +${res.attemptsAdded || 0} natija.`
                            );
                          }
                        } catch {
                          setBackupStatus('JSON fayl noto‘g‘ri formatda.');
                        }
                        setBackupBusy(false);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label
                    htmlFor="fb-legacy-lg"
                    className="block text-xs font-semibold mb-1"
                  >
                    {tx('Eski sayt logini (milliy-sertifikat-cca37)')}
                  </label>
                  <input
                    id="fb-legacy-lg"
                    value={fbLg}
                    onChange={(e) => setFbLg(e.target.value)}
                    placeholder="Eski login (masalan: sherbek)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="fb-legacy-pw"
                    className="block text-xs font-semibold mb-1"
                  >
                    {tx('Eski sayt paroli')}
                  </label>
                  <input
                    id="fb-legacy-pw"
                    type="password"
                    value={fbPw}
                    onChange={(e) => setFbPw(e.target.value)}
                    placeholder="Eski hisob paroli"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={backupBusy || !fbLg.trim() || !fbPw}
                  onClick={async () => {
                    setBackupBusy(true);
                    setBackupStatus('');
                    const res = await onImportFirebase(fbLg.trim(), fbPw);
                    setBackupBusy(false);
                    if (res.error) {
                      setBackupStatus(res.error);
                    } else {
                      setFbPw('');
                      setBackupStatus(
                        `Eski Firebase dan import qilindi: +${res.usersAdded || 0} foydalanuvchi, +${res.testsAdded || 0} test, +${res.attemptsAdded || 0} natija.`
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {backupBusy ? tx('Import qilinmoqda…') : tx('Eski Firebase dan tortib olish')}
                </button>
              </div>

              {backupStatus && (
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {backupStatus}
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-bold text-base">
                  {tx('Foydalanuvchilar, rollar va Premium')}
                </h2>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {tx('Jami')}: {users.length}
                </span>
              </div>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={tx('Ism yoki login bo‘yicha qidirish…')}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-60"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    <th className="py-3 px-4">{tx('Ism')}</th>
                    <th className="py-3 px-4">{tx('Login')}</th>
                    <th className="py-3 px-4">{tx('Rol')}</th>
                    <th className="py-3 px-4">{tx('Premium')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => {
                      const q = userSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        u.nm.toLowerCase().includes(q) ||
                        u.lg.toLowerCase().includes(q)
                      );
                    })
                    .map((u) => {
                      const leftDays =
                        u.prem && u.prem > Date.now()
                          ? Math.ceil((u.prem - Date.now()) / 864e5)
                          : 0;
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-slate-100 dark:border-slate-800/70 last:border-0"
                        >
                          <td className="py-3 px-4 font-semibold">{u.nm}</td>
                          <td className="py-3 px-4 text-slate-500">@{u.lg}</td>
                          <td className="py-3 px-4">
                            {u.id === 'u_owner' ? (
                              <span className="font-bold text-amber-500">
                                {tx('Asosiy Owner')}
                              </span>
                            ) : isRootOwner ? (
                              <select
                                aria-label={`Rol ${u.nm}`}
                                value={u.role}
                                onChange={(e) =>
                                  onSetRole(u.id, e.target.value as Role)
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                              >
                                <option value="user">{tx('Foydalanuvchi')}</option>
                                <option value="admin">{tx('Admin')}</option>
                                <option value="owner">{tx('Owner')}</option>
                              </select>
                            ) : (
                              <div className="flex flex-col">
                                <span
                                  className={`text-xs font-bold ${
                                    u.role === 'owner'
                                      ? 'text-amber-500'
                                      : u.role === 'admin'
                                        ? 'text-indigo-500'
                                        : 'text-slate-500'
                                  }`}
                                >
                                  {u.role === 'owner'
                                    ? 'Owner'
                                    : u.role === 'admin'
                                      ? tx('Admin')
                                      : tx('Foydalanuvchi')}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {tx('Faqat Asosiy Owner o‘zgartiradi')}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.role !== 'user' ? (
                              <span className="text-xs text-slate-400">
                                {tx('Cheklovsiz')}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs tabular-nums w-20">
                                  {leftDays > 0 ? `${leftDays} kun` : tx('Yo‘q')}
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  value={premDays[u.id] ?? 30}
                                  onChange={(e) =>
                                    setPremDays((p) => ({
                                      ...p,
                                      [u.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSetPremium(u.id, premDays[u.id] ?? 30, 'add')
                                  }
                                  className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-semibold"
                                >
                                  +Qo‘shish
                                </button>
                                {leftDays > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onSetPremium(u.id, 0, 'clear')}
                                    className="px-2 py-1 rounded border border-rose-500/30 text-rose-500 text-xs"
                                  >
                                    Bekor
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
