/*
  Step 2 - Scope of Work controller.
  Depends on: data-store.js, dialog.js, toast.js, searchable-select.js,
  ai-generate.js (for the shared showAiRibbon/showAiUndoButton ribbon+Undo
  helpers, reused after the section-level review modal below applies),
  wizard-shell.js (all loaded before this file).

  Cards 1-5 are plain text fields, each with the app-wide per-field
  "Generate with AI" pattern, plus a section-level "Generate with AI" that
  reviews every currently-empty field across all five in one dialog.

  Card 6 (Required certificates) is a different shape — two independent
  chip collections (Required Certificates / Technical Documents), each
  built from a predefined searchable multi-select + a free-text "Other"
  entry + its own "Recommended certificates" AI CTA that adds suggested
  chips directly (no review dialog, mirroring the pattern this card used
  on the old Attachments step it moved here from).
*/

const SOW_CARDS = [
  {
    title: 'Project Overview',
    fields: [
      { key: 'executiveSummary', label: 'Executive Summary', placeholder: 'Provide a high-level overview of the project objectives and background...' },
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
      { key: 'locationRegion', label: 'Location / Region', placeholder: 'Specify the work location or region where goods and services will be delivered...' },
    ],
  },
  {
    title: 'Project program',
    fields: [
      { key: 'projectProgram', label: 'Project program', placeholder: 'Explain about the project timeline, deliverables per timeline.' },
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

/* ---- Canned generators (use real Step 1 data where relevant) ---- */

const SOW_GENERATORS = {
  executiveSummary: () => {
    const items = boqItemNames();
    const itemsText = items.length ? ` covering ${items.join(', ')}` : '';
    return `This RFP, "${sow.formData.requestNameEn || 'this request'}", is raised in support of ${projectName()}${itemsText}. It is intended to address an operational need within ${sow.formData.department || 'the requesting department'} and to ensure continuity and compliance with SIDF's procurement standards.`;
  },
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
  locationRegion: () => {
    const items = boqItemNames();
    const start = sow.formData.projectStartDate;
    const durationBit = start && sow.formData.durationValue
      ? ` Delivery is expected to align with the project's ${sow.formData.durationValue} ${(sow.formData.durationType || '').toLowerCase()} schedule starting ${new Date(`${start}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`
      : '';
    const itemsBit = items.length ? ` Delivery location applies to: ${items.join(', ')}.` : '';
    return `Riyadh, Kingdom of Saudi Arabia — SIDF Headquarters and/or ${sow.formData.department || 'requesting department'} premises.${itemsBit}${durationBit}`;
  },
  projectProgram: () => {
    const start = sow.formData.projectStartDate;
    const closure = computeSowClosureDate(sow.formData);
    if (!start) return 'Project timeline and deliverable milestones will be confirmed following contract award, aligned with the approved project schedule.';
    const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const closureLabel = closure ? closure.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
    return `The project is planned to run from ${startLabel} to ${closureLabel} (${sow.formData.durationValue || '—'} ${(sow.formData.durationType || '').toLowerCase()}), structured around key phases: kickoff and mobilization, execution and delivery of milestones per the Bill of Quantity, an interim progress review, and final acceptance/handover.`;
  },
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

/* ---- Card 6: Required certificates / Technical Documents ----
   Same shared-collection factory the old Attachments step used: predefined
   dropdown picks, custom "Other" entries, and AI-accepted suggestions all
   land in one unified `items` array per card, tagged with a `source` so
   they render as one chip collection without the three kinds mixing
   between the two cards. */

const AI_CERT_POOL = [
  'ISO 9001 Quality Management Certificate', 'Commercial Registration', 'Zakat Certificate', 'GOSI Certificate',
  'Etimad Registration', 'Civil Defense Certificate', 'Municipality Business License',
];

const AI_TECH_DOC_POOL = [
  'Technical Proposal', 'Product Datasheets', 'Compliance Matrix', 'Past Performance References',
  'Warranty Documentation', 'Installation Plan', 'Project Implementation Schedule',
  'Data Migration Plan', 'Security Compliance Certificate', 'Change Management Plan', 'Training and Handover Plan',
];

function newSowDocId() {
  return `sowdoc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtmlSow(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function makeSowDocCard({ mountPrefix, options, placeholder, initialItems }) {
  const card = {
    mountPrefix,
    options,
    placeholder,
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
      <span class="sow-doc-chip source-${item.source}" data-item-id="${item.id}">
        ${item.source === 'ai' ? '<i class="fa-solid fa-wand-magic-sparkles"></i>' : ''}
        <span class="sow-doc-chip-label">${escapeHtmlSow(item.label)}</span>
        <i class="fa-solid fa-xmark sow-doc-chip-remove" data-remove="${item.id}"></i>
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
    persistSowDocs();
  }

  function onPredefinedChange(selectedValues) {
    card.items = card.items.filter((i) => i.source !== 'predefined' || selectedValues.includes(i.id));
    selectedValues.forEach((value) => {
      if (!card.items.some((i) => i.source === 'predefined' && i.id === value)) {
        const opt = card.options.find((o) => o.value === value);
        if (opt) card.items.push({ id: value, label: opt.label, source: 'predefined' });
      }
    });
    renderChips();
    persistSowDocs();
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
    card.items.push({ id: newSowDocId(), label: value, source: 'custom' });
    renderChips();
    persistSowDocs();
    return true;
  }

  function addAiEntries(labels) {
    const addedIds = [];
    labels.forEach((label) => {
      if (!hasLabel(label)) {
        const id = newSowDocId();
        card.items.push({ id, label, source: 'ai' });
        addedIds.push(id);
      }
    });
    renderChips();
    persistSowDocs();
    return addedIds;
  }

  function removeItemsByIds(ids) {
    card.items = card.items.filter((i) => !ids.includes(i.id));
    renderChips();
    persistSowDocs();
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

function persistSowDocs() {
  WizardStore.updateFormData({
    scopeCertificates: certCardCtl.card.items,
    scopeTechnicalDocuments: techCardCtl.card.items,
  });
}

function buildSowDocSubcardHtml({ title, desc, mountPrefix, otherPlaceholder }) {
  return `
    <div class="sow-subcard">
      <div class="sow-subcard-header">
        <div>
          <div class="sow-subcard-title">${title}</div>
          <div class="sow-subcard-desc">${desc}</div>
        </div>
        <div class="aig-toolbar-row">
          <button type="button" class="sow-doc-ai-btn" id="${mountPrefix}-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Recommended certificates</button>
          <button type="button" class="aig-undo-btn" id="undo-${mountPrefix}"></button>
          <div class="aig-ribbon" id="ribbon-${mountPrefix}"></div>
        </div>
      </div>

      <div class="sow-doc-field">
        <label class="sow-doc-field-label">Select from list</label>
        <div id="${mountPrefix}-select"></div>
      </div>

      <div class="sow-doc-field">
        <label class="sow-doc-field-label">Other (not in list)</label>
        <div class="sow-doc-other-row">
          <input type="text" class="sow-doc-input" id="${mountPrefix}-other-input" placeholder="${otherPlaceholder}">
          <button type="button" class="sow-doc-add-btn" id="${mountPrefix}-other-add"><i class="fa-solid fa-plus"></i> Add</button>
        </div>
        <div class="sow-doc-field-error" id="${mountPrefix}-other-error"></div>
      </div>

      <div class="sow-doc-chip-row" id="${mountPrefix}-chips"></div>
    </div>
  `;
}

function buildCard6Html() {
  return `
    <div class="sow-card">
      <div class="sow-card-title">Required certificates</div>
      <div class="sow-subcard-stack">
        ${buildSowDocSubcardHtml({
          title: 'Required Certificates',
          desc: 'Select the compliance and legal certificates vendors must provide.',
          mountPrefix: 'sow-cert',
          otherPlaceholder: 'Type certificate name and press Add',
        })}
        ${buildSowDocSubcardHtml({
          title: 'Technical Documents',
          desc: 'Select the technical documents and evidence vendors must submit.',
          mountPrefix: 'sow-tech',
          otherPlaceholder: 'Type document name and press Add',
        })}
      </div>
    </div>
  `;
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
  "Recommended certificates" AI CTA (both sub-cards, same label per spec):
  adds suggested chips directly (no review dialog) — "empty" means "there's
  at least one suggested entry not already present." Undo removes exactly
  the chips this run added, leaving manual/previous AI entries untouched.
*/
function runDocAi({ mountPrefix, pool, ctl }) {
  runAiGenerate({
    confirmMessage: 'Would you like AI to suggest entries based on the selected project, items, and Scope of Work?',
    ribbonMountId: `ribbon-${mountPrefix}`,
    undoMountId: `undo-${mountPrefix}`,
    emptyMessage: 'All suggested entries are already selected.',
    hasWork: () => pool.some((label) => !ctl.hasLabel(label)),
    performApply: () => {
      const suggestions = pool.filter((label) => !ctl.hasLabel(label)).slice(0, 4);
      const addedIds = ctl.addAiEntries(suggestions);
      return () => ctl.removeItemsByIds(addedIds);
    },
  });
}

async function renderCard6() {
  const [certOptions, techOptions] = await Promise.all([
    DataStore.getAllCertificates(),
    DataStore.getAllTechnicalDocuments(),
  ]);

  certCardCtl = makeSowDocCard({
    mountPrefix: 'sow-cert',
    options: certOptions,
    placeholder: 'Choose required certificates…',
    initialItems: sow.formData.scopeCertificates || [],
  });

  techCardCtl = makeSowDocCard({
    mountPrefix: 'sow-tech',
    options: techOptions,
    placeholder: 'Choose required technical documents…',
    initialItems: sow.formData.scopeTechnicalDocuments || [],
  });

  document.getElementById('sow-card6-mount').innerHTML = buildCard6Html();

  certCardCtl.renderPredefinedSelect();
  certCardCtl.renderChips();
  techCardCtl.renderPredefinedSelect();
  techCardCtl.renderChips();

  wireOtherRow('sow-cert-other-input', 'sow-cert-other-add', certCardCtl);
  wireOtherRow('sow-tech-other-input', 'sow-tech-other-add', techCardCtl);

  document.getElementById('sow-cert-ai-btn').addEventListener('click', () => runDocAi({ mountPrefix: 'sow-cert', pool: AI_CERT_POOL, ctl: certCardCtl }));
  document.getElementById('sow-tech-ai-btn').addEventListener('click', () => runDocAi({ mountPrefix: 'sow-tech', pool: AI_TECH_DOC_POOL, ctl: techCardCtl }));
}

/* ---- Rendering (Cards 1-5) ---- */

function renderSowPage() {
  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="sow-header-row">
      <div class="sow-header-title">Scope of Work</div>
      <div class="sow-header-desc">Define the project scope, deliverables, locations, standards, timelines, and other requirements for this procurement.</div>
    </div>
    <div class="aig-toolbar-row sow-header-ai-row">
      <button type="button" class="sow-ai-section-btn" id="sow-section-ai-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
      <button type="button" class="aig-undo-btn" id="undo-sow-section"></button>
      <div class="aig-ribbon" id="ribbon-sow-section"></div>
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
      <div id="sow-card6-mount"></div>
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
  Approved, Edited, or Declined, plus bulk Approve all/Decline all, before
  anything is written to the actual textareas. Only currently-empty fields
  are ever suggested (never overwrites a user-entered value). Applying
  still ends in the same shared success ribbon + outlined Undo button used
  everywhere else, for consistency with the rest of the app. Card 6's
  chip collections aren't "fields" in this sense — they have their own
  per-card "Recommended certificates" AI CTAs instead.
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
  await renderCard6();
  setWizardContinueEnabled(true); // no mandatory fields in this step
}

document.addEventListener('DOMContentLoaded', initSow);
