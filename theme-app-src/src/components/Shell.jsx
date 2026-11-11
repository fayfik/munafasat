import { Icon } from './ui.jsx';
import { ME } from '../data/tasks.js';

export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo"><Icon name="icon-m" size={18} /></div>
        <span className="brand-name">Munafasat</span>
      </div>
      <div className="topbar-actions">
        <button className="bell" type="button" aria-label="Notifications, unread"><Icon name="notifications" size={40} /></button>
        <div className="me">
          <div className="me-avatar t-label">{ME.initials}</div>
          <div className="me-text">
            <div className="t-body-medium me-name">{ME.name}</div>
            <div className="t-caption me-role">IT &amp; Digital</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function NavRail({ count }) {
  return (
    <nav className="nav-rail" aria-label="Main">
      <a className="nav-item" href="#/dashboard" aria-label="Dashboard (coming next)" title="Dashboard — coming in a later batch"><Icon name="icon-grid" size={20} /></a>
      <a className="nav-item" href="#/requests" aria-label="My requests (coming next)" title="My requests — coming in a later batch"><Icon name="icon-file" size={20} /></a>
      <a className="nav-item" href="#/inbox" aria-label={`Inbox, ${count} tasks`} aria-current="page"><Icon name="icon-inbox" size={20} />{count > 0 && <span className="nav-badge">{count}</span>}</a>
      <a className="nav-item" href="#/reports" aria-label="Reports (coming next)" title="Reports — coming in a later batch"><Icon name="icon-chart" size={20} /></a>
    </nav>
  );
}
