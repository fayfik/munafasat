// Dashboard for an approver in the flow ("View as" someone other than the requester):
// their queue against SLA, the checks their role is responsible for, and — for leads —
// the team's workload and the requests in flight.
import { useMemo } from 'react';
import { useInbox, viewOf, dueInfo, completionStatus, fmtSAR } from '../inbox/store';
import { personas, teamOf, flowStatus, type PersonaKey } from '../inbox/flow';
import { TYPE_META } from '../inbox/meta';
import { useRequests } from '../context/RequestStore';
import { useLanguage, useT } from '../context/LanguageContext';
import { openInboxTask } from '../lib/appNav';
import { ClockIcon, AlertTriangleIcon, CheckCircleIcon, NavInboxIcon, ChevronRightIcon } from '../components/Icons';
import type { Person, Task } from '../inbox/types';

type T = (en: string, ar: string) => string;
const terminal = (x: Task) => x.state === 'completed' || x.state === 'rejected' || x.state === 'cancelled';

export default function ApproverDashboard({ viewer }: { viewer: Person }) {
  const { isAr } = useLanguage();
  const t = useT();
  const { tasks } = useInbox();
  const { userName } = useRequests();
  const key = (personas(userName).find((p) => p.person.id === viewer.id)?.key ?? 'officer') as PersonaKey;
  const lead = personas(userName).find((p) => p.key === key)?.lead;

  const queueOf = (p: Person) => tasks.filter((x) => x.assignee.id === p.id && viewOf(x, tasks, p).includes('needs-action'));
  const queue = useMemo(() => queueOf(viewer).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)), [tasks, viewer]); // eslint-disable-line react-hooks/exhaustive-deps
  const mineDone = tasks.filter((x) => x.assignee.id === viewer.id && x.state === 'completed');
  const overdue = queue.filter((x) => dueInfo(x).overdue);
  const soon = queue.filter((x) => dueInfo(x).soon);
  const onTime = mineDone.length ? Math.round((mineDone.filter((x) => +new Date(x.completedAt ?? 0) <= +new Date(x.dueAt)).length / mineDone.length) * 100) : null;
  const waiting = tasks.filter((x) => x.assignee.id === viewer.id && x.state === 'waiting');

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-7 space-y-6" data-testid="approver-dashboard">
      <div>
        <h1 className="text-title-sm font-semibold text-neutral-900">{t(`Hello, ${viewer.name.split(' ')[0]}`, `مرحباً ${(viewer.nameAr ?? viewer.name).split(' ')[0]}`)}</h1>
        <p className="text-body-md text-neutral-500 mt-1">{isAr ? `${viewer.roleAr ?? viewer.role} · ${viewer.deptAr ?? viewer.dept}` : `${viewer.role} · ${viewer.dept}`}</p>
      </div>

      {/* My queue + SLA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="queue-kpis">
        <Kpi icon={<NavInboxIcon className="w-4 h-4" />} label={t('To action', 'للإجراء')} value={String(queue.length)} sub={waiting.length ? t(`${waiting.length} returned, with the requester`, `${waiting.length} أُعيدت لمقدم الطلب`) : t('In your queue now', 'في قائمتك الآن')} />
        <Kpi icon={<AlertTriangleIcon className="w-4 h-4" />} label={t('Overdue', 'متأخرة')} value={String(overdue.length)} tone={overdue.length ? 'critical' : undefined} sub={overdue.length ? t('Past the SLA', 'تجاوزت مستوى الخدمة') : t('Nothing late', 'لا شيء متأخر')} />
        <Kpi icon={<ClockIcon className="w-4 h-4" />} label={t('Due within a day', 'مستحقة خلال يوم')} value={String(soon.length)} tone={soon.length ? 'warning' : undefined} sub={t('Act on these next', 'ابدأ بهذه')} />
        <Kpi icon={<CheckCircleIcon className="w-4 h-4" />} label={t('Completed on time', 'أُنجزت في الوقت')} value={onTime == null ? '—' : `${onTime}%`} sub={t(`${mineDone.length} completed`, `${mineDone.length} مكتملة`)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">
        <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden" data-testid="my-queue">
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neutral-900">{t('My queue', 'قائمتي')}</h2>
            <span className="text-[12px] text-neutral-500">{t('Soonest due first', 'الأقرب استحقاقاً أولاً')}</span>
          </div>
          {queue.length === 0 ? <p className="px-5 py-8 text-[13px] text-neutral-500 text-center">{t('Your queue is clear.', 'قائمتك فارغة.')}</p> : (
            <ul className="divide-y divide-neutral-100">
              {queue.map((x) => <QueueRow key={x.id} task={x} isAr={isAr} t={t} />)}
            </ul>
          )}
        </section>
        <RoleChecks k={key} queue={queue} tasks={tasks} viewer={viewer} isAr={isAr} t={t} />
      </div>

      {lead && <Workload team={teamOf(key)} queueOf={queueOf} t={t} isAr={isAr} />}
      {lead && <InFlight tasks={tasks} t={t} isAr={isAr} />}
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: 'warning' | 'critical' }) {
  const ink = tone === 'critical' ? 'text-error-700' : tone === 'warning' ? 'text-warning-700' : 'text-neutral-900';
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3.5">
      <p className="text-[12px] font-medium text-neutral-500 flex items-center gap-1.5"><span className="text-neutral-400">{icon}</span>{label}</p>
      <p className={`mt-1.5 text-[26px] font-bold tabular-nums leading-none ${ink}`}>{value}</p>
      <p className="mt-1.5 text-[11.5px] text-neutral-500">{sub}</p>
    </div>
  );
}

/** One queue row with its SLA used: elapsed time against the task's SLA window. */
function QueueRow({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const d = dueInfo(task);
  const start = +new Date(task.receivedAt), end = +new Date(task.dueAt);
  const used = Math.max(0, Math.min(1, (Date.now() - start) / Math.max(1, end - start)));
  const bar = d.overdue ? 'bg-error-500' : used > 0.75 ? 'bg-warning-500' : 'bg-brand-500';
  const hours = Math.round((end - Date.now()) / 3600000);
  return (
    <li>
      <button type="button" onClick={() => openInboxTask(task.id)} className="w-full text-start px-5 py-3 hover:bg-neutral-50 flex items-center gap-4" data-testid="queue-row">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-neutral-900 truncate">{isAr ? task.titleAr : task.titleEn}</p>
          <p className="text-[11.5px] text-neutral-500 mt-0.5 truncate">
            <span className="font-semibold text-neutral-600">{isAr ? TYPE_META[task.type].ar : TYPE_META[task.type].en}</span> · <span dir="ltr">{task.entity.ref}</span> · {isAr ? task.stageAr : task.stageEn}{task.amount ? <> · <span dir="ltr">{fmtSAR(task.amount)}</span></> : null}
          </p>
        </div>
        <div className="w-40 flex-shrink-0" title={t(`${Math.round(used * 100)}% of the SLA used`, `استُخدم ${Math.round(used * 100)}% من مستوى الخدمة`)}>
          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(4, used * 100)}%` }} /></div>
          <p className={`mt-1 text-[11px] font-semibold ${d.overdue ? 'text-error-700' : used > 0.75 ? 'text-warning-700' : 'text-neutral-500'}`}>
            {d.overdue ? <span className="inline-flex items-center gap-1"><AlertTriangleIcon className="w-3 h-3" />{t(`Overdue ${Math.abs(d.days) || '<1'}d`, `متأخرة ${Math.abs(d.days) || '<1'}ي`)}</span>
              : hours < 24 ? t(`${Math.max(hours, 0)}h left`, `${Math.max(hours, 0)} س متبقية`) : t(`${Math.round(hours / 24)}d left`, `${Math.round(hours / 24)} ي متبقية`)}
          </p>
        </div>
        <ChevronRightIcon className={`w-4 h-4 text-neutral-300 ${isAr ? 'rotate-180' : ''}`} />
      </button>
    </li>
  );
}

// ── Role-specific checks ───────────────────────────────────────────────────────
interface Check { label: string; value: string; note?: string; tone?: 'warning' | 'critical' | 'good' }
function RoleChecks({ k, queue, tasks, viewer, isAr, t }: { k: PersonaKey; queue: Task[]; tasks: Task[]; viewer: Person; isAr: boolean; t: T }) {
  const value = queue.reduce((s, x) => s + (x.amount ?? 0), 0);
  const openItems = queue.reduce((s, x) => s + completionStatus(x).missing.length, 0);
  const evalOff = queue.filter((x) => x.rfp && x.rfp.evaluation.length && x.rfp.evaluation.reduce((s, c) => s + c.weight, 0) !== 100);
  const lines = queue.reduce((s, x) => s + (x.rfp?.boq.length ?? 0), 0);
  const assetLines = queue.reduce((s, x) => s + (x.rfp?.boq.filter((l) => l.category === 'Material').length ?? 0), 0);
  const byType = (ty: Task['type']) => queue.filter((x) => x.type === ty).length;
  const returned = tasks.filter((x) => x.assignee.id === viewer.id && x.state === 'waiting').length;
  const unassigned = queue.filter((x) => x.assignTo?.length).length;
  const big = queue.filter((x) => (x.amount ?? 0) > 10_000_000).length;

  const checks: Check[] = ({
    manager: [
      { label: t('Value awaiting your approval', 'قيمة بانتظار اعتمادك'), value: fmtSAR(value) },
      { label: t('Requests returned to requesters', 'طلبات أُعيدت لمقدميها'), value: String(returned), note: t('They come back once every comment is resolved.', 'تعود بعد حل جميع الملاحظات.') },
    ],
    techMember: [
      { label: t('Criteria weights not at 100%', 'أوزان معايير لا تساوي 100%'), value: String(evalOff.length), tone: evalOff.length ? 'warning' : 'good', note: evalOff.map((x) => x.entity.ref).join(', ') || t('All requests add up.', 'جميع الطلبات مكتملة.') },
      { label: t('Checklist items still open', 'بنود تحقق مفتوحة'), value: String(openItems) },
    ],
    cyber: [{ label: t('Requests needing data classification', 'طلبات تحتاج تصنيف البيانات'), value: String(queue.length) }, { label: t('Checklist items still open', 'بنود تحقق مفتوحة'), value: String(openItems) }],
    bcm: [{ label: t('Requests needing a criticality tier', 'طلبات تحتاج مستوى الحرجية'), value: String(queue.length) }, { label: t('Checklist items still open', 'بنود تحقق مفتوحة'), value: String(openItems) }],
    opRisk: [{ label: t('Risk assessments to complete', 'تقييمات مخاطر للإكمال'), value: String(queue.length) }, { label: t('Checklist items still open', 'بنود تحقق مفتوحة'), value: String(openItems) }],
    ea: [{ label: t('Architecture fit checks', 'فحوص التوافق المعماري'), value: String(queue.length) }, { label: t('Checklist items still open', 'بنود تحقق مفتوحة'), value: String(openItems) }],
    gl: [
      { label: t('Budget to confirm', 'ميزانية للتأكيد'), value: fmtSAR(value) },
      { label: t('BOQ lines to code (GL / material group)', 'بنود للترميز'), value: String(lines) },
    ],
    assets: [
      { label: t('Equipment & material lines', 'بنود المعدات والمواد'), value: String(assetLines), note: t('Each needs an asset item in ECC.', 'يحتاج كل منها بند أصل في ECC.') },
      { label: t('Checklist items still open', 'بنود تحقق مفتوحة'), value: String(openItems) },
    ],
    finQual: [{ label: t('Financial criteria fields to fill', 'حقول معايير مالية للتعبئة'), value: String(openItems) }, { label: t('Requests waiting on you', 'طلبات بانتظارك'), value: String(queue.length) }],
    procQual: [{ label: t('Qualification fields to fill', 'حقول تأهيل للتعبئة'), value: String(openItems) }, { label: t('Requests waiting on you', 'طلبات بانتظارك'), value: String(queue.length) }],
    tl: [
      { label: t('Requests to route', 'طلبات للتوجيه'), value: String(unassigned), note: t('Send to DOA, or assign an officer.', 'أرسلها للاعتماد أو أسندها لأخصائي.') },
      { label: t('DOA approvals', 'اعتمادات الصلاحيات'), value: String(queue.filter((x) => x.doaInfo).length) },
    ],
    officer: [
      { label: t('Etimad E-Market checks', 'فحوص سوق اعتماد'), value: String(byType('etimad-review') + byType('route-check')) },
      { label: t('RFP reviews before DOA', 'مراجعات قبل الاعتماد'), value: String(byType('review')) },
    ],
    director: [
      { label: t('Estimated value awaiting you', 'قيمة تقديرية بانتظارك'), value: fmtSAR(value) },
      { label: t('Above SAR 10M (your DOA level)', 'فوق 10 ملايين (مستوى صلاحيتك)'), value: String(big) },
    ],
    requester: [],
  } as Record<string, Check[]>)[k === 'yousef' || k === 'amal' ? 'officer' : k] ?? [];
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5" data-testid="role-checks">
      <h2 className="text-[14px] font-semibold text-neutral-900">{t('Your checks', 'فحوصك')}</h2>
      <p className="text-[12px] text-neutral-500 mt-0.5">{isAr ? viewer.roleAr ?? viewer.role : viewer.role}</p>
      <dl className="mt-3 space-y-3">
        {checks.map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-200 px-3.5 py-2.5">
            <dt className="text-[12px] text-neutral-500">{c.label}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              {c.tone === 'warning' && <AlertTriangleIcon className="w-3.5 h-3.5 text-warning-600" />}
              {c.tone === 'good' && <CheckCircleIcon className="w-3.5 h-3.5 text-success-600" />}
              <span className="text-[16px] font-bold text-neutral-900 tabular-nums" dir="ltr">{c.value}</span>
            </dd>
            {c.note && <p className="text-[11.5px] text-neutral-500 mt-0.5">{c.note}</p>}
          </div>
        ))}
      </dl>
    </section>
  );
}

// ── Team workload (leads) ──────────────────────────────────────────────────────
function Workload({ team, queueOf, t, isAr }: { team: Person[]; queueOf: (p: Person) => Task[]; t: T; isAr: boolean }) {
  const rows = team.map((p) => { const q = queueOf(p); return { p, open: q.length, late: q.filter((x) => dueInfo(x).overdue).length, soon: q.filter((x) => dueInfo(x).soon).length }; })
    .sort((a, b) => b.open - a.open);
  const max = Math.max(1, ...rows.map((r) => r.open));
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5" data-testid="team-workload">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[14px] font-semibold text-neutral-900">{t('Team workload', 'عبء عمل الفريق')}</h2>
        <span className="flex items-center gap-3 text-[11.5px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />{t('On track', 'في الموعد')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-error-500" />{t('Overdue', 'متأخرة')}</span>
        </span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li key={r.p.id} className="grid grid-cols-[180px_1fr_120px] items-center gap-3 text-[12.5px]" title={t(`${r.open} open · ${r.late} overdue · ${r.soon} due within a day`, `${r.open} مفتوحة · ${r.late} متأخرة`)}>
            <span className="min-w-0"><span className="block font-semibold text-neutral-800 truncate">{isAr ? r.p.nameAr ?? r.p.name : r.p.name}</span><span className="block text-[11px] text-neutral-500 truncate">{isAr ? r.p.roleAr ?? r.p.role : r.p.role}</span></span>
            <span className="flex h-3 gap-[2px]">
              {r.open - r.late > 0 && <span className="h-full rounded-[3px] bg-brand-500" style={{ width: `${((r.open - r.late) / max) * 100}%` }} />}
              {r.late > 0 && <span className="h-full rounded-[3px] bg-error-500" style={{ width: `${(r.late / max) * 100}%` }} />}
            </span>
            <span className="text-end tabular-nums text-neutral-700"><b className="text-neutral-900">{r.open}</b> {t('open', 'مفتوحة')}{r.late ? <span className="text-error-700"> · {r.late} {t('late', 'متأخرة')}</span> : null}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Requests in the live approval flow: how far each has got and who has it now. */
function InFlight({ tasks, t, isAr }: { tasks: Task[]; t: T; isAr: boolean }) {
  const nos = [...new Set(tasks.filter((x) => x.flow).map((x) => x.flow!.requestNo))];
  const rows = nos.map((no) => ({ no, fs: flowStatus(tasks, no)! })).filter((r) => r.fs);
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden" data-testid="in-flight">
      <div className="px-5 py-3.5 border-b border-neutral-100">
        <h2 className="text-[14px] font-semibold text-neutral-900">{t('Requests in the approval flow', 'الطلبات في مسار الاعتماد')}</h2>
      </div>
      {rows.length === 0 ? <p className="px-5 py-6 text-[12.5px] text-neutral-500">{t('No live requests yet — submit a tender request to start one.', 'لا توجد طلبات بعد — قدّم طلب منافسة للبدء.')}</p> : (
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wide text-neutral-500 bg-neutral-50/60 border-b border-neutral-100">
            <th className="text-start font-semibold px-5 py-2">{t('Request', 'الطلب')}</th>
            <th className="text-start font-semibold px-3 py-2">{t('With', 'لدى')}</th>
            <th className="text-start font-semibold px-3 py-2 w-56">{t('Progress', 'التقدم')}</th>
            <th className="text-end font-semibold px-5 py-2">{t('Value', 'القيمة')}</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map(({ no, fs }) => {
              const first = fs.stages[0];
              const status = fs.state === 'approved' ? t('Approved', 'معتمد') : fs.state === 'rejected' ? t('Rejected', 'مرفوض') : fs.state === 'returned' ? t('With the requester — comments', 'لدى مقدم الطلب — ملاحظات') : fs.current.map((x) => x.assignee.name).join(', ');
              return (
                <tr key={no}>
                  <td className="px-5 py-2.5"><p className="font-semibold text-neutral-800">{isAr ? first.entity.titleAr : first.entity.titleEn}</p><p className="text-[11px] text-neutral-400 font-mono" dir="ltr">{no}</p></td>
                  <td className="px-3 py-2.5 text-neutral-700">{status}{fs.state === 'in-review' && fs.current[0] && <p className="text-[11px] text-neutral-500">{fs.current.length > 1 ? t('Parallel reviews', 'مراجعات متوازية') : isAr ? fs.current[0].stageAr : fs.current[0].stageEn}</p>}</td>
                  <td className="px-3 py-2.5">
                    <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(fs.done / fs.total) * 100}%` }} /></div>
                    <p className="text-[11px] text-neutral-500 mt-1">{t(`${fs.done} of ${fs.total} stages`, `${fs.done} من ${fs.total} مراحل`)}</p>
                  </td>
                  <td className="px-5 py-2.5 text-end tabular-nums font-semibold text-neutral-800" dir="ltr">{first.amount ? fmtSAR(first.amount) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
