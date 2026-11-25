import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui.jsx';
import { useActor } from '../state/actor.jsx';
import { TEAMS, isLead, reviews } from '../data/actors.js';
import { useStore } from '../state/store.jsx';
import { mineFor } from '../lib/assign.js';
import { REQUESTS } from '../data/requests.js';

export function TopBar({ counts = {}, queued = {}, onSwitch, onOpenTask }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo"><Icon name="icon-m" size={18} /></div>
        <span className="brand-name">Munafasat</span>
      </div>
      <div className="topbar-actions">
        <Bell onOpenTask={onOpenTask} />
        <ActorSwitcher counts={counts} queued={queued} onSwitch={onSwitch} />
      </div>
    </header>
  );
}

/* Profile segment doubles as the "view as" switcher: each actor has their own inbox. */
function ActorSwitcher({ counts, queued, onSwitch }) {
  const { actor, actors } = useActor();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menu = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', off);
    requestAnimationFrame(() => menu.current?.querySelector('[aria-checked="true"]')?.focus());
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); wrap.current?.querySelector('.me')?.focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...menu.current.querySelectorAll('[role="menuitemradio"]')];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };
  // Requester, the approvers by authority, then each team with its lead first.
  const groups = [
    ['Requests', actors.filter((a) => !reviews(a))],
    ['Approvers', actors.filter((a) => !a.team && reviews(a))],
    ...TEAMS.map((t) => [`${t.name} team`, actors.filter((a) => a.team === t.id).sort((x, y) => isLead(y) - isLead(x))]),
  ];
  return (
    <div className="actor-switch" ref={wrap} onKeyDown={onKey}>
      <button type="button" className="me" aria-haspopup="menu" aria-expanded={open} aria-label={`Signed in as ${actor.name}, ${actor.role}. Switch person`} onClick={() => setOpen(!open)}>
        <div className="me-avatar t-label">{actor.initials}</div>
        <div className="me-text">
          <div className="t-body-medium me-name">{actor.name}</div>
          <div className="t-caption me-role">{actor.role}</div>
        </div>
        <Icon name="icon-chevron-down" size={14} className={`me-chev${open ? ' up' : ''}`} />
      </button>
      {open && (
        <div className="actor-menu" role="menu" aria-label="View Munafasat as" ref={menu}>
          <div className="actor-menu-head">
            <div className="t-label">View as</div>
            <div className="t-caption muted">Prototype only — each person sees their own inbox and their team’s queue.</div>
          </div>
          <div className="actor-menu-list">
            {groups.map(([g, list]) => (
              <div key={g} role="group" aria-label={g}>
                <div className="actor-group t-caption muted">{g}</div>
                {list.map((a) => {
                  const n = counts[a.id] || 0;
                  const q = queued[a.id] || 0;
                  return (
                    <button key={a.id} type="button" role="menuitemradio" aria-checked={a.id === actor.id} tabIndex={-1} className="actor-row"
                      onClick={() => { setOpen(false); if (a.id !== actor.id) onSwitch(a.id); }}>
                      <span className="avatar-dot" style={{ width: 30, height: 30, fontSize: 11 }} aria-hidden="true">{a.initials}</span>
                      <span className="actor-text"><span className="t-body-medium">{a.name}{isLead(a) && <span className="lead-tag t-micro">Lead</span>}</span><span className="t-caption muted">{a.role}</span></span>
                      {q > 0 && <span className="queue-count t-caption" title={`${q} waiting in the team queue`} aria-label={`${q} in the team queue`}>{q} in queue</span>}
                      {reviews(a) ? <span className={`actor-count t-caption${n ? '' : ' zero'}`} aria-label={`${n} pending`}>{n || '—'}</span> : <span className="t-caption muted">Requests</span>}
                      <span className="actor-tick" aria-hidden="true">{a.id === actor.id && <Icon name="icon-check-brand" size={14} />}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function NavRail({ count, area = 'inbox', onInbox }) {
  const cur = (a) => (area === a ? 'page' : undefined);
  return (
    <nav className="nav-rail" aria-label="Main">
      <a className="nav-item" href="#/dashboard" aria-label="Dashboard" title="Dashboard" aria-current={cur('dashboard')}><Icon name="icon-grid" size={20} /></a>
      <a className="nav-item" href="#/requests" aria-label="My requests" title="My requests" aria-current={cur('requests')}><Icon name="icon-file" size={20} /></a>
      <a className="nav-item" href="#/inbox" aria-label={`Inbox, ${count} tasks`} title="Inbox" aria-current={cur('inbox')} onClick={(e) => { if (onInbox) { e.preventDefault(); onInbox(); } }}><Icon name="icon-inbox" size={20} />{count > 0 && <span className="nav-badge">{count}</span>}</a>
      <a className="nav-item" href="#/reports" aria-label="Reports" title="Reports" aria-current={cur('reports')}><Icon name="icon-chart" size={20} /></a>
    </nav>
  );
}

/* Task notifications: new tasks in your inbox, newest first; open one or mark all as read. */
function Bell({ onOpenTask }) {
  const { state, dispatch } = useStore();
  const { actor } = useActor();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  const items = mineFor(actor, state).filter((t) => !state.done[t.id]).sort((a, b) => a.hours - b.hours);
  const unread = items.filter((t) => t.unread && !state.read[t.id]);
  const ago = (i) => (i === 0 ? 'just now' : `${i * 7 + 2} min ago`);
  return (
    <div className="bell-wrap" ref={wrap}>
      <button className={`bell${unread.length ? '' : ' quiet'}`} type="button" aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={unread.length ? 'notifications' : 'notifications-read'} size={40} /></button>
      {open && (
        <div className="notif-pop" role="dialog" aria-label="Notifications">
          <div className="notif-head"><span className="t-title">Notifications</span>{unread.length > 0 && <button type="button" className="inline-link t-body-small" onClick={() => dispatch({ type: 'readAll', tasks: unread.map((t) => t.id) })}>Mark all as read</button>}</div>
          {!items.length ? <p className="t-body-small muted notif-empty">You’re all caught up.</p> : (
            <ul className="notif-list">{items.slice(0, 8).map((t, i) => {
              const isNew = t.unread && !state.read[t.id];
              return (
                <li key={t.id}><button type="button" className={`notif${isNew ? ' new' : ''}`} onClick={() => { setOpen(false); onOpenTask?.(t.id); }}>
                  <span className="notif-dot" aria-hidden="true" />
                  <span className="grow"><span className="t-caption muted">{isNew ? 'New task in your inbox' : 'Waiting for you'} · {ago(i)}</span><span className="t-body-small t-strong">{t.title}</span><span className="t-caption muted">{t.req} · {REQUESTS[t.req].project}</span></span>
                  <span className={`t-caption tnum${t.hours <= 24 ? ' amber' : ' muted'}`}>{t.left}</span>
                </button></li>
              );
            })}</ul>
          )}
        </div>
      )}
    </div>
  );
}
