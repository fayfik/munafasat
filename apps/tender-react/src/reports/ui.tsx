// Reports module: icons, number formatting and lightweight SVG charts.
import type { ReactNode } from 'react';
import type { Fmt, IconName } from './catalogue';

export type T = (en: string, ar: string) => string;

export function fmtVal(v: number, f: Fmt, compactMoney = false): string {
  if (v == null || Number.isNaN(v)) return '—';
  switch (f) {
    case 'money': return compactMoney ? 'SAR ' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(v) : 'SAR ' + Math.round(v).toLocaleString('en-US');
    case 'pct': return `${v.toFixed(1)}%`;
    case 'days': return `${v.toFixed(v < 10 && v % 1 ? 1 : 0)} d`;
    case 'hours': return `${Math.round(v)} h`;
    case 'num': return v % 1 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US');
    default: return String(v);
  }
}

const P: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  spend: <><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6.4 6.4" /></>,
  pipeline: <><path d="M3 5h18l-6 7v6l-6 3v-9z" /></>,
  trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4.5" cy="6" r="1.2" /><circle cx="4.5" cy="12" r="1.2" /><circle cx="4.5" cy="18" r="1.2" /></>,
  status: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
  hourglass: <><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" /></>,
  return: <><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 14.5h2" /><path d="M6 6V5a2 2 0 0 1 2-2h9" /></>,
  box: <><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  stages: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="8" width="5" height="12" rx="1.5" /><rect x="17" y="12" width="4" height="8" rx="1.5" /></>,
  review: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3M8.5 11l2 2 3.5-4" /></>,
  speed: <><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-6" /><circle cx="12" cy="18" r="1.3" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 5" /></>,
  scale: <><path d="M12 3v18M7 21h10M5 7h14" /><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" /></>,
  savings: <><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.3 0 1.2-1.2 2.1-3 2.1-1.4 0-2.5-.5-3-1.5M12 6.5v11" /></>,
  tasks: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8l1.5 1.5L12 7M8 14l1.5 1.5L12 13M14 8.5h3M14 14.5h3" /></>,
  approval: <><path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  dept: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" /></>,
  bottleneck: <><path d="M4 4h16l-6 8 6 8H4l6-8z" /></>,
  sla: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></>,
  check: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 12l3 3 5-6" /></>,
  alert: <><path d="M12 3l9.5 17H2.5z" /><path d="M12 10v4.5M12 17.5v.5" /></>,
  po: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  chart: <><path d="M3 21h18M6 17V10M11 17V6M16 17v-4M21 17V8" /></>,
  contract: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M8.5 17c1.5-2 2.5 1 4 0s1.5-1 3 0" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 14v3l2 1" /></>,
  gauge: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17V11" /><path d="M7 17h10" /></>,
  truck: <><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
};

export function ReportIcon({ name, className = 'w-5 h-5' }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[name]}</svg>;
}

export const PALETTE = ['#2A6193', '#699843', '#6A47D6', '#E08E00', '#C22C18', '#0E8C8C', '#B5487A', '#868D80', '#3B82F6', '#A16207'];

export interface Datum { label: string; value: number; prev?: number }

/** Vertical bars (optionally with previous-period ghost bars). */
export function BarChart({ data, fmt, onPick, active, color = '#2A6193' }: { data: Datum[]; fmt: Fmt; onPick?: (l: string) => void; active?: string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0)));
  return (
    <div className="h-[160px] flex items-end gap-2 pt-4" dir="ltr">
      {data.map((d) => (
        <button key={d.label} type="button" onClick={() => onPick?.(d.label)} title={`${d.label}: ${fmtVal(d.value, fmt)}${d.prev != null ? ` (prev ${fmtVal(d.prev, fmt)})` : ''}`}
          className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1 group">
          <span className="text-[10px] font-semibold text-neutral-600 tabular-nums whitespace-nowrap">{fmtVal(d.value, fmt, true)}</span>
          <div className="w-full max-w-[42px] flex items-end gap-0.5 h-[100px]">
            {d.prev != null && <span className="flex-1 rounded-t bg-neutral-200" style={{ height: `${(d.prev / max) * 100}%` }} />}
            <span className={`flex-1 rounded-t transition-all ${active === d.label ? 'ring-2 ring-offset-1 ring-neutral-900' : ''} group-hover:opacity-80`} style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }} />
          </div>
          <span className={`text-[10px] leading-tight text-center line-clamp-2 ${active === d.label ? 'text-neutral-900 font-semibold' : 'text-neutral-500'}`}>{d.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Horizontal bars, sorted by value. */
export function HBarChart({ data, fmt, onPick, active, color = '#2A6193' }: { data: Datum[]; fmt: Fmt; onPick?: (l: string) => void; active?: string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0)));
  return (
    <ul className="space-y-1.5">
      {data.map((d) => (
        <li key={d.label}>
          <button type="button" onClick={() => onPick?.(d.label)} className={`w-full text-start group rounded-md px-1 -mx-1 py-0 ${active === d.label ? 'bg-neutral-100' : ''}`}>
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate text-neutral-700 group-hover:text-neutral-950">{d.label}</span>
              <span className="font-semibold text-neutral-800 tabular-nums whitespace-nowrap" dir="ltr">{fmtVal(d.value, fmt, true)}</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-neutral-100 overflow-hidden relative">
              {d.prev != null && <div className="absolute inset-y-0 start-0 bg-neutral-300/70 rounded-full" style={{ width: `${(d.prev / max) * 100}%` }} />}
              <div className="relative h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function DonutChart({ data, fmt, onPick, active, t }: { data: Datum[]; fmt: Fmt; onPick?: (l: string) => void; active?: string; t: T }) {
  const size = 124, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const tot = data.reduce((s, d) => s + d.value, 0) || 1;
  let off = 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
          {data.map((d, i) => { const len = (d.value / tot) * c; const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={active === d.label ? stroke + 4 : stroke} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-off} className="cursor-pointer" onClick={() => onPick?.(d.label)} />; off += len; return el; })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight pointer-events-none">
          <span className="text-[9.5px] uppercase tracking-wide text-neutral-400">{t('Total', 'الإجمالي')}</span>
          <span className={`${fmtVal(tot, fmt, true).length > 9 ? 'text-[11px]' : 'text-[14px]'} font-bold text-neutral-900`} dir="ltr">{fmtVal(tot, fmt, true)}</span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-1">
        {data.map((d, i) => (
          <li key={d.label}>
            <button type="button" onClick={() => onPick?.(d.label)} className={`w-full flex items-center gap-2 text-start text-[12px] rounded-md px-1.5 py-0.5 ${active === d.label ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'}`}>
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate flex-1">{d.label}</span>
              <span className="font-semibold text-neutral-800 tabular-nums">{((d.value / tot) * 100).toFixed(0)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Line chart over ordered periods, with optional comparison series. */
export function LineChart({ data, fmt, onPick, active, color = '#2A6193' }: { data: Datum[]; fmt: Fmt; onPick?: (l: string) => void; active?: string; color?: string }) {
  const W = 520, H = 170, pad = 22;
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0)));
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const path = (k: 'value' | 'prev') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y((d[k] as number) ?? 0)}`).join(' ');
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full h-[170px]">
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={pad} x2={W - pad} y1={y(max * g)} y2={y(max * g)} stroke="#EEF0F2" />)}
        {data.some((d) => d.prev != null) && <path d={path('prev')} fill="none" stroke="#CBD5E1" strokeWidth={2} strokeDasharray="4 4" />}
        <path d={`${path('value')} L${x(data.length - 1)},${H - pad} L${x(0)},${H - pad} Z`} fill={color} opacity={0.08} />
        <path d={path('value')} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={d.label} className="cursor-pointer" onClick={() => onPick?.(d.label)}>
            <title>{`${d.label}: ${fmtVal(d.value, fmt)}`}</title>
            <circle cx={x(i)} cy={y(d.value)} r={active === d.label ? 6 : 4} fill="white" stroke={color} strokeWidth={2} />
            {(data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && <text x={x(i)} y={H + 10} textAnchor="middle" fontSize="10" fill="#6B7280">{d.label}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
