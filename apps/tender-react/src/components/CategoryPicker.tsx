import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { SearchIcon, ChevronDownIcon, CheckIcon, XIcon } from './Icons';
import { PROJECT_CATEGORIES, categoryById } from '../data/projectCategories';

/**
 * "What does this project include?" — the project's own categories are locked chips;
 * the dropdown (search, title + description) adds more, shown as removable chips.
 */
export default function CategoryPicker({ lockedIds, addedIds, onChange, disabled }: {
  lockedIds: string[];
  addedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = 'include-category-options';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROJECT_CATEGORIES;
    return PROJECT_CATEGORIES.filter((c) =>
      c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.titleAr.includes(query.trim()) || c.descriptionAr.includes(query.trim()));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { setActive(0); }, [query, open]);

  function toggle(id: string) {
    if (lockedIds.includes(id)) return;
    onChange(addedIds.includes(id) ? addedIds.filter((x) => x !== id) : [...addedIds, id]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) toggle(filtered[active].id); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  }

  const chip = (id: string, locked: boolean) => {
    const c = categoryById(id);
    if (!c) return null;
    const label = isAr ? c.titleAr : c.title;
    return locked ? (
      <span
        key={id}
        aria-disabled="true"
        title={t('Included by the selected project', 'مُضمَّن من المشروع المحدد')}
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200 cursor-not-allowed select-none"
      >
        {label}
      </span>
    ) : (
      <span key={id} className="inline-flex items-center gap-1 ps-2.5 pe-1 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-300">
        {label}
        <button type="button" onClick={() => toggle(id)} aria-label={t(`Remove ${c.title}`, `إزالة ${c.titleAr}`)} title={t('Remove', 'إزالة')}
          className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-brand-100">
          <XIcon className="w-2.5 h-2.5" />
        </button>
      </span>
    );
  };

  return (
    <div ref={wrapRef} className="relative">
      {(lockedIds.length > 0 || addedIds.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {lockedIds.map((id) => chip(id, true))}
          {addedIds.map((id) => chip(id, false))}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-start text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <span className="text-neutral-400">
          {addedIds.length > 0
            ? t(`${addedIds.length} more categor${addedIds.length === 1 ? 'y' : 'ies'} added — add more`, `أُضيفت ${addedIds.length} فئة — أضف المزيد`)
            : t('Select categories.', 'اختر الفئات.')}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden fade-in">
          <div className="relative border-b border-neutral-100">
            <SearchIcon className="w-4 h-4 text-neutral-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? `cat-opt-${filtered[active].id}` : undefined}
              placeholder={t('Search categories', 'ابحث في الفئات')}
              className="w-full ps-10 pe-3 py-2.5 text-[13px] bg-white focus:outline-none placeholder:text-neutral-400"
            />
          </div>
          <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-[12px] text-neutral-400">{t('No categories match your search.', 'لا توجد فئات مطابقة.')}</li>
            )}
            {filtered.map((c, i) => {
              const locked = lockedIds.includes(c.id);
              const added = addedIds.includes(c.id);
              return (
                <li
                  key={c.id}
                  id={`cat-opt-${c.id}`}
                  role="option"
                  aria-selected={locked || added}
                  aria-disabled={locked}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); toggle(c.id); }}
                  className={`flex items-start gap-3 px-4 py-2.5 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'} ${i === active && !locked ? 'bg-neutral-100' : ''}`}
                >
                  <span className={`mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 ${
                    locked ? 'bg-neutral-200 border-neutral-300 text-neutral-500' : added ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-neutral-300'
                  }`}>
                    {(locked || added) && <CheckIcon className="w-3 h-3" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`flex items-center gap-2 text-[13px] font-medium ${locked ? 'text-neutral-400' : 'text-neutral-900'}`}>
                      {isAr ? c.titleAr : c.title}
                      {locked && <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 rounded px-1.5 py-0.5">{t('Included', 'مُضمَّن')}</span>}
                    </span>
                    <span className={`block text-[12px] mt-0.5 ${locked ? 'text-neutral-400' : 'text-neutral-500'}`}>{isAr ? c.descriptionAr : c.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
