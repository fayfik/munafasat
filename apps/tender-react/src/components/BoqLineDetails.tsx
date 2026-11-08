// Read-only BOQ line details, expanded inline (accordion) under a row by the eye icon.
// Shared by every BOQ table that isn't the editor: Review & Confirm, Inbox request tab,
// EA licences, GL / Assets tasks.
import { useState, type ReactNode } from 'react';

export interface BoqLineView {
  name: string;
  description?: string;
  /** Category chip, e.g. Service / Material. */
  category?: { label: string; tone: 'service' | 'material' | 'equipment' | 'manpower' };
  /** Budgeted (project) item the line belongs to. */
  budget?: string;
  qty?: string;
  unit?: string;
  unitPrice?: number;
  total?: number;
  delivery?: string;
  /** Extra label / value pairs (brand, mandatory list, manpower…). */
  extra?: { label: string; value: ReactNode; full?: boolean; ltr?: boolean }[];
}

type T = (en: string, ar: string) => string;
const sar = (n: number) => 'SAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TONE = {
  service: 'bg-[#EAF2FA] text-[#2A6193] border-[#C9DBEC]',
  material: 'bg-[#FDF1E8] text-[#B4501A] border-[#F5D5BE]',
  equipment: 'bg-ai-50 text-ai-700 border-ai-200',
  manpower: 'bg-success-50 text-success-700 border-success-200',
};

export const ViewGlyph = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);

/** Eye button at the end of a BOQ row — expands the row's details inline (accordion). */
export function BoqViewButton({ onClick, label, index, open }: { onClick: () => void; label: string; index: number; open?: boolean }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} title={label} data-open={open ? 'true' : 'false'} data-boq-view={index}
      className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${open ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:text-brand-700 hover:bg-brand-50'}`}>
      <ViewGlyph />
    </button>
  );
}

/** Open/closed state for a set of BOQ rows. */
export function useBoqOpen() {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setOpen((o) => { const x = new Set(o); if (x.has(i)) x.delete(i); else x.add(i); return x; });
  return { isOpen: (i: number) => open.has(i), toggle };
}

/** Inline details panel shown under an expanded BOQ row. */
export default function BoqLineDetails({ line: l, isAr, t, grandTotal }: { line: BoqLineView; isAr: boolean; t: T; grandTotal?: number }) {
  const share = grandTotal && l.total ? Math.round((l.total / grandTotal) * 100) : null;
  const Field = ({ label, value, full, ltr }: { label: string; value: ReactNode; full?: boolean; ltr?: boolean }) => (
    <div className={full ? 'col-span-2 @[560px]:col-span-3' : ''}>
      <dt className="text-[11px] font-medium text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-neutral-900 font-medium break-words" dir={ltr ? 'ltr' : undefined}>{value === '' || value == null ? <span className="text-neutral-300">—</span> : value}</dd>
    </div>
  );
  return (
    <div className="@container drill-in px-4 py-3.5 bg-neutral-50/70 border-t border-neutral-100 text-start" data-boq-details-inline>
      <div className="flex flex-col @[640px]:flex-row gap-4">
        <div className="@[640px]:w-56 flex-shrink-0 rounded-xl bg-white border border-brand-100 px-3.5 py-3">
          <p className="text-[11px] font-medium text-brand-800/80">{t('Line total (excl. VAT)', 'إجمالي البند (قبل الضريبة)')}</p>
          <p className="text-[17px] font-bold text-brand-800 tabular-nums leading-tight" dir="ltr">{l.total ? sar(l.total) : '—'}</p>
          <p className="mt-0.5 text-[11.5px] text-neutral-600 tabular-nums"><span dir="ltr">{l.qty || '—'} {l.unit ?? ''} × {l.unitPrice ? sar(l.unitPrice) : '—'}</span></p>
          {share != null && <>
            <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.max(2, share)}%` }} /></div>
            <p className="mt-1 text-[11px] text-neutral-500">{t(`${share}% of the BOQ`, `${share}% من الجدول`)}</p>
          </>}
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          {(l.category || l.budget) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {l.category && <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${TONE[l.category.tone]}`}>{l.category.label}</span>}
              {l.budget && <span className="px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-600 text-[11px] font-medium">{l.budget}</span>}
            </div>
          )}
          {l.description && <p className="text-[12.5px] text-neutral-700 leading-relaxed whitespace-pre-line">{l.description}</p>}
          <dl className="grid grid-cols-2 @[560px]:grid-cols-3 gap-x-5 gap-y-2.5">
            <Field label={t('Quantity', 'الكمية')} value={l.qty ? `${l.qty} ${l.unit ?? ''}` : ''} />
            <Field label={t('Unit price', 'سعر الوحدة')} value={l.unitPrice ? sar(l.unitPrice) : ''} ltr />
            <Field label={t('Delivery date', 'موعد التسليم')} value={l.delivery ? new Date(l.delivery).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} />
            {l.extra?.map((x, i) => <Field key={i} {...x} />)}
          </dl>
        </div>
      </div>
    </div>
  );
}

/** Adapter for request records (Inbox / request detail). */
export function viewFromRfpLine(l: { itemEn: string; itemAr: string; qty: string; unit: string; unitPrice: number; descEn?: string; descAr?: string; budgetEn?: string; budgetAr?: string; category?: 'Service' | 'Material'; delivery?: string }, isAr: boolean, t: T): BoqLineView {
  return {
    name: isAr ? l.itemAr : l.itemEn,
    description: (isAr ? l.descAr : l.descEn) ?? undefined,
    category: l.category ? { label: l.category === 'Service' ? t('Service', 'خدمة') : t('Material', 'مواد'), tone: l.category === 'Service' ? 'service' : 'material' } : undefined,
    budget: (isAr ? l.budgetAr : l.budgetEn) ?? undefined,
    qty: l.qty, unit: l.unit, unitPrice: l.unitPrice,
    total: (Number(l.qty) || 1) * l.unitPrice,
    delivery: l.delivery,
  };
}
