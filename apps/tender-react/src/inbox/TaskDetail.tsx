// Munafasat Inbox — task detail workspace: header, main body (by type),
// context panel, activity/collaboration, and a type/permission-aware action footer.
import { useMemo, useState } from 'react';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button } from '../components/ui';
import { ArrowLeftIcon, ChevronRightIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon } from '../components/Icons';
import type { Task, TaskAction, Person } from './types';
import { useInbox, completionStatus, dueInfo, fmtDate, fmtDateTime, fmtSAR } from './store';
import { TaskBody } from './renderers';
import { useRequests } from '../context/RequestStore';
import { TypeChip, StateChip, PriorityTag, ENTITY_META, tb } from './meta';

type T = (en: string, ar: string) => string;
const personName = (p: Person, isAr: boolean) => (isAr && p.nameAr ? p.nameAr : p.name);

const AV_COLORS = ['#699843', '#2A6193', '#6A47D6', '#C22C18', '#E08E00', '#517632'];
function InitialsAvatar({ person, className = '' }: { person: Person; className?: string }) {
  const initials = person.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  let h = 0; for (const ch of person.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span className={`${className} inline-flex items-center justify-center text-white font-semibold text-[8px]`} style={{ background: AV_COLORS[h % AV_COLORS.length] }} aria-hidden>
      {initials}
    </span>
  );
}

interface ActionDef { id: TaskAction; label: [string, string]; variant: 'primary' | 'secondary' | 'danger' | 'ghost'; needsNote?: boolean; confirm?: boolean; gated?: boolean }

function actionsFor(task: Task): ActionDef[] {
  switch (task.type) {
    case 'approval': return [
      { id: 'approve', label: ['Approve', 'اعتماد'], variant: 'primary', confirm: true },
      { id: 'return', label: ['Return for Correction', 'إعادة للتصحيح'], variant: 'secondary', needsNote: true },
      { id: 'request-clarification', label: ['Request Clarification', 'طلب توضيح'], variant: 'secondary', needsNote: true },
      { id: 'reject', label: ['Reject', 'رفض'], variant: 'danger', needsNote: true },
    ];
    case 'review': return [
      { id: 'complete', label: ['Complete Review', 'إنهاء المراجعة'], variant: 'primary', confirm: true, gated: true },
      { id: 'request-clarification', label: ['Return for Clarification', 'إعادة للتوضيح'], variant: 'secondary', needsNote: true },
      { id: 'return', label: ['Return for Correction', 'إعادة للتصحيح'], variant: 'secondary', needsNote: true },
    ];
    case 'data-collection': return [
      { id: 'submit', label: ['Submit', 'تقديم'], variant: 'primary', confirm: true, gated: true },
      { id: 'save-draft', label: ['Save Draft', 'حفظ مسودة'], variant: 'secondary' },
    ];
    case 'technical-evaluation': return [
      { id: 'submit', label: ['Submit Evaluation', 'إرسال التقييم'], variant: 'primary', confirm: true, gated: true },
      { id: 'save-draft', label: ['Save Draft', 'حفظ مسودة'], variant: 'secondary' },
    ];
    case 'commercial-evaluation': return [
      { id: 'complete', label: ['Complete Evaluation', 'إنهاء التقييم'], variant: 'primary', confirm: true, gated: true },
      { id: 'request-clarification', label: ['Request Clarification', 'طلب توضيح'], variant: 'secondary', needsNote: true },
    ];
    case 'validation': return [
      { id: 'complete', label: ['Validate & Complete', 'التحقق والإنهاء'], variant: 'primary', confirm: true, gated: true },
      { id: 'return', label: ['Return for Correction', 'إعادة للتصحيح'], variant: 'secondary', needsNote: true },
      { id: 'request-clarification', label: ['Request Clarification', 'طلب توضيح'], variant: 'secondary', needsNote: true },
    ];
    case 'clarification': return [
      { id: 'submit', label: ['Resubmit', 'إعادة التقديم'], variant: 'primary', confirm: true },
      { id: 'save-draft', label: ['Save Draft', 'حفظ مسودة'], variant: 'secondary' },
    ];
    case 'etimad-review': {
      const flagged = (task.etimadItems ?? []).some((i) => i.verdict === 'on-etimad');
      return flagged ? [
        { id: 'move-emarket', label: ['Move flagged items to an eMarket draft', 'نقل البنود المحددة إلى مسودة السوق'], variant: 'primary', confirm: true, gated: true },
        { id: 'return', label: ['Return to requester', 'إعادة إلى مقدم الطلب'], variant: 'secondary', needsNote: true, gated: true },
      ] : [
        { id: 'complete', label: ['Confirm all answers', 'تأكيد جميع الإجابات'], variant: 'primary', confirm: true, gated: true },
        { id: 'return', label: ['Return to requester', 'إعادة إلى مقدم الطلب'], variant: 'secondary', needsNote: true },
      ];
    }
    case 'document-submission': return [
      { id: 'submit', label: ['Submit Documents', 'تقديم المستندات'], variant: 'primary', confirm: true, gated: true },
      { id: 'save-draft', label: ['Save Draft', 'حفظ مسودة'], variant: 'secondary' },
    ];
    default: return [];
  }
}

export default function TaskDetail({ task, onBack }: { task: Task; onBack: () => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const { decide, addComment, blocked: isBlockedFn, tasks, finishEtimadReview } = useInbox();
  const { addSessionDraft } = useRequests();
  // Etimad review outcomes (accept / return / move flagged items to an eMarket draft).
  function finishEtimad(id: TaskAction, n?: string) {
    if (id === 'move-emarket') {
      const flagged = (task.etimadItems ?? []).filter((i) => i.verdict === 'on-etimad');
      const src = task.sourceRequest;
      if (src && flagged.length) {
        addSessionDraft({ title: `${src.title} — Etimad eMarket (${flagged.length} item${flagged.length > 1 ? 's' : ''})`, type: 'souq-etimad', department: tb(task.department, false), budget: '—' }, {
          ...({} as Record<string, unknown>),
          sourceType: 'souq-etimad', projectId: src.projectId, costCenterId: src.costCenterId, tenderingPurpose: src.purpose,
          selectedProjectItemIds: [], scopeIncludes: [],
          boqItems: flagged.map((f) => ({ id: crypto.randomUUID(), projectItem: '', itemName: f.name, itemDescription: '', unitOfMeasure: f.unit || 'Each',
            quantity: f.qty, unitPrice: f.unitPrice, deliveryDate: '', purchaseType: 'product', productId: '', supplier: '',
            lineTotal: f.qty !== '' && f.unitPrice !== '' ? Number(f.qty) * Number(f.unitPrice) : '' })),
        } as never);
      }
      finishEtimadReview(task.id, 'move', n);
    } else finishEtimadReview(task.id, id === 'complete' ? 'accept' : 'return', n);
  }
  const [pending, setPending] = useState<ActionDef | null>(null);
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');

  const comp = useMemo(() => completionStatus(task), [task]);
  const d = dueInfo(task);
  const blocked = isBlockedFn(task);
  const terminal = task.state === 'completed' || task.state === 'rejected' || task.state === 'cancelled';
  const acts = actionsFor(task);

  function run(a: ActionDef) {
    if (a.needsNote || a.confirm) { setPending(a); setNote(''); return; }
    if (task.type === 'etimad-review') { finishEtimad(a.id); return; }
    decide(task.id, a.id as Parameters<typeof decide>[1]);
  }
  function confirmPending() {
    if (!pending) return;
    if (pending.needsNote && !note.trim()) return;
    if (task.type === 'etimad-review') { finishEtimad(pending.id, note.trim() || undefined); setPending(null); setNote(''); return; }
    decide(task.id, pending.id as Parameters<typeof decide>[1], note.trim() || undefined);
    setPending(null); setNote('');
  }

  return (
    <div className="flex flex-col min-h-0 bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/60">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="lg:hidden mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100">
            <ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <TypeChip type={task.type} isAr={isAr} />
              <StateChip state={task.state} isAr={isAr} />
              <PriorityTag priority={task.priority} isAr={isAr} />
              <span className="text-[11px] text-neutral-400">· {task.id}</span>
            </div>
            <h2 className="mt-1.5 text-[17px] font-bold text-neutral-900 leading-tight">{isAr ? task.titleAr : task.titleEn}</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">{isAr ? task.summaryAr : task.summaryEn}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <span className="inline-flex items-center gap-1.5 text-neutral-600">
                {ENTITY_META[task.entity.kind][isAr ? 'ar' : 'en']} · <span className="font-medium">{task.entity.ref}</span>
              </span>
              <span className={`inline-flex items-center gap-1 ${d.overdue ? 'text-error-700 font-semibold' : d.soon ? 'text-warning-700' : 'text-neutral-600'}`}>
                <ClockIcon className="w-3.5 h-3.5" />
                {t('Due', 'الاستحقاق')} {fmtDate(task.dueAt, isAr)}
                {d.overdue && ` · ${t(`${Math.abs(d.days)}d overdue`, `متأخرة ${Math.abs(d.days)} يوم`)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body + context */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Main */}
          <div className="lg:col-span-2 p-4 sm:p-5 space-y-5 lg:border-e lg:border-neutral-200">
            {blocked && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 flex items-start gap-2.5">
                <ClockIcon className="w-4 h-4 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-neutral-700">{t('Waiting on a prior step', 'بانتظار خطوة سابقة')}</p>
                  {task.joinNote && <p className="text-[12px] text-neutral-500 mt-0.5">{tb(task.joinNote, isAr)}</p>}
                </div>
              </div>
            )}
            {task.parallelGroup && task.joinNote && !blocked && (
              <ParallelNote task={task} tasks={tasks} isAr={isAr} t={t} />
            )}
            <TaskBody task={task} />
          </div>

          {/* Context panel */}
          <aside className="p-4 sm:p-5 space-y-4 bg-neutral-50/40">
            <ContextPanel task={task} isAr={isAr} t={t} />
            <Activity task={task} isAr={isAr} t={t} />
            {!terminal && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">{t('Add a comment', 'إضافة تعليق')}</p>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                  placeholder={t('Write a comment…', 'اكتب تعليقاً…')}
                  className="w-full text-[12.5px] rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
                <div className="mt-1.5 flex justify-end">
                  <Button size="sm" variant="secondary" disabled={!comment.trim()} onClick={() => { addComment(task.id, comment); setComment(''); }}>{t('Comment', 'تعليق')}</Button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Action footer */}
      {!terminal ? (
        <div className="border-t border-neutral-200 bg-white px-4 sm:px-5 py-3">
          {/* Completion status for gated types */}
          {comp.total > 0 && (
            <div className="mb-2.5 flex items-center gap-2 text-[12px]">
              {comp.canComplete
                ? <span className="inline-flex items-center gap-1.5 text-success-700 font-medium"><CheckCircleIcon className="w-4 h-4" />{t(`All ${comp.total} requirements complete`, `اكتملت جميع المتطلبات (${comp.total})`)}</span>
                : <span className="inline-flex items-center gap-1.5 text-warning-700 font-medium"><AlertTriangleIcon className="w-4 h-4" />{t(`${comp.done} of ${comp.total} done — ${comp.missing.length} remaining`, `${comp.done} من ${comp.total} — المتبقي ${comp.missing.length}`)}</span>}
            </div>
          )}
          {!comp.canComplete && comp.missing.length > 0 && (
            <ul className="mb-2.5 flex flex-wrap gap-1.5">
              {comp.missing.slice(0, 4).map((m, i) => <li key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 border border-warning-100">{tb(m, isAr)}</li>)}
            </ul>
          )}

          {pending ? (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-[13px] font-semibold text-neutral-800">{t('Confirm', 'تأكيد')}: {t(pending.label[0], pending.label[1])}</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder={pending.needsNote ? t('Reason (required)…', 'السبب (مطلوب)…') : t('Note (optional)…', 'ملاحظة (اختياري)…')}
                className="mt-2 w-full text-[12.5px] rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setPending(null); setNote(''); }}>{t('Cancel', 'إلغاء')}</Button>
                <Button size="sm" variant={pending.variant === 'danger' ? 'danger' : 'primary'}
                  disabled={pending.needsNote && !note.trim()} onClick={confirmPending}>
                  {t('Confirm', 'تأكيد')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {acts.slice().reverse().map((a) => (
                <Button key={a.id} size="md"
                  variant={a.variant === 'danger' ? 'danger' : a.variant === 'primary' ? 'primary' : 'secondary'}
                  disabled={blocked || (a.gated && !comp.canComplete)}
                  onClick={() => run(a)}>
                  {t(a.label[0], a.label[1])}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-3 flex items-center gap-2">
          <CheckCircleIcon className={`w-4 h-4 ${task.state === 'rejected' ? 'text-error-600' : 'text-success-600'}`} />
          <span className="text-[13px] font-medium text-neutral-700">
            {task.decision ? tb(task.decision, isAr) : t('Completed', 'مكتملة')}
            {task.completedAt && <span className="text-neutral-400 font-normal"> · {fmtDateTime(task.completedAt, isAr)}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function ParallelNote({ task, tasks, isAr, t }: { task: Task; tasks: Task[]; isAr: boolean; t: T }) {
  const group = tasks.filter((x) => x.parallelGroup === task.parallelGroup);
  const done = group.filter((x) => x.state === 'completed').length;
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
      <p className="text-[12.5px] font-semibold text-blue-800">{t('Parallel work', 'عمل متوازٍ')} · {done}/{group.length} {t('complete', 'مكتمل')}</p>
      {task.joinNote && <p className="text-[12px] text-blue-700 mt-0.5">{tb(task.joinNote, isAr)}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {group.map((g) => (
          <span key={g.id} className={`text-[11px] px-2 py-0.5 rounded-full border ${g.state === 'completed' ? 'bg-success-50 text-success-700 border-success-100' : 'bg-white text-neutral-500 border-neutral-200'}`}>
            {personName(g.assignee, isAr)}{g.state === 'completed' ? ' ✓' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function ContextPanel({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const rows: { label: string; value: string; dir?: string }[] = [
    { label: t('Related record', 'السجل المرتبط'), value: `${ENTITY_META[task.entity.kind][isAr ? 'ar' : 'en']} · ${task.entity.ref}` },
    { label: t('Record title', 'عنوان السجل'), value: isAr ? task.entity.titleAr : task.entity.titleEn },
  ];
  if (task.supplier) rows.push({ label: t('Supplier', 'المورّد'), value: tb(task.supplier, isAr) });
  if (task.project) rows.push({ label: t('Project', 'المشروع'), value: tb(task.project, isAr) });
  if (task.amount != null) rows.push({ label: t('Value', 'القيمة'), value: fmtSAR(task.amount), dir: 'ltr' });
  rows.push({ label: t('Requester', 'مقدّم الطلب'), value: personName(task.requester, isAr) });
  rows.push({ label: t('Current owner', 'المالك الحالي'), value: personName(task.assignee, isAr) });
  rows.push({ label: t('Department', 'الإدارة'), value: tb(task.department, isAr) });
  rows.push({ label: t('Process stage', 'مرحلة العملية'), value: isAr ? task.stageAr : task.stageEn });
  rows.push({ label: t('Received', 'الاستلام'), value: fmtDate(task.receivedAt, isAr) });
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">{t('Context', 'السياق')}</p>
      <dl className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-3">
            <dt className="text-[11.5px] text-neutral-500 flex-shrink-0">{r.label}</dt>
            <dd className="text-[12.5px] text-neutral-800 font-medium text-end" dir={r.dir}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800">
        {t('Open full record', 'فتح السجل الكامل')}<ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}

function Activity({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const items = [...task.activity].reverse();
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">{t('Activity & audit', 'النشاط والتدقيق')}</p>
      <ol className="space-y-2.5">
        {items.map((a) => {
          const isDecision = a.kind === 'decision';
          const isComment = a.kind === 'comment';
          return (
            <li key={a.id} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span className={`w-2 h-2 rounded-full mt-1.5 ${isDecision ? 'bg-brand-600' : isComment ? 'bg-blue-400' : 'bg-neutral-300'}`} />
              </div>
              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <InitialsAvatar person={a.actor} className="w-4 h-4 rounded-full" />
                  <span className="text-[12px] font-medium text-neutral-700">{personName(a.actor, isAr)}</span>
                  <span className="text-[10.5px] text-neutral-400">{fmtDateTime(a.at, isAr)}</span>
                </div>
                <p className={`text-[12px] mt-0.5 ${isDecision ? 'font-semibold text-neutral-800' : 'text-neutral-600'}`}>
                  {isDecision && a.decision ? tb(a.decision, isAr) : a.system ? tb(a.system, isAr) : a.text}
                </p>
                {isDecision && a.text && <p className="text-[11.5px] text-neutral-500 mt-0.5">“{a.text}”</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
