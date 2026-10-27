// Munafasat Inbox — task detail workspace (right pane).
// Header with meta + Approve/Reject/Return CTAs, tabbed body (Overview / RFP /
// Activity), and top actions: Chat (slide-in), History (task trail), Download PDF.
import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button } from '../components/ui';
import { ArrowLeftIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon, DownloadIcon, ChevronRightIcon } from '../components/Icons';
import type { Task, TaskAction, Person, RfpDetail } from './types';
import { useInbox, completionStatus, dueInfo, fmtDate, fmtDateTime, fmtSAR } from './store';
import { TaskBody } from './renderers';
import { useRequests } from '../context/RequestStore';
import { TypeChip, StateChip, PriorityTag, ENTITY_META, tb } from './meta';

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

interface ActionDef { id: TaskAction; label: [string, string]; variant: 'primary' | 'secondary' | 'danger'; needsNote?: boolean; gated?: boolean }
function actionsFor(task: Task): ActionDef[] {
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
    case 'etimad-review': {
      // Manual mode: Procurement checks the requester's Etimad Yes/No answers.
      const flagged = (task.etimadItems ?? []).some((i) => i.verdict === 'on-etimad');
      return flagged ? [
        { id: 'move-emarket', label: ['Move flagged items to an eMarket draft', 'نقل البنود المحددة إلى مسودة السوق'], variant: 'primary', gated: true },
        { id: 'return', label: ['Return to requester', 'إعادة إلى مقدم الطلب'], variant: 'secondary', needsNote: true, gated: true },
      ] : [
        { id: 'complete', label: ['Confirm all answers', 'تأكيد جميع الإجابات'], variant: 'primary', gated: true },
        { id: 'return', label: ['Return to requester', 'إعادة إلى مقدم الطلب'], variant: 'secondary', needsNote: true },
      ];
    }
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
  const { decide, addComment, finishEtimadReview } = useInbox();
  const { addSessionDraft } = useRequests();
  // Etimad review outcomes: confirm all, return to the requester, or move flagged lines to an eMarket draft.
  function finishEtimad(id: TaskAction, n?: string) {
    if (id === 'move-emarket') {
      const flagged = (task.etimadItems ?? []).filter((i) => i.verdict === 'on-etimad');
      const src = task.sourceRequest;
      if (src && flagged.length) {
        addSessionDraft({ title: `${src.title} — Etimad eMarket (${flagged.length} item${flagged.length > 1 ? 's' : ''})`, type: 'souq-etimad', department: tb(task.department, false), budget: '—' }, {
          sourceType: 'souq-etimad', projectId: src.projectId, costCenterId: src.costCenterId, tenderingPurpose: src.purpose,
          selectedProjectItemIds: [], scopeIncludes: [],
          boqItems: flagged.map((f) => ({ id: crypto.randomUUID(), projectItem: '', itemName: f.name, itemDescription: f.note ?? '', unitOfMeasure: f.unit || 'Each',
            quantity: f.qty, unitPrice: f.unitPrice, deliveryDate: '', purchaseType: 'product', productId: '', supplier: '',
            lineTotal: f.qty !== '' && f.unitPrice !== '' ? Number(f.qty) * Number(f.unitPrice) : '' })),
        } as never);
      }
      finishEtimadReview(task.id, 'move', n);
    } else finishEtimadReview(task.id, id === 'complete' ? 'accept' : 'return', n);
  }
  const [tab, setTab] = useState<'overview' | 'rfp' | 'activity'>('overview');
  const [side, setSide] = useState<'chat' | 'history' | null>(null);
  const toggleSide = (s: 'chat' | 'history') => setSide((prev) => (prev === s ? null : s));
  useEffect(() => { onSideOpenChange?.(side !== null); }, [side, onSideOpenChange]);
  const [pending, setPending] = useState<ActionDef | null>(null);
  const [note, setNote] = useState('');

  const comp = useMemo(() => completionStatus(task), [task]);
  const d = dueInfo(task);
  const sla = slaInfo(task);
  const terminal = task.state === 'completed' || task.state === 'rejected' || task.state === 'cancelled';
  const acts = actionsFor(task);

  function run(a: ActionDef) {
    if (a.id === 'save-draft') { decide(task.id, 'save-draft'); return; }
    setPending(a); setNote('');
  }
  function confirmPending() {
    if (!pending) return;
    if (pending.needsNote && !note.trim()) return;
    if (task.type === 'etimad-review') { finishEtimad(pending.id, note.trim() || undefined); setPending(null); setNote(''); return; }
    decide(task.id, pending.id as Parameters<typeof decide>[1], note.trim() || undefined);
    setPending(null); setNote('');
  }

  const TABS: { key: typeof tab; en: string; ar: string }[] = [
    { key: 'overview', en: 'Overview', ar: 'نظرة عامة' },
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
        <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <TypeChip type={task.type} isAr={isAr} />
                <StateChip state={task.state} isAr={isAr} />
                <PriorityTag priority={task.priority} isAr={isAr} />
                <SlaPill sla={sla} t={t} />
              </div>
              <h2 className="mt-2 text-[20px] font-bold text-neutral-900 leading-tight">{isAr ? task.titleAr : task.titleEn}</h2>
              <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed max-w-2xl">{isAr ? task.summaryAr : task.summaryEn}</p>
            </div>

            {/* Decision CTAs */}
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

          {/* Request summary band — emphasized amount + key reference fields */}
          <SummaryBand cells={[
            ...(task.amount != null ? [{ label: t('Amount requested', 'القيمة المطلوبة'), value: fmtSAR(task.amount), emphasis: true, dir: 'ltr' as const, grow: true }] : []),
            { label: t('Related record', 'السجل المرتبط'), value: `${ENTITY_META[task.entity.kind][isAr ? 'ar' : 'en']} · ${task.entity.ref}` },
            ...(task.project ? [{ label: t('Project', 'المشروع'), value: tb(task.project, isAr) }] : []),
            task.supplier
              ? { label: t('Vendor', 'المورّد'), value: tb(task.supplier, isAr) }
              : { label: t('Department', 'الإدارة'), value: tb(task.department, isAr) },
            { label: t('Requester', 'مقدّم الطلب'), value: personName(task.requester, isAr), avatar: task.requester },
            { label: t('Due', 'الاستحقاق'), value: fmtDate(task.dueAt, isAr), danger: d.overdue },
          ]} />
          {/* Secondary meta line */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-neutral-500">
            <span><span className="text-neutral-400">{t('Process stage', 'مرحلة العملية')}:</span> <span className="font-medium text-neutral-700">{isAr ? task.stageAr : task.stageEn}</span></span>
            <span className="text-neutral-300">·</span>
            <span><span className="text-neutral-400">{t('Received', 'الاستلام')}:</span> <span className="font-medium text-neutral-700">{fmtDate(task.receivedAt, isAr)}</span></span>
            {task.supplier && <><span className="text-neutral-300">·</span><span><span className="text-neutral-400">{t('Department', 'الإدارة')}:</span> <span className="font-medium text-neutral-700">{tb(task.department, isAr)}</span></span></>}
          </div>

          {/* Pending decision panel */}
          {pending && (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
              <p className="text-[13px] font-semibold text-neutral-800">{t('Confirm', 'تأكيد')}: {t(pending.label[0], pending.label[1])}</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder={pending.needsNote ? t('Reason (required)…', 'السبب (مطلوب)…') : t('Note (optional)…', 'ملاحظة (اختياري)…')}
                className="mt-2 w-full text-[13px] rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setPending(null); setNote(''); }}>{t('Cancel', 'إلغاء')}</Button>
                <Button size="sm" variant={pending.variant === 'danger' ? 'danger' : 'primary'} disabled={pending.needsNote && !note.trim()} onClick={confirmPending}>{t('Confirm', 'تأكيد')}</Button>
              </div>
            </div>
          )}

          {terminal && (
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
          {tab === 'overview' && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <TaskBody task={task} />
            </div>
          )}
          {tab === 'rfp' && <RfpTab rfp={task.rfp} amount={task.amount} isAr={isAr} t={t} />}
          {tab === 'activity' && <ActivityTab task={task} isAr={isAr} t={t} onComment={(x) => addComment(task.id, x)} terminal={terminal} />}
        </div>
      </div>
      {tab === 'rfp' && task.rfp && <JumpFab sections={rfpSections(task.rfp)} isAr={isAr} t={t} />}
      </div>

      {/* ── Right pane: Conversation / Approval flow ─────────────────
          Opens to the LEFT of the icon strip. Inline third pane on md+,
          slide-over on smaller screens. */}
      {side && (
        <>
          <div className="md:hidden absolute inset-y-0 start-0 end-12 bg-black/20 z-20" onClick={() => setSide(null)} />
          <aside className="absolute inset-y-0 end-12 z-30 w-[320px] max-w-[80%] bg-white border-s border-neutral-200 shadow-2xl flex flex-col slide-up
                            md:static md:z-auto md:w-[320px] md:max-w-none md:shadow-none lg:w-[360px]">
            {/* Pane header — switch between the two panes + collapse */}
            <div className="flex items-center justify-between gap-2 ps-3 pe-2 h-12 border-b border-neutral-200 flex-shrink-0">
              <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
                <PaneTab active={side === 'chat'} onClick={() => setSide('chat')} icon={<ChatGlyph className="w-3.5 h-3.5" />}>{t('Conversation', 'المحادثة')}</PaneTab>
                <PaneTab active={side === 'history'} onClick={() => setSide('history')} icon={<HistoryGlyph className="w-3.5 h-3.5" />}>{t('Approval flow', 'مسار الاعتماد')}</PaneTab>
              </div>
              <button onClick={() => setSide(null)} title={t('Collapse panel', 'طي اللوحة')}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 flex-shrink-0">
                <PanelCollapseGlyph className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              {side === 'chat'
                ? <ChatPanel task={task} isAr={isAr} t={t} onSend={(x) => addComment(task.id, x)} disabled={terminal} />
                : <TrailPanel task={task} isAr={isAr} t={t} />}
            </div>
          </aside>
        </>
      )}

      {/* ── Right icon strip (always visible) ───────────────────────── */}
      <nav className="w-12 flex-shrink-0 border-s border-neutral-200 bg-white flex flex-col items-center py-2 gap-1 z-40">
        <StripBtn active={side === 'chat'} onClick={() => toggleSide('chat')} label={t('Chat', 'المحادثة')} icon={<ChatGlyph className="w-[18px] h-[18px]" />} />
        <StripBtn active={side === 'history'} onClick={() => toggleSide('history')} label={t('History', 'السجل')} icon={<HistoryGlyph className="w-[18px] h-[18px]" />} />
        <div className="w-6 h-px bg-neutral-200 my-1" />
        <StripBtn onClick={() => downloadTaskPdf(task)} label={t('Download', 'تنزيل')} icon={<DownloadIcon className="w-[18px] h-[18px]" />} />
      </nav>
    </div>
  );
}

function StripBtn({ active, onClick, label, icon }: { active?: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'}`}>
      {icon}
    </button>
  );
}

function PaneTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors ${active ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
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

function SlaPill({ sla, t }: { sla: ReturnType<typeof slaInfo>; t: T }) {
  const cls = sla.breached ? 'bg-error-50 text-error-700 border-error-100' : sla.tight ? 'bg-warning-50 text-warning-700 border-warning-100' : 'bg-neutral-100 text-neutral-600 border-neutral-200';
  const label = sla.breached ? t(`SLA breached · ${Math.abs(sla.remH)}h over`, `تجاوز اتفاقية الخدمة · ${Math.abs(sla.remH)} ساعة`) : t(`SLA · ${sla.remH}h left`, `اتفاقية الخدمة · ${sla.remH} ساعة متبقية`);
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full border px-2 py-0.5 ${cls}`}><ClockIcon className="w-3 h-3" />{label}</span>;
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

function RfpSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(true);
  return (
    <section id={`rfp-${id}`} className="scroll-mt-16 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 sm:px-5 py-3 text-start hover:bg-neutral-50/70 transition-colors">
        <ChevronRightIcon className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : isAr ? 'rotate-180' : ''}`} />
        <CheckCircleIcon className="w-4 h-4 text-success-600 flex-shrink-0" />
        <h4 className="text-[13px] font-bold text-neutral-800 flex-1 min-w-0">{title}</h4>
      </button>
      {open && <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-neutral-100">{children}</div>}
    </section>
  );
}

function rfpSections(rfp: RfpDetail): { id: string; en: string; ar: string }[] {
  return [
    { id: 'overview', en: 'Overview', ar: 'نظرة عامة' },
    { id: 'scope', en: 'Scope', ar: 'النطاق' },
    ...(rfp.boq.length ? [{ id: 'cost', en: 'Bill of quantities', ar: 'جدول الكميات' }] : []),
    ...(rfp.payment.length ? [{ id: 'payment', en: 'Payment', ar: 'الدفعات' }] : []),
    ...(rfp.evaluation.length ? [{ id: 'evaluation', en: 'Evaluation', ar: 'التقييم' }] : []),
    ...(rfp.qualification.length ? [{ id: 'qualification', en: 'Qualification', ar: 'التأهيل' }] : []),
    ...(rfp.documents.length ? [{ id: 'documents', en: 'Documents', ar: 'المستندات' }] : []),
  ];
}

function RfpTab({ rfp, amount, isAr, t }: { rfp?: RfpDetail; amount?: number; isAr: boolean; t: T }) {
  if (!rfp) return <div className="rounded-xl border border-neutral-200 bg-white p-6 text-[13px] text-neutral-500 shadow-sm">{t('No RFP record linked to this task.', 'لا يوجد سجل منافسة مرتبط بهذه المهمة.')}</div>;
  const boqTotal = rfp.boq.reduce((s, l) => s + (Number(l.qty) || 1) * l.unitPrice, 0);
  const estValue = boqTotal > 0 ? boqTotal : (amount ?? 0);
  const costSegs = rfp.boq.map((l, i) => ({ value: (Number(l.qty) || 1) * l.unitPrice, color: PALETTE[i % PALETTE.length], label: isAr ? l.itemAr : l.itemEn }));
  const evalMax = Math.max(1, ...rfp.evaluation.map((c) => c.weight));

  const stats: { label: string; value: string; dir?: 'ltr' }[] = [];
  if (estValue > 0) stats.push({ label: t('Estimated value', 'القيمة التقديرية'), value: fmtSAR(estValue), dir: 'ltr' });
  if (rfp.boq.length) stats.push({ label: t('BOQ line items', 'بنود الجدول'), value: String(rfp.boq.length) });
  if (rfp.payment.length) stats.push({ label: t('Payment stages', 'مراحل الدفع'), value: String(rfp.payment.length) });
  if (rfp.evaluation.length) stats.push({ label: t('Eval. criteria', 'معايير التقييم'), value: String(rfp.evaluation.length) });

  return (
    <div className="space-y-5">
        {/* Hero stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white shadow-sm px-4 py-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{s.label}</p>
                <p className="text-[18px] font-bold text-neutral-900 mt-0.5 tabular-nums" dir={s.dir}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Overview */}
        <RfpSection id="overview" title={t('Request overview', 'نظرة عامة على الطلب')}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{rfp.refId}</p>
          <h3 className="text-[16px] font-bold text-neutral-900 mt-0.5">{isAr ? rfp.titleAr : rfp.titleEn}</h3>
          <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">{isAr ? rfp.summaryAr : rfp.summaryEn}</p>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 border-t border-neutral-100 pt-4">
            {rfp.meta.map((m, i) => (
              <div key={i} className="min-w-0"><dt className="text-[10.5px] uppercase tracking-wide text-neutral-400">{tb(m.label, isAr)}</dt>
                <dd className="text-[13px] font-medium text-neutral-800 truncate mt-0.5" dir={m.dir}>{m.value}</dd></div>
            ))}
          </dl>
        </RfpSection>

        {/* Scope */}
        <RfpSection id="scope" title={t('Scope of work', 'نطاق العمل')}>
          <p className="text-[13px] text-neutral-700 leading-relaxed">{isAr ? rfp.scopeAr : rfp.scopeEn}</p>
        </RfpSection>

        {/* Bill of quantities — donut + legend + table */}
        {rfp.boq.length > 0 && (
          <RfpSection id="cost" title={t('Bill of quantities', 'جدول الكميات')}>
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="flex items-center gap-4 lg:flex-col lg:items-center flex-shrink-0">
                <div className="relative">
                  <Donut segments={costSegs} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase tracking-wide text-neutral-400">{t('Total', 'الإجمالي')}</span>
                    <span className="text-[13px] font-bold text-neutral-900 tabular-nums" dir="ltr">{fmtSAR(boqTotal).replace('SAR ', '')}</span>
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
                    <th className="px-2 py-2 font-medium w-16 text-center">{t('Qty', 'الكمية')}</th>
                    <th className="px-2 py-2 font-medium w-28 text-end">{t('Line total', 'الإجمالي')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {rfp.boq.map((l, i) => (
                      <tr key={i} className="bg-white">
                        <td className="ps-3 pe-2 py-2 text-[12.5px] text-neutral-800"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />{isAr ? l.itemAr : l.itemEn}</span></td>
                        <td className="px-2 py-2 text-center text-[12px] text-neutral-600">{l.qty} {l.unit}</td>
                        <td className="px-2 py-2 text-end text-[12.5px] font-semibold text-neutral-800 tabular-nums" dir="ltr">{fmtSAR((Number(l.qty) || 1) * l.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
                    <tr>
                      <td className="ps-3 pe-2 py-1.5 text-end text-[12px] text-neutral-500" colSpan={2}>{t('Subtotal', 'المجموع الفرعي')}</td>
                      <td className="px-2 py-1.5 text-end text-[12.5px] font-semibold tabular-nums text-neutral-700" dir="ltr">{fmtSAR(boqTotal)}</td>
                    </tr>
                    <tr>
                      <td className="ps-3 pe-2 py-1.5 text-end text-[12px] text-neutral-500" colSpan={2}>{t('VAT (15%)', 'ضريبة القيمة المضافة (15%)')}</td>
                      <td className="px-2 py-1.5 text-end text-[12.5px] font-semibold tabular-nums text-neutral-700" dir="ltr">{fmtSAR(boqTotal * 0.15)}</td>
                    </tr>
                    <tr className="border-t border-neutral-200">
                      <td className="ps-3 pe-2 py-2 text-end text-[12.5px] font-bold text-neutral-800" colSpan={2}>{t('Grand total', 'الإجمالي الكلي')}</td>
                      <td className="px-2 py-2 text-end text-[13px] font-bold tabular-nums text-brand-700" dir="ltr">{fmtSAR(boqTotal * 1.15)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </RfpSection>
        )}

        {/* Payment — validity bar + numbered stage cards */}
        {rfp.payment.length > 0 && (
          <RfpSection id="payment" title={t('Payment schedule', 'جدول الدفعات')}>
            <div className="h-2 rounded-full overflow-hidden flex mb-4 bg-neutral-100">
              {rfp.payment.map((p, i) => (
                <div key={i} style={{ width: `${p.pct}%`, background: PALETTE[i % PALETTE.length] }} />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rfp.payment.map((p, i) => (
                <div key={i} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
                    <span className="text-[12.5px] font-semibold text-neutral-700 truncate">{isAr ? p.stageAr : p.stageEn}</span>
                  </div>
                  <p className="text-[20px] font-bold text-neutral-900 mt-1.5 tabular-nums">{p.pct}%</p>
                  {estValue > 0 && <p className="text-[12px] text-neutral-500 tabular-nums" dir="ltr">{fmtSAR((p.pct / 100) * estValue)}</p>}
                </div>
              ))}
            </div>
          </RfpSection>
        )}

        {/* Evaluation — weight bars */}
        {rfp.evaluation.length > 0 && (
          <RfpSection id="evaluation" title={t('Evaluation criteria', 'معايير التقييم')}>
            <div className="space-y-2.5">
              {rfp.evaluation.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <span className="text-neutral-700">{isAr ? c.criterionAr : c.criterionEn}</span>
                    <span className="font-semibold text-neutral-800 tabular-nums">{c.weight}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.weight / evalMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </RfpSection>
        )}

        {/* Qualification */}
        {rfp.qualification.length > 0 && (
          <RfpSection id="qualification" title={t('Qualification requirements', 'متطلبات التأهيل')}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {rfp.qualification.map((qr, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-700"><CheckCircleIcon className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />{isAr ? qr.reqAr : qr.reqEn}</li>
              ))}
            </ul>
          </RfpSection>
        )}

        {/* Documents */}
        {rfp.documents.length > 0 && (
          <RfpSection id="documents" title={t('Documents', 'المستندات')}>
            <ul className="space-y-1.5">
              {rfp.documents.map((dc, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px] text-neutral-700 rounded-lg border border-neutral-200 bg-neutral-50/60 px-3 py-2">
                  <DownloadIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />{isAr ? dc.ar : dc.en}
                </li>
              ))}
            </ul>
          </RfpSection>
        )}
    </div>
  );
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

function ActivityTab({ task, isAr, t, onComment, terminal }: { task: Task; isAr: boolean; t: T; onComment: (x: string) => void; terminal: boolean }) {
  const [c, setC] = useState('');
  const items = [...task.activity].reverse();
  return (
    <div className="max-w-2xl">
      {!terminal && (
        <div className="mb-5">
          <textarea value={c} onChange={(e) => setC(e.target.value)} rows={2} placeholder={t('Add a comment…', 'أضف تعليقاً…')}
            className="w-full text-[13px] rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
          <div className="mt-1.5 flex justify-end"><Button size="sm" variant="secondary" disabled={!c.trim()} onClick={() => { onComment(c); setC(''); }}>{t('Comment', 'تعليق')}</Button></div>
        </div>
      )}
      <ol className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="flex gap-3">
            <Avatar name={a.actor.name} id={a.actor.id} className="w-7 h-7" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-medium text-neutral-800">{personName(a.actor, isAr)}</span>
                <span className="text-[11px] text-neutral-400">{fmtDateTime(a.at, isAr)}</span>
                {a.kind === 'decision' && <span className="text-[10.5px] font-semibold text-brand-700 bg-brand-50 rounded-full px-1.5">{t('Decision', 'قرار')}</span>}
              </div>
              <p className={`text-[13px] mt-0.5 ${a.kind === 'decision' ? 'font-semibold text-neutral-800' : 'text-neutral-600'}`}>
                {a.kind === 'decision' && a.decision ? tb(a.decision, isAr) : a.system ? tb(a.system, isAr) : a.text}
              </p>
              {a.kind === 'decision' && a.text && <p className="text-[12px] text-neutral-500 mt-0.5">“{a.text}”</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ChatPanel({ task, isAr, t, onSend, disabled }: { task: Task; isAr: boolean; t: T; onSend: (x: string) => void; disabled: boolean }) {
  const [msg, setMsg] = useState('');
  const comments = task.activity.filter((a) => a.kind === 'comment');
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 && <p className="text-[12.5px] text-neutral-400 text-center mt-6">{t('No messages yet. Start the conversation.', 'لا توجد رسائل بعد. ابدأ المحادثة.')}</p>}
        {comments.map((a) => {
          const mine = a.actor.id === 'u-me';
          return (
            <div key={a.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <Avatar name={a.actor.name} id={a.actor.id} className="w-6 h-6" />
              <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-3 py-2 text-[13px] ${mine ? 'bg-brand-600 text-white rounded-se-sm' : 'bg-neutral-100 text-neutral-800 rounded-ss-sm'}`}>{a.text}</div>
                <span className="text-[10px] text-neutral-400 mt-0.5 px-1">{personName(a.actor, isAr)} · {fmtDateTime(a.at, isAr)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {!disabled && (
        <div className="p-3 border-t border-neutral-200 flex items-end gap-2">
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (msg.trim()) { onSend(msg); setMsg(''); } } }}
            placeholder={t('Message…', 'رسالة…')}
            className="flex-1 resize-none text-[13px] rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
          <Button size="sm" variant="primary" disabled={!msg.trim()} onClick={() => { onSend(msg); setMsg(''); }}>{t('Send', 'إرسال')}</Button>
        </div>
      )}
    </>
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
function ChatGlyph({ className = '' }: { className?: string }) {
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
