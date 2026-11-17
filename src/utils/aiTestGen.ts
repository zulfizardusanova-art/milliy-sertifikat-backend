import type { Question, Role, TestItem } from '../types';

export interface MockSubjectOption {
  id: string;
  label: string;
}

export const MOCK_SUBJECTS: MockSubjectOption[] = [
  { id: 'Matematika', label: 'Matematika' },
  { id: 'Fizika', label: 'Fizika' },
  { id: 'Kimyo', label: 'Kimyo' },
  { id: 'Biologiya', label: 'Biologiya' },
  { id: 'Ona tili va adabiyot', label: 'Ona tili va adabiyot' },
  { id: 'Tarix', label: 'Tarix' },
  { id: 'Ingliz tili', label: 'Ingliz tili' },
  { id: 'Informatika', label: 'Informatika' },
  { id: 'Geografiya', label: 'Geografiya' },
  { id: 'Huquq', label: 'Huquq' },
  { id: 'Boshqa fanlar', label: 'Boshqa fanlar' },
];

export function resolveMockSubject(
  test: Pick<TestItem, 'subject' | 'title'>
): string {
  const raw = (test.subject || '').trim();
  if (raw) {
    const exact = MOCK_SUBJECTS.find(
      (s) => s.id.toLowerCase() === raw.toLowerCase()
    );
    if (exact) return exact.id;
    return raw;
  }
  const title = (test.title || '').toLowerCase();
  if (/fizika|mexanika|optika|elektr/.test(title)) return 'Fizika';
  if (/kimyo|organik|anorganik/.test(title)) return 'Kimyo';
  if (/biologiya|genetika|botanika|zoologiya/.test(title)) return 'Biologiya';
  if (/ona tili|adabiyot/.test(title)) return 'Ona tili va adabiyot';
  if (/tarix/.test(title)) return 'Tarix';
  if (/ingliz|english/.test(title)) return 'Ingliz tili';
  if (/informatika|dasturlash|python|c\+\+/.test(title)) return 'Informatika';
  if (/geografiya/.test(title)) return 'Geografiya';
  if (/huquq/.test(title)) return 'Huquq';
  if (/matematika|algebra|geometriya|sertifikat/.test(title)) return 'Matematika';
  return 'Boshqa fanlar';
}

export function summarizeMockSubjects(mockTests: TestItem[]): {
  counts: Record<string, number>;
  subjects: string[];
} {
  const counts: Record<string, number> = {};
  for (const t of mockTests) {
    const subj = resolveMockSubject(t);
    counts[subj] = (counts[subj] || 0) + 1;
  }
  const base = MOCK_SUBJECTS.map((s) => s.id);
  const extras = Object.keys(counts).filter((k) => !base.includes(k));
  return {
    counts,
    subjects: [...base, ...extras],
  };
}

export type MockDifficulty = 'easy' | 'medium' | 'hard';

export interface AiMockRequestParams {
  subject: string;
  topic?: string;
  difficulty?: MockDifficulty;
  mcCount: number;
  writtenCount: number;
  promptNote?: string;
}

export interface AiAttestationRequestParams {
  subject: string;
  targetGrade: string;
  count: number;
  promptNote?: string;
}

export interface RawAiQuestionItem {
  k?: string;
  s?: string;
  o?: unknown;
  c?: unknown;
  a?: unknown;
  topic?: unknown;
  explanation?: unknown;
}

/**
 * Strict Owner-only check for AI test generation and AI PDF formula cleanup.
 */
export function canUseAiGenerator(role?: Role | null): boolean {
  return role === 'owner';
}

export function clampMockCounts(mcCount: number, writtenCount: number): {
  mcCount: number;
  writtenCount: number;
} {
  const mc = Math.min(35, Math.max(1, Math.round(Number(mcCount) || 10)));
  const wr = Math.min(10, Math.max(0, Math.round(Number(writtenCount) || 0)));
  return { mcCount: mc, writtenCount: wr };
}

export function buildMockTestPrompt(params: AiMockRequestParams): string {
  const { mcCount, writtenCount } = clampMockCounts(
    params.mcCount,
    params.writtenCount
  );
  const diffLabel =
    params.difficulty === 'easy'
      ? 'Boshlang‘ich / Oson (maktab bazasi)'
      : params.difficulty === 'hard'
        ? 'Murakkab / Olimpiada va chuqurlashtirilgan daraja'
        : 'O‘rta / Milliy sertifikat rasmiy imtihon darajasi';

  const topicLine = params.topic?.trim()
    ? `Asosiy mavzular: ${params.topic.trim()}.`
    : 'Mavzular fan dasturidagi asosiy bo‘limlarni qamrab olsin.';
  const noteLine = params.promptNote?.trim()
    ? `Owner qo‘shimcha ko‘rsatmasi: ${params.promptNote.trim()}.`
    : '';

  return `O‘zbekiston Davlat test markazi / Milliy sertifikat imtihonlari andozasiga mos ravishda "${params.subject}" fani bo‘yicha o‘zbek tilida (lotin yozuvida) yangi va original Mock test savollarini tuzing.
Qiyinlik darajasi: ${diffLabel}.
${topicLine}
${noteLine}

Tuzilishi:
1) Jami ${mcCount} ta yopiq test savoli (k = "mc"): har birida aniq 4 ta variant ("o" massivida A, B, C, D prefiksisiz), to‘g‘ri javob indeksi "c" (0, 1, 2 yoki 3).
${
  writtenCount > 0
    ? `2) Qo‘shimcha ${writtenCount} ta ochiq/yozma savol (k = "w"): har birida "o" bo‘sh massiv [] bo‘lsin, "a" maydonida qisqa va aniq to‘g‘ri javob (son yoki oddiy matematik ifoda, masalan "12", "3/4", "2√3") berilsin.`
    : '2) Yozma savol kerak emas (faqat "mc" savollar).'
}

Qoidalar:
- Matematik, fizik va kimyoviy formulalarni albatta KaTeX formatida $...$ ichida yozing (masalan: $x^2 - 5x + 6 = 0$, $\\frac{a}{b}$, $\\sqrt{x}$).
- Variantlar bir-birini takrorlamasin, chalg‘ituvchi (distraktor) variantlar mantiqiy va ilmiy asoslangan bo‘lsin.
- Har bir savolda "topic" (mavzu nomi) va "explanation" (qisqa yechim izohi) bo‘lsin.`;
}

export function buildAttestationPrompt(params: AiAttestationRequestParams): string {
  const count = Math.min(50, Math.max(5, Math.round(Number(params.count) || 50)));
  const noteLine = params.promptNote?.trim()
    ? `Owner qo‘shimcha ko‘rsatmasi: ${params.promptNote.trim()}.`
    : '';
  return `O‘zbekiston Maktabgacha va maktab ta’limi vazirligi o‘qituvchilar malaka toifasi (Attestatsiya) imtihoni rasmiy tuzilmasiga muvofiq "${params.subject}" fani bo‘yicha ${count} ta sifatli test savolini o‘zbek tilida (lotin yozuvida) tuzing (taxminan 70% mutaxassislik fani, 10% o‘qituvchi kasbiy standarti, 20% pedagogik mahorat va psixologiya). Maqsadli toifa: ${params.targetGrade}.
${noteLine}
Matematik/fizik formulalarni albatta KaTeX formatida $...$ ichida yozing (masalan: $x^2 + 3x - 4 = 0$, $\\frac{a}{b}$, $\\sqrt{x}$).
Har bir savolda:
- s: savol matni
- o: 4 ta variant (A, B, C, D prefikslarisiz)
- c: to‘g‘ri javob indeksi (0, 1, 2 yoki 3)
- topic: mavzu nomi
- explanation: qisqa izohli yechim`;
}

function stripOptionPrefix(opt: string): string {
  return opt.replace(/^[A-Da-d]\s*[.)]\s*/, '').trim();
}

function parseAnswerIndex(c: unknown): number {
  if (typeof c === 'number' && Number.isInteger(c) && c >= 0 && c <= 3) return c;
  const s = String(c ?? '').trim().toUpperCase();
  if (s === 'A' || s === '0') return 0;
  if (s === 'B' || s === '1') return 1;
  if (s === 'C' || s === '2') return 2;
  if (s === 'D' || s === '3') return 3;
  return 0;
}

function extractOptionsArray(rawOpts: unknown): string[] {
  if (Array.isArray(rawOpts)) {
    return rawOpts.map((v) => stripOptionPrefix(String(v ?? ''))).filter(Boolean);
  }
  if (rawOpts && typeof rawOpts === 'object') {
    const obj = rawOpts as Record<string, unknown>;
    return ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd']
      .filter((k) => obj[k] !== undefined)
      .slice(0, 4)
      .map((k) => stripOptionPrefix(String(obj[k] ?? '')))
      .filter(Boolean);
  }
  return [];
}

/**
 * Robustly extracts RawAiQuestionItem[] from Gemini JSON responses even if
 * wrapped in markdown code fences, a container object, or truncated mid-array.
 */
export function extractJsonArrayFromText(rawText: string): RawAiQuestionItem[] {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!cleaned) return [];

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed)) return parsed as RawAiQuestionItem[];
    if (parsed && typeof parsed === 'object') {
      const rec = parsed as Record<string, unknown>;
      if (Array.isArray(rec.questions)) return rec.questions as RawAiQuestionItem[];
      if (Array.isArray(rec.items)) return rec.items as RawAiQuestionItem[];
    }
  } catch {
    // Fall back to recovering complete JSON objects if response truncated
  }

  const start = cleaned.indexOf('[');
  if (start >= 0) {
    const items: RawAiQuestionItem[] = [];
    let depth = 0;
    let objStart = -1;
    let inStr = false;
    let escaped = false;
    for (let i = start + 1; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inStr) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inStr = false;
        }
        continue;
      }
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === '{') {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && objStart >= 0) {
          try {
            const obj = JSON.parse(cleaned.slice(objStart, i + 1)) as RawAiQuestionItem;
            items.push(obj);
          } catch {
            // skip malformed element
          }
          objStart = -1;
        }
      }
    }
    if (items.length > 0) return items;
  }

  return [];
}

export function normalizeAiMockQuestions(
  rawItems: RawAiQuestionItem[],
  mcCount: number,
  writtenCount: number
): Question[] {
  const { mcCount: targetMc, writtenCount: targetWr } = clampMockCounts(
    mcCount,
    writtenCount
  );

  const mcList: Question[] = [];
  const wrList: Question[] = [];

  for (const item of rawItems) {
    if (!item || typeof item.s !== 'string' || !item.s.trim()) continue;
    const isWritten = item.k === 'w' || (typeof item.a === 'string' && item.a.trim().length > 0 && (!Array.isArray(item.o) || item.o.length === 0));

    if (!isWritten && mcList.length < targetMc) {
      const opts = extractOptionsArray(item.o);
      if (opts.length >= 4) {
        const safeC = parseAnswerIndex(item.c);
        mcList.push({
          n: String(mcList.length + 1),
          k: 'mc',
          s: item.s.trim(),
          o: opts.slice(0, 4),
          c: safeC,
          topic: typeof item.topic === 'string' ? item.topic.trim() : undefined,
          explanation:
            typeof item.explanation === 'string' ? item.explanation.trim() : undefined,
        });
      }
    } else if (isWritten && wrList.length < targetWr) {
      const ans = String(item.a ?? '').trim();
      if (ans) {
        const idx = wrList.length;
        const qNum = 36 + Math.floor(idx / 2);
        const part = idx % 2 === 0 ? 'a' : 'b';
        wrList.push({
          n: `${qNum}${part}`,
          k: 'w',
          s: item.s.trim(),
          o: [],
          a: ans,
          topic: typeof item.topic === 'string' ? item.topic.trim() : undefined,
          explanation:
            typeof item.explanation === 'string' ? item.explanation.trim() : undefined,
        });
      }
    }
  }

  return [...mcList, ...wrList];
}

export function normalizeAiAttestationQuestions(
  rawItems: RawAiQuestionItem[],
  count: number
): Question[] {
  const limit = Math.min(50, Math.max(5, Math.round(Number(count) || 50)));
  const out: Question[] = [];
  for (const item of rawItems) {
    if (out.length >= limit) break;
    if (!item || typeof item.s !== 'string' || !item.s.trim()) continue;
    const opts = extractOptionsArray(item.o);
    if (opts.length < 4) continue;
    const safeC = parseAnswerIndex(item.c);
    out.push({
      n: String(out.length + 1),
      k: 'mc',
      s: item.s.trim(),
      o: opts.slice(0, 4),
      c: safeC,
      topic: typeof item.topic === 'string' ? item.topic.trim() : undefined,
      explanation:
        typeof item.explanation === 'string' ? item.explanation.trim() : undefined,
    });
  }
  return out;
}

function makeUniqueOptions(correct: string, candidates: string[], seed: number): {
  o: string[];
  c: number;
} {
  const seen = new Set<string>([correct]);
  const distractors: string[] = [];
  for (const cand of candidates) {
    if (!seen.has(cand)) {
      seen.add(cand);
      distractors.push(cand);
      if (distractors.length === 3) break;
    }
  }
  let bump = 1;
  while (distractors.length < 3) {
    const fallback = `${correct} + ${bump}`;
    if (!seen.has(fallback)) {
      seen.add(fallback);
      distractors.push(fallback);
    }
    bump++;
  }
  const c = ((seed % 4) + 4) % 4;
  const o = [...distractors];
  o.splice(c, 0, correct);
  return { o, c };
}

/**
 * Deterministic Milliy Sertifikat / fan Mock generator used when Owner selects
 * built-in bank mode or as a quick offline alternative without GEMINI_API_KEY.
 */
export function generateDeterministicMock(params: AiMockRequestParams): Question[] {
  const { mcCount, writtenCount } = clampMockCounts(
    params.mcCount,
    params.writtenCount
  );
  const subj = resolveMockSubject({ subject: params.subject, title: params.topic || '' });
  const seedBase = Date.now() % 997;
  const mcQuestions: Question[] = [];
  const wrQuestions: Question[] = [];

  for (let i = 0; i < mcCount; i++) {
    const k = i + 1;
    const v = ((seedBase + k * 7) % 11) + 2;
    const w = ((seedBase + k * 3) % 9) + 2;

    if (subj === 'Matematika' || subj === 'Boshqa fanlar') {
      const mode = i % 6;
      if (mode === 0) {
        const r1 = v;
        const r2 = v + w;
        const sum = r1 + r2;
        const prod = r1 * r2;
        const { o, c } = makeUniqueOptions(
          String(sum),
          [String(sum + 2), String(sum - 2), String(prod)],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `$x^{2} - ${sum}x + ${prod} = 0$ kvadrat tenglamaning ildizlari yig‘indisini toping.`,
          o,
          c,
          topic: 'Kvadrat tenglama',
          explanation: `Viyet teoremasiga ko‘ra $x_1 + x_2 = ${sum}$.`,
        });
      } else if (mode === 1) {
        const exp = (i % 4) + 2;
        const base = (v % 4) + 2;
        const val = Math.pow(base, exp);
        const ans = exp + 1;
        const { o, c } = makeUniqueOptions(
          String(ans),
          [String(ans - 1), String(ans + 1), String(exp * 2)],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `$\\log_{${base}}{(${val} \\cdot ${base})}$ ifodaning qiymatini hisoblang.`,
          o,
          c,
          topic: 'Logarifm',
          explanation: `$${val} \\cdot ${base} = ${base}^{${ans}}$, demak qiymati $${ans}$.`,
        });
      } else if (mode === 2) {
        const a1 = v;
        const d = w;
        const nTerm = 6 + (i % 5);
        const an = a1 + (nTerm - 1) * d;
        const { o, c } = makeUniqueOptions(
          String(an),
          [String(an + d), String(an - d), String(a1 + nTerm * d)],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `Arifmetik progressiyada $a_1 = ${a1}$ va $d = ${d}$ bo‘lsa, $a_{${nTerm}}$ hadini toping.`,
          o,
          c,
          topic: 'Progressiya',
          explanation: `$a_{${nTerm}} = ${a1} + (${nTerm}-1)\\cdot${d} = ${an}$.`,
        });
      } else if (mode === 3) {
        const leg1 = 3 * ((i % 3) + 1);
        const leg2 = 4 * ((i % 3) + 1);
        const hyp = 5 * ((i % 3) + 1);
        const { o, c } = makeUniqueOptions(
          String(hyp),
          [String(hyp + 2), String(leg1 + leg2), String(hyp - 1)],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `To‘g‘ri burchakli uchburchakning katetlari $${leg1}$ sm va $${leg2}$ sm bo‘lsa, gipotenuzasini (sm) toping.`,
          o,
          c,
          topic: 'Geometriya',
          explanation: `$c = \\sqrt{${leg1}^2 + ${leg2}^2} = ${hyp}$ sm.`,
        });
      } else if (mode === 4) {
        const coeff = v;
        const xVal = (i % 4) + 1;
        const ans = 2 * coeff * xVal;
        const { o, c } = makeUniqueOptions(
          String(ans),
          [String(ans + coeff), String(coeff * xVal), String(ans - 2)],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `$f(x) = ${coeff}x^{2} - 7$ funksiyaning $x_0 = ${xVal}$ nuqtadagi hosilasi $f'(${xVal})$ ni toping.`,
          o,
          c,
          topic: 'Hosila',
          explanation: `$f'(x) = ${2 * coeff}x$, demak $f'(${xVal}) = ${ans}$.`,
        });
      } else {
        const a = (i % 4) + 2;
        const ans = a * 2;
        const { o, c } = makeUniqueOptions(
          `$${ans}\\sqrt{2}$`,
          [`$${a}\\sqrt{2}$`, `$${ans + 2}\\sqrt{2}$`, `$${ans}$`],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `$\\sqrt{${a * a * 2}} + \\sqrt{${a * a * 2}}$ ifodani soddalashtiring.`,
          o,
          c,
          topic: 'Ildizlar',
          explanation: `$${a}\\sqrt{2} + ${a}\\sqrt{2} = ${ans}\\sqrt{2}$.`,
        });
      }
    } else if (subj === 'Fizika') {
      const m = ((i % 5) + 2) * 2;
      const a = (i % 4) + 3;
      const mode = i % 3;
      if (mode === 0) {
        const f = m * a;
        const { o, c } = makeUniqueOptions(
          `${f} N`,
          [`${f + m} N`, `${m + a} N`, `${f * 2} N`],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `Massasi $m = ${m}\\text{ kg}$ bo‘lgan jism $a = ${a}\\text{ m/s}^2$ tezlanish bilan harakatlanmoqda. Ta’sir etuvchi kuchni toping.`,
          o,
          c,
          topic: 'Dinamika',
          explanation: `$F = m \\cdot a = ${m} \\cdot ${a} = ${f}\\text{ N}$.`,
        });
      } else if (mode === 1) {
        const vel = (i % 5) + 4;
        const ek = (m * vel * vel) / 2;
        const { o, c } = makeUniqueOptions(
          `${ek} J`,
          [`${ek * 2} J`, `${m * vel} J`, `${ek + 10} J`],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `Massasi $m = ${m}\\text{ kg}$ jism $v = ${vel}\\text{ m/s}$ tezlik bilan harakatlansa, kinetik energiyasi $E_k$ ni hisoblang.`,
          o,
          c,
          topic: 'Energiya',
          explanation: `$E_k = \\dfrac{mv^2}{2} = ${ek}\\text{ J}$.`,
        });
      } else {
        const u = ((i % 4) + 2) * 12;
        const r = (i % 4) + 3;
        const cur = u / r;
        const { o, c } = makeUniqueOptions(
          `${cur} A`,
          [`${cur + 2} A`, `${u * r} A`, `${Math.max(1, cur - 2)} A`],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `Qarshiligi $R = ${r}\\,\\Omega$ bo‘lgan o‘tkazgich uchlaridagi kuchlanish $U = ${u}\\text{ V}$ bo‘lsa, tok kuchini toping.`,
          o,
          c,
          topic: 'Elektr toki',
          explanation: `Om qonuni: $I = \\dfrac{U}{R} = ${cur}\\text{ A}$.`,
        });
      }
    } else if (subj === 'Kimyo') {
      const mode = i % 3;
      if (mode === 0) {
        const moles = (i % 5) + 2;
        const mass = moles * 18;
        const { o, c } = makeUniqueOptions(
          `${mass} g`,
          [`${mass + 18} g`, `${moles * 16} g`, `${moles * 20} g`],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `$${moles}$ mol suv ($\\text{H}_2\\text{O}$) ning massasini (gramm) hisoblang ($M(\\text{H}_2\\text{O}) = 18\\text{ g/mol}$).`,
          o,
          c,
          topic: 'Molyar massa',
          explanation: `$m = n \\cdot M = ${moles} \\cdot 18 = ${mass}\\text{ g}$.`,
        });
      } else if (mode === 1) {
        const moles = (i % 4) + 1;
        const vol = (moles * 22.4).toFixed(1);
        const { o, c } = makeUniqueOptions(
          `${vol} L`,
          [`${(moles * 11.2).toFixed(1)} L`, `${((moles + 1) * 22.4).toFixed(1)} L`, `${(moles * 24).toFixed(1)} L`],
          i
        );
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: `Normal sharoitda $${moles}$ mol gazning hajmi qanchaga teng ($V_m = 22.4\\text{ L/mol}$)?`,
          o,
          c,
          topic: 'Gazlar qonuni',
          explanation: `$V = n \\cdot V_m = ${vol}\\text{ L}$.`,
        });
      } else {
        const items: [string, string, string[]][] = [
          ['$\\text{H}_2\\text{SO}_4$ tarkibidagi oltingugurtning oksidlanish darajasi nechaga teng?', '+6', ['+4', '-2', '+2']],
          ['$\\text{CaCO}_3$ birikmasining molyar massasi nechaga teng ($\\text{Ca}=40, \\text{C}=12, \\text{O}=16$)?', '100 g/mol', ['84 g/mol', '68 g/mol', '116 g/mol']],
          ['Necha grammli $\\text{NaOH}$ eritmasida 10% li 200 g eritmada erigan modda bor?', '20 g', ['10 g', '40 g', '25 g']],
        ];
        const pick = items[i % items.length];
        const { o, c } = makeUniqueOptions(pick[1], pick[2], i);
        mcQuestions.push({
          n: String(k),
          k: 'mc',
          s: pick[0],
          o,
          c,
          topic: 'Umumiy kimyo',
          explanation: `To‘g‘ri javob: ${pick[1]}.`,
        });
      }
    } else {
      const banks: Record<string, [string, string, string[]][]> = {
        Biologiya: [
          ['Hujayraning energiya stansiyasi deb ataladigan organoid qaysi?', 'Mitoxondriya', ['Ribosoma', 'Golji majmuasi', 'Lizosoma']],
          ['DNK molekulasida adenin (A) nukleotidiga komplementar asos qaysi?', 'Timin (T)', ['Guanin (G)', 'Sitozin (S)', 'Uratsil (U)']],
          ['Fotosintez jarayoni o‘simlik hujayrasining qaysi qismida boradi?', 'Xloroplastda', ['Vakuolada', 'Yadrochada', 'Sentriolada']],
        ],
        'Ona tili va adabiyot': [
          ['"Xamsa" dostonlar majmuasining muallifi kim?', 'Alisher Navoiy', ['Zahiriddin Muhammad Bobur', 'Lutfiy', 'Mashrab']],
          ['Gapning bosh bo‘laklari qaysilar?', 'Ega va kesim', ['Aniqlovchi va to‘ldiruvchi', 'Hol va ega', 'Undalma va kirish']],
          ['"O‘tkan kunlar" romanining muallifi kim?', 'Abdulla Qodiriy', ['Cho‘lpon', 'Fitrat', 'Oybek']],
        ],
        Tarix: [
          ['Amir Temur davlati poytaxti qaysi shahar bo‘lgan?', 'Samarqand', ['Buxoro', 'Xiva', 'Toshkent']],
          ['O‘zbekiston Respublikasi Konstitutsiyasi qachon qabul qilingan?', '1992-yil 8-dekabr', ['1991-yil 31-avgust', '1992-yil 2-iyul', '1993-yil 1-may']],
          ['Mirzo Ulug‘bek observatoriyasi qayerda barpo etilgan?', 'Samarqandda', ['Shahrisabzda', 'Hirotda', 'Marvda']],
        ],
        'Ingliz tili': [
          ['Choose the correct form: "She ___ to school every day."', 'goes', ['go', 'going', 'gone']],
          ['Choose the synonym of "essential":', 'necessary', ['optional', 'fragile', 'minor']],
          ['Complete: "If it rains tomorrow, we ___ at home."', 'will stay', ['stayed', 'staying', 'would stayed']],
        ],
        Informatika: [
          ['Ikkilik sanoq sistemasidagi `1010` soni o‘nlikda nechaga teng?', '10', ['8', '12', '14']],
          ['1 kilobayt (KB) necha baytga teng?', '1024 bayt', ['1000 bayt', '512 bayt', '2048 bayt']],
          ['HTML sahifada eng katta sarlavha tegi qaysi?', '<h1>', ['<h6>', '<title>', '<head>']],
        ],
        Geografiya: [
          ['Yer yuzidagi eng chuqur botiq qaysi okeanda joylashgan?', 'Tinch okeanida (Mariana)', ['Atlantika okeanida', 'Hind okeanida', 'Shimoliy Muz okeanida']],
          ['O‘zbekiston hududidan oqib o‘tuvchi eng uzun daryo qaysi?', 'Sirdaryo', ['Zarafshon', 'Chirchiq', 'Surxondaryo']],
          ['Atmosferaning yerga eng yaqin qatlami qaysi?', 'Troposfera', ['Stratosfera', 'Mezosfera', 'Termosfera']],
        ],
        Huquq: [
          ['O‘zbekiston Respublikasida oliy yuridik kuchga ega hujjat qaysi?', 'Konstitutsiya', ['Vazirlar Mahkamasi qarori', 'Hokim farmoyishi', 'Idoraviy nizom']],
          ['O‘zbekiston Respublikasi fuqarolari necha yoshdan saylov huquqiga ega bo‘ladi?', '18 yoshdan', ['16 yoshdan', '21 yoshdan', '25 yoshdan']],
          ['Mehnat shartnomasi asosiy taraflari kimlar?', 'Xodim va ish beruvchi', ['Sudya va prokuror', 'Soliqchi va tadbirkor', 'Ijarachi va mulkdor']],
        ],
      };
      const pool = banks[subj] || banks.Informatika;
      const pick = pool[i % pool.length];
      const { o, c } = makeUniqueOptions(pick[1], pick[2], i);
      mcQuestions.push({
        n: String(k),
        k: 'mc',
        s: `${k}-savol (${subj}): ${pick[0]}`,
        o,
        c,
        topic: params.topic?.trim() || subj,
        explanation: `To‘g‘ri javob: ${pick[1]}.`,
      });
    }
  }

  for (let j = 0; j < writtenCount; j++) {
    const qNum = 36 + Math.floor(j / 2);
    const part = j % 2 === 0 ? 'a' : 'b';
    const x = ((seedBase + j * 5) % 8) + 2;
    const ans = x * x;
    wrQuestions.push({
      n: `${qNum}${part}`,
      k: 'w',
      s:
        subj === 'Fizika'
          ? `Jism $v = ${x}\\text{ m/s}$ o‘zgarmas tezlik bilan $t = ${x}\\text{ s}$ da necha metr yo‘l bosadi? (Faqat sonni kiriting)`
          : subj === 'Kimyo'
            ? `$${x}$ mol metan ($\\text{CH}_4$, $M = 16\\text{ g/mol}$) ning massasi necha gramm? (Faqat sonni kiriting)`
            : `$\\sqrt{x} = ${x}$ tenglamaning ildizi $x$ ni toping.`,
      o: [],
      a: subj === 'Kimyo' ? String(x * 16) : String(ans),
      topic: params.topic?.trim() || `${subj} (yozma)`,
      explanation: `Javob: ${subj === 'Kimyo' ? x * 16 : ans}.`,
    });
  }

  return [...mcQuestions, ...wrQuestions];
}
