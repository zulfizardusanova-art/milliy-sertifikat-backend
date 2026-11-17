import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanUzbekSpacing,
  extractAnswerKeyBlock,
  parseQuestionsFromText,
  reconstructPageLines,
  stripInlineWatermark,
  stripRepeatingHeadersFooters,
} from './pdfParser';
import { checkWrittenAnswer } from './mathEval';
import { toNewUzbekLatin, trText } from './i18n';

test('PDF spacing cleanup fixes broken Uzbek words and periodic decimals', () => {
  assert.equal(cleanUzbekSpacing("ko'r inishidagi"), 'ko‘rinishidagi');
  assert.equal(cleanUzbekSpacing("ma ' lum vaqtda"), 'ma’lum vaqtda');
  assert.equal(cleanUzbekSpacing('a = 0 , ( 23 )'), 'a = 0,(23)');
  assert.equal(cleanUzbekSpacing("o ' suvchi arifmetik"), 'o‘suvchi arifmetik');
});

test('PDF watermark and footer lines are stripped from options and pages', () => {
  const dirtyOption =
    '√2 + √10 Telegram kanalimiz: @Rustambek_oqiw_orayi +99894 123 51 51 MILLIY SERTIFIKAT MOCK TEST SAVOLLARI';
  assert.equal(stripInlineWatermark(dirtyOption), '√2 + √10');

  const page1 = [
    'MILLIY SERTIFIKAT MOCK TEST',
    '1. Hisoblang. 2 + 2 = ?',
    'A. 3',
    'B. 4',
    'C. 5',
    'D. 6',
    'Telegram kanalimiz: @test_channel +99890 111 22 33',
  ];
  const page2 = [
    'MILLIY SERTIFIKAT MOCK TEST',
    '2. Toping. 3 * 3 = ?',
    'A. 6',
    'B. 9',
    'C. 12',
    'D. 15',
    '- 2 -',
  ];
  const { lines, removedCount } = stripRepeatingHeadersFooters([page1, page2]);
  assert.ok(removedCount >= 3);
  assert.equal(
    lines.some((l) => /Telegram|MILLIY SERTIFIKAT|- 2 -/i.test(l)),
    false
  );
});

test('Geometric line reconstruction detects superscripts and subscripts', () => {
  const lines = reconstructPageLines([
    { str: 'Agar ', x: 10, y: 500, width: 25, height: 12 },
    { str: 'x', x: 35, y: 500, width: 6, height: 12 },
    { str: '2', x: 41, y: 505, width: 4, height: 8 },
    { str: ' + b', x: 46, y: 500, width: 18, height: 12 },
    { str: '1', x: 64, y: 497, width: 4, height: 8 },
  ]);
  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes('x^{2}'));
  assert.ok(lines[0].includes('b_{1}'));
});

test('Full PDF question + key extraction strips footers cleanly', () => {
  const text = `
1. Hisoblang: √3 + √5
A. 2√2
B. 12
C. 2 + √10
D. √2 + √10 Telegram kanalimiz: @Rustambek_oqiw_orayi +99894 123 51 51
2. Tenglamani yeching: x + 2 = 5
A. 1
B. 2
C. 3
D. 4
Javoblar: 1.D 2.C 3.A 4.B
`;
  const { body, key } = extractAnswerKeyBlock(text);
  const parsed = parseQuestionsFromText(body, key);
  assert.equal(parsed.parsedCount, 2);
  assert.equal(parsed.questions['1'].o[3], '√2 + √10');
  assert.equal(parsed.questions['1'].c, 3);
  assert.equal(parsed.questions['2'].c, 2);
});

test('Math answer equivalence handles roots and fractions', () => {
  assert.equal(checkWrittenAnswer('0.5', '1/2'), 1);
  assert.equal(checkWrittenAnswer('sqrt(2)/2', '√2/2'), 1);
  assert.equal(checkWrittenAnswer('[1; 5)', '[1, 5)'), 1);
  assert.equal(checkWrittenAnswer('3', '4'), 0);
});

test('New Uzbek script converts sh -> ş and ch -> ç', () => {
  assert.equal(toNewUzbekLatin('Bosh sahifa'), 'Boş sahifa');
  assert.equal(toNewUzbekLatin('Chiqish'), 'Çiqiş');
  assert.equal(toNewUzbekLatin('Shuhrat'), 'Şuhrat');
  assert.equal(trText('Testni boshlash', 'uz_new'), 'Testni boşlaş');
});

test('Shifted 4-letter PDF options like C) D) E) F) split cleanly into 4 options', () => {
  const text = `
35. Idishga eng kamida nechta shar tushirilganda suv toshib chiqadi? C) 24 D) 2 E) 7 F) 4
`;
  const parsed = parseQuestionsFromText(text, {});
  assert.equal(parsed.parsedCount, 1);
  assert.equal(parsed.badOptions.length, 0);
  assert.deepEqual(parsed.questions['35'].o, ['24', '2', '7', '4']);
});
