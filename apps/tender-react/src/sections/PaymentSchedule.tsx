import { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { useAiAction, AiNote, num, str, arr } from '../lib/useAiAction';
import { aiStages, type AiStage } from '../lib/aiTender';
import { SectionCard, AIButton, InfoBanner } from '../components/ui';
import TemplateMenu from '../components/TemplateMenu';
import { PAYMENT_TEMPLATES } from '../lib/templates';
import { PlusIcon, TrashIcon, SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from '../components/Icons';

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export const AI_STAGES = [
  { stageName: 'Contract Signing & Kickoff', itemsDeliverables: 'Project charter, Kickoff meeting minutes', startDate: '2025-10-15', duration: '30 days', percentage: 15 },
  { stageName: 'System Design Approval', itemsDeliverables: 'Solution architecture, Integration design document', startDate: '2026-01-31', duration: '45 days', percentage: 20 },
  { stageName: 'Development & Configuration', itemsDeliverables: 'Configured system in staging, Data migration', startDate: '2026-03-31', duration: '60 days', percentage: 25 },
  { stageName: 'UAT Sign-off', itemsDeliverables: 'UAT completion certificate, Defect resolution log', startDate: '2026-04-30', duration: '30 days', percentage: 20 },
  { stageName: 'Go-Live & Training', itemsDeliverables: 'Production go-live, Training completion certificates', startDate: '2026-06-30', duration: '30 days', percentage: 15 },
  { stageName: 'Project Closure', itemsDeliverables: 'Project closure report, Warranty activation', startDate: '2026-07-31', duration: '30 days', percentage: 5 },
];

// Arabic sample — used when the app language is Arabic.
export const AI_STAGES_AR = [
  { stageName: 'توقيع العقد والانطلاق', itemsDeliverables: 'ميثاق المشروع، محضر اجتماع الانطلاق', startDate: '2025-10-15', duration: '30 يوماً', percentage: 15 },
  { stageName: 'اعتماد تصميم النظام', itemsDeliverables: 'معمارية الحل، وثيقة تصميم التكامل', startDate: '2026-01-31', duration: '45 يوماً', percentage: 20 },
  { stageName: 'التطوير والتهيئة', itemsDeliverables: 'النظام مُهيّأ في بيئة الاختبار، ترحيل البيانات', startDate: '2026-03-31', duration: '60 يوماً', percentage: 25 },
  { stageName: 'اعتماد اختبار قبول المستخدم', itemsDeliverables: 'شهادة إتمام اختبار القبول، سجل معالجة الأعطال', startDate: '2026-04-30', duration: '30 يوماً', percentage: 20 },
  { stageName: 'التشغيل الفعلي والتدريب', itemsDeliverables: 'التشغيل الفعلي، شهادات إتمام التدريب', startDate: '2026-06-30', duration: '30 يوماً', percentage: 15 },
  { stageName: 'إغلاق المشروع', itemsDeliverables: 'تقرير إغلاق المشروع، تفعيل الضمان', startDate: '2026-07-31', duration: '30 يوماً', percentage: 5 },
];

export default function PaymentSchedule() {
  const { formData, updateField, updatePaymentRow, addPaymentRow, removePaymentRow, boqSubtotal, paymentPctTotal } = useTender();
  const t = useT();
  const { isAr } = useLanguage();
  const payAi = useAiAction();
  const aiLoading = payAi.loading;

  // Drag-to-reorder payment stages.
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  // Raw text the user is typing into an Amount cell, keyed by row id. While a cell
  // is focused we echo exactly what was typed (so keystrokes aren't clobbered by the
  // percentage round-trip); on blur we drop the draft and show the derived amount.
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({});
  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...formData.paymentStages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateField('paymentStages', next);
  }

  // Manual mode: pick a standard template, then edit the stages by hand.
  const suggestedTpl = formData.scopeIncludes.includes('consultancy') && !formData.scopeIncludes.includes('technology') ? 'consultancy'
    : /software|system|erp|cloud|platform|portal|implement/i.test(formData.boqItems.map((b) => b.itemName).join(' ')) || formData.scopeIncludes.includes('technology') ? 'technology' : 'general';
  function applyTemplate(id: string) {
    const tpl = PAYMENT_TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    updateField('paymentStages', tpl.stages.map((r) => ({ id: crypto.randomUUID(), startDate: '', ...r })));
  }

  // The value percentages and amounts convert against: the BOQ total when present,
  // otherwise the sum of the amounts entered here — so the schedule still works before a
  // BOQ exists (the amounts you type define the total, and percentages derive from them).
  const enteredAmountsTotal = formData.paymentStages.reduce((s, r) => s + (typeof r.amount === 'number' ? r.amount : 0), 0);
  const baseTotal = boqSubtotal > 0 ? boqSubtotal : enteredAmountsTotal;

  const stageAmount = (pct: number | '') => ((typeof pct === 'number' ? pct : 0) / 100) * baseTotal;
  // What a row's Amount cell resolves to: the user's exact typed amount if set,
  // otherwise the amount derived from its percentage and the base total.
  const effectiveAmount = (r: typeof formData.paymentStages[number]) =>
    typeof r.amount === 'number' ? r.amount : stageAmount(r.percentage);

  const totalAmount = formData.paymentStages.reduce((s, r) => s + effectiveAmount(r), 0);
  const pctOk   = paymentPctTotal === 100;
  const pctOver = paymentPctTotal > 100;

  // Re-derive every amount-bearing row's percentage from the amounts pot. Used when there is
  // no BOQ total: the typed amounts define the split, so percentages stay consistent and sum to 100%.
  function repartitionFromAmounts(stages: typeof formData.paymentStages) {
    const sum = stages.reduce((s, r) => s + (typeof r.amount === 'number' ? r.amount : 0), 0);
    return stages.map((r) =>
      typeof r.amount === 'number'
        ? { ...r, percentage: sum > 0 ? Math.round((r.amount / sum) * 10000) / 100 : ('' as number | '') }
        : r);
  }

  // Enter a percentage → amount re-derives from the base total (clear any manual amount override).
  function handlePctChange(id: string, raw: string) {
    updatePaymentRow(id, { percentage: raw === '' ? '' : Number(raw), amount: undefined });
  }
  // Enter an amount → keep it verbatim and compute the percentage. With a BOQ total the percentage
  // is amount ÷ BOQ total; without one, the amounts define the pot and all rows repartition.
  function handleAmountChange(id: string, raw: string) {
    setAmountDraft((d) => ({ ...d, [id]: raw }));
    if (raw !== '' && !Number.isFinite(Number(raw))) return;
    const amt = raw === '' ? undefined : Number(raw);
    if (boqSubtotal > 0) {
      updatePaymentRow(id, {
        amount: amt,
        percentage: amt === undefined ? '' : Math.round((amt / boqSubtotal) * 10000) / 100,
      });
    } else {
      const next = formData.paymentStages.map((r) =>
        r.id === id ? { ...r, amount: amt, ...(amt === undefined ? { percentage: '' as number | '' } : {}) } : r);
      updateField('paymentStages', repartitionFromAmounts(next));
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Payment Schedule"
        titleAr="جدول الدفعات"
        description="Define payment stages tied to project milestones. Enter a percentage or an amount — the other is computed from the BOQ total. Total must equal 100%."
        descriptionAr="حدد مراحل الدفع المرتبطة بمعالم المشروع. أدخل النسبة أو المبلغ — ويُحسب الآخر تلقائياً من إجمالي جدول الكميات. يجب أن يكون الإجمالي 100%."
        action={<TemplateMenu options={PAYMENT_TEMPLATES} onPick={applyTemplate} suggestedId={suggestedTpl} />}
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
                <th className="text-end px-3 py-2.5 text-neutral-500 font-medium w-32">{t('Payment Percentage', 'نسبة الدفع')}</th>
                <th className="text-end px-3 py-2.5 text-neutral-500 font-medium w-40">{t('Amount (SAR)', 'المبلغ (ر.س)')}</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {formData.paymentStages.map((row, idx) => (
                <tr key={row.id}
                  onDragEnter={() => { if (dragIdx !== null) setOverIdx(idx); }}
                  onDragOver={(e) => { if (dragIdx !== null) e.preventDefault(); }}
                  onDrop={() => { if (dragIdx !== null) reorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); }}
                  className={`bg-white hover:bg-neutral-50/50 group transition-colors ${overIdx === idx && dragIdx !== null && dragIdx !== idx ? 'bg-brand-50/70 ring-1 ring-inset ring-brand-300' : ''} ${dragIdx === idx ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 text-neutral-400 text-center">
                    <span draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                      className="inline-flex items-center gap-1 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 select-none"
                      title={t('Drag to reorder', 'اسحب لإعادة الترتيب')}
                      aria-label={t('Drag to reorder', 'اسحب لإعادة الترتيب')}>
                      <svg viewBox="0 0 10 16" className="w-2.5 h-3.5" fill="currentColor"><circle cx="2" cy="3" r="1.3" /><circle cx="8" cy="3" r="1.3" /><circle cx="2" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="2" cy="13" r="1.3" /><circle cx="8" cy="13" r="1.3" /></svg>
                      {idx + 1}
                    </span>
                  </td>
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
                    <div className="relative">
                      <input
                        type="number" min={0} max={100} step={0.01}
                        value={row.percentage}
                        onChange={(e) => handlePctChange(row.id, e.target.value)}
                        className="w-full text-xs text-end border border-transparent rounded px-1.5 py-1 pe-5 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-700 tabular-nums"
                        placeholder="0"
                      />
                      <span className="absolute end-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="relative">
                      <input
                        type="number" min={0}
                        value={amountDraft[row.id] !== undefined
                          ? amountDraft[row.id]
                          : (typeof row.amount === 'number' ? String(row.amount)
                             : row.percentage === '' ? '' : String(Math.round(stageAmount(row.percentage))))}
                        onChange={(e) => handleAmountChange(row.id, e.target.value)}
                        onBlur={() => setAmountDraft((d) => { const next = { ...d }; delete next[row.id]; return next; })}
                        className="w-full text-xs text-end border border-transparent rounded px-1.5 py-1 ps-9 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-800 font-medium tabular-nums"
                        placeholder="0"
                      />
                      <span className="absolute start-1.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px] pointer-events-none">SAR</span>
                    </div>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">
                    {t('No payment stages yet. Use a template or add stages manually.', 'لم تُحدَّد مراحل دفع. استخدم قالباً أو أضف المراحل يدوياً.')}
                  </td>
                </tr>
              )}
              {formData.paymentStages.length > 0 && (
                <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                  <td colSpan={3} className="px-3 py-2.5 text-end text-xs font-semibold text-neutral-600">{t('Total', 'الإجمالي')}</td>
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
          <InfoBanner variant="info" className="mt-4">
            {t(
              'No Bill of Quantities total yet. You can still enter amounts here — they define the total and the percentages are calculated from them. Once BOQ prices are added, entering a percentage will also compute its amount automatically.',
              'لا يوجد إجمالي لجدول الكميات بعد. يمكنك إدخال المبالغ هنا — فهي تحدد الإجمالي وتُحتسب النسب منها. وبمجرد إدخال أسعار جدول الكميات، سيؤدي إدخال النسبة إلى احتساب مبلغها تلقائياً.'
            )}
          </InfoBanner>
        )}
      </SectionCard>
    </div>
  );
}
