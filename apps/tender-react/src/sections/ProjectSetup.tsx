import React, { useState, useRef, useEffect } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { COST_CENTERS, PROJECTS } from '../data/mockData';
import { FormField, SectionCard, Select, ReadOnlyField, Textarea, Badge, Button, InfoBanner, AIButton } from '../components/ui';
import { SparklesIcon, SearchIcon, ChevronRightIcon, ClockIcon, CheckCircleIcon } from '../components/Icons';
import type { ProjectItemType } from '../types/tender';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiPurpose } from '../lib/aiTender';

const TYPE_BADGE: Record<ProjectItemType, React.ReactElement> = {
  assets: <Badge variant="assets">Assets</Badge>,
  services: <Badge variant="services">Services</Badge>,
  consumables: <Badge variant="consumables">Consumables</Badge>,
};

const SIMILAR_PROJECTS_DATA = [
  { id: 'sp-1', name: 'ERP Implementation Phase 1', nameAr: 'تطبيق ERP المرحلة الأولى', category: 'ERP', dept: 'IT & Digital Transformation', costCenter: 'IT-2024', date: '15 Mar 2024', owner: 'Mohammed Al-Qahtani', value: 'SAR 1.8M', match: 94 },
  { id: 'sp-2', name: 'SAP S/4HANA Migration', nameAr: 'ترحيل SAP S/4HANA', category: 'ERP', dept: 'Finance', costCenter: 'FIN-2023', date: '20 Nov 2023', owner: 'Ahmed Al-Rashidi', value: 'SAR 2.1M', match: 87 },
  { id: 'sp-3', name: 'Oracle ERP Upgrade', nameAr: 'ترقية Oracle ERP', category: 'ERP', dept: 'IT & Digital Transformation', costCenter: 'IT-2022', date: '08 Jun 2022', owner: 'Sarah Al-Otaibi', value: 'SAR 1.2M', match: 81 },
];

const ALL_PAST_PROJECTS = [
  ...SIMILAR_PROJECTS_DATA,
  { id: 'sp-4', name: 'Network Infrastructure Expansion', nameAr: 'توسعة البنية التحتية للشبكة', category: 'Network', dept: 'IT & Digital Transformation', costCenter: 'IT-2024', date: '22 Jul 2024', owner: 'Mohammed Al-Qahtani', value: 'SAR 950K', match: 0 },
  { id: 'sp-5', name: 'Cloud Migration Phase II', nameAr: 'الترحيل السحابي المرحلة الثانية', category: 'Cloud', dept: 'IT & Digital Transformation', costCenter: 'IT-2024', date: '08 Dec 2024', owner: 'Ahmed Al-Rashidi', value: 'SAR 3.4M', match: 0 },
  { id: 'sp-6', name: 'HR Management System', nameAr: 'نظام إدارة الموارد البشرية', category: 'HR', dept: 'Human Resources', costCenter: 'HR-2023', date: '01 Feb 2023', owner: 'Fatima Al-Zahrani', value: 'SAR 780K', match: 0 },
];

export default function ProjectSetup() {
  const { formData, updateField, goToSection, setImportedFromProject } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const purposeAi = useAiAction();
  const purposeAiLoading = purposeAi.loading;
  const [showBrowsePanel, setShowBrowsePanel] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseTab, setBrowseTab] = useState<'similar' | 'recent'>('similar');
  const similarRef = useRef<HTMLDivElement>(null);

  const hasTwoRoles = true;
  const availableProjects = PROJECTS.filter((p) => p.costCenterId === formData.costCenterId);
  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);

  useEffect(() => {
    if (showAISuggestion && similarRef.current) {
      setTimeout(() => similarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [showAISuggestion]);

  function handleCostCenterChange(id: string) {
    updateField('costCenterId', id);
    updateField('projectId', '');
    setShowAISuggestion(false);
  }

  function handleProjectChange(id: string) {
    updateField('projectId', id);
    const proj = PROJECTS.find((p) => p.id === id);
    if (proj) updateField('tenderingPurpose', proj.purpose);
    setShowAISuggestion(false);
    setTimeout(() => setShowAISuggestion(true), 500);
  }

  function handleAIGeneratePurpose() {
    if (!selectedProject) return;
    const sample = () => {
      const generated = isAr
        ? `الغرض من هذه المنافسة هو ${selectedProject.nameAr} بهدف تعزيز كفاءة العمليات وتحقيق أهداف التحول الرقمي وفق أعلى معايير الجودة والامتثال للأنظمة ذات الصلة.`
        : `The purpose of this tender is to procure ${selectedProject.name} services to enhance operational efficiency, support digital transformation objectives, and ensure compliance with applicable regulatory standards.`;
      updateField('tenderingPurpose', generated);
    };
    purposeAi.run(() => aiPurpose(formData, isAr), (text) => updateField('tenderingPurpose', text), sample);
  }

  function handleFetchDetails(projectName: string) {
    setImportedFromProject(projectName);
    goToSection(8);
  }

  const filteredBrowse = ALL_PAST_PROJECTS.filter((p) => {
    const q = browseSearch.toLowerCase();
    if (!q) return browseTab === 'similar' ? p.match > 0 : true;
    return (p.name.toLowerCase().includes(q) || p.dept.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }).filter((p) => browseTab === 'similar' ? p.match > 0 : true);

  return (
    <div className="space-y-5">
      {/* Source Type */}
      <SectionCard
        title="Request Type"
        titleAr="نوع الطلب"
        description="Select the procurement channel for this request."
        descriptionAr="اختر قناة المشتريات لهذا الطلب."
      >
        <FormField label="Procurement Channel" labelAr="قناة المشتريات" required>
          <div className="flex gap-3 mt-1">
            {([
              ['tendering', 'Tender', 'منافسة', t('For competitive tendering processes', 'لعمليات المنافسة التنافسية')],
              ['souq-etimad', 'Etimad Souq', 'سوق اعتماد', t('For marketplace purchases', 'للشراء من السوق الإلكتروني')],
            ] as const).map(([val, labelEn, labelAr, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => updateField('sourceType', val)}
                className={`flex-1 flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3.5 text-start transition-all ${
                  formData.sourceType === val
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.sourceType === val ? 'border-brand-600 bg-brand-600' : 'border-neutral-400'}`}>
                  {formData.sourceType === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-medium ${formData.sourceType === val ? 'text-brand-700' : 'text-neutral-700'}`}>
                  {isAr ? labelAr : labelEn}
                </span>
                <span className="text-xs text-neutral-400">{desc}</span>
              </button>
            ))}
          </div>
        </FormField>
      </SectionCard>

      {formData.sourceType === 'tendering' && (
        <>
          {/* Project Details */}
          <SectionCard
            title="Project Details"
            titleAr="تفاصيل المشروع"
            description="Select the cost center and project for this tender."
            descriptionAr="اختر مركز التكلفة والمشروع لهذه المنافسة."
          >
            <div className="space-y-4">
              <FormField
                label="Cost Center"
                labelAr="مركز التكلفة"
                required
                hint={hasTwoRoles ? t(
                  'You have access to multiple cost centers. Select the one this request should be raised under.',
                  'لديك صلاحية الوصول لعدة مراكز تكلفة. اختر المركز الذي سيُرفع الطلب تحته.'
                ) : undefined}
              >
                {hasTwoRoles ? (
                  <div className="flex gap-3 mt-1">
                    {COST_CENTERS.map((cc) => (
                      <button
                        key={cc.id}
                        type="button"
                        onClick={() => handleCostCenterChange(cc.id)}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-start transition-all ${
                          formData.costCenterId === cc.id
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.costCenterId === cc.id ? 'border-brand-600 bg-brand-600' : 'border-neutral-400'}`}>
                            {formData.costCenterId === cc.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${formData.costCenterId === cc.id ? 'text-brand-700' : 'text-neutral-700'}`}>
                              {isAr ? cc.nameAr : cc.name}
                            </p>
                            <p className="text-xs text-neutral-400">{cc.code}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <ReadOnlyField value={isAr ? COST_CENTERS[0].nameAr : COST_CENTERS[0].name} />
                )}
              </FormField>

              {formData.costCenterId && (
                <>
                  <FormField
                    label="Project"
                    labelAr="المشروع"
                    required
                    hint={t('Select the budgeted project this tender relates to.', 'اختر المشروع المدرج في الميزانية الذي تتعلق به هذه المنافسة.')}
                  >
                    <Select value={formData.projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                      <option value="">{t('Select a project…', 'اختر مشروعاً…')}</option>
                      {availableProjects.map((p) => (
                        <option key={p.id} value={p.id}>{isAr ? p.nameAr : p.name} ({p.code})</option>
                      ))}
                    </Select>
                  </FormField>

                  {selectedProject && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Project Name (English)" labelAr="اسم المشروع (بالإنجليزية)" readOnly>
                          <ReadOnlyField value={selectedProject.name} />
                        </FormField>
                        <FormField label="Project Name (Arabic)" labelAr="اسم المشروع (بالعربية)" readOnly>
                          <ReadOnlyField value={selectedProject.nameAr} />
                        </FormField>
                      </div>

                      <FormField
                        label="Purpose of Tendering"
                        labelAr="الغرض من المنافسة"
                        action={<AIButton onClick={handleAIGeneratePurpose} loading={purposeAiLoading} label={t('Generate Purpose', 'توليد الغرض')} />}
                      >
                        <Textarea
                          rows={3}
                          value={formData.tenderingPurpose}
                          onChange={(e) => updateField('tenderingPurpose', e.target.value)}
                          placeholder={t('Describe the purpose of this tender…', 'صف الغرض من هذه المنافسة…')}
                        />
                        <AiNote error={purposeAi.error} usedSample={purposeAi.usedSample} />
                      </FormField>

                      <FormField label="What Does Your Project Include?" labelAr="ماذا يتضمن مشروعك؟" readOnly>
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {selectedProject.includes
                            .replace(/\.$/, '')
                            .split(',')
                            .map((s) => s.trim().replace(/^and\s+/i, ''))
                            .filter(Boolean)
                            .map((chip) => (
                              <span
                                key={chip}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
                              >
                                {chip.charAt(0).toUpperCase() + chip.slice(1)}
                              </span>
                            ))}
                        </div>
                      </FormField>

                      {/* Project Items */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-neutral-700">
                            {t('Project Items', 'بنود المشروع')}
                            <span className="ms-1.5 text-xs text-neutral-400 font-normal">{t('Auto-fetched', 'مجلوب تلقائياً')}</span>
                          </label>
                        </div>
                        <div className="rounded-xl border border-neutral-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-neutral-50 border-b border-neutral-200">
                                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Item', 'البند')}</th>
                                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Arabic Name', 'الاسم بالعربية')}</th>
                                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Type', 'النوع')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {selectedProject.items.map((item) => (
                                <tr key={item.id} className="bg-white">
                                  <td className="px-4 py-2.5 text-neutral-700 font-medium">{item.name}</td>
                                  <td className="px-4 py-2.5 text-neutral-500 text-xs" dir="rtl">{item.nameAr}</td>
                                  <td className="px-4 py-2.5">{TYPE_BADGE[item.type]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </>
                  )}
                </>
              )}
            </div>
          </SectionCard>

          {/* Similar Previous Projects */}
          {showAISuggestion && selectedProject && (
            <div ref={similarRef}>
              <SectionCard
                className="border-ai-200 bg-ai-50/30"
                title="Similar previous projects"
                titleAr="مشاريع مماثلة سابقة"
                description="Based on your project, these past tenders are the closest match. Fetch details to pre-fill all sections."
                descriptionAr="بناءً على مشروعك، هذه المنافسات السابقة هي الأقرب تطابقاً. اجلب التفاصيل لملء جميع الأقسام تلقائياً."
                action={
                  <button onClick={() => setShowAISuggestion(false)} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                    {t('Dismiss', 'إغلاق')}
                  </button>
                }
              >
                <div className="space-y-3">
                  {/* AI badge */}
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-3.5 h-3.5 text-ai-600" />
                    <span className="text-xs text-ai-700 font-medium">
                      {t(
                        `${SIMILAR_PROJECTS_DATA.length} similar projects found in procurement history`,
                        `${SIMILAR_PROJECTS_DATA.length} مشاريع مماثلة وُجدت في سجل المشتريات`
                      )}
                    </span>
                  </div>

                  {/* Project cards */}
                  {SIMILAR_PROJECTS_DATA.map((sp) => (
                    <div key={sp.id} className="bg-white rounded-xl border border-neutral-200 px-5 py-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13px] font-semibold text-neutral-900">{isAr ? sp.nameAr : sp.name}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ai-50 text-ai-700 border border-ai-200">
                              {sp.category}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-50 text-success-700 border border-success-200">
                              {sp.match}% {t('match', 'تطابق')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-neutral-400 flex-wrap">
                            <span>{sp.dept}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />{sp.date}
                            </span>
                            <span>·</span>
                            <span>{sp.owner}</span>
                            <span>·</span>
                            <span className="font-medium text-neutral-600" dir="ltr">{sp.value}</span>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleFetchDetails(isAr ? sp.nameAr : sp.name)}
                        >
                          {t('Fetch Details', 'جلب التفاصيل')}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Hint */}
                  <p className="text-[11px] text-neutral-400 text-center px-4">
                    {t(
                      `Fetching details pre-fills procurement sections for "${isAr ? selectedProject.nameAr : selectedProject.name}". You can review and adjust all fields.`,
                      `جلب التفاصيل يملأ أقسام المشتريات لـ "${selectedProject.nameAr}" تلقائياً. يمكنك مراجعة جميع الحقول وتعديلها.`
                    )}
                  </p>

                  {/* Divider + Browse all */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-px bg-neutral-200" />
                    <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wide">{t('or', 'أو')}</span>
                    <div className="flex-1 h-px bg-neutral-200" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBrowsePanel((v) => !v)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm"
                  >
                    <ClockIcon className="w-4 h-4 text-neutral-400" />
                    {t('Browse all previous projects', 'تصفح جميع المشاريع السابقة')}
                    <ChevronRightIcon className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${showBrowsePanel ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Browse panel — in-flow */}
                  {showBrowsePanel && (
                    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden mt-1">
                      {/* Panel header */}
                      <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/60">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[13px] font-semibold text-neutral-900">{t('Choose a Template', 'اختر نموذجاً')}</p>
                            <p className="text-[11px] text-neutral-500 mt-0.5">{t('Import procurement details from a past project and adjust as needed', 'استورد تفاصيل المشتريات من مشروع سابق وعدّلها حسب الحاجة')}</p>
                          </div>
                          <button
                            onClick={() => setShowBrowsePanel(false)}
                            className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0 mt-0.5"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                          <SearchIcon className="w-3.5 h-3.5 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={browseSearch}
                            onChange={(e) => setBrowseSearch(e.target.value)}
                            placeholder={t('Search by name, category, department…', 'ابحث بالاسم أو الفئة أو القسم…')}
                            className="w-full ps-8 pe-3 py-2 text-[12px] border border-neutral-200 rounded-lg bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 focus:outline-none placeholder-neutral-400"
                          />
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mt-3 p-1 bg-neutral-100 rounded-lg">
                          {(['similar', 'recent'] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setBrowseTab(tab)}
                              className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                                browseTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                              }`}
                            >
                              {tab === 'similar' ? t('Similar Projects', 'مشاريع مماثلة') : t('Recently Used', 'المستخدمة مؤخراً')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Results */}
                      <div className="divide-y divide-neutral-100 max-h-96 overflow-y-auto">
                        {filteredBrowse.length === 0 ? (
                          <div className="px-5 py-10 text-center text-[12px] text-neutral-400">
                            {t('No projects found.', 'لا توجد مشاريع.')}
                          </div>
                        ) : filteredBrowse.map((p) => (
                          <div key={p.id} className="px-5 py-4 hover:bg-neutral-50/60 transition-colors">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[13px] font-semibold text-neutral-900">{isAr ? p.nameAr : p.name}</p>
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                                    {p.category}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
                              <div>
                                <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">{t('Dept · Cost Center', 'القسم · مركز التكلفة')}</p>
                                <p className="text-[11px] text-neutral-700">{p.dept} · {p.costCenter}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">{t('Status', 'الحالة')}</p>
                                <p className="text-[11px] text-success-700 font-medium flex items-center gap-1">
                                  <CheckCircleIcon className="w-3 h-3" /> {t('Completed', 'مكتمل')}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">{t('Last Modified', 'آخر تعديل')}</p>
                                <p className="text-[11px] text-neutral-700">{p.date}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">{t('Created by', 'أنشأه')}</p>
                                <p className="text-[11px] text-neutral-700">{p.owner}</p>
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => { setShowBrowsePanel(false); handleFetchDetails(isAr ? p.nameAr : p.name); }}
                              className="w-full justify-center"
                            >
                              {t('Fetch Details', 'جلب التفاصيل')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}
        </>
      )}

      {formData.sourceType === 'souq-etimad' && (
        <SectionCard>
          <InfoBanner variant="info">
            {t(
              'Etimad Souq (E-Market) flow selected. This uses a simplified procurement workflow: Requester → Manager → Procurement → Director. The full RFP fields (BOQ, Technical Evaluation, etc.) are not required for this type.',
              'تم اختيار مسار سوق اعتماد. يستخدم سير عمل مشتريات مبسطاً: مقدم الطلب ← المدير ← المشتريات ← المدير التنفيذي. حقول طلب تقديم العروض الكاملة (جدول الكميات، التقييم الفني، إلخ) غير مطلوبة لهذا النوع.'
            )}
          </InfoBanner>
          <div className="mt-4 space-y-4">
            <FormField label="Cost Center" labelAr="مركز التكلفة" required>
              <Select value={formData.costCenterId} onChange={(e) => handleCostCenterChange(e.target.value)}>
                <option value="">{t('Select cost center…', 'اختر مركز التكلفة…')}</option>
                {COST_CENTERS.map((cc) => (
                  <option key={cc.id} value={cc.id}>{isAr ? cc.nameAr : cc.name} ({cc.code})</option>
                ))}
              </Select>
            </FormField>
            {formData.costCenterId && (
              <FormField label="Project" labelAr="المشروع" required>
                <Select value={formData.projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                  <option value="">{t('Select a project…', 'اختر مشروعاً…')}</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{isAr ? p.nameAr : p.name}</option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
