// Manual build — the Cyber Security review (Kholoud's points 1, 2 and 8).
// Opens on what Cyber reviews (Scope of Work and technical requirements, not the BOQ) and on
// the Cybersecurity requirements the requester selected. "Modify" opens the classification
// panel: the reviewer confirms or changes the data classification, adds requirements the request
// needs, or revokes one the requester added — with a reason everyone can see. Changes are
// pending until the decision is sent. Nothing is detected automatically.
import { useState } from 'react';
import { useInbox } from './store';
import { requestReqs, rowState, usuallyRequired } from './cyber';
import { CYBER_LIBRARY, CLASSIFICATIONS, type CyberReq } from '../lib/cyberLibrary';
import type { Task } from './types';
import { Button } from '../components/ui';

type T = (en: string, ar: string) => string;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const clsAr = (en?: string) => CLASSIFICATIONS.find((c) => c.en === en)?.ar ?? en ?? '';

export default function CyberReview({ task, isAr, t, readOnly, onOpenRequest }: { task: Task; isAr: boolean; t: T; readOnly: boolean; onOpenRequest: () => void }) {
  const { setTaskData } = useInbox();
  const cr = task.cyberReview!;
  const rfp = task.rfp;
  const [showAll, setShowAll] = useState(false);
  const [panel, setPanel] = useState(false);
  const scope = rfp?.scopeEn ?? '';
  const scopeWords = words(scope);
  const docs = rfp?.documents ?? [];
  const techReqs = (rfp?.techRequirements ?? []).filter((r) => !r.removedBy);
  const pend = cr.pending ?? { add: [], revoke: [] };
  const inRequest = requestReqs(task);
  const pendingN = pend.add.length + pend.revoke.length;
  const setPend = (p: typeof pend) => setTaskData(task.id, { cyberReview: { ...cr, pending: p } });
  const cls = cr.classification ?? cr.requesterClass;

  return (
    <div className="space-y-5" data-testid="cyber-review">
      {/* Review focus — what Cyber reads: the Scope of Work and the technical requirements */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="review-focus">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[14px] font-bold text-neutral-900">{t('Review focus', 'محور المراجعة')}</p>
            <p className="text-[12px] text-neutral-500">{t('Scope of Work and technical requirements. The BOQ is in the full request.', 'نطاق العمل والمتطلبات الفنية. جدول الكميات في الطلب الكامل.')}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onOpenRequest}>{t('Open full request', 'فتح الطلب كاملاً')}</Button>
        </div>
        {scopeWords < 120 && (
          <div className="mt-3 rounded-lg border border-warning-200 bg-warning-50 px-3.5 py-2.5 text-[12.5px] text-warning-900" data-testid="thin-scope">
            <span className="font-semibold">{t(`The Scope of Work is short (${scopeWords} words).`, `نطاق العمل قصير (${scopeWords} كلمة).`)}</span>{' '}
            {docs.length ? t(`${docs.length} supporting document${docs.length > 1 ? 's are' : ' is'} attached — the detail may be there. Attachments support the form; ask for the scope in the form if you need it.`, `مرفق ${docs.length} مستند — قد تكون التفاصيل فيه. اطلب النطاق في النموذج إن احتجته.`)
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Technical requirements', 'المتطلبات الفنية')} · {techReqs.length}</p>
              <ul className="mt-1 space-y-1">{techReqs.filter((r) => !r.reqEn.startsWith('Cybersecurity —')).slice(0, 6).map((r, i) => <li key={i} className="text-[12.5px] text-neutral-700 leading-snug truncate">• {isAr ? r.reqAr : r.reqEn}</li>)}</ul>
            </div>
            <p className="text-[12px] text-neutral-500">{t(`${docs.length} supporting document${docs.length === 1 ? '' : 's'}`, `${docs.length} مستند داعم`)}</p>
          </div>
        </div>
      </section>

      {/* Cyber security — the requester's selection, modified by the reviewer */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm" data-testid="cyber-security" data-missing={!cr.classification ? 'true' : undefined}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-neutral-900">{t('Cyber security', 'الأمن السيبراني')}</p>
            <p className="text-[12.5px] text-neutral-600 mt-1" data-testid="classification-line">
              {t('Data classification:', 'تصنيف البيانات:')}{' '}
              <span className="font-semibold text-neutral-900">{cls ? (isAr ? clsAr(cls) : cls) : t('not set', 'غير محدد')}</span>
              {cr.classification
                ? <span className="ms-1.5 text-success-700 font-semibold">· {t('confirmed', 'مؤكد')}</span>
                : <span className="ms-1.5 text-neutral-500">· {cr.requesterClass ? t('selected by the requester', 'اختاره مقدم الطلب') : t('the requester didn’t select one', 'لم يحدده مقدم الطلب')}</span>}
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {!cr.classification && cr.requesterClass && <Button size="sm" variant="secondary" data-testid="confirm-class" onClick={() => setTaskData(task.id, { cyberReview: { ...cr, classification: cr.requesterClass } })}>{t('Confirm classification', 'تأكيد التصنيف')}</Button>}
              <Button size="sm" variant="primary" data-testid="modify" onClick={() => setPanel(true)}>{t('Modify', 'تعديل')}</Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Cybersecurity requirements in the request', 'متطلبات الأمن السيبراني في الطلب')}</p>
        {inRequest.length === 0 && pend.add.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] text-neutral-500" data-testid="no-reqs">{t('The requester didn’t select any. Use Modify to add the ones this request needs.', 'لم يحدد مقدم الطلب أي متطلب. استخدم تعديل لإضافة ما يحتاجه الطلب.')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5" data-testid="request-reqs">
            {inRequest.map(({ req, state, reason }) => {
              const revoking = pend.revoke.find((x) => x.id === req.id);
              const gone = state === 'removed' || !!revoking;
              return (
                <li key={req.id} className={`rounded-lg border px-3 py-2 ${gone ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-[12.5px] font-semibold ${gone ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>{isAr ? req.titleAr : req.titleEn}</p>
                    <span className={`flex-shrink-0 text-[10.5px] font-semibold rounded-full px-2 py-0.5 ${revoking ? 'bg-warning-100 text-warning-800' : state === 'removed' ? 'bg-neutral-200 text-neutral-600' : state === 'cyber' ? 'bg-[#EEF4FB] text-[#2A6193]' : 'bg-success-50 text-success-700'}`}>
                      {revoking ? t('Removal pending', 'إزالة معلقة') : state === 'removed' ? t('Removed by Cyber', 'أزاله الأمن السيبراني') : state === 'cyber' ? t('Added by Cyber', 'أضافه الأمن السيبراني') : t('Added by requester', 'أضافه مقدم الطلب')}
                    </span>
                  </div>
                  {(revoking || state === 'removed') && <p className="mt-0.5 text-[12px] text-neutral-600">{t('Reason:', 'السبب:')} {revoking?.reason ?? reason}</p>}
                </li>
              );
            })}
            {pend.add.map((id) => { const r = CYBER_LIBRARY.find((x) => x.id === id)!; return (
              <li key={id} className="rounded-lg border border-[#C9DBEC] bg-[#F5F9FD] px-3 py-2 flex items-start justify-between gap-3">
                <p className="text-[12.5px] font-semibold text-neutral-800">{isAr ? r.titleAr : r.titleEn}</p>
                <span className="flex-shrink-0 text-[10.5px] font-semibold rounded-full px-2 py-0.5 bg-[#EEF4FB] text-[#2A6193]">{t('Added by you — pending', 'أضفته — معلق')}</span>
              </li>
            ); })}
          </ul>
        )}
        {pendingN > 0 && <p className="mt-2 text-[12px] font-semibold text-[#2A6193]" data-testid="pending-note">{t(`${pend.add.length} added, ${pend.revoke.length} removed — sent to the request with your decision.`, `${pend.add.length} مضاف، ${pend.revoke.length} محذوف — تُرسل إلى الطلب مع قرارك.`)}</p>}
      </section>

      {panel && <ClassificationPanel task={task} isAr={isAr} t={t} initial={cls ?? 'Internal'} pend={pend}
        onDone={(c, p) => { setTaskData(task.id, { cyberReview: { ...cr, classification: c, pending: p } }); setPanel(false); }}
        onCancel={() => setPanel(false)} setPend={setPend} />}
    </div>
  );
}

function ClassificationPanel({ task, isAr, t, initial, pend, onDone, onCancel }: {
  task: Task; isAr: boolean; t: T; initial: string; pend: { add: string[]; revoke: { id: string; reason: string }[] };
  onDone: (cls: string, p: { add: string[]; revoke: { id: string; reason: string }[] }) => void; onCancel: () => void; setPend: (p: { add: string[]; revoke: { id: string; reason: string }[] }) => void;
}) {
  const [cls, setCls] = useState(initial);
  const [p, setP] = useState(pend);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const usual = usuallyRequired(task, cls);
  const projectTypes = task.cyberReview?.projectTypes ?? [];
  const relevant = CYBER_LIBRARY.filter((r) => r.appliesTo.some((c) => projectTypes.includes(c)) || rowState(task.rfp, r).state !== 'none');
  const list = [...relevant].sort((a, b) => Number(usual.has(b.id)) - Number(usual.has(a.id)));
  const add = (r: CyberReq) => setP((x) => ({ ...x, add: [...new Set([...x.add, r.id])] }));
  const undoAdd = (r: CyberReq) => setP((x) => ({ ...x, add: x.add.filter((i) => i !== r.id) }));
  const revoke = (r: CyberReq) => { setP((x) => ({ ...x, revoke: [...x.revoke.filter((y) => y.id !== r.id), { id: r.id, reason: reason.trim() }] })); setRevoking(null); setReason(''); };
  const undoRevoke = (r: CyberReq) => setP((x) => ({ ...x, revoke: x.revoke.filter((y) => y.id !== r.id) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="class-panel">
      <div className="absolute inset-0 bg-neutral-900/30" onClick={onCancel} />
      <div className="relative w-full max-w-3xl max-h-[88vh] rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="px-6 pt-5 pb-3 border-b border-neutral-100">
          <p className="text-[17px] font-bold text-neutral-900">{t('Data classification & Cybersecurity requirements', 'تصنيف البيانات ومتطلبات الأمن السيبراني')}</p>
          <p className="text-[12.5px] text-neutral-500 mt-0.5">{t('Confirm or change the classification. Add requirements this request needs, or revoke one the requester added — say why, so the requester and other reviewers can see it.', 'أكد التصنيف أو غيّره. أضف ما يحتاجه الطلب أو اسحب متطلباً أضافه مقدم الطلب مع ذكر السبب.')}</p>
          <div className="mt-3 flex items-center gap-1 border-b border-neutral-200 -mb-3" role="tablist">
            {CLASSIFICATIONS.map((c) => (
              <button key={c.en} type="button" role="tab" aria-selected={cls === c.en} onClick={() => setCls(c.en)}
                className={`px-3.5 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${cls === c.en ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
                {isAr ? c.ar : c.en}{task.cyberReview?.requesterClass === c.en && <span className="ms-1.5 text-[10px] font-semibold text-neutral-400">{t('requester', 'مقدم الطلب')}</span>}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto px-6 py-4 space-y-2" data-testid="panel-list">
          {list.map((r) => {
            const st = rowState(task.rfp, r);
            const pAdd = p.add.includes(r.id);
            const pRev = p.revoke.find((x) => x.id === r.id);
            const inReq = st.state === 'requester' || st.state === 'cyber';
            return (
              <li key={r.id} data-req={r.id} className={`rounded-lg border px-3.5 py-3 ${pRev ? 'border-warning-200 bg-warning-50/50' : inReq || pAdd ? 'border-success-200 bg-success-50/40' : 'border-neutral-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-[13px] font-semibold ${pRev ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>{isAr ? r.titleAr : r.titleEn}</p>
                    <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">{r.textEn}</p>
                    {usual.has(r.id) && !inReq && !pAdd && <p className="mt-1 text-[11px] font-semibold text-[#2A6193]" data-testid="usual-hint">{t(`Usually required for ${cls} data`, `مطلوب عادة لبيانات ${clsAr(cls)}`)}</p>}
                    {st.state === 'removed' && !pAdd && <p className="mt-1 text-[11.5px] text-neutral-500">{t('Removed by Cyber earlier:', 'أزاله الأمن السيبراني سابقاً:')} {st.reason}</p>}
                    {pRev && <p className="mt-1 text-[11.5px] text-warning-800">{t('Reason:', 'السبب:')} {pRev.reason}</p>}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    {inReq && !pRev && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-success-100 text-success-800">{st.state === 'cyber' ? t('Added by Cyber', 'أضافه الأمن السيبراني') : t('Added', 'مضاف')}</span>}
                    {inReq && !pRev && revoking !== r.id && <Button size="sm" variant="secondary" data-testid="revoke-req" onClick={() => { setRevoking(r.id); setReason(''); }}>{t('Revoke', 'سحب')}</Button>}
                    {pRev && <><span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-warning-100 text-warning-800">{t('Removal pending', 'إزالة معلقة')}</span><Button size="sm" variant="secondary" onClick={() => undoRevoke(r)}>{t('Undo', 'تراجع')}</Button></>}
                    {!inReq && pAdd && <><span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-success-100 text-success-800">{t('Added — pending', 'مضاف — معلق')}</span><Button size="sm" variant="secondary" onClick={() => undoAdd(r)}>{t('Undo', 'تراجع')}</Button></>}
                    {!inReq && !pAdd && <Button size="sm" variant="primary" data-testid="add-req" onClick={() => add(r)}>{t('Add to request', 'إضافة إلى الطلب')}</Button>}
                  </div>
                </div>
                {revoking === r.id && (
                  <div className="mt-2.5 flex items-end gap-2">
                    <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={2} data-testid="revoke-reason"
                      placeholder={t('Why isn’t this relevant to the request? The requester and other reviewers will see this.', 'لماذا لا ينطبق هذا على الطلب؟ سيراه مقدم الطلب والمراجعون.')}
                      className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="danger" data-testid="revoke-confirm" disabled={!reason.trim()} onClick={() => revoke(r)}>{t('Revoke', 'سحب')}</Button>
                      <Button size="sm" variant="secondary" onClick={() => setRevoking(null)}>{t('Cancel', 'إلغاء')}</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="px-6 py-3.5 border-t border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12px] text-neutral-500">{t(`${p.add.length} added, ${p.revoke.length} removed · sent to the request with your decision`, `${p.add.length} مضاف، ${p.revoke.length} محذوف · تُرسل مع قرارك`)}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>{t('Cancel', 'إلغاء')}</Button>
            <Button variant="primary" data-testid="panel-done" onClick={() => onDone(cls, p)}>{t(`Done — classification ${cls}`, `تم — التصنيف ${clsAr(cls)}`)}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
