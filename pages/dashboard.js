/*
  Dashboard page controller — Phase 2.
  Depends on data-store.js, badge.js, table.js, dialog.js, kpi-card.js,
  donut-chart.js, activity-timeline.js (all loaded before this file).
*/

function renderGreeting() {
  const mount = document.getElementById('dashboard-greeting');
  if (!mount) return;

  const user = DataStore.CURRENT_USER;
  const firstName = user.name.split(' ')[0];

  mount.innerHTML = `
    <div>
      <h1 class="dashboard-greeting-title">Good morning, ${firstName} 👋</h1>
      <p class="dashboard-greeting-sub">Here's what's happening with your procurement items today.</p>
    </div>
  `;
}

const RECENT_TABLE_COLUMNS = [
  { key: 'id', label: 'Request / RFP ID', cellClass: 'cell-id', render: (r) => `<a class="table-link" href="${requestDetailHref(r.id)}">${r.id}</a>` },
  { key: 'description', label: 'Description' },
  { key: 'type', label: 'Type', cellClass: 'cell-muted' },
  { key: 'stage', label: 'Stage', cellClass: 'cell-muted' },
  { key: 'status', label: 'Status', render: (r) => renderStatusBadge(r.status) },
  { key: 'lastUpdatedDate', label: 'Last Updated', cellClass: 'cell-muted', render: (r) => formatDate(r.lastUpdatedDate) },
  { key: 'action', label: '', render: (r) => `<a class="table-view-action" href="${requestDetailHref(r.id)}">View</a>` },
];

async function renderRecentRequestsSection(containerId) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const baseRows = await DataStore.getRecentRequests(10);
  const statuses = DataStore.STATUS_ORDER;

  mount.innerHTML = `
    <div class="dashboard-section-header">
      <span class="dashboard-section-title">My Recent 10 Requests</span>
      <div class="table-controls">
        <label class="table-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="recent-search" placeholder="Search requests…">
        </label>
        <div class="dashboard-cta-wrap" id="recent-filter-wrap">
          <button class="table-btn" id="recent-filter-btn"><i class="fa-solid fa-filter"></i> Filter</button>
          <div class="dashboard-cta-menu" id="recent-filter-menu">
            ${statuses.map((s) => `
              <label class="dashboard-cta-menu-item" style="cursor:pointer;">
                <input type="checkbox" class="recent-filter-checkbox" value="${s}" checked style="margin-right: var(--space-2);">
                <span>${s}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <select class="donut-select" id="recent-sort" aria-label="Sort">
          <option value="updated-desc">Last Updated (Newest)</option>
          <option value="updated-asc">Last Updated (Oldest)</option>
          <option value="status">Status</option>
        </select>
        <a class="dashboard-section-link" href="../pages/my-requests.html">View all <i class="fa-solid fa-arrow-right"></i></a>
      </div>
    </div>
    <div id="recent-table-mount"></div>
  `;

  function draw() {
    const query = document.getElementById('recent-search').value.trim().toLowerCase();
    const checkedStatuses = Array.from(document.querySelectorAll('.recent-filter-checkbox:checked')).map((el) => el.value);
    const sortMode = document.getElementById('recent-sort').value;

    let rows = baseRows.filter((r) => checkedStatuses.includes(r.status));
    if (query) {
      rows = rows.filter((r) => r.id.toLowerCase().includes(query) || r.description.toLowerCase().includes(query) || r.title.toLowerCase().includes(query));
    }

    rows = [...rows];
    if (sortMode === 'updated-asc') {
      rows.sort((a, b) => new Date(a.lastUpdatedDate) - new Date(b.lastUpdatedDate));
    } else if (sortMode === 'status') {
      rows.sort((a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status));
    } else {
      rows.sort((a, b) => new Date(b.lastUpdatedDate) - new Date(a.lastUpdatedDate));
    }

    document.getElementById('recent-table-mount').innerHTML = buildTableHtml({
      columns: RECENT_TABLE_COLUMNS,
      rows,
      emptyText: 'No requests match your search/filter.',
    });
  }

  document.getElementById('recent-search').addEventListener('input', draw);
  document.getElementById('recent-sort').addEventListener('change', draw);
  document.querySelectorAll('.recent-filter-checkbox').forEach((cb) => cb.addEventListener('change', draw));
  setupDropdownLike('recent-filter-wrap', 'recent-filter-btn', 'recent-filter-menu');

  draw();
}

function urgencyClass(daysLeft) {
  if (daysLeft <= 2) return 'urgency-high';
  if (daysLeft <= 5) return 'urgency-medium';
  return 'urgency-low';
}

async function renderClosingSoonSection(containerId) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const rows = await DataStore.getClosingSoonRfps(3);

  mount.innerHTML = `
    <div class="dashboard-section-header">
      <span class="dashboard-section-title">RFPs Closing Soon</span>
      <a class="dashboard-section-link" href="../pages/my-requests.html">View all <i class="fa-solid fa-arrow-right"></i></a>
    </div>
    <div class="closing-soon-list">
      ${rows.map((r) => `
        <a class="closing-soon-item" href="${requestDetailHref(r.id)}">
          <div class="closing-soon-main">
            <span class="closing-soon-id">${r.id}</span>
            <div class="closing-soon-title">${r.title}</div>
            <div class="closing-soon-due">Due ${r.closingSoonDueLabel}</div>
          </div>
          <span class="closing-soon-days ${urgencyClass(r.closingSoonDaysLeft)}">${r.closingSoonDaysLeft} days left</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderAiSuggestionsSection(containerId) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const suggestions = [
    { icon: 'fa-solid fa-bolt', text: 'Based on your past activity, you can create this RFP 40% faster using AI.', action: 'Try AI Draft' },
    { icon: 'fa-solid fa-copy', text: '3 similar RFPs found. Reuse details and save time.', action: 'View Suggestions' },
    { icon: 'fa-solid fa-triangle-exclamation', text: 'RFP23231 – Is overdue with finance for 56 days.', action: 'View RFP' },
  ];

  mount.innerHTML = `
    <div class="dashboard-section-header">
      <span class="dashboard-section-title">AI Assistant Suggestions</span>
    </div>
    <div class="ai-suggestion-list">
      ${suggestions.map((s) => `
        <div class="ai-suggestion-item">
          <span class="ai-suggestion-icon"><i class="${s.icon}"></i></span>
          <div>
            <div class="ai-suggestion-text">${s.text}</div>
            <a class="ai-suggestion-action" href="#">${s.action} <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderQuickActionsSection(containerId) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const actions = [
    { icon: 'fa-solid fa-file-circle-plus', label: 'Create New RFP' },
    { icon: 'fa-solid fa-clock-rotate-left', label: 'View Overdue RFPs' },
    { icon: 'fa-solid fa-people-group', label: 'View New Vendors' },
  ];

  mount.innerHTML = `
    <div class="dashboard-section-header">
      <span class="dashboard-section-title">Quick Actions</span>
    </div>
    <div class="quick-actions-grid">
      ${actions.map((a) => `
        <a class="quick-action-item" href="#">
          <span class="quick-action-icon"><i class="${a.icon}"></i></span>
          <span class="quick-action-label">${a.label}</span>
        </a>
      `).join('')}
    </div>
  `;
}

async function initDashboard() {
  renderGreeting();
  await renderKpiSnapshotSection('kpi-section');
  await renderRequestsByStatusSection('status-section');
  await renderRecentRequestsSection('recent-requests-section');
  await renderClosingSoonSection('closing-soon-section');
  await renderRecentActivitySection('activity-section', 6);
  renderAiSuggestionsSection('ai-suggestions-section');
  renderQuickActionsSection('quick-actions-section');
}

document.addEventListener('DOMContentLoaded', initDashboard);
