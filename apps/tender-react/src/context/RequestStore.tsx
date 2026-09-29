// Saved tender requests, shared across the team through the artifact's
// database. Falls back to the original sample list when the database is
// not available (e.g. the page is opened outside claude.ai).
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getDb, getUser } from '../lib/claudeRuntime';
import { MOCK_TENDERS, COST_CENTERS, PROJECTS } from '../data/mockData';
import type { TenderDraft, TenderFormData, TenderStatus } from '../types/tender';

export interface SavedRequest extends TenderDraft {
  form?: TenderFormData;
  createdBy?: string | null;
  requestNo?: string;
}

interface StoreCtx {
  /** 'live' = real shared database; 'sample' = read-only example data. */
  mode: 'loading' | 'live' | 'sample';
  requests: SavedRequest[];
  userName: string;
  canWrite: boolean;
  save: (id: string, form: TenderFormData, status: TenderStatus, extra?: Partial<SavedRequest>) => Promise<boolean>;
  get: (id: string) => SavedRequest | undefined;
}

const Ctx = createContext<StoreCtx | null>(null);

export function summarize(form: TenderFormData) {
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const cc = COST_CENTERS.find((x) => x.id === form.costCenterId);
  const subtotal = form.boqItems.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
  const total = subtotal * 1.15;
  return {
    title: (p?.name ?? 'Untitled tender request') + (form.sourceType === 'souq-etimad' ? ' — Etimad Souq' : ''),
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
    if (!db) return false;
    const now = new Date().toISOString();
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

  const get = useCallback((id: string) => requests.find((r) => r.id === id), [requests]);

  return (
    <Ctx.Provider value={{ mode, requests, userName, canWrite, save, get }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRequests() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRequests must be used inside RequestStoreProvider');
  return c;
}
