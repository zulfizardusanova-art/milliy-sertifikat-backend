export type Role = 'user' | 'admin' | 'owner';

export type TestCategory = 'mock' | 'olympiad' | 'attestation';

export type LanguageCode = 'uz' | 'uz_new' | 'uzc' | 'ru' | 'en';

export interface Question {
  n: string;
  k: 'mc' | 'w';
  s: string;
  o: string[];
  c?: number;
  a?: string;
  im?: string;
  topic?: string;
  explanation?: string;
}

export interface TestItem {
  id: string;
  title: string;
  category: TestCategory;
  subject?: string;
  at: number;
  end: number;
  isLifetime: boolean;
  dur: number;
  isUnlimitedTime: boolean;
  price: number;
  q: Question[];
  by: string;
  targetGrade?: string;
}

export interface Attempt {
  id: string;
  uid: string;
  tid: string;
  ok: number[];
  answers?: (number | string)[];
  t: number;
  at: number;
}

export interface UserProfile {
  id: string;
  nm: string;
  lg: string;
  role: Role;
  prem: number;
  avatar?: string;
  school?: string;
  subject?: string;
  bio?: string;
  unlockedTests?: string[];
}

export interface PaymentRequest {
  id: string;
  uid: string;
  nm: string;
  lg: string;
  type: 'premium' | 'test';
  tid?: string;
  testTitle?: string;
  months?: number;
  amount: number;
  note: string;
  img: string;
  status: 'pending' | 'ok' | 'no';
  at: number;
  verifiedAt?: number;
  verifiedBy?: string;
}

export interface PayConfig {
  price: number;
  card: string;
  holder: string;
  note: string;
}

export interface SiteConfig {
  authorLabel: string;
  telegramHandle: string;
  contactText: string;
}

export interface TestRankingEntry {
  uid: string;
  user: UserProfile;
  attempt: Attempt;
  rawCorrect: number;
  totalQuestions: number;
  theta: number;
  raschScore: number;
  grade: string;
  attestationScore: number;
  attestationCategory: string;
  timeSec: number;
}

export interface ItemDifficultyStat {
  index: number;
  label: string;
  correctCount: number;
  attemptCount: number;
  correctRate: number;
  difficultyB: number;
}
