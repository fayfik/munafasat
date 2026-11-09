// BOQ line — view mode. One common component for every read-only BOQ table
// (Review & Confirm, Inbox request tab, request detail BOQ items, EA licences,
// GL / Assets tasks). Opened inline (accordion) by the eye icon on a row.
// Simple label / value pairs in two groups: Item · Amount. Purchase type and Material
// group sit with the item; GL details show only in Finance tasks (showGl).
import { useState, type ReactNode } from 'react';
import type { BOQRow } from '../types/tender';
import {
  PURCHASE_TYPES, COMPONENT_ROLES, mgByCode, glFor, suggestAccounting, assetFlagOf,
  type FinPurchaseType, type ComponentRole,
} from '../lib/accounting';

type T = (en: string, ar: string) => string;

export interface BoqFinance {
  purchaseType?: FinPurchaseType;
  materialGroup?: string;
  glSubOverride?: string;
  assetFlag?: 'asset' | 'non-asset';
  componentRole?: ComponentRole;
  /** Suggested by AI (not yet confirmed by the requester / Finance). */
  ai?: boolean;
  costCenter?: string;
  commitmentItem?: string;
}

export interface BoqLineView {
  name: string;
  description?: string;
  category?: { label: string; tone: 'service' | 'material' | 'equipment' | 'manpower' };
  budget?: string;
  unit?: string;
  qty?: string;
  unitPrice?: number;
  total?: number;
  delivery?: string;
  /** Item-specific fields (brand, mandatory list, manpower, Etimad, attachments…). */
  extra?: { label: ReactNode; value: ReactNode; full?: boolean; ltr?: boolean }[];
  finance?: BoqFinance;
}

const sar = (n: number) => 'SAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DOT = { service: 'bg-[#2A6193]', material: 'bg-[#E08E00]', equipment: 'bg-ai-500', manpower: 'bg-success-500' };

export const ViewGlyph = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);

/** Eye button at the end of a BOQ row — expands the row's details inline (accordion). */
export function BoqViewButton({ onClick, label, index, open }: { onClick: () => void; label: string; index: number; open?: boolean }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label} title={label} data-open={open ? 'true' : 'false'} data-boq-view={index}
      className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors ${open ? 'bg-brand-600 text-white' : 'text-neutral-500 hover:text-brand-700 hover:bg-brand-50'}`}>
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

function Field({ label, value, full, ltr, strong }: { label: ReactNode; value: ReactNode; full?: boolean; ltr?: boolean; strong?: boolean }) {
  const empty = value === '' || value == null;
  return (
    <div className={full ? 'col-span-full' : ''}>
      <dt className="text-[11.5px] text-neutral-500">{label}</dt>
      <dd className={`mt-0.5 text-[13px] leading-snug break-words ${strong ? 'font-semibold text-neutral-900' : 'text-neutral-800'} ${empty ? '!text-neutral-300' : ''}`} dir={ltr ? 'ltr' : undefined}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 mb-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-400">{title}</h4>
        <span className="flex-1 h-px bg-neutral-100" />
        {aside}
      </div>
      <dl className="grid grid-cols-2 @[520px]:grid-cols-3 @[760px]:grid-cols-4 gap-x-6 gap-y-3">{children}</dl>
    </section>
  );
}

/** Inline view-mode details under an expanded BOQ row. */
/** View mode for one BOQ line. `showGl` adds GL account / sub-account / asset flag — Finance tasks only. */
export default function BoqLineDetails({ line: l, isAr, t, showGl }: { line: BoqLineView; isAr: boolean; t: T; grandTotal?: number; showGl?: boolean }) {
  const L = (o?: { en: string; ar: string }) => (o ? (isAr ? o.ar : o.en) : '');
  const fmtD = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const f = l.finance;
  const mg = mgByCode(f?.materialGroup);
  const { glMain, glSub } = glFor(f?.materialGroup);
  const total = l.total ?? 0;

  return (
    <div className="@container drill-in bg-white border-t border-neutral-100 px-5 py-4 text-start shadow-[inset_3px_0_0_var(--color-brand-500)] rtl:shadow-[inset_-3px_0_0_var(--color-brand-500)]" data-boq-details data-boq-details-inline>
      <div className="divide-y divide-neutral-100">
        <Group title={t('Item', 'البند')}>
          <Field label={t('Item name', 'اسم البند')} value={l.name} strong full />
          {l.description && <Field label={t('Description', 'الوصف')} value={<span className="whitespace-pre-line">{l.description}</span>} full />}
          <Field label={t('Category', 'التصنيف')} value={l.category && <span className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${DOT[l.category.tone]}`} />{l.category.label}</span>} />
          <Field label={t('Budgeted item', 'البند المعتمد')} value={l.budget} />
          <Field label={<>{t('Purchase type', 'نوع الشراء')}{f?.ai && <span className="ms-1.5 px-1 rounded bg-ai-50 text-ai-700 text-[9.5px] font-bold align-[1px]" title={t('AI-suggested', 'مقترح بالذكاء الاصطناعي')}>AI</span>}</>} value={L(f?.purchaseType ? PURCHASE_TYPES[f.purchaseType] : undefined)} />
          <Field label={t('Material group', 'مجموعة المواد')} value={mg && <>{L(mg)}<span className="block text-neutral-400 text-[11.5px]" dir="ltr">{mg.code}</span></>} />
          {showGl && <>
            <Field label={t('GL account', 'حساب الأستاذ')} value={glMain && <><span dir="ltr">{glMain.code}</span><span className="block text-neutral-400 text-[11.5px]">{L(glMain)}</span></>} />
            <Field label={t('GL sub-account', 'الحساب الفرعي')} value={glSub ? <><span dir="ltr">{glSub.code}</span><span className="block text-neutral-400 text-[11.5px]">{L(glSub)}</span></> : f?.glSubOverride} />
            <Field label={t('Asset / Non-asset', 'أصل / غير أصل')} value={f?.assetFlag ? (f.assetFlag === 'asset' ? t('Asset', 'أصل') : t('Non-asset', 'غير أصل')) : ''} />
            {f?.componentRole && <Field label={t('Component role', 'دور المكوّن')} value={L(COMPONENT_ROLES[f.componentRole])} />}
          </>}
          <Field label={t('Unit of measure', 'وحدة القياس')} value={l.unit} />
          <Field label={t('Delivery date', 'موعد التسليم')} value={fmtD(l.delivery)} />
          {l.extra?.map((x, i) => <Field key={i} {...x} />)}
        </Group>

        <Group title={t('Amount', 'المبلغ')}>
          <Field label={t('Quantity', 'الكمية')} value={l.qty ? `${l.qty} ${l.unit ?? ''}`.trim() : ''} />
          <Field label={t('Unit price', 'سعر الوحدة')} value={l.unitPrice ? sar(l.unitPrice) : ''} ltr />
          <Field label={t('Line total (excl. VAT)', 'إجمالي البند (قبل الضريبة)')} value={total ? sar(total) : ''} ltr />
          <Field label={t('Line total (incl. VAT)', 'إجمالي البند (شامل الضريبة)')} value={total ? sar(total * 1.15) : ''} ltr strong />
        </Group>

      </div>
    </div>
  );
}

/** Finance fields for a line: what was saved, or the AI suggestion from name + description. */
export function financeFor(src: { name: string; description?: string; saved?: Partial<BOQRow> }, extra?: Pick<BoqFinance, 'costCenter' | 'commitmentItem'>): BoqFinance {
  const s = src.saved;
  if (s?.finPurchaseType || s?.materialGroup) {
    return { purchaseType: s.finPurchaseType, materialGroup: s.materialGroup, glSubOverride: s.glSubOverride, assetFlag: assetFlagOf(s as BOQRow), componentRole: s.componentRole, ai: s.acctSource === 'ai', ...extra };
  }
  const g = suggestAccounting(src.name, src.description ?? '');
  if (!g) return { ...extra };
  return { purchaseType: g.finPurchaseType, materialGroup: g.materialGroup, componentRole: g.componentRole, assetFlag: assetFlagOf({ finPurchaseType: g.finPurchaseType }), ai: true, ...extra };
}

/** Adapter for request records (Inbox / request detail). */
export function viewFromRfpLine(l: { itemEn: string; itemAr: string; qty: string; unit: string; unitPrice: number; descEn?: string; descAr?: string; budgetEn?: string; budgetAr?: string; category?: 'Service' | 'Material'; delivery?: string }, isAr: boolean, t: T, costCenter?: string): BoqLineView {
  return {
    name: isAr ? l.itemAr : l.itemEn,
    description: (isAr ? l.descAr : l.descEn) ?? undefined,
    category: l.category ? { label: l.category === 'Service' ? t('Service', 'خدمة') : t('Material', 'مواد'), tone: l.category === 'Service' ? 'service' : 'material' } : undefined,
    budget: (isAr ? l.budgetAr : l.budgetEn) ?? undefined,
    qty: l.qty, unit: l.unit, unitPrice: l.unitPrice,
    total: (Number(l.qty) || 1) * l.unitPrice,
    delivery: l.delivery,
    finance: financeFor({ name: l.itemEn, description: l.descEn }, { costCenter }),
  };
}

/** Cost center shown on a request record (its "Cost center" meta row). */
export const rfpCostCenter = (rfp?: { meta: { label: { en: string }; value: string }[] }) => rfp?.meta.find((m) => m.label.en === 'Cost center')?.value;
