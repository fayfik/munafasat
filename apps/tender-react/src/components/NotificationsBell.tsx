// Manual build — in-app notifications (Kholoud's point 7: Munafasat rather than email, with clear
// visibility of pending work). Built from the viewer's tasks: new tasks, the team queue, things
// due soon, re-confirmations, changes since an approval and new comments. Each is also "sent"
// by email and Teams, as a copy.
import { useEffect, useRef, useState } from 'react';
import { useInbox, viewOf, dueInfo } from '../inbox/store';
import { unclaimed, isMember, teamOfTask } from '../inbox/teams';
import { openInboxTask } from '../lib/appNav';
import { BellIcon } from './Icons';
import { useT } from '../context/LanguageContext';

interface Note { id: string; taskId: string; title: string; sub: string; at: string; tone: 'info' | 'warn' | 'bad' }
const DAY = 86400000;

export default function NotificationsBell() {
  const t = useT();
  const { tasks, viewer, me } = useInbox();
  const who = viewer ?? me;
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const notes: Note[] = [];
  const recent = (iso?: string) => !!iso && Date.now() - new Date(iso).getTime() < 3 * DAY;
  for (const x of tasks) {
    const views = viewOf(x, tasks, viewer);
    const mine = views.includes('needs-action');
    const title = x.titleEn;
    if (mine && x.reconfirm) notes.push({ id: `rc-${x.id}-${x.reconfirm.at}`, taskId: x.id, title: t('Re-confirm your approval', 'أعد تأكيد اعتمادك'), sub: `${title} — ${x.reconfirm.changes.map((c) => c.label.en).join(', ')} changed`, at: x.reconfirm.at, tone: 'warn' });
    else if (mine && unclaimed(x) && isMember(teamOfTask(x), who)) notes.push({ id: `q-${x.id}`, taskId: x.id, title: t('New in your team queue', 'جديد في قائمة فريقك'), sub: title, at: x.receivedAt, tone: 'info' });
    else if (mine && recent(x.receivedAt)) notes.push({ id: `n-${x.id}`, taskId: x.id, title: t('New task for you', 'مهمة جديدة لك'), sub: title, at: x.receivedAt, tone: 'info' });
    if (mine) { const d = dueInfo(x); if (d.overdue || d.soon) notes.push({ id: `d-${x.id}-${d.overdue}`, taskId: x.id, title: d.overdue ? t('Overdue', 'متأخرة') : t('Due within a day', 'مستحقة خلال يوم'), sub: title, at: x.dueAt, tone: d.overdue ? 'bad' : 'warn' }); }
    if (x.changeNotice && x.assignee.id === who.id) notes.push({ id: `c-${x.id}-${x.changeNotice.at}`, taskId: x.id, title: t('Changed since your approval', 'تغيّر بعد اعتمادك'), sub: `${title} — outside your area, approval kept`, at: x.changeNotice.at, tone: 'info' });
    if (mine) {
      const c = [...x.activity].reverse().find((a) => a.kind === 'comment' && !a.draft && a.actor.id !== who.id && recent(a.at));
      if (c) notes.push({ id: `m-${c.id}`, taskId: x.id, title: t(`New comment from ${c.actor.name}`, `تعليق جديد من ${c.actor.nameAr ?? c.actor.name}`), sub: title, at: c.at, tone: 'info' });
    }
  }
  notes.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const unseen = notes.filter((n) => !seen.has(n.id)).length;
  const go = (n: Note) => { setSeen((s) => new Set([...s, n.id])); setOpen(false); openInboxTask(n.taskId); };
  const toneDot = (x: Note['tone']) => (x === 'bad' ? 'bg-error-500' : x === 'warn' ? 'bg-warning-500' : 'bg-[#2A6193]');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} data-testid="bell"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-white/90 hover:bg-white/15 hover:text-white"
        title={t('Notifications', 'الإشعارات')} aria-label={t('Notifications', 'الإشعارات')}>
        <BellIcon className="w-4 h-4" />
        {unseen > 0 && <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-warning-400 text-[9.5px] font-bold text-neutral-900 flex items-center justify-center ring-2 ring-brand-700" data-testid="bell-count">{unseen}</span>}
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-2 w-[360px] max-h-[70vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white text-neutral-800 shadow-xl z-50" data-testid="notifications">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
            <p className="text-[13px] font-bold">{t('Notifications', 'الإشعارات')}</p>
            {unseen > 0 && <button type="button" onClick={() => setSeen(new Set(notes.map((n) => n.id)))} className="text-[11.5px] font-semibold text-brand-700 hover:underline">{t('Mark all read', 'تعليم الكل كمقروء')}</button>}
          </div>
          {notes.length === 0 ? <p className="px-4 py-8 text-center text-[12.5px] text-neutral-500">{t('Nothing new.', 'لا جديد.')}</p> : (
            <ul className="divide-y divide-neutral-100">
              {notes.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => go(n)} className={`w-full text-start px-4 py-2.5 hover:bg-neutral-50 flex gap-2.5 ${seen.has(n.id) ? 'opacity-60' : ''}`}>
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${toneDot(n.tone)}`} />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-neutral-900">{n.title}</span>
                      <span className="block text-[11.5px] text-neutral-500 line-clamp-2">{n.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="px-4 py-2 border-t border-neutral-100 text-[10.5px] text-neutral-400">{t('A copy of each goes by email and Microsoft Teams.', 'تُرسل نسخة من كل إشعار عبر البريد وMicrosoft Teams.')}</p>
        </div>
      )}
    </div>
  );
}
