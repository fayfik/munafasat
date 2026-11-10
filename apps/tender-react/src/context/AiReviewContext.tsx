// State of the AI pre-review for the request being edited. Lives above the steps so a
// recommendation opened with "Fix it" can be shown — and applied — in the step it targets.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { reviewRequest, reviewKey, type AiRec, type Dept } from '../lib/aiReview';
import { useTender, SECTIONS } from './TenderContext';
import { useLanguage } from './LanguageContext';
import type { TenderFormData } from '../types/tender';

export type RecState = 'open' | 'applied' | 'dismissed';
type Phase = 'idle' | 'running' | 'done';

interface Ctx {
  phase: Phase;
  recs: AiRec[];
  state: Record<string, RecState>;
  /** Review is out of date: the request changed since it ran (other than by "Apply it"). */
  stale: boolean;
  start: () => void;
  finish: () => void;
  ensureFresh: () => void;
  activeId: string | null;
  open: (id: string) => void;
  close: () => void;
  apply: (id: string) => void;
  dismiss: (id: string) => void;
  reopen: (id: string) => void;
  tab: Dept | null;
  setTab: (d: Dept) => void;
}

const C = createContext<Ctx | null>(null);

export function AiReviewProvider({ children }: { children: ReactNode }) {
  const { formData, updateField, goToSection } = useTender();
  const { isAr } = useLanguage();
  const [phase, setPhase] = useState<Phase>('idle');
  const [recs, setRecs] = useState<AiRec[]>([]);
  const [state, setState] = useState<Record<string, RecState>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<Dept | null>(null);
  const reviewed = useRef<string | null>(null);
  const appliedSince = useRef(false);
  const fdRef = useRef(formData);
  fdRef.current = formData;

  const start = useCallback(() => {
    const f = fdRef.current;
    setRecs(reviewRequest(f, isAr));
    setState({});
    setTab(null);
    reviewed.current = reviewKey(f);
    appliedSince.current = false;
    setPhase('running');
  }, [isAr]);
  const finish = useCallback(() => setPhase('done'), []);

  /** On opening Review & Confirm: run the first time, re-run when the request changed. */
  const ensureFresh = useCallback(() => {
    const k = reviewKey(fdRef.current);
    if (reviewed.current === null) { start(); return; }
    if (k === reviewed.current) return;
    if (appliedSince.current) { reviewed.current = k; appliedSince.current = false; return; } // our own fixes — keep the list
    start();
  }, [start]);

  const open = useCallback((id: string) => {
    const r = recs.find((x) => x.id === id); if (!r) return;
    setActiveId(id);
    setTab(r.dept);
    goToSection(SECTIONS.findIndex((s) => s.id === r.section));
  }, [recs, goToSection]);
  const close = useCallback(() => setActiveId(null), []);
  const apply = useCallback((id: string) => {
    const r = recs.find((x) => x.id === id); if (!r?.apply) return;
    const patch = r.apply(fdRef.current);
    (Object.keys(patch) as (keyof TenderFormData)[]).forEach((k) => updateField(k, patch[k] as never));
    appliedSince.current = true;
    setState((s) => ({ ...s, [id]: 'applied' }));
  }, [recs, updateField]);
  const dismiss = useCallback((id: string) => setState((s) => ({ ...s, [id]: 'dismissed' })), []);
  const reopen = useCallback((id: string) => setState((s) => { const n = { ...s }; delete n[id]; return n; }), []);

  const stale = reviewed.current !== null && phase === 'done' && !appliedSince.current && reviewKey(formData) !== reviewed.current;
  const value = useMemo<Ctx>(() => ({ phase, recs, state, stale, start, finish, ensureFresh, activeId, open, close, apply, dismiss, reopen, tab, setTab }),
    [phase, recs, state, stale, start, finish, ensureFresh, activeId, open, close, apply, dismiss, reopen, tab]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAiReview() {
  const v = useContext(C);
  if (!v) throw new Error('useAiReview outside AiReviewProvider');
  return v;
}
