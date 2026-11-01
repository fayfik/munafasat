import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { useRequests, type SavedRequest } from '../context/RequestStore';
import { Button } from '../components/ui';
import { PlusIcon, SearchIcon, XIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, DownloadIcon, CheckIcon } from '../components/Icons';
import { useT, useLanguage } from '../context/LanguageContext';
import type { SourceType, TenderStatus } from '../types/tender';

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUSES: { key: TenderStatus; en: string; ar: string; chip: string; dot: string }[] = [
  { key: 'draft',        en: 'Draft',        ar: 'مسودة',        chip: 'bg-neutral-100 text-neutral-600',  dot: 'bg-neutral-400' },
  { key: 'submitted',    en: 'Submitted',    ar: 'مُقدَّم',      chip: 'bg-blue-50 text-blue-700',          dot: 'bg-blue-500' },
  { key: 'under-review', en: 'Under review', ar: 'قيد المراجعة', chip: 'bg-warning-50 text-warning-700',    dot: 'bg-warning-500' },
  { key: 'approved',     en: 'Approved',     ar: 'معتمد',        chip: 'bg-success-50 text-success-700',    dot: 'bg-success-500' },
  { key: 'returned',     en: 'Returned',     ar: 'مرتجع',        chip: 'bg-error-50 text-error-700',        dot: 'bg-error-500' },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.key, s])) as Record<TenderStatus, (typeof STATUSES)[number]>;

const TYPES: { key: SourceType; en: string; ar: string; chip: string }[] = [
  { key: 'tendering',   en: 'Tender',          ar: 'منافسة',       chip: 'bg-[#EEF4FB] text-[#2A6193] border-[#D5E3F2]' },
  { key: 'souq-etimad', en: 'Etimad E-Market', ar: 'سوق اعتماد',   chip: 'bg-[#FBF5EA] text-[#8A5A12] border-[#F0E0BF]' },
];
export const TYPE = Object.fromEntries(TYPES.map((x) => [x.key, x])) as Record<SourceType, (typeof TYPES)[number]>;

const DATE_PRESETS = [
  { key: 'any',  en: 'Any time',      ar: 'أي وقت' },
  { key: '7',    en: 'Last 7 days',   ar: 'آخر 7 أيام' },
  { key: '30',   en: 'Last 30 days',  ar: 'آخر 30 يومًا' },
  { key: '90',   en: 'Last 90 days',  ar: 'آخر 90 يومًا' },
  { key: 'year', en: 'This year',     ar: 'هذا العام' },
  { key: 'custom', en: 'Custom range', ar: 'نطاق مخصص' },
] as const;
type DatePreset = (typeof DATE_PRESETS)[number]['key'];

const PR_OPTS = [
  { key: 'any',  en: 'Any',               ar: 'الكل' },
  { key: 'has',  en: 'PR created',        ar: 'تم إنشاء طلب الشراء' },
  { key: 'none', en: 'No PR yet',         ar: 'لا يوجد طلب شراء بعد' },
] as const;
type PrOpt = (typeof PR_OPTS)[number]['key'];

const PAGE_SIZE = 10;

// ─── Rows & filters ──────────────────────────────────────────────────────────

interface Row {
  id: string; requestNo: string; title: string; titleAr: string;
  status: TenderStatus; type: SourceType;
  dept: string; deptAr: string; createdAt: string; pr: string;
  by: string; byAr: string; budget: string;
}

interface Filters {
  status: TenderStatus[]; type: SourceType[]; dept: string[]; by: string[];
  date: DatePreset; from: string; to: string; pr: PrOpt;
}
const EMPTY: Filters = { status: [], type: [], dept: [], by: [], date: 'any', from: '', to: '', pr: 'any' };

type Section = 'status' | 'type' | 'dept' | 'by' | 'date' | 'pr';

function matches(r: Row, f: Filters, skip?: Section) {
  if (skip !== 'status' && f.status.length && !f.status.includes(r.status)) return false;
  if (skip !== 'type' && f.type.length && !f.type.includes(r.type)) return false;
  if (skip !== 'dept' && f.dept.length && !f.dept.includes(r.dept)) return false;
  if (skip !== 'by' && f.by.length && !f.by.includes(r.by)) return false;
  if (skip !== 'pr' && f.pr !== 'any' && (f.pr === 'has') !== !!r.pr) return false;
  if (skip !== 'date' && f.date !== 'any') {
    const d = new Date(r.createdAt).getTime();
    const now = Date.now();
    if (f.date === 'year' && new Date(r.createdAt).getFullYear() !== new Date().getFullYear()) return false;
    if (['7', '30', '90'].includes(f.date) && d < now - Number(f.date) * 864e5) return false;
    if (f.date === 'custom') {
      if (f.from && d < new Date(f.from).getTime()) return false;
      if (f.to && d > new Date(f.to).getTime() + 864e5 - 1) return false;
    }
  }
  return true;
}

function activeCount(f: Filters) {
  return f.status.length + f.type.length + f.dept.length + f.by.length + (f.date !== 'any' ? 1 : 0) + (f.pr !== 'any' ? 1 : 0);
}

interface View { id: string; en: string; ar: string; f: Filters; builtIn?: boolean }
const BUILT_IN_VIEWS: View[] = [
  { id: 'all',     en: 'All requests',      ar: 'كل الطلبات',          f: EMPTY, builtIn: true },
  { id: 'action',  en: 'Needs my action',   ar: 'تتطلب إجرائي',        f: { ...EMPTY, status: ['draft', 'returned'] }, builtIn: true },
  { id: 'pending', en: 'Awaiting approval', ar: 'بانتظار الاعتماد',    f: { ...EMPTY, status: ['submitted', 'under-review'] }, builtIn: true },
  { id: 'pr',      en: 'PR created',        ar: 'تم إنشاء طلب الشراء', f: { ...EMPTY, status: ['approved'], pr: 'has' }, builtIn: true },
];

type SortKey = 'requestNo' | 'title' | 'status' | 'type' | 'dept' | 'createdAt' | 'pr' | 'by';

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props {
  onNewRequest: () => void;
  onOpenRequest: (id: string) => void;
  initialFilter?: TenderStatus | 'all';
}

export default function MyRequests({ onNewRequest, onOpenRequest, initialFilter = 'all' }: Props) {
  const { isAr } = useLanguage();
  const t = useT();
  const { requests, userName } = useRequests();

  const rows: Row[] = useMemo(() => requests.map((r: SavedRequest) => ({
    id: r.id,
    requestNo: r.requestNo || '',
    title: r.title, titleAr: r.titleAr || r.title,
    status: r.status, type: r.type,
    dept: r.department, deptAr: r.departmentAr || r.department,
    createdAt: r.createdAt, pr: r.prNumber || '',
    by: r.createdByName || userName || '—', byAr: r.createdByNameAr || r.createdByName || userName || '—',
    budget: r.budget,
  })), [requests, userName]);

  const [search, setSearch] = useState('');
  const [f, setF] = useState<Filters>(initialFilter === 'all' || initialFilter === 'approved' ? EMPTY : { ...EMPTY, status: [initialFilter] });
  const [viewId, setViewId] = useState<string>('all');
  const [views, setViews] = useState<View[]>(BUILT_IN_VIEWS);
  const [panel, setPanel] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'createdAt', dir: -1 });
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());

  // Two tabs only: everything, or closed (approved — PR created / handed to procurement)
  const [tab, setTab] = useState<'all' | 'closed'>(initialFilter === 'approved' ? 'closed' : 'all');
  const isClosed = (r: Row) => r.status === 'approved';

  const q = search.trim().toLowerCase();
  const searched = rows.filter((r) => !q || [r.requestNo, r.title, r.titleAr, r.dept, r.deptAr, r.pr, r.by, r.byAr].some((v) => v.toLowerCase().includes(q)));
  const filtered = searched.filter((r) => matches(r, f));
  const tabbed = filtered.filter((r) => tab === 'all' || isClosed(r));
  const sorted = [...tabbed].sort((a, b) => {
    const va = a[sort.key] || '', vb = b[sort.key] || '';
    return va < vb ? -sort.dir : va > vb ? sort.dir : 0;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [search, f, tab]);
  const shown = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const n = activeCount(f);
  const allOnPage = shown.length > 0 && shown.every((r) => sel.has(r.id));

  function exportCsv() {
    const list = sel.size ? sorted.filter((r) => sel.has(r.id)) : sorted;
    const head = ['Request number', 'Request', 'Status', 'Type', 'Department', 'Created on', 'PR number', 'Created by'];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [head, ...list.map((r) => [r.requestNo || 'Draft', r.title, STATUS[r.status].en, TYPE[r.type].en, r.dept, r.createdAt.slice(0, 10), r.pr, r.by])]
      .map((l) => l.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = 'my-requests.csv'; a.click(); URL.revokeObjectURL(a.href);
  }

  const chips: { label: string; clear: () => void }[] = [
    ...f.status.map((s) => ({ label: isAr ? STATUS[s].ar : STATUS[s].en, clear: () => setF({ ...f, status: f.status.filter((x) => x !== s) }) })),
    ...f.type.map((s) => ({ label: isAr ? TYPE[s].ar : TYPE[s].en, clear: () => setF({ ...f, type: f.type.filter((x) => x !== s) }) })),
    ...f.dept.map((s) => ({ label: isAr ? (rows.find((r) => r.dept === s)?.deptAr ?? s) : s, clear: () => setF({ ...f, dept: f.dept.filter((x) => x !== s) }) })),
    ...f.by.map((s) => ({ label: isAr ? (rows.find((r) => r.by === s)?.byAr ?? s) : s, clear: () => setF({ ...f, by: f.by.filter((x) => x !== s) }) })),
    ...(f.date !== 'any' ? [{ label: f.date === 'custom' ? `${f.from || '…'} – ${f.to || '…'}` : (isAr ? DATE_PRESETS.find((d) => d.key === f.date)!.ar : DATE_PRESETS.find((d) => d.key === f.date)!.en), clear: () => setF({ ...f, date: 'any', from: '', to: '' }) }] : []),
    ...(f.pr !== 'any' ? [{ label: isAr ? PR_OPTS.find((p) => p.key === f.pr)!.ar : PR_OPTS.find((p) => p.key === f.pr)!.en, clear: () => setF({ ...f, pr: 'any' }) }] : []),
  ];
  const currentView = views.find((v) => v.id === viewId);

  return (
    <div className="px-4 sm:px-6 py-7 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight flex items-center gap-2.5">{t('My Requests', 'طلباتي')}<span className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 tabular-nums" title={t('Total requests', 'إجمالي الطلبات')}>{rows.length}</span></h1>
          <p className="text-[13px] text-neutral-500 mt-1">{t('Track every request you have raised — from draft to purchase requisition.', 'تابع كل طلب أنشأته — من المسودة حتى طلب الشراء.')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={exportCsv}><DownloadIcon className="w-4 h-4" />{sel.size ? t(`Export (${sel.size})`, `تصدير (${sel.size})`) : t('Export', 'تصدير')}</Button>
          <Button variant="primary" size="md" onClick={onNewRequest}><PlusIcon className="w-4 h-4" />{t('New Request', 'طلب جديد')}</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 border-b border-neutral-200 flex items-center gap-1">
        {([['all', 'All requests', 'كل الطلبات', filtered.length], ['closed', 'Closed requests', 'الطلبات المغلقة', filtered.filter(isClosed).length]] as const).map(([k, en, ar, count]) => {
          const active = tab === k;
          return (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`flex items-center gap-2 px-3 py-2.5 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
              {t(en, ar)}
              <span className={`text-[11px] font-semibold px-1.5 py-px rounded-md tabular-nums ${active ? 'bg-brand-50 text-brand-700' : 'bg-neutral-100 text-neutral-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <SearchIcon className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search request number, title, PR number, department…', 'ابحث برقم الطلب أو العنوان أو رقم طلب الشراء أو الإدارة…')}
            className="w-full ps-9 pe-8 h-10 text-[13px] border border-neutral-200 rounded-lg bg-white placeholder-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
          {search && <button onClick={() => setSearch('')} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"><XIcon className="w-3.5 h-3.5" /></button>}
        </div>
        {currentView && currentView.id !== 'all' ? (
          <span className="h-10 inline-flex items-center gap-1.5 px-3 rounded-lg bg-neutral-100 text-[12.5px] text-neutral-600">
            {t('View', 'العرض')}: <span className="font-semibold text-neutral-800">{isAr ? currentView.ar : currentView.en}</span>
          </span>
        ) : null}
        <button type="button" onClick={() => setPanel(true)}
          className={`ms-auto h-10 inline-flex items-center gap-2 px-3.5 rounded-lg border text-[13px] font-semibold transition-colors ${n ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
          <FilterGlyph className="w-4 h-4" />{t('Filters', 'التصفية')}
          {n > 0 && <span className="min-w-[20px] h-5 px-1 rounded-full bg-brand-600 text-white text-[11px] flex items-center justify-center tabular-nums">{n}</span>}
        </button>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {chips.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 ps-2.5 pe-1 h-7 rounded-full bg-white border border-neutral-200 text-[12px] text-neutral-700">
              {c.label}
              <button onClick={() => { c.clear(); setViewId(''); }} className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><XIcon className="w-3 h-3" /></button>
            </span>
          ))}
          <button onClick={() => { setF(EMPTY); setViewId('all'); }} className="text-[12px] font-semibold text-brand-700 hover:underline ms-1">{t('Clear all', 'مسح الكل')}</button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-[13px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="w-11 ps-4 py-3">
                  <Check on={allOnPage} onClick={() => setSel((s) => { const x = new Set(s); shown.forEach((r) => allOnPage ? x.delete(r.id) : x.add(r.id)); return x; })} />
                </th>
                {([
                  ['requestNo', 'Request number', 'رقم الطلب'],
                  ['title', 'Request', 'الطلب'],
                  ['status', 'Status', 'الحالة'],
                  ['type', 'Type', 'النوع'],
                  ['dept', 'Department', 'الإدارة'],
                  ['createdAt', 'Created on', 'تاريخ الإنشاء'],
                  ['pr', 'PR number', 'رقم طلب الشراء'],
                  ['by', 'Created by', 'أنشئ بواسطة'],
                ] as [SortKey, string, string][]).map(([k, en, ar]) => (
                  <th key={k} className="text-start px-3 py-3 font-semibold text-[12px] text-neutral-500 whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 hover:text-neutral-800 ${sort.key === k ? 'text-neutral-800' : ''}`}>
                      {t(en, ar)}
                      <span className={`flex flex-col -space-y-1.5 ${sort.key === k ? '' : 'opacity-30'}`}>
                        <ChevronUpIcon className={`w-3 h-3 ${sort.key === k && sort.dir === 1 ? 'text-brand-600' : ''}`} />
                        <ChevronDownIcon className={`w-3 h-3 ${sort.key === k && sort.dir === -1 ? 'text-brand-600' : ''}`} />
                      </span>
                    </button>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {shown.map((r) => {
                const st = STATUS[r.status], ty = TYPE[r.type];
                const on = sel.has(r.id);
                return (
                  <tr key={r.id} onClick={() => onOpenRequest(r.id)} className={`group cursor-pointer transition-colors ${on ? 'bg-brand-50/40' : 'hover:bg-neutral-50'}`}>
                    <td className="ps-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Check on={on} onClick={() => setSel((s) => { const x = new Set(s); if (x.has(r.id)) x.delete(r.id); else x.add(r.id); return x; })} />
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {r.requestNo
                        ? <span className="font-mono text-[12.5px] text-neutral-700" dir="ltr">{r.requestNo}</span>
                        : <span className="text-[12px] italic text-neutral-400">{t('Not assigned', 'لم يُخصص')}</span>}
                    </td>
                    <td className="px-3 py-3.5 max-w-[320px]">
                      <p className="font-semibold text-neutral-900 truncate group-hover:text-brand-700">{isAr ? r.titleAr : r.title}</p>
                      <p className="text-[11.5px] text-neutral-400 mt-0.5 tabular-nums" dir="ltr">{r.budget}</p>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium ${st.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{isAr ? st.ar : st.en}</span>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-md border text-[12px] font-medium ${ty.chip}`}>{isAr ? ty.ar : ty.en}</span>
                    </td>
                    <td className="px-3 py-3.5 text-neutral-600 max-w-[200px] truncate">{isAr ? r.deptAr : r.dept}</td>
                    <td className="px-3 py-3.5 text-neutral-600 whitespace-nowrap tabular-nums">{fmt(r.createdAt)}</td>
                    <td className="px-3 py-3.5 whitespace-nowrap">{r.pr ? <span className="font-mono text-[12.5px] text-neutral-700" dir="ltr">{r.pr}</span> : <span className="text-neutral-300">—</span>}</td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2"><Initials name={r.by} /><span className="text-neutral-700">{isAr ? r.byAr : r.by}</span></span>
                    </td>
                    <td className="pe-3 py-3.5"><ChevronRightIcon className={`w-4 h-4 text-neutral-300 group-hover:text-brand-600 ${isAr ? 'rotate-180' : ''}`} /></td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={10} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center"><SearchIcon className="w-5 h-5 text-neutral-400" /></span>
                    <p className="font-semibold text-neutral-700">{rows.length ? t('No requests match', 'لا توجد طلبات مطابقة') : t('No requests yet', 'لا توجد طلبات بعد')}</p>
                    <p className="text-[12px] text-neutral-400">{t('Try another search or adjust the filters.', 'جرّب بحثًا آخر أو عدّل التصفية.')}</p>
                    {(n > 0 || search) && <button onClick={() => { setF(EMPTY); setSearch(''); setViewId('all'); }} className="text-[12px] font-semibold text-brand-700 hover:underline mt-1">{t('Clear search & filters', 'مسح البحث والتصفية')}</button>}
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sorted.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-neutral-100 flex-wrap">
            <p className="text-[12px] text-neutral-500 tabular-nums">
              {t('Showing', 'عرض')} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} {t('of', 'من')} {sorted.length}
              {sel.size > 0 && <span className="ms-2 text-brand-700 font-semibold">· {sel.size} {t('selected', 'محدد')}</span>}
            </p>
            <div className="flex items-center gap-1">
              <PageBtn disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronRightIcon className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />{t('Previous', 'السابق')}</PageBtn>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-[12.5px] font-semibold tabular-nums ${p === page ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:bg-neutral-100'}`}>{p}</button>
              ))}
              <PageBtn disabled={page === pages} onClick={() => setPage(page + 1)}>{t('Next', 'التالي')}<ChevronRightIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} /></PageBtn>
            </div>
          </div>
        )}
      </div>

      {panel && (
        <FilterPanel rows={searched} applied={f} views={views} viewId={viewId} isAr={isAr} t={t}
          onClose={() => setPanel(false)}
          onApply={(nf, vid) => { setF(nf); setViewId(vid); setPanel(false); }}
          onSaveView={(name, nf) => { const v: View = { id: `v-${Date.now()}`, en: name, ar: name, f: nf }; setViews((vs) => [...vs, v]); return v.id; }}
          onDeleteView={(id) => { setViews((vs) => vs.filter((v) => v.id !== id)); if (viewId === id) setViewId(''); }} />
      )}
    </div>
  );
}

// ─── Filter side panel ───────────────────────────────────────────────────────

type T = (en: string, ar: string) => string;

function FilterPanel({ rows, applied, views, viewId, isAr, t, onClose, onApply, onSaveView, onDeleteView }: {
  rows: Row[]; applied: Filters; views: View[]; viewId: string; isAr: boolean; t: T;
  onClose: () => void; onApply: (f: Filters, viewId: string) => void;
  onSaveView: (name: string, f: Filters) => string; onDeleteView: (id: string) => void;
}) {
  const [f, setF] = useState<Filters>(applied);
  const [vid, setVid] = useState(viewId);
  const [open, setOpen] = useState<Set<Section>>(() => new Set<Section>((['status', 'type', 'dept', 'by', 'date', 'pr'] as Section[]).filter((s) => sectionCount(applied, s) > 0).concat(['status'])));
  const [viewMenu, setViewMenu] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [deptQ, setDeptQ] = useState('');
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const result = rows.filter((r) => matches(r, f)).length;
  const facet = (s: Section, pred: (r: Row) => boolean) => rows.filter((r) => matches(r, f, s) && pred(r)).length;
  const upd = (nf: Filters) => { setF(nf); setVid(''); };
  const toggleIn = <K extends 'status' | 'type' | 'dept' | 'by'>(k: K, v: Filters[K][number]) => {
    const list = f[k] as string[];
    upd({ ...f, [k]: list.includes(v as string) ? list.filter((x) => x !== v) : [...list, v] });
  };
  const toggleOpen = (s: Section) => setOpen((o) => { const x = new Set(o); if (x.has(s)) x.delete(s); else x.add(s); return x; });

  const depts = Array.from(new Map(rows.map((r) => [r.dept, r.deptAr])).entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const people = Array.from(new Map(rows.map((r) => [r.by, r.byAr])).entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const current = views.find((v) => v.id === vid);

  return (
    <>
      <div className="fixed inset-0 bg-neutral-900/25 z-40 cm-fade-in" onClick={onClose} />
      <aside className="fixed inset-y-0 end-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col slide-up" role="dialog" aria-label={t('Filters', 'التصفية')}>
        {/* Header: saved view selector */}
        <div className="relative px-5 pt-4 pb-3 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{t('Filters', 'التصفية')}</p>
              <button type="button" onClick={() => setViewMenu((v) => !v)} className="mt-0.5 inline-flex items-center gap-1 text-[15px] font-bold text-neutral-900 hover:text-brand-700">
                {current ? (isAr ? current.ar : current.en) : t('Custom filter', 'تصفية مخصصة')}
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-200/60" title={t('Close', 'إغلاق')}><XIcon className="w-4 h-4" /></button>
          </div>
          {viewMenu && (
            <div className="absolute start-5 top-[68px] z-10 w-72 bg-white rounded-xl border border-neutral-200 shadow-xl py-1.5 cm-fade-in">
              <p className="px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{t('Saved views', 'العروض المحفوظة')}</p>
              {views.map((v) => (
                <div key={v.id} className={`group flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 cursor-pointer ${v.id === vid ? 'text-brand-700' : 'text-neutral-700'}`}
                  onClick={() => { setF(v.f); setVid(v.id); setViewMenu(false); }}>
                  <span className="w-4">{v.id === vid && <CheckIcon className="w-4 h-4" />}</span>
                  <span className="flex-1 text-[13px] font-medium">{isAr ? v.ar : v.en}</span>
                  <span className="text-[11px] text-neutral-400 tabular-nums">{rows.filter((r) => matches(r, v.f)).length}</span>
                  {!v.builtIn && <button onClick={(e) => { e.stopPropagation(); onDeleteView(v.id); }} className="text-[11px] text-error-600 opacity-0 group-hover:opacity-100">{t('Delete', 'حذف')}</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto">
          <Sect id="status" title={t('Status', 'الحالة')} count={f.status.length} open={open} onToggle={toggleOpen} onClear={() => upd({ ...f, status: [] })} t={t}>
            {STATUSES.map((s) => (
              <Opt key={s.key} on={f.status.includes(s.key)} onClick={() => toggleIn('status', s.key)} count={facet('status', (r) => r.status === s.key)}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />{isAr ? s.ar : s.en}
              </Opt>
            ))}
          </Sect>
          <Sect id="type" title={t('Type', 'النوع')} count={f.type.length} open={open} onToggle={toggleOpen} onClear={() => upd({ ...f, type: [] })} t={t}>
            {TYPES.map((s) => (
              <Opt key={s.key} on={f.type.includes(s.key)} onClick={() => toggleIn('type', s.key)} count={facet('type', (r) => r.type === s.key)}>{isAr ? s.ar : s.en}</Opt>
            ))}
          </Sect>
          <Sect id="dept" title={t('Department', 'الإدارة')} count={f.dept.length} open={open} onToggle={toggleOpen} onClear={() => upd({ ...f, dept: [] })} t={t}>
            {depts.length > 5 && (
              <div className="relative mb-1.5">
                <SearchIcon className="w-3.5 h-3.5 text-neutral-400 absolute start-2.5 top-1/2 -translate-y-1/2" />
                <input value={deptQ} onChange={(e) => setDeptQ(e.target.value)} placeholder={t('Find a department', 'ابحث عن إدارة')}
                  className="w-full h-8 ps-8 pe-2 text-[12.5px] rounded-md border border-neutral-200 focus:border-brand-500 focus:outline-none" />
              </div>
            )}
            {depts.filter(([en, ar]) => !deptQ || (en + ar).toLowerCase().includes(deptQ.toLowerCase())).map(([en, ar]) => (
              <Opt key={en} on={f.dept.includes(en)} onClick={() => toggleIn('dept', en)} count={facet('dept', (r) => r.dept === en)}>{isAr ? ar : en}</Opt>
            ))}
          </Sect>
          <Sect id="by" title={t('Created by', 'أنشئ بواسطة')} count={f.by.length} open={open} onToggle={toggleOpen} onClear={() => upd({ ...f, by: [] })} t={t}>
            {people.map(([en, ar]) => (
              <Opt key={en} on={f.by.includes(en)} onClick={() => toggleIn('by', en)} count={facet('by', (r) => r.by === en)}><Initials name={en} />{isAr ? ar : en}</Opt>
            ))}
          </Sect>
          <Sect id="date" title={t('Created on', 'تاريخ الإنشاء')} count={f.date !== 'any' ? 1 : 0} open={open} onToggle={toggleOpen} onClear={() => upd({ ...f, date: 'any', from: '', to: '' })} t={t}>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((d) => (
                <button key={d.key} type="button" onClick={() => upd({ ...f, date: d.key })}
                  className={`h-8 px-3 rounded-full border text-[12.5px] font-medium ${f.date === d.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>{isAr ? d.ar : d.en}</button>
              ))}
            </div>
            {f.date === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {(['from', 'to'] as const).map((k) => (
                  <label key={k} className="text-[11.5px] text-neutral-500">{k === 'from' ? t('From', 'من') : t('To', 'إلى')}
                    <input type="date" value={f[k]} onChange={(e) => upd({ ...f, [k]: e.target.value })} className="mt-1 w-full h-9 px-2 text-[12.5px] rounded-md border border-neutral-200 text-neutral-800 focus:border-brand-500 focus:outline-none" />
                  </label>
                ))}
              </div>
            )}
          </Sect>
          <Sect id="pr" title={t('PR number', 'رقم طلب الشراء')} count={f.pr !== 'any' ? 1 : 0} open={open} onToggle={toggleOpen} onClear={() => upd({ ...f, pr: 'any' })} t={t}>
            {PR_OPTS.map((p) => (
              <Opt key={p.key} radio on={f.pr === p.key} onClick={() => upd({ ...f, pr: p.key })}
                count={p.key === 'any' ? facet('pr', () => true) : facet('pr', (r) => (p.key === 'has') === !!r.pr)}>{isAr ? p.ar : p.en}</Opt>
            ))}
          </Sect>
          <p className="px-5 py-4 text-[11.5px] text-neutral-400 leading-relaxed">{t('Options within a section match any selected value; sections combine so a request must match all of them. Counts show results for the other filters you have set.', 'الخيارات داخل القسم تطابق أي قيمة محددة؛ وتُجمع الأقسام بحيث يجب أن يطابق الطلب جميعها. توضح الأعداد النتائج بحسب بقية التصفيات.')}</p>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-5 py-4 space-y-3 bg-white">
          {naming !== null ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={naming} onChange={(e) => setNaming(e.target.value)} placeholder={t('View name', 'اسم العرض')}
                onKeyDown={(e) => { if (e.key === 'Enter' && naming.trim()) { setVid(onSaveView(naming.trim(), f)); setNaming(null); } }}
                className="flex-1 h-9 px-3 text-[13px] rounded-lg border border-neutral-300 focus:border-brand-500 focus:outline-none" />
              <Button size="sm" variant="primary" disabled={!naming.trim()} onClick={() => { setVid(onSaveView(naming.trim(), f)); setNaming(null); }}>{t('Save', 'حفظ')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setNaming(null)}>{t('Cancel', 'إلغاء')}</Button>
            </div>
          ) : null}
          <button type="button" onClick={() => onApply(f, vid)} disabled={result === 0}
            className="w-full h-11 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13.5px] font-semibold flex items-center justify-center gap-2 shadow-sm">
            <SearchIcon className="w-4 h-4" />{t(`Show ${result} request${result === 1 ? '' : 's'}`, `عرض ${result} طلب`)}
          </button>
          <div className="flex items-center justify-between text-[12.5px]">
            <button type="button" onClick={() => upd(EMPTY)} disabled={activeCount(f) === 0} className="font-semibold text-neutral-500 hover:text-neutral-800 disabled:opacity-40">{t('Reset all', 'إعادة تعيين الكل')}</button>
            <button type="button" onClick={() => setNaming('')} disabled={activeCount(f) === 0 || naming !== null} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline disabled:opacity-40 disabled:no-underline"><PlusIcon className="w-3.5 h-3.5" />{t('Save as view', 'حفظ كعرض')}</button>
          </div>
        </div>
      </aside>
    </>
  );
}

function sectionCount(f: Filters, s: Section) {
  return s === 'date' ? (f.date !== 'any' ? 1 : 0) : s === 'pr' ? (f.pr !== 'any' ? 1 : 0) : f[s].length;
}

function Sect({ id, title, count, open, onToggle, onClear, t, children }: {
  id: Section; title: string; count: number; open: Set<Section>; onToggle: (s: Section) => void; onClear: () => void; t: T; children: ReactNode;
}) {
  const isOpen = open.has(id);
  return (
    <div className={`border-b border-neutral-100 ${isOpen ? 'bg-neutral-50/50' : ''}`}>
      <div className="flex items-center gap-2 px-5 h-12">
        <button type="button" onClick={() => onToggle(id)} className={`flex-1 text-start text-[13.5px] ${isOpen ? 'font-bold text-neutral-900' : 'font-medium text-neutral-700'}`}>{title}</button>
        {count > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-50 text-brand-700 text-[11.5px] font-semibold flex items-center justify-center tabular-nums">{count}</span>}
        {count > 0 && <button type="button" onClick={onClear} className="text-[11.5px] font-semibold text-neutral-400 hover:text-error-600">{t('Clear', 'مسح')}</button>}
        <button type="button" onClick={() => onToggle(id)} className="w-7 h-7 rounded-md flex items-center justify-center text-brand-600 hover:bg-brand-50" aria-expanded={isOpen}>
          {isOpen ? <ChevronUpIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
        </button>
      </div>
      {isOpen && <div className="px-5 pb-4 -mt-1 space-y-0.5 cm-fade-in">{children}</div>}
    </div>
  );
}

function Opt({ on, onClick, count, radio, children }: { on: boolean; onClick: () => void; count: number; radio?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={!on && count === 0}
      className="w-full flex items-center gap-2.5 px-2 h-9 rounded-md text-[13px] text-neutral-700 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent">
      {radio
        ? <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${on ? 'border-brand-600' : 'border-neutral-300 bg-white'}`}>{on && <span className="w-2 h-2 rounded-full bg-brand-600" />}</span>
        : <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${on ? 'bg-brand-600 border-brand-600 text-white' : 'border-neutral-300 bg-white'}`}>{on && <CheckIcon className="w-3 h-3" />}</span>}
      <span className="flex-1 flex items-center gap-2 text-start min-w-0 truncate">{children}</span>
      <span className="text-[11.5px] text-neutral-400 tabular-nums">{count}</span>
    </button>
  );
}

// ─── Small bits ──────────────────────────────────────────────────────────────

function Check({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} aria-pressed={on}
      className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-brand-600 border-brand-600 text-white' : 'border-neutral-300 bg-white hover:border-neutral-400'}`}>
      {on && <CheckIcon className="w-3 h-3" />}
    </button>
  );
}

function PageBtn({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="h-8 px-2.5 rounded-lg border border-neutral-200 text-[12.5px] font-semibold text-neutral-600 inline-flex items-center gap-1 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent mx-1">
      {children}
    </button>
  );
}

const AV_COLORS = ['#1a6b38', '#2563eb', '#7c3aed', '#b45309', '#0e7490', '#be185d', '#4d7c0f'];
function Initials({ name }: { name: string }) {
  const parts = name.replace(/^Al-/, '').split(/[\s-]+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  const c = AV_COLORS[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AV_COLORS.length];
  return <span className="w-6 h-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0" style={{ background: c }}>{ini}</span>;
}

function FilterGlyph({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
  );
}
