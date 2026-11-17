import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { SectionCard } from './ui';
import { SparklesIcon } from './Icons';
import { AREA_OPTS, DELIVERY_OPTS, PRIORITY_LEVELS, natureOf } from '../lib/qualGuide';

const pill = (on: boolean) => `h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${on ? 'bg-white text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-neutral-200/70' : 'text-neutral-600 hover:text-neutral-900'}`;
const DOT: Record<string, string> = { low: 'bg-neutral-400', medium: 'bg-[#2A6193]', high: 'bg-warning-500', critical: 'bg-error-600' };

/* Project Setup — the requester sets the project priority; it sets the recommended qualification ranges. */
export function ProjectPriorityCard() {
  const { formData, updateField } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const v = formData.projectPriority || undefined;
  const hint = PRIORITY_LEVELS.find((o) => o.id === v);
  return (
    <SectionCard title="Project priority" titleAr="أولوية المشروع">
      <div id="q-priority" data-project-priority-field={v ?? ''}>
        <p className="text-[12px] font-semibold text-neutral-600 mb-2">{t('Priority', 'الأولوية')} <span className="text-error-600">*</span></p>
        <div className="inline-flex flex-wrap gap-0.5 p-1 rounded-[20px] bg-neutral-100" role="radiogroup">
          {PRIORITY_LEVELS.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={v === o.id} className={`${pill(v === o.id)} inline-flex items-center gap-2`} onClick={() => updateField('projectPriority', o.id)} data-opt={o.id}>
              <span className={`w-2 h-2 rounded-full ${DOT[o.id]}`} />{isAr ? o.ar : o.en}
            </button>
          ))}
        </div>
        {hint && <p className="mt-2 text-[12px] text-neutral-500 fade-in" data-priority-hint>{isAr ? hint.hintAr : hint.hintEn}</p>}
      </div>
    </SectionCard>
  );
}

/* Review & Confirm — project nature is auto-determined from the BOQ and Scope of Work; the requester can correct it here. */
export function ProjectNatureReview() {
  const { formData, updateField } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const { area, delivery, suggested } = natureOf(formData);
  const auto = !formData.projectArea && !formData.deliveryType && !!suggested.area;
  return (
    <div className="mt-4 pt-4 border-t border-neutral-100" id="q-nature" data-project-nature>
      <div className="flex items-center gap-2 mb-2.5">
        <p className="text-[11px] text-neutral-400">{t('Project nature', 'طبيعة المشروع')}</p>
        {auto && <span className="inline-flex items-center gap-1 rounded-full bg-ai-50 border border-ai-200 px-2 py-0.5 text-[10.5px] font-semibold text-ai-700 fade-in" data-nature-suggested><SparklesIcon className="w-3 h-3" />{t('Auto-detected', 'محددة تلقائياً')}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-0.5 p-1 rounded-full bg-neutral-100" role="radiogroup" data-nature-area={area ?? ''}>
          {AREA_OPTS.map((o) => <button key={o.id} type="button" role="radio" aria-checked={area === o.id} className={pill(area === o.id)} onClick={() => updateField('projectArea', o.id)}>{isAr ? o.ar : o.en}</button>)}
        </div>
        <div className="inline-flex flex-wrap gap-0.5 p-1 rounded-[20px] bg-neutral-100" role="radiogroup" data-nature-delivery={delivery ?? ''}>
          {DELIVERY_OPTS.map((o) => <button key={o.id} type="button" role="radio" aria-checked={delivery === o.id} title={isAr ? o.hintAr : o.hintEn} className={pill(delivery === o.id)} onClick={() => updateField('deliveryType', o.id)}>{isAr ? o.ar : o.en}</button>)}
        </div>
      </div>
    </div>
  );
}
