// Munafasat Inbox — in-memory task store (mock Work Engine / Task APIs).
// Deterministic, frontend-only. Commands mutate local state and append audit
// activity; nothing is persisted or sent to SAP. A real deployment would back
// these with the Task Command / Workflow / Audit services.

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { SEED_TASKS, ME } from './data';
import type { Task, InboxView, ChecklistItem, CollectField, EvalCriterion, Bilingual, ActivityEntry, EtimadReviewItem, RouteCheckItem } from './types';

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
  } else if (task.type === 'etimad-review' && task.etimadItems) {
    for (const it of task.etimadItems) {
      total++;
      if (it.verdict === 'confirmed' || (it.verdict === 'on-etimad' && (it.note ?? '').trim())) done++;
      else missing.push({ en: it.name, ar: it.name });
    }
  } else if (task.type === 'route-check' && task.routeItems) {
    for (const it of task.routeItems) {
      total++;
      if (it.verdict === 'off' || (it.verdict === 'on' && it.match)) done++;
      else missing.push({ en: it.name, ar: it.name });
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
export function viewOf(task: Task, all: Task[]): InboxView[] {
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

// ── Context ─────────────────────────────────────────────────────────────────────
interface InboxCtx {
  tasks: Task[];
  me: typeof ME;
  countsByView: Record<InboxView, number>;
  tasksForView: (v: InboxView) => Task[];
  getTask: (id: string) => Task | undefined;
  blocked: (t: Task) => boolean;
  // commands
  addComment: (id: string, text: string) => void;
  decide: (id: string, action: 'approve' | 'reject' | 'return' | 'request-clarification' | 'complete' | 'submit' | 'save-draft', note?: string, decisionLabel?: Bilingual) => void;
  setChecklistItem: (id: string, itemId: string, patch: Partial<ChecklistItem>) => void;
  setField: (id: string, fieldId: string, value: CollectField['value']) => void;
  setCriterion: (id: string, critId: string, patch: Partial<EvalCriterion>) => void;
  uploadDoc: (id: string, docId: string, fileName: string) => void;
  resolveCheck: (id: string, checkId: string) => void;
  addTask: (task: Task) => void;
  setEtimadItem: (id: string, itemId: string, patch: Partial<EtimadReviewItem>) => void;
  /** Procurement's outcome on an Etimad review: accept all, return to the requester, or move flagged items out. */
  finishEtimadReview: (id: string, outcome: 'accept' | 'return' | 'move', note?: string) => void;
  setRouteItem: (id: string, itemId: string, patch: Partial<RouteCheckItem>) => void;
  /** Procurement's outcome on a "Help me decide" route check: reply with their Etimad answers, or ask for more detail. */
  finishRouteCheck: (id: string, outcome: 'reply' | 'ask', note?: string) => void;
  /** The requester withdrew the request before Procurement replied. */
  withdrawTask: (id: string) => void;
}

const Ctx = createContext<InboxCtx | null>(null);

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `a_${Math.random().toString(36).slice(2)}`);

export function InboxProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => SEED_TASKS.map((t) => ({ ...t })));

  const patch = useCallback((id: string, fn: (t: Task) => Task) => {
    setTasks((xs) => xs.map((t) => (t.id === id ? fn({ ...t }) : t)));
  }, []);

  const logActivity = (t: Task, entry: Omit<ActivityEntry, 'id' | 'at'> & { at?: string }): Task =>
    ({ ...t, activity: [...t.activity, { id: uid(), at: new Date().toISOString(), ...entry }] });

  const addComment = useCallback((id: string, text: string) => {
    if (!text.trim()) return;
    patch(id, (t) => logActivity(t, { kind: 'comment', actor: ME, text: text.trim() }));
  }, [patch]);

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

  const addTask = useCallback((task: Task) => {
    // Same id again (e.g. a request re-sent after Procurement asked for detail) replaces the old task.
    setTasks((xs) => [task, ...xs.filter((t) => t.id !== task.id)]);
  }, []);

  const setEtimadItem = useCallback((id: string, itemId: string, p: Partial<EtimadReviewItem>) => {
    patch(id, (t) => ({
      ...t,
      state: t.state === 'available' ? 'in-progress' : t.state,
      etimadItems: t.etimadItems?.map((it) => (it.id === itemId ? { ...it, ...p } : it)),
    }));
  }, [patch]);

  const finishEtimadReview = useCallback<InboxCtx['finishEtimadReview']>((id, outcome, note) => {
    const label: Record<typeof outcome, Bilingual> = {
      accept: { en: 'Etimad answers confirmed', ar: 'تم تأكيد إجابات اعتماد' },
      return: { en: 'Returned to requester — Etimad answers to correct', ar: 'أُعيد إلى مقدم الطلب — إجابات اعتماد تحتاج تصحيحاً' },
      move: { en: 'Flagged items moved to an Etimad E-Market draft', ar: 'نُقلت البنود المحددة إلى مسودة سوق اعتماد' },
    };
    patch(id, (t) => {
      const now = new Date().toISOString();
      const entry: ActivityEntry = { id: uid(), at: now, kind: 'decision', actor: ME, decision: label[outcome], text: note?.trim() || undefined };
      if (outcome === 'return') {
        // Back with the requester: it leaves my queue and waits for their correction.
        return { ...t, state: 'waiting', mineAction: false, initiatedByMe: true, decision: label[outcome], activity: [...t.activity, entry],
          stageEn: 'Returned to requester', stageAr: 'أُعيد إلى مقدم الطلب' };
      }
      return { ...t, state: 'completed', decision: label[outcome], completedAt: now, activity: [...t.activity, entry],
        stageEn: 'Etimad review complete', stageAr: 'اكتملت مراجعة اعتماد' };
    });
  }, [patch]);

  const setRouteItem = useCallback((id: string, itemId: string, p: Partial<RouteCheckItem>) => {
    patch(id, (t) => ({
      ...t,
      state: t.state === 'available' ? 'in-progress' : t.state,
      routeItems: t.routeItems?.map((it) => (it.id === itemId ? { ...it, ...p } : it)),
    }));
  }, [patch]);

  const finishRouteCheck = useCallback<InboxCtx['finishRouteCheck']>((id, outcome, note) => {
    const label: Bilingual = outcome === 'reply'
      ? { en: 'Etimad answers sent to the requester', ar: 'أُرسلت إجابات اعتماد إلى مقدم الطلب' }
      : { en: 'Asked the requester for more detail', ar: 'طُلب من مقدم الطلب مزيد من التفاصيل' };
    patch(id, (t) => {
      const now = new Date().toISOString();
      const entry: ActivityEntry = { id: uid(), at: now, kind: 'decision', actor: ME, decision: label, text: note?.trim() || undefined };
      const base = { ...t, decision: label, replyNote: note?.trim() || undefined, activity: [...t.activity, entry] };
      if (outcome === 'ask') {
        return { ...base, state: 'waiting', mineAction: false, initiatedByMe: true, stageEn: 'With the requester — more detail needed', stageAr: 'لدى مقدم الطلب — مطلوب مزيد من التفاصيل' };
      }
      return { ...base, state: 'completed', completedAt: now, stageEn: 'Answered — requester chooses the route', stageAr: 'تم الرد — يختار مقدم الطلب المسار' };
    });
  }, [patch]);

  const withdrawTask = useCallback((id: string) => {
    patch(id, (t) => ({ ...t, state: 'cancelled', mineAction: false, stageEn: 'Withdrawn by the requester', stageAr: 'سحبه مقدم الطلب',
      activity: [...t.activity, { id: uid(), at: new Date().toISOString(), kind: 'system', actor: t.requester, system: { en: 'Withdrawn by the requester', ar: 'سحبه مقدم الطلب' } }] }));
  }, [patch]);

  const decide = useCallback<InboxCtx['decide']>((id, action, note, decisionLabel) => {
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
        else if (action === 'return') state = 'returned';
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
  }, []);

  const api = useMemo<InboxCtx>(() => {
    const countsByView = { 'needs-action': 0, 'in-progress': 0, 'sent-waiting': 0, completed: 0, overdue: 0, all: 0 } as Record<InboxView, number>;
    for (const t of tasks) for (const v of viewOf(t, tasks)) countsByView[v]++;
    return {
      tasks, me: ME, countsByView,
      tasksForView: (v) => tasks.filter((t) => viewOf(t, tasks).includes(v)),
      getTask: (id) => tasks.find((t) => t.id === id),
      blocked: (t) => isBlocked(t, tasks),
      addComment, decide, setChecklistItem, setField, setCriterion, uploadDoc, resolveCheck,
      addTask, setEtimadItem, finishEtimadReview, setRouteItem, finishRouteCheck, withdrawTask,
    };
  }, [tasks, addComment, decide, setChecklistItem, setField, setCriterion, uploadDoc, resolveCheck, addTask, setEtimadItem, finishEtimadReview, setRouteItem, finishRouteCheck, withdrawTask]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useInbox() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useInbox must be used within InboxProvider');
  return c;
}
