import { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { useRole } from '../context/RoleContext';
import { PROJECTS } from '../data/mockData';
import { SectionCard, Button, Badge, Textarea } from '../components/ui';
import { CheckIcon } from '../components/Icons';
import RegulatoryRecordsCard from '../components/RegulatoryRecordsCard';
import { workflowStages, deriveIncludesFromItems, DEPARTMENTS } from '../components/ProjectIncludesSelect';
import { formatSAR } from '../lib/money';
import type { V3Stage } from '../types/tender';

/**
 * v3 review screen — one component for every hand-off:
 * req-submit (tender) · emarket-submit · proc-request · proc-send · req-confirm · status.
 */
export type ReviewMode = 'req-submit' | 'emarket-submit' | 'proc-request' | 'proc-send' | 'req-confirm' | 'status';

export default function StageReview({ mode }: { mode: ReviewMode }) {
  const tender = useTender();
  const { formData, boqSubtotal, boqTotal, sectionStatuses, goToSection, handOff, requesterReady, procurementReady, v3Stage, paymentPctTotal, evalWeightTotal, qualPctTotal } = tender;
  const { setRole } = useRole();
  const { isAr } = useLanguage();
  const t = useT();
  const [note, setNote] = useState('');
  const [changesOpen, setChangesOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const project = PROJECTS.find((p) => p.id === formData.projectId);
  const items = (project?.items ?? []).filter((it) => (formData.selectedProjectItemIds ?? []).includes(it.id));
  const budget = items.reduce((s, it) => s + (it.budget ?? 0), 0);
  const isEmarket = formData.sourceType === 'souq-etimad';
  const includes = [...new Set([...deriveIncludesFromItems([...items.map((i) => i.name), ...formData.boqItems.map((b) => b.itemName)].filter(Boolean)), ...formData.scopeIncludes])];
  const chain = isEmarket ? (['manager', 'finance', 'procurement'] as const) : workflowStages(includes).filter((d) => d !== 'requester');
  const idx = (id: string) => ['procurement-route', 'project-setup', 'scope-of-work', 'boq', 'payment-schedule', 'technical-evaluation', 'qualification', 'attachments', 'review'].indexOf(id);

  async function go(next: V3Stage, by: 'requester' | 'procurement', n?: string) {
    setBusy(true);
    await handOff(next, by, n);
    setBusy(false);
    setNote(''); setChangesOpen(false);
  }

  const missingRequester = [
    !formData.tenderingPurpose.trim() && t('Purpose', 'الغرض'),
    !isEmarket && sectionStatuses[idx('scope-of-work')] !== 'completed' && t('Scope of work, duration and location', 'نطاق العمل والمدة والموقع'),
    sectionStatuses[idx('boq')] !== 'completed' && t('Bill of Quantities (every line needs a quantity; branded lines need a reason)', 'جدول الكميات'),
  ].filter(Boolean) as string[];
  const missingProcurement = [
    sectionStatuses[idx('payment-schedule')] !== 'completed' && t(`Payment stages (total ${paymentPctTotal}% of 100%)`, `مراحل الدفع (${paymentPctTotal}% من 100%)`),
    sectionStatuses[idx('technical-evaluation')] !== 'completed' && t(`Technical evaluation (weights ${evalWeightTotal}% of 100%, passing score)`, `التقييم الفني (${evalWeightTotal}% من 100%)`),
    sectionStatuses[idx('qualification')] !== 'completed' && t(`Qualification criteria (${qualPctTotal}% of 100%)`, `معايير التأهيل (${qualPctTotal}% من 100%)`),
  ].filter(Boolean) as string[];

  const showProcurementParts = mode === 'proc-send' || mode === 'req-confirm' || (mode === 'status' && (v3Stage === 'requester-confirm' || v3Stage === 'in-approval') && !isEmarket);

  return (
    <div className="space-y-5">
      {mode === 'status' && <StatusBanner />}

      {mode === 'req-confirm' && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-5 py-4">
          <p className="text-[14px] font-semibold text-neutral-900">{t('Procurement has completed the RFP — please confirm', 'أكملت المشتريات كراسة الشروط — يرجى التأكيد')}</p>
          <p className="text-[13px] text-neutral-600 mt-1">{t('Check the payment stages and evaluation criteria Procurement added. Confirm to send the request for approval, or ask for changes.', 'راجع مراحل الدفع ومعايير التقييم التي أضافتها المشتريات. أكّد لإرسال الطلب للاعتماد، أو اطلب تعديلات.')}</p>
          {formData.procurementNote && <p className="text-[13px] text-neutral-800 mt-2.5 rounded-lg bg-white border border-neutral-200 px-3 py-2"><span className="font-semibold">{t('Note from Procurement:', 'ملاحظة من المشتريات:')}</span> {formData.procurementNote}</p>}
        </div>
      )}

      {mode === 'proc-request' && formData.requesterChangeRequest && v3Stage === 'with-procurement' && (
        <div className="rounded-xl border border-warning-100 bg-warning-50/70 px-5 py-3.5">
          <p className="text-[12px] font-semibold text-warning-700">{t('Changes requested by the requester', 'تعديلات طلبها مقدم الطلب')}</p>
          <p className="text-[13px] text-neutral-800 mt-1">{formData.requesterChangeRequest}</p>
        </div>
      )}

      {/* Budget vs estimate */}
      <BudgetCheck budget={budget} estimate={boqTotal} subtotal={boqSubtotal} />

      {/* What the requester asked for */}
      <SectionCard title={isEmarket ? 'Purchase' : 'Requirements'} titleAr={isEmarket ? 'الشراء' : 'المتطلبات'}
        action={(mode === 'req-submit' || mode === 'emarket-submit') ? <EditLink onClick={() => goToSection(idx('project-setup'))} /> : undefined}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
          <Field label={t('Project', 'المشروع')} value={project ? `${isAr ? project.nameAr : project.name} (${project.code})` : '—'} />
          <Field label={t('Route', 'المسار')} value={isEmarket ? t('Etimad eMarket', 'السوق الإلكتروني') : t('Competitive Tender', 'منافسة')} />
          {formData.startedFromRfp && <Field label={t('Started from', 'بدأ من')} value={formData.startedFromRfp} />}
          {!isEmarket && <Field label={t('Duration', 'المدة')} value={formData.contractDuration ? `${t(cap(formData.contractDurationType), formData.contractDurationType)} · ${formData.contractDuration}` : '—'} />}
          {!isEmarket && <Field label={t('Start date', 'تاريخ البدء')} value={formData.startDate || '—'} />}
          {!isEmarket && <Field label={t('Location', 'الموقع')} value={formData.executionLocation || '—'} />}
        </dl>
        <Block label={t('Purpose', 'الغرض')} text={formData.tenderingPurpose} />
        {!isEmarket && <Block label={t('Scope of work', 'نطاق العمل')} text={formData.scopeOfWork} clamp />}
      </SectionCard>

      <SectionCard title={isEmarket ? 'Basket' : 'Bill of Quantities'} titleAr={isEmarket ? 'السلة' : 'جدول الكميات'}
        action={(mode === 'req-submit' || mode === 'emarket-submit') ? <EditLink onClick={() => goToSection(idx('boq'))} /> : undefined}>
        <div className="rounded-lg border border-neutral-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="bg-neutral-50 border-b border-neutral-200 text-[12px] text-neutral-500">
              <th className="text-start px-3 py-2 font-medium">{t('Item', 'البند')}</th>
              <th className="text-end px-3 py-2 font-medium">{t('Qty', 'الكمية')}</th>
              <th className="text-end px-3 py-2 font-medium">{t('Unit price (SAR)', 'سعر الوحدة')}</th>
              <th className="text-end px-3 py-2 font-medium">{t('Total (SAR)', 'الإجمالي')}</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {formData.boqItems.map((r) => {
                const q = typeof r.quantity === 'number' ? r.quantity : 0;
                const p = typeof r.unitPrice === 'number' ? r.unitPrice : 0;
                const total = typeof r.lineTotal === 'number' ? r.lineTotal : (q || (isEmarket ? 1 : 0)) * p;
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-neutral-800">{r.itemName || r.jobTitle || '—'}</td>
                    <td className="px-3 py-2 text-end tabular-nums" dir="ltr">{r.quantity === '' ? '—' : r.quantity}</td>
                    <td className="px-3 py-2 text-end tabular-nums" dir="ltr">{p ? formatSAR(p) : '—'}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-medium" dir="ltr">{total ? formatSAR(total) : '—'}</td>
                  </tr>
                );
              })}
              {formData.boqItems.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-neutral-500">{t('No lines yet.', 'لا توجد بنود بعد.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* What Procurement added */}
      {showProcurementParts && (
        <>
          <SectionCard title="Payment stages" titleAr="مراحل الدفع" description={formData.paymentTemplate ? `Template: ${formData.paymentTemplate}` : undefined}
            action={mode === 'proc-send' ? <EditLink onClick={() => goToSection(idx('payment-schedule'))} /> : undefined}>
            {formData.paymentStages.length ? (
              <ul className="divide-y divide-neutral-100 text-[13px]">
                {formData.paymentStages.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-neutral-800">{p.stageName || '—'}{p.itemsDeliverables && <span className="text-neutral-500"> · {p.itemsDeliverables}</span>}</span>
                    <span className="font-semibold tabular-nums" dir="ltr">{p.percentage === '' ? '—' : `${p.percentage}%`}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-neutral-500">{t('Not added yet.', 'لم تُضف بعد.')}</p>}
          </SectionCard>
          <SectionCard title="Evaluation" titleAr="التقييم" description={formData.evaluationTemplate ? `Template: ${formData.evaluationTemplate}` : undefined}
            action={mode === 'proc-send' ? <EditLink onClick={() => goToSection(idx('technical-evaluation'))} /> : undefined}>
            <p className="text-[12px] font-medium text-neutral-500 mb-1.5">{t('Technical criteria', 'المعايير الفنية')} · {t('passing score', 'درجة النجاح')} {formData.technicalPassingPercentage || '—'}%</p>
            <ul className="divide-y divide-neutral-100 text-[13px]">
              {formData.evaluationCriteria.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2"><span className="text-neutral-800">{c.description || '—'}</span><span className="font-semibold tabular-nums" dir="ltr">{c.weight === '' ? '—' : `${c.weight}%`}</span></li>
              ))}
            </ul>
            <p className="text-[12px] font-medium text-neutral-500 mt-4 mb-1.5">{t('Qualification criteria', 'معايير التأهيل')}</p>
            <ul className="divide-y divide-neutral-100 text-[13px]">
              {formData.qualificationCriteria.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2"><span className="text-neutral-800">{isAr ? m.nameAr : m.name}</span><span className="font-semibold tabular-nums" dir="ltr">{m.percentage === '' ? '—' : `${m.percentage}%`}</span></li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}

      {!isEmarket && (mode === 'req-submit' || mode === 'req-confirm' || mode === 'proc-send') && <RegulatoryRecordsCard records={project?.regulatoryRecords ?? ''} extra={formData.extraRegulatoryRecords ?? []} onChange={(v) => tender.updateField('extraRegulatoryRecords', v)} />}

      {/* Approval chain */}
      {mode !== 'proc-request' && (
        <SectionCard title="Approval chain" titleAr="مسار الاعتماد"
          description={isEmarket ? 'After you submit, the purchase goes through these approvals.' : 'After you confirm the RFP, it goes through these approvals. Reviewers depend on what the project includes.'}
          descriptionAr="بعد الإرسال يمر الطلب بهذه الاعتمادات.">
          <ol className="flex flex-wrap items-center gap-2">
            {chain.map((d, i) => (
              <li key={d} className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${v3Stage === 'in-approval' && i === 0 ? 'border-warning-200 bg-warning-50 text-warning-700' : 'border-neutral-200 bg-white text-neutral-700'}`}>
                  {isAr ? DEPARTMENTS[d].ar : DEPARTMENTS[d].en}
                  {v3Stage === 'in-approval' && i === 0 && <span className="text-[10.5px]">· {t('reviewing now', 'قيد المراجعة')}</span>}
                </span>
                {i < chain.length - 1 && <span className="text-neutral-300">→</span>}
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {/* Actions */}
      {mode === 'req-submit' && (
        <ActionCard
          title={t('Send to Procurement', 'الإرسال إلى المشتريات')}
          body={t('Procurement adds the payment stages and evaluation criteria, then sends the RFP back for you to confirm before approvals start.', 'تضيف المشتريات مراحل الدفع ومعايير التقييم، ثم تعيد كراسة الشروط لتأكيدها قبل بدء الاعتمادات.')}
          missing={missingRequester} t={t}>
          <Button variant="primary" size="lg" onClick={() => go('with-procurement', 'requester')} disabled={!requesterReady || busy} loading={busy}>
            {t('Send to Procurement', 'الإرسال إلى المشتريات')} →
          </Button>
        </ActionCard>
      )}
      {mode === 'emarket-submit' && (
        <ActionCard title={t('Submit for approval', 'الإرسال للاعتماد')}
          body={t('Your Line Manager reviews the purchase first, then Finance and Procurement.', 'يراجع مديرك المباشر الطلب أولاً، ثم الإدارة المالية والمشتريات.')}
          missing={missingRequester} t={t}>
          <Button variant="primary" size="lg" onClick={() => go('in-approval', 'requester')} disabled={!requesterReady || busy} loading={busy}>
            <CheckIcon className="w-4 h-4" />{t('Submit for approval', 'الإرسال للاعتماد')}
          </Button>
        </ActionCard>
      )}
      {mode === 'proc-send' && (
        <ActionCard title={t('Send back to the requester', 'الإعادة إلى مقدم الطلب')}
          body={t('The requester checks your payment stages and evaluation criteria and confirms before approvals start.', 'يراجع مقدم الطلب مراحل الدفع ومعايير التقييم ويؤكدها قبل بدء الاعتمادات.')}
          missing={missingProcurement} t={t}>
          <div className="w-full">
            <label htmlFor="proc-note" className="block text-[12px] font-medium text-neutral-700 mb-1">{t('Note to the requester (optional)', 'ملاحظة لمقدم الطلب (اختياري)')}</label>
            <Textarea id="proc-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('e.g. Added a 10% retention on the final stage.', 'مثال: أضفنا محتجزاً بنسبة 10% في المرحلة الأخيرة.')} />
            <div className="flex justify-end mt-3">
              <Button variant="primary" size="lg" onClick={() => go('requester-confirm', 'procurement', note.trim() || undefined)} disabled={!procurementReady || busy} loading={busy}>
                {t('Send for confirmation', 'الإرسال للتأكيد')} →
              </Button>
            </div>
          </div>
        </ActionCard>
      )}
      {mode === 'req-confirm' && (
        <ActionCard title={t('Confirm the RFP', 'تأكيد كراسة الشروط')} body={t('Confirming sends the request into the approval chain above.', 'يرسل التأكيد الطلب إلى مسار الاعتماد أعلاه.')} missing={[]} t={t}>
          <div className="w-full">
            {changesOpen && (
              <div className="mb-3">
                <label htmlFor="req-changes" className="block text-[12px] font-medium text-neutral-700 mb-1">{t('What should Procurement change?', 'ما الذي يجب أن تغيره المشتريات؟')} <span className="text-error-600">*</span></label>
                <Textarea id="req-changes" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            <div className="flex justify-end gap-2 flex-wrap">
              {!changesOpen
                ? <Button variant="secondary" onClick={() => setChangesOpen(true)}>{t('Request changes', 'طلب تعديلات')}</Button>
                : <Button variant="secondary" onClick={() => go('with-procurement', 'requester', note.trim())} disabled={note.trim().length < 5 || busy}>{t('Send changes to Procurement', 'إرسال التعديلات إلى المشتريات')}</Button>}
              <Button variant="primary" size="lg" onClick={() => go('in-approval', 'requester')} disabled={busy} loading={busy}>
                <CheckIcon className="w-4 h-4" />{t('Confirm & send for approval', 'التأكيد والإرسال للاعتماد')}
              </Button>
            </div>
          </div>
        </ActionCard>
      )}

      {mode === 'status' && v3Stage === 'with-procurement' && (
        <PrototypeSwitch label={t('Continue as Procurement', 'المتابعة كمشتريات')} onClick={() => setRole('procurement')} t={t} />
      )}
      {mode === 'status' && v3Stage === 'requester-confirm' && (
        <PrototypeSwitch label={t('Continue as the requester', 'المتابعة كمقدم طلب')} onClick={() => setRole('requester')} t={t} />
      )}
    </div>
  );

  function StatusBanner() {
    const last = formData.v3History?.at(-1);
    const when = last ? new Date(last.at).toLocaleString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const copy: Record<V3Stage, [string, string, string, string]> = {
      'draft': ['Draft', 'مسودة', 'The requester is still preparing this request.', 'لا يزال مقدم الطلب يُعد هذا الطلب.'],
      'with-procurement': ['With Procurement', 'لدى المشتريات', 'Procurement is adding the payment stages and evaluation criteria.', 'تضيف المشتريات مراحل الدفع ومعايير التقييم.'],
      'requester-confirm': ['Waiting for the requester', 'بانتظار مقدم الطلب', 'The requester is checking Procurement’s additions before approvals.', 'يراجع مقدم الطلب إضافات المشتريات قبل الاعتمادات.'],
      'in-approval': ['In approval', 'قيد الاعتماد', 'The request is going through the approval chain.', 'الطلب يمر بمسار الاعتماد.'],
    };
    const [en, ar, dEn, dAr] = copy[v3Stage];
    return (
      <div className="rounded-xl border border-success-100 bg-success-50/70 px-5 py-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-white border border-success-100 flex items-center justify-center flex-shrink-0"><CheckIcon className="w-4 h-4 text-success-600" /></span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-neutral-900">{t(en, ar)}</p>
            {tender.submitted && <Badge variant="info"><span dir="ltr">{tender.submitted.requestNo}</span></Badge>}
          </div>
          <p className="text-[13px] text-neutral-600 mt-0.5">{t(dEn, dAr)}{when && <span className="text-neutral-500"> · {t('updated', 'آخر تحديث')} {when}</span>}</p>
        </div>
      </div>
    );
  }
}

/** Budget vs current estimate for the selected budgeted items (shown while building the BOQ too). */
export function LiveBudgetCheck() {
  const { formData, boqTotal, boqSubtotal } = useTender();
  const project = PROJECTS.find((p) => p.id === formData.projectId);
  const budget = (project?.items ?? []).filter((it) => (formData.selectedProjectItemIds ?? []).includes(it.id)).reduce((s, it) => s + (it.budget ?? 0), 0);
  return <BudgetCheck budget={budget} estimate={boqTotal} subtotal={boqSubtotal} />;
}

function BudgetCheck({ budget, estimate, subtotal }: { budget: number; estimate: number; subtotal: number }) {
  const t = useT();
  if (!budget) return null;
  const pct = Math.min(100, Math.round((estimate / budget) * 100));
  const over = estimate > budget;
  return (
    <div className={`rounded-xl border px-5 py-4 ${over ? 'border-error-200 bg-error-50/60' : 'border-neutral-200 bg-white'}`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[13px] font-semibold text-neutral-900">{t('Budget check', 'فحص الميزانية')}</p>
        <p className="text-[13px] text-neutral-700" dir="ltr">
          <span className="font-semibold">SAR {formatSAR(Math.round(estimate))}</span> <span className="text-neutral-500">{t('of', 'من')}</span> SAR {formatSAR(budget)}
        </p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-neutral-100 overflow-hidden"><div className={`h-full rounded-full ${over ? 'bg-error-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} /></div>
      <p className={`text-[12px] mt-1.5 ${over ? 'text-error-700 font-medium' : 'text-neutral-500'}`}>
        {over
          ? t(`Estimate is SAR ${formatSAR(Math.round(estimate - budget))} over the approved budget. Finance will likely return it — reduce quantities or prices, or attach a budget transfer.`, 'التقدير يتجاوز الميزانية المعتمدة.')
          : subtotal === 0
            ? t('Add quantities and unit prices to compare the estimate with the budget.', 'أضف الكميات والأسعار لمقارنة التقدير بالميزانية.')
            : t(`Estimate (incl. 15% VAT) uses ${pct}% of the approved budget.`, `يستخدم التقدير ${pct}% من الميزانية المعتمدة.`)}
      </p>
    </div>
  );
}

function ActionCard({ title, body, missing, children, t }: { title: string; body: string; missing: string[]; children: React.ReactNode; t: (en: string, ar: string) => string }) {
  return (
    <div className="rounded-xl border-2 border-brand-200 bg-white px-5 py-4">
      <p className="text-[15px] font-semibold text-neutral-900">{title}</p>
      <p className="text-[13px] text-neutral-600 mt-0.5">{body}</p>
      {missing.length > 0 && (
        <div className="mt-3 rounded-lg bg-warning-50 border border-warning-100 px-3 py-2">
          <p className="text-[12px] font-semibold text-warning-700">{t('Still needed', 'ما زال مطلوباً')}</p>
          <ul className="mt-0.5 list-disc ps-5 text-[12px] text-warning-800">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      <div className="mt-3 flex justify-end">{children}</div>
    </div>
  );
}

function PrototypeSwitch({ label, onClick, t }: { label: string; onClick: () => void; t: (en: string, ar: string) => string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-3 flex items-center justify-between gap-3">
      <p className="text-[12.5px] text-neutral-600"><span className="font-semibold">{t('Prototype:', 'نموذج أولي:')}</span> {t('play the next role to continue the flow.', 'تقمّص الدور التالي لمتابعة المسار.')}</p>
      <button type="button" onClick={onClick} className="text-[12.5px] font-semibold text-link hover:underline whitespace-nowrap">{label} →</button>
    </div>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  const t = useT();
  return <button type="button" onClick={onClick} className="text-[12px] font-semibold text-link hover:underline">{t('Edit', 'تعديل')}</button>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] font-medium text-neutral-500">{label}</dt><dd className="text-neutral-800 mt-0.5">{value}</dd></div>;
}

function Block({ label, text, clamp }: { label: string; text: string; clamp?: boolean }) {
  const t = useT();
  return (
    <div className="mt-4 pt-3 border-t border-neutral-100">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <p className={`text-[13px] text-neutral-800 mt-0.5 whitespace-pre-line ${clamp ? 'line-clamp-4' : ''}`}>{text || <span className="text-neutral-400 italic">{t('Not added', 'لم يُضف')}</span>}</p>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
