// Manual build — impact-based re-approval (Kholoud's point 5; BCM, ORM, Finance and EA asked too).
// Every approval keeps a copy of the request as it stood. When the requester resubmits after
// a return, each earlier approval is compared with the new version, section by section:
//  - the change touches a section that reviewer owns → their approval reopens as "Re-confirm"
//    (1-day SLA) with a "What changed" summary;
//  - otherwise the approval stands and they get a "Changed since your approval" notice they
//    can act on (revoke) if they disagree.
import type { ActivityEntry, Bilingual, RfpDetail, SectionChange, Task } from './types';

const sup = (en: string, ar: string): Bilingual => ({ en, ar });

/** The request's sections, as comparable lines. */
const SECTIONS: { key: string; label: Bilingual; lines: (r: RfpDetail) => string[] }[] = [
  { key: 'scope', label: sup('Scope of Work', 'نطاق العمل'), lines: (r) => [
    ...(r.scopeEn || '').split(/\n+/).map((x) => x.trim()).filter(Boolean),
    ...(r.scopeBlocks ?? []).flatMap((b) => b.itemsEn.map((i) => `${b.headEn}: ${i}`)),
  ] },
  { key: 'tech', label: sup('Technical requirements', 'المتطلبات الفنية'), lines: (r) => [
    ...(r.techRequirements ?? []).map((x) => `${x.reqEn}${x.descEn ? ` — ${x.descEn}` : ''}${x.removedBy ? ` [removed by ${x.removedBy}: ${x.removedReason ?? ''}]` : ''}`),
    ...(r.techDocs ?? []).map((d) => `Document: ${d.en}`),
  ] },
  { key: 'evaluation', label: sup('Evaluation criteria', 'معايير التقييم'), lines: (r) => [...r.evaluation.map((e) => `${e.criterionEn} (${e.weight}%)`), `Passing score ${r.techPassing ?? '—'}%`] },
  { key: 'boq', label: sup('Bill of Quantities', 'جدول الكميات'), lines: (r) => r.boq.map((l) => `${l.itemEn} · ${l.qty} ${l.unit} × SAR ${l.unitPrice.toLocaleString('en-US')}`) },
  { key: 'payment', label: sup('Payment schedule', 'جدول الدفعات'), lines: (r) => r.payment.map((p) => `${p.stageEn} (${p.pct}%)`) },
  { key: 'qualification', label: sup('Qualification criteria', 'معايير التأهيل'), lines: (r) => (r.qualCriteria ?? []).flatMap((q) => [`${q.nameEn} (${q.pct}%)`, ...q.subs.map((s) => `${q.nameEn} › ${s.nameEn} ${s.range} (${s.pct}%)`)]) },
  { key: 'documents', label: sup('Documents', 'المستندات'), lines: (r) => r.documents.map((d) => d.en) },
];

export function diffRfp(a?: RfpDetail, b?: RfpDetail): SectionChange[] {
  if (!a || !b) return [];
  const out: SectionChange[] = [];
  for (const s of SECTIONS) {
    const x = s.lines(a), y = s.lines(b);
    const removed = x.filter((l) => !y.includes(l)), added = y.filter((l) => !x.includes(l));
    if (removed.length || added.length) out.push({ key: s.key, label: s.label, removed, added });
  }
  return out;
}

/** Which sections each reviewer's approval depends on (from the stakeholder interviews). */
export const OWNED: Record<string, string[]> = {
  cyber: ['scope', 'tech'],
  bcm: ['scope'],
  oprisk: ['scope'],
  ea: ['scope', 'tech', 'boq', 'payment', 'evaluation'],
  gl: ['boq'],
  assets: ['boq'],
  tech: ['tech', 'evaluation'],
  finq: ['qualification'],
  procq: ['qualification'],
};
const boqTotal = (r?: RfpDetail) => (r?.boq ?? []).reduce((s, l) => s + (Number(l.qty) || 1) * l.unitPrice, 0);

/** Sections that matter to this stage (the manager re-confirms only when the value moves by more than 10%). */
export function affects(stage: string, changes: SectionChange[], before?: RfpDetail, after?: RfpDetail): boolean {
  if (stage === 'mgr') { const a = boqTotal(before), b = boqTotal(after); return a > 0 && Math.abs(b - a) / a > 0.1; }
  const own = OWNED[stage] ?? [];
  return changes.some((c) => own.includes(c.key));
}

const entry = (t: Task, en: string, ar: string, text?: string): ActivityEntry =>
  ({ id: `v_${Math.random().toString(36).slice(2)}`, at: new Date().toISOString(), kind: 'system', actor: t.assignee, system: sup(en, ar), text });

/** Reopens an approval so the reviewer re-confirms it against what changed. */
export function reopen(t: Task, changes: SectionChange[], why: Bilingual): Task {
  const now = Date.now();
  return {
    ...t, state: 'available', completedAt: undefined, decision: undefined,
    receivedAt: new Date(now).toISOString(), dueAt: new Date(now + 86400000).toISOString(), slaHours: 24,
    reconfirm: { at: new Date(now).toISOString(), changes }, changeNotice: undefined,
    titleEn: t.titleEn.startsWith('Re-confirm') ? t.titleEn : `Re-confirm: ${t.titleEn}`,
    titleAr: t.titleAr.startsWith('إعادة تأكيد') ? t.titleAr : `إعادة تأكيد: ${t.titleAr}`,
    flow: t.flow ? { ...t.flow, activated: true } : t.flow,
    activity: [...t.activity, entry(t, why.en, why.ar, changes.map((c) => c.label.en).join(', '))],
  };
}

/**
 * After a resubmission: every flow task gets the new request; each earlier approval is either
 * reopened (its area changed) or kept with a change notice. Stages still to come wait for
 * any reopened approval.
 */
export function applyResubmit(all: Task[], requestNo: string, returnerId: string): Task[] {
  const src = all.find((t) => t.id === returnerId);
  const next = src?.rfp;
  if (!next) return all;
  const reopened: string[] = [];
  let xs = all.map((t) => {
    if (t.flow?.requestNo !== requestNo || t.flow.stage.endsWith('-R')) return t;
    const withRfp = { ...t, rfp: next };
    if (t.id === returnerId || t.state !== 'completed' || !t.approvedRfp) return withRfp;
    const changes = diffRfp(t.approvedRfp, next);
    if (!changes.length) return withRfp;
    if (affects(t.flow.stage, changes, t.approvedRfp, next)) {
      reopened.push(t.id);
      return reopen(withRfp, changes, sup('The request changed in your area — approval reopened to re-confirm', 'تغيّر الطلب في نطاقك — أُعيد فتح الاعتماد لإعادة التأكيد'));
    }
    return { ...withRfp, changeNotice: { at: new Date().toISOString(), changes },
      activity: [...t.activity, entry(t, 'Changed since your approval — not in your area, approval kept', 'تغيّر بعد اعتمادك — خارج نطاقك، بقي الاعتماد', changes.map((c) => c.label.en).join(', '))] };
  });
  if (reopened.length) {
    xs = xs.map((t) => (t.flow?.requestNo === requestNo && !t.flow.activated && t.state !== 'cancelled'
      ? { ...t, dependsOn: [...new Set([...(t.dependsOn ?? []), ...reopened])] } : t));
  }
  return xs;
}
