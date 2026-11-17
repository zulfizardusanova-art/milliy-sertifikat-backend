import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  extractAnswerKeyBlock,
  parseKeyTextOnly,
  parseQuestionsFromText,
  reconstructPageLines,
  stripRepeatingHeadersFooters,
  type ParsedPdfResult,
  type PdfGlyphItem,
} from './pdfParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractPdfPagesLines(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: string[][] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: PdfGlyphItem[] = [];

    for (const raw of content.items) {
      const it = raw as {
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
      };
      if (!it.str || !it.transform) continue;
      const height =
        it.height && it.height > 0
          ? it.height
          : Math.hypot(it.transform[2], it.transform[3]) ||
            Math.hypot(it.transform[0], it.transform[1]) ||
            12;
      items.push({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width || 0,
        height,
      });
    }

    pages.push(reconstructPageLines(items));
  }

  return pages;
}

export async function importPdfToQuestions(
  questionsPdf: File,
  keysPdf?: File | null,
  manualKeysText = ''
): Promise<ParsedPdfResult> {
  const pages = await extractPdfPagesLines(questionsPdf);
  const { lines, removedCount } = stripRepeatingHeadersFooters(pages);
  const combinedText = lines.join('\n');

  const { body, key: embeddedKey } = extractAnswerKeyBlock(combinedText);
  let mergedKey: Record<number, number> = { ...embeddedKey };

  if (keysPdf) {
    const keyPages = await extractPdfPagesLines(keysPdf);
    const keyText = keyPages.flat().join('\n');
    mergedKey = { ...mergedKey, ...parseKeyTextOnly(keyText) };
  }

  if (manualKeysText.trim()) {
    mergedKey = { ...mergedKey, ...parseKeyTextOnly(manualKeysText) };
  }

  return parseQuestionsFromText(body, mergedKey, removedCount);
}
