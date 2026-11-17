import React from 'react';
import { Crown, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type {
  LanguageCode,
  PayConfig,
  PaymentRequest,
  UserProfile,
} from '../types';
import { formatSom, trText } from '../utils/i18n';

interface PremiumViewProps {
  user: UserProfile;
  payConfig: PayConfig;
  myRequests: PaymentRequest[];
  lang: LanguageCode;
  onOpenPremiumPay: () => void;
}

export const PremiumView: React.FC<PremiumViewProps> = ({
  user,
  payConfig,
  myRequests,
  lang,
  onOpenPremiumPay,
}) => {
  const tx = (s: string) => trText(s, lang);
  const now = Date.now();
  const isPrem = user.role !== 'user' || (user.prem || 0) > now;
  const sorted = [...myRequests].sort((a, b) => b.at - a.at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
          <Crown className="w-6 h-6 text-amber-500" />
          <span>{tx('Premium va To‘lovlar')}</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {tx(
            'Premium obuna bilan barcha pullik mock testlar, attestatsiya sinovlari va batafsil tahlillar cheklovsiz ochiladi.'
          )}
        </p>
      </div>

      {isPrem && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {user.role !== 'user'
            ? tx('Admin va Owner hisoblarida barcha testlar cheklovsiz ochiq.')
            : `${tx('Premium obuna faol')}: ${new Date(user.prem).toLocaleDateString('uz-UZ')} ${tx('gacha')}.`}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-display text-2xl font-extrabold tabular-nums">
            {formatSom(payConfig.price || 25000, lang)}{' '}
            <span className="text-sm font-normal text-slate-500">
              / {tx('oy')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tx('Istalgan muddatga obuna olishingiz yoki har bir pullik test uchun alohida to‘lov qilishingiz mumkin.')}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPremiumPay}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold whitespace-nowrap"
        >
          {tx('Premium sotib olish')}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">
          {tx('Mening to‘lov so‘rovlarim')}
        </h2>
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-6 text-center text-sm text-slate-500">
            {tx('Hali to‘lov so‘rovlari yuborilmagan.')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1526] p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold text-sm">
                    {r.type === 'test'
                      ? r.testTitle || tx('Pullik test')
                      : `Premium · ${r.months || 1} oy`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {formatSom(r.amount, lang)} ·{' '}
                    {new Date(r.at).toLocaleString('uz-UZ')}
                    {r.note ? ` · ${r.note}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {r.status === 'ok' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      {tx('Tasdiqlandi (Pul tushdi)')}
                    </span>
                  ) : r.status === 'no' ? (
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <XCircle className="w-4 h-4" />
                      {tx('Rad etildi')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                      {tx('Kutilmoqda')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
