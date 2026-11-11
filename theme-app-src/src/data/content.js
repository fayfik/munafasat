// Review content per task type — transcribed from the design-review build.
import { REQUESTS } from './requests.js';

const SCOPE_4433 = REQUESTS['REQ-4433'].scope;

/* ---------- Specialist reviews (Cyber · BCM · Operational risk) ---------- */
export const SPECIALIST = {
  cyber: {
    title: 'Review the security requirements',
    desc: 'Only the sections Cyber owns. Accept each requirement, comment on it, or add a missing one from the library.',
    noun: 'requirements reviewed', add: 'Add requirement', primary: 'submit',
    sections: [
      { id: 'scope', name: 'Scope of Work', hint: 'Is the solution clear enough to assess its security?', rows: [{ key: 'scope', title: SCOPE_4433 }] },
      { id: 'tech', name: 'Technical requirements', hint: 'What the vendor must meet.', canAdd: true, lib: 'tech', rows: [
        { key: 'tr1', title: 'Deployment', sub: 'S/4HANA 2023 FPS02 or later, private cloud in a KSA region' },
        { key: 'tr2', title: 'Integration', sub: 'Etimad, SADAD and HR system through SAP Integration Suite (CPI)' },
        { key: 'tr3', title: 'Cyber security', sub: 'Compliance with NCA ECC-1:2018 and CCC-1:2020 controls' },
        { key: 'tr4', title: 'Localisation', sub: 'Arabic UI, Hijri calendar and ZATCA e-invoicing phase 2' },
        { key: 'tr5', title: 'Knowledge transfer', sub: 'Shadowing plan and certification of 10 internal key users' }] },
      { id: 'int', name: 'Integrations', hint: 'How the system connects and signs users in.', canAdd: true, lib: 'integration', rows: [
        { key: 'in1', title: 'All integrations are built on the organisation’s iPaaS; no point-to-point interfaces.' },
        { key: 'in2', title: 'Documented REST / OData APIs with versioning for every interface.' },
        { key: 'in3', title: 'Single sign-on with the organisation’s identity provider (SAML 2.0 / OIDC).' }] },
      { id: 'data', name: 'Data classification', hint: 'What data the vendor touches, and how it is protected.', canAdd: true, lib: 'data', rows: [
        { key: 'dc1', title: 'Confidential — contains personal data (PDPL applies)', sub: 'Derived from the requester’s answers about the project.', tone: 'warning' },
        { key: 'dc2', title: 'Data ownership remains with the organisation; full data export on exit in an open format.' },
        { key: 'dc3', title: 'Data migration approach, reconciliation and sign-off for each load.' },
        { key: 'dc4', title: 'Backup, retention and restore tested at least twice a year.' },
        { key: 'dc5', title: 'Personal data handled per the Personal Data Protection Law (PDPL); data classified per NDMO.' }] },
      { id: 'std', name: 'Cybersecurity standards', hint: 'Controls pulled from the standards library.', canAdd: true, lib: 'security', rows: [
        { key: 'cs1', title: 'Compliance with NCA Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC).' },
        { key: 'cs2', title: 'Encryption of data in transit (TLS 1.2+) and at rest (AES-256).' },
        { key: 'cs3', title: 'Annual penetration test and vulnerability remediation within agreed SLAs.' },
        { key: 'cs4', title: 'Audit logs exported to the organisation’s SIEM.' }] },
    ],
  },
  bcm: {
    title: 'Review business continuity',
    desc: 'Confirm whether BCM applies to this service, then check every continuity clause. Add any that are missing from the BCM library.',
    noun: 'items reviewed', add: 'Add clause', primary: 'submit',
    reasons: ['Mandatory continuity clause missing', 'Scope too unclear to judge criticality', 'RTO / RPO not stated', 'BCM applies — screening answered incorrectly', 'Full tender document needed'],
    sections: [
      { id: 'app', name: 'Applicability', hint: 'Decided by the service, not the department.', rows: [
        { key: 'app', title: 'BCM applies', sub: 'Supports a critical system or process: Yes · Outage stops operations: Yes · Relies on vendor staff: No · Mainly an improvement: No', tone: 'success' }] },
      { id: 'scope', name: 'Scope of Work', hint: 'What the service is and what it depends on.', rows: [{ key: 'scope', title: SCOPE_4433 }] },
      { id: 'clauses', name: 'Continuity clauses', hint: 'Must be written into the RFP and contract.', canAdd: true, lib: 'bcm', rows: [
        { key: 'rto', title: 'Recovery Time Objective (RTO)', sub: 'RTO: 8 hours' },
        { key: 'rpo', title: 'Recovery Point Objective (RPO)', sub: 'RPO: 4 hours' },
        { key: 'bcp', title: 'Business Continuity Plan', sub: 'The vendor submits a BCP showing how service continues during disruption.' },
        { key: 'drp', title: 'Disaster Recovery Plan', sub: 'How systems and infrastructure are recovered after a major incident.' },
        { key: 'incident', title: 'Incident reporting', sub: 'Report within: 4 hours' },
        { key: 'recovery', title: 'Recovery arrangements', sub: 'Procedures and resources to restore the service after technical or operational failure.' }] },
    ],
  },
  orm: {
    title: 'Review operational risk',
    desc: 'A high-level confirmation: is the scope clear, what does the third-party checklist say, and are the right controls in the RFP?',
    noun: 'items reviewed', add: 'Add control', primary: 'confirm',
    reasons: ['Scope or objectives unclear', 'Third-party risk checklist incomplete', 'Operational controls missing', 'Earlier risk comments not addressed'],
    sections: [
      { id: 'scope', name: 'Scope & objectives', hint: 'Is the service and its purpose clear enough to judge the risk?', rows: [{ key: 'scope', title: SCOPE_4433 }] },
      { id: 'tpr', name: 'Third-party risk checklist', hint: 'Completed by the requester.', rows: [
        { key: 'access', title: 'Access to our systems: Yes', sub: 'Will the vendor access our systems or network?' },
        { key: 'data', title: 'Handles confidential data: Yes', sub: 'Will the vendor handle customer, personal or confidential data?' },
        { key: 'hosted', title: 'Hosted outside the bank: Yes', sub: 'Is the service hosted or run outside the bank?' },
        { key: 'subcon', title: 'Uses subcontractors: Yes', sub: 'Will the vendor use subcontractors?' },
        { key: 'single', title: 'Single vendor, no alternative: Yes', sub: 'Would it be hard to replace this vendor quickly?' },
        { key: 'customer', title: 'Customer-facing: No', sub: 'Is the service customer-facing?' },
        { key: 'rating', title: 'Risk rating: Critical', sub: 'Will be added to WAEI monitoring after the contract.', tone: 'warning' }] },
      { id: 'controls', name: 'Operational controls', hint: 'Controls written into the RFP and contract.', canAdd: true, lib: 'controls', rows: [
        { key: 'sla', title: 'Service levels and penalties', sub: 'Measurable SLAs with service credits or penalties when they are missed.' },
        { key: 'exit', title: 'Exit and transition plan', sub: 'The vendor supports handover to a new provider, including data return, at contract end.' }] },
    ],
  },
};

// Libraries for "Add requirement / clause / control" (from the design-review bundle).
export const LIBRARY = {
  security: [
    { id: 'c-ecc', title: 'NCA ECC & CCC compliance', sub: 'The vendor shall comply with NCA ECC-2:2024 and, for cloud services, CCC-2:2024, and provide a compliance matrix with the proposal.' },
    { id: 'c-pentest', title: 'Independent penetration test before go-live', sub: 'An independent penetration test shall be performed before go-live and annually; critical findings closed within 7 days, high within 30 days.' },
    { id: 'c-siem', title: 'Security logs to the bank SIEM', sub: 'Security and audit logs shall be forwarded in real time to the organisation’s SIEM (Syslog/CEF) and retained for at least 12 months.' },
    { id: 'c-pam', title: 'Privileged access management', sub: 'All privileged and vendor support access shall go through the organisation’s PAM solution with session recording and MFA.' },
  ],
  tech: [{ id: 'c-sdlc', title: 'Secure development & code review', sub: 'Custom code shall follow a secure SDLC (OWASP ASVS L2), with static code analysis results shared before each release.' }],
  integration: [
    { id: 'c-sso', title: 'SSO with MFA', sub: 'User access shall use the organisation’s identity provider (SAML 2.0 / OIDC) with multi-factor authentication; no local accounts.' },
    { id: 'c-api', title: 'Secured interfaces', sub: 'Every interface shall use mutual TLS or OAuth 2.0 client credentials through the organisation’s API gateway; no shared passwords.' },
  ],
  data: [
    { id: 'c-residency', title: 'Data residency in KSA', sub: 'All data, including backups and logs, shall be stored and processed within the Kingdom of Saudi Arabia.' },
    { id: 'c-dpa', title: 'NDA and data processing agreement', sub: 'The vendor shall sign the organisation’s NDA and a PDPL data processing agreement before receiving any data.' },
    { id: 'c-encrypt', title: 'Encryption with bank-held keys', sub: 'Data at rest shall be encrypted with AES-256 using keys managed by the organisation (BYOK / HSM).' },
  ],
  bcm: [
    { id: 'exercise', title: 'BCM exercises', sub: 'Vendor takes part in the bank’s BCM exercises and shares the results.' },
    { id: 'iso', title: 'BCM evidence (ISO 22301)', sub: 'ISO 22301 certificate or equivalent evidence that continuity arrangements work.' },
    { id: 'backup', title: 'Backup personnel', sub: 'Named backup staff for every role that keeps the service running.' },
    { id: 'replace', title: 'Replacement time', sub: 'Unavailable staff (leave, resignation) are replaced within the agreed time.' },
    { id: 'people-exercise', title: 'Exercise participation (staff)', sub: 'Assigned staff take part in BCM exercises; reports are shared.' },
  ],
  controls: [
    { id: 'audit', title: 'Right to audit', sub: 'The bank and its regulators may audit the vendor’s controls related to this service.' },
    { id: 'subcon', title: 'Subcontractor approval', sub: 'Subcontractors need the bank’s written approval and the same obligations apply to them.' },
    { id: 'insurance', title: 'Professional indemnity insurance', sub: 'The vendor holds insurance appropriate to the value and risk of the service.' },
    { id: 'kri', title: 'Periodic vendor risk assessment', sub: 'The vendor supports periodic risk assessments and reports agreed risk indicators (KRIs).' },
  ],
};

/* ---------- Enterprise architecture ---------- */
const STD = (text, tags = [], na) => ({ text, tags, na });
export const EA = {
  why: 'Software licences, subscriptions or renewals · A technology solution or upgrade',
  sections: [
    { id: 'scope', name: 'Scope of Work', body: { kind: 'scope' } },
    { id: 'treq', name: 'Technical requirements', body: { kind: 'list', items: [
      'Deployment — S/4HANA 2023 FPS02 or later, private cloud in a KSA region',
      'Integration — Etimad, SADAD and HR system through SAP Integration Suite (CPI)',
      'Cyber security — Compliance with NCA ECC-1:2018 and CCC-1:2020 controls',
      'Localisation — Arabic UI, Hijri calendar and ZATCA e-invoicing phase 2',
      'Knowledge transfer — Shadowing plan and certification of 10 internal key users'] } },
    { id: 'lic', name: 'Licences & quantities', body: { kind: 'licences', note: 'Check the quantities against what was agreed in the assessment — quantities above it affect the budget.' } },
    { id: 'host', name: 'Hosting & deployment', body: { kind: 'hosting',
      answers: [['Cloud service (SaaS)', 'Yes'], ['Runs on our servers', 'No'], ['New build or upgrade', 'Yes'], ['Internal integrations', 'Yes'], ['Data migration', 'Yes'], ['Personal / confidential data', 'Yes'], ['External users', 'No'], ['Business-critical', 'Yes'], ['AI / analytics', 'No']],
      standards: [
        STD('SaaS is the preferred deployment model; state the hosting provider, region and tenancy model.', ['Required', 'EA']),
        STD('All data and systems hosted within the Kingdom of Saudi Arabia (CST cloud classification level stated).', ['Required', 'Cybersecurity']),
        STD('Separate non-production environments (DEV / QA) with the same version as production.', ['EA'])] } },
    { id: 'int', name: 'Integration architecture', body: { kind: 'standards', standards: [
      STD('All integrations are built on the organisation’s iPaaS; no point-to-point interfaces.', ['Required', 'EA']),
      STD('Documented REST / OData APIs with versioning for every interface.', ['EA']),
      STD('Single sign-on with the organisation’s identity provider (SAML 2.0 / OIDC).', ['Required', 'EA'])] } },
    { id: 'sec', name: 'Cybersecurity & security', body: { kind: 'standards', standards: [
      STD('Compliance with NCA Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC).', ['Required', 'Cybersecurity']),
      STD('Encryption of data in transit (TLS 1.2+) and at rest (AES-256).', ['Required', 'Cybersecurity']),
      STD('Annual penetration test and vulnerability remediation within agreed SLAs.', ['Cybersecurity']),
      STD('Audit logs exported to the organisation’s SIEM.', ['Cybersecurity'])] } },
    { id: 'data', name: 'Data & infrastructure', body: { kind: 'standards', standards: [
      STD('Data ownership remains with the organisation; full data export on exit in an open format.', ['Required', 'EA']),
      STD('Data migration approach, reconciliation and sign-off for each load.', ['EA']),
      STD('Backup, retention and restore tested at least twice a year.', ['EA']),
      STD('Personal data handled per the Personal Data Protection Law (PDPL); data classified per NDMO.', ['Cybersecurity'])] } },
    { id: 'nfr', name: 'Non-functional requirements', body: { kind: 'standards', standards: [
      STD('Availability of 99.9% monthly for production, with service credits.', ['EA']),
      STD('Performance: key transactions respond within 3 seconds at peak load.', ['EA']),
      STD('Arabic and English user interface with right-to-left support.', ['EA']),
      STD('Disaster recovery: RPO ≤ 1 hour, RTO ≤ 4 hours.', ['EA'])] } },
    { id: 'doc', name: 'Architecture documentation', body: { kind: 'standards', standards: [
      STD('Solution architecture and integration design approved by EA before build.', ['EA']),
      STD('Current-state and target-state architecture documents.', ['Required', 'EA'], 'Current-state architecture is already documented in the EA repository (EA-2025-114).')] } },
  ],
  objectives: ['Replace the end-of-support ECC 6.0 landscape before 2027', 'One integrated finance, procurement and warehouse platform', 'Real-time budget control through Funds Management'],
  inScope: ['FI, CO, MM, FM and Embedded EWM design and build', 'Integration with Etimad, SADAD and the HR system via SAP CPI', 'Migration of open items, masters and 3 years of history', 'Fiori launchpad with 40 standard and 12 custom apps'],
  outScope: ['SuccessFactors / HR payroll', 'Hardware and hosting (covered by REQ-2026-037)'],
  outside: 'Payment schedule, evaluation, project delivery & handover (PMO), prices.',
};

/* ---------- Finance review — GL ---------- */
// [no, item, desc, qtyAmount, purchaseType, materialGroup, mgCode, glMain, glSub, issue, glOwns]
export const GL_LINES = [
  [6, 'Data migration & cleansing', 'Extraction, cleansing, mapping, mock loads and reconciliation', '1 LS · SAR 900,000', 'Asset', 'IT Implementation', 'MG-IT-IMP', '4250 IT Consulting Expenses', '4250-01 Implementation Services', 'Purchase Type (Asset) disagrees with Material Group (IT Implementation)', false],
  [8, 'Hypercare support', 'On-site stabilisation team after go-live', '3 Month · SAR 390,000', 'Service', 'Installation & Delivery', 'MG-IT-INST', '1290 Assets Under Construction', '', 'GL sub-account missing for this Material Group', true],
  [9, '3-year support & maintenance', 'Updates, security patches, helpdesk (Sun–Thu, 4-hour SLA)', '3 Year · SAR 840,000', 'Consumable', 'IT Maintenance & Support', 'MG-IT-MNT', '4260 IT Maintenance & Support', '4260-01 Support & Maintenance Contracts', 'Purchase Type (Consumable) disagrees with Material Group (IT Maintenance & Support)', true],
  [1, 'SAP S/4HANA Enterprise License', 'Named user licenses — Professional access (full module access)', '500 License · SAR 1,400,000', 'Asset', 'Software Licences', 'MG-SW-LIC', '1260 Intangible Assets', '1260-01 Perpetual Software Licences', null, false],
  [2, 'SAP S/4HANA Enterprise License', 'Named user licenses — Limited access (read-only + reporting)', '200 License · SAR 240,000', 'Asset', 'Software Licences', 'MG-SW-LIC', '1260 Intangible Assets', '1260-01 Perpetual Software Licences', null, false],
  [3, 'Core implementation (FI/CO/MM/FM)', 'Blueprint, configuration, custom development, SIT and UAT', '1 LS · SAR 3,200,000', 'Service + Asset', 'IT Implementation', 'MG-IT-IMP', '4250 IT Consulting Expenses', '4250-01 Implementation Services', null, true],
  [4, 'Embedded EWM implementation', 'Inbound, outbound, physical inventory and RF scanning for 2 warehouses', '1 LS · SAR 1,650,000', 'Service', 'IT Implementation', 'MG-IT-IMP', '4250 IT Consulting Expenses', '4250-01 Implementation Services', null, true],
  [5, 'Project management services', 'Dedicated PMP-certified project manager for the full duration', '18 Month · SAR 810,000', 'Service', 'IT Consulting', 'MG-IT-CONS', '4250 IT Consulting Expenses', '4250-03 Advisory Fees', null, true],
  [7, 'End-user training (Arabic)', 'Classroom and e-learning for key users and end users', '6 Batch · SAR 510,000', 'Service', 'Training', 'MG-TRN', '4520 Training & Development', '4520-01 Technical Training', null, true],
].map(([no, item, desc, qty, ptype, mg, mgCode, glMain, glSub, issue, glOwns]) => ({ key: `gl${no}`, no, item, desc, qty, ptype, mg, mgCode, glMain, glSub, issue, glOwns }));

export const MATERIAL_GROUPS = ['Software Licences · MG-SW-LIC', 'IT Implementation · MG-IT-IMP', 'Installation & Delivery · MG-IT-INST', 'IT Maintenance & Support · MG-IT-MNT', 'IT Consulting · MG-IT-CONS', 'Training · MG-TRN', 'Network Equipment · MG-IT-NET'];

/* ---------- GL: request changed after approval ---------- */
export const GL_CHANGES = {
  approvedOn: '8 Nov',
  groups: [
    { id: 'acct', name: 'Changes the accounting', hint: 'The accounting itself changed — you should review these again.', tone: 'warning', items: [
      { key: 'ch1', line: 'Structured cabling', field: 'Material group', from: 'Installation & Delivery · MG-IT-INST', to: 'Network Equipment · MG-IT-NET' },
      { key: 'ch2', line: 'Structured cabling', field: 'Asset flag', from: 'Non-asset', to: 'Asset' },
      { key: 'ch3', line: 'Firewall support (3 years)', field: 'GL sub-account', from: '4260-01 Support & Maintenance Contracts', to: '4250-03 Advisory Fees' }] },
    { id: 'call', name: 'Your call', hint: 'Quantities or new items — decide if they matter for accounting.', tone: 'info', items: [
      { key: 'ch4', line: 'Cisco Catalyst 9300 switch', field: 'Quantity', from: '24', to: '32' },
      { key: 'ch5', line: 'Network monitoring licences', field: 'New item', from: '—', to: '1 LS · SAR 180,000' }] },
    { id: 'info', name: 'For information', hint: 'Wording only — no effect on accounting.', tone: 'muted', items: [
      { key: 'ch6', line: 'Scope of work', field: 'Wording', from: 'Replace core switches', to: 'Replace core and distribution switches, including cabling' }] },
  ],
};

/* ---------- Finance review — Assets ---------- */
export const ASSET_FLAGGED = [
  { key: 'as1', no: 1, item: 'SAP S/4HANA Enterprise License', desc: 'Named user licenses — Professional access (full module access)', calc: '500 License × SAR 2,800 = SAR 1,400,000', ptype: 'Asset', mg: 'Software Licences', role: 'Licence' },
  { key: 'as2', no: 2, item: 'SAP S/4HANA Enterprise License', desc: 'Named user licenses — Limited access (read-only + reporting)', calc: '200 License × SAR 1,200 = SAR 240,000', ptype: 'Asset', mg: 'Software Licences', role: 'Licence' },
  { key: 'as3', no: 3, item: 'Core implementation (FI/CO/MM/FM)', desc: 'Blueprint, configuration, custom development, SIT and UAT', calc: '1 LS × SAR 3,200,000 = SAR 3,200,000', ptype: 'Service + Asset', mg: 'IT Implementation', role: 'Implementation' },
  { key: 'as6', no: 6, item: 'Data migration & cleansing', desc: 'Extraction, cleansing, mapping, mock loads and reconciliation', calc: '1 LS × SAR 900,000 = SAR 900,000', ptype: 'Asset', mg: 'IT Implementation', role: 'Implementation' },
];
export const ASSET_UNFLAGGED = [
  { key: 'as4', no: 4, item: 'Embedded EWM implementation', calc: '1 LS · SAR 1,650,000', mg: 'IT Implementation' },
  { key: 'as5', no: 5, item: 'Project management services', calc: '18 Month · SAR 810,000', mg: 'IT Consulting' },
  { key: 'as7', no: 7, item: 'End-user training (Arabic)', calc: '6 Batch · SAR 510,000', mg: 'Training' },
  { key: 'as8', no: 8, item: 'Hypercare support', calc: '3 Month · SAR 390,000', mg: 'Installation & Delivery' },
  { key: 'as9', no: 9, item: '3-year support & maintenance', calc: '3 Year · SAR 840,000', mg: 'IT Maintenance & Support' },
];

/* ---------- Procurement ---------- */
export const OFFICERS = [
  { id: 'MA', name: 'Mohammed Al-Harbi', open: 3 },
  { id: 'YA', name: 'Yousef Al-Harthi', open: 5 },
  { id: 'AA', name: 'Amal Al-Qahtani', open: 7 },
];
export const OFFICER_CHECKLIST = [
  'Request comments addressed',
  'Brand name details provided (if a brand is named)',
  'Request is clear and its sections are linked',
  'No formal violations (unclear words or text)',
  'No systemic violations (mandatory list, brand names)',
];
export const DOA = [
  ['Authority level', 'Level 3 — Procurement Team Lead'],
  ['Approval limit', 'Up to SAR 10,000,000.00'],
  ['Request value', 'SAR 9,940,000.00'],
  ['DOA reference', 'DOA Matrix 2026 · Procurement §4.2'],
  ['Prior reviews', '12 of 12 complete'],
  ['Officer review', 'No comments'],
];
export const PRICE_ITEMS = [
  ['ERP Software Licenses', 2, 1640000],
  ['Implementation & Configuration Services', 3, 5660000],
  ['Data Migration Services', 1, 900000],
  ['End-User Training Program', 1, 510000],
  ['Annual Technical Support & Maintenance', 2, 1230000],
];

/* ---------- Request details: technical standards & BCM (REQ-4433) ---------- */
export const STANDARDS_4433 = [
  ...EA.sections.find((s) => s.id === 'host').body.standards,
  ...['int', 'sec', 'data', 'nfr'].flatMap((id) => EA.sections.find((s) => s.id === id).body.standards),
  STD('Solution architecture and integration design approved by EA before build.', ['EA']),
  STD('Knowledge transfer, training and documentation handover before project closure.', ['Required', 'PMO']),
  STD('Project stages with deliverables linked to payment milestones.', ['PMO']),
  STD('Current-state and target-state architecture documents.', ['Required', 'EA'], 'Current-state architecture is already documented in the EA repository (EA-2025-114).'),
];
export const BCM_4433 = ['Recovery Time Objective (RTO) · 8 hours', 'Recovery Point Objective (RPO) · 4 hours', 'Business Continuity Plan', 'Disaster Recovery Plan', 'Incident reporting · 4 hours', 'Recovery arrangements'];
