// Manual build — the central Cybersecurity requirements library (Kholoud's point 2).
// Each requirement says which project types it applies to and the lowest data classification
// that makes it mandatory. Requesters pick from it while writing the Scope of Work, and the
// Cyber reviewer checks the request against the same list for the classification they set.

export const CLASSIFICATIONS = [
  { en: 'Public', ar: 'عام' },
  { en: 'Internal', ar: 'داخلي' },
  { en: 'Confidential', ar: 'سري' },
  { en: 'Top secret', ar: 'سري للغاية' },
] as const;
export type ClassLevel = 0 | 1 | 2 | 3;
export const classLevel = (en?: string): ClassLevel => (Math.max(0, CLASSIFICATIONS.findIndex((c) => c.en === en)) as ClassLevel);

export interface CyberReq {
  id: string;
  titleEn: string; titleAr: string;
  textEn: string;
  /** Project categories it applies to (Step 3 "Which department's approval is necessary?"). */
  appliesTo: ('technology' | 'consultancy' | 'general')[];
  /** Mandatory from this data classification up. */
  minLevel: ClassLevel;
}

export const CYBER_LIBRARY: CyberReq[] = [
  { id: 'cy-ecc', titleEn: 'Comply with NCA Essential Cybersecurity Controls (ECC-2:2024)', titleAr: 'الالتزام بالضوابط الأساسية للأمن السيبراني',
    textEn: 'The vendor shall comply with the NCA Essential Cybersecurity Controls for every system and service delivered, and provide a compliance statement before go-live.', appliesTo: ['technology', 'consultancy', 'general'], minLevel: 0 },
  { id: 'cy-nda', titleEn: 'Confidentiality and non-disclosure for all vendor staff', titleAr: 'السرية وعدم الإفصاح لجميع موظفي المورد',
    textEn: 'All vendor personnel with access to the entity’s information shall sign a non-disclosure agreement before access is granted.', appliesTo: ['technology', 'consultancy', 'general'], minLevel: 1 },
  { id: 'cy-residency', titleEn: 'Data hosted and processed inside the Kingdom', titleAr: 'استضافة البيانات ومعالجتها داخل المملكة',
    textEn: 'All data, backups and logs shall be stored and processed inside the Kingdom of Saudi Arabia, in line with NCA cloud controls and data-residency rules.', appliesTo: ['technology'], minLevel: 1 },
  { id: 'cy-ccc', titleEn: 'Cloud services meet NCA Cloud Cybersecurity Controls', titleAr: 'الخدمات السحابية تلتزم بضوابط الأمن السيبراني للحوسبة السحابية',
    textEn: 'SaaS, PaaS or IaaS components shall be provided by a CST-registered cloud service provider at the level matching the data classification.', appliesTo: ['technology'], minLevel: 1 },
  { id: 'cy-iam', titleEn: 'Single sign-on and role-based access', titleAr: 'الدخول الموحد والصلاحيات حسب الدور',
    textEn: 'The solution shall integrate with the entity’s identity provider (SSO, MFA) and enforce role-based access with least privilege.', appliesTo: ['technology'], minLevel: 1 },
  { id: 'cy-integ', titleEn: 'Secure integrations (encrypted, authenticated APIs)', titleAr: 'تكاملات آمنة (واجهات مشفرة وموثقة)',
    textEn: 'All integrations shall use authenticated, encrypted channels (TLS 1.2+) through the entity’s integration platform; no direct database links.', appliesTo: ['technology'], minLevel: 1 },
  { id: 'cy-crypto', titleEn: 'Encryption of data at rest and in transit', titleAr: 'تشفير البيانات المخزنة والمنقولة',
    textEn: 'Data shall be encrypted at rest and in transit using NCA-approved cryptographic standards, with keys managed by the entity.', appliesTo: ['technology'], minLevel: 2 },
  { id: 'cy-pentest', titleEn: 'Penetration test before go-live and yearly', titleAr: 'اختبار اختراق قبل التشغيل وسنوياً',
    textEn: 'The vendor shall fix all critical and high findings of an independent penetration test before go-live, and repeat the test every year.', appliesTo: ['technology'], minLevel: 2 },
  { id: 'cy-logs', titleEn: 'Security logs sent to the entity’s SOC', titleAr: 'إرسال سجلات الأمن إلى مركز العمليات الأمنية',
    textEn: 'Security events shall be logged and forwarded to the entity’s SIEM / SOC, and kept for at least 12 months.', appliesTo: ['technology'], minLevel: 2 },
  { id: 'cy-incident', titleEn: 'Report security incidents within 24 hours', titleAr: 'الإبلاغ عن الحوادث الأمنية خلال 24 ساعة',
    textEn: 'The vendor shall report any security incident affecting the entity’s data or services within 24 hours and support the investigation.', appliesTo: ['technology', 'consultancy'], minLevel: 1 },
  { id: 'cy-data-return', titleEn: 'Return and secure deletion of data at contract end', titleAr: 'إعادة البيانات وحذفها الآمن عند انتهاء العقد',
    textEn: 'At contract end the vendor shall return all entity data and securely delete remaining copies, with a deletion certificate.', appliesTo: ['technology', 'consultancy'], minLevel: 2 },
  { id: 'cy-clearance', titleEn: 'Security clearance for staff handling secret data', titleAr: 'تصريح أمني للموظفين المطلعين على البيانات السرية',
    textEn: 'Vendor staff with access to Top secret information shall hold the required security clearance and work on the entity’s premises only.', appliesTo: ['technology', 'consultancy', 'general'], minLevel: 3 },
];

/** Requirements that apply to a request with these categories at this classification. */
export function applicableReqs(categories: string[], level: ClassLevel): CyberReq[] {
  const cats = categories.length ? categories : ['technology'];
  return CYBER_LIBRARY.filter((r) => r.minLevel <= level && r.appliesTo.some((c) => cats.includes(c)));
}

/** Requirement title as it appears in the request's technical requirements. */
export const reqLabel = (r: CyberReq) => `Cybersecurity — ${r.titleEn}`;
