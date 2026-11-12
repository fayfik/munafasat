import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui.jsx';
import { useActor } from '../state/actor.jsx';

export function TopBar({ counts = {}, onSwitch }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo"><Icon name="icon-m" size={18} /></div>
        <span className="brand-name">Munafasat</span>
      </div>
      <div className="topbar-actions">
        <button className="bell" type="button" aria-label="Notifications, unread"><Icon name="notifications" size={40} /></button>
        <ActorSwitcher counts={counts} onSwitch={onSwitch} />
      </div>
    </header>
  );
}

/* Profile segment doubles as the "view as" switcher: each actor has their own inbox. */
function ActorSwitcher({ counts, onSwitch }) {
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
  const groups = [...new Set(actors.map((a) => a.group))];
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
            <div className="t-caption muted">Prototype only — each person sees their own inbox.</div>
          </div>
          <div className="actor-menu-list">
            {groups.map((g) => (
              <div key={g} role="group" aria-label={g}>
                <div className="actor-group t-caption muted">{g}</div>
                {actors.filter((a) => a.group === g).map((a) => {
                  const n = counts[a.id] || 0;
                  return (
                    <button key={a.id} type="button" role="menuitemradio" aria-checked={a.id === actor.id} tabIndex={-1} className="actor-row"
                      onClick={() => { setOpen(false); if (a.id !== actor.id) onSwitch(a.id); }}>
                      <span className="avatar-dot" style={{ width: 30, height: 30, fontSize: 11 }} aria-hidden="true">{a.initials}</span>
                      <span className="actor-text"><span className="t-body-medium">{a.name}</span><span className="t-caption muted">{a.role}</span></span>
                      {a.steps.length ? <span className={`actor-count t-caption${n ? '' : ' zero'}`} aria-label={`${n} pending`}>{n || '—'}</span> : <span className="t-caption muted">Requests</span>}
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
      <a className="nav-item" href="#/dashboard" aria-label="Dashboard (coming next)" title="Dashboard — coming in a later batch" onClick={(e) => e.preventDefault()}><Icon name="icon-grid" size={20} /></a>
      <a className="nav-item" href="#/requests" aria-label="My requests" title="My requests" aria-current={cur('requests')}><Icon name="icon-file" size={20} /></a>
      <a className="nav-item" href="#/inbox" aria-label={`Inbox, ${count} tasks`} title="Inbox" aria-current={cur('inbox')} onClick={(e) => { if (onInbox) { e.preventDefault(); onInbox(); } }}><Icon name="icon-inbox" size={20} />{count > 0 && <span className="nav-badge">{count}</span>}</a>
      <a className="nav-item" href="#/reports" aria-label="Reports (coming next)" title="Reports — coming in a later batch" onClick={(e) => e.preventDefault()}><Icon name="icon-chart" size={20} /></a>
    </nav>
  );
}
