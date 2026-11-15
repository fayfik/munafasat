// My requests: the design-review seed list (24 requests) plus the ones started
// in this session, with status tabs, type filter, search, CSV export and paging.
import { useMemo, useState } from 'react';
import { Btn, Empty, Icon, Segment } from '../components/ui.jsx';
import { AiCard } from '../components/AiKit.jsx';
import { useRequests } from '../state/requests.jsx';
import { useActor } from '../state/actor.jsx';
import { sarFmt } from '../components/FormKit.jsx';
import { totals, visibleSteps, sectionStatus } from '../lib/requestRules.js';
import { SEED_REQUESTS } from '../data/myRequests.js';

const STATUS = { draft: 'Draft', submitted: 'Submitted', 'under-review': 'Under review', approved: 'Approved', returned: 'Returned' };
const TYPE = { tendering: 'Tender', emarket: 'Etimad E-Market' };
const PAGE = 10;
const day = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function RequestsHome({ onNew, onOpen }) {
  const { list: all } = useRequests();
  const { actor } = useActor();
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  // Session requests this person started (older drafts without an owner belong to the requester) + the seed list.
  const mine = all.filter((r) => (r.createdBy || 'requester') === actor.id);
  const rows = useMemo(() => [
    ...mine.map((r) => {
      const f = r.form;
      const steps = f ? visibleSteps(f, r.routeConfirmed).filter((s) => s.id !== 'review') : [];
      const done = f ? steps.filter((s) => sectionStatus(s.id, f, r.routeConfirmed) === 'done').length : 0;
      return {
        id: r.id, session: true, title: r.title || 'Untitled request', type: r.type === 'emarket' ? 'emarket' : 'tendering', status: r.status === 'submitted' ? 'submitted' : 'draft',
        requestNo: r.requestNo || '', prNumber: '', department: actor.dept || 'IT & Digital', by: actor.name,
        value: f ? sarFmt(totals(f).total) : '—', createdAt: r.createdAt || r.updatedAt, updatedAt: r.updatedAt,
        note: r.requestNo ? null : r.moved ? `Moved items: ${r.moved.join(', ')}` : `${done} of ${steps.length} steps complete`,
      };
    }),
    ...SEED_REQUESTS.map((s) => ({ ...s, type: s.type === 'souq-etimad' ? 'emarket' : 'tendering', by: s.createdByName, value: s.budget })),
  ], [mine, actor]);

  const query = q.trim().toLowerCase();
  const byType = rows.filter((r) => type === 'all' || r.type === type).filter((r) => !query || `${r.title} ${r.requestNo} ${r.department} ${r.by}`.toLowerCase().includes(query));
  const shown = byType.filter((r) => status === 'all' || r.status === status);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const at = Math.min(page, pages - 1);
  const slice = shown.slice(at * PAGE, at * PAGE + PAGE);
  const count = (k) => byType.filter((r) => k === 'all' || r.status === k).length;
  const go = (fn) => { fn(); setPage(0); };

  const exportCsv = () => {
    const cells = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [['Request number', 'Request', 'Status', 'Type', 'Department', 'Value', 'Created on', 'PR number', 'Created by'],
      ...shown.map((r) => [r.requestNo || 'Draft', r.title, STATUS[r.status], TYPE[r.type], r.department, r.value, (r.createdAt || '').slice(0, 10), r.prNumber, r.by])].map((l) => l.map(cells).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'my-requests.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <main className="detail standalone req-home" aria-labelledby="rh-title">
      <div className="req-home-head">
        <div>
          <h1 className="t-display" id="rh-title">My requests <span className="count-chip t-body-small" title="Total requests">{rows.length}</span></h1>
          <p className="t-body-small muted" style={{ margin: '4px 0 0' }}>Track your tenders and Etimad E-Market purchases from draft to award.</p>
        </div>
        <Btn variant="primary" icon="icon-plus" onClick={onNew}>New request</Btn>
      </div>
      <Suggestions list={mine} onNew={onNew} onOpen={onOpen} />

      <div className="rh-toolbar">
        <Segment size="sm" label="Filter by status" value={status} onChange={(v) => go(() => setStatus(v))}
          items={[{ id: 'all', label: 'All', count: count('all') }, ...Object.entries(STATUS).map(([k, l]) => ({ id: k, label: l, count: count(k) }))]} />
        <div className="rh-tools">
          <label className="search rh-search"><Icon name="icon-search" size={16} /><span className="sr-only">Search requests</span>
            <input type="search" value={q} onChange={(e) => go(() => setQ(e.target.value))} placeholder="Search title, number or person" /></label>
          <select className="finput fselect rh-type" value={type} onChange={(e) => go(() => setType(e.target.value))} aria-label="Filter by type">
            <option value="all">All types</option><option value="tendering">Tender</option><option value="emarket">Etimad E-Market</option>
          </select>
          <Btn variant="secondary-sm" icon="icon-download" onClick={exportCsv}>Export</Btn>
        </div>
      </div>

      {shown.length ? (
        <>
          <div className="table-scroll">
            <table className="plain-table req-table">
              <thead><tr><th>Request</th><th>Status</th><th>Type</th><th className="num">Value (incl. VAT)</th><th>Created</th><th>PR number</th><th>Created by</th></tr></thead>
              <tbody>
                {slice.map((r) => (
                  <tr key={r.id} className={r.session ? 'req-row' : 'req-row seed'} onClick={r.session ? () => onOpen(r.id) : undefined}>
                    <td>
                      {r.session ? <a href={`#/requests/${r.id}`} onClick={(e) => { e.preventDefault(); onOpen(r.id); }} className="t-body-medium">{r.title}</a> : <span className="t-body-medium">{r.title}</span>}
                      <div className="t-caption muted">{[r.requestNo || (r.status === 'draft' ? 'Draft — no number yet' : ''), r.note || r.department].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td><span className={`status-pill t-caption-medium st-${r.status}`}><span className="pill-dot" />{STATUS[r.status]}</span></td>
                    <td><span className={`tag ${r.type === 'emarket' ? 'em' : 'blue'}`}>{TYPE[r.type]}</span></td>
                    <td className="num">{r.value}</td>
                    <td className="muted nowrap">{r.createdAt ? day(r.createdAt) : '—'}</td>
                    <td className="muted tnum">{r.prNumber || '—'}</td>
                    <td className="muted nowrap">{r.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rh-pager t-body-small">
            <span className="muted">{at * PAGE + 1}–{Math.min(shown.length, at * PAGE + PAGE)} of {shown.length}</span>
            <span className="row-gap">
              <Btn variant="secondary-sm" disabled={at === 0} onClick={() => setPage(at - 1)}>Previous</Btn>
              <Btn variant="secondary-sm" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>Next</Btn>
            </span>
          </div>
        </>
      ) : (
        <div className="req-empty"><Empty icon="icon-file" title="No requests match" sub="Change the filters, or start a new request." /><Btn variant="secondary" onClick={() => { setStatus('all'); setType('all'); setQ(''); }}>Clear filters</Btn></div>
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
