import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useRequests } from './RequestStore';
import { PROJECTS } from '../data/mockData';
import { classifyItem } from '../lib/triage';
import { etimadItemKey } from '../lib/etimadCheck';
import type {
  TenderFormData,
  BOQRow,
  DeliverableRow,
  PaymentStageRow,
  Person,
  TechRequirementRow,
  EvalCriterionRow,
  QualMainCriteria,
  FileAttachment,
  SectionStatus,
  TenderStatus,
  SourceType,
  V3Stage,
} from '../types/tender';

export const SECTIONS = [
  { id: 'procurement-route', title: 'Procurement Route', titleAr: 'مسار الشراء', desc: 'Project, items and how they can be procured', descAr: 'المشروع والبنود وطريقة شرائها' },
  { id: 'project-setup', title: 'Project Setup', titleAr: 'إعداد المشروع', desc: 'Project, cost center and item details', descAr: 'تفاصيل المشروع ومركز التكلفة والبنود' },
  { id: 'scope-of-work', title: 'Scope of Work', titleAr: 'نطاق العمل', desc: 'Scope, terms and contract duration', descAr: 'النطاق والشروط ومدة العقد' },
  { id: 'boq', title: 'Bill of Quantities', titleAr: 'جدول الكميات', desc: 'Items, quantities and specifications', descAr: 'البنود والكميات والمواصفات' },
  { id: 'payment-schedule', title: 'Payment Schedule', titleAr: 'جدول الدفعات', desc: 'Payment stages and schedule', descAr: 'مراحل الدفع والجدول الزمني' },
  { id: 'technical-evaluation', title: 'Technical Evaluation', titleAr: 'التقييم الفني', desc: 'Scoring and evaluation methodology', descAr: 'منهجية التقييم والدرجات' },
  { id: 'qualification', title: 'Qualification Criteria', titleAr: 'معايير التأهيل', desc: 'Vendor eligibility requirements', descAr: 'متطلبات أهلية المورّد' },
  { id: 'attachments', title: 'Attachments', titleAr: 'المرفقات', desc: 'Optional reference documents, final submission', descAr: 'مستندات مرجعية اختيارية والتقديم النهائي' },
  { id: 'review', title: 'Review & Confirm', titleAr: 'المراجعة والتأكيد', desc: 'Final review before submitting', descAr: 'المراجعة النهائية قبل التقديم' },
];

const DEFAULT_QUAL: QualMainCriteria[] = [
  {
    id: 'qm-1',
    name: 'Previous Experience',
    nameAr: 'الخبرة السابقة',
    percentage: '',
    subCriteria: [
      { id: 'qs-1-1', name: 'Number of years of experience', nameAr: 'عدد سنوات الخبرة', range: '', percentage: '' },
      { id: 'qs-1-2', name: 'Number of projects (last 3 years)', nameAr: 'عدد المشاريع خلال 3 سنوات', range: '', percentage: '' },
      { id: 'qs-1-3', name: 'Total value of projects (last 3 years)', nameAr: 'إجمالي قيمة المشاريع خلال 3 سنوات', range: '', percentage: '' },
    ],
  },
  {
    id: 'qm-2',
    name: 'Existing Contractual Obligations',
    nameAr: 'الالتزامات التعاقدية القائمة',
    percentage: '',
    subCriteria: [
      { id: 'qs-2-1', name: 'Number of existing projects', nameAr: 'عدد المشاريع القائمة', range: '', percentage: '' },
      { id: 'qs-2-2', name: 'Value of existing projects', nameAr: 'قيمة المشاريع القائمة', range: '', percentage: '' },
    ],
  },
  {
    id: 'qm-3',
    name: 'Human Resources',
    nameAr: 'الموارد البشرية',
    percentage: '',
    subCriteria: [
      { id: 'qs-3-1', name: 'Number of employees', nameAr: 'عدد الموظفين', range: '', percentage: '' },
      { id: 'qs-3-2', name: 'Percentage of Saudi employees', nameAr: 'نسبة الموظفين السعوديين', range: '', percentage: '' },
    ],
  },
];

const INITIAL: TenderFormData = {
  sourceType: 'tendering',
  costCenterId: '',
  additionalCostCenterIds: [],
  projectId: '',
  selectedProjectItemIds: [],
  tenderingPurpose: '',
  scopeOfWork: '',
  scopeTerms: '',
  scopeIncludes: [],
  extraRegulatoryRecords: [],
  boqItems: [],
  hasBrandName: null,
  brandNameJustification: '',
  executionLocation: '',
  startDate: '',
  contractDurationType: 'months',
  contractDuration: '',
  deliverables: [],
  paymentStages: [],
  technicalCommitteeMembers: [],
  technicalDocumentsList: [],
  technicalRequirements: [],
  evaluationCriteria: [],
  technicalPassingPercentage: '',
  qualificationCommitteeMembers: [],
  qualificationCriteria: DEFAULT_QUAL,
  attachments: [],
};

interface TenderContextType {
  formData: TenderFormData;
  currentSection: number;
  isSaving: boolean;
  lastSaved: Date | null;
  sectionStatuses: SectionStatus[];
  boqSubtotal: number;
  boqVat: number;
  boqTotal: number;
  paymentPctTotal: number;
  evalWeightTotal: number;
  qualPctTotal: number;
  /** Step 1 (Procurement Route) determines the channel; later steps unlock once it's confirmed. */
  routeConfirmed: boolean;
  confirmRoute: (opts: { sourceType: SourceType; projectId: string; items: { name: string; nameAr?: string; projectItemId?: string }[]; justification?: string; justifiedItems?: string[]; choice?: 'tender' | 'emarket' | 'help'; movedToDraft?: { count: number; route: SourceType }; seed?: Partial<TenderFormData>; startedFromRfp?: string }) => void;
  importedFromProject: string | null;
  setImportedFromProject: (name: string | null) => void;
  /** Last RFP imported in Project Setup, with the values it replaced (for Undo). */
  rfpImport: { rfpId: string; code: string; previous: Partial<TenderFormData> } | null;
  setRfpImport: (v: { rfpId: string; code: string; previous: Partial<TenderFormData> } | null) => void;
  goToSection: (idx: number) => void;
  updateField: <K extends keyof TenderFormData>(field: K, value: TenderFormData[K]) => void;
  // Helpers for arrays
  updateBoqRow: (id: string, patch: Partial<BOQRow>) => void;
  addBoqRow: () => void;
  removeBoqRow: (id: string) => void;
  updateDeliverableRow: (id: string, patch: Partial<DeliverableRow>) => void;
  addDeliverableRow: () => void;
  removeDeliverableRow: (id: string) => void;
  updatePaymentRow: (id: string, patch: Partial<PaymentStageRow>) => void;
  addPaymentRow: () => void;
  removePaymentRow: (id: string) => void;
  updateTechReqRow: (id: string, patch: Partial<TechRequirementRow>) => void;
  addTechReqRow: () => void;
  removeTechReqRow: (id: string) => void;
  updateEvalRow: (id: string, patch: Partial<EvalCriterionRow>) => void;
  addEvalRow: () => void;
  removeEvalRow: (id: string) => void;
  updateQualMain: (id: string, patch: Partial<QualMainCriteria>) => void;
  updateQualSub: (mainId: string, subId: string, patch: { range?: string; percentage?: number | '' }) => void;
  addAttachment: (file: FileAttachment) => void;
  removeAttachment: (id: string) => void;
  setTechnicalCommitteeMembers: (p: Person[]) => void;
  setQualificationCommitteeMembers: (p: Person[]) => void;
  requestId: string;
  status: TenderStatus;
  saveState: 'idle' | 'saving' | 'saved' | 'error' | 'unavailable';
  saveNow: () => Promise<void>;
  readyToSubmit: boolean;
  submitted: { requestNo: string; at: string } | null;
  submit: () => Promise<void>;
  isSubmitting: boolean;
  /** v3 hand-off between Requester and Procurement. */
  v3Stage: V3Stage;
  requesterReady: boolean;
  procurementReady: boolean;
  handOff: (next: V3Stage, by: 'requester' | 'procurement', note?: string) => Promise<void>;
  /** Move BOQ rows into this tender's linked Etimad E-Market draft (created on first use). */
  moveBoqRowsToEtimad: (ids: string[]) => Promise<'moved' | 'preview' | 'error'>;
}

const Ctx = createContext<TenderContextType | null>(null);

interface ProviderProps {
  children: ReactNode;
  requestId?: string;
  initialForm?: TenderFormData;
  initialStatus?: TenderStatus;
  initialSourceType?: TenderFormData['sourceType'];
  /** Seed values from the Procurement Route flow (e.g. items pre-filled into the BOQ). */
  initialSeed?: Partial<TenderFormData>;
}

const UOM: Record<string, string> = { manpower: 'Person-month', services: 'Service', equipment: 'Each', material: 'Each' };
const CAT: Record<string, BOQRow['category']> = { manpower: 'manpower', services: 'service', equipment: 'equipment', material: 'material' };
/** One BOQ line per item chosen in step 1. */
function seedBoq(items: { name: string; nameAr?: string; projectItemId?: string }[], sourceType: SourceType, justification?: string): BOQRow[] {
  const now = new Date().toISOString();
  return items.map((it) => {
    const proj = PROJECTS.find((p) => p.items.some((x) => x.id === it.projectItemId));
    const pi = proj?.items.find((x) => x.id === it.projectItemId);
    const bt = classifyItem({ id: it.projectItemId ?? it.name, name: it.name, nameAr: it.nameAr, type: pi?.type }).boqType;
    const base: BOQRow = {
      id: crypto.randomUUID(), projectItem: it.name, itemName: it.name, itemDescription: '',
      unitOfMeasure: UOM[bt] ?? 'Each', quantity: '', unitPrice: '', deliveryDate: '',
    };
    if (sourceType === 'souq-etimad') {
      return { ...base, purchaseType: bt === 'services' || bt === 'manpower' ? 'service' : 'product', productId: '', supplier: '', lineTotal: '' };
    }
    // The catalogue lookup already ran in step 1 — carry its result onto the line.
    const onEmarket = classifyItem({ id: it.projectItemId ?? it.name, name: it.name, type: pi?.type }).route === 'souq-etimad';
    return {
      ...base, category: CAT[bt],
      etimadCheck: { status: onEmarket ? 'available' : 'not-available', comment: onEmarket ? 'Listed on Etimad eMarket — kept in this tender in step 1.' : 'Checked in step 1: needs a competitive tender.', checkedAt: now, source: 'demo', itemKey: etimadItemKey(base) },
      ...(onEmarket ? { etimadKeep: true, etimadJustification: justification ?? '' } : {}),
    };
  });
}

export function TenderProvider({ children, requestId: givenId, initialForm, initialStatus, initialSourceType, initialSeed }: ProviderProps) {
  const store = useRequests();
  const [requestId] = useState(() => givenId ?? crypto.randomUUID());
  const [formData, setFormData] = useState<TenderFormData>(() =>
    initialForm
      ? { ...INITIAL, ...initialForm }
      : { ...INITIAL, ...(initialSeed ?? {}), sourceType: initialSourceType ?? initialSeed?.sourceType ?? INITIAL.sourceType });
  const [status, setStatus] = useState<TenderStatus>(initialStatus ?? 'draft');
  // Existing requests are already past the route step; new ones start on it.
  const [routeConfirmed, setRouteConfirmed] = useState<boolean>(!!initialForm);
  const [currentSection, setCurrentSection] = useState(initialForm ? 1 : 0);
  const [saveState, setSaveState] = useState<TenderContextType['saveState']>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [importedFromProject, setImportedFromProject] = useState<string | null>(null);
  const [rfpImport, setRfpImport] = useState<TenderContextType['rfpImport']>(null);
  const [submitted, setSubmitted] = useState<TenderContextType['submitted']>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dirty = useRef(false);
  const latest = useRef({ formData, status });
  latest.current = { formData, status };

  const persist = useCallback(async (form: TenderFormData, st: TenderStatus, extra?: Record<string, unknown>) => {
    if (store.mode === 'loading') { setSaveState('unavailable'); return false; }
    setSaveState('saving');
    const ok = await store.save(requestId, form, st, extra);
    setSaveState(ok ? 'saved' : 'error');
    if (ok) setLastSaved(new Date());
    return ok;
  }, [store, requestId]);

  // Mark edits; the debounced effect below does the real save.
  const triggerSave = useCallback(() => { dirty.current = true; }, []);

  useEffect(() => {
    if (!dirty.current) return;
    const h = setTimeout(() => { persist(latest.current.formData, latest.current.status); }, 1200);
    return () => clearTimeout(h);
  }, [formData, persist]);

  const saveNow = useCallback(async () => {
    dirty.current = true;
    await persist(latest.current.formData, latest.current.status);
  }, [persist]);

  const isSaving = saveState === 'saving';

  const updateField = useCallback(<K extends keyof TenderFormData>(field: K, value: TenderFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    triggerSave();
  }, [triggerSave]);

  const goToSection = useCallback((idx: number) => {
    setCurrentSection(Math.max(0, Math.min(idx, SECTIONS.length - 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Called from the Procurement Route step once the channel is determined.
  // Seeds the project, cost center, selected items and a starter BOQ for the chosen group.
  const confirmRoute = useCallback((opts: { sourceType: SourceType; projectId: string; items: { name: string; nameAr?: string; projectItemId?: string }[]; justification?: string; justifiedItems?: string[]; choice?: 'tender' | 'emarket' | 'help'; movedToDraft?: { count: number; route: SourceType }; seed?: Partial<TenderFormData>; startedFromRfp?: string }) => {
    const proj = PROJECTS.find((p) => p.id === opts.projectId);
    setFormData((prev) => ({
      ...prev,
      sourceType: opts.sourceType,
      projectId: opts.projectId,
      costCenterId: proj?.costCenterId ?? prev.costCenterId,
      selectedProjectItemIds: opts.items.map((i) => i.projectItemId).filter((x): x is string => !!x),
      routeJustification: opts.justification || undefined,
      justifiedEmarketItems: opts.justifiedItems?.length ? opts.justifiedItems : undefined,
      routeChoice: opts.choice,
      movedToDraft: opts.movedToDraft,
      tenderingPurpose: prev.tenderingPurpose || proj?.purpose || '',
      // v3: the BOQ starts from the items chosen in step 1 (or a past request's BOQ), so
      // nothing is typed twice. Each line keeps the step-1 item as its project item.
      ...(opts.seed ?? {}),
      boqItems: opts.seed?.boqItems?.length ? opts.seed.boqItems : seedBoq(opts.items, opts.sourceType, opts.justification),
      startedFromRfp: opts.startedFromRfp,
      v3Stage: 'draft',
    }));
    setRouteConfirmed(true);
    triggerSave();
    // Both routes continue into the wizard (E-Market has a shorter, purchase-oriented flow).
    goToSection(1);
  }, [triggerSave, goToSection]);

  // BOQ helpers
  const updateBoqRow = useCallback((id: string, patch: Partial<BOQRow>) => {
    setFormData((p) => ({ ...p, boqItems: p.boqItems.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    triggerSave();
  }, [triggerSave]);

  const addBoqRow = useCallback(() => {
    const id = crypto.randomUUID();
    setFormData((p) => ({
      ...p,
      boqItems: [...p.boqItems, { id, projectItem: '', itemName: '', itemDescription: '', unitOfMeasure: 'Each', quantity: '', unitPrice: '', deliveryDate: '' }],
    }));
  }, []);

  const removeBoqRow = useCallback((id: string) => {
    setFormData((p) => ({ ...p, boqItems: p.boqItems.filter((r) => r.id !== id) }));
    triggerSave();
  }, [triggerSave]);

  // Deliverable helpers
  const updateDeliverableRow = useCallback((id: string, patch: Partial<DeliverableRow>) => {
    setFormData((p) => ({ ...p, deliverables: p.deliverables.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    triggerSave();
  }, [triggerSave]);

  const addDeliverableRow = useCallback(() => {
    const id = crypto.randomUUID();
    setFormData((p) => ({
      ...p,
      deliverables: [...p.deliverables, { id, phase: '', deliverableName: '', deliveryDate: '', description: '' }],
    }));
  }, []);

  const removeDeliverableRow = useCallback((id: string) => {
    setFormData((p) => ({ ...p, deliverables: p.deliverables.filter((r) => r.id !== id) }));
    triggerSave();
  }, [triggerSave]);

  // Payment helpers
  const updatePaymentRow = useCallback((id: string, patch: Partial<PaymentStageRow>) => {
    setFormData((p) => ({ ...p, paymentStages: p.paymentStages.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    triggerSave();
  }, [triggerSave]);

  const addPaymentRow = useCallback(() => {
    const id = crypto.randomUUID();
    setFormData((p) => ({
      ...p,
      paymentStages: [...p.paymentStages, { id, stageName: '', itemsDeliverables: '', startDate: '', duration: '', percentage: '' }],
    }));
  }, []);

  const removePaymentRow = useCallback((id: string) => {
    setFormData((p) => ({ ...p, paymentStages: p.paymentStages.filter((r) => r.id !== id) }));
    triggerSave();
  }, [triggerSave]);

  // Tech req helpers
  const updateTechReqRow = useCallback((id: string, patch: Partial<TechRequirementRow>) => {
    setFormData((p) => ({ ...p, technicalRequirements: p.technicalRequirements.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    triggerSave();
  }, [triggerSave]);

  const addTechReqRow = useCallback(() => {
    const id = crypto.randomUUID();
    setFormData((p) => ({
      ...p,
      technicalRequirements: [...p.technicalRequirements, { id, requirement: '', description: '' }],
    }));
  }, []);

  const removeTechReqRow = useCallback((id: string) => {
    setFormData((p) => ({ ...p, technicalRequirements: p.technicalRequirements.filter((r) => r.id !== id) }));
    triggerSave();
  }, [triggerSave]);

  // Eval criterion helpers
  const updateEvalRow = useCallback((id: string, patch: Partial<EvalCriterionRow>) => {
    setFormData((p) => ({ ...p, evaluationCriteria: p.evaluationCriteria.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    triggerSave();
  }, [triggerSave]);

  const addEvalRow = useCallback(() => {
    const id = crypto.randomUUID();
    setFormData((p) => ({
      ...p,
      evaluationCriteria: [...p.evaluationCriteria, { id, description: '', howApplied: '', weight: '' }],
    }));
  }, []);

  const removeEvalRow = useCallback((id: string) => {
    setFormData((p) => ({ ...p, evaluationCriteria: p.evaluationCriteria.filter((r) => r.id !== id) }));
    triggerSave();
  }, [triggerSave]);

  // Qual helpers
  const updateQualMain = useCallback((id: string, patch: Partial<QualMainCriteria>) => {
    setFormData((p) => ({ ...p, qualificationCriteria: p.qualificationCriteria.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    triggerSave();
  }, [triggerSave]);

  const updateQualSub = useCallback((mainId: string, subId: string, patch: { range?: string; percentage?: number | '' }) => {
    setFormData((p) => ({
      ...p,
      qualificationCriteria: p.qualificationCriteria.map((m) =>
        m.id === mainId
          ? { ...m, subCriteria: m.subCriteria.map((s) => (s.id === subId ? { ...s, ...patch } : s)) }
          : m
      ),
    }));
    triggerSave();
  }, [triggerSave]);

  // Attachment helpers
  const addAttachment = useCallback((file: FileAttachment) => {
    setFormData((p) => ({ ...p, attachments: [...p.attachments, file] }));
    triggerSave();
  }, [triggerSave]);

  const removeAttachment = useCallback((id: string) => {
    setFormData((p) => ({ ...p, attachments: p.attachments.filter((a) => a.id !== id) }));
    triggerSave();
  }, [triggerSave]);

  const setTechnicalCommitteeMembers = useCallback((members: Person[]) => {
    updateField('technicalCommitteeMembers', members);
  }, [updateField]);

  const setQualificationCommitteeMembers = useCallback((members: Person[]) => {
    updateField('qualificationCommitteeMembers', members);
  }, [updateField]);

  // Computed
  const isEsouqReq = formData.sourceType === 'souq-etimad';
  const boqSubtotal = formData.boqItems.reduce((s, r) => {
    const p = typeof r.unitPrice === 'number' ? r.unitPrice : 0;
    if (isEsouqReq) {
      // E-Market line total: manual override, else product = price·qty + shipping, else price.
      if (typeof r.lineTotal === 'number') return s + r.lineTotal;
      if (r.purchaseType === 'product') return s + p * ((typeof r.quantity === 'number' ? r.quantity : 0) || 1) + (typeof r.shippingCharges === 'number' ? r.shippingCharges : 0);
      return s + p;
    }
    const q = typeof r.quantity === 'number' ? r.quantity : 0;
    return s + q * p;
  }, 0);
  const boqVat = boqSubtotal * 0.15;
  const boqTotal = boqSubtotal + boqVat;

  const paymentPctTotal = formData.paymentStages.reduce((s, r) => s + (typeof r.percentage === 'number' ? r.percentage : 0), 0);
  const evalWeightTotal = formData.evaluationCriteria.reduce((s, r) => s + (typeof r.weight === 'number' ? r.weight : 0), 0);
  const qualPctTotal = formData.qualificationCriteria.reduce((s, r) => s + (typeof r.percentage === 'number' ? r.percentage : 0), 0);

  // Raw completion per section (no "current step" override) — used for readiness checks.
  const rawStatuses: SectionStatus[] = SECTIONS.map((sec): SectionStatus => {
    switch (sec.id) {
      case 'procurement-route':
        return routeConfirmed ? 'completed' : 'not-started';
      case 'project-setup':
        // v3: the project comes from step 1; this part asks for the purpose.
        if (formData.projectId && formData.tenderingPurpose.trim().length > 0) return 'completed';
        if (formData.projectId) return 'missing';
        return 'not-started';
      case 'scope-of-work': {
        // Scope now also captures contract duration & location (moved from Deliverables).
        const scopeOk = formData.scopeOfWork.trim().length >= 30;
        const contractOk = !!(formData.executionLocation && formData.startDate && formData.contractDuration);
        if (scopeOk && contractOk) return 'completed';
        if (formData.scopeOfWork.trim().length > 0 || formData.executionLocation || formData.startDate || formData.contractDuration) return 'missing';
        return 'not-started';
      }
      case 'boq':
        // Brand name is decided per BOQ row; a branded row needs a justification.
        if (formData.boqItems.length > 0 && formData.boqItems.every((r) => !r.hasBrandName || (r.brandJustification ?? '').trim())) return 'completed';
        if (formData.boqItems.length > 0) return 'missing';
        return 'not-started';
      case 'payment-schedule':
        if (formData.paymentStages.length > 0 && paymentPctTotal === 100) return 'completed';
        if (formData.paymentStages.length > 0) return 'missing';
        return 'not-started';
      case 'technical-evaluation':
        if (formData.evaluationCriteria.length > 0 && evalWeightTotal === 100 && formData.technicalPassingPercentage) return 'completed';
        if (formData.evaluationCriteria.length > 0 || formData.technicalDocumentsList.length > 0) return 'missing';
        return 'not-started';
      case 'qualification':
        if (qualPctTotal === 100 && formData.qualificationCriteria.every((m) =>
          m.subCriteria.reduce((t, c) => t + (typeof c.percentage === 'number' ? c.percentage : 0), 0) === 100)) return 'completed';
        if (formData.qualificationCommitteeMembers.length > 0 || qualPctTotal > 0) return 'missing';
        return 'not-started';
      case 'attachments':
        return formData.attachments.length > 0 ? 'completed' : 'not-started';
      case 'review':
        return 'not-started';
      default:
        return 'not-started';
    }
  });
  const sectionStatuses: SectionStatus[] = rawStatuses.map((st, idx) => (idx === currentSection ? 'in-progress' : st));

  const moveBoqRowsToEtimad = useCallback(async (ids: string[]): Promise<'moved' | 'preview' | 'error'> => {
    if (store.mode !== 'live') return 'preview';
    const f = latest.current.formData;
    const rows = f.boqItems.filter((r) => ids.includes(r.id));
    if (rows.length === 0) return 'moved';
    const draftId = f.linkedEtimadRequestId ?? crypto.randomUUID();
    const existing = store.get(draftId);
    const base: TenderFormData = existing?.form ?? {
      ...INITIAL,
      sourceType: 'souq-etimad',
      costCenterId: f.costCenterId,
      projectId: f.projectId,
      tenderingPurpose: f.tenderingPurpose,
    };
    const moved = rows.map((r) => ({ ...r, etimadKeep: false, etimadJustification: '' }));
    const nextForm: TenderFormData = {
      ...base,
      boqItems: [...base.boqItems.filter((x) => !ids.includes(x.id)), ...moved],
    };
    const ok = await store.save(draftId, nextForm, existing?.status ?? 'draft');
    if (!ok) return 'error';
    dirty.current = true;
    setFormData((prev) => ({
      ...prev,
      linkedEtimadRequestId: draftId,
      boqItems: prev.boqItems.filter((r) => !ids.includes(r.id)),
    }));
    return 'moved';
  }, [store]);

  /* ── v3 hand-off ─────────────────────────────────────────────────────────── */
  const v3Stage: V3Stage = formData.v3Stage ?? 'draft';
  const statusOf = (id: string) => rawStatuses[SECTIONS.findIndex((x) => x.id === id)];
  const requesterReady = routeConfirmed && (formData.sourceType === 'souq-etimad'
    ? formData.boqItems.length > 0
    : statusOf('scope-of-work') === 'completed' && statusOf('boq') === 'completed' && formData.tenderingPurpose.trim().length > 0);
  const procurementReady = statusOf('payment-schedule') === 'completed' && statusOf('technical-evaluation') === 'completed' && statusOf('qualification') === 'completed';
  const handOff = useCallback(async (next: V3Stage, by: 'requester' | 'procurement', note?: string) => {
    const d = new Date();
    const f = latest.current.formData;
    const requestNo = `TEN-${d.getFullYear()}-${requestId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const nextForm: TenderFormData = {
      ...f,
      v3Stage: next,
      ...(by === 'procurement' ? { procurementNote: note ?? f.procurementNote } : {}),
      ...(by === 'requester' && next === 'with-procurement' && note ? { requesterChangeRequest: note } : {}),
      v3History: [...(f.v3History ?? []), { stage: next, at: d.toISOString(), by, note }],
    };
    const st: TenderStatus = next === 'in-approval' ? 'submitted' : next === 'draft' ? 'draft' : 'under-review';
    setFormData(nextForm);
    setStatus(st);
    await persist(nextForm, st, { requestNo, submittedAt: d.toISOString() });
    if (next === 'in-approval' || next === 'with-procurement') setSubmitted({ requestNo, at: d.toISOString() });
  }, [persist, requestId]);

  // Every section except Attachments (optional) and Review must be complete.
  // E-Market uses a shorter flow: only Procurement Route → Project Setup → BOQ are required.
  const ESOUQ_REQUIRED = ['project-setup', 'boq'];
  const readyToSubmit = SECTIONS.every((sec, idx) => {
    if (sec.id === 'procurement-route') return routeConfirmed;
    if (sec.id === 'attachments' || sec.id === 'review') return true;
    if (formData.sourceType === 'souq-etimad' && !ESOUQ_REQUIRED.includes(sec.id)) return true;
    return sectionStatuses[idx] === 'completed';
  });

  const submit = useCallback(async () => {
    if (!readyToSubmit || isSubmitting) return;
    setIsSubmitting(true);
    const d = new Date();
    const requestNo = `TEN-${d.getFullYear()}-${requestId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const ok = store.mode === 'live'
      ? await persist(latest.current.formData, 'submitted', { requestNo, submittedAt: d.toISOString() })
      : true;
    setIsSubmitting(false);
    if (ok) { setStatus('submitted'); setSubmitted({ requestNo, at: d.toISOString() }); }
  }, [readyToSubmit, isSubmitting, requestId, store.mode, persist]);

  return (
    <Ctx.Provider value={{
      requestId, status, saveState, saveNow, readyToSubmit, submitted, submit, isSubmitting,
      v3Stage, requesterReady, procurementReady, handOff,
      moveBoqRowsToEtimad,
      formData, currentSection, isSaving, lastSaved, sectionStatuses,
      boqSubtotal, boqVat, boqTotal, paymentPctTotal, evalWeightTotal, qualPctTotal,
      routeConfirmed, confirmRoute,
      importedFromProject, setImportedFromProject, rfpImport, setRfpImport,
      goToSection, updateField,
      updateBoqRow, addBoqRow, removeBoqRow,
      updateDeliverableRow, addDeliverableRow, removeDeliverableRow,
      updatePaymentRow, addPaymentRow, removePaymentRow,
      updateTechReqRow, addTechReqRow, removeTechReqRow,
      updateEvalRow, addEvalRow, removeEvalRow,
      updateQualMain, updateQualSub,
      addAttachment, removeAttachment,
      setTechnicalCommitteeMembers, setQualificationCommitteeMembers,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTender() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTender must be used inside TenderProvider');
  return c;
}
