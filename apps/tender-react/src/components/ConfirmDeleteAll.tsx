// Shared "Delete all" confirmation modal — one consistent look everywhere
// (BOQ, Payment schedule, Technical evaluation, …).
import { createPortal } from 'react-dom';
import { TrashIcon } from './Icons';
import { useLanguage, useT } from '../context/LanguageContext';

export default function ConfirmDeleteAll({
  open, onCancel, onConfirm, contextLabel, contextLabelAr, title, titleAr, message, messageAr,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  contextLabel: string; contextLabelAr: string;
  title: string; titleAr: string;
  message: string; messageAr: string;
}) {
  const { isAr } = useLanguage();
  const t = useT();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] backdrop-in"
      onClick={onCancel} role="dialog" aria-modal="true" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-error-500 to-error-600 text-white flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <TrashIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{isAr ? contextLabelAr : contextLabel}</p>
            <h3 className="text-[16px] font-bold mt-0.5">{isAr ? titleAr : title}</h3>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-neutral-700 leading-relaxed">{isAr ? messageAr : message}</p>
        </div>
        <div className="px-5 py-3 border-t border-neutral-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">{t('Cancel', 'إلغاء')}</button>
          <button type="button" onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-error-600 text-white text-[13px] font-semibold hover:bg-error-700 transition-colors shadow-sm">{t('Yes, delete all', 'نعم، احذف الكل')}</button>
        </div>
      </div>
    </div>, document.body);
}
