import { useState } from 'react';
import { Icon, Segment, Btn } from './ui.jsx';
import { Dialog, MoreMenu, Select } from './FormKit.jsx';
import { ACTION_PAST } from '../data/tasks.js';
import { REQUESTS } from '../data/requests.js';
import { useStore } from '../state/store.jsx';
import { useActor } from '../state/actor.jsx';
import { actorById, isLead, teamById } from '../data/actors.js';
import { assigneeOf, teamLoad, delegatedBy, delegatesFor, workload } from '../lib/assign.js';

/* Inbox column. People in a team switch between their own tasks and the team queue;
   the team lead also sees who holds what and each member's workload. */
const SORTS = [['due', 'Sort: Due date'], ['received', 'Sort: Received'], ['priority', 'Sort: Priority'], ['status', 'Sort: Status']];
const NOF = { type: 'all', prio: 'all', dept: 'all', sort: 'due' };
const urgent = (x) => x.hours <= 24;
const deptOf = (x) => REQUESTS[x.req].requester.dept;

export function InboxColumn({ tasks, team = [], scope = 'mine', onScope, currentId, onOpen, layout = 'compact', onLayout }) {
  const { state, dispatch } = useStore();
  const { actor } = useActor();
  const [filters, setFilters] = useState(false);
  const [fl, setFl] = useState(NOF);
  const [delegating, setDelegating] = useState(false);
  const [note, setNote] = useState('');
  const deleg = state.delegation?.[actor.id];
  const away = delegatedBy(actor, state);
  const [view, setView] = useState('needs');
  const [tview, setTview] = useState('queue');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const lead = isLead(actor);
  const t = teamById(actor.team);
  const pending = tasks.filter((x) => !state.done[x.id]);
  const done = tasks.filter((x) => state.done[x.id]);
  const queued = team.filter((x) => !assigneeOf(x, state));
  const held = team.filter((x) => assigneeOf(x, state));
  const query = q.trim().toLowerCase();
  const match = (x) => (!query || [x.req, x.title, REQUESTS[x.req].project, REQUESTS[x.req].requester.name, deptOf(x)].join(' ').toLowerCase().includes(query))
    && (fl.type === 'all' || x.title === fl.type) && (fl.prio === 'all' || (fl.prio === 'urgent') === urgent(x)) && (fl.dept === 'all' || deptOf(x) === fl.dept);
  const order = TASK_ORDER(state);
  const sorted = (l) => [...l].sort(fl.sort === 'received' ? (a, b) => order(b) - order(a) : fl.sort === 'status' ? (a, b) => (!!state.done[a.id] - !!state.done[b.id]) || (b.unread && !state.read[b.id]) - (a.unread && !state.read[a.id]) : (a, b) => a.hours - b.hours);
  const pool = [...tasks, ...team, ...away];
  const opts = (fn) => [...new Set(pool.map(fn))].sort();
  const nf = (fl.type !== 'all') + (fl.prio !== 'all') + (fl.dept !== 'all');

  let groups;
  if (scope === 'team') {
    const l = sorted((tview === 'queue' ? queued : tview === 'held' ? held : team).filter(match));
    groups = tview === 'all' ? [['Waiting to be picked up', l.filter((x) => !assigneeOf(x, state))], ['Picked up', l.filter((x) => assigneeOf(x, state))]] : [[tview === 'queue' ? 'Waiting to be picked up' : 'Picked up', l]];
  } else {
    const list = sorted((view === 'done' ? done : view === 'all' ? [...tasks, ...away.filter((x) => !tasks.includes(x))] : pending).filter(match));
    groups = view === 'needs' && fl.sort === 'due'
      ? [['Due within a day', list.filter((x) => x.hours <= 24)], ['Later this week', list.filter((x) => x.hours > 24)]]
      : view === 'needs' ? [['Needs action', list]]
      : [[view === 'done' ? 'Done' : 'All tasks', list]];
  }
  const empty = groups.every(([, items]) => !items.length);
  const rows = groups.flatMap(([, items]) => items);
  const exportXls = () => {
    const head = ['Task ID', 'Task', 'Req no.', 'Project', 'Requested by', 'Department', 'Due', 'Time left', 'Status'];
    const body = rows.map((x) => [x.id, x.title, x.req, REQUESTS[x.req].project, REQUESTS[x.req].requester.name, deptOf(x), x.due, x.left, state.done[x.id] ? ACTION_PAST[state.done[x.id].action] : away.includes(x) ? `Delegated to ${actorById(deleg.to).name}` : assigneeOf(x, state) ? 'Open' : 'In team queue']);
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' })); a.download = `inbox-${actor.id}.xls`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    flash(`${rows.length} tasks downloaded as Excel`);
  };
  const flash = (t) => { setNote(t); setTimeout(() => setNote(''), 2600); };
  const cancelDelegation = () => { dispatch({ type: 'undelegate', from: actor.id, text: `Delegation cancelled — back with ${actor.name}` }); flash('Delegation cancelled — tasks are back in your inbox'); };

  return (
    <section className={`inbox${layout === 'list' ? ' wide' : ''}`} aria-labelledby="inbox-title">
      <div className="inbox-header">
        <div className="inbox-title-row">
          {t ? (
            <div className="scope-tabs" role="tablist" aria-label="Inbox" id="inbox-title">
              <button type="button" role="tab" aria-selected={scope === 'mine'} className="scope-tab" onClick={() => onScope('mine')}><span className="t-heading">My tasks</span><span className="count-pill t-caption-medium">{pending.length}</span></button>
              <button type="button" role="tab" aria-selected={scope === 'team'} className="scope-tab" onClick={() => onScope('team')} data-team-queue>
                <span className="t-heading">Team queue</span><span className={`count-pill t-caption-medium${queued.length ? ' warn' : ''}`}>{queued.length}</span>
              </button>
            </div>
          ) : (
            <h2 className="inbox-title" id="inbox-title"><span className="t-heading">Inbox</span><span className="count-pill t-caption-medium">{pending.length}</span></h2>
          )}
          <div className="inbox-tools">
            <button className="icon-btn" type="button" aria-label="Search tasks" aria-expanded={searching} onClick={() => setSearching(!searching)}><Icon name="icon-search" size={19} /></button>
            <button className={`icon-btn${nf ? ' has-dot' : ''}`} type="button" aria-label={`Filter and sort${nf ? ` (${nf} filters on)` : ''}`} aria-expanded={filters} onClick={() => setFilters(!filters)}><Icon name="icon-filter" size={18} /></button>
            {onLayout && <button className="icon-btn" type="button" aria-label={layout === 'list' ? 'Compact view — list and task side by side' : 'List view — full-width table, act from the row'} title={layout === 'list' ? 'Compact view' : 'List view'} onClick={() => { onLayout(layout === 'list' ? 'compact' : 'list'); flash(layout === 'list' ? 'Switched to Compact view' : 'Switched to List view'); }}><Icon name={layout === 'list' ? 'icon-panel-close' : 'icon-grid'} size={18} /></button>}
            <MoreMenu label="Inbox actions" items={[
              { label: 'Download as Excel', onClick: exportXls },
              ...(scope === 'mine' ? [deleg ? { label: 'Cancel delegation', onClick: cancelDelegation } : { label: 'Delegate my inbox', onClick: () => setDelegating(true), disabled: !pending.length }] : []),
            ]} />
          </div>
        </div>
        {note && <div className="inbox-note t-caption" role="status">{note}</div>}
        {deleg && scope === 'mine' && (
          <div className="deleg-banner">
            <span className="avatar-dot" aria-hidden="true">{actorById(deleg.to).initials}</span>
            <span className="grow"><span className="t-body-small t-strong">Delegated to {actorById(deleg.to).name}</span><span className="t-caption muted">Until {fmtDay(deleg.until)} · {away.filter((x) => !state.done[x.id]).length} tasks with them{deleg.newToo ? ' · new tasks too' : ''}</span></span>
            <button type="button" className="inline-link t-caption" onClick={cancelDelegation}>Cancel delegation</button>
          </div>
        )}
        {filters && (
          <div className="inbox-filters">
            <Select value={fl.type} onChange={(e) => setFl({ ...fl, type: e.target.value })} aria-label="Task type"><option value="all">All types</option>{opts((x) => x.title).map((v) => <option key={v}>{v}</option>)}</Select>
            <Select value={fl.prio} onChange={(e) => setFl({ ...fl, prio: e.target.value })} aria-label="Priority"><option value="all">All priorities</option><option value="urgent">Urgent — due within a day</option><option value="normal">Normal</option></Select>
            <Select value={fl.dept} onChange={(e) => setFl({ ...fl, dept: e.target.value })} aria-label="Department"><option value="all">All departments</option>{opts(deptOf).map((v) => <option key={v}>{v}</option>)}</Select>
            <Select value={fl.sort} onChange={(e) => setFl({ ...fl, sort: e.target.value })} aria-label="Sort">{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            {(nf > 0 || fl.sort !== 'due') && <button type="button" className="inline-link t-caption" onClick={() => setFl(NOF)}>Clear</button>}
          </div>
        )}
        {searching && (
          <label className="search inbox-search">
            <Icon name="icon-search" size={16} />
            <span className="sr-only">Search tasks</span>
            <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search request, task, project…" onKeyDown={(e) => e.key === 'Escape' && (setQ(''), setSearching(false))} />
          </label>
        )}
        {scope === 'team' ? (
          <>
            <p className="t-caption muted team-line">{t.name} team · {lead ? 'you assign and reassign' : 'pick up a task to work on it'}</p>
            {lead && <TeamLoad teamId={t.id} />}
            <Segment label="Filter team tasks" value={tview} onChange={setTview} items={[
              { id: 'queue', label: 'Unassigned', count: queued.length || null },
              ...(lead ? [{ id: 'held', label: 'Assigned', count: held.length || null }, { id: 'all', label: 'All' }] : []),
            ]} />
          </>
        ) : (
          <Segment label="Filter tasks" value={view} onChange={setView} items={[
            { id: 'needs', label: 'Needs action', count: pending.length || null },
            { id: 'overdue', label: 'Overdue', disabled: true, title: 'No overdue tasks' },
            { id: 'done', label: 'Done', count: done.length || null },
            { id: 'all', label: 'All' },
          ]} />
        )}
      </div>
      <div className="inbox-list">
        {empty && deleg && scope === 'mine' && view === 'needs' && !query && !nf ? (
          <div className="panel-empty">
            <div className="t-title" style={{ color: 'var(--ink-primary)' }}>Your tasks are with {actorById(deleg.to).name}</div>
            <div className="t-body-small">Find them under All. Cancel the delegation to bring them back.</div>
          </div>
        ) : empty && (
          <div className="panel-empty">
            <div className="t-title" style={{ color: 'var(--ink-primary)' }}>{query || nf ? 'No tasks match' : scope === 'team' ? (tview === 'queue' ? 'The queue is empty' : 'Nothing picked up') : view === 'done' ? 'Nothing done yet' : 'You’re all caught up'}</div>
            <div className="t-body-small">{query || nf ? 'No tasks match this view or your filters.' : scope === 'team' ? 'New requests for your team land here first.' : view === 'done' ? 'Tasks you complete show up here.' : 'New tasks will appear here.'}</div>
          </div>
        )}
        {layout === 'list' ? (!empty && <TaskTable rows={rows} team={scope === 'team'} away={away} onOpen={onOpen} />) : groups.filter(([, items]) => items.length).map(([label, items]) => (
          <div key={label}>
            <div className="group-head t-caption"><span>{label}</span><span>{items.length}</span></div>
            {items.map((x) => <Row key={x.id} task={x} team={scope === 'team'} delegated={away.includes(x) ? deleg?.to : null} current={x.id === currentId} onOpen={onOpen} />)}
          </div>
        ))}
      </div>
      {delegating && <DelegateDialog tasks={pending} onClose={() => setDelegating(false)} onDone={(n, to) => { setDelegating(false); flash(`${n} tasks delegated to ${actorById(to).name}`); }} />}
    </section>
  );
}

const fmtDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const TASK_ORDER = () => (x) => Number(x.id.replace(/\D/g, ''));

/** Delegate my inbox: tasks move to a colleague for a period; cancel any time to bring them back. */
function DelegateDialog({ tasks, onClose, onDone }) {
  const { state, dispatch } = useStore();
  const { actor } = useActor();
  const people = delegatesFor(actor).map((p) => ({ ...p, open: workload(p.id, state) })).sort((a, b) => a.open - b.open);
  const [to, setTo] = useState(people[0]?.id || '');
  const [until, setUntil] = useState(() => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  const [newToo, setNewToo] = useState(true);
  const target = people.find((p) => p.id === to);
  const go = () => { dispatch({ type: 'delegate', from: actor.id, to, until, newToo, tasks: tasks.map((t) => t.id), text: `Delegated to ${target.name} by ${actor.name} until ${fmtDay(until)}` }); onDone(tasks.length, to); };
  return (
    <Dialog open onClose={onClose} title="Delegate my inbox" sub="Your tasks move to a colleague for a period. You can cancel at any time and they come back to you." className="narrow"
      foot={<><span className="grow" /><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!to || !until} onClick={go}>Delegate inbox</Btn></>}>
      <div className="deleg-form">
        <div className="t-label">Delegate to</div>
        <ul className="deleg-people" role="radiogroup" aria-label="Delegate to">
          {people.map((p, i) => (
            <li key={p.id}><label className={to === p.id ? 'on' : ''}>
              <input type="radio" name="deleg-to" checked={to === p.id} onChange={() => setTo(p.id)} />
              <span className="avatar-dot" aria-hidden="true">{p.initials}</span>
              <span className="grow"><span className="t-body-small t-strong">{p.name}</span><span className="t-caption muted">{p.role}</span></span>
              <span className="t-caption muted tnum">{p.open} open{i === 0 && <span className="lightest">Lowest load</span>}</span>
            </label></li>
          ))}
        </ul>
        <label className="deleg-until"><span className="t-label">Until</span><input type="date" className="finput" value={until} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setUntil(e.target.value)} /></label>
        <label className="deleg-check t-body-small"><input type="checkbox" checked={newToo} onChange={(e) => setNewToo(e.target.checked)} />Also send new tasks that arrive during this period</label>
        {target && <p className="t-body-small muted" style={{ margin: 0 }}><strong className="ink">{tasks.length}</strong> tasks will move to {target.name} · {target.name.split(' ')[0]} has {target.open} open today.</p>}
      </div>
    </Dialog>
  );
}

/** List layout: full-width table, act from the row. */
function TaskTable({ rows, team, away, onOpen }) {
  const { state } = useStore();
  return (
    <table className="task-table t-body-small">
      <thead><tr><th>Task</th><th>Req no.</th><th>Project</th><th>Requested by</th><th>Department</th><th>Due</th><th>Status</th><th aria-label="Actions" /></tr></thead>
      <tbody>{rows.map((x) => {
        const r = REQUESTS[x.req]; const d = state.done[x.id]; const holder = assigneeOf(x, state);
        const unread = !team && x.unread && !state.read[x.id] && !d;
        return (
          <tr key={x.id} className={`${unread ? 'unread' : ''}${d ? ' is-done' : ''}`} onClick={() => onOpen(x.id, true)}>
            <td><span className="tt-title">{unread && <span className="unread-dot" aria-label="Unread" />}{x.title}</span></td>
            <td className="tnum">{x.req}</td>
            <td>{r.project}</td>
            <td><span className="by-cell"><span className="avatar-dot" aria-hidden="true">{r.requester.initials}</span>{r.requester.name}</span></td>
            <td className="muted">{r.requester.dept}</td>
            <td><span className={`tnum${x.hours <= 24 && !d ? ' amber' : ''}`}>{d ? x.due : x.left}</span></td>
            <td>{d ? <span className="status-pill t-caption-medium done"><span className="pill-dot" />{ACTION_PAST[d.action]}</span> : away.includes(x) ? <span className="status-pill t-caption-medium st-draft"><span className="pill-dot" />Delegated</span> : !holder ? <span className="status-pill t-caption-medium queued"><span className="pill-dot" />In team queue</span> : team ? <span className="t-caption">With {actorById(holder).name.split(' ')[0]}</span> : <span className="status-pill t-caption-medium"><span className="pill-dot" />Pending</span>}</td>
            <td><Btn variant="secondary-sm" onClick={(e) => { e.stopPropagation(); onOpen(x.id, true); }}>{d ? 'View' : !holder ? 'Open' : 'Review'}</Btn></td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

function Row({ task, team, delegated, current, onOpen }) {
  const { state } = useStore();
  const r = REQUESTS[task.req];
  const d = state.done[task.id];
  const holder = assigneeOf(task, state);
  const unread = !team && task.unread && !state.read[task.id] && !d;
  return (
    <a href={`#/inbox/${task.id}`} className={`inbox-item${unread ? ' unread' : ''}${d ? ' is-done' : ''}`} aria-current={current ? 'true' : undefined}
      onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onOpen(task.id); }}>
      <div className="item-row">
        <span className="dot-slot">{unread && <span className="unread-dot" aria-label="Unread" />}</span>
        <span className="item-title">{task.title}</span>
        {d ? <span className="item-due done-label">{ACTION_PAST[d.action]}</span> : <span className={`item-due${task.hours <= 24 ? ' soon' : ''}`}>{task.left}</span>}
      </div>
      <div className="item-meta"><span className="item-req">{task.req}</span><span className="item-sep">·</span><span className="item-person">{r.project}</span></div>
      {delegated && <div className="item-holder"><span className="holder-chip t-caption"><span className="avatar-dot" aria-hidden="true">{actorById(delegated).initials}</span>Delegated to {actorById(delegated).name.split(' ')[0]}</span></div>}
      {team && (
        <div className="item-holder">
          {holder
            ? <span className="holder-chip t-caption"><span className="avatar-dot" aria-hidden="true">{actorById(holder).initials}</span>With {actorById(holder).name.split(' ')[0]}</span>
            : <span className="holder-chip queue t-caption"><span className="q-dot" aria-hidden="true" />In queue · not picked up</span>}
        </div>
      )}
    </a>
  );
}

/** Team lead: open work per member, lightest first. */
function TeamLoad({ teamId }) {
  const { state } = useStore();
  const list = teamLoad(teamId, state);
  const max = Math.max(6, ...list.map((m) => m.open));
  return (
    <div className="team-load" aria-label="Team workload">
      {list.map((m, i) => (
        <div key={m.id} className="load-row" title={`${m.name} · ${m.open} open`}>
          <span className="avatar-dot" aria-hidden="true">{m.initials}</span>
          <span className="t-caption load-name">{m.name.split(' ')[0]}{i === 0 && <span className="lightest">Lightest</span>}</span>
          <span className="load-bar"><span className={m.open >= 6 ? 'busy' : ''} style={{ width: `${(m.open / max) * 100}%` }} /></span>
          <span className="t-caption muted load-n">{m.open}</span>
        </div>
      ))}
    </div>
  );
}
