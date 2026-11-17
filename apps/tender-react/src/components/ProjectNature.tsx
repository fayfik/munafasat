import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { SectionCard } from './ui';
import { SparklesIcon } from './Icons';
import { AREA_OPTS, DELIVERY_OPTS, natureOf, boqValue, tierOf, TIER_LABEL } from '../lib/qualGuide';

/* Project nature — IT / non-IT and how it is delivered. Prefilled from the BOQ and Scope of Work;
   Finance and the qualification ranges read it. */
export default function ProjectNature() {
  const { formData, updateField } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const { area, delivery, suggested } = natureOf(formData);
  const tier = tierOf(boqValue(formData));
  const Chip = () => (
    <span className="inline-flex items-center gap-1 rounded-full bg-ai-50 border border-ai-200 px-2 py-0.5 text-[11px] font-semibold text-ai-700 fade-in" data-nature-suggested>
      <SparklesIcon className="w-3 h-3" />{t('Suggested from BOQ & Scope', 'مقترح من جدول الكميات والنطاق')}
    </span>
  );
  const pill = (on: boolean) => `h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${on ? 'bg-white text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-neutral-200/70' : 'text-neutral-600 hover:text-neutral-900'}`;
  return (
    <SectionCard title="Project nature" titleAr="طبيعة المشروع"
      description="Prefilled from your BOQ and Scope of Work — change it if it’s wrong. It sets the recommended qualification ranges."
      descriptionAr="مُعبأة من جدول الكميات ونطاق العمل — عدّلها إن لم تكن صحيحة. تحدد النطاقات الموصى بها لمعايير التأهيل.">
      <div className="grid gap-5 sm:grid-cols-[auto_1fr]" id="q-nature" data-project-nature>
        <div>
          <div className="flex items-center gap-2 mb-2"><p className="text-[12px] font-semibold text-neutral-600">{t('Area', 'المجال')} <span className="text-error-600">*</span></p>{!formData.projectArea && suggested.area && <Chip />}</div>
          <div className="inline-flex gap-0.5 p-1 rounded-full bg-neutral-100" role="radiogroup" data-nature-area={area ?? ''}>
            {AREA_OPTS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={area === o.id} className={pill(area === o.id)} onClick={() => updateField('projectArea', o.id)}>{isAr ? o.ar : o.en}</button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2"><p className="text-[12px] font-semibold text-neutral-600">{t('Delivery type', 'نوع التوريد')} <span className="text-error-600">*</span></p>{!formData.deliveryType && suggested.delivery && <Chip />}</div>
          <div className="inline-flex flex-wrap gap-0.5 p-1 rounded-[20px] bg-neutral-100" role="radiogroup" data-nature-delivery={delivery ?? ''}>
            {DELIVERY_OPTS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={delivery === o.id} title={isAr ? o.hintAr : o.hintEn} className={pill(delivery === o.id)} onClick={() => updateField('deliveryType', o.id)}>{isAr ? o.ar : o.en}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-neutral-500">{t('Project size from BOQ', 'حجم المشروع من جدول الكميات')}: <span className="font-semibold text-neutral-700">{isAr ? TIER_LABEL[tier][1] : TIER_LABEL[tier][0]}</span></p>
    </SectionCard>
  );
}
