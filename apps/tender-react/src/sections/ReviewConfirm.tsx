import { useState } from 'react';
import { useTender, SECTIONS } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import { SectionCard, Button, Badge, InfoBanner } from '../components/ui';
import { CheckCircleIcon, ExclamationCircleIcon, PencilIcon, SparklesIcon, AlertTriangleIcon, CheckIcon } from '../components/Icons';
import type { SectionStatus } from '../types/tender';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiExecutiveSummary } from '../lib/aiTender';
import { isStale, needsJustification } from '../lib/etimadCheck';

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}


export default function ReviewConfirm() {
  const { formData, sectionStatuses, goToSection, boqSubtotal, boqVat, boqTotal, paymentPctTotal, evalWeightTotal, qualPctTotal, importedFromProject, readyToSubmit, submit, submitted, isSubmitting, status } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const summaryAi = useAiAction();
  const aiSummaryLoading = summaryAi.loading;
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);
  const selectedCC = ALL_COST_CENTERS.find((c) => c.id === formData.costCenterId);
  const extraCCs = (formData.additionalCostCenterIds ?? []).map((id) => ALL_COST_CENTERS.find((c) => c.id === id)).filter(Boolean) as typeof ALL_COST_CENTERS;

  // eSouq reviews only its own steps (no scope / payment / technical / qualification).
  const isEsouq = formData.sourceType === 'souq-etimad';
  const ESOUQ_IDS = ['procurement-route', 'project-setup', 'boq', 'attachments', 'review'];
  const reqIdxs = SECTIONS.map((_, i) => i).filter((i) => SECTIONS[i].id !== 'review' && (!isEsouq || ESOUQ_IDS.includes(SECTIONS[i].id)));

  const incompleteSections = reqIdxs
    .map((i) => ({ status: sectionStatuses[i], section: SECTIONS[i], idx: i }))
    .filter(({ status }) => status === 'missing' || status === 'not-started');

  const completedCount = reqIdxs.filter((i) => sectionStatuses[i] === 'completed').length;
  const totalRequired = reqIdxs.length;

  function generateAISummary() {
    summaryAi.run(
      () => aiExecutiveSummary(formData, isAr, { subtotal: boqSubtotal, vat: boqVat, total: boqTotal }),
      (text) => { setAiSummaryText(text); setAiSummaryVisible(true); },
      () => { setAiSummaryText(null); setAiSummaryVisible(true); },
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-xl p-6">
        <div className="relative w-[70px] h-[70px] my-6">
          {/* expanding pulse rings */}
          <span className="success-pulse absolute inset-0 rounded-full bg-success-400" />
          <span className="success-pulse absolute inset-0 rounded-full bg-success-300" style={{ animationDelay: '0.45s' }} />
          {/* badge + drawn checkmark */}
          <div className="success-ring relative w-[70px] h-[70px] rounded-full bg-[#d9f2e1] flex items-center justify-center">
            <svg viewBox="0 0 52 52" className="w-[35px] h-[35px]" fill="none" stroke="currentColor"
                 strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              <path className="check-draw text-[#16a34a]" d="M14 27l8 8 16-17" />
            </svg>
          </div>
        </div>
        <h3 className="success-copy text-[17.5px] leading-[24.5px] font-semibold text-neutral-900 mb-[7px]">
          {t('Request Submitted Successfully', 'تم تقديم الطلب بنجاح')}
        </h3>
        <p className="success-copy text-neutral-500 text-[12.25px] leading-[17.5px] max-w-[336px]" style={{ animationDelay: '0.72s' }}>
          {t(
            'Your tender request has been submitted to your manager for review. You will receive a notification once it is reviewed.',
            'تم تقديم طلب المناقصة الخاص بك إلى مديرك للمراجعة. ستتلقى إشعاراً عند مراجعته.'
          )}
        </p>
        <div className="success-copy mt-[21px] w-[350px] max-w-full bg-neutral-50 rounded-[10.5px] border border-neutral-200 px-[21px] py-[14px] text-start" style={{ animationDelay: '0.84s' }}>
          <div className="grid grid-cols-2 gap-x-7 gap-y-[7px] text-[12.25px] leading-[17.5px]">
            <span className="text-neutral-500">{t('Request ID', 'رقم الطلب')}</span>
            <span className="font-medium text-neutral-800" dir="ltr">{submitted.requestNo}</span>
            <span className="text-neutral-500">{t('Submitted', 'تاريخ التقديم')}</span>
            <span className="font-medium text-neutral-800">{new Date(submitted.at).toLocaleDateString(isAr ? 'ar-SA' : 'en-SA', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span className="text-neutral-500">{t('Status', 'الحالة')}</span>
            <span><Badge variant="info">{t('Submitted', 'مقدَّم')}</Badge></span>
            <span className="text-neutral-500">{t('Next Step', 'الخطوة التالية')}</span>
            <span className="font-medium text-neutral-800">{t('Manager Review (1 WD)', 'مراجعة المدير (يوم عمل واحد)')}</span>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Import banner */}
      {importedFromProject && (
        <div className="flex items-start gap-3 rounded-xl border border-ai-200 bg-ai-50 px-5 py-4">
          <SparklesIcon className="w-4 h-4 text-ai-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-ai-900">
              {t('Details imported from a similar project', 'تم استيراد التفاصيل من مشروع مماثل')}
            </p>
            <p className="text-[12px] text-ai-700 mt-0.5">
              {t(
                `The following sections were imported as a starting point for "${importedFromProject}". Review and adjust any details before submitting.`,
                `تم استيراد الأقسام التالية كنقطة بداية لـ "${importedFromProject}". راجع أي تفاصيل وعدّلها قبل التقديم.`
              )}
            </p>
          </div>
        </div>
      )}

      {/* Completeness overview */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{t('Completion Status', 'حالة الاكتمال')}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {completedCount} {t('of', 'من')} {totalRequired} {t('sections completed', 'أقسام مكتملة')}
            </p>
          </div>
          <span className={`text-2xl font-bold tabular-nums ${readyToSubmit ? 'text-success-600' : 'text-warning-600'}`}>
            {Math.round((completedCount / totalRequired) * 100)}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${readyToSubmit ? 'bg-success-500' : 'bg-warning-500'}`}
            style={{ width: `${(completedCount / totalRequired) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {reqIdxs.map((i) => {
            const sec = SECTIONS[i];
            const status = sectionStatuses[i];
            return (
              <button
                key={sec.id}
                onClick={() => goToSection(i)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 transition-colors text-start"
              >
                <StatusDot status={status} />
                <span className="text-xs text-neutral-600 truncate">
                  {isEsouq && sec.id === 'project-setup' ? t('Purchase details', 'تفاصيل الشراء') : (isAr ? sec.titleAr : sec.title)}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Missing sections warning */}
      {incompleteSections.length > 0 && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangleIcon className="w-4 h-4 text-warning-600" />
            <span className="text-sm font-semibold text-warning-800">
              {incompleteSections.length} {incompleteSections.length > 1
                ? t('sections need attention', 'أقسام تحتاج إلى اهتمام')
                : t('section needs attention', 'قسم يحتاج إلى اهتمام')}
            </span>
          </div>
          <div className="space-y-2">
            {incompleteSections.map(({ section, idx }) => (
              <div key={section.id} className="flex items-center justify-between bg-white rounded-lg border border-warning-100 px-3 py-2">
                <span className="text-sm text-neutral-700">{isAr ? section.titleAr : section.title}</span>
                <Button variant="ghost" size="sm" onClick={() => goToSection(idx)}>
                  <PencilIcon className="w-3 h-3" /> {t('Edit', 'تعديل')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Etimad Souq check (tendering only — eSouq items are already catalogue items) */}
      {!isEsouq && (() => {
        const rows = formData.boqItems;
        if (rows.length === 0) return null;
        const unchecked = rows.filter((r) => !r.etimadCheck || isStale(r)).length;
        const missing = rows.filter(needsJustification);
        if (unchecked === 0 && missing.length === 0) return null;
        return (
          <div className="rounded-xl border border-warning-100 bg-warning-50 px-5 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-warning-600" />
              <span className="text-sm font-semibold text-warning-700">{t('Etimad Souq check', 'التحقق من سوق اعتماد')}</span>
            </div>
            {missing.length > 0 && (
              <p className="text-[13px] text-warning-700">
                {t(`${missing.length} BOQ item(s) are available in Etimad Souq but kept in this tender without a justification: `, `${missing.length} بند/بنود متوفرة في سوق اعتماد وأُبقيت في هذه المنافسة دون مبرر: `)}
                <strong>{missing.map((r) => r.itemName).join('، ')}</strong>
              </p>
            )}
            {unchecked > 0 && (
              <p className="text-[13px] text-warning-700">
                {t(`${unchecked} BOQ item(s) have not been checked against Etimad Souq.`, `${unchecked} بند/بنود لم يُتحقق من توفرها في سوق اعتماد.`)}
              </p>
            )}
            <Button variant="ghost" size="sm" onClick={() => goToSection(3)}>
              <PencilIcon className="w-3 h-3" /> {t('Go to Bill of Quantities', 'الانتقال إلى جدول الكميات')}
            </Button>
          </div>
        );
      })()}

      {/* AI Summary */}
      {!aiSummaryVisible ? (
        <div className="flex items-center justify-between bg-ai-50 rounded-xl border border-ai-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-5 h-5 text-ai-600" />
            <div>
              <p className="text-sm font-medium text-ai-800">{t('AI Executive Summary', 'الملخص التنفيذي بالذكاء الاصطناعي')}</p>
              <p className="text-xs text-ai-600">{t('Generate an AI summary of this tender request for quick review.', 'أنشئ ملخصاً بالذكاء الاصطناعي لطلب المناقصة هذا للمراجعة السريعة.')}</p>
            </div>
          </div>
          <Button variant="ai" size="sm" onClick={generateAISummary} loading={aiSummaryLoading}>
            {!aiSummaryLoading && <SparklesIcon className="w-3.5 h-3.5" />}
            {aiSummaryLoading ? t('Generating…', 'جاري التوليد…') : t('Generate Summary', 'توليد الملخص')}
          </Button>
        </div>
      ) : (
        <SectionCard className="border-ai-200">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="w-4 h-4 text-ai-600" />
            <span className="text-sm font-semibold text-ai-800">{t('AI Executive Summary', 'الملخص التنفيذي بالذكاء الاصطناعي')}</span>
            <span className="text-xs text-ai-500 ms-auto">{t('Review before submitting', 'راجع قبل التقديم')}</span>
          </div>
          {aiSummaryText ? (
            <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{aiSummaryText}</div>
          ) : (
          <div className="text-sm text-neutral-700 space-y-2 leading-relaxed">
            <p>{isEsouq ? t('This purchase request seeks to procure', 'يسعى طلب الشراء هذا للحصول على') : t('This tender request seeks to procure', 'يسعى طلب المناقصة هذا للحصول على')} <strong>{isAr ? (selectedProject?.nameAr ?? selectedProject?.name ?? t('an enterprise solution', 'حل مؤسسي')) : (selectedProject?.name ?? t('an enterprise solution', 'حل مؤسسي'))}</strong> {t('for the', 'لـ')} <strong>{selectedCC?.name ?? t('requesting department', 'القسم الطالب')}</strong>.</p>
            <p>{t('The total estimated project value is', 'إجمالي القيمة التقديرية للمشروع هو')} <strong dir="ltr">SAR {formatSAR(boqTotal)}</strong> ({t('including 15% VAT', 'شاملاً ضريبة القيمة المضافة 15%')}){!isEsouq && <>{t(', spanning a contract duration of', '، لمدة عقد')} <strong>{formData.contractDuration} {formData.contractDurationType}</strong> {t('commencing', 'تبدأ في')} <strong>{formData.startDate || t('TBD', 'يُحدَّد لاحقاً')}</strong></>}.</p>
            <p>{isEsouq
              ? t(`The request includes ${formData.boqItems.length} catalogue line item${formData.boqItems.length === 1 ? '' : 's'} bought directly from approved suppliers.`, `يشمل الطلب ${formData.boqItems.length} بنداً من الكتالوج تُشترى مباشرةً من موردين معتمدين.`)
              : <>{t('The scope includes', 'يشمل النطاق')} {formData.boqItems.length} {t('BOQ line items across', 'بنوداً في جدول الكميات عبر')} {selectedProject?.items.length ?? 0} {t('project categories.', 'فئات مشروع.')}</>}</p>
            {!isEsouq && <p>{t('Technical evaluation will be conducted by a committee of', 'سيتم إجراء التقييم الفني من قِبل لجنة مؤلفة من')} {formData.technicalCommitteeMembers.length} {t('members using', 'أعضاء باستخدام')} {formData.evaluationCriteria.length} {t('weighted criteria, with a passing threshold of', 'معايير موزونة، بحد اجتياز')} {formData.technicalPassingPercentage || t('TBD', 'يُحدَّد لاحقاً')}%.</p>}
            {formData.attachments.length > 0 && <p>{formData.attachments.length} {formData.attachments.length > 1 ? t('supporting documents attached.', 'وثائق داعمة مرفقة.') : t('supporting document attached.', 'وثيقة داعمة مرفقة.')}</p>}
          </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={generateAISummary} loading={aiSummaryLoading}>
              <SparklesIcon className="w-3.5 h-3.5" />
              {t('Regenerate', 'إعادة التوليد')}
            </Button>
          </div>
          <AiNote error={summaryAi.error} usedSample={summaryAi.usedSample} />
        </SectionCard>
      )}
      {!aiSummaryVisible && summaryAi.error && (
        <p className="text-xs text-error-600 -mt-3">{summaryAi.error}</p>
      )}

      {/* Section summaries */}
      <ReviewSection title={isEsouq ? 'Purchase details' : 'Project Setup'} titleAr={isEsouq ? 'تفاصيل الشراء' : 'إعداد المشروع'} sectionIdx={1} status={sectionStatuses[1]}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <ReviewField label={t('Cost Center', 'مركز التكلفة')} value={selectedCC ? `${selectedCC.name} (${selectedCC.code})` : '—'} />
          {extraCCs.length > 0 && (
            <ReviewField label={t('Additional Cost Centers', 'مراكز تكلفة إضافية')} value={extraCCs.map((c) => `${c.name} (${c.code})`).join(', ')} />
          )}
          <ReviewField label={t('Project', 'المشروع')} value={(isAr ? selectedProject?.nameAr : selectedProject?.name) ?? '—'} />
          <ReviewField label={t('Project Code', 'رمز المشروع')} value={selectedProject?.code ?? '—'} />
          <ReviewField label={t('Source Type', 'نوع المصدر')} value={formData.sourceType === 'tendering' ? t('Tender', 'منافسة') : t('Etimad Souq', 'سوق اعتماد')} />
        </dl>
      </ReviewSection>

      {!isEsouq && (
      <ReviewSection title="Scope of Work" titleAr="نطاق العمل" sectionIdx={2} status={sectionStatuses[2]}>
        <div className="text-sm text-neutral-600 line-clamp-3 whitespace-pre-line">
          {formData.scopeOfWork || <span className="text-neutral-400 italic">{t('Not completed', 'غير مكتمل')}</span>}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3 pt-3 border-t border-neutral-100">
          <ReviewField label={t('Start Date', 'تاريخ البدء')} value={formData.startDate || '—'} ltr />
          <ReviewField label={t('Duration', 'المدة')} value={formData.contractDuration ? `${formData.contractDuration} ${formData.contractDurationType}` : '—'} ltr />
          <ReviewField label={t('Location', 'الموقع')} value={formData.executionLocation ? formData.executionLocation.substring(0, 60) + '…' : '—'} />
        </dl>
        {formData.scopeTerms && (
          <p className="mt-2 text-xs text-neutral-400">{formData.scopeTerms.length} {t('characters in terms & conditions', 'حرف في الشروط والأحكام')}</p>
        )}
      </ReviewSection>
      )}

      <ReviewSection title="Bill of Quantities" titleAr="جدول الكميات" sectionIdx={3} status={sectionStatuses[3]}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <ReviewField label={t('Total Items', 'إجمالي البنود')} value={formData.boqItems.length > 0 ? `${formData.boqItems.length} ${t('line items', 'بند')}` : '—'} />
          {isEsouq ? (
            <ReviewField label={t('Suppliers', 'الموردون')} value={(() => { const s = new Set(formData.boqItems.map((r) => (r.supplier ?? '').trim()).filter(Boolean)); return s.size > 0 ? t(`${s.size} supplier${s.size === 1 ? '' : 's'}`, `${s.size} مورّد`) : '—'; })()} />
          ) : (
            <ReviewField label={t('Brand Name', 'الاسم التجاري')} value={formData.boqItems.length === 0 ? '—' : formData.boqItems.some((r) => r.hasBrandName) ? t(`Yes, ${formData.boqItems.filter((r) => r.hasBrandName).length} item(s)`, `نعم، ${formData.boqItems.filter((r) => r.hasBrandName).length} بند`) : t('No', 'لا')} />
          )}
          <ReviewField label={t('Subtotal', 'المجموع الفرعي')} value={boqSubtotal > 0 ? `SAR ${formatSAR(boqSubtotal)}` : '—'} ltr />
          <ReviewField label={t('VAT (15%)', 'ضريبة القيمة المضافة (15%)')} value={boqVat > 0 ? `SAR ${formatSAR(boqVat)}` : '—'} ltr />
        </dl>
        {boqTotal > 0 && (
          <div className="mt-3 flex items-center justify-between bg-neutral-50 rounded-lg px-4 py-2.5 border border-neutral-200">
            <span className="text-sm font-semibold text-neutral-700">{t('Total (incl. VAT)', 'الإجمالي (شامل الضريبة)')}</span>
            <span className="text-sm font-bold text-neutral-900 tabular-nums" dir="ltr">SAR {formatSAR(boqTotal)}</span>
          </div>
        )}
      </ReviewSection>

      {!isEsouq && (<>
      <ReviewSection title="Payment Schedule" titleAr="جدول الدفعات" sectionIdx={4} status={sectionStatuses[4]}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <ReviewField label={t('Stages', 'المراحل')} value={formData.paymentStages.length > 0 ? `${formData.paymentStages.length} ${t('payment stages', 'مراحل دفع')}` : '—'} />
          <ReviewField label={t('Total %', 'الإجمالي %')} value={paymentPctTotal > 0 ? `${paymentPctTotal}% ${paymentPctTotal === 100 ? '✓' : '⚠'}` : '—'} ltr />
        </dl>
      </ReviewSection>

      <ReviewSection title="Technical Evaluation" titleAr="التقييم الفني" sectionIdx={5} status={sectionStatuses[5]}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <ReviewField label={t('Committee', 'اللجنة')} value={formData.technicalCommitteeMembers.length > 0 ? `${formData.technicalCommitteeMembers.length} ${t('members', 'أعضاء')}` : '—'} />
          <ReviewField label={t('Criteria', 'المعايير')} value={formData.evaluationCriteria.length > 0 ? `${formData.evaluationCriteria.length} ${t('criteria', 'معيار')}` : '—'} />
          <ReviewField label={t('Total Weight', 'إجمالي الأوزان')} value={evalWeightTotal > 0 ? `${evalWeightTotal}% ${evalWeightTotal === 100 ? '✓' : '⚠'}` : '—'} ltr />
          <ReviewField label={t('Passing %', 'نسبة الاجتياز')} value={formData.technicalPassingPercentage ? `${formData.technicalPassingPercentage}%` : '—'} ltr />
        </dl>
      </ReviewSection>

      <ReviewSection title="Qualification Criteria" titleAr="معايير التأهيل" sectionIdx={6} status={sectionStatuses[6]}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <ReviewField label={t('Committee', 'اللجنة')} value={formData.qualificationCommitteeMembers.length > 0 ? `${formData.qualificationCommitteeMembers.length} ${t('members', 'أعضاء')}` : '—'} />
          <ReviewField label={t('Main Criteria %', 'إجمالي المعايير الرئيسية %')} value={`${qualPctTotal}% ${qualPctTotal === 100 ? '✓' : '⚠'}`} ltr />
        </dl>
      </ReviewSection>
      </>)}

      <ReviewSection title="Attachments" titleAr="المرفقات" sectionIdx={7} status={sectionStatuses[7]}>
        {formData.attachments.length > 0 ? (
          <ul className="space-y-1">
            {formData.attachments.map((a) => (
              <li key={a.id} className="text-sm text-neutral-600 flex items-center gap-2">
                <span className="text-neutral-400">·</span>{a.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400 italic">{t('No attachments uploaded (optional)', 'لا توجد مرفقات (اختياري)')}</p>
        )}
      </ReviewSection>

      {/* Submit */}
      <div className="rounded-xl border-2 border-brand-200 bg-brand-50 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-brand-800 mb-1">{t('Ready to Submit?', 'هل أنت مستعد للتقديم؟')}</h3>
            <p className="text-xs text-brand-600 max-w-md">
              {t(
                'Once submitted, your request will be forwarded to your department manager for review. You will be notified of any returns or approvals.',
                'بمجرد التقديم، سيُحال طلبك إلى مدير قسمك للمراجعة. ستتلقى إشعاراً بأي إرجاعات أو موافقات.'
              )}
              {!readyToSubmit && ' ' + t('Please complete all required sections before submitting.', 'يرجى إكمال جميع الأقسام المطلوبة قبل التقديم.')}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => submit()}
            disabled={!readyToSubmit}
            loading={isSubmitting}
            className="flex-shrink-0"
          >
            <CheckIcon className="w-4 h-4" />
            {status === 'draft' ? t('Submit Request', 'تقديم الطلب') : t('Resubmit Request', 'إعادة تقديم الطلب')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ title, titleAr, sectionIdx, status, children }: { title: string; titleAr: string; sectionIdx: number; status: SectionStatus; children: React.ReactNode }) {
  const { goToSection } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <StatusDot status={status} />
          <span className="text-sm font-semibold text-neutral-800">{isAr ? titleAr : title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToSection(sectionIdx)}
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <PencilIcon className="w-3 h-3" />
            {t('Edit', 'تعديل')}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-5 py-4">{children}</div>
      )}
    </div>
  );
}

function ReviewField({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-neutral-800 font-medium" dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  );
}

function StatusDot({ status }: { status: SectionStatus }) {
  if (status === 'completed') return <CheckCircleIcon className="w-4 h-4 text-success-500 flex-shrink-0" />;
  if (status === 'missing') return <ExclamationCircleIcon className="w-4 h-4 text-warning-500 flex-shrink-0" />;
  if (status === 'in-progress') return <div className="w-4 h-4 rounded-full border-2 border-brand-500 bg-brand-100 flex-shrink-0" />;
  return <div className="w-4 h-4 rounded-full border-2 border-neutral-300 flex-shrink-0" />;
}
