import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { SearchIcon, ChevronDownIcon, CheckIcon } from './Icons';
import type { CostCenter } from '../types/tender';

/**
 * "View more cost centers" link that opens a search-and-select list.
 * Picking an option calls onSelect and closes the list.
 */
export default function CostCenterPicker({ options, selectedId, onSelect }: { options: CostCenter[]; selectedId: string; onSelect: (id: string) => void }) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = 'cost-center-options';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((cc) => cc.name.toLowerCase().includes(q) || cc.nameAr.includes(query.trim()) || cc.code.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  function choose(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) choose(filtered[active].id); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-link hover:underline underline-offset-2"
      >
        {t('View more cost centers', 'عرض مراكز تكلفة أخرى')}
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden fade-in">
          <div className="relative border-b border-neutral-100 p-2">
            <SearchIcon className="w-3.5 h-3.5 text-neutral-400 absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? `cc-opt-${filtered[active].id}` : undefined}
              placeholder={t('Search by name or code…', 'ابحث بالاسم أو الرمز…')}
              className="w-full ps-8 pe-3 py-2 text-[13px] rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none placeholder:text-neutral-400"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-[12px] text-neutral-400">{t('No cost centers match your search.', 'لا توجد مراكز تكلفة مطابقة.')}</li>
            )}
            {filtered.map((cc, i) => {
              const selected = cc.id === selectedId;
              return (
                <li
                  key={cc.id}
                  id={`cc-opt-${cc.id}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); choose(cc.id); }}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer ${i === active ? 'bg-neutral-100' : ''}`}
                >
                  <div className="min-w-0">
                    <p className={`text-[13px] truncate ${selected ? 'font-semibold text-brand-700' : 'font-medium text-neutral-800'}`}>{isAr ? cc.nameAr : cc.name}</p>
                    <p className="text-[11px] text-neutral-400" dir="ltr">{cc.code}</p>
                  </div>
                  {selected && <CheckIcon className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
