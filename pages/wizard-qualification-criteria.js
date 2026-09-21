/*
  Step 6 - Qualification Criteria controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js, ai-generate.js
  (for the shared showAiRibbon/showAiUndoButton helpers, reused directly by
  the "Review with AI" redistribution action below), wizard-shell.js (all
  loaded before this file).

  "Generate with AI" uses the global AI pattern (confirm dialog -> apply ->
  success ribbon -> outlined Undo) via runAiGenerate(). "Review with AI"
  combines what were two separate actions (weightage review + a read-only
  duplicate/wording/coverage check) into one AI Insight dialog, since the
  reference design only calls for a single "Review with AI" entry point;
  its optional "Apply suggested redistribution" action reuses the same
  ribbon+Undo helpers directly.
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
  collapsedCategories: new Set(),
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

  mount.innerHTML = `
    <div class="qc-header-card">
      <div>
        <div class="qc-header-title">Qualification Criteria</div>
        <div class="qc-header-sub">Define the minimum requirements that participating companies must meet.</div>
      </div>
      <div class="qc-header-right">
        <div class="aig-toolbar-row">
          <button type="button" class="qc-ai-section-btn" id="qc-generate-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
          <button type="button" class="qc-ai-section-btn" id="qc-review-btn"><i class="fa-solid fa-arrows-rotate"></i> Review with AI</button>
          <button type="button" class="aig-undo-btn" id="undo-qc-section"></button>
          <div class="aig-ribbon" id="ribbon-qc-section"></div>
        </div>
        <button type="button" class="qc-btn-primary" id="qc-add-criterion-btn"><i class="fa-solid fa-plus"></i> Add Category <i class="fa-solid fa-chevron-down"></i></button>
      </div>
    </div>

    <div class="qc-insight-banner">
      <div class="qc-insight-banner-main">
        <div class="qc-insight-banner-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div>
          <div class="qc-insight-banner-title">AI Insight</div>
          <div class="qc-insight-banner-desc">Based on your RFP details, here's a suggested qualification framework. Review and adjust as needed.</div>
        </div>
      </div>
      <div class="qc-insight-stats">
        <div class="qc-insight-stat"><div class="qc-insight-stat-value" id="qc-stat-criteria">0</div><div class="qc-insight-stat-label">Criteria</div></div>
        <div class="qc-insight-stat"><div class="qc-insight-stat-value" id="qc-stat-categories">0</div><div class="qc-insight-stat-label">Categories</div></div>
        <div class="qc-insight-stat"><div class="qc-insight-stat-value" id="qc-stat-weight">0%</div><div class="qc-insight-stat-label">Weight assigned</div></div>
        <button type="button" class="qc-insight-view-btn" id="qc-view-suggestions-btn">View AI Suggestions</button>
      </div>
    </div>

    <div id="qc-categories-mount"></div>

    <div class="qc-passing-card">
      <div>
        <div class="qc-passing-label">Qualification Technical Passing % <i class="fa-regular fa-circle-question qc-passing-info-icon" title="Minimum score a vendor must reach on qualification criteria to proceed."></i></div>
      </div>
      <div style="display:flex; align-items:center; gap: var(--space-6); flex-wrap:wrap;">
        <div class="qc-passing-input-wrap">
          <input type="number" min="0" max="100" id="qc-passing-input" value="${qc.passingPercent}">
          <span>%</span>
        </div>
        <div class="qc-total-summary" id="qc-total-summary"></div>
      </div>
    </div>
  `;

  document.getElementById('qc-add-criterion-btn').addEventListener('click', () => openAddCriterionModal(null));
  document.getElementById('qc-generate-btn').addEventListener('click', runGenerateQualificationCriteria);
  document.getElementById('qc-view-suggestions-btn').addEventListener('click', runGenerateQualificationCriteria);
  document.getElementById('qc-review-btn').addEventListener('click', runReviewWithAi);

  const passingInput = document.getElementById('qc-passing-input');
  passingInput.addEventListener('input', (e) => {
    qc.passingPercent = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    persistQc();
  });

  renderCategories();
  renderTotalSummary();
  renderInsightStats();
}

function renderTotalSummary() {
  const el = document.getElementById('qc-total-summary');
  if (!el) return;
  const total = qcTotal();
  const state = qcTotalState();
  const icon = state === 'success' ? 'fa-circle-check' : state === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  const note = state === 'success'
    ? 'Weight distribution is complete.'
    : state === 'error'
      ? 'Total exceeds 100% — adjust the percentages below.'
      : `${(100 - total).toFixed(2).replace(/\.00$/, '')}% remaining to reach 100%.`;
  el.innerHTML = `
    <div class="qc-total-summary-line state-${state}"><i class="fa-solid ${icon}"></i> Total: ${total}%</div>
    <div class="qc-total-summary-note">${note}</div>
  `;
}

function renderInsightStats() {
  const criteriaEl = document.getElementById('qc-stat-criteria');
  if (!criteriaEl) return;
  criteriaEl.textContent = qcAllCriteria().length;
  document.getElementById('qc-stat-categories').textContent = qc.categories.filter((c) => c.criteria.length > 0).length;
  document.getElementById('qc-stat-weight').textContent = `${qcTotal()}%`;
}

function renderCategories() {
  const mount = document.getElementById('qc-categories-mount');
  if (qc.categories.length === 0 || qcAllCriteria().length === 0) {
    mount.innerHTML = `
      <div class="qc-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No criteria yet</h3>
        <p>Click Add Category, or Generate with AI.</p>
      </div>
    `;
    return;
  }

  mount.innerHTML = qc.categories.filter((c) => c.criteria.length > 0).map((cat) => {
    const subtotal = Math.round(cat.criteria.reduce((s, c) => s + (Number(c.percentage) || 0), 0) * 100) / 100;
    const collapsed = qc.collapsedCategories.has(cat.id);
    return `
      <div class="qc-category-card${collapsed ? ' collapsed' : ''}" data-cat-id="${cat.id}">
        <div class="qc-category-header" data-toggle-cat="${cat.id}">
          <div class="qc-category-header-left">
            <i class="fa-solid fa-chevron-down qc-category-chevron"></i>
            <span class="qc-category-title">${escapeHtmlQc(cat.name)}</span>
          </div>
          <span class="qc-category-subtotal">${subtotal}%</span>
        </div>
        <div class="qc-category-body">
          ${buildTableHtml({
            columns: qcColumns(),
            rows: cat.criteria,
            rowKey: (r) => r.id,
            emptyText: 'No criteria in this category.',
          })}
          <button type="button" class="qc-add-criterion-link" data-add-to-cat="${cat.id}"><i class="fa-solid fa-plus"></i> Add criterion to ${escapeHtmlQc(cat.name)}</button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-toggle-cat]').forEach((header) => {
    header.addEventListener('click', () => {
      const id = header.dataset.toggleCat;
      if (qc.collapsedCategories.has(id)) qc.collapsedCategories.delete(id);
      else qc.collapsedCategories.add(id);
      header.closest('.qc-category-card').classList.toggle('collapsed');
    });
  });

  document.querySelectorAll('[data-add-to-cat]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAddCriterionModal(btn.dataset.addToCat);
    });
  });

  wireCategoryTableEvents();
}

function qcColumns() {
  return [
    { key: 'name', label: 'Criteria', render: (r) => `<input type="text" class="qc-cell-input" data-field="name" data-id="${r.id}" value="${escapeHtmlQc(r.name)}" placeholder="Criterion name">` },
    { key: 'range', label: 'Range / Requirement', render: (r) => `<input type="text" class="qc-cell-input${!r.range ? ' has-error' : ''}" data-field="range" data-id="${r.id}" value="${escapeHtmlQc(r.range || '')}" placeholder="e.g. 5-10 years">` },
    { key: 'percentage', label: 'Percentage (%)', render: (r) => `<input type="number" min="0" max="100" class="qc-cell-input" data-field="percentage" data-id="${r.id}" value="${r.percentage ?? ''}">` },
    {
      key: 'actions', label: 'Actions', render: (r) => `
        <div class="row-actions">
          <button class="row-action" data-action="duplicate" data-id="${r.id}" title="Duplicate"><i class="fa-regular fa-copy"></i></button>
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
      found.crit[el.dataset.field] = el.value;
      el.classList.toggle('has-error', el.dataset.field === 'range' && !el.value.trim());
      persistQc();
      renderTotalSummary();
      renderInsightStats();
      const subtotalEl = el.closest('.qc-category-card').querySelector('.qc-category-subtotal');
      if (subtotalEl) {
        const subtotal = Math.round(found.cat.criteria.reduce((s, c) => s + (Number(c.percentage) || 0), 0) * 100) / 100;
        subtotalEl.textContent = `${subtotal}%`;
      }
    });

    tbody.addEventListener('click', (e) => {
      const dupBtn = e.target.closest('[data-action="duplicate"]');
      if (dupBtn) {
        const found = findCriterion(dupBtn.dataset.id);
        if (found) {
          const idx = found.cat.criteria.indexOf(found.crit);
          found.cat.criteria.splice(idx + 1, 0, { ...found.crit, id: newQcId('qc-crit') });
          persistQc();
          renderCategories();
          renderTotalSummary();
          renderInsightStats();
        }
        return;
      }

      const delBtn = e.target.closest('[data-action="delete"]');
      if (!delBtn) return;
      const found = findCriterion(delBtn.dataset.id);
      if (!found) return;
      found.cat.criteria = found.cat.criteria.filter((c) => c.id !== delBtn.dataset.id);
      persistQc();
      renderCategories();
      renderTotalSummary();
      renderInsightStats();
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
    renderTotalSummary();
    renderInsightStats();
  });
}

/* ---- AI: Generate with AI (global pattern: confirm -> apply -> ribbon -> Undo) ---- */

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
      renderTotalSummary();
      renderInsightStats();
      return () => {
        qc.categories = qc.categories.filter((c) => !addedCatIds.includes(c.id));
        persistQc();
        renderCategories();
        renderTotalSummary();
        renderInsightStats();
      };
    },
  });
}

/* ---- AI: Review with AI (read-only insight + optional redistribution) ---- */

function computeQcInsights() {
  const all = qcAllCriteria();
  const insights = [];

  const total = qcTotal();
  if (total !== 100) {
    insights.push(total > 100
      ? `Total weightage is ${total}%, which exceeds 100% — reduce some percentages.`
      : `Total weightage is ${total}%, short of 100% — increase some percentages or add more criteria.`);
  }

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

  if (insights.length === 0) insights.push('No weightage, duplicate, ambiguous wording, or coverage issues were found.');
  return insights;
}

function runReviewWithAi() {
  const insights = computeQcInsights();
  const canRedistribute = qcAllCriteria().length > 0;

  openDialog({
    title: 'AI Insight — Review Qualification Criteria',
    bodyHtml: `
      <ul class="qc-ai-insight-list">
        ${insights.map((i) => `<li class="qc-ai-insight-item"><i class="fa-solid fa-wand-magic-sparkles"></i><span>${escapeHtmlQc(i)}</span></li>`).join('')}
      </ul>
      <div class="qc-modal-footer">
        <button class="qc-btn-cancel" id="qc-review-close">Close</button>
        ${canRedistribute ? `<button class="qc-btn-save" id="qc-review-redistribute">Apply suggested redistribution</button>` : ''}
      </div>
    `,
  });
  document.getElementById('qc-review-close').addEventListener('click', closeDialog);
  document.getElementById('qc-review-redistribute')?.addEventListener('click', () => {
    closeDialog();
    applyEvenRedistribution();
  });
}

function applyEvenRedistribution() {
  const before = JSON.stringify(qc.categories);
  const all = qcAllCriteria();
  const even = Math.floor((100 / all.length) * 100) / 100;
  const remainder = Math.round((100 - even * all.length) * 100) / 100;
  all.forEach((c, i) => {
    c.percentage = i === all.length - 1 ? Math.round((even + remainder) * 100) / 100 : even;
  });
  persistQc();
  renderCategories();
  renderTotalSummary();
  renderInsightStats();
  showAiRibbon('ribbon-qc-section', 'Weightage redistributed evenly', true);
  showAiUndoButton('undo-qc-section', () => {
    qc.categories = JSON.parse(before);
    persistQc();
    renderCategories();
    renderTotalSummary();
    renderInsightStats();
    hideAiRibbon('ribbon-qc-section');
    hideAiUndoButton('undo-qc-section');
  });
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
