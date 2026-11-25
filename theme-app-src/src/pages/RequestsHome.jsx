// My requests: the design-review seed list (24 requests) plus the ones started in
// this session. Select rows to export, sort any column, filter from a side panel
// (status, type, department, created by, date, PR) with saved views, open any
// request to view it. Mirrors design-review's MyRequests page.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Btn, Icon, Segment } from '../components/ui.jsx';
import { useRequests } from '../state/requests.jsx';
import { useActor } from '../state/actor.jsx';
import { sarFmt } from '../components/FormKit.jsx';
import { totals, visibleSteps, sectionStatus } from '../lib/requestRules.js';
import { SEED_REQUESTS } from '../data/myRequests.js';
import { useOverrides } from '../lib/requestOverrides.js';

export const STATUS = { draft: 'Draft', submitted: 'Submitted', 'under-review': 'Under review', approved: 'Approved', returned: 'Returned', cancelled: 'Cancelled' };
export const TYPE = { tendering: 'Tender', emarket: 'Etimad E-Market' };
const DATES = [['any', 'Any time'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['year', 'This year'], ['custom', 'Custom range']];
const PRS = [['any', 'Any'], ['has', 'PR created'], ['none', 'No PR yet']];
const EMPTY = { status: [], type: [], dept: [], by: [], date: 'any', from: '', to: '', pr: 'any' };
const VIEWS = [
  { id: 'all', name: 'All requests', f: EMPTY },
  { id: 'action', name: 'Needs my action', f: { ...EMPTY, status: ['draft', 'returned'] } },
  { id: 'pending', name: 'Awaiting approval', f: { ...EMPTY, status: ['submitted', 'under-review'] } },
  { id: 'pr', name: 'PR created', f: { ...EMPTY, status: ['approved'], pr: 'has' } },
];
const PAGE = 10;
const COLS = [['title', 'Request'], ['status', 'Status'], ['type', 'Type'], ['amount', 'Value (incl. VAT)', 'num'], ['department', 'Department'], ['createdAt', 'Created'], ['prNumber', 'PR number'], ['by', 'Created by']];
const day = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const money = (s) => Number(String(s).replace(/[^\d.]/g, '')) || 0;
export const initials = (n = '') => n.split(/[\s-]+/).filter((w) => w && !/^al$/i.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function matches(r, f, skip) {
  if (skip !== 'status' && f.status.length && !f.status.includes(r.status)) return false;
  if (skip !== 'type' && f.type.length && !f.type.includes(r.type)) return false;
  if (skip !== 'dept' && f.dept.length && !f.dept.includes(r.department)) return false;
  if (skip !== 'by' && f.by.length && !f.by.includes(r.by)) return false;
  if (skip !== 'pr' && f.pr !== 'any' && (f.pr === 'has') !== !!r.prNumber) return false;
  if (skip !== 'date' && f.date !== 'any' && r.createdAt) {
    const d = new Date(r.createdAt).getTime(); const now = Date.now();
    if (f.date === 'year' && new Date(r.createdAt).getFullYear() !== new Date().getFullYear()) return false;
    if (['7', '30', '90'].includes(f.date) && d < now - Number(f.date) * 864e5) return false;
    if (f.date === 'custom' && ((f.from && d < new Date(f.from).getTime()) || (f.to && d > new Date(f.to).getTime() + 864e5 - 1))) return false;
  }
  return true;
}
const activeCount = (f) => f.status.length + f.type.length + f.dept.length + f.by.length + (f.date !== 'any' ? 1 : 0) + (f.pr !== 'any' ? 1 : 0);

/** Every request this person sees: the ones they started here, then the seed list. */
export function useRequestRows() {
  const { list: all } = useRequests();
  const { actor } = useActor();
  const mine = all.filter((r) => (r.createdBy || 'requester') === actor.id);
  const ov = useOverrides();
  return useMemo(() => [
    ...mine.map((r) => {
      const f = r.form;
      const steps = f ? visibleSteps(f, r.routeConfirmed).filter((s) => s.id !== 'review') : [];
      const done = f ? steps.filter((s) => sectionStatus(s.id, f, r.routeConfirmed) === 'done').length : 0;
      const amount = f ? totals(f).total : 0;
      return {
        id: r.id, session: true, title: r.title || 'Untitled request', type: r.type === 'emarket' ? 'emarket' : 'tendering', status: r.status === 'submitted' ? 'submitted' : 'draft',
        requestNo: r.requestNo || '', prNumber: '', department: actor.dept || 'IT & Digital', by: actor.name,
        value: f ? sarFmt(amount) : '—', amount, createdAt: r.createdAt || r.updatedAt, updatedAt: r.updatedAt,
        note: r.requestNo ? null : r.moved ? `Moved items: ${r.moved.join(', ')}` : `${done} of ${steps.length} steps complete`, steps: [done, steps.length],
      };
    }),
    ...SEED_REQUESTS.map((s) => ({ ...s, type: s.type === 'souq-etimad' ? 'emarket' : 'tendering', by: s.createdByName, value: s.budget, amount: money(s.budget) })),
  ].map((r) => (ov[r.id] ? { ...r, ...ov[r.id] } : r)), [mine, actor, ov]);
}

export function RequestsHome({ onNew, onOpen, onView }) {
  const rows = useRequestRows();
  const { list: all } = useRequests();
  const { actor } = useActor();
  const [status, setStatus] = useState('all');
  const [f, setF] = useState(EMPTY);
  const [viewId, setViewId] = useState('all');
  const [views, setViews] = useState(VIEWS);
  const [panel, setPanel] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 });
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState(() => new Set());

  const query = q.trim().toLowerCase();
  const searched = rows.filter((r) => !query || `${r.title} ${r.requestNo} ${r.department} ${r.by} ${r.prNumber}`.toLowerCase().includes(query));
  const filtered = searched.filter((r) => matches(r, f));
  const shown = filtered.filter((r) => status === 'all' || r.status === status);
  const sorted = useMemo(() => [...shown].sort((a, b) => {
    // Status sorts in workflow order, not alphabetically.
    const rank = (r) => (sort.key === 'status' ? Object.keys(STATUS).indexOf(r.status) : r[sort.key] ?? '');
    const va = rank(a), vb = rank(b);
    return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
  }), [shown, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const at = Math.min(page, pages - 1);
  const slice = sorted.slice(at * PAGE, at * PAGE + PAGE);
  const count = (k) => filtered.filter((r) => k === 'all' || r.status === k).length;
  useEffect(() => { setPage(0); }, [q, f, status]);
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : key === 'createdAt' || key === 'amount' ? -1 : 1 }));
  const allOnPage = slice.length > 0 && slice.every((r) => sel.has(r.id));
  const someOnPage = slice.some((r) => sel.has(r.id));
  const toggle = (id) => setSel((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const togglePage = () => setSel((s) => { const x = new Set(s); slice.forEach((r) => (allOnPage ? x.delete(r.id) : x.add(r.id))); return x; });
  const open = (r) => (r.session && r.status === 'draft' ? onOpen(r.id) : onView(r.id));
  const n = activeCount(f);
  const view = views.find((v) => v.id === viewId);

  const exportCsv = () => {
    const list = sel.size ? sorted.filter((r) => sel.has(r.id)) : sorted;
    const cells = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [['Request number', 'Request', 'Status', 'Type', 'Department', 'Value', 'Created on', 'PR number', 'Created by'],
      ...list.map((r) => [r.requestNo || 'Draft', r.title, STATUS[r.status], TYPE[r.type], r.department, r.value, (r.createdAt || '').slice(0, 10), r.prNumber, r.by])].map((l) => l.map(cells).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = sel.size ? `my-requests-${sel.size}-selected.csv` : 'my-requests.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const chips = [
    ...f.status.map((s) => [STATUS[s], () => setF({ ...f, status: f.status.filter((x) => x !== s) })]),
    ...f.type.map((s) => [TYPE[s], () => setF({ ...f, type: f.type.filter((x) => x !== s) })]),
    ...f.dept.map((s) => [s, () => setF({ ...f, dept: f.dept.filter((x) => x !== s) })]),
    ...f.by.map((s) => [s, () => setF({ ...f, by: f.by.filter((x) => x !== s) })]),
    ...(f.date !== 'any' ? [[f.date === 'custom' ? `${f.from || '…'} – ${f.to || '…'}` : DATES.find((d) => d[0] === f.date)[1], () => setF({ ...f, date: 'any', from: '', to: '' })]] : []),
    ...(f.pr !== 'any' ? [[PRS.find((p) => p[0] === f.pr)[1], () => setF({ ...f, pr: 'any' })]] : []),
  ];

  return (
    <main className="detail standalone req-home" aria-labelledby="rh-title">
      <div className="req-home-head">
        <div>
          <h1 className="t-display" id="rh-title">My requests <span className="count-chip t-body-small" title="Total requests">{rows.length}</span></h1>
          <p className="t-body-small muted" style={{ margin: '4px 0 0' }}>Track your tenders and Etimad E-Market purchases from draft to award.</p>
        </div>
        <div className="row-gap">
          <Btn variant="secondary" icon="icon-download" onClick={exportCsv}>{sel.size ? `Export (${sel.size})` : 'Export'}</Btn>
          <Btn variant="primary" icon="icon-plus" onClick={onNew}>New request</Btn>
        </div>
      </div>
      <DraftNudge list={all.filter((r) => (r.createdBy || 'requester') === actor.id)} onOpen={onOpen} />

      <div className="rh-toolbar">
        <Segment size="sm" label="Filter by status" value={status} onChange={setStatus}
          items={[{ id: 'all', label: 'All', count: count('all') }, ...Object.entries(STATUS).map(([k, l]) => ({ id: k, label: l, count: count(k) }))]} />
        <div className="rh-tools">
          <label className="search rh-search"><Icon name="icon-search" size={16} /><span className="sr-only">Search requests</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, title, PR or person" /></label>
          {view && view.id !== 'all' && <span className="view-pill t-body-small">View: <strong>{view.name}</strong></span>}
          <button type="button" className={`filter-btn${n ? ' on' : ''}`} onClick={() => setPanel(true)} aria-haspopup="dialog">
            <Icon name="icon-filter" size={16} />Filters{n > 0 && <span className="filter-n">{n}</span>}
          </button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="chip-row">
          {chips.map(([label, clear]) => <span key={label} className="f-chip t-body-small">{label}<button type="button" aria-label={`Remove ${label}`} onClick={() => { clear(); setViewId(''); }}><Icon name="icon-x" size={12} /></button></span>)}
          <button type="button" className="link-btn t-body-small" onClick={() => { setF(EMPTY); setViewId('all'); }}>Clear all</button>
        </div>
      )}

      {sel.size > 0 && (
        <div className="sel-bar" role="status">
          <span className="t-body-medium">{sel.size} selected</span>
          <span className="grow" />
          <Btn variant="secondary-sm" icon="icon-download" onClick={exportCsv}>Export selected</Btn>
          <button type="button" className="link-btn t-body-small" onClick={() => setSel(new Set())}>Clear selection</button>
        </div>
      )}

      <div className="table-scroll rh-table-wrap">
        <table className="plain-table req-table">
          <thead>
            <tr>
              <th className="check-col"><Check on={allOnPage} mixed={!allOnPage && someOnPage} label="Select all on this page" onChange={togglePage} /></th>
              {COLS.map(([k, label, cls]) => (
                <th key={k} className={cls} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={`sort-btn${sort.key === k ? ' on' : ''}`} onClick={() => toggleSort(k)}>
                    {label}<span className={`sort-ico${sort.key === k ? (sort.dir === 1 ? ' asc' : ' desc') : ''}`} aria-hidden="true"><Icon name="icon-chevron-down" size={12} /></span>
                  </button>
                </th>
              ))}
              <th className="act-col"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const on = sel.has(r.id);
              return (
                <tr key={r.id} className={`req-row${on ? ' is-selected' : ''}`} onClick={() => open(r)}>
                  <td className="check-col" onClick={(e) => e.stopPropagation()}><Check on={on} label={`Select ${r.title}`} onChange={() => toggle(r.id)} /></td>
                  <td className="title-col">
                    <a href={r.session && r.status === 'draft' ? `#/requests/${r.id}` : `#/requests/view/${r.id}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(r); }} className="t-body-medium">{r.title}</a>
                    <div className="t-caption muted"><span className="tnum">{r.requestNo || 'No number yet'}</span>{r.note && ` · ${r.note}`}</div>
                  </td>
                  <td><span className={`status-pill t-caption-medium st-${r.status}`}><span className="pill-dot" />{STATUS[r.status]}</span></td>
                  <td><span className={`tag ${r.type === 'emarket' ? 'em' : 'blue'}`}>{TYPE[r.type]}</span></td>
                  <td className="num">{r.value}</td>
                  <td className="muted dept-col">{r.department}</td>
                  <td className="muted">{r.createdAt ? day(r.createdAt) : '—'}</td>
                  <td className="muted tnum">{r.prNumber || '—'}</td>
                  <td><span className="by-cell"><span className="avatar-dot" aria-hidden="true">{initials(r.by)}</span>{r.by}</span></td>
                  <td className="act-col"><button type="button" className="icon-btn row-view" aria-label={`View ${r.title}`} title={r.session && r.status === 'draft' ? 'Continue editing' : 'View request'} onClick={(e) => { e.stopPropagation(); open(r); }}><Icon name={r.session && r.status === 'draft' ? 'icon-pencil' : 'icon-eye'} size={16} /></button></td>
                </tr>
              );
            })}
            {!slice.length && (
              <tr><td colSpan={COLS.length + 2}>
                <div className="req-empty">
                  <div className="t-title">{rows.length ? 'No requests match' : 'No requests yet'}</div>
                  <div className="t-body-small muted">Try another search or adjust the filters.</div>
                  {(n > 0 || q || status !== 'all') && <Btn variant="secondary-sm" onClick={() => { setF(EMPTY); setQ(''); setStatus('all'); setViewId('all'); }}>Clear search & filters</Btn>}
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > 0 && (
        <div className="rh-pager t-body-small">
          <span className="muted tnum">Showing {at * PAGE + 1}–{Math.min(sorted.length, at * PAGE + PAGE)} of {sorted.length}{sel.size > 0 && <strong className="brand-text"> · {sel.size} selected</strong>}</span>
          <span className="row-gap">
            <Btn variant="secondary-sm" disabled={at === 0} onClick={() => setPage(at - 1)}>Previous</Btn>
            {Array.from({ length: pages }, (_, i) => <button key={i} type="button" className={`page-n${i === at ? ' on' : ''}`} aria-current={i === at ? 'page' : undefined} onClick={() => setPage(i)}>{i + 1}</button>)}
            <Btn variant="secondary-sm" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>Next</Btn>
          </span>
        </div>
      )}

      {panel && (
        <FilterPanel rows={searched} applied={f} views={views} viewId={viewId} onClose={() => setPanel(false)}
          onApply={(nf, vid) => { setF(nf); setViewId(vid); setPanel(false); }}
          onSaveView={(name, nf) => { const v = { id: `v-${Date.now()}`, name, f: nf, own: true }; setViews((vs) => [...vs, v]); return v.id; }}
          onDeleteView={(id) => { setViews((vs) => vs.filter((v) => v.id !== id)); if (viewId === id) setViewId(''); }} />
      )}
    </main>
  );
}

function Check({ on, mixed, label, onChange }) {
  return <input type="checkbox" className="row-check" checked={on} aria-label={label} ref={(el) => { if (el) el.indeterminate = !!mixed; }} onChange={onChange} />;
}

/** A draft of yours that's partly done — pick it up where you left off. */
function DraftNudge({ list, onOpen }) {
  const draft = list.find((r) => r.status !== 'submitted' && r.routeConfirmed && r.form);
  if (!draft) return null;
  const steps = visibleSteps(draft.form, true).filter((s) => s.id !== 'review');
  const done = steps.filter((s) => sectionStatus(s.id, draft.form, true) === 'done').length;
  if (done >= steps.length) return null;
  return (
    <div className="banner brand">
      <Icon name="icon-file" size={16} />
      <div className="banner-text"><div className="t-body-medium">Continue “{draft.title}”</div><div className="t-body-small">{done} of {steps.length} steps done. Pick up where you left off.</div></div>
      <Btn variant="secondary-sm" onClick={() => onOpen(draft.id)}>Continue</Btn>
    </div>
  );
}

const Opt = ({ on, onClick, n, children }) => (
  <label className={`f-opt${n === 0 && !on ? ' none' : ''}`}><input type="checkbox" checked={on} onChange={onClick} /><span className="grow f-opt-label">{children}</span><span className="t-caption muted tnum">{n}</span></label>
);
const Sect = ({ title, k, n, children }) => (
  <details className="f-sect" open={k === 'status' || n > 0 || undefined}>
    <summary><span className="t-body-medium grow">{title}</span>{n > 0 && <span className="filter-n">{n}</span>}<Icon name="icon-chevron-down" size={14} className="chev" /></summary>
    <div className="f-sect-body">{children}</div>
  </details>
);

/* ── Filter side panel: facets with live counts, date range, PR, saved views ── */
function FilterPanel({ rows, applied, views, viewId, onClose, onApply, onSaveView, onDeleteView }) {
  const [f, setF] = useState(applied);
  const [vid, setVid] = useState(viewId);
  const [menu, setMenu] = useState(false);
  const [naming, setNaming] = useState(null);
  const [deptQ, setDeptQ] = useState('');
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  const result = rows.filter((r) => matches(r, f)).length;
  const facet = (s, pred) => rows.filter((r) => matches(r, f, s) && pred(r)).length;
  const upd = (nf) => { setF(nf); setVid(''); };
  const tog = (k, v) => upd({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const depts = [...new Set(rows.map((r) => r.department))].sort();
  const people = [...new Set(rows.map((r) => r.by))].sort();
  const cur = views.find((v) => v.id === vid);
  return createPortal(
    <>
      <div className="f-scrim" onClick={onClose} />
      <aside className="f-panel" role="dialog" aria-label="Filters">
        <div className="f-head">
          <div className="grow">
            <div className="t-caption muted">Filters</div>
            <button type="button" className="f-view-btn" aria-expanded={menu} onClick={() => setMenu(!menu)}>{cur ? cur.name : 'Custom filter'}<Icon name="icon-chevron-down" size={14} /></button>
            {menu && (
              <div className="f-view-menu" role="menu">
                <div className="t-caption muted" style={{ padding: '4px 12px' }}>Saved views</div>
                {views.map((v) => (
                  <div key={v.id} role="menuitemradio" aria-checked={v.id === vid} tabIndex={0} className={`f-view-row${v.id === vid ? ' on' : ''}`} onClick={() => { setF(v.f); setVid(v.id); setMenu(false); }} onKeyDown={(e) => e.key === 'Enter' && (setF(v.f), setVid(v.id), setMenu(false))}>
                    <span className="f-tick">{v.id === vid && <Icon name="icon-check-brand" size={14} />}</span>
                    <span className="grow t-body-small">{v.name}</span>
                    <span className="t-caption muted tnum">{rows.filter((r) => matches(r, v.f)).length}</span>
                    {v.own && <button type="button" className="link-btn t-caption danger-text" onClick={(e) => { e.stopPropagation(); onDeleteView(v.id); }}>Delete</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="icon-btn" aria-label="Close filters" onClick={onClose}><Icon name="icon-x" size={18} /></button>
        </div>
        <div className="f-body">
          <Sect title="Status" k="status" n={f.status.length}>
            {Object.entries(STATUS).map(([k, l]) => <Opt key={k} on={f.status.includes(k)} onClick={() => tog('status', k)} n={facet('status', (r) => r.status === k)}><span className={`status-dot st-${k}`} />{l}</Opt>)}
          </Sect>
          <Sect title="Type" k="type" n={f.type.length}>
            {Object.entries(TYPE).map(([k, l]) => <Opt key={k} on={f.type.includes(k)} onClick={() => tog('type', k)} n={facet('type', (r) => r.type === k)}>{l}</Opt>)}
          </Sect>
          <Sect title="Department" k="dept" n={f.dept.length}>
            {depts.length > 5 && <label className="search f-search"><Icon name="icon-search" size={14} /><input value={deptQ} onChange={(e) => setDeptQ(e.target.value)} placeholder="Find a department" aria-label="Find a department" /></label>}
            {depts.filter((d) => !deptQ || d.toLowerCase().includes(deptQ.toLowerCase())).map((d) => <Opt key={d} on={f.dept.includes(d)} onClick={() => tog('dept', d)} n={facet('dept', (r) => r.department === d)}>{d}</Opt>)}
          </Sect>
          <Sect title="Created by" k="by" n={f.by.length}>
            {people.map((p) => <Opt key={p} on={f.by.includes(p)} onClick={() => tog('by', p)} n={facet('by', (r) => r.by === p)}><span className="avatar-dot sm" aria-hidden="true">{initials(p)}</span>{p}</Opt>)}
          </Sect>
          <Sect title="Created on" k="date" n={f.date !== 'any' ? 1 : 0}>
            <div className="f-radios">{DATES.map(([k, l]) => <label key={k} className="f-opt"><input type="radio" name="f-date" checked={f.date === k} onChange={() => upd({ ...f, date: k })} /><span className="grow">{l}</span></label>)}</div>
            {f.date === 'custom' && <div className="f-range"><label><span className="t-caption muted">From</span><input type="date" className="finput" value={f.from} onChange={(e) => upd({ ...f, from: e.target.value })} /></label><label><span className="t-caption muted">To</span><input type="date" className="finput" value={f.to} onChange={(e) => upd({ ...f, to: e.target.value })} /></label></div>}
          </Sect>
          <Sect title="PR number" k="pr" n={f.pr !== 'any' ? 1 : 0}>
            {PRS.map(([k, l]) => <label key={k} className="f-opt"><input type="radio" name="f-pr" checked={f.pr === k} onChange={() => upd({ ...f, pr: k })} /><span className="grow">{l}</span><span className="t-caption muted tnum">{k === 'any' ? '' : facet('pr', (r) => (k === 'has') === !!r.prNumber)}</span></label>)}
          </Sect>
        </div>
        <div className="f-foot">
          {naming == null ? (
            <>
              <button type="button" className="link-btn t-body-small" onClick={() => upd(EMPTY)}>Reset all</button>
              {activeCount(f) > 0 && !cur && <button type="button" className="link-btn t-body-small" onClick={() => setNaming('')}>Save as view</button>}
              <span className="grow" />
              <Btn variant="primary" onClick={() => onApply(f, vid)}>Show {result} request{result === 1 ? '' : 's'}</Btn>
            </>
          ) : (
            <form className="row-gap grow" onSubmit={(e) => { e.preventDefault(); if (naming.trim()) { const id = onSaveView(naming.trim(), f); setVid(id); setNaming(null); } }}>
              <input autoFocus className="finput grow" value={naming} onChange={(e) => setNaming(e.target.value)} placeholder="View name" aria-label="View name" />
              <Btn variant="secondary-sm" type="button" onClick={() => setNaming(null)}>Cancel</Btn>
              <Btn variant="primary" type="submit" disabled={!naming.trim()}>Save</Btn>
            </form>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
