// Approval steps up to publishing in Etimad — ported from the design-review build
// (inbox/ProcSteps.tsx, 22 Nov 2026):
//   Qualification — Finance   the financial criteria (Finance-owned, hidden from requesters)
//   Procurement method — TL   contract type, envelope, priority, assign an officer
//   Procurement review — Officer   review everything, confirm value & duration
//   Create in Etimad          record the Etimad reference
import { useEffect, useState } from 'react';
import { useTask, ReviewHeader, ReadRequestRow } from '../components/ReviewKit.jsx';
import { Icon, Btn } from '../components/ui.jsx';
import { Choice, Input, TextArea, NumInput } from '../components/FormKit.jsx';
import { AiSpark } from '../components/AiKit.jsx';
import { sar } from '../data/requests.js';
import { actorById, OFFICER_IDS } from '../data/actors.js';
import { useStore } from '../state/store.jsx';
import { workload } from '../lib/assign.js';
import { PRIORITY_LEVELS, AREA_OPTS, DELIVERY_OPTS, RATIOS, optName, priorityName, scoreBands } from '../lib/qualGuide.js';
import { CONTRACT_OPTS, ENVELOPE_OPTS, VENDOR_POOL, requesterFin, suggestedFin, finOk, useRfp, methodOk, aboveCount } from '../lib/procRules.js';

const stamp = () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const nature = (r) => `${optName(AREA_OPTS, r.profile?.area)} · ${optName(DELIVERY_OPTS, r.profile?.delivery)}`;
const PrioChip = ({ id }) => (id ? <span className="prio-chip t-caption-medium"><span className={`prio-dot p-${id}`} aria-hidden="true" />{priorityName(id)}</span> : <span className="muted">—</span>);

function Card({ title, aside, children, id }) {
  return (
    <section className="proc-card" data-card={id}>
      <div className="proc-card-head"><h3 className="t-title" style={{ margin: 0 }}>{title}</h3>{aside}</div>
      {children}
    </section>
  );
}
const Kv = ({ items }) => (
  <dl className="kv-tiles">{items.filter(Boolean).map(([k, v]) => <div key={k}><dt className="t-caption muted">{k}</dt><dd className="t-body-medium">{v}</dd></div>)}</dl>
);

/* ── Qualification — Finance ─────────────────────────────────────────────── */
export function FinQual() {
  const { request, setGates } = useTask();
  const [rfp, setRfp] = useRfp(request.id);
  const req = requesterFin(request);
  const sug = suggestedFin(request);
  const fq = rfp.finQual || req;
  const set = (p) => setRfp({ finQual: { ...fq, ...p } });
  // The two weights always add up to 100: editing one moves the other.
  const setR = (k, p) => {
    const other = k === 'liquidity' ? 'cash' : 'liquidity';
    set(p.weight != null ? { [k]: { ...fq[k], ...p }, [other]: { ...fq[other], weight: Math.max(0, 100 - p.weight) } } : { [k]: { ...fq[k], ...p } });
  };
  const same = (a, b) => JSON.stringify([a.liquidity, a.cash, a.passing]) === JSON.stringify([b.liquidity, b.cash, b.passing]);
  const total = fq.liquidity.weight + fq.cash.weight;
  const ok = finOk(fq);
  useEffect(() => { setGates({ complete: ok ? true : 'Ranges need a minimum and a target, and weights must total 100%.' }); }, [ok]);
  return (
    <div className="stack" data-fin-qual>
      <ReviewHeader title="Review the financial qualification criteria" desc="The requester entered these at creation. Check them against the project profile, adjust ranges or weights if needed, and set the passing percentage. Requesters don’t see your changes." />
      <Card id="profile" title="Project profile">
        <Kv items={[['Estimated value (excl. VAT)', sar(request.amount)], ['Duration', request.duration], ['Nature', nature(request)], ['Project priority', <PrioChip id={request.profile?.priority} />]]} />
        <p className="t-body-small muted" style={{ margin: 0 }}><strong className="ink">Scope:</strong> {request.scope}</p>
        <div className="row-gap">
          <Btn variant="secondary-sm" icon={rfp.finValueRequested ? 'icon-check-brand' : undefined} disabled={!!rfp.finValueRequested} onClick={() => setRfp({ finValueRequested: true })}>{rfp.finValueRequested ? 'Value requested' : 'Request estimated value'}</Btn>
          <Btn variant="ghost-sm" disabled={!!rfp.finRedirected} onClick={() => setRfp({ finRedirected: true })}>{rfp.finRedirected ? 'Redirected to Non-IT Finance' : 'Redirect to Non-IT Finance'}</Btn>
        </div>
        {rfp.finValueRequested && <p className="t-caption muted" style={{ margin: 0 }}>Estimated value requested from the Procurement Officer — it appears here when they confirm it.</p>}
        {rfp.finRedirected && <p className="t-caption muted" style={{ margin: 0 }}>Redirected to Non-IT Finance qualification. <button type="button" className="inline-link t-caption" onClick={() => setRfp({ finRedirected: false })}>Undo</button></p>}
      </Card>
      <Card id="criteria" title="Financial criteria"
        aside={same(fq, req) ? <span className="ok-chip t-caption-medium"><Icon name="icon-check" size={13} />As the requester entered</span>
          : <button type="button" className="link-btn t-body-small" onClick={() => setRfp({ finQual: null })}>Reset to the requester’s values</button>}>
        <div className="table-scroll">
          <table className="plain-table ratio-table">
            <thead><tr><th>Ratio</th><th className="num">Minimum</th><th className="num">Target</th><th className="num">Weight</th></tr></thead>
            <tbody>
              {RATIOS.map((r) => (
                <tr key={r.k} data-fin-ratio={r.k}>
                  <td><div className="t-body-medium">{r.en}</div><div className="t-caption muted">{r.formula}</div></td>
                  <td className="num"><Input className="ratio-in" value={fq[r.k].min} onChange={(e) => setR(r.k, { min: e.target.value })} aria-label={`${r.en} minimum`} inputMode="decimal" /></td>
                  <td className="num"><Input className="ratio-in" value={fq[r.k].max} onChange={(e) => setR(r.k, { max: e.target.value })} aria-label={`${r.en} target`} inputMode="decimal" /></td>
                  <td className="num"><div className="weight-in" style={{ marginLeft: 'auto' }}><NumInput value={fq[r.k].weight} max={100} suffix="%" onChange={(v) => setR(r.k, { weight: v === '' ? 0 : v })} aria-label={`${r.en} weight`} /></div></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className={total === 100 ? '' : 'bad'}><td colSpan={3}>Total weight</td><td className="num" data-fin-total>{total}%</td></tr></tfoot>
          </table>
        </div>
        {!same(fq, sug) && (
          <div className="suggest-line">
            <AiSpark size={13} />
            <span className="t-body-small grow">Typical for a <strong className="ink">{priorityName(request.profile?.priority).toLowerCase()}-priority</strong> {optName(DELIVERY_OPTS, request.profile?.delivery).toLowerCase()} project: liquidity {sug.liquidity.min}–{sug.liquidity.max} ({sug.liquidity.weight}%), cash {sug.cash.min}–{sug.cash.max} ({sug.cash.weight}%).</span>
            <button type="button" className="ai-link" onClick={() => set({ liquidity: sug.liquidity, cash: sug.cash, passing: sug.passing })}>Use these</button>
          </div>
        )}
        <div className="pass-box">
          <div className="grow"><div className="t-body-medium">Financial passing percentage</div><div className="t-caption muted">Default 60%.</div></div>
          <div className="weight-in"><NumInput value={fq.passing} max={100} suffix="%" onChange={(v) => set({ passing: v === '' ? 0 : v })} aria-label="Financial passing percentage" /></div>
        </div>
      </Card>
      <Card id="key" title="Scoring key (1–7)" aside={<span className="t-caption muted">Read-only · from the ranges above</span>}>
        <div className="table-scroll">
          <table className="score-key">
            <thead><tr><th />{[1, 2, 3, 4, 5, 6, 7].map((n) => <th key={n}>{n}</th>)}</tr></thead>
            <tbody>{RATIOS.map((r) => <tr key={r.k}><td className="t-body-medium">{r.en}</td>{scoreBands(fq[r.k]).map((b, i) => <td key={i}><span style={{ background: `rgba(81,118,50,${0.05 + i * 0.035})` }}>{b}</span></td>)}</tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── Procurement method — Team Lead ──────────────────────────────────────── */
export function TlMethod() {
  const { request, setGates } = useTask();
  const { state } = useStore();
  const [rfp, setRfp] = useRfp(request.id);
  const reqPrio = request.profile?.priority;
  const m = { priority: reqPrio, ...(rfp.method || {}) };
  const set = (p) => setRfp({ method: { ...m, ...p } });
  const [vendor, setVendor] = useState('');
  const vendors = m.vendors || [];
  const officers = OFFICER_IDS.map((id) => ({ ...actorById(id), open: workload(id, state) }));
  const lightest = [...officers].sort((a, b) => a.open - b.open)[0]?.id;
  const steps = [!!m.contractType && (m.contractType !== 'direct' || !!(m.justification || '').trim()) && (m.contractType !== 'closed' || vendors.length > 0), !!m.envelope, !!m.priority, !!m.officer];
  const ok = methodOk(m);
  useEffect(() => { setGates({ assign: ok ? true : 'Set the contract type, envelope and officer first.' }); }, [ok]);
  return (
    <div className="stack" data-tl-method>
      <ReviewHeader title="Set the procurement method and assign" desc="Choose how this goes to market, confirm the project priority, then assign an officer to review and publish it." done={steps.filter(Boolean).length} total={4} noun="set" />
      <ReadRequestRow text="Read the request before you decide how it goes to market." />
      <Card id="contract" title="Contract type">
        <Choice name="Contract type" options={CONTRACT_OPTS} value={m.contractType} onChange={(v) => set({ contractType: v })} />
        {m.contractType && <p className="t-body-small muted fade-in" style={{ margin: 0 }}>{CONTRACT_OPTS.find((x) => x.id === m.contractType).hint}</p>}
        {m.contractType === 'direct' && (
          <label className="field-stack fade-in"><span className="t-body-small" style={{ fontWeight: 500 }}>Justification for direct purchase</span>
            <TextArea rows={2} value={m.justification || ''} onChange={(e) => set({ justification: e.target.value })} placeholder="e.g. sole OEM licence holder; renewal of an existing subscription" /></label>
        )}
        {m.contractType === 'closed' && (
          <div className="fade-in field-stack">
            <span className="t-body-small" style={{ fontWeight: 500 }}>Invited vendors · {vendors.length}</span>
            <div className="vendor-chips">
              {[...new Set([...VENDOR_POOL, ...vendors])].map((v) => {
                const on = vendors.includes(v);
                return <button key={v} type="button" className={`vchip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => set({ vendors: on ? vendors.filter((x) => x !== v) : [...vendors, v] })}>{on && <Icon name="icon-check-brand" size={12} />}{v}</button>;
              })}
            </div>
            <form className="row-gap" onSubmit={(e) => { e.preventDefault(); const v = vendor.trim(); if (v && !vendors.includes(v)) set({ vendors: [...vendors, v] }); setVendor(''); }}>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Add another vendor…" aria-label="Add a vendor" style={{ flex: 1 }} />
              <Btn variant="secondary-sm" type="submit">Add</Btn>
            </form>
          </div>
        )}
      </Card>
      <Card id="envelope" title="Envelope type">
        <Choice name="Envelope type" options={ENVELOPE_OPTS} value={m.envelope} onChange={(v) => set({ envelope: v })} />
        {m.envelope && <p className="t-body-small muted fade-in" style={{ margin: 0 }}>{ENVELOPE_OPTS.find((x) => x.id === m.envelope).hint}</p>}
      </Card>
      <Card id="priority" title="Project priority" aside={reqPrio && <span className="t-caption muted">Requester: {priorityName(reqPrio)}</span>}>
        <Choice name="Project priority" options={PRIORITY_LEVELS.map((o) => ({ ...o, dot: true }))} value={m.priority} onChange={(v) => set({ priority: v })} />
        <p className="t-body-small muted" style={{ margin: 0 }}>Set by the requester — change it if needed. The team sees it in the queue and on the request.</p>
      </Card>
      <Card id="officer" title="Assign officer" aside={<span className="t-caption muted">Procurement team · open requests</span>}>
        <div className="choice-grid" role="radiogroup" aria-label="Officer">
          {officers.map((o) => (
            <label key={o.id} className={`choice${m.officer === o.id ? ' on' : ''}`} data-officer={o.id}>
              <input type="radio" name="officer" checked={m.officer === o.id} onChange={() => set({ officer: o.id })} />
              <span className="avatar-dot" aria-hidden="true">{o.initials}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="t-body-medium" style={{ display: 'block' }}>{o.name}</span>
                <span className="load-line"><span className="load-bar"><span className={o.open >= 6 ? 'busy' : ''} style={{ width: `${Math.min(100, o.open * 14)}%` }} /></span><span className="t-caption muted">{o.open} open</span>{o.id === lightest && <span className="t-micro lightest">Lightest</span>}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MethodSummary({ m }) {
  return (
    <Kv items={[
      ['Contract type', optName(CONTRACT_OPTS, m.contractType)],
      ['Envelope', optName(ENVELOPE_OPTS, m.envelope)],
      ['Project priority', <PrioChip id={m.priority} />],
      m.contractType === 'closed' && ['Invited vendors', (m.vendors || []).join(', ') || '—'],
      m.contractType === 'direct' && ['Direct purchase justification', m.justification || '—'],
      ['Officer', m.officer ? actorById(m.officer).name : '—'],
    ]} />
  );
}

/* ── Procurement review — Officer ────────────────────────────────────────── */
export function OfficerConfirm() {
  const { request, setGates } = useTask();
  const [rfp, setRfp] = useRfp(request.id);
  const m = rfp.method || { contractType: 'tender', envelope: 'two', priority: request.profile?.priority, officer: 'officer' };
  const fq = rfp.finQual || requesterFin(request);
  const c = rfp.confirm;
  const [value, setValue] = useState(String(c?.value ?? request.amountVat));
  const [duration, setDuration] = useState(c?.duration ?? request.duration ?? '');
  const above = aboveCount(request);
  useEffect(() => { setGates({ approve: c ? true : 'Confirm the estimated value and duration first.' }); }, [!!c]);
  const checks = [
    ['Procurement method set', '', !!m.contractType && !!m.envelope],
    ['Financial criteria weights total 100%', '', finOk(fq)],
    ['Qualification open to SMEs', above ? `${above} above the typical range — justified by the requester` : '', above === 0],
    ['Technical passing percentage set', '', request.techEval?.passing != null],
  ];
  return (
    <div className="stack" data-officer-confirm>
      <ReviewHeader title="Review and confirm" desc="One view of the request and every decision on it. Confirm the estimated contract value and duration, then mark it good to go — or return it with comments." done={c ? 1 : 0} total={1} noun="confirmed" />
      <ReadRequestRow />
      <Card id="method" title="Procurement method" aside={<span className="t-caption muted">Set by {actorById('lead').name}</span>}><MethodSummary m={m} /></Card>
      <Card id="glance" title="Request at a glance">
        <Kv items={[
          ['Nature', nature(request)], ['BOQ value (excl. VAT)', sar(request.amount)],
          ['Qualification passing', `${request.qualification?.passing ?? 60}%`],
          ['Financial criteria', `Liquidity ${fq.liquidity.weight}% · Cash ${fq.cash.weight}% · passing ${fq.passing}%`],
          ['Technical passing', `${request.techEval?.passing ?? '—'}%`], ['Documents', String(request.attachments?.length || 0)],
        ]} />
        <ul className="check-list">
          {checks.map(([l, sub, pass]) => <li key={l} className="t-body-small"><Icon name={pass ? 'icon-check' : 'icon-alert'} size={15} />{l}{sub && <span className="muted"> · {sub}</span>}</li>)}
        </ul>
      </Card>
      <Card id="value" title="Confirm the estimated contract value and duration" aside={c && <span className="ok-chip t-caption-medium fade-in"><Icon name="icon-check" size={13} />Confirmed · {c.at}</span>}>
        <div className="confirm-row">
          <label className="field-stack"><span className="t-body-small" style={{ fontWeight: 500 }}>Estimated value (SAR, incl. VAT)</span>
            <Input inputMode="numeric" value={value} disabled={!!c} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} data-officer-value /></label>
          <label className="field-stack"><span className="t-body-small" style={{ fontWeight: 500 }}>Contract duration</span>
            <Input value={duration} disabled={!!c} onChange={(e) => setDuration(e.target.value)} data-officer-duration /></label>
          {c
            ? <Btn variant="ghost" onClick={() => setRfp({ confirm: null })}>Edit</Btn>
            : <Btn variant="secondary" icon="icon-check-brand" disabled={!(Number(value) > 0) || !duration.trim()} onClick={() => setRfp({ confirm: { value: Number(value), duration: duration.trim(), at: stamp() } })}>Confirm</Btn>}
        </div>
      </Card>
    </div>
  );
}

/* ── Create in Etimad ────────────────────────────────────────────────────── */
export function EtimadCreate() {
  const { request, setGates } = useTask();
  const [rfp, setRfp] = useRfp(request.id);
  const m = rfp.method || { contractType: 'tender', envelope: 'two', priority: request.profile?.priority };
  const fq = rfp.finQual || requesterFin(request);
  const [ref, setRef] = useState(rfp.etimad?.ref || '');
  const [copied, setCopied] = useState(false);
  const done = !!rfp.etimad;
  useEffect(() => { setGates({ publish: done ? true : 'Record the Etimad reference first.' }); }, [done]);
  const rows = [
    ['Contract type', optName(CONTRACT_OPTS, m.contractType)],
    ['Envelope', optName(ENVELOPE_OPTS, m.envelope)],
    ['Project priority', priorityName(m.priority) || '—'],
    ['Technical criteria', `${request.techEval?.criteria.length || 0} criteria · passing ${request.techEval?.passing ?? '—'}%`],
    ['Qualification criteria', `${(request.qualification?.groups || []).reduce((n, g) => n + g.subs.length, 0)} sub-criteria · passing ${request.qualification?.passing ?? 60}% · ${aboveCount(request) ? 'justified above-range criteria' : 'open to SMEs'}`],
    ['Financial criteria', `Liquidity ${fq.liquidity.min}–${fq.liquidity.max} (${fq.liquidity.weight}%) · Cash ${fq.cash.min}–${fq.cash.max} (${fq.cash.weight}%) · passing ${fq.passing}%`],
    ...(m.contractType === 'closed' ? [['Invited vendors', (m.vendors || []).join(', ')]] : []),
    ['Estimated value', rfp.confirm ? `${sar(rfp.confirm.value)} · ${rfp.confirm.duration}` : sar(request.amountVat)],
    ['Documents', `${request.attachments?.length || 0} files`],
  ];
  const copy = () => { navigator.clipboard?.writeText(rows.map(([k, v]) => `${k}: ${v}`).join('\n')).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="stack" data-etimad-create>
      <ReviewHeader title="Create the request in Etimad" desc="Everything below is approved. Create the competition in Etimad with these settings, then record the Etimad reference here." done={done ? 1 : 0} total={1} noun="recorded" />
      <Card id="summary" title="Publication summary" aside={<button type="button" className="link-btn t-body-small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>}>
        <dl className="pub-summary">{rows.map(([k, v]) => <div key={k}><dt className="t-body-small muted">{k}</dt><dd className="t-body-medium">{v}</dd></div>)}</dl>
      </Card>
      <Card id="ref" title="Etimad reference" aside={done && <span className="ok-chip t-caption-medium fade-in"><Icon name="icon-check" size={13} />Recorded</span>}>
        <form className="row-gap" onSubmit={(e) => { e.preventDefault(); if (ref.trim()) setRfp({ etimad: { ref: ref.trim(), at: stamp() } }); }}>
          <Input value={ref} disabled={done} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 260139001234" aria-label="Etimad reference" style={{ flex: 1 }} data-etimad-input />
          {done ? <Btn variant="ghost" type="button" onClick={() => setRfp({ etimad: null })}>Edit</Btn> : <Btn variant="secondary" type="submit" disabled={!ref.trim()}>Record reference</Btn>}
        </form>
      </Card>
    </div>
  );
}

/** "Published in Etimad · ref" — on every view of the request once recorded. */
export function EtimadBanner({ req }) {
  const { state } = useStore();
  const e = state.rfp[req]?.etimad;
  const live = e && Object.entries(state.done).some(([id, d]) => id.startsWith(`TSK-${req.replace('REQ-', '')}-15`) && d.action === 'publish');
  if (!live) return null;
  return (
    <div className="banner brand fade-in" data-etimad-published>
      <Icon name="icon-check-brand" size={16} />
      <div className="banner-text"><div className="t-body-medium">Published in Etimad · <span className="tnum">{e.ref}</span></div><div className="t-body-small">Recorded {e.at}</div></div>
    </div>
  );
}
