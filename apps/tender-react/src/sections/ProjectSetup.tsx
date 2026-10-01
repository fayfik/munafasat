import React, { useState } from 'react';
import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { COST_CENTERS, ALL_COST_CENTERS, PROJECTS } from '../data/mockData';
import CostCenterPicker from '../components/CostCenterPicker';
import BrowseRfpsDialog from '../components/BrowseRfpsDialog';
import { rfpsForProject, buildRfpImport, formatRfpDate, IMPORTED_SECTIONS_EN, IMPORTED_SECTIONS_AR, type PastRfp } from '../lib/rfpLibrary';
import type { TenderFormData } from '../types/tender';
import { FormField, SectionCard, Select, ReadOnlyField, Textarea, Badge, InfoBanner, AIButton } from '../components/ui';
import { CheckCircleIcon, CheckIcon, XIcon, WandIcon, ArrowLeftIcon } from '../components/Icons';
import type { ProjectItemType } from '../types/tender';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiPurpose } from '../lib/aiTender';

const TYPE_BADGE: Record<ProjectItemType, React.ReactElement> = {
  assets: <Badge variant="assets">Assets</Badge>,
  services: <Badge variant="services">Services</Badge>,
  consumables: <Badge variant="consumables">Consumables</Badge>,
};

export default function ProjectSetup() {
  const { formData, updateField, setImportedFromProject, rfpImport, setRfpImport } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const purposeAi = useAiAction();
  const purposeAiLoading = purposeAi.loading;
  const [showRfpDialog, setShowRfpDialog] = useState(false);

  const hasTwoRoles = true;
  const extraIds = formData.additionalCostCenterIds ?? [];
  // Projects from the default cost center and every additional one.
  const chosenCostCenterIds = [formData.costCenterId, ...extraIds].filter(Boolean);
  const availableProjects = PROJECTS.filter((p) => chosenCostCenterIds.includes(p.costCenterId));
  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);

  function handleCostCenterChange(id: string) {
    updateField('costCenterId', id);
    updateField('additionalCostCenterIds', extraIds.filter((x) => x !== id));
    const keep = selectedProject && (selectedProject.costCenterId === id || extraIds.includes(selectedProject.costCenterId));
    if (!keep) {
      updateField('projectId', '');
      updateField('selectedProjectItemIds', []);
      setRfpImport(null);
    }
  }

  const extraCostCenters = extraIds.map((id) => ALL_COST_CENTERS.find((cc) => cc.id === id)).filter((cc): cc is NonNullable<typeof cc> => !!cc);

  function addCostCenter(id: string) {
    if (!id || extraIds.includes(id) || id === formData.costCenterId) return;
    updateField('additionalCostCenterIds', [...extraIds, id]);
  }

  function removeCostCenter(id: string) {
    updateField('additionalCostCenterIds', extraIds.filter((x) => x !== id));
    // A project that belonged only to the removed cost center no longer applies.
    if (selectedProject && selectedProject.costCenterId === id) {
      updateField('projectId', '');
      updateField('selectedProjectItemIds', []);
      setRfpImport(null);
    }
  }
  const selectedItemIds = formData.selectedProjectItemIds ?? [];

  function toggleItem(id: string) {
    updateField('selectedProjectItemIds', selectedItemIds.includes(id) ? selectedItemIds.filter((x) => x !== id) : [...selectedItemIds, id]);
  }

  function toggleAllItems() {
    if (!selectedProject) return;
    const all = selectedProject.items.map((i) => i.id);
    updateField('selectedProjectItemIds', selectedItemIds.length === all.length ? [] : all);
  }

  function handleProjectChange(id: string) {
    updateField('projectId', id);
    updateField('selectedProjectItemIds', []);
    const proj = PROJECTS.find((p) => p.id === id);
    if (proj) updateField('tenderingPurpose', proj.purpose);
    setRfpImport(null);
  }

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

  // Import a past RFP: pre-fills the later sections; the previous values are kept for Undo.
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

  const similarRfps = selectedProject ? rfpsForProject(selectedProject.id).slice(0, 3) : [];

  return (
    <div className="space-y-5">
      {/* Source Type */}
      <SectionCard
        title="Request Type"
        titleAr="نوع الطلب"
        description="Select the procurement channel for this request."
        descriptionAr="اختر قناة المشتريات لهذا الطلب."
      >
        <FormField label="Procurement Channel" labelAr="قناة المشتريات" required>
          <div className="flex gap-3 mt-1">
            {([
              ['tendering', 'Tender', 'منافسة', t('For competitive tendering processes', 'لعمليات المنافسة التنافسية')],
              ['souq-etimad', 'Etimad Souq', 'سوق اعتماد', t('For marketplace purchases', 'للشراء من السوق الإلكتروني')],
            ] as const).map(([val, labelEn, labelAr, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => updateField('sourceType', val)}
                className={`flex-1 flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3.5 text-start transition-all ${
                  formData.sourceType === val
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.sourceType === val ? 'border-brand-600 bg-brand-600' : 'border-neutral-400'}`}>
                  {formData.sourceType === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-medium ${formData.sourceType === val ? 'text-brand-700' : 'text-neutral-700'}`}>
                  {isAr ? labelAr : labelEn}
                </span>
                <span className="text-xs text-neutral-400">{desc}</span>
              </button>
            ))}
          </div>
        </FormField>
      </SectionCard>

      {formData.sourceType === 'tendering' && (
        <>
          {/* Project Details */}
          <SectionCard
            title="Project Details"
            titleAr="تفاصيل المشروع"
            description="Select the cost center and project for this tender."
            descriptionAr="اختر مركز التكلفة والمشروع لهذه المنافسة."
          >
            <div className="space-y-4">
              <FormField
                label="Cost Center"
                labelAr="مركز التكلفة"
                required
                hint={hasTwoRoles ? t(
                  'You have access to multiple cost centers. Select the one this request should be raised under.',
                  'لديك صلاحية الوصول لعدة مراكز تكلفة. اختر المركز الذي سيُرفع الطلب تحته.'
                ) : undefined}
              >
                {hasTwoRoles ? (
                  <div className="mt-1 space-y-3">
                    <div className="flex gap-3">
                      {COST_CENTERS.map((cc) => (
                        <button
                          key={cc.id}
                          type="button"
                          role="radio"
                          aria-checked={formData.costCenterId === cc.id}
                          onClick={() => handleCostCenterChange(cc.id)}
                          className={`flex-1 rounded-xl border-2 px-4 py-3 text-start transition-all ${
                            formData.costCenterId === cc.id
                              ? 'border-brand-600 bg-brand-50'
                              : 'border-neutral-200 bg-white hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${formData.costCenterId === cc.id ? 'border-brand-600 bg-brand-600' : 'border-neutral-400'}`}>
                              {formData.costCenterId === cc.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${formData.costCenterId === cc.id ? 'text-brand-700' : 'text-neutral-700'}`}>
                                {isAr ? cc.nameAr : cc.name}
                              </p>
                              <p className="text-xs text-neutral-400">{cc.code}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Additional cost centers (besides the default above) show as removable pills */}
                    {extraCostCenters.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1.5">{t('Additional cost centers', 'مراكز تكلفة إضافية')}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {extraCostCenters.map((cc) => (
                            <span key={cc.id} className="inline-flex items-center gap-1.5 ps-3 pe-1 py-1 rounded-full border border-brand-300 bg-brand-50 text-[13px] font-medium text-brand-700">
                              {isAr ? cc.nameAr : cc.name}
                              <span className="text-[11px] font-normal text-brand-600/80" dir="ltr">{cc.code}</span>
                              <button
                                type="button"
                                onClick={() => removeCostCenter(cc.id)}
                                className="w-5 h-5 rounded-full inline-flex items-center justify-center text-brand-700 hover:bg-brand-100"
                                aria-label={t(`Remove ${cc.name}`, `إزالة ${cc.nameAr}`)}
                                title={t('Remove', 'إزالة')}
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <CostCenterPicker options={ALL_COST_CENTERS.filter((cc) => cc.id !== formData.costCenterId && !extraIds.includes(cc.id))} selectedId="" onSelect={addCostCenter} />
                  </div>
                ) : (
                  <ReadOnlyField value={isAr ? COST_CENTERS[0].nameAr : COST_CENTERS[0].name} />
                )}
              </FormField>

              {formData.costCenterId && (
                <>
                  <FormField
                    label="Project"
                    labelAr="المشروع"
                    required
                    hint={t('Select the budgeted project this tender relates to.', 'اختر المشروع المدرج في الميزانية الذي تتعلق به هذه المنافسة.')}
                  >
                    <Select value={formData.projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                      <option value="">{t('Select a project…', 'اختر مشروعاً…')}</option>
                      {availableProjects.map((p) => (
                        <option key={p.id} value={p.id}>{`${isAr ? p.nameAr : p.name} (${p.code})${chosenCostCenterIds.length > 1 ? ` · ${ALL_COST_CENTERS.find((c) => c.id === p.costCenterId)?.code ?? ''}` : ''}`}</option>
                      ))}
                    </Select>
                    {availableProjects.length === 0 && (
                      <p className="mt-1.5 text-xs text-warning-700">{t('No budgeted projects under the selected cost centers yet.', 'لا توجد مشاريع مدرجة في الميزانية تحت مراكز التكلفة المحددة بعد.')}</p>
                    )}
                  </FormField>

                  {selectedProject && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Project Name (English)" labelAr="اسم المشروع (بالإنجليزية)" readOnly>
                          <ReadOnlyField value={selectedProject.name} />
                        </FormField>
                        <FormField label="Project Name (Arabic)" labelAr="اسم المشروع (بالعربية)" readOnly>
                          <ReadOnlyField value={selectedProject.nameAr} />
                        </FormField>
                      </div>

                      {/* Project Items — choose which items this tender covers */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-neutral-700">
                            {t('Project Items', 'بنود المشروع')}
                            <span className="ms-1.5 text-xs text-neutral-400 font-normal">{t('Auto-fetched', 'مجلوب تلقائياً')}</span>
                          </p>
                          <span className="text-xs text-neutral-500">
                            {t(`${selectedItemIds.length} of ${selectedProject.items.length} selected`, `${selectedItemIds.length} من ${selectedProject.items.length} محددة`)}
                          </span>
                        </div>
                        <div className="rounded-xl border border-neutral-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-neutral-50 border-b border-neutral-200">
                                <th className="w-12 ps-4 py-2.5">
                                  <ItemCheckbox
                                    checked={selectedItemIds.length === selectedProject.items.length}
                                    mixed={selectedItemIds.length > 0 && selectedItemIds.length < selectedProject.items.length}
                                    onChange={toggleAllItems}
                                    label={t('Select all project items', 'تحديد جميع بنود المشروع')}
                                  />
                                </th>
                                <th className="text-start px-3 py-2.5 text-xs font-medium text-neutral-500">{t('Item', 'البند')}</th>
                                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Arabic Name', 'الاسم بالعربية')}</th>
                                <th className="text-start px-4 py-2.5 text-xs font-medium text-neutral-500">{t('Type', 'النوع')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {selectedProject.items.map((item) => {
                                const checked = selectedItemIds.includes(item.id);
                                return (
                                  <tr
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    className={`cursor-pointer transition-colors ${checked ? 'bg-brand-50/60' : 'bg-white hover:bg-neutral-50'}`}
                                  >
                                    <td className="ps-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      <ItemCheckbox checked={checked} onChange={() => toggleItem(item.id)} label={item.name} />
                                    </td>
                                    <td className="px-3 py-3 text-neutral-700 font-medium">{item.name}</td>
                                    <td className="px-4 py-3 text-neutral-500 text-xs" dir="rtl">{item.nameAr}</td>
                                    <td className="px-4 py-3">{TYPE_BADGE[item.type]}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {selectedItemIds.length === 0 && (
                          <p className="mt-1.5 text-xs text-neutral-400">{t('Select the items this tender covers. They become the project items you can add to the Bill of Quantities.', 'حدد البنود التي تشملها هذه المنافسة. ستظهر كبنود مشروع يمكن إضافتها إلى جدول الكميات.')}</p>
                        )}
                      </div>

                      <FormField
                        label="Purpose of Tendering"
                        labelAr="الغرض من المنافسة"
                        action={<AIButton onClick={handleAIGeneratePurpose} loading={purposeAiLoading} label={t('Generate Purpose', 'توليد الغرض')} />}
                      >
                        <Textarea
                          rows={3}
                          value={formData.tenderingPurpose}
                          onChange={(e) => updateField('tenderingPurpose', e.target.value)}
                          placeholder={t('Describe the purpose of this tender…', 'صف الغرض من هذه المنافسة…')}
                        />
                        <AiNote error={purposeAi.error} usedSample={purposeAi.usedSample} />
                      </FormField>

                      {/* Similar RFPs in this project — import one to pre-fill the later sections */}
                      <div className="rounded-xl bg-neutral-100 p-3.5">
                        <p className="flex items-center gap-2 text-[13px] font-semibold text-neutral-600 px-0.5">
                          <WandIcon className="w-4 h-4 text-ai-600" />
                          {t('Similar RFPs created within this project', 'طلبات عروض مماثلة ضمن هذا المشروع')}
                        </p>

                        {rfpImport && (
                          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-success-100 bg-success-50 px-3 py-2.5" role="status">
                            <CheckCircleIcon className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                            <p className="flex-1 text-[12px] text-success-700">
                              {t(
                                `Imported ${rfpImport.code}. ${IMPORTED_SECTIONS_EN.join(', ')} are now pre-filled. Review each section before submitting.`,
                                `تم استيراد ${rfpImport.code}. تمت تعبئة ${IMPORTED_SECTIONS_AR.join('، ')} مسبقاً. راجع كل قسم قبل التقديم.`
                              )}
                            </p>
                            <button type="button" onClick={undoImport} className="text-[12px] font-semibold text-success-700 hover:underline flex-shrink-0">
                              {t('Undo', 'تراجع')}
                            </button>
                          </div>
                        )}

                        <div className="mt-2.5 space-y-2.5">
                          {similarRfps.length === 0 && (
                            <p className="rounded-lg bg-white border border-neutral-200 px-4 py-3 text-[12px] text-neutral-500">
                              {t('No RFPs have been created within this project yet. You can still import from any past RFP.', 'لم يُنشأ أي طلب عروض ضمن هذا المشروع بعد. يمكنك الاستيراد من أي طلب سابق.')}
                            </p>
                          )}
                          {similarRfps.map((r) => {
                            const isImported = rfpImport?.rfpId === r.id;
                            return (
                              <div key={r.id} className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-semibold text-neutral-900 truncate">{isAr ? r.titleAr : r.title}</p>
                                  <p className="text-[12px] text-neutral-500 mt-0.5">
                                    <span dir="ltr">{r.code}</span> · {t('Created', 'أُنشئ')} {formatRfpDate(r.created, isAr)}
                                  </p>
                                </div>
                                {isImported ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-success-700">
                                    <CheckIcon className="w-3.5 h-3.5" />{t('Imported', 'تم الاستيراد')}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleImport(r)}
                                    className="px-4 py-1.5 rounded-lg border border-brand-600 bg-white text-[13px] font-semibold text-brand-700 hover:bg-brand-50 transition-colors flex-shrink-0"
                                  >
                                    {t('Import', 'استيراد')}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowRfpDialog(true)}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-0.5 text-[13px] font-semibold text-link hover:underline underline-offset-2"
                        >
                          {t('Browse all RFPs', 'تصفح جميع طلبات العروض')}
                          <ArrowLeftIcon className="w-3.5 h-3.5 ltr:rotate-180" />
                        </button>
                      </div>

                      {showRfpDialog && (
                        <BrowseRfpsDialog projectId={selectedProject.id} onClose={() => setShowRfpDialog(false)} onImport={handleImport} />
                      )}

                    </>
                  )}
                </>
              )}
            </div>
          </SectionCard>

        </>
      )}

      {formData.sourceType === 'souq-etimad' && (
        <SectionCard>
          <InfoBanner variant="info">
            {t(
              'Etimad Souq (E-Market) flow selected. This uses a simplified procurement workflow: Requester → Manager → Procurement → Director. The full RFP fields (BOQ, Technical Evaluation, etc.) are not required for this type.',
              'تم اختيار مسار سوق اعتماد. يستخدم سير عمل مشتريات مبسطاً: مقدم الطلب ← المدير ← المشتريات ← المدير التنفيذي. حقول طلب تقديم العروض الكاملة (جدول الكميات، التقييم الفني، إلخ) غير مطلوبة لهذا النوع.'
            )}
          </InfoBanner>
          <div className="mt-4 space-y-4">
            <FormField label="Cost Center" labelAr="مركز التكلفة" required>
              <Select value={formData.costCenterId} onChange={(e) => handleCostCenterChange(e.target.value)}>
                <option value="">{t('Select cost center…', 'اختر مركز التكلفة…')}</option>
                {ALL_COST_CENTERS.map((cc) => (
                  <option key={cc.id} value={cc.id}>{isAr ? cc.nameAr : cc.name} ({cc.code})</option>
                ))}
              </Select>
            </FormField>
            {formData.costCenterId && (
              <FormField label="Project" labelAr="المشروع" required>
                <Select value={formData.projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                  <option value="">{t('Select a project…', 'اختر مشروعاً…')}</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{isAr ? p.nameAr : p.name}</option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/** Square checkbox used in the project items table (supports a mixed state for "select all"). */
function ItemCheckbox({ checked, mixed, onChange, label }: { checked: boolean; mixed?: boolean; onChange: () => void; label: string }) {
  const on = checked || mixed;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : checked}
      aria-label={label}
      onClick={onChange}
      className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-colors ${
        on ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-neutral-300 hover:border-neutral-400'
      }`}
    >
      {checked ? <CheckIcon className="w-3 h-3" /> : mixed ? <span className="w-2 h-[2px] rounded bg-white" /> : null}
    </button>
  );
}
