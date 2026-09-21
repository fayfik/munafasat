/*
  Sidebar component — maps to powerappsui.com "Sidebar" (Side navigation - Customisable).
  Renders into <div id="app-sidebar"></div> and reads the active page from
  document.body.dataset.page (set inline on each page).
*/

const SIDEBAR_NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: 'dashboard-horizontal', href: 'dashboard.html' },
  { page: 'my-requests', label: 'My Requests', icon: 'file-list', href: 'my-requests.html' },
  { page: 'inbox', label: 'Inbox', icon: 'inbox', href: 'inbox.html' },
  { page: 'reports', label: 'Reports', icon: 'file-chart', href: 'reports.html' },
];

// Line (outline) icon shown by default, fill (solid) shown for the active
// nav item — swapped by name rather than left to a single icon font so the
// exact provided artwork (not a lookalike) renders in both states.
const SIDEBAR_ICON_PATHS = {
  'dashboard-horizontal': {
    line: 'M3 10C3 10.5523 3.44772 11 4 11L12 11C12.5523 11 13 10.5523 13 10V4C13 3.44772 12.5523 3 12 3H4C3.44772 3 3 3.44772 3 4V10ZM11 20C11 20.5523 11.4477 21 12 21H20C20.5523 21 21 20.5523 21 20V14C21 13.4477 20.5523 13 20 13H12C11.4477 13 11 13.4477 11 14V20ZM13 15H19V19H13V15ZM3 20C3 20.5523 3.44772 21 4 21H8C8.55229 21 9 20.5523 9 20V14C9 13.4477 8.55229 13 8 13H4C3.44772 13 3 13.4477 3 14V20ZM5 19V15H7V19H5ZM5 9V5L11 5L11 9L5 9ZM20 11C20.5523 11 21 10.5523 21 10V4C21 3.44772 20.5523 3 20 3H16C15.4477 3 15 3.44772 15 4V10C15 10.5523 15.4477 11 16 11H20ZM19 9H17V5H19V9Z',
    fill: 'M12 3C12.5523 3 13 3.44771 13 4L13 10C13 10.5523 12.5523 11 12 11L4 11C3.44772 11 3 10.5523 3 10L3 4C3 3.44772 3.44772 3 4 3L12 3ZM20 3C20.5523 3 21 3.44771 21 4L21 10C21 10.5523 20.5523 11 20 11L16 11C15.4477 11 15 10.5523 15 10L15 4C15 3.44771 15.4477 3 16 3L20 3ZM20 13C20.5523 13 21 13.4477 21 14L21 20C21 20.5523 20.5523 21 20 21L12 21C11.4477 21 11 20.5523 11 20L11 14C11 13.4477 11.4477 13 12 13L20 13ZM3 14C3 13.4477 3.44772 13 4 13L8 13C8.55229 13 9 13.4477 9 14L9 20C9 20.5523 8.55229 21 8 21L4 21C3.44772 21 3 20.5523 3 20L3 14Z',
  },
  'file-list': {
    line: 'M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM8 7H16V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z',
    fill: 'M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM8 7V9H16V7H8ZM8 11V13H16V11H8ZM8 15V17H16V15H8Z',
  },
  inbox: {
    line: 'M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM7.41604 14H4V19H20V14H16.584C15.8124 15.7659 14.0503 17 12 17C9.94968 17 8.1876 15.7659 7.41604 14ZM20 5H4V12H9C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12H20V5Z',
    fill: 'M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12H20V5H4V12H9Z',
  },
  'file-chart': {
    line: 'M11 7H13V17H11V7ZM15 11H17V17H15V11ZM7 13H9V17H7V13ZM15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z',
    fill: 'M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z',
  },
};

function sidebarIconSvg(iconKey, active) {
  const d = SIDEBAR_ICON_PATHS[iconKey][active ? 'fill' : 'line'];
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"></path></svg>`;
}

const SIDEBAR_EXPANDED_STORAGE_KEY = 'munafasat.sidebarExpanded';
// Pin is a *persistent* (localStorage, not sessionStorage) preference: a
// pinned sidebar stays expanded across new browser sessions, not just the
// current tab. Unpinned falls back to the existing per-session behavior.
const SIDEBAR_PINNED_STORAGE_KEY = 'munafasat.sidebarPinned';

function renderSidebar() {
  const mount = document.getElementById('app-sidebar');
  if (!mount) return;

  const activePage = document.body.dataset.page || '';
  const pinned = localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === 'true';
  const startExpanded = pinned || sessionStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY) === 'true';

  mount.innerHTML = `
    <aside class="sidebar${startExpanded ? ' expanded' : ''}" id="sidebar">
      <div class="sidebar-brand">
        <img class="sidebar-brand-icon" src="../assets/reference/Color=Full color, Size=Large, Type=Icon.png" alt="Munafasat">
        <span class="sidebar-brand-wordmark">Munafasat</span>
      </div>
      <div class="sidebar-toggle-row">
        <button class="sidebar-pin-btn${pinned ? ' pinned' : ''}" id="sidebar-pin-btn" aria-label="${pinned ? 'Unpin sidebar' : 'Pin sidebar expanded'}" title="${pinned ? 'Unpin sidebar' : 'Pin sidebar expanded'}">
          <i class="fa-solid fa-thumbtack"></i>
        </button>
        <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Expand sidebar" title="Expand sidebar">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <nav class="sidebar-nav">
        ${SIDEBAR_NAV_ITEMS.map((item) => `
          <a class="sidebar-nav-item${item.page === activePage ? ' active' : ''}" href="${item.href}">
            ${sidebarIconSvg(item.icon, item.page === activePage)}
            <span>${item.label}</span>
            <span class="sidebar-tooltip">${item.label}</span>
          </a>
        `).join('')}
      </nav>
    </aside>
  `;

  const sidebarEl = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const pinBtn = document.getElementById('sidebar-pin-btn');
  const appShell = document.querySelector('.app-shell');

  toggleBtn.addEventListener('click', () => {
    const nowExpanded = sidebarEl.classList.toggle('expanded');
    appShell?.classList.toggle('sidebar-expanded', nowExpanded);
    sessionStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(nowExpanded));
    toggleBtn.setAttribute('aria-label', nowExpanded ? 'Collapse sidebar' : 'Expand sidebar');
    toggleBtn.setAttribute('title', nowExpanded ? 'Collapse sidebar' : 'Expand sidebar');
    // Collapsing by hand overrides a pin — the pin only guarantees the
    // sidebar *starts* expanded on future visits, not that it can't be
    // collapsed in the current one.
    if (!nowExpanded && localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === 'true') {
      localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, 'false');
      pinBtn.classList.remove('pinned');
      pinBtn.setAttribute('aria-label', 'Pin sidebar expanded');
      pinBtn.setAttribute('title', 'Pin sidebar expanded');
    }
  });

  pinBtn.addEventListener('click', () => {
    const nowPinned = !pinBtn.classList.contains('pinned');
    pinBtn.classList.toggle('pinned', nowPinned);
    pinBtn.setAttribute('aria-label', nowPinned ? 'Unpin sidebar' : 'Pin sidebar expanded');
    pinBtn.setAttribute('title', nowPinned ? 'Unpin sidebar' : 'Pin sidebar expanded');
    localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(nowPinned));
    if (nowPinned && !sidebarEl.classList.contains('expanded')) {
      toggleBtn.click();
    }
  });

  if (startExpanded) {
    appShell?.classList.add('sidebar-expanded');
  }
}

document.addEventListener('DOMContentLoaded', renderSidebar);
