// Munafasat Inbox — realistic seed data for a Saudi public-sector P2P environment.
// Deterministic mock: dates are offsets from load time so Overdue/Due-soon stay meaningful.
// This is demonstration data only — nothing here is persisted or connected to SAP.

import type { Bilingual, ChecklistItem, Person, Task, TaskActionDef, RfpDetail, TrailStep } from './types';

const DAY = 86400000;
const base = Date.now();
const iso = (days: number, hour = 10) => {
  const d = new Date(base + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// ── People ───────────────────────────────────────────────────────────────────
// The signed-in user is the Procurement Officer; every role below is resolved
// from these records, so names and departments in task titles stay in sync.
export const ME: Person = {
  id: 'u-me', name: 'Mohammed Al-Harbi', nameAr: 'محمد الحربي',
  role: 'Procurement Officer', roleAr: 'أخصائي مشتريات', dept: 'Procurement', deptAr: 'المشتريات',
};
const person = (id: string, name: string, nameAr: string, role: string, roleAr: string, dept: string, deptAr: string): Person =>
  ({ id, name, nameAr, role, roleAr, dept, deptAr });
const P = {
  requester: person('u-ibrahim', 'Ibrahim Al-Rashid', 'إبراهيم الراشد', 'Requester', 'مقدّم الطلب', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي'),
  manager:   person('u-faisal', 'Faisal Al-Dossari', 'فيصل الدوسري', 'Department Manager', 'مدير الإدارة', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي'),
  techMember:person('u-sara', 'Sara Al-Zahrani', 'سارة الزهراني', 'Technical Reviewer', 'مراجع فني', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي'),
  cyber:     person('u-noura', 'Noura Al-Shamrani', 'نورة الشمراني', 'Cyber Security Reviewer', 'مراجع الأمن السيبراني', 'Cyber Security', 'الأمن السيبراني'),
  bcm:       person('u-turki', 'Turki Al-Anazi', 'تركي العنزي', 'Enterprise Risk (BCM) Reviewer', 'مراجع المخاطر المؤسسية (استمرارية الأعمال)', 'Risk — Enterprise Risk (BCM)', 'المخاطر — المخاطر المؤسسية (استمرارية الأعمال)'),
  opRisk:    person('u-reem', 'Reem Al-Dossary', 'ريم الدوسري', 'Operational Risk Reviewer', 'مراجع المخاطر التشغيلية', 'Risk — Operational Risk', 'المخاطر — المخاطر التشغيلية'),
  ea:        person('u-majed', 'Majed Al-Zahrani', 'ماجد الزهراني', 'Enterprise Architecture Reviewer', 'مراجع البنية المؤسسية', 'Enterprise Architecture', 'البنية المؤسسية'),
  gl:        person('u-khalid', 'Khalid Al-Otaibi', 'خالد العتيبي', 'GL Reviewer', 'مراجع دفتر الأستاذ', 'Finance — GL', 'المالية — دفتر الأستاذ العام'),
  assets:    person('u-lama', 'Lama Al-Subaie', 'لمى السبيعي', 'Assets Reviewer', 'مراجع الأصول', 'Finance — Assets', 'المالية — الأصول'),
  finQual:   person('u-abdulrahman', 'Abdulrahman Al-Shehri', 'عبدالرحمن الشهري', 'Finance Qualification', 'التأهيل المالي', 'Finance — Qualification', 'المالية — التأهيل'),
  procQual:  person('u-hana', 'Hana Al-Ghamdi', 'هناء الغامدي', 'Procurement Qualification', 'تأهيل المشتريات', 'Procurement — Qualification', 'المشتريات — التأهيل'),
  tl:        person('u-abdullah', 'Abdullah Al-Qahtani', 'عبدالله القحطاني', 'Procurement Team Lead', 'رئيس فريق المشتريات', 'Procurement — Team Lead', 'المشتريات — رئيس الفريق'),
  officer:   ME,
  director:  person('u-saad', 'Saad Al-Malki', 'سعد المالكي', 'Department Director', 'مدير عام الإدارة', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي'),
};

const sup = (en: string, ar: string) => ({ en, ar });

// ── The purchase request every task in this inbox relates to ────────────────
const REQ = {
  no: '4433',
  ref: 'PR-4433',
  titleEn: 'Enterprise ERP System Upgrade', titleAr: 'ترقية نظام تخطيط موارد المؤسسة',
  project: sup('Core ERP Modernization', 'تحديث نظام ERP الأساسي'),
  amount: 9940000,
  requester: P.requester,
};
const reqDept = (isAr = false) => (isAr ? REQ.requester.deptAr : REQ.requester.dept) ?? '';
const reqUser = (isAr = false) => (isAr ? REQ.requester.nameAr : REQ.requester.name) ?? '';

/** Task titles from the process task list — names/departments are resolved, never hard-coded. */
const TITLE = {
  reviewFromUser: () => sup(`Review purchase request #${REQ.no} from ${reqUser()}`, `مراجعة طلب الشراء رقم ${REQ.no} من ${reqUser(true)}`),
  techEvalFromUser: () => sup(`Review technical evaluation criteria for purchase request #${REQ.no} from ${reqUser()}`, `مراجعة معايير التقييم الفني لطلب الشراء رقم ${REQ.no} من ${reqUser(true)}`),
  reviewFromDept: () => sup(`Review purchase request #${REQ.no} from ${reqDept()}`, `مراجعة طلب الشراء رقم ${REQ.no} من ${reqDept(true)}`),
  qualFromDept: () => sup(`Review request & add qualification criteria for purchase request #${REQ.no} from ${reqDept()}`, `مراجعة الطلب وإضافة معايير التأهيل لطلب الشراء رقم ${REQ.no} من ${reqDept(true)}`),
  doaFromDept: () => sup(`DOA approval for purchase request #${REQ.no} from ${reqDept()}`, `اعتماد تفويض الصلاحيات لطلب الشراء رقم ${REQ.no} من ${reqDept(true)}`),
  priceFromDept: () => sup(`Approve estimated price for purchase request #${REQ.no} from ${reqDept()}`, `اعتماد السعر التقديري لطلب الشراء رقم ${REQ.no} من ${reqDept(true)}`),
};

const APPROVE_RETURN: TaskActionDef[] = [
  { id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' },
  { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
];

interface Spec {
  n: number; type: Task['type'];
  title: Bilingual; summary: Bilingual;
  stage: Bilingual; assignee: Person; sla: number;            // SLA in working days
  priority: Task['priority']; received: number;              // days from now
  actions: TaskActionDef[];
  extra?: Partial<Task>;
}

const reviewChecklist = (items: [string, string][]): ChecklistItem[] =>
  items.map(([en, ar], i) => ({ id: `c${i + 1}`, label: sup(en, ar), mandatory: true, kind: 'confirm', done: false }));

const amountStr = 'SAR 9,940,000.00';
const approvalRecord = [
  { label: sup('Request value', 'قيمة الطلب'), value: amountStr, emphasis: true },
  { label: sup('Request', 'الطلب'), value: `#${REQ.no} · ${REQ.titleEn}` },
  { label: sup('Requesting department', 'الإدارة الطالبة'), value: reqDept() },
  { label: sup('Requester', 'مقدّم الطلب'), value: reqUser() },
  { label: sup('Procurement route', 'مسار الشراء'), value: 'Competitive Tender' },
  { label: sup('Project', 'المشروع'), value: REQ.project.en },
];

const SPECS: Spec[] = [
  { n: 1, type: 'approval', title: TITLE.reviewFromUser(),
    summary: sup(`${reqUser()} submitted this purchase request. Approve it, return it with comments, or reject it with a reason.`, `قدّم ${reqUser(true)} طلب الشراء هذا. اعتمده أو أعده مع ملاحظات أو ارفضه مع ذكر السبب.`),
    stage: sup('Department approval', 'اعتماد الإدارة'), assignee: P.manager, sla: 1, priority: 'high', received: -1,
    actions: [
      { id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' },
      { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
      { id: 'reject', labelEn: 'Reject', labelAr: 'رفض', variant: 'danger', needsNote: true },
    ],
    extra: { approvalRecord, requireReasonOnReject: true } },
  { n: 2, type: 'review', title: TITLE.techEvalFromUser(),
    summary: sup('Verify the technical evaluation criteria and weights before the specialist and finance reviews.', 'تحقق من معايير التقييم الفني وأوزانها قبل المراجعات التخصصية والمالية.'),
    stage: sup('Technical member review', 'مراجعة العضو الفني'), assignee: P.techMember, sla: 2, priority: 'medium', received: -1,
    actions: APPROVE_RETURN,
    extra: { findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: reviewChecklist([
      ['Technical requirements are complete and clear', 'المتطلبات الفنية مكتملة وواضحة'],
      ['Evaluation criteria weights total 100%', 'مجموع أوزان معايير التقييم 100%'],
      ['Technical passing score is set', 'تم تحديد درجة الاجتياز الفنية'],
    ]) } },
  { n: 3, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Cyber security review: confirm NCA requirements are captured in the request.', 'مراجعة الأمن السيبراني: تأكد من تضمين متطلبات الهيئة الوطنية للأمن السيبراني في الطلب.'),
    stage: sup('Specialist review — Cyber Security', 'مراجعة تخصصية — الأمن السيبراني'), assignee: P.cyber, sla: 2, priority: 'medium', received: 0,
    actions: APPROVE_RETURN,
    extra: { parallelGroup: 'pg-specialist', findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: reviewChecklist([
      ['NCA requirements captured', 'تم تضمين متطلبات الهيئة الوطنية للأمن السيبراني'],
      ['Cyber security section and criteria added', 'تمت إضافة قسم ومعايير الأمن السيبراني'],
    ]) } },
  { n: 4, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('BCM review: critical system / department classification and compliance with SLA.', 'مراجعة استمرارية الأعمال: تصنيف الأنظمة والإدارات الحرجة والامتثال لاتفاقية مستوى الخدمة.'),
    stage: sup('Specialist review — Enterprise Risk (BCM)', 'مراجعة تخصصية — المخاطر المؤسسية'), assignee: P.bcm, sla: 1, priority: 'medium', received: 0,
    actions: APPROVE_RETURN,
    extra: { parallelGroup: 'pg-specialist', findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: reviewChecklist([
      ['Critical system / department classification checked', 'تم فحص تصنيف الأنظمة والإدارات الحرجة'],
      ['Compliance with SLA (RPO / RTO) confirmed', 'تم تأكيد الامتثال لمستوى الخدمة (RPO / RTO)'],
    ]) } },
  { n: 5, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Operational risk assessment of the change, per the risk management framework.', 'تقييم المخاطر التشغيلية للتغيير وفق إطار إدارة المخاطر.'),
    stage: sup('Specialist review — Operational Risk', 'مراجعة تخصصية — المخاطر التشغيلية'), assignee: P.opRisk, sla: 1, priority: 'medium', received: 0,
    actions: APPROVE_RETURN,
    extra: { parallelGroup: 'pg-specialist', findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: reviewChecklist([
      ['Operational risk assessment completed', 'تم إكمال تقييم المخاطر التشغيلية'],
      ['Assessed against the risk management framework', 'تم التقييم وفق إطار إدارة المخاطر'],
    ]) } },
  { n: 6, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('EA compliance: planned in the tech architecture, EA principles and standard tools (e.g. SSO).', 'الامتثال للبنية المؤسسية: مخطط ضمن البنية التقنية ومبادئ البنية المؤسسية والأدوات القياسية.'),
    stage: sup('Specialist review — Enterprise Architecture', 'مراجعة تخصصية — البنية المؤسسية'), assignee: P.ea, sla: 3, priority: 'medium', received: 0,
    actions: APPROVE_RETURN,
    extra: { parallelGroup: 'pg-specialist', findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: reviewChecklist([
      ['Planned in the technology architecture', 'مخطط ضمن البنية التقنية'],
      ['Complies with EA principles and standard tools (e.g. SSO)', 'يتوافق مع مبادئ البنية المؤسسية والأدوات القياسية'],
      ['EA requirements text added from template', 'تمت إضافة نص متطلبات البنية المؤسسية من القالب'],
    ]) } },
  { n: 7, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('GL validation: material group and GL coding checked.', 'التحقق من دفتر الأستاذ: فحص مجموعة المواد وترميز الحسابات.'),
    stage: sup('Finance review — GL', 'مراجعة مالية — دفتر الأستاذ'), assignee: P.gl, sla: 1, priority: 'medium', received: 0,
    actions: APPROVE_RETURN,
    extra: { parallelGroup: 'pg-specialist', findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: reviewChecklist([
      ['Material group checked', 'تم فحص مجموعة المواد'],
      ['GL coding checked', 'تم فحص ترميز الحسابات'],
    ]) } },
  { n: 8, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Asset item created in ECC and asset-to-PR mapping prepared. Applies when a project item is of type Asset.', 'إنشاء بند الأصل في ECC وإعداد ربط الأصل بطلب الشراء. ينطبق عندما يكون بند المشروع من نوع أصل.'),
    stage: sup('Finance review — Assets', 'مراجعة مالية — الأصول'), assignee: P.assets, sla: 1, priority: 'medium', received: 0,
    actions: APPROVE_RETURN,
    extra: { parallelGroup: 'pg-specialist', findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: reviewChecklist([
      ['Asset item created in ECC', 'تم إنشاء بند الأصل في ECC'],
      ['Asset-to-PR mapping prepared (asset reference)', 'تم إعداد ربط الأصل بطلب الشراء (مرجع الأصل)'],
    ]) } },
  { n: 9, type: 'data-collection', title: TITLE.qualFromDept(),
    summary: sup('Add the financial qualification criteria: cash ratio, quick ratio, ranges, weights and passing %.', 'أضف معايير التأهيل المالي: نسبة النقدية ونسبة السيولة السريعة والنطاقات والأوزان ونسبة الاجتياز.'),
    stage: sup('Qualification — Finance', 'التأهيل — المالية'), assignee: P.finQual, sla: 1, priority: 'medium', received: 0,
    actions: [
      { id: 'complete', labelEn: 'Complete', labelAr: 'إكمال', variant: 'primary', gated: true },
      { id: 'save-draft', labelEn: 'Save draft', labelAr: 'حفظ مسودة', variant: 'secondary' },
    ],
    extra: { fields: [
      { id: 'f1', label: sup('Cash ratio (latest fiscal year) — range', 'نسبة النقدية (آخر سنة مالية) — النطاق'), kind: 'text', required: true, value: null, placeholder: sup('e.g. ≥ 1.2', 'مثال: ≥ 1.2') },
      { id: 'f2', label: sup('Cash ratio — weight (%)', 'نسبة النقدية — الوزن (%)'), kind: 'number', required: true, value: null },
      { id: 'f3', label: sup('Quick ratio (latest fiscal year) — range', 'نسبة السيولة السريعة (آخر سنة مالية) — النطاق'), kind: 'text', required: true, value: null, placeholder: sup('e.g. ≥ 1.0', 'مثال: ≥ 1.0') },
      { id: 'f4', label: sup('Quick ratio — weight (%)', 'نسبة السيولة السريعة — الوزن (%)'), kind: 'number', required: true, value: null },
      { id: 'f5', label: sup('Qualification financial passing percentage', 'نسبة الاجتياز المالي للتأهيل'), kind: 'number', required: true, value: null },
    ] } },
  { n: 10, type: 'data-collection', title: TITLE.qualFromDept(),
    summary: sup('Complete the procurement qualification criteria (ranges and weights) for the fixed criteria list.', 'أكمل معايير تأهيل المشتريات (النطاقات والأوزان) لقائمة المعايير الثابتة.'),
    stage: sup('Qualification — Procurement', 'التأهيل — المشتريات'), assignee: P.procQual, sla: 1, priority: 'medium', received: 0,
    actions: [
      { id: 'complete', labelEn: 'Complete', labelAr: 'إكمال', variant: 'primary', gated: true },
      { id: 'save-draft', labelEn: 'Save draft', labelAr: 'حفظ مسودة', variant: 'secondary' },
    ],
    extra: { fields: [
      { id: 'f1', label: sup('Previous Experience — weight (%)', 'الخبرة السابقة — الوزن (%)'), kind: 'number', required: true, value: null },
      { id: 'f2', label: sup('Existing Contractual Obligations — weight (%)', 'الالتزامات التعاقدية القائمة — الوزن (%)'), kind: 'number', required: true, value: null },
      { id: 'f3', label: sup('Human Resources — weight (%)', 'الموارد البشرية — الوزن (%)'), kind: 'number', required: true, value: null },
      { id: 'f4', label: sup('Qualification passing percentage', 'نسبة الاجتياز للتأهيل'), kind: 'number', required: true, value: null },
    ] } },
  { n: 11, type: 'approval', title: TITLE.reviewFromDept(),
    summary: sup('Review the request. With no comments, send it for DOA approval; if it is new or has comments, assign it to an officer.', 'راجع الطلب. إن لم توجد ملاحظات أرسله لاعتماد تفويض الصلاحيات، وإن كان جديداً أو عليه ملاحظات أسنده إلى أخصائي.'),
    stage: sup('Procurement review — Team Lead', 'مراجعة المشتريات — رئيس الفريق'), assignee: P.tl, sla: 4, priority: 'high', received: 0,
    actions: [
      { id: 'approve', labelEn: 'Submit for DOA approval', labelAr: 'إرسال لاعتماد الصلاحيات', variant: 'primary', decision: sup('Submitted for DOA approval', 'أُرسل لاعتماد الصلاحيات') },
      { id: 'complete', labelEn: 'Assign to officer', labelAr: 'إسناد إلى أخصائي', variant: 'secondary', decision: sup('Assigned to officer', 'أُسند إلى أخصائي') },
    ],
    extra: { approvalRecord } },
  { n: 12, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Officer review of the RFP before DOA approval. Return it with comments if anything below needs correcting.', 'مراجعة الأخصائي للمنافسة قبل اعتماد الصلاحيات. أعدها مع ملاحظات إن احتاج أي بند أدناه إلى تصحيح.'),
    stage: sup('Procurement review — Officer', 'مراجعة المشتريات — الأخصائي'), assignee: P.officer, sla: 2, priority: 'high', received: 0,
    actions: [
      { id: 'submit', labelEn: 'Submit for DOA approval', labelAr: 'إرسال لاعتماد الصلاحيات', variant: 'primary', decision: sup('Submitted for DOA approval', 'أُرسل لاعتماد الصلاحيات') },
      { id: 'return', labelEn: 'Return with comments', labelAr: 'إعادة مع ملاحظات', variant: 'secondary', needsNote: true },
    ],
    extra: { findingsLabel: sup('Officer comments', 'ملاحظات الأخصائي'), checklist: reviewChecklist([
      ['RFP comments addressed', 'تمت معالجة ملاحظات المنافسة'],
      ['Brand name details provided (if a brand is named)', 'تم تقديم تفاصيل العلامة التجارية (إن وُجدت)'],
      ['RFP is clear and its sections are linked', 'المنافسة واضحة وأقسامها مترابطة'],
      ['No formal violations (unclear words or text)', 'لا توجد مخالفات شكلية (كلمات أو نصوص غير واضحة)'],
      ['No systemic violations (mandatory list, brand names)', 'لا توجد مخالفات نظامية (القائمة الإلزامية، العلامات التجارية)'],
    ]) } },
  { n: 13, type: 'approval', title: TITLE.doaFromDept(),
    summary: sup('Approve the request per the delegation of authority (DOA).', 'اعتمد الطلب وفق مصفوفة تفويض الصلاحيات.'),
    stage: sup('DOA approval', 'اعتماد تفويض الصلاحيات'), assignee: P.tl, sla: 2, priority: 'high', received: 0,
    actions: [{ id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' }],
    extra: { approvalRecord } },
  { n: 14, type: 'approval', title: TITLE.priceFromDept(),
    summary: sup('Approve the estimated price. Request approval completes here and hands off to PR creation in SAP ECC.', 'اعتمد السعر التقديري. يكتمل اعتماد الطلب هنا وينتقل إلى إنشاء طلب الشراء في SAP ECC.'),
    stage: sup('Estimated price approval', 'اعتماد السعر التقديري'), assignee: P.director, sla: 2, priority: 'medium', received: 0,
    actions: [{ id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' }],
    extra: { approvalRecord: [{ label: sup('Estimated price', 'السعر التقديري'), value: amountStr, emphasis: true }, ...approvalRecord.slice(1)] } },
];

const iso2 = (days: number, hour = 10) => iso(days, hour);
export const SEED_TASKS: Task[] = SPECS.map((s) => ({
  id: `TSK-${REQ.no}-${String(s.n).padStart(2, '0')}`,
  type: s.type,
  titleEn: s.title.en, titleAr: s.title.ar,
  summaryEn: s.summary.en, summaryAr: s.summary.ar,
  state: 'available', priority: s.priority,
  entity: { kind: 'PR', ref: REQ.ref, titleEn: REQ.titleEn, titleAr: REQ.titleAr },
  project: REQ.project,
  amount: REQ.amount,
  requester: REQ.requester, assignee: s.assignee,
  department: sup(reqDept(), reqDept(true)),
  stageEn: s.stage.en, stageAr: s.stage.ar,
  receivedAt: iso2(s.received, 9 + (s.n % 6)), dueAt: iso2(s.received + s.sla, 17),
  mineAction: true,
  actions: s.actions,
  slaHours: s.sla * 24,
  activity: [
    { id: 'a1', kind: 'system', actor: REQ.requester, at: iso2(-1, 9), system: sup(`Purchase request #${REQ.no} submitted`, `تم تقديم طلب الشراء رقم ${REQ.no}`) },
    { id: 'a2', kind: 'system', actor: s.assignee, at: iso2(s.received, 9 + (s.n % 6)), system: sup(`Assigned to ${s.assignee.name}`, `أُسند إلى ${s.assignee.nameAr}`) },
  ],
  ...s.extra,
}));

// ── RFP / request detail + workflow trail ─────────────────────────────────────

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

// Workflow trail — the request-approval steps in order; the task's own step is current.
function trailFor(task: Task): TrailStep[] {
  const steps: { en: string; ar: string; who: Person }[] = [
    { en: 'Request submitted', ar: 'تقديم الطلب', who: REQ.requester },
    ...SPECS.map((s) => ({ en: s.stage.en, ar: s.stage.ar, who: s.assignee })),
  ];
  const cur = SPECS.find((s) => s.stage.en === task.stageEn);
  const curIdx = cur ? SPECS.indexOf(cur) + 1 : 1;
  return steps.map((st, i) => ({
    id: `t${i}`, titleEn: st.en, titleAr: st.ar, actorEn: st.who.name, actorAr: st.who.nameAr ?? st.who.name,
    state: i < curIdx ? 'done' : i === curIdx ? 'current' : 'upcoming',
    ...(i === 0 ? { at: iso(-1, 9) } : {}),
    ...(i === curIdx ? { note: { en: 'Awaiting decision.', ar: 'بانتظار القرار.' } } : {}),
  }));
}

// Every task relates to purchase request #4433 — one shared RFP record.
const REQ_RFP = completeRfp({
  ...RFP_S4HANA,
  refId: REQ.ref, titleEn: REQ.titleEn, titleAr: REQ.titleAr,
  meta: RFP_S4HANA.meta.map((m) => m.label.en === 'Requesting department' ? { ...m, value: reqDept() } : m),
});
for (const tk of SEED_TASKS) {
  tk.trail = trailFor(tk);
  tk.rfp = REQ_RFP;
}
