import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage, useT } from '../context/LanguageContext';

type Mode = 'add' | 'replace';

/**
 * When importing items into a list that already has some, ask whether to add them
 * to the current list or replace it. With an empty list the import just runs.
 */
export function useAddOrReplace(existingCount: number) {
  const [pending, setPending] = useState<{ incoming: number; source: string; apply: (m: Mode) => void } | null>(null);
  const run = (incoming: number, source: string, apply: (m: Mode) => void) => {
    if (existingCount === 0) apply('replace');
    else setPending({ incoming, source, apply });
  };
  const dialog: ReactNode = pending
    ? <AddOrReplaceDialog existing={existingCount} incoming={pending.incoming} source={pending.source}
        onPick={(m) => { pending.apply(m); setPending(null); }} onCancel={() => setPending(null)} />
    : null;
  return { run, dialog };
}

function AddOrReplaceDialog({ existing, incoming, source, onPick, onCancel }: { existing: number; incoming: number; source: string; onPick: (m: Mode) => void; onCancel: () => void }) {
  const t = useT();
  const { isAr } = useLanguage();
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] backdrop-in" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="aor-title" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{source}</p>
          <h3 id="aor-title" className="text-[16px] font-bold mt-0.5">{t(`Add ${incoming} item${incoming === 1 ? '' : 's'} to your list?`, `إضافة ${incoming} بند إلى قائمتك؟`)}</h3>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-[13px] text-neutral-700 leading-relaxed">
            {t(`Your Bill of Quantities already has ${existing} item${existing === 1 ? '' : 's'}. Add the new items after them, or replace the whole list?`,
               `يحتوي جدول الكميات على ${existing} بند. أضف البنود الجديدة بعدها، أو استبدل القائمة كاملة؟`)}
          </p>
        </div>
        <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2 flex-wrap">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100">{t('Cancel', 'إلغاء')}</button>
          <button type="button" onClick={() => onPick('replace')} className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50">{t('Replace current list', 'استبدال القائمة الحالية')}</button>
          <button type="button" onClick={() => onPick('add')} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 shadow-sm">{t('Add to current list', 'إضافة إلى القائمة الحالية')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
