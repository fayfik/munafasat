/*
  Step 6 - Qualification Criteria controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js, wizard-shell.js
  (all loaded before this file).

  "AI actions use the global AI pattern (modal review, Accept/Reject/Edit,
  Undo after applying)" — implemented via the same runAiGenerate() shared
  component (components/ai-generate) the rest of the app calls "the global
  Undo-changes pattern": confirm dialog -> apply -> success ribbon ->
  outlined Undo button. "Check qualification criteria" is read-only
  analysis (nothing to apply/undo) so it's a simple insight dialog instead.
*/

const QC_CATEGORY_NAMES = ['Previous Experience', 'Technical Capability', 'Financial Capability', 'Compliance & Certifications'];

function newQcId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtmlQc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const qc = {
  categories: [],
  passingPercent: '',
};

/* ---- Persistence ---- */

function loadQcState() {
  const fd = WizardStore.getFormData();
  qc.categories = fd.qualificationCriteria || seedQcCategories();
  qc.passingPercent = fd.qualificationPassingPercent ?? '';
}

function persistQc() {
  WizardStore.updateFormData({ qualificationCriteria: qc.categories, qualificationPassingPercent: qc.passingPercent });
  updateContinueState();
}

function seedQcCategories() {
  return [
    {
      id: newQcId('qc-cat'), name: 'Previous Experience', criteria: [
        { id: newQcId('qc-crit'), name: 'Number of years of experience', range: '5-10 years', percentage: 10 },
        { id: newQcId('qc-crit'), name: 'Number of similar projects completed', range: '3-5 projects', percentage: 10 },
      ],
    },
    {
      id: newQcId('qc-cat'), name: 'Technical Capability', criteria: [
        { id: newQcId('qc-crit'), name: 'Certified technical staff on team', range: '2-4 certified staff', percentage: 15 },
      ],
    },
  ];
}

/* ---- Totals ---- */

function qcAllCriteria() {
  return qc.categories.flatMap((c) => c.criteria);
}

function qcTotal() {
  return Math.round(qcAllCriteria().reduce((sum, c) => sum + (Number(c.percentage) || 0), 0) * 100) / 100;
}

function qcTotalState() {
  const total = qcTotal();
  if (total > 100) return 'error';
  if (total === 100) return 'success';
  return 'warning';
}

function qcValid() {
  const criteria = qcAllCriteria();
  return criteria.length > 0 && qcTotal() === 100 && criteria.every((c) => c.range && c.range.trim());
}

function updateContinueState() {
  setWizardContinueEnabled(qcValid());
}

/* ---- Rendering ---- */

function renderQcPage() {
  const mount = document.getElementById('wizard-step-content');
  const total = qcTotal();
  const state = qcTotalState();

  mount.innerHTML = `
    <div class="qc-header-card">
      <div>
        <div class="qc-header-title">Qualification Criteria</div>
        <div class="qc-header-sub">Fill in the range and percentage for each criterion.</div>
      </div>
      <div class="qc-header-right">
        <span class="qc-total-badge state-${state}" id="qc-total-badge">${total}% total</span>
        <button type="button" class="qc-btn-primary" id="qc-add-criterion-btn"><i class="fa-solid fa-plus"></i> Add Criterion</button>
      </div>
    </div>

    <div class="qc-ai-actions-row">
      <button type="button" class="qc-ai-section-btn" id="qc-generate-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate Qualification Criteria</button>
      <button type="button" class="qc-ai-section-btn" id="qc-review-weightage-btn"><i class="fa-solid fa-scale-balanced"></i> Review weightage</button>
      <button type="button" class="qc-ai-section-btn" id="qc-check-btn"><i class="fa-solid fa-circle-check"></i> Check qualification criteria</button>
      <button type="button" class="aig-undo-btn" id="undo-qc-section"></button>
      <div class="aig-ribbon" id="ribbon-qc-section"></div>
    </div>

    <div class="qc-passing-card">
      <div>
        <div class="qc-passing-label">Qualification Technical Passing %</div>
        <div class="qc-passing-desc">Minimum score a vendor must reach on qualification criteria to proceed.</div>
      </div>
      <div class="qc-passing-input-wrap">
        <input type="number" min="0" max="100" id="qc-passing-input" value="${qc.passingPercent}">
        <span>%</span>
      </div>
    </div>

    <div id="qc-categories-mount"></div>
  `;

  document.getElementById('qc-add-criterion-btn').addEventListener('click', () => openAddCriterionModal(null));
  document.getElementById('qc-generate-btn').addEventListener('click', runGenerateQualificationCriteria);
  document.getElementById('qc-review-weightage-btn').addEventListener('click', runReviewWeightage);
  document.getElementById('qc-check-btn').addEventListener('click', runCheckQualificationCriteria);

  const passingInput = document.getElementById('qc-passing-input');
  passingInput.addEventListener('input', (e) => {
    qc.passingPercent = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    persistQc();
  });

  renderCategories();
}

function refreshTotalBadge() {
  const badge = document.getElementById('qc-total-badge');
  if (!badge) return;
  const total = qcTotal();
  badge.textContent = `${total}% total`;
  badge.className = `qc-total-badge state-${qcTotalState()}`;
}

function renderCategories() {
  const mount = document.getElementById('qc-categories-mount');
  if (qc.categories.length === 0 || qcAllCriteria().length === 0) {
    mount.innerHTML = `
      <div class="qc-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No criteria yet</h3>
        <p>Click Add Criterion, or Generate Qualification Criteria with AI.</p>
      </div>
    `;
    return;
  }

  mount.innerHTML = qc.categories.filter((c) => c.criteria.length > 0).map((cat) => {
    const subtotal = Math.round(cat.criteria.reduce((s, c) => s + (Number(c.percentage) || 0), 0) * 100) / 100;
    return `
      <div class="qc-category-card" data-cat-id="${cat.id}">
        <div class="qc-category-header">
          <div class="qc-category-title">${escapeHtmlQc(cat.name)}</div>
          <div class="qc-category-subtotal">${subtotal}% of total</div>
        </div>
        ${buildTableHtml({
          columns: qcColumns(),
          rows: cat.criteria,
          rowKey: (r) => r.id,
          emptyText: 'No criteria in this category.',
        })}
        <button type="button" class="qc-add-criterion-link" data-add-to-cat="${cat.id}"><i class="fa-solid fa-plus"></i> Add criterion to ${escapeHtmlQc(cat.name)}</button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-add-to-cat]').forEach((btn) => {
    btn.addEventListener('click', () => openAddCriterionModal(btn.dataset.addToCat));
  });

  wireCategoryTableEvents();
}

function qcColumns() {
  return [
    { key: 'name', label: 'Criteria', render: (r) => `<input type="text" class="qc-cell-input" data-field="name" data-id="${r.id}" value="${escapeHtmlQc(r.name)}" placeholder="Criterion name">` },
    { key: 'range', label: 'Range', render: (r) => `<input type="text" class="qc-cell-input${!r.range ? ' has-error' : ''}" data-field="range" data-id="${r.id}" value="${escapeHtmlQc(r.range || '')}" placeholder="e.g. 5-10 years">` },
    { key: 'percentage', label: 'Percentage (%)', render: (r) => `<input type="number" min="0" max="100" class="qc-cell-input" data-field="percentage" data-id="${r.id}" value="${r.percentage ?? ''}">` },
    {
      key: 'actions', label: 'Actions', render: (r) => `
        <div class="row-actions">
          <button class="row-action row-action-delete" data-action="delete" data-id="${r.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      `,
    },
  ];
}

function findCriterion(id) {
  for (const cat of qc.categories) {
    const crit = cat.criteria.find((c) => c.id === id);
    if (crit) return { cat, crit };
  }
  return null;
}

function wireCategoryTableEvents() {
  document.querySelectorAll('.qc-category-card tbody').forEach((tbody) => {
    tbody.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.classList.contains('qc-cell-input')) return;
      const found = findCriterion(el.dataset.id);
      if (!found) return;
      found.crit[el.dataset.field] = el.dataset.field === 'percentage' ? el.value : el.value;
      el.classList.toggle('has-error', el.dataset.field === 'range' && !el.value.trim());
      persistQc();
      refreshTotalBadge();
      const subtotalEl = el.closest('.qc-category-card').querySelector('.qc-category-subtotal');
      if (subtotalEl) {
        const subtotal = Math.round(found.cat.criteria.reduce((s, c) => s + (Number(c.percentage) || 0), 0) * 100) / 100;
        subtotalEl.textContent = `${subtotal}% of total`;
      }
    });

    tbody.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="delete"]');
      if (!delBtn) return;
      const found = findCriterion(delBtn.dataset.id);
      if (!found) return;
      found.cat.criteria = found.cat.criteria.filter((c) => c.id !== delBtn.dataset.id);
      persistQc();
      renderCategories();
      refreshTotalBadge();
    });
  });
}

/* ---- Add Criterion modal ---- */

function openAddCriterionModal(presetCategoryId) {
  openDialog({
    title: 'Add Criterion',
    bodyHtml: `
      <div class="qc-field-row">
        <div class="qc-field full">
          <label class="qc-field-label">Category</label>
          <select class="qc-select" id="qc-modal-category">
            ${qc.categories.map((c) => `<option value="${c.id}" ${c.id === presetCategoryId ? 'selected' : ''}>${escapeHtmlQc(c.name)}</option>`).join('')}
            <option value="__new__">+ New category…</option>
          </select>
        </div>
      </div>
      <div class="qc-field-row" id="qc-modal-new-cat-row" style="display:none;">
        <div class="qc-field full">
          <label class="qc-field-label">New category name</label>
          <input type="text" class="qc-input" id="qc-modal-new-cat-name" placeholder="e.g. Financial Capability">
        </div>
      </div>
      <div class="qc-field-row">
        <div class="qc-field full">
          <label class="qc-field-label">Criteria <span style="color:var(--color-error-500);">*</span></label>
          <input type="text" class="qc-input" id="qc-modal-name" placeholder="e.g. Number of years of experience">
        </div>
      </div>
      <div class="qc-field-row">
        <div class="qc-field">
          <label class="qc-field-label">Range <span style="color:var(--color-error-500);">*</span></label>
          <input type="text" class="qc-input" id="qc-modal-range" placeholder="e.g. 5-10 years">
        </div>
        <div class="qc-field">
          <label class="qc-field-label">Percentage (%)</label>
          <input type="number" min="0" max="100" class="qc-input" id="qc-modal-percentage" value="10">
        </div>
      </div>
      <div class="qc-modal-footer">
        <button class="qc-btn-cancel" id="qc-modal-cancel">Cancel</button>
        <button class="qc-btn-save" id="qc-modal-save" disabled>Add Criterion</button>
      </div>
    `,
  });

  const catSelect = document.getElementById('qc-modal-category');
  const newCatRow = document.getElementById('qc-modal-new-cat-row');
  const newCatInput = document.getElementById('qc-modal-new-cat-name');
  const nameInput = document.getElementById('qc-modal-name');
  const rangeInput = document.getElementById('qc-modal-range');
  const saveBtn = document.getElementById('qc-modal-save');

  function refresh() {
    const usingNew = catSelect.value === '__new__';
    newCatRow.style.display = usingNew ? '' : 'none';
    const catOk = usingNew ? !!newCatInput.value.trim() : true;
    saveBtn.disabled = !nameInput.value.trim() || !rangeInput.value.trim() || !catOk;
  }
  catSelect.addEventListener('change', refresh);
  newCatInput.addEventListener('input', refresh);
  nameInput.addEventListener('input', refresh);
  rangeInput.addEventListener('input', refresh);
  refresh();

  document.getElementById('qc-modal-cancel').addEventListener('click', closeDialog);
  saveBtn.addEventListener('click', () => {
    let cat;
    if (catSelect.value === '__new__') {
      cat = { id: newQcId('qc-cat'), name: newCatInput.value.trim(), criteria: [] };
      qc.categories.push(cat);
    } else {
      cat = qc.categories.find((c) => c.id === catSelect.value);
    }
    cat.criteria.push({
      id: newQcId('qc-crit'),
      name: nameInput.value.trim(),
      range: rangeInput.value.trim(),
      percentage: Number(document.getElementById('qc-modal-percentage').value) || 0,
    });
    persistQc();
    closeDialog();
    renderCategories();
    refreshTotalBadge();
  });
}

/* ---- AI: Generate Qualification Criteria (global pattern: confirm -> apply -> ribbon -> Undo) ---- */

const QC_GENERATED_FRAMEWORK = [
  { name: 'Financial Capability', criteria: [
    { name: 'Minimum annual revenue', range: 'SAR 5M - 20M', percentage: 15 },
    { name: 'Positive financial standing (last 2 years)', range: 'Required', percentage: 10 },
  ] },
  { name: 'Compliance & Certifications', criteria: [
    { name: 'Relevant ISO certification', range: 'ISO 9001 or equivalent', percentage: 10 },
  ] },
];

function runGenerateQualificationCriteria() {
  runAiGenerate({
    confirmMessage: 'Would you like AI to generate a qualification criteria framework using the information already provided in your RFP?',
    ribbonMountId: 'ribbon-qc-section',
    undoMountId: 'undo-qc-section',
    hasWork: () => QC_GENERATED_FRAMEWORK.some((f) => !qc.categories.some((c) => c.name === f.name)),
    emptyMessage: 'The suggested qualification framework categories are already present.',
    performApply: () => {
      const addedCatIds = [];
      QC_GENERATED_FRAMEWORK.forEach((f) => {
        if (qc.categories.some((c) => c.name === f.name)) return;
        const cat = { id: newQcId('qc-cat'), name: f.name, criteria: f.criteria.map((c) => ({ id: newQcId('qc-crit'), ...c })) };
        qc.categories.push(cat);
        addedCatIds.push(cat.id);
      });
      persistQc();
      renderCategories();
      refreshTotalBadge();
      return () => {
        qc.categories = qc.categories.filter((c) => !addedCatIds.includes(c.id));
        persistQc();
        renderCategories();
        refreshTotalBadge();
      };
    },
  });
}

/* ---- AI: Review weightage (flags issues + suggests an even redistribution) ---- */

function runReviewWeightage() {
  runAiGenerate({
    confirmMessage: 'Would you like AI to review the weightage of your qualification criteria and suggest an alternative distribution?',
    ribbonMountId: 'ribbon-qc-section',
    undoMountId: 'undo-qc-section',
    hasWork: () => qcAllCriteria().length > 0,
    emptyMessage: 'Add at least one criterion before reviewing weightage.',
    performApply: () => {
      const before = JSON.stringify(qc.categories);
      const all = qcAllCriteria();
      const even = Math.floor((100 / all.length) * 100) / 100;
      const remainder = Math.round((100 - even * all.length) * 100) / 100;
      all.forEach((c, i) => {
        c.percentage = i === all.length - 1 ? Math.round((even + remainder) * 100) / 100 : even;
      });
      persistQc();
      renderCategories();
      refreshTotalBadge();
      return () => {
        qc.categories = JSON.parse(before);
        persistQc();
        renderCategories();
        refreshTotalBadge();
      };
    },
  });
}

/* ---- AI: Check qualification criteria (read-only "AI Insight" analysis) ---- */

function runCheckQualificationCriteria() {
  const all = qcAllCriteria();
  const insights = [];

  const seen = new Map();
  all.forEach((c) => {
    const key = (c.name || '').trim().toLowerCase();
    if (!key) return;
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  seen.forEach((count, key) => {
    if (count > 1) insights.push(`"${key}" appears ${count} times — possible duplicate criterion.`);
  });

  all.forEach((c) => {
    if (c.name && c.name.trim().length < 6) insights.push(`"${c.name}" reads as vague or too short — consider a more specific description.`);
  });

  const presentCategories = new Set(qc.categories.map((c) => c.name));
  QC_CATEGORY_NAMES.forEach((name) => {
    if (!presentCategories.has(name)) insights.push(`No criteria found for "${name}" — consider whether this area needs coverage.`);
  });

  if (insights.length === 0) insights.push('No duplicates, ambiguous wording, or obviously missing areas were found.');

  openDialog({
    title: 'AI Insight — Qualification Criteria Check',
    bodyHtml: `
      <ul class="qc-ai-insight-list">
        ${insights.map((i) => `<li class="qc-ai-insight-item"><i class="fa-solid fa-wand-magic-sparkles"></i><span>${escapeHtmlQc(i)}</span></li>`).join('')}
      </ul>
      <div class="qc-modal-footer">
        <button class="qc-btn-save" id="qc-insight-close">Close</button>
      </div>
    `,
  });
  document.getElementById('qc-insight-close').addEventListener('click', closeDialog);
}

/* ---- Footer ---- */

function saveDraft() {
  persistQc();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  if (!qcValid()) return;
  WizardStore.setStepStatus('qualification-criteria', 'completed');
  WizardStore.setStepStatus('technical-requirements', 'current');
  window.location.href = 'wizard-technical-requirements.html';
}

/* ---- Init ---- */

async function initQc() {
  WizardStore.setStepStatus('qualification-criteria', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'qualification-criteria',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="qc-footer-back-btn" id="qc-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Attachments</span>
      </button>
    `,
  });
  document.getElementById('qc-back-btn').addEventListener('click', () => {
    window.location.href = 'wizard-attachments.html';
  });

  loadQcState();
  renderQcPage();
  updateContinueState();
}

document.addEventListener('DOMContentLoaded', initQc);
