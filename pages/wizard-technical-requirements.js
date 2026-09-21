/*
  Step 6 - Technical Requirements controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js, ai-generate.js
  (for the shared showAiRibbon/showAiUndoButton ribbon+Undo helpers),
  wizard-shell.js (all loaded before this file).

  Inline AI validation: once a requirement's text field loses focus
  (blur), it's checked against this RFP's Scope of Work / Project / Item
  context and gets a check or cross icon with a tooltip explaining the
  result. This runs automatically per row — there's no manual trigger for
  it, unlike "Generate with AI" and "Review with AI" which the requestor
  invokes explicitly.
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
  rfpFd: {},
};

/* ---- Persistence ---- */

function loadTrState() {
  const fd = WizardStore.getFormData();
  tr.rfpFd = fd;
  tr.requirements = fd.technicalRequirements || seedTrRequirements();
}

function seedTrRequirements() {
  return [
    { id: newTrId(), text: 'Minimum 10 years of experience in SAP S/4HANA implementation.', aiCheck: null },
    { id: newTrId(), text: 'Vendor must provide a dedicated project manager for the duration of the engagement.', aiCheck: null },
    { id: newTrId(), text: 'Proposed solution must support integration with existing ERP systems via standard APIs.', aiCheck: null },
  ];
}

function persistTr() {
  WizardStore.updateFormData({ technicalRequirements: tr.requirements });
  updateTrContinueState();
}

function trValid() {
  return tr.requirements.length > 0 && tr.requirements.every((r) => r.text && r.text.trim());
}

function updateTrContinueState() {
  setWizardContinueEnabled(trValid());
}

/* ---- Inline AI validation (runs on blur, per row) ----
   A prototype-level heuristic standing in for a real model call: a
   requirement is flagged invalid if it's too short/thin to be a specific,
   testable requirement, or if it doesn't read as an enforceable
   obligation ("must"/"shall"/"minimum"-style language, the standard way
   RFP technical requirements are worded so they can actually be checked
   against a vendor's proposal). This RFP's own Scope of Work / Project /
   Item context is folded in as a secondary positive signal, not a hard
   requirement — a well-formed requirement shouldn't be flagged invalid
   just for using different wording than the scope text. */

const TR_OBLIGATION_PATTERN = /\b(must|shall|should|require[sd]?|provide[sd]?|support[s]?|comply|maintain[s]?|deliver[s]?|ensure[s]?|demonstrate[s]?|minimum|maximum|at least|no more than)\b/i;

function trContextText() {
  const fd = tr.rfpFd;
  const boqNames = (fd.boqItems || []).map((i) => i.name).filter(Boolean);
  const qcNames = (fd.qualificationCriteria || []).flatMap((c) => c.criteria.map((cr) => cr.name)).filter(Boolean);
  return [fd.executiveSummary, fd.projectScope, fd.inScope, fd.requestNameEn, ...boqNames, ...qcNames]
    .filter(Boolean).join(' ').toLowerCase();
}

function evaluateRequirementAi(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null; // blank rows get no icon — the has-error border already flags them

  if (trimmed.length < 15 || trimmed.split(/\s+/).filter(Boolean).length < 4) {
    return { valid: false, reason: "it's too short to be a specific, testable technical requirement." };
  }

  if (!TR_OBLIGATION_PATTERN.test(trimmed)) {
    return { valid: false, reason: "it doesn't read as an enforceable requirement — use \"must\"/\"shall\"/\"minimum\"-style wording so it can be checked against a vendor's proposal." };
  }

  const lower = trimmed.toLowerCase();
  const context = trContextText();
  const overlapsContext = context && context.split(/\s+/).some((w) => w.length > 5 && lower.includes(w));
  return {
    valid: true,
    reason: overlapsContext
      ? "This requirement is specific, enforceable, and consistent with the RFP's scope and items."
      : "This requirement is specific and enforceable.",
  };
}

function renderAiCheckIconHtml(r) {
  if (!r.aiCheck) return '';
  if (r.aiCheck.valid) {
    return `<i class="fa-solid fa-circle-check tr-ai-check-icon valid" title="${escapeHtmlTr(r.aiCheck.reason)}"></i>`;
  }
  return `<i class="fa-solid fa-circle-xmark tr-ai-check-icon invalid" title="${escapeHtmlTr(`The added technical requirement is invalid because ${r.aiCheck.reason}`)}"></i>`;
}

function updateRowAiCheckIcon(item) {
  const el = document.getElementById(`tr-ai-check-${item.id}`);
  if (el) el.innerHTML = renderAiCheckIconHtml(item);
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
      <div class="tr-header-actions" id="tr-header-actions"></div>
    </div>
    <div class="aig-toolbar-row" id="tr-ai-toolbar-row" style="margin-bottom: var(--space-4); display:none;">
      <span></span>
      <button type="button" class="aig-undo-btn" id="undo-tr-section"></button>
      <div class="aig-ribbon" id="ribbon-tr-section"></div>
    </div>
    <div class="tr-section-card" id="tr-section-card"></div>
  `;

  renderTrCard();
}

function renderHeaderActions() {
  const mount = document.getElementById('tr-header-actions');
  if (!mount) return;
  if (tr.requirements.length === 0) {
    mount.innerHTML = '';
    return;
  }
  mount.innerHTML = `
    <button type="button" class="tr-ai-btn" id="tr-review-btn"><i class="fa-solid fa-magnifying-glass"></i> Review with AI</button>
    <button type="button" class="tr-ai-btn" id="tr-generate-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
    <button type="button" class="tr-btn-primary" id="tr-add-btn"><i class="fa-solid fa-plus"></i> Add Requirement</button>
  `;
  document.getElementById('tr-add-btn').addEventListener('click', addTrRequirement);
  document.getElementById('tr-generate-btn').addEventListener('click', openGenerateTrPanel);
  document.getElementById('tr-review-btn').addEventListener('click', runReviewTr);
}

function renderTrCard() {
  renderHeaderActions();
  const toolbarRow = document.getElementById('tr-ai-toolbar-row');
  const card = document.getElementById('tr-section-card');

  if (tr.requirements.length === 0) {
    if (toolbarRow) toolbarRow.style.display = 'none';
    card.innerHTML = `
      <div class="tr-empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No requirements yet</h3>
        <p>Start from a template, or let AI suggest requirements from your RFP.</p>
        <div class="tr-empty-actions">
          <button type="button" class="tr-btn-primary" id="tr-empty-templates-btn"><i class="fa-solid fa-layer-group"></i> Add with templates</button>
          <button type="button" class="tr-btn-outline" id="tr-empty-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        </div>
      </div>
    `;
    document.getElementById('tr-empty-templates-btn').addEventListener('click', openAddWithTemplatesModal);
    document.getElementById('tr-empty-ai-btn').addEventListener('click', openGenerateTrPanel);
    return;
  }

  if (toolbarRow) toolbarRow.style.display = '';

  const anyBlank = tr.requirements.some((r) => !r.text || !r.text.trim());

  card.innerHTML = `
    ${buildTableHtml({
      columns: trColumns(),
      rows: tr.requirements,
      rowKey: (r) => r.id,
    })}
    <button type="button" class="tr-add-row-btn" id="tr-add-row-link"><i class="fa-solid fa-plus"></i> Add Requirement</button>
    ${anyBlank ? `<div class="tr-validation-note">Every requirement needs text before you can continue.</div>` : ''}
    <div class="tr-footer-count">${tr.requirements.length} requirement${tr.requirements.length === 1 ? '' : 's'} defined</div>
    <div id="tr-ai-panel-mount"></div>
  `;

  document.getElementById('tr-add-row-link').addEventListener('click', addTrRequirement);
  wireTrTableEvents();
}

function trColumns() {
  return [
    { key: 'sl', label: 'SL No.', render: (r) => String(tr.requirements.indexOf(r) + 1) },
    {
      key: 'text', label: 'Requirement', render: (r) => `
        <div class="tr-req-cell">
          <input type="text" class="tr-cell-input${!r.text || !r.text.trim() ? ' has-error' : ''}" data-id="${r.id}" value="${escapeHtmlTr(r.text)}" placeholder="Describe the requirement…">
          <span class="tr-ai-check-mount" id="tr-ai-check-${r.id}">${renderAiCheckIconHtml(r)}</span>
        </div>
      `,
    },
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

  // Inline AI validation — automatic, on blur, per row (focusout bubbles
  // through event delegation; blur does not).
  tbody.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.classList.contains('tr-cell-input')) return;
    const item = tr.requirements.find((r) => r.id === el.dataset.id);
    if (!item) return;
    item.aiCheck = evaluateRequirementAi(item.text);
    persistTr();
    updateRowAiCheckIcon(item);
  });

  tbody.addEventListener('click', (e) => {
    const dupBtn = e.target.closest('[data-action="duplicate"]');
    if (dupBtn) {
      const idx = tr.requirements.findIndex((r) => r.id === dupBtn.dataset.id);
      if (idx >= 0) {
        // Copies the AI check along with the text — it's the same text,
        // so re-running the heuristic would just repeat the same verdict.
        tr.requirements.splice(idx + 1, 0, { id: newTrId(), text: tr.requirements[idx].text, aiCheck: tr.requirements[idx].aiCheck });
        persistTr();
        renderTrCard();
      }
      return;
    }

    const delBtn = e.target.closest('[data-action="delete"]');
    if (!delBtn) return;
    tr.requirements = tr.requirements.filter((r) => r.id !== delBtn.dataset.id);
    persistTr();
    renderTrCard();
  });
}

function addTrRequirement() {
  tr.requirements.push({ id: newTrId(), text: '', aiCheck: null });
  persistTr();
  renderTrCard();
  document.querySelector('#tr-section-card tbody tr:last-child .tr-cell-input')?.focus();
}

/* ---- Empty state: "Add with templates" ----
   Stubbed as a small, fixed set of canned starter requirement lists — the
   source spec doesn't detail actual template content, so these are
   plausible placeholders grouped by common procurement category. */

const TR_TEMPLATE_SETS = [
  {
    id: 'it-systems', name: 'IT Systems Implementation', description: 'Common requirements for ERP, software, or systems implementation projects.',
    requirements: [
      'Minimum 10 years of experience in enterprise systems implementation.',
      'Vendor must provide a dedicated project manager for the duration of the engagement.',
      'Proposed solution must support integration with existing systems via standard APIs.',
      'Solution must be deployable in both on-premise and cloud environments.',
    ],
  },
  {
    id: 'software-licensing', name: 'Software Licensing', description: 'Requirements for software or license procurement.',
    requirements: [
      'Licenses must be renewable annually at the customer\'s option.',
      'Vendor must provide technical support for the duration of the license term.',
      'Software must be compatible with the organization\'s existing operating environment.',
    ],
  },
  {
    id: 'facilities-maintenance', name: 'Facilities & Maintenance', description: 'Requirements for facility and maintenance service contracts.',
    requirements: [
      'Vendor must provide 24/7 emergency response for critical facility issues.',
      'All maintenance staff must hold relevant safety certifications.',
      'Vendor must maintain a service log accessible to the requesting department.',
    ],
  },
  {
    id: 'professional-services', name: 'Professional Services', description: 'Requirements for consulting or advisory engagements.',
    requirements: [
      'Vendor must assign consultants with at least 5 years of relevant sector experience.',
      'Vendor must provide a detailed work plan with milestones prior to engagement start.',
      'All deliverables must be reviewed and approved by the requesting department before final acceptance.',
    ],
  },
];

function openAddWithTemplatesModal() {
  openDialog({
    title: 'Add with templates',
    size: 'large',
    bodyHtml: `
      <p class="tr-modal-subtext">Pick a starter set — you can edit or remove any requirement afterwards.</p>
      <div class="tr-template-list">
        ${TR_TEMPLATE_SETS.map((t) => `
          <label class="tr-template-card">
            <input type="radio" name="tr-template" value="${t.id}">
            <div class="tr-template-card-body">
              <div class="tr-template-card-title">${escapeHtmlTr(t.name)}</div>
              <div class="tr-template-card-desc">${escapeHtmlTr(t.description)}</div>
              <div class="tr-template-card-count">${t.requirements.length} requirements</div>
            </div>
          </label>
        `).join('')}
      </div>
      <div class="tr-modal-footer">
        <button class="tr-btn-cancel" id="tr-template-cancel">Cancel</button>
        <button class="tr-btn-save" id="tr-template-add" disabled>Add requirements</button>
      </div>
    `,
  });

  document.querySelectorAll('[name="tr-template"]').forEach((input) => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.tr-template-card').forEach((c) => c.classList.remove('selected'));
      input.closest('.tr-template-card').classList.add('selected');
      document.getElementById('tr-template-add').disabled = false;
    });
  });

  document.getElementById('tr-template-cancel').addEventListener('click', closeDialog);
  document.getElementById('tr-template-add').addEventListener('click', () => {
    const picked = document.querySelector('[name="tr-template"]:checked');
    if (!picked) return;
    const set = TR_TEMPLATE_SETS.find((t) => t.id === picked.value);
    if (!set) return;
    set.requirements.forEach((text) => {
      tr.requirements.push({ id: newTrId(), text, aiCheck: evaluateRequirementAi(text) });
    });
    persistTr();
    closeDialog();
    renderTrCard();
    showToast(`${set.requirements.length} requirements added from "${set.name}".`);
  });
}

/* ---- Generate with AI: suggestions panel + checkbox + "Add selected",
   with Undo after applying (never auto-finalizes on its own). ---- */

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
    const addedIds = selected.map((s) => {
      const id = newTrId();
      tr.requirements.push({ id, text: s, aiCheck: evaluateRequirementAi(s) });
      return id;
    });
    persistTr();
    mount.innerHTML = '';
    renderTrCard();
    showAiRibbon('ribbon-tr-section', 'Data updated successfully', true);
    showAiUndoButton('undo-tr-section', () => {
      tr.requirements = tr.requirements.filter((r) => !addedIds.includes(r.id));
      persistTr();
      renderTrCard();
      hideAiRibbon('ribbon-tr-section');
      hideAiUndoButton('undo-tr-section');
    });
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
  const next = wizardNextStep('technical-requirements');
  if (!next) return;
  WizardStore.setStepStatus(next.id, 'current');
  window.location.href = next.href;
}

/* ---- Init ---- */

async function initTr() {
  WizardStore.setStepStatus('technical-requirements', 'current');

  const prev = wizardPrevStep('technical-requirements');
  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'technical-requirements',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="tr-footer-back-btn" id="tr-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${prev.title}</span>
      </button>
    `,
  });
  document.getElementById('tr-back-btn').addEventListener('click', () => {
    window.location.href = prev.href;
  });

  loadTrState();
  renderTrPage();
  updateTrContinueState();
}

document.addEventListener('DOMContentLoaded', initTr);
