import crypto from 'node:crypto';
import fs from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
type DatabaseState = Record<string, any>;
/**
 * Ma'lumotlarni Firestore'dagi `appdb` kolleksiyasida saqlaydi
 * (eski `users`, `tests`... kolleksiyalariga tegmaydi).
 * Har bir bo'lim (users, tests, ...) alohida, bo'laklarga bo'lib yoziladi,
 * faqat o'zgargan bo'limlar qayta yoziladi.
 */
const COL = 'appdb';
const CHUNK_CHARS = 200_000; // Firestore hujjati 1 MB dan oshmasligi uchun
const DEBOUNCE_MS = 1500;

let fdb: Firestore | null = null;
let tried = false;

function getDb(): Firestore | null {
  if (fdb || tried) return fdb;
  tried = true;
  try {
    let account: any = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else if (
      process.env.FIREBASE_SERVICE_ACCOUNT_FILE &&
      fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE)
    ) {
      account = JSON.parse(
        fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf-8')
      );
    }
    if (!account) return null;
    if (getApps().length === 0) {
      initializeApp({ credential: cert(account) });
    }
    fdb = getFirestore();
    return fdb;
  } catch (err) {
    console.error('Firebase Admin ishga tushmadi:', err);
    return null;
  }
}

export function isPersistEnabled(): boolean {
  return getDb() !== null;
}

type Meta = Record<string, { n: number; hash: string }>;
let lastMeta: Meta = {};

function sha(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

export async function loadFromFirestore(): Promise<Partial<DatabaseState> | null> {
  try {
    const db = getDb();
    if (!db) return null;

        const doc = await db.collection('appdb').doc('users_0').get();
    if (!doc.exists) {
      return null; // Baza bo'sh, xato bermaymiz
    }
    const data = doc.data();
    
    // XATOLIKNI TUZATISH: Ma'lumot bo'sh bo'lsa, qulab tushmasin
    if (!data || typeof data.d !== 'string' || data.d.trim() === '') {
      return null;
    }
    
    return JSON.parse(data.d);
  } catch (error) {
    console.error("Firestore dan o'qishda xato:", error);
    return null; // Xato bo'lsa ham dasturni to'xtatmaymiz
  }
}
let pending: Record<string, unknown> | null = null;
let timer: NodeJS.Timeout | null = null;
let writing: Promise<void> = Promise.resolve();

async function writeNow(snapshot: Record<string, unknown>): Promise<void> {
  const db = getDb();
  if (!db) return;
  const nextMeta: Meta = { ...lastMeta };
  let changed = false;
  for (const [key, value] of Object.entries(snapshot)) {
    const json = JSON.stringify(value ?? null);
    const hash = sha(json);
    if (lastMeta[key]?.hash === hash) continue;
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += CHUNK_CHARS) {
      chunks.push(json.slice(i, i + CHUNK_CHARS));
    }
    const oldN = lastMeta[key]?.n || 0;
    let batch = db.batch();
    let ops = 0;
    const flush = async () => {
      if (ops > 0) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    };
    for (let i = 0; i < chunks.length; i++) {
      batch.set(db.collection(COL).doc(`${key}_${i}`), { d: chunks[i] });
      if (++ops >= 400) await flush();
    }
    for (let i = chunks.length; i < oldN; i++) {
      batch.delete(db.collection(COL).doc(`${key}_${i}`));
      if (++ops >= 400) await flush();
    }
    await flush();
    nextMeta[key] = { n: chunks.length, hash };
    changed = true;
  }
  if (changed) {
    await db
      .collection(COL)
      .doc('meta')
      .set({ parts: nextMeta, updatedAt: Date.now() });
    lastMeta = nextMeta;
  }
}

export function queueSave(snapshot: Record<string, unknown>): void {
  if (!isPersistEnabled()) return;
  pending = snapshot;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const snap = pending;
    pending = null;
    if (!snap) return;
    writing = writing
      .then(() => writeNow(snap))
      .catch((err) => console.error('Firestore saqlash xatosi:', err));
  }, DEBOUNCE_MS);
}

export async function flushPending(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const snap = pending;
  pending = null;
  if (snap) {
    writing = writing
      .then(() => writeNow(snap))
      .catch((err) => console.error('Firestore saqlash xatosi:', err));
  }
  await writing;
}
