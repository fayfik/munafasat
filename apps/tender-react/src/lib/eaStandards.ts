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
  when?: { deployment?: Deployment[]; reasons?: string[] };
}

/** Library version shown to requesters and reviewers. */
export const STD_VERSION = '2026.1';

export const STD_LIBRARY: StdRequirement[] = [
  // Hosting
  { id: 'h1', group: 'hosting', owner: 'EA', en: 'SaaS is the preferred deployment model; state the hosting provider, region and tenancy model.', ar: 'نموذج SaaS هو المفضل؛ حدد مزود الاستضافة والمنطقة ونموذج المستأجر.', required: true },
  { id: 'h2', group: 'hosting', owner: 'Cybersecurity', en: 'All data and systems hosted within the Kingdom of Saudi Arabia (CST cloud classification level stated).', ar: 'استضافة جميع البيانات والأنظمة داخل المملكة (مع ذكر مستوى تصنيف الحوسبة السحابية).', required: true },
  { id: 'h3', group: 'hosting', owner: 'EA', en: 'On-premises only: environment specifications (OS, database, virtualisation) and sizing.', ar: 'للنشر المحلي فقط: مواصفات البيئة (نظام التشغيل وقاعدة البيانات والمحاكاة) والسعة.', when: { deployment: ['on-prem', 'hybrid'] } },
  { id: 'h4', group: 'hosting', owner: 'EA', en: 'Separate non-production environments (DEV / QA) with the same version as production.', ar: 'بيئات غير إنتاجية منفصلة (التطوير / الاختبار) بنفس إصدار الإنتاج.', when: { reasons: ['solution'] } },
  // Integration
  { id: 'i1', group: 'integration', owner: 'EA', en: 'All integrations are built on the organisation’s iPaaS; no point-to-point interfaces.', ar: 'تُبنى جميع التكاملات على منصة التكامل المؤسسية (iPaaS)؛ دون واجهات نقطة لنقطة.', required: true, when: { reasons: ['integration', 'solution'] } },
  { id: 'i2', group: 'integration', owner: 'EA', en: 'Documented REST / OData APIs with versioning for every interface.', ar: 'واجهات REST / OData موثقة مع إدارة الإصدارات لكل واجهة.', when: { reasons: ['integration', 'solution'] } },
  { id: 'i3', group: 'integration', owner: 'EA', en: 'Single sign-on with the organisation’s identity provider (SAML 2.0 / OIDC).', ar: 'دخول موحد مع مزود الهوية المؤسسي (SAML 2.0 / OIDC).', required: true },
  // Security
  { id: 's1', group: 'security', owner: 'Cybersecurity', en: 'Compliance with NCA Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC).', ar: 'الالتزام بالضوابط الأساسية للأمن السيبراني والضوابط السحابية من الهيئة الوطنية للأمن السيبراني.', required: true },
  { id: 's2', group: 'security', owner: 'Cybersecurity', en: 'Encryption of data in transit (TLS 1.2+) and at rest (AES-256).', ar: 'تشفير البيانات أثناء النقل (TLS 1.2+) وأثناء التخزين (AES-256).', required: true },
  { id: 's3', group: 'security', owner: 'Cybersecurity', en: 'Annual penetration test and vulnerability remediation within agreed SLAs.', ar: 'اختبار اختراق سنوي ومعالجة الثغرات ضمن اتفاقيات مستوى الخدمة.', when: { reasons: ['solution', 'licence', 'infra'] } },
  { id: 's4', group: 'security', owner: 'Cybersecurity', en: 'Audit logs exported to the organisation’s SIEM.', ar: 'تصدير سجلات التدقيق إلى نظام SIEM المؤسسي.', when: { reasons: ['solution', 'infra', 'managed'] } },
  // Data & infra
  { id: 'd1', group: 'data', owner: 'EA', en: 'Data ownership remains with the organisation; full data export on exit in an open format.', ar: 'تبقى ملكية البيانات للجهة؛ تصدير كامل للبيانات عند الخروج بصيغة مفتوحة.', required: true },
  { id: 'd2', group: 'data', owner: 'EA', en: 'Data migration approach, reconciliation and sign-off for each load.', ar: 'منهجية ترحيل البيانات والمطابقة والاعتماد لكل تحميل.', when: { reasons: ['solution'] } },
  { id: 'd3', group: 'data', owner: 'EA', en: 'Backup, retention and restore tested at least twice a year.', ar: 'اختبار النسخ الاحتياطي والاحتفاظ والاستعادة مرتين سنوياً على الأقل.', when: { reasons: ['solution', 'infra', 'managed'] } },
  // NFRs
  { id: 'n1', group: 'nfr', owner: 'EA', en: 'Availability of 99.9% monthly for production, with service credits.', ar: 'توافر 99.9% شهرياً لبيئة الإنتاج مع تعويضات الخدمة.', when: { reasons: ['solution', 'licence', 'managed'] } },
  { id: 'n2', group: 'nfr', owner: 'EA', en: 'Performance: key transactions respond within 3 seconds at peak load.', ar: 'الأداء: استجابة المعاملات الرئيسية خلال 3 ثوانٍ في ذروة الحمل.', when: { reasons: ['solution'] } },
  { id: 'n3', group: 'nfr', owner: 'EA', en: 'Arabic and English user interface with right-to-left support.', ar: 'واجهة مستخدم بالعربية والإنجليزية مع دعم الكتابة من اليمين لليسار.', when: { reasons: ['solution', 'licence'] } },
  { id: 'n4', group: 'nfr', owner: 'EA', en: 'Disaster recovery: RPO ≤ 1 hour, RTO ≤ 4 hours.', ar: 'التعافي من الكوارث: نقطة الاستعادة ≤ ساعة، زمن الاستعادة ≤ 4 ساعات.', when: { reasons: ['solution', 'infra'] } },
  // Docs
  { id: 'a1', group: 'docs', owner: 'EA', en: 'Current-state and target-state architecture documents.', ar: 'وثائق البنية للوضع الحالي والمستهدف.', required: true },
  { id: 'a2', group: 'docs', owner: 'EA', en: 'Solution architecture and integration design approved by EA before build.', ar: 'اعتماد البنية التقنية للحل وتصميم التكامل من البنية المؤسسية قبل البناء.', when: { reasons: ['solution', 'integration'] } },
  // Delivery (PMO)
  { id: 'p1', group: 'delivery', owner: 'PMO', en: 'Knowledge transfer, training and documentation handover before project closure.', ar: 'نقل المعرفة والتدريب وتسليم الوثائق قبل إغلاق المشروع.', required: true },
  { id: 'p2', group: 'delivery', owner: 'PMO', en: 'Project stages with deliverables linked to payment milestones.', ar: 'مراحل المشروع مع مخرجات مرتبطة بدفعات السداد.', when: { reasons: ['solution', 'integration'] } },
];

export interface StdSelection { id: string; status: 'included' | 'na'; naReason?: string; ai?: boolean }

/** AI pre-selection: every required item plus those matching the request's reasons / deployment. */
export function suggestStandards(scope: EaScope, deployment: Deployment): StdSelection[] {
  const rs = new Set(scope.reasons.map((r) => r.id));
  return STD_LIBRARY.filter((s) => s.required
    || (s.when?.deployment?.includes(deployment))
    || (s.when?.reasons?.some((r) => rs.has(r)) && !s.when?.deployment))
    .map((s) => ({ id: s.id, status: 'included' as const, ai: !s.required }));
}
export const stdById = (id: string) => STD_LIBRARY.find((s) => s.id === id);
