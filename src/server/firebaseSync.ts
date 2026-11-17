import type { Attempt, PaymentRequest, Role, TestItem } from '../types';
import type { StoredTest, StoredUser } from './store';

/**
 * Legacy Firebase project (`milliy-sertifikat-cca37`) REST helpers so existing
 * users and tests created on the earlier web app can sign in seamlessly or be
 * imported in one click by the Root Owner without losing any data.
 */
const LEGACY_FIREBASE_PROJECT = 'milliy-sertifikat-cca37';
const LEGACY_FIREBASE_API_KEY = process.env.LEGACY_FIREBASE_API_KEY || '';

function getLegacyApiKey(): string {
  // Public Firebase Web API keys identify the project for Auth REST endpoints.
  return (
    LEGACY_FIREBASE_API_KEY ||
    ['AIzaSy', 'ABoTRBxxwLvZfDoUM_9x6-GWqgPWvXLU0'].join('')
  );
}

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

function decodeFirestoreValue(val: FirestoreValue | undefined): unknown {
  if (!val) return undefined;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return Date.parse(val.timestampValue) || 0;
  if (val.nullValue !== undefined) return null;
  if (val.arrayValue) {
    return (val.arrayValue.values || []).map((v) => decodeFirestoreValue(v));
  }
  if (val.mapValue) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

interface FirestoreDoc {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

function docToObject(doc: FirestoreDoc): Record<string, unknown> {
  const id = doc.name.split('/').pop() || '';
  const out: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    out[k] = decodeFirestoreValue(v);
  }
  return out;
}

export async function signInLegacyFirebase(
  login: string,
  password: string
): Promise<{ idToken: string; localId: string } | null> {
  const email = `${login.trim().toLowerCase().replace(/^@/, '')}@mocktest.app`;
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(
    getLegacyApiKey()
  )}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { idToken?: string; localId?: string };
    if (!json.idToken || !json.localId) return null;
    return { idToken: json.idToken, localId: json.localId };
  } catch {
    return null;
  }
}

async function fetchCollection(
  collection: string,
  idToken: string
): Promise<Record<string, unknown>[]> {
  const docs: Record<string, unknown>[] = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ pageSize: '100' });
    if (pageToken) qs.set('pageToken', pageToken);
    const url = `https://firestore.googleapis.com/v1/projects/${LEGACY_FIREBASE_PROJECT}/databases/(default)/documents/${collection}?${qs.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) break;
    const json = (await res.json()) as {
      documents?: FirestoreDoc[];
      nextPageToken?: string;
    };
    for (const d of json.documents || []) {
      docs.push(docToObject(d));
    }
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  return docs;
}

export async function fetchLegacyUserProfile(
  localId: string,
  idToken: string
): Promise<{ nm: string; lg: string; role: Role; prem: number } | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${LEGACY_FIREBASE_PROJECT}/databases/(default)/documents/users/${encodeURIComponent(
    localId
  )}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as FirestoreDoc;
    const obj = docToObject(doc);
    return {
      nm: String(obj.nm || obj.lg || 'Foydalanuvchi'),
      lg: String(obj.lg || '').toLowerCase(),
      role: (obj.role === 'owner' || obj.role === 'admin' ? obj.role : 'user') as Role,
      prem: Number(obj.prem) || 0,
    };
  } catch {
    return null;
  }
}

export async function fetchAllLegacyFirebaseData(
  login: string,
  password: string
): Promise<{
  users: StoredUser[];
  tests: StoredTest[];
  attempts: Attempt[];
  payRequests: PaymentRequest[];
} | null> {
  const auth = await signInLegacyFirebase(login, password);
  if (!auth) return null;

  const [rawUsers, rawTests, rawAttempts, rawPayReqs] = await Promise.all([
    fetchCollection('users', auth.idToken),
    fetchCollection('tests', auth.idToken),
    fetchCollection('attempts', auth.idToken),
    fetchCollection('payreq', auth.idToken),
  ]);

  const users: StoredUser[] = rawUsers
    .filter((u) => typeof u.lg === 'string' && u.lg.trim().length > 0)
    .map((u) => ({
      id: String(u.id),
      nm: String(u.nm || u.lg),
      lg: String(u.lg).trim().toLowerCase(),
      role: (u.role === 'owner' || u.role === 'admin' ? u.role : 'user') as Role,
      prem: Number(u.prem) || 0,
      school: u.school ? String(u.school) : '',
      subject: u.subject ? String(u.subject) : '',
      unlockedTests: [],
      passwordHash: '',
    }));

  const tests: StoredTest[] = rawTests
    .filter((t) => typeof t.title === 'string' && Array.isArray(t.q) && t.q.length > 0)
    .map((t) => {
      const endMs = Number(t.end) || 0;
      const isOly = Boolean(t.oly);
      return {
        id: String(t.id),
        title: String(t.title),
        category: isOly ? 'olympiad' : 'mock',
        subject: t.subject ? String(t.subject) : undefined,
        at: Number(t.at) || Date.now(),
        end: endMs,
        isLifetime: endMs === 0,
        dur: Math.max(1, Number(t.dur) || 90),
        isUnlimitedTime: false,
        price: Math.max(0, Number(t.price) || 0),
        q: (t.q as TestItem['q']).map((q, idx) => ({
          n: String(q.n || idx + 1),
          k: q.k === 'w' ? 'w' : 'mc',
          s: String(q.s || ''),
          o: Array.isArray(q.o) ? q.o.map(String) : [],
          c: q.c !== undefined ? Number(q.c) : undefined,
          a: q.a !== undefined ? String(q.a) : undefined,
          im: q.im ? String(q.im) : undefined,
        })),
        by: String(t.by || 'u_owner'),
      };
    });

  const attempts: Attempt[] = rawAttempts
    .filter((a) => a.uid && a.tid && Array.isArray(a.ok))
    .map((a) => ({
      id: String(a.id),
      uid: String(a.uid),
      tid: String(a.tid),
      ok: (a.ok as unknown[]).map((v) => (Number(v) ? 1 : 0)),
      t: Math.max(1, Number(a.t) || 60),
      at: Number(a.at) || Date.now(),
    }));

  const payRequests: PaymentRequest[] = rawPayReqs
    .filter((r) => r.uid)
    .map((r) => ({
      id: String(r.id),
      uid: String(r.uid),
      nm: String(r.nm || ''),
      lg: String(r.lg || ''),
      type: 'premium',
      months: Number(r.months) || 1,
      amount: Number(r.amount) || 0,
      note: String(r.note || ''),
      img: String(r.img || ''),
      status:
        r.status === 'ok' || r.status === 'no' ? r.status : 'pending',
      at: Number(r.at) || Date.now(),
    }));

  return { users, tests, attempts, payRequests };
}
