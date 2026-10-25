// Munafasat Inbox — top-level work surface: view navigation, summary, list/detail split.
import { useState } from 'react';
import { useLanguage, useT } from '../context/LanguageContext';
import { ClockIcon, AlertTriangleIcon, CheckCircleIcon, ListIcon, NavInboxIcon, NavRequestsIcon } from '../components/Icons';
import type { InboxView } from './types';
import { useInbox } from './store';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';

const VIEWS: { key: InboxView; en: string; ar: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'needs-action', en: 'Needs My Action', ar: 'يحتاج إجراءً مني', Icon: NavInboxIcon },
  { key: 'in-progress',  en: 'In Progress',     ar: 'قيد التنفيذ',     Icon: ClockIcon },
  { key: 'sent-waiting', en: 'Sent / Waiting',  ar: 'مُرسلة / بالانتظار', Icon: NavRequestsIcon },
  { key: 'completed',    en: 'Completed',       ar: 'مكتملة',          Icon: CheckCircleIcon },
  { key: 'overdue',      en: 'Overdue',         ar: 'متأخرة',          Icon: AlertTriangleIcon },
  { key: 'all',          en: 'All Work',        ar: 'كل العمل',        Icon: ListIcon },
];

export default function InboxPage() {
  const t = useT();
  const { isAr } = useLanguage();
  const { tasks, countsByView, tasksForView, getTask } = useInbox();
  const [view, setView] = useState<InboxView>('needs-action');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = tasksForView(view);
  const selected = selectedId ? getTask(selectedId) : undefined;
  // If the selected task leaves the current view after an action, keep showing it until deselected.

  function pickView(v: InboxView) { setView(v); setSelectedId(null); }

  return (
    <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto">
      {/* Title + summary */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900">{t('Inbox', 'الوارد')}</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">{t('Your work across the procurement lifecycle — tasks assigned to you and work you are watching.', 'عملك عبر دورة المشتريات — المهام المسندة إليك والأعمال التي تتابعها.')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Kpi tone="brand" icon={<NavInboxIcon className="w-4 h-4" />} label={t('Needs action', 'يحتاج إجراءً')} value={countsByView['needs-action']} />
          <Kpi tone="error" icon={<AlertTriangleIcon className="w-4 h-4" />} label={t('Overdue', 'متأخرة')} value={countsByView.overdue} />
          <Kpi tone="warning" icon={<ClockIcon className="w-4 h-4" />} label={t('In progress', 'قيد التنفيذ')} value={countsByView['in-progress']} />
        </div>
      </div>

      {/* View navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {VIEWS.map((v) => {
          const active = view === v.key;
          const count = countsByView[v.key];
          return (
            <button key={v.key} type="button" onClick={() => pickView(v.key)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors flex-shrink-0 border ${
                active ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800'}`}>
              <v.Icon className="w-4 h-4" />
              {isAr ? v.ar : v.en}
              {count > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold inline-flex items-center justify-center ${
                  active ? 'bg-white/25 text-white' : v.key === 'overdue' ? 'bg-error-100 text-error-700' : 'bg-neutral-100 text-neutral-600'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* List / detail */}
      {selected ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-4 items-start">
          <div className="hidden lg:block"><TaskList tasks={rows} all={tasks} compact selectedId={selectedId} onSelect={setSelectedId} /></div>
          <TaskDetail task={selected} onBack={() => setSelectedId(null)} />
        </div>
      ) : (
        <TaskList tasks={rows} all={tasks} selectedId={selectedId} onSelect={setSelectedId} />
      )}
    </div>
  );
}

function Kpi({ tone, icon, label, value }: { tone: 'brand' | 'error' | 'warning'; icon: React.ReactNode; label: string; value: number }) {
  const map = {
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    error: 'bg-error-50 text-error-700 border-error-100',
    warning: 'bg-warning-50 text-warning-700 border-warning-100',
  } as const;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${map[tone]}`}>
      {icon}
      <span className="text-[18px] font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[11px] font-medium opacity-80">{label}</span>
    </div>
  );
}
