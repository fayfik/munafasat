// Manual build — the Cyber Security review (Kholoud's points 1, 2, 6 and 8).
// Opens on what Cyber reviews — the Scope of Work, technical requirements and integrations,
// not the BOQ. The reviewer sets the data classification; the requirements that apply come
// from the central library and each is shown as in the request, missing (add it), or not
// applicable. Each requirement can carry its own comment, sent with the decision.
import { useState } from 'react';
import { useInbox } from './store';
import { cyberItems } from './cyber';
import { CLASSIFICATIONS, reqLabel, type CyberReq } from '../lib/cyberLibrary';
import type { Task } from './types';
import { Button } from '../components/ui';

type T = (en: string, ar: string) => string;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export default function CyberReview({ task, isAr, t, readOnly, onOpenRequest }: { task: Task; isAr: boolean; t: T; readOnly: boolean; onOpenRequest: () => void }) {
  const { setTaskData, mutateTasks, addComment, viewer } = useInbox();
  const cr = task.cyberReview!;
  const rfp = task.rfp;
  const [showAll, setShowAll] = useState(false);
  const [commentOn, setCommentOn] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const items = cyberItems(task);
  const scope = rfp?.scopeEn ?? '';
  const scopeWords = words(scope);
  const docs = rfp?.documents ?? [];
  const thin = scopeWords < 120;
  const integrations = scope.split(/(?<=[.;])\s+|\n+/).filter((s) => /integrat|interface|api\b|sso|single sign|connect/i.test(s)).slice(0, 4);
  const techReqs = rfp?.techRequirements ?? [];
  const reqComments = (id: string) => task.activity.filter((a) => a.kind === 'comment' && a.anchor?.id === `cyber-${id}`);
  const missing = items.filter((x) => x.state === 'missing').length;

  const setStatus = (id: string, v: 'added' | 'na' | null) => {
    const status = { ...cr.status }; if (v) status[id] = v; else delete status[id];
    setTaskData(task.id, { cyberReview: { ...cr, status } });
  };
  // Adding a requirement writes it into the request for every task of this request, so the
  // requester and the other reviewers see it in the technical requirements.
  const addReq = (r: CyberReq) => {
    const row = { reqEn: reqLabel(r), reqAr: `الأمن السيبراني — ${r.titleAr}`, descEn: r.textEn, descAr: r.textEn };
    const by = viewer ?? task.assignee;
    mutateTasks((xs) => xs.map((x) => {
      const same = x.id === task.id || (!!task.flow && x.flow?.requestNo === task.flow.requestNo);
      if (!same || !x.rfp || (x.rfp.techRequirements ?? []).some((q) => q.reqEn === row.reqEn)) return x;
      const next = { ...x, rfp: { ...x.rfp, techRequirements: [...(x.rfp.techRequirements ?? []), row] } };
      return x.id === task.id ? { ...next, state: next.state === 'available' ? 'in-progress' : next.state, cyberReview: { ...cr, status: { ...cr.status, [r.id]: 'added' } },
        activity: [...next.activity, { id: `cy_${Date.now()}`, at: new Date().toISOString(), kind: 'system', actor: by, system: { en: `Requirement added by Cyber: ${r.titleEn}`, ar: `أضاف الأمن السيبراني متطلباً: ${r.titleAr}` } }] } : next;
    }));
  };
  const undoAdd = (r: CyberReq) => {
    mutateTasks((xs) => xs.map((x) => {
      const same = x.id === task.id || (!!task.flow && x.flow?.requestNo === task.flow.requestNo);
      if (!same || !x.rfp) return x;
      const next = { ...x, rfp: { ...x.rfp, techRequirements: (x.rfp.techRequirements ?? []).filter((q) => q.reqEn !== reqLabel(r)) } };
      if (x.id !== task.id) return next;
      const status = { ...cr.status }; delete status[r.id];
      return { ...next, cyberReview: { ...cr, status } };
    }));
  };

  return (
    <div className="space-y-5" data-testid="cyber-review">
      {/* Review focus — what Cyber reads: scope, integrations, technical requirements */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="review-focus">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[14px] font-bold text-neutral-900">{t('Review focus', 'محور المراجعة')}</p>
            <p className="text-[12px] text-neutral-500">{t('Scope of Work, integrations and technical requirements. The BOQ is in the full request.', 'نطاق العمل والتكاملات والمتطلبات الفنية. جدول الكميات في الطلب الكامل.')}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onOpenRequest}>{t('Open full request', 'فتح الطلب كاملاً')}</Button>
        </div>
        {thin && (
          <div className="mt-3 rounded-lg border border-warning-200 bg-warning-50 px-3.5 py-2.5 text-[12.5px] text-warning-900" data-testid="thin-scope">
            <span className="font-semibold">{t(`The Scope of Work is short (${scopeWords} words).`, `نطاق العمل قصير (${scopeWords} كلمة).`)}</span>{' '}
            {docs.length ? t(`${docs.length} supporting document${docs.length > 1 ? 's are' : ' is'} attached — the detail may be there. Attachments support the form; ask for the scope in the form if you need it.`, `مرفق ${docs.length} مستند — قد تكون التفاصيل فيه. المرفقات تدعم النموذج؛ اطلب النطاق في النموذج إن احتجته.`)
              : t('Ask the requester for a fuller scope if you can’t assess it.', 'اطلب من مقدم الطلب نطاقاً أوفى إن تعذر التقييم.')}
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Scope of Work', 'نطاق العمل')}</p>
            <p className={`mt-1 text-[13px] text-neutral-800 leading-relaxed whitespace-pre-line ${showAll ? '' : 'line-clamp-6'}`}>{scope || t('No scope written in the form.', 'لا يوجد نطاق مكتوب في النموذج.')}</p>
            {scope.length > 420 && <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-1 text-[12px] font-semibold text-brand-700 hover:underline">{showAll ? t('Show less', 'عرض أقل') : t('Show all', 'عرض الكل')}</button>}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Integrations mentioned', 'التكاملات المذكورة')}</p>
              {integrations.length ? <ul className="mt-1 space-y-1">{integrations.map((s, i) => <li key={i} className="text-[12.5px] text-neutral-700 leading-snug">• {s.trim()}</li>)}</ul>
                : <p className="mt-1 text-[12.5px] text-neutral-500">{t('None found in the scope.', 'لم يُذكر أي تكامل في النطاق.')}</p>}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Technical requirements', 'المتطلبات الفنية')} · {techReqs.length}</p>
              <ul className="mt-1 space-y-1">{techReqs.slice(0, 6).map((r, i) => <li key={i} className="text-[12.5px] text-neutral-700 leading-snug truncate">• {isAr ? r.reqAr : r.reqEn}</li>)}</ul>
            </div>
            <p className="text-[12px] text-neutral-500">{t(`${docs.length} supporting document${docs.length === 1 ? '' : 's'}`, `${docs.length} مستند داعم`)}</p>
          </div>
        </div>
      </section>

      {/* Data classification */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="classification" data-missing={!cr.classification ? 'true' : undefined}>
        <p className="text-[14px] font-bold text-neutral-900">{t('Data classification', 'تصنيف البيانات')}</p>
        <p className="text-[12px] text-neutral-500">{t('Sets which Cybersecurity requirements apply.', 'يحدد متطلبات الأمن السيبراني المطبقة.')}{task.cyberReview?.classification === undefined ? '' : ''}</p>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t('Data classification', 'تصنيف البيانات')}>
          {CLASSIFICATIONS.map((c) => {
            const on = cr.classification === c.en;
            return (
              <button key={c.en} type="button" role="radio" aria-checked={on} disabled={readOnly}
                onClick={() => setTaskData(task.id, { cyberReview: { ...cr, classification: c.en } })}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors ${on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'} disabled:opacity-60`}>
                {isAr ? c.ar : c.en}
              </button>
            );
          })}
        </div>
      </section>

      {/* Library requirements */}
      {cr.classification && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="cyber-requirements">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[14px] font-bold text-neutral-900">{t('Cybersecurity requirements', 'متطلبات الأمن السيبراني')}</p>
              <p className="text-[12px] text-neutral-500">{t(`From the requirements library, for ${cr.classification} data and this project type. Each must be in the request, added by you, or not applicable.`, `من مكتبة المتطلبات لبيانات ${cr.classification} ونوع المشروع. يجب أن يكون كل متطلب في الطلب أو تضيفه أو لا ينطبق.`)}</p>
            </div>
            <span className={`text-[12px] font-semibold rounded-full px-2.5 py-0.5 border ${missing ? 'bg-warning-50 text-warning-700 border-warning-100' : 'bg-success-50 text-success-700 border-success-100'}`}>{missing ? t(`${missing} missing`, `${missing} ناقص`) : t('All covered', 'مكتملة')}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {items.map(({ req, state }) => {
              const cs = reqComments(req.id);
              return (
                <li key={req.id} data-missing={state === 'missing' ? 'true' : undefined} data-req={req.id}
                  className={`rounded-lg border px-3.5 py-3 ${state === 'missing' ? 'border-warning-200 bg-white' : state === 'na' ? 'border-neutral-200 bg-neutral-50' : 'border-success-200 bg-success-50/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-[13px] font-semibold ${state === 'na' ? 'text-neutral-500' : 'text-neutral-900'}`}>{isAr ? req.titleAr : req.titleEn}</p>
                      <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">{req.textEn}</p>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 ${state === 'missing' ? 'bg-warning-100 text-warning-800' : state === 'na' ? 'bg-neutral-200 text-neutral-600' : 'bg-success-100 text-success-800'}`}>
                      {state === 'missing' ? t('Missing', 'ناقص') : state === 'na' ? t('Not applicable', 'لا ينطبق') : state === 'added' ? t('Added by Cyber', 'أضافه الأمن السيبراني') : t('In the request', 'في الطلب')}
                    </span>
                  </div>
                  {!readOnly && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {state === 'missing' && <Button size="sm" variant="primary" data-testid="add-req" onClick={() => addReq(req)}>{t('Add to request', 'إضافة إلى الطلب')}</Button>}
                      {state === 'missing' && <Button size="sm" variant="secondary" data-testid="na-req" onClick={() => setStatus(req.id, 'na')}>{t('Not applicable', 'لا ينطبق')}</Button>}
                      {state === 'added' && <Button size="sm" variant="secondary" onClick={() => undoAdd(req)}>{t('Undo', 'تراجع')}</Button>}
                      {state === 'na' && <Button size="sm" variant="secondary" onClick={() => setStatus(req.id, null)}>{t('Undo', 'تراجع')}</Button>}
                      <button type="button" data-testid="req-comment" onClick={() => { setCommentOn(commentOn === req.id ? null : req.id); setDraft(''); }} className="text-[12px] font-semibold text-[#2A6193] hover:underline">{t('Comment', 'تعليق')}{cs.length ? ` (${cs.length})` : ''}</button>
                    </div>
                  )}
                  {cs.map((c) => <p key={c.id} className="mt-2 text-[12.5px] text-neutral-700 bg-white border border-neutral-200 rounded-md px-2.5 py-1.5 whitespace-pre-line">{c.text}{c.draft && <span className="ms-2 text-[10.5px] font-semibold text-warning-700">{t('Draft — sent with your decision', 'مسودة — تُرسل مع قرارك')}</span>}</p>)}
                  {commentOn === req.id && (
                    <div className="mt-2 flex items-end gap-2">
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={t('What should change in the request? No length limit.', 'ما الذي يجب تغييره في الطلب؟ دون حد للطول.')}
                        className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
                      <Button size="sm" variant="secondary" disabled={!draft.trim()} onClick={() => { addComment(task.id, draft, { id: `cyber-${req.id}`, label: { en: req.titleEn, ar: req.titleAr } }); setCommentOn(null); setDraft(''); }}>{t('Save draft', 'حفظ مسودة')}</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
