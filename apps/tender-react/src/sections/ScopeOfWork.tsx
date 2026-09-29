import { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiScope, aiTerms } from '../lib/aiTender';
import { PROJECTS } from '../data/mockData';
import { FormField, SectionCard, Textarea, AIButton, InfoBanner } from '../components/ui';
import { SparklesIcon } from '../components/Icons';

const AI_SCOPE = `This project encompasses the supply, installation, configuration, and commissioning of an enterprise ERP system. The contractor shall be responsible for:

1. Software Licenses: Provision of all required ERP software licenses for a minimum of 500 named users, including all modules specified in the Bill of Quantities.

2. Implementation & Configuration: Complete end-to-end system implementation including system design, database setup, module configuration, workflow automation, and integration with existing systems (SAP ECC, HRMS, and Document Management System).

3. Data Migration: Full migration of historical data from the existing legacy system, including data cleansing, validation, and reconciliation reports. The contractor must achieve 100% data integrity.

4. User Training: Comprehensive training program for all user groups — System Administrators (5 days), Power Users (3 days), and End Users (1 day) — conducted in both Arabic and English.

5. Go-Live Support: Dedicated on-site support for a minimum of 30 days post go-live to ensure system stability and user adoption.

6. Technical Support: Three (3) years of technical support and maintenance including software updates, security patches, bug fixes, and helpdesk support (8am–5pm, Sunday–Thursday, SLA: 4 hours response).`;

const AI_TERMS = `1. The vendor must comply with the National Cybersecurity Authority (NCA) Essential Cybersecurity Controls (ECC-1:2018) and all applicable cybersecurity regulations.

2. All cloud services or data storage components must be hosted within the Kingdom of Saudi Arabia, in compliance with Government Cloud (G-Cloud) guidelines.

3. The vendor must obtain all required technical licenses from the Communications, Space & Technology Commission (CST) prior to commencement of services.

4. All software must support both Arabic (RTL) and English (LTR) interfaces with full Unicode compliance.

5. The contractor must not subcontract more than 30% of the total contract value without prior written approval from the organization.

6. Warranty period for all delivered software and systems shall be a minimum of one (1) year from the date of final acceptance.`;

export default function ScopeOfWork() {
  const { formData, updateField } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const scopeAi = useAiAction();
  const termsAi = useAiAction();
  const scopeLoading = scopeAi.loading;
  const termsLoading = termsAi.loading;
  const [aiScopeText, setAiScopeText] = useState<string | null>(null);

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);

  function generateScope() {
    scopeAi.run(() => aiScope(formData, isAr),
      (text) => { updateField('scopeOfWork', text); setAiScopeText(text); },
      () => { updateField('scopeOfWork', AI_SCOPE); setAiScopeText(AI_SCOPE); });
  }

  function generateTerms() {
    termsAi.run(() => aiTerms(formData, isAr),
      (text) => updateField('scopeTerms', text),
      () => updateField('scopeTerms', AI_TERMS));
  }

  const regulatoryRecords = selectedProject?.regulatoryRecords ?? '';

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

      {/* Regulatory Records */}
      <SectionCard
        title="Regulatory Records & Licenses"
        titleAr="السجلات والتراخيص النظامية"
        description="Required certifications and registrations — auto-fetched from project configuration."
        descriptionAr="الشهادات والتسجيلات المطلوبة — مجلوبة تلقائياً من إعداد المشروع."
      >
        {regulatoryRecords ? (
          <div className="flex flex-wrap gap-2">
            {regulatoryRecords.split(',').map((record) => record.trim()).filter(Boolean).map((record, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
              >
                <svg className="w-3 h-3 text-neutral-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {record}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-neutral-400 italic">
            {t('Select a project to load regulatory requirements.', 'اختر مشروعاً لتحميل المتطلبات التنظيمية.')}
          </p>
        )}
        <InfoBanner variant="info" className="mt-4">
          {t(
            'Regulatory requirements are auto-fetched based on the selected project type. Vendors will be required to provide valid copies of all listed records with their proposals.',
            'يتم جلب المتطلبات التنظيمية تلقائياً بناءً على نوع المشروع المختار. سيُطلب من الموردين تقديم نسخ سارية من جميع السجلات المدرجة مع عروضهم.'
          )}
        </InfoBanner>
      </SectionCard>
    </div>
  );
}
