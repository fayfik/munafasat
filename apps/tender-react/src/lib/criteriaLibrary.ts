// A library of evaluation & qualification criteria used in past (similar) projects,
// surfaced so a requester can browse what others added and import proven criteria
// instead of writing them from scratch. Each entry records who added it and when.

export interface LibProject {
  id: string;
  name: string; nameAr: string;
  code: string;
  entity: string; entityAr: string; // owning department / entity
}

export const SIMILAR_PROJECTS: LibProject[] = [
  { id: 'lib-erp',    name: 'Enterprise ERP Implementation',   nameAr: 'تنفيذ نظام تخطيط الموارد',        code: 'PRJ-2024-118', entity: 'Finance & IT',          entityAr: 'المالية وتقنية المعلومات' },
  { id: 'lib-cloud',  name: 'Cloud Infrastructure Migration',  nameAr: 'ترحيل البنية التحتية السحابية',   code: 'PRJ-2024-074', entity: 'IT Infrastructure',     entityAr: 'البنية التحتية التقنية' },
  { id: 'lib-portal', name: 'Digital Services Portal',         nameAr: 'بوابة الخدمات الرقمية',          code: 'PRJ-2023-203', entity: 'Digital Transformation', entityAr: 'التحول الرقمي' },
  { id: 'lib-cyber',  name: 'Cybersecurity Enhancement Program', nameAr: 'برنامج تعزيز الأمن السيبراني',   code: 'PRJ-2024-051', entity: 'Cybersecurity Office',  entityAr: 'مكتب الأمن السيبراني' },
  { id: 'lib-dc',     name: 'Data Center Modernization',       nameAr: 'تحديث مركز البيانات',            code: 'PRJ-2023-162', entity: 'IT Infrastructure',     entityAr: 'البنية التحتية التقنية' },
];

export interface LibEvalCriterion {
  id: string;
  description: string; descriptionAr: string;
  howApplied: string; howAppliedAr: string;
  weight: number;
  addedBy: string; addedByAr: string;
  addedOn: string; // ISO date
}

export const EVAL_LIBRARY: Record<string, LibEvalCriterion[]> = {
  'lib-erp': [
    { id: 'e-erp-1', description: 'Technical Approach & Implementation Methodology', descriptionAr: 'المنهجية الفنية وأسلوب التنفيذ', howApplied: 'Scored on clarity of methodology, risk mitigation, and fit to requirements.', howAppliedAr: 'يُقيَّم بوضوح المنهجية وخطة المخاطر ومدى الملاءمة للمتطلبات.', weight: 30, addedBy: 'Fatima Al-Zahrani', addedByAr: 'فاطمة الزهراني', addedOn: '2024-09-14' },
    { id: 'e-erp-2', description: 'Team Qualifications & Relevant Experience', descriptionAr: 'مؤهلات الفريق والخبرة ذات الصلة', howApplied: 'Assessed on CVs, SAP/PMP certifications and delivery of similar ERP projects.', howAppliedAr: 'يُقيَّم بالسير الذاتية وشهادات SAP/PMP وتنفيذ مشاريع مماثلة.', weight: 25, addedBy: 'Ahmed Al-Rashidi', addedByAr: 'أحمد الراشدي', addedOn: '2024-09-14' },
    { id: 'e-erp-3', description: 'Quality of Sample Deliverables', descriptionAr: 'جودة نماذج المخرجات', howApplied: 'Evaluated on submitted samples of comparable scope and complexity.', howAppliedAr: 'يُقيَّم بنماذج المخرجات المقدّمة بنطاق وتعقيد مماثلين.', weight: 20, addedBy: 'Sara Al-Ghamdi', addedByAr: 'سارة الغامدي', addedOn: '2024-09-20' },
    { id: 'e-erp-4', description: 'Implementation Timeline & Project Plan', descriptionAr: 'الجدول الزمني وخطة المشروع', howApplied: 'Assessed on realism, milestone structure and alignment with contract duration.', howAppliedAr: 'يُقيَّم بواقعية الخطة وبنية المراحل وتوافقها مع مدة العقد.', weight: 15, addedBy: 'Fatima Al-Zahrani', addedByAr: 'فاطمة الزهراني', addedOn: '2024-09-20' },
    { id: 'e-erp-5', description: 'Post-Implementation Support Plan', descriptionAr: 'خطة الدعم بعد التنفيذ', howApplied: 'Scored on support model, SLA commitments and escalation procedures.', howAppliedAr: 'يُقيَّم بنموذج الدعم والتزامات مستوى الخدمة وإجراءات التصعيد.', weight: 10, addedBy: 'Mohammed Al-Otaibi', addedByAr: 'محمد العتيبي', addedOn: '2024-09-22' },
  ],
  'lib-cloud': [
    { id: 'e-cloud-1', description: 'Migration Strategy & Zero-Downtime Approach', descriptionAr: 'استراتيجية الترحيل ونهج انعدام التوقف', howApplied: 'Scored on cutover plan, rollback strategy and downtime minimisation.', howAppliedAr: 'يُقيَّم بخطة التحويل واستراتيجية التراجع وتقليل التوقف.', weight: 35, addedBy: 'Abdullah Al-Harbi', addedByAr: 'عبدالله الحربي', addedOn: '2024-05-02' },
    { id: 'e-cloud-2', description: 'Security & Data Residency Compliance', descriptionAr: 'الأمن والامتثال لموطن البيانات', howApplied: 'Assessed on in-Kingdom hosting, encryption and NCA controls coverage.', howAppliedAr: 'يُقيَّم بالاستضافة داخل المملكة والتشفير وتغطية ضوابط الهيئة.', weight: 30, addedBy: 'Khalid Al-Shehri', addedByAr: 'خالد الشهري', addedOn: '2024-05-02' },
    { id: 'e-cloud-3', description: 'Cost Optimization & FinOps Model', descriptionAr: 'تحسين التكلفة ونموذج FinOps', howApplied: 'Evaluated on right-sizing, reserved capacity and ongoing cost governance.', howAppliedAr: 'يُقيَّم بتحجيم الموارد والسعة المحجوزة وحوكمة التكلفة.', weight: 20, addedBy: 'Noura Al-Dossari', addedByAr: 'نورة الدوسري', addedOn: '2024-05-08' },
    { id: 'e-cloud-4', description: 'Managed Operations & Monitoring', descriptionAr: 'التشغيل المُدار والمراقبة', howApplied: 'Scored on observability, incident response and reporting cadence.', howAppliedAr: 'يُقيَّم بقابلية المراقبة والاستجابة للحوادث ووتيرة التقارير.', weight: 15, addedBy: 'Mohammed Al-Otaibi', addedByAr: 'محمد العتيبي', addedOn: '2024-05-09' },
  ],
  'lib-portal': [
    { id: 'e-portal-1', description: 'User Experience & Accessibility (WCAG)', descriptionAr: 'تجربة المستخدم وإمكانية الوصول', howApplied: 'Assessed on usability testing evidence and WCAG 2.1 AA conformance.', howAppliedAr: 'يُقيَّم بأدلة اختبار الاستخدام ومطابقة WCAG 2.1 AA.', weight: 30, addedBy: 'Sara Al-Ghamdi', addedByAr: 'سارة الغامدي', addedOn: '2023-11-19' },
    { id: 'e-portal-2', description: 'Integration with National Platforms (Nafath, Absher)', descriptionAr: 'التكامل مع المنصات الوطنية (نفاذ، أبشر)', howApplied: 'Scored on integration design and tested SSO/identity flows.', howAppliedAr: 'يُقيَّم بتصميم التكامل واختبار تدفقات الدخول الموحّد.', weight: 25, addedBy: 'Ahmed Al-Rashidi', addedByAr: 'أحمد الراشدي', addedOn: '2023-11-19' },
    { id: 'e-portal-3', description: 'Arabic-First Bilingual Delivery', descriptionAr: 'تسليم ثنائي اللغة بأولوية العربية', howApplied: 'Evaluated on full RTL support and content parity across languages.', howAppliedAr: 'يُقيَّم بدعم الاتجاه من اليمين لليسار وتكافؤ المحتوى.', weight: 20, addedBy: 'Fatima Al-Zahrani', addedByAr: 'فاطمة الزهراني', addedOn: '2023-11-24' },
    { id: 'e-portal-4', description: 'Performance & Scalability', descriptionAr: 'الأداء وقابلية التوسع', howApplied: 'Assessed on load-test results under projected peak traffic.', howAppliedAr: 'يُقيَّم بنتائج اختبار الحِمل تحت ذروة الاستخدام المتوقعة.', weight: 25, addedBy: 'Noura Al-Dossari', addedByAr: 'نورة الدوسري', addedOn: '2023-11-25' },
  ],
  'lib-cyber': [
    { id: 'e-cyber-1', description: 'NCA ECC & Regulatory Compliance Coverage', descriptionAr: 'تغطية الامتثال لضوابط الهيئة والأنظمة', howApplied: 'Scored on mapping to ECC-1:2018 controls and evidence of prior audits.', howAppliedAr: 'يُقيَّم بالمواءمة مع ضوابط ECC-1:2018 وأدلة التدقيق السابقة.', weight: 35, addedBy: 'Khalid Al-Shehri', addedByAr: 'خالد الشهري', addedOn: '2024-04-11' },
    { id: 'e-cyber-2', description: 'SOC Capability & Threat Detection', descriptionAr: 'قدرات مركز العمليات واكتشاف التهديدات', howApplied: 'Assessed on SIEM/SOAR capability, use cases and MTTR commitments.', howAppliedAr: 'يُقيَّم بقدرات SIEM/SOAR وحالات الاستخدام وزمن الاستجابة.', weight: 30, addedBy: 'Khalid Al-Shehri', addedByAr: 'خالد الشهري', addedOn: '2024-04-11' },
    { id: 'e-cyber-3', description: 'Incident Response & Forensics', descriptionAr: 'الاستجابة للحوادث والتحليل الجنائي', howApplied: 'Scored on IR playbooks, retainer SLAs and forensic readiness.', howAppliedAr: 'يُقيَّم بأدلة الاستجابة واتفاقيات الخدمة والجاهزية الجنائية.', weight: 20, addedBy: 'Abdullah Al-Harbi', addedByAr: 'عبدالله الحربي', addedOn: '2024-04-15' },
    { id: 'e-cyber-4', description: 'Team Certifications (CISSP, GIAC)', descriptionAr: 'شهادات الفريق (CISSP، GIAC)', howApplied: 'Assessed on certified staff count and relevant sector experience.', howAppliedAr: 'يُقيَّم بعدد الموظفين المعتمدين والخبرة القطاعية.', weight: 15, addedBy: 'Mohammed Al-Otaibi', addedByAr: 'محمد العتيبي', addedOn: '2024-04-16' },
  ],
  'lib-dc': [
    { id: 'e-dc-1', description: 'High Availability & Redundancy Design', descriptionAr: 'تصميم التوافر العالي والتكرار', howApplied: 'Scored on N+1 design, tier rating and tested failover.', howAppliedAr: 'يُقيَّم بتصميم N+1 وتصنيف المستوى واختبار التحويل.', weight: 35, addedBy: 'Noura Al-Dossari', addedByAr: 'نورة الدوسري', addedOn: '2023-08-30' },
    { id: 'e-dc-2', description: 'Power & Cooling Efficiency (PUE)', descriptionAr: 'كفاءة الطاقة والتبريد (PUE)', howApplied: 'Assessed on target PUE and energy efficiency commitments.', howAppliedAr: 'يُقيَّم بمستهدف PUE والتزامات كفاءة الطاقة.', weight: 25, addedBy: 'Abdullah Al-Harbi', addedByAr: 'عبدالله الحربي', addedOn: '2023-08-30' },
    { id: 'e-dc-3', description: 'Migration & Commissioning Plan', descriptionAr: 'خطة الترحيل والتشغيل', howApplied: 'Scored on phased commissioning and workload migration approach.', howAppliedAr: 'يُقيَّم بالتشغيل المرحلي ونهج ترحيل أحمال العمل.', weight: 25, addedBy: 'Mohammed Al-Otaibi', addedByAr: 'محمد العتيبي', addedOn: '2023-09-04' },
    { id: 'e-dc-4', description: 'Warranty & Preventive Maintenance', descriptionAr: 'الضمان والصيانة الوقائية', howApplied: 'Assessed on warranty terms and preventive maintenance schedule.', howAppliedAr: 'يُقيَّم بشروط الضمان وجدول الصيانة الوقائية.', weight: 15, addedBy: 'Ahmed Al-Rashidi', addedByAr: 'أحمد الراشدي', addedOn: '2023-09-05' },
  ],
};

export interface LibQualSub { id: string; name: string; nameAr: string; range: string; percentage: number; }
export interface LibQualMain {
  id: string;
  /** The fixed criterion (qm-1 / qm-2 / qm-3) these values belong to. */
  fixedId: string;
  name: string; nameAr: string;
  percentage: number;
  subCriteria: LibQualSub[];
  addedBy: string; addedByAr: string;
  addedOn: string;
}

/** Values each similar project used for the FIXED qualification criteria (qm-1…qm-3).
 *  Import never adds criteria — it only applies these ranges and weights. */
export const QUAL_LIBRARY: Record<string, LibQualMain[]> = {
  'lib-erp': [
    { id: 'lib-erp:qm-1', fixedId: 'qm-1', name: 'Previous Experience', nameAr: 'الخبرة السابقة', percentage: 40, addedBy: 'Fatima Al-Zahrani', addedByAr: 'فاطمة الزهراني', addedOn: '2024-09-15',
      subCriteria: [{ id: 'qs-1-1', name: 'Number of years of experience', nameAr: 'عدد سنوات الخبرة', range: '7+ years', percentage: 40 }, { id: 'qs-1-2', name: 'Number of projects (last 3 years)', nameAr: 'عدد المشاريع خلال 3 سنوات', range: '5+ projects', percentage: 35 }, { id: 'qs-1-3', name: 'Total value of projects (last 3 years)', nameAr: 'إجمالي قيمة المشاريع خلال 3 سنوات', range: 'SAR 2M+', percentage: 25 }] },
    { id: 'lib-erp:qm-2', fixedId: 'qm-2', name: 'Existing Contractual Obligations', nameAr: 'الالتزامات التعاقدية القائمة', percentage: 30, addedBy: 'Fatima Al-Zahrani', addedByAr: 'فاطمة الزهراني', addedOn: '2024-09-15',
      subCriteria: [{ id: 'qs-2-1', name: 'Number of existing projects', nameAr: 'عدد المشاريع القائمة', range: '2–8 projects', percentage: 50 }, { id: 'qs-2-2', name: 'Value of existing projects', nameAr: 'قيمة المشاريع القائمة', range: 'SAR 3M–15M', percentage: 50 }] },
    { id: 'lib-erp:qm-3', fixedId: 'qm-3', name: 'Human Resources', nameAr: 'الموارد البشرية', percentage: 30, addedBy: 'Fatima Al-Zahrani', addedByAr: 'فاطمة الزهراني', addedOn: '2024-09-15',
      subCriteria: [{ id: 'qs-3-1', name: 'Number of employees', nameAr: 'عدد الموظفين', range: '100+ employees', percentage: 50 }, { id: 'qs-3-2', name: 'Percentage of Saudi employees', nameAr: 'نسبة الموظفين السعوديين', range: '35%+', percentage: 50 }] },
  ],
  'lib-cloud': [
    { id: 'lib-cloud:qm-1', fixedId: 'qm-1', name: 'Previous Experience', nameAr: 'الخبرة السابقة', percentage: 45, addedBy: 'Abdullah Al-Harbi', addedByAr: 'عبدالله الحربي', addedOn: '2024-05-03',
      subCriteria: [{ id: 'qs-1-1', name: 'Number of years of experience', nameAr: 'عدد سنوات الخبرة', range: '5+ years', percentage: 40 }, { id: 'qs-1-2', name: 'Number of projects (last 3 years)', nameAr: 'عدد المشاريع خلال 3 سنوات', range: '4+ projects', percentage: 30 }, { id: 'qs-1-3', name: 'Total value of projects (last 3 years)', nameAr: 'إجمالي قيمة المشاريع خلال 3 سنوات', range: 'SAR 5M+', percentage: 30 }] },
    { id: 'lib-cloud:qm-2', fixedId: 'qm-2', name: 'Existing Contractual Obligations', nameAr: 'الالتزامات التعاقدية القائمة', percentage: 25, addedBy: 'Abdullah Al-Harbi', addedByAr: 'عبدالله الحربي', addedOn: '2024-05-03',
      subCriteria: [{ id: 'qs-2-1', name: 'Number of existing projects', nameAr: 'عدد المشاريع القائمة', range: '2–6 projects', percentage: 60 }, { id: 'qs-2-2', name: 'Value of existing projects', nameAr: 'قيمة المشاريع القائمة', range: 'SAR 2M–10M', percentage: 40 }] },
    { id: 'lib-cloud:qm-3', fixedId: 'qm-3', name: 'Human Resources', nameAr: 'الموارد البشرية', percentage: 30, addedBy: 'Abdullah Al-Harbi', addedByAr: 'عبدالله الحربي', addedOn: '2024-05-03',
      subCriteria: [{ id: 'qs-3-1', name: 'Number of employees', nameAr: 'عدد الموظفين', range: '80+ employees', percentage: 60 }, { id: 'qs-3-2', name: 'Percentage of Saudi employees', nameAr: 'نسبة الموظفين السعوديين', range: '30%+', percentage: 40 }] },
  ],
  'lib-portal': [
    { id: 'lib-portal:qm-1', fixedId: 'qm-1', name: 'Previous Experience', nameAr: 'الخبرة السابقة', percentage: 50, addedBy: 'Ahmed Al-Rashidi', addedByAr: 'أحمد الراشدي', addedOn: '2023-11-20',
      subCriteria: [{ id: 'qs-1-1', name: 'Number of years of experience', nameAr: 'عدد سنوات الخبرة', range: '5+ years', percentage: 30 }, { id: 'qs-1-2', name: 'Number of projects (last 3 years)', nameAr: 'عدد المشاريع خلال 3 سنوات', range: '3+ projects', percentage: 40 }, { id: 'qs-1-3', name: 'Total value of projects (last 3 years)', nameAr: 'إجمالي قيمة المشاريع خلال 3 سنوات', range: 'SAR 1M+', percentage: 30 }] },
    { id: 'lib-portal:qm-2', fixedId: 'qm-2', name: 'Existing Contractual Obligations', nameAr: 'الالتزامات التعاقدية القائمة', percentage: 20, addedBy: 'Ahmed Al-Rashidi', addedByAr: 'أحمد الراشدي', addedOn: '2023-11-20',
      subCriteria: [{ id: 'qs-2-1', name: 'Number of existing projects', nameAr: 'عدد المشاريع القائمة', range: '1–5 projects', percentage: 50 }, { id: 'qs-2-2', name: 'Value of existing projects', nameAr: 'قيمة المشاريع القائمة', range: 'SAR 1M–8M', percentage: 50 }] },
    { id: 'lib-portal:qm-3', fixedId: 'qm-3', name: 'Human Resources', nameAr: 'الموارد البشرية', percentage: 30, addedBy: 'Ahmed Al-Rashidi', addedByAr: 'أحمد الراشدي', addedOn: '2023-11-20',
      subCriteria: [{ id: 'qs-3-1', name: 'Number of employees', nameAr: 'عدد الموظفين', range: '50+ employees', percentage: 50 }, { id: 'qs-3-2', name: 'Percentage of Saudi employees', nameAr: 'نسبة الموظفين السعوديين', range: '40%+', percentage: 50 }] },
  ],
  'lib-cyber': [
    { id: 'lib-cyber:qm-1', fixedId: 'qm-1', name: 'Previous Experience', nameAr: 'الخبرة السابقة', percentage: 40, addedBy: 'Khalid Al-Shehri', addedByAr: 'خالد الشهري', addedOn: '2024-04-12',
      subCriteria: [{ id: 'qs-1-1', name: 'Number of years of experience', nameAr: 'عدد سنوات الخبرة', range: '8+ years', percentage: 45 }, { id: 'qs-1-2', name: 'Number of projects (last 3 years)', nameAr: 'عدد المشاريع خلال 3 سنوات', range: '5+ projects', percentage: 35 }, { id: 'qs-1-3', name: 'Total value of projects (last 3 years)', nameAr: 'إجمالي قيمة المشاريع خلال 3 سنوات', range: 'SAR 3M+', percentage: 20 }] },
    { id: 'lib-cyber:qm-2', fixedId: 'qm-2', name: 'Existing Contractual Obligations', nameAr: 'الالتزامات التعاقدية القائمة', percentage: 25, addedBy: 'Khalid Al-Shehri', addedByAr: 'خالد الشهري', addedOn: '2024-04-12',
      subCriteria: [{ id: 'qs-2-1', name: 'Number of existing projects', nameAr: 'عدد المشاريع القائمة', range: '2–5 projects', percentage: 50 }, { id: 'qs-2-2', name: 'Value of existing projects', nameAr: 'قيمة المشاريع القائمة', range: 'SAR 2M–12M', percentage: 50 }] },
    { id: 'lib-cyber:qm-3', fixedId: 'qm-3', name: 'Human Resources', nameAr: 'الموارد البشرية', percentage: 35, addedBy: 'Khalid Al-Shehri', addedByAr: 'خالد الشهري', addedOn: '2024-04-12',
      subCriteria: [{ id: 'qs-3-1', name: 'Number of employees', nameAr: 'عدد الموظفين', range: '60+ employees', percentage: 60 }, { id: 'qs-3-2', name: 'Percentage of Saudi employees', nameAr: 'نسبة الموظفين السعوديين', range: '45%+', percentage: 40 }] },
  ],
  'lib-dc': [
    { id: 'lib-dc:qm-1', fixedId: 'qm-1', name: 'Previous Experience', nameAr: 'الخبرة السابقة', percentage: 45, addedBy: 'Noura Al-Dossari', addedByAr: 'نورة الدوسري', addedOn: '2023-09-01',
      subCriteria: [{ id: 'qs-1-1', name: 'Number of years of experience', nameAr: 'عدد سنوات الخبرة', range: '8+ years', percentage: 40 }, { id: 'qs-1-2', name: 'Number of projects (last 3 years)', nameAr: 'عدد المشاريع خلال 3 سنوات', range: '2+ projects', percentage: 40 }, { id: 'qs-1-3', name: 'Total value of projects (last 3 years)', nameAr: 'إجمالي قيمة المشاريع خلال 3 سنوات', range: 'SAR 10M+', percentage: 20 }] },
    { id: 'lib-dc:qm-2', fixedId: 'qm-2', name: 'Existing Contractual Obligations', nameAr: 'الالتزامات التعاقدية القائمة', percentage: 25, addedBy: 'Noura Al-Dossari', addedByAr: 'نورة الدوسري', addedOn: '2023-09-01',
      subCriteria: [{ id: 'qs-2-1', name: 'Number of existing projects', nameAr: 'عدد المشاريع القائمة', range: '1–4 projects', percentage: 50 }, { id: 'qs-2-2', name: 'Value of existing projects', nameAr: 'قيمة المشاريع القائمة', range: 'SAR 5M–20M', percentage: 50 }] },
    { id: 'lib-dc:qm-3', fixedId: 'qm-3', name: 'Human Resources', nameAr: 'الموارد البشرية', percentage: 30, addedBy: 'Noura Al-Dossari', addedByAr: 'نورة الدوسري', addedOn: '2023-09-01',
      subCriteria: [{ id: 'qs-3-1', name: 'Number of employees', nameAr: 'عدد الموظفين', range: '120+ employees', percentage: 50 }, { id: 'qs-3-2', name: 'Percentage of Saudi employees', nameAr: 'نسبة الموظفين السعوديين', range: '35%+', percentage: 50 }] },
  ],
};

/** Format an ISO date for display (e.g. 14 Sep 2024). */
export function formatLibDate(iso: string, isAr: boolean): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
