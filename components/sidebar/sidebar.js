/*
  Sidebar component — maps to powerappsui.com "Sidebar" (Side navigation - Customisable).
  Renders into <div id="app-sidebar"></div> and reads the active page from
  document.body.dataset.page (set inline on each page).
*/

const SIDEBAR_NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-table-cells-large', href: 'dashboard.html' },
  { page: 'my-requests', label: 'My Requests', icon: 'fa-solid fa-file-lines', href: 'my-requests.html' },
  { page: 'inbox', label: 'Inbox', icon: 'fa-solid fa-inbox', href: 'inbox.html' },
  { page: 'reports', label: 'Reports', icon: 'fa-solid fa-chart-column', href: 'reports.html' },
];

const SIDEBAR_EXPANDED_STORAGE_KEY = 'munafasat.sidebarExpanded';

function renderSidebar() {
  const mount = document.getElementById('app-sidebar');
  if (!mount) return;

  const activePage = document.body.dataset.page || '';
  const startExpanded = sessionStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY) === 'true';

  mount.innerHTML = `
    <aside class="sidebar${startExpanded ? ' expanded' : ''}" id="sidebar">
      <div class="sidebar-brand">
        <img src="../assets/reference/Color=Full color, Size=Large, Type=Icon.png" alt="SIDF">
      </div>
      <div class="sidebar-toggle-row">
        <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Expand sidebar" title="Expand sidebar">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <nav class="sidebar-nav">
        ${SIDEBAR_NAV_ITEMS.map((item) => `
          <a class="sidebar-nav-item${item.page === activePage ? ' active' : ''}" href="${item.href}">
            <i class="${item.icon}"></i>
            <span>${item.label}</span>
            <span class="sidebar-tooltip">${item.label}</span>
          </a>
        `).join('')}
      </nav>
    </aside>
  `;

  const sidebarEl = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const appShell = document.querySelector('.app-shell');

  toggleBtn.addEventListener('click', () => {
    const nowExpanded = sidebarEl.classList.toggle('expanded');
    appShell?.classList.toggle('sidebar-expanded', nowExpanded);
    sessionStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(nowExpanded));
    toggleBtn.setAttribute('aria-label', nowExpanded ? 'Collapse sidebar' : 'Expand sidebar');
    toggleBtn.setAttribute('title', nowExpanded ? 'Collapse sidebar' : 'Expand sidebar');
  });

  if (startExpanded) {
    appShell?.classList.add('sidebar-expanded');
  }
}

document.addEventListener('DOMContentLoaded', renderSidebar);
