import { useState } from 'react';
import { useT } from '../context/LanguageContext';
import { TrashIcon } from './Icons';

/** Always-visible remove button at the end of a list/table row. */
export function RemoveRowButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const t = useT();
  const l = label ?? t('Remove', 'إزالة');
  return (
    <button type="button" onClick={onClick} title={l} aria-label={l}
      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-error-600 hover:bg-error-50 transition-colors flex-shrink-0">
      <TrashIcon className="w-3.5 h-3.5" />
    </button>
  );
}

/** "Remove all" with an inline confirm step (no browser dialog). Renders nothing when there's nothing to remove. */
export function RemoveAllButton({ count, onConfirm, what }: { count: number; onConfirm: () => void; what?: string }) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  if (count === 0) return null;
  if (asking) {
    return (
      <span className="inline-flex items-center gap-2 text-[12px]" role="group" aria-label={t('Confirm remove all', 'تأكيد إزالة الكل')}>
        <span className="text-neutral-600">{t(`Remove all ${count}${what ? ` ${what}` : ''}?`, `إزالة الكل (${count})؟`)}</span>
        <button type="button" onClick={() => setAsking(false)} className="px-2.5 py-1 rounded-md border border-neutral-300 bg-white font-semibold text-neutral-600 hover:bg-neutral-50">{t('Cancel', 'إلغاء')}</button>
        <button type="button" onClick={() => { onConfirm(); setAsking(false); }} className="px-2.5 py-1 rounded-md bg-error-600 text-white font-semibold hover:bg-error-700">{t('Yes, remove all', 'نعم، أزل الكل')}</button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setAsking(true)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors">
      <TrashIcon className="w-3.5 h-3.5" />
      {t('Remove all', 'إزالة الكل')}
    </button>
  );
}
