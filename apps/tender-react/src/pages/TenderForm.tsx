import { useRef, useEffect } from 'react';
import { useTender, SECTIONS } from '../context/TenderContext';
import { useLanguage, useT } from '../context/LanguageContext';
import { Button, Badge } from '../components/ui';
import {
  ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon, CheckIcon, ClockIcon, SidfMark,
} from '../components/Icons';
import { PROJECTS } from '../data/mockData';
import { useBoqLayout } from '../lib/boqLayout';
import type { SectionStatus } from '../types/tender';

// Section components
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
  const { currentSection, goToSection, sectionStatuses, isSaving, lastSaved, formData, saveState, saveNow, submit, readyToSubmit, isSubmitting, submitted, status } = useTender();
  const { isAr } = useLanguage();
  const boqLayout = useBoqLayout();
  const wide = currentSection === 2 && boqLayout === 'sheet';
  const t = useT();

  const mainRef = useRef<HTMLElement>(null);

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
        {/* Sections sidebar */}
        <aside className="hidden md:flex w-56 flex-shrink-0 bg-white border-e border-neutral-200 overflow-y-auto overflow-x-hidden flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
                {t('Progress', 'التقدم')}
              </p>
              <span className="text-[11px] font-bold text-brand-600">{completionPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-progress rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5">
              {t(
                `${completedCount} of ${SECTIONS.length} sections complete`,
                `${completedCount} من ${SECTIONS.length} أقسام مكتملة`
              )}
            </p>
          </div>

          <div className="px-3 py-3 flex-1">
            <nav className="space-y-0.5">
              {SECTIONS.map((sec, idx) => {
                const status = sectionStatuses[idx];
                const isCurrent = idx === currentSection;
                return (
                  <button
                    key={sec.id}
                    onClick={() => goToSection(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-start transition-all ${
                      isCurrent
                        ? 'bg-active text-blue-900'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    <SidebarIcon status={status} active={isCurrent} num={idx + 1} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] truncate ${isCurrent ? 'font-semibold text-blue-900' : 'font-medium text-neutral-700'}`}>
                        {isAr ? sec.titleAr : sec.title}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${getSidebarStatusColor(status)}`}>
                        {getSidebarStatusLabel(status, isAr)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {missingCount > 0 && (
              <div className="mt-4 p-3 bg-warning-50 rounded-lg border border-warning-200">
                <p className="text-[11px] font-semibold text-warning-800">
                  {isAr
                    ? `${missingCount} ${missingCount === 1 ? 'قسم' : 'أقسام'} غير مكتملة`
                    : `${missingCount} section${missingCount > 1 ? 's' : ''} incomplete`}
                </p>
                <p className="text-[10px] text-warning-700 mt-0.5">
                  {t('Required fields are missing.', 'حقول مطلوبة مفقودة.')}
                </p>
              </div>
            )}
          </div>
          {/* Footer: enlarged SIDF mark, partly cropped, as a quiet brand watermark */}
          <div className="relative mt-auto h-36 shrink-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
            <SidfMark className="absolute -bottom-10 -start-14 w-[300px] h-auto text-brand-600 opacity-[0.09] rtl:-scale-x-100" />
          </div>
        </aside>

        {/* Main form content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-surface">
          <div className={`${wide ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-4 sm:px-6 py-8`}>
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

            {/* Step navigation */}
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
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarIcon({ status, active, num }: { status: SectionStatus; active: boolean; num: number }) {
  if (active) {
    return (
      <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white text-[10px] font-bold">{num}</span>
      </div>
    );
  }
  if (status === 'completed') {
    return <CheckCircleIcon className="w-5 h-5 text-progress flex-shrink-0" />;
  }
  if (status === 'missing') {
    return <ExclamationCircleIcon className="w-5 h-5 text-warning-600 flex-shrink-0" />;
  }
  return (
    <div className="w-5 h-5 rounded-full border-2 border-neutral-300 flex items-center justify-center flex-shrink-0">
      <span className="text-neutral-400 text-[9px] font-medium">{num}</span>
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
  if (s === 'completed') return 'text-success-600';
  if (s === 'in-progress') return 'text-brand-600';
  if (s === 'missing') return 'text-warning-600';
  return 'text-neutral-400';
}
