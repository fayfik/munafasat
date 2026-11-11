// Business continuity (BCM) screening, the BCM clause set, and the Third-Party Risk
// Assessment checklist (ORM) — asked in Review & Confirm, reviewed by BCM and ORM.
// BCM applicability is decided by the SERVICE (what stops if it fails), never by the
// department (BCM & ORM meeting). Answers are read from the request where possible.

export interface SrcText { src: { en: string; ar: string }; text: string }
export type Answers = Partial<Record<string, boolean>>;
export interface Guess { yes: boolean; basis: string; src?: { en: string; ar: string } }

export interface CRQuestion {
  id: string; short: string; shortAr: string;
  en: string; ar: string; descEn: string; descAr: string;
  icon: string;                               // svg path
  guess?: (texts: SrcText[], ext: Answers) => Guess | null;
}

const find = (texts: SrcText[], rx: RegExp, yes: boolean): Guess | null => {
  const h = texts.find((x) => rx.test(x.text));
  if (!h) return null;
  const m = new RegExp(rx.source, rx.flags.replace('g', '')).exec(h.text)!;
  const a = Math.max(0, m.index - 24), b = Math.min(h.text.length, m.index + m[0].length + 30);
  return { yes, basis: `${a ? '…' : ''}${h.text.slice(a, b).trim()}${b < h.text.length ? '…' : ''}`, src: h.src };
};
const yesIf = (t: SrcText[], rx: RegExp, noRx?: RegExp) => find(t, rx, true) ?? (noRx ? find(t, noRx, false) : null);

const CRITICAL = /\berp\b|s\/4hana|core (system|banking)|payment|treasury|\bsoc\b|siem|security monitoring|network|data ?cent(er|re)|firewall|finance|payroll|clearing|swift/i;
const SUPPLEMENTARY = /branding|brand identity|general training|furniture|chairs|catering|event|marketing|printing|gift|décor|decor/i;

/* ── BCM screening ─────────────────────────────────────────────────────── */
export const BCM_QUESTIONS: CRQuestion[] = [
  { id: 'critical', short: 'Supports a critical system or process', shortAr: 'يدعم نظاماً أو عملية حرجة',
    en: 'Does this service support a critical system, application or business process?', ar: 'هل تدعم هذه الخدمة نظاماً أو تطبيقاً أو عملية أعمال حرجة؟',
    descEn: 'Judge the service itself, not your department. A critical department can buy something non-critical (e.g. branding).', descAr: 'قيّم الخدمة نفسها لا إدارتك. قد تشتري إدارة حرجة خدمة غير حرجة (مثل الهوية البصرية).',
    icon: 'M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z',
    guess: (t) => yesIf(t, CRITICAL, SUPPLEMENTARY) },
  { id: 'outage', short: 'Outage stops operations', shortAr: 'التعطل يوقف العمليات',
    en: 'If the service stopped for a day, would operations stop or be seriously affected?', ar: 'إذا توقفت الخدمة يوماً، هل تتوقف العمليات أو تتأثر بشدة؟',
    descEn: 'Think about who is affected and what cannot be done while it is down.', descAr: 'فكّر في من يتأثر وما الذي لا يمكن إنجازه أثناء التوقف.',
    icon: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
    guess: (t, ext) => (ext.critical !== undefined ? { yes: !!ext.critical, basis: ext.critical ? 'Marked business-critical in the technical questions' : 'Not marked business-critical', src: { en: 'Technical questions', ar: 'الأسئلة التقنية' } } : yesIf(t, CRITICAL, SUPPLEMENTARY)) },
  { id: 'people', short: 'Relies on vendor staff', shortAr: 'يعتمد على موظفي المورد',
    en: 'Does the service rely on vendor staff to keep running?', ar: 'هل تعتمد الخدمة على موظفي المورد لاستمرارها؟',
    descEn: 'For example monitoring operators, on-site engineers or outsourced staff. Not fully automated.', descAr: 'مثل مشغلي المراقبة أو المهندسين في الموقع أو الموظفين المسندين. أي غير مؤتمتة بالكامل.',
    icon: 'M9 8a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M17 11a3 3 0 100-6M21.5 20c-.4-2.4-1.7-4-3.5-4.7',
    guess: (t) => yesIf(t, /manpower|personnel|\bstaff\b|operator|24\/7|\bsoc\b|monitoring service|outsourc|resident engineer|help ?desk|managed service/i, /licen[cs]e|hardware|equipment|furniture|chairs/i) },
  { id: 'improve', short: 'Mainly an improvement', shortAr: 'تحسين بالدرجة الأولى',
    en: 'Is it mainly to improve quality, efficiency or convenience?', ar: 'هل الغرض الأساسي تحسين الجودة أو الكفاءة أو الراحة؟',
    descEn: 'Answer Yes if work would carry on without it, just less smoothly.', descAr: 'أجب بنعم إذا كان العمل سيستمر دونها ولكن بسلاسة أقل.',
    icon: 'M5 12l4 4L19 6',
    guess: (t) => yesIf(t, SUPPLEMENTARY, CRITICAL) },
];

export type BcmVerdict = 'applies' | 'na' | 'bcm';
export function bcmVerdict(a: Answers): BcmVerdict | null {
  if (BCM_QUESTIONS.some((q) => a[q.id] === undefined)) return null;
  if (a.critical && a.outage) return 'applies';
  if (!a.critical && !a.outage) return 'na';
  if (a.improve && !a.outage) return 'na';
  return 'bcm';
}
export const VERDICT: Record<BcmVerdict, { en: string; ar: string; whyEn: string; whyAr: string; tone: string }> = {
  applies: { en: 'BCM applies', ar: 'ينطبق استمرارية الأعمال', whyEn: 'The service supports a critical function and an outage would stop operations. Continuity clauses are added below.', whyAr: 'تدعم الخدمة وظيفة حرجة وتعطلها يوقف العمليات. أُضيفت بنود الاستمرارية أدناه.', tone: 'warning' },
  na: { en: 'BCM not applicable', ar: 'لا ينطبق استمرارية الأعمال', whyEn: 'The service is not essential to a critical function. BCM confirms this in one step.', whyAr: 'الخدمة ليست أساسية لوظيفة حرجة. تؤكد إدارة الاستمرارية ذلك بخطوة واحدة.', tone: 'success' },
  bcm: { en: 'BCM to decide', ar: 'تقرره إدارة الاستمرارية', whyEn: 'Your answers point both ways. BCM reviews the service and decides; the clauses are added so nothing is missing.', whyAr: 'إجاباتك تحتمل الاتجاهين. تراجع الإدارة الخدمة وتقرر؛ أُضيفت البنود حتى لا ينقص شيء.', tone: 'info' },
};

/* ── BCM clause set ────────────────────────────────────────────────────── */
export interface BcmClause { id: string; set: 'tech' | 'people'; en: string; ar: string; descEn: string; descAr: string; value?: { labelEn: string; labelAr: string; placeholder: string } }
export const BCM_CLAUSES: BcmClause[] = [
  { id: 'rto', set: 'tech', en: 'Recovery Time Objective (RTO)', ar: 'زمن الاستعادة المستهدف (RTO)', descEn: 'Maximum time to restore the service after a disruption.', descAr: 'أقصى وقت لاستعادة الخدمة بعد التعطل.', value: { labelEn: 'RTO', labelAr: 'RTO', placeholder: 'e.g. 4 hours' } },
  { id: 'rpo', set: 'tech', en: 'Recovery Point Objective (RPO)', ar: 'نقطة الاستعادة المستهدفة (RPO)', descEn: 'Maximum acceptable data loss, measured in time.', descAr: 'أقصى فقد مقبول للبيانات مقاساً بالوقت.', value: { labelEn: 'RPO', labelAr: 'RPO', placeholder: 'e.g. 1 hour' } },
  { id: 'bcp', set: 'tech', en: 'Business Continuity Plan', ar: 'خطة استمرارية الأعمال', descEn: 'The vendor submits a BCP showing how service continues during disruption.', descAr: 'يقدّم المورد خطة توضح استمرار الخدمة أثناء التعطل.' },
  { id: 'dr', set: 'tech', en: 'Disaster Recovery Plan', ar: 'خطة التعافي من الكوارث', descEn: 'How systems and infrastructure are recovered after a major incident.', descAr: 'كيفية استعادة الأنظمة والبنية بعد حادث كبير.' },
  { id: 'incident', set: 'tech', en: 'Incident reporting', ar: 'الإبلاغ عن الحوادث', descEn: 'Incidents affecting continuity are reported to the bank within the agreed time.', descAr: 'تُبلَّغ الحوادث المؤثرة في الاستمرارية خلال الوقت المتفق عليه.', value: { labelEn: 'Report within', labelAr: 'الإبلاغ خلال', placeholder: 'e.g. 2 hours' } },
  { id: 'recovery', set: 'tech', en: 'Recovery arrangements', ar: 'ترتيبات الاستعادة', descEn: 'Procedures and resources to restore the service after technical or operational failure.', descAr: 'إجراءات وموارد لاستعادة الخدمة بعد الأعطال التقنية أو التشغيلية.' },
  { id: 'exercise', set: 'tech', en: 'BCM exercises', ar: 'تمارين استمرارية الأعمال', descEn: 'Vendor takes part in the bank’s BCM exercises and shares the results.', descAr: 'يشارك المورد في تمارين الاستمرارية ويقدّم النتائج.' },
  { id: 'iso', set: 'tech', en: 'BCM evidence (ISO 22301)', ar: 'دليل الاستمرارية (ISO 22301)', descEn: 'ISO 22301 certificate or equivalent evidence that continuity arrangements work.', descAr: 'شهادة ISO 22301 أو دليل مكافئ على فعالية ترتيبات الاستمرارية.' },
  { id: 'backup', set: 'people', en: 'Backup personnel', ar: 'موظفون احتياطيون', descEn: 'Named backup staff for every role that keeps the service running.', descAr: 'موظفون احتياطيون محددون لكل دور يحافظ على استمرار الخدمة.' },
  { id: 'replace', set: 'people', en: 'Replacement time', ar: 'زمن الاستبدال', descEn: 'Unavailable staff (leave, resignation) are replaced within the agreed time.', descAr: 'يُستبدل الموظف غير المتاح (إجازة، استقالة) خلال الوقت المتفق عليه.', value: { labelEn: 'Replace within', labelAr: 'الاستبدال خلال', placeholder: 'e.g. 5 working days' } },
  { id: 'people-exercise', set: 'people', en: 'Exercise participation (staff)', ar: 'مشاركة الموظفين في التمارين', descEn: 'Assigned staff take part in BCM exercises; reports are shared.', descAr: 'يشارك الموظفون المعيّنون في التمارين وتُشارك التقارير.' },
];
export const bcmClauseById = (id: string) => BCM_CLAUSES.find((c) => c.id === id);
export function bcmClausesFor(a: Answers): BcmClause[] {
  const v = bcmVerdict(a);
  if (!v || v === 'na') return [];
  return BCM_CLAUSES.filter((c) => c.set === 'tech' || a.people);
}

/* ── Third-Party Risk Assessment checklist (all RFPs) ───────────────────── */
export const TPR_QUESTIONS: CRQuestion[] = [
  { id: 'access', short: 'Access to our systems', shortAr: 'وصول إلى أنظمتنا', en: 'Will the vendor access our systems or network?', ar: 'هل سيصل المورد إلى أنظمتنا أو شبكتنا؟', descEn: 'Remote support, integrations or on-site access.', descAr: 'دعم عن بُعد أو تكامل أو وصول في الموقع.', icon: 'M15 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-2a4 4 0 014-4h4',
    guess: (t, ext) => (ext.integrates !== undefined ? { yes: !!ext.integrates || !!ext['own-servers'], basis: 'From the technical questions', src: { en: 'Technical questions', ar: 'الأسئلة التقنية' } } : yesIf(t, /integrat|remote support|on-?site|access to (our|the bank)|interface/i)) },
  { id: 'data', short: 'Handles confidential data', shortAr: 'يتعامل مع بيانات سرية', en: 'Will the vendor handle customer, personal or confidential data?', ar: 'هل سيتعامل المورد مع بيانات العملاء أو الشخصية أو السرية؟', descEn: 'Anything classified above Public.', descAr: 'أي بيانات مصنفة أعلى من "عام".', icon: 'M4 7c0-2 16-2 16 0v10c0 2-16 2-16 0zM4 7c0 2 16 2 16 0',
    guess: (t, ext) => (ext['personal-data'] !== undefined ? { yes: !!ext['personal-data'], basis: 'From the technical questions', src: { en: 'Technical questions', ar: 'الأسئلة التقنية' } } : yesIf(t, /customer|personal|confidential|payroll|employee/i)) },
  { id: 'hosted', short: 'Hosted outside the bank', shortAr: 'مستضاف خارج الجهة', en: 'Is the service hosted or run outside the bank?', ar: 'هل تُستضاف الخدمة أو تُشغَّل خارج الجهة؟', descEn: 'Cloud, vendor data centre or vendor premises.', descAr: 'سحابة أو مركز بيانات المورد أو مقر المورد.', icon: 'M7 18a4 4 0 01-.5-8 6 6 0 0111.5 1.5A3.5 3.5 0 0117.5 18z',
    guess: (t, ext) => (ext.saas !== undefined ? { yes: !!ext.saas, basis: 'From the technical questions', src: { en: 'Technical questions', ar: 'الأسئلة التقنية' } } : yesIf(t, /cloud|saas|hosted|vendor premises|managed service/i)) },
  { id: 'subcontract', short: 'Uses subcontractors', shortAr: 'يستعين بمقاولين من الباطن', en: 'Will the vendor use subcontractors?', ar: 'هل سيستعين المورد بمقاولين من الباطن؟', descEn: 'Any part of the service delivered by another company.', descAr: 'أي جزء من الخدمة تقدمه شركة أخرى.', icon: 'M8 12h8M5 8a4 4 0 100 8M19 8a4 4 0 110 8',
    guess: (t) => yesIf(t, /subcontract|third[- ]party (provider|partner)|consortium/i) },
  { id: 'single', short: 'Single vendor, no alternative', shortAr: 'مورد وحيد دون بديل', en: 'Would it be hard to replace this vendor quickly?', ar: 'هل يصعب استبدال هذا المورد بسرعة؟', descEn: 'Proprietary product, sole source or long migration to switch.', descAr: 'منتج خاص أو مصدر وحيد أو انتقال طويل للتبديل.', icon: 'M12 2l3 7h7l-5.5 4.5 2 7.5L12 16l-6.5 5 2-7.5L2 9h7z',
    guess: (t) => yesIf(t, /sole source|single source|proprietary|only (one )?vendor|lock-?in|s\/4hana|\bsap\b/i) },
  { id: 'customer', short: 'Customer-facing', shortAr: 'يخدم العملاء مباشرة', en: 'Is the service customer-facing?', ar: 'هل الخدمة موجهة للعملاء مباشرة؟', descEn: 'Customers, citizens or partners see or use it.', descAr: 'يراها أو يستخدمها العملاء أو المواطنون أو الشركاء.', icon: 'M3 12a9 9 0 1018 0 9 9 0 00-18 0zM9 10h.01M15 10h.01M8 15c2 2 6 2 8 0',
    guess: (t, ext) => (ext['external-users'] !== undefined ? { yes: !!ext['external-users'], basis: 'From the technical questions', src: { en: 'Technical questions', ar: 'الأسئلة التقنية' } } : yesIf(t, /portal|customer[- ]facing|citizens?|public website|mobile app/i)) },
];

export type RiskRating = 'low' | 'medium' | 'high' | 'critical';
export const RATING: Record<RiskRating, { en: string; ar: string; cls: string; waei: boolean }> = {
  low: { en: 'Low', ar: 'منخفض', cls: 'bg-success-50 text-success-700 border-success-200', waei: false },
  medium: { en: 'Medium', ar: 'متوسط', cls: 'bg-[#EEF4FB] text-[#21507A] border-[#C9DBEC]', waei: false },
  high: { en: 'High', ar: 'عالٍ', cls: 'bg-warning-50 text-warning-800 border-warning-200', waei: true },
  critical: { en: 'Critical', ar: 'حرج', cls: 'bg-error-50 text-error-700 border-error-200', waei: true },
};
export function tprRating(tpr: Answers, verdict: BcmVerdict | null): RiskRating | null {
  if (TPR_QUESTIONS.some((q) => tpr[q.id] === undefined)) return null;
  const s = TPR_QUESTIONS.filter((q) => tpr[q.id]).length + (verdict === 'applies' ? 1 : 0);
  return s <= 1 ? 'low' : s <= 3 ? 'medium' : s <= 5 ? 'high' : 'critical';
}

/** Answers = requester's own, else read from the request. */
export function resolveCR(questions: CRQuestion[], user: Answers, texts: SrcText[], ext: Answers) {
  const a: Answers = {}; const derived: Record<string, Guess> = {};
  for (const q of questions) {
    if (user[q.id] !== undefined) { a[q.id] = user[q.id]; continue; }
    const g = q.guess?.(texts, ext);
    if (g) { a[q.id] = g.yes; derived[q.id] = g; }
  }
  return { answers: a, derived };
}
