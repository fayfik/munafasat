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
    <li key={c.key} className="flex items-center justify-between gap-4 py-2.5 border-b border-neutral-100 last:border-b-0">
      <span id={`col-${c.key}`} className={`text-[13px] ${locked ? 'text-neutral-500' : 'text-neutral-800'}`}>{t(c.en, c.ar)}</span>
      <Switch on={on} disabled={locked} labelledBy={`col-${c.key}`} onToggle={() => toggle(c.key)}
        title={locked ? t('Default column — always shown', 'عمود افتراضي — يظهر دائماً') : undefined} />
    </li>
  );

  return createPortal(
    <div className="fixed inset-0 z-50" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="col-config-title"
        className="absolute inset-y-0 end-0 w-full max-w-[340px] bg-white shadow-lg flex flex-col slide-in-end">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3.5 border-b border-neutral-200 flex-shrink-0">
          <div>
            <h2 id="col-config-title" className="text-[15px] font-semibold text-neutral-900">{t('Column configuration', 'إعداد الأعمدة')}</h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">{t('Choose the extra columns to show in the BOQ table.', 'اختر الأعمدة الإضافية لعرضها في جدول الكميات.')}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('Close', 'إغلاق')}
            className="w-7 h-7 -me-1.5 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <h3 className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{t('Optional columns', 'أعمدة اختيارية')}</h3>
            <ul className="mt-1">{optional.map((c) => row(c, enabled.includes(c.key), false))}</ul>
          </section>
          <section>
            <h3 className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">{t('Default columns', 'الأعمدة الافتراضية')}</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">{t('Always shown.', 'تظهر دائماً.')}</p>
            <ul className="mt-1">{defaults.map((c) => row(c, true, true))}</ul>
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

/** Compact switch in the app's style: 32×18, brand green when on, muted when locked. */
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
      className={`relative w-[32px] h-[18px] rounded-full flex-shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        on ? (disabled ? 'bg-brand-600/40 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700') : 'bg-neutral-300 hover:bg-neutral-400'
      }`}
    >
      <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all ${on ? 'start-[16px]' : 'start-[2px]'}`} />
    </button>
  );
}
