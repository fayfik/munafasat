import { useTender } from '../context/TenderContext';
import { useT, useLanguage } from '../context/LanguageContext';
import { ALL_COST_CENTERS, PROJECTS } from '../data/mockData';
import { SectionCard, Textarea, Badge, AIButton } from '../components/ui';
import { useAiAction, AiNote } from '../lib/useAiAction';
import { aiPurpose } from '../lib/aiTender';
import { formatSAR } from '../lib/money';

/**
 * v3 — the project, items and route are settled in step 1, so this part is a short
 * summary of the request plus its purpose (AI may draft the purpose text only).
 */
export default function ProjectSetup() {
  const { formData, updateField } = useTender();
  const { isAr } = useLanguage();
  const t = useT();
  const purposeAi = useAiAction();

  const project = PROJECTS.find((p) => p.id === formData.projectId);
  const cc = ALL_COST_CENTERS.find((c) => c.id === formData.costCenterId);
  const isEmarket = formData.sourceType === 'souq-etimad';
  const items = (project?.items ?? []).filter((it) => (formData.selectedProjectItemIds ?? []).includes(it.id));
  const budget = items.reduce((s, it) => s + (it.budget ?? 0), 0);
  const chosenByUser = formData.routeChoice === 'tender' || formData.routeChoice === 'emarket';

  function draftPurpose() {
    if (!project) return;
    const sample = () => updateField('tenderingPurpose', isEmarket
      ? t(`The purpose of this purchase is to procure ${project.name} items directly from the Etimad eMarket catalogue through approved suppliers.`, `الغرض من هذا الشراء هو توفير بنود ${project.nameAr} مباشرة من كتالوج السوق الإلكتروني (اعتماد) عبر موردين معتمدين.`)
      : t(`The purpose of this tender is to procure ${project.name} services to enhance operational efficiency, support digital transformation objectives and ensure compliance with applicable regulations.`, `الغرض من هذه المنافسة هو ${project.nameAr} لتعزيز كفاءة العمليات ودعم أهداف التحول الرقمي وضمان الامتثال للأنظمة.`));
    purposeAi.run(() => aiPurpose(formData, isAr), (text) => updateField('tenderingPurpose', text), sample);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t('This request', 'هذا الطلب')}</p>
            <p className="text-[15px] font-semibold text-neutral-900 mt-0.5">{project ? (isAr ? project.nameAr : project.name) : '—'}</p>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {project?.code}{cc ? ` · ${isAr ? cc.nameAr : cc.name} (${cc.code})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isEmarket ? 'success' : 'warning'}>{isEmarket ? t('Etimad eMarket', 'السوق الإلكتروني') : t('Competitive Tender', 'منافسة')}</Badge>
            <span className="text-[11px] text-neutral-500">{chosenByUser ? t('chosen by you', 'باختيارك') : t('from the catalogue lookup', 'من البحث في الكتالوج')}</span>
          </div>
        </div>
        {items.length > 0 && (
          <p className="text-[12px] text-neutral-600 mt-3">
            {t(`${items.length} budgeted item${items.length > 1 ? 's' : ''}`, `${items.length} بند معتمد`)}
            {budget > 0 && <> · {t('Budget', 'الميزانية')} <span dir="ltr" className="font-semibold text-neutral-800">SAR {formatSAR(budget)}</span></>}
          </p>
        )}
      </div>

      <SectionCard
        title={isEmarket ? 'Purpose of purchase' : 'Purpose of tendering'}
        titleAr={isEmarket ? 'الغرض من الشراء' : 'الغرض من المنافسة'}
        action={<AIButton onClick={draftPurpose} loading={purposeAi.loading} label={t('Draft text', 'صياغة النص')} />}
      >
        <Textarea rows={3} value={formData.tenderingPurpose} onChange={(e) => updateField('tenderingPurpose', e.target.value)}
          placeholder={isEmarket ? t('Why are these items being purchased?', 'لماذا يتم شراء هذه البنود؟') : t('Why is this tender needed?', 'لماذا هذه المنافسة مطلوبة؟')} />
        <AiNote error={purposeAi.error} usedSample={purposeAi.usedSample} />
      </SectionCard>
    </div>
  );
}
