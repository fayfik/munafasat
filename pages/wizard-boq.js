/*
  Step 2 - Bill of Quantity controller.
  Depends on: data-store.js, dialog.js, toast.js, searchable-select.js,
  table.js, header.js (for the global setupDropdown() helper), wizard-shell.js,
  and the SheetJS `XLSX` global (loaded via CDN in wizard-boq.html) — all
  loaded before this file.

  Rebuilt to remove the Add/Edit BOQ Item modal entirely: every cell is
  inline-editable directly in the table. Native <select> elements are used
  for Material group / Purchase group / Procurement type / UOM (a per-row
  searchable-select instance is used only for Budgeted Item, since the
  source spec calls that one out specifically as "searchable dropdown").
  Delivery Date uses a plain <input type="date"> rather than the app's
  Hijri/Gregorian date-picker component, to keep a wide, many-column table
  tractable — flagged here as a pragmatic simplification.
*/

const PROCUREMENT_TYPES = ['Goods', 'Services', 'Works', 'Consulting'];
const PURCHASE_GROUPS = ['IT Procurement', 'Facilities Procurement', 'Corporate Services', 'Professional Services'];
const MATERIAL_GROUPS = ['Hardware', 'Software', 'Networking Equipment', 'Furniture', 'Maintenance Services', 'Consulting Services'];
const UOM_OPTIONS = ['Uni', 'EA', 'CAR', 'AU'];

const IMPORT_TEMPLATE_HEADERS = [
  'Item No.', 'Item Name', 'Description', 'Budgeted item', 'Material group', 'Purchase group',
  'Procurement type', 'UOM', 'Quantity', 'Unit Price (SAR)', 'Delivery Date', 'Has Brand Name', 'Total (SAR)',
];

// >= 15 canned rows, used to simulate a bulk Excel import (the redesigned
// Import Data flow no longer actually parses the uploaded file's content —
// see the spec note on openImportDataModal()).
const IMPORT_SIMULATED_POOL = [
  ['Standard laptop unit', 'Business-grade laptop for staff use.', 'Hardware', 'EA', 1, 4200],
  ['Docking station', 'USB-C docking station with dual monitor support.', 'Hardware', 'EA', 1, 650],
  ['Core switch', '24-port managed switch.', 'Networking Equipment', 'EA', 1, 3800],
  ['Firewall appliance', 'Next-gen firewall appliance.', 'Networking Equipment', 'EA', 1, 12000],
  ['Software license (annual)', 'Annual per-seat software license.', 'Software', 'EA', 1, 900],
  ['Cloud subscription', 'Annual cloud platform subscription.', 'Software', 'Uni', 1, 60000],
  ['Extended warranty', '3-year extended hardware warranty.', 'Maintenance Services', 'Uni', 1, 600],
  ['Installation services', 'On-site installation and setup.', 'Consulting Services', 'Uni', 1, 8000],
  ['Training session', 'Half-day end-user training session.', 'Consulting Services', 'Uni', 1, 3000],
  ['Office chair', 'Ergonomic office chair.', 'Furniture', 'EA', 1, 850],
  ['Desk unit', 'Height-adjustable desk.', 'Furniture', 'EA', 1, 1200],
  ['Network cabling', 'Structured cabling per floor.', 'Networking Equipment', 'Uni', 1, 15000],
  ['Data migration services', 'Migration of legacy data to the new system.', 'Consulting Services', 'Uni', 1, 25000],
  ['Managed support retainer', 'Monthly managed support retainer.', 'Maintenance Services', 'Uni', 12, 5000],
  ['Endpoint protection license', 'Per-device endpoint protection license.', 'Software', 'EA', 1, 120],
  ['Project management services', 'Dedicated PM for implementation.', 'Consulting Services', 'Uni', 1, 40000],
];

// Canned line items per project category, used by "Import BOQ from Similar
// RFPs" since mock-data/rfps.json doesn't carry real BOQ breakdowns.
const SIMILAR_RFP_ITEM_POOL = {
  'IT Equipment': [
    { name: 'Standard laptop unit', description: 'Business-grade laptop for staff use.', uom: 'EA', quantity: 25, unitPrice: 4200 },
    { name: 'Docking station', description: 'USB-C docking station with dual monitor support.', uom: 'EA', quantity: 25, unitPrice: 650 },
  ],
  'Cloud & IT Services': [
    { name: 'Cloud subscription (annual)', description: 'Annual cloud platform subscription.', uom: 'Uni', quantity: 1, unitPrice: 180000 },
    { name: 'Implementation services', description: 'Setup and configuration services.', uom: 'Uni', quantity: 1, unitPrice: 60000 },
  ],
  'Facilities & Maintenance': [
    { name: 'Facility maintenance contract', description: 'Annual facility maintenance and upkeep.', uom: 'Uni', quantity: 1, unitPrice: 90000 },
  ],
  'Consulting': [
    { name: 'Advisory retainer', description: 'Monthly advisory services retainer.', uom: 'Uni', quantity: 12, unitPrice: 15000 },
  ],
};

// The 4 hideable columns from Column configuration; every other column
// (Item No., Item Name, Description, Budgeted item, Quantity, Unit Price,
// Delivery Date, Has Brand Name, Total, Actions) is mandatory and always
// shown. Brand Name Justification is a separate table-wide conditional
// column (only exists once a row has Has Brand Name = Yes) and isn't part
// of this toggleable set.
const BOQ_COLUMN_CONFIG = [
  { key: 'itemNo', label: 'Item No.', mandatory: true },
  { key: 'name', label: 'Item Name', mandatory: true },
  { key: 'description', label: 'Description', mandatory: true },
  { key: 'budgetedItem', label: 'Budgeted item', mandatory: true },
  { key: 'procurementType', label: 'Procurement type', mandatory: false },
  { key: 'purchaseGroup', label: 'Purchase group', mandatory: false },
  { key: 'materialGroup', label: 'Material group', mandatory: false },
  { key: 'uom', label: 'UOM', mandatory: false },
  { key: 'quantity', label: 'Quantity', mandatory: true },
  { key: 'unitPrice', label: 'Unit Price (SAR)', mandatory: true },
  { key: 'deliveryDate', label: 'Delivery Date', mandatory: true },
  { key: 'hasBrandName', label: 'Has Brand Name', mandatory: true },
  { key: 'total', label: 'Total (SAR)', mandatory: true },
  { key: 'actions', label: 'Actions', mandatory: true },
];

const BOQ_COLVIS_STORAGE_KEY = 'munafasat.boqColumnVisibility';

const boq = {
  items: [],
  importBatches: [],
  step1FormData: {},
  projects: [],
  similarRfps: [],
  viewMode: 'full', // 'full' | 'compact' — see "Change view" (View more menu)
  undoSnapshot: null, // JSON snapshot of `items` before the last bulk action (AI/import/clear); null = nothing to undo
  pendingImportFile: null,
  budgetedSelects: {},
  columnWidths: {}, // { [columnIndex]: px } — ephemeral per-session, not persisted to WizardStore
  hiddenColumns: new Set(), // optional column keys the user has hidden via Column configuration
};

/* ---- Column configuration: visibility persisted for the browser session
   (sessionStorage), independent of the RFP's own formData — this is a
   table display preference, not RFP content. ---- */

function loadColumnVisibility() {
  try {
    const raw = sessionStorage.getItem(BOQ_COLVIS_STORAGE_KEY);
    // Optional columns default to hidden until the user has ever touched
    // Column configuration this session — first-time visitors (including
    // mid AI-generate/import) see only the default columns, not every
    // optional one turned on.
    boq.hiddenColumns = new Set(raw ? JSON.parse(raw) : BOQ_COLUMN_CONFIG.filter((c) => !c.mandatory).map((c) => c.key));
  } catch {
    boq.hiddenColumns = new Set(BOQ_COLUMN_CONFIG.filter((c) => !c.mandatory).map((c) => c.key));
  }
}

function persistColumnVisibility() {
  sessionStorage.setItem(BOQ_COLVIS_STORAGE_KEY, JSON.stringify([...boq.hiddenColumns]));
}

/* ---- Persistence ---- */

function loadBoqState() {
  const fd = WizardStore.getFormData();
  boq.items = fd.boqItems || [];
  boq.importBatches = fd.boqImportBatches || [];
}

function persistBoq() {
  WizardStore.updateFormData({ boqItems: boq.items, boqImportBatches: boq.importBatches });
  updateContinueState();
}

function newItemId() {
  return `boq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---- Undo (toolbar icon) ---- */

function captureUndoSnapshot() {
  boq.undoSnapshot = JSON.stringify(boq.items);
}

function handleUndoClick() {
  if (!boq.undoSnapshot) return;
  boq.items = JSON.parse(boq.undoSnapshot);
  boq.undoSnapshot = null;
  persistBoq();
  renderBoqPage();
  showToast('Change undone.');
}

/* ---- Totals ---- */

function formatBoqSAR(amount) {
  return `SAR ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function itemTotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

function computeTotals() {
  const subtotal = boq.items.reduce((sum, it) => sum + itemTotal(it), 0);
  const vat = subtotal * 0.15;
  return { subtotal, vat, grand: subtotal + vat };
}

/* ---- Validation / footer (unchanged gating logic) ---- */

function updateContinueState() {
  setWizardContinueEnabled(boq.items.length > 0);
}

/* ---- Budgeted Item options (sourced from Step 1) ---- */

function boqBudgetedItemOptions() {
  const project = boq.step1FormData.projectId ? boq.projects.find((p) => p.id === boq.step1FormData.projectId) : null;
  const ids = boq.step1FormData.budgetedItemIds || [];
  if (!project) return [];
  return project.budgetedItems.filter((i) => ids.includes(i.id)).map((i) => ({ value: i.id, label: i.name }));
}

function budgetedItemName(id) {
  if (!id) return '';
  const opt = boqBudgetedItemOptions().find((o) => o.value === id);
  return opt ? opt.label : '';
}

/* ---- Rendering ---- */

function renderBoqPage() {
  const mount = document.getElementById('wizard-step-content');

  mount.innerHTML = `
    <div class="boq-header-card">
      <div>
        <div class="boq-header-title">Bill of Quantity</div>
        <div class="boq-header-sub">Add one or more line items to this RFP</div>
      </div>
      <div class="boq-header-actions">
        <button type="button" class="boq-ai-section-btn" id="boq-generate-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        <button type="button" class="boq-undo-icon-btn" id="boq-undo-btn" title="Undo last change" ${boq.undoSnapshot ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i></button>
        <button type="button" class="boq-btn-outline" id="boq-import-data-btn"><i class="fa-solid fa-file-import"></i> Import data</button>
        <div class="boq-dropdown" id="boq-viewmore-dropdown">
          <button type="button" class="boq-btn-outline" id="boq-viewmore-btn">View more <i class="fa-solid fa-chevron-down"></i></button>
          <div class="boq-dropdown-menu" id="boq-viewmore-menu">
            <div class="boq-dropdown-item" id="boq-menu-similar-rfps">Import BOQ from similar RFPs</div>
            <div class="boq-dropdown-item" id="boq-menu-change-view">Change view</div>
            <div class="boq-dropdown-item danger" id="boq-menu-clear-table">Clear table</div>
            <div class="boq-dropdown-divider"></div>
            <div class="boq-dropdown-item boq-dropdown-submenu-trigger" id="boq-menu-download-toggle">
              <span>Download</span> <i class="fa-solid fa-chevron-right"></i>
            </div>
            <div class="boq-dropdown-submenu" id="boq-download-submenu">
              <div class="boq-dropdown-item" id="boq-dl-etimad">Material - Etimad templates prefilled</div>
              <div class="boq-dropdown-item" id="boq-dl-blank">Below listed items</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="boq-section-wrap">
      <button type="button" class="boq-colcfg-icon-btn" id="boq-colcfg-btn" title="Column configuration"><i class="fa-solid fa-table-columns"></i></button>
      <div class="boq-section-card" id="boq-section-card"></div>
    </div>
    <div class="boq-colcfg-overlay" id="boq-colcfg-overlay">
      <div class="boq-colcfg-panel">
        <div class="boq-colcfg-header">
          <div class="boq-colcfg-title">Column configuration</div>
          <button type="button" class="boq-colcfg-close" id="boq-colcfg-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="boq-colcfg-body" id="boq-colcfg-body"></div>
      </div>
    </div>
  `;

  document.getElementById('boq-import-data-btn').addEventListener('click', openImportDataModal);
  document.getElementById('boq-generate-ai-btn').addEventListener('click', openGenerateAiPreview);
  document.getElementById('boq-undo-btn').addEventListener('click', handleUndoClick);
  document.getElementById('boq-colcfg-btn').addEventListener('click', openColumnConfigDrawer);
  document.getElementById('boq-colcfg-close').addEventListener('click', closeColumnConfigDrawer);
  document.getElementById('boq-colcfg-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'boq-colcfg-overlay') closeColumnConfigDrawer();
  });

  setupDropdown('boq-viewmore-dropdown', 'boq-viewmore-btn', 'boq-viewmore-menu');

  document.getElementById('boq-menu-download-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('boq-download-submenu').classList.toggle('open');
  });

  document.getElementById('boq-menu-similar-rfps').addEventListener('click', () => { closeAllBoqMenus(); openSimilarRfpsModal(); });
  document.getElementById('boq-menu-change-view').addEventListener('click', () => { closeAllBoqMenus(); toggleChangeView(); });
  document.getElementById('boq-menu-clear-table').addEventListener('click', () => { closeAllBoqMenus(); confirmClearTable(); });
  document.getElementById('boq-dl-etimad').addEventListener('click', () => { closeAllBoqMenus(); downloadEtimadPrefilledTemplate(); });
  // "Below listed items" per the source doc's Download submenu (exact
  // intent beyond that label wasn't detailed) — reuses the same blank
  // template export the Import Data modal's own "Download Template" step
  // uses, listing the standard BOQ columns.
  document.getElementById('boq-dl-blank').addEventListener('click', () => { closeAllBoqMenus(); exportBoqTemplate(); });

  renderSectionCard();
}

function closeAllBoqMenus() {
  document.querySelectorAll('.boq-dropdown-menu.open').forEach((m) => m.classList.remove('open'));
  document.getElementById('boq-download-submenu')?.classList.remove('open');
}

function toggleChangeView() {
  // "Change view" has no further detail in the source spec — implemented
  // as a full/compact column toggle as a plausible placeholder behavior.
  boq.viewMode = boq.viewMode === 'compact' ? 'full' : 'compact';
  boq.columnWidths = {}; // column set changes between views, so indices no longer line up
  renderSectionCard();
  showToast(`Switched to ${boq.viewMode === 'compact' ? 'compact' : 'full'} view.`);
}

function renderSectionCard() {
  const card = document.getElementById('boq-section-card');
  if (boq.items.length === 0 && boq.importBatches.length === 0) {
    card.innerHTML = buildEmptyStateHtml();
    wireEmptyState();
    return;
  }

  const totals = computeTotals();
  card.innerHTML = `
    ${buildTableHtml({
      columns: getBoqColumns(),
      rows: boq.items,
      rowKey: (r) => r.id,
      emptyText: 'No items yet.',
      resizable: true,
      tableId: 'boq-items-table',
      columnWidths: boq.columnWidths,
    })}
    ${boq.items.length > 0 ? `<button type="button" class="boq-add-row-btn" id="boq-add-row-btn"><i class="fa-solid fa-plus"></i> Add New Item</button>` : ''}
    ${boq.items.length > 0 ? `
      <div class="boq-totals">
        <div class="boq-totals-row"><span>Subtotal</span><span>${formatBoqSAR(totals.subtotal)}</span></div>
        <div class="boq-totals-row"><span>VAT (15%)</span><span>${formatBoqSAR(totals.vat)}</span></div>
        <div class="boq-totals-row grand"><span>Grand Total (incl. VAT)</span><span>${formatBoqSAR(totals.grand)}</span></div>
      </div>
    ` : ''}
    ${boq.importBatches.map((batch) => buildImportCardHtml(batch)).join('')}
  `;

  document.getElementById('boq-add-row-btn')?.addEventListener('click', addNewItemRow);
  wireTableCellEvents();
  wireBudgetedItemSelects();
  wireImportCards();
  enableColumnResize('boq-items-table', boq.columnWidths);
}

function boqAnyBrandName() {
  return boq.items.some((it) => it.hasBrandName);
}

function selectCellHtml(id, field, options, current) {
  return `
    <select class="boq-cell-select" data-field="${field}" data-id="${id}">
      <option value="">—</option>
      ${options.map((o) => `<option value="${escapeHtml(o)}" ${current === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
    </select>
  `;
}

function getBoqColumns() {
  const compact = boq.viewMode === 'compact';
  const cols = [
    { key: 'itemNo', label: 'Item No.', render: (r) => String(boq.items.indexOf(r) + 1).padStart(2, '0') },
    { key: 'name', label: 'Item Name', render: (r) => `<input type="text" class="boq-cell-input" data-field="name" data-id="${r.id}" value="${escapeHtml(r.name)}" placeholder="Item name">` },
    {
      key: 'description', label: 'Description', render: (r) => `
        <div class="boq-desc-cell">
          <input type="text" class="boq-cell-input" data-field="description" data-id="${r.id}" value="${escapeHtml(r.description || '')}" placeholder="Description">
          <button type="button" class="boq-row-ai-btn" data-ai-row="${r.id}" title="Auto-fill from Item Name + Description"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
        </div>`,
    },
  ];

  if (!compact) {
    cols.push({ key: 'budgetedItem', label: 'Budgeted Item', render: (r) => `<div id="boq-sel-budgeted-${r.id}"></div>` });
    cols.push({ key: 'materialGroup', label: 'Material group', render: (r) => selectCellHtml(r.id, 'materialGroup', MATERIAL_GROUPS, r.materialGroup) });
    cols.push({ key: 'purchaseGroup', label: 'Purchase group', render: (r) => selectCellHtml(r.id, 'purchaseGroup', PURCHASE_GROUPS, r.purchaseGroup) });
    cols.push({ key: 'procurementType', label: 'Procurement type', render: (r) => selectCellHtml(r.id, 'procurementType', PROCUREMENT_TYPES, r.procurementType) });
  }

  cols.push({ key: 'uom', label: 'UOM', render: (r) => selectCellHtml(r.id, 'uom', UOM_OPTIONS, r.uom) });
  cols.push({ key: 'quantity', label: 'Quantity', render: (r) => `<input type="number" min="0" step="1" class="boq-cell-input boq-cell-num" data-field="quantity" data-id="${r.id}" value="${r.quantity ?? ''}">` });
  cols.push({ key: 'unitPrice', label: 'Unit Price (SAR)', render: (r) => `<input type="number" min="0" step="0.01" class="boq-cell-input boq-cell-num" data-field="unitPrice" data-id="${r.id}" value="${r.unitPrice ?? ''}">` });

  if (!compact) {
    cols.push({ key: 'deliveryDate', label: 'Delivery Date', render: (r) => `<input type="date" class="boq-cell-input" data-field="deliveryDate" data-id="${r.id}" value="${r.deliveryDate || ''}">` });
  }

  cols.push({ key: 'hasBrandName', label: 'Has Brand Name', render: (r) => `<button type="button" class="boq-toggle-switch${r.hasBrandName ? ' on' : ''}" data-toggle-brand="${r.id}" aria-label="Has brand name"></button>` });

  // Table-wide conditional: only shown once at least one row has Has Brand
  // Name = Yes; a row without it stays disabled/blank in this column.
  if (boqAnyBrandName()) {
    cols.push({
      key: 'brandJustification', label: 'Brand Name Justification', render: (r) => `
        <input type="text" class="boq-cell-input" data-field="brandJustification" data-id="${r.id}"
          value="${escapeHtml(r.brandJustification || '')}"
          placeholder="${r.hasBrandName ? 'Why this brand is required' : 'N/A'}" ${r.hasBrandName ? '' : 'disabled'}>`,
    });
  }

  cols.push({ key: 'total', label: 'Total (SAR)', render: (r) => `<strong class="boq-total-cell" data-total-id="${r.id}">${formatBoqSAR(itemTotal(r))}</strong>` });
  cols.push({
    key: 'actions', label: 'Actions', render: (r) => `
      <div class="row-actions">
        <button class="row-action row-action-delete" data-action="delete" data-id="${r.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `,
  });

  return cols.filter((c) => !boq.hiddenColumns.has(c.key));
}

/* ---- Column configuration drawer ---- */

function buildColCfgBodyHtml() {
  const rowHtml = (col) => {
    const on = col.mandatory || !boq.hiddenColumns.has(col.key);
    return `
      <div class="boq-colcfg-row">
        <span class="boq-colcfg-row-label">${col.label}</span>
        <button type="button" class="boq-toggle-switch${on ? ' on' : ''}" data-colcfg-toggle="${col.key}" ${col.mandatory ? 'disabled title="Always shown"' : ''}></button>
      </div>
    `;
  };
  const mandatory = BOQ_COLUMN_CONFIG.filter((c) => c.mandatory);
  const optional = BOQ_COLUMN_CONFIG.filter((c) => !c.mandatory);
  return `
    <div class="boq-colcfg-section-label">Default columns</div>
    ${mandatory.map(rowHtml).join('')}
    <div class="boq-colcfg-section-label">Optional columns</div>
    ${optional.map(rowHtml).join('')}
  `;
}

function openColumnConfigDrawer() {
  document.getElementById('boq-colcfg-body').innerHTML = buildColCfgBodyHtml();
  document.querySelectorAll('[data-colcfg-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.colcfgToggle;
      if (boq.hiddenColumns.has(key)) boq.hiddenColumns.delete(key);
      else boq.hiddenColumns.add(key);
      btn.classList.toggle('on');
      persistColumnVisibility();
      boq.columnWidths = {}; // column set is shifting, indices no longer line up
      renderSectionCard();
    });
  });
  document.getElementById('boq-colcfg-overlay').classList.add('open');
}

function closeColumnConfigDrawer() {
  document.getElementById('boq-colcfg-overlay')?.classList.remove('open');
}

/* ---- Per-row Budgeted Item searchable-select ---- */

function wireBudgetedItemSelects() {
  const options = boqBudgetedItemOptions();
  boq.items.forEach((r) => {
    const mountId = `boq-sel-budgeted-${r.id}`;
    if (!document.getElementById(mountId)) return;
    boq.budgetedSelects[r.id] = createSearchableSelect({
      mountId,
      mode: 'single',
      options,
      selected: r.budgetedItemId || null,
      placeholder: options.length ? 'Select item' : 'No items in Step 1',
      searchPlaceholder: 'Search',
      onChange: (val) => { r.budgetedItemId = val; persistBoq(); },
    });
  });
}

/* ---- Cell edit event delegation ---- */

function wireTableCellEvents() {
  const tbody = document.querySelector('#boq-section-card tbody');
  if (!tbody) return;

  tbody.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('boq-cell-input')) return;
    const item = boq.items.find((it) => it.id === el.dataset.id);
    if (!item) return;
    item[el.dataset.field] = el.value;
    if (el.dataset.field === 'quantity' || el.dataset.field === 'unitPrice') {
      const totalEl = tbody.querySelector(`[data-total-id="${item.id}"]`);
      if (totalEl) totalEl.textContent = formatBoqSAR(itemTotal(item));
    }
    persistBoq();
  });

  tbody.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.classList.contains('boq-cell-select')) return;
    const item = boq.items.find((it) => it.id === el.dataset.id);
    if (item) { item[el.dataset.field] = el.value || null; persistBoq(); }
  });

  tbody.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-brand]');
    if (toggleBtn) {
      const item = boq.items.find((it) => it.id === toggleBtn.dataset.toggleBrand);
      if (item) {
        const hadBrandColumn = boqAnyBrandName();
        item.hasBrandName = !item.hasBrandName;
        if (!item.hasBrandName) item.brandJustification = '';
        if (hadBrandColumn !== boqAnyBrandName()) boq.columnWidths = {}; // column set is shifting, indices no longer line up
        persistBoq();
        renderSectionCard(); // structural: Brand Justification column visibility may change
      }
      return;
    }

    const aiBtn = e.target.closest('[data-ai-row]');
    if (aiBtn) { runRowAi(aiBtn.dataset.aiRow); return; }

    const delBtn = e.target.closest('[data-action="delete"]');
    if (delBtn) {
      const item = boq.items.find((it) => it.id === delBtn.dataset.id);
      if (item) confirmDeleteItem(item);
    }
  });
}

/* ---- Per-row AI sparkle: auto-fill from Item Name + Description ---- */

// Scope of Work is filled in (Step 2) before BOQ is reached, so its text
// fields are folded into the same keyword corpus as Item Name/Description
// when suggesting Budgeted item / Procurement type / Purchase group /
// Material group / Quantity — a line item whose own name/description is
// generic but whose project's In Scope or Project Scope text names the
// relevant category still gets matched correctly.
function boqScopeOfWorkText() {
  const fd = boq.step1FormData;
  return [fd.executiveSummary, fd.projectScope, fd.inScope].filter(Boolean).join(' ').toLowerCase();
}

function suggestRowAiFields(item) {
  const text = `${item.name} ${item.description || ''} ${boqScopeOfWorkText()}`.toLowerCase();
  const budgetedOptions = boqBudgetedItemOptions();
  const matchedBudgeted = budgetedOptions.find((o) => text.includes(o.label.toLowerCase())) || budgetedOptions[0] || null;

  let materialGroup = 'Hardware';
  if (text.includes('software') || text.includes('license')) materialGroup = 'Software';
  else if (text.includes('network') || text.includes('switch') || text.includes('cabl') || text.includes('firewall')) materialGroup = 'Networking Equipment';
  else if (text.includes('furniture') || text.includes('chair') || text.includes('desk')) materialGroup = 'Furniture';
  else if (text.includes('maintenance') || text.includes('support') || text.includes('warranty')) materialGroup = 'Maintenance Services';
  else if (text.includes('consult') || text.includes('advisory') || text.includes('implementation') || text.includes('training') || text.includes('migration')) materialGroup = 'Consulting Services';

  let procurementType = 'Goods';
  if (materialGroup === 'Maintenance Services' || materialGroup === 'Consulting Services') procurementType = 'Services';

  let purchaseGroup = 'IT Procurement';
  if (text.includes('facilit') || text.includes('clean') || text.includes('landscap')) purchaseGroup = 'Facilities Procurement';
  else if (text.includes('legal') || text.includes('compliance')) purchaseGroup = 'Corporate Services';
  else if (materialGroup === 'Consulting Services') purchaseGroup = 'Professional Services';

  return {
    budgetedItemId: matchedBudgeted ? matchedBudgeted.value : item.budgetedItemId,
    materialGroup,
    purchaseGroup,
    procurementType,
    unitPrice: item.unitPrice || 1000,
    quantity: item.quantity || 1,
  };
}

function runRowAi(id) {
  const item = boq.items.find((it) => it.id === id);
  if (!item) return;
  if (!item.name || !item.name.trim()) { showToast('Enter an item name first.'); return; }
  Object.assign(item, suggestRowAiFields(item));
  persistBoq();
  renderSectionCard();
  showToast('Row auto-filled from Item Name and Description.');
}

/* ---- Empty state ---- */

function buildEmptyStateHtml() {
  return `
    <div class="boq-empty-state">
      <i class="fa-regular fa-folder-open"></i>
      <h3>No items yet</h3>
      <p>Click Add Item or Import data to add BOQ items.</p>
      <div class="boq-empty-actions">
        <button type="button" class="boq-btn-primary" id="boq-empty-add-btn"><i class="fa-solid fa-plus"></i> Add New Item</button>
      </div>
      <div class="boq-similar-touchpoint" id="boq-similar-touchpoint" title="Similarity now also weighs this RFP's Scope of Work, not just its Project/Item selection">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span><strong>3 similar RFPs</strong> created, would you like to add the BOQs by referring it?</span>
      </div>
    </div>
  `;
}

function wireEmptyState() {
  document.getElementById('boq-empty-add-btn').addEventListener('click', addNewItemRow);
  document.getElementById('boq-similar-touchpoint').addEventListener('click', openSimilarRfpsModal);
}

function emptyItem() {
  return {
    name: '', description: '', budgetedItemId: null, procurementType: null, purchaseGroup: null,
    materialGroup: null, uom: null, quantity: '', unitPrice: '', deliveryDate: null,
    hasBrandName: false, brandJustification: '',
  };
}

function addNewItemRow() {
  boq.items.push({ id: newItemId(), sourceImportId: null, ...emptyItem() });
  persistBoq();
  renderSectionCard();
}

/* ---- Import status card (kept from the previous implementation) ---- */

function buildImportCardHtml(batch) {
  const itemsFromBatch = boq.items.filter((it) => it.sourceImportId === batch.id).length;
  return `
    <div class="boq-import-card" data-batch-id="${batch.id}">
      <div class="boq-import-card-main">
        <span class="boq-import-card-icon"><i class="fa-solid fa-check"></i></span>
        <div>
          <div class="boq-import-card-title">BOQ Data Imported Successfully</div>
          <div class="boq-import-card-meta">${escapeHtml(batch.filename)} · ${itemsFromBatch} items imported · ${new Date(batch.importedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
      <div class="boq-import-card-actions">
        <button type="button" class="boq-link-btn" data-open-sheet="${batch.id}">Open in Sheets</button>
        <button type="button" class="boq-link-btn danger" data-remove-batch="${batch.id}">Remove / Re-upload</button>
      </div>
    </div>
  `;
}

function wireImportCards() {
  document.querySelectorAll('[data-open-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => openSheetPreview(btn.dataset.openSheet));
  });
  document.querySelectorAll('[data-remove-batch]').forEach((btn) => {
    btn.addEventListener('click', () => confirmRemoveImportBatch(btn.dataset.removeBatch));
  });
}

function openSheetPreview(batchId) {
  const rows = boq.items.filter((it) => it.sourceImportId === batchId);
  openDialog({
    title: 'Imported BOQ (read-only)',
    size: 'large',
    bodyHtml: buildTableHtml({
      columns: getBoqColumns().filter((c) => c.key !== 'actions'),
      rows,
      compact: true,
      emptyText: 'No items from this import remain (they may have been edited or deleted).',
    }),
  });
}

function confirmRemoveImportBatch(batchId) {
  const batch = boq.importBatches.find((b) => b.id === batchId);
  openDialog({
    title: 'Remove imported BOQ?',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Removing this import may remove the BOQ items created from this file.
      </p>
      <div class="boq-modal-footer" style="margin-top:0;">
        <button class="boq-btn-cancel" id="remove-batch-cancel">Cancel</button>
        <button class="boq-btn-danger" id="remove-batch-confirm">Remove and re-upload</button>
      </div>
    `,
  });
  document.getElementById('remove-batch-cancel').addEventListener('click', closeDialog);
  document.getElementById('remove-batch-confirm').addEventListener('click', () => {
    captureUndoSnapshot();
    boq.items = boq.items.filter((it) => it.sourceImportId !== batchId);
    boq.importBatches = boq.importBatches.filter((b) => b.id !== batchId);
    persistBoq();
    closeDialog();
    renderBoqPage();
    showToast(`Removed import${batch ? ` "${batch.filename}"` : ''}.`);
  });
}

/* ---- Delete item ---- */

function confirmDeleteItem(item) {
  openDialog({
    title: 'Delete BOQ item?',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Are you sure you want to remove this item? This action cannot be undone.
      </p>
      <div class="boq-modal-footer" style="margin-top:0;">
        <button class="boq-btn-cancel" id="delete-item-cancel">Cancel</button>
        <button class="boq-btn-danger" id="delete-item-confirm">Delete item</button>
      </div>
    `,
  });
  document.getElementById('delete-item-cancel').addEventListener('click', closeDialog);
  document.getElementById('delete-item-confirm').addEventListener('click', () => {
    boq.items = boq.items.filter((it) => it.id !== item.id);
    persistBoq();
    closeDialog();
    renderSectionCard();
    showToast('BOQ item removed.');
  });
}

/* ---- Clear table (View more menu) ---- */

function confirmClearTable() {
  if (boq.items.length === 0 && boq.importBatches.length === 0) return;
  openDialog({
    title: 'Clear all BOQ items?',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        This removes all ${boq.items.length} item${boq.items.length === 1 ? '' : 's'} from the table. You can undo this from the toolbar afterwards.
      </p>
      <div class="boq-modal-footer" style="margin-top:0;">
        <button class="boq-btn-cancel" id="clear-table-cancel">Cancel</button>
        <button class="boq-btn-danger" id="clear-table-confirm">Clear table</button>
      </div>
    `,
  });
  document.getElementById('clear-table-cancel').addEventListener('click', closeDialog);
  document.getElementById('clear-table-confirm').addEventListener('click', () => {
    captureUndoSnapshot();
    boq.items = [];
    boq.importBatches = [];
    persistBoq();
    closeDialog();
    renderBoqPage();
    showToast('BOQ table cleared.');
  });
}

/* ---- Generate with AI: checkbox-selectable preview (toolbar) ---- */

function generateBoqFromBudgetedItems() {
  const project = boq.step1FormData.projectId ? boq.projects.find((p) => p.id === boq.step1FormData.projectId) : null;
  const selectedIds = boq.step1FormData.budgetedItemIds || [];
  if (!project || selectedIds.length === 0) return [];

  return selectedIds.map((id) => {
    const budgetedItem = project.budgetedItems.find((i) => i.id === id);
    const name = budgetedItem ? budgetedItem.name : 'Procurement item';
    const description = `Line item covering ${name} for ${project.name}.`;
    // Reuse the same keyword heuristic as the per-row AI sparkle (which now
    // also folds in Scope of Work text) so toolbar-generated suggestions and
    // row-level auto-fill land on consistent categorization.
    const suggested = suggestRowAiFields({ name, description, budgetedItemId: id, unitPrice: null, quantity: null });
    return {
      name,
      description,
      budgetedItemId: id,
      procurementType: suggested.procurementType,
      purchaseGroup: suggested.purchaseGroup,
      materialGroup: suggested.materialGroup,
      uom: 'Uni',
      quantity: 1,
      unitPrice: 50000,
      deliveryDate: null,
      hasBrandName: false,
      brandJustification: '',
    };
  });
}

function openGenerateAiPreview() {
  const suggestions = generateBoqFromBudgetedItems();
  if (suggestions.length === 0) {
    openDialog({
      title: 'Generate with AI',
      bodyHtml: `
        <p style="margin:0; color: var(--text-secondary); font-size: var(--font-size-sm);">
          No budgeted items were selected in Step 1 to generate BOQ suggestions from. Go back to Basic Details to select some, or add items manually.
        </p>
        <div class="boq-modal-footer" style="margin-top:var(--space-4);">
          <button class="boq-btn-cancel" id="ai-preview-close">Close</button>
        </div>
      `,
    });
    document.getElementById('ai-preview-close').addEventListener('click', closeDialog);
    return;
  }

  openDialog({
    title: 'Generate with AI — Suggested BOQ Items',
    size: 'large',
    bodyHtml: buildAiPreviewHtml(suggestions),
  });
  wireAiPreview(suggestions);
}

function buildAiPreviewHtml(suggestions) {
  return `
    <p class="boq-modal-subtext" style="display:block; margin-bottom:var(--space-3);">Review the suggested items below, uncheck any you don't want, then add the rest to your BOQ.</p>
    <div class="table-scroll">
      <table class="data-table compact">
        <thead><tr><th></th><th>Item Name</th><th>Description</th><th>UOM</th><th>Qty</th><th>Unit Price (SAR)</th></tr></thead>
        <tbody>
          ${suggestions.map((s, i) => `
            <tr>
              <td><input type="checkbox" class="ai-preview-check" data-idx="${i}" checked></td>
              <td>${escapeHtml(s.name)}</td>
              <td class="cell-muted">${escapeHtml(s.description)}</td>
              <td class="cell-muted">${s.uom}</td>
              <td class="cell-muted">${s.quantity}</td>
              <td class="cell-muted">${formatBoqSAR(s.unitPrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="boq-modal-footer">
      <button class="boq-btn-cancel" id="ai-preview-cancel">Cancel</button>
      <button class="boq-btn-save" id="ai-preview-add">Add selected (<span id="ai-preview-count">${suggestions.length}</span>)</button>
    </div>
  `;
}

function wireAiPreview(suggestions) {
  const checks = () => Array.from(document.querySelectorAll('.ai-preview-check'));
  function refreshCount() {
    const n = checks().filter((c) => c.checked).length;
    document.getElementById('ai-preview-count').textContent = n;
    document.getElementById('ai-preview-add').disabled = n === 0;
  }
  checks().forEach((c) => c.addEventListener('change', refreshCount));
  document.getElementById('ai-preview-cancel').addEventListener('click', closeDialog);
  document.getElementById('ai-preview-add').addEventListener('click', () => {
    const selected = suggestions.filter((_, i) => checks()[i].checked);
    if (selected.length === 0) return;
    captureUndoSnapshot();
    selected.forEach((s) => boq.items.push({ id: newItemId(), sourceImportId: null, ...s }));
    persistBoq();
    closeDialog();
    renderBoqPage();
    showToast(`${selected.length} BOQ item${selected.length > 1 ? 's' : ''} added from AI suggestions.`);
  });
  refreshCount();
}

/* ---- Import BOQ from Similar RFPs (View more menu) ---- */

function mockBoqItemsForRfp(rfp) {
  const pool = SIMILAR_RFP_ITEM_POOL[rfp.category] || [
    { name: `${rfp.title} — line item`, description: `Line item derived from ${rfp.title}.`, uom: 'Uni', quantity: 1, unitPrice: Math.round((rfp.estimatedBudgetSAR || 50000) / 2) },
  ];
  return pool.map((p) => ({ ...p, budgetedItemId: null, procurementType: null, purchaseGroup: null, materialGroup: null, deliveryDate: null, hasBrandName: false, brandJustification: '' }));
}

function openSimilarRfpsModal() {
  openDialog({ title: 'Import BOQ from Similar RFPs', size: 'xl', bodyHtml: buildSimilarRfpsHtml() });
  wireSimilarRfpsModal();
}

function buildSimilarRfpsHtml() {
  return `
    <div class="boq-similar-modal">
      <div class="boq-similar-list" id="boq-similar-list">
        ${boq.similarRfps.map((r) => `
          <div class="boq-similar-list-item" data-rfp-id="${r.id}">
            <div class="boq-similar-list-title">${escapeHtml(r.title)}</div>
            <div class="boq-similar-list-meta">${escapeHtml(r.id)} · ${escapeHtml(r.project)}</div>
          </div>
        `).join('')}
      </div>
      <div class="boq-similar-detail" id="boq-similar-detail">
        <div class="boq-similar-detail-empty">
          <i class="fa-regular fa-folder-open"></i>
          <p>Select an RFP to see BOQs part of it</p>
        </div>
      </div>
    </div>
  `;
}

function wireSimilarRfpsModal() {
  document.querySelectorAll('.boq-similar-list-item').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.boq-similar-list-item.active').forEach((a) => a.classList.remove('active'));
      el.classList.add('active');
      const rfp = boq.similarRfps.find((r) => r.id === el.dataset.rfpId);
      renderSimilarRfpDetail(rfp);
    });
  });
}

function renderSimilarRfpDetail(rfp) {
  const items = mockBoqItemsForRfp(rfp);
  const detail = document.getElementById('boq-similar-detail');
  detail.innerHTML = `
    <div class="boq-similar-detail-header">
      <strong>${escapeHtml(rfp.title)}</strong>
      <span class="cell-muted">${items.length} item${items.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="table-scroll">
      <table class="data-table compact">
        <thead><tr><th><input type="checkbox" id="similar-check-all" checked></th><th>Item Name</th><th>Description</th><th>UOM</th><th>Qty</th><th>Unit Price (SAR)</th></tr></thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              <td><input type="checkbox" class="similar-item-check" checked></td>
              <td>${escapeHtml(it.name)}</td>
              <td class="cell-muted">${escapeHtml(it.description)}</td>
              <td class="cell-muted">${it.uom}</td>
              <td class="cell-muted">${it.quantity}</td>
              <td class="cell-muted">${formatBoqSAR(it.unitPrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="boq-modal-footer">
      <button class="boq-btn-cancel" id="similar-cancel">Cancel</button>
      <button class="boq-btn-save" id="similar-add-items">Add items</button>
    </div>
  `;
  document.getElementById('similar-check-all').addEventListener('change', (e) => {
    document.querySelectorAll('.similar-item-check').forEach((c) => { c.checked = e.target.checked; });
  });
  document.getElementById('similar-cancel').addEventListener('click', closeDialog);
  document.getElementById('similar-add-items').addEventListener('click', () => {
    const checks = Array.from(document.querySelectorAll('.similar-item-check'));
    const selected = items.filter((_, i) => checks[i].checked);
    if (selected.length === 0) return;
    captureUndoSnapshot();
    selected.forEach((it) => boq.items.push({ id: newItemId(), sourceImportId: null, ...it }));
    persistBoq();
    closeDialog();
    renderBoqPage();
    showToast(`${selected.length} BOQ item${selected.length > 1 ? 's' : ''} added from ${rfp.title}.`);
  });
}

/* ---- Download menu ---- */

function exportBoqTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([IMPORT_TEMPLATE_HEADERS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ Template');
  XLSX.writeFile(wb, 'BOQ-table.xlsx');
}

function downloadEtimadPrefilledTemplate() {
  const rows = boq.items.map((it, i) => [
    i + 1, it.name, it.description || '', budgetedItemName(it.budgetedItemId), it.materialGroup || '',
    it.purchaseGroup || '', it.procurementType || '', it.uom || '', it.quantity || 0, it.unitPrice || 0,
    it.deliveryDate || '', it.hasBrandName ? 'Yes' : 'No', itemTotal(it),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([IMPORT_TEMPLATE_HEADERS, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Etimad BOQ');
  XLSX.writeFile(wb, 'Material-Etimad-Template.xlsx');
}

/* ---- Import Data (redesigned 2-step modal, replaces the old Excel import) ----
   NOTE: unlike the previous Import Excel flow, this no longer actually
   parses the uploaded file's rows — per spec, clicking Upload simulates a
   >=15-record import from a canned pool regardless of the file's real
   contents. Only extension/size are validated client-side. */

function generateSimulatedImportBatch() {
  return IMPORT_SIMULATED_POOL.map(([name, description, materialGroup, uom, quantity, unitPrice]) => ({
    name, description, materialGroup, uom, quantity, unitPrice,
    budgetedItemId: null, purchaseGroup: null, procurementType: null, deliveryDate: null, hasBrandName: false, brandJustification: '',
  }));
}

function openImportDataModal() {
  boq.pendingImportFile = null;
  openDialog({ title: 'Import Bill of Quantities', size: 'large', bodyHtml: buildImportDataHtml() });
  wireImportDataModal();
}

function buildImportDataHtml() {
  return `
    <div class="boq-import-data-layout">
      <div class="boq-import-data-hero">
        <div class="boq-import-data-hero-badge"><i class="fa-solid fa-file-excel"></i></div>
        <div class="boq-import-data-hero-title">Upload Bill of Quantities</div>
        <div class="boq-import-data-hero-sub">Download the template, fill it in, then upload it here to add multiple BOQ items at once.</div>
      </div>
      <div class="boq-import-data-steps">
        <div class="boq-import-step">
          <div class="boq-import-step-badge">1</div>
          <div class="boq-import-step-body">
            <div class="boq-import-step-title">Download Template</div>
            <div class="boq-import-step-desc">Get the BOQ Excel template with the required columns.</div>
            <button type="button" class="boq-btn-outline" id="boq-download-template-btn"><i class="fa-solid fa-download"></i> Download Template</button>
          </div>
        </div>
        <div class="boq-import-step">
          <div class="boq-import-step-badge">2</div>
          <div class="boq-import-step-body">
            <div class="boq-import-step-title">Upload data</div>
            <div class="boq-import-step-desc">Upload the completed template.</div>
            <div class="upload-dropzone" id="boq-import-dropzone">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <div class="upload-dropzone-main">Click to upload or drag and drop</div>
              <div class="upload-dropzone-sub">SUPPORTED FORMAT: XLSX — MAX 25 MB</div>
              <input type="file" id="boq-import-input" accept=".xlsx" style="display:none;">
            </div>
            <div class="boq-import-selected-file" id="boq-import-selected-file"></div>
            <div class="boq-import-error" id="boq-import-error"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="boq-modal-footer">
      <button class="boq-btn-cancel" id="boq-import-cancel">Cancel</button>
      <button class="boq-btn-save" id="boq-import-upload-btn" disabled>Upload</button>
    </div>
  `;
}

function wireImportDataModal() {
  document.getElementById('boq-download-template-btn').addEventListener('click', exportBoqTemplate);

  const dropzone = document.getElementById('boq-import-dropzone');
  const input = document.getElementById('boq-import-input');
  const uploadBtn = document.getElementById('boq-import-upload-btn');

  function selectFile(file) {
    const errEl = document.getElementById('boq-import-error');
    errEl.textContent = '';
    if (!file.name.toLowerCase().endsWith('.xlsx')) { errEl.textContent = 'Only .xlsx files are supported.'; return; }
    if (file.size > 25 * 1024 * 1024) { errEl.textContent = 'File exceeds the 25 MB limit.'; return; }
    boq.pendingImportFile = file;
    document.getElementById('boq-import-selected-file').innerHTML = `<i class="fa-solid fa-file-excel"></i>${escapeHtml(file.name)}`;
    uploadBtn.disabled = false;
  }

  dropzone.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => { if (e.target.files[0]) selectFile(e.target.files[0]); });
  ['dragover', 'dragenter'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); }));
  dropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]); });

  document.getElementById('boq-import-cancel').addEventListener('click', closeDialog);
  uploadBtn.addEventListener('click', () => {
    if (!boq.pendingImportFile) return;
    captureUndoSnapshot();
    const batchId = newItemId();
    const items = generateSimulatedImportBatch();
    items.forEach((it) => boq.items.push({ id: newItemId(), sourceImportId: batchId, ...it }));
    boq.importBatches.push({ id: batchId, filename: boq.pendingImportFile.name, importedAt: Date.now(), itemCount: items.length });
    boq.pendingImportFile = null;
    persistBoq();
    closeDialog();
    renderBoqPage();
    showToast(`${items.length} BOQ items imported successfully.`);
  });
}

/* ---- Footer ---- */

function saveDraft() {
  persistBoq();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  if (boq.items.length === 0) return;
  WizardStore.setStepStatus('boq', 'completed');
  const next = wizardNextStep('boq');

  if (!next) {
    // Souq Etimad path (see Step 1): BOQ is the final visible step, so
    // there's nowhere further in the wizard to go — Scope of Work/Payments/
    // etc. stay hidden and must never be reached from here. There's no real
    // submission backend in this prototype, so this is a placeholder
    // "finish" action (same pending-wording note as the footer button
    // itself) rather than a real submit.
    showToast('Souq Etimad request submitted successfully.');
    window.location.href = 'my-requests.html';
    return;
  }

  WizardStore.setStepStatus(next.id, 'current');
  window.location.href = next.href;
}

/* ---- Init ---- */

async function initBoq() {
  WizardStore.setStepStatus('boq', 'current');

  // Dynamic: normally Scope of Work, but Basic Details directly on the
  // Souq Etimad path (Scope of Work is hidden there).
  const prev = wizardPrevStep('boq');
  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'boq',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="boq-footer-back-btn" id="boq-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${prev ? prev.title : 'Basic Details'}</span>
      </button>
    `,
  });
  document.getElementById('boq-back-btn').addEventListener('click', () => {
    window.location.href = prev ? prev.href : 'wizard-basic-details.html';
  });

  boq.step1FormData = WizardStore.getFormData();
  boq.projects = await DataStore.getAllProjects();
  // "Similar RFPs" is a canned slice in this prototype (no real backend
  // similarity search) — conceptually it now weighs this RFP's Scope of
  // Work in addition to Project/Item, since Step 2 fills that in before
  // BOQ is reached.
  boq.similarRfps = (await DataStore.getAllRfps()).slice(0, 12);
  loadBoqState();
  loadColumnVisibility();

  renderBoqPage();
  updateContinueState();
}

document.addEventListener('DOMContentLoaded', initBoq);
