// Requests behind the inbox tasks — transcribed from the design-review build
// (fayfik.github.io/munafasat/design-review, deployed 11 Nov 2026).

const TECH_EVAL = {
  member: { name: 'Hana Al-Ghamdi', initials: 'HA', role: 'Chair · Procurement' },
  documents: [
    { id: 'd1', name: 'Vendor Technical Proposal (Arabic & English)', mandatory: true },
    { id: 'd2', name: 'Valid Commercial Registration (CR)', mandatory: true },
    { id: 'd3', name: 'Cybersecurity Compliance Certificate (NCA ECC-1:2018)', mandatory: true },
    { id: 'd4', name: 'Proposed Team CVs & Certifications', mandatory: true },
    { id: 'd5', name: 'Implementation methodology (SAP Activate)' },
    { id: 'd6', name: 'Project plan & Gantt chart' },
    { id: 'd7', name: 'Solution architecture document' },
    { id: 'd8', name: 'SAP partner certificate' },
  ],
  requirements: [
    { id: 'r1', name: 'Deployment', desc: 'S/4HANA 2023 FPS02 or later, private cloud in a KSA region' },
    { id: 'r2', name: 'Integration', desc: 'Etimad, SADAD and HR system through SAP Integration Suite (CPI)' },
    { id: 'r3', name: 'Cyber security', desc: 'Compliance with NCA ECC-1:2018 and CCC-1:2020 controls' },
    { id: 'r4', name: 'Localisation', desc: 'Arabic UI, Hijri calendar and ZATCA e-invoicing phase 2' },
    { id: 'r5', name: 'Knowledge transfer', desc: 'Shadowing plan and certification of 10 internal key users' },
  ],
  criteria: [
    { id: 'c1', name: 'Methodology & implementation approach', how: 'SAP Activate plan, phasing, risks and cut-over strategy', weight: 30 },
    { id: 'c2', name: 'Team qualifications & certifications', how: 'Certified consultants per module, Saudi nationals on the team', weight: 25 },
    { id: 'c3', name: 'Relevant experience', how: 'Comparable S/4HANA public-sector deliveries in the last 5 years', weight: 25 },
    { id: 'c4', name: 'Support & SLA model', how: 'Hypercare, AMS model, response and resolution times', weight: 20 },
  ],
  passing: 70,
};

const QUALIFICATION = {
  member: { name: 'Khalid Al-Otaibi', initials: 'KA', role: 'Chair · Finance' },
  passing: 60,
  groups: [
    { id: 'q1', name: 'Previous Experience', weight: 40, subs: [
      { id: 'q1a', name: 'Number of years of experience', range: '5–15 years', weight: 30 },
      { id: 'q1b', name: 'Number of projects (last 3 years)', range: '3–10 similar projects', weight: 40 },
      { id: 'q1c', name: 'Total value of projects (last 3 years)', range: 'SAR 1M–10M', weight: 30 },
    ] },
    { id: 'q2', name: 'Existing Contractual Obligations', weight: 30, subs: [
      { id: 'q2a', name: 'Number of existing projects', range: '2–8 active projects', weight: 50 },
      { id: 'q2b', name: 'Value of existing projects', range: 'SAR 3M–15M', weight: 50 },
    ] },
    { id: 'q3', name: 'Human Resources', weight: 30, subs: [
      { id: 'q3a', name: 'Number of employees', range: '50–500 employees', weight: 40 },
      { id: 'q3b', name: 'Percentage of Saudi employees', range: '25%–60% Saudi nationals', weight: 60 },
    ] },
  ],
};

const PAYMENT_STAGES = [
  ['Contract signing & kickoff', 'Signed contract, project charter and mobilised team', 15],
  ['Design approval', 'Approved blueprint and solution design documents', 20],
  ['Build & configuration', 'Configured system, developments and unit test evidence', 25],
  ['UAT sign-off', 'SIT and UAT completed with no open critical defects', 20],
  ['Go-live & training', 'Production cut-over and all 6 training batches delivered', 15],
  ['Project closure', 'Hypercare exit and final acceptance certificate', 5],
];

const TERMS = 'Vendor must hold valid Saudi registrations; prices are fixed for the contract duration; warranty of 12 months from final acceptance; penalties for delay up to 10% of the contract value.';

const GENERIC_ATTACHMENTS = (dept) => [
  { type: 'PDF', name: 'Scope of work', size: '1.2 MB', owner: dept },
  { type: 'PDF', name: 'Technical specification', size: '860 KB', owner: dept },
  { type: 'XLSX', name: 'Bill of quantities', size: '74 KB', owner: dept },
  { type: 'PDF', name: 'Budget confirmation', size: '140 KB', owner: 'Finance' },
  { type: 'DOCX', name: 'Market price survey', size: '210 KB', owner: dept },
];
const REGULATORY = ['Commercial Registration', 'NCA Compliance Certificate', 'ZATCA E-invoicing Compliance'];

// BOQ rows: [no, name, desc, category, delivery, qty, unitPrice, total]
const boq = (groups) => groups.map(([name, items]) => ({ name, items: items.map(([no, item, desc, cat, delivery, qty, unit, total]) => ({ no, item, desc, cat, delivery, qty, unit, total })) }));

const GENERIC_TENDER_BOQ = (p) => boq([
  ['Software Licenses', [[1, 'Software subscription', 'Annual subscription — enterprise tier', 'Material', '2026-12-11', '3 Year', p[0], p[1]], [2, 'Named user licences', 'Professional user licences', 'Material', '2026-12-11', '250 License', p[2], p[3]]]],
  ['Cloud & Hosting', [[3, 'Infrastructure & hosting', 'Production, DR and non-production environments in-Kingdom', 'Service', '2027-01-11', '36 Month', p[4], p[5]]]],
  ['Implementation Services', [
    [4, 'Solution design', 'Requirements, blueprint and solution architecture', 'Service', '2027-02-11', '1 LS', p[6], p[6]],
    [5, 'Build & configuration', 'Configuration, integrations and custom development', 'Service', '2027-06-11', '1 LS', p[7], p[7]],
    [6, 'Integration (SAP CPI)', 'Interfaces with SAP, HR and Etimad via CPI', 'Service', '2027-06-11', '6 Interface', p[8], p[9]],
    [7, 'Data migration', 'Extraction, cleansing, mock loads and reconciliation', 'Service', '2027-07-11', '1 LS', p[10], p[10]],
    [8, 'Testing (SIT & UAT)', 'Test scripts, defect management and sign-off', 'Service', '2027-08-11', '1 LS', p[11], p[11]]]],
  ['Security & Compliance', [[9, 'Security assessment', 'Penetration test and NCA ECC compliance review', 'Service', '2027-08-11', '1 LS', p[12], p[12]]]],
  ['Training', [[10, 'Training & knowledge transfer', 'Key-user and admin training, Arabic materials', 'Service', '2027-09-11', '4 Batch', p[13], p[14]]]],
  ['Support & Maintenance', [[11, 'Hypercare', 'On-site stabilisation after go-live', 'Service', '2027-11-11', '3 Month', p[15], p[16]], [12, 'Support & maintenance', 'Helpdesk Sun–Thu, 4-hour SLA, updates and patches', 'Service', '2028-11-11', '2 Year', p[17], p[18]]]],
]);

export const REQUESTS = {
  'REQ-4478': {
    id: 'REQ-4478', project: 'SIEM & SOC Managed Services', projectEn: 'SIEM & SOC Managed Services', projectAr: 'خدمات مُدارة لمركز العمليات الأمنية',
    code: 'PRJ-2025-001', costCenter: 'FC-SEC-2200', route: 'Competitive Tender',
    amount: 5400000, amountVat: 6210000,
    requester: { name: 'Khalid Al-Qahtani', initials: 'KA', role: 'Requester', dept: 'Information Security' },
    budgetItems: ['Professional Services', 'Reporting', 'Materials & Consumables', 'Quality & Compliance', 'Training'],
    purpose: 'The purpose of this tender is to procure SIEM & SOC Managed Services for Information Security, to enhance operational efficiency and ensure compliance with applicable regulatory standards.',
    scope: 'Deliver SIEM & SOC managed services for Information Security, covering supply, implementation, testing and handover, with training, warranty and post-delivery support as defined in the bill of quantities and the technical specification.',
    approvals: ['Technology', 'Consultancy'], terms: TERMS, start: '26 Dec 2026', duration: '12 months', location: 'Riyadh — Head Office',
    boq: boq([
      ['Professional Services', [
        [1, 'Service mobilisation', 'Team onboarding, site survey and service plan', 'Service', '2026-12-11', '1 LS', 83060, 83060],
        [2, 'Senior consultant', 'Lead consultant — full time', 'Service', '2027-11-11', '12 Month', 125513, 1506156],
        [3, 'Consultant', 'Delivery consultants — 2 FTE', 'Service', '2027-11-11', '24 Month', 77523, 1860552],
        [4, 'Specialist days (on demand)', 'Subject-matter experts called off as needed', 'Service', '2027-11-11', '60 Day', 9598, 575880],
        [5, 'Contingency (call-off)', 'Additional services approved by the contract manager', 'Service', '2027-11-11', '1 LS', 110747, 110747]]],
      ['Reporting', [[6, 'Reports & deliverables', 'Monthly reports and final report in Arabic & English', 'Service', '2027-11-11', '12 Report', 11075, 132900]]],
      ['Materials & Consumables', [[7, 'Tools & consumables', 'Materials and consumables used to deliver the service', 'Material', '2027-11-11', '12 Month', 15689, 188268]]],
      ['Quality & Compliance', [[8, 'Quality assurance', 'Quarterly quality audits and KPI dashboard', 'Service', '2027-11-11', '4 Quarter', 33224, 132896]]],
      ['Training', [[9, 'Workshops', 'Stakeholder workshops and awareness sessions', 'Service', '2027-05-11', '6 Session', 17535, 105210]]],
    ]),
    payments: PAYMENT_STAGES, techEval: TECH_EVAL, qualification: QUALIFICATION,
    attachments: GENERIC_ATTACHMENTS('Information Security'), regulatory: REGULATORY,
    budget: { status: 'insufficient', ref: 'FC-SEC-2200 · OPEX-MANAGED-SVC · FY2026', available: 3850000, annual: '6M', consumed: 2150000, request: 6210000, shortfall: 2360000, shortfallPct: 61.3 },
    comments: [{ id: 'c1', author: { name: 'Khalid Al-Qahtani', initials: 'KA', role: 'Requester' }, at: '11 Nov, 15:32', text: 'SOC coverage must start before the current contract ends in Q1 — please prioritise.' }],
    submitted: { at: '11 Nov 2026, 03:24 PM' },
  },

  'REQ-4471': {
    id: 'REQ-4471', project: 'Cloud Infrastructure Migration', projectEn: 'Cloud Infrastructure Migration', projectAr: 'ترحيل البنية التحتية السحابية',
    code: 'PRJ-2025-001', costCenter: 'FC-IT-1000', route: 'Competitive Tender',
    amount: 1800000, amountVat: 2070000,
    requester: { name: 'Fatima Al-Zahrani', initials: 'FA', role: 'Requester', dept: 'IT & Digital' },
    budgetItems: ['Software Licenses', 'Cloud & Hosting', 'Implementation Services', 'Security & Compliance', 'Training'],
    purpose: 'The purpose of this tender is to procure Cloud Infrastructure Migration for IT & Digital, to enhance operational efficiency and ensure compliance with applicable regulatory standards.',
    scope: 'Deliver cloud infrastructure migration for IT & Digital, covering supply, implementation, testing and handover, with training, warranty and post-delivery support as defined in the bill of quantities and the technical specification.',
    approvals: ['Technology', 'Consultancy'], terms: TERMS, start: '26 Dec 2026', duration: '12 months', location: 'Riyadh — Head Office',
    boq: GENERIC_TENDER_BOQ([142231, 426693, 610, 152500, 7450, 268200, 88048, 216733, 16255, 97530, 60956, 40637, 25398, 9482, 37928, 18625, 55875, 47410, 94820]),
    payments: PAYMENT_STAGES, techEval: TECH_EVAL, qualification: QUALIFICATION,
    attachments: GENERIC_ATTACHMENTS('IT & Digital'), regulatory: REGULATORY,
    budget: { status: 'available', ref: 'FC-IT-1000 · CAPEX-CLOUD · FY2026', available: 2580000, annual: '3.2M', consumed: 620000, request: 2070000, remaining: 510000, remainingPct: 15.9 },
    comments: [{ id: 'c1', author: { name: 'Fatima Al-Zahrani', initials: 'FA', role: 'Requester' }, at: '11 Nov, 14:47', text: 'Migration of the remaining on-prem workloads to the sovereign cloud region.' }],
    submitted: { at: '11 Nov 2026, 02:40 PM' },
  },

  'REQ-4433': {
    id: 'REQ-4433', project: 'Core ERP Modernization', projectEn: 'Enterprise ERP System Upgrade', projectAr: 'ترقية نظام تخطيط موارد المؤسسة',
    code: 'PRJ-2025-001', costCenter: 'IT-ERP-2026', route: 'Competitive Tender',
    amount: 9940000, amountVat: 11431000,
    requester: { name: 'Ibrahim Al-Rashid', initials: 'IA', role: 'Requester', dept: 'IT & Digital' },
    budgetItems: ['ERP Software Licenses', 'Implementation & Configuration Services'],
    purpose: 'The purpose of this tender is to procure Enterprise ERP System Upgrade to enhance operational efficiency, support digital transformation objectives and ensure compliance with applicable regulatory standards.',
    scope: 'Design, build, migrate and operate a greenfield S/4HANA environment covering FI, CO, MM and FM with Embedded EWM. Includes data migration from the legacy ECC system, 6 training batches, and 3 months of hypercare support.',
    approvals: ['Technology', 'Consultancy'], terms: TERMS, start: '26 Dec 2026', duration: '18 months', location: 'Riyadh — Head Office',
    boq: boq([
      ['ERP Software Licenses', [
        [1, 'SAP S/4HANA Enterprise License', 'Named user licenses — Professional access (full module access)', 'Material', '2026-12-01', '500 License', 2800, 1400000],
        [2, 'SAP S/4HANA Enterprise License', 'Named user licenses — Limited access (read-only + reporting)', 'Material', '2026-12-01', '200 License', 1200, 240000]]],
      ['Implementation & Configuration Services', [
        [3, 'Core implementation (FI/CO/MM/FM)', 'Blueprint, configuration, custom development, SIT and UAT', 'Service', '2027-12-31', '1 LS', 3200000, 3200000],
        [4, 'Embedded EWM implementation', 'Inbound, outbound, physical inventory and RF scanning for 2 warehouses', 'Service', '2027-12-31', '1 LS', 1650000, 1650000],
        [5, 'Project management services', 'Dedicated PMP-certified project manager for the full duration', 'Service', '2028-06-30', '18 Month', 45000, 810000]]],
      ['Data Migration Services', [[6, 'Data migration & cleansing', 'Extraction, cleansing, mapping, mock loads and reconciliation', 'Service', '2027-09-30', '1 LS', 900000, 900000]]],
      ['End-User Training Program', [[7, 'End-user training (Arabic)', 'Classroom and e-learning for key users and end users', 'Service', '2027-11-30', '6 Batch', 85000, 510000]]],
      ['Annual Technical Support & Maintenance', [
        [8, 'Hypercare support', 'On-site stabilisation team after go-live', 'Service', '2028-03-31', '3 Month', 130000, 390000],
        [9, '3-year support & maintenance', 'Updates, security patches, helpdesk (Sun–Thu, 4-hour SLA)', 'Service', '2031-03-31', '3 Year', 280000, 840000]]],
    ]),
    payments: PAYMENT_STAGES, techEval: TECH_EVAL, qualification: QUALIFICATION,
    attachments: [
      { type: 'PDF', name: 'Scope of Work (12 pages)', size: '2.4 MB', owner: 'IT & Digital' },
      { type: 'PDF', name: 'Technical evaluation report', size: '1.8 MB', owner: 'Evaluation Committee' },
      { type: 'XLSX', name: 'Commercial comparison sheet', size: '310 KB', owner: 'Procurement' },
      { type: 'DOCX', name: 'Award recommendation memo', size: '96 KB', owner: 'Procurement' },
      { type: 'PDF', name: 'Solution architecture overview', size: '3.1 MB', owner: 'Enterprise Architecture' },
    ],
    standards: true, // technical standards + BCM sections (see content.js)
    budget: { status: 'available', ref: 'FC-IT-1000 · CAPEX-ERP · FY2026', available: 12320000, annual: '14.5M', consumed: 2180000, request: 11431000, remaining: 889000, remainingPct: 6.1 },
    comments: [{ id: 'c1', author: { name: 'Ibrahim Al-Rashid', initials: 'IA', role: 'Requester' }, at: '10 Nov, 09:15', text: 'Requesting approval for the ERP upgrade — the current ECC 6.0 support ends in 2027.' }],
    submitted: { at: '10 Nov 2026, 09:00 AM' },
  },

  'REQ-4429': {
    id: 'REQ-4429', project: 'Data Center Network Refresh', projectEn: 'Data Center Network Refresh', projectAr: 'تحديث شبكة مركز البيانات',
    code: 'PRJ-2025-001', costCenter: 'FC-IT-1000', route: 'Competitive Tender',
    amount: 2350000, amountVat: 2702500,
    requester: { name: 'Ibrahim Al-Rashid', initials: 'IA', role: 'Requester', dept: 'IT & Digital' },
    budgetItems: ['Software Licenses', 'Cloud & Hosting', 'Implementation Services', 'Security & Compliance', 'Training'],
    purpose: 'The purpose of this tender is to procure Data Center Network Refresh for IT & Digital, to enhance operational efficiency and ensure compliance with applicable regulatory standards.',
    scope: 'Deliver data center network refresh for IT & Digital, covering supply, implementation, testing and handover, with training, warranty and post-delivery support as defined in the bill of quantities and the technical specification.',
    approvals: ['Technology', 'Consultancy'], terms: TERMS, start: '26 Dec 2026', duration: '12 months', location: 'Riyadh — Head Office',
    boq: GENERIC_TENDER_BOQ([185690, 557070, 796, 199000, 9727, 350172, 114951, 282957, 21222, 127332, 79582, 53054, 33159, 12379, 49516, 24317, 72951, 61897, 123794]),
    payments: PAYMENT_STAGES, techEval: TECH_EVAL, qualification: QUALIFICATION,
    attachments: GENERIC_ATTACHMENTS('IT & Digital'), regulatory: REGULATORY,
    comments: [],
    submitted: { at: '08 Nov 2026' },
  },
};

export const sar = (n, dp = 2) => `SAR ${Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
export const boqTotal = (r) => r.boq.reduce((s, g) => s + g.items.reduce((a, i) => a + i.total, 0), 0);
