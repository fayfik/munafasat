import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useTender } from '../context/TenderContext';
import { useT } from '../context/LanguageContext';
import { PROJECTS, UNITS_OF_MEASURE } from '../data/mockData';
import { FormField, SectionCard, AIButton, InfoBanner, Input, Select, Textarea, Badge } from '../components/ui';
import { PlusIcon, TrashIcon, SparklesIcon, DownloadIcon, UploadIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon, PencilIcon, InfoIcon, GridIcon, TableIcon, ListIcon, DocumentIcon } from '../components/Icons';
import HoverNote from '../components/HoverNote';
import BoqAttachments from '../components/BoqAttachments';
import type { BOQRow, BOQCategory, FileAttachment } from '../types/tender';
import { BOQ_CATEGORIES, BOQ_CATEGORY_META, deriveCategory } from '../lib/boqCategory';
import { QUALIFICATIONS, NATIONALITIES, nationalityLabel, effectiveQty, generateManpowerDescription } from '../lib/boqManpower';
import { useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote, num, str, arr } from '../lib/useAiAction';
import { aiBoq, type AiBoqRow } from '../lib/aiTender';
import { saveFile, aiErrorMessage } from '../lib/claudeRuntime';
import { isStale, needsJustification, isPendingProcurement, simulatedProcurementReply } from '../lib/etimadCheck';
import EtimadPanel from '../components/EtimadPanel';
import BoqSheet from '../components/BoqSheet';
import { useBoqLayout, setBoqLayout } from '../lib/boqLayout';
import EsouqBillOfQuantities from './EsouqBillOfQuantities';
import BrowseRfpsDialog from '../components/BrowseRfpsDialog';
import { buildRfpImport, type PastRfp } from '../lib/rfpLibrary';

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

export const AI_BOQ_ROWS = [
  { projectItem: 'ERP Software Licenses', itemName: 'SAP S/4HANA Enterprise License', itemDescription: 'Named user licenses — Professional access (full module access)', unitOfMeasure: 'License', quantity: 500, unitPrice: 2800, deliveryDate: '2025-12-01' },
  { projectItem: 'ERP Software Licenses', itemName: 'SAP S/4HANA Enterprise License', itemDescription: 'Named user licenses — Limited access (read-only + reporting)', unitOfMeasure: 'License', quantity: 200, unitPrice: 1200, deliveryDate: '2025-12-01' },
  { projectItem: 'Implementation & Configuration Services', itemName: 'Project Management Services', itemDescription: 'Dedicated project manager for full project duration', unitOfMeasure: 'Month', quantity: 18, unitPrice: 45000, deliveryDate: '2026-06-30' },
  { projectItem: 'Implementation & Configuration Services', itemName: 'Technical Consulting Services', itemDescription: 'Senior solution architects and technical consultants', unitOfMeasure: 'Day', quantity: 320, unitPrice: 8500, deliveryDate: '2026-06-30' },
  { projectItem: 'Data Migration Services', itemName: 'Data Migration & Cleansing', itemDescription: 'Full data migration including cleansing, mapping, validation, and reconciliation', unitOfMeasure: 'Service', quantity: 1, unitPrice: 380000, deliveryDate: '2026-03-31' },
  { projectItem: 'End-User Training Program', itemName: 'End-User Training (Arabic)', itemDescription: 'Classroom and e-learning training for all user categories', unitOfMeasure: 'Package', quantity: 1, unitPrice: 120000, deliveryDate: '2026-05-31' },
  { projectItem: 'Annual Technical Support & Maintenance', itemName: '3-Year Support & Maintenance Contract', itemDescription: 'Includes software updates, security patches, helpdesk (8am–5pm, Sun–Thu, 4hr SLA)', unitOfMeasure: 'Year', quantity: 3, unitPrice: 280000, deliveryDate: '2029-06-30' },
];

// Arabic sample BOQ — used when the app language is Arabic so AI output is fully Arabic.
export const AI_BOQ_ROWS_AR = [
  { projectItem: 'تراخيص برمجيات نظام تخطيط الموارد', itemName: 'ترخيص SAP S/4HANA للمؤسسات', itemDescription: 'تراخيص مستخدمين مُسمّين — وصول احترافي كامل لجميع الوحدات', unitOfMeasure: 'License', quantity: 500, unitPrice: 2800, deliveryDate: '2025-12-01' },
  { projectItem: 'تراخيص برمجيات نظام تخطيط الموارد', itemName: 'ترخيص SAP S/4HANA للمؤسسات', itemDescription: 'تراخيص مستخدمين مُسمّين — وصول محدود (قراءة وتقارير فقط)', unitOfMeasure: 'License', quantity: 200, unitPrice: 1200, deliveryDate: '2025-12-01' },
  { projectItem: 'خدمات التنفيذ والتهيئة', itemName: 'خدمات إدارة المشروع', itemDescription: 'مدير مشروع متفرّغ طوال مدة المشروع', unitOfMeasure: 'Month', quantity: 18, unitPrice: 45000, deliveryDate: '2026-06-30' },
  { projectItem: 'خدمات التنفيذ والتهيئة', itemName: 'خدمات الاستشارات التقنية', itemDescription: 'مهندسو حلول ومستشارون تقنيون أول', unitOfMeasure: 'Day', quantity: 320, unitPrice: 8500, deliveryDate: '2026-06-30' },
  { projectItem: 'خدمات ترحيل البيانات', itemName: 'ترحيل وتنظيف البيانات', itemDescription: 'ترحيل كامل للبيانات يشمل التنظيف والمطابقة والتحقق والمصالحة', unitOfMeasure: 'Service', quantity: 1, unitPrice: 380000, deliveryDate: '2026-03-31' },
  { projectItem: 'برنامج تدريب المستخدمين النهائيين', itemName: 'تدريب المستخدمين النهائيين (بالعربية)', itemDescription: 'تدريب حضوري وإلكتروني لجميع فئات المستخدمين', unitOfMeasure: 'Package', quantity: 1, unitPrice: 120000, deliveryDate: '2026-05-31' },
  { projectItem: 'الدعم الفني والصيانة السنوية', itemName: 'عقد دعم وصيانة لمدة ثلاث سنوات', itemDescription: 'يشمل تحديثات البرمجيات والتصحيحات الأمنية ومكتب المساعدة', unitOfMeasure: 'Year', quantity: 3, unitPrice: 280000, deliveryDate: '2029-06-30' },
];

const MANDATORY_LIST_URL = 'https://lcgpa.gov.sa/p/ar_SA/MandatoryListNationalProducts';

/** Dropdown multi-select for Man Power nationalities. */
function NationalityMultiSelect({ selected, onToggle, isAr, t }: {
  selected: string[]; onToggle: (v: string) => void; isAr: boolean; t: (en: string, ar: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const label = selected.length > 0
    ? selected.map((v) => nationalityLabel(v, isAr)).join('، ')
    : t('Select nationalities…', 'اختر الجنسيات…');
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-body-md shadow-sm transition-colors hover:border-neutral-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 ${selected.length ? 'text-neutral-900' : 'text-neutral-400'}`}>
        <span className="flex-1 truncate text-start">{label}</span>
        {selected.length > 0 && <span className="text-[10px] font-bold text-white bg-brand-600 rounded-full px-1.5 py-0.5 flex-shrink-0">{selected.length}</span>}
        <ChevronDownIcon className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg slide-up">
          <ul className="py-1">
            {NATIONALITIES.map((n) => {
              const on = selected.includes(n.value);
              return (
                <li key={n.value}>
                  <button type="button" onClick={() => onToggle(n.value)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-start hover:bg-neutral-50 transition-colors">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${on ? 'bg-brand-600 border-brand-600' : 'border-neutral-300'}`}>
                      {on && <CheckIcon className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-[13px] text-neutral-700">{isAr ? n.ar : n.en}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  projectItem: '', category: '' as BOQCategory | '', itemName: '', itemDescription: '',
  unitOfMeasure: 'Each', quantity: '' as number | '',
  unitPrice: '' as number | '', deliveryDate: '',
  hasBrandName: false, brandJustification: '', attachments: [] as FileAttachment[],
  mandatoryList: '',
  // Man Power fields
  jobTitle: '', staffCount: '' as number | '', minQualification: '',
  minExperienceYears: '' as number | '', officialWorkingHours: '' as number | '',
  extraWorkingHours: '' as number | '', nationalityRequired: false, nationalities: [] as string[],
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
  // Groups start open, so items added elsewhere (AI, import) are visible right away.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(formData.boqItems.map((r) => r.projectItem || 'Unclassified')));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [etimadError, setEtimadError] = useState('');
  const [addCat, setAddCat] = useState<BOQCategory | null>(null); // grouped-view: which category the add form targets
  const [manpowerGenLoading, setManpowerGenLoading] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);
  const layout = useBoqLayout();

  // Bring the add form into view when it opens (it can render below a long list).
  useEffect(() => {
    if (showAddForm && addFormRef.current) {
      addFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showAddForm, addCat]);

  // Etimad E-Market is a direct catalogue purchase — it uses a dedicated Product/Service BOQ.
  // (Placed after all hooks above to respect the Rules of Hooks.)
  if (formData.sourceType === 'souq-etimad') return <EsouqBillOfQuantities />;

  // Manual mode: lines are sent to Procurement, who check them on Etimad and reply.
  function runEtimadCheck(rows: BOQRow[]) {
    const now = new Date().toISOString();
    rows.forEach((r) => updateBoqRow(r.id, { etimadRequestedAt: now }));
    setEtimadError('');
  }
  // Prototype only: Procurement's answer for every line waiting on them.
  function simulateProcurementReply() {
    const waiting = formData.boqItems.filter(isPendingProcurement);
    const results = simulatedProcurementReply(waiting, isAr);
    Object.entries(results).forEach(([id, check]) => updateBoqRow(id, { etimadCheck: check, etimadRequestedAt: undefined }));
  }

  const uncheckedRows = formData.boqItems.filter((r) => r.itemName.trim() && (!r.etimadCheck || isStale(r)) && !isPendingProcurement(r));
  const pendingRows = formData.boqItems.filter(isPendingProcurement);
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
      const rows: BOQRow[] = parsed.map((r) => ({ id: crypto.randomUUID(), category: deriveCategory(r.itemName), ...r }));
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
  // Items ticked in Project Setup; if none were ticked, offer all of the project's items.
  const chosenIds = formData.selectedProjectItemIds ?? [];
  const projectItems = (selectedProject?.items ?? []).filter((it) => chosenIds.length === 0 || chosenIds.includes(it.id));

  const rowTotal = (row: BOQRow) => {
    const p = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
    return effectiveQty(row) * p;
  };

  const groups: { key: string; rows: BOQRow[] }[] = [];
  formData.boqItems.forEach((row) => {
    const key = row.projectItem || t('Unclassified', 'غير مصنف');
    const existing = groups.find((g) => g.key === key);
    if (existing) existing.rows.push(row);
    else groups.push({ key, rows: [row] });
  });

  // Project-item group headers come from the (English) project item name; show the
  // Arabic name when the app language is Arabic.
  const projNameAr = new Map((selectedProject?.items ?? []).map((it) => [it.name, it.nameAr]));
  const groupLabel = (key: string) => (isAr ? (projNameAr.get(key) ?? key) : key);
  // Seeded rows carry the English project-item name as the item name; show its
  // Arabic name in Arabic mode. Free-typed / AI rows keep their own name.
  const itemLabel = (name: string) => (isAr ? (projNameAr.get(name) ?? name) : name);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Manual mode: copy the BOQ lines of a past request in this project, then edit them.
  const [showPastDialog, setShowPastDialog] = useState(false);
  function handleAISuggest() { setShowPastDialog(true); }
  function copyFromPast(rfp: PastRfp) {
    const rows = (buildRfpImport(rfp, formData).boqItems ?? []).map((r) => ({ ...r, category: r.category ?? deriveCategory(r.itemName) }));
    updateField('boqItems', rows);
    setExpandedGroups(new Set(rows.map((r) => r.projectItem)));
    setShowPastDialog(false);
  }

  function handleAddItem() {
    if (!newItem.projectItem || !newItem.itemName) return;
    const id = crypto.randomUUID();
    const category = newItem.category || deriveCategory(newItem.itemName);
    updateField('boqItems', [...formData.boqItems, { id, ...newItem, category }]);
    setExpandedGroups((prev) => new Set([...prev, newItem.projectItem]));
    setNewItem({ ...EMPTY_FORM });
    setShowAddForm(false);
    setAddCat(null);
  }
  const [editingId, setEditingId] = useState<string | null>(null);

  function closeItemForm() {
    setShowAddForm(false);
    setEditingId(null);
    setAddCat(null);
    setNewItem({ ...EMPTY_FORM });
  }

  function startEdit(row: BOQRow) {
    setShowAddForm(false);
    setAddCat(null);
    setEditingId(row.id);
    setNewItem({
      projectItem: row.projectItem, category: row.category ?? deriveCategory(row.itemName),
      itemName: row.itemName, itemDescription: row.itemDescription,
      unitOfMeasure: row.unitOfMeasure || 'Each', quantity: row.quantity, unitPrice: row.unitPrice,
      deliveryDate: row.deliveryDate, hasBrandName: !!row.hasBrandName, brandJustification: row.brandJustification ?? '',
      attachments: row.attachments ?? [],
      mandatoryList: row.mandatoryList ?? '',
      jobTitle: row.jobTitle ?? '', staffCount: row.staffCount ?? '', minQualification: row.minQualification ?? '',
      minExperienceYears: row.minExperienceYears ?? '', officialWorkingHours: row.officialWorkingHours ?? '',
      extraWorkingHours: row.extraWorkingHours ?? '', nationalityRequired: !!row.nationalityRequired,
      nationalities: row.nationalities ?? [],
    });
  }

  function handleSaveEdit() {
    if (!editingId || !newItem.projectItem || !newItem.itemName) return;
    const category = newItem.category || deriveCategory(newItem.itemName);
    updateBoqRow(editingId, { ...newItem, category, brandJustification: newItem.hasBrandName ? newItem.brandJustification : '' });
    setExpandedGroups((prev) => new Set([...prev, newItem.projectItem]));
    closeItemForm();
  }

  // Man Power: build the item description from the entered fields (AI-style).
  function generateManpowerDesc() {
    setManpowerGenLoading(true);
    window.setTimeout(() => {
      setNewItem((p) => ({ ...p, itemDescription: generateManpowerDescription({ ...p, category: 'manpower' }, isAr) }));
      setManpowerGenLoading(false);
    }, 650);
  }

  function renderItemForm(mode: 'add' | 'edit', lockedCategory?: BOQCategory | null) {
    // Project-item classification = the items chosen in Project Setup, plus any
    // groups already present in the BOQ. A new item attaches to the one picked here
    // and groups under it in the Grid (subtotals & totals recompute automatically).
    const selectedNames = projectItems.map((it) => it.name);
    const existingGroups = [...new Set(formData.boqItems.map((b) => b.projectItem).filter(Boolean))];
    const union = [...new Set([...selectedNames, ...existingGroups])];
    const baseItemNames = union.length > 0 ? union : [...new Set(AI_BOQ_ROWS.map((r) => r.projectItem))];
    const itemNameOptions = newItem.projectItem && !baseItemNames.includes(newItem.projectItem)
      ? [...baseItemNames, newItem.projectItem]
      : baseItemNames;
    // Effective category drives which fields show. Man Power has its own field set;
    // Material & Equipment show the mandatory-list field.
    const effCat: BOQCategory | '' = (lockedCategory ?? (newItem.category || '')) as BOQCategory | '';
    const isMan = effCat === 'manpower';
    const showMandatory = effCat === 'material' || effCat === 'equipment';
    const toggleNationality = (v: string) =>
      setNewItem((p) => ({ ...p, nationalities: p.nationalities.includes(v) ? p.nationalities.filter((n) => n !== v) : [...p.nationalities, v] }));
    const manInvalid = isMan && (
      !newItem.jobTitle.trim() || newItem.staffCount === '' || !newItem.minQualification ||
      newItem.minExperienceYears === '' || (newItem.nationalityRequired && newItem.nationalities.length === 0)
    );
    const formInvalid = !newItem.projectItem || !newItem.itemName ||
      (!isMan && newItem.hasBrandName && !newItem.brandJustification.trim()) || manInvalid;
    return (
          <div className={`${mode === 'edit' ? 'm-3' : 'mt-3'} rounded-xl border border-neutral-200 bg-neutral-50/60 overflow-hidden`}>
            <div className="flex items-start justify-between px-4 py-3 border-b border-neutral-200 bg-white">
              <div>
                <p className="text-sm font-semibold text-neutral-800">{mode === 'edit' ? t('Edit BOQ Item', 'تعديل البند') : t('Add BOQ Item', 'إضافة بند')}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{mode === 'edit' ? t('Change the fields, then save. Changing name, quantity or price resets the Etimad check.', 'عدّل الحقول ثم احفظ. تغيير الاسم أو الكمية أو السعر يعيد التحقق من اعتماد.') : t('Fill all fields then save to add to the table', 'أكمل جميع الحقول ثم احفظ لإضافتها إلى الجدول')}</p>
              </div>
              <button
                onClick={closeItemForm}
                className="text-neutral-500 hover:text-neutral-600 transition-colors mt-0.5"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* 1. Project Item Classification + Etimad Category — top */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Project Item Classification" labelAr="تصنيف بند المشروع" required>
                  <Select
                    value={newItem.projectItem}
                    onChange={(e) => setNewItem((p) => ({ ...p, projectItem: e.target.value }))}
                  >
                    <option value="">{t('Select project item…', 'اختر بند المشروع…')}</option>
                    {itemNameOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                  </Select>
                </FormField>
                <FormField label="Category" labelAr="التصنيف" required>
                  {lockedCategory ? (
                    <div className="flex items-center gap-2 h-[38px] px-3 rounded-lg border border-neutral-200 bg-neutral-50">
                      <Badge variant={BOQ_CATEGORY_META[lockedCategory].badge}>{t(BOQ_CATEGORY_META[lockedCategory].en, BOQ_CATEGORY_META[lockedCategory].ar)}</Badge>
                      <span className="text-[11px] text-neutral-500">{t('from this group', 'من هذه المجموعة')}</span>
                    </div>
                  ) : (
                    <Select
                      value={newItem.category}
                      onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value as BOQCategory | '' }))}
                    >
                      <option value="">{t('Auto-detect…', 'تحديد تلقائي…')}</option>
                      {BOQ_CATEGORIES.map((c) => <option key={c} value={c}>{t(BOQ_CATEGORY_META[c].en, BOQ_CATEGORY_META[c].ar)}</option>)}
                    </Select>
                  )}
                </FormField>
              </div>

              {/* Mandatory-list field — shown for Material & Equipment */}
              {showMandatory && (
                <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3.5">
                  <label className="block text-[13px] font-semibold text-warning-800 mb-1.5">{t('Mandatory List', 'القائمة الإلزامية')}</label>
                  <Input
                    type="text"
                    value={newItem.mandatoryList}
                    onChange={(e) => setNewItem((p) => ({ ...p, mandatoryList: e.target.value }))}
                    placeholder={t('Listed company or product reference…', 'الشركة المدرجة أو مرجع المنتج…')}
                  />
                  <p className="text-[12px] text-warning-700 mt-2 leading-relaxed">
                    {t('Material and equipment items may fall under the mandatory list of national products and must be purchased from approved listed companies.',
                       'قد تندرج بنود المواد والمعدات ضمن القائمة الإلزامية للمنتجات الوطنية، ويجب شراؤها من الشركات المدرجة المعتمدة.')}
                  </p>
                  <a href={MANDATORY_LIST_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-warning-800 hover:underline">
                    {t('View Listed companies', 'عرض الشركات المدرجة')}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${isAr ? 'scale-x-[-1]' : ''}`}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg>
                  </a>
                </div>
              )}

              {/* 2. Item Name */}
              <FormField label="Item Name" labelAr="اسم البند" required>
                <Input
                  type="text"
                  value={newItem.itemName}
                  onChange={(e) => setNewItem((p) => ({ ...p, itemName: e.target.value }))}
                  placeholder={isMan ? t('e.g. Senior ERP Consultant (role)', 'مثال: مستشار أول (المسمى)') : t('Item name…', 'اسم البند…')}
                />
              </FormField>

              {isMan ? (
                <>
                  {/* Man Power fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Job Title" labelAr="المسمى الوظيفي" required>
                      <Input type="text" value={newItem.jobTitle}
                        onChange={(e) => setNewItem((p) => ({ ...p, jobTitle: e.target.value }))}
                        placeholder={t('e.g. ERP Technical Consultant', 'مثال: مستشار تقني')} />
                    </FormField>
                    <FormField label="Staff Count" labelAr="عدد الموظفين" required>
                      <Input type="number" min={1} value={newItem.staffCount}
                        onChange={(e) => setNewItem((p) => ({ ...p, staffCount: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="1" />
                    </FormField>
                  </div>

                  {/* Description with AI generate */}
                  <FormField label="Item Description" labelAr="وصف البند"
                    action={<AIButton onClick={generateManpowerDesc} loading={manpowerGenLoading} label={t('Build from the fields above', 'إنشاء من الحقول أعلاه')} />}>
                    <Textarea value={newItem.itemDescription}
                      onChange={(e) => setNewItem((p) => ({ ...p, itemDescription: e.target.value }))}
                      placeholder={t('Describe the role, responsibilities and requirements…', 'صف الدور والمسؤوليات والمتطلبات…')}
                      rows={3} />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Minimum Accepted Qualification" labelAr="الحد الأدنى للمؤهل المقبول" required>
                      <Select value={newItem.minQualification}
                        onChange={(e) => setNewItem((p) => ({ ...p, minQualification: e.target.value }))}>
                        <option value="">{t('Select…', 'اختر…')}</option>
                        {QUALIFICATIONS.map((q) => <option key={q.value} value={q.value}>{t(q.en, q.ar)}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Minimum Years of Experience" labelAr="الحد الأدنى لسنوات الخبرة" required>
                      <Input type="number" min={0} value={newItem.minExperienceYears}
                        onChange={(e) => setNewItem((p) => ({ ...p, minExperienceYears: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="0" />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Official Working Hours" labelAr="ساعات العمل الرسمية">
                      <Input type="number" min={0} value={newItem.officialWorkingHours}
                        onChange={(e) => setNewItem((p) => ({ ...p, officialWorkingHours: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder={t('e.g. 8', 'مثال: 8')} />
                    </FormField>
                    <FormField label="Expected Extra Working Hours" labelAr="ساعات العمل الإضافية المتوقعة">
                      <Input type="number" min={0} value={newItem.extraWorkingHours}
                        onChange={(e) => setNewItem((p) => ({ ...p, extraWorkingHours: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder={t('e.g. 2', 'مثال: 2')} />
                    </FormField>
                  </div>

                  {/* Nationality — radio; if Yes, multi-select nationalities */}
                  <div className="grid grid-cols-2 gap-4 items-start">
                    <FormField label="Nationality required?" labelAr="هل الجنسية مطلوبة؟">
                      <div className="flex rounded-lg border border-neutral-300 overflow-hidden mt-0.5" dir="ltr">
                        <button type="button" onClick={() => setNewItem((p) => ({ ...p, nationalityRequired: true }))}
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${newItem.nationalityRequired ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}>
                          {t('Yes', 'نعم')}
                        </button>
                        <button type="button" onClick={() => setNewItem((p) => ({ ...p, nationalityRequired: false, nationalities: [] }))}
                          className={`flex-1 py-2 text-sm font-medium border-s border-neutral-300 transition-colors ${!newItem.nationalityRequired ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}>
                          {t('No', 'لا')}
                        </button>
                      </div>
                    </FormField>
                    <FormField label="Unit Price (SAR)" labelAr="سعر الوحدة"
                      hint={t('Rate per staff — total = staff count × rate.', 'التكلفة لكل موظف — الإجمالي = العدد × التكلفة.')}>
                      <Input type="number" min={0} value={newItem.unitPrice}
                        onChange={(e) => setNewItem((p) => ({ ...p, unitPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="0.00" />
                    </FormField>
                  </div>

                  {newItem.nationalityRequired && (
                    <div className="slide-up">
                      <FormField label="Select Nationality" labelAr="اختر الجنسية" required>
                        <NationalityMultiSelect selected={newItem.nationalities} onToggle={toggleNationality} isAr={isAr} t={t} />
                      </FormField>
                    </div>
                  )}

                  {/* Delivery + Attachments */}
                  <div className="grid grid-cols-2 gap-4 items-start">
                    <FormField label="Delivery Date" labelAr="موعد التسليم">
                      <Input type="date" value={newItem.deliveryDate}
                        onChange={(e) => setNewItem((p) => ({ ...p, deliveryDate: e.target.value }))} />
                    </FormField>
                  </div>

                  <FormField label="Attachments" labelAr="المرفقات">
                    <BoqAttachments attachments={newItem.attachments} onChange={(next) => setNewItem((p) => ({ ...p, attachments: next }))} />
                    <p className="text-[11px] text-neutral-500 mt-1">{t('CVs, certificates, or any supporting document for this role.', 'السير الذاتية أو الشهادات أو أي مستند داعم لهذا الدور.')}</p>
                  </FormField>
                </>
              ) : (
                <>
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
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${newItem.hasBrandName ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                        >
                          {t('Yes', 'نعم')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewItem((p) => ({ ...p, hasBrandName: false, brandJustification: '' }))}
                          className={`flex-1 py-2 text-sm font-medium border-s border-neutral-300 transition-colors ${!newItem.hasBrandName ? 'bg-brand-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
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

                  {/* Attachments */}
                  <FormField label="Attachments" labelAr="المرفقات">
                    <BoqAttachments
                      attachments={newItem.attachments}
                      onChange={(next) => setNewItem((p) => ({ ...p, attachments: next }))}
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">{t('Specs, drawings, quotes or any supporting document for this item.', 'المواصفات أو الرسومات أو عروض الأسعار أو أي مستند داعم لهذا البند.')}</p>
                  </FormField>
                </>
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
                  disabled={formInvalid}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {mode === 'edit' ? t('Save changes', 'حفظ التغييرات') : t('Add to BOQ', 'إضافة إلى الجدول')}
                </button>
              </div>
            </div>
          </div>
    );
  }


  // Empty state: no items yet, and not actively adding or uploading.
  // In this state we show ONLY the three option cards — every other control is hidden.
  const isEmptyState = formData.boqItems.length === 0 && !showAddForm && !showUploadZone;
  // Template flow reached from the empty state (no items yet): show just the two step
  // cards + a Back link, and hide the toolbar / layout switch so it reads as its own screen.
  const uploadingEmpty = showUploadZone && formData.boqItems.length === 0 && !showAddForm;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Bill of Quantities"
        titleAr="جدول الكميات"
        description="Define all items, quantities, and unit prices for this tender."
        descriptionAr="حدد جميع البنود والكميات وأسعار الوحدة لهذه المنافسة."
        action={
          (isEmptyState || uploadingEmpty) ? undefined : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadZone((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm"
            >
              <UploadIcon className="w-3.5 h-3.5" />
              {t('Use a Template', 'استخدم نموذجاً')}
            </button>
            <button type="button" onClick={handleAISuggest} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm">
              <DocumentIcon className="w-3.5 h-3.5" />{t('Copy from a past request', 'نسخ من طلب سابق')}
            </button>
          </div>
          )
        }
      >
        {/* Layout switch: Grid (grouped items + form) or Table (spreadsheet) — hidden in empty / template flow */}
        {!isEmptyState && !uploadingEmpty && (
        <div className="flex items-center justify-end mb-3">
          <div role="radiogroup" aria-label={t('BOQ view', 'طريقة عرض جدول الكميات')} className="inline-flex rounded-lg border border-neutral-300 bg-neutral-50 p-0.5">
            {([
              ['cards', t('Grid', 'شبكة'), <GridIcon key="i" className="w-3.5 h-3.5" />],
              ['sheet', t('Table', 'جدول'), <TableIcon key="i" className="w-3.5 h-3.5" />],
              ['grouped', t('Grouped', 'مُجمّع'), <ListIcon key="i" className="w-3.5 h-3.5" />],
            ] as const).map(([v, label, icon]) => (
              <button key={v} type="button" role="radio" aria-checked={layout === v} onClick={() => setBoqLayout(v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors ${layout === v ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Upload zone — two side-by-side step cards: 1) download template, 2) upload file */}
        {showUploadZone && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50/70 to-white p-5 sm:p-6">
            {/* Header + back to options */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">{t('Build from a template', 'ابدأ من نموذج')}</h3>
                <p className="mt-0.5 text-[12px] text-neutral-500">{t('Two quick steps — download the sheet, fill it in Excel, then upload it back.', 'خطوتان سريعتان — نزّل الملف، أكمله في Excel، ثم ارفعه مرة أخرى.')}</p>
              </div>
              {uploadingEmpty && (
                <button
                  type="button"
                  onClick={() => setShowUploadZone(false)}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5 rotate-180" />
                  {t('Back to options', 'العودة للخيارات')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* STEP 1 · Download the template */}
              <div className="relative flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[12px] font-bold tabular-nums">1</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t('Step 1 · Download', 'الخطوة 1 · التنزيل')}</span>
                </div>
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 mb-3">
                  <DownloadIcon className="w-6 h-6" />
                </span>
                <p className="text-sm font-bold text-neutral-900">{t('Download the template', 'نزّل النموذج')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 flex-1">
                  {formData.boqItems.length > 0
                    ? t('Get your current BOQ as a pre-filled Excel file to edit offline.', 'احصل على جدول الكميات الحالي كملف Excel مملوء لتعديله دون اتصال.')
                    : t('An Excel sheet with the right columns and categories, ready to fill in.', 'ملف Excel بالأعمدة والفئات الصحيحة، جاهز للتعبئة.')}
                </p>
                <button
                  type="button"
                  onClick={() => downloadBOQExcel(formData.boqItems)}
                  className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 transition-colors shadow-sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                  {formData.boqItems.length > 0 ? t('Download pre-filled', 'تنزيل مملوء') : t('Download template', 'تنزيل النموذج')}
                </button>
              </div>

              {/* STEP 2 · Upload the completed file */}
              <div className="relative flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[12px] font-bold tabular-nums">2</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t('Step 2 · Upload', 'الخطوة 2 · الرفع')}</span>
                </div>
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 mb-3">
                  <UploadIcon className="w-6 h-6" />
                </span>
                <p className="text-sm font-bold text-neutral-900">{t('Upload the completed file', 'ارفع الملف المكتمل')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 flex-1">
                  {t('Drag your filled Excel file onto the area below, or browse to select it.', 'اسحب ملف Excel المكتمل إلى المنطقة أدناه، أو تصفح لاختياره.')}
                </p>
                <div
                  className="mt-5 flex flex-col items-center justify-center text-center border-2 border-dashed border-neutral-300 rounded-xl px-4 py-5 transition-colors hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer"
                  onClick={() => !uploadLoading && fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(file);
                  }}
                >
                  {uploadLoading ? (
                    <div className="flex items-center gap-2 py-1">
                      <SparklesIcon className="w-5 h-5 text-brand-500 spin-slow" />
                      <p className="text-[13px] text-neutral-600">{t('Reading file…', 'جاري قراءة الملف…')}</p>
                    </div>
                  ) : (
                    <>
                      <UploadIcon className="w-6 h-6 text-neutral-300 mb-1.5" />
                      <p className="text-[13px] text-neutral-600">
                        {t('Drop file here, or ', 'أسقط الملف هنا، أو ')}
                        <span className="text-brand-600 font-semibold">{t('browse', 'تصفح')}</span>
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">{t('.xlsx / .xls · Max 10MB', '.xlsx / .xls · الحد الأقصى 10 ميجابايت')}</p>
                    </>
                  )}
                </div>
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
            </div>

            {/* Error */}
            {uploadError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-error-50 border border-error-100 text-xs text-error-700">
                {uploadError}
              </div>
            )}
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

        {/* Empty state — three ways to build the BOQ (replaces the whole body) */}
        {isEmptyState && (
          <div className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50/70 to-white p-6 sm:p-8">
            {/* Illustration + heading */}
            <div className="text-center mb-7">
              <div className="relative mx-auto mb-4 w-16 h-16">
                <div className="absolute inset-0 rounded-2xl bg-brand-100/70 rotate-6" />
                <div className="absolute inset-0 rounded-2xl bg-white border border-brand-200 shadow-sm flex items-center justify-center">
                  <DocumentIcon className="w-8 h-8 text-brand-600" />
                </div>
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                {t('Start your Bill of Quantities', 'ابدأ جدول الكميات')}
              </h3>
              <p className="mt-1.5 text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
                {t('Choose how you want to add items — you can switch methods or mix them anytime.', 'اختر طريقة إضافة البنود — يمكنك تبديل الطرق أو الجمع بينها في أي وقت.')}
              </p>
            </div>

            {/* Three option tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1 · Upload via template */}
              <button
                type="button"
                onClick={() => setShowUploadZone(true)}
                className="group relative flex flex-col text-start rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 mb-3 group-hover:scale-105 transition-transform">
                  <UploadIcon className="w-5 h-5" />
                </span>
                <p className="text-sm font-bold text-neutral-900">{t('Upload via template', 'الرفع عبر نموذج')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 flex-1">
                  {t('Download the Excel template, fill it in, and upload. Fastest for long lists.', 'نزّل نموذج Excel، أكمله، ثم ارفعه. الأسرع للقوائم الطويلة.')}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600">
                  {t('Choose a file', 'اختر ملفاً')}
                  <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* 2 · Copy from a past request */}
              <button
                type="button"
                onClick={handleAISuggest}
                className="group relative flex flex-col text-start rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 mb-3 group-hover:scale-105 transition-transform">
                  <DocumentIcon className="w-5 h-5" />
                </span>
                <p className="text-sm font-bold text-neutral-900">{t('Copy from a past request', 'نسخ من طلب سابق')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 flex-1">
                  {t('Start from the BOQ of an earlier request in this project, then adjust quantities and prices.', 'ابدأ من جدول كميات طلب سابق في هذا المشروع، ثم عدّل الكميات والأسعار.')}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600">
                  {t('Choose a request', 'اختر طلباً')}
                  <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* 3 · Add manually */}
              <button
                type="button"
                onClick={() => { setBoqLayout('cards'); closeItemForm(); setShowAddForm(true); }}
                className="group relative flex flex-col text-start rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200 mb-3 group-hover:scale-105 transition-transform">
                  <PlusIcon className="w-5 h-5" />
                </span>
                <p className="text-sm font-bold text-neutral-900">{t('Add manually', 'الإضافة يدوياً')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 flex-1">
                  {t('Enter each item yourself with full control over every detail.', 'أدخل كل بند بنفسك مع تحكم كامل في كل التفاصيل.')}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-700">
                  {t('Add first item', 'أضف أول بند')}
                  <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        )}

        {formData.boqItems.length > 0 && (
          <div className="mb-3 flex items-center gap-3 flex-wrap rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[12px] font-semibold text-neutral-800">{t('Etimad E-Market availability — checked by Procurement', 'التوفر في سوق اعتماد — تتحقق منه المشتريات')}</p>
              <p className="text-[11px] text-neutral-500">
                {uncheckedRows.length > 0
                  ? t(`${uncheckedRows.length} of ${namedCount} items not sent to Procurement yet.`, `${uncheckedRows.length} من ${namedCount} بنود لم تُرسل إلى المشتريات بعد.`)
                  : pendingRows.length > 0 ? '' : t('All items checked by Procurement.', 'تحققت المشتريات من جميع البنود.')}
                {pendingRows.length > 0 && ' ' + t(`${pendingRows.length} with Procurement for an Etimad check.`, `${pendingRows.length} لدى المشتريات للفحص في اعتماد.`)}
                {etimadAvailableCount > 0 && ' ' + t(`${etimadAvailableCount} available in Etimad E-Market.`, `${etimadAvailableCount} متوفرة في سوق اعتماد.`)}
                {etimadMissingJust > 0 && ' ' + t(`${etimadMissingJust} kept without a justification.`, `${etimadMissingJust} أُبقيت دون مبرر.`)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => runEtimadCheck(uncheckedRows)}
              disabled={uncheckedRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uncheckedRows.length > 0 ? t(`Send ${uncheckedRows.length} to Procurement`, `إرسال ${uncheckedRows.length} إلى المشتريات`) : t('Send to Procurement', 'إرسال إلى المشتريات')}
            </button>
            {pendingRows.length > 0 && (
              <button type="button" onClick={simulateProcurementReply} className="basis-full text-start text-[11px] font-semibold text-link hover:underline">
                {t('Prototype: simulate Procurement’s response', 'نموذج أولي: محاكاة رد المشتريات')} →
              </button>
            )}
            {etimadError && <p className="basis-full text-[11px] text-error-600">{etimadError}</p>}
            {formData.linkedEtimadRequestId && (
              <p className="basis-full text-[11px] text-success-700">
                {t('Moved items are in a separate Etimad E-Market draft under My Requests.', 'البنود المنقولة موجودة في مسودة مستقلة لسوق اعتماد ضمن طلباتي.')}
              </p>
            )}
          </div>
        )}

        {/* B · spreadsheet */}
        {formData.boqItems.length > 0 && layout === 'sheet' && (
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
          <div>
            {groups.map((group, gi) => {
              const isExpanded = expandedGroups.has(group.key);
              // Collapsed groups stay joined in one block; an open group becomes its own card with space around it.
              const breakBefore = gi === 0 || isExpanded || expandedGroups.has(groups[gi - 1].key);
              const breakAfter = gi === groups.length - 1 || isExpanded || expandedGroups.has(groups[gi + 1].key);
              const blockCls = `border-x border-t border-neutral-200 overflow-hidden ${breakBefore ? 'rounded-t-xl' : ''} ${breakAfter ? 'rounded-b-xl border-b' : ''} ${breakBefore && gi > 0 ? 'mt-3' : ''}`;
              const subtotal = group.rows.reduce((s, r) => s + rowTotal(r), 0);
              const dotColor = GROUP_COLORS[gi % GROUP_COLORS.length];
              const editingInGroup = group.rows.some((r) => r.id === editingId);

              return (
                <div key={group.key} className={blockCls}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 hover:bg-neutral-100/60 transition-colors text-start"
                  >
                    <ChevronRightIcon className={`w-3.5 h-3.5 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className="flex-1 text-sm font-semibold text-neutral-800 truncate">{groupLabel(group.key)}</span>
                    <span className="text-[11px] text-neutral-500 tabular-nums flex-shrink-0">
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
                      {/* Column headers — hidden while a row in this group is being edited */}
                      {!editingInGroup && (
                      <div className="grid grid-cols-[1fr_64px_104px_136px_84px] px-5 py-2 bg-white border-b border-neutral-100">
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Item', 'البند')}</span>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide text-center">{t('Qty', 'الكمية')}</span>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide text-end">{t('Unit Price', 'سعر الوحدة')}</span>
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide text-end">{t('Total', 'الإجمالي')}</span>
                        <span />
                      </div>
                      )}

                      {/* Rows — view mode */}
                      <div className="divide-y divide-neutral-100">
                        {group.rows.map((row) => {
                          const total = rowTotal(row);
                          const unitPrice = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
                          const showCheckTop = !row.etimadCheck || isStale(row);
                          return (
                            <div key={row.id} className="bg-white">
                            {editingId === row.id ? renderItemForm('edit') : (<>
                            <div className="grid grid-cols-[1fr_64px_104px_136px_84px] items-center px-5 py-3 bg-white hover:bg-neutral-50/40 transition-colors group/row">
                              {/* Item */}
                              <div className="pe-4 col-start-1">
                                <p className="text-sm font-semibold text-neutral-900 leading-snug">{itemLabel(row.itemName) || <span className="text-neutral-300 font-normal">{t('Unnamed item', 'بند بلا اسم')}</span>}</p>
                                {row.itemDescription && (
                                  <p className="text-xs text-neutral-500 mt-0.5 leading-snug">{row.itemDescription}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {(() => { const m = BOQ_CATEGORY_META[row.category ?? deriveCategory(row.itemName)]; return <Badge variant={m.badge}>{isAr ? m.ar : m.en}</Badge>; })()}
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
                                    <span className="text-[10px] text-neutral-500" dir="ltr">{row.deliveryDate}</span>
                                  )}
                                </div>
                                {(row.attachments?.length ?? 0) > 0 && (
                                  <div className="mt-2">
                                    <BoqAttachments readOnly attachments={row.attachments ?? []} onChange={() => {}} />
                                  </div>
                                )}
                              </div>

                              {/* Qty */}
                              <div className="text-center leading-tight">
                                <span className="block text-sm text-neutral-700 tabular-nums">
                                  {row.quantity !== '' ? row.quantity : '—'}
                                </span>
                                {row.unitOfMeasure && (
                                  <span className="block text-[11px] text-neutral-500 mt-0.5 truncate" title={row.unitOfMeasure}>{row.unitOfMeasure}</span>
                                )}
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

                              {/* Etimad check (subtle) / Edit / Delete */}
                              <div className="flex justify-end gap-0.5">
                                {isPendingProcurement(row) && (
                                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-warning-600" title={t('With Procurement for an Etimad check', 'لدى المشتريات للفحص في اعتماد')}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                  </span>
                                )}
                                {showCheckTop && !isPendingProcurement(row) && (
                                  <button
                                    type="button"
                                    onClick={() => runEtimadCheck([row])}
                                    disabled={checkingIds.has(row.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50"
                                    title={isStale(row) ? t('Item changed — ask Procurement again', 'تغيّر البند — اطلب من المشتريات مجدداً') : t('Ask Procurement to check Etimad', 'اطلب من المشتريات الفحص في اعتماد')}
                                    aria-label={t('Ask Procurement to check Etimad', 'اطلب من المشتريات الفحص في اعتماد')}
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => startEdit(row)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-brand-50 transition-colors"
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
                            {row.etimadCheck && !isStale(row) && (
                              <div className="px-5 pb-3.5">
                                <EtimadPanel
                                  hideUnchecked
                                  row={row}
                                  checking={checkingIds.has(row.id)}
                                  onCheck={() => runEtimadCheck([row])}
                                  onMove={() => moveBoqRowsToEtimad([row.id])}
                                  onUpdate={(patch) => updateBoqRow(row.id, patch)}
                                />
                              </div>
                            )}
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

        {/* C · grouped by Etimad category */}
        {formData.boqItems.length > 0 && layout === 'grouped' && (
          <div className="space-y-3">
            {BOQ_CATEGORIES.map((cat) => {
              const m = BOQ_CATEGORY_META[cat];
              const rows = formData.boqItems.filter((r) => (r.category ?? deriveCategory(r.itemName)) === cat);
              const subtotal = rows.reduce((s, r) => s + rowTotal(r), 0);
              return (
                <div key={cat} className="rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                    <Badge variant={m.badge}>{isAr ? m.ar : m.en}</Badge>
                    <span className="text-[11px] text-neutral-500 tabular-nums">{rows.length} {rows.length === 1 ? t('item', 'بند') : t('items', 'بنود')}</span>
                    {subtotal > 0 && <span className="ms-auto text-xs font-semibold text-neutral-700 tabular-nums" dir="ltr">SAR {formatSAR(subtotal)}</span>}
                  </div>

                  {rows.length > 0 && (
                    <div className="divide-y divide-neutral-100">
                      {rows.map((row) => {
                        if (editingId === row.id) return <div key={row.id}>{renderItemForm('edit')}</div>;
                        const total = rowTotal(row);
                        const unitPrice = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
                        const showCheckTop = !row.etimadCheck || isStale(row);
                        return (
                          <div key={row.id} className="bg-white hover:bg-neutral-50/40 transition-colors">
                            <div className="grid grid-cols-[1fr_72px_112px_128px_56px] items-center gap-2 px-4 pt-2.5">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900 truncate">{itemLabel(row.itemName) || <span className="text-neutral-300 font-normal">{t('Unnamed item', 'بند بلا اسم')}</span>}</p>
                                {row.projectItem && <p className="text-[11px] text-neutral-500 truncate">{groupLabel(row.projectItem)}</p>}
                              </div>
                              <div className="text-center text-sm text-neutral-700 tabular-nums">{row.quantity !== '' ? row.quantity : '—'}<span className="block text-[10px] text-neutral-500">{row.unitOfMeasure}</span></div>
                              <div className="text-end text-sm text-neutral-700 tabular-nums" dir="ltr">{unitPrice > 0 ? `SAR ${formatSAR(unitPrice)}` : '—'}</div>
                              <div className="text-end text-sm font-bold text-neutral-900 tabular-nums" dir="ltr">{total > 0 ? `SAR ${formatSAR(total)}` : '—'}</div>
                              <div className="flex justify-end gap-0.5">
                                {isPendingProcurement(row) && (
                                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-warning-600" title={t('With Procurement for an Etimad check', 'لدى المشتريات للفحص في اعتماد')}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                  </span>
                                )}
                                {showCheckTop && !isPendingProcurement(row) && (
                                  <button type="button" onClick={() => runEtimadCheck([row])} disabled={checkingIds.has(row.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50"
                                    title={isStale(row) ? t('Item changed — ask Procurement again', 'تغيّر البند — اطلب من المشتريات مجدداً') : t('Ask Procurement to check Etimad', 'اطلب من المشتريات الفحص في اعتماد')}
                                    aria-label={t('Ask Procurement to check Etimad', 'اطلب من المشتريات الفحص في اعتماد')}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                  </button>
                                )}
                                <button type="button" onClick={() => startEdit(row)} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-brand-50 transition-colors" title={t('Edit item', 'تعديل البند')}><PencilIcon className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => { if (editingId === row.id) closeItemForm(); removeBoqRow(row.id); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-error-500 hover:bg-error-50 transition-colors" title={t('Delete item', 'حذف البند')}><TrashIcon className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            {((row.attachments?.length ?? 0) > 0 || (row.etimadCheck && !isStale(row))) && (
                              <div className="px-4 pt-0 pb-3 space-y-2">
                                {(row.attachments?.length ?? 0) > 0 && <BoqAttachments readOnly attachments={row.attachments ?? []} onChange={() => {}} />}
                                {row.etimadCheck && !isStale(row) && <EtimadPanel hideUnchecked row={row} checking={checkingIds.has(row.id)} onCheck={() => runEtimadCheck([row])} onMove={() => moveBoqRowsToEtimad([row.id])} onUpdate={(patch) => updateBoqRow(row.id, patch)} />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}

            {/* Add item CTA — bottom of table (Grouped) */}
            {showAddForm ? (
              <div ref={addFormRef}>{renderItemForm('add')}</div>
            ) : (
              <button
                type="button"
                onClick={() => { closeItemForm(); setShowAddForm(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                {t('Add item', 'إضافة بند')}
              </button>
            )}
          </div>
        )}

        {/* Add BOQ item — inline form */}
        {layout === 'cards' && showAddForm && <div ref={addFormRef}>{renderItemForm('add')}</div>}

        {/* Add item CTA — bottom of table (Grid) */}
        {formData.boqItems.length > 0 && layout === 'cards' && !showAddForm && (
          <button
            onClick={() => { closeItemForm(); setShowAddForm(true); }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {t('Add item', 'إضافة بند')}
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
      {showPastDialog && <BrowseRfpsDialog projectId={formData.projectId} onClose={() => setShowPastDialog(false)} onImport={copyFromPast} />}
    </div>
  );
}
