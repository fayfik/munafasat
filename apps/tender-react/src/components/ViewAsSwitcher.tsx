// "View as" — the prototype plays every role in the approval flow. Picking a person
// switches the Inbox, its counts and the Dashboard to what that person sees.
import { useEffect, useRef, useState } from 'react';
import { useInbox, viewOf } from '../inbox/store';
import { personas } from '../inbox/flow';
import { useRequests } from '../context/RequestStore';
import { useLanguage, useT } from '../context/LanguageContext';
import { ChevronDownIcon } from './Icons';

const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'MH';

export default function ViewAsSwitcher() {
  const { isAr } = useLanguage();
  const t = useT();
  const { viewer, setViewer, tasks } = useInbox();
  const { userName } = useRequests();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const list = personas(userName);
  const name = viewer ? viewer.name : userName || 'Mohammed H.';
  const sub = viewer ? `${isAr ? viewer.roleAr ?? viewer.role : viewer.role} · ${isAr ? viewer.deptAr ?? viewer.dept : viewer.dept}` : t('Requester · viewing all roles', 'مقدم الطلب · عرض جميع الأدوار');
  const toAct = (id: string) => tasks.filter((x) => x.assignee.id === id && viewOf(x, tasks, x.assignee).includes('needs-action')).length;
  const groups = [...new Set(list.map((p) => p.group.en))];

  return (
    <div ref={ref} className="relative ps-3 ms-1 border-s border-white/25">
      <button type="button" onClick={() => setOpen((o) => !o)} data-testid="view-as"
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/10 transition-colors text-start" aria-haspopup="menu" aria-expanded={open}>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold select-none bg-white text-brand-700`}>{initialsOf(name)}</span>
        <span className="hidden sm:block leading-tight">
          <span className="block text-[12px] font-semibold text-white">{name}</span>
          <span className="block text-[10px] text-white/75 max-w-[220px] truncate">{sub}</span>
        </span>
        <ChevronDownIcon className="w-3.5 h-3.5 text-white/80" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full mt-2 w-[320px] max-h-[75vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white text-neutral-800 shadow-xl z-50 py-2" data-testid="view-as-menu">
          <p className="px-4 pt-1 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">{t('View as', 'العرض كـ')}</p>
          <MenuRow active={!viewer} title={t('Everyone (demo)', 'الجميع (عرض توضيحي)')} sub={t('Every task, as in the original prototype', 'جميع المهام كما في النموذج الأصلي')} onClick={() => { setViewer(null); setOpen(false); }} />
          {groups.map((g) => (
            <div key={g} className="mt-1.5">
              <p className="px-4 py-1 text-[10.5px] font-semibold text-neutral-400">{isAr ? list.find((p) => p.group.en === g)!.group.ar : g}</p>
              {list.filter((p) => p.group.en === g).map((p) => {
                const n = toAct(p.person.id);
                return (
                  <MenuRow key={p.key} testId={`persona-${p.key}`} active={viewer?.id === p.person.id}
                    title={isAr ? p.person.nameAr ?? p.person.name : p.person.name}
                    sub={(isAr ? p.person.roleAr : p.person.role) ?? ''}
                    count={n} onClick={() => { setViewer(p.person); setOpen(false); }} />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuRow({ title, sub, active, count, onClick, testId }: { title: string; sub: string; active: boolean; count?: number; onClick: () => void; testId?: string }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={active} onClick={onClick} data-testid={testId}
      className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-start hover:bg-neutral-50 ${active ? 'bg-brand-50' : ''}`}>
      <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{initialsOf(title)}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[12.5px] font-semibold truncate ${active ? 'text-brand-800' : 'text-neutral-800'}`}>{title}</span>
        <span className="block text-[11px] text-neutral-500 truncate">{sub}</span>
      </span>
      {count ? <span className="text-[10.5px] font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-1.5 py-px">{count}</span> : null}
    </button>
  );
}
