/*
  Activity timeline component — maps to powerappsui.com "Activity Timeline".
  Depends on: js/data-store.js (for activity.json).
*/

const ACTIVITY_ICON = {
  'approved': { icon: 'fa-solid fa-circle-check', tone: '' },
  'submitted': { icon: 'fa-solid fa-paper-plane', tone: 'tone-blue' },
  'comment': { icon: 'fa-regular fa-comment', tone: 'tone-neutral' },
  'awarded': { icon: 'fa-solid fa-trophy', tone: '' },
  'status-change': { icon: 'fa-solid fa-arrows-rotate', tone: 'tone-amber' },
  'vendor-update': { icon: 'fa-solid fa-file-import', tone: 'tone-blue' },
  'published': { icon: 'fa-solid fa-rocket', tone: 'tone-blue' },
};

function activityDescriptionHtml(entry) {
  const ref = `<a href="${requestDetailHref(entry.rfpId)}">${entry.rfpId}</a>`;
  return entry.description.replace(entry.rfpId, ref);
}

async function renderRecentActivitySection(containerId, limit = 6) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const all = await DataStore.getAllActivity();
  const entries = all.slice(0, limit);

  mount.innerHTML = `
    <div class="dashboard-section-header">
      <span class="dashboard-section-title">Recent Activity</span>
      <a class="dashboard-section-link" href="#">View all activity <i class="fa-solid fa-arrow-right"></i></a>
    </div>
    <div class="timeline">
      ${entries.map((entry) => {
        const meta = ACTIVITY_ICON[entry.action] || { icon: 'fa-solid fa-circle-dot', tone: 'tone-neutral' };
        return `
          <div class="timeline-item">
            <span class="timeline-icon ${meta.tone}"><i class="${meta.icon}"></i></span>
            <div class="timeline-content">
              <div class="timeline-text">${activityDescriptionHtml(entry)}</div>
              <div class="timeline-time">${entry.timeLabel}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
