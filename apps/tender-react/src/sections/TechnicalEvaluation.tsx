import { useState, useRef } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote, num, str, arr } from '../lib/useAiAction';
import { aiTechDocs, aiTechReqs, aiEvalCriteria, type AiReq, type AiCriterion } from '../lib/aiTender';
import { FormField, SectionCard, Textarea, Input, AIButton, PeoplePicker, InfoBanner } from '../components/ui';
import { PlusIcon, TrashIcon, SparklesIcon, AlertTriangleIcon, CheckCircleIcon, XIcon } from '../components/Icons';

export const AI_TECH_DOCS = [
  'Vendor Technical Proposal (Arabic & English)',
  'Implementation Methodology and Project Plan',
  'System Architecture and Integration Design Document',
  'Data Migration Plan and Strategy',
  'Quality Assurance and Testing Plan',
  'Training Plan and Materials',
  'Support and Maintenance Service Level Agreement',
  'Cybersecurity Compliance Certificate (NCA ECC-1:2018)',
  'Sample Project Deliverables from Similar Projects',
  'Proposed Team CVs and Certifications (including SAP certifications)',
];

export const AI_TECH_REQUIREMENTS = [
  { requirement: 'User Capacity', description: 'System must support a minimum of 500 concurrent named users without performance degradation.' },
  { requirement: 'System Availability', description: 'Minimum 99.5% uptime SLA during business hours (Sunday–Thursday, 7am–9pm). Planned maintenance must occur outside business hours.' },
  { requirement: 'Arabic Language Support', description: 'Full bilingual support (Arabic RTL and English LTR) across all modules, including reports and user interface.' },
  { requirement: 'ZATCA Compliance', description: 'Full compliance with ZATCA Phase 2 e-invoicing (Fatoorah) requirements, including integration with ZATCA APIs.' },
  { requirement: 'SAP ECC Integration', description: 'Seamless integration with existing SAP ECC 6.0 system for financial data synchronization, tested with live data.' },
  { requirement: 'NCA ECC Compliance', description: 'All system components must comply with NCA Essential Cybersecurity Controls (ECC-1:2018).' },
  { requirement: 'Data Residency', description: 'All data must be stored and processed within the Kingdom of Saudi Arabia. No data may be transferred to foreign servers.' },
  { requirement: 'Performance Benchmarks', description: 'System response time must not exceed 3 seconds for standard transactions under peak load conditions.' },
];

export const AI_EVAL_CRITERIA = [
  { description: 'Technical Approach & Implementation Methodology', howApplied: 'Evaluated based on quality and clarity of proposed methodology, risk mitigation plan, and alignment with project requirements.', weight: 30 },
  { description: 'Team Qualifications & Relevant Experience', howApplied: 'Assessed based on CVs, certifications (SAP, PMP), years of experience, and demonstrated delivery of similar ERP projects.', weight: 25 },
  { description: 'Quality of Sample Deliverables', howApplied: 'Evaluated based on quality of submitted sample deliverables from similar projects, demonstrating comparable scope and complexity.', weight: 20 },
  { description: 'Implementation Timeline & Project Plan', howApplied: 'Assessed on realism, detail, milestone structure, and alignment with the contract duration requirements.', weight: 15 },
  { description: 'Post-Implementation Support Plan', howApplied: 'Evaluated based on support model, SLA commitments, escalation procedures, and helpdesk capabilities.', weight: 10 },
];

export default function TechnicalEvaluation() {
  const { formData, updateField, updateTechReqRow, addTechReqRow, removeTechReqRow, updateEvalRow, addEvalRow, removeEvalRow, setTechnicalCommitteeMembers, evalWeightTotal } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const docsAi = useAiAction();
  const reqAi = useAiAction();
  const evalAi = useAiAction();
  const docsLoading = docsAi.loading;
  const reqLoading = reqAi.loading;
  const evalLoading = evalAi.loading;
  const [docInput, setDocInput] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);

  function generateDocs() {
    docsAi.run(() => aiTechDocs(formData, isAr),
      (r) => updateField('technicalDocumentsList', arr<unknown>(r).map(str).filter(Boolean)),
      () => updateField('technicalDocumentsList', AI_TECH_DOCS));
  }

  function addDoc(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const list = formData.technicalDocumentsList as string[];
    if (!list.includes(trimmed)) updateField('technicalDocumentsList', [...list, trimmed]);
    setDocInput('');
  }

  function removeDoc(index: number) {
    const list = formData.technicalDocumentsList as string[];
    updateField('technicalDocumentsList', list.filter((_, i) => i !== index));
  }

  function generateReqs() {
    const apply = (src: AiReq[]) => updateField('technicalRequirements', src.map((r) => ({
      id: crypto.randomUUID(), requirement: str(r.requirement), description: str(r.description),
    })));
    reqAi.run(() => aiTechReqs(formData, isAr), (r) => apply(arr<AiReq>(r)), () => apply(AI_TECH_REQUIREMENTS));
  }

  function generateEval() {
    const apply = (src: AiCriterion[]) => updateField('evaluationCriteria', src.map((r) => ({
      id: crypto.randomUUID(), description: str(r.description), howApplied: str(r.howApplied), weight: num(r.weight),
    })));
    evalAi.run(() => aiEvalCriteria(formData, isAr), (r) => apply(arr<AiCriterion>(r)), () => apply(AI_EVAL_CRITERIA));
  }

  const weightOk   = evalWeightTotal === 100;
  const weightOver = evalWeightTotal > 100;

  return (
    <div className="space-y-5">
      {/* Committee Members */}
      <SectionCard
        title="Technical Evaluation Committee"
        titleAr="لجنة التقييم الفني"
        description="Select the committee members responsible for evaluating technical proposals."
        descriptionAr="اختر أعضاء اللجنة المسؤولين عن تقييم العروض الفنية."
      >
        <PeoplePicker
          value={formData.technicalCommitteeMembers}
          onChange={setTechnicalCommitteeMembers}
        />
        {formData.technicalCommitteeMembers.length > 0 && (
          <p className="mt-2 text-xs text-neutral-400">
            {formData.technicalCommitteeMembers.length} {t('member(s) selected', 'عضو/أعضاء مختارون')}
          </p>
        )}
      </SectionCard>

      {/* Technical Documents */}
      <SectionCard
        title="Technical Documents List"
        titleAr="قائمة الوثائق الفنية"
        description="List all technical documents vendors must submit with their proposals."
        descriptionAr="اذكر جميع الوثائق الفنية التي يجب على الموردين تقديمها مع عروضهم."
        action={<AIButton onClick={generateDocs} loading={docsLoading} label={t('AI Suggest', 'اقتراح بالذكاء الاصطناعي')} />}
      >
        {docsLoading ? (
          <div className="rounded-md border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm">
              <SparklesIcon className="w-4 h-4 spin-slow" />
              {t('Generating document list…', 'جاري توليد قائمة الوثائق…')}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Chips */}
            {(formData.technicalDocumentsList as string[]).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(formData.technicalDocumentsList as string[]).map((doc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 ps-3 pe-2 py-1.5 rounded-full text-[12px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 group"
                  >
                    {doc}
                    <button
                      type="button"
                      onClick={() => removeDoc(i)}
                      className="text-neutral-400 hover:text-error-500 transition-colors flex-shrink-0"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Add input */}
            <div className="flex gap-2">
              <input
                ref={docInputRef}
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoc(docInput); } }}
                placeholder={t('Type a document name and press Enter…', 'اكتب اسم الوثيقة واضغط Enter…')}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-body-md text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => addDoc(docInput)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                {t('Add', 'إضافة')}
              </button>
            </div>
            <AiNote error={docsAi.error} usedSample={docsAi.usedSample} />
            {(formData.technicalDocumentsList as string[]).length === 0 && (
              <p className="text-xs text-neutral-400">
                {t('No documents added yet. Type above or use AI Suggest.', 'لم تتم إضافة وثائق بعد. اكتب أعلاه أو استخدم الاقتراح بالذكاء الاصطناعي.')}
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Technical Requirements */}
      <SectionCard
        title="Technical Requirements"
        titleAr="المتطلبات الفنية"
        description="Define specific technical requirements vendors must meet."
        descriptionAr="حدد المتطلبات الفنية المحددة التي يجب على الموردين استيفاؤها."
        action={<AIButton onClick={generateReqs} loading={reqLoading} label={t('AI Suggest Requirements', 'اقتراح المتطلبات')} />}
      >
        {reqLoading && (
          <div className="mb-4 rounded-lg border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm">
              <SparklesIcon className="w-4 h-4 spin-slow" />
              {t('Analyzing project requirements and generating technical specifications…', 'جاري تحليل متطلبات المشروع وتوليد المواصفات الفنية…')}
            </div>
          </div>
        )}

        <AiNote error={reqAi.error} usedSample={reqAi.usedSample} />
        <div className="overflow-x-auto rounded-xl border border-neutral-200 mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 w-8">#</th>
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 w-48">{t('Requirement', 'المتطلب')}</th>
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Description', 'الوصف')}</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {formData.technicalRequirements.map((row, idx) => (
                <tr key={row.id} className="bg-white hover:bg-neutral-50/50 group transition-colors">
                  <td className="px-4 py-2 text-neutral-400 text-center text-xs">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.requirement}
                      onChange={(e) => updateTechReqRow(row.id, { requirement: e.target.value })}
                      className="w-full text-sm border border-transparent rounded px-2 py-1.5 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 placeholder-neutral-300 transition-colors font-medium"
                      placeholder={t('Requirement title…', 'عنوان المتطلب…')}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.description}
                      onChange={(e) => updateTechReqRow(row.id, { description: e.target.value })}
                      className="w-full text-sm border border-transparent rounded px-2 py-1.5 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 placeholder-neutral-300 transition-colors"
                      placeholder={t('Description of requirement and acceptance criteria…', 'وصف المتطلب ومعايير القبول…')}
                    />
                  </td>
                  <td className="px-2">
                    <button onClick={() => removeTechReqRow(row.id)} className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-error-500 transition-all">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {formData.technicalRequirements.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-neutral-400">
                  {t('No requirements defined. Add manually or use AI Suggest.', 'لم تُحدَّد متطلبات. أضف يدوياً أو استخدم اقتراح الذكاء الاصطناعي.')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button onClick={addTechReqRow} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm">
          <PlusIcon className="w-3.5 h-3.5" /> {t('Add Requirement', 'إضافة متطلب')}
        </button>
      </SectionCard>

      {/* Evaluation Criteria */}
      <SectionCard
        title="Evaluation Criteria"
        titleAr="معايير التقييم"
        description="Define weighted evaluation criteria. Total weight must equal 100%."
        descriptionAr="حدد معايير التقييم الموزونة. يجب أن يكون مجموع الأوزان 100%."
        action={<AIButton onClick={generateEval} loading={evalLoading} label={t('AI Suggest Criteria', 'اقتراح المعايير')} />}
      >
        {evalLoading && (
          <div className="mb-4 rounded-lg border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm">
              <SparklesIcon className="w-4 h-4 spin-slow" />
              {t('Generating evaluation criteria based on project type…', 'جاري توليد معايير التقييم بناءً على نوع المشروع…')}
            </div>
          </div>
        )}

        <AiNote error={evalAi.error} usedSample={evalAi.usedSample} />
        <div className="overflow-x-auto rounded-xl border border-neutral-200 mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-start px-3 py-2.5 text-xs font-medium text-neutral-500 w-8">#</th>
                <th className="text-start px-3 py-2.5 text-xs font-medium text-neutral-500 min-w-[200px]">{t('Criteria Description', 'وصف المعيار')}</th>
                <th className="text-start px-3 py-2.5 text-xs font-medium text-neutral-500 min-w-[200px]">{t('How Criteria is Applied', 'كيفية تطبيق المعيار')}</th>
                <th className="text-end px-3 py-2.5 text-xs font-medium text-neutral-500 w-28">{t('Final Weight', 'الوزن النهائي')}</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {formData.evaluationCriteria.map((row, idx) => (
                <tr key={row.id} className="bg-white hover:bg-neutral-50/50 group transition-colors">
                  <td className="px-3 py-2 text-neutral-400 text-center text-xs">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input value={row.description} onChange={(e) => updateEvalRow(row.id, { description: e.target.value })}
                      className="w-full text-xs border border-transparent rounded px-1.5 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 placeholder-neutral-300 transition-colors"
                      placeholder={t('Criteria description…', 'وصف المعيار…')} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.howApplied} onChange={(e) => updateEvalRow(row.id, { howApplied: e.target.value })}
                      className="w-full text-xs border border-transparent rounded px-1.5 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 placeholder-neutral-300 transition-colors"
                      placeholder={t('How this criteria is scored…', 'كيفية تسجيل هذا المعيار…')} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="relative">
                      <input type="number" min={0} max={100} value={row.weight}
                        onChange={(e) => updateEvalRow(row.id, { weight: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full text-xs text-end border border-transparent rounded px-1.5 py-1 pe-4 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 tabular-nums"
                        placeholder="0" />
                      <span className="absolute end-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </td>
                  <td className="px-2">
                    <button onClick={() => removeEvalRow(row.id)} className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-error-500 transition-all">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {formData.evaluationCriteria.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">
                  {t('No evaluation criteria defined.', 'لم تُحدَّد معايير تقييم.')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {formData.evaluationCriteria.length > 0 && (
          <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 mt-4 text-sm border ${
            weightOk ? 'bg-success-50 border-success-200 text-success-700' : weightOver ? 'bg-error-50 border-error-200 text-error-700' : 'bg-warning-50 border-warning-200 text-warning-700'
          }`}>
            <div className="flex items-center gap-2">
              {weightOk ? <CheckCircleIcon className="w-4 h-4" /> : <AlertTriangleIcon className="w-4 h-4" />}
              <span className="font-medium">{t('Total Weight', 'إجمالي الأوزان')}: {evalWeightTotal}%</span>
              {!weightOk && <span>— {t('must equal 100%', 'يجب أن يكون 100%')}</span>}
            </div>
            <div className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${weightOk ? 'bg-success-500' : weightOver ? 'bg-error-500' : 'bg-warning-500'}`} style={{ width: `${Math.min(evalWeightTotal, 100)}%` }} />
            </div>
          </div>
        )}

        <button onClick={addEvalRow} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm">
          <PlusIcon className="w-3.5 h-3.5" /> {t('Add Criterion', 'إضافة معيار')}
        </button>

        <div className="mt-5 pt-5 border-t border-neutral-100">
          <FormField
            label="Technical Passing Percentage"
            labelAr="نسبة الاجتياز الفني"
            required
            hint={t(
              'Minimum score (out of 100%) a vendor must achieve to pass the technical evaluation stage.',
              'الحد الأدنى للدرجة (من 100%) التي يجب على المورد تحقيقها للنجاح في مرحلة التقييم الفني.'
            )}
          >
            <div className="flex items-center gap-2 max-w-[180px]">
              <Input
                type="number" min={0} max={100}
                value={formData.technicalPassingPercentage}
                onChange={(e) => updateField('technicalPassingPercentage', e.target.value)}
                placeholder={t('e.g. 70', 'مثال: 70')}
              />
              <span className="text-sm text-neutral-500 font-medium">%</span>
            </div>
            {Number(formData.technicalPassingPercentage) > 100 && (
              <p className="text-xs text-error-600 mt-1">{t('Cannot exceed 100%', 'لا يمكن أن يتجاوز 100%')}</p>
            )}
          </FormField>
        </div>
      </SectionCard>
    </div>
  );
}
