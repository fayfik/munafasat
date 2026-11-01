// Manual build — the live request-approval flow.
// When a tender request is submitted, this spawns one Inbox task per stage of the process
// task list for that request (manager → technical member → specialist & finance reviews in
// parallel → Finance and Procurement qualification → Team Lead → officer → DOA → estimated
// price). Each stage carries the inputs its role really fills in. Stages unlock as the ones
// before them complete; advanceFlow() handles the branches the generic store can't.
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import type { TenderFormData } from '../types/tender';
import { reviewDepartments, deriveIncludesFromItems } from '../components/ProjectIncludesSelect';
import { effectiveQty } from '../lib/boqManpower';
import { PEOPLE as P } from './data';
import type { Bilingual, ChecklistItem, CollectField, Person, RfpDetail, Task, TaskActionDef, TrailStep } from './types';

const sup = (en: string, ar: string): Bilingual => ({ en, ar });
const step = (titleEn: string, titleAr: string, descEn: string, descAr: string) => ({ titleEn, titleAr, descEn, descAr });
const fmt = (n: number) => 'SAR ' + new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const DAY = 86400000;

export const REQUESTER_ID = 'u-requester';
export const OFFICERS: Person[] = [
  P.officer,
  { id: 'u-yousef', name: 'Yousef Al-Harthi', nameAr: 'يوسف الحارثي', role: 'Procurement Officer', roleAr: 'أخصائي مشتريات', dept: 'Procurement', deptAr: 'المشتريات' },
  { id: 'u-amal', name: 'Amal Al-Qahtani', nameAr: 'أمل القحطاني', role: 'Procurement Officer', roleAr: 'أخصائي مشتريات', dept: 'Procurement', deptAr: 'المشتريات' },
];

// ── Personas for the "View as" switcher ───────────────────────────────────────
export type PersonaKey = 'requester' | keyof typeof P | 'yousef' | 'amal';
export interface Persona { key: PersonaKey; person: Person; group: Bilingual; lead?: boolean }
const G = {
  req: sup('Requesting department', 'الإدارة الطالبة'),
  spec: sup('Specialist reviewers', 'المراجعون المتخصصون'),
  fin: sup('Finance', 'المالية'),
  proc: sup('Procurement', 'المشتريات'),
};
export function personas(userName: string): Persona[] {
  return [
    { key: 'requester', person: requesterPerson(userName), group: G.req },
    { key: 'manager', person: P.manager, group: G.req, lead: true },
    { key: 'techMember', person: P.techMember, group: G.req },
    { key: 'director', person: P.director, group: G.req, lead: true },
    { key: 'cyber', person: P.cyber, group: G.spec },
    { key: 'bcm', person: P.bcm, group: G.spec },
    { key: 'opRisk', person: P.opRisk, group: G.spec },
    { key: 'ea', person: P.ea, group: G.spec },
    { key: 'gl', person: P.gl, group: G.fin },
    { key: 'assets', person: P.assets, group: G.fin },
    { key: 'finQual', person: P.finQual, group: G.fin },
    { key: 'tl', person: P.tl, group: G.proc, lead: true },
    { key: 'officer', person: P.officer, group: G.proc },
    { key: 'yousef', person: OFFICERS[1], group: G.proc },
    { key: 'amal', person: OFFICERS[2], group: G.proc },
    { key: 'procQual', person: P.procQual, group: G.proc },
  ];
}
export function requesterPerson(userName: string, form?: TenderFormData): Person {
  const cc = form ? ALL_COST_CENTERS.find((x) => x.id === form.costCenterId) : undefined;
  return { id: REQUESTER_ID, name: userName || 'Mohammed H.', role: 'Requester', roleAr: 'مقدم الطلب', dept: cc?.name ?? 'IT & Digital', deptAr: cc?.nameAr ?? 'تقنية المعلومات والتحول الرقمي' };
}

/** Who each lead sees in their team / workload view. */
export function teamOf(key: PersonaKey): Person[] {
  if (key === 'tl') return [P.tl, ...OFFICERS, P.procQual];
  if (key === 'manager') return [P.manager, P.techMember, P.director];
  if (key === 'director') return [P.manager, P.techMember, P.cyber, P.bcm, P.opRisk, P.ea, P.gl, P.assets, P.finQual, P.procQual, P.tl, ...OFFICERS];
  return [];
}

// ── The request record, from the requester's form ─────────────────────────────
export function formToRfp(form: TenderFormData, requestNo: string, total: number): RfpDetail {
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const cc = ALL_COST_CENTERS.find((x) => x.id === form.costCenterId);
  const title = p?.name ?? 'Tender request';
  const dur = form.contractDuration ? `${form.contractDuration} ${form.contractDurationType}` : '—';
  const evalTotal = form.evaluationCriteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const member = (m: TenderFormData['technicalCommitteeMembers'][number], i: number) => ({
    name: m.name, nameAr: m.nameAr ?? m.name, roleEn: i === 0 ? 'Chair' : 'Member', roleAr: i === 0 ? 'الرئيس' : 'عضو', deptEn: m.department, deptAr: m.department,
  });
  return {
    refId: requestNo,
    titleEn: title, titleAr: p?.nameAr ?? title,
    summaryEn: form.tenderingPurpose || p?.purpose || '', summaryAr: form.tenderingPurpose || p?.purposeAr || '',
    meta: [
      { label: sup('Project', 'المشروع'), value: p ? `${p.code} · ${p.name}` : '—' },
      { label: sup('Requesting department', 'الإدارة الطالبة'), value: cc?.name ?? '—' },
      { label: sup('Cost center', 'مركز التكلفة'), value: cc?.code ?? '—' },
      { label: sup('Procurement route', 'مسار الشراء'), value: 'Competitive Tender' },
      { label: sup('Estimated value', 'القيمة التقديرية'), value: fmt(total), dir: 'ltr' },
      { label: sup('Contract duration', 'مدة العقد'), value: dur },
      { label: sup('Execution location', 'مكان التنفيذ'), value: form.executionLocation || '—' },
      { label: sup('Start date', 'تاريخ البدء'), value: form.startDate || '—', dir: 'ltr' },
      { label: sup('Evaluation split', 'توزيع التقييم'), value: evalTotal ? `Technical criteria total ${evalTotal}%` : '—' },
    ],
    scopeEn: form.scopeOfWork || '—', scopeAr: form.scopeOfWork || '—',
    scopeBlocks: form.scopeTerms ? [{ headEn: 'Terms', headAr: 'الشروط', itemsEn: form.scopeTerms.split('\n').filter(Boolean), itemsAr: form.scopeTerms.split('\n').filter(Boolean) }] : undefined,
    boq: form.boqItems.map((r) => {
      const item = p?.items.find((x) => x.id === r.projectItem);
      return {
        itemEn: r.itemName || 'Unnamed item', itemAr: r.itemName || 'بند',
        qty: String(effectiveQty(r) || r.quantity || 1), unit: r.unitOfMeasure || 'Each', unitPrice: Number(r.unitPrice) || 0,
        descEn: r.itemDescription || undefined, descAr: r.itemDescription || undefined,
        budgetEn: item?.name ?? 'Unbudgeted', budgetAr: item?.nameAr ?? 'غير مدرج في الميزانية',
        category: r.category === 'material' || r.category === 'equipment' ? 'Material' as const : 'Service' as const,
        delivery: r.deliveryDate || undefined,
      };
    }),
    payment: form.paymentStages.map((s) => ({ stageEn: s.stageName || 'Stage', stageAr: s.stageName || 'مرحلة', pct: Number(s.percentage) || 0, descEn: s.itemsDeliverables || undefined, descAr: s.itemsDeliverables || undefined })),
    evaluation: form.evaluationCriteria.map((c) => ({ criterionEn: c.description || 'Criterion', criterionAr: c.description || 'معيار', weight: Number(c.weight) || 0, descEn: c.howApplied || undefined, descAr: c.howApplied || undefined })),
    techPassing: Number(form.technicalPassingPercentage) || undefined,
    techRequirements: form.technicalRequirements.length ? form.technicalRequirements.map((r) => ({ reqEn: r.requirement, reqAr: r.requirement, descEn: r.description, descAr: r.description })) : undefined,
    techDocs: form.technicalDocumentsList.map((d) => ({ en: d, ar: d })),
    evalCommittee: form.technicalCommitteeMembers.map(member),
    qualification: form.qualificationCriteria.map((q) => ({ reqEn: q.name, reqAr: q.nameAr || q.name })),
    qualCriteria: form.qualificationCriteria.map((q) => ({ nameEn: q.name, nameAr: q.nameAr || q.name, pct: Number(q.percentage) || 0, subs: q.subCriteria.map((s) => ({ nameEn: s.name, nameAr: s.nameAr || s.name, range: s.range, pct: Number(s.percentage) || 0 })) })),
    qualCommittee: form.qualificationCommitteeMembers.map(member),
    documents: form.attachments.map((a) => ({ en: a.name, ar: a.name, type: a.mimeType.split('/').pop()?.toUpperCase(), size: `${Math.max(1, Math.round(a.size / 1024))} KB` })),
  };
}

// ── Stage definitions ─────────────────────────────────────────────────────────
type StageKey = 'mgr' | 'tech' | 'cyber' | 'bcm' | 'oprisk' | 'ea' | 'gl' | 'assets' | 'finq' | 'procq' | 'tl' | 'officer' | 'doa' | 'price';
export const STAGE_ORDER: StageKey[] = ['mgr', 'tech', 'cyber', 'bcm', 'oprisk', 'ea', 'gl', 'assets', 'finq', 'procq', 'tl', 'officer', 'doa', 'price'];
const PARALLEL: StageKey[] = ['cyber', 'bcm', 'oprisk', 'ea', 'gl', 'assets'];
export const flowTaskId = (requestNo: string, key: string) => `FLW-${requestNo}-${key}`;

const confirm = (id: string, en: string, ar: string): ChecklistItem => ({ id, label: sup(en, ar), mandatory: true, kind: 'confirm', done: false });
const text = (id: string, en: string, ar: string): ChecklistItem => ({ id, label: sup(en, ar), mandatory: true, kind: 'text', value: '', done: false });
const pick = (id: string, en: string, ar: string, opts: [string, string][]): ChecklistItem => ({ id, label: sup(en, ar), mandatory: true, kind: 'decision', options: opts.map(([e, a]) => sup(e, a)), value: '', done: false });
const num = (id: string, en: string, ar: string, required = true, hint?: Bilingual): CollectField => ({ id, label: sup(en, ar), kind: 'number', required, value: null, hint });
const txt = (id: string, en: string, ar: string, ph?: string): CollectField => ({ id, label: sup(en, ar), kind: 'text', required: true, value: null, placeholder: ph ? sup(ph, ph) : undefined });

const APPROVE_RETURN: TaskActionDef[] = [
  { id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary', gated: true },
  { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
];
const COMPLETE: TaskActionDef[] = [
  { id: 'complete', labelEn: 'Complete', labelAr: 'إكمال', variant: 'primary', gated: true, decision: sup('Qualification criteria added', 'تمت إضافة معايير التأهيل') },
  { id: 'save-draft', labelEn: 'Save draft', labelAr: 'حفظ مسودة', variant: 'secondary' },
];

interface StageDef {
  key: StageKey; type: Task['type']; assignee: Person; sla: number; priority: Task['priority'];
  stage: Bilingual; title: Bilingual; summary: Bilingual; actions: TaskActionDef[];
  extra?: Partial<Task>; parallel?: boolean;
}

export interface FlowInput {
  form: TenderFormData; requestNo: string; requestId?: string; userName: string; total: number;
}

/** Which stages a request goes through — the specialist reviews follow Step 3's "Approvals required". */
export function stagesFor(form: TenderFormData): StageKey[] {
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const names = [...(p?.items.filter((i) => form.selectedProjectItemIds?.includes(i.id)).map((i) => i.name) ?? []), ...form.boqItems.map((b) => b.itemName)].filter(Boolean);
  const cats = [...new Set([...deriveIncludesFromItems(names), ...form.scopeIncludes])];
  const depts = new Set(reviewDepartments(cats));
  const hasAssets = form.boqItems.some((b) => b.category === 'equipment' || b.category === 'material');
  return STAGE_ORDER.filter((k) => {
    if (k === 'cyber') return depts.has('cyber');
    if (k === 'ea') return depts.has('ea');
    if (k === 'bcm' || k === 'oprisk') return depts.has('bcm');
    if (k === 'assets') return hasAssets;
    return true;
  });
}

function stageDefs({ form, requestNo, total }: FlowInput, requester: Person): Record<StageKey, StageDef> {
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const title = p?.name ?? 'Tender request';
  const dept = requester.dept ?? '';
  const deptAr = requester.deptAr ?? dept;
  const who = requester.name;
  const fromUser = (en: string, ar: string) => sup(`${en} #${requestNo} from ${who}`, `${ar} رقم ${requestNo} من ${requester.nameAr ?? who}`);
  const fromDept = (en: string, ar: string) => sup(`${en} #${requestNo} from ${dept}`, `${ar} رقم ${requestNo} من ${deptAr}`);
  const evalTotal = form.evaluationCriteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const lines = form.boqItems.length;
  const assetLines = form.boqItems.filter((b) => b.category === 'equipment' || b.category === 'material').length;
  const record = [
    { label: sup('Request value', 'قيمة الطلب'), value: fmt(total), emphasis: true },
    { label: sup('Request', 'الطلب'), value: `#${requestNo} · ${title}` },
    { label: sup('Requesting department', 'الإدارة الطالبة'), value: dept },
    { label: sup('Requester', 'مقدّم الطلب'), value: who },
    { label: sup('Procurement route', 'مسار الشراء'), value: 'Competitive Tender' },
    { label: sup('BOQ lines', 'بنود جدول الكميات'), value: String(lines) },
  ];
  // DOA: who may approve depends on the request value.
  const doaHigh = total > 10_000_000;
  const doaBy = doaHigh ? P.director : P.tl;
  const review = (key: StageKey, assignee: Person, en: string, ar: string, summary: Bilingual, checklist: ChecklistItem[], sla = 1): StageDef => ({
    key, type: 'review', assignee, sla, priority: 'medium', parallel: true,
    stage: sup(en, ar), title: fromDept('Review RFP', 'مراجعة المنافسة'), summary, actions: APPROVE_RETURN,
    extra: { findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist, parallelGroup: `pg-${requestNo}` },
  });
  return {
    mgr: {
      key: 'mgr', type: 'approval', assignee: P.manager, sla: 1, priority: 'high',
      stage: sup('Department approval', 'اعتماد الإدارة'), title: fromUser('Review & approve RFP', 'مراجعة واعتماد المنافسة'),
      summary: sup(`${who} submitted this tender request. Review the request details, add comments on any section or field, then approve, return or reject.`, `قدّم ${requester.nameAr ?? who} طلب المنافسة هذا. راجع التفاصيل وأضف ملاحظاتك ثم اعتمد أو أعد أو ارفض.`),
      actions: [
        { id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' },
        { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
        { id: 'reject', labelEn: 'Reject', labelAr: 'رفض', variant: 'danger', needsNote: true },
      ],
      extra: { approvalRecord: record, requireReasonOnReject: true },
    },
    tech: {
      key: 'tech', type: 'review', assignee: P.techMember, sla: 2, priority: 'medium',
      stage: sup('Technical member review', 'مراجعة العضو الفني'), title: fromUser('Review technical evaluation criteria for RFP', 'مراجعة معايير التقييم الفني للمنافسة'),
      summary: sup('Verify the technical requirements, evaluation criteria and weights before the specialist and finance reviews.', 'تحقق من المتطلبات الفنية ومعايير التقييم وأوزانها قبل المراجعات التخصصية والمالية.'),
      actions: APPROVE_RETURN,
      extra: { findingsLabel: sup('Review notes', 'ملاحظات المراجعة'), checklist: [
        confirm('c1', `Technical requirements are complete and clear (${form.technicalRequirements.length} listed)`, `المتطلبات الفنية مكتملة وواضحة (${form.technicalRequirements.length})`),
        confirm('c2', `Evaluation criteria weights total 100% (currently ${evalTotal}%)`, `مجموع أوزان معايير التقييم 100% (حالياً ${evalTotal}%)`),
        text('c3', 'Technical passing score (%) confirmed', 'درجة الاجتياز الفنية (%)'),
        { ...confirm('c4', `Evaluation committee is set (${form.technicalCommitteeMembers.length} members)`, `تم تحديد لجنة التقييم (${form.technicalCommitteeMembers.length})`), allowNA: false },
      ].map((c) => (c.id === 'c3' ? { ...c, kind: 'number' as const, value: form.technicalPassingPercentage || '' } : c)) },
    },
    cyber: review('cyber', P.cyber, 'Specialist review — Cyber Security', 'مراجعة تخصصية — الأمن السيبراني',
      sup('Confirm NCA requirements are captured and classify the data this purchase touches.', 'تأكد من تضمين متطلبات الهيئة الوطنية للأمن السيبراني وصنّف البيانات.'), [
        pick('c1', 'Data classification', 'تصنيف البيانات', [['Public', 'عام'], ['Internal', 'داخلي'], ['Confidential', 'سري'], ['Top secret', 'سري للغاية']]),
        confirm('c2', 'NCA Essential Cybersecurity Controls captured', 'تم تضمين الضوابط الأساسية للأمن السيبراني'),
        { ...confirm('c3', 'Hosting stays inside the Kingdom', 'الاستضافة داخل المملكة'), allowNA: true },
        confirm('c4', 'Cyber security section and criteria added', 'تمت إضافة قسم ومعايير الأمن السيبراني'),
      ], 2),
    bcm: review('bcm', P.bcm, 'Specialist review — Enterprise Risk (BCM)', 'مراجعة تخصصية — المخاطر المؤسسية',
      sup('Classify how critical the system is and confirm the SLA covers recovery targets.', 'صنّف مدى حرجية النظام وتأكد من أن مستوى الخدمة يغطي أهداف الاستعادة.'), [
        pick('c1', 'Criticality tier', 'مستوى الحرجية', [['Tier 1 — critical', 'المستوى 1 — حرج'], ['Tier 2 — important', 'المستوى 2 — مهم'], ['Tier 3 — standard', 'المستوى 3 — عادي']]),
        { ...text('c2', 'Required RTO / RPO', 'زمن الاستعادة / نقطة الاستعادة المطلوبة'), allowNA: true },
        confirm('c3', 'Compliance with SLA confirmed', 'تم تأكيد الامتثال لمستوى الخدمة'),
      ]),
    oprisk: review('oprisk', P.opRisk, 'Specialist review — Operational Risk', 'مراجعة تخصصية — المخاطر التشغيلية',
      sup('Assess the operational risk of the change against the risk management framework.', 'قيّم المخاطر التشغيلية للتغيير وفق إطار إدارة المخاطر.'), [
        pick('c1', 'Residual risk rating', 'تصنيف المخاطر المتبقية', [['Low', 'منخفض'], ['Medium', 'متوسط'], ['High', 'مرتفع']]),
        confirm('c2', 'Assessed against the risk management framework', 'تم التقييم وفق إطار إدارة المخاطر'),
      ]),
    ea: review('ea', P.ea, 'Specialist review — Enterprise Architecture', 'مراجعة تخصصية — البنية المؤسسية',
      sup('Check the purchase fits the technology architecture, EA principles and standard tools.', 'تحقق من توافق الشراء مع البنية التقنية ومبادئ البنية المؤسسية والأدوات القياسية.'), [
        confirm('c1', 'Planned in the technology architecture', 'مخطط ضمن البنية التقنية'),
        confirm('c2', 'Uses standard tools (e.g. SSO, integration platform)', 'يستخدم الأدوات القياسية (مثل الدخول الموحد)'),
        confirm('c3', 'EA requirements text added from the template', 'تمت إضافة نص متطلبات البنية المؤسسية من القالب'),
      ], 3),
    gl: review('gl', P.gl, 'Finance review — GL & budget', 'مراجعة مالية — دفتر الأستاذ والميزانية',
      sup(`Confirm the budget covers ${fmt(total)} and code the request to the right GL account and material group.`, `تأكد من أن الميزانية تغطي ${fmt(total)} ورمّز الطلب بالحساب ومجموعة المواد الصحيحة.`), [
        confirm('c1', `Budget available in the cost centre for ${fmt(total)}`, `الميزانية متوفرة في مركز التكلفة لمبلغ ${fmt(total)}`),
        text('c2', 'GL account', 'حساب دفتر الأستاذ'),
        text('c3', 'Material group', 'مجموعة المواد'),
      ]),
    assets: review('assets', P.assets, 'Finance review — Assets', 'مراجعة مالية — الأصول',
      sup(`${assetLines} BOQ line${assetLines === 1 ? ' is' : 's are'} equipment or material. Create the asset item in ECC and map it to the PR.`, `${assetLines} من البنود معدات أو مواد. أنشئ بند الأصل في ECC واربطه بطلب الشراء.`), [
        pick('c1', 'Asset class', 'فئة الأصل', [['IT hardware', 'أجهزة تقنية'], ['Software licences', 'تراخيص برمجيات'], ['Furniture & equipment', 'أثاث ومعدات'], ['Vehicles', 'مركبات']]),
        { ...text('c2', 'Asset reference (ECC)', 'مرجع الأصل (ECC)'), allowNA: true },
        { ...confirm('c3', 'Asset-to-PR mapping prepared', 'تم إعداد ربط الأصل بطلب الشراء'), allowNA: true },
      ]),
    finq: {
      key: 'finq', type: 'data-collection', assignee: P.finQual, sla: 1, priority: 'medium',
      stage: sup('Qualification — Finance', 'التأهيل — المالية'), title: fromDept('Review request & add qualification criteria for RFP', 'مراجعة الطلب وإضافة معايير التأهيل للمنافسة'),
      summary: sup('Add the financial qualification criteria: cash ratio, quick ratio, ranges, weights and passing %.', 'أضف معايير التأهيل المالي: نسبة النقدية والسيولة السريعة والنطاقات والأوزان ونسبة الاجتياز.'),
      actions: COMPLETE,
      extra: { fields: [
        txt('f1', 'Cash ratio (latest fiscal year) — range', 'نسبة النقدية — النطاق', 'e.g. ≥ 1.2'),
        num('f2', 'Cash ratio — weight (%)', 'نسبة النقدية — الوزن (%)'),
        txt('f3', 'Quick ratio (latest fiscal year) — range', 'نسبة السيولة السريعة — النطاق', 'e.g. ≥ 1.0'),
        num('f4', 'Quick ratio — weight (%)', 'نسبة السيولة السريعة — الوزن (%)'),
        num('f5', 'Financial qualification passing %', 'نسبة الاجتياز المالي'),
      ] },
    },
    procq: {
      key: 'procq', type: 'data-collection', assignee: P.procQual, sla: 1, priority: 'medium',
      stage: sup('Qualification — Procurement', 'التأهيل — المشتريات'), title: fromDept('Review request & add qualification criteria for RFP', 'مراجعة الطلب وإضافة معايير التأهيل للمنافسة'),
      summary: sup('Complete the procurement qualification criteria weights and the passing percentage.', 'أكمل أوزان معايير تأهيل المشتريات ونسبة الاجتياز.'),
      actions: COMPLETE,
      extra: { fields: [
        num('f1', 'Previous experience — weight (%)', 'الخبرة السابقة — الوزن (%)'),
        num('f2', 'Existing contractual obligations — weight (%)', 'الالتزامات التعاقدية القائمة — الوزن (%)'),
        num('f3', 'Human resources — weight (%)', 'الموارد البشرية — الوزن (%)'),
        num('f4', 'Qualification passing %', 'نسبة الاجتياز للتأهيل'),
      ] },
    },
    tl: {
      key: 'tl', type: 'approval', assignee: P.tl, sla: 4, priority: 'high',
      stage: sup('Procurement review — Team Lead', 'مراجعة المشتريات — رئيس الفريق'), title: fromDept('Review RFP', 'مراجعة المنافسة'),
      summary: sup('With no comments, send it for DOA approval; if it is new or has comments, assign it to an officer.', 'إن لم توجد ملاحظات أرسله لاعتماد الصلاحيات، وإن كان جديداً أو عليه ملاحظات أسنده إلى أخصائي.'),
      actions: [
        { id: 'approve', labelEn: 'Submit for DOA approval', labelAr: 'إرسال لاعتماد الصلاحيات', variant: 'primary', decision: sup('Submitted for DOA approval', 'أُرسل لاعتماد الصلاحيات') },
        { id: 'complete', labelEn: 'Assign to officer', labelAr: 'إسناد إلى أخصائي', variant: 'secondary', decision: sup('Assigned to officer', 'أُسند إلى أخصائي') },
      ],
      extra: { approvalRecord: record, assignTo: OFFICERS },
    },
    officer: {
      key: 'officer', type: 'review', assignee: P.officer, sla: 2, priority: 'high',
      stage: sup('Procurement review — Officer', 'مراجعة المشتريات — الأخصائي'), title: fromDept('Review RFP', 'مراجعة المنافسة'),
      summary: sup('Check the RFP before DOA approval. Return it with comments if anything needs correcting.', 'راجع المنافسة قبل اعتماد الصلاحيات. أعدها مع ملاحظات إن احتاج شيء إلى تصحيح.'),
      actions: [
        { id: 'submit', labelEn: 'Submit for DOA approval', labelAr: 'إرسال لاعتماد الصلاحيات', variant: 'primary', gated: true, decision: sup('Submitted for DOA approval', 'أُرسل لاعتماد الصلاحيات') },
        { id: 'return', labelEn: 'Return with comments', labelAr: 'إعادة مع ملاحظات', variant: 'secondary', needsNote: true },
      ],
      extra: { findingsLabel: sup('Officer comments', 'ملاحظات الأخصائي'), checklist: [
        confirm('c1', 'Reviewer comments addressed', 'تمت معالجة ملاحظات المراجعين'),
        { ...confirm('c2', form.hasBrandName ? 'Brand name justified' : 'No brand names in the BOQ', form.hasBrandName ? 'تم تبرير العلامة التجارية' : 'لا توجد علامات تجارية'), allowNA: true },
        confirm('c3', 'RFP is clear and its sections are linked', 'المنافسة واضحة وأقسامها مترابطة'),
        confirm('c4', 'No formal or systemic violations', 'لا توجد مخالفات شكلية أو نظامية'),
      ] },
    },
    doa: {
      key: 'doa', type: 'approval', assignee: doaBy, sla: 2, priority: 'high',
      stage: sup('DOA approval', 'اعتماد تفويض الصلاحيات'), title: fromDept('DOA approval for RFP', 'اعتماد تفويض الصلاحيات للمنافسة'),
      summary: sup('Approve the request per the delegation of authority (DOA).', 'اعتمد الطلب وفق مصفوفة تفويض الصلاحيات.'),
      actions: [{ id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' }],
      extra: { approvalRecord: record, doaInfo: [
        { label: sup('Authority level', 'مستوى الصلاحية'), value: doaHigh ? 'Level 4 — Department Director' : 'Level 3 — Procurement Team Lead' },
        { label: sup('Approval limit', 'حد الاعتماد'), value: doaHigh ? 'Up to SAR 50,000,000.00' : 'Up to SAR 10,000,000.00' },
        { label: sup('Request value', 'قيمة الطلب'), value: fmt(total) },
        { label: sup('DOA reference', 'مرجع تفويض الصلاحيات'), value: 'DOA Matrix 2026 · Procurement §4.2' },
      ] },
    },
    price: {
      key: 'price', type: 'approval', assignee: P.director, sla: 2, priority: 'medium',
      stage: sup('Estimated price approval', 'اعتماد السعر التقديري'), title: fromDept('Approve estimated price for RFP', 'اعتماد السعر التقديري للمنافسة'),
      summary: sup('Approve the estimated price. Request approval completes here and hands off to PR creation in SAP ECC.', 'اعتمد السعر التقديري. يكتمل اعتماد الطلب هنا وينتقل إلى إنشاء طلب الشراء.'),
      actions: [
        { id: 'approve', labelEn: 'Approve', labelAr: 'اعتماد', variant: 'primary' },
        { id: 'return', labelEn: 'Return', labelAr: 'إعادة', variant: 'secondary', needsNote: true },
      ],
      extra: { priceBreakdown: true, approvalRecord: [{ label: sup('Estimated price', 'السعر التقديري'), value: fmt(total), emphasis: true }, ...record.slice(1)] },
    },
  };
}

const NEXT: Record<StageKey, Bilingual> = {
  mgr: sup('the technical member reviews the evaluation criteria', 'يراجع العضو الفني معايير التقييم'),
  tech: sup('the specialist and finance reviews start in parallel', 'تبدأ المراجعات التخصصية والمالية بالتوازي'),
  cyber: sup('it waits for the other parallel reviewers, then qualification starts', 'ينتظر بقية المراجعين ثم يبدأ التأهيل'),
  bcm: sup('it waits for the other parallel reviewers, then qualification starts', 'ينتظر بقية المراجعين ثم يبدأ التأهيل'),
  oprisk: sup('it waits for the other parallel reviewers, then qualification starts', 'ينتظر بقية المراجعين ثم يبدأ التأهيل'),
  ea: sup('it waits for the other parallel reviewers, then qualification starts', 'ينتظر بقية المراجعين ثم يبدأ التأهيل'),
  gl: sup('it waits for the other parallel reviewers, then qualification starts', 'ينتظر بقية المراجعين ثم يبدأ التأهيل'),
  assets: sup('it waits for the other parallel reviewers, then qualification starts', 'ينتظر بقية المراجعين ثم يبدأ التأهيل'),
  finq: sup('Procurement adds its qualification criteria', 'تضيف المشتريات معايير التأهيل'),
  procq: sup('the Procurement Team Lead reviews it', 'يراجعه رئيس فريق المشتريات'),
  tl: sup('it goes for DOA approval', 'ينتقل لاعتماد الصلاحيات'),
  officer: sup('it goes for DOA approval', 'ينتقل لاعتماد الصلاحيات'),
  doa: sup('the Director approves the estimated price', 'يعتمد المدير السعر التقديري'),
  price: sup('request approval is complete and the PR is created in SAP ECC', 'يكتمل اعتماد الطلب ويُنشأ طلب الشراء في SAP ECC'),
};
const RETURN_OUTCOME = { action: sup('Return', 'إعادة'), next: sup('the requester gets your comments to answer, then it comes back to you', 'يتلقى مقدم الطلب ملاحظاتك للرد عليها ثم يعود إليك'), tone: 'warning' as const };

/** One task per stage of the request's flow. Only the first stage starts actionable. */
export function buildFlowTasks(input: FlowInput): Task[] {
  const { form, requestNo, requestId, userName, total } = input;
  const requester = requesterPerson(userName, form);
  const defs = stageDefs(input, requester);
  const keys = stagesFor(form);
  const parallel = keys.filter((k) => PARALLEL.includes(k));
  const rfp = formToRfp(form, requestNo, total);
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const title = p?.name ?? 'Tender request';
  const now = Date.now();
  const id = (k: StageKey) => flowTaskId(requestNo, k);
  const deps = (k: StageKey): string[] => {
    if (k === 'mgr') return [];
    if (k === 'tech') return [id('mgr')];
    if (PARALLEL.includes(k)) return [id('tech')];
    if (k === 'finq') return parallel.length ? parallel.map(id) : [id('tech')];
    if (k === 'procq') return [id('finq')];
    if (k === 'tl' || k === 'officer' || k === 'doa') return [id(k === 'doa' ? 'tl' : k === 'officer' ? 'tl' : 'procq')];
    return [id('doa')];
  };
  const tasks = keys.map((k): Task => {
    const d = defs[k];
    const later = keys.slice(keys.indexOf(k) + 1).filter((x) => x !== 'officer').slice(0, 3).map((x) => defs[x]);
    const outcomes = d.actions.filter((a) => a.id !== 'save-draft').map((a) => a.id === 'return' ? RETURN_OUTCOME
      : a.id === 'reject' ? { action: sup('Reject', 'رفض'), next: sup('the request is closed and the requester sees your reason', 'يُغلق الطلب ويطّلع مقدّم الطلب على السبب'), tone: 'danger' as const }
      : k === 'tl' && a.id === 'complete' ? { action: sup('Assign to officer', 'إسناد إلى أخصائي'), next: sup('the officer you pick checks it, then it goes for DOA approval', 'يراجعه الأخصائي الذي تختاره ثم ينتقل لاعتماد الصلاحيات'), tone: 'info' as const }
      : { action: sup(a.labelEn, a.labelAr), next: NEXT[k], tone: 'success' as const });
    const first = k === 'mgr';
    return {
      id: id(k), type: d.type,
      titleEn: d.title.en, titleAr: d.title.ar, summaryEn: d.summary.en, summaryAr: d.summary.ar,
      state: 'available', priority: d.priority,
      entity: { kind: 'RFP', ref: requestNo, titleEn: title, titleAr: p?.nameAr ?? title },
      project: { en: title, ar: p?.nameAr ?? title }, amount: total || undefined,
      requester, assignee: d.assignee,
      department: { en: requester.dept ?? '', ar: requester.deptAr ?? '' },
      stageEn: d.stage.en, stageAr: d.stage.ar,
      receivedAt: new Date(now).toISOString(), dueAt: new Date(now + d.sla * DAY).toISOString(), slaHours: d.sla * 24,
      mineAction: true, reviewComments: true,
      dependsOn: deps(k), actions: d.actions, outcomes,
      decisionSteps: Object.fromEntries(d.actions.filter((a) => a.id !== 'save-draft').map((a) => [a.id,
        a.id === 'return' ? [
          step('Back to the requester', 'العودة إلى مقدّم الطلب', `${requester.name} gets a task to answer your comments.`, `يتلقى ${requester.name} مهمة للرد على ملاحظاتك.`),
          step(`Back to ${d.assignee.name}`, `العودة إلى ${d.assignee.nameAr ?? d.assignee.name}`, 'Once every comment is resolved the request comes back to you.', 'بعد حل جميع الملاحظات يعود الطلب إليك.'),
        ] : a.id === 'reject' ? [step('Request closed', 'إغلاق الطلب', `Request #${requestNo} is rejected and closed.`, `يُرفض الطلب ويُغلق.`)]
        : later.length ? later.map((x) => step(x.stage.en, x.stage.ar, `${x.assignee.name} · ${x.assignee.role ?? ''}`, `${x.assignee.nameAr ?? x.assignee.name}`))
        : [step('Create PR in SAP ECC', 'إنشاء طلب الشراء في SAP ECC', 'Hands off to PR approval and the Etimad stage.', 'ينتقل إلى اعتماد طلب الشراء ومرحلة اعتماد.')]])),
      rfp,
      flow: { requestNo, requestId, stage: k, activated: first },
      activity: [
        { id: `${requestNo}-${k}-a0`, kind: 'system', actor: requester, at: new Date(now).toISOString(), system: sup(`Request #${requestNo} submitted`, `تم تقديم الطلب رقم ${requestNo}`) },
        ...(first ? [{ id: `${requestNo}-${k}-a1`, kind: 'system' as const, actor: d.assignee, at: new Date(now).toISOString(), system: sup(`Assigned to ${d.assignee.name} — ${d.stage.en}`, `أُسند إلى ${d.assignee.nameAr ?? d.assignee.name} — ${d.stage.ar}`) }] : []),
      ],
      ...d.extra,
    };
  });
  return withTrails(tasks, requestNo);
}

// ── Advancing the flow ────────────────────────────────────────────────────────
/** The officer a Team Lead picked on the Required action tab (kept until they decide). */
const officerPick = new Map<string, string>();
export const chooseOfficer = (taskId: string, personId: string) => { officerPick.set(taskId, personId); };

const isDone = (t?: Task) => t?.state === 'completed';
const sysEntry = (actor: Person, en: string, ar: string) => ({ id: `s_${Math.random().toString(36).slice(2)}`, at: new Date().toISOString(), kind: 'system' as const, actor, system: sup(en, ar) });

/** Applies the flow's branches after a decision; called by the store with the updated task list. */
export function advanceFlow(all: Task[], decidedId: string, action: string): Task[] {
  const src = all.find((t) => t.id === decidedId);
  const fl = src?.flow ?? all.find((t) => t.id === decidedId.replace(/-R$/, ''))?.flow;
  if (!fl) return all;
  const no = fl.requestNo;
  let xs = all;
  const set = (id: string, fn: (t: Task) => Task) => { xs = xs.map((t) => (t.id === id ? fn(t) : t)); };

  if (src?.flow) {
    const k = src.flow.stage;
    // Team Lead: send straight to DOA (officer step skipped) or assign an officer first.
    if (k === 'tl' && (action === 'approve' || action === 'complete')) {
      const off = flowTaskId(no, 'officer');
      if (action === 'approve') {
        set(off, (t) => ({ ...t, state: 'cancelled', mineAction: false, stageEn: 'Not needed — sent straight to DOA', stageAr: 'غير مطلوب — أُرسل مباشرة للاعتماد' }));
      } else {
        const pickId = officerPick.get(src.id) ?? OFFICERS[0].id;
        const who = OFFICERS.find((o) => o.id === pickId) ?? OFFICERS[0];
        set(off, (t) => ({ ...t, assignee: who }));
        set(flowTaskId(no, 'doa'), (t) => ({ ...t, dependsOn: [off] }));
      }
    }
    // Manager rejected: the whole request closes.
    if (action === 'reject') {
      xs = xs.map((t) => (t.flow?.requestNo === no && t.id !== src.id && t.state !== 'completed'
        ? { ...t, state: 'cancelled', mineAction: false, stageEn: 'Closed — request rejected', stageAr: 'مغلق — رُفض الطلب' } : t));
    }
  }
  // A return made a comment-response task for the requester: name it for this request.
  const r = xs.find((t) => t.id === `${decidedId}-R`);
  if (action === 'return' && r && src) {
    set(r.id, (t) => ({ ...t,
      titleEn: `Answer comments on request #${no} from ${src.assignee.name}`, titleAr: `الرد على ملاحظات الطلب رقم ${no} من ${src.assignee.nameAr ?? src.assignee.name}`,
      entity: src.entity, flow: { ...fl, stage: `${src.flow?.stage}-R`, activated: true } }));
  }
  // Activate stages whose dependencies are all complete (fresh SLA clock from now).
  const now = Date.now();
  xs = xs.map((t) => {
    if (t.flow?.requestNo !== no || t.flow.activated || t.state === 'cancelled') return t;
    if (!(t.dependsOn ?? []).every((d) => isDone(xs.find((x) => x.id === d)))) return t;
    return { ...t, receivedAt: new Date(now).toISOString(), dueAt: new Date(now + (t.slaHours ?? 24) * 3600000).toISOString(),
      flow: { ...t.flow, activated: true },
      activity: [...t.activity, sysEntry(t.assignee, `Assigned to ${t.assignee.name} — ${t.stageEn}`, `أُسند إلى ${t.assignee.nameAr ?? t.assignee.name} — ${t.stageAr}`)] };
  });
  return withTrails(xs, no);
}

/** Recomputes the workflow trail on every task of one request from the live state. */
function withTrails(all: Task[], requestNo: string): Task[] {
  const mine = all.filter((t) => t.flow?.requestNo === requestNo && !t.flow.stage.endsWith('-R'));
  if (!mine.length) return all;
  const first = mine[0];
  const trail: TrailStep[] = [
    { id: 't0', titleEn: 'Request submitted', titleAr: 'تقديم الطلب', actorEn: first.requester.name, actorAr: first.requester.nameAr ?? first.requester.name, state: 'done', at: first.activity[0]?.at },
    ...STAGE_ORDER.map((k) => mine.find((t) => t.flow!.stage === k)).filter((t): t is Task => !!t && t.state !== 'cancelled').map((t) => ({
      id: t.id, titleEn: t.stageEn, titleAr: t.stageAr, actorEn: t.assignee.name, actorAr: t.assignee.nameAr ?? t.assignee.name,
      state: t.state === 'completed' ? 'done' as const : t.flow!.activated ? 'current' as const : 'upcoming' as const,
      at: t.completedAt,
      note: t.state === 'waiting' ? sup('Returned — waiting for the requester', 'أُعيد — بانتظار مقدم الطلب') : t.state === 'rejected' ? sup('Rejected', 'مرفوض') : undefined,
    })),
  ];
  return all.map((t) => (t.flow?.requestNo === requestNo ? { ...t, trail } : t));
}

// ── Where a request stands (My Requests, request detail, dashboards) ──────────
export interface FlowStatus {
  state: 'in-review' | 'returned' | 'rejected' | 'approved';
  current: Task[];              // active stages (several during the parallel reviews)
  done: number; total: number;
  respondTask?: Task;           // the requester's comment-response task, when returned
  stages: Task[];
}
export function flowStatus(tasks: Task[], requestNo?: string): FlowStatus | null {
  if (!requestNo) return null;
  const stages = STAGE_ORDER.map((k) => tasks.find((t) => t.flow?.requestNo === requestNo && t.flow.stage === k)).filter((t): t is Task => !!t && t.state !== 'cancelled');
  if (!stages.length) return null;
  const respondTask = tasks.find((t) => t.flow?.requestNo === requestNo && t.flow.stage.endsWith('-R') && t.state !== 'completed' && t.state !== 'cancelled');
  const done = stages.filter((t) => t.state === 'completed').length;
  const current = stages.filter((t) => t.flow!.activated && t.state !== 'completed');
  const state = stages.some((t) => t.state === 'rejected') ? 'rejected'
    : respondTask ? 'returned'
    : done === stages.length ? 'approved' : 'in-review';
  return { state, current, done, total: stages.length, respondTask, stages };
}

/** Flow tasks that haven't been reached yet (or were skipped) stay out of every inbox. */
export const hiddenFromInbox = (t: Task, all: Task[]) =>
  !!t.flow && (t.state === 'cancelled' && t.flow.stage === 'officer' || (!t.flow.activated && (t.dependsOn ?? []).some((d) => all.find((x) => x.id === d)?.state !== 'completed')));
