// Dashboard (design-review pages/Dashboard): greeting, KPI cards that drill down,
// create-request CTAs, requests by status, closing soon, recent requests,
// recent activity, quick actions and AI suggestions — built from the live
// prototype data (your requests, your inbox, what happened this session).
import { useEffect, useMemo, useState } from 'react';
import { Icon, Btn } from '../components/ui.jsx';
import { Dialog } from '../components/FormKit.jsx';
import { AiSpark } from '../components/AiKit.jsx';
import { useRequestRows, STATUS, TYPE } from './RequestsHome.jsx';
import { useActor } from '../state/actor.jsx';
import { useStore } from '../state/store.jsx';
import { mineFor } from '../lib/assign.js';
import { REQUESTS } from '../data/requests.js';
import { ACTION_PAST, taskById } from '../data/tasks.js';

const TODAY = new Date('2026-11-25T12:00:00');
const DAY = 864e5;
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const day = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const ago = (d) => { const n = Math.round((TODAY - new Date(d)) / DAY); return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 30 ? `${n} days ago` : day(d); };
const sarShort = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
const STAGE = { draft: 'Draft preparation', submitted: 'Pending manager approval', 'under-review': 'Specialist & finance reviews', returned: 'Returned for changes', approved: 'PR created', cancelled: 'Cancelled' };
const SEG = [['draft', '#a8b39d'], ['submitted', '#3b6fd4'], ['under-review', '#e3a008'], ['returned', '#c8251b'], ['approved', '#517632'], ['cancelled', '#d0d5cb']];

function useCountUp(target, ms = 450) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (now) => { const p = Math.min(1, (now - t0) / ms); setV(Math.round(target * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    setV(0); raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Dashboard({ go, onNew }) {
  const { actor } = useActor();
  const { state } = useStore();
  const rows = useRequestRows();
  const [drill, setDrill] = useState(null);
  const [seg, setSeg] = useState(null);
  const tasks = mineFor(actor, state);
  const pending = tasks.filter((t) => !state.done[t.id]);
  const drafts = rows.filter((r) => r.status === 'draft');
  const subs = rows.filter((r) => ['submitted', 'under-review', 'approved', 'returned'].includes(r.status));
  const awaiting = subs.filter((r) => ['submitted', 'under-review'].includes(r.status));
  const total = rows.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (r.amount || 0), 0);
  const po = rows.filter((r) => r.prNumber);
  const poValue = po.reduce((s, r) => s + (r.amount || 0), 0);
  const today = drafts.filter((r) => ago(r.updatedAt) === 'Today').length;
  const view = (r) => go(r.session && r.status === 'draft' ? `#/requests/${r.id}` : `#/requests/view/${r.id}`);
  const toggle = (k) => setDrill((d) => (d === k ? null : k));

  return (
    <main className="detail standalone dash" aria-labelledby="dash-title">
      <div>
        <h1 className="t-display" id="dash-title">{greeting()}, {actor.name.split(' ')[0]}</h1>
        <p className="t-body muted" style={{ margin: '4px 0 0' }}>Here’s what’s happening with your procurement items today.</p>
      </div>

      <div className="dash-kpis">
        <Kpi tone="neutral" icon="icon-file" label="My drafts" value={drafts.length} sub={today ? `${today} updated today` : 'Continue where you left off'} on={drill === 'drafts'} onClick={() => toggle('drafts')} />
        <Kpi tone="brand" icon="icon-send" label="My submissions" value={subs.length} sub={`${awaiting.length} awaiting approval`} on={drill === 'subs'} onClick={() => toggle('subs')} />
        <Kpi tone="warn" icon="icon-clock" label="Awaiting your action" value={pending.length} sub={pending.length ? 'Requires your attention' : 'Nothing waiting'} danger={pending.length > 0} on={drill === 'tasks'} onClick={() => toggle('tasks')} />
        <Value label="Total request value" amount={total} sub={`${rows.length} requests`} />
        <Value label="Total PR value" amount={poValue} sub={`${po.length} requests with a PR`} tone="ok" />
      </div>

      {drill && <DrillPanel kind={drill} drafts={drafts} subs={subs} tasks={pending} onClose={() => setDrill(null)} onView={view} go={go} onNew={onNew} />}

      <div className="dash-ctas">
        <button type="button" className="dash-cta primary" onClick={onNew}>
          <span className="cta-ico"><Icon name="icon-plus" size={18} className="invert" /></span>
          <span className="t-title">Create request</span>
          <span className="t-body-small">Start a new tender, an E-Market purchase, or let us help you decide.</span>
          <span className="t-caption-medium cta-link">Get started <Icon name="icon-chevron-right" size={12} className="invert" /></span>
        </button>
        <div className="dash-cta ai">
          <span className="cta-ico"><AiSpark size={18} /></span>
          <span className="t-title ai-text">Q1 2027 planning</span>
          <span className="t-body-small">The pre-planning window opens in 3 months. Plan ahead to avoid delays.</span>
          <button type="button" className="ai-link t-caption-medium cta-link" onClick={() => go('#/requests')}>Plan ahead ›</button>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-main">
          <div className="dash-two">
            <StatusDonut rows={rows} onSeg={setSeg} onAll={() => go('#/requests')} />
            <ClosingSoon rows={rows} onView={view} onAll={() => go('#/requests')} />
          </div>
          <RecentTable rows={rows} onView={view} onAll={() => go('#/requests')} />
        </div>
        <div className="dash-side">
          <RecentActivity rows={rows} go={go} />
          <QuickActions go={go} onNew={onNew} pending={pending.length} />
          <AiSuggestions onNew={onNew} />
        </div>
      </div>

      {seg && (
        <Dialog open onClose={() => setSeg(null)} title={`${STATUS[seg]} requests`} sub={`${rows.filter((r) => r.status === seg).length} requests in this status`} className="sheet"
          foot={<><span className="grow" /><Btn variant="secondary" onClick={() => setSeg(null)}>Close</Btn><Btn variant="primary" onClick={() => go(`#/requests?status=${seg}`)}>Open in My requests</Btn></>}>
          <table className="dash-table t-body-small">
            <thead><tr><th>Request ID</th><th>Title</th><th>Department</th><th>Created</th></tr></thead>
            <tbody>
              {rows.filter((r) => r.status === seg).map((r) => <tr key={r.id} onClick={() => view(r)}><td className="tnum">{r.requestNo || 'Draft'}</td><td>{r.title}</td><td className="muted">{r.department}</td><td className="tnum">{day(r.createdAt)}</td></tr>)}
              {!rows.some((r) => r.status === seg) && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 24 }}>No requests in this status.</td></tr>}
            </tbody>
          </table>
        </Dialog>
      )}
    </main>
  );
}

function Kpi({ tone, icon, label, value, sub, danger, on, onClick }) {
  const n = useCountUp(value);
  return (
    <button type="button" className={`dash-kpi k-${tone}${on ? ' on' : ''}`} aria-expanded={on} onClick={onClick}>
      <span className="kpi-ico"><Icon name={icon} size={16} /></span>
      <span className="grow"><span className="kpi-n tnum">{n}</span><span className="t-body-small kpi-l">{label}</span><span className={`t-caption ${danger ? 'danger-text' : 'muted'}`}>{sub}</span></span>
      <Icon name="icon-chevron-down" size={14} className={`kpi-chev${on ? ' open' : ''}`} />
    </button>
  );
}
function Value({ label, amount, sub, tone = 'brand' }) {
  const n = useCountUp(Math.round(amount));
  return (
    <div className={`dash-kpi k-${tone} value`}>
      <span className="kpi-ico"><Icon name="icon-cash" size={16} /></span>
      <span className="grow"><span className="kpi-v tnum">{n.toLocaleString('en-US')} <span className="t-caption muted">SAR</span></span><span className="t-body-small kpi-l">{label}</span><span className="t-caption muted">{sub}</span></span>
    </div>
  );
}

function DrillPanel({ kind, drafts, subs, tasks, onClose, onView, go, onNew }) {
  const title = { drafts: 'My drafts', subs: 'My submissions', tasks: 'Awaiting your action' }[kind];
  const list = kind === 'drafts' ? drafts : kind === 'subs' ? subs : tasks;
  return (
    <section className="proc-card dash-drill">
      <div className="proc-card-head"><h2 className="t-title">{title} <span className="t-caption muted tnum">{list.length}</span></h2>
        <span className="row-gap">{kind === 'drafts' && <Btn variant="secondary-sm" icon="icon-plus-ink" onClick={onNew}>New request</Btn>}<button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="icon-x" size={16} /></button></span></div>
      <div className="table-scroll">
        <table className="dash-table t-body-small">
          {kind === 'tasks' ? (
            <>
              <thead><tr><th>Request ID</th><th>Task</th><th>Project</th><th>Submitted by</th><th>Due</th><th aria-label="Action" /></tr></thead>
              <tbody>{list.map((t) => { const r = REQUESTS[t.req]; return (
                <tr key={t.id} onClick={() => go(`#/inbox/${t.id}`)}><td className="tnum">{t.req}</td><td>{t.title}</td><td>{r.project}</td><td>{r.requester.name}</td><td className={`tnum${t.hours <= 24 ? ' amber' : ''}`}>{t.left}</td><td><Btn variant="secondary-sm" onClick={(e) => { e.stopPropagation(); go(`#/inbox/${t.id}`); }}>Review</Btn></td></tr>
              ); })}</tbody>
            </>
          ) : (
            <>
              <thead><tr><th>Request ID</th><th>Request title</th><th>{kind === 'subs' ? 'Status' : 'Progress'}</th><th>Last updated</th><th aria-label="Action" /></tr></thead>
              <tbody>{list.map((r) => (
                <tr key={r.id} onClick={() => onView(r)}><td className="tnum">{r.requestNo || 'Draft'}</td><td>{r.title}</td>
                  <td>{kind === 'subs' ? <span className={`status-pill t-caption-medium st-${r.status}`}><span className="pill-dot" />{STATUS[r.status]}</span> : <span className="muted">{r.note || '—'}</span>}</td>
                  <td>{ago(r.updatedAt)}</td><td><Btn variant="secondary-sm" onClick={(e) => { e.stopPropagation(); onView(r); }}>{kind === 'drafts' ? 'Continue' : 'View'}</Btn></td></tr>
              ))}</tbody>
            </>
          )}
        </table>
        {!list.length && <p className="t-body-small muted" style={{ textAlign: 'center', padding: 20 }}>Nothing here right now.</p>}
      </div>
    </section>
  );
}

function StatusDonut({ rows, onSeg, onAll }) {
  const segs = SEG.map(([k, c]) => ({ k, c, n: rows.filter((r) => r.status === k).length })).filter((s) => s.n);
  const tot = segs.reduce((s, x) => s + x.n, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <section className="proc-card">
      <div className="proc-card-head"><h2 className="t-title">Requests by status</h2><button type="button" className="link-btn t-body-small" onClick={onAll}>View all</button></div>
      <div className="donut-wrap">
        <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Requests by status">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--bg-track)" strokeWidth="18" />
          {segs.map((s) => { const len = (s.n / tot) * C; const el = <circle key={s.k} cx="70" cy="70" r={R} fill="none" stroke={s.c} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" className="donut-seg" onClick={() => onSeg(s.k)}><title>{`${STATUS[s.k]}: ${s.n}`}</title></circle>; off += len; return el; })}
          <text x="70" y="68" textAnchor="middle" className="donut-n">{tot}</text>
          <text x="70" y="86" textAnchor="middle" className="donut-l">Total</text>
        </svg>
        <ul className="donut-legend">{segs.map((s) => (
          <li key={s.k}><button type="button" onClick={() => onSeg(s.k)}><span className="lg-dot" style={{ background: s.c }} /><span className="grow t-body-small">{STATUS[s.k]}</span><span className="t-body-small tnum">{s.n}</span><span className="t-caption muted tnum">{Math.round((s.n / tot) * 100)}%</span></button></li>
        ))}</ul>
      </div>
    </section>
  );
}

function ClosingSoon({ rows, onView, onAll }) {
  const list = rows.filter((r) => ['submitted', 'under-review'].includes(r.status)).map((r) => ({ r, left: 2 + (hash(r.id) % 9) })).sort((a, b) => a.left - b.left).slice(0, 4);
  return (
    <section className="proc-card">
      <div className="proc-card-head"><h2 className="t-title">Requests closing soon</h2><button type="button" className="link-btn t-body-small" onClick={onAll}>View all</button></div>
      <ul className="dash-list">{list.map(({ r, left }) => (
        <li key={r.id}><button type="button" onClick={() => onView(r)}>
          <span className="grow"><span className="t-body-medium">{r.title}</span><span className="t-caption muted tnum">{r.requestNo} · Due {day(new Date(+TODAY + left * DAY))}</span></span>
          <span className={`left-pill t-caption-medium${left <= 3 ? ' hot' : ''}`}>{left} days left</span>
        </button></li>
      ))}{!list.length && <li className="t-body-small muted">Nothing is closing soon.</li>}</ul>
    </section>
  );
}

function RecentTable({ rows, onView, onAll }) {
  const [q, setQ] = useState('');
  const list = [...rows].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).filter((r) => !q.trim() || `${r.title} ${r.requestNo}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 10);
  return (
    <section className="proc-card">
      <div className="proc-card-head">
        <h2 className="t-title">My recent 10 requests</h2>
        <span className="row-gap"><label className="search dash-search"><Icon name="icon-search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests…" aria-label="Search recent requests" /></label><button type="button" className="link-btn t-body-small" onClick={onAll}>View all</button></span>
      </div>
      <div className="table-scroll">
        <table className="dash-table t-body-small">
          <thead><tr><th>Request</th><th>Type</th><th>Stage</th><th>Status</th><th>Updated</th><th aria-label="View" /></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} onClick={() => onView(r)}>
              <td><div className="t-body-medium">{r.title}</div><div className="t-caption muted tnum">{r.requestNo || 'Draft'}</div></td>
              <td><span className={`tag ${r.type === 'emarket' ? 'em' : 'blue'}`}>{r.type === 'emarket' ? 'E-Market' : 'Tender'}</span></td>
              <td className="muted">{STAGE[r.status]}</td>
              <td><span className={`status-pill t-caption-medium st-${r.status}`}><span className="pill-dot" />{STATUS[r.status]}</span></td>
              <td className="tnum">{ago(r.updatedAt)}</td>
              <td><button type="button" className="link-btn t-body-small" onClick={(e) => { e.stopPropagation(); onView(r); }}>View</button></td>
            </tr>
          ))}{!list.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>No requests match your search.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}

function RecentActivity({ rows, go }) {
  const { state } = useStore();
  const live = useMemo(() => [
    ...Object.entries(state.done).map(([tid, d]) => ({ key: tid, text: `${taskById(tid, state)?.req || ''} · ${taskById(tid, state)?.title || 'Task'} — ${ACTION_PAST[d.action]}`, when: d.at, kind: d.action === 'return' ? 'warn' : 'ok', href: `#/inbox/${tid}` })),
    ...Object.entries(state.assign).flatMap(([tid, a]) => a.history.slice(-1).map((h) => ({ key: `${tid}-a`, text: h.text, when: h.at, kind: 'info', href: `#/inbox/${tid}` }))),
  ].reverse().slice(0, 4), [state]);
  const seed = rows.filter((r) => r.status !== 'draft').slice(0, 5).map((r) => ({
    key: r.id, text: r.status === 'approved' ? `${r.requestNo} approved — PR ${r.prNumber || 'pending'}` : r.status === 'returned' ? `${r.requestNo} returned for changes` : r.status === 'cancelled' ? `${r.requestNo || r.title} cancelled` : `${r.requestNo} submitted for approval`,
    when: ago(r.updatedAt), kind: r.status === 'returned' ? 'warn' : r.status === 'approved' ? 'ok' : 'send', href: `#/requests/view/${r.id}`,
  }));
  const list = [...live, ...seed].slice(0, 6);
  return (
    <section className="proc-card">
      <div className="proc-card-head"><h2 className="t-title">Recent activity</h2><button type="button" className="link-btn t-body-small" onClick={() => go('#/requests')}>View all activity</button></div>
      <ul className="act-list">{list.map((e) => (
        <li key={e.key}><button type="button" onClick={() => go(e.href)}><span className={`act-dot ${e.kind}`} aria-hidden="true" /><span className="grow"><span className="t-body-small">{e.text}</span><span className="t-caption muted">{e.when}</span></span></button></li>
      ))}</ul>
    </section>
  );
}

function QuickActions({ go, onNew, pending }) {
  const items = [
    ['icon-plus-ink', 'New request', 'Tender, E-Market or help me decide', onNew],
    ['icon-file', 'My requests', 'Track everything you raised', () => go('#/requests')],
    ['icon-inbox', 'Inbox', pending ? `${pending} waiting for you` : 'Nothing waiting', () => go('#/inbox')],
    ['icon-chart', 'Reports', 'Procurement insight and exports', () => go('#/reports')],
  ];
  return (
    <section className="proc-card">
      <h2 className="t-title">Quick actions</h2>
      <div className="qa-grid">{items.map(([ic, t, s, fn]) => (
        <button key={t} type="button" className="qa" onClick={fn}><span className="qa-ico"><Icon name={ic} size={16} /></span><span className="t-body-small t-strong">{t}</span><span className="t-caption muted">{s}</span></button>
      ))}</div>
    </section>
  );
}

function AiSuggestions({ onNew }) {
  return (
    <section className="proc-card ai-sugg">
      <h2 className="t-title"><AiSpark size={14} /> AI assistant suggestions</h2>
      <div className="sugg"><p className="t-body-small">Based on your past activity, you can create this request 40% faster using AI.</p><button type="button" className="ai-link t-caption-medium" onClick={onNew}>Try AI draft ›</button></div>
      <div className="sugg"><p className="t-body-small">3 similar requests found. Reuse details to save time.</p><button type="button" className="ai-link t-caption-medium" onClick={onNew}>Reuse details ›</button></div>
    </section>
  );
}

