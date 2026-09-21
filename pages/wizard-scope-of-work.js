/*
  Step 3 - Scope of Work controller.
  Depends on: data-store.js, dialog.js, toast.js, ai-generate.js (for the
  shared showAiRibbon/showAiUndoButton ribbon+Undo helpers, reused after
  the section-level review modal below applies), wizard-shell.js (all
  loaded before this file).
*/

const SOW_CARDS = [
  {
    title: 'Project Overview',
    fields: [
      { key: 'executiveSummary', label: 'Executive Summary', placeholder: 'Provide a high-level overview of the project objectives and background...' },
      { key: 'projectJustification', label: 'Project Justification', placeholder: 'Explain the business need, urgency, or strategic importance of this procurement...' },
      { key: 'projectScope', label: 'Project Scope', placeholder: 'Describe in detail what is included - activities, deliverables, services, systems, or goods to be procured...' },
    ],
  },
  {
    title: 'Scope Boundaries',
    fields: [
      { key: 'inScope', label: 'In Scope', placeholder: 'List all items, activities, and deliverables explicitly included in this contract...' },
      { key: 'outOfScope', label: 'Out of Scope', placeholder: 'List items or activities explicitly excluded from this contract...', dividerBefore: true },
    ],
  },
  {
    title: 'Location and Delivery',
    fields: [
      { key: 'placeOfWork', label: 'Place of Work', placeholder: 'Specify where work will be performed - site addresses, access requirements, geographic constraints...' },
      { key: 'locationRegion', label: 'Location / Region', placeholder: 'Specify the geographic location or region where goods and services will be delivered...' },
      { key: 'timelines', label: 'Timelines / Milestones', placeholder: 'Outline key milestones, phases, and estimated completion dates...' },
    ],
  },
  {
    title: 'Standards and Compliance',
    fields: [
      { key: 'qualityStandards', label: 'Quality Standards', placeholder: 'List applicable quality standards and certifications (ISO 9001 etc.)...' },
      { key: 'safetyStandards', label: 'Safety Standards', placeholder: 'List safety standards, HSE requirements, and site safety protocols...' },
      { key: 'applicableStandards', label: 'Applicable Standards', placeholder: 'List any other applicable regulatory or technical standards (NCA, CITC, etc.)...' },
    ],
  },
  {
    title: 'Contract Conditions',
    fields: [
      { key: 'specialConditions', label: 'Special Conditions', placeholder: 'Any special conditions, exceptions, or non-standard requirements the vendor must comply with...' },
      { key: 'penalties', label: 'Penalties', placeholder: 'Define penalty clauses for delays, non-performance, breach of SLA, or failure to deliver...' },
    ],
  },
];

const ALL_SOW_FIELDS = SOW_CARDS.flatMap((c) => c.fields);

const sow = {
  formData: {},
  project: null,
  saveTimer: null,
};

/* ---- Context for AI generation ---- */

function computeSowClosureDate(fd) {
  if (!fd.projectStartDate || !fd.durationValue) return null;
  const d = new Date(`${fd.projectStartDate}T00:00:00`);
  const n = Number(fd.durationValue);
  if (fd.durationType === 'Days') d.setDate(d.getDate() + n);
  else if (fd.durationType === 'Weeks') d.setDate(d.getDate() + n * 7);
  else if (fd.durationType === 'Months') d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  return d;
}

function boqItemNames() {
  return (sow.formData.boqItems || []).map((i) => i.name).filter(Boolean);
}

function projectName() {
  return sow.project ? sow.project.name : 'the selected project';
}

/* ---- Canned generators (use real Step 1/2 data where relevant) ---- */

const SOW_GENERATORS = {
  executiveSummary: () => {
    const items = boqItemNames();
    const itemsText = items.length ? ` covering ${items.join(', ')}` : '';
    return `This RFP, "${sow.formData.requestNameEn || 'this request'}", is raised in support of ${projectName()}${itemsText}. It is intended to address an operational need within ${sow.formData.department || 'the requesting department'} and to ensure continuity and compliance with SIDF's procurement standards.`;
  },
  projectJustification: () => `This procurement is required to support ${projectName()} and meet committed delivery timelines. Proceeding ensures operational continuity, avoids delays to dependent workstreams, and aligns with the department's approved budget and scope.`,
  projectScope: () => {
    const items = boqItemNames();
    return items.length
      ? `The scope of this RFP includes the supply, delivery, and implementation of: ${items.join(', ')}, as detailed in the Bill of Quantity, in support of ${projectName()}.`
      : `The scope of this RFP includes the goods and/or services required to deliver ${projectName()}, as detailed in the Bill of Quantity.`;
  },
  inScope: () => {
    const items = boqItemNames();
    return items.length
      ? items.map((n) => `- ${n}`).join('\n')
      : '- All items, activities, and deliverables listed in the Bill of Quantity for this RFP.';
  },
  outOfScope: () => 'Any items, services, or activities not explicitly listed in the Bill of Quantity or Project Scope sections are excluded from this contract, including third-party integrations, hardware/software not specified herein, and post-warranty support beyond the agreed contract period.',
  placeOfWork: () => `${sow.formData.department || 'Requesting department'} premises, SIDF Headquarters, Riyadh, Saudi Arabia. Remote work may be permitted for non-site-dependent activities, subject to approval.`,
  locationRegion: () => 'Riyadh, Kingdom of Saudi Arabia',
  timelines: () => {
    const start = sow.formData.projectStartDate;
    const closure = computeSowClosureDate(sow.formData);
    if (!start) return 'Project timelines will be confirmed following contract award, with key milestones aligned to the approved project schedule.';
    const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const closureLabel = closure ? closure.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
    return `Project is planned to start on ${startLabel} with a tentative closure on ${closureLabel} (${sow.formData.durationValue || '—'} ${(sow.formData.durationType || '').toLowerCase()}). Key milestones include kickoff, mid-point delivery review, and final acceptance/handover.`;
  },
  qualityStandards: () => 'All deliverables shall comply with ISO 9001:2015 Quality Management System requirements and any product- or service-specific certifications applicable to the category of procurement.',
  safetyStandards: () => 'The vendor shall comply with all applicable HSE (Health, Safety, and Environment) requirements and site safety protocols while performing work on SIDF premises, including use of appropriate PPE and adherence to site access procedures.',
  applicableStandards: () => 'The vendor shall comply with applicable regulatory and technical standards, including NCA (National Cybersecurity Authority) controls and CITC (Communications, Space and Technology Commission) regulations where relevant to the scope of this RFP.',
  specialConditions: () => 'No special conditions apply beyond SIDF\'s standard terms and conditions, unless otherwise stated in the contract documents.',
  penalties: () => 'A penalty of 1% of the contract value per week of delay shall apply for late delivery, up to a maximum of 10% of the total contract value, in addition to any remedies available under the standard SIDF procurement terms.',
};

/* ---- Persistence ---- */

function patchSow(patch) {
  sow.formData = { ...sow.formData, ...patch };
  WizardStore.updateFormData(patch);
  scheduleSowSave();
}

function scheduleSowSave() {
  setWizardSaveState('<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>Saving…</span>');
  clearTimeout(sow.saveTimer);
  sow.saveTimer = setTimeout(() => {
    setWizardSaveState('<i class="fa-solid fa-circle-check"></i><span>Saved just now</span>');
  }, 450);
}

/* ---- Rendering ---- */

function renderSowPage() {
  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="sow-header-row">
      <div>
        <div class="sow-header-title">Scope of Work</div>
        <div class="sow-header-desc">Define the project scope, deliverables, locations, standards, timelines, and other requirements for this procurement.</div>
      </div>
      <div class="aig-toolbar-row">
        <button type="button" class="sow-ai-section-btn" id="sow-section-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
        <button type="button" class="aig-undo-btn" id="undo-sow-section"></button>
        <div class="aig-ribbon" id="ribbon-sow-section"></div>
      </div>
    </div>

    <div class="sow-cards-stack">
      ${SOW_CARDS.map((card) => `
        <div class="sow-card">
          <div class="sow-card-title">${card.title}</div>
          ${card.fields.map((field) => `
            ${field.dividerBefore ? '<hr class="sow-field-divider">' : ''}
            <div class="sow-field">
              <div class="sow-field-toolbar">
                <span class="sow-field-label">${field.label}</span>
                <div class="aig-toolbar-row">
                  <button type="button" class="sow-field-ai-btn" data-field-ai="${field.key}"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
                  <button type="button" class="aig-undo-btn" id="undo-sow-${field.key}"></button>
                  <div class="aig-ribbon" id="ribbon-sow-${field.key}"></div>
                </div>
              </div>
              <textarea class="sow-textarea" id="sow-f-${field.key}" data-field-key="${field.key}" placeholder="${field.placeholder}" maxlength="2000">${sow.formData[field.key] || ''}</textarea>
              <div class="sow-char-count" id="sow-count-${field.key}">${(sow.formData[field.key] || '').length} / 2000</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;

  wireSowFields();
  document.getElementById('sow-section-ai-btn').addEventListener('click', runSectionAi);
}

function wireSowFields() {
  ALL_SOW_FIELDS.forEach((field) => {
    const el = document.getElementById(`sow-f-${field.key}`);
    el.addEventListener('input', (e) => {
      patchSow({ [field.key]: e.target.value });
      document.getElementById(`sow-count-${field.key}`).textContent = `${e.target.value.length} / 2000`;
    });
    document.querySelector(`[data-field-ai="${field.key}"]`).addEventListener('click', () => runFieldAi(field));
  });
}

/* ---- Field-level AI: confirm -> fill if empty -> ribbon -> Undo ---- */

function runFieldAi(field) {
  runFieldAiGenerate({
    ribbonMountId: `ribbon-sow-${field.key}`,
    undoMountId: `undo-sow-${field.key}`,
    isEmpty: () => !sow.formData[field.key] || !sow.formData[field.key].trim(),
    generate: () => SOW_GENERATORS[field.key](),
    apply: (text) => commitSowField(field, text),
  });
}

/*
  Section-level AI: unlike every other page's section-level "Generate with
  AI" (a single confirm -> silently fill -> ribbon), Scope of Work shows a
  per-field review modal instead — each suggested field can be individually
  Approved, Edited, or Rejected, plus bulk Approve all/Reject all, before
  anything is written to the actual textareas. Only currently-empty fields
  are ever suggested (never overwrites a user-entered value). Applying
  still ends in the same shared success ribbon + outlined Undo button used
  everywhere else, for consistency with the rest of the app.
*/
function runSectionAi() {
  const eligibleFields = ALL_SOW_FIELDS.filter((f) => !sow.formData[f.key] || !sow.formData[f.key].trim());

  if (eligibleFields.length === 0) {
    showAiRibbon('ribbon-sow-section', 'Nothing to update — this section is already filled in.', false);
    return;
  }

  const items = eligibleFields.map((field) => ({
    key: field.key,
    label: field.label,
    cardTitle: SOW_CARDS.find((c) => c.fields.includes(field)).title,
    text: SOW_GENERATORS[field.key](),
    status: 'approved', // 'approved' | 'rejected'
    editing: false,
  }));

  openSowReviewDialog(items);
}

function escapeHtmlSow(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function openSowReviewDialog(items) {
  openDialog({
    title: 'Generate with AI — Review Suggestions',
    size: 'large',
    bodyHtml: buildSowReviewHtml(items),
  });
  wireSowReviewDialog(items);
}

function buildSowReviewHtml(items) {
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  return `
    <p class="sow-review-subtext">Review each suggested field below, then approve, edit, or decline it before applying.</p>
    <div class="sow-review-toolbar">
      <span class="sow-review-count" id="sow-review-count">${approvedCount} of ${items.length} approved</span>
      <div class="sow-review-bulk-actions">
        <button type="button" class="sow-review-bulk-btn" id="sow-review-approve-all">Approve all</button>
        <button type="button" class="sow-review-bulk-btn" id="sow-review-reject-all">Decline all</button>
      </div>
    </div>
    <div class="sow-review-groups" id="sow-review-groups">${buildSowReviewGroupsHtml(items)}</div>
    <div class="sow-modal-footer">
      <button type="button" class="sow-btn-cancel" id="sow-review-cancel">Cancel</button>
      <button type="button" class="sow-btn-primary" id="sow-review-apply" ${approvedCount === 0 ? 'disabled' : ''}>Apply approved (<span id="sow-review-apply-count">${approvedCount}</span>)</button>
    </div>
  `;
}

function buildSowReviewGroupsHtml(items) {
  const groups = SOW_CARDS
    .map((card) => ({ title: card.title, items: items.filter((i) => i.cardTitle === card.title) }))
    .filter((g) => g.items.length > 0);

  return groups.map((g) => `
    <div class="sow-review-group">
      <div class="sow-review-group-title">${escapeHtmlSow(g.title)}</div>
      ${g.items.map((item) => buildSowReviewItemHtml(item)).join('')}
    </div>
  `).join('');
}

function buildSowReviewItemHtml(item) {
  return `
    <div class="sow-review-item status-${item.status}" data-key="${item.key}">
      <div class="sow-review-item-header">
        <span class="sow-review-item-label">${escapeHtmlSow(item.label)}</span>
        <div class="sow-review-item-actions">
          <button type="button" class="sow-review-item-btn approve${item.status === 'approved' && !item.editing ? ' active' : ''}" data-act="approve" data-key="${item.key}"><i class="fa-solid fa-check"></i> Approve</button>
          <button type="button" class="sow-review-item-btn edit${item.editing ? ' active' : ''}" data-act="edit" data-key="${item.key}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button type="button" class="sow-review-item-btn reject${item.status === 'rejected' ? ' active' : ''}" data-act="reject" data-key="${item.key}"><i class="fa-solid fa-xmark"></i> Decline</button>
        </div>
      </div>
      ${item.editing
        ? `<textarea class="sow-review-edit-textarea" data-edit-key="${item.key}">${escapeHtmlSow(item.text)}</textarea>`
        : `<div class="sow-review-item-text">${escapeHtmlSow(item.text)}</div>`
      }
    </div>
  `;
}

function wireSowReviewDialog(items) {
  const findItem = (key) => items.find((i) => i.key === key);

  function wireEditTextareas() {
    document.querySelectorAll('[data-edit-key]').forEach((ta) => {
      ta.addEventListener('input', (e) => {
        const item = findItem(ta.dataset.editKey);
        if (item) item.text = e.target.value;
      });
    });
  }

  function rerender() {
    document.getElementById('sow-review-groups').innerHTML = buildSowReviewGroupsHtml(items);
    const approvedCount = items.filter((i) => i.status === 'approved').length;
    document.getElementById('sow-review-count').textContent = `${approvedCount} of ${items.length} approved`;
    document.getElementById('sow-review-apply-count').textContent = approvedCount;
    document.getElementById('sow-review-apply').disabled = approvedCount === 0;
    wireEditTextareas();
  }

  document.getElementById('sow-review-groups').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const item = findItem(btn.dataset.key);
    if (!item) return;
    if (btn.dataset.act === 'approve') { item.status = 'approved'; item.editing = false; }
    else if (btn.dataset.act === 'reject') { item.status = 'rejected'; item.editing = false; }
    else if (btn.dataset.act === 'edit') {
      item.editing = !item.editing;
      if (item.editing) item.status = 'approved';
    }
    rerender();
  });

  document.getElementById('sow-review-approve-all').addEventListener('click', () => {
    items.forEach((i) => { i.status = 'approved'; i.editing = false; });
    rerender();
  });
  document.getElementById('sow-review-reject-all').addEventListener('click', () => {
    items.forEach((i) => { i.status = 'rejected'; i.editing = false; });
    rerender();
  });

  document.getElementById('sow-review-cancel').addEventListener('click', closeDialog);

  document.getElementById('sow-review-apply').addEventListener('click', () => {
    const approved = items.filter((i) => i.status === 'approved');
    if (approved.length === 0) return;
    approved.forEach((i) => commitSowField(ALL_SOW_FIELDS.find((f) => f.key === i.key), i.text));
    closeDialog();
    showAiRibbon('ribbon-sow-section', 'Data updated successfully', true);
    showAiUndoButton('undo-sow-section', () => {
      approved.forEach((i) => commitSowField(ALL_SOW_FIELDS.find((f) => f.key === i.key), ''));
      hideAiRibbon('ribbon-sow-section');
      hideAiUndoButton('undo-sow-section');
    });
    showToast(`${approved.length} field${approved.length > 1 ? 's' : ''} updated from AI suggestions.`);
  });

  wireEditTextareas();
}

function commitSowField(field, text) {
  sow.formData[field.key] = text;
  WizardStore.updateFormData({ [field.key]: text });
  const textarea = document.getElementById(`sow-f-${field.key}`);
  if (textarea) {
    textarea.value = text;
    document.getElementById(`sow-count-${field.key}`).textContent = `${text.length} / 2000`;
  }
}

/* ---- Footer ---- */

function saveDraft() {
  scheduleSowSave();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  WizardStore.setStepStatus('scope-of-work', 'completed');
  const next = wizardNextStep('scope-of-work');
  if (!next) return;
  WizardStore.setStepStatus(next.id, 'current');
  window.location.href = next.href;
}

/* ---- Init ---- */

async function initSow() {
  WizardStore.setStepStatus('scope-of-work', 'current');

  const prev = wizardPrevStep('scope-of-work');
  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'scope-of-work',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: prev ? `
      <button type="button" class="sow-footer-back-btn" id="sow-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${prev.title}</span>
      </button>
    ` : '',
    footerActionsPrefixHtml: `
      <div class="sow-footer-save-state" id="wizard-save-state">
        <i class="fa-solid fa-circle-check"></i>
        <span>Saved just now</span>
      </div>
    `,
  });
  document.getElementById('sow-back-btn')?.addEventListener('click', () => {
    window.location.href = prev.href;
  });

  sow.formData = WizardStore.getFormData();
  sow.project = sow.formData.projectId ? await DataStore.getProjectById(sow.formData.projectId) : null;

  renderSowPage();
  setWizardContinueEnabled(true); // no mandatory fields in this step
}

document.addEventListener('DOMContentLoaded', initSow);
