// Man Power BOQ category — option lists, per-category field applicability,
// and a lightweight AI-style description generator.
import type { BOQCategory, BOQRow } from '../types/tender';

export const QUALIFICATIONS: { value: string; en: string; ar: string }[] = [
  { value: 'high-school',   en: 'High School',            ar: 'الثانوية العامة' },
  { value: 'diploma',       en: 'Diploma',                ar: 'دبلوم' },
  { value: 'bachelor',      en: "Bachelor's Degree",      ar: 'بكالوريوس' },
  { value: 'master',        en: "Master's Degree",        ar: 'ماجستير' },
  { value: 'phd',           en: 'PhD',                    ar: 'دكتوراه' },
  { value: 'certification', en: 'Professional Certification', ar: 'شهادة مهنية' },
];

export function qualificationLabel(value: string | undefined, isAr: boolean): string {
  const q = QUALIFICATIONS.find((x) => x.value === value);
  return q ? (isAr ? q.ar : q.en) : '';
}

export const NATIONALITIES: { value: string; en: string; ar: string }[] = [
  { value: 'saudi',      en: 'Saudi',      ar: 'سعودي' },
  { value: 'egyptian',   en: 'Egyptian',   ar: 'مصري' },
  { value: 'jordanian',  en: 'Jordanian',  ar: 'أردني' },
  { value: 'lebanese',   en: 'Lebanese',   ar: 'لبناني' },
  { value: 'syrian',     en: 'Syrian',     ar: 'سوري' },
  { value: 'sudanese',   en: 'Sudanese',   ar: 'سوداني' },
  { value: 'yemeni',     en: 'Yemeni',     ar: 'يمني' },
  { value: 'indian',     en: 'Indian',     ar: 'هندي' },
  { value: 'pakistani',  en: 'Pakistani',  ar: 'باكستاني' },
  { value: 'filipino',   en: 'Filipino',   ar: 'فلبيني' },
  { value: 'bangladeshi', en: 'Bangladeshi', ar: 'بنغلاديشي' },
  { value: 'british',    en: 'British',    ar: 'بريطاني' },
  { value: 'american',   en: 'American',   ar: 'أمريكي' },
];

export function nationalityLabel(value: string, isAr: boolean): string {
  const n = NATIONALITIES.find((x) => x.value === value);
  return n ? (isAr ? n.ar : n.en) : value;
}

/* ── Per-category field applicability ─────────────────────────────────────────
   Drives which fields render in the form and which columns show in the table. */
export type BoqField =
  | 'unitOfMeasure' | 'quantity' | 'unitPrice' | 'deliveryDate'
  | 'hasBrandName' | 'brandJustification' | 'mandatoryList'
  | 'jobTitle' | 'staffCount' | 'minQualification' | 'minExperienceYears'
  | 'officialWorkingHours' | 'extraWorkingHours' | 'nationalityRequired' | 'nationalities';

/** Whether a given field applies to a BOQ category. (Common fields like
 *  itemName / projectItem / category / itemDescription apply everywhere.) */
export function fieldApplies(category: BOQCategory | undefined, field: BoqField): boolean {
  const cat = category ?? 'service';
  const isManpower = cat === 'manpower';
  switch (field) {
    case 'unitOfMeasure':
    case 'quantity':
      return !isManpower;
    case 'unitPrice':
    case 'deliveryDate':
      return true;
    case 'hasBrandName':
    case 'brandJustification':
      return !isManpower;
    case 'mandatoryList':
      return cat === 'material' || cat === 'equipment';
    case 'jobTitle':
    case 'staffCount':
    case 'minQualification':
    case 'minExperienceYears':
    case 'officialWorkingHours':
    case 'extraWorkingHours':
    case 'nationalityRequired':
    case 'nationalities':
      return isManpower;
  }
}

/** Effective quantity used for the line total — Staff Count for manpower, Qty otherwise. */
export function effectiveQty(row: Pick<BOQRow, 'category' | 'quantity' | 'staffCount'>): number {
  const isManpower = (row.category ?? 'service') === 'manpower';
  const v = isManpower ? row.staffCount : row.quantity;
  return typeof v === 'number' ? v : 0;
}

/** Build a scope-style description from the entered Man Power fields. */
export function generateManpowerDescription(row: Partial<BOQRow>, isAr: boolean): string {
  const title = (row.jobTitle || '').trim() || (isAr ? 'الكادر المطلوب' : 'the required staff');
  const count = typeof row.staffCount === 'number' ? row.staffCount : undefined;
  const qual = qualificationLabel(row.minQualification, isAr);
  const exp = typeof row.minExperienceYears === 'number' ? row.minExperienceYears : undefined;
  const hours = typeof row.officialWorkingHours === 'number' ? row.officialWorkingHours : undefined;
  const extra = typeof row.extraWorkingHours === 'number' ? row.extraWorkingHours : undefined;
  const nats = (row.nationalityRequired && row.nationalities?.length)
    ? row.nationalities.map((n) => nationalityLabel(n, isAr)).join(isAr ? '، ' : ', ')
    : '';

  if (isAr) {
    const parts: string[] = [];
    parts.push(`توفير ${count ? `${count} ` : ''}${title} للعمل ضمن نطاق هذا المشروع.`);
    if (qual) parts.push(`الحد الأدنى للمؤهل: ${qual}${exp !== undefined ? ` مع خبرة لا تقل عن ${exp} سنوات` : ''}.`);
    if (hours !== undefined) parts.push(`ساعات العمل الرسمية ${hours} ساعة${extra ? ` مع ما يصل إلى ${extra} ساعة إضافية متوقعة` : ''}.`);
    if (nats) parts.push(`الجنسيات المقبولة: ${nats}.`);
    parts.push('يلتزم المورّد بأنظمة العمل السعودية ومتطلبات التوطين ذات الصلة.');
    return parts.join(' ');
  }
  const parts: string[] = [];
  parts.push(`Provision of ${count ? `${count} ` : ''}${title} to work within the scope of this project.`);
  if (qual) parts.push(`Minimum qualification: ${qual}${exp !== undefined ? ` with at least ${exp} year${exp === 1 ? '' : 's'} of relevant experience` : ''}.`);
  if (hours !== undefined) parts.push(`Official working hours: ${hours} hours${extra ? `, with up to ${extra} expected extra hours` : ''}.`);
  if (nats) parts.push(`Accepted nationalities: ${nats}.`);
  parts.push('The vendor shall comply with Saudi labour law and applicable Saudisation requirements.');
  return parts.join(' ');
}
