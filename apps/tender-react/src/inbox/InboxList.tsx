// Inbox — List view. Full-width, sortable table; each row carries the task's own
// decision buttons (same hierarchy as the task page: primary · secondary · ghost) and
// an eye icon that opens the full task page. Gated decisions stay locked until the
// task's items are reviewed on the task page.
import { useMemo, useState } from 'react';
import type { Task } from './types';
import { useInbox, dueInfo, fmtDate, completionStatus } from './store';
import { actionsFor, DecisionModal, type ActionDef } from './TaskDetail';
import { budgetFits } from './BudgetCheck';
import { PRIORITY_META, STATE_META, tb } from './meta';
import { Avatar } from './InboxTools';
import { EyeGlyph } from './TaskDetail';
import { toast } from '../components/Toast';

type T = (en: string, ar: string) => string;
type SortKey = 'ref' | 'task' | 'project' | 'status' | 'type' | 'dept' | 'requester' | 'received' | 'due';

const typeOf = (x: Task) => (x.rfp && !x.rfp.payment.length && !x.rfp.evaluation.length ? 'esouq' : 'tender');
const compactSar = (n?: number) => (n == null ? '' : 'SAR ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }));

function statusOf(x: Task, t: T, isAr: boolean): { label: string; dot: string; cls: string; attr?: string } {
  if (x.delegatedTo) return { label: t(`With ${x.delegatedTo.name.split(' ')[0]}`, `لدى ${(x.delegatedTo.nameAr ?? x.delegatedTo.name).split(' ')[0]}`), dot: 'bg-[#2A3466]', cls: 'bg-[#EEF0FB] text-[#2A3466]', attr: 'delegated' };
  if (x.queue && !x.queue.assignedTo) return { label: t('Unassigned', 'غير مسندة'), dot: 'bg-neutral-400', cls: 'bg-neutral-100 text-neutral-600', attr: 'unassigned' };
  if (x.queue?.assignedTo) return { label: t(`Assigned · ${x.queue.assignedTo.name.split(' ')[0]}`, `مسندة · ${(x.queue.assignedTo.nameAr ?? x.queue.assignedTo.name).split(' ')[0]}`), dot: 'bg-success-500', cls: 'bg-success-50 text-success-700' };
  if (x.state === 'available') return { label: t('Pending your decision', 'بانتظار قرارك'), dot: 'bg-warning-500', cls: 'bg-warning-50 text-warning-800' };
  if (x.state === 'in-progress') return { label: t('In review', 'قيد المراجعة'), dot: 'bg-[#2A6193]', cls: 'bg-[#EEF4FB] text-[#21507A]' };
  const m = STATE_META[x.state];
  const tone = x.state === 'completed' ? 'bg-success-50 text-success-700' : x.state === 'rejected' || x.state === 'returned' ? 'bg-error-50 text-error-700' : 'bg-neutral-100 text-neutral-600';
  return { label: isAr ? m.ar : m.en, dot: x.state === 'completed' ? 'bg-success-500' : x.state === 'rejected' || x.state === 'returned' ? 'bg-error-500' : 'bg-neutral-400', cls: tone };
}

function dueLabel(x: Task, t: T) {
  const d = dueInfo(x);
  const h = Math.round((+new Date(x.dueAt) - Date.now()) / 3600000);
  if (d.overdue) return { text: t(`${Math.abs(h) >= 24 ? `${Math.round(Math.abs(h) / 24)}d` : `${Math.abs(h)}h`} late`, `متأخرة ${Math.abs(h) >= 24 ? `${Math.round(Math.abs(h) / 24)}ي` : `${Math.abs(h)}س`}`), cls: 'text-error-600 font-semibold' };
  const txt = h < 24 ? t(`${h}h left`, `${h}س متبقية`) : t(`${Math.floor(h / 24)}d${h % 24 ? ` ${h % 24}h` : ''} left`, `${Math.floor(h / 24)}ي متبقية`);
  return { text: txt, cls: h <= 12 ? 'text-neutral-900 font-semibold' : 'text-neutral-600' };
}

export default function InboxList({ rows, isAr, t, onOpen }: { rows: Task[]; isAr: boolean; t: T; onOpen: (id: string) => void }) {
  const { decide } = useInbox();
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 } | null>(null);
  const [pending, setPending] = useState<{ task: Task; a: ActionDef } | null>(null);
  const L = (en: string, ar?: string) => (isAr ? ar || en : en);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const v = (x: Task): string | number => {
      switch (sort.k) {
        case 'ref': return x.entity.ref;
        case 'task': return L(x.stageEn, x.stageAr);
        case 'project': return L(x.entity.titleEn, x.entity.titleAr);
        case 'status': return statusOf(x, t, isAr).label;
        case 'type': return typeOf(x);
        case 'dept': return tb(x.department, isAr);
        case 'requester': return x.requester.name;
        case 'received': return +new Date(x.receivedAt);
        case 'due': return +new Date(x.dueAt);
      }
    };
    return [...rows].sort((a, b) => { const A = v(a), B = v(b); return (A < B ? -1 : A > B ? 1 : 0) * sort.dir; });
  }, [rows, sort, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  const Th = ({ k, children, className = '' }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const on = sort?.k === k;
    return (
      <th className={`px-3 py-3 text-start font-medium whitespace-nowrap ${className}`}>
        <button type="button" data-sort={k} onClick={() => setSort((s) => (s?.k === k ? (s.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 }))}
          className={`inline-flex items-center gap-1 hover:text-neutral-900 ${on ? 'text-neutral-900' : ''}`}>
          {children}
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="currentColor"><path d="M6 1.5 9 5H3z" opacity={on && sort!.dir === 1 ? 1 : 0.35} /><path d="M6 10.5 3 7h6z" opacity={on && sort!.dir === -1 ? 1 : 0.35} /></svg>
        </button>
      </th>
    );
  };

  return (
    <div className="flex-1 overflow-auto" data-inbox-list>
      <table className="w-full min-w-[1180px] text-start">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="text-[12px] text-neutral-500 border-b border-neutral-200">
            <th className="w-8" />
            <Th k="ref">{t('Req no.', 'رقم الطلب')}</Th>
            <Th k="task" className="min-w-[150px]">{t('Task', 'المهمة')}</Th>
            <Th k="project" className="min-w-[190px]">{t('Project', 'المشروع')}</Th>
            <Th k="status">{t('Status', 'الحالة')}</Th>
            <Th k="dept">{t('Department', 'الإدارة')}</Th>
            <Th k="requester">{t('Requested by', 'مقدّم الطلب')}</Th>
            <Th k="due">{t('Due', 'الاستحقاق')}</Th>
            <th className="sticky end-0 z-[1] bg-white px-4 py-3 text-end font-medium shadow-[-10px_0_12px_-10px_rgba(16,24,40,0.12)] rtl:shadow-[10px_0_12px_-10px_rgba(16,24,40,0.12)]">{t('Actions', 'الإجراءات')}</th>
          </tr>
        </thead>
        <tbody className="stagger">
          {sorted.map((x) => {
            const st = statusOf(x, t, isAr);
            const due = dueLabel(x, t);
            const p = PRIORITY_META[x.priority];
            const comp = completionStatus(x);
            const terminal = ['completed', 'rejected', 'cancelled', 'waiting'].includes(x.state) || !!x.delegatedTo || !!x.queue?.assignedTo;
            const queued = !!x.queue && !x.queue.assignedTo;
            const acts = terminal || queued ? [] : actionsFor(x).filter((a) => a.id !== 'save-draft');
            const unread = !!x.arrivedAt || x.state === 'available';
            return (
              <tr key={x.id} data-list-row={x.id} onClick={() => onOpen(x.id)}
                className={`group border-b border-neutral-100 cursor-pointer hover:bg-neutral-50/80 ${x.delegatedTo ? 'opacity-70' : ''}`}>
                <td className="ps-4 pe-1 py-3.5 align-middle">{unread && <span className="block w-1.5 h-1.5 rounded-full bg-brand-500" title={t('New', 'جديدة')} />}</td>
                <td className="px-3 py-3.5 text-[13px] text-neutral-600 tabular-nums whitespace-nowrap" dir="ltr">{x.entity.ref}</td>
                <td className={`px-3 py-3.5 text-[13px] max-w-[200px] ${unread ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`} title={L(x.titleEn, x.titleAr)}>
                  {x.arrivedAt && <span className="me-1.5 px-1.5 py-px rounded bg-brand-600 text-white text-[10px] font-bold align-[1px]">{t('New', 'جديدة')}</span>}
                  {L(x.stageEn, x.stageAr).replace(/^Specialist review — /, '').replace(/^مراجعة تخصصية — /, '')}
                  {(x.priority === 'urgent' || x.priority === 'high') && <span className={`block mt-0.5 text-[11px] font-semibold ${p.text}`}>{isAr ? p.ar : p.en}</span>}
                </td>
                <td className="px-3 py-3.5 max-w-[280px]" title={L(x.entity.titleEn, x.entity.titleAr)}><p className={`text-[13px] ${unread ? 'font-semibold text-neutral-900' : 'text-neutral-800'} line-clamp-2`}>{L(x.entity.titleEn, x.entity.titleAr)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-500 whitespace-nowrap"><span className="tabular-nums" dir="ltr">{compactSar(x.amount)}</span>
                    {typeOf(x) === 'esouq'
                      ? <span data-list-type="esouq" className="px-1.5 rounded border border-warning-200 bg-warning-50 text-warning-800 text-[10.5px] font-medium">{t('Etimad E-Market', 'سوق اعتماد')}</span>
                      : <span data-list-type="tender" className="px-1.5 rounded border border-[#C9DBEC] bg-[#F3F8FC] text-[#21507A] text-[10.5px] font-medium">{t('Tender', 'منافسة')}</span>}</p></td>
                <td className="px-3 py-3.5"><span data-list-status={st.attr} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-medium whitespace-nowrap ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span></td>
                <td className="px-3 py-3.5 text-[13px] text-neutral-700 max-w-[150px] leading-snug">{tb(x.department, isAr)}</td>
                <td className="px-3 py-3.5"><span className="inline-flex items-center gap-2 text-[13px] text-neutral-800"><Avatar p={x.requester} className="w-6 h-6 text-[9px] !bg-[#517632]" /><span className="whitespace-nowrap">{L(x.requester.name, x.requester.nameAr)}</span></span></td>
                <td className="px-3 py-3.5 whitespace-nowrap"><p className={`text-[13px] ${due.cls}`}>{x.state === 'completed' ? <span className="text-neutral-400 font-normal">—</span> : due.text}</p><p className="text-[11.5px] text-neutral-400" data-list-received>{t('Received', 'استُلمت')} {fmtDate(x.receivedAt, isAr)}</p></td>
                <td className="sticky end-0 bg-white group-hover:bg-neutral-50 px-4 py-2.5 shadow-[-10px_0_12px_-10px_rgba(16,24,40,0.12)] rtl:shadow-[10px_0_12px_-10px_rgba(16,24,40,0.12)]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {acts.map((a) => {
                      const blocked = (a.gated && !comp.canComplete) || (a.id === 'approve' && !budgetFits(x));
                      const why = a.gated && !comp.canComplete ? t('Open the task to review its items first', 'افتح المهمة لمراجعة بنودها أولاً') : a.id === 'approve' && !budgetFits(x) ? t('Insufficient budget — approval is blocked', 'الميزانية غير كافية — الاعتماد غير متاح') : undefined;
                      const cls = a.variant === 'primary'
                        ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                        : a.variant === 'danger' ? 'text-error-700 hover:bg-error-50' : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50';
                      return (
                        <button key={a.id} type="button" data-row-action={a.id} disabled={blocked} title={why} onClick={() => setPending({ task: x, a })}
                          className={`h-8 px-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}>{t(a.label[0], a.label[1])}</button>
                      );
                    })}
                    {queued && <button type="button" data-row-action="assign" onClick={() => onOpen(x.id)} className="h-8 px-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50">{t('Assign', 'إسناد')}</button>}
                    <button type="button" data-row-view={x.id} onClick={() => onOpen(x.id)} title={t('Open task', 'فتح المهمة')} aria-label={t('Open task', 'فتح المهمة')}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-neutral-500 hover:bg-brand-50 hover:text-brand-700"><EyeGlyph /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pending && <DecisionModal task={pending.task} action={pending.a} isAr={isAr} t={t} onCancel={() => setPending(null)}
        onConfirm={(n) => { if (pending.a.needsNote && !n) return; decide(pending.task.id, pending.a.id as Parameters<typeof decide>[1], n || undefined, pending.a.decision); toast(t(`${pending.a.label[0]} — ${pending.task.entity.ref}`, `${pending.a.label[1]} — ${pending.task.entity.ref}`)); setPending(null); }} />}
    </div>
  );
}
