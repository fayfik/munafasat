/*
  Step 8 - Supporting Documents controller (final wizard step).
  Depends on: data-store.js, dialog.js, toast.js, file-upload.js,
  wizard-shell.js (all loaded before this file).

  Required Certificates and Technical Documents used to live here as two
  extra cards, but moved to Step 2 - Scope of Work (Card 6) — this step now
  only holds the optional Supporting documents upload. The header title/
  description below is a deliberate carryover from that old combined step
  (per spec) even though this step now only contains Supporting Documents.

  "Submit RFP" is the real, final submission action — there's no backend
  to submit to in this prototype, so it simulates success with a toast and
  an in-page confirmation screen rather than navigating anywhere broken.
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
      <div class="att-header-title">Certificates and Documents</div>
      <div class="att-header-desc">Select the certificates and technical documents vendors must submit as part of this RFP.</div>
    </div>

    <div class="att-cards-stack">
      <div class="att-card">
        <div class="att-card-title-row">
          <div class="att-card-title">Supporting documents <span class="att-card-optional-tag">Optional · Last section</span></div>
        </div>
        <div class="att-card-desc">Here you can attach the additional or reference documents that will be submitted to Vendor.</div>
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

/* ---- Completion state (this is the wizard's final step) ---- */

function renderAttCompletionState() {
  const mount = document.getElementById('wizard-step-content');
  mount.innerHTML = `
    <div class="att-completion-state">
      <div class="att-completion-icon"><i class="fa-solid fa-check"></i></div>
      <div class="att-completion-title">RFP Submitted Successfully</div>
      <div class="att-completion-desc">Your request has been submitted and is ready for the next stage of the procurement workflow.</div>
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

// The actual, final submission — invoked from the RFP Summary modal's
// "Submit Request" CTA, not directly from the footer button (see
// handleContinue below). There's no backend to submit to in this
// prototype, so this simulates a successful submission (toast + in-page
// confirmation screen) rather than navigating anywhere broken.
function performSubmission() {
  WizardStore.setStepStatus('attachments', 'completed');
  attCompleted = true;
  renderAttCompletionState();
  showToast('RFP submitted successfully.');
}

// Final step (per the new 8-step order) — "Submit RFP" no longer submits
// immediately; it opens the RFP Summary review modal first, and the modal
// itself performs the real submission once the creator confirms.
function handleContinue() {
  openRfpSummaryModal({ onSubmit: performSubmission });
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
  // apply (there's no next step) — this is the real, final submission CTA.
  const continueBtn = document.getElementById('wizard-continue-btn');
  if (continueBtn) continueBtn.innerHTML = 'Submit RFP <i class="fa-solid fa-arrow-right"></i>';

  await renderAttachmentsPage();
  setWizardContinueEnabled(true); // neither field is mandatory
}

document.addEventListener('DOMContentLoaded', initAttachments);
