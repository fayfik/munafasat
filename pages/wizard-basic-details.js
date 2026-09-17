/*
  Step 1 - Basic Details controller.
  Depends on: data-store.js, dialog.js, toast.js, searchable-select.js,
  date-picker.js, wizard-shell.js (all loaded before this file).
*/

/* ---- Naive EN->AR word-substitution "translator" ----
   There's no real translation/fetch API in a static prototype; this is a
   small curated dictionary covering common procurement vocabulary, reused
   to simulate the auto-fetched Arabic request name (Request name (Ar) has
   no manual entry or AI icon of its own anymore — it's derived from the
   English name the same way a real backend lookup would populate it).
   Unmatched words pass through unchanged. */
const EN_TO_AR_DICT = {
  procurement: 'مشتريات', request: 'طلب', of: '', for: 'ل', services: 'خدمات', service: 'خدمة',
  it: 'تقنية المعلومات', cloud: 'سحابي', network: 'شبكة', networking: 'شبكات', hardware: 'أجهزة',
  software: 'برمجيات', license: 'ترخيص', licenses: 'تراخيص', maintenance: 'صيانة', security: 'أمن',
  cybersecurity: 'الأمن السيبراني', training: 'تدريب', consulting: 'استشارات', vendor: 'مورد',
  new: 'جديد', annual: 'سنوي', office: 'مكتب', equipment: 'معدات', support: 'دعم', system: 'نظام',
  implementation: 'تنفيذ', upgrade: 'ترقية', subscription: 'اشتراك', audit: 'تدقيق', staff: 'موظفين',
  management: 'إدارة', development: 'تطوير', program: 'برنامج', project: 'مشروع', laptops: 'أجهزة حاسوب محمولة',
  chairs: 'كراسي', cleaning: 'تنظيف', insurance: 'تأمين', legal: 'قانوني', advisory: 'استشاري',
  infrastructure: 'بنية تحتية', data: 'بيانات', center: 'مركز', and: 'و', the: '', fleet: 'أسطول',
  vehicle: 'مركبة', leasing: 'تأجير', travel: 'سفر', corporate: 'مؤسسي', financial: 'مالي', systems: 'أنظمة',
};

function naiveTranslate(text, dict) {
  return text.split(/\s+/).map((word) => {
    const clean = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
    const hit = dict[clean];
    return hit !== undefined ? (hit || '') : word;
  }).filter(Boolean).join(' ');
}

/* ---- Canned "AI generation" / auto-fetch text ---- */
function projectAndItemNames(formData, project) {
  const projectName = project ? project.name : 'the selected project';
  const itemNames = project
    ? (formData.budgetedItemIds || []).map((id) => project.budgetedItems.find((i) => i.id === id)?.name).filter(Boolean)
    : [];
  return { projectName, itemsText: itemNames.length ? itemNames.join(', ') : 'the required items' };
}

function genBusinessJustification(formData, project) {
  const { projectName, itemsText } = projectAndItemNames(formData, project);
  const nameBit = formData.requestNameEn ? `"${formData.requestNameEn}"` : 'this request';
  return `This request (${nameBit}) is raised to support ${projectName}, covering ${itemsText}. The procurement is necessary to ensure timely delivery of project milestones, maintain operational continuity, and meet the department's committed timelines. Proceeding promptly will help avoid delays to dependent workstreams and ensure compliance with the approved project scope.`;
}

// Request name (En)/(Ar) are no longer free-text — both are disabled and
// auto-fetched once an item is selected in Section 1.
function genRequestNameEn(formData, project) {
  // Gated on an item being selected, not just a project — otherwise this
  // (and the Business Justification it feeds into) would fire with a
  // generic "the required items" filler the instant a project is picked.
  if (!project || !(formData.budgetedItemIds || []).length) return '';
  const { itemsText } = projectAndItemNames(formData, project);
  return `Procurement of ${itemsText} - ${project.name}`;
}

function genRequestNameAr(formData, project) {
  const en = genRequestNameEn(formData, project);
  return en ? naiveTranslate(en, EN_TO_AR_DICT) : '';
}

// Item name -> department keyword heuristic, layered on top of the
// project's own suggestedCategories to simulate "AI analyzes Project/Items"
// for the Concurrence Required Departments recommendation banner.
const DEPARTMENT_KEYWORD_MAP = [
  { keywords: ['security', 'firewall', 'endpoint', 'soc'], department: 'Cybersecurity infrastructure' },
  { keywords: ['network', 'switch', 'cabling'], department: 'Network infrastructure' },
  { keywords: ['license', 'software'], department: 'Software licenses' },
  { keywords: ['cloud'], department: 'Cloud services' },
  { keywords: ['consult', 'advisory', 'legal', 'compliance'], department: 'CONSULTING SERVICES' },
  { keywords: ['managed', 'support', 'maintenance', 'training'], department: 'Managed services' },
];

function computeRecommendedDepartments(project, budgetedItemIds) {
  if (!project) return [];
  const set = new Set(project.suggestedCategories || []);
  const items = (budgetedItemIds || []).map((id) => project.budgetedItems.find((i) => i.id === id)).filter(Boolean);
  items.forEach((item) => {
    const name = item.name.toLowerCase();
    DEPARTMENT_KEYWORD_MAP.forEach(({ keywords, department }) => {
      if (keywords.some((k) => name.includes(k))) set.add(department);
    });
  });
  return [...set];
}

// A selected budgeted item's cost centre(s) determine Field 4's options —
// union across every currently-selected item, deduped by id.
function computeCostCentreOptions(project, budgetedItemIds) {
  if (!project || !budgetedItemIds || budgetedItemIds.length === 0) return [];
  const items = project.budgetedItems.filter((i) => budgetedItemIds.includes(i.id));
  const map = new Map();
  items.forEach((i) => (i.costCentres || []).forEach((cc) => map.set(cc.id, cc)));
  return [...map.values()];
}

/* ---- Step controller ---- */

const step1 = {
  formData: {},
  projects: [],
  projectsById: {},
  errors: {},
  selects: {},
  datePicker: null,
  saveTimer: null,
  agingTimer: null,
  lastSavedAt: null,
  recommendedDepartments: [],
  dismissedDepartmentRecommendations: new Set(),
};

function getProject() {
  return step1.formData.projectId ? step1.projectsById[step1.formData.projectId] : null;
}

/* ---- Persistence / autosave ---- */

function patchForm(patch) {
  step1.formData = { ...step1.formData, ...patch };
  WizardStore.updateFormData(patch);
  scheduleSave();
  updateContinueState();
}

function scheduleSave() {
  setWizardSaveState('<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>Saving…</span>');
  clearTimeout(step1.saveTimer);
  step1.saveTimer = setTimeout(() => {
    step1.lastSavedAt = Date.now();
    setWizardSaveState('<i class="fa-solid fa-circle-check"></i><span>Saved just now</span>');
  }, 450);
}

function startAgingTicker() {
  clearInterval(step1.agingTimer);
  step1.agingTimer = setInterval(() => {
    if (!step1.lastSavedAt) return;
    const secs = Math.round((Date.now() - step1.lastSavedAt) / 1000);
    if (secs < 8) return; // "Saved just now" already showing / about to be overwritten by a fresher save
    setWizardSaveState(`<i class="fa-solid fa-circle-check"></i><span>Last saved ${secs}s ago</span>`);
  }, 5000);

  // Periodic simulated auto-save, independent of field activity.
  setInterval(() => {
    step1.lastSavedAt = Date.now();
  }, 10000);
}

/* ---- Validation ---- */

function validateStep1() {
  const f = step1.formData;
  const errors = {};

  if (!f.procurementCategory) errors.procurementCategory = 'Select a procurement category.';
  if (!f.projectId) errors.projectId = 'Select a project.';
  if (f.projectId && (!f.budgetedItemIds || f.budgetedItemIds.length === 0)) errors.budgetedItemIds = 'Select at least one budgeted item.';
  if (f.budgetedItemIds && f.budgetedItemIds.length > 0 && !f.costCentreId) errors.costCentreId = 'Select a cost centre.';
  if (!f.requestNameEn || !f.requestNameEn.trim()) errors.requestNameEn = 'Request name (En) will be auto-filled once an item is selected.';
  if (!f.requestNameAr || !f.requestNameAr.trim()) errors.requestNameAr = 'Request name (Ar) will be auto-filled once an item is selected.';
  if (!f.businessJustification || !f.businessJustification.trim()) errors.businessJustification = 'Business justification is required.';
  if (!f.department) errors.department = 'Department is required — select a project first.';
  if (!f.concurrenceDepartments || f.concurrenceDepartments.length === 0) errors.concurrenceDepartments = 'Select at least one concurrence required department.';
  if (!f.projectStartDate) errors.projectStartDate = 'Project start date is required.';

  step1.errors = errors;
  return Object.keys(errors).length === 0;
}

function updateContinueState() {
  setWizardContinueEnabled(validateStep1());
}

function showFieldErrors() {
  Object.keys(step1.errors).forEach((key) => {
    const el = document.getElementById(`err-${key}`);
    if (el) el.textContent = step1.errors[key];
  });
}

/* ---- Tentative closure date ---- */

function computeClosureDate() {
  const { projectStartDate, durationType, durationValue } = step1.formData;
  if (!projectStartDate || !durationValue) return null;
  const start = new Date(`${projectStartDate}T00:00:00`);
  const d = new Date(start);
  const n = Number(durationValue);
  if (durationType === 'Days') d.setDate(d.getDate() + n);
  else if (durationType === 'Weeks') d.setDate(d.getDate() + n * 7);
  else if (durationType === 'Months') d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  return d;
}

function renderClosureNote() {
  const el = document.getElementById('closure-note');
  if (!el) return;
  const date = computeClosureDate();
  el.innerHTML = date
    ? `Tentative project closure: <strong>${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>`
    : 'Tentative project closure: —';
}

/* ---- STUB: submission-time hook (full submission flow isn't built yet).
   When it is, call this at submit time — if it returns true, surface a
   warning/confirmation that AI-recommended concurrence departments were
   left un-actioned (neither added nor explicitly dismissed). ---- */
function hasUnactionedDepartmentRecommendations() {
  const selected = step1.formData.concurrenceDepartments || [];
  return step1.recommendedDepartments.some(
    (d) => !selected.includes(d) && !step1.dismissedDepartmentRecommendations.has(d)
  );
}

/* ---- Rendering ---- */

function renderStep1() {
  const project = getProject();
  const f = step1.formData;
  const budgetedItemIds = f.budgetedItemIds || [];

  const html = `
    <div class="step1-section">
      <div class="step1-section-header">
        <div>
          <div class="step1-section-title">Project &amp; Item details</div>
          <div class="step1-section-desc">Provide following basic details to proceed with procurement request.</div>
        </div>
      </div>

      <div class="step1-field-row">
        <div class="step1-field">
          <label class="step1-field-label">What is the category of the procurement? <span class="step1-required">*</span></label>
          <div class="radio-card-row" id="procurement-category-row">
            <div class="radio-card${f.procurementCategory === 'procurement-requests' ? ' selected' : ''}" data-value="procurement-requests">
              <span class="radio-card-dot"></span>
              <div>
                <div class="radio-card-title">Procurement requests</div>
                <div class="radio-card-desc">This covers the IT related procurements, general procurements RFP &amp; Direct Purchases</div>
              </div>
            </div>
            <div class="radio-card${f.procurementCategory === 'souq-etimad' ? ' selected' : ''}" data-value="souq-etimad">
              <span class="radio-card-dot"></span>
              <div>
                <div class="radio-card-title">Souq Etimad</div>
                <div class="radio-card-desc">Procure in the E-marketplace with defined suppliers from Etimad.</div>
              </div>
            </div>
          </div>
          <div class="step1-field-error" id="err-procurementCategory"></div>
        </div>
      </div>

      <div class="step1-field-row">
        <div class="step1-field">
          <label class="step1-field-label">Select project <span class="step1-required">*</span></label>
          <div id="sel-project"></div>
          <div class="step1-field-error" id="err-projectId"></div>
        </div>
      </div>

      <div class="step1-field-row" id="budgeted-items-row" style="${project ? '' : 'display:none;'}">
        <div class="step1-field">
          <label class="step1-field-label">Select Budgeted items <span class="step1-required">*</span></label>
          <div id="sel-budgeted-items"></div>
          <div class="step1-field-error" id="err-budgetedItemIds"></div>
        </div>
      </div>

      <div class="step1-field-row" id="cost-centre-row" style="${project && budgetedItemIds.length ? '' : 'display:none;'}">
        <div class="step1-field">
          <label class="step1-field-label">Cost centre <span class="step1-required">*</span></label>
          <div id="sel-cost-centre"></div>
          <div class="step1-field-error" id="err-costCentreId"></div>
        </div>
      </div>
    </div>

    <div class="step1-section">
      <div class="step1-section-header">
        <div>
          <div class="step1-section-title">Request details</div>
          <div class="step1-section-desc">Kindly provide justification &amp; need for the request.</div>
        </div>
      </div>

      <div class="step1-field-row">
        <div class="step1-field half">
          <label class="step1-field-label">Request name (En) <span class="step1-required">*</span></label>
          <input type="text" class="step1-input" id="field-request-name-en" disabled value="${f.requestNameEn || ''}" placeholder="Select an item to auto-fill">
          <div class="step1-field-error" id="err-requestNameEn"></div>
        </div>
        <div class="step1-field half">
          <label class="step1-field-label">Request name (Ar) <span class="step1-required">*</span></label>
          <input type="text" class="step1-input" id="field-request-name-ar" dir="rtl" disabled value="${f.requestNameAr || ''}" placeholder="سيتم التعبئة تلقائياً">
          <div class="step1-field-error" id="err-requestNameAr"></div>
        </div>
      </div>

      <div class="step1-field-row">
        <div class="step1-field">
          <label class="step1-field-label">Business Justification <span class="step1-required">*</span></label>
          <div class="step1-textarea-toolbar">
            <button type="button" class="step1-generate-ai-btn" id="ai-gen-justification"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
          </div>
          <textarea class="step1-textarea" id="field-business-justification" placeholder="Kindly provide justification for the RFP." maxlength="1200">${f.businessJustification || ''}</textarea>
          <div class="step1-char-count" id="count-businessJustification">${(f.businessJustification || '').length} / 1200</div>
          <div class="aig-ribbon" id="ribbon-businessJustification"></div>
          <button type="button" class="aig-undo-btn" id="undo-businessJustification"></button>
          <div class="step1-field-error" id="err-businessJustification"></div>
        </div>
      </div>

      <div class="step1-field-row">
        <div class="step1-field">
          <label class="step1-field-label">Department <span class="step1-required">*</span></label>
          <input type="text" class="step1-input" id="field-department" disabled value="${f.department || ''}" placeholder="Select a project to auto-fill">
          <div class="step1-field-error" id="err-department"></div>
        </div>
      </div>

      <div class="step1-field-row">
        <div class="step1-field">
          <label class="step1-field-label">Concurrence Required Department(s) <span class="step1-required">*</span></label>
          <div id="sel-concurrence-departments"></div>
          <div class="step1-field-hint">Following are the departments part for RFP approvals</div>
          <div class="dept-ai-banner" id="dept-ai-banner"></div>
          <div class="step1-field-error" id="err-concurrenceDepartments"></div>
        </div>
      </div>

      <div class="step1-field-row">
        <div class="step1-field third">
          <label class="step1-field-label">Project start date <span class="step1-required">*</span></label>
          <div id="dp-start-date"></div>
          <div class="step1-field-error" id="err-projectStartDate"></div>
        </div>
        <div class="step1-field third">
          <label class="step1-field-label">Duration type</label>
          <select class="step1-input" id="field-duration-type">
            ${['Days', 'Weeks', 'Months', 'Year'].map((opt) => `<option value="${opt}" ${f.durationType === opt ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </div>
        <div class="step1-field third">
          <label class="step1-field-label">Duration</label>
          <div class="step1-number-input">
            <input type="number" id="field-duration-value" min="0" value="${f.durationValue ?? ''}">
            <div class="step1-number-steppers">
              <button type="button" id="duration-step-up"><i class="fa-solid fa-chevron-up"></i></button>
              <button type="button" id="duration-step-down"><i class="fa-solid fa-chevron-down"></i></button>
            </div>
          </div>
          <div class="step1-closure-note" id="closure-note"></div>
        </div>
      </div>
    </div>

    <div class="step1-section">
      <div class="step1-section-header">
        <div>
          <div class="step1-section-title">Split procurement</div>
          <div class="step1-section-desc">Split the RFP into separate lots/packages if needed.</div>
        </div>
      </div>

      <div class="split-rfp-card">
        <div>
          <div class="split-rfp-title">Split RFP</div>
          <div class="split-rfp-desc" id="split-rfp-desc">${f.splitRfp ? 'Yes — divided into separate lots' : 'Toggle if RFP should be split into packages'}</div>
        </div>
        <button type="button" class="toggle-switch${f.splitRfp ? ' on' : ''}" id="toggle-split-rfp" aria-label="Split RFP"></button>
      </div>
    </div>
  `;

  document.getElementById('wizard-step-content').innerHTML = html;
  wireStep1();
  showFieldErrors();
}

/* ---- Wiring ---- */

function wireStep1() {
  const f = step1.formData;

  // Section 1 - radio cards
  // NOTE: read current selection from the DOM (classList), not from the
  // `f` snapshot captured when wireStep1() ran — patchForm() doesn't
  // trigger a full re-render, so `f` goes stale after the first click and
  // a second click would always recompute against the original state.
  document.querySelectorAll('#procurement-category-row .radio-card').forEach((card) => {
    card.addEventListener('click', () => {
      const val = card.dataset.value;
      const alreadySelected = card.classList.contains('selected');
      const next = alreadySelected ? null : val;
      document.querySelectorAll('#procurement-category-row .radio-card').forEach((c) => c.classList.remove('selected'));
      if (next) card.classList.add('selected');
      patchForm({ procurementCategory: next });
      // Souq Etimad collapses the stepper rail to Basic details + BOQ only
      // (data on other steps is untouched); re-selecting Procurement
      // requests restores all 8 immediately — no page reload needed.
      refreshWizardStepChrome('basic-details');
    });
  });

  // Section 1 - project select
  step1.selects.project = createSearchableSelect({
    mountId: 'sel-project',
    mode: 'single',
    options: step1.projects.map((p) => ({ value: p.id, label: p.name, line2Left: p.projectNumber, line2Right: p.department })),
    selected: f.projectId || null,
    placeholder: 'Search by project name, code or category.',
    searchPlaceholder: 'Search projects',
    onChange: (projectId) => onProjectChange(projectId),
  });

  // Section 1 - budgeted items (only if project selected)
  if (getProject()) renderBudgetedItemsSelect();
  renderCostCentreSelect();

  // Section 2 - request name EN/AR are disabled/auto-fetched, no wiring needed.

  // Section 2 - business justification
  const justificationEl = document.getElementById('field-business-justification');
  justificationEl.addEventListener('input', (e) => {
    patchForm({ businessJustification: e.target.value });
    document.getElementById('count-businessJustification').textContent = `${e.target.value.length} / 1200`;
  });
  document.getElementById('ai-gen-justification').addEventListener('click', () => {
    runFieldAiGenerate({
      ribbonMountId: 'ribbon-businessJustification',
      undoMountId: 'undo-businessJustification',
      isEmpty: () => !step1.formData.businessJustification,
      generate: () => genBusinessJustification(step1.formData, getProject()),
      apply: (text) => {
        justificationEl.value = text;
        patchForm({ businessJustification: text });
        document.getElementById('count-businessJustification').textContent = `${text.length} / 1200`;
      },
    });
  });

  // Section 2 - Concurrence Required Department(s)
  step1.selects.concurrenceDepartments = createSearchableSelect({
    mountId: 'sel-concurrence-departments',
    mode: 'multi',
    options: CATEGORY_OPTIONS.map((c) => ({ value: c.name, label: c.name })),
    selected: f.concurrenceDepartments || [],
    placeholder: 'Select departments.',
    searchPlaceholder: 'Search departments',
    onChange: (vals) => { patchForm({ concurrenceDepartments: vals }); renderDeptAiBanner(); },
  });
  renderDeptAiBanner();

  // Section 2 - date + duration (moved in from the former "RFP project details" section)
  step1.datePicker = createDatePicker({
    mountId: 'dp-start-date',
    value: f.projectStartDate || null,
    onChange: (iso) => { patchForm({ projectStartDate: iso }); renderClosureNote(); },
  });

  document.getElementById('field-duration-type').addEventListener('change', (e) => {
    patchForm({ durationType: e.target.value });
    renderClosureNote();
  });
  const durationInput = document.getElementById('field-duration-value');
  durationInput.addEventListener('input', (e) => {
    patchForm({ durationValue: e.target.value ? Number(e.target.value) : null });
    renderClosureNote();
  });
  document.getElementById('duration-step-up').addEventListener('click', () => {
    durationInput.value = Number(durationInput.value || 0) + 1;
    durationInput.dispatchEvent(new Event('input'));
  });
  document.getElementById('duration-step-down').addEventListener('click', () => {
    durationInput.value = Math.max(0, Number(durationInput.value || 0) - 1);
    durationInput.dispatchEvent(new Event('input'));
  });
  renderClosureNote();

  // Split procurement - Split RFP toggle
  document.getElementById('toggle-split-rfp').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on);
    document.getElementById('split-rfp-desc').textContent = on ? 'Yes — divided into separate lots' : 'Toggle if RFP should be split into packages';
    patchForm({ splitRfp: on });
  });
}

function renderBudgetedItemsSelect() {
  const project = getProject();
  const row = document.getElementById('budgeted-items-row');
  row.style.display = project ? '' : 'none';
  if (!project) return;

  step1.selects.budgetedItems = createSearchableSelect({
    mountId: 'sel-budgeted-items',
    mode: 'multi',
    options: project.budgetedItems.map((i) => ({ value: i.id, label: i.name })),
    selected: step1.formData.budgetedItemIds || [],
    placeholder: 'Select budgeted items.',
    searchPlaceholder: 'Search items',
    // NOTE: the selected budgeted items below directly determine how many
    // item sections appear in Step 2 - BOQ (one section per item). That
    // wiring isn't built yet — this just stores the selection.
    onChange: (vals) => {
      patchForm({ budgetedItemIds: vals });
      refreshAutoFetchedFields();
      renderCostCentreSelect();
      renderDeptAiBanner();
    },
  });
}

// Field 4 - Cost centre: prefilled + locked when the selected item(s) only
// have one associated cost centre; searchable/enabled when more than one.
function renderCostCentreSelect() {
  const project = getProject();
  const budgetedItemIds = step1.formData.budgetedItemIds || [];
  const row = document.getElementById('cost-centre-row');
  const show = !!project && budgetedItemIds.length > 0;
  if (row) row.style.display = show ? '' : 'none';
  if (!show) return;

  const options = computeCostCentreOptions(project, budgetedItemIds);
  const isSingle = options.length === 1;
  let current = step1.formData.costCentreId;

  if (isSingle) {
    current = options[0].id;
    if (step1.formData.costCentreId !== current) patchForm({ costCentreId: current });
  } else if (current && !options.some((o) => o.id === current)) {
    current = null;
    patchForm({ costCentreId: null });
  }

  const optionDefs = options.map((o) => ({ value: o.id, label: o.name }));
  if (step1.selects.costCentre) {
    step1.selects.costCentre.setOptions(optionDefs);
    step1.selects.costCentre.setSelected(current || null);
    step1.selects.costCentre.setDisabled(isSingle);
  } else {
    step1.selects.costCentre = createSearchableSelect({
      mountId: 'sel-cost-centre',
      mode: 'single',
      options: optionDefs,
      selected: current || null,
      disabled: isSingle,
      placeholder: 'Select cost centre.',
      searchPlaceholder: 'Search cost centres',
      onChange: (val) => patchForm({ costCentreId: val }),
    });
  }
}

// AI-recommended Concurrence Required Departments banner: shows whichever
// recommended departments aren't already selected, with per-chip add/
// dismiss and an "Add all" CTA.
function renderDeptAiBanner() {
  const mount = document.getElementById('dept-ai-banner');
  if (!mount) return;

  step1.recommendedDepartments = computeRecommendedDepartments(getProject(), step1.formData.budgetedItemIds);
  const selected = step1.formData.concurrenceDepartments || [];
  const pending = step1.recommendedDepartments.filter(
    (d) => !selected.includes(d) && !step1.dismissedDepartmentRecommendations.has(d)
  );

  if (pending.length === 0) {
    mount.innerHTML = '';
    return;
  }

  mount.innerHTML = `
    <div class="dept-ai-banner-inner">
      <div class="dept-ai-banner-label"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-recommended based on the selected project/items</div>
      <div class="dept-ai-chip-row">
        ${pending.map((d) => `
          <span class="dept-ai-chip" data-dept="${d}">
            ${d}
            <button type="button" class="dept-ai-chip-add" data-add="${d}" title="Add"><i class="fa-solid fa-plus"></i></button>
            <button type="button" class="dept-ai-chip-dismiss" data-dismiss="${d}" title="Dismiss"><i class="fa-solid fa-xmark"></i></button>
          </span>
        `).join('')}
      </div>
      <button type="button" class="dept-ai-add-all-btn" id="dept-ai-add-all">Add all</button>
    </div>
  `;

  mount.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addRecommendedDepartment(btn.dataset.add));
  });
  mount.querySelectorAll('[data-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => dismissRecommendedDepartment(btn.dataset.dismiss));
  });
  document.getElementById('dept-ai-add-all').addEventListener('click', () => {
    pending.forEach((d) => addRecommendedDepartment(d, { skipRender: true }));
    renderDeptAiBanner();
  });
}

function addRecommendedDepartment(name, { skipRender = false } = {}) {
  const current = step1.formData.concurrenceDepartments || [];
  if (!current.includes(name)) {
    const next = [...current, name];
    step1.selects.concurrenceDepartments.setSelected(next);
    patchForm({ concurrenceDepartments: next });
  }
  if (!skipRender) renderDeptAiBanner();
}

function dismissRecommendedDepartment(name) {
  step1.dismissedDepartmentRecommendations.add(name);
  renderDeptAiBanner();
}

// Recomputes Request name (En)/(Ar) and Business Justification from the
// current project + selected items. Request name fields always reflect the
// latest selection (they're disabled — there's nothing for the user to
// preserve). Business Justification is still user-editable, so it's only
// auto-filled while still empty, never overwritten.
function refreshAutoFetchedFields() {
  const project = getProject();
  const requestNameEn = genRequestNameEn(step1.formData, project);
  const patch = {
    requestNameEn,
    requestNameAr: genRequestNameAr(step1.formData, project),
  };
  const hasItems = (step1.formData.budgetedItemIds || []).length > 0;
  if (!step1.formData.businessJustification && hasItems) {
    // Build the justification off the request name we just derived (not
    // the stale one still in step1.formData) so it reads "this request
    // ("Procurement of...")" instead of the placeholder "this request".
    patch.businessJustification = genBusinessJustification({ ...step1.formData, requestNameEn }, project);
  }
  step1.formData = { ...step1.formData, ...patch };
  WizardStore.updateFormData(patch);
  scheduleSave();

  const enInput = document.getElementById('field-request-name-en');
  const arInput = document.getElementById('field-request-name-ar');
  if (enInput) enInput.value = patch.requestNameEn;
  if (arInput) arInput.value = patch.requestNameAr;
  if (patch.businessJustification !== undefined) {
    const jEl = document.getElementById('field-business-justification');
    if (jEl) {
      jEl.value = patch.businessJustification;
      document.getElementById('count-businessJustification').textContent = `${patch.businessJustification.length} / 1200`;
    }
  }
  updateContinueState();
}

function onProjectChange(projectId) {
  const project = projectId ? step1.projectsById[projectId] : null;
  const patch = {
    projectId,
    department: project ? project.department : '',
    budgetedItemIds: [],
    costCentreId: null,
  };
  // Auto-populate Concurrence Required Department(s) from the project, but
  // only if the user hasn't already customized the field (don't clobber
  // their edits).
  if (project && (!step1.formData.concurrenceDepartments || step1.formData.concurrenceDepartments.length === 0)) {
    patch.concurrenceDepartments = [...project.suggestedCategories];
  }
  step1.dismissedDepartmentRecommendations = new Set();
  step1.formData = { ...step1.formData, ...patch };
  WizardStore.updateFormData(patch);
  scheduleSave();

  document.getElementById('field-department').value = patch.department;
  if (step1.selects.concurrenceDepartments && patch.concurrenceDepartments) {
    step1.selects.concurrenceDepartments.setSelected(patch.concurrenceDepartments);
  }
  renderBudgetedItemsSelect();
  renderCostCentreSelect();
  refreshAutoFetchedFields();
  renderDeptAiBanner();
  updateContinueState();
}

/* ---- Footer actions ---- */

function saveDraft() {
  scheduleSave();
  showToast('Request saved as draft successfully.');
}

function handleContinue() {
  const valid = validateStep1();
  showFieldErrors();
  if (!valid) return;

  WizardStore.setStepStatus('basic-details', 'completed');
  WizardStore.setStepStatus('boq', 'current');
  window.location.href = 'wizard-boq.html';
}

/* ---- Legacy "Create from Previous Request" field migration ----
   create-request.js seeds formData with a shallow copy of the source RFP's
   own fields (title/description/department/...). Map the ones with a clear
   1:1 correspondence onto Step 1's field names, once, without clobbering
   anything already in Step 1's own shape. */
function migrateLegacyRfpFields() {
  const f = step1.formData;
  if (f.requestNameEn !== undefined) return; // already migrated / native Step 1 data
  const patch = {};
  if (f.title) patch.requestNameEn = f.title;
  if (f.description) patch.businessJustification = f.description;
  if (f.department) patch.department = f.department;
  if (Object.keys(patch).length) {
    step1.formData = { ...step1.formData, ...patch };
    WizardStore.updateFormData(patch);
  }
}

async function initStep1() {
  WizardStore.setStepStatus('basic-details', 'current');

  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'basic-details',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
  });

  step1.projects = await DataStore.getAllProjects();
  step1.projectsById = Object.fromEntries(step1.projects.map((p) => [p.id, p]));
  step1.formData = WizardStore.getFormData();
  migrateLegacyRfpFields();

  renderStep1();
  updateContinueState();
  step1.lastSavedAt = Date.now();
  startAgingTicker();
}

document.addEventListener('DOMContentLoaded', initStep1);
