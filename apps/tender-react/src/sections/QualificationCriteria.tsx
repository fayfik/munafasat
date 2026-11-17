import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { SectionCard, PeoplePicker, InfoBanner, AIButton, Input } from '../components/ui';
import { SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from '../components/Icons';
import { useAiAction, AiNote, num, str } from '../lib/useAiAction';
import { aiQualification, type AiQual } from '../lib/aiTender';
import ImportCriteriaDrawer, { type DrawerItem } from '../components/ImportCriteriaDrawer';
import { SIMILAR_PROJECTS, QUAL_LIBRARY, type LibQualMain } from '../lib/criteriaLibrary';
import { recommendedFor, recText, aboveRange, suggestedRange, natureOf, tierOf, TIER_LABEL, FIN_ITEMS, EMPTY_FIN, suggestFin, finTotal, type FinCriteria } from '../lib/qualGuide';

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
// Arabic ranges — used when the app language is Arabic.
const AI_QUAL_RANGES_AR: Record<string, AISuggestion> = {
  'qm-1': { percentage: 40, subRanges: { 'qs-1-1': { range: '7+ سنوات', percentage: 40 }, 'qs-1-2': { range: '5+ مشاريع', percentage: 35 }, 'qs-1-3': { range: '2+ مليون ريال', percentage: 25 } } },
  'qm-2': { percentage: 30, subRanges: { 'qs-2-1': { range: '2–8 مشاريع', percentage: 50 }, 'qs-2-2': { range: '3–15 مليون ريال', percentage: 50 } } },
  'qm-3': { percentage: 30, subRanges: { 'qs-3-1': { range: '100+ موظف', percentage: 50 }, 'qs-3-2': { range: '35%+', percentage: 50 } } },
};

export default function QualificationCriteria() {
  const { formData, updateField, updateQualMain, updateQualSub, setQualificationCommitteeMembers, qualPctTotal, goToSection } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const qualAi = useAiAction();
  const aiLoading = qualAi.loading;
  const [showQualImport, setShowQualImport] = useState(false);

  // Import qualification VALUES from similar past projects. The criteria are fixed across
  // the app, so importing never adds a criterion — it only fills range and weight for the
  // matching fixed main criterion and its fixed sub-criteria.
  const qualItemsFor = (pid: string): DrawerItem[] => (QUAL_LIBRARY[pid] ?? []).map((m) => ({
    key: m.id, title: m.name, titleAr: m.nameAr,
    sub: m.subCriteria.map((s) => `${s.name}: ${s.range} (${s.percentage}%)`).join(' · '),
    subAr: m.subCriteria.map((s) => `${s.nameAr}: ${s.range} (${s.percentage}%)`).join(' · '),
    badge: `${m.percentage}%`, addedBy: m.addedBy, addedByAr: m.addedByAr, addedOn: m.addedOn,
  }));
  const allLibQual: LibQualMain[] = Object.values(QUAL_LIBRARY).flat();
  function importQual(keys: string[]) {
    // One source per fixed criterion: if several projects were picked for the same criterion, the last one wins.
    const byFixed = new Map<string, LibQualMain>();
    keys.forEach((k) => { const m = allLibQual.find((x) => x.id === k); if (m) byFixed.set(m.fixedId, m); });
    if (!byFixed.size) return;
    const next = formData.qualificationCriteria.map((c) => {
      const src = byFixed.get(c.id);
      if (!src) return c;
      return {
        ...c,
        percentage: src.percentage,
        subCriteria: c.subCriteria.map((s) => {
          const v = src.subCriteria.find((x) => x.id === s.id);
          return v ? { ...s, range: v.range, percentage: v.percentage } : s;
        }),
      };
    });
    updateField('qualificationCriteria', next);
  }

  function handleAISuggest() {
    const applySample = () => {
      const ranges = isAr ? AI_QUAL_RANGES_AR : AI_QUAL_RANGES;
      formData.qualificationCriteria.forEach((m) => {
        const aiM = ranges[m.id as keyof typeof ranges];
        if (aiM) {
          updateQualMain(m.id, { percentage: aiM.percentage });
          m.subCriteria.forEach((s) => {
            const aiS = aiM.subRanges[s.id as keyof typeof aiM.subRanges];
            // Ranges come from the recommended band for this project's size and nature, so suggestions never exclude SMEs.
            if (aiS) updateQualSub(m.id, s.id, { range: suggestedRange(s.id, formData, isAr) ?? aiS.range, percentage: aiS.percentage });
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

  const flags = aboveRange(formData);
  const flagged = new Map(flags.map((f) => [f.subId, f]));
  const unjustified = flags.filter((f) => !f.justified).length;
  const nature = natureOf(formData);
  const tier = tierOf(formData);
  const fin: FinCriteria = (formData.finCriteria as FinCriteria) ?? EMPTY_FIN;
  const finSug = suggestFin(formData.projectPriority, nature.delivery);
  const setFin = (k: keyof FinCriteria, patch: Partial<FinCriteria['liquidity']>) => {
    const other = k === 'liquidity' ? 'cash' : 'liquidity';
    const next = { ...fin, [k]: { ...fin[k], ...patch } } as FinCriteria;
    // Two weights always total 100: editing one moves the other.
    if (patch.weight !== undefined && patch.weight !== '') next[other] = { ...fin[other], weight: Math.max(0, 100 - Number(patch.weight)) };
    updateField('finCriteria', next);
  };
  const fTotal = finTotal(fin);
  const setJust = (id: string, v: string) => updateField('qualJustifications', { ...(formData.qualJustifications ?? {}), [id]: v });
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
        title="Qualification Member"
        titleAr="عضو التأهيل"
        description="Select the members responsible for reviewing qualification criteria."
        descriptionAr="اختر الأعضاء المسؤولين عن مراجعة معايير التأهيل."
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
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowQualImport(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 text-[12px] font-semibold hover:bg-brand-100 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><path d="M17 14v6M14 17h6" /></svg>
              {t('Import from similar projects', 'استيراد من مشاريع مماثلة')}
            </button>
            <AIButton onClick={handleAISuggest} loading={aiLoading} label={t('AI Suggest Values', 'اقتراح القيم')} />
          </div>
        }
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
        <div className="flex items-center gap-2 flex-wrap mt-1" data-qual-basis>
          {flags.length === 0
            ? <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 border border-success-200 px-2.5 py-1 text-[12px] font-semibold text-success-700 fade-in" data-sme="open"><CheckCircleIcon className="w-3.5 h-3.5" />{t('Open to SMEs', 'متاح للمنشآت الصغيرة والمتوسطة')}</span>
            : <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 border border-warning-200 px-2.5 py-1 text-[12px] font-semibold text-warning-700 fade-in" data-sme="restricted"><AlertTriangleIcon className="w-3.5 h-3.5" />{t(`May exclude SMEs — ${flags.length} above range`, `قد يستبعد المنشآت الصغيرة — ${flags.length} فوق النطاق`)}</span>}
          {tier
            ? <span className="text-[12px] text-neutral-500">{t('Recommended ranges for', 'النطاقات الموصى بها لـ')} <span className="font-semibold text-neutral-700">{isAr ? TIER_LABEL[tier][1] : TIER_LABEL[tier][0]}</span></span>
            : <span className="text-[12px] text-warning-700" data-qual-no-priority>{t('Set the project priority to see recommended ranges.', 'حدد أولوية المشروع لعرض النطاقات الموصى بها.')} <button type="button" className="font-semibold underline underline-offset-2" onClick={() => goToSection(1)}>{t('Go to Project Setup', 'الانتقال إلى إعداد المشروع')}</button></span>}
        </div>
        <div className="rounded-xl border border-neutral-200 overflow-x-auto mt-3" id="q-qualification">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 min-w-[220px]">{t('Criteria', 'المعايير')}</th>
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 min-w-[140px]">{t('Range', 'النطاق')}</th>
                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 min-w-[130px]">{t('Recommended', 'الموصى به')}</th>
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
                      <td />
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
                    {main.subCriteria.map((sub) => { const rec = recommendedFor(sub.id, formData); const fl = flagged.get(sub.id); return (
                      <React.Fragment key={sub.id}>
                      <tr className={`transition-colors border-b border-neutral-100 last:border-b-0 ${fl ? 'bg-warning-50/40' : 'bg-white hover:bg-neutral-50/30'}`} data-qual-sub={sub.id} data-above={fl ? 'true' : undefined}>
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
                            placeholder={(() => { const sg = suggestedRange(sub.id, formData, isAr); if (sg) return t(`e.g. ${sg}`, `مثال: ${sg}`); const p = RANGE_PLACEHOLDERS[sub.id]; return p ? t(p[0], p[1]) : t('e.g. specify range…', 'مثال: حدد النطاق…'); })()}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-[12px] whitespace-nowrap" data-qual-rec>
                          {rec ? <span className={fl ? 'text-warning-700 font-semibold' : 'text-neutral-500'}>{recText(rec, isAr)}{fl && <> · {t('above', 'أعلى')}</>}</span> : <span className="text-neutral-300">—</span>}
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
                      {fl && (
                        <tr className="bg-warning-50/40 border-b border-warning-100 fade-in" data-qual-justify={sub.id}>
                          <td colSpan={4} className="px-4 pb-3 ps-12">
                            <label className="block text-[11.5px] font-semibold text-warning-800 mb-1">{t('Why is a higher threshold needed?', 'لماذا يلزم حد أعلى؟')} <span className="text-error-600">*</span></label>
                            <input type="text" value={formData.qualJustifications?.[sub.id] ?? ''} onChange={(e) => setJust(sub.id, e.target.value)}
                              placeholder={t('One line, e.g. “Core banking migration — needs proven scale”', 'سطر واحد، مثال: “ترحيل النظام المصرفي — يتطلب خبرة مثبتة”')}
                              className={`w-full text-xs rounded-lg border px-3 py-2 bg-white focus:outline-none focus:border-brand-400 ${fl.justified ? 'border-neutral-200' : 'border-warning-300'}`} />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ); })}
                    {/* Sub total row */}
                    <tr className={`border-b-2 border-neutral-200 ${subOk ? 'bg-success-50/40' : 'bg-warning-50/40'}`}>
                      <td className="px-4 py-1.5 ps-8 text-xs text-neutral-400 italic">{t('Sub-criteria total', 'إجمالي المعايير الفرعية')}</td>
                      <td /><td />
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

        {unjustified > 0 && (
          <InfoBanner variant="warning" className="mt-4">
            {t(`${unjustified} criterion${unjustified === 1 ? ' is' : 'a are'} above the recommended range without a justification. Add one line each, or lower the threshold so SMEs can compete.`,
              `${unjustified} من المعايير أعلى من النطاق الموصى به دون مبرر. أضف سطراً لكل منها أو خفّض الحد ليتمكن المنشآت الصغيرة والمتوسطة من المنافسة.`)}
          </InfoBanner>
        )}
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

        <div className="mt-5 pt-5 border-t border-neutral-100" id="q-qualPassing">
          {/* Passing percentage — same pattern as the Technical evaluation step */}
          <div className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <label htmlFor="qualification-passing-pct" className="text-[13.5px] font-bold text-neutral-900">
                {t('Qualification Passing Percentage', 'نسبة اجتياز التأهيل')} <span className="text-error-600">*</span>
              </label>
              <p className="text-[12px] text-neutral-500 mt-0.5 leading-relaxed">
                {t('Minimum score out of 100% a vendor must achieve to qualify. Default 60%.', 'الحد الأدنى للدرجة من 100% التي يجب على المورد تحقيقها ليتأهل. الافتراضي 60%.')}
              </p>
            </div>
            <div className="relative w-28 flex-shrink-0">
              <Input id="qualification-passing-pct" type="number" min={0} max={100}
                value={formData.qualificationPassingPercentage ?? ''}
                onChange={(e) => updateField('qualificationPassingPercentage', e.target.value)}
                placeholder="60" className="text-end pe-7 text-base font-bold" />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pointer-events-none">%</span>
            </div>
          </div>
          {Number(formData.qualificationPassingPercentage) > 100 && (
            <p className="text-xs text-error-600 mt-1.5">{t('Cannot exceed 100%', 'لا يمكن أن يتجاوز 100%')}</p>
          )}
        </div>

        <InfoBanner variant="info" className="mt-4">
          {t(
            'Sub-criteria percentages within each main category must independently total 100%. Main categories must also total 100%.',
            'يجب أن تبلغ نسب المعايير الفرعية ضمن كل فئة رئيسية 100% بشكل مستقل. كما يجب أن تبلغ الفئات الرئيسية 100% أيضاً.'
          )}
        </InfoBanner>
      </SectionCard>

      {/* Financial criteria — two fixed ratios from the Finance qualification committee */}
      <SectionCard title="Financial Criteria" titleAr="المعايير المالية"
        action={<AIButton onClick={() => updateField('finCriteria', finSug)} loading={false} label={t('Suggest values', 'اقتراح القيم')} />}>
        <div className="rounded-xl border border-neutral-200 overflow-x-auto" id="q-finCriteria" data-fin-criteria-form>
          <table className="w-full text-sm min-w-[520px]">
            <thead><tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500 min-w-[220px]">{t('Criteria', 'المعايير')}</th>
              <th className="text-end px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Minimum', 'الحد الأدنى')}</th>
              <th className="text-end px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Target', 'المستهدف')}</th>
              <th className="text-end px-4 py-2.5 text-xs font-medium text-neutral-500 w-28">{t('Weight (%)', 'الوزن (%)')}</th>
            </tr></thead>
            <tbody>
              {FIN_ITEMS.map((it) => (
                <tr key={it.k} className="border-b border-neutral-100 last:border-b-0" data-fin-row={it.k}>
                  <td className="px-4 py-2.5"><p className="text-[13px] font-semibold text-neutral-800">{isAr ? it.ar : it.en}</p><p className="text-[11px] text-neutral-400">{isAr ? it.fAr : it.fEn}</p></td>
                  {(['min', 'max'] as const).map((f) => (
                    <td key={f} className="px-4 py-2.5 text-end"><input type="number" step="0.1" min={0} value={fin[it.k][f]} data-fin={f}
                      placeholder={finSug[it.k][f]} onChange={(e) => setFin(it.k, { [f]: e.target.value })}
                      className="w-20 text-xs text-end border border-neutral-200 rounded px-2 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-white text-neutral-700 tabular-nums placeholder-neutral-300" /></td>
                  ))}
                  <td className="px-4 py-2.5"><div className="flex items-center justify-end gap-1">
                    <input type="number" min={0} max={100} value={fin[it.k].weight} data-fin="weight" onChange={(e) => setFin(it.k, { weight: e.target.value === '' ? '' : Math.min(100, Number(e.target.value)) })}
                      className="w-16 text-xs text-end border border-neutral-300 rounded px-2 py-1 focus:border-brand-400 focus:ring-0 focus:bg-brand-50 bg-white text-neutral-800 font-semibold tabular-nums" />
                    <span className="text-xs text-neutral-500">%</span></div></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className={`border-t border-neutral-200 ${fTotal === 100 ? 'bg-success-50/40' : 'bg-warning-50/40'}`}>
              <td colSpan={3} className="px-4 py-1.5 text-end text-xs text-neutral-500 italic">{t('Total weight', 'إجمالي الأوزان')}</td>
              <td className={`px-4 py-1.5 text-end text-xs font-semibold tabular-nums ${fTotal === 100 ? 'text-success-600' : 'text-warning-600'}`} data-fin-total>{fTotal}%</td>
            </tr></tfoot>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-neutral-500">{t('Ratios from the vendor’s latest audited financial statements. Finance reviews these after approval.', 'النسب من أحدث قوائم مالية مدققة للمورد. تراجعها المالية بعد الاعتماد.')}</p>
      </SectionCard>

      <ImportCriteriaDrawer
        open={showQualImport}
        onClose={() => setShowQualImport(false)}
        title="Import qualification values"
        titleAr="استيراد قيم معايير التأهيل"
        projects={SIMILAR_PROJECTS}
        itemsFor={qualItemsFor}
        onImport={importQual}
        isAr={isAr}
        t={t}
      />
    </div>
  );
}
