// Rules behind the New Request form — routing, completeness, "will this be
// returned?" checks and the standards/continuity screening. Ported from the
// design-review build (lib/triage, lib/quality, TenderContext, eaStandards).
import {
  SECTIONS, EM_STEPS, PROJECTS, CATEGORIES, STD_LIBRARY, STD_QUESTIONS,
  BCM_QUESTIONS, BCM_CLAUSES, TPR_QUESTIONS,
} from '../data/newRequest.js';

export const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
export const words = (s) => (s ?? '').trim().split(/\s+/).filter((w) => w.length > 1).length;
export const MIN_WORDS = { scope: 40, purpose: 12, boqDesc: 5, deliverable: 3, howApplied: 6, techReq: 6 };
export const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

/* ── Routing (step 1) ─────────────────────────────────────────────────────── */
const MANPOWER = ['manpower', 'man power', 'staff', 'personnel', 'labor', 'labour', 'resourcing', 'secondment', 'engineers'];
const SERVICES = ['service', 'consult', 'implementation', 'integration', 'development', 'design', 'training', 'migration', 'assessment', 'hardening', 'maintenance', 'support', 'managed', 'operation', 'hosting', 'fit-out', 'works'];
const EQUIPMENT = ['server', 'hardware', 'device', 'equipment', 'infrastructure', 'machine', 'appliance', 'laptop', 'desktop', 'printer', 'router', 'switch', 'storage', 'furniture'];
const MATERIAL = ['license', 'licence', 'software', 'subscription', 'supply', 'supplies', 'material', 'consumable', 'toner', 'paper', 'part', 'component', 'certificate'];
const TENDER_SIGNAL = ['implementation', 'integration', 'development', 'custom', 'bespoke', 'migration', 'assessment', 'hardening', 'consult', 'managed', 'maintenance', 'support', 'hosting'];
const has = (text, list) => { const t = text.toLowerCase(); return list.some((w) => new RegExp(`(^|[^a-z])${w}`).test(t)); };

export function boqTypeOf(name, type) {
  if (has(name, MANPOWER)) return 'manpower';
  if (has(name, SERVICES) || type === 'services') return 'service';
  if (has(name, MATERIAL)) return 'material';
  if (has(name, EQUIPMENT)) return 'equipment';
  return type === 'consumables' ? 'material' : 'equipment';
}
export function routeOf(name, type) {
  const b = boqTypeOf(name, type);
  if (b === 'service' || b === 'manpower') return 'tendering';
  return has(name, TENDER_SIGNAL) ? 'tendering' : 'emarket';
}
export function classify(item) {
  const boqType = boqTypeOf(item.name, item.type);
  const route = routeOf(item.name, item.type);
  return { ...item, boqType, route, reason: route === 'emarket' ? 'Standard catalogue item — buy it on E-Market' : 'Needs a competitive tender' };
}
export function parseItemNames(text) {
  return text.split(/\r?\n/)
    .map((raw) => raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .map((l) => l.replace(/\s*(?:\bx|×|\bqty\.?|\bquantity|[-,])\s*\d{1,6}\s*$/i, '').replace(/\s*\(\d{1,6}\)\s*$/, '').trim())
    .filter(Boolean);
}
export function looksReal(name) {
  const t = name.trim();
  if (!t) return false;
  if (has(t, [...MANPOWER, ...SERVICES, ...EQUIPMENT, ...MATERIAL])) return true;
  return t.split(/[\s,;/_-]+/).some((tok) => {
    const w = tok.replace(/[^a-zA-Z]/g, '');
    if (w.length < 2) return false;
    if (/^[A-Z]{2,5}$/.test(tok)) return true;
    const v = (w.match(/[aeiou]/gi) || []).length;
    return !(v === 0 && w.length >= 3) && !/[^aeiou]{5,}/i.test(w) && !(w.length >= 6 && v / w.length < 0.2);
  });
}

export function expenseTypeOf(item) {
  const n = (item.name || '').toLowerCase();
  if (/\b(maintenance|support|managed|warranty|sla)\b/.test(n)) return 'it-maintenance';
  if (/\b(communication|telecom|network|internet|connectivity|bandwidth)\b/.test(n)) return 'communication';
  if (item.type === 'services' || /\b(service|services|consult|implementation|integration|development|design|migration|assessment|training|advisory)\b/.test(n)) return 'consultation';
  if (item.type === 'consumables' || /\b(consumable|consumables|supplies|stationery)\b/.test(n)) return 'consumables';
  if (/\b(license|licence|licenses|software|subscription|subscriptions|certificate|certificates|domain|saas|platform)\b/.test(n)) return 'intangible';
  if (/\b(server|hosting|infrastructure|hardware|switch|router|storage|device|equipment|computer|laptop)\b/.test(n)) return 'it-equipment';
  return 'tangible';
}

/* ── Categories → approvers (scope step) ──────────────────────────────────── */
const CAT_KEYS = [
  ['consultancy', /consult|advisor|advis|assess|audit|study|studies|train|enablement|change management|managed service|pmo|strategy|legal|complian/i],
  ['technology', /software|licen|erp|sap|oracle|hardware|server|network|switch|router|cabl|wireless|security|cyber|siem|implement|configur|integrat|deploy|migrat|data|system|infrastructure|cloud|applic|device|laptop|printer|storage|platform|portal|website|web|mobile/i],
];
export function lockedCategories(names) {
  const found = new Set();
  for (const n of names) { const hit = CAT_KEYS.find(([, re]) => re.test(n)); found.add(hit ? hit[0] : 'general'); }
  return CATEGORIES.map((c) => c.id).filter((id) => found.has(id));
}
export function workflowFor(catIds) {
  const review = new Set();
  catIds.forEach((id) => CATEGORIES.find((c) => c.id === id)?.review.forEach((d) => review.add(d)));
  return ['requester', 'manager', 'finance', ...['cyber', 'ea', 'bcm'].filter((d) => review.has(d)), 'procurement'];
}

/* ── Totals ───────────────────────────────────────────────────────────────── */
export function lineTotal(r, em) {
  if (em) {
    if (typeof r.lineTotal === 'number') return r.lineTotal;
    if (r.purchaseType === 'product') return num(r.unitPrice) * (num(r.quantity) || 1) + num(r.shippingCharges);
    return num(r.unitPrice);
  }
  const q = r.category === 'manpower' ? num(r.staffCount) || num(r.quantity) : num(r.quantity);
  return q * num(r.unitPrice);
}
export function totals(f) {
  const em = f.sourceType === 'emarket';
  const subtotal = f.boqItems.reduce((s, r) => s + lineTotal(r, em), 0);
  return {
    subtotal, vat: subtotal * 0.15, total: subtotal * 1.15,
    payPct: f.paymentStages.reduce((s, r) => s + num(r.percentage), 0),
    evalPct: f.evaluationCriteria.reduce((s, r) => s + num(r.weight), 0),
    qualPct: f.qualificationCriteria.reduce((s, r) => s + num(r.percentage), 0),
  };
}

/* ── Visible steps ────────────────────────────────────────────────────────── */
export function visibleSteps(f, routeConfirmed) {
  const em = routeConfirmed && f.sourceType === 'emarket';
  return SECTIONS.filter((s) => !em || EM_STEPS.includes(s.id));
}

/* ── Section completeness ─────────────────────────────────────────────────── */
export function sectionStatus(id, f, routeConfirmed) {
  const t = totals(f);
  switch (id) {
    case 'route': return routeConfirmed ? 'done' : 'todo';
    case 'setup': return f.costCenterId && f.projectId && words(f.purpose) > 0 ? 'done' : f.projectId ? 'missing' : 'todo';
    case 'scope': {
      const ok = words(f.scopeOfWork) >= 5 && f.executionLocation && f.startDate && f.contractDuration;
      return ok ? 'done' : f.scopeOfWork || f.executionLocation || f.startDate || f.contractDuration ? 'missing' : 'todo';
    }
    case 'boq': {
      if (!f.boqItems.length) return 'todo';
      return f.boqItems.every((r) => (!r.hasBrandName || (r.brandJustification ?? '').trim()) && !needsEtimadReason(r)) ? 'done' : 'missing';
    }
    case 'payment': return f.paymentStages.length ? (t.payPct === 100 ? 'done' : 'missing') : 'todo';
    case 'tech':
      if (f.evaluationCriteria.length && t.evalPct === 100 && Number(f.technicalPassingPercentage) > 0 && f.technicalCommitteeMembers.length) return 'done';
      return f.evaluationCriteria.length || f.technicalCommitteeMembers.length || f.technicalRequirements.length ? 'missing' : 'todo';
    case 'qual': {
      const subsOk = f.qualificationCriteria.every((m) => m.subCriteria.reduce((s, c) => s + num(c.percentage), 0) === 100);
      const pass = Number(f.qualificationPassingPercentage);
      if (t.qualPct === 100 && subsOk && pass > 0 && pass <= 100 && f.qualificationCommitteeMembers.length) return 'done';
      return f.qualificationCommitteeMembers.length || t.qualPct > 0 ? 'missing' : 'todo';
    }
    case 'attachments': return f.attachments.length ? 'done' : 'todo';
    default: return 'todo';
  }
}

/* ── Etimad availability (per BOQ line, tender only) ──────────────────────── */
export const etimadKey = (r) => [r.itemName?.trim(), r.itemDescription?.trim(), r.unitOfMeasure, r.quantity, r.unitPrice].join('|');
export function checkEtimad(r) {
  // Judge the item by its name; descriptions often use words like "managed" for products.
  const b = r.category || boqTypeOf(r.itemName || '');
  let status = 'not-available', comment = 'Custom scope or a service with its own SLA — this needs a tender.';
  if (b === 'material' || b === 'equipment') {
    if (has(r.itemName || '', TENDER_SIGNAL)) { status = 'uncertain'; comment = 'Standard product, but it is bundled with work. Confirm on Etimad before you keep it here.'; }
    else if (lineTotal(r) > 1_000_000) { status = 'uncertain'; comment = 'Catalogue-type item, but the volume is large enough that a tender may get a better price.'; }
    else { status = 'available'; comment = 'Off-the-shelf item with a fixed specification — likely listed on Etimad E-Market.'; }
  }
  return { status, comment, key: etimadKey(r), at: new Date().toISOString() };
}
export const etimadStale = (r) => !!r.etimad && r.etimad.key !== etimadKey(r);
export const needsEtimadReason = (r) => r.etimad?.status === 'available' && !etimadStale(r) && !(r.etimadReason ?? '').trim();

/* ── "Will this be returned?" checks — run on Continue ────────────────────── */
export function qualityIssues(id, f) {
  if (f.sourceType === 'emarket') return [];
  const out = [];
  if (id === 'setup') {
    const n = words(f.purpose);
    if (n < MIN_WORDS.purpose) out.push({ id: 'purpose', field: 'q-purpose', en: 'Describe the purpose of this request', why: 'Your manager returns requests that don’t say why the purchase is needed.', meta: `${n} of ${MIN_WORDS.purpose} words` });
  }
  if (id === 'scope') {
    const n = words(f.scopeOfWork);
    if (n < MIN_WORDS.scope) out.push({ id: 'sow', field: 'q-scope', en: 'Add more detail to the scope of work', why: 'EA and your manager return a short scope. Say what is delivered, where, by whom, and what is out of scope.', meta: `${n} of ${MIN_WORDS.scope} words` });
  }
  if (id === 'boq') {
    const thin = f.boqItems.filter((r) => words(r.itemDescription) < MIN_WORDS.boqDesc);
    if (thin.length) out.push({ id: 'boq-desc', field: 'q-boq', en: `${thin.length} BOQ item${thin.length === 1 ? ' needs' : 's need'} a clearer description`, why: 'EA checks the specification and Finance picks the material group from it — a one-liner gets returned.', meta: thin.slice(0, 3).map((r) => r.itemName || 'Unnamed item').join(' · ') });
    const noPrice = f.boqItems.filter((r) => !(num(r.unitPrice) > 0) || !(num(r.quantity) > 0 || num(r.staffCount) > 0));
    if (noPrice.length) out.push({ id: 'boq-price', field: 'q-boq', en: `${noPrice.length} BOQ item${noPrice.length === 1 ? ' has' : 's have'} no quantity or unit price`, why: 'Your manager can’t approve the budget without an estimated amount for every line.' });
  }
  if (id === 'payment') {
    const thin = f.paymentStages.filter((s) => words(s.itemsDeliverables) < MIN_WORDS.deliverable);
    if (thin.length) out.push({ id: 'pay', field: 'q-payment', en: `${thin.length} payment stage${thin.length === 1 ? '' : 's'} without the deliverable it pays for`, why: 'Finance and PMO return payments that aren’t tied to a deliverable.' });
  }
  if (id === 'tech') {
    const thin = f.evaluationCriteria.filter((c) => words(c.howApplied) < MIN_WORDS.howApplied);
    if (thin.length) out.push({ id: 'eval', field: 'q-eval', en: `Explain how ${thin.length === 1 ? '1 criterion is' : `${thin.length} criteria are`} scored`, why: 'The technical committee returns criteria without a clear scoring method.' });
    const req = f.technicalRequirements.filter((r) => r.requirement && words(r.description) < MIN_WORDS.techReq);
    if (req.length) out.push({ id: 'req', field: 'q-req', en: `${req.length} technical requirement${req.length === 1 ? ' needs' : 's need'} a description`, why: 'EA returns requirements that only have a title.' });
  }
  return out;
}

/* ── Screening on Review: technical standards, continuity, third-party risk ─ */
export function requestTexts(f) {
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const items = p ? p.items.filter((i) => (f.selectedItemIds ?? []).includes(i.id)) : [];
  return [
    ...items.map((i) => ({ src: 'Budgeted item', text: i.name })),
    ...f.boqItems.flatMap((r) => [{ src: 'BOQ', text: `${r.itemName} — ${r.itemDescription}` }]),
    ...(f.scopeOfWork ? [{ src: 'Scope of work', text: f.scopeOfWork }] : []),
    ...(f.purpose ? [{ src: 'Purpose', text: f.purpose }] : []),
  ].filter((x) => x.text?.trim());
}
function snippet(text, rx) {
  const m = new RegExp(rx.source, rx.flags.replace('g', '')).exec(text);
  if (!m || text.length <= 70) return text.trim();
  const a = Math.max(0, m.index - 28), b = Math.min(text.length, m.index + m[0].length + 34);
  return `${a > 0 ? '…' : ''}${text.slice(a, b).trim()}${b < text.length ? '…' : ''}`;
}
function guessFrom(texts, yes, no) {
  for (const [rx, val] of [[yes, true], [no, false]]) {
    if (!rx) continue;
    const h = texts.find((t) => rx.test(t.text));
    if (h) return { yes: val, basis: snippet(h.text, rx), src: h.src };
  }
  return null;
}

export function inEaScope(f) {
  const blob = requestTexts(f).map((t) => t.text).join(' ');
  return /licen[cs]e|subscription|saas|software|integrat|interface|\bapi\b|implementation|upgrade|platform|system|erp|portal|application|server|storage|network|hosting|cloud|infrastructure/i.test(blob);
}

/** Questions to ask now (depend on earlier answers), each with its suggested answer. */
export function stdQuestions(f) {
  const texts = requestTexts(f);
  const user = f.techAnswers ?? {};
  const out = [];
  const resolved = {};
  for (const q of STD_QUESTIONS) {
    if (q.ask && !q.ask(resolved)) continue;
    const guess = guessFrom(texts, q.yes, q.no);
    const value = user[q.id] !== undefined ? user[q.id] : undefined;
    resolved[q.id] = value !== undefined ? value : guess?.yes;
    out.push({ ...q, guess, value });
  }
  return out;
}
export const stdOpen = (f) => (f.sourceType === 'emarket' || !inEaScope(f) ? 0 : stdQuestions(f).filter((q) => q.value === undefined).length);
export function deploymentOf(answers) {
  if (answers.saas === undefined) return 'saas';
  if (!answers.saas) return 'on-prem';
  return answers['own-servers'] ? 'hybrid' : 'saas';
}
export function standardsFor(f) {
  const a = f.techAnswers ?? {};
  const dep = deploymentOf(a);
  return STD_LIBRARY.filter((s) => s.required || s.when?.deployment?.includes(dep) || s.when?.answers?.some((q) => a[q]))
    .map((s) => {
      const sel = (f.stdOverrides ?? {})[s.id];
      const because = s.required ? null : s.when?.deployment?.includes(dep) ? 'Deployment model' : STD_QUESTIONS.filter((q) => s.when.answers?.includes(q.id) && a[q.id]).map((q) => q.short).join(', ');
      return { ...s, na: !!sel?.na, naReason: sel?.naReason ?? '', because };
    });
}

function crQuestions(list, f, ext, key) {
  const texts = requestTexts(f);
  const user = f[key] ?? {};
  return list.map((q) => {
    let guess = null;
    if (q.from && ext[q.from] !== undefined) guess = { yes: !!ext[q.from], basis: 'From your answer in the technical questions', src: 'Technical questions' };
    else if (q.id === 'outage' && ext.critical !== undefined) guess = { yes: !!ext.critical, basis: ext.critical ? 'Marked business-critical in the technical questions' : 'Not marked business-critical', src: 'Technical questions' };
    else guess = guessFrom(texts, q.yes, q.no);
    return { ...q, guess, value: user[q.id] };
  });
}
export const bcmQuestions = (f) => crQuestions(BCM_QUESTIONS, f, f.techAnswers ?? {}, 'bcmAnswers');
export const tprQuestions = (f) => crQuestions(TPR_QUESTIONS, f, f.techAnswers ?? {}, 'tprAnswers');
export function bcmVerdict(a) {
  if (BCM_QUESTIONS.some((q) => a[q.id] === undefined)) return null;
  if (a.critical && a.outage) return 'applies';
  if (!a.critical && !a.outage) return 'na';
  if (a.improve && !a.outage) return 'na';
  return 'bcm';
}
export function bcmClauses(a) {
  const v = bcmVerdict(a);
  if (!v || v === 'na') return [];
  return BCM_CLAUSES.filter((c) => c.set === 'tech' || a.people);
}
export function tprRating(tpr, verdict) {
  if (TPR_QUESTIONS.some((q) => tpr[q.id] === undefined)) return null;
  const s = TPR_QUESTIONS.filter((q) => tpr[q.id]).length + (verdict === 'applies' ? 1 : 0);
  return s <= 1 ? 'low' : s <= 3 ? 'medium' : s <= 5 ? 'high' : 'critical';
}
export function continuityOpen(f) {
  if (f.sourceType === 'emarket') return 0;
  const b = f.bcmAnswers ?? {}, t = f.tprAnswers ?? {};
  const unanswered = BCM_QUESTIONS.filter((q) => b[q.id] === undefined).length + TPR_QUESTIONS.filter((q) => t[q.id] === undefined).length;
  const values = bcmClauses(b).filter((c) => c.value && !(f.bcmValues ?? {})[c.id]?.trim()).length;
  return unanswered + values;
}

/** Everything a reviewer would bounce, grouped for the Review step. */
export function blockers(f, routeConfirmed) {
  const steps = visibleSteps(f, routeConfirmed).filter((s) => !['attachments', 'review'].includes(s.id));
  const out = [];
  for (const s of steps) {
    if (sectionStatus(s.id, f, routeConfirmed) !== 'done') out.push({ step: s.id, en: `${s.id === 'setup' && f.sourceType === 'emarket' ? s.emTitle : s.title} isn’t complete` });
    else qualityIssues(s.id, f).forEach((q) => out.push({ step: s.id, en: q.en }));
  }
  if (f.sourceType !== 'emarket') {
    const so = stdOpen(f);
    if (so) out.push({ step: 'review', anchor: 'std', en: `${so} technical question${so === 1 ? '' : 's'} to answer` });
    const missingNa = standardsFor(f).filter((s) => s.required && s.na && !s.naReason.trim()).length;
    if (inEaScope(f) && missingNa) out.push({ step: 'review', anchor: 'std', en: `${missingNa} required standard${missingNa === 1 ? '' : 's'} marked N/A without a reason` });
    const co = continuityOpen(f);
    if (co) out.push({ step: 'review', anchor: 'bcm', en: `${co} continuity and risk answer${co === 1 ? '' : 's'} still needed` });
  }
  return out;
}
