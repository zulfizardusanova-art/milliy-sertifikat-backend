import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttestationPrompt,
  buildMockTestPrompt,
  canUseAiGenerator,
  clampMockCounts,
  extractJsonArrayFromText,
  generateDeterministicMock,
  normalizeAiAttestationQuestions,
  normalizeAiMockQuestions,
  resolveMockSubject,
  summarizeMockSubjects,
} from './aiTestGen';
import type { TestItem } from '../types';

test('canUseAiGenerator allows strictly owner role only', () => {
  assert.equal(canUseAiGenerator('owner'), true);
  assert.equal(canUseAiGenerator('admin'), false);
  assert.equal(canUseAiGenerator('user'), false);
  assert.equal(canUseAiGenerator(null), false);
  assert.equal(canUseAiGenerator(undefined), false);
});

test('clampMockCounts bounds MC (1..35) and written (0..10)', () => {
  assert.deepEqual(clampMockCounts(100, 25), { mcCount: 35, writtenCount: 10 });
  assert.deepEqual(clampMockCounts(0, -3), { mcCount: 10, writtenCount: 0 });
  assert.deepEqual(clampMockCounts(15, 4), { mcCount: 15, writtenCount: 4 });
});

test('buildMockTestPrompt includes subject, difficulty, KaTeX rule, and counts', () => {
  const prompt = buildMockTestPrompt({
    subject: 'Matematika',
    topic: 'Logarifmik tenglamalar',
    difficulty: 'hard',
    mcCount: 20,
    writtenCount: 4,
    promptNote: 'Har bir savolda yechim izohi bo‘lsin',
  });
  assert.match(prompt, /Matematika/);
  assert.match(prompt, /Logarifmik tenglamalar/);
  assert.match(prompt, /20 ta yopiq test savoli/);
  assert.match(prompt, /4 ta ochiq\/yozma savol/);
  assert.match(prompt, /KaTeX/);
  assert.match(prompt, /Owner qo‘shimcha ko‘rsatmasi/);
});

test('buildAttestationPrompt includes targetGrade and count', () => {
  const prompt = buildAttestationPrompt({
    subject: 'Fizika',
    targetGrade: 'Oliy va 1-toifa',
    count: 50,
  });
  assert.match(prompt, /Fizika/);
  assert.match(prompt, /50 ta sifatli test savolini/);
  assert.match(prompt, /Oliy va 1-toifa/);
});

test('normalizeAiMockQuestions assigns 1..N for MC and 36a/36b slots for written', () => {
  const normalized = normalizeAiMockQuestions(
    [
      {
        k: 'mc',
        s: '$2x + 4 = 10$ tenglamani yeching.',
        o: ['A. 1', 'B) 3', 'C. 4', 'D. 5'],
        c: 1,
        topic: 'Chiziqli tenglama',
        explanation: '$2x = 6 \\Rightarrow x = 3$',
      },
      {
        k: 'mc',
        s: 'Buzilgan savol',
        o: ['Faqat bitta'],
        c: 0,
      },
      {
        k: 'w',
        s: '$\\sqrt{144}$ ning qiymatini toping.',
        o: [],
        a: '12',
        topic: 'Ildizlar',
      },
      {
        k: 'w',
        s: '$3^2 + 4^2$ ni hisoblang.',
        o: [],
        a: '25',
      },
    ],
    5,
    2
  );

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].n, '1');
  assert.equal(normalized[0].k, 'mc');
  assert.deepEqual(normalized[0].o, ['1', '3', '4', '5']);
  assert.equal(normalized[0].c, 1);

  assert.equal(normalized[1].n, '36a');
  assert.equal(normalized[1].k, 'w');
  assert.equal(normalized[1].a, '12');

  assert.equal(normalized[2].n, '36b');
  assert.equal(normalized[2].k, 'w');
  assert.equal(normalized[2].a, '25');
});

test('normalizeAiAttestationQuestions normalizes MC options and bounds answer index', () => {
  const qs = normalizeAiAttestationQuestions(
    [
      {
        s: 'Blum taksonomiyasi savoli',
        o: ['A. Bilish', 'B. Qo‘llash', 'C. Tahlil', 'D. Baholash'],
        c: 99,
        topic: 'Pedagogika',
      },
    ],
    50
  );
  assert.equal(qs.length, 1);
  assert.equal(qs[0].n, '1');
  assert.equal(qs[0].c, 0);
  assert.deepEqual(qs[0].o, ['Bilish', 'Qo‘llash', 'Tahlil', 'Baholash']);
});

test('resolveMockSubject honors explicit subject and falls back to title keywords', () => {
  assert.equal(resolveMockSubject({ subject: 'kimyo', title: 'Test 1' }), 'Kimyo');
  assert.equal(
    resolveMockSubject({ subject: undefined, title: '1-mock: Fizika mexanika' }),
    'Fizika'
  );
  assert.equal(
    resolveMockSubject({ subject: undefined, title: '145-mock Milliy sertifikat' }),
    'Matematika'
  );
  assert.equal(
    resolveMockSubject({ subject: '', title: 'Umumiy test to‘plami' }),
    'Boshqa fanlar'
  );
});

test('summarizeMockSubjects counts tests across all subjects and includes custom subjects', () => {
  const sampleTests = [
    { id: 't1', title: '1-mock Matematika', category: 'mock', subject: 'Matematika' },
    { id: 't2', title: 'Organik kimyo', category: 'mock', subject: 'Kimyo' },
    { id: 't3', title: '2-mock Matematika', category: 'mock' },
    { id: 't4', title: 'Astronomiya maxsus', category: 'mock', subject: 'Astronomiya' },
  ] as TestItem[];

  const summary = summarizeMockSubjects(sampleTests);
  assert.equal(summary.counts['Matematika'], 2);
  assert.equal(summary.counts['Kimyo'], 1);
  assert.equal(summary.counts['Astronomiya'], 1);
  assert.ok(summary.subjects.includes('Fizika'));
  assert.ok(summary.subjects.includes('Astronomiya'));
});

test('extractJsonArrayFromText parses fenced, wrapped, and truncated JSON arrays cleanly', () => {
  const fenced = '```json\n[{"s":"Q1","o":["1","2","3","4"],"c":"B"}]\n```';
  const r1 = extractJsonArrayFromText(fenced);
  assert.equal(r1.length, 1);
  assert.equal(r1[0].c, 'B');

  const wrapped = '{"questions":[{"s":"Q2","o":{"A":"x","B":"y","C":"z","D":"w"},"c":"D"}]}';
  const r2 = extractJsonArrayFromText(wrapped);
  assert.equal(r2.length, 1);
  const norm = normalizeAiMockQuestions(r2, 5, 0);
  assert.equal(norm.length, 1);
  assert.equal(norm[0].c, 3);
  assert.deepEqual(norm[0].o, ['x', 'y', 'z', 'w']);

  const truncated =
    '[{"s":"Valid 1","o":["a","b","c","d"],"c":0},{"s":"Valid 2","o":["1","2","3","4"],"c":2},{"s":"Broken';
  const r3 = extractJsonArrayFromText(truncated);
  assert.equal(r3.length, 2);
});

test('generateDeterministicMock creates exact MC + written counts with KaTeX across subjects', () => {
  const mathFull = generateDeterministicMock({
    subject: 'Matematika',
    mcCount: 35,
    writtenCount: 10,
  });
  assert.equal(mathFull.length, 45);
  assert.equal(mathFull[0].n, '1');
  assert.equal(mathFull[34].n, '35');
  assert.equal(mathFull[35].n, '36a');
  assert.equal(mathFull[35].k, 'w');
  assert.equal(mathFull[44].n, '40b');

  const chem = generateDeterministicMock({
    subject: 'Kimyo',
    mcCount: 12,
    writtenCount: 2,
  });
  assert.equal(chem.length, 14);
  assert.ok(chem.every((q) => q.s.length > 0 && (q.k === 'w' ? Boolean(q.a) : q.o.length === 4)));
});
