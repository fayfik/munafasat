// Manual build — Cyber review logic: which library requirements apply, and whether each is in
// the request (written by the requester or added by Cyber) or marked not applicable.
import { applicableReqs, classLevel, reqLabel, type CyberReq } from '../lib/cyberLibrary';
import type { Bilingual, Task } from './types';

export type ReqState = 'in-request' | 'added' | 'na' | 'missing';

export function cyberItems(task: Task): { req: CyberReq; state: ReqState }[] {
  const cr = task.cyberReview;
  if (!cr?.classification) return [];
  const have = new Set((task.rfp?.techRequirements ?? []).map((r) => r.reqEn));
  return applicableReqs(cr.projectTypes, classLevel(cr.classification)).map((req) => {
    const st = cr.status[req.id];
    if (st === 'na') return { req, state: 'na' as const };
    if (have.has(reqLabel(req))) return { req, state: st === 'added' ? 'added' as const : 'in-request' as const };
    return { req, state: 'missing' as const };
  });
}

/** What still blocks the Cyber decision. */
export function cyberMissing(task: Task): Bilingual[] {
  if (!task.cyberReview) return [];
  if (!task.cyberReview.classification) return [{ en: 'Data classification', ar: 'تصنيف البيانات' }];
  return cyberItems(task).filter((x) => x.state === 'missing').map((x) => ({ en: x.req.titleEn, ar: x.req.titleAr }));
}
