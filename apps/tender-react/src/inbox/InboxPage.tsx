// Munafasat Inbox — Outlook / ClickUp style two-pane workspace.
// Left: the task list (always visible). Right: the selected task's detail, or an
// empty state until a task is chosen.
import { useMemo, useState, type ReactNode } from 'react';
import { useLoading, Sk, SkeletonCards } from '../components/Loader';
import { useLanguage, useT } from '../context/LanguageContext';
import { SearchIcon, NavInboxIcon, ClockIcon, AlertTriangleIcon } from '../components/Icons';
import type { InboxView, Task } from './types';
import { useInbox, dueInfo } from './store';
import { StateChip, PRIORITY_META } from './meta';
import TaskDetail from './TaskDetail';

const FILTERS: { key: InboxView; en: string; ar: string }[] = [
  { key: 'all', en: 'All', ar: 'الكل' },
  { key: 'needs-action', en: 'Needs action', ar: 'يحتاج إجراءً' },
  { key: 'overdue', en: 'Overdue', ar: 'متأخرة' },
  { key: 'completed', en: 'Completed', ar: 'مكتملة' },
];

export default function InboxPage({ focusTaskId }: { focusTaskId?: string } = {}) {
  const t = useT();
  const { isAr } = useLanguage();
  const { tasks, countsByView, tasksForView, getTask } = useInbox();
  const [view, setView] = useState<InboxView>('needs-action');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(focusTaskId ?? null);
  const [sideOpen, setSideOpen] = useState(false);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return tasksForView(view)
      .filter((x) => !ql || [x.titleEn, x.titleAr, x.entity.ref, x.requester.name, x.supplier?.en].filter(Boolean).join(' ').toLowerCase().includes(ql))
      // Returned-to-me tasks first (e.g. review comments to answer), then by due date.
      .sort((a, b) => (Number(b.state === 'returned') - Number(a.state === 'returned')) || +new Date(a.dueAt) - +new Date(b.dueAt));
  }, [tasksForView, view, q]);

  const selected = selectedId ? getTask(selectedId) : undefined;
  const listBusy = useLoading([], 500);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-neutral-50">
      {/* ── Left: task list (hidden on mobile while a task is open) ─── */}
      <div className={`${selected ? (sideOpen ? 'hidden xl:flex' : 'hidden sm:flex') : 'flex'} w-full sm:w-[380px] lg:w-[420px] flex-shrink-0 flex-col border-e border-neutral-200 bg-white`}>
        <div className="px-5 pt-6 border-b border-neutral-200">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[22px] font-bold text-neutral-900">{t('Inbox', 'الوارد')}</h1>
            <span className="text-[12px] font-semibold text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5 tabular-nums" data-inbox-count>{countsByView['needs-action']}</span>
          </div>
          <p className="mt-1 text-[13px] text-neutral-500">{t('Tasks waiting for your action.', 'المهام التي تنتظر إجراءك.')}</p>
          <div className="relative mt-4">
            <SearchIcon className={`w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} pointer-events-none`} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t('Search tasks…', 'ابحث في المهام…')}
              className={`w-full h-10 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-[13px] rounded-lg border border-neutral-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none`} />
          </div>
          {/* View tabs — same underline style as My Requests */}
          <div className="mt-3 flex items-center gap-5">
            {FILTERS.map((f) => {
              const active = view === f.key;
              const c = countsByView[f.key];
              return (
                <button key={f.key} type="button" onClick={() => setView(f.key)} aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
                  {isAr ? f.ar : f.en}
                  <span className={`text-[11px] font-semibold tabular-nums ${f.key === 'overdue' && c > 0 ? 'text-error-600' : active ? 'text-brand-600' : 'text-neutral-400'}`}>{c}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center"><NavInboxIcon className="w-5 h-5" /></div>
              <p className="mt-3 text-[13px] font-semibold text-neutral-700">{t('Nothing here', 'لا يوجد شيء')}</p>
              <p className="mt-0.5 text-[12px] text-neutral-500">{t('No tasks match this filter.', 'لا توجد مهام تطابق هذا التصفية.')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 py-1">
              {listBusy ? <TaskRowsSkeleton /> : rows.map((task) => <TaskRow key={task.id} task={task} isAr={isAr} t={t} active={selectedId === task.id} onSelect={() => setSelectedId(task.id)} tasks={tasks} />)}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right: detail or empty state (single instance) ──────────── */}
      <div className={`${selected ? 'flex' : 'hidden sm:flex'} flex-1 min-w-0 flex-col bg-neutral-50`}>
        {selected
          ? <LoadedTask key={selected.id}><TaskDetail task={selected} onBack={() => setSelectedId(null)} onSideOpenChange={setSideOpen} /></LoadedTask>
          : <EmptyDetail t={t} />}
      </div>
    </div>
  );
}

function TaskRow({ task, isAr, t, active, onSelect, tasks }: { task: Task; isAr: boolean; t: (en: string, ar: string) => string; active: boolean; onSelect: () => void; tasks: Task[] }) {
  void tasks;
  const d = dueInfo(task);
  const p = PRIORITY_META[task.priority];
  // Status shows only when it differs from the default "Pending".
  const showState = task.state !== 'available';
  return (
    <li>
      <button type="button" onClick={onSelect}
        className={`w-full text-start px-5 py-4 transition-colors relative ${active ? 'bg-brand-50/70' : 'hover:bg-neutral-50'}`}>
        {active && <span className={`absolute ${isAr ? 'right-0' : 'left-0'} top-3 bottom-3 w-[3px] rounded-full bg-brand-600`} />}
        <div className="flex items-start justify-between gap-4">
          <p className={`text-[14px] leading-snug line-clamp-2 ${active ? 'font-semibold text-brand-900' : 'font-normal text-neutral-800'}`}>{isAr ? task.titleAr : task.titleEn}</p>
          <span className={`flex-shrink-0 mt-0.5 text-[12px] font-medium inline-flex items-center gap-1 whitespace-nowrap ${d.overdue ? 'text-error-600' : d.soon ? 'text-warning-700' : 'text-neutral-400'}`}>
            {d.overdue && <AlertTriangleIcon className="w-3 h-3" />}
            {d.overdue ? t(`${Math.abs(d.days)}d late`, `${Math.abs(d.days)}ي متأخرة`) : d.days <= 0 ? t('Today', 'اليوم') : t(`${d.days}d left`, `${d.days}ي متبقية`)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 min-w-0 text-[12.5px] text-neutral-500">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} title={isAr ? p.ar : p.en} />
            <span className="tabular-nums whitespace-nowrap" dir="ltr">{task.entity.ref}</span>
            <span className="text-neutral-300">·</span>
            <span className="truncate">{isAr && task.requester.nameAr ? task.requester.nameAr : task.requester.name}</span>
          </p>
          {showState && <StateChip state={task.state} isAr={isAr} />}
        </div>
      </button>
    </li>
  );
}

function EmptyDetail({ t }: { t: (en: string, ar: string) => string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-xs">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
          <NavInboxIcon className="w-7 h-7 text-brand-500" />
        </div>
        <p className="mt-4 text-[15px] font-semibold text-neutral-800">{t('No task selected', 'لم يتم اختيار مهمة')}</p>
        <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed">{t('Click a task on the left to view its request details and decision options.', 'انقر مهمة على اليسار لعرض تفاصيل الطلب وخيارات القرار.')}</p>
      </div>
    </div>
  );
}

function LoadedTask({ children }: { children: ReactNode }) {
  const loading = useLoading([], 400);
  if (!loading) return <>{children}</>;
  return (
    <div className="flex-1 overflow-hidden p-6 space-y-5">
      <Sk className="h-3 w-28" /><Sk className="h-6 w-2/3" /><Sk className="h-3.5 w-1/2" />
      <SkeletonCards cards={2} />
    </div>
  );
}

function TaskRowsSkeleton() {
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <li key={i} className="px-4 py-4 border-b border-neutral-100">
          <div className="flex justify-between gap-4"><Sk className="h-3.5 w-3/4" /><Sk className="h-3 w-10" /></div>
          <Sk className="h-3 w-32 mt-2.5" /><Sk className="h-3 w-48 mt-2.5" />
        </li>
      ))}
    </>
  );
}
