// Munafasat Inbox — realistic seed data for a Saudi public-sector P2P environment.
// Deterministic mock: dates are offsets from load time so Overdue/Due-soon stay meaningful.
// This is demonstration data only — nothing here is persisted or connected to SAP.

import type { Person, Task } from './types';

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
