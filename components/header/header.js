/*
  Header component — app shell top bar.
  Renders into <div id="app-header"></div>. Reads the page title from
  document.body.dataset.pageTitle (set inline on each page).

  Also owns the app-wide bilingual (EN/AR) direction stub: applyLangDirection()
  sets `dir`/`lang` on <html> from localStorage, and the header's EN/AR
  button flips it live. Full field-by-field Arabic translation is out of
  scope for this phase — this is only the structural LTR/RTL capability.
*/

const LANG_STORAGE_KEY = 'munafasat.lang';

function getLang() {
  return localStorage.getItem(LANG_STORAGE_KEY) || 'en';
}

function applyLangDirection() {
  const lang = getLang();
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

function toggleLangDirection() {
  localStorage.setItem(LANG_STORAGE_KEY, getLang() === 'ar' ? 'en' : 'ar');
  applyLangDirection();
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) btn.textContent = getLang() === 'ar' ? 'EN' : 'AR';
}

// Applied as soon as this script runs (before renderHeader's own async
// fetch resolves) so the rest of the page's own markup isn't left
// mismatched with the header while notifications are still loading.
applyLangDirection();

async function renderHeader() {
  const mount = document.getElementById('app-header');
  if (!mount) return;

  const pageTitle = document.body.dataset.pageTitle || '';
  const unreadNotifications = await DataStore.getUnreadNotificationCount();
  const user = DataStore.CURRENT_USER;

  mount.innerHTML = `
    <header class="app-header">
      <div class="app-header-left">
        <img class="app-header-logo" src="../assets/reference/Color=Full color, Size=Large, Type=Icon.png" alt="Munafasat">
        <span class="app-header-app-name">Munafasat</span>
        <span class="app-header-title-divider"></span>
        <span class="app-header-title">${pageTitle}</span>
      </div>
      <div class="app-header-right">
        <button class="app-header-icon-btn" id="lang-toggle-btn" title="Switch language (EN/AR) — layout direction only, full translation not yet built">${getLang() === 'ar' ? 'EN' : 'AR'}</button>

        <button class="app-header-ai-btn" id="ai-assistant-btn" title="AI Assistant">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>AI Assistant</span>
        </button>

        <div class="app-header-dropdown" id="create-dropdown">
          <button class="app-header-create-btn" id="create-btn">
            <i class="fa-solid fa-plus"></i>
            <span>Create</span>
          </button>
          <div class="app-header-menu" id="create-menu">
            <div class="app-header-menu-item" data-action="create-request">
              <i class="fa-solid fa-file-circle-plus"></i>
              <span>Create new request</span>
            </div>
          </div>
        </div>

        <div class="app-header-divider"></div>

        <span class="badge-anchor">
          <button class="app-header-icon-btn" id="notifications-btn" title="Notifications">
            <i class="fa-regular fa-bell"></i>
          </button>
          ${renderCountBadge(unreadNotifications)}
        </span>

        <div class="app-header-dropdown" id="user-dropdown">
          <button class="app-header-avatar-btn" id="user-btn">
            <span class="app-header-avatar">${user.initials}</span>
            <i class="fa-solid fa-chevron-down app-header-avatar-chevron"></i>
          </button>
          <div class="app-header-menu" id="user-menu">
            <div class="app-header-user-meta">
              <div class="app-header-user-name">${user.name}</div>
              <div class="app-header-user-email">${user.email}</div>
            </div>
            <div class="app-header-menu-divider"></div>
            <div class="app-header-menu-item" data-action="profile">
              <i class="fa-regular fa-user"></i>
              <span>Profile</span>
            </div>
            <div class="app-header-menu-item" data-action="settings">
              <i class="fa-solid fa-gear"></i>
              <span>Settings</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;

  setupDropdown('create-dropdown', 'create-btn', 'create-menu');
  setupDropdown('user-dropdown', 'user-btn', 'user-menu');

  document.querySelector('#create-menu [data-action="create-request"]').addEventListener('click', () => {
    window.location.href = 'create-request.html';
  });

  document.getElementById('lang-toggle-btn').addEventListener('click', toggleLangDirection);
}

function setupDropdown(containerId, triggerId, menuId) {
  const container = document.getElementById(containerId);
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById(menuId);
  if (!container || !trigger || !menu) return;

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    document.querySelectorAll('.app-header-menu.open').forEach((openMenu) => {
      if (openMenu !== menu) openMenu.classList.remove('open');
    });
    menu.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (!container.contains(event.target)) {
      menu.classList.remove('open');
    }
  });
}

document.addEventListener('DOMContentLoaded', renderHeader);
