import React, { useState } from 'react';
import { X, Copy, Check, Upload } from 'lucide-react';
import type { LanguageCode, PayConfig, TestItem } from '../types';
import { formatSom, trText } from '../utils/i18n';
import { shrinkImageFile } from '../utils/imageShrink';

interface PayModalProps {
  lang: LanguageCode;
  payConfig: PayConfig;
  targetTest: TestItem | null; // null => Premium subscription
  onClose: () => void;
  onSubmit: (payload: {
    type: 'premium' | 'test';
    tid?: string;
    months?: number;
    note: string;
    img: string;
  }) => Promise<string | null>;
}

export const PayModal: React.FC<PayModalProps> = ({
  lang,
  payConfig,
  targetTest,
  onClose,
  onSubmit,
}) => {
  const tx = (s: string) => trText(s, lang);
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState('');
  const [img, setImg] = useState('');
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const amount = targetTest
    ? targetTest.price
    : (payConfig.price || 25000) * months;

  const handleCopy = () => {
    if (!payConfig.card) return;
    navigator.clipboard?.writeText(payConfig.card.replace(/\s+/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    try {
      const compressed = await shrinkImageFile(file, 900);
      setImg(compressed);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Rasm yuklanmadi.');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!img) {
      setErr('To‘lov cheki rasmini yuklang.');
      return;
    }
    setErr('');
    setBusy(true);
    const errorMsg = await onSubmit({
      type: targetTest ? 'test' : 'premium',
      tid: targetTest?.id,
      months: targetTest ? undefined : months,
      note,
      img,
    });
    setBusy(false);
    if (errorMsg) {
      setErr(errorMsg);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-lg">
              {targetTest ? tx('Pullik test uchun to‘lov') : tx('Premium olish')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {targetTest
                ? targetTest.title
                : tx('Barcha pullik va bepul testlarga cheksiz kirish')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/8 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tx('To‘lov kartasi')}
            </span>
            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 tabular-nums">
              {formatSom(amount, lang)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono font-bold text-base tracking-wide">
                {payConfig.card || tx('Karta raqami kiritilmagan')}
              </div>
              {payConfig.holder && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {payConfig.holder}
                </div>
              )}
            </div>
            {payConfig.card && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? tx('Nusxalandi') : tx('Nusxa')}</span>
              </button>
            )}
          </div>
          {payConfig.note && (
            <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
              {tx(payConfig.note)}
            </p>
          )}
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {!targetTest && (
            <div>
              <label
                htmlFor="pay-months"
                className="block text-sm font-medium mb-1.5"
              >
                {tx('Necha oyga')}
              </label>
              <select
                id="pay-months"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                {[1, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} oy — {formatSom((payConfig.price || 25000) * m, lang)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">
              {tx('To‘lov cheki rasmi')}
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <Upload className="w-5 h-5 text-indigo-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {img ? tx('Chek yuklandi (almashtirish uchun bosing)') : tx('Chek skrinshotini tanlang')}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            {img && (
              <img
                src={img}
                alt="Chek"
                className="mt-2 max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
              />
            )}
          </div>

          <div>
            <label htmlFor="pay-note" className="block text-sm font-medium mb-1.5">
              {tx('Izoh (kartangiz oxirgi 4 raqami)')}
            </label>
            <input
              id="pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={100}
              placeholder="Masalan: Karta oxiri 4412, Click"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          {err && (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {tx(err)}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {tx('Bekor qilish')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold"
            >
              {busy ? tx('Yuborilmoqda…') : tx('So‘rov yuborish')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
