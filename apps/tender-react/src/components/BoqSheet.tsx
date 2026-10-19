import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { UNITS_OF_MEASURE } from '../data/mockData';
import { isStale, needsJustification, isPendingProcurement } from '../lib/etimadCheck';
import EtimadPanel from './EtimadPanel';
import { PlusIcon, TrashIcon, SparklesIcon, ChevronDownIcon, ChevronRightIcon } from './Icons';
import type { BOQRow, BOQCategory } from '../types/tender';
import { BOQ_CATEGORIES, BOQ_CATEGORY_META, deriveCategory } from '../lib/boqCategory';
import { QUALIFICATIONS, NATIONALITIES, nationalityLabel, effectiveQty, fieldApplies, type BoqField } from '../lib/boqManpower';
import BoqAttachments from './BoqAttachments';

/**
 * The BOQ as one spreadsheet-style table. Every cell is edited in place; Enter
 * moves down (and adds a row at the end), Tab moves right, and rows can be pasted
 * from Excel. Columns are category-aware: the table carries the full set of columns
 * across all four categories (Service / Equipment / Material / Man Power) and shows
 * only those relevant to the categories currently in the table. Within a row, cells
 * that don't apply to that row's category are shown muted and locked.
 */

type Key =
  | 'itemName' | 'projectItem' | 'category' | 'jobTitle'
  | 'unitOfMeasure' | 'staffCount' | 'quantity' | 'unitPrice'
  | 'minQualification' | 'minExperienceYears' | 'officialWorkingHours' | 'extraWorkingHours'
  | 'itemDescription' | 'deliveryDate' | 'mandatoryList'
  | 'hasBrandName' | 'brandJustification' | 'nationalityRequired' | 'nationalities';

type Kind = 'text' | 'projectItem' | 'category' | 'unit' | 'num' | 'money' | 'date'
  | 'desc' | 'yesno' | 'brandJust' | 'qualification' | 'natreq' | 'nationalities';

interface Col {
  key: Key; en: string; ar: string; w: number; kind: Kind;
  /** Categories this column applies to; undefined = all categories. */
  cats?: BOQCategory[];
  /** Field key for per-cell applicability (defaults to `key` where relevant). */
  field?: BoqField;
  header: string[]; // header names recognised on paste
  align?: 'end';
}

// All columns, in on-screen order. Category-specific ones carry `cats`.
const ALL_COLS: Col[] = [
  { key: 'itemName', en: 'Item name', ar: 'اسم البند', w: 184, kind: 'text', header: ['item name', 'item'] },
  { key: 'projectItem', en: 'Project item', ar: 'بند المشروع', w: 160, kind: 'projectItem', header: ['project item', 'project item classification'] },
  { key: 'category', en: 'Category', ar: 'التصنيف', w: 128, kind: 'category', header: ['category', 'التصنيف'] },
  { key: 'jobTitle', en: 'Job title', ar: 'المسمى الوظيفي', w: 160, kind: 'text', cats: ['manpower'], field: 'jobTitle', header: ['job title'] },
  { key: 'unitOfMeasure', en: 'Unit', ar: 'الوحدة', w: 88, kind: 'unit', cats: ['service', 'equipment', 'material'], field: 'unitOfMeasure', header: ['unit of measure', 'unit', 'uom'] },
  { key: 'staffCount', en: 'Staff count', ar: 'عدد الموظفين', w: 100, kind: 'num', cats: ['manpower'], field: 'staffCount', header: ['staff count'], align: 'end' },
  { key: 'quantity', en: 'Qty', ar: 'الكمية', w: 64, kind: 'num', cats: ['service', 'equipment', 'material'], field: 'quantity', header: ['quantity', 'qty'], align: 'end' },
  { key: 'unitPrice', en: 'Unit price (SAR)', ar: 'سعر الوحدة', w: 112, kind: 'money', header: ['unit price (sar)', 'unit price', 'price'], align: 'end' },
  { key: 'minQualification', en: 'Min. qualification', ar: 'الحد الأدنى للمؤهل', w: 156, kind: 'qualification', cats: ['manpower'], field: 'minQualification', header: ['minimum accepted qualification', 'qualification'] },
  { key: 'minExperienceYears', en: 'Min. exp. (yrs)', ar: 'الخبرة (سنوات)', w: 108, kind: 'num', cats: ['manpower'], field: 'minExperienceYears', header: ['minimum years of experience', 'experience'], align: 'end' },
  { key: 'officialWorkingHours', en: 'Official hrs', ar: 'ساعات رسمية', w: 100, kind: 'num', cats: ['manpower'], field: 'officialWorkingHours', header: ['official working hours'], align: 'end' },
  { key: 'extraWorkingHours', en: 'Extra hrs', ar: 'ساعات إضافية', w: 96, kind: 'num', cats: ['manpower'], field: 'extraWorkingHours', header: ['expected extra working hours', 'extra hours'], align: 'end' },
  { key: 'itemDescription', en: 'Description', ar: 'الوصف', w: 240, kind: 'desc', header: ['description', 'item description'] },
  { key: 'deliveryDate', en: 'Delivery date', ar: 'موعد التسليم', w: 140, kind: 'date', header: ['delivery date', 'date'] },
  { key: 'mandatoryList', en: 'Mandatory list', ar: 'القائمة الإلزامية', w: 176, kind: 'text', cats: ['material', 'equipment'], field: 'mandatoryList', header: ['mandatory list'] },
  { key: 'hasBrandName', en: 'Brand?', ar: 'علامة تجارية؟', w: 84, kind: 'yesno', cats: ['service', 'equipment', 'material'], field: 'hasBrandName', header: ['has brand name (yes/no)', 'has brand name', 'brand'] },
  { key: 'brandJustification', en: 'Brand justification', ar: 'مبرر العلامة', w: 200, kind: 'brandJust', cats: ['service', 'equipment', 'material'], field: 'brandJustification', header: ['brand justification'] },
  { key: 'nationalityRequired', en: 'Nationality req.?', ar: 'جنسية مطلوبة؟', w: 116, kind: 'natreq', cats: ['manpower'], field: 'nationalityRequired', header: ['nationality required'] },
  { key: 'nationalities', en: 'Nationalities', ar: 'الجنسيات', w: 190, kind: 'nationalities', cats: ['manpower'], field: 'nationalities', header: ['nationality', 'nationalities'] },
];

// Column order of the downloadable BOQ Excel template.
const TEMPLATE_ORDER: Key[] = ['projectItem', 'itemName', 'itemDescription', 'unitOfMeasure', 'quantity', 'unitPrice', 'deliveryDate', 'hasBrandName', 'brandJustification'];
const DOCS_W = 116;

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
    case 'quantity': case 'unitPrice': case 'staffCount':
    case 'minExperienceYears': case 'officialWorkingHours': case 'extraWorkingHours':
      return { [key]: parseNum(s) };
    case 'deliveryDate': return { deliveryDate: parseDate(s) };
    case 'hasBrandName': return { hasBrandName: /^(y|yes|true|1|نعم)$/i.test(s) };
    case 'nationalityRequired': return { nationalityRequired: /^(y|yes|true|1|نعم)$/i.test(s) };
    case 'category': { const v = s.toLowerCase(); return { category: BOQ_CATEGORIES.find((c) => c === v || BOQ_CATEGORY_META[c].en.toLowerCase() === v || BOQ_CATEGORY_META[c].ar === s) }; }
    case 'unitOfMeasure': return { unitOfMeasure: UNITS_OF_MEASURE.find((u) => u.toLowerCase() === s.toLowerCase()) ?? (s ? s : 'Each') };
    case 'minQualification': { const q = QUALIFICATIONS.find((x) => x.value === s.toLowerCase() || x.en.toLowerCase() === s.toLowerCase() || x.ar === s); return { minQualification: q?.value ?? '' }; }
    case 'nationalities': {
      const vals = s.split(/[,،]/).map((x) => x.trim()).filter(Boolean)
        .map((x) => NATIONALITIES.find((n) => n.value === x.toLowerCase() || n.en.toLowerCase() === x.toLowerCase() || n.ar === x)?.value)
        .filter(Boolean) as string[];
      return { nationalities: vals, nationalityRequired: vals.length > 0 };
    }
    default: return { [key]: s };
  }
}

const blankRow = (): BOQRow => ({ id: crypto.randomUUID(), projectItem: '', itemName: '', itemDescription: '', unitOfMeasure: 'Each', quantity: '', unitPrice: '', deliveryDate: '', hasBrandName: false, brandJustification: '' });

const rowCatOf = (row: BOQRow): BOQCategory => row.category ?? deriveCategory(row.itemName);

interface Props {
  rows: BOQRow[];
  setRows: (rows: BOQRow[]) => void;
  projectItemOptions: string[];
  checkingIds: Set<string>;
  onCheck: (row: BOQRow) => void;
  onMove: (row: BOQRow) => Promise<'moved' | 'preview' | 'error'>;
  onUpdate: (id: string, patch: Partial<BOQRow>) => void;
  onRemove: (id: string) => void;
}

export default function BoqSheet({ rows, setRows, projectItemOptions, checkingIds, onCheck, onMove, onUpdate, onRemove }: Props) {
  const t = useT();
  const { isAr } = useLanguage();
  const tableRef = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef<{ r: number; c: number } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [pasteNote, setPasteNote] = useState('');

  // Which categories are present → which columns to show. Goods columns show by
  // default (empty table); Man Power columns appear once a row is set to Man Power.
  const presentCats = new Set<BOQCategory>(rows.length ? rows.map(rowCatOf) : ['service', 'equipment', 'material']);
  const COLS = ALL_COLS.filter((c) => !c.cats || c.cats.some((x) => presentCats.has(x)));
  const TOTAL_AFTER = COLS.findIndex((c) => c.key === 'unitPrice');
  const TABLE_W = 40 + COLS.reduce((a, c) => a + c.w, 0) + 124 + DOCS_W + 150 + 40;
  const colCount = COLS.length + 5; // #, total, docs, etimad, actions

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
    let keys: (Key | null)[] = c0 === 0 && (lines[0]?.length ?? 0) >= 6 ? TEMPLATE_ORDER : COLS.slice(c0).map((col) => col.key);
    const head = lines[0]?.map((h) => h.trim().toLowerCase());
    if (head && head.filter((h) => ALL_COLS.some((col) => col.header.includes(h))).length >= 2) {
      keys = head.map((h) => ALL_COLS.find((col) => col.header.includes(h))?.key ?? null);
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

  const total = (r: BOQRow) => effectiveQty(r) * (Number(r.unitPrice) || 0);
  const options = (r: BOQRow) => (r.projectItem && !projectItemOptions.includes(r.projectItem) ? [...projectItemOptions, r.projectItem] : projectItemOptions);
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const td = 'border-b border-e border-neutral-200 p-0 relative focus-within:z-10 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-brand-500';
  const inp = 'block w-full h-9 bg-transparent px-2 text-[13px] text-neutral-900 placeholder:text-neutral-300 outline-none';
  const lockedInp = 'block w-full h-9 bg-neutral-50 px-2 text-[13px] text-neutral-300 text-center outline-none cursor-not-allowed';

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-[11px] text-neutral-500">
        <span>{t('Click any cell to edit. Enter moves down, Tab moves right. Columns change with the selected category — pick “Man Power” to reveal its fields.', 'انقر أي خلية للتعديل. Enter للأسفل، Tab لليمين. تتغيّر الأعمدة حسب التصنيف المختار — اختر «القوى العاملة» لإظهار حقولها.')}</span>
        {pasteNote && <span className="ms-auto text-success-700 font-medium">{pasteNote}</span>}
      </div>

      {/* Category legend */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[11px] text-neutral-400">{t('Columns shown for', 'الأعمدة المعروضة لـ')}:</span>
        {BOQ_CATEGORIES.filter((c) => presentCats.has(c)).map((c) => {
          const m = BOQ_CATEGORY_META[c];
          return <span key={c} className="text-[11px] font-medium text-neutral-600 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-400" />{isAr ? m.ar : m.en}</span>;
        })}
      </div>

      <div className="rounded-xl border border-neutral-300 overflow-x-auto bg-white shadow-sm">
        <table ref={tableRef} onKeyDown={onKeyDown} onPaste={onPaste} className="border-separate border-spacing-0 text-start table-fixed" style={{ width: TABLE_W }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {COLS.map((c, i) => [<col key={c.key} style={{ width: c.w }} />, i === TOTAL_AFTER ? <col key="total" style={{ width: 124 }} /> : null])}
            <col style={{ width: DOCS_W }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className="bg-gradient-to-b from-neutral-100 to-neutral-50">
              <Th sticky={0} className="text-center">#</Th>
              {COLS.map((c, i) => [
                <Th key={c.key} sticky={i === 0 ? 40 : undefined} className={c.align === 'end' ? 'text-end' : ''}>
                  {t(c.en, c.ar)}{(c.key === 'itemName' || c.key === 'projectItem') && <span className="text-error-500"> *</span>}
                </Th>,
                i === TOTAL_AFTER ? <Th key="total" className="text-end">{t('Total (SAR)', 'الإجمالي (ر.س)')}</Th> : null,
              ])}
              <Th>{t('Docs', 'مستندات')}</Th>
              <Th>{t('Etimad E-Market', 'سوق اعتماد')}</Th>
              <Th><span className="sr-only">{t('Actions', 'إجراءات')}</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-sm text-neutral-500 border-b border-neutral-200">
                  {t('No items yet. Add an item, paste rows from Excel, or copy from a past request.', 'لا توجد بنود. أضف بنداً أو الصق من Excel أو استخدم اقتراح الذكاء الاصطناعي.')}
                </td>
              </tr>
            )}
            {rows.map((row, r) => {
              const rowCat = rowCatOf(row);
              const missing = !row.itemName.trim() || !row.projectItem;
              const brandMissing = rowCat !== 'manpower' && !!row.hasBrandName && !(row.brandJustification ?? '').trim();
              const isOpen = open.has(row.id);
              return [
                <tr key={row.id} className="group/row">
                  {/* # */}
                  <td className="sticky start-0 z-20 bg-neutral-50 border-b border-e border-neutral-200 text-center text-[11px] tabular-nums text-neutral-500" title={missing ? t('Item name and project item are required.', 'اسم البند وبند المشروع مطلوبان.') : undefined}>
                    <span className="inline-flex items-center gap-1">
                      {(missing || brandMissing) && row.itemName + row.projectItem !== '' && <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />}
                      {r + 1}
                    </span>
                  </td>
                  {COLS.map((col, c) => {
                    const cellProps = { 'data-cell': `${r}:${c}`, 'aria-label': `${t(col.en, col.ar)}, ${t('row', 'صف')} ${r + 1}` };
                    // Applicability: a category-specific column that doesn't apply to this
                    // row's category renders muted & locked.
                    const applies = !col.field || fieldApplies(rowCat, col.field);
                    let content: ReactNode;
                    let extra = '';
                    if (!applies) {
                      content = <input {...cellProps} readOnly className={lockedInp} value="—" title={t('Not applicable for this category', 'لا ينطبق على هذا التصنيف')} />;
                    } else {
                      switch (col.kind) {
                        case 'projectItem':
                          extra = !row.projectItem && row.itemName ? 'bg-warning-50/60' : '';
                          content = (
                            <SelectCell {...cellProps} value={row.projectItem} onChange={(v) => onUpdate(row.id, { projectItem: v })}>
                              <option value="">{t('Select…', 'اختر…')}</option>
                              {options(row).map((o) => <option key={o} value={o}>{o}</option>)}
                            </SelectCell>
                          );
                          break;
                        case 'category':
                          extra = !row.category && row.itemName ? 'bg-warning-50/60' : '';
                          content = (
                            <SelectCell {...cellProps} value={row.category ?? ''} onChange={(v) => onUpdate(row.id, { category: (v || undefined) as BOQCategory | undefined })}>
                              <option value="">{t('Select…', 'اختر…')}</option>
                              {BOQ_CATEGORIES.map((cc) => <option key={cc} value={cc}>{t(BOQ_CATEGORY_META[cc].en, BOQ_CATEGORY_META[cc].ar)}</option>)}
                            </SelectCell>
                          );
                          break;
                        case 'unit':
                          content = (
                            <SelectCell {...cellProps} value={row.unitOfMeasure || 'Each'} onChange={(v) => onUpdate(row.id, { unitOfMeasure: v })}>
                              {[...new Set([...UNITS_OF_MEASURE, row.unitOfMeasure || 'Each'])].map((u) => <option key={u} value={u}>{u}</option>)}
                            </SelectCell>
                          );
                          break;
                        case 'qualification':
                          content = (
                            <SelectCell {...cellProps} value={row.minQualification ?? ''} onChange={(v) => onUpdate(row.id, { minQualification: v })}>
                              <option value="">{t('Select…', 'اختر…')}</option>
                              {QUALIFICATIONS.map((q) => <option key={q.value} value={q.value}>{t(q.en, q.ar)}</option>)}
                            </SelectCell>
                          );
                          break;
                        case 'yesno':
                          extra = row.hasBrandName ? 'bg-warning-50/60' : '';
                          content = (
                            <SelectCell {...cellProps} value={row.hasBrandName ? 'yes' : 'no'} onChange={(v) => onUpdate(row.id, v === 'yes' ? { hasBrandName: true } : { hasBrandName: false, brandJustification: '' })}>
                              <option value="no">{t('No', 'لا')}</option>
                              <option value="yes">{t('Yes', 'نعم')}</option>
                            </SelectCell>
                          );
                          break;
                        case 'natreq':
                          content = (
                            <SelectCell {...cellProps} value={row.nationalityRequired ? 'yes' : 'no'} onChange={(v) => onUpdate(row.id, v === 'yes' ? { nationalityRequired: true } : { nationalityRequired: false, nationalities: [] })}>
                              <option value="no">{t('No', 'لا')}</option>
                              <option value="yes">{t('Yes', 'نعم')}</option>
                            </SelectCell>
                          );
                          break;
                        case 'nationalities':
                          if (!row.nationalityRequired) {
                            content = <input {...cellProps} readOnly className={lockedInp} value="—" title={t('Set “Nationality req.?” to Yes', 'اضبط «جنسية مطلوبة؟» على نعم')} />;
                          } else {
                            content = <NationalitiesCell {...cellProps} value={row.nationalities ?? []} onChange={(v) => onUpdate(row.id, { nationalities: v })} isAr={isAr} t={t} />;
                          }
                          break;
                        case 'num':
                        case 'money':
                          content = (
                            <NumCell {...cellProps} className={inp} value={(row[col.key] as number | '' | undefined) ?? ''} fmt={col.kind === 'money' ? fmtMoney : fmtQty}
                              placeholder={col.kind === 'money' ? '0.00' : '0'} onChange={(v) => onUpdate(row.id, { [col.key]: v })} />
                          );
                          break;
                        case 'date':
                          content = <input {...cellProps} type="date" className={`${inp} ${row.deliveryDate ? '' : 'text-neutral-300'}`} value={row.deliveryDate} onChange={(e) => onUpdate(row.id, { deliveryDate: e.target.value })} />;
                          break;
                        case 'brandJust':
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
                        case 'desc':
                        case 'text':
                        default:
                          content = (
                            <input {...cellProps} type="text" className={`${inp} ${col.key === 'itemName' ? 'font-medium' : ''}`} value={(row[col.key] as string) ?? ''} title={(row[col.key] as string) || undefined}
                              placeholder={col.key === 'itemName' ? t('Item name', 'اسم البند') : ''} onChange={(e) => onUpdate(row.id, { [col.key]: e.target.value })} />
                          );
                      }
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
                  {/* Attachments */}
                  <td className="border-b border-e border-neutral-200 px-1.5 text-center">
                    <BoqAttachments buttonOnly attachments={row.attachments ?? []} onChange={(next) => onUpdate(row.id, { attachments: next })} />
                  </td>
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
                        <p className="text-[11px] font-semibold text-neutral-500 mb-1.5 truncate">{t('Etimad E-Market check for', 'نتيجة سوق اعتماد لـ')} “{row.itemName || t('row', 'صف') + ' ' + (r + 1)}”</p>
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

      <button type="button" onClick={() => addRow(0)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm">
        <PlusIcon className="w-3.5 h-3.5" />
        {t('Add item', 'إضافة بند')}
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
        className={`block w-full h-9 appearance-none bg-transparent ps-2 pe-6 text-[13px] outline-none cursor-pointer truncate ${value ? 'text-neutral-900' : 'text-neutral-500'}`}>
        {children}
      </select>
      <ChevronDownIcon className="w-3 h-3 text-neutral-500 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
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

/** Multi-select nationalities cell — a trigger with a fixed-position popover so it
 *  isn't clipped by the table's horizontal scroll. */
function NationalitiesCell({ value, onChange, isAr, t, ...rest }: { value: string[]; onChange: (v: string[]) => void; isAr: boolean; t: (en: string, ar: string) => string; 'data-cell': string; 'aria-label': string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) { if (btnRef.current && !btnRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-nat-pop]')) setOpen(false); }
    function onScroll() { setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);
  function openPanel() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 260) });
    setOpen(true);
  }
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const label = value.length ? value.map((v) => nationalityLabel(v, isAr)).join('، ') : t('Select…', 'اختر…');
  return (
    <>
      <button {...rest} ref={btnRef} type="button" onClick={openPanel}
        className={`block w-full h-9 text-start ps-2 pe-6 text-[13px] truncate outline-none relative ${value.length ? 'text-neutral-900' : 'text-neutral-500'}`}
        title={value.length ? label : undefined}>
        {label}
        <ChevronDownIcon className="w-3 h-3 text-neutral-500 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </button>
      {open && pos && (
        <div data-nat-pop className="fixed z-50 w-[248px] max-h-[260px] overflow-auto rounded-lg border border-neutral-200 bg-white shadow-xl p-2" style={{ top: pos.top, left: pos.left }}>
          <div className="flex flex-wrap gap-1.5">
            {NATIONALITIES.map((n) => {
              const on = value.includes(n.value);
              return (
                <button key={n.value} type="button" onClick={() => toggle(n.value)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'}`}>
                  {isAr ? n.ar : n.en}{on && <span aria-hidden>×</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="text-[11px] font-semibold text-brand-700 hover:underline">{t('Done', 'تم')}</button>
          </div>
        </div>
      )}
    </>
  );
}

function EtimadChip({ row, checking, open, onCheck, onToggle }: { row: BOQRow; checking: boolean; open: boolean; onCheck: () => void; onToggle: () => void }) {
  const t = useT();
  const base = 'w-full inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors';
  if (checking) {
    return <span className={`${base} bg-ai-50 text-ai-700 border-ai-200`}><SparklesIcon className="w-3 h-3 spin-slow" />{t('Checking…', 'جاري التحقق…')}</span>;
  }
  const check = row.etimadCheck;
  if (isPendingProcurement(row)) {
    return <span className={`${base} bg-warning-50 text-warning-700 border-warning-100`} title={t('With Procurement for an Etimad check', 'لدى المشتريات للفحص في اعتماد')}>{t('With Procurement', 'لدى المشتريات')}</span>;
  }
  if (!check || isStale(row)) {
    return (
      <button type="button" onClick={onCheck} disabled={!row.itemName.trim()} title={!row.itemName.trim() ? t('Add an item name first.', 'أضف اسم البند أولاً.') : t('Ask Procurement to check Etimad', 'اطلب من المشتريات الفحص في اعتماد')}
        className={`${base} bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed`}>
        {check ? t('Changed · ask again', 'تغيّر · اطلب مجدداً') : t('Ask Procurement', 'اطلب من المشتريات')}
      </button>
    );
  }
  let label: string; let tone: string;
  if (check.status === 'available') {
    if (!row.etimadKeep) { label = t('In Etimad E-Market', 'متوفر في السوق'); tone = 'bg-warning-50 text-warning-700 border-warning-100'; }
    else if (needsJustification(row)) { label = t('Kept · needs reason', 'مُبقى · يحتاج مبرراً'); tone = 'bg-error-50 text-error-700 border-error-100'; }
    else { label = t('Kept · justified', 'مُبقى · مبرر'); tone = 'bg-success-50 text-success-700 border-success-100'; }
  } else if (check.status === 'not-available') { label = t('Not in E-Market', 'غير متوفر في السوق'); tone = 'bg-success-50 text-success-700 border-success-100'; }
  else { label = t('Unclear', 'غير واضح'); tone = 'bg-neutral-50 text-neutral-600 border-neutral-200'; }
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className={`${base} ${tone} hover:brightness-95`}>
      <ChevronRightIcon className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}
