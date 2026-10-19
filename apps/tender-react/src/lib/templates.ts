// v3 — standard templates Procurement applies by hand (no AI decides the values).
import type { PaymentStageRow, EvalCriterionRow, QualMainCriteria } from '../types/tender';

export interface PaymentTemplate { id: string; en: string; ar: string; descEn: string; descAr: string; stages: Omit<PaymentStageRow, 'id' | 'startDate'>[] }

export const PAYMENT_TEMPLATES: PaymentTemplate[] = [
  {
    id: 'technology', en: 'Technology project', ar: 'مشروع تقني', descEn: '5 milestones from kickoff to go-live', descAr: '5 مراحل من الانطلاق إلى التشغيل',
    stages: [
      { stageName: 'Contract signing & kickoff', itemsDeliverables: 'Project charter, kickoff minutes', duration: '30 days', percentage: 15 },
      { stageName: 'Design approval', itemsDeliverables: 'Solution and integration design', duration: '45 days', percentage: 20 },
      { stageName: 'Build & configuration', itemsDeliverables: 'Configured system in staging, data migration', duration: '60 days', percentage: 25 },
      { stageName: 'UAT sign-off', itemsDeliverables: 'UAT certificate, defect log', duration: '30 days', percentage: 20 },
      { stageName: 'Go-live & training', itemsDeliverables: 'Production go-live, training records', duration: '30 days', percentage: 20 },
    ],
  },
  {
    id: 'consultancy', en: 'Consultancy', ar: 'استشارات', descEn: 'Inception, interim and final reports', descAr: 'تقرير البداية والمرحلي والنهائي',
    stages: [
      { stageName: 'Inception report', itemsDeliverables: 'Work plan, inception report', duration: '30 days', percentage: 20 },
      { stageName: 'Interim report', itemsDeliverables: 'Findings and interim recommendations', duration: '60 days', percentage: 40 },
      { stageName: 'Final report', itemsDeliverables: 'Final report and handover', duration: '30 days', percentage: 40 },
    ],
  },
  {
    id: 'general', en: 'Goods & supply', ar: 'توريد سلع', descEn: 'Delivery, then acceptance', descAr: 'التسليم ثم القبول',
    stages: [
      { stageName: 'Delivery', itemsDeliverables: 'Goods delivered to site', duration: '45 days', percentage: 70 },
      { stageName: 'Acceptance', itemsDeliverables: 'Inspection and acceptance certificate', duration: '15 days', percentage: 30 },
    ],
  },
];

/* ── Evaluation & qualification templates ─────────────────────────────────── */

export interface EvalTemplate { id: string; en: string; ar: string; descEn: string; descAr: string; passing: string; criteria: Omit<EvalCriterionRow, 'id'>[] }
export const EVAL_TEMPLATES: EvalTemplate[] = [
  { id: 'technology', en: 'Technology project', ar: 'مشروع تقني', descEn: 'Approach, team, delivery plan, support · pass 70%', descAr: 'المنهجية والفريق والخطة والدعم · النجاح 70%', passing: '70', criteria: [
    { description: 'Technical approach & methodology', howApplied: 'Clarity of methodology, risk handling and fit to requirements.', weight: 30 },
    { description: 'Team qualifications & experience', howApplied: 'CVs, certifications and similar projects delivered.', weight: 25 },
    { description: 'Implementation plan & timeline', howApplied: 'Realism of the plan and alignment with the contract duration.', weight: 20 },
    { description: 'Quality of sample deliverables', howApplied: 'Samples of comparable scope and complexity.', weight: 15 },
    { description: 'Support & warranty model', howApplied: 'Support levels, response times and escalation.', weight: 10 },
  ] },
  { id: 'consultancy', en: 'Consultancy', ar: 'استشارات', descEn: 'Understanding, method, team · pass 75%', descAr: 'الفهم والمنهجية والفريق · النجاح 75%', passing: '75', criteria: [
    { description: 'Understanding of the assignment', howApplied: 'How well the proposal reflects the scope and context.', weight: 30 },
    { description: 'Methodology & work plan', howApplied: 'Soundness of approach, activities and timeline.', weight: 35 },
    { description: 'Key experts', howApplied: 'Qualifications and relevant experience of the proposed experts.', weight: 35 },
  ] },
  { id: 'general', en: 'Goods & supply', ar: 'توريد سلع', descEn: 'Compliance, delivery, warranty · pass 60%', descAr: 'المطابقة والتسليم والضمان · النجاح 60%', passing: '60', criteria: [
    { description: 'Compliance with specifications', howApplied: 'Datasheets and samples against the BOQ specifications.', weight: 50 },
    { description: 'Delivery schedule', howApplied: 'Committed delivery dates and logistics.', weight: 30 },
    { description: 'Warranty & after-sales service', howApplied: 'Warranty period and service coverage.', weight: 20 },
  ] },
];

export interface QualTemplate { id: string; en: string; ar: string; descEn: string; descAr: string; criteria: QualMainCriteria[] }
const q = (id: string, name: string, nameAr: string, percentage: number, subs: [string, string, string, number][]): QualMainCriteria => ({
  id, name, nameAr, percentage, subCriteria: subs.map(([n, ar, range, p], i) => ({ id: `${id}-${i}`, name: n, nameAr: ar, range, percentage: p })),
});
export const QUAL_TEMPLATES: QualTemplate[] = [
  { id: 'standard', en: 'Standard thresholds', ar: 'الحدود القياسية', descEn: 'Experience 50% · obligations 20% · people 30%', descAr: 'الخبرة 50% · الالتزامات 20% · الموارد 30%', criteria: [
    q('qm-1', 'Previous Experience', 'الخبرة السابقة', 50, [['Number of years of experience', 'عدد سنوات الخبرة', '5+ years', 40], ['Number of projects (last 3 years)', 'عدد المشاريع خلال 3 سنوات', '3+ projects', 30], ['Total value of projects (last 3 years)', 'إجمالي قيمة المشاريع خلال 3 سنوات', 'SAR 5M+', 30]]),
    q('qm-2', 'Existing Contractual Obligations', 'الالتزامات التعاقدية القائمة', 20, [['Number of existing projects', 'عدد المشاريع القائمة', 'Up to 5', 50], ['Value of existing projects', 'قيمة المشاريع القائمة', 'Up to SAR 20M', 50]]),
    q('qm-3', 'Human Resources', 'الموارد البشرية', 30, [['Number of employees', 'عدد الموظفين', '50+', 50], ['Percentage of Saudi employees', 'نسبة الموظفين السعوديين', '30%+', 50]]),
  ] },
  { id: 'large', en: 'Large contracts (SAR 5M+)', ar: 'العقود الكبيرة', descEn: 'Higher experience and capacity thresholds', descAr: 'حدود أعلى للخبرة والقدرة', criteria: [
    q('qm-1', 'Previous Experience', 'الخبرة السابقة', 50, [['Number of years of experience', 'عدد سنوات الخبرة', '10+ years', 40], ['Number of projects (last 3 years)', 'عدد المشاريع خلال 3 سنوات', '5+ projects', 30], ['Total value of projects (last 3 years)', 'إجمالي قيمة المشاريع خلال 3 سنوات', 'SAR 20M+', 30]]),
    q('qm-2', 'Existing Contractual Obligations', 'الالتزامات التعاقدية القائمة', 20, [['Number of existing projects', 'عدد المشاريع القائمة', 'Up to 8', 50], ['Value of existing projects', 'قيمة المشاريع القائمة', 'Up to SAR 50M', 50]]),
    q('qm-3', 'Human Resources', 'الموارد البشرية', 30, [['Number of employees', 'عدد الموظفين', '150+', 50], ['Percentage of Saudi employees', 'نسبة الموظفين السعوديين', '35%+', 50]]),
  ] },
];
