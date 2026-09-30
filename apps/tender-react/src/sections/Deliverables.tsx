import { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote, str, arr } from '../lib/useAiAction';
import { aiDeliverables, type AiDeliverable } from '../lib/aiTender';
import { FormField, SectionCard, Input, Textarea, Select, AIButton } from '../components/ui';
import { PlusIcon, TrashIcon, SparklesIcon } from '../components/Icons';

const AI_DELIVERABLES = [
  { phase: 'Phase 1', deliverableName: 'Project Kickoff & Initiation', deliveryDate: '2025-11-30', description: 'Project kickoff meeting, charter sign-off, detailed project plan, resource allocation plan, and communication plan.' },
  { phase: 'Phase 2', deliverableName: 'System Design & Architecture', deliveryDate: '2026-01-31', description: 'Solution architecture document, integration design, data migration plan, infrastructure specifications, and design approval sign-off.' },
  { phase: 'Phase 3', deliverableName: 'System Build & Configuration', deliveryDate: '2026-03-31', description: 'Fully configured ERP system in staging environment, completed data migration, and integration testing reports.' },
  { phase: 'Phase 4', deliverableName: 'User Acceptance Testing (UAT)', deliveryDate: '2026-04-30', description: 'UAT test scripts, UAT execution results, defect resolution log, and UAT sign-off certificate.' },
  { phase: 'Phase 5', deliverableName: 'Training & Change Management', deliveryDate: '2026-05-31', description: 'Completed training for all user groups (admins, power users, end users), training materials, and e-learning platform access.' },
  { phase: 'Phase 6', deliverableName: 'Go-Live & Hypercare', deliveryDate: '2026-07-31', description: 'Successful go-live, 30-day hypercare support, go-live report, and final project closure document.' },
];

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

export default function Deliverables() {
  const { formData, updateField, updateDeliverableRow, addDeliverableRow, removeDeliverableRow } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const delAi = useAiAction();
  const aiLoading = delAi.loading;

  function handleAISuggest() {
    const apply = (src: AiDeliverable[]) => updateField('deliverables', src.map((r) => ({
      id: crypto.randomUUID(), phase: str(r.phase), deliverableName: str(r.deliverableName),
      deliveryDate: str(r.deliveryDate), description: str(r.description),
    })));
    delAi.run(() => aiDeliverables(formData, isAr), (r) => apply(arr<AiDeliverable>(r)), () => apply(AI_DELIVERABLES));
  }

  const endDate = calcEndDate(formData.startDate, formData.contractDuration, formData.contractDurationType);
  const yearsCalc = calcYears(formData.startDate, formData.contractDuration, formData.contractDurationType);

  return (
    <div className="space-y-5">
      {/* Contract basics */}
      <SectionCard
        title="Contract Duration & Location"
        titleAr="مدة العقد والموقع"
        description="Define where work will be performed and the contract timeline."
        descriptionAr="حدد مكان تنفيذ العمل والجدول الزمني للعقد."
      >
        <div className="space-y-4">
          <FormField label="Work & Services Execution Location" labelAr="مكان تنفيذ الأعمال والخدمات" required>
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
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
              />
            </FormField>

            <div>
              <FormField label="Contract Duration" labelAr="مدة العقد" required>
                <div className="flex gap-2">
                  <Input
                    type="number" min={1}
                    value={formData.contractDuration}
                    onChange={(e) => updateField('contractDuration', e.target.value)}
                    placeholder={t('e.g. 18', 'مثال: 18')}
                    className="flex-1"
                  />
                  <Select
                    value={formData.contractDurationType}
                    onChange={(e) => updateField('contractDurationType', e.target.value as 'days' | 'months' | 'years')}
                    className="w-28"
                  >
                    <option value="days">{t('Days', 'أيام')}</option>
                    <option value="months">{t('Months', 'أشهر')}</option>
                    <option value="years">{t('Years', 'سنوات')}</option>
                  </Select>
                </div>
              </FormField>
            </div>
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

      {/* Deliverables */}
      <SectionCard
        title="Deliverables"
        titleAr="المخرجات"
        description="Define project phases and their expected deliverables."
        descriptionAr="حدد مراحل المشروع ومخرجاتها المتوقعة."
        action={<AIButton onClick={handleAISuggest} loading={aiLoading} label={t('AI Suggest Phases', 'اقتراح المراحل')} />}
      >
        {aiLoading && (
          <div className="mb-4 rounded-lg border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm">
              <SparklesIcon className="w-4 h-4 spin-slow" />
              {t('AI is generating project phases and deliverables…', 'يقوم الذكاء الاصطناعي بتوليد مراحل المشروع والمخرجات…')}
            </div>
          </div>
        )}

        <AiNote error={delAi.error} usedSample={delAi.usedSample} />
        <div className="space-y-3 mt-3">
          {formData.deliverables.map((row, idx) => (
            <div key={row.id} className="rounded-xl border border-neutral-200 bg-white p-4 group slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                  {t('Deliverable', 'المخرج')} {idx + 1}
                </span>
                <button
                  onClick={() => removeDeliverableRow(row.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-error-500 transition-all"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Phase" labelAr="المرحلة" required>
                  <Input
                    value={row.phase}
                    onChange={(e) => updateDeliverableRow(row.id, { phase: e.target.value })}
                    placeholder={t('e.g. Phase 1', 'مثال: المرحلة 1')}
                  />
                </FormField>
                <FormField label="Deliverable Name" labelAr="اسم المخرج" required>
                  <Input
                    value={row.deliverableName}
                    onChange={(e) => updateDeliverableRow(row.id, { deliverableName: e.target.value })}
                    placeholder={t('e.g. System Design Document', 'مثال: وثيقة تصميم النظام')}
                  />
                </FormField>
                <FormField label="Delivery Date" labelAr="موعد التسليم" optional>
                  <Input
                    type="date"
                    value={row.deliveryDate}
                    onChange={(e) => updateDeliverableRow(row.id, { deliveryDate: e.target.value })}
                  />
                </FormField>
                <FormField label="Description" labelAr="الوصف" required className="col-span-1">
                  <Textarea
                    value={row.description}
                    onChange={(e) => updateDeliverableRow(row.id, { description: e.target.value })}
                    rows={2}
                    placeholder={t('Describe what this deliverable includes…', 'اصف ما يتضمنه هذا المخرج…')}
                  />
                </FormField>
              </div>
            </div>
          ))}

          {formData.deliverables.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
              {t('No deliverables defined. Add phases manually or use AI Suggest.', 'لم تُحدَّد مخرجات. أضف مراحل يدوياً أو استخدم اقتراح الذكاء الاصطناعي.')}
            </div>
          )}
        </div>

        <button
          onClick={addDeliverableRow}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          {t('Add Deliverable', 'إضافة مخرج')}
        </button>
      </SectionCard>
    </div>
  );
}
