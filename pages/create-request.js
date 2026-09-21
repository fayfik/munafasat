/*
  Create Request entry page controller — Phase 4a.
  Depends on data-store.js, dialog.js, breadcrumbs.js (loaded before this file).
*/

function startWizardFromScratch() {
  WizardStore.start({ mode: 'scratch', sourceRequestId: null, formData: {} });
  window.location.href = 'wizard-basic-details.html';
}

// Each reason has a title + description (both shown in the searchable
// dropdown's option list) — room to add more reasons later without
// touching anything else.
const IMPORT_REASON_OPTIONS = [
  { value: 'retender', label: 'Retendering the RFP', description: 'Previous RFP is submitted in Etimad & needs approvals again as there is change in scope.' },
  { value: 'jumpstart', label: 'Using as Jump starter', description: "Reuse this RFP's structure and content as a quick starting template for a new, unrelated request." },
  { value: 'cancelled', label: 'Previous RFP was cancelled', description: 'The earlier RFP was cancelled before award — recreate it with the same details.' },
];

function escapeHtmlCr(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function startWizardFromPrevious(rfp, reasonValue) {
  // "Pulls ALL fields from the selected RFP into the new RFP" — the mock
  // RFP record IS the full set of fields this prototype has for it, so a
  // shallow spread already satisfies that end-to-end (Step 1's own
  // migrateLegacyRfpFields() maps the ones with a 1:1 wizard field).
  const formData = { ...rfp };
  if (reasonValue === 'retender') {
    // Business rule: carry the previous RFP's number as a reference
    // through the new RFP's workflow — stored, not surfaced prominently yet.
    formData.previousRfpNumber = rfp.id;
  }
  formData.importReason = reasonValue;
  WizardStore.start({ mode: 'previous', sourceRequestId: rfp.id, formData });
  window.location.href = 'wizard-basic-details.html';
}

function buildPrevRequestCardHtml(rfp) {
  return `
    <label class="cr-req-card">
      <input type="radio" name="cr-prev-request" value="${rfp.id}">
      <div class="cr-req-card-body">
        <div class="cr-req-card-title">${escapeHtmlCr(rfp.title)}</div>
        <div class="cr-req-card-meta">${formatDate(rfp.createdDate)} · ${escapeHtmlCr(rfp.id)}</div>
      </div>
    </label>
  `;
}

function buildPrevRequestModalHtml(eligibleRfps) {
  return `
    <div class="cr-modal-scroll">
      <div class="cr-modal-section">
        <div class="cr-modal-section-title">Select the reason for importing from previous request</div>
        <div id="cr-reason-select"></div>
      </div>
      <div class="cr-modal-section">
        <div class="cr-modal-section-title">Previous request</div>
        ${eligibleRfps.length === 0
          ? `<div class="cr-picker-empty">No submitted, approved, or rejected requests found to import from.</div>`
          : `<div class="cr-req-card-list">${eligibleRfps.map((r) => buildPrevRequestCardHtml(r)).join('')}</div>`
        }
      </div>
    </div>
    <div class="cr-modal-footer">
      <button type="button" class="cr-btn-cancel" id="cr-modal-cancel">Cancel</button>
      <button type="button" class="cr-btn-primary" id="cr-import-btn" disabled>Import data</button>
    </div>
  `;
}

async function openPreviousRequestModal() {
  const allRfps = await DataStore.getAllRfps();
  // FILTER: only Submitted, Approved, or Rejected — Draft (and anything
  // else) is excluded.
  const eligibleRfps = allRfps.filter((r) => r.approvalStatus && r.approvalStatus !== 'Draft');

  const state = { reason: null, selectedRfpId: null };

  openDialog({
    title: 'Create from Previous Request',
    size: 'large',
    bodyHtml: buildPrevRequestModalHtml(eligibleRfps),
  });

  createSearchableSelect({
    mountId: 'cr-reason-select',
    mode: 'single',
    options: IMPORT_REASON_OPTIONS.map((o) => ({ value: o.value, label: o.label, line2Left: o.description })),
    selected: null,
    placeholder: 'Select a reason…',
    searchPlaceholder: 'Search reasons',
    onChange: (val) => { state.reason = val; refreshImportBtn(); },
  });

  function refreshImportBtn() {
    const btn = document.getElementById('cr-import-btn');
    if (btn) btn.disabled = !(state.reason && state.selectedRfpId);
  }

  document.querySelectorAll('[name="cr-prev-request"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.selectedRfpId = input.value;
      document.querySelectorAll('.cr-req-card').forEach((c) => c.classList.remove('selected'));
      input.closest('.cr-req-card').classList.add('selected');
      refreshImportBtn();
    });
  });

  document.getElementById('cr-modal-cancel').addEventListener('click', closeDialog);
  document.getElementById('cr-import-btn').addEventListener('click', () => {
    const rfp = eligibleRfps.find((r) => r.id === state.selectedRfpId);
    if (!rfp || !state.reason) return;
    startWizardFromPrevious(rfp, state.reason);
  });
}

function initCreateRequestPage() {
  renderBreadcrumbs('cr-breadcrumbs', [
    { label: 'My Requests', href: 'my-requests.html' },
    { label: 'Create New Request' },
  ]);

  document.getElementById('cr-back-btn').addEventListener('click', () => {
    window.location.href = 'my-requests.html';
  });

  document.getElementById('cr-scratch-card').addEventListener('click', startWizardFromScratch);

  document.getElementById('cr-previous-card').addEventListener('click', (event) => {
    event.preventDefault();
    openPreviousRequestModal();
  });
}

document.addEventListener('DOMContentLoaded', initCreateRequestPage);
