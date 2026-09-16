/*
  KPI Card component — maps to powerappsui.com "KPI Cards".
  Renders the 5-card procurement snapshot row plus a shared drill-down
  panel beneath it. Only one card's drill-down is open at a time.
  Depends on: js/data-store.js, components/table/table.js, components/badge/badge.js.
*/

async function renderKpiSnapshotSection(containerId) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  const [snapshot, allRfps, pendingApproval, topValue] = await Promise.all([
    DataStore.getKpiSnapshot(),
    DataStore.getAllRfps(),
    DataStore.getPendingApprovalRfps(),
    DataStore.getTopValueRfps(10),
  ]);

  const drafts = allRfps.filter((r) => r.status === 'Draft');
  const submissions = allRfps.filter((r) => r.status === 'Submitted');

  const cards = [
    {
      id: 'drafts',
      icon: 'fa-solid fa-file-pen',
      label: 'My Drafts',
      value: String(snapshot.drafts.count),
      sub: snapshot.drafts.sub,
      rows: drafts,
    },
    {
      id: 'submissions',
      icon: 'fa-solid fa-paper-plane',
      label: 'My Submissions',
      value: String(snapshot.submissions.count),
      sub: snapshot.submissions.sub,
      rows: submissions,
    },
    {
      id: 'awaiting-approval',
      icon: 'fa-solid fa-clock',
      label: 'Awaiting your Approvals',
      value: String(snapshot.awaitingApproval.count),
      sub: snapshot.awaitingApproval.sub,
      subUrgent: true,
      rows: pendingApproval,
    },
    {
      id: 'rfp-value',
      icon: 'fa-solid fa-sack-dollar',
      label: 'Total RFP Value',
      value: `${snapshot.totalRfpValue.value.toLocaleString('en-US')} SAR`,
      sub: snapshot.totalRfpValue.sub,
      rows: topValue,
      rowsTitle: 'Top 10 RFPs by value',
    },
    {
      id: 'po-value',
      icon: 'fa-solid fa-sack-dollar',
      label: 'Total PO Value',
      value: `${snapshot.totalPoValue.value.toLocaleString('en-US')} SAR`,
      sub: snapshot.totalPoValue.sub,
      rows: topValue,
      rowsTitle: '10 RFPs included in PO value',
    },
  ];

  mount.innerHTML = `
    <div class="kpi-row">
      ${cards.map((card) => `
        <div class="kpi-card" data-kpi-id="${card.id}">
          <div class="kpi-card-top">
            <span class="kpi-card-icon"><i class="${card.icon}"></i></span>
            <i class="fa-solid fa-chevron-down kpi-card-chevron"></i>
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

  const kpiColumns = [
    { key: 'id', label: 'Request ID', cellClass: 'cell-id', render: (r) => `<a class="table-link" href="${requestDetailHref(r.id)}">${r.id}</a>` },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status', render: (r) => renderStatusBadge(r.status) },
    { key: 'lastUpdatedDate', label: 'Last Updated', render: (r) => formatDate(r.lastUpdatedDate) },
    { key: 'action', label: '', render: (r) => `<a class="table-view-action" href="${requestDetailHref(r.id)}">View <i class="fa-solid fa-arrow-right"></i></a>` },
  ];

  function closeDrilldown() {
    drilldown.classList.remove('open');
    mount.querySelectorAll('.kpi-card.open').forEach((el) => el.classList.remove('open'));
  }

  document.getElementById('kpi-drilldown-close').addEventListener('click', closeDrilldown);

  mount.querySelectorAll('.kpi-card').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const card = cards.find((c) => c.id === cardEl.dataset.kpiId);
      const alreadyOpen = cardEl.classList.contains('open');

      mount.querySelectorAll('.kpi-card.open').forEach((el) => el.classList.remove('open'));

      if (alreadyOpen) {
        closeDrilldown();
        return;
      }

      cardEl.classList.add('open');
      drilldownTitle.textContent = `${card.rowsTitle || card.label} (${card.rows.length})`;
      drilldownBody.innerHTML = buildTableHtml({ columns: kpiColumns, rows: card.rows, compact: true });
      drilldown.classList.add('open');
    });
  });
}
