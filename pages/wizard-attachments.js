/*
  Step 8 - Supporting Documents controller.
  Depends on: data-store.js, dialog.js, toast.js, file-upload.js,
  wizard-shell.js (all loaded before this file).

  Required Certificates and Technical Documents used to live here as two
  extra cards, but moved to Step 2 - Scope of Work (Card 6) — this step now
  only holds the optional Supporting documents upload plus the wizard's
  final completion state.
*/

let supportingDocsUpload = null;
let attCompleted = false;

function persistAttachments() {
  WizardStore.updateFormData({
    supportingDocuments: supportingDocsUpload.getFiles(),
  });
}

/* ---- Rendering ---- */

async function renderAttachmentsPage() {
  const fd = WizardStore.getFormData();

  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="att-header-row">
      <div class="att-header-title">Supporting Documents</div>
      <div class="att-header-desc">Optionally attach any additional reference documents for this RFP.</div>
    </div>

    <div class="att-cards-stack">
      <div class="att-card">
        <div class="att-card-title">Supporting documents <span style="font-weight:400; color:var(--text-tertiary);">(optional)</span></div>
        <div class="att-card-desc">Attach TOR, quotations, and technical specification.</div>
        <div id="att-supporting-docs-upload"></div>
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
}

/* ---- Completion state (this is now the wizard's final step) ---- */

function renderAttCompletionState() {
  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="att-completion-state">
      <div class="att-completion-icon"><i class="fa-solid fa-check"></i></div>
      <div class="att-completion-title">RFP Creation Complete</div>
      <div class="att-completion-desc">All 8 steps have been completed. Your request is ready for the next stage of the procurement workflow.</div>
      <button type="button" class="att-btn-primary" id="att-go-to-requests">Go to My Requests</button>
    </div>
  `;
  document.getElementById('att-go-to-requests').addEventListener('click', () => {
    window.location.href = 'my-requests.html';
  });
}

/* ---- Footer ---- */

function saveDraft() {
  persistAttachments();
  showToast('Request saved as draft successfully.');
}

// Final step now (per the new 8-step order) — there's no next step to hand
// off to, so this marks the whole wizard complete and swaps in an in-page
// completion state instead of navigating anywhere.
function handleContinue() {
  WizardStore.setStepStatus('attachments', 'completed');
  attCompleted = true;
  renderAttCompletionState();
  showToast('RFP created successfully.');
}

/* ---- Init ---- */

async function initAttachments() {
  WizardStore.setStepStatus('attachments', 'current');

  const prev = wizardPrevStep('attachments');
  renderWizardShell({
    mountId: 'wizard-shell-mount',
    currentStepId: 'attachments',
    onSaveDraft: saveDraft,
    onContinue: handleContinue,
    footerLeftHtml: `
      <button type="button" class="att-footer-back-btn" id="att-back-btn">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${prev.title}</span>
      </button>
    `,
  });
  document.getElementById('att-back-btn').addEventListener('click', () => {
    window.location.href = prev.href;
  });

  // Final step: the footer's default "Continue: <next step>" label doesn't
  // apply (there's no next step) — use the placeholder CTA text pending
  // exact copy from the source spec.
  const continueBtn = document.getElementById('wizard-continue-btn');
  if (continueBtn) continueBtn.innerHTML = 'Complete RFP Creation <i class="fa-solid fa-arrow-right"></i>';

  await renderAttachmentsPage();
  setWizardContinueEnabled(true); // neither field is mandatory
}

document.addEventListener('DOMContentLoaded', initAttachments);
