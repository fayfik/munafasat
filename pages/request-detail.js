/*
  Request Detail page controller.
  Depends on: data-store.js, badge.js, breadcrumbs.js, process-pipeline.js,
  toast.js (all loaded before this file).

  Two request types share this one page/template ("flex for both"), but
  branch to different Overview field-sets since their underlying data
  really is different — a PR (Purchase Request) carries project-manager/
  contract-style fields that don't exist on an RFP, and vice versa. Only
  the Overview tab is built out; Purchase details/Vendors/Documents/
  Process are stubbed with the app's existing "coming soon" pattern.
*/

const PR_STAGES = ['PR creation', 'PR execution', 'Vendor selection', 'PO creation', 'Delivery/Service', 'Invoice processing', 'Payment & closure'];
const REQUEST_TYPE_POOL_SIZE = 5;

const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'purchase-details', label: 'Purchase details' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'documents', label: 'Documents' },
  { id: 'process', label: 'Process' },
];

let rdRecord = null;
let rdActiveTab = 'overview';

function rdEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function rdFormatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
}

function rdFormatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return `SAR ${Number(amount).toLocaleString('en-US')}`;
}

function rdVal(v) {
  return v === null || v === undefined || v === '' ? '—' : v;
}

/* ---- Header (id/title + history/download icon buttons) ---- */

function rdHeaderHtml(r) {
  const subtitle = r.type === 'PR' && r.titleAr
    ? `${rdEscapeHtml(r.title)} (${rdEscapeHtml(r.titleAr)})`
    : rdEscapeHtml(r.title);

  return `
    <div class="rd-header-card">
      <div>
        <div class="rd-header-id">${rdEscapeHtml(r.id)}</div>
        <div class="rd-header-subtitle">${subtitle}</div>
      </div>
      <div class="rd-header-actions">
        <button type="button" class="rd-icon-btn" id="rd-history-btn" title="Request history"><i class="fa-solid fa-clock-rotate-left"></i></button>
        <button type="button" class="rd-icon-btn" id="rd-download-btn" title="Download"><i class="fa-solid fa-download"></i></button>
      </div>
    </div>
  `;
}

/* ---- Tabs ---- */

function rdTabsHtml() {
  return `
    <div class="rd-tabs">
      ${DETAIL_TABS.map((t) => `
        <button type="button" class="rd-tab${t.id === rdActiveTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>
      `).join('')}
    </div>
  `;
}

/* ---- Overview: field-row helpers ---- */

function rdFieldsGridHtml(fields) {
  return `
    <div class="rd-fields-row">
      ${fields.map((f) => `
        <div class="rd-field">
          <div class="rd-field-label">${rdEscapeHtml(f.label)}</div>
          <div class="rd-field-value">${rdEscapeHtml(f.value)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function rdChecklistHtml(items) {
  return `
    <div class="rd-checklist">
      ${items.map((label) => `
        <div class="rd-check-item"><span class="rd-check-icon"><i class="fa-solid fa-check"></i></span>${rdEscapeHtml(label)}</div>
      `).join('')}
    </div>
  `;
}

/* ---- Overview: PR field-set ---- */

function rdPrOverviewHtml(r) {
  return `
    <div class="rd-card">
      <div class="rd-card-title">Project Details</div>
      <div class="rd-fields-row rd-fields-row-split">
        <div class="rd-field">
          <div class="rd-field-label">Project name (English)</div>
          <div class="rd-field-value">${rdEscapeHtml(r.title)}</div>
        </div>
        <div class="rd-field rd-field-end" dir="rtl">
          <div class="rd-field-label">Project name (Arabic)</div>
          <div class="rd-field-value">${rdEscapeHtml(r.titleAr || '—')}</div>
        </div>
      </div>
      ${rdFieldsGridHtml([
        { label: 'Department', value: r.department },
        { label: 'Cost center', value: r.costCenter },
        { label: 'Project manager name', value: r.projectManagerName },
        { label: 'PR document type', value: r.prDocumentType },
      ])}
      <div class="rd-field">
        <div class="rd-field-label">Request type <span class="rd-count-pill">${(r.requestType || []).length} out of ${REQUEST_TYPE_POOL_SIZE} selected</span></div>
      </div>
      ${rdChecklistHtml(r.requestType || [])}
    </div>

    <div class="rd-card">
      <div class="rd-card-title">Scope &amp; contract details</div>
      ${rdFieldsGridHtml([
        { label: 'Contract start date', value: rdFormatDate(r.contractStartDate) },
        { label: 'Duration', value: r.durationLabel },
        { label: 'Technical member name', value: r.technicalMemberName },
        { label: 'Place of work', value: r.placeOfWork },
      ])}
      ${rdChecklistHtml([r.qualificationSpecification ? 'Qualification specification' : null, r.safetySpecification ? 'Safety specification' : null].filter(Boolean))}
      <div class="rd-divider"></div>
      <div class="rd-field">
        <div class="rd-field-label">Scope of work</div>
        <div class="rd-field-value rd-field-value-block">${rdEscapeHtml(r.scopeOfWork)}</div>
      </div>
    </div>
  `;
}

/* ---- Overview: RFP field-set ---- */

function rdRfpOverviewHtml(r) {
  return `
    <div class="rd-card">
      <div class="rd-card-title">Project Details</div>
      <div class="rd-field">
        <div class="rd-field-label">Project name</div>
        <div class="rd-field-value">${rdEscapeHtml(r.title)}</div>
      </div>
      ${rdFieldsGridHtml([
        { label: 'Department', value: r.department },
        { label: 'Category', value: r.category },
        { label: 'Owner', value: r.owner },
        { label: 'Stage', value: r.stage },
      ])}
    </div>

    <div class="rd-card">
      <div class="rd-card-title">Scope &amp; budget details</div>
      ${rdFieldsGridHtml([
        { label: 'Created on', value: rdFormatDate(r.createdDate) },
        { label: 'Submission deadline', value: r.submissionDeadline ? rdFormatDate(r.submissionDeadline) : '—' },
        { label: 'Estimated budget', value: rdFormatMoney(r.estimatedBudgetSAR) },
        { label: 'Vendors', value: `${r.vendorsInvited || 0} invited · ${r.vendorsResponded || 0} responded` },
      ])}
      <div class="rd-divider"></div>
      <div class="rd-field">
        <div class="rd-field-label">Scope of work</div>
        <div class="rd-field-value rd-field-value-block">${rdEscapeHtml(r.description)}</div>
      </div>
    </div>
  `;
}

/* ---- Overview: full wizard-data field-set (a request created all the way
   through the 8-step wizard) — one `.rd-card` per wizard step, reusing the
   exact same model + field/table rendering the RFP Summary modal uses
   (components/rfp-summary/rfp-summary.js), just re-homed from a live
   wizard session into a persisted mock record's `wizardData`. ---- */

async function rdFullWizardOverviewHtml(wizardData) {
  const model = await buildRfpSummaryModel(wizardData);
  return model.sections.map((section) => `
    <div class="rd-card">
      <div class="rd-card-title">${rdEscapeHtml(section.title)}</div>
      ${rsSectionBodyHtml(section)}
    </div>
  `).join('');
}

/* ---- Tab bodies ---- */

function rdStubTabHtml(tab) {
  return `
    <div class="placeholder-state rd-stub-state">
      <img src="../assets/state illustrations/Name=Files, Theme=Light.png" alt="">
      <h2>${rdEscapeHtml(tab.label)} — coming soon</h2>
      <p>The ${rdEscapeHtml(tab.label.toLowerCase())} view for this request will be built in a follow-up phase.</p>
    </div>
  `;
}

/* ---- Render ---- */

function rdRenderBody() {
  const mount = document.getElementById('request-detail-root');
  const r = rdRecord;

  mount.innerHTML = `
    ${rdHeaderHtml(r)}
    ${rdTabsHtml()}
    <div id="rd-tab-body"></div>
  `;

  document.getElementById('rd-history-btn').addEventListener('click', () => {
    showToast('Request history — coming soon.');
  });
  document.getElementById('rd-download-btn').addEventListener('click', () => rdTriggerStubDownload(r));

  mount.querySelectorAll('.rd-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      rdActiveTab = btn.dataset.tab;
      rdRenderTabBody();
    });
  });

  rdRenderTabBody();
}

async function rdRenderTabBody() {
  const body = document.getElementById('rd-tab-body');
  document.querySelectorAll('.rd-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === rdActiveTab));

  const tab = DETAIL_TABS.find((t) => t.id === rdActiveTab);
  if (rdActiveTab !== 'overview') {
    body.innerHTML = rdStubTabHtml(tab);
    return;
  }

  const r = rdRecord;
  const overviewHtml = r.type === 'PR'
    ? rdPrOverviewHtml(r)
    : r.wizardData
      ? await rdFullWizardOverviewHtml(r.wizardData)
      : rdRfpOverviewHtml(r);

  body.innerHTML = `
    <div id="rd-pipeline"></div>
    ${overviewHtml}
  `;

  const stages = r.type === 'PR' ? PR_STAGES : STATUS_ORDER;
  const currentIndex = r.type === 'PR' ? (r.processStageIndex || 0) : Math.max(0, STATUS_ORDER.indexOf(r.status));
  renderProcessPipeline({ containerId: 'rd-pipeline', stages, currentIndex });
}

function rdTriggerStubDownload(r) {
  const content = `Request: ${r.id}\nName: ${r.title}\n\nThis is a stub export from the Munafasat prototype.`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${r.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function rdRenderNotFound(requestId) {
  const mount = document.getElementById('request-detail-root');
  mount.innerHTML = `
    <div class="placeholder-state">
      <img src="../assets/state illustrations/Name=Files, Theme=Light.png" alt="">
      <h2>Request not found</h2>
      <p>${rdEscapeHtml(requestId || '')} doesn't match any request in this workspace.</p>
    </div>
  `;
}

async function initRequestDetail() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('id');

  renderBreadcrumbs('request-detail-breadcrumbs', [
    { label: 'My Requests', href: 'my-requests.html' },
    { label: requestId || 'Request Details' },
  ]);

  if (!requestId) {
    rdRenderNotFound(requestId);
    return;
  }

  rdRecord = await DataStore.getRfpById(requestId);
  if (!rdRecord) {
    rdRenderNotFound(requestId);
    return;
  }

  rdRenderBody();
}

document.addEventListener('DOMContentLoaded', initRequestDetail);
