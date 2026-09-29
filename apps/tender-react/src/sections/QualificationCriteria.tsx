import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { SectionCard, PeoplePicker, InfoBanner, AIButton } from '../components/ui';
import { SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from '../components/Icons';
import { useAiAction, AiNote, num, str } from '../lib/useAiAction';
import { aiQualification, type AiQual } from '../lib/aiTender';

const RANGE_PLACEHOLDERS: Record<string, [string, string]> = {
  'qs-1-1': ['e.g. 5–15 years', 'مثال: 5–15 سنة'],
  'qs-1-2': ['e.g. 3–10 similar projects', 'مثال: 3–10 مشاريع مماثلة'],
  'qs-1-3': ['e.g. SAR 1M–10M', 'مثال: 1–10 مليون ريال'],
  'qs-2-1': ['e.g. 2–8 active projects', 'مثال: 2–8 مشاريع نشطة'],
  'qs-2-2': ['e.g. SAR 3M–15M', 'مثال: 3–15 مليون ريال'],
  'qs-3-1': ['e.g. 50–500 employees', 'مثال: 50–500 موظف'],
  'qs-3-2': ['e.g. 25%–60% Saudi nationals', 'مثال: 25%–60% سعوديين'],
};

type AISuggestion = { percentage: number; subRanges: Record<string, { range: string; percentage: number }> };
const AI_QUAL_RANGES: Record<string, AISuggestion> = {
  'qm-1': { percentage: 40, subRanges: { 'qs-1-1': { range: '7+ years', percentage: 40 }, 'qs-1-2': { range: '5+ projects', percentage: 35 }, 'qs-1-3': { range: 'SAR 2M+', percentage: 25 } } },
  'qm-2': { percentage: 30, subRanges: { 'qs-2-1': { range: '2–8 projects', percentage: 50 }, 'qs-2-2': { range: 'SAR 3M–15M', percentage: 50 } } },
  'qm-3': { percentage: 30, subRanges: { 'qs-3-1': { range: '100+ employees', percentage: 50 }, 'qs-3-2': { range: '35%+', percentage: 50 } } },
};

export default function QualificationCriteria() {
  const { formData, updateQualMain, updateQualSub, setQualificationCommitteeMembers, qualPctTotal } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const qualAi = useAiAction();
  const aiLoading = qualAi.loading;

  function handleAISuggest() {
    const applySample = () => {
      formData.qualificationCriteria.forEach((m) => {
        const aiM = AI_QUAL_RANGES[m.id as keyof typeof AI_QUAL_RANGES];
        if (aiM) {
          updateQualMain(m.id, { percentage: aiM.percentage });
          m.subCriteria.forEach((s) => {
            const aiS = aiM.subRanges[s.id as keyof typeof aiM.subRanges];
            if (aiS) updateQualSub(m.id, s.id, { range: aiS.range, percentage: aiS.percentage });
          });
        }
      });
    };
    const applyAi = (r: AiQual) => {
      formData.qualificationCriteria.forEach((m) => {
        const aiM = r?.[m.id];
        if (!aiM) return;
        updateQualMain(m.id, { percentage: num(aiM.percentage) });
        m.subCriteria.forEach((s) => {
          const aiS = aiM.sub?.[s.id];
          if (aiS) updateQualSub(m.id, s.id, { range: str(aiS.range), percentage: num(aiS.percentage) });
        });
      });
    };
    qualAi.run(() => aiQualification(formData, isAr), applyAi, applySample);
  }

  const mainPctOk = qualPctTotal === 100;
  const mainPctOver = qualPctTotal > 100;

  function getSubPctTotal(mainId: string) {
    const m = formData.qualificationCriteria.find((c) => c.id === mainId);
    if (!m) return 0;
    return m.subCriteria.reduce((s, c) => s + (typeof c.percentage === 'number' ? c.percentage : 0), 0);
  }

  return (
    <div className="space-y-5">
      {/* Committee */}
      <SectionCard
        title="Qualification Committee"
        titleAr="لجنة التأهيل"
        description="Select the committee members responsible for reviewing qualification criteria."
        descriptionAr="اختر أعضاء اللجنة المسؤولين عن مراجعة معايير التأهيل."
      >
        <PeoplePicker
          value={formData.qualificationCommitteeMembers}
          onChange={setQualificationCommitteeMembers}
          placeholder={t('Search by name, role, or department…', 'ابحث بالاسم أو الدور أو القسم…')}
        />
      </SectionCard>

      {/* Qualification Criteria Table */}
      <SectionCard
        title="Qualification Criteria"
        titleAr="معايير التأهيل"
        description="Define minimum qualification thresholds. Main criteria percentages must total 100%, as must each sub-criteria group."
        descriptionAr="حدد الحدود الدنيا للتأهيل. يجب أن تكون مجموع نسب المعايير الرئيسية 100%، وكذلك كل مجموعة معايير فرعية."
        action={<AIButton onClick={handleAISuggest} loading={aiLoading} label={t('AI Suggest Values', 'اقتراح القيم')} />}
      >
        {aiLoading && (
          <div className="mb-4 rounded-lg border border-ai-200 bg-ai-50 p-4 ai-loading">
            <div className="flex items-center gap-2 text-ai-600 text-sm">
              <SparklesIcon className="w-4 h-4 spin-slow" />
              {t('Analyzing project profile and suggesting qualification ranges and percentages…', 'جاري تحليل ملف المشروع واقتراح نطاقات ونسب التأهيل…')}
            </div>
          </div>
        )}

        <AiNote error={qualAi.error} usedSample={qualAi.usedSample} />
        <div className="rounded-xl border border-neutral-200 overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 min-w-[220px]">{t('Criteria', 'المعايير')}</th>
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 min-w-[140px]">{t('Range', 'النطاق')}</th>
                <th className="text-end px-4 py-2.5 text-xs font-medium text-neutral-500 w-28">{t('Weight (%)', 'الوزن (%)')}</th>
              </tr>
            </thead>
            <tbody>
              {formData.qualificationCriteria.map((main) => {
                const subTotal = getSubPctTotal(main.id);
                const subOk = subTotal === 100;
                return (
                  <React.Fragment key={main.id}>
                    {/* Main row */}
                    <tr className="bg-neutral-50 border-t border-b border-neutral-200">
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">{isAr ? main.nameAr : main.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-neutral-400 italic">{t('Main category', 'فئة رئيسية')}</td>
                      <td className="px-4 py-2.5">
                        <div className="relative flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={main.percentage}
                            onChange={(e) => updateQualMain(main.id, { percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                            className="w-16 text-xs text-end border border-neutral-300 rounded px-2 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-white text-neutral-800 font-semibold tabular-nums"
                          />
                          <span className="text-xs text-neutral-500">%</span>
                        </div>
                      </td>
                    </tr>
                    {/* Sub rows */}
                    {main.subCriteria.map((sub) => (
                      <tr key={sub.id} className="bg-white hover:bg-neutral-50/30 transition-colors border-b border-neutral-100 last:border-b-0">
                        <td className="px-4 py-2.5 ps-8">
                          <div className="flex items-start gap-2">
                            <span className="text-neutral-300 mt-0.5">└</span>
                            <div>
                              <p className="text-xs text-neutral-700">{isAr ? sub.nameAr : sub.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={sub.range}
                            onChange={(e) => updateQualSub(main.id, sub.id, { range: e.target.value })}
                            className="w-full text-xs border border-transparent rounded px-2 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-transparent text-neutral-600 placeholder-neutral-300 transition-colors"
                            placeholder={(() => { const p = RANGE_PLACEHOLDERS[sub.id]; return p ? t(p[0], p[1]) : t('e.g. specify range…', 'مثال: حدد النطاق…'); })()}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="relative flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={sub.percentage}
                              onChange={(e) => updateQualSub(main.id, sub.id, { percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                              className="w-16 text-xs text-end border border-neutral-200 rounded px-2 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-white text-neutral-700 tabular-nums"
                            />
                            <span className="text-xs text-neutral-500">%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Sub total row */}
                    <tr className={`border-b-2 border-neutral-200 ${subOk ? 'bg-success-50/40' : 'bg-warning-50/40'}`}>
                      <td className="px-4 py-1.5 ps-8 text-xs text-neutral-400 italic">{t('Sub-criteria total', 'إجمالي المعايير الفرعية')}</td>
                      <td />
                      <td className={`px-4 py-1.5 text-end text-xs font-semibold tabular-nums ${subOk ? 'text-success-600' : 'text-warning-600'}`}>
                        {subTotal}% {!subOk && '⚠'}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Main % total indicator */}
        <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 mt-4 text-sm border ${
          mainPctOk ? 'bg-success-50 border-success-200 text-success-700' : mainPctOver ? 'bg-error-50 border-error-200 text-error-700' : 'bg-warning-50 border-warning-200 text-warning-700'
        }`}>
          <div className="flex items-center gap-2">
            {mainPctOk ? <CheckCircleIcon className="w-4 h-4" /> : <AlertTriangleIcon className="w-4 h-4" />}
            <span className="font-medium">{t('Main Criteria Total', 'إجمالي المعايير الرئيسية')}: {qualPctTotal}%</span>
            {!mainPctOk && <span>— {t('must equal 100%', 'يجب أن يكون 100%')}</span>}
          </div>
          <div className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${mainPctOk ? 'bg-success-500' : mainPctOver ? 'bg-error-500' : 'bg-warning-500'}`} style={{ width: `${Math.min(qualPctTotal, 100)}%` }} />
          </div>
        </div>

        <InfoBanner variant="info" className="mt-4">
          {t(
            'Sub-criteria percentages within each main category must independently total 100%. Main categories must also total 100%.',
            'يجب أن تبلغ نسب المعايير الفرعية ضمن كل فئة رئيسية 100% بشكل مستقل. كما يجب أن تبلغ الفئات الرئيسية 100% أيضاً.'
          )}
        </InfoBanner>
      </SectionCard>
    </div>
  );
}
