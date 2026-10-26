import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useTender } from '../context/TenderContext';
import { useT } from '../context/LanguageContext';
import { PROJECTS, UNITS_OF_MEASURE } from '../data/mockData';
import { FormField, SectionCard, AIButton, InfoBanner, Input, Select, Textarea, Badge } from '../components/ui';
import { PlusIcon, TrashIcon, SparklesIcon, DownloadIcon, UploadIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon, PencilIcon, InfoIcon, GridIcon, TableIcon, ListIcon, DocumentIcon, CheckCircleIcon } from '../components/Icons';
import HoverNote from '../components/HoverNote';
import BoqAttachments from '../components/BoqAttachments';
import type { BOQRow, BOQCategory, FileAttachment } from '../types/tender';
import { BOQ_CATEGORIES, BOQ_CATEGORY_META, deriveCategory } from '../lib/boqCategory';
import { QUALIFICATIONS, NATIONALITIES, nationalityLabel, effectiveQty, generateManpowerDescription } from '../lib/boqManpower';
import { useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote, num, str, arr } from '../lib/useAiAction';
import { aiBoq, type AiBoqRow } from '../lib/aiTender';
import { saveFile, aiErrorMessage } from '../lib/claudeRuntime';
import { checkEtimadAvailability, isStale, needsJustification } from '../lib/etimadCheck';
import EtimadPanel from '../components/EtimadPanel';
import ConfirmDeleteAll from '../components/ConfirmDeleteAll';
import BoqSheet from '../components/BoqSheet';
import { useBoqLayout, setBoqLayout } from '../lib/boqLayout';
import EsouqBillOfQuantities from './EsouqBillOfQuantities';

const BOQ_COLUMNS = [
  'Budgeted Item',
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
        'Budgeted Item': r.projectItem,
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
            projectItem: String(r['Budgeted Item'] ?? r['Project Item'] ?? ''),
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

function EyeGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function BillOfQuantities() {
  const { formData, updateField, removeBoqRow, updateBoqRow, moveBoqRowsToEtimad, returnBoqItemFromEtimad, boqSubtotal, boqVat, boqTotal } = useTender();
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

  // Row view (read-only accordion) vs edit; category accordion (Grouped view);
  // and the "checking in Etimad" state while a newly-added item is auto-checked.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<BOQCategory>>(() => new Set(BOQ_CATEGORIES));
  const [savingAddCheck, setSavingAddCheck] = useState(false);
  const toggleCat = (c: BOQCategory) => setExpandedCats((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleView = (id: string) => setViewingId((cur) => (cur === id ? null : id));
  function addBlankSheetRow() {
    const blank: BOQRow = { id: crypto.randomUUID(), projectItem: '', itemName: '', itemDescription: '', unitOfMeasure: 'Each', quantity: '', unitPrice: '', deliveryDate: '', hasBrandName: false, brandJustification: '' };
    updateField('boqItems', [...formData.boqItems, blank]);
  }
  // "Add manually" respects the active view: Table → inline sheet row; Grid/Grouped → the form.
  function addManually() {
    if (layout === 'sheet') addBlankSheetRow();
    else { closeItemForm(); setShowAddForm(true); }
  }

  // BOQ actions menu (expand/collapse/download/delete-all) next to the view switch.
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Move-to-Etimad flow: confirm modal → fly-to-bucket animation → floating bucket + drawer ──
  const movedItems = formData.etimadMovedItems ?? [];
  const [moveConfirm, setMoveConfirm] = useState<{ row: BOQRow; origin: DOMRect | null } | null>(null);
  const [flying, setFlying] = useState<{ origin: DOMRect; target: DOMRect; label: string } | null>(null);
  const [bucketMounted, setBucketMounted] = useState(false);
  const [bucketReceiving, setBucketReceiving] = useState(false);
  const [bucketOpen, setBucketOpen] = useState(false);
  const bucketRef = useRef<HTMLDivElement>(null);
  const showBucket = movedItems.length > 0 || bucketMounted;

  function requestMove(row: BOQRow, origin: DOMRect | null) {
    setMoveConfirm({ row, origin });
  }

  async function confirmMove() {
    const mc = moveConfirm;
    if (!mc) return;
    setMoveConfirm(null);
    // Ensure the bucket is on screen first (its first appearance slides in) so the item has a target.
    setBucketMounted(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    const target = bucketRef.current?.getBoundingClientRect() ?? null;
    if (mc.origin && target) {
      setFlying({ origin: mc.origin, target, label: itemLabel(mc.row.itemName) || t('item', 'بند') });
      await new Promise((r) => setTimeout(r, 820));
      setFlying(null);
    }
    await moveBoqRowsToEtimad([mc.row.id]);
    setBucketReceiving(true);
    setTimeout(() => setBucketReceiving(false), 600);
  }

  // Open the linked Etimad E-Market draft request in a new tab, seeded with the moved items.
  function viewDraftRequest() {
    const seed = {
      sourceType: 'souq-etimad' as const,
      costCenterId: formData.costCenterId,
      projectId: formData.projectId,
      tenderingPurpose: formData.tenderingPurpose,
      scopeIncludes: formData.scopeIncludes,
      boqItems: movedItems.map((r) => ({ ...r, etimadKeep: false, etimadJustification: '', etimadCheck: undefined })),
    };
    try { window.localStorage.setItem('munafasat:etimad-draft', JSON.stringify(seed)); } catch { /* ignore */ }
    try { window.open(`${window.location.pathname}?open=etimad-draft`, '_blank', 'noopener'); } catch { /* ignore */ }
  }

  // Bring the add form into view when it opens (it can render below a long list).
  useEffect(() => {
    if (showAddForm && addFormRef.current) {
      addFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showAddForm, addCat]);

  // Etimad E-Market is a direct catalogue purchase — it uses a dedicated Product/Service BOQ.
  // (Placed after all hooks above to respect the Rules of Hooks.)
  if (formData.sourceType === 'souq-etimad') return <EsouqBillOfQuantities />;

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

  function handleAISuggest() {
    const applyRows = (src: AiBoqRow[]) => {
      const rows: BOQRow[] = src.filter((r) => r && r.itemName).map((r) => ({
        id: crypto.randomUUID(), hasBrandName: false, brandJustification: '',
        projectItem: str(r.projectItem), category: deriveCategory(str(r.itemName)),
        itemName: str(r.itemName), itemDescription: str(r.itemDescription),
        unitOfMeasure: UNITS_OF_MEASURE.includes(str(r.unitOfMeasure)) ? str(r.unitOfMeasure) : 'Each',
        quantity: num(r.quantity), unitPrice: num(r.unitPrice), deliveryDate: str(r.deliveryDate),
      }));
      updateField('boqItems', rows);
      setExpandedGroups(new Set(rows.map((r) => r.projectItem)));
    };
    boqAi.run(() => aiBoq(formData, isAr), (r) => applyRows(arr<AiBoqRow>(r)), () => applyRows(isAr ? AI_BOQ_ROWS_AR : AI_BOQ_ROWS));
  }

  async function handleAddItem() {
    if (!newItem.projectItem || !newItem.itemName || savingAddCheck) return;
    const id = crypto.randomUUID();
    const category = newItem.category || deriveCategory(newItem.itemName);
    const newRow: BOQRow = { id, ...newItem, category };
    updateField('boqItems', [...formData.boqItems, newRow]);
    setExpandedGroups((prev) => new Set([...prev, newItem.projectItem]));
    setExpandedCats((prev) => new Set([...prev, category]));
    // Auto-trigger the Etimad E-Market check for the new item; the Save CTA shows
    // "Checking item in Etimad E-Market" while it runs, then the row surfaces the
    // availability flow (move to an Etimad E-Market request, or keep + justify).
    setSavingAddCheck(true);
    try {
      await runEtimadCheck([newRow]);
    } finally {
      setSavingAddCheck(false);
      setNewItem({ ...EMPTY_FORM });
      setShowAddForm(false);
      setAddCat(null);
    }
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
                <FormField label="Budgeted Item" labelAr="البند المعتمد" required>
                  <Select
                    value={newItem.projectItem}
                    onChange={(e) => setNewItem((p) => ({ ...p, projectItem: e.target.value }))}
                  >
                    <option value="">{t('Select budgeted item…', 'اختر البند المعتمد…')}</option>
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
                    action={<AIButton onClick={generateManpowerDesc} loading={manpowerGenLoading} label={t('Generate with AI', 'توليد بالذكاء الاصطناعي')} />}>
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
                  disabled={formInvalid || (mode === 'add' && savingAddCheck)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {mode === 'edit'
                    ? t('Save changes', 'حفظ التغييرات')
                    : savingAddCheck
                      ? (<><SparklesIcon className="w-3.5 h-3.5 spin-slow" />{t('Checking item in Etimad E-Market…', 'جارٍ التحقق من البند في سوق اعتماد…')}</>)
                      : t('Save & check Etimad', 'حفظ وتحقق من اعتماد')}
                </button>
              </div>
            </div>
          </div>
    );
  }


  // Read-only "view mode" for a row — the same fields as the form, not editable.
  function renderItemView(row: BOQRow) {
    const cat = row.category ?? deriveCategory(row.itemName);
    const m = BOQ_CATEGORY_META[cat];
    const isMan = cat === 'manpower';
    const qty = effectiveQty(row);
    const price = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
    const total = qty * price;
    const qual = QUALIFICATIONS.find((q) => q.value === row.minQualification);
    const VRow = ({ label, labelAr, value, dir, full }: { label: string; labelAr: string; value: ReactNode; dir?: 'ltr'; full?: boolean }) => (
      <div className={`py-2 grid grid-cols-[150px_1fr] gap-3 border-b border-neutral-100 last:border-0 ${full ? 'sm:col-span-2' : ''}`}>
        <dt className="text-[12px] text-neutral-500">{t(label, labelAr)}</dt>
        <dd className="text-[13px] text-neutral-800 min-w-0 break-words" dir={dir}>{value || <span className="text-neutral-300">—</span>}</dd>
      </div>
    );
    return (
      <div className="m-3 rounded-xl border border-neutral-200 bg-neutral-50/40 overflow-hidden slide-up">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 bg-white">
          <p className="text-sm font-semibold text-neutral-800">{t('Item details', 'تفاصيل البند')}</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => { setViewingId(null); startEdit(row); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 text-[12px] font-semibold hover:bg-brand-100 transition-colors">
              <PencilIcon className="w-3.5 h-3.5" />{t('Edit', 'تعديل')}
            </button>
            <button type="button" onClick={() => setViewingId(null)} aria-label={t('Close', 'إغلاق')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
            </button>
          </div>
        </div>
        <dl className="px-4 py-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <VRow label="Budgeted Item" labelAr="البند المعتمد" value={groupLabel(row.projectItem)} />
          <VRow label="Category" labelAr="التصنيف" value={<Badge variant={m.badge}>{isAr ? m.ar : m.en}</Badge>} />
          <VRow label="Item Name" labelAr="اسم البند" value={itemLabel(row.itemName)} full />
          {row.itemDescription && <VRow label="Description" labelAr="الوصف" value={row.itemDescription} full />}
          {isMan ? (<>
            <VRow label="Job Title" labelAr="المسمى الوظيفي" value={row.jobTitle} />
            <VRow label="Staff Count" labelAr="عدد الموظفين" value={row.staffCount !== '' && row.staffCount != null ? String(row.staffCount) : ''} />
            <VRow label="Minimum Accepted Qualification" labelAr="الحد الأدنى للمؤهل" value={qual ? t(qual.en, qual.ar) : ''} />
            <VRow label="Minimum Years of Experience" labelAr="الحد الأدنى لسنوات الخبرة" value={row.minExperienceYears !== '' && row.minExperienceYears != null ? String(row.minExperienceYears) : ''} />
            <VRow label="Official Working Hours" labelAr="ساعات العمل الرسمية" value={row.officialWorkingHours !== '' && row.officialWorkingHours != null ? String(row.officialWorkingHours) : ''} />
            <VRow label="Extra Working Hours" labelAr="ساعات العمل الإضافية" value={row.extraWorkingHours !== '' && row.extraWorkingHours != null ? String(row.extraWorkingHours) : ''} />
            <VRow label="Nationality required" labelAr="الجنسية مطلوبة" value={row.nationalityRequired ? t('Yes', 'نعم') : t('No', 'لا')} />
            {row.nationalityRequired && <VRow label="Nationalities" labelAr="الجنسيات" value={(row.nationalities ?? []).map((n) => nationalityLabel(n, isAr)).join('، ')} full />}
            <VRow label="Unit Price (SAR)" labelAr="سعر الوحدة" value={price > 0 ? `SAR ${formatSAR(price)}` : ''} dir="ltr" />
          </>) : (<>
            <VRow label="Unit of Measure" labelAr="وحدة القياس" value={row.unitOfMeasure} />
            <VRow label="Quantity" labelAr="الكمية" value={row.quantity !== '' && row.quantity != null ? String(row.quantity) : ''} />
            <VRow label="Unit Price (SAR)" labelAr="سعر الوحدة" value={price > 0 ? `SAR ${formatSAR(price)}` : ''} dir="ltr" />
            {(cat === 'material' || cat === 'equipment') && <VRow label="Mandatory List" labelAr="القائمة الإلزامية" value={row.mandatoryList} full />}
            <VRow label="Has Brand Name" labelAr="علامة تجارية" value={row.hasBrandName ? t('Yes', 'نعم') : t('No', 'لا')} />
            {row.hasBrandName && <VRow label="Brand Justification" labelAr="مبرر العلامة التجارية" value={row.brandJustification} full />}
          </>)}
          <VRow label="Delivery Date" labelAr="موعد التسليم" value={row.deliveryDate} dir="ltr" />
          <VRow label="Line Total" labelAr="إجمالي البند" value={total > 0 ? `SAR ${formatSAR(total)}` : ''} dir="ltr" />
          {row.etimadCheck && !isStale(row) && (
            <VRow label="Etimad E-Market" labelAr="سوق اعتماد" full value={
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${row.etimadCheck.status === 'available' ? 'text-warning-700' : row.etimadCheck.status === 'not-available' ? 'text-success-700' : 'text-neutral-600'}`}>
                {row.etimadCheck.status === 'available' ? t('Available in Etimad E-Market', 'متوفر في سوق اعتماد') : row.etimadCheck.status === 'not-available' ? t('Not in Etimad E-Market — proceed with tender', 'غير متوفر في سوق اعتماد — تابع بالمنافسة') : t('Uncertain — confirm on Etimad', 'غير مؤكد — تحقق في اعتماد')}
              </span>
            } />
          )}
          {(row.attachments?.length ?? 0) > 0 && (
            <VRow label="Attachments" labelAr="المرفقات" full value={<BoqAttachments readOnly attachments={row.attachments ?? []} onChange={() => {}} />} />
          )}
        </dl>
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
            <AIButton onClick={handleAISuggest} loading={aiLoading} label={t('AI Suggest BOQ', 'اقتراح جدول الكميات')} />
          </div>
          )
        }
      >
        {/* Layout switch: Grid (grouped items + form) or Table (spreadsheet) — hidden in empty / template flow */}
        {!isEmptyState && !uploadingEmpty && (
        <div className="flex items-center justify-end gap-2 mb-3">
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

          {/* More actions */}
          <div className="relative" ref={moreRef}>
            <button type="button" onClick={() => setMoreOpen((o) => !o)} aria-label={t('More actions', 'إجراءات أخرى')}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${moreOpen ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'}`}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
            </button>
            {moreOpen && (
              <div className="absolute end-0 z-30 mt-1 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden slide-up py-1">
                {(layout === 'cards' || layout === 'grouped') && (
                  <>
                    <button type="button" onClick={() => { if (layout === 'grouped') setExpandedCats(new Set(BOQ_CATEGORIES)); else setExpandedGroups(new Set(groups.map((g) => g.key))); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors text-start">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-neutral-400"><path d="M7 14l5 5 5-5M7 10l5-5 5 5" /></svg>
                      {t('Expand all', 'توسيع الكل')}
                    </button>
                    <button type="button" onClick={() => { if (layout === 'grouped') setExpandedCats(new Set()); else setExpandedGroups(new Set()); setMoreOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors text-start">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-neutral-400"><path d="M7 9l5-5 5 5M7 15l5 5 5-5" /></svg>
                      {t('Collapse all', 'طي الكل')}
                    </button>
                    <div className="my-1 border-t border-neutral-100" />
                  </>
                )}
                <button type="button" onClick={() => { downloadBOQExcel(formData.boqItems); setMoreOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50 transition-colors text-start">
                  <DownloadIcon className="w-4 h-4 text-neutral-400" />
                  {t('Download as Excel', 'تنزيل كملف Excel')}
                </button>
                <button type="button" onClick={() => { setMoreOpen(false); setConfirmDeleteAll(true); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-error-600 hover:bg-error-50 transition-colors text-start">
                  <TrashIcon className="w-4 h-4" />
                  {t('Delete all', 'حذف الكل')}
                </button>
              </div>
            )}
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

              {/* 2 · Generate with AI (recommended) */}
              <button
                type="button"
                onClick={handleAISuggest}
                disabled={aiLoading}
                className="group relative flex flex-col text-start rounded-xl border border-ai-200 bg-gradient-to-b from-ai-50/80 to-white p-4 hover:border-ai-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-wait"
              >
                <span className="absolute top-3 end-3 text-[9px] font-bold uppercase tracking-wide text-ai-700 bg-white/90 border border-ai-200 rounded-full px-2 py-0.5">
                  {t('Recommended', 'موصى به')}
                </span>
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-ai-100 text-ai-600 ring-1 ring-ai-200 mb-3 group-hover:scale-105 transition-transform">
                  <SparklesIcon className={`w-5 h-5 ${aiLoading ? 'spin-slow' : ''}`} />
                </span>
                <p className="text-sm font-bold text-neutral-900">{t('Generate with AI', 'التوليد بالذكاء الاصطناعي')}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500 flex-1">
                  {t('Let AI draft items from your project scope, then review and adjust.', 'دع الذكاء الاصطناعي يصيغ البنود من نطاق مشروعك، ثم راجع وعدّل.')}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-ai-700">
                  {aiLoading ? t('Generating…', 'جارٍ التوليد…') : t('Suggest items', 'اقترح البنود')}
                  {!aiLoading && <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />}
                </span>
              </button>

              {/* 3 · Add manually — renders per the active view (Table = inline row) */}
              <button
                type="button"
                onClick={addManually}
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
              <p className="text-[12px] font-semibold text-neutral-800">{t('Etimad E-Market availability', 'التوفر في سوق اعتماد')}</p>
              <p className="text-[11px] text-neutral-500">
                {uncheckedRows.length > 0
                  ? t(`${uncheckedRows.length} of ${namedCount} items not checked yet.`, `${uncheckedRows.length} من ${namedCount} بنود لم يُتحقق منها بعد.`)
                  : t('All items checked.', 'تم التحقق من جميع البنود.')}
                {etimadAvailableCount > 0 && ' ' + t(`${etimadAvailableCount} available in Etimad E-Market.`, `${etimadAvailableCount} متوفرة في سوق اعتماد.`)}
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
            onMove={(row, origin) => requestMove(row, origin)}
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
                            {editingId === row.id ? renderItemForm('edit') : viewingId === row.id ? renderItemView(row) : (<>
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
                                {showCheckTop && (
                                  <button
                                    type="button"
                                    onClick={() => runEtimadCheck([row])}
                                    disabled={checkingIds.has(row.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ai-600 hover:bg-ai-50 transition-colors disabled:opacity-50"
                                    title={isStale(row) ? t('Item changed — re-check Etimad', 'تغيّر البند — أعد التحقق من اعتماد') : t('Check Etimad availability', 'التحقق من التوفر في اعتماد')}
                                    aria-label={t('Check Etimad availability', 'التحقق من التوفر في اعتماد')}
                                  >
                                    <SparklesIcon className={`w-3.5 h-3.5 ${checkingIds.has(row.id) ? 'spin-slow' : ''}`} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleView(row.id)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${viewingId === row.id ? 'text-brand-700 bg-brand-50' : 'text-neutral-500 hover:text-brand-700 hover:bg-brand-50'}`}
                                  title={t('View details', 'عرض التفاصيل')}
                                  aria-label={t('View details', 'عرض التفاصيل')}
                                >
                                  <EyeGlyph className="w-4 h-4" />
                                </button>
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
                                  onClick={() => { if (editingId === row.id) closeItemForm(); if (viewingId === row.id) setViewingId(null); removeBoqRow(row.id); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-error-500 hover:bg-error-50 transition-colors"
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
                                  onMove={(origin) => requestMove(row, origin)}
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

        {/* C · grouped by Etimad category — accordion (expand / collapse) */}
        {formData.boqItems.length > 0 && layout === 'grouped' && (
          <div className="space-y-3">
            {BOQ_CATEGORIES.map((cat) => {
              const m = BOQ_CATEGORY_META[cat];
              const rows = formData.boqItems.filter((r) => (r.category ?? deriveCategory(r.itemName)) === cat);
              if (rows.length === 0) return null;
              const subtotal = rows.reduce((s, r) => s + rowTotal(r), 0);
              const isOpen = expandedCats.has(cat);
              return (
                <div key={cat} className="rounded-xl border border-neutral-200 overflow-hidden">
                  <button type="button" onClick={() => toggleCat(cat)}
                    className="w-full flex items-center gap-2.5 px-4 py-3 bg-neutral-50 hover:bg-neutral-100/60 transition-colors text-start">
                    <ChevronRightIcon className={`w-3.5 h-3.5 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                    <Badge variant={m.badge}>{isAr ? m.ar : m.en}</Badge>
                    <span className="text-[11px] text-neutral-500 tabular-nums">{rows.length} {rows.length === 1 ? t('item', 'بند') : t('items', 'بنود')}</span>
                    {subtotal > 0 && <span className="ms-auto text-xs font-semibold text-neutral-700 tabular-nums" dir="ltr">SAR {formatSAR(subtotal)}</span>}
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-neutral-100 border-t border-neutral-200">
                      {rows.map((row) => {
                        if (editingId === row.id) return <div key={row.id}>{renderItemForm('edit')}</div>;
                        if (viewingId === row.id) return <div key={row.id}>{renderItemView(row)}</div>;
                        const total = rowTotal(row);
                        const unitPrice = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
                        const showCheckTop = !row.etimadCheck || isStale(row);
                        return (
                          <div key={row.id} className="bg-white hover:bg-neutral-50/40 transition-colors">
                            <div className="grid grid-cols-[1fr_72px_112px_128px_84px] items-center gap-2 px-4 pt-2.5">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-900 truncate">{itemLabel(row.itemName) || <span className="text-neutral-300 font-normal">{t('Unnamed item', 'بند بلا اسم')}</span>}</p>
                                {row.projectItem && <p className="text-[11px] text-neutral-500 truncate">{groupLabel(row.projectItem)}</p>}
                              </div>
                              <div className="text-center text-sm text-neutral-700 tabular-nums">{row.quantity !== '' ? row.quantity : '—'}<span className="block text-[10px] text-neutral-500">{row.unitOfMeasure}</span></div>
                              <div className="text-end text-sm text-neutral-700 tabular-nums" dir="ltr">{unitPrice > 0 ? `SAR ${formatSAR(unitPrice)}` : '—'}</div>
                              <div className="text-end text-sm font-bold text-neutral-900 tabular-nums" dir="ltr">{total > 0 ? `SAR ${formatSAR(total)}` : '—'}</div>
                              <div className="flex justify-end gap-0.5">
                                {showCheckTop && (
                                  <button type="button" onClick={() => runEtimadCheck([row])} disabled={checkingIds.has(row.id)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-ai-600 hover:bg-ai-50 transition-colors disabled:opacity-50"
                                    title={isStale(row) ? t('Item changed — re-check Etimad', 'تغيّر البند — أعد التحقق من اعتماد') : t('Check Etimad availability', 'التحقق من التوفر في اعتماد')}
                                    aria-label={t('Check Etimad availability', 'التحقق من التوفر في اعتماد')}>
                                    <SparklesIcon className={`w-3.5 h-3.5 ${checkingIds.has(row.id) ? 'spin-slow' : ''}`} />
                                  </button>
                                )}
                                <button type="button" onClick={() => toggleView(row.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${viewingId === row.id ? 'text-brand-700 bg-brand-50' : 'text-neutral-500 hover:text-brand-700 hover:bg-brand-50'}`} title={t('View details', 'عرض التفاصيل')} aria-label={t('View details', 'عرض التفاصيل')}><EyeGlyph className="w-4 h-4" /></button>
                                <button type="button" onClick={() => startEdit(row)} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-brand-700 hover:bg-brand-50 transition-colors" title={t('Edit item', 'تعديل البند')}><PencilIcon className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => { if (editingId === row.id) closeItemForm(); if (viewingId === row.id) setViewingId(null); removeBoqRow(row.id); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-error-500 hover:bg-error-50 transition-colors" title={t('Delete item', 'حذف البند')}><TrashIcon className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            {((row.attachments?.length ?? 0) > 0 || (row.etimadCheck && !isStale(row))) && (
                              <div className="px-4 pt-0 pb-3 space-y-2">
                                {(row.attachments?.length ?? 0) > 0 && <BoqAttachments readOnly attachments={row.attachments ?? []} onChange={() => {}} />}
                                {row.etimadCheck && !isStale(row) && <EtimadPanel hideUnchecked row={row} checking={checkingIds.has(row.id)} onCheck={() => runEtimadCheck([row])} onMove={(origin) => requestMove(row, origin)} onUpdate={(patch) => updateBoqRow(row.id, patch)} />}
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

      {/* Delete-all confirmation */}
      <ConfirmDeleteAll
        open={confirmDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={() => { updateField('boqItems', []); setExpandedGroups(new Set()); setShowAddForm(false); setConfirmDeleteAll(false); }}
        contextLabel="Bill of Quantities" contextLabelAr="جدول الكميات"
        title="Delete all items?" titleAr="حذف جميع البنود؟"
        message={`This removes all ${formData.boqItems.length} item${formData.boqItems.length === 1 ? '' : 's'} and can't be undone.`}
        messageAr={`سيؤدي هذا إلى حذف جميع البنود (${formData.boqItems.length}) ولا يمكن التراجع عنه.`}
      />

      {/* Confirmation modal before moving a BOQ item out to an Etimad E-Market request */}
      {moveConfirm && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] backdrop-in"
          onClick={() => setMoveConfirm(null)} role="dialog" aria-modal="true" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 5h2l2.2 10.2a1.5 1.5 0 001.5 1.2h7.1a1.5 1.5 0 001.5-1.1L21 8H7" /><circle cx="10" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /></svg>
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{t('Etimad E-Market', 'سوق اعتماد')}</p>
                <h3 className="text-[16px] font-bold mt-0.5">{t('Move this item to an E-Market request?', 'نقل هذا البند إلى طلب سوق اعتماد؟')}</h3>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-neutral-700 leading-relaxed">
                {isAr ? (<><strong>{itemLabel(moveConfirm.row.itemName) || 'هذا البند'}</strong>{' سيُزال من طلب المنافسة هذا ويُضاف إلى طلب مستقل في سوق اعتماد. '}{movedItems.length === 0 ? 'سيتم إنشاء مسودة طلب جديدة في سوق اعتماد وحفظها.' : 'سيُضاف إلى مسودة طلب سوق اعتماد الحالية.'}</>)
                       : (<><strong>{itemLabel(moveConfirm.row.itemName) || 'This item'}</strong>{' will be removed from this tender request and added to a separate Etimad E-Market request. '}{movedItems.length === 0 ? 'A new E-Market draft request will be created and saved.' : 'It will be added to your existing E-Market draft request.'}</>)}
              </p>
              <p className="mt-2 text-[12px] text-neutral-500">{t('You can review or modify that request anytime from the E-Market bucket.', 'يمكنك مراجعة هذا الطلب أو تعديله في أي وقت من سلة سوق اعتماد.')}</p>
            </div>
            <div className="px-5 py-3 border-t border-neutral-100 flex justify-end gap-2">
              <button type="button" onClick={() => setMoveConfirm(null)} className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">{t('Cancel', 'إلغاء')}</button>
              <button type="button" onClick={confirmMove} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 transition-colors shadow-sm">{t('Yes, move it', 'نعم، انقله')}</button>
            </div>
          </div>
        </div>, document.body)}

      {/* Flying document — animates from the item's row into the bucket */}
      {flying && <FlyingDoc origin={flying.origin} target={flying.target} />}

      {/* Floating Etimad E-Market request bucket */}
      {showBucket && createPortal(
        <div ref={bucketRef} className="fixed z-40 bottom-6 start-6">
          <button type="button" onClick={() => setBucketOpen(true)}
            className="group relative flex items-center gap-2.5 ps-2.5 pe-4 py-2.5 rounded-2xl bg-white border border-brand-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all bucket-slide-in"
            aria-label={t('Open Etimad E-Market request', 'فتح طلب سوق اعتماد')}>
            <span className={`relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center flex-shrink-0 ${bucketReceiving ? 'bucket-receive' : ''}`}>
              {bucketReceiving && <span className="absolute inset-0 rounded-xl bg-brand-400/40 bucket-ring" />}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 5h2l2.2 10.2a1.5 1.5 0 001.5 1.2h7.1a1.5 1.5 0 001.5-1.1L21 8H7" /><circle cx="10" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /></svg>
              <span className="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 rounded-full bg-error-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white tabular-nums">{movedItems.length}</span>
            </span>
            <span className="text-start">
              <span className="block text-[12.5px] font-bold text-neutral-900 leading-tight">{t('Etimad E-Market', 'سوق اعتماد')}</span>
              <span className="block text-[11px] text-neutral-500">{t(`${movedItems.length} item${movedItems.length === 1 ? '' : 's'} · draft`, `${movedItems.length} بند · مسودة`)}</span>
            </span>
          </button>
        </div>, document.body)}

      {/* Bucket drawer — items moved to the Etimad E-Market draft request */}
      {bucketOpen && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px] backdrop-in" onClick={() => setBucketOpen(false)} role="dialog" aria-modal="true" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="relative w-full max-w-[440px] h-full bg-white shadow-2xl flex flex-col drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 5h2l2.2 10.2a1.5 1.5 0 001.5 1.2h7.1a1.5 1.5 0 001.5-1.1L21 8H7" /><circle cx="10" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /></svg>
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{t('Etimad E-Market request', 'طلب سوق اعتماد')}</p>
                    <h3 className="text-[16px] font-bold mt-0.5">{t(`${movedItems.length} item${movedItems.length === 1 ? '' : 's'} moved here`, `${movedItems.length} بند مُنقَل هنا`)}</h3>
                  </div>
                </div>
                <button type="button" onClick={() => setBucketOpen(false)} aria-label={t('Close', 'إغلاق')} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-success-100 bg-success-50 px-3.5 py-3">
                <CheckCircleIcon className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                <p className="text-[12.5px] text-success-800 leading-relaxed">
                  {t('This is saved as a draft Etimad E-Market request. You can open and modify it anytime from My Requests.', 'هذا محفوظ كمسودة طلب في سوق اعتماد. يمكنك فتحه وتعديله في أي وقت من "طلباتي".')}
                </p>
              </div>
              {movedItems.length === 0 ? (
                <p className="text-[13px] text-neutral-400 italic">{t('No items moved yet.', 'لم تُنقل أي بنود بعد.')}</p>
              ) : (
                <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                  {movedItems.map((r) => {
                    const qty = typeof r.quantity === 'number' ? r.quantity : 0;
                    const price = typeof r.unitPrice === 'number' ? r.unitPrice : 0;
                    const total = qty * price;
                    return (
                      <div key={r.id} className="px-3.5 py-3 bg-white">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                            <DocumentIcon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-neutral-900 truncate">{itemLabel(r.itemName) || t('Unnamed item', 'بند بلا اسم')}</p>
                            <p className="text-[11px] text-neutral-500 tabular-nums">
                              {qty > 0 ? `${qty} ${r.unitOfMeasure || ''}` : '—'}{price > 0 ? <span dir="ltr"> · SAR {formatSAR(price)}</span> : null}
                            </p>
                          </div>
                          {total > 0 && <span className="text-[12.5px] font-bold text-neutral-800 tabular-nums flex-shrink-0" dir="ltr">SAR {formatSAR(total)}</span>}
                        </div>
                        <div className="mt-2 ps-11">
                          <button type="button" onClick={() => returnBoqItemFromEtimad(r.id)}
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-700 hover:text-brand-800 transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 5 5v1" /></svg>
                            {t('Put back to this request', 'إعادته إلى هذا الطلب')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-neutral-400">{t('Moving items here keeps this tender focused on items that genuinely need a competitive tender.', 'نقل البنود إلى هنا يُبقي هذه المنافسة مركّزة على البنود التي تحتاج فعلاً إلى منافسة.')}</p>
            </div>
            <div className="shrink-0 px-5 py-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              <button type="button" onClick={viewDraftRequest} disabled={movedItems.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-300 bg-white text-[13px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                {t('View draft request', 'عرض مسودة الطلب')}
              </button>
              <button type="button" onClick={() => setBucketOpen(false)} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 transition-colors">{t('Got it', 'تمام')}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}

/** A document icon that animates from a BOQ row into the Etimad bucket. */
function FlyingDoc({ origin, target }: { origin: DOMRect; target: DOMRect }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;
  const dx = (target.left + target.width / 2) - ox;
  const dy = (target.top + target.height / 2) - oy;
  return createPortal(
    <div style={{
      position: 'fixed', left: ox - 26, top: oy - 26, zIndex: 70, pointerEvents: 'none',
      transform: go ? `translate(${dx}px, ${dy}px) scale(0.28) rotate(-14deg)` : 'translate(0, 0) scale(1) rotate(0deg)',
      opacity: go ? 0.05 : 1,
      transition: 'transform 0.8s cubic-bezier(0.5, -0.25, 0.35, 1), opacity 0.8s ease-in 0.25s',
    }}>
      <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-2xl border border-brand-200 flex items-center justify-center">
        <DocumentIcon className="w-7 h-7 text-brand-600" />
      </div>
    </div>, document.body);
}
