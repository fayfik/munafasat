// Manual build — review teams: shared queues, roles, delegation and reassignment
// (Kholoud's points 3 and 9: role-based access and delegation, shared queue and manual
// assignment, reassignment that keeps the review history).
//
// A queued task is assigned to the team placeholder until a member picks it up. Comments,
// decisions and the activity log live on the task (the request), never on the person, so
// whoever holds it next sees everything.
import { PEOPLE as P } from './data';
import type { ActivityEntry, Person, RfpDetail, Task } from './types';
import { CYBER_LIBRARY, reqLabel } from '../lib/cyberLibrary';

export interface Team { id: string; name: string; nameAr: string; placeholder: Person; members: Person[]; lead: Person }

const FARIS: Person = { id: 'u-faris', name: 'Faris Al-Mutairi', nameAr: 'فارس المطيري', role: 'Cyber Security Reviewer', roleAr: 'مراجع الأمن السيبراني', dept: 'Cyber Security', deptAr: 'الأمن السيبراني' };
const HUDA: Person = { id: 'u-huda', name: 'Huda Al-Otaibi', nameAr: 'هدى العتيبي', role: 'Cyber Security Team Lead', roleAr: 'رئيسة فريق الأمن السيبراني', dept: 'Cyber Security', deptAr: 'الأمن السيبراني' };

export const CYBER_TEAM: Team = {
  id: 'cyber', name: 'Cyber Security team', nameAr: 'فريق الأمن السيبراني',
  placeholder: { id: 'q-cyber', name: 'Cyber Security team', nameAr: 'فريق الأمن السيبراني', role: 'Team queue — not picked up', roleAr: 'قائمة الفريق — لم تُستلم', dept: 'Cyber Security', deptAr: 'الأمن السيبراني' },
  members: [P.cyber, FARIS, HUDA],
  lead: HUDA,
};
export const TEAMS: Record<string, Team> = { cyber: CYBER_TEAM };
export const CYBER_PEOPLE = { noura: P.cyber, faris: FARIS, huda: HUDA };

export const teamOfTask = (t: Task) => (t.queue ? TEAMS[t.queue.team] : undefined);
export const isMember = (team: Team | undefined, p?: Person | null) => !!team && !!p && team.members.some((m) => m.id === p.id);
export const isLead = (team: Team | undefined, p?: Person | null) => !!team && !!p && team.lead.id === p.id;
export const unclaimed = (t: Task) => !!t.queue && t.assignee.id === TEAMS[t.queue.team]?.placeholder.id;
export const teamFor = (p?: Person | null) => Object.values(TEAMS).find((tm) => isMember(tm, p));

// ── Out-of-office delegation ───────────────────────────────────────────────────
export interface Delegation { to: Person; until: string }
let DELEG: Record<string, Delegation> = {};
export const setDelegationRegistry = (d: Record<string, Delegation>) => { DELEG = d; };
const active = (d?: Delegation) => !!d && new Date(d.until).getTime() >= Date.now() - 86400000;
/** The person acting for `personId` today, if they're out of office. */
export const delegateOf = (personId: string) => (active(DELEG[personId]) ? DELEG[personId].to : undefined);
/** Whose tasks `viewer` is covering today. */
export const coveringFor = (viewerId: string) => Object.entries(DELEG).filter(([, d]) => active(d) && d.to.id === viewerId).map(([id]) => id);

/** The actor recorded when `viewer` acts on `task` (marks "on behalf of" for a delegate). */
export function actorFor(task: Task, viewer: Person): Person {
  if (task.assignee.id === viewer.id || unclaimed(task)) return viewer;
  if (delegateOf(task.assignee.id)?.id === viewer.id) return { ...viewer, name: `${viewer.name} (on behalf of ${task.assignee.name})`, nameAr: `${viewer.nameAr ?? viewer.name} (نيابة عن ${task.assignee.nameAr ?? task.assignee.name})` };
  return viewer;
}

/** Whether `viewer` may act on `task` now (own task, delegate, or not yet picked up). */
export const canAct = (task: Task, viewer?: Person | null) => !viewer || task.assignee.id === viewer.id || delegateOf(task.assignee.id)?.id === viewer.id;

// ── Queue actions (pure: each returns the updated task) ───────────────────────
const now = () => new Date().toISOString();
const log = (t: Task, actor: Person, en: string, ar: string, text?: string): Task =>
  ({ ...t, activity: [...t.activity, { id: `q_${Math.random().toString(36).slice(2)}`, at: now(), kind: 'system', actor, system: { en, ar }, text } as ActivityEntry] });

export function pickUp(t: Task, by: Person): Task {
  return log({ ...t, assignee: by, queue: { ...t.queue!, claimedAt: now(), assignedBy: undefined } }, by, `Picked up by ${by.name}`, `استلمها ${by.nameAr ?? by.name}`);
}
export function assignTo(t: Task, to: Person, by: Person, note?: string): Task {
  const from = unclaimed(t) ? undefined : t.assignee;
  const en = from ? `Reassigned from ${from.name} to ${to.name}` : `Assigned to ${to.name}`;
  const ar = from ? `أُعيد إسنادها من ${from.nameAr ?? from.name} إلى ${to.nameAr ?? to.name}` : `أُسندت إلى ${to.nameAr ?? to.name}`;
  return log({ ...t, assignee: to, queue: { ...t.queue!, claimedAt: now(), assignedBy: by.name } }, by, `${en} by ${by.name}`, ar, note);
}
export function release(t: Task, by: Person): Task {
  const team = teamOfTask(t)!;
  return log({ ...t, assignee: team.placeholder, queue: { ...t.queue!, claimedAt: undefined, assignedBy: undefined } }, by, `Returned to the ${team.name} queue by ${by.name}`, `أُعيدت إلى قائمة ${team.nameAr} بواسطة ${by.nameAr ?? by.name}`);
}

/** Puts a Cyber review task into the shared Cyber queue. */
export function toCyberQueue(t: Task): Task {
  return { ...t, assignee: CYBER_TEAM.placeholder, queue: { team: 'cyber' } };
}

// ── Demo seeds: the RFP #4433 Cyber review goes to the queue, plus two past reviews ──
export function withTeamSeeds(tasks: Task[]): Task[] {
  const cy = tasks.find((t) => t.id === 'TSK-4433-03');
  if (!cy) return tasks;
  // The demo request comes with a few Cybersecurity requirements the requester picked in Scope of
  // Work (Internal data), so the Cyber review starts from a realistic selection.
  const PICKS = ['cy-ecc', 'cy-residency', 'cy-iam'];
  const withPicks = (r?: RfpDetail): RfpDetail | undefined => r && {
    ...r,
    techRequirements: [...(r.techRequirements ?? []).filter((x) => !x.reqEn.startsWith('Cybersecurity —')),
      ...CYBER_LIBRARY.filter((c) => PICKS.includes(c.id)).map((c) => ({ reqEn: reqLabel(c), reqAr: `الأمن السيبراني — ${c.titleAr}`, descEn: c.textEn, descAr: c.textEn }))],
  };
  const queued = tasks.map((t) => {
    if (!t.id.startsWith('TSK-4433-')) return t;
    const x = { ...t, rfp: withPicks(t.rfp) };
    return t.id === cy.id ? { ...toCyberQueue(x), cyberReview: { projectTypes: ['technology'], requesterClass: 'Internal' } } : x;
  });
  const day = 86400000;
  const past = (o: { no: string; title: string; titleAr: string; by: Person; receivedDays: number; tookHours: number; decision: 'approved' | 'returned'; note: string; amount: number }): Task => {
    const rec = new Date(Date.now() - o.receivedDays * day); rec.setHours(9, 30, 0, 0);
    while (rec.getDay() === 5 || rec.getDay() === 6) rec.setDate(rec.getDate() - 1); // a working day (Sun–Thu)
    const done = new Date(+rec + o.tookHours * 3600000);
    const swap = (s: string) => s.split('4433').join(o.no).split('Enterprise ERP System Upgrade').join(o.title);
    return {
      ...cy, id: `TSK-${o.no}-03`, titleEn: swap(cy.titleEn), titleAr: swap(cy.titleAr),
      entity: { ...cy.entity, ref: `REQ-${o.no}`, titleEn: o.title, titleAr: o.titleAr }, project: { en: o.title, ar: o.titleAr }, amount: o.amount,
      assignee: o.by, queue: { team: 'cyber', claimedAt: rec.toISOString() },
      state: o.decision === 'approved' ? 'completed' : 'waiting', mineAction: true,
      receivedAt: rec.toISOString(), dueAt: new Date(o.decision === 'approved' ? +rec + 2 * day : Date.now() + 5 * day).toISOString(), completedAt: done.toISOString(),
      decision: o.decision === 'approved' ? { en: 'Approved', ar: 'تم الاعتماد' } : { en: 'Returned for Correction', ar: 'مُعاد للتصحيح' },
      cyberReview: { classification: o.decision === 'approved' ? 'Internal' : 'Confidential', projectTypes: ['technology'] },
      rfp: cy.rfp ? { ...cy.rfp, refId: `REQ-${o.no}`, titleEn: o.title, titleAr: o.titleAr } : undefined, trail: undefined,
      activity: [
        { id: 'p0', kind: 'system', actor: P.requester, at: new Date(+rec - 2 * day).toISOString(), system: { en: `Request #${o.no} submitted`, ar: `تم تقديم الطلب رقم ${o.no}` } },
        { id: 'p1', kind: 'system', actor: o.by, at: rec.toISOString(), system: { en: `Picked up by ${o.by.name}`, ar: `استلمها ${o.by.nameAr}` } },
        { id: 'p2', kind: 'decision', actor: o.by, at: done.toISOString(), decision: o.decision === 'approved' ? { en: 'Approved', ar: 'تم الاعتماد' } : { en: 'Returned for Correction', ar: 'مُعاد للتصحيح' }, text: o.note },
      ],
    };
  };
  return [
    ...queued,
    past({ no: '4402', title: 'Identity & Access Management Platform', titleAr: 'منصة إدارة الهوية والصلاحيات', by: P.cyber, receivedDays: 12, tookHours: 30, decision: 'approved', note: 'SSO, MFA and data residency requirements are in the scope. Approved.', amount: 2_350_000 }),
    past({ no: '4419', title: 'Data Analytics Consultancy', titleAr: 'استشارات تحليل البيانات', by: FARIS, receivedDays: 6, tookHours: 20, decision: 'returned', note: 'Add the confidentiality and data-return clauses before the vendor gets access to customer data.', amount: 980_000 }),
  ];
}
