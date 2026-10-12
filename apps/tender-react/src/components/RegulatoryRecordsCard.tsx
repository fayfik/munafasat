import { useT } from '../context/LanguageContext';
import { SectionCard, InfoBanner } from './ui';

/** Regulatory records & licences required from vendors — auto-fetched from the project. */
export default function RegulatoryRecordsCard({ records }: { records: string }) {
  const t = useT();
  return (
      <SectionCard
        title="Regulatory Records & Licenses"
        titleAr="السجلات والتراخيص النظامية"
        description="Required certifications and registrations — auto-fetched from project configuration."
        descriptionAr="الشهادات والتسجيلات المطلوبة — مجلوبة تلقائياً من إعداد المشروع."
      >
        {records ? (
          <div className="flex flex-wrap gap-2">
            {records.split(',').map((record) => record.trim()).filter(Boolean).map((record, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
              >
                <svg className="w-3 h-3 text-neutral-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {record}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-neutral-400 italic">
            {t('Select a project to load regulatory requirements.', 'اختر مشروعاً لتحميل المتطلبات التنظيمية.')}
          </p>
        )}
        <InfoBanner variant="info" className="mt-4">
          {t(
            'Regulatory requirements are auto-fetched based on the selected project type. Vendors will be required to provide valid copies of all listed records with their proposals.',
            'يتم جلب المتطلبات التنظيمية تلقائياً بناءً على نوع المشروع المختار. سيُطلب من الموردين تقديم نسخ سارية من جميع السجلات المدرجة مع عروضهم.'
          )}
        </InfoBanner>
      </SectionCard>

  );
}
