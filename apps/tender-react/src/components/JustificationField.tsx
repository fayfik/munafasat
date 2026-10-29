import { useState, type ReactNode } from 'react';
import { useT } from '../context/LanguageContext';
import { PencilIcon } from './Icons';

/**
 * A justification the user writes and submits on its own.
 * Entry: textarea + Submit (and Cancel when editing a saved one).
 * Submitted: a plain one-line summary, truncated when long, with an edit icon at the end.
 */
export default function JustificationField({ id, label, value, onSubmit, placeholder, footer, required = true }: {
  id: string;
  label: string;
  /** The submitted text ('' when not submitted yet). */
  value: string;
  onSubmit: (text: string) => void;
  placeholder?: string;
  /** Extra actions shown under the textarea while editing (e.g. "Move it instead"). */
  footer?: ReactNode;
  required?: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(!value.trim());
  const [draft, setDraft] = useState(value);

  if (!editing && value.trim()) {
    return (
      <div className="flex items-center gap-2 min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-1.5" data-testid="justification-saved">
        <span className="text-[11.5px] font-semibold text-neutral-500 flex-shrink-0">{t('Justification:', 'المبرر:')}</span>
        <span className="text-[12.5px] text-neutral-800 truncate min-w-0 flex-1" title={value}>{value}</span>
        <button type="button" onClick={() => { setDraft(value); setEditing(true); }}
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-neutral-500 hover:text-brand-700 hover:bg-brand-50 flex-shrink-0"
          aria-label={t('Edit justification', 'تعديل المبرر')} title={t('Edit justification', 'تعديل المبرر')}>
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const canSubmit = draft.trim().length > 0 && draft.trim() !== value.trim();
  return (
    <div className="rounded-lg border border-warning-100 bg-warning-50 px-3 py-2.5 space-y-1.5" data-testid="justification-edit">
      <label htmlFor={id} className="block text-[11.5px] font-semibold text-warning-800">
        {label} 
      </label>
      <textarea id={id} value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={placeholder}
        className="block w-full rounded-lg border border-warning-500/40 bg-white px-3 py-2 text-[12.5px] text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" disabled={!canSubmit} onClick={() => { onSubmit(draft.trim()); setEditing(false); }}
          className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12px] font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {t('Submit justification', 'إرسال المبرر')}
        </button>
        {value.trim() && (
          <button type="button" onClick={() => { setDraft(value); setEditing(false); }}
            className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-[12px] font-semibold text-neutral-600 hover:bg-neutral-50">
            {t('Cancel', 'إلغاء')}
          </button>
        )}
        {!value.trim() && required && <span className="text-[11px] text-warning-700">{t('Required — submit it to continue.', 'مطلوب — أرسله للمتابعة.')}</span>}
        {footer && <span className="ms-auto">{footer}</span>}
      </div>
    </div>
  );
}
