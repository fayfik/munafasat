import { useRef, useEffect, useState } from 'react';
import { useTender, SECTIONS } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button, Badge } from '../components/ui';
import {
  ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon, CheckIcon, ClockIcon,
} from '../components/Icons';
import { PROJECTS } from '../data/mockData';
import stepperWatermark from '../assets/figma/stepper-watermark.svg';
import type { SectionStatus } from '../types/tender';

// Section components
import ProcurementRouteStep from '../sections/ProcurementRouteStep';
import ProjectSetup from '../sections/ProjectSetup';
import ScopeOfWork from '../sections/ScopeOfWork';
import BillOfQuantities from '../sections/BillOfQuantities';
import PaymentSchedule from '../sections/PaymentSchedule';
import TechnicalEvaluation from '../sections/TechnicalEvaluation';
import QualificationCriteria from '../sections/QualificationCriteria';
import Attachments from '../sections/Attachments';
import StageReview, { LiveBudgetCheck, type ReviewMode } from '../sections/StageReview';
import { useRole } from '../context/RoleContext';

const SECTION_COMPONENTS: Record<string, () => React.ReactElement | null> = {
  'procurement-route': ProcurementRouteStep,
  'project-setup': ProjectSetup,
  'scope-of-work': ScopeOfWork,
  'boq': BillOfQuantities,
  'payment-schedule': PaymentSchedule,
  'technical-evaluation': TechnicalEvaluation,
  'qualification': QualificationCriteria,
  'attachments': Attachments,
};

/* ── v3 steps: each step groups one or more form sections ─────────────────── */
interface StepDef { key: string; en: string; ar: string; descEn: string; descAr: string; sections: string[]; review?: ReviewMode; owner: 'requester' | 'procurement' }
const REQ_TENDER: StepDef[] = [
  { key: 'need', en: 'Need & route', ar: 'الاحتياج والمسار', descEn: 'Project, budgeted items and how they are bought', descAr: 'المشروع والبنود المعتمدة وطريقة شرائها', sections: ['procurement-route'], owner: 'requester' },
  { key: 'requirements', en: 'Requirements', ar: 'المتطلبات', descEn: 'Purpose, scope, BOQ, duration and location', descAr: 'الغرض والنطاق وجدول الكميات والمدة والموقع', sections: ['project-setup', 'scope-of-work', 'boq'], owner: 'requester' },
  { key: 'submit', en: 'Review & send', ar: 'المراجعة والإرسال', descEn: 'Budget check, attachments, send to Procurement', descAr: 'فحص الميزانية والمرفقات والإرسال للمشتريات', sections: ['attachments', 'review'], review: 'req-submit', owner: 'requester' },
];
const EMARKET: StepDef[] = [
  REQ_TENDER[0],
  { key: 'basket', en: 'Basket', ar: 'السلة', descEn: 'Purpose, catalogue items and attachments', descAr: 'الغرض وبنود الكتالوج والمرفقات', sections: ['project-setup', 'boq', 'attachments'], owner: 'requester' },
  { key: 'submit', en: 'Review & submit', ar: 'المراجعة والإرسال', descEn: 'Budget check and approval', descAr: 'فحص الميزانية والاعتماد', sections: ['review'], review: 'emarket-submit', owner: 'requester' },
];
const PROC: StepDef[] = [
  { key: 'request', en: 'The request', ar: 'الطلب', descEn: 'What the requester asked for', descAr: 'ما طلبه مقدم الطلب', sections: ['review'], review: 'proc-request', owner: 'procurement' },
  { key: 'payment', en: 'Payment', ar: 'الدفعات', descEn: 'Payment stages from a template', descAr: 'مراحل الدفع من نموذج', sections: ['payment-schedule'], owner: 'procurement' },
  { key: 'evaluation', en: 'Evaluation', ar: 'التقييم', descEn: 'Technical and qualification criteria', descAr: 'المعايير الفنية ومعايير التأهيل', sections: ['technical-evaluation', 'qualification'], owner: 'procurement' },
  { key: 'send', en: 'Send for confirmation', ar: 'الإرسال للتأكيد', descEn: 'Check and send back to the requester', descAr: 'المراجعة والإعادة لمقدم الطلب', sections: ['review'], review: 'proc-send', owner: 'procurement' },
];
const CONFIRM: StepDef[] = [
  { key: 'confirm', en: 'Confirm RFP', ar: 'تأكيد الكراسة', descEn: 'Check Procurement’s additions and confirm', descAr: 'راجع إضافات المشتريات وأكّد', sections: ['review'], review: 'req-confirm', owner: 'requester' },
];
const STATUS: StepDef[] = [
  { key: 'status', en: 'Request status', ar: 'حالة الطلب', descEn: 'Where the request is now', descAr: 'أين الطلب الآن', sections: ['review'], review: 'status', owner: 'requester' },
];
const sIdx = (id: string) => SECTIONS.findIndex((x) => x.id === id);

interface Props {
  onBack: () => void;
}

export default function TenderForm({ onBack }: Props) {
  const { currentSection, goToSection, sectionStatuses, isSaving, lastSaved, formData, saveState, saveNow, submitted, status, routeConfirmed, v3Stage } = useTender();
  const { role } = useRole();
  const { isAr } = useLanguage();
  const t = useT();

  const mainRef = useRef<HTMLElement>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const isEsouq = routeConfirmed && formData.sourceType === 'souq-etimad';
  // Which steps this person sees depends on where the request is and who they are.
  const steps: StepDef[] =
    v3Stage === 'draft' ? (role === 'requester' ? (isEsouq ? EMARKET : REQ_TENDER) : STATUS)
    : v3Stage === 'with-procurement' ? (role === 'procurement' ? PROC : STATUS)
    : v3Stage === 'requester-confirm' ? (role === 'requester' ? CONFIRM : STATUS)
    : STATUS;
  const stepsSig = steps.map((x) => x.key).join('|');

  const [stepKey, setStepKey] = useState<string>(steps[0].key);
  // Keep the active step in sync when a section is opened from elsewhere (e.g. an Edit link),
  // and when the step list changes (stage hand-off or role switch).
  useEffect(() => {
    const cur = steps.find((x) => x.key === stepKey);
    const curId = SECTIONS[currentSection]?.id;
    if (!cur) { setStepKey(steps[0].key); return; }
    if (curId && !cur.sections.includes(curId)) {
      const owner = steps.find((x) => x.sections.includes(curId));
      if (owner) setStepKey(owner.key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, stepsSig]);

  const activePos = Math.max(0, steps.findIndex((x) => x.key === stepKey));
  const step = steps[activePos];

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [stepKey, currentSection]);

  function openStep(pos: number) {
    const target = steps[pos];
    if (!target) return;
    setStepKey(target.key);
    const first = target.sections[0];
    if (first !== 'review') goToSection(sIdx(first));
    else goToSection(sIdx('review'));
  }

  const stepDone = (x: StepDef) => x.sections.filter((id) => id !== 'review' && id !== 'attachments').every((id) => sectionStatuses[sIdx(id)] === 'completed')
    && x.sections.some((id) => id !== 'review' && id !== 'attachments');
  const visibleSteps = (v3Stage === 'draft' && role === 'requester' && !routeConfirmed) ? steps.slice(0, 1) : steps;
  const completedCount = steps.filter(stepDone).length;
  const completionPct = Math.round((completedCount / steps.length) * 100);
  const isFirstSection = activePos === 0;
  const isLastSection = activePos === steps.length - 1;

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);

  function formatSaved(d: Date) {
    return d.toLocaleTimeString(isAr ? 'ar-SA' : 'en-SA', { hour: '2-digit', minute: '2-digit' });
  }

  const sourceLabelEn = formData.sourceType === 'souq-etimad' ? 'Etimad E-Market' : 'Tender';
  const sourceLabelAr = formData.sourceType === 'souq-etimad' ? 'سوق اعتماد' : 'منافسة RFP';
  const sourceLabel = isAr ? sourceLabelAr : sourceLabelEn;

  const newLabel = formData.sourceType === 'souq-etimad' ? t('New Purchase Request', 'طلب شراء جديد') : t('New Tender Request', 'طلب منافسة جديد');
  const headerTitle = isAr
    ? (selectedProject?.nameAr ?? newLabel)
    : (selectedProject?.name ?? newLabel);

  const sectionTitle = isAr ? step.ar : step.en;
  const stageLabel: Record<string, [string, string]> = {
    'draft': ['Draft', 'مسودة'], 'with-procurement': ['With Procurement', 'لدى المشتريات'],
    'requester-confirm': ['Awaiting confirmation', 'بانتظار التأكيد'], 'in-approval': ['In approval', 'قيد الاعتماد'],
  };

  return (
    /* TenderForm fills the AppShell <main> which is overflow-hidden flex flex-col */
    <div className="flex flex-col h-full">

      {/* ── Sub-header: breadcrumb + save status + actions ──────────── */}
      <div
        className="tender-subheader min-h-12 py-2 flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 shrink-0 z-10"
        style={{
          backgroundColor: 'var(--color-surface-card)',
          borderBottom: '1px solid var(--color-nav-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-body-sm transition-colors"
            style={{ color: 'var(--color-nav-muted)' }}
          >
            <ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
            {t('My Requests', 'طلباتي')}
          </button>
          <span style={{ color: 'var(--color-nav-border)' }} className="text-sm">/</span>
          <div className="flex items-center gap-2">
            <span
              className="text-label-lg font-semibold max-w-xs truncate"
              style={{ color: 'var(--color-nav-text)' }}
              title={headerTitle}
            >
              {headerTitle}
            </span>
            <Badge variant={v3Stage === 'draft' ? 'draft' : v3Stage === 'in-approval' ? 'submitted' : 'info'}>
              {t(stageLabel[v3Stage][0], stageLabel[v3Stage][1])}
            </Badge>
            <Badge variant={formData.sourceType === 'souq-etimad' ? 'default' : 'info'}>
              {sourceLabel}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSaving ? (
            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--color-nav-muted)' }}>
              <ClockIcon className="w-3 h-3 spin-slow" />
              {t('Saving…', 'جاري الحفظ…')}
            </span>
          ) : saveState === 'error' ? (
            <span className="text-[11px] text-error-600">{t('Not saved. You may only have view access.', 'لم يُحفظ. قد تكون صلاحيتك للعرض فقط.')}</span>
          ) : saveState === 'unavailable' ? (
            <span className="text-[11px]" style={{ color: 'var(--color-nav-muted)' }}>{t('Preview mode: changes are not saved', 'وضع المعاينة: التغييرات لا تُحفظ')}</span>
          ) : lastSaved ? (
            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--color-nav-muted)' }}>
              <CheckIcon className="w-3 h-3 text-brand-400" />
              {t('Saved', 'تم الحفظ')} {formatSaved(lastSaved)}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Body: sections navigator sidebar + main form content ─────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sections sidebar — matches Figma "Section rail frame - Creation" (125:3457) */}
        <aside className={`hidden md:flex ${railCollapsed ? 'w-[64px]' : 'w-[240px]'} flex-shrink-0 bg-white border-e border-[#DDE1E7] overflow-y-auto overflow-x-hidden flex-col transition-[width] duration-200`}>
          {/* Header: progress + collapse toggle */}
          <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-[#F0F2F5]">
            <div className="flex items-center">
              {!railCollapsed && <p className="text-[10px] font-semibold text-[#9AA3AF] uppercase tracking-[1px]">{t('Progress', 'التقدم')}</p>}
              <button
                type="button"
                onClick={() => setRailCollapsed((v) => !v)}
                title={railCollapsed ? t('Expand', 'توسيع') : t('Collapse', 'طي')}
                aria-label={railCollapsed ? t('Expand', 'توسيع') : t('Collapse', 'طي')}
                className="ms-auto w-6 h-6 rounded-md text-[#9AA3AF] hover:bg-[#F0F2F5] hover:text-[#5B6B85] flex items-center justify-center transition-colors"
              >
                <span className="text-[13px] leading-none">{railCollapsed ? '»' : '«'}</span>
              </button>
            </div>
            {!railCollapsed && steps.length > 1 && (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-[6px] bg-[#F0F2F5] rounded-full overflow-hidden">
                    <div className="h-full bg-step-done rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-step-done">{completionPct}%</span>
                </div>
                <p className="mt-1 text-[10px] text-[#9AA3AF]">{t(`${completedCount} of ${steps.length} steps complete`, `${completedCount} من ${steps.length} خطوات مكتملة`)}</p>
              </>
            )}
          </div>

          {/* Stepper — connecting lines + circles; description shows on hover when collapsed.
              Before the route is confirmed, only Step 1 is shown, followed by a single
              subtle "Awaiting procurement route confirmation" pending node. */}
          <nav className={`flex flex-col pt-3 flex-1 ${railCollapsed ? 'items-center px-0' : 'px-3'}`}>
            {visibleSteps.map((x, pos) => {
              const isCurrent = pos === activePos;
              const done = stepDone(x) && !isCurrent;
              const isLast = pos === visibleSteps.length - 1 && (routeConfirmed || v3Stage !== 'draft');
              const title = isAr ? x.ar : x.en;
              const desc = isAr ? x.descAr : x.descEn;
              const cstate = done ? 'done' : isCurrent ? 'current' : 'pending';
              return (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => openStep(pos)}
                  aria-current={isCurrent ? 'step' : undefined}
                  title={railCollapsed ? `${title} — ${desc}` : undefined}
                  className={`group w-full flex gap-2.5 text-start ${railCollapsed ? 'justify-center' : ''} cursor-pointer`}
                >
                  <div className="relative flex flex-col items-center w-[22px] shrink-0">
                    <StepCircle state={cstate} num={pos + 1} />
                    {!isLast && <div className={`w-[2px] flex-1 min-h-[16px] ${done ? 'bg-step-done' : 'bg-[#E3E8F0]'}`} />}
                  </div>
                  {!railCollapsed && (
                    <div className="flex-1 min-w-0 pb-4">
                      <div className={`rounded-lg px-2 py-1.5 -mt-1 transition-colors ${isCurrent ? 'bg-step-current' : 'group-hover:bg-[#F8F9FB]'}`}>
                        <p className={`text-[12.5px] font-semibold leading-tight ${isCurrent ? 'text-step-done' : done ? 'text-[#2B3647]' : 'text-[#5B6B85]'}`}>{title}</p>
                        <p className="text-[11px] leading-snug mt-0.5 text-neutral-500">{desc}</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Pending placeholder — stands in for the hidden steps until the route is confirmed */}
            {!routeConfirmed && v3Stage === 'draft' && (
              <div className={`w-full flex gap-2.5 ${railCollapsed ? 'justify-center' : ''}`}
                   title={railCollapsed ? t('Awaiting procurement route confirmation', 'بانتظار تأكيد مسار الشراء') : undefined}>
                <div className="relative flex flex-col items-center w-[22px] shrink-0">
                  <span className="relative w-[22px] h-[22px] rounded-full border-2 border-dashed border-[#C9D0D9] bg-white flex items-center justify-center z-10">
                    <span className="absolute w-[10px] h-[10px] rounded-full bg-step-done/40 blip-ring" />
                    <span className="w-[7px] h-[7px] rounded-full bg-step-done blip-dot" />
                  </span>
                </div>
                {!railCollapsed && (
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="rounded-lg px-2 py-1.5 -mt-1">
                      <p className="text-[12.5px] font-semibold leading-tight text-[#5B6B85]">
                        {t('Awaiting procurement route confirmation', 'بانتظار تأكيد مسار الشراء')}
                      </p>
                      <p className="text-[11px] leading-snug mt-0.5 text-neutral-400 italic">
                        {t('The remaining steps appear once the route is confirmed.', 'تظهر بقية الخطوات بعد تأكيد مسار الشراء.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>


          {!railCollapsed && <Journey stage={v3Stage} emarket={formData.sourceType === 'souq-etimad'} />}

          {!railCollapsed && (
            <img src={stepperWatermark} alt="" aria-hidden="true" width={240} height={96} className="mt-auto block shrink-0 pointer-events-none select-none rtl:-scale-x-100" />
          )}
        </aside>

        {/* Main form content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-surface">
          {/* One width for every step (wide), so the page doesn't jump between steps or BOQ views */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="mb-7">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">
                {steps.length > 1 ? t(`Step ${activePos + 1} of ${steps.length}`, `خطوة ${activePos + 1} من ${steps.length}`) : t(role === 'procurement' ? 'Procurement view' : 'Requester view', role === 'procurement' ? 'عرض المشتريات' : 'عرض مقدم الطلب')}
                {step.owner === 'procurement' && <span className="ms-2 normal-case tracking-normal font-medium text-neutral-400">· {t('completed by Procurement', 'تكملها المشتريات')}</span>}
              </p>
              <h2 className="text-title-md font-semibold text-neutral-900 leading-tight">
                {sectionTitle}
              </h2>
            </div>

            <div className="space-y-5">
              {step.sections.includes('boq') && routeConfirmed && <LiveBudgetCheck />}
              {step.sections.map((id) => {
                if (id === 'review') return <StageReview key={`${step.key}-review`} mode={step.review ?? 'status'} />;
                const Comp = SECTION_COMPONENTS[id];
                return Comp ? <Comp key={id} /> : null;
              })}
            </div>

            {/* Step navigation — hidden on the Procurement Route step, which drives its own flow */}
            {step.key !== 'need' && steps.length > 1 && (
            <div className="flex items-center justify-between gap-3 flex-wrap mt-8 pt-6 border-t border-neutral-200">
              <Button variant="ghost" onClick={() => openStep(activePos - 1)} disabled={isFirstSection}>
                <ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                {t('Back', 'رجوع')}
              </Button>
              <div className="flex items-center gap-3">
                {!submitted && <Button variant="secondary" size="md" onClick={() => saveNow()} loading={isSaving}>{t('Save Draft', 'حفظ كمسودة')}</Button>}
                {!isLastSection ? (
                  <Button variant="primary" size="md" onClick={() => openStep(activePos + 1)}>
                    {t('Continue', 'متابعة')}
                    <svg className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Button>
                ) : null}
              </div>
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StepCircle({ state, num }: { state: 'done' | 'current' | 'locked' | 'pending'; num: number }) {
  if (state === 'done') {
    return (
      <div className="w-[22px] h-[22px] rounded-full bg-step-done flex items-center justify-center flex-shrink-0 z-10">
        <CheckIcon className="w-3 h-3 text-white" />
      </div>
    );
  }
  if (state === 'current') {
    return (
      <div className="w-[22px] h-[22px] rounded-full bg-step-done flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-[#E3F1E6]">
        <span className="text-white text-[10px] font-bold">{num}</span>
      </div>
    );
  }
  const dim = state === 'locked';
  return (
    <div className={`w-[22px] h-[22px] rounded-full border-2 bg-white flex items-center justify-center flex-shrink-0 z-10 ${dim ? 'border-[#E8ECF1]' : 'border-[#C9D0D9]'}`}>
      <span className={`text-[10px] font-semibold ${dim ? 'text-neutral-300' : 'text-[#9AA3AF]'}`}>{num}</span>
    </div>
  );
}

function getSidebarStatusLabel(s: SectionStatus, isAr: boolean) {
  if (s === 'completed') return isAr ? 'مكتمل' : 'Completed';
  if (s === 'in-progress') return isAr ? 'جارٍ التنفيذ' : 'In progress';
  if (s === 'missing') return isAr ? 'معلومات ناقصة' : 'Missing info';
  return isAr ? 'لم يبدأ' : 'Not started';
}

function getSidebarStatusColor(s: SectionStatus) {
  if (s === 'completed') return 'text-step-done';
  if (s === 'in-progress') return 'text-step-done';
  if (s === 'missing') return 'text-warning-600';
  return 'text-[#9AA3AF]';
}

/** Where the request is in the Requester ↔ Procurement hand-off. */
function Journey({ stage, emarket }: { stage: string; emarket: boolean }) {
  const t = useT();
  const phases = emarket
    ? [['draft', 'Requester prepares', 'مقدم الطلب يُعد'], ['in-approval', 'Approvals', 'الاعتمادات']]
    : [['draft', 'Requester prepares', 'مقدم الطلب يُعد'], ['with-procurement', 'Procurement completes', 'المشتريات تُكمل'], ['requester-confirm', 'Requester confirms', 'مقدم الطلب يؤكد'], ['in-approval', 'Approvals', 'الاعتمادات']];
  const cur = Math.max(0, phases.findIndex(([k]) => k === stage));
  return (
    <div className="mx-3 mb-3 rounded-lg border border-[#E3E8F0] bg-[#F8F9FB] px-3 py-2.5">
      <p className="text-[10px] font-semibold text-[#9AA3AF] uppercase tracking-[1px] mb-1.5">{t('Hand-off', 'التسليم')}</p>
      <ol className="space-y-1">
        {phases.map(([k, en, ar], i) => (
          <li key={k} className="flex items-center gap-2 text-[11.5px]">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i < cur ? 'bg-step-done' : i === cur ? 'bg-step-done ring-4 ring-[#E3F1E6]' : 'bg-[#D5DAE1]'}`} />
            <span className={i === cur ? 'font-semibold text-[#2B3647]' : i < cur ? 'text-neutral-600' : 'text-neutral-400'}>{t(en, ar)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
