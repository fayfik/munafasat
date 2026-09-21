/*
  Step 1 - Basic Details controller.
  Depends on: data-store.js, dialog.js, toast.js, table.js (formatDate),
  searchable-select.js, date-picker.js, ai-generate.js, guided-card.js,
  wizard-shell.js (all loaded before this file).

  Section 1 ("Project & Item details") and Section 2 ("Request details")
  are each rendered as one GuidedCard (components/guided-card) — Section 1
  starts 'active', Section 2 starts 'locked'. The moment at least one
  Budgeted Item is selected in Section 1, Section 1 becomes 'completed'
  (collapses, but its header stays clickable to re-expand for review) and
  Section 2 becomes 'active'. Clearing every Budgeted Item again reverses
  both — nothing already entered is discarded, only the cards' visual
  state changes.

  Within Section 1 itself, Fields 2-4 (Cost centre / Select project /
  Budgeted items) reveal one at a time as the field before them is filled —
  that's plain field-row show/hide, independent of the GuidedCard-level
  section state above it.
*/

function escapeHtmlStep1(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---- Naive EN->AR word-substitution "translator" ----
   There's no real translation/fetch API in a static prototype; this is a
   small curated dictionary covering common procurement vocabulary, reused
   to simulate the auto-fetched Arabic request name (Request name (Ar) has
   no manual entry or AI icon of its own — it's derived from the English
   name the same way a real backend lookup would populate it).
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

// Request name (En)/(Ar) are not free-text — both are disabled and
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

// Item name -> "what this project includes" keyword heuristic, layered on
// top of the project's own suggestedCategories to simulate "AI analyzes
// Project/Items" for the recommendation banner below Field 5.
const INCLUDES_KEYWORD_MAP = [
  { keywords: ['security', 'firewall', 'endpoint', 'soc'], category: 'Cybersecurity infrastructure' },
  { keywords: ['network', 'switch', 'cabling'], category: 'Network infrastructure' },
  { keywords: ['license', 'software'], category: 'Software licenses' },
  { keywords: ['cloud'], category: 'Cloud services' },
  { keywords: ['consult', 'advisory', 'legal', 'compliance'], category: 'Consulting services' },
  { keywords: ['managed', 'support', 'maintenance', 'training'], category: 'Managed services' },
];

function computeRecommendedIncludes(project, budgetedItemIds) {
  if (!project) return [];
  const set = new Set(project.suggestedCategories || []);
  const items = (budgetedItemIds || []).map((id) => project.budgetedItems.find((i) => i.id === id)).filter(Boolean);
  items.forEach((item) => {
    const name = item.name.toLowerCase();
    INCLUDES_KEYWORD_MAP.forEach(({ keywords, category }) => {
      if (keywords.some((k) => name.includes(k))) set.add(category);
    });
  });
  return [...set];
}

// Field 2 (Cost centre) is now resolved from the procurement category
// itself, before a project/items are even chosen. Souq Etimad procurements
// only ever route through one fixed cost centre (single option -> prefilled
// + locked); the regular Procurement requests path can land on any cost
// centre in the directory, so it stays searchable/enabled. Once a project
// is later selected in Field 3, the cost centre already chosen here is left
// as-is — it doesn't get re-derived from the project's items.
function getCostCentreOptionsForCategory(category, projects) {
  if (category === 'souq-etimad') {
    return [{ id: 'CC-1006', name: 'Corporate Administration', code: 'CKT006KBS' }];
  }
  if (category === 'procurement-requests') {
    const map = new Map();
    projects.forEach((p) => (p.budgetedItems || []).forEach((i) => (i.costCentres || []).forEach((cc) => map.set(cc.id, cc))));
    return [...map.values()];
  }
  return [];
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
  recommendedIncludes: [],
  dismissedIncludesRecommendations: new Set(),
  section1Expanded: false,
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
  if (f.procurementCategory && !f.costCentreId) errors.costCentreId = 'Select a cost centre.';
  if (!f.projectId) errors.projectId = 'Select a project.';
  if (f.projectId && (!f.budgetedItemIds || f.budgetedItemIds.length === 0)) errors.budgetedItemIds = 'Select at least one budgeted item.';
  if (!f.requestNameEn || !f.requestNameEn.trim()) errors.requestNameEn = 'Request name (En) will be auto-filled once an item is selected.';
  if (!f.requestNameAr || !f.requestNameAr.trim()) errors.requestNameAr = 'Request name (Ar) will be auto-filled once an item is selected.';
  if (!f.businessJustification || !f.businessJustification.trim()) errors.businessJustification = 'Business justification is required.';
  if (!f.department) errors.department = 'Department is required — select a project first.';
  if (!f.projectIncludes || f.projectIncludes.length === 0) errors.projectIncludes = 'Select at least one item.';
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
   warning/confirmation that AI-recommended items were left un-actioned
   (neither added nor explicitly dismissed). ---- */
function hasUnactionedIncludesRecommendations() {
  const selected = step1.formData.projectIncludes || [];
  return step1.recommendedIncludes.some(
    (d) => !selected.includes(d) && !step1.dismissedIncludesRecommendations.has(d)
  );
}

/* ---- Section state (drives the two GuidedCards) ---- */

function getSection1State() {
  return (step1.formData.budgetedItemIds || []).length > 0 ? 'completed' : 'active';
}

function getSection2State() {
  return getSection1State() === 'completed' ? 'active' : 'locked';
}

/* ---- Section 1 body ---- */

function buildSection1BodyHtml() {
  const f = step1.formData;
  const project = getProject();
  const budgetedItemIds = f.budgetedItemIds || [];

  return `
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

    <div class="step1-field-row" id="cost-centre-row" style="${f.procurementCategory ? '' : 'display:none;'}">
      <div class="step1-field">
        <label class="step1-field-label">Cost centre <span class="step1-required">*</span></label>
        <div id="sel-cost-centre"></div>
        <div class="step1-field-error" id="err-costCentreId"></div>
      </div>
    </div>

    <div class="step1-field-row" id="project-row" style="${f.costCentreId ? '' : 'display:none;'}">
      <div class="step1-field">
        <label class="step1-field-label">Select project <span class="step1-required">*</span></label>
        <div id="sel-project"></div>
        <div id="project-suggestions"></div>
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
  `;
}

/* ---- Section 2 body ---- */

function buildSection2BodyHtml() {
  const f = step1.formData;

  return `
    <div class="step1-field-row">
      <div class="step1-field half">
        <label class="step1-field-label">Request name (En) <span class="step1-required">*</span></label>
        <input type="text" class="step1-input" id="field-request-name-en" disabled value="${escapeHtmlStep1(f.requestNameEn || '')}" placeholder="Select an item to auto-fill">
        <div class="step1-field-error" id="err-requestNameEn"></div>
      </div>
      <div class="step1-field half">
        <label class="step1-field-label">Request name (Ar) <span class="step1-required">*</span></label>
        <input type="text" class="step1-input" id="field-request-name-ar" dir="rtl" disabled value="${escapeHtmlStep1(f.requestNameAr || '')}" placeholder="سيتم التعبئة تلقائياً">
        <div class="step1-field-error" id="err-requestNameAr"></div>
      </div>
    </div>

    <div class="step1-field-row">
      <div class="step1-field">
        <label class="step1-field-label">Business Justification <span class="step1-required">*</span></label>
        <div class="step1-textarea-toolbar">
          <div class="aig-toolbar-row">
            <button type="button" class="step1-generate-ai-btn" id="ai-gen-justification"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
            <button type="button" class="aig-undo-btn" id="undo-businessJustification"></button>
            <div class="aig-ribbon" id="ribbon-businessJustification"></div>
          </div>
        </div>
        <textarea class="step1-textarea" id="field-business-justification" placeholder="Kindly provide justification for the RFP." maxlength="1200">${escapeHtmlStep1(f.businessJustification || '')}</textarea>
        <div class="step1-char-count" id="count-businessJustification">${(f.businessJustification || '').length} / 1200</div>
        <div class="step1-field-error" id="err-businessJustification"></div>
      </div>
    </div>

    <div class="step1-field-row">
      <div class="step1-field">
        <label class="step1-field-label">Department <span class="step1-required">*</span></label>
        <input type="text" class="step1-input" id="field-department" disabled value="${escapeHtmlStep1(f.department || '')}" placeholder="Select a project to auto-fill">
        <div class="step1-field-error" id="err-department"></div>
      </div>
    </div>

    <div class="step1-field-row">
      <div class="step1-field">
        <label class="step1-field-label">What does this project include <span class="step1-required">*</span></label>
        <div id="sel-project-includes"></div>
        <div class="step1-incl-chip-row" id="incl-chip-row"></div>
        <div class="step1-field-hint">The system routes RFP approvals to the departments relevant to what's selected here.</div>
        <div class="incl-ai-banner" id="incl-ai-banner"></div>
        <div class="step1-field-error" id="err-projectIncludes"></div>
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
  `;
}

/* ---- Rendering (full — used on load and on section-state transitions) ---- */

function renderStep1() {
  const contentMount = document.getElementById('wizard-step-content');
  if (contentMount && !document.getElementById('step1-guided-cards')) {
    contentMount.innerHTML = '<div id="step1-guided-cards"></div>';
  }

  // Every call below fully replaces the GuidedCards' DOM, which detaches
  // whatever mount nodes any previously-created searchable-selects closed
  // over — keeping those instances around would silently write into
  // removed nodes. Drop them all; wireStep1() recreates whichever ones the
  // now-visible fields need.
  step1.selects = {};

  const section1State = getSection1State();
  const section2State = getSection2State();

  renderGuidedCards({
    containerId: 'step1-guided-cards',
    sections: [
      {
        id: 'section1',
        title: 'Project & Item details',
        description: 'Provide the following basic details to proceed with procurement request.',
        bodyHtml: buildSection1BodyHtml(),
        state: section1State,
        expanded: step1.section1Expanded,
      },
      {
        id: 'section2',
        title: 'Request details',
        description: 'Kindly provide justification & need for the request.',
        bodyHtml: buildSection2BodyHtml(),
        state: section2State,
      },
    ],
    onToggle: (sectionId) => {
      if (sectionId === 'section1') {
        step1.section1Expanded = !step1.section1Expanded;
        renderStep1();
      }
    },
  });

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
      patchForm({ procurementCategory: next, costCentreId: null });
      // Souq Etimad collapses the stepper rail to Basic details + BOQ only
      // (data on other steps is untouched); re-selecting Procurement
      // requests restores all 8 immediately — no page reload needed.
      refreshWizardStepChrome('basic-details');
      renderCostCentreSelect();
      const row = document.getElementById('cost-centre-row');
      if (row) row.style.display = next ? '' : 'none';
      if (!next) {
        const projectRow = document.getElementById('project-row');
        if (projectRow) projectRow.style.display = 'none';
      }
    });
  });

  renderCostCentreSelect();

  // Section 1 - project select (only meaningful once cost centre is chosen)
  if (f.costCentreId) renderProjectSelect();

  // Section 1 - budgeted items (only if project selected)
  if (getProject()) renderBudgetedItemsSelect();

  // Section 2 wiring only applies once Section 2's body is actually in the
  // DOM (i.e. Section 2 is 'active') — every lookup below is guarded.
  const justificationEl = document.getElementById('field-business-justification');
  if (justificationEl) {
    justificationEl.addEventListener('input', (e) => {
      patchForm({ businessJustification: e.target.value });
      document.getElementById('count-businessJustification').textContent = `${e.target.value.length} / 1200`;
    });
  }
  const genBtn = document.getElementById('ai-gen-justification');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      const previous = step1.formData.businessJustification || '';
      runAiGenerate({
        confirmMessage: 'Generate with AI will override the content added - Do you want to proceed?',
        ribbonMountId: 'ribbon-businessJustification',
        undoMountId: 'undo-businessJustification',
        hasWork: () => true,
        performApply: () => {
          const text = genBusinessJustification(step1.formData, getProject());
          justificationEl.value = text;
          patchForm({ businessJustification: text });
          document.getElementById('count-businessJustification').textContent = `${text.length} / 1200`;
          return () => {
            justificationEl.value = previous;
            patchForm({ businessJustification: previous });
            document.getElementById('count-businessJustification').textContent = `${previous.length} / 1200`;
          };
        },
      });
    });
  }

  if (document.getElementById('sel-project-includes')) {
    step1.selects.projectIncludes = createSearchableSelect({
      mountId: 'sel-project-includes',
      mode: 'multi',
      showChips: false,
      options: CATEGORY_OPTIONS.map((c) => ({ value: c.name, label: c.name, line2Left: c.description })),
      selected: f.projectIncludes || [],
      placeholder: 'Select categories.',
      searchPlaceholder: 'Search categories',
      onChange: (vals) => { patchForm({ projectIncludes: vals }); renderInclChips(); renderInclAiBanner(); },
    });
    renderInclChips();
    renderInclAiBanner();
  }

  if (document.getElementById('dp-start-date')) {
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
  }
}

// Field 2 - Cost centre: options come from the procurement category, not
// from any project/item selection (which hasn't happened yet at this
// point in the flow). Prefilled + locked when the category yields exactly
// one cost centre (Souq Etimad); searchable/enabled otherwise.
function renderCostCentreSelect() {
  const category = step1.formData.procurementCategory;
  const mount = document.getElementById('sel-cost-centre');
  if (!mount) return;

  const options = getCostCentreOptionsForCategory(category, step1.projects);
  const isSingle = options.length === 1;
  let current = step1.formData.costCentreId;

  if (isSingle) {
    current = options[0].id;
    if (step1.formData.costCentreId !== current) patchForm({ costCentreId: current });
  } else if (current && !options.some((o) => o.id === current)) {
    current = null;
    patchForm({ costCentreId: null });
  }

  const projectRow = document.getElementById('project-row');
  if (projectRow) projectRow.style.display = current ? '' : 'none';
  if (current) renderProjectSelect();

  const optionDefs = options.map((o) => ({ value: o.id, label: o.code ? `${o.code} — ${o.name}` : o.name }));
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
      onChange: (val) => {
        patchForm({ costCentreId: val });
        const row = document.getElementById('project-row');
        if (row) row.style.display = val ? '' : 'none';
        if (val) {
          renderProjectSelect();
        } else {
          const itemsRow = document.getElementById('budgeted-items-row');
          if (itemsRow) itemsRow.style.display = 'none';
        }
      },
    });
  }
}

// Field 3 - Select project, plus the "similar past projects" AI suggestion
// list (From Scratch mode only) and its "Browse all projects" modal.
function renderProjectSelect() {
  const row = document.getElementById('project-row');
  if (row) row.style.display = step1.formData.costCentreId ? '' : 'none';
  if (!document.getElementById('sel-project')) return; // Section 1 is collapsed (completed, unexpanded) — nothing to wire

  step1.selects.project = createSearchableSelect({
    mountId: 'sel-project',
    mode: 'single',
    options: step1.projects.map((p) => ({ value: p.id, label: p.name, line2Left: p.projectNumber, line2Right: p.department })),
    selected: step1.formData.projectId || null,
    placeholder: 'Search by project name, code or category.',
    searchPlaceholder: 'Search projects',
    onChange: (projectId) => onProjectChange(projectId),
  });

  renderProjectSuggestions();
}

function isFromScratchMode() {
  return WizardStore.getState().mode !== 'previous';
}

async function renderProjectSuggestions() {
  const mount = document.getElementById('project-suggestions');
  if (!mount) return;
  if (step1.formData.projectId || !isFromScratchMode()) {
    mount.innerHTML = '';
    return;
  }

  const allRfps = await DataStore.getAllRfps();
  const eligible = allRfps
    .filter((r) => r.approvalStatus && r.approvalStatus !== 'Draft')
    .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  const top3 = eligible.slice(0, 3);
  if (top3.length === 0) {
    mount.innerHTML = '';
    return;
  }

  mount.innerHTML = `
    <div class="step1-suggestions">
      <div class="step1-suggestions-label"><i class="fa-solid fa-wand-magic-sparkles"></i> Similar past projects</div>
      ${top3.map((r) => buildSuggestionCardHtml(r)).join('')}
      <button type="button" class="step1-browse-link" id="step1-browse-all">Browse all projects <i class="fa-solid fa-arrow-right"></i></button>
    </div>
  `;

  mount.querySelectorAll('[data-import-rfp]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rfp = eligible.find((r) => r.id === btn.dataset.importRfp);
      if (rfp) importRfpIntoStep1(rfp);
    });
  });
  document.getElementById('step1-browse-all').addEventListener('click', () => openBrowseProjectsModal(eligible));
}

function buildSuggestionCardHtml(rfp) {
  return `
    <div class="step1-suggestion-card" data-view-rfp="${rfp.id}">
      <div class="step1-suggestion-main">
        <div class="step1-suggestion-title">${escapeHtmlStep1(rfp.title)}</div>
        <div class="step1-suggestion-meta">${escapeHtmlStep1(rfp.id)} · Created ${formatDate(rfp.createdDate)}</div>
      </div>
      <button type="button" class="step1-suggestion-import-btn" data-import-rfp="${rfp.id}">Import</button>
    </div>
  `;
}

function openBrowseProjectsModal(eligibleRfps) {
  openDialog({
    title: 'Browse similar past projects',
    size: 'large',
    bodyHtml: `
      <div class="step1-browse-scroll">
        ${eligibleRfps.map((r) => `
          <div class="step1-browse-row">
            <div class="step1-browse-main">
              <div class="step1-browse-title">${escapeHtmlStep1(r.title)}</div>
              <div class="step1-browse-meta">${escapeHtmlStep1(r.id)} · Created ${formatDate(r.createdDate)}</div>
            </div>
            <div class="step1-browse-actions">
              <button type="button" class="step1-browse-view-btn" data-view="${r.id}">View details</button>
              <button type="button" class="step1-browse-import-btn" data-import="${r.id}">Import</button>
            </div>
          </div>
        `).join('')}
      </div>
    `,
  });

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rfp = eligibleRfps.find((r) => r.id === btn.dataset.view);
      if (rfp) openRfpDetailPreview(rfp);
    });
  });
  document.querySelectorAll('[data-import]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rfp = eligibleRfps.find((r) => r.id === btn.dataset.import);
      if (rfp) {
        closeDialog();
        importRfpIntoStep1(rfp);
      }
    });
  });
}

function openRfpDetailPreview(rfp) {
  openDialog({
    title: rfp.title,
    bodyHtml: `
      <div class="step1-detail-row"><span class="step1-detail-label">RFP number</span><span class="step1-detail-value">${escapeHtmlStep1(rfp.id)}</span></div>
      <div class="step1-detail-row"><span class="step1-detail-label">Department</span><span class="step1-detail-value">${escapeHtmlStep1(rfp.department || '—')}</span></div>
      <div class="step1-detail-row"><span class="step1-detail-label">Category</span><span class="step1-detail-value">${escapeHtmlStep1(rfp.category || '—')}</span></div>
      <div class="step1-detail-row"><span class="step1-detail-label">Created on</span><span class="step1-detail-value">${formatDate(rfp.createdDate)}</span></div>
      <div class="step1-detail-row"><span class="step1-detail-label">Status</span><span class="step1-detail-value">${escapeHtmlStep1(rfp.status || '—')}</span></div>
      <div class="step1-detail-row"><span class="step1-detail-label">Description</span><span class="step1-detail-value">${escapeHtmlStep1(rfp.description || '—')}</span></div>
    `,
  });
}

// "Jump starter" import: pulls the past RFP's name/justification/department
// into Step 1's own fields in place (no navigation — we're already on this
// step). Project/Items still need to be picked manually since the mock RFP
// records aren't linked to a specific project id in this prototype.
function importRfpIntoStep1(rfp) {
  const patch = {
    requestNameEn: rfp.title || '',
    requestNameAr: rfp.title ? naiveTranslate(rfp.title, EN_TO_AR_DICT) : '',
    businessJustification: rfp.description || '',
    department: rfp.department || step1.formData.department || '',
    importedFromRfpId: rfp.id,
  };
  step1.formData = { ...step1.formData, ...patch };
  WizardStore.updateFormData(patch);
  scheduleSave();
  updateContinueState();
  showToast(`Imported "${rfp.title}" into this request.`);
  renderStep1();
}

function renderBudgetedItemsSelect() {
  const project = getProject();
  const row = document.getElementById('budgeted-items-row');
  if (row) row.style.display = project ? '' : 'none';
  if (!project) return;
  if (!document.getElementById('sel-budgeted-items')) return; // Section 1 is collapsed (completed, unexpanded) — nothing to wire

  step1.selects.budgetedItems = createSearchableSelect({
    mountId: 'sel-budgeted-items',
    mode: 'multi',
    options: project.budgetedItems.map((i) => ({ value: i.id, label: i.name })),
    selected: step1.formData.budgetedItemIds || [],
    placeholder: 'Select budgeted items.',
    searchPlaceholder: 'Search items',
    // The selected budgeted items below directly determine how many item
    // sections appear in Step 3 - BOQ (one section per item), and — per the
    // GuidedCard pattern — whether Section 1 is 'active' or 'completed'.
    onChange: (vals) => {
      const wasEmpty = (step1.formData.budgetedItemIds || []).length === 0;
      patchForm({ budgetedItemIds: vals });
      refreshAutoFetchedFields();
      const isEmpty = vals.length === 0;
      if (wasEmpty !== isEmpty) {
        // Section 1 <-> Section 2 state just flipped — needs a full
        // GuidedCard re-render (collapsing/expanding the cards themselves).
        renderStep1();
      }
    },
  });
}

// AI-recommended "what this project includes" chips: shows whichever
// recommended categories aren't already selected, with per-chip add/dismiss
// and an "Add all" CTA.
function renderInclAiBanner() {
  const mount = document.getElementById('incl-ai-banner');
  if (!mount) return;

  step1.recommendedIncludes = computeRecommendedIncludes(getProject(), step1.formData.budgetedItemIds);
  const selected = step1.formData.projectIncludes || [];
  const pending = step1.recommendedIncludes.filter(
    (d) => !selected.includes(d) && !step1.dismissedIncludesRecommendations.has(d)
  );

  if (pending.length === 0) {
    mount.innerHTML = '';
    return;
  }

  mount.innerHTML = `
    <div class="incl-ai-banner-inner">
      <div class="incl-ai-banner-label"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-recommended based on the selected project/items</div>
      <div class="incl-ai-chip-row">
        ${pending.map((d) => `
          <span class="incl-ai-chip" data-item="${escapeHtmlStep1(d)}">
            ${escapeHtmlStep1(d)}
            <button type="button" class="incl-ai-chip-add" data-add="${escapeHtmlStep1(d)}" title="Add"><i class="fa-solid fa-plus"></i></button>
            <button type="button" class="incl-ai-chip-dismiss" data-dismiss="${escapeHtmlStep1(d)}" title="Dismiss"><i class="fa-solid fa-xmark"></i></button>
          </span>
        `).join('')}
      </div>
      <button type="button" class="incl-ai-add-all-btn" id="incl-ai-add-all">Add all</button>
    </div>
  `;

  mount.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addRecommendedInclude(btn.dataset.add));
  });
  mount.querySelectorAll('[data-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => dismissRecommendedInclude(btn.dataset.dismiss));
  });
  document.getElementById('incl-ai-add-all').addEventListener('click', () => {
    pending.forEach((d) => addRecommendedInclude(d, { skipRender: true }));
    renderInclAiBanner();
  });
}

function addRecommendedInclude(name, { skipRender = false } = {}) {
  const current = step1.formData.projectIncludes || [];
  if (!current.includes(name)) {
    const next = [...current, name];
    step1.selects.projectIncludes.setSelected(next);
    patchForm({ projectIncludes: next });
    renderInclChips();
  }
  if (!skipRender) renderInclAiBanner();
}

function dismissRecommendedInclude(name) {
  step1.dismissedIncludesRecommendations.add(name);
  renderInclAiBanner();
}

// Custom chip row for "What does this project include" — check icon + name
// + remove icon, with a "+N…" overflow toggle (the searchable-select's own
// default chip row doesn't carry a check icon, so this field renders its
// own via showChips:false, same approach as Step 8's Attachments cards).
let step1InclChipsExpanded = false;
function renderInclChips() {
  const mount = document.getElementById('incl-chip-row');
  if (!mount) return;
  const selected = step1.formData.projectIncludes || [];
  const maxVisible = 6;
  const visible = step1InclChipsExpanded ? selected : selected.slice(0, maxVisible);
  const overflow = selected.length - visible.length;

  mount.innerHTML = `
    ${visible.map((name) => `
      <span class="step1-incl-chip" data-item="${escapeHtmlStep1(name)}">
        <i class="fa-solid fa-check"></i>
        ${escapeHtmlStep1(name)}
        <button type="button" class="step1-incl-chip-remove" data-remove="${escapeHtmlStep1(name)}"><i class="fa-solid fa-xmark"></i></button>
      </span>
    `).join('')}
    ${overflow > 0 ? `<span class="step1-incl-chip-overflow" id="incl-chip-overflow">+${overflow}…</span>` : ''}
  `;

  mount.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = selected.filter((v) => v !== btn.dataset.remove);
      step1.selects.projectIncludes.setSelected(next);
      patchForm({ projectIncludes: next });
      renderInclChips();
      renderInclAiBanner();
    });
  });
  const overflowEl = document.getElementById('incl-chip-overflow');
  if (overflowEl) {
    overflowEl.addEventListener('click', () => {
      step1InclChipsExpanded = true;
      renderInclChips();
    });
  }
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
  };
  // "What does this project include" is no longer silently pre-filled here
  // — it's populated entirely through the AI-recommendation banner ("Add
  // all" / per-chip Add), so the banner reliably has something to show as
  // soon as a project is selected instead of only surfacing item-driven
  // extras the auto-fill hadn't already absorbed.
  step1.dismissedIncludesRecommendations = new Set();
  step1.formData = { ...step1.formData, ...patch };
  WizardStore.updateFormData(patch);
  scheduleSave();

  const departmentInput = document.getElementById('field-department');
  if (departmentInput) departmentInput.value = patch.department;
  renderProjectSuggestions();
  renderBudgetedItemsSelect();
  refreshAutoFetchedFields();
  renderInclAiBanner();
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
  // Dynamic: normally goes to Scope of Work, but the Souq Etimad path (see
  // the procurement-category radio above) skips straight to BOQ instead.
  const next = wizardNextStep('basic-details');
  if (!next) return;
  WizardStore.setStepStatus(next.id, 'current');
  window.location.href = next.href;
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
