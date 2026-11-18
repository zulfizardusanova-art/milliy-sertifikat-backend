import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Attempt,
  PayConfig,
  PaymentRequest,
  Role,
  SiteConfig,
  TestItem,
  UserProfile,
} from '../types';
import { checkWrittenAnswer } from '../utils/mathEval';
import {
  flushPending,
  isPersistEnabled,
  loadFromFirestore,
  queueSave,
} from './persist';

export const ROOT_OWNER_LOGIN = 'owner'; // Majburiy asosiy owner logini

export interface StoredUser extends UserProfile {
  passwordHash: string;
  needsOwnerPasswordClaim?: boolean;
}

export interface StoredTest extends TestItem {}

export interface StartRecord {
  uid: string;
  tid: string;
  at: number;
}

export interface DatabaseState {
  users: StoredUser[];
  tests: StoredTest[];
  attempts: Attempt[];
  starts: StartRecord[];
  payConfig: PayConfig;
  siteConfig?: SiteConfig;
  payRequests: PaymentRequest[];
  images: Record<string, string>;
  sessions: Record<string, string>;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  authorLabel: 'Milliy Sertifikat',
  telegramHandle: '',
  contactText: 'Onlayn test va attestatsiya platformasi',
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, orig] = stored.split(':');
  if (!salt || !orig) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(orig));
}

// ==========================================
// ENG MUHIM QISM: @owner LOGININI MAJBURAN BOSS QILISH
// ==========================================
export function ensureRootOwnerState(db: DatabaseState): boolean {
  let changed = false;
  
  // Tizimdan aynan '@owner' logini bilan odamni qidiramiz
  let owner = db.users.find((u) => u.lg === ROOT_OWNER_LOGIN);

  if (!owner) return false; // Agar hali ro'yxatdan o'tmagan bo'lsa, kutamiz

  // Agar '@owner' ning ID raqami xato bo'lsa, uni 'u_owner' ga o'zgartiramiz
  if (owner.id !== 'u_owner') {
    const conflictingIdUser = db.users.find(u => u.id === 'u_owner' && u.lg !== ROOT_OWNER_LOGIN);
    if (conflictingIdUser) {
      conflictingIdUser.id = 'u_' + crypto.randomBytes(6).toString('hex');
    }
    owner.id = 'u_owner'; 
    changed = true;
  }

  // Rolini majburiy 'owner' qilamiz
  if (owner.role !== 'owner') {
    owner.role = 'owner';
    changed = true;
  }

  // Boshqa birovning logini 'owner' bo'lib qolgan bo'lsa, uni o'zgartiramiz
  const conflictingLgUser = db.users.find(u => u.lg === ROOT_OWNER_LOGIN && u.id !== 'u_owner');
  if (conflictingLgUser) {
    conflictingLgUser.lg = conflictingLgUser.lg + '_old';
    changed = true;
  }

  return changed;
}

// BAZA 100% BO'SH BOSHLANADI
function createInitialDb(): DatabaseState {
  return {
    users: [], 
    tests: [],
    attempts: [],
    starts: [],
    payConfig: {
      price: 25000,
      card: '8600 1204 5590 3318',
      holder: 'SHERBEK M.',
      note: 'To‘lov chekini yuklang. Owner tekshirgach avtomatik ochiladi.',
    },
    siteConfig: { ...DEFAULT_SITE_CONFIG },
    payRequests: [],
    images: {},
    sessions: {},
  };
}

let cachedDb: DatabaseState | null = null;

export function loadDb(): DatabaseState {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(raw) as DatabaseState;
      // Har safar yuklanganda owner holatini tekshiramiz
      if (ensureRootOwnerState(cachedDb)) {
        saveDb(cachedDb);
      }
      return cachedDb;
    } catch {}
  }
  cachedDb = createInitialDb();
  saveDb(cachedDb);
  return cachedDb;
}

export async function initDb(): Promise<void> {
  if (!isPersistEnabled()) {
    console.log('Firestore ulanmagan: lokal data/db.json ishlatiladi.');
    return;
  }
  const remote = await loadFromFirestore();
  if (remote) {
    const base = createInitialDb();
    const db = { ...base, ...(remote as Partial<DatabaseState>) } as DatabaseState;
    for (const k of ['users', 'tests', 'attempts', 'starts', 'payRequests'] as const) {
      if (!Array.isArray(db[k])) (db as any)[k] = [];
    }
    if (!db.images || typeof db.images !== 'object') db.images = {};
    if (!db.sessions || typeof db.sessions !== 'object') db.sessions = {};
    if (!db.payConfig) db.payConfig = base.payConfig;
    
    // Firestore'dan yuklanganda ham tekshiramiz
    if (ensureRootOwnerState(db)) {
      saveDb(db);
    }
    cachedDb = db;
    console.log(`Firestore'dan yuklandi: ${db.users.length} foydalanuvchi.`);
  } else {
    cachedDb = null;
    const db = loadDb();
    saveDb(db);
    console.log('Firestore bo\'sh edi: bazaga ilk ma\'lumot yozildi.');
  }
}

export async function flushDb(): Promise<void> {
  await flushPending();
}

export function saveDb(db: DatabaseState): void {
  cachedDb = db;
  if (isPersistEnabled()) {
    queueSave({
      users: db.users,
      tests: db.tests,
      attempts: db.attempts,
      starts: db.starts,
      payConfig: db.payConfig,
      siteConfig: db.siteConfig,
      payRequests: db.payRequests,
      images: db.images,
      sessions: db.sessions,
    });
    return;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function sanitizeUser(u: StoredUser): UserProfile {
  const { passwordHash: _ph, needsOwnerPasswordClaim: _claim, ...pub } = u;
  return pub;
}

export function stripTestKeys(t: StoredTest): TestItem {
  return {
    ...t,
    q: t.q.map((q) => ({
      n: q.n,
      k: q.k,
      s: q.s,
      o: q.o,
      im: q.im,
      topic: q.topic,
    })),
  };
}

export function gradeAnswers(
  test: StoredTest,
  answers: (number | string)[]
): number[] {
  return test.q.map((q, i) => {
    const ans = answers[i];
    if (q.k === 'w') {
      return checkWrittenAnswer(String(ans ?? ''), String(q.a ?? ''));
    }
    return Number(ans) === q.c ? 1 : 0;
  });
}

export function hasTestAccess(
  user: StoredUser,
  test: StoredTest,
  attempts: Attempt[]
): boolean {
  if (user.role !== 'user') return true;
  if (test.price <= 0) return true;
  if ((user.prem || 0) > Date.now()) return true;
  if (user.unlockedTests?.includes(test.id)) return true;
  if (attempts.some((a) => a.uid === user.id && a.tid === test.id)) return true;
  return false;
}

export function mergeDatabaseBackup(
  db: DatabaseState,
  incoming: Partial<DatabaseState>
): { usersAdded: number; testsAdded: number; attemptsAdded: number } {
  let usersAdded = 0;
  let testsAdded = 0;
  let attemptsAdded = 0;

  if (Array.isArray(incoming.users)) {
    const existingIds = new Set(db.users.map((u) => u.id));
    const existingLogins = new Set(db.users.map((u) => u.lg.toLowerCase()));
    for (const u of incoming.users) {
      if (!u || !u.id || !u.lg) continue;
      const lgNorm = String(u.lg).trim().toLowerCase();
      if (existingIds.has(u.id) || existingLogins.has(lgNorm)) continue;
      db.users.push({
        id: String(u.id),
        nm: String(u.nm || lgNorm),
        lg: lgNorm,
        role: (u.role === 'owner' || u.role === 'admin' ? u.role : 'user') as Role,
        prem: Number(u.prem) || 0,
        school: u.school ? String(u.school) : '',
        subject: u.subject ? String(u.subject) : '',
        avatar: u.avatar ? String(u.avatar) : '',
        unlockedTests: Array.isArray(u.unlockedTests) ? u.unlockedTests : [],
        passwordHash:
          typeof u.passwordHash === 'string' && u.passwordHash.includes(':')
            ? u.passwordHash
            : hashPassword(crypto.randomBytes(12).toString('hex')),
        needsOwnerPasswordClaim: Boolean(u.needsOwnerPasswordClaim),
      });
      existingIds.add(String(u.id));
      existingLogins.add(lgNorm);
      usersAdded++;
    }
  }

  if (Array.isArray(incoming.tests)) {
    const existingTestIds = new Set(db.tests.map((t) => t.id));
    for (const t of incoming.tests) {
      if (!t || !t.id || !t.title || !Array.isArray(t.q) || t.q.length === 0) continue;
      if (existingTestIds.has(t.id)) continue;
      db.tests.push(t);
      existingTestIds.add(t.id);
      testsAdded++;
    }
  }

  if (Array.isArray(incoming.attempts)) {
    const existingAttIds = new Set(db.attempts.map((a) => a.id));
    for (const a of incoming.attempts) {
      if (!a || !a.id || !a.uid || !a.tid) continue;
      if (existingAttIds.has(a.id)) continue;
      db.attempts.push(a);
      existingAttIds.add(a.id);
      attemptsAdded++;
    }
  }

  if (incoming.images && typeof incoming.images === 'object') {
    for (const [k, v] of Object.entries(incoming.images)) {
      if (typeof v === 'string' && !db.images[k]) {
        db.images[k] = v;
      }
    }
  }

  if (Array.isArray(incoming.payRequests)) {
    const existingPayIds = new Set(db.payRequests.map((r) => r.id));
    for (const r of incoming.payRequests) {
      if (!r || !r.id || existingPayIds.has(r.id)) continue;
      db.payRequests.push(r);
      existingPayIds.add(r.id);
    }
  }

  return { usersAdded, testsAdded, attemptsAdded };
}