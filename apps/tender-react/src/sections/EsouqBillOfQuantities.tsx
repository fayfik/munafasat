import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { FormField, SectionCard, AIButton, Input, Select, Textarea, Badge, InfoBanner } from '../components/ui';
import { PlusIcon, TrashIcon, SparklesIcon, DownloadIcon, UploadIcon, ChevronRightIcon, PencilIcon, TableIcon, ListIcon } from '../components/Icons';
import { saveFile } from '../lib/claudeRuntime';
import type { BOQRow } from '../types/tender';
import EsouqBoqTable from '../components/EsouqBoqTable';

/* ── Purchase types & grouping ─────────────────────────────────────────────── */
type PurchaseType = 'product' | 'service' | 'vehicle-leasing';
const PURCHASE_TYPES: { id: PurchaseType; en: string; ar: string }[] = [
  { id: 'product', en: 'Product', ar: 'منتج' },
  { id: 'service', en: 'Service', ar: 'خدمة' },
  { id: 'vehicle-leasing', en: 'Vehicle Leasing', ar: 'تأجير مركبات' },
];
const ptMeta = (id?: string) => PURCHASE_TYPES.find((p) => p.id === id) ?? PURCHASE_TYPES[0];
type Group = 'product' | 'service' | 'vehicle-leasing';
const groupOf = (pt?: string): Group => (pt === 'service' ? 'service' : pt === 'vehicle-leasing' ? 'vehicle-leasing' : 'product');
const GROUPS: { id: Group; en: string; ar: string; dot: string }[] = [
  { id: 'product', en: 'Product', ar: 'منتج', dot: 'bg-brand-500' },
  { id: 'service', en: 'Service', ar: 'خدمة', dot: 'bg-ai-500' },
  { id: 'vehicle-leasing', en: 'Vehicle Leasing', ar: 'تأجير مركبات', dot: 'bg-warning-500' },
];

const n = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const fmt = (x: number) => new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);

function durationText(s?: string, e?: string, isAr = false): string {
  if (!s || !e) return '';
  const a = new Date(s), b = new Date(e);
  if (isNaN(+a) || isNaN(+b) || b < a) return '';
  const days = Math.round((+b - +a) / 86400000);
  const months = Math.round((days / 30.44) * 10) / 10;
  return isAr ? `${days} يوم · ~${months} شهر` : `${days} days · ~${months} mo`;
}

function rowTotal(r: BOQRow): number {
  if (typeof r.lineTotal === 'number') return r.lineTotal;
  const price = n(r.unitPrice);
  if (r.purchaseType === 'product') return price * (n(r.quantity) || 1) + n(r.shippingCharges);
  return price;
}

/* ── Sample data for "Generate with AI" ────────────────────────────────────── */
const AI_ESOUQ_ROWS: Omit<BOQRow, 'id'>[] = [
  { purchaseType: 'product', projectItem: '', itemName: 'Dell Latitude 5450 Laptop', productId: 'SKU-DL-5450', supplier: 'Jarir Marketing Co.', unitOfMeasure: 'Each', orderUnit: 'Each', quantity: 25, unitPrice: 4200, shippingCharges: 1500, deliveryDate: '2026-01-15', respName: 'Mohammed Al-Harbi', respMobile: '0551234567', itemDescription: '', lineTotal: '' },
  { purchaseType: 'product', projectItem: '', itemName: 'HP LaserJet Enterprise M611', productId: 'SKU-HP-M611', supplier: 'Almasa IT Distribution', unitOfMeasure: 'Each', orderUnit: 'Each', quantity: 8, unitPrice: 3100, shippingCharges: 600, deliveryDate: '2026-01-20', respName: 'Mohammed Al-Harbi', respMobile: '0551234567', itemDescription: '', lineTotal: '' },
  { purchaseType: 'service', projectItem: '', itemName: 'Microsoft 365 E5 — Annual Support', productId: 'SVC-M365-E5', supplier: 'Microsoft Arabia', unitOfMeasure: 'Service', quantity: '', unitPrice: 180000, startDate: '2026-01-01', endDate: '2026-12-31', deliveryDate: '2026-01-01', respName: 'Sara Al-Zahrani', respMobile: '0567654321', itemDescription: '', lineTotal: 180000 },
  { purchaseType: 'vehicle-leasing', projectItem: '', itemName: 'Toyota Camry 2026 — Fleet Lease (10 vehicles)', productId: 'VL-CAM-2026', supplier: 'Theeb Rent a Car', unitOfMeasure: 'Vehicle', quantity: '', unitPrice: 312000, startDate: '2026-02-01', endDate: '2027-01-31', deliveryDate: '2026-02-01', respName: 'Khalid Al-Otaibi', respMobile: '0509876543', itemDescription: '', lineTotal: 312000 },
];

// Arabic sample — used when the app language is Arabic so AI output is fully Arabic.
const AI_ESOUQ_ROWS_AR: Omit<BOQRow, 'id'>[] = [
  { purchaseType: 'product', projectItem: '', itemName: 'حاسوب محمول Dell Latitude 5450', productId: 'SKU-DL-5450', supplier: 'شركة جرير للتسويق', unitOfMeasure: 'Each', orderUnit: 'Each', quantity: 25, unitPrice: 4200, shippingCharges: 1500, deliveryDate: '2026-01-15', respName: 'محمد الحربي', respMobile: '0551234567', itemDescription: '', lineTotal: '' },
  { purchaseType: 'product', projectItem: '', itemName: 'طابعة HP LaserJet Enterprise M611', productId: 'SKU-HP-M611', supplier: 'شركة الماسة لتوزيع تقنية المعلومات', unitOfMeasure: 'Each', orderUnit: 'Each', quantity: 8, unitPrice: 3100, shippingCharges: 600, deliveryDate: '2026-01-20', respName: 'محمد الحربي', respMobile: '0551234567', itemDescription: '', lineTotal: '' },
  { purchaseType: 'service', projectItem: '', itemName: 'دعم سنوي لاشتراك Microsoft 365 E5', productId: 'SVC-M365-E5', supplier: 'مايكروسوفت العربية', unitOfMeasure: 'Service', quantity: '', unitPrice: 180000, startDate: '2026-01-01', endDate: '2026-12-31', deliveryDate: '2026-01-01', respName: 'سارة الزهراني', respMobile: '0567654321', itemDescription: '', lineTotal: 180000 },
  { purchaseType: 'vehicle-leasing', projectItem: '', itemName: 'تأجير أسطول سيارات تويوتا كامري 2026 (10 مركبات)', productId: 'VL-CAM-2026', supplier: 'شركة ذيب لتأجير السيارات', unitOfMeasure: 'Vehicle', quantity: '', unitPrice: 312000, startDate: '2026-02-01', endDate: '2027-01-31', deliveryDate: '2026-02-01', respName: 'خالد العتيبي', respMobile: '0509876543', itemDescription: '', lineTotal: 312000 },
];

const TEMPLATE_COLS = ['Purchase Type', 'Product Name', 'Product ID', 'Supplier', 'Price (SAR)', 'Order Unit', 'Quantity', 'Shipping Charges', 'Start Date', 'End Date', 'Delivery Date', 'Responsible Name', 'Responsible Mobile', 'Total Value (SAR)'];

function downloadTemplate(rows: BOQRow[]) {
  const data = rows.length
    ? rows.map((r) => ({
        'Purchase Type': ptMeta(r.purchaseType).en, 'Product Name': r.itemName, 'Product ID': r.productId ?? '',
        'Supplier': r.supplier ?? '', 'Price (SAR)': r.unitPrice, 'Order Unit': r.orderUnit ?? '', 'Quantity': r.quantity,
        'Shipping Charges': r.shippingCharges ?? '', 'Start Date': r.startDate ?? '', 'End Date': r.endDate ?? '',
        'Delivery Date': r.deliveryDate, 'Responsible Name': r.respName ?? '', 'Responsible Mobile': r.respMobile ?? '', 'Total Value (SAR)': rowTotal(r) || '',
      }))
    : [Object.fromEntries(TEMPLATE_COLS.map((c) => [c, '']))];
  const ws = XLSX.utils.json_to_sheet(data, { header: TEMPLATE_COLS });
  ws['!cols'] = [16, 34, 16, 24, 14, 12, 10, 16, 14, 14, 14, 22, 18, 18].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'eSouq BOQ');
  const name = rows.length ? 'eSouq_BOQ_prefilled.xlsx' : 'eSouq_BOQ_template.xlsx';
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  saveFile(name, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', () => XLSX.writeFile(wb, name));
}

function parseTemplate(file: File): Promise<Omit<BOQRow, 'id'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const parsed = rows.filter((r) => String(r['Product Name'] ?? '').trim()).map((r): Omit<BOQRow, 'id'> => {
          const ptRaw = String(r['Purchase Type'] ?? 'Product').toLowerCase();
          const purchaseType: PurchaseType = ptRaw.includes('vehicle') || ptRaw.includes('leas') ? 'vehicle-leasing' : ptRaw.includes('serv') ? 'service' : 'product';
          return {
            purchaseType, projectItem: '', itemName: String(r['Product Name'] ?? ''), productId: String(r['Product ID'] ?? ''),
            supplier: String(r['Supplier'] ?? ''), unitOfMeasure: purchaseType === 'product' ? String(r['Order Unit'] ?? 'Each') : 'Service',
            orderUnit: String(r['Order Unit'] ?? ''), quantity: Number(r['Quantity']) || '', unitPrice: Number(r['Price (SAR)']) || '',
            shippingCharges: Number(r['Shipping Charges']) || '', startDate: String(r['Start Date'] ?? ''), endDate: String(r['End Date'] ?? ''),
            deliveryDate: String(r['Delivery Date'] ?? ''), respName: String(r['Responsible Name'] ?? ''), respMobile: String(r['Responsible Mobile'] ?? ''),
            itemDescription: '', lineTotal: Number(r['Total Value (SAR)']) || '',
          };
        });
        resolve(parsed);
      } catch { reject(new Error('parse')); }
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsArrayBuffer(file);
  });
}

const EMPTY = {
  purchaseType: 'product' as PurchaseType, itemName: '', productId: '', supplier: '', unitPrice: '' as number | '',
  orderUnit: 'Each', quantity: '' as number | '', shippingCharges: '' as number | '', startDate: '', endDate: '',
  deliveryDate: '', respName: '', respMobile: '', lineTotal: '' as number | '', itemDescription: '',
};
type Draft = typeof EMPTY;

export default function EsouqBillOfQuantities() {
  const { formData, updateField, updateBoqRow, removeBoqRow } = useTender();
  const t = useT();
  const { isAr } = useLanguage();

  const [view, setView] = useState<'grouped' | 'table'>('grouped');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['product', 'service', 'vehicle-leasing']));
  const [showUpload, setShowUpload] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if ((showForm || editingId) && formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [showForm, editingId]);

  const rows = formData.boqItems;
  const subtotal = rows.reduce((s, r) => s + rowTotal(r), 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  function openAdd(pt: PurchaseType) { setEditingId(null); setDraft({ ...EMPTY, purchaseType: pt, orderUnit: pt === 'product' ? 'Each' : '' }); setShowForm(true); }
  function openEdit(r: BOQRow) {
    setShowForm(false);
    setEditingId(r.id);
    setDraft({
      purchaseType: (r.purchaseType ?? 'product') as PurchaseType, itemName: r.itemName, productId: r.productId ?? '', supplier: r.supplier ?? '',
      unitPrice: r.unitPrice, orderUnit: r.orderUnit ?? 'Each', quantity: r.quantity, shippingCharges: r.shippingCharges ?? '',
      startDate: r.startDate ?? '', endDate: r.endDate ?? '', deliveryDate: r.deliveryDate, respName: r.respName ?? '', respMobile: r.respMobile ?? '',
      lineTotal: r.lineTotal ?? '', itemDescription: r.itemDescription ?? '',
    });
  }
  function closeForm() { setShowForm(false); setEditingId(null); setDraft({ ...EMPTY }); }
  const valid = draft.itemName.trim().length > 0;

  function commit() {
    if (!valid) return;
    const patch: Partial<BOQRow> = {
      purchaseType: draft.purchaseType, itemName: draft.itemName, productId: draft.productId, supplier: draft.supplier,
      unitPrice: draft.unitPrice, deliveryDate: draft.deliveryDate, respName: draft.respName, respMobile: draft.respMobile,
      lineTotal: draft.lineTotal, itemDescription: draft.itemDescription, projectItem: draft.itemName,
      unitOfMeasure: draft.purchaseType === 'product' ? (draft.orderUnit || 'Each') : ptMeta(draft.purchaseType).en,
      orderUnit: draft.purchaseType === 'product' ? draft.orderUnit : '',
      quantity: draft.purchaseType === 'product' ? draft.quantity : '',
      shippingCharges: draft.purchaseType === 'product' ? draft.shippingCharges : '',
      startDate: draft.purchaseType === 'product' ? '' : draft.startDate,
      endDate: draft.purchaseType === 'product' ? '' : draft.endDate,
    };
    if (editingId) updateBoqRow(editingId, patch);
    else updateField('boqItems', [...rows, { ...(patch as BOQRow), id: crypto.randomUUID() }]);
    setExpanded((p) => new Set([...p, groupOf(draft.purchaseType)]));
    closeForm();
  }

  // Inline-table add: append a blank row of the right group and return its id (for focus).
  function addNewRow(g: Group): string {
    const id = crypto.randomUUID();
    const newRow: BOQRow = {
      id, purchaseType: g, projectItem: '', itemName: '', itemDescription: '',
      unitOfMeasure: g === 'product' ? 'Each' : g === 'vehicle-leasing' ? 'Vehicle' : 'Service',
      orderUnit: g === 'product' ? 'Each' : '', quantity: '', unitPrice: '', deliveryDate: '',
    };
    updateField('boqItems', [...rows, newRow]);
    return id;
  }

  function generateAI() {
    setAiLoading(true);
    window.setTimeout(() => {
      updateField('boqItems', (isAr ? AI_ESOUQ_ROWS_AR : AI_ESOUQ_ROWS).map((r) => ({ id: crypto.randomUUID(), ...r })));
      setExpanded(new Set(['product', 'service', 'vehicle-leasing']));
      setAiLoading(false);
    }, 1100);
  }

  async function onUpload(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { setUploadErr(t('Please upload an .xlsx or .xls file.', 'يرجى رفع ملف بصيغة .xlsx أو .xls.')); return; }
    setUploadErr(null);
    try {
      const parsed = await parseTemplate(file);
      if (!parsed.length) { setUploadErr(t('No valid rows found. Check the template columns.', 'لم يتم العثور على بنود صالحة. تحقق من أعمدة النموذج.')); return; }
      updateField('boqItems', parsed.map((r) => ({ id: crypto.randomUUID(), ...r })));
      setExpanded(new Set(['product', 'service', 'vehicle-leasing']));
      setShowUpload(false);
    } catch { setUploadErr(t('Failed to read the file. Use the downloaded template.', 'تعذّر قراءة الملف. استخدم النموذج المنزَّل.')); }
  }

  const toggle = (g: string) => setExpanded((p) => { const s = new Set(p); s.has(g) ? s.delete(g) : s.add(g); return s; });

  return (
    <div className="space-y-5">
      <SectionCard
        title="Bill of Quantities"
        titleAr="جدول الكميات"
        description="Add the products and services you’re buying directly from the Etimad eSouq catalogue."
        descriptionAr="أضف المنتجات والخدمات التي تشتريها مباشرةً من كتالوج السوق الإلكتروني (اعتماد)."
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUpload((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm">
              <UploadIcon className="w-3.5 h-3.5" /> {t('Use a Template', 'استخدم نموذجاً')}
            </button>
            <AIButton onClick={generateAI} loading={aiLoading} label={t('Generate with AI', 'إنشاء بالذكاء الاصطناعي')} />
          </div>
        }
      >
        <InfoBanner variant="info" className="mb-4">
          {t('eSouq items are bought off-catalogue from approved suppliers — no tender needed. Each line is a Product or a Service.',
             'تُشترى بنود السوق الإلكتروني من موردين معتمدين مباشرةً — دون منافسة. كل بند إما منتج أو خدمة.')}
        </InfoBanner>

        {/* View toggle */}
        <div className="flex items-center justify-end mb-3">
          <div role="radiogroup" className="inline-flex rounded-lg border border-neutral-300 bg-neutral-50 p-0.5">
            {([['grouped', t('Grouped', 'مُجمّع'), <ListIcon key="i" className="w-3.5 h-3.5" />],
               ['table', t('Table', 'جدول'), <TableIcon key="i" className="w-3.5 h-3.5" />]] as const).map(([v, label, icon]) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors ${view === v ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload zone */}
        {showUpload && (
          <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden">
            <div className="border-2 border-dashed border-neutral-300 rounded-xl m-3 p-6 text-center hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}>
              <UploadIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-neutral-600">{t('Drop your Excel file here, or', 'اسحب ملف Excel هنا، أو')}</p>
              <button onClick={() => fileRef.current?.click()} className="text-sm text-brand-600 font-semibold hover:text-brand-700 mt-0.5">{t('browse to upload', 'تصفح للرفع')}</button>
              <p className="text-xs text-neutral-500 mt-2">{t('Supports .xlsx and .xls', 'يدعم .xlsx و .xls')}</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
            </div>
            {uploadErr && <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-error-50 border border-error-100 text-xs text-error-700">{uploadErr}</div>}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-200 bg-white">
              <p className="text-xs text-neutral-500">{rows.length ? t('Download current items as a pre-filled template', 'تنزيل البنود الحالية كنموذج مملوء') : t('Download the template, fill it in Excel, then upload.', 'نزّل النموذج، أكمله في Excel، ثم ارفعه.')}</p>
              <button onClick={() => downloadTemplate(rows)} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 flex-shrink-0 ms-3">
                <DownloadIcon className="w-3.5 h-3.5" />{rows.length ? t('Download pre-filled', 'تنزيل مملوء') : t('Download template', 'تنزيل النموذج')}
              </button>
            </div>
          </div>
        )}

        {aiLoading && (
          <div className="mb-4 rounded-lg border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm"><SparklesIcon className="w-4 h-4 spin-slow" />{t('Generating catalogue items…', 'جاري إنشاء بنود الكتالوج…')}</div>
          </div>
        )}

        {/* Add/Edit form */}
        {(showForm || editingId) && (
          <div ref={formRef}>{renderForm()}</div>
        )}

        {/* Grouped view */}
        {view === 'grouped' && (
          <div className="space-y-3">
            {GROUPS.map((g) => {
              const gRows = rows.filter((r) => groupOf(r.purchaseType) === g.id);
              const sub = gRows.reduce((s, r) => s + rowTotal(r), 0);
              const isOpen = expanded.has(g.id);
              return (
                <div key={g.id} className="rounded-xl border border-neutral-200 overflow-hidden">
                  <button type="button" onClick={() => toggle(g.id)} className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 hover:bg-neutral-100/60 transition-colors text-start">
                    <ChevronRightIcon className={`w-3.5 h-3.5 text-neutral-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${g.dot}`} />
                    <span className="flex-1 text-sm font-semibold text-neutral-800">{isAr ? g.ar : g.en}</span>
                    <span className="text-[11px] text-neutral-500 tabular-nums">{gRows.length} {gRows.length === 1 ? t('item', 'بند') : t('items', 'بنود')}</span>
                    {sub > 0 && <span className="text-xs font-semibold text-neutral-700 tabular-nums" dir="ltr">SAR {fmt(sub)}</span>}
                  </button>
                  {isOpen && (
                    <div>
                      <div className="divide-y divide-neutral-100">
                        {gRows.map((r) => <RowCard key={r.id} r={r} />)}
                        {gRows.length === 0 && <p className="px-4 py-5 text-center text-[13px] text-neutral-400">{t('No items yet.', 'لا توجد بنود بعد.')}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Single Add BOQ Item CTA — same as the Tendering BOQ Grid view */}
            {!showForm && !editingId && (
              <button onClick={() => openAdd('product')}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm">
                <PlusIcon className="w-3.5 h-3.5" />
                {t('Add BOQ Item', 'إضافة بند')}
              </button>
            )}
          </div>
        )}

        {/* Table view — inline-editable spreadsheet, one table per group */}
        {view === 'table' && (
          <div className="space-y-5">
            <p className="text-[11px] text-neutral-500">{t('Click any cell to edit. Enter moves down and adds a row at the end. Scroll right for more columns.', 'انقر أي خلية للتعديل. Enter للأسفل ويُضيف صفاً في النهاية. مرّر لليمين للمزيد من الأعمدة.')}</p>
            <EsouqBoqTable group="product" rows={rows} onUpdate={updateBoqRow} onRemove={removeBoqRow} onAdd={addNewRow} />
            <EsouqBoqTable group="service" rows={rows} onUpdate={updateBoqRow} onRemove={removeBoqRow} onAdd={addNewRow} />
            <EsouqBoqTable group="vehicle-leasing" rows={rows} onUpdate={updateBoqRow} onRemove={removeBoqRow} onAdd={addNewRow} />
          </div>
        )}

        {/* Totals */}
        {rows.length > 0 && (
          <div className="mt-4 ms-auto max-w-xs space-y-2 border-t border-neutral-200 pt-4">
            <div className="flex justify-between text-sm text-neutral-600"><span>{t('Subtotal', 'الإجمالي الفرعي')}</span><span className="tabular-nums" dir="ltr">SAR {fmt(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-neutral-600"><span>{t('VAT (15%)', 'ضريبة القيمة المضافة (15%)')}</span><span className="tabular-nums" dir="ltr">SAR {fmt(vat)}</span></div>
            <div className="flex justify-between text-sm font-semibold text-neutral-900 border-t border-neutral-200 pt-2"><span>{t('Total (incl. VAT)', 'الإجمالي (شامل ض.ق.م)')}</span><span className="tabular-nums" dir="ltr">SAR {fmt(total)}</span></div>
          </div>
        )}
      </SectionCard>
    </div>
  );

  /* ── Row card (grouped view) ─────────────────────────────────────────────── */
  function RowCard({ r }: { r: BOQRow }) {
    const isProduct = r.purchaseType === 'product';
    const chips: { label: string; value: string }[] = [
      { label: t('Supplier', 'المورّد'), value: r.supplier || '—' },
      { label: t('Product ID', 'معرّف المنتج'), value: r.productId || '—' },
      { label: t('Price', 'السعر'), value: n(r.unitPrice) ? `SAR ${fmt(n(r.unitPrice))}` : '—' },
      ...(isProduct
        ? [{ label: t('Qty', 'الكمية'), value: `${r.quantity !== '' ? r.quantity : '—'} ${r.orderUnit || ''}`.trim() },
           { label: t('Shipping', 'الشحن'), value: n(r.shippingCharges) ? `SAR ${fmt(n(r.shippingCharges))}` : '—' }]
        : [{ label: t('Period', 'الفترة'), value: r.startDate && r.endDate ? `${r.startDate} → ${r.endDate}` : '—' },
           { label: t('Duration', 'المدة'), value: durationText(r.startDate, r.endDate, isAr) || '—' }]),
      { label: t('Delivery', 'التسليم'), value: r.deliveryDate || '—' },
      { label: t('Responsible', 'المسؤول'), value: `${r.respName || '—'}${r.respMobile ? ' · ' + r.respMobile : ''}` },
    ];
    return (
      <div className="bg-white hover:bg-neutral-50/40 transition-colors px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-neutral-900">{r.itemName || <span className="text-neutral-300 font-normal">{t('Unnamed item', 'بند بلا اسم')}</span>}</p>
              <Badge variant={isProduct ? 'default' : 'info'}>{isAr ? ptMeta(r.purchaseType).ar : ptMeta(r.purchaseType).en}</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {chips.map((c, i) => (
                <div key={i} className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">{c.label}</p>
                  <p className="text-[12.5px] text-neutral-700 truncate" dir={/SAR|\d{4}-/.test(c.value) ? 'ltr' : undefined} title={c.value}>{c.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-end flex-shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-neutral-400">{t('Total value', 'القيمة الإجمالية')}</p>
            <p className="text-sm font-bold text-neutral-900 tabular-nums" dir="ltr">{rowTotal(r) ? `SAR ${fmt(rowTotal(r))}` : '—'}</p>
            <div className="flex justify-end gap-0.5 mt-1.5">
              <button type="button" onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-brand-50"><PencilIcon className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => removeBoqRow(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-error-500 hover:bg-error-50"><TrashIcon className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Add / Edit form ─────────────────────────────────────────────────────── */
  function renderForm() {
    const isProduct = draft.purchaseType === 'product';
    const computed = (() => {
      const price = n(draft.unitPrice);
      if (isProduct) return price * (n(draft.quantity) || 1) + n(draft.shippingCharges);
      return price;
    })();
    const set = (patch: Partial<Draft>) => setDraft((p) => ({ ...p, ...patch }));
    return (
      <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/30 overflow-hidden">
        <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-200 bg-white">
          <div>
            <p className="text-sm font-semibold text-neutral-800">{editingId ? t('Edit item', 'تعديل البند') : t('Add item', 'إضافة بند')}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t('Fields adapt to the purchase type.', 'تتغير الحقول حسب نوع الشراء.')}</p>
          </div>
          <button onClick={closeForm} className="text-neutral-500 hover:text-neutral-700 mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <FormField label="Purchase type" labelAr="نوع الشراء" required>
            <Select value={draft.purchaseType} onChange={(e) => set({ purchaseType: e.target.value as PurchaseType })}>
              {PURCHASE_TYPES.map((p) => <option key={p.id} value={p.id}>{isAr ? p.ar : p.en}</option>)}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Product name" labelAr="اسم المنتج" required>
              <Input value={draft.itemName} onChange={(e) => set({ itemName: e.target.value })} placeholder={t('e.g. Dell Latitude 5450', 'مثال: جهاز Dell Latitude 5450')} />
            </FormField>
            <FormField label="Product ID" labelAr="معرّف المنتج">
              <Input value={draft.productId} onChange={(e) => set({ productId: e.target.value })} placeholder={t('Catalogue / SKU', 'رمز الكتالوج / SKU')} />
            </FormField>
            <FormField label="Supplier" labelAr="المورّد">
              <Input value={draft.supplier} onChange={(e) => set({ supplier: e.target.value })} placeholder={t('Approved supplier name', 'اسم المورّد المعتمد')} />
            </FormField>
            <FormField label="Product price (SAR)" labelAr="سعر المنتج (ريال)">
              <Input type="number" min={0} value={draft.unitPrice} onChange={(e) => set({ unitPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0.00" />
            </FormField>

            {isProduct ? <>
              <FormField label="Order unit" labelAr="وحدة الطلب">
                <Input value={draft.orderUnit} onChange={(e) => set({ orderUnit: e.target.value })} placeholder={t('e.g. Each, Box', 'مثال: قطعة، صندوق')} />
              </FormField>
              <FormField label="Product quantity" labelAr="كمية المنتج">
                <Input type="number" min={0} value={draft.quantity} onChange={(e) => set({ quantity: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="1" />
              </FormField>
              <FormField label="Shipping charges (SAR)" labelAr="رسوم الشحن (ريال)">
                <Input type="number" min={0} value={draft.shippingCharges} onChange={(e) => set({ shippingCharges: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0.00" />
              </FormField>
            </> : <>
              <FormField label="Start date" labelAr="تاريخ البداية">
                <Input type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              </FormField>
              <FormField label="End date" labelAr="تاريخ النهاية">
                <Input type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} />
              </FormField>
              <FormField label="Duration" labelAr="المدة">
                <div className="flex items-center h-[38px] px-3 rounded-lg border border-neutral-200 bg-neutral-50 text-[13px] text-neutral-600">
                  {durationText(draft.startDate, draft.endDate, isAr) || <span className="text-neutral-400">{t('Set start & end dates', 'حدد تاريخي البداية والنهاية')}</span>}
                </div>
              </FormField>
            </>}

            <FormField label="Delivery date" labelAr="تاريخ التسليم">
              <Input type="date" value={draft.deliveryDate} onChange={(e) => set({ deliveryDate: e.target.value })} />
            </FormField>
            <FormField label="Delivery note — responsible name" labelAr="إشعار التسليم — اسم المسؤول">
              <Input value={draft.respName} onChange={(e) => set({ respName: e.target.value })} placeholder={t('Full name', 'الاسم الكامل')} />
            </FormField>
            <FormField label="Delivery note — responsible mobile" labelAr="إشعار التسليم — جوال المسؤول">
              <Input value={draft.respMobile} onChange={(e) => set({ respMobile: e.target.value })} placeholder="05XXXXXXXX" />
            </FormField>
            <FormField label="Total value (SAR)" labelAr="القيمة الإجمالية (ريال)"
              hint={computed > 0 ? t(`Suggested: SAR ${fmt(computed)}`, `المقترح: ${fmt(computed)} ريال`) : undefined}>
              <Input type="number" min={0} value={draft.lineTotal} onChange={(e) => set({ lineTotal: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder={computed > 0 ? fmt(computed) : '0.00'} />
            </FormField>
          </div>

          <FormField label="Notes" labelAr="ملاحظات">
            <Textarea rows={2} value={draft.itemDescription} onChange={(e) => set({ itemDescription: e.target.value })} placeholder={t('Any extra detail about this item…', 'أي تفاصيل إضافية عن هذا البند…')} />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-600 hover:bg-neutral-50">{t('Cancel', 'إلغاء')}</button>
            <button onClick={commit} disabled={!valid}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {editingId ? t('Save changes', 'حفظ التغييرات') : t('Add item', 'إضافة البند')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
