import { useState } from 'react';
import { Icon, Segment } from './ui.jsx';
import { ACTION_PAST } from '../data/tasks.js';
import { REQUESTS } from '../data/requests.js';
import { useStore } from '../state/store.jsx';
import { useActor } from '../state/actor.jsx';
import { actorById, isLead, teamById } from '../data/actors.js';
import { assigneeOf, teamLoad } from '../lib/assign.js';

/* Inbox column. People in a team switch between their own tasks and the team queue;
   the team lead also sees who holds what and each member's workload. */
export function InboxColumn({ tasks, team = [], scope = 'mine', onScope, currentId, onOpen }) {
  const { state } = useStore();
  const { actor } = useActor();
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
  const match = (x) => !query || [x.req, x.title, REQUESTS[x.req].project, REQUESTS[x.req].requester.name].join(' ').toLowerCase().includes(query);

  let groups;
  if (scope === 'team') {
    const l = (tview === 'queue' ? queued : tview === 'held' ? held : team).filter(match);
    groups = tview === 'all' ? [['Waiting to be picked up', l.filter((x) => !assigneeOf(x, state))], ['Picked up', l.filter((x) => assigneeOf(x, state))]] : [[tview === 'queue' ? 'Waiting to be picked up' : 'Picked up', l]];
  } else {
    const list = (view === 'done' ? done : view === 'all' ? tasks : pending).filter(match);
    groups = view === 'needs'
      ? [['Due within a day', list.filter((x) => x.hours <= 24)], ['Later this week', list.filter((x) => x.hours > 24)]]
      : [[view === 'done' ? 'Done' : 'All tasks', list]];
  }
  const empty = groups.every(([, items]) => !items.length);

  return (
    <section className="inbox" aria-labelledby="inbox-title">
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
          <button className="icon-btn" type="button" aria-label="Search tasks" aria-expanded={searching} onClick={() => setSearching(!searching)}><Icon name="icon-search" size={19} /></button>
        </div>
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
        {empty && (
          <div className="panel-empty">
            <div className="t-title" style={{ color: 'var(--ink-primary)' }}>{query ? 'No tasks match' : scope === 'team' ? (tview === 'queue' ? 'The queue is empty' : 'Nothing picked up') : view === 'done' ? 'Nothing done yet' : 'You’re all caught up'}</div>
            <div className="t-body-small">{query ? 'Try another search.' : scope === 'team' ? 'New requests for your team land here first.' : view === 'done' ? 'Tasks you complete show up here.' : 'New tasks will appear here.'}</div>
          </div>
        )}
        {groups.filter(([, items]) => items.length).map(([label, items]) => (
          <div key={label}>
            <div className="group-head t-caption"><span>{label}</span><span>{items.length}</span></div>
            {items.map((x) => <Row key={x.id} task={x} team={scope === 'team'} current={x.id === currentId} onOpen={onOpen} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({ task, team, current, onOpen }) {
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
