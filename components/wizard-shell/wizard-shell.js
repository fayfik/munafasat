/*
  Wizard shell — the frame Steps 1-8 render inside.
  renderWizardShell({ mountId, currentStepId, onSaveDraft, onContinue })
  renders the header card, the vertical stepper (via components/stepper),
  an empty #wizard-step-content mount for the step page's own script to
  fill, and the fixed footer. `onSaveDraft` / `onContinue`, when given,
  replace the default footer button behavior (used by Step 1 to wire real
  save/validate logic); `setWizardSaveState` / `setWizardContinueEnabled`
  let the step's own script update footer state afterward (autosave ticks,
  validation changes).
  Depends on: data-store.js (WIZARD_STEPS/WizardStore), stepper.js,
  copilot-drawer.js, dialog.js, and pages/ai-assistant.js (for
  openAiAssistantModal(), behind "Try a new experience").
*/

function wizardNextStep(currentStepId) {
  const steps = WizardStore.getVisibleSteps();
  const idx = steps.findIndex((s) => s.id === currentStepId);
  return idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null;
}

function renderWizardStepperRail(currentStepId) {
  const state = WizardStore.getState();
  renderVerticalStepper({
    containerId: 'wizard-stepper-mount',
    steps: WizardStore.getVisibleSteps(),
    statuses: state.stepStatuses,
    onStepClick: (step) => { window.location.href = step.href; },
  });
}

// Re-renders the stepper rail and the footer's "Continue: <next step>"
// label after something changes which steps are visible — currently only
// Step 1's procurement category radio (Souq Etimad collapses the rail to
// 2 steps). Called instead of a full page reload so in-progress field
// state elsewhere on the page isn't disturbed.
function refreshWizardStepChrome(currentStepId) {
  renderWizardStepperRail(currentStepId);
  const next = wizardNextStep(currentStepId);
  const continueBtn = document.getElementById('wizard-continue-btn');
  if (continueBtn) {
    // BOQ becomes the final step on the Souq Etimad path (next === null).
    // "Continue" is a placeholder here pending exact copy from the source
    // spec (it called out "Continue" or "Submit" as options).
    continueBtn.innerHTML = `${next ? `Continue: ${next.title}` : 'Continue'} <i class="fa-solid fa-arrow-right"></i>`;
  }
}

function renderWizardShell({ mountId, currentStepId, onSaveDraft, onContinue, footerLeftHtml, footerActionsPrefixHtml }) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const state = WizardStore.getState();
  const next = wizardNextStep(currentStepId);
  const footerLeft = footerLeftHtml || `
    <div class="wizard-footer-save-state" id="wizard-save-state">
      <i class="fa-solid fa-circle-check"></i>
      <span>Saved just now</span>
    </div>
  `;

  mount.innerHTML = `
    <div class="wizard-shell">
      <div class="wizard-header-card">
        <span class="wizard-header-title">Create new request</span>
        <div class="wizard-header-actions">
          <button class="wizard-btn-secondary" id="wizard-copilot-btn">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>Copilot</span>
          </button>
          <button class="wizard-btn-secondary" id="wizard-new-experience-btn">
            <i class="fa-solid fa-sparkles"></i>
            <span>Try a new experience</span>
          </button>
        </div>
      </div>

      <div class="wizard-body">
        <div class="wizard-stepper-card" id="wizard-stepper-mount"></div>
        <div class="wizard-content-card" id="wizard-step-content">
          <div class="wizard-content-placeholder">This step's fields will be built in a follow-up phase.</div>
        </div>
      </div>
    </div>

    <div class="wizard-footer">
      ${footerLeft}
      <div class="wizard-footer-actions">
        ${footerActionsPrefixHtml || ''}
        <button class="wizard-btn-outline" id="wizard-save-draft-btn">Save as Draft</button>
        <button class="wizard-btn-continue" id="wizard-continue-btn" disabled>
          ${next ? `Continue: ${next.title}` : 'Continue'} <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  `;

  renderWizardStepperRail(currentStepId);

  document.getElementById('wizard-copilot-btn').addEventListener('click', openCopilotDrawer);
  document.getElementById('wizard-new-experience-btn').addEventListener('click', () => {
    // Opens the scripted Procurement AI Assistant inline (see
    // pages/ai-assistant.js: openAiAssistantModal()) rather than
    // navigating to the standalone page.
    openAiAssistantModal();
  });

  document.getElementById('wizard-save-draft-btn').addEventListener('click', () => {
    if (onSaveDraft) onSaveDraft();
    else window.location.href = 'my-requests.html';
  });

  document.getElementById('wizard-continue-btn').addEventListener('click', () => {
    if (onContinue) onContinue();
  });
}

function setWizardSaveState(html) {
  const el = document.getElementById('wizard-save-state');
  if (el) el.innerHTML = html;
}

function setWizardContinueEnabled(enabled) {
  const btn = document.getElementById('wizard-continue-btn');
  if (btn) btn.disabled = !enabled;
}
