import { useMemo, useState } from 'react';
import { Icon, Segment } from './ui.jsx';
import { TASKS, ACTION_PAST } from '../data/tasks.js';
import { REQUESTS } from '../data/requests.js';
import { useStore } from '../state/store.jsx';

export function InboxColumn({ currentId, onOpen }) {
  const { state } = useStore();
  const [view, setView] = useState('needs');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const pending = TASKS.filter((t) => !state.done[t.id]);
  const done = TASKS.filter((t) => state.done[t.id]);
  const query = q.trim().toLowerCase();
  const match = (t) => !query || [t.req, t.title, REQUESTS[t.req].project, REQUESTS[t.req].requester.name].join(' ').toLowerCase().includes(query);
  const list = (view === 'done' ? done : view === 'all' ? TASKS : pending).filter(match);
  const groups = view === 'needs'
    ? [['Due within a day', list.filter((t) => t.hours <= 24)], ['Later this week', list.filter((t) => t.hours > 24)]]
    : [[view === 'done' ? 'Done' : 'All tasks', list]];
  return (
    <section className="inbox" aria-labelledby="inbox-title">
      <div className="inbox-header">
        <div className="inbox-title-row">
          <h2 className="inbox-title" id="inbox-title"><span className="t-heading">Inbox</span><span className="count-pill t-caption-medium">{pending.length}</span></h2>
          <button className="icon-btn" type="button" aria-label="Search tasks" aria-expanded={searching} onClick={() => setSearching(!searching)}><Icon name="icon-search" size={19} /></button>
        </div>
        {searching && (
          <label className="search inbox-search">
            <Icon name="icon-search" size={16} />
            <span className="sr-only">Search tasks</span>
            <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search request, task, project…" onKeyDown={(e) => e.key === 'Escape' && (setQ(''), setSearching(false))} />
          </label>
        )}
        <Segment label="Filter tasks" value={view} onChange={setView} items={[
          { id: 'needs', label: 'Needs action', count: pending.length || null },
          { id: 'overdue', label: 'Overdue', disabled: true, title: 'No overdue tasks' },
          { id: 'done', label: 'Done', count: done.length || null },
          { id: 'all', label: 'All' },
        ]} />
      </div>
      <div className="inbox-list">
        {list.length === 0 && (
          <div className="panel-empty"><div className="t-title" style={{ color: 'var(--ink-primary)' }}>{query ? 'No tasks match' : view === 'done' ? 'Nothing done yet' : 'You’re all caught up'}</div><div className="t-body-small">{query ? 'Try another search.' : view === 'done' ? 'Tasks you complete show up here.' : 'New tasks will appear here.'}</div></div>
        )}
        {groups.filter(([, items]) => items.length).map(([label, items]) => (
          <div key={label}>
            <div className="group-head t-caption"><span>{label}</span><span>{items.length}</span></div>
            {items.map((t) => {
              const r = REQUESTS[t.req];
              const d = state.done[t.id];
              const unread = t.unread && !state.read[t.id] && !d;
              return (
                <a key={t.id} href={`#/inbox/${t.id}`} className={`inbox-item${unread ? ' unread' : ''}${d ? ' is-done' : ''}`} aria-current={t.id === currentId ? 'true' : undefined}
                  onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onOpen(t.id); }}>
                  <div className="item-row">
                    <span className="dot-slot">{unread && <span className="unread-dot" aria-label="Unread" />}</span>
                    <span className="item-title">{t.title}</span>
                    {d ? <span className="item-due done-label">{ACTION_PAST[d.action]}</span> : <span className={`item-due${t.hours <= 24 ? ' soon' : ''}`}>{t.left}</span>}
                  </div>
                  <div className="item-meta"><span className="item-req">{t.req}</span><span className="item-sep">·</span><span className="item-person">{r.project}</span></div>
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
