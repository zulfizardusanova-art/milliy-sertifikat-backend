export interface PdfGlyphItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedPdfResult {
  questions: Record<string, { s: string; o: string[]; c: number; a: string }>;
  keys: Record<number, number>;
  parsedCount: number;
  keyCount: number;
  badOptions: number[];
  strippedWatermarks: number;
  rawText: string;
}

const PROMO_WATERMARK_RE = [
  /telegram\s*kanal/i,
  /t\.me\/[a-z0-9_]+/i,
  /@[a-z0-9_]{4,}/i,
  /\+?998[\s\-()]?\d{2}[\s\-()]?\d{3}[\s\-()]?\d{2}[\s\-()]?\d{2}/,
  /milliy\s+sertifikat\s+mock\s+test\s+savollari/i,
  /barcha\s+huquqlar\s+himoyalangan/i,
  /obuna\s+bo['‘’]?ling/i,
  /kanalimiz\s*:/i,
  /^\s*[-–—]?\s*\d{1,3}\s*[-–—]?\s*$/,
  /^\s*(?:sahifa|bet|page|стр\.?)\s*\d+\s*$/i,
];

/**
 * Fixes Uzbek apostrophes and broken word spacing from PDF font runs:
 * e.g., `ko'r inishidagi` -> `ko‘rinishidagi`, `ma ' lum` -> `ma‘lum`,
 * `0 , ( 23 )` -> `0,(23)`, `o ' tgach` -> `o‘tgach`.
 */
export function cleanUzbekSpacing(text: string): string {
  let out = text
    // Normalize apostrophe variants
    .replace(/\s*([‘’'ʻ`])\s*/g, '$1')
    // Rejoin `o'` / `g'` that got separated from the following letter
    .replace(/\b([ogOG])(['‘’ʻ])(?:\s+)([a-zA-Z])/g, '$1‘$3')
    // Fix split common Uzbek digraph/suffix fragments caused by PDF kerning (`ko'r inishidagi`)
    .replace(/([ogOG]['‘’ʻ]r)\s+(inish[a-z]*)/gi, '$1$2')
    .replace(/\b(ma['‘’ʻ])\s+(lum)/gi, '$1$2')
    .replace(/\b(o['‘’ʻ])\s+(suvchi|quvchi|tish|tgach|zgarmas)/gi, '$1$2')
    // Remove space before punctuation
    .replace(/\s+([.,;:!?])/g, '$1')
    // Periodic decimals: `0, (23)` or `0 , ( 23 )` -> `0,(23)`
    .replace(/(\d)\s*,\s*\(\s*(\d+)\s*\)/g, '$1,($2)')
    .replace(/(\d)\s*,\s*(\d+)\s*\(\s*(\d+)\s*\)/g, '$1,$2($3)')
    // Clean spaces inside parentheses
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    // Collapse multiple spaces
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // Convert standard Uzbek o'/g' apostrophes and clean tutuq belgisi
  out = out.replace(/([ogOG])['ʻ`]/g, '$1‘').replace(/([a-zA-Z])['ʻ`]([a-zA-Z])/g, '$1’$2');
  return out;
}

/**
 * Strips inline promotional watermarks & Telegram/phone footers that leak into
 * the last option or question on a PDF page.
 */
export function stripInlineWatermark(line: string): string {
  let cleaned = line;
  // Remove trailing "Telegram kanalimiz: ..." or "@channel +998..." suffixes
  cleaned = cleaned.replace(
    /\s*(?:Telegram\s+kanalimiz\s*:|Kanalimiz\s*:|Manba\s*:|@[\w.]+|\+?998\s*\d{2}[\s\d-]{7,}|MILLIY\s+SERTIFIKAT\s+MOCK\s+TEST\s+SAVOLLARI).*$/i,
    ''
  );
  // Remove standalone @handles or URLs
  cleaned = cleaned.replace(/\s*https?:\/\/\S+/gi, '');
  return cleaned.trim();
}

export function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return PROMO_WATERMARK_RE.some((re) => re.test(trimmed));
}

/**
 * Reconstructs lines from geometric PDF items, preserving math superscripts/subscripts
 * and preventing bogus intra-word spaces (e.g. `ko'r inishidagi`, `b 1`).
 */
export function reconstructPageLines(items: PdfGlyphItem[]): string[] {
  if (items.length === 0) return [];

  // Group into horizontal bands by Y coordinate (PDF Y increases upward)
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const bands: PdfGlyphItem[][] = [];

  for (const item of sorted) {
    if (!item.str) continue;
    const h = Math.max(6, item.height || 12);
    const lastBand = bands[bands.length - 1];
    if (!lastBand) {
      bands.push([item]);
      continue;
    }
    const normalItems = lastBand.filter((it) => (it.height || 12) >= 10);
    const refItems = normalItems.length > 0 ? normalItems : lastBand;
    const baseY = refItems.reduce((acc, it) => acc + it.y, 0) / refItems.length;
    const baseH = Math.max(6, refItems[0].height || 12);
    if (Math.abs(item.y - baseY) <= Math.max(baseH, h) * 0.55) {
      lastBand.push(item);
    } else {
      bands.push([item]);
    }
  }

  const lines: string[] = [];

  for (const band of bands) {
    band.sort((a, b) => a.x - b.x);
    // Determine dominant baseline y and height
    const heights = band.map((it) => it.height || 12).sort((a, b) => a - b);
    const baseH = heights[Math.floor(heights.length * 0.6)] || 12;
    const ys = band
      .filter((it) => (it.height || 12) >= baseH * 0.8)
      .map((it) => it.y);
    const baseY =
      ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : band[0].y;

    let line = '';
    let prevEnd = -Infinity;

    for (let idx = 0; idx < band.length; idx++) {
      const it = band[idx];
      const text = it.str;
      if (!text) continue;
      const h = it.height || baseH;
      const gap = prevEnd === -Infinity ? 0 : it.x - prevEnd;

      // Detect superscript / subscript by vertical shift + smaller font
      const dy = it.y - baseY;
      const isSmall = h <= baseH * 0.84;
      const isSup = (isSmall && dy >= baseH * 0.2) || dy >= baseH * 0.34;
      const isSub = (isSmall && dy <= -baseH * 0.14) || dy <= -baseH * 0.25;

      const trimmed = text.trim();
      const prevChar = line.slice(-1);
      const nextChar = trimmed[0] || '';

      if (isSup && trimmed && /^[0-9a-zA-Z+\-−nmk]+$/.test(trimmed) && /[a-zA-Z0-9)\]]/.test(prevChar)) {
        line += `^{${trimmed}}`;
      } else if (isSub && trimmed && /^[0-9a-zA-Z+\-nmk]+$/.test(trimmed) && /[a-zA-Z)]/.test(prevChar)) {
        line += `_{${trimmed}}`;
      } else {
        // Decide whether a space is truly needed
        const needsSpace =
          line.length > 0 &&
          gap > baseH * 0.2 &&
          !/[‘’'ʻ`(√]$/.test(prevChar) &&
          !/^[.,;:!?)\]‘’'ʻ`]/.test(nextChar);

        if (needsSpace && !/\s$/.test(line)) {
          line += ' ';
        }
        line += text;
      }

      prevEnd = Math.max(prevEnd, it.x + (it.width || text.length * baseH * 0.45));
    }

    const cleaned = stripInlineWatermark(cleanUzbekSpacing(line));
    if (cleaned && !isNoiseLine(cleaned)) {
      lines.push(cleaned);
    }
  }

  return lines;
}

/**
 * Removes lines that repeat verbatim at top/bottom across multiple pages (headers/footers).
 */
export function stripRepeatingHeadersFooters(pages: string[][]): {
  lines: string[];
  removedCount: number;
} {
  const freq = new Map<string, number>();
  for (const page of pages) {
    const seenOnPage = new Set<string>();
    const edgeLines = [
      ...page.slice(0, 2),
      ...page.slice(Math.max(0, page.length - 3)),
    ];
    for (const ln of edgeLines) {
      const norm = ln.toLowerCase().trim();
      if (norm.length >= 6 && !seenOnPage.has(norm)) {
        seenOnPage.add(norm);
        freq.set(norm, (freq.get(norm) || 0) + 1);
      }
    }
  }

  let removedCount = 0;
  const out: string[] = [];

  for (const page of pages) {
    for (const ln of page) {
      const norm = ln.toLowerCase().trim();
      if (pages.length >= 2 && (freq.get(norm) || 0) >= 2) {
        removedCount++;
        continue;
      }
      if (isNoiseLine(ln)) {
        removedCount++;
        continue;
      }
      out.push(ln);
    }
  }

  return { lines: out, removedCount };
}

/**
 * Enhances math readability by wrapping superscript/subscript/root/fraction tokens
 * into KaTeX `$...$` blocks if not already wrapped.
 */
export function formatMathExpressions(text: string): string {
  if (!text) return '';
  // Already contains $...$ LaTeX
  if (/\$[^$]+\$/.test(text)) return text;

  let res = text;
  // Convert `b 1`, `a 14` (single variable followed by small index in math contexts like `;`, `+`, `=`)
  res = res.replace(/\b([a-zA-Z])\s+(\d{1,2})(?=\s*[;,+\-=<>])/g, '$1_{$2}');
  // Convert `√ 3` -> `√3`
  res = res.replace(/√\s+([0-9a-zA-Z(])/g, '√$1');

  // If line has explicit ^{...} or _{...} tokens, wrap individual math expressions cleanly
  res = res.replace(
    /([a-zA-Z0-9]+(?:\^\{[^}]+\}|_\{[^}]+\})+)/g,
    (m) => `$${m}$`
  );
  // Collapse adjacent `$a$$b$` or `$x^{2}$ + $x$` safely
  res = res.replace(/\$\s*\$/g, '');
  return res;
}

const KEY_RE =
  /(?:^|[ \t,;(])(\d{1,2})[ \t]*[-.:)][ \t]*([A-Da-d])(?=[ \t,;.\n]|$)/g;

export function extractAnswerKeyBlock(txt: string): {
  body: string;
  key: Record<number, number>;
} {
  // Prefer explicit answer-key header section if present
  const headerMatch = /(?:javoblar(?:\s+kaliti)?|kalitlar?|ответы|answers?)\s*[:\-]?\s*/i.exec(txt);
  const searchOffset = headerMatch ? headerMatch.index : 0;
  const searchSlice = txt.slice(searchOffset);

  const ms = [...searchSlice.matchAll(KEY_RE)];
  let best: RegExpMatchArray[] = [];
  ms.forEach((m, i) => {
    if (Number(m[1]) !== 1) return;
    const chain = [m];
    let want = 2;
    for (let j = i + 1; j < ms.length; j++) {
      if (Number(ms[j][1]) === want) {
        chain.push(ms[j]);
        want++;
      }
    }
    if (chain.length > best.length) best = chain;
  });

  if (best.length < 4) return { body: txt, key: {} };
  const key: Record<number, number> = {};
  best.forEach((m) => {
    key[Number(m[1])] = 'ABCD'.indexOf(m[2].toUpperCase());
  });
  const cut = searchOffset + (best[0].index ?? searchSlice.length);
  const bodyEnd = headerMatch ? Math.min(cut, headerMatch.index) : cut;
  return {
    body: bodyEnd > txt.length * 0.25 ? txt.slice(0, bodyEnd) : txt,
    key,
  };
}

export function parseKeyTextOnly(txt: string): Record<number, number> {
  const key: Record<number, number> = {};
  for (const m of txt.matchAll(KEY_RE)) {
    const qNum = Number(m[1]);
    if (key[qNum] === undefined) {
      key[qNum] = 'ABCD'.indexOf(m[2].toUpperCase());
    }
  }
  return key;
}

export function splitQuestionOptions(block: string): {
  s: string;
  o: string[];
} | null {
  const findSequence = (letters: string) => {
    const re = /(?:^|\s)([A-H])[.)]\s*/g;
    const idx: { i: number; e: number }[] = [];
    let m: RegExpExecArray | null;
    let want = 0;
    while ((m = re.exec(block)) !== null) {
      if (m[1] === letters[want]) {
        idx.push({ i: m.index, e: m.index + m[0].length });
        want++;
        if (want === 4) break;
      }
    }
    return idx.length === 4 ? idx : null;
  };

  // Prefer standard A-D; fall back to shifted 4-letter sequences (e.g. C-F, B-E) found in some PDFs
  const idx =
    findSequence('ABCD') ||
    findSequence('CDEF') ||
    findSequence('BCDE') ||
    findSequence('DEFG') ||
    findSequence('EFGH');

  if (!idx) return null;
  return {
    s: formatMathExpressions(cleanUzbekSpacing(block.slice(0, idx[0].i))),
    o: idx.map((x, j) =>
      formatMathExpressions(
        stripInlineWatermark(
          cleanUzbekSpacing(
            block.slice(x.e, j < 3 ? idx[j + 1].i : block.length)
          )
        )
      )
    ),
  };
}

export function parseQuestionsFromText(
  bodyText: string,
  key: Record<number, number>,
  strippedWatermarks = 0
): ParsedPdfResult {
  const normalized = bodyText.replace(/\r\n/g, '\n');
  const markers: [number, number, number][] = [];
  let pos = 0;

  for (let k = 1; k <= 50; k++) {
    const re = new RegExp(`(?:^|\\n)\\s*${k}\\s*[.)]\\s+`, 'g');
    re.lastIndex = pos;
    const r = re.exec(normalized);
    if (r) {
      markers.push([k, r.index, r.index + r[0].length]);
      pos = r.index + r[0].length;
    }
  }

  const rawMap: Record<number, string> = {};
  markers.forEach(([k, , end], i) => {
    const nextStart =
      i + 1 < markers.length ? markers[i + 1][1] : normalized.length;
    rawMap[k] = normalized
      .slice(end, nextStart)
      .replace(/\s*\n\s*/g, ' ')
      .trim();
  });

  const questions: Record<
    string,
    { s: string; o: string[]; c: number; a: string }
  > = {};
  const badOptions: number[] = [];
  let parsedCount = 0;

  for (let k = 1; k <= 35; k++) {
    const b = rawMap[k];
    if (!b) continue;
    const split = splitQuestionOptions(b);
    if (split) {
      questions[String(k)] = {
        s: split.s,
        o: split.o,
        c: key[k] !== undefined ? key[k] : -1,
        a: '',
      };
    } else {
      questions[String(k)] = {
        s: formatMathExpressions(stripInlineWatermark(cleanUzbekSpacing(b))),
        o: ['', '', '', ''],
        c: -1,
        a: '',
      };
      badOptions.push(k);
    }
    parsedCount++;
  }

  for (let k = 36; k <= 45; k++) {
    const b = rawMap[k];
    if (!b) continue;
    const parts = [...b.matchAll(/(?:^|\s)([ab])\)\s*/g)];
    if (!parts.length) {
      questions[`${k}a`] = {
        s: formatMathExpressions(stripInlineWatermark(cleanUzbekSpacing(b))),
        o: ['', '', '', ''],
        c: -1,
        a: '',
      };
      parsedCount++;
      continue;
    }
    const intro = b.slice(0, parts[0].index ?? 0).trim();
    parts.slice(0, 2).forEach((m, i) => {
      const start = (m.index ?? 0) + m[0].length;
      const end =
        i + 1 < parts.length ? (parts[i + 1].index ?? b.length) : b.length;
      const seg = b.slice(start, end).trim();
      const text = i === 0 && intro ? `${intro} ${seg}` : seg;
      questions[`${k}${m[1]}`] = {
        s: formatMathExpressions(stripInlineWatermark(cleanUzbekSpacing(text))),
        o: ['', '', '', ''],
        c: -1,
        a: '',
      };
      parsedCount++;
    });
  }

  return {
    questions,
    keys: key,
    parsedCount,
    keyCount: Object.keys(key).length,
    badOptions,
    strippedWatermarks,
    rawText: bodyText,
  };
}
