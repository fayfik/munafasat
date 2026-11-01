// Budget checker for the manager's "Review & approve" task: checks the request's
// estimated value against the available budget (SAP Funds Management, simulated)
// on task open and on refresh. Approval is blocked when the budget is insufficient.
import { useCallback, useEffect, useState } from 'react';
import type { Task } from './types';
import { fmtSAR } from './store';

type T = (en: string, ar: string) => string;
export type BudgetState = 'checking' | 'ok' | 'short';

export interface BudgetResult {
  total: number; consumed: number; available: number; value: number;
  remaining: number; remainingPct: number; checkedAt: string;
}

/** Runs the budget check when the task opens and on refresh. */
export function useBudgetCheck(task: Task) {
  const cfg = task.budgetCheck;
  const [state, setState] = useState<BudgetState | null>(cfg ? 'checking' : null);
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!cfg) { setState(null); return; }
    setState('checking');
    const id = window.setTimeout(() => {
      const value = Math.round((task.amount ?? 0) * 1.15); // budget is consumed incl. VAT (15%)
      const available = cfg.total - cfg.consumed;
      const remaining = available - value;
      setResult({ total: cfg.total, consumed: cfg.consumed, available, value, remaining, remainingPct: (remaining / cfg.total) * 100, checkedAt: new Date().toISOString() });
      setState(remaining >= 0 ? 'ok' : 'short');
    }, 1500);
    return () => window.clearTimeout(id);
  }, [task.id, run]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = useCallback(() => setRun((r) => r + 1), []);
  return { state, result, refresh };
}

const compact = (n: number) => 'SAR ' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n);

export function BudgetChecker({ task, state, result, onRefresh, isAr, t }: {
  task: Task; state: BudgetState; result: BudgetResult | null; onRefresh: () => void; isAr: boolean; t: T;
}) {
  const cfg = task.budgetCheck!;
  const checking = state === 'checking' || !result;
  const ok = state === 'ok';
  const time = result ? new Date(result.checkedAt).toLocaleTimeString(isAr ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  // Bar segments as a share of the total budget (shortfall overflows past 100%).
  const scale = result ? Math.max(result.total, result.consumed + result.value) : 1;
  const pct = (n: number) => `${Math.max(0, (n / scale) * 100)}%`;

  const tone = checking
    ? { ring: 'border-[#D5E3F2]', bg: 'from-[#F4F8FC] via-white to-white', accent: 'text-[#2A6193]' }
    : ok ? { ring: 'border-success-200', bg: 'from-success-50/70 via-white to-white', accent: 'text-success-700' }
    : { ring: 'border-error-200', bg: 'from-error-50/70 via-white to-white', accent: 'text-error-700' };

  return (
    <section className={`relative rounded-2xl border ${tone.ring} bg-gradient-to-br ${tone.bg} shadow-sm overflow-hidden`} aria-busy={checking} aria-live="polite" data-budget-state={state}>
      {/* Header */}
      <div className="flex items-start gap-4 p-5 pb-0">
        <BudgetIllustration state={state} />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-neutral-900">{t('Budget checker', 'فحص الميزانية')}</h3>
            {!checking && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold ${ok ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success-500' : 'bg-error-500'}`} />
                {ok ? t('Budget available', 'الميزانية متوفرة') : t('Insufficient budget', 'الميزانية غير كافية')}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-neutral-500 mt-1 leading-relaxed">
            {checking
              ? t('Checking the available budget in SAP Funds Management…', 'جارٍ التحقق من الميزانية المتاحة في نظام إدارة الأموال SAP…')
              : ok
                ? t('The request fits within the available budget. You can approve it.', 'الطلب ضمن الميزانية المتاحة. يمكنك اعتماده.')
                : t('The estimated value exceeds the available budget. Approval is blocked — return the request or ask Finance for a budget transfer.', 'القيمة التقديرية تتجاوز الميزانية المتاحة. الاعتماد غير متاح — أعد الطلب أو اطلب مناقلة ميزانية من المالية.')}
          </p>
          <p className="mt-1.5 text-[11.5px] text-neutral-400" dir="ltr" style={{ textAlign: isAr ? 'right' : 'left' }}>
            {cfg.fundCenter} · {cfg.commitmentItem} · FY{cfg.fiscalYear}
          </p>
        </div>
        <button type="button" onClick={onRefresh} disabled={checking} title={t('Refresh budget check', 'تحديث فحص الميزانية')}
          className="w-9 h-9 rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:text-brand-700 hover:border-brand-300 disabled:opacity-60 flex items-center justify-center flex-shrink-0 shadow-sm">
          <RefreshGlyph className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5">
        <Stat label={t('Total budget available', 'إجمالي الميزانية المتاحة')} value={result ? fmtSAR(result.available) : ''} sub={result ? t(`of ${compact(result.total)} annual budget`, `من ${compact(result.total)} الميزانية السنوية`) : ''} loading={checking} />
        <Stat label={t('Request estimated value', 'القيمة التقديرية للطلب')} value={result ? fmtSAR(result.value) : ''} sub={t('incl. VAT', 'شامل الضريبة')} loading={checking} />
        <Stat label={ok || checking ? t('Remaining if approved', 'المتبقي عند الاعتماد') : t('Shortfall', 'العجز')}
          value={result ? fmtSAR(Math.abs(result.remaining)) : ''}
          sub={result ? (ok ? t(`${result.remainingPct.toFixed(1)}% of annual budget left`, `${result.remainingPct.toFixed(1)}٪ من الميزانية السنوية متبقية`) : t(`Exceeds the available budget by ${((Math.abs(result.remaining) / Math.max(1, result.available)) * 100).toFixed(1)}%`, `تتجاوز الميزانية المتاحة بنسبة ${((Math.abs(result.remaining) / Math.max(1, result.available)) * 100).toFixed(1)}٪`)) : ''}
          loading={checking} emphasis={ok ? 'ok' : 'short'} />
      </div>

      {/* Consumption bar */}
      <div className="px-5 pb-5">
        <div className="relative h-3 rounded-full bg-neutral-100 overflow-hidden" dir="ltr">
          {checking ? (
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#9CBEDF] to-transparent ld-bar" />
          ) : result && (
            <div className="absolute inset-0 flex">
              <span className="h-full bg-neutral-400" style={{ width: pct(result.consumed) }} title={t('Consumed & committed', 'المستهلك والمرتبط')} />
              <span className={`h-full ${ok ? 'bg-[#2A6193]' : 'bg-error-500'} bg-[length:10px_10px]`} style={{ width: pct(result.value), backgroundImage: ok ? undefined : 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 4px, transparent 4px 8px)' }} title={t('This request', 'هذا الطلب')} />
              {ok && <span className="h-full bg-success-400" style={{ width: pct(result.remaining) }} title={t('Remaining', 'المتبقي')} />}
            </div>
          )}
          {!checking && result && !ok && <span className="absolute inset-y-0 w-0.5 bg-neutral-900" style={{ left: pct(result.total) }} title={t('Budget limit', 'حد الميزانية')} />}
        </div>
        <div className="mt-2.5 flex items-center gap-x-4 gap-y-1 flex-wrap text-[11.5px] text-neutral-500">
          <Legend cls="bg-neutral-400" label={t('Consumed & committed', 'المستهلك والمرتبط')} v={result ? compact(result.consumed) : ''} />
          <Legend cls={ok || checking ? 'bg-[#2A6193]' : 'bg-error-500'} label={t('This request', 'هذا الطلب')} v={result ? compact(result.value) : ''} />
          {(ok || checking) && <Legend cls="bg-success-400" label={t('Remaining', 'المتبقي')} v={result ? compact(Math.max(0, result.remaining)) : ''} />}
          {!checking && <span className="ms-auto text-neutral-400">{t('Checked', 'آخر فحص')} {time}</span>}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, loading, emphasis }: { label: string; value: string; sub: string; loading: boolean; emphasis?: 'ok' | 'short' }) {
  const color = emphasis === 'ok' ? 'text-success-700' : emphasis === 'short' ? 'text-error-700' : 'text-neutral-900';
  return (
    <div className="rounded-xl bg-white/80 border border-neutral-200/80 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      {loading ? (
        <><span className="block mt-2 h-5 w-32 rounded-md bg-neutral-200/70 ld-shimmer" /><span className="block mt-2 h-2.5 w-24 rounded bg-neutral-200/60 ld-shimmer" /></>
      ) : (
        <>
          <p className={`mt-1 text-[18px] font-bold tabular-nums ${color}`}><span dir="ltr">{value}</span></p>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">{sub}</p>
        </>
      )}
    </div>
  );
}

function Legend({ cls, label, v }: { cls: string; label: string; v: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />{label}{v && <span className="font-semibold text-neutral-700 tabular-nums" dir="ltr">{v}</span>}</span>;
}

function RefreshGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14.9-3.9L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.9 3.9L20 15" /><path d="M20 20v-5h-5" /></svg>;
}

/** Ledger + coins with a magnifier (checking), shield-check (ok) or alert (short). */
function BudgetIllustration({ state }: { state: BudgetState }) {
  const accent = state === 'ok' ? '#2E8B57' : state === 'short' ? '#D14343' : '#2A6193';
  const soft = state === 'ok' ? '#DDF3E6' : state === 'short' ? '#FBE3E3' : '#E1ECF7';
  return (
    <svg viewBox="0 0 96 96" className="w-[84px] h-[84px] flex-shrink-0" aria-hidden>
      <defs>
        <linearGradient id="bc-coin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6D77A" /><stop offset="1" stopColor="#E0A93B" /></linearGradient>
        <linearGradient id="bc-doc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#EEF2F6" /></linearGradient>
      </defs>
      <circle cx="48" cy="50" r="40" fill={soft} />
      <circle cx="48" cy="50" r="40" fill="none" stroke={accent} strokeOpacity=".15" strokeWidth="1.5" strokeDasharray="3 5" className={state === 'checking' ? 'bc-orbit' : ''} />
      {/* ledger */}
      <g transform="translate(22 20)">
        <rect x="0" y="0" width="38" height="48" rx="5" fill="url(#bc-doc)" stroke="#CBD5E1" />
        <rect x="6" y="8" width="18" height="3" rx="1.5" fill={accent} opacity=".8" />
        {[17, 24, 31, 38].map((y, i) => (
          <g key={y}><rect x="6" y={y} width={i % 2 ? 14 : 20} height="2.5" rx="1.25" fill="#CBD5E1" /><rect x="26" y={y} width="6" height="2.5" rx="1.25" fill="#94A3B8" /></g>
        ))}
      </g>
      {/* coins */}
      <g transform="translate(50 50)">
        {[18, 12, 6, 0].map((y, i) => (
          <g key={y} className={state === 'checking' ? 'bc-coin' : ''} style={{ animationDelay: `${i * 120}ms` }}>
            <ellipse cx="14" cy={y + 6} rx="13" ry="4.5" fill="#C98F28" />
            <ellipse cx="14" cy={y + 3.5} rx="13" ry="4.5" fill="url(#bc-coin)" stroke="#C98F28" strokeWidth=".6" />
          </g>
        ))}
        <text x="14" y="6" textAnchor="middle" fontSize="6" fontWeight="700" fill="#8A5A12">﷼</text>
      </g>
      {/* status badge */}
      {state === 'checking' ? (
        <g className="bc-glass">
          <circle cx="66" cy="32" r="11" fill="white" fillOpacity=".55" stroke={accent} strokeWidth="3" />
          <path d="M74 40l8 8" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : state === 'ok' ? (
        <g className="bc-pop">
          <path d="M70 18l12 4v9c0 8-5.5 13-12 15-6.5-2-12-7-12-15v-9z" fill={accent} />
          <path d="M64.5 31l4 4 7-8" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : (
        <g className="bc-pop">
          <circle cx="70" cy="30" r="12" fill={accent} />
          <path d="M70 23.5v8" stroke="white" strokeWidth="2.8" strokeLinecap="round" /><circle cx="70" cy="36" r="1.7" fill="white" />
        </g>
      )}
    </svg>
  );
}
