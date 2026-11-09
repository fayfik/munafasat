// Enterprise Architecture — (1) whether a request is in EA's scope and why, and
// (2) the reusable technical-standards library (EA · Cybersecurity · PMO) that a
// technology request pulls into its Scope of Work.
//
// From the EA meeting: EA reviews technology RFPs regardless of the requesting
// department — new solutions and upgrades, software subscriptions / licences /
// renewals, solutions integrating with internal systems, managed services tied to
// a technology solution, and role-based managed services requested by IT.
// Consultancy (even from IT) and non-technology role-based services are out of scope.

export interface ScopeInput {
  /** Item names + descriptions (BOQ lines and budgeted items). */
  texts: string[];
  /** Requesting department name (English). */
  department?: string;
}

export interface EaReason { id: string; en: string; ar: string }
export interface EaScope { required: boolean; reasons: EaReason[]; excluded: EaReason[] }

const R = {
  licence:     { id: 'licence',     en: 'Software licences, subscriptions or renewals', ar: 'تراخيص أو اشتراكات أو تجديدات برمجيات' },
  solution:    { id: 'solution',    en: 'A technology solution or upgrade',             ar: 'حل تقني أو ترقية' },
  integration: { id: 'integration', en: 'Integration with internal systems',            ar: 'تكامل مع الأنظمة الداخلية' },
  infra:       { id: 'infra',       en: 'Infrastructure, hardware or hosting',          ar: 'بنية تحتية أو أجهزة أو استضافة' },
  managed:     { id: 'managed',     en: 'Managed service for a technology solution',    ar: 'خدمة مُدارة لحل تقني' },
  itRole:      { id: 'it-role',     en: 'Role-based managed service requested by IT',   ar: 'خدمة مُدارة بالأدوار مطلوبة من تقنية المعلومات' },
};
const X = {
  consultancy: { id: 'consultancy', en: 'Consultancy work (outside EA scope)', ar: 'أعمال استشارية (خارج نطاق البنية المؤسسية)' },
  nonTechRole: { id: 'non-tech-role', en: 'Non-technology role-based service', ar: 'خدمة بالأدوار غير تقنية' },
};

const RX = {
  licence: /\b(licen[cs]e|licen[cs]es|subscription|saas|renewal|software)\b/i,
  integration: /\b(integrat\w*|interface|api|ipaas|middleware|connector)\b/i,
  solution: /\b(implementation|implement|upgrade|platform|system|erp|s\/4hana|sap|crm|portal|application|deployment|migration|configuration)\b/i,
  infra: /\b(server|storage|network|switch|router|firewall|hardware|hosting|data cent(er|re)|cloud|infrastructure)\b/i,
  managed: /\b(managed service|managed services|operate|operations|support|maintenance|helpdesk|soc|noc)\b/i,
  role: /\b(resource|role[- ]based|staff augmentation|manpower|onsite engineer|consultant[s]? \(role\))\b/i,
  consultancy: /\b(consult\w*|advisory|study|strategy|governance|quality|performance measurement|assessment)\b/i,
  techAssessment: /\b(technology assessment|it process|architecture assessment)\b/i,
};

/** Is the request in EA's review scope, and why. */
export function eaScope({ texts, department = '' }: ScopeInput): EaScope {
  const reasons = new Map<string, EaReason>();
  const excluded = new Map<string, EaReason>();
  const isIt = /\b(it|digital|technology|information)\b/i.test(department);
  for (const raw of texts) {
    const s = raw ?? '';
    if (!s.trim()) continue;
    const tech = RX.licence.test(s) || RX.solution.test(s) || RX.integration.test(s) || RX.infra.test(s);
    if (RX.licence.test(s)) reasons.set(R.licence.id, R.licence);
    if (RX.integration.test(s)) reasons.set(R.integration.id, R.integration);
    if (RX.solution.test(s) && !RX.consultancy.test(s)) reasons.set(R.solution.id, R.solution);
    if (RX.infra.test(s)) reasons.set(R.infra.id, R.infra);
    if (RX.managed.test(s) && tech) reasons.set(R.managed.id, R.managed);
    if (RX.role.test(s)) {
      if (isIt) reasons.set(R.itRole.id, R.itRole); else excluded.set(X.nonTechRole.id, X.nonTechRole);
    }
    if (RX.consultancy.test(s) && !tech && !RX.techAssessment.test(s)) excluded.set(X.consultancy.id, X.consultancy);
  }
  return { required: reasons.size > 0, reasons: [...reasons.values()], excluded: [...excluded.values()] };
}

/* ── Technical standards library ─────────────────────────────────────────── */

export type StdOwner = 'EA' | 'Cybersecurity' | 'PMO';
export type StdGroup = 'hosting' | 'integration' | 'security' | 'data' | 'nfr' | 'docs' | 'delivery';
export type Deployment = 'saas' | 'on-prem' | 'hybrid';

export const STD_GROUPS: Record<StdGroup, { en: string; ar: string }> = {
  hosting:     { en: 'Hosting & deployment',          ar: 'الاستضافة والنشر' },
  integration: { en: 'Integration architecture',      ar: 'بنية التكامل' },
  security:    { en: 'Cybersecurity & security',      ar: 'الأمن السيبراني والأمن' },
  data:        { en: 'Data & infrastructure',         ar: 'البيانات والبنية التحتية' },
  nfr:         { en: 'Non-functional requirements',   ar: 'المتطلبات غير الوظيفية' },
  docs:        { en: 'Architecture documentation',    ar: 'وثائق البنية' },
  delivery:    { en: 'Project delivery & handover',   ar: 'تنفيذ المشروع والتسليم' },
};

export interface StdRequirement {
  id: string; group: StdGroup; owner: StdOwner;
  en: string; ar: string;
  /** Mandatory for every in-scope request — cannot be removed, only marked N/A with a reason. */
  required?: boolean;
  /** When AI should pre-select it. */
  when?: { deployment?: Deployment[]; answers?: QuestionId[] };
}

/** Library version shown to requesters and reviewers. */
export const STD_VERSION = '2026.1';

export const STD_LIBRARY: StdRequirement[] = [
  // Hosting
  { id: 'h1', group: 'hosting', owner: 'EA', en: 'SaaS is the preferred deployment model; state the hosting provider, region and tenancy model.', ar: 'نموذج SaaS هو المفضل؛ حدد مزود الاستضافة والمنطقة ونموذج المستأجر.', required: true },
  { id: 'h2', group: 'hosting', owner: 'Cybersecurity', en: 'All data and systems hosted within the Kingdom of Saudi Arabia (CST cloud classification level stated).', ar: 'استضافة جميع البيانات والأنظمة داخل المملكة (مع ذكر مستوى تصنيف الحوسبة السحابية).', required: true },
  { id: 'h3', group: 'hosting', owner: 'EA', en: 'On-premises only: environment specifications (OS, database, virtualisation) and sizing.', ar: 'للنشر المحلي فقط: مواصفات البيئة (نظام التشغيل وقاعدة البيانات والمحاكاة) والسعة.', when: { deployment: ['on-prem', 'hybrid'] } },
  { id: 'h4', group: 'hosting', owner: 'EA', en: 'Separate non-production environments (DEV / QA) with the same version as production.', ar: 'بيئات غير إنتاجية منفصلة (التطوير / الاختبار) بنفس إصدار الإنتاج.', when: { answers: ['build'] } },
  // Integration
  { id: 'i1', group: 'integration', owner: 'EA', en: 'All integrations are built on the organisation’s iPaaS; no point-to-point interfaces.', ar: 'تُبنى جميع التكاملات على منصة التكامل المؤسسية (iPaaS)؛ دون واجهات نقطة لنقطة.', required: true },
  { id: 'i2', group: 'integration', owner: 'EA', en: 'Documented REST / OData APIs with versioning for every interface.', ar: 'واجهات REST / OData موثقة مع إدارة الإصدارات لكل واجهة.', when: { answers: ['integrates'] } },
  { id: 'i3', group: 'integration', owner: 'EA', en: 'Single sign-on with the organisation’s identity provider (SAML 2.0 / OIDC).', ar: 'دخول موحد مع مزود الهوية المؤسسي (SAML 2.0 / OIDC).', required: true },
  // Security
  { id: 's1', group: 'security', owner: 'Cybersecurity', en: 'Compliance with NCA Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC).', ar: 'الالتزام بالضوابط الأساسية للأمن السيبراني والضوابط السحابية من الهيئة الوطنية للأمن السيبراني.', required: true },
  { id: 's2', group: 'security', owner: 'Cybersecurity', en: 'Encryption of data in transit (TLS 1.2+) and at rest (AES-256).', ar: 'تشفير البيانات أثناء النقل (TLS 1.2+) وأثناء التخزين (AES-256).', required: true },
  { id: 's3', group: 'security', owner: 'Cybersecurity', en: 'Annual penetration test and vulnerability remediation within agreed SLAs.', ar: 'اختبار اختراق سنوي ومعالجة الثغرات ضمن اتفاقيات مستوى الخدمة.', when: { answers: ['personal-data', 'external-users', 'build'] } },
  { id: 's4', group: 'security', owner: 'Cybersecurity', en: 'Audit logs exported to the organisation’s SIEM.', ar: 'تصدير سجلات التدقيق إلى نظام SIEM المؤسسي.', when: { answers: ['personal-data', 'critical'] } },
  { id: 's5', group: 'security', owner: 'Cybersecurity', en: 'Internet-facing: multi-factor authentication, web application firewall and DDoS protection.', ar: 'للأنظمة المتاحة عبر الإنترنت: مصادقة متعددة العوامل وجدار حماية لتطبيقات الويب وحماية من هجمات حجب الخدمة.', when: { answers: ['external-users'] } },
  // Data & infra
  { id: 'd1', group: 'data', owner: 'EA', en: 'Data ownership remains with the organisation; full data export on exit in an open format.', ar: 'تبقى ملكية البيانات للجهة؛ تصدير كامل للبيانات عند الخروج بصيغة مفتوحة.', required: true },
  { id: 'd2', group: 'data', owner: 'EA', en: 'Data migration approach, reconciliation and sign-off for each load.', ar: 'منهجية ترحيل البيانات والمطابقة والاعتماد لكل تحميل.', when: { answers: ['migration'] } },
  { id: 'd3', group: 'data', owner: 'EA', en: 'Backup, retention and restore tested at least twice a year.', ar: 'اختبار النسخ الاحتياطي والاحتفاظ والاستعادة مرتين سنوياً على الأقل.', when: { answers: ['critical', 'personal-data'] } },
  { id: 'd4', group: 'data', owner: 'Cybersecurity', en: 'Personal data handled per the Personal Data Protection Law (PDPL); data classified per NDMO.', ar: 'معالجة البيانات الشخصية وفق نظام حماية البيانات الشخصية، وتصنيف البيانات وفق مكتب إدارة البيانات الوطنية.', when: { answers: ['personal-data'] } },
  { id: 'd5', group: 'data', owner: 'EA', en: 'AI features follow SDAIA AI ethics principles; organisation data is not used to train vendor models without approval.', ar: 'تلتزم ميزات الذكاء الاصطناعي بمبادئ أخلاقيات الذكاء الاصطناعي من سدايا؛ ولا تُستخدم بيانات الجهة لتدريب نماذج المورد دون موافقة.', when: { answers: ['ai'] } },
  // NFRs
  { id: 'n1', group: 'nfr', owner: 'EA', en: 'Availability of 99.9% monthly for production, with service credits.', ar: 'توافر 99.9% شهرياً لبيئة الإنتاج مع تعويضات الخدمة.', when: { answers: ['critical'] } },
  { id: 'n2', group: 'nfr', owner: 'EA', en: 'Performance: key transactions respond within 3 seconds at peak load.', ar: 'الأداء: استجابة المعاملات الرئيسية خلال 3 ثوانٍ في ذروة الحمل.', when: { answers: ['build', 'external-users'] } },
  { id: 'n3', group: 'nfr', owner: 'EA', en: 'Arabic and English user interface with right-to-left support.', ar: 'واجهة مستخدم بالعربية والإنجليزية مع دعم الكتابة من اليمين لليسار.', when: { answers: ['build', 'external-users'] } },
  { id: 'n4', group: 'nfr', owner: 'EA', en: 'Disaster recovery: RPO ≤ 1 hour, RTO ≤ 4 hours.', ar: 'التعافي من الكوارث: نقطة الاستعادة ≤ ساعة، زمن الاستعادة ≤ 4 ساعات.', when: { answers: ['critical'] } },
  // Docs
  { id: 'a1', group: 'docs', owner: 'EA', en: 'Current-state and target-state architecture documents.', ar: 'وثائق البنية للوضع الحالي والمستهدف.', required: true },
  { id: 'a2', group: 'docs', owner: 'EA', en: 'Solution architecture and integration design approved by EA before build.', ar: 'اعتماد البنية التقنية للحل وتصميم التكامل من البنية المؤسسية قبل البناء.', when: { answers: ['build', 'integrates'] } },
  // Delivery (PMO)
  { id: 'p1', group: 'delivery', owner: 'PMO', en: 'Knowledge transfer, training and documentation handover before project closure.', ar: 'نقل المعرفة والتدريب وتسليم الوثائق قبل إغلاق المشروع.', required: true },
  { id: 'p2', group: 'delivery', owner: 'PMO', en: 'Project stages with deliverables linked to payment milestones.', ar: 'مراحل المشروع مع مخرجات مرتبطة بدفعات السداد.', when: { answers: ['build', 'migration'] } },
];

export interface StdSelection { id: string; status: 'included' | 'na'; naReason?: string; ai?: boolean }

/* ── Project questions: answers build the deployment model and the standards ── */

export type QuestionId = 'saas' | 'own-servers' | 'build' | 'integrates' | 'migration' | 'personal-data' | 'external-users' | 'critical' | 'ai';
export type Answers = Partial<Record<QuestionId, boolean>>;

export interface StdQuestion {
  id: QuestionId; short: string; shortAr: string; tone: 'brand' | 'ai' | 'warning' | 'success' | 'error' | 'info';
  en: string; ar: string; descEn: string; descAr: string;
  /** Asked only when this returns true (project-dependent). */
  ask?: (ctx: QCtx) => boolean;
  /** Suggested answer from the request's items, with the item it came from. */
  guess?: (ctx: QCtx) => Guess | null;
}
/** A piece of the request the answers are read from, with where it came from. */
export interface SrcText { src: { en: string; ar: string }; text: string }
export interface QCtx { scope: EaScope; texts: SrcText[]; answers: Answers }
export interface Guess { yes: boolean; basis: string; src?: { en: string; ar: string } }

const has = (c: QCtx, id: string) => c.scope.reasons.some((r) => r.id === id);
/** Short quote around the match, so the requester sees what the answer was read from. */
function snippet(text: string, rx: RegExp) {
  const m = new RegExp(rx.source, rx.flags.replace('g', '')).exec(text);
  if (!m || text.length <= 70) return text.trim();
  const a = Math.max(0, m.index - 28), b = Math.min(text.length, m.index + m[0].length + 34);
  return `${a > 0 ? '…' : ''}${text.slice(a, b).replace(/^\S*\s/, a > 0 ? '' : '$&').trim()}${b < text.length ? '…' : ''}`;
}
const hitSrc = (c: QCtx, rx: RegExp) => c.texts.find((t) => rx.test(t.text));
const hit = (c: QCtx, rx: RegExp) => { const h = hitSrc(c, rx); return h ? snippet(h.text, rx) : undefined; };
const found = (c: QCtx, rx: RegExp, yes: boolean): Guess | null => { const h = hitSrc(c, rx); return h ? { yes, basis: snippet(h.text, rx), src: h.src } : null; };
const yesIf = (c: QCtx, rx: RegExp, noRx?: RegExp): Guess | null => found(c, rx, true) ?? (noRx ? found(c, noRx, false) : null);
const infraOnly = (c: QCtx) => has(c, 'infra') && !has(c, 'licence') && !has(c, 'solution');
const licenceOnly = (c: QCtx) => has(c, 'licence') && !has(c, 'solution') && !has(c, 'integration') && !has(c, 'infra');

export const STD_QUESTIONS: StdQuestion[] = [
  { id: 'saas', short: 'Cloud service (SaaS)', shortAr: 'خدمة سحابية (SaaS)', tone: 'brand', en: 'Is it delivered as a cloud service (SaaS)?', ar: 'هل يُقدَّم كخدمة سحابية (SaaS)؟',
    descEn: 'The vendor hosts and runs it; you use it over the internet. EA direction is SaaS first.', descAr: 'يستضيفه المورد ويشغّله وتستخدمه عبر الإنترنت. توجه البنية المؤسسية هو SaaS أولاً.',
    ask: (c) => !infraOnly(c), guess: (c) => yesIf(c, /saas|cloud|subscription|hosted by the vendor/i, /on[- ]?prem|our (own )?(servers|data ?cent(er|re))/i) },
  { id: 'own-servers', short: 'Runs on our servers', shortAr: 'يعمل على خوادمنا', tone: 'info', en: 'Will any part run on our own servers?', ar: 'هل سيعمل أي جزء على خوادمنا؟',
    descEn: 'For example an on-site gateway, a local database or a connector installed in our data centre.', descAr: 'مثل بوابة محلية أو قاعدة بيانات محلية أو موصل مثبت في مركز بياناتنا.',
    ask: (c) => c.answers.saas === true, guess: (c) => yesIf(c, /on[- ]?prem|gateway|installed (in|on) our|data ?cent(er|re)|local server/i, /fully (hosted|managed) by the vendor|no on[- ]?prem/i) },
  { id: 'build', short: 'New build or upgrade', shortAr: 'تنفيذ جديد أو ترقية', tone: 'success', en: 'Is it a new implementation or an upgrade?', ar: 'هل هو تنفيذ جديد أو ترقية؟',
    descEn: 'Answer No if you are only renewing or adding licences for something already running.', descAr: 'أجب بلا إذا كنت تجدد أو تضيف تراخيص لنظام قائم فقط.',
    ask: (c) => !infraOnly(c), guess: (c) => (licenceOnly(c) ? found(c, /licen[cs]e|subscription|renewal/i, false) : yesIf(c, /implement|upgrade|deploy|configur|new system|platform|roll-?out/i)) },
  { id: 'integrates', short: 'Internal integrations', shortAr: 'تكامل مع الأنظمة الداخلية', tone: 'ai', en: 'Does it connect to our internal systems?', ar: 'هل يتكامل مع أنظمتنا الداخلية؟',
    descEn: 'SAP, HR, Etimad, the identity provider or any other system we run.', descAr: 'ساب أو الموارد البشرية أو اعتماد أو مزود الهوية أو أي نظام آخر لدينا.',
    guess: (c) => yesIf(c, /integrat|interface|\bapi|ipaas|connector|\bsap\b|\bhr\b/i) },
  { id: 'migration', short: 'Data migration', shortAr: 'ترحيل البيانات', tone: 'warning', en: 'Are we moving data from an existing system?', ar: 'هل سننقل بيانات من نظام قائم؟',
    descEn: 'Historical records, master data or documents that must be loaded into the new solution.', descAr: 'سجلات تاريخية أو بيانات رئيسية أو مستندات يجب تحميلها في الحل الجديد.',
    ask: (c) => c.answers.build !== false && !infraOnly(c), guess: (c) => yesIf(c, /migrat|data load|legacy|replace/i) },
  { id: 'personal-data', short: 'Personal / confidential data', shortAr: 'بيانات شخصية / سرية', tone: 'error', en: 'Will it hold personal or confidential data?', ar: 'هل سيحتوي على بيانات شخصية أو سرية؟',
    descEn: 'Employee, customer or citizen records, or anything classified above Public.', descAr: 'سجلات الموظفين أو العملاء أو المواطنين أو أي بيانات مصنفة أعلى من "عام".',
    guess: (c) => yesIf(c, /\bhr\b|payroll|employee|customer|crm|citizen|patient|personal|erp|s\/4hana/i) },
  { id: 'external-users', short: 'External users', shortAr: 'مستخدمون خارجيون', tone: 'info', en: 'Will people outside the organisation use it?', ar: 'هل سيستخدمه أشخاص من خارج الجهة؟',
    descEn: 'Suppliers, citizens or partners logging in from the internet.', descAr: 'موردون أو مواطنون أو شركاء يسجلون الدخول عبر الإنترنت.',
    guess: (c) => yesIf(c, /portal|citizens?|public[- ]facing|website|mobile app|external users/i, /internal (staff|users|use)|employees only/i) },
  { id: 'critical', short: 'Business-critical', shortAr: 'حرج للأعمال', tone: 'warning', en: 'Would an outage stop critical work?', ar: 'هل يوقف تعطله أعمالاً حرجة؟',
    descEn: 'If it is down for a day, core operations or services to the public are affected.', descAr: 'إذا تعطل يوماً تتأثر العمليات الأساسية أو الخدمات المقدمة للجمهور.',
    guess: (c) => yesIf(c, /erp|s\/4hana|core|finance|payroll|network|firewall|data cent(er|re)/i) },
  { id: 'ai', short: 'AI / analytics', shortAr: 'ذكاء اصطناعي / تحليلات', tone: 'ai', en: 'Does it use AI or analytics on our data?', ar: 'هل يستخدم الذكاء الاصطناعي أو التحليلات على بياناتنا؟',
    descEn: 'Machine learning, generative AI, chatbots or BI dashboards.', descAr: 'تعلم الآلة أو الذكاء الاصطناعي التوليدي أو روبوتات المحادثة أو لوحات ذكاء الأعمال.',
    guess: (c) => yesIf(c, /\bai\b|artificial intelligence|machine learning|analytics|\bbi\b|chatbot|copilot/i) },
];

/** The questions to ask for this project, in order (depends on items and earlier answers). */
export function questionsFor(ctx: QCtx): StdQuestion[] {
  return STD_QUESTIONS.filter((q) => !q.ask || q.ask(ctx));
}

/** Deployment model built from the answers. */
export function deploymentFrom(scope: EaScope, a: Answers): Deployment {
  if (a.saas === undefined) return has({ scope, texts: [], answers: a }, 'infra') ? 'on-prem' : 'saas';
  if (!a.saas) return 'on-prem';
  return a['own-servers'] ? 'hybrid' : 'saas';
}

/** Standards for this request: every required item plus those the answers / deployment call for. */
export function suggestStandards(deployment: Deployment, answers: Answers): StdSelection[] {
  return STD_LIBRARY.filter((s) => s.required
    || s.when?.deployment?.includes(deployment)
    || s.when?.answers?.some((q) => answers[q]))
    .map((s) => ({ id: s.id, status: 'included' as const, ai: !s.required }));
}

/** Which answer(s) brought a standard in — shown as "Because…". */
export function stdBecause(s: StdRequirement, answers: Answers, deployment: Deployment): QuestionId[] | 'deployment' | null {
  if (s.when?.deployment?.includes(deployment)) return 'deployment';
  const q = (s.when?.answers ?? []).filter((x) => answers[x]);
  return q.length ? q : null;
}
export const stdById = (id: string) => STD_LIBRARY.find((s) => s.id === id);
