/*
  RFP Summary component — the pre-submission "quick review" modal shown
  when the creator clicks "Submit RFP" on the final wizard step.

  openRfpSummaryModal({ onSubmit }) builds a single structured model of
  every field entered across all 8 wizard steps (reading straight from
  WizardStore.getFormData(), the same source every step already persists
  to) and renders it two ways from that one model: the on-screen modal
  body, and (via "Download as PDF") an actual .pdf file using jsPDF +
  jspdf-autotable — so the modal and the PDF can never drift out of sync
  with each other.

  Depends on: data-store.js, table.js (formatDate), jsPDF + jspdf-autotable
  (both loaded as plain globals via CDN, same pattern as BOQ's XLSX export).
*/

function rsEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function rsMoney(amount) {
  return `SAR ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function rsDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function rsList(arr) {
  return arr && arr.length ? arr.join(', ') : '—';
}

function rsVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

/* ---- Model: one structured description of the whole RFP, read from
   WizardStore.getFormData() + the project directory — every section below
   maps 1:1 to a wizard step. `fields` are simple label/value pairs;
   `table` (when present) is a { columns, rows } grid for itemized data. */

async function buildRfpSummaryModel() {
  const fd = WizardStore.getFormData();
  const projects = await DataStore.getAllProjects();
  const project = fd.projectId ? projects.find((p) => p.id === fd.projectId) : null;

  const costCentreOptions = fd.procurementCategory === 'souq-etimad'
    ? [{ id: 'CC-1006', name: 'Corporate Administration', code: 'CKT006KBS' }]
    : (() => {
      const map = new Map();
      projects.forEach((p) => (p.budgetedItems || []).forEach((i) => (i.costCentres || []).forEach((cc) => map.set(cc.id, cc))));
      return [...map.values()];
    })();
  const costCentre = costCentreOptions.find((cc) => cc.id === fd.costCentreId);

  const budgetedItemNames = project
    ? (fd.budgetedItemIds || []).map((id) => project.budgetedItems.find((i) => i.id === id)?.name).filter(Boolean)
    : [];

  let closureDate = null;
  if (fd.projectStartDate && fd.durationValue) {
    const start = new Date(`${fd.projectStartDate}T00:00:00`);
    const d = new Date(start);
    const n = Number(fd.durationValue);
    if (fd.durationType === 'Days') d.setDate(d.getDate() + n);
    else if (fd.durationType === 'Weeks') d.setDate(d.getDate() + n * 7);
    else if (fd.durationType === 'Months') d.setMonth(d.getMonth() + n);
    else d.setFullYear(d.getFullYear() + n);
    closureDate = d;
  }

  const basicDetails = {
    title: 'Basic Details',
    fields: [
      { label: 'Procurement Category', value: fd.procurementCategory === 'souq-etimad' ? 'Souq Etimad' : fd.procurementCategory === 'procurement-requests' ? 'Procurement requests' : '—' },
      { label: 'Cost Centre', value: costCentre ? `${costCentre.code || costCentre.id} — ${costCentre.name}` : '—' },
      { label: 'Project', value: project ? project.name : '—' },
      { label: 'Budgeted Items', value: rsList(budgetedItemNames) },
      { label: 'Request Name (En)', value: rsVal(fd.requestNameEn) },
      { label: 'Request Name (Ar)', value: rsVal(fd.requestNameAr) },
      { label: 'Business Justification', value: rsVal(fd.businessJustification) },
      { label: 'Department', value: rsVal(fd.department) },
      { label: 'What this project includes', value: rsList(fd.projectIncludes) },
      { label: 'Project Start Date', value: rsDate(fd.projectStartDate) },
      { label: 'Duration', value: fd.durationValue ? `${fd.durationValue} ${fd.durationType || ''}`.trim() : '—' },
      { label: 'Tentative Project Closure', value: closureDate ? rsDate(closureDate.toISOString()) : '—' },
    ],
  };

  const sowFieldDefs = [
    ['executiveSummary', 'Executive Summary'], ['projectScope', 'Project Scope'],
    ['inScope', 'In Scope'], ['outOfScope', 'Out of Scope'],
    ['locationRegion', 'Location / Region'], ['projectProgram', 'Project Program'],
    ['specialConditions', 'Special Conditions'], ['penalties', 'Penalties'],
  ];
  const scopeOfWork = {
    title: 'Scope of Work',
    fields: [
      ...sowFieldDefs.map(([key, label]) => ({ label, value: rsVal(fd[key]) })),
      { label: 'Required Certificates', value: rsList((fd.scopeCertificates || []).map((c) => c.label)) },
      { label: 'Technical Documents', value: rsList((fd.scopeTechnicalDocuments || []).map((c) => c.label)) },
    ],
  };

  const boqItems = fd.boqItems || [];
  const boqSubtotal = boqItems.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const boqVat = boqSubtotal * 0.15;
  const boq = {
    title: 'Bill of Quantity',
    // Line items are the primary content here — the reader wants the
    // itemized table first and the rolled-up totals as a summary
    // underneath it, not the other way around.
    fieldsPosition: 'after',
    fields: [
      { label: 'Line Items', value: String(boqItems.length) },
      { label: 'Subtotal', value: rsMoney(boqSubtotal) },
      { label: 'VAT (15%)', value: rsMoney(boqVat) },
      { label: 'Grand Total (incl. VAT)', value: rsMoney(boqSubtotal + boqVat) },
    ],
    table: boqItems.length ? {
      columns: ['#', 'Item Name', 'Description', 'Budgeted Item', 'UOM', 'Qty', 'Unit Price', 'Delivery Date', 'Brand Name?', 'Total'],
      rows: boqItems.map((it, i) => {
        const budgetedItem = project ? project.budgetedItems.find((b) => b.id === it.budgetedItemId) : null;
        return [
          String(i + 1).padStart(2, '0'), rsVal(it.name), rsVal(it.description), budgetedItem ? budgetedItem.name : '—',
          rsVal(it.uom), rsVal(it.quantity), rsMoney(it.unitPrice), rsDate(it.deliveryDate), it.hasBrandName ? 'Yes' : 'No',
          rsMoney((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)),
        ];
      }),
    } : null,
  };

  const stages = fd.paymentStages || [];
  const payments = {
    title: 'Payments',
    fields: [{ label: 'Payment Stages', value: String(stages.length) }],
    table: stages.length ? {
      columns: ['#', 'Stage', 'Item / Deliverable', 'Start Date', 'Duration (Days)', 'Percentage', 'Amount'],
      rows: stages.map((s, i) => [String(i + 1), rsVal(s.stageName), rsVal(s.itemDeliverable), rsDate(s.startDate), rsVal(s.durationDays), s.percentage ? `${s.percentage}%` : '—', s.amount ? rsMoney(s.amount) : '—']),
    } : null,
  };

  const qcCategories = fd.qualificationCriteria || [];
  const qcRows = qcCategories.flatMap((cat) => cat.criteria.map((c) => [cat.name, c.name, rsVal(c.range), c.percentage ? `${c.percentage}%` : '—']));
  const qualificationCriteria = {
    title: 'Qualification Criteria',
    fields: [{ label: 'Passing Percentage', value: fd.qualificationPassingPercent ? `${fd.qualificationPassingPercent}%` : '—' }],
    table: qcRows.length ? { columns: ['Category', 'Criterion', 'Range / Requirement', 'Percentage'], rows: qcRows } : null,
  };

  const trReqs = fd.technicalRequirements || [];
  const technicalRequirements = {
    title: 'Technical Requirements',
    fields: [{ label: 'Requirements', value: String(trReqs.length) }],
    table: trReqs.length ? {
      columns: ['#', 'Requirement', 'AI Validation'],
      rows: trReqs.map((r, i) => [String(i + 1), rsVal(r.text), r.aiCheck ? (r.aiCheck.valid ? 'Good to have' : 'Not suggested') : '—']),
    } : null,
  };

  const tecCriteria = fd.technicalEvaluationCriteria || [];
  const technicalEvaluationCriteria = {
    title: 'Technical Evaluation Criteria',
    fields: [
      { label: 'Total Weightage', value: `${tecCriteria.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0)}%` },
      { label: 'Passing Percentage', value: fd.technicalEvaluationPassingPercent ? `${fd.technicalEvaluationPassingPercent}%` : '—' },
    ],
    table: tecCriteria.length ? {
      columns: ['#', 'Description', 'How Criteria is Applied', 'Weightage'],
      rows: tecCriteria.map((c, i) => [String(i + 1), rsVal(c.description), rsVal(c.howApplied), c.weightage ? `${c.weightage}%` : '—']),
    } : null,
  };

  const supportingDocs = fd.supportingDocuments || [];
  const supportingDocuments = {
    title: 'Supporting Documents',
    fields: supportingDocs.length ? [] : [{ label: 'Documents', value: 'None attached' }],
    table: supportingDocs.length ? {
      columns: ['File Name', 'Size'],
      rows: supportingDocs.map((f) => [rsVal(f.name), f.size ? `${(f.size / 1024).toFixed(0)} KB` : '—']),
    } : null,
  };

  return {
    requestName: fd.requestNameEn || 'Untitled request',
    generatedAt: new Date(),
    sections: [basicDetails, scopeOfWork, boq, payments, qualificationCriteria, technicalRequirements, technicalEvaluationCriteria, supportingDocuments],
  };
}

/* ---- On-screen modal ---- */

function rsSectionHtml(section) {
  const fieldsHtml = section.fields && section.fields.length ? `
    <div class="rs-fields-grid">
      ${section.fields.map((f) => `
        <div class="rs-field-label">${rsEscapeHtml(f.label)}</div>
        <div class="rs-field-value">${rsEscapeHtml(f.value)}</div>
      `).join('')}
    </div>
  ` : '';

  const tableHtml = section.table ? `
    <div class="rs-table-scroll">
      <table class="rs-table">
        <thead><tr>${section.table.columns.map((c) => `<th>${rsEscapeHtml(c)}</th>`).join('')}</tr></thead>
        <tbody>${section.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${rsEscapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  ` : '';

  const orderedHtml = section.fieldsPosition === 'after' ? [tableHtml, fieldsHtml] : [fieldsHtml, tableHtml];

  return `
    <div class="rs-section">
      <div class="rs-section-title">${rsEscapeHtml(section.title)}</div>
      ${orderedHtml.join('')}
    </div>
  `;
}

function ensureRfpSummaryRoot() {
  let root = document.getElementById('rfp-summary-root');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'rfp-summary-root';
  root.className = 'rs-overlay';
  document.body.appendChild(root);

  root.addEventListener('click', (event) => {
    if (event.target === root) closeRfpSummaryModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('open')) closeRfpSummaryModal();
  });

  return root;
}

async function openRfpSummaryModal({ onSubmit }) {
  const root = ensureRfpSummaryRoot();
  root.innerHTML = `
    <div class="rs-panel" role="dialog" aria-modal="true" aria-label="RFP Summary">
      <div class="rs-top-bar"></div>
      <div class="rs-header">
        <div class="rs-header-brand">
          <img class="rs-header-logo" src="../assets/reference/Color=Full color, Size=Large, Type=Full logo.png" alt="SIDF">
          <span class="rs-header-app-name">Munafasat</span>
        </div>
        <button type="button" class="rs-close-btn" id="rs-close-btn" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="rs-title-row">
        <div>
          <div class="rs-title">RFP Summary</div>
          <div class="rs-subtitle" id="rs-subtitle">Loading…</div>
        </div>
      </div>
      <div class="rs-body" id="rs-body">
        <div class="rs-loading"><i class="fa-solid fa-spinner fa-spin"></i> Preparing summary…</div>
      </div>
      <div class="rs-footer">
        <button type="button" class="rs-btn-outline" id="rs-close-footer-btn">Close</button>
        <button type="button" class="rs-btn-outline" id="rs-download-pdf-btn"><i class="fa-solid fa-download"></i> Download as PDF</button>
        <button type="button" class="rs-btn-primary" id="rs-submit-btn"><i class="fa-solid fa-paper-plane"></i> Submit Request</button>
      </div>
    </div>
  `;
  root.classList.add('open');

  const model = await buildRfpSummaryModel();
  document.getElementById('rs-subtitle').textContent = `${model.requestName} · Generated ${model.generatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  document.getElementById('rs-body').innerHTML = model.sections.map(rsSectionHtml).join('');

  document.getElementById('rs-close-btn').addEventListener('click', closeRfpSummaryModal);
  document.getElementById('rs-close-footer-btn').addEventListener('click', closeRfpSummaryModal);
  document.getElementById('rs-download-pdf-btn').addEventListener('click', () => downloadRfpSummaryPdf(model));
  document.getElementById('rs-submit-btn').addEventListener('click', () => {
    closeRfpSummaryModal();
    onSubmit();
  });
}

function closeRfpSummaryModal() {
  document.getElementById('rfp-summary-root')?.classList.remove('open');
}

/* ---- PDF export (jsPDF + jspdf-autotable, from the same `model` the
   modal body renders — see file header) ---- */

function downloadRfpSummaryPdf(model) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFillColor(105, 152, 67); // --color-green-600
  doc.rect(0, 0, pageWidth, 6, 'F');

  y = 34;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('SIDF', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text('Munafasat', marginX + 45, y);

  y += 26;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('RFP Summary', marginX, y);

  y += 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text(`${model.requestName} · Generated ${model.generatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, marginX, y);
  y += 18;

  // Field/value pairs render as a real 2-column autotable — same grid the
  // on-screen modal uses — so every value lands on one straight vertical
  // line regardless of how long its label is, instead of drifting per-row
  // the way freehand-positioned text would.
  function drawFieldsTable(section) {
    if (!section.fields || !section.fields.length) return;
    doc.autoTable({
      startY: y,
      margin: { left: marginX, right: marginX },
      body: section.fields.map((f) => [f.label, String(f.value)]),
      columnStyles: {
        0: { cellWidth: 160, fontStyle: 'bold', textColor: [110, 110, 110] },
        1: { cellWidth: 'auto', textColor: [30, 30, 30] },
      },
      styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 0, right: 8 } },
      theme: 'plain',
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  function drawItemsTable(section) {
    if (!section.table) return;
    doc.autoTable({
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [section.table.columns],
      body: section.table.rows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [238, 244, 232], textColor: [63, 93, 39] },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 20;
  }

  model.sections.forEach((section) => {
    if (y > 720) { doc.addPage(); y = 40; }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(81, 118, 50); // --color-green-700
    doc.text(section.title, marginX, y);
    y += 14;

    const hadContent = (section.fields && section.fields.length) || section.table;
    if (section.fieldsPosition === 'after') {
      drawItemsTable(section);
      drawFieldsTable(section);
    } else {
      drawFieldsTable(section);
      drawItemsTable(section);
    }
    if (!hadContent) y += 10;
  });

  doc.save(`${(model.requestName || 'RFP-Summary').replace(/[^\w\- ]+/g, '')}.pdf`);
}
