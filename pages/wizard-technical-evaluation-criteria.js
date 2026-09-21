/*
  Step 7 - Technical Evaluation Criteria controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js, ai-generate.js
  (for the shared showAiRibbon/showAiUndoButton ribbon+Undo helpers),
  wizard-shell.js (all loaded before this file).

  Flat structure: a single table of criteria, no per-BOQ-item
  segmentation, no "Applies To" column, no "Define new segment" — an
  earlier build had that per-item segmentation and it's been cut from the
  spec entirely, not just hidden.
*/

function newTecId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtmlTec(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const tec = {
  criteria: [],
  passingPercent: '',
  rfpFd: {},
};

/* ---- Persistence ---- */

function loadTecState() {
  const fd = WizardStore.getFormData();
  tec.rfpFd = fd;
  tec.criteria = fd.technicalEvaluationCriteria || seedTecCriteria();
  tec.passingPercent = fd.technicalEvaluationPassingPercent ?? '';
}

function persistTec() {
  WizardStore.updateFormData({
    technicalEvaluationCriteria: tec.criteria,
    technicalEvaluationPassingPercent: tec.passingPercent,
  });
  updateTecContinueState();
}

function seedTecCriteria() {
  return [
    { id: newTecId('tec-crit'), description: 'Solution & Implementation Approach', howApplied: 'Scored 0-10 based on documented methodology and depth of detail.', weightage: 25 },
    { id: newTecId('tec-crit'), description: 'Relevant SAP S/4HANA Experience', howApplied: 'Scored 0-10 based on past project references and domain expertise.', weightage: 20 },
  ];
}

/* ---- Totals / validation ---- */

function tecTotal() {
  return Math.round(tec.criteria.reduce((s, c) => s + (Number(c.weightage) || 0), 0) * 100) / 100;
}

function tecTotalState() {
  const total = tecTotal();
  if (total > 100) return 'error';
  if (total === 100) return 'success';
  return 'warning';
}

function tecCriteriaValid() {
  return tec.criteria.length > 0 && tec.criteria.every((c) =>
    c.description && c.description.trim() && c.howApplied && c.howApplied.trim() && c.weightage !== '' && c.weightage !== null
  );
}

function tecPassingValid() {
  return tec.passingPercent !== '' && Number(tec.passingPercent) >= 0 && Number(tec.passingPercent) <= 100;
}

function tecValid() {
  return tecCriteriaValid() && tecTotal() === 100 && tecPassingValid();
}

function updateTecContinueState() {
  setWizardContinueEnabled(tecValid());
}

/* ---- Rendering ---- */

function renderTecPage() {
  const mount = document.getElementById('wizard-step-content');

  mount.innerHTML = `
    <div class="tec-header-card">
      <div>
        <div class="tec-header-title">Technical Evaluation Criteria</div>
        <div class="tec-header-sub">Define how technical submissions will be evaluated and weighted.</div>
      </div>
      <div class="tec-header-right">
        <span class="tec-total-badge state-${tecTotalState()}" id="tec-total-badge">${tecTotal()}% total</span>
        <div class="aig-toolbar-row">
          <button type="button" class="tec-ai-btn" id="tec-generate-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
          <button type="button" class="aig-undo-btn" id="undo-tec-section"></button>
          <div class="aig-ribbon" id="ribbon-tec-section"></div>
        </div>
        <button type="button" class="tec-btn-primary" id="tec-add-criterion-btn"><i class="fa-solid fa-plus"></i> Add Criterion</button>
      </div>
    </div>

    <div class="tec-section-card" id="tec-section-card"></div>

    <div class="tec-passing-card">
      <div>
        <div class="tec-passing-label">Technical Evaluation Passing %</div>
        <div class="tec-passing-desc">Minimum technical score a vendor must reach to be considered.</div>
      </div>
      <div class="tec-passing-input-wrap">
        <input type="number" min="0" max="100" id="tec-passing-input" value="${tec.passingPercent}">
        <span>%</span>
      </div>
    </div>
  `;

  document.getElementById('tec-add-criterion-btn').addEventListener('click', addCriterion);
  document.getElementById('tec-generate-btn').addEventListener('click', runGenerateEvaluationCriteria);

  const passingInput = document.getElementById('tec-passing-input');
  passingInput.addEventListener('input', (e) => {
    tec.passingPercent = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    persistTec();
  });

  renderTecTable();
}

function refreshTecTotalBadge() {
  const badge = document.getElementById('tec-total-badge');
  if (!badge) return;
  badge.textContent = `${tecTotal()}% total`;
  badge.className = `tec-total-badge state-${tecTotalState()}`;
}

function renderTecTable() {
  const card = document.getElementById('tec-section-card');
  if (tec.criteria.length === 0) {
    card.innerHTML = `
      <div class="tec-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No evaluation criteria yet</h3>
        <p>Click Add Criterion, or Generate with AI.</p>
      </div>
    `;
    return;
  }

  card.innerHTML = `
    ${buildTableHtml({
      columns: tecColumns(),
      rows: tec.criteria,
      rowKey: (r) => r.id,
      resizable: true,
      tableId: 'tec-criteria-table',
      columnWidths: tec.columnWidths || (tec.columnWidths = {}),
    })}
    <button type="button" class="tec-add-criterion-link" id="tec-add-criterion-link"><i class="fa-solid fa-plus"></i> Add Criterion</button>
  `;

  document.getElementById('tec-add-criterion-link').addEventListener('click', addCriterion);
  wireTecTable();
  enableColumnResize('tec-criteria-table', tec.columnWidths);
  autoGrowTecTextareas();
}

// Rows must never force-crop typed content, so every description/how-applied
// textarea grows to fit its value both on initial render (pre-filled/seeded
// content) and reactively as the user types.
function autoGrowTecTextareas() {
  document.querySelectorAll('#tec-section-card .tec-cell-textarea').forEach((el) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  });
}

function tecColumns() {
  return [
    { key: 'sl', label: 'SL No.', render: (r) => String(tec.criteria.indexOf(r) + 1) },
    {
      key: 'description', label: 'Description', render: (r) => `
        <textarea class="tec-cell-textarea${!r.description || !r.description.trim() ? ' has-error' : ''}" data-field="description" data-id="${r.id}" placeholder="Criterion description" rows="1">${escapeHtmlTec(r.description || '')}</textarea>
      `,
    },
    {
      key: 'howApplied', label: 'How Criteria is Applied', render: (r) => `
        <div class="tec-how-applied-cell">
          <textarea class="tec-cell-textarea${!r.howApplied || !r.howApplied.trim() ? ' has-error' : ''}" data-field="howApplied" data-id="${r.id}" placeholder="e.g. Scored 0-10 based on…" rows="1">${escapeHtmlTec(r.howApplied || '')}</textarea>
          <button type="button" class="tec-recommend-btn" data-recommend="${r.id}" title="Recommend evaluation method"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
        </div>`,
    },
    { key: 'weightage', label: 'Weightage (%)', render: (r) => `<input type="number" min="0" max="100" class="tec-cell-input" data-field="weightage" data-id="${r.id}" value="${r.weightage ?? ''}">` },
    {
      key: 'actions', label: 'Actions', render: (r) => `
        <div class="row-actions">
          <button class="row-action" data-duplicate-crit="${r.id}" title="Duplicate"><i class="fa-regular fa-copy"></i></button>
          <button class="row-action row-action-delete" data-delete-crit="${r.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      `,
    },
  ];
}

function wireTecTable() {
  const tbody = document.querySelector('#tec-section-card tbody');
  if (!tbody) return;

  tbody.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('tec-cell-input') && !el.classList.contains('tec-cell-textarea')) return;
    const crit = tec.criteria.find((c) => c.id === el.dataset.id);
    if (!crit) return;
    crit[el.dataset.field] = el.value;
    if (el.dataset.field === 'description' || el.dataset.field === 'howApplied') {
      el.classList.toggle('has-error', !el.value.trim());
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
    persistTec();
    refreshTecTotalBadge();
  });

  tbody.addEventListener('click', (e) => {
    const recBtn = e.target.closest('[data-recommend]');
    if (recBtn) { recommendEvaluationMethod(recBtn.dataset.recommend); return; }

    const dupBtn = e.target.closest('[data-duplicate-crit]');
    if (dupBtn) {
      const idx = tec.criteria.findIndex((c) => c.id === dupBtn.dataset.duplicateCrit);
      if (idx >= 0) {
        tec.criteria.splice(idx + 1, 0, { ...tec.criteria[idx], id: newTecId('tec-crit') });
        persistTec();
        renderTecTable();
        refreshTecTotalBadge();
      }
      return;
    }

    const delBtn = e.target.closest('[data-delete-crit]');
    if (delBtn) {
      tec.criteria = tec.criteria.filter((c) => c.id !== delBtn.dataset.deleteCrit);
      persistTec();
      renderTecTable();
      refreshTecTotalBadge();
    }
  });
}

function addCriterion() {
  tec.criteria.push({ id: newTecId('tec-crit'), description: '', howApplied: '', weightage: '' });
  persistTec();
  renderTecTable();
  refreshTecTotalBadge();
  document.querySelector('#tec-section-card tbody tr:last-child .tec-cell-textarea')?.focus();
}

/* ---- Recommend Evaluation Method (per-row AI action) ---- */

const TEC_METHOD_KEYWORDS = [
  { keywords: ['methodology', 'approach', 'plan'], method: 'Scored 0-10 based on documented methodology and depth of detail.' },
  { keywords: ['architecture', 'design', 'scalability', 'solution'], method: 'Scored 0-10 based on architecture soundness and scalability.' },
  { keywords: ['support', 'sla', 'response', 'knowledge transfer'], method: 'Scored 0-10 based on SLA commitments and support/knowledge-transfer coverage.' },
  { keywords: ['team', 'staff', 'resource', 'certified', 'certification'], method: 'Scored 0-10 based on proposed team qualifications and certifications.' },
  { keywords: ['migration', 'data'], method: 'Scored 0-10 based on data migration plan completeness and risk mitigation.' },
  { keywords: ['experience'], method: 'Scored 0-10 based on past project references and domain expertise.' },
  { keywords: ['risk'], method: 'Scored 0-10 based on identified risks and quality of mitigation strategies.' },
];

function recommendEvaluationMethod(critId) {
  const crit = tec.criteria.find((c) => c.id === critId);
  if (!crit) return;
  if (!crit.description || !crit.description.trim()) { showToast('Enter a description first.'); return; }
  const text = crit.description.toLowerCase();
  const match = TEC_METHOD_KEYWORDS.find((m) => m.keywords.some((k) => text.includes(k)));
  crit.howApplied = match ? match.method : 'Scored 0-10 by the evaluation committee against documented submission quality.';
  persistTec();
  renderTecTable();
  refreshTecTotalBadge();
  showToast('Evaluation method recommended.');
}

/* ---- AI: Generate with AI (review dialog, Accept/Decline/Edit, Undo after applying) ----
   Analyzes Project, BOQ Items, Item descriptions, Technical Requirements,
   Qualification Criteria, Scope of Work, and Supporting documents (per
   spec) — in this prototype that's simulated with one representative
   canned criteria set, since there's no real model call to reason over
   that context. */

const TEC_GENERATED_CRITERIA = [
  { description: 'Solution & Implementation Approach', howApplied: 'Scored 0-10 based on documented methodology, depth of detail, and fit to project scope.', weightage: 25 },
  { description: 'Relevant SAP S/4HANA Experience', howApplied: 'Scored 0-10 based on past project references and domain expertise.', weightage: 20 },
  { description: 'Project Methodology & Delivery Plan', howApplied: 'Scored 0-10 based on completeness and realism of the proposed delivery plan.', weightage: 20 },
  { description: 'Proposed Team & Certifications', howApplied: 'Scored 0-10 based on proposed team qualifications and certifications.', weightage: 15 },
  { description: 'Support & Knowledge Transfer', howApplied: 'Scored 0-10 based on post-go-live support and knowledge transfer plan.', weightage: 10 },
  { description: 'Risk Management', howApplied: 'Scored 0-10 based on identified risks and quality of mitigation strategies.', weightage: 10 },
];

function runGenerateEvaluationCriteria() {
  const existing = new Set(tec.criteria.map((c) => (c.description || '').trim().toLowerCase()));
  const items = TEC_GENERATED_CRITERIA.filter((c) => !existing.has(c.description.trim().toLowerCase())).map((c) => ({
    key: newTecId('sugg'),
    description: c.description,
    howApplied: c.howApplied,
    weightage: c.weightage,
    status: 'approved', // 'approved' | 'rejected'
    editing: false,
  }));

  if (items.length === 0) {
    showAiRibbon('ribbon-tec-section', 'Nothing new to suggest — your evaluation criteria already cover these areas.', false);
    return;
  }

  openDialog({ title: 'Generate with AI — Review Suggested Evaluation Criteria', size: 'large', bodyHtml: buildTecReviewHtml(items) });
  wireTecGenerateDialog(items);
}

function buildTecReviewHtml(items) {
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  return `
    <p class="tec-review-subtext">Review each suggested criterion below, then approve, edit, or decline it before applying.</p>
    <div class="tec-review-toolbar">
      <span class="tec-review-count" id="tec-generate-count">${approvedCount} of ${items.length} approved</span>
      <div class="tec-review-bulk-actions">
        <button type="button" class="tec-review-bulk-btn" id="tec-generate-approve-all">Approve all</button>
        <button type="button" class="tec-review-bulk-btn" id="tec-generate-reject-all">Decline all</button>
      </div>
    </div>
    <div class="tec-review-list" id="tec-generate-list">${buildTecReviewRows(items)}</div>
    <div class="tec-modal-footer" style="justify-content: space-between;">
      <button class="tec-btn-cancel" id="tec-generate-cancel">Cancel</button>
      <button class="tec-btn-save" id="tec-generate-apply" ${approvedCount === 0 ? 'disabled' : ''}>Apply approved (<span id="tec-generate-apply-count">${approvedCount}</span>)</button>
    </div>
  `;
}

function buildTecReviewRows(items) {
  return items.map((it) => `
    <div class="tec-review-item status-${it.status}" data-key="${it.key}">
      <div class="tec-review-item-header">
        <span class="tec-review-item-label">${escapeHtmlTec(it.description)}</span>
        <div class="tec-review-item-actions">
          <button type="button" class="tec-review-item-btn approve${it.status === 'approved' && !it.editing ? ' active' : ''}" data-act="approve" data-key="${it.key}"><i class="fa-solid fa-check"></i> Approve</button>
          <button type="button" class="tec-review-item-btn edit${it.editing ? ' active' : ''}" data-act="edit" data-key="${it.key}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button type="button" class="tec-review-item-btn reject${it.status === 'rejected' ? ' active' : ''}" data-act="reject" data-key="${it.key}"><i class="fa-solid fa-xmark"></i> Decline</button>
        </div>
      </div>
      ${it.editing ? `
        <div class="tec-review-edit-row">
          <input type="text" class="tec-review-edit-input" data-edit-field="description" data-key="${it.key}" value="${escapeHtmlTec(it.description)}" placeholder="Description">
          <input type="text" class="tec-review-edit-input" data-edit-field="howApplied" data-key="${it.key}" value="${escapeHtmlTec(it.howApplied)}" placeholder="How criteria is applied">
          <input type="number" min="0" max="100" class="tec-review-edit-input tec-review-edit-pct" data-edit-field="weightage" data-key="${it.key}" value="${it.weightage}">
        </div>
      ` : `<div class="tec-review-item-text">${escapeHtmlTec(it.howApplied)} · ${it.weightage}%</div>`}
    </div>
  `).join('');
}

function wireTecGenerateDialog(items) {
  const findItem = (key) => items.find((i) => i.key === key);

  function wireEditInputs() {
    document.querySelectorAll('[data-edit-field]').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const it = findItem(inp.dataset.key);
        if (!it) return;
        it[inp.dataset.editField] = inp.dataset.editField === 'weightage' ? (Number(e.target.value) || 0) : e.target.value;
      });
    });
  }

  function rerender() {
    document.getElementById('tec-generate-list').innerHTML = buildTecReviewRows(items);
    const approvedCount = items.filter((i) => i.status === 'approved').length;
    document.getElementById('tec-generate-count').textContent = `${approvedCount} of ${items.length} approved`;
    document.getElementById('tec-generate-apply-count').textContent = approvedCount;
    document.getElementById('tec-generate-apply').disabled = approvedCount === 0;
    wireEditInputs();
  }

  document.getElementById('tec-generate-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const it = findItem(btn.dataset.key);
    if (!it) return;
    if (btn.dataset.act === 'approve') { it.status = 'approved'; it.editing = false; }
    else if (btn.dataset.act === 'reject') { it.status = 'rejected'; it.editing = false; }
    else if (btn.dataset.act === 'edit') { it.editing = !it.editing; if (it.editing) it.status = 'approved'; }
    rerender();
  });

  document.getElementById('tec-generate-approve-all').addEventListener('click', () => {
    items.forEach((i) => { i.status = 'approved'; i.editing = false; });
    rerender();
  });
  document.getElementById('tec-generate-reject-all').addEventListener('click', () => {
    items.forEach((i) => { i.status = 'rejected'; i.editing = false; });
    rerender();
  });

  document.getElementById('tec-generate-cancel').addEventListener('click', closeDialog);
  document.getElementById('tec-generate-apply').addEventListener('click', () => {
    const approved = items.filter((i) => i.status === 'approved');
    if (approved.length === 0) return;

    const addedIds = approved.map((it) => {
      const id = newTecId('tec-crit');
      tec.criteria.push({ id, description: it.description, howApplied: it.howApplied, weightage: it.weightage });
      return id;
    });

    persistTec();
    closeDialog();
    renderTecTable();
    refreshTecTotalBadge();
    showAiRibbon('ribbon-tec-section', 'Data updated successfully', true);
    showAiUndoButton('undo-tec-section', () => {
      tec.criteria = tec.criteria.filter((c) => !addedIds.includes(c.id));
      persistTec();
      renderTecTable();
      refreshTecTotalBadge();
      hideAiRibbon('ribbon-tec-section');
      hideAiUndoButton('undo-tec-section');
    });
    showToast(`${approved.length} criterion${approved.length > 1 ? 's' : ''} added from AI suggestions.`);
  });

  wireEditInputs();
}

/* ---- Footer ---- */

function saveDraft() {
  persistTec();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  if (!tecValid()) return;
  WizardStore.setStepStatus('technical-evaluation-criteria', 'completed');
  const next = wizardNextStep('technical-evaluation-criteria');
  if (!next) return;
  WizardStore.setStepStatus(next.id, 'current');
  window.location.href = next.href;
}

/* ---- Init ---- */

async function initTec() {
  WizardStore.setStepStatus('technical-evaluation-criteria', 'current');

  const prev = wizardPrevStep('technical-evaluation-criteria');
  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'technical-evaluation-criteria',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="tec-footer-back-btn" id="tec-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${prev.title}</span>
      </button>
    `,
  });
  document.getElementById('tec-back-btn').addEventListener('click', () => {
    window.location.href = prev.href;
  });

  loadTecState();
  renderTecPage();
  updateTecContinueState();
}

document.addEventListener('DOMContentLoaded', initTec);
