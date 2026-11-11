import { useEffect, useRef, useState } from 'react';
import { Icon, Btn, Segment, Avatar, Empty } from './ui.jsx';
import { useStore } from '../state/store.jsx';
import { WORKFLOW, ME, nextSteps } from '../data/tasks.js';

const DEPT_MANAGER = { 'REQ-4478': 'Nasser Al-Harthi', 'REQ-4433': 'Faisal Al-Dossari', 'REQ-4471': 'Department Manager' };

/* Workflow state for a request, seen from the task's step. */
export function processFor(task, request) {
  const cur = WORKFLOW.findIndex((s) => s.id === task.step);
  return WORKFLOW.map((s, i) => {
    let who = s.id === 'submitted' ? request.requester.name : s.id === 'dept' ? (DEPT_MANAGER[request.id] || s.who) : s.who;
    const state = i < cur ? 'done' : i === cur ? 'current' : (WORKFLOW[cur].group && s.group === WORKFLOW[cur].group) ? 'parallel' : 'upcoming';
    if (state === 'current') who = `${ME.name} (you)`;
    return { ...s, who, state, when: s.id === 'submitted' ? request.submitted.at.split(',')[0] : null };
  });
}

/* ---------- Activity tab ---------- */
export function Activity({ task, request }) {
  const { state } = useStore();
  const steps = processFor(task, request);
  const cur = steps.find((s) => s.state === 'current');
  const left = steps.filter((s) => s.state === 'upcoming' || s.state === 'parallel').length;
  const next = steps.find((s) => s.state === 'upcoming');
  const events = request.id === 'REQ-4429'
    ? [
      { at: '08 Nov 2026 · 04:12 PM', title: 'Finance review — GL approved', who: 'Khalid Al-Otaibi · GL Reviewer', done: true },
      { at: '11 Nov 2026 · 02:52 PM', title: 'Request changed after Procurement comments (6 changes)', who: 'Ibrahim Al-Rashid · Requester', done: true },
      { at: '11 Nov 2026 · 03:22 PM', title: 'Assigned to you — request changed after your approval', who: 'Finance review — GL', done: true },
    ]
    : [
      { at: request.submitted.at.replace(', ', ' · '), title: `Request ${request.id} submitted`, who: `${request.requester.name} · Requester`, done: true },
      ...(state.comments[request.id] || []).map((c) => ({ at: c.at, title: c.anchor ? `Comment on ${c.anchor.label}` : 'Comment added', who: `${c.author.name}${c.author.role ? ` · ${c.author.role}` : ''}`, quote: c.text, comment: true })),
      { at: '', title: `Assigned to you — ${cur?.name}`, who: cur?.group ? 'Specialist review · runs in parallel' : 'Workflow', done: true },
    ];
  return (
    <div className="stack">
      <ol className="timeline">
        {events.map((e, i) => (
          <li key={i}>
            <div className="rail"><span className={`node ${e.comment ? 'cmt' : 'done'}`} /><span className="line" /></div>
            <div className="step">
              <div className="t-body-medium">{e.title}</div>
              <div className="t-caption muted">{e.who}{e.at ? ` · ${e.at}` : ''}</div>
              {e.quote && <p className="quote t-body-small">{e.quote}</p>}
            </div>
          </li>
        ))}
        <li>
          <div className="rail"><span className="node now" /></div>
          <div className="step"><div className="t-body-medium" style={{ color: 'var(--brand-800)' }}>{cur?.name} — you are here</div><div className="t-caption muted">Due {task.due}</div></div>
        </li>
      </ol>
      <p className="t-body-small muted" style={{ margin: 0 }}>{left} steps left after yours{next ? ` · Next: ${next.name} · ${next.who}` : ''}</p>
    </div>
  );
}

/* ---------- Side panel: Comments & Process ---------- */
function CommentItem({ c, req, onReply, onGoto, isReply }) {
  const { dispatch, state } = useStore();
  const ref = useRef(null);
  useEffect(() => { if (state.lastComment === c.id) { ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); ref.current?.classList.add('enter', 'landed'); setTimeout(() => ref.current?.classList.remove('landed'), 1400); } }, []);
  return (
    <div ref={ref} className={`cmt${c.author.me ? ' mine' : ''}${c.resolved ? ' resolved' : ''}`}>
      <Avatar person={c.author} size={isReply ? 22 : 28} tone={c.author.me ? '' : 'alt'} />
      <div className="cmt-main">
        <div className="cmt-meta"><span className="t-label">{c.author.name}</span><span className="t-caption muted">{c.author.role ? `${c.author.role} · ` : ''}{c.at}</span></div>
        {c.anchor && <button type="button" className="anchor-chip" onClick={() => onGoto(c.anchor)}><Icon name="icon-anchor" size={12} /><span>{c.anchor.label}</span></button>}
        <p className="cmt-text">{c.text}</p>
        {!isReply && (
          <div className="cmt-actions">
            <button type="button" className="link-btn" onClick={() => onReply(c)}><Icon name="icon-reply" size={14} />Reply</button>
            {c.anchor && <button type="button" className={`link-btn${c.resolved ? '' : ' resolve'}`} onClick={() => dispatch({ type: 'resolve', req, id: c.id })}>{c.resolved ? 'Reopen' : 'Resolve'}</button>}
            {c.resolved && <span className="resolved-tag t-caption-medium"><Icon name="icon-check" size={12} />Resolved</span>}
          </div>
        )}
        {!isReply && c.replies?.length > 0 && <div className="replies">{c.replies.map((r) => <CommentItem key={r.id} c={r} req={req} isReply onGoto={onGoto} />)}</div>}
      </div>
    </div>
  );
}

export function SidePanel({ open, view, setView, onClose, task, request, replyTo, setReplyTo, onGoto }) {
  const { state, dispatch } = useStore();
  const comments = state.comments[request.id] || [];
  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
  const openReview = comments.filter((c) => c.anchor && !c.resolved).length;
  const [text, setText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const ta = useRef(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); }
    else { setShown(false); const t = setTimeout(() => setMounted(false), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260); return () => clearTimeout(t); }
  }, [open]);
  useEffect(() => { if (replyTo) ta.current?.focus(); }, [replyTo]);
  const post = () => {
    if (!text.trim()) return;
    dispatch({ type: 'comment', req: request.id, author: ME, text: text.trim(), replyTo: replyTo?.id });
    setText(''); setReplyTo(null);
  };
  const steps = processFor(task, request);
  const curIdx = steps.findIndex((s) => s.state === 'current');
  const doneCount = steps.filter((s) => s.state === 'done').length;
  const firstUp = steps.findIndex((s, i) => i > curIdx && s.state === 'upcoming');
  const cut = showAll || firstUp < 0 ? steps.length : firstUp + 2;
  const visible = steps.slice(0, cut);
  const groups = [];
  visible.forEach((s) => { const last = groups[groups.length - 1]; if (s.group && last?.group === s.group) last.items.push(s); else groups.push(s.group ? { group: s.group, items: [s] } : s); });
  if (!mounted) return null;
  return (
    <aside className={`side-panel${shown ? ' is-open' : ''}`} id="side-panel" aria-label="Comments and process" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="panel-head">
        <Segment label="Panel view" value={view} onChange={setView} items={[{ id: 'comments', label: 'Comments', count: total || null }, { id: 'process', label: 'Process' }]} />
        <button className="icon-btn panel-close" type="button" aria-label="Collapse panel" title="Collapse panel" onClick={onClose}><Icon name="icon-panel-close" size={18} /></button>
      </div>
      {view === 'comments' ? (
        <section className="panel-view" key="c">
          <div className="panel-body">
            {total > 0 && <div className="panel-summary"><span className="t-caption">{total} comment{total === 1 ? '' : 's'}</span>{comments.some((c) => c.anchor) && <span className={`open-count t-caption${openReview ? ' has-open' : ''}`}>{openReview ? `${openReview} open` : 'All resolved'}</span>}</div>}
            {total === 0 ? <Empty icon="rail-comments" title="No comments yet" sub="Post the first one, or comment on a section of the request." /> : (
              <div className="thread" aria-live="polite">{comments.map((c) => <CommentItem key={c.id} c={c} req={request.id} onReply={setReplyTo} onGoto={onGoto} />)}</div>
            )}
          </div>
          <div className="composer">
            {replyTo && <div className="composer-context"><span className="t-caption">Replying to <strong style={{ fontWeight: 500, color: 'var(--ink-primary)' }}>{replyTo.author.name}</strong></span><button className="x-btn" type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><Icon name="icon-x" size={12} /></button></div>}
            <div className="composer-box">
              <label htmlFor="composer-input" className="sr-only">Comment</label>
              <textarea id="composer-input" ref={ta} rows={1} value={text} placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
                onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); post(); } }} />
              <div className="composer-foot">
                <span className="t-caption muted"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to post</span>
                <button className="btn btn-primary" type="button" disabled={!text.trim()} onClick={post}>Post</button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel-view" key="p">
          <div className="panel-body">
            <div className="process-intro">
              <span className="t-body-small muted">Completed, current and upcoming steps for this request.</span>
              <div className="process-progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div><span className="t-caption-medium" style={{ color: 'var(--brand-800)' }}>Step {curIdx + 1} of {steps.length}</span></div>
            </div>
            <ol className="steps">
              {groups.map((g, gi) => g.group ? (
                <li key={`g${gi}`} className={`step-item ${g.items.some((i) => i.state === 'current') ? 'current' : g.items[0].state}`}>
                  <div className="step-rail"><span className="step-node">{g.items[0].state === 'done' && <Icon name="icon-step-done" size={10} />}</span><span className="step-line" /></div>
                  <div className="step-body">
                    <span className="step-group-label">Specialist reviews · in parallel</span>
                    <ul className="step-group">{g.items.map((i) => (
                      <li key={i.id} className={i.state === 'current' ? 'current' : ''}>
                        {i.state === 'current' && <span className="eyebrow-label t-count" style={{ color: 'var(--brand-800)', letterSpacing: '.4px', textTransform: 'uppercase' }}>You are here</span>}
                        <span className={i.state === 'current' ? 't-body-medium' : i.state === 'done' ? 't-body-medium' : 't-body secondary'}>{i.name}</span>
                        <span className="t-caption muted">{i.who}{i.state === 'done' ? ' · Completed' : ''}</span>
                      </li>
                    ))}</ul>
                  </div>
                </li>
              ) : (
                <li key={g.id} className={`step-item ${g.state}`}>
                  <div className="step-rail"><span className="step-node">{g.state === 'done' && <Icon name="icon-step-done" size={10} />}</span><span className="step-line" /></div>
                  <div className="step-body">
                    {g.state === 'current' ? (
                      <div className="step-current"><span className="eyebrow-label">You are here</span><span className="t-body-medium">{g.name}</span><span className="t-caption muted">{g.who} · due {task.due}</span></div>
                    ) : (<><span className="t-body-medium step-name">{g.name}</span><span className="t-caption muted">{g.who}{g.when ? ` · ${g.when}` : ''}</span></>)}
                  </div>
                </li>
              ))}
            </ol>
            {cut < steps.length && <button className="link-btn resolve show-more" type="button" onClick={() => setShowAll(true)}><span>Show {steps.length - cut} more steps</span><Icon name="icon-chevron-down" size={14} /></button>}
          </div>
        </section>
      )}
    </aside>
  );
}

/* ---------- Decision dialog ---------- */
const COPY = {
  approve: ['Approve this request?', 'Approve'],
  return: ['Return to the requester?', 'Return request'],
  reject: ['Reject this request?', 'Reject request'],
  submit: ['Submit your review?', 'Submit review'],
  confirm: ['Confirm your review?', 'Confirm review'],
  keep: ['Keep your approval?', 'Keep approval'],
  complete: ['Complete the qualification review?', 'Complete'],
  assign: ['Assign to the officer?', 'Assign'],
  doa: ['Submit for DOA approval?', 'Submit'],
};
export function DecisionDialog({ action, task, request, officer, onConfirm, onClose }) {
  const ref = useRef(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    const el = ref.current; el.showModal();
    const close = () => onClose(); el.addEventListener('close', close);
    return () => el.removeEventListener('close', close);
  }, []);
  const needsNote = action.id === 'return' || action.id === 'reject';
  const [title, cta] = COPY[action.id] || [`${action.label}?`, action.label];
  const steps = nextSteps(task, action.id, request);
  if (action.id === 'assign' && officer) steps[0] = ['Officer review', `${officer} checks the request against the procurement checklist.`];
  return (
    <dialog ref={ref} className={`dialog decision-dlg${action.variant === 'danger' ? ' danger' : ''}`} aria-labelledby="dlg-title">
      <div className="decision-grid">
        <div className="whats-next">
          <span className="t-caption-medium muted" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>What happens next</span>
          <ol>{steps.map(([t, d], i) => <li key={i}><span className="num-dot">{i + 1}</span><div><div className="t-body-medium">{t}</div><div className="t-body-small muted">{d}</div></div></li>)}</ol>
        </div>
        <div className="decision-main">
          <h2 id="dlg-title" className="t-heading" style={{ margin: 0, fontSize: 20, lineHeight: '26px' }}>{title}</h2>
          <p className="t-body-small muted" style={{ margin: '4px 0 0' }}>{request.id} · {request.project}</p>
          <label className="t-label" htmlFor="dlg-note" style={{ marginTop: 18, display: 'block' }}>{needsNote ? (action.id === 'reject' ? 'Reason for rejecting' : 'Note to the requester') : 'Note (optional)'}{needsNote && <span className="danger-text"> *</span>}</label>
          <textarea id="dlg-note" className="dlg-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} autoFocus
            placeholder={action.id === 'reject' ? 'Why is this request rejected?' : action.id === 'return' ? 'What should the requester change? Your section comments are included.' : 'Add a note for the record…'} />
          <div className="dialog-foot">
            <Btn variant="ghost" onClick={() => ref.current.close()}>Cancel</Btn>
            <Btn variant={action.variant === 'danger' ? 'danger-solid' : 'primary'} disabled={needsNote && !note.trim()} onClick={() => onConfirm(note)}>{cta}</Btn>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/* ---------- Toast ---------- */
export function Toast({ toast, onUndo, onHide }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onHide, 6000); return () => clearTimeout(t); }, [toast]);
  return (
    <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
      <span>{toast?.text}</span>
      {toast?.undo && <button type="button" onClick={onUndo}>Undo</button>}
    </div>
  );
}
