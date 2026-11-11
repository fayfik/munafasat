// Munafasat Inbox — realistic seed data for a Saudi public-sector P2P environment.
// Deterministic mock: dates are offsets from load time so Overdue/Due-soon stay meaningful.
// This is demonstration data only — nothing here is persisted or connected to SAP.

import type { Bilingual, ChecklistItem, Person, Task, TaskActionDef, RfpDetail, TrailStep, FinLine, FinChange } from './types';

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

// ── The RFP every task in this inbox relates to ────────────────
const REQ = {
  no: '4433',
  ref: 'REQ-4433',
  titleEn: 'Enterprise ERP System Upgrade', titleAr: 'ترقية نظام تخطيط موارد المؤسسة',
  project: sup('Core ERP Modernization', 'تحديث نظام ERP الأساسي'),
  amount: 9940000,
  requester: P.requester,
};
const reqDept = (isAr = false) => (isAr ? REQ.requester.deptAr : REQ.requester.dept) ?? '';
const reqUser = (isAr = false) => (isAr ? REQ.requester.nameAr : REQ.requester.name) ?? '';

/** Task titles from the process task list — names/departments are resolved, never hard-coded. */
const TITLE = {
  reviewFromUser: () => sup(`Review & approve request #${REQ.no} from ${reqUser()}`, `مراجعة واعتماد الطلب رقم ${REQ.no} من ${reqUser(true)}`),
  techEvalFromUser: () => sup(`Review technical evaluation criteria for request #${REQ.no} from ${reqUser()}`, `مراجعة معايير التقييم الفني للطلب رقم ${REQ.no} من ${reqUser(true)}`),
  reviewFromDept: () => sup(`Review request #${REQ.no} from ${reqDept()}`, `مراجعة الطلب رقم ${REQ.no} من ${reqDept(true)}`),
  qualFromDept: () => sup(`Review request & add qualification criteria for request #${REQ.no} from ${reqDept()}`, `مراجعة الطلب وإضافة معايير التأهيل للطلب رقم ${REQ.no} من ${reqDept(true)}`),
  doaFromDept: () => sup('Approval DOA', 'اعتماد تفويض الصلاحيات'),
  priceFromDept: () => sup(`Approve estimated price for request #${REQ.no} from ${reqDept()}`, `اعتماد السعر التقديري للطلب رقم ${REQ.no} من ${reqDept(true)}`),
};

const step = (titleEn: string, titleAr: string, descEn: string, descAr: string) => ({ titleEn, titleAr, descEn, descAr });
const MANAGER_STEPS: NonNullable<Task['decisionSteps']> = {
  approve: [
    step('Specialist & finance reviews', 'المراجعات التخصصية والمالية', 'Cyber Security, Risk, Enterprise Architecture and Finance review the request in parallel.', 'تراجع الأمن السيبراني والمخاطر والبنية المؤسسية والمالية الطلب بالتوازي.'),
    step('Qualification', 'التأهيل', 'Finance and Procurement add the qualification criteria.', 'تضيف المالية والمشتريات معايير التأهيل.'),
    step('Procurement review & DOA', 'مراجعة المشتريات والصلاحيات', 'The procurement Team Lead and Officer review the request, then it goes for DOA approval.', 'يراجع رئيس فريق المشتريات والأخصائي الطلب ثم تُرسل لاعتماد الصلاحيات.'),
    step('Estimated price approval', 'اعتماد السعر التقديري', 'The Director approves the estimated price and the PR is created in SAP ECC.', 'يعتمد المدير السعر التقديري ويُنشأ طلب الشراء في SAP ECC.'),
  ],
  return: [
    step('Back to the requester', 'العودة إلى مقدّم الطلب', `A "Review comments for request #${REQ.no}" task is created for ${reqUser()}.`, `تُنشأ مهمة "مراجعة التعليقات على المنافسة رقم ${REQ.no}" لـ ${reqUser(true)}.`),
    step('Requester responds', 'رد مقدّم الطلب', 'They reply to and resolve each comment, and edit only the commented fields.', 'يرد على كل تعليق ويحله، ويعدّل الحقول التي عليها تعليقات فقط.'),
    step('Back to you for approval', 'العودة إليك للاعتماد', 'Once every comment is resolved the request is resubmitted to you.', 'بعد حل جميع التعليقات يُعاد تقديم الطلب إليك.'),
  ],
  reject: [
    step('Request closed', 'إغلاق الطلب', `Request #${REQ.no} is rejected and closed.`, `يُرفض الطلب رقم ${REQ.no} ويُغلق.`),
    step('Requester notified', 'إشعار مقدّم الطلب', `${reqUser()} receives your rejection reason.`, `يتلقى ${reqUser(true)} سبب الرفض.`),
  ],
};

const returnSteps = (who: Person) => [
  step('Back to the requester', 'العودة إلى مقدّم الطلب', `A "Review comments for request #${REQ.no}" task is created for ${reqUser()}.`, `تُنشأ مهمة "مراجعة التعليقات على المنافسة رقم ${REQ.no}" لـ ${reqUser(true)}.`),
  step('Requester responds', 'رد مقدّم الطلب', 'They reply to and resolve each comment, and edit only the commented fields.', 'يرد على كل تعليق ويحله، ويعدّل الحقول التي عليها تعليقات فقط.'),
  step(`Back to ${who.name}`, `العودة إلى ${who.nameAr ?? who.name}`, 'Once every comment is resolved the request is resubmitted to you.', 'بعد حل جميع التعليقات يُعاد تقديم الطلب إليك.'),
];
const S = {
  specialist: step('Specialist & finance reviews', 'المراجعات التخصصية والمالية', 'Cyber Security, Enterprise Risk (BCM), Operational Risk, EA, GL and Assets review in parallel.', 'تراجع الأمن السيبراني والمخاطر المؤسسية والتشغيلية والبنية المؤسسية ودفتر الأستاذ والأصول بالتوازي.'),
  waitParallel: step('Wait for parallel reviewers', 'انتظار بقية المراجعين', 'Your approval is held until every other specialist and finance reviewer completes.', 'يُحتفظ باعتمادك حتى يكمل جميع المراجعين الآخرين.'),
  finQual: step('Finance qualification', 'التأهيل المالي', 'Finance adds the financial qualification criteria (cash ratio, quick ratio, passing %).', 'تضيف المالية معايير التأهيل المالي (نسبة النقدية والسيولة السريعة ونسبة الاجتياز).'),
  procQual: step('Procurement qualification', 'تأهيل المشتريات', 'Procurement completes the qualification criteria ranges and weights.', 'تكمل المشتريات نطاقات وأوزان معايير التأهيل.'),
  tl: step('Procurement Team Lead review', 'مراجعة رئيس فريق المشتريات', 'No comments → DOA approval; new request or comments → assigned to an officer.', 'لا ملاحظات ← اعتماد الصلاحيات؛ طلب جديد أو ملاحظات ← إسناد إلى أخصائي.'),
  officer: step('Procurement Officer review', 'مراجعة أخصائي المشتريات', 'The officer checks the request and either submits it for DOA approval or returns it with comments.', 'يراجع الأخصائي الطلب ثم يرسلها لاعتماد الصلاحيات أو يعيدها مع ملاحظات.'),
  backTl: step('Back to the Team Lead', 'العودة إلى رئيس الفريق', 'The Team Lead takes the officer-checked request to DOA approval.', 'يحيل رئيس الفريق الطلب بعد مراجعة الأخصائي لاعتماد الصلاحيات.'),
  doa: step('DOA approval', 'اعتماد تفويض الصلاحيات', 'Approved per the delegation of authority matrix.', 'يُعتمد وفق مصفوفة تفويض الصلاحيات.'),
  price: step('Estimated price approval', 'اعتماد السعر التقديري', 'The Director approves the estimated price.', 'يعتمد المدير السعر التقديري.'),
  pr: step('Create PR in SAP ECC', 'إنشاء طلب الشراء في SAP ECC', 'Hands off to PR approval DOA (5 levels) and the Etimad stage.', 'ينتقل إلى اعتماد طلب الشراء (5 مستويات) ومرحلة اعتماد.'),
};
/** "What's next?" steps per task (n) and action, from the process task list. */
const STEPS_BY_TASK: Record<number, (who: Person) => NonNullable<Task['decisionSteps']>> = {
  2: (w) => ({ approve: [step('Risk review', 'مراجعة المخاطر', 'Technical evaluation verified — the request moves to the specialist reviews.', 'تم التحقق من التقييم الفني — ينتقل الطلب إلى المراجعات التخصصية.'), S.specialist, S.finQual], return: returnSteps(w) }),
  3: (w) => ({ approve: [S.waitParallel, S.finQual, S.procQual], return: returnSteps(w) }),
  7: (w) => ({ approve: [S.waitParallel, S.finQual, S.procQual], return: returnSteps(w) }),
  9: () => ({ complete: [S.procQual, S.tl] }),
  10: () => ({ complete: [S.tl, S.doa] }),
  11: () => ({ approve: [S.doa, S.price, S.pr], complete: [S.officer, S.backTl, S.doa] }),
  12: (w) => ({ submit: [S.backTl, S.doa, S.price], return: returnSteps(w) }),
  13: () => ({ approve: [S.price, S.pr] }),
  14: () => ({ approve: [S.pr, step('PR approval DOA', 'اعتماد طلب الشراء', 'Five approval levels in SAP ECC.', 'خمسة مستويات اعتماد في SAP ECC.'), step('Etimad', 'اعتماد', 'Estimated prices request and publishing on Etimad.', 'طلب الأسعار التقديرية والنشر في منصة اعتماد.')] }),
};
const stepsFor = (n: number, who: Person) => (STEPS_BY_TASK[n] ?? (n >= 3 && n <= 6 ? STEPS_BY_TASK[3] : n === 8 ? STEPS_BY_TASK[7] : undefined))?.(who);

/** Created when the manager returns a reviewed request: the requester answers each comment. */
export function buildCommentResponseTask(src: Task, note?: string): Task {
  const now = Date.now();
  const mgr = src.assignee;
  const roots = src.activity.filter((a) => a.kind === 'comment' && a.anchor && !a.replyTo);
  const replies = src.activity.filter((a) => a.kind === 'comment' && a.replyTo);
  const no = src.entity.ref.replace(/^[A-Z]+-/, ''); // the request this task belongs to
  const title = sup(`Review comments for request #${no} added by ${mgr.name}`, `مراجعة التعليقات على الطلب رقم ${no} المضافة من ${mgr.nameAr ?? mgr.name}`);
  return {
    id: `${src.id}-R`,
    type: 'clarification',
    titleEn: title.en, titleAr: title.ar,
    summaryEn: `${mgr.name} returned the request with ${roots.length} comment${roots.length === 1 ? '' : 's'} on the request. Reply to and resolve each one, edit the commented fields, then resubmit.`,
    summaryAr: `أعاد ${mgr.nameAr ?? mgr.name} الطلب مع ${roots.length} تعليق على الطلب. رد على كل تعليق وحله، وعدّل الحقول المعنية، ثم أعد التقديم.`,
    state: 'returned', priority: 'high',
    entity: src.entity, project: src.project, amount: src.amount,
    requester: src.requester, assignee: src.requester, department: src.department,
    stageEn: 'Address review comments', stageAr: 'معالجة تعليقات المراجعة',
    receivedAt: new Date(now).toISOString(), dueAt: new Date(now + 2 * 24 * 3600000).toISOString(),
    mineAction: true, initiatedByMe: false, slaHours: 48,
    respondComments: true, reviewComments: true,
    returnedBy: mgr,
    returnReason: note ? sup(note, note) : sup('Please address the review comments on the request.', 'يرجى معالجة تعليقات المراجعة على الطلب.'),
    returnIssues: roots.map((r) => sup(`${r.anchor!.label.en}: ${r.text ?? ''}`, `${r.anchor!.label.ar}: ${r.text ?? ''}`)),
    actions: [
      { id: 'submit', labelEn: 'Resubmit for approval', labelAr: 'إعادة التقديم للاعتماد', variant: 'primary', gated: true, decision: sup('Resubmitted for approval', 'أُعيد التقديم للاعتماد') },
      { id: 'save-draft', labelEn: 'Save draft', labelAr: 'حفظ مسودة', variant: 'secondary' },
    ],
    outcomes: [{ action: sup('Resubmit for approval', 'إعادة التقديم للاعتماد'), next: sup(`it goes back to ${mgr.name} (${src.stageEn})`, `يعود إلى ${mgr.nameAr ?? mgr.name} (${src.stageAr})`), tone: 'success' }],
    decisionSteps: {
      submit: [
        step(`Back to ${mgr.name}`, `العودة إلى ${mgr.nameAr ?? mgr.name}`, `${mgr.name} reviews your replies and edits — ${src.stageEn}.`, `يراجع ${mgr.nameAr ?? mgr.name} ردودك وتعديلاتك — ${src.stageAr}.`),
        ...((src.decisionSteps?.approve ?? src.decisionSteps?.submit ?? []).slice(0, 2)),
      ],
    },
    rfp: src.rfp ? structuredClone(src.rfp) : undefined,
    trail: [
      { id: 't0', titleEn: 'Request submitted', titleAr: 'تقديم الطلب', actorEn: src.requester.name, actorAr: src.requester.nameAr ?? src.requester.name, state: 'done', at: src.activity[0]?.at },
      { id: 't1', titleEn: `${src.stageEn} — returned`, titleAr: `${src.stageAr} — أُعيد`, actorEn: mgr.name, actorAr: mgr.nameAr ?? mgr.name, state: 'done', at: new Date(now).toISOString() },
      { id: 't2', titleEn: 'Address review comments', titleAr: 'معالجة تعليقات المراجعة', actorEn: src.requester.name, actorAr: src.requester.nameAr ?? src.requester.name, state: 'current', note: { en: 'Awaiting your replies.', ar: 'بانتظار ردودك.' } },
      { id: 't3', titleEn: src.stageEn, titleAr: src.stageAr, actorEn: mgr.name, actorAr: mgr.nameAr ?? mgr.name, state: 'upcoming' },
      ...((src.decisionSteps?.approve ?? src.decisionSteps?.submit ?? []).slice(0, 2).map((x, i) => ({ id: `t4${i}`, titleEn: x.titleEn, titleAr: x.titleAr, actorEn: x.descEn, actorAr: x.descAr, state: 'upcoming' as const }))),
    ],
    activity: [
      { id: 'r0', kind: 'decision', actor: mgr, at: new Date(now).toISOString(), decision: sup('Returned for correction', 'مُعاد للتصحيح'), system: sup(src.stageEn, src.stageAr), text: note },
      ...roots.map((r) => ({ ...r, id: `R-${r.id}`, resolved: false })),
      ...replies.map((r) => ({ ...r, id: `R-${r.id}`, replyTo: `R-${r.replyTo}` })),
    ],
  };
}

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
    summary: sup(`${reqUser()} submitted this request. Review the request details, add comments on any section or field, then approve, return or reject.`, `قدّم ${reqUser(true)} هذا الطلب. راجع تفاصيل الطلب وأضف ملاحظاتك على أي قسم أو حقل، ثم اعتمد الطلب أو أعده أو ارفضه.`),
    stage: sup('Department approval', 'اعتماد الإدارة'), assignee: P.manager, sla: 1, priority: 'high', received: -1,
    actions: [
      { id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' },
      { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
      { id: 'reject', labelEn: 'Reject', labelAr: 'رفض', variant: 'danger', needsNote: true },
    ],
    extra: { approvalRecord, requireReasonOnReject: true, reviewComments: true, decisionSteps: MANAGER_STEPS } },
  { n: 2, type: 'review', title: TITLE.techEvalFromUser(),
    summary: sup('Go through the technical evaluation set by the requester — documents, requirements, evaluation criteria and the passing score. Accept each item or modify it.', 'راجع التقييم الفني الذي حدده مقدّم الطلب — الوثائق والمتطلبات ومعايير التقييم ودرجة الاجتياز. اقبل كل بند أو عدّله.'),
    stage: sup('Technical member review', 'مراجعة العضو الفني'), assignee: P.techMember, sla: 2, priority: 'medium', received: -1,
    actions: [
      { id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary', gated: true },
      { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
    ],
    extra: { techEvalReview: true, techDecisions: {} } },
  { n: 3, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Review the sections Cyber owns — scope, technical requirements, integrations, data classification and the cybersecurity standards. Accept or comment on each requirement, add missing clauses from the library, then submit your review.', 'راجع الأقسام التي يملكها الأمن السيبراني — النطاق والمتطلبات التقنية والتكاملات وتصنيف البيانات ومعايير الأمن السيبراني. اقبل كل متطلب أو علّق عليه، وأضف البنود الناقصة من المكتبة، ثم أرسل مراجعتك.'),
    stage: sup('Specialist review — Cyber Security', 'مراجعة تخصصية — الأمن السيبراني'), assignee: P.cyber, sla: 2, priority: 'medium', received: 0,
    actions: [
      { id: 'approve', labelEn: 'Submit review', labelAr: 'إرسال المراجعة', variant: 'primary', gated: true, decision: sup('Cyber review submitted', 'تم إرسال مراجعة الأمن السيبراني') },
      { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
    ],
    extra: { parallelGroup: 'pg-specialist', deptReview: 'cyber', cyberReview: true, cyberDecisions: {}, cyberDrafts: {}, cyberAdded: [] } },
  { n: 4, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Confirm whether business continuity applies to this service — judged by the service, not the department — then check every continuity clause and its values (RTO, RPO, incident reporting). Add any missing clause from the BCM library.', 'أكّد انطباق استمرارية الأعمال على هذه الخدمة — بحسب الخدمة لا الإدارة — ثم راجع كل بند وقيمه (RTO وRPO والإبلاغ عن الحوادث). أضف أي بند ناقص من المكتبة.'),
    stage: sup('Specialist review — Enterprise Risk (BCM)', 'مراجعة تخصصية — المخاطر المؤسسية'), assignee: P.bcm, sla: 1, priority: 'medium', received: 0,
    actions: [
      { id: 'approve', labelEn: 'Submit review', labelAr: 'إرسال المراجعة', variant: 'primary', gated: true, decision: sup('BCM review submitted', 'تم إرسال مراجعة الاستمرارية') },
      { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
    ],
    extra: { parallelGroup: 'pg-specialist', deptReview: 'bcm', cyberDecisions: {}, cyberDrafts: {}, cyberAdded: [] } },
  { n: 5, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('A high-level operational risk confirmation: is the scope clear, what does the requester’s third-party risk checklist say, and are the right operational controls in the RFP? Comment where needed, then confirm.', 'تأكيد عام للمخاطر التشغيلية: هل النطاق واضح، وماذا تقول قائمة مخاطر الطرف الثالث، وهل الضوابط التشغيلية المناسبة في الطلب؟ علّق عند الحاجة ثم أكّد.'),
    stage: sup('Specialist review — Operational Risk', 'مراجعة تخصصية — المخاطر التشغيلية'), assignee: P.opRisk, sla: 1, priority: 'medium', received: 0,
    actions: [
      { id: 'approve', labelEn: 'Confirm review', labelAr: 'تأكيد المراجعة', variant: 'primary', gated: true, decision: sup('Operational risk review confirmed', 'تم تأكيد مراجعة المخاطر التشغيلية') },
      { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
    ],
    extra: { parallelGroup: 'pg-specialist', deptReview: 'orm', cyberDecisions: {}, cyberDrafts: {}, cyberAdded: [] } },
  { n: 6, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Review the technical sections of the request — scope, technical requirements, standards and licence quantities — against EA standards. Accept each section or comment on it.', 'راجع الأقسام التقنية في الطلب — النطاق والمتطلبات التقنية والمعايير وكميات التراخيص — وفق معايير البنية المؤسسية. اقبل كل قسم أو علّق عليه.'),
    stage: sup('Specialist review — Enterprise Architecture', 'مراجعة تخصصية — البنية المؤسسية'), assignee: P.ea, sla: 3, priority: 'medium', received: 0,
    actions: [{ ...APPROVE_RETURN[0], gated: true }, APPROVE_RETURN[1]],
    extra: { parallelGroup: 'pg-specialist', eaReview: true, eaDecisions: {} } },
  { n: 7, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Check the accounting classification of each BOQ item — Material Group, GL main and sub-account — and accept or correct it.', 'تحقق من التصنيف المحاسبي لكل بند — مجموعة المواد والحساب الرئيسي والفرعي — واقبله أو صحّحه.'),
    stage: sup('Finance review — GL', 'مراجعة مالية — دفتر الأستاذ'), assignee: P.gl, sla: 1, priority: 'medium', received: 0,
    actions: [{ ...APPROVE_RETURN[0], gated: true }, APPROVE_RETURN[1]],
    extra: { parallelGroup: 'pg-specialist', finReview: 'gl', techDecisions: {} } },
  { n: 8, type: 'review', title: TITLE.reviewFromDept(),
    summary: sup('Decide how each BOQ item flagged as an asset is capitalised — direct asset or Asset Under Construction — and which items form one asset.', 'حدد طريقة رسملة كل بند أصل — أصل مباشر أو أصل تحت الإنشاء — والمكونات التي تشكل أصلاً واحداً.'),
    stage: sup('Finance review — Assets', 'مراجعة مالية — الأصول'), assignee: P.assets, sla: 1, priority: 'medium', received: 0,
    actions: [{ ...APPROVE_RETURN[0], gated: true }, APPROVE_RETURN[1]],
    extra: { parallelGroup: 'pg-specialist', finReview: 'assets', finAssetDecisions: {} } },
  { n: 9, type: 'data-collection', title: TITLE.qualFromDept(),
    summary: sup('Add the qualification criteria for this request: ranges and weights for each main and sub-criterion, and the qualification member.', 'أضف معايير التأهيل لهذا الطلب: النطاقات والأوزان لكل معيار رئيسي وفرعي، وعضو التأهيل.'),
    stage: sup('Qualification — Finance', 'التأهيل — المالية'), assignee: P.finQual, sla: 1, priority: 'medium', received: 0,
    actions: [
      { id: 'complete', labelEn: 'Complete', labelAr: 'إكمال', variant: 'primary', gated: true },
    ],
    extra: { qualReview: true, techDecisions: {} } },
  { n: 10, type: 'data-collection', title: TITLE.qualFromDept(),
    summary: sup('Complete the qualification criteria for this request: ranges and weights for each main and sub-criterion, and the qualification member.', 'أكمل معايير التأهيل لهذا الطلب: النطاقات والأوزان لكل معيار رئيسي وفرعي، وعضو التأهيل.'),
    stage: sup('Qualification — Procurement', 'التأهيل — المشتريات'), assignee: P.procQual, sla: 1, priority: 'medium', received: 0,
    actions: [
      { id: 'complete', labelEn: 'Complete', labelAr: 'إكمال', variant: 'primary', gated: true },
    ],
    extra: { qualReview: true, techDecisions: {} } },
  { n: 11, type: 'approval', title: TITLE.qualFromDept(),
    summary: sup('Review the request. With no comments, send it for DOA approval; if it is new or has comments, assign it to an officer.', 'راجع الطلب. إن لم توجد ملاحظات أرسله لاعتماد تفويض الصلاحيات، وإن كان جديداً أو عليه ملاحظات أسنده إلى أخصائي.'),
    stage: sup('Procurement review — Team Lead', 'مراجعة المشتريات — رئيس الفريق'), assignee: P.tl, sla: 4, priority: 'high', received: 0,
    actions: [
      { id: 'approve', labelEn: 'Submit for DOA approval', labelAr: 'إرسال لاعتماد الصلاحيات', variant: 'primary', decision: sup('Submitted for DOA approval', 'أُرسل لاعتماد الصلاحيات') },
      { id: 'complete', labelEn: 'Assign to officer', labelAr: 'إسناد إلى أخصائي', variant: 'secondary', decision: sup('Assigned to officer', 'أُسند إلى أخصائي') },
    ],
    extra: { approvalRecord, assignTo: [P.officer, person('u-yousef', 'Yousef Al-Harthi', 'يوسف الحارثي', 'Procurement Officer', 'أخصائي مشتريات', 'Procurement', 'المشتريات'), person('u-amal', 'Amal Al-Qahtani', 'أمل القحطاني', 'Procurement Officer', 'أخصائي مشتريات', 'Procurement', 'المشتريات')] } },
  { n: 12, type: 'review', title: TITLE.qualFromDept(),
    summary: sup('Officer review of the request before DOA approval. Return it with comments if anything below needs correcting.', 'مراجعة الأخصائي للطلب قبل اعتماد الصلاحيات. أعدها مع ملاحظات إن احتاج أي بند أدناه إلى تصحيح.'),
    stage: sup('Procurement review — Officer', 'مراجعة المشتريات — الأخصائي'), assignee: P.officer, sla: 2, priority: 'high', received: 0,
    actions: [
      { id: 'submit', labelEn: 'Submit for DOA approval', labelAr: 'إرسال لاعتماد الصلاحيات', variant: 'primary', decision: sup('Submitted for DOA approval', 'أُرسل لاعتماد الصلاحيات') },
      { id: 'return', labelEn: 'Return with comments', labelAr: 'إعادة مع ملاحظات', variant: 'secondary', needsNote: true },
    ],
    extra: { findingsLabel: sup('Officer comments', 'ملاحظات الأخصائي'), checklist: reviewChecklist([
      ['Request comments addressed', 'تمت معالجة ملاحظات الطلب'],
      ['Brand name details provided (if a brand is named)', 'تم تقديم تفاصيل العلامة التجارية (إن وُجدت)'],
      ['Request is clear and its sections are linked', 'الطلب واضح وأقسامه مترابطة'],
      ['No formal violations (unclear words or text)', 'لا توجد مخالفات شكلية (كلمات أو نصوص غير واضحة)'],
      ['No systemic violations (mandatory list, brand names)', 'لا توجد مخالفات نظامية (القائمة الإلزامية، العلامات التجارية)'],
    ]) } },
  { n: 13, type: 'approval', title: TITLE.doaFromDept(),
    summary: sup('Approve the request per the delegation of authority (DOA).', 'اعتمد الطلب وفق مصفوفة تفويض الصلاحيات.'),
    stage: sup('DOA approval', 'اعتماد تفويض الصلاحيات'), assignee: P.tl, sla: 2, priority: 'high', received: 0,
    actions: [{ id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' }],
    extra: { approvalRecord, doaInfo: [
      { label: sup('Authority level', 'مستوى الصلاحية'), value: 'Level 3 — Procurement Team Lead' },
      { label: sup('Approval limit', 'حد الاعتماد'), value: 'Up to SAR 10,000,000.00' },
      { label: sup('Request value', 'قيمة الطلب'), value: amountStr },
      { label: sup('DOA reference', 'مرجع تفويض الصلاحيات'), value: 'DOA Matrix 2026 · Procurement §4.2' },
      { label: sup('Prior reviews', 'المراجعات السابقة'), value: '12 of 12 complete' },
      { label: sup('Officer review', 'مراجعة الأخصائي'), value: 'No comments' },
    ] } },
  { n: 14, type: 'approval', title: TITLE.priceFromDept(),
    summary: sup('Approve the estimated price. Request approval completes here and hands off to PR creation in SAP ECC.', 'اعتمد السعر التقديري. يكتمل اعتماد الطلب هنا وينتقل إلى إنشاء طلب الشراء في SAP ECC.'),
    stage: sup('Estimated price approval', 'اعتماد السعر التقديري'), assignee: P.director, sla: 2, priority: 'medium', received: 0,
    actions: [{ id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' }],
    extra: { priceBreakdown: true, approvalRecord: [{ label: sup('Estimated price', 'السعر التقديري'), value: amountStr, emphasis: true }, ...approvalRecord.slice(1)] } },
];


const toRequester = { action: sup('Return', 'إعادة'), next: sup('the request goes back to the requester to update, with your comments', 'يعود الطلب إلى مقدّم الطلب لتحديثه مع ملاحظاتك'), tone: 'warning' as const };
const OUTCOMES: Record<number, NonNullable<Task['outcomes']>> = {
  1: [{ action: sup('Approve', 'اعتماد'), next: sup('specialist and finance reviews start in parallel', 'تبدأ المراجعات التخصصية والمالية بالتوازي'), tone: 'success' }, toRequester,
      { action: sup('Reject', 'رفض'), next: sup('the request is closed and the requester sees your reason', 'يُغلق الطلب ويطّلع مقدّم الطلب على السبب'), tone: 'danger' }],
  2: [{ action: sup('Approve', 'اعتماد'), next: sup('the technical evaluation is marked verified and the request moves to risk review', 'يُعتمد التقييم الفني وينتقل الطلب إلى مراجعة المخاطر'), tone: 'success' }, toRequester],
  3: [{ action: sup('Approve', 'اعتماد'), next: sup('it waits for the other parallel reviewers, then Finance and Procurement qualification starts', 'ينتظر بقية المراجعين بالتوازي ثم يبدأ تأهيل المالية والمشتريات'), tone: 'success' }, toRequester],
  7: [{ action: sup('Approve', 'اعتماد'), next: sup('Finance and Procurement qualification starts', 'يبدأ التأهيل المالي وتأهيل المشتريات'), tone: 'success' }, toRequester],
  9: [{ action: sup('Complete', 'إكمال'), next: sup('Procurement qualification starts', 'يبدأ تأهيل المشتريات'), tone: 'success' }],
  10: [{ action: sup('Complete', 'إكمال'), next: sup('it goes to the Procurement Team Lead for review', 'ينتقل إلى رئيس فريق المشتريات للمراجعة'), tone: 'success' }],
  11: [{ action: sup('Submit for DOA approval', 'إرسال لاعتماد الصلاحيات'), next: sup('the DOA approver receives it (use this when there are no comments)', 'يصل إلى معتمد الصلاحيات (عند عدم وجود ملاحظات)'), tone: 'success' },
       { action: sup('Assign to officer', 'إسناد إلى أخصائي'), next: sup('the officer reviews it (use this for new requests or when there are comments)', 'يراجعه الأخصائي (للطلبات الجديدة أو عند وجود ملاحظات)'), tone: 'info' }],
  12: [{ action: sup('Submit for DOA approval', 'إرسال لاعتماد الصلاحيات'), next: sup('it goes back to the Team Lead for DOA approval', 'يعود إلى رئيس الفريق لاعتماد الصلاحيات'), tone: 'success' }, { ...toRequester, action: sup('Return with comments', 'إعادة مع ملاحظات') }],
  13: [{ action: sup('Approve', 'اعتماد'), next: sup('it goes to the Director to approve the estimated price', 'ينتقل إلى المدير لاعتماد السعر التقديري'), tone: 'success' }],
  14: [{ action: sup('Approve', 'اعتماد'), next: sup('request approval is complete and the PR is created in SAP ECC', 'يكتمل اعتماد الطلب ويُنشأ طلب الشراء في SAP ECC'), tone: 'success' }],
};
const outcomesFor = (n: number) => OUTCOMES[n] ?? (n >= 3 && n <= 6 ? OUTCOMES[3] : n === 8 ? OUTCOMES[7] : []);
// Steps completed before each task (parallel reviewers only follow steps 1–2).
const priorSteps = (n: number) => (n <= 2 ? SPECS.filter((x) => x.n < n) : n <= 8 ? SPECS.filter((x) => x.n <= 2) : SPECS.filter((x) => x.n < n));
const HOUR = 3600000;
const at = (ms: number) => new Date(ms).toISOString();
const PRIOR_NOTE: Record<number, string> = {
  1: 'Budget confirmed against the IT & Digital CAPEX line. Approved.',
  2: 'Technical criteria and weights verified.',
  11: 'New request — assigning to the officer for a full request check.',
};
export const SEED_TASKS: Task[] = SPECS.map((s) => {
  // Working-hour timestamps: two steps per working day (10:00, 14:00), newest = today.
  const prior = priorSteps(s.n);
  const slot = (back: number) => { const d = new Date(base); d.setDate(d.getDate() - Math.ceil(back / 2)); d.setHours(back % 2 ? 10 : 14, 0, 0, 0); if (back === 0) d.setHours(9, 0, 0, 0); return d.getTime(); };
  const received = Math.min(slot(0) + (s.n % 4) * 25 * 60000, base - 30 * 60000);
  const t0 = slot(prior.length + 1) - 60 * 60000;
  const stepAt = (i: number) => slot(prior.length - i);
  const activity: Task['activity'] = [
    { id: 'a0', kind: 'system', actor: REQ.requester, at: at(t0), system: sup(`Request #${REQ.no} submitted`, `تم تقديم الطلب رقم ${REQ.no}`) },
    { id: 'a0c', kind: 'comment', actor: REQ.requester, at: at(t0 + 15 * 60000), text: 'Requesting approval for the ERP upgrade — the current ECC 6.0 support ends in 2027.' },
    ...prior.map((p, i) => ({
      id: `a${p.n}`, kind: 'decision' as const, actor: p.assignee, at: at(stepAt(i)),
      decision: p.n === 11 ? sup('Assigned to officer', 'أُسند إلى أخصائي') : p.n === 12 ? sup('Submitted for DOA approval', 'أُرسل لاعتماد الصلاحيات') : p.type === 'data-collection' ? sup('Qualification criteria added', 'تمت إضافة معايير التأهيل') : sup('Approved', 'تم الاعتماد'),
      text: PRIOR_NOTE[p.n],
      system: sup(p.stage.en, p.stage.ar),
    })),
    { id: 'aN', kind: 'system', actor: s.assignee, at: at(received), system: sup(`Assigned to ${s.assignee.name} — ${s.stage.en}`, `أُسند إلى ${s.assignee.nameAr} — ${s.stage.ar}`) },
  ];
  return {
    id: `TSK-${REQ.no}-${String(s.n).padStart(2, '0')}`,
    type: s.type,
    titleEn: s.title.en, titleAr: s.title.ar,
    summaryEn: s.summary.en, summaryAr: s.summary.ar,
    state: 'available', priority: s.priority,
    entity: { kind: 'RFP', ref: REQ.ref, titleEn: REQ.titleEn, titleAr: REQ.titleAr },
    project: REQ.project,
    amount: REQ.amount,
    requester: REQ.requester, assignee: s.assignee,
    department: sup(reqDept(), reqDept(true)),
    stageEn: s.stage.en, stageAr: s.stage.ar,
    receivedAt: at(received), dueAt: at(received + s.sla * 24 * HOUR),
    mineAction: true,
    actions: s.actions,
    outcomes: outcomesFor(s.n),
    reviewComments: true,
    decisionSteps: stepsFor(s.n, s.assignee),
    slaHours: s.sla * 24,
    activity,
    ...s.extra,
  };
});

// ── RFP / request detail + workflow trail ─────────────────────────────────────

// Large tender request, reused by the RFP-2026-041 tasks.
const RFP_S4HANA: RfpDetail = {
  refId: 'REQ-2026-041',
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
      itemsEn: ['SuccessFactors / HR payroll', 'Hardware and hosting (covered by REQ-2026-037)'],
      itemsAr: ['نظام SuccessFactors والرواتب', 'الأجهزة والاستضافة (مشمولة في REQ-2026-037)'] },
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
function completeRfp(r0: RfpDetail): RfpDetail {
  // Deliverables live in one place: a "Deliverables & timeline" scope block becomes the deliverables table.
  const dBlock = r0.scopeBlocks?.find((b) => /^Deliverables/.test(b.headEn));
  const r: RfpDetail = dBlock && !r0.deliverables ? {
    ...r0,
    scopeBlocks: r0.scopeBlocks!.filter((b) => b !== dBlock),
    deliverables: dBlock.itemsEn.map((x, i) => { const [name, due] = x.split(' — '); return { phase: `Phase ${i + 1}`, name, due, desc: undefined }; }),
  } : r0;
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
    boq: r.boq.map((l) => ({ hasBrand: false, ...l })),
    projectCode: r.projectCode ?? 'PRJ-2025-001',
    projectNameEn: r.projectNameEn ?? r.titleEn,
    projectNameAr: r.projectNameAr ?? r.titleAr,
    route: r.route ?? (/E-Market/i.test(r.meta.find((m) => m.label.en === 'Procurement route')?.value ?? '') ? 'souq-etimad' : 'tendering'),
    costCenters: r.costCenters ?? [r.meta.find((m) => m.label.en === 'Cost center')?.value ?? ''].filter(Boolean),
    purposeEn: r.purposeEn ?? `The purpose of this tender is to procure ${r.titleEn} to enhance operational efficiency, support digital transformation objectives and ensure compliance with applicable regulatory standards.`,
    purposeAr: r.purposeAr ?? `الغرض من هذه المنافسة شراء ${r.titleAr} لتعزيز الكفاءة التشغيلية ودعم أهداف التحول الرقمي وضمان الامتثال للأنظمة المعمول بها.`,
    projectItems: r.projectItems ?? r.boq.slice(0, 4).map((l) => ({ en: l.budgetEn ?? l.itemEn, ar: l.budgetAr ?? l.itemAr })).filter((x, i, a) => a.findIndex((y) => y.en === x.en) === i),
    termsEn: r.termsEn ?? 'Vendor must hold valid Saudi registrations; prices are fixed for the contract duration; warranty of 12 months from final acceptance; penalties for delay up to 10% of the contract value.',
    termsAr: r.termsAr ?? 'يجب أن يحمل المورد تسجيلات سعودية سارية؛ الأسعار ثابتة طوال مدة العقد؛ ضمان 12 شهراً من القبول النهائي؛ غرامات تأخير حتى 10% من قيمة العقد.',
    includes: r.includes ?? [{ en: 'Technology', ar: 'تقنية' }, { en: 'Consultancy', ar: 'استشارات' }],
    location: r.location ?? 'Riyadh — Head Office',
    startDate: r.startDate ?? new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10),
    duration: r.duration ?? r.meta.find((m) => m.label.en === 'Contract duration')?.value ?? '12 months',
    brand: r.brand ?? { has: false },
    deliverables: r.deliverables ?? [
      { phase: 'Phase 1', name: 'Kick-off and delivery plan', due: 'Week 2', desc: 'Project plan, RACI and delivery schedule approved.' },
      { phase: 'Phase 2', name: 'Delivery and installation', due: 'Week 8', desc: 'All BOQ items delivered, installed and configured.' },
      { phase: 'Phase 3', name: 'Final acceptance', due: 'Week 12', desc: 'Acceptance tests passed and handover signed.' },
    ],
    regulatory: r.regulatory ?? ['Commercial Registration', 'NCA Compliance Certificate', 'ZATCA E-invoicing Compliance'],
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

// Every task relates to RFP #4433 — one shared RFP record.
const REQ_RFP = completeRfp({
  ...RFP_S4HANA,
  refId: REQ.ref, titleEn: REQ.titleEn, titleAr: REQ.titleAr,
  meta: RFP_S4HANA.meta.map((m) => m.label.en === 'Requesting department' ? { ...m, value: reqDept() } : m),
});
for (const tk of SEED_TASKS) {
  tk.trail = trailFor(tk);
  tk.rfp = REQ_RFP;
}

// ── Finance (GL / Assets) — BOQ lines with their accounting classification ──
// AI-prepared at request creation; a few lines deliberately disagree so the GL
// review shows what Finance looks for (Purchase Type vs Material Group, missing sub-account).
const FIN_OVERLAY: Pick<FinLine, 'finPurchaseType' | 'materialGroup' | 'componentRole'>[] = [
  { finPurchaseType: 'asset', materialGroup: 'MG-SW-LIC', componentRole: 'licence' },        // Licences — professional
  { finPurchaseType: 'asset', materialGroup: 'MG-SW-LIC', componentRole: 'licence' },        // Licences — limited
  { finPurchaseType: 'service-asset', materialGroup: 'MG-IT-IMP', componentRole: 'implementation' }, // Core implementation (capitalised)
  { finPurchaseType: 'service', materialGroup: 'MG-IT-IMP', componentRole: 'implementation' }, // EWM implementation
  { finPurchaseType: 'service', materialGroup: 'MG-IT-CONS' },                               // PM services
  { finPurchaseType: 'asset', materialGroup: 'MG-IT-IMP', componentRole: 'implementation' },  // Data migration — PT disagrees
  { finPurchaseType: 'service', materialGroup: 'MG-TRN' },                                   // Training
  { finPurchaseType: 'service', materialGroup: 'MG-IT-INST', componentRole: 'installation' }, // Hypercare — no sub-account
  { finPurchaseType: 'consumable', materialGroup: 'MG-IT-MNT' },                             // Support & maintenance — PT disagrees
];
export function finLinesFor(rfp: RfpDetail): FinLine[] {
  return rfp.boq.map((l, i) => ({
    key: `L${i + 1}`, itemEn: l.itemEn, itemAr: l.itemAr, descEn: l.descEn, descAr: l.descAr,
    no: i + 1, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice, amount: (Number(l.qty) || 1) * l.unitPrice,
    ...(FIN_OVERLAY[i] ?? { finPurchaseType: 'service', materialGroup: 'MG-IT-CONS' }),
  }));
}
for (const tk of SEED_TASKS) if (tk.finReview && tk.rfp) tk.finLines = finLinesFor(tk.rfp);

// Technical standards on the demo request (as pulled into its Scope of Work at creation).
REQ_RFP.deploymentModel = 'saas';
REQ_RFP.techAnswers = { saas: true, 'own-servers': false, build: true, integrates: true, migration: true, 'personal-data': true, 'external-users': false, critical: true, ai: false };
// Business continuity + third-party risk, as the requester answered them in Review & Confirm.
REQ_RFP.bcm = {
  answers: { critical: true, outage: true, people: false, improve: false },
  clauses: [{ id: 'rto', value: '8 hours' }, { id: 'rpo', value: '4 hours' }, { id: 'bcp' }, { id: 'dr' }, { id: 'incident', value: '4 hours' }, { id: 'recovery' }],
};
REQ_RFP.tpr = { access: true, data: true, hosted: true, subcontract: true, single: true, customer: false };
REQ_RFP.ormControls = ['sla', 'exit'];
REQ_RFP.techStandards = [
  ...['h1', 'h2', 'h4', 'i1', 'i2', 'i3', 's1', 's2', 's3', 's4', 'd1', 'd2', 'd3', 'd4', 'n1', 'n2', 'n3', 'n4', 'a2', 'p1', 'p2'].map((id) => ({ id, status: 'included' as const })),
  { id: 'a1', status: 'na' as const, naReason: 'Current-state architecture is already documented in the EA repository (EA-2025-114).', naReasonAr: 'بنية الوضع الحالي موثقة مسبقاً في مستودع البنية المؤسسية (EA-2025-114).' },
];


// ── Request detail page (My Requests) ────────────────────────────────────────

/** The approval stages a request passes through, in order (same as the Inbox tasks). */
export const APPROVAL_STAGES: { stage: Bilingual; assignee: Person; sla: number }[] =
  SPECS.map((s) => ({ stage: s.stage, assignee: s.assignee, sla: s.sla }));
export const REQUESTER = P.requester;

/** Full RFP record for any request, so the detail page shows every create-request section. */

// ── BOQ templates: realistic line items per request kind (scaled to the request value) ──
type BoqRow = RfpDetail['boq'][number];
const B = (itemEn: string, itemAr: string, descEn: string, descAr: string, qty: number, unit: string, unitPrice: number, budgetEn: string, budgetAr: string, category: 'Service' | 'Material', months: number): Omit<BoqRow, 'delivery'> & { months: number } =>
  ({ itemEn, itemAr, descEn, descAr, qty: String(qty), unit, unitPrice, budgetEn, budgetAr, category, months });
const BOQ_TEMPLATES: Record<'goods' | 'it' | 'services', ReturnType<typeof B>[]> = {
  goods: [
    B('Primary units', 'الوحدات الرئيسية', 'Main items as per the technical specification', 'البنود الرئيسية حسب المواصفات الفنية', 120, 'Each', 4200, 'Equipment & Furniture', 'المعدات والأثاث', 'Material', 1),
    B('Accessories kit', 'طقم الملحقات', 'Chargers, cables, adapters and protective cases', 'الشواحن والكابلات والمحولات والأغطية الواقية', 120, 'Set', 380, 'Equipment & Furniture', 'المعدات والأثاث', 'Material', 1),
    B('Spare units (5%)', 'وحدات احتياطية (5٪)', 'Hot spares held by the service desk', 'وحدات احتياطية لدى مكتب الخدمة', 6, 'Each', 4200, 'Equipment & Furniture', 'المعدات والأثاث', 'Material', 1),
    B('Delivery & installation', 'التوصيل والتركيب', 'Delivery to Riyadh HQ, unpacking, placement and disposal of packaging', 'التوصيل للمقر الرئيسي بالرياض وفك التغليف والتركيب والتخلص من مواد التغليف', 1, 'LS', 38000, 'Logistics & Installation', 'الخدمات اللوجستية والتركيب', 'Service', 2),
    B('Asset tagging & registration', 'ترميز وتسجيل الأصول', 'Barcode tags and registration in the asset register', 'ملصقات الباركود والتسجيل في سجل الأصول', 126, 'Each', 25, 'Logistics & Installation', 'الخدمات اللوجستية والتركيب', 'Service', 2),
    B('Imaging & configuration', 'التهيئة والإعداد', 'Standard build, security baseline and enrolment', 'الإعداد القياسي وخط الأساس الأمني والتسجيل', 120, 'Each', 150, 'Logistics & Installation', 'الخدمات اللوجستية والتركيب', 'Service', 2),
    B('Extended warranty (3 years)', 'ضمان ممتد (3 سنوات)', 'Next-business-day on-site replacement', 'استبدال في الموقع في يوم العمل التالي', 120, 'Each', 290, 'Warranty & Support', 'الضمان والدعم', 'Service', 3),
    B('User guides & training', 'أدلة المستخدم والتدريب', 'Quick-start guides (Arabic/English) and 2 sessions', 'أدلة البدء السريع (عربي/إنجليزي) وجلستان تدريبيتان', 2, 'Session', 6500, 'Training', 'التدريب', 'Service', 3),
  ],
  it: [
    B('Software subscription', 'اشتراك البرمجيات', 'Annual subscription — enterprise tier', 'اشتراك سنوي — فئة المؤسسات', 3, 'Year', 420000, 'Software Licenses', 'تراخيص البرمجيات', 'Material', 1),
    B('Named user licences', 'تراخيص المستخدمين', 'Professional user licences', 'تراخيص مستخدمين احترافية', 250, 'License', 1800, 'Software Licenses', 'تراخيص البرمجيات', 'Material', 1),
    B('Infrastructure & hosting', 'البنية التحتية والاستضافة', 'Production, DR and non-production environments in-Kingdom', 'بيئات الإنتاج والتعافي والاختبار داخل المملكة', 36, 'Month', 22000, 'Cloud & Hosting', 'السحابة والاستضافة', 'Service', 2),
    B('Solution design', 'تصميم الحل', 'Requirements, blueprint and solution architecture', 'المتطلبات والتصميم وبنية الحل', 1, 'LS', 260000, 'Implementation Services', 'خدمات التنفيذ', 'Service', 3),
    B('Build & configuration', 'البناء والتهيئة', 'Configuration, integrations and custom development', 'التهيئة والتكامل والتطوير المخصص', 1, 'LS', 640000, 'Implementation Services', 'خدمات التنفيذ', 'Service', 7),
    B('Integration (SAP CPI)', 'التكامل (SAP CPI)', 'Interfaces with SAP, HR and Etimad via CPI', 'واجهات التكامل مع SAP والموارد البشرية واعتماد عبر CPI', 6, 'Interface', 48000, 'Implementation Services', 'خدمات التنفيذ', 'Service', 7),
    B('Data migration', 'ترحيل البيانات', 'Extraction, cleansing, mock loads and reconciliation', 'الاستخراج والتنقية والتحميل التجريبي والتسوية', 1, 'LS', 180000, 'Implementation Services', 'خدمات التنفيذ', 'Service', 8),
    B('Testing (SIT & UAT)', 'الاختبارات (التكامل والقبول)', 'Test scripts, defect management and sign-off', 'سيناريوهات الاختبار وإدارة العيوب والاعتماد', 1, 'LS', 120000, 'Implementation Services', 'خدمات التنفيذ', 'Service', 9),
    B('Security assessment', 'التقييم الأمني', 'Penetration test and NCA ECC compliance review', 'اختبار الاختراق ومراجعة الامتثال لضوابط الأمن السيبراني', 1, 'LS', 75000, 'Security & Compliance', 'الأمن والامتثال', 'Service', 9),
    B('Training & knowledge transfer', 'التدريب ونقل المعرفة', 'Key-user and admin training, Arabic materials', 'تدريب المستخدمين الرئيسيين والمشرفين بمواد عربية', 4, 'Batch', 28000, 'Training', 'التدريب', 'Service', 10),
    B('Hypercare', 'الدعم بعد التشغيل', 'On-site stabilisation after go-live', 'فريق استقرار في الموقع بعد التشغيل', 3, 'Month', 55000, 'Support & Maintenance', 'الدعم والصيانة', 'Service', 12),
    B('Support & maintenance', 'الدعم والصيانة', 'Helpdesk Sun–Thu, 4-hour SLA, updates and patches', 'مكتب مساعدة الأحد–الخميس، استجابة 4 ساعات، تحديثات وتصحيحات', 2, 'Year', 140000, 'Support & Maintenance', 'الدعم والصيانة', 'Service', 24),
  ],
  services: [
    B('Service mobilisation', 'تجهيز الخدمة', 'Team onboarding, site survey and service plan', 'تجهيز الفريق ومسح الموقع وخطة الخدمة', 1, 'LS', 45000, 'Professional Services', 'الخدمات المهنية', 'Service', 1),
    B('Senior consultant', 'استشاري أول', 'Lead consultant — full time', 'استشاري رئيسي — دوام كامل', 12, 'Month', 68000, 'Professional Services', 'الخدمات المهنية', 'Service', 12),
    B('Consultant', 'استشاري', 'Delivery consultants — 2 FTE', 'استشاريون للتنفيذ — موظفان بدوام كامل', 24, 'Month', 42000, 'Professional Services', 'الخدمات المهنية', 'Service', 12),
    B('Specialist days (on demand)', 'أيام عمل تخصصية (عند الطلب)', 'Subject-matter experts called off as needed', 'خبراء متخصصون عند الحاجة', 60, 'Day', 5200, 'Professional Services', 'الخدمات المهنية', 'Service', 12),
    B('Reports & deliverables', 'التقارير والمخرجات', 'Monthly reports and final report in Arabic & English', 'تقارير شهرية وتقرير نهائي بالعربية والإنجليزية', 12, 'Report', 6000, 'Reporting', 'التقارير', 'Service', 12),
    B('Tools & consumables', 'الأدوات والمستهلكات', 'Materials and consumables used to deliver the service', 'المواد والمستهلكات المستخدمة لتقديم الخدمة', 12, 'Month', 8500, 'Materials & Consumables', 'المواد والمستهلكات', 'Material', 12),
    B('Quality assurance', 'ضمان الجودة', 'Quarterly quality audits and KPI dashboard', 'تدقيق جودة ربع سنوي ولوحة مؤشرات الأداء', 4, 'Quarter', 18000, 'Quality & Compliance', 'الجودة والامتثال', 'Service', 12),
    B('Workshops', 'ورش العمل', 'Stakeholder workshops and awareness sessions', 'ورش عمل لأصحاب المصلحة وجلسات توعية', 6, 'Session', 9500, 'Training', 'التدريب', 'Service', 6),
    B('Contingency (call-off)', 'بند احتياطي (عند الطلب)', 'Additional services approved by the contract manager', 'خدمات إضافية يعتمدها مدير العقد', 1, 'LS', 60000, 'Professional Services', 'الخدمات المهنية', 'Service', 12),
  ],
};
function boqKind(title: string): 'goods' | 'it' | 'services' {
  if (/laptop|chair|toner|supplies|stationery|UPS|equipment|furniture|AV|vehicle/i.test(title)) return 'goods';
  if (/cleaning|audit|recruit|consult|testing|wellness|leasing|program|agency|managed services|research|legal/i.test(title)) return 'services';
  return 'it';
}
function boqFor(title: string, amount: number, start: Date): BoqRow[] {
  const rows = BOQ_TEMPLATES[boqKind(title)];
  const sub = rows.reduce((s, r) => s + Number(r.qty) * r.unitPrice, 0) || 1;
  const k = amount / 1.15 / sub;
  return rows.map(({ months, ...r }) => {
    const d = new Date(start); d.setMonth(d.getMonth() + months);
    return { ...r, unitPrice: Math.max(1, Math.round(r.unitPrice * k)), delivery: d.toISOString().slice(0, 10) };
  });
}

export function requestRfpFor(o: { refId: string; titleEn: string; titleAr: string; deptEn: string; deptAr: string; amount: number; type: 'tendering' | 'souq-etimad'; costCenter: string; start?: Date }): RfpDetail {
  const base = completeRfp(RFP_S4HANA);
  // Scale the sample BOQ so it adds up to the request's estimated value (excl. VAT).
  const sub = base.boq.reduce((s, l) => s + (Number(l.qty) || 1) * l.unitPrice, 0) || 1;
  const k = o.amount / 1.15 / sub;
  // The ERP upgrade keeps the detailed S/4HANA BOQ; other requests get a BOQ for their kind.
  const boq = /ERP System Upgrade/.test(o.titleEn)
    ? base.boq.map((l) => ({ ...l, unitPrice: Math.round(l.unitPrice * k) }))
    : boqFor(o.titleEn, o.amount, o.start ?? new Date());
  const esouq = o.type === 'souq-etimad';
  return {
    ...base,
    refId: o.refId, titleEn: o.titleEn, titleAr: o.titleAr,
    summaryEn: `${o.titleEn} for ${o.deptEn} — supply, delivery and support against the approved bill of quantities.`,
    summaryAr: `${o.titleAr} لصالح ${o.deptAr} — التوريد والتسليم والدعم وفق جدول الكميات المعتمد.`,
    scopeEn: `Deliver ${o.titleEn.toLowerCase()} for ${o.deptEn}, covering supply, implementation, testing and handover, with training, warranty and post-delivery support as defined in the bill of quantities and the technical specification.`,
    scopeAr: `تنفيذ «${o.titleAr}» لصالح ${o.deptAr}، ويشمل التوريد والتنفيذ والاختبار والتسليم، مع التدريب والضمان والدعم بعد التسليم وفق جدول الكميات والمواصفات الفنية.`,
    scopeBlocks: [
      { headEn: 'Objectives', headAr: 'الأهداف', itemsEn: ['Meet the department’s operational requirement on time', 'Comply with the technical specification and NCA controls', 'Achieve best value within the approved budget'], itemsAr: ['تلبية الاحتياج التشغيلي للإدارة في الوقت المحدد', 'الالتزام بالمواصفات الفنية وضوابط الهيئة الوطنية للأمن السيبراني', 'تحقيق أفضل قيمة ضمن الميزانية المعتمدة'] },
      { headEn: 'In scope', headAr: 'ضمن النطاق', itemsEn: ['Supply and delivery of all BOQ items', 'Installation, configuration and testing', 'Training and knowledge transfer'], itemsAr: ['توريد وتسليم جميع بنود جدول الكميات', 'التركيب والإعداد والاختبار', 'التدريب ونقل المعرفة'] },
      { headEn: 'Out of scope', headAr: 'خارج النطاق', itemsEn: ['Civil works and building modifications', 'Items already covered by existing contracts'], itemsAr: ['الأعمال المدنية وتعديلات المباني', 'البنود المشمولة بعقود قائمة'] },
    ],
    documents: [
      { en: 'Scope of work', ar: 'نطاق العمل', type: 'PDF', size: '1.2 MB', by: o.deptEn },
      { en: 'Technical specification', ar: 'المواصفات الفنية', type: 'PDF', size: '860 KB', by: o.deptEn },
      { en: 'Bill of quantities', ar: 'جدول الكميات', type: 'XLSX', size: '74 KB', by: o.deptEn },
      { en: 'Budget confirmation', ar: 'تأكيد الميزانية', type: 'PDF', size: '140 KB', by: 'Finance' },
      { en: 'Market price survey', ar: 'دراسة أسعار السوق', type: 'DOCX', size: '210 KB', by: o.deptEn },
    ],
    meta: base.meta.map((m) =>
      m.label.en === 'Project' ? { ...m, value: o.titleEn } :
      m.label.en === 'Cost center' ? { ...m, value: o.costCenter } :
      m.label.en === 'Contract duration' ? { ...m, value: esouq ? 'One-off purchase' : '12 months' } :
      m.label.en === 'Requesting department' ? { ...m, value: o.deptEn } :
      m.label.en === 'Estimated value' ? { ...m, value: `SAR ${o.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` } :
      m.label.en === 'Procurement route' ? { ...m, value: esouq ? 'Etimad E-Market' : 'Competitive Tender' } : m)
      .filter((m) => !esouq || !['Evaluation split', 'Suppliers invited', 'Planned award'].includes(m.label.en)),
    boq: boq.map((l) => ({ hasBrand: false, ...l })),
    purposeEn: `The purpose of this tender is to procure ${o.titleEn} for ${o.deptEn}, to enhance operational efficiency and ensure compliance with applicable regulatory standards.`,
    purposeAr: `الغرض من هذه المنافسة شراء «${o.titleAr}» لصالح ${o.deptAr} لتعزيز الكفاءة التشغيلية وضمان الامتثال للأنظمة المعمول بها.`,
    projectItems: boq.map((l) => ({ en: l.budgetEn ?? l.itemEn, ar: l.budgetAr ?? l.itemAr })).filter((x, i, a) => a.findIndex((y) => y.en === x.en) === i).slice(0, 5),
    costCenters: [o.costCenter],
    projectNameEn: o.titleEn, projectNameAr: o.titleAr, route: o.type,
    deliverables: /ERP System Upgrade/.test(o.titleEn) ? base.deliverables : [
      { phase: 'Phase 1', name: 'Kick-off and delivery plan', due: 'Week 2', desc: 'Project plan, RACI and delivery schedule approved.' },
      { phase: 'Phase 2', name: 'Delivery and installation', due: 'Week 8', desc: 'All BOQ items delivered, installed and configured.' },
      { phase: 'Phase 3', name: 'Final acceptance', due: 'Week 12', desc: 'Acceptance tests passed and handover signed.' },
    ],
    ...(o.start ? { startDate: o.start.toISOString().slice(0, 10) } : {}),
    duration: esouq ? 'One-off purchase' : '12 months',
    // Etimad E-Market requests skip payment, evaluation and qualification (shorter flow).
    ...(esouq ? { payment: [], evaluation: [], qualification: [], qualCriteria: [], techRequirements: [], techDocs: [], evalCommittee: [], qualCommittee: [], qualPassing: undefined, techPassing: undefined, deliverables: [], termsEn: undefined, termsAr: undefined } : {}),
  };
}

// ── Budget checker use cases (manager "Department approval" tasks) ──────────────
// RFP #4433: fits the budget. Two more manager approvals show both outcomes:
// RFP #4471 fits (approve enabled), RFP #4478 exceeds the budget (approve blocked).
SEED_TASKS[0].budgetCheck = { fundCenter: 'FC-IT-1000', commitmentItem: 'CAPEX-ERP', fiscalYear: 2026, total: 14_500_000, consumed: 2_180_000 };

function managerApprovalFor(o: {
  no: string; titleEn: string; titleAr: string; amount: number; requester: Person; minutesAgo: number; priority: Task['priority']; manager?: Person;
  budget: NonNullable<Task['budgetCheck']>; note: string;
}): Task {
  const src = SEED_TASKS[0];
  const swap = (x: string) => x
    .split(REQ.no).join(o.no)
    .split(REQ.titleEn).join(o.titleEn).split(REQ.titleAr).join(o.titleAr)
    .split(REQ.requester.name).join(o.requester.name).split(REQ.requester.nameAr ?? '§').join(o.requester.nameAr ?? o.requester.name)
    .split(REQ.requester.dept ?? '§').join(o.requester.dept ?? '').split(REQ.requester.deptAr ?? '§').join(o.requester.deptAr ?? '');
  const { rfp: _r, trail: _t, ...rest } = src;
  const tk = JSON.parse(swap(JSON.stringify(rest))) as Task;
  const received = new Date(Date.now() - o.minutesAgo * 60000);
  tk.id = `TSK-${o.no}-01`;
  tk.amount = o.amount;
  tk.priority = o.priority;
  tk.requester = o.requester;
  tk.receivedAt = received.toISOString();
  tk.dueAt = new Date(+received + 24 * 3600000).toISOString();
  tk.budgetCheck = o.budget;
  if (o.manager) tk.assignee = o.manager;
  tk.approvalRecord = (tk.approvalRecord ?? []).map((r) => r.label.en === 'Request value' ? { ...r, value: fmtSARPlain(o.amount) } : r.label.en === 'Project' ? { ...r, value: o.titleEn } : r);
  tk.project = { en: o.titleEn, ar: o.titleAr };
  tk.activity = [
    { id: 'a0', kind: 'system', actor: o.requester, at: new Date(+received - 20 * 60000).toISOString(), system: { en: `Request #${o.no} submitted`, ar: `تم تقديم الطلب رقم ${o.no}` } },
    { id: 'a0c', kind: 'comment', actor: o.requester, at: new Date(+received - 15 * 60000).toISOString(), text: o.note },
    { id: 'aN', kind: 'system', actor: tk.assignee, at: received.toISOString(), system: { en: `Assigned to ${tk.assignee.name} — Department approval`, ar: `أُسند إلى ${tk.assignee.nameAr} — اعتماد الإدارة` } },
  ];
  tk.rfp = requestRfpFor({ refId: `REQ-${o.no}`, titleEn: o.titleEn, titleAr: o.titleAr, deptEn: o.requester.dept ?? '', deptAr: o.requester.deptAr ?? '', amount: o.amount, type: 'tendering', costCenter: o.budget.fundCenter });
  tk.trail = trailFor(tk).map((st) => st.titleEn === 'Department approval' ? { ...st, actorEn: tk.assignee.name, actorAr: tk.assignee.nameAr ?? tk.assignee.name } : st);
  return tk;
}
function fmtSARPlain(n: number) { return 'SAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 2 }); }

SEED_TASKS.unshift(
  managerApprovalFor({
    no: '4478', titleEn: 'SIEM & SOC Managed Services', titleAr: 'خدمات مُدارة لمركز العمليات الأمنية', amount: 5_400_000, priority: 'urgent', minutesAgo: 25,
    requester: person('u-khalidq', 'Khalid Al-Qahtani', 'خالد القحطاني', 'Requester', 'مقدّم الطلب', 'Information Security', 'أمن المعلومات'),
    manager: person('u-nasser', 'Nasser Al-Harthi', 'ناصر الحارثي', 'Department Manager', 'مدير الإدارة', 'Information Security', 'أمن المعلومات'),
    budget: { fundCenter: 'FC-SEC-2200', commitmentItem: 'OPEX-MANAGED-SVC', fiscalYear: 2026, total: 6_000_000, consumed: 2_150_000 },
    note: 'SOC coverage must start before the current contract ends in Q1 — please prioritise.',
  }),
  managerApprovalFor({
    no: '4471', titleEn: 'Cloud Infrastructure Migration', titleAr: 'ترحيل البنية التحتية السحابية', amount: 1_800_000, priority: 'high', minutesAgo: 70,
    requester: person('u-fatimaz', 'Fatima Al-Zahrani', 'فاطمة الزهراني', 'Requester', 'مقدّم الطلب', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي'),
    budget: { fundCenter: 'FC-IT-1000', commitmentItem: 'CAPEX-CLOUD', fiscalYear: 2026, total: 3_200_000, consumed: 620_000 },
    note: 'Migration of the remaining on-prem workloads to the sovereign cloud region.',
  }),
);

// Keep the manager's "Review & approve" tasks at the top of the inbox (soonest due).
[['TSK-4478-01', 4], ['TSK-4471-01', 5], ['TSK-4433-01', 6]].forEach(([id, h]) => {
  const tk = SEED_TASKS.find((x) => x.id === id);
  if (tk) tk.dueAt = new Date(Date.now() + (h as number) * 3600000).toISOString();
});

// "Changes since your review" — GL already approved request #4429; the requester then changed it.
{
  const gl = SEED_TASKS.find((x) => x.finReview === 'gl');
  if (gl) {
    const no = '4429', titleEn = 'Data Center Network Refresh', titleAr = 'تحديث شبكة مركز البيانات';
    const received = new Date(Date.now() - 50 * 60000);
    const reviewedAt = new Date(Date.now() - 3 * 24 * 3600000);
    const changes: FinChange[] = [
      { id: 'c1', lineEn: 'Scope of work', lineAr: 'نطاق العمل', fieldEn: 'Wording', fieldAr: 'الصياغة', oldV: 'Replace core switches', newV: 'Replace core and distribution switches, including cabling', impact: 'info' },
      { id: 'c2', lineEn: 'Cisco Catalyst 9300 switch', lineAr: 'محول Cisco Catalyst 9300', fieldEn: 'Quantity', fieldAr: 'الكمية', oldV: '24', newV: '32', impact: 'decide' },
      { id: 'c3', lineEn: 'Network monitoring licences', lineAr: 'تراخيص مراقبة الشبكة', fieldEn: 'New item', fieldAr: 'بند جديد', oldV: '—', newV: '1 LS · SAR 180,000', impact: 'decide' },
      { id: 'c4', lineEn: 'Structured cabling', lineAr: 'التمديدات المهيكلة', fieldEn: 'Material group', fieldAr: 'مجموعة المواد', oldV: 'Installation & Delivery · MG-IT-INST', newV: 'Network Equipment · MG-IT-NET', impact: 'rereview' },
      { id: 'c5', lineEn: 'Structured cabling', lineAr: 'التمديدات المهيكلة', fieldEn: 'Asset flag', fieldAr: 'تصنيف الأصل', oldV: 'Non-asset', newV: 'Asset', impact: 'rereview' },
      { id: 'c6', lineEn: 'Firewall support (3 years)', lineAr: 'دعم الجدار الناري (3 سنوات)', fieldEn: 'GL sub-account', fieldAr: 'الحساب الفرعي', oldV: '4260-01 Support & Maintenance Contracts', newV: '4250-03 Advisory Fees', impact: 'rereview' },
    ];
    const tk: Task = {
      ...structuredClone(gl),
      id: `TSK-${no}-07R`,
      titleEn: `Request #${no} changed after your GL approval`, titleAr: `تغيّر الطلب رقم ${no} بعد اعتمادك المالي`,
      summaryEn: `${REQ.requester.name} changed request #${no} after you approved it. Check what changed and decide whether it needs another GL review.`,
      summaryAr: `عدّل ${REQ.requester.nameAr ?? REQ.requester.name} الطلب رقم ${no} بعد اعتمادك له. تحقق مما تغيّر وقرر ما إذا كان يحتاج إلى مراجعة جديدة.`,
      entity: { kind: 'RFP', ref: `REQ-${no}`, titleEn, titleAr },
      project: { en: titleEn, ar: titleAr },
      amount: 2_350_000,
      finReview: 'changes', finChanges: changes, finLines: undefined, techDecisions: {},
      receivedAt: received.toISOString(), dueAt: new Date(+received + 24 * 3600000).toISOString(),
      priority: 'high',
      actions: [{ id: 'approve', labelEn: 'No re-review needed', labelAr: 'لا يلزم إعادة المراجعة', variant: 'primary', decision: { en: 'No re-review needed', ar: 'لا يلزم إعادة المراجعة' } }],
      activity: [
        { id: 'a0', kind: 'decision', actor: gl.assignee, at: reviewedAt.toISOString(), decision: { en: 'Approved', ar: 'تم الاعتماد' }, system: { en: 'Finance review — GL', ar: 'مراجعة مالية — دفتر الأستاذ' } },
        { id: 'a1', kind: 'system', actor: REQ.requester, at: new Date(+received - 30 * 60000).toISOString(), system: { en: `Request #${no} changed after Procurement comments (6 changes)`, ar: `تم تعديل الطلب رقم ${no} بعد ملاحظات المشتريات (6 تغييرات)` } },
        { id: 'aN', kind: 'system', actor: gl.assignee, at: received.toISOString(), system: { en: `Assigned to ${gl.assignee.name} — Request changed after your approval`, ar: `أُسند إلى ${gl.assignee.nameAr} — تغييرات منذ مراجعتك` } },
      ],
    };
    tk.rfp = requestRfpFor({ refId: `REQ-${no}`, titleEn, titleAr, deptEn: REQ.requester.dept ?? '', deptAr: REQ.requester.deptAr ?? '', amount: 2_350_000, type: 'tendering', costCenter: 'FC-IT-1000' });
    SEED_TASKS.push(tk);
  }
}

// ── Procurement team: queue + delegation ────────────────────────────────────────
// Officers the Team Lead assigns queued requests to, and colleagues a user can
// delegate their inbox to. Workload = open requests each officer holds today.
export const PROC_TEAM: (Person & { load: number })[] = [
  { ...ME, load: 4 },
  { ...person('u-yousef', 'Yousef Al-Harthi', 'يوسف الحارثي', 'Procurement Officer', 'أخصائي مشتريات', 'Procurement', 'المشتريات'), load: 2 },
  { ...person('u-amal', 'Amal Al-Qahtani', 'أمل القحطاني', 'Procurement Officer', 'أخصائي مشتريات', 'Procurement', 'المشتريات'), load: 6 },
  { ...person('u-rawan', 'Rawan Al-Shehri', 'روان الشهري', 'Senior Procurement Officer', 'أخصائي مشتريات أول', 'Procurement', 'المشتريات'), load: 3 },
  { ...P.tl, load: 1 },
];
export const TEAM_NAME = sup('Procurement team', 'فريق المشتريات');
/** Persona for the Team Lead view (header switcher). */
export const TL_PERSON: Person = person('u-omran', 'Mohammed Al-Omran', 'محمد العمران', 'Procurement Team Lead', 'رئيس فريق المشتريات', 'Procurement', 'المشتريات');

// Requests waiting in the Procurement team queue for an officer (Team Lead assigns).
{
  const src = SEED_TASKS.find((x) => x.id === `TSK-${REQ.no}-12`);
  const QUEUE: { no: string; titleEn: string; titleAr: string; amount: number; hoursAgo: number; dueH: number; priority: Task['priority']; requester: Person }[] = [
    { no: '4485', titleEn: 'Branch CCTV Upgrade', titleAr: 'تحديث كاميرات المراقبة في الفروع', amount: 1_250_000, hoursAgo: 3, dueH: 30, priority: 'medium', requester: person('u-majid', 'Majid Al-Otaibi', 'ماجد العتيبي', 'Requester', 'مقدّم الطلب', 'Facilities', 'المرافق') },
    { no: '4487', titleEn: 'HR Analytics Platform', titleAr: 'منصة تحليلات الموارد البشرية', amount: 860_000, hoursAgo: 20, dueH: 6, priority: 'high', requester: person('u-dana', 'Dana Al-Mutlaq', 'دانة المطلق', 'Requester', 'مقدّم الطلب', 'Human Capital', 'رأس المال البشري') },
    { no: '4490', titleEn: 'Treasury Market Data Feed', titleAr: 'تغذية بيانات السوق للخزينة', amount: 2_100_000, hoursAgo: 52, dueH: -4, priority: 'urgent', requester: person('u-omar', 'Omar Al-Saleh', 'عمر الصالح', 'Requester', 'مقدّم الطلب', 'Treasury', 'الخزينة') },
    { no: '4492', titleEn: 'Office Furniture — New Floor', titleAr: 'أثاث مكتبي — الطابق الجديد', amount: 420_000, hoursAgo: 1, dueH: 46, priority: 'low', requester: person('u-huda', 'Huda Al-Fahad', 'هدى الفهد', 'Requester', 'مقدّم الطلب', 'Facilities', 'المرافق') },
  ];
  if (src) for (const q of QUEUE) {
    const rec = new Date(Date.now() - q.hoursAgo * 3600000);
    const tk: Task = {
      ...structuredClone(src),
      id: `TSK-${q.no}-12`,
      titleEn: `Review request #${q.no} from ${q.requester.dept}`, titleAr: `مراجعة الطلب رقم ${q.no} من ${q.requester.deptAr}`,
      entity: { kind: 'RFP', ref: `REQ-${q.no}`, titleEn: q.titleEn, titleAr: q.titleAr },
      project: { en: q.titleEn, ar: q.titleAr }, amount: q.amount, priority: q.priority,
      requester: q.requester, department: { en: q.requester.dept ?? '', ar: q.requester.deptAr ?? '' },
      assignee: { id: 'team-proc', name: 'Procurement team', nameAr: 'فريق المشتريات', role: 'Team queue', roleAr: 'قائمة الفريق', dept: 'Procurement', deptAr: 'المشتريات' },
      receivedAt: rec.toISOString(), dueAt: new Date(Date.now() + q.dueH * 3600000).toISOString(),
      mineAction: false, queue: { team: TEAM_NAME },
      activity: [
        { id: 'a0', kind: 'system', actor: q.requester, at: new Date(+rec - 40 * 60000).toISOString(), system: { en: `Request #${q.no} submitted`, ar: `تم تقديم الطلب رقم ${q.no}` } },
        { id: 'aQ', kind: 'system', actor: P.tl, at: rec.toISOString(), system: { en: 'Waiting in the Procurement team queue', ar: 'في انتظار الإسناد في قائمة فريق المشتريات' } },
      ],
    };
    tk.rfp = requestRfpFor({ refId: `REQ-${q.no}`, titleEn: q.titleEn, titleAr: q.titleAr, deptEn: q.requester.dept ?? '', deptAr: q.requester.deptAr ?? '', amount: q.amount, type: 'tendering', costCenter: 'FC-GEN-0100' });
    tk.trail = trailFor(tk);
    SEED_TASKS.push(tk);
  }
}
