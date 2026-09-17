/*
  Step 8 - Technical Evaluation Criteria controller (final wizard step).
  Depends on: data-store.js, dialog.js, toast.js, table.js, wizard-shell.js
  (all loaded before this file).

  NOTE on the header's "0% total" badge: the source spec calls for a single
  running-total badge (same 3-state treatment as Step 6) even though the
  actual business rule is per-segment ("total weightage per segment must
  equal 100%"). With one segment the badge shows that segment's own total,
  same as Step 6; with multiple segments it shows how many segments are
  complete instead of a single misleading percentage. Each segment card
  also carries its own local total, which is what actually gates Continue.
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
  segments: [],
  passingPercent: '',
  boqItems: [],
  completed: false,
};

/* ---- Persistence ---- */

function loadTecState() {
  const fd = WizardStore.getFormData();
  tec.boqItems = fd.boqItems || [];
  tec.segments = fd.technicalEvaluationSegments || seedTecSegments();
  tec.passingPercent = fd.technicalEvaluationPassingPercent ?? '';
}

function persistTec() {
  WizardStore.updateFormData({
    technicalEvaluationSegments: tec.segments,
    technicalEvaluationPassingPercent: tec.passingPercent,
  });
  updateTecContinueState();
}

function seedTecSegments() {
  const firstItemId = tec.boqItems[0]?.id || null;
  return [
    {
      id: newTecId('tec-seg'), name: 'SAP S/4HANA Implementation',
      appliesToAll: !firstItemId, appliesToItemIds: firstItemId ? [firstItemId] : [],
      criteria: [
        { id: newTecId('tec-crit'), description: 'Implementation methodology', howApplied: 'Scored 0-10 based on documented methodology maturity.', weightage: 40 },
        { id: newTecId('tec-crit'), description: 'Solution architecture', howApplied: 'Scored 0-10 based on scalability and integration approach.', weightage: 30 },
        { id: newTecId('tec-crit'), description: 'Data migration approach', howApplied: 'Scored 0-10 based on migration plan completeness.', weightage: 30 },
      ],
    },
    {
      id: newTecId('tec-seg'), name: 'SAP AMS',
      appliesToAll: true, appliesToItemIds: [],
      criteria: [
        { id: newTecId('tec-crit'), description: 'Support methodology', howApplied: 'Scored 0-10 based on ticket triage and escalation process.', weightage: 50 },
        { id: newTecId('tec-crit'), description: 'SLA coverage', howApplied: 'Scored 0-10 based on response/resolution SLA commitments.', weightage: 50 },
      ],
    },
  ];
}

/* ---- Totals / validation ---- */

function segTotal(seg) {
  return Math.round(seg.criteria.reduce((s, c) => s + (Number(c.weightage) || 0), 0) * 100) / 100;
}

function segState(seg) {
  const total = segTotal(seg);
  if (total > 100) return 'error';
  if (total === 100) return 'success';
  return 'warning';
}

function segValid(seg) {
  return seg.criteria.length > 0 && segTotal(seg) === 100
    && seg.criteria.every((c) => c.description && c.description.trim() && c.howApplied && c.howApplied.trim() && c.weightage !== '' && c.weightage !== null);
}

function tecOverallState() {
  if (tec.segments.length === 0) return 'warning';
  const states = tec.segments.map(segState);
  if (states.includes('error')) return 'error';
  if (states.every((s) => s === 'success')) return 'success';
  return 'warning';
}

function tecOverallLabel() {
  if (tec.segments.length === 0) return '0% total';
  if (tec.segments.length === 1) return `${segTotal(tec.segments[0])}% total`;
  const complete = tec.segments.filter((s) => segState(s) === 'success').length;
  return `${complete}/${tec.segments.length} segments at 100%`;
}

function tecPassingValid() {
  return tec.passingPercent !== '' && Number(tec.passingPercent) >= 0 && Number(tec.passingPercent) <= 100;
}

function tecValid() {
  return tec.segments.length > 0 && tec.segments.every(segValid) && tecPassingValid();
}

function updateTecContinueState() {
  const btn = document.getElementById('wizard-continue-btn');
  if (btn) btn.disabled = !tecValid();
}

/* ---- Applicability helpers ---- */

function appliesToLabel(seg) {
  if (seg.appliesToAll || tec.boqItems.length === 0) return 'All Items';
  if (seg.appliesToItemIds.length === 0) return 'No items selected';
  const names = seg.appliesToItemIds.map((id) => tec.boqItems.find((it) => it.id === id)?.name).filter(Boolean);
  return names.join(', ') || 'No items selected';
}

/* ---- Rendering ---- */

function renderTecPage() {
  const mount = document.getElementById('wizard-step-content');

  if (tec.completed) {
    renderCompletionState(mount);
    return;
  }

  mount.innerHTML = `
    <div class="tec-header-card">
      <div>
        <div class="tec-header-title">Technical Evaluation Criteria</div>
        <div class="tec-header-sub">Define how technical submissions will be evaluated and weighted.</div>
      </div>
      <div class="tec-header-right">
        <span class="tec-total-badge state-${tecOverallState()}" id="tec-total-badge">${tecOverallLabel()}</span>
        <button type="button" class="tec-ai-btn" id="tec-generate-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        <button type="button" class="tec-btn-primary" id="tec-add-segment-btn"><i class="fa-solid fa-plus"></i> Add Criterion</button>
      </div>
    </div>
    <div class="aig-ribbon" id="ribbon-tec-section"></div>
    <button type="button" class="aig-undo-btn" id="undo-tec-section"></button>

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

    <div id="tec-segments-mount"></div>
  `;

  document.getElementById('tec-add-segment-btn').addEventListener('click', () => addSegment());
  document.getElementById('tec-generate-btn').addEventListener('click', runGenerateEvaluationCriteria);

  const passingInput = document.getElementById('tec-passing-input');
  passingInput.addEventListener('input', (e) => {
    tec.passingPercent = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    persistTec();
  });

  renderSegments();
}

function refreshTecTotalBadge() {
  const badge = document.getElementById('tec-total-badge');
  if (!badge) return;
  badge.textContent = tecOverallLabel();
  badge.className = `tec-total-badge state-${tecOverallState()}`;
}

function renderSegments() {
  const mount = document.getElementById('tec-segments-mount');
  if (tec.segments.length === 0) {
    mount.innerHTML = `
      <div class="tec-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No evaluation segments yet</h3>
        <p>Click Add Criterion, or Generate with AI, to define your first segment.</p>
      </div>
      <button type="button" class="tec-define-segment-btn" id="tec-define-segment-btn"><i class="fa-solid fa-plus"></i> Define new segment</button>
    `;
    document.getElementById('tec-define-segment-btn').addEventListener('click', () => addSegment());
    return;
  }

  mount.innerHTML = tec.segments.map((seg) => buildSegmentCardHtml(seg)).join('')
    + `<button type="button" class="tec-define-segment-btn" id="tec-define-segment-btn"><i class="fa-solid fa-plus"></i> Define new segment</button>`;

  document.getElementById('tec-define-segment-btn').addEventListener('click', () => addSegment());
  tec.segments.forEach((seg) => wireSegmentCard(seg));
}

function buildSegmentCardHtml(seg) {
  return `
    <div class="tec-segment-card" data-seg-id="${seg.id}">
      <div class="tec-segment-header">
        <input type="text" class="tec-segment-name-input" data-seg-name="${seg.id}" value="${escapeHtmlTec(seg.name)}" placeholder="Segment name">
        <span class="tec-segment-total state-${segState(seg)}" data-seg-total="${seg.id}">${segTotal(seg)}% of this segment</span>
      </div>

      <div class="tec-applicability">
        <div class="tec-applicability-radios">
          <label><input type="radio" name="applies-${seg.id}" data-applies-all="${seg.id}" ${seg.appliesToAll ? 'checked' : ''}> All Items</label>
          <label><input type="radio" name="applies-${seg.id}" data-applies-specific="${seg.id}" ${!seg.appliesToAll ? 'checked' : ''} ${tec.boqItems.length === 0 ? 'disabled' : ''}> Specific item(s)</label>
        </div>
        ${tec.boqItems.length === 0
          ? `<span class="tec-no-items-note">No BOQ items found in Step 2 — applies to all items by default.</span>`
          : `<div class="tec-item-checkboxes" data-item-checkboxes="${seg.id}" style="${seg.appliesToAll ? 'display:none;' : ''}">
              ${tec.boqItems.map((it) => `<label><input type="checkbox" data-item-check="${seg.id}" value="${it.id}" ${seg.appliesToItemIds.includes(it.id) ? 'checked' : ''}> ${escapeHtmlTec(it.name)}</label>`).join('')}
            </div>`
        }
      </div>

      ${buildTableHtml({
        columns: tecColumns(seg),
        rows: seg.criteria,
        rowKey: (r) => r.id,
        emptyText: 'No criteria in this segment.',
      })}
      <button type="button" class="tec-add-criterion-link" data-add-crit="${seg.id}"><i class="fa-solid fa-plus"></i> Add criterion</button>
      <div class="row-actions" style="margin-top: var(--space-2);">
        <button class="row-action row-action-delete" data-delete-segment="${seg.id}" title="Delete segment"><i class="fa-solid fa-trash"></i> Delete segment</button>
      </div>
    </div>
  `;
}

function tecColumns(seg) {
  return [
    { key: 'sl', label: 'SL No.', render: (r) => String(seg.criteria.indexOf(r) + 1) },
    { key: 'appliesTo', label: 'Applies To', cellClass: 'cell-muted', render: () => escapeHtmlTec(appliesToLabel(seg)) },
    { key: 'description', label: 'Description', render: (r) => `<input type="text" class="tec-cell-input${!r.description || !r.description.trim() ? ' has-error' : ''}" data-field="description" data-seg="${seg.id}" data-id="${r.id}" value="${escapeHtmlTec(r.description)}" placeholder="Criterion description">` },
    {
      key: 'howApplied', label: 'How Criteria is Applied', render: (r) => `
        <div class="tec-how-applied-cell">
          <input type="text" class="tec-cell-input${!r.howApplied || !r.howApplied.trim() ? ' has-error' : ''}" data-field="howApplied" data-seg="${seg.id}" data-id="${r.id}" value="${escapeHtmlTec(r.howApplied || '')}" placeholder="e.g. Scored 0-10 based on…">
          <button type="button" class="tec-recommend-btn" data-recommend="${seg.id}:${r.id}" title="Recommend evaluation method"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
        </div>`,
    },
    { key: 'weightage', label: 'Weightage (%)', render: (r) => `<input type="number" min="0" max="100" class="tec-cell-input" data-field="weightage" data-seg="${seg.id}" data-id="${r.id}" value="${r.weightage ?? ''}">` },
    {
      key: 'actions', label: 'Actions', render: (r) => `
        <div class="row-actions">
          <button class="row-action row-action-delete" data-delete-crit="${seg.id}:${r.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      `,
    },
  ];
}

function wireSegmentCard(seg) {
  const card = document.querySelector(`.tec-segment-card[data-seg-id="${seg.id}"]`);
  if (!card) return;

  card.querySelector(`[data-seg-name="${seg.id}"]`).addEventListener('input', (e) => {
    seg.name = e.target.value;
    persistTec();
  });

  card.querySelector(`[data-applies-all="${seg.id}"]`).addEventListener('change', () => {
    seg.appliesToAll = true;
    const boxes = card.querySelector(`[data-item-checkboxes="${seg.id}"]`);
    if (boxes) boxes.style.display = 'none';
    persistTec();
    refreshAppliesToCells(seg);
  });
  const specificRadio = card.querySelector(`[data-applies-specific="${seg.id}"]`);
  if (specificRadio) {
    specificRadio.addEventListener('change', () => {
      seg.appliesToAll = false;
      const boxes = card.querySelector(`[data-item-checkboxes="${seg.id}"]`);
      if (boxes) boxes.style.display = '';
      persistTec();
      refreshAppliesToCells(seg);
    });
  }
  card.querySelectorAll(`[data-item-check="${seg.id}"]`).forEach((cb) => {
    cb.addEventListener('change', () => {
      seg.appliesToItemIds = Array.from(card.querySelectorAll(`[data-item-check="${seg.id}"]:checked`)).map((c) => c.value);
      persistTec();
      refreshAppliesToCells(seg);
    });
  });

  card.querySelectorAll('.tec-cell-input').forEach((input) => {
    input.addEventListener('input', () => {
      const crit = seg.criteria.find((c) => c.id === input.dataset.id);
      if (!crit) return;
      crit[input.dataset.field] = input.value;
      input.classList.toggle('has-error', (input.dataset.field === 'description' || input.dataset.field === 'howApplied') && !input.value.trim());
      persistTec();
      refreshSegmentTotal(seg);
      refreshTecTotalBadge();
    });
  });

  card.querySelectorAll('[data-recommend]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [segId, critId] = btn.dataset.recommend.split(':');
      recommendEvaluationMethod(segId, critId);
    });
  });

  card.querySelectorAll('[data-delete-crit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [segId, critId] = btn.dataset.deleteCrit.split(':');
      const s = tec.segments.find((x) => x.id === segId);
      if (!s) return;
      s.criteria = s.criteria.filter((c) => c.id !== critId);
      persistTec();
      renderSegments();
      refreshTecTotalBadge();
    });
  });

  const addCritBtn = card.querySelector(`[data-add-crit="${seg.id}"]`);
  if (addCritBtn) {
    addCritBtn.addEventListener('click', () => {
      seg.criteria.push({ id: newTecId('tec-crit'), description: '', howApplied: '', weightage: '' });
      persistTec();
      renderSegments();
      refreshTecTotalBadge();
    });
  }

  const deleteSegBtn = card.querySelector(`[data-delete-segment="${seg.id}"]`);
  if (deleteSegBtn) {
    deleteSegBtn.addEventListener('click', () => {
      tec.segments = tec.segments.filter((s) => s.id !== seg.id);
      persistTec();
      renderSegments();
      refreshTecTotalBadge();
    });
  }
}

function refreshSegmentTotal(seg) {
  const el = document.querySelector(`[data-seg-total="${seg.id}"]`);
  if (el) {
    el.textContent = `${segTotal(seg)}% of this segment`;
    el.className = `tec-segment-total state-${segState(seg)}`;
  }
}

function refreshAppliesToCells(seg) {
  document.querySelectorAll(`.tec-segment-card[data-seg-id="${seg.id}"] tbody tr`).forEach((tr, i) => {
    const cell = tr.children[1];
    if (cell) cell.textContent = appliesToLabel(seg);
  });
}

function addSegment() {
  tec.segments.push({ id: newTecId('tec-seg'), name: 'New Segment', appliesToAll: true, appliesToItemIds: [], criteria: [] });
  persistTec();
  renderSegments();
  refreshTecTotalBadge();
}

/* ---- Recommend Evaluation Method (per-row AI action) ---- */

const TEC_METHOD_KEYWORDS = [
  { keywords: ['methodology', 'approach', 'plan'], method: 'Scored 0-10 based on documented methodology and depth of detail.' },
  { keywords: ['architecture', 'design', 'scalability'], method: 'Scored 0-10 based on architecture soundness and scalability.' },
  { keywords: ['support', 'sla', 'response'], method: 'Scored 0-10 based on SLA commitments and support coverage.' },
  { keywords: ['team', 'staff', 'resource', 'certified'], method: 'Scored 0-10 based on proposed team qualifications and certifications.' },
  { keywords: ['migration', 'data'], method: 'Scored 0-10 based on data migration plan completeness and risk mitigation.' },
];

function recommendEvaluationMethod(segId, critId) {
  const seg = tec.segments.find((s) => s.id === segId);
  const crit = seg?.criteria.find((c) => c.id === critId);
  if (!crit) return;
  if (!crit.description || !crit.description.trim()) { showToast('Enter a description first.'); return; }
  const text = crit.description.toLowerCase();
  const match = TEC_METHOD_KEYWORDS.find((m) => m.keywords.some((k) => text.includes(k)));
  crit.howApplied = match ? match.method : 'Scored 0-10 by the evaluation committee against documented submission quality.';
  persistTec();
  renderSegments();
  refreshTecTotalBadge();
  showToast('Evaluation method recommended.');
}

/* ---- Generate with AI: adds a new segment (global pattern: confirm -> apply -> ribbon -> Undo) ---- */

function runGenerateEvaluationCriteria() {
  runAiGenerate({
    confirmMessage: 'Would you like AI to generate a new evaluation segment with criteria and weights based on your RFP?',
    ribbonMountId: 'ribbon-tec-section',
    undoMountId: 'undo-tec-section',
    hasWork: () => true,
    performApply: () => {
      const uncovered = tec.boqItems.find((it) => !tec.segments.some((s) => !s.appliesToAll && s.appliesToItemIds.includes(it.id)));
      const newSeg = {
        id: newTecId('tec-seg'),
        name: uncovered ? uncovered.name : 'General Technical Evaluation',
        appliesToAll: !uncovered,
        appliesToItemIds: uncovered ? [uncovered.id] : [],
        criteria: [
          { id: newTecId('tec-crit'), description: 'Compliance with technical requirements', howApplied: 'Scored 0-10 based on coverage of Step 7 technical requirements.', weightage: 50 },
          { id: newTecId('tec-crit'), description: 'Quality of proposed solution', howApplied: 'Scored 0-10 by the evaluation committee against documented submission quality.', weightage: 50 },
        ],
      };
      tec.segments.push(newSeg);
      persistTec();
      renderSegments();
      refreshTecTotalBadge();
      return () => {
        tec.segments = tec.segments.filter((s) => s.id !== newSeg.id);
        persistTec();
        renderSegments();
        refreshTecTotalBadge();
      };
    },
  });
}

/* ---- Completion state ---- */

function renderCompletionState(mount) {
  mount.innerHTML = `
    <div class="tec-completion-state">
      <div class="tec-completion-icon"><i class="fa-solid fa-check"></i></div>
      <div class="tec-completion-title">RFP Creation Complete</div>
      <div class="tec-completion-desc">All 8 steps have been completed. Your request is ready for the next stage of the procurement workflow.</div>
      <button type="button" class="tec-btn-save" id="tec-go-to-requests">Go to My Requests</button>
    </div>
  `;
  document.getElementById('tec-go-to-requests').addEventListener('click', () => {
    window.location.href = 'my-requests.html';
  });
}

/* ---- Footer ---- */

function saveDraft() {
  persistTec();
  showToast('Request saved as draft successfully.');
}

function handleFinalContinue() {
  if (!tecValid()) return;
  WizardStore.STEPS.forEach((s) => WizardStore.setStepStatus(s.id, 'completed'));
  tec.completed = true;
  renderTecPage();
  showToast('RFP created successfully.');
}

/* ---- Init ---- */

async function initTec() {
  WizardStore.setStepStatus('technical-evaluation-criteria', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'technical-evaluation-criteria',
    onSaveDraft: saveDraft,
    onContinue: handleFinalContinue,
    footerLeftHtml: `
      <button type="button" class="tec-footer-back-btn" id="tec-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Technical Requirements</span>
      </button>
    `,
  });
  document.getElementById('tec-back-btn').addEventListener('click', () => {
    window.location.href = 'wizard-technical-requirements.html';
  });

  loadTecState();
  renderTecPage();
  updateTecContinueState();

  // Final step: the footer's default "Continue: <next step>" label doesn't
  // apply (there's no next step) — use the placeholder CTA text per spec.
  const btn = document.getElementById('wizard-continue-btn');
  if (btn) btn.innerHTML = 'Complete RFP Creation <i class="fa-solid fa-arrow-right"></i>';
}

document.addEventListener('DOMContentLoaded', initTec);
