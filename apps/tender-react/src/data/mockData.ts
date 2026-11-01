import type { CostCenter, Project, Person, TenderDraft } from '../types/tender';

export const COST_CENTERS: CostCenter[] = [
  {
    id: 'cc-2401',
    code: 'CC-2401',
    name: 'IT & Digital Transformation',
    nameAr: 'تقنية المعلومات والتحول الرقمي',
  },
  {
    id: 'cc-3105',
    code: 'CC-3105',
    name: 'Digital Transformation Committee',
    nameAr: 'لجنة التحول الرقمي',
  },
];

/** Further cost centers the user can raise requests under, reached via "View more cost centers". */
export const MORE_COST_CENTERS: CostCenter[] = [
  { id: 'cc-1102', code: 'CC-1102', name: 'Finance & Accounting', nameAr: 'المالية والمحاسبة' },
  { id: 'cc-1240', code: 'CC-1240', name: 'Human Capital', nameAr: 'رأس المال البشري' },
  { id: 'cc-2210', code: 'CC-2210', name: 'Cybersecurity Office', nameAr: 'مكتب الأمن السيبراني' },
  { id: 'cc-3020', code: 'CC-3020', name: 'Strategy & Performance', nameAr: 'الاستراتيجية والأداء' },
  { id: 'cc-4410', code: 'CC-4410', name: 'Facilities & General Services', nameAr: 'المرافق والخدمات العامة' },
  { id: 'cc-5105', code: 'CC-5105', name: 'Legal Affairs', nameAr: 'الشؤون القانونية' },
  { id: 'cc-6001', code: 'CC-6001', name: 'Credit & Lending Operations', nameAr: 'عمليات الائتمان والإقراض' },
];

export const ALL_COST_CENTERS: CostCenter[] = [...COST_CENTERS, ...MORE_COST_CENTERS];

export const PROJECTS: Project[] = [
  {
    id: 'proj-001',
    code: 'PRJ-2025-001',
    costCenterId: 'cc-2401',
    name: 'Enterprise ERP System Upgrade',
    nameAr: 'ترقية نظام تخطيط موارد المؤسسة',
    purpose:
      'Upgrade and modernize the existing ERP system to improve operational efficiency and compliance with ZATCA e-invoicing requirements.',
    purposeAr:
      'ترقية وتحديث نظام تخطيط الموارد القائم لتحسين الكفاءة التشغيلية والامتثال لمتطلبات الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك.',
    includes:
      'Software licenses, implementation and configuration services, data migration, user training, and a 3-year technical support and maintenance contract.',
    regulatoryRecords:
      'Commercial Registration, Computer Systems Technical License (CST), National Cybersecurity Authority (NCA) Compliance Certificate, ZATCA E-invoicing Compliance',
    items: [
      { id: 'item-001', name: 'ERP Software Licenses', nameAr: 'تراخيص برامج نظام تخطيط الموارد', type: 'assets' },
      {
        id: 'item-002',
        name: 'Implementation & Configuration Services',
        nameAr: 'خدمات التنفيذ والتهيئة',
        type: 'services',
      },
      { id: 'item-003', name: 'Data Migration Services', nameAr: 'خدمات ترحيل البيانات', type: 'services' },
      { id: 'item-004', name: 'End-User Training Program', nameAr: 'برنامج تدريب المستخدمين', type: 'services' },
      {
        id: 'item-005',
        name: 'Annual Technical Support & Maintenance',
        nameAr: 'الدعم الفني والصيانة السنوية',
        type: 'consumables',
      },
    ],
  },
  {
    id: 'proj-002',
    code: 'PRJ-2025-002',
    costCenterId: 'cc-2401',
    name: 'Cloud Infrastructure Migration',
    nameAr: 'ترحيل البنية التحتية إلى السحابة',
    purpose:
      'Migration of on-premises infrastructure to government-approved cloud platforms to reduce operational costs, improve scalability, and ensure business continuity.',
    purposeAr:
      'ترحيل البنية التحتية المحلية إلى المنصات السحابية المعتمدة حكومياً لتقليل التكاليف التشغيلية وتحسين قابلية التوسع وضمان استمرارية الأعمال.',
    includes:
      'Cloud platform services, migration consulting and execution, security assessment and hardening, and 2-year managed cloud services.',
    regulatoryRecords:
      'Cloud Service Provider License (NCA), Data Residency Compliance Certificate, ISO 27001',
    items: [
      { id: 'item-010', name: 'Cloud Platform Subscription', nameAr: 'اشتراك المنصة السحابية', type: 'assets' },
      { id: 'item-011', name: 'Migration Consulting Services', nameAr: 'خدمات استشارات الترحيل', type: 'services' },
      {
        id: 'item-012',
        name: 'Security Assessment & Hardening',
        nameAr: 'تقييم الأمن والتقوية',
        type: 'services',
      },
      { id: 'item-013', name: 'Managed Cloud Services', nameAr: 'الخدمات السحابية المُدارة', type: 'consumables' },
    ],
  },
  {
    id: 'proj-003',
    code: 'PRJ-2025-003',
    costCenterId: 'cc-3105',
    name: 'Digital Services Portal Development',
    nameAr: 'تطوير بوابة الخدمات الرقمية',
    purpose:
      'Development of a citizen-facing digital services portal to streamline service delivery, reduce physical visits, and enhance user experience through digital channels.',
    purposeAr:
      'تطوير بوابة خدمات رقمية تواجه المستفيدين لتبسيط تقديم الخدمات وتقليل الزيارات الشخصية وتحسين تجربة المستخدم عبر القنوات الرقمية.',
    includes:
      'Portal UX design and development, back-end systems integration, performance testing, and 2-year support and hosting.',
    regulatoryRecords:
      'Government Digital Services Framework Compliance, Absher Integration License, Nafath Authentication License',
    items: [
      {
        id: 'item-020',
        name: 'Portal Design & Development',
        nameAr: 'تصميم وتطوير البوابة الإلكترونية',
        type: 'services',
      },
      {
        id: 'item-021',
        name: 'Systems Integration Services',
        nameAr: 'خدمات تكامل الأنظمة',
        type: 'services',
      },
      {
        id: 'item-022',
        name: 'Server & Hosting Infrastructure',
        nameAr: 'بنية الخوادم والاستضافة',
        type: 'assets',
      },
      {
        id: 'item-023',
        name: 'SSL Certificates & Domain Licenses',
        nameAr: 'شهادات SSL ورخص النطاق',
        type: 'consumables',
      },
    ],
  },
  {
    id: 'proj-101',
    code: 'PRJ-2025-101',
    costCenterId: 'cc-1102',
    name: 'Finance Automation Platform',
    nameAr: 'منصة أتمتة العمليات المالية',
    purpose: 'Automate accounts payable, reconciliation and financial reporting to shorten the monthly close and improve audit readiness.',
    purposeAr: 'أتمتة الحسابات الدائنة والتسويات والتقارير المالية لتقصير فترة الإقفال الشهري وتحسين الجاهزية للتدقيق.',
    includes: 'Platform subscriptions, process automation services, integration with the ERP, and staff training.',
    regulatoryRecords: 'Commercial Registration, NCA Compliance Certificate, ZATCA E-invoicing Compliance',
    items: [
      { id: 'item-101', name: 'Automation Platform Subscriptions', nameAr: 'اشتراكات منصة الأتمتة', type: 'assets' },
      { id: 'item-102', name: 'Process Automation Services', nameAr: 'خدمات أتمتة العمليات', type: 'services' },
      { id: 'item-103', name: 'ERP Integration Services', nameAr: 'خدمات التكامل مع نظام تخطيط الموارد', type: 'services' },
      { id: 'item-104', name: 'Finance Staff Training', nameAr: 'تدريب موظفي المالية', type: 'services' },
    ],
  },
  {
    id: 'proj-401',
    code: 'PRJ-2025-401',
    costCenterId: 'cc-4410',
    name: 'Head Office Workspace Refurbishment',
    nameAr: 'تجديد مساحات العمل في المقر الرئيسي',
    purpose: 'Refurbish two floors of the head office into modern open workspaces with meeting rooms and upgraded building services.',
    purposeAr: 'تجديد طابقين في المقر الرئيسي إلى مساحات عمل مفتوحة حديثة مع قاعات اجتماعات وتحديث خدمات المبنى.',
    includes: 'Design and fit-out works, office furniture, audio-visual equipment, and consumable supplies.',
    regulatoryRecords: 'Commercial Registration, Saudi Contractors Authority Classification, Civil Defense Approval',
    items: [
      { id: 'item-401', name: 'Design & Fit-out Works', nameAr: 'أعمال التصميم والتجهيز', type: 'services' },
      { id: 'item-402', name: 'Office Furniture', nameAr: 'الأثاث المكتبي', type: 'assets' },
      { id: 'item-403', name: 'Audio-Visual Equipment', nameAr: 'المعدات السمعية والبصرية', type: 'assets' },
      { id: 'item-404', name: 'Office Consumables', nameAr: 'المستلزمات المكتبية', type: 'consumables' },
    ],
  },
];

export const PEOPLE: Person[] = [
  {
    id: 'p01',
    name: 'Ahmed Al-Rashidi',
    nameAr: 'أحمد الراشدي',
    role: 'Senior Technical Architect',
    department: 'IT & Digital Transformation',
    initials: 'AR',
    avatarColor: '#1a6b38',
  },
  {
    id: 'p02',
    name: 'Fatima Al-Zahrani',
    nameAr: 'فاطمة الزهراني',
    role: 'Project Manager',
    department: 'IT & Digital Transformation',
    initials: 'FZ',
    avatarColor: '#2563eb',
  },
  {
    id: 'p03',
    name: 'Mohammed Al-Otaibi',
    nameAr: 'محمد العتيبي',
    role: 'Systems Engineer',
    department: 'Infrastructure',
    initials: 'MO',
    avatarColor: '#7c3aed',
  },
  {
    id: 'p04',
    name: 'Sara Al-Ghamdi',
    nameAr: 'سارة الغامدي',
    role: 'Business Analyst',
    department: 'Strategy & Transformation',
    initials: 'SG',
    avatarColor: '#d97706',
  },
  {
    id: 'p05',
    name: 'Khalid Al-Shehri',
    nameAr: 'خالد الشهري',
    role: 'Cybersecurity Specialist',
    department: 'Information Security',
    initials: 'KS',
    avatarColor: '#dc2626',
  },
  {
    id: 'p06',
    name: 'Noura Al-Dossari',
    nameAr: 'نورة الدوسري',
    role: 'Data Architect',
    department: 'Data & Analytics',
    initials: 'ND',
    avatarColor: '#0891b2',
  },
  {
    id: 'p07',
    name: 'Abdullah Al-Harbi',
    nameAr: 'عبدالله الحربي',
    role: 'Enterprise Architect',
    department: 'IT & Digital Transformation',
    initials: 'AH',
    avatarColor: '#065f46',
  },
  {
    id: 'p08',
    name: 'Reem Al-Mutairi',
    nameAr: 'ريم المطيري',
    role: 'Procurement Specialist',
    department: 'Procurement',
    initials: 'RM',
    avatarColor: '#9d174d',
  },
];

export const MOCK_TENDERS: TenderDraft[] = [
  { id: 'ten-001', title: 'Enterprise ERP System Upgrade', titleAr: 'ترقية نظام تخطيط موارد المؤسسة', type: 'tendering', status: 'under-review', createdAt: '2026-09-15T09:30:00Z', updatedAt: '2026-10-28T14:22:00Z', department: 'IT & Digital Transformation', departmentAr: 'تقنية المعلومات والتحول الرقمي', budget: 'SAR 9,940,000', requestNo: 'TEN-2026-004437', prNumber: '', createdByName: 'Ibrahim Al-Rashid', createdByNameAr: 'إبراهيم الراشد' },
  { id: 'ten-002', title: 'Cloud Infrastructure Migration', titleAr: 'ترحيل البنية التحتية السحابية', type: 'tendering', status: 'draft', createdAt: '2026-10-20T11:00:00Z', updatedAt: '2026-10-29T09:15:00Z', department: 'IT & Digital Transformation', departmentAr: 'تقنية المعلومات والتحول الرقمي', budget: 'SAR 1,800,000', requestNo: '', prNumber: '', createdByName: 'Fatima Al-Zahrani', createdByNameAr: 'فاطمة الزهراني' },
  { id: 'ten-003', title: 'Office Supplies & Stationery Q4', titleAr: 'القرطاسية واللوازم المكتبية للربع الرابع', type: 'souq-etimad', status: 'approved', createdAt: '2026-08-01T08:00:00Z', updatedAt: '2026-08-18T16:00:00Z', department: 'General Administration', departmentAr: 'الشؤون الإدارية', budget: 'SAR 45,000', requestNo: 'TEN-2026-004511', prNumber: '1000004521', createdByName: 'Sara Al-Ghamdi', createdByNameAr: 'سارة الغامدي' },
  { id: 'ten-004', title: 'Digital Services Portal Development', titleAr: 'تطوير بوابة الخدمات الرقمية', type: 'tendering', status: 'returned', createdAt: '2026-09-05T10:00:00Z', updatedAt: '2026-10-26T11:30:00Z', department: 'IT & Digital Transformation', departmentAr: 'تقنية المعلومات والتحول الرقمي', budget: 'SAR 3,200,000', requestNo: 'TEN-2026-004548', prNumber: '', createdByName: 'Ibrahim Al-Rashid', createdByNameAr: 'إبراهيم الراشد' },
  { id: 'ten-005', title: 'Network Security Equipment Refresh', titleAr: 'تحديث أجهزة أمن الشبكات', type: 'tendering', status: 'submitted', createdAt: '2026-10-12T08:00:00Z', updatedAt: '2026-10-14T15:00:00Z', department: 'Information Security', departmentAr: 'أمن المعلومات', budget: 'SAR 980,000', requestNo: 'TEN-2026-004585', prNumber: '', createdByName: 'Mohammed Al-Otaibi', createdByNameAr: 'محمد العتيبي' },
  { id: 'ten-006', title: 'Laptops for New Joiners (120 units)', titleAr: 'أجهزة محمولة للموظفين الجدد (120 جهازًا)', type: 'souq-etimad', status: 'approved', createdAt: '2026-07-10T08:30:00Z', updatedAt: '2026-07-22T12:00:00Z', department: 'IT & Digital Transformation', departmentAr: 'تقنية المعلومات والتحول الرقمي', budget: 'SAR 612,000', requestNo: 'TEN-2026-004622', prNumber: '1000004388', createdByName: 'Fatima Al-Zahrani', createdByNameAr: 'فاطمة الزهراني' },
  { id: 'ten-007', title: 'Treasury Management System', titleAr: 'نظام إدارة الخزينة', type: 'tendering', status: 'under-review', createdAt: '2026-09-28T09:00:00Z', updatedAt: '2026-10-27T10:40:00Z', department: 'Finance', departmentAr: 'المالية', budget: 'SAR 4,150,000', requestNo: 'TEN-2026-004659', prNumber: '', createdByName: 'Khalid Al-Qahtani', createdByNameAr: 'خالد القحطاني' },
  { id: 'ten-008', title: 'Annual Audit Services 2027', titleAr: 'خدمات المراجعة السنوية 2027', type: 'tendering', status: 'submitted', createdAt: '2026-10-18T07:45:00Z', updatedAt: '2026-10-19T09:00:00Z', department: 'Finance', departmentAr: 'المالية', budget: 'SAR 1,250,000', requestNo: 'TEN-2026-004696', prNumber: '', createdByName: 'Khalid Al-Qahtani', createdByNameAr: 'خالد القحطاني' },
  { id: 'ten-009', title: 'Employee Wellness Program', titleAr: 'برنامج صحة الموظفين', type: 'tendering', status: 'draft', createdAt: '2026-10-25T12:10:00Z', updatedAt: '2026-10-30T08:20:00Z', department: 'Human Resources', departmentAr: 'الموارد البشرية', budget: 'SAR 340,000', requestNo: '', prNumber: '', createdByName: 'Noura Al-Dosari', createdByNameAr: 'نورة الدوسري' },
  { id: 'ten-010', title: 'HR Learning Management Platform', titleAr: 'منصة إدارة التعلم للموارد البشرية', type: 'tendering', status: 'approved', createdAt: '2026-06-02T10:00:00Z', updatedAt: '2026-07-01T13:30:00Z', department: 'Human Resources', departmentAr: 'الموارد البشرية', budget: 'SAR 2,780,000', requestNo: 'TEN-2026-004770', prNumber: '1000004102', createdByName: 'Noura Al-Dosari', createdByNameAr: 'نورة الدوسري' },
  { id: 'ten-011', title: 'Legal Research Database Subscription', titleAr: 'اشتراك قاعدة بيانات الأبحاث القانونية', type: 'souq-etimad', status: 'submitted', createdAt: '2026-10-21T09:15:00Z', updatedAt: '2026-10-21T09:40:00Z', department: 'Legal Affairs', departmentAr: 'الشؤون القانونية', budget: 'SAR 96,000', requestNo: 'TEN-2026-004807', prNumber: '', createdByName: 'Sara Al-Ghamdi', createdByNameAr: 'سارة الغامدي' },
  { id: 'ten-012', title: 'Contract Lifecycle Management Tool', titleAr: 'أداة إدارة دورة حياة العقود', type: 'tendering', status: 'returned', createdAt: '2026-09-12T11:20:00Z', updatedAt: '2026-10-24T15:10:00Z', department: 'Legal Affairs', departmentAr: 'الشؤون القانونية', budget: 'SAR 1,460,000', requestNo: 'TEN-2026-004844', prNumber: '', createdByName: 'Sara Al-Ghamdi', createdByNameAr: 'سارة الغامدي' },
  { id: 'ten-013', title: 'HQ Cleaning & Hygiene Services', titleAr: 'خدمات النظافة للمقر الرئيسي', type: 'tendering', status: 'approved', createdAt: '2026-05-14T08:00:00Z', updatedAt: '2026-06-09T11:00:00Z', department: 'Facilities & Services', departmentAr: 'المرافق والخدمات', budget: 'SAR 2,050,000', requestNo: 'TEN-2026-004881', prNumber: '1000003967', createdByName: 'Mohammed Al-Otaibi', createdByNameAr: 'محمد العتيبي' },
  { id: 'ten-014', title: 'Ergonomic Office Chairs (300)', titleAr: 'كراسي مكتبية مريحة (300)', type: 'souq-etimad', status: 'under-review', createdAt: '2026-10-08T10:30:00Z', updatedAt: '2026-10-22T12:45:00Z', department: 'Facilities & Services', departmentAr: 'المرافق والخدمات', budget: 'SAR 210,000', requestNo: 'TEN-2026-004918', prNumber: '', createdByName: 'Mohammed Al-Otaibi', createdByNameAr: 'محمد العتيبي' },
  { id: 'ten-015', title: 'Business Continuity Plan Consultancy', titleAr: 'استشارات خطة استمرارية الأعمال', type: 'tendering', status: 'under-review', createdAt: '2026-09-30T07:30:00Z', updatedAt: '2026-10-28T09:10:00Z', department: 'Enterprise Risk', departmentAr: 'إدارة المخاطر', budget: 'SAR 870,000', requestNo: 'TEN-2026-004955', prNumber: '', createdByName: 'Ibrahim Al-Rashid', createdByNameAr: 'إبراهيم الراشد' },
  { id: 'ten-016', title: 'SIEM & SOC Managed Services', titleAr: 'خدمات مُدارة لمركز العمليات الأمنية', type: 'tendering', status: 'draft', createdAt: '2026-10-27T13:00:00Z', updatedAt: '2026-10-31T10:00:00Z', department: 'Information Security', departmentAr: 'أمن المعلومات', budget: 'SAR 5,400,000', requestNo: '', prNumber: '', createdByName: 'Khalid Al-Qahtani', createdByNameAr: 'خالد القحطاني' },
  { id: 'ten-017', title: 'Printer Toner & Consumables', titleAr: 'أحبار الطابعات والمستهلكات', type: 'souq-etimad', status: 'approved', createdAt: '2026-08-20T09:00:00Z', updatedAt: '2026-08-27T10:30:00Z', department: 'General Administration', departmentAr: 'الشؤون الإدارية', budget: 'SAR 38,500', requestNo: 'TEN-2026-004429', prNumber: '1000004610', createdByName: 'Sara Al-Ghamdi', createdByNameAr: 'سارة الغامدي' },
  { id: 'ten-018', title: 'Data Center UPS Replacement', titleAr: 'استبدال أنظمة الطاقة غير المنقطعة لمركز البيانات', type: 'tendering', status: 'submitted', createdAt: '2026-10-16T08:40:00Z', updatedAt: '2026-10-17T11:00:00Z', department: 'IT & Digital Transformation', departmentAr: 'تقنية المعلومات والتحول الرقمي', budget: 'SAR 1,120,000', requestNo: 'TEN-2026-004466', prNumber: '', createdByName: 'Fatima Al-Zahrani', createdByNameAr: 'فاطمة الزهراني' },
  { id: 'ten-019', title: 'Risk Analytics Software Licences', titleAr: 'تراخيص برمجيات تحليل المخاطر', type: 'souq-etimad', status: 'returned', createdAt: '2026-09-22T10:00:00Z', updatedAt: '2026-10-20T14:00:00Z', department: 'Enterprise Risk', departmentAr: 'إدارة المخاطر', budget: 'SAR 265,000', requestNo: 'TEN-2026-004503', prNumber: '', createdByName: 'Ibrahim Al-Rashid', createdByNameAr: 'إبراهيم الراشد' },
  { id: 'ten-020', title: 'Fleet Vehicles Leasing (24 months)', titleAr: 'استئجار مركبات الأسطول (24 شهرًا)', type: 'tendering', status: 'approved', createdAt: '2026-04-11T09:00:00Z', updatedAt: '2026-05-20T16:20:00Z', department: 'General Administration', departmentAr: 'الشؤون الإدارية', budget: 'SAR 3,640,000', requestNo: 'TEN-2026-004540', prNumber: '1000003811', createdByName: 'Noura Al-Dosari', createdByNameAr: 'نورة الدوسري' },
  { id: 'ten-021', title: 'Recruitment Agency Services', titleAr: 'خدمات وكالات التوظيف', type: 'tendering', status: 'under-review', createdAt: '2026-10-02T08:15:00Z', updatedAt: '2026-10-25T13:00:00Z', department: 'Human Resources', departmentAr: 'الموارد البشرية', budget: 'SAR 720,000', requestNo: 'TEN-2026-004577', prNumber: '', createdByName: 'Noura Al-Dosari', createdByNameAr: 'نورة الدوسري' },
  { id: 'ten-022', title: 'Penetration Testing Services', titleAr: 'خدمات اختبار الاختراق', type: 'souq-etimad', status: 'approved', createdAt: '2026-07-28T11:00:00Z', updatedAt: '2026-08-10T09:45:00Z', department: 'Information Security', departmentAr: 'أمن المعلومات', budget: 'SAR 185,000', requestNo: 'TEN-2026-004614', prNumber: '1000004455', createdByName: 'Mohammed Al-Otaibi', createdByNameAr: 'محمد العتيبي' },
  { id: 'ten-023', title: 'Meeting Room AV Upgrade', titleAr: 'ترقية الأنظمة السمعية والبصرية لقاعات الاجتماعات', type: 'souq-etimad', status: 'draft', createdAt: '2026-10-29T15:00:00Z', updatedAt: '2026-10-30T16:30:00Z', department: 'Facilities & Services', departmentAr: 'المرافق والخدمات', budget: 'SAR 158,000', requestNo: '', prNumber: '', createdByName: 'Fatima Al-Zahrani', createdByNameAr: 'فاطمة الزهراني' },
  { id: 'ten-024', title: 'ERP Finance Module Support', titleAr: 'دعم وحدة المالية في نظام تخطيط الموارد', type: 'tendering', status: 'submitted', createdAt: '2026-10-23T10:20:00Z', updatedAt: '2026-10-23T10:50:00Z', department: 'Finance', departmentAr: 'المالية', budget: 'SAR 690,000', requestNo: 'TEN-2026-004688', prNumber: '', createdByName: 'Khalid Al-Qahtani', createdByNameAr: 'خالد القحطاني' },
];

export const UNITS_OF_MEASURE = [
  'Each',
  'License',
  'Hour',
  'Day',
  'Month',
  'Year',
  'Service',
  'Package',
  'Kit',
  'Box',
  'Carton',
  'Set',
  'User',
  'GB',
  'TB',
];
