// "What does this project include?" — category catalog and each project's default categories.
export interface ProjectCategory {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
}

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  { id: 'cybersecurity', title: 'Cybersecurity infrastructure', titleAr: 'البنية التحتية للأمن السيبراني', description: "Security controls, monitoring, or protective systems for the organization's infrastructure.", descriptionAr: 'ضوابط الأمن أو أنظمة المراقبة والحماية للبنية التحتية للمنشأة.' },
  { id: 'network', title: 'Network infrastructure', titleAr: 'البنية التحتية للشبكات', description: 'Switches, cabling, wireless, or other networking/connectivity components.', descriptionAr: 'المحولات والكابلات والشبكات اللاسلكية أو مكونات الاتصال الأخرى.' },
  { id: 'software-licenses', title: 'Software licenses', titleAr: 'تراخيص البرمجيات', description: 'Procurement of software from third-party vendors like Google, Oracle & SAP.', descriptionAr: 'شراء البرمجيات من موردين خارجيين مثل Google وOracle وSAP.' },
  { id: 'consulting', title: 'Consulting services', titleAr: 'الخدمات الاستشارية', description: 'Advisory, legal, or compliance engagements delivered by an external consultant.', descriptionAr: 'ارتباطات استشارية أو قانونية أو امتثال يقدمها مستشار خارجي.' },
  { id: 'managed-services', title: 'Managed services', titleAr: 'الخدمات المدارة', description: 'Ongoing third-party operation, support, or maintenance of a system or service.', descriptionAr: 'تشغيل أو دعم أو صيانة مستمرة لنظام أو خدمة من طرف ثالث.' },
  { id: 'implementation', title: 'Implementation & configuration', titleAr: 'التنفيذ والتهيئة', description: 'Setting up, configuring, and rolling out a system for the organization.', descriptionAr: 'إعداد النظام وتهيئته وإطلاقه للمنشأة.' },
  { id: 'data-migration', title: 'Data migration', titleAr: 'ترحيل البيانات', description: 'Moving, cleansing, and validating data from existing systems into a new one.', descriptionAr: 'نقل البيانات من الأنظمة القائمة إلى نظام جديد وتنقيتها والتحقق منها.' },
  { id: 'training', title: 'Training & capacity building', titleAr: 'التدريب وبناء القدرات', description: 'Courses, workshops, or learning materials for staff and end users.', descriptionAr: 'دورات أو ورش عمل أو مواد تعليمية للموظفين والمستخدمين.' },
  { id: 'support-maintenance', title: 'Technical support & maintenance', titleAr: 'الدعم الفني والصيانة', description: 'Helpdesk, updates, fixes, and service levels after go-live.', descriptionAr: 'مكتب المساعدة والتحديثات والإصلاحات ومستويات الخدمة بعد الإطلاق.' },
  { id: 'cloud-hosting', title: 'Cloud & hosting', titleAr: 'الحوسبة السحابية والاستضافة', description: 'Cloud platforms, hosting, storage, or data center capacity.', descriptionAr: 'المنصات السحابية أو الاستضافة أو التخزين أو سعة مراكز البيانات.' },
  { id: 'custom-development', title: 'Custom software development', titleAr: 'تطوير البرمجيات المخصصة', description: 'Design and build of bespoke applications, portals, or integrations.', descriptionAr: 'تصميم وبناء تطبيقات أو بوابات أو تكاملات مخصصة.' },
  { id: 'systems-integration', title: 'Systems integration', titleAr: 'تكامل الأنظمة', description: 'Connecting new and existing systems so data flows between them.', descriptionAr: 'ربط الأنظمة الجديدة والقائمة لتتدفق البيانات بينها.' },
  { id: 'testing', title: 'Testing & quality assurance', titleAr: 'الاختبار وضمان الجودة', description: 'Functional, performance, security, or acceptance testing.', descriptionAr: 'اختبارات وظيفية أو أداء أو أمنية أو اختبارات قبول.' },
  { id: 'hardware', title: 'Hardware & equipment', titleAr: 'الأجهزة والمعدات', description: 'Servers, laptops, devices, or other physical IT equipment.', descriptionAr: 'الخوادم أو الحواسيب المحمولة أو الأجهزة أو معدات تقنية أخرى.' },
  { id: 'fit-out', title: 'Design & fit-out works', titleAr: 'أعمال التصميم والتجهيز', description: 'Interior design, construction, and fit-out of office spaces.', descriptionAr: 'التصميم الداخلي وأعمال البناء وتجهيز المساحات المكتبية.' },
  { id: 'furniture', title: 'Furniture & fixtures', titleAr: 'الأثاث والتجهيزات', description: 'Office furniture, workstations, storage, and fixtures.', descriptionAr: 'الأثاث المكتبي ومحطات العمل ووحدات التخزين والتجهيزات.' },
  { id: 'audio-visual', title: 'Audio-visual equipment', titleAr: 'المعدات السمعية والبصرية', description: 'Screens, conferencing, sound, and presentation systems.', descriptionAr: 'الشاشات وأنظمة المؤتمرات والصوت والعرض.' },
  { id: 'facility-services', title: 'Facility services', titleAr: 'خدمات المرافق', description: 'Cleaning, security guarding, maintenance, or other building services.', descriptionAr: 'التنظيف أو الحراسة الأمنية أو الصيانة أو خدمات المباني الأخرى.' },
  { id: 'consumables', title: 'Consumables & supplies', titleAr: 'المستهلكات واللوازم', description: 'Recurring supplies such as stationery, toner, or spare parts.', descriptionAr: 'لوازم متكررة مثل القرطاسية والأحبار وقطع الغيار.' },
];

/** Categories each project already includes (shown locked; users can add more). */
export const PROJECT_DEFAULT_CATEGORIES: Record<string, string[]> = {
  'proj-001': ['software-licenses', 'implementation', 'data-migration', 'training', 'support-maintenance'],
  'proj-002': ['cloud-hosting', 'consulting', 'cybersecurity', 'managed-services'],
  'proj-003': ['custom-development', 'systems-integration', 'testing', 'cloud-hosting', 'support-maintenance'],
  'proj-101': ['software-licenses', 'implementation', 'systems-integration', 'training'],
  'proj-401': ['fit-out', 'furniture', 'audio-visual', 'consumables'],
};

export const categoryById = (id: string) => PROJECT_CATEGORIES.find((c) => c.id === id);
