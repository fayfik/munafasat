// Manual build — Cyber review logic. Nothing is detected: the requester ticks Cybersecurity
// requirements from the library in Scope of Work, and the Cyber reviewer modifies that set —
// adds requirements the request needs, or revokes one with a reason. The reviewer's changes are
// pending until they send their decision, then written into the request for everyone.
import { CYBER_LIBRARY, applicableReqs, classLevel, reqLabel, type CyberReq } from '../lib/cyberLibrary';
import { diffRfp, OWNED } from './versions';
import type { ActivityEntry, Bilingual, RfpDetail, Task } from './types';

export type RowState = 'requester' | 'cyber' | 'removed' | 'none';

/** Where a library requirement stands in the request (before the reviewer's pending changes). */
export function rowState(rfp: RfpDetail | undefined, r: CyberReq): { state: RowState; reason?: string } {
  const row = (rfp?.techRequirements ?? []).find((x) => x.reqEn === reqLabel(r));
  if (!row) return { state: 'none' };
  if (row.removedBy) return { state: 'removed', reason: row.removedReason };
  return { state: row.addedBy === 'Cyber Security' ? 'cyber' : 'requester' };
}

/** The requirements currently in the request (requester's picks + earlier Cyber additions). */
export function requestReqs(task: Task) {
  return CYBER_LIBRARY.map((r) => ({ req: r, ...rowState(task.rfp, r) })).filter((x) => x.state !== 'none');
}

/** Library requirements usually required at a classification, for this project type. */
export const usuallyRequired = (task: Task, cls?: string) => new Set(cls ? applicableReqs(task.cyberReview?.projectTypes ?? [], classLevel(cls)).map((r) => r.id) : []);

/** What still blocks the Cyber decision: only confirming the data classification. */
export function cyberMissing(task: Task): Bilingual[] {
  if (!task.cyberReview) return [];
  return task.cyberReview.classification ? [] : [{ en: 'Confirm the data classification', ar: 'تأكيد تصنيف البيانات' }];
}

const SENDS = new Set(['approve', 'return', 'complete', 'submit', 'reject']);

/** On the Cyber decision: write the pending additions and removals into the request (all its tasks). */
export function applyCyberPending(all: Task[], taskId: string, action: string): Task[] {
  const src = all.find((t) => t.id === taskId);
  const pend = src?.cyberReview?.pending;
  if (!src || !pend || !SENDS.has(action) || (!pend.add.length && !pend.revoke.length)) return all;
  const now = new Date().toISOString();
  const byId = (id: string) => CYBER_LIBRARY.find((r) => r.id === id)!;
  const rewrite = (rfp: RfpDetail): RfpDetail => {
    let rows = [...(rfp.techRequirements ?? [])];
    for (const id of pend.add) {
      const r = byId(id);
      const i = rows.findIndex((x) => x.reqEn === reqLabel(r));
      const row = { reqEn: reqLabel(r), reqAr: `الأمن السيبراني — ${r.titleAr}`, descEn: r.textEn, descAr: r.textEn, addedBy: 'Cyber Security' };
      rows = i >= 0 ? rows.map((x, j) => (j === i ? row : x)) : [...rows, row];
    }
    for (const { id, reason } of pend.revoke) {
      const lbl = reqLabel(byId(id));
      rows = rows.map((x) => (x.reqEn === lbl ? { ...x, removedBy: 'Cyber Security', removedReason: reason } : x));
    }
    return { ...rfp, techRequirements: rows };
  };
  const same = (t: Task) => t.id === taskId || (!!src.flow && t.flow?.requestNo === src.flow.requestNo);
  const before = src.rfp;
  const after = before ? rewrite(before) : undefined;
  const changes = diffRfp(before, after);
  const logs: ActivityEntry[] = [
    ...pend.add.map((id) => ({ id: `cya_${id}_${now}`, at: now, kind: 'system' as const, actor: src.assignee, system: { en: `Requirement added by Cyber: ${byId(id).titleEn}`, ar: `أضاف الأمن السيبراني متطلباً: ${byId(id).titleAr}` } })),
    ...pend.revoke.map(({ id, reason }) => ({ id: `cyr_${id}_${now}`, at: now, kind: 'system' as const, actor: src.assignee, system: { en: `Requirement removed by Cyber: ${byId(id).titleEn}`, ar: `أزال الأمن السيبراني متطلباً: ${byId(id).titleAr}` }, text: reason })),
  ];
  return all.map((t) => {
    if (!same(t) || !t.rfp) return t;
    const next: Task = { ...t, rfp: rewrite(t.rfp) };
    if (t.id === taskId) return { ...next, cyberReview: { ...src.cyberReview!, pending: undefined }, activity: [...t.activity, ...logs] };
    // Reviewers who already approved and own the technical requirements (EA, technical member) get a
    // notice — the change came from Cyber, not the requester, so their approval stands.
    const own = OWNED[t.flow?.stage ?? ''] ?? [];
    if (t.state === 'completed' && changes.length && changes.some((c) => own.includes(c.key))) {
      return { ...next, changeNotice: { at: now, changes },
        activity: [...t.activity, { id: `cyn_${now}`, at: now, kind: 'system', actor: t.assignee, system: { en: 'Cyber Security changed the technical requirements after your approval — approval kept', ar: 'غيّر الأمن السيبراني المتطلبات الفنية بعد اعتمادك — بقي الاعتماد' } }] };
    }
    return next;
  });
}
