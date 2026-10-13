import { useState } from 'react';
import { useT } from '../context/LanguageContext';
import { SectionCard, Input, Button, InfoBanner } from './ui';

/**
 * Mandatory & Regulatory records — shown on Review & Confirm.
 * Default records come from the project configuration and are auto-selected and
 * locked (can't be removed). The requester can add their own custom records,
 * which are removable.
 */
export default function RegulatoryRecordsCard({ records, extra, onChange }: {
  records: string;                 // comma-separated defaults from project config
  extra: string[];                 // user-added custom records
  onChange: (next: string[]) => void;
}) {
  const t = useT();
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

  return (
    <SectionCard
      title="Mandatory & Regulatory Records"
      titleAr="السجلات الإلزامية والنظامية"
      description="Auto-selected from the project. Add any extra records your request requires — default records can't be removed."
      descriptionAr="محددة تلقائياً من المشروع. أضف أي سجلات إضافية يتطلبها طلبك — لا يمكن حذف السجلات الافتراضية."
    >
      {(defaults.length > 0 || extra.length > 0) ? (
        <div className="flex flex-wrap gap-2">
          {defaults.map((record, i) => (
            <span key={`d-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
              <svg className="w-3 h-3 text-neutral-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {record}
            </span>
          ))}
          {extra.map((record, i) => (
            <span key={`e-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-brand-50 text-brand-700 border border-brand-200">
              {record}
              <button type="button" onClick={() => remove(record)} className="text-brand-400 hover:text-error-500" aria-label={t('Remove', 'إزالة')}>×</button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-neutral-400 italic">
          {t('Select a project to load regulatory requirements.', 'اختر مشروعاً لتحميل المتطلبات التنظيمية.')}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 max-w-[460px]">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t('Add a record or license…', 'أضف سجلاً أو ترخيصاً…')}
          className="flex-1"
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={draft.trim().length === 0}>{t('Add', 'إضافة')}</Button>
      </div>

      <InfoBanner variant="info" className="mt-4">
        {t(
          'Regulatory requirements are auto-fetched based on the selected project type. Vendors will be required to provide valid copies of all listed records with their proposals.',
          'يتم جلب المتطلبات التنظيمية تلقائياً بناءً على نوع المشروع المختار. سيُطلب من الموردين تقديم نسخ سارية من جميع السجلات المدرجة مع عروضهم.'
        )}
      </InfoBanner>
    </SectionCard>
  );
}
