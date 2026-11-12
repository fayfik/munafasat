// Interim My requests page: start a new request and pick up the ones made in
// this session. The full list (table, filters, status variants) is the next batch.
import { Btn, Empty } from '../components/ui.jsx';
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
