/*
  Step 1 - Basic Details controller.
  Depends on: data-store.js, dialog.js, toast.js, searchable-select.js,
  date-picker.js, file-upload.js, wizard-shell.js (all loaded before this file).
*/

const CATEGORY_NAMES = CATEGORY_OPTIONS.map((c) => c.name);

/* ---- Naive EN<->AR word-substitution "translator" ----
   There's no real translation API in a static prototype; this is a small
   curated dictionary covering common procurement vocabulary so the AI
   sparkle icon produces a plausible (not linguistically perfect) result.
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
const AR_TO_EN_DICT = Object.fromEntries(
  Object.entries(EN_TO_AR_DICT).filter(([, ar]) => ar).map(([en, ar]) => [ar, en])
);

function naiveTranslate(text, dict) {
  return text.split(/\s+/).map((word) => {
    const clean = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
    const hit = dict[clean];
    return hit !== undefined ? (hit || '') : word;
  }).filter(Boolean).join(' ');
}

/* ---- Canned "AI generation" text ---- */
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

function genUrgencyJustification(formData, project) {
  const { projectName } = projectAndItemNames(formData, project);
  return `This request requires expedited processing due to an immediate operational risk associated with ${projectName}. Delaying procurement beyond the standard timeline risks service disruption and non-compliance with committed delivery dates. Immediate action is requested to mitigate this risk.`;
}

function genSingleVendorJustification(formData, project) {
  const { projectName } = projectAndItemNames(formData, project);
  return `[Vendor Name] has been identified as the only vendor capable of meeting the requirements of ${projectName} due to their unique technical capability, existing system compatibility, or proprietary licensing. Please review and confirm before proceeding with single-vendor procurement.`;
}

function genRequestNameEn(project) {
  return project ? `Procurement for ${project.name}` : 'New procurement request';
}

function genCategories(project) {
  return project ? [...project.suggestedCategories] : [];
}

/* ---- Step controller ---- */

const step1 = {
  formData: {},
  projects: [],
  projectsById: {},
  errors: {},
  selects: {},
  datePicker: null,
  fileUpload: null,
  saveTimer: null,
  agingTimer: null,
  lastSavedAt: null,
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
  if (!f.requestNameEn || !f.requestNameEn.trim()) errors.requestNameEn = 'Request name (En) is required.';
  if (!f.requestNameAr || !f.requestNameAr.trim()) errors.requestNameAr = 'Request name (Ar) is required.';
  if (!f.businessJustification || !f.businessJustification.trim()) errors.businessJustification = 'Business justification is required.';
  if (!f.department) errors.department = 'Department is required — select a project first.';
  if (!f.categories || f.categories.length === 0) errors.categories = 'Select at least one category.';
  if (f.urgencyChecked && (!f.urgencyJustification || !f.urgencyJustification.trim())) errors.urgencyJustification = 'Urgent justification is required.';
  if (f.singleVendorChecked && (!f.singleVendorJustification || !f.singleVendorJustification.trim())) errors.singleVendorJustification = 'Justification for single vendor is required.';
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

/* ---- AI suggestion boxes (section-level "Generate with AI") ---- */

function showAiSuggestion({ key, text, applyFn }) {
  const mount = document.getElementById(`ai-suggest-${key}`);
  if (!mount) return;
  mount.innerHTML = `
    <div class="step1-ai-suggested-box">
      <div class="step1-ai-suggested-label"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-suggested</div>
      <div class="step1-ai-suggested-text">${text}</div>
      <div class="step1-ai-suggested-actions">
        <button type="button" class="step1-ai-action-btn accept" data-act="accept"><i class="fa-solid fa-check"></i> Accept</button>
        <button type="button" class="step1-ai-action-btn edit" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>
        <button type="button" class="step1-ai-action-btn reject" data-act="reject"><i class="fa-solid fa-xmark"></i> Reject</button>
      </div>
    </div>
  `;
  mount.querySelector('[data-act="accept"]').addEventListener('click', () => { applyFn(text); mount.innerHTML = ''; });
  mount.querySelector('[data-act="edit"]').addEventListener('click', () => { applyFn(text, true); mount.innerHTML = ''; });
  mount.querySelector('[data-act="reject"]').addEventListener('click', () => { mount.innerHTML = ''; });
}

function confirmSectionAi(fieldDefs) {
  openDialog({
    title: 'Generate with AI',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Would you like AI to fill this section using the information already provided?
      </p>
      <div class="save-filter-actions">
        <button class="filter-btn-outline" id="ai-confirm-no">No</button>
        <button class="filter-btn-primary" id="ai-confirm-yes">Yes</button>
      </div>
    `,
  });
  document.getElementById('ai-confirm-no').addEventListener('click', closeDialog);
  document.getElementById('ai-confirm-yes').addEventListener('click', () => {
    closeDialog();
    const eligible = fieldDefs.filter((f) => f.isApplicable() && f.isEmpty());
    if (eligible.length === 0) {
      showToast('Nothing to generate — this section is already filled in.');
      return;
    }
    eligible.forEach((f) => showAiSuggestion({ key: f.key, text: f.generate(), applyFn: f.apply }));
  });
}

/* ---- Rendering ---- */

function renderStep1() {
  const project = getProject();
  const f = step1.formData;

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
            <div class="radio-card${f.procurementCategory === 'general' ? ' selected' : ''}" data-value="general">
              <span class="radio-card-dot"></span>
              <div>
                <div class="radio-card-title">General procurement</div>
                <div class="radio-card-desc">Choose this for RFP creation, Tendering and regular procurement flow</div>
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
    </div>

    <div class="step1-section">
      <div class="step1-section-header">
        <div>
          <div class="step1-section-title">Request details</div>
          <div class="step1-section-desc">Kindly provide justification &amp; need for the request.</div>
        </div>
        <button type="button" class="step1-ai-section-btn" id="ai-section-2-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
      </div>

      <div class="step1-field-row">
        <div class="step1-field half">
          <label class="step1-field-label">Request name (En) <span class="step1-required">*</span></label>
          <div class="step1-input-with-ai">
            <input type="text" class="step1-input" id="field-request-name-en" placeholder="Type your request name here." value="${f.requestNameEn || ''}">
            <button type="button" class="step1-ai-icon-btn" id="ai-translate-to-en" title="Translate from Arabic"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
          </div>
          <div id="ai-suggest-requestNameEn"></div>
          <div class="step1-field-error" id="err-requestNameEn"></div>
        </div>
        <div class="step1-field half">
          <label class="step1-field-label">Request name (Ar) <span class="step1-required">*</span></label>
          <div class="step1-input-with-ai" dir-rtl-icon>
            <input type="text" class="step1-input" id="field-request-name-ar" dir="rtl" placeholder="اكتب اسم طلبك هنا" value="${f.requestNameAr || ''}">
            <button type="button" class="step1-ai-icon-btn left" id="ai-translate-to-ar" title="Translate from English"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
          </div>
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
          <div id="ai-suggest-businessJustification"></div>
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
          <label class="step1-field-label">Categories <span class="step1-required">*</span></label>
          <div id="sel-categories"></div>
          <div id="ai-suggest-categories"></div>
          <div class="step1-field-error" id="err-categories"></div>
        </div>
      </div>
    </div>

    <div class="step1-section">
      <div class="step1-section-header">
        <div>
          <div class="step1-section-title">Priority and special conditions</div>
          <div class="step1-section-desc">Set urgency and flag special procurement conditions</div>
        </div>
        <button type="button" class="step1-ai-section-btn" id="ai-section-3-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
      </div>

      <div class="checkbox-card${f.urgencyChecked ? ' checked' : ''}" id="card-urgency">
        <div class="checkbox-card-header" id="card-urgency-header">
          <span class="checkbox-card-checkbox"><i class="fa-solid fa-check" style="font-size:10px;"></i></span>
          <div>
            <div class="checkbox-card-title">Urgency</div>
            <div class="checkbox-card-desc">Select only when there is an immediate operational risk, safety incident, or critical deadline that cannot be deferred through standard processing timelines.</div>
          </div>
        </div>
        <div class="checkbox-card-reveal">
          <label class="step1-field-label">Urgent justification <span class="step1-required">*</span></label>
          <div class="step1-textarea-toolbar">
            <button type="button" class="step1-generate-ai-btn" id="ai-gen-urgency"><i class="fa-solid fa-wand-magic-sparkles"></i> Autofill with AI</button>
          </div>
          <textarea class="step1-textarea" id="field-urgency-justification" placeholder="Describe the urgency - operational risk, safety incident, critical deadline or other extreme condition…" maxlength="800">${f.urgencyJustification || ''}</textarea>
          <div class="step1-char-count" id="count-urgencyJustification">${(f.urgencyJustification || '').length} / 800</div>
          <div id="ai-suggest-urgencyJustification"></div>
          <div class="step1-field-error" id="err-urgencyJustification"></div>
        </div>
      </div>

      <div class="checkbox-card${f.singleVendorChecked ? ' checked' : ''}" id="card-single-vendor">
        <div class="checkbox-card-header" id="card-single-vendor-header">
          <span class="checkbox-card-checkbox"><i class="fa-solid fa-check" style="font-size:10px;"></i></span>
          <div>
            <div class="checkbox-card-title">Single vendor</div>
            <div class="checkbox-card-desc">Select if only one vendor can meet the procurement requirement.</div>
          </div>
        </div>
        <div class="checkbox-card-reveal">
          <label class="step1-field-label">Justification for single Vendor <span class="step1-required">*</span></label>
          <div class="step1-textarea-toolbar">
            <button type="button" class="step1-generate-ai-btn" id="ai-gen-single-vendor"><i class="fa-solid fa-wand-magic-sparkles"></i> Autofill with AI</button>
          </div>
          <textarea class="step1-textarea" id="field-single-vendor-justification" placeholder="Describe about the Vendor &amp; why we will need to proceed with this vendor." maxlength="800">${f.singleVendorJustification || ''}</textarea>
          <div class="step1-char-count" id="count-singleVendorJustification">${(f.singleVendorJustification || '').length} / 800</div>
          <div id="ai-suggest-singleVendorJustification"></div>
          <div class="step1-field-error" id="err-singleVendorJustification"></div>
        </div>
      </div>
    </div>

    <div class="step1-section">
      <div class="step1-section-header">
        <div>
          <div class="step1-section-title">RFP project details</div>
          <div class="step1-section-desc">Contract type, duration, and evaluation committee members.</div>
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

      <div class="split-rfp-card">
        <div>
          <div class="split-rfp-title">Split RFP</div>
          <div class="split-rfp-desc" id="split-rfp-desc">${f.splitRfp ? 'Yes — divided into separate lots' : 'Toggle if RFP should be split into packages'}</div>
        </div>
        <button type="button" class="toggle-switch${f.splitRfp ? ' on' : ''}" id="toggle-split-rfp" aria-label="Split RFP"></button>
      </div>
    </div>

    <div class="step1-section">
      <div class="step1-section-header">
        <div>
          <div class="step1-section-title">Supporting documents <span style="font-weight:400; color:var(--text-tertiary);">(optional)</span></div>
          <div class="step1-section-desc">Attach TOR, quotations, and technical specification.</div>
        </div>
        <button type="button" class="step1-ai-section-btn" id="ai-section-5-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI</button>
      </div>
      <div id="upload-documents"></div>
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

  // Section 2 - request name EN/AR
  const enInput = document.getElementById('field-request-name-en');
  const arInput = document.getElementById('field-request-name-ar');
  enInput.addEventListener('input', (e) => patchForm({ requestNameEn: e.target.value }));
  arInput.addEventListener('input', (e) => patchForm({ requestNameAr: e.target.value }));

  const translateToEnBtn = document.getElementById('ai-translate-to-en');
  const translateToArBtn = document.getElementById('ai-translate-to-ar');
  function refreshTranslateButtons() {
    translateToEnBtn.disabled = !arInput.value.trim();
    translateToEnBtn.title = translateToEnBtn.disabled ? 'Enter the Arabic name first' : 'Translate from Arabic';
    translateToArBtn.disabled = !enInput.value.trim();
    translateToArBtn.title = translateToArBtn.disabled ? 'Enter the English name first' : 'Translate from English';
  }
  refreshTranslateButtons();
  enInput.addEventListener('input', refreshTranslateButtons);
  arInput.addEventListener('input', refreshTranslateButtons);

  translateToEnBtn.addEventListener('click', () => {
    if (translateToEnBtn.disabled) return;
    const translated = naiveTranslate(arInput.value, AR_TO_EN_DICT);
    enInput.value = translated;
    patchForm({ requestNameEn: translated });
    refreshTranslateButtons();
  });
  translateToArBtn.addEventListener('click', () => {
    if (translateToArBtn.disabled) return;
    const translated = naiveTranslate(enInput.value, EN_TO_AR_DICT);
    arInput.value = translated;
    patchForm({ requestNameAr: translated });
  });

  // Section 2 - business justification
  const justificationEl = document.getElementById('field-business-justification');
  justificationEl.addEventListener('input', (e) => {
    patchForm({ businessJustification: e.target.value });
    document.getElementById('count-businessJustification').textContent = `${e.target.value.length} / 1200`;
  });
  document.getElementById('ai-gen-justification').addEventListener('click', () => {
    showAiSuggestion({
      key: 'businessJustification',
      text: genBusinessJustification(step1.formData, getProject()),
      applyFn: (text, focus) => {
        justificationEl.value = text;
        patchForm({ businessJustification: text });
        document.getElementById('count-businessJustification').textContent = `${text.length} / 1200`;
        if (focus) justificationEl.focus();
      },
    });
  });

  // Section 2 - categories
  step1.selects.categories = createSearchableSelect({
    mountId: 'sel-categories',
    mode: 'multi',
    options: CATEGORY_NAMES.map((name) => ({ value: name, label: name })),
    selected: f.categories || [],
    placeholder: 'Select categories.',
    searchPlaceholder: 'Search categories',
    onChange: (vals) => patchForm({ categories: vals }),
  });

  document.getElementById('ai-section-2-btn').addEventListener('click', () => {
    confirmSectionAi([
      { key: 'requestNameEn', isApplicable: () => true, isEmpty: () => !step1.formData.requestNameEn, generate: () => genRequestNameEn(getProject()), apply: (text) => { enInput.value = text; patchForm({ requestNameEn: text }); refreshTranslateButtons(); } },
      { key: 'businessJustification', isApplicable: () => true, isEmpty: () => !step1.formData.businessJustification, generate: () => genBusinessJustification(step1.formData, getProject()), apply: (text) => { justificationEl.value = text; patchForm({ businessJustification: text }); document.getElementById('count-businessJustification').textContent = `${text.length} / 1200`; } },
      { key: 'categories', isApplicable: () => true, isEmpty: () => !(step1.formData.categories || []).length, generate: () => genCategories(getProject()).join(', ') || 'Managed services', apply: (text) => { const vals = text.split(',').map((s) => s.trim()).filter(Boolean); step1.selects.categories.setSelected(vals); patchForm({ categories: vals }); } },
    ]);
  });

  // Section 3 - urgency
  const urgencyCard = document.getElementById('card-urgency');
  document.getElementById('card-urgency-header').addEventListener('click', () => {
    const checked = !urgencyCard.classList.contains('checked');
    urgencyCard.classList.toggle('checked', checked);
    patchForm({ urgencyChecked: checked });
  });
  const urgencyTextarea = document.getElementById('field-urgency-justification');
  urgencyTextarea.addEventListener('input', (e) => {
    patchForm({ urgencyJustification: e.target.value });
    document.getElementById('count-urgencyJustification').textContent = `${e.target.value.length} / 800`;
  });
  document.getElementById('ai-gen-urgency').addEventListener('click', () => {
    showAiSuggestion({
      key: 'urgencyJustification',
      text: genUrgencyJustification(step1.formData, getProject()),
      applyFn: (text) => {
        urgencyTextarea.value = text;
        patchForm({ urgencyJustification: text });
        document.getElementById('count-urgencyJustification').textContent = `${text.length} / 800`;
      },
    });
  });

  // Section 3 - single vendor
  const vendorCard = document.getElementById('card-single-vendor');
  document.getElementById('card-single-vendor-header').addEventListener('click', () => {
    const checked = !vendorCard.classList.contains('checked');
    vendorCard.classList.toggle('checked', checked);
    patchForm({ singleVendorChecked: checked });
  });
  const vendorTextarea = document.getElementById('field-single-vendor-justification');
  vendorTextarea.addEventListener('input', (e) => {
    patchForm({ singleVendorJustification: e.target.value });
    document.getElementById('count-singleVendorJustification').textContent = `${e.target.value.length} / 800`;
  });
  document.getElementById('ai-gen-single-vendor').addEventListener('click', () => {
    showAiSuggestion({
      key: 'singleVendorJustification',
      text: genSingleVendorJustification(step1.formData, getProject()),
      applyFn: (text) => {
        vendorTextarea.value = text;
        patchForm({ singleVendorJustification: text });
        document.getElementById('count-singleVendorJustification').textContent = `${text.length} / 800`;
      },
    });
  });

  document.getElementById('ai-section-3-btn').addEventListener('click', () => {
    confirmSectionAi([
      { key: 'urgencyJustification', isApplicable: () => step1.formData.urgencyChecked, isEmpty: () => !step1.formData.urgencyJustification, generate: () => genUrgencyJustification(step1.formData, getProject()), apply: (text) => { urgencyTextarea.value = text; patchForm({ urgencyJustification: text }); document.getElementById('count-urgencyJustification').textContent = `${text.length} / 800`; } },
      { key: 'singleVendorJustification', isApplicable: () => step1.formData.singleVendorChecked, isEmpty: () => !step1.formData.singleVendorJustification, generate: () => genSingleVendorJustification(step1.formData, getProject()), apply: (text) => { vendorTextarea.value = text; patchForm({ singleVendorJustification: text }); document.getElementById('count-singleVendorJustification').textContent = `${text.length} / 800`; } },
    ]);
  });

  // Section 4 - date + duration
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

  // Split RFP toggle
  document.getElementById('toggle-split-rfp').addEventListener('click', (e) => {
    const on = !e.currentTarget.classList.contains('on');
    e.currentTarget.classList.toggle('on', on);
    document.getElementById('split-rfp-desc').textContent = on ? 'Yes — divided into separate lots' : 'Toggle if RFP should be split into packages';
    patchForm({ splitRfp: on });
  });

  // Section 5 - file upload
  step1.fileUpload = createFileUpload({
    mountId: 'upload-documents',
    acceptExtensions: ['pdf', 'xlsx', 'docx'],
    maxSizeMB: 25,
    initialFiles: f.documents || [],
    onChange: (files) => patchForm({ documents: files }),
  });

  document.getElementById('ai-section-5-btn').addEventListener('click', () => {
    confirmSectionAi([]); // no text fields to fill in this section — shows the "nothing to generate" toast
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
    onChange: (vals) => patchForm({ budgetedItemIds: vals }),
  });
}

function onProjectChange(projectId) {
  const project = projectId ? step1.projectsById[projectId] : null;
  const patch = {
    projectId,
    department: project ? project.department : '',
    budgetedItemIds: [],
  };
  // Auto-populate categories from the project, but only if the user hasn't
  // already customized the categories field (don't clobber their edits).
  if (project && (!step1.formData.categories || step1.formData.categories.length === 0)) {
    patch.categories = [...project.suggestedCategories];
  }
  step1.formData = { ...step1.formData, ...patch };
  WizardStore.updateFormData(patch);
  scheduleSave();

  document.getElementById('field-department').value = patch.department;
  if (step1.selects.categories && patch.categories) step1.selects.categories.setSelected(patch.categories);
  renderBudgetedItemsSelect();
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
