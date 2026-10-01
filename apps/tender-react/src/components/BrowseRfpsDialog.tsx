import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT, useLanguage } from '../context/LanguageContext';
import { SearchIcon, XIcon } from './Icons';
import { PAST_RFPS, formatRfpDate, type PastRfp } from '../lib/rfpLibrary';

/** Pop-up listing all past RFPs; the user picks one and imports it. */
export default function BrowseRfpsDialog({ projectId, onClose, onImport }: { projectId: string; onClose: () => void; onImport: (rfp: PastRfp) => void }) {
  const t = useT();
  const { isAr } = useLanguage();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'project' | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PAST_RFPS
      .filter((r) => scope === 'all' || r.projectId === projectId)
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) || r.titleAr.includes(query.trim()))
      .sort((a, b) => Number(b.projectId === projectId) - Number(a.projectId === projectId) || b.created.localeCompare(a.created));
  }, [query, scope, projectId]);

  const chosen = PAST_RFPS.find((r) => r.id === selected) ?? null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="rfp-dialog-title" className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-lg overflow-hidden fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h2 id="rfp-dialog-title" className="text-[15px] font-semibold text-neutral-900">{t('Browse all RFPs', 'تصفح جميع طلبات العروض')}</h2>
            <p className="text-[12px] text-neutral-500 mt-0.5">{t('Pick an RFP to import its details into this request. You can edit everything afterwards.', 'اختر طلب عروض لاستيراد تفاصيله إلى هذا الطلب. يمكنك تعديل كل شيء لاحقاً.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Close', 'إغلاق')} className="w-8 h-8 -me-2 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search + scope */}
        <div className="px-6 py-3 flex items-center gap-3 border-b border-neutral-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="w-3.5 h-3.5 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search by title, RFP number or department…', 'ابحث بالعنوان أو رقم الطلب أو الإدارة…')}
              className="w-full ps-8 pe-3 py-2 text-[13px] rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none placeholder:text-neutral-400"
            />
          </div>
          <div role="radiogroup" aria-label={t('Show', 'عرض')} className="inline-flex rounded-lg border border-neutral-300 bg-neutral-50 p-0.5">
            {([['all', t('All RFPs', 'جميع الطلبات')], ['project', t('This project', 'هذا المشروع')]] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={scope === v} onClick={() => setScope(v)}
                className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors ${scope === v ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div role="radiogroup" aria-label={t('RFPs', 'طلبات العروض')} className="flex-1 overflow-y-auto px-6 py-3 space-y-2 bg-neutral-50">
          {list.length === 0 && (
            <p className="py-10 text-center text-[13px] text-neutral-400">{t('No RFPs match your search.', 'لا توجد طلبات مطابقة.')}</p>
          )}
          {list.map((r) => {
            const isSel = r.id === selected;
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={isSel}
                onClick={() => setSelected(r.id)}
                onDoubleClick={() => onImport(r)}
                className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${isSel ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
              >
                <span className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSel ? 'border-brand-600 bg-brand-600' : 'border-neutral-400 bg-white'}`}>
                  {isSel && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-neutral-900">{isAr ? r.titleAr : r.title}</span>
                    {r.projectId === projectId && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-100 text-brand-700">{t('This project', 'هذا المشروع')}</span>
                    )}
                  </span>
                  <span className="block mt-0.5 text-[12px] text-neutral-500">
                    <span dir="ltr">{r.code}</span> · {t('Created', 'أُنشئ')} {formatRfpDate(r.created, isAr)} · {r.department}
                  </span>
                </span>
                <span className="text-[12px] font-medium text-neutral-600 flex-shrink-0" dir="ltr">{r.value}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-neutral-100 bg-white">
          <p className="text-[12px] text-neutral-500 truncate">
            {chosen ? t(`Selected: ${chosen.code}`, `المحدد: ${chosen.code}`) : t(`${list.length} RFPs`, `${list.length} طلب`)}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-50">
              {t('Cancel', 'إلغاء')}
            </button>
            <button type="button" disabled={!chosen} onClick={() => chosen && onImport(chosen)}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {t('Import selected', 'استيراد المحدد')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
