import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Btn, Tooltip } from '../components/ui.jsx';
import { FormCtx, Dialog } from '../components/FormKit.jsx';
import { useRequests, emptyForm } from '../state/requests.jsx';
import { useActor } from '../state/actor.jsx';
import { PROJECTS } from '../data/newRequest.js';
import { visibleSteps, sectionStatus, qualityIssues, blockers, uid } from '../lib/requestRules.js';
import { RouteStep } from '../steps/RouteStep.jsx';
import { SetupStep } from '../steps/SetupStep.jsx';
import { ScopeStep } from '../steps/ScopeStep.jsx';
import { BoqStep } from '../steps/BoqStep.jsx';
import { PaymentStep } from '../steps/PaymentStep.jsx';
import { TechStep } from '../steps/TechStep.jsx';
import { QualStep } from '../steps/QualStep.jsx';
import { AttachmentsStep } from '../steps/AttachmentsStep.jsx';
import { ReviewStep, SubmittedScreen } from '../steps/ReviewStep.jsx';

const BODIES = { route: RouteStep, setup: SetupStep, scope: ScopeStep, boq: BoqStep, payment: PaymentStep, tech: TechStep, qual: QualStep, attachments: AttachmentsStep, review: ReviewStep };
const time = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function NewRequest({ id, onExit, onOpen }) {
  const store = useRequests();
  const { actor } = useActor();
  const saved = id ? store.get(id) : null;
  const [reqId] = useState(() => id || uid());
  const [f, setF] = useState(() => (saved ? { ...emptyForm(), ...saved.form } : emptyForm()));
  const [routeConfirmed, setRouteConfirmed] = useState(() => !!saved?.routeConfirmed);
  const [step, setStep] = useState(() => saved?.step || 'route');
  const [savedAt, setSavedAt] = useState(saved?.updatedAt || null);
  const [gate, setGate] = useState(null);
  const [submitted, setSubmitted] = useState(saved?.status === 'submitted' ? saved : null);
  const dirty = useRef(false);
  const scroller = useRef(null);

  // Autosave (debounced) once the requester has started.
  useEffect(() => {
    if (!dirty.current) return;
    const h = setTimeout(() => {
      const p = PROJECTS.find((x) => x.id === f.projectId);
      store.save(reqId, { form: f, routeConfirmed, step, title: p?.name || 'Untitled request', type: f.sourceType, createdBy: saved?.createdBy || actor.id });
      setSavedAt(new Date().toISOString());
      if (!id) history.replaceState(null, '', `#/requests/${reqId}`);
    }, 700);
    return () => clearTimeout(h);
  }, [f, routeConfirmed, step]);

  const set = useCallback((k, v) => { dirty.current = true; setF((p) => ({ ...p, [k]: typeof v === 'function' ? v(p[k]) : v })); }, []);
  const patch = useCallback((o) => { dirty.current = true; setF((p) => ({ ...p, ...(typeof o === 'function' ? o(p) : o) })); }, []);
  const list = useCallback((k) => ({
    add: (row) => set(k, (xs) => [...xs, { id: uid(), ...row }]),
    addMany: (rows) => set(k, (xs) => [...xs, ...rows.map((r) => ({ id: uid(), ...r }))]),
    update: (rid, p) => set(k, (xs) => xs.map((r) => (r.id === rid ? { ...r, ...p } : r))),
    remove: (rid) => set(k, (xs) => xs.filter((r) => r.id !== rid)),
    move: (rid, dir) => set(k, (xs) => { const i = xs.findIndex((r) => r.id === rid); const j = i + dir; if (i < 0 || j < 0 || j >= xs.length) return xs; const n = [...xs]; [n[i], n[j]] = [n[j], n[i]]; return n; }),
    clear: () => set(k, []),
  }), [set]);

  const steps = visibleSteps(f, routeConfirmed);
  const pos = Math.max(0, steps.findIndex((s) => s.id === step));
  const cur = steps[pos] || steps[0];
  const em = routeConfirmed && f.sourceType === 'emarket';

  const goto = useCallback((sid) => {
    dirty.current = true;
    const run = () => setStep(sid);
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(run); else run();
    scroller.current?.scrollTo({ top: 0 });
  }, []);

  const confirmRoute = useCallback((o) => {
    const p = PROJECTS.find((x) => x.id === o.projectId);
    patch((prev) => ({
      sourceType: o.sourceType, projectId: o.projectId, costCenterId: p?.costCenterId || prev.costCenterId,
      selectedItemIds: o.itemIds, freeItems: o.freeItems ?? prev.freeItems ?? [], routeChoice: o.choice, routeJustification: o.justification || '', justifiedItems: o.justifiedItems || [],
      movedToDraft: o.movedToDraft || null, purpose: prev.purpose || p?.purpose || '',
    }));
    if (o.movedToDraft) {
      const did = uid();
      store.save(did, { createdBy: actor.id, title: `${p?.name || 'Request'} — moved items`, type: o.movedToDraft.route, status: 'draft', routeConfirmed: false, step: 'route', form: { ...emptyForm(), projectId: o.projectId, sourceType: o.movedToDraft.route, selectedItemIds: o.movedToDraft.ids || [], routeChoice: o.movedToDraft.route === 'emarket' ? 'emarket' : 'tender' }, moved: o.movedToDraft.names });
    }
    setRouteConfirmed(true);
    goto('setup');
  }, [patch, goto, store]);

  const next = () => {
    const issues = qualityIssues(cur.id, f);
    if (issues.length) { setGate(issues); return; }
    goto(steps[pos + 1].id);
  };
  const back = () => goto(steps[Math.max(0, pos - 1)].id);
  const saveNow = () => { dirty.current = true; setF((p) => ({ ...p })); };

  const submit = () => {
    const d = new Date();
    const requestNo = `${em ? 'PR' : 'TEN'}-${d.getFullYear()}-${reqId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const p = PROJECTS.find((x) => x.id === f.projectId);
    const rec = { form: f, routeConfirmed, step, status: 'submitted', createdBy: saved?.createdBy || actor.id, requestNo, submittedAt: d.toISOString(), title: p?.name || 'Request', type: f.sourceType };
    store.save(reqId, rec);
    setSubmitted({ ...rec, id: reqId });
  };

  const ctx = useMemo(() => ({ f, set, patch, list, routeConfirmed, confirmRoute, goto, em, reqId, scroller }), [f, set, patch, list, routeConfirmed, confirmRoute, goto, em, reqId]);
  const project = PROJECTS.find((x) => x.id === f.projectId);
  const doneCount = steps.filter((s) => s.id !== 'review' && sectionStatus(s.id, f, routeConfirmed) === 'done').length;
  const countable = steps.filter((s) => s.id !== 'review').length;
  const Body = BODIES[cur.id];
  const title = project?.name || (em ? 'New purchase request' : 'New request');
  const bl = cur.id === 'review' ? blockers(f, routeConfirmed) : [];
  const stepTitle = cur.id === 'setup' && em ? cur.emTitle : cur.title;

  if (submitted) return <SubmittedScreen rec={submitted} project={project} onExit={onExit} onView={() => setSubmitted(null)} />;

  return (
    <FormCtx.Provider value={ctx}>
      <main className="detail standalone req-form" aria-labelledby="req-step-title">
        <div className="crumbs req-crumbs">
          <button type="button" className="back-btn" aria-label="Back to My requests" onClick={onExit}><Icon name="icon-arrow-left" size={18} /></button>
          <nav aria-label="Breadcrumb"><ol className="t-body-small">
            <li><a href="#/requests" onClick={(e) => { e.preventDefault(); onExit(); }}>My requests</a></li>
            <li aria-current="page" className="crumb-title" title={title}>{title}</li>
          </ol></nav>
          <span className="status-pill t-caption-medium draft-pill"><span className="pill-dot" />Draft</span>
          {routeConfirmed && <span className="tag">{em ? 'E-Market' : 'Tender'}</span>}
          <span className="save-state t-caption muted" aria-live="polite">{savedAt ? <><Icon name="icon-check" size={12} />Saved {time(savedAt)}</> : 'Not saved yet'}</span>
        </div>

        <div className="req-body">
          <aside className="req-rail" aria-label="Request steps">
            <div className="rail-progress">
              <div className="t-caption muted">{doneCount} of {countable} complete</div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${(doneCount / countable) * 100}%` }} /></div>
            </div>
            <ol className="rail-steps">
              {(routeConfirmed ? steps : steps.slice(0, 1)).map((s, i) => {
                const st = s.id === cur.id ? 'current' : sectionStatus(s.id, f, routeConfirmed);
                return (
                  <li key={s.id}>
                    <button type="button" className={`rail-step ${st}`} aria-current={s.id === cur.id ? 'step' : undefined} onClick={() => goto(s.id)}>
                      <span className="rail-dot" aria-hidden="true">{st === 'done' ? <Icon name="icon-check-white" size={11} /> : i + 1}</span>
                      <span className="rail-text">
                        <span className="t-body-small rail-title">{s.id === 'setup' && em ? s.emTitle : s.title}</span>
                        {st === 'missing' && <span className="t-caption rail-note">Needs attention</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!routeConfirmed && (
                <li><div className="rail-step pending"><span className="rail-dot dashed" aria-hidden="true" /><span className="rail-text"><span className="t-body-small rail-title">Remaining steps</span><span className="t-caption muted">Appear once the route is confirmed</span></span></div></li>
              )}
            </ol>
          </aside>

          <div className="req-scroll" ref={scroller}>
            <div className="req-content" key={cur.id}>
              <div className="req-head">
                <div className="t-caption muted">Step {pos + 1} of {steps.length}</div>
                <div className="title">
                  <h1 className="t-display" id="req-step-title">{stepTitle}</h1>
                  <Tooltip text={cur.desc} label="About this step" />
                </div>
              </div>
              <Body />
            </div>
            {cur.id !== 'route' && (
              <div className="req-foot">
                <Btn variant="ghost" icon="icon-arrow-left" onClick={back}>Back</Btn>
                <span className="grow" />
                <Btn variant="secondary" onClick={saveNow}>Save draft</Btn>
                {cur.id !== 'review'
                  ? <Btn variant="primary" onClick={next}>Continue<Icon name="icon-arrow-right" size={16} className="invert" /></Btn>
                  : <span className="gate-wrap" title={bl.length ? 'Fix the items above first' : undefined}><Btn variant="primary" icon="icon-approve" disabled={bl.length > 0} onClick={submit}>Submit request</Btn></span>}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={!!gate} onClose={() => setGate(null)} title="Add more detail before you continue" sub="As it stands, this step is likely to be returned by a reviewer. Fixing it now saves a review round."
        foot={<><Btn variant="ghost" onClick={() => { setGate(null); goto(steps[pos + 1].id); }}>Continue anyway</Btn><Btn variant="primary" onClick={() => { const fid = gate?.[0]?.field; setGate(null); setTimeout(() => { const el = document.getElementById(fid); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.querySelector('input,textarea,select,button')?.focus({ preventScroll: true }); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 1400); }, 60); }}>Fix now</Btn></>}>
        <ul className="gate-list">
          {gate?.map((g) => (
            <li key={g.id}>
              <Icon name="icon-warn" size={16} />
              <div><div className="t-body-medium">{g.en}</div><div className="t-body-small muted">{g.why}</div>{g.meta && <div className="t-caption muted" style={{ marginTop: 2 }}>{g.meta}</div>}</div>
            </li>
          ))}
        </ul>
      </Dialog>
    </FormCtx.Provider>
  );
}
