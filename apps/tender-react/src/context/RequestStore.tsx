// Saved tender requests, shared across the team through the artifact's
// database. Falls back to the original sample list when the database is
// not available (e.g. the page is opened outside claude.ai).
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode, useRef } from 'react';
import { getDb, getUser } from '../lib/claudeRuntime';
import { MOCK_TENDERS, ALL_COST_CENTERS, PROJECTS } from '../data/mockData';
import type { TenderDraft, TenderFormData, TenderStatus } from '../types/tender';

export interface SavedRequest extends TenderDraft {
  form?: TenderFormData;
  createdBy?: string | null;
  requestNo?: string;
  /** Help me decide (manual): where the Procurement route check stands. */
  routeCheckStatus?: 'with-procurement' | 'replied' | 'needs-detail';
  /** Set on a request that was split out of another one (route check or Etimad review). */
  linkedFrom?: { id: string; title: string; why: 'route-split' | 'etimad-review' };
  submittedAt?: string;
  /** Procurement's Etimad E-Market review of a submitted tender (manual build). */
  etimadReview?: { outcome: 'pending' | 'confirmed' | 'moved' | 'returned'; at?: string; note?: string; movedCount?: number };
}

interface StoreCtx {
  /** 'live' = real shared database; 'sample' = read-only example data. */
  mode: 'loading' | 'live' | 'sample';
  requests: SavedRequest[];
  userName: string;
  canWrite: boolean;
  save: (id: string, form: TenderFormData, status: TenderStatus, extra?: Partial<SavedRequest>) => Promise<boolean>;
  get: (id: string) => SavedRequest | undefined;
  /** Adds a draft request for this browser session only (e.g. items moved out of a request in step 1). */
  addSessionDraft: (draft: Omit<TenderDraft, 'id' | 'createdAt' | 'updatedAt' | 'status'> & Pick<SavedRequest, 'routeCheckStatus' | 'linkedFrom'>, form?: TenderFormData, id?: string) => string;
  /** Changes a session draft in place (e.g. its route-check status or saved form). */
  updateSessionDraft: (id: string, patch: Partial<SavedRequest>) => void;
  removeSessionDraft: (id: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function summarize(form: TenderFormData) {
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const cc = ALL_COST_CENTERS.find((x) => x.id === form.costCenterId);
  const subtotal = form.boqItems.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
  const total = subtotal * 1.15;
  return {
    title: (p?.name ?? 'Untitled tender request') + (form.sourceType === 'souq-etimad' ? ' — Etimad E-Market' : ''),
    department: cc?.name ?? '—',
    budget: total > 0 ? `SAR ${Math.round(total).toLocaleString('en-US')}` : '—',
    type: form.sourceType,
  };
}

export function RequestStoreProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<StoreCtx['mode']>('loading');
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(true);
  const [sessionDrafts, setSessionDrafts] = useState<SavedRequest[]>([]);
  const sessionDraftsRef = useRef<SavedRequest[]>([]);
  sessionDraftsRef.current = sessionDrafts;

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [db, user] = await Promise.all([getDb(), getUser()]);
      if (cancelled) return;
      if (user) {
        try {
          const me = await user.me();
          if (!cancelled) { setUserName(me?.name || ''); setUserId(me?.id ?? null); }
          const w = await user.can('data.write');
          if (!cancelled && w === false) setCanWrite(false);
        } catch { /* identity is optional */ }
      }
      if (!db) { setMode('sample'); setRequests(MOCK_TENDERS); return; }
      setMode('live');
      unsub = db.collection('tenders').orderBy('updatedAt', 'desc').limit(200).onSnapshot(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (snap: any) => setRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as SavedRequest)),
        () => { /* subscription ended; keep last list */ },
      );
    })();
    return () => { cancelled = true; unsub?.(); };
  }, []);

  const save = useCallback<StoreCtx['save']>(async (id, form, status, extra = {}) => {
    const db = await getDb();
    const now = new Date().toISOString();
    if (!db) {
      // Sample mode (no shared database): keep the request for this browser session so it shows in My Requests.
      const prev = justAdded.current.find((r) => r.id === id) ?? sessionDraftsRef.current.find((r) => r.id === id);
      const rec = { ...(prev ?? {}), ...summarize(form), id, status, form, createdAt: prev?.createdAt ?? now, updatedAt: now, ...extra } as SavedRequest;
      if (form.routeCheck == null) delete rec.routeCheckStatus;
      justAdded.current = [rec, ...justAdded.current.filter((r) => r.id !== id)];
      setSessionDrafts((xs) => [rec, ...xs.filter((r) => r.id !== id)]);
      return true;
    }
    const existing = requests.find((r) => r.id === id);
    const body = {
      ...summarize(form),
      status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      createdBy: existing?.createdBy ?? userId,
      requestNo: existing?.requestNo ?? extra.requestNo ?? '',
      form,
      ...extra,
    };
    try {
      await db.doc(`tenders/${id}`).set(JSON.parse(JSON.stringify(body)));
      return true;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any)?.code === 'invalid_argument') setCanWrite(false);
      return false;
    }
  }, [requests, userId]);

  const allRequests = sessionDrafts.length ? [...sessionDrafts, ...requests] : requests;
  // Drafts added in this same event aren't in state yet; the ref lets get() see them at once.
  const justAdded = useRef<SavedRequest[]>([]);
  const get = useCallback((id: string) => allRequests.find((r) => r.id === id) ?? justAdded.current.find((r) => r.id === id), [allRequests]);
  const addSessionDraft = useCallback<StoreCtx['addSessionDraft']>((draft, form, givenId) => {
    const now = new Date().toISOString();
    const id = givenId ?? `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    // With a form attached, the draft opens with its project and items already filled in.
    const rec = { ...draft, id, status: 'draft', createdAt: now, updatedAt: now, ...(form ? { form } : {}) } as SavedRequest;
    justAdded.current = [rec, ...justAdded.current.filter((r) => r.id !== id)];
    setSessionDrafts((xs) => [rec, ...xs.filter((r) => r.id !== id)]);
    return id;
  }, []);
  const updateSessionDraft = useCallback<StoreCtx['updateSessionDraft']>((id, p) => {
    const now = new Date().toISOString();
    const withBudget = (r: SavedRequest) => ({ ...r, ...p, ...(p.form ? { budget: summarize(p.form).budget } : {}), updatedAt: now });
    justAdded.current = justAdded.current.map((r) => (r.id === id ? withBudget(r) : r));
    setSessionDrafts((xs) => xs.map((r) => (r.id === id ? withBudget(r) : r)));
  }, []);
  const removeSessionDraft = useCallback((id: string) => {
    justAdded.current = justAdded.current.filter((r) => r.id !== id);
    setSessionDrafts((xs) => xs.filter((r) => r.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ mode, requests: allRequests, userName, canWrite, save, get, addSessionDraft, updateSessionDraft, removeSessionDraft }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRequests() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRequests must be used inside RequestStoreProvider');
  return c;
}
