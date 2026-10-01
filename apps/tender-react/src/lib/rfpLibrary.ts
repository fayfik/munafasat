// Past RFPs a requester can import from, and what an import fills in.
// Demo data: an import copies sample content into the later sections
// (scope, BOQ, deliverables, payments, technical evaluation) so the user
// starts from a filled-in request and edits from there.
import { PROJECTS } from '../data/mockData';
import { AI_SCOPE, AI_TERMS } from '../sections/ScopeOfWork';
import { AI_BOQ_ROWS } from '../sections/BillOfQuantities';
import { AI_DELIVERABLES } from '../sections/Deliverables';
import { AI_STAGES } from '../sections/PaymentSchedule';
import { AI_TECH_DOCS, AI_TECH_REQUIREMENTS, AI_EVAL_CRITERIA } from '../sections/TechnicalEvaluation';
import type { BOQRow, ProjectItemType, TenderFormData } from '../types/tender';

export interface PastRfp {
  id: string;
  code: string;
  title: string;
  titleAr: string;
  created: string; // ISO date
  projectId: string;
  department: string;
  value: string;
}

export const PAST_RFPS: PastRfp[] = [
  { id: 'rfp-2024-031', code: 'RFP-2024-031', title: 'ERP Licence Renewal & Support 2024', titleAr: 'تجديد تراخيص ودعم نظام تخطيط الموارد 2024', created: '2024-11-12', projectId: 'proj-001', department: 'IT & Digital Transformation', value: 'SAR 2.4M' },
  { id: 'rfp-2024-027', code: 'RFP-2024-027', title: 'Finance Module Implementation', titleAr: 'تطبيق الوحدة المالية', created: '2024-09-03', projectId: 'proj-001', department: 'IT & Digital Transformation', value: 'SAR 1.8M' },
  { id: 'rfp-2024-019', code: 'RFP-2024-019', title: 'HR & Payroll Module Rollout', titleAr: 'إطلاق وحدة الموارد البشرية والرواتب', created: '2024-06-18', projectId: 'proj-001', department: 'Human Capital', value: 'SAR 1.1M' },
  { id: 'rfp-2024-044', code: 'RFP-2024-044', title: 'Integration Platform Upgrade', titleAr: 'ترقية منصة التكامل', created: '2024-10-21', projectId: 'proj-002', department: 'IT & Digital Transformation', value: 'SAR 960K' },
  { id: 'rfp-2024-038', code: 'RFP-2024-038', title: 'Data Center Network Refresh', titleAr: 'تحديث شبكة مركز البيانات', created: '2024-08-14', projectId: 'proj-002', department: 'IT & Digital Transformation', value: 'SAR 1.5M' },
  { id: 'rfp-2024-047', code: 'RFP-2024-047', title: 'Citizen Services Mobile App', titleAr: 'تطبيق الخدمات الرقمية للجوال', created: '2024-10-02', projectId: 'proj-003', department: 'Digital Transformation Committee', value: 'SAR 1.3M' },
  { id: 'rfp-2024-033', code: 'RFP-2024-033', title: 'Portal Hosting & Managed Services', titleAr: 'استضافة البوابة والخدمات المدارة', created: '2024-07-09', projectId: 'proj-003', department: 'Digital Transformation Committee', value: 'SAR 720K' },
  { id: 'rfp-2024-049', code: 'RFP-2024-049', title: 'Accounts Payable Automation', titleAr: 'أتمتة الحسابات الدائنة', created: '2024-10-16', projectId: 'proj-101', department: 'Finance & Accounting', value: 'SAR 640K' },
  { id: 'rfp-2024-036', code: 'RFP-2024-036', title: 'Treasury Management System', titleAr: 'نظام إدارة الخزينة', created: '2024-07-30', projectId: 'proj-101', department: 'Finance & Accounting', value: 'SAR 880K' },
  { id: 'rfp-2024-051', code: 'RFP-2024-051', title: 'Executive Office Renovation', titleAr: 'تجديد المكاتب التنفيذية', created: '2024-10-28', projectId: 'proj-401', department: 'Facilities & General Services', value: 'SAR 1.2M' },
  { id: 'rfp-2024-042', code: 'RFP-2024-042', title: 'Headquarters Deep Cleaning Services', titleAr: 'خدمات التنظيف الشامل للمقر الرئيسي', created: '2024-10-11', projectId: 'proj-401', department: 'Facilities & General Services', value: 'SAR 310K' },
  { id: 'rfp-2024-052', code: 'RFP-2024-052', title: 'Regional Office Fit-Out - Jeddah', titleAr: 'تجهيز المكتب الإقليمي - جدة', created: '2024-09-28', projectId: 'proj-401', department: 'Facilities & General Services', value: 'SAR 2.0M' },
  { id: 'rfp-2023-088', code: 'RFP-2023-088', title: 'Cybersecurity Operations Center', titleAr: 'مركز عمليات الأمن السيبراني', created: '2023-12-05', projectId: 'proj-other', department: 'Cybersecurity Office', value: 'SAR 3.1M' },
  { id: 'rfp-2023-074', code: 'RFP-2023-074', title: 'Strategy Office Advisory Services', titleAr: 'الخدمات الاستشارية لمكتب الاستراتيجية', created: '2023-10-19', projectId: 'proj-other', department: 'Strategy & Performance', value: 'SAR 1.4M' },
];

export function rfpsForProject(projectId: string): PastRfp[] {
  return PAST_RFPS.filter((r) => r.projectId === projectId).sort((a, b) => b.created.localeCompare(a.created));
}

export function formatRfpDate(iso: string, isAr: boolean): string {
  const d = new Date(iso + 'T00:00:00');
  return new Intl.DateTimeFormat(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

const UNIT_BY_TYPE: Record<ProjectItemType, string> = { assets: 'Each', services: 'Service', consumables: 'Package' };

/** Everything an import fills in, for the project the user has chosen. */
export function buildRfpImport(rfp: PastRfp, form: TenderFormData): Partial<TenderFormData> {
  const id = () => crypto.randomUUID();
  const project = PROJECTS.find((p) => p.id === form.projectId);
  const chosen = form.selectedProjectItemIds ?? [];
  const items = (project?.items ?? []).filter((it) => chosen.length === 0 || chosen.includes(it.id));
  const itemNames = new Set(items.map((i) => i.name));

  // BOQ: the past RFP's lines for the chosen project items; one starter line per item otherwise.
  const sampleRows = AI_BOQ_ROWS.filter((r) => itemNames.has(r.projectItem));
  const boqItems: BOQRow[] = sampleRows.length > 0
    ? sampleRows.map((r) => ({ id: id(), ...r, hasBrandName: false, brandJustification: '' }))
    : items.map((it) => ({
        id: id(), projectItem: it.name, itemName: it.name, itemDescription: `As per ${rfp.code}`,
        unitOfMeasure: UNIT_BY_TYPE[it.type], quantity: 1, unitPrice: '', deliveryDate: '', hasBrandName: false, brandJustification: '',
      }));

  return {
    scopeOfWork: AI_SCOPE,
    scopeTerms: AI_TERMS,
    boqItems,
    executionLocation: 'Riyadh – SIDF Head Office',
    startDate: '2025-11-01',
    contractDurationType: 'months',
    contractDuration: '18',
    deliverables: AI_DELIVERABLES.map((d) => ({ id: id(), ...d })),
    paymentStages: AI_STAGES.map((s) => ({ id: id(), ...s })),
    technicalDocumentsList: [...AI_TECH_DOCS],
    technicalRequirements: AI_TECH_REQUIREMENTS.map((r) => ({ id: id(), ...r })),
    evaluationCriteria: AI_EVAL_CRITERIA.map((c) => ({ id: id(), ...c })),
    technicalPassingPercentage: '70',
  };
}

/** Sections an import fills, for the confirmation message. */
export const IMPORTED_SECTIONS_EN = ['Scope of Work', 'Bill of Quantities', 'Deliverables', 'Payment Schedule', 'Technical Evaluation'];
export const IMPORTED_SECTIONS_AR = ['نطاق العمل', 'جدول الكميات', 'المخرجات', 'جدول الدفعات', 'التقييم الفني'];
