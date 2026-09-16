/*
  Filter panel component — right-side slide-in overlay.
  Self-mounting singleton (like dialog.js): built once on first openFilterPanel()
  call, then shown/hidden and re-populated on subsequent calls.
  Depends on: components/chips/chips.js, components/dialog/dialog.js.
*/

const FILTER_STATUS_OPTIONS = ['Draft', 'Submitted', 'Approved', 'Rejected'];

let fpState = null; // { statusOptions, projectOptions, presets, onApply }
let fpStatusChips = null;
let fpProjectChips = null;
let fpCustomPresets = [];
let fpAppliedSnapshot = { status: [], project: [], dateFrom: '', dateTo: '' };

function ensureFilterPanelRoot() {
  let root = document.getElementById('filter-panel-root');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'filter-panel-root';
  root.className = 'filter-panel-overlay';
  root.innerHTML = `
    <div class="filter-panel-drawer" role="dialog" aria-label="Filter">
      <div class="filter-panel-header">
        <span class="filter-panel-title">Filter</span>
        <button class="filter-panel-close" id="fp-close-btn" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="filter-panel-body">
        <div>
          <label class="filter-field-label" for="fp-preset-select">Selected saved filter</label>
          <select class="filter-select" id="fp-preset-select">
            <option value="">— None —</option>
          </select>
        </div>

        <div class="filter-clear-all-row">
          <button class="filter-clear-all-link" id="fp-clear-all">Clear all</button>
        </div>

        <div>
          <label class="filter-field-label">Status</label>
          <div id="fp-status-chips"></div>
        </div>

        <div>
          <label class="filter-field-label">Created On</label>
          <div class="date-range-row">
            <div class="date-field" id="fp-date-from-field">
              <i class="fa-regular fa-calendar"></i>
              <input type="date" id="fp-date-from" aria-label="From date">
            </div>
            <span style="color: var(--text-tertiary);">–</span>
            <div class="date-field" id="fp-date-to-field">
              <i class="fa-regular fa-calendar"></i>
              <input type="date" id="fp-date-to" aria-label="To date">
            </div>
          </div>
          <div class="date-range-error" id="fp-date-error" style="display:none;">"From" date must be on or before "To" date.</div>
        </div>

        <div>
          <label class="filter-field-label">Project</label>
          <div id="fp-project-chips"></div>
        </div>
      </div>
      <div class="filter-panel-footer">
        <button class="filter-btn-text" id="fp-save-filter-btn">Save Filter</button>
        <div class="filter-footer-right">
          <button class="filter-btn-outline" id="fp-cancel-btn">Cancel</button>
          <button class="filter-btn-primary" id="fp-apply-btn">Apply filter</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  root.addEventListener('click', (event) => {
    if (event.target === root) discardAndClose();
  });
  document.getElementById('fp-close-btn').addEventListener('click', discardAndClose);
  document.getElementById('fp-cancel-btn').addEventListener('click', discardAndClose);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('open')) discardAndClose();
  });

  document.getElementById('fp-preset-select').addEventListener('change', onPresetSelected);
  document.getElementById('fp-clear-all').addEventListener('click', clearAllFields);
  document.getElementById('fp-apply-btn').addEventListener('click', applyAndClose);
  document.getElementById('fp-save-filter-btn').addEventListener('click', openSaveFilterDialog);

  fpStatusChips = createChipsField({
    mountId: 'fp-status-chips',
    options: FILTER_STATUS_OPTIONS,
    placeholder: 'Any status',
  });

  return root;
}

function allPresets() {
  return [...(fpState.presets || []), ...fpCustomPresets];
}

function renderPresetOptions() {
  const select = document.getElementById('fp-preset-select');
  const presets = allPresets();
  select.innerHTML = `<option value="">— None —</option>` +
    presets.map((p, i) => `<option value="${i}">${p.label}</option>`).join('');
}

function onPresetSelected(event) {
  const idx = event.target.value;
  if (idx === '') return;
  const preset = allPresets()[Number(idx)];
  if (!preset) return;
  fpStatusChips.setSelected(preset.status || []);
  fpProjectChips.setSelected(preset.project || []);
  document.getElementById('fp-date-from').value = preset.dateFrom || '';
  document.getElementById('fp-date-to').value = preset.dateTo || '';
}

function clearAllFields() {
  fpStatusChips.setSelected([]);
  fpProjectChips.setSelected([]);
  document.getElementById('fp-date-from').value = '';
  document.getElementById('fp-date-to').value = '';
  document.getElementById('fp-preset-select').value = '';
  hideDateError();
}

function readFields() {
  return {
    status: fpStatusChips.getSelected(),
    project: fpProjectChips.getSelected(),
    dateFrom: document.getElementById('fp-date-from').value,
    dateTo: document.getElementById('fp-date-to').value,
  };
}

function populateFields(filters) {
  fpStatusChips.setSelected(filters.status || []);
  fpProjectChips.setSelected(filters.project || []);
  document.getElementById('fp-date-from').value = filters.dateFrom || '';
  document.getElementById('fp-date-to').value = filters.dateTo || '';
  document.getElementById('fp-preset-select').value = '';
  hideDateError();
}

function showDateError() {
  document.getElementById('fp-date-error').style.display = 'block';
  document.getElementById('fp-date-from-field').classList.add('has-error');
  document.getElementById('fp-date-to-field').classList.add('has-error');
}

function hideDateError() {
  document.getElementById('fp-date-error').style.display = 'none';
  document.getElementById('fp-date-from-field').classList.remove('has-error');
  document.getElementById('fp-date-to-field').classList.remove('has-error');
}

function applyAndClose() {
  const fields = readFields();
  if (fields.dateFrom && fields.dateTo && fields.dateFrom > fields.dateTo) {
    showDateError();
    return;
  }
  hideDateError();
  fpAppliedSnapshot = fields;
  document.getElementById('filter-panel-root').classList.remove('open');
  fpState.onApply(fields);
}

function discardAndClose() {
  populateFields(fpAppliedSnapshot);
  document.getElementById('filter-panel-root').classList.remove('open');
}

function openSaveFilterDialog() {
  openDialog({
    title: 'Save filter as',
    bodyHtml: `
      <input type="text" class="save-filter-input" id="save-filter-name-input" placeholder="e.g. My IT approvals">
      <div class="save-filter-actions">
        <button class="filter-btn-outline" id="save-filter-cancel-btn">Cancel</button>
        <button class="filter-btn-primary" id="save-filter-save-btn">Save</button>
      </div>
    `,
  });
  document.getElementById('save-filter-cancel-btn').addEventListener('click', closeDialog);
  document.getElementById('save-filter-save-btn').addEventListener('click', () => {
    const input = document.getElementById('save-filter-name-input');
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    fpCustomPresets.push({ label: name, ...readFields() });
    renderPresetOptions();
    closeDialog();
  });
}

function openFilterPanel({ projectOptions = [], presets = [], currentFilters = {}, onApply }) {
  ensureFilterPanelRoot();
  fpState = { presets, onApply };

  fpProjectChips = fpProjectChips || null;
  if (!fpProjectChips) {
    fpProjectChips = createChipsField({
      mountId: 'fp-project-chips',
      options: projectOptions,
      placeholder: 'Any project',
    });
  }

  renderPresetOptions();
  fpAppliedSnapshot = {
    status: currentFilters.status || [],
    project: currentFilters.project || [],
    dateFrom: currentFilters.dateFrom || '',
    dateTo: currentFilters.dateTo || '',
  };
  populateFields(fpAppliedSnapshot);

  document.getElementById('filter-panel-root').classList.add('open');
}
