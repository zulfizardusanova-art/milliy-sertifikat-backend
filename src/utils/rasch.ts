import type {
  Attempt,
  ItemDifficultyStat,
  TestItem,
  TestRankingEntry,
  UserProfile,
} from '../types';

export const UZ_LEVELS: readonly [string, number][] = [
  ['Yangi boshlovchi', 0],
  ['Havaskor', 40],
  ['Tirishqoq', 120],
  ['Izlanuvchi', 250],
  ['Bilimdon', 450],
  ['Mohir', 700],
  ['Usta', 1000],
  ['Alloma', 1400],
  ['Akademik', 1900],
  ['Afsona', 2600],
];

export function levelIndexOf(xp: number): number {
  let idx = 0;
  for (let i = 0; i < UZ_LEVELS.length; i++) {
    if (xp >= UZ_LEVELS[i][1]) idx = i;
  }
  return idx;
}

export function levelNameOf(user: Pick<UserProfile, 'role'>, xp: number): string {
  if (user.role === 'owner') return 'Boshqaruvchi';
  if (user.role === 'admin') return 'Admin';
  return UZ_LEVELS[levelIndexOf(xp)][0];
}

export function raschGrade(score: number): string {
  if (score >= 70) return 'A+';
  if (score >= 65) return 'A';
  if (score >= 60) return 'B+';
  if (score >= 55) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 46) return 'C';
  return '—';
}

export function attestationCategory(score100: number): string {
  if (score100 >= 80) return 'Oliy toifa';
  if (score100 >= 70) return 'Birinchi toifa';
  if (score100 >= 60) return 'Ikkinchi toifa';
  if (score100 >= 55) return 'Mutaxassis';
  return 'O‘tmagan';
}

/**
 * Computes centered 1PL Rasch item difficulties for a single test.
 * Centering mean(b) = 0 guarantees that overall easy/hard tests do not
 * distort ability estimates and ensures fair comparison within the test.
 */
export function computeItemDifficulties(
  test: Pick<TestItem, 'id' | 'q'>,
  testAttempts: Attempt[]
): ItemDifficultyStat[] {
  const numItems = test.q.length;
  if (numItems === 0) return [];
  const n = testAttempts.length;

  const rawDifficulties: number[] = [];
  const correctCounts: number[] = [];

  for (let i = 0; i < numItems; i++) {
    let correct = 0;
    for (const att of testAttempts) {
      if (att.ok[i] === 1) correct += 1;
    }
    correctCounts.push(correct);
    // Laplace-smoothed log-odds difficulty: harder items (lower correct rate) have higher b_i
    const p = (correct + 0.5) / (n + 1);
    rawDifficulties.push(Math.log((1 - p) / p));
  }

  const meanB =
    rawDifficulties.reduce((acc, b) => acc + b, 0) / rawDifficulties.length;

  return test.q.map((q, i) => ({
    index: i,
    label: q.n || String(i + 1),
    correctCount: correctCounts[i],
    attemptCount: n,
    correctRate: n > 0 ? Math.round((correctCounts[i] / n) * 100) : 0,
    difficultyB: Number((rawDifficulties[i] - meanB).toFixed(4)),
  }));
}

/**
 * Estimates person latent ability (theta) using difficulty-weighted Bayesian MAP
 * Newton-Raphson against centered item difficulties b_i.
 * Harder items (higher b_i) carry strictly greater positive weight w_i, ensuring
 * that answering harder questions yields a higher ability estimate and score
 * even at identical raw correct counts.
 */
export function estimatePersonTheta(
  responses: number[],
  difficultiesB: number[]
): number {
  const m = difficultiesB.length;
  if (m === 0) return 0;

  const rawSum = responses.reduce((acc, v) => acc + (v ? 1 : 0), 0);
  if (rawSum === 0) return -3.5;
  if (rawSum === m) return 3.5;

  const priorPrecision = 1 / (1.6 * 1.6); // 1 / sigma^2
  let theta = Math.log(rawSum / (m - rawSum));
  theta = Math.max(-3.5, Math.min(3.5, theta));

  for (let iter = 0; iter < 40; iter++) {
    let grad = -theta * priorPrecision;
    let info = priorPrecision;

    for (let i = 0; i < m; i++) {
      const b = difficultiesB[i];
      const w = 1 + 0.35 * Math.tanh(b / 1.5);
      const p = 1 / (1 + Math.exp(-(theta - b)));
      const x = responses[i] ? 1 : 0;
      grad += w * (x - p);
      info += w * p * (1 - p);
    }

    const step = grad / info;
    theta = Math.max(-3.5, Math.min(3.5, theta + step));
    if (Math.abs(step) < 1e-5) break;
  }

  return Number(theta.toFixed(4));
}

export function thetaToRaschScore(
  theta: number,
  rawCorrect: number,
  totalItems: number
): number {
  if (totalItems <= 0 || rawCorrect <= 0) return 0;
  if (rawCorrect >= totalItems) return 75;
  // Scale centered theta onto Milliy Sertifikat 0..75 scale
  // theta = 0 (average test difficulty) -> 46 (C grade threshold)
  const scaled = Math.round(46 + 10.5 * theta);
  return Math.max(1, Math.min(74, scaled));
}

/**
 * Computes per-test leaderboard using centered 1PL Rasch calibration
 * strictly on attempts belonging to `test.id`.
 */
export function computeTestRaschRankings(
  test: TestItem,
  allAttempts: Attempt[],
  users: UserProfile[]
): { entries: TestRankingEntry[]; items: ItemDifficultyStat[] } {
  const testAttempts = allAttempts.filter((a) => a.tid === test.id);
  const items = computeItemDifficulties(test, testAttempts);
  const difficultiesB = items.map((it) => it.difficultyB);
  const totalQuestions = test.q.length;

  const entries: TestRankingEntry[] = [];

  for (const att of testAttempts) {
    const user = users.find((u) => u.id === att.uid);
    if (!user) continue;

    const rawCorrect = att.ok.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    const theta = estimatePersonTheta(att.ok, difficultiesB);
    const raschScore = thetaToRaschScore(theta, rawCorrect, totalQuestions);
    const attestationScore =
      totalQuestions > 0 ? Math.round((rawCorrect / totalQuestions) * 100) : 0;

    entries.push({
      uid: user.id,
      user,
      attempt: att,
      rawCorrect,
      totalQuestions,
      theta,
      raschScore,
      grade: raschGrade(raschScore),
      attestationScore,
      attestationCategory: attestationCategory(attestationScore),
      timeSec: att.t,
    });
  }

  if (test.category === 'olympiad') {
    entries.sort(
      (a, b) => b.rawCorrect - a.rawCorrect || a.timeSec - b.timeSec
    );
  } else if (test.category === 'attestation') {
    entries.sort(
      (a, b) =>
        b.attestationScore - a.attestationScore ||
        b.raschScore - a.raschScore ||
        a.timeSec - b.timeSec
    );
  } else {
    entries.sort(
      (a, b) =>
        b.raschScore - a.raschScore ||
        b.theta - a.theta ||
        a.timeSec - b.timeSec
    );
  }

  return { entries, items };
}

export interface UserSummaryStats {
  testsSolved: number;
  totalTimeSec: number;
  avgRaschScore: number | null;
  bestGrade: string;
  xp: number;
}

export function computeUserSummaryStats(
  uid: string,
  tests: TestItem[],
  allAttempts: Attempt[],
  users: UserProfile[]
): UserSummaryStats {
  const userAttempts = allAttempts.filter((a) => a.uid === uid);
  const totalTimeSec = userAttempts.reduce((acc, a) => acc + a.t, 0);
  const xp = userAttempts.reduce(
    (acc, a) => acc + a.ok.reduce((s, v) => s + (v ? 1 : 0), 0) * 3 + 15,
    0
  );

  if (userAttempts.length === 0) {
    return {
      testsSolved: 0,
      totalTimeSec: 0,
      avgRaschScore: null,
      bestGrade: '—',
      xp: 0,
    };
  }

  // Average per-test Rasch score (never pool items across different tests!)
  const perTestScores: number[] = [];
  for (const att of userAttempts) {
    const test = tests.find((t) => t.id === att.tid);
    if (!test) continue;
    const { entries } = computeTestRaschRankings(test, allAttempts, users);
    const mine = entries.find((e) => e.uid === uid);
    if (mine) perTestScores.push(mine.raschScore);
  }

  const avgRaschScore =
    perTestScores.length > 0
      ? Math.round(
          perTestScores.reduce((a, b) => a + b, 0) / perTestScores.length
        )
      : null;

  return {
    testsSolved: userAttempts.length,
    totalTimeSec,
    avgRaschScore,
    bestGrade: avgRaschScore === null ? '—' : raschGrade(avgRaschScore),
    xp,
  };
}
