// Munafasat Inbox — realistic seed data for a Saudi public-sector P2P environment.
// Deterministic mock: dates are offsets from load time so Overdue/Due-soon stay meaningful.
// This is demonstration data only — nothing here is persisted or connected to SAP.

import type { Person, Task, RfpDetail, TrailStep } from './types';

const DAY = 86400000;
const base = Date.now();
const iso = (days: number, hour = 10) => {
  const d = new Date(base + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// ── People ───────────────────────────────────────────────────────────────────
export const ME: Person = {
  id: 'u-me', name: 'Mohammed Al-Harbi', nameAr: 'محمد الحربي',
  role: 'Senior Procurement Specialist', roleAr: 'أخصائي مشتريات أول', dept: 'Procurement', deptAr: 'المشتريات',
};
const P = {
  sara:    { id: 'u-sara', name: 'Sara Al-Zahrani', nameAr: 'سارة الزهراني', role: 'IT Reviewer', roleAr: 'مراجع تقنية المعلومات', dept: 'IT', deptAr: 'تقنية المعلومات' },
  khalid:  { id: 'u-khalid', name: 'Khalid Al-Otaibi', nameAr: 'خالد العتيبي', role: 'Finance Analyst', roleAr: 'محلل مالي', dept: 'Finance', deptAr: 'المالية' },
  noura:   { id: 'u-noura', name: 'Noura Al-Shamrani', nameAr: 'نورة الشمراني', role: 'Information Security Officer', roleAr: 'مسؤول أمن المعلومات', dept: 'Information Security', deptAr: 'أمن المعلومات' },
  abdullah:{ id: 'u-abdullah', name: 'Abdullah Al-Qahtani', nameAr: 'عبدالله القحطاني', role: 'Procurement Director', roleAr: 'مدير المشتريات', dept: 'Procurement', deptAr: 'المشتريات' },
  faisal:  { id: 'u-faisal', name: 'Faisal Al-Dossari', nameAr: 'فيصل الدوسري', role: 'Department Manager', roleAr: 'مدير إدارة', dept: 'Operations', deptAr: 'العمليات' },
  hana:    { id: 'u-hana', name: 'Hana Al-Ghamdi', nameAr: 'هناء الغامدي', role: 'Procurement Lead', roleAr: 'رئيس فريق المشتريات', dept: 'Procurement', deptAr: 'المشتريات' },
  omar:    { id: 'u-omar', name: 'Omar Al-Harthy', nameAr: 'عمر الحارثي', role: 'Requester', roleAr: 'مُقدّم الطلب', dept: 'IT', deptAr: 'تقنية المعلومات' },
} as const;

const sup = (en: string, ar: string) => ({ en, ar });

// ── Tasks ────────────────────────────────────────────────────────────────────
export const SEED_TASKS: Task[] = [
  // Scenario A — Purchase Request Approval (needs my action)
  {
    id: 'TSK-4101', type: 'approval',
    titleEn: 'Approve Purchase Request', titleAr: 'اعتماد طلب شراء',
    summaryEn: 'PR for 25 engineering laptops and docking stations for the new delivery team.',
    summaryAr: 'طلب شراء 25 حاسوباً محمولاً هندسياً ومحطات إرساء لفريق التسليم الجديد.',
    state: 'available', priority: 'high',
    entity: { kind: 'PR', ref: 'PR-2026-118', titleEn: 'Engineering Laptops & Docks', titleAr: 'حواسيب ومحطات إرساء هندسية' },
    supplier: sup('Jarir Marketing Co.', 'شركة جرير للتسويق'),
    project: sup('Delivery Team Expansion', 'توسعة فريق التسليم'),
    amount: 487500, requester: P.faisal, assignee: ME, department: sup('Operations', 'العمليات'),
    stageEn: 'Pending Manager Approval', stageAr: 'بانتظار موافقة المدير',
    receivedAt: iso(-1), dueAt: iso(2), mineAction: true, requireReasonOnReject: true,
    approvalRecord: [
      { label: sup('Request value', 'قيمة الطلب'), value: 'SAR 487,500.00', emphasis: true },
      { label: sup('Cost center', 'مركز التكلفة'), value: 'OPS-DELIV-01' },
      { label: sup('Budget remaining', 'الميزانية المتبقية'), value: 'SAR 1,240,000.00' },
      { label: sup('Project', 'المشروع'), value: 'Delivery Team Expansion' },
      { label: sup('Items', 'البنود'), value: '25 × Laptop, 25 × Docking station' },
    ],
    priorApprovals: [{ name: 'Faisal Al-Dossari', at: iso(-1, 9), decision: 'Raised' }],
    activity: [
      { id: 'a1', kind: 'system', actor: P.faisal, at: iso(-1, 9), system: sup('Purchase Request submitted', 'تم تقديم طلب الشراء') },
      { id: 'a2', kind: 'system', actor: ME, at: iso(-1, 9), system: sup('Assigned to you for approval', 'تم إسناده إليك للاعتماد') },
    ],
  },

  // Approve Purchase Order
  {
    id: 'TSK-4102', type: 'approval',
    titleEn: 'Approve Purchase Order', titleAr: 'اعتماد أمر شراء',
    summaryEn: 'PO issued to the awarded supplier for managed network switches.',
    summaryAr: 'أمر شراء صادر للمورّد الفائز لمحوّلات الشبكة المُدارة.',
    state: 'available', priority: 'medium',
    entity: { kind: 'PO', ref: 'PO-2026-061', titleEn: 'Managed Network Switches', titleAr: 'محوّلات شبكة مُدارة' },
    supplier: sup('Almasa IT Distribution', 'شركة الماسة لتوزيع التقنية'),
    amount: 212000, requester: P.hana, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'PO Approval', stageAr: 'اعتماد أمر الشراء',
    receivedAt: iso(0, 8), dueAt: iso(3), mineAction: true, requireReasonOnReject: true,
    approvalRecord: [
      { label: sup('PO value', 'قيمة أمر الشراء'), value: 'SAR 212,000.00', emphasis: true },
      { label: sup('Supplier', 'المورّد'), value: 'Almasa IT Distribution' },
      { label: sup('Linked RFP', 'المنافسة المرتبطة'), value: 'RFP-2026-033' },
      { label: sup('Delivery', 'التسليم'), value: '30 days from PO' },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(0, 8), system: sup('PO generated from award', 'تم إنشاء أمر الشراء من الترسية') }],
  },

  // Approve Award Recommendation (urgent, large)
  {
    id: 'TSK-4103', type: 'approval',
    titleEn: 'Approve Award Recommendation', titleAr: 'اعتماد توصية الترسية',
    summaryEn: 'Award recommendation for the S/4HANA implementation tender after evaluation.',
    summaryAr: 'توصية ترسية منافسة تطبيق S/4HANA بعد اكتمال التقييم.',
    state: 'available', priority: 'urgent',
    entity: { kind: 'RFP', ref: 'RFP-2026-041', titleEn: 'SAP S/4HANA Implementation', titleAr: 'تطبيق SAP S/4HANA' },
    supplier: sup('Lean Business Services', 'شركة لين لخدمات الأعمال'),
    amount: 8650000, requester: P.hana, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'Award Approval (DoA)', stageAr: 'اعتماد الترسية (تفويض الصلاحيات)',
    receivedAt: iso(-2), dueAt: iso(1), mineAction: true, requireReasonOnReject: true,
    approvalRecord: [
      { label: sup('Recommended award', 'الترسية الموصى بها'), value: 'SAR 8,650,000.00', emphasis: true },
      { label: sup('Winning supplier', 'المورّد الفائز'), value: 'Lean Business Services' },
      { label: sup('Technical score', 'الدرجة الفنية'), value: '88.5 / 100' },
      { label: sup('Commercial rank', 'الترتيب التجاري'), value: '2 of 5 (best value)' },
      { label: sup('Evaluation committee', 'لجنة التقييم'), value: '5 members — consensus' },
    ],
    priorApprovals: [
      { name: 'Technical Committee', at: iso(-3, 14), decision: 'Evaluation complete' },
      { name: 'Hana Al-Ghamdi', at: iso(-2, 11), decision: 'Recommended' },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(-2, 11), system: sup('Award recommendation routed for approval', 'تم توجيه توصية الترسية للاعتماد') }],
  },

  // Scenario B — Software Procurement Review (IT review + checklist)
  {
    id: 'TSK-4110', type: 'review',
    titleEn: 'Review Software Procurement Requirements', titleAr: 'مراجعة متطلبات شراء البرمجيات',
    summaryEn: 'Validate the technical requirements for the endpoint security platform RFP before it is published.',
    summaryAr: 'التحقق من المتطلبات الفنية لمنافسة منصة أمن الأجهزة الطرفية قبل النشر.',
    state: 'available', priority: 'high',
    entity: { kind: 'RFP', ref: 'RFP-2026-052', titleEn: 'Endpoint Security Platform', titleAr: 'منصة أمن الأجهزة الطرفية' },
    requester: P.hana, assignee: ME, department: sup('Information Technology', 'تقنية المعلومات'),
    stageEn: 'Technical Requirements Review', stageAr: 'مراجعة المتطلبات الفنية',
    receivedAt: iso(-1, 13), dueAt: iso(2), mineAction: true,
    findingsLabel: sup('Review findings & recommendation', 'نتائج المراجعة والتوصية'),
    checklist: [
      { id: 'c1', label: sup('Technical specifications reviewed', 'تمت مراجعة المواصفات الفنية'), mandatory: true, kind: 'confirm', done: false },
      { id: 'c2', label: sup('Licensing model validated', 'تم التحقق من نموذج الترخيص'), mandatory: true, kind: 'yesno', done: false },
      { id: 'c3', label: sup('Architecture compatibility checked', 'تم فحص توافق المعمارية'), mandatory: true, kind: 'passfail', done: false },
      { id: 'c4', label: sup('Security requirements reviewed', 'تمت مراجعة متطلبات الأمن'), mandatory: true, kind: 'confirm', done: false },
      { id: 'c5', label: sup('Recommendation recorded', 'تم تسجيل التوصية'), mandatory: true, kind: 'decision', options: [sup('Approve for publishing', 'اعتماد للنشر'), sup('Needs changes', 'يحتاج تعديلات')], done: false },
      { id: 'c6', label: sup('Supporting evidence attached', 'تم إرفاق الأدلة الداعمة'), mandatory: false, evidenceRequired: true, kind: 'confirm', done: false },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(-1, 13), system: sup('IT review task created', 'تم إنشاء مهمة المراجعة التقنية') }],
  },

  // Scenario C — Parallel reviews on RFP-2026-060 (IT = mine, Finance + InfoSec = others)
  {
    id: 'TSK-4120', type: 'review', parallelGroup: 'pg-rfp060',
    titleEn: 'IT Review — Cloud Backup Services', titleAr: 'مراجعة تقنية المعلومات — خدمات النسخ الاحتياطي السحابي',
    summaryEn: 'Independent IT review running in parallel with Finance and Information Security.',
    summaryAr: 'مراجعة تقنية مستقلة تجري بالتوازي مع المالية وأمن المعلومات.',
    state: 'available', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-060', titleEn: 'Cloud Backup & DR Services', titleAr: 'خدمات النسخ الاحتياطي والتعافي السحابي' },
    requester: P.hana, assignee: ME, department: sup('Information Technology', 'تقنية المعلومات'),
    stageEn: 'Parallel Reviews', stageAr: 'المراجعات المتوازية',
    receivedAt: iso(0, 9), dueAt: iso(4), mineAction: true,
    joinNote: sup('Next stage starts when IT, Finance and Information Security reviews are all complete.', 'تبدأ المرحلة التالية عند اكتمال مراجعات تقنية المعلومات والمالية وأمن المعلومات جميعها.'),
    findingsLabel: sup('IT review notes', 'ملاحظات المراجعة التقنية'),
    checklist: [
      { id: 'c1', label: sup('Service architecture reviewed', 'تمت مراجعة معمارية الخدمة'), mandatory: true, kind: 'confirm', done: false },
      { id: 'c2', label: sup('RPO/RTO targets acceptable', 'أهداف RPO/RTO مقبولة'), mandatory: true, kind: 'yesno', done: false },
      { id: 'c3', label: sup('Integration approach confirmed', 'تم تأكيد منهجية التكامل'), mandatory: true, kind: 'passfail', done: false },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(0, 9), system: sup('Parallel review group opened (3 reviews)', 'تم فتح مجموعة المراجعات المتوازية (3 مراجعات)') }],
  },
  {
    id: 'TSK-4121', type: 'review', parallelGroup: 'pg-rfp060',
    titleEn: 'Finance Review — Cloud Backup Services', titleAr: 'مراجعة المالية — خدمات النسخ الاحتياطي السحابي',
    summaryEn: 'Finance review of the same RFP — owned by Khalid Al-Otaibi, visible to you as a watcher.',
    summaryAr: 'مراجعة مالية لنفس المنافسة — بعهدة خالد العتيبي، ظاهرة لك كمتابع.',
    state: 'waiting', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-060', titleEn: 'Cloud Backup & DR Services', titleAr: 'خدمات النسخ الاحتياطي والتعافي السحابي' },
    requester: P.hana, assignee: P.khalid, department: sup('Finance', 'المالية'),
    stageEn: 'Parallel Reviews', stageAr: 'المراجعات المتوازية',
    receivedAt: iso(0, 9), dueAt: iso(4), mineAction: false, initiatedByMe: true,
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(0, 9), system: sup('Assigned to Finance', 'تم الإسناد إلى المالية') }],
  },
  {
    id: 'TSK-4122', type: 'review', parallelGroup: 'pg-rfp060',
    titleEn: 'InfoSec Review — Cloud Backup Services', titleAr: 'مراجعة أمن المعلومات — خدمات النسخ الاحتياطي السحابي',
    summaryEn: 'Information Security review of the same RFP — owned by Noura Al-Shamrani.',
    summaryAr: 'مراجعة أمن المعلومات لنفس المنافسة — بعهدة نورة الشمراني.',
    state: 'in-progress', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-060', titleEn: 'Cloud Backup & DR Services', titleAr: 'خدمات النسخ الاحتياطي والتعافي السحابي' },
    requester: P.hana, assignee: P.noura, department: sup('Information Security', 'أمن المعلومات'),
    stageEn: 'Parallel Reviews', stageAr: 'المراجعات المتوازية',
    receivedAt: iso(0, 9), dueAt: iso(4), mineAction: false, initiatedByMe: true,
    activity: [{ id: 'a1', kind: 'system', actor: P.noura, at: iso(0, 15), system: sup('Review started', 'بدأت المراجعة') }],
  },

  // Scenario D — Technical Evaluation
  {
    id: 'TSK-4130', type: 'technical-evaluation',
    titleEn: 'Complete Technical Evaluation', titleAr: 'إكمال التقييم الفني',
    summaryEn: 'Score Lean Business Services against the weighted technical criteria for the S/4HANA tender.',
    summaryAr: 'تقييم شركة لين لخدمات الأعمال وفق معايير التقييم الفني المرجّحة لمنافسة S/4HANA.',
    state: 'available', priority: 'high',
    entity: { kind: 'RFP', ref: 'RFP-2026-041', titleEn: 'SAP S/4HANA Implementation', titleAr: 'تطبيق SAP S/4HANA' },
    supplier: sup('Lean Business Services', 'شركة لين لخدمات الأعمال'),
    requester: P.hana, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'Technical Evaluation', stageAr: 'التقييم الفني',
    receivedAt: iso(-1, 11), dueAt: iso(1), mineAction: true, passThreshold: 70,
    criteria: [
      { id: 'e1', label: sup('Methodology & implementation approach', 'المنهجية وأسلوب التطبيق'), weight: 30, max: 100, score: null },
      { id: 'e2', label: sup('Team qualifications & certifications', 'مؤهلات الفريق والشهادات'), weight: 25, max: 100, score: null },
      { id: 'e3', label: sup('Relevant experience (similar projects)', 'الخبرة ذات الصلة (مشاريع مماثلة)'), weight: 25, max: 100, score: null },
      { id: 'e4', label: sup('Support & SLA model', 'نموذج الدعم واتفاقية مستوى الخدمة'), weight: 20, max: 100, score: null },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(-1, 11), system: sup('Assigned as evaluation committee member', 'تم إسنادك كعضو في لجنة التقييم') }],
  },

  // Commercial Evaluation
  {
    id: 'TSK-4131', type: 'commercial-evaluation',
    titleEn: 'Review Commercial Bid', titleAr: 'مراجعة العرض التجاري',
    summaryEn: 'Review unit prices and totals for the technically-qualified suppliers after bid opening.',
    summaryAr: 'مراجعة أسعار الوحدات والإجماليات للموردين المؤهلين فنياً بعد فتح العروض.',
    state: 'available', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-041', titleEn: 'SAP S/4HANA Implementation', titleAr: 'تطبيق SAP S/4HANA' },
    supplier: sup('Lean Business Services', 'شركة لين لخدمات الأعمال'),
    requester: P.hana, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'Commercial Evaluation', stageAr: 'التقييم التجاري',
    receivedAt: iso(0, 10), dueAt: iso(3), mineAction: true, commercialReleased: true,
    commercialLines: [
      { id: 'l1', itemEn: 'Core implementation (FI/CO/MM/FM)', itemAr: 'التطبيق الأساسي (FI/CO/MM/FM)', qty: 1, unit: 'LS', unitPrice: 4200000 },
      { id: 'l2', itemEn: 'Embedded EWM module', itemAr: 'وحدة EWM المدمجة', qty: 1, unit: 'LS', unitPrice: 1650000 },
      { id: 'l3', itemEn: 'Data migration', itemAr: 'ترحيل البيانات', qty: 1, unit: 'LS', unitPrice: 900000 },
      { id: 'l4', itemEn: 'Training (per batch)', itemAr: 'التدريب (لكل دفعة)', qty: 6, unit: 'batch', unitPrice: 85000 },
      { id: 'l5', itemEn: 'Hypercare support (months)', itemAr: 'دعم ما بعد التشغيل (أشهر)', qty: 3, unit: 'mo', unitPrice: 130000 },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(0, 10), system: sup('Commercial envelope released for review', 'تم فتح المظروف التجاري للمراجعة') }],
  },

  // Validate Procurement Documents
  {
    id: 'TSK-4140', type: 'validation',
    titleEn: 'Validate Procurement Documents', titleAr: 'التحقق من مستندات الشراء',
    summaryEn: 'System-assisted validation of the tender document set before publishing.',
    summaryAr: 'تحقق مدعوم بالنظام من حزمة مستندات المنافسة قبل النشر.',
    state: 'available', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-052', titleEn: 'Endpoint Security Platform', titleAr: 'منصة أمن الأجهزة الطرفية' },
    requester: P.hana, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'Document Validation', stageAr: 'التحقق من المستندات',
    receivedAt: iso(0, 9), dueAt: iso(2), mineAction: true,
    validationChecks: [
      { id: 'v1', label: sup('Scope of work attached', 'إرفاق نطاق العمل'), current: 'Attached (12 pages)', expected: 'Required', outcome: 'pass' },
      { id: 'v2', label: sup('BOQ completeness', 'اكتمال جدول الكميات'), current: '38 line items', expected: '> 0 items', outcome: 'pass' },
      { id: 'v3', label: sup('Evaluation criteria defined', 'تعريف معايير التقييم'), current: 'Technical 70% / Commercial 30%', expected: 'Sum = 100%', outcome: 'pass' },
      { id: 'v4', label: sup('Qualification requirements set', 'تحديد متطلبات التأهيل'), current: 'Not set', expected: 'Required', outcome: 'fail', remediation: sup('Add qualification criteria in the RFP before publishing.', 'أضف معايير التأهيل في المنافسة قبل النشر.') },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: ME, at: iso(0, 9), system: sup('Automated checks executed', 'تم تنفيذ الفحوصات الآلية') }],
  },

  // Scenario F — Invoice Matching Exception
  {
    id: 'TSK-4141', type: 'validation',
    titleEn: 'Resolve Invoice Matching Exception', titleAr: 'معالجة استثناء مطابقة الفاتورة',
    summaryEn: 'Three-way match failed — invoiced quantity exceeds the received quantity on the PO.',
    summaryAr: 'فشلت المطابقة الثلاثية — الكمية المفوترة تتجاوز الكمية المستلمة في أمر الشراء.',
    state: 'available', priority: 'urgent',
    entity: { kind: 'INVOICE', ref: 'INV-2026-0338', titleEn: 'Supplier Invoice — Network Switches', titleAr: 'فاتورة مورّد — محوّلات شبكة' },
    supplier: sup('Almasa IT Distribution', 'شركة الماسة لتوزيع التقنية'),
    amount: 238000, requester: P.khalid, assignee: ME, department: sup('Finance', 'المالية'),
    stageEn: 'Invoice Validation', stageAr: 'التحقق من الفاتورة',
    receivedAt: iso(-1, 16), dueAt: iso(1), mineAction: true,
    validationChecks: [
      { id: 'v1', label: sup('Invoice ↔ PO price', 'سعر الفاتورة ↔ أمر الشراء'), current: 'SAR 1,000 / unit', expected: 'SAR 1,000 / unit', outcome: 'pass' },
      { id: 'v2', label: sup('Invoice ↔ GR quantity', 'كمية الفاتورة ↔ الاستلام'), current: '238 units', expected: '212 units received', outcome: 'fail', remediation: sup('Confirm the extra 26 units with a goods receipt, or return the invoice to the supplier for correction.', 'أكّد الـ26 وحدة الإضافية بإشعار استلام، أو أعد الفاتورة للمورّد للتصحيح.') },
      { id: 'v3', label: sup('Tax (15% VAT)', 'الضريبة (15%)'), current: 'SAR 31,043.48', expected: '15% of net', outcome: 'pass' },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.khalid, at: iso(-1, 16), system: sup('Three-way match exception raised', 'تم رفع استثناء المطابقة الثلاثية') }],
  },

  // Data collection — In Progress (started)
  {
    id: 'TSK-4150', type: 'data-collection',
    titleEn: 'Add Technical Specifications', titleAr: 'إضافة المواصفات الفنية',
    summaryEn: 'Provide the detailed technical specifications and budget details for the cloud backup RFP.',
    summaryAr: 'أدخل المواصفات الفنية التفصيلية وتفاصيل الميزانية لمنافسة النسخ الاحتياطي السحابي.',
    state: 'in-progress', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-060', titleEn: 'Cloud Backup & DR Services', titleAr: 'خدمات النسخ الاحتياطي والتعافي السحابي' },
    requester: P.hana, assignee: ME, department: sup('Information Technology', 'تقنية المعلومات'),
    stageEn: 'Requirements Data Collection', stageAr: 'جمع بيانات المتطلبات',
    receivedAt: iso(-2, 10), dueAt: iso(3), mineAction: true,
    fields: [
      { id: 'f0', label: sup('RFP title', 'عنوان المنافسة'), kind: 'text', existing: true, value: 'Cloud Backup & DR Services' },
      { id: 'f1', label: sup('Required storage capacity (TB)', 'سعة التخزين المطلوبة (تيرابايت)'), kind: 'number', required: true, value: 120 },
      { id: 'f2', label: sup('Recovery Point Objective', 'هدف نقطة الاسترجاع'), kind: 'select', required: true, options: [sup('15 minutes', '15 دقيقة'), sup('1 hour', 'ساعة واحدة'), sup('4 hours', '4 ساعات')], value: '1 hour' },
      { id: 'f3', label: sup('Data residency in KSA required', 'إقامة البيانات داخل المملكة مطلوبة'), kind: 'yesno', required: true, value: true },
      { id: 'f4', label: sup('Estimated annual budget (SAR)', 'الميزانية السنوية التقديرية (ر.س)'), kind: 'currency', required: true, value: null },
      { id: 'f5', label: sup('Technical notes', 'ملاحظات فنية'), kind: 'longtext', value: '', placeholder: sup('Any additional technical constraints…', 'أي قيود فنية إضافية…') },
      { id: 'f6', label: sup('Specification document', 'وثيقة المواصفات'), kind: 'file', required: true, value: null },
    ],
    activity: [
      { id: 'a1', kind: 'system', actor: P.hana, at: iso(-2, 10), system: sup('Data collection task assigned', 'تم إسناد مهمة جمع البيانات') },
      { id: 'a2', kind: 'system', actor: ME, at: iso(-1, 14), system: sup('Draft saved', 'تم حفظ المسودة') },
    ],
  },

  // Scenario E — Returned for Clarification
  {
    id: 'TSK-4160', type: 'clarification',
    titleEn: 'Resolve Returned Work — Purchase Request', titleAr: 'معالجة عمل مُعاد — طلب شراء',
    summaryEn: 'Procurement returned your PR submission: the cost center and a quotation are missing.',
    summaryAr: 'أعادت المشتريات طلب الشراء الخاص بك: مركز التكلفة وعرض السعر مفقودان.',
    state: 'returned', priority: 'high',
    entity: { kind: 'PR', ref: 'PR-2026-109', titleEn: 'Office Furniture — Onboarding Team', titleAr: 'أثاث مكتبي — فريق التهيئة' },
    requester: ME, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'Returned for Correction', stageAr: 'مُعاد للتصحيح',
    receivedAt: iso(-1, 12), dueAt: iso(1), mineAction: true, initiatedByMe: true,
    returnedBy: P.hana,
    returnReason: sup('The request cannot proceed without a valid cost center and at least one supplier quotation.', 'لا يمكن متابعة الطلب دون مركز تكلفة صحيح وعرض سعر واحد على الأقل من مورّد.'),
    returnIssues: [
      sup('Cost center is missing or invalid.', 'مركز التكلفة مفقود أو غير صحيح.'),
      sup('No supplier quotation attached.', 'لا يوجد عرض سعر مرفق من مورّد.'),
    ],
    originalValues: [
      { label: sup('Requested items', 'البنود المطلوبة'), value: '12 × Ergonomic chair, 6 × Desk' },
      { label: sup('Estimated value', 'القيمة التقديرية'), value: 'SAR 96,000.00' },
      { label: sup('Cost center (submitted)', 'مركز التكلفة (المُقدّم)'), value: '— (blank)' },
    ],
    activity: [
      { id: 'a1', kind: 'decision', actor: P.hana, at: iso(-1, 12), decision: sup('Returned for Correction', 'مُعاد للتصحيح'), text: 'Missing cost center and supplier quotation.' },
    ],
  },

  // Document Submission
  {
    id: 'TSK-4170', type: 'document-submission',
    titleEn: 'Submit Required Documents', titleAr: 'تقديم المستندات المطلوبة',
    summaryEn: 'Upload the signed contract documents and compliance certificates for the awarded supplier.',
    summaryAr: 'ارفع مستندات العقد الموقّعة وشهادات الامتثال للمورّد الفائز.',
    state: 'available', priority: 'medium',
    entity: { kind: 'CONTRACT', ref: 'CONTRACT-2026-014', titleEn: 'Managed Network Services Contract', titleAr: 'عقد خدمات الشبكة المُدارة' },
    supplier: sup('Almasa IT Distribution', 'شركة الماسة لتوزيع التقنية'),
    requester: P.hana, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'Contract Documentation', stageAr: 'توثيق العقد',
    receivedAt: iso(0, 11), dueAt: iso(5), mineAction: true,
    requiredDocs: [
      { id: 'd1', label: sup('Signed contract (all pages)', 'العقد الموقّع (كامل الصفحات)'), formats: 'PDF', mandatory: true, uploaded: null },
      { id: 'd2', label: sup('Valid CR certificate', 'شهادة السجل التجاري السارية'), formats: 'PDF, PNG', mandatory: true, uploaded: 'CR_Almasa_2026.pdf' },
      { id: 'd3', label: sup('Zakat & Tax certificate', 'شهادة الزكاة والضريبة'), formats: 'PDF', mandatory: true, uploaded: null },
      { id: 'd4', label: sup('Bank guarantee', 'الضمان البنكي'), formats: 'PDF', mandatory: false, uploaded: null },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(0, 11), system: sup('Document submission requested', 'تم طلب تقديم المستندات') }],
  },

  // Confirm Goods Receipt (review/checklist)
  {
    id: 'TSK-4171', type: 'review',
    titleEn: 'Confirm Goods Receipt', titleAr: 'تأكيد استلام البضائع',
    summaryEn: 'Confirm the delivered quantities and condition against the purchase order.',
    summaryAr: 'أكّد الكميات المسلّمة وحالتها مقابل أمر الشراء.',
    state: 'available', priority: 'low',
    entity: { kind: 'PO', ref: 'PO-2026-044', titleEn: 'Office Printers', titleAr: 'طابعات مكتبية' },
    supplier: sup('Jarir Marketing Co.', 'شركة جرير للتسويق'),
    requester: P.faisal, assignee: ME, department: sup('Operations', 'العمليات'),
    stageEn: 'Goods Receipt', stageAr: 'استلام البضائع',
    receivedAt: iso(0, 8), dueAt: iso(6), mineAction: true,
    findingsLabel: sup('Receipt notes', 'ملاحظات الاستلام'),
    checklist: [
      { id: 'c1', label: sup('Items received match the PO', 'البنود المستلمة تطابق أمر الشراء'), mandatory: true, kind: 'yesno', done: false },
      { id: 'c2', label: sup('Quantities correct (8 of 8)', 'الكميات صحيحة (8 من 8)'), mandatory: true, kind: 'confirm', done: false },
      { id: 'c3', label: sup('Condition acceptable', 'الحالة مقبولة'), mandatory: true, kind: 'passfail', done: false },
      { id: 'c4', label: sup('Delivery note attached', 'إشعار التسليم مرفق'), mandatory: false, evidenceRequired: true, kind: 'confirm', done: false },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.faisal, at: iso(0, 8), system: sup('Delivery recorded — confirmation requested', 'تم تسجيل التسليم — مطلوب التأكيد') }],
  },

  // Scenario H — Overdue Task
  {
    id: 'TSK-4180', type: 'approval',
    titleEn: 'Approve Budget Transfer', titleAr: 'اعتماد مناقلة ميزانية',
    summaryEn: 'Budget transfer between cost centers to fund the Q4 maintenance contract.',
    summaryAr: 'مناقلة ميزانية بين مراكز التكلفة لتمويل عقد الصيانة للربع الرابع.',
    state: 'available', priority: 'urgent',
    entity: { kind: 'PR', ref: 'BTR-2026-021', titleEn: 'Budget Transfer — Q4 Maintenance', titleAr: 'مناقلة ميزانية — صيانة الربع الرابع' },
    amount: 650000, requester: P.khalid, assignee: ME, department: sup('Finance', 'المالية'),
    stageEn: 'Budget Transfer Approval', stageAr: 'اعتماد مناقلة الميزانية',
    receivedAt: iso(-6), dueAt: iso(-2), mineAction: true, requireReasonOnReject: true,
    approvalRecord: [
      { label: sup('Transfer amount', 'مبلغ المناقلة'), value: 'SAR 650,000.00', emphasis: true },
      { label: sup('From', 'من'), value: 'FIN-CAPEX-02' },
      { label: sup('To', 'إلى'), value: 'FIN-MAINT-04' },
      { label: sup('Justification', 'المبرر'), value: 'Fund the Q4 preventive maintenance contract.' },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.khalid, at: iso(-6, 9), system: sup('Budget transfer submitted', 'تم تقديم مناقلة الميزانية') }],
  },

  // Sent / Waiting on others (I submitted, pending manager)
  {
    id: 'TSK-4190', type: 'approval',
    titleEn: 'Purchase Request — Awaiting Manager Approval', titleAr: 'طلب شراء — بانتظار موافقة المدير',
    summaryEn: 'Your PR for test & measurement equipment is awaiting your manager’s approval.',
    summaryAr: 'طلب الشراء الخاص بك لأجهزة الاختبار والقياس بانتظار موافقة مديرك.',
    state: 'waiting', priority: 'medium',
    entity: { kind: 'PR', ref: 'PR-2026-121', titleEn: 'Test & Measurement Equipment', titleAr: 'أجهزة اختبار وقياس' },
    amount: 158000, requester: ME, assignee: P.faisal, department: sup('Operations', 'العمليات'),
    stageEn: 'Pending Manager Approval', stageAr: 'بانتظار موافقة المدير',
    receivedAt: iso(-1, 10), dueAt: iso(2), mineAction: false, initiatedByMe: true,
    activity: [{ id: 'a1', kind: 'system', actor: ME, at: iso(-1, 10), system: sup('Submitted for approval', 'تم التقديم للاعتماد') }],
  },

  // Serial dependency — unlocks after the IT review (TSK-4110) completes
  {
    id: 'TSK-4191', type: 'validation',
    titleEn: 'Procurement Validation & Routing', titleAr: 'التحقق والتوجيه من المشتريات',
    summaryEn: 'Validate and route the endpoint security RFP after the IT requirements review is complete.',
    summaryAr: 'التحقق من منافسة أمن الأجهزة الطرفية وتوجيهها بعد اكتمال مراجعة المتطلبات التقنية.',
    state: 'available', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-052', titleEn: 'Endpoint Security Platform', titleAr: 'منصة أمن الأجهزة الطرفية' },
    requester: P.hana, assignee: ME, department: sup('Procurement', 'المشتريات'),
    stageEn: 'Procurement Validation', stageAr: 'تحقق المشتريات',
    receivedAt: iso(-1, 13), dueAt: iso(4), mineAction: true,
    dependsOn: ['TSK-4110'],
    joinNote: sup('Becomes actionable once the IT requirements review (TSK-4110) is complete.', 'تصبح قابلة للتنفيذ بعد اكتمال مراجعة المتطلبات التقنية (TSK-4110).'),
    validationChecks: [
      { id: 'v1', label: sup('IT review complete', 'اكتمال المراجعة التقنية'), current: 'Pending', expected: 'Complete', outcome: 'pending' },
      { id: 'v2', label: sup('Budget availability confirmed', 'تأكيد توفر الميزانية'), current: 'SAR 1,500,000 available', expected: '≥ estimate', outcome: 'pass' },
    ],
    activity: [{ id: 'a1', kind: 'system', actor: P.hana, at: iso(-1, 13), system: sup('Task waiting on prior step', 'المهمة بانتظار الخطوة السابقة') }],
  },

  // Completed tasks (history)
  {
    id: 'TSK-4080', type: 'approval',
    titleEn: 'Approve Purchase Request', titleAr: 'اعتماد طلب شراء',
    summaryEn: 'PR for quarterly office consumables — approved.',
    summaryAr: 'طلب شراء مستلزمات مكتبية ربع سنوية — تم الاعتماد.',
    state: 'completed', priority: 'low',
    entity: { kind: 'PR', ref: 'PR-2026-097', titleEn: 'Quarterly Office Consumables', titleAr: 'مستلزمات مكتبية ربع سنوية' },
    amount: 42000, requester: P.faisal, assignee: ME, department: sup('Operations', 'العمليات'),
    stageEn: 'Completed', stageAr: 'مكتمل',
    receivedAt: iso(-8), dueAt: iso(-5), completedAt: iso(-6, 15), mineAction: false,
    decision: sup('Approved', 'تم الاعتماد'),
    activity: [
      { id: 'a1', kind: 'system', actor: P.faisal, at: iso(-8, 9), system: sup('Submitted', 'تم التقديم') },
      { id: 'a2', kind: 'decision', actor: ME, at: iso(-6, 15), decision: sup('Approved', 'تم الاعتماد'), text: 'Within budget, approved.' },
    ],
  },
  {
    id: 'TSK-4081', type: 'review',
    titleEn: 'Finance Review — Fleet Lease', titleAr: 'مراجعة المالية — تأجير أسطول',
    summaryEn: 'Finance review of the vehicle lease RFP — completed with recommendation.',
    summaryAr: 'مراجعة مالية لمنافسة تأجير المركبات — اكتملت مع توصية.',
    state: 'completed', priority: 'medium',
    entity: { kind: 'RFP', ref: 'RFP-2026-029', titleEn: 'Vehicle Fleet Lease', titleAr: 'تأجير أسطول مركبات' },
    requester: P.hana, assignee: ME, department: sup('Finance', 'المالية'),
    stageEn: 'Completed', stageAr: 'مكتمل',
    receivedAt: iso(-10), dueAt: iso(-7), completedAt: iso(-7, 12), mineAction: false,
    decision: sup('Review Complete', 'اكتملت المراجعة'),
    activity: [{ id: 'a1', kind: 'decision', actor: ME, at: iso(-7, 12), decision: sup('Review Complete', 'اكتملت المراجعة'), text: 'No financial objections.' }],
  },
];

// ── RFP / request detail + workflow trail ─────────────────────────────────────
const SLA_BY_PRIORITY: Record<Task['priority'], number> = { urgent: 24, high: 48, medium: 72, low: 120 };

// Hero request: the PR a department manager is approving (TSK-4101).
const PR_LAPTOPS: RfpDetail = {
  refId: 'PR-2026-118',
  titleEn: 'Engineering Laptops & Docking Stations', titleAr: 'حواسيب ومحطات إرساء هندسية',
  summaryEn: 'Equip the newly-formed delivery team with 25 engineering laptops and docking stations so they can start on schedule.',
  summaryAr: 'تجهيز فريق التسليم الجديد بـ 25 حاسوباً محمولاً هندسياً ومحطات إرساء لبدء العمل في موعده.',
  meta: [
    { label: { en: 'Project', ar: 'المشروع' }, value: 'Delivery Team Expansion' },
    { label: { en: 'Requesting department', ar: 'الإدارة الطالبة' }, value: 'Operations — Delivery' },
    { label: { en: 'Cost center', ar: 'مركز التكلفة' }, value: 'OPS-DELIV-01' },
    { label: { en: 'Budget line', ar: 'بند الميزانية' }, value: 'CAPEX · IT Hardware' },
    { label: { en: 'Budget remaining', ar: 'الميزانية المتبقية' }, value: 'SAR 1,240,000.00', dir: 'ltr' },
    { label: { en: 'Request value', ar: 'قيمة الطلب' }, value: 'SAR 487,500.00', dir: 'ltr' },
    { label: { en: 'Procurement route', ar: 'مسار الشراء' }, value: 'Etimad E-Market' },
    { label: { en: 'Required by', ar: 'مطلوب بتاريخ' }, value: '15 Dec 2026', dir: 'ltr' },
    { label: { en: 'Delivery location', ar: 'موقع التسليم' }, value: 'Riyadh HQ — IT Store, B2' },
  ],
  scopeEn: 'Supply, deliver and commission 25 engineering-grade laptops (min. 32GB RAM, 1TB SSD) and 25 USB-C docking stations for the Delivery Team Expansion. Devices must be enrolled in the corporate MDM, imaged with the standard engineering build, and delivered to the Riyadh HQ within 30 days of PO issuance.',
  scopeAr: 'توريد وتسليم وتشغيل 25 حاسوباً محمولاً من الفئة الهندسية (32 جيجابايت رام و1 تيرابايت تخزين كحد أدنى) و25 محطة إرساء USB-C لتوسعة فريق التسليم. يجب تسجيل الأجهزة في نظام إدارة الأجهزة المؤسسي وتجهيزها بالصورة القياسية وتسليمها للمقر الرئيسي بالرياض خلال 30 يوماً من إصدار أمر الشراء.',
  scopeBlocks: [
    { headEn: 'Objectives', headAr: 'الأهداف',
      itemsEn: ['Get the 25-person delivery team productive from day one', 'Standardise on one engineering hardware build', 'Keep total cost within the approved CAPEX line'],
      itemsAr: ['تمكين فريق التسليم (25 موظفاً) من العمل منذ اليوم الأول', 'توحيد مواصفات الأجهزة الهندسية', 'الالتزام ببند الميزانية الرأسمالية المعتمد'] },
    { headEn: 'In scope', headAr: 'ضمن النطاق',
      itemsEn: ['Supply of 25 laptops, 25 docking stations and accessories', 'Imaging with the corporate engineering build and MDM enrolment', 'Delivery, asset tagging and handover at Riyadh HQ', '3-year next-business-day onsite warranty'],
      itemsAr: ['توريد 25 حاسوباً و25 محطة إرساء وملحقاتها', 'تجهيز الصورة القياسية والتسجيل في نظام إدارة الأجهزة', 'التسليم ووسم الأصول والتسليم في المقر الرئيسي', 'ضمان في الموقع لمدة 3 سنوات (يوم العمل التالي)'] },
    { headEn: 'Out of scope', headAr: 'خارج النطاق',
      itemsEn: ['Software licences (covered by the enterprise agreement)', 'Monitors and peripherals beyond the docking station'],
      itemsAr: ['تراخيص البرمجيات (مشمولة بالاتفاقية المؤسسية)', 'الشاشات والملحقات الإضافية'] },
    { headEn: 'Deliverables & timeline', headAr: 'المخرجات والجدول الزمني',
      itemsEn: ['Devices delivered within 30 days of PO', 'Imaging & enrolment report per serial number', 'Warranty certificates registered to the entity'],
      itemsAr: ['تسليم الأجهزة خلال 30 يوماً من أمر الشراء', 'تقرير التجهيز والتسجيل لكل رقم تسلسلي', 'شهادات ضمان مسجلة باسم الجهة'] },
  ],
  boq: [
    { itemEn: 'Engineering laptop (32GB/1TB)', itemAr: 'حاسوب محمول هندسي (32/1000)', qty: '25', unit: 'Each', unitPrice: 15600, descEn: 'Intel Core Ultra 7, 32GB RAM, 1TB NVMe, 16" 2.5K display, Windows 11 Pro', descAr: 'معالج Core Ultra 7، ذاكرة 32 جيجابايت، تخزين 1 تيرابايت، شاشة 16 بوصة', budgetEn: 'IT Hardware', budgetAr: 'أجهزة تقنية', category: 'Material', delivery: '2026-12-15' },
    { itemEn: 'USB-C docking station', itemAr: 'محطة إرساء USB-C', qty: '25', unit: 'Each', unitPrice: 1800, descEn: 'Thunderbolt 4 dock, dual 4K output, 100W power delivery', descAr: 'محطة Thunderbolt 4 بمخرجين 4K وشحن 100 واط', budgetEn: 'IT Hardware', budgetAr: 'أجهزة تقنية', category: 'Material', delivery: '2026-12-15' },
    { itemEn: '3-year onsite warranty', itemAr: 'ضمان في الموقع 3 سنوات', qty: '25', unit: 'Each', unitPrice: 950, descEn: 'Next-business-day onsite, accidental damage cover', descAr: 'دعم في الموقع خلال يوم العمل التالي مع تغطية الأضرار العرضية', budgetEn: 'IT Support', budgetAr: 'الدعم التقني', category: 'Service', delivery: '2026-12-15' },
    { itemEn: 'Imaging & MDM enrolment', itemAr: 'تجهيز الصورة والتسجيل في نظام إدارة الأجهزة', qty: '25', unit: 'Each', unitPrice: 800, descEn: 'Corporate engineering image, BitLocker, Intune enrolment, asset tagging', descAr: 'الصورة الهندسية المؤسسية والتشفير والتسجيل ووسم الأصول', budgetEn: 'IT Support', budgetAr: 'الدعم التقني', category: 'Service', delivery: '2026-12-15' },
    { itemEn: 'Laptop backpack & accessories', itemAr: 'حقيبة وملحقات الحاسوب', qty: '25', unit: 'Each', unitPrice: 350, descEn: 'Padded backpack, wireless mouse, USB-C travel charger', descAr: 'حقيبة مبطنة وفأرة لاسلكية وشاحن سفر', budgetEn: 'IT Hardware', budgetAr: 'أجهزة تقنية', category: 'Material', delivery: '2026-12-15' },
  ],
  payment: [
    { stageEn: 'On delivery & acceptance', stageAr: 'عند التسليم والقبول', pct: 80, descEn: 'All devices delivered, imaged and accepted by IT', descAr: 'تسليم جميع الأجهزة وتجهيزها وقبولها من تقنية المعلومات', due: 'Week 5', dueAr: 'الأسبوع 5' },
    { stageEn: 'After 30-day burn-in', stageAr: 'بعد فترة تشغيل 30 يوماً', pct: 20, descEn: 'No DOA / hardware failures in the first 30 days', descAr: 'عدم وجود أعطال خلال أول 30 يوماً', due: 'Week 9', dueAr: 'الأسبوع 9' },
  ],
  evaluation: [
    { criterionEn: 'Price', criterionAr: 'السعر', weight: 60, descEn: 'Total landed cost incl. warranty and services', descAr: 'التكلفة الإجمالية شاملة الضمان والخدمات' },
    { criterionEn: 'Delivery lead time', criterionAr: 'مدة التسليم', weight: 25, descEn: 'Committed days from PO to handover', descAr: 'عدد الأيام الملتزم بها من أمر الشراء حتى التسليم' },
    { criterionEn: 'Warranty & support', criterionAr: 'الضمان والدعم', weight: 15, descEn: 'Onsite coverage, SLA and local service centres', descAr: 'التغطية في الموقع ومستوى الخدمة ومراكز الصيانة المحلية' },
  ],
  techPassing: 70, techSplit: 40,
  techDocs: [
    { en: 'Device datasheets', ar: 'نشرات مواصفات الأجهزة' },
    { en: 'OEM authorization letter', ar: 'خطاب تفويض المصنع' },
    { en: 'Warranty terms & service centre list', ar: 'شروط الضمان وقائمة مراكز الصيانة' },
  ],
  techRequirements: [
    { reqEn: 'Minimum specification', reqAr: 'الحد الأدنى للمواصفات', descEn: '32GB RAM, 1TB NVMe SSD, 16" display, Wi-Fi 6E', descAr: 'ذاكرة 32 جيجابايت وتخزين 1 تيرابايت وشاشة 16 بوصة' },
    { reqEn: 'Corporate image', reqAr: 'الصورة المؤسسية', descEn: 'Supplier applies the engineering image and Intune enrolment before delivery', descAr: 'يطبق المورد الصورة الهندسية والتسجيل قبل التسليم' },
    { reqEn: 'Security', reqAr: 'الأمن', descEn: 'TPM 2.0, BitLocker enabled, BIOS password set', descAr: 'شريحة TPM 2.0 وتفعيل التشفير وكلمة مرور BIOS' },
  ],
  qualification: [
    { reqEn: 'Valid Commercial Registration (CR)', reqAr: 'سجل تجاري ساري المفعول', evidenceEn: 'CR certificate', evidenceAr: 'شهادة السجل' },
    { reqEn: 'Authorized reseller certificate', reqAr: 'شهادة موزّع معتمد', evidenceEn: 'OEM partner letter', evidenceAr: 'خطاب الشريك من المصنع' },
    { reqEn: 'Zakat & Tax certificate', reqAr: 'شهادة الزكاة والضريبة', evidenceEn: 'ZATCA certificate', evidenceAr: 'شهادة هيئة الزكاة' },
    { reqEn: 'Registered on Etimad E-Market', reqAr: 'مسجل في سوق اعتماد', evidenceEn: 'Etimad supplier ID', evidenceAr: 'رقم المورد في اعتماد' },
  ],
  documents: [
    { en: 'Purchase Request form (signed)', ar: 'نموذج طلب الشراء (موقّع)', type: 'PDF', size: '412 KB', by: 'Sara Al-Qahtani' },
    { en: 'Supplier quotation — Jarir Marketing Co.', ar: 'عرض سعر المورّد — شركة جرير', type: 'PDF', size: '1.1 MB', by: 'Sara Al-Qahtani' },
    { en: 'Budget availability confirmation', ar: 'تأكيد توفر الميزانية', type: 'PDF', size: '220 KB', by: 'Finance' },
    { en: 'Technical specification sheet', ar: 'ورقة المواصفات الفنية', type: 'XLSX', size: '86 KB', by: 'IT Infrastructure' },
  ],
};

// Large tender request, reused by the RFP-2026-041 tasks.
const RFP_S4HANA: RfpDetail = {
  refId: 'RFP-2026-041',
  titleEn: 'SAP S/4HANA Implementation', titleAr: 'تطبيق SAP S/4HANA',
  summaryEn: 'Full S/4HANA implementation with Embedded EWM, data migration, training and hypercare for the entity.',
  summaryAr: 'تطبيق كامل لـ S/4HANA مع إدارة المستودعات المدمجة وترحيل البيانات والتدريب والدعم بعد التشغيل.',
  meta: [
    { label: { en: 'Project', ar: 'المشروع' }, value: 'Core ERP Modernization' },
    { label: { en: 'Requesting department', ar: 'الإدارة الطالبة' }, value: 'IT & Digital' },
    { label: { en: 'Cost center', ar: 'مركز التكلفة' }, value: 'IT-ERP-2026' },
    { label: { en: 'Procurement route', ar: 'مسار الشراء' }, value: 'Competitive Tender' },
    { label: { en: 'Estimated value', ar: 'القيمة التقديرية' }, value: 'SAR 9,940,000.00', dir: 'ltr' },
    { label: { en: 'Contract duration', ar: 'مدة العقد' }, value: '18 months' },
    { label: { en: 'Evaluation split', ar: 'توزيع التقييم' }, value: 'Technical 70% / Commercial 30%' },
    { label: { en: 'Suppliers invited', ar: 'الموردون المدعوون' }, value: '5' },
    { label: { en: 'Planned award', ar: 'الترسية المخططة' }, value: 'Q1 2027', dir: 'ltr' },
  ],
  scopeEn: 'Design, build, migrate and operate a greenfield S/4HANA environment covering FI, CO, MM and FM with Embedded EWM. Includes data migration from the legacy ECC system, 6 training batches, and 3 months of hypercare support.',
  scopeAr: 'تصميم وبناء وترحيل وتشغيل بيئة S/4HANA جديدة تغطي المالية والتحكم والمشتريات وإدارة الأموال مع إدارة المستودعات المدمجة، بما في ذلك ترحيل البيانات من النظام القديم و6 دفعات تدريبية و3 أشهر دعم بعد التشغيل.',
  scopeBlocks: [
    { headEn: 'Objectives', headAr: 'الأهداف',
      itemsEn: ['Replace the end-of-support ECC 6.0 landscape before 2027', 'One integrated finance, procurement and warehouse platform', 'Real-time budget control through Funds Management'],
      itemsAr: ['استبدال نظام ECC 6.0 قبل انتهاء الدعم في 2027', 'منصة موحدة للمالية والمشتريات والمستودعات', 'رقابة فورية على الميزانية عبر إدارة الأموال'] },
    { headEn: 'In scope', headAr: 'ضمن النطاق',
      itemsEn: ['FI, CO, MM, FM and Embedded EWM design and build', 'Integration with Etimad, SADAD and the HR system via SAP CPI', 'Migration of open items, masters and 3 years of history', 'Fiori launchpad with 40 standard and 12 custom apps'],
      itemsAr: ['تصميم وبناء المالية والتحكم والمشتريات وإدارة الأموال والمستودعات', 'التكامل مع اعتماد وسداد ونظام الموارد البشرية عبر CPI', 'ترحيل البنود المفتوحة والبيانات الرئيسية و3 سنوات من البيانات التاريخية', 'منصة Fiori مع 40 تطبيقاً قياسياً و12 تطبيقاً مخصصاً'] },
    { headEn: 'Out of scope', headAr: 'خارج النطاق',
      itemsEn: ['SuccessFactors / HR payroll', 'Hardware and hosting (covered by RFP-2026-037)'],
      itemsAr: ['نظام SuccessFactors والرواتب', 'الأجهزة والاستضافة (مشمولة في RFP-2026-037)'] },
    { headEn: 'Deliverables & timeline', headAr: 'المخرجات والجدول الزمني',
      itemsEn: ['Blueprint & solution design — Month 3', 'Build & unit test — Month 9', 'SIT & UAT sign-off — Month 13', 'Go-live — Month 15, hypercare to Month 18'],
      itemsAr: ['التصميم والمخطط — الشهر 3', 'البناء واختبار الوحدات — الشهر 9', 'اعتماد اختبار التكامل والقبول — الشهر 13', 'التشغيل — الشهر 15 والدعم حتى الشهر 18'] },
  ],
  boq: [
    { itemEn: 'SAP S/4HANA Enterprise License', itemAr: 'ترخيص SAP S/4HANA للمؤسسات', qty: '500', unit: 'License', unitPrice: 2800, descEn: 'Named user licenses — Professional access (full module access)', descAr: 'تراخيص مستخدمين — وصول احترافي كامل', budgetEn: 'ERP Software Licenses', budgetAr: 'تراخيص برامج ERP', category: 'Material', delivery: '2026-12-01' },
    { itemEn: 'SAP S/4HANA Enterprise License', itemAr: 'ترخيص SAP S/4HANA للمؤسسات', qty: '200', unit: 'License', unitPrice: 1200, descEn: 'Named user licenses — Limited access (read-only + reporting)', descAr: 'تراخيص مستخدمين — وصول محدود (قراءة وتقارير)', budgetEn: 'ERP Software Licenses', budgetAr: 'تراخيص برامج ERP', category: 'Material', delivery: '2026-12-01' },
    { itemEn: 'Core implementation (FI/CO/MM/FM)', itemAr: 'التطبيق الأساسي (المالية/التحكم/المشتريات/الأموال)', qty: '1', unit: 'LS', unitPrice: 3200000, descEn: 'Blueprint, configuration, custom development, SIT and UAT', descAr: 'التصميم والتهيئة والتطوير واختبارات التكامل والقبول', budgetEn: 'Implementation & Configuration Services', budgetAr: 'خدمات التطبيق والتهيئة', category: 'Service', delivery: '2027-12-31' },
    { itemEn: 'Embedded EWM implementation', itemAr: 'تطبيق إدارة المستودعات المدمجة', qty: '1', unit: 'LS', unitPrice: 1650000, descEn: 'Inbound, outbound, physical inventory and RF scanning for 2 warehouses', descAr: 'الاستلام والصرف والجرد والمسح اللاسلكي لمستودعين', budgetEn: 'Implementation & Configuration Services', budgetAr: 'خدمات التطبيق والتهيئة', category: 'Service', delivery: '2027-12-31' },
    { itemEn: 'Project management services', itemAr: 'خدمات إدارة المشروع', qty: '18', unit: 'Month', unitPrice: 45000, descEn: 'Dedicated PMP-certified project manager for the full duration', descAr: 'مدير مشروع معتمد متفرغ طوال مدة المشروع', budgetEn: 'Implementation & Configuration Services', budgetAr: 'خدمات التطبيق والتهيئة', category: 'Service', delivery: '2028-06-30' },
    { itemEn: 'Data migration & cleansing', itemAr: 'ترحيل البيانات وتنقيتها', qty: '1', unit: 'LS', unitPrice: 900000, descEn: 'Extraction, cleansing, mapping, mock loads and reconciliation', descAr: 'الاستخراج والتنقية والمطابقة والتحميل التجريبي والتسوية', budgetEn: 'Data Migration Services', budgetAr: 'خدمات ترحيل البيانات', category: 'Service', delivery: '2027-09-30' },
    { itemEn: 'End-user training (Arabic)', itemAr: 'تدريب المستخدمين (بالعربية)', qty: '6', unit: 'Batch', unitPrice: 85000, descEn: 'Classroom and e-learning for key users and end users', descAr: 'تدريب حضوري وإلكتروني للمستخدمين الرئيسيين والنهائيين', budgetEn: 'End-User Training Program', budgetAr: 'برنامج تدريب المستخدمين', category: 'Service', delivery: '2027-11-30' },
    { itemEn: 'Hypercare support', itemAr: 'الدعم بعد التشغيل', qty: '3', unit: 'Month', unitPrice: 130000, descEn: 'On-site stabilisation team after go-live', descAr: 'فريق استقرار في الموقع بعد التشغيل', budgetEn: 'Annual Technical Support & Maintenance', budgetAr: 'الدعم الفني والصيانة السنوية', category: 'Service', delivery: '2028-03-31' },
    { itemEn: '3-year support & maintenance', itemAr: 'عقد دعم وصيانة 3 سنوات', qty: '3', unit: 'Year', unitPrice: 280000, descEn: 'Updates, security patches, helpdesk (Sun–Thu, 4-hour SLA)', descAr: 'التحديثات والتصحيحات الأمنية ومكتب المساعدة (الأحد–الخميس، 4 ساعات)', budgetEn: 'Annual Technical Support & Maintenance', budgetAr: 'الدعم الفني والصيانة السنوية', category: 'Service', delivery: '2031-03-31' },
  ],
  payment: [
    { stageEn: 'Contract signing & kickoff', stageAr: 'توقيع العقد والانطلاق', pct: 15, descEn: 'Signed contract, project charter and mobilised team', descAr: 'العقد الموقع وميثاق المشروع وتجهيز الفريق', due: 'Month 1', dueAr: 'الشهر 1' },
    { stageEn: 'Design approval', stageAr: 'اعتماد التصميم', pct: 20, descEn: 'Approved blueprint and solution design documents', descAr: 'اعتماد المخطط ووثائق تصميم الحل', due: 'Month 3', dueAr: 'الشهر 3' },
    { stageEn: 'Build & configuration', stageAr: 'البناء والتهيئة', pct: 25, descEn: 'Configured system, developments and unit test evidence', descAr: 'النظام المهيأ والتطويرات وأدلة اختبار الوحدات', due: 'Month 9', dueAr: 'الشهر 9' },
    { stageEn: 'UAT sign-off', stageAr: 'اعتماد اختبار القبول', pct: 20, descEn: 'SIT and UAT completed with no open critical defects', descAr: 'إكمال اختبارات التكامل والقبول دون عيوب حرجة', due: 'Month 13', dueAr: 'الشهر 13' },
    { stageEn: 'Go-live & training', stageAr: 'التشغيل والتدريب', pct: 15, descEn: 'Production cut-over and all 6 training batches delivered', descAr: 'الانتقال للإنتاج وتنفيذ دفعات التدريب الست', due: 'Month 15', dueAr: 'الشهر 15' },
    { stageEn: 'Project closure', stageAr: 'إغلاق المشروع', pct: 5, descEn: 'Hypercare exit and final acceptance certificate', descAr: 'إنهاء الدعم بعد التشغيل وشهادة القبول النهائي', due: 'Month 18', dueAr: 'الشهر 18' },
  ],
  evaluation: [
    { criterionEn: 'Methodology & implementation approach', criterionAr: 'المنهجية وأسلوب التطبيق', weight: 30, descEn: 'SAP Activate plan, phasing, risks and cut-over strategy', descAr: 'خطة SAP Activate والمراحل والمخاطر واستراتيجية الانتقال' },
    { criterionEn: 'Team qualifications & certifications', criterionAr: 'مؤهلات الفريق والشهادات', weight: 25, descEn: 'Certified consultants per module, Saudi nationals on the team', descAr: 'مستشارون معتمدون لكل وحدة ونسبة السعوديين في الفريق' },
    { criterionEn: 'Relevant experience', criterionAr: 'الخبرة ذات الصلة', weight: 25, descEn: 'Comparable S/4HANA public-sector deliveries in the last 5 years', descAr: 'مشاريع S/4HANA حكومية مماثلة خلال آخر 5 سنوات' },
    { criterionEn: 'Support & SLA model', criterionAr: 'نموذج الدعم والخدمة', weight: 20, descEn: 'Hypercare, AMS model, response and resolution times', descAr: 'الدعم بعد التشغيل ونموذج خدمات التطبيقات وأوقات الاستجابة والحل' },
  ],
  techPassing: 70, techSplit: 70,
  techDocs: [
    { en: 'Implementation methodology (SAP Activate)', ar: 'منهجية التطبيق (SAP Activate)' },
    { en: 'Project plan & Gantt chart', ar: 'خطة المشروع والجدول الزمني' },
    { en: 'Solution architecture document', ar: 'وثيقة بنية الحل' },
    { en: 'SAP partner certificate', ar: 'شهادة شراكة SAP' },
  ],
  techRequirements: [
    { reqEn: 'Deployment', reqAr: 'النشر', descEn: 'S/4HANA 2023 FPS02 or later, private cloud in a KSA region', descAr: 'إصدار S/4HANA 2023 أو أحدث على سحابة خاصة داخل المملكة' },
    { reqEn: 'Integration', reqAr: 'التكامل', descEn: 'Etimad, SADAD and HR system through SAP Integration Suite (CPI)', descAr: 'اعتماد وسداد ونظام الموارد البشرية عبر منصة التكامل' },
    { reqEn: 'Cyber security', reqAr: 'الأمن السيبراني', descEn: 'Compliance with NCA ECC-1:2018 and CCC-1:2020 controls', descAr: 'الامتثال لضوابط الهيئة الوطنية للأمن السيبراني' },
    { reqEn: 'Localisation', reqAr: 'التوطين', descEn: 'Arabic UI, Hijri calendar and ZATCA e-invoicing phase 2', descAr: 'واجهة عربية والتقويم الهجري والفوترة الإلكترونية المرحلة 2' },
    { reqEn: 'Knowledge transfer', reqAr: 'نقل المعرفة', descEn: 'Shadowing plan and certification of 10 internal key users', descAr: 'خطة مرافقة واعتماد 10 مستخدمين رئيسيين داخليين' },
  ],
  qualification: [
    { reqEn: 'SAP Gold/Platinum partner certificate', reqAr: 'شهادة شريك SAP ذهبي/بلاتيني', evidenceEn: 'SAP partner letter', evidenceAr: 'خطاب شراكة SAP' },
    { reqEn: '3+ comparable S/4HANA deliveries', reqAr: '3 مشاريع S/4HANA مماثلة أو أكثر', evidenceEn: 'Completion certificates', evidenceAr: 'شهادات إنجاز' },
    { reqEn: 'NCA ECC-1:2018 compliance', reqAr: 'الامتثال لضوابط الأمن السيبراني', evidenceEn: 'Compliance self-assessment', evidenceAr: 'تقييم ذاتي للامتثال' },
    { reqEn: 'Local presence in KSA', reqAr: 'حضور محلي في المملكة', evidenceEn: 'CR and office lease', evidenceAr: 'السجل التجاري وعقد المكتب' },
    { reqEn: 'Valid Zakat, Tax & GOSI certificates', reqAr: 'شهادات الزكاة والضريبة والتأمينات سارية', evidenceEn: 'ZATCA & GOSI certificates', evidenceAr: 'شهادات الزكاة والتأمينات' },
  ],
  documents: [
    { en: 'Scope of Work (12 pages)', ar: 'نطاق العمل (12 صفحة)', type: 'PDF', size: '2.4 MB', by: 'IT & Digital' },
    { en: 'Technical evaluation report', ar: 'تقرير التقييم الفني', type: 'PDF', size: '1.8 MB', by: 'Evaluation Committee' },
    { en: 'Commercial comparison sheet', ar: 'جدول المقارنة التجارية', type: 'XLSX', size: '310 KB', by: 'Procurement' },
    { en: 'Award recommendation memo', ar: 'مذكرة توصية الترسية', type: 'DOCX', size: '96 KB', by: 'Procurement' },
    { en: 'Solution architecture overview', ar: 'نظرة عامة على بنية الحل', type: 'PDF', size: '3.1 MB', by: 'Enterprise Architecture' },
  ],
};

// Deterministic defaults so every task's RFP record carries the full set of
// sections (mirroring the request-creation flow), not just overview + scope.
const PAY_DEFAULT: RfpDetail['payment'] = [
  { stageEn: 'Advance on contract signing', stageAr: 'دفعة مقدمة عند توقيع العقد', pct: 20, descEn: 'Against an advance-payment bank guarantee', descAr: 'مقابل ضمان بنكي للدفعة المقدمة', due: 'Week 1', dueAr: 'الأسبوع 1' },
  { stageEn: 'On delivery & installation', stageAr: 'عند التسليم والتركيب', pct: 50, descEn: 'All items delivered, installed and inspected', descAr: 'تسليم جميع البنود وتركيبها وفحصها', due: 'Week 8', dueAr: 'الأسبوع 8' },
  { stageEn: 'Final acceptance', stageAr: 'القبول النهائي', pct: 30, descEn: 'Final acceptance certificate signed by the requester', descAr: 'توقيع شهادة القبول النهائي من الجهة الطالبة', due: 'Week 12', dueAr: 'الأسبوع 12' },
];
const EVAL_DEFAULT: RfpDetail['evaluation'] = [
  { criterionEn: 'Technical compliance', criterionAr: 'المطابقة الفنية', weight: 60, descEn: 'Compliance with the specification and scope of work', descAr: 'المطابقة للمواصفات ونطاق العمل' },
  { criterionEn: 'Price', criterionAr: 'السعر', weight: 30, descEn: 'Total evaluated price incl. VAT', descAr: 'السعر الإجمالي شامل الضريبة' },
  { criterionEn: 'Delivery & support', criterionAr: 'التسليم والدعم', weight: 10, descEn: 'Lead time, warranty and local support', descAr: 'مدة التسليم والضمان والدعم المحلي' },
];
const QUAL_DEFAULT: RfpDetail['qualification'] = [
  { reqEn: 'Valid Commercial Registration (CR)', reqAr: 'سجل تجاري ساري المفعول', evidenceEn: 'CR certificate', evidenceAr: 'شهادة السجل' },
  { reqEn: 'Zakat & Tax (ZATCA) certificate', reqAr: 'شهادة الزكاة والضريبة', evidenceEn: 'ZATCA certificate', evidenceAr: 'شهادة هيئة الزكاة' },
  { reqEn: 'GOSI compliance certificate', reqAr: 'شهادة التأمينات الاجتماعية', evidenceEn: 'GOSI certificate', evidenceAr: 'شهادة التأمينات' },
  { reqEn: 'Chamber of Commerce membership', reqAr: 'عضوية الغرفة التجارية', evidenceEn: 'Membership certificate', evidenceAr: 'شهادة العضوية' },
];
const DOCS_DEFAULT: RfpDetail['documents'] = [
  { en: 'Technical proposal', ar: 'العرض الفني', type: 'PDF', size: '1.6 MB', by: 'Supplier' },
  { en: 'Financial proposal', ar: 'العرض المالي', type: 'PDF', size: '540 KB', by: 'Supplier' },
  { en: 'Company profile', ar: 'الملف التعريفي للشركة', type: 'PDF', size: '3.2 MB', by: 'Supplier' },
];
const TECH_REQ_DEFAULT: NonNullable<RfpDetail['techRequirements']> = [
  { reqEn: 'Specification compliance', reqAr: 'المطابقة للمواصفات', descEn: 'Offer must meet every mandatory line of the technical specification', descAr: 'يجب أن يستوفي العرض جميع البنود الإلزامية في المواصفات' },
  { reqEn: 'Delivery plan', reqAr: 'خطة التسليم', descEn: 'Detailed delivery and installation schedule with milestones', descAr: 'جدول تفصيلي للتسليم والتركيب مع المراحل' },
  { reqEn: 'Warranty & support', reqAr: 'الضمان والدعم', descEn: 'Minimum 12-month warranty with local support in KSA', descAr: 'ضمان لا يقل عن 12 شهراً مع دعم محلي في المملكة' },
];
// Fixed qualification criteria — same main/sub list as the request-creation
// step (TenderContext DEFAULT_QUAL), with ranges and weights filled in.
const QUAL_CRITERIA_FIXED: NonNullable<RfpDetail['qualCriteria']> = [
  { nameEn: 'Previous Experience', nameAr: 'الخبرة السابقة', pct: 40, subs: [
    { nameEn: 'Number of years of experience', nameAr: 'عدد سنوات الخبرة', range: '5–15 years', pct: 30 },
    { nameEn: 'Number of projects (last 3 years)', nameAr: 'عدد المشاريع خلال 3 سنوات', range: '3–10 similar projects', pct: 40 },
    { nameEn: 'Total value of projects (last 3 years)', nameAr: 'إجمالي قيمة المشاريع خلال 3 سنوات', range: 'SAR 1M–10M', pct: 30 } ] },
  { nameEn: 'Existing Contractual Obligations', nameAr: 'الالتزامات التعاقدية القائمة', pct: 30, subs: [
    { nameEn: 'Number of existing projects', nameAr: 'عدد المشاريع القائمة', range: '2–8 active projects', pct: 50 },
    { nameEn: 'Value of existing projects', nameAr: 'قيمة المشاريع القائمة', range: 'SAR 3M–15M', pct: 50 } ] },
  { nameEn: 'Human Resources', nameAr: 'الموارد البشرية', pct: 30, subs: [
    { nameEn: 'Number of employees', nameAr: 'عدد الموظفين', range: '50–500 employees', pct: 40 },
    { nameEn: 'Percentage of Saudi employees', nameAr: 'نسبة الموظفين السعوديين', range: '25%–60% Saudi nationals', pct: 60 } ] },
];
const TECH_DOCS_DEFAULT: NonNullable<RfpDetail['techDocs']> = [
  { en: 'Detailed technical compliance sheet', ar: 'جدول المطابقة الفنية التفصيلي' },
  { en: 'Implementation / delivery plan', ar: 'خطة التنفيذ / التسليم' },
  { en: 'Product datasheets & brochures', ar: 'نشرات ومواصفات المنتجات' },
];
const EVAL_COMMITTEE: NonNullable<RfpDetail['evalCommittee']> = [
  { name: 'Hana Al-Ghamdi', nameAr: 'هناء الغامدي', roleEn: 'Chair', roleAr: 'الرئيس', deptEn: 'Procurement', deptAr: 'المشتريات' },
];
const QUAL_COMMITTEE: NonNullable<RfpDetail['qualCommittee']> = [
  { name: 'Khalid Al-Otaibi', nameAr: 'خالد العتيبي', roleEn: 'Chair', roleAr: 'الرئيس', deptEn: 'Finance', deptAr: 'المالية' },
];

function genericBoq(task: Task): RfpDetail['boq'] {
  const budgetEn = task.project?.en ?? task.entity.titleEn, budgetAr = task.project?.ar ?? task.entity.titleAr;
  const d = new Date(task.receivedAt); d.setMonth(d.getMonth() + 3); const delivery = d.toISOString().slice(0, 10);
  const isService = (s: string) => /servic|support|implement|install|train|consult|maint|warrant|config|migrat/i.test(s);
  if (task.commercialLines?.length) {
    const priced = task.commercialLines.filter((l) => l.unitPrice != null);
    if (priced.length) return priced.map((l) => ({ itemEn: l.itemEn, itemAr: l.itemAr, qty: String(l.qty), unit: l.unit, unitPrice: l.unitPrice as number,
      descEn: `${l.itemEn} as per the technical specification`, descAr: `${l.itemAr} وفق المواصفات الفنية`, budgetEn, budgetAr, category: isService(l.itemEn) ? 'Service' as const : 'Material' as const, delivery }));
  }
  const total = task.amount ?? 0;
  if (total <= 0) return [];
  const a = Math.round(total * 0.58), b = Math.round(total * 0.2), c = Math.round(total * 0.12), e = total - a - b - c;
  return [
    { itemEn: `${task.entity.titleEn} — core scope`, itemAr: `${task.entity.titleAr} — النطاق الأساسي`, qty: '1', unit: 'LS', unitPrice: a, descEn: 'Supply of the main items as per the specification', descAr: 'توريد البنود الرئيسية وفق المواصفات', budgetEn, budgetAr, category: 'Material', delivery },
    { itemEn: 'Implementation & configuration', itemAr: 'التنفيذ والتهيئة', qty: '1', unit: 'LS', unitPrice: b, descEn: 'Installation, configuration and testing on site', descAr: 'التركيب والتهيئة والاختبار في الموقع', budgetEn, budgetAr, category: 'Service', delivery },
    { itemEn: 'Training & knowledge transfer', itemAr: 'التدريب ونقل المعرفة', qty: '2', unit: 'Batch', unitPrice: Math.round(c / 2), descEn: 'Hands-on training for administrators and end users', descAr: 'تدريب عملي لمسؤولي النظام والمستخدمين', budgetEn, budgetAr, category: 'Service', delivery },
    { itemEn: 'Support & warranty (12 months)', itemAr: 'الدعم والضمان (12 شهراً)', qty: '1', unit: 'Year', unitPrice: e + (c - Math.round(c / 2) * 2), descEn: 'Comprehensive warranty with 8×5 local support', descAr: 'ضمان شامل مع دعم محلي 8×5', budgetEn, budgetAr, category: 'Service', delivery },
  ];
}
function genericEval(task: Task): RfpDetail['evaluation'] {
  if (task.criteria?.length) return task.criteria.map((c) => ({ criterionEn: c.label.en, criterionAr: c.label.ar, weight: c.weight, descEn: `Scored against the ${c.label.en.toLowerCase()} requirements`, descAr: `يُقيَّم وفق متطلبات ${c.label.ar}` }));
  return EVAL_DEFAULT;
}
const sourceType = (k: Task['entity']['kind']): { en: string; ar: string } =>
  k === 'RFP' ? { en: 'Competitive tender', ar: 'منافسة عامة' }
  : k === 'RFQ' ? { en: 'Request for quotation', ar: 'طلب عرض أسعار' }
  : k === 'PR' ? { en: 'Purchase request', ar: 'طلب شراء' }
  : k === 'PO' ? { en: 'Purchase order', ar: 'أمر شراء' }
  : { en: String(k), ar: String(k) };

function genericRfp(task: Task): RfpDetail {
  const val = task.amount != null ? `SAR ${new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2 }).format(task.amount)}` : '—';
  const title = task.entity.titleEn, titleAr = task.entity.titleAr;
  return {
    refId: task.entity.ref,
    titleEn: title, titleAr,
    summaryEn: task.summaryEn, summaryAr: task.summaryAr,
    meta: [
      { label: { en: 'Record', ar: 'السجل' }, value: `${task.entity.kind} · ${task.entity.ref}` },
      { label: { en: 'Source type', ar: 'نوع المصدر' }, value: sourceType(task.entity.kind).en },
      ...(task.project ? [{ label: { en: 'Project', ar: 'المشروع' }, value: task.project.en }] : []),
      ...(task.supplier ? [{ label: { en: 'Supplier', ar: 'المورّد' }, value: task.supplier.en }] : []),
      { label: { en: 'Department', ar: 'الإدارة' }, value: task.department.en },
      { label: { en: 'Requester', ar: 'مقدّم الطلب' }, value: task.requester.name },
      ...(task.amount != null ? [{ label: { en: 'Value', ar: 'القيمة' }, value: val, dir: 'ltr' as const }] : []),
      { label: { en: 'Contract duration', ar: 'مدة العقد' }, value: '12 months' },
      { label: { en: 'Delivery location', ar: 'موقع التسليم' }, value: 'Riyadh HQ' },
    ],
    scopeEn: task.summaryEn,
    scopeAr: task.summaryAr,
    scopeBlocks: [
      { headEn: 'Objectives', headAr: 'الأهداف',
        itemsEn: [`Deliver ${title} within the approved budget`, 'Meet the business need raised by the requesting department', 'Comply with the Government Tenders & Procurement Law'],
        itemsAr: [`تنفيذ ${titleAr} ضمن الميزانية المعتمدة`, 'تلبية احتياج الإدارة الطالبة', 'الالتزام بنظام المنافسات والمشتريات الحكومية'] },
      { headEn: 'In scope', headAr: 'ضمن النطاق',
        itemsEn: ['Supply of all items listed in the bill of quantities', 'Delivery, installation and configuration on site', 'Training and handover documentation', '12-month warranty and local support'],
        itemsAr: ['توريد جميع البنود الواردة في جدول الكميات', 'التسليم والتركيب والتهيئة في الموقع', 'التدريب ووثائق التسليم', 'ضمان ودعم محلي لمدة 12 شهراً'] },
      { headEn: 'Out of scope', headAr: 'خارج النطاق',
        itemsEn: ['Civil works and building modifications', 'Items already covered by existing framework agreements'],
        itemsAr: ['الأعمال المدنية وتعديلات المباني', 'البنود المشمولة باتفاقيات إطارية قائمة'] },
      { headEn: 'Deliverables & timeline', headAr: 'المخرجات والجدول الزمني',
        itemsEn: ['Kick-off and delivery plan — Week 1', 'Delivery & installation — Week 8', 'Acceptance and handover — Week 12'],
        itemsAr: ['الانطلاق وخطة التسليم — الأسبوع 1', 'التسليم والتركيب — الأسبوع 8', 'القبول والتسليم — الأسبوع 12'] },
    ],
    boq: genericBoq(task),
    payment: PAY_DEFAULT,
    evaluation: genericEval(task),
    qualification: QUAL_DEFAULT,
    documents: task.requiredDocs?.length ? task.requiredDocs.map((d, i) => ({ en: d.label.en, ar: d.label.ar, type: 'PDF', size: `${280 + i * 135} KB`, by: task.requester.name })) : DOCS_DEFAULT,
  };
}

/** Fill any section a record leaves empty so every RFP view is complete. */
function completeRfp(r: RfpDetail): RfpDetail {
  return {
    ...r,
    techPassing: r.techPassing ?? 70,
    techSplit: r.techSplit ?? 60,
    techRequirements: r.techRequirements ?? TECH_REQ_DEFAULT,
    evalCommittee: r.evalCommittee ?? EVAL_COMMITTEE,
    qualCriteria: QUAL_CRITERIA_FIXED,
    techDocs: r.techDocs ?? TECH_DOCS_DEFAULT,
    qualPassing: r.qualPassing ?? 60,
    qualCommittee: r.qualCommittee ?? QUAL_COMMITTEE,
  };
}

function trailFor(task: Task): TrailStep[] {
  return [
    { id: 't1', titleEn: 'Request submitted', titleAr: 'تقديم الطلب', actorEn: task.requester.name, actorAr: task.requester.nameAr ?? task.requester.name, at: task.receivedAt, state: 'done' },
    { id: 't2', titleEn: 'Procurement validation', titleAr: 'تحقق المشتريات', actorEn: 'Hana Al-Ghamdi', actorAr: 'هناء الغامدي', at: task.receivedAt, state: 'done', note: { en: 'Routing confirmed — budget available.', ar: 'تم تأكيد التوجيه — الميزانية متاحة.' } },
    { id: 't3', titleEn: task.titleEn, titleAr: task.titleAr, actorEn: task.assignee.name, actorAr: task.assignee.nameAr ?? task.assignee.name, state: 'current', note: { en: 'Awaiting your decision.', ar: 'بانتظار قرارك.' } },
    { id: 't4', titleEn: 'Finance approval', titleAr: 'موافقة المالية', actorEn: 'Khalid Al-Otaibi', actorAr: 'خالد العتيبي', state: 'upcoming' },
    { id: 't5', titleEn: 'Purchase Order issued', titleAr: 'إصدار أمر الشراء', actorEn: 'Procurement', actorAr: 'المشتريات', state: 'upcoming' },
    { id: 't6', titleEn: 'Delivery & goods receipt', titleAr: 'التسليم والاستلام', actorEn: task.requester.name, actorAr: task.requester.nameAr ?? task.requester.name, state: 'upcoming' },
  ];
}

// Enrich every task with an RFP record, a trail and an SLA window; the two hero
// approvals carry bespoke RFP detail.
for (const tk of SEED_TASKS) {
  tk.slaHours = SLA_BY_PRIORITY[tk.priority];
  tk.trail = trailFor(tk);
  tk.rfp = completeRfp(tk.entity.ref === 'RFP-2026-041' ? RFP_S4HANA : genericRfp(tk));
}
const hero = SEED_TASKS.find((t) => t.id === 'TSK-4101');
if (hero) hero.rfp = completeRfp(PR_LAPTOPS);
