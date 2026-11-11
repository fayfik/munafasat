// Munafasat Inbox — Outlook / ClickUp style two-pane workspace.
// Left: the task list (always visible). Right: the selected task's detail, or an
// empty state until a task is chosen.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLoading, Sk, SkeletonCards } from '../components/Loader';
import { useLanguage, useT } from '../context/LanguageContext';
import { SearchIcon, NavInboxIcon, ClockIcon, AlertTriangleIcon } from '../components/Icons';
import type { InboxView, Task } from './types';
import { useInbox, dueInfo, flowCompare } from './store';
import { StateChip, PRIORITY_META } from './meta';
import TaskDetail from './TaskDetail';
import { ScopeSwitcher, IconBtn, DelegateGlyph, MoreMenu, DelegateDialog, DelegationBanner, Avatar, type Scope } from './InboxTools';

const FILTERS: { key: InboxView; en: string; ar: string; teamEn?: string; teamAr?: string }[] = [
  { key: 'needs-action', en: 'Needs action', ar: 'يحتاج إجراءً', teamEn: 'Unassigned', teamAr: 'غير مسندة' },
  { key: 'overdue', en: 'Overdue', ar: 'متأخرة' },
  { key: 'completed', en: 'Done', ar: 'مكتملة', teamEn: 'Assigned', teamAr: 'مسندة' },
  { key: 'all', en: 'All', ar: 'الكل' },
];

export default function InboxPage() {
  const t = useT();
  const { isAr } = useLanguage();
  const { tasks, countsByView: myCounts, tasksForView: myTasksForView, teamCounts, teamTasksForView, delegation, getTask, focusTaskId, focusTask, markSeen } = useInbox();
  const [scope, setScope] = useState<Scope>('mine');
  const [delegating, setDelegating] = useState(false);
  const countsByView = scope === 'team' ? teamCounts : myCounts;
  const tasksForView = scope === 'team' ? teamTasksForView : myTasksForView;
  const [view, setView] = useState<InboxView>('needs-action');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(false);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return tasksForView(view)
      .filter((x) => !ql || [x.titleEn, x.titleAr, x.entity.ref, x.requester.name, x.supplier?.en].filter(Boolean).join(' ').toLowerCase().includes(ql))
      // Process-flow order: Department approval → Technical member → Specialist & Finance → Qualification → Procurement → DOA → Price.
      .sort(flowCompare);
  }, [tasksForView, view, q]);
  const label = (f: (typeof FILTERS)[number]) => (scope === 'team' && f.teamEn ? (isAr ? f.teamAr! : f.teamEn) : (isAr ? f.ar : f.en));

  // Opened from a notification: show it in "All" so it's always in the list.
  useEffect(() => {
    if (!focusTaskId) return;
    setScope('mine');
    if (!tasksForView(view).some((x) => x.id === focusTaskId)) setView('all');
    setSelectedId(focusTaskId); markSeen(focusTaskId); focusTask(null);
  }, [focusTaskId]); // eslint-disable-line react-hooks/exhaustive-deps
  const select = (id: string) => { setSelectedId(id); markSeen(id); };

  const selected = selectedId ? getTask(selectedId) : undefined;
  const listBusy = useLoading([], 500);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-neutral-50">
      {/* ── Left: task list (hidden on mobile while a task is open) ─── */}
      <div className={`${selected ? (sideOpen ? 'hidden xl:flex' : 'hidden sm:flex') : 'flex'} w-full sm:w-[380px] lg:w-[420px] flex-shrink-0 flex-col border-e border-neutral-200 bg-white ${delegation && scope === 'mine' ? 'shadow-[inset_0_3px_0_#2A3466]' : ''}`} data-scope-panel={scope}>
        <div className="px-5 pt-6 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <ScopeSwitcher scope={scope} onChange={(s) => { setScope(s); setView('needs-action'); setSelectedId(null); }} mine={myCounts['needs-action']} team={teamCounts['needs-action']} isAr={isAr} t={t} />
            <span className="text-[12px] font-semibold text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5 tabular-nums" data-inbox-count>{countsByView['needs-action']}</span>
            <span className="flex-1" />
            {scope === 'mine' && <IconBtn label={delegation ? t('Delegation active', 'التفويض مفعّل') : t('Delegate my inbox', 'تفويض صندوق الوارد')} onClick={() => setDelegating(true)} active={!!delegation} attrs={{ 'data-delegate-open': '' }}><DelegateGlyph /></IconBtn>}
            <MoreMenu rows={rows} scopeLabel={scope === 'team' ? t('Team queue', 'قائمة الفريق') : t('My tasks', 'مهامي')} viewLabel={label(FILTERS.find((f) => f.key === view)!)} isAr={isAr} t={t} />
          </div>
          <p className="mt-1 text-[13px] text-neutral-500">{scope === 'team' ? t('Unassigned requests waiting for an officer. Assign them or take one yourself.', 'طلبات غير مسندة تنتظر أخصائياً. أسندها أو تولَّ أحدها بنفسك.') : t('Tasks waiting for your action.', 'المهام التي تنتظر إجراءك.')}</p>
          {scope === 'mine' && <DelegationBanner isAr={isAr} t={t} />}
          <div className="relative mt-4">
            <SearchIcon className={`w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} pointer-events-none`} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t('Search tasks…', 'ابحث في المهام…')}
              className={`w-full h-10 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-[13px] rounded-lg border border-neutral-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none`} />
          </div>
          {/* View tabs — segmented pill control */}
          <div className="mt-4 mb-4 flex items-center gap-0.5 p-1 rounded-full bg-neutral-100" data-inbox-tabs>
            {FILTERS.map((f) => {
              const active = view === f.key;
              const c = countsByView[f.key];
              const empty = c === 0 && !active;
              return (
                <button key={f.key} type="button" onClick={() => setView(f.key)} aria-current={active ? "page" : undefined} data-inbox-tab={f.key}
                  className={`flex-1 h-9 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${active ? 'bg-white text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-neutral-200/70' : empty ? 'text-neutral-400 hover:text-neutral-600' : 'text-neutral-600 hover:text-neutral-900'}`}>
                  {label(f)}
                  {active && c > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold tabular-nums inline-flex items-center justify-center">{c}</span>}
                  {!active && f.key === 'overdue' && c > 0 && <span className="w-1.5 h-1.5 rounded-full bg-error-500" aria-label={`${c}`} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center"><NavInboxIcon className="w-5 h-5" /></div>
              <p className="mt-3 text-[13px] font-semibold text-neutral-700">{scope === 'mine' && delegation && view === 'needs-action' ? t(`Your tasks are with ${delegation.to.name}`, `مهامك لدى ${delegation.to.nameAr ?? delegation.to.name}`) : scope === 'team' && view === 'needs-action' ? t('Queue is clear', 'القائمة فارغة') : t('Nothing here', 'لا يوجد شيء')}</p>
              <p className="mt-0.5 text-[12px] text-neutral-500">{scope === 'mine' && delegation && view === 'needs-action' ? t('Find them under All. Cancel the delegation to bring them back.', 'تجدها ضمن الكل. ألغِ التفويض لإعادتها.') : t('No tasks match this filter.', 'لا توجد مهام تطابق هذا التصفية.')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 py-1">
              {listBusy ? <TaskRowsSkeleton /> : rows.map((task) => <TaskRow key={task.id} task={task} isAr={isAr} t={t} active={selectedId === task.id} onSelect={() => select(task.id)} tasks={tasks} />)}
            </ul>
          )}
        </div>
      </div>

      {delegating && <DelegateDialog isAr={isAr} t={t} onClose={() => setDelegating(false)} />}
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
    <li data-task-id={task.id} data-new={task.arrivedAt ? '' : undefined}>
      <button type="button" onClick={onSelect}
        className={`w-full text-start px-5 py-4 transition-colors relative ${task.delegatedTo && !active ? 'opacity-70 ' : ''}${active ? 'bg-brand-50/70' : task.arrivedAt ? 'task-arrived hover:bg-neutral-50' : 'hover:bg-neutral-50'}`}>
        {active && <span className={`absolute ${isAr ? 'right-0' : 'left-0'} top-3 bottom-3 w-[3px] rounded-full bg-brand-600`} />}
        <div className="flex items-start justify-between gap-4">
          <p className={`text-[14px] leading-snug line-clamp-2 ${active ? 'font-semibold text-brand-900' : 'font-normal text-neutral-800'}`}>
            {task.arrivedAt && <span className="me-1.5 inline-flex items-center gap-1 px-1.5 py-px rounded bg-brand-600 text-white text-[10px] font-bold align-[2px]" data-new-pill><span className="w-1 h-1 rounded-full bg-white animate-pulse" />{t('New', 'جديدة')}</span>}
            {isAr ? task.titleAr : task.titleEn}
          </p>
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
          {task.delegatedTo
            ? <span className="inline-flex items-center gap-1.5 ps-0.5 pe-2 py-0.5 rounded-full bg-[#EEF0FB] text-[#2A3466] text-[11px] font-semibold whitespace-nowrap" data-row-delegated><Avatar p={task.delegatedTo} className="w-4 h-4 text-[7.5px]" />{t(`With ${task.delegatedTo.name.split(' ')[0]}`, `لدى ${(task.delegatedTo.nameAr ?? task.delegatedTo.name).split(' ')[0]}`)}</span>
            : task.queue ? (task.queue.assignedTo
              ? <span className="inline-flex items-center gap-1.5 ps-0.5 pe-2 py-0.5 rounded-full bg-success-50 text-success-700 text-[11px] font-semibold whitespace-nowrap"><Avatar p={task.queue.assignedTo} className="w-4 h-4 text-[7.5px]" />{isAr ? task.queue.assignedTo.nameAr ?? task.queue.assignedTo.name : task.queue.assignedTo.name}</span>
              : <span className="px-2 py-0.5 rounded-full border border-dashed border-neutral-300 text-neutral-500 text-[11px] font-semibold whitespace-nowrap" data-row-unassigned>{t('Unassigned', 'غير مسندة')}</span>)
            : showState && <StateChip state={task.state} isAr={isAr} />}
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
