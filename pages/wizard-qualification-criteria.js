/*
  Step 5 - Qualification Criteria controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js, ai-generate.js
  (for the shared showAiRibbon/showAiUndoButton helpers, reused directly by
  the review dialogs below), wizard-shell.js (all loaded before this file).

  Two AI touchpoints in the header, both following the app's review-modal
  pattern (per-item Accept/Decline/Edit, then Undo after applying):
  - "Generate Qualification Criteria": suggests additional categories/
    criteria in a review dialog.
  - "Review weightage": flags total/distribution/overlap issues as AI
    Insight text, plus (when applicable) a suggested redistribution shown
    as a per-criterion Accept/Decline/Edit list.
  ("Check qualification criteria" was a third touchpoint in an earlier
  pass — removed per spec.)

  Three categories (Previous Experience, Existing Contractual Obligations,
  HR) and their criteria are fixed defaults: their names can't be edited
  or deleted (`locked: true`), only their Range and Percentage — which are
  RFP-specific — stay editable. Categories/criteria added afterward are
  fully editable and deletable, added directly as new rows (no modal), per
  spec's "whenever a new criterion is added, don't open as a modal."

  STUB (business rule): once supplier evaluation begins, qualification
  criteria/weightage should become read-only and every change here should
  be retained in the RFP's version/audit history. Neither an evaluation
  stage nor a version/audit history concept exists yet in this prototype —
  this is a placeholder note for when they're built, not an enforced lock.
*/

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
      id: newQcId('qc-cat'), name: 'Previous Experience', locked: true, criteria: [
        { id: newQcId('qc-crit'), name: 'Number of years of experience', locked: true, range: '', percentage: '' },
        { id: newQcId('qc-crit'), name: 'Number of projects implemented during the last three years', locked: true, range: '', percentage: '' },
        { id: newQcId('qc-crit'), name: 'Total value of projects during the last three years', locked: true, range: '', percentage: '' },
      ],
    },
    {
      id: newQcId('qc-cat'), name: 'Existing Contractual Obligations', locked: true, criteria: [
        { id: newQcId('qc-crit'), name: 'Number of existing projects', locked: true, range: '', percentage: '' },
        { id: newQcId('qc-crit'), name: 'The value of existing projects', locked: true, range: '', percentage: '' },
      ],
    },
    {
      id: newQcId('qc-cat'), name: 'HR', locked: true, criteria: [
        { id: newQcId('qc-crit'), name: 'Number of Employees', locked: true, range: '', percentage: '' },
        { id: newQcId('qc-crit'), name: 'Percentage of Saudi employees', locked: true, range: '', percentage: '' },
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

function findCriterion(id) {
  for (const cat of qc.categories) {
    const crit = cat.criteria.find((c) => c.id === id);
    if (crit) return { cat, crit };
  }
  return null;
}

/* ---- Rendering ---- */

function renderQcPage() {
  const mount = document.getElementById('wizard-step-content');

  mount.innerHTML = `
    <div class="qc-header-card">
      <div class="qc-header-top">
        <div>
          <div class="qc-header-title">Qualification Criteria</div>
          <div class="qc-header-sub">Fill in the range and percentage for each criterion.</div>
        </div>
        <div class="qc-header-total-badge" id="qc-header-total-badge">0% total</div>
      </div>
      <div class="qc-header-actions-row">
        <div class="aig-toolbar-row">
          <button type="button" class="qc-ai-outline-btn" id="qc-generate-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate Qualification Criteria</button>
          <button type="button" class="qc-ai-outline-btn" id="qc-review-weightage-btn"><i class="fa-solid fa-scale-balanced"></i> Review weightage</button>
          <button type="button" class="aig-undo-btn" id="undo-qc-section"></button>
          <div class="aig-ribbon" id="ribbon-qc-section"></div>
        </div>
        <button type="button" class="qc-btn-primary" id="qc-add-criterion-btn"><i class="fa-solid fa-plus"></i> Add Category</button>
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

  document.getElementById('qc-add-criterion-btn').addEventListener('click', addCategory);
  document.getElementById('qc-generate-btn').addEventListener('click', runGenerateQualificationCriteria);
  document.getElementById('qc-review-weightage-btn').addEventListener('click', runReviewWeightage);

  const passingInput = document.getElementById('qc-passing-input');
  passingInput.addEventListener('input', (e) => {
    qc.passingPercent = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    persistQc();
  });

  renderCategories();
  refreshQcSummaries();
}

// Single call site for every place that used to call renderTotalSummary()/
// renderInsightStats() separately, now that there's a third summary
// surface (the header's top-right total badge) to keep in sync too.
function refreshQcSummaries() {
  renderTotalSummary();
  renderInsightStats();
  updateHeaderTotalBadge();
}

function updateHeaderTotalBadge() {
  const el = document.getElementById('qc-header-total-badge');
  if (!el) return;
  const state = qcTotalState();
  el.className = `qc-header-total-badge state-${state}`;
  el.textContent = `${qcTotal()}% total`;
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
        <p>Click Add Category, or Generate Qualification Criteria.</p>
      </div>
    `;
    return;
  }

  mount.innerHTML = qc.categories.map((cat) => {
    const subtotal = Math.round(cat.criteria.reduce((s, c) => s + (Number(c.percentage) || 0), 0) * 100) / 100;
    const collapsed = qc.collapsedCategories.has(cat.id);
    return `
      <div class="qc-category-card${collapsed ? ' collapsed' : ''}" data-cat-id="${cat.id}">
        <div class="qc-category-header" data-toggle-cat="${cat.id}">
          <div class="qc-category-header-left">
            <i class="fa-solid fa-chevron-down qc-category-chevron"></i>
            ${cat.locked
              ? `<span class="qc-category-title">${escapeHtmlQc(cat.name)}</span>`
              : `<input type="text" class="qc-category-title-input" data-cat-name="${cat.id}" value="${escapeHtmlQc(cat.name)}" placeholder="Category name">`
            }
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
          <button type="button" class="qc-add-criterion-link" data-add-to-cat="${cat.id}"><i class="fa-solid fa-plus"></i> Add criterion to ${escapeHtmlQc(cat.name || 'this category')}</button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-toggle-cat]').forEach((header) => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('[data-cat-name]')) return; // editing the name shouldn't toggle collapse
      const id = header.dataset.toggleCat;
      if (qc.collapsedCategories.has(id)) qc.collapsedCategories.delete(id);
      else qc.collapsedCategories.add(id);
      header.closest('.qc-category-card').classList.toggle('collapsed');
    });
  });

  document.querySelectorAll('[data-cat-name]').forEach((input) => {
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('input', (e) => {
      const cat = qc.categories.find((c) => c.id === input.dataset.catName);
      if (cat) { cat.name = e.target.value; persistQc(); }
    });
  });

  document.querySelectorAll('[data-add-to-cat]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addCriterionToCategory(btn.dataset.addToCat);
    });
  });

  wireCategoryTableEvents();
}

function qcColumns() {
  return [
    {
      key: 'name', label: 'Criteria', render: (r) => r.locked
        ? `<span class="qc-cell-locked-text">${escapeHtmlQc(r.name)}</span>`
        : `<input type="text" class="qc-cell-input" data-field="name" data-id="${r.id}" value="${escapeHtmlQc(r.name)}" placeholder="Criterion name">`,
    },
    { key: 'range', label: 'Range / Requirement', render: (r) => `<input type="text" class="qc-cell-input${!r.range ? ' has-error' : ''}" data-field="range" data-id="${r.id}" value="${escapeHtmlQc(r.range || '')}" placeholder="Enter qualifying range">` },
    { key: 'percentage', label: 'Percentage (%)', render: (r) => `<input type="number" min="0" max="100" class="qc-cell-input" data-field="percentage" data-id="${r.id}" placeholder="0" value="${r.percentage ?? ''}">` },
    {
      key: 'actions', label: 'Actions', render: (r) => `
        <div class="row-actions">
          <button class="row-action" data-action="duplicate" data-id="${r.id}" title="Duplicate"><i class="fa-regular fa-copy"></i></button>
          <button class="row-action row-action-delete" data-action="delete" data-id="${r.id}" title="${r.locked ? 'This default criterion cannot be deleted' : 'Delete'}" ${r.locked ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
        </div>
      `,
    },
  ];
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
      refreshQcSummaries();
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
          refreshQcSummaries();
        }
        return;
      }

      const delBtn = e.target.closest('[data-action="delete"]');
      if (!delBtn) return;
      const found = findCriterion(delBtn.dataset.id);
      if (!found || found.crit.locked) return; // default criteria can't be deleted
      found.cat.criteria = found.cat.criteria.filter((c) => c.id !== delBtn.dataset.id);
      persistQc();
      renderCategories();
      refreshQcSummaries();
    });
  });
}

/* ---- Add Category / Add Criterion (direct — no modal, per spec) ---- */

function addCategory() {
  const cat = { id: newQcId('qc-cat'), name: '', locked: false, criteria: [] };
  qc.categories.push(cat);
  persistQc();
  renderCategories();
  refreshQcSummaries();
  document.querySelector(`[data-cat-name="${cat.id}"]`)?.focus();
}

function addCriterionToCategory(categoryId) {
  const cat = qc.categories.find((c) => c.id === categoryId);
  if (!cat) return;
  const crit = { id: newQcId('qc-crit'), name: '', range: '', percentage: '', locked: false };
  cat.criteria.push(crit);
  persistQc();
  renderCategories();
  refreshQcSummaries();
  document.querySelector(`.qc-category-card[data-cat-id="${cat.id}"] [data-field="name"][data-id="${crit.id}"]`)?.focus();
}

/* ---- AI 1: Generate Qualification Criteria (review dialog, Accept/Decline/Edit) ---- */

const QC_GENERATED_FRAMEWORK = [
  { name: 'Financial Capacity', criteria: [
    { name: 'Minimum annual revenue', range: 'SAR 5M - 20M', percentage: 15 },
    { name: 'Positive financial standing (last 2 years)', range: 'Required', percentage: 10 },
  ] },
  { name: 'Certifications & Compliance', criteria: [
    { name: 'Relevant ISO certification', range: 'ISO 9001 or equivalent', percentage: 10 },
  ] },
];

function runGenerateQualificationCriteria() {
  const items = QC_GENERATED_FRAMEWORK.flatMap((f) => f.criteria.map((c) => ({
    key: newQcId('sugg'),
    categoryName: f.name,
    name: c.name,
    range: c.range,
    percentage: c.percentage,
    status: 'approved', // 'approved' | 'rejected'
    editing: false,
  }))).filter((it) => {
    // Skip suggestions that already exist under that category by name, so
    // re-running this after a previous accept doesn't re-offer the same
    // criteria.
    const cat = qc.categories.find((c) => c.name === it.categoryName);
    return !cat || !cat.criteria.some((c) => (c.name || '').trim().toLowerCase() === it.name.toLowerCase());
  });

  if (items.length === 0) {
    showAiRibbon('ribbon-qc-section', 'Nothing new to suggest — your framework already covers these areas.', false);
    return;
  }

  openDialog({ title: 'Generate Qualification Criteria — Review Suggestions', size: 'large', bodyHtml: buildQcGenerateReviewHtml(items) });
  wireQcGenerateDialog(items);
}

function buildQcGenerateReviewHtml(items) {
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  return `
    <p class="qc-review-subtext">Review each suggested criterion below, then approve, edit, or decline it before applying.</p>
    <div class="qc-review-toolbar">
      <span class="qc-review-count" id="qc-generate-count">${approvedCount} of ${items.length} approved</span>
      <div class="qc-review-bulk-actions">
        <button type="button" class="qc-review-bulk-btn" id="qc-generate-approve-all">Approve all</button>
        <button type="button" class="qc-review-bulk-btn" id="qc-generate-reject-all">Decline all</button>
      </div>
    </div>
    <div class="qc-review-groups" id="qc-generate-groups">${buildQcGenerateGroupsHtml(items)}</div>
    <div class="qc-modal-footer">
      <button class="qc-btn-cancel" id="qc-generate-cancel">Cancel</button>
      <button class="qc-btn-save" id="qc-generate-apply" ${approvedCount === 0 ? 'disabled' : ''}>Apply approved (<span id="qc-generate-apply-count">${approvedCount}</span>)</button>
    </div>
  `;
}

function buildQcGenerateGroupsHtml(items) {
  const names = [...new Set(items.map((i) => i.categoryName))];
  return names.map((name) => `
    <div class="qc-review-group">
      <div class="qc-review-group-title">${escapeHtmlQc(name)}</div>
      ${items.filter((i) => i.categoryName === name).map((it) => buildQcGenerateItemHtml(it)).join('')}
    </div>
  `).join('');
}

function buildQcGenerateItemHtml(it) {
  return `
    <div class="qc-review-item status-${it.status}" data-key="${it.key}">
      <div class="qc-review-item-header">
        <span class="qc-review-item-label">${escapeHtmlQc(it.name)}</span>
        <div class="qc-review-item-actions">
          <button type="button" class="qc-review-item-btn approve${it.status === 'approved' && !it.editing ? ' active' : ''}" data-act="approve" data-key="${it.key}"><i class="fa-solid fa-check"></i> Approve</button>
          <button type="button" class="qc-review-item-btn edit${it.editing ? ' active' : ''}" data-act="edit" data-key="${it.key}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button type="button" class="qc-review-item-btn reject${it.status === 'rejected' ? ' active' : ''}" data-act="reject" data-key="${it.key}"><i class="fa-solid fa-xmark"></i> Decline</button>
        </div>
      </div>
      ${it.editing ? `
        <div class="qc-review-edit-row">
          <input type="text" class="qc-review-edit-input" data-edit-field="name" data-key="${it.key}" value="${escapeHtmlQc(it.name)}" placeholder="Criteria name">
          <input type="text" class="qc-review-edit-input" data-edit-field="range" data-key="${it.key}" value="${escapeHtmlQc(it.range)}" placeholder="Range">
          <input type="number" min="0" max="100" class="qc-review-edit-input qc-review-edit-pct" data-edit-field="percentage" data-key="${it.key}" value="${it.percentage}">
        </div>
      ` : `<div class="qc-review-item-text">${escapeHtmlQc(it.range)} · ${it.percentage}%</div>`}
    </div>
  `;
}

function wireQcGenerateDialog(items) {
  const findItem = (key) => items.find((i) => i.key === key);

  function wireEditInputs() {
    document.querySelectorAll('[data-edit-field]').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const it = findItem(inp.dataset.key);
        if (!it) return;
        it[inp.dataset.editField] = inp.dataset.editField === 'percentage' ? (Number(e.target.value) || 0) : e.target.value;
      });
    });
  }

  function rerender() {
    document.getElementById('qc-generate-groups').innerHTML = buildQcGenerateGroupsHtml(items);
    const approvedCount = items.filter((i) => i.status === 'approved').length;
    document.getElementById('qc-generate-count').textContent = `${approvedCount} of ${items.length} approved`;
    document.getElementById('qc-generate-apply-count').textContent = approvedCount;
    document.getElementById('qc-generate-apply').disabled = approvedCount === 0;
    wireEditInputs();
  }

  document.getElementById('qc-generate-groups').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const it = findItem(btn.dataset.key);
    if (!it) return;
    if (btn.dataset.act === 'approve') { it.status = 'approved'; it.editing = false; }
    else if (btn.dataset.act === 'reject') { it.status = 'rejected'; it.editing = false; }
    else if (btn.dataset.act === 'edit') { it.editing = !it.editing; if (it.editing) it.status = 'approved'; }
    rerender();
  });

  document.getElementById('qc-generate-approve-all').addEventListener('click', () => {
    items.forEach((i) => { i.status = 'approved'; i.editing = false; });
    rerender();
  });
  document.getElementById('qc-generate-reject-all').addEventListener('click', () => {
    items.forEach((i) => { i.status = 'rejected'; i.editing = false; });
    rerender();
  });

  document.getElementById('qc-generate-cancel').addEventListener('click', closeDialog);
  document.getElementById('qc-generate-apply').addEventListener('click', () => {
    const approved = items.filter((i) => i.status === 'approved');
    if (approved.length === 0) return;

    const addedCategoryIds = [];
    const addedCriterionIds = [];
    approved.forEach((it) => {
      let cat = qc.categories.find((c) => c.name === it.categoryName);
      if (!cat) {
        cat = { id: newQcId('qc-cat'), name: it.categoryName, criteria: [] };
        qc.categories.push(cat);
        addedCategoryIds.push(cat.id);
      }
      const critId = newQcId('qc-crit');
      cat.criteria.push({ id: critId, name: it.name, range: it.range, percentage: it.percentage });
      addedCriterionIds.push(critId);
    });

    persistQc();
    closeDialog();
    renderCategories();
    refreshQcSummaries();
    showAiRibbon('ribbon-qc-section', 'Data updated successfully', true);
    showAiUndoButton('undo-qc-section', () => {
      qc.categories = qc.categories.filter((c) => !addedCategoryIds.includes(c.id));
      qc.categories.forEach((c) => { c.criteria = c.criteria.filter((cr) => !addedCriterionIds.includes(cr.id)); });
      persistQc();
      renderCategories();
      refreshQcSummaries();
      hideAiRibbon('ribbon-qc-section');
      hideAiUndoButton('undo-qc-section');
    });
    showToast(`${approved.length} criterion${approved.length > 1 ? 's' : ''} added from AI suggestions.`);
  });

  wireEditInputs();
}

/* ---- AI 2: Review weightage (AI Insight text + optional redistribution review) ---- */

function computeWeightageInsights() {
  const all = qcAllCriteria();
  const insights = [];
  const total = qcTotal();

  if (total !== 100) {
    insights.push(total > 100
      ? `Total weightage is ${total}%, which exceeds 100% — reduce some percentages.`
      : `Total weightage is ${total}%, short of 100% — increase some percentages or add more criteria.`);
  }

  all.forEach((c) => {
    const pct = Number(c.percentage) || 0;
    if (total > 0 && pct >= 40) insights.push(`"${c.name || 'Untitled criterion'}" alone carries ${pct}% of the total weight — consider spreading this across more criteria.`);
  });

  // Overlaps: criteria in different categories sharing a significant word
  // (a rough proxy for "these might be assessing the same thing twice").
  const STOP_WORDS = new Set(['years', 'number', 'staff', 'projects', 'required', 'minimum', 'relevant']);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]; const b = all[j];
      const catA = qc.categories.find((c) => c.criteria.includes(a));
      const catB = qc.categories.find((c) => c.criteria.includes(b));
      if (!catA || !catB || catA === catB) continue;
      const wordsA = (a.name || '').toLowerCase().split(/\s+/).filter((w) => w.length > 4 && !STOP_WORDS.has(w));
      const wordsB = (b.name || '').toLowerCase().split(/\s+/).filter((w) => w.length > 4 && !STOP_WORDS.has(w));
      const shared = wordsA.find((w) => wordsB.includes(w));
      if (shared) insights.push(`"${a.name}" (${catA.name}) and "${b.name}" (${catB.name}) may overlap — both reference "${shared}".`);
    }
  }

  if (insights.length === 0) insights.push('No weightage, distribution, or overlap issues were found.');
  return insights;
}

function buildWeightageRedistributionItems() {
  const all = qcAllCriteria();
  if (all.length === 0) return [];
  const even = Math.floor((100 / all.length) * 100) / 100;
  const remainder = Math.round((100 - even * all.length) * 100) / 100;
  return all.map((c, i) => ({
    id: c.id,
    label: c.name || 'Untitled criterion',
    currentPct: Number(c.percentage) || 0,
    suggestedPct: i === all.length - 1 ? Math.round((even + remainder) * 100) / 100 : even,
    status: 'approved',
    editing: false,
    editValue: null,
  })).filter((it) => it.suggestedPct !== it.currentPct);
}

function runReviewWeightage() {
  const insights = computeWeightageInsights();
  const items = buildWeightageRedistributionItems();
  openDialog({ title: 'Review weightage', size: 'large', bodyHtml: buildWeightageReviewHtml(insights, items) });
  wireWeightageReviewDialog(items);
}

function buildWeightageReviewHtml(insights, items) {
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  return `
    <div class="qc-ai-insight-list">
      ${insights.map((i) => `<div class="qc-ai-insight-item"><i class="fa-solid fa-wand-magic-sparkles"></i><span>${escapeHtmlQc(i)}</span></div>`).join('')}
    </div>
    ${items.length > 0 ? `
      <p class="qc-review-subtext">Suggested redistribution — review each change, then approve, edit, or decline it before applying.</p>
      <div class="qc-review-toolbar">
        <span class="qc-review-count" id="qc-weightage-count">${approvedCount} of ${items.length} approved</span>
      </div>
      <div class="qc-review-groups" id="qc-weightage-review-list">${buildWeightageReviewRows(items)}</div>
      <div class="qc-modal-footer">
        <button class="qc-btn-cancel" id="qc-weightage-cancel">Cancel</button>
        <button class="qc-btn-save" id="qc-weightage-apply" ${approvedCount === 0 ? 'disabled' : ''}>Apply approved (<span id="qc-weightage-apply-count">${approvedCount}</span>)</button>
      </div>
    ` : `
      <div class="qc-modal-footer">
        <button class="qc-btn-cancel" id="qc-weightage-close">Close</button>
      </div>
    `}
  `;
}

function buildWeightageReviewRows(items) {
  return items.map((it) => `
    <div class="qc-review-item status-${it.status}" data-key="${it.id}">
      <div class="qc-review-item-header">
        <span class="qc-review-item-label">${escapeHtmlQc(it.label)}</span>
        <div class="qc-review-item-actions">
          <button type="button" class="qc-review-item-btn approve${it.status === 'approved' && !it.editing ? ' active' : ''}" data-act="approve" data-key="${it.id}"><i class="fa-solid fa-check"></i> Approve</button>
          <button type="button" class="qc-review-item-btn edit${it.editing ? ' active' : ''}" data-act="edit" data-key="${it.id}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button type="button" class="qc-review-item-btn reject${it.status === 'rejected' ? ' active' : ''}" data-act="reject" data-key="${it.id}"><i class="fa-solid fa-xmark"></i> Decline</button>
        </div>
      </div>
      ${it.editing
        ? `<div class="qc-review-item-text">Current: ${it.currentPct}% &rarr; <input type="number" min="0" max="100" class="qc-review-edit-input qc-review-edit-pct" data-edit-key="${it.id}" value="${it.editValue ?? it.suggestedPct}">%</div>`
        : `<div class="qc-review-item-text">Current: ${it.currentPct}% &rarr; Suggested: ${it.suggestedPct}%</div>`
      }
    </div>
  `).join('');
}

function wireWeightageReviewDialog(items) {
  const findItem = (id) => items.find((i) => i.id === id);

  function wireEditInputs() {
    document.querySelectorAll('[data-edit-key]').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const it = findItem(inp.dataset.editKey);
        if (it) it.editValue = e.target.value === '' ? null : Number(e.target.value);
      });
    });
  }

  function rerender() {
    const list = document.getElementById('qc-weightage-review-list');
    if (!list) return;
    list.innerHTML = buildWeightageReviewRows(items);
    const count = items.filter((i) => i.status === 'approved').length;
    document.getElementById('qc-weightage-count').textContent = `${count} of ${items.length} approved`;
    document.getElementById('qc-weightage-apply-count').textContent = count;
    document.getElementById('qc-weightage-apply').disabled = count === 0;
    wireEditInputs();
  }

  document.getElementById('qc-weightage-review-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const it = findItem(btn.dataset.key);
    if (!it) return;
    if (btn.dataset.act === 'approve') { it.status = 'approved'; it.editing = false; }
    else if (btn.dataset.act === 'reject') { it.status = 'rejected'; it.editing = false; }
    else if (btn.dataset.act === 'edit') { it.editing = !it.editing; if (it.editing) it.status = 'approved'; }
    rerender();
  });

  document.getElementById('qc-weightage-cancel')?.addEventListener('click', closeDialog);
  document.getElementById('qc-weightage-close')?.addEventListener('click', closeDialog);
  document.getElementById('qc-weightage-apply')?.addEventListener('click', () => {
    const approved = items.filter((i) => i.status === 'approved');
    if (approved.length === 0) return;
    const before = JSON.stringify(qc.categories);
    approved.forEach((it) => {
      const found = findCriterion(it.id);
      if (found) found.crit.percentage = it.editValue != null ? it.editValue : it.suggestedPct;
    });
    persistQc();
    closeDialog();
    renderCategories();
    refreshQcSummaries();
    showAiRibbon('ribbon-qc-section', 'Weightage updated successfully', true);
    showAiUndoButton('undo-qc-section', () => {
      qc.categories = JSON.parse(before);
      persistQc();
      renderCategories();
      refreshQcSummaries();
      hideAiRibbon('ribbon-qc-section');
      hideAiUndoButton('undo-qc-section');
    });
    showToast(`${approved.length} criterion weight${approved.length > 1 ? 's' : ''} updated.`);
  });

  wireEditInputs();
}

/* ---- Footer ---- */

function saveDraft() {
  persistQc();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  if (!qcValid()) return;
  WizardStore.setStepStatus('qualification-criteria', 'completed');
  const next = wizardNextStep('qualification-criteria');
  if (!next) return;
  WizardStore.setStepStatus(next.id, 'current');
  window.location.href = next.href;
}

/* ---- Init ---- */

async function initQc() {
  WizardStore.setStepStatus('qualification-criteria', 'current');

  const prev = wizardPrevStep('qualification-criteria');
  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'qualification-criteria',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="qc-footer-back-btn" id="qc-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${prev.title}</span>
      </button>
    `,
  });
  document.getElementById('qc-back-btn').addEventListener('click', () => {
    window.location.href = prev.href;
  });

  loadQcState();
  renderQcPage();
  updateContinueState();
}

document.addEventListener('DOMContentLoaded', initQc);
