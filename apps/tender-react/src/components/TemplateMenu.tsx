import { useEffect, useRef, useState } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { ChevronDownIcon } from './Icons';

export interface TemplateOption { id: string; en: string; ar: string; descEn: string; descAr: string }

/** "Use a template" menu — the person picks; nothing is chosen automatically. */
export default function TemplateMenu({ options, onPick, label, suggestedId }: { options: TemplateOption[]; onPick: (id: string) => void; label?: string; suggestedId?: string }) {
  const t = useT();
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm">
        {label ?? t('Use a template', 'استخدم نموذجاً')}
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-30 mt-1.5 w-72 rounded-xl border border-neutral-200 bg-white shadow-lg py-1">
          {options.map((o) => (
            <button key={o.id} type="button" role="menuitem" onClick={() => { onPick(o.id); setOpen(false); }}
              className="w-full text-start px-3 py-2 hover:bg-neutral-50">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-900">
                {isAr ? o.ar : o.en}
                {o.id === suggestedId && <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 rounded-full px-1.5 py-0.5">{t('Matches this project', 'يناسب هذا المشروع')}</span>}
              </span>
              <span className="block text-[12px] text-neutral-500 mt-0.5">{isAr ? o.descAr : o.descEn}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
