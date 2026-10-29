// Munafasat Inbox — task detail workspace (right pane).
// Header with meta + Approve/Reject/Return CTAs, tabbed body (Overview / RFP /
// Activity), and top actions: Comments (side pane), History (task trail), Download PDF.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useLanguage, useT } from '../context/LanguageContext';
import { LOCKED_TECH_DOCS } from '../sections/TechnicalEvaluation';
import { CommentLayer, Commentable, AnchorChip, BubbleIcon, ThreadCard, PencilIcon, flashTarget, type AnchoredComment, type RespondHandlers } from './comments';
import { Badge, Button, FormField, Input, Textarea } from '../components/ui';
import { createPortal } from 'react-dom';
import { ArrowLeftIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon, DownloadIcon, ChevronRightIcon } from '../components/Icons';
import type { Bilingual, Task, TaskAction, Person, RfpDetail } from './types';
import { useInbox, completionStatus, dueInfo, fmtDate, fmtDateTime, fmtSAR } from './store';
import { TaskBody } from './renderers';
import { StateChip, PriorityTag, ENTITY_META, tb } from './meta';

type T = (en: string, ar: string) => string;
const personName = (p: Person, isAr: boolean) => (isAr && p.nameAr ? p.nameAr : p.name);

const AV_COLORS = ['#699843', '#2A6193', '#6A47D6', '#C22C18', '#E08E00', '#517632'];
function Avatar({ name, id, className = 'w-7 h-7' }: { name: string; id: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <span className={`${className} rounded-full inline-flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0`} style={{ background: AV_COLORS[h % AV_COLORS.length] }} aria-hidden>{initials}</span>;
}

function slaInfo(task: Task) {
  const start = +new Date(task.receivedAt);
  const deadline = start + (task.slaHours ?? 72) * 3600000;
  const remMs = deadline - Date.now();
  const remH = Math.round(remMs / 3600000);
  const terminal = task.state === 'completed' || task.state === 'rejected' || task.state === 'cancelled';
  return { deadline, remH, breached: !terminal && remMs < 0, tight: !terminal && remMs >= 0 && remH <= 8 };
}

interface ActionDef { id: TaskAction; label: [string, string]; variant: 'primary' | 'secondary' | 'danger'; needsNote?: boolean; gated?: boolean; decision?: Bilingual }
function actionsFor(task: Task): ActionDef[] {
  if (task.actions?.length) return task.actions.map((a) => ({ id: a.id, label: [a.labelEn, a.labelAr], variant: a.variant, needsNote: a.needsNote, gated: a.gated, decision: a.decision }));
  switch (task.type) {
    case 'approval': return [
      { id: 'approve', label: ['Approve', 'اعتماد'], variant: 'primary' },
      { id: 'return', label: ['Return', 'إعادة'], variant: 'secondary', needsNote: true },
      { id: 'reject', label: ['Reject', 'رفض'], variant: 'danger', needsNote: true },
    ];
    case 'review': return [
      { id: 'complete', label: ['Complete review', 'إنهاء المراجعة'], variant: 'primary', gated: true },
      { id: 'return', label: ['Return', 'إعادة'], variant: 'secondary', needsNote: true },
    ];
    case 'validation': return [
      { id: 'complete', label: ['Validate & complete', 'التحقق والإنهاء'], variant: 'primary', gated: true },
      { id: 'return', label: ['Return', 'إعادة'], variant: 'secondary', needsNote: true },
    ];
    case 'clarification': return [
      { id: 'submit', label: ['Resubmit', 'إعادة التقديم'], variant: 'primary' },
      { id: 'save-draft', label: ['Save draft', 'حفظ مسودة'], variant: 'secondary' },
    ];
    default: return [
      { id: 'submit', label: ['Submit', 'تقديم'], variant: 'primary', gated: true },
      { id: 'save-draft', label: ['Save draft', 'حفظ مسودة'], variant: 'secondary' },
    ];
  }
}

export default function TaskDetail({ task, onBack, onSideOpenChange }: { task: Task; onBack: () => void; onSideOpenChange?: (open: boolean) => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const { decide, addComment, resolveComment, updateRfp } = useInbox();
  const [tab, setTab] = useState<'overview' | 'rfp' | 'activity'>('overview');
  const [side, setSide] = useState<'comments' | 'history' | null>(null);
  const [commentMode, setCommentMode] = useState(false);
  useEffect(() => { setCommentMode(false); }, [task.id]);
  useEffect(() => { if (tab !== 'rfp') setCommentMode(false); }, [tab]);
  const [editEnabled, setEditEnabled] = useState(false);
  useEffect(() => { setEditEnabled(false); }, [task.id]);
  const anchored: AnchoredComment[] = task.activity.filter((a) => a.kind === 'comment' && a.anchor && !a.replyTo)
    .map((a) => ({ id: a.id, anchor: a.anchor!, text: a.text ?? '', author: personName(a.actor, isAr), at: a.at, resolved: a.resolved,
      replies: task.activity.filter((r) => r.replyTo === a.id).map((r) => ({ id: r.id, text: r.text ?? '', author: personName(r.actor, isAr), at: r.at, kind: r.editNote ? 'edit' as const : 'reply' as const })) }));
  const respond: RespondHandlers | undefined = task.respondComments && !['completed', 'rejected', 'cancelled'].includes(task.state) ? {
    onReply: (rootId, text) => { const root = task.activity.find((a) => a.id === rootId); addComment(task.id, text, root?.anchor, rootId); },
    onResolve: (rootId, resolved) => resolveComment(task.id, rootId, resolved),
  } : undefined;
  const renderEdit = (anchorId: string, close: () => void) => {
    if (!task.rfp) return null;
    const spec = editSpecFor(anchorId, task.rfp, isAr);
    if (!spec) return null;
    return <EditForm key={anchorId} spec={spec} isAr={isAr} t={t} onCancel={close} onSave={(vals, changes) => {
      updateRfp(task.id, spec.apply(task.rfp!, vals));
      // Log the edit on each open comment for this target, so the reviewer sees what changed.
      for (const c of anchored.filter((x) => x.anchor.id === anchorId && !x.resolved)) addComment(task.id, changes.join('\n'), c.anchor, c.id, true);
      close(); window.setTimeout(() => flashTarget(anchorId), 60);
    }} />;
  };
  const addAnchored = (anchor: { id: string; label: Bilingual }, text: string) => {
    addComment(task.id, text, anchor);
    // Office-style: the comments pane opens once the first comment lands.
    window.setTimeout(() => setSide((s) => s ?? 'comments'), 150);
  };
  const jumpTo = (id: string) => { setTab('rfp'); window.setTimeout(() => flashTarget(id), 120); };
  const toggleSide = (s: 'comments' | 'history') => setSide((prev) => (prev === s ? null : s));
  useEffect(() => { onSideOpenChange?.(side !== null); }, [side, onSideOpenChange]);
  const [pending, setPending] = useState<ActionDef | null>(null);
  const [note, setNote] = useState('');

  const comp = useMemo(() => completionStatus(task), [task]);
  const d = dueInfo(task);
  const sla = slaInfo(task);
  const awaiting = task.state === 'waiting' && !!task.reviewComments && !task.respondComments; // returned, waiting on the requester
  const terminal = task.state === 'completed' || task.state === 'rejected' || task.state === 'cancelled' || awaiting;
  const acts = actionsFor(task);

  function run(a: ActionDef) {
    if (a.id === 'save-draft') { decide(task.id, 'save-draft'); return; }
    setPending(a); setNote('');
  }
  function confirmPending(n: string) {
    if (!pending) return;
    if (pending.needsNote && !n) return;
    decide(task.id, pending.id as Parameters<typeof decide>[1], n || undefined, pending.decision);
    setPending(null); setNote('');
  }
  void note;

  const TABS: { key: typeof tab; en: string; ar: string }[] = [
    { key: 'overview', en: 'Required action', ar: 'الإجراء المطلوب' },
    { key: 'rfp', en: 'RFP details', ar: 'تفاصيل المنافسة' },
    { key: 'activity', en: 'Activity', ar: 'النشاط' },
  ];

  return (
    <div className="relative flex h-full min-h-0 bg-neutral-50">
      {/* ── Detail column ─────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0 flex flex-col">
      {/* Top bar — record id + mobile back */}
      <div className="flex items-center gap-2 px-4 sm:px-6 h-12 border-b border-neutral-200 bg-white flex-shrink-0">
        <button onClick={onBack} className="sm:hidden inline-flex items-center gap-1 text-[13px] font-medium text-neutral-600 hover:text-neutral-900">
          <ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />{t('Back', 'رجوع')}
        </button>
        <span className="text-[12px] text-neutral-400 font-medium">{task.id}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header card */}
        <div className="@container bg-white border-b border-neutral-200 px-4 sm:px-6 pt-5 pb-5">
          {/* Row 1 — task name · CTAs */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h2 className="min-w-0 flex-1 text-[20px] font-bold text-neutral-900 leading-snug">{isAr ? task.titleAr : task.titleEn}</h2>
            {!terminal && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {acts.map((a) => (
                  <Button key={a.id} size="md"
                    variant={a.variant === 'danger' ? 'danger' : a.variant === 'primary' ? 'primary' : 'secondary'}
                    disabled={a.gated && !comp.canComplete}
                    onClick={() => run(a)}>
                    {t(a.label[0], a.label[1])}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {/* Row 2 — description */}
          <p className="mt-1.5 text-[13px] text-neutral-500 leading-relaxed max-w-3xl">{isAr ? task.summaryAr : task.summaryEn}</p>

          {/* Row 3 — key facts: label on top, value below */}
          <dl className="mt-4 grid grid-cols-2 @[520px]:grid-cols-4 @[860px]:grid-cols-[0.95fr_0.85fr_0.95fr_0.8fr_1.2fr_1.7fr_0.95fr] gap-px bg-neutral-200 rounded-xl border border-neutral-200 overflow-hidden">
            {[
              { k: t('Created', 'تاريخ الإنشاء'), v: <span className="tabular-nums">{fmtDate(task.receivedAt, isAr)}</span> },
              { k: t('Status', 'الحالة'), v: <StateChip state={task.state} isAr={isAr} /> },
              { k: t('SLA left', 'المتبقي من SLA'), v: <SlaValue sla={sla} t={t} terminal={terminal} /> },
              { k: t('Priority', 'الأولوية'), v: <PriorityTag priority={task.priority} isAr={isAr} /> },
              { k: t('Department', 'الإدارة الطالبة'), v: <span className="truncate">{tb(task.department, isAr)}</span> },
              { k: t('Requester', 'مقدّم الطلب'), v: <span className="inline-flex items-center gap-1.5 min-w-0"><Avatar name={task.requester.name} id={task.requester.id} className="w-5 h-5" /><span className="truncate">{personName(task.requester, isAr)}</span></span> },
              { k: t('Due date', 'الاستحقاق'), v: <span className={`tabular-nums ${d.overdue ? 'text-error-700' : ''}`}>{fmtDate(task.dueAt, isAr)}</span> },
            ].map((c, i) => (
              <div key={i} className={`bg-neutral-50 px-3 py-2.5 min-w-0 ${i === 6 ? 'col-span-2 @[860px]:col-span-1' : ''}`}>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400 truncate">{c.k}</dt>
                <dd className="mt-1 text-[13px] font-semibold text-neutral-800 min-h-[22px] flex items-center min-w-0 whitespace-nowrap">{c.v}</dd>
              </div>
            ))}
          </dl>

          {/* Row 4 — project · PR amount */}
          <div className="mt-3 grid grid-cols-1 @[560px]:grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0"><FolderGlyph className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{t('Project', 'المشروع')}</p>
                <p className="text-[15px] font-bold text-neutral-900 truncate">{task.project ? tb(task.project, isAr) : '—'}</p>
                <p className="text-[11.5px] text-neutral-500 truncate">{isAr ? task.entity.titleAr : task.entity.titleEn} · <span dir="ltr">{task.entity.ref}</span></p>
              </div>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 text-[11px] font-bold">SAR</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-brand-700/80">{t('PR amount', 'قيمة طلب الشراء')}</p>
                <p className="text-[19px] font-bold text-brand-800 tabular-nums leading-tight whitespace-nowrap" dir="ltr">{task.amount != null ? fmtSAR(task.amount) : '—'}</p>
                {task.amount != null && <p className="text-[11.5px] text-brand-700/80 tabular-nums" dir="ltr">{t('Incl. VAT', 'شامل الضريبة')} {fmtSAR(task.amount * 1.15)}</p>}
              </div>
            </div>
          </div>

          {awaiting && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-warning-50 border border-warning-200 px-3.5 py-2.5">
              <ClockIcon className="w-4 h-4 text-warning-700 flex-shrink-0" />
              <span className="text-[13px] text-warning-800"><span className="font-semibold">{t(`Returned to ${task.requester.name}`, `أُعيد إلى ${task.requester.nameAr ?? task.requester.name}`)}</span> — {t('waiting for them to respond to your comments. The task comes back to you when they resubmit.', 'بانتظار ردهم على تعليقاتك. تعود المهمة إليك عند إعادة التقديم.')}</span>
            </div>
          )}
          {terminal && !awaiting && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
              <CheckCircleIcon className={`w-4 h-4 ${task.state === 'rejected' ? 'text-error-600' : 'text-success-600'}`} />
              <span className="text-[13px] font-medium text-neutral-700">{task.decision ? tb(task.decision, isAr) : t('Completed', 'مكتملة')}{task.completedAt && <span className="text-neutral-400 font-normal"> · {fmtDateTime(task.completedAt, isAr)}</span>}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 border-b border-neutral-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-1">
            {TABS.map((tb2) => (
              <button key={tb2.key} type="button" onClick={() => setTab(tb2.key)}
                className={`px-3.5 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${tab === tb2.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
                {isAr ? tb2.ar : tb2.en}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6">
          {tab === 'overview' && <RequiredAction task={task} isAr={isAr} t={t} onReview={task.reviewComments ? () => { setTab('rfp'); if (!task.respondComments) setCommentMode(true); } : undefined} commentCount={anchored.length} resolvedCount={anchored.filter((c) => c.resolved).length} />}
          {tab === 'rfp' && (task.reviewComments && task.rfp ? (
            <CommentLayer mode={!task.respondComments && commentMode && !terminal} isAr={isAr} comments={anchored} onAdd={addAnchored} authorLabel={personName(task.assignee, isAr)}
              respond={respond} editing={!!respond && editEnabled} renderEdit={respond ? renderEdit : undefined}>
              {task.respondComments
                ? <RespondBar editOn={editEnabled} onToggleEdit={() => setEditEnabled((v) => !v)} total={anchored.length} resolved={anchored.filter((c) => c.resolved).length} t={t} disabled={!respond} onOpenComments={() => setSide('comments')} />
                : <ReviewBar on={commentMode} onToggle={() => setCommentMode((m) => !m)} count={anchored.length} isAr={isAr} t={t} disabled={terminal} onOpenComments={() => setSide('comments')} />}
              <RfpTab rfp={task.rfp} amount={task.amount} isAr={isAr} t={t} />
            </CommentLayer>
          ) : <RfpTab rfp={task.rfp} amount={task.amount} isAr={isAr} t={t} />)}
          {tab === 'activity' && <ActivityTab task={task} isAr={isAr} t={t} onComment={(x) => addComment(task.id, x)} terminal={terminal} onJump={jumpTo} />}
        </div>
      </div>
      {tab === 'rfp' && task.rfp && <JumpFab sections={rfpSections(task.rfp)} isAr={isAr} t={t} />}
      </div>

      {/* ── Right pane: Comments / Approval flow ─────────────────
          Opens to the LEFT of the icon strip. Inline third pane on md+,
          slide-over on smaller screens. */}
      {side && (
        <>
          <div className="md:hidden absolute inset-y-0 start-0 end-16 bg-black/20 z-20" onClick={() => setSide(null)} />
          <aside className="absolute inset-y-0 end-16 z-30 w-[320px] max-w-[80%] bg-white border-s border-neutral-200 shadow-2xl flex flex-col slide-up
                            md:static md:z-auto md:w-[320px] md:max-w-none md:shadow-none lg:w-[360px]">
            {/* Pane header — switch between the two panes + collapse */}
            <div className="flex items-center justify-between gap-2 ps-3 pe-2 h-12 bg-[#17233A] flex-shrink-0">
              <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
                <PaneTab active={side === 'comments'} onClick={() => setSide('comments')} icon={<CommentGlyph className="w-3.5 h-3.5" />}>{t('Comments', 'التعليقات')}</PaneTab>
                <PaneTab active={side === 'history'} onClick={() => setSide('history')} icon={<HistoryGlyph className="w-3.5 h-3.5" />}>{t('Approval flow', 'مسار الاعتماد')}</PaneTab>
              </div>
              <button onClick={() => setSide(null)} title={t('Collapse panel', 'طي اللوحة')}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white flex-shrink-0">
                <PanelCollapseGlyph className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              {side === 'comments'
                ? <CommentsPanel task={task} isAr={isAr} t={t} onSend={(x) => addComment(task.id, x)} disabled={terminal} onJump={jumpTo} threads={anchored} respond={respond} />
                : <TrailPanel task={task} isAr={isAr} t={t} />}
            </div>
          </aside>
        </>
      )}

      {pending && <DecisionModal task={task} action={pending} isAr={isAr} t={t} onCancel={() => setPending(null)} onConfirm={confirmPending} />}

      {/* ── Right icon rail (always visible) — dark navy to anchor the workspace ── */}
      <nav className="w-16 flex-shrink-0 bg-[#17233A] flex flex-col items-center pt-3 pb-3 gap-1.5 z-40" aria-label={t('Task tools', 'أدوات المهمة')}>
        <StripBtn dock active={side === 'comments'} onClick={() => toggleSide('comments')} label={t('Comments', 'التعليقات')} count={task.activity.filter((a) => a.kind === 'comment').length} icon={<CommentGlyph className="w-[18px] h-[18px]" />} />
        <StripBtn active={side === 'history'} onClick={() => toggleSide('history')} label={t('History', 'السجل')} icon={<HistoryGlyph className="w-[18px] h-[18px]" />} />
        <div className="w-8 h-px bg-white/10 my-1.5" />
        <StripBtn onClick={() => downloadTaskPdf(task)} label={t('PDF', 'PDF')} icon={<DownloadIcon className="w-[18px] h-[18px]" />} />
      </nav>
    </div>
  );
}

function StripBtn({ active, onClick, label, icon, count, dock }: { active?: boolean; onClick: () => void; label: string; icon: React.ReactNode; count?: number; dock?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} aria-pressed={active} data-comment-dock={dock ? 'rail' : undefined}
      className={`relative w-[60px] py-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${active ? 'bg-white text-[#17233A] shadow-sm' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}>
      {icon}
      <span className="text-[9.5px] font-semibold leading-none tracking-tight">{label}</span>
      {!!count && <span className="absolute top-1 end-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9.5px] font-bold flex items-center justify-center">{count}</span>}
    </button>
  );
}

function PaneTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors ${active ? 'bg-white text-[#17233A] shadow-sm' : 'text-white/70 hover:text-white'}`}>
      {icon}{children}
    </button>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────
interface BandCell { label: string; value: React.ReactNode; emphasis?: boolean; dir?: 'ltr'; grow?: boolean; avatar?: Person; danger?: boolean }
function SummaryBand({ cells }: { cells: BandCell[] }) {
  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white overflow-hidden flex flex-col sm:flex-row">
      {cells.map((c, i) => (
        <div key={i} className={`px-4 py-2.5 min-w-0 ${c.grow ? 'sm:flex-[1.3]' : 'sm:flex-1'} ${i > 0 ? 'border-t sm:border-t-0 sm:border-s border-neutral-100' : ''}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 whitespace-nowrap">{c.label}</p>
          <p className={`mt-0.5 truncate flex items-center gap-1.5 ${c.emphasis ? 'text-[17px] font-bold text-brand-700 tabular-nums whitespace-nowrap' : `text-[13px] font-semibold ${c.danger ? 'text-error-700' : 'text-neutral-800'}`}`} dir={c.dir}>
            {c.avatar && <Avatar name={c.avatar.name} id={c.avatar.id} className="w-5 h-5" />}
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function SlaValue({ sla, t, terminal }: { sla: ReturnType<typeof slaInfo>; t: T; terminal: boolean }) {
  if (terminal) return <span className="text-neutral-400">—</span>;
  const cls = sla.breached ? 'text-error-700' : sla.tight ? 'text-warning-700' : 'text-neutral-800';
  const h = Math.abs(sla.remH); const txt = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
  return <span className={`inline-flex items-center gap-1 tabular-nums ${cls}`}><ClockIcon className="w-3.5 h-3.5" />{sla.breached ? t(`${txt} over`, `متأخرة ${txt}`) : t(`${txt} left`, `متبقٍ ${txt}`)}</span>;
}
function FolderGlyph({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
}

const PALETTE = ['#699843', '#2A6193', '#6A47D6', '#E08E00', '#C22C18', '#3378B5', '#517632', '#868D80'];

function Donut({ segments, size = 128, stroke = 20 }: { segments: { value: number; color: string }[]; size?: number; stroke?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF1EB" strokeWidth={stroke} />
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {segments.map((s, i) => {
          const len = (s.value / total) * c; const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />
          ); off += len; return el;
        })}
      </g>
    </svg>
  );
}

type RfpView = 'table' | 'chart';

function RfpSection({ id, title, meta, views, children, label }: { id: string; title: string; label?: Bilingual; meta?: string; views?: { table: React.ReactNode; chart: React.ReactNode }; children?: React.ReactNode }) {
  const { isAr } = useLanguage();
  const t = useT();
  const [open, setOpen] = useState(true);
  const [view, setView] = useState<RfpView>('table');
  return (
    <Commentable id={`sec-${id}`} label={label ?? title}><section id={`rfp-${id}`} className="scroll-mt-16 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 pe-3 sm:pe-4 hover:bg-neutral-50/70 transition-colors">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-2.5 ps-4 sm:ps-5 py-3 text-start">
          <ChevronRightIcon className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : isAr ? 'rotate-180' : ''}`} />
          <CheckCircleIcon className="w-4 h-4 text-success-600 flex-shrink-0" />
          <h4 className="text-[13px] font-bold text-neutral-800 truncate">{title}</h4>
          {meta && <span className="text-[11.5px] text-neutral-400 truncate hidden sm:inline" dir="auto">· {meta}</span>}
        </button>
        {views && (
          <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-white p-0.5 flex-shrink-0" role="group" aria-label={t('View', 'العرض')}>
            {(['table', 'chart'] as const).map((v) => (
              <button key={v} type="button" onClick={() => { setView(v); setOpen(true); }} aria-pressed={view === v}
                title={v === 'table' ? t('Table view', 'عرض الجدول') : t('Chart view', 'عرض الرسم البياني')}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${view === v ? 'bg-brand-50 text-brand-700' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'}`}>
                {v === 'table' ? <TableGlyph className="w-4 h-4" /> : <ChartGlyph className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {open && <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-neutral-100">{views ? views[view] : children}</div>}
    </section></Commentable>
  );
}

function rfpSections(rfp: RfpDetail): { id: string; en: string; ar: string }[] {
  return [
    { id: 'overview', en: 'Overview', ar: 'نظرة عامة' },
    { id: 'scope', en: 'Scope', ar: 'النطاق' },
    ...(rfp.boq.length ? [{ id: 'cost', en: 'Bill of quantities', ar: 'جدول الكميات' }] : []),
    ...(rfp.payment.length ? [{ id: 'payment', en: 'Payment', ar: 'الدفعات' }] : []),
    ...(rfp.evaluation.length ? [{ id: 'evaluation', en: 'Evaluation', ar: 'التقييم' }] : []),
    ...(rfp.qualCriteria?.length ? [{ id: 'qualification', en: 'Qualification', ar: 'التأهيل' }] : []),
    ...(rfp.documents.length ? [{ id: 'documents', en: 'Documents', ar: 'المستندات' }] : []),
  ];
}

const TH = 'px-3 py-2 font-medium text-[11px] uppercase tracking-wide text-neutral-500';
const lineTotalOf = (l: RfpDetail['boq'][number]) => (Number(l.qty) || 1) * l.unitPrice;

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">{children}</p>;
}

function CommitteeChips({ members, isAr }: { members?: RfpDetail['evalCommittee']; isAr: boolean }) {
  if (!members?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m, i) => (
        <div key={i} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/60 ps-1.5 pe-3 py-1.5">
          <Avatar name={m.name} id={m.name} className="w-7 h-7" />
          <div className="min-w-0 leading-tight">
            <p className="text-[12.5px] font-semibold text-neutral-800">{isAr ? m.nameAr : m.name}</p>
            <p className="text-[11px] text-neutral-500">{isAr ? `${m.roleAr} · ${m.deptAr}` : `${m.roleEn} · ${m.deptEn}`}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RfpTab({ rfp, amount, isAr, t }: { rfp?: RfpDetail; amount?: number; isAr: boolean; t: T }) {
  if (!rfp) return <div className="rounded-xl border border-neutral-200 bg-white p-6 text-[13px] text-neutral-500 shadow-sm">{t('No RFP record linked to this task.', 'لا يوجد سجل منافسة مرتبط بهذه المهمة.')}</div>;
  const boqTotal = rfp.boq.reduce((s, l) => s + lineTotalOf(l), 0);
  const estValue = boqTotal > 0 ? boqTotal : (amount ?? 0);
  const costSegs = rfp.boq.map((l, i) => ({ value: lineTotalOf(l), color: PALETTE[i % PALETTE.length], label: isAr ? l.itemAr : l.itemEn }));
  const evalMax = Math.max(1, ...rfp.evaluation.map((c) => c.weight));
  const evalTotal = rfp.evaluation.reduce((s, c) => s + c.weight, 0);
  const payTotal = rfp.payment.reduce((s, p) => s + p.pct, 0);
  const qualTotal = (rfp.qualCriteria ?? []).reduce((s, c) => s + c.pct, 0);
  const budgets = Array.from(new Set(rfp.boq.map((l) => l.budgetEn ?? '')));

  const stats: { label: string; value: string; dir?: 'ltr' }[] = [];
  if (estValue > 0) stats.push({ label: t('Estimated value', 'القيمة التقديرية'), value: fmtSAR(estValue), dir: 'ltr' });
  if (rfp.boq.length) stats.push({ label: t('BOQ line items', 'بنود الجدول'), value: String(rfp.boq.length) });
  if (rfp.payment.length) stats.push({ label: t('Payment stages', 'مراحل الدفع'), value: String(rfp.payment.length) });
  if (rfp.evaluation.length) stats.push({ label: t('Eval. criteria', 'معايير التقييم'), value: String(rfp.evaluation.length) });

  // ── Bill of quantities ──
  const boqChart = (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="flex items-center gap-4 lg:flex-col lg:items-center flex-shrink-0">
        <div className="relative">
          <Donut segments={costSegs} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] uppercase tracking-wide text-neutral-400">{t('Total', 'الإجمالي')}</span>
            <span className="text-[13px] font-bold text-neutral-900 tabular-nums" dir="ltr">{new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(boqTotal)}</span>
            <span className="text-[9px] text-neutral-400">SAR</span>
          </div>
        </div>
        <ul className="space-y-1">
          {costSegs.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11.5px] text-neutral-600">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              <span className="truncate max-w-[150px]">{s.label}</span>
              <span className="ms-auto font-semibold text-neutral-700 tabular-nums">{Math.round((s.value / (boqTotal || 1)) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 min-w-0 rounded-xl border border-neutral-200 overflow-hidden self-start">
        <table className="w-full text-sm">
          <thead><tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wide text-neutral-500">
            <th className="text-start ps-3 pe-2 py-2 font-medium">{t('Item', 'البند')}</th>
            <th className="px-2 py-2 font-medium w-28 text-center">{t('Qty', 'الكمية')}</th>
            <th className="px-2 py-2 font-medium w-40 text-end">{t('Line total', 'الإجمالي')}</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rfp.boq.map((l, i) => (
              <Commentable key={i} id={`boq-${i}`} label={{ en: l.itemEn, ar: l.itemAr }}><tr className="bg-white">
                <td className="ps-3 pe-2 py-2 text-[12.5px] text-neutral-800"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />{isAr ? l.itemAr : l.itemEn}</span></td>
                <td className="px-2 py-2 text-center text-[12px] text-neutral-600 whitespace-nowrap">{l.qty} {l.unit}</td>
                <td className="px-2 py-2 text-end text-[12.5px] font-semibold text-neutral-800 tabular-nums whitespace-nowrap" dir="ltr">{fmtSAR(lineTotalOf(l))}</td>
              </tr></Commentable>
            ))}
          </tbody>
          <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
            <tr><td className="ps-3 pe-2 py-1.5 text-end text-[12px] text-neutral-500" colSpan={2}>{t('Subtotal', 'المجموع الفرعي')}</td><td className="px-2 py-1.5 text-end text-[12.5px] font-semibold tabular-nums text-neutral-700 whitespace-nowrap" dir="ltr">{fmtSAR(boqTotal)}</td></tr>
            <tr><td className="ps-3 pe-2 py-1.5 text-end text-[12px] text-neutral-500" colSpan={2}>{t('VAT (15%)', 'ضريبة القيمة المضافة (15%)')}</td><td className="px-2 py-1.5 text-end text-[12.5px] font-semibold tabular-nums text-neutral-700 whitespace-nowrap" dir="ltr">{fmtSAR(boqTotal * 0.15)}</td></tr>
            <tr className="border-t border-neutral-200"><td className="ps-3 pe-2 py-2 text-end text-[12.5px] font-bold text-neutral-800" colSpan={2}>{t('Grand total', 'الإجمالي الكلي')}</td><td className="px-2 py-2 text-end text-[13px] font-bold tabular-nums text-brand-700 whitespace-nowrap" dir="ltr">{fmtSAR(boqTotal * 1.15)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
  const boqTable = (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full min-w-[860px] text-[12.5px]">
        <thead><tr className="bg-neutral-50 border-b border-neutral-200">
          <th className={`${TH} text-center w-10`}>#</th>
          <th className={`${TH} text-start`}>{t('Item', 'البند')}</th>
          <th className={`${TH} text-start`}>{t('Category', 'التصنيف')}</th>
          <th className={`${TH} text-start`}>{t('Delivery', 'التسليم')}</th>
          <th className={`${TH} text-end`}>{t('Qty', 'الكمية')}</th>
          <th className={`${TH} text-end`}>{t('Unit price', 'سعر الوحدة')}</th>
          <th className={`${TH} text-end`}>{t('Total', 'الإجمالي')}</th>
        </tr></thead>
        <tbody>
          {budgets.map((b, bi) => {
            const before = budgets.slice(0, bi).reduce((n, x) => n + rfp.boq.filter((l) => (l.budgetEn ?? '') === x).length, 0);
            const lines = rfp.boq.filter((l) => (l.budgetEn ?? '') === b).map((l, k) => ({ l, i: before + k }));
            const sub = lines.reduce((s, { l }) => s + lineTotalOf(l), 0);
            const first = lines[0].l;
            return (
              <Fragment key={b || 'none'}>
                {b && (
                  <tr className="bg-neutral-50/80 border-y border-neutral-200">
                    <td colSpan={6} className="px-3 py-1.5 text-[12px] font-semibold text-neutral-700">{isAr ? first.budgetAr : first.budgetEn} <span className="font-normal text-neutral-400">· {lines.length} {lines.length > 1 ? t('items', 'بنود') : t('item', 'بند')}</span></td>
                    <td className="px-3 py-1.5 text-end text-[12px] font-semibold tabular-nums text-neutral-700" dir="ltr">{fmtSAR(sub)}</td>
                  </tr>
                )}
                {lines.map(({ l, i }) => (
                  <Commentable key={i} id={`boq-${i}`} label={{ en: l.itemEn, ar: l.itemAr }}><tr className="bg-white border-b border-neutral-100 align-top">
                    <td className="px-3 py-2.5 text-center text-neutral-400 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 max-w-[320px]">
                      <p className="font-semibold text-neutral-800">{isAr ? l.itemAr : l.itemEn}</p>
                      {(l.descEn || l.descAr) && <p className="text-[11.5px] text-neutral-500 mt-0.5 leading-snug">{isAr ? l.descAr : l.descEn}</p>}
                    </td>
                    <td className="px-3 py-2.5">{l.category && <Badge variant={l.category === 'Service' ? 'services' : 'consumables'}>{l.category === 'Service' ? t('Service', 'خدمة') : t('Material', 'مواد')}</Badge>}</td>
                    <td className="px-3 py-2.5 text-neutral-600 tabular-nums whitespace-nowrap" dir="ltr">{l.delivery ?? '—'}</td>
                    <td className="px-3 py-2.5 text-end text-neutral-700 tabular-nums whitespace-nowrap">{l.qty} <span className="text-neutral-400">{l.unit}</span></td>
                    <td className="px-3 py-2.5 text-end text-neutral-600 tabular-nums whitespace-nowrap" dir="ltr">{fmtSAR(l.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-end font-semibold text-neutral-900 tabular-nums whitespace-nowrap" dir="ltr">{fmtSAR(lineTotalOf(l))}</td>
                  </tr></Commentable>
                ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-50 border-t border-neutral-200"><td colSpan={6} className="px-3 py-2 text-end text-neutral-500">{t('Subtotal', 'المجموع الفرعي')}</td><td className="px-3 py-2 text-end tabular-nums font-medium" dir="ltr">{fmtSAR(boqTotal)}</td></tr>
          <tr className="bg-neutral-50"><td colSpan={6} className="px-3 py-1.5 text-end text-neutral-500">{t('VAT (15%)', 'ضريبة القيمة المضافة (15%)')}</td><td className="px-3 py-1.5 text-end tabular-nums font-medium" dir="ltr">{fmtSAR(boqTotal * 0.15)}</td></tr>
          <tr className="bg-brand-50 border-t border-brand-200 text-[13px]"><td colSpan={6} className="px-3 py-2 text-end font-bold text-brand-800">{t('Grand total', 'الإجمالي الكلي')}</td><td className="px-3 py-2 text-end tabular-nums font-bold text-brand-800" dir="ltr">{fmtSAR(boqTotal * 1.15)}</td></tr>
        </tfoot>
      </table>
    </div>
  );

  // ── Payment schedule ──
  const payChart = (
    <>
      <div className="h-2 rounded-full overflow-hidden flex mb-4 bg-neutral-100">
        {rfp.payment.map((p, i) => <div key={i} style={{ width: `${p.pct}%`, background: PALETTE[i % PALETTE.length] }} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rfp.payment.map((p, i) => (
          <Commentable key={i} id={`pay-${i}`} label={{ en: p.stageEn, ar: p.stageAr }}><div className="rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
              <span className="text-[12.5px] font-semibold text-neutral-700 truncate">{isAr ? p.stageAr : p.stageEn}</span>
            </div>
            <p className="text-[20px] font-bold text-neutral-900 mt-1.5 tabular-nums">{p.pct}%</p>
            {estValue > 0 && <p className="text-[12px] text-neutral-500 tabular-nums" dir="ltr">{fmtSAR((p.pct / 100) * estValue)}</p>}
          </div></Commentable>
        ))}
      </div>
    </>
  );
  const payTable = (
    <>
      <div className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold mb-3 ${payTotal === 100 ? 'text-success-600' : 'text-warning-600'}`}>
        {payTotal === 100 ? <CheckCircleIcon className="w-4 h-4" /> : <AlertTriangleIcon className="w-4 h-4" />}
        {t(`Payment stages ${payTotal === 100 ? 'valid' : 'incomplete'} (${payTotal}%)`, `مراحل الدفع ${payTotal === 100 ? 'صحيحة' : 'ناقصة'} (${payTotal}%)`)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead><tr className="bg-neutral-50 border-b border-neutral-200">
            <th className={`${TH} text-center w-10`}>#</th>
            <th className={`${TH} text-start`}>{t('Stage', 'المرحلة')}</th>
            <th className={`${TH} text-start`}>{t('Deliverable / condition', 'المخرج / الشرط')}</th>
            <th className={`${TH} text-start`}>{t('Due', 'الاستحقاق')}</th>
            <th className={`${TH} text-end`}>%</th>
            <th className={`${TH} text-end`}>{t('Amount', 'المبلغ')}</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rfp.payment.map((p, i) => (
              <Commentable key={i} id={`pay-${i}`} label={{ en: p.stageEn, ar: p.stageAr }}><tr className="bg-white align-top">
                <td className="px-3 py-2.5 text-center"><span className="inline-flex w-5 h-5 rounded-md text-white text-[10.5px] font-bold items-center justify-center" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span></td>
                <td className="px-3 py-2.5 font-semibold text-neutral-800">{isAr ? p.stageAr : p.stageEn}</td>
                <td className="px-3 py-2.5 text-neutral-600 leading-snug">{(isAr ? p.descAr : p.descEn) ?? '—'}</td>
                <td className="px-3 py-2.5 text-neutral-600 whitespace-nowrap">{(isAr ? p.dueAr : p.due) ?? '—'}</td>
                <td className="px-3 py-2.5 text-end font-semibold text-neutral-800 tabular-nums">{p.pct}%</td>
                <td className="px-3 py-2.5 text-end font-semibold text-neutral-900 tabular-nums whitespace-nowrap" dir="ltr">{estValue > 0 ? fmtSAR((p.pct / 100) * estValue) : '—'}</td>
              </tr></Commentable>
            ))}
          </tbody>
          <tfoot><tr className="bg-brand-50 border-t border-brand-200 text-[13px]">
            <td colSpan={4} className="px-3 py-2 text-end font-bold text-brand-800">{t('Total', 'الإجمالي')}</td>
            <td className="px-3 py-2 text-end font-bold text-brand-800 tabular-nums">{payTotal}%</td>
            <td className="px-3 py-2 text-end font-bold text-brand-800 tabular-nums" dir="ltr">{estValue > 0 ? fmtSAR((payTotal / 100) * estValue) : '—'}</td>
          </tr></tfoot>
        </table>
      </div>
    </>
  );

  // ── Evaluation ──
  const evalChart = (
    <div className="space-y-2.5">
      {rfp.evaluation.map((c, i) => (
        <Commentable key={i} id={`eval-${i}`} label={{ en: c.criterionEn, ar: c.criterionAr }}><div>
          <div className="flex items-center justify-between text-[12.5px] mb-1">
            <span className="text-neutral-700">{isAr ? c.criterionAr : c.criterionEn}</span>
            <span className="font-semibold text-neutral-800 tabular-nums">{c.weight}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.weight / evalMax) * 100}%` }} />
          </div>
        </div></Commentable>
      ))}
    </div>
  );
  const evalTable = (
    <div className="space-y-5">
      {rfp.evalCommittee?.length ? <div><SubLabel>{t('Evaluation committee', 'لجنة التقييم')}</SubLabel><CommitteeChips members={rfp.evalCommittee} isAr={isAr} /></div> : null}
      <Commentable id="tech-docs" label={{ en: 'Technical documents', ar: 'الوثائق الفنية' }}><div className="rounded-lg">
        <SubLabel>{t('Technical documents', 'الوثائق الفنية')}</SubLabel>
        <div className="flex flex-wrap gap-1.5">
          {LOCKED_TECH_DOCS.map((d, i) => (
            <span key={`l-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] bg-neutral-100 text-neutral-600 border border-neutral-200" title={t('Required in every tender', 'مطلوبة في كل منافسة')}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-neutral-400"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              {isAr ? d.ar : d.en}
            </span>
          ))}
          {(rfp.techDocs ?? []).map((d, i) => (
            <span key={`u-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] bg-white text-neutral-700 border border-neutral-200">{isAr ? d.ar : d.en}</span>
          ))}
        </div>
      </div></Commentable>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MiniStat label={t('Technical share', 'الوزن الفني')} value={`${rfp.techSplit ?? 0}%`} />
        <MiniStat label={t('Commercial share', 'الوزن المالي')} value={`${100 - (rfp.techSplit ?? 0)}%`} />
        <MiniStat label={t('Technical passing score', 'درجة الاجتياز الفني')} value={`${rfp.techPassing ?? 0}%`} />
      </div>
      {rfp.techRequirements?.length ? (
        <div>
          <SubLabel>{t('Technical requirements', 'المتطلبات الفنية')}</SubLabel>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-[12.5px]">
              <thead><tr className="bg-neutral-50 border-b border-neutral-200">
                <th className={`${TH} text-center w-10`}>#</th>
                <th className={`${TH} text-start w-56`}>{t('Requirement', 'المتطلب')}</th>
                <th className={`${TH} text-start`}>{t('Description', 'الوصف')}</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {rfp.techRequirements.map((r, i) => (
                  <Commentable key={i} id={`treq-${i}`} label={{ en: r.reqEn, ar: r.reqAr }}><tr className="bg-white align-top">
                    <td className="px-3 py-2.5 text-center text-neutral-400">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-neutral-800">{isAr ? r.reqAr : r.reqEn}</td>
                    <td className="px-3 py-2.5 text-neutral-600 leading-snug">{isAr ? r.descAr : r.descEn}</td>
                  </tr></Commentable>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <div>
        <SubLabel>{t('Evaluation criteria & weights', 'معايير التقييم والأوزان')}</SubLabel>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-[12.5px]">
            <thead><tr className="bg-neutral-50 border-b border-neutral-200">
              <th className={`${TH} text-center w-10`}>#</th>
              <th className={`${TH} text-start w-64`}>{t('Criterion', 'المعيار')}</th>
              <th className={`${TH} text-start`}>{t('How it is scored', 'آلية التقييم')}</th>
              <th className={`${TH} text-end w-24`}>{t('Weight', 'الوزن')}</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rfp.evaluation.map((c, i) => (
                <Commentable key={i} id={`eval-${i}`} label={{ en: c.criterionEn, ar: c.criterionAr }}><tr className="bg-white align-top">
                  <td className="px-3 py-2.5 text-center text-neutral-400">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-neutral-800">{isAr ? c.criterionAr : c.criterionEn}</td>
                  <td className="px-3 py-2.5 text-neutral-600 leading-snug">{(isAr ? c.descAr : c.descEn) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-end font-semibold text-neutral-800 tabular-nums">{c.weight}%</td>
                </tr></Commentable>
              ))}
            </tbody>
            <tfoot><tr className={`border-t border-neutral-200 ${evalTotal === 100 ? 'bg-success-50/50' : 'bg-warning-50/50'}`}>
              <td colSpan={3} className="px-3 py-2 text-end text-[12px] font-semibold text-neutral-600">{t('Total weight', 'إجمالي الأوزان')}</td>
              <td className={`px-3 py-2 text-end font-bold tabular-nums ${evalTotal === 100 ? 'text-success-700' : 'text-warning-700'}`}>{evalTotal}%</td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Qualification ──
  const qualChart = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {(rfp.qualCriteria ?? []).map((m, i) => (
        <Commentable key={i} id={`qual-${i}`} label={{ en: m.nameEn, ar: m.nameAr }}><div className="rounded-xl border border-neutral-200 p-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-[12.5px] font-semibold text-neutral-700 flex-1 min-w-0 truncate">{isAr ? m.nameAr : m.nameEn}</span>
            <span className="text-[18px] font-bold text-neutral-900 tabular-nums">{m.pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden mt-2 mb-3"><div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: PALETTE[i % PALETTE.length] }} /></div>
          <div className="space-y-2">
            {m.subs.map((sb, j) => (
              <div key={j}>
                <div className="flex items-center justify-between gap-2 text-[11.5px]"><span className="text-neutral-600 truncate">{isAr ? sb.nameAr : sb.nameEn}</span><span className="font-semibold text-neutral-700 tabular-nums">{sb.pct}%</span></div>
                <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mt-1"><div className="h-full rounded-full opacity-70" style={{ width: `${sb.pct}%`, background: PALETTE[i % PALETTE.length] }} /></div>
              </div>
            ))}
          </div>
        </div></Commentable>
      ))}
    </div>
  );
  const qualTable = (
    <div className="space-y-5">
      {rfp.qualCommittee?.length ? <div><SubLabel>{t('Qualification committee', 'لجنة التأهيل')}</SubLabel><CommitteeChips members={rfp.qualCommittee} isAr={isAr} /></div> : null}
      {rfp.qualCriteria?.length ? (
        <div>
          <SubLabel>{t('Qualification criteria', 'معايير التأهيل')}</SubLabel>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead><tr className="bg-neutral-50 border-b border-neutral-200">
                <th className={`${TH} text-start`}>{t('Criteria', 'المعايير')}</th>
                <th className={`${TH} text-start w-44`}>{t('Range', 'النطاق')}</th>
                <th className={`${TH} text-end w-24`}>{t('Weight', 'الوزن')}</th>
              </tr></thead>
              <tbody>
                {rfp.qualCriteria.map((m, i) => (
                  <Fragment key={i}>
                    <Commentable id={`qual-${i}`} label={{ en: m.nameEn, ar: m.nameAr }}><tr className="bg-neutral-50/80 border-y border-neutral-200">
                      <td className="px-3 py-2 font-semibold text-neutral-800">{isAr ? m.nameAr : m.nameEn}</td>
                      <td className="px-3 py-2 text-[11px] text-neutral-400 italic">{t('Main category', 'فئة رئيسية')}</td>
                      <td className="px-3 py-2 text-end font-semibold text-neutral-800 tabular-nums">{m.pct}%</td>
                    </tr></Commentable>
                    {m.subs.map((s, j) => (
                      <Commentable key={j} id={`qual-${i}-${j}`} label={{ en: s.nameEn, ar: s.nameAr }}><tr className="bg-white border-b border-neutral-100">
                        <td className="px-3 py-2 ps-7 text-neutral-700"><span className="text-neutral-300 me-1">└</span>{isAr ? s.nameAr : s.nameEn}</td>
                        <td className="px-3 py-2 text-neutral-600" dir="auto">{s.range}</td>
                        <td className="px-3 py-2 text-end text-neutral-700 tabular-nums">{s.pct}%</td>
                      </tr></Commentable>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot><tr className={`border-t border-neutral-200 ${qualTotal === 100 ? 'bg-success-50/50' : 'bg-warning-50/50'}`}>
                <td className="px-3 py-2 text-[12px] font-semibold text-neutral-600">{t('Main criteria total', 'إجمالي المعايير الرئيسية')}</td>
                <td className="px-3 py-2 text-[12px] text-neutral-500">{t('Passing', 'الاجتياز')}: <span className="font-semibold text-neutral-800">{rfp.qualPassing ?? 0}%</span></td>
                <td className={`px-3 py-2 text-end font-bold tabular-nums ${qualTotal === 100 ? 'text-success-700' : 'text-warning-700'}`}>{qualTotal}%</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
        {/* Hero stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <Commentable key={i} id={`stat-${i}`} label={{ en: s.label, ar: s.label }}><div className="rounded-xl border border-neutral-200 bg-white shadow-sm px-4 py-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{s.label}</p>
                <p className="text-[18px] font-bold text-neutral-900 mt-0.5 tabular-nums" dir={s.dir}>{s.value}</p>
              </div></Commentable>
            ))}
          </div>
        )}

        <RfpSection id="overview" title={t('Request overview', 'نظرة عامة على الطلب')} label={{ en: 'Request overview', ar: 'نظرة عامة على الطلب' }}>
          <Commentable id="overview-summary" label={{ en: 'Request overview — title & summary', ar: 'نظرة عامة — العنوان والملخص' }}><div className="rounded-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{rfp.refId}</p>
          <h3 className="text-[16px] font-bold text-neutral-900 mt-0.5">{isAr ? rfp.titleAr : rfp.titleEn}</h3>
          <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">{isAr ? rfp.summaryAr : rfp.summaryEn}</p>
          </div></Commentable>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 border-t border-neutral-100 pt-4">
            {rfp.meta.map((m, i) => (
              <Commentable key={i} id={`meta-${i}`} label={{ en: m.label.en, ar: m.label.ar }}><div className="min-w-0"><dt className="text-[10.5px] uppercase tracking-wide text-neutral-400">{tb(m.label, isAr)}</dt>
                <dd className="text-[13px] font-medium text-neutral-800 truncate mt-0.5" dir={m.dir}>{m.value}</dd></div></Commentable>
            ))}
          </dl>
        </RfpSection>

        <RfpSection id="scope" title={t('Scope of work', 'نطاق العمل')} label={{ en: 'Scope of work', ar: 'نطاق العمل' }}>
          <Commentable id={'scope-summary'} label={{ en: 'Scope of work — summary', ar: 'نطاق العمل — الملخص' }}><p className="text-[13px] text-neutral-700 leading-relaxed">{isAr ? rfp.scopeAr : rfp.scopeEn}</p></Commentable>
          {rfp.scopeBlocks?.length ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {rfp.scopeBlocks.map((b, i) => (
                <Commentable key={i} id={`scope-${i}`} label={{ en: b.headEn, ar: b.headAr }}><div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3.5">
                  <p className="text-[12px] font-bold text-neutral-800 mb-1.5">{isAr ? b.headAr : b.headEn}</p>
                  <ul className="space-y-1">
                    {(isAr ? b.itemsAr : b.itemsEn).map((x, j) => (
                      <li key={j} className="flex items-start gap-2 text-[12.5px] text-neutral-600 leading-snug"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />{x}</li>
                    ))}
                  </ul>
                </div></Commentable>
              ))}
            </div>
          ) : null}
        </RfpSection>

        {rfp.boq.length > 0 && (
          <RfpSection id="cost" title={t('Bill of quantities', 'جدول الكميات')} label={{ en: 'Bill of quantities', ar: 'جدول الكميات' }} meta={`${rfp.boq.length} ${t('items', 'بنود')} · ${fmtSAR(boqTotal)}`} views={{ table: boqTable, chart: boqChart }} />
        )}
        {rfp.payment.length > 0 && (
          <RfpSection id="payment" title={t('Payment schedule', 'جدول الدفعات')} label={{ en: 'Payment schedule', ar: 'جدول الدفعات' }} meta={`${rfp.payment.length} ${t('stages', 'مراحل')}`} views={{ table: payTable, chart: payChart }} />
        )}
        {rfp.evaluation.length > 0 && (
          <RfpSection id="evaluation" title={t('Evaluation criteria', 'معايير التقييم')} label={{ en: 'Evaluation criteria', ar: 'معايير التقييم' }} meta={`${rfp.evaluation.length} ${t('criteria', 'معايير')} · ${t('passing', 'الاجتياز')} ${rfp.techPassing ?? 0}%`} views={{ table: evalTable, chart: evalChart }} />
        )}
        {(rfp.qualCriteria?.length ?? 0) > 0 && (
          <RfpSection id="qualification" title={t('Qualification criteria', 'معايير التأهيل')} label={{ en: 'Qualification criteria', ar: 'معايير التأهيل' }} meta={`${rfp.qualCriteria?.length ?? 0} ${t('main criteria', 'معايير رئيسية')} · ${(rfp.qualCriteria ?? []).reduce((n, m) => n + m.subs.length, 0)} ${t('sub-criteria', 'معايير فرعية')}`} views={{ table: qualTable, chart: qualChart }} />
        )}

        {rfp.documents.length > 0 && (
          <RfpSection id="documents" title={t('Documents', 'المستندات')} label={{ en: 'Documents', ar: 'المستندات' }} meta={`${rfp.documents.length} ${t('files', 'ملفات')}`}>
            <ul className="space-y-1.5">
              {rfp.documents.map((dc, i) => (
                <Commentable key={i} id={`doc-${i}`} label={{ en: dc.en, ar: dc.ar }}><li className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2">
                  {dc.type && <span className="w-10 h-6 rounded-md bg-white border border-neutral-200 text-[10px] font-bold text-neutral-500 flex items-center justify-center flex-shrink-0">{dc.type}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-neutral-800 truncate">{isAr ? dc.ar : dc.en}</p>
                    {(dc.size || dc.by) && <p className="text-[11px] text-neutral-400">{[dc.size, dc.by].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <DownloadIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                </li></Commentable>
              ))}
            </ul>
          </RfpSection>
        )}
    </div>
  );
}

// ── Editing commented fields (requester) ─────────────────────────────────────────
type EditField = { key: string; label: [string, string]; kind: 'text' | 'textarea' | 'number'; value: string };
type EditSpec = { fields: EditField[]; apply: (r: RfpDetail, v: Record<string, string>) => RfpDetail };

/** Which RFP fields each commentable target exposes for editing (same fields as request creation). */
function editSpecFor(id: string, r: RfpDetail, isAr: boolean): EditSpec | null {
  const L = (en: string, ar: string): [string, string] => [en, ar];
  const pick = <T extends object>(o: T, en: keyof T, ar: keyof T) => String((isAr ? o[ar] : o[en]) ?? '');
  const setLang = <T extends object>(o: T, en: keyof T, ar: keyof T, v: string): T => ({ ...o, [isAr ? ar : en]: v });
  const at = <T,>(arr: T[], i: number, fn: (x: T) => T) => arr.map((x, j) => (j === i ? fn(x) : x));
  let m: RegExpMatchArray | null;
  if (id === 'overview-summary' || id === 'sec-overview') return {
    fields: [{ key: 'title', label: L('Request title', 'عنوان الطلب'), kind: 'text', value: pick(r, 'titleEn', 'titleAr') }, { key: 'summary', label: L('Summary', 'الملخص'), kind: 'textarea', value: pick(r, 'summaryEn', 'summaryAr') }],
    apply: (x, v) => setLang(setLang(x, 'titleEn', 'titleAr', v.title), 'summaryEn', 'summaryAr', v.summary),
  };
  if (id === 'scope-summary' || id === 'sec-scope') return {
    fields: [{ key: 'scope', label: L('Scope of work', 'نطاق العمل'), kind: 'textarea', value: pick(r, 'scopeEn', 'scopeAr') }],
    apply: (x, v) => setLang(x, 'scopeEn', 'scopeAr', v.scope),
  };
  if ((m = id.match(/^meta-(\d+)$/))) { const i = +m[1]; const f = r.meta[i]; if (!f) return null; return {
    fields: [{ key: 'value', label: [f.label.en, f.label.ar], kind: 'text', value: f.value }],
    apply: (x, v) => ({ ...x, meta: at(x.meta, i, (y) => ({ ...y, value: v.value })) }) }; }
  if ((m = id.match(/^scope-(\d+)$/))) { const i = +m[1]; const b = r.scopeBlocks?.[i]; if (!b) return null; return {
    fields: [{ key: 'items', label: [`${b.headEn} (one per line)`, `${b.headAr} (بند في كل سطر)`], kind: 'textarea', value: (isAr ? b.itemsAr : b.itemsEn).join('\n') }],
    apply: (x, v) => ({ ...x, scopeBlocks: at(x.scopeBlocks ?? [], i, (y) => ({ ...y, [isAr ? 'itemsAr' : 'itemsEn']: v.items.split('\n').map((s) => s.trim()).filter(Boolean) })) }) }; }
  if ((m = id.match(/^boq-(\d+)$/))) { const i = +m[1]; const l = r.boq[i]; if (!l) return null; return {
    fields: [
      { key: 'name', label: L('Item name', 'اسم البند'), kind: 'text', value: pick(l, 'itemEn', 'itemAr') },
      { key: 'desc', label: L('Description', 'الوصف'), kind: 'textarea', value: pick(l, 'descEn', 'descAr') },
      { key: 'qty', label: L('Quantity', 'الكمية'), kind: 'number', value: l.qty },
      { key: 'price', label: L('Unit price (SAR)', 'سعر الوحدة (ر.س)'), kind: 'number', value: String(l.unitPrice) },
    ],
    apply: (x, v) => ({ ...x, boq: at(x.boq, i, (y) => ({ ...setLang(setLang(y, 'itemEn', 'itemAr', v.name), 'descEn', 'descAr', v.desc), qty: v.qty, unitPrice: Number(v.price) || 0 })) }) }; }
  if ((m = id.match(/^pay-(\d+)$/))) { const i = +m[1]; const p = r.payment[i]; if (!p) return null; return {
    fields: [
      { key: 'stage', label: L('Stage', 'المرحلة'), kind: 'text', value: pick(p, 'stageEn', 'stageAr') },
      { key: 'desc', label: L('Deliverable / condition', 'المخرج / الشرط'), kind: 'textarea', value: pick(p, 'descEn', 'descAr') },
      { key: 'due', label: L('Due', 'الاستحقاق'), kind: 'text', value: pick(p, 'due', 'dueAr') },
      { key: 'pct', label: L('Percentage (%)', 'النسبة (%)'), kind: 'number', value: String(p.pct) },
    ],
    apply: (x, v) => ({ ...x, payment: at(x.payment, i, (y) => ({ ...setLang(setLang(setLang(y, 'stageEn', 'stageAr', v.stage), 'descEn', 'descAr', v.desc), 'due', 'dueAr', v.due), pct: Number(v.pct) || 0 })) }) }; }
  if ((m = id.match(/^eval-(\d+)$/))) { const i = +m[1]; const c = r.evaluation[i]; if (!c) return null; return {
    fields: [
      { key: 'name', label: L('Criterion', 'المعيار'), kind: 'text', value: pick(c, 'criterionEn', 'criterionAr') },
      { key: 'desc', label: L('How it is scored', 'آلية التقييم'), kind: 'textarea', value: pick(c, 'descEn', 'descAr') },
      { key: 'w', label: L('Weight (%)', 'الوزن (%)'), kind: 'number', value: String(c.weight) },
    ],
    apply: (x, v) => ({ ...x, evaluation: at(x.evaluation, i, (y) => ({ ...setLang(setLang(y, 'criterionEn', 'criterionAr', v.name), 'descEn', 'descAr', v.desc), weight: Number(v.w) || 0 })) }) }; }
  if ((m = id.match(/^treq-(\d+)$/))) { const i = +m[1]; const q = r.techRequirements?.[i]; if (!q) return null; return {
    fields: [{ key: 'req', label: L('Requirement', 'المتطلب'), kind: 'text', value: pick(q, 'reqEn', 'reqAr') }, { key: 'desc', label: L('Description', 'الوصف'), kind: 'textarea', value: pick(q, 'descEn', 'descAr') }],
    apply: (x, v) => ({ ...x, techRequirements: at(x.techRequirements ?? [], i, (y) => setLang(setLang(y, 'reqEn', 'reqAr', v.req), 'descEn', 'descAr', v.desc)) }) }; }
  if ((m = id.match(/^qual-(\d+)-(\d+)$/))) { const i = +m[1], j = +m[2]; const sb = r.qualCriteria?.[i]?.subs[j]; if (!sb) return null; return {
    fields: [{ key: 'range', label: L('Range', 'النطاق'), kind: 'text', value: sb.range }, { key: 'pct', label: L('Weight (%)', 'الوزن (%)'), kind: 'number', value: String(sb.pct) }],
    apply: (x, v) => ({ ...x, qualCriteria: at(x.qualCriteria ?? [], i, (mm) => ({ ...mm, subs: at(mm.subs, j, (y) => ({ ...y, range: v.range, pct: Number(v.pct) || 0 })) })) }) }; }
  if ((m = id.match(/^qual-(\d+)$/))) { const i = +m[1]; const q = r.qualCriteria?.[i]; if (!q) return null; return {
    fields: [{ key: 'pct', label: [`${q.nameEn} — weight (%)`, `${q.nameAr} — الوزن (%)`], kind: 'number', value: String(q.pct) }],
    apply: (x, v) => ({ ...x, qualCriteria: at(x.qualCriteria ?? [], i, (y) => ({ ...y, pct: Number(v.pct) || 0 })) }) }; }
  if (id === 'tech-docs') return {
    fields: [{ key: 'docs', label: L('Additional technical documents (one per line)', 'وثائق فنية إضافية (وثيقة في كل سطر)'), kind: 'textarea', value: (r.techDocs ?? []).map((d) => (isAr ? d.ar : d.en)).join('\n') }],
    apply: (x, v) => ({ ...x, techDocs: v.docs.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => ({ en: s, ar: s })) }) };
  if ((m = id.match(/^doc-(\d+)$/))) { const i = +m[1]; const d = r.documents[i]; if (!d) return null; return {
    fields: [{ key: 'name', label: L('Document name', 'اسم المستند'), kind: 'text', value: isAr ? d.ar : d.en }],
    apply: (x, v) => ({ ...x, documents: at(x.documents, i, (y) => ({ ...y, [isAr ? 'ar' : 'en']: v.name })) }) }; }
  return null;
}

function EditForm({ spec, isAr, t, onSave, onCancel }: { spec: EditSpec; isAr: boolean; t: T; onSave: (vals: Record<string, string>, changed: string[]) => void; onCancel: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(spec.fields.map((f) => [f.key, f.value])));
  const changed = spec.fields.filter((f) => (vals[f.key] ?? '') !== f.value);
  return (
    <div className="space-y-3">
      {spec.fields.map((f) => (
        <FormField key={f.key} label={f.label[0]} labelAr={f.label[1]}>
          {f.kind === 'textarea'
            ? <Textarea rows={3} value={vals[f.key]} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
            : <Input type={f.kind === 'number' ? 'number' : 'text'} value={vals[f.key]} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} dir={f.kind === 'number' ? 'ltr' : undefined} />}
        </FormField>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[11px] text-neutral-400">{changed.length ? t(`${changed.length} change${changed.length > 1 ? 's' : ''}`, `${changed.length} تغيير`) : t('No changes yet', 'لا توجد تغييرات')}</span>
        <Button size="sm" variant="ghost" className="ms-auto" onClick={onCancel}>{t('Cancel', 'إلغاء')}</Button>
        <Button size="sm" variant="primary" disabled={!changed.length} onClick={() => onSave(vals, changed.map((f) => { const lbl = isAr ? f.label[1] : f.label[0]; const nv = vals[f.key] ?? ''; return f.kind === 'textarea' || f.value.length > 48 || nv.length > 48 ? t(`${lbl} updated`, `تم تحديث ${lbl}`) : `${lbl}: ${f.value || '—'} → ${nv || '—'}`; }))}>{t('Save changes', 'حفظ التغييرات')}</Button>
      </div>
    </div>
  );
}

// ── Decision dialog ("What's next?") ─────────────────────────────────────────────
type NextStep = { titleEn: string; titleAr: string; descEn: string; descAr: string };
function nextStepsFor(task: Task, id: TaskAction): NextStep[] {
  const own = task.decisionSteps?.[id];
  if (own?.length) return own;
  const s = (titleEn: string, titleAr: string, descEn: string, descAr: string) => ({ titleEn, titleAr, descEn, descAr });
  if (id === 'reject') return [s('Request closed', 'إغلاق الطلب', 'The request is rejected and closed.', 'يُرفض الطلب ويُغلق.'), s('Requester notified', 'إشعار مقدّم الطلب', `${task.requester.name} receives your reason.`, `يتلقى ${task.requester.nameAr ?? task.requester.name} السبب.`)];
  if (id === 'return') return [s('Back to the requester', 'العودة إلى مقدّم الطلب', `${task.requester.name} updates the request using your comments.`, `يحدّث ${task.requester.nameAr ?? task.requester.name} الطلب بناءً على ملاحظاتك.`), s('Resubmitted', 'إعادة التقديم', 'The request comes back through the same approval steps.', 'يعود الطلب عبر خطوات الاعتماد نفسها.')];
  const trail = task.trail ?? []; const cur = trail.findIndex((x) => x.state === 'current');
  const up = cur >= 0 ? trail.slice(cur + 1, cur + 4) : [];
  if (up.length) return up.map((x) => s(x.titleEn, x.titleAr, x.actorEn, x.actorAr));
  const o = task.outcomes?.[0];
  return o ? [s(o.action.en, o.action.ar, o.next.en, o.next.ar)] : [];
}

function DecisionModal({ task, action, isAr, t, onCancel, onConfirm }: { task: Task; action: ActionDef; isAr: boolean; t: T; onCancel: () => void; onConfirm: (note: string) => void }) {
  const [choice, setChoice] = useState<'yes' | 'no' | null>(null);
  const [note, setNote] = useState('');
  const steps = nextStepsFor(task, action.id);
  const verbEn = action.label[0].toLowerCase(), verbAr = action.label[1];
  const yesDesc: Record<string, [string, string]> = {
    approve: ['This will be recorded as your approval for this request.', 'سيُسجل هذا كاعتماد منك لهذا الطلب.'],
    return: [`The request goes back to ${task.requester.name} with your comments.`, `يعود الطلب إلى ${task.requester.nameAr ?? task.requester.name} مع ملاحظاتك.`],
    reject: ['The request will be rejected and closed.', 'سيُرفض الطلب ويُغلق.'],
  };
  const yd = yesDesc[action.id] ?? [`Confirm “${action.label[0]}” for this task.`, `تأكيد "${action.label[1]}" لهذه المهمة.`];
  const needNote = choice === 'yes' && !!action.needsNote;
  const ready = choice === 'no' || (choice === 'yes' && (!action.needsNote || note.trim().length > 0));
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onCancel]);
  const Opt = ({ v, title, desc }: { v: 'yes' | 'no'; title: string; desc: string }) => (
    <button type="button" role="radio" aria-checked={choice === v} onClick={() => setChoice(v)}
      className={`w-full text-start rounded-xl border px-5 py-4 flex items-start gap-3.5 transition-colors ${choice === v ? (v === 'yes' ? (action.variant === 'danger' ? 'border-error-500 bg-error-50/40' : 'border-[#2A3466] bg-[#F3F5FB]') : 'border-neutral-400 bg-neutral-50') : 'border-[#C7CCDD] hover:border-[#8E97B8]'}`}>
      <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${choice === v ? 'border-[#2A3466]' : 'border-neutral-300'}`}>{choice === v && <span className="w-2.5 h-2.5 rounded-full bg-[#2A3466]" />}</span>
      <span className="min-w-0"><span className="block text-[16px] font-semibold text-[#1B2350]">{title}</span><span className="block text-[13.5px] text-[#4A5274] mt-0.5">{desc}</span></span>
    </button>
  );
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-[#0F1530]/55 backdrop-blur-[2px] cm-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-label={t(`Confirm ${verbEn}`, `تأكيد ${verbAr}`)}
        className="cm-dialog-in relative w-full max-w-[1000px] max-h-[94vh] overflow-y-auto rounded-2xl bg-[#2A3466] shadow-2xl grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-0">
        <Leaves />
        {/* What's next */}
        <div className="relative px-7 sm:px-12 py-8 md:py-14 flex flex-col justify-center">
          <h2 className="text-[22px] font-semibold text-white">{t("What's next?", 'ما التالي؟')}</h2>
          <ol className="mt-7">
            {steps.map((s, i) => (
              <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                {i < steps.length - 1 && <span className="absolute top-11 bottom-1 start-[19px] w-0.5 bg-white/25" />}
                <span className="w-10 h-10 rounded-full bg-white/25 text-white text-[15px] font-medium flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <span className="min-w-0 pt-1">
                  <span className="block text-[16px] font-semibold text-white">{isAr ? s.titleAr : s.titleEn}</span>
                  <span className="block text-[13.5px] text-white/65 mt-1 leading-relaxed">{isAr ? s.descAr : s.descEn}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        {/* Confirm card */}
        <div className="relative p-3 sm:p-5 md:p-6">
          <div className="h-full rounded-2xl bg-white px-6 sm:px-9 py-8 sm:py-12 flex flex-col justify-center">
            <h3 className="text-[19px] font-semibold text-[#1B2350]">{t(`Are you sure you want to ${verbEn}?`, `هل أنت متأكد من ${verbAr}؟`)}</h3>
            <div role="radiogroup" className="mt-6 space-y-3.5">
              <Opt v="yes" title={t('Yes', 'نعم')} desc={isAr ? yd[1] : yd[0]} />
              <Opt v="no" title={t('No', 'لا')} desc={t(`Go back to the task without ${verbEn === 'approve' ? 'approving' : verbEn === 'reject' ? 'rejecting' : verbEn === 'return' ? 'returning' : 'changing anything'}.`, 'العودة إلى المهمة دون أي تغيير.')} />
            </div>
            {needNote || (choice === 'yes' && !action.needsNote) ? (
              <div className="mt-4">
                <label className="block text-[12.5px] font-semibold text-[#1B2350] mb-1.5">{action.needsNote ? (action.id === 'reject' ? t('Rejection reason', 'سبب الرفض') : t('Comments for the requester', 'ملاحظات لمقدّم الطلب')) : t('Note (optional)', 'ملاحظة (اختياري)')}{action.needsNote && <span className="text-error-600"> *</span>}</label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={action.needsNote ? t('Required…', 'مطلوب…') : t('Add a note…', 'أضف ملاحظة…')} />
              </div>
            ) : null}
            <div className="mt-7 grid grid-cols-2 gap-4">
              <button type="button" onClick={onCancel} className="h-12 rounded-lg border border-neutral-200 bg-white text-[15px] font-semibold text-[#1B2350] hover:bg-neutral-50 inline-flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12" /></svg>{t('Cancel', 'إلغاء')}
              </button>
              <button type="button" disabled={!ready} onClick={() => (choice === 'yes' ? onConfirm(note.trim()) : onCancel())}
                className={`h-12 rounded-lg text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors ${ready ? (action.variant === 'danger' && choice === 'yes' ? 'bg-error-600 text-white hover:bg-error-700' : 'bg-[#2A3466] text-white hover:bg-[#1F2753]') : 'bg-neutral-100 text-neutral-300 border border-neutral-200 cursor-not-allowed'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12l5 5L18 6M9 17l1.5 1.5L22 7" /></svg>{t('Complete', 'إتمام')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Leaves() {
  const items: [number, number, number, number][] = [[4, 9, 1.2, -20], [19, 5, 1.4, 25], [27, 27, 1.1, -25], [3, 80, 2.4, -15], [9, 83, 1.9, 10], [31, 76, 2.2, 35]];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {items.map(([x, y, s, r], i) => (
        <svg key={i} viewBox="0 0 24 46" className="absolute" style={{ left: `${x}%`, top: `${y}%`, width: 24 * s, height: 46 * s, transform: `rotate(${r}deg)` }}>
          <path d="M12 0C19 10 19 30 12 46C5 30 5 10 12 0Z" fill="white" fillOpacity="0.08" />
        </svg>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2">
      <p className="text-[10.5px] uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="text-[15px] font-bold text-neutral-900 tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
function TableGlyph({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></svg>;
}
function ChartGlyph({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 11-9-9v9z" /><path d="M15 3.5A9 9 0 0120.5 9H15z" /></svg>;
}

function JumpFab({ sections, isAr, t }: { sections: { id: string; en: string; ar: string }[]; isAr: boolean; t: T }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-5 end-5 z-20">
      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-14 end-0 z-10 w-56 rounded-xl border border-neutral-200 bg-white shadow-xl p-1.5 slide-up">
            <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{t('Jump to section', 'الانتقال إلى قسم')}</p>
            {sections.map((s) => (
              <button key={s.id} type="button"
                onClick={() => { document.getElementById(`rfp-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setOpen(false); }}
                className="w-full text-start px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-neutral-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                {isAr ? s.ar : s.en}
              </button>
            ))}
          </div>
        </>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} title={t('Jump to section', 'الانتقال إلى قسم')}
        className="w-11 h-11 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 active:scale-95 transition flex items-center justify-center">
        <JumpGlyph className="w-5 h-5" />
      </button>
    </div>
  );
}

// ── Required action tab ────────────────────────────────────────────────────────
const TONE: Record<'success' | 'warning' | 'danger' | 'info', { pill: string; dot: string }> = {
  success: { pill: 'bg-success-50 text-success-700 border-success-100', dot: 'bg-success-500' },
  warning: { pill: 'bg-warning-50 text-warning-700 border-warning-100', dot: 'bg-warning-500' },
  danger:  { pill: 'bg-error-50 text-error-700 border-error-100', dot: 'bg-error-500' },
  info:    { pill: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
};

function RequiredAction({ task, isAr, t, onReview, commentCount = 0, resolvedCount = 0 }: { task: Task; isAr: boolean; t: T; onReview?: () => void; commentCount?: number; resolvedCount?: number }) {
  const [officer, setOfficer] = useState(task.assignTo?.[0]?.id ?? '');
  const lines = task.rfp?.boq ?? [];
  const budgets = Array.from(new Set(lines.map((l) => l.budgetEn ?? '')));
  const sub = lines.reduce((s, l) => s + (Number(l.qty) || 1) * l.unitPrice, 0);
  return (
    <div className="space-y-4">
      {/* Context note: where this task sits and what each decision leads to (information, not a call to action) */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3.5">
        <p className="flex items-start gap-2 text-[12.5px] text-neutral-600 leading-relaxed">
          <InfoGlyph className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
          <span>
            {t('This task is at the', 'هذه المهمة في مرحلة')} <span className="font-semibold text-neutral-800">{isAr ? task.stageAr : task.stageEn}</span> {t('stage, assigned to', '، ومسندة إلى')} {personName(task.assignee, isAr)} ({isAr ? task.assignee.roleAr : task.assignee.role}) · {t('due', 'تستحق في')} {fmtDate(task.dueAt, isAr)}.
          </span>
        </p>
        {task.outcomes?.length ? (
          <ul className="mt-2.5 ms-6 space-y-1.5">
            {task.outcomes.map((o, i) => {
              const next = tb(o.next, isAr);
              return (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-neutral-500 leading-relaxed">
                  <span className={`w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0 ${TONE[o.tone].dot}`} />
                  <span>{t('If you', 'عند')} <span className="font-medium text-neutral-700">{isAr ? tb(o.action, isAr) : tb(o.action, isAr).toLowerCase()}</span>{t(', ', '، ')}{next}.</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {/* Approver: review the RFP and pin comments */}
      {onReview && (
        <div className="rounded-xl border border-[#C9DBEC] bg-gradient-to-br from-[#F3F8FC] to-white p-5 shadow-sm flex items-center gap-4 flex-wrap">
          <span className="w-11 h-11 rounded-xl bg-[#2A6193] text-white flex items-center justify-center flex-shrink-0"><BubbleIcon className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            {task.respondComments ? (<>
              <p className="text-[14px] font-bold text-neutral-900">{t('Respond to the review comments', 'الرد على تعليقات المراجعة')}</p>
              <p className="text-[12.5px] text-neutral-600 mt-0.5">{t('Open the RFP details. Each commented section shows a marker — reply to or resolve the comment there. Turn on editing to change only the commented fields.', 'افتح تفاصيل المنافسة. يظهر مؤشر على كل قسم عليه تعليق — رد عليه أو حله هناك. فعّل التعديل لتغيير الحقول التي عليها تعليقات فقط.')}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 w-40 rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${commentCount ? (resolvedCount / commentCount) * 100 : 0}%` }} /></div>
                <span className="text-[12px] font-semibold text-neutral-700">{t(`${resolvedCount} of ${commentCount} resolved`, `${resolvedCount} من ${commentCount} تم حلها`)}</span>
              </div>
            </>) : (<>
              <p className="text-[14px] font-bold text-neutral-900">{t('Review the RFP details', 'راجع تفاصيل المنافسة')}</p>
              <p className="text-[12.5px] text-neutral-600 mt-0.5">{t('Go through each section of the request. Hover any section or field and add a comment — it is posted to Comments with the section name.', 'راجع كل قسم من الطلب. مرّر المؤشر على أي قسم أو حقل وأضف تعليقاً — يُنشر في التعليقات مع اسم القسم.')}</p>
              {commentCount > 0 && <p className="text-[12px] font-semibold text-[#21507A] mt-1">{t(`${commentCount} comment${commentCount > 1 ? 's' : ''} added`, `${commentCount} تعليق مضاف`)}{resolvedCount > 0 && <span className="text-success-700"> · {t(`${resolvedCount} resolved by ${task.requester.name}`, `${resolvedCount} تم حلها من ${task.requester.nameAr ?? task.requester.name}`)}</span>}</p>}
            </>)}
          </div>
          <Button size="md" variant="primary" onClick={onReview}>{task.respondComments ? t('Open RFP details', 'فتح تفاصيل المنافسة') : t('Review RFP & add comments', 'مراجعة المنافسة وإضافة تعليقات')}</Button>
        </div>
      )}

      {/* Team Lead: pick the officer */}
      {task.assignTo?.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-[13px] font-bold text-neutral-800">{t('Assign to officer', 'الإسناد إلى أخصائي')}</p>
          <p className="text-[12px] text-neutral-500 mt-0.5">{t('Used when the request is new or has comments. Pick who reviews it.', 'يُستخدم عندما يكون الطلب جديداً أو عليه ملاحظات. اختر من يراجعه.')}</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            {task.assignTo.map((p, i) => (
              <label key={p.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${officer === p.id ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/15' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                <input type="radio" name="officer" className="accent-brand-600" checked={officer === p.id} onChange={() => setOfficer(p.id)} />
                <Avatar name={p.name} id={p.id} className="w-7 h-7" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-neutral-800 truncate">{personName(p, isAr)}</span>
                  <span className="block text-[11px] text-neutral-500">{t(`${3 + i * 2} open requests`, `${3 + i * 2} طلبات مفتوحة`)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {/* DOA approval: authority check */}
      {task.doaInfo?.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-neutral-800">{t('Delegation of authority', 'تفويض الصلاحيات')}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full border px-2 py-0.5 bg-success-50 text-success-700 border-success-100"><CheckCircleIcon className="w-3 h-3" />{t('Within your limit', 'ضمن حد صلاحيتك')}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-px bg-neutral-200 rounded-lg border border-neutral-200 overflow-hidden">
            {task.doaInfo.map((r, i) => (
              <div key={i} className="bg-neutral-50 px-3 py-2.5 min-w-0">
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{tb(r.label, isAr)}</dt>
                <dd className="mt-1 text-[13px] font-semibold text-neutral-800 truncate" dir={/SAR|\d/.test(r.value) ? 'ltr' : undefined}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {/* Director: estimated price by budget item */}
      {task.priceBreakdown && lines.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-[13px] font-bold text-neutral-800">{t('Estimated price by budget item', 'السعر التقديري حسب بند الميزانية')}</p>
          <div className="mt-3 space-y-2.5">
            {budgets.map((b, i) => {
              const ls = lines.filter((l) => (l.budgetEn ?? '') === b);
              const v = ls.reduce((s, l) => s + (Number(l.qty) || 1) * l.unitPrice, 0);
              return (
                <div key={b}>
                  <div className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="text-neutral-700 truncate">{isAr ? ls[0].budgetAr : ls[0].budgetEn}</span><span className="text-neutral-400 whitespace-nowrap">· {ls.length} {ls.length === 1 ? t('item', 'بند') : t('items', 'بنود')}</span></span>
                    <span className="font-semibold text-neutral-800 tabular-nums whitespace-nowrap" dir="ltr">{fmtSAR(v)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(v / (sub || 1)) * 100}%`, background: PALETTE[i % PALETTE.length] }} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 grid grid-cols-3 gap-3 text-[12px]">
            <div><p className="text-neutral-400">{t('Subtotal', 'المجموع الفرعي')}</p><p className="font-semibold text-neutral-800 tabular-nums" dir="ltr">{fmtSAR(sub)}</p></div>
            <div><p className="text-neutral-400">{t('VAT (15%)', 'الضريبة (15%)')}</p><p className="font-semibold text-neutral-800 tabular-nums" dir="ltr">{fmtSAR(sub * 0.15)}</p></div>
            <div><p className="text-neutral-400">{t('Total (incl. VAT)', 'الإجمالي شامل الضريبة')}</p><p className="font-bold text-brand-700 tabular-nums" dir="ltr">{fmtSAR(sub * 1.15)}</p></div>
          </div>
        </div>
      )}

      {/* Task form / record */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <TaskBody task={task} />
      </div>
    </div>
  );
}

// ── Activity tab — schedule-style timeline ─────────────────────────────────────
type TLStatus = 'done' | 'approved' | 'comment' | 'current' | 'upcoming' | 'returned' | 'rejected';
const TL_META: Record<TLStatus, { en: string; ar: string; pill: string; dot: string; tile: string }> = {
  done:     { en: 'Done', ar: 'تم', pill: 'bg-success-50 text-success-700', dot: 'bg-success-500', tile: 'bg-success-50 text-success-700 border-success-100' },
  approved: { en: 'Approved', ar: 'معتمد', pill: 'bg-success-50 text-success-700', dot: 'bg-success-500', tile: 'bg-success-50 text-success-700 border-success-100' },
  comment:  { en: 'Comment', ar: 'تعليق', pill: 'bg-warning-50 text-warning-700', dot: 'bg-warning-500', tile: 'bg-warning-50 text-warning-700 border-warning-100' },
  current:  { en: 'In progress', ar: 'قيد التنفيذ', pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', tile: 'bg-blue-50 text-blue-700 border-blue-100' },
  upcoming: { en: 'Upcoming', ar: 'قادمة', pill: 'bg-white text-neutral-700 border border-neutral-200', dot: 'bg-neutral-800', tile: 'bg-neutral-50 text-neutral-600 border-neutral-200' },
  returned: { en: 'Returned', ar: 'مُعاد', pill: 'bg-warning-50 text-warning-700', dot: 'bg-warning-500', tile: 'bg-warning-50 text-warning-700 border-warning-100' },
  rejected: { en: 'Rejected', ar: 'مرفوض', pill: 'bg-error-50 text-error-700', dot: 'bg-error-500', tile: 'bg-error-50 text-error-700 border-error-100' },
};
const fmtTime = (iso: string, isAr: boolean) => new Date(iso).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

function ActivityTab({ task, isAr, t, onComment, terminal, onJump }: { task: Task; isAr: boolean; t: T; onComment: (x: string) => void; terminal: boolean; onJump?: (id: string) => void }) {
  const [c, setC] = useState('');
  type Row = { key: string; at?: string; status: TLStatus; icon: React.ReactNode; title: string; sub: string; quote?: string; bubble?: string; chip?: { id: string; label: string } };
  const rows: Row[] = task.activity.map((a) => {
    const who = `${personName(a.actor, isAr)}${a.actor.role ? ` · ${isAr ? a.actor.roleAr ?? a.actor.role : a.actor.role}` : ''}`;
    if (a.kind === 'comment') return { key: a.id, at: a.at, status: a.resolved ? 'done' : 'comment', icon: <CommentGlyph className="w-[18px] h-[18px]" />, title: a.editNote ? t('Field updated', 'تم تحديث الحقل') : a.replyTo ? t('Reply to review comment', 'رد على تعليق مراجعة') : a.anchor ? (a.resolved ? t('Review comment — resolved', 'تعليق مراجعة — تم الحل') : t('Review comment', 'تعليق مراجعة')) : t('Comment added', 'تمت إضافة تعليق'), sub: who, bubble: a.text, chip: a.anchor ? { id: a.anchor.id, label: tb(a.anchor.label, isAr) } : undefined };
    if (a.kind === 'decision') {
      const lbl = a.decision ? tb(a.decision, isAr) : '';
      const st: TLStatus = /reject|رفض/i.test(lbl) ? 'rejected' : /return|إعاد|مُعاد/i.test(lbl) ? 'returned' : 'approved';
      return { key: a.id, at: a.at, status: st, icon: <CheckCircleIcon className="w-[18px] h-[18px]" />, title: a.system ? `${tb(a.system, isAr)} — ${lbl}` : lbl, sub: who, quote: a.text };
    }
    const sys = a.system ? tb(a.system, isAr) : '';
    const assigned = /assign|أُسند|إسناد/i.test(sys);
    return { key: a.id, at: a.at, status: 'done', icon: assigned ? <UserGlyph className="w-[18px] h-[18px]" /> : <DocGlyph className="w-[18px] h-[18px]" />, title: sys, sub: who, quote: a.text };
  });
  if (!terminal) rows.push({ key: 'cur', status: 'current', icon: <HourglassGlyph className="w-[18px] h-[18px]" />, title: isAr ? task.stageAr : task.stageEn, sub: `${personName(task.assignee, isAr)} · ${t('due', 'الاستحقاق')} ${fmtDate(task.dueAt, isAr)}` });
  const steps = task.trail ?? [];
  const curIdx = steps.findIndex((s) => s.state === 'current');
  const upcoming = curIdx >= 0 ? steps.slice(curIdx + 1) : [];
  for (const s of upcoming) rows.push({ key: s.id, status: 'upcoming', icon: <ClockIcon className="w-[18px] h-[18px]" />, title: isAr ? s.titleAr : s.titleEn, sub: isAr ? s.actorAr : s.actorEn });
  const doneSteps = curIdx >= 0 ? curIdx : steps.length;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[16px] font-semibold text-neutral-900">{t('Activity', 'النشاط')}</h3>
          <span title={t('Everything that happened on this request, and what comes next', 'كل ما حدث على هذا الطلب وما هو قادم')} className="text-neutral-400"><InfoGlyph className="w-3.5 h-3.5" /></span>
        </div>
        <span className="text-[11.5px] font-medium text-neutral-500">{t(`${doneSteps} of ${steps.length} steps complete`, `${doneSteps} من ${steps.length} خطوات مكتملة`)}</span>
      </div>

      <ol className="px-5 pb-2">
        {rows.map((r, i) => {
          const m = TL_META[r.status]; const last = i === rows.length - 1;
          return (
            <li key={r.key} className="grid grid-cols-[72px_20px_1fr] sm:grid-cols-[92px_24px_1fr] gap-x-2 sm:gap-x-3">
              <div className="pt-2.5 text-end">
                {r.at ? (<><p className="text-[12.5px] font-medium text-neutral-600 tabular-nums whitespace-nowrap">{fmtTime(r.at, isAr)}</p><p className="text-[10.5px] text-neutral-400 whitespace-nowrap">{fmtDate(r.at, isAr)}</p></>)
                  : <p className="text-[11.5px] text-neutral-400">{r.status === 'current' ? t('Now', 'الآن') : '—'}</p>}
              </div>
              <div className="relative flex justify-center">
                <span className={`absolute top-0 bottom-0 w-px ${i === 0 ? 'top-4' : ''} ${last ? 'bottom-auto h-4' : ''} bg-neutral-200`} />
                <span className={`relative mt-[13px] w-2.5 h-2.5 rounded-full ${m.dot} ${r.status === 'current' ? 'ring-4 ring-blue-100' : 'ring-4 ring-white'}`} />
              </div>
              <div className={`flex items-start gap-3 py-2 ${r.status === 'upcoming' ? 'opacity-80' : ''}`}>
                <span className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${m.tile}`}>{r.icon}</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[14px] font-semibold text-neutral-900 leading-snug">{r.title}</p>
                  <p className="text-[12.5px] text-neutral-500 truncate">{r.sub}</p>
                  {r.quote && <p className="mt-1.5 text-[12.5px] text-neutral-600 border-s-2 border-neutral-200 ps-2.5 italic">“{r.quote}”</p>}
                  {r.chip && <div className="mt-1.5"><AnchorChip label={r.chip.label} onClick={() => onJump?.(r.chip!.id)} /></div>}
                  {r.bubble && <div className="mt-1.5 rounded-xl rounded-ss-sm bg-neutral-50 border border-neutral-200 px-3 py-2 text-[12.5px] text-neutral-700">{r.bubble}</div>}
                </div>
                <span className={`mt-0.5 flex-shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${m.pill}`}>{isAr ? m.ar : m.en}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Insight strip */}
      <div className="mx-5 mb-4 mt-1 rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 flex items-center gap-2.5 flex-wrap">
        <SparkGlyph className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-neutral-800">{t(`${upcoming.length} steps left after yours`, `${upcoming.length} خطوات متبقية بعد خطوتك`)}</span>
        {upcoming[0] && <span className="text-[12.5px] text-neutral-500">{t('Next', 'التالي')}: {isAr ? upcoming[0].titleAr : upcoming[0].titleEn} · {isAr ? upcoming[0].actorAr : upcoming[0].actorEn}</span>}
      </div>

      {!terminal && (
        <div className="border-t border-neutral-100 px-5 py-3 flex items-end gap-2">
          <textarea value={c} onChange={(e) => setC(e.target.value)} rows={1} placeholder={t('Add a comment…', 'أضف تعليقاً…')}
            className="flex-1 resize-none text-[13px] rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
          <Button size="sm" variant="secondary" disabled={!c.trim()} onClick={() => { onComment(c); setC(''); }}>{t('Post', 'نشر')}</Button>
        </div>
      )}
    </div>
  );
}
const G = (d: React.ReactNode) => ({ className = '' }: { className?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{d}</svg>;
const UserGlyph = G(<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></>);
const DocGlyph = G(<><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>);
const HourglassGlyph = G(<><path d="M6 3h12M6 21h12" /><path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" /></>);
const InfoGlyph = G(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>);
const SparkGlyph = G(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z" /></>);
const TaskGlyph = G(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></>);

function CommentsPanel({ task, isAr, t, onSend, disabled, onJump, threads, respond }: { task: Task; isAr: boolean; t: T; onSend: (x: string) => void; disabled: boolean; onJump?: (id: string) => void; threads: AnchoredComment[]; respond?: RespondHandlers }) {
  void task;
  const [msg, setMsg] = useState('');
  const comments = task.activity.filter((a) => a.kind === 'comment' && !a.replyTo);
  const listRef = useRef<HTMLDivElement>(null);
  const seen = useRef(comments.length);
  const fresh = comments.length > seen.current ? comments[comments.length - 1].id : null;
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    seen.current = comments.length;
  }, [comments.length]);
  const review = threads.length; const open = threads.filter((x) => !x.resolved).length;
  return (
    <>
      {review > 0 && (
        <div className="px-3 py-2 border-b border-neutral-200 bg-[#F3F8FC] text-[11.5px] text-[#21507A] font-semibold flex items-center gap-1.5">
          <BubbleIcon className="w-3.5 h-3.5" />{t(`${review} review comment${review > 1 ? 's' : ''} on the RFP`, `${review} تعليق مراجعة على المنافسة`)}<span className="ms-auto font-medium text-neutral-500">{open ? t(`${open} open`, `${open} مفتوح`) : t('All resolved', 'تم حل الكل')}</span>
        </div>
      )}
      <div ref={listRef} data-comment-dock="pane" className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 && <p className="text-[12.5px] text-neutral-400 text-center mt-6">{t('No comments yet. Post the first one.', 'لا توجد تعليقات بعد. انشر أول تعليق.')}</p>}
        {comments.map((a) => {
          const mine = a.actor.id === 'u-me' || a.actor.id === task.assignee.id;
          if (a.anchor) {
            const th = threads.find((x) => x.id === a.id);
            return (
              <div key={a.id} className={`flex gap-2 ${a.id === fresh ? 'cm-land' : ''}`}>
                <Avatar name={a.actor.name} id={a.actor.id} className="w-6 h-6" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1"><AnchorChip label={tb(a.anchor.label, isAr)} onClick={onJump ? () => onJump(a.anchor!.id) : undefined} /></div>
                  {th ? <ThreadCard c={th} isAr={isAr} respond={respond} /> : null}
                </div>
              </div>
            );
          }
          return (
            <div key={a.id} className={`flex gap-2 ${a.id === fresh ? 'cm-land' : ''}`}>
              <Avatar name={a.actor.name} id={a.actor.id} className="w-6 h-6" />
              <div className={`min-w-0 flex-1 rounded-xl border px-3 py-2 ${mine ? 'border-brand-200 bg-brand-50/40' : 'border-neutral-200 bg-white'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold text-neutral-800 truncate">{personName(a.actor, isAr)}</span>
                  <span className="text-[10.5px] text-neutral-400 whitespace-nowrap">{fmtDateTime(a.at, isAr)}</span>
                </div>
                <p className="text-[12.5px] text-neutral-800 mt-1 whitespace-pre-line">{a.text}</p>
              </div>
            </div>
          );
        })}
      </div>
      {!disabled && (
        <div className="p-3 border-t border-neutral-200 flex items-end gap-2">
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (msg.trim()) { onSend(msg); setMsg(''); } } }}
            placeholder={t('Add a comment…  (Ctrl + Enter to post)', 'أضف تعليقاً…  (Ctrl + Enter للنشر)')}
            className="flex-1 resize-none text-[13px] rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
          <Button size="sm" variant="primary" disabled={!msg.trim()} onClick={() => { onSend(msg); setMsg(''); }}>{t('Post', 'نشر')}</Button>
        </div>
      )}
    </>
  );
}

/** Requester's toolbar: progress on resolving comments + the switch that unlocks editing. */
function RespondBar({ editOn, onToggleEdit, total, resolved, t, disabled, onOpenComments }: { editOn: boolean; onToggleEdit: () => void; total: number; resolved: number; t: T; disabled: boolean; onOpenComments: () => void }) {
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 flex-wrap transition-colors ${editOn ? 'border-brand-500 bg-brand-50/50 shadow-[0_0_0_3px_rgba(105,152,67,0.10)]' : 'border-[#C9DBEC] bg-[#F3F8FC]'}`}>
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${editOn ? 'bg-brand-600 text-white' : 'bg-[#2A6193] text-white'}`}>{editOn ? <PencilIcon className="w-[18px] h-[18px]" /> : <BubbleIcon className="w-[18px] h-[18px]" />}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-neutral-900">{editOn ? t('Editing is on — commented fields only', 'التعديل مفعّل — الحقول التي عليها تعليقات فقط') : t('Review comments on this RFP', 'تعليقات المراجعة على هذه المنافسة')}</p>
        <p className="text-[12px] text-neutral-500">{editOn ? t('Click Edit next to a comment marker to change that field. Other fields stay locked.', 'اضغط تعديل بجانب مؤشر التعليق لتغيير ذلك الحقل. تبقى الحقول الأخرى مقفلة.') : t('Click a marker to reply or resolve. Turn on editing when you are ready to change the commented fields.', 'اضغط على المؤشر للرد أو الحل. فعّل التعديل عندما تكون جاهزاً لتغيير الحقول المعنية.')}</p>
      </div>
      <button type="button" onClick={onOpenComments} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#C9DBEC] px-2.5 py-1 text-[11.5px] font-semibold text-[#21507A] hover:bg-[#EAF1F8]">
        <BubbleIcon className="w-3.5 h-3.5" />{t(`${resolved}/${total} resolved`, `${resolved}/${total} تم حلها`)}
      </button>
      {!disabled && (
        <button type="button" role="switch" aria-checked={editOn} onClick={onToggleEdit} data-cm-ui
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50">
          <span className={`relative w-8 h-[18px] rounded-full transition-colors ${editOn ? 'bg-brand-600' : 'bg-neutral-300'}`}><span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${editOn ? 'start-[16px]' : 'start-0.5'}`} /></span>
          {t('Enable editing', 'تفعيل التعديل')}
        </button>
      )}
    </div>
  );
}

/** Toolbar above the RFP details that switches review-comment mode on/off. */
function ReviewBar({ on, onToggle, count, isAr, t, disabled, onOpenComments }: { on: boolean; onToggle: () => void; count: number; isAr: boolean; t: T; disabled: boolean; onOpenComments: () => void }) {
  void isAr;
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 flex-wrap transition-colors ${on ? 'border-[#2A6193] bg-[#F3F8FC] shadow-[0_0_0_3px_rgba(42,97,147,0.08)]' : 'border-neutral-200 bg-white shadow-sm'}`}>
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-[#2A6193] text-white' : 'bg-[#EAF1F8] text-[#2A6193]'}`}><BubbleIcon className="w-[18px] h-[18px]" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-neutral-900">{on ? t('Commenting is on', 'وضع التعليق مفعّل') : t('Review the RFP', 'مراجعة المنافسة')}</p>
        <p className="text-[12px] text-neutral-500">
          {on ? t('Hover any section, row or field and click Comment. Press Esc to close a comment.', 'مرّر المؤشر على أي قسم أو صف أو حقل ثم اضغط تعليق. اضغط Esc للإغلاق.')
              : t('Add comments to any section or field — they are posted to Comments with the section name.', 'أضف تعليقات على أي قسم أو حقل — تُنشر في التعليقات مع اسم القسم.')}
        </p>
      </div>
      {count > 0 && (
        <button type="button" onClick={onOpenComments} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#C9DBEC] px-2.5 py-1 text-[11.5px] font-semibold text-[#21507A] hover:bg-[#EAF1F8]">
          <BubbleIcon className="w-3.5 h-3.5" />{t(`${count} comment${count > 1 ? 's' : ''}`, `${count} تعليق`)}
        </button>
      )}
      {!disabled && (
        <button type="button" onClick={onToggle} data-cm-ui
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${on ? 'bg-white border border-[#2A6193] text-[#21507A] hover:bg-[#EAF1F8]' : 'bg-[#2A6193] text-white hover:bg-[#21507A]'}`}>
          {on ? <><CheckCircleIcon className="w-4 h-4" />{t('Done commenting', 'إنهاء التعليق')}</> : <><BubbleIcon className="w-4 h-4" />{t('Add comments', 'إضافة تعليقات')}</>}
        </button>
      )}
    </div>
  );
}

function TrailPanel({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const steps = task.trail ?? [];
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-[12px] text-neutral-500 mb-3">{t('Past and upcoming steps for this request.', 'الخطوات السابقة والقادمة لهذا الطلب.')}</p>
      <ol className="relative">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          const color = s.state === 'done' ? 'bg-success-500' : s.state === 'current' ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-neutral-300';
          return (
            <li key={s.id} className="flex gap-3 pb-4">
              <div className="flex flex-col items-center">
                <span className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ${color}`} />
                {!last && <span className={`w-px flex-1 mt-1 ${s.state === 'done' ? 'bg-success-200' : 'bg-neutral-200'}`} />}
              </div>
              <div className={`min-w-0 flex-1 ${s.state === 'upcoming' ? 'opacity-70' : ''}`}>
                <p className={`text-[13px] ${s.state === 'current' ? 'font-bold text-brand-800' : 'font-semibold text-neutral-800'}`}>{isAr ? s.titleAr : s.titleEn}</p>
                <p className="text-[11.5px] text-neutral-500">{isAr ? s.actorAr : s.actorEn}{s.at ? ` · ${fmtDate(s.at, isAr)}` : s.state === 'upcoming' ? ` · ${t('upcoming', 'قادمة')}` : ''}</p>
                {s.note && <p className="text-[11.5px] text-neutral-500 mt-0.5">{tb(s.note, isAr)}</p>}
              </div>
              {s.state === 'current' && <ChevronRightIcon className={`w-4 h-4 text-brand-500 self-center ${isAr ? 'rotate-180' : ''}`} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── PDF export (English summary) ──────────────────────────────────────────────
function downloadTaskPdf(task: Task) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 48; let y = 56; const W = doc.internal.pageSize.getWidth();
  const line = (txt: string, size = 10, bold = false, color = '#2E332B') => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(txt, W - M * 2);
    doc.text(lines, M, y); y += lines.length * (size + 4);
  };
  const gap = (n = 8) => { y += n; };
  const rule = () => { doc.setDrawColor('#E7EAE3'); doc.line(M, y, W - M, y); y += 12; };
  // Header band
  doc.setFillColor('#699843'); doc.rect(0, 0, W, 8, 'F');
  line('MUNAFASAT — TASK SUMMARY', 9, true, '#699843'); gap(2);
  line(task.titleEn, 18, true); line(task.summaryEn, 10, false, '#656C60'); gap(4); rule();
  // Meta
  const meta: [string, string][] = [
    ['Task ID', task.id], ['Type', task.type], ['Status', task.state], ['Priority', task.priority],
    ['Related', `${task.entity.kind} · ${task.entity.ref}`], ['Requester', task.requester.name],
    ['Department', task.department.en], ['Stage', task.stageEn],
    ['Received', fmtDate(task.receivedAt, false)], ['Due', fmtDate(task.dueAt, false)],
  ];
  if (task.amount != null) meta.push(['Value', fmtSAR(task.amount)]);
  doc.setFontSize(10);
  for (const [k, v] of meta) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor('#656C60'); doc.text(k, M, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor('#2E332B'); doc.text(String(v), M + 120, y); y += 16;
  }
  gap(4); rule();
  const rfp = task.rfp;
  if (rfp) {
    line('RFP / REQUEST', 9, true, '#699843'); gap(2);
    line(`${rfp.refId} — ${rfp.titleEn}`, 12, true);
    line(rfp.scopeEn, 10, false, '#474D43'); gap(4);
    if (rfp.boq.length) {
      line('Bill of quantities', 10, true); gap(2);
      let tot = 0;
      for (const l of rfp.boq) { const lt = (Number(l.qty) || 1) * l.unitPrice; tot += lt; line(`• ${l.itemEn} — ${l.qty} ${l.unit} × ${fmtSAR(l.unitPrice)} = ${fmtSAR(lt)}`, 9, false, '#474D43'); }
      line(`Subtotal: ${fmtSAR(tot)}`, 10, true); gap(4);
    }
    if (rfp.payment.length) { line('Payment schedule', 10, true); gap(2); for (const p of rfp.payment) line(`• ${p.stageEn} — ${p.pct}%`, 9, false, '#474D43'); gap(4); }
    if (rfp.evaluation.length) { line('Evaluation criteria', 10, true); gap(2); for (const c of rfp.evaluation) line(`• ${c.criterionEn} — ${c.weight}%`, 9, false, '#474D43'); gap(4); }
  }
  rule();
  line('ACTIVITY', 9, true, '#699843'); gap(2);
  for (const a of task.activity) {
    const label = a.kind === 'decision' && a.decision ? a.decision.en : a.system ? a.system.en : (a.text ?? '');
    line(`${fmtDateTime(a.at, false)} — ${a.actor.name}: ${label}${a.text && a.kind !== 'comment' ? ` (${a.text})` : ''}`, 9, false, '#656C60');
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 56; }
  }
  doc.save(`${task.id}_${task.entity.ref}.pdf`);
}

// ── Inline glyphs ─────────────────────────────────────────────────────────────
function CommentGlyph({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></svg>;
}
function HistoryGlyph({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>;
}
function PanelCollapseGlyph({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /><path d="m10.5 10 2 2-2 2" /></svg>;
}
function JumpGlyph({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>;
}
