/*
  KPI Card component — maps to powerappsui.com "KPI Cards".
  Renders the 5-card procurement snapshot row plus a shared drill-down
  panel beneath it. Only one card's drill-down is open at a time.

  Per a product correction pass, the 3 status cards (My Drafts, My
  Submissions, Awaiting your Approvals) show fixed example tables rather
  than a generic view over live rfps.json — the exact rows/columns given
  in that correction, not derived data. The 2 value cards (Total RFP
  Value, Total PO Value) are intentionally non-interactive.

  Depends on: js/data-store.js, components/table/table.js, components/badge/badge.js.
*/

const KPI_DRAFTS_ROWS = [
  { id: 'RFP-2026-041', title: 'SAP S/4HANA Implementation', lastUpdated: 'Today, 10:32 AM', action: 'Continue' },
  { id: 'RFP-2026-038', title: 'IT Infrastructure Services', lastUpdated: 'Today, 09:15 AM', action: 'Continue' },
  { id: 'RFP-2026-035', title: 'Office Equipment', lastUpdated: 'Yesterday', action: 'Continue' },
  { id: 'RFP-2026-029', title: 'Consulting Services', lastUpdated: '2 days ago', action: 'Continue' },
];

const KPI_SUBMISSIONS_ROWS = [
  { id: 'RFP-2026-041', title: 'SAP S/4HANA Implementation', lastUpdated: '16 Sep 2026', action: 'Awaiting Approval', tone: 'tone-blue' },
  { id: 'RFP-2026-038', title: 'IT Infrastructure Services', lastUpdated: '15 Sep 2026', action: 'Under Review', tone: 'tone-amber' },
  { id: 'RFP-2026-035', title: 'Office Equipment', lastUpdated: '14 Sep 2026', action: 'Approved', tone: 'tone-green' },
  { id: 'RFP-2026-029', title: 'Consulting Services', lastUpdated: '12 Sep 2026', action: 'Procurement Review', tone: 'tone-neutral' },
];

const KPI_AWAITING_APPROVAL_ROWS = [
  { id: 'RFP-2026-041', title: 'SAP Implementation', submittedBy: 'Ahmed Al-Salem', pendingSince: 'Today', action: 'Review' },
  { id: 'RFP-2026-038', title: 'IT Managed Services', submittedBy: 'Sara Ahmed', pendingSince: 'Yesterday', action: 'Review' },
  { id: 'RFP-2026-035', title: 'Data Center Services', submittedBy: 'Mohammed Ali', pendingSince: 'Yesterday', action: 'Review' },
  { id: 'RFP-2026-029', title: 'Consulting Services', submittedBy: 'Mohammed Ali', pendingSince: '2 days ago', action: 'Review' },
];

const KPI_DRAFTS_COLUMNS = [
  { key: 'id', label: 'RFP ID', cellClass: 'cell-id', render: (r) => `<a class="table-link" href="${requestDetailHref(r.id)}&mode=edit">${r.id}</a>` },
  { key: 'title', label: 'RFP Title' },
  { key: 'lastUpdated', label: 'Last updated', cellClass: 'cell-muted' },
  { key: 'action', label: 'Action', render: (r) => `<a class="table-view-action" href="${requestDetailHref(r.id)}&mode=edit">${r.action}</a>` },
];

const KPI_SUBMISSIONS_COLUMNS = [
  { key: 'id', label: 'RFP ID', cellClass: 'cell-id', render: (r) => `<a class="table-link" href="${requestDetailHref(r.id)}">${r.id}</a>` },
  { key: 'title', label: 'RFP Title' },
  { key: 'lastUpdated', label: 'Last updated', cellClass: 'cell-muted' },
  { key: 'action', label: 'Action', render: (r) => `<span class="kpi-action-chip ${r.tone}">${r.action}</span>` },
];

const KPI_AWAITING_APPROVAL_COLUMNS = [
  { key: 'id', label: 'RFP ID', cellClass: 'cell-id', render: (r) => `<a class="table-link" href="${requestDetailHref(r.id)}">${r.id}</a>` },
  { key: 'title', label: 'RFP Title' },
  { key: 'submittedBy', label: 'Submitted By', cellClass: 'cell-muted' },
  { key: 'pendingSince', label: 'Pending Since', cellClass: 'cell-muted' },
  { key: 'action', label: 'Action', render: (r) => `<a class="table-view-action" href="${requestDetailHref(r.id)}">${r.action}</a>` },
];

async function renderKpiSnapshotSection(containerId) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const snapshot = await DataStore.getKpiSnapshot();

  const cards = [
    {
      id: 'drafts',
      icon: 'fa-solid fa-file-pen',
      label: 'My Drafts',
      value: String(snapshot.drafts.count),
      sub: snapshot.drafts.sub,
      interactive: true,
      rows: KPI_DRAFTS_ROWS,
      columns: KPI_DRAFTS_COLUMNS,
    },
    {
      id: 'submissions',
      icon: 'fa-solid fa-paper-plane',
      label: 'My Submissions',
      value: String(snapshot.submissions.count),
      sub: snapshot.submissions.sub,
      interactive: true,
      rows: KPI_SUBMISSIONS_ROWS,
      columns: KPI_SUBMISSIONS_COLUMNS,
    },
    {
      id: 'awaiting-approval',
      icon: 'fa-solid fa-clock',
      label: 'Awaiting your Approvals',
      value: String(snapshot.awaitingApproval.count),
      sub: snapshot.awaitingApproval.sub,
      subUrgent: true,
      interactive: true,
      rows: KPI_AWAITING_APPROVAL_ROWS,
      columns: KPI_AWAITING_APPROVAL_COLUMNS,
    },
    {
      id: 'rfp-value',
      icon: 'fa-solid fa-sack-dollar',
      label: 'Total RFP Value',
      value: `${snapshot.totalRfpValue.value.toLocaleString('en-US')} SAR`,
      sub: snapshot.totalRfpValue.sub,
      interactive: false,
    },
    {
      id: 'po-value',
      icon: 'fa-solid fa-sack-dollar',
      label: 'Total PO Value',
      value: `${snapshot.totalPoValue.value.toLocaleString('en-US')} SAR`,
      sub: snapshot.totalPoValue.sub,
      interactive: false,
    },
  ];

  mount.innerHTML = `
    <div class="kpi-row">
      ${cards.map((card) => `
        <div class="kpi-card${card.interactive ? '' : ' non-interactive'}" data-kpi-id="${card.id}">
          <div class="kpi-card-top">
            <span class="kpi-card-icon"><i class="${card.icon}"></i></span>
            ${card.interactive ? '<i class="fa-solid fa-chevron-down kpi-card-chevron"></i>' : ''}
          </div>
          <div class="kpi-card-value">${card.value}</div>
          <div class="kpi-card-label">${card.label}</div>
          <div class="kpi-card-sub${card.subUrgent ? ' urgent' : ''}">${card.sub}</div>
        </div>
      `).join('')}
    </div>
    <div class="kpi-drilldown" id="kpi-drilldown">
      <div class="kpi-drilldown-header">
        <span class="kpi-drilldown-title" id="kpi-drilldown-title"></span>
        <button class="kpi-drilldown-close" id="kpi-drilldown-close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div id="kpi-drilldown-body"></div>
    </div>
  `;

  const drilldown = document.getElementById('kpi-drilldown');
  const drilldownTitle = document.getElementById('kpi-drilldown-title');
  const drilldownBody = document.getElementById('kpi-drilldown-body');

  function closeDrilldown() {
    drilldown.classList.remove('open');
    mount.querySelectorAll('.kpi-card.open').forEach((el) => el.classList.remove('open'));
  }

  document.getElementById('kpi-drilldown-close').addEventListener('click', closeDrilldown);

  mount.querySelectorAll('.kpi-card').forEach((cardEl) => {
    const card = cards.find((c) => c.id === cardEl.dataset.kpiId);
    if (!card.interactive) return;

    cardEl.addEventListener('click', () => {
      const alreadyOpen = cardEl.classList.contains('open');

      mount.querySelectorAll('.kpi-card.open').forEach((el) => el.classList.remove('open'));

      if (alreadyOpen) {
        closeDrilldown();
        return;
      }

      cardEl.classList.add('open');
      drilldownTitle.textContent = `${card.label} (${card.rows.length})`;
      drilldownBody.innerHTML = buildTableHtml({ columns: card.columns, rows: card.rows, compact: true });
      drilldown.classList.add('open');
    });
  });
}
