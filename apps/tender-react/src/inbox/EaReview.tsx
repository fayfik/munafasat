// Enterprise Architecture task — Required action. Shows only the sections EA owns
// (scope, technical requirements, licences & quantities, and the technical
// standards by group). Each section is Accepted or Commented. Commercial sections
// are collapsed "for reference".
import { useState } from 'react';
import type { Task } from './types';
import { CheckIcon, ChevronDownIcon, PencilIcon } from '../components/Icons';
import { stdById, eaScope, type Answers } from '../lib/eaStandards';
import { DeploymentHero, ProjectProfile, StandardsList } from '../components/TechStandards';
import { Fragment } from 'react';
import BoqLineDetails, { BoqViewButton, useBoqOpen, viewFromRfpLine, rfpCostCenter } from '../components/BoqLineDetails';
import { eaSections, LICENCE_RX, type EaSection } from './eaSections';

type T = (en: string, ar: string) => string;
type Dec = { state: 'accepted' | 'comment'; comment?: string };
const sar = (n: number) => 'SAR ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function EaReview({ task, isAr, t, readOnly, onDecide, onAcceptAll }: {
  task: Task; isAr: boolean; t: T; readOnly?: boolean;
  onDecide: (id: string, d: Dec | null) => void;
  onAcceptAll: (ids: string[]) => void;
}) {
  const rfp = task.rfp!;
  const secs = eaSections(task);
  const dec = task.eaDecisions ?? {};
  const [commenting, setCommenting] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [refOpen, setRefOpen] = useState(false);
  const boqOpen = useBoqOpen();
  const boqGrand = rfp.boq.reduce((n, l) => n + (Number(l.qty) || 1) * l.unitPrice, 0);
  const L = (en?: string, ar?: string) => (isAr ? ar ?? en ?? '' : en ?? '');
  const done = secs.filter((s) => dec[s.id]).length;
  const comments = secs.filter((s) => dec[s.id]?.state === 'comment').length;
  const why = eaScope({ texts: rfp.boq.map((l) => `${l.itemEn} ${l.descEn ?? ''}`), department: task.requester.dept ?? '' });

  const body = (s: EaSection) => {
    if (s.kind === 'scope') return (
      <div className="space-y-2.5">
        <p className="text-[13px] text-neutral-700 leading-relaxed">{L(rfp.scopeEn, rfp.scopeAr)}</p>
        {rfp.scopeBlocks?.map((b, i) => (
          <div key={i}><p className="text-[12px] font-semibold text-neutral-600">{L(b.headEn, b.headAr)}</p>
            <ul className="mt-0.5 list-disc ps-5 text-[12.5px] text-neutral-700">{(isAr ? b.itemsAr : b.itemsEn).map((x, j) => <li key={j}>{x}</li>)}</ul></div>
        ))}
      </div>
    );
    if (s.kind === 'tech') return (
      <ul className="space-y-1.5">{rfp.techRequirements!.map((r, i) => (
        <li key={i} className="text-[12.5px] text-neutral-700"><span className="font-semibold text-neutral-800">{L(r.reqEn, r.reqAr)}</span> — {L(r.descEn, r.descAr)}</li>
      ))}</ul>
    );
    if (s.kind === 'licences') return (
      <div>
        <table className="w-full text-start text-[12.5px]">
          <thead><tr className="text-[11px] text-neutral-500"><th className="text-start font-medium py-1">{t('BOQ item', 'البند')}</th><th className="text-end font-medium py-1">{t('Quantity', 'الكمية')}</th><th className="text-end font-medium py-1">{t('Amount', 'المبلغ')}</th><th className="w-9" /></tr></thead>
          <tbody>{rfp.boq.map((l, i) => ({ l, i })).filter(({ l }) => LICENCE_RX.test(`${l.itemEn} ${l.descEn ?? ''}`)).map(({ l, i }) => (
            <Fragment key={i}><tr className="border-t border-neutral-100"><td className="py-1.5 pe-3"><span className="text-neutral-400 me-1.5">{i + 1}.</span>{L(l.itemEn, l.itemAr)}<span className="block text-[11.5px] text-neutral-500">{L(l.descEn, l.descAr)}</span></td>
              <td className="py-1.5 text-end font-semibold tabular-nums whitespace-nowrap">{l.qty} {l.unit}</td><td className="py-1.5 text-end tabular-nums whitespace-nowrap" dir="ltr">{sar((Number(l.qty) || 1) * l.unitPrice)}</td>
              <td className="py-1 ps-1 text-end"><BoqViewButton index={i} open={boqOpen.isOpen(i)} onClick={() => boqOpen.toggle(i)} label={t('View item details', 'عرض تفاصيل البند')} /></td></tr>
              {boqOpen.isOpen(i) && <tr><td colSpan={4} className="p-0 pb-1"><div className="rounded-lg overflow-hidden border border-neutral-100"><BoqLineDetails line={viewFromRfpLine(l, isAr, t, rfpCostCenter(rfp))} isAr={isAr} t={t} /></div></td></tr>}</Fragment>
          ))}</tbody>
        </table>
        <p className="mt-1.5 text-[11.5px] text-neutral-500">{t('Check the quantities against what was agreed in the assessment — quantities above it affect the budget.', 'تحقق من الكميات مقابل ما تم الاتفاق عليه في التقييم — الكميات الأعلى تؤثر على الميزانية.')}</p>
      </div>
    );
    const std = (rfp.techStandards ?? []).filter((x) => stdById(x.id)?.group === s.group);
    if (s.group === 'hosting') return (
      <div className="space-y-4" data-ea-hosting>
        {rfp.deploymentModel && <DeploymentHero deployment={rfp.deploymentModel} answers={rfp.techAnswers as Answers | undefined} isAr={isAr} t={t} compact />}
        {rfp.techAnswers && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">{t('Requester’s answers about the project', 'إجابات مقدّم الطلب عن المشروع')}</p>
            <ProjectProfile answers={rfp.techAnswers as Answers} isAr={isAr} t={t} />
          </div>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">{t(`${std.length} hosting standards`, `${std.length} معايير استضافة`)}</p>
          <StandardsList rows={std} isAr={isAr} t={t} />
        </div>
      </div>
    );
    return <StandardsList rows={std} isAr={isAr} t={t} />;
  };

  return (
    <div className="space-y-5" data-ea-review>
      <div className="rounded-xl border border-[#C9DBEC] bg-gradient-to-br from-[#F3F8FC] to-white px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="min-w-[280px] flex-1">
          <p className="text-[14px] font-bold text-neutral-900">{t('Review the technical sections', 'مراجعة الأقسام التقنية')}</p>
          <p className="text-[12.5px] text-neutral-600 mt-0.5">{t('Only the sections EA owns are shown. Accept each one, or add a comment for the requester. Commercial sections are collapsed below for reference.', 'تُعرض الأقسام التي تملكها البنية المؤسسية فقط. اقبل كل قسم أو أضف ملاحظة لمقدّم الطلب. الأقسام التجارية مطوية أدناه للاطلاع.')}</p>
          {why.required && <p className="mt-1.5 text-[12px] text-[#21507A]" data-ea-task-why>{t('Why EA reviews this request', 'سبب مراجعة البنية المؤسسية')}: {why.reasons.map((r) => (isAr ? r.ar : r.en)).join(' · ')}</p>}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-48 rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${(done / Math.max(1, secs.length)) * 100}%` }} /></div>
            <span className="text-[12px] font-semibold text-neutral-700" data-ea-progress={`${done}/${secs.length}`}>{t(`${done} of ${secs.length} sections reviewed`, `${done} من ${secs.length} أقسام تمت مراجعتها`)}{comments ? t(` · ${comments} with comments`, ` · ${comments} بملاحظات`) : ''}</span>
          </div>
        </div>
        {!readOnly && done < secs.length && (
          <button type="button" data-ea-all onClick={() => onAcceptAll(secs.filter((s) => !dec[s.id]).map((s) => s.id))}
            className="h-9 px-3.5 rounded-lg border border-success-300 bg-white text-success-700 text-[12.5px] font-semibold hover:bg-success-50 inline-flex items-center gap-1.5"><CheckIcon className="w-4 h-4" />{t('Accept all remaining', 'قبول جميع الأقسام المتبقية')}</button>
        )}
      </div>

      {secs.map((s) => {
        const d = dec[s.id];
        const isC = commenting === s.id;
        return (
          <section key={s.id} data-ea-section={s.id} data-state={d?.state ?? ''} className={`rounded-xl border bg-white ${d?.state === 'comment' ? 'border-warning-300' : d ? 'border-success-200' : 'border-neutral-200'}`}>
            <header className="flex items-center gap-3 px-5 py-3 border-b border-neutral-100">
              <h4 className="flex-1 text-[14px] font-semibold text-neutral-900">{isAr ? s.ar : s.en}</h4>
              {d?.state === 'accepted' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200"><CheckIcon className="w-3 h-3" />{t('Accepted', 'مقبول')}</span>}
              {d?.state === 'comment' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-50 text-warning-800 border border-warning-200"><PencilIcon className="w-3 h-3" />{t('Comment', 'ملاحظة')}</span>}
              {!readOnly && (d
                ? <button type="button" onClick={() => onDecide(s.id, null)} className="text-[11.5px] font-medium text-neutral-500 hover:text-neutral-800 hover:underline">{t('Undo', 'تراجع')}</button>
                : !isC && <span className="inline-flex items-center gap-1.5">
                    <button type="button" data-ea-accept={s.id} onClick={() => onDecide(s.id, { state: 'accepted' })} className="h-8 px-3 rounded-lg border border-success-300 bg-white text-success-700 text-[12px] font-semibold hover:bg-success-50 inline-flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />{t('Accept', 'قبول')}</button>
                    <button type="button" data-ea-comment={s.id} onClick={() => { setCommenting(s.id); setDraft(''); }} className="h-8 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50 inline-flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" />{t('Comment', 'ملاحظة')}</button>
                  </span>)}
            </header>
            <div className="px-5 py-3.5">{body(s)}</div>
            {d?.state === 'comment' && <p className="mx-5 mb-3.5 rounded-lg bg-warning-50 border border-warning-200 px-3 py-2 text-[12.5px] text-warning-900">{d.comment}</p>}
            {isC && (
              <div className="mx-5 mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <textarea data-ea-comment-text={s.id} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus
                  placeholder={t('What should the requester change in this section?', 'ما الذي يجب على مقدّم الطلب تغييره في هذا القسم؟')}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[13px]" />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setCommenting(null)} className="h-8 px-3 rounded-lg border border-neutral-300 bg-white text-[12.5px] font-medium text-neutral-600">{t('Cancel', 'إلغاء')}</button>
                  <button type="button" data-ea-save={s.id} disabled={!draft.trim()} onClick={() => { onDecide(s.id, { state: 'comment', comment: draft.trim() }); setCommenting(null); }}
                    className="h-8 px-3.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold disabled:opacity-40">{t('Save comment', 'حفظ الملاحظة')}</button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* Outside EA scope — for reference */}
      <section className="rounded-xl border border-neutral-200 bg-white" data-ea-outside>
        <button type="button" onClick={() => setRefOpen((v) => !v)} aria-expanded={refOpen} className="w-full flex items-center gap-3 px-5 py-3 text-start hover:bg-neutral-50">
          <span className="flex-1"><span className="block text-[13px] font-semibold text-neutral-700">{t('Outside EA scope — for reference', 'خارج نطاق البنية المؤسسية — للاطلاع')}</span>
            <span className="block text-[12px] text-neutral-500">{t('Payment schedule, evaluation, project delivery & handover (PMO), prices.', 'جدول الدفعات والتقييم وتنفيذ المشروع والتسليم (مكتب إدارة المشاريع) والأسعار.')}</span></span>
          <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform ${refOpen ? 'rotate-180' : ''}`} />
        </button>
        {refOpen && (
          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[12.5px] text-neutral-600">
            <div><p className="font-semibold text-neutral-700 mb-1">{t('Payment schedule', 'جدول الدفعات')}</p><ul className="space-y-0.5">{rfp.payment.map((p, i) => <li key={i}>{L(p.stageEn, p.stageAr)} — {p.pct}%</li>)}</ul></div>
            <div><p className="font-semibold text-neutral-700 mb-1">{t('Evaluation', 'التقييم')}</p><ul className="space-y-0.5">{rfp.evaluation.map((e, i) => <li key={i}>{L(e.criterionEn, e.criterionAr)} — {e.weight}%</li>)}</ul></div>
            <div><p className="font-semibold text-neutral-700 mb-1">{t('Project delivery & handover (PMO)', 'تنفيذ المشروع والتسليم')}</p><ul className="space-y-0.5">{(rfp.techStandards ?? []).filter((x) => stdById(x.id)?.group === 'delivery').map((x) => <li key={x.id}>{L(stdById(x.id)!.en, stdById(x.id)!.ar)}</li>)}</ul></div>
          </div>
        )}
      </section>
    </div>
  );
}
