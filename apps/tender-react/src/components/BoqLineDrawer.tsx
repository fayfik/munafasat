// Read-only "view BOQ line" drawer, shared by every BOQ table that isn't the editor:
// Review & Confirm, Inbox request tab, request detail page, EA licences.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import DrawerClose from './DrawerClose';

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

/** Eye button placed at the end of a BOQ row. */
export function BoqViewButton({ onClick, label, index }: { onClick: () => void; label: string; index: number }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} title={label} data-boq-view={index}
      className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-brand-50 transition-colors">
      <ViewGlyph />
    </button>
  );
}

export default function BoqLineDrawer({ lines, index, onIndex, onClose, isAr, t, grandTotal }: {
  lines: BoqLineView[]; index: number | null; onIndex: (i: number) => void; onClose: () => void; isAr: boolean; t: T; grandTotal?: number;
}) {
  const l = index == null ? null : lines[index];
  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      const fwd = isAr ? 'ArrowLeft' : 'ArrowRight', back = isAr ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd && index < lines.length - 1) onIndex(index + 1);
      if (e.key === back && index > 0) onIndex(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, lines.length, isAr, onIndex]);
  if (!l || index == null) return null;

  const share = grandTotal && l.total ? Math.round((l.total / grandTotal) * 100) : null;
  const Field = ({ label, value, full, ltr }: { label: string; value: ReactNode; full?: boolean; ltr?: boolean }) => (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-[11px] font-medium text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-neutral-900 font-medium break-words" dir={ltr ? 'ltr' : undefined}>{value === '' || value == null ? <span className="text-neutral-300">—</span> : value}</dd>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] backdrop-in" onClick={onClose} role="dialog" aria-modal="true" aria-label={l.name} dir={isAr ? 'rtl' : 'ltr'} data-boq-drawer>
      <div className="relative w-full max-w-[460px] h-full bg-white shadow-2xl flex flex-col drawer-in" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-5 pt-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] font-semibold text-neutral-500 tabular-nums">{t(`BOQ item ${index + 1} of ${lines.length}`, `البند ${index + 1} من ${lines.length}`)}</p>
            <DrawerClose onClose={onClose} label={t('Close', 'إغلاق')} />
          </div>
          <h3 className="mt-2 text-[17px] font-bold text-neutral-900 leading-snug" data-boq-drawer-title>{l.name}</h3>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {l.category && <span className={`px-2 py-0.5 rounded-full border text-[11.5px] font-semibold ${TONE[l.category.tone]}`}>{l.category.label}</span>}
            {l.budget && <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[11.5px] font-medium">{l.budget}</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Amount */}
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-white border border-brand-100 px-4 py-3.5">
            <p className="text-[11.5px] font-medium text-brand-800/80">{t('Line total (excl. VAT)', 'إجمالي البند (قبل الضريبة)')}</p>
            <p className="text-[22px] font-bold text-brand-800 tabular-nums leading-tight" dir="ltr">{l.total ? sar(l.total) : '—'}</p>
            <p className="mt-0.5 text-[12px] text-neutral-600 tabular-nums">
              <span dir="ltr">{l.qty || '—'} {l.unit ?? ''} × {l.unitPrice ? sar(l.unitPrice) : '—'}</span>
              {share != null && <span className="text-neutral-400"> · {t(`${share}% of the BOQ`, `${share}% من الجدول`)}</span>}
            </p>
            {share != null && <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden border border-brand-100"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.max(2, share)}%` }} /></div>}
          </div>

          {l.description && (
            <div>
              <p className="text-[11px] font-medium text-neutral-500">{t('Description', 'الوصف')}</p>
              <p className="mt-1 text-[13px] text-neutral-800 leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
            <Field label={t('Quantity', 'الكمية')} value={l.qty ? `${l.qty} ${l.unit ?? ''}` : ''} />
            <Field label={t('Unit price', 'سعر الوحدة')} value={l.unitPrice ? sar(l.unitPrice) : ''} ltr />
            <Field label={t('Delivery date', 'موعد التسليم')} value={l.delivery ? new Date(l.delivery).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} />
            <Field label={t('Budgeted item', 'البند المعتمد')} value={l.budget ?? ''} />
            {l.extra?.map((x, i) => <Field key={i} {...x} />)}
          </dl>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-neutral-100 flex items-center justify-between gap-2">
          <button type="button" data-boq-prev disabled={index === 0} onClick={() => onIndex(index - 1)}
            className="h-9 px-3 rounded-lg border border-neutral-300 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed">{t('‹ Previous', 'السابق ›')}</button>
          <button type="button" data-boq-next disabled={index === lines.length - 1} onClick={() => onIndex(index + 1)}
            className="h-9 px-3 rounded-lg border border-neutral-300 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed">{t('Next ›', '‹ التالي')}</button>
        </div>
      </div>
    </div>,
    document.body,
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
