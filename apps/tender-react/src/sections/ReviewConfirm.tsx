import { useState, Fragment, type ReactNode } from 'react';
import { useTender, SECTIONS } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { useRequests } from '../context/RequestStore';
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import { SectionCard, Button, Badge } from '../components/ui';
import { CheckCircleIcon, ExclamationCircleIcon, PencilIcon, SparklesIcon, AlertTriangleIcon, CheckIcon, ClockIcon, DocumentIcon, DownloadIcon } from '../components/Icons';
import type { SectionStatus, Person } from '../types/tender';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiExecutiveSummary } from '../lib/aiTender';
import { isStale, needsJustification } from '../lib/etimadCheck';
import { BOQ_CATEGORIES, BOQ_CATEGORY_META, deriveCategory } from '../lib/boqCategory';
import { effectiveQty } from '../lib/boqManpower';
import RegulatoryRecordsCard from '../components/RegulatoryRecordsCard';
import { LOCKED_TECH_DOCS } from './TechnicalEvaluation';

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function formatSAR0(n: number) {
  return new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(n);
}

// Distinct colours for categories / stages.
const CAT_COLOR: Record<string, string> = { service: '#2563eb', equipment: '#7c3aed', material: '#ea580c', manpower: '#0d9488' };
const SERIES = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#14b8a6'];

export default function ReviewConfirm({ onExit }: { onExit?: () => void }) {
  const { formData, updateField, sectionStatuses, goToSection, boqSubtotal, boqVat, boqTotal, paymentPctTotal, evalWeightTotal, qualPctTotal, importedFromProject, readyToSubmit, submitted, status } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const { userName } = useRequests();
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const summaryAi = useAiAction();
  const aiSummaryLoading = summaryAi.loading;
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);
  const selectedCC = ALL_COST_CENTERS.find((c) => c.id === formData.costCenterId);
  const extraCCs = (formData.additionalCostCenterIds ?? []).map((id) => ALL_COST_CENTERS.find((c) => c.id === id)).filter(Boolean) as typeof ALL_COST_CENTERS;

  const isEsouq = formData.sourceType === 'souq-etimad';
  const ESOUQ_IDS = ['procurement-route', 'project-setup', 'boq', 'attachments', 'review'];
  // Attachments is optional — it does not count toward completion / the 100% total.
  const reqIdxs = SECTIONS.map((_, i) => i).filter((i) => SECTIONS[i].id !== 'review' && SECTIONS[i].id !== 'attachments' && (!isEsouq || ESOUQ_IDS.includes(SECTIONS[i].id)));

  const incompleteSections = reqIdxs
    .map((i) => ({ status: sectionStatuses[i], section: SECTIONS[i], idx: i }))
    .filter(({ status }) => status === 'missing' || status === 'not-started');

  const completedCount = reqIdxs.filter((i) => sectionStatuses[i] === 'completed').length;
  const totalRequired = reqIdxs.length;

  const projectName = (isAr ? selectedProject?.nameAr : selectedProject?.name) ?? t('New Tender Request', 'طلب منافسة جديد');
  const deptName = selectedCC ? (isAr ? selectedCC.nameAr : selectedCC.name) : (isAr ? 'القسم الطالب' : 'Requesting Department');

  // BOQ figures by category for the budget donut.
  const lineTotal = (r: typeof formData.boqItems[number]) => effectiveQty(r) * (Number(r.unitPrice) || 0);
  const catBreakdown = BOQ_CATEGORIES.map((cat) => {
    const rows = formData.boqItems.filter((r) => (r.category ?? deriveCategory(r.itemName)) === cat);
    return { cat, total: rows.reduce((s, r) => s + lineTotal(r), 0), count: rows.length, color: CAT_COLOR[cat] };
  }).filter((x) => x.count > 0);

  function generateAISummary() {
    summaryAi.run(
      () => aiExecutiveSummary(formData, isAr, { subtotal: boqSubtotal, vat: boqVat, total: boqTotal }),
      (text) => { setAiSummaryText(text); setAiSummaryVisible(true); },
      () => { setAiSummaryText(null); setAiSummaryVisible(true); },
    );
  }

  if (submitted) {
    return <SubmittedScreen requestNo={submitted.requestNo} at={submitted.at} projectName={projectName} deptName={deptName}
      subtotal={boqSubtotal} grandTotal={boqTotal} stages={formData.paymentStages.length} userName={userName} isAr={isAr} t={t} onExit={onExit}
      formData={formData} selectedProject={selectedProject} />;
  }

  return (
    <div className="space-y-5">
      {importedFromProject && (
        <div className="flex items-start gap-3 rounded-xl border border-ai-200 bg-ai-50 px-5 py-4">
          <SparklesIcon className="w-4 h-4 text-ai-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-ai-900">{t('Details imported from a similar project', 'تم استيراد التفاصيل من مشروع مماثل')}</p>
            <p className="text-[12px] text-ai-700 mt-0.5">{t(`Imported as a starting point for "${importedFromProject}". Review before submitting.`, `تم الاستيراد كنقطة بداية لـ "${importedFromProject}". راجع قبل التقديم.`)}</p>
          </div>
        </div>
      )}

      {/* ── Request overview hero ─────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white">
        <div className="relative px-6 py-5 bg-gradient-to-br from-brand-600 via-brand-700 to-ai-700 text-white">
          <div className="absolute -top-10 -end-8 w-44 h-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -start-6 w-48 h-48 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{isEsouq ? t('Purchase request', 'طلب شراء') : t('Request for proposal', 'طلب عرض أسعار')}</p>
              <h3 className="text-[20px] font-bold leading-tight mt-1">{projectName}</h3>
              <p className="text-[13px] text-white/80 mt-0.5">{deptName}{selectedProject?.code ? <> · <span dir="ltr">{selectedProject.code}</span></> : ''}</p>
            </div>
            <Badge variant={status === 'draft' ? 'draft' : 'submitted'}>{status === 'draft' ? t('Draft', 'مسودة') : t('Ready', 'جاهز')}</Badge>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <HeroStat label={t('Total value', 'القيمة الإجمالية')} value={boqSubtotal > 0 ? `SAR ${formatSAR0(boqSubtotal)}` : '—'} />
            <HeroStat label={t('Grand total', 'الإجمالي')} value={boqTotal > 0 ? `SAR ${formatSAR0(boqTotal)}` : '—'} sub={t('incl. 15% VAT', 'شامل الضريبة')} />
            <HeroStat label={t('BOQ items', 'بنود الجدول')} value={`${formData.boqItems.length}`} />
            <HeroStat label={t('Payment milestones', 'مراحل الدفع')} value={isEsouq ? '—' : `${formData.paymentStages.length} ${t('stages', 'مراحل')}`} />
          </div>
        </div>
        {/* Completion strip */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-neutral-800">{t('Completion status', 'حالة الاكتمال')}</p>
            <span className={`text-[13px] font-bold tabular-nums ${readyToSubmit ? 'text-success-600' : 'text-warning-600'}`}>{completedCount}/{totalRequired} · {Math.round((completedCount / totalRequired) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${readyToSubmit ? 'bg-success-500' : 'bg-warning-500'}`} style={{ width: `${(completedCount / totalRequired) * 100}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {reqIdxs.map((i) => {
              const sec = SECTIONS[i];
              return (
                <button key={sec.id} onClick={() => goToSection(i)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-200 bg-white hover:border-neutral-300 transition-colors text-[11px] text-neutral-600">
                  <StatusDot status={sectionStatuses[i]} small />
                  {isEsouq && sec.id === 'project-setup' ? t('Purchase details', 'تفاصيل الشراء') : (isAr ? sec.titleAr : sec.title)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Missing sections warning */}
      {incompleteSections.length > 0 && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangleIcon className="w-4 h-4 text-warning-600" />
            <span className="text-sm font-semibold text-warning-800">{incompleteSections.length} {incompleteSections.length > 1 ? t('sections need attention', 'أقسام تحتاج إلى اهتمام') : t('section needs attention', 'قسم يحتاج إلى اهتمام')}</span>
          </div>
          <div className="space-y-2">
            {incompleteSections.map(({ section, idx }) => (
              <div key={section.id} className="flex items-center justify-between bg-white rounded-lg border border-warning-100 px-3 py-2">
                <span className="text-sm text-neutral-700">{isAr ? section.titleAr : section.title}</span>
                <Button variant="ghost" size="sm" onClick={() => goToSection(idx)}><PencilIcon className="w-3 h-3" /> {t('Edit', 'تعديل')}</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI summary */}
      {!aiSummaryVisible ? (
        <div className="flex items-center justify-between bg-ai-50 rounded-xl border border-ai-200 px-5 py-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-5 h-5 text-ai-600" />
            <div>
              <p className="text-sm font-medium text-ai-800">{t('AI Executive Summary', 'الملخص التنفيذي بالذكاء الاصطناعي')}</p>
              <p className="text-xs text-ai-600">{t('Generate a narrative summary of this request.', 'أنشئ ملخصاً سردياً لهذا الطلب.')}</p>
            </div>
          </div>
          <Button variant="ai" size="sm" onClick={generateAISummary} loading={aiSummaryLoading}>
            {!aiSummaryLoading && <SparklesIcon className="w-3.5 h-3.5" />}
            {aiSummaryLoading ? t('Generating…', 'جاري التوليد…') : t('Generate Summary', 'توليد الملخص')}
          </Button>
        </div>
      ) : (
        <SectionCard className="border-ai-200">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="w-4 h-4 text-ai-600" />
            <span className="text-sm font-semibold text-ai-800">{t('AI Executive Summary', 'الملخص التنفيذي بالذكاء الاصطناعي')}</span>
            <Button variant="ghost" size="sm" className="ms-auto" onClick={generateAISummary} loading={aiSummaryLoading}><SparklesIcon className="w-3.5 h-3.5" />{t('Regenerate', 'إعادة التوليد')}</Button>
          </div>
          {aiSummaryText && <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{aiSummaryText}</div>}
          <AiNote error={summaryAi.error} usedSample={summaryAi.usedSample} />
        </SectionCard>
      )}

      {/* ── Project details ──────────────────────────────────────── */}
      <ReviewSection title={isEsouq ? 'Purchase details' : 'Project Setup'} titleAr={isEsouq ? 'تفاصيل الشراء' : 'إعداد المشروع'} sectionIdx={1} status={sectionStatuses[1]}>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3.5 text-sm">
          <ReviewField label={t('Cost Center', 'مركز التكلفة')} value={selectedCC ? `${isAr ? selectedCC.nameAr : selectedCC.name} (${selectedCC.code})` : '—'} />
          <ReviewField label={t('Project', 'المشروع')} value={(isAr ? selectedProject?.nameAr : selectedProject?.name) ?? '—'} />
          <ReviewField label={t('Project Code', 'رمز المشروع')} value={selectedProject?.code ?? '—'} ltr />
          {extraCCs.length > 0 && <ReviewField label={t('Additional Cost Centers', 'مراكز تكلفة إضافية')} value={extraCCs.map((c) => `${c.name} (${c.code})`).join(', ')} />}
          <ReviewField label={t('Source Type', 'نوع المصدر')} value={formData.sourceType === 'tendering' ? t('Competitive Tender', 'منافسة') : t('Etimad E-Market', 'سوق اعتماد')} />
        </dl>
        {formData.tenderingPurpose && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-[11px] text-neutral-400 mb-1">{isEsouq ? t('Purpose of purchase', 'الغرض من الشراء') : t('Purpose of tendering', 'الغرض من المنافسة')}</p>
            <p className="text-[13px] text-neutral-700 leading-relaxed whitespace-pre-line">{formData.tenderingPurpose}</p>
          </div>
        )}
      </ReviewSection>

      {/* ── Scope of work ────────────────────────────────────────── */}
      {!isEsouq && (
        <ReviewSection title="Scope of Work" titleAr="نطاق العمل" sectionIdx={2} status={sectionStatuses[2]}>
          {formData.scopeOfWork ? (
            <p className="text-[13px] text-neutral-600 leading-relaxed whitespace-pre-line">{formData.scopeOfWork}</p>
          ) : <span className="text-neutral-400 italic text-sm">{t('Not completed', 'غير مكتمل')}</span>}
          {formData.scopeTerms && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">{t('Scope-specific terms & conditions', 'الشروط الخاصة بالنطاق')}</p>
              <p className="text-[12.5px] text-neutral-600 leading-relaxed whitespace-pre-line">{formData.scopeTerms}</p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MiniCard icon={<CalendarGlyph />} label={t('Start date', 'تاريخ البدء')} value={formData.startDate || '—'} ltr />
            <MiniCard icon={<ClockIcon className="w-4 h-4" />} label={t('Duration', 'المدة')} value={formData.contractDuration ? `${formData.contractDuration} ${t(formData.contractDurationType, formData.contractDurationType === 'days' ? 'أيام' : formData.contractDurationType === 'months' ? 'أشهر' : 'سنوات')}` : '—'} />
            <MiniCard icon={<PinGlyph />} label={t('Location', 'الموقع')} value={formData.executionLocation ? t('See below', 'انظر أدناه') : '—'} />
          </div>
          {formData.executionLocation && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">{t('Execution location', 'مكان التنفيذ')}</p>
              <p className="text-[12.5px] text-neutral-600 leading-relaxed whitespace-pre-line">{formData.executionLocation}</p>
            </div>
          )}
        </ReviewSection>
      )}

      {/* ── Bill of Quantities — budget donut + table ────────────── */}
      <ReviewSection title="Bill of Quantities" titleAr="جدول الكميات" sectionIdx={3} status={sectionStatuses[3]}>
        {formData.boqItems.length === 0 ? (
          <span className="text-neutral-400 italic text-sm">{t('No items added', 'لم تُضف بنود')}</span>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5 items-start">
            {/* Donut + legend */}
            <div className="flex lg:flex-col items-center gap-4">
              <Donut segments={catBreakdown.map((c) => ({ value: c.total, color: c.color }))} centerTop={`SAR ${formatSAR0(boqSubtotal)}`} centerSub={t('subtotal', 'المجموع')} />
              <div className="space-y-1.5">
                {catBreakdown.map((c) => (
                  <div key={c.cat} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-neutral-600">{isAr ? BOQ_CATEGORY_META[c.cat].ar : BOQ_CATEGORY_META[c.cat].en}</span>
                    <span className="text-neutral-400 ms-auto tabular-nums" dir="ltr">{boqSubtotal > 0 ? Math.round((c.total / boqSubtotal) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Items table */}
            <div className="min-w-0 overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] text-neutral-500">
                    <th className="text-start px-3 py-2 font-medium">{t('Item', 'البند')}</th>
                    <th className="text-start px-3 py-2 font-medium">{t('Category', 'التصنيف')}</th>
                    <th className="text-end px-3 py-2 font-medium">{t('Qty', 'الكمية')}</th>
                    <th className="text-end px-3 py-2 font-medium">{t('Unit price', 'سعر الوحدة')}</th>
                    <th className="text-end px-3 py-2 font-medium">{t('Total', 'الإجمالي')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {formData.boqItems.slice(0, 8).map((r) => {
                    const m = BOQ_CATEGORY_META[r.category ?? deriveCategory(r.itemName)];
                    return (
                      <tr key={r.id} className="bg-white">
                        <td className="px-3 py-2 text-neutral-800 font-medium truncate max-w-[220px]">{r.itemName || <span className="text-neutral-300">—</span>}</td>
                        <td className="px-3 py-2"><Badge variant={m.badge}>{isAr ? m.ar : m.en}</Badge></td>
                        <td className="px-3 py-2 text-end tabular-nums text-neutral-600">{effectiveQty(r) || '—'}</td>
                        <td className="px-3 py-2 text-end tabular-nums text-neutral-600" dir="ltr">{Number(r.unitPrice) > 0 ? formatSAR(Number(r.unitPrice)) : '—'}</td>
                        <td className="px-3 py-2 text-end tabular-nums font-semibold text-neutral-900" dir="ltr">{lineTotal(r) > 0 ? formatSAR(lineTotal(r)) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {formData.boqItems.length > 8 && (
                    <tr><td colSpan={5} className="px-3 py-1.5 text-[11px] text-neutral-400 bg-neutral-50/60">+ {formData.boqItems.length - 8} {t('more items', 'بنود أخرى')}</td></tr>
                  )}
                  <tr className="bg-neutral-50 border-t border-neutral-200 text-[12px]">
                    <td colSpan={4} className="px-3 py-2 text-end text-neutral-500">{t('Subtotal', 'المجموع الفرعي')}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-medium" dir="ltr">{formatSAR(boqSubtotal)}</td>
                  </tr>
                  <tr className="bg-neutral-50 text-[12px]">
                    <td colSpan={4} className="px-3 py-1.5 text-end text-neutral-500">{t('VAT (15%)', 'ضريبة القيمة المضافة')}</td>
                    <td className="px-3 py-1.5 text-end tabular-nums font-medium" dir="ltr">{formatSAR(boqVat)}</td>
                  </tr>
                  <tr className="bg-brand-50 border-t border-brand-200 text-[13px]">
                    <td colSpan={4} className="px-3 py-2 text-end font-bold text-brand-800">{t('Grand total', 'الإجمالي')}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-bold text-brand-800" dir="ltr">SAR {formatSAR(boqTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </ReviewSection>

      {/* ── Payment schedule — stage cards + proportion bar ──────── */}
      {!isEsouq && (
        <ReviewSection title="Payment Schedule" titleAr="جدول الدفعات" sectionIdx={4} status={sectionStatuses[4]}>
          {formData.paymentStages.length === 0 ? (
            <span className="text-neutral-400 italic text-sm">{t('No payment stages defined', 'لم تُحدَّد مراحل دفع')}</span>
          ) : (
            <>
              <div className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold mb-3 ${paymentPctTotal === 100 ? 'text-success-600' : 'text-warning-600'}`}>
                {paymentPctTotal === 100 ? <CheckCircleIcon className="w-4 h-4" /> : <AlertTriangleIcon className="w-4 h-4" />}
                {t(`Payment stages ${paymentPctTotal === 100 ? 'valid' : 'incomplete'} (${paymentPctTotal}%)`, `مراحل الدفع ${paymentPctTotal === 100 ? 'صحيحة' : 'ناقصة'} (${paymentPctTotal}%)`)}
              </div>
              {/* proportion bar */}
              <div className="flex h-2.5 rounded-full overflow-hidden mb-4 bg-neutral-100">
                {formData.paymentStages.map((s, i) => (
                  <div key={s.id} style={{ width: `${Number(s.percentage) || 0}%`, background: SERIES[i % SERIES.length] }} title={`${s.stageName}: ${s.percentage}%`} />
                ))}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {formData.paymentStages.map((s, i) => {
                  const pct = Number(s.percentage) || 0;
                  const amount = (pct / 100) * boqSubtotal;
                  return (
                    <div key={s.id} className="rounded-xl border border-neutral-200 p-3.5 bg-gradient-to-b from-neutral-50/80 to-white">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: SERIES[i % SERIES.length] }}>{i + 1}</span>
                        <p className="text-[12px] font-semibold text-neutral-700 leading-tight">{s.stageName || t('Stage', 'مرحلة')}</p>
                      </div>
                      <p className="text-[22px] font-bold text-neutral-900 tabular-nums leading-none">{pct}%</p>
                      <p className="text-[11.5px] text-neutral-500 mt-1 tabular-nums" dir="ltr">SAR {formatSAR(amount)}</p>
                      {(s.startDate || s.duration) && (
                        <p className="text-[10.5px] text-neutral-400 mt-2" dir="ltr">{s.startDate}{s.duration ? ` · ${s.duration}` : ''}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </ReviewSection>
      )}

      {/* ── Technical evaluation ─────────────────────────────────── */}
      {!isEsouq && (
        <ReviewSection title="Technical Evaluation" titleAr="التقييم الفني" sectionIdx={5} status={sectionStatuses[5]}>
          <SubLabel>{t('Evaluation committee', 'لجنة التقييم')}</SubLabel>
          <CommitteeRow members={formData.technicalCommitteeMembers} isAr={isAr} t={t} />

          <div className="mt-4">
            <SubLabel>{t('Technical documents', 'الوثائق الفنية')}</SubLabel>
            <div className="flex flex-wrap gap-1.5">
              {LOCKED_TECH_DOCS.map((d, i) => (
                <span key={`l-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] bg-neutral-100 text-neutral-600 border border-neutral-200">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-neutral-400"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  {isAr ? d.ar : d.en}
                </span>
              ))}
              {(formData.technicalDocumentsList as string[]).map((dco, i) => (
                <span key={`u-${i}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] bg-white text-neutral-700 border border-neutral-200">{dco}</span>
              ))}
            </div>
          </div>

          {formData.technicalRequirements.length > 0 && (
            <div className="mt-4">
              <SubLabel>{t('Technical requirements', 'المتطلبات الفنية')}</SubLabel>
              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] text-neutral-500">
                      <th className="text-start px-3 py-2 font-medium w-8">#</th>
                      <th className="text-start px-3 py-2 font-medium w-48">{t('Requirement', 'المتطلب')}</th>
                      <th className="text-start px-3 py-2 font-medium">{t('Description', 'الوصف')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {formData.technicalRequirements.map((r, idx) => (
                      <tr key={r.id} className="bg-white align-top">
                        <td className="px-3 py-2 text-neutral-400 text-center">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-neutral-800">{r.requirement || '—'}</td>
                        <td className="px-3 py-2 text-neutral-600 leading-snug">{r.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {formData.evaluationCriteria.length > 0 ? (
            <div className="mt-4">
              <SubLabel>{t('Evaluation criteria & weights', 'معايير التقييم والأوزان')}</SubLabel>
              <div className="space-y-2.5">
                {formData.evaluationCriteria.map((c, i) => {
                  const w = Number(c.weight) || 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-[12.5px] text-neutral-700 w-[46%] truncate" title={c.description}>{c.description || t('Criterion', 'معيار')}</span>
                      <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(w, 100)}%`, background: SERIES[i % SERIES.length] }} />
                      </div>
                      <span className="text-[12px] font-semibold text-neutral-700 tabular-nums w-10 text-end">{w}%</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-2 mt-1 border-t border-neutral-100 text-[12px]">
                  <span className={`font-semibold ${evalWeightTotal === 100 ? 'text-success-600' : 'text-warning-600'}`}>{t('Total weight', 'إجمالي الأوزان')}: {evalWeightTotal}% {evalWeightTotal === 100 ? '✓' : '⚠'}</span>
                  <span className="text-neutral-500">{t('Passing', 'الاجتياز')}: <span className="font-semibold text-neutral-800">{formData.technicalPassingPercentage || '—'}%</span></span>
                </div>
              </div>
            </div>
          ) : <p className="mt-3 text-sm text-neutral-400 italic">{t('No evaluation criteria', 'لا توجد معايير تقييم')}</p>}
        </ReviewSection>
      )}

      {/* ── Qualification criteria ───────────────────────────────── */}
      {!isEsouq && (
        <ReviewSection title="Qualification Criteria" titleAr="معايير التأهيل" sectionIdx={6} status={sectionStatuses[6]}>
          <SubLabel>{t('Qualification committee', 'لجنة التأهيل')}</SubLabel>
          <CommitteeRow members={formData.qualificationCommitteeMembers} isAr={isAr} t={t} />
          {formData.qualificationCriteria.length > 0 ? (
            <>
              <div className="mt-4 rounded-xl border border-neutral-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] text-neutral-500">
                      <th className="text-start px-4 py-2 font-medium min-w-[220px]">{t('Criteria', 'المعايير')}</th>
                      <th className="text-start px-4 py-2 font-medium min-w-[140px]">{t('Range', 'النطاق')}</th>
                      <th className="text-end px-4 py-2 font-medium w-24">{t('Weight (%)', 'الوزن (%)')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.qualificationCriteria.map((main) => {
                      const subTotal = main.subCriteria.reduce((s, c) => s + (typeof c.percentage === 'number' ? c.percentage : 0), 0);
                      const subOk = subTotal === 100;
                      return (
                        <Fragment key={main.id}>
                          <tr className="bg-neutral-50 border-t border-b border-neutral-200">
                            <td className="px-4 py-2.5"><p className="text-[13px] font-semibold text-neutral-800">{isAr ? main.nameAr : main.name}</p></td>
                            <td className="px-4 py-2.5 text-[11px] text-neutral-400 italic">{t('Main category', 'فئة رئيسية')}</td>
                            <td className="px-4 py-2.5 text-end"><span className="text-[13px] font-semibold text-neutral-800 tabular-nums">{Number(main.percentage) || 0}%</span></td>
                          </tr>
                          {main.subCriteria.map((sub) => (
                            <tr key={sub.id} className="bg-white border-b border-neutral-100">
                              <td className="px-4 py-2 ps-8"><span className="text-neutral-300 me-1">└</span><span className="text-[12px] text-neutral-700">{isAr ? sub.nameAr : sub.name}</span></td>
                              <td className="px-4 py-2 text-[12px] text-neutral-600">{sub.range || '—'}</td>
                              <td className="px-4 py-2 text-end text-[12px] text-neutral-700 tabular-nums">{Number(sub.percentage) || 0}%</td>
                            </tr>
                          ))}
                          <tr className={`border-b-2 border-neutral-200 ${subOk ? 'bg-success-50/40' : 'bg-warning-50/40'}`}>
                            <td className="px-4 py-1.5 ps-8 text-[11px] text-neutral-400 italic">{t('Sub-criteria total', 'إجمالي المعايير الفرعية')}</td>
                            <td />
                            <td className={`px-4 py-1.5 text-end text-[11px] font-semibold tabular-nums ${subOk ? 'text-success-600' : 'text-warning-600'}`}>{subTotal}% {!subOk && '⚠'}</td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="pt-2 mt-2 text-[12px]">
                <span className={`font-semibold ${qualPctTotal === 100 ? 'text-success-600' : 'text-warning-600'}`}>{t('Main criteria total', 'إجمالي المعايير الرئيسية')}: {qualPctTotal}% {qualPctTotal === 100 ? '✓' : '⚠'}</span>
              </div>
            </>
          ) : <p className="mt-3 text-sm text-neutral-400 italic">{t('No qualification criteria', 'لا توجد معايير تأهيل')}</p>}
        </ReviewSection>
      )}

      {/* ── Regulatory records ───────────────────────────────────── */}
      {!isEsouq && selectedProject && (
        <RegulatoryRecordsCard records={selectedProject.regulatoryRecords ?? ''} extra={formData.extraRegulatoryRecords ?? []} onChange={(v) => updateField('extraRegulatoryRecords', v)} />
      )}

      {/* ── Attachments ──────────────────────────────────────────── */}
      <ReviewSection title="Attachments" titleAr="المرفقات" sectionIdx={7} status={sectionStatuses[7]}>
        {formData.attachments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {formData.attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
                <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0"><DocumentIcon className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-neutral-800 truncate">{a.name}</p>
                  <p className="text-[11px] text-neutral-400">{(a.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-neutral-400 italic">{t('No attachments uploaded (optional)', 'لا توجد مرفقات (اختياري)')}</p>}
      </ReviewSection>
    </div>
  );
}

/* ── Submitted success screen ──────────────────────────────────── */
function SubmittedScreen({ requestNo, at, projectName, deptName, subtotal, grandTotal, stages, userName, isAr, t, onExit, formData, selectedProject }: {
  requestNo: string; at: string; projectName: string; deptName: string; subtotal: number; grandTotal: number; stages: number;
  userName: string; isAr: boolean; t: (en: string, ar: string) => string; onExit?: () => void;
  formData: ReturnType<typeof useTender>['formData']; selectedProject: typeof PROJECTS[number] | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const [showRfp, setShowRfp] = useState(false);
  const d = new Date(at);
  const email = (userName || 'requester').trim().toLowerCase().replace(/\s+/g, '.').replace(/\.+$/, '') + '@sidf.gov.sa';
  const dateStr = d.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString(isAr ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  function share() {
    const text = `${projectName} — ${requestNo}`;
    try { navigator.clipboard?.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
  }

  const steps = [
    { icon: <ClockIcon className="w-4 h-4" />, tone: 'bg-blue-50 text-blue-600', en: 'Procurement Committee Review', ar: 'مراجعة لجنة المشتريات', metaEn: '2–5 business days', metaAr: '2–5 أيام عمل' },
    { icon: <CheckCircleIcon className="w-4 h-4" />, tone: 'bg-ai-50 text-ai-600', en: 'Budget & Policy Approval', ar: 'اعتماد الميزانية والسياسات', metaEn: '3–7 business days', metaAr: '3–7 أيام عمل' },
    { icon: <EyeGlyph />, tone: 'bg-warning-50 text-warning-600', en: 'RFP Published to Vendor Portal', ar: 'نشر الطلب في بوابة الموردين', metaEn: 'Upon approval', metaAr: 'عند الاعتماد' },
    { icon: <PeopleGlyph />, tone: 'bg-success-50 text-success-600', en: 'Vendor Submission Period', ar: 'فترة تقديم الموردين', metaEn: '30 days open window', metaAr: 'نافذة مفتوحة 30 يوماً' },
  ];

  return (
    <div className="max-w-[640px] mx-auto py-6">
      {showRfp && <RfpModal onClose={() => setShowRfp(false)} requestNo={requestNo} projectName={projectName} deptName={deptName} subtotal={subtotal} grandTotal={grandTotal} formData={formData} selectedProject={selectedProject} isAr={isAr} t={t} />}

      {/* Check + heading */}
      <div className="flex flex-col items-center text-center">
        <div className="relative w-16 h-16 mb-4">
          <span className="success-pulse absolute inset-0 rounded-full bg-success-400" />
          <span className="success-pulse absolute inset-0 rounded-full bg-success-300" style={{ animationDelay: '0.45s' }} />
          <div className="success-ring relative w-16 h-16 rounded-full bg-success-500 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 52 52" className="w-8 h-8" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path className="check-draw" d="M14 27l8 8 16-17" /></svg>
          </div>
        </div>
        <h3 className="success-copy text-[22px] font-bold text-neutral-900">{isEsouqTitle(t)}</h3>
        <p className="success-copy text-neutral-500 text-[13.5px] max-w-sm mt-1.5" style={{ animationDelay: '0.72s' }}>
          {t('Your request has been received by the Procurement Committee and is now under review.', 'تم استلام طلبك من قِبل لجنة المشتريات وهو الآن قيد المراجعة.')}
        </p>
      </div>

      {/* RFP summary card */}
      <div className="success-copy mt-6 rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-white" style={{ animationDelay: '0.8s' }}>
        <div className="px-5 py-4 bg-gradient-to-br from-ai-600 to-brand-700 text-white flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-white/70">{t('Request for proposal', 'طلب عرض أسعار')}</p>
            <p className="text-[18px] font-bold mt-0.5 tracking-wide" dir="ltr">{requestNo}</p>
          </div>
          <div className="text-end">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-white/20 rounded-full px-2.5 py-1">{t('Submitted', 'مُقدَّم')}</span>
            <p className="text-[11px] text-white/70 mt-1.5">{dateStr} · {timeStr}</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0"><DocumentIcon className="w-4 h-4" /></span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-neutral-900 leading-tight">{projectName}</p>
              <p className="text-[12.5px] text-neutral-500">{deptName}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-neutral-100">
            <MiniStat label={t('Total value', 'القيمة الإجمالية')} value={subtotal > 0 ? `SAR ${formatSAR0(subtotal)}` : '—'} />
            <MiniStat label={t('Grand total', 'الإجمالي')} value={grandTotal > 0 ? `SAR ${formatSAR0(grandTotal)}` : '—'} />
            <MiniStat label={t('Payment milestones', 'مراحل الدفع')} value={`${stages} ${t('stages', 'مراحل')}`} />
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="success-copy mt-4 rounded-2xl border border-neutral-200 bg-white overflow-hidden" style={{ animationDelay: '0.9s' }}>
        <p className="px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{t('What happens next', 'ما الخطوة التالية')}</p>
        <ol className="px-5 pb-4 pt-2">
          {steps.map((s, i) => (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && <span className="absolute top-9 w-[2px] bg-neutral-100" style={{ insetInlineStart: '15px', bottom: 0 }} />}
              <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.tone}`}>{s.icon}</span>
              <div className="pt-0.5">
                <p className="text-[13px] font-semibold text-neutral-800">{isAr ? s.ar : s.en}</p>
                <p className="text-[11.5px] text-neutral-400 mt-0.5">{isAr ? s.metaAr : s.metaEn}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* CTAs */}
      <div className="success-copy mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ animationDelay: '1s' }}>
        <CtaCard primary icon={<ExternalGlyph />} title={t('View RFP', 'عرض الطلب')} sub={t('Open full document', 'فتح المستند الكامل')} onClick={() => setShowRfp(true)} />
        <CtaCard icon={<DownloadIcon className="w-[18px] h-[18px]" />} title={t('Download PDF', 'تنزيل PDF')} sub={t('Save a local copy', 'حفظ نسخة محلية')} onClick={() => window.print()} />
        <CtaCard icon={<ShareGlyph />} title={copied ? t('Link copied', 'تم نسخ الرابط') : t('Share', 'مشاركة')} sub={t('Send link to colleagues', 'إرسال رابط للزملاء')} onClick={share} />
        <CtaCard icon={<DocumentIcon className="w-[18px] h-[18px]" />} title={t('Return to Requests', 'العودة إلى الطلبات')} sub={t('Back to your dashboard', 'العودة إلى لوحتك')} onClick={() => onExit?.()} />
      </div>

      <p className="success-copy text-center text-[11.5px] text-neutral-400 mt-5" style={{ animationDelay: '1.1s' }}>
        {t('A confirmation has been sent to', 'تم إرسال تأكيد إلى')} <span className="font-medium text-neutral-500" dir="ltr">{email}</span> · {t('Reference', 'المرجع')}: <span dir="ltr">{requestNo}</span>
      </p>
    </div>
  );
}

function isEsouqTitle(t: (en: string, ar: string) => string) { return t('RFP Submitted Successfully', 'تم تقديم الطلب بنجاح'); }

function RfpModal({ onClose, requestNo, projectName, deptName, subtotal, grandTotal, formData, selectedProject, isAr, t }: {
  onClose: () => void; requestNo: string; projectName: string; deptName: string; subtotal: number; grandTotal: number;
  formData: ReturnType<typeof useTender>['formData']; selectedProject: typeof PROJECTS[number] | undefined; isAr: boolean; t: (en: string, ar: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-[680px] max-h-[86vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 px-6 py-4 bg-gradient-to-br from-ai-600 to-brand-700 text-white flex items-center justify-between">
          <div><p className="text-[10.5px] uppercase tracking-widest text-white/70">{t('Request for proposal', 'طلب عرض أسعار')}</p><p className="text-[16px] font-bold" dir="ltr">{requestNo}</p></div>
          <button type="button" onClick={onClose} aria-label={t('Close', 'إغلاق')} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"><svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <h3 className="text-[18px] font-bold text-neutral-900">{projectName}</h3>
            <p className="text-[13px] text-neutral-500">{deptName}{selectedProject?.code ? <> · <span dir="ltr">{selectedProject.code}</span></> : ''}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label={t('Total value', 'القيمة الإجمالية')} value={subtotal > 0 ? `SAR ${formatSAR0(subtotal)}` : '—'} />
            <MiniStat label={t('Grand total', 'الإجمالي')} value={grandTotal > 0 ? `SAR ${formatSAR0(grandTotal)}` : '—'} />
            <MiniStat label={t('BOQ items', 'بنود الجدول')} value={`${formData.boqItems.length}`} />
          </div>
          {formData.scopeOfWork && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1.5">{t('Scope of work', 'نطاق العمل')}</p>
              <p className="text-[13px] text-neutral-600 leading-relaxed whitespace-pre-line">{formData.scopeOfWork}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div><p className="text-[11px] text-neutral-400 mb-0.5">{t('Evaluation criteria', 'معايير التقييم')}</p><p className="font-medium text-neutral-800">{formData.evaluationCriteria.length}</p></div>
            <div><p className="text-[11px] text-neutral-400 mb-0.5">{t('Qualification criteria', 'معايير التأهيل')}</p><p className="font-medium text-neutral-800">{formData.qualificationCriteria.length}</p></div>
            <div><p className="text-[11px] text-neutral-400 mb-0.5">{t('Payment stages', 'مراحل الدفع')}</p><p className="font-medium text-neutral-800">{formData.paymentStages.length}</p></div>
            <div><p className="text-[11px] text-neutral-400 mb-0.5">{t('Attachments', 'المرفقات')}</p><p className="font-medium text-neutral-800">{formData.attachments.length}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small building blocks ─────────────────────────────────────── */
function SubLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">{children}</p>;
}
function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className="text-[16px] font-bold mt-0.5 tabular-nums" dir="ltr">{value}</p>
      {sub && <p className="text-[10px] text-white/50">{sub}</p>}
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center sm:text-start">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="text-[14px] font-bold text-neutral-900 mt-0.5 tabular-nums" dir="ltr">{value}</p>
    </div>
  );
}
function MiniCard({ icon, label, value, ltr }: { icon: ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
      <span className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center flex-shrink-0">{icon}</span>
      <div className="min-w-0"><p className="text-[10.5px] text-neutral-400">{label}</p><p className="text-[12.5px] font-semibold text-neutral-800 truncate" dir={ltr ? 'ltr' : undefined}>{value}</p></div>
    </div>
  );
}
function CtaCard({ icon, title, sub, onClick, primary }: { icon: ReactNode; title: string; sub: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${primary ? 'bg-ai-600 border-ai-600 text-white hover:bg-ai-700' : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'}`}>
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${primary ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{icon}</span>
      <div><p className="text-[13.5px] font-semibold leading-tight">{title}</p><p className={`text-[11.5px] ${primary ? 'text-white/70' : 'text-neutral-400'}`}>{sub}</p></div>
    </button>
  );
}

function CommitteeRow({ members, isAr, t }: { members: Person[]; isAr: boolean; t: (en: string, ar: string) => string }) {
  if (members.length === 0) return <p className="text-[12.5px] text-neutral-400 italic">{t('No committee members selected', 'لم يُختر أعضاء لجنة')}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const name = (isAr ? m.nameAr : m.name) ?? m.name;
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
        return (
          <div key={m.id} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white ps-1 pe-3 py-1">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{initials}</span>
            <span className="text-[12px] text-neutral-700">{name}</span>
            <span className="text-[10.5px] text-neutral-400">· {m.role}</span>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ segments, centerTop, centerSub, size = 148, stroke = 20 }: { segments: { value: number; color: string }[]; centerTop?: string; centerSub?: string; size?: number; stroke?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f5" strokeWidth={stroke} />
          {segments.map((seg, i) => {
            const len = (seg.value / total) * c;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerTop && <p className="text-[13px] font-bold text-neutral-900 tabular-nums leading-none" dir="ltr">{centerTop}</p>}
        {centerSub && <p className="text-[10px] text-neutral-400 mt-0.5">{centerSub}</p>}
      </div>
    </div>
  );
}

function ReviewSection({ title, titleAr, sectionIdx, status, children }: { title: string; titleAr: string; sectionIdx: number; status: SectionStatus; children: ReactNode }) {
  const { goToSection } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
        <button onClick={() => setCollapsed((v) => !v)} className="flex items-center gap-2.5 min-w-0 text-start">
          <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
          <StatusDot status={status} />
          <span className="text-sm font-semibold text-neutral-800 truncate">{isAr ? titleAr : title}</span>
        </button>
        <button onClick={() => goToSection(sectionIdx)} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors flex-shrink-0"><PencilIcon className="w-3 h-3" />{t('Edit', 'تعديل')}</button>
      </div>
      {!collapsed && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

function ReviewField({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-neutral-400 mb-0.5">{label}</dt>
      <dd className="text-[13px] text-neutral-800 font-medium" dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  );
}

function StatusDot({ status, small }: { status: SectionStatus; small?: boolean }) {
  const sz = small ? 'w-3 h-3' : 'w-4 h-4';
  if (status === 'completed') return <CheckCircleIcon className={`${sz} text-success-500 flex-shrink-0`} />;
  if (status === 'missing') return <ExclamationCircleIcon className={`${sz} text-warning-500 flex-shrink-0`} />;
  if (status === 'in-progress') return <div className={`${sz} rounded-full border-2 border-brand-500 bg-brand-100 flex-shrink-0`} />;
  return <div className={`${sz} rounded-full border-2 border-neutral-300 flex-shrink-0`} />;
}

/* Inline glyphs not in the icon set */
function CalendarGlyph() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>; }
function PinGlyph() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>; }
function EyeGlyph() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>; }
function PeopleGlyph() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 5.5a3 3 0 010 5.8M21 20c0-2.6-1.6-4.2-4-4.8" /></svg>; }
function ExternalGlyph() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><path d="M15 3h6v6M10 14 21 3" /></svg>; }
function ShareGlyph() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2" /></svg>; }
