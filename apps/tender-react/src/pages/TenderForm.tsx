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
import Deliverables from '../sections/Deliverables';
import PaymentSchedule from '../sections/PaymentSchedule';
import TechnicalEvaluation from '../sections/TechnicalEvaluation';
import QualificationCriteria from '../sections/QualificationCriteria';
import Attachments from '../sections/Attachments';
import ReviewConfirm from '../sections/ReviewConfirm';

const SECTION_COMPONENTS = [
  ProcurementRouteStep,
  ProjectSetup,
  ScopeOfWork,
  BillOfQuantities,
  Deliverables,
  PaymentSchedule,
  TechnicalEvaluation,
  QualificationCriteria,
  Attachments,
  ReviewConfirm,
];

interface Props {
  onBack: () => void;
}

export default function TenderForm({ onBack }: Props) {
  const { currentSection, goToSection, sectionStatuses, isSaving, lastSaved, formData, saveState, saveNow, submit, readyToSubmit, isSubmitting, submitted, status, routeConfirmed } = useTender();
  const { isAr } = useLanguage();
  const t = useT();

  const mainRef = useRef<HTMLElement>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentSection]);

  const CurrentSection = SECTION_COMPONENTS[currentSection];
  const isLastSection = currentSection === SECTIONS.length - 1;
  const isFirstSection = currentSection === 0;

  const selectedProject = PROJECTS.find((p) => p.id === formData.projectId);
  const completedCount = sectionStatuses.filter((s) => s === 'completed').length;
  const completionPct = Math.round((completedCount / SECTIONS.length) * 100);
  const missingCount = sectionStatuses.filter((s) => s === 'missing').length;

  function formatSaved(d: Date) {
    return d.toLocaleTimeString(isAr ? 'ar-SA' : 'en-SA', { hour: '2-digit', minute: '2-digit' });
  }

  const sourceLabelEn = formData.sourceType === 'souq-etimad' ? 'Etimad Souq' : 'Tender';
  const sourceLabelAr = formData.sourceType === 'souq-etimad' ? 'سوق اعتماد' : 'منافسة RFP';
  const sourceLabel = isAr ? sourceLabelAr : sourceLabelEn;

  const headerTitle = isAr
    ? (selectedProject?.nameAr ?? t('New Tender Request', 'طلب منافسة جديد'))
    : (selectedProject?.name ?? 'New Tender Request');

  const currentSec = SECTIONS[currentSection];
  const sectionTitle = isAr ? currentSec.titleAr : currentSec.title;

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
            <Badge variant={status === 'draft' ? 'draft' : status === 'returned' ? 'rejected' : status === 'approved' ? 'approved' : 'submitted'}>
              {status === 'draft' ? t('Draft', 'مسودة') : status === 'submitted' ? t('Submitted', 'مُقدَّم') : status === 'under-review' ? t('Under Review', 'قيد المراجعة') : status === 'approved' ? t('Approved', 'معتمد') : t('Returned', 'مرتجع')}
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
            {!railCollapsed && (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-[6px] bg-[#F0F2F5] rounded-full overflow-hidden">
                    <div className="h-full bg-step-done rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-step-done">{completionPct}%</span>
                </div>
                <p className="mt-1 text-[10px] text-[#9AA3AF]">{t(`${completedCount} of ${SECTIONS.length} sections complete`, `${completedCount} من ${SECTIONS.length} أقسام مكتملة`)}</p>
              </>
            )}
          </div>

          {/* Stepper — connecting lines + circles; description shows on hover when collapsed */}
          <nav className={`flex flex-col pt-3 flex-1 ${railCollapsed ? 'items-center px-0' : 'px-3'}`}>
            {SECTIONS.map((sec, idx) => {
              const status = sectionStatuses[idx];
              const isCurrent = idx === currentSection;
              const locked = idx > 0 && !routeConfirmed;
              const done = status === 'completed';
              const isLast = idx === SECTIONS.length - 1;
              const title = isAr ? sec.titleAr : sec.title;
              const desc = locked ? t('Awaiting route confirmation', 'بانتظار تأكيد المسار') : (isAr ? sec.descAr : sec.desc);
              const cstate = done ? 'done' : isCurrent ? 'current' : locked ? 'locked' : 'pending';
              return (
                <button
                  key={sec.id}
                  type="button"
                  disabled={locked}
                  onClick={() => { if (!locked) goToSection(idx); }}
                  aria-current={isCurrent ? 'step' : undefined}
                  title={railCollapsed ? `${title} — ${desc}` : undefined}
                  className={`group w-full flex gap-2.5 text-start ${railCollapsed ? 'justify-center' : ''} ${locked ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="relative flex flex-col items-center w-[22px] shrink-0">
                    <StepCircle state={cstate} num={idx + 1} />
                    {!isLast && <div className={`w-[2px] flex-1 min-h-[16px] ${done ? 'bg-step-done' : 'bg-[#E3E8F0]'}`} />}
                  </div>
                  {!railCollapsed && (
                    <div className="flex-1 min-w-0 pb-4">
                      <div className={`rounded-lg px-2 py-1.5 -mt-1 transition-colors ${isCurrent ? 'bg-step-current' : locked ? '' : 'group-hover:bg-[#F8F9FB]'}`}>
                        <p className={`text-[12.5px] font-semibold leading-tight ${isCurrent ? 'text-step-done' : locked ? 'text-neutral-300' : done ? 'text-[#2B3647]' : 'text-[#5B6B85]'}`}>{title}</p>
                        <p className={`text-[11px] leading-snug mt-0.5 ${locked ? 'text-neutral-300 italic' : 'text-neutral-400'}`}>{desc}</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {missingCount > 0 && !railCollapsed && (
            <div className="mx-3 mb-3 p-3 bg-warning-50 rounded-lg border border-warning-200">
              <p className="text-[11px] font-semibold text-warning-800">
                {isAr ? `${missingCount} ${missingCount === 1 ? 'قسم' : 'أقسام'} غير مكتملة` : `${missingCount} section${missingCount > 1 ? 's' : ''} incomplete`}
              </p>
              <p className="text-[10px] text-warning-700 mt-0.5">{t('Required fields are missing.', 'حقول مطلوبة مفقودة.')}</p>
            </div>
          )}

          {!railCollapsed && (
            <img src={stepperWatermark} alt="" aria-hidden="true" width={240} height={96} className="mt-auto block shrink-0 pointer-events-none select-none rtl:-scale-x-100" />
          )}
        </aside>

        {/* Main form content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-surface">
          {/* One width for every step (wide), so the page doesn't jump between steps or BOQ views */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="mb-7">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">
                {t(`Step ${currentSection + 1} of ${SECTIONS.length}`, `خطوة ${currentSection + 1} من ${SECTIONS.length}`)}
              </p>
              <h2 className="text-title-md font-semibold text-neutral-900 leading-tight">
                {sectionTitle}
              </h2>
            </div>

            <div className="space-y-5">
              <CurrentSection />
            </div>

            {/* Step navigation — hidden on the Procurement Route step, which drives its own flow */}
            {!isFirstSection && (
            <div className="flex items-center justify-between gap-3 flex-wrap mt-8 pt-6 border-t border-neutral-200">
              <Button variant="ghost" onClick={() => goToSection(currentSection - 1)} disabled={isFirstSection}>
                <ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                {t('Back', 'رجوع')}
              </Button>
              <div className="flex items-center gap-3">
                {!submitted && <Button variant="secondary" size="md" onClick={() => saveNow()} loading={isSaving}>{t('Save Draft', 'حفظ كمسودة')}</Button>}
                {!isLastSection ? (
                  <Button variant="primary" size="md" onClick={() => goToSection(currentSection + 1)}>
                    {t('Continue', 'متابعة')}
                    <svg className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Button>
                ) : !submitted ? (
                  <Button variant="primary" size="md" onClick={() => submit()} disabled={!readyToSubmit} loading={isSubmitting}
                    title={readyToSubmit ? undefined : t('Complete all required sections first', 'أكمل جميع الأقسام المطلوبة أولاً')}>
                    <CheckIcon className="w-4 h-4" />
                    {status === 'draft' ? t('Submit Request', 'تقديم الطلب') : t('Resubmit Request', 'إعادة تقديم الطلب')}
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
