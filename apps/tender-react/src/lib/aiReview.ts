// AI pre-review of a request, from each reviewing department's point of view.
// Runs in Review & Confirm before submit. Every recommendation says why that
// department would raise it, where it lives, and — where it can — a ready-to-apply
// fix (the "Fix it" → "Apply it" flow). Rule-based in the prototype; the same shape
// is what an LLM review would return.
import type { TenderFormData, PaymentStageRow, TechRequirementRow, EvalCriterionRow } from '../types/tender';
import { PROJECTS } from '../data/mockData';
import { words, MIN_WORDS } from './quality';
import { suggestAccounting } from './accounting';
import { resolveAnswers } from '../components/TechStandards';

export type Dept = 'finance' | 'ea' | 'cyber' | 'procurement';
export type Severity = 'return' | 'improve' | 'tip';

export interface Bi { en: string; ar: string }
export type Proposal =
  | { kind: 'text'; label: Bi; current: string; value: string; append?: boolean }
  | { kind: 'rows'; label: Bi; rows: { title: string; sub?: string; badge?: string }[]; replaces?: number }
  | { kind: 'value'; label: Bi; current: string; value: string };

export interface AiRec {
  id: string;
  dept: Dept;
  severity: Severity;
  title: Bi;
  why: Bi;
  /** Step the fix lives in (SECTIONS id) and the field to scroll to. */
  section: string;
  field?: string;
  proposal?: Proposal;
  /** Changes made by "Apply it". Absent → the requester fixes it by hand. */
  apply?: (f: TenderFormData) => Partial<TenderFormData>;
  /** What to do when there's no automatic fix. */
  manual?: Bi;
}

export const DEPTS: { id: Dept; en: string; ar: string; role: Bi; checks: Bi[] }[] = [
  { id: 'finance', en: 'Finance', ar: 'المالية', role: { en: 'Finance officer', ar: 'مسؤول المالية' },
    checks: [{ en: 'Payment schedule and advance payment', ar: 'جدول الدفعات والدفعة المقدمة' }, { en: 'Material groups on BOQ lines', ar: 'مجموعات المواد في بنود الجدول' }, { en: 'Budget and line totals', ar: 'الميزانية وإجماليات البنود' }] },
  { id: 'ea', en: 'Enterprise Architecture', ar: 'البنية المؤسسية', role: { en: 'EA officer', ar: 'مسؤول البنية المؤسسية' },
    checks: [{ en: 'Scope of Work clarity', ar: 'وضوح نطاق العمل' }, { en: 'Integration and architecture requirements', ar: 'متطلبات التكامل والبنية' }, { en: 'Technical standards', ar: 'المعايير التقنية' }] },
  { id: 'cyber', en: 'Cybersecurity', ar: 'الأمن السيبراني', role: { en: 'Cybersecurity', ar: 'الأمن السيبراني' },
    checks: [{ en: 'Security testing and NCA controls', ar: 'الاختبارات الأمنية وضوابط الهيئة' }, { en: 'Personal data protection', ar: 'حماية البيانات الشخصية' }, { en: 'Confidentiality terms', ar: 'شروط السرية' }] },
  { id: 'procurement', en: 'Procurement', ar: 'المشتريات', role: { en: 'Procurement member', ar: 'عضو المشتريات' },
    checks: [{ en: 'Evaluation criteria and weights', ar: 'معايير التقييم والأوزان' }, { en: 'Passing scores and committee', ar: 'درجات الاجتياز واللجنة' }, { en: 'Delivery dates and brand names', ar: 'مواعيد التسليم والعلامات التجارية' }] },
];

const uid = () => crypto.randomUUID();
const has = (rows: TechRequirementRow[], rx: RegExp) => rows.some((r) => rx.test(`${r.requirement} ${r.description}`));

export function reviewRequest(f: TenderFormData, isAr: boolean): AiRec[] {
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const out: AiRec[] = [];
  const proj = PROJECTS.find((p) => p.id === f.projectId);
  const projName = proj ? (isAr ? proj.nameAr : proj.name) : L('this project', 'هذا المشروع');
  const items = f.boqItems.filter((r) => r.itemName.trim());
  const itemNames = items.map((r) => r.itemName).slice(0, 5);
  const ea = resolveAnswers(f);
  const reqs = f.technicalRequirements.filter((r) => r.requirement.trim());

  /* ── Finance ───────────────────────────────────────────────────────────── */
  const payTotal = f.paymentStages.reduce((s, p) => s + (Number(p.percentage) || 0), 0);
  if (!f.paymentStages.length || payTotal !== 100) {
    const names = itemNames.length ? itemNames.join(', ') : L('Configured solution', 'الحل المهيأ');
    const stages: PaymentStageRow[] = [
      { id: uid(), stageName: L('Contract signing & mobilisation', 'توقيع العقد والتجهيز'), itemsDeliverables: L('Signed contract, project plan, kickoff minutes', 'العقد الموقع وخطة المشروع ومحضر الانطلاق'), startDate: f.startDate, duration: L('30 days', '30 يوماً'), percentage: 15 },
      { id: uid(), stageName: L('Delivery & implementation', 'التوريد والتنفيذ'), itemsDeliverables: names, startDate: '', duration: L('As per plan', 'حسب الخطة'), percentage: 55 },
      { id: uid(), stageName: L('Final acceptance & handover', 'القبول النهائي والتسليم'), itemsDeliverables: L('Acceptance certificate, handover documents, training records', 'شهادة القبول ومستندات التسليم وسجلات التدريب'), startDate: '', duration: L('30 days', '30 يوماً'), percentage: 30 },
    ];
    out.push({ id: 'fin-pay', dept: 'finance', severity: 'return', section: 'payment-schedule', field: 'q-payment',
      title: { en: f.paymentStages.length ? `Payment stages add up to ${payTotal}%, not 100%` : 'No payment schedule', ar: f.paymentStages.length ? `مراحل الدفع مجموعها ${payTotal}% وليس 100%` : 'لا يوجد جدول دفعات' },
      why: { en: 'Finance can’t commit the budget without a schedule that totals 100% and ties each payment to a deliverable.', ar: 'لا تستطيع المالية حجز الميزانية دون جدول مجموعه 100% يربط كل دفعة بمخرج.' },
      proposal: { kind: 'rows', label: { en: 'Suggested schedule (15 / 55 / 30)', ar: 'الجدول المقترح (15 / 55 / 30)' }, replaces: f.paymentStages.length,
        rows: stages.map((s) => ({ title: s.stageName, sub: s.itemsDeliverables, badge: `${s.percentage}%` })) },
      apply: () => ({ paymentStages: stages }) });
  } else if ((Number(f.paymentStages[0]?.percentage) || 0) > 25) {
    const first = Number(f.paymentStages[0].percentage) || 0;
    const next = f.paymentStages.map((s, i, a) => (i === 0 ? { ...s, percentage: 20 } : i === a.length - 1 ? { ...s, percentage: (Number(s.percentage) || 0) + (first - 20) } : s));
    out.push({ id: 'fin-advance', dept: 'finance', severity: 'improve', section: 'payment-schedule', field: 'q-payment',
      title: { en: `First payment is ${first}% — above the 25% advance limit`, ar: `الدفعة الأولى ${first}% — أعلى من حد الدفعة المقدمة 25%` },
      why: { en: 'Advances above 25% need a bank guarantee. Moving the difference to final acceptance avoids it.', ar: 'الدفعة المقدمة فوق 25% تتطلب ضماناً بنكياً. نقل الفرق إلى القبول النهائي يغني عنه.' },
      proposal: { kind: 'rows', label: { en: 'Adjusted stages', ar: 'المراحل المعدلة' }, replaces: f.paymentStages.length, rows: next.map((s) => ({ title: s.stageName, sub: s.itemsDeliverables, badge: `${s.percentage}%` })) },
      apply: () => ({ paymentStages: next }) });
  }
  const noMg = items.filter((r) => !r.materialGroup);
  if (noMg.length) {
    out.push({ id: 'fin-mg', dept: 'finance', severity: 'improve', section: 'boq', field: 'q-boq',
      title: { en: `${noMg.length} BOQ line${noMg.length === 1 ? ' has' : 's have'} no material group`, ar: `${noMg.length} من بنود الجدول بلا مجموعة مواد` },
      why: { en: 'The GL account follows the material group — without it Finance has to classify each line by hand.', ar: 'يتبع حساب الأستاذ مجموعة المواد — بدونها تصنف المالية كل بند يدوياً.' },
      proposal: { kind: 'rows', label: { en: 'Suggested material groups', ar: 'مجموعات المواد المقترحة' },
        rows: noMg.slice(0, 6).map((r) => { const g = suggestAccounting(r.itemName, r.itemDescription); return { title: r.itemName, badge: g?.materialGroup ?? '—' }; }) },
      apply: (cur) => ({ boqItems: cur.boqItems.map((r) => { if (r.materialGroup || !r.itemName.trim()) return r; const g = suggestAccounting(r.itemName, r.itemDescription); return g ? { ...r, ...g, acctSource: 'ai' as const } : r; }) }) });
  }
  const noPrice = items.filter((r) => !(Number(r.unitPrice) > 0));
  if (noPrice.length) {
    out.push({ id: 'fin-price', dept: 'finance', severity: 'return', section: 'boq', field: 'q-boq',
      title: { en: `${noPrice.length} BOQ line${noPrice.length === 1 ? '' : 's'} without an estimated price`, ar: `${noPrice.length} من البنود بلا سعر تقديري` },
      why: { en: 'The budget check compares the BOQ total with the available budget — every line needs an estimate.', ar: 'يقارن فحص الميزانية إجمالي الجدول بالميزانية المتاحة — كل بند يحتاج سعراً تقديرياً.' },
      manual: { en: 'Add a unit price to each line. Use a recent quote or the last purchase price.', ar: 'أضف سعر وحدة لكل بند. استخدم عرض سعر حديثاً أو آخر سعر شراء.' } });
  }

  /* ── Enterprise Architecture ───────────────────────────────────────────── */
  if (words(f.scopeOfWork) < MIN_WORDS.scopeOfWork) {
    const delivs = (f.deliverables.length ? f.deliverables.map((d) => d.deliverableName) : itemNames).filter(Boolean).join(', ') || L('the items in the BOQ', 'بنود جدول الكميات');
    const loc = f.executionLocation || L('Riyadh', 'الرياض');
    const sow = L(
      `${f.scopeOfWork.trim() ? f.scopeOfWork.trim() + ' ' : ''}Objective: deliver ${projName} as described in this request. In scope: ${delivs}. The vendor is responsible for design, configuration, testing, data migration where applicable, training and handover, with weekly progress reporting to the PMO. Work is delivered in ${loc}. Out of scope: hardware or third-party changes not listed in the BOQ. Each deliverable is accepted in writing by the business owner before payment.`,
      `${f.scopeOfWork.trim() ? f.scopeOfWork.trim() + ' ' : ''}الهدف: تنفيذ ${projName} كما هو موضح في هذا الطلب. يشمل النطاق: ${delivs}. يتولى المورد التصميم والتهيئة والاختبار وترحيل البيانات عند الحاجة والتدريب والتسليم، مع تقارير تقدم أسبوعية لمكتب إدارة المشاريع. يُنفذ العمل في ${loc}. خارج النطاق: الأجهزة أو التعديلات على أنظمة الغير غير المدرجة في الجدول. يُعتمد كل مخرج كتابياً من مالك العمل قبل الدفع.`);
    out.push({ id: 'ea-sow', dept: 'ea', severity: 'return', section: 'scope-of-work', field: 'q-scopeOfWork',
      title: { en: 'Scope of Work is too short to assess', ar: 'نطاق العمل مختصر جداً للتقييم' },
      why: { en: `EA returns scopes that don’t say what is delivered, by whom and what is out of scope (${words(f.scopeOfWork)} of ${MIN_WORDS.scopeOfWork} words).`, ar: `تعيد البنية المؤسسية النطاق الذي لا يوضح ما سيُسلَّم ومن المسؤول وما هو خارج النطاق (${words(f.scopeOfWork)} من ${MIN_WORDS.scopeOfWork} كلمة).` },
      proposal: { kind: 'text', label: { en: 'Suggested Scope of Work', ar: 'نطاق العمل المقترح' }, current: f.scopeOfWork, value: sow },
      apply: () => ({ scopeOfWork: sow }) });
  }
  if (!reqs.length) {
    const add: TechRequirementRow[] = [
      { id: uid(), requirement: L('Arabic & English user interface', 'واجهة بالعربية والإنجليزية'), description: L('All screens, reports and notifications in Arabic (RTL) and English.', 'جميع الشاشات والتقارير والإشعارات بالعربية والإنجليزية.') },
      { id: uid(), requirement: L('Single sign-on with role-based access', 'دخول موحد مع صلاحيات حسب الدور'), description: L('Login through the corporate identity provider (SAML 2.0) with segregation of duties.', 'الدخول عبر مزود الهوية المؤسسي (SAML 2.0) مع فصل المهام.') },
      { id: uid(), requirement: L('Documentation and knowledge transfer', 'التوثيق ونقل المعرفة'), description: L('As-built design, admin guides and hands-on training for the support team.', 'وثائق التصميم المنفذ وأدلة الإدارة وتدريب عملي لفريق الدعم.') },
    ];
    out.push({ id: 'ea-reqs', dept: 'ea', severity: 'return', section: 'technical-evaluation', field: 'q-evaluation',
      title: { en: 'No technical requirements', ar: 'لا توجد متطلبات فنية' },
      why: { en: 'Vendors are evaluated against these — without them EA can’t check fit with the architecture.', ar: 'يُقيَّم الموردون وفقها — وبدونها لا تستطيع البنية المؤسسية التحقق من التوافق.' },
      proposal: { kind: 'rows', label: { en: 'Suggested requirements', ar: 'المتطلبات المقترحة' }, rows: add.map((r) => ({ title: r.requirement, sub: r.description })) },
      apply: (cur) => ({ technicalRequirements: [...cur.technicalRequirements.filter((r) => r.requirement.trim()), ...add] }) });
  }
  if (ea.scope.required && ea.answers.integrates && !has(reqs, /integrat|api|interface/i)) {
    const r: TechRequirementRow = { id: uid(), requirement: L('Integration through documented APIs', 'التكامل عبر واجهات برمجية موثقة'), description: L('Every interface uses documented, versioned REST/OData APIs through the integration platform; no direct database links.', 'تستخدم كل واجهة واجهات REST/OData موثقة ومُدارة الإصدارات عبر منصة التكامل؛ دون ربط مباشر بقواعد البيانات.') };
    out.push({ id: 'ea-integ', dept: 'ea', severity: 'improve', section: 'technical-evaluation', field: 'q-evaluation',
      title: { en: 'The request connects to internal systems but has no integration requirement', ar: 'الطلب يتكامل مع أنظمة داخلية دون متطلب تكامل' },
      why: { en: 'EA approves integrations only through the integration platform with documented APIs.', ar: 'تعتمد البنية المؤسسية التكامل عبر منصة التكامل بواجهات موثقة فقط.' },
      proposal: { kind: 'rows', label: { en: 'Requirement to add', ar: 'المتطلب المضاف' }, rows: [{ title: r.requirement, sub: r.description }] },
      apply: (cur) => ({ technicalRequirements: [...cur.technicalRequirements, r] }) });
  }
  if (ea.scope.required && ea.answers.saas === false) {
    out.push({ id: 'ea-saas', dept: 'ea', severity: 'tip', section: 'scope-of-work', field: 'q-scopeOfWork',
      title: { en: 'On-premises deployment — explain why SaaS doesn’t fit', ar: 'نشر محلي — وضّح لماذا لا يناسب SaaS' },
      why: { en: 'EA direction is SaaS first. A one-line reason in the scope saves a question later.', ar: 'توجه البنية المؤسسية هو SaaS أولاً. سطر واحد يوضح السبب يوفر سؤالاً لاحقاً.' },
      manual: { en: 'Add a sentence to the Scope of Work on why the solution must run on our servers.', ar: 'أضف جملة إلى نطاق العمل توضح سبب تشغيل الحل على خوادمنا.' } });
  }

  /* ── Cybersecurity ─────────────────────────────────────────────────────── */
  if (ea.scope.required && !has(reqs, /security|penetration|nca|ecc|vulnerab|encrypt/i)) {
    const r: TechRequirementRow = { id: uid(), requirement: L('Security testing & NCA ECC compliance', 'الاختبارات الأمنية والامتثال لضوابط الهيئة'), description: L('Independent penetration test before go-live and yearly; complies with NCA Essential Cybersecurity Controls; critical findings fixed within 30 days.', 'اختبار اختراق مستقل قبل الإطلاق وسنوياً؛ الامتثال للضوابط الأساسية للأمن السيبراني؛ معالجة الثغرات الحرجة خلال 30 يوماً.') };
    out.push({ id: 'cy-test', dept: 'cyber', severity: 'return', section: 'technical-evaluation', field: 'q-evaluation',
      title: { en: 'No security testing or NCA compliance requirement', ar: 'لا يوجد متطلب للاختبار الأمني أو الامتثال' },
      why: { en: 'Cybersecurity returns technology requests that don’t oblige the vendor to pass a penetration test and meet NCA ECC.', ar: 'يعيد الأمن السيبراني طلبات التقنية التي لا تُلزم المورد باجتياز اختبار الاختراق والامتثال للضوابط.' },
      proposal: { kind: 'rows', label: { en: 'Requirement to add', ar: 'المتطلب المضاف' }, rows: [{ title: r.requirement, sub: r.description }] },
      apply: (cur) => ({ technicalRequirements: [...cur.technicalRequirements, r] }) });
  }
  if (ea.answers['personal-data'] && !has(reqs, /pdpl|personal data|privacy|data protection/i)) {
    const r: TechRequirementRow = { id: uid(), requirement: L('Personal data protection (PDPL)', 'حماية البيانات الشخصية'), description: L('Personal data is processed and stored in KSA per the Personal Data Protection Law, encrypted at rest and in transit, with access logged.', 'تُعالج البيانات الشخصية وتُخزن داخل المملكة وفق نظام حماية البيانات الشخصية، مشفرة أثناء التخزين والنقل، مع تسجيل الوصول.') };
    out.push({ id: 'cy-pdpl', dept: 'cyber', severity: 'return', section: 'technical-evaluation', field: 'q-evaluation',
      title: { en: 'Personal data is involved but not protected in the requirements', ar: 'توجد بيانات شخصية دون حماية في المتطلبات' },
      why: { en: 'The request handles employee or customer data. PDPL obliges data residency, encryption and access logging.', ar: 'يعالج الطلب بيانات موظفين أو عملاء. يُلزم النظام بتوطين البيانات وتشفيرها وتسجيل الوصول.' },
      proposal: { kind: 'rows', label: { en: 'Requirement to add', ar: 'المتطلب المضاف' }, rows: [{ title: r.requirement, sub: r.description }] },
      apply: (cur) => ({ technicalRequirements: [...cur.technicalRequirements, r] }) });
  }
  if (!/confidential|non-disclosure|nda|سرية/i.test(f.scopeTerms ?? '')) {
    const clause = L('Confidentiality: vendor staff sign a non-disclosure agreement before access; all project data stays in Saudi Arabia and is returned or destroyed at contract end.', 'السرية: يوقع موظفو المورد اتفاقية عدم إفصاح قبل منحهم الوصول؛ تبقى جميع بيانات المشروع داخل المملكة وتُعاد أو تُتلف عند انتهاء العقد.');
    const next = `${(f.scopeTerms ?? '').trim()}${(f.scopeTerms ?? '').trim() ? '\n' : ''}${clause}`;
    out.push({ id: 'cy-nda', dept: 'cyber', severity: 'improve', section: 'scope-of-work', field: 'q-scopeTerms',
      title: { en: 'No confidentiality clause in the terms', ar: 'لا يوجد بند سرية في الشروط' },
      why: { en: 'Vendor staff will see internal data — Cybersecurity expects an NDA and data-return clause.', ar: 'سيطلع موظفو المورد على بيانات داخلية — يتوقع الأمن السيبراني اتفاقية عدم إفصاح وبند إعادة البيانات.' },
      proposal: { kind: 'text', label: { en: 'Clause to add to the terms', ar: 'البند المضاف إلى الشروط' }, current: f.scopeTerms ?? '', value: clause, append: true },
      apply: () => ({ scopeTerms: next }) });
  }

  /* ── Procurement ───────────────────────────────────────────────────────── */
  const evalTotal = f.evaluationCriteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  if (!f.evaluationCriteria.length || evalTotal !== 100) {
    const crit: EvalCriterionRow[] = [
      { id: uid(), description: L('Technical approach & methodology', 'المنهجية والأسلوب الفني'), howApplied: L('Scored on clarity of approach, plan and fit to the requirements.', 'يُقيَّم بوضوح المنهجية والخطة والملاءمة للمتطلبات.'), weight: 40 },
      { id: uid(), description: L('Team qualifications', 'مؤهلات الفريق'), howApplied: L('CVs and certifications of the named team against the roles in the BOQ.', 'السير الذاتية والشهادات للفريق المسمى مقابل الأدوار في الجدول.'), weight: 30 },
      { id: uid(), description: L('Similar projects delivered', 'المشاريع المماثلة المنفذة'), howApplied: L('Two or more similar projects in the last three years, with references.', 'مشروعان مماثلان أو أكثر خلال آخر ثلاث سنوات مع مراجع.'), weight: 20 },
      { id: uid(), description: L('Implementation plan & timeline', 'خطة التنفيذ والجدول الزمني'), howApplied: L('Realistic plan with milestones matching the payment schedule.', 'خطة واقعية بمعالم تتوافق مع جدول الدفعات.'), weight: 10 },
    ];
    out.push({ id: 'pr-eval', dept: 'procurement', severity: 'return', section: 'technical-evaluation', field: 'q-evaluation',
      title: { en: f.evaluationCriteria.length ? `Evaluation weights add up to ${evalTotal}%, not 100%` : 'No evaluation criteria', ar: f.evaluationCriteria.length ? `أوزان التقييم مجموعها ${evalTotal}% وليس 100%` : 'لا توجد معايير تقييم' },
      why: { en: 'The tender can’t be published to Etimad without weighted criteria that total 100%.', ar: 'لا يمكن نشر المنافسة في اعتماد دون معايير موزونة مجموعها 100%.' },
      proposal: { kind: 'rows', label: { en: 'Suggested criteria (40 / 30 / 20 / 10)', ar: 'المعايير المقترحة (40 / 30 / 20 / 10)' }, replaces: f.evaluationCriteria.length, rows: crit.map((c) => ({ title: c.description, sub: c.howApplied, badge: `${c.weight}%` })) },
      apply: () => ({ evaluationCriteria: crit }) });
  }
  if (!f.technicalPassingPercentage) {
    out.push({ id: 'pr-tpass', dept: 'procurement', severity: 'improve', section: 'technical-evaluation', field: 'technical-passing-pct',
      title: { en: 'Technical passing percentage is not set', ar: 'نسبة الاجتياز الفني غير محددة' },
      why: { en: 'Without a passing score the committee can’t shortlist vendors. 70% is the usual threshold.', ar: 'بدون درجة اجتياز لا تستطيع اللجنة ترشيح الموردين. 70% هي النسبة المعتادة.' },
      proposal: { kind: 'value', label: { en: 'Technical passing percentage', ar: 'نسبة الاجتياز الفني' }, current: '—', value: '70%' },
      apply: () => ({ technicalPassingPercentage: '70' }) });
  }
  if (!f.qualificationPassingPercentage) {
    out.push({ id: 'pr-qpass', dept: 'procurement', severity: 'improve', section: 'qualification', field: 'q-qualPassing',
      title: { en: 'Qualification passing percentage is not set', ar: 'نسبة اجتياز التأهيل غير محددة' },
      why: { en: 'Vendors are qualified against this score before technical evaluation. 60% is the usual threshold.', ar: 'يُؤهَّل الموردون وفق هذه الدرجة قبل التقييم الفني. 60% هي النسبة المعتادة.' },
      proposal: { kind: 'value', label: { en: 'Qualification passing percentage', ar: 'نسبة اجتياز التأهيل' }, current: '—', value: '60%' },
      apply: () => ({ qualificationPassingPercentage: '60' }) });
  }
  if (f.technicalCommitteeMembers.length < 3) {
    out.push({ id: 'pr-committee', dept: 'procurement', severity: 'return', section: 'technical-evaluation', field: 'q-evaluation',
      title: { en: `Technical committee has ${f.technicalCommitteeMembers.length} member${f.technicalCommitteeMembers.length === 1 ? '' : 's'} — at least 3 are needed`, ar: `اللجنة الفنية تضم ${f.technicalCommitteeMembers.length} عضواً — يلزم 3 على الأقل` },
      why: { en: 'Government Tenders and Procurement Law requires a technical committee of at least three members.', ar: 'يشترط نظام المنافسات والمشتريات الحكومية لجنة فنية من ثلاثة أعضاء على الأقل.' },
      manual: { en: 'Add committee members from the department who can evaluate the offers.', ar: 'أضف أعضاء من الإدارة قادرين على تقييم العروض.' } });
  }
  const noDate = items.filter((r) => !r.deliveryDate);
  if (noDate.length) {
    out.push({ id: 'pr-dates', dept: 'procurement', severity: 'tip', section: 'boq', field: 'q-boq',
      title: { en: `${noDate.length} BOQ line${noDate.length === 1 ? '' : 's'} without a delivery date`, ar: `${noDate.length} من البنود بلا موعد تسليم` },
      why: { en: 'Delivery dates drive the penalty clauses and the payment schedule in the contract.', ar: 'تحدد مواعيد التسليم بنود الغرامات وجدول الدفعات في العقد.' },
      manual: { en: 'Add an expected delivery date to each line.', ar: 'أضف موعد تسليم متوقعاً لكل بند.' } });
  }
  const brand = items.filter((r) => r.hasBrandName && !r.brandJustification?.trim());
  if (brand.length) {
    out.push({ id: 'pr-brand', dept: 'procurement', severity: 'return', section: 'boq', field: 'q-boq',
      title: { en: `${brand.length} brand-name line${brand.length === 1 ? '' : 's'} without a justification`, ar: `${brand.length} من البنود بعلامة تجارية دون مبرر` },
      why: { en: 'Naming a brand restricts competition; the law requires a written justification.', ar: 'تحديد علامة تجارية يقيد المنافسة؛ ويشترط النظام مبرراً مكتوباً.' },
      manual: { en: 'Add the justification, or remove the brand and describe the specification instead.', ar: 'أضف المبرر، أو احذف العلامة التجارية وصِف المواصفات بدلاً منها.' } });
  }
  return out;
}

/** What the review depends on — a change re-runs it (standards bookkeeping excluded). */
export function reviewKey(f: TenderFormData) {
  const { techStandards: _a, techStdKey: _b, deploymentModel: _c, ...rest } = f;
  return JSON.stringify(rest);
}
