/*
  Step 7 - Technical Requirements controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js, wizard-shell.js
  (all loaded before this file).
*/

function newTrId() {
  return `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtmlTr(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const tr = {
  requirements: [],
};

/* ---- Persistence ---- */

function loadTrState() {
  const fd = WizardStore.getFormData();
  tr.requirements = fd.technicalRequirements || seedTrRequirements();
}

function persistTr() {
  WizardStore.updateFormData({ technicalRequirements: tr.requirements });
  updateTrContinueState();
}

function seedTrRequirements() {
  return [
    { id: newTrId(), text: 'Minimum 10 years of experience in SAP S/4HANA implementation.' },
    { id: newTrId(), text: 'Vendor must provide a dedicated project manager for the duration of the engagement.' },
    { id: newTrId(), text: 'Proposed solution must support integration with existing ERP systems via standard APIs.' },
  ];
}

function trValid() {
  return tr.requirements.length > 0 && tr.requirements.every((r) => r.text && r.text.trim());
}

function updateTrContinueState() {
  setWizardContinueEnabled(trValid());
}

/* ---- Rendering ---- */

function renderTrPage() {
  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="tr-header-card">
      <div>
        <div class="tr-header-title">Technical Requirements</div>
        <div class="tr-header-sub">List all technical specifications vendors must comply with.</div>
      </div>
      <div class="tr-header-actions">
        <button type="button" class="tr-ai-btn tr-ai-btn-light" id="tr-review-btn"><i class="fa-solid fa-magnifying-glass"></i> Review with AI</button>
        <button type="button" class="tr-ai-btn" id="tr-generate-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        <button type="button" class="tr-btn-primary" id="tr-add-btn"><i class="fa-solid fa-plus"></i> Add Requirement</button>
      </div>
    </div>
    <div class="tr-section-card" id="tr-section-card"></div>
  `;

  document.getElementById('tr-add-btn').addEventListener('click', addTrRequirement);
  document.getElementById('tr-generate-btn').addEventListener('click', openGenerateTrPanel);
  document.getElementById('tr-review-btn').addEventListener('click', runReviewTr);

  renderTrCard();
}

function renderTrCard() {
  const card = document.getElementById('tr-section-card');
  if (tr.requirements.length === 0) {
    card.innerHTML = `
      <div class="tr-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No requirements yet</h3>
        <p>Click Add Requirement, or Generate with AI.</p>
      </div>
    `;
    return;
  }

  const anyBlank = tr.requirements.some((r) => !r.text || !r.text.trim());

  card.innerHTML = `
    ${buildTableHtml({
      columns: trColumns(),
      rows: tr.requirements,
      rowKey: (r) => r.id,
    })}
    <button type="button" class="tr-add-row-btn" id="tr-add-row-link"><i class="fa-solid fa-plus"></i> Add Requirement</button>
    ${anyBlank ? `<div class="tr-validation-note">Every requirement needs text before you can continue.</div>` : ''}
    <div id="tr-ai-panel-mount"></div>
  `;

  document.getElementById('tr-add-row-link').addEventListener('click', addTrRequirement);
  wireTrTableEvents();
}

function trColumns() {
  return [
    { key: 'sl', label: 'SL No.', render: (r) => String(tr.requirements.indexOf(r) + 1) },
    { key: 'text', label: 'Requirement', render: (r) => `<input type="text" class="tr-cell-input${!r.text || !r.text.trim() ? ' has-error' : ''}" data-id="${r.id}" value="${escapeHtmlTr(r.text)}" placeholder="Describe the requirement…">` },
    {
      key: 'actions', label: 'Actions', render: (r) => `
        <div class="row-actions">
          <button class="row-action row-action-delete" data-action="delete" data-id="${r.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      `,
    },
  ];
}

function wireTrTableEvents() {
  const tbody = document.querySelector('#tr-section-card tbody');
  if (!tbody) return;

  tbody.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('tr-cell-input')) return;
    const item = tr.requirements.find((r) => r.id === el.dataset.id);
    if (!item) return;
    item.text = el.value;
    el.classList.toggle('has-error', !el.value.trim());
    persistTr();
    const note = document.querySelector('.tr-validation-note');
    const anyBlank = tr.requirements.some((r) => !r.text || !r.text.trim());
    if (note && !anyBlank) note.remove();
    else if (!note && anyBlank) {
      document.querySelector('#tr-add-row-link').insertAdjacentHTML('afterend', '<div class="tr-validation-note">Every requirement needs text before you can continue.</div>');
    }
  });

  tbody.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-action="delete"]');
    if (!delBtn) return;
    tr.requirements = tr.requirements.filter((r) => r.id !== delBtn.dataset.id);
    persistTr();
    renderTrCard();
  });
}

function addTrRequirement() {
  tr.requirements.push({ id: newTrId(), text: '' });
  persistTr();
  renderTrCard();
  document.querySelector('#tr-section-card tbody tr:last-child .tr-cell-input')?.focus();
}

/* ---- Generate with AI: suggestions panel + checkbox + "Add selected" ---- */

const TR_AI_SUGGESTION_POOL = [
  'Solution must be deployable in both on-premise and cloud environments.',
  'Vendor must provide 24/7 technical support with a maximum 4-hour response time for critical issues.',
  'All proposed hardware must carry a minimum 3-year manufacturer warranty.',
  'Vendor must demonstrate at least 2 reference implementations of similar scale.',
  'Solution must comply with applicable Saudi data residency and cybersecurity regulations.',
  'Proposed system must support single sign-on (SSO) integration.',
];

function openGenerateTrPanel() {
  const existing = new Set(tr.requirements.map((r) => (r.text || '').trim().toLowerCase()));
  const suggestions = TR_AI_SUGGESTION_POOL.filter((s) => !existing.has(s.trim().toLowerCase()));
  const mount = document.getElementById('tr-ai-panel-mount') || document.getElementById('tr-section-card');

  if (suggestions.length === 0) {
    showToast('No new AI suggestions — everything relevant is already listed.');
    return;
  }

  mount.innerHTML = `
    <div class="tr-ai-panel">
      <div class="tr-ai-panel-title"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-suggested requirements</div>
      ${suggestions.map((s, i) => `
        <label class="tr-ai-suggestion-row">
          <input type="checkbox" class="tr-ai-check" data-idx="${i}" checked>
          <span>${escapeHtmlTr(s)}</span>
        </label>
      `).join('')}
      <div class="tr-ai-panel-actions">
        <button type="button" class="tr-btn-cancel" id="tr-ai-cancel">Cancel</button>
        <button type="button" class="tr-btn-save" id="tr-ai-add-selected">Add selected</button>
      </div>
    </div>
  `;

  document.getElementById('tr-ai-cancel').addEventListener('click', () => { mount.innerHTML = ''; });
  document.getElementById('tr-ai-add-selected').addEventListener('click', () => {
    const checks = Array.from(document.querySelectorAll('.tr-ai-check'));
    const selected = suggestions.filter((_, i) => checks[i].checked);
    if (selected.length === 0) return;
    // Never overwrites existing rows — always appends as new ones.
    selected.forEach((s) => tr.requirements.push({ id: newTrId(), text: s }));
    persistTr();
    renderTrCard();
    showToast(`${selected.length} requirement${selected.length > 1 ? 's' : ''} added.`);
  });
}

/* ---- Review with AI: read-only "AI Insight" analysis ---- */

function runReviewTr() {
  const insights = [];
  const seen = new Map();
  tr.requirements.forEach((r) => {
    const key = (r.text || '').trim().toLowerCase();
    if (!key) return;
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  seen.forEach((count, key) => {
    if (count > 1) insights.push(`"${key}" appears ${count} times — possible duplicate requirement.`);
  });
  tr.requirements.forEach((r) => {
    if (r.text && r.text.trim().length > 0 && r.text.trim().length < 15) {
      insights.push(`"${r.text}" reads as vague or too short — consider being more specific.`);
    }
  });
  if (insights.length === 0) insights.push('No duplicates or ambiguous wording were found.');

  openDialog({
    title: 'AI Insight — Technical Requirements Review',
    bodyHtml: `
      <ul class="tr-ai-insight-list">
        ${insights.map((i) => `<li class="tr-ai-insight-item"><i class="fa-solid fa-wand-magic-sparkles"></i><span>${escapeHtmlTr(i)}</span></li>`).join('')}
      </ul>
      <div style="display:flex; justify-content:flex-end; margin-top:var(--space-4);">
        <button class="tr-btn-save" id="tr-insight-close">Close</button>
      </div>
    `,
  });
  document.getElementById('tr-insight-close').addEventListener('click', closeDialog);
}

/* ---- Footer ---- */

function saveDraft() {
  persistTr();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  if (!trValid()) return;
  WizardStore.setStepStatus('technical-requirements', 'completed');
  WizardStore.setStepStatus('technical-evaluation-criteria', 'current');
  window.location.href = 'wizard-technical-evaluation-criteria.html';
}

/* ---- Init ---- */

async function initTr() {
  WizardStore.setStepStatus('technical-requirements', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'technical-requirements',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="tr-footer-back-btn" id="tr-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Qualification Criteria</span>
      </button>
    `,
  });
  document.getElementById('tr-back-btn').addEventListener('click', () => {
    window.location.href = 'wizard-qualification-criteria.html';
  });

  loadTrState();
  renderTrPage();
  updateTrContinueState();
}

document.addEventListener('DOMContentLoaded', initTr);
