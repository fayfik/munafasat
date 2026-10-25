import { useState } from 'react';
import { useT, useLanguage } from '../context/LanguageContext';
import { SectionCard } from './ui';
import { DocumentIcon, TrashIcon, PlusIcon } from './Icons';

function LockGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

/**
 * Mandatory & Regulatory records — shown on Review & Confirm.
 * Default records come from the project configuration and are auto-selected and
 * locked (can't be removed). The requester can add their own custom records,
 * which are removable. Presented as a clear required-records list (mirrors the
 * Technical Documents List), not selectable-looking chips.
 */
export default function RegulatoryRecordsCard({ records, extra, onChange }: {
  records: string;                 // comma-separated defaults from project config
  extra: string[];                 // user-added custom records
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const { isAr } = useLanguage();
  const [draft, setDraft] = useState('');

  const defaults = records.split(',').map((r) => r.trim()).filter(Boolean);
  const defaultsLower = new Set(defaults.map((d) => d.toLowerCase()));

  function add() {
    const v = draft.trim();
    if (!v) return;
    const lv = v.toLowerCase();
    if (defaultsLower.has(lv) || extra.some((e) => e.toLowerCase() === lv)) { setDraft(''); return; }
    onChange([...extra, v]);
    setDraft('');
  }
  function remove(rec: string) {
    onChange(extra.filter((e) => e !== rec));
  }

  const hasAny = defaults.length > 0 || extra.length > 0;

  return (
    <SectionCard
      title="Mandatory & Regulatory Records"
      titleAr="السجلات الإلزامية والنظامية"
      description="Auto-selected from the project. Add any extra records your request requires — default records can't be removed."
      descriptionAr="محددة تلقائياً من المشروع. أضف أي سجلات إضافية يتطلبها طلبك — لا يمكن حذف السجلات الافتراضية."
    >
      <div className="space-y-3">
        <p className="text-[12px] text-neutral-500">
          {t('Vendors must provide valid copies of all records listed below with their proposals. Default records are locked; add any extra ones your request requires.',
             'يجب على الموردين تقديم نسخ سارية من جميع السجلات المدرجة أدناه مع عروضهم. السجلات الافتراضية مقفلة؛ أضف ما يتطلبه طلبك من سجلات إضافية.')}
        </p>

        {hasAny ? (
          <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
            {defaults.map((record, i) => (
              <div key={`d-${i}`} className="flex items-center gap-3 px-3.5 py-2.5 bg-neutral-50/40">
                <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                  <DocumentIcon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0 text-[13px] text-neutral-800">{record}</span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-full px-2 py-0.5 flex-shrink-0">
                  <LockGlyph className="w-2.5 h-2.5 text-neutral-400" />
                  {t('Mandatory', 'إلزامي')}
                </span>
              </div>
            ))}
            {extra.map((record, i) => (
              <div key={`e-${i}`} className="flex items-center gap-3 px-3.5 py-2.5 bg-white group">
                <span className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0">
                  <DocumentIcon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0 text-[13px] text-neutral-800">{record}</span>
                <button
                  type="button"
                  onClick={() => remove(record)}
                  className="text-neutral-300 hover:text-error-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  aria-label={t('Remove record', 'إزالة السجل')}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-neutral-400 italic">
            {t('Select a project to load regulatory requirements.', 'اختر مشروعاً لتحميل المتطلبات التنظيمية.')}
          </p>
        )}

        {/* Add input */}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={t('Type a record or license and press Enter…', 'اكتب اسم السجل أو الترخيص واضغط Enter…')}
            dir={isAr ? 'rtl' : 'ltr'}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-body-md text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            {t('Add', 'إضافة')}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
