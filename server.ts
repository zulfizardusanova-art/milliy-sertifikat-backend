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

import {
  DEFAULT_SITE_CONFIG,
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

if (!getApps().length) {
  try {
    let serviceAccount;
    if (fs.existsSync('/etc/secrets/serviceAccount.json')) {
      serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/serviceAccount.json', 'utf8'));
    } else {
      serviceAccount = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
    }
    initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    console.error("Firebase xatosi:", error);
    process.exit(1);
  }
}
export const db = getFirestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

function getSessionUser(req: express.Request): StoredUser | null {
  const token = (req.headers['x-session-token'] as string | undefined) || req.cookies?.ms_token;
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
// MAJBURIY OWNER QILISH MANTIG'I (SHU YERDA)
// ==========================================
app.get('/api/state', (req, res) => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: 'Avval tizimga kiring.' }); return; }
  const dbData = loadDb();

  // Tizimga kirgan odam darhol OWNER bo'ladi
  if (user.role !== 'owner') {
    user.role = 'owner';
    saveDb(dbData);
  }

  const isStaff = true;
  const isOwner = user.role === 'owner';
  const starts: Record<string, number> = {};
  for (const s of dbData.starts) if (s.uid === user.id) starts[s.tid] = s.at;
  const visibleRequests = isOwner ? dbData.payRequests : dbData.payRequests.filter((r) => r.uid === user.id);
  const solvedSet = new Set(dbData.attempts.filter((a) => a.uid === user.id).map((a) => a.tid));

  res.json({
    me: sanitizeUser(user),
    users: dbData.users.map(sanitizeUser),
    tests: dbData.tests.map((t) => (isStaff || solvedSet.has(t.id) ? t : stripTestKeys(t))),
    attempts: dbData.attempts,
    starts,
    payConfig: dbData.payConfig,
    siteConfig: dbData.siteConfig || DEFAULT_SITE_CONFIG,
    payRequests: visibleRequests,
    images: dbData.images,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const lg = String(req.body?.lg || '').trim().toLowerCase().replace(/^@/, '');
  const pw = String(req.body?.pw || '');
  const dbData = loadDb();
  let user = dbData.users.find((u) => u.lg === lg);
  if (!user) { res.status(401).json({ error: 'Login yoki parol noto‘g‘ri.' }); return; }
  if (!verifyPassword(pw, user.passwordHash)) { res.status(401).json({ error: 'Login yoki parol noto‘g‘ri.' }); return; }
  const token = makeToken();
  dbData.sessions[token] = user.id;
  saveDb(dbData);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const nm = String(req.body?.nm || '').trim();
  const lg = String(req.body?.lg || '').trim().toLowerCase().replace(/^@/, '');
  const pw = String(req.body?.pw || '');
  if (!nm || nm.length < 2 || !/^[a-z0-9_.]{3,30}$/.test(lg) || pw.length < 8) {
    res.status(400).json({ error: 'Ma’lumotlar xato.' }); return;
  }
  const dbData = loadDb();
  if (dbData.users.some((u) => u.lg === lg)) { res.status(409).json({ error: 'Bu login band.' }); return; }
  
   const newUser: StoredUser = {
    // AYNAN MANA BU QATOR O'ZGARDI:
    id: dbData.users.length === 0 ? 'u_owner' : 'u_' + crypto.randomBytes(6).toString('hex'),
    nm, lg,
    role: dbData.users.length === 0 ? 'owner' : 'user',
    prem: 0, passwordHash: hashPassword(pw), unlockedTests: [],
  };
  dbData.users.push(newUser);
  const token = makeToken();
  dbData.sessions[token] = newUser.id;
  saveDb(dbData);
  res.json({ token, user: sanitizeUser(newUser) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-session-token'] as string | undefined;
  if (token) { const dbData = loadDb(); delete dbData.sessions[token]; saveDb(dbData); }
  res.json({ ok: true });
});

app.patch('/api/profile', (req, res) => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: 'Kirish kerak.' }); return; }
  const dbData = loadDb();
  const target = dbData.users.find((u) => u.id === user.id)!;
  if (req.body?.nm) target.nm = String(req.body.nm).trim().slice(0, 60);
  if (req.body?.lg) target.lg = String(req.body.lg).trim().toLowerCase();
  if (req.body?.school) target.school = String(req.body.school).trim().slice(0, 120);
  if (req.body?.subject) target.subject = String(req.body.subject).trim().slice(0, 80);
  if (req.body?.avatar) target.avatar = String(req.body.avatar);
  if (req.body?.newPassword) {
    if (!verifyPassword(String(req.body.currentPassword), target.passwordHash)) { res.status(400).json({ error: 'Parol xato.' }); return; }
    target.passwordHash = hashPassword(String(req.body.newPassword));
  }
  saveDb(dbData);
  res.json({ user: sanitizeUser(target) });
});

app.get('/api/public/config', (_req, res) => {
  const dbData = loadDb();
  res.json({ siteConfig: dbData.siteConfig || DEFAULT_SITE_CONFIG });
});

app.put('/api/site/config', (req, res) => {
  const owner = getSessionUser(req);
  if (!owner || owner.role !== 'owner') { res.status(403).json({ error: 'Ruxsat yoq.' }); return; }
  const dbData = loadDb();
  dbData.siteConfig = {
    authorLabel: String(req.body?.authorLabel || '').trim(),
    telegramHandle: String(req.body?.telegramHandle || '').trim(),
    contactText: String(req.body?.contactText || '').trim(),
  };
  saveDb(dbData);
  res.json({ siteConfig: dbData.siteConfig });
});

app.post('/api/tests/:id/start', (req, res) => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: 'Kirish kerak.' }); return; }
  const dbData = loadDb();
  const test = dbData.tests.find((t) => t.id === req.params.id);
  if (!test) { res.status(404).json({ error: 'Topilmadi.' }); return; }
  let start = dbData.starts.find((s) => s.uid === user.id && s.tid === test.id);
  if (!start) {
    start = { uid: user.id, tid: test.id, at: Date.now() };
    dbData.starts.push(start); saveDb(dbData);
  }
  res.json({ startedAt: start.at });
});

app.post('/api/tests/:id/finish', (req, res) => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: 'Kirish kerak.' }); return; }
  const dbData = loadDb();
  const test = dbData.tests.find((t) => t.id === req.params.id);
  if (!test) { res.status(404).json({ error: 'Topilmadi.' }); return; }
  if (dbData.attempts.some((a) => a.uid === user.id && a.tid === test.id)) { res.json({ attempt: dbData.attempts.find(a => a.uid === user.id && a.tid === test.id) }); return; }
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const ok = gradeAnswers(test, answers);
  const attempt = { id: `${user.id}_${test.id}`, uid: user.id, tid: test.id, ok, answers, t: 60, at: Date.now() };
  dbData.attempts.push(attempt); saveDb(dbData);
  res.json({ attempt });
});

app.post('/api/tests', (req, res) => {
  const user = getSessionUser(req);
  if (!user || user.role === 'user') { res.status(403).json({ error: 'Ruxsat yoq.' }); return; }
  const dbData = loadDb();
  const newTest: StoredTest = {
    id: 't_' + crypto.randomBytes(5).toString('hex'),
    title: String(req.body.title), category: req.body.category || 'mock',
    at: Number(req.body.at) || Date.now(), end: req.body.isLifetime ? 0 : Number(req.body.end) || 0,
    isLifetime: Boolean(req.body.isLifetime), dur: Math.max(1, Number(req.body.dur) || 60),
    isUnlimitedTime: Boolean(req.body.isUnlimitedTime), price: Math.max(0, Number(req.body.price) || 0),
    q: req.body.q, by: user.id,
  };
  dbData.tests.push(newTest); saveDb(dbData);
  res.json({ test: newTest });
});

app.delete('/api/tests/:id', (req, res) => {
  const user = getSessionUser(req);
  if (!user || user.role === 'user') { res.status(403).json({ error: 'Ruxsat yoq.' }); return; }
  const dbData = loadDb();
  dbData.tests = dbData.tests.filter((t) => t.id !== req.params.id); saveDb(dbData);
  res.json({ ok: true });
});

app.post('/api/users/:id/role', (req, res) => {
  const actor = getSessionUser(req);
  if (!actor || actor.role !== 'owner') { res.status(403).json({ error: 'Ruxsat yoq.' }); return; }
  const dbData = loadDb();
  const target = dbData.users.find((u) => u.id === req.params.id);
  if (target) { target.role = req.body.role; saveDb(dbData); res.json({ user: sanitizeUser(target) }); }
  else { res.status(404).json({ error: 'Topilmadi.' }); }
});

app.post('/api/users/:id/premium', (req, res) => {
  const owner = getSessionUser(req);
  if (!owner || owner.role !== 'owner') { res.status(403).json({ error: 'Ruxsat yoq.' }); return; }
  const dbData = loadDb();
  const target = dbData.users.find((u) => u.id === req.params.id);
  if (target) {
    if (req.body.mode === 'clear') target.prem = 0;
    else target.prem = Math.max(target.prem || 0, Date.now()) + (Number(req.body.days) || 0) * 864e5;
    saveDb(dbData); res.json({ user: sanitizeUser(target) });
  } else { res.status(404).json({ error: 'Topilmadi.' }); }
});

app.post('/api/ai/mock', async (req, res) => {
  const user = getSessionUser(req);
  if (!user || !canUseAiGenerator(user.role)) {
    res.status(403).json({ error: 'Ruxsat yoq.' });
    return;
  }
  const ai = getGeminiClient();
  if (!ai) {
    res.status(400).json({ error: 'GEMINI_API_KEY sozlanmagan.' });
    return;
  }
  try {
    const response = await ai.models.generateContent({
      model: 'model: 'gemini-3.0-flash',',
      contents: buildMockTestPrompt(req.body),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              k: { type: Type.STRING },
              s: { type: Type.STRING },
              o: { type: Type.ARRAY, items: { type: Type.STRING } },
              c: { type: Type.INTEGER },
            },
          },
        },
      },
    });
    const raw = extractJsonArrayFromText(response.text ?? '[]');
    res.json({ questions: raw, source: 'gemini' });
  } catch (err: any) {
    console.error('Gemini AI xatosi:', err);
    res.status(500).json({
      error: err?.message || 'AI xatosi.',
    });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  await initDb();
  const shutdown = async () => { await flushDb(); process.exit(0); };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => { res.sendFile(path.join(distDir, 'index.html')); });
  }
  app.listen(PORT, '0.0.0.0', () => { console.log(`Server running`); });
}
startServer();