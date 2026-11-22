// Guided qualification — ported from the design-review build (lib/qualGuide.ts,
// 22 Nov 2026). The requester sets the project priority in Project setup; it sets
// the recommended band for each qualification criterion. Going above the band
// needs a one-line justification, because over-demanding criteria shut out SMEs.

export const PRIORITY_LEVELS = [
  { id: 'low', en: 'Low', hint: 'Routine purchase — open to most vendors' },
  { id: 'medium', en: 'Medium', hint: 'Standard business need' },
  { id: 'high', en: 'High', hint: 'Important to operations — needs proven vendors' },
  { id: 'critical', en: 'Critical', hint: 'Core or regulated system — highest bar' },
];
export const priorityName = (id) => PRIORITY_LEVELS.find((p) => p.id === id)?.en || '';

export const AREA_OPTS = [{ id: 'it', en: 'IT' }, { id: 'non-it', en: 'Non-IT' }];
export const DELIVERY_OPTS = [
  { id: 'one-time', en: 'One-time supply', hint: 'Goods delivered once' },
  { id: 'multi-year', en: 'Multi-year supply', hint: 'Recurring supply over years' },
  { id: 'operations', en: 'Ongoing operations', hint: 'Run, maintain or support' },
  { id: 'services', en: 'Services', hint: 'Consulting or implementation' },
];
export const optName = (opts, id) => opts.find((o) => o.id === id)?.en || '—';

const IT_RX = /\b(software|licen[cs]e|cloud|sap|s\/4|erp|server|network|firewall|laptop|it\b|system|application|api|data(base)?|cyber|integration|saas|ipaas|hardware|siem|soc)\b/i;
const OPS_RX = /\b(operat|maintenance|support|managed|manpower|staff|helpdesk|cleaning|security guard|facility)/i;
const SVC_RX = /\b(consult|implement|advis|study|design|training|audit|service)/i;

const corpus = (f) => [f.purpose, f.scopeOfWork, ...f.boqItems.flatMap((r) => [r.itemName, r.itemDescription])].join(' ');
const months = (f) => (f.contractDurationType === 'years' ? 12 : 1) * (Number(f.contractDuration) || 0);

/** Project nature read from the BOQ and Scope of Work. Empty when there is nothing to read yet. */
export function suggestNature(f) {
  const text = corpus(f);
  if (!text.trim() && !f.boqItems.length) return {};
  const area = IT_RX.test(text) ? 'it' : 'non-it';
  const svc = f.boqItems.filter((r) => r.ptype === 'service' || SVC_RX.test(`${r.itemName} ${r.itemDescription}`)).length;
  const mostlyServices = f.boqItems.length > 0 && svc / f.boqItems.length >= 0.5;
  let delivery;
  if (OPS_RX.test(text) && months(f) >= 12) delivery = 'operations';
  else if (mostlyServices || SVC_RX.test(f.scopeOfWork || '')) delivery = 'services';
  else if (months(f) > 12) delivery = 'multi-year';
  else delivery = 'one-time';
  return { area, delivery };
}
/** The nature in effect: what the requester picked, else the suggestion. */
export function natureOf(f) {
  const s = suggestNature(f);
  return { area: f.projectArea || s.area, delivery: f.deliveryType || s.delivery, suggested: s, auto: !f.projectArea && !f.deliveryType && !!s.area };
}

/* Recommended minimum-threshold band per sub-criterion and priority. Existing obligations (qm-2) cap a vendor's load, so they get no band. */
const BASE = {
  'qs-1-1': { low: [2, 5, 'years'], medium: [3, 7, 'years'], high: [5, 10, 'years'], critical: [7, 15, 'years'] },
  'qs-1-2': { low: [1, 3, 'projects'], medium: [2, 5, 'projects'], high: [3, 8, 'projects'], critical: [5, 10, 'projects'] },
  'qs-1-3': { low: [300e3, 2e6, 'sar'], medium: [1e6, 10e6, 'sar'], high: [5e6, 50e6, 'sar'], critical: [10e6, 100e6, 'sar'] },
  'qs-3-1': { low: [10, 100, 'employees'], medium: [25, 250, 'employees'], high: [50, 500, 'employees'], critical: [100, 1000, 'employees'] },
  'qs-3-2': { low: [20, 40, 'pct'], medium: [25, 50, 'pct'], high: [30, 60, 'pct'], critical: [35, 70, 'pct'] },
  'qs-4-1': { low: [0.8, 1.5, 'ratio'], medium: [1.0, 1.8, 'ratio'], high: [1.2, 2.0, 'ratio'], critical: [1.5, 2.5, 'ratio'] },
  'qs-4-2': { low: [0.2, 0.6, 'ratio'], medium: [0.3, 0.8, 'ratio'], high: [0.4, 1.0, 'ratio'], critical: [0.5, 1.2, 'ratio'] },
};

export function recommendedFor(subId, f) {
  const b = f.projectPriority ? BASE[subId]?.[f.projectPriority] : null;
  if (!b) return null;
  const r = { min: b[0], max: b[1], unit: b[2] };
  const { delivery } = natureOf(f);
  // People-heavy work needs a bigger workforce; one-time supply needs less track record.
  if (subId === 'qs-3-1' && (delivery === 'operations' || delivery === 'services')) return { ...r, min: r.min * 2, max: r.max * 2 };
  if (subId === 'qs-1-1' && delivery === 'one-time') return { ...r, max: Math.max(r.min + 1, r.max - 2) };
  return r;
}

const fmtSar = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}K`);
export function recText(r) {
  switch (r.unit) {
    case 'pct': return `${r.min}%–${r.max}%`;
    case 'ratio': return `${r.min.toFixed(1)}–${r.max.toFixed(1)}`;
    case 'sar': return `SAR ${fmtSar(r.min)}–${fmtSar(r.max)}`;
    default: return `${r.min}–${r.max} ${r.unit}`;
  }
}

/** Lowest threshold a vendor must meet, read from free text ("7+ years", "SAR 2M+", "35%+", "5–15 years"). */
export function parseMin(range) {
  const m = String(range ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([mk])?/i);
  if (!m) return null;
  const n = Number(m[1]); const u = (m[2] || '').toLowerCase();
  return u === 'm' ? n * 1e6 : u === 'k' ? n * 1000 : n;
}

/** Sub-criteria set above their recommended band. */
export function aboveRange(f) {
  const out = [];
  f.qualificationCriteria.forEach((m) => m.subCriteria.forEach((s) => {
    const rec = recommendedFor(s.id, f); const v = parseMin(s.range);
    if (rec && v != null && v > rec.max) out.push({ subId: s.id, name: s.name, value: s.range, rec, justified: !!(f.qualJustifications?.[s.id] || '').trim() });
  }));
  return out;
}

/** A value inside the recommended band, phrased like the placeholders — used by "Suggest values". */
export function suggestedRange(subId, f) {
  const r = recommendedFor(subId, f);
  if (!r) return null;
  const mid = r.unit === 'sar' ? r.min : Math.round((r.min + r.max) / 2);
  switch (r.unit) {
    case 'pct': return `${mid}%+`;
    case 'ratio': return `${r.min.toFixed(1)}–${r.max.toFixed(1)}`;
    case 'sar': return `SAR ${fmtSar(mid)}+`;
    default: return `${mid}+ ${r.unit}`;
  }
}

/* ── Financial criteria — the Financial main criterion (qm-4), reviewed by Finance ── */
export const RATIOS = [
  { k: 'liquidity', sub: 'qs-4-1', en: 'Liquidity ratio', formula: 'Current assets ÷ current liabilities' },
  { k: 'cash', sub: 'qs-4-2', en: 'Cash ratio', formula: 'Cash & equivalents ÷ current liabilities' },
];
/** Suggested ratio bands by priority — long or people-heavy work leans on liquidity. */
export function suggestFin(priority, delivery) {
  const B = { low: ['0.8', '1.5', '0.2', '0.6'], medium: ['1.0', '1.8', '0.3', '0.8'], high: ['1.2', '2.0', '0.4', '1.0'], critical: ['1.5', '2.5', '0.5', '1.2'] };
  const b = B[priority || 'medium'];
  const lw = delivery === 'one-time' ? 60 : 70;
  return { liquidity: { min: b[0], max: b[1], weight: lw }, cash: { min: b[2], max: b[3], weight: 100 - lw }, passing: 60 };
}
export const finOk = (q) => !!q && q.liquidity.weight + q.cash.weight === 100 && q.passing > 0 && q.passing <= 100
  && [q.liquidity, q.cash].every((x) => x.min !== '' && x.max !== '' && Number(x.min) <= Number(x.max));

/** 1–7 score bands between the minimum and the target of a ratio (read-only key). */
export function scoreBands(r) {
  const lo = Number(r.min), hi = Number(r.max);
  if (!(hi > lo)) return Array(7).fill('—');
  const step = (hi - lo) / 5;
  return Array.from({ length: 7 }, (_, i) => (i === 0 ? `< ${lo.toFixed(2)}` : i === 6 ? `≥ ${hi.toFixed(2)}` : `${(lo + step * (i - 1)).toFixed(2)}–${(lo + step * i).toFixed(2)}`));
}
