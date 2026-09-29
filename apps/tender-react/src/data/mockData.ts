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
  {
    id: 'ten-001',
    title: 'Enterprise ERP System Upgrade',
    type: 'tendering',
    status: 'under-review',
    createdAt: '2025-07-15T09:30:00Z',
    updatedAt: '2025-08-28T14:22:00Z',
    department: 'IT & Digital Transformation',
    budget: 'SAR 2,450,000',
  },
  {
    id: 'ten-002',
    title: 'Cloud Infrastructure Migration',
    type: 'tendering',
    status: 'draft',
    createdAt: '2025-08-01T11:00:00Z',
    updatedAt: '2025-09-05T09:15:00Z',
    department: 'IT & Digital Transformation',
    budget: 'SAR 1,800,000',
  },
  {
    id: 'ten-003',
    title: 'Office Supplies & Stationery Q3 2025',
    type: 'souq-etimad',
    status: 'approved',
    createdAt: '2025-07-01T08:00:00Z',
    updatedAt: '2025-07-18T16:00:00Z',
    department: 'General Administration',
    budget: 'SAR 45,000',
  },
  {
    id: 'ten-004',
    title: 'Digital Services Portal Development',
    type: 'tendering',
    status: 'returned',
    createdAt: '2025-05-15T10:00:00Z',
    updatedAt: '2025-06-10T11:30:00Z',
    department: 'Digital Transformation Committee',
    budget: 'SAR 3,200,000',
  },
  {
    id: 'ten-005',
    title: 'Network Security Equipment Refresh',
    type: 'tendering',
    status: 'submitted',
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-09-10T15:00:00Z',
    department: 'Information Security',
    budget: 'SAR 980,000',
  },
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
