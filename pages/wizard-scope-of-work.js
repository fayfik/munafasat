/*
  Step 3 - Scope of Work controller.
  Depends on: data-store.js, dialog.js, toast.js, wizard-shell.js (loaded
  before this file).
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
      <button type="button" class="sow-ai-section-btn" id="sow-section-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
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
                <button type="button" class="sow-field-ai-btn" data-field-ai="${field.key}"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
              </div>
              <textarea class="sow-textarea" id="sow-f-${field.key}" data-field-key="${field.key}" placeholder="${field.placeholder}" maxlength="2000">${sow.formData[field.key] || ''}</textarea>
              <div class="sow-char-count" id="sow-count-${field.key}">${(sow.formData[field.key] || '').length} / 2000</div>
              <div id="sow-suggest-${field.key}"></div>
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

/* ---- Field-level AI: always offers a suggestion, never auto-overwrites ---- */

function runFieldAi(field) {
  const mount = document.getElementById(`sow-suggest-${field.key}`);
  const text = SOW_GENERATORS[field.key]();
  renderFieldSuggestion(mount, field, text);
}

function renderFieldSuggestion(mount, field, text) {
  mount.innerHTML = `
    <div class="sow-ai-suggested-box">
      <div class="sow-ai-suggested-label">
        <span><i class="fa-solid fa-wand-magic-sparkles"></i> AI-suggested</span>
        <button type="button" class="sow-ai-suggested-dismiss" data-dismiss><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="sow-ai-suggested-text">${text}</div>
      <div class="sow-ai-suggested-actions">
        <button type="button" class="sow-ai-action-btn accept" data-act="accept"><i class="fa-solid fa-check"></i> Accept &amp; Apply</button>
        <button type="button" class="sow-ai-action-btn regenerate" data-act="regenerate"><i class="fa-solid fa-rotate"></i> Regenerate</button>
      </div>
    </div>
  `;
  mount.querySelector('[data-dismiss]').addEventListener('click', () => { mount.innerHTML = ''; });
  mount.querySelector('[data-act="accept"]').addEventListener('click', () => {
    const textarea = document.getElementById(`sow-f-${field.key}`);
    textarea.value = text;
    patchSow({ [field.key]: text });
    document.getElementById(`sow-count-${field.key}`).textContent = `${text.length} / 2000`;
    mount.innerHTML = '';
  });
  mount.querySelector('[data-act="regenerate"]').addEventListener('click', () => {
    renderFieldSuggestion(mount, field, SOW_GENERATORS[field.key]());
  });
}

/* ---- Section-level AI: fills only empty fields, review before commit ---- */

function runSectionAi() {
  openDialog({
    title: 'Generate with AI',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Would you like AI to fill this section using the information already provided in your RFP?
      </p>
      <div class="sow-modal-footer">
        <button class="sow-btn-cancel" id="sow-section-ai-no">No</button>
        <button class="sow-btn-primary" id="sow-section-ai-yes">Yes</button>
      </div>
    `,
  });
  document.getElementById('sow-section-ai-no').addEventListener('click', closeDialog);
  document.getElementById('sow-section-ai-yes').addEventListener('click', () => {
    const emptyFields = ALL_SOW_FIELDS.filter((f) => !sow.formData[f.key] || !sow.formData[f.key].trim());
    if (emptyFields.length === 0) {
      openDialog({
        title: 'Generate with AI',
        bodyHtml: `<p style="margin:0; color: var(--text-secondary); font-size: var(--font-size-sm);">Every field already has content — nothing to generate.</p>`,
      });
      return;
    }
    showSectionReview(emptyFields.map((f) => ({ field: f, text: SOW_GENERATORS[f.key](), status: 'pending' })));
  });
}

function showSectionReview(reviewItems) {
  openDialog({
    title: 'Review AI-generated content',
    bodyHtml: `
      <div class="sow-review-list">
        ${reviewItems.map((item, i) => `
          <div class="sow-review-item${item.status !== 'pending' ? ' resolved' : ''}" data-review-index="${i}">
            <div class="sow-review-item-label">${item.field.label}</div>
            <textarea class="sow-textarea" id="sow-review-text-${i}" ${item.status !== 'pending' ? 'disabled' : ''}>${item.text}</textarea>
            ${item.status === 'pending' ? `
              <div class="sow-ai-suggested-actions" style="margin-top: var(--space-2);">
                <button type="button" class="sow-ai-action-btn accept" data-review-act="accept" data-review-index="${i}"><i class="fa-solid fa-check"></i> Accept</button>
                <button type="button" class="sow-ai-action-btn regenerate" data-review-act="regenerate" data-review-index="${i}"><i class="fa-solid fa-rotate"></i> Regenerate</button>
                <button type="button" class="sow-ai-action-btn reject" data-review-act="reject" data-review-index="${i}"><i class="fa-solid fa-xmark"></i> Reject</button>
              </div>
            ` : `<div class="sow-review-status ${item.status}">${item.status === 'accepted' ? 'Accepted' : 'Rejected'}</div>`}
          </div>
        `).join('')}
      </div>
      <div class="sow-modal-footer">
        <button class="sow-btn-cancel" id="sow-review-close">Close</button>
        <button class="sow-btn-primary" id="sow-review-accept-all">Accept all remaining</button>
      </div>
    `,
  });

  document.getElementById('sow-review-close').addEventListener('click', closeDialog);
  document.getElementById('sow-review-accept-all').addEventListener('click', () => {
    reviewItems.forEach((item, i) => {
      if (item.status === 'pending') {
        item.text = document.getElementById(`sow-review-text-${i}`).value;
        commitSowField(item.field, item.text);
        item.status = 'accepted';
      }
    });
    closeDialog();
    renderSowPage();
    showToast('AI-generated content applied.');
  });

  reviewItems.forEach((item, i) => {
    if (item.status !== 'pending') return;
    document.querySelector(`[data-review-act="accept"][data-review-index="${i}"]`).addEventListener('click', () => {
      item.text = document.getElementById(`sow-review-text-${i}`).value;
      commitSowField(item.field, item.text);
      item.status = 'accepted';
      showSectionReview(reviewItems);
    });
    document.querySelector(`[data-review-act="regenerate"][data-review-index="${i}"]`).addEventListener('click', () => {
      item.text = SOW_GENERATORS[item.field.key]();
      showSectionReview(reviewItems);
    });
    document.querySelector(`[data-review-act="reject"][data-review-index="${i}"]`).addEventListener('click', () => {
      item.status = 'rejected';
      showSectionReview(reviewItems);
    });
  });
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
  WizardStore.setStepStatus('payments', 'current');
  window.location.href = 'wizard-payments.html';
}

/* ---- Init ---- */

async function initSow() {
  WizardStore.setStepStatus('scope-of-work', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'scope-of-work',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="sow-footer-back-btn" id="sow-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Bill of Quantity</span>
      </button>
    `,
    footerActionsPrefixHtml: `
      <div class="sow-footer-save-state" id="wizard-save-state">
        <i class="fa-solid fa-circle-check"></i>
        <span>Saved just now</span>
      </div>
    `,
  });
  document.getElementById('sow-back-btn').addEventListener('click', () => {
    window.location.href = 'wizard-boq.html';
  });

  sow.formData = WizardStore.getFormData();
  sow.project = sow.formData.projectId ? await DataStore.getProjectById(sow.formData.projectId) : null;

  renderSowPage();
  setWizardContinueEnabled(true); // no mandatory fields in this step
}

document.addEventListener('DOMContentLoaded', initSow);
