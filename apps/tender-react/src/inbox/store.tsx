// Munafasat Inbox — in-memory task store (mock Work Engine / Task APIs).
// Deterministic, frontend-only. Commands mutate local state and append audit
// activity; nothing is persisted or sent to SAP. A real deployment would back
// these with the Task Command / Workflow / Audit services.

import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { eaSections } from './eaSections';
import { deptRowKeys } from './cyberReview';
import { SEED_TASKS, ME, buildCommentResponseTask } from './data';
import type { Person } from './types';
import type { RfpDetail, Task, InboxView, ChecklistItem, CollectField, EvalCriterion, Bilingual, ActivityEntry } from './types';

// ── Formatting helpers ─────────────────────────────────────────────────────────
export const fmtSAR = (n: number) =>
  'SAR ' + new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function fmtDate(isoStr: string, isAr: boolean) {
  try { return new Date(isoStr).toLocaleDateString(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return isoStr; }
}
export function fmtDateTime(isoStr: string, isAr: boolean) {
  try { return new Date(isoStr).toLocaleString(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return isoStr; }
}

/** Overdue / due-soon relative to now. */
export function dueInfo(task: Task) {
  const now = Date.now();
  const due = new Date(task.dueAt).getTime();
  const days = Math.round((due - now) / 86400000);
  const terminal = task.state === 'completed' || task.state === 'cancelled' || task.state === 'rejected';
  const overdue = !terminal && due < now;
  const soon = !terminal && !overdue && days <= 1;
  return { days, overdue, soon };
}

export function isBlocked(task: Task, all: Task[]) {
  if (!task.dependsOn?.length) return false;
  return task.dependsOn.some((id) => all.find((t) => t.id === id)?.state !== 'completed');
}

// ── Completion gating (enforced here, as a backend would) ──────────────────────
export interface Completion { canComplete: boolean; missing: Bilingual[]; done: number; total: number }

/** Row keys the technical member must accept or modify (mirrors TechEvalReview). */
export function techReviewKeys(task: Task): string[] {
  const r = task.rfp;
  if (!r) return [];
  return [
    ...(r.techDocs ?? []).map((_, i) => `doc-${i}`),
    ...(r.techRequirements ?? []).map((_, i) => `req-${i}`),
    ...r.evaluation.map((_, i) => `eval-${i}`),
    'passing',
  ];
}

/** Row keys the qualification reviewer must accept or modify (mirrors QualReview). */
export function qualReviewKeys(task: Task): string[] {
  return (task.rfp?.qualCriteria ?? []).flatMap((m, i) => [`qm-${i}`, ...m.subs.map((_, j) => `qs-${i}-${j}`)]);
}

/** Lines the Assets team reviews: everything flagged as an asset. */
export function assetLinesOf(task: Task) {
  return (task.finLines ?? []).filter((l) => flaggedAsset(l) || task.finAssetDecisions?.[l.key]?.promoted);
}
/** BOQ items not flagged as assets (and not moved into the asset group by the Assets team). */
export function nonAssetLinesOf(task: Task) {
  return (task.finLines ?? []).filter((l) => !flaggedAsset(l) && !task.finAssetDecisions?.[l.key]?.promoted);
}
const flaggedAsset = (l: NonNullable<Task['finLines']>[number]) =>
  (l.assetFlag ?? (l.finPurchaseType === 'asset' || l.finPurchaseType === 'service-asset' ? 'asset' : 'non-asset')) === 'asset';

export function completionStatus(task: Task): Completion {
  const missing: Bilingual[] = [];
  let done = 0, total = 0;
  const checkItemDone = (c: ChecklistItem) => {
    if (c.kind === 'decision') return c.value != null && c.value !== '';
    if (c.kind === 'text' || c.kind === 'number') return c.value != null && String(c.value).trim() !== '';
    return c.done === true;
  };
  if (task.type === 'review' && task.checklist) {
    for (const c of task.checklist) {
      if (!c.mandatory) continue;
      total++;
      const ok = checkItemDone(c) && (!c.evidenceRequired || (c.evidence?.length ?? 0) > 0);
      if (ok) done++; else missing.push(c.label);
    }
  } else if (task.qualEditor) {
    const crit = task.qualForm?.criteria ?? [];
    const pct = (v: number | '') => (typeof v === 'number' ? v : 0);
    const main = crit.reduce((s, m) => s + pct(m.percentage), 0);
    // Same completion rule as the request-creation Qualification step.
    total = 2;
    if (crit.length && main === 100) done++; else missing.push({ en: 'Main criteria must total 100%', ar: 'يجب أن يبلغ مجموع المعايير الرئيسية 100%' });
    if (crit.length && crit.every((m) => m.subCriteria.reduce((s, c) => s + pct(c.percentage), 0) === 100)) done++; else missing.push({ en: 'Each sub-criteria group must total 100%', ar: 'يجب أن تبلغ كل مجموعة معايير فرعية 100%' });
  } else if (task.qualReview) {
    const crit = task.rfp?.qualCriteria ?? [];
    for (const k of qualReviewKeys(task)) { total++; if (task.techDecisions?.[k]) done++; else missing.push({ en: `Accept or modify ${k}`, ar: `اقبل أو عدّل ${k}` }); }
    total++; if (crit.length && crit.reduce((s, m) => s + m.pct, 0) === 100) done++; else missing.push({ en: 'Main criteria must total 100%', ar: 'يجب أن يبلغ مجموع المعايير الرئيسية 100%' });
    total++; if (crit.every((m) => m.subs.reduce((s, c) => s + c.pct, 0) === 100)) done++; else missing.push({ en: 'Each sub-criteria group must total 100%', ar: 'يجب أن تبلغ كل مجموعة معايير فرعية 100%' });
  } else if (task.cyberReview || task.deptReview) {
    for (const k of deptRowKeys(task)) { total++; if (task.cyberDecisions?.[k]) done++; else missing.push({ en: `Accept or comment on ${k}`, ar: `اقبل أو علّق على ${k}` }); }
  } else if (task.eaReview) {
    for (const sec of eaSections(task)) { total++; if (task.eaDecisions?.[sec.id]) done++; else missing.push({ en: `Accept or comment on ${sec.en}`, ar: `اقبل أو علّق على ${sec.ar}` }); }
  } else if (task.finReview === 'gl') {
    for (const l of task.finLines ?? []) { total++; if (task.techDecisions?.[`gl-${l.key}`]) done++; else missing.push({ en: `Accept or modify ${l.itemEn}`, ar: `اقبل أو عدّل ${l.itemAr}` }); }
  } else if (task.finReview === 'assets') {
    for (const l of assetLinesOf(task)) { total++; if (task.finAssetDecisions?.[l.key]?.confirmed) done++; else missing.push({ en: `Confirm ${l.itemEn}`, ar: `أكّد ${l.itemAr}` }); }
    if (nonAssetLinesOf(task).length) { total++; if (task.finNonAssetsChecked) done++; else missing.push({ en: 'Check the BOQ items not flagged as assets', ar: 'تحقق من البنود غير المصنفة كأصول' }); }
  } else if (task.finReview === 'changes') {
    total = 1; done = 1;
  } else if (task.techEvalReview) {
    for (const k of techReviewKeys(task)) { total++; if (task.techDecisions?.[k]) done++; else missing.push({ en: `Accept or modify ${k}`, ar: `اقبل أو عدّل ${k}` }); }
    const w = (task.rfp?.evaluation ?? []).reduce((x, c) => x + c.weight, 0);
    total++; if (w === 100) done++; else missing.push({ en: 'Evaluation criteria weights must total 100%', ar: 'يجب أن يبلغ مجموع أوزان معايير التقييم 100%' });
  } else if (task.type === 'data-collection' && task.fields) {
    for (const f of task.fields) {
      if (!f.required) continue;
      total++;
      const filled = f.value != null && String(f.value).trim() !== '';
      if (filled) done++; else missing.push(f.label);
    }
  } else if (task.type === 'technical-evaluation' && task.criteria) {
    for (const c of task.criteria) {
      total++;
      if (c.score != null && !Number.isNaN(c.score)) done++; else missing.push(c.label);
    }
  } else if (task.type === 'document-submission' && task.requiredDocs) {
    for (const d of task.requiredDocs) {
      if (!d.mandatory) continue;
      total++;
      if (d.uploaded) done++; else missing.push(d.label);
    }
  } else if (task.respondComments) {
    for (const a of task.activity) {
      if (a.kind !== 'comment' || !a.anchor || a.replyTo) continue;
      total++;
      if (a.resolved) done++; else missing.push(a.anchor.label);
    }
  } else if (task.type === 'validation' && task.validationChecks) {
    for (const v of task.validationChecks) {
      total++;
      if (v.outcome === 'pass') done++;
      else if (v.outcome === 'fail') missing.push(v.label);
    }
  }
  return { canComplete: missing.length === 0, missing, done, total };
}

// ── View routing ───────────────────────────────────────────────────────────────
/** Queued team tasks belong to the team until assigned — to me, they become mine. */
const inMine = (t: Task) => !t.queue || t.queue.assignedTo?.id === ME.id;
export function viewOf(task: Task, all: Task[]): InboxView[] {
  if (!inMine(task)) return [];
  // Delegated away: still listed under All, but no longer needs my action.
  if (task.delegatedTo) return ['all'];
  const views: InboxView[] = ['all'];
  const { overdue } = dueInfo(task);
  const blocked = isBlocked(task, all);
  const terminal = task.state === 'completed' || task.state === 'rejected' || task.state === 'cancelled';
  if (overdue) views.push('overdue');
  if (task.state === 'completed') views.push('completed');
  if (task.state === 'in-progress' && task.assignee.id === ME.id) views.push('in-progress');
  if ((task.state === 'available' || task.state === 'returned') && task.mineAction && !blocked && !terminal) views.push('needs-action');
  if (task.initiatedByMe && (task.state === 'waiting' || (!task.mineAction && !terminal))) views.push('sent-waiting');
  return views;
}

/** Team queue views (Team Lead): waiting = unassigned, completed = assigned out. */
export function teamViewOf(task: Task): InboxView[] {
  if (!task.queue) return [];
  const v: InboxView[] = ['all'];
  if (task.queue.assignedTo) v.push('completed');
  else { v.push('needs-action'); if (dueInfo(task).overdue) v.push('overdue'); }
  return v;
}

export interface Delegation { to: Person; from: string; until: string; includeNew: boolean; taskIds: string[]; at: string }

// ── Context ─────────────────────────────────────────────────────────────────────
interface InboxCtx {
  tasks: Task[];
  me: typeof ME;
  countsByView: Record<InboxView, number>;
  tasksForView: (v: InboxView) => Task[];
  getTask: (id: string) => Task | undefined;
  blocked: (t: Task) => boolean;
  // commands
  addComment: (id: string, text: string, anchor?: ActivityEntry['anchor'], replyTo?: string, editNote?: boolean) => void;
  resolveComment: (id: string, commentId: string, resolved: boolean) => void;
  updateRfp: (id: string, rfp: RfpDetail) => void;
  setTaskData: (id: string, patch: Partial<Task>) => void;
  decide: (id: string, action: 'approve' | 'reject' | 'return' | 'request-clarification' | 'complete' | 'submit' | 'save-draft', note?: string, decisionLabel?: Bilingual) => void;
  setChecklistItem: (id: string, itemId: string, patch: Partial<ChecklistItem>) => void;
  setField: (id: string, fieldId: string, value: CollectField['value']) => void;
  setCriterion: (id: string, critId: string, patch: Partial<EvalCriterion>) => void;
  uploadDoc: (id: string, docId: string, fileName: string) => void;
  resolveCheck: (id: string, checkId: string) => void;
  /** New-task notifications (push-in + bell). */
  notices: TaskNotice[];
  markNoticesRead: () => void;
  dismissNotice: (id: string) => void;
  markSeen: (taskId: string) => void;
  /** Whose view the app shows: the signed-in user, or the Team Lead (header switcher). */
  persona: 'me' | 'tl';
  setPersona: (p: 'me' | 'tl') => void;
  /** Team queue (Team Lead). */
  teamCounts: Record<InboxView, number>;
  teamTasksForView: (v: InboxView) => Task[];
  assignQueued: (id: string, to: Person) => void;
  /** Inbox delegation. */
  delegation: Delegation | null;
  delegatableIds: () => string[];
  delegate: (d: Omit<Delegation, 'taskIds' | 'at'>) => void;
  cancelDelegation: () => void;
  /** Ask the Inbox to open a task (from a notification). */
  focusTaskId: string | null;
  focusTask: (taskId: string | null) => void;
}

const Ctx = createContext<InboxCtx | null>(null);

/* ── Process flow ───────────────────────────────────────────────────────────
   Steps (from the approval process): 1 Department approval → 2 Technical member
   → 3–8 Specialist & Finance reviews (parallel) → 9 Qualification Finance →
   10 Qualification Procurement → 11 Procurement Team Lead → (12 Officer) → 13 DOA
   → 14 Estimated price. Ids are TSK-<request>-<step>[R][-R]. */
const PARALLEL = [3, 4, 5, 6, 7, 8];
export function flowStep(t: Pick<Task, 'id'>): number {
  const m = /^TSK-\d+-(\d+)(R)?(-R)?$/.exec(t.id);
  if (!m) return 99;
  return Number(m[1]) + (m[2] ? 0.5 : 0) + (m[3] ? 0.25 : 0);
}
const reqOf = (t: Pick<Task, 'id'>) => /^TSK-(\d+)-/.exec(t.id)?.[1] ?? '';
/** Inbox order: by process step, then request, then due date. */
export function flowCompare(a: Task, b: Task) {
  return flowStep(a) - flowStep(b) || +new Date(a.dueAt) - +new Date(b.dueAt) || reqOf(a).localeCompare(reqOf(b));
}
function nextFlowSteps(step: number, action: string, done: (n: number) => boolean): number[] {
  if (step === 1) return action === 'approve' ? [2] : [];
  if (step === 2) return action === 'approve' ? PARALLEL : [];
  if (PARALLEL.includes(step)) return action === 'approve' && PARALLEL.every((n) => n === step || done(n)) ? [9] : [];
  if (step === 9) return [10];
  if (step === 10) return [11];
  if (step === 11) return action === 'approve' ? [13] : action === 'complete' ? [12] : [];
  if (step === 12) return action === 'submit' ? [13] : [];
  if (step === 13) return [14];
  return [];
}

export interface TaskNotice { id: string; taskId: string; at: string; fromEn: string; fromAr: string; read?: boolean }

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `a_${Math.random().toString(36).slice(2)}`);

export function InboxProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => SEED_TASKS.map((t) => ({ ...t })));
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const [notices, setNotices] = useState<TaskNotice[]>([]);
  const [focusTaskId, focusTask] = useState<string | null>(null);
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [persona, setPersona] = useState<'me' | 'tl'>('me');
  const delegationRef = useRef(delegation);
  delegationRef.current = delegation;
  const markNoticesRead = useCallback(() => setNotices((ns) => ns.map((n) => ({ ...n, read: true }))), []);
  const dismissNotice = useCallback((id: string) => setNotices((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const markSeen = useCallback((taskId: string) => {
    setTasks((xs) => (xs.some((t) => t.id === taskId && t.arrivedAt) ? xs.map((t) => (t.id === taskId ? { ...t, arrivedAt: undefined } : t)) : xs));
  }, []);

  const patch = useCallback((id: string, fn: (t: Task) => Task) => {
    setTasks((xs) => xs.map((t) => (t.id === id ? fn({ ...t }) : t)));
  }, []);

  const logActivity = (t: Task, entry: Omit<ActivityEntry, 'id' | 'at'> & { at?: string }): Task =>
    ({ ...t, activity: [...t.activity, { id: uid(), at: new Date().toISOString(), ...entry }] });

  const addComment = useCallback((id: string, text: string, anchor?: ActivityEntry['anchor'], replyTo?: string, editNote?: boolean) => {
    if (!text.trim()) return;
    patch(id, (t) => logActivity(t, { kind: 'comment', actor: (anchor || replyTo || t.respondComments) ? t.assignee : ME, text: text.trim(), anchor, replyTo, editNote }));
  }, [patch]);

  const resolveComment = useCallback((id: string, commentId: string, resolved: boolean) => {
    patch(id, (t) => ({ ...t, state: t.state === 'available' ? 'in-progress' : t.state, activity: t.activity.map((a) => (a.id === commentId ? { ...a, resolved } : a)) }));
  }, [patch]);
  /** One request record: a change to the request from any task reaches every task on that request. */
  const shareRfp = (xs: Task[], id: string, rfp: RfpDetail) => {
    const ref = xs.find((t) => t.id === id)?.entity.ref;
    return xs.map((t) => (t.id !== id && ref && t.entity.ref === ref && t.rfp ? { ...t, rfp } : t));
  };
  const updateRfp = useCallback((id: string, rfp: RfpDetail) => {
    setTasks((xs) => shareRfp(xs, id, rfp).map((t) => (t.id === id ? { ...t, rfp, state: t.state === 'available' ? 'in-progress' : t.state } : t)));
  }, []);

  const setTaskData = useCallback((id: string, p: Partial<Task>) => {
    setTasks((xs) => (p.rfp ? shareRfp(xs, id, p.rfp) : xs).map((t) => (t.id === id ? { ...t, ...p, state: t.state === 'available' ? 'in-progress' : t.state } : t)));
  }, []);

  const setChecklistItem = useCallback((id: string, itemId: string, p: Partial<ChecklistItem>) => {
    patch(id, (t) => ({
      ...t,
      state: t.state === 'available' ? 'in-progress' : t.state,
      checklist: t.checklist?.map((c) => (c.id === itemId ? { ...c, ...p } : c)),
    }));
  }, [patch]);

  const setField = useCallback((id: string, fieldId: string, value: CollectField['value']) => {
    patch(id, (t) => ({
      ...t,
      state: t.state === 'available' ? 'in-progress' : t.state,
      fields: t.fields?.map((f) => (f.id === fieldId ? { ...f, value } : f)),
    }));
  }, [patch]);

  const setCriterion = useCallback((id: string, critId: string, p: Partial<EvalCriterion>) => {
    patch(id, (t) => ({
      ...t,
      state: t.state === 'available' ? 'in-progress' : t.state,
      criteria: t.criteria?.map((c) => (c.id === critId ? { ...c, ...p } : c)),
    }));
  }, [patch]);

  const uploadDoc = useCallback((id: string, docId: string, fileName: string) => {
    patch(id, (t) => ({
      ...t,
      state: t.state === 'available' ? 'in-progress' : t.state,
      requiredDocs: t.requiredDocs?.map((d) => (d.id === docId ? { ...d, uploaded: fileName } : d)),
    }));
  }, [patch]);

  const resolveCheck = useCallback((id: string, checkId: string) => {
    patch(id, (t) => {
      const next = logActivity(t, { kind: 'system', actor: ME, system: { en: 'Validation issue resolved', ar: 'تمت معالجة مشكلة التحقق' } });
      return { ...next, state: next.state === 'available' ? 'in-progress' : next.state,
        validationChecks: next.validationChecks?.map((v) => (v.id === checkId ? { ...v, outcome: 'pass' as const } : v)) };
    });
  }, [patch]);

  const decide = useCallback<InboxCtx['decide']>((id, action, note, decisionLabel) => {
    // Which tasks arrive in the inbox because of this decision (process flow).
    const before = tasksRef.current;
    const src0 = before.find((t) => t.id === id);
    const arrivals: string[] = [];
    if (src0) {
      const req = reqOf(src0);
      const isDone = (n: number) => before.some((t) => reqOf(t) === req && flowStep(t) === n && t.state === 'completed');
      if (action === 'return' && src0.reviewComments && !src0.respondComments) arrivals.push(`${id}-R`);
      else if (action === 'submit' && src0.respondComments && id.endsWith('-R')) arrivals.push(id.slice(0, -2));
      else if (['approve', 'complete', 'submit'].includes(action)) {
        for (const n of nextFlowSteps(Math.floor(flowStep(src0)), action, isDone)) {
          const nx = before.find((t) => reqOf(t) === req && flowStep(t) === n && t.state !== 'completed');
          if (nx) arrivals.push(nx.id);
        }
      }
    }
    setTasks((xs) => {
      let completedDepId: string | null = null;
      const label: Record<string, Bilingual> = {
        approve: { en: 'Approved', ar: 'تم الاعتماد' },
        reject: { en: 'Rejected', ar: 'تم الرفض' },
        return: { en: 'Returned for Correction', ar: 'مُعاد للتصحيح' },
        'request-clarification': { en: 'Clarification Requested', ar: 'طُلب توضيح' },
        complete: { en: 'Task Completed', ar: 'اكتملت المهمة' },
        submit: { en: 'Submitted', ar: 'تم التقديم' },
        'save-draft': { en: 'Draft Saved', ar: 'تم حفظ المسودة' },
      };
      const next = xs.map((t) => {
        if (t.id !== id) return t;
        let state = t.state;
        if (action === 'approve' || action === 'complete' || action === 'submit') { state = 'completed'; completedDepId = t.id; }
        else if (action === 'reject') state = 'rejected';
        else if (action === 'return') state = t.reviewComments && !t.respondComments ? 'waiting' : 'returned';
        else if (action === 'request-clarification') state = 'waiting';
        else if (action === 'save-draft') state = 'in-progress';
        const kind: ActivityEntry['kind'] = action === 'save-draft' ? 'system' : 'decision';
        const entry: ActivityEntry = { id: uid(), at: new Date().toISOString(), kind, actor: ME,
          ...(kind === 'decision' ? { decision: decisionLabel ?? label[action] } : { system: label[action] }), text: note?.trim() || undefined };
        const done = action === 'approve' || action === 'complete' || action === 'submit';
        return { ...t, state, activity: [...t.activity, entry],
          decision: (action === 'approve' || action === 'reject' || action === 'complete' || action === 'submit') ? (decisionLabel ?? label[action]) : t.decision,
          completedAt: done ? new Date().toISOString() : t.completedAt };
      });
      // Manager returned a reviewed request → the requester gets a task to answer the comments.
      const src = next.find((t) => t.id === id);
      if (action === 'return' && src?.reviewComments && !src.respondComments) {
        return [buildCommentResponseTask(src, note), ...next.filter((t) => t.id !== `${id}-R`)];
      }
      // Requester resubmitted → the manager's task comes back with replies, resolutions and edits.
      if (action === 'submit' && src?.respondComments && id.endsWith('-R')) {
        const origId = id.slice(0, -2);
        const strip = (x: string) => (x.startsWith('R-') ? x.slice(2) : x);
        return next.map((t) => {
          if (t.id !== origId) return t;
          const byId = new Map(src.activity.filter((a) => a.kind === 'comment').map((a) => [strip(a.id), a]));
          const kept = t.activity.map((a) => (byId.has(a.id) ? { ...a, resolved: byId.get(a.id)!.resolved } : a));
          const added = src.activity.filter((a) => a.kind === 'comment' && !t.activity.some((x) => x.id === strip(a.id)))
            .map((a) => ({ ...a, id: strip(a.id), replyTo: a.replyTo ? strip(a.replyTo) : undefined }));
          const back: ActivityEntry = { id: uid(), at: new Date().toISOString(), kind: 'decision', actor: src.assignee, decision: { en: 'Resubmitted for approval', ar: 'أُعيد التقديم للاعتماد' }, system: { en: 'Address review comments', ar: 'معالجة تعليقات المراجعة' }, text: note?.trim() || undefined };
          return { ...t, state: 'available', rfp: src.rfp ?? t.rfp, activity: [...kept, ...added, back], receivedAt: new Date().toISOString() };
        });
      }
      // Serial workflow: unlock dependents whose dependencies are now all completed.
      if (completedDepId) {
        return next.map((t) => {
          if (t.dependsOn?.includes(completedDepId!) && t.dependsOn.every((d) => next.find((x) => x.id === d)?.state === 'completed')) {
            return { ...t, activity: [...t.activity, { id: uid(), at: new Date().toISOString(), kind: 'system' as const, actor: ME, system: { en: 'Prior step complete — task is now actionable', ar: 'اكتملت الخطوة السابقة — المهمة الآن قابلة للتنفيذ' } }] };
          }
          return t;
        });
      }
      return next;
    });
    if (arrivals.length && src0) {
      const now = new Date().toISOString();
      const dg = delegationRef.current;
      const toDelegate = dg?.includeNew ? dg.to : undefined;
      setTasks((xs) => xs.map((t) => (arrivals.includes(t.id) ? { ...t, arrivedAt: now, receivedAt: now, ...(toDelegate && t.mineAction ? { delegatedTo: toDelegate } : {}) } : t)));
      if (toDelegate) setDelegation((d) => (d ? { ...d, taskIds: [...new Set([...d.taskIds, ...arrivals])] } : d));
      setNotices((ns) => [...arrivals.map((taskId) => ({ id: uid(), taskId, at: now, fromEn: src0.stageEn, fromAr: src0.stageAr })), ...ns].slice(0, 20));
    }
  }, []);

  const assignQueued = useCallback((id: string, to: Person) => {
    const now = new Date().toISOString();
    patch(id, (t) => ({ ...t, assignee: to, mineAction: to.id === ME.id, queue: { ...t.queue!, assignedTo: to, assignedAt: now },
      activity: [...t.activity, { id: uid(), at: now, kind: 'decision', actor: ME, decision: { en: `Assigned to ${to.name}`, ar: `أُسند إلى ${to.nameAr ?? to.name}` } }] }));
  }, [patch]);
  /** Tasks that would move: everything waiting for my action. */
  const delegatableIds = useCallback(() => tasksRef.current.filter((t) => viewOf(t, tasksRef.current).includes('needs-action')).map((t) => t.id), []);
  const delegate = useCallback((d: Omit<Delegation, 'taskIds' | 'at'>) => {
    const ids = delegatableIds();
    const now = new Date().toISOString();
    setTasks((xs) => xs.map((t) => (ids.includes(t.id) ? { ...t, delegatedTo: d.to, activity: [...t.activity, { id: uid(), at: now, kind: 'system' as const, actor: ME, system: { en: `Delegated to ${d.to.name}`, ar: `فُوّضت إلى ${d.to.nameAr ?? d.to.name}` } }] } : t)));
    setDelegation({ ...d, taskIds: ids, at: now });
  }, [delegatableIds]);
  const cancelDelegation = useCallback(() => {
    const now = new Date().toISOString();
    setTasks((xs) => xs.map((t) => (t.delegatedTo && t.state !== 'completed' ? { ...t, delegatedTo: undefined, activity: [...t.activity, { id: uid(), at: now, kind: 'system' as const, actor: ME, system: { en: 'Delegation cancelled — back in your inbox', ar: 'أُلغي التفويض — عادت إلى صندوقك' } }] } : t.delegatedTo ? { ...t, delegatedTo: undefined } : t)));
    setDelegation(null);
  }, []);

  const api = useMemo<InboxCtx>(() => {
    const countsByView = { 'needs-action': 0, 'in-progress': 0, 'sent-waiting': 0, completed: 0, overdue: 0, all: 0 } as Record<InboxView, number>;
    for (const t of tasks) for (const v of viewOf(t, tasks)) countsByView[v]++;
    const teamCounts = { 'needs-action': 0, 'in-progress': 0, 'sent-waiting': 0, completed: 0, overdue: 0, all: 0 } as Record<InboxView, number>;
    for (const t of tasks) for (const v of teamViewOf(t)) teamCounts[v]++;
    return {
      tasks, me: ME, countsByView,
      tasksForView: (v) => tasks.filter((t) => viewOf(t, tasks).includes(v)),
      getTask: (id) => tasks.find((t) => t.id === id),
      blocked: (t) => isBlocked(t, tasks),
      addComment, resolveComment, updateRfp, setTaskData, decide, setChecklistItem, setField, setCriterion, uploadDoc, resolveCheck,
      notices, markNoticesRead, dismissNotice, markSeen, focusTaskId, focusTask,
      teamCounts, teamTasksForView: (v) => tasks.filter((t) => teamViewOf(t).includes(v)), assignQueued,
      delegation, delegatableIds, delegate, cancelDelegation, persona, setPersona,
    };
  }, [persona, assignQueued, delegation, delegatableIds, delegate, cancelDelegation, tasks, addComment, resolveComment, updateRfp, setTaskData, decide, setChecklistItem, setField, setCriterion, uploadDoc, resolveCheck, notices, markNoticesRead, dismissNotice, markSeen, focusTaskId]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useInbox() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useInbox must be used within InboxProvider');
  return c;
}
