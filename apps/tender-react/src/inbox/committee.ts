/* Committee stage after Etimad publish (Epics C5–E): standing rosters, the bid
   opening checklist, and the gate for each committee task. */
import type { Bilingual, CommitteeKind, CommitteeSeat, DocStatus, Opening, OpeningVendor, Person, RfpDetail, SeatRole, Task } from './types';

const person = (id: string, name: string, nameAr: string, role: string, roleAr: string, dept: string, deptAr: string): Person =>
  ({ id, name, nameAr, role, roleAr, dept, deptAr });

/* Annual rosters: set once a year. A case opens with these members; the Chairman
   replaces a seat for one case only, by exception. */
export const BOC_ROSTER: { role: SeatRole; person: Person }[] = [
  { role: 'chairman', person: person('u-mansour', 'Mansour Al-Harbi', 'منصور الحربي', 'Bid Opening Committee Chairman', 'رئيس لجنة فتح العروض', 'Procurement', 'المشتريات') },
  { role: 'secretary', person: person('u-hessa', 'Hessa Al-Mutairi', 'حصة المطيري', 'Committee Secretary', 'أمينة اللجنة', 'Procurement', 'المشتريات') },
  { role: 'legal', person: person('u-omar', 'Omar Al-Shehri', 'عمر الشهري', 'Legal member', 'العضو القانوني', 'Legal', 'الشؤون القانونية') },
  { role: 'finance', person: person('u-nawaf', 'Nawaf Al-Otaibi', 'نواف العتيبي', 'Finance member', 'العضو المالي', 'Finance', 'المالية') },
  { role: 'procurement', person: person('u-yasser', 'Yasser Al-Ghamdi', 'ياسر الغامدي', 'Procurement member', 'عضو المشتريات', 'Procurement', 'المشتريات') },
];
export const DPEC_ROSTER: { role: SeatRole; person: Person }[] = [
  { role: 'chairman', person: person('u-fahad', 'Fahad Al-Rasheed', 'فهد الرشيد', 'DP Evaluation Committee Chairman', 'رئيس لجنة تقييم الشراء المباشر', 'Procurement', 'المشتريات') },
  { role: 'secretary', person: person('u-lina', 'Lina Al-Shammari', 'لينا الشمري', 'Committee Officer', 'أخصائية اللجنة', 'Procurement', 'المشتريات') },
  { role: 'procurement', person: person('u-yasser', 'Yasser Al-Ghamdi', 'ياسر الغامدي', 'Procurement member', 'عضو المشتريات', 'Procurement', 'المشتريات') },
];
/** Alternates the Chairman can seat for one case. */
export const ALTERNATES: Partial<Record<SeatRole, Person[]>> = {
  secretary: [person('u-dana', 'Dana Al-Subaie', 'دانة السبيعي', 'Committee Secretary', 'أمينة اللجنة', 'Procurement', 'المشتريات')],
  legal: [person('u-rana', 'Rana Al-Qahtani', 'رنا القحطاني', 'Legal member', 'العضو القانوني', 'Legal', 'الشؤون القانونية')],
  finance: [person('u-bader', 'Bader Al-Dossari', 'بدر الدوسري', 'Finance member', 'العضو المالي', 'Finance', 'المالية')],
  procurement: [person('u-hind', 'Hind Al-Harbi', 'هند الحربي', 'Procurement member', 'عضو المشتريات', 'Procurement', 'المشتريات')],
  technical: [
    person('u-sara', 'Sara Al-Zahrani', 'سارة الزهراني', 'Technical member', 'العضو الفني', 'IT & Digital', 'تقنية المعلومات والتحول الرقمي'),
    person('u-majedt', 'Majed Al-Otaibi', 'ماجد العتيبي', 'Technical member', 'العضو الفني', 'IT Infrastructure', 'البنية التحتية'),
    person('u-amal', 'Amal Al-Shehri', 'أمل الشهري', 'Technical member', 'العضو الفني', 'Facilities', 'المرافق'),
  ],
};
export const REPLACE_REASONS: Bilingual[] = [
  { en: 'Conflict of interest', ar: 'تعارض مصالح' }, { en: 'On leave', ar: 'في إجازة' },
  { en: 'Workload', ar: 'ضغط العمل' }, { en: 'Other', ar: 'أخرى' },
];
export const SEAT_LABEL: Record<SeatRole, Bilingual> = {
  chairman: { en: 'Chairman', ar: 'الرئيس' }, secretary: { en: 'Secretary', ar: 'الأمين' },
  legal: { en: 'Legal', ar: 'قانوني' }, finance: { en: 'Finance', ar: 'مالي' },
  procurement: { en: 'Procurement', ar: 'المشتريات' }, technical: { en: 'Technical', ar: 'فني' },
};
export const COMMITTEE_LABEL: Record<CommitteeKind, Bilingual> = {
  boc: { en: 'Bid Opening Committee', ar: 'لجنة فتح العروض' },
  dpec: { en: 'DP Evaluation Committee', ar: 'لجنة تقييم الشراء المباشر' },
};

/* Opening checklist per vendor — the documents the committee checks. */
export const DOC_ITEMS: { id: string; en: string; ar: string; required: boolean }[] = [
  { id: 'tech-offer', en: 'Technical offer', ar: 'العرض الفني', required: true },
  { id: 'fin-offer', en: 'Financial offer', ar: 'العرض المالي', required: true },
  { id: 'bank', en: 'Bank guarantee', ar: 'الضمان البنكي', required: true },
  { id: 'cr', en: 'Commercial register / licences', ar: 'السجل التجاري / التراخيص', required: true },
  { id: 'zakat', en: 'Zakat or tax certificate', ar: 'شهادة الزكاة أو الضريبة', required: true },
  { id: 'gosi', en: 'GOSI certificate', ar: 'شهادة التأمينات الاجتماعية', required: true },
  { id: 'chamber', en: 'Chamber of Commerce membership', ar: 'عضوية الغرفة التجارية', required: true },
  { id: 'saudization', en: 'Saudization certificate', ar: 'شهادة السعودة', required: true },
  { id: 'sme', en: 'SME certificate (if applicable)', ar: 'شهادة المنشآت الصغيرة والمتوسطة (إن وجدت)', required: false },
  { id: 'other', en: 'Other documents', ar: 'مستندات أخرى', required: false },
];
export const DOC_STATUS: { id: DocStatus; en: string; ar: string; cls: string; on: string }[] = [
  { id: 'valid', en: 'Valid', ar: 'سارٍ', cls: 'text-success-700', on: 'bg-success-50 text-success-700 ring-success-300' },
  { id: 'expired', en: 'Expired', ar: 'منتهٍ', cls: 'text-warning-700', on: 'bg-warning-50 text-warning-800 ring-warning-300' },
  { id: 'missing', en: 'Missing', ar: 'غير مرفق', cls: 'text-error-700', on: 'bg-error-50 text-error-700 ring-error-300' },
];

/** What Etimad's opening report lists — the prototype reads the upload as these bidders. */
export const ETIMAD_BIDDERS: { name: string; cr: string; price: number }[] = [
  { name: 'Elm Company', cr: '1010216853', price: 9_620_000 },
  { name: 'Mozn Systems', cr: '1010459472', price: 8_975_000 },
  { name: 'Al Moammar Information Systems', cr: '1010074863', price: 10_240_000 },
];

export const envelopeOf = (r?: RfpDetail): 'one' | 'two' => (r?.procMethod?.envelope === 'two' ? 'two' : 'one');
/** Two-envelope technical opening: prices stay sealed. */
export const priceSealed = (o: Opening, r?: RfpDetail) => o.committee === 'boc' && envelopeOf(r) === 'two' && !o.momAt;

export function seatsFrom(kind: CommitteeKind): CommitteeSeat[] {
  return (kind === 'boc' ? BOC_ROSTER : DPEC_ROSTER).map((s) => ({ role: s.role, person: s.person, attending: true }));
}
export function newOpening(kind: CommitteeKind): Opening {
  return { committee: kind, vendors: [], seats: seatsFrom(kind), openingDate: new Date().toISOString().slice(0, 10) };
}
export const vendorFrom = (b: { name: string; cr: string; price?: number }, i: number): OpeningVendor => ({ id: `v${i + 1}`, name: b.name, cr: b.cr, docs: {}, price: undefined });

export const members = (o: Opening) => o.seats.filter((s) => s.role !== 'chairman' && s.role !== 'secretary');
export const attending = (o: Opening) => members(o).filter((s) => s.attending);
export const seatOf = (o: Opening, role: SeatRole) => o.seats.find((s) => s.role === role);

/** A vendor's checklist: how many required items are set, and how many have an issue. */
export function vendorDocs(v: OpeningVendor) {
  const req = DOC_ITEMS.filter((d) => d.required);
  const set = req.filter((d) => v.docs[d.id]).length;
  const issues = DOC_ITEMS.filter((d) => v.docs[d.id] && v.docs[d.id] !== 'valid').length;
  return { set, total: req.length, issues, done: set === req.length };
}
export function vendorReady(v: OpeningVendor, o: Opening, r?: RfpDetail) {
  const needPrice = !priceSealed(o, r);
  return vendorDocs(v).done && (!needPrice || (v.price ?? 0) > 0) && (o.committee !== 'dpec' || v.techPass != null);
}
const lowestPassing = (o: Opening) => [...o.vendors].filter((v) => v.techPass !== false && v.price).sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
export const suggestedVendor = lowestPassing;
/** Special DP: value above SAR 100K and urgent or single vendor (flagged on the case by rule). */
export const specialDp = (o?: Opening) => !!o?.dp?.special;

/** What a committee task still needs before it can complete. */
export function committeeNeeds(task: Task): { done: number; total: number; missing: Bilingual[] } {
  const o = task.rfp?.opening; const r = task.rfp;
  const out = { done: 0, total: 0, missing: [] as Bilingual[] };
  const need = (ok: boolean, en: string, ar: string) => { out.total++; if (ok) out.done++; else out.missing.push({ en, ar }); };
  switch (task.committee) {
    case 'raise-opening':
      need(!!o?.source, 'Upload the Etimad opening report or choose manual entry', 'ارفع تقرير فتح العروض من اعتماد أو اختر الإدخال اليدوي');
      need(!!o?.vendors.length && o.vendors.every((v) => v.name.trim() && v.cr.trim()), 'Add every bidder with its commercial register number', 'أضف كل مورد مع رقم السجل التجاري');
      need(!!o?.openingDate, 'Set the opening date', 'حدد تاريخ الفتح');
      break;
    case 'assign':
      need(!!o && !!seatOf(o, 'secretary'), 'Assign the Secretary', 'أسند أمين اللجنة');
      if (o?.committee === 'dpec') need(!!o && !!seatOf(o, 'technical'), 'Nominate the Technical member', 'رشّح العضو الفني');
      need(!!o && attending(o).length >= 2, 'At least two members attending', 'عضوان حاضران على الأقل');
      break;
    case 'record': case 'dp-evaluate':
      need(!!o?.vendors.length && o.vendors.every((v) => vendorReady(v, o, r)), task.committee === 'dp-evaluate' ? 'Check documents, price and technical result for every vendor' : 'Check every vendor’s documents', task.committee === 'dp-evaluate' ? 'تحقق من المستندات والسعر والنتيجة الفنية لكل مورد' : 'تحقق من مستندات كل مورد');
      break;
    case 'verify':
      need(!!o && attending(o).every((s) => s.coi), 'Every attending member declares no conflict of interest', 'يقر كل عضو حاضر بعدم وجود تعارض مصالح');
      need(!!o && attending(o).every((s) => s.approval === 'approved'), 'Every attending member approves the opening', 'يعتمد كل عضو حاضر محضر الفتح');
      break;
    case 'mom':
      need(!!o?.chairmanNote?.trim(), 'Add the Chairman’s comments for the MoM', 'أضف ملاحظات الرئيس للمحضر');
      break;
    case 'fin-opening': {
      const pass = o?.vendors.filter((v) => v.techPass) ?? [];
      need(pass.length > 0 && pass.every((v) => (v.price ?? 0) > 0), 'Enter the price for every technically passing vendor', 'أدخل السعر لكل مورد مجتاز فنياً');
      break;
    }
    case 'dp-select':
      need(!!o?.dp?.selected, 'Select the vendor', 'اختر المورد');
      if (o?.dp?.selected && o.dp.selected !== suggestedVendor(o)?.id) need(!!o.dp.reason?.trim(), 'Give a reason for not choosing the lowest passing offer', 'اذكر سبب عدم اختيار أقل عرض مجتاز');
      break;
  }
  return out;
}

export const fmtSar = (n?: number) => (n == null ? '—' : `SAR ${n.toLocaleString('en-US')}`);
