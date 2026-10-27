// Munafasat Inbox — task-type experiences (registry). Each task type renders its
// own workspace body. A real deployment would resolve these from a task-template
// schema; here they are typed React renderers selected by task.type.
import { useLanguage, useT } from '../context/LanguageContext';
import { Input, Textarea, Select, InfoBanner, Button } from '../components/ui';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, DocumentIcon, UploadIcon, ExclamationCircleIcon } from '../components/Icons';
import type { Task, ChecklistItem, EtimadReviewItem } from './types';
import { useInbox, fmtSAR } from './store';
import { tb } from './meta';

type T = (en: string, ar: string) => string;

// ── Approval ─────────────────────────────────────────────────────────────────
function ApprovalBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  return (
    <div className="space-y-4">
      <Section title={t('Record summary', 'ملخص السجل')}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {task.approvalRecord?.map((r, i) => (
            <div key={i} className={r.emphasis ? 'sm:col-span-2' : ''}>
              <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{tb(r.label, isAr)}</dt>
              <dd className={`text-neutral-800 ${r.emphasis ? 'text-[16px] font-bold' : 'text-[13px] font-medium'}`} dir={/SAR|\d/.test(r.value) ? 'ltr' : undefined}>{r.value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      {task.priorApprovals && task.priorApprovals.length > 0 && (
        <Section title={t('Approval history', 'سجل الاعتماد')}>
          <ul className="space-y-1.5">
            {task.priorApprovals.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-[12.5px]">
                <CheckCircleIcon className="w-3.5 h-3.5 text-success-600 flex-shrink-0" />
                <span className="font-medium text-neutral-700">{p.name}</span>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500">{p.decision}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {task.requireReasonOnReject && (
        <InfoBanner variant="info">{t('A reason is required when you reject or return this request.', 'يلزم إدخال سبب عند رفض هذا الطلب أو إعادته.')}</InfoBanner>
      )}
    </div>
  );
}

// ── Etimad E-Market review (Procurement checks the requester's Yes/No answers) ──
function EtimadReviewBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { setEtimadItem } = useInbox();
  const items = task.etimadItems ?? [];
  const readOnly = task.state === 'completed' || task.state === 'waiting';
  const yes = items.filter((i) => i.answer === 'yes').length;
  const flagged = items.filter((i) => i.verdict === 'on-etimad').length;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-[12.5px] text-neutral-700 leading-relaxed">
        {t(`Check each line on Etimad E-Market and confirm the requester's answer. ${yes} of ${items.length} were marked as available on Etimad and kept in the tender with a justification.`,
           `تحقق من كل بند في سوق اعتماد وأكّد إجابة مقدم الطلب. ${yes} من ${items.length} حُددت كمتوفرة في اعتماد وأُبقيت في المنافسة بمبرر.`)}
      </div>
      <Section title={t('BOQ lines and Etimad answers', 'بنود الجدول وإجابات اعتماد')}>
        <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden" data-testid="etimad-review-items">
          {items.map((it) => <EtimadReviewRow key={it.id} it={it} readOnly={readOnly} isAr={isAr} t={t} onChange={(p) => setEtimadItem(task.id, it.id, p)} />)}
        </div>
      </Section>
      {flagged > 0 && !readOnly && (
        <InfoBanner variant="warning">
          {t(`${flagged} line${flagged === 1 ? ' is' : 's are'} actually on Etimad. Return the request to the requester, or move ${flagged === 1 ? 'it' : 'them'} to an Etimad E-Market draft.`,
             `${flagged} بند متوفر فعلاً في اعتماد. أعد الطلب إلى مقدمه، أو انقل البنود إلى مسودة سوق اعتماد.`)}
        </InfoBanner>
      )}
    </div>
  );
}

function EtimadReviewRow({ it, readOnly, isAr, t, onChange }: { it: EtimadReviewItem; readOnly: boolean; isAr: boolean; t: T; onChange: (p: Partial<EtimadReviewItem>) => void }) {
  void isAr;
  const qtyText = it.qty !== '' ? `${it.qty} ${it.unit}` : '—';
  const priceText = it.unitPrice !== '' ? fmtSAR(Number(it.unitPrice)) : '—';
  const verdictBtn = (v: 'confirmed' | 'on-etimad', label: string) => (
    <button type="button" role="radio" aria-checked={it.verdict === v} disabled={readOnly} onClick={() => onChange({ verdict: v, ...(v === 'confirmed' ? { note: '' } : {}) })}
      className={`px-3 py-1 text-[11.5px] font-semibold transition-colors ${v === 'on-etimad' ? 'border-s border-neutral-300' : ''} ${
        it.verdict === v ? (v === 'confirmed' ? 'bg-success-600 text-white' : 'bg-warning-500 text-white') : 'bg-white text-neutral-600 hover:bg-neutral-50'} disabled:cursor-default`}>
      {label}
    </button>
  );
  return (
    <div className={`px-3.5 py-3 ${it.verdict === 'on-etimad' ? 'bg-warning-50/50' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-neutral-900">{it.name}</p>
          <p className="text-[11.5px] text-neutral-500 tabular-nums whitespace-nowrap" dir="ltr">{qtyText} · {priceText}</p>
        </div>
        <span className={`flex-shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 border whitespace-nowrap ${it.answer === 'yes' ? 'bg-warning-50 text-warning-700 border-warning-100' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
          {it.answer === 'yes' ? t('Requester: on Etimad — kept in tender', 'مقدم الطلب: متوفر في اعتماد — أُبقي') : t('Requester: not on Etimad', 'مقدم الطلب: غير متوفر في اعتماد')}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="text-[11.5px] text-neutral-500">{t('Your check:', 'فحصك:')}</span>
        <span role="radiogroup" aria-label={t(`Your check for ${it.name}`, `فحصك لـ ${it.name}`)} className="inline-flex rounded-lg border border-neutral-300 overflow-hidden" dir="ltr">
          {verdictBtn('confirmed', t('Answer correct', 'الإجابة صحيحة'))}
          {verdictBtn('on-etimad', t('Actually on Etimad', 'متوفر فعلاً في اعتماد'))}
        </span>
      </div>
      {it.answer === 'yes' && it.justification && (
        <p className="mt-1.5 text-[12px] text-neutral-700 truncate" title={it.justification}><span className="font-semibold text-neutral-500">{t('Justification:', 'المبرر:')}</span> {it.justification}</p>
      )}
      {it.verdict === 'on-etimad' && (
        <div className="mt-2">
          <input value={it.note ?? ''} disabled={readOnly} onChange={(e) => onChange({ note: e.target.value })}
            placeholder={t('Where is it listed on Etimad? (required)', 'أين يُدرج في اعتماد؟ (مطلوب)')}
            aria-label={t(`Note for ${it.name}`, `ملاحظة لـ ${it.name}`)}
            className="w-full rounded-lg border border-warning-400 bg-white px-3 py-1.5 text-[12.5px] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
        </div>
      )}
    </div>
  );
}

// ── Review (checklist) ───────────────────────────────────────────────────────
function ReviewBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { setChecklistItem } = useInbox();
  const list = task.checklist ?? [];
  const doneCount = list.filter((c) => itemDone(c)).length;
  return (
    <div className="space-y-4">
      <Section title={t(`Checklist — ${doneCount} of ${list.length} complete`, `قائمة التحقق — ${doneCount} من ${list.length} مكتملة`)}>
        <div className="space-y-2">
          {list.map((c) => <ChecklistRow key={c.id} task={task} c={c} isAr={isAr} t={t} onChange={(p) => setChecklistItem(task.id, c.id, p)} />)}
        </div>
      </Section>
      {task.findingsLabel && (
        <Section title={tb(task.findingsLabel, isAr)}>
          <FindingsNote task={task} t={t} isAr={isAr} />
        </Section>
      )}
    </div>
  );
}

const itemDone = (c: ChecklistItem) => {
  if (c.kind === 'decision') return c.value != null && c.value !== '';
  if (c.kind === 'text' || c.kind === 'number') return c.value != null && String(c.value).trim() !== '';
  return c.done === true;
};

function ChecklistRow({ task, c, isAr, t, onChange }: { task: Task; c: ChecklistItem; isAr: boolean; t: T; onChange: (p: Partial<ChecklistItem>) => void }) {
  const { uploadDocToChecklist } = useChecklistEvidence();
  const done = itemDone(c);
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${done ? 'border-success-200 bg-success-50/40' : 'border-neutral-200 bg-white'}`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">
          {c.kind === 'confirm' && (
            <button type="button" onClick={() => onChange({ done: !c.done })}
              className={`w-5 h-5 rounded-md border flex items-center justify-center ${c.done ? 'bg-brand-600 border-brand-600 text-white' : 'border-neutral-300 bg-white'}`}>
              {c.done && <CheckCircleIcon className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-neutral-800">
            {tb(c.label, isAr)}
            {c.mandatory && <span className="text-error-500 ms-1">*</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {c.kind === 'yesno' && ['yes', 'no'].map((v) => (
              <button key={v} type="button" onClick={() => onChange({ done: true, value: v })}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium border ${c.value === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-neutral-300 text-neutral-600'}`}>
                {v === 'yes' ? t('Yes', 'نعم') : t('No', 'لا')}
              </button>
            ))}
            {c.kind === 'passfail' && ['pass', 'fail'].map((v) => (
              <button key={v} type="button" onClick={() => onChange({ done: true, value: v })}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium border ${c.value === v ? (v === 'pass' ? 'bg-success-600 text-white border-success-600' : 'bg-error-600 text-white border-error-600') : 'bg-white border-neutral-300 text-neutral-600'}`}>
                {v === 'pass' ? t('Pass', 'ناجح') : t('Fail', 'غير مطابق')}
              </button>
            ))}
            {c.kind === 'decision' && (
              <div className="w-full max-w-xs"><Select value={(c.value as string) ?? ''} onChange={(e) => onChange({ value: e.target.value })}>
                <option value="">{t('Select…', 'اختر…')}</option>
                {c.options?.map((o, i) => <option key={i} value={o.en}>{tb(o, isAr)}</option>)}
              </Select></div>
            )}
            {(c.kind === 'text' || c.kind === 'number') && (
              <Input type={c.kind === 'number' ? 'number' : 'text'} value={(c.value as string | number) ?? ''} onChange={(e) => onChange({ value: e.target.value })} className="max-w-xs" />
            )}
            {c.evidenceRequired && (
              <button type="button" onClick={() => uploadDocToChecklist(task.id, c.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50">
                <UploadIcon className="w-3.5 h-3.5" />
                {(c.evidence?.length ?? 0) > 0 ? t('Evidence attached', 'تم إرفاق الدليل') : t('Attach evidence', 'إرفاق دليل')}
              </button>
            )}
          </div>
          {c.evidenceRequired && (c.evidence?.length ?? 0) > 0 && (
            <p className="mt-1 text-[11px] text-success-700 inline-flex items-center gap-1"><DocumentIcon className="w-3 h-3" />{c.evidence![0]}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// evidence upload helper (mock file name)
function useChecklistEvidence() {
  const { setChecklistItem, getTask } = useInbox();
  const uploadDocToChecklist = (taskId: string, itemId: string) => {
    const task = getTask(taskId);
    const c = task?.checklist?.find((x) => x.id === itemId);
    setChecklistItem(taskId, itemId, { evidence: [...(c?.evidence ?? []), `evidence_${itemId}.pdf`] });
  };
  return { uploadDocToChecklist };
}

function FindingsNote({ task, t, isAr }: { task: Task; t: T; isAr: boolean }) {
  void isAr;
  const { addComment } = useInbox();
  // Findings are recorded as a comment on submit; here we provide a free-text area.
  return (
    <Textarea rows={3} placeholder={t('Record your findings and recommendation…', 'سجّل نتائجك وتوصيتك…')}
      onBlur={(e) => { if (e.target.value.trim()) { addComment(task.id, `[findings] ${e.target.value.trim()}`); e.target.value = ''; } }} />
  );
}

// ── Data Collection ──────────────────────────────────────────────────────────
function DataCollectionBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { setField, uploadDoc } = useInbox();
  void uploadDoc;
  const fields = task.fields ?? [];
  const visible = (f: typeof fields[number]) => !f.showIf || fields.find((x) => x.id === f.showIf!.field)?.value === f.showIf!.equals;
  return (
    <div className="space-y-4">
      <InfoBanner variant="info">{t('Existing procurement data is shown greyed; fields you complete are saved to the RFP record.', 'تظهر بيانات الشراء الحالية بلون باهت؛ وتُحفظ الحقول التي تكملها في سجل المنافسة.')}</InfoBanner>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.filter(visible).map((f) => (
          <div key={f.id} className={f.kind === 'longtext' ? 'sm:col-span-2' : ''}>
            <label className="block text-[12.5px] font-medium text-neutral-700 mb-1">
              {tb(f.label, isAr)}{f.required && <span className="text-error-500 ms-1">*</span>}
              {f.existing && <span className="ms-2 text-[10px] uppercase tracking-wide text-neutral-400">{t('existing', 'حالي')}</span>}
            </label>
            {f.existing ? (
              <div className="h-9 px-3 flex items-center rounded-lg border border-neutral-200 bg-neutral-50 text-[13px] text-neutral-500">{String(f.value ?? '—')}</div>
            ) : f.kind === 'longtext' ? (
              <Textarea rows={3} value={(f.value as string) ?? ''} placeholder={f.placeholder ? tb(f.placeholder, isAr) : ''} onChange={(e) => setField(task.id, f.id, e.target.value)} />
            ) : f.kind === 'select' ? (
              <Select value={(f.value as string) ?? ''} onChange={(e) => setField(task.id, f.id, e.target.value)}>
                <option value="">{t('Select…', 'اختر…')}</option>
                {f.options?.map((o, i) => <option key={i} value={o.en}>{tb(o, isAr)}</option>)}
              </Select>
            ) : f.kind === 'yesno' ? (
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" onClick={() => setField(task.id, f.id, v)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium border ${f.value === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-neutral-300 text-neutral-600'}`}>
                    {v ? t('Yes', 'نعم') : t('No', 'لا')}
                  </button>
                ))}
              </div>
            ) : f.kind === 'file' ? (
              <button type="button" onClick={() => setField(task.id, f.id, `${f.id}_upload.pdf`)}
                className="w-full h-9 px-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white text-[12.5px] text-neutral-600 hover:border-brand-400">
                <UploadIcon className="w-3.5 h-3.5" />{f.value ? String(f.value) : t('Upload file', 'رفع ملف')}
              </button>
            ) : (
              <Input type={f.kind === 'number' || f.kind === 'currency' ? 'number' : 'text'}
                value={(f.value as string | number) ?? ''} placeholder={f.placeholder ? tb(f.placeholder, isAr) : (f.kind === 'currency' ? 'SAR' : '')}
                onChange={(e) => setField(task.id, f.id, e.target.value === '' ? '' : (f.kind === 'number' || f.kind === 'currency' ? Number(e.target.value) : e.target.value))} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Technical Evaluation ─────────────────────────────────────────────────────
function TechnicalEvalBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { setCriterion } = useInbox();
  const crit = task.criteria ?? [];
  const weighted = crit.reduce((s, c) => s + (c.score != null ? (c.score / c.max) * c.weight : 0), 0);
  const pass = weighted >= (task.passThreshold ?? 0);
  const allScored = crit.every((c) => c.score != null);
  return (
    <div className="space-y-4">
      <Section title={t('Weighted scoring', 'التقييم المرجّح')}>
        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="text-start ps-3 pe-2 py-2 font-medium">{t('Criterion', 'المعيار')}</th>
              <th className="px-2 py-2 font-medium w-16 text-center">{t('Weight', 'الوزن')}</th>
              <th className="px-2 py-2 font-medium w-28 text-center">{t('Score', 'الدرجة')}</th>
              <th className="px-2 py-2 font-medium w-20 text-end">{t('Weighted', 'المرجّح')}</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {crit.map((c) => (
                <tr key={c.id} className="bg-white">
                  <td className="ps-3 pe-2 py-2 align-top">
                    <p className="text-[12.5px] font-medium text-neutral-800">{tb(c.label, isAr)}</p>
                    <input className="mt-1 w-full text-[11.5px] text-neutral-500 bg-transparent outline-none placeholder:text-neutral-300"
                      placeholder={t('Comment (optional)', 'تعليق (اختياري)')} value={c.comment ?? ''} onChange={(e) => setCriterion(task.id, c.id, { comment: e.target.value })} />
                  </td>
                  <td className="px-2 py-2 text-center text-[12px] text-neutral-600">{c.weight}%</td>
                  <td className="px-2 py-2 text-center">
                    <input type="number" min={0} max={c.max} value={c.score ?? ''} onChange={(e) => setCriterion(task.id, c.id, { score: e.target.value === '' ? null : Math.max(0, Math.min(c.max, Number(e.target.value))) })}
                      className="w-16 text-center text-[13px] rounded-md border border-neutral-300 px-1.5 py-1 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
                    <span className="text-[11px] text-neutral-400 ms-1">/ {c.max}</span>
                  </td>
                  <td className="px-2 py-2 text-end text-[12.5px] font-semibold text-neutral-700 tabular-nums">{c.score != null ? ((c.score / c.max) * c.weight).toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-neutral-50 border-t-2 border-neutral-200">
              <td className="ps-3 pe-2 py-2.5 text-end text-[12px] font-semibold text-neutral-600" colSpan={3}>{t('Total weighted score', 'إجمالي الدرجة المرجّحة')}</td>
              <td className="px-2 py-2.5 text-end text-[14px] font-bold tabular-nums text-neutral-900">{weighted.toFixed(1)}</td>
            </tr></tfoot>
          </table>
        </div>
      </Section>
      {allScored ? (
        <InfoBanner variant={pass ? 'success' : 'warning'}>
          {pass
            ? t(`Score ${weighted.toFixed(1)} meets the ${task.passThreshold}% passing threshold.`, `الدرجة ${weighted.toFixed(1)} تحقق حد النجاح ${task.passThreshold}%.`)
            : t(`Score ${weighted.toFixed(1)} is below the ${task.passThreshold}% passing threshold.`, `الدرجة ${weighted.toFixed(1)} أقل من حد النجاح ${task.passThreshold}%.`)}
        </InfoBanner>
      ) : (
        <InfoBanner variant="info">{t('Score every criterion to submit the evaluation.', 'قيّم جميع المعايير لتتمكن من إرسال التقييم.')}</InfoBanner>
      )}
    </div>
  );
}

// ── Commercial Evaluation ────────────────────────────────────────────────────
function CommercialEvalBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const lines = task.commercialLines ?? [];
  const total = lines.reduce((s, l) => s + (l.unitPrice ?? 0) * l.qty, 0);
  if (!task.commercialReleased) {
    return <InfoBanner variant="warning">{t('Commercial offers are sealed. Prices become visible only after the authorized bid-opening step.', 'العروض التجارية مغلقة. تظهر الأسعار فقط بعد خطوة فتح العروض المصرّح بها.')}</InfoBanner>;
  }
  return (
    <div className="space-y-4">
      <Section title={t('Commercial offer', 'العرض التجاري')}>
        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="text-start ps-3 pe-2 py-2 font-medium">{t('Item', 'البند')}</th>
              <th className="px-2 py-2 font-medium w-16 text-center">{t('Qty', 'الكمية')}</th>
              <th className="px-2 py-2 font-medium w-28 text-end">{t('Unit price', 'سعر الوحدة')}</th>
              <th className="px-2 py-2 font-medium w-32 text-end">{t('Line total', 'إجمالي البند')}</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {lines.map((l) => (
                <tr key={l.id} className="bg-white">
                  <td className="ps-3 pe-2 py-2 text-[12.5px] text-neutral-800">{isAr ? l.itemAr : l.itemEn}</td>
                  <td className="px-2 py-2 text-center text-[12px] text-neutral-600">{l.qty} {l.unit}</td>
                  <td className="px-2 py-2 text-end text-[12px] text-neutral-700 tabular-nums" dir="ltr">{l.unitPrice != null ? fmtSAR(l.unitPrice) : '—'}</td>
                  <td className="px-2 py-2 text-end text-[12.5px] font-semibold text-neutral-800 tabular-nums" dir="ltr">{l.unitPrice != null ? fmtSAR(l.unitPrice * l.qty) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-neutral-50 border-t-2 border-neutral-200">
              <td className="ps-3 pe-2 py-2.5 text-end text-[12px] font-semibold text-neutral-600" colSpan={3}>{t('Total offer value', 'إجمالي قيمة العرض')}</td>
              <td className="px-2 py-2.5 text-end text-[14px] font-bold tabular-nums text-neutral-900" dir="ltr">{fmtSAR(total)}</td>
            </tr></tfoot>
          </table>
        </div>
      </Section>
      <InfoBanner variant="info">{t('Confirm the commercial checks, then complete the evaluation.', 'أكّد الفحوصات التجارية ثم أكمل التقييم.')}</InfoBanner>
    </div>
  );
}

// ── Validation ───────────────────────────────────────────────────────────────
function ValidationBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { resolveCheck } = useInbox();
  const checks = task.validationChecks ?? [];
  return (
    <div className="space-y-3">
      {checks.map((v) => {
        const tone = v.outcome === 'pass' ? 'success' : v.outcome === 'fail' ? 'error' : 'neutral';
        const Icon = v.outcome === 'pass' ? CheckCircleIcon : v.outcome === 'fail' ? ExclamationCircleIcon : InfoIcon;
        return (
          <div key={v.id} className={`rounded-lg border px-3.5 py-3 ${tone === 'success' ? 'border-success-200 bg-success-50/40' : tone === 'error' ? 'border-error-200 bg-error-50/40' : 'border-neutral-200 bg-white'}`}>
            <div className="flex items-start gap-2.5">
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tone === 'success' ? 'text-success-600' : tone === 'error' ? 'text-error-600' : 'text-neutral-400'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-neutral-800">{tb(v.label, isAr)}</p>
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-[12px]">
                  <span className="text-neutral-500">{t('Current', 'الحالي')}: <span className="text-neutral-800 font-medium" dir="ltr">{v.current}</span></span>
                  <span className="text-neutral-500">{t('Expected', 'المتوقع')}: <span className="text-neutral-800 font-medium" dir="ltr">{v.expected}</span></span>
                </div>
                {v.outcome === 'fail' && v.remediation && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-[12px] text-error-700 flex-1 min-w-[200px]">{tb(v.remediation, isAr)}</p>
                    <Button size="sm" variant="secondary" onClick={() => resolveCheck(task.id, v.id)}>{t('Mark resolved', 'تمييز كمُعالَج')}</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Clarification / Returned Work ────────────────────────────────────────────
function ClarificationBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { addComment } = useInbox();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-error-200 bg-error-50/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="w-4 h-4 text-error-600" />
          <p className="text-[13px] font-semibold text-error-800">
            {t('Returned by', 'أُعيد بواسطة')} {task.returnedBy ? (isAr ? (task.returnedBy.nameAr ?? task.returnedBy.name) : task.returnedBy.name) : '—'}
          </p>
        </div>
        {task.returnReason && <p className="mt-1.5 text-[13px] text-error-800">{tb(task.returnReason, isAr)}</p>}
        {task.returnIssues && task.returnIssues.length > 0 && (
          <ul className="mt-2 space-y-1">
            {task.returnIssues.map((is, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] text-error-700"><span className="mt-1.5 w-1 h-1 rounded-full bg-error-500 flex-shrink-0" />{tb(is, isAr)}</li>
            ))}
          </ul>
        )}
      </div>
      {task.originalValues && (
        <Section title={t('Your original submission', 'ما قدّمته سابقاً')}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {task.originalValues.map((r, i) => (
              <div key={i}>
                <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{tb(r.label, isAr)}</dt>
                <dd className="text-[13px] text-neutral-800 font-medium">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      <Section title={t('Your correction / response', 'تصحيحك / ردّك')}>
        <Textarea rows={3} placeholder={t('Describe the corrections you made before resubmitting…', 'اشرح التصحيحات التي أجريتها قبل إعادة التقديم…')}
          onBlur={(e) => { if (e.target.value.trim()) { addComment(task.id, `[response] ${e.target.value.trim()}`); e.target.value = ''; } }} />
      </Section>
    </div>
  );
}

// ── Document Submission ──────────────────────────────────────────────────────
function DocumentBody({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { uploadDoc } = useInbox();
  const docs = task.requiredDocs ?? [];
  return (
    <div className="space-y-2.5">
      {docs.map((d) => (
        <div key={d.id} className={`rounded-lg border px-3.5 py-3 flex items-center gap-3 ${d.uploaded ? 'border-success-200 bg-success-50/40' : 'border-neutral-200 bg-white'}`}>
          <DocumentIcon className={`w-5 h-5 flex-shrink-0 ${d.uploaded ? 'text-success-600' : 'text-neutral-400'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-neutral-800">{tb(d.label, isAr)}{d.mandatory && <span className="text-error-500 ms-1">*</span>}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">{t('Accepted', 'المقبول')}: {d.formats}{d.uploaded ? ` · ${d.uploaded}` : ''}</p>
          </div>
          <Button size="sm" variant={d.uploaded ? 'secondary' : 'primary'} onClick={() => uploadDoc(task.id, d.id, `${d.id}_${task.entity.ref}.pdf`)}>
            {d.uploaded ? t('Replace', 'استبدال') : t('Upload', 'رفع')}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Section helper + registry ────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export function TaskBody({ task }: { task: Task }) {
  const { isAr } = useLanguage();
  const t = useT();
  switch (task.type) {
    case 'approval': return <ApprovalBody task={task} isAr={isAr} t={t} />;
    case 'review': return <ReviewBody task={task} isAr={isAr} t={t} />;
    case 'data-collection': return <DataCollectionBody task={task} isAr={isAr} t={t} />;
    case 'technical-evaluation': return <TechnicalEvalBody task={task} isAr={isAr} t={t} />;
    case 'commercial-evaluation': return <CommercialEvalBody task={task} isAr={isAr} t={t} />;
    case 'validation': return <ValidationBody task={task} isAr={isAr} t={t} />;
    case 'clarification': return <ClarificationBody task={task} isAr={isAr} t={t} />;
    case 'document-submission': return <DocumentBody task={task} isAr={isAr} t={t} />;
    case 'etimad-review': return <EtimadReviewBody task={task} isAr={isAr} t={t} />;
    default: return null;
  }
}
