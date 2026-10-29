// Request detail (manual build): where a submitted request stands, what it contains,
// and the requests linked to it (split out at the route check or by Procurement's Etimad review).
import { useRequests, type SavedRequest } from '../context/RequestStore';
import { useInbox } from '../inbox/store';
import { useLanguage, useT } from '../context/LanguageContext';
import { Badge, Button } from '../components/ui';
import { ArrowLeftIcon, CheckIcon, DocumentIcon, ChevronRightIcon } from '../components/Icons';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import { etimadAnswerOf } from '../lib/etimadCheck';
import { effectiveQty } from '../lib/boqManpower';
import type { BOQRow, TenderStatus } from '../types/tender';

const STATUS: Record<TenderStatus, { en: string; ar: string; variant: 'draft' | 'submitted' | 'approved' | 'rejected' }> = {
  draft: { en: 'Draft', ar: 'مسودة', variant: 'draft' },
  submitted: { en: 'Submitted', ar: 'مُقدَّم', variant: 'submitted' },
  'under-review': { en: 'Under Review', ar: 'قيد المراجعة', variant: 'submitted' },
  approved: { en: 'Approved', ar: 'معتمد', variant: 'approved' },
  returned: { en: 'Returned', ar: 'مرتجع', variant: 'rejected' },
};

const sar = (n: number) => `SAR ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lineTotal = (r: BOQRow) => effectiveQty(r) * (typeof r.unitPrice === 'number' ? r.unitPrice : 0);

type StepState = 'done' | 'current' | 'returned' | 'upcoming';
interface Step { en: string; ar: string; state: StepState; noteEn?: string; noteAr?: string; at?: string }

interface Props { id: string; onBack: () => void; onEdit: (id: string) => void; onOpen: (id: string) => void }

export default function RequestDetail({ id, onBack, onEdit, onOpen }: Props) {
  const { isAr } = useLanguage();
  const t = useT();
  const { get, requests } = useRequests();
  const { getTask } = useInbox();
  const r = get(id);
  if (!r) {
    return (
      <div className="px-6 py-10 max-w-5xl mx-auto">
        <button type="button" onClick={onBack} className="text-[12.5px] font-semibold text-brand-700 inline-flex items-center gap-1"><ArrowLeftIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />{t('My Requests', 'طلباتي')}</button>
        <p className="mt-6 text-neutral-600">{t('This request isn’t available any more.', 'هذا الطلب لم يعد متاحاً.')}</p>
      </div>
    );
  }
  const form = r.form;
  const isEmarket = r.type === 'souq-etimad';
  const project = PROJECTS.find((p) => p.id === form?.projectId);
  const cc = ALL_COST_CENTERS.find((c) => c.id === form?.costCenterId);
  const rows = form?.boqItems ?? [];
  const subtotal = rows.reduce((s, x) => s + lineTotal(x), 0);
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

  // Procurement's Etimad review task (live from the Inbox) — falls back to what's recorded on the request.
  const reviewTask = r.requestNo ? getTask(`ETR-${r.requestNo}`) : undefined;
  const review = r.etimadReview;
  const reviewStep: Step = (() => {
    if (review?.outcome === 'confirmed') return { en: 'Etimad E-Market check by Procurement', ar: 'فحص سوق اعتماد من المشتريات', state: 'done', noteEn: 'All Etimad answers confirmed.', noteAr: 'تم تأكيد جميع إجابات اعتماد.', at: review.at };
    if (review?.outcome === 'moved') return { en: 'Etimad E-Market check by Procurement', ar: 'فحص سوق اعتماد من المشتريات', state: 'done', noteEn: `${review.movedCount ?? 1} line${(review.movedCount ?? 1) === 1 ? ' was' : 's were'} found on Etimad and moved to a separate E-Market draft.`, noteAr: 'نُقلت بنود متوفرة في اعتماد إلى مسودة سوق منفصلة.', at: review.at };
    if (review?.outcome === 'returned') return { en: 'Etimad E-Market check by Procurement', ar: 'فحص سوق اعتماد من المشتريات', state: 'returned', noteEn: review.note ? `Returned to you: “${review.note}”` : 'Returned to you to correct the Etimad answers.', noteAr: 'أُعيد إليك لتصحيح إجابات اعتماد.', at: review.at };
    const started = reviewTask?.state === 'in-progress';
    return { en: 'Etimad E-Market check by Procurement', ar: 'فحص سوق اعتماد من المشتريات', state: 'current', noteEn: started ? 'Procurement is checking your BOQ lines on Etimad.' : 'Waiting for Procurement to check your BOQ lines on Etimad.', noteAr: 'بانتظار فحص المشتريات لبنودك في اعتماد.' };
  })();
  // Older/sample requests predate the Etimad review — their approvals are simply in progress.
  const hasReview = !!review;
  const afterReview: StepState = !hasReview || reviewStep.state === 'done' ? (r.status === 'approved' ? 'done' : 'current') : 'upcoming';
  const steps: Step[] = isEmarket ? [
    { en: 'Submitted', ar: 'تم التقديم', state: 'done', at: r.submittedAt ?? r.updatedAt },
    { en: 'Procurement places the order on Etimad E-Market', ar: 'تطلب المشتريات من سوق اعتماد', state: 'current', noteEn: 'Procurement checks the listings and prices, then orders from the suppliers.', noteAr: 'تتحقق المشتريات من المنتجات والأسعار ثم تطلب من الموردين.' },
    { en: 'Delivery & receipt', ar: 'التسليم والاستلام', state: 'upcoming' },
  ] : [
    { en: 'Submitted', ar: 'تم التقديم', state: 'done', at: r.submittedAt ?? r.updatedAt },
    ...(hasReview ? [reviewStep] : []),
    { en: 'Department approvals', ar: 'موافقات الإدارات', state: afterReview, noteEn: 'Line Manager, Finance and the departments set in Scope of Work review it in parallel.', noteAr: 'يراجعه المدير المباشر والمالية والإدارات المحددة بالتوازي.' },
    { en: 'Procurement publishes the tender on Etimad', ar: 'تنشر المشتريات المنافسة في اعتماد', state: 'upcoming' },
  ];

  // Linked requests: where this one came from, and what was split out of it.
  const parent = r.linkedFrom ? get(r.linkedFrom.id) : undefined;
  const children = requests.filter((x) => (x as SavedRequest).linkedFrom?.id === r.id) as SavedRequest[];
  const st = STATUS[r.status];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5" data-testid="request-detail">
      <button type="button" onClick={onBack} className="text-[12.5px] font-semibold text-neutral-500 hover:text-brand-700 inline-flex items-center gap-1">
        <ArrowLeftIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />{t('My Requests', 'طلباتي')}
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isEmarket ? 'default' : 'info'}>{isEmarket ? t('Etimad E-Market', 'سوق اعتماد') : t('Tender', 'منافسة')}</Badge>
            <Badge variant={st.variant}>{isAr ? st.ar : st.en}</Badge>
            {r.requestNo && <span className="text-[11px] font-mono text-neutral-400" dir="ltr">{r.requestNo}</span>}
          </div>
          <h1 className="mt-1.5 text-[20px] font-bold text-neutral-900 leading-snug">{r.title}</h1>
          <p className="text-[12.5px] text-neutral-500 mt-0.5">{cc?.name ?? r.department}{r.submittedAt ? ` · ${t('Submitted', 'قُدِّم')} ${fmt(r.submittedAt)}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {r.status === 'returned' && <Button variant="primary" onClick={() => onEdit(r.id)}>{t('Edit & resubmit', 'تعديل وإعادة التقديم')}</Button>}
          {r.form && r.status !== 'returned' && <Button variant="secondary" onClick={() => onEdit(r.id)}>{t('Open request', 'فتح الطلب')}</Button>}
        </div>
      </div>

      {r.status === 'returned' && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-5 py-3.5 text-[13px] text-error-900" data-testid="returned-banner">
          <span className="font-semibold">{t('Procurement returned this request.', 'أعادت المشتريات هذا الطلب.')}</span>{' '}
          {review?.note ? <>“{review.note}”</> : t('Check the Etimad E-Market answers on your BOQ lines, then resubmit.', 'راجع إجابات اعتماد في بنود الجدول ثم أعد التقديم.')}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Where it stands */}
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5" data-testid="request-progress">
            <h2 className="text-[14px] font-semibold text-neutral-900">{t('Where it stands', 'حالة الطلب')}</h2>
            <ol className="mt-4 space-y-0">
              {steps.map((s, i) => {
                const dot = s.state === 'done' ? 'bg-success-600 text-white' : s.state === 'current' ? 'bg-warning-500 text-white' : s.state === 'returned' ? 'bg-error-600 text-white' : 'bg-neutral-200 text-neutral-500';
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${dot}`}>{s.state === 'done' ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}</span>
                      {i < steps.length - 1 && <span className={`w-px flex-1 min-h-[22px] ${s.state === 'done' ? 'bg-success-300' : 'bg-neutral-200'}`} />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className={`text-[13px] font-semibold ${s.state === 'upcoming' ? 'text-neutral-400' : 'text-neutral-900'}`}>{isAr ? s.ar : s.en}
                        {s.state === 'current' && <span className="ms-2 text-[10.5px] font-semibold text-warning-700 bg-warning-50 border border-warning-100 rounded-full px-1.5 py-0.5">{t('Now', 'الآن')}</span>}
                      </p>
                      {(s.noteEn || s.at) && <p className={`text-[12px] mt-0.5 ${s.state === 'returned' ? 'text-error-700' : 'text-neutral-500'}`}>{isAr ? s.noteAr : s.noteEn}{s.at ? `${s.noteEn ? ' · ' : ''}${fmt(s.at)}` : ''}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* What's in it */}
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-neutral-900">{t('Bill of Quantities', 'جدول الكميات')}</h2>
              <span className="text-[12px] text-neutral-500">{t(`${rows.length} line${rows.length === 1 ? '' : 's'}`, `${rows.length} بند`)}</span>
            </div>
            {rows.length ? (
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-wide text-neutral-500 border-b border-neutral-100 bg-neutral-50/60">
                    <th className="text-start font-semibold px-5 py-2">{t('Item', 'البند')}</th>
                    <th className="text-end font-semibold px-3 py-2">{t('Qty', 'الكمية')}</th>
                    <th className="text-end font-semibold px-3 py-2">{t('Unit price', 'سعر الوحدة')}</th>
                    <th className="text-end font-semibold px-5 py-2">{t('Total', 'الإجمالي')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((x) => {
                    const a = etimadAnswerOf(x);
                    return (
                      <tr key={x.id}>
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-neutral-800">{x.itemName || t('Unnamed item', 'بند بلا اسم')}</p>
                          <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 flex-wrap">
                            {x.projectItem && <span>{x.projectItem}</span>}
                            {!isEmarket && a && <span className={`rounded-full border px-1.5 py-px text-[10px] font-semibold ${a === 'yes' ? 'bg-warning-50 text-warning-700 border-warning-100' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>{a === 'yes' ? t('On Etimad · kept in tender', 'في اعتماد · أُبقي') : t('Not on Etimad', 'غير متوفر في اعتماد')}</span>}
                            {isEmarket && x.supplier && <span>{x.supplier}</span>}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-end tabular-nums text-neutral-700 whitespace-nowrap">{x.quantity !== '' ? x.quantity : '—'} <span className="text-neutral-400">{x.unitOfMeasure}</span></td>
                        <td className="px-3 py-2.5 text-end tabular-nums text-neutral-700 whitespace-nowrap" dir="ltr">{typeof x.unitPrice === 'number' ? sar(x.unitPrice) : '—'}</td>
                        <td className="px-5 py-2.5 text-end tabular-nums font-semibold text-neutral-900 whitespace-nowrap" dir="ltr">{sar(lineTotal(x))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-200 bg-neutral-50/60 text-[12.5px]">
                    <td className="px-5 py-2 text-neutral-500" colSpan={3}>{t('Total (incl. 15% VAT)', 'الإجمالي (شامل 15% ضريبة)')}</td>
                    <td className="px-5 py-2 text-end tabular-nums font-bold text-neutral-900 whitespace-nowrap" dir="ltr">{sar(subtotal * 1.15)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : <p className="px-5 py-6 text-[12.5px] text-neutral-500">{t('No BOQ lines yet.', 'لا توجد بنود بعد.')}</p>}
          </section>
        </div>

        <aside className="space-y-5">
          {/* Linked requests */}
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5" data-testid="linked-requests">
            <h2 className="text-[14px] font-semibold text-neutral-900">{t('Linked requests', 'الطلبات المرتبطة')}</h2>
            {!parent && !r.linkedFrom && children.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-neutral-500">{t('None — all of this request’s items follow one route.', 'لا يوجد — جميع بنود هذا الطلب تتبع مساراً واحداً.')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {r.linkedFrom && (
                  <LinkedRow label={t('Split from', 'مقسوم من')} title={parent?.title ?? r.linkedFrom.title} status={parent?.status}
                    why={r.linkedFrom.why === 'route-split' ? t('Items that followed the other route at the route check', 'بنود تتبع المسار الآخر في فحص المسار') : t('Lines Procurement found on Etimad', 'بنود وجدتها المشتريات في اعتماد')}
                    onOpen={parent ? () => onOpen(parent.id) : undefined} isAr={isAr} />
                )}
                {children.map((c) => (
                  <LinkedRow key={c.id} label={c.type === 'souq-etimad' ? t('Etimad E-Market request', 'طلب سوق اعتماد') : t('Tender request', 'طلب منافسة')} title={c.title} status={c.status}
                    why={c.linkedFrom?.why === 'route-split' ? t('Split out at the route check', 'قُسم في فحص المسار') : t('Moved out by Procurement’s Etimad review', 'نقلته مراجعة اعتماد')}
                    onOpen={() => onOpen(c.id)} isAr={isAr} />
                ))}
              </ul>
            )}
          </section>

          {/* Details */}
          <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
            <h2 className="text-[14px] font-semibold text-neutral-900">{t('Details', 'التفاصيل')}</h2>
            <dl className="mt-3 space-y-2.5 text-[12.5px]">
              {[
                [t('Project', 'المشروع'), project ? (isAr ? project.nameAr : project.name) : '—'],
                [t('Cost center', 'مركز التكلفة'), cc ? `${isAr ? cc.nameAr : cc.name}` : r.department],
                [t('Purpose', 'الغرض'), form?.tenderingPurpose || '—'],
                ...(!isEmarket ? [
                  [t('Payment stages', 'مراحل الدفع'), String(form?.paymentStages?.length ?? 0)],
                  [t('Technical evaluation', 'التقييم الفني'), form?.technicalCommitteeMembers?.[0]?.name ?? '—'],
                ] : []),
                [t('Attachments', 'المرفقات'), String(form?.attachments?.length ?? 0)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{k}</dt>
                  <dd className="text-neutral-800 mt-0.5 leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function LinkedRow({ label, title, status, why, onOpen, isAr }: { label: string; title: string; status?: TenderStatus; why: string; onOpen?: () => void; isAr: boolean }) {
  const st = status ? STATUS[status] : undefined;
  return (
    <li>
      <button type="button" disabled={!onOpen} onClick={onOpen}
        className="w-full text-start rounded-lg border border-neutral-200 px-3 py-2.5 hover:bg-neutral-50 disabled:hover:bg-white transition-colors flex items-start gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0"><DocumentIcon className="w-3.5 h-3.5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
          <span className="block text-[12.5px] font-semibold text-neutral-800 leading-snug">{title}</span>
          <span className="block text-[11px] text-neutral-500 mt-0.5">{why}</span>
          {st && <span className="mt-1 inline-block"><Badge variant={st.variant}>{isAr ? st.ar : st.en}</Badge></span>}
        </span>
        {onOpen && <ChevronRightIcon className={`w-3.5 h-3.5 text-neutral-400 mt-1 ${isAr ? 'rotate-180' : ''}`} />}
      </button>
    </li>
  );
}
