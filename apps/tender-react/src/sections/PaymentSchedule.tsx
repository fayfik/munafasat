import { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote, num, str, arr } from '../lib/useAiAction';
import { aiStages, type AiStage } from '../lib/aiTender';
import { SectionCard, AIButton, InfoBanner } from '../components/ui';
import { PlusIcon, TrashIcon, SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from '../components/Icons';

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const AI_STAGES = [
  { stageName: 'Contract Signing & Kickoff', itemsDeliverables: 'Project charter, Kickoff meeting minutes', startDate: '2025-10-15', duration: '30 days', percentage: 15 },
  { stageName: 'System Design Approval', itemsDeliverables: 'Solution architecture, Integration design document', startDate: '2026-01-31', duration: '45 days', percentage: 20 },
  { stageName: 'Development & Configuration', itemsDeliverables: 'Configured system in staging, Data migration', startDate: '2026-03-31', duration: '60 days', percentage: 25 },
  { stageName: 'UAT Sign-off', itemsDeliverables: 'UAT completion certificate, Defect resolution log', startDate: '2026-04-30', duration: '30 days', percentage: 20 },
  { stageName: 'Go-Live & Training', itemsDeliverables: 'Production go-live, Training completion certificates', startDate: '2026-06-30', duration: '30 days', percentage: 15 },
  { stageName: 'Project Closure', itemsDeliverables: 'Project closure report, Warranty activation', startDate: '2026-07-31', duration: '30 days', percentage: 5 },
];

export default function PaymentSchedule() {
  const { formData, updateField, updatePaymentRow, addPaymentRow, removePaymentRow, boqSubtotal, paymentPctTotal } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const payAi = useAiAction();
  const aiLoading = payAi.loading;

  function handleAISuggest() {
    const apply = (src: AiStage[]) => updateField('paymentStages', src.map((r) => ({
      id: crypto.randomUUID(), stageName: str(r.stageName), itemsDeliverables: str(r.itemsDeliverables),
      startDate: str(r.startDate), duration: str(r.duration), percentage: num(r.percentage),
    })));
    payAi.run(() => aiStages(formData, isAr), (r) => apply(arr<AiStage>(r)), () => apply(AI_STAGES));
  }

  const stageAmount = (pct: number | '') => {
    const p = typeof pct === 'number' ? pct : 0;
    return (p / 100) * boqSubtotal;
  };

  const totalAmount = formData.paymentStages.reduce((s, r) => s + stageAmount(r.percentage), 0);
  const pctOk   = paymentPctTotal === 100;
  const pctOver = paymentPctTotal > 100;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Payment Schedule"
        titleAr="جدول الدفعات"
        description="Define payment stages tied to project milestones. Total must equal 100%."
        descriptionAr="حدد مراحل الدفع المرتبطة بمعالم المشروع. يجب أن يكون الإجمالي 100%."
        action={<AIButton onClick={handleAISuggest} loading={aiLoading} label={t('AI Suggest Stages', 'اقتراح المراحل')} />}
      >
        {aiLoading && (
          <div className="mb-4 rounded-lg border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm">
              <SparklesIcon className="w-4 h-4 spin-slow" />
              {t('Generating payment stages based on deliverables…', 'جاري توليد مراحل الدفع بناءً على المخرجات…')}
            </div>
          </div>
        )}

        <AiNote error={payAi.error} usedSample={payAi.usedSample} />
        {formData.paymentStages.length > 0 && (
          <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 mt-3 mb-4 text-sm border ${
            pctOk ? 'bg-success-50 border-success-200 text-success-700' : pctOver ? 'bg-error-50 border-error-200 text-error-700' : 'bg-warning-50 border-warning-200 text-warning-700'
          }`}>
            <div className="flex items-center gap-2">
              {pctOk ? <CheckCircleIcon className="w-4 h-4" /> : <AlertTriangleIcon className="w-4 h-4" />}
              <span className="font-medium">{t('Total', 'الإجمالي')}: {paymentPctTotal}%</span>
              {!pctOk && <span>— {t('must equal 100%', 'يجب أن يكون 100%')}</span>}
            </div>
            <div className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pctOk ? 'bg-success-500' : pctOver ? 'bg-error-500' : 'bg-warning-500'}`}
                style={{ width: `${Math.min(paymentPctTotal, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-start px-3 py-2.5 text-neutral-500 font-medium w-8">#</th>
                <th className="text-start px-3 py-2.5 text-neutral-500 font-medium min-w-[160px]">{t('Stage Name', 'اسم المرحلة')}</th>
                <th className="text-start px-3 py-2.5 text-neutral-500 font-medium min-w-[180px]">{t('Items / Deliverables', 'البنود / المخرجات')}</th>
                <th className="text-start px-3 py-2.5 text-neutral-500 font-medium w-32">{t('Start Date', 'تاريخ البدء')}</th>
                <th className="text-start px-3 py-2.5 text-neutral-500 font-medium w-24">{t('Duration', 'المدة')}</th>
                <th className="text-end px-3 py-2.5 text-neutral-500 font-medium w-20">%</th>
                <th className="text-end px-3 py-2.5 text-neutral-500 font-medium w-36">{t('Amount (SAR)', 'المبلغ (ر.س)')}</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {formData.paymentStages.map((row, idx) => (
                <tr key={row.id} className="bg-white hover:bg-neutral-50/50 group transition-colors">
                  <td className="px-3 py-2 text-neutral-400 text-center">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.stageName}
                      onChange={(e) => updatePaymentRow(row.id, { stageName: e.target.value })}
                      className="w-full text-xs border border-transparent rounded px-1.5 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 placeholder-neutral-300"
                      placeholder={t('Stage name…', 'اسم المرحلة…')}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.itemsDeliverables}
                      onChange={(e) => updatePaymentRow(row.id, { itemsDeliverables: e.target.value })}
                      className="w-full text-xs border border-transparent rounded px-1.5 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 placeholder-neutral-300"
                      placeholder={t('Related deliverables…', 'المخرجات ذات الصلة…')}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      value={row.startDate}
                      onChange={(e) => updatePaymentRow(row.id, { startDate: e.target.value })}
                      className="w-full text-xs border border-transparent rounded px-1.5 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.duration}
                      onChange={(e) => updatePaymentRow(row.id, { duration: e.target.value })}
                      className="w-full text-xs border border-transparent rounded px-1.5 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 placeholder-neutral-300"
                      placeholder={t('30 days', '30 يوم')}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="relative">
                      <input
                        type="number" min={0} max={100}
                        value={row.percentage}
                        onChange={(e) => updatePaymentRow(row.id, { percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full text-xs text-end border border-transparent rounded px-1.5 py-1 pe-4 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700"
                        placeholder="0"
                      />
                      <span className="absolute end-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-end font-medium text-neutral-700 tabular-nums" dir="ltr">
                    {typeof row.percentage === 'number' && row.percentage > 0 ? `SAR ${formatSAR(stageAmount(row.percentage))}` : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => removePaymentRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-error-500 transition-all"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {formData.paymentStages.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-400">
                    {t('No payment stages defined. Add manually or use AI Suggest.', 'لم تُحدَّد مراحل دفع. أضف يدوياً أو استخدم اقتراح الذكاء الاصطناعي.')}
                  </td>
                </tr>
              )}
              {formData.paymentStages.length > 0 && (
                <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                  <td colSpan={5} className="px-3 py-2.5 text-end text-xs font-semibold text-neutral-600">{t('Total', 'الإجمالي')}</td>
                  <td className={`px-3 py-2.5 text-end text-xs font-bold tabular-nums ${pctOk ? 'text-success-700' : pctOver ? 'text-error-600' : 'text-warning-600'}`}>
                    {paymentPctTotal}%
                  </td>
                  <td className="px-3 py-2.5 text-end text-xs font-bold text-neutral-800 tabular-nums" dir="ltr">
                    SAR {formatSAR(totalAmount)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={addPaymentRow}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          {t('Add Stage', 'إضافة مرحلة')}
        </button>

        {boqSubtotal === 0 && (
          <InfoBanner variant="warning" className="mt-4">
            {t(
              'Payment amounts will be calculated automatically once BOQ prices are entered. Please complete the Bill of Quantities first.',
              'سيتم احتساب مبالغ الدفع تلقائياً بمجرد إدخال أسعار جدول الكميات. يرجى إكمال جدول الكميات أولاً.'
            )}
          </InfoBanner>
        )}
      </SectionCard>
    </div>
  );
}
