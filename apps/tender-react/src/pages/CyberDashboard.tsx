// Manual build — Cyber Security reviews on the dashboard (Kholoud's points 4 and 9:
// dashboard and Excel export, review history and activity log). Replaces the team's Excel
// tracker: every request Cyber has had, its status, owner, reviewer, dates and review time,
// with the full log one click away and both exportable.
import { Fragment, useState } from 'react';
import { useInbox, dueInfo } from '../inbox/store';
import { unclaimed, CYBER_TEAM } from '../inbox/teams';
import { openInboxTask } from '../lib/appNav';
import type { Task } from '../inbox/types';
import { Button } from '../components/ui';

type T = (en: string, ar: string) => string;
const isCyber = (t: Task) => t.queue?.team === 'cyber' || /Cyber Security/.test(t.stageEn);
const fmtD = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/** Working hours between two dates (Sun–Thu, 8:00–16:00) — the SLA clock the teams asked for. */
export function workingHours(fromIso: string, toIso?: string): number {
  let h = 0; const end = toIso ? new Date(toIso) : new Date();
  const d = new Date(fromIso);
  while (d < end && h < 24 * 400) {
    const day = d.getDay(), hr = d.getHours();
    if (day !== 5 && day !== 6 && hr >= 8 && hr < 16) h++;
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  return h;
}
const dur = (h: number, t: T) => (h < 8 ? t(`${h} h`, `${h} س`) : t(`${(h / 8).toFixed(1)} working days`, `${(h / 8).toFixed(1)} أيام عمل`));

interface Row { task: Task; status: string; reviewer: string; submitted?: string; received: string; hours: number; decision: string; comments: number }

function rowsOf(tasks: Task[], t: T): Row[] {
  return tasks.filter(isCyber).map((x) => {
    const st = x.reconfirm && x.state !== 'completed' ? t('Re-confirm', 'إعادة تأكيد')
      : unclaimed(x) ? t('In queue', 'في القائمة')
      : x.state === 'completed' ? t('Approved', 'معتمد') : x.state === 'waiting' ? t('Returned', 'مُعاد')
      : x.state === 'rejected' ? t('Rejected', 'مرفوض') : x.state === 'cancelled' ? t('Cancelled', 'ملغى')
      : dueInfo(x).overdue ? t('Overdue', 'متأخر') : t('In review', 'قيد المراجعة');
    return {
      task: x, status: st,
      reviewer: unclaimed(x) ? '—' : x.assignee.name,
      submitted: x.activity[0]?.at, received: x.receivedAt,
      hours: workingHours(x.receivedAt, x.state === 'completed' || x.state === 'waiting' ? x.completedAt : undefined),
      decision: x.decision?.en ?? '—',
      comments: x.activity.filter((a) => a.kind === 'comment' && !a.draft).length,
    };
  }).sort((a, b) => +new Date(b.received) - +new Date(a.received));
}

function download(name: string, rows: (string | number)[][]) {
  // CSV with a UTF-8 BOM opens directly in Excel, Arabic included.
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

export default function CyberDashboard({ isAr, t }: { isAr: boolean; t: T }) {
  const { tasks } = useInbox();
  const rows = rowsOf(tasks, t);
  const [open, setOpen] = useState<string | null>(null);
  const done = rows.filter((r) => r.task.state === 'completed' || r.task.state === 'waiting');
  const avg = done.length ? Math.round(done.reduce((s, r) => s + r.hours, 0) / done.length) : 0;

  const exportTable = () => download('cyber-reviews.csv', [
    ['Request', 'Title', 'Requesting department', 'Status', 'Reviewer', 'Submitted', 'Received by Cyber', 'Review time (working hours)', 'Decision', 'Data classification', 'Comments'],
    ...rows.map((r) => [r.task.entity.ref, r.task.entity.titleEn, r.task.department.en, r.status, r.reviewer, fmtD(r.submitted), fmtD(r.received), r.hours, r.decision, r.task.cyberReview?.classification ?? '', r.comments]),
  ]);
  const exportLog = () => download('cyber-review-log.csv', [
    ['Request', 'Date & time', 'Event', 'By', 'Note'],
    ...rows.flatMap((r) => r.task.activity.filter((a) => !a.draft).map((a) => [r.task.entity.ref, new Date(a.at).toLocaleString('en-GB'),
      a.kind === 'comment' ? `Comment${a.anchor ? ` on ${a.anchor.label.en}` : ''}` : a.decision?.en ?? a.system?.en ?? '', a.actor.name, a.text ?? ''])),
  ]);

  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden" data-testid="cyber-reviews">
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[14px] font-semibold text-neutral-900">{t('Cyber Security reviews', 'مراجعات الأمن السيبراني')}</h2>
          <p className="text-[12px] text-neutral-500">{t(`${rows.length} requests · ${rows.filter((r) => unclaimed(r.task)).length} in the queue · average review ${dur(avg, t)} (working time, Sun–Thu)`, `${rows.length} طلبات · ${rows.filter((r) => unclaimed(r.task)).length} في القائمة · متوسط المراجعة ${dur(avg, t)}`)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" data-testid="export-reviews" onClick={exportTable}>{t('Export to Excel', 'تصدير إلى Excel')}</Button>
          <Button size="sm" variant="secondary" data-testid="export-log" onClick={exportLog}>{t('Export review log', 'تصدير سجل المراجعة')}</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[900px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wide text-neutral-500 bg-neutral-50/60 border-b border-neutral-100">
            {[t('Request', 'الطلب'), t('Status', 'الحالة'), t('Owner', 'الجهة الطالبة'), t('Reviewer', 'المراجع'), t('Submitted', 'التقديم'), t('Received', 'الاستلام'), t('Review time', 'مدة المراجعة'), t('Decision', 'القرار'), ''].map((h, i) => <th key={i} className="text-start font-semibold px-3 py-2 first:ps-5">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => (
              <Fragment key={r.task.id}>
                <tr className="hover:bg-neutral-50 cursor-pointer" onClick={() => openInboxTask(r.task.id)} data-testid="cyber-row">
                  <td className="ps-5 pe-3 py-2.5"><p className="font-semibold text-neutral-800 truncate max-w-[240px]">{isAr ? r.task.entity.titleAr : r.task.entity.titleEn}</p><p className="text-[11px] text-neutral-400 font-mono" dir="ltr">{r.task.entity.ref}</p></td>
                  <td className="px-3 py-2.5"><span className={`text-[11.5px] font-semibold rounded-full px-2 py-0.5 ${r.status === t('In queue', 'في القائمة') ? 'bg-[#EEF4FB] text-[#2A6193]' : r.status === t('Approved', 'معتمد') ? 'bg-success-50 text-success-700' : r.status === t('Overdue', 'متأخر') || r.status === t('Returned', 'مُعاد') ? 'bg-error-50 text-error-700' : 'bg-warning-50 text-warning-700'}`}>{r.status}</span></td>
                  <td className="px-3 py-2.5 text-neutral-600 truncate max-w-[160px]">{isAr ? r.task.department.ar : r.task.department.en}</td>
                  <td className="px-3 py-2.5 text-neutral-700">{r.reviewer}</td>
                  <td className="px-3 py-2.5 text-neutral-600 whitespace-nowrap">{fmtD(r.submitted)}</td>
                  <td className="px-3 py-2.5 text-neutral-600 whitespace-nowrap">{fmtD(r.received)}</td>
                  <td className="px-3 py-2.5 text-neutral-700 whitespace-nowrap tabular-nums">{dur(r.hours, t)}</td>
                  <td className="px-3 py-2.5 text-neutral-700">{r.decision}</td>
                  <td className="pe-5 py-2.5 text-end"><button type="button" onClick={(e) => { e.stopPropagation(); setOpen(open === r.task.id ? null : r.task.id); }} className="text-[12px] font-semibold text-brand-700 hover:underline whitespace-nowrap" data-testid="row-history">{open === r.task.id ? t('Hide history', 'إخفاء السجل') : t(`History (${r.task.activity.filter((a) => !a.draft).length})`, `السجل (${r.task.activity.length})`)}</button></td>
                </tr>
                {open === r.task.id && (
                  <tr><td colSpan={9} className="bg-neutral-50/60 px-5 py-3">
                    <ol className="space-y-1.5">
                      {r.task.activity.filter((a) => !a.draft).map((a) => (
                        <li key={a.id} className="text-[12px] text-neutral-700 flex gap-3">
                          <span className="text-neutral-400 whitespace-nowrap tabular-nums w-36">{new Date(a.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="min-w-0"><b className="font-semibold">{a.kind === 'comment' ? t('Comment', 'تعليق') + (a.anchor ? ` · ${a.anchor.label.en}` : '') : a.decision?.en ?? a.system?.en}</b> — {a.actor.name}{a.text ? `: ${a.text}` : ''}</span>
                        </li>
                      ))}
                    </ol>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-2.5 border-t border-neutral-100 text-[11px] text-neutral-400">{t(`Team: ${CYBER_TEAM.members.map((m) => m.name).join(', ')}. History stays on the request when a task is reassigned or covered.`, 'يبقى السجل على الطلب عند إعادة الإسناد أو التغطية.')}</p>
    </section>
  );
}
