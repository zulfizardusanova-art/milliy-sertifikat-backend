import React, { useCallback, useEffect, useState } from 'react';
import type {
  Attempt,
  LanguageCode,
  PayConfig,
  PaymentRequest,
  Question,
  Role,
  SiteConfig,
  TestItem,
  UserProfile,
} from './types';
import { computeUserSummaryStats } from './utils/rasch';
import { trText } from './utils/i18n';
import { AuthView } from './components/AuthView';
import { Sidebar, type NavSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HomeView } from './components/HomeView';
import { ExamView } from './components/ExamView';
import { LeaderboardView } from './components/LeaderboardView';
import { AttestatsiyaView } from './components/AttestatsiyaView';
import { OlympiadView } from './components/OlympiadView';
import { PremiumView } from './components/PremiumView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { PayModal } from './components/PayModal';
import { ResultModal } from './components/ResultModal';

interface AppStatePayload {
  me: UserProfile;
  users: UserProfile[];
  tests: TestItem[];
  attempts: Attempt[];
  starts: Record<string, number>;
  payConfig: PayConfig;
  siteConfig?: SiteConfig;
  payRequests: PaymentRequest[];
  images: Record<string, string>;
}

const DEFAULT_PUBLIC_SITE_CONFIG: SiteConfig = {
  authorLabel: 'Milliy Sertifikat',
  telegramHandle: '',
  contactText: 'Onlayn test va attestatsiya platformasi',
};

const TOKEN_KEY = 'ms_session_token';
const LANG_KEY = 'ms_lang';
const THEME_KEY = 'ms_theme';
// Render'dagi backend havolasi
const API_BASE_URL = 'https://milliy-sertifikat-backend.onrender.com';

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '');
  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(LANG_KEY) as LanguageCode | null;
    return saved && ['uz', 'uz_new', 'uzc', 'ru', 'en'].includes(saved)
      ? saved
      : 'uz';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [data, setData] = useState<AppStatePayload | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_PUBLIC_SITE_CONFIG);
  const [loading, setLoading] = useState<boolean>(!!token);
  const [section, setSection] = useState<NavSection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string>('');
  const [payModalTarget, setPayModalTarget] = useState<{
    open: boolean;
    test: TestItem | null;
  }>({ open: false, test: null });
  const [resultTarget, setResultTarget] = useState<{
    test: TestItem;
    attempt: Attempt;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang.slice(0, 2);
  }, [lang]);

  const apiFetch = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(opts.headers as Record<string, string> | undefined),
      };
      if (token) headers['x-session-token'] = token;
      
      // BARCHA API SO'ROVLARIGA AVTOMATIK RENDER HAVOLASINI QO'SHISH
      const fullUrl = url.startsWith('/api/') ? `${API_BASE_URL}${url}` : url;
      
      const res = await fetch(fullUrl, { ...opts, headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Server xatosi (${res.status})`);
      }
      return json;
    },
    [token]
  );

  const refreshState = useCallback(async () => {
    if (!token) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const json = (await apiFetch('/api/state')) as AppStatePayload;
      setData(json);
      if (json.siteConfig) {
        setSiteConfig(json.siteConfig);
      }
      // Resume active unfinished exam if started and not expired
      const unfinished = json.tests.find((t) => {
        const st = json.starts[t.id];
        if (!st) return false;
        const alreadyDone = json.attempts.some(
          (a) => a.uid === json.me.id && a.tid === t.id
        );
        if (alreadyDone) return false;
        if (t.isUnlimitedTime) return true;
        return st + t.dur * 60_000 > Date.now();
      });
      if (unfinished) {
        setActiveExamId(unfinished.id);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken('');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, apiFetch]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (token) return;
    fetch(`${API_BASE_URL}/api/public/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.siteConfig) setSiteConfig(j.siteConfig as SiteConfig);
      })
      .catch(() => {});
  }, [token]);

  const handleLogin = async (lg: string, pw: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lg, pw }),
      });
      const json = await res.json();
      if (!res.ok) return json.error || 'Kirishda xato.';
      localStorage.setItem(TOKEN_KEY, json.token);
      setToken(json.token);
      setLoading(true);
      return null;
    } catch {
      return 'Server bilan ulanishda xato.';
    }
  };

  const handleRegister = async (
    nm: string,
    lg: string,
    pw: string
  ): Promise<string | null> => {
    try {
      // BU YERDA HAM HAVOLA QO'SHILDI
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nm, lg, pw }),
      });
      const json = await res.json();
      if (!res.ok) return json.error || 'Ro‘yxatdan o‘tishda xato.';
      localStorage.setItem(TOKEN_KEY, json.token);
      setToken(json.token);
      setLoading(true);
      return null;
    } catch {
      return 'Server bilan ulanishda xato.';
    }
  };

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setData(null);
    setActiveExamId(null);
    setSection('home');
  };

  const handleStartTest = async (testId: string) => {
    setFlash('');
    try {
      await apiFetch(`/api/tests/${testId}/start`, { method: 'POST' });
      await refreshState();
      setActiveExamId(testId);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Testni boshlab bo‘lmadi.');
    }
  };

  const handleFinishExam = async (answers: (number | string)[]) => {
    if (!activeExamId) return;
    const finishedTest = data?.tests.find((t) => t.id === activeExamId) || null;
    try {
      const res = await apiFetch(`/api/tests/${activeExamId}/finish`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      const att = res.attempt as Attempt;
      const correct = att.ok.reduce((a, b) => a + (b ? 1 : 0), 0);
      setActiveExamId(null);
      await refreshState();
      setFlash(`Test yakunlandi! Natija: ${correct}/${att.ok.length} to‘g‘ri javob.`);
      if (finishedTest) {
        setResultTarget({ test: finishedTest, attempt: att });
      }
    } catch (err) {
      setActiveExamId(null);
      setFlash(err instanceof Error ? err.message : 'Natija saqlanmadi.');
    }
  };

  if (!token || (!loading && !data)) {
    return (
      <AuthView
        lang={lang}
        theme={theme}
        siteConfig={siteConfig}
        onLangChange={setLang}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090f1d] text-slate-600 dark:text-slate-300 text-sm">
        {trText('Yuklanmoqda…', lang)}
      </div>
    );
  }

  const activeExam = activeExamId
    ? data.tests.find((t) => t.id === activeExamId)
    : null;

  if (activeExam) {
    return (
      <ExamView
        test={activeExam}
        startedAt={data.starts[activeExam.id] || Date.now()}
        images={data.images}
        lang={lang}
        onFinish={handleFinishExam}
      />
    );
  }

  const stats = computeUserSummaryStats(
    data.me.id,
    data.tests,
    data.attempts,
    data.users
  );
  const pendingPayCount = data.payRequests.filter(
    (r) => r.status === 'pending'
  ).length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#090f1d] text-slate-900 dark:text-slate-100">
      <Sidebar
        user={{ ...data.me, role: 'owner' }}
        xp={stats.xp}
        active={section}
        pendingPayCount={pendingPayCount}
        lang={lang}
        theme={theme}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigate={(sec) => {
          setSection(sec);
          setFlash('');
        }}
        onLangChange={setLang}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          section={section}
          user={data.me}
          xp={stats.xp}
          lang={lang}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenProfile={() => setSection('profile')}
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-7">
          {flash && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {trText(flash, lang)}
            </div>
          )}

          {section === 'home' && (
            <HomeView
              user={data.me}
              users={data.users}
              tests={data.tests}
              attempts={data.attempts}
              starts={data.starts}
              myRequests={data.payRequests}
              lang={lang}
              onStartTest={handleStartTest}
              onOpenPayModal={(t) => setPayModalTarget({ open: true, test: t })}
              onViewResult={(test, attempt) => setResultTarget({ test, attempt })}
              onGoPremium={() => setSection('premium')}
              onAutoCreateMock={async (payload) => {
                try {
                  const gen = await apiFetch('/api/ai/mock', {
                    method: 'POST',
                    body: JSON.stringify({
                      subject: payload.subject,
                      topic: payload.topic,
                      difficulty: payload.difficulty,
                      mcCount: payload.mcCount,
                      writtenCount: payload.writtenCount,
                      promptNote: payload.promptNote,
                      mode: payload.mode || 'ai',
                    }),
                  });
                  if (!Array.isArray(gen?.questions) || gen.questions.length === 0) {
                    return 'Savollar shakllantirilmadi — 0 ta savolli test saqlanmaydi.';
                  }
                  await apiFetch('/api/tests', {
                    method: 'POST',
                    body: JSON.stringify({
                      title: payload.title,
                      category: 'mock',
                      subject: payload.subject,
                      at: Date.now(),
                      end: 0,
                      isLifetime: true,
                      dur: payload.isUnlimitedTime ? 999 : payload.dur,
                      isUnlimitedTime: payload.isUnlimitedTime,
                      price: payload.price,
                      q: gen.questions,
                    }),
                  });
                  await refreshState();
                  setFlash(
                    `Yangi Mock test "${payload.title}" (${gen.questions.length} ta savol) yaratildi.`
                  );
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Xato yuz berdi.';
                }
              }}
            />
          )}

          {section === 'attestation' && (
            <AttestatsiyaView
              user={data.me}
              tests={data.tests}
              attempts={data.attempts}
              starts={data.starts}
              myRequests={data.payRequests}
              lang={lang}
              onStartTest={handleStartTest}
              onOpenPayModal={(t) => setPayModalTarget({ open: true, test: t })}
              onViewResult={(test, attempt) => setResultTarget({ test, attempt })}
              onAutoCreateAttestation={async (payload) => {
                try {
                  const gen = await apiFetch('/api/ai/attestation', {
                    method: 'POST',
                    body: JSON.stringify({
                      subject: payload.subject,
                      targetGrade: payload.targetGrade,
                      count: payload.count,
                      promptNote: payload.promptNote,
                      mode: payload.mode || 'ai',
                    }),
                  });
                  if (!Array.isArray(gen?.questions) || gen.questions.length === 0) {
                    return 'Savollar shakllantirilmadi — 0 ta savolli test saqlanmaydi.';
                  }
                  await apiFetch('/api/tests', {
                    method: 'POST',
                    body: JSON.stringify({
                      title: payload.title,
                      category: 'attestation',
                      subject: payload.subject,
                      targetGrade: payload.targetGrade,
                      at: Date.now(),
                      end: 0,
                      isLifetime: true,
                      dur: payload.isUnlimitedTime ? 999 : payload.dur,
                      isUnlimitedTime: payload.isUnlimitedTime,
                      price: payload.price,
                      q: gen.questions,
                    }),
                  });
                  await refreshState();
                  setFlash(
                    `Yangi Attestatsiya testi "${payload.title}" (${gen.questions.length} ta savol) yaratildi.`
                  );
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Xato yuz berdi.';
                }
              }}
            />
          )}

          {section === 'olympiad' && (
            <OlympiadView
              user={data.me}
              users={data.users}
              tests={data.tests}
              attempts={data.attempts}
              lang={lang}
              onStartTest={handleStartTest}
              onOpenPayModal={(t) => setPayModalTarget({ open: true, test: t })}
              onGrantPremium={async (uid, days) => {
                await apiFetch(`/api/users/${uid}/premium`, {
                  method: 'POST',
                  body: JSON.stringify({ days, mode: 'add' }),
                });
                await refreshState();
                setFlash(`+${days} kun Premium berildi.`);
              }}
            />
          )}

          {section === 'rating' && (
            <LeaderboardView
              currentUser={data.me}
              users={data.users}
              tests={data.tests}
              attempts={data.attempts}
              lang={lang}
            />
          )}

          {section === 'premium' && (
            <PremiumView
              user={data.me}
              payConfig={data.payConfig}
              myRequests={data.payRequests}
              lang={lang}
              onOpenPremiumPay={() => setPayModalTarget({ open: true, test: null })}
            />
          )}

          {section === 'profile' && (
            <ProfileView
              user={data.me}
              lang={lang}
              onUpdateProfile={async (payload) => {
                try {
                  await apiFetch('/api/profile', {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                  });
                  await refreshState();
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Saqlanmadi.';
                }
              }}
            />
          )}

          {section === 'admin' && (
            <AdminView
              currentUser={data.me}
              users={data.users}
              tests={data.tests}
              attempts={data.attempts}
              payConfig={data.payConfig}
              siteConfig={data.siteConfig || siteConfig}
              payRequests={data.payRequests}
              images={data.images}
              lang={lang}
              onSaveTest={async (payload) => {
                try {
                  if (payload.id) {
                    await apiFetch(`/api/tests/${payload.id}`, {
                      method: 'PUT',
                      body: JSON.stringify(payload),
                    });
                  } else {
                    await apiFetch('/api/tests', {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    });
                  }
                  await refreshState();
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Saqlanmadi.';
                }
              }}
              onDeleteTest={async (id) => {
                try {
                  await apiFetch(`/api/tests/${id}`, { method: 'DELETE' });
                  await refreshState();
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'O‘chirilmadi.';
                }
              }}
              onVerifyPayment={async (id, status) => {
                try {
                  await apiFetch(`/api/payments/${id}/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ status }),
                  });
                  await refreshState();
                  setFlash(
                    status === 'ok'
                      ? 'To‘lov tasdiqlandi va test/premium ochildi.'
                      : 'To‘lov so‘rovi rad etildi.'
                  );
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Xato.';
                }
              }}
              onSavePayConfig={async (cfg) => {
                try {
                  await apiFetch('/api/payments/config', {
                    method: 'PUT',
                    body: JSON.stringify(cfg),
                  });
                  await refreshState();
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Saqlanmadi.';
                }
              }}
              onSaveSiteConfig={async (cfg) => {
                try {
                  const res = await apiFetch('/api/site/config', {
                    method: 'PUT',
                    body: JSON.stringify(cfg),
                  });
                  if (res?.siteConfig) setSiteConfig(res.siteConfig as SiteConfig);
                  await refreshState();
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Saqlanmadi.';
                }
              }}
              onExportBackup={async () => {
                try {
                  const backup = await apiFetch('/api/admin/backup');
                  return { backup };
                } catch (err) {
                  return {
                    error: err instanceof Error ? err.message : 'Yuklab bo‘lmadi.',
                  };
                }
              }}
              onRestoreBackup={async (payload) => {
                try {
                  const res = await apiFetch('/api/admin/restore', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  await refreshState();
                  return res;
                } catch (err) {
                  return {
                    error: err instanceof Error ? err.message : 'Tiklab bo‘lmadi.',
                  };
                }
              }}
              onImportFirebase={async (lg, pw) => {
                try {
                  const res = await apiFetch('/api/admin/import-firebase', {
                    method: 'POST',
                    body: JSON.stringify({ lg, pw }),
                  });
                  await refreshState();
                  return res;
                } catch (err) {
                  return {
                    error: err instanceof Error ? err.message : 'Import qilib bo‘lmadi.',
                  };
                }
              }}
              onSetRole={async (uid, role: Role) => {
                try {
                  await apiFetch(`/api/users/${uid}/role`, {
                    method: 'POST',
                    body: JSON.stringify({ role }),
                  });
                  await refreshState();
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Xato.';
                }
              }}
              onSetPremium={async (uid, days, mode) => {
                try {
                  await apiFetch(`/api/users/${uid}/premium`, {
                    method: 'POST',
                    body: JSON.stringify({ days, mode }),
                  });
                  await refreshState();
                  return null;
                } catch (err) {
                  return err instanceof Error ? err.message : 'Xato.';
                }
              }}
              onGenerateAttestation={async (subj, grade, count, mode, promptNote) => {
                try {
                  const res = await apiFetch('/api/ai/attestation', {
                    method: 'POST',
                    body: JSON.stringify({
                      subject: subj,
                      targetGrade: grade,
                      count,
                      mode: mode || 'ai',
                      promptNote,
                    }),
                  });
                  return { questions: res.questions as Question[] };
                } catch (err) {
                  return {
                    error: err instanceof Error ? err.message : 'Xato yuz berdi.',
                  };
                }
              }}
              onGenerateMock={async (payload) => {
                try {
                  const res = await apiFetch('/api/ai/mock', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  return { questions: res.questions as Question[] };
                } catch (err) {
                  return {
                    error: err instanceof Error ? err.message : 'Xato yuz berdi.',
                  };
                }
              }}
              onAiCleanPdf={async (items) => {
                try {
                  const res = await apiFetch('/api/ai/clean-pdf', {
                    method: 'POST',
                    body: JSON.stringify({ items }),
                  });
                  return { items: res.items };
                } catch (err) {
                  return {
                    error: err instanceof Error ? err.message : 'Xato yuz berdi.',
                  };
                }
              }}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {(() => {
            const cfg = data.siteConfig || siteConfig;
            const handle = cfg.telegramHandle?.replace(/^@/, '').trim();
            return (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {cfg.authorLabel || 'Milliy Sertifikat'}
                </span>
                {cfg.contactText ? ` · ${trText(cfg.contactText, lang)}` : ''}
                {handle && (
                  <>
                    {' · '}
                    <a
                      href={`https://t.me/${handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      @{handle}
                    </a>{' '}
                    (Telegram)
                  </>
                )}
              </>
            );
          })()}
        </footer>
      </div>

      {payModalTarget.open && (
        <PayModal
          lang={lang}
          payConfig={data.payConfig}
          targetTest={payModalTarget.test}
          onClose={() => setPayModalTarget({ open: false, test: null })}
          onSubmit={async (payload) => {
            try {
              await apiFetch('/api/payments/request', {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              await refreshState();
              setFlash('To‘lov so‘rovi yuborildi. Owner tasdiqlashini kuting.');
              return null;
            } catch (err) {
              return err instanceof Error ? err.message : 'Yuborilmadi.';
            }
          }}
        />
      )}

      {resultTarget && (
        <ResultModal
          test={resultTarget.test}
          attempt={resultTarget.attempt}
          attempts={data.attempts}
          users={data.users}
          currentUserId={data.me.id}
          lang={lang}
          onClose={() => setResultTarget(null)}
        />
      )}
    </div>
  );
}