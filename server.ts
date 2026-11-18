import cors from 'cors';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import fs from 'node:fs';

// BARCHA KERAKLI IMPORTLAR
import {
  DEFAULT_SITE_CONFIG,
  ROOT_OWNER_ID,
  ROOT_OWNER_LOGIN,
  gradeAnswers,
  hashPassword,
  flushDb,
  hasTestAccess,
  initDb,
  loadDb,
  mergeDatabaseBackup,
  sanitizeUser,
  saveDb,
  stripTestKeys,
  verifyPassword,
  type StoredTest,
  type StoredUser,
} from './src/server/store';
import {
  fetchAllLegacyFirebaseData,
  fetchLegacyUserProfile,
  signInLegacyFirebase,
} from './src/server/firebaseSync';
import { generateDeterministicAttestation } from './src/utils/attestationBank';
import {
  buildAttestationPrompt,
  buildMockTestPrompt,
  canUseAiGenerator,
  clampMockCounts,
  extractJsonArrayFromText,
  generateDeterministicMock,
  normalizeAiAttestationQuestions,
  normalizeAiMockQuestions,
  type MockDifficulty,
  type RawAiQuestionItem,
} from './src/utils/aiTestGen';
import type { PaymentRequest, Question, Role, SiteConfig } from './src/types';

// ==========================================
// 1. FIREBASE INITIALIZATION
// ==========================================
if (!getApps().length) {
  try {
    let serviceAccount;

    // Render'dagi Secret File dan o'qish
    if (fs.existsSync('/etc/secrets/serviceAccount.json')) {
      serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/serviceAccount.json', 'utf8'));
    } else {
      // Lokal kompyuterda ishlayotganda fayldan o'qish
      serviceAccount = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("✅ Firebase muvaffaqiyatli ishga tushdi.");
  } catch (error) {
    console.error("❌ Firebase'ni ishga tushirishda xatolik:", error);
    process.exit(1);
  }
}

export const db = getFirestore();

// ==========================================
// 2. EXPRESS APP SETUP
// ==========================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==========================================
// 3. YORDAMCHI FUNKSIYALAR
// ==========================================
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function getSessionUser(req: express.Request): StoredUser | null {
  const token =
    (req.headers['x-session-token'] as string | undefined) ||
    req.cookies?.ms_token;
  if (!token) return null;
  const dbData = loadDb();
  const uid = dbData.sessions[token];
  if (!uid) return null;
  return dbData.users.find((u) => u.id === uid) || null;
}

function makeToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

// ==========================================
// 4. AUTH ENDPOINTS
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const lg = String(req.body?.lg || '').trim().toLowerCase().replace(/^@/, '');
  const pw = String(req.body?.pw || '');
  const dbData = loadDb();
  let user = dbData.users.find((u) => u.lg === lg);

  if (!user && lg && pw) {
    const fbAuth = await signInLegacyFirebase(lg, pw);
    if (fbAuth) {
      const profile = await fetchLegacyUserProfile(fbAuth.localId, fbAuth.idToken);
      const safeRole: Role =
        profile?.role === 'admin' || profile?.role === 'owner'
          ? profile.role
          : 'user';
      user = {
        id: 'fb_' + fbAuth.localId,
        nm: (profile?.nm || lg).slice(0, 60),
        lg,
        role: safeRole,
        prem: Number(profile?.prem) || 0,
        school: '',
        subject: '',
        unlockedTests: [],
        passwordHash: hashPassword(pw),
      };
      dbData.users.push(user);
    }
  }

  if (!user) {
    res.status(401).json({ error: 'Login yoki parol noto‘g‘ri.' });
    return;
  }

  if (user.id === ROOT_OWNER_ID && user.needsOwnerPasswordClaim) {
    if (pw.length < 8) {
      res.status(400).json({ error: 'Asosiy Owner paroli kamida 8 belgi bo‘lishi kerak.' });
      return;
    }
    user.passwordHash = hashPassword(pw);
    user.needsOwnerPasswordClaim = false;
  } else if (!verifyPassword(pw, user.passwordHash)) {
    res.status(401).json({ error: 'Login yoki parol noto‘g‘ri.' });
    return;
  }

  const token = makeToken();
  dbData.sessions[token] = user.id;
  saveDb(dbData);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const nm = String(req.body?.nm || '').trim();
  const lg = String(req.body?.lg || '').trim().toLowerCase().replace(/^@/, '');
  const pw = String(req.body?.pw || '');

  if (!nm || nm.length < 2) {
    res.status(400).json({ error: 'Ismingizni kamida 2 ta harf bilan yozing.' });
    return;
  }
  if (!/^[a-z0-9_.]{3,30}$/.test(lg)) {
    res.status(400).json({ error: 'Login 3–30 belgi: lotin harflari, raqam, _ yoki nuqta bo‘lishi kerak.' });
    return;
  }
  if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) {
    res.status(400).json({ error: 'Parol kamida 8 belgi bo‘lib, harf va raqamni o‘z ichiga olsin.' });
    return;
  }

  const dbData = loadDb();
  const existingOwner = dbData.users.find(
    (u) =>
      u.id === ROOT_OWNER_ID &&
      u.lg === ROOT_OWNER_LOGIN &&
      u.lg === lg &&
      u.needsOwnerPasswordClaim
  );
  if (existingOwner) {
    existingOwner.nm = nm.slice(0, 60);
    existingOwner.passwordHash = hashPassword(pw);
    existingOwner.needsOwnerPasswordClaim = false;
    const token = makeToken();
    dbData.sessions[token] = existingOwner.id;
    saveDb(dbData);
    res.json({ token, user: sanitizeUser(existingOwner) });
    return;
  }

  if (dbData.users.some((u) => u.lg === lg)) {
    res.status(409).json({ error: 'Bu login band.' });
    return;
  }

  const newUser: StoredUser = {
    id: 'u_' + crypto.randomBytes(6).toString('hex'),
    nm,
    lg,
    role: dbData.users.length === 0 ? 'owner' : 'user',
    prem: 0,
    passwordHash: hashPassword(pw),
    unlockedTests: [],
  };
  dbData.users.push(newUser);
  const token = makeToken();
  dbData.sessions[token] = newUser.id;
  saveDb(dbData);
  res.json({ token, user: sanitizeUser(newUser) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-session-token'] as string | undefined;
  if (token) {
    const dbData = loadDb();
    delete dbData.sessions[token];
    saveDb(dbData);
  }
  res.json({ ok: true });
});

// ==========================================
// 5. PROFILE & SETTINGS
// ==========================================
app.patch('/api/profile', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Avval tizimga kiring.' });
    return;
  }
  const dbData = loadDb();
  const target = dbData.users.find((u) => u.id === user.id)!;

  if (typeof req.body?.nm === 'string') {
    const nm = req.body.nm.trim();
    if (nm.length < 2) {
      res.status(400).json({ error: 'Ism kamida 2 ta belgi bo‘lishi kerak.' });
      return;
    }
    target.nm = nm.slice(0, 60);
  }

  if (typeof req.body?.lg === 'string') {
    const nextLg = req.body.lg.trim().toLowerCase().replace(/^@/, '');
    if (nextLg !== target.lg) {
      if (!/^[a-z0-9_.]{3,30}$/.test(nextLg)) {
        res.status(400).json({ error: 'Login 3–30 belgi: lotin harflari, raqam, _ yoki nuqta bo‘lishi kerak.' });
        return;
      }
      if (dbData.users.some((u) => u.id !== target.id && u.lg === nextLg)) {
        res.status(409).json({ error: 'Bu login band.' });
        return;
      }
      target.lg = nextLg;
    }
  }

  if (typeof req.body?.school === 'string') {
    target.school = req.body.school.trim().slice(0, 120);
  }
  if (typeof req.body?.subject === 'string') {
    target.subject = req.body.subject.trim().slice(0, 80);
  }
  if (typeof req.body?.avatar === 'string') {
    const av = req.body.avatar;
    if (av === '' || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(av)) {
      target.avatar = av;
    }
  }

  if (req.body?.newPassword) {
    const currentPw = String(req.body.currentPassword || '');
    const newPw = String(req.body.newPassword || '');
    if (!verifyPassword(currentPw, target.passwordHash)) {
      res.status(400).json({ error: 'Joriy parol noto‘g‘ri.' });
      return;
    }
    if (newPw.length < 8 || !/[a-zA-Z]/.test(newPw) || !/\d/.test(newPw)) {
      res.status(400).json({ error: 'Yangi parol kamida 8 belgi, harf va raqamdan iborat bo‘lishi kerak.' });
      return;
    }
    target.passwordHash = hashPassword(newPw);
  }

  saveDb(dbData);
  res.json({ user: sanitizeUser(target) });
});

// ==========================================
// 6. PUBLIC & OWNER SITE CONFIG
// ==========================================
app.get('/api/public/config', (_req, res) => {
  const dbData = loadDb();
  res.json({ siteConfig: dbData.siteConfig || DEFAULT_SITE_CONFIG });
});

app.put('/api/site/config', (req, res) => {
  const owner = getSessionUser(req);
  if (!owner || owner.role !== 'owner') {
    res.status(403).json({ error: 'Faqat Owner sayt aloqasini o‘zgartira oladi.' });
    return;
  }
  const dbData = loadDb();
  const rawTg = String(req.body?.telegramHandle || '')
    .trim()
    .replace(/^https?:\/\/t\.me\//i, '')
    .replace(/^@/, '')
    .slice(0, 50);
  const nextCfg: SiteConfig = {
    authorLabel: String(req.body?.authorLabel || '').trim().slice(0, 80) || DEFAULT_SITE_CONFIG.authorLabel,
    telegramHandle: rawTg,
    contactText: String(req.body?.contactText || '').trim().slice(0, 120),
  };
  dbData.siteConfig = nextCfg;
  saveDb(dbData);
  res.json({ siteConfig: nextCfg });
});

// ==========================================
// 7. STATE HYDRATION
// ==========================================
app.get('/api/state', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Avval tizimga kiring.' });
    return;
  }
  const dbData = loadDb();
  const isStaff = user.role !== 'user';
  const isOwner = user.role === 'owner';

  const starts: Record<string, number> = {};
  for (const s of dbData.starts) {
    if (s.uid === user.id) starts[s.tid] = s.at;
  }

  const visibleRequests = isOwner
    ? dbData.payRequests
    : dbData.payRequests.filter((r) => r.uid === user.id);

  const solvedSet = new Set(
    dbData.attempts.filter((a) => a.uid === user.id).map((a) => a.tid)
  );

  res.json({
    me: sanitizeUser(user),
    users: dbData.users.map(sanitizeUser),
    tests: dbData.tests.map((t) =>
      isStaff || solvedSet.has(t.id) ? t : stripTestKeys(t)
    ),
    attempts: dbData.attempts,
    starts,
    payConfig: dbData.payConfig,
    siteConfig: dbData.siteConfig || DEFAULT_SITE_CONFIG,
    payRequests: visibleRequests,
    images: dbData.images,
  });
});

// ==========================================
// 8. TEST EXECUTION
// ==========================================
app.post('/api/tests/:id/start', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Avval tizimga kiring.' });
    return;
  }
  const dbData = loadDb();
  const test = dbData.tests.find((t) => t.id === req.params.id);
  if (!test) {
    res.status(404).json({ error: 'Test topilmadi.' });
    return;
  }
  if (!Array.isArray(test.q) || test.q.length === 0) {
    res.status(400).json({ error: 'Bu testda savollar mavjud emas.' });
    return;
  }
  const now = Date.now();
  if (test.at > now) {
    res.status(403).json({ error: 'Test hali boshlanmagan.' });
    return;
  }
  if (!test.isLifetime && test.end > 0 && now > test.end) {
    res.status(403).json({ error: 'Test muddati tugagan.' });
    return;
  }
  if (!hasTestAccess(user, test, dbData.attempts)) {
    res.status(402).json({ error: `Bu test pullik (${test.price.toLocaleString('ru-RU')} so‘m). Avval to‘lov qilib tasdiqlating.` });
    return;
  }

  let start = dbData.starts.find((s) => s.uid === user.id && s.tid === test.id);
  if (!start) {
    start = { uid: user.id, tid: test.id, at: now };
    dbData.starts.push(start);
    saveDb(dbData);
  }
  res.json({ startedAt: start.at });
});

app.post('/api/tests/:id/finish', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Avval tizimga kiring.' });
    return;
  }
  const dbData = loadDb();
  const test = dbData.tests.find((t) => t.id === req.params.id);
  if (!test) {
    res.status(404).json({ error: 'Test topilmadi.' });
    return;
  }

  const existing = dbData.attempts.find((a) => a.uid === user.id && a.tid === test.id);
  if (existing) {
    res.json({ attempt: existing });
    return;
  }

  const answers: (number | string)[] = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const start = dbData.starts.find((s) => s.uid === user.id && s.tid === test.id);
  const now = Date.now();
  const rawElapsed = start ? Math.max(1, Math.round((now - start.at) / 1000)) : 60;
  const elapsed = test.isUnlimitedTime ? rawElapsed : Math.min(rawElapsed, test.dur * 60);

  const ok = gradeAnswers(test, answers);
  const attempt = {
    id: `${user.id}_${test.id}`,
    uid: user.id,
    tid: test.id,
    ok,
    answers,
    t: elapsed,
    at: now,
  };
  dbData.attempts.push(attempt);
  saveDb(dbData);
  res.json({ attempt });
});

// ==========================================
// 9. ADMIN TEST MANAGEMENT
// ==========================================
app.post('/api/tests', (req, res) => {
  const user = getSessionUser(req);
  if (!user || user.role === 'user') {
    res.status(403).json({ error: 'Ruxsat yo‘q.' });
    return;
  }
  const body = req.body;
  if (!Array.isArray(body?.q) || body.q.length === 0) {
    res.status(400).json({ error: 'Kamida 1 ta savol bo‘lishi shart (0 ta savolli test saqlanmaydi).' });
    return;
  }
  const dbData = loadDb();
  const id = 't_' + crypto.randomBytes(5).toString('hex');
  const newTest: StoredTest = {
    id,
    title: String(body.title || '').trim(),
    category: body.category || 'mock',
    subject: body.subject ? String(body.subject) : undefined,
    targetGrade: body.targetGrade ? String(body.targetGrade) : undefined,
    at: Number(body.at) || Date.now(),
    end: body.isLifetime ? 0 : Number(body.end) || 0,
    isLifetime: Boolean(body.isLifetime),
    dur: Math.max(1, Number(body.dur) || 60),
    isUnlimitedTime: Boolean(body.isUnlimitedTime),
    price: Math.max(0, Math.round(Number(body.price) || 0)),
    q: body.q,
    by: user.id,
  };
  if (body.images && typeof body.images === 'object') {
    for (const [k, v] of Object.entries(body.images)) {
      if (typeof v === 'string') dbData.images[`${id}_${k}`] = v;
    }
  }
  dbData.tests.push(newTest);
  saveDb(dbData);
  res.json({ test: newTest });
});

app.put('/api/tests/:id', (req, res) => {
  const user = getSessionUser(req);
  if (!user || user.role === 'user') {
    res.status(403).json({ error: 'Ruxsat yo‘q.' });
    return;
  }
  const dbData = loadDb();
  const idx = dbData.tests.findIndex((t) => t.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: 'Test topilmadi.' });
    return;
  }
  const body = req.body;
  const updated: StoredTest = {
    ...dbData.tests[idx],
    title: String(body.title || dbData.tests[idx].title).trim(),
    category: body.category || dbData.tests[idx].category,
    subject: body.subject !== undefined ? String(body.subject) : dbData.tests[idx].subject,
    targetGrade: body.targetGrade !== undefined ? String(body.targetGrade) : dbData.tests[idx].targetGrade,
    at: Number(body.at) || dbData.tests[idx].at,
    end: body.isLifetime ? 0 : Number(body.end) || 0,
    isLifetime: Boolean(body.isLifetime),
    dur: Math.max(1, Number(body.dur) || 60),
    isUnlimitedTime: Boolean(body.isUnlimitedTime),
    price: Math.max(0, Math.round(Number(body.price) || 0)),
    q: Array.isArray(body.q) ? body.q : dbData.tests[idx].q,
  };
  if (body.images && typeof body.images === 'object') {
    for (const [k, v] of Object.entries(body.images)) {
      if (typeof v === 'string') dbData.images[`${updated.id}_${k}`] = v;
    }
  }
  dbData.tests[idx] = updated;
  saveDb(dbData);
  res.json({ test: updated });
});

app.delete('/api/tests/:id', (req, res) => {
  const user = getSessionUser(req);
  if (!user || user.role === 'user') {
    res.status(403).json({ error: 'Ruxsat yo‘q.' });
    return;
  }
  const dbData = loadDb();
  dbData.tests = dbData.tests.filter((t) => t.id !== req.params.id);
  saveDb(dbData);
  res.json({ ok: true });
});

// ==========================================
// 10. PAYMENTS & OWNER VERIFICATION
// ==========================================
app.post('/api/payments/request', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Avval tizimga kiring.' });
    return;
  }
  const dbData = loadDb();
  const type = req.body?.type === 'test' ? 'test' : 'premium';
  const tid = req.body?.tid ? String(req.body.tid) : undefined;
  let amount = 0;
  let testTitle: string | undefined;
  let months: number | undefined;

  if (type === 'test') {
    const t = dbData.tests.find((x) => x.id === tid);
    if (!t) {
      res.status(404).json({ error: 'Test topilmadi.' });
      return;
    }
    amount = t.price;
    testTitle = t.title;
  } else {
    months = Math.min(12, Math.max(1, Number(req.body?.months) || 1));
    amount = (dbData.payConfig.price || 25000) * months;
  }

  const pr: PaymentRequest = {
    id: 'pay_' + crypto.randomBytes(6).toString('hex'),
    uid: user.id,
    nm: user.nm,
    lg: user.lg,
    type,
    tid,
    testTitle,
    months,
    amount,
    note: String(req.body?.note || '').trim().slice(0, 120),
    img: String(req.body?.img || ''),
    status: 'pending',
    at: Date.now(),
  };
  dbData.payRequests.push(pr);
  saveDb(dbData);
  res.json({ request: pr });
});

app.post('/api/payments/:id/verify', (req, res) => {
  const owner = getSessionUser(req);
  if (!owner || owner.role !== 'owner') {
    res.status(403).json({ error: 'Faqat Owner tasdiqlashi mumkin.' });
    return;
  }
  const decision = req.body?.status === 'ok' ? 'ok' : 'no';
  const dbData = loadDb();
  const pr = dbData.payRequests.find((r) => r.id === req.params.id);
  if (!pr) {
    res.status(404).json({ error: 'So‘rov topilmadi.' });
    return;
  }
  pr.status = decision;
  pr.verifiedAt = Date.now();
  pr.verifiedBy = owner.nm;

  if (decision === 'ok') {
    const targetUser = dbData.users.find((u) => u.id === pr.uid);
    if (targetUser) {
      if (pr.type === 'test' && pr.tid) {
        const list = new Set(targetUser.unlockedTests || []);
        list.add(pr.tid);
        targetUser.unlockedTests = [...list];
      } else {
        const m = pr.months || 1;
        targetUser.prem = Math.max(targetUser.prem || 0, Date.now()) + m * 30 * 864e5;
      }
    }
  }
  saveDb(dbData);
  res.json({ request: pr });
});

app.put('/api/payments/config', (req, res) => {
  const owner = getSessionUser(req);
  if (!owner || owner.role !== 'owner') {
    res.status(403).json({ error: 'Faqat Owner o‘zgartira oladi.' });
    return;
  }
  const dbData = loadDb();
  dbData.payConfig = {
    price: Math.max(1000, Math.round(Number(req.body?.price) || 25000)),
    card: String(req.body?.card || '').trim().slice(0, 40),
    holder: String(req.body?.holder || '').trim().slice(0, 60),
    note: String(req.body?.note || '').trim().slice(0, 200),
  };
  saveDb(dbData);
  res.json({ payConfig: dbData.payConfig });
});

// ==========================================
// 11. USER ROLE & MANUAL PREMIUM
// ==========================================
app.post('/api/users/:id/role', (req, res) => {
  const actor = getSessionUser(req);
  if (!actor || actor.id !== ROOT_OWNER_ID) {
    res.status(403).json({ error: 'Faqat Asosiy Owner boshqa foydalanuvchilar rolini o‘zgartira oladi.' });
    return;
  }
  const role = req.body?.role as Role;
  if (!['user', 'admin', 'owner'].includes(role)) {
    res.status(400).json({ error: 'Noto‘g‘ri rol.' });
    return;
  }
  const dbData = loadDb();
  const target = dbData.users.find((u) => u.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    return;
  }
  if (target.id === ROOT_OWNER_ID) {
    res.status(400).json({ error: 'Asosiy Owner rolini o‘zgartirib bo‘lmaydi.' });
    return;
  }
  target.role = role;
  saveDb(dbData);
  res.json({ user: sanitizeUser(target) });
});

app.post('/api/users/:id/premium', (req, res) => {
  const owner = getSessionUser(req);
  if (!owner || owner.role !== 'owner') {
    res.status(403).json({ error: 'Ruxsat yo‘q.' });
    return;
  }
  const days = Number(req.body?.days) || 0;
  const mode = req.body?.mode as 'set' | 'add' | 'clear';
  const dbData = loadDb();
  const target = dbData.users.find((u) => u.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    return;
  }
  if (mode === 'clear') {
    target.prem = 0;
  } else {
    const base = mode === 'add' ? Math.max(target.prem || 0, Date.now()) : Date.now();
    target.prem = base + Math.max(1, days) * 864e5;
  }
  saveDb(dbData);
  res.json({ user: sanitizeUser(target) });
});

// ==========================================
// 12. ROOT OWNER BACKUP, RESTORE & LEGACY FIREBASE IMPORT
// ==========================================
app.get('/api/admin/backup', (req, res) => {
  const actor = getSessionUser(req);
  if (!actor || actor.id !== ROOT_OWNER_ID) {
    res.status(403).json({ error: 'Faqat Asosiy Owner ma’lumotlar zaxirasini yuklab olishi mumkin.' });
    return;
  }
  const dbData = loadDb();
  res.json({
    exportedAt: Date.now(),
    users: dbData.users,
    tests: dbData.tests,
    attempts: dbData.attempts,
    payConfig: dbData.payConfig,
    siteConfig: dbData.siteConfig || DEFAULT_SITE_CONFIG,
    payRequests: dbData.payRequests,
    images: dbData.images,
  });
});

app.post('/api/admin/restore', (req, res) => {
  const actor = getSessionUser(req);
  if (!actor || actor.id !== ROOT_OWNER_ID) {
    res.status(403).json({ error: 'Faqat Asosiy Owner zaxira faylini tiklashi mumkin.' });
    return;
  }
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: 'Noto‘g‘ri zaxira JSON formati.' });
    return;
  }
  const dbData = loadDb();
  const result = mergeDatabaseBackup(dbData, req.body);
  saveDb(dbData);
  res.json({ ...result, totalUsers: dbData.users.length, totalTests: dbData.tests.length });
});

app.post('/api/admin/import-firebase', async (req, res) => {
  const actor = getSessionUser(req);
  if (!actor || actor.id !== ROOT_OWNER_ID) {
    res.status(403).json({ error: 'Faqat Asosiy Owner eski Firebase bazasini import qila oladi.' });
    return;
  }
  const lg = String(req.body?.lg || '').trim().toLowerCase().replace(/^@/, '');
  const pw = String(req.body?.pw || '');
  if (!lg || !pw) {
    res.status(400).json({ error: 'Eski Firebase hisobining login va parolini kiriting.' });
    return;
  }
  const legacy = await fetchAllLegacyFirebaseData(lg, pw);
  if (!legacy) {
    res.status(401).json({ error: 'Eski Firebase (milliy-sertifikat-cca37) hisobiga kirib bo‘lmadi. Eski login va parolni tekshiring.' });
    return;
  }
  const dbData = loadDb();
  const result = mergeDatabaseBackup(dbData, legacy);
  saveDb(dbData);
  res.json({ ...result, totalUsers: dbData.users.length, totalTests: dbData.tests.length });
});

// ==========================================
// 13. GEMINI AI ENDPOINTS (Owner-Only)
// ==========================================
function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();
  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return { status: 400, message: 'GEMINI_API_KEY yaroqsiz yoki sozlanmagan. Settings > Secrets bo‘limida API kalitni tekshiring.' };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return { status: 429, message: 'AI so‘rovlar limiti vaqtincha tugadi. Birozdan keyin qayta urinib ko‘ring.' };
  }
  return { status: 502, message: raw ? `AI generatsiyada xato: ${raw}` : 'AI bilan bog‘lanishda xato yuz berdi.' };
}

app.post('/api/ai/mock', async (req, res) => {
  const user = getSessionUser(req);
  if (!user || !canUseAiGenerator(user.role)) {
    res.status(403).json({ error: 'Faqat Owner AI test generatoridan foydalana oladi.' });
    return;
  }

  const subject = String(req.body?.subject || 'Matematika').trim().slice(0, 80);
  const topic = String(req.body?.topic || '').trim().slice(0, 300);
  const difficulty = (['easy', 'medium', 'hard'].includes(String(req.body?.difficulty)) ? String(req.body.difficulty) : 'medium') as MockDifficulty;
  const promptNote = String(req.body?.promptNote || '').trim().slice(0, 400);
  const { mcCount, writtenCount } = clampMockCounts(Number(req.body?.mcCount ?? 15), Number(req.body?.writtenCount ?? 0));
  const mode = req.body?.mode === 'bank' ? 'bank' : 'ai';

  if (mode === 'bank') {
    const questions = generateDeterministicMock({ subject, topic, difficulty, mcCount, writtenCount, promptNote });
    res.json({ questions, source: 'bank' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(400).json({ error: 'GEMINI_API_KEY sozlanmagan. AI bilan tuzish uchun Settings > Secrets bo‘limiga GEMINI_API_KEY kiriting yoki "O‘quv bazasidan tezkor tuzish" tugmasidan foydalaning.' });
    return;
  }

  try {
    const mockSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          k: { type: Type.STRING },
          s: { type: Type.STRING },
          o: { type: Type.ARRAY, items: { type: Type.STRING } },
          c: { type: Type.INTEGER },
          a: { type: Type.STRING },
          topic: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['k', 's', 'o', 'topic', 'explanation'],
      },
    };
    const systemInstruction = "Siz O'zbekiston Milliy sertifikat va maktab imtihonlari uchun professional fan mutaxassisi va testologsiz. Faqat aniq, ilmiy tekshirilgan savollar hamda KaTeX $...$ formulalarini JSON massiv ko'rinishida qaytaring.";

    const rawItems: RawAiQuestionItem[] = [];
    let mcRem = mcCount;
    let wrRem = writtenCount;

    while (mcRem > 0 || wrRem > 0) {
      const batchMc = Math.min(15, mcRem);
      const batchWr = batchMc < 15 ? Math.min(15 - batchMc, wrRem) : 0;
      const prompt = buildMockTestPrompt({ subject, topic, difficulty, mcCount: batchMc || 1, writtenCount: batchWr, promptNote });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: mockSchema,
        },
      });

      const parsed = extractJsonArrayFromText(response.text ?? '[]');
      if (batchMc === 0 && batchWr > 0) {
        rawItems.push(...parsed.filter((x) => x.k === 'w' || Boolean(x.a)));
      } else {
        rawItems.push(...parsed);
      }

      mcRem -= batchMc;
      wrRem -= batchWr;
    }

    const questions = normalizeAiMockQuestions(rawItems, mcCount, writtenCount);
    if (questions.length === 0) {
      res.status(502).json({ error: 'AI savollarni shakllantira olmadi. "O‘quv bazasidan tezkor tuzish" tugmasidan foydalaning yoki qayta urining.' });
      return;
    }

    res.json({ questions, source: 'gemini' });
  } catch (err) {
    const mapped = formatGeminiError(err);
    res.status(mapped.status).json({ error: mapped.message });
  }
});

app.post('/api/ai/attestation', async (req, res) => {
  const user = getSessionUser(req);
  if (!user || !canUseAiGenerator(user.role)) {
    res.status(403).json({ error: 'Faqat Owner AI attestatsiya generatoridan foydalana oladi.' });
    return;
  }
  const subject = String(req.body?.subject || 'matematika');
  const targetGrade = String(req.body?.targetGrade || 'Oliy va 1-toifa');
  const count = Math.min(50, Math.max(5, Number(req.body?.count) || 50));
  const promptNote = String(req.body?.promptNote || '').trim().slice(0, 400);
  const mode = req.body?.mode === 'bank' ? 'bank' : 'ai';

  if (mode === 'bank') {
    const questions = generateDeterministicAttestation(subject, count);
    res.json({ questions, source: 'bank' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(400).json({ error: 'GEMINI_API_KEY sozlanmagan. AI bilan tuzish uchun Settings > Secrets ga GEMINI_API_KEY kiriting yoki "Rasmiy o‘quv bankidan" tugmasidan foydalaning.' });
    return;
  }

  try {
    const attSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          s: { type: Type.STRING },
          o: { type: Type.ARRAY, items: { type: Type.STRING } },
          c: { type: Type.INTEGER },
          topic: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['s', 'o', 'c', 'topic', 'explanation'],
      },
    };
    const systemInstruction = "Siz O'zbekiston o'qituvchilari malaka toifasi (Attestatsiya) komissiyasining ekspert testologisiz. Savollar aniq, amaldagi dasturga mos va KaTeX $...$ formulalar bilan bo'lsin.";

    const rawItems: RawAiQuestionItem[] = [];
    let remaining = count;
    while (remaining > 0) {
      const batchSize = Math.min(25, remaining);
      const prompt = buildAttestationPrompt({ subject, targetGrade, count: batchSize, promptNote });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: attSchema,
        },
      });
      rawItems.push(...extractJsonArrayFromText(response.text ?? '[]'));
      remaining -= batchSize;
    }

    const aiQuestions = normalizeAiAttestationQuestions(rawItems, count);
    if (aiQuestions.length === 0) {
      res.status(502).json({ error: 'AI attestatsiya savollarini yarata olmadi. Qayta urinib ko‘ring.' });
      return;
    }

    if (aiQuestions.length < count) {
      const fallbackPool = generateDeterministicAttestation(subject, count);
      const existing = new Set(aiQuestions.map((q) => q.s));
      for (const fb of fallbackPool) {
        if (aiQuestions.length >= count) break;
        if (!existing.has(fb.s)) {
          aiQuestions.push({ ...fb, n: String(aiQuestions.length + 1) });
          existing.add(fb.s);
        }
      }
    }
    res.json({ questions: aiQuestions, source: 'gemini' });
  } catch (err) {
    const mapped = formatGeminiError(err);
    res.status(mapped.status).json({ error: mapped.message });
  }
});

app.post('/api/ai/clean-pdf', async (req, res) => {
  const user = getSessionUser(req);
  if (!user || !canUseAiGenerator(user.role)) {
    res.status(403).json({ error: 'Faqat Owner AI vositalaridan foydalana oladi.' });
    return;
  }
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.json({ items: [] });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(400).json({ error: 'GEMINI_API_KEY sozlanmagan. Geometrik tozalash ishlatildi.' });
    return;
  }

  try {
    const prompt = `Quyidagi PDF dan o'qilgan o'zbekcha matematika savollari ro'yxatini tahrirlang:
1) So'zlardagi uzilgan bo'shliqlarni tuzating (masalan "ko'r inishidagi" -> "ko‘rinishidagi", "ma ' lum" -> "ma’lum").
2) Telegram kanal, telefon raqam va reklama yozuvlarini olib tashlang.
3) Daraja, indeks, ildiz va kasrlarni chiroyli KaTeX $...$ LaTeX ko'rinishiga keltiring (masalan "x x 2 + x + 1" -> "$x^2 + x + 1$", "b 1 ; b 2" -> "$b_1; b_2$", "√ 3 + √ 5" -> "$\\sqrt{3+\\sqrt{5}}$").
Kiruvchi ma'lumot:
${JSON.stringify(items.slice(0, 25))}`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              s: { type: Type.STRING },
              o: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['id', 's', 'o'],
          },
        },
      },
    });
    const cleaned = extractJsonArrayFromText(response.text ?? '[]');
    res.json({ items: cleaned });
  } catch (err) {
    const mapped = formatGeminiError(err);
    res.status(mapped.status).json({ error: mapped.message });
  }
});

// ==========================================
// 14. VITE / STATIC SERVING
// ==========================================
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  await initDb();
  const shutdown = async () => {
    await flushDb();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();