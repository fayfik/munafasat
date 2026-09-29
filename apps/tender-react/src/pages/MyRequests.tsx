import { useState } from 'react';
import { useRequests } from '../context/RequestStore';
import { Badge, Button } from '../components/ui';
import { PlusIcon, SearchIcon, DocumentIcon, AlertTriangleIcon, ChevronRightIcon, XIcon } from '../components/Icons';
import { useT, useLanguage } from '../context/LanguageContext';
import type { TenderDraft, TenderStatus } from '../types/tender';

type StatusConfig = {
  en: string;
  ar: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'default';
};

const STATUS_CONFIG: Record<TenderStatus, StatusConfig> = {
  draft:          { en: 'Draft',        ar: 'مسودة',        variant: 'default' },
  submitted:      { en: 'Submitted',    ar: 'مُقدَّم',      variant: 'info' },
  'under-review': { en: 'Under Review', ar: 'قيد المراجعة', variant: 'warning' },
  approved:       { en: 'Approved',     ar: 'معتمد',        variant: 'success' },
  returned:       { en: 'Returned',     ar: 'مرتجع',        variant: 'error' },
};

interface Props {
  onNewRequest: () => void;
  onOpenRequest: (id: string) => void;
}

export default function MyRequests({ onNewRequest, onOpenRequest }: Props) {
  const { isAr } = useLanguage();
  const t = useT();
  const { requests: MOCK_TENDERS } = useRequests();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TenderStatus | 'all'>('all');

  const returnedTenders = MOCK_TENDERS.filter((tender) => tender.status === 'returned');

  const filtered = MOCK_TENDERS.filter((tender) => {
    const q = search.toLowerCase();
    const matchSearch =
      tender.title.toLowerCase().includes(q) ||
      tender.department.toLowerCase().includes(q) ||
      tender.id.toLowerCase().includes(q) ||
      ((tender as { requestNo?: string }).requestNo ?? '').toLowerCase().includes(q);
    const matchFilter = filter === 'all' || tender.status === filter;
    return matchSearch && matchFilter;
  });

  type TabKey = TenderStatus | 'all';
  const STATUS_TABS: Array<{ key: TabKey; en: string; ar: string }> = [
    { key: 'all',          en: 'All',          ar: 'الكل' },
    { key: 'draft',        en: 'Draft',        ar: 'مسودة' },
    { key: 'submitted',    en: 'Submitted',    ar: 'مُقدَّم' },
    { key: 'under-review', en: 'Under Review', ar: 'قيد المراجعة' },
    { key: 'approved',     en: 'Approved',     ar: 'معتمد' },
    { key: 'returned',     en: 'Returned',     ar: 'مرتجع' },
  ];

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-title-sm font-semibold text-neutral-900">{t('My Requests', 'طلباتي')}</h1>
          <p className="text-body-md text-neutral-500 mt-0.5">
            {isAr
              ? `${MOCK_TENDERS.length} ${t('total requests', 'إجمالي الطلبات')}`
              : `${MOCK_TENDERS.length} ${t('total requests', 'إجمالي الطلبات')}`}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onNewRequest}>
          <PlusIcon className="w-4 h-4" />
          {t('New Request', 'طلب جديد')}
        </Button>
      </div>

      {/* ── Returned action banners ──────────────────────────────────────── */}
      {returnedTenders.length > 0 && (
        <div className="space-y-2">
          {returnedTenders.map((tender) => (
            <div key={tender.id} className="flex items-center gap-4 bg-error-50 border border-error-200 rounded-xl px-5 py-3.5 fade-in">
              <AlertTriangleIcon className="w-4 h-4 text-error-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-error-900">{tender.title}</span>
                <span className="text-[11px] text-error-600 ms-2">{t('was returned — action required', 'مرتجع — مطلوب إجراء')}</span>
              </div>
              <button
                onClick={() => onOpenRequest(tender.id)}
                className="text-[11px] font-semibold text-error-700 hover:text-error-900 flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                {t('Edit & Resubmit', 'تعديل وإعادة التقديم')} <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 flex-wrap gap-y-2">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <SearchIcon className={`w-4 h-4 text-neutral-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 pointer-events-none`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search by title, ID, department…', 'ابحث بالعنوان أو الرمز أو الجهة…')}
              className={`${isAr ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-1.5 text-body-md border border-neutral-200 rounded-lg w-full focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all placeholder-neutral-400 bg-white`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={`absolute ${isAr ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors`}
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 ms-1 flex-wrap">
            {STATUS_TABS.map(({ key, en, ar }) => {
              const isActive   = filter === key;
              const count      = key === 'all' ? MOCK_TENDERS.length : MOCK_TENDERS.filter((tender) => tender.status === key).length;
              const isReturned = key === 'returned';
              const label      = isAr ? ar : en;

              if (count === 0 && key !== 'all') return null;

              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                    isActive
                      ? isReturned
                        ? 'bg-error-600 text-white shadow-sm'
                        : 'bg-brand-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {label}
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isReturned && count > 0
                        ? 'bg-error-100 text-error-700'
                        : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-400 ms-auto whitespace-nowrap">
            {isAr
              ? `${filtered.length} ${t('of', 'من')} ${MOCK_TENDERS.length} ${t('requests', 'طلبات')}`
              : `${filtered.length} of ${MOCK_TENDERS.length} request${MOCK_TENDERS.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/40">
                <th className="text-start px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Request', 'الطلب')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Type', 'النوع')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Department', 'الجهة')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Budget', 'الميزانية')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Status', 'الحالة')}</th>
                <th className="text-start px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{t('Updated', 'آخر تحديث')}</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((tender) => (
                <RequestRow key={tender.id} tender={tender} onOpen={() => onOpenRequest(tender.id)} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <SearchIcon className="w-5 h-5 text-neutral-400" />
                      </div>
                      <p className="text-body-md font-medium text-neutral-600">{MOCK_TENDERS.length === 0 ? t('No requests yet', 'لا توجد طلبات بعد') : t('No requests found', 'لا توجد طلبات')}</p>
                      <p className="text-body-sm text-neutral-400">
                        {search
                          ? t('Try adjusting your search terms', 'حاول تعديل كلمات البحث')
                          : t('No requests match this filter', 'لا توجد طلبات تطابق هذا التصفية')}
                      </p>
                      <button
                        onClick={() => { setSearch(''); setFilter('all'); }}
                        className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 mt-1 transition-colors"
                      >
                        {t('Clear filters', 'مسح التصفية')}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table footer ──────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 bg-neutral-50/40">
            <p className="text-[11px] text-neutral-400">
              {isAr
                ? `يُعرض ${filtered.length} من ${MOCK_TENDERS.length} طلب`
                : `Showing ${filtered.length} of ${MOCK_TENDERS.length} requests`}
            </p>
            <p className="text-[11px] text-neutral-400">
              {t('Updates live', 'يتم التحديث مباشرة')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestRow({ tender, onOpen }: { tender: TenderDraft; onOpen: () => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const sc         = STATUS_CONFIG[tender.status];
  const label      = isAr ? sc.ar : sc.en;
  const isReturned = tender.status === 'returned';
  const isDraft    = tender.status === 'draft';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-SA', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <tr
      onClick={onOpen}
      className={`hover:bg-neutral-50/80 transition-colors group cursor-pointer ${isReturned ? 'bg-error-50/20' : ''}`}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            tender.type === 'tendering' ? 'bg-ai-50 text-ai-500' : 'bg-warning-50 text-warning-600'
          }`}>
            <DocumentIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-label-lg font-semibold text-neutral-900 group-hover:text-brand-700 transition-colors truncate max-w-[280px]">
              {tender.title}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5 font-mono" dir="ltr">{(tender as { requestNo?: string }).requestNo || (tender.status === 'draft' ? t('Draft', 'مسودة') : tender.id)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={tender.type === 'tendering' ? 'info' : 'default'}>
          {tender.type === 'tendering' ? t('Tender', 'منافسة') : t('Etimad Souq', 'سوق اعتماد')}
        </Badge>
      </td>
      <td className="px-4 py-3.5 text-[12px] text-neutral-600">{tender.department}</td>
      <td className="px-4 py-3.5 text-[12px] font-semibold text-neutral-800 tabular-nums" dir="ltr">{tender.budget}</td>
      <td className="px-4 py-3.5">
        <div>
          <Badge variant={sc.variant}>{label}</Badge>
          {isReturned && <p className="text-[10px] text-error-600 font-semibold mt-1">{t('Action required', 'إجراء مطلوب')}</p>}
        </div>
      </td>
      <td className="px-4 py-3.5 text-[11px] text-neutral-400">{formatDate(tender.updatedAt)}</td>
      <td className="px-4 py-3.5">
        <span className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold text-brand-600 transition-all flex items-center gap-0.5 whitespace-nowrap">
          {isDraft || isReturned ? t('Edit', 'تعديل') : t('View', 'عرض')}
          <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
        </span>
      </td>
    </tr>
  );
}
