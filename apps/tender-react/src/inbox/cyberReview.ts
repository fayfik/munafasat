// Cybersecurity review task — the sections Cyber owns on a request, the vendor-ready
// clause library, and the standard return reasons (Cybersecurity interview).
import type { Task } from './types';
import { stdById } from '../lib/eaStandards';

export type CyberKind = 'scope' | 'tech' | 'integration' | 'data' | 'security';
export interface CyberRow { key: string; en: string; ar: string; subEn?: string; subAr?: string; added?: boolean }
export interface CyberSection { id: CyberKind; en: string; ar: string; hintEn: string; hintAr: string; rows: CyberRow[]; canAdd: boolean }

/** Clauses Cyber can insert straight into the request (vendor-ready wording). */
export interface CyberClause { id: string; cat: Exclude<CyberKind, 'scope'>; en: string; ar: string; descEn: string; descAr: string }
export const CYBER_LIBRARY: CyberClause[] = [
  { id: 'c-ecc', cat: 'security', en: 'NCA ECC & CCC compliance', ar: 'الامتثال لضوابط الهيئة الوطنية للأمن السيبراني', descEn: 'The vendor shall comply with NCA ECC-2:2024 and, for cloud services, CCC-2:2024, and provide a compliance matrix with the proposal.', descAr: 'يلتزم المورد بالضوابط الأساسية للأمن السيبراني ECC-2:2024، وبالضوابط السحابية CCC-2:2024 للخدمات السحابية، ويقدّم مصفوفة امتثال مع العرض.' },
  { id: 'c-pentest', cat: 'security', en: 'Independent penetration test before go-live', ar: 'اختبار اختراق مستقل قبل التشغيل', descEn: 'An independent penetration test shall be performed before go-live and annually; critical findings closed within 7 days, high within 30 days.', descAr: 'يُجرى اختبار اختراق مستقل قبل التشغيل وسنوياً؛ تُغلق الثغرات الحرجة خلال 7 أيام والعالية خلال 30 يوماً.' },
  { id: 'c-siem', cat: 'security', en: 'Security logs to the bank SIEM', ar: 'إرسال السجلات الأمنية إلى SIEM', descEn: 'Security and audit logs shall be forwarded in real time to the organisation’s SIEM (Syslog/CEF) and retained for at least 12 months.', descAr: 'تُرسل السجلات الأمنية وسجلات التدقيق فورياً إلى نظام SIEM المؤسسي (Syslog/CEF) وتُحفظ 12 شهراً على الأقل.' },
  { id: 'c-pam', cat: 'security', en: 'Privileged access management', ar: 'إدارة الصلاحيات المميزة', descEn: 'All privileged and vendor support access shall go through the organisation’s PAM solution with session recording and MFA.', descAr: 'يتم كل وصول مميز أو وصول دعم من المورد عبر حل إدارة الصلاحيات المميزة مع تسجيل الجلسات والمصادقة المتعددة.' },
  { id: 'c-sdlc', cat: 'tech', en: 'Secure development & code review', ar: 'التطوير الآمن ومراجعة الشيفرة', descEn: 'Custom code shall follow a secure SDLC (OWASP ASVS L2), with static code analysis results shared before each release.', descAr: 'تتبع الشيفرة المخصصة دورة تطوير آمنة (OWASP ASVS L2) مع مشاركة نتائج التحليل الساكن قبل كل إصدار.' },
  { id: 'c-sso', cat: 'integration', en: 'SSO with MFA', ar: 'دخول موحد مع مصادقة متعددة', descEn: 'User access shall use the organisation’s identity provider (SAML 2.0 / OIDC) with multi-factor authentication; no local accounts.', descAr: 'يتم دخول المستخدمين عبر مزود الهوية المؤسسي (SAML 2.0 / OIDC) مع مصادقة متعددة العوامل؛ دون حسابات محلية.' },
  { id: 'c-api', cat: 'integration', en: 'Secured interfaces', ar: 'تأمين الواجهات', descEn: 'Every interface shall use mutual TLS or OAuth 2.0 client credentials through the organisation’s API gateway; no shared passwords.', descAr: 'تستخدم كل واجهة TLS المتبادل أو OAuth 2.0 عبر بوابة الواجهات المؤسسية؛ دون كلمات مرور مشتركة.' },
  { id: 'c-residency', cat: 'data', en: 'Data residency in KSA', ar: 'توطين البيانات في المملكة', descEn: 'All data, including backups and logs, shall be stored and processed within the Kingdom of Saudi Arabia.', descAr: 'تُخزن جميع البيانات، بما فيها النسخ الاحتياطية والسجلات، وتُعالج داخل المملكة العربية السعودية.' },
  { id: 'c-dpa', cat: 'data', en: 'NDA and data processing agreement', ar: 'اتفاقية عدم إفصاح ومعالجة بيانات', descEn: 'The vendor shall sign the organisation’s NDA and a PDPL data processing agreement before receiving any data.', descAr: 'يوقّع المورد اتفاقية عدم الإفصاح واتفاقية معالجة البيانات وفق نظام حماية البيانات الشخصية قبل استلام أي بيانات.' },
  { id: 'c-encrypt', cat: 'data', en: 'Encryption with bank-held keys', ar: 'التشفير بمفاتيح تملكها الجهة', descEn: 'Data at rest shall be encrypted with AES-256 using keys managed by the organisation (BYOK / HSM).', descAr: 'تُشفّر البيانات المخزنة بخوارزمية AES-256 بمفاتيح تديرها الجهة (BYOK / HSM).' },
];

export const CYBER_RETURN_REASONS: { id: string; en: string; ar: string }[] = [
  { id: 'missing-sec', en: 'Missing security requirement', ar: 'متطلب أمني مفقود' },
  { id: 'unclear', en: 'Unclear solution or integration', ar: 'الحل أو التكامل غير واضح' },
  { id: 'no-class', en: 'Data classification not stated', ar: 'تصنيف البيانات غير محدد' },
  { id: 'ecc', en: 'Conflicts with NCA ECC', ar: 'يتعارض مع ضوابط الهيئة الوطنية للأمن السيبراني' },
];

const std = (task: Task, group: string): CyberRow[] =>
  (task.rfp?.techStandards ?? []).filter((x) => x.status !== 'na' && stdById(x.id)?.group === group)
    .map((x) => { const s = stdById(x.id)!; return { key: `std-${x.id}`, en: s.en, ar: s.ar }; });

/** The sections Cyber owns on this request, each with the rows to accept or comment on. */
export function cyberSections(task: Task): CyberSection[] {
  const rfp = task.rfp;
  if (!rfp) return [];
  const reqs = (rfp.techRequirements ?? []).map((r, i) => ({ r, i, cat: r.cyberClause ? CYBER_LIBRARY.find((c) => c.id === r.cyberClause)?.cat ?? 'tech' : 'tech' }));
  // Clauses Cyber inserted show in the section they belong to.
  const reqRows = (cat: string): CyberRow[] => reqs.filter((x) => x.cat === cat)
    .map(({ r, i }) => ({ key: `req-${i}`, en: r.reqEn, ar: r.reqAr ?? r.reqEn, subEn: r.descEn, subAr: r.descAr, added: !!r.cyberClause }));
  const personal = !!(rfp.techAnswers as Record<string, boolean> | undefined)?.['personal-data'];
  const critical = !!(rfp.techAnswers as Record<string, boolean> | undefined)?.critical;
  const out: CyberSection[] = [
    { id: 'scope', en: 'Scope of Work', ar: 'نطاق العمل', hintEn: 'Is the solution clear enough to assess its security?', hintAr: 'هل الحل واضح بما يكفي لتقييم أمنه؟', canAdd: false,
      rows: [{ key: 'scope', en: rfp.scopeEn ?? '', ar: rfp.scopeAr ?? rfp.scopeEn ?? '' }] },
    { id: 'tech', en: 'Technical requirements', ar: 'المتطلبات التقنية', hintEn: 'What the vendor must meet.', hintAr: 'ما يجب على المورد استيفاؤه.', canAdd: true,
      rows: reqRows('tech') },
    { id: 'integration', en: 'Integrations', ar: 'التكاملات', hintEn: 'How the system connects and signs users in.', hintAr: 'كيف يتصل النظام ويُدخل المستخدمين.', canAdd: true, rows: [...std(task, 'integration'), ...reqRows('integration')] },
    { id: 'data', en: 'Data classification', ar: 'تصنيف البيانات', hintEn: 'What data the vendor touches, and how it is protected.', hintAr: 'البيانات التي يتعامل معها المورد وكيفية حمايتها.', canAdd: true,
      rows: [
        { key: 'class', en: personal ? 'Confidential — contains personal data (PDPL applies)' : critical ? 'Restricted — critical business data' : 'Internal', ar: personal ? 'سري — يحتوي على بيانات شخصية (ينطبق نظام حماية البيانات)' : critical ? 'مقيد — بيانات أعمال حرجة' : 'داخلي',
          subEn: 'Derived from the requester’s answers about the project.', subAr: 'مستنتج من إجابات مقدّم الطلب عن المشروع.' },
        ...std(task, 'data'), ...reqRows('data'),
      ] },
    { id: 'security', en: 'Cybersecurity standards', ar: 'معايير الأمن السيبراني', hintEn: 'Controls pulled from the standards library.', hintAr: 'ضوابط من مكتبة المعايير.', canAdd: true, rows: [...std(task, 'security'), ...reqRows('security')] },
  ];
  return out.filter((s) => s.rows.length || s.canAdd);
}

export const cyberRowKeys = (task: Task) => cyberSections(task).flatMap((s) => s.rows.map((r) => r.key));

/** Note for the requester: every row Cyber commented on. */
export function cyberCommentDigest(task: Task, isAr: boolean): string {
  const rows = new Map(cyberSections(task).flatMap((s) => s.rows.map((r) => [r.key, { r, s }] as const)));
  return Object.entries(task.cyberDecisions ?? {})
    .filter(([, d]) => d.state === 'comment' && d.comment?.trim())
    .map(([k, d]) => { const x = rows.get(k); return `• ${x ? `${isAr ? x.s.ar : x.s.en} — ${isAr ? x.r.ar : x.r.en}` : k}: ${d.comment}`; })
    .join('\n');
}
