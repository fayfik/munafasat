/*
  Create Request entry page controller — Phase 4a.
  Depends on data-store.js, dialog.js, breadcrumbs.js (loaded before this file).
*/

function startWizardFromScratch() {
  WizardStore.start({ mode: 'scratch', sourceRequestId: null, formData: {} });
  window.location.href = 'wizard-basic-details.html';
}

function startWizardFromPrevious(rfp) {
  WizardStore.start({ mode: 'previous', sourceRequestId: rfp.id, formData: { ...rfp } });
  window.location.href = 'wizard-basic-details.html';
}

async function openPreviousRequestPicker() {
  const allRfps = await DataStore.getAllRfps();

  function renderList(query) {
    const q = query.trim().toLowerCase();
    const matches = q
      ? allRfps.filter((r) => r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))
      : allRfps;

    if (matches.length === 0) {
      return `<div class="cr-picker-empty">No matching requests found.</div>`;
    }

    return `
      <div class="cr-picker-list">
        ${matches.map((r) => `
          <div class="cr-picker-item" data-id="${r.id}">
            <div class="cr-picker-item-main">
              <div class="cr-picker-item-id">${r.id}</div>
              <div class="cr-picker-item-title">${r.title}</div>
            </div>
            ${renderApprovalChip(r.approvalStatus)}
          </div>
        `).join('')}
      </div>
    `;
  }

  openDialog({
    title: 'Select a previous request',
    bodyHtml: `
      <p class="cr-picker-subtext">Choose an existing request to use as the starting point for your new RFP.</p>
      <label class="cr-picker-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="cr-picker-search-input" placeholder="Search by request number or request name">
      </label>
      <div id="cr-picker-list-mount">${renderList('')}</div>
    `,
  });

  function wireItemClicks() {
    document.querySelectorAll('.cr-picker-item').forEach((el) => {
      el.addEventListener('click', () => {
        const rfp = allRfps.find((r) => r.id === el.dataset.id);
        if (rfp) startWizardFromPrevious(rfp);
      });
    });
  }
  wireItemClicks();

  document.getElementById('cr-picker-search-input').addEventListener('input', (e) => {
    document.getElementById('cr-picker-list-mount').innerHTML = renderList(e.target.value);
    wireItemClicks();
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
    openPreviousRequestPicker();
  });
}

document.addEventListener('DOMContentLoaded', initCreateRequestPage);
