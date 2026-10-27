import { useMemo, useState } from 'react';
import type { LibProject } from '../lib/criteriaLibrary';
import { formatLibDate } from '../lib/criteriaLibrary';
import { CheckIcon, SearchIcon } from './Icons';

/** One selectable criterion row shown in the drawer. */
export interface DrawerItem {
  key: string;
  title: string; titleAr: string;
  sub?: string; subAr?: string;
  badge?: string;            // e.g. weight "30%"
  addedBy: string; addedByAr: string;
  addedOn: string;           // ISO
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string; titleAr: string;
  projects: LibProject[];
  itemsFor: (projectId: string) => DrawerItem[];
  /** Keys already present in the request (shown as imported, not selectable). */
  existingKeys?: Set<string>;
  onImport: (keys: string[]) => void;
  isAr: boolean;
  t: (en: string, ar: string) => string;
}

export default function ImportCriteriaDrawer({ open, onClose, title, titleAr, projects, itemsFor, existingKeys, onImport, isAr, t }: Props) {
  const [activeProject, setActiveProject] = useState(projects[0]?.id ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const existing = existingKeys ?? new Set<string>();

  // Count of selectable (not-yet-imported) items per project, and how many are selected.
  const counts = useMemo(() => {
    const m: Record<string, { total: number; selected: number }> = {};
    for (const p of projects) {
      const items = itemsFor(p.id);
      m[p.id] = {
        total: items.filter((i) => !existing.has(i.key)).length,
        selected: items.filter((i) => selected.has(i.key)).length,
      };
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, selected, open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const visibleProjects = q
    ? projects.filter((p) => [p.name, p.nameAr, p.code, p.entity, p.entityAr].filter(Boolean).some((s) => s!.toLowerCase().includes(q)))
    : projects;
  const activeItems = itemsFor(activeProject);
  const activeProj = projects.find((p) => p.id === activeProject);
  const selectableActive = activeItems.filter((i) => !existing.has(i.key));
  const allActiveSelected = selectableActive.length > 0 && selectableActive.every((i) => selected.has(i.key));

  const toggle = (key: string) => setSelected((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleAllActive = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allActiveSelected) selectableActive.forEach((i) => n.delete(i.key));
    else selectableActive.forEach((i) => n.add(i.key));
    return n;
  });

  function doImport() {
    onImport([...selected]);
    setSelected(new Set());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-[920px] h-[82vh] rounded-2xl overflow-hidden bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 px-5 py-4 surface-header text-white flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{t('Reuse from similar projects', 'إعادة استخدام من مشاريع مماثلة')}</p>
            <h3 className="text-[17px] font-bold mt-0.5">{isAr ? titleAr : title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Close', 'إغلاق')}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>

        {/* Body: project list | criteria */}
        <div className="flex-1 min-h-0 flex">
          {/* Left — projects */}
          <div className="w-[260px] shrink-0 border-e border-neutral-200 bg-neutral-50/60 overflow-y-auto">
            {/* Search RFPs / projects */}
            <div className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur px-3 pt-3 pb-2 border-b border-neutral-200">
              <div className="relative">
                <SearchIcon className={`w-3.5 h-3.5 text-neutral-400 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-2.5' : 'left-2.5'} pointer-events-none`} />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Search RFP by name or code…', 'ابحث عن منافسة بالاسم أو الرمز…')}
                  className={`w-full h-8 ${isAr ? 'pr-8 pl-2.5' : 'pl-8 pr-2.5'} text-[12px] rounded-lg border border-neutral-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none`} />
              </div>
            </div>
            <p className="px-4 pt-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Projects', 'المشاريع')}</p>
            {visibleProjects.length === 0 && (
              <p className="px-4 py-4 text-[12px] text-neutral-400">{t('No matching RFPs.', 'لا توجد منافسات مطابقة.')}</p>
            )}
            {visibleProjects.map((p) => {
              const c = counts[p.id];
              const isActive = p.id === activeProject;
              return (
                <button key={p.id} type="button" onClick={() => setActiveProject(p.id)}
                  className={`w-full text-start px-4 py-2.5 border-s-2 transition-colors ${isActive ? 'border-brand-600 bg-white' : 'border-transparent hover:bg-white/70'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] font-semibold truncate ${isActive ? 'text-brand-800' : 'text-neutral-800'}`}>{isAr ? p.nameAr : p.name}</span>
                    {(c?.selected ?? 0) > 0 && <span className="text-[10px] font-bold text-white bg-brand-600 rounded-full px-1.5 py-0.5 flex-shrink-0">{c.selected}</span>}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 truncate"><span dir="ltr">{p.code}</span> · {isAr ? p.entityAr : p.entity}</p>
                  <p className="text-[10.5px] text-neutral-400 mt-0.5">{t(`${c?.total ?? 0} criteria`, `${c?.total ?? 0} معيار`)}</p>
                </button>
              );
            })}
          </div>

          {/* Right — criteria of the active project */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-neutral-900 truncate">{activeProj ? (isAr ? activeProj.nameAr : activeProj.name) : ''}</p>
                <p className="text-[11px] text-neutral-500">{t('Criteria added in this project', 'المعايير المضافة في هذا المشروع')}</p>
              </div>
              {selectableActive.length > 0 && (
                <button type="button" onClick={toggleAllActive} className="text-[12px] font-semibold text-brand-700 hover:underline flex-shrink-0">
                  {allActiveSelected ? t('Clear all', 'إلغاء الكل') : t('Select all', 'تحديد الكل')}
                </button>
              )}
            </div>

            <div className="p-4 space-y-2">
              {activeItems.map((it) => {
                const already = existing.has(it.key);
                const on = selected.has(it.key);
                return (
                  <button key={it.key} type="button" disabled={already} onClick={() => toggle(it.key)}
                    className={`w-full text-start rounded-xl border px-3.5 py-3 transition-colors ${already ? 'border-neutral-200 bg-neutral-50 opacity-70 cursor-default' : on ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${already ? 'bg-neutral-300 border-neutral-300' : on ? 'bg-brand-600 border-brand-600' : 'border-neutral-300'}`}>
                        {(on || already) && <CheckIcon className="w-3 h-3 text-white" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-neutral-900">{isAr ? it.titleAr : it.title}</p>
                          {it.badge && <span className="text-[11px] font-semibold text-brand-700 bg-brand-100 rounded-full px-2 py-0.5 flex-shrink-0">{it.badge}</span>}
                        </div>
                        {(it.sub || it.subAr) && <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">{isAr ? it.subAr : it.sub}</p>}
                        <p className="text-[11px] text-neutral-400 mt-1.5">
                          {already
                            ? t('Already in your request', 'مضاف بالفعل إلى طلبك')
                            : <>{t('Added by', 'أضافه')} <span className="font-medium text-neutral-600">{isAr ? it.addedByAr : it.addedBy}</span> · {formatLibDate(it.addedOn, isAr)}</>}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {activeItems.length === 0 && <p className="text-[13px] text-neutral-400 italic px-1 py-6 text-center">{t('No criteria recorded for this project.', 'لا توجد معايير مسجلة لهذا المشروع.')}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-neutral-100 bg-white flex items-center justify-between gap-3">
          <p className="text-[12px] text-neutral-600">
            {selected.size > 0
              ? <><span className="font-semibold text-neutral-900">{selected.size}</span> {t('criteria selected across projects', 'معيار محدد من عدة مشاريع')}</>
              : t('Select criteria to import', 'اختر المعايير للاستيراد')}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-300 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">{t('Cancel', 'إلغاء')}</button>
            <button type="button" onClick={doImport} disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {t(`Import ${selected.size || ''} selected`.replace('  ', ' ').trim(), `استيراد ${selected.size || ''} محدد`.replace('  ', ' ').trim())}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
