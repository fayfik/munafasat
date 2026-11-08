// New-task notifications: a push-in card when completing a task brings the next
// task(s) into the inbox, and an animated bell with the unread list.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInbox, type TaskNotice } from '../inbox/store';
import { useLanguage, useT } from '../context/LanguageContext';
import { BellIcon, NavInboxIcon } from './Icons';

const SHOW_MS = 7000;

function ago(iso: string, t: (en: string, ar: string) => string) {
  const s = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 1000));
  if (s < 60) return t('just now', 'الآن');
  const m = Math.round(s / 60);
  return t(`${m} min ago`, `قبل ${m} د`);
}

/** Bell in the header: unread badge, rings when a new task arrives, dropdown list. */
export function NotificationBell({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const { notices, markNoticesRead, getTask } = useInbox();
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(0);
  const unread = notices.filter((n) => !n.read).length;
  const prev = useRef(notices.length);
  useEffect(() => { if (notices.length > prev.current) setRing((r) => r + 1); prev.current = notices.length; }, [notices.length]);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={wrap}>
      <button type="button" onClick={() => setOpen((v) => !v)} data-bell data-unread={unread}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-white/90 hover:bg-white/15 hover:text-white"
        title={t('Notifications', 'الإشعارات')} aria-label={t('Notifications', 'الإشعارات')} aria-expanded={open}>
        <span key={ring} className={ring ? 'bell-ring inline-flex' : 'inline-flex'}><BellIcon className="w-4 h-4" /></span>
        {unread > 0 && (
          <span key={`b${ring}`} className="pop-in absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-warning-400 text-[10px] font-bold text-neutral-900 flex items-center justify-center ring-2 ring-brand-700 tabular-nums" data-bell-count>{unread}</span>
        )}
        {ring > 0 && unread > 0 && <span key={`p${ring}`} className="bell-ping absolute inset-0 rounded-lg" />}
      </button>
      {open && (
        <div className="absolute end-0 top-10 w-[360px] max-w-[calc(100vw-24px)] rounded-xl bg-white shadow-2xl border border-neutral-200 overflow-hidden z-[70] pop-in text-start" dir={isAr ? 'rtl' : 'ltr'} data-bell-panel>
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <p className="text-[13.5px] font-bold text-neutral-900">{t('Notifications', 'الإشعارات')}</p>
            {unread > 0 && <button type="button" onClick={markNoticesRead} className="text-[12px] font-semibold text-brand-700 hover:underline">{t('Mark all as read', 'تحديد الكل كمقروء')}</button>}
          </div>
          {notices.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="mx-auto w-10 h-10 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center"><BellIcon className="w-5 h-5" /></span>
              <p className="mt-2 text-[12.5px] text-neutral-500">{t('You’re all caught up.', 'لا توجد إشعارات جديدة.')}</p>
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100">
              {notices.map((n) => {
                const task = getTask(n.taskId);
                if (!task) return null;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => { setOpen(false); markNoticesRead(); onOpenTask(n.taskId); }} className={`w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-neutral-50 ${n.read ? '' : 'bg-brand-50/40'}`}>
                      <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0"><NavInboxIcon className="w-4 h-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-neutral-900 leading-snug">{isAr ? task.titleAr : task.titleEn}</span>
                        <span className="block text-[11.5px] text-neutral-500 mt-0.5">{t(`${isAr ? n.fromAr : n.fromEn} completed`, `اكتملت: ${n.fromAr}`)} · {ago(n.at, t)}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Push-in cards for newly arrived tasks (top end, under the header). */
export function TaskPushHost({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const { notices, getTask, dismissNotice } = useInbox();
  const t = useT();
  const { isAr } = useLanguage();
  const [shown, setShown] = useState<TaskNotice[]>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = notices.filter((n) => !seen.current.has(n.id));
    if (!fresh.length) return;
    fresh.forEach((n) => seen.current.add(n.id));
    setShown((s) => [...fresh, ...s].slice(0, 3));
    fresh.forEach((n) => setTimeout(() => setShown((s) => s.filter((x) => x.id !== n.id)), SHOW_MS));
  }, [notices]);
  if (!shown.length) return null;
  return createPortal(
    <div className="fixed top-[60px] end-4 z-[60] flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-32px)]" dir={isAr ? 'rtl' : 'ltr'} aria-live="polite">
      {shown.map((n) => {
        const task = getTask(n.taskId);
        if (!task) return null;
        const close = () => setShown((s) => s.filter((x) => x.id !== n.id));
        return (
          <div key={n.id} data-task-push={n.taskId} className={`${isAr ? 'push-in-rtl' : 'push-in'} relative rounded-xl bg-white shadow-[0_18px_40px_-12px_rgba(16,24,40,0.35)] border border-neutral-200 overflow-hidden`}>
            <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
              <span className="relative w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
                <NavInboxIcon className="w-4.5 h-4.5" />
                <span className="absolute -top-1 -end-1 w-3 h-3 rounded-full bg-warning-400 ring-2 ring-white" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{t('New task in your inbox', 'مهمة جديدة في صندوقك')}</p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-neutral-900 leading-snug line-clamp-2">{isAr ? task.titleAr : task.titleEn}</p>
                <p className="mt-0.5 text-[12px] text-neutral-500">{t(`${n.fromEn} completed`, `اكتملت: ${n.fromAr}`)} · <span dir="ltr">{task.entity.ref}</span></p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button type="button" data-push-open onClick={() => { close(); dismissNotice(n.id); onOpenTask(n.taskId); }}
                    className="h-8 px-3 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700">{t('Open task', 'فتح المهمة')}</button>
                  <button type="button" onClick={close} className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Later', 'لاحقاً')}</button>
                </div>
              </div>
              <button type="button" onClick={close} aria-label={t('Close', 'إغلاق')} className="w-6 h-6 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>
            <div className="h-0.5 bg-neutral-100"><div className="h-full bg-brand-500 push-timer" style={{ animationDuration: `${SHOW_MS}ms` }} /></div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
