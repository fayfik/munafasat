import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useT } from '../context/LanguageContext';
import { UNITS_OF_MEASURE } from '../data/mockData';
import { isStale, needsJustification } from '../lib/etimadCheck';
import EtimadPanel from './EtimadPanel';
import ColumnConfigDrawer from './ColumnConfigDrawer';
import { PlusIcon, TrashIcon, SparklesIcon, ChevronDownIcon, ChevronRightIcon, ColumnsIcon } from './Icons';
import type { BOQRow } from '../types/tender';

/**
 * Variant B of the BOQ step: the whole BOQ as one spreadsheet-style table.
 * Every cell is edited in place; Enter moves down (and adds a row at the end),
 * Tab moves right, and rows can be pasted straight from Excel.
 */

type Key = 'itemName' | 'projectItem' | 'itemDescription' | 'unitOfMeasure' | 'quantity' | 'unitPrice' | 'deliveryDate' | 'hasBrandName' | 'brandJustification' | OptionalKey;
type OptionalKey = 'procurementType' | 'purchaseGroup' | 'materialGroup';

// Editable columns in on-screen order. `c` is the column index used for keyboard moves and paste.
const COLS: { key: Key; en: string; ar: string; w: number; header: string[] }[] = [
  { key: 'itemName', en: 'Item name', ar: 'اسم البند', w: 184, header: ['item name', 'item'] },
  { key: 'projectItem', en: 'Project item', ar: 'بند المشروع', w: 160, header: ['project item', 'project item classification'] },
  { key: 'unitOfMeasure', en: 'Unit', ar: 'الوحدة', w: 88, header: ['unit of measure', 'unit', 'uom'] },
  { key: 'quantity', en: 'Qty', ar: 'الكمية', w: 64, header: ['quantity', 'qty'] },
  { key: 'unitPrice', en: 'Unit price (SAR)', ar: 'سعر الوحدة', w: 110, header: ['unit price (sar)', 'unit price', 'price'] },
  { key: 'itemDescription', en: 'Description', ar: 'الوصف', w: 260, header: ['description', 'item description'] },
  { key: 'deliveryDate', en: 'Delivery date', ar: 'موعد التسليم', w: 140, header: ['delivery date', 'date'] },
  { key: 'hasBrandName', en: 'Brand?', ar: 'علامة تجارية؟', w: 84, header: ['has brand name (yes/no)', 'has brand name', 'brand'] },
  { key: 'brandJustification', en: 'Brand justification', ar: 'مبرر العلامة التجارية', w: 240, header: ['brand justification'] },
];
// Column order of the downloadable BOQ Excel template.
const TEMPLATE_ORDER: Key[] = ['projectItem', 'itemName', 'itemDescription', 'unitOfMeasure', 'quantity', 'unitPrice', 'deliveryDate', 'hasBrandName', 'brandJustification'];
// Optional columns, off by default; turned on from the column configuration drawer.
const OPTIONAL_COLS: { key: OptionalKey; en: string; ar: string; w: number; header: string[]; options: string[] }[] = [
  { key: 'procurementType', en: 'Procurement type', ar: 'نوع الشراء', w: 150, header: ['procurement type'], options: ['Goods', 'Services', 'Works', 'Consulting'] },
  { key: 'purchaseGroup', en: 'Purchase group', ar: 'مجموعة الشراء', w: 210, header: ['purchase group'], options: ['P10 · IT hardware & software', 'P20 · IT services', 'P30 · Professional services', 'P40 · Facilities & maintenance', 'P50 · Office supplies'] },
  { key: 'materialGroup', en: 'Material group', ar: 'مجموعة المواد', w: 210, header: ['material group'], options: ['MG-101 · Software', 'MG-102 · Computer hardware', 'MG-201 · IT consulting', 'MG-202 · Implementation services', 'MG-301 · Training', 'MG-401 · Furniture', 'MG-402 · Building works', 'MG-501 · Consumables'] },
];

/** Default columns as listed in the column configuration drawer (always on). */
const DEFAULT_COLUMN_LIST = [
  { key: 'no', en: 'Item No.', ar: 'رقم البند' },
  { key: 'itemName', en: 'Item Name', ar: 'اسم البند' },
  { key: 'projectItem', en: 'Project Item', ar: 'بند المشروع' },
  { key: 'unitOfMeasure', en: 'Unit of Measure', ar: 'وحدة القياس' },
  { key: 'quantity', en: 'Quantity', ar: 'الكمية' },
  { key: 'unitPrice', en: 'Unit Price (SAR)', ar: 'سعر الوحدة (ر.س)' },
  { key: 'total', en: 'Total (SAR)', ar: 'الإجمالي (ر.س)' },
  { key: 'itemDescription', en: 'Description', ar: 'الوصف' },
  { key: 'deliveryDate', en: 'Delivery Date', ar: 'موعد التسليم' },
  { key: 'hasBrandName', en: 'Has Brand Name', ar: 'هل يوجد علامة تجارية' },
  { key: 'brandJustification', en: 'Brand Justification', ar: 'مبرر العلامة التجارية' },
  { key: 'etimad', en: 'Etimad Souq', ar: 'سوق اعتماد' },
  { key: 'actions', en: 'Actions', ar: 'الإجراءات' },
];

const TOTAL_AFTER = COLS.findIndex((c) => c.key === 'unitPrice'); // read-only Total sits after Unit price

const fmtMoney = (n: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtQty = (n: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 3 }).format(n);

function parseNum(s: string): number | '' {
  const clean = s.replace(/sar|ر\.س|,|\s/gi, '');
  if (!clean) return '';
  const n = Number(clean);
  return Number.isFinite(n) ? n : '';
}

function parseDate(s: string): string {
  const v = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const n = Number(v); // Excel serial date
  if (Number.isFinite(n) && n > 20000 && n < 80000) return new Date(Math.round((n - 25569) * 864e5)).toISOString().slice(0, 10);
  return '';
}

function fromText(key: Key, raw: string): Partial<BOQRow> {
  const s = raw.trim();
  switch (key) {
    case 'quantity': case 'unitPrice': return { [key]: parseNum(s) };
    case 'deliveryDate': return { deliveryDate: parseDate(s) };
    case 'hasBrandName': return { hasBrandName: /^(y|yes|true|1|نعم)$/i.test(s) };
    case 'unitOfMeasure': return { unitOfMeasure: UNITS_OF_MEASURE.find((u) => u.toLowerCase() === s.toLowerCase()) ?? (s ? s : 'Each') };
    default: return { [key]: s };
  }
}

const blankRow = (): BOQRow => ({ id: crypto.randomUUID(), projectItem: '', itemName: '', itemDescription: '', unitOfMeasure: 'Each', quantity: '', unitPrice: '', deliveryDate: '', hasBrandName: false, brandJustification: '' });

interface Props {
  rows: BOQRow[];
  setRows: (rows: BOQRow[]) => void;
  projectItemOptions: string[];
  checkingIds: Set<string>;
  onCheck: (row: BOQRow) => void;
  onMove: (row: BOQRow) => Promise<'moved' | 'preview' | 'error'>;
  onUpdate: (id: string, patch: Partial<BOQRow>) => void;
  onRemove: (id: string) => void;
  /** Optional columns the user has turned on. */
  optionalColumns: string[];
  onOptionalColumnsChange: (keys: string[]) => void;
}

export default function BoqSheet({ rows, setRows, projectItemOptions, checkingIds, onCheck, onMove, onUpdate, onRemove, optionalColumns, onOptionalColumnsChange }: Props) {
  const t = useT();
  const [showColumns, setShowColumns] = useState(false);
  const [hdrHover, setHdrHover] = useState(false);
  // Visible columns: the defaults, then any optional ones turned on (in catalogue order).
  const cols: { key: Key; en: string; ar: string; w: number; header: string[]; options?: string[] }[] = [...COLS, ...OPTIONAL_COLS.filter((c) => optionalColumns.includes(c.key))];
  const tableW = 40 + cols.reduce((a, c) => a + c.w, 0) + 124 + 150 + 40;
  const tableRef = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef<{ r: number; c: number } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [pasteNote, setPasteNote] = useState('');

  // Open the Etimad details automatically when a check comes back "available".
  const seen = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const add: string[] = [];
    rows.forEach((r) => {
      const s = r.etimadCheck && !isStale(r) ? r.etimadCheck.status + r.etimadCheck.checkedAt : '';
      if (s && seen.current.get(r.id) !== s && r.etimadCheck?.status === 'available') add.push(r.id);
      seen.current.set(r.id, s);
    });
    if (add.length) setOpen((p) => new Set([...p, ...add]));
  }, [rows]);

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
    pendingFocus.current = { r: rows.length, c: focusCol };
    setRows([...rows, blankRow()]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTableElement>) {
    const el = e.target as HTMLElement;
    const cell = el.dataset.cell;
    if (!cell) return;
    const [r, c] = cell.split(':').map(Number);
    const isSelect = el.tagName === 'SELECT';
    const isDate = el instanceof HTMLInputElement && el.type === 'date';
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (r === rows.length - 1) addRow(c); else focusCell(r + 1, c);
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault(); if (r > 0) focusCell(r - 1, c);
    } else if (e.key === 'ArrowDown' && !isSelect && !isDate) {
      e.preventDefault(); if (r < rows.length - 1) focusCell(r + 1, c);
    } else if (e.key === 'ArrowUp' && !isSelect && !isDate) {
      e.preventDefault(); if (r > 0) focusCell(r - 1, c);
    } else if (e.key === 'Escape') {
      el.blur();
    }
  }

  // Paste a block of cells from Excel / Google Sheets (tab-separated).
  function onPaste(e: ClipboardEvent<HTMLTableElement>) {
    const el = e.target as HTMLElement;
    const cell = el.dataset.cell;
    const text = e.clipboardData.getData('text/plain');
    if (!cell || !text || (!text.includes('\t') && !/\n./.test(text.trim()))) return; // single value: normal paste
    e.preventDefault();
    const [r0, c0] = cell.split(':').map(Number);
    let lines = text.replace(/\r/g, '').split('\n').filter((l, i, a) => l.trim() || i < a.length - 1).map((l) => l.split('\t'));
    lines = lines.filter((l) => l.some((v) => v.trim()));
    // A header row (e.g. from the downloaded template) maps columns by name.
    // Whole template rows (6+ columns pasted into the first column) use the Excel template's order;
    // anything narrower fills the on-screen columns from the cell you pasted into.
    let keys: (Key | null)[] = c0 === 0 && (lines[0]?.length ?? 0) >= 6 ? TEMPLATE_ORDER : cols.slice(c0).map((col) => col.key);
    const head = lines[0]?.map((h) => h.trim().toLowerCase());
    if (head && head.filter((h) => cols.some((col) => col.header.includes(h))).length >= 2) {
      keys = head.map((h) => cols.find((col) => col.header.includes(h))?.key ?? null);
      lines = lines.slice(1);
    }
    const next = [...rows];
    lines.forEach((vals, i) => {
      const ri = r0 + i;
      if (!next[ri]) next.push(blankRow());
      let patch: Partial<BOQRow> = {};
      vals.forEach((v, j) => { const k = keys[j]; if (k) patch = { ...patch, ...fromText(k, v) }; });
      if (patch.hasBrandName === false) patch.brandJustification = '';
      next[ri] = { ...next[ri], ...patch };
    });
    setRows(next);
    const added = Math.max(0, r0 + lines.length - rows.length);
    setPasteNote(t(`Pasted ${lines.length} row${lines.length === 1 ? '' : 's'}${added ? `, ${added} new` : ''}.`, `تم لصق ${lines.length} صف${added ? `، ${added} جديد` : ''}.`));
    window.setTimeout(() => setPasteNote(''), 4000);
  }

  const total = (r: BOQRow) => (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
  const options = (r: BOQRow) => (r.projectItem && !projectItemOptions.includes(r.projectItem) ? [...projectItemOptions, r.projectItem] : projectItemOptions);
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const colCount = cols.length + 4; // #, total, etimad, actions

  const td = 'border-b border-e border-neutral-200 p-0 relative focus-within:z-10 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-brand-500';
  const inp = 'block w-full h-9 bg-transparent px-2 text-[13px] text-neutral-900 placeholder:text-neutral-300 outline-none';

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-[11px] text-neutral-500">
        <span>{t('Click any cell to edit. Enter moves down, Tab moves right. Paste rows from the Excel template. Scroll right for description, date, brand and Etimad.', 'انقر أي خلية للتعديل. Enter للأسفل، Tab لليمين. الصق الصفوف من نموذج Excel. مرّر لليمين للوصف والتاريخ والعلامة واعتماد.')}</span>
        {pasteNote && <span className="ms-auto text-success-700 font-medium">{pasteNote}</span>}
      </div>

      <div className="relative">
      {/* Column configuration — a borderless icon that appears while the header row is hovered
          (always visible on touch screens and when focused with the keyboard). */}
      <div
        className={`pointer-events-none absolute top-px end-px z-40 h-[31px] flex items-center ps-5 pe-1.5 rounded-se-[7px] bg-gradient-to-l rtl:bg-gradient-to-r from-neutral-100 from-60% to-transparent transition-opacity duration-150 ${
          hdrHover || showColumns ? 'opacity-100' : 'opacity-0 [@media(hover:none)]:opacity-100 focus-within:opacity-100'
        }`}
        onMouseEnter={() => setHdrHover(true)}
        onMouseLeave={() => setHdrHover(false)}
      >
        <button
          type="button"
          onClick={() => setShowColumns(true)}
          title={t('Column configuration', 'إعداد الأعمدة')}
          aria-label={t('Column configuration', 'إعداد الأعمدة')}
          className="pointer-events-auto relative w-6 h-6 rounded-md flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-neutral-200/70 transition-colors"
        >
          <ColumnsIcon className="w-4 h-4" />
          {optionalColumns.length > 0 && <span className="absolute top-0.5 end-0.5 w-1.5 h-1.5 rounded-full bg-brand-600" />}
        </button>
      </div>
      <div className="rounded-lg border border-neutral-300 overflow-x-auto bg-white">
        <table ref={tableRef} onKeyDown={onKeyDown} onPaste={onPaste} className="border-separate border-spacing-0 text-start table-fixed" style={{ width: tableW }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {cols.map((c, i) => [<col key={c.key} style={{ width: c.w }} />, i === TOTAL_AFTER ? <col key="total" style={{ width: 124 }} /> : null])}
            <col style={{ width: 150 }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead onMouseEnter={() => setHdrHover(true)} onMouseLeave={() => setHdrHover(false)}>
            <tr className="bg-neutral-100">
              <Th sticky={0} className="text-center">#</Th>
              {cols.map((c, i) => [
                <Th key={c.key} sticky={i === 0 ? 40 : undefined} className={c.key === 'quantity' || c.key === 'unitPrice' ? 'text-end' : ''}>
                  {t(c.en, c.ar)}{(c.key === 'itemName' || c.key === 'projectItem') && <span className="text-error-500"> *</span>}
                </Th>,
                i === TOTAL_AFTER ? <Th key="total" className="text-end">{t('Total (SAR)', 'الإجمالي (ر.س)')}</Th> : null,
              ])}
              <Th>{t('Etimad Souq', 'سوق اعتماد')}</Th>
              <Th><span className="sr-only">{t('Actions', 'إجراءات')}</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-sm text-neutral-400 border-b border-neutral-200">
                  {t('No items yet. Add a row, paste rows from Excel, or use AI Suggest.', 'لا توجد بنود. أضف صفاً أو الصق من Excel أو استخدم اقتراح الذكاء الاصطناعي.')}
                </td>
              </tr>
            )}
            {rows.map((row, r) => {
              const missing = !row.itemName.trim() || !row.projectItem;
              const brandMissing = !!row.hasBrandName && !(row.brandJustification ?? '').trim();
              const isOpen = open.has(row.id);
              return [
                <tr key={row.id} className="group/row">
                  {/* # */}
                  <td className="sticky start-0 z-20 bg-neutral-50 border-b border-e border-neutral-200 text-center text-[11px] tabular-nums text-neutral-400" title={missing ? t('Item name and project item are required.', 'اسم البند وبند المشروع مطلوبان.') : undefined}>
                    <span className="inline-flex items-center gap-1">
                      {(missing || brandMissing) && row.itemName + row.projectItem !== '' && <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />}
                      {r + 1}
                    </span>
                  </td>
                  {cols.map((col, c) => {
                    const cellProps = { 'data-cell': `${r}:${c}`, 'aria-label': `${t(col.en, col.ar)}, ${t('row', 'صف')} ${r + 1}` };
                    let content: ReactNode;
                    let extra = '';
                    switch (col.key) {
                      case 'projectItem':
                        extra = !row.projectItem && row.itemName ? 'bg-warning-50/60' : '';
                        content = (
                          <SelectCell {...cellProps} value={row.projectItem} onChange={(v) => onUpdate(row.id, { projectItem: v })}>
                            <option value="">{t('Select…', 'اختر…')}</option>
                            {options(row).map((o) => <option key={o} value={o}>{o}</option>)}
                          </SelectCell>
                        );
                        break;
                      case 'unitOfMeasure':
                        content = (
                          <SelectCell {...cellProps} value={row.unitOfMeasure || 'Each'} onChange={(v) => onUpdate(row.id, { unitOfMeasure: v })}>
                            {[...new Set([...UNITS_OF_MEASURE, row.unitOfMeasure || 'Each'])].map((u) => <option key={u} value={u}>{u}</option>)}
                          </SelectCell>
                        );
                        break;
                      case 'hasBrandName':
                        extra = row.hasBrandName ? 'bg-warning-50/60' : '';
                        content = (
                          <SelectCell {...cellProps} value={row.hasBrandName ? 'yes' : 'no'} onChange={(v) => onUpdate(row.id, v === 'yes' ? { hasBrandName: true } : { hasBrandName: false, brandJustification: '' })}>
                            <option value="no">{t('No', 'لا')}</option>
                            <option value="yes">{t('Yes', 'نعم')}</option>
                          </SelectCell>
                        );
                        break;
                      case 'quantity':
                      case 'unitPrice':
                        content = (
                          <NumCell {...cellProps} className={inp} value={row[col.key]} fmt={col.key === 'unitPrice' ? fmtMoney : fmtQty}
                            placeholder={col.key === 'quantity' ? '0' : '0.00'} onChange={(v) => onUpdate(row.id, { [col.key]: v })} />
                        );
                        break;
                      case 'deliveryDate':
                        content = <input {...cellProps} type="date" className={`${inp} ${row.deliveryDate ? '' : 'text-neutral-300'}`} value={row.deliveryDate} onChange={(e) => onUpdate(row.id, { deliveryDate: e.target.value })} />;
                        break;
                      case 'brandJustification':
                        if (!row.hasBrandName) {
                          extra = 'bg-neutral-50';
                          content = <input {...cellProps} type="text" disabled className={`${inp} cursor-not-allowed`} placeholder="—" value="" />;
                        } else {
                          extra = brandMissing ? 'bg-error-50/60' : '';
                          content = (
                            <input {...cellProps} type="text" className={inp} value={row.brandJustification ?? ''} title={row.brandJustification || undefined}
                              placeholder={t('Required: why this brand?', 'مطلوب: لماذا هذه العلامة؟')} onChange={(e) => onUpdate(row.id, { brandJustification: e.target.value })} />
                          );
                        }
                        break;
                      case 'procurementType':
                      case 'purchaseGroup':
                      case 'materialGroup': {
                        const val = (row[col.key] as string | undefined) ?? '';
                        const opts = col.options ?? [];
                        content = (
                          <SelectCell {...cellProps} value={val} onChange={(v) => onUpdate(row.id, { [col.key]: v })}>
                            <option value="">{t('Select…', 'اختر…')}</option>
                            {(val && !opts.includes(val) ? [...opts, val] : opts).map((o) => <option key={o} value={o}>{o}</option>)}
                          </SelectCell>
                        );
                        break;
                      }
                      default:
                        content = (
                          <input {...cellProps} type="text" className={`${inp} ${col.key === 'itemName' ? 'font-medium' : ''}`} value={row[col.key] as string} title={(row[col.key] as string) || undefined}
                            placeholder={col.key === 'itemName' ? t('Item name', 'اسم البند') : ''} onChange={(e) => onUpdate(row.id, { [col.key]: e.target.value })} />
                        );
                    }
                    return [
                      <td key={col.key} style={c === 0 ? { insetInlineStart: 40 } : undefined} className={`${td} ${extra} ${c === 0 ? 'sticky z-20 bg-white shadow-[1px_0_0_0_var(--color-neutral-300)]' : ''}`}>{content}</td>,
                      c === TOTAL_AFTER ? (
                        <td key="total" className="border-b border-e border-neutral-200 bg-neutral-50 px-2 text-end text-[13px] font-semibold tabular-nums text-neutral-900" dir="ltr">
                          {total(row) > 0 ? fmtMoney(total(row)) : <span className="text-neutral-300 font-normal">—</span>}
                        </td>
                      ) : null,
                    ];
                  })}
                  {/* Etimad */}
                  <td className="border-b border-e border-neutral-200 px-1.5">
                    <EtimadChip row={row} checking={checkingIds.has(row.id)} open={isOpen} onCheck={() => onCheck(row)} onToggle={() => toggle(row.id)} />
                  </td>
                  {/* Delete */}
                  <td className="border-b border-neutral-200 text-center">
                    <button type="button" onClick={() => onRemove(row.id)} title={t('Delete row', 'حذف الصف')} aria-label={t(`Delete row ${r + 1}`, `حذف الصف ${r + 1}`)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-neutral-300 hover:text-error-500 hover:bg-error-50 transition-colors">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>,
                isOpen && row.etimadCheck ? (
                  <tr key={row.id + '-etimad'}>
                    <td className="sticky start-0 z-20 bg-neutral-50 border-b border-e border-neutral-200" />
                    <td colSpan={colCount - 1} className="border-b border-neutral-200 bg-neutral-50/60 p-0">
                      <div className="sticky w-[min(640px,calc(100vw-120px))] p-2.5" style={{ insetInlineStart: 40 }}>
                        <p className="text-[11px] font-semibold text-neutral-500 mb-1.5 truncate">{t('Etimad Souq check for', 'نتيجة سوق اعتماد لـ')} “{row.itemName || t('row', 'صف') + ' ' + (r + 1)}”</p>
                        <EtimadPanel row={row} checking={checkingIds.has(row.id)} onCheck={() => onCheck(row)} onMove={() => onMove(row)} onUpdate={(patch) => onUpdate(row.id, patch)} />
                      </div>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>
      </div>

      {showColumns && (
        <ColumnConfigDrawer
          defaults={DEFAULT_COLUMN_LIST}
          optional={OPTIONAL_COLS.map(({ key, en, ar }) => ({ key, en, ar }))}
          enabled={optionalColumns}
          onChange={onOptionalColumnsChange}
          onClose={() => setShowColumns(false)}
        />
      )}

      <button type="button" onClick={() => addRow(0)} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm">
        <PlusIcon className="w-3.5 h-3.5" />
        {t('Add row', 'إضافة صف')}
      </button>
    </div>
  );
}

function Th({ children, className = '', sticky }: { children?: ReactNode; className?: string; sticky?: number }) {
  return (
    <th
      scope="col"
      style={sticky !== undefined ? { insetInlineStart: sticky } : undefined}
      className={`${sticky !== undefined ? 'sticky z-30 bg-neutral-100' : ''} border-b border-e border-neutral-300 px-2 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500 whitespace-nowrap text-start ${className}`}
    >
      {children}
    </th>
  );
}

function SelectCell({ value, onChange, children, ...rest }: { value: string; onChange: (v: string) => void; children: ReactNode; 'data-cell': string; 'aria-label': string }) {
  return (
    <div className="relative">
      <select {...rest} value={value} onChange={(e) => onChange(e.target.value)}
        className={`block w-full h-9 appearance-none bg-transparent ps-2 pe-6 text-[13px] outline-none cursor-pointer truncate ${value ? 'text-neutral-900' : 'text-neutral-400'}`}>
        {children}
      </select>
      <ChevronDownIcon className="w-3 h-3 text-neutral-400 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/** Number cell: shows a formatted value, raw digits while editing. */
function NumCell({ value, fmt, onChange, className, placeholder, ...rest }: { value: number | ''; fmt: (n: number) => string; onChange: (v: number | '') => void; className: string; placeholder: string; 'data-cell': string; 'aria-label': string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const selectAll = useRef(false);
  useLayoutEffect(() => { if (selectAll.current) { selectAll.current = false; ref.current?.select(); } });
  const shown = draft ?? (value === '' ? '' : fmt(value));
  return (
    <input {...rest} ref={ref} type="text" inputMode="decimal" dir="ltr" className={`${className} text-end tabular-nums`} placeholder={placeholder}
      value={shown}
      onFocus={() => { selectAll.current = true; setDraft(value === '' ? '' : String(value)); }}
      onChange={(e) => { const v = e.target.value.replace(/[^\d.,-]/g, ''); setDraft(v); onChange(parseNum(v)); }}
      onBlur={() => setDraft(null)} />
  );
}

function EtimadChip({ row, checking, open, onCheck, onToggle }: { row: BOQRow; checking: boolean; open: boolean; onCheck: () => void; onToggle: () => void }) {
  const t = useT();
  const base = 'w-full inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors';
  if (checking) {
    return <span className={`${base} bg-ai-50 text-ai-700 border-ai-200`}><SparklesIcon className="w-3 h-3 spin-slow" />{t('Checking…', 'جاري التحقق…')}</span>;
  }
  const check = row.etimadCheck;
  if (!check || isStale(row)) {
    return (
      <button type="button" onClick={onCheck} disabled={!row.itemName.trim()} title={!row.itemName.trim() ? t('Add an item name first.', 'أضف اسم البند أولاً.') : undefined}
        className={`${base} bg-white text-ai-700 border-ai-200 hover:bg-ai-50 disabled:opacity-40 disabled:cursor-not-allowed`}>
        <SparklesIcon className="w-3 h-3" />{check ? t('Changed · recheck', 'تغيّر · أعد التحقق') : t('Check', 'تحقق')}
      </button>
    );
  }
  let label: string; let tone: string;
  if (check.status === 'available') {
    if (!row.etimadKeep) { label = t('In Etimad Souq', 'متوفر في السوق'); tone = 'bg-warning-50 text-warning-700 border-warning-100'; }
    else if (needsJustification(row)) { label = t('Kept · needs reason', 'مُبقى · يحتاج مبرراً'); tone = 'bg-error-50 text-error-700 border-error-100'; }
    else { label = t('Kept · justified', 'مُبقى · مبرر'); tone = 'bg-success-50 text-success-700 border-success-100'; }
  } else if (check.status === 'not-available') { label = t('Not in Souq', 'غير متوفر في السوق'); tone = 'bg-success-50 text-success-700 border-success-100'; }
  else { label = t('Unclear', 'غير واضح'); tone = 'bg-neutral-50 text-neutral-600 border-neutral-200'; }
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className={`${base} ${tone} hover:brightness-95`}>
      <ChevronRightIcon className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}
