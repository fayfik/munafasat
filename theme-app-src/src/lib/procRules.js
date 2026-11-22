// Procurement-side helpers for the approval steps up to Etimad (design-review
// inbox/procGuide.ts): the request read back as creation data so the same
// recommended ranges apply, Finance suggestions, the requester's priority.
import { recommendedFor, recText, parseMin, suggestFin, finOk } from './qualGuide.js';
import { useStore } from '../state/store.jsx';

export const CONTRACT_OPTS = [
  { id: 'tender', en: 'Tendering', hint: 'Open to every qualified vendor on Etimad' },
  { id: 'closed', en: 'Closed bid', hint: 'Only invited vendors can bid' },
  { id: 'direct', en: 'Direct purchase', hint: 'One vendor — needs a justification' },
];
export const ENVELOPE_OPTS = [
  { id: 'one', en: 'One envelope', hint: 'Technical and financial offers together' },
  { id: 'two', en: 'Two envelopes', hint: 'Financial offer opened only for technically passing vendors' },
];
export const VENDOR_POOL = ['Elm Company', 'Mozn Systems', 'Al Moammar Information Systems', 'Solutions by STC', 'SAP Arabia', 'Accenture KSA', 'Devoteam Middle East'];

const profile = (r) => r.profile || { priority: 'medium' };

/** The request record read as creation data — qm-i / qs-i-j ids line up with the recommended bands. */
export function formLike(r) {
  const groups = r.qualification?.groups || [];
  return {
    projectPriority: profile(r).priority, projectArea: profile(r).area, deliveryType: profile(r).delivery,
    purpose: r.purpose || '', scopeOfWork: r.scope || '', boqItems: [], contractDuration: '', contractDurationType: 'months',
    qualificationCriteria: groups.map((g, i) => ({ id: `qm-${i + 1}`, name: g.name, percentage: g.weight, subCriteria: g.subs.map((s, j) => ({ id: `qs-${i + 1}-${j + 1}`, name: s.name, range: s.range, percentage: s.weight })) })),
  };
}

/** Recommended band for a request sub-criterion, and whether it sits above it. */
export function subGuide(r, gi, si) {
  const f = formLike(r);
  const rec = recommendedFor(`qs-${gi + 1}-${si + 1}`, f);
  if (!rec) return null;
  const v = parseMin(r.qualification.groups[gi].subs[si].range);
  return { text: recText(rec), above: v != null && v > rec.max };
}
export const aboveCount = (r) => (r.qualification?.groups || []).reduce((n, g, gi) => n + g.subs.filter((_, si) => subGuide(r, gi, si)?.above).length, 0);

const ratio = (range) => { const m = String(range || '').match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/); return m ? [m[1], m[2]] : ['', '']; };
/** What the requester entered in the Financial criterion. */
export function requesterFin(r) {
  const g = r.qualification?.groups.find((x) => /financ/i.test(x.name));
  if (!g) return suggestFin(profile(r).priority, profile(r).delivery);
  const [l, c] = g.subs;
  const [lmin, lmax] = ratio(l.range); const [cmin, cmax] = ratio(c.range);
  return { liquidity: { min: lmin, max: lmax, weight: l.weight }, cash: { min: cmin, max: cmax, weight: c.weight }, passing: 60 };
}
export const suggestedFin = (r) => suggestFin(profile(r).priority, profile(r).delivery);
export { finOk };

/** Procurement decisions shared across this request's tasks. */
export function useRfp(reqId) {
  const { state, dispatch } = useStore();
  return [state.rfp[reqId] || {}, (patch) => dispatch({ type: 'rfp', req: reqId, patch })];
}

export function methodOk(m) {
  if (!m?.contractType || !m.envelope || !m.officer) return false;
  if (m.contractType === 'direct' && !(m.justification || '').trim()) return false;
  if (m.contractType === 'closed' && !(m.vendors || []).length) return false;
  return true;
}
