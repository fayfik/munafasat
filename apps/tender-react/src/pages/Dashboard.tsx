import { useRequests } from '../context/RequestStore';
import { Badge, Button } from '../components/ui';
import { PlusIcon, ClockIcon, DocumentIcon, CheckCircleIcon, AlertTriangleIcon, ChevronRightIcon, SparklesIcon } from '../components/Icons';
import { useT, useLanguage } from '../context/LanguageContext';
import type { TenderDraft, TenderStatus } from '../types/tender';

function getGreeting(isAr: boolean) {
  const h = new Date().getHours();
  if (isAr) {
    return h < 12 ? 'صباح الخير' : 'مساء الخير';
  }
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(isAr: boolean) {
  return new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-SA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  onNewRequest: (sourceType?: 'tendering' | 'souq-etimad') => void;
  onOpenRequest: (id: string) => void;
  onViewRequests: () => void;
}

export default function Dashboard({ onNewRequest, onOpenRequest, onViewRequests }: Props) {
  const { isAr } = useLanguage();
  const t = useT();
  const { requests: MOCK_TENDERS, userName, mode } = useRequests();
  const firstName = (userName || 'Mohammed').split(' ')[0];

  const returnedTenders  = MOCK_TENDERS.filter((tender) => tender.status === 'returned');
  const recentTenders    = [...MOCK_TENDERS]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const stats = [
    {
      labelEn: 'Total Requests', labelAr: 'إجمالي الطلبات',
      value: MOCK_TENDERS.length,
      icon: <DocumentIcon className="w-4 h-4" />,
      color: 'text-neutral-600', bg: 'bg-neutral-100', accent: 'border-s-neutral-400',
    },
    {
      labelEn: 'Under Review', labelAr: 'قيد المراجعة',
      value: MOCK_TENDERS.filter((tender) => tender.status === 'under-review').length,
      icon: <ClockIcon className="w-4 h-4" />,
      color: 'text-warning-700', bg: 'bg-warning-50', accent: 'border-s-warning-500',
    },
    {
      labelEn: 'Drafts', labelAr: 'المسودات',
      value: MOCK_TENDERS.filter((tender) => tender.status === 'draft').length,
      icon: <DocumentIcon className="w-4 h-4" />,
      color: 'text-ai-700', bg: 'bg-ai-50', accent: 'border-s-ai-500',
    },
    {
      labelEn: 'Approved', labelAr: 'معتمدة',
      value: MOCK_TENDERS.filter((tender) => tender.status === 'approved').length,
      icon: <CheckCircleIcon className="w-4 h-4" />,
      color: 'text-success-700', bg: 'bg-success-50', accent: 'border-s-success-600',
    },
    {
      labelEn: 'Returned', labelAr: 'مرتجعة',
      value: returnedTenders.length,
      icon: <AlertTriangleIcon className="w-4 h-4" />,
      color: 'text-error-700', bg: 'bg-error-50', accent: 'border-s-error-500',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* ── Welcome ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-title-sm font-semibold text-neutral-900">
            {getGreeting(isAr)}, {firstName}.
          </h1>
          <p className="text-body-md text-neutral-500 mt-0.5">{formatToday(isAr)}</p>
        </div>
        <Button variant="primary" size="md" onClick={() => onNewRequest()}>
          <PlusIcon className="w-4 h-4" />
          {t('New Request', 'طلب جديد')}
        </Button>
      </div>

      {/* ── Action required (returned) ──────────────────────────────────── */}
      {returnedTenders.length > 0 && (
        <div className="space-y-2">
          {returnedTenders.map((tender) => (
            <div
              key={tender.id}
              className="flex items-center gap-4 bg-error-50 border border-error-200 rounded-xl px-5 py-4 fade-in"
            >
              <div className="w-8 h-8 rounded-lg bg-error-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangleIcon className="w-4 h-4 text-error-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-error-900 truncate">
                  {t('Action required', 'إجراء مطلوب')}: {tender.title}
                </p>
                <p className="text-[11px] text-error-600 mt-0.5">
                  {t(
                    `Returned by your Manager · ${formatDate(tender.updatedAt)} · Review comments and resubmit`,
                    `مرتجع من مديرك · ${formatDate(tender.updatedAt)} · راجع التعليقات وأعد التقديم`
                  )}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => onOpenRequest(tender.id)}>
                {t('Edit Request', 'تعديل الطلب')}
                <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div
            key={s.labelEn}
            className={`bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3.5 flex items-center gap-3 border-s-[3px] ${s.accent}`}
          >
            <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[22px] font-bold text-neutral-900 leading-none tabular-nums">{s.value}</p>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{isAr ? s.labelAr : s.labelEn}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick actions + Pre-planning ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* New Tender */}
        <button
          onClick={() => onNewRequest('tendering')}
          className="bg-brand-600 text-white rounded-xl px-5 py-5 text-start hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-sm group"
        >
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
            <PlusIcon className="w-5 h-5" />
          </div>
          <p className="text-[15px] font-semibold leading-tight">{t('Create Tender', 'إنشاء منافسة')}</p>
          <p className="text-[12px] text-brand-200 mt-1">{t('Start a new competitive tendering request', 'ابدأ طلب منافسة تنافسية جديدة')}</p>
          <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold text-brand-200 group-hover:text-white transition-colors">
            {t('Get started', 'ابدأ الآن')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Etimad Souq */}
        <button
          onClick={() => onNewRequest('souq-etimad')}
          className="bg-white border border-neutral-200 rounded-xl px-5 py-5 text-start hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm group"
        >
          <div className="w-9 h-9 rounded-lg bg-ai-50 flex items-center justify-center mb-3">
            <DocumentIcon className="w-5 h-5 text-ai-600" />
          </div>
          <p className="text-[15px] font-semibold text-neutral-900 leading-tight">{t('Etimad Souq', 'سوق اعتماد')}</p>
          <p className="text-[12px] text-neutral-500 mt-1">{t('Request via the e-market procurement channel', 'الطلب عبر قناة سوق اعتماد')}</p>
          <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
            {t('Start request', 'ابدأ الطلب')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Pre-planning */}
        <div className="bg-ai-50 border border-ai-200 rounded-xl px-5 py-5">
          <div className="w-9 h-9 rounded-lg bg-ai-100 flex items-center justify-center mb-3">
            <SparklesIcon className="w-5 h-5 text-ai-600" />
          </div>
          <p className="text-[15px] font-semibold text-ai-900 leading-tight">{t('Q1 2027 Planning', 'تخطيط الربع الأول 2027')}</p>
          <p className="text-[12px] text-ai-600 mt-1">
            {t('Pre-planning window opens in 3 months. Plan ahead to avoid delays.', 'تفتح نافذة التخطيط المسبق خلال 3 أشهر. خطط مسبقاً لتجنب التأخير.')}
          </p>
          <button className="flex items-center gap-1 mt-3 text-[11px] font-semibold text-ai-700 hover:text-ai-900 transition-colors">
            {t('Plan ahead', 'التخطيط المسبق')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Recent Requests ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-xxs font-semibold text-neutral-900">{t('Recent Requests', 'الطلبات الأخيرة')}</h2>
          <button
            onClick={onViewRequests}
            className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
          >
            {t('View all', 'عرض الكل')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/40">
                <th className="text-start px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Request', 'الطلب')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Type', 'النوع')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Status', 'الحالة')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Budget', 'الميزانية')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Updated', 'آخر تحديث')}</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentTenders.map((tender) => (
                <RecentRow key={tender.id} tender={tender} onOpen={() => onOpenRequest(tender.id)} />
              ))}
              {recentTenders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-neutral-500">
                    {mode === 'loading'
                      ? t('Loading requests…', 'جاري تحميل الطلبات…')
                      : t('No requests yet. Create your first tender request to see it here.', 'لا توجد طلبات بعد. أنشئ أول طلب منافسة ليظهر هنا.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentRow({ tender, onOpen }: { tender: TenderDraft; onOpen: () => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const isReturned = tender.status === 'returned';

  const STATUS_LABELS: Record<TenderStatus, { en: string; ar: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
    draft:          { en: 'Draft',        ar: 'مسودة',        variant: 'default' },
    submitted:      { en: 'Submitted',    ar: 'مُقدَّم',      variant: 'info' },
    'under-review': { en: 'Under Review', ar: 'قيد المراجعة', variant: 'warning' },
    approved:       { en: 'Approved',     ar: 'معتمد',        variant: 'success' },
    returned:       { en: 'Returned',     ar: 'مرتجع',        variant: 'error' },
  };

  const sc = STATUS_LABELS[tender.status];
  const label = isAr ? sc.ar : sc.en;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-SA', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <tr
      onClick={onOpen}
      className={`hover:bg-neutral-50/70 transition-colors group cursor-pointer ${isReturned ? 'bg-error-50/20' : ''}`}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            tender.type === 'tendering' ? 'bg-ai-50 text-ai-500' : 'bg-warning-50 text-warning-600'
          }`}>
            <DocumentIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-neutral-900 group-hover:text-brand-700 transition-colors truncate max-w-[260px]">
              {tender.title}
            </p>
            <p className="text-[10px] text-neutral-400 font-mono" dir="ltr">{(tender as { requestNo?: string }).requestNo || (tender.status === 'draft' ? t('Draft', 'مسودة') : tender.id)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={tender.type === 'tendering' ? 'info' : 'default'}>
          {tender.type === 'tendering' ? t('RFP', 'منافسة') : t('Etimad', 'اعتماد')}
        </Badge>
      </td>
      <td className="px-4 py-3.5">
        <div>
          <Badge variant={sc.variant}>{label}</Badge>
          {isReturned && <p className="text-[10px] text-error-600 font-semibold mt-0.5">{t('Action required', 'إجراء مطلوب')}</p>}
        </div>
      </td>
      <td className="px-4 py-3.5 text-[12px] font-semibold text-neutral-800 tabular-nums" dir="ltr">{tender.budget}</td>
      <td className="px-4 py-3.5 text-[11px] text-neutral-400">{formatDate(tender.updatedAt)}</td>
      <td className="px-4 py-3.5">
        <ChevronRightIcon className={`w-4 h-4 text-neutral-300 group-hover:text-brand-500 transition-colors ${isAr ? 'rotate-180' : ''}`} />
      </td>
    </tr>
  );
}
