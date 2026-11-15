// Interim My requests page: start a new request and pick up the ones made in
// this session. The full list (table, filters, status variants) is the next batch.
import { useState } from 'react';
import { Btn, Empty } from '../components/ui.jsx';
import { AiCard } from '../components/AiKit.jsx';
import { useRequests } from '../state/requests.jsx';
import { useActor } from '../state/actor.jsx';
import { sarFmt } from '../components/FormKit.jsx';
import { totals, visibleSteps, sectionStatus } from '../lib/requestRules.js';

const when = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function RequestsHome({ onNew, onOpen }) {
  const { list: all } = useRequests();
  const { actor } = useActor();
  // Each person sees the requests they started (older drafts without an owner belong to the requester).
  const list = all.filter((r) => (r.createdBy || 'requester') === actor.id);
  return (
    <main className="detail standalone req-home" aria-labelledby="rh-title">
      <div className="req-home-head">
        <div>
          <h1 className="t-display" id="rh-title">My requests</h1>
          <p className="t-body-small muted" style={{ margin: '4px 0 0' }}>{actor.name} · requests you start here are kept for this browser session.</p>
        </div>
        <Btn variant="primary" icon="icon-plus" onClick={onNew}>New request</Btn>
      </div>
      <Suggestions list={list} onNew={onNew} onOpen={onOpen} />
      {list.length ? (
        <table className="plain-table req-table">
          <thead><tr><th>Request</th><th>Route</th><th>Status</th><th className="num">Value (incl. VAT)</th><th>Last updated</th></tr></thead>
          <tbody>
            {list.map((r) => {
              const f = r.form;
              const steps = f ? visibleSteps(f, r.routeConfirmed).filter((s) => s.id !== 'review') : [];
              const done = f ? steps.filter((s) => sectionStatus(s.id, f, r.routeConfirmed) === 'done').length : 0;
              return (
                <tr key={r.id} className="req-row" onClick={() => onOpen(r.id)}>
                  <td><a href={`#/requests/${r.id}`} onClick={(e) => { e.preventDefault(); onOpen(r.id); }} className="t-body-medium">{r.title || 'Untitled request'}</a>
                    <div className="t-caption muted">{r.requestNo || (r.moved ? `Moved items: ${r.moved.join(', ')}` : `${done} of ${steps.length} steps complete`)}</div></td>
                  <td className="muted">{r.type === 'emarket' ? 'E-Market' : 'Tender'}</td>
                  <td><span className={`status-pill t-caption-medium${r.status === 'submitted' ? ' done' : ' draft-pill'}`}><span className="pill-dot" />{r.status === 'submitted' ? 'Submitted' : 'Draft'}</span></td>
                  <td className="num">{f ? sarFmt(totals(f).total) : '—'}</td>
                  <td className="muted">{when(r.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="req-empty"><Empty icon="icon-file" title="No requests yet" sub="Start a tender or an Etimad E-Market purchase." /><Btn variant="secondary" icon="icon-plus" onClick={onNew}>New request</Btn></div>
      )}
    </main>
  );
}

/** AI suggestions above the list — resume a draft with AI, or start from a past request. */
function Suggestions({ list, onNew, onOpen }) {
  const KEY = 'munafasat-theme-ai-hints-hidden';
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } });
  const hide = () => { setHidden(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* per-viewer convenience only */ } };
  if (hidden) return null;
  const draft = list.find((r) => r.status !== 'submitted' && r.routeConfirmed && r.form);
  const steps = draft ? visibleSteps(draft.form, true).filter((s) => s.id !== 'review') : [];
  const done = draft ? steps.filter((s) => sectionStatus(s.id, draft.form, true) === 'done').length : 0;
  return (
    <AiCard className="home-ai" title="AI suggestions" right={<button type="button" className="ai-link" onClick={hide}>Hide</button>}>
      <ul className="ai-rows">
        {draft && done < steps.length && (
          <li className="ai-row">
            <div className="grow"><span className="t-body-medium">Finish “{draft.title}” faster</span><span className="t-caption muted">{done} of {steps.length} steps done. AI can draft the scope, BOQ, payment stages and criteria that are left — you review each one.</span></div>
            <Btn variant="secondary-sm" onClick={() => onOpen(draft.id)}>Continue</Btn>
          </li>
        )}
        <li className="ai-row">
          <div className="grow"><span className="t-body-medium">Start from a similar request</span><span className="t-caption muted">Based on past requests in your projects, starting from a similar one is about 40% faster. Pick your project and we’ll suggest one to import.</span></div>
          <Btn variant="secondary-sm" onClick={onNew}>Try AI draft</Btn>
        </li>
      </ul>
    </AiCard>
  );
}
