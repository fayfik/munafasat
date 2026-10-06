import { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { ALL_COST_CENTERS, PROJECTS } from '../data/mockData';
import BrowseRfpsDialog from '../components/BrowseRfpsDialog';
import { rfpsForProject, buildRfpImport, formatRfpDate, IMPORTED_SECTIONS_EN, IMPORTED_SECTIONS_AR, type PastRfp } from '../lib/rfpLibrary';
import type { TenderFormData } from '../types/tender';
import { SectionCard, Textarea, Badge, AIButton } from '../components/ui';
import { CheckCircleIcon, CheckIcon, ArrowLeftIcon, SparklesIcon, ChevronDownIcon } from '../components/Icons';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiPurpose } from '../lib/aiTender';
import { classifyItem, BOQ_TYPE_META } from '../lib/triage';

export default function ProjectSetup() {
  const { formData, updateField, setImportedFromProject, rfpImport, setRfpImport } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const purposeAi = useAiAction();
  const purposeAiLoading = purposeAi.loading;
  const [showRfpDialog, setShowRfpDialog] = useState(false);
  const [rfpOpen, setRfpOpen] = useState(false);

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);
  const costCenter = ALL_COST_CENTERS.find((c) => c.id === formData.costCenterId);
  const similarRfps = selectedProject ? rfpsForProject(selectedProject.id).slice(0, 5) : [];

  // Items in this request = BOQ items seeded in Step 1 (project items + free-typed).
  const requestItems = formData.boqItems.map((b) => {
    const p = selectedProject?.items.find((i) => i.name === b.itemName);
    const boqType = classifyItem({ id: b.id, name: b.itemName, nameAr: p?.nameAr, type: p?.type }).boqType;
    return { id: b.id, name: b.itemName, nameAr: p?.nameAr ?? '', boqType };
  });

  function handleAIGeneratePurpose() {
    if (!selectedProject) return;
    const sample = () => {
      const generated = isAr
        ? `الغرض من هذه المنافسة هو ${selectedProject.nameAr} بهدف تعزيز كفاءة العمليات وتحقيق أهداف التحول الرقمي وفق أعلى معايير الجودة والامتثال للأنظمة ذات الصلة.`
        : `The purpose of this tender is to procure ${selectedProject.name} services to enhance operational efficiency, support digital transformation objectives, and ensure compliance with applicable regulatory standards.`;
      updateField('tenderingPurpose', generated);
    };
    purposeAi.run(() => aiPurpose(formData, isAr), (text) => updateField('tenderingPurpose', text), sample);
  }

  function handleImport(rfp: PastRfp) {
    const patch = buildRfpImport(rfp, formData);
    const previous: Partial<TenderFormData> = {};
    (Object.keys(patch) as (keyof TenderFormData)[]).forEach((k) => { (previous as Record<string, unknown>)[k] = formData[k]; });
    (Object.entries(patch) as [keyof TenderFormData, TenderFormData[keyof TenderFormData]][]).forEach(([k, v]) => updateField(k, v));
    setImportedFromProject(isAr ? rfp.titleAr : rfp.title);
    setRfpImport({ rfpId: rfp.id, code: rfp.code, previous });
    setShowRfpDialog(false);
  }

  function undoImport() {
    if (!rfpImport) return;
    (Object.entries(rfpImport.previous) as [keyof TenderFormData, TenderFormData[keyof TenderFormData]][]).forEach(([k, v]) => updateField(k, v));
    setImportedFromProject(null);
    setRfpImport(null);
  }

  const routeLabel = formData.sourceType === 'souq-etimad' ? t('Etimad eSouq', 'السوق الإلكتروني') : t('Competitive Tender', 'منافسة');

  return (
    <div className="space-y-5">
      {/* Procurement route — determined in Step 1 */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t('Procurement route', 'مسار الشراء')}</p>
          <p className="text-[15px] font-semibold text-neutral-900 mt-0.5">{routeLabel}</p>
          <p className="text-[12px] text-neutral-500 mt-0.5">{t('Determined in the Procurement Route step.', 'محدد في خطوة مسار الشراء.')}</p>
        </div>
        <Badge variant="warning">{t('Auto-determined', 'محدد تلقائياً')}</Badge>
      </div>

      {/* Project Details — view mode (project & items chosen in Step 1) */}
      <SectionCard
        title="Project Details"
        titleAr="تفاصيل المشروع"
        description="Project and items were set in the Procurement Route step."
        descriptionAr="تم تحديد المشروع والبنود في خطوة مسار الشراء."
      >
        <div className="space-y-5">
          {selectedProject ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <View label={t('Cost Center', 'مركز التكلفة')} value={costCenter ? `${isAr ? costCenter.nameAr : costCenter.name} · ${costCenter.code}` : '—'} />
              <View label={t('Project Code', 'رمز المشروع')} value={selectedProject.code} />
              <View label={t('Project Name (English)', 'اسم المشروع (بالإنجليزية)')} value={selectedProject.name} />
              <View label={t('Project Name (Arabic)', 'اسم المشروع (بالعربية)')} value={selectedProject.nameAr} rtl />
            </div>
          ) : (
            <p className="text-[13px] text-neutral-500">{t('No budgeted project linked — items were identified directly.', 'لا يوجد مشروع مرتبط — تم تحديد البنود مباشرة.')}</p>
          )}

          <div>
            <p className="text-[13px] font-medium text-neutral-700 mb-2">{t('Items in this request', 'بنود هذا الطلب')}</p>
            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Item', 'البند')}</th>
                    <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Arabic Name', 'الاسم بالعربية')}</th>
                    <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('BOQ Type', 'نوع البند')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {requestItems.map((item) => {
                    const bt = BOQ_TYPE_META[item.boqType];
                    return (
                      <tr key={item.id} className="bg-white">
                        <td className="px-4 py-3 text-neutral-700 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-neutral-500 text-xs" dir="rtl">{item.nameAr || '—'}</td>
                        <td className="px-4 py-3"><Badge variant={bt.badge}>{isAr ? bt.ar : bt.en}</Badge></td>
                      </tr>
                    );
                  })}
                  {requestItems.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-4 text-neutral-500 text-[13px]">{t('No items in this request.', 'لا توجد بنود في هذا الطلب.')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Similar RFPs — subtle collapsible helper below the items */}
      {formData.sourceType === 'tendering' && selectedProject && similarRfps.length > 0 && (
        <div className="rounded-xl border border-ai-100 bg-ai-50/40 px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-ai-100 flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-4 h-4 text-ai-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-neutral-800">{t(`${similarRfps.length} similar RFPs found`, `تم العثور على ${similarRfps.length} طلبات عروض مماثلة`)}</p>
              <p className="text-[12px] text-neutral-600 mt-0.5">{t(`There are ${similarRfps.length} similar RFPs created in this project before — import their data to complete this request faster.`, `هناك ${similarRfps.length} طلبات عروض مماثلة أُنشئت في هذا المشروع سابقاً — استورد بياناتها لإكمال هذا الطلب بشكل أسرع.`)}</p>
            </div>
            <button type="button" onClick={() => setRfpOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-ai-700 hover:text-ai-800 flex-shrink-0">
              {rfpOpen ? t('View less', 'عرض أقل') : t('View more', 'عرض المزيد')}
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${rfpOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {rfpImport && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-success-100 bg-success-50 px-3 py-2.5" role="status">
              <CheckCircleIcon className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
              <p className="flex-1 text-[12px] text-success-700">
                {t(`Imported ${rfpImport.code}. ${IMPORTED_SECTIONS_EN.join(', ')} are now pre-filled. Review each section before submitting.`,
                   `تم استيراد ${rfpImport.code}. تمت تعبئة ${IMPORTED_SECTIONS_AR.join('، ')} مسبقاً. راجع كل قسم قبل التقديم.`)}
              </p>
              <button type="button" onClick={undoImport} className="text-[12px] font-semibold text-success-700 hover:underline flex-shrink-0">{t('Undo', 'تراجع')}</button>
            </div>
          )}

          {rfpOpen && (
            <div className="slide-up">
              <div className="mt-3 space-y-2">
                {similarRfps.map((r) => {
                  const isImported = rfpImport?.rfpId === r.id;
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-neutral-900 truncate">{isAr ? r.titleAr : r.title}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5"><span dir="ltr">{r.code}</span> · {t('Created', 'أُنشئ')} {formatRfpDate(r.created, isAr)}</p>
                      </div>
                      {isImported ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-success-700"><CheckIcon className="w-3.5 h-3.5" />{t('Imported', 'تم الاستيراد')}</span>
                      ) : (
                        <button type="button" onClick={() => handleImport(r)} className="px-3.5 py-1.5 rounded-lg border border-brand-600 bg-white text-[12px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors flex-shrink-0">{t('Import', 'استيراد')}</button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button type="button" onClick={() => setShowRfpDialog(true)} className="mt-2.5 inline-flex items-center gap-1.5 px-0.5 text-[12px] font-semibold text-link hover:underline underline-offset-2">
                {t('Browse all RFPs', 'تصفح جميع طلبات العروض')}<ArrowLeftIcon className="w-3.5 h-3.5 ltr:rotate-180" />
              </button>
            </div>
          )}
        </div>
      )}

      {formData.sourceType === 'tendering' && selectedProject && (
        <>
          <SectionCard
            title="Purpose of Tendering"
            titleAr="الغرض من المنافسة"
            action={<AIButton onClick={handleAIGeneratePurpose} loading={purposeAiLoading} label={t('Generate Purpose', 'توليد الغرض')} />}
          >
            <Textarea
              rows={3}
              value={formData.tenderingPurpose}
              onChange={(e) => updateField('tenderingPurpose', e.target.value)}
              placeholder={t('Describe the purpose of this tender…', 'صف الغرض من هذه المنافسة…')}
            />
            <AiNote error={purposeAi.error} usedSample={purposeAi.usedSample} />
          </SectionCard>

          {showRfpDialog && <BrowseRfpsDialog projectId={selectedProject.id} onClose={() => setShowRfpDialog(false)} onImport={handleImport} />}
        </>
      )}
    </div>
  );
}

function View({ label, value, rtl }: { label: string; value: string; rtl?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-neutral-500 mb-1">{label}</p>
      <p className="text-[14px] text-neutral-800" dir={rtl ? 'rtl' : undefined}>{value || '—'}</p>
    </div>
  );
}
