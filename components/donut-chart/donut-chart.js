/*
  Donut chart component — maps to powerappsui.com "Pie Chart".
  Renders as a CSS conic-gradient ring (no SVG) with a legend; segment
  clicks are resolved by converting the click point to an angle and
  mapping it to the matching status slice.
  Depends on: js/data-store.js, components/dialog/dialog.js, components/table/table.js.
*/

async function renderRequestsByStatusSection(containerId) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const [breakdown, allRfps] = await Promise.all([
    DataStore.getStatusBreakdown(),
    DataStore.getAllRfps(),
  ]);

  const total = allRfps.length;

  // Cumulative fractions (unrounded) drive both the gradient stops and the
  // click-angle boundaries, so a segment's clickable area matches what's drawn.
  let cumulative = 0;
  const segments = breakdown.map((entry) => {
    const startFrac = cumulative;
    cumulative += entry.count / total;
    return { ...entry, startFrac, endFrac: cumulative };
  });

  const gradientStops = segments
    .map((seg) => `${seg.color} ${(seg.startFrac * 100).toFixed(2)}% ${(seg.endFrac * 100).toFixed(2)}%`)
    .join(', ');

  mount.innerHTML = `
    <div class="donut-section-header">
      <span class="donut-section-title">Requests by Status</span>
      <div class="donut-section-controls">
        <select class="donut-select" aria-label="Date range">
          <option>This Year</option>
          <option>This Quarter</option>
          <option>This Month</option>
        </select>
        <div class="donut-overflow-wrap" id="donut-overflow-wrap">
          <button class="donut-overflow-btn" id="donut-overflow-btn" aria-label="More options">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
          <div class="donut-overflow-menu" id="donut-overflow-menu">
            <div class="donut-overflow-item" id="donut-download-btn">
              <i class="fa-solid fa-download"></i>
              <span>Download data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="donut-body">
      <div class="donut-chart" id="donut-chart" style="background: conic-gradient(${gradientStops});">
        <div class="donut-chart-center">
          <div class="donut-chart-center-value">${total}</div>
          <div class="donut-chart-center-label">Total</div>
        </div>
      </div>
      <ul class="donut-legend" id="donut-legend">
        ${segments.map((seg) => `
          <li class="donut-legend-item" data-status="${seg.status}">
            <span class="donut-legend-dot" style="background: ${seg.color};"></span>
            <span class="donut-legend-label">${seg.status}</span>
            <span class="donut-legend-count">${seg.count}</span>
            <span class="donut-legend-percent">${seg.percent}%</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  setupDropdownLike('donut-overflow-wrap', 'donut-overflow-btn', 'donut-overflow-menu');

  document.getElementById('donut-download-btn').addEventListener('click', () => {
    downloadStatusBreakdownCsv(segments);
    document.getElementById('donut-overflow-menu').classList.remove('open');
  });

  function openStatusModal(status) {
    openStatusDrilldownDialog(status, allRfps);
  }

  document.querySelectorAll('#donut-legend .donut-legend-item').forEach((item) => {
    item.addEventListener('click', () => openStatusModal(item.dataset.status));
  });

  const donutEl = document.getElementById('donut-chart');
  donutEl.addEventListener('click', (event) => {
    const rect = donutEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;

    // Ignore clicks inside the donut hole (center label area).
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < rect.width / 2 - 26) return;

    let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;
    const frac = angleDeg / 360;

    const match = segments.find((seg) => frac >= seg.startFrac && frac < seg.endFrac);
    if (match) openStatusModal(match.status);
  });
}

async function openStatusDrilldownDialog(status, allRfps) {
  const rows = allRfps.filter((r) => r.status === status).slice(0, 5);

  const columns = [
    { key: 'id', label: 'Request ID', render: (r) => `<a class="table-link" href="${requestDetailHref(r.id)}">${r.id}</a>` },
    { key: 'description', label: 'Description' },
    { key: 'project', label: 'Project' },
    { key: 'createdDate', label: 'Created on', render: (r) => formatDate(r.createdDate) },
    { key: 'status', label: 'Status', render: (r) => renderStatusBadge(r.status) },
    { key: 'nextStep', label: 'Next step' },
    { key: 'owner', label: 'Current owner' },
  ];

  openDialog({
    title: `${status} requests`,
    bodyHtml: buildTableHtml({ columns, rows, compact: true }),
  });
}

function downloadStatusBreakdownCsv(segments) {
  const header = 'Status,Count,Percent\n';
  const lines = segments.map((s) => `${s.status},${s.count},${s.percent}%`).join('\n');
  const blob = new Blob([header + lines], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'requests-by-status.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Shared tiny dropdown toggler used by header.js-style menus elsewhere too.
function setupDropdownLike(containerId, triggerId, menuId) {
  const container = document.getElementById(containerId);
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById(menuId);
  if (!container || !trigger || !menu) return;

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    document.querySelectorAll('.donut-overflow-menu.open, .app-header-menu.open').forEach((openMenu) => {
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
