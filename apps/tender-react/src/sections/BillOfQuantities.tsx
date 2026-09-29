import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useTender } from '../context/TenderContext';
import { useT } from '../context/LanguageContext';
import { PROJECTS, UNITS_OF_MEASURE } from '../data/mockData';
import { FormField, SectionCard, AIButton, InfoBanner, Input, Select, Textarea } from '../components/ui';
import { PlusIcon, TrashIcon, SparklesIcon, DownloadIcon, UploadIcon, ChevronRightIcon, PencilIcon, InfoIcon } from '../components/Icons';
import HoverNote from '../components/HoverNote';
import type { BOQRow } from '../types/tender';
import { useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote, num, str, arr } from '../lib/useAiAction';
import { aiBoq, type AiBoqRow } from '../lib/aiTender';
import { saveFile, aiErrorMessage } from '../lib/claudeRuntime';
import { checkEtimadAvailability, isStale, needsJustification } from '../lib/etimadCheck';
import EtimadPanel from '../components/EtimadPanel';
import BoqSheet from '../components/BoqSheet';
import { useBoqLayout, setBoqLayout } from '../lib/boqLayout';

const BOQ_COLUMNS = [
  'Project Item',
  'Item Name',
  'Description',
  'Unit of Measure',
  'Quantity',
  'Unit Price (SAR)',
  'Delivery Date',
  'Has Brand Name (Yes/No)',
  'Brand Justification',
];

function downloadBOQExcel(rows: BOQRow[]) {
  const data = rows.length > 0
    ? rows.map((r) => ({
        'Project Item': r.projectItem,
        'Item Name': r.itemName,
        'Description': r.itemDescription,
        'Unit of Measure': r.unitOfMeasure,
        'Quantity': r.quantity,
        'Unit Price (SAR)': r.unitPrice,
        'Delivery Date': r.deliveryDate,
        'Has Brand Name (Yes/No)': r.hasBrandName ? 'Yes' : 'No',
        'Brand Justification': r.brandJustification ?? '',
      }))
    : [Object.fromEntries(BOQ_COLUMNS.map((c) => [c, '']))];

  const ws = XLSX.utils.json_to_sheet(data, { header: BOQ_COLUMNS });

  // Column widths
  ws['!cols'] = [28, 36, 40, 18, 10, 18, 14, 22, 40].map((w) => ({ wch: w }));

  // Style header row bold (xlsx CE doesn't support cell styles, but we mark it via comment)
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ');
  const name = rows.length > 0 ? 'BOQ_prefilled.xlsx' : 'BOQ_template.xlsx';
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  saveFile(name, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', () => XLSX.writeFile(wb, name));
}

function parseBOQExcel(file: File): Promise<Omit<BOQRow, 'id'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        const parsed: Omit<BOQRow, 'id'>[] = rows
          .filter((r) => r['Item Name'] && String(r['Item Name']).trim())
          .map((r) => ({
            projectItem: String(r['Project Item'] ?? ''),
            itemName: String(r['Item Name'] ?? ''),
            itemDescription: String(r['Description'] ?? ''),
            unitOfMeasure: String(r['Unit of Measure'] ?? 'Each'),
            quantity: Number(r['Quantity']) || '',
            unitPrice: Number(r['Unit Price (SAR)']) || '',
            deliveryDate: String(r['Delivery Date'] ?? ''),
            hasBrandName: String(r['Has Brand Name (Yes/No)'] ?? '').toLowerCase() === 'yes',
            brandJustification: String(r['Brand Justification'] ?? ''),
          }));
        resolve(parsed);
      } catch {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const AI_BOQ_ROWS = [
  { projectItem: 'ERP Software Licenses', itemName: 'SAP S/4HANA Enterprise License', itemDescription: 'Named user licenses — Professional access (full module access)', unitOfMeasure: 'License', quantity: 500, unitPrice: 2800, deliveryDate: '2025-12-01' },
  { projectItem: 'ERP Software Licenses', itemName: 'SAP S/4HANA Enterprise License', itemDescription: 'Named user licenses — Limited access (read-only + reporting)', unitOfMeasure: 'License', quantity: 200, unitPrice: 1200, deliveryDate: '2025-12-01' },
  { projectItem: 'Implementation & Configuration Services', itemName: 'Project Management Services', itemDescription: 'Dedicated project manager for full project duration', unitOfMeasure: 'Month', quantity: 18, unitPrice: 45000, deliveryDate: '2026-06-30' },
  { projectItem: 'Implementation & Configuration Services', itemName: 'Technical Consulting Services', itemDescription: 'Senior solution architects and technical consultants', unitOfMeasure: 'Day', quantity: 320, unitPrice: 8500, deliveryDate: '2026-06-30' },
  { projectItem: 'Data Migration Services', itemName: 'Data Migration & Cleansing', itemDescription: 'Full data migration including cleansing, mapping, validation, and reconciliation', unitOfMeasure: 'Service', quantity: 1, unitPrice: 380000, deliveryDate: '2026-03-31' },
  { projectItem: 'End-User Training Program', itemName: 'End-User Training (Arabic)', itemDescription: 'Classroom and e-learning training for all user categories', unitOfMeasure: 'Package', quantity: 1, unitPrice: 120000, deliveryDate: '2026-05-31' },
  { projectItem: 'Annual Technical Support & Maintenance', itemName: '3-Year Support & Maintenance Contract', itemDescription: 'Includes software updates, security patches, helpdesk (8am–5pm, Sun–Thu, 4hr SLA)', unitOfMeasure: 'Year', quantity: 3, unitPrice: 280000, deliveryDate: '2029-06-30' },
];

const EMPTY_FORM = {
  projectItem: '', itemName: '', itemDescription: '',
  unitOfMeasure: 'Each', quantity: '' as number | '',
  unitPrice: '' as number | '', deliveryDate: '',
  hasBrandName: false, brandJustification: '',
};

const GROUP_COLORS = ['bg-brand-500', 'bg-ai-500', 'bg-warning-500', 'bg-success-600', 'bg-error-500', 'bg-neutral-400'];

export default function BillOfQuantities() {
  const { formData, updateField, removeBoqRow, updateBoqRow, moveBoqRowsToEtimad, boqSubtotal, boqVat, boqTotal } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const boqAi = useAiAction();
  const aiLoading = boqAi.loading;
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ ...EMPTY_FORM });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [etimadError, setEtimadError] = useState('');
  const layout = useBoqLayout();

  async function runEtimadCheck(rows: BOQRow[]) {
    if (rows.length === 0) return;
    const ids = rows.map((r) => r.id);
    setCheckingIds((prev) => new Set([...prev, ...ids]));
    setEtimadError('');
    try {
      const results = await checkEtimadAvailability(rows, formData, isAr);
      if (results === null) {
        setEtimadError(t('The Etimad check uses AI, which is not available in this view. Open the page in Claude and allow AI to use it.', 'يعتمد التحقق من اعتماد على الذكاء الاصطناعي، وهو غير متاح في هذا العرض. افتح الصفحة في Claude واسمح باستخدامه.'));
      } else {
        Object.entries(results).forEach(([id, check]) => updateBoqRow(id, { etimadCheck: check }));
        if (Object.keys(results).length < rows.length) {
          setEtimadError(t('Some items could not be checked. Try them again.', 'تعذّر التحقق من بعض البنود. حاول مجدداً.'));
        }
      }
    } catch (e) {
      setEtimadError(aiErrorMessage(e, isAr));
    } finally {
      setCheckingIds((prev) => { const n = new Set(prev); ids.forEach((i) => n.delete(i)); return n; });
    }
  }

  const uncheckedRows = formData.boqItems.filter((r) => r.itemName.trim() && (!r.etimadCheck || isStale(r)));
  const etimadAvailableCount = formData.boqItems.filter((r) => r.etimadCheck?.status === 'available' && !isStale(r)).length;
  const namedCount = formData.boqItems.filter((r) => r.itemName.trim()).length;
  const etimadMissingJust = formData.boqItems.filter(needsJustification).length;

  async function handleFileUpload(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setUploadError(t('Please upload an .xlsx or .xls file.', 'يرجى رفع ملف بصيغة .xlsx أو .xls.'));
      return;
    }
    setUploadError(null);
    setUploadLoading(true);
    try {
      const parsed = await parseBOQExcel(file);
      if (parsed.length === 0) {
        setUploadError(t('No valid rows found. Check the template columns.', 'لم يتم العثور على بنود صالحة. تحقق من أعمدة النموذج.'));
        return;
      }
      const rows: BOQRow[] = parsed.map((r) => ({ id: crypto.randomUUID(), ...r }));
      updateField('boqItems', rows);
      setExpandedGroups(new Set(rows.map((r) => r.projectItem).filter(Boolean)));
      setShowUploadZone(false);
    } catch {
      setUploadError(t('Failed to parse the file. Make sure you used the downloaded template.', 'تعذّر قراءة الملف. تأكد من استخدام النموذج الذي تم تنزيله.'));
    } finally {
      setUploadLoading(false);
    }
  }

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);
  const projectItems = selectedProject?.items ?? [];

  const rowTotal = (row: BOQRow) => {
    const q = typeof row.quantity === 'number' ? row.quantity : 0;
    const p = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
    return q * p;
  };

  const groups: { key: string; rows: BOQRow[] }[] = [];
  formData.boqItems.forEach((row) => {
    const key = row.projectItem || t('Unclassified', 'غير مصنف');
    const existing = groups.find((g) => g.key === key);
    if (existing) existing.rows.push(row);
    else groups.push({ key, rows: [row] });
  });

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleAISuggest() {
    const applyRows = (src: AiBoqRow[]) => {
      const rows: BOQRow[] = src.filter((r) => r && r.itemName).map((r) => ({
        id: crypto.randomUUID(), hasBrandName: false, brandJustification: '',
        projectItem: str(r.projectItem), itemName: str(r.itemName), itemDescription: str(r.itemDescription),
        unitOfMeasure: UNITS_OF_MEASURE.includes(str(r.unitOfMeasure)) ? str(r.unitOfMeasure) : 'Each',
        quantity: num(r.quantity), unitPrice: num(r.unitPrice), deliveryDate: str(r.deliveryDate),
      }));
      updateField('boqItems', rows);
      setExpandedGroups(new Set(rows.map((r) => r.projectItem)));
    };
    boqAi.run(() => aiBoq(formData, isAr), (r) => applyRows(arr<AiBoqRow>(r)), () => applyRows(AI_BOQ_ROWS));
  }

  function handleAddItem() {
    if (!newItem.projectItem || !newItem.itemName) return;
    const id = crypto.randomUUID();
    updateField('boqItems', [...formData.boqItems, { id, ...newItem }]);
    setExpandedGroups((prev) => new Set([...prev, newItem.projectItem]));
    setNewItem({ ...EMPTY_FORM });
    setShowAddForm(false);
  }
  const [editingId, setEditingId] = useState<string | null>(null);

  function closeItemForm() {
    setShowAddForm(false);
    setEditingId(null);
    setNewItem({ ...EMPTY_FORM });
  }

  function startEdit(row: BOQRow) {
    setShowAddForm(false);
    setEditingId(row.id);
    setNewItem({
      projectItem: row.projectItem, itemName: row.itemName, itemDescription: row.itemDescription,
      unitOfMeasure: row.unitOfMeasure || 'Each', quantity: row.quantity, unitPrice: row.unitPrice,
      deliveryDate: row.deliveryDate, hasBrandName: !!row.hasBrandName, brandJustification: row.brandJustification ?? '',
    });
  }

  function handleSaveEdit() {
    if (!editingId || !newItem.projectItem || !newItem.itemName) return;
    updateBoqRow(editingId, { ...newItem, brandJustification: newItem.hasBrandName ? newItem.brandJustification : '' });
    setExpandedGroups((prev) => new Set([...prev, newItem.projectItem]));
    closeItemForm();
  }

  function renderItemForm(mode: 'add' | 'edit') {
    return (
          <div className={`${mode === 'edit' ? 'm-3' : 'mt-3'} rounded-xl border border-neutral-200 bg-neutral-50/60 overflow-hidden`}>
            <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-200 bg-white">
              <div>
                <p className="text-sm font-semibold text-neutral-800">{mode === 'edit' ? t('Edit BOQ Item', 'تعديل البند') : t('Add BOQ Item', 'إضافة بند')}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{mode === 'edit' ? t('Change the fields, then save. Changing name, quantity or price resets the Etimad check.', 'عدّل الحقول ثم احفظ. تغيير الاسم أو الكمية أو السعر يعيد التحقق من اعتماد.') : t('Fill all fields then save to add to the table', 'أكمل جميع الحقول ثم احفظ لإضافتها إلى الجدول')}</p>
              </div>
              <button
                onClick={closeItemForm}
                className="text-neutral-400 hover:text-neutral-600 transition-colors mt-0.5"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* 1. Project Item Classification — top */}
              <FormField label="Project Item Classification" labelAr="تصنيف بند المشروع" required>
                <Select
                  value={newItem.projectItem}
                  onChange={(e) => setNewItem((p) => ({ ...p, projectItem: e.target.value }))}
                >
                  <option value="">{t('Select project item…', 'اختر بند المشروع…')}</option>
                  {projectItems.length > 0
                    ? projectItems.map((it) => <option key={it.id} value={it.name}>{it.name}</option>)
                    : [...new Set(AI_BOQ_ROWS.map((r) => r.projectItem))].map((v) => <option key={v} value={v}>{v}</option>)
                  }
                </Select>
              </FormField>

              {/* 2. Item Name */}
              <FormField label="Item Name" labelAr="اسم البند" required>
                <Input
                  type="text"
                  value={newItem.itemName}
                  onChange={(e) => setNewItem((p) => ({ ...p, itemName: e.target.value }))}
                  placeholder={t('Item name…', 'اسم البند…')}
                />
              </FormField>

              {/* 3. Description */}
              <FormField label="Description" labelAr="الوصف">
                <Textarea
                  value={newItem.itemDescription}
                  onChange={(e) => setNewItem((p) => ({ ...p, itemDescription: e.target.value }))}
                  placeholder={t('Describe this item…', 'صف هذا البند…')}
                  rows={3}
                />
              </FormField>

              {/* 4. Unit / Qty / Unit Price */}
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Unit of Measure" labelAr="وحدة القياس">
                  <Select
                    value={newItem.unitOfMeasure}
                    onChange={(e) => setNewItem((p) => ({ ...p, unitOfMeasure: e.target.value }))}
                  >
                    {UNITS_OF_MEASURE.map((u) => <option key={u} value={u}>{u}</option>)}
                  </Select>
                </FormField>
                <FormField label="Quantity" labelAr="الكمية">
                  <Input
                    type="number" min={0}
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="1"
                  />
                </FormField>
                <FormField label="Unit Price (SAR)" labelAr="سعر الوحدة">
                  <Input
                    type="number" min={0}
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem((p) => ({ ...p, unitPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="0.00"
                  />
                </FormField>
              </div>

              {/* 5. Delivery Date + Has Brand Name */}
              <div className="grid grid-cols-2 gap-4 items-start">
                <FormField label="Delivery Date" labelAr="موعد التسليم">
                  <Input
                    type="date"
                    value={newItem.deliveryDate}
                    onChange={(e) => setNewItem((p) => ({ ...p, deliveryDate: e.target.value }))}
                  />
                </FormField>
                <FormField label="Has Brand Name?" labelAr="هل يوجد علامة تجارية؟">
                  <div className="flex rounded-lg border border-neutral-300 overflow-hidden mt-0.5" dir="ltr">
                    <button
                      type="button"
                      onClick={() => setNewItem((p) => ({ ...p, hasBrandName: true }))}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${newItem.hasBrandName ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                    >
                      {t('Yes', 'نعم')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem((p) => ({ ...p, hasBrandName: false, brandJustification: '' }))}
                      className={`flex-1 py-2 text-sm font-medium border-s border-neutral-300 transition-colors ${!newItem.hasBrandName ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                    >
                      {t('No', 'لا')}
                    </button>
                  </div>
                </FormField>
              </div>

              {/* 6. Brand Justification — when hasBrandName */}
              {newItem.hasBrandName && (
                <div className="slide-up">
                  <FormField label="Brand Justification" labelAr="مبرر العلامة التجارية" required>
                    <Textarea
                      value={newItem.brandJustification}
                      onChange={(e) => setNewItem((p) => ({ ...p, brandJustification: e.target.value }))}
                      placeholder={t('Explain why a specific brand is required…', 'اشرح سبب الحاجة لعلامة تجارية محددة…')}
                      rows={3}
                    />
                  </FormField>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  onClick={closeItemForm}
                  className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  onClick={mode === 'edit' ? handleSaveEdit : handleAddItem}
                  disabled={!newItem.projectItem || !newItem.itemName || (newItem.hasBrandName && !newItem.brandJustification.trim())}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {mode === 'edit' ? t('Save changes', 'حفظ التغييرات') : t('Add to BOQ', 'إضافة إلى الجدول')}
                </button>
              </div>
            </div>
          </div>
    );
  }


  return (
    <div className="space-y-5">
      <SectionCard
        title="Bill of Quantities"
        titleAr="جدول الكميات"
        description="Define all items, quantities, and unit prices for this tender."
        descriptionAr="حدد جميع البنود والكميات وأسعار الوحدة لهذه المنافسة."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadZone((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm"
            >
              <UploadIcon className="w-3.5 h-3.5" />
              {t('Use a Template', 'استخدم نموذجاً')}
            </button>
            <AIButton onClick={handleAISuggest} loading={aiLoading} label={t('AI Suggest BOQ', 'اقتراح جدول الكميات')} />
          </div>
        }
      >
        {/* A/B layout switch */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t('Layout', 'طريقة العرض')}</span>
          <div role="radiogroup" aria-label={t('BOQ layout', 'طريقة عرض جدول الكميات')} className="inline-flex rounded-lg border border-neutral-300 bg-neutral-50 p-0.5">
            {([['cards', t('A · Grouped + form', 'أ · مجمّع + نموذج')], ['sheet', t('B · Sheet', 'ب · جدول')]] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={layout === v} onClick={() => setBoqLayout(v)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${layout === v ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload zone */}
        {showUploadZone && (
          <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden">
            {/* Drop area */}
            <div
              className="border-2 border-dashed border-neutral-300 rounded-xl m-3 p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              {uploadLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <SparklesIcon className="w-7 h-7 text-brand-400 spin-slow" />
                  <p className="text-sm text-neutral-600">{t('Reading file…', 'جاري قراءة الملف…')}</p>
                </div>
              ) : (
                <>
                  <UploadIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-neutral-600">{t('Drop your Excel file here, or', 'اسحب ملف Excel هنا، أو')}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-brand-600 font-semibold hover:text-brand-700 mt-0.5 transition-colors"
                  >
                    {t('browse to upload', 'تصفح للرفع')}
                  </button>
                  <p className="text-xs text-neutral-400 mt-2">{t('Supports .xlsx and .xls · Max 10MB', 'يدعم .xlsx و .xls · الحد الأقصى 10 ميجابايت')}</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Error */}
            {uploadError && (
              <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-error-50 border border-error-100 text-xs text-error-700">
                {uploadError}
              </div>
            )}

            {/* Download template */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-200 bg-white">
              <p className="text-xs text-neutral-500">
                {formData.boqItems.length > 0
                  ? t('Download current BOQ as pre-filled template', 'تنزيل جدول الكميات الحالي كنموذج مملوء')
                  : t('Download the template, fill it in Excel, then upload.', 'نزّل النموذج، أكمله في Excel، ثم ارفعه.')}
              </p>
              <button
                onClick={() => downloadBOQExcel(formData.boqItems)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors flex-shrink-0 ms-3"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                {formData.boqItems.length > 0 ? t('Download pre-filled', 'تنزيل مملوء') : t('Download template', 'تنزيل النموذج')}
              </button>
            </div>
          </div>
        )}

        {/* AI loading */}
        {aiLoading && (
          <div className="mb-4 rounded-lg border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm">
              <SparklesIcon className="w-4 h-4 spin-slow" />
              {t('AI is analyzing your project and generating BOQ suggestions…', 'يحلل الذكاء الاصطناعي مشروعك ويولد اقتراحات جدول الكميات…')}
            </div>
          </div>
        )}

        <AiNote error={boqAi.error} usedSample={boqAi.usedSample} />

        {/* Empty state — hidden while add form is open */}
        {layout === 'cards' && groups.length === 0 && !showAddForm && (
          <div className="rounded-xl border-2 border-dashed border-neutral-200 py-10 text-center">
            <p className="text-sm text-neutral-400">
              {t('No items yet. Click "Add BOQ Item" below or use AI Suggest.', 'لا توجد بنود. انقر "إضافة بند" أدناه أو استخدم اقتراح الذكاء الاصطناعي.')}
            </p>
          </div>
        )}

        {formData.boqItems.length > 0 && (
          <div className="mb-3 flex items-center gap-3 flex-wrap rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[12px] font-semibold text-neutral-800">{t('Etimad Souq availability', 'التوفر في سوق اعتماد')}</p>
              <p className="text-[11px] text-neutral-500">
                {uncheckedRows.length > 0
                  ? t(`${uncheckedRows.length} of ${namedCount} items not checked yet.`, `${uncheckedRows.length} من ${namedCount} بنود لم يُتحقق منها بعد.`)
                  : t('All items checked.', 'تم التحقق من جميع البنود.')}
                {etimadAvailableCount > 0 && ' ' + t(`${etimadAvailableCount} available in Etimad Souq.`, `${etimadAvailableCount} متوفرة في سوق اعتماد.`)}
                {etimadMissingJust > 0 && ' ' + t(`${etimadMissingJust} kept without a justification.`, `${etimadMissingJust} أُبقيت دون مبرر.`)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => runEtimadCheck(uncheckedRows)}
              disabled={uncheckedRows.length === 0 || checkingIds.size > 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-ai-50 text-ai-700 border border-ai-200 hover:bg-ai-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className={`w-3.5 h-3.5 ${checkingIds.size > 0 ? 'spin-slow' : ''}`} />
              {checkingIds.size > 0 ? t('Checking Etimad…', 'جاري التحقق من اعتماد…') : t('Check all in Etimad', 'التحقق من الكل في اعتماد')}
            </button>
            {etimadError && <p className="basis-full text-[11px] text-error-600">{etimadError}</p>}
            {formData.linkedEtimadRequestId && (
              <p className="basis-full text-[11px] text-success-700">
                {t('Moved items are in a separate Etimad Souq draft under My Requests.', 'البنود المنقولة موجودة في مسودة مستقلة لسوق اعتماد ضمن طلباتي.')}
              </p>
            )}
          </div>
        )}

        {/* B · spreadsheet */}
        {layout === 'sheet' && (
          <BoqSheet
            rows={formData.boqItems}
            setRows={(rows) => updateField('boqItems', rows)}
            projectItemOptions={projectItems.length > 0 ? projectItems.map((it) => it.name) : [...new Set(AI_BOQ_ROWS.map((r) => r.projectItem))]}
            checkingIds={checkingIds}
            onCheck={(row) => runEtimadCheck([row])}
            onMove={(row) => moveBoqRowsToEtimad([row.id])}
            onUpdate={updateBoqRow}
            onRemove={removeBoqRow}
          />
        )}

        {/* Accordion groups */}
        {layout === 'cards' && groups.length > 0 && (
          <div className="rounded-xl border border-neutral-200 overflow-hidden divide-y divide-neutral-200">
            {groups.map((group, gi) => {
              const isExpanded = expandedGroups.has(group.key);
              const subtotal = group.rows.reduce((s, r) => s + rowTotal(r), 0);
              const dotColor = GROUP_COLORS[gi % GROUP_COLORS.length];

              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 hover:bg-neutral-100/60 transition-colors text-start"
                  >
                    <ChevronRightIcon className={`w-3.5 h-3.5 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className="flex-1 text-sm font-semibold text-neutral-800 truncate">{group.key}</span>
                    <span className="text-[11px] text-neutral-400 tabular-nums flex-shrink-0">
                      {group.rows.length} {group.rows.length === 1 ? t('item', 'بند') : t('items', 'بنود')}
                    </span>
                    {subtotal > 0 && (
                      <span className="text-xs font-semibold text-neutral-700 tabular-nums flex-shrink-0" dir="ltr">
                        SAR {formatSAR(subtotal)}
                      </span>
                    )}
                  </button>

                  {isExpanded && (
                    <div>
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_52px_104px_136px_60px] px-5 py-2 bg-white border-b border-neutral-100">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">{t('Item', 'البند')}</span>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide text-center">{t('Qty', 'الكمية')}</span>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide text-end">{t('Unit Price', 'سعر الوحدة')}</span>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide text-end">{t('Total', 'الإجمالي')}</span>
                        <span />
                      </div>

                      {/* Rows — view mode */}
                      <div className="divide-y divide-neutral-100">
                        {group.rows.map((row) => {
                          const total = rowTotal(row);
                          const unitPrice = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
                          return (
                            <div key={row.id} className="bg-white">
                            {editingId === row.id ? renderItemForm('edit') : (<>
                            <div className="grid grid-cols-[1fr_52px_104px_136px_60px] items-center px-5 pt-3.5 pb-2 bg-white hover:bg-neutral-50/40 transition-colors group/row">
                              {/* Item */}
                              <div className="pe-4">
                                <p className="text-sm font-semibold text-neutral-900 leading-snug">{row.itemName || <span className="text-neutral-300 font-normal">{t('Unnamed item', 'بند بلا اسم')}</span>}</p>
                                {row.itemDescription && (
                                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">{row.itemDescription}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {row.hasBrandName && (
                                    <HoverNote
                                      title={t('Brand justification', 'مبرر العلامة التجارية')}
                                      trigger={
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning-50 text-warning-700 border border-warning-100">
                                          {t('Brand req.', 'يتطلب علامة تجارية')}
                                          <InfoIcon className="w-3 h-3" />
                                        </span>
                                      }
                                    >
                                      {(row.brandJustification ?? '').trim()
                                        ? <span className="whitespace-pre-line">{row.brandJustification}</span>
                                        : <span className="text-warning-100">{t('No justification yet. Edit the item to add one.', 'لا يوجد مبرر بعد. عدّل البند لإضافته.')}</span>}
                                    </HoverNote>
                                  )}
                                  {row.deliveryDate && (
                                    <span className="text-[10px] text-neutral-400" dir="ltr">{row.deliveryDate}</span>
                                  )}
                                </div>
                              </div>

                              {/* Qty */}
                              <div className="text-center">
                                <span className="text-sm text-neutral-700 tabular-nums">
                                  {row.quantity !== '' ? row.quantity : '—'}
                                </span>
                              </div>

                              {/* Unit Price */}
                              <div className="text-end">
                                <span className="text-sm text-neutral-700 tabular-nums" dir="ltr">
                                  {unitPrice > 0 ? `SAR ${formatSAR(unitPrice)}` : '—'}
                                </span>
                              </div>

                              {/* Total */}
                              <div className="text-end">
                                <span className="text-sm font-bold text-neutral-900 tabular-nums" dir="ltr">
                                  {total > 0 ? `SAR ${formatSAR(total)}` : '—'}
                                </span>
                              </div>

                              {/* Edit / Delete */}
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEdit(row)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                                  title={t('Edit item', 'تعديل البند')}
                                  aria-label={t(`Edit ${row.itemName}`, `تعديل ${row.itemName}`)}
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { if (editingId === row.id) closeItemForm(); removeBoqRow(row.id); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-300 hover:text-error-500 hover:bg-error-50 transition-colors"
                                  title={t('Delete item', 'حذف البند')}
                                  aria-label={t(`Delete ${row.itemName}`, `حذف ${row.itemName}`)}
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="px-5 pb-3.5">
                              <EtimadPanel
                                row={row}
                                checking={checkingIds.has(row.id)}
                                onCheck={() => runEtimadCheck([row])}
                                onMove={() => moveBoqRowsToEtimad([row.id])}
                                onUpdate={(patch) => updateBoqRow(row.id, patch)}
                              />
                            </div>
                            </>)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add BOQ item — inline form */}
        {layout === 'cards' && showAddForm && renderItemForm('add')}

        {/* Add row link */}
        {layout === 'cards' && !showAddForm && (
          <button
            onClick={() => { closeItemForm(); setShowAddForm(true); }}
            className="mt-3 flex items-center gap-1.5 text-xs text-brand-600 font-medium hover:text-brand-700 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {t('Add BOQ Item', 'إضافة بند')}
          </button>
        )}

        {/* Totals */}
        {formData.boqItems.length > 0 && (
          <div className="mt-4 ms-auto max-w-xs space-y-2 border-t border-neutral-200 pt-4">
            <div className="flex justify-between text-sm text-neutral-600">
              <span>{t('Subtotal', 'الإجمالي الفرعي')}</span>
              <span className="tabular-nums" dir="ltr">SAR {formatSAR(boqSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-neutral-600">
              <span>{t('VAT (15%)', 'ضريبة القيمة المضافة (15%)')}</span>
              <span className="tabular-nums" dir="ltr">SAR {formatSAR(boqVat)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-neutral-900 border-t border-neutral-200 pt-2">
              <span>{t('Total (incl. VAT)', 'الإجمالي (شامل ض.ق.م)')}</span>
              <span className="tabular-nums" dir="ltr">SAR {formatSAR(boqTotal)}</span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
