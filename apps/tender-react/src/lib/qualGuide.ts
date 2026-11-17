/* Guided qualification criteria — recommended ranges by project size (BOQ value) and nature.
   Requesters set the criteria; going above the recommended range needs a one-line justification,
   because over-demanding criteria shut out SMEs. Priority is NOT an input here (the Procurement TL sets it). */
import type { TenderFormData } from '../types/tender';

export type ProjectArea = 'it' | 'non-it';
export type DeliveryType = 'one-time' | 'multi-year' | 'operations' | 'services';

export const AREA_OPTS: { id: ProjectArea; en: string; ar: string }[] = [
  { id: 'it', en: 'IT', ar: 'تقنية معلومات' },
  { id: 'non-it', en: 'Non-IT', ar: 'غير تقني' },
];
export const DELIVERY_OPTS: { id: DeliveryType; en: string; ar: string; hintEn: string; hintAr: string }[] = [
  { id: 'one-time', en: 'One-time supply', ar: 'توريد لمرة واحدة', hintEn: 'Goods delivered once', hintAr: 'توريد سلع مرة واحدة' },
  { id: 'multi-year', en: 'Multi-year supply', ar: 'توريد متعدد السنوات', hintEn: 'Recurring supply over years', hintAr: 'توريد متكرر عبر سنوات' },
  { id: 'operations', en: 'Ongoing operations', ar: 'تشغيل مستمر', hintEn: 'Run, maintain or support', hintAr: 'تشغيل أو صيانة أو دعم' },
  { id: 'services', en: 'Services', ar: 'خدمات', hintEn: 'Consulting or implementation', hintAr: 'استشارات أو تنفيذ' },
];

const IT_RX = /\b(software|licen[cs]e|cloud|sap|s\/4|erp|server|network|firewall|laptop|it\b|system|application|api|data(base)?|cyber|integration|saas|ipaas|hardware)\b/i;
const OPS_RX = /\b(operat|maintenance|support|managed|manpower|staff|helpdesk|cleaning|security guard|facility)/i;
const SVC_RX = /\b(consult|implement|advis|study|design|training|audit|service)/i;

function corpus(f: TenderFormData) {
  return [f.tenderingPurpose, f.scopeOfWork, ...f.boqItems.flatMap((r) => [r.projectItem, r.itemName, r.itemDescription])].join(' ');
}
const months = (f: TenderFormData) => Number(f.contractDuration) || 0;

/** Project nature suggested from the BOQ and Scope of Work. Empty when there is nothing to read yet. */
export function suggestNature(f: TenderFormData): { area?: ProjectArea; delivery?: DeliveryType } {
  const text = corpus(f);
  if (!text.trim() && !f.boqItems.length) return {};
  const area: ProjectArea = IT_RX.test(text) ? 'it' : 'non-it';
  const svcLines = f.boqItems.filter((r) => r.category === 'service' || r.category === 'manpower' || SVC_RX.test(`${r.itemName} ${r.itemDescription}`)).length;
  const mostlyServices = f.boqItems.length > 0 && svcLines / f.boqItems.length >= 0.5;
  let delivery: DeliveryType;
  if (OPS_RX.test(text) && months(f) >= 12) delivery = 'operations';
  else if (mostlyServices || SVC_RX.test(f.scopeOfWork)) delivery = 'services';
  else if (months(f) > 12) delivery = 'multi-year';
  else delivery = 'one-time';
  return { area, delivery };
}
/** The nature in effect: what the requester picked, else the suggestion. */
export function natureOf(f: TenderFormData) {
  const s = suggestNature(f);
  return { area: (f.projectArea || s.area) as ProjectArea | undefined, delivery: (f.deliveryType || s.delivery) as DeliveryType | undefined, suggested: s };
}

export function boqValue(f: TenderFormData) {
  return f.boqItems.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
}
export type Tier = 'small' | 'medium' | 'large';
export function tierOf(value: number): Tier { return value < 1_000_000 ? 'small' : value <= 10_000_000 ? 'medium' : 'large'; }
export const TIER_LABEL: Record<Tier, [string, string]> = {
  small: ['Under SAR 1M', 'أقل من 1 مليون ريال'], medium: ['SAR 1M–10M', '1–10 مليون ريال'], large: ['Over SAR 10M', 'أكثر من 10 ملايين ريال'],
};

type Unit = 'years' | 'projects' | 'sar' | 'employees' | 'pct';
type Rec = { min: number; max: number; unit: Unit };
/* Recommended minimum-threshold band per sub-criterion. Existing obligations (qm-2) cap a vendor's load, so they get no ceiling check. */
const BASE: Record<string, Record<Tier, Rec>> = {
  'qs-1-1': { small: { min: 2, max: 5, unit: 'years' }, medium: { min: 3, max: 7, unit: 'years' }, large: { min: 5, max: 10, unit: 'years' } },
  'qs-1-2': { small: { min: 1, max: 3, unit: 'projects' }, medium: { min: 2, max: 5, unit: 'projects' }, large: { min: 3, max: 8, unit: 'projects' } },
  'qs-1-3': { small: { min: 300_000, max: 2_000_000, unit: 'sar' }, medium: { min: 1_000_000, max: 10_000_000, unit: 'sar' }, large: { min: 5_000_000, max: 50_000_000, unit: 'sar' } },
  'qs-3-1': { small: { min: 10, max: 100, unit: 'employees' }, medium: { min: 25, max: 250, unit: 'employees' }, large: { min: 50, max: 500, unit: 'employees' } },
  'qs-3-2': { small: { min: 20, max: 40, unit: 'pct' }, medium: { min: 25, max: 50, unit: 'pct' }, large: { min: 30, max: 60, unit: 'pct' } },
};

export function recommendedFor(subId: string, f: TenderFormData): Rec | null {
  const b = BASE[subId]?.[tierOf(boqValue(f))];
  if (!b) return null;
  const { delivery } = natureOf(f);
  // People-heavy work needs a bigger workforce; one-time supply needs less track record.
  if (subId === 'qs-3-1' && (delivery === 'operations' || delivery === 'services')) return { ...b, min: b.min * 2, max: b.max * 2 };
  if (subId === 'qs-1-1' && delivery === 'one-time') return { ...b, max: Math.max(b.min + 1, b.max - 2) };
  return b;
}

const fmtSar = (n: number, ar: boolean) => n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}${ar ? ' مليون' : 'M'}` : `${Math.round(n / 1000)}${ar ? ' ألف' : 'K'}`;
export function recText(r: Rec, ar: boolean) {
  switch (r.unit) {
    case 'years': return ar ? `${r.min}–${r.max} سنوات` : `${r.min}–${r.max} years`;
    case 'projects': return ar ? `${r.min}–${r.max} مشاريع` : `${r.min}–${r.max} projects`;
    case 'employees': return ar ? `${r.min}–${r.max} موظف` : `${r.min}–${r.max} employees`;
    case 'pct': return `${r.min}%–${r.max}%`;
    case 'sar': return ar ? `${fmtSar(r.min, true)}–${fmtSar(r.max, true)} ريال` : `SAR ${fmtSar(r.min, false)}–${fmtSar(r.max, false)}`;
  }
}

/** Lowest threshold a vendor must meet, read from free text ("7+ years", "SAR 2M+", "35%+", "5–15 years"). */
export function parseMin(range: string): number | null {
  const m = String(range ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([mk]|مليون|ألف)?/i);
  if (!m) return null;
  const n = Number(m[1]); const u = (m[2] ?? '').toLowerCase();
  return u === 'm' || u === 'مليون' ? n * 1_000_000 : u === 'k' || u === 'ألف' ? n * 1000 : n;
}

export type QualFlag = { subId: string; mainId: string; nameEn: string; nameAr: string; value: string; rec: Rec; justified: boolean };
/** Sub-criteria set above the recommended band. */
export function aboveRange(f: TenderFormData): QualFlag[] {
  const out: QualFlag[] = [];
  f.qualificationCriteria.forEach((m) => m.subCriteria.forEach((s) => {
    const rec = recommendedFor(s.id, f); const v = parseMin(s.range);
    if (rec && v != null && v > rec.max) out.push({ subId: s.id, mainId: m.id, nameEn: s.name, nameAr: s.nameAr, value: s.range, rec, justified: !!(f.qualJustifications?.[s.id] ?? '').trim() });
  }));
  return out;
}
/** Open to SMEs when no criterion sits above its recommended band. */
export const smeOpen = (f: TenderFormData) => aboveRange(f).length === 0;

/** Value inside the recommended band, phrased like the existing range placeholders — used by "Suggest values". */
export function suggestedRange(subId: string, f: TenderFormData, ar: boolean): string | null {
  const r = recommendedFor(subId, f);
  if (!r) return null;
  const mid = r.unit === 'sar' ? r.min : Math.round((r.min + r.max) / 2);
  switch (r.unit) {
    case 'years': return ar ? `${mid}+ سنوات` : `${mid}+ years`;
    case 'projects': return ar ? `${mid}+ مشاريع` : `${mid}+ projects`;
    case 'employees': return ar ? `${mid}+ موظف` : `${mid}+ employees`;
    case 'pct': return `${mid}%+`;
    case 'sar': return ar ? `${fmtSar(mid, true)}+ ريال` : `SAR ${fmtSar(mid, false)}+`;
  }
}
