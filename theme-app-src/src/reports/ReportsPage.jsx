// Reports (design-review reports/ReportsPage): a catalogue of 33 reports in 5
// groups, and one report view that renders any of them — filters, compare,
// KPIs with definitions and drill-down, charts, records, saved views,
// scheduled delivery and export. Data and definitions come from catalogue.js.
import { useEffect, useMemo, useState } from 'react';
import { Icon, Btn } from '../components/ui.jsx';
import { REPORTS, GROUPS } from './catalogue.js';
import { NOW, DEPARTMENTS, PROJECTS, CATEGORIES } from './dataset.js';
import { fmtVal, ReportIcon, PALETTE } from './ui.js';
import { downloadPdf } from '../lib/pdf.js';

const ls = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
const fmtTime = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export function ReportsPage({ id, go }) {
  const report = REPORTS.find((r) => r.id === id);
  if (report) return <ReportView key={report.id} report={report} onBack={() => go('#/reports')} onOpen={(rid) => go(`#/reports/${rid}`)} />;
  return <ReportsHome onOpen={(rid) => go(`#/reports/${rid}`)} />;
}

/* ── Catalogue ─────────────────────────────────────────────────────────── */
function ReportsHome({ onOpen }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [favs, setFavs] = useState(() => ls.get('mf:favs', []));
  const toggleFav = (rid) => { const n = favs.includes(rid) ? favs.filter((x) => x !== rid) : [...favs, rid]; setFavs(n); ls.set('mf:favs', n); };
  const query = q.trim().toLowerCase();
  const match = (r) => (!query || `${r.en} ${r.descEn}`.toLowerCase().includes(query)) && (tab === 'all' || (tab === 'fav' ? favs.includes(r.id) : r.group === tab));
  const groups = Object.keys(GROUPS).map((g) => [g, REPORTS.filter((r) => r.group === g && match(r))]).filter(([, rs]) => rs.length);
  return (
    <main className="detail standalone rpt" aria-labelledby="rpt-title">
      <div className="rpt-head">
        <div>
          <h1 className="t-display" id="rpt-title">Reports <span className="count-pill t-caption-medium">{REPORTS.length}</span></h1>
          <p className="t-body muted" style={{ margin: '4px 0 0' }}>Procurement, approval and contract insight in one place — from executive overviews to the underlying records.</p>
        </div>
        <span className="t-caption muted rpt-fresh"><span className="live-dot" aria-hidden="true" />Data refreshed <strong className="ink">{fmtTime(NOW)}</strong></span>
      </div>
      <div className="rpt-tools">
        <label className="search rpt-search"><Icon name="icon-search" size={16} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" aria-label="Search reports" /></label>
        <div className="rpt-tabs" role="tablist" aria-label="Report groups">
          {[['all', 'All'], ['fav', `★ Favourites${favs.length ? ` (${favs.length})` : ''}`], ...Object.entries(GROUPS).map(([g, G]) => [g, G.short[0]])].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className="rpt-tab t-body-small" onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      {groups.map(([g, rs]) => {
        const G = GROUPS[g];
        return (
          <section key={g} className="rpt-group">
            <div className="rpt-group-head">
              <span className="rpt-letter" style={{ background: G.soft, color: G.color }}>{g}</span>
              <div><h2 className="t-title">{G.en}</h2><p className="t-caption muted" style={{ margin: 0 }}>Who uses it: {G.who}</p></div>
              <span className="t-caption muted tnum" style={{ marginLeft: 'auto' }}>{rs.length} reports</span>
            </div>
            <div className="rpt-tiles">
              {rs.map((r) => (
                <div key={r.id} role="button" tabIndex={0} className="rpt-tile" onClick={() => onOpen(r.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(r.id)}>
                  <span className="rpt-ico" style={{ background: G.soft, color: G.color }}><ReportIcon name={r.icon} className="r-ico" /></span>
                  <span className="grow"><span className="t-body-medium">{r.en}</span><span className="t-body-small muted">{r.descEn}</span></span>
                  <button type="button" className={`fav${favs.includes(r.id) ? ' on' : ''}`} aria-pressed={favs.includes(r.id)} aria-label={favs.includes(r.id) ? 'Remove from favourites' : 'Add to favourites'} onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }}>★</button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!groups.length && <p className="t-body muted" style={{ textAlign: 'center', padding: 48 }}>{tab === 'fav' && !query ? 'No favourites yet — star a report to pin it here.' : 'No reports match your search.'}</p>}
    </main>
  );
}

/* ── One report ────────────────────────────────────────────────────────── */
const PERIODS = [['all', 'All time'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['ytd', 'Year to date'], ['365', 'Last 12 months']];
const ROLES = [
  { id: 'director', en: 'Procurement Director — all departments', dept: null },
  { id: 'it-mgr', en: 'Department Manager — IT & Digital', dept: 'IT & Digital' },
  { id: 'fin-mgr', en: 'Department Manager — Finance', dept: 'Finance' },
];
const DEF_F = { period: 'all', department: 'all', project: 'all', category: 'all', status: 'all' };
const windowOf = (p) => (p === 'all' ? null : p === 'ytd' ? [new Date(new Date(NOW).getFullYear(), 0, 1).getTime(), NOW] : [NOW - Number(p) * 864e5, NOW]);

function ReportView({ report, onBack, onOpen }) {
  const G = GROUPS[report.group];
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState(ROLES[0].id);
  const [f, setF] = useState(DEF_F);
  const [compare, setCompare] = useState('none');
  const [ca, setCa] = useState(''); const [cb, setCb] = useState('');
  const [drill, setDrill] = useState(null);
  const [panel, setPanel] = useState(null);
  const [views, setViews] = useState(() => ls.get(`mf:views:${report.id}`, []));
  const [viewId, setViewId] = useState('default');
  const [schedules, setSchedules] = useState(() => ls.get(`mf:sched:${report.id}`, []));
  const [toast, setToast] = useState(null);
  const [showCharts, setShowCharts] = useState(true);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const roleDept = ROLES.find((r) => r.id === role).dept;
  const all = useMemo(() => report.source(), [report]);
  const has = (k) => report.filters.includes(k);
  const base = (rows, win, extra) => rows.filter((r) => {
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
  const rowsB = compare === 'period' && win ? base(all, [win[0] - (win[1] - win[0]), win[0]]) : (compare === 'department' || compare === 'category') && cb ? base(all, win, (r) => r[dimKey] === cb) : null;
  const rows = drill ? rowsA.filter(drill.fn) : rowsA;
  const tableRows = report.table ? report.table(rows) : rows;
  const statusValues = report.statusKey ? [...new Set(all.map((r) => String(r[report.statusKey])))] : [];
  const deptOptions = [...new Set(all.map((r) => r.department).filter(Boolean))];
  const catOptions = [...new Set(all.map((r) => r.category).filter(Boolean))];
  const activeFilters = ['department', 'project', 'category', 'status'].filter((k) => f[k] !== 'all').length + (f.period !== 'all' ? 1 : 0);
  const related = REPORTS.filter((r) => r.group === report.group && r.id !== report.id).slice(0, 4);
  const setFilter = (k, v) => { setF({ ...f, [k]: v }); setViewId('default'); setDrill(null); };

  const refresh = () => { setBusy(true); setTimeout(() => { setBusy(false); setRefreshedAt(new Date()); }, 550); };
  const applyView = (v) => { if (!v) { setF(DEF_F); setCompare('none'); setCa(''); setCb(''); setViewId('default'); } else { setF(v.f); setCompare(v.compare); setCa(v.ca); setCb(v.cb); setViewId(v.id); } setDrill(null); };
  const saveView = () => {
    const bits = [f.period !== 'all' ? PERIODS.find((p) => p[0] === f.period)[1] : null, f.department !== 'all' ? f.department : null, f.category !== 'all' ? f.category : null, f.status !== 'all' ? f.status : null].filter(Boolean);
    const v = { id: `v${Date.now()}`, name: `View ${views.length + 1}${bits.length ? `: ${bits.join(' · ')}` : ''}`, f, compare, ca, cb };
    const n = [...views, v]; setViews(n); ls.set(`mf:views:${report.id}`, n); setViewId(v.id); setToast('View saved');
  };
  const delView = (vid) => { const n = views.filter((v) => v.id !== vid); setViews(n); ls.set(`mf:views:${report.id}`, n); if (viewId === vid) applyView(null); };
  const exportAs = (kind) => {
    const head = report.columns.map((c) => c.en);
    const body = tableRows.map((r) => report.columns.map((c) => plain(r[c.key], c)));
    const name = `${report.id}-${new Date().toISOString().slice(0, 10)}`;
    const dl = (blob, ext) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.${ext}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    if (kind === 'csv') dl(new Blob(['﻿' + [head, ...body].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }), 'csv');
    else if (kind === 'xls') { const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); dl(new Blob([`<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></body></html>`], { type: 'application/vnd.ms-excel' }), 'xls'); }
    else downloadPdf(name, { title: report.en, sub: `${G.en} · ${tableRows.length} records · ${fmtTime(refreshedAt)}`, rows: report.kpis.map((k) => [k.en, fmtVal(k.calc(rows), k.fmt)]), paras: [{ head: 'Records (first 20)', body: tableRows.slice(0, 20).map((r) => report.columns.slice(0, 4).map((c) => plain(r[c.key], c)).join(' | ')).join(' ; ') }] });
    setToast(`Exported as ${kind === 'xls' ? 'Excel' : kind.toUpperCase()}`);
  };

  return (
    <main className="detail standalone rpt" aria-labelledby="rv-title">
      <div className="rpt-view-head">
        <button type="button" className="back-btn" aria-label="Back to reports" onClick={onBack}><Icon name="icon-arrow-left" size={18} /></button>
        <div className="grow">
          <p className="t-body-small muted" style={{ margin: 0 }}><button type="button" className="link-btn muted" onClick={onBack}>Reports</button> / {G.en}</p>
          <h1 className="t-heading" id="rv-title" style={{ margin: '2px 0 0' }}>{report.en}</h1>
          <p className="t-body-small muted" style={{ margin: '2px 0 0' }}>{report.descEn}</p>
        </div>
        <div className="row-gap rpt-actions">
          <button type="button" className="btn btn-secondary-sm" onClick={refresh} title="Refresh data">{busy ? 'Refreshing…' : <>Updated <strong>{fmtTime(refreshedAt)}</strong></>}</button>
          <Btn variant="secondary-sm" icon="icon-info" onClick={() => setPanel('defs')}>Definitions</Btn>
          <Btn variant="secondary-sm" icon="icon-clock" onClick={() => setPanel('schedule')}>Schedule{schedules.length ? ` (${schedules.length})` : ''}</Btn>
          <ExportMenu onPick={exportAs} />
        </div>
      </div>

      <div className="rpt-access t-caption">
        <label className="row-gap"><Icon name="icon-user" size={14} />Viewing as
          <select value={role} onChange={(e) => { setRole(e.target.value); setDrill(null); }} aria-label="Viewing as" className="rpt-mini">{ROLES.map((r) => <option key={r.id} value={r.id}>{r.en}</option>)}</select></label>
        <span className="muted">Access: {report.roles.join(', ')}{roleDept ? ` · limited to ${roleDept}` : ''}</span>
        <span className="row-gap" style={{ marginLeft: 'auto' }}>
          <span className="muted">Saved view</span>
          <select value={viewId} onChange={(e) => applyView(views.find((v) => v.id === e.target.value) || null)} aria-label="Saved view" className="rpt-mini"><option value="default">Default view</option>{views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
          {viewId !== 'default' && <button type="button" className="link-btn danger-text t-caption" onClick={() => delView(viewId)}>Delete</button>}
          <button type="button" className="link-btn t-caption" onClick={saveView}>+ Save view</button>
        </span>
      </div>

      <div className="rpt-filters">
        <FSel label="Period" value={f.period} onChange={(v) => setFilter('period', v)} options={PERIODS} />
        {has('department') && <FSel label="Department" value={f.department} onChange={(v) => setFilter('department', v)} options={[['all', 'All departments'], ...(roleDept ? [roleDept] : DEPARTMENTS).map((d) => [d, d])]} />}
        {has('project') && <FSel label="Project" value={f.project} onChange={(v) => setFilter('project', v)} options={[['all', 'All projects'], ...PROJECTS.map((p) => [p, p])]} />}
        {has('category') && <FSel label="Category" value={f.category} onChange={(v) => setFilter('category', v)} options={[['all', 'All categories'], ...CATEGORIES.map((c) => [c, c])]} />}
        {has('status') && report.statusKey && <FSel label="Status" value={f.status} onChange={(v) => setFilter('status', v)} options={[['all', 'All statuses'], ...statusValues.map((s) => [s, s])]} />}
        <span className="rpt-sep" aria-hidden="true" />
        <FSel label="Compare" value={compare} onChange={(m) => { setCompare(m); setDrill(null); const o = m === 'department' ? deptOptions : catOptions; setCa(o[0] || ''); setCb(o[1] || ''); }}
          options={[['none', 'No comparison'], ['period', 'vs previous period'], ...(deptOptions.length > 1 ? [['department', 'Department vs department']] : []), ...(catOptions.length > 1 ? [['category', 'Category vs category']] : [])]} />
        {(compare === 'department' || compare === 'category') && (
          <>
            <FSel label="A" value={ca} onChange={setCa} options={(compare === 'department' ? deptOptions : catOptions).map((x) => [x, x])} />
            <FSel label="B" value={cb} onChange={setCb} options={(compare === 'department' ? deptOptions : catOptions).filter((x) => x !== ca).map((x) => [x, x])} />
          </>
        )}
        {compare === 'period' && !win && <span className="t-caption amber">Pick a period to compare with the one before it.</span>}
        {(activeFilters > 0 || compare !== 'none') && <button type="button" className="link-btn t-body-small" style={{ marginLeft: 'auto' }} onClick={() => applyView(null)}>Reset</button>}
      </div>

      {drill && <div className="rpt-drill t-body-small"><span className="muted">Drill-down:</span><span className="drill-chip">{drill.label}<button type="button" aria-label="Clear drill-down" onClick={() => setDrill(null)}>×</button></span><span className="muted tnum">{rows.length} records</span></div>}

      {busy ? <div className="rpt-loading t-body-small muted">Loading the latest data…</div> : (
        <>
          <div className="rpt-kpis">{report.kpis.map((k) => <KpiCard key={k.en} k={k} rows={rowsA} prev={rowsB} active={drill?.label === k.en} onDrill={k.drill ? () => setDrill(drill?.label === k.en ? null : { label: k.en, fn: k.drill }) : undefined} />)}</div>
          {report.charts.length > 0 && (
            <section>
              <div className="rpt-sec-head"><span className="t-caption-medium muted rpt-eyebrow">Insights</span><button type="button" className="link-btn t-caption" onClick={() => setShowCharts(!showCharts)}>{showCharts ? 'Hide charts' : 'Show charts'}</button></div>
              {showCharts && <div className="rpt-charts">{report.charts.map((c, i) => <ChartCard key={c.en} c={c} rows={rowsA} prev={rowsB} drill={drill} setDrill={setDrill} color={i % 2 ? PALETTE[1] : G.color} />)}</div>}
            </section>
          )}
          <DataTable report={report} rows={tableRows} />
          {related.length > 0 && (
            <section>
              <div className="t-caption-medium muted rpt-eyebrow" style={{ marginBottom: 8 }}>Related reports</div>
              <div className="rpt-related">{related.map((r) => <button key={r.id} type="button" className="rpt-rel" onClick={() => onOpen(r.id)}><span className="rpt-ico sm" style={{ background: G.soft, color: G.color }}><ReportIcon name={r.icon} className="r-ico" /></span><span className="t-body-small t-strong">{r.en}</span></button>)}</div>
            </section>
          )}
        </>
      )}

      {panel === 'defs' && <Drawer title="Definitions" onClose={() => setPanel(null)}>
        <dl className="defs">{report.kpis.map((k) => <div key={k.en}><dt className="t-body-small t-strong">{k.en}</dt><dd className="t-body-small muted">{k.def[0]}</dd></div>)}</dl>
        <div className="t-caption-medium muted rpt-eyebrow" style={{ margin: '18px 0 6px' }}>About this report</div>
        <ul className="t-body-small defs-about">
          <li>Data source: Munafasat Work Engine, SAP ECC and Etimad (nightly + on-demand refresh).</li>
          <li>Last refreshed: <strong>{fmtTime(refreshedAt)}</strong></li>
          <li>Access: {report.roles.join(', ')}</li>
          <li>Values are in SAR, excluding VAT unless stated.</li>
        </ul>
      </Drawer>}
      {panel === 'schedule' && <SchedulePanel schedules={schedules} onClose={() => setPanel(null)}
        onSave={(s) => { const n = [...schedules, s]; setSchedules(n); ls.set(`mf:sched:${report.id}`, n); setToast('Schedule created'); }}
        onDelete={(sid) => { const n = schedules.filter((x) => x.id !== sid); setSchedules(n); ls.set(`mf:sched:${report.id}`, n); }} />}
      {toast && <div className="rpt-toast t-body-small" role="status"><Icon name="icon-check-white" size={14} />{toast}</div>}
    </main>
  );
}

function ExportMenu({ onPick }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return undefined; const off = (e) => { if (!e.target.closest('.rpt-export')) setOpen(false); }; document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off); }, [open]);
  return (
    <span className="rpt-export more">
      <Btn variant="primary-sm" icon="icon-download" aria-expanded={open} onClick={() => setOpen(!open)}>Export</Btn>
      {open && <div className="more-menu" role="menu">{[['xls', 'Excel (.xls)'], ['csv', 'CSV'], ['pdf', 'PDF']].map(([k, l]) => <button key={k} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(k); }}>{l}</button>)}</div>}
    </span>
  );
}

function FSel({ label, value, onChange, options }) {
  return (
    <label className="fsel"><span className="t-caption muted">{label}</span>
      <select className="finput fselect" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    </label>
  );
}

function KpiCard({ k, rows, prev, onDrill, active }) {
  const v = k.calc(rows);
  const p = prev ? k.calc(prev) : null;
  const delta = p != null && p !== 0 ? ((v - p) / Math.abs(p)) * 100 : null;
  const good = delta == null || !k.good ? null : (k.good === 'up') === delta >= 0;
  return (
    <div className={`rpt-kpi${onDrill ? ' can' : ''}${active ? ' on' : ''}`} role={onDrill ? 'button' : undefined} tabIndex={onDrill ? 0 : undefined} onClick={onDrill} onKeyDown={(e) => onDrill && e.key === 'Enter' && onDrill()}>
      <div className="rpt-kpi-top"><span className="t-caption muted">{k.en}</span><span className="def-tip" tabIndex={0} aria-label={`Definition: ${k.def[0]}`}>i<span className="def-pop t-caption" role="tooltip">{k.def[0]}</span></span></div>
      <div className="rpt-kpi-v tnum">{fmtVal(v, k.fmt, true)}</div>
      <div className="t-caption">
        {delta != null && <span className={good == null ? 'muted' : good ? 'brand-text' : 'danger-text'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% <span className="muted">vs {fmtVal(p, k.fmt, true)}</span></span>}
        {onDrill && delta == null && <span className="muted kpi-hint">{active ? 'Click to clear' : 'Click to drill down'}</span>}
      </div>
    </div>
  );
}

/* ── Charts ───────────────────────────────────────────────────────────── */
function aggregate(rows, c) {
  const g = new Map();
  rows.forEach((r) => { const k = c.group(r); g.set(k, [...(g.get(k) || []), r]); });
  return new Map([...g].map(([k, x]) => [k, c.metric === 'count' ? x.length : c.metric(x)]));
}
function ChartCard({ c, rows, prev, drill, setDrill, color }) {
  const cur = aggregate(rows, c);
  const pv = prev ? aggregate(prev, c) : null;
  let data = [...cur].map(([label, value]) => ({ label, value, prev: pv ? pv.get(label) ?? 0 : undefined }));
  if (c.type === 'line' || (c.type === 'bar' && /^\d{4}/.test(data[0]?.label || ''))) data.sort((a, b) => a.label.localeCompare(b.label));
  else data.sort((a, b) => b.value - a.value);
  const limit = c.top ?? (c.type === 'hbar' ? 6 : c.type === 'donut' ? 7 : 12);
  const more = data.length > limit ? data.length - limit : 0;
  data = data.slice(0, limit);
  const active = drill?.label.startsWith(`${c.en}: `) ? drill.label.slice(c.en.length + 2) : undefined;
  const pick = (l) => setDrill(active === l ? null : { label: `${c.en}: ${l}`, fn: (r) => c.group(r) === l });
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.prev ?? 0)));
  return (
    <section className="proc-card rpt-chart">
      <h3 className="t-body-medium" style={{ margin: 0 }}>{c.en}</h3>
      {!data.length ? <p className="t-body-small muted" style={{ textAlign: 'center', padding: 24 }}>No data for these filters.</p>
        : c.type === 'donut' ? <Donut data={data} fmt={c.fmt} pick={pick} active={active} />
          : c.type === 'line' ? <Line data={data} fmt={c.fmt} pick={pick} active={active} color={color} max={max} />
            : c.type === 'hbar' ? (
              <ul className="hbars">{data.map((d) => (
                <li key={d.label}><button type="button" className={active === d.label ? 'on' : ''} onClick={() => pick(d.label)}>
                  <span className="hb-top t-caption"><span className="hb-l">{d.label}</span><span className="tnum t-strong">{fmtVal(d.value, c.fmt, true)}</span></span>
                  <span className="hb-track">{d.prev != null && <span className="hb-prev" style={{ width: `${(d.prev / max) * 100}%` }} />}<span className="hb-bar" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></span>
                </button></li>
              ))}</ul>
            ) : (
              <div className="vbars">{data.map((d) => (
                <button key={d.label} type="button" className={`vb${active === d.label ? ' on' : ''}`} onClick={() => pick(d.label)} title={`${d.label}: ${fmtVal(d.value, c.fmt)}`}>
                  <span className="t-caption tnum vb-v">{fmtVal(d.value, c.fmt, true)}</span>
                  <span className="vb-cols">{d.prev != null && <span className="vb-prev" style={{ height: `${(d.prev / max) * 100}%` }} />}<span className="vb-bar" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }} /></span>
                  <span className="t-caption muted vb-l">{d.label}</span>
                </button>
              ))}</div>
            )}
      <p className="t-caption muted" style={{ margin: 0 }}>{more ? `+${more} more · ` : ''}Click a segment to drill into its records.</p>
    </section>
  );
}
function Donut({ data, fmt, pick, active }) {
  const size = 124, sw = 18, r = (size - sw) / 2, C = 2 * Math.PI * r;
  const tot = data.reduce((s, d) => s + d.value, 0) || 1;
  let off = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-track)" strokeWidth={sw} />
        {data.map((d, i) => { const len = (d.value / tot) * C; const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={active === d.label ? sw + 4 : sw} strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="donut-seg" onClick={() => pick(d.label)}><title>{`${d.label}: ${fmtVal(d.value, fmt)}`}</title></circle>; off += len; return el; })}
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" className="donut-l">Total</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="donut-v">{fmtVal(tot, fmt, true)}</text>
      </svg>
      <ul className="donut-legend">{data.map((d, i) => <li key={d.label}><button type="button" className={active === d.label ? 'on' : ''} onClick={() => pick(d.label)}><span className="lg-dot" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="grow t-caption">{d.label}</span><span className="t-caption tnum t-strong">{Math.round((d.value / tot) * 100)}%</span></button></li>)}</ul>
    </div>
  );
}
function Line({ data, fmt, pick, active, color, max }) {
  const W = 520, H = 170, pad = 22;
  const x = (i) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const path = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k] ?? 0)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="line-svg" role="img" aria-label="Line chart">
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={pad} x2={W - pad} y1={y(max * g)} y2={y(max * g)} stroke="var(--border-soft)" />)}
      {data.some((d) => d.prev != null) && <path d={path('prev')} fill="none" stroke="#c9cfc3" strokeWidth={2} strokeDasharray="4 4" />}
      <path d={`${path('value')} L${x(data.length - 1)},${H - pad} L${x(0)},${H - pad} Z`} fill={color} opacity={0.08} />
      <path d={path('value')} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.label} style={{ cursor: 'pointer' }} onClick={() => pick(d.label)}>
          <title>{`${d.label}: ${fmtVal(d.value, fmt)}`}</title>
          <circle cx={x(i)} cy={y(d.value)} r={active === d.label ? 6 : 4} fill="#fff" stroke={color} strokeWidth={2} />
          {(data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && <text x={x(i)} y={H + 10} textAnchor="middle" fontSize="10" fill="var(--ink-muted)">{d.label}</text>}
        </g>
      ))}
    </svg>
  );
}

/* ── Records ──────────────────────────────────────────────────────────── */
const NUMERIC = ['money', 'num', 'pct', 'days', 'hours'];
function plain(v, c) {
  if (v == null) return '';
  if (c.kind === 'money') return Math.round(v);
  if (c.kind === 'pct') return `${Number(v).toFixed(1)}%`;
  if (c.kind === 'bool') return v ? 'Yes' : 'No';
  return typeof v === 'number' && v % 1 ? v.toFixed(1) : v;
}
const STATUS_TONE = (s) => (/approved|completed|active|awarded|on track|within|met|yes|paid|closed/i.test(s) ? 'st-approved' : /reject|overdue|breach|late|expired|fail|critical/i.test(s) ? 'st-returned' : /draft|cancel/i.test(s) ? 'st-draft' : /return|risk|pending|due|expiring|review/i.test(s) ? 'st-under-review' : 'st-submitted');
function cell(v, c) {
  if (v == null || v === '') return <span className="muted">—</span>;
  switch (c.kind) {
    case 'money': return <span className="tnum">{fmtVal(v, 'money')}</span>;
    case 'num': return <span className="tnum">{fmtVal(v, 'num')}</span>;
    case 'pct': return <span className="tnum">{fmtVal(v, 'pct')}</span>;
    case 'days': return <span className="tnum">{fmtVal(v, 'days')}</span>;
    case 'hours': return <span className="tnum">{fmtVal(v, 'hours')}</span>;
    case 'date': return <span className="tnum">{fmtDay(v)}</span>;
    case 'mono': return <span className="tnum">{v}</span>;
    case 'bool': return v ? 'Yes' : 'No';
    case 'status': return <span className={`status-pill t-caption-medium ${STATUS_TONE(String(v))}`}><span className="pill-dot" />{v}</span>;
    default: return String(v);
  }
}
function DataTable({ report, rows }) {
  const PAGE = 10;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: report.sortKey || null, dir: -1 });
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [rows.length, q]);
  const query = q.trim().toLowerCase();
  const found = rows.filter((r) => !query || report.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(query)));
  const sorted = sort.key ? [...found].sort((a, b) => { const x = a[sort.key], y = b[sort.key]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.dir; }) : found;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const shown = sorted.slice((page - 1) * PAGE, page * PAGE);
  const totals = report.columns.map((c) => (['money', 'num'].includes(c.kind) && !/avg|rate|unit|score/i.test(c.key) ? found.reduce((s, r) => s + (Number(r[c.key]) || 0), 0) : null));
  return (
    <section className="proc-card rpt-records">
      <div className="proc-card-head"><h3 className="t-title" style={{ margin: 0 }}>Records <span className="t-caption muted tnum">{found.length}</span></h3>
        <label className="search rpt-search sm"><Icon name="icon-search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search records…" aria-label="Search records" /></label></div>
      <div className="table-scroll">
        <table className="dash-table rpt-table t-body-small">
          <thead><tr>{report.columns.map((c) => (
            <th key={c.key} className={NUMERIC.includes(c.kind) ? 'num' : ''} aria-sort={sort.key === c.key ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined}>
              <button type="button" className="th-sort" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : -1 }))}>{c.en}{sort.key === c.key && <span aria-hidden="true">{sort.dir > 0 ? ' ▲' : ' ▼'}</span>}</button>
            </th>
          ))}</tr></thead>
          <tbody>
            {shown.map((r, i) => <tr key={i} className="no-click">{report.columns.map((c) => <td key={c.key} className={NUMERIC.includes(c.kind) ? 'num' : ''}>{cell(r[c.key], c)}</td>)}</tr>)}
            {!shown.length && <tr className="no-click"><td colSpan={report.columns.length} className="muted" style={{ textAlign: 'center', padding: 32 }}>No records for these filters.</td></tr>}
          </tbody>
          {totals.some((x) => x != null) && shown.length > 0 && <tfoot><tr>{report.columns.map((c, ci) => <td key={c.key} className={totals[ci] != null ? 'num' : ''}>{ci === 0 ? <strong>Total</strong> : totals[ci] != null ? <strong>{cell(totals[ci], c)}</strong> : ''}</td>)}</tr></tfoot>}
        </table>
      </div>
      {sorted.length > PAGE && (
        <div className="rpt-pager t-caption">
          <span className="muted">Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, sorted.length)} of {sorted.length}</span>
          <span className="row-gap"><Btn variant="secondary-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Btn><span className="tnum">{page} / {pages}</span><Btn variant="secondary-sm" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</Btn></span>
        </div>
      )}
    </section>
  );
}

/* ── Drawers ──────────────────────────────────────────────────────────── */
function Drawer({ title, onClose, children }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="drawer-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head"><h2 className="t-heading" style={{ margin: 0 }}>{title}</h2><button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="icon-x" size={18} /></button></div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
function SchedulePanel({ schedules, onClose, onSave, onDelete }) {
  const [freq, setFreq] = useState('Weekly');
  const [day, setDay] = useState('Sunday');
  const [time, setTime] = useState('08:00');
  const [format, setFormat] = useState('Excel');
  const [to, setTo] = useState('');
  const valid = /\S+@\S+\.\S+/.test(to);
  const seg = (opts, v, set) => <div className="seg-mini">{opts.map((x) => <button key={x} type="button" aria-pressed={v === x} onClick={() => set(x)}>{x}</button>)}</div>;
  return (
    <Drawer title="Schedule delivery" onClose={onClose}>
      <div className="sched">
        <div><div className="t-label">Frequency</div>{seg(['Daily', 'Weekly', 'Monthly'], freq, (x) => { setFreq(x); setDay(x === 'Weekly' ? 'Sunday' : '1'); })}</div>
        <div className="sched-row">
          {freq !== 'Daily' && <label className="fsel"><span className="t-label">{freq === 'Weekly' ? 'Day' : 'Day of month'}</span><select className="finput fselect" value={day} onChange={(e) => setDay(e.target.value)}>{(freq === 'Weekly' ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] : ['1', '5', '10', '15', '25']).map((d) => <option key={d}>{d}</option>)}</select></label>}
          <label className="fsel"><span className="t-label">Time (Riyadh)</span><input type="time" className="finput" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        </div>
        <div><div className="t-label">Format</div>{seg(['Excel', 'CSV', 'PDF'], format, setFormat)}</div>
        <label className="fsel"><span className="t-label">Recipients</span><input className="finput" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@sidf.gov.sa, …" /></label>
        <Btn variant="primary" disabled={!valid} onClick={() => { onSave({ id: `s${Date.now()}`, freq, day: freq === 'Daily' ? '' : day, time, format, to }); setTo(''); }}>Create schedule</Btn>
        <div>
          <div className="t-caption-medium muted rpt-eyebrow" style={{ margin: '8px 0 6px' }}>Active schedules</div>
          {!schedules.length ? <p className="t-body-small muted" style={{ margin: 0 }}>No schedules yet.</p> : (
            <ul className="sched-list">{schedules.map((s) => <li key={s.id}><span className="grow t-body-small"><strong>{s.freq}{s.day ? ` · ${s.day}` : ''} · {s.time}</strong><span className="muted"> · {s.format}</span><br /><span className="muted">{s.to}</span></span><button type="button" className="link-btn danger-text t-caption" onClick={() => onDelete(s.id)}>Remove</button></li>)}</ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}
