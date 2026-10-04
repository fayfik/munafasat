import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT, useLanguage } from '../context/LanguageContext';
import { XIcon } from './Icons';

export interface ColumnOption { key: string; en: string; ar: string }

/**
 * Side drawer for the BOQ table's columns: default columns are always on (locked),
 * optional columns can be switched on or off.
 */
export default function ColumnConfigDrawer({ defaults, optional, enabled, onChange, onClose }: {
  defaults: ColumnOption[];
  optional: ColumnOption[];
  enabled: string[];
  onChange: (keys: string[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { isAr } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const toggle = (key: string) => onChange(enabled.includes(key) ? enabled.filter((k) => k !== key) : [...enabled, key]);

  const row = (c: ColumnOption, on: boolean, locked: boolean) => (
    <li key={c.key} className="flex items-center justify-between gap-4 py-3 border-b border-neutral-200 last:border-b-0">
      <span id={`col-${c.key}`} className={`text-[14px] ${locked ? 'text-neutral-700' : 'text-neutral-800'}`}>{t(c.en, c.ar)}</span>
      <Switch on={on} disabled={locked} labelledBy={`col-${c.key}`} onToggle={() => toggle(c.key)}
        title={locked ? t('Default column — always shown', 'عمود افتراضي — يظهر دائماً') : undefined} />
    </li>
  );

  return createPortal(
    <div className="fixed inset-0 z-50" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="col-config-title"
        className="absolute inset-y-0 end-0 w-full max-w-[360px] bg-white shadow-lg flex flex-col slide-in-end">
        <div className="flex items-center justify-between px-6 h-16 border-b border-neutral-200 flex-shrink-0">
          <h2 id="col-config-title" className="text-[17px] font-semibold text-neutral-900">{t('Column configuration', 'إعداد الأعمدة')}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('Close', 'إغلاق')}
            className="w-8 h-8 -me-2 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">{t('Default columns', 'الأعمدة الافتراضية')}</h3>
            <ul>{defaults.map((c) => row(c, true, true))}</ul>
          </section>
          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">{t('Optional columns', 'أعمدة اختيارية')}</h3>
            <ul>{optional.map((c) => row(c, enabled.includes(c.key), false))}</ul>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function Switch({ on, disabled, onToggle, labelledBy, title }: { on: boolean; disabled?: boolean; onToggle: () => void; labelledBy: string; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      title={title}
      onClick={() => { if (!disabled) onToggle(); }}
      className={`relative w-[52px] h-[30px] rounded-full flex-shrink-0 transition-colors ${
        on ? (disabled ? 'bg-brand-300 cursor-not-allowed' : 'bg-brand-600') : 'bg-neutral-200 hover:bg-neutral-300'
      }`}
    >
      <span className={`absolute top-[3px] w-6 h-6 rounded-full bg-white shadow-sm transition-all ${on ? 'start-[25px]' : 'start-[3px]'}`} />
    </button>
  );
}
