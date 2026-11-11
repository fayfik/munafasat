// Cybersecurity task — Required action. Same pattern as the EA task: only the sections
// Cyber owns, every row Accepted or Commented, vendor-ready clauses inserted straight
// into the request from the library. Comments have no length limit and are saved as
// drafts while typing; "Submit review" in the header sends them all together.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Task } from './types';
import { CheckIcon, ChevronDownIcon, PencilIcon } from '../components/Icons';
import BoqLineDetails, { BoqViewButton, useBoqOpen, viewFromRfpLine, rfpCostCenter } from '../components/BoqLineDetails';
import { ActionHead, BulkButton } from './ActionHead';
import { deptSections, deptKind, libraryFor, usedClauses, type CyberKind, type CyberClause, type DeptKind } from './cyberReview';

type T = (en: string, ar: string) => string;
type Dec = { state: 'accepted' | 'comment'; comment?: string };
const sar = (n: number) => 'SAR ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const ICON: Record<string, string> = {
  applicability: 'M9 12l2 2 4-4M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z',
  continuity: 'M3 12a9 9 0 0115.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.3L3 16M3 21v-5h5',
  people: 'M9 8a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5',
  tpr: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9',
  controls: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  scope: 'M4 6h16M4 12h10M4 18h7',
  tech: 'M9 3v3M15 3v3M4 9h16M6 6h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z',
  integration: 'M8 12h8M5 8a4 4 0 100 8M19 8a4 4 0 110 8',
  data: 'M4 7c0-2 16-2 16 0v10c0 2-16 2-16 0zM4 7c0 2 16 2 16 0M4 12c0 2 16 2 16 0',
  security: 'M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z',
};

export default function CyberReview({ task, isAr, t, readOnly, onDecide, onAcceptAll, onDraft, onInsert }: {
  task: Task; isAr: boolean; t: T; readOnly?: boolean;
  onDecide: (key: string, d: Dec | null) => void;
  onAcceptAll: (keys: string[]) => void;
  onDraft: (key: string, text: string | null) => void;
  onInsert: (clause: CyberClause) => void;
}) {
  const rfp = task.rfp!;
  const kind: DeptKind = deptKind(task) ?? 'cyber';
  const secs = deptSections(task);
  const COPY = {
    cyber: { title: t('Review the security requirements', 'مراجعة المتطلبات الأمنية'), desc: t('Only the sections Cyber owns. Accept each requirement, comment on it, or add a missing one from the library.', 'الأقسام التي يملكها الأمن السيبراني فقط. اقبل كل متطلب أو علّق عليه أو أضف متطلباً ناقصاً من المكتبة.'), noun: t('requirements reviewed', 'متطلبات تمت مراجعتها'), add: t('Add requirement', 'إضافة متطلب') },
    bcm: { title: t('Review business continuity', 'مراجعة استمرارية الأعمال'), desc: t('Confirm whether BCM applies to this service, then check every continuity clause. Add any that are missing from the BCM library.', 'أكّد انطباق استمرارية الأعمال على هذه الخدمة، ثم راجع كل بند. أضف الناقص من مكتبة الاستمرارية.'), noun: t('items reviewed', 'بنود تمت مراجعتها'), add: t('Add clause', 'إضافة بند') },
    orm: { title: t('Review operational risk', 'مراجعة المخاطر التشغيلية'), desc: t('A high-level confirmation: is the scope clear, what does the third-party checklist say, and are the right controls in the RFP?', 'تأكيد عام: هل النطاق واضح، وماذا تقول قائمة مخاطر الطرف الثالث، وهل الضوابط المناسبة في الطلب؟'), noun: t('items reviewed', 'بنود تمت مراجعتها'), add: t('Add control', 'إضافة ضابط') },
  }[kind];
  const notApplicable = kind === 'bcm' && secs.length === 2 && secs[0].rows[0]?.tone === 'success';
  const dec = task.cyberDecisions ?? {};
  const drafts = task.cyberDrafts ?? {};
  const keys = secs.flatMap((s) => s.rows.map((r) => r.key));
  const done = keys.filter((k) => dec[k]).length;
  const comments = keys.filter((k) => dec[k]?.state === 'comment').length;
  const [open, setOpen] = useState<string | null>(null);          // row whose comment editor is open
  const [lib, setLib] = useState<CyberKind | null>(null);
  const [refOpen, setRefOpen] = useState(false);
  const boqOpen = useBoqOpen();
  const L = (en?: string, ar?: string) => (isAr ? ar || en || '' : en || '');
  const anyDraft = Object.values(drafts).some((x) => x?.trim());

  return (
    <div className="space-y-5" data-cyber-review data-dept={kind}>
      <ActionHead title={COPY.title}
        desc={COPY.desc}
        progress={{ done, total: keys.length, label: COPY.noun, attrs: { 'data-cyber-progress': `${done}/${keys.length}` },
          tail: comments ? <span className="ms-1.5 text-warning-700">· {t(`${comments} with comments`, `${comments} بملاحظات`)}</span> : undefined }}
        extra={anyDraft ? <span className="text-[11.5px] text-neutral-400 inline-flex items-center gap-1" data-cyber-draft-saved><CheckIcon className="w-3 h-3" />{t('Drafts saved', 'تم حفظ المسودات')}</span> : undefined}
        bulk={!readOnly && done < keys.length ? <BulkButton testAttr={{ 'data-cyber-all': '' }} onClick={() => onAcceptAll(keys.filter((k) => !dec[k]))}>{notApplicable ? t('Confirm not in BCM scope', 'تأكيد عدم انطباق الاستمرارية') : t('Accept all remaining', 'قبول جميع البنود المتبقية')}</BulkButton> : undefined} />

      {secs.map((s) => {
        const sd = s.rows.filter((r) => dec[r.key]).length;
        return (
          <section key={s.id} data-cyber-section={s.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <header className="flex items-center gap-3 px-5 py-3 border-b border-neutral-100">
              <span className="w-8 h-8 rounded-lg bg-[#EEF4FB] text-[#2A6193] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d={ICON[s.id] ?? ICON.tech} /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-[14px] font-semibold text-neutral-900">{isAr ? s.ar : s.en}</h4>
                <p className="text-[12px] text-neutral-500">{isAr ? s.hintAr : s.hintEn}</p>
              </div>
              <span className={`text-[11.5px] font-semibold tabular-nums ${sd === s.rows.length && s.rows.length ? 'text-success-700' : 'text-neutral-400'}`}>{sd}/{s.rows.length}</span>
            </header>
            <ul className="divide-y divide-neutral-100">
              {s.rows.map((r) => {
                const d = dec[r.key];
                const editing = open === r.key;
                return (
                  <li key={r.key} data-cyber-row={r.key} data-state={d?.state ?? ''} className={`px-5 py-3 ${d?.state === 'comment' ? 'bg-warning-50/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-relaxed ${s.id === 'scope' ? 'text-neutral-700' : 'font-medium text-neutral-800'}`}>
                          {r.tone && <span className={`inline-block me-2 w-2 h-2 rounded-full align-[1px] ${r.tone === 'warning' ? 'bg-warning-500' : r.tone === 'success' ? 'bg-success-500' : 'bg-[#2A6193]'}`} />}
                          {L(r.en, r.ar)}
                          {r.added && <span className="ms-2 align-[1px] px-1.5 py-0.5 rounded bg-[#EEF4FB] text-[#21507A] text-[10px] font-bold" data-cyber-added>{t('Added by you', 'أضفته أنت')}</span>}
                        </p>
                        {r.subEn && <p className="text-[12px] text-neutral-500 mt-0.5 leading-relaxed">{L(r.subEn, r.subAr)}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {d?.state === 'accepted' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-50 text-success-700"><CheckIcon className="w-3 h-3" />{t('Accepted', 'مقبول')}</span>}
                        {d?.state === 'comment' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-100 text-warning-800"><PencilIcon className="w-3 h-3" />{t('Comment', 'ملاحظة')}</span>}
                        {!readOnly && (d
                          ? <button type="button" onClick={() => onDecide(r.key, null)} className="h-7 px-2 rounded-md text-[11.5px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800">{t('Undo', 'تراجع')}</button>
                          : !editing && <>
                              <button type="button" data-cyber-accept={r.key} onClick={() => onDecide(r.key, { state: 'accepted' })} className="h-8 px-2.5 rounded-lg border border-success-300 bg-white text-success-700 text-[12px] font-semibold hover:bg-success-50 inline-flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />{t('Accept', 'قبول')}</button>
                              <button type="button" data-cyber-comment={r.key} onClick={() => setOpen(r.key)} className="h-8 px-2.5 rounded-lg text-neutral-600 text-[12px] font-semibold hover:bg-neutral-100 hover:text-neutral-900 inline-flex items-center gap-1">
                                <PencilIcon className="w-3.5 h-3.5" />{t('Comment', 'ملاحظة')}{drafts[r.key]?.trim() && <span className="w-1.5 h-1.5 rounded-full bg-warning-500" title={t('Draft', 'مسودة')} />}
                              </button>
                            </>)}
                      </div>
                    </div>
                    {d?.state === 'comment' && !editing && (
                      <div className="mt-2 rounded-lg bg-white border border-warning-200 px-3 py-2 text-[12.5px] text-neutral-800 whitespace-pre-line" data-cyber-comment-text={r.key}>
                        {d.comment}
                        {!readOnly && <button type="button" onClick={() => { onDraft(r.key, d.comment ?? ''); setOpen(r.key); }} className="ms-2 text-[11.5px] font-semibold text-[#2A6193] hover:underline">{t('Edit', 'تعديل')}</button>}
                      </div>
                    )}
                    {editing && (
                      <CommentEditor t={t} initial={drafts[r.key] ?? ''} onChange={(v) => onDraft(r.key, v)}
                        onCancel={() => setOpen(null)}
                        onSave={(v) => { onDecide(r.key, { state: 'comment', comment: v }); onDraft(r.key, null); setOpen(null); }} rowKey={r.key} />
                    )}
                  </li>
                );
              })}
              {!s.rows.length && <li className="px-5 py-4 text-[12.5px] text-neutral-400">{t('Nothing in the request yet.', 'لا يوجد شيء في الطلب بعد.')}</li>}
            </ul>
            {s.canAdd && !readOnly && s.id !== 'scope' && (
              <div className="px-5 py-2 border-t border-neutral-100 bg-neutral-50/50">
                <button type="button" data-cyber-add={s.id} onClick={() => setLib(s.id)} className="h-8 px-2 -ms-2 rounded-lg text-[12.5px] font-semibold text-[#2A6193] hover:bg-[#EEF4FB] inline-flex items-center gap-1.5">
                  <span className="text-[16px] leading-none">+</span>{COPY.add}
                </button>
              </div>
            )}
          </section>
        );
      })}

      {/* For reference */}
      <section className="rounded-xl border border-neutral-200 bg-white" data-cyber-outside>
        <button type="button" onClick={() => setRefOpen((v) => !v)} aria-expanded={refOpen} className="w-full flex items-center gap-3 px-5 py-3 text-start hover:bg-neutral-50">
          <span className="flex-1"><span className="block text-[13px] font-semibold text-neutral-700">{t('BOQ — for reference', 'جدول الكميات — للاطلاع')}</span>
            <span className="block text-[12px] text-neutral-500">{t(`${rfp.boq.length} items · not part of the Cyber review`, `${rfp.boq.length} بنود · خارج نطاق مراجعة الأمن السيبراني`)}</span></span>
          <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform ${refOpen ? 'rotate-180' : ''}`} />
        </button>
        {refOpen && (
          <div className="px-5 pb-4">
            <table className="w-full text-[12.5px]">
              <tbody>{rfp.boq.map((l, i) => (
                <Fragment key={i}>
                  <tr className="border-t border-neutral-100"><td className="py-1.5 pe-3"><span className="text-neutral-400 me-1.5">{i + 1}.</span>{L(l.itemEn, l.itemAr)}</td>
                    <td className="py-1.5 text-end tabular-nums whitespace-nowrap">{l.qty} {l.unit}</td><td className="py-1.5 ps-3 text-end tabular-nums whitespace-nowrap" dir="ltr">{sar((Number(l.qty) || 1) * l.unitPrice)}</td>
                    <td className="py-1 ps-1 text-end w-9"><BoqViewButton index={i} open={boqOpen.isOpen(i)} onClick={() => boqOpen.toggle(i)} label={t('View item details', 'عرض تفاصيل البند')} /></td></tr>
                  {boqOpen.isOpen(i) && <tr><td colSpan={4} className="p-0 pb-1"><div className="rounded-lg overflow-hidden border border-neutral-100"><BoqLineDetails line={viewFromRfpLine(l, isAr, t, rfpCostCenter(rfp))} isAr={isAr} t={t} /></div></td></tr>}
                </Fragment>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {lib && <ClauseLibrary kind={kind} cat={lib} task={task} isAr={isAr} t={t} onClose={() => setLib(null)} onInsert={(c) => { onInsert(c); setLib(null); }} />}
    </div>
  );
}

/** No length limit; every keystroke is kept as a draft on the task. */
function CommentEditor({ t, initial, onChange, onCancel, onSave, rowKey }: { t: T; initial: string; onChange: (v: string) => void; onCancel: () => void; onSave: (v: string) => void; rowKey: string }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.max(76, el.scrollHeight)}px`; }, [v]);
  return (
    <div className="mt-2.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <textarea ref={ref} data-cyber-comment-input={rowKey} value={v} autoFocus onChange={(e) => { setV(e.target.value); onChange(e.target.value); }}
        placeholder={t('What should the requester change or add? Write as much as you need.', 'ما الذي يجب على مقدّم الطلب تغييره أو إضافته؟ اكتب ما تحتاجه.')}
        className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[13px] leading-relaxed focus:border-brand-500 focus:outline-none" />
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11.5px] text-neutral-400">{v.trim() ? t('Draft saved', 'تم حفظ المسودة') : ''}</span>
        <span className="flex-1" />
        <button type="button" data-cyber-save={rowKey} disabled={!v.trim()} onClick={() => onSave(v.trim())} className="h-8 px-3.5 rounded-lg bg-[#2A6193] hover:bg-[#21507A] text-white text-[12.5px] font-semibold disabled:opacity-40">{t('Add comment', 'إضافة الملاحظة')}</button>
        <button type="button" onClick={onCancel} className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Close', 'إغلاق')}</button>
      </div>
    </div>
  );
}

function ClauseLibrary({ kind, cat, task, isAr, t, onClose, onInsert }: { kind: DeptKind; cat: CyberKind; task: Task; isAr: boolean; t: T; onClose: () => void; onInsert: (c: CyberClause) => void }) {
  const [all, setAll] = useState(false);
  const used = usedClauses(task);
  const list = useMemo(() => libraryFor(kind).filter((c) => all || c.cat === cat), [all, cat, kind]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px] cm-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} dir={isAr ? 'rtl' : 'ltr'}>
      <div role="dialog" aria-modal="true" data-cyber-library className="w-full max-w-[620px] max-h-[82vh] flex flex-col rounded-2xl bg-white shadow-2xl pop-in overflow-hidden">
        <div className="px-6 pt-5 pb-3 border-b border-neutral-100">
          <h3 className="text-[17px] font-bold text-neutral-900">{t('Add a requirement from the library', 'إضافة متطلب من المكتبة')}</h3>
          <p className="text-[12.5px] text-neutral-500 mt-0.5">{t('Vendor-ready wording. It is inserted into the request and marked as accepted.', 'صياغة جاهزة للمورد. تُدرج في الطلب وتُسجّل كمقبولة.')}</p>
          <label className="mt-2.5 inline-flex items-center gap-2 text-[12px] text-neutral-600"><input type="checkbox" className="accent-brand-600" checked={all} onChange={(e) => setAll(e.target.checked)} />{t('Show all categories', 'عرض جميع الفئات')}</label>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {list.map((c) => {
            const isUsed = used.has(c.id);
            return (
              <li key={c.id} className="px-6 py-3.5 flex items-start gap-3" data-clause={c.id}>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-neutral-900">{isAr ? c.ar : c.en}</p>
                  <p className="text-[12.5px] text-neutral-600 mt-0.5 leading-relaxed">{isAr ? c.descAr : c.descEn}</p>
                </div>
                {isUsed
                  ? <span className="text-[11.5px] font-semibold text-success-700 inline-flex items-center gap-1 mt-1"><CheckIcon className="w-3.5 h-3.5" />{t('In request', 'في الطلب')}</span>
                  : <button type="button" data-clause-insert={c.id} onClick={() => onInsert(c)} className="h-8 px-3 rounded-lg border border-neutral-300 bg-white text-[12.5px] font-semibold text-neutral-800 hover:bg-neutral-50 shadow-sm flex-shrink-0">{t('Insert', 'إدراج')}</button>}
              </li>
            );
          })}
        </ul>
        <div className="px-6 py-3 border-t border-neutral-100 flex justify-end">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Done', 'تم')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
