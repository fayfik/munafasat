// "BOQ items" tab on the request detail page: summary counts, charts, and the
// full item list with search, filters, sort and Table / Cards / List views.
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import type { RfpDetail } from '../inbox/types';
import { SearchIcon, XIcon, ChevronDownIcon, ChevronRightIcon } from '../components/Icons';
import { BoqViewButton } from '../components/BoqLineDetails';

type T = (en: string, ar: string) => string;
type Line = RfpDetail['boq'][number];
interface Item extends Line { idx: number; total: number; name: string; desc: string; budget: string; quarter: string }
type View = 'table' | 'list';
type Sort = 'value-desc' | 'value-asc' | 'name' | 'delivery';

const PALETTE = ['#2A6193', '#699843', '#6A47D6', '#E08E00', '#C22C18', '#0E8C8C', '#B5487A', '#868D80'];
const sar = (n: number) => 'SAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const qOf = (iso?: string) => { if (!iso) return '—'; const d = new Date(iso); return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`; };

export default function BoqItems({ rfp, isAr, t }: { rfp: RfpDetail; isAr: boolean; t: T }) {
  const items: Item[] = useMemo(() => rfp.boq.map((l, idx) => ({
    ...l, idx, total: (Number(l.qty) || 1) * l.unitPrice,
    name: isAr ? l.itemAr : l.itemEn, desc: (isAr ? l.descAr : l.descEn) ?? '',
    budget: (isAr ? l.budgetAr : l.budgetEn) ?? '—', quarter: qOf(l.delivery),
  })), [rfp, isAr]);
  const budgets = useMemo(() => Array.from(new Set(items.map((i) => i.budget))), [items]);
  const color = (b: string) => PALETTE[budgets.indexOf(b) % PALETTE.length];

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | 'Material' | 'Service'>('all');
  const [budget, setBudget] = useState<string>('all');
  const [quarter, setQuarter] = useState<string>('all');
  const [sort, setSort] = useState<Sort>('value-desc');
  const [view, setView] = useState<View>('table');
  // Expanded items (accordion): click a row to see its details inline.
  const [open, setOpen] = useState<Set<number>>(new Set());
  const viewLabel = t('View item details', 'عرض تفاصيل البند');
  const toggle = (idx: number) => setOpen((o) => { const x = new Set(o); if (x.has(idx)) x.delete(idx); else x.add(idx); return x; });
  const reveal = (idx: number) => { setOpen((o) => new Set(o).add(idx)); setTimeout(() => document.getElementById(`boq-item-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); };

  const quarters = useMemo(() => Array.from(new Set(items.map((i) => i.quarter))).sort((a, b) => a.slice(3).localeCompare(b.slice(3)) || a.localeCompare(b)), [items]);
  const ql = q.trim().toLowerCase();
  const shown = items
    .filter((i) => !ql || [i.itemEn, i.itemAr, i.descEn ?? '', i.descAr ?? '', i.budgetEn ?? '', i.budgetAr ?? '', i.unit].some((v) => v.toLowerCase().includes(ql)))
    .filter((i) => cat === 'all' || i.category === cat)
    .filter((i) => budget === 'all' || i.budget === budget)
    .filter((i) => quarter === 'all' || i.quarter === quarter)
    .sort((a, b) => sort === 'value-desc' ? b.total - a.total : sort === 'value-asc' ? a.total - b.total : sort === 'name' ? a.name.localeCompare(b.name) : (a.delivery ?? '').localeCompare(b.delivery ?? ''));
  const filtersOn = (ql ? 1 : 0) + (cat !== 'all' ? 1 : 0) + (budget !== 'all' ? 1 : 0) + (quarter !== 'all' ? 1 : 0);
  const clear = () => { setQ(''); setCat('all'); setBudget('all'); setQuarter('all'); };

  const total = items.reduce((s, i) => s + i.total, 0);
  const shownTotal = shown.reduce((s, i) => s + i.total, 0);
  const mat = items.filter((i) => i.category === 'Material'), svc = items.filter((i) => i.category === 'Service');
  const sum = (xs: Item[]) => xs.reduce((s, i) => s + i.total, 0);
  const nextDelivery = items.map((i) => i.delivery).filter(Boolean).sort()[0];
  const fmtD = (iso?: string) => iso ? new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const byBudget = budgets.map((b) => ({ label: b, value: sum(items.filter((i) => i.budget === b)), n: items.filter((i) => i.budget === b).length, color: color(b) })).sort((a, b) => b.value - a.value);
  const top = [...items].sort((a, b) => b.total - a.total).slice(0, 6);
  const byQuarter = quarters.map((qq) => ({ q: qq, value: sum(items.filter((i) => i.quarter === qq)), n: items.filter((i) => i.quarter === qq).length }));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label={t('Line items', 'البنود')} value={String(items.length)} sub={t(`${budgets.length} budget lines`, `${budgets.length} بنود ميزانية`)} />
        <Kpi label={t('Total value (excl. VAT)', 'القيمة الإجمالية (قبل الضريبة)')} value={sar(total)} sub={t(`${sar(total * 1.15)} incl. VAT`, `${sar(total * 1.15)} شامل الضريبة`)} wide ltr />
        <Kpi label={t('Materials', 'المواد')} value={String(mat.length)} sub={`SAR ${compact(sum(mat))} · ${total ? Math.round((sum(mat) / total) * 100) : 0}%`} dot="bg-[#699843]" />
        <Kpi label={t('Services', 'الخدمات')} value={String(svc.length)} sub={`SAR ${compact(sum(svc))} · ${total ? Math.round((sum(svc) / total) * 100) : 0}%`} dot="bg-[#2A6193]" />
        <Kpi label={t('First delivery', 'أول تسليم')} value={fmtD(nextDelivery)} sub={t(`${quarters.length} delivery quarters`, `${quarters.length} أرباع تسليم`)} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-3">
        <ChartCard title={t('Value by budget line', 'القيمة حسب بند الميزانية')}>
          <div className="flex items-center gap-4">
            <Donut segs={byBudget.map((b) => ({ value: b.value, color: b.color }))} center={<><span className="text-[9.5px] uppercase tracking-wide text-neutral-400">{t('Total', 'الإجمالي')}</span><span className="text-[14px] font-bold text-neutral-900" dir="ltr">{compact(total)}</span><span className="text-[9.5px] text-neutral-400">SAR</span></>} />
            <ul className="flex-1 min-w-0 space-y-1.5">
              {byBudget.map((b) => (
                <li key={b.label}>
                  <button type="button" onClick={() => setBudget(budget === b.label ? 'all' : b.label)}
                    className={`w-full flex items-center gap-2 text-start text-[12px] rounded-md px-1.5 py-0.5 ${budget === b.label ? 'bg-brand-50 text-brand-800' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: b.color }} />
                    <span className="truncate flex-1">{b.label}</span>
                    <span className="font-semibold text-neutral-800 tabular-nums">{total ? Math.round((b.value / total) * 100) : 0}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
        <ChartCard title={t('Top items by value', 'أعلى البنود قيمة')}>
          <ul className="space-y-2.5">
            {top.map((i) => (
              <li key={i.idx}>
                <button type="button" onClick={() => { clear(); reveal(i.idx); }} className="w-full text-start group">
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate text-neutral-700 group-hover:text-brand-700">{i.name}</span>
                    <span className="font-semibold text-neutral-800 tabular-nums" dir="ltr">{compact(i.total)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(i.total / (top[0]?.total || 1)) * 100}%`, background: color(i.budget) }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title={t('Delivery schedule', 'جدول التسليم')}>
          <div className="h-[170px] flex items-end gap-2" dir="ltr">
            {byQuarter.map((b) => {
              const max = Math.max(...byQuarter.map((x) => x.value), 1);
              const on = quarter === b.q;
              return (
                <button key={b.q} type="button" onClick={() => setQuarter(on ? 'all' : b.q)} title={`${b.q} · ${b.n} ${t('items', 'بنود')} · ${sar(b.value)}`}
                  className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1 group">
                  <span className="text-[10.5px] font-semibold text-neutral-600 tabular-nums">{b.n}</span>
                  <span className={`w-full max-w-[34px] rounded-t-md transition-colors ${on ? 'bg-brand-600' : 'bg-[#9CBEDF] group-hover:bg-[#2A6193]'}`} style={{ height: `${Math.max(6, (b.value / max) * 120)}px` }} />
                  <span className={`text-[10px] whitespace-nowrap ${on ? 'text-brand-700 font-semibold' : 'text-neutral-400'}`}>{b.q}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">{t('Bar height = value; number = items. Click a bar to filter.', 'ارتفاع العمود = القيمة؛ الرقم = عدد البنود. انقر عمودًا للتصفية.')}</p>
        </ChartCard>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 p-3 flex-wrap border-b border-neutral-100">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <SearchIcon className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search items, descriptions, budget lines…', 'ابحث في البنود والأوصاف وبنود الميزانية…')}
              className="w-full h-9 ps-9 pe-8 text-[13px] rounded-lg border border-neutral-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" />
            {q && <button onClick={() => setQ('')} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"><XIcon className="w-3.5 h-3.5" /></button>}
          </div>
          <Seg value={cat} onChange={setCat} options={[['all', t('All', 'الكل')], ['Material', t('Materials', 'مواد')], ['Service', t('Services', 'خدمات')]]} />
          <Select value={budget} onChange={setBudget} label={t('Budget line', 'بند الميزانية')} options={[['all', t('All budget lines', 'كل بنود الميزانية')], ...budgets.map((b) => [b, b] as [string, string])]} />
          <Select value={quarter} onChange={setQuarter} label={t('Delivery', 'التسليم')} options={[['all', t('Any delivery', 'أي موعد تسليم')], ...quarters.map((x) => [x, x] as [string, string])]} />
          <Select value={sort} onChange={(v) => setSort(v as Sort)} label={t('Sort', 'الترتيب')} options={[['value-desc', t('Value: high → low', 'القيمة: الأعلى أولًا')], ['value-asc', t('Value: low → high', 'القيمة: الأقل أولًا')], ['name', t('Name A → Z', 'الاسم أ ← ي')], ['delivery', t('Delivery date', 'تاريخ التسليم')]]} />
          <div className="ms-auto inline-flex items-center rounded-lg border border-neutral-200 p-0.5" role="group" aria-label={t('View', 'العرض')}>
            {(['table', 'list'] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} title={v === 'table' ? t('Table view', 'عرض الجدول') : t('List view', 'عرض القائمة')}
                className={`h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[12px] font-semibold ${view === v ? 'bg-brand-50 text-brand-700' : 'text-neutral-500 hover:text-neutral-800'}`}>
                <ViewGlyph v={v} />{v === 'table' ? t('Table', 'جدول') : t('List', 'قائمة')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-2 text-[12px] text-neutral-500 bg-neutral-50/60 border-b border-neutral-100">
          <span data-boq-count={shown.length}>{t(`Showing ${shown.length} of ${items.length} items`, `عرض ${shown.length} من ${items.length} بنود`)} · <span className="font-semibold text-neutral-700" dir="ltr">{sar(shownTotal)}</span></span>
          <span className="flex items-center gap-3">
            {filtersOn > 0 && <button onClick={clear} className="font-semibold text-brand-700 hover:underline">{t('Clear filters', 'مسح التصفية')}</button>}
            {shown.length > 0 && (shown.every((i) => open.has(i.idx))
              ? <button onClick={() => setOpen(new Set())} className="font-semibold text-neutral-600 hover:text-neutral-900">{t('Collapse all', 'طي الكل')}</button>
              : <button onClick={() => setOpen(new Set(shown.map((i) => i.idx)))} className="font-semibold text-neutral-600 hover:text-neutral-900">{t('Expand all', 'توسيع الكل')}</button>)}
          </span>
        </div>

        {shown.length === 0 ? (
          <div className="py-14 text-center">
            <span className="mx-auto w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center"><SearchIcon className="w-5 h-5 text-neutral-400" /></span>
            <p className="mt-2 font-semibold text-neutral-700">{t('No items match', 'لا توجد بنود مطابقة')}</p>
            <button onClick={clear} className="mt-1 text-[12.5px] font-semibold text-brand-700 hover:underline">{t('Clear search & filters', 'مسح البحث والتصفية')}</button>
          </div>
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-[12.5px]">
              <thead><tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wide text-neutral-500">
                <th className="text-center w-10 px-2 py-2.5 font-medium">#</th>
                <th className="text-start px-3 py-2.5 font-medium">{t('Item', 'البند')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t('Category', 'التصنيف')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t('Budget line', 'بند الميزانية')}</th>
                <th className="text-end px-3 py-2.5 font-medium">{t('Qty', 'الكمية')}</th>
                <th className="text-end px-3 py-2.5 font-medium">{t('Unit price', 'سعر الوحدة')}</th>
                <th className="text-end px-3 py-2.5 font-medium">{t('Total', 'الإجمالي')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t('Delivery', 'التسليم')}</th>
                <th className="text-start px-3 py-2.5 font-medium w-32">{t('Share', 'الحصة')}</th>
                <th className="w-11 px-1 py-2.5"><span className="sr-only">{t('View', 'عرض')}</span></th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {shown.map((i) => { const isOpen = open.has(i.idx); return (
                  <Fragment key={i.idx}>
                  <tr id={`boq-item-${i.idx}`} onClick={() => toggle(i.idx)} aria-expanded={isOpen} className={`cursor-pointer group ${isOpen ? 'bg-brand-50/40' : 'hover:bg-neutral-50'}`}>
                    <td className="text-center px-2 py-3 text-neutral-400 tabular-nums"><span className="inline-flex items-center gap-1"><ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90 text-brand-700' : isAr ? 'rotate-180' : ''}`} />{i.idx + 1}</span></td>
                    <td className="px-3 py-3 max-w-[320px]">
                      <p className="font-semibold text-neutral-900 group-hover:text-brand-700 truncate">{i.name}</p>
                      <p className="text-[11.5px] text-neutral-500 truncate">{i.desc}</p>
                    </td>
                    <td className="px-3 py-3"><Cat c={i.category} t={t} /></td>
                    <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-neutral-600"><span className="w-2 h-2 rounded-sm" style={{ background: color(i.budget) }} /><span className="truncate max-w-[180px]">{i.budget}</span></span></td>
                    <td className="px-3 py-3 text-end whitespace-nowrap text-neutral-700 tabular-nums">{i.qty} <span className="text-neutral-400">{i.unit}</span></td>
                    <td className="px-3 py-3 text-end whitespace-nowrap tabular-nums text-neutral-700" dir="ltr">{sar(i.unitPrice)}</td>
                    <td className="px-3 py-3 text-end whitespace-nowrap tabular-nums font-semibold text-neutral-900" dir="ltr">{sar(i.total)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-neutral-600">{fmtD(i.delivery)}</td>
                    <td className="px-3 py-3"><Share v={i.total / (total || 1)} color={color(i.budget)} /></td>
                    <td className="px-1 py-2 text-center"><BoqViewButton index={i.idx} onClick={() => toggle(i.idx)} open={open.has(i.idx)} label={viewLabel} /></td>
                  </tr>
                  {isOpen && <tr className="bg-brand-50/20"><td colSpan={10} className="p-0"><ItemDetails item={i} total={total} color={color(i.budget)} fmtD={fmtD} t={t} /></td></tr>}
                  </Fragment>
                ); })}
              </tbody>
              <tfoot className="bg-neutral-50 border-t-2 border-neutral-200 text-[12.5px]">
                <tr><td colSpan={6} className="px-3 py-2 text-end text-neutral-500">{t('Subtotal', 'المجموع الفرعي')}</td><td className="px-3 py-2 text-end font-semibold tabular-nums" dir="ltr">{sar(shownTotal)}</td><td colSpan={3} /></tr>
                <tr><td colSpan={6} className="px-3 py-2 text-end text-neutral-500">{t('VAT (15%)', 'ضريبة القيمة المضافة (15٪)')}</td><td className="px-3 py-2 text-end font-semibold tabular-nums" dir="ltr">{sar(shownTotal * 0.15)}</td><td colSpan={3} /></tr>
                <tr className="border-t border-neutral-200"><td colSpan={6} className="px-3 py-2.5 text-end font-bold text-neutral-800">{t('Grand total', 'الإجمالي الكلي')}</td><td className="px-3 py-2.5 text-end font-bold text-brand-700 tabular-nums" dir="ltr">{sar(shownTotal * 1.15)}</td><td colSpan={3} /></tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {budgets.filter((b) => shown.some((i) => i.budget === b)).map((b) => {
              const rows = shown.filter((i) => i.budget === b);
              return (
                <div key={b}>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50/70">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color(b) }} />
                    <p className="text-[12.5px] font-bold text-neutral-800 flex-1">{b} <span className="font-normal text-neutral-400">· {rows.length} {rows.length === 1 ? t('item', 'بند') : t('items', 'بنود')}</span></p>
                    <span className="text-[12.5px] font-semibold text-neutral-700 tabular-nums" dir="ltr">{sar(sum(rows))}</span>
                  </div>
                  {rows.map((i) => { const isOpen = open.has(i.idx); return (
                    <div key={i.idx} id={`boq-item-${i.idx}`} className={isOpen ? 'bg-brand-50/20' : ''}>
                    <div className={`flex items-center pe-3 ${isOpen ? 'bg-brand-50/40' : 'hover:bg-neutral-50'}`}>
                    <button type="button" onClick={() => toggle(i.idx)} aria-expanded={isOpen} className="flex-1 min-w-0 flex items-center gap-3 ps-4 pe-2 py-2.5 text-start group">
                      <ChevronRightIcon className={`w-3.5 h-3.5 text-neutral-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90 text-brand-700' : isAr ? 'rotate-180' : ''}`} />
                      <span className="w-6 text-[11px] text-neutral-400 tabular-nums text-center">{i.idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-neutral-900 group-hover:text-brand-700 truncate">{i.name}</p>
                        <p className="text-[11.5px] text-neutral-500 truncate">{i.qty} {i.unit} · {fmtD(i.delivery)}</p>
                      </div>
                      <Cat c={i.category} t={t} />
                      <span className="w-36 text-end text-[13px] font-semibold text-neutral-900 tabular-nums" dir="ltr">{sar(i.total)}</span>
                    </button>
                    <BoqViewButton index={i.idx} onClick={() => toggle(i.idx)} open={open.has(i.idx)} label={viewLabel} />
                    </div>
                    {isOpen && <ItemDetails item={i} total={total} color={color(i.budget)} fmtD={fmtD} t={t} />}
                    </div>
                  ); })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, wide, ltr, dot }: { label: string; value: string; sub: string; wide?: boolean; ltr?: boolean; dot?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-3.5 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-1.5">{dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}{label}</p>
      <p className="mt-1 text-[19px] font-bold text-neutral-900 tabular-nums truncate"><span dir={ltr ? 'ltr' : undefined}>{value}</span></p>
      <p className="text-[11.5px] text-neutral-500 truncate" dir="auto">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
      <h3 className="text-[13px] font-bold text-neutral-800 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Donut({ segs, center }: { segs: { value: number; color: string }[]; center: ReactNode }) {
  const size = 132, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const tot = segs.reduce((s, x) => s + x.value, 0) || 1;
  let off = 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        {segs.map((s, i) => { const len = (s.value / tot) * c; const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-off} />; off += len; return el; })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">{center}</div>
    </div>
  );
}

function Cat({ c, t }: { c?: 'Service' | 'Material'; t: T }) {
  if (!c) return <span className="text-neutral-300">—</span>;
  return c === 'Material'
    ? <span className="inline-flex px-2 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#EEF5E8] text-[#517632]">{t('Material', 'مواد')}</span>
    : <span className="inline-flex px-2 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#EEF4FB] text-[#2A6193]">{t('Service', 'خدمة')}</span>;
}

function Share({ v, color }: { v: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: color }} /></div>
      <span className="text-[11px] text-neutral-500 tabular-nums w-10 text-end">{(v * 100).toFixed(1)}%</span>
    </div>
  );
}

function Seg<K extends string>({ value, onChange, options }: { value: K; onChange: (v: K) => void; options: [K, string][] }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-neutral-200 p-0.5">
      {options.map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k}
          className={`h-8 px-3 rounded-md text-[12.5px] font-semibold ${value === k ? 'bg-brand-600 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}>{label}</button>
      ))}
    </div>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: [string, string][] }) {
  const on = value !== 'all' && !value.startsWith('value-') && value !== 'name' && value !== 'delivery';
  return (
    <label className={`relative inline-flex items-center h-9 rounded-lg border text-[12.5px] ${on ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-neutral-200 bg-white text-neutral-700'}`}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className="appearance-none bg-transparent h-full ps-3 pe-8 font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate">
        {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <ChevronDownIcon className="w-4 h-4 absolute end-2 pointer-events-none opacity-60" />
    </label>
  );
}

function ViewGlyph({ v }: { v: View }) {
  const p = { className: 'w-4 h-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const };
  if (v === 'table') return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></svg>;
  return <svg {...p}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>;
}

/** Inline details shown when an item row is expanded. */
function ItemDetails({ item, total, color, fmtD, t }: { item: Item; total: number; color: string; fmtD: (s?: string) => string; t: T }) {
  const cells: [string, ReactNode][] = [
    [t('Category', 'التصنيف'), <Cat c={item.category} t={t} />],
    [t('Budget line', 'بند الميزانية'), <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{item.budget}</span>],
    [t('Quantity', 'الكمية'), `${item.qty} ${item.unit}`],
    [t('Unit price', 'سعر الوحدة'), <span dir="ltr">{sar(item.unitPrice)}</span>],
    [t('Line total (excl. VAT)', 'إجمالي البند (قبل الضريبة)'), <span dir="ltr" className="font-bold">{sar(item.total)}</span>],
    [t('VAT (15%)', 'ضريبة القيمة المضافة (15٪)'), <span dir="ltr">{sar(item.total * 0.15)}</span>],
    [t('Line total (incl. VAT)', 'إجمالي البند (شامل الضريبة)'), <span dir="ltr" className="font-semibold">{sar(item.total * 1.15)}</span>],
    [t('Delivery date', 'تاريخ التسليم'), `${fmtD(item.delivery)} · ${item.quarter}`],
  ];
  return (
    <div className="px-4 sm:px-12 py-4 border-t border-brand-100 cm-fade-in" data-boq-details>
      <div className="flex items-start gap-3">
        <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('Description', 'الوصف')}</p>
          <p className="mt-1 text-[13px] text-neutral-700 leading-relaxed">{item.desc || '—'}</p>
          <dl className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
            {cells.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-neutral-500">{k}</dt>
                <dd className="mt-0.5 text-[13px] text-neutral-900 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[11px] text-neutral-500 whitespace-nowrap">{t('Share of BOQ', 'الحصة من الجدول')}</span>
            <div className="flex-1 max-w-sm"><Share v={item.total / (total || 1)} color={color} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
