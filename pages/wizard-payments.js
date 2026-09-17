/*
  Step 4 - Payments controller.
  Depends on: data-store.js, dialog.js, toast.js, date-picker.js, table.js,
  wizard-shell.js (all loaded before this file).
*/

const pay = {
  stages: [],
  totalRfpValue: 0,
  step1Fd: {},
  editingStageId: null,
  modalDatePicker: null,
};

/* ---- Persistence ---- */

function loadPayState() {
  const fd = WizardStore.getFormData();
  pay.stages = fd.paymentStages || [];
}

function persistPay() {
  WizardStore.updateFormData({ paymentStages: pay.stages });
  updateContinueGate();
}

function newStageId() {
  return `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ---- Total RFP/BOQ value (read from Step 2's data, same formula it displays) ---- */

function computeTotalRfpValue() {
  const items = pay.step1Fd.boqItems || [];
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  return subtotal * 1.15; // Grand Total incl. 15% VAT, same as the BOQ step's own total
}

function formatPaySAR(amount) {
  return `SAR ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ---- Percentage / amount sync ---- */

function amountFromPercent(pct) {
  return pay.totalRfpValue > 0 ? Math.round((pay.totalRfpValue * (Number(pct) || 0) / 100) * 100) / 100 : 0;
}

function percentFromAmount(amount) {
  return pay.totalRfpValue > 0 ? Math.round(((Number(amount) || 0) / pay.totalRfpValue * 100) * 100) / 100 : 0;
}

/* ---- Totals / progress ---- */

function percentTotal() {
  return Math.round(pay.stages.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) * 100) / 100;
}

function totalState() {
  const total = percentTotal();
  if (total > 100) return 'error';
  if (total === 100) return 'success';
  return 'warning';
}

function updateContinueGate() {
  setWizardContinueEnabled(pay.stages.length > 0 && percentTotal() === 100);
}

/* ---- Rendering ---- */

function renderPayPage() {
  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="pay-header-row">
      <div>
        <div class="pay-header-title">Payment Schedule</div>
        <div class="pay-header-desc">Define payment stages - percentages must total 100%.</div>
      </div>
    </div>
    <div class="aig-ribbon" id="ribbon-pay-section"></div>
    <button type="button" class="aig-undo-btn" id="undo-pay-section"></button>
    <div class="pay-section-card" id="pay-section-card"></div>
  `;
  renderSectionCard();
}

const PAY_COLUMNS = [
  { key: 'sno', label: 'S.No', render: (r) => String(pay.stages.indexOf(r) + 1) },
  { key: 'stageName', label: 'Stage', render: (r) => `<span class="cell-truncate" title="${escapeHtmlPay(r.stageName)}">${escapeHtmlPay(r.stageName)}</span>` },
  { key: 'itemDeliverable', label: 'Item / Deliverable', cellClass: 'cell-muted', render: (r) => `<span class="cell-truncate" title="${escapeHtmlPay(r.itemDeliverable || '')}">${escapeHtmlPay(r.itemDeliverable || '—')}</span>` },
  { key: 'startDate', label: 'Start Date', cellClass: 'cell-muted', render: (r) => formatDate(r.startDate) },
  { key: 'durationDays', label: 'Duration (days)', cellClass: 'cell-muted', render: (r) => (r.durationDays ?? '—') },
  { key: 'percentage', label: 'Percentage (%)', render: (r) => `${Number(r.percentage) || 0}%` },
  { key: 'amount', label: 'Amount (SAR)', render: (r) => `<strong>${formatPaySAR(r.amount)}</strong>` },
  {
    key: 'actions', label: 'Actions', render: (r) => `
      <div class="row-actions">
        <button class="row-action row-action-delete" data-action="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `,
  },
];

function escapeHtmlPay(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderSectionCard() {
  const card = document.getElementById('pay-section-card');

  if (pay.stages.length === 0) {
    card.innerHTML = `
      <div class="pay-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No payment stages yet</h3>
        <p>Define how payment for this RFP will be staged.</p>
        <div class="pay-empty-actions">
          <button type="button" class="pay-btn-primary" id="pay-empty-add-btn"><i class="fa-solid fa-plus"></i> Add Stage</button>
          <button type="button" class="pay-ai-btn" id="pay-empty-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        </div>
      </div>
    `;
    document.getElementById('pay-empty-add-btn').addEventListener('click', () => openStageModal(null));
    document.getElementById('pay-empty-ai-btn').addEventListener('click', runFullScheduleAi);
    updateContinueGate();
    return;
  }

  const total = percentTotal();
  const state = totalState();
  const pct = Math.min(100, total);

  card.innerHTML = `
    <div class="pay-add-stage-row">
      <button type="button" class="pay-btn-outline" id="pay-add-stage-btn"><i class="fa-solid fa-plus"></i> Add Stage</button>
    </div>
    <div class="pay-table-wrap">
      ${buildTableHtml({ columns: PAY_COLUMNS, rows: pay.stages, rowKey: (r) => r.id })}
    </div>
    <div class="pay-total-block">
      <div class="pay-total-summary">
        <span class="pay-total-label">Total must equal 100%</span>
        <span class="pay-total-detail state-${state}">
          ${state === 'error' ? `Payment percentages cannot exceed 100%. (${total}%)`
            : state === 'success' ? 'Payment schedule totals 100%.'
            : `Payment percentages must total 100% — ${(100 - total).toFixed(2).replace(/\.00$/, '')}% remaining`}
        </span>
      </div>
      <div class="pay-progress-track">
        <div class="pay-progress-fill state-${state}" style="width:${pct}%;"></div>
      </div>
    </div>
  `;

  document.getElementById('pay-add-stage-btn').addEventListener('click', () => openStageModal(null));
  wireTableRowEvents();
  updateContinueGate();
}

function wireTableRowEvents() {
  const tbody = document.querySelector('#pay-section-card tbody');
  if (!tbody) return;
  tbody.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('.row-action');
    const tr = event.target.closest('tr[data-row-key]');
    if (!tr) return;
    const stage = pay.stages.find((s) => s.id === tr.dataset.rowKey);
    if (!stage) return;

    if (actionBtn) {
      if (actionBtn.dataset.action === 'delete') confirmDeleteStage(stage);
      return;
    }
    openStageModal(stage);
  });
}

/* ---- Delete ---- */

function confirmDeleteStage(stage) {
  openDialog({
    title: 'Delete payment stage?',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        This payment stage will be removed from the schedule.
      </p>
      <div class="pay-modal-footer" style="margin-top:0;">
        <button class="pay-btn-cancel" id="pay-delete-cancel">Cancel</button>
        <button class="pay-btn-danger" id="pay-delete-confirm">Delete Stage</button>
      </div>
    `,
  });
  document.getElementById('pay-delete-cancel').addEventListener('click', closeDialog);
  document.getElementById('pay-delete-confirm').addEventListener('click', () => {
    pay.stages = pay.stages.filter((s) => s.id !== stage.id);
    persistPay();
    closeDialog();
    renderSectionCard();
    showToast('Payment stage removed.');
  });
}

/* ---- Add / Edit Stage modal ---- */

function emptyStage() {
  return { id: null, stageName: '', itemDeliverable: '', startDate: null, durationDays: '', percentage: '', amount: '' };
}

function openStageModal(stage, draftValues) {
  const isEdit = !!stage;
  pay.editingStageId = isEdit ? stage.id : null;
  const values = draftValues || (stage ? { ...stage } : emptyStage());

  openDialog({
    title: isEdit ? 'Edit Payment Stage' : 'Add Stage',
    bodyHtml: buildStageModalHtml(values, isEdit),
  });
  wireStageModal(values, isEdit);
}

function buildStageModalHtml(v, isEdit) {
  return `
    <p class="pay-modal-subtext">${isEdit ? 'Update the payment stage details, schedule, and payment allocation.' : "Define a new payment stage, its deliverable, schedule, duration, and payment allocation."}</p>
    ${!isEdit ? `
      <div class="pay-modal-toolbar">
        <button type="button" class="pay-ai-btn" id="pay-modal-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
      </div>
      <div id="pay-modal-ai-suggestion"></div>
    ` : ''}

    <div class="pay-field-row">
      <div class="pay-field full">
        <label class="pay-field-label">Stage</label>
        <input type="text" class="pay-input" id="pay-f-stage-name" placeholder="e.g. Advance Payment" value="${escapeHtmlPay(v.stageName)}">
        <div class="pay-field-error" id="pay-err-stageName"></div>
      </div>
    </div>

    <div class="pay-field-row">
      <div class="pay-field full">
        <label class="pay-field-label">Item / Deliverable</label>
        <textarea class="pay-textarea" id="pay-f-deliverable" placeholder="What is delivered at this stage...">${escapeHtmlPay(v.itemDeliverable || '')}</textarea>
      </div>
    </div>

    <div class="pay-field-row">
      <div class="pay-field half">
        <label class="pay-field-label">Start Date</label>
        <div id="pay-dp-start"></div>
      </div>
      <div class="pay-field half">
        <label class="pay-field-label">Stage Duration (days)</label>
        <div class="pay-number-input">
          <input type="number" id="pay-f-duration" min="0" step="1" value="${v.durationDays ?? ''}">
          <div class="pay-number-steppers">
            <button type="button" id="pay-duration-up"><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" id="pay-duration-down"><i class="fa-solid fa-chevron-down"></i></button>
          </div>
        </div>
        <div class="pay-field-error" id="pay-err-durationDays"></div>
      </div>
    </div>

    <div class="pay-field-row">
      <div class="pay-field half">
        <label class="pay-field-label">Duration %</label>
        <div class="pay-number-input has-suffix">
          <input type="number" id="pay-f-percentage" min="0" max="100" step="1" value="${v.percentage ?? ''}">
          <span class="pay-number-suffix">%</span>
          <div class="pay-number-steppers">
            <button type="button" id="pay-pct-up"><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" id="pay-pct-down"><i class="fa-solid fa-chevron-down"></i></button>
          </div>
        </div>
        <div class="pay-field-error" id="pay-err-percentage"></div>
      </div>
      <div class="pay-field half">
        <label class="pay-field-label">Amount SAR</label>
        <div class="pay-number-input has-prefix">
          <span class="pay-number-prefix">SAR</span>
          <input type="number" id="pay-f-amount" min="0" step="0.01" value="${v.amount ?? ''}">
          <div class="pay-number-steppers">
            <button type="button" id="pay-amt-up"><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" id="pay-amt-down"><i class="fa-solid fa-chevron-down"></i></button>
          </div>
        </div>
        <div class="pay-field-error" id="pay-err-amount"></div>
      </div>
    </div>

    <div class="pay-modal-footer">
      <button class="pay-btn-cancel" id="pay-modal-cancel">Cancel</button>
      <button class="pay-btn-save" id="pay-modal-save">${isEdit ? 'Save Changes' : 'Add stage'}</button>
    </div>
  `;
}

function readStageModalValues() {
  return {
    stageName: document.getElementById('pay-f-stage-name').value.trim(),
    itemDeliverable: document.getElementById('pay-f-deliverable').value,
    startDate: pay.modalDatePicker.getValue(),
    durationDays: document.getElementById('pay-f-duration').value,
    percentage: document.getElementById('pay-f-percentage').value,
    amount: document.getElementById('pay-f-amount').value,
  };
}

function wireStageModal(v, isEdit) {
  pay.modalDatePicker = createDatePicker({ mountId: 'pay-dp-start', value: v.startDate, onChange: () => {} });

  const pctInput = document.getElementById('pay-f-percentage');
  const amtInput = document.getElementById('pay-f-amount');

  pctInput.addEventListener('input', () => {
    if (pay.totalRfpValue > 0) amtInput.value = amountFromPercent(pctInput.value);
  });
  amtInput.addEventListener('input', () => {
    if (pay.totalRfpValue > 0) pctInput.value = percentFromAmount(amtInput.value);
  });

  document.getElementById('pay-duration-up').addEventListener('click', () => stepPayNumber('pay-f-duration', 1, 0));
  document.getElementById('pay-duration-down').addEventListener('click', () => stepPayNumber('pay-f-duration', -1, 0));
  document.getElementById('pay-pct-up').addEventListener('click', () => { stepPayNumber('pay-f-percentage', 1, 0); pctInput.dispatchEvent(new Event('input')); });
  document.getElementById('pay-pct-down').addEventListener('click', () => { stepPayNumber('pay-f-percentage', -1, 0); pctInput.dispatchEvent(new Event('input')); });
  document.getElementById('pay-amt-up').addEventListener('click', () => { stepPayNumber('pay-f-amount', 1, 0); amtInput.dispatchEvent(new Event('input')); });
  document.getElementById('pay-amt-down').addEventListener('click', () => { stepPayNumber('pay-f-amount', -1, 0); amtInput.dispatchEvent(new Event('input')); });

  document.getElementById('pay-modal-cancel').addEventListener('click', closeDialog);
  document.getElementById('pay-modal-save').addEventListener('click', () => handleStageModalSave(isEdit));

  const aiBtn = document.getElementById('pay-modal-ai-btn');
  if (aiBtn) aiBtn.addEventListener('click', runAddStageAi);
}

function stepPayNumber(id, delta, min) {
  const el = document.getElementById(id);
  const next = Math.max(min, (Number(el.value) || 0) + delta);
  el.value = next;
}

function validateStageModal(values) {
  const errors = {};
  if (!values.stageName) errors.stageName = 'Stage name is required.';
  if (values.durationDays !== '' && Number(values.durationDays) < 0) errors.durationDays = 'Duration cannot be negative.';
  if (values.percentage === '' || Number(values.percentage) < 0 || Number(values.percentage) > 100) errors.percentage = 'Enter a percentage between 0 and 100.';
  if (values.amount !== '' && Number(values.amount) < 0) errors.amount = 'Amount cannot be negative.';
  return errors;
}

function handleStageModalSave(isEdit) {
  const values = readStageModalValues();
  const errors = validateStageModal(values);
  if (Object.keys(errors).length > 0) {
    Object.keys(errors).forEach((k) => {
      const el = document.getElementById(`pay-err-${k}`);
      if (el) el.textContent = errors[k];
      const fieldMap = { stageName: 'pay-f-stage-name', durationDays: 'pay-f-duration', percentage: 'pay-f-percentage', amount: 'pay-f-amount' };
      document.getElementById(fieldMap[k])?.classList.add('has-error');
    });
    return;
  }

  const record = {
    stageName: values.stageName,
    itemDeliverable: values.itemDeliverable,
    startDate: values.startDate,
    durationDays: values.durationDays === '' ? 0 : Number(values.durationDays),
    percentage: Number(values.percentage),
    amount: values.amount === '' ? amountFromPercent(values.percentage) : Number(values.amount),
  };

  if (isEdit) {
    const idx = pay.stages.findIndex((s) => s.id === pay.editingStageId);
    if (idx >= 0) pay.stages[idx] = { ...pay.stages[idx], ...record };
    persistPay();
    closeDialog();
    renderSectionCard();
    showToast('Payment stage updated.');
  } else {
    pay.stages.push({ id: newStageId(), ...record });
    persistPay();
    closeDialog();
    renderSectionCard();
    showToast('Payment stage added.');
  }
}

/* ---- Context helpers for AI ---- */

function totalStep1DurationDays() {
  const { durationType, durationValue } = pay.step1Fd;
  const n = Number(durationValue) || 0;
  if (durationType === 'Days') return n;
  if (durationType === 'Weeks') return n * 7;
  if (durationType === 'Months') return n * 30;
  if (durationType === 'Year') return n * 365;
  return 90;
}

function addDaysIso(iso, days) {
  const base = iso ? new Date(`${iso}T00:00:00`) : new Date();
  base.setDate(base.getDate() + Math.round(days));
  // NOTE: toISOString() converts to UTC, which silently shifts the date
  // back a day in any timezone ahead of UTC (local midnight becomes the
  // previous day in UTC) — format from local getters instead.
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function boqPayItemNames() {
  return (pay.step1Fd.boqItems || []).map((i) => i.name).filter(Boolean);
}

/* ---- AI: single stage suggestion (inside Add Stage popup only) ---- */

function runAddStageAi() {
  const suggestion = generateSingleStageSuggestion();
  const mount = document.getElementById('pay-modal-ai-suggestion');
  renderAddStageAiBox(mount, suggestion);
}

function generateSingleStageSuggestion() {
  const names = ['Advance Payment', 'Delivery and Installation', 'Final Acceptance'];
  const name = names[pay.stages.length] || 'Additional Payment Stage';
  const remaining = Math.max(0, 100 - percentTotal());
  const percentage = remaining >= 30 ? 30 : remaining;

  const last = pay.stages[pay.stages.length - 1];
  const startDate = last
    ? addDaysIso(last.startDate, last.durationDays || 0)
    : (pay.step1Fd.projectStartDate || new Date().toISOString().slice(0, 10));
  const durationDays = 30;

  const items = boqPayItemNames();
  const deliverableByIndex = [
    'Advance payment upon contract signing.',
    `Delivery and installation of ${items.length ? items.join(', ') : 'contracted items'}.`,
    'Final acceptance and project handover.',
  ];

  return {
    stageName: name,
    itemDeliverable: deliverableByIndex[pay.stages.length] || 'Additional payment milestone.',
    startDate,
    durationDays,
    percentage,
    amount: amountFromPercent(percentage),
  };
}

function renderAddStageAiBox(mount, suggestion) {
  mount.innerHTML = `
    <div class="pay-ai-suggested-box">
      <div class="pay-ai-suggested-label"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-suggested stage</div>
      <div><strong>${escapeHtmlPay(suggestion.stageName)}</strong> — ${suggestion.percentage}% (${formatPaySAR(suggestion.amount)})</div>
      <div style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-top: 4px;">${escapeHtmlPay(suggestion.itemDeliverable)}</div>
      <div style="color: var(--text-tertiary); font-size: var(--font-size-xs); margin-top: 4px;">Start ${formatDate(suggestion.startDate)} · ${suggestion.durationDays} days</div>
      <div class="pay-ai-suggested-actions">
        <button type="button" class="pay-btn-save" id="pay-ai-accept">Accept &amp; Apply</button>
        <button type="button" class="pay-btn-cancel" id="pay-ai-regenerate">Regenerate</button>
        <button type="button" class="pay-btn-cancel" id="pay-ai-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById('pay-ai-accept').addEventListener('click', () => {
    document.getElementById('pay-f-stage-name').value = suggestion.stageName;
    document.getElementById('pay-f-deliverable').value = suggestion.itemDeliverable;
    document.getElementById('pay-f-duration').value = suggestion.durationDays;
    document.getElementById('pay-f-percentage').value = suggestion.percentage;
    document.getElementById('pay-f-amount').value = suggestion.amount;
    pay.modalDatePicker.setValue(suggestion.startDate);
    mount.innerHTML = '';
  });
  document.getElementById('pay-ai-regenerate').addEventListener('click', () => {
    renderAddStageAiBox(mount, generateSingleStageSuggestion());
  });
  document.getElementById('pay-ai-cancel').addEventListener('click', () => { mount.innerHTML = ''; });
}

/* ---- AI: full starter schedule (section-level) ---- */

function generateFullScheduleSuggestion() {
  const totalDays = totalStep1DurationDays();
  const start = pay.step1Fd.projectStartDate || new Date().toISOString().slice(0, 10);
  const items = boqPayItemNames();

  const plan = [
    { stageName: 'Advance Payment', percentage: 20, durationDays: 0, offsetDays: 0, itemDeliverable: 'Advance payment upon contract signing.' },
    { stageName: 'Delivery and Installation', percentage: 50, durationDays: Math.round(totalDays * 0.5), offsetDays: Math.round(totalDays * 0.5), itemDeliverable: `Delivery and installation of ${items.length ? items.join(', ') : 'contracted items'}.` },
    { stageName: 'Final Acceptance', percentage: 30, durationDays: totalDays, offsetDays: totalDays, itemDeliverable: 'Final acceptance and project handover.' },
  ];

  return plan.map((p) => ({
    stageName: p.stageName,
    itemDeliverable: p.itemDeliverable,
    startDate: addDaysIso(start, p.offsetDays),
    durationDays: p.durationDays,
    percentage: p.percentage,
    amount: amountFromPercent(p.percentage),
  }));
}

/*
  Like BOQ, this adds new rows rather than filling field values — "empty"
  means "no stages exist yet" (the button itself is only shown in the
  empty state). Undo removes exactly the stages this run added.
*/
function runFullScheduleAi() {
  runAiGenerate({
    confirmMessage: 'Would you like AI to fill this section using the information already provided in your RFP?',
    ribbonMountId: 'ribbon-pay-section',
    undoMountId: 'undo-pay-section',
    hasWork: () => pay.stages.length === 0,
    performApply: () => {
      const schedule = generateFullScheduleSuggestion();
      const addedIds = schedule.map((s) => {
        const id = newStageId();
        pay.stages.push({ id, ...s });
        return id;
      });
      persistPay();
      renderSectionCard();
      return () => {
        pay.stages = pay.stages.filter((s) => !addedIds.includes(s.id));
        persistPay();
        renderSectionCard();
      };
    },
  });
}

/* ---- Footer ---- */

function saveDraft() {
  persistPay();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  if (pay.stages.length === 0 || percentTotal() !== 100) return;
  WizardStore.setStepStatus('payments', 'completed');
  WizardStore.setStepStatus('attachments', 'current');
  window.location.href = 'wizard-attachments.html';
}

/* ---- Init ---- */

async function initPayments() {
  WizardStore.setStepStatus('payments', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'payments',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="pay-footer-back-btn" id="pay-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Scope of Work</span>
      </button>
    `,
  });
  document.getElementById('pay-back-btn').addEventListener('click', () => {
    window.location.href = 'wizard-scope-of-work.html';
  });

  pay.step1Fd = WizardStore.getFormData();
  pay.totalRfpValue = computeTotalRfpValue();
  loadPayState();

  renderPayPage();
  updateContinueGate();
}

document.addEventListener('DOMContentLoaded', initPayments);
