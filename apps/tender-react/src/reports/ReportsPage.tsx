// Reports: landing catalogue (tiles) + report view (filters, KPIs with drill-down,
// charts, data table, export, schedule, saved views, comparison, access, definitions).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import * as AutoTableMod from 'jspdf-autotable';
import { useLanguage, useT } from '../context/LanguageContext';
import { ArrowLeftIcon, SearchIcon, XIcon, ChevronDownIcon, DownloadIcon, PlusIcon } from '../components/Icons';
import { useLoading, Sk, SkeletonCards } from '../components/Loader';
import { REPORTS, GROUPS, type Report, type Row, type Kpi, type Chart, type GroupKey, type FilterKey, type Col } from './catalogue';
import { DEPARTMENTS, PROJECTS, CATEGORIES, DEPT_AR, NOW } from './dataset';
import { ReportIcon, BarChart, HBarChart, DonutChart, LineChart, fmtVal, type Datum, type T } from './ui';

// jspdf-autotable ships ESM + UMD builds; resolve the function whichever one the bundler picked.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AT = AutoTableMod as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autoTableFn = (doc: jsPDF, opts: any) => {
  const fn = typeof AT.default === 'function' ? AT.default : typeof AT.default?.default === 'function' ? AT.default.default : typeof AT.autoTable === 'function' ? AT.autoTable : null;
  if (fn) return fn(doc, opts);
  (AT.applyPlugin ?? AT.default?.applyPlugin)?.(jsPDF);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).autoTable(opts);
};
const ls = { get: (k: string) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } }, set: (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } } };
const fmtTime = (d: Date, isAr: boolean) => d.toLocaleString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function ReportsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const report = REPORTS.find((r) => r.id === openId);
  return report ? <ReportView key={report.id} report={report} onBack={() => setOpenId(null)} onOpen={setOpenId} /> : <ReportsHome onOpen={setOpenId} />;
}

// ═══ Landing ════════════════════════════════════════════════════════════════


function ReportsHome({ onOpen }: { onOpen: (id: string) => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<GroupKey | 'all' | 'fav'>('all');
  const [favs, setFavs] = useState<string[]>(() => ls.get('mf:report-favs') ?? ['overview', 'pending-approvals', 'sla']);
  const toggleFav = (id: string) => setFavs((f) => { const n = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; ls.set('mf:report-favs', n); return n; });
  const ql = q.trim().toLowerCase();
  const match = (r: Report) => !ql || [r.en, r.ar, r.descEn, r.descAr].some((s) => s.toLowerCase().includes(ql));
  const groups = (Object.keys(GROUPS) as GroupKey[]).filter((g) => group === 'all' || group === g || group === 'fav');
  const shownCount = REPORTS.filter((r) => match(r) && (group === 'all' || group === r.group || (group === 'fav' && favs.includes(r.id)))).length;

  return (
    <div className="px-4 sm:px-6 py-7 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-[#F4F8FC] via-white to-[#F3F8EE] px-6 py-6 sm:px-8">
        <div className="absolute -end-10 -top-12 w-56 h-56 rounded-full bg-[#2A6193]/5" />
        <div className="absolute end-24 -bottom-16 w-40 h-40 rounded-full bg-[#699843]/10" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="max-w-2xl">
            <h1 className="text-[26px] font-bold text-neutral-900 tracking-tight flex items-center gap-3">{t('Reports', 'التقارير')}<span className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-600 tabular-nums">{REPORTS.length}</span></h1>
            <p className="text-[13.5px] text-neutral-600 mt-1.5 leading-relaxed">{t('Procurement, approval and contract insight in one place — from executive overviews to the underlying records.', 'رؤى المشتريات والاعتمادات والعقود في مكان واحد — من النظرة التنفيذية حتى السجلات التفصيلية.')}</p>
          </div>
          <div className="text-[12px] text-neutral-500 flex items-center gap-1.5 bg-white/80 border border-neutral-200 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />{t('Data refreshed', 'آخر تحديث للبيانات')} <span className="font-semibold text-neutral-700">{fmtTime(new Date(NOW), isAr)}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <SearchIcon className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search reports…', 'ابحث في التقارير…')}
            className="w-full h-10 ps-9 pe-8 text-[13px] rounded-lg border border-neutral-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
          {q && <button onClick={() => setQ('')} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"><XIcon className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {([['all', t('All', 'الكل')], ['fav', t('★ Favourites', '★ المفضلة')], ...(Object.keys(GROUPS) as GroupKey[]).map((g) => [g, t(GROUPS[g].short[0], GROUPS[g].short[1])])] as [string, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setGroup(k as GroupKey | 'all' | 'fav')} aria-pressed={group === k}
              className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${group === k ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
              {k.length === 1 ? <span className="opacity-60 me-1">{k}.</span> : null}{label}
            </button>
          ))}
        </div>
        <span className="ms-auto text-[12px] text-neutral-500" data-report-count={shownCount}>{t(`${shownCount} reports`, `${shownCount} تقرير`)}</span>
      </div>

      {/* Groups */}
      <div className="mt-6 space-y-9">
        {groups.map((g) => {
          const G = GROUPS[g];
          const list = REPORTS.filter((r) => r.group === g && match(r) && (group !== 'fav' || favs.includes(r.id)));
          if (!list.length) return null;
          return (
            <section key={g}>
              <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-bold text-white" style={{ background: G.color }}>{g}</span>
                  <div>
                    <h2 className="text-[17px] font-bold text-neutral-900 flex items-center gap-2 flex-wrap">{isAr ? G.ar : G.en}
                      {G.tag && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: G.soft, color: G.color }}>{t(G.tag[0], G.tag[1])}</span>}
                    </h2>
                    <p className="text-[12px] text-neutral-500">{t('Who uses it:', 'المستخدمون:')} {isAr ? G.whoAr : G.who}</p>
                  </div>
                </div>
                <span className="text-[12px] text-neutral-400">{list.length} {t('reports', 'تقارير')}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {list.map((r) => (
                  <div key={r.id} role="button" tabIndex={0} onClick={() => onOpen(r.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(r.id); }} data-report-tile={r.id}
                    className="group relative text-start rounded-xl border border-neutral-200 bg-white p-4 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 overflow-hidden"
                    style={{ ['--c' as string]: G.color }}>
                    <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ background: G.color }} />
                    <span className="absolute -end-8 -bottom-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: G.soft }} />
                    <div className="relative flex items-start justify-between gap-2">
                      <span className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: G.soft, color: G.color }}><ReportIcon name={r.icon} className="w-[22px] h-[22px]" /></span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }} title={favs.includes(r.id) ? t('Remove from favourites', 'إزالة من المفضلة') : t('Add to favourites', 'إضافة إلى المفضلة')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[16px] transition-colors ${favs.includes(r.id) ? 'text-[#E0A100]' : 'text-neutral-300 hover:text-neutral-500'}`}>{favs.includes(r.id) ? '★' : '☆'}</button>
                    </div>
                    <h3 className="relative mt-3 text-[14.5px] font-bold text-neutral-900">{isAr ? r.ar : r.en}</h3>
                    <p className="relative mt-1 text-[12.5px] text-neutral-500 leading-relaxed line-clamp-2 min-h-[38px]">{isAr ? r.descAr : r.descEn}</p>
                    <div className="relative mt-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-neutral-400">{r.kpis.length} {t('KPIs', 'مؤشرات')} · {r.charts.length} {t('charts', 'رسوم')}</span>
                      <span className="flex items-center gap-1 text-[12px] font-semibold opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" style={{ color: G.color }}>{t('Open', 'فتح')}<ArrowLeftIcon className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} /></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {shownCount === 0 && <p className="py-16 text-center text-neutral-500">{t('No reports match your search.', 'لا توجد تقارير مطابقة.')}</p>}
      </div>
    </div>
  );
}

// ═══ Report view ════════════════════════════════════════════════════════════

type Period = 'all' | '30' | '90' | 'ytd' | '365';
const PERIODS: [Period, string, string][] = [['all', 'All time', 'كل الفترات'], ['30', 'Last 30 days', 'آخر 30 يومًا'], ['90', 'Last 90 days', 'آخر 90 يومًا'], ['ytd', 'Year to date', 'منذ بداية العام'], ['365', 'Last 12 months', 'آخر 12 شهرًا']];
type CompareMode = 'none' | 'period' | 'department' | 'category';
interface Filters { period: Period; department: string; project: string; category: string; status: string }
interface Drill { label: string; fn: (r: Row) => boolean }
interface SavedView { id: string; name: string; f: Filters; compare: CompareMode; ca: string; cb: string }
interface Schedule { id: string; freq: 'Daily' | 'Weekly' | 'Monthly'; time: string; day: string; format: 'Excel' | 'CSV' | 'PDF'; to: string }
const DEF_F: Filters = { period: 'all', department: 'all', project: 'all', category: 'all', status: 'all' };
const ROLES_VIEW = [
  { id: 'director', en: 'Procurement Director — all departments', ar: 'مدير المشتريات — جميع الإدارات', dept: null as string | null },
  { id: 'it-mgr', en: 'Department Manager — IT & Digital', ar: 'مدير إدارة — تقنية المعلومات', dept: 'IT & Digital' },
  { id: 'fin-mgr', en: 'Department Manager — Finance', ar: 'مدير إدارة — المالية', dept: 'Finance' },
];

function windowOf(p: Period): [number, number] | null {
  const d = 864e5;
  if (p === 'all') return null;
  if (p === 'ytd') { const s = new Date(new Date(NOW).getFullYear(), 0, 1).getTime(); return [s, NOW]; }
  return [NOW - Number(p) * d, NOW];
}

function ReportView({ report, onBack, onOpen }: { report: Report; onBack: () => void; onOpen: (id: string) => void }) {
  const { isAr } = useLanguage();
  const t = useT();
  const G = GROUPS[report.group];
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const [reload, setReload] = useState(0);
  const busy = useLoading([report.id, reload], 550);
  const [role, setRole] = useState(ROLES_VIEW[0].id);
  const [f, setF] = useState<Filters>(DEF_F);
  const [compare, setCompare] = useState<CompareMode>('none');
  const [ca, setCa] = useState(''); const [cb, setCb] = useState('');
  const [drill, setDrill] = useState<Drill | null>(null);
  const [panel, setPanel] = useState<'defs' | 'schedule' | null>(null);
  const [views, setViews] = useState<SavedView[]>(() => ls.get(`mf:views:${report.id}`) ?? []);
  const [viewId, setViewId] = useState('default');
  const [schedules, setSchedules] = useState<Schedule[]>(() => ls.get(`mf:sched:${report.id}`) ?? []);
  const [toast, setToast] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(true);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2600); return () => clearTimeout(id); }, [toast]);

  const roleDept = ROLES_VIEW.find((r) => r.id === role)!.dept;
  const all = useMemo(() => report.source(), [report]);
  const has = (k: FilterKey) => report.filters.includes(k);
  const base = (rows: Row[], win: [number, number] | null, extra?: (r: Row) => boolean) => rows.filter((r) => {
    if (roleDept && r.department && r.department !== roleDept) return false;
    if (win) { const d = +new Date(r[report.dateKey]); if (d < win[0] || d > win[1]) return false; }
    if (has('department') && f.department !== 'all' && r.department !== f.department) return false;
    if (has('project') && f.project !== 'all' && r.project !== f.project) return false;
    if (has('category') && f.category !== 'all' && r.category !== f.category) return false;
    if (has('status') && f.status !== 'all' && report.statusKey && r[report.statusKey] !== f.status) return false;
    return !extra || extra(r);
  });
  const win = windowOf(f.period);
  const dimKey = compare === 'department' ? 'department' : 'category';
  const rowsA = compare === 'department' || compare === 'category' ? base(all, win, (r) => r[dimKey] === ca) : base(all, win);
  const rowsB: Row[] | null =
    compare === 'period' && win ? base(all, [win[0] - (win[1] - win[0]), win[0]]) :
    (compare === 'department' || compare === 'category') && cb ? base(all, win, (r) => r[dimKey] === cb) : null;
  const rows = drill ? rowsA.filter(drill.fn) : rowsA;
  const statusValues = report.statusKey ? Array.from(new Set(all.map((r) => String(r[report.statusKey!])))) : [];
  const deptOptions = Array.from(new Set(all.map((r) => r.department).filter(Boolean))) as string[];
  const catOptions = Array.from(new Set(all.map((r) => r.category).filter(Boolean))) as string[];
  const tableRows = report.table ? report.table(rows) : rows;
  const activeFilters = (['department', 'project', 'category', 'status'] as const).filter((k) => f[k] !== 'all').length + (f.period !== 'all' ? 1 : 0);

  const doRefresh = () => { setReload((x) => x + 1); setRefreshedAt(new Date()); };
  const applyView = (v: SavedView | null) => { if (!v) { setF(DEF_F); setCompare('none'); setCa(''); setCb(''); setViewId('default'); } else { setF(v.f); setCompare(v.compare); setCa(v.ca); setCb(v.cb); setViewId(v.id); } setDrill(null); };
  const saveView = () => {
    const label = `${t('View', 'عرض')} ${views.length + 1}: ${[f.period !== 'all' ? PERIODS.find((p) => p[0] === f.period)![1] : null, f.department !== 'all' ? f.department : null, f.category !== 'all' ? f.category : null, f.status !== 'all' ? f.status : null, compare !== 'none' ? `vs ${compare}` : null].filter(Boolean).join(' · ') || t('Default filters', 'الفلاتر الافتراضية')}`;
    const v: SavedView = { id: `v${Date.now()}`, name: label, f, compare, ca, cb };
    const n = [...views, v]; setViews(n); ls.set(`mf:views:${report.id}`, n); setViewId(v.id); setToast(t('View saved', 'تم حفظ العرض'));
  };
  const delView = (id: string) => { const n = views.filter((v) => v.id !== id); setViews(n); ls.set(`mf:views:${report.id}`, n); if (viewId === id) applyView(null); };

  const exportAs = (kind: 'xlsx' | 'csv' | 'pdf') => {
    const head = report.columns.map((c) => (isAr ? c.ar : c.en));
    const body = tableRows.map((r) => report.columns.map((c) => plain(r[c.key], c)));
    const name = `${report.id}-${new Date().toISOString().slice(0, 10)}`;
    if (kind === 'csv') {
      const csv = [head, ...body].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(a.href);
    } else if (kind === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([head, ...body]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, report.en.slice(0, 30)); XLSX.writeFile(wb, `${name}.xlsx`);
    } else {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFontSize(14); doc.text(report.en, 40, 40); doc.setFontSize(9); doc.setTextColor(120);
      doc.text(`Munafasat · ${fmtTime(refreshedAt, false)} · ${tableRows.length} rows`, 40, 56);
      autoTableFn(doc, { head: [report.columns.map((c) => c.en)], body: tableRows.map((r) => report.columns.map((c) => plain(r[c.key], c))), startY: 70, styles: { fontSize: 8 }, headStyles: { fillColor: [42, 97, 147] } });
      doc.save(`${name}.pdf`);
    }
    setToast(t(`Exported ${kind.toUpperCase()}`, `تم التصدير ${kind.toUpperCase()}`));
  };

  const related = REPORTS.filter((r) => r.group === report.group && r.id !== report.id).slice(0, 4);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto" data-report-view={report.id}>
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button onClick={onBack} title={t('Back to reports', 'العودة إلى التقارير')} className="w-10 h-10 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 flex items-center justify-center flex-shrink-0">
          <ArrowLeftIcon className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
        </button>
        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: G.soft, color: G.color }}><ReportIcon name={report.icon} className="w-6 h-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-neutral-500"><button onClick={onBack} className="hover:text-brand-700">{t('Reports', 'التقارير')}</button><span className="mx-1.5 text-neutral-300">/</span>{isAr ? G.ar : G.en}</p>
          <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">{isAr ? report.ar : report.en}</h1>
          <p className="text-[13px] text-neutral-500">{isAr ? report.descAr : report.descEn}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={doRefresh} title={t('Refresh data', 'تحديث البيانات')} className="h-9 px-3 rounded-lg border border-neutral-200 bg-white text-[12px] text-neutral-600 hover:border-neutral-300 inline-flex items-center gap-2" data-freshness>
            <RefreshGlyph className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            <span>{t('Updated', 'آخر تحديث')} <span className="font-semibold text-neutral-800">{fmtTime(refreshedAt, isAr)}</span></span>
          </button>
          <button onClick={() => setPanel('defs')} className="h-9 px-3 rounded-lg border border-neutral-200 bg-white text-[12.5px] font-semibold text-neutral-700 hover:border-neutral-300 inline-flex items-center gap-1.5"><InfoGlyph className="w-4 h-4" />{t('Definitions', 'التعريفات')}</button>
          <button onClick={() => setPanel('schedule')} className="h-9 px-3 rounded-lg border border-neutral-200 bg-white text-[12.5px] font-semibold text-neutral-700 hover:border-neutral-300 inline-flex items-center gap-1.5"><ClockGlyph className="w-4 h-4" />{t('Schedule', 'جدولة')}{schedules.length > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10.5px] flex items-center justify-center">{schedules.length}</span>}</button>
          <Menu label={<><DownloadIcon className="w-4 h-4" />{t('Export', 'تصدير')}<ChevronDownIcon className="w-3.5 h-3.5 opacity-60" /></>} primary
            items={[['Excel (.xlsx)', 'Excel (.xlsx)', () => exportAs('xlsx')], ['CSV', 'CSV', () => exportAs('csv')], ['PDF', 'PDF', () => exportAs('pdf')]]} t={t} />
        </div>
      </div>

      {/* Access + saved views */}
      <div className="mt-4 flex items-center gap-2 flex-wrap text-[12px]">
        <span className="inline-flex items-center gap-1.5 h-8 ps-2.5 pe-1 rounded-lg bg-neutral-100 text-neutral-600" data-access>
          <LockGlyph className="w-3.5 h-3.5" />{t('Viewing as', 'العرض بصفة')}
          <select value={role} onChange={(e) => { setRole(e.target.value); setDrill(null); }} aria-label={t('Viewing as', 'العرض بصفة')} className="bg-white border border-neutral-200 rounded-md h-6 px-1.5 text-[12px] font-semibold text-neutral-800 focus:outline-none">
            {ROLES_VIEW.map((r) => <option key={r.id} value={r.id}>{t(r.en, r.ar)}</option>)}
          </select>
        </span>
        <span className="text-neutral-400">{t('Access:', 'الوصول:')} {report.roles.join(', ')}{roleDept ? t(` · limited to ${roleDept}`, ` · مقتصر على ${DEPT_AR[roleDept] ?? roleDept}`) : ''}</span>
        <span className="ms-auto inline-flex items-center gap-1.5">
          <span className="text-neutral-500">{t('Saved view', 'العرض المحفوظ')}</span>
          <select value={viewId} onChange={(e) => applyView(views.find((v) => v.id === e.target.value) ?? null)} aria-label={t('Saved view', 'العرض المحفوظ')} className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-[12px] font-semibold text-neutral-800 max-w-[260px]">
            <option value="default">{t('Default view', 'العرض الافتراضي')}</option>
            {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {viewId !== 'default' && <button onClick={() => delView(viewId)} className="h-8 px-2 rounded-lg text-error-600 hover:bg-error-50 font-semibold">{t('Delete', 'حذف')}</button>}
          <button onClick={saveView} className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-white font-semibold text-brand-700 hover:border-brand-300 inline-flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" />{t('Save view', 'حفظ العرض')}</button>
        </span>
      </div>

      {/* Global filters */}
      <div className="mt-3 bg-white rounded-xl border border-neutral-200 shadow-sm p-3 flex items-center gap-2 flex-wrap" data-filters>
        <FSelect label={t('Period', 'الفترة')} value={f.period} onChange={(v) => { setF({ ...f, period: v as Period }); setViewId('default'); }} options={PERIODS.map(([k, en, ar]) => [k, t(en, ar)])} />
        {has('department') && <FSelect label={t('Department', 'الإدارة')} value={f.department} onChange={(v) => { setF({ ...f, department: v }); setViewId('default'); }} options={[['all', t('All departments', 'كل الإدارات')], ...DEPARTMENTS.filter((d) => deptOptions.includes(d)).map((d) => [d, isAr ? DEPT_AR[d] : d] as [string, string])]} />}
        {has('project') && <FSelect label={t('Project', 'المشروع')} value={f.project} onChange={(v) => { setF({ ...f, project: v }); setViewId('default'); }} options={[['all', t('All projects', 'كل المشاريع')], ...PROJECTS.map((p) => [p, p] as [string, string])]} />}
        {has('category') && <FSelect label={t('Category', 'الفئة')} value={f.category} onChange={(v) => { setF({ ...f, category: v }); setViewId('default'); }} options={[['all', t('All categories', 'كل الفئات')], ...CATEGORIES.filter((c) => catOptions.includes(c)).map((c) => [c, c] as [string, string])]} />}
        {has('status') && report.statusKey && <FSelect label={t('Status', 'الحالة')} value={f.status} onChange={(v) => { setF({ ...f, status: v }); setViewId('default'); }} options={[['all', t('All statuses', 'كل الحالات')], ...statusValues.map((s) => [s, s] as [string, string])]} />}
        <span className="w-px h-6 bg-neutral-200 mx-1" />
        <FSelect label={t('Compare', 'المقارنة')} value={compare} onChange={(v) => { const m = v as CompareMode; setCompare(m); setDrill(null); const opts = m === 'department' ? deptOptions : catOptions; setCa(opts[0] ?? ''); setCb(opts[1] ?? ''); }}
          options={[['none', t('No comparison', 'بدون مقارنة')], ['period', t('vs previous period', 'مقابل الفترة السابقة')], ...(deptOptions.length > 1 ? [['department', t('Department vs department', 'إدارة مقابل إدارة')] as [string, string]] : []), ...(catOptions.length > 1 ? [['category', t('Category vs category', 'فئة مقابل فئة')] as [string, string]] : [])]} />
        {(compare === 'department' || compare === 'category') && (
          <>
            <FSelect label="A" value={ca} onChange={setCa} options={(compare === 'department' ? deptOptions : catOptions).map((d) => [d, d] as [string, string])} />
            <span className="text-[12px] text-neutral-400">vs</span>
            <FSelect label="B" value={cb} onChange={setCb} options={(compare === 'department' ? deptOptions : catOptions).map((d) => [d, d] as [string, string])} />
          </>
        )}
        {compare === 'period' && !win && <span className="text-[11.5px] text-warning-700">{t('Pick a period to compare with the one before it.', 'اختر فترة للمقارنة بالفترة السابقة لها.')}</span>}
        {(activeFilters > 0 || compare !== 'none') && <button onClick={() => applyView(null)} className="ms-auto text-[12px] font-semibold text-brand-700 hover:underline">{t('Reset', 'إعادة تعيين')}</button>}
      </div>

      {/* Drill path */}
      {drill && (
        <div className="mt-3 flex items-center gap-2 text-[12.5px]" data-drill>
          <span className="text-neutral-500">{t('Drill-down:', 'التعمق:')}</span>
          <span className="inline-flex items-center gap-1 ps-2.5 pe-1 h-7 rounded-full bg-neutral-900 text-white">{drill.label}<button onClick={() => setDrill(null)} className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center" title={t('Clear drill-down', 'مسح التعمق')}><XIcon className="w-3 h-3" /></button></span>
          <span className="text-neutral-400">{t(`${rows.length} underlying records`, `${rows.length} سجل تفصيلي`)}</span>
        </div>
      )}

      {busy ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4"><Sk className="h-2.5 w-24" /><Sk className="h-6 w-32 mt-3" /></div>)}</div>
          <SkeletonCards cards={1} />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className={`mt-4 grid grid-cols-2 ${report.kpis.length > 4 ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-4'} gap-3`}>
            {report.kpis.map((k) => <KpiCard key={k.en} k={k} rows={rowsA} prev={rowsB} active={drill?.label === `${t('KPI', 'مؤشر')}: ${t(k.en, k.ar)}`} isAr={isAr} t={t}
              onDrill={k.drill ? () => setDrill(drill?.label === `${t('KPI', 'مؤشر')}: ${t(k.en, k.ar)}` ? null : { label: `${t('KPI', 'مؤشر')}: ${t(k.en, k.ar)}`, fn: k.drill! }) : undefined} />)}
          </div>

          {/* Charts (supporting the table) */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400">{t('Insights', 'الرؤى')}</p>
            <button onClick={() => setShowCharts((v) => !v)} aria-expanded={showCharts} className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1">
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showCharts ? '' : isAr ? 'rotate-90' : '-rotate-90'}`} />{showCharts ? t('Hide charts', 'إخفاء الرسوم') : t('Show charts', 'إظهار الرسوم')}
            </button>
          </div>
          {showCharts && (
            <div className={`mt-2 grid gap-3 ${report.charts.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
              {report.charts.map((c) => <ChartCard key={c.en} c={c} rows={rows} prev={rowsB && !drill ? rowsB : null} drill={drill} setDrill={setDrill} color={G.color} isAr={isAr} t={t} />)}
            </div>
          )}

          {/* Table */}
          <DataTable report={report} rows={tableRows} isAr={isAr} t={t} />

          {related.length > 0 && (
            <div className="mt-6">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">{t('Related reports', 'تقارير ذات صلة')}</p>
              <div className="flex flex-wrap gap-2">
                {related.map((r) => <button key={r.id} onClick={() => onOpen(r.id)} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-neutral-200 bg-white text-[12.5px] text-neutral-700 hover:border-neutral-300 hover:shadow-sm"><span style={{ color: G.color }}><ReportIcon name={r.icon} className="w-4 h-4" /></span>{isAr ? r.ar : r.en}</button>)}
              </div>
            </div>
          )}
        </>
      )}

      {panel === 'defs' && <DefsPanel report={report} refreshedAt={refreshedAt} isAr={isAr} t={t} onClose={() => setPanel(null)} />}
      {panel === 'schedule' && <SchedulePanel schedules={schedules} isAr={isAr} t={t} onClose={() => setPanel(null)}
        onSave={(s) => { const n = [...schedules, s]; setSchedules(n); ls.set(`mf:sched:${report.id}`, n); setToast(t('Schedule created', 'تم إنشاء الجدولة')); }}
        onDelete={(id) => { const n = schedules.filter((x) => x.id !== id); setSchedules(n); ls.set(`mf:sched:${report.id}`, n); }} />}
      {toast && <div className="fixed bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-[95] px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-[13px] shadow-xl cm-fade-in" role="status">{toast}</div>}
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ k, rows, prev, onDrill, active, isAr, t }: { k: Kpi; rows: Row[]; prev: Row[] | null; onDrill?: () => void; active: boolean; isAr: boolean; t: T }) {
  const v = k.calc(rows);
  const p = prev ? k.calc(prev) : null;
  const delta = p != null && p !== 0 ? ((v - p) / Math.abs(p)) * 100 : null;
  const good = delta == null || !k.good ? null : (k.good === 'up') === delta >= 0;
  return (
    <div role={onDrill ? 'button' : undefined} tabIndex={onDrill ? 0 : undefined} onClick={onDrill} onKeyDown={(e) => { if (onDrill && e.key === 'Enter') onDrill(); }} data-kpi={k.en}
      className={`group relative bg-white rounded-xl border px-4 py-3.5 shadow-sm transition-all ${onDrill ? 'cursor-pointer hover:border-neutral-300 hover:shadow-md' : ''} ${active ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 leading-snug">{isAr ? k.ar : k.en}</p>
        <span className="relative" onClick={(e) => e.stopPropagation()}>
          <span className="peer w-5 h-5 rounded-full text-neutral-300 hover:text-neutral-600 flex items-center justify-center cursor-help" tabIndex={0} aria-label={t('Definition', 'التعريف')}><InfoGlyph className="w-3.5 h-3.5" /></span>
          <span className="pointer-events-none absolute end-0 top-6 z-20 w-60 rounded-lg bg-neutral-900 text-white text-[11.5px] leading-relaxed p-2.5 opacity-0 peer-hover:opacity-100 peer-focus:opacity-100 transition-opacity shadow-xl">{isAr ? k.def[1] : k.def[0]}</span>
        </span>
      </div>
      <p className="mt-1 text-[21px] font-bold text-neutral-900 tabular-nums truncate"><span dir="ltr">{fmtVal(v, k.fmt, true)}</span></p>
      <div className="mt-0.5 flex items-center gap-2 text-[11.5px] min-h-[18px]">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${good == null ? 'text-neutral-500' : good ? 'text-success-700' : 'text-error-700'}`} data-delta>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {p != null && <span className="text-neutral-400 truncate">{t('vs', 'مقابل')} <span dir="ltr">{fmtVal(p, k.fmt, true)}</span></span>}
        {onDrill && p == null && <span className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">{active ? t('Click to clear', 'انقر للمسح') : t('Click to drill down', 'انقر للتعمق')}</span>}
      </div>
    </div>
  );
}

// ─── Chart card ──────────────────────────────────────────────────────────────

function aggregate(rows: Row[], c: Chart): Map<string, number> {
  const groups = new Map<string, Row[]>();
  rows.forEach((r) => { const k = c.group(r); groups.set(k, [...(groups.get(k) ?? []), r]); });
  return new Map([...groups].map(([k, g]) => [k, c.metric === 'count' ? g.length : c.metric(g)]));
}

function ChartCard({ c, rows, prev, drill, setDrill, color, isAr, t }: { c: Chart; rows: Row[]; prev: Row[] | null; drill: Drill | null; setDrill: (d: Drill | null) => void; color: string; isAr: boolean; t: T }) {
  const cur = aggregate(rows, c);
  const pv = prev ? aggregate(prev, c) : null;
  let data: Datum[] = [...cur].map(([label, value]) => ({ label, value, prev: pv ? pv.get(label) ?? 0 : undefined }));
  if (c.type === 'line') data.sort((a, b) => a.label.localeCompare(b.label));
  else if (c.type === 'bar' && /^\d{4}/.test(data[0]?.label ?? '')) data.sort((a, b) => a.label.localeCompare(b.label));
  else data.sort((a, b) => b.value - a.value);
  const limit = c.top ?? (c.type === 'hbar' ? 6 : c.type === 'donut' ? 7 : undefined);
  const more = limit && data.length > limit ? data.length - limit : 0;
  if (limit) data = data.slice(0, limit);
  const drillLabel = (l: string) => `${t(c.en, c.ar)}: ${l}`;
  const activeLabel = drill?.label.startsWith(`${t(c.en, c.ar)}: `) ? drill.label.slice(t(c.en, c.ar).length + 2) : undefined;
  const pick = (l: string) => setDrill(activeLabel === l ? null : { label: drillLabel(l), fn: (r) => c.group(r) === l });
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4" data-chart={c.en}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-[13px] font-bold text-neutral-800">{isAr ? c.ar : c.en}</h3>
        {pv && <span className="flex items-center gap-2 text-[10.5px] text-neutral-400"><span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />A</span><span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-neutral-300" />B</span></span>}
      </div>
      {data.length === 0 ? <p className="py-10 text-center text-[12.5px] text-neutral-400">{t('No data for these filters.', 'لا توجد بيانات لهذه الفلاتر.')}</p>
        : c.type === 'bar' ? <BarChart data={data} fmt={c.fmt} onPick={pick} active={activeLabel} color={color} />
        : c.type === 'hbar' ? <HBarChart data={data} fmt={c.fmt} onPick={pick} active={activeLabel} color={color} />
        : c.type === 'donut' ? <DonutChart data={data} fmt={c.fmt} onPick={pick} active={activeLabel} t={t} />
        : <LineChart data={data} fmt={c.fmt} onPick={pick} active={activeLabel} color={color} />}
      <p className="mt-2 text-[10.5px] text-neutral-400">{more ? t(`+${more} more · `, `+${more} أخرى · `) : ''}{t('Click a segment to drill into its records.', 'انقر جزءًا للتعمق في سجلاته.')}</p>
    </section>
  );
}

// ─── Data table ──────────────────────────────────────────────────────────────

const STATUS_TONE = (v: string) => /approved|completed|awarded|received|closed|within|on time|active|resolved|on track/i.test(v) ? 'bg-success-50 text-success-700'
  : /rejected|overdue|breached|expired|delayed|high|over budget|cancelled|failed|≤ 30/i.test(v) ? 'bg-error-50 text-error-700'
  : /returned|expiring|pending|partially|investigating|medium|31–60|in progress|recommended/i.test(v) ? 'bg-warning-50 text-warning-700'
  : /draft|low|91/i.test(v) ? 'bg-neutral-100 text-neutral-600' : 'bg-[#EEF4FB] text-[#2A6193]';

function plain(v: unknown, c: Col): string | number {
  if (v == null) return '';
  if (typeof v === 'number') return c.kind === 'pct' ? Number(v.toFixed(1)) : Math.round(v * 100) / 100;
  return String(v);
}

function cell(v: unknown, c: Col, isAr: boolean): ReactNode {
  if (v == null || v === '') return <span className="text-neutral-300">—</span>;
  switch (c.kind) {
    case 'money': return <span dir="ltr" className="tabular-nums">{fmtVal(Number(v), 'money')}</span>;
    case 'num': return <span className="tabular-nums" dir="ltr">{fmtVal(Number(v), 'num')}</span>;
    case 'pct': return <span className="tabular-nums" dir="ltr">{fmtVal(Number(v), 'pct')}</span>;
    case 'days': return <span className="tabular-nums" dir="ltr">{fmtVal(Number(v), 'days')}</span>;
    case 'hours': return <span className="tabular-nums" dir="ltr">{fmtVal(Number(v), 'hours')}</span>;
    case 'date': return <span className="whitespace-nowrap">{new Date(String(v)).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
    case 'mono': return <span className="font-mono text-[12px] text-neutral-700" dir="ltr">{String(v)}</span>;
    case 'status': return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${STATUS_TONE(String(v))}`}>{String(v)}</span>;
    default: return c.key === 'department' && isAr ? DEPT_AR[String(v)] ?? String(v) : String(v);
  }
}

const PAGE = 15;
function DataTable({ report, rows, isAr, t }: { report: Report; rows: Row[]; isAr: boolean; t: T }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: report.sortKey ?? report.columns.find((c) => c.kind === 'money')?.key ?? report.columns[0].key, dir: -1 });
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, rows.length]);
  const ql = q.trim().toLowerCase();
  const filtered = rows.filter((r) => !ql || report.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(ql)));
  const sorted = [...filtered].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.dir; });
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const shown = sorted.slice((page - 1) * PAGE, page * PAGE);
  const totals = report.columns.map((c) => (c.kind === 'money' || (c.kind === 'num' && !/rank|score|technical|commercial|combined/i.test(c.key + c.en)) ? filtered.reduce((s, r) => s + (Number(r[c.key]) || 0), 0) : null));
  return (
    <section className="mt-4 bg-white rounded-xl border border-neutral-200 shadow-sm" data-report-table>
      <div className="flex items-center gap-2 p-3 border-b border-neutral-100 flex-wrap">
        <h3 className="text-[14px] font-bold text-neutral-900">{t('Records', 'السجلات')}</h3>
        <span className="text-[12px] text-neutral-500" data-row-count={filtered.length}>{filtered.length} {t('rows', 'صف')}</span>
        <div className="relative ms-auto w-full sm:w-72">
          <SearchIcon className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search records…', 'ابحث في السجلات…')} className="w-full h-9 ps-9 pe-3 text-[13px] rounded-lg border border-neutral-200 focus:border-brand-500 focus:outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead><tr className="bg-neutral-50 border-b border-neutral-200">
            {report.columns.map((c) => {
              const right = ['money', 'num', 'pct', 'days', 'hours'].includes(c.kind ?? '');
              return (
                <th key={c.key} className={`px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide text-neutral-500 whitespace-nowrap ${right ? 'text-end' : 'text-start'}`}>
                  <button onClick={() => setSort((s) => ({ k: c.key, dir: s.k === c.key ? (s.dir === 1 ? -1 : 1) : -1 }))} className={`inline-flex items-center gap-1 hover:text-neutral-800 ${sort.k === c.key ? 'text-neutral-900' : ''}`}>
                    {isAr ? c.ar : c.en}{sort.k === c.key && <span className="text-[9px]">{sort.dir === 1 ? '▲' : '▼'}</span>}
                  </button>
                </th>
              );
            })}
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {shown.map((r, i) => (
              <tr key={i} className="hover:bg-neutral-50/70">
                {report.columns.map((c, ci) => <td key={c.key} className={`px-3 py-2.5 ${['money', 'num', 'pct', 'days', 'hours'].includes(c.kind ?? '') ? 'text-end' : ''} ${ci === 0 || c.key === 'title' ? 'font-medium text-neutral-900' : 'text-neutral-700'} ${c.key === 'title' || c.key === 'detail' ? 'max-w-[260px] truncate' : ''}`}>{cell(r[c.key], c, isAr)}</td>)}
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={report.columns.length} className="py-12 text-center text-neutral-400">{t('No records for these filters.', 'لا توجد سجلات لهذه الفلاتر.')}</td></tr>}
          </tbody>
          {filtered.length > 0 && totals.some((x) => x != null) && (
            <tfoot className="bg-neutral-50 border-t-2 border-neutral-200 font-semibold">
              <tr>{report.columns.map((c, ci) => <td key={c.key} className={`px-3 py-2.5 ${totals[ci] != null ? 'text-end' : ''}`}>{ci === 0 ? t('Total', 'الإجمالي') : totals[ci] != null ? cell(totals[ci], c, isAr) : ''}</td>)}</tr>
            </tfoot>
          )}
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-[12px] text-neutral-500">
          <span>{t('Showing', 'عرض')} {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, sorted.length)} {t('of', 'من')} {sorted.length}</span>
          <span className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="h-8 px-2.5 rounded-lg border border-neutral-200 font-semibold disabled:opacity-40">{t('Previous', 'السابق')}</button>
            <span className="px-2 tabular-nums">{page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(page + 1)} className="h-8 px-2.5 rounded-lg border border-neutral-200 font-semibold disabled:opacity-40">{t('Next', 'التالي')}</button>
          </span>
        </div>
      )}
    </section>
  );
}

// ─── Panels & small controls ─────────────────────────────────────────────────

function Drawer({ title, onClose, children, isAr }: { title: string; onClose: () => void; children: ReactNode; isAr: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-neutral-900/25 cm-fade-in" onClick={onClose} />
      <aside role="dialog" aria-label={title} className="fixed inset-y-0 end-0 z-[81] w-full max-w-[460px] bg-white shadow-2xl flex flex-col slide-up" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-neutral-200"><h2 className="text-[15px] font-bold text-neutral-900">{title}</h2><button onClick={onClose} className="w-8 h-8 rounded-lg text-neutral-500 hover:bg-neutral-100 flex items-center justify-center"><XIcon className="w-4 h-4" /></button></div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </>
  );
}

function DefsPanel({ report, refreshedAt, isAr, t, onClose }: { report: Report; refreshedAt: Date; isAr: boolean; t: T; onClose: () => void }) {
  return (
    <Drawer title={t('Definitions', 'التعريفات')} onClose={onClose} isAr={isAr}>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">{t('KPIs', 'المؤشرات')}</p>
      <dl className="space-y-3">
        {report.kpis.map((k) => <div key={k.en} className="rounded-lg border border-neutral-200 p-3"><dt className="text-[13px] font-semibold text-neutral-900">{isAr ? k.ar : k.en}</dt><dd className="mt-0.5 text-[12.5px] text-neutral-600 leading-relaxed">{isAr ? k.def[1] : k.def[0]}</dd></div>)}
      </dl>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400 mt-5 mb-2">{t('About this report', 'عن هذا التقرير')}</p>
      <ul className="text-[12.5px] text-neutral-600 space-y-1.5">
        <li>{t('Data source: Munafasat Work Engine, SAP ECC and Etimad (nightly + on-demand refresh).', 'مصدر البيانات: محرك العمل في منافسات وSAP ECC واعتماد (تحديث ليلي وعند الطلب).')}</li>
        <li>{t('Last refreshed:', 'آخر تحديث:')} <span className="font-semibold text-neutral-800">{fmtTime(refreshedAt, isAr)}</span></li>
        <li>{t('Access:', 'الوصول:')} {report.roles.join(', ')}</li>
        <li>{t('Values are in SAR, excluding VAT unless stated.', 'القيم بالريال السعودي قبل الضريبة ما لم يُذكر خلاف ذلك.')}</li>
      </ul>
    </Drawer>
  );
}

function SchedulePanel({ schedules, isAr, t, onClose, onSave, onDelete }: { schedules: Schedule[]; isAr: boolean; t: T; onClose: () => void; onSave: (s: Schedule) => void; onDelete: (id: string) => void }) {
  const [freq, setFreq] = useState<Schedule['freq']>('Weekly');
  const [day, setDay] = useState('Sunday');
  const [time, setTime] = useState('08:00');
  const [format, setFormat] = useState<Schedule['format']>('Excel');
  const [to, setTo] = useState('');
  const valid = /\S+@\S+\.\S+/.test(to);
  return (
    <Drawer title={t('Schedule delivery', 'جدولة الإرسال')} onClose={onClose} isAr={isAr}>
      <div className="space-y-4">
        <div>
          <p className="text-[12px] font-semibold text-neutral-700 mb-1.5">{t('Frequency', 'التكرار')}</p>
          <div className="inline-flex rounded-lg border border-neutral-200 p-0.5">{(['Daily', 'Weekly', 'Monthly'] as const).map((x) => <button key={x} onClick={() => setFreq(x)} aria-pressed={freq === x} className={`h-8 px-3 rounded-md text-[12.5px] font-semibold ${freq === x ? 'bg-brand-600 text-white' : 'text-neutral-600'}`}>{t(x, ({ Daily: 'يومي', Weekly: 'أسبوعي', Monthly: 'شهري' })[x])}</button>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {freq !== 'Daily' && <label className="text-[12px] font-semibold text-neutral-700">{freq === 'Weekly' ? t('Day', 'اليوم') : t('Day of month', 'يوم الشهر')}
            <select value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-neutral-200 px-2 text-[13px] font-normal">{(freq === 'Weekly' ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] : ['1st', '15th', 'Last day']).map((d) => <option key={d}>{d}</option>)}</select></label>}
          <label className="text-[12px] font-semibold text-neutral-700">{t('Time (Riyadh)', 'الوقت (الرياض)')}<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-neutral-200 px-2 text-[13px] font-normal" /></label>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-neutral-700 mb-1.5">{t('Format', 'الصيغة')}</p>
          <div className="inline-flex rounded-lg border border-neutral-200 p-0.5">{(['Excel', 'CSV', 'PDF'] as const).map((x) => <button key={x} onClick={() => setFormat(x)} aria-pressed={format === x} className={`h-8 px-3 rounded-md text-[12.5px] font-semibold ${format === x ? 'bg-brand-600 text-white' : 'text-neutral-600'}`}>{x}</button>)}</div>
        </div>
        <label className="block text-[12px] font-semibold text-neutral-700">{t('Recipients', 'المستلمون')}
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@entity.gov.sa, …" className="mt-1 w-full h-9 rounded-lg border border-neutral-200 px-3 text-[13px] font-normal" dir="ltr" /></label>
        <button disabled={!valid} onClick={() => { onSave({ id: `s${Date.now()}`, freq, day: freq === 'Daily' ? '' : day, time, format, to }); setTo(''); }}
          className="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-semibold">{t('Create schedule', 'إنشاء الجدولة')}</button>
        <div className="pt-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-400 mb-2">{t('Active schedules', 'الجدولات النشطة')}</p>
          {schedules.length === 0 ? <p className="text-[12.5px] text-neutral-400">{t('No schedules yet.', 'لا توجد جدولات بعد.')}</p> : (
            <ul className="space-y-2" data-schedules>
              {schedules.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
                  <ClockGlyph className="w-4 h-4 text-brand-700" />
                  <div className="min-w-0 flex-1 text-[12.5px]"><p className="font-semibold text-neutral-900">{s.freq}{s.day ? ` · ${s.day}` : ''} · {s.time} · {s.format}</p><p className="text-neutral-500 truncate" dir="ltr">{s.to}</p></div>
                  <button onClick={() => onDelete(s.id)} className="text-[12px] font-semibold text-error-600 hover:underline">{t('Remove', 'إزالة')}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function FSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const on = !['all', 'none', 'default'].includes(value);
  return (
    <label className={`relative inline-flex items-center h-9 rounded-lg border text-[12.5px] ${on ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-neutral-200 bg-white text-neutral-700'}`}>
      <span className="ps-3 pe-1 text-neutral-400 text-[11.5px] whitespace-nowrap">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="appearance-none bg-transparent h-full ps-1 pe-7 font-semibold focus:outline-none cursor-pointer max-w-[190px] truncate">
        {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <ChevronDownIcon className="w-3.5 h-3.5 absolute end-2 pointer-events-none opacity-60" />
    </label>
  );
}

function Menu({ label, items, primary, t }: { label: ReactNode; items: [string, string, () => void][]; primary?: boolean; t: T }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${primary ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-neutral-200 bg-white text-neutral-700'}`}>{label}</button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-10 z-40 w-44 rounded-xl border border-neutral-200 bg-white shadow-xl py-1 cm-fade-in" role="menu">
            {items.map(([en, ar, fn]) => <button key={en} role="menuitem" onClick={() => { fn(); setOpen(false); }} className="w-full text-start px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50">{t(en, ar)}</button>)}
          </div>
        </>
      )}
    </div>
  );
}

const svgP = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
function RefreshGlyph({ className }: { className?: string }) { return <svg className={className} {...svgP}><path d="M20 11a8 8 0 0 0-14.9-3.9L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.9 3.9L20 15" /><path d="M20 20v-5h-5" /></svg>; }
function InfoGlyph({ className }: { className?: string }) { return <svg className={className} {...svgP}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></svg>; }
function ClockGlyph({ className }: { className?: string }) { return <svg className={className} {...svgP}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function LockGlyph({ className }: { className?: string }) { return <svg className={className} {...svgP}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>; }
