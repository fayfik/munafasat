import { useEffect, useState } from 'react';
import { useRequests } from '../context/RequestStore';
import { Badge } from '../components/ui';
import {
  PlusIcon, ClockIcon, DocumentIcon, CheckCircleIcon,
  ChevronRightIcon, ChevronDownIcon, SparklesIcon, SearchIcon, WandIcon, XIcon,
} from '../components/Icons';
import { useT, useLanguage } from '../context/LanguageContext';
import type { TenderStatus } from '../types/tender';

/* ────────────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────────────── */
function getGreeting(isAr: boolean) {
  const h = new Date().getHours();
  if (isAr) return h < 12 ? 'صباح الخير' : 'مساء الخير';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Count-up animation: eases 0 → target. Kept short so the dashboard settles fast. */
function useCountUp(target: number, duration = 450) {
  const [v, setV] = useState(target);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function useMounted(delay = 20) {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = window.setTimeout(() => setOn(true), delay); return () => window.clearTimeout(id); }, [delay]);
  return on;
}

type FilterKey = TenderStatus | 'all';
type DrillKind = 'drafts' | 'submissions' | 'approvals';

interface Props {
  onNewRequest: (sourceType?: 'tendering' | 'souq-etimad') => void;
  onOpenRequest: (id: string) => void;
  onViewRequests: (filter?: FilterKey) => void;
}

/* ────────────────────────────────────────────────────────────────────────
   Demo content (design-review data that mirrors the mock-ups)
──────────────────────────────────────────────────────────────────────── */
const DRAFT_ROWS = [
  { id: 'RFP-2026-041', title: 'SAP S/4HANA Implementation', titleAr: 'تطبيق SAP S/4HANA', updated: 'Today, 10:32 AM', updatedAr: 'اليوم، 10:32 ص' },
  { id: 'RFP-2026-038', title: 'IT Infrastructure Services', titleAr: 'خدمات البنية التحتية التقنية', updated: 'Today, 09:15 AM', updatedAr: 'اليوم، 09:15 ص' },
  { id: 'RFP-2026-035', title: 'Office Equipment', titleAr: 'معدات مكتبية', updated: 'Yesterday', updatedAr: 'أمس' },
  { id: 'RFP-2026-029', title: 'Consulting Services', titleAr: 'خدمات استشارية', updated: '2 days ago', updatedAr: 'قبل يومين' },
];
const SUBMISSION_ROWS = [
  { id: 'RFP-2026-041', title: 'SAP S/4HANA Implementation', titleAr: 'تطبيق SAP S/4HANA', updated: '16 Sep 2026', state: 'Awaiting Approval', stateAr: 'بانتظار الموافقة', variant: 'submitted' as const },
  { id: 'RFP-2026-038', title: 'IT Infrastructure Services', titleAr: 'خدمات البنية التحتية التقنية', updated: '15 Sep 2026', state: 'Under Review', stateAr: 'قيد المراجعة', variant: 'submitted' as const },
  { id: 'RFP-2026-035', title: 'Office Equipment', titleAr: 'معدات مكتبية', updated: '14 Sep 2026', state: 'Approved', stateAr: 'معتمد', variant: 'approved' as const },
  { id: 'RFP-2026-029', title: 'Consulting Services', titleAr: 'خدمات استشارية', updated: '12 Sep 2026', state: 'Procurement Review', stateAr: 'مراجعة المشتريات', variant: 'info' as const },
];
const APPROVAL_ROWS = [
  { id: 'RFP-2026-041', title: 'SAP Implementation', titleAr: 'تطبيق SAP', by: 'Ahmed Al-Salem', byAr: 'أحمد السالم', since: 'Today', sinceAr: 'اليوم' },
  { id: 'RFP-2026-038', title: 'IT Managed Services', titleAr: 'خدمات تقنية مُدارة', by: 'Sara Ahmed', byAr: 'سارة أحمد', since: 'Yesterday', sinceAr: 'أمس' },
  { id: 'RFP-2026-035', title: 'Data Center Services', titleAr: 'خدمات مركز البيانات', by: 'Mohammed Ali', byAr: 'محمد علي', since: 'Yesterday', sinceAr: 'أمس' },
  { id: 'RFP-2026-029', title: 'Consulting Services', titleAr: 'خدمات استشارية', by: 'Mohammed Ali', byAr: 'محمد علي', since: '2 days ago', sinceAr: 'قبل يومين' },
];

interface StatusSeg { key: string; status: FilterKey; labelEn: string; labelAr: string; count: number; pct: number; color: string; }
const SEGMENTS: StatusSeg[] = [
  { key: 'draft',        status: 'draft',        labelEn: 'Draft',        labelAr: 'مسودة',        count: 6, pct: 18, color: '#9ca3af' },
  { key: 'submitted',    status: 'submitted',    labelEn: 'Submitted',    labelAr: 'مُقدَّم',       count: 8, pct: 24, color: '#3b6fd4' },
  { key: 'under-review', status: 'under-review', labelEn: 'Under Review', labelAr: 'قيد المراجعة', count: 9, pct: 27, color: '#c8912f' },
  { key: 'active-rfp',   status: 'approved',     labelEn: 'Active RFP',   labelAr: 'منافسة نشطة',  count: 9, pct: 27, color: '#4f8a3d' },
  { key: 'awarded',      status: 'all',          labelEn: 'Awarded',      labelAr: 'تمت الترسية',  count: 1, pct: 3,  color: '#86b562' },
];

interface StatusReq { id: string; descEn: string; descAr: string; projectEn: string; projectAr: string; created: string; }
const STATUS_REQUESTS: Record<string, StatusReq[]> = {
  draft: [
    { id: 'RFP-2026-041', descEn: 'End-to-end SAP S/4HANA implementation', descAr: 'تطبيق SAP S/4HANA متكامل', projectEn: 'Digital Transformation Program', projectAr: 'برنامج التحول الرقمي', created: '03 Sept 2026' },
    { id: 'RFP-2026-038', descEn: 'Managed IT infrastructure services', descAr: 'خدمات بنية تحتية تقنية مُدارة', projectEn: 'IT Operations FY26', projectAr: 'عمليات تقنية المعلومات 2026', created: '05 Sept 2026' },
    { id: 'RFP-2026-035', descEn: 'Office equipment refresh for HQ', descAr: 'تحديث معدات المكتب الرئيسي', projectEn: 'Facilities Operations FY26', projectAr: 'عمليات المرافق 2026', created: '06 Sept 2026' },
  ],
  submitted: [
    { id: 'RFP-2024-049', descEn: 'Enroll and manage staff mobile devices centrally', descAr: 'إدارة أجهزة الموظفين المحمولة مركزياً', projectEn: 'Workplace Mobility', projectAr: 'تنقل بيئة العمل', created: '12 Nov 2024' },
    { id: 'PR-2024-126',  descEn: 'Ergonomic seating for the new onboarding team', descAr: 'مقاعد مريحة لفريق التهيئة الجديد', projectEn: 'Facilities Operations FY24', projectAr: 'عمليات المرافق 2024', created: '09 Nov 2024' },
    { id: 'RFP-2024-040', descEn: 'Annual software license renewal', descAr: 'تجديد تراخيص البرمجيات السنوية', projectEn: 'IT Operations FY24', projectAr: 'عمليات تقنية المعلومات 2024', created: '02 Nov 2024' },
  ],
  'under-review': [
    { id: 'RFP-2024-031', descEn: 'Migrate core workloads to a managed cloud subscription', descAr: 'ترحيل الأحمال الأساسية إلى اشتراك سحابي مُدار', projectEn: 'Digital Transformation Program', projectAr: 'برنامج التحول الرقمي', created: '25 Aug 2024' },
    { id: 'RFP-2024-032', descEn: 'Ongoing support and configuration for the ERP platform', descAr: 'دعم وتهيئة مستمرة لمنصة تخطيط الموارد', projectEn: 'Digital Transformation Program', projectAr: 'برنامج التحول الرقمي', created: '28 Aug 2024' },
    { id: 'RFP-2024-033', descEn: 'Contracted security personnel for HQ premises', descAr: 'أفراد أمن متعاقدون لمقر الإدارة', projectEn: 'Corporate Security Program', projectAr: 'برنامج الأمن المؤسسي', created: '01 Sept 2024' },
    { id: 'RFP-2024-034', descEn: 'External training curriculum for staff development', descAr: 'منهج تدريب خارجي لتطوير الموظفين', projectEn: 'Corporate Services Program', projectAr: 'برنامج الخدمات المؤسسية', created: '04 Sept 2024' },
    { id: 'RFP-2024-035', descEn: 'Catering vendor for recurring corporate events', descAr: 'مورّد تموين للفعاليات المؤسسية المتكررة', projectEn: 'Facilities Operations FY24', projectAr: 'عمليات المرافق 2024', created: '08 Sept 2024' },
  ],
  'active-rfp': [
    { id: 'RFP-2024-050', descEn: 'Off-site backup and DR services for core systems', descAr: 'نسخ احتياطي خارجي وتعافٍ من الكوارث', projectEn: 'Business Continuity FY24', projectAr: 'استمرارية الأعمال 2024', created: '14 Nov 2024' },
    { id: 'RFP-2024-046', descEn: 'Network switches and access points for HQ', descAr: 'محولات شبكة ونقاط وصول للمقر', projectEn: 'IT Infrastructure FY24', projectAr: 'البنية التحتية 2024', created: '13 Nov 2024' },
  ],
  awarded: [
    { id: 'RFP-2024-021', descEn: 'Annual facilities maintenance contract', descAr: 'عقد صيانة المرافق السنوي', projectEn: 'Facilities Operations FY24', projectAr: 'عمليات المرافق 2024', created: '20 Jun 2024' },
  ],
};

const RECENT_ROWS: { id: string; descEn: string; descAr: string; type: 'RFP' | 'PR'; stageEn: string; stageAr: string; status: TenderStatus; updated: string }[] = [
  { id: 'RFP-2024-053', descEn: 'End-to-end SAP S/4HANA implementation across finance, procurement, and materials management', descAr: 'تطبيق SAP S/4HANA متكامل عبر المالية والمشتريات والمواد', type: 'RFP', stageEn: 'Technical Evaluation in Progress', stageAr: 'التقييم الفني جارٍ', status: 'under-review', updated: '23 Sept 2026' },
  { id: 'RFP-2024-049', descEn: 'Enroll and manage staff mobile devices centrally', descAr: 'إدارة أجهزة الموظفين المحمولة مركزياً', type: 'RFP', stageEn: 'Pending Manager Approval', stageAr: 'بانتظار موافقة المدير', status: 'submitted', updated: '17 Nov 2024' },
  { id: 'RFP-2024-048', descEn: 'Interactive security awareness training for all staff', descAr: 'تدريب تفاعلي للتوعية الأمنية لجميع الموظفين', type: 'RFP', stageEn: 'Draft Preparation', stageAr: 'إعداد المسودة', status: 'draft', updated: '16 Nov 2024' },
  { id: 'RFP-2024-050', descEn: 'Off-site backup and DR services for core systems', descAr: 'نسخ احتياطي خارجي وتعافٍ من الكوارث للأنظمة الأساسية', type: 'RFP', stageEn: 'Vendor Proposals Open', stageAr: 'عروض الموردين مفتوحة', status: 'approved', updated: '14 Nov 2024' },
  { id: 'RFP-2024-045', descEn: 'Network switches and access points for HQ floors 3-5', descAr: 'محولات شبكة ونقاط وصول لطوابق المقر 3-5', type: 'RFP', stageEn: 'Draft Preparation', stageAr: 'إعداد المسودة', status: 'draft', updated: '13 Nov 2024' },
  { id: 'RFP-2024-044', descEn: 'Refresh employee laptops for the IT division', descAr: 'تحديث حواسيب موظفي قسم تقنية المعلومات', type: 'RFP', stageEn: 'Draft Preparation', stageAr: 'إعداد المسودة', status: 'draft', updated: '12 Nov 2024' },
  { id: 'RFP-2024-047', descEn: 'AV upgrade for executive meeting rooms', descAr: 'ترقية الصوتيات والمرئيات لقاعات الاجتماعات', type: 'RFP', stageEn: 'Draft Preparation', stageAr: 'إعداد المسودة', status: 'draft', updated: '12 Nov 2024' },
  { id: 'PR-2024-127',  descEn: 'Branded giveaways for the annual industry conference', descAr: 'هدايا دعائية للمؤتمر السنوي', type: 'PR', stageEn: 'Draft Preparation', stageAr: 'إعداد المسودة', status: 'draft', updated: '12 Nov 2024' },
  { id: 'PR-2024-126',  descEn: 'Ergonomic seating for the new onboarding team', descAr: 'مقاعد مريحة لفريق التهيئة الجديد', type: 'PR', stageEn: 'Pending Director Approval', stageAr: 'بانتظار موافقة المدير', status: 'submitted', updated: '11 Nov 2024' },
  { id: 'PR-2024-125',  descEn: 'Catering services for the quarterly town hall', descAr: 'خدمات تموين للقاء الربعي', type: 'PR', stageEn: 'Awarded', stageAr: 'تمت الترسية', status: 'approved', updated: '10 Nov 2024' },
];

/* ────────────────────────────────────────────────────────────────────────
   Dashboard
──────────────────────────────────────────────────────────────────────── */
export default function Dashboard({ onNewRequest, onOpenRequest, onViewRequests }: Props) {
  const { isAr } = useLanguage();
  const t = useT();
  const { userName } = useRequests();
  const firstName = (userName || 'Mohammed').split(' ')[0];

  const [drill, setDrill] = useState<DrillKind | null>(null);
  const [chartSeg, setChartSeg] = useState<StatusSeg | null>(null);
  const toggle = (k: DrillKind) => setDrill((cur) => (cur === k ? null : k));

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* ── Greeting ────────────────────────────────────────────────────── */}
      <div className="rise-in">
        <h1 className="text-title-sm font-semibold text-neutral-900">
          {getGreeting(isAr)}, {firstName} <span className="inline-block">👋</span>
        </h1>
        <p className="text-body-md text-neutral-500 mt-1">
          {t("Here's what's happening with your procurement items today.", 'إليك ما يجري مع طلبات الشراء الخاصة بك اليوم.')}
        </p>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard idx={0} tone="neutral" active={drill === 'drafts'} onClick={() => toggle('drafts')}
          icon={<DocumentIcon className="w-4 h-4" />} label={t('My Drafts', 'مسوداتي')} value={6}
          sub={t('2 updated today', 'تم تحديث 2 اليوم')} />
        <KpiCard idx={1} tone="brand" active={drill === 'submissions'} onClick={() => toggle('submissions')}
          icon={<SendIcon className="w-4 h-4" />} label={t('My Submissions', 'طلباتي المقدَّمة')} value={8}
          sub={t('4 awaiting approval', '4 بانتظار الموافقة')} />
        <KpiCard idx={2} tone="warning" active={drill === 'approvals'} onClick={() => toggle('approvals')}
          icon={<ClockIcon className="w-4 h-4" />} label={t('Awaiting your Approvals', 'بانتظار موافقتك')} value={4}
          sub={t('Requires your attention', 'يتطلب انتباهك')} subTone="danger" />
        <ValueCard idx={3} label={t('Total RFP Value', 'إجمالي قيمة المنافسات')} amount={500000}
          sub={t('10 RFPs', '10 منافسات')} isAr={isAr} />
        <ValueCard idx={4} label={t('Total PO Value', 'إجمالي قيمة أوامر الشراء')} amount={300000}
          sub={t('200K optimized for 10 RFPs', 'توفير 200 ألف عبر 10 منافسات')} isAr={isAr} tone="success" />
      </div>

      {/* ── KPI drill-down table (toggled by card click) ─────────────────── */}
      {drill && (
        <DrillPanel kind={drill} onClose={() => setDrill(null)} onAction={onViewRequests} onNew={onNewRequest} isAr={isAr} t={t} />
      )}

      {/* ── Create request CTAs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <button onClick={() => onNewRequest('tendering')}
          className="rise-in bg-brand-600 text-white rounded-xl px-5 py-5 text-start hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-sm group" style={{ animationDelay: '40ms' }}>
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mb-3"><PlusIcon className="w-5 h-5" /></div>
          <p className="text-[15px] font-semibold leading-tight">{t('Create request', 'إنشاء طلب')}</p>
          <p className="text-[12px] text-brand-100 mt-1">{t('Start a new competitive tendering request', 'ابدأ طلب منافسة تنافسية جديدة')}</p>
          <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold text-brand-100 group-hover:text-white transition-colors">
            {t('Get started', 'ابدأ الآن')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <div className="rise-in bg-ai-50 border border-ai-200 rounded-xl px-5 py-5" style={{ animationDelay: '120ms' }}>
          <div className="w-9 h-9 rounded-lg bg-ai-100 flex items-center justify-center mb-3"><SparklesIcon className="w-5 h-5 text-ai-600" /></div>
          <p className="text-[15px] font-semibold text-ai-900 leading-tight">{t('Q1 2027 Planning', 'تخطيط الربع الأول 2027')}</p>
          <p className="text-[12px] text-ai-600 mt-1">{t('Pre-planning window opens in 3 months. Plan ahead to avoid delays.', 'تفتح نافذة التخطيط المسبق خلال 3 أشهر. خطط مسبقاً لتجنب التأخير.')}</p>
          <button onClick={() => onViewRequests('all')} className="flex items-center gap-1 mt-3 text-[11px] font-semibold text-ai-700 hover:text-ai-900 transition-colors">
            {t('Plan ahead', 'التخطيط المسبق')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <StatusDonut onDrill={setChartSeg} onViewAll={() => onViewRequests('all')} isAr={isAr} t={t} />
            <ClosingSoon onViewAll={() => onViewRequests('all')} isAr={isAr} t={t} />
          </div>
          <RecentTable onOpen={onViewRequests} onViewAll={() => onViewRequests('all')} isAr={isAr} t={t} />
        </div>
        <div className="space-y-5">
          <RecentActivity isAr={isAr} t={t} />
          <QuickActions onNewRequest={onNewRequest} onViewRequests={onViewRequests} isAr={isAr} t={t} />
          <AiSuggestions onNewRequest={onNewRequest} isAr={isAr} t={t} />
        </div>
      </div>

      {/* ── Chart drill-down popup ───────────────────────────────────────── */}
      {chartSeg && (
        <ChartModal seg={chartSeg} onClose={() => setChartSeg(null)} onOpenList={() => { onViewRequests(chartSeg.status); setChartSeg(null); }} isAr={isAr} t={t} />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   KPI cards
──────────────────────────────────────────────────────────────────────── */
const TONES: Record<string, { bg: string; fg: string; accent: string; ring: string }> = {
  neutral: { bg: 'bg-neutral-100', fg: 'text-neutral-600', accent: 'border-s-neutral-400', ring: 'ring-neutral-400' },
  brand:   { bg: 'bg-brand-50',    fg: 'text-brand-600',   accent: 'border-s-brand-500',   ring: 'ring-brand-500' },
  warning: { bg: 'bg-warning-50',  fg: 'text-warning-700', accent: 'border-s-warning-500', ring: 'ring-warning-500' },
  success: { bg: 'bg-success-50',  fg: 'text-success-700', accent: 'border-s-success-600', ring: 'ring-success-600' },
};

function KpiCard({ idx, tone, icon, label, value, sub, subTone, active, onClick }: {
  idx: number; tone: keyof typeof TONES; icon: React.ReactNode; label: string; value: number;
  sub: string; subTone?: 'danger'; active: boolean; onClick: () => void;
}) {
  const n = useCountUp(value);
  const tc = TONES[tone] ?? TONES.neutral;
  return (
    <button onClick={onClick}
      className={`rise-in bg-white rounded-xl border shadow-sm border-s-[3px] ${tc.accent} px-4 py-3.5 flex items-start gap-3 text-start transition-all hover:shadow-md ${active ? `ring-2 ${tc.ring} border-transparent` : 'border-neutral-200'}`}
      style={{ animationDelay: `${idx * 45}ms` }}>
      <div className={`w-9 h-9 rounded-lg ${tc.bg} ${tc.fg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[26px] font-bold text-neutral-900 leading-none tabular-nums">{n}</p>
        <p className="text-[12px] font-medium text-neutral-600 mt-1.5 leading-tight truncate">{label}</p>
        <p className={`text-[11px] mt-0.5 leading-tight ${subTone === 'danger' ? 'text-error-600 font-semibold' : 'text-neutral-400'}`}>{sub}</p>
      </div>
      <ChevronDownIcon className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${active ? 'rotate-180' : ''}`} />
    </button>
  );
}

function ValueCard({ idx, label, amount, sub, isAr, tone = 'neutral' }: {
  idx: number; label: string; amount: number; sub: string; isAr: boolean; tone?: 'neutral' | 'success';
}) {
  const n = useCountUp(amount);
  const tc = tone === 'success' ? TONES.success : { bg: 'bg-brand-50', fg: 'text-brand-600', accent: 'border-s-brand-400' };
  return (
    <div className={`rise-in bg-white rounded-xl border border-neutral-200 shadow-sm border-s-[3px] ${tc.accent} px-4 py-3.5 flex items-start gap-3`} style={{ animationDelay: `${idx * 45}ms` }}>
      <div className={`w-9 h-9 rounded-lg ${tc.bg} ${tc.fg} flex items-center justify-center flex-shrink-0`}><CoinsIcon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <p className="text-[22px] font-bold text-neutral-900 leading-none tabular-nums" dir="ltr">
          {n.toLocaleString('en-US')} <span className="text-[13px] font-semibold text-neutral-500">{isAr ? 'ريال' : 'SAR'}</span>
        </p>
        <p className="text-[12px] font-medium text-neutral-600 mt-1.5 leading-tight">{label}</p>
        <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">{sub}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   KPI drill-down panel — full-width, show/hide
──────────────────────────────────────────────────────────────────────── */
function DrillPanel({ kind, onClose, onAction, onNew, isAr, t }: {
  kind: DrillKind; onClose: () => void; onAction: (f?: FilterKey) => void;
  onNew: (s?: 'tendering' | 'souq-etimad') => void; isAr: boolean; t: (en: string, ar: string) => string;
}) {
  const title = kind === 'drafts' ? t('My Drafts', 'مسوداتي') : kind === 'submissions' ? t('My Submissions', 'طلباتي المقدَّمة') : t('Awaiting your Approvals', 'بانتظار موافقتك');
  const count = kind === 'drafts' ? DRAFT_ROWS.length : kind === 'submissions' ? SUBMISSION_ROWS.length : APPROVAL_ROWS.length;
  const th = 'px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide text-start';
  const link = 'text-[13px] font-semibold text-brand-600 hover:text-brand-700';

  return (
    <div className="drill-in bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50/60 border-b border-neutral-100">
        <h3 className="text-[14px] font-semibold text-neutral-900">{title} <span className="text-neutral-400 font-normal">({count})</span></h3>
        <button onClick={onClose} aria-label={t('Close', 'إغلاق')} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors">
          <XIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          {kind === 'drafts' && (
            <>
              <thead><tr className="border-b border-neutral-100">
                <th className={th}>{t('RFP ID', 'رقم المنافسة')}</th><th className={th}>{t('RFP Title', 'عنوان المنافسة')}</th>
                <th className={th}>{t('Last Updated', 'آخر تحديث')}</th><th className={`${th} text-end`}>{t('Action', 'إجراء')}</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {DRAFT_ROWS.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3.5"><button onClick={() => onNew('tendering')} className={link} dir="ltr">{r.id}</button></td>
                    <td className="px-5 py-3.5 text-[13px] text-neutral-800">{isAr ? r.titleAr : r.title}</td>
                    <td className="px-5 py-3.5 text-[12px] text-neutral-500">{isAr ? r.updatedAr : r.updated}</td>
                    <td className="px-5 py-3.5 text-end"><button onClick={() => onNew('tendering')} className={link}>{t('Continue', 'متابعة')}</button></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {kind === 'submissions' && (
            <>
              <thead><tr className="border-b border-neutral-100">
                <th className={th}>{t('RFP ID', 'رقم المنافسة')}</th><th className={th}>{t('RFP Title', 'عنوان المنافسة')}</th>
                <th className={th}>{t('Last Updated', 'آخر تحديث')}</th><th className={`${th} text-end`}>{t('Action', 'إجراء')}</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {SUBMISSION_ROWS.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3.5"><button onClick={() => onAction('submitted')} className={link} dir="ltr">{r.id}</button></td>
                    <td className="px-5 py-3.5 text-[13px] text-neutral-800">{isAr ? r.titleAr : r.title}</td>
                    <td className="px-5 py-3.5 text-[12px] text-neutral-500">{r.updated}</td>
                    <td className="px-5 py-3.5 text-end"><Badge variant={r.variant}>{isAr ? r.stateAr : r.state}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {kind === 'approvals' && (
            <>
              <thead><tr className="border-b border-neutral-100">
                <th className={th}>{t('RFP ID', 'رقم المنافسة')}</th><th className={th}>{t('RFP Title', 'عنوان المنافسة')}</th>
                <th className={th}>{t('Submitted By', 'مقدَّم من')}</th><th className={th}>{t('Pending Since', 'معلّق منذ')}</th>
                <th className={`${th} text-end`}>{t('Action', 'إجراء')}</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {APPROVAL_ROWS.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3.5"><button onClick={() => onAction('under-review')} className={link} dir="ltr">{r.id}</button></td>
                    <td className="px-5 py-3.5 text-[13px] text-neutral-800">{isAr ? r.titleAr : r.title}</td>
                    <td className="px-5 py-3.5 text-[12px] text-neutral-600">{isAr ? r.byAr : r.by}</td>
                    <td className="px-5 py-3.5 text-[12px] text-neutral-500">{isAr ? r.sinceAr : r.since}</td>
                    <td className="px-5 py-3.5 text-end"><button onClick={() => onAction('under-review')} className={link}>{t('Review', 'مراجعة')}</button></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Requests by Status — animated donut (opens popup on drill)
──────────────────────────────────────────────────────────────────────── */
function StatusDonut({ onDrill, onViewAll, isAr, t }: {
  onDrill: (s: StatusSeg) => void; onViewAll: () => void; isAr: boolean; t: (en: string, ar: string) => string;
}) {
  const mounted = useMounted();
  const total = SEGMENTS.reduce((a, s) => a + s.count, 0);
  const totalCount = useCountUp(total);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = SEGMENTS.map((s) => {
    const len = (s.count / total) * C;
    const rot = (acc / total) * 360 - 90;
    acc += s.count;
    return { ...s, len, rot };
  });

  return (
    <div className="rise-in bg-white rounded-xl border border-neutral-200 shadow-sm p-5" style={{ animationDelay: '160ms' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">{t('Requests by Status', 'الطلبات حسب الحالة')}</h2>
        <button onClick={onViewAll} className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
          {t('View all', 'عرض الكل')} <ChevronRightIcon className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f0ec" strokeWidth="13" />
            {arcs.map((a, i) => (
              <circle key={a.key} className="donut-seg cursor-pointer" cx="60" cy="60" r={R} fill="none"
                stroke={a.color} strokeWidth="13" strokeLinecap="butt"
                strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={mounted ? 0 : a.len}
                transform={`rotate(${a.rot} 60 60)`} style={{ transitionDelay: `${i * 90}ms` }}
                onClick={() => onDrill(a)}>
                <title>{`${isAr ? a.labelAr : a.labelEn}: ${a.count}`}</title>
              </circle>
            ))}
          </svg>
          <div className="donut-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[24px] font-bold text-neutral-900 leading-none tabular-nums">{totalCount}</span>
            <span className="text-[11px] text-neutral-400 mt-0.5">{t('Total', 'الإجمالي')}</span>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5 min-w-0">
          {arcs.map((a) => (
            <li key={a.key}>
              <button onClick={() => onDrill(a)} className="w-full flex items-center gap-2.5 py-0.5 group text-start">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[12px] text-neutral-600 group-hover:text-neutral-900 flex-1 truncate transition-colors">{isAr ? a.labelAr : a.labelEn}</span>
                <span className="text-[12px] font-semibold text-neutral-800 tabular-nums">{a.count}</span>
                <span className="text-[11px] text-neutral-400 tabular-nums w-9 text-end">{a.pct}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Chart drill-down popup
──────────────────────────────────────────────────────────────────────── */
function ChartModal({ seg, onClose, onOpenList, isAr, t }: {
  seg: StatusSeg; onClose: () => void; onOpenList: () => void; isAr: boolean; t: (en: string, ar: string) => string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rows = STATUS_REQUESTS[seg.key] ?? [];
  const label = isAr ? seg.labelAr : seg.labelEn;
  const th = 'px-5 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide text-start';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 backdrop-in bg-black/40" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pop-in relative w-full max-w-3xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <h3 className="text-[16px] font-semibold text-neutral-900">{t(`${label} requests`, `طلبات ${label}`)}</h3>
            <span className="text-[12px] text-neutral-400">({seg.count})</span>
          </div>
          <button onClick={onClose} aria-label={t('Close', 'إغلاق')} className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 flex items-center justify-center transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[620px]">
            <thead className="sticky top-0 bg-white"><tr className="border-b border-neutral-100">
              <th className={th}>{t('Request ID', 'رقم الطلب')}</th><th className={th}>{t('Description', 'الوصف')}</th>
              <th className={th}>{t('Project', 'المشروع')}</th><th className={th}>{t('Created', 'تاريخ الإنشاء')}</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-3"><button onClick={onOpenList} className="text-[13px] font-semibold text-brand-600 hover:text-brand-700" dir="ltr">{r.id}</button></td>
                  <td className="px-5 py-3 text-[13px] text-neutral-800">{isAr ? r.descAr : r.descEn}</td>
                  <td className="px-5 py-3 text-[12px] text-neutral-600">{isAr ? r.projectAr : r.projectEn}</td>
                  <td className="px-5 py-3 text-[12px] text-neutral-500 whitespace-nowrap">{r.created}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-neutral-500">{t('No requests in this status.', 'لا توجد طلبات في هذه الحالة.')}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-neutral-100 flex justify-end">
          <button onClick={onOpenList} className="text-[13px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            {t('Open in My Requests', 'فتح في طلباتي')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   RFPs Closing Soon
──────────────────────────────────────────────────────────────────────── */
function ClosingSoon({ onViewAll, isAr, t }: { onViewAll: () => void; isAr: boolean; t: (en: string, ar: string) => string; }) {
  const items = [
    { id: 'RFP-2024-045', titleEn: 'IT Hardware & Networking', titleAr: 'أجهزة تقنية وشبكات', due: 'Due 22 May 2024', dueAr: 'تستحق 22 مايو 2024', left: 2 },
    { id: 'RFP-2024-038', titleEn: 'Annual Office Maintenance', titleAr: 'الصيانة السنوية للمكاتب', due: 'Due 25 May 2024', dueAr: 'تستحق 25 مايو 2024', left: 5 },
    { id: 'RFP-2024-031', titleEn: 'Cloud Services Subscription', titleAr: 'اشتراك الخدمات السحابية', due: 'Due 26 May 2024', dueAr: 'تستحق 26 مايو 2024', left: 6 },
  ];
  const pill = (n: number) => n <= 2 ? 'bg-error-50 text-error-700' : n <= 5 ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700';
  return (
    <div className="rise-in bg-white rounded-xl border border-neutral-200 shadow-sm p-5" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">{t('RFPs Closing Soon', 'منافسات تُغلق قريباً')}</h2>
        <button onClick={onViewAll} className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
          {t('View all', 'عرض الكل')} <ChevronRightIcon className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-brand-700" dir="ltr">{it.id}</p>
              <p className="text-[13px] text-neutral-800 truncate">{isAr ? it.titleAr : it.titleEn}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{isAr ? it.dueAr : it.due}</p>
            </div>
            <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 flex-shrink-0 ${pill(it.left)}`}>{t(`${it.left} days left`, `${it.left} أيام متبقية`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Recent Activity
──────────────────────────────────────────────────────────────────────── */
function RecentActivity({ isAr, t }: { isAr: boolean; t: (en: string, ar: string) => string; }) {
  const items = [
    { id: 'RFP-2024-044', en: 'Approved by Mohammed Al-Drees', ar: 'تمت الموافقة من محمد الدريس', when: '10 mins ago', whenAr: 'قبل 10 دقائق', kind: 'ok' },
    { id: 'RFP-2024-041', en: 'approved by Finance – Mohammed Fuzan', ar: 'اعتُمد من المالية – محمد فوزان', when: '1 hour ago', whenAr: 'قبل ساعة', kind: 'ok' },
    { id: 'RFP-2024-037', en: 'approved by Finance – Mohammed Fuzan', ar: 'اعتُمد من المالية – محمد فوزان', when: '1 hour ago', whenAr: 'قبل ساعة', kind: 'ok' },
    { id: 'RFP-2024-038', en: 'received a new vendor proposal', ar: 'استلم عرضاً جديداً من مورّد', when: '3 hours ago', whenAr: 'قبل 3 ساعات', kind: 'doc' },
    { id: 'RFP-2024-031', en: 'moved to Under Review', ar: 'انتقل إلى قيد المراجعة', when: '5 hours ago', whenAr: 'قبل 5 ساعات', kind: 'move' },
    { id: 'PR-2024-112', en: 'submitted for approval', ar: 'قُدّم للموافقة', when: 'Yesterday', whenAr: 'أمس', kind: 'send' },
  ];
  const dot = (k: string) =>
    k === 'ok'   ? <span className="w-6 h-6 rounded-full bg-success-50 text-success-600 flex items-center justify-center"><CheckCircleIcon className="w-3.5 h-3.5" /></span>
  : k === 'doc'  ? <span className="w-6 h-6 rounded-full bg-ai-50 text-ai-600 flex items-center justify-center"><DocumentIcon className="w-3.5 h-3.5" /></span>
  : k === 'move' ? <span className="w-6 h-6 rounded-full bg-warning-50 text-warning-700 flex items-center justify-center"><ClockIcon className="w-3.5 h-3.5" /></span>
  :                <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center"><SendIcon className="w-3.5 h-3.5" /></span>;
  return (
    <div className="rise-in bg-white rounded-xl border border-neutral-200 shadow-sm p-5" style={{ animationDelay: '240ms' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">{t('Recent Activity', 'النشاط الأخير')}</h2>
        <button className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
          {t('View all activity', 'عرض كل النشاط')} <ChevronRightIcon className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <ul className="space-y-3.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="flex-shrink-0">{dot(it.kind)}</div>
            <div className="min-w-0">
              <p className="text-[12px] text-neutral-700 leading-snug"><span className="font-semibold text-brand-700" dir="ltr">{it.id}</span> {isAr ? it.ar : it.en}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{isAr ? it.whenAr : it.when}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Quick Actions
──────────────────────────────────────────────────────────────────────── */
function QuickActions({ onNewRequest, onViewRequests, isAr, t }: {
  onNewRequest: (s?: 'tendering' | 'souq-etimad') => void; onViewRequests: (f?: FilterKey) => void;
  isAr: boolean; t: (en: string, ar: string) => string;
}) {
  const actions = [
    { en: 'Create New RFP', ar: 'إنشاء منافسة جديدة', icon: <PlusIcon className="w-4 h-4" />, onClick: () => onNewRequest('tendering') },
    { en: 'View Overdue RFPs', ar: 'المنافسات المتأخرة', icon: <ClockIcon className="w-4 h-4" />, onClick: () => onViewRequests('under-review') },
    { en: 'View New Vendors', ar: 'الموردون الجدد', icon: <GroupIcon className="w-4 h-4" />, onClick: () => onViewRequests('all') },
  ];
  return (
    <div className="rise-in bg-white rounded-xl border border-neutral-200 shadow-sm p-5" style={{ animationDelay: '280ms' }}>
      <h2 className="text-[14px] font-semibold text-neutral-900 mb-3">{t('Quick Actions', 'إجراءات سريعة')}</h2>
      <div className="space-y-1.5">
        {actions.map((a, i) => (
          <button key={i} onClick={a.onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors text-start group">
            <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">{a.icon}</span>
            <span className="text-[13px] font-medium text-neutral-800 flex-1">{isAr ? a.ar : a.en}</span>
            <ChevronRightIcon className={`w-4 h-4 text-neutral-300 group-hover:text-brand-500 transition-colors ${isAr ? 'rotate-180' : ''}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   AI Assistant Suggestions
──────────────────────────────────────────────────────────────────────── */
function AiSuggestions({ onNewRequest, isAr, t }: {
  onNewRequest: (s?: 'tendering' | 'souq-etimad') => void; isAr: boolean; t: (en: string, ar: string) => string;
}) {
  return (
    <div className="rise-in bg-ai-50 border border-ai-200 rounded-xl p-5" style={{ animationDelay: '320ms' }}>
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="w-4 h-4 text-ai-600" />
        <h2 className="text-[14px] font-semibold text-ai-900">{t('AI Assistant Suggestions', 'اقتراحات المساعد الذكي')}</h2>
      </div>
      <div className="space-y-3">
        <div className="bg-white/70 rounded-lg px-3.5 py-3 border border-ai-100">
          <div className="flex items-start gap-2.5">
            <WandIcon className="w-4 h-4 text-ai-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] text-ai-900 leading-snug">{t('Based on your past activity, you can create this RFP 40% faster using AI.', 'بناءً على نشاطك السابق، يمكنك إنشاء هذه المنافسة أسرع بنسبة 40٪ باستخدام الذكاء الاصطناعي.')}</p>
              <button onClick={() => onNewRequest('tendering')} className="text-[11px] font-semibold text-ai-700 hover:text-ai-900 mt-1.5 flex items-center gap-1">
                {t('Try AI Draft', 'جرّب المسودة الذكية')} <ChevronRightIcon className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white/70 rounded-lg px-3.5 py-3 border border-ai-100">
          <div className="flex items-start gap-2.5">
            <DocumentIcon className="w-4 h-4 text-ai-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] text-ai-900 leading-snug">{t('3 similar RFPs found. Reuse details to save time.', 'تم العثور على 3 منافسات مشابهة. أعد استخدام التفاصيل لتوفير الوقت.')}</p>
              <button onClick={() => onNewRequest('tendering')} className="text-[11px] font-semibold text-ai-700 hover:text-ai-900 mt-1.5 flex items-center gap-1">
                {t('Reuse details', 'إعادة استخدام التفاصيل')} <ChevronRightIcon className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   My Recent 10 Requests
──────────────────────────────────────────────────────────────────────── */
const STATUS_BADGE: Record<TenderStatus, { en: string; ar: string; variant: 'draft' | 'submitted' | 'approved' | 'rejected' | 'success' }> = {
  draft:          { en: 'Draft',        ar: 'مسودة',        variant: 'draft' },
  submitted:      { en: 'Submitted',    ar: 'مُقدَّم',       variant: 'submitted' },
  'under-review': { en: 'Under Review', ar: 'قيد المراجعة', variant: 'submitted' },
  approved:       { en: 'Active RFP',   ar: 'منافسة نشطة',  variant: 'success' },
  returned:       { en: 'Returned',     ar: 'مرتجع',        variant: 'rejected' },
};

function RecentTable({ onOpen, onViewAll, isAr, t }: {
  onOpen: (f?: FilterKey) => void; onViewAll: () => void; isAr: boolean; t: (en: string, ar: string) => string;
}) {
  const [q, setQ] = useState('');
  const filtered = RECENT_ROWS.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.id.toLowerCase().includes(s) || r.descEn.toLowerCase().includes(s) || r.descAr.includes(q);
  });
  const th = 'px-4 py-2.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wide text-start';

  return (
    <div className="rise-in bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden" style={{ animationDelay: '260ms' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 pt-5 pb-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">{t('My Recent 10 Requests', 'آخر 10 طلبات')}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className={`w-3.5 h-3.5 text-neutral-400 absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-2.5' : 'left-2.5'}`} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search requests…', 'بحث في الطلبات…')}
              className={`text-[12px] border border-neutral-200 rounded-lg py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 ${isAr ? 'pr-7 pl-2.5' : 'pl-7 pr-2.5'}`} />
          </div>
          <button onClick={onViewAll} className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 flex-shrink-0">
            {t('View all', 'عرض الكل')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr className="border-y border-neutral-100 bg-neutral-50/40">
            <th className={th}>{t('Request / RFP ID', 'رقم الطلب')}</th><th className={th}>{t('Description', 'الوصف')}</th>
            <th className={th}>{t('Type', 'النوع')}</th><th className={th}>{t('Stage', 'المرحلة')}</th>
            <th className={th}>{t('Status', 'الحالة')}</th><th className={th}>{t('Last Updated', 'آخر تحديث')}</th><th className="px-4 py-2.5" />
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((r) => {
              const sb = STATUS_BADGE[r.status];
              return (
                <tr key={r.id} onClick={() => onOpen('all')} className="hover:bg-neutral-50/70 transition-colors cursor-pointer group">
                  <td className="px-4 py-3.5"><span className="text-[12px] font-semibold text-brand-700" dir="ltr">{r.id}</span></td>
                  <td className="px-4 py-3.5"><p className="text-[13px] text-neutral-800 truncate max-w-[300px]">{isAr ? r.descAr : r.descEn}</p></td>
                  <td className="px-4 py-3.5"><Badge variant={r.type === 'RFP' ? 'info' : 'default'}>{r.type}</Badge></td>
                  <td className="px-4 py-3.5"><span className="text-[12px] text-neutral-600">{isAr ? r.stageAr : r.stageEn}</span></td>
                  <td className="px-4 py-3.5"><Badge variant={sb.variant}>{isAr ? sb.ar : sb.en}</Badge></td>
                  <td className="px-4 py-3.5 text-[11px] text-neutral-400 whitespace-nowrap">{r.updated}</td>
                  <td className="px-4 py-3.5 text-end"><span className="text-[12px] font-semibold text-brand-600 group-hover:text-brand-700">{t('View', 'عرض')}</span></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-neutral-500">{t('No requests match your search.', 'لا توجد طلبات تطابق بحثك.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Inline icons
──────────────────────────────────────────────────────────────────────── */
function SendIcon({ className = '' }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>);
}
function CoinsIcon({ className = '' }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82" /></svg>);
}
function GroupIcon({ className = '' }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
}
