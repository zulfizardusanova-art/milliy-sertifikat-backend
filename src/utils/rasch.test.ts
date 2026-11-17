import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UZ_LEVELS,
  attestationCategory,
  computeItemDifficulties,
  computeTestRaschRankings,
  levelNameOf,
  raschGrade,
} from './rasch';
import type { Attempt, TestItem, UserProfile } from '../types';
import {
  ATTESTATION_SUBJECTS,
  generateDeterministicAttestation,
} from './attestationBank';

test('Uzbek level names contain zero English rank labels', () => {
  const names = UZ_LEVELS.map((l) => l[0]);
  assert.equal(names.includes('Noob'), false);
  assert.equal(names.includes('Beginner'), false);
  assert.equal(levelNameOf({ role: 'user' }, 0), 'Yangi boshlovchi');
  assert.equal(levelNameOf({ role: 'user' }, 40), 'Havaskor');
  assert.equal(levelNameOf({ role: 'owner' }, 0), 'Boshqaruvchi');
});

test('Centered Rasch model rewards harder questions over easier ones on the same test', () => {
  const testItem: TestItem = {
    id: 't1',
    title: '1-mock',
    category: 'mock',
    at: 1000,
    end: 0,
    isLifetime: true,
    dur: 60,
    isUnlimitedTime: false,
    price: 0,
    by: 'u1',
    q: [
      { n: '1', k: 'mc', s: 'Q1 (Easy)', o: ['1', '2', '3', '4'], c: 0 },
      { n: '2', k: 'mc', s: 'Q2 (Easy)', o: ['1', '2', '3', '4'], c: 0 },
      { n: '3', k: 'mc', s: 'Q3 (Medium)', o: ['1', '2', '3', '4'], c: 0 },
      { n: '4', k: 'mc', s: 'Q4 (Hard)', o: ['1', '2', '3', '4'], c: 0 },
    ],
  };

  const users: UserProfile[] = [
    { id: 'u1', nm: 'Ali', lg: 'ali', role: 'user', prem: 0 },
    { id: 'u2', nm: 'Vali', lg: 'vali', role: 'user', prem: 0 },
    { id: 'u3', nm: 'Soli', lg: 'soli', role: 'user', prem: 0 },
    { id: 'u4', nm: 'Gani', lg: 'gani', role: 'user', prem: 0 },
  ];

  // Q1 & Q2 solved by almost everyone; Q4 solved only by u1 and u4
  const attempts: Attempt[] = [
    { id: 'a1', uid: 'u1', tid: 't1', ok: [1, 1, 1, 1], t: 100, at: 2000 }, // 4/4 -> 75
    { id: 'a2', uid: 'u2', tid: 't1', ok: [1, 1, 0, 0], t: 100, at: 2000 }, // 2/4 easy
    { id: 'a3', uid: 'u3', tid: 't1', ok: [1, 0, 0, 0], t: 100, at: 2000 }, // 1/4 easy
    { id: 'a4', uid: 'u4', tid: 't1', ok: [0, 0, 1, 1], t: 100, at: 2000 }, // 2/4 HARD!
  ];

  const { entries, items } = computeTestRaschRankings(testItem, attempts, users);
  // Q4 has higher difficulty than Q1
  assert.ok(items[3].difficultyB > items[0].difficultyB);
  // Centered difficulties sum to ~0
  const sumB = items.reduce((acc, it) => acc + it.difficultyB, 0);
  assert.ok(Math.abs(sumB) < 0.01);

  const u1 = entries.find((e) => e.uid === 'u1')!;
  const u4 = entries.find((e) => e.uid === 'u4')!;
  const u2 = entries.find((e) => e.uid === 'u2')!;
  assert.equal(u1.raschScore, 75);
  assert.equal(u1.grade, 'A+');
  // u4 (2 hard items) must score higher than u2 (2 easy items)
  assert.ok(u4.theta > u2.theta);
  assert.ok(u4.raschScore >= u2.raschScore);
});

test('Per-test Rasch ranking isolates tests from each other', () => {
  const t1: TestItem = {
    id: 't1',
    title: 'Test 1',
    category: 'mock',
    at: 1000,
    end: 0,
    isLifetime: true,
    dur: 60,
    isUnlimitedTime: false,
    price: 0,
    by: 'u1',
    q: [
      { n: '1', k: 'mc', s: 'Q1', o: ['a', 'b', 'c', 'd'], c: 0 },
      { n: '2', k: 'mc', s: 'Q2', o: ['a', 'b', 'c', 'd'], c: 0 },
    ],
  };

  const users: UserProfile[] = [
    { id: 'u1', nm: 'A', lg: 'a', role: 'user', prem: 0 },
    { id: 'u2', nm: 'B', lg: 'b', role: 'user', prem: 0 },
  ];

  const attempts: Attempt[] = [
    { id: '1', uid: 'u1', tid: 't1', ok: [1, 1], t: 100, at: 1 },
    { id: '2', uid: 'u2', tid: 't2', ok: [1, 1], t: 50, at: 1 }, // belongs to t2!
  ];

  const res = computeTestRaschRankings(t1, attempts, users);
  assert.equal(res.entries.length, 1);
  assert.equal(res.entries[0].uid, 'u1');
});

test('Attestation categories and Rasch grades map accurately', () => {
  assert.equal(attestationCategory(85), 'Oliy toifa');
  assert.equal(attestationCategory(74), 'Birinchi toifa');
  assert.equal(attestationCategory(62), 'Ikkinchi toifa');
  assert.equal(attestationCategory(57), 'Mutaxassis');
  assert.equal(attestationCategory(54), 'O‘tmagan');
  assert.equal(raschGrade(72), 'A+');
  assert.equal(raschGrade(66), 'A');
  assert.equal(raschGrade(46), 'C');
});

test('Official 50-question attestation bank generates 50 unique questions per subject', () => {
  for (const subj of ATTESTATION_SUBJECTS) {
    const qs = generateDeterministicAttestation(subj.id, 50);
    assert.equal(qs.length, 50, `${subj.id} must have 50 questions`);
    const stems = new Set(qs.map((q) => q.s));
    assert.equal(stems.size, 50, `${subj.id} must have zero duplicate question texts`);
    for (const q of qs) {
      assert.equal(q.o.length, 4);
      assert.equal(new Set(q.o).size, 4, `Distinct 4 options required in ${subj.id} Q${q.n}`);
      assert.ok(q.c !== undefined && q.c >= 0 && q.c <= 3);
    }
  }
});
