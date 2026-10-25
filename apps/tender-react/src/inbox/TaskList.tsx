// Munafasat Inbox — dense, searchable, filterable, sortable task list.
import { useMemo, useState } from 'react';
import { useLanguage, useT } from '../context/LanguageContext';
import { Select } from '../components/ui';
import { SearchIcon, ClockIcon, AlertTriangleIcon } from '../components/Icons';
import type { Task, TaskType, Priority } from './types';
import { dueInfo, fmtDate, fmtSAR, isBlocked } from './store';
import { TypeChip, StateChip, PriorityTag, TYPE_META, ENTITY_META, tb } from './meta';

type SortKey = 'received' | 'due' | 'priority' | 'status';
const PRIO_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function TaskList({
  tasks, all, compact, selectedId, onSelect,
}: {
  tasks: Task[]; all: Task[]; compact?: boolean; selectedId?: string | null; onSelect: (id: string) => void;
}) {
  const t = useT();
  const { isAr } = useLanguage();
  const [q, setQ] = useState('');
  const [fType, setFType] = useState<TaskType | ''>('');
  const [fPrio, setFPrio] = useState<Priority | ''>('');
  const [fDept, setFDept] = useState('');
  const [sort, setSort] = useState<SortKey>('due');

  const depts = useMemo(() => {
    const seen = new Map<string, string>();
    tasks.forEach((x) => seen.set(x.department.en, isAr ? x.department.ar : x.department.en));
    return [...seen.entries()];
  }, [tasks, isAr]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let r = tasks.filter((x) => {
      if (fType && x.type !== fType) return false;
      if (fPrio && x.priority !== fPrio) return false;
      if (fDept && x.department.en !== fDept) return false;
      if (ql) {
        const hay = [x.titleEn, x.titleAr, x.entity.ref, x.entity.titleEn, x.entity.titleAr, x.supplier?.en, x.supplier?.ar]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      if (sort === 'priority') return PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
      if (sort === 'received') return +new Date(b.receivedAt) - +new Date(a.receivedAt);
      if (sort === 'status') return a.state.localeCompare(b.state);
      return +new Date(a.dueAt) - +new Date(b.dueAt); // due
    });
    return r;
  }, [tasks, q, fType, fPrio, fDept, sort]);

  return (
    <div className="flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className={`w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} pointer-events-none`} />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t('Search title, reference, supplier…', 'ابحث بالعنوان أو المرجع أو المورّد…')}
            className={`w-full h-9 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-[13px] rounded-lg border border-neutral-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none`}
          />
        </div>
        {!compact && (
          <>
            <div className="w-40"><Select value={fType} onChange={(e) => setFType(e.target.value as TaskType | '')}>
              <option value="">{t('All types', 'كل الأنواع')}</option>
              {Object.entries(TYPE_META).map(([k, m]) => <option key={k} value={k}>{isAr ? m.ar : m.en}</option>)}
            </Select></div>
            <div className="w-36"><Select value={fPrio} onChange={(e) => setFPrio(e.target.value as Priority | '')}>
              <option value="">{t('All priorities', 'كل الأولويات')}</option>
              <option value="urgent">{t('Urgent', 'عاجلة')}</option>
              <option value="high">{t('High', 'عالية')}</option>
              <option value="medium">{t('Medium', 'متوسطة')}</option>
              <option value="low">{t('Low', 'منخفضة')}</option>
            </Select></div>
            <div className="w-44"><Select value={fDept} onChange={(e) => setFDept(e.target.value)}>
              <option value="">{t('All departments', 'كل الإدارات')}</option>
              {depts.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </Select></div>
          </>
        )}
        <div className="w-36"><Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="due">{t('Sort: Due date', 'الترتيب: تاريخ الاستحقاق')}</option>
          <option value="received">{t('Sort: Received', 'الترتيب: الاستلام')}</option>
          <option value="priority">{t('Sort: Priority', 'الترتيب: الأولوية')}</option>
          <option value="status">{t('Sort: Status', 'الترتيب: الحالة')}</option>
        </Select></div>
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-14 text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center"><ClockIcon className="w-5 h-5" /></div>
          <p className="mt-3 text-[14px] font-semibold text-neutral-800">{t('Nothing here', 'لا يوجد شيء هنا')}</p>
          <p className="mt-1 text-[12.5px] text-neutral-500">{t('No tasks match this view or your filters.', 'لا توجد مهام تطابق هذا العرض أو عوامل التصفية.')}</p>
        </div>
      ) : compact ? (
        <CompactList rows={rows} all={all} isAr={isAr} t={t} selectedId={selectedId} onSelect={onSelect} />
      ) : (
        <FullTable rows={rows} all={all} isAr={isAr} t={t} selectedId={selectedId} onSelect={onSelect} />
      )}
      <p className="mt-2 text-[11px] text-neutral-400">{t(`${rows.length} task${rows.length === 1 ? '' : 's'}`, `${rows.length} مهمة`)}</p>
    </div>
  );
}

type RowProps = { rows: Task[]; all: Task[]; isAr: boolean; t: (en: string, ar: string) => string; selectedId?: string | null; onSelect: (id: string) => void };

function DueCell({ task, isAr, t }: { task: Task; isAr: boolean; t: (en: string, ar: string) => string }) {
  const d = dueInfo(task);
  const cls = d.overdue ? 'text-error-700 font-semibold' : d.soon ? 'text-warning-700 font-medium' : 'text-neutral-600';
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${cls}`} dir="ltr">
      {d.overdue && <AlertTriangleIcon className="w-3 h-3" />}
      {fmtDate(task.dueAt, isAr)}
      {d.overdue && <span className="ms-1">· {t(`${Math.abs(d.days)}d overdue`, `متأخرة ${Math.abs(d.days)} يوم`)}</span>}
    </span>
  );
}

function FullTable({ rows, all, isAr, t, selectedId, onSelect }: RowProps) {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="text-start ps-4 pe-2 py-2.5 font-medium">{t('Task', 'المهمة')}</th>
              <th className="text-start px-2 py-2.5 font-medium">{t('Related', 'مرتبط بـ')}</th>
              <th className="text-start px-2 py-2.5 font-medium">{t('Stage', 'المرحلة')}</th>
              <th className="text-start px-2 py-2.5 font-medium">{t('Priority', 'الأولوية')}</th>
              <th className="text-start px-2 py-2.5 font-medium">{t('Due', 'الاستحقاق')}</th>
              <th className="text-start px-2 py-2.5 font-medium">{t('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((task) => {
              const blocked = isBlocked(task, all);
              const d = dueInfo(task);
              return (
                <tr key={task.id} onClick={() => onSelect(task.id)}
                  className={`cursor-pointer transition-colors ${selectedId === task.id ? 'bg-brand-50/70' : d.overdue ? 'bg-error-50/30 hover:bg-error-50/50' : 'hover:bg-neutral-50'}`}>
                  <td className="ps-4 pe-2 py-2.5 align-top">
                    <div className="flex items-start gap-2">
                      <TypeChip type={task.type} isAr={isAr} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-neutral-900 leading-snug">{isAr ? task.titleAr : task.titleEn}</p>
                        <p className="text-[11.5px] text-neutral-500 mt-0.5 truncate max-w-[280px]">{isAr ? task.summaryAr : task.summaryEn}</p>
                        {blocked && <p className="text-[11px] text-neutral-400 mt-0.5">⏳ {t('Waiting on a prior step', 'بانتظار خطوة سابقة')}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 align-top whitespace-nowrap">
                    <p className="text-[12px] font-medium text-neutral-700">{ENTITY_META[task.entity.kind][isAr ? 'ar' : 'en']} · {task.entity.ref}</p>
                    {task.supplier && <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-[160px]">{tb(task.supplier, isAr)}</p>}
                    {task.amount != null && <p className="text-[11px] text-neutral-500 mt-0.5" dir="ltr">{fmtSAR(task.amount)}</p>}
                  </td>
                  <td className="px-2 py-2.5 align-top text-[12px] text-neutral-600 whitespace-nowrap">{isAr ? task.stageAr : task.stageEn}</td>
                  <td className="px-2 py-2.5 align-top"><PriorityTag priority={task.priority} isAr={isAr} /></td>
                  <td className="px-2 py-2.5 align-top whitespace-nowrap"><DueCell task={task} isAr={isAr} t={t} /></td>
                  <td className="px-2 py-2.5 align-top"><StateChip state={task.state} isAr={isAr} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompactList({ rows, all, isAr, t, selectedId, onSelect }: RowProps) {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white divide-y divide-neutral-100">
      {rows.map((task) => {
        const blocked = isBlocked(task, all);
        const d = dueInfo(task);
        return (
          <button key={task.id} type="button" onClick={() => onSelect(task.id)}
            className={`w-full text-start px-3 py-2.5 transition-colors ${selectedId === task.id ? 'bg-brand-50/80 ring-1 ring-inset ring-brand-300' : d.overdue ? 'bg-error-50/30 hover:bg-error-50/50' : 'hover:bg-neutral-50'}`}>
            <div className="flex items-center justify-between gap-2">
              <TypeChip type={task.type} isAr={isAr} />
              <StateChip state={task.state} isAr={isAr} />
            </div>
            <p className="text-[12.5px] font-semibold text-neutral-900 mt-1 leading-snug">{isAr ? task.titleAr : task.titleEn}</p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-[11px] text-neutral-500">{task.entity.ref}</span>
              <DueCell task={task} isAr={isAr} t={t} />
            </div>
            {blocked && <p className="text-[10.5px] text-neutral-400 mt-0.5">⏳ {t('Waiting on a prior step', 'بانتظار خطوة سابقة')}</p>}
          </button>
        );
      })}
    </div>
  );
}
