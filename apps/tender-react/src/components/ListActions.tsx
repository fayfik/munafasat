import { useState } from 'react';
import { useT } from '../context/LanguageContext';
import { TrashIcon } from './Icons';
import ConfirmDeleteAll from './ConfirmDeleteAll';

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

/** "Delete all" with the shared confirmation modal. Renders nothing when there's nothing to remove. */
export function RemoveAllButton({ count, onConfirm, what, whatAr, context, contextAr }: { count: number; onConfirm: () => void; what?: string; whatAr?: string; context?: string; contextAr?: string }) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  if (count === 0) return null;
  return (
    <>
      <button type="button" onClick={() => setAsking(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors">
        <TrashIcon className="w-3.5 h-3.5" />
        {t('Delete all', 'حذف الكل')}
      </button>
      <ConfirmDeleteAll open={asking} onCancel={() => setAsking(false)} onConfirm={() => { onConfirm(); setAsking(false); }}
        contextLabel={context ?? 'Delete all'} contextLabelAr={contextAr ?? 'حذف الكل'}
        title={`Delete all ${what ?? 'items'}?`} titleAr={`حذف جميع ${whatAr ?? 'البنود'}؟`}
        message={`This removes all ${count} ${what ?? 'items'} and can't be undone.`} messageAr={`سيؤدي ذلك إلى إزالة جميع العناصر (${count}) ولا يمكن التراجع عن ذلك.`} />
    </>
  );
}
