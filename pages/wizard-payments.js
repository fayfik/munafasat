/*
  Step 4 - Payments controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js, ai-generate.js,
  wizard-shell.js (all loaded before this file).

  Every payment stage row is inline-editable directly in the table, same
  approach as BOQ (Step 3) — there's no Add/Edit Stage popup. "+ Add Stage"
  appends a new blank row straight to the table; each row also has its own
  AI-suggestion sparkle (next to the Stage name) that fills that one row,
  in addition to the header's section-level "Generate with AI" for a full
  starter schedule.
*/

const pay = {
  stages: [],
  totalRfpValue: 0,
  step1Fd: {},
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

function escapeHtmlPay(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---- Total RFP/BOQ value (read from Step 3's data, same formula it displays) ---- */

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

/* ---- Totals / progress (3 states: warning under 100%, success at exactly
   100%, error over 100%) ---- */

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
      <div class="aig-toolbar-row">
        <button type="button" class="pay-ai-btn" id="pay-section-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        <button type="button" class="aig-undo-btn" id="undo-pay-section"></button>
        <div class="aig-ribbon" id="ribbon-pay-section"></div>
      </div>
    </div>
    <div class="pay-section-card" id="pay-section-card"></div>
  `;
  document.getElementById('pay-section-ai-btn').addEventListener('click', runFullScheduleAi);
  renderSectionCard();
}

const PAY_COLUMNS = [
  { key: 'sno', label: 'S.No', render: (r) => String(pay.stages.indexOf(r) + 1) },
  {
    key: 'stageName', label: 'Stage', render: (r) => `
      <div class="pay-desc-cell">
        <input type="text" class="pay-cell-input" data-field="stageName" data-id="${r.id}" value="${escapeHtmlPay(r.stageName)}" placeholder="e.g. Advance Payment">
        <button type="button" class="pay-row-ai-btn" data-ai-row="${r.id}" title="Suggest this stage with AI"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
      </div>`,
  },
  { key: 'itemDeliverable', label: 'Item / Deliverable', render: (r) => `<input type="text" class="pay-cell-input" data-field="itemDeliverable" data-id="${r.id}" value="${escapeHtmlPay(r.itemDeliverable || '')}" placeholder="What is delivered at this stage">` },
  { key: 'startDate', label: 'Start Date', render: (r) => `<input type="date" class="pay-cell-input" data-field="startDate" data-id="${r.id}" value="${r.startDate || ''}">` },
  { key: 'durationDays', label: 'Duration (days)', render: (r) => `<input type="number" min="0" step="1" class="pay-cell-input pay-cell-num" data-field="durationDays" data-id="${r.id}" value="${r.durationDays ?? ''}">` },
  { key: 'percentage', label: 'Percentage (%)', render: (r) => `<input type="number" min="0" max="100" step="1" class="pay-cell-input pay-cell-num" data-field="percentage" data-id="${r.id}" value="${r.percentage ?? ''}">` },
  { key: 'amount', label: 'Amount (SAR)', render: (r) => `<input type="number" min="0" step="0.01" class="pay-cell-input pay-cell-num" data-field="amount" data-id="${r.id}" value="${r.amount ?? ''}">` },
  {
    key: 'actions', label: 'Actions', render: (r) => `
      <div class="row-actions">
        <button class="row-action row-action-delete" data-action="delete" data-id="${r.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    `,
  },
];

function renderSectionCard() {
  const card = document.getElementById('pay-section-card');

  if (pay.stages.length === 0) {
    card.innerHTML = `
      <div class="pay-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No payment stages yet</h3>
        <p>Define how payment for this RFP will be staged.</p>
        <div class="pay-empty-actions">
          <button type="button" class="pay-btn-primary" id="pay-empty-add-btn"><i class="fa-solid fa-plus"></i> Add payment schedule</button>
        </div>
      </div>
    `;
    document.getElementById('pay-empty-add-btn').addEventListener('click', addNewStageRow);
    updateContinueGate();
    return;
  }

  card.innerHTML = `
    <div class="pay-add-stage-row">
      <button type="button" class="pay-btn-outline" id="pay-add-stage-btn"><i class="fa-solid fa-plus"></i> Add Stage</button>
    </div>
    <div class="pay-table-wrap">
      ${buildTableHtml({ columns: PAY_COLUMNS, rows: pay.stages, rowKey: (r) => r.id })}
    </div>
    <div class="pay-total-block">
      ${buildTotalBlockInnerHtml()}
    </div>
  `;

  document.getElementById('pay-add-stage-btn').addEventListener('click', addNewStageRow);
  wireTableCellEvents();
  updateContinueGate();
}

function buildTotalBlockInnerHtml() {
  const total = percentTotal();
  const state = totalState();
  const pct = Math.min(100, total);
  const detailText = state === 'error' ? `Payment percentages cannot exceed 100%. (${total}%)`
    : state === 'success' ? 'Payment schedule totals 100%.'
    : `Payment percentages must total 100% — ${(100 - total).toFixed(2).replace(/\.00$/, '')}% remaining`;

  return `
    <div class="pay-total-summary">
      <span class="pay-total-label">Total must equal 100%</span>
      <span class="pay-total-detail state-${state}">${detailText}</span>
    </div>
    <div class="pay-progress-track">
      <div class="pay-progress-fill state-${state}" style="width:${pct}%;"></div>
    </div>
  `;
}

// Targeted update (no full re-render) so editing a percentage/amount cell
// doesn't steal focus from whatever input the user is still typing in.
function refreshTotalsBlock() {
  const block = document.querySelector('.pay-total-block');
  if (block) block.innerHTML = buildTotalBlockInnerHtml();
  updateContinueGate();
}

/* ---- Cell edit event delegation (mirrors BOQ's inline-table pattern) ---- */

function wireTableCellEvents() {
  const tbody = document.querySelector('#pay-section-card tbody');
  if (!tbody) return;

  tbody.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('pay-cell-input')) return;
    const stage = pay.stages.find((s) => s.id === el.dataset.id);
    if (!stage) return;
    const field = el.dataset.field;
    stage[field] = el.value;

    if (field === 'percentage' && pay.totalRfpValue > 0) {
      stage.amount = amountFromPercent(el.value);
      const amtEl = tbody.querySelector(`[data-field="amount"][data-id="${stage.id}"]`);
      if (amtEl) amtEl.value = stage.amount;
    } else if (field === 'amount' && pay.totalRfpValue > 0) {
      stage.percentage = percentFromAmount(el.value);
      const pctEl = tbody.querySelector(`[data-field="percentage"][data-id="${stage.id}"]`);
      if (pctEl) pctEl.value = stage.percentage;
    }

    if (field === 'percentage' || field === 'amount') refreshTotalsBlock();
    persistPay();
  });

  tbody.addEventListener('click', (e) => {
    const aiBtn = e.target.closest('[data-ai-row]');
    if (aiBtn) { runRowAi(aiBtn.dataset.aiRow); return; }

    const delBtn = e.target.closest('[data-action="delete"]');
    if (delBtn) {
      const stage = pay.stages.find((s) => s.id === delBtn.dataset.id);
      if (stage) confirmDeleteStage(stage);
    }
  });
}

/* ---- Add / Delete stage rows ---- */

function emptyStage() {
  return { stageName: '', itemDeliverable: '', startDate: null, durationDays: '', percentage: '', amount: '' };
}

function addNewStageRow() {
  pay.stages.push({ id: newStageId(), ...emptyStage() });
  persistPay();
  renderSectionCard();
}

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

/* ---- Per-row AI sparkle: suggest this one stage in place ---- */

function generateSingleStageSuggestion(stage) {
  const idx = pay.stages.indexOf(stage);
  const names = ['Advance Payment', 'Delivery and Installation', 'Final Acceptance'];
  const name = names[idx] || 'Additional Payment Stage';

  const otherTotal = Math.round(
    pay.stages.filter((s) => s.id !== stage.id).reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) * 100
  ) / 100;
  const remaining = Math.max(0, 100 - otherTotal);
  const percentage = remaining >= 30 ? 30 : remaining;

  const prevStage = pay.stages[idx - 1];
  const startDate = prevStage
    ? addDaysIso(prevStage.startDate, prevStage.durationDays || 0)
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
    itemDeliverable: deliverableByIndex[idx] || 'Additional payment milestone.',
    startDate,
    durationDays,
    percentage,
    amount: amountFromPercent(percentage),
  };
}

function runRowAi(id) {
  const stage = pay.stages.find((s) => s.id === id);
  if (!stage) return;
  Object.assign(stage, generateSingleStageSuggestion(stage));
  persistPay();
  renderSectionCard();
  showToast('Stage suggested by AI.');
}

/* ---- AI: full starter schedule (section-level, header toolbar) ---- */

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
  means "no stages exist yet" (a schedule already in progress is left
  alone rather than appending a conflicting second plan on top of it).
  Undo removes exactly the stages this run added.
*/
function runFullScheduleAi() {
  runAiGenerate({
    confirmMessage: 'Would you like AI to fill this section using the information already provided in your RFP?',
    ribbonMountId: 'ribbon-pay-section',
    undoMountId: 'undo-pay-section',
    emptyMessage: 'A payment schedule already exists — clear it first to generate a new one.',
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
  const next = wizardNextStep('payments');
  if (!next) return;
  WizardStore.setStepStatus(next.id, 'current');
  window.location.href = next.href;
}

/* ---- Init ---- */

async function initPayments() {
  WizardStore.setStepStatus('payments', 'current');

  const prev = wizardPrevStep('payments');
  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'payments',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="pay-footer-back-btn" id="pay-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${prev.title}</span>
      </button>
    `,
  });
  document.getElementById('pay-back-btn').addEventListener('click', () => {
    window.location.href = prev.href;
  });

  pay.step1Fd = WizardStore.getFormData();
  pay.totalRfpValue = computeTotalRfpValue();
  loadPayState();

  renderPayPage();
  updateContinueGate();
}

document.addEventListener('DOMContentLoaded', initPayments);
