import { useEffect, useRef, useState } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import {
  toHijri, fromHijri, hijriMonthLength, hijriMonthName, gregMonthName,
  ymdToUTC, utcToYmd, todayUTC, addDays, formatBoth,
} from '../lib/hijri';

type Cal = 'greg' | 'hijri';

interface Props {
  value: string;                 // YYYY-MM-DD, or ''
  onChange: (v: string) => void;
  min?: string;                  // YYYY-MM-DD — dates before this are disabled
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
}

function CalIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export default function DatePicker({ value, onChange, min, placeholder, id, ariaLabel }: Props) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [cal, setCal] = useState<Cal>('greg');
  const ref = useRef<HTMLDivElement>(null);

  const sel = value ? ymdToUTC(value) : null;
  const minDate = min ? ymdToUTC(min) : null;
  const today = todayUTC();
  const anchor = sel ?? today; // what the calendar opens on

  // Viewed month per calendar.
  const [gy, setGy] = useState(anchor.getUTCFullYear());
  const [gm, setGm] = useState(anchor.getUTCMonth()); // 0-based
  const ah = toHijri(anchor);
  const [hy, setHy] = useState(ah.y);
  const [hm, setHm] = useState(ah.m); // 1-based

  // Re-align the viewed month whenever the picker opens.
  useEffect(() => {
    if (!open) return;
    const a = (value ? ymdToUTC(value) : null) ?? todayUTC();
    setGy(a.getUTCFullYear()); setGm(a.getUTCMonth());
    const h = toHijri(a); setHy(h.y); setHm(h.m);
  }, [open, value]);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const weekdays = isAr
    ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function pick(d: Date) {
    if (minDate && d.getTime() < minDate.getTime()) return;
    onChange(utcToYmd(d));
    setOpen(false);
  }

  function gregPrev() { const m = gm - 1; if (m < 0) { setGm(11); setGy(gy - 1); } else setGm(m); }
  function gregNext() { const m = gm + 1; if (m > 11) { setGm(0); setGy(gy + 1); } else setGm(m); }
  function hijriPrev() { const m = hm - 1; if (m < 1) { setHm(12); setHy(hy - 1); } else setHm(m); }
  function hijriNext() { const m = hm + 1; if (m > 12) { setHm(1); setHy(hy + 1); } else setHm(m); }

  // Build the grid of { date, label, inMonth } cells for the active calendar.
  type Cell = { date: Date; label: number } | null;
  const cells: Cell[] = [];
  if (cal === 'greg') {
    const first = new Date(Date.UTC(gy, gm, 1));
    const startDow = first.getUTCDay();
    const len = new Date(Date.UTC(gy, gm + 1, 0)).getUTCDate();
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= len; d++) cells.push({ date: new Date(Date.UTC(gy, gm, d)), label: d });
  } else {
    const day1 = fromHijri(hy, hm, 1);
    const startDow = day1.getUTCDay();
    const len = hijriMonthLength(hy, hm);
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= len; d++) cells.push({ date: addDays(day1, d - 1), label: d });
  }

  const headTitle = cal === 'greg'
    ? `${gregMonthName(gm, isAr)} ${gy}`
    : `${hijriMonthName(hm, isAr)} ${hy}${isAr ? 'هـ' : ' AH'}`;
  const headSub = cal === 'greg'
    ? (() => { const h = toHijri(new Date(Date.UTC(gy, gm, 15))); return `${hijriMonthName(h.m, isAr)} ${h.y}${isAr ? 'هـ' : ' AH'}`; })()
    : (() => { const g = fromHijri(hy, hm, 15); return `${gregMonthName(g.getUTCMonth(), isAr)} ${g.getUTCFullYear()}`; })();

  const both = value ? formatBoth(value, isAr) : null;
  const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

  const Chevron = ({ dir }: { dir: 'prev' | 'next' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      {(dir === 'prev') !== isAr ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button type="button" id={id} aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-body-md shadow-sm transition-colors ${open ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-neutral-300 hover:border-neutral-400'}`}>
        <CalIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
        <span className={`flex-1 text-start ${both ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {both ? both.greg : (placeholder ?? t('Select a date', 'اختر تاريخاً'))}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {/* Conversion caption below the field */}
      {both && (
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-neutral-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 font-medium">{both.hijri}</span>
          <span className="text-neutral-400">{t('Hijri equivalent', 'التاريخ الهجري')}</span>
        </p>
      )}

      {/* Popover */}
      {open && (
        <div className="absolute z-30 mt-1.5 w-[300px] rounded-2xl border border-neutral-200 bg-white shadow-xl overflow-hidden slide-up">
          {/* Calendar tabs */}
          <div className="p-2.5 pb-0">
            <div role="radiogroup" className="inline-flex w-full rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
              {(['greg', 'hijri'] as Cal[]).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cal === c} onClick={() => setCal(c)}
                  className={`flex-1 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${cal === c ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                  {c === 'greg' ? t('Gregorian', 'ميلادي') : t('Hijri', 'هجري')}
                </button>
              ))}
            </div>
          </div>

          {/* Month header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
            <button type="button" onClick={cal === 'greg' ? gregPrev : hijriPrev} className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors" aria-label={t('Previous month', 'الشهر السابق')}><Chevron dir="prev" /></button>
            <div className="text-center">
              <p className="text-[13.5px] font-bold text-neutral-900 leading-tight">{headTitle}</p>
              <p className="text-[10.5px] text-neutral-400">{headSub}</p>
            </div>
            <button type="button" onClick={cal === 'greg' ? gregNext : hijriNext} className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors" aria-label={t('Next month', 'الشهر التالي')}><Chevron dir="next" /></button>
          </div>

          {/* Weekday row */}
          <div className="grid grid-cols-7 gap-0.5 px-2.5">
            {weekdays.map((w, i) => <div key={i} className="h-7 flex items-center justify-center text-[10.5px] font-semibold text-neutral-400">{w}</div>)}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5 px-2.5 pb-2">
            {cells.map((c, i) => {
              if (!c) return <div key={i} />;
              const disabled = !!minDate && c.date.getTime() < minDate.getTime();
              const selected = !!sel && sameDay(c.date, sel);
              const isToday = sameDay(c.date, today);
              return (
                <button key={i} type="button" disabled={disabled} onClick={() => pick(c.date)}
                  className={`h-9 rounded-lg text-[13px] flex items-center justify-center transition-colors tabular-nums
                    ${selected ? 'bg-brand-600 text-white font-bold shadow-sm'
                      : disabled ? 'text-neutral-300 cursor-not-allowed'
                      : isToday ? 'text-brand-700 font-bold ring-1 ring-inset ring-brand-300 hover:bg-brand-50'
                      : 'text-neutral-700 hover:bg-brand-50'}`}>
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-100 bg-neutral-50/60">
            <button type="button" onClick={() => pick(today)}
              className="text-[12px] font-semibold text-brand-700 hover:text-brand-800 transition-colors">
              {t('Today', 'اليوم')}
            </button>
            {value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                className="text-[12px] font-medium text-neutral-500 hover:text-neutral-700 transition-colors">
                {t('Clear', 'مسح')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
