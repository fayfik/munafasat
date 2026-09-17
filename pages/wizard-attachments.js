/*
  Step 5 - Attachments (Certificates and Documents) controller.
  Depends on: data-store.js, dialog.js, toast.js, searchable-select.js,
  file-upload.js, wizard-shell.js (all loaded before this file).

  Supporting Documents (the first card) was originally on Step 1 and moved
  here in a later correction — it's optional and doesn't gate Continue.

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
    const addedIds = [];
    labels.forEach((label) => {
      if (!hasLabel(label)) {
        const id = newAttId();
        card.items.push({ id, label, source: 'ai' });
        addedIds.push(id);
      }
    });
    renderChips();
    persistAttachments();
    return addedIds;
  }

  function removeItemsByIds(ids) {
    card.items = card.items.filter((i) => !ids.includes(i.id));
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

  return { card, renderPredefinedSelect, renderChips, addOtherEntry, addAiEntries, removeItemsByIds, hasLabel };
}

let certCardCtl = null;
let techCardCtl = null;
let supportingDocsUpload = null;

function persistAttachments() {
  WizardStore.updateFormData({
    attachmentCertificates: certCardCtl.card.items,
    attachmentTechnicalDocuments: techCardCtl.card.items,
    supportingDocuments: supportingDocsUpload.getFiles(),
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
        <div class="att-card-title">Supporting documents <span style="font-weight:400; color:var(--text-tertiary);">(optional)</span></div>
        <div class="att-card-desc">Attach TOR, quotations, and technical specification.</div>
        <div id="att-supporting-docs-upload"></div>
      </div>

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
          <div class="aig-ribbon" id="ribbon-att-tech"></div>
          <button type="button" class="aig-undo-btn" id="undo-att-tech"></button>
        </div>

        <div class="att-chip-row" id="att-tech-chips"></div>
      </div>
    </div>
  `;

  supportingDocsUpload = createFileUpload({
    mountId: 'att-supporting-docs-upload',
    acceptExtensions: ['pdf', 'xlsx', 'docx'],
    maxSizeMB: 25,
    initialFiles: fd.supportingDocuments || [],
    onChange: () => persistAttachments(),
  });

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

/*
  AI: Technical Documents "Other" field only. Like BOQ/Payments, this adds
  new chips rather than filling a field value — "empty" means "there's at
  least one suggested document not already in the list" — Undo removes
  exactly the chips this run added (by id), leaving manually-added or
  previously-accepted ones untouched.
*/
function runTechDocsAi() {
  runAiGenerate({
    confirmMessage: 'Would you like AI to fill this field using the information already provided in your RFP?',
    ribbonMountId: 'ribbon-att-tech',
    undoMountId: 'undo-att-tech',
    emptyMessage: 'All suggested technical documents are already selected.',
    hasWork: () => AI_TECH_DOC_POOL.some((label) => !techCardCtl.hasLabel(label)),
    performApply: () => {
      const suggestions = AI_TECH_DOC_POOL.filter((label) => !techCardCtl.hasLabel(label)).slice(0, 4);
      const addedIds = techCardCtl.addAiEntries(suggestions);
      return () => techCardCtl.removeItemsByIds(addedIds);
    },
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
