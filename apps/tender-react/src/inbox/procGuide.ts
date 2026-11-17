/* Procurement-side helpers for steps 9–15: labels, request profile, Finance suggestions,
   suggested priority, and the request record read as creation data (for recommended ranges). */
import type { RfpDetail, FinQual, ContractType, EnvelopeType, ProjectPriority, Task } from './types';
import type { TenderFormData } from '../types/tender';
import { aboveRange, recText, suggestFin, AREA_OPTS, DELIVERY_OPTS } from '../lib/qualGuide';

export const CONTRACT_OPTS: { id: ContractType; en: string; ar: string; hintEn: string; hintAr: string }[] = [
  { id: 'tender', en: 'Tendering', ar: 'منافسة عامة', hintEn: 'Open to every qualified vendor on Etimad', hintAr: 'مفتوحة لكل مورد مؤهل في اعتماد' },
  { id: 'closed', en: 'Closed bid', ar: 'منافسة محدودة', hintEn: 'Only invited vendors can bid', hintAr: 'يتقدم الموردون المدعوون فقط' },
  { id: 'direct', en: 'Direct purchase', ar: 'شراء مباشر', hintEn: 'One vendor — needs a justification', hintAr: 'مورد واحد — يتطلب مبرراً' },
];
export const ENVELOPE_OPTS: { id: EnvelopeType; en: string; ar: string; hintEn: string; hintAr: string }[] = [
  { id: 'one', en: 'One envelope', ar: 'ظرف واحد', hintEn: 'Technical and financial offers together', hintAr: 'العرض الفني والمالي معاً' },
  { id: 'two', en: 'Two envelopes', ar: 'ظرفان', hintEn: 'Financial offer opened only for technically passing vendors', hintAr: 'يُفتح العرض المالي للمتأهلين فنياً فقط' },
];
export const PRIORITY_OPTS: { id: ProjectPriority; en: string; ar: string; cls: string }[] = [
  { id: 'critical', en: 'Critical', ar: 'حرجة', cls: 'bg-error-600 text-white border-error-600' },
  { id: 'high', en: 'High', ar: 'عالية', cls: 'bg-error-50 text-error-700 border-error-200' },
  { id: 'medium', en: 'Medium', ar: 'متوسطة', cls: 'bg-warning-50 text-warning-700 border-warning-200' },
  { id: 'low', en: 'Low', ar: 'منخفضة', cls: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
];
export const VENDOR_POOL = ['Elm Company', 'Mozn Systems', 'Al Moammar Information Systems', 'Solutions by STC', 'SAP Arabia', 'Accenture KSA', 'Devoteam Middle East'];

export const optLabel = <T extends { id: string; en: string; ar: string }>(opts: T[], id: string | undefined, isAr: boolean) => {
  const o = opts.find((x) => x.id === id); return o ? (isAr ? o.ar : o.en) : '—';
};
export const areaLabel = (r: RfpDetail, isAr: boolean) => optLabel(AREA_OPTS, r.projectArea, isAr);
export const deliveryLabel = (r: RfpDetail, isAr: boolean) => optLabel(DELIVERY_OPTS, r.deliveryType, isAr);

export const boqValueOf = (r: RfpDetail) => r.boq.reduce((s, l) => s + (Number(l.qty) || 1) * l.unitPrice, 0);
export const monthsOf = (r: RfpDetail) => Number(String(r.duration ?? '').match(/\d+/)?.[0]) || 0;

/** The request record read back as creation data — the recommended ranges use the same rules. */
export function formLike(r: RfpDetail): TenderFormData {
  return {
    tenderingPurpose: r.purposeEn ?? '', scopeOfWork: r.scopeEn ?? '', contractDuration: String(monthsOf(r) || ''),
    projectArea: r.projectArea ?? '', deliveryType: r.deliveryType ?? '', projectPriority: r.projectPriority ?? '',
    boqItems: r.boq.map((l, i) => ({ id: `b${i}`, projectItem: l.budgetEn ?? '', itemName: l.itemEn, itemDescription: l.descEn ?? '', unitOfMeasure: l.unit, quantity: Number(l.qty) || 1, unitPrice: l.unitPrice, deliveryDate: '' })),
    qualificationCriteria: (r.qualCriteria ?? []).map((m, i) => ({ id: `qm-${i + 1}`, name: m.nameEn, nameAr: m.nameAr, percentage: m.pct,
      subCriteria: m.subs.map((s, j) => ({ id: `qs-${i + 1}-${j + 1}`, name: s.nameEn, nameAr: s.nameAr, range: s.range, percentage: s.pct })) })),
    qualJustifications: Object.fromEntries((r.qualCriteria ?? []).flatMap((m, i) => m.subs.map((s, j) => [`qs-${i + 1}-${j + 1}`, s.justification ?? '']))),
  } as unknown as TenderFormData;
}
/** Qualification sub-criteria above the recommended range, by "i-j" position. */
export function qualFlags(r: RfpDetail) {
  return new Map(aboveRange(formLike(r)).map((f) => [f.subId.replace(/^qs-/, ''), { ...f, typicalEn: recText(f.rec, false), typicalAr: recText(f.rec, true) }]));
}
export const smeOpenRfp = (r: RfpDetail) => qualFlags(r).size === 0;

/** Finance: suggested ratio bands and weights for this project's priority and nature. */
export function suggestFinQual(r: RfpDetail): FinQual {
  const s = suggestFin(r.projectPriority, r.deliveryType);
  return { liquidity: { ...s.liquidity, weight: Number(s.liquidity.weight) }, cash: { ...s.cash, weight: Number(s.cash.weight) }, passing: 60 };
}
export const finQualOk = (f?: FinQual) => !!f && f.liquidity.weight + f.cash.weight === 100 && f.passing > 0 && f.passing <= 100
  && [f.liquidity, f.cash].every((x) => x.min !== '' && x.max !== '' && Number(x.min) <= Number(x.max));

/** Suggested project priority: value, duration and how soon it starts. */
export function suggestPriority(r: RfpDetail): ProjectPriority {
  if (r.projectPriority) return r.projectPriority;   // the requester's priority
  const v = boqValueOf(r);
  const startsIn = r.startDate ? (new Date(r.startDate).getTime() - Date.now()) / 86400000 : 999;
  if (v >= 5_000_000 || startsIn < 60) return 'high';
  if (v >= 1_000_000 || monthsOf(r) > 12) return 'medium';
  return 'low';
}
export function methodOk(r?: RfpDetail) {
  const m = r?.procMethod;
  if (!m?.contractType || !m.envelope || !m.officerId) return false;
  if (m.contractType === 'direct' && !(m.directJustification ?? '').trim()) return false;
  if (m.contractType === 'closed' && !(m.invitedVendors?.length)) return false;
  return true;
}
/** Project priority for list chips — set by the TL; nothing before that. */
export const projectPriority = (t: Pick<Task, 'rfp'>) => t.rfp?.procMethod?.priority;
