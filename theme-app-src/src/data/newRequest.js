// New Request (tender / E-Market) — reference data, transcribed from the
// design-review build (apps/tender-react, 11 Nov 2026). English only for now.

export const SECTIONS = [
  { id: 'route', title: 'Procurement route', desc: 'Project, items and how they can be bought' },
  { id: 'setup', title: 'Project setup', desc: 'Project, cost center and purpose', emTitle: 'Purchase details' },
  { id: 'scope', title: 'Scope of work', desc: 'Scope, terms and contract duration' },
  { id: 'boq', title: 'Bill of quantities', desc: 'Items, quantities and prices' },
  { id: 'payment', title: 'Payment schedule', desc: 'Payment stages tied to deliverables' },
  { id: 'tech', title: 'Technical evaluation', desc: 'Evaluator, documents, requirements and scoring' },
  { id: 'qual', title: 'Qualification', desc: 'Who qualifies vendors, and how' },
  { id: 'attachments', title: 'Attachments', desc: 'Optional reference documents' },
  { id: 'review', title: 'Review & submit', desc: 'Final checks before you submit' },
];
// E-Market purchases skip the competition steps.
export const EM_STEPS = ['route', 'setup', 'boq', 'attachments', 'review'];

export const COST_CENTERS = [
  { id: 'cc-2401', code: 'CC-2401', name: 'IT & Digital Transformation' },
  { id: 'cc-3105', code: 'CC-3105', name: 'Digital Transformation Committee' },
  { id: 'cc-1102', code: 'CC-1102', name: 'Finance & Accounting' },
  { id: 'cc-1240', code: 'CC-1240', name: 'Human Capital' },
  { id: 'cc-2210', code: 'CC-2210', name: 'Cybersecurity Office' },
  { id: 'cc-3020', code: 'CC-3020', name: 'Strategy & Performance' },
  { id: 'cc-4410', code: 'CC-4410', name: 'Facilities & General Services' },
  { id: 'cc-5105', code: 'CC-5105', name: 'Legal Affairs' },
  { id: 'cc-6001', code: 'CC-6001', name: 'Credit & Lending Operations' },
];

export const PROJECTS = [
  {
    id: 'proj-001', code: 'PRJ-2025-001', costCenterId: 'cc-2401',
    name: 'Enterprise ERP System Upgrade', nameAr: 'ترقية نظام تخطيط موارد المؤسسة',
    purpose: 'Upgrade and modernize the existing ERP system to improve operational efficiency and compliance with ZATCA e-invoicing requirements.',
    regulatoryRecords: ['Commercial Registration', 'Computer Systems Technical License (CST)', 'National Cybersecurity Authority (NCA) Compliance Certificate', 'ZATCA E-invoicing Compliance'],
    items: [
      { id: 'item-001', name: 'ERP Software Licenses', nameAr: 'تراخيص برامج نظام تخطيط الموارد', type: 'assets' },
      { id: 'item-002', name: 'Implementation & Configuration Services', nameAr: 'خدمات التنفيذ والتهيئة', type: 'services' },
      { id: 'item-003', name: 'Data Migration Services', nameAr: 'خدمات ترحيل البيانات', type: 'services' },
      { id: 'item-004', name: 'End-User Training Program', nameAr: 'برنامج تدريب المستخدمين', type: 'services' },
      { id: 'item-005', name: 'Annual Technical Support & Maintenance', nameAr: 'الدعم الفني والصيانة السنوية', type: 'consumables' },
    ],
  },
  {
    id: 'proj-002', code: 'PRJ-2025-002', costCenterId: 'cc-2401',
    name: 'Cloud Infrastructure Migration', nameAr: 'ترحيل البنية التحتية إلى السحابة',
    purpose: 'Migration of on-premises infrastructure to government-approved cloud platforms to reduce operational costs, improve scalability, and ensure business continuity.',
    regulatoryRecords: ['Cloud Service Provider License (NCA)', 'Data Residency Compliance Certificate', 'ISO 27001'],
    items: [
      { id: 'item-010', name: 'Cloud Platform Subscription', nameAr: 'اشتراك المنصة السحابية', type: 'assets' },
      { id: 'item-011', name: 'Migration Consulting Services', nameAr: 'خدمات استشارات الترحيل', type: 'services' },
      { id: 'item-012', name: 'Security Assessment & Hardening', nameAr: 'تقييم الأمن والتقوية', type: 'services' },
      { id: 'item-013', name: 'Managed Cloud Services', nameAr: 'الخدمات السحابية المُدارة', type: 'consumables' },
    ],
  },
  {
    id: 'proj-003', code: 'PRJ-2025-003', costCenterId: 'cc-3105',
    name: 'Digital Services Portal Development', nameAr: 'تطوير بوابة الخدمات الرقمية',
    purpose: 'Development of a citizen-facing digital services portal to streamline service delivery, reduce physical visits, and enhance user experience through digital channels.',
    regulatoryRecords: ['Government Digital Services Framework Compliance', 'Absher Integration License', 'Nafath Authentication License'],
    items: [
      { id: 'item-020', name: 'Portal Design & Development', nameAr: 'تصميم وتطوير البوابة الإلكترونية', type: 'services' },
      { id: 'item-021', name: 'Systems Integration Services', nameAr: 'خدمات تكامل الأنظمة', type: 'services' },
      { id: 'item-022', name: 'Server & Hosting Infrastructure', nameAr: 'بنية الخوادم والاستضافة', type: 'assets' },
      { id: 'item-023', name: 'SSL Certificates & Domain Licenses', nameAr: 'شهادات SSL ورخص النطاق', type: 'consumables' },
    ],
  },
  {
    id: 'proj-101', code: 'PRJ-2025-101', costCenterId: 'cc-1102',
    name: 'Finance Automation Platform', nameAr: 'منصة أتمتة العمليات المالية',
    purpose: 'Automate accounts payable, reconciliation and financial reporting to shorten the monthly close and improve audit readiness.',
    regulatoryRecords: ['Commercial Registration', 'NCA Compliance Certificate', 'ZATCA E-invoicing Compliance'],
    items: [
      { id: 'item-101', name: 'Automation Platform Subscriptions', nameAr: 'اشتراكات منصة الأتمتة', type: 'assets' },
      { id: 'item-102', name: 'Process Automation Services', nameAr: 'خدمات أتمتة العمليات', type: 'services' },
      { id: 'item-103', name: 'ERP Integration Services', nameAr: 'خدمات التكامل مع نظام تخطيط الموارد', type: 'services' },
      { id: 'item-104', name: 'Finance Staff Training', nameAr: 'تدريب موظفي المالية', type: 'services' },
    ],
  },
  {
    id: 'proj-401', code: 'PRJ-2025-401', costCenterId: 'cc-4410',
    name: 'Head Office Workspace Refurbishment', nameAr: 'تجديد مساحات العمل في المقر الرئيسي',
    purpose: 'Refurbish two floors of the head office into modern open workspaces with meeting rooms and upgraded building services.',
    regulatoryRecords: ['Commercial Registration', 'Saudi Contractors Authority Classification', 'Civil Defense Approval'],
    items: [
      { id: 'item-401', name: 'Design & Fit-out Works', nameAr: 'أعمال التصميم والتجهيز', type: 'services' },
      { id: 'item-402', name: 'Office Furniture', nameAr: 'الأثاث المكتبي', type: 'assets' },
      { id: 'item-403', name: 'Audio-Visual Equipment', nameAr: 'المعدات السمعية والبصرية', type: 'assets' },
      { id: 'item-404', name: 'Office Consumables', nameAr: 'المستلزمات المكتبية', type: 'consumables' },
    ],
  },
];

export const PEOPLE = [
  { id: 'rec-khalid', name: 'Khalid Al-Otaibi', initials: 'KA', role: 'Senior Solutions Architect', department: 'IT & Digital Transformation', reviewed: 4 },
  { id: 'rec-abdullah', name: 'Abdullah Al-Harbi', initials: 'AH', role: 'Procurement Lead', department: 'Finance & Procurement', reviewed: 3 },
  { id: 'rec-noura', name: 'Noura Al-Qahtani', initials: 'NQ', role: 'Cybersecurity Officer', department: 'Information Security', reviewed: 5 },
  { id: 'rec-faisal', name: 'Faisal Al-Dossari', initials: 'FD', role: 'ERP Functional Manager', department: 'IT & Digital Transformation', reviewed: 2 },
  { id: 'rec-sara', name: 'Sara Al-Zahrani', initials: 'SZ', role: 'Quality & Compliance Analyst', department: 'PMO', reviewed: 3 },
  { id: 'p-ahmed', name: 'Ahmed Al-Rashidi', initials: 'AR', role: 'Senior Technical Architect', department: 'IT & Digital Transformation' },
  { id: 'p-fatima', name: 'Fatima Al-Zahrani', initials: 'FZ', role: 'Project Manager', department: 'IT & Digital Transformation' },
  { id: 'p-mohammed', name: 'Mohammed Al-Otaibi', initials: 'MO', role: 'Systems Engineer', department: 'Infrastructure' },
  { id: 'p-sarag', name: 'Sara Al-Ghamdi', initials: 'SG', role: 'Business Analyst', department: 'Strategy & Transformation' },
  { id: 'p-khalids', name: 'Khalid Al-Shehri', initials: 'KS', role: 'Cybersecurity Specialist', department: 'Information Security' },
  { id: 'p-noura', name: 'Noura Al-Dossari', initials: 'ND', role: 'Data Architect', department: 'Data & Analytics' },
  { id: 'p-reem', name: 'Reem Al-Mutairi', initials: 'RM', role: 'Procurement Specialist', department: 'Procurement' },
];

export const UNITS = ['Each', 'License', 'Hour', 'Day', 'Month', 'Year', 'Service', 'Package', 'Kit', 'Box', 'Carton', 'Set', 'User', 'GB', 'TB'];

export const QUALIFICATIONS = [
  { value: 'high-school', en: 'High School' }, { value: 'diploma', en: 'Diploma' },
  { value: 'bachelor', en: "Bachelor's Degree" }, { value: 'master', en: "Master's Degree" },
  { value: 'phd', en: 'PhD' }, { value: 'certification', en: 'Professional Certification' },
];
export const NATIONALITIES = ['Saudi', 'Egyptian', 'Jordanian', 'Lebanese', 'Syrian', 'Sudanese', 'Yemeni', 'Indian', 'Pakistani', 'Filipino', 'Bangladeshi', 'British', 'American'];

export const BOQ_CATEGORIES = [
  { id: 'service', en: 'Service' }, { id: 'equipment', en: 'Equipment' },
  { id: 'material', en: 'Material' }, { id: 'manpower', en: 'Manpower' },
];

export const EXPENSE_TYPES = {
  intangible: 'Intangible assets (CapEx)', tangible: 'Tangible assets (CapEx)', 'it-equipment': 'IT equipment (CapEx)',
  communication: 'Communication', consumables: 'Consumables', 'it-maintenance': 'IT maintenance', consultation: 'Consultation',
};

export const ROUTES = {
  tendering: { en: 'Competitive tender', short: 'Tender', desc: 'Suppliers bid on Etimad against your scope and BOQ.' },
  emarket: { en: 'Etimad E-Market', short: 'E-Market', desc: 'Buy listed items directly from the Etimad catalogue.' },
};
export const ROUTE_MODES = [
  { id: 'tender', en: 'Tender', desc: 'Suppliers bid on Etimad against your scope and BOQ.' },
  { id: 'emarket', en: 'Etimad E-Market', desc: 'Buy listed items directly from the Etimad catalogue.' },
  { id: 'help', en: 'Help me decide', desc: 'We’ll check each item and suggest the route.' },
];
export const EXAMPLE_ITEMS = '20 contractor engineers (manpower)\nOffice cleaning services\nAdobe Creative Cloud licenses - 15\nNetwork switches x4';

// Request categories → review departments (Scope of work).
export const CATEGORIES = [
  { id: 'technology', en: 'Technology', desc: 'Software, hardware, networks, security and system implementation.', review: ['ea', 'cyber', 'bcm'] },
  { id: 'consultancy', en: 'Consultancy', desc: 'Advisory, assessments, studies and professional services.', review: ['cyber', 'bcm'] },
  { id: 'general', en: 'General request', desc: 'General goods or services outside technology and consultancy.', review: ['bcm'] },
];
export const DEPARTMENTS = {
  requester: { en: 'Requester', desc: 'Raises the request and defines the scope.' },
  manager: { en: 'Line manager', desc: 'Approves the need, scope and budget request.' },
  finance: { en: 'Finance', desc: 'Confirms budget availability and funding.' },
  cyber: { en: 'Cybersecurity', desc: 'Reviews security controls and compliance.' },
  ea: { en: 'Enterprise Architecture', desc: 'Reviews architecture fit and technology standards.' },
  bcm: { en: 'Business Continuity (BCM)', desc: 'Reviews operational continuity and risk.' },
  procurement: { en: 'Procurement', desc: 'Runs the procurement process on Etimad.' },
};

/* ── “Draft with AI” samples (the prototype has no live AI) ───────────────── */
export const AI_SCOPE = `This project encompasses the supply, installation, configuration, and commissioning of an enterprise ERP system. The contractor shall be responsible for:
1. Software Licenses: Provision of all required ERP software licenses for a minimum of 500 named users, including all modules specified in the Bill of Quantities.
2. Implementation & Configuration: Complete end-to-end system implementation including system design, database setup, module configuration, workflow automation, and integration with existing systems (SAP ECC, HRMS, and Document Management System).
3. Data Migration: Full migration of historical data from the existing legacy system, including data cleansing, validation, and reconciliation reports. The contractor must achieve 100% data integrity.
4. User Training: Comprehensive training program for all user groups — System Administrators (5 days), Power Users (3 days), and End Users (1 day) — conducted in both Arabic and English.
5. Go-Live Support: Dedicated on-site support for a minimum of 30 days post go-live to ensure system stability and user adoption.
6. Technical Support: Three (3) years of technical support and maintenance including software updates, security patches, bug fixes, and helpdesk support (8am–5pm, Sunday–Thursday, SLA: 4 hours response).`;

export const AI_TERMS = `1. The vendor must comply with the National Cybersecurity Authority (NCA) Essential Cybersecurity Controls (ECC-1:2018) and all applicable cybersecurity regulations.
2. All cloud services or data storage components must be hosted within the Kingdom of Saudi Arabia, in compliance with Government Cloud (G-Cloud) guidelines.
3. The vendor must obtain all required technical licenses from the Communications, Space & Technology Commission (CST) prior to commencement of services.
4. All software must support both Arabic (RTL) and English (LTR) interfaces with full Unicode compliance.
5. The contractor must not subcontract more than 30% of the total contract value without prior written approval from the organization.
6. Warranty period for all delivered software and systems shall be a minimum of one (1) year from the date of final acceptance.`;

export const AI_LOCATION = "The organization's headquarters — Riyadh, with the contractor's premises for off-site development. All data and systems must remain hosted within the Kingdom of Saudi Arabia for the full contract duration.";

export const AI_PURPOSE = (p) => `${p ? p.purpose : 'Purchase the items listed in this request.'} The request covers the budgeted items selected in the procurement route and is needed to deliver the project on time and within the approved budget.`;

export const AI_BOQ = [
  { projectItem: 'ERP Software Licenses', category: 'material', itemName: 'SAP S/4HANA Enterprise License', itemDescription: 'Named user licenses — Professional access with full module access for finance, HR and procurement users', unitOfMeasure: 'License', quantity: 500, unitPrice: 2800 },
  { projectItem: 'ERP Software Licenses', category: 'material', itemName: 'SAP S/4HANA Enterprise License (limited)', itemDescription: 'Named user licenses — Limited access, read-only and reporting for managers and auditors', unitOfMeasure: 'License', quantity: 200, unitPrice: 1200 },
  { projectItem: 'Implementation & Configuration Services', category: 'service', itemName: 'Project Management Services', itemDescription: 'Dedicated project manager for the full project duration, including weekly status reporting', unitOfMeasure: 'Month', quantity: 18, unitPrice: 45000 },
  { projectItem: 'Implementation & Configuration Services', category: 'service', itemName: 'Technical Consulting Services', itemDescription: 'Senior solution architects and technical consultants for design, build and testing', unitOfMeasure: 'Day', quantity: 320, unitPrice: 8500 },
  { projectItem: 'Data Migration Services', category: 'service', itemName: 'Data Migration & Cleansing', itemDescription: 'Full data migration including cleansing, mapping, validation, and reconciliation reports', unitOfMeasure: 'Service', quantity: 1, unitPrice: 380000 },
  { projectItem: 'End-User Training Program', category: 'service', itemName: 'End-User Training (Arabic)', itemDescription: 'Classroom and e-learning training for all user categories, delivered in Arabic and English', unitOfMeasure: 'Package', quantity: 1, unitPrice: 120000 },
  { projectItem: 'Annual Technical Support & Maintenance', category: 'service', itemName: '3-Year Support & Maintenance Contract', itemDescription: 'Includes software updates, security patches and helpdesk (8am–5pm, Sun–Thu, 4hr SLA)', unitOfMeasure: 'Year', quantity: 3, unitPrice: 280000 },
];

export const AI_EM_BOQ = [
  { purchaseType: 'product', itemName: 'Dell Latitude 5450 laptop', productId: 'ET-LP-5450', supplier: 'Al-Falak Electronics', orderUnit: 'Each', quantity: 20, unitPrice: 4650, shippingCharges: 0 },
  { purchaseType: 'product', itemName: 'Adobe Creative Cloud — annual licence', productId: 'ET-SW-ACC1', supplier: 'Saudi Business Machines', orderUnit: 'Each', quantity: 15, unitPrice: 3100, shippingCharges: 0 },
  { purchaseType: 'service', itemName: 'Office cleaning services', productId: 'ET-SV-CLN2', supplier: 'Rafal Facility Services', unitPrice: 18000 },
];

export const AI_PAYMENTS = [
  { stageName: 'Contract signing & kickoff', itemsDeliverables: 'Project charter, kickoff meeting minutes', percentage: 15 },
  { stageName: 'System design approval', itemsDeliverables: 'Solution architecture, integration design document', percentage: 20 },
  { stageName: 'Development & configuration', itemsDeliverables: 'Configured system in staging, data migration', percentage: 25 },
  { stageName: 'UAT sign-off', itemsDeliverables: 'UAT completion certificate, defect resolution log', percentage: 20 },
  { stageName: 'Go-live & training', itemsDeliverables: 'Production go-live, training completion certificates', percentage: 15 },
  { stageName: 'Project closure', itemsDeliverables: 'Project closure report, warranty activation', percentage: 5 },
];

export const MANDATORY_DOCS = ['Vendor Technical Proposal (Arabic & English)', 'Valid Commercial Registration (CR)', 'Cybersecurity Compliance Certificate (NCA ECC-1:2018)', 'Proposed Team CVs & Certifications'];
export const AI_TECH_DOCS = [
  'Implementation Methodology and Project Plan', 'System Architecture and Integration Design Document', 'Data Migration Plan and Strategy',
  'Quality Assurance and Testing Plan', 'Training Plan and Materials', 'Support and Maintenance Service Level Agreement', 'Sample Project Deliverables from Similar Projects',
];
export const AI_TECH_REQ = [
  { requirement: 'User capacity', description: 'System must support a minimum of 500 concurrent named users without performance degradation.' },
  { requirement: 'System availability', description: 'Minimum 99.5% uptime SLA during business hours (Sunday–Thursday, 7am–9pm). Planned maintenance must occur outside business hours.' },
  { requirement: 'Arabic language support', description: 'Full bilingual support (Arabic RTL and English LTR) across all modules, including reports and user interface.' },
  { requirement: 'ZATCA compliance', description: 'Full compliance with ZATCA Phase 2 e-invoicing (Fatoorah) requirements, including integration with ZATCA APIs.' },
  { requirement: 'SAP ECC integration', description: 'Seamless integration with existing SAP ECC 6.0 system for financial data synchronization, tested with live data.' },
  { requirement: 'NCA ECC compliance', description: 'All system components must comply with NCA Essential Cybersecurity Controls (ECC-1:2018).' },
  { requirement: 'Data residency', description: 'All data must be stored and processed within the Kingdom of Saudi Arabia. No data may be transferred to foreign servers.' },
  { requirement: 'Performance benchmarks', description: 'System response time must not exceed 3 seconds for standard transactions under peak load conditions.' },
];
export const AI_EVAL = [
  { description: 'Technical approach & implementation methodology', howApplied: 'Evaluated based on quality and clarity of proposed methodology, risk mitigation plan, and alignment with project requirements.', weight: 30 },
  { description: 'Team qualifications & relevant experience', howApplied: 'Assessed based on CVs, certifications (SAP, PMP), years of experience, and demonstrated delivery of similar ERP projects.', weight: 25 },
  { description: 'Quality of sample deliverables', howApplied: 'Evaluated based on quality of submitted sample deliverables from similar projects, demonstrating comparable scope and complexity.', weight: 20 },
  { description: 'Implementation timeline & project plan', howApplied: 'Assessed on realism, detail, milestone structure, and alignment with the contract duration requirements.', weight: 15 },
  { description: 'Post-implementation support plan', howApplied: 'Evaluated based on support model, SLA commitments, escalation procedures, and helpdesk capabilities.', weight: 10 },
];

export const DEFAULT_QUAL = [
  { id: 'qm-1', name: 'Previous experience', percentage: '', subCriteria: [
    { id: 'qs-1-1', name: 'Number of years of experience', range: '', percentage: '' },
    { id: 'qs-1-2', name: 'Number of projects (last 3 years)', range: '', percentage: '' },
    { id: 'qs-1-3', name: 'Total value of projects (last 3 years)', range: '', percentage: '' },
  ] },
  { id: 'qm-2', name: 'Existing contractual obligations', percentage: '', subCriteria: [
    { id: 'qs-2-1', name: 'Number of existing projects', range: '', percentage: '' },
    { id: 'qs-2-2', name: 'Value of existing projects', range: '', percentage: '' },
  ] },
  { id: 'qm-3', name: 'Human resources', percentage: '', subCriteria: [
    { id: 'qs-3-1', name: 'Number of employees', range: '', percentage: '' },
    { id: 'qs-3-2', name: 'Percentage of Saudi employees', range: '', percentage: '' },
  ] },
];
export const AI_QUAL = {
  'qm-1': { percentage: 40, sub: { 'qs-1-1': ['7+ years', 40], 'qs-1-2': ['5+ projects', 35], 'qs-1-3': ['SAR 2M+', 25] } },
  'qm-2': { percentage: 30, sub: { 'qs-2-1': ['2–8 projects', 50], 'qs-2-2': ['SAR 3M–15M', 50] } },
  'qm-3': { percentage: 30, sub: { 'qs-3-1': ['100+ employees', 50], 'qs-3-2': ['35%+', 50] } },
};

/* ── Technical standards (EA · Cybersecurity · PMO), library v2026.1 ──────── */
export const STD_VERSION = '2026.1';
export const STD_GROUPS = {
  hosting: 'Hosting & deployment', integration: 'Integration architecture', security: 'Cybersecurity',
  data: 'Data & infrastructure', nfr: 'Non-functional requirements', docs: 'Architecture documentation', delivery: 'Delivery & handover',
};
export const STD_LIBRARY = [
  { id: 'h1', group: 'hosting', owner: 'EA', en: 'SaaS is the preferred deployment model; state the hosting provider, region and tenancy model.', required: true },
  { id: 'h2', group: 'hosting', owner: 'Cybersecurity', en: 'All data and systems hosted within the Kingdom of Saudi Arabia (CST cloud classification level stated).', required: true },
  { id: 'h3', group: 'hosting', owner: 'EA', en: 'On-premises only: environment specifications (OS, database, virtualisation) and sizing.', when: { deployment: ['on-prem', 'hybrid'] } },
  { id: 'h4', group: 'hosting', owner: 'EA', en: 'Separate non-production environments (DEV / QA) with the same version as production.', when: { answers: ['build'] } },
  { id: 'i1', group: 'integration', owner: 'EA', en: 'All integrations are built on the organisation’s iPaaS; no point-to-point interfaces.', required: true },
  { id: 'i2', group: 'integration', owner: 'EA', en: 'Documented REST / OData APIs with versioning for every interface.', when: { answers: ['integrates'] } },
  { id: 'i3', group: 'integration', owner: 'EA', en: 'Single sign-on with the organisation’s identity provider (SAML 2.0 / OIDC).', required: true },
  { id: 's1', group: 'security', owner: 'Cybersecurity', en: 'Compliance with NCA Essential Cybersecurity Controls (ECC) and Cloud Cybersecurity Controls (CCC).', required: true },
  { id: 's2', group: 'security', owner: 'Cybersecurity', en: 'Encryption of data in transit (TLS 1.2+) and at rest (AES-256).', required: true },
  { id: 's3', group: 'security', owner: 'Cybersecurity', en: 'Annual penetration test and vulnerability remediation within agreed SLAs.', when: { answers: ['personal-data', 'external-users', 'build'] } },
  { id: 's4', group: 'security', owner: 'Cybersecurity', en: 'Audit logs exported to the organisation’s SIEM.', when: { answers: ['personal-data', 'critical'] } },
  { id: 's5', group: 'security', owner: 'Cybersecurity', en: 'Internet-facing: multi-factor authentication, web application firewall and DDoS protection.', when: { answers: ['external-users'] } },
  { id: 'd1', group: 'data', owner: 'EA', en: 'Data ownership remains with the organisation; full data export on exit in an open format.', required: true },
  { id: 'd2', group: 'data', owner: 'EA', en: 'Data migration approach, reconciliation and sign-off for each load.', when: { answers: ['migration'] } },
  { id: 'd3', group: 'data', owner: 'EA', en: 'Backup, retention and restore tested at least twice a year.', when: { answers: ['critical', 'personal-data'] } },
  { id: 'd4', group: 'data', owner: 'Cybersecurity', en: 'Personal data handled per the Personal Data Protection Law (PDPL); data classified per NDMO.', when: { answers: ['personal-data'] } },
  { id: 'd5', group: 'data', owner: 'EA', en: 'AI features follow SDAIA AI ethics principles; organisation data is not used to train vendor models without approval.', when: { answers: ['ai'] } },
  { id: 'n1', group: 'nfr', owner: 'EA', en: 'Availability of 99.9% monthly for production, with service credits.', when: { answers: ['critical'] } },
  { id: 'n2', group: 'nfr', owner: 'EA', en: 'Performance: key transactions respond within 3 seconds at peak load.', when: { answers: ['build', 'external-users'] } },
  { id: 'n3', group: 'nfr', owner: 'EA', en: 'Arabic and English user interface with right-to-left support.', when: { answers: ['build', 'external-users'] } },
  { id: 'n4', group: 'nfr', owner: 'EA', en: 'Disaster recovery: RPO ≤ 1 hour, RTO ≤ 4 hours.', when: { answers: ['critical'] } },
  { id: 'a1', group: 'docs', owner: 'EA', en: 'Current-state and target-state architecture documents.', required: true },
  { id: 'a2', group: 'docs', owner: 'EA', en: 'Solution architecture and integration design approved by EA before build.', when: { answers: ['build', 'integrates'] } },
  { id: 'p1', group: 'delivery', owner: 'PMO', en: 'Knowledge transfer, training and documentation handover before project closure.', required: true },
  { id: 'p2', group: 'delivery', owner: 'PMO', en: 'Project stages with deliverables linked to payment milestones.', when: { answers: ['build', 'migration'] } },
];

// Each question carries the pattern its suggested answer is read from.
export const STD_QUESTIONS = [
  { id: 'saas', short: 'Cloud service (SaaS)', en: 'Is it delivered as a cloud service (SaaS)?', yes: /saas|cloud|subscription|hosted by the vendor/i, no: /on[- ]?prem|our (own )?(servers|data ?cent(er|re))/i },
  { id: 'own-servers', short: 'Runs on our servers', en: 'Will any part run on our own servers?', ask: (a) => a.saas === true, yes: /on[- ]?prem|gateway|installed (in|on) our|data ?cent(er|re)|local server/i },
  { id: 'build', short: 'New build or upgrade', en: 'Is it a new implementation or an upgrade?', yes: /implement|upgrade|deploy|configur|new system|platform|roll-?out/i },
  { id: 'integrates', short: 'Internal integrations', en: 'Does it connect to our internal systems?', yes: /integrat|interface|\bapi|ipaas|connector|\bsap\b|\bhr\b/i },
  { id: 'migration', short: 'Data migration', en: 'Are we moving data from an existing system?', ask: (a) => a.build !== false, yes: /migrat|data load|legacy|replace/i },
  { id: 'personal-data', short: 'Personal / confidential data', en: 'Will it hold personal or confidential data?', yes: /\bhr\b|payroll|employee|customer|crm|citizen|patient|personal|erp|s\/4hana/i },
  { id: 'external-users', short: 'External users', en: 'Will people outside the organisation use it?', yes: /portal|citizens?|public[- ]facing|website|mobile app|external users/i, no: /internal (staff|users|use)|employees only/i },
  { id: 'critical', short: 'Business-critical', en: 'Would an outage stop critical work?', yes: /erp|s\/4hana|core|finance|payroll|network|firewall|data cent(er|re)/i },
  { id: 'ai', short: 'AI / analytics', en: 'Does it use AI or analytics on our data?', yes: /\bai\b|artificial intelligence|machine learning|analytics|\bbi\b|chatbot|copilot/i },
];

/* ── Business continuity screening + third-party risk ─────────────────────── */
const CRITICAL = /\berp\b|s\/4hana|core (system|banking)|payment|treasury|\bsoc\b|siem|security monitoring|network|data ?cent(er|re)|firewall|finance|payroll|clearing|swift/i;
const SUPPLEMENTARY = /branding|brand identity|general training|furniture|chairs|catering|event|marketing|printing|gift|décor|decor/i;
export const BCM_QUESTIONS = [
  { id: 'critical', short: 'Supports a critical system', en: 'Does this service support a critical system, application or business process?', desc: 'Judge the service itself, not your department.', yes: CRITICAL, no: SUPPLEMENTARY },
  { id: 'outage', short: 'Outage stops operations', en: 'If the service stopped for a day, would operations stop or be seriously affected?', desc: 'Think about who is affected and what cannot be done while it is down.', yes: CRITICAL, no: SUPPLEMENTARY },
  { id: 'people', short: 'Relies on vendor staff', en: 'Does the service rely on vendor staff to keep running?', desc: 'Monitoring operators, on-site engineers or outsourced staff.', yes: /manpower|personnel|\bstaff\b|operator|24\/7|\bsoc\b|monitoring service|outsourc|resident engineer|help ?desk|managed service/i, no: /licen[cs]e|hardware|equipment|furniture|chairs/i },
  { id: 'improve', short: 'Mainly an improvement', en: 'Is it mainly to improve quality, efficiency or convenience?', desc: 'Yes if work would carry on without it, just less smoothly.', yes: SUPPLEMENTARY, no: CRITICAL },
];
export const BCM_VERDICT = {
  applies: { en: 'Business continuity applies', why: 'The service supports a critical function and an outage would stop operations. Continuity clauses are added to the RFP.' },
  na: { en: 'Business continuity not needed', why: 'The service is not essential to a critical function. BCM confirms this in one step.' },
  bcm: { en: 'BCM will decide', why: 'Your answers point both ways. BCM reviews the service; the clauses are added so nothing is missing.' },
};
export const BCM_CLAUSES = [
  { id: 'rto', set: 'tech', en: 'Recovery Time Objective (RTO)', desc: 'Maximum time to restore the service after a disruption.', value: 'e.g. 4 hours' },
  { id: 'rpo', set: 'tech', en: 'Recovery Point Objective (RPO)', desc: 'Maximum acceptable data loss, measured in time.', value: 'e.g. 1 hour' },
  { id: 'bcp', set: 'tech', en: 'Business continuity plan', desc: 'The vendor submits a BCP showing how service continues during disruption.' },
  { id: 'dr', set: 'tech', en: 'Disaster recovery plan', desc: 'How systems and infrastructure are recovered after a major incident.' },
  { id: 'incident', set: 'tech', en: 'Incident reporting', desc: 'Incidents affecting continuity are reported within the agreed time.', value: 'e.g. 2 hours' },
  { id: 'recovery', set: 'tech', en: 'Recovery arrangements', desc: 'Procedures and resources to restore the service after failure.' },
  { id: 'exercise', set: 'tech', en: 'BCM exercises', desc: 'The vendor takes part in BCM exercises and shares the results.' },
  { id: 'iso', set: 'tech', en: 'BCM evidence (ISO 22301)', desc: 'ISO 22301 certificate or equivalent evidence.' },
  { id: 'backup', set: 'people', en: 'Backup personnel', desc: 'Named backup staff for every role that keeps the service running.' },
  { id: 'replace', set: 'people', en: 'Replacement time', desc: 'Unavailable staff are replaced within the agreed time.', value: 'e.g. 5 working days' },
  { id: 'people-exercise', set: 'people', en: 'Exercise participation (staff)', desc: 'Assigned staff take part in BCM exercises; reports are shared.' },
];
export const TPR_QUESTIONS = [
  { id: 'access', short: 'Access to our systems', en: 'Will the vendor access our systems or network?', desc: 'Remote support, integrations or on-site access.', from: 'integrates', yes: /integrat|remote support|on-?site|access to (our|the bank)|interface/i },
  { id: 'data', short: 'Handles confidential data', en: 'Will the vendor handle customer, personal or confidential data?', desc: 'Anything classified above Public.', from: 'personal-data', yes: /customer|personal|confidential|payroll|employee/i },
  { id: 'hosted', short: 'Hosted outside', en: 'Is the service hosted or run outside the organisation?', desc: 'Cloud, vendor data centre or vendor premises.', from: 'saas', yes: /cloud|saas|hosted|vendor premises|managed service/i },
  { id: 'subcontract', short: 'Uses subcontractors', en: 'Will the vendor use subcontractors?', desc: 'Any part of the service delivered by another company.', yes: /subcontract|third[- ]party|partner/i },
  { id: 'single', short: 'Hard to replace', en: 'Would it be hard to replace this vendor quickly?', desc: 'Proprietary product, sole source or a long migration to switch.', yes: /proprietary|sole source|s\/4hana|\bsap\b|erp/i },
  { id: 'customer', short: 'Customer-facing', en: 'Is the service customer-facing?', desc: 'Customers, citizens or partners see or use it.', from: 'external-users', yes: /portal|customer[- ]facing|citizens?|public website|mobile app/i },
];
export const RISK_RATING = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export const NEXT_STEPS = [
  { en: 'Line manager review', meta: '1–2 business days' },
  { en: 'Budget & policy approval', meta: '3–7 business days' },
  { en: 'Specialist reviews (EA, Cybersecurity, BCM)', meta: 'In parallel' },
  { en: 'Published to vendors on Etimad', meta: 'Upon approval' },
];
