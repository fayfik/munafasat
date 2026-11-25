import { useEffect, useState } from 'react';
import { useTask, ReadRequestRow } from '../components/ReviewKit.jsx';
import { Icon } from '../components/ui.jsx';
import { sar } from '../data/requests.js';
import { DOA, PRICE_ITEMS } from '../data/content.js';

const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')}M` : `${Math.round(n / 1e3)}K`);

/* ---------- Budget check ---------- */
export function BudgetCheck({ budget }) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const refresh = () => { setChecking(true); setTimeout(() => { setChecking(false); setChecked(true); }, 900); };
  const ok = budget.status === 'available';
  const total = budget.consumed + budget.request + (ok ? budget.remaining : 0);
  const pct = (n) => `${(n / Math.max(total, budget.consumed + budget.request)) * 100}%`;
  return (
    <section className={`budget${ok ? '' : ' is-short'}`} aria-labelledby="budget-title">
      <div className="budget-top">
        <div className="budget-title">
          <span className="t-title" id="budget-title">Budget check</span>
          <span className={`ok-chip t-caption-medium${ok ? '' : ' bad'}`}><Icon name={ok ? 'icon-check' : 'icon-block'} size={13} />{ok ? 'Within budget' : 'Insufficient budget'}</span>
        </div>
        <span className="t-caption muted budget-src">SAP Funds Mgmt · {budget.ref} · {checking ? <span className="checking-txt">Checking budget…</span> : <button type="button" className="inline-link t-caption" onClick={refresh}>{checked ? 'Checked just now · Refresh' : 'Refresh'}</button>}</span>
      </div>
      {!ok && <p className="t-body-small" style={{ margin: 0, color: 'var(--danger-text)' }}>The estimated value exceeds the available budget. Approval is blocked — return the request or ask Finance for a budget transfer.</p>}
      <div className="figures">
        <div className="figure"><span className="t-caption muted">Available</span><span className="figure-value"><span className="t-body-small muted">SAR</span><span className="t-stat">{budget.available.toLocaleString()}</span></span><span className="t-caption muted">of SAR {budget.annual} annual budget</span></div>
        <div className="figure"><span className="t-caption muted">This request (incl. VAT)</span><span className="figure-value"><span className="t-body-small muted">SAR</span><span className="t-stat brand">{budget.request.toLocaleString()}</span></span></div>
        {ok ? (
          <div className="figure"><span className="t-caption muted">Left if approved</span><span className="figure-value"><span className="t-body-small muted">SAR</span><span className="t-stat">{budget.remaining.toLocaleString()}</span></span><span className="t-caption muted">{budget.remainingPct}% of annual budget left</span></div>
        ) : (
          <div className="figure"><span className="t-caption muted">Shortfall</span><span className="figure-value"><span className="t-body-small muted">SAR</span><span className="t-stat" style={{ color: 'var(--danger-text)' }}>{budget.shortfall.toLocaleString()}</span></span><span className="t-caption muted">{budget.shortfallPct}% over the available budget</span></div>
        )}
      </div>
      <div className="bar" role="img" aria-label={`Consumed and committed ${short(budget.consumed)}, this request ${short(budget.request)}${ok ? `, remaining ${short(budget.remaining)}` : ', exceeds available budget'}`}>
        <span className="consumed" style={{ width: pct(budget.consumed) }} />
        <span className={`request${ok ? '' : ' over'}`} style={{ width: pct(budget.request) }} />
        {ok && <span className="remaining" />}
      </div>
      <div className="legend t-caption">
        <span><i className="dot d-consumed" />Consumed & committed · SAR {short(budget.consumed)}</span>
        <span><i className={`dot ${ok ? 'd-request' : 'd-over'}`} />This request · SAR {short(budget.request)}</span>
        {ok && <span><i className="dot d-remaining" />Remaining · SAR {short(budget.remaining)}</span>}
      </div>
    </section>
  );
}

export function DeptApproval() {
  const { request, setGates, openComments } = useTask();
  const ok = request.budget?.status !== 'insufficient';
  useEffect(() => { setGates({ approve: ok ? true : 'Approval is blocked: the request exceeds the available budget.' }); }, [ok]);
  const note = request.comments[0];
  return (
    <div className="stack">
      <ReadRequestRow />
      {request.budget && <BudgetCheck budget={request.budget} />}
      {note && (
        <div className="note t-body-small">
          <Icon name="icon-alert" size={18} />
          <p style={{ margin: 0 }}><strong>Requester note:</strong> {note.text}&nbsp; <button type="button" className="inline-link" onClick={() => openComments(note.id)}>Reply</button></p>
        </div>
      )}
    </div>
  );
}

/* ---------- DOA approval ---------- */
export function DoaApproval() {
  return (
    <div className="stack">
      <ReadRequestRow />
      <section className="soft-panel">
        <div className="soft-panel-head">
          <span className="t-title">Delegation of authority</span>
          <span className="ok-chip t-caption-medium"><Icon name="icon-check" size={13} />Within your limit</span>
        </div>
        <dl className="kv-grid">
          {DOA.map(([k, v]) => <div key={k}><dt className="t-caption muted">{k}</dt><dd className="t-body">{v}</dd></div>)}
        </dl>
        <div className="limit-meter" role="img" aria-label="Request uses 99.4% of your SAR 10M limit">
          <div className="limit-fill" style={{ width: '99.4%' }} />
        </div>
        <span className="t-caption muted">SAR 9.94M of your SAR 10M limit · 99.4% used</span>
      </section>
    </div>
  );
}

/* ---------- Estimated price approval ---------- */
export function EstimatedPrice() {
  const subtotal = PRICE_ITEMS.reduce((s, [, , v]) => s + v, 0);
  return (
    <div className="stack">
      <ReadRequestRow />
      <section>
        <h2 className="t-title" style={{ margin: 0 }}>Estimated price by budget item</h2>
        <p className="t-body-small muted" style={{ margin: '2px 0 10px' }}>You approve as Director of IT & Digital. The Procurement Officer then creates the request in Etimad.</p>
        <table className="plain-table">
          <thead><tr><th>Budget item</th><th className="num">Items</th><th className="num">Estimated price</th></tr></thead>
          <tbody>
            {PRICE_ITEMS.map(([name, n, v]) => <tr key={name}><td>{name}</td><td className="num muted">{n}</td><td className="num">{sar(v)}</td></tr>)}
          </tbody>
          <tfoot>
            <tr><td colSpan={2}>Subtotal</td><td className="num">{sar(subtotal)}</td></tr>
            <tr><td colSpan={2} className="muted">VAT (15%)</td><td className="num muted">{sar(subtotal * 0.15)}</td></tr>
            <tr className="grand"><td colSpan={2}>Total (incl. VAT)</td><td className="num">{sar(subtotal * 1.15)}</td></tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
