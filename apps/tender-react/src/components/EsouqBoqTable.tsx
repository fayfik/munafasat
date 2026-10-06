import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { TrashIcon, PlusIcon } from './Icons';
import type { BOQRow } from '../types/tender';

/**
 * Inline-editable spreadsheet for the Etimad eSouq BOQ — one table per group
 * (Product / Service / Vehicle Leasing). Every cell is edited in place; Enter
 * moves down (adding a row at the end), arrows move between rows. The purchase
 * type is fixed per table, so there is no Type column.
 */

export type Group = 'product' | 'service' | 'vehicle-leasing';
export const groupOf = (pt?: string): Group => (pt === 'service' ? 'service' : pt === 'vehicle-leasing' ? 'vehicle-leasing' : 'product');

const GROUP_META: Record<Group, { en: string; ar: string; dot: string }> = {
  'product': { en: 'Product', ar: 'منتج', dot: 'bg-brand-500' },
  'service': { en: 'Service', ar: 'خدمة', dot: 'bg-ai-500' },
  'vehicle-leasing': { en: 'Vehicle Leasing', ar: 'تأجير مركبات', dot: 'bg-warning-500' },
};

const nOf = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
export const fmtMoney = (n: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtQty = (n: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 3 }).format(n);

export function durationText(s?: string, e?: string, isAr = false): string {
  if (!s || !e) return '';
  const a = new Date(s), b = new Date(e);
  if (isNaN(+a) || isNaN(+b) || b < a) return '';
  const days = Math.round((+b - +a) / 86400000);
  const months = Math.round((days / 30.44) * 10) / 10;
  return isAr ? `${days} يوم · ~${months} شهر` : `${days}d · ~${months}mo`;
}

export function rowTotal(r: BOQRow): number {
  if (typeof r.lineTotal === 'number') return r.lineTotal;
  const price = nOf(r.unitPrice);
  if (r.purchaseType === 'product') return price * (nOf(r.quantity) || 1) + nOf(r.shippingCharges);
  return price;
}

type Kind = 'text' | 'num' | 'date' | 'dur';
interface ECol { key: keyof BOQRow; en: string; ar: string; w: number; kind: Kind; money?: boolean; req?: boolean }

const PRODUCT_COLS: ECol[] = [
  { key: 'itemName', en: 'Product name', ar: 'اسم المنتج', w: 210, kind: 'text', req: true },
  { key: 'productId', en: 'Product ID', ar: 'معرّف المنتج', w: 134, kind: 'text' },
  { key: 'supplier', en: 'Supplier', ar: 'المورّد', w: 176, kind: 'text' },
  { key: 'unitPrice', en: 'Price (SAR)', ar: 'السعر', w: 116, kind: 'num', money: true },
  { key: 'orderUnit', en: 'Order unit', ar: 'وحدة الطلب', w: 112, kind: 'text' },
  { key: 'quantity', en: 'Qty', ar: 'الكمية', w: 74, kind: 'num' },
  { key: 'shippingCharges', en: 'Shipping (SAR)', ar: 'الشحن', w: 122, kind: 'num', money: true },
  { key: 'deliveryDate', en: 'Delivery date', ar: 'تاريخ التسليم', w: 152, kind: 'date' },
  { key: 'respName', en: 'Responsible name', ar: 'اسم المسؤول', w: 176, kind: 'text' },
  { key: 'respMobile', en: 'Responsible mobile', ar: 'جوال المسؤول', w: 154, kind: 'text' },
  { key: 'lineTotal', en: 'Total value (SAR)', ar: 'القيمة الإجمالية', w: 146, kind: 'num', money: true },
];

// Service & Vehicle Leasing share the same fields.
const SERVICE_COLS: ECol[] = [
  { key: 'itemName', en: 'Product name', ar: 'اسم المنتج', w: 210, kind: 'text', req: true },
  { key: 'productId', en: 'Product ID', ar: 'معرّف المنتج', w: 134, kind: 'text' },
  { key: 'supplier', en: 'Supplier', ar: 'المورّد', w: 176, kind: 'text' },
  { key: 'unitPrice', en: 'Price (SAR)', ar: 'السعر', w: 116, kind: 'num', money: true },
  { key: 'startDate', en: 'Start date', ar: 'تاريخ البداية', w: 150, kind: 'date' },
  { key: 'endDate', en: 'End date', ar: 'تاريخ النهاية', w: 150, kind: 'date' },
  { key: 'startDate', en: 'Duration', ar: 'المدة', w: 120, kind: 'dur' },
  { key: 'deliveryDate', en: 'Delivery date', ar: 'تاريخ التسليم', w: 152, kind: 'date' },
  { key: 'respName', en: 'Responsible name', ar: 'اسم المسؤول', w: 176, kind: 'text' },
  { key: 'respMobile', en: 'Responsible mobile', ar: 'جوال المسؤول', w: 154, kind: 'text' },
  { key: 'lineTotal', en: 'Total value (SAR)', ar: 'القيمة الإجمالية', w: 146, kind: 'num', money: true },
];

interface Props {
  group: Group;
  rows: BOQRow[];                    // ALL boq rows; the table filters to its group
  onUpdate: (id: string, patch: Partial<BOQRow>) => void;
  onRemove: (id: string) => void;
  onAdd: (group: Group) => string;   // returns new row id
}

export default function EsouqBoqTable({ group, rows, onUpdate, onRemove, onAdd }: Props) {
  const t = useT();
  const { isAr } = useLanguage();
  const COLS = group === 'product' ? PRODUCT_COLS : SERVICE_COLS;
  const meta = GROUP_META[group];
  const tableRef = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef<{ r: number; c: number } | null>(null);

  const gRows = rows.filter((r) => groupOf(r.purchaseType) === group);
  const subtotal = gRows.reduce((s, r) => s + rowTotal(r), 0);
  const TABLE_W = 44 + COLS.reduce((a, c) => a + c.w, 0) + 44;

  useEffect(() => {
    const f = pendingFocus.current;
    if (!f) return;
    pendingFocus.current = null;
    focusCell(f.r, f.c);
  });

  function focusCell(r: number, c: number) {
    const el = tableRef.current?.querySelector<HTMLElement>(`[data-cell="${r}:${c}"]`);
    if (el) { el.focus(); if (el instanceof HTMLInputElement && el.type === 'text') el.select(); }
  }

  function addRow(focusCol = 0) {
    pendingFocus.current = { r: gRows.length, c: focusCol };
    onAdd(group);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTableElement>) {
    const el = e.target as HTMLElement;
    const cell = el.dataset.cell;
    if (!cell) return;
    const [r, c] = cell.split(':').map(Number);
    const isDate = el instanceof HTMLInputElement && el.type === 'date';
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (r === gRows.length - 1) addRow(c); else focusCell(r + 1, c);
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault(); if (r > 0) focusCell(r - 1, c);
    } else if (e.key === 'ArrowDown' && !isDate) {
      e.preventDefault(); if (r < gRows.length - 1) focusCell(r + 1, c);
    } else if (e.key === 'ArrowUp' && !isDate) {
      e.preventDefault(); if (r > 0) focusCell(r - 1, c);
    } else if (e.key === 'Escape') { el.blur(); }
  }

  const td = 'border-b border-e border-neutral-200 p-0 relative focus-within:z-10 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-brand-500';
  const inp = 'block w-full h-9 bg-transparent px-2.5 text-[13px] text-neutral-900 placeholder:text-neutral-300 outline-none';
  const addLabel = group === 'product' ? t('Add product', 'إضافة منتج') : group === 'service' ? t('Add service', 'إضافة خدمة') : t('Add vehicle lease', 'إضافة تأجير مركبة');

  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className="text-sm font-semibold text-neutral-800">{isAr ? meta.ar : meta.en}</span>
        <span className="text-[11px] text-neutral-500 tabular-nums">{gRows.length} {gRows.length === 1 ? t('item', 'بند') : t('items', 'بنود')}</span>
        {subtotal > 0 && <span className="ms-auto text-xs font-semibold text-neutral-700 tabular-nums" dir="ltr">SAR {fmtMoney(subtotal)}</span>}
      </div>

      <div className="overflow-x-auto bg-white">
        <table ref={tableRef} onKeyDown={onKeyDown} className="border-separate border-spacing-0 text-start table-fixed" style={{ width: TABLE_W }}>
          <colgroup>
            <col style={{ width: 44 }} />
            {COLS.map((c, i) => <col key={i} style={{ width: c.w }} />)}
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr className="bg-neutral-100">
              <Th sticky={0} className="text-center">#</Th>
              {COLS.map((c, i) => (
                <Th key={i} sticky={i === 0 ? 44 : undefined} className={c.kind === 'num' ? 'text-end' : ''}>
                  {t(c.en, c.ar)}{c.req && <span className="text-error-500"> *</span>}
                </Th>
              ))}
              <Th><span className="sr-only">{t('Actions', 'إجراءات')}</span></Th>
            </tr>
          </thead>
          <tbody>
            {gRows.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 2} className="px-4 py-7 text-center text-[13px] text-neutral-400 border-b border-neutral-200">
                  {t('No items yet. Add a row below.', 'لا توجد بنود بعد. أضف صفاً أدناه.')}
                </td>
              </tr>
            )}
            {gRows.map((row, r) => {
              const missing = !row.itemName.trim();
              return (
                <tr key={row.id} className="group/row">
                  {/* # */}
                  <td className="sticky start-0 z-20 bg-neutral-50 border-b border-e border-neutral-200 text-center text-[11px] tabular-nums text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      {missing && (row.productId || row.supplier) && <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />}
                      {r + 1}
                    </span>
                  </td>
                  {COLS.map((col, c) => {
                    const cellProps = { 'data-cell': `${r}:${c}`, 'aria-label': `${t(col.en, col.ar)}, ${t('row', 'صف')} ${r + 1}` };
                    const sticky = c === 0;
                    let content: ReactNode;
                    if (col.kind === 'dur') {
                      content = (
                        <input {...cellProps} readOnly tabIndex={-1} className={`${inp} text-neutral-500 bg-neutral-50/40 cursor-default`}
                          value={durationText(row.startDate, row.endDate, isAr) || '—'} />
                      );
                    } else if (col.kind === 'num') {
                      content = (
                        <NumCell {...cellProps} className={inp} value={(row[col.key] as number | '') ?? ''} fmt={col.money ? fmtMoney : fmtQty}
                          placeholder={col.money ? '0.00' : '0'} onChange={(v) => onUpdate(row.id, { [col.key]: v })} />
                      );
                    } else if (col.kind === 'date') {
                      const val = (row[col.key] as string) ?? '';
                      content = <input {...cellProps} type="date" className={`${inp} ${val ? '' : 'text-neutral-300'}`} value={val} onChange={(e) => onUpdate(row.id, { [col.key]: e.target.value })} />;
                    } else {
                      const val = (row[col.key] as string) ?? '';
                      content = (
                        <input {...cellProps} type="text" className={`${inp} ${col.key === 'itemName' ? 'font-medium' : ''}`} value={val} title={val || undefined}
                          placeholder={col.req ? t('Required', 'مطلوب') : ''} onChange={(e) => onUpdate(row.id, { [col.key]: e.target.value })} />
                      );
                    }
                    return (
                      <td key={c} style={sticky ? { insetInlineStart: 44 } : undefined}
                        className={`${td} ${col.kind === 'num' ? 'text-end' : ''} ${missing && col.req ? 'bg-warning-50/50' : ''} ${sticky ? 'sticky z-20 bg-white shadow-[1px_0_0_0_var(--color-neutral-300)]' : ''}`}>
                        {content}
                      </td>
                    );
                  })}
                  {/* Delete */}
                  <td className="border-b border-neutral-200 text-center">
                    <button type="button" onClick={() => onRemove(row.id)} title={t('Delete row', 'حذف الصف')} aria-label={t(`Delete row ${r + 1}`, `حذف الصف ${r + 1}`)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-neutral-300 hover:text-error-500 hover:bg-error-50 transition-colors opacity-60 group-hover/row:opacity-100">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={() => addRow(0)}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-50/60 transition-colors border-t border-neutral-200">
        <PlusIcon className="w-3.5 h-3.5" />{addLabel}
      </button>
    </div>
  );
}

function Th({ children, className = '', sticky }: { children?: ReactNode; className?: string; sticky?: number }) {
  return (
    <th scope="col" style={sticky !== undefined ? { insetInlineStart: sticky } : undefined}
      className={`${sticky !== undefined ? 'sticky z-30 bg-neutral-100' : ''} border-b border-e border-neutral-300 px-2.5 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500 whitespace-nowrap text-start ${className}`}>
      {children}
    </th>
  );
}

/** Number cell: formatted value at rest, raw digits while editing. */
function NumCell({ value, fmt, onChange, className, placeholder, ...rest }: { value: number | ''; fmt: (n: number) => string; onChange: (v: number | '') => void; className: string; placeholder: string; 'data-cell': string; 'aria-label': string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const selectAll = useRef(false);
  useLayoutEffect(() => { if (selectAll.current) { selectAll.current = false; ref.current?.select(); } });
  const parse = (s: string): number | '' => { const clean = s.replace(/,|\s/g, ''); if (!clean) return ''; const num = Number(clean); return Number.isFinite(num) ? num : ''; };
  const shown = draft ?? (value === '' ? '' : fmt(value));
  return (
    <input {...rest} ref={ref} type="text" inputMode="decimal" dir="ltr" className={`${className} text-end tabular-nums`} placeholder={placeholder}
      value={shown}
      onFocus={() => { selectAll.current = true; setDraft(value === '' ? '' : String(value)); }}
      onChange={(e) => { const v = e.target.value.replace(/[^\d.,-]/g, ''); setDraft(v); onChange(parse(v)); }}
      onBlur={() => setDraft(null)} />
  );
}
