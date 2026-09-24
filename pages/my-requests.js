/*
  My Requests page controller — Phase 3.
  Depends on data-store.js, badge.js, table.js, dialog.js, chips.js,
  filter-panel.js, pagination.js (all loaded before this file).
*/

const MR_VIEW_STORAGE_KEY = 'munafasat.myRequestsView';

const mrState = {
  allRows: [],
  search: '',
  filters: { status: [], project: [], dateFrom: '', dateTo: '' },
  page: 1,
  pageSize: 20,
  view: sessionStorage.getItem(MR_VIEW_STORAGE_KEY) === 'card' ? 'card' : 'list',
};

function mrFilteredRows() {
  const q = mrState.search.trim().toLowerCase();
  return mrState.allRows.filter((r) => {
    if (q && !(r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))) return false;
    if (mrState.filters.status.length && !mrState.filters.status.includes(r.approvalStatus)) return false;
    if (mrState.filters.project.length && !mrState.filters.project.includes(r.project)) return false;
    if (mrState.filters.dateFrom && r.createdDate < mrState.filters.dateFrom) return false;
    if (mrState.filters.dateTo && r.createdDate > mrState.filters.dateTo) return false;
    return true;
  });
}

function mrHasActiveFilters() {
  const f = mrState.filters;
  return f.status.length > 0 || f.project.length > 0 || !!f.dateFrom || !!f.dateTo;
}

const MR_COLUMNS = [
  { key: 'id', label: 'Request Number', cellClass: 'cell-id', render: (r) => `<a class="table-link" href="${requestDetailHref(r.id)}">${r.id}</a>` },
  { key: 'title', label: 'Request Name' },
  { key: 'project', label: 'Project Name', cellClass: 'cell-muted' },
  { key: 'department', label: 'Department', cellClass: 'cell-muted' },
  { key: 'createdDate', label: 'Created On', cellClass: 'cell-muted', render: (r) => formatDate(r.createdDate) },
  { key: 'approvalStatus', label: 'Status', render: (r) => renderApprovalChip(r.approvalStatus) },
  {
    key: 'actions',
    label: 'Actions',
    render: (r) => `
      <div class="row-actions">
        ${r.approvalStatus === 'Draft' ? `<button class="row-action" data-action="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>` : ''}
        ${r.approvalStatus === 'Draft' ? `<button class="row-action row-action-delete" data-action="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
        <button class="row-action" data-action="download" title="Download"><i class="fa-solid fa-download"></i></button>
      </div>
    `,
  },
];

function mrEmptyHtml() {
  if (mrState.allRows.length === 0) {
    return `
      <div class="mr-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No requests yet.</h3>
        <p>Create your first RFP to get started.</p>
        <a class="mr-create-btn" href="create-request.html"><i class="fa-solid fa-plus"></i><span>Create request</span></a>
      </div>
    `;
  }
  return `
    <div class="mr-empty-state">
      <i class="fa-solid fa-magnifying-glass"></i>
      <h3>No requests found</h3>
      <p>Try changing your search or filter criteria.</p>
      <button class="filter-btn-outline" id="mr-clear-filters-btn">Clear filters</button>
    </div>
  `;
}

function mrCardHtml(r) {
  return `
    <div class="mr-req-card" data-row-key="${r.id}">
      <div class="mr-req-card-top">
        <a class="table-link mr-req-card-id" href="${requestDetailHref(r.id)}">${r.id}</a>
        ${renderApprovalChip(r.approvalStatus)}
      </div>
      <div class="mr-req-card-title">${r.title}</div>
      <div class="mr-req-card-meta">
        <div><i class="fa-solid fa-diagram-project"></i> ${r.project}</div>
        <div><i class="fa-solid fa-building"></i> ${r.department}</div>
        <div><i class="fa-regular fa-calendar"></i> ${formatDate(r.createdDate)}</div>
      </div>
      <div class="mr-req-card-actions">
        ${r.approvalStatus === 'Draft' ? `<button class="row-action" data-action="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>` : ''}
        ${r.approvalStatus === 'Draft' ? `<button class="row-action row-action-delete" data-action="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
        <button class="row-action" data-action="download" title="Download"><i class="fa-solid fa-download"></i></button>
      </div>
    </div>
  `;
}

function mrRenderTable() {
  const filtered = mrFilteredRows();
  const totalPages = Math.max(1, Math.ceil(filtered.length / mrState.pageSize));
  mrState.page = Math.min(mrState.page, totalPages);
  const start = (mrState.page - 1) * mrState.pageSize;
  const pageRows = filtered.slice(start, start + mrState.pageSize);

  const tableMount = document.getElementById('mr-table-mount');
  document.querySelectorAll('.mr-view-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === mrState.view));

  if (pageRows.length === 0) {
    tableMount.innerHTML = mrEmptyHtml();
  } else if (mrState.view === 'card') {
    tableMount.innerHTML = `<div class="mr-req-card-grid">${pageRows.map(mrCardHtml).join('')}</div>`;
  } else {
    tableMount.innerHTML = buildTableHtml({
      columns: MR_COLUMNS,
      rows: pageRows,
      rowKey: (r) => r.id,
      emptyHtml: mrEmptyHtml(),
    });
  }

  const clearBtn = document.getElementById('mr-clear-filters-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      mrState.search = '';
      mrState.filters = { status: [], project: [], dateFrom: '', dateTo: '' };
      document.getElementById('mr-search-input').value = '';
      mrState.page = 1;
      mrRefresh();
    });
  }

  wireTableRowEvents();

  renderPagination({
    containerId: 'mr-pagination',
    totalItems: filtered.length,
    page: mrState.page,
    pageSize: mrState.pageSize,
    pageSizeOptions: [8, 20, 32],
    onPageChange: (p) => { mrState.page = p; mrRenderTable(); },
    onPageSizeChange: (size) => { mrState.pageSize = size; mrState.page = 1; mrRenderTable(); },
  });

  document.getElementById('mr-filter-active-dot').style.display = mrHasActiveFilters() ? 'block' : 'none';
}

function wireTableRowEvents() {
  const mount = document.getElementById('mr-table-mount');
  if (!mount || mount.dataset.wired) return;
  mount.dataset.wired = 'true';

  mount.addEventListener('click', (event) => {
    if (event.target.closest('a')) return; // let the ID link navigate itself
    const actionBtn = event.target.closest('.row-action');
    const row = event.target.closest('[data-row-key]');
    if (!row) return;
    const id = row.dataset.rowKey;

    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === 'edit') {
        window.location.href = `${requestDetailHref(id)}&mode=edit`;
      } else if (action === 'delete') {
        openDeleteConfirmDialog(id);
      } else if (action === 'download') {
        triggerStubDownload(id);
      }
      return;
    }

    window.location.href = requestDetailHref(id);
  });
}

function openDeleteConfirmDialog(id) {
  openDialog({
    title: 'Delete request?',
    bodyHtml: `
      <p style="margin: 0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Are you sure you want to delete ${id}? This action cannot be undone.
      </p>
      <div class="save-filter-actions">
        <button class="filter-btn-outline" id="delete-cancel-btn">Cancel</button>
        <button class="filter-btn-primary" id="delete-confirm-btn" style="background: var(--color-error-500);">Delete</button>
      </div>
    `,
  });
  document.getElementById('delete-cancel-btn').addEventListener('click', closeDialog);
  document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
    mrState.allRows = mrState.allRows.filter((r) => r.id !== id);
    await DataStore.deleteRfp(id);
    closeDialog();
    mrRenderTable();
  });
}

function triggerStubDownload(id) {
  const row = mrState.allRows.find((r) => r.id === id);
  const content = `Request: ${id}\nName: ${row ? row.title : ''}\n\nThis is a stub export from the Munafasat prototype.`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mrRefresh() {
  mrRenderTable();
}

async function mrOpenFilterPanel() {
  const projectOptions = await DataStore.getProjectList();
  const dates = mrState.allRows.map((r) => r.createdDate).sort();
  const maxDate = dates[dates.length - 1];
  const recentFrom = new Date(maxDate);
  recentFrom.setDate(recentFrom.getDate() - 14);
  const recentFromStr = recentFrom.toISOString().slice(0, 10);

  const presets = [
    { label: 'My submitted requests', status: ['Submitted'], project: [], dateFrom: '', dateTo: '' },
    { label: 'My approved requests', status: ['Approved'], project: [], dateFrom: '', dateTo: '' },
    { label: 'Recent requests', status: [], project: [], dateFrom: recentFromStr, dateTo: maxDate },
    { label: 'IT requests', status: [], project: ['IT Infrastructure Refresh', 'Digital Transformation Program'], dateFrom: '', dateTo: '' },
  ];

  openFilterPanel({
    projectOptions,
    presets,
    currentFilters: mrState.filters,
    onApply: (filters) => {
      mrState.filters = filters;
      mrState.page = 1;
      mrRenderTable();
    },
  });
}

async function initMyRequests() {
  mrState.allRows = await DataStore.getAllRfps();

  document.getElementById('mr-search-input').addEventListener('input', (e) => {
    mrState.search = e.target.value;
    mrState.page = 1;
    mrRenderTable();
  });

  document.getElementById('mr-filter-btn').addEventListener('click', mrOpenFilterPanel);

  document.querySelectorAll('.mr-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      mrState.view = btn.dataset.view;
      sessionStorage.setItem(MR_VIEW_STORAGE_KEY, mrState.view);
      mrRenderTable();
    });
  });

  mrRenderTable();
}

document.addEventListener('DOMContentLoaded', initMyRequests);
