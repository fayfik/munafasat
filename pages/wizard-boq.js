/*
  Step 2 - Bill of Quantity controller.
  Depends on: data-store.js, dialog.js, toast.js, searchable-select.js,
  date-picker.js, table.js, wizard-shell.js, and the SheetJS `XLSX` global
  (loaded via CDN in wizard-boq.html) — all loaded before this file.
*/

const BOQ_REQUIRED_HEADERS = [
  'Item No.', 'Item Name', 'Item Description', 'Structural Code', 'Procurement Type',
  'Purchase Group', 'Material Group', 'UOM', 'Quantity', 'Unit Price (SAR)',
  'Delivery Date', 'Has Brand Name', 'Justification for Brand Name',
];

const PROCUREMENT_TYPES = ['Goods', 'Services', 'Works', 'Consulting'];
const PURCHASE_GROUPS = ['IT Procurement', 'Facilities Procurement', 'Corporate Services', 'Professional Services'];
const MATERIAL_GROUPS = ['Hardware', 'Software', 'Networking Equipment', 'Furniture', 'Maintenance Services', 'Consulting Services'];
const UOM_OPTIONS = [
  { value: 'Uni', label: 'Uni — Unit' },
  { value: 'EA', label: 'EA — Each' },
  { value: 'CAR', label: 'CAR — Carton' },
  { value: 'AU', label: 'AU — Activity Unit' },
];

const SIMILAR_BOQ_SAMPLE = [
  { name: 'Standard laptop unit', description: 'Business-grade laptop for staff use.', procurementType: 'Goods', purchaseGroup: 'IT Procurement', materialGroup: 'Hardware', uom: 'EA', quantity: 1, unitPrice: 4200, deliveryDate: null, hasBrandName: false, brandJustification: '' },
  { name: 'Extended hardware warranty', description: '3-year extended warranty covering parts and labor.', procurementType: 'Services', purchaseGroup: 'IT Procurement', materialGroup: 'Maintenance Services', uom: 'Uni', quantity: 1, unitPrice: 600, deliveryDate: null, hasBrandName: false, brandJustification: '' },
];

const boq = {
  items: [],
  importBatches: [],
  step1FormData: {},
  projects: [],
  editingItemId: null,
  originalSnapshot: null,
};

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

/* ---- Totals ---- */

function formatBoqSAR(amount) {
  return `SAR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function itemTotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

function computeTotals() {
  const subtotal = boq.items.reduce((sum, it) => sum + itemTotal(it), 0);
  const vat = subtotal * 0.15;
  return { subtotal, vat, grand: subtotal + vat };
}

/* ---- Validation / footer ---- */

function updateContinueState() {
  setWizardContinueEnabled(boq.items.length > 0);
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
        <button type="button" class="boq-ai-section-btn" id="boq-section-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        <button type="button" class="boq-btn-outline" id="boq-export-btn"><i class="fa-solid fa-file-export"></i> Export Template</button>
        <button type="button" class="boq-btn-outline" id="boq-import-btn"><i class="fa-solid fa-file-import"></i> Import Excel</button>
      </div>
    </div>
    <div class="boq-section-card" id="boq-section-card"></div>
  `;

  document.getElementById('boq-section-ai-btn').addEventListener('click', runSectionAi);
  document.getElementById('boq-export-btn').addEventListener('click', exportBoqTemplate);
  document.getElementById('boq-import-btn').addEventListener('click', openImportModal);

  renderSectionCard();
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
      columns: BOQ_COLUMNS,
      rows: boq.items,
      rowKey: (r) => r.id,
      emptyText: 'No items yet.',
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

  document.getElementById('boq-add-row-btn')?.addEventListener('click', () => openItemModal(null));
  wireTableRowEvents();
  wireImportCards();
}

const BOQ_COLUMNS = [
  { key: 'itemNo', label: 'Item No.', render: (r, i) => String((boq.items.indexOf(r)) + 1).padStart(2, '0') },
  { key: 'name', label: 'Item Name', render: (r) => `<span class="cell-truncate" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</span>` },
  { key: 'description', label: 'Description', cellClass: 'cell-muted', render: (r) => `<span class="cell-truncate" title="${escapeHtml(r.description || '')}">${escapeHtml(r.description || '—')}</span>` },
  { key: 'materialGroup', label: 'Material group', cellClass: 'cell-muted', render: (r) => r.materialGroup || '—' },
  { key: 'uom', label: 'UOM', cellClass: 'cell-muted' },
  { key: 'quantity', label: 'Quantity', cellClass: 'cell-muted' },
  { key: 'unitPrice', label: 'Unit Price (SAR)', cellClass: 'cell-muted', render: (r) => formatBoqSAR(Number(r.unitPrice) || 0) },
  { key: 'deliveryDate', label: 'Delivery Date', cellClass: 'cell-muted', render: (r) => formatDate(r.deliveryDate) },
  { key: 'hasBrandName', label: 'Has Brand Name', render: (r) => (r.hasBrandName ? 'Yes' : 'No') },
  { key: 'total', label: 'Total (SAR)', render: (r) => `<strong>${formatBoqSAR(itemTotal(r))}</strong>` },
  {
    key: 'actions', label: 'Actions', render: (r) => `
      <div class="row-actions">
        <button class="row-action" data-action="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="row-action row-action-delete" data-action="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `,
  },
];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function wireTableRowEvents() {
  const tbody = document.querySelector('#boq-section-card tbody');
  if (!tbody) return;
  tbody.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('.row-action');
    const tr = event.target.closest('tr[data-row-key]');
    if (!tr) return;
    const item = boq.items.find((it) => it.id === tr.dataset.rowKey);
    if (!item) return;

    if (actionBtn) {
      if (actionBtn.dataset.action === 'edit') openItemModal(item);
      else if (actionBtn.dataset.action === 'delete') confirmDeleteItem(item);
      return;
    }
    openItemModal(item);
  });
}

function buildEmptyStateHtml() {
  return `
    <div class="boq-empty-state">
      <i class="fa-regular fa-folder-open"></i>
      <h3>No items yet</h3>
      <p>Click Add Item or Import Excel to add BOQ items.</p>
      <div class="boq-empty-actions">
        <button type="button" class="boq-btn-primary" id="boq-empty-add-btn"><i class="fa-solid fa-plus"></i> Add New Item</button>
      </div>
      <div class="boq-similar-touchpoint" id="boq-similar-touchpoint">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span><strong>3 similar RFPs</strong> created, would you like to add the BOQs by referring it?</span>
      </div>
    </div>
  `;
}

function wireEmptyState() {
  document.getElementById('boq-empty-add-btn').addEventListener('click', () => openItemModal(null));
  document.getElementById('boq-similar-touchpoint').addEventListener('click', () => {
    SIMILAR_BOQ_SAMPLE.forEach((sample) => {
      boq.items.push({ id: newItemId(), sourceImportId: null, ...sample });
    });
    persistBoq();
    renderSectionCard();
    showToast(`${SIMILAR_BOQ_SAMPLE.length} BOQ items added from similar RFPs.`);
  });
}

/* ---- Import status card ---- */

function buildImportCardHtml(batch) {
  const itemsFromBatch = boq.items.filter((it) => it.sourceImportId === batch.id).length;
  return `
    <div class="boq-import-card" data-batch-id="${batch.id}">
      <div class="boq-import-card-main">
        <span class="boq-import-card-icon"><i class="fa-solid fa-check"></i></span>
        <div>
          <div class="boq-import-card-title">BOQ Excel Imported Successfully</div>
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
    bodyHtml: buildTableHtml({
      columns: BOQ_COLUMNS.filter((c) => c.key !== 'actions'),
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
    boq.items = boq.items.filter((it) => it.sourceImportId !== batchId);
    boq.importBatches = boq.importBatches.filter((b) => b.id !== batchId);
    persistBoq();
    closeDialog();
    renderSectionCard();
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

/* ---- Add / Edit item modal ---- */

function emptyItem() {
  return {
    id: null, name: '', description: '', procurementType: null, purchaseGroup: null,
    materialGroup: null, uom: null, quantity: '', unitPrice: '', deliveryDate: null,
    hasBrandName: false, brandJustification: '', sourceImportId: null,
  };
}

let modalSelects = {};
let modalDatePicker = null;

function openItemModal(item, draftValues) {
  const isEdit = !!item;
  boq.editingItemId = isEdit ? item.id : null;
  const values = draftValues || (item ? { ...item } : emptyItem());
  boq.originalSnapshot = isEdit && !draftValues ? JSON.stringify(item) : boq.originalSnapshot;

  openDialog({
    title: isEdit ? 'Edit BOQ Item' : 'Add BOQ Item',
    bodyHtml: buildItemModalHtml(values, isEdit),
  });
  wireItemModal(values, isEdit);
}

function buildItemModalHtml(v, isEdit) {
  return `
    <div class="boq-modal-toolbar">
      <span class="boq-modal-subtext">Fill all fields then save to add to the table</span>
      <button type="button" class="boq-ai-section-btn" id="boq-modal-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
    </div>

    <div class="boq-field-row">
      <div class="boq-field full">
        <label class="boq-field-label">Item name <span class="boq-required">*</span></label>
        <input type="text" class="boq-input" id="boq-f-name" placeholder="Enter item name" value="${escapeHtml(v.name)}">
        <div id="ai-suggest-name"></div>
        <div class="boq-field-error" id="err-name"></div>
      </div>
    </div>

    <div class="boq-field-row">
      <div class="boq-field full">
        <label class="boq-field-label">Item description</label>
        <textarea class="boq-textarea" id="boq-f-description" placeholder="Describe the item requirements or specifications.">${escapeHtml(v.description || '')}</textarea>
        <div id="ai-suggest-description"></div>
      </div>
    </div>

    <div class="boq-field-row">
      <div class="boq-field half">
        <label class="boq-field-label">Procurement type</label>
        <div id="boq-sel-procurement-type"></div>
      </div>
      <div class="boq-field half">
        <label class="boq-field-label">Purchase group</label>
        <div id="boq-sel-purchase-group"></div>
      </div>
    </div>

    <div class="boq-field-row">
      <div class="boq-field half">
        <label class="boq-field-label">Material group</label>
        <div id="boq-sel-material-group"></div>
      </div>
      <div class="boq-field half">
        <label class="boq-field-label">UOM <span class="boq-required">*</span></label>
        <div id="boq-sel-uom"></div>
        <div class="boq-field-error" id="err-uom"></div>
      </div>
    </div>

    <div class="boq-field-row">
      <div class="boq-field half">
        <label class="boq-field-label">Quantity <span class="boq-required">*</span></label>
        <div class="boq-number-input">
          <input type="number" id="boq-f-quantity" min="0" step="1" value="${v.quantity ?? ''}">
          <div class="boq-number-steppers">
            <button type="button" id="qty-up"><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" id="qty-down"><i class="fa-solid fa-chevron-down"></i></button>
          </div>
        </div>
        <div class="boq-field-error" id="err-quantity"></div>
      </div>
      <div class="boq-field half">
        <label class="boq-field-label">Unit price (SAR) <span class="boq-required">*</span></label>
        <div class="boq-number-input has-prefix">
          <span class="boq-number-prefix">SAR</span>
          <input type="number" id="boq-f-unit-price" min="0" step="0.01" value="${v.unitPrice ?? ''}">
          <div class="boq-number-steppers">
            <button type="button" id="price-up"><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" id="price-down"><i class="fa-solid fa-chevron-down"></i></button>
          </div>
        </div>
        <div class="boq-field-error" id="err-unitPrice"></div>
      </div>
    </div>

    <div class="boq-field-row">
      <div class="boq-field full">
        <label class="boq-field-label">Delivery date</label>
        <div id="boq-dp-delivery"></div>
      </div>
    </div>

    <div class="boq-field-row">
      <div class="boq-field full">
        <div class="boq-toggle-row">
          <button type="button" class="boq-toggle-switch${v.hasBrandName ? ' on' : ''}" id="boq-f-has-brand"></button>
          <span class="boq-toggle-label">Has brand name</span>
        </div>
        <div class="boq-brand-reveal${v.hasBrandName ? ' visible' : ''}" id="boq-brand-reveal">
          <label class="boq-field-label">Justification for Brand Name <span class="boq-required">*</span></label>
          <textarea class="boq-textarea" id="boq-f-brand-justification" placeholder="Explain why a specific brand is required…">${escapeHtml(v.brandJustification || '')}</textarea>
          <div class="boq-field-error" id="err-brandJustification"></div>
        </div>
      </div>
    </div>

    <div class="boq-modal-footer">
      <button class="boq-btn-cancel" id="boq-modal-cancel">Cancel</button>
      <button class="boq-btn-save" id="boq-modal-save" disabled>${isEdit ? 'Save Changes' : 'Add to BOQ'}</button>
    </div>
  `;
}

function readModalValues() {
  return {
    name: document.getElementById('boq-f-name').value.trim(),
    description: document.getElementById('boq-f-description').value,
    procurementType: modalSelects.procurementType.getSelected(),
    purchaseGroup: modalSelects.purchaseGroup.getSelected(),
    materialGroup: modalSelects.materialGroup.getSelected(),
    uom: modalSelects.uom.getSelected(),
    quantity: document.getElementById('boq-f-quantity').value,
    unitPrice: document.getElementById('boq-f-unit-price').value,
    deliveryDate: modalDatePicker.getValue(),
    hasBrandName: document.getElementById('boq-f-has-brand').classList.contains('on'),
    brandJustification: document.getElementById('boq-f-brand-justification').value,
  };
}

function validateModal(values) {
  const errors = {};
  if (!values.name) errors.name = 'Item name is required.';
  if (!values.uom) errors.uom = 'UOM is required.';
  if (!values.quantity || Number(values.quantity) <= 0) errors.quantity = 'Quantity must be greater than 0.';
  if (values.unitPrice === '' || values.unitPrice === null || Number(values.unitPrice) < 0) errors.unitPrice = 'Unit price is required and cannot be negative.';
  if (values.hasBrandName && !values.brandJustification.trim()) errors.brandJustification = 'Justification for brand name is required.';
  return errors;
}

function refreshModalValidity() {
  const values = readModalValues();
  const errors = validateModal(values);
  document.getElementById('boq-modal-save').disabled = Object.keys(errors).length > 0;
  return { values, errors };
}

function wireItemModal(v, isEdit) {
  modalSelects = {
    procurementType: createSearchableSelect({ mountId: 'boq-sel-procurement-type', mode: 'single', options: PROCUREMENT_TYPES.map((o) => ({ value: o, label: o })), selected: v.procurementType, placeholder: 'Select procurement type', searchPlaceholder: 'Search', onChange: refreshModalValidity }),
    purchaseGroup: createSearchableSelect({ mountId: 'boq-sel-purchase-group', mode: 'single', options: PURCHASE_GROUPS.map((o) => ({ value: o, label: o })), selected: v.purchaseGroup, placeholder: 'Select purchase group', searchPlaceholder: 'Search', onChange: refreshModalValidity }),
    materialGroup: createSearchableSelect({ mountId: 'boq-sel-material-group', mode: 'single', options: MATERIAL_GROUPS.map((o) => ({ value: o, label: o })), selected: v.materialGroup, placeholder: 'Select material group', searchPlaceholder: 'Search', onChange: refreshModalValidity }),
    uom: createSearchableSelect({ mountId: 'boq-sel-uom', mode: 'single', options: UOM_OPTIONS, selected: v.uom, placeholder: 'Select UOM', searchPlaceholder: 'Search', onChange: refreshModalValidity }),
  };
  modalDatePicker = createDatePicker({ mountId: 'boq-dp-delivery', value: v.deliveryDate, onChange: refreshModalValidity });

  document.getElementById('boq-f-name').addEventListener('input', refreshModalValidity);
  document.getElementById('boq-f-quantity').addEventListener('input', refreshModalValidity);
  document.getElementById('boq-f-unit-price').addEventListener('input', refreshModalValidity);
  document.getElementById('boq-f-brand-justification').addEventListener('input', refreshModalValidity);

  document.getElementById('qty-up').addEventListener('click', () => stepNumber('boq-f-quantity', 1, 0));
  document.getElementById('qty-down').addEventListener('click', () => stepNumber('boq-f-quantity', -1, 0));
  document.getElementById('price-up').addEventListener('click', () => stepNumber('boq-f-unit-price', 1, 0));
  document.getElementById('price-down').addEventListener('click', () => stepNumber('boq-f-unit-price', -1, 0));

  const brandToggle = document.getElementById('boq-f-has-brand');
  brandToggle.addEventListener('click', () => {
    const on = !brandToggle.classList.contains('on');
    brandToggle.classList.toggle('on', on);
    document.getElementById('boq-brand-reveal').classList.toggle('visible', on);
    refreshModalValidity();
  });

  document.getElementById('boq-modal-ai-btn').addEventListener('click', () => runModalAi());
  document.getElementById('boq-modal-cancel').addEventListener('click', () => handleModalCancel(isEdit));
  document.getElementById('boq-modal-save').addEventListener('click', () => handleModalSave(isEdit));

  refreshModalValidity();
}

function stepNumber(id, delta, min) {
  const el = document.getElementById(id);
  const next = Math.max(min, (Number(el.value) || 0) + delta);
  el.value = next;
  el.dispatchEvent(new Event('input'));
}

function handleModalCancel(isEdit) {
  if (!isEdit) { closeDialog(); return; }
  const current = readModalValues();
  const originalItem = boq.items.find((it) => it.id === boq.editingItemId);
  const currentSnapshot = JSON.stringify({ ...originalItem, ...current });
  if (currentSnapshot === boq.originalSnapshot) { closeDialog(); return; }

  openDialog({
    title: 'Discard changes?',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Your recent changes will not be saved.
      </p>
      <div class="boq-modal-footer" style="margin-top:0;">
        <button class="boq-btn-cancel" id="discard-continue">Continue editing</button>
        <button class="boq-btn-danger" id="discard-confirm">Discard changes</button>
      </div>
    `,
  });
  document.getElementById('discard-continue').addEventListener('click', () => {
    openItemModal(originalItem, current);
  });
  document.getElementById('discard-confirm').addEventListener('click', closeDialog);
}

function handleModalSave(isEdit) {
  const values = readModalValues();
  const errors = validateModal(values);
  if (Object.keys(errors).length > 0) {
    Object.keys(errors).forEach((k) => { const el = document.getElementById(`err-${k}`); if (el) el.textContent = errors[k]; });
    return;
  }

  if (isEdit) {
    const idx = boq.items.findIndex((it) => it.id === boq.editingItemId);
    if (idx >= 0) {
      // An individually-edited item is no longer considered part of its
      // originating import batch (so "Remove / Re-upload" won't sweep it away).
      boq.items[idx] = { ...boq.items[idx], ...values, sourceImportId: null };
    }
    persistBoq();
    closeDialog();
    renderSectionCard();
    showToast('BOQ item updated successfully.');
  } else {
    boq.items.push({ id: newItemId(), sourceImportId: null, ...values });
    persistBoq();
    closeDialog();
    renderSectionCard();
    showToast('BOQ item added successfully.');
  }
}

/* ---- Modal-level "Generate with AI" (fills empty fields only) ---- */

function runModalAi() {
  openDialog({
    title: 'Generate with AI',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Would you like AI to fill this section using the information already provided?
      </p>
      <div class="boq-modal-footer" style="margin-top:0;">
        <button class="boq-btn-cancel" id="modal-ai-no">No</button>
        <button class="boq-btn-save" id="modal-ai-yes" style="background:var(--color-green-600);">Yes</button>
      </div>
    `,
  });
  document.getElementById('modal-ai-no').addEventListener('click', () => {
    // Re-open the item form as it was (the confirm dialog replaced it).
    reopenCurrentModalForm();
  });
  document.getElementById('modal-ai-yes').addEventListener('click', () => {
    const current = readModalValues();
    reopenCurrentModalForm(current);
    applyModalAiSuggestions(current);
  });
}

function reopenCurrentModalForm(draftValues) {
  const item = boq.editingItemId ? boq.items.find((it) => it.id === boq.editingItemId) : null;
  openItemModal(item, draftValues || readModalValuesSafe());
}

function readModalValuesSafe() {
  try { return readModalValues(); } catch { return undefined; }
}

function applyModalAiSuggestions(current) {
  const suggestions = [
    { key: 'name', empty: !current.name, text: 'New procurement item', apply: (t) => { document.getElementById('boq-f-name').value = t; refreshModalValidity(); } },
    { key: 'description', empty: !current.description, text: `Specification and requirements for ${current.name || 'this item'}.`, apply: (t) => { document.getElementById('boq-f-description').value = t; refreshModalValidity(); } },
    { key: 'procurementType', empty: !current.procurementType, text: 'Goods', apply: (t) => { modalSelects.procurementType.setSelected(t); refreshModalValidity(); } },
    { key: 'purchaseGroup', empty: !current.purchaseGroup, text: 'IT Procurement', apply: (t) => { modalSelects.purchaseGroup.setSelected(t); refreshModalValidity(); } },
    { key: 'materialGroup', empty: !current.materialGroup, text: 'Hardware', apply: (t) => { modalSelects.materialGroup.setSelected(t); refreshModalValidity(); } },
    { key: 'uom', empty: !current.uom, text: 'EA', apply: (t) => { modalSelects.uom.setSelected(t); refreshModalValidity(); } },
    { key: 'quantity', empty: !current.quantity, text: '1', apply: (t) => { document.getElementById('boq-f-quantity').value = t; refreshModalValidity(); } },
    { key: 'unitPrice', empty: !current.unitPrice, text: '1000', apply: (t) => { document.getElementById('boq-f-unit-price').value = t; refreshModalValidity(); } },
  ];

  suggestions.filter((s) => s.empty).forEach((s) => {
    const mount = document.getElementById(`ai-suggest-${s.key}`);
    if (mount) {
      showFieldAiSuggestion(mount, s.text, s.apply);
    } else {
      // Fields without a dedicated suggestion mount (dropdowns/numbers)
      // apply directly — still reviewable since the user can change them.
      s.apply(s.text);
    }
  });
}

function showFieldAiSuggestion(mount, text, applyFn) {
  mount.innerHTML = `
    <div class="boq-ai-suggested-box">
      <div class="boq-ai-suggested-label"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-suggested</div>
      <div class="boq-ai-suggested-text">${text}</div>
      <div class="boq-ai-suggested-actions">
        <button type="button" class="boq-ai-action-btn accept" data-act="accept"><i class="fa-solid fa-check"></i> Accept</button>
        <button type="button" class="boq-ai-action-btn edit" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>
        <button type="button" class="boq-ai-action-btn reject" data-act="reject"><i class="fa-solid fa-xmark"></i> Reject</button>
      </div>
    </div>
  `;
  mount.querySelector('[data-act="accept"]').addEventListener('click', () => { applyFn(text); mount.innerHTML = ''; });
  mount.querySelector('[data-act="edit"]').addEventListener('click', () => { applyFn(text); mount.innerHTML = ''; document.getElementById(mount.id.replace('ai-suggest-', 'boq-f-'))?.focus(); });
  mount.querySelector('[data-act="reject"]').addEventListener('click', () => { mount.innerHTML = ''; });
}

/* ---- Section-level "Generate with AI" (BOQ header, derived from Step 1 budgeted items) ---- */

function generateBoqFromBudgetedItems() {
  const project = boq.step1FormData.projectId ? boq.projects.find((p) => p.id === boq.step1FormData.projectId) : null;
  const selectedIds = boq.step1FormData.budgetedItemIds || [];
  if (!project || selectedIds.length === 0) return [];

  return selectedIds.map((id) => {
    const budgetedItem = project.budgetedItems.find((i) => i.id === id);
    const name = budgetedItem ? budgetedItem.name : 'Procurement item';
    return {
      name,
      description: `Line item covering ${name} for ${project.name}.`,
      procurementType: 'Services',
      purchaseGroup: 'IT Procurement',
      materialGroup: 'Consulting Services',
      uom: 'Uni',
      quantity: 1,
      unitPrice: 50000,
      deliveryDate: null,
      hasBrandName: false,
      brandJustification: '',
    };
  });
}

function runSectionAi() {
  const generated = generateBoqFromBudgetedItems();
  openDialog({
    title: 'Generate with AI',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Would you like AI to fill this section using the information already provided in your RFP?
      </p>
      <div class="boq-modal-footer" style="margin-top:0;">
        <button class="boq-btn-cancel" id="section-ai-no">No</button>
        <button class="boq-btn-save" id="section-ai-yes" style="background:var(--color-green-600);">Yes</button>
      </div>
    `,
  });
  document.getElementById('section-ai-no').addEventListener('click', closeDialog);
  document.getElementById('section-ai-yes').addEventListener('click', () => showSectionAiPreview(generated));
}

function showSectionAiPreview(generated) {
  if (generated.length === 0) {
    openDialog({
      title: 'Generate with AI',
      bodyHtml: `<p style="margin:0; color: var(--text-secondary); font-size: var(--font-size-sm);">No budgeted items were selected in Step 1 to generate BOQ suggestions from. Go back to Basic Details to select some, or add items manually.</p>`,
    });
    return;
  }

  openDialog({
    title: 'Suggested BOQ items',
    bodyHtml: `
      ${buildTableHtml({
        columns: [
          { key: 'name', label: 'Item Name' },
          { key: 'description', label: 'Description', cellClass: 'cell-muted' },
          { key: 'uom', label: 'UOM', cellClass: 'cell-muted' },
          { key: 'quantity', label: 'Qty', cellClass: 'cell-muted' },
          { key: 'unitPrice', label: 'Unit Price', cellClass: 'cell-muted', render: (r) => formatBoqSAR(r.unitPrice) },
        ],
        rows: generated,
        compact: true,
      })}
      <div class="boq-modal-footer">
        <button class="boq-btn-cancel" id="section-ai-cancel">Cancel</button>
        <div style="display:flex; gap: var(--space-2);">
          <button class="boq-btn-cancel" id="section-ai-regenerate">Regenerate</button>
          <button class="boq-btn-save" id="section-ai-apply">Accept &amp; Apply</button>
        </div>
      </div>
    `,
  });
  document.getElementById('section-ai-cancel').addEventListener('click', closeDialog);
  document.getElementById('section-ai-regenerate').addEventListener('click', () => showSectionAiPreview(generateBoqFromBudgetedItems()));
  document.getElementById('section-ai-apply').addEventListener('click', () => {
    generated.forEach((g) => boq.items.push({ id: newItemId(), sourceImportId: null, ...g }));
    persistBoq();
    closeDialog();
    renderSectionCard();
    showToast(`${generated.length} BOQ item${generated.length > 1 ? 's' : ''} added from AI suggestions.`);
  });
}

/* ---- Export template ---- */

function exportBoqTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([BOQ_REQUIRED_HEADERS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ Template');
  XLSX.writeFile(wb, 'BOQ_Template.xlsx');
}

/* ---- Import Excel ---- */

function openImportModal() {
  openDialog({
    title: 'Import BOQ from Excel',
    bodyHtml: `
      <p class="boq-modal-subtext" style="display:block; margin-bottom: var(--space-4);">Upload the completed BOQ template to add multiple items at once.</p>
      <div class="upload-dropzone" id="boq-import-dropzone">
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <div class="upload-dropzone-main">Click to upload</div>
        <div class="upload-dropzone-sub">SUPPORTED FORMAT: XLSX — MAXIMUM FILE SIZE: 25 MB</div>
        <input type="file" id="boq-import-input" accept=".xlsx" style="display:none;">
      </div>
      <div class="boq-import-error" id="boq-import-error"></div>
    `,
  });

  const dropzone = document.getElementById('boq-import-dropzone');
  const input = document.getElementById('boq-import-input');
  dropzone.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => { if (e.target.files[0]) handleImportFile(e.target.files[0]); });
  ['dragover', 'dragenter'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); }));
  dropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]); });
}

function showImportError(msg) {
  const el = document.getElementById('boq-import-error');
  if (el) el.textContent = msg;
}

function handleImportFile(file) {
  showImportError('');

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    showImportError('Import failed (Only .xlsx files are supported).');
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    showImportError('Import failed (File exceeds the 25 MB limit).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rawRows.length === 0) {
        showImportError('Import failed (The file is empty).');
        return;
      }

      const headerRow = rawRows[0].map((h) => String(h).trim());
      const missing = BOQ_REQUIRED_HEADERS.filter((h) => !headerRow.includes(h));
      if (missing.length > 0) {
        showImportError(`Import failed (The following required columns are missing: ${missing.join(', ')}).`);
        return;
      }

      const dataRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const batchId = newItemId();
      let imported = 0;

      dataRows.forEach((row) => {
        const name = String(row['Item Name'] || '').trim();
        if (!name) return; // skip blank rows
        boq.items.push({
          id: newItemId(),
          sourceImportId: batchId,
          name,
          description: String(row['Item Description'] || ''),
          procurementType: row['Procurement Type'] || null,
          purchaseGroup: row['Purchase Group'] || null,
          materialGroup: row['Material Group'] || null,
          uom: row['UOM'] || null,
          quantity: Number(row['Quantity']) || 0,
          unitPrice: Number(row['Unit Price (SAR)']) || 0,
          deliveryDate: row['Delivery Date'] ? String(row['Delivery Date']) : null,
          hasBrandName: String(row['Has Brand Name']).trim().toLowerCase() === 'yes',
          brandJustification: String(row['Justification for Brand Name'] || ''),
        });
        imported += 1;
      });

      if (imported === 0) {
        showImportError('Import failed (No valid rows with an Item Name were found).');
        return;
      }

      boq.importBatches.push({ id: batchId, filename: file.name, importedAt: Date.now(), itemCount: imported });
      persistBoq();
      closeDialog();
      renderSectionCard();
      showToast(`${imported} BOQ items imported successfully.`);
    } catch (err) {
      showImportError('Import failed (The file could not be read as a valid .xlsx workbook).');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ---- Footer ---- */

function saveDraft() {
  persistBoq();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  if (boq.items.length === 0) return;
  WizardStore.setStepStatus('boq', 'completed');
  WizardStore.setStepStatus('scope-of-work', 'current');
  window.location.href = 'wizard-scope-of-work.html';
}

/* ---- Init ---- */

async function initBoq() {
  WizardStore.setStepStatus('boq', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'boq',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="boq-footer-back-btn" id="boq-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Basic Details</span>
      </button>
    `,
  });
  document.getElementById('boq-back-btn').addEventListener('click', () => {
    window.location.href = 'wizard-basic-details.html';
  });

  boq.step1FormData = WizardStore.getFormData();
  boq.projects = await DataStore.getAllProjects();
  loadBoqState();

  renderBoqPage();
  updateContinueState();
}

document.addEventListener('DOMContentLoaded', initBoq);
