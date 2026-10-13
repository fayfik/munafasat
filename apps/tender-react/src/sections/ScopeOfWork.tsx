import { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiScope, aiTerms } from '../lib/aiTender';
import { PROJECTS } from '../data/mockData';
import { FormField, SectionCard, Textarea, AIButton, Input, Select } from '../components/ui';
import { SparklesIcon } from '../components/Icons';
import ProjectIncludesSelect, { deriveIncludesFromItems, reviewDepartments, DEPARTMENTS, WorkflowDrawer } from '../components/ProjectIncludesSelect';

function calcEndDate(start: string, duration: string, type: string): string {
  if (!start || !duration) return '';
  const d = new Date(start);
  const n = parseInt(duration, 10);
  if (isNaN(n)) return '';
  if (type === 'days') d.setDate(d.getDate() + n);
  else if (type === 'months') d.setMonth(d.getMonth() + n);
  else if (type === 'years') d.setFullYear(d.getFullYear() + n);
  return d.toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcYears(start: string, duration: string, type: string): string {
  if (!start || !duration) return '';
  const n = parseInt(duration, 10);
  if (isNaN(n)) return '';
  if (type === 'years') return `${n} year${n > 1 ? 's' : ''}`;
  if (type === 'months') return `${(n / 12).toFixed(1)} years`;
  if (type === 'days') return `${(n / 365).toFixed(2)} years`;
  return '';
}

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

// Arabic samples — used when the app language is Arabic.
export const AI_SCOPE_AR = `يشمل هذا المشروع توريد وتركيب وتهيئة وتشغيل نظام تخطيط موارد المؤسسة (ERP). يلتزم المقاول بما يلي:

1. تراخيص البرمجيات: توفير جميع تراخيص برمجيات النظام المطلوبة لما لا يقل عن 500 مستخدم مُسمّى، شاملةً جميع الوحدات المحددة في جدول الكميات.

2. التنفيذ والتهيئة: تنفيذ كامل للنظام يشمل التصميم وإعداد قاعدة البيانات وتهيئة الوحدات وأتمتة سير العمل والتكامل مع الأنظمة القائمة (SAP ECC، ونظام الموارد البشرية، ونظام إدارة الوثائق).

3. ترحيل البيانات: ترحيل كامل للبيانات التاريخية من النظام القديم، شاملاً التنظيف والتحقق وتقارير المطابقة، مع تحقيق سلامة بيانات بنسبة 100%.

4. تدريب المستخدمين: برنامج تدريبي شامل لجميع فئات المستخدمين — مديرو النظام (5 أيام)، والمستخدمون المتقدمون (3 أيام)، والمستخدمون النهائيون (يوم واحد) — باللغتين العربية والإنجليزية.

5. دعم التشغيل الفعلي: دعم ميداني متفرّغ لمدة لا تقل عن 30 يوماً بعد التشغيل الفعلي لضمان استقرار النظام وتبنّي المستخدمين له.

6. الدعم الفني: ثلاث (3) سنوات من الدعم الفني والصيانة تشمل تحديثات البرمجيات والتصحيحات الأمنية وإصلاح الأعطال ودعم مكتب المساعدة (8 صباحاً – 5 مساءً، الأحد – الخميس، اتفاقية مستوى خدمة: استجابة خلال 4 ساعات).`;

export const AI_TERMS_AR = `1. يجب على المورّد الالتزام بالضوابط الأساسية للأمن السيبراني الصادرة عن الهيئة الوطنية للأمن السيبراني (ECC-1:2018) وجميع الأنظمة ذات الصلة.

2. يجب استضافة جميع الخدمات السحابية أو مكوّنات تخزين البيانات داخل المملكة العربية السعودية، التزاماً بإرشادات الحوسبة السحابية الحكومية (G-Cloud).

3. يجب على المورّد الحصول على جميع التراخيص التقنية المطلوبة من هيئة الاتصالات والفضاء والتقنية (CST) قبل بدء الخدمات.

4. يجب أن تدعم جميع البرمجيات الواجهتين العربية (من اليمين إلى اليسار) والإنجليزية (من اليسار إلى اليمين) مع توافق كامل مع يونيكود.

5. لا يجوز للمقاول التعاقد من الباطن على أكثر من 30% من إجمالي قيمة العقد دون موافقة خطية مسبقة من الجهة.

6. تكون فترة الضمان لجميع البرمجيات والأنظمة المسلّمة سنة واحدة (1) على الأقل من تاريخ الاستلام النهائي.`;

export default function ScopeOfWork() {
  const { formData, updateField } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const scopeAi = useAiAction();
  const termsAi = useAiAction();
  const scopeLoading = scopeAi.loading;
  const termsLoading = termsAi.loading;
  const [aiScopeText, setAiScopeText] = useState<string | null>(null);
  const [wfOpen, setWfOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  function generateLocation() {
    setLocLoading(true);
    window.setTimeout(() => {
      updateField('executionLocation', isAr
        ? 'المقر الرئيسي للجهة — الرياض، ومقر المقاول لأعمال التطوير. يجب أن تبقى جميع البيانات والأنظمة مُستضافة داخل المملكة العربية السعودية طوال مدة العقد.'
        : "The organization's headquarters — Riyadh, with the contractor's premises for off-site development. All data and systems must remain hosted within the Kingdom of Saudi Arabia for the full contract duration.");
      setLocLoading(false);
    }, 650);
  }

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);

  function generateScope() {
    scopeAi.run(() => aiScope(formData, isAr),
      (text) => { updateField('scopeOfWork', text); setAiScopeText(text); },
      () => { const s = isAr ? AI_SCOPE_AR : AI_SCOPE; updateField('scopeOfWork', s); setAiScopeText(s); });
  }

  function generateTerms() {
    termsAi.run(() => aiTerms(formData, isAr),
      (text) => updateField('scopeTerms', text),
      () => updateField('scopeTerms', isAr ? AI_TERMS_AR : AI_TERMS));
  }

  const endDate = calcEndDate(formData.startDate, formData.contractDuration, formData.contractDurationType);
  const yearsCalc = calcYears(formData.startDate, formData.contractDuration, formData.contractDurationType);

  // Start date can't be in the past — block past dates in the picker and flag any that slip through.
  const todayStr = new Date().toISOString().slice(0, 10);
  const startInPast = formData.startDate !== '' && formData.startDate < todayStr;

  // Auto-derived (locked) categories from the request's selected budgeted items
  // (plus any BOQ lines that have been added) — can't be removed.
  const budgetedNames = (selectedProject?.items ?? [])
    .filter((it) => (formData.selectedProjectItemIds ?? []).includes(it.id))
    .map((it) => it.name);
  const lockedIncludes = deriveIncludesFromItems([...budgetedNames, ...formData.boqItems.map((b) => b.itemName)].filter(Boolean));
  const allIncludes = [...new Set([...lockedIncludes, ...formData.scopeIncludes])];
  const reviewIds = reviewDepartments(allIncludes);

  return (
    <div className="space-y-5">
      {/* Scope of Work */}
      <SectionCard
        title="Project Scope of Work"
        titleAr="نطاق عمل المشروع"
        description="Describe the full scope of work, deliverable expectations, and technical requirements."
        descriptionAr="اصف نطاق العمل الكامل وتوقعات المخرجات والمتطلبات الفنية."
        action={<AIButton onClick={generateScope} loading={scopeLoading} label={t('Generate Scope', 'توليد النطاق')} />}
      >
        <div className="space-y-4">
          {/* What the project includes — 3 categories; each routes the request to specific departments */}
          <FormField label="Which department's approval is necessary?" labelAr="ما الإدارات التي يلزم اعتمادها؟" required
            hint={t('Auto-selected from your project and items (locked). Add others manually — each category changes which departments approve the request.', 'مُحدّدة تلقائياً من مشروعك وبنودك (مقفلة). أضف غيرها يدوياً — كل فئة تغيّر الجهات التي تعتمد الطلب.')}>
            <ProjectIncludesSelect value={formData.scopeIncludes} onChange={(v) => updateField('scopeIncludes', v)} locked={lockedIncludes} />

            <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2 rounded-lg border border-ai-100 bg-ai-50/60 px-3 py-2 flex-1 min-w-[260px]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-ai-600 mt-0.5 flex-shrink-0">
                  <circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="12" r="2.2" /><path d="M8 6h5a3 3 0 013 3v.5M8 18h5a3 3 0 003-3v-.5" />
                </svg>
                <p className="text-[12px] text-ai-800 leading-relaxed">
                  {t('Changing what the project includes changes the approval workflow — each category routes the request through specific departments.',
                     'تغيير ما يتضمنه المشروع يغيّر مسار الاعتماد — كل فئة توجّه الطلب عبر جهات محددة.')}
                  {reviewIds.length > 0 && (
                    <> {' '}{t('Current reviewers', 'المراجعون الحاليون')}: <span className="font-semibold">{reviewIds.map((d) => isAr ? DEPARTMENTS[d].ar : DEPARTMENTS[d].en).join(' · ')}</span>.</>
                  )}
                </p>
              </div>
              <button type="button" onClick={() => setWfOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 text-[12px] font-semibold hover:bg-brand-100 transition-colors flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 12h3M14 12h3" />
                </svg>
                {t('View workflow', 'عرض مسار الاعتماد')}
              </button>
            </div>
          </FormField>

          <FormField label="Project Scope of Work" labelAr="نطاق عمل المشروع" required>
            {scopeLoading ? (
              <div className="rounded-md border border-ai-200 bg-ai-50 p-4 ai-loading">
                <div className="flex items-center gap-2 text-ai-600 text-sm">
                  <SparklesIcon className="w-4 h-4 spin-slow" />
                  {t('AI is generating scope of work…', 'يقوم الذكاء الاصطناعي بتوليد نطاق العمل…')}
                </div>
                <div className="mt-3 space-y-2">
                  {[80, 60, 70, 50].map((w, i) => (
                    <div key={i} className="h-2.5 bg-ai-200 rounded-full" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            ) : (
              <Textarea
                value={formData.scopeOfWork}
                onChange={(e) => updateField('scopeOfWork', e.target.value)}
                rows={10}
                placeholder={t(
                  'Describe the scope of work, including all deliverables, technical requirements, and responsibilities of the contractor…',
                  'اصف نطاق العمل، بما يشمل جميع المخرجات والمتطلبات الفنية ومسؤوليات المقاول…'
                )}
              />
            )}
            {formData.scopeOfWork && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-neutral-400">{formData.scopeOfWork.length} {t('characters', 'حرف')}</p>
                {formData.scopeOfWork === aiScopeText && (
                  <span className="text-xs text-ai-600 flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3" />
                    {t('AI generated — review before submitting', 'مُولَّد بالذكاء الاصطناعي — راجع قبل التقديم')}
                  </span>
                )}
              </div>
            )}
          </FormField>
          <AiNote error={scopeAi.error} usedSample={scopeAi.usedSample} />
        </div>
      </SectionCard>

      {/* Terms & Conditions */}
      <SectionCard
        title="Scope-Specific Terms & Conditions"
        titleAr="الشروط الخاصة بحسب النطاق"
        description="Add any specific terms and conditions applicable to this scope of work."
        descriptionAr="أضف أي شروط وأحكام خاصة تنطبق على نطاق العمل هذا."
        action={<AIButton onClick={generateTerms} loading={termsLoading} label={t('Generate Terms', 'توليد الشروط')} />}
      >
        <FormField label="Scope-Specific Terms & Conditions" labelAr="الشروط الخاصة بحسب النطاق" optional>
          {termsLoading ? (
            <div className="rounded-md border border-ai-200 bg-ai-50 p-4 ai-loading">
              <div className="flex items-center gap-2 text-ai-600 text-sm">
                <SparklesIcon className="w-4 h-4 spin-slow" />
                {t('Generating terms & conditions…', 'جاري توليد الشروط والأحكام…')}
              </div>
            </div>
          ) : (
            <Textarea
              value={formData.scopeTerms}
              onChange={(e) => updateField('scopeTerms', e.target.value)}
              rows={7}
              placeholder={t(
                'Add scope-specific terms and conditions, compliance requirements, or special contractual obligations…',
                'أضف الشروط والأحكام الخاصة بالنطاق، ومتطلبات الامتثال، أو الالتزامات التعاقدية الخاصة…'
              )}
            />
          )}
        </FormField>
        <AiNote error={termsAi.error} usedSample={termsAi.usedSample} />
      </SectionCard>

      {/* Contract Duration & Location — moved here from Deliverables */}
      <SectionCard
        title="Contract Duration & Location"
        titleAr="مدة العقد والموقع"
        description="Define where work will be performed and the contract timeline."
        descriptionAr="حدد مكان تنفيذ العمل والجدول الزمني للعقد."
      >
        <div className="space-y-4">
          <FormField label="Work & Services Execution Location" labelAr="مكان تنفيذ الأعمال والخدمات" required
            action={<AIButton onClick={generateLocation} loading={locLoading} label={t('Generate with AI', 'توليد بالذكاء الاصطناعي')} />}>
            <Textarea
              value={formData.executionLocation}
              onChange={(e) => updateField('executionLocation', e.target.value)}
              rows={3}
              placeholder={t(
                'e.g. Organization headquarters — Riyadh, and contractor\'s premises for development work. All data must remain within the Kingdom of Saudi Arabia.',
                'مثال: المقر الرئيسي للمنظمة — الرياض، ومقر المقاول لأعمال التطوير. يجب أن تبقى جميع البيانات داخل المملكة العربية السعودية.'
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Work/Services Start Date" labelAr="تاريخ بدء الأعمال" required>
              <Input type="date" min={todayStr} value={formData.startDate} onChange={(e) => updateField('startDate', e.target.value)}
                className={startInPast ? 'border-error-300 focus:border-error-400 focus:ring-error-400/20' : ''} />
              {startInPast && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-error-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" /></svg>
                  {t('Start date can’t be in the past — pick today or a future date.', 'لا يمكن أن يكون تاريخ البدء في الماضي — اختر اليوم أو تاريخاً لاحقاً.')}
                </p>
              )}
            </FormField>
            <FormField label="Contract Duration" labelAr="مدة العقد" required>
              <div className="flex gap-2">
                <Select value={formData.contractDurationType}
                  onChange={(e) => updateField('contractDurationType', e.target.value as 'days' | 'months' | 'years')} className="w-28">
                  <option value="days">{t('Days', 'أيام')}</option>
                  <option value="months">{t('Months', 'أشهر')}</option>
                  <option value="years">{t('Years', 'سنوات')}</option>
                </Select>
                <Input type="number" min={1} value={formData.contractDuration}
                  onChange={(e) => updateField('contractDuration', e.target.value)} placeholder={t('e.g. 18', 'مثال: 18')} className="flex-1" />
              </div>
            </FormField>
          </div>

          {endDate && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3">
                <p className="text-xs text-neutral-500 mb-0.5">{t('Estimated End Date', 'تاريخ الانتهاء المتوقع')}</p>
                <p className="text-sm font-medium text-neutral-800">{endDate}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3">
                <p className="text-xs text-neutral-500 mb-0.5">{t('Duration in Years', 'المدة بالسنوات')}</p>
                <p className="text-sm font-medium text-neutral-800">{yearsCalc}</p>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <WorkflowDrawer open={wfOpen} onClose={() => setWfOpen(false)} categories={allIncludes} isAr={isAr} t={t} />
    </div>
  );
}
