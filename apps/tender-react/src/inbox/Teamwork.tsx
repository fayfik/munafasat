// Manual build — banners at the top of a task's Required action tab:
//  - Team queue: pick up, assign, reassign, return to queue (roles: member vs lead), delegation.
//  - What changed: re-confirm after a change in this reviewer's area, or a change notice with
//    "Revoke my approval" when the change was outside it.
//  - Refer to Cyber Security (Procurement), for requests that didn't route to Cyber.
import { useState } from 'react';
import { useInbox, fmtDateTime } from './store';
import { teamOfTask, unclaimed, isLead, isMember, pickUp, assignTo, release, delegateOf, coveringFor, CYBER_TEAM } from './teams';
import { revokeApproval, referToCyber, flowTaskId } from './flow';
import type { Person, SectionChange, Task } from './types';
import { Button, Select } from '../components/ui';

type T = (en: string, ar: string) => string;
const pName = (p: Person, isAr: boolean) => (isAr ? p.nameAr ?? p.name : p.name);
const ago = (iso: string | undefined, t: T) => {
  if (!iso) return '';
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));
  return h < 1 ? t('just now', 'الآن') : h < 24 ? t(`${h}h ago`, `قبل ${h} س`) : t(`${Math.round(h / 24)}d ago`, `قبل ${Math.round(h / 24)} ي`);
};

/** Whether the viewer must pick the task up (or isn't the holder) before deciding. */
export function queueBlock(task: Task, viewer: Person | null): boolean {
  if (!task.queue) return false;
  if (unclaimed(task)) return true;
  if (!viewer) return false;
  return task.assignee.id !== viewer.id && delegateOf(task.assignee.id)?.id !== viewer.id;
}

export function TaskBanners({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  return (
    <>
      {task.queue && <QueueBar task={task} isAr={isAr} t={t} />}
      {(task.reconfirm || task.changeNotice) && <ChangesCard task={task} isAr={isAr} t={t} />}
      <ReferCard task={task} isAr={isAr} t={t} />
    </>
  );
}

function QueueBar({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { viewer, mutateTasks } = useInbox();
  const team = teamOfTask(task) ?? CYBER_TEAM;
  const me = viewer ?? team.members[0];
  const lead = !viewer || isLead(team, viewer);
  const member = !viewer || isMember(team, viewer);
  const open = unclaimed(task);
  const holder = task.assignee;
  const covering = viewer && delegateOf(holder.id)?.id === viewer.id;
  const terminal = ['completed', 'rejected', 'cancelled'].includes(task.state);
  const others = team.members.filter((m) => m.id !== (open ? '' : holder.id));
  const [to, setTo] = useState(others[0]?.id ?? '');
  const [note, setNote] = useState('');
  const apply = (fn: (x: Task) => Task) => mutateTasks((xs) => xs.map((x) => (x.id === task.id ? fn(x) : x)));
  const target = team.members.find((m) => m.id === to);

  return (
    <div className="rounded-xl border border-[#C9DBEC] bg-[#F5F9FD] px-5 py-4" data-testid="queue-bar">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2A6193]">{isAr ? team.nameAr : team.name} · {t('shared queue', 'قائمة مشتركة')}</p>
          {open ? (
            <p className="mt-1 text-[14px] font-semibold text-neutral-900" data-testid="queue-state">{t('Not picked up yet', 'لم تُستلم بعد')} <span className="font-normal text-neutral-500">· {t(`in the queue ${ago(task.receivedAt, t)}`, `في القائمة ${ago(task.receivedAt, t)}`)}</span></p>
          ) : (
            <p className="mt-1 text-[14px] font-semibold text-neutral-900" data-testid="queue-state">
              {t(`Held by ${holder.name}`, `لدى ${pName(holder, true)}`)}
              <span className="font-normal text-neutral-500"> · {task.queue?.assignedBy ? t(`assigned by ${task.queue.assignedBy}`, `أسندها ${task.queue.assignedBy}`) : t('picked up', 'استُلمت')} {ago(task.queue?.claimedAt, t)}</span>
            </p>
          )}
          {covering && <p className="mt-1 text-[12.5px] font-semibold text-warning-700" data-testid="covering">{t(`You're covering for ${holder.name} (out of office). Your actions are recorded on their behalf.`, `أنت تغطي عن ${pName(holder, true)} (خارج المكتب). تُسجل إجراءاتك نيابة عنه.`)}</p>}
          <p className="mt-1 text-[12px] text-neutral-500">{t('Comments, decisions and history stay on the request, so whoever holds it sees all of it.', 'تبقى التعليقات والقرارات والسجل على الطلب، فيراها من يحمله.')}</p>
        </div>
        {!terminal && (
          <div className="flex items-center gap-2 flex-wrap">
            {open && member && <Button variant="primary" data-testid="pick-up" onClick={() => apply((x) => pickUp(x, me))}>{t('Pick up', 'استلام')}</Button>}
            {!open && viewer && holder.id === viewer.id && <Button variant="secondary" data-testid="release" onClick={() => apply((x) => release(x, me))}>{t('Return to queue', 'إعادة إلى القائمة')}</Button>}
          </div>
        )}
      </div>
      {!terminal && lead && (
        <div className="mt-3 pt-3 border-t border-[#DCE7F2] flex items-end gap-2 flex-wrap" data-testid="lead-assign">
          <div className="w-56">
            <p className="text-[11.5px] font-medium text-neutral-600 mb-1">{open ? t('Assign to', 'إسناد إلى') : t('Reassign to', 'إعادة الإسناد إلى')}</p>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {others.map((m) => <option key={m.id} value={m.id}>{pName(m, isAr)}{delegateOf(m.id) ? t(' (out of office)', ' (خارج المكتب)') : ''}</option>)}
            </Select>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Note for the new holder (optional)', 'ملاحظة لمن سيستلمها (اختياري)')}
            className="h-9 flex-1 min-w-[180px] px-3 text-[13px] rounded-lg border border-neutral-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
          <Button variant="secondary" data-testid="assign" disabled={!target} onClick={() => { if (target) { apply((x) => assignTo(x, target, me, note.trim() || undefined)); setNote(''); } }}>{open ? t('Assign', 'إسناد') : t('Reassign', 'إعادة الإسناد')}</Button>
          <p className="w-full text-[11px] text-neutral-400">{t('Only the team lead can assign and reassign. Members pick up from the queue.', 'رئيس الفريق وحده يسند ويعيد الإسناد، والأعضاء يستلمون من القائمة.')}</p>
        </div>
      )}
    </div>
  );
}

export function ChangeList({ changes, isAr }: { changes: SectionChange[]; isAr: boolean }) {
  return (
    <ul className="mt-3 space-y-2.5" data-testid="change-list">
      {changes.map((c) => (
        <li key={c.key} className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5">
          <p className="text-[12.5px] font-semibold text-neutral-800">{isAr ? c.label.ar : c.label.en}</p>
          <div className="mt-1.5 space-y-1 text-[12.5px] leading-snug">
            {c.removed.slice(0, 4).map((l, i) => <p key={`r${i}`} className="text-error-700"><span className="font-semibold me-1.5">−</span><span className="line-through decoration-error-300">{l}</span></p>)}
            {c.added.slice(0, 4).map((l, i) => <p key={`a${i}`} className="text-success-800"><span className="font-semibold me-1.5">+</span>{l}</p>)}
            {(c.removed.length > 4 || c.added.length > 4) && <p className="text-neutral-400">+ {Math.max(0, c.removed.length - 4) + Math.max(0, c.added.length - 4)} more</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChangesCard({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { mutateTasks, viewer } = useInbox();
  const re = task.reconfirm;
  const notice = task.changeNotice;
  const changes = re?.changes ?? notice?.changes ?? [];
  const mine = !viewer || task.assignee.id === viewer.id || delegateOf(task.assignee.id)?.id === viewer.id;
  return (
    <div className={`rounded-xl border px-5 py-4 ${re ? 'border-warning-200 bg-warning-50/60' : 'border-neutral-200 bg-white'}`} data-testid={re ? 'reconfirm-card' : 'change-notice'}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-neutral-900">
            {re ? t('The request changed in your area since you approved — re-confirm', 'تغيّر الطلب في نطاقك بعد اعتمادك — أعد التأكيد')
              : t('Changed since your approval — outside your area, your approval stands', 'تغيّر بعد اعتمادك — خارج نطاقك، يبقى اعتمادك')}
          </p>
          <p className="text-[12.5px] text-neutral-600 mt-0.5">
            {re ? t('Only these sections changed. Check them and approve again — a re-confirmation has a 1-day SLA.', 'تغيرت هذه الأقسام فقط. راجعها واعتمد مجدداً — مهلة إعادة التأكيد يوم واحد.')
              : t('You don’t need to review again. If a change does affect your assessment, revoke your approval to review it.', 'لا تحتاج إلى المراجعة مجدداً. إن أثّر تغيير على تقييمك فاسحب اعتمادك لمراجعته.')}
            <span className="text-neutral-400"> · {fmtDateTime((re ?? notice)!.at, isAr)}</span>
          </p>
        </div>
        {!re && notice && mine && <Button variant="secondary" data-testid="revoke" onClick={() => mutateTasks((xs) => xs.map((x) => (x.id === task.id ? revokeApproval(x) : x)))}>{t('Revoke my approval', 'سحب اعتمادي')}</Button>}
      </div>
      <ChangeList changes={changes} isAr={isAr} />
    </div>
  );
}

function ReferCard({ task, isAr, t }: { task: Task; isAr: boolean; t: T }) {
  const { tasks, mutateTasks, viewer, me } = useInbox();
  void isAr;
  const fl = task.flow;
  if (!fl || !['tl', 'officer'].includes(fl.stage) || ['completed', 'cancelled'].includes(task.state)) return null;
  if (tasks.some((x) => x.id === flowTaskId(fl.requestNo, 'cyber'))) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-center justify-between gap-4 flex-wrap" data-testid="refer-cyber">
      <p className="text-[13px] text-neutral-700 min-w-0">{t('Cyber Security hasn’t reviewed this request. If it introduces or changes technology, refer it — DOA approval waits for their review.', 'لم يراجع الأمن السيبراني هذا الطلب. إن كان يضيف تقنية أو يغيرها فأحله — ينتظر اعتماد الصلاحيات مراجعتهم.')}</p>
      <Button variant="secondary" onClick={() => mutateTasks((xs) => referToCyber(xs, fl.requestNo, viewer ?? me))}>{t('Refer to Cyber Security', 'إحالة إلى الأمن السيبراني')}</Button>
    </div>
  );
}

/** Out-of-office: pick a delegate from the same team (or any approver) until a date. */
export function OutOfOfficeCard({ person, candidates, isAr, t }: { person: Person; candidates: Person[]; isAr: boolean; t: T }) {
  const { delegations, setDelegation } = useInbox();
  const cur = delegations[person.id];
  const [to, setTo] = useState(cur?.to.id ?? candidates[0]?.id ?? '');
  const [until, setUntil] = useState(cur?.until?.slice(0, 10) ?? new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
  const covering = coveringFor(person.id);
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5" data-testid="ooo-card">
      <h2 className="text-[14px] font-semibold text-neutral-900">{t('Out of office', 'خارج المكتب')}</h2>
      {cur ? (
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-neutral-700">{t(`${cur.to.name} covers your tasks until ${new Date(cur.until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}.`, `يغطي ${pName(cur.to, true)} مهامك حتى ${cur.until.slice(0, 10)}.`)}</p>
          <Button variant="secondary" data-testid="ooo-end" onClick={() => setDelegation(person.id, null)}>{t('I’m back', 'عدت')}</Button>
        </div>
      ) : (
        <div className="mt-2 flex items-end gap-2 flex-wrap">
          <div className="w-52"><p className="text-[11.5px] text-neutral-600 mb-1">{t('Delegate to', 'التفويض إلى')}</p>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>{candidates.map((c) => <option key={c.id} value={c.id}>{pName(c, isAr)}</option>)}</Select></div>
          <div><p className="text-[11.5px] text-neutral-600 mb-1">{t('Until', 'حتى')}</p>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-9 px-3 text-[13px] rounded-lg border border-neutral-300" /></div>
          <Button variant="secondary" data-testid="ooo-set" onClick={() => { const c = candidates.find((x) => x.id === to); if (c) setDelegation(person.id, { to: c, until: new Date(until + 'T23:59:00').toISOString() }); }}>{t('Set out of office', 'تفعيل خارج المكتب')}</Button>
        </div>
      )}
      {covering.length > 0 && <p className="mt-2 text-[12.5px] font-semibold text-warning-700">{t(`You're covering for ${covering.length} colleague${covering.length > 1 ? 's' : ''} — their tasks are in your queue.`, `أنت تغطي عن ${covering.length} زميل — مهامهم في قائمتك.`)}</p>}
    </section>
  );
}
