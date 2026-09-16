/*
  Step 5 - Attachments (Certificates and Documents) controller.
  Depends on: data-store.js, dialog.js, toast.js, searchable-select.js,
  wizard-shell.js (all loaded before this file).

  Required Certificates and Technical Documents are two fully independent
  collections (`certCard` / `techCard` below, persisted separately as
  `attachments.certificates` / `attachments.technicalDocuments`). Within
  each card, predefined dropdown picks, custom "Other" entries, and (for
  Technical Documents) AI-accepted suggestions all land in one unified
  `items` array so they render as a single chip collection, tagged with a
  `source` so they can be styled differently without being separate lists.
*/

const AI_TECH_DOC_POOL = [
  'Technical Proposal', 'Product Datasheets', 'Compliance Matrix', 'Past Performance References',
  'Warranty Documentation', 'Installation Plan', 'Project Implementation Schedule',
  'Data Migration Plan', 'Security Compliance Certificate', 'Change Management Plan', 'Training and Handover Plan',
];

function newAttId() {
  return `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtmlAtt(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---- Card controller factory (shared logic for both cards) ---- */

function makeAttachmentCard({ key, mountPrefix, options, initialItems }) {
  const card = {
    key,
    mountPrefix,
    options,
    items: [...(initialItems || [])],
    predefinedSelect: null,
  };

  function predefinedIds() {
    return card.items.filter((i) => i.source === 'predefined').map((i) => i.id);
  }

  function hasLabel(label) {
    const q = label.trim().toLowerCase();
    return card.items.some((i) => i.label.trim().toLowerCase() === q);
  }

  function renderChips() {
    const mount = document.getElementById(`${mountPrefix}-chips`);
    if (!mount) return;
    mount.innerHTML = card.items.map((item) => `
      <span class="att-chip source-${item.source}" data-item-id="${item.id}">
        ${item.source === 'ai' ? '<i class="fa-solid fa-wand-magic-sparkles"></i>' : ''}
        <span class="att-chip-label">${escapeHtmlAtt(item.label)}</span>
        <i class="fa-solid fa-xmark att-chip-remove" data-remove="${item.id}"></i>
      </span>
    `).join('');
    mount.querySelectorAll('[data-remove]').forEach((el) => {
      el.addEventListener('click', () => removeItem(el.dataset.remove));
    });
  }

  function removeItem(id) {
    const removed = card.items.find((i) => i.id === id);
    card.items = card.items.filter((i) => i.id !== id);
    if (removed && removed.source === 'predefined') {
      card.predefinedSelect.setSelected(predefinedIds());
    }
    renderChips();
    persistAttachments();
  }

  function onPredefinedChange(selectedValues) {
    // Reconcile: drop predefined items no longer checked, add newly checked ones.
    card.items = card.items.filter((i) => i.source !== 'predefined' || selectedValues.includes(i.id));
    selectedValues.forEach((value) => {
      if (!card.items.some((i) => i.source === 'predefined' && i.id === value)) {
        const opt = card.options.find((o) => o.value === value);
        if (opt) card.items.push({ id: value, label: opt.label, source: 'predefined' });
      }
    });
    renderChips();
    persistAttachments();
  }

  function addOtherEntry(rawValue) {
    const value = rawValue.trim();
    const errEl = document.getElementById(`${mountPrefix}-other-error`);
    if (!value) {
      if (errEl) errEl.textContent = 'Type a name before adding.';
      return false;
    }
    if (hasLabel(value)) {
      if (errEl) errEl.textContent = 'This is already in the list.';
      return false;
    }
    if (errEl) errEl.textContent = '';
    card.items.push({ id: newAttId(), label: value, source: 'custom' });
    renderChips();
    persistAttachments();
    return true;
  }

  function addAiEntries(labels) {
    labels.forEach((label) => {
      if (!hasLabel(label)) card.items.push({ id: newAttId(), label, source: 'ai' });
    });
    renderChips();
    persistAttachments();
  }

  function renderPredefinedSelect() {
    card.predefinedSelect = createSearchableSelect({
      mountId: `${mountPrefix}-select`,
      mode: 'multi',
      options: card.options.map((o) => ({ value: o.value, label: o.label })),
      selected: predefinedIds(),
      placeholder: card.placeholder,
      searchPlaceholder: 'Search',
      showChips: false,
      onChange: onPredefinedChange,
    });
  }

  return { card, renderPredefinedSelect, renderChips, addOtherEntry, addAiEntries, hasLabel };
}

let certCardCtl = null;
let techCardCtl = null;

function persistAttachments() {
  WizardStore.updateFormData({
    attachmentCertificates: certCardCtl.card.items,
    attachmentTechnicalDocuments: techCardCtl.card.items,
  });
}

/* ---- Rendering ---- */

async function renderAttachmentsPage() {
  const [certOptions, techOptions] = await Promise.all([
    DataStore.getAllCertificates(),
    DataStore.getAllTechnicalDocuments(),
  ]);

  const fd = WizardStore.getFormData();

  certCardCtl = makeAttachmentCard({
    key: 'certificates',
    mountPrefix: 'att-cert',
    options: certOptions,
    initialItems: fd.attachmentCertificates || [],
  });
  certCardCtl.card.placeholder = 'Choose required certificates…';

  techCardCtl = makeAttachmentCard({
    key: 'technicalDocuments',
    mountPrefix: 'att-tech',
    options: techOptions,
    initialItems: fd.attachmentTechnicalDocuments || [],
  });
  techCardCtl.card.placeholder = 'Choose required technical documents…';

  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="att-header-row">
      <div class="att-header-title">Certificates and Documents</div>
      <div class="att-header-desc">Select the certificates and technical documents vendors must submit as part of this RFP.</div>
    </div>

    <div class="att-cards-stack">
      <div class="att-card">
        <div class="att-card-title">Required Certificates</div>
        <div class="att-card-desc">Select the compliance and legal certificates vendors must provide.</div>

        <div class="att-field">
          <label class="att-field-label">Select from list</label>
          <div id="att-cert-select"></div>
        </div>

        <div class="att-field">
          <label class="att-field-label">Other (not in list)</label>
          <div class="att-other-row">
            <input type="text" class="att-input" id="att-cert-other-input" placeholder="Type certificate name and press Add">
            <button type="button" class="att-add-btn" id="att-cert-other-add"><i class="fa-solid fa-plus"></i> Add</button>
          </div>
          <div class="att-field-error" id="att-cert-other-error"></div>
        </div>

        <div class="att-chip-row" id="att-cert-chips"></div>
      </div>

      <div class="att-card">
        <div class="att-card-title">Technical Documents</div>
        <div class="att-card-desc">Select the technical documents and evidence vendors must submit.</div>

        <div class="att-field">
          <label class="att-field-label">Select from list</label>
          <div id="att-tech-select"></div>
        </div>

        <div class="att-field">
          <div class="att-field-toolbar">
            <label class="att-field-label" style="margin-bottom:0;">Other (not in list)</label>
            <button type="button" class="att-ai-btn" id="att-tech-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
          </div>
          <div class="att-other-row">
            <input type="text" class="att-input" id="att-tech-other-input" placeholder="Type document name and press Add">
            <button type="button" class="att-add-btn" id="att-tech-other-add"><i class="fa-solid fa-plus"></i> Add</button>
          </div>
          <div class="att-field-error" id="att-tech-other-error"></div>
        </div>

        <div class="att-chip-row" id="att-tech-chips"></div>
      </div>
    </div>
  `;

  certCardCtl.renderPredefinedSelect();
  certCardCtl.renderChips();
  techCardCtl.renderPredefinedSelect();
  techCardCtl.renderChips();

  wireOtherRow('att-cert-other-input', 'att-cert-other-add', certCardCtl);
  wireOtherRow('att-tech-other-input', 'att-tech-other-add', techCardCtl);

  document.getElementById('att-tech-ai-btn').addEventListener('click', runTechDocsAi);
}

function wireOtherRow(inputId, addBtnId, ctl) {
  const input = document.getElementById(inputId);
  const addBtn = document.getElementById(addBtnId);

  function submit() {
    if (ctl.addOtherEntry(input.value)) input.value = '';
  }

  addBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
}

/* ---- AI: Technical Documents "Other" field only ---- */

function runTechDocsAi() {
  const suggestions = AI_TECH_DOC_POOL.filter((label) => !techCardCtl.hasLabel(label)).slice(0, 4);
  showTechDocsAiReview(suggestions);
}

function showTechDocsAiReview(suggestions) {
  if (suggestions.length === 0) {
    openDialog({
      title: 'Generate with AI',
      bodyHtml: `<p class="att-ai-empty-note">All suggested technical documents are already selected.</p>`,
    });
    return;
  }

  openDialog({
    title: 'Suggested technical documents',
    bodyHtml: `
      <p class="att-ai-empty-note">Based on Basic Details, BOQ, Scope of Work, and the Payment Schedule for this RFP, consider requesting:</p>
      <div class="att-ai-review-list">
        ${suggestions.map((label, i) => `
          <label class="att-ai-review-item">
            <input type="checkbox" checked data-suggest-index="${i}">
            <span class="att-ai-review-item-label">${escapeHtmlAtt(label)}</span>
          </label>
        `).join('')}
      </div>
      <div class="att-modal-footer">
        <button class="att-btn-cancel" id="att-ai-cancel">Cancel</button>
        <button class="att-btn-cancel" id="att-ai-regenerate">Regenerate</button>
        <button class="att-btn-primary" id="att-ai-apply">Accept &amp; Apply</button>
      </div>
    `,
  });

  document.getElementById('att-ai-cancel').addEventListener('click', closeDialog);
  document.getElementById('att-ai-regenerate').addEventListener('click', () => {
    // Rotate the pool slightly so "regenerate" doesn't look like a no-op.
    const remaining = AI_TECH_DOC_POOL.filter((label) => !techCardCtl.hasLabel(label));
    const rotated = [...remaining.slice(1), remaining[0]].filter(Boolean).slice(0, 4);
    showTechDocsAiReview(rotated);
  });
  document.getElementById('att-ai-apply').addEventListener('click', () => {
    const checked = [...document.querySelectorAll('.att-ai-review-item input:checked')]
      .map((el) => suggestions[Number(el.dataset.suggestIndex)]);
    techCardCtl.addAiEntries(checked);
    closeDialog();
    showToast(checked.length > 0 ? `${checked.length} technical document${checked.length > 1 ? 's' : ''} added.` : 'No documents selected.');
  });
}

/* ---- Footer ---- */

function saveDraft() {
  persistAttachments();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  WizardStore.setStepStatus('attachments', 'completed');
  WizardStore.setStepStatus('qualification-criteria', 'current');
  window.location.href = 'wizard-qualification-criteria.html';
}

/* ---- Init ---- */

async function initAttachments() {
  WizardStore.setStepStatus('attachments', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'attachments',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="att-footer-back-btn" id="att-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Payments</span>
      </button>
    `,
  });
  document.getElementById('att-back-btn').addEventListener('click', () => {
    window.location.href = 'wizard-payments.html';
  });

  await renderAttachmentsPage();
  setWizardContinueEnabled(true); // neither field is mandatory
}

document.addEventListener('DOMContentLoaded', initAttachments);
