import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Btn, Segment, Tooltip } from './ui.jsx';
import { TaskCtx } from './ReviewKit.jsx';
import { RequestDetails } from './RequestDetails.jsx';
import { Activity, SidePanel, DecisionDialog } from './Panels.jsx';
import { useStore, useReview } from '../state/store.jsx';
import { REQUESTS, sar } from '../data/requests.js';
import { ACTION_PAST, TASKS } from '../data/tasks.js';
import { useActor } from '../state/actor.jsx';
import { actorById } from '../data/actors.js';
import { DeptApproval, DoaApproval, EstimatedPrice } from '../tasks/Approvals.jsx';
import { FinQual, TlMethod, OfficerConfirm, EtimadCreate, EtimadBanner } from '../tasks/Procurement.jsx';
import { useQueue, QueueBar, AssignDialog } from './Queue.jsx';
import { TechEval, Specialist, EaReview, Qualification, ProcQualification } from '../tasks/Reviews.jsx';
import { GlReview, GlChanged, AssetTreatment } from '../tasks/Finance.jsx';
import { AiCard, AiSpark, AiTag } from './AiKit.jsx';
import { executiveSummary } from '../data/aiContent.js';

const BODIES = { dept: DeptApproval, tech: TechEval, cyber: Specialist, bcm: Specialist, orm: Specialist, ea: EaReview, gl: GlReview, glchanged: GlChanged, assets: AssetTreatment, qual: Qualification, finqual: FinQual, procqual: ProcQualification, method: TlMethod, confirm: OfficerConfirm, doa: DoaApproval, price: EstimatedPrice, etimad: EtimadCreate };
const STATUS = { dept: 'Pending your decision', doa: 'Pending your decision', price: 'Pending your decision', method: 'Pending your decision', etimad: 'Ready to publish', glchanged: 'Changed after approval' };

export function TaskDetail({ task, onComplete, panel, setPanel, onPickedUp }) {
  const { state, dispatch } = useStore();
  const { actor } = useActor();
  const request = REQUESTS[task.req];
  const review = useReview(task.id);
  const [tab, setTab] = useState('action');
  const [commenting, setCommenting] = useState(false);
  const [gates, setGates] = useState({});
  const [actionsOverride, setActions] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const scroller = useRef(null);
  const done = state.done[task.id];
  const q = useQueue(task);
  const [assigning, setAssigning] = useState(false);
  const readOnly = !!done || !q.mine;
  // The TL's officer choice assigns the officer's review and the Etimad step of this request.
  const handOff = () => {
    const off = state.rfp[request.id]?.method?.officer;
    if (task.type !== 'method' || !off) return;
    TASKS.filter((t) => t.req === request.id && ['officer', 'etimad'].includes(t.step)).forEach((t) => dispatch({ type: 'assign', task: t.id, to: off, text: `Assigned to ${actorById(off).name} by ${actor.name.split(' ')[0]} (team lead) with the procurement method` }));
  };
  const pickUp = () => { q.pickUp(); if (!q.lead) onPickedUp?.(); };

  useEffect(() => { dispatch({ type: 'read', task: task.id }); }, [task.id]);

  const comment = (anchor, text) => dispatch({ type: 'comment', req: request.id, author: actor, text, anchor });
  const openDetails = (on) => { setTab('details'); setCommenting(on); scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openComments = (replyId) => { setPanel({ open: true, view: 'comments' }); if (replyId) setReplyTo((state.comments[request.id] || []).find((c) => c.id === replyId) || null); };
  const gotoAnchor = (anchor) => {
    const inDetails = /^(f-|sec-|boq-|pay-|te-|q-)/.test(anchor.id) && !document.querySelector(`[data-key="${anchor.id}"]`);
    if (inDetails) setTab('details');
    else setTab('action');
    setTimeout(() => {
      const el = document.querySelector(`[data-key="${anchor.id}"]`) || document.querySelector(`[data-anchor="${anchor.id}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400);
    }, 80);
  };

  const ctx = useMemo(() => ({ task, request, review, comment, setGates, setActions, openDetails, openComments, commenting, store: state }), [task, request, review, state, commenting]);
  const actions = actionsOverride || task.actions;
  const Body = BODIES[task.type];
  const officerName = state.rfp[request.id]?.method?.officer ? actorById(state.rfp[request.id].method.officer).name : undefined;

  const statusLabel = done ? ACTION_PAST[done.action].replace(/^./, (c) => c.toUpperCase())
    : q.queued ? 'In team queue' : !q.mine ? `With ${actorById(q.holder).name.split(' ')[0]}`
    : (STATUS[task.type] || (review.extra.reopened ? 'In review' : 'Pending your review'));

  return (
    <TaskCtx.Provider value={ctx}>
      <main className="detail" aria-labelledby="task-title">
        <div className="detail-scroll" ref={scroller}>
          <div className="detail-header">
            <div className="eyebrow">
              <span className="t-label" style={{ color: 'var(--brand-700)' }}>{task.title}</span>
              <span className="t-body-small muted">· {request.id}</span>
              <span className={`status-pill t-caption-medium${done ? ' done' : ''}${q.queued ? ' queued' : ''}`}><span className="pill-dot" />{statusLabel}</span>
            </div>
            <div className="title-row">
              <div className="title">
                <h1 className="t-display" id="task-title">{request.project}</h1>
                <Tooltip text={task.hint} label="About this task" />
              </div>
              <div className="decision">
                {q.queued && !done ? (
                  <>
                    {q.lead && <Btn variant="secondary" onClick={() => setAssigning(true)}>Assign</Btn>}
                    <Btn variant="primary" icon="icon-approve" onClick={pickUp} data-pickup>Pick up</Btn>
                  </>
                ) : !q.mine ? null : actions.map((a) => {
                  const g = gates[a.id];
                  const blocked = done || (typeof g === 'string');
                  return (
                    <span key={a.id} className="gate-wrap" title={!done && typeof g === 'string' ? g : undefined}>
                      <Btn variant={a.variant} disabled={blocked} icon={a.id === 'approve' ? 'icon-approve' : a.id === 'return' ? 'icon-return' : undefined} onClick={() => setDialog(a)}>{a.label}</Btn>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="props">
              <div className="props-col">
                <div className="prop"><div className="prop-key t-body-small"><Icon name="icon-cash" size={16} />Amount</div><div className="prop-value"><span className="t-body-medium">{sar(request.amount)}</span><span className="t-body-small muted">{sar(request.amountVat)} (incl. VAT)</span></div></div>
                <div className="prop"><div className="prop-key t-body-small"><Icon name="icon-clock" size={16} />Due</div><div className="prop-value"><span className="t-body">{task.due}</span><span className={task.hours <= 24 ? 't-label amber' : 't-body-small muted'}>{task.left}</span></div></div>
              </div>
              <div className="props-col">
                <div className="prop"><div className="prop-key t-body-small"><Icon name="icon-user" size={16} />Requester</div><div className="prop-value"><span className="person-chip"><span className="avatar t-micro">{request.requester.initials}</span><span className="t-body">{request.requester.name}</span></span><span className="t-body-small muted">{request.requester.dept}</span></div></div>
                <div className="prop"><div className="prop-key t-body-small"><Icon name="icon-route" size={16} />Route</div><div className="prop-value"><span className="t-body">{request.route}</span><span className="t-body-small muted">{request.costCenter}</span></div></div>
              </div>
            </div>
          </div>

          <div className="content">
            <EtimadBanner req={request.id} />
            {!done && <QueueBar q={q} onAssign={() => setAssigning(true)} />}
            <Segment label="Task sections" value={tab} onChange={(v) => { setTab(v); if (v !== 'details') setCommenting(false); }} items={[{ id: 'action', label: 'Required action' }, { id: 'details', label: 'Request details' }, { id: 'activity', label: 'Activity' }]} />
            {done && (
              <div className="banner done-banner">
                <Icon name="icon-check" size={16} />
                <div className="banner-text"><div className="t-body-medium">You {ACTION_PAST[done.action]} this on {done.at}</div>{done.note && <div className="t-body-small">“{done.note}”</div>}</div>
                <button type="button" className="link-btn" onClick={() => dispatch({ type: 'undo', task: task.id })}>Undo</button>
              </div>
            )}
            <div className="panel" key={tab} role="tabpanel">
              {tab === 'action' && <><ExecSummary request={request} type={task.type} /><fieldset className="plain-fieldset" disabled={readOnly}><Body /></fieldset></>}
              {tab === 'details' && <RequestDetails />}
              {tab === 'activity' && <Activity task={task} request={request} />}
            </div>
          </div>
        </div>
      </main>

      <SidePanel open={panel.open} view={panel.view} setView={(v) => setPanel({ open: true, view: v })} onClose={() => setPanel({ ...panel, open: false })}
        task={task} request={request} replyTo={replyTo} setReplyTo={setReplyTo} onGoto={gotoAnchor} />

      <aside className="util-rail" aria-label="Task tools">
        {[['comments', 'Comments', 'rail-comments'], ['process', 'Process', 'rail-history']].map(([v, label, icon]) => {
          const n = v === 'comments' ? (state.comments[request.id] || []).reduce((a, c) => a + 1 + (c.replies?.length || 0), 0) : 0;
          const on = panel.open && panel.view === v;
          return (
            <button key={v} className="util-btn" type="button" aria-label={label} title={label} aria-expanded={on} aria-controls="side-panel"
              onClick={() => setPanel(on ? { ...panel, open: false } : { open: true, view: v })}>
              <Icon name={icon} size={20} />{n > 0 && <span className="util-badge" key={n}>{n}</span>}
            </button>
          );
        })}
      </aside>

      {q.team && <AssignDialog q={q} open={assigning} onClose={() => setAssigning(false)} />}

      {dialog && (
        <DecisionDialog action={dialog} task={task} request={request} officer={officerName} onClose={() => setDialog(null)}
          onConfirm={(note) => { setDialog(null); handOff(); onComplete(task, dialog, note); }} />
      )}
    </TaskCtx.Provider>
  );
}

/** AI executive summary of the request, tailored to what this reviewer decides. */
function ExecSummary({ request, type }) {
  const [open, setOpen] = useState(true);
  const [v, setV] = useState(0);
  const [busy, setBusy] = useState(false);
  const regen = () => { setBusy(true); setTimeout(() => { setV((x) => x + 1); setBusy(false); }, 900); };
  const lines = executiveSummary(request, type, v);
  return (
    <AiCard className="exec-summary" title="AI executive summary"
      right={<span className="row-gap" style={{ gap: 12 }}>
        {open && <button type="button" className="ai-link" onClick={regen} disabled={busy}>{busy ? <><AiSpark size={12} spin />Regenerating…</> : 'Regenerate'}</button>}
        <button type="button" className="ai-link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'}</button>
      </span>}>
      {open && (
        <>
          <ul className={`exec-lines${busy ? ' dim' : ''}`}>{lines.map((l) => <li key={l} className="t-body-small">{l}</li>)}</ul>
          <AiTag>AI generated — check it against the request details</AiTag>
        </>
      )}
    </AiCard>
  );
}
