// Munafasat reports catalogue: 34 reports in 5 groups. Each report declares its
// source rows, table columns, KPIs (with definitions and drill-down), charts and
// which global filters apply. ReportView renders any definition.
import { PRS, RFPS, TASKS, EXCEPTIONS, POS, CONTRACTS, NOW, type PR } from './dataset';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;
export type Fmt = 'money' | 'num' | 'pct' | 'days' | 'hours' | 'text';
export interface Col { key: string; en: string; ar: string; kind?: 'text' | 'money' | 'num' | 'date' | 'status' | 'pct' | 'days' | 'hours' | 'mono' | 'bool' }
export interface Kpi { en: string; ar: string; fmt: Fmt; calc: (rows: Row[]) => number; def: [string, string]; drill?: (r: Row) => boolean; good?: 'up' | 'down' }
export interface Chart { en: string; ar: string; type: 'bar' | 'hbar' | 'donut' | 'line'; group: (r: Row) => string; metric: 'count' | ((rows: Row[]) => number); fmt: Fmt; top?: number }
export type FilterKey = 'department' | 'project' | 'category' | 'status';
export interface Report {
  id: string; group: GroupKey; en: string; ar: string; descEn: string; descAr: string; icon: IconName;
  source: () => Row[]; dateKey: string; filters: FilterKey[]; statusKey?: string;
  table?: (rows: Row[]) => Row[]; columns: Col[]; kpis: Kpi[]; charts: Chart[]; sortKey?: string; roles: string[];
}
export type GroupKey = 'A' | 'B' | 'C' | 'D' | 'E';
export type IconName = 'overview' | 'spend' | 'pipeline' | 'trend' | 'clock' | 'route' | 'list' | 'status' | 'hourglass' | 'return' | 'wallet' | 'box' | 'file' | 'stages' | 'review' | 'speed' | 'users' | 'scale' | 'savings' | 'tasks' | 'approval' | 'dept' | 'bottleneck' | 'sla' | 'check' | 'alert' | 'po' | 'chart' | 'contract' | 'calendar' | 'gauge' | 'truck' | 'edit';

export const GROUPS: Record<GroupKey, { en: string; ar: string; short: [string, string]; who: string; whoAr: string; color: string; soft: string; tag?: [string, string] }> = {
  A: { en: 'Procurement Overview & Performance', ar: 'نظرة عامة على المشتريات والأداء', short: ['Overview & performance', 'النظرة العامة والأداء'], who: 'CTO, CFO, Procurement Director, Department Heads', whoAr: 'الرئيس التنفيذي للتقنية، المدير المالي، مدير المشتريات، رؤساء الإدارات', color: '#2A6193', soft: '#EEF4FB', tag: ['Executive reports', 'تقارير تنفيذية'] },
  B: { en: 'Purchase Request Reports', ar: 'تقارير طلبات الشراء', short: ['Purchase requests', 'طلبات الشراء'], who: 'Requesters, Finance, Procurement, Department Managers', whoAr: 'مقدمو الطلبات، المالية، المشتريات، مدراء الإدارات', color: '#517632', soft: '#EEF5E8' },
  C: { en: 'RFP & Sourcing Reports', ar: 'تقارير المنافسات والتوريد', short: ['RFP & sourcing', 'المنافسات والتوريد'], who: 'Procurement, Sourcing Teams, Evaluation Committees, Management', whoAr: 'المشتريات، فرق التوريد، لجان التقييم، الإدارة', color: '#6A47D6', soft: '#F1EEFB' },
  D: { en: 'Work Engine & Approval Reports', ar: 'تقارير محرك العمل والاعتمادات', short: ['Work Engine & approvals', 'محرك العمل والاعتمادات'], who: 'Procurement Operations, Department Heads, Work Engine Administrators', whoAr: 'عمليات المشتريات، رؤساء الإدارات، مسؤولو محرك العمل', color: '#B25B00', soft: '#FFF3E6', tag: ['Important differentiator', 'ميزة تنافسية مهمة'] },
  E: { en: 'Purchase Order & Contract Reports', ar: 'تقارير أوامر الشراء والعقود', short: ['POs & contracts', 'أوامر الشراء والعقود'], who: 'Procurement, Contract Managers, Finance', whoAr: 'المشتريات، مدراء العقود، المالية', color: '#0E7A7A', soft: '#E6F4F4' },
};

// ── helpers ──────────────────────────────────────────────────────────────────
const sum = (rows: Row[], k: string) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const avg = (rows: Row[], k: string) => { const v = rows.filter((r) => r[k] != null); return v.length ? sum(v, k) / v.length : 0; };
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const cnt = (f?: (r: Row) => boolean) => (rows: Row[]) => (f ? rows.filter(f).length : rows.length);
const by = (k: string) => (r: Row) => String(r[k] ?? '—');
const sumOf = (k: string) => (rows: Row[]) => sum(rows, k);
const avgOf = (k: string) => (rows: Row[]) => avg(rows, k);
const month = (k: string) => (r: Row) => String(r[k] ?? '').slice(0, 7);
const quarter = (k: string) => (r: Row) => { const d = new Date(r[k]); return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`; };
const C = (key: string, en: string, ar: string, kind?: Col['kind']): Col => ({ key, en, ar, kind });
const K = (en: string, ar: string, fmt: Fmt, calc: Kpi['calc'], def: [string, string], drill?: Kpi['drill'], good?: Kpi['good']): Kpi => ({ en, ar, fmt, calc, def, drill, good });
const G = (en: string, ar: string, type: Chart['type'], group: Chart['group'], metric: Chart['metric'] = 'count', fmt: Fmt = 'num', top?: number): Chart => ({ en, ar, type, group, metric, fmt, top });
const open = (r: Row) => !['Approved', 'Rejected', 'Draft'].includes(r.status);
const prRows = () => PRS as unknown as Row[];
const ageBand = (d: number) => (d <= 7 ? '0–7 days' : d <= 15 ? '8–15 days' : d <= 30 ? '16–30 days' : '30+ days');
const cycle = (p: PR) => (p.rfpDays ?? 0) + (p.awardDays ?? 0) + (p.poDays ?? 0);

const ROLES = { exec: ['Executive', 'Procurement Director', 'Finance'], proc: ['Procurement', 'Department Managers'], ops: ['Procurement Operations', 'Work Engine Admin'], all: ['All users (own department)'] };

const PR_COLS: Col[] = [C('id', 'PR ID', 'رقم الطلب', 'mono'), C('title', 'Title', 'العنوان'), C('requester', 'Requester', 'مقدّم الطلب'), C('department', 'Department', 'الإدارة'), C('project', 'Project', 'المشروع'), C('value', 'Value', 'القيمة', 'money'), C('status', 'Status', 'الحالة', 'status'), C('created', 'Created', 'تاريخ الإنشاء', 'date')];

export const REPORTS: Report[] = [
  // ── A. Procurement Overview & Performance ─────────────────────────────────
  {
    id: 'overview', group: 'A', icon: 'overview', en: 'Procurement Overview', ar: 'نظرة عامة على المشتريات',
    descEn: 'Total PRs, RFPs, POs, estimated, awarded and pending value.', descAr: 'إجمالي طلبات الشراء والمنافسات وأوامر الشراء والقيم التقديرية والمرساة والمعلقة.',
    source: prRows, dateKey: 'created', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.exec,
    table: (rows) => groupTable(rows, 'department', [['prs', (g) => g.length], ['rfps', (g) => g.filter((r) => r.rfpDays != null).length], ['pos', (g) => g.filter((r) => r.poDays != null).length], ['value', (g) => sum(g, 'value')], ['awarded', (g) => sum(g, 'awarded')], ['pending', (g) => sum(g.filter(open), 'value')]]),
    columns: [C('department', 'Department', 'الإدارة'), C('prs', 'PRs', 'طلبات الشراء', 'num'), C('rfps', 'RFPs', 'المنافسات', 'num'), C('pos', 'POs', 'أوامر الشراء', 'num'), C('value', 'Estimated value', 'القيمة التقديرية', 'money'), C('awarded', 'Awarded value', 'القيمة المرساة', 'money'), C('pending', 'Pending value', 'القيمة المعلقة', 'money')],
    kpis: [
      K('Total PRs', 'إجمالي طلبات الشراء', 'num', cnt(), ['Count of purchase requests created in the period.', 'عدد طلبات الشراء المنشأة خلال الفترة.']),
      K('RFPs', 'المنافسات', 'num', cnt((r) => r.rfpDays != null), ['PRs that progressed to an RFP / sourcing event.', 'طلبات انتقلت إلى منافسة أو حدث توريد.'], (r) => r.rfpDays != null),
      K('POs', 'أوامر الشراء', 'num', cnt((r) => r.poDays != null), ['PRs with a purchase order issued in SAP ECC.', 'طلبات صدر لها أمر شراء في SAP ECC.'], (r) => r.poDays != null),
      K('Estimated value', 'القيمة التقديرية', 'money', sumOf('value'), ['Sum of estimated PR values (excl. VAT).', 'مجموع القيم التقديرية للطلبات (قبل الضريبة).']),
      K('Awarded value', 'القيمة المرساة', 'money', sumOf('awarded'), ['Sum of awarded contract values.', 'مجموع قيم العقود المرساة.'], (r) => r.awarded != null),
      K('Pending value', 'القيمة المعلقة', 'money', (rows) => sum(rows.filter(open), 'value'), ['Estimated value of PRs still in approval.', 'القيمة التقديرية للطلبات قيد الاعتماد.'], open, 'down'),
    ],
    charts: [G('Value by department', 'القيمة حسب الإدارة', 'hbar', by('department'), sumOf('value'), 'money'), G('PRs by status', 'الطلبات حسب الحالة', 'donut', by('status')), G('Monthly PR value', 'قيمة الطلبات شهريًا', 'line', month('created'), sumOf('value'), 'money')],
  },
  {
    id: 'spend', group: 'A', icon: 'spend', en: 'Procurement Spend Analysis', ar: 'تحليل الإنفاق على المشتريات',
    descEn: 'Spend by department, project, category, material group and period.', descAr: 'الإنفاق حسب الإدارة والمشروع والفئة ومجموعة المواد والفترة.',
    source: () => PRS.filter((p) => p.awarded != null) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.exec,
    table: (rows) => groupTable(rows, 'materialGroup', [['category', (g) => g[0].category], ['prs', (g) => g.length], ['awarded', (g) => sum(g, 'awarded')], ['share', (g, all) => pct(sum(g, 'awarded'), sum(all, 'awarded'))]]),
    columns: [C('materialGroup', 'Material group', 'مجموعة المواد'), C('category', 'Category', 'الفئة'), C('prs', 'Awards', 'الترسيات', 'num'), C('awarded', 'Spend', 'الإنفاق', 'money'), C('share', 'Share', 'الحصة', 'pct')],
    kpis: [
      K('Total spend', 'إجمالي الإنفاق', 'money', sumOf('awarded'), ['Sum of awarded values in the period.', 'مجموع القيم المرساة خلال الفترة.']),
      K('Awards', 'الترسيات', 'num', cnt(), ['Number of awarded requests.', 'عدد الطلبات المرساة.']),
      K('Avg award value', 'متوسط قيمة الترسية', 'money', avgOf('awarded'), ['Total spend ÷ number of awards.', 'إجمالي الإنفاق ÷ عدد الترسيات.']),
      K('Top category share', 'حصة الفئة الأعلى', 'pct', (rows) => topShare(rows, 'category', 'awarded'), ['Share of spend in the largest category.', 'حصة الإنفاق في الفئة الأكبر.']),
    ],
    charts: [G('Spend by category', 'الإنفاق حسب الفئة', 'donut', by('category'), sumOf('awarded'), 'money'), G('Spend by department', 'الإنفاق حسب الإدارة', 'hbar', by('department'), sumOf('awarded'), 'money'), G('Spend by quarter', 'الإنفاق ربع السنوي', 'bar', quarter('created'), sumOf('awarded'), 'money')],
  },
  {
    id: 'pipeline', group: 'A', icon: 'pipeline', en: 'Procurement Pipeline', ar: 'مسار المشتريات',
    descEn: 'Requests at each stage, expected value, ageing and upcoming milestones.', descAr: 'الطلبات في كل مرحلة والقيمة المتوقعة والتقادم والمراحل القادمة.',
    source: () => PRS.filter(open) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.exec, sortKey: 'dueMilestone',
    columns: [C('id', 'PR ID', 'رقم الطلب', 'mono'), C('title', 'Title', 'العنوان'), C('department', 'Department', 'الإدارة'), C('stage', 'Stage', 'المرحلة'), C('value', 'Expected value', 'القيمة المتوقعة', 'money'), C('daysPending', 'Ageing', 'التقادم', 'days'), C('dueMilestone', 'Next milestone', 'المرحلة القادمة', 'date')],
    kpis: [
      K('In pipeline', 'قيد المسار', 'num', cnt(), ['Requests submitted and not yet approved or rejected.', 'طلبات مقدمة ولم تُعتمد أو تُرفض بعد.']),
      K('Expected value', 'القيمة المتوقعة', 'money', sumOf('value'), ['Sum of estimated values in the pipeline.', 'مجموع القيم التقديرية في المسار.']),
      K('Avg ageing', 'متوسط التقادم', 'days', avgOf('daysPending'), ['Average days since the request entered its current stage.', 'متوسط الأيام منذ دخول الطلب مرحلته الحالية.'], undefined, 'down'),
      K('Milestones in 14 days', 'مراحل خلال 14 يومًا', 'num', cnt((r) => +new Date(r.dueMilestone) - NOW <= 14 * 864e5), ['Requests with a milestone due in the next 14 days.', 'طلبات لها مرحلة مستحقة خلال 14 يومًا.'], (r) => +new Date(r.dueMilestone) - NOW <= 14 * 864e5),
    ],
    charts: [G('Requests by stage', 'الطلبات حسب المرحلة', 'bar', by('stage')), G('Value by stage', 'القيمة حسب المرحلة', 'hbar', by('stage'), sumOf('value'), 'money'), G('Ageing bands', 'شرائح التقادم', 'donut', (r) => ageBand(r.daysPending))],
  },
  {
    id: 'trends', group: 'A', icon: 'trend', en: 'Procurement Trends', ar: 'اتجاهات المشتريات',
    descEn: 'Monthly and quarterly request volume, spend and growth.', descAr: 'حجم الطلبات والإنفاق والنمو شهريًا وربع سنويًا.',
    source: prRows, dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.exec,
    table: (rows) => groupTable(rows, (r) => String(r.created).slice(0, 7), [['prs', (g) => g.length], ['value', (g) => sum(g, 'value')], ['awarded', (g) => sum(g, 'awarded')]], 'period').sort((a, b) => a.period.localeCompare(b.period)).map((r, i, a) => ({ ...r, growth: i ? pct(r.value - a[i - 1].value, a[i - 1].value || 1) : 0 })),
    columns: [C('period', 'Month', 'الشهر'), C('prs', 'Requests', 'الطلبات', 'num'), C('value', 'Requested value', 'القيمة المطلوبة', 'money'), C('awarded', 'Spend', 'الإنفاق', 'money'), C('growth', 'MoM growth', 'النمو الشهري', 'pct')],
    kpis: [
      K('Requests', 'الطلبات', 'num', cnt(), ['Requests created in the period.', 'الطلبات المنشأة خلال الفترة.']),
      K('Requested value', 'القيمة المطلوبة', 'money', sumOf('value'), ['Sum of estimated values.', 'مجموع القيم التقديرية.']),
      K('Monthly average', 'المتوسط الشهري', 'num', (rows) => rows.length / Math.max(1, new Set(rows.map((r) => String(r.created).slice(0, 7))).size), ['Requests ÷ months with activity.', 'الطلبات ÷ الأشهر التي بها نشاط.']),
      K('Spend', 'الإنفاق', 'money', sumOf('awarded'), ['Sum of awarded values.', 'مجموع القيم المرساة.']),
    ],
    charts: [G('Monthly volume', 'الحجم الشهري', 'line', month('created')), G('Monthly value', 'القيمة الشهرية', 'line', month('created'), sumOf('value'), 'money'), G('Quarterly spend', 'الإنفاق ربع السنوي', 'bar', quarter('created'), sumOf('awarded'), 'money')],
  },
  {
    id: 'cycle', group: 'A', icon: 'clock', en: 'Procurement Cycle Time', ar: 'زمن دورة المشتريات',
    descEn: 'Average time from PR submission to RFP, award and PO.', descAr: 'متوسط الزمن من تقديم الطلب حتى المنافسة والترسية وأمر الشراء.',
    source: () => PRS.filter((p) => p.poDays != null).map((p) => ({ ...p, cycle: cycle(p) })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.exec, sortKey: 'cycle',
    columns: [C('id', 'PR ID', 'رقم الطلب', 'mono'), C('title', 'Title', 'العنوان'), C('department', 'Department', 'الإدارة'), C('method', 'Method', 'الطريقة'), C('rfpDays', 'PR → RFP', 'الطلب ← المنافسة', 'days'), C('awardDays', 'RFP → Award', 'المنافسة ← الترسية', 'days'), C('poDays', 'Award → PO', 'الترسية ← أمر الشراء', 'days'), C('cycle', 'Total cycle', 'إجمالي الدورة', 'days')],
    kpis: [
      K('Avg PR → RFP', 'متوسط الطلب ← المنافسة', 'days', avgOf('rfpDays'), ['Average days from PR submission to RFP publication.', 'متوسط الأيام من تقديم الطلب حتى طرح المنافسة.'], undefined, 'down'),
      K('Avg RFP → Award', 'متوسط المنافسة ← الترسية', 'days', avgOf('awardDays'), ['Average days from RFP publication to award.', 'متوسط الأيام من الطرح حتى الترسية.'], undefined, 'down'),
      K('Avg Award → PO', 'متوسط الترسية ← أمر الشراء', 'days', avgOf('poDays'), ['Average days from award to PO in SAP ECC.', 'متوسط الأيام من الترسية حتى أمر الشراء.'], undefined, 'down'),
      K('Avg total cycle', 'متوسط إجمالي الدورة', 'days', avgOf('cycle'), ['Sum of the three stage durations, averaged.', 'متوسط مجموع مدد المراحل الثلاث.'], (r) => r.cycle > 90, 'down'),
    ],
    charts: [G('Avg cycle by department', 'متوسط الدورة حسب الإدارة', 'hbar', by('department'), avgOf('cycle'), 'days'), G('Avg cycle by method', 'متوسط الدورة حسب الطريقة', 'bar', by('method'), avgOf('cycle'), 'days'), G('Cycle-time bands', 'شرائح زمن الدورة', 'donut', (r) => (r.cycle <= 45 ? '≤ 45 days' : r.cycle <= 75 ? '46–75 days' : r.cycle <= 100 ? '76–100 days' : '100+ days'))],
  },
  {
    id: 'methods', group: 'A', icon: 'route', en: 'Procurement Method Analysis', ar: 'تحليل طرق الشراء',
    descEn: 'RFI, RFQ, RFP, tender and other procurement routes.', descAr: 'طلب معلومات، طلب أسعار، منافسة، مناقصة وغيرها من طرق الشراء.',
    source: prRows, dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.exec,
    table: (rows) => groupTable(rows, 'method', [['prs', (g) => g.length], ['value', (g) => sum(g, 'value')], ['share', (g, all) => pct(g.length, all.length)], ['avgValue', (g) => avg(g, 'value')], ['cycle', (g) => avg(g.filter((r) => r.poDays != null).map((r) => ({ c: cycle(r as PR) })), 'c')]]),
    columns: [C('method', 'Method', 'الطريقة'), C('prs', 'Requests', 'الطلبات', 'num'), C('share', 'Share of requests', 'حصة الطلبات', 'pct'), C('value', 'Total value', 'إجمالي القيمة', 'money'), C('avgValue', 'Avg value', 'متوسط القيمة', 'money'), C('cycle', 'Avg cycle', 'متوسط الدورة', 'days')],
    kpis: [
      K('Methods used', 'الطرق المستخدمة', 'num', (rows) => new Set(rows.map((r) => r.method)).size, ['Distinct procurement routes used.', 'عدد طرق الشراء المختلفة المستخدمة.']),
      K('Competitive share', 'حصة المنافسة', 'pct', (rows) => pct(rows.filter((r) => ['RFP', 'Public tender', 'Limited tender'].includes(r.method)).length, rows.length), ['RFP + public/limited tenders ÷ all requests.', 'المنافسات والمناقصات ÷ جميع الطلبات.'], (r) => ['RFP', 'Public tender', 'Limited tender'].includes(r.method), 'up'),
      K('Direct purchase share', 'حصة الشراء المباشر', 'pct', (rows) => pct(rows.filter((r) => r.method === 'Direct purchase').length, rows.length), ['Direct purchases ÷ all requests.', 'الشراء المباشر ÷ جميع الطلبات.'], (r) => r.method === 'Direct purchase', 'down'),
      K('E-Market share', 'حصة سوق اعتماد', 'pct', (rows) => pct(rows.filter((r) => r.method === 'Etimad E-Market').length, rows.length), ['Etimad E-Market orders ÷ all requests.', 'طلبات سوق اعتماد ÷ جميع الطلبات.'], (r) => r.method === 'Etimad E-Market'),
    ],
    charts: [G('Requests by method', 'الطلبات حسب الطريقة', 'donut', by('method')), G('Value by method', 'القيمة حسب الطريقة', 'hbar', by('method'), sumOf('value'), 'money'), G('Method mix by quarter', 'مزيج الطرق ربع السنوي', 'bar', quarter('created'))],
  },

  // ── B. Purchase Request Reports ───────────────────────────────────────────
  {
    id: 'pr-register', group: 'B', icon: 'list', en: 'PR Register', ar: 'سجل طلبات الشراء',
    descEn: 'PR ID, requester, department, project, value, status, created date.', descAr: 'رقم الطلب ومقدّمه والإدارة والمشروع والقيمة والحالة وتاريخ الإنشاء.',
    source: prRows, dateKey: 'created', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.all, sortKey: 'created',
    columns: PR_COLS,
    kpis: [
      K('Requests', 'الطلبات', 'num', cnt(), ['All purchase requests in the period.', 'جميع طلبات الشراء خلال الفترة.']),
      K('Total value', 'إجمالي القيمة', 'money', sumOf('value'), ['Sum of estimated values.', 'مجموع القيم التقديرية.']),
      K('Approved', 'معتمدة', 'num', cnt((r) => r.status === 'Approved'), ['Requests fully approved.', 'الطلبات المعتمدة بالكامل.'], (r) => r.status === 'Approved', 'up'),
      K('In progress', 'قيد التنفيذ', 'num', cnt(open), ['Submitted, under review or returned.', 'مقدمة أو قيد المراجعة أو معادة.'], open),
    ],
    charts: [G('Requests by status', 'الطلبات حسب الحالة', 'donut', by('status')), G('Requests by department', 'الطلبات حسب الإدارة', 'hbar', by('department'))],
  },
  {
    id: 'pr-status', group: 'B', icon: 'status', en: 'PR Status Analysis', ar: 'تحليل حالات الطلبات',
    descEn: 'Draft, submitted, under review, returned, approved, rejected.', descAr: 'مسودة، مقدم، قيد المراجعة، معاد، معتمد، مرفوض.',
    source: prRows, dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.proc,
    table: (rows) => groupTable(rows, 'status', [['prs', (g) => g.length], ['share', (g, all) => pct(g.length, all.length)], ['value', (g) => sum(g, 'value')], ['avgAge', (g) => avg(g, 'daysPending')]]),
    columns: [C('status', 'Status', 'الحالة', 'status'), C('prs', 'Requests', 'الطلبات', 'num'), C('share', 'Share', 'الحصة', 'pct'), C('value', 'Value', 'القيمة', 'money'), C('avgAge', 'Avg days pending', 'متوسط أيام الانتظار', 'days')],
    kpis: ['Draft', 'Submitted', 'Under review', 'Returned', 'Approved', 'Rejected'].map((s) => K(s, ({ Draft: 'مسودة', Submitted: 'مقدم', 'Under review': 'قيد المراجعة', Returned: 'معاد', Approved: 'معتمد', Rejected: 'مرفوض' } as Record<string, string>)[s], 'num', cnt((r) => r.status === s), [`Requests currently in "${s}".`, `الطلبات في حالة "${s}".`], (r) => r.status === s)),
    charts: [G('Status mix', 'توزيع الحالات', 'donut', by('status')), G('Status by department', 'الحالات حسب الإدارة', 'hbar', by('department')), G('Approved per month', 'المعتمدة شهريًا', 'line', month('created'), (rows) => rows.filter((r) => r.status === 'Approved').length)],
  },
  {
    id: 'pr-ageing', group: 'B', icon: 'hourglass', en: 'PR Ageing Report', ar: 'تقرير تقادم الطلبات',
    descEn: 'Days pending, current owner, current stage, overdue status.', descAr: 'أيام الانتظار والمالك الحالي والمرحلة الحالية وحالة التأخر.',
    source: () => PRS.filter(open).map((p) => ({ ...p, overdue: p.daysPending > 15 ? 'Overdue' : 'On track' })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.proc, sortKey: 'daysPending',
    columns: [C('id', 'PR ID', 'رقم الطلب', 'mono'), C('title', 'Title', 'العنوان'), C('department', 'Department', 'الإدارة'), C('stage', 'Current stage', 'المرحلة الحالية'), C('owner', 'Current owner', 'المالك الحالي'), C('daysPending', 'Days pending', 'أيام الانتظار', 'days'), C('overdue', 'Overdue status', 'حالة التأخر', 'status'), C('value', 'Value', 'القيمة', 'money')],
    kpis: [
      K('Open requests', 'الطلبات المفتوحة', 'num', cnt(), ['Requests awaiting action.', 'الطلبات بانتظار إجراء.']),
      K('Overdue', 'متأخرة', 'num', cnt((r) => r.daysPending > 15), ['Pending more than 15 working days in the current stage.', 'منتظرة أكثر من 15 يوم عمل في المرحلة الحالية.'], (r) => r.daysPending > 15, 'down'),
      K('Avg days pending', 'متوسط أيام الانتظار', 'days', avgOf('daysPending'), ['Average days in the current stage.', 'متوسط الأيام في المرحلة الحالية.'], undefined, 'down'),
      K('Oldest (days)', 'الأقدم (أيام)', 'days', (rows) => Math.max(0, ...rows.map((r) => r.daysPending)), ['Longest pending request.', 'أطول طلب منتظر.'], undefined, 'down'),
    ],
    charts: [G('Ageing bands', 'شرائح التقادم', 'bar', (r) => ageBand(r.daysPending)), G('Pending by owner', 'المعلق حسب المالك', 'hbar', by('owner'), 'count', 'num', 8), G('Pending by stage', 'المعلق حسب المرحلة', 'donut', by('stage'))],
  },
  {
    id: 'pr-returns', group: 'B', icon: 'return', en: 'PR Rejection & Return Analysis', ar: 'تحليل رفض وإعادة الطلبات',
    descEn: 'Rejection reasons, return reasons, department and frequency.', descAr: 'أسباب الرفض والإعادة والإدارة والتكرار.',
    source: () => PRS.filter((p) => p.status === 'Returned' || p.status === 'Rejected').map((p) => ({ ...p, reason: p.returnReason ?? p.rejectReason, outcome: p.status })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.proc,
    columns: [C('id', 'PR ID', 'رقم الطلب', 'mono'), C('title', 'Title', 'العنوان'), C('department', 'Department', 'الإدارة'), C('outcome', 'Outcome', 'النتيجة', 'status'), C('reason', 'Reason', 'السبب'), C('owner', 'By', 'بواسطة'), C('value', 'Value', 'القيمة', 'money'), C('created', 'Created', 'تاريخ الإنشاء', 'date')],
    kpis: [
      K('Returned', 'معادة', 'num', cnt((r) => r.status === 'Returned'), ['Requests returned for correction.', 'طلبات أعيدت للتصحيح.'], (r) => r.status === 'Returned', 'down'),
      K('Rejected', 'مرفوضة', 'num', cnt((r) => r.status === 'Rejected'), ['Requests rejected.', 'طلبات مرفوضة.'], (r) => r.status === 'Rejected', 'down'),
      K('Return rate', 'معدل الإعادة', 'pct', (rows) => pct(rows.filter((r) => r.status === 'Returned').length, PRS.filter((p) => p.status !== 'Draft').length), ['Returned ÷ all submitted requests.', 'المعادة ÷ جميع الطلبات المقدمة.'], undefined, 'down'),
      K('Top reason share', 'حصة السبب الأعلى', 'pct', (rows) => topShare(rows, 'reason'), ['Share of the most frequent reason.', 'حصة السبب الأكثر تكرارًا.']),
    ],
    charts: [G('By reason', 'حسب السبب', 'hbar', by('reason')), G('By department', 'حسب الإدارة', 'bar', by('department')), G('Return vs reject', 'الإعادة مقابل الرفض', 'donut', by('outcome'))],
  },
  {
    id: 'pr-budget', group: 'B', icon: 'wallet', en: 'PR Budget Analysis', ar: 'تحليل ميزانية الطلبات',
    descEn: 'Requested amount, allocated budget, available budget, variance.', descAr: 'المبلغ المطلوب والميزانية المخصصة والمتاحة والفرق.',
    source: () => PRS.map((p) => ({ ...p, variance: p.budgetAvailable - p.value, fit: p.budgetAvailable >= p.value ? 'Within budget' : 'Over budget' })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ['Finance', 'Department Managers'], sortKey: 'variance',
    columns: [C('id', 'PR ID', 'رقم الطلب', 'mono'), C('title', 'Title', 'العنوان'), C('department', 'Department', 'الإدارة'), C('value', 'Requested', 'المطلوب', 'money'), C('budgetAllocated', 'Allocated', 'المخصص', 'money'), C('budgetAvailable', 'Available', 'المتاح', 'money'), C('variance', 'Variance', 'الفرق', 'money'), C('fit', 'Budget fit', 'ملاءمة الميزانية', 'status')],
    kpis: [
      K('Requested', 'المطلوب', 'money', sumOf('value'), ['Sum of requested amounts.', 'مجموع المبالغ المطلوبة.']),
      K('Allocated', 'المخصص', 'money', sumOf('budgetAllocated'), ['Sum of allocated budget lines.', 'مجموع بنود الميزانية المخصصة.']),
      K('Available', 'المتاح', 'money', sumOf('budgetAvailable'), ['Allocated − consumed − committed (SAP FM).', 'المخصص − المستهلك − المرتبط (إدارة الأموال).']),
      K('Over budget', 'فوق الميزانية', 'num', cnt((r) => r.variance < 0), ['Requests whose value exceeds the available budget.', 'طلبات تتجاوز قيمتها الميزانية المتاحة.'], (r) => r.variance < 0, 'down'),
    ],
    charts: [G('Budget fit', 'ملاءمة الميزانية', 'donut', by('fit')), G('Variance by department', 'الفرق حسب الإدارة', 'hbar', by('department'), sumOf('variance'), 'money'), G('Requested vs available', 'المطلوب مقابل المتاح', 'bar', by('category'), sumOf('value'), 'money')],
  },
  {
    id: 'pr-items', group: 'B', icon: 'box', en: 'PR Item Analysis', ar: 'تحليل بنود الطلبات',
    descEn: 'Items, material groups, quantities, estimated prices and values.', descAr: 'البنود ومجموعات المواد والكميات والأسعار والقيم التقديرية.',
    source: prRows, dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.proc,
    table: (rows) => groupTable(rows, 'materialGroup', [['category', (g) => g[0].category], ['items', (g) => sum(g, 'items')], ['qty', (g) => sum(g, 'qty')], ['value', (g) => sum(g, 'value')], ['unit', (g) => sum(g, 'value') / Math.max(1, sum(g, 'qty'))]]),
    columns: [C('materialGroup', 'Material group', 'مجموعة المواد'), C('category', 'Category', 'الفئة'), C('items', 'Line items', 'البنود', 'num'), C('qty', 'Quantity', 'الكمية', 'num'), C('unit', 'Avg est. unit price', 'متوسط سعر الوحدة', 'money'), C('value', 'Est. value', 'القيمة التقديرية', 'money')],
    kpis: [
      K('Line items', 'البنود', 'num', sumOf('items'), ['Total BOQ line items across requests.', 'إجمالي بنود جداول الكميات.']),
      K('Quantity', 'الكمية', 'num', sumOf('qty'), ['Total requested quantity.', 'إجمالي الكميات المطلوبة.']),
      K('Material groups', 'مجموعات المواد', 'num', (rows) => new Set(rows.map((r) => r.materialGroup)).size, ['Distinct material groups.', 'مجموعات المواد المختلفة.']),
      K('Est. value', 'القيمة التقديرية', 'money', sumOf('value'), ['Sum of estimated values.', 'مجموع القيم التقديرية.']),
    ],
    charts: [G('Value by material group', 'القيمة حسب مجموعة المواد', 'hbar', by('materialGroup'), sumOf('value'), 'money'), G('Items by category', 'البنود حسب الفئة', 'donut', by('category'), sumOf('items'))],
  },

  // ── C. RFP & Sourcing Reports ─────────────────────────────────────────────
  {
    id: 'rfp-register', group: 'C', icon: 'file', en: 'RFP Register', ar: 'سجل المنافسات',
    descEn: 'RFP ID, title, procurement type, value, status and owner.', descAr: 'رقم المنافسة والعنوان ونوع الشراء والقيمة والحالة والمالك.',
    source: () => RFPS as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.proc, sortKey: 'created',
    columns: [C('id', 'RFP ID', 'رقم المنافسة', 'mono'), C('title', 'Title', 'العنوان'), C('type', 'Procurement type', 'نوع الشراء'), C('department', 'Department', 'الإدارة'), C('value', 'Value', 'القيمة', 'money'), C('status', 'Status', 'الحالة', 'status'), C('owner', 'Owner', 'المالك')],
    kpis: [
      K('RFPs', 'المنافسات', 'num', cnt(), ['Sourcing events in the period.', 'أحداث التوريد خلال الفترة.']),
      K('Total value', 'إجمالي القيمة', 'money', sumOf('value'), ['Sum of RFP estimated values.', 'مجموع القيم التقديرية للمنافسات.']),
      K('Awarded', 'مرساة', 'num', cnt((r) => r.status === 'Awarded'), ['RFPs awarded.', 'المنافسات المرساة.'], (r) => r.status === 'Awarded', 'up'),
      K('Open', 'مفتوحة', 'num', cnt((r) => r.status !== 'Awarded'), ['RFPs not yet awarded.', 'منافسات لم تُرسَ بعد.'], (r) => r.status !== 'Awarded'),
    ],
    charts: [G('RFPs by status', 'المنافسات حسب الحالة', 'donut', by('status')), G('Value by type', 'القيمة حسب النوع', 'hbar', by('type'), sumOf('value'), 'money')],
  },
  {
    id: 'rfp-pipeline', group: 'C', icon: 'stages', en: 'RFP Pipeline', ar: 'مسار المنافسات',
    descEn: 'RFPs by preparation, review, sourcing, evaluation and award stage.', descAr: 'المنافسات حسب مراحل الإعداد والمراجعة والتوريد والتقييم والترسية.',
    source: () => RFPS.filter((r) => r.status !== 'Awarded') as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.proc,
    table: (rows) => ['Preparation', 'Review', 'Sourcing', 'Evaluation', 'Award'].map((s) => { const g = rows.filter((r) => r.status === s); return { status: s, rfps: g.length, value: sum(g, 'value'), share: pct(g.length, rows.length) }; }),
    columns: [C('status', 'Stage', 'المرحلة', 'status'), C('rfps', 'RFPs', 'المنافسات', 'num'), C('share', 'Share', 'الحصة', 'pct'), C('value', 'Value', 'القيمة', 'money')],
    kpis: ['Preparation', 'Review', 'Sourcing', 'Evaluation', 'Award'].map((s) => K(s, ({ Preparation: 'الإعداد', Review: 'المراجعة', Sourcing: 'التوريد', Evaluation: 'التقييم', Award: 'الترسية' } as Record<string, string>)[s], 'num', cnt((r) => r.status === s), [`RFPs currently in ${s}.`, `المنافسات في مرحلة ${s}.`], (r) => r.status === s)),
    charts: [G('RFPs by stage', 'المنافسات حسب المرحلة', 'bar', by('status')), G('Value by stage', 'القيمة حسب المرحلة', 'donut', by('status'), sumOf('value'), 'money')],
  },
  {
    id: 'rfp-review', group: 'C', icon: 'review', en: 'RFP Review Performance', ar: 'أداء مراجعة المنافسات',
    descEn: 'Department-wise review status and turnaround time.', descAr: 'حالة المراجعة وزمن الإنجاز لكل إدارة.',
    source: () => RFPS as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.proc,
    table: (rows) => groupTable(rows, 'reviewDept', [['reviews', (g) => g.length], ['done', (g) => g.filter((r) => r.reviewStatus === 'Completed').length], ['overdue', (g) => g.filter((r) => r.reviewStatus === 'Overdue').length], ['tat', (g) => avg(g, 'reviewDays')]]),
    columns: [C('reviewDept', 'Reviewing department', 'الإدارة المراجعة'), C('reviews', 'Reviews', 'المراجعات', 'num'), C('done', 'Completed', 'مكتملة', 'num'), C('overdue', 'Overdue', 'متأخرة', 'num'), C('tat', 'Avg turnaround', 'متوسط زمن الإنجاز', 'days')],
    kpis: [
      K('Reviews', 'المراجعات', 'num', cnt(), ['Department reviews requested.', 'المراجعات المطلوبة من الإدارات.']),
      K('Completed', 'مكتملة', 'pct', (rows) => pct(rows.filter((r) => r.reviewStatus === 'Completed').length, rows.length), ['Completed ÷ all reviews.', 'المكتملة ÷ جميع المراجعات.'], (r) => r.reviewStatus === 'Completed', 'up'),
      K('Overdue', 'متأخرة', 'num', cnt((r) => r.reviewStatus === 'Overdue'), ['Reviews past their SLA.', 'مراجعات تجاوزت مستوى الخدمة.'], (r) => r.reviewStatus === 'Overdue', 'down'),
      K('Avg turnaround', 'متوسط زمن الإنجاز', 'days', avgOf('reviewDays'), ['Average working days per review.', 'متوسط أيام العمل لكل مراجعة.'], undefined, 'down'),
    ],
    charts: [G('Turnaround by department', 'زمن الإنجاز حسب الإدارة', 'hbar', by('reviewDept'), avgOf('reviewDays'), 'days'), G('Review status', 'حالة المراجعة', 'donut', by('reviewStatus'))],
  },
  {
    id: 'sourcing-perf', group: 'C', icon: 'speed', en: 'Sourcing Performance', ar: 'أداء التوريد',
    descEn: 'Time taken to publish, receive bids, evaluate and award.', descAr: 'الزمن المستغرق للطرح واستلام العروض والتقييم والترسية.',
    source: () => RFPS.filter((r) => ['Sourcing', 'Evaluation', 'Award', 'Awarded'].includes(r.status)).map((r) => ({ ...r, total: r.publishDays + r.bidDays + r.evalDays + r.awardDays })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.proc, sortKey: 'total',
    columns: [C('id', 'RFP ID', 'رقم المنافسة', 'mono'), C('title', 'Title', 'العنوان'), C('publishDays', 'To publish', 'حتى الطرح', 'days'), C('bidDays', 'Bid period', 'فترة العروض', 'days'), C('evalDays', 'Evaluation', 'التقييم', 'days'), C('awardDays', 'To award', 'حتى الترسية', 'days'), C('total', 'Total', 'الإجمالي', 'days')],
    kpis: [
      K('Avg to publish', 'متوسط حتى الطرح', 'days', avgOf('publishDays'), ['Days from approval to publication on Etimad.', 'الأيام من الاعتماد حتى الطرح على اعتماد.'], undefined, 'down'),
      K('Avg bid period', 'متوسط فترة العروض', 'days', avgOf('bidDays'), ['Days the RFP is open for bids.', 'الأيام التي تبقى فيها المنافسة مفتوحة.']),
      K('Avg evaluation', 'متوسط التقييم', 'days', avgOf('evalDays'), ['Days from bid opening to evaluation sign-off.', 'الأيام من فتح العروض حتى اعتماد التقييم.'], undefined, 'down'),
      K('Avg end-to-end', 'متوسط المدة الكاملة', 'days', avgOf('total'), ['Publish + bid + evaluation + award.', 'الطرح + العروض + التقييم + الترسية.'], (r) => r.total > 70, 'down'),
    ],
    charts: [G('End-to-end by type', 'المدة الكاملة حسب النوع', 'bar', by('type'), avgOf('total'), 'days'), G('End-to-end by department', 'المدة الكاملة حسب الإدارة', 'hbar', by('department'), avgOf('total'), 'days')],
  },
  {
    id: 'participation', group: 'C', icon: 'users', en: 'Tender Participation', ar: 'المشاركة في المنافسات',
    descEn: 'Number of invited suppliers, participants and qualified suppliers.', descAr: 'عدد الموردين المدعوين والمشاركين والمؤهلين.',
    source: () => RFPS.filter((r) => ['Evaluation', 'Award', 'Awarded'].includes(r.status)).map((r) => ({ ...r, rate: pct(r.participants, r.invited) })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.proc,
    columns: [C('id', 'RFP ID', 'رقم المنافسة', 'mono'), C('title', 'Title', 'العنوان'), C('type', 'Type', 'النوع'), C('invited', 'Invited', 'المدعوون', 'num'), C('participants', 'Participants', 'المشاركون', 'num'), C('qualified', 'Qualified', 'المؤهلون', 'num'), C('rate', 'Participation', 'نسبة المشاركة', 'pct')],
    kpis: [
      K('Invited', 'المدعوون', 'num', sumOf('invited'), ['Suppliers invited across RFPs.', 'الموردون المدعوون في جميع المنافسات.']),
      K('Participants', 'المشاركون', 'num', sumOf('participants'), ['Suppliers who submitted a bid.', 'الموردون الذين قدموا عروضًا.']),
      K('Qualified', 'المؤهلون', 'num', sumOf('qualified'), ['Bidders passing qualification.', 'المتقدمون الذين اجتازوا التأهيل.']),
      K('Participation rate', 'نسبة المشاركة', 'pct', (rows) => pct(sum(rows, 'participants'), sum(rows, 'invited')), ['Participants ÷ invited.', 'المشاركون ÷ المدعوون.'], (r) => r.rate < 50, 'up'),
    ],
    charts: [G('Avg participants by type', 'متوسط المشاركين حسب النوع', 'bar', by('type'), avgOf('participants')), G('Participation by department', 'المشاركة حسب الإدارة', 'hbar', by('department'), (rows) => pct(sum(rows, 'participants'), sum(rows, 'invited')), 'pct')],
  },
  {
    id: 'bid-eval', group: 'C', icon: 'scale', en: 'Bid Evaluation Summary', ar: 'ملخص تقييم العروض',
    descEn: 'Technical scores, commercial scores, rankings and outcomes.', descAr: 'الدرجات الفنية والمالية والترتيب والنتائج.',
    source: () => RFPS.filter((r) => ['Evaluation', 'Award', 'Awarded'].includes(r.status)).map((r) => ({ ...r, combined: Math.round(r.techScore * 0.7 + r.commScore * 0.3) })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ['Evaluation Committees', 'Procurement'], sortKey: 'combined',
    columns: [C('id', 'RFP ID', 'رقم المنافسة', 'mono'), C('title', 'Title', 'العنوان'), C('supplier', 'Top-ranked supplier', 'المورد الأول'), C('techScore', 'Technical', 'الفني', 'num'), C('commScore', 'Commercial', 'المالي', 'num'), C('combined', 'Combined (70/30)', 'المجمع (70/30)', 'num'), C('rank', 'Rank', 'الترتيب', 'num'), C('outcome', 'Outcome', 'النتيجة', 'status')],
    kpis: [
      K('Evaluated', 'مقيمة', 'num', cnt(), ['RFPs with completed or ongoing evaluation.', 'منافسات بتقييم مكتمل أو جارٍ.']),
      K('Avg technical', 'متوسط الفني', 'num', avgOf('techScore'), ['Average technical score of the top bidder.', 'متوسط الدرجة الفنية للمتقدم الأول.'], undefined, 'up'),
      K('Avg commercial', 'متوسط المالي', 'num', avgOf('commScore'), ['Average commercial score of the top bidder.', 'متوسط الدرجة المالية للمتقدم الأول.'], undefined, 'up'),
      K('Below 70 technical', 'أقل من 70 فنيًا', 'num', cnt((r) => r.techScore < 70), ['Top bidder scored under the 70% passing mark.', 'المتقدم الأول أقل من درجة الاجتياز 70٪.'], (r) => r.techScore < 70, 'down'),
    ],
    charts: [G('Outcomes', 'النتائج', 'donut', by('outcome')), G('Avg combined score by type', 'متوسط الدرجة المجمعة حسب النوع', 'bar', by('type'), avgOf('combined'))],
  },
  {
    id: 'savings', group: 'C', icon: 'savings', en: 'Sourcing Savings', ar: 'وفورات التوريد',
    descEn: 'Estimated value vs awarded value, savings and percentage.', descAr: 'القيمة التقديرية مقابل المرساة والوفورات ونسبتها.',
    source: () => RFPS.filter((r) => r.awarded != null).map((r) => ({ ...r, saving: r.value - (r.awarded ?? 0), savingPct: pct(r.value - (r.awarded ?? 0), r.value) })) as unknown as Row[], dateKey: 'created', filters: ['department', 'project', 'category'], roles: ROLES.exec, sortKey: 'saving',
    columns: [C('id', 'RFP ID', 'رقم المنافسة', 'mono'), C('title', 'Title', 'العنوان'), C('supplier', 'Supplier', 'المورد'), C('value', 'Estimated', 'التقديرية', 'money'), C('awarded', 'Awarded', 'المرساة', 'money'), C('saving', 'Savings', 'الوفورات', 'money'), C('savingPct', 'Savings %', 'نسبة الوفورات', 'pct')],
    kpis: [
      K('Estimated', 'التقديرية', 'money', sumOf('value'), ['Sum of estimated values of awarded RFPs.', 'مجموع القيم التقديرية للمنافسات المرساة.']),
      K('Awarded', 'المرساة', 'money', sumOf('awarded'), ['Sum of awarded values.', 'مجموع القيم المرساة.']),
      K('Savings', 'الوفورات', 'money', sumOf('saving'), ['Estimated − awarded.', 'التقديرية − المرساة.'], undefined, 'up'),
      K('Savings %', 'نسبة الوفورات', 'pct', (rows) => pct(sum(rows, 'saving'), sum(rows, 'value')), ['Savings ÷ estimated value.', 'الوفورات ÷ القيمة التقديرية.'], (r) => r.savingPct >= 15, 'up'),
    ],
    charts: [G('Savings by category', 'الوفورات حسب الفئة', 'hbar', by('category'), sumOf('saving'), 'money'), G('Savings by department', 'الوفورات حسب الإدارة', 'bar', by('department'), sumOf('saving'), 'money')],
  },

  // ── D. Work Engine & Approval Reports ─────────────────────────────────────
  {
    id: 'task-distribution', group: 'D', icon: 'tasks', en: 'Task Distribution', ar: 'توزيع المهام',
    descEn: 'Tasks by department, task type, owner and status.', descAr: 'المهام حسب الإدارة ونوع المهمة والمالك والحالة.',
    source: () => TASKS as unknown as Row[], dateKey: 'assigned', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.ops, sortKey: 'assigned',
    columns: [C('id', 'Task', 'المهمة', 'mono'), C('type', 'Type', 'النوع'), C('department', 'Department', 'الإدارة'), C('owner', 'Owner', 'المالك'), C('stage', 'Stage', 'المرحلة'), C('request', 'Request', 'الطلب', 'mono'), C('status', 'Status', 'الحالة', 'status'), C('assigned', 'Assigned', 'تاريخ الإسناد', 'date')],
    kpis: [
      K('Tasks', 'المهام', 'num', cnt(), ['Tasks created by the Work Engine.', 'المهام المنشأة بواسطة محرك العمل.']),
      K('Pending', 'معلقة', 'num', cnt((r) => r.status === 'Pending'), ['Assigned and not yet completed.', 'مسندة ولم تكتمل بعد.'], (r) => r.status === 'Pending'),
      K('Overdue', 'متأخرة', 'num', cnt((r) => r.status === 'Overdue'), ['Past their SLA and still open.', 'تجاوزت مستوى الخدمة وما زالت مفتوحة.'], (r) => r.status === 'Overdue', 'down'),
      K('Completed', 'مكتملة', 'num', cnt((r) => r.status === 'Completed'), ['Tasks completed.', 'المهام المكتملة.'], (r) => r.status === 'Completed', 'up'),
    ],
    charts: [G('Tasks by department', 'المهام حسب الإدارة', 'hbar', by('department')), G('Tasks by type', 'المهام حسب النوع', 'donut', by('type')), G('Tasks by owner', 'المهام حسب المالك', 'bar', by('owner'), 'count', 'num', 8)],
  },
  {
    id: 'pending-approvals', group: 'D', icon: 'approval', en: 'Pending Approvals', ar: 'الاعتمادات المعلقة',
    descEn: 'Pending tasks, approver, value and ageing.', descAr: 'المهام المعلقة والمعتمد والقيمة والتقادم.',
    source: () => TASKS.filter((t) => t.status !== 'Completed') as unknown as Row[], dateKey: 'assigned', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.ops, sortKey: 'ageingDays',
    columns: [C('id', 'Task', 'المهمة', 'mono'), C('type', 'Type', 'النوع'), C('owner', 'Approver', 'المعتمد'), C('department', 'Department', 'الإدارة'), C('request', 'Request', 'الطلب', 'mono'), C('value', 'Value', 'القيمة', 'money'), C('ageingDays', 'Ageing', 'التقادم', 'days'), C('status', 'Status', 'الحالة', 'status')],
    kpis: [
      K('Pending', 'معلقة', 'num', cnt(), ['Open approval tasks.', 'مهام الاعتماد المفتوحة.']),
      K('Value pending', 'القيمة المعلقة', 'money', sumOf('value'), ['Request value held in pending approvals.', 'قيمة الطلبات المحتجزة في اعتمادات معلقة.']),
      K('Avg ageing', 'متوسط التقادم', 'days', avgOf('ageingDays'), ['Average days a task has been open.', 'متوسط أيام فتح المهمة.'], undefined, 'down'),
      K('Older than 7 days', 'أقدم من 7 أيام', 'num', cnt((r) => r.ageingDays > 7), ['Pending for more than 7 days.', 'معلقة لأكثر من 7 أيام.'], (r) => r.ageingDays > 7, 'down'),
    ],
    charts: [G('Pending by approver', 'المعلق حسب المعتمد', 'hbar', by('owner')), G('Ageing bands', 'شرائح التقادم', 'bar', (r) => ageBand(r.ageingDays)), G('Value by department', 'القيمة حسب الإدارة', 'donut', by('department'), sumOf('value'), 'money')],
  },
  {
    id: 'dept-review', group: 'D', icon: 'dept', en: 'Department Review Performance', ar: 'أداء مراجعة الإدارات',
    descEn: 'IT, Finance, Legal, Cybersecurity turnaround.', descAr: 'زمن إنجاز تقنية المعلومات والمالية والقانونية والأمن السيبراني.',
    source: () => TASKS.filter((t) => t.status === 'Completed') as unknown as Row[], dateKey: 'assigned', filters: ['department', 'project', 'category'], roles: ROLES.ops,
    table: (rows) => groupTable(rows, 'department', [['done', (g) => g.length], ['tat', (g) => avg(g, 'resolvedHours')], ['sla', (g) => pct(g.filter((r) => r.withinSla).length, g.length)], ['rework', (g) => g.filter((r) => r.rework > 0).length]]),
    columns: [C('department', 'Department', 'الإدارة'), C('done', 'Reviews completed', 'المراجعات المكتملة', 'num'), C('tat', 'Avg turnaround', 'متوسط زمن الإنجاز', 'hours'), C('sla', 'Within SLA', 'ضمن مستوى الخدمة', 'pct'), C('rework', 'With rework', 'مع إعادة عمل', 'num')],
    kpis: [
      K('Reviews completed', 'المراجعات المكتملة', 'num', cnt(), ['Completed review tasks.', 'مهام المراجعة المكتملة.']),
      K('Avg turnaround', 'متوسط زمن الإنجاز', 'hours', avgOf('resolvedHours'), ['Average hours from assignment to completion.', 'متوسط الساعات من الإسناد حتى الإنجاز.'], undefined, 'down'),
      K('Within SLA', 'ضمن مستوى الخدمة', 'pct', (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), ['Completed within SLA ÷ completed.', 'المكتملة ضمن المستوى ÷ المكتملة.'], (r) => !r.withinSla, 'up'),
      K('Slowest department', 'الإدارة الأبطأ (ساعات)', 'hours', (rows) => Math.max(0, ...Object.values(groupBy(rows, 'department')).map((g) => avg(g, 'resolvedHours'))), ['Highest average turnaround of any department.', 'أعلى متوسط زمن إنجاز بين الإدارات.'], undefined, 'down'),
    ],
    charts: [G('Avg turnaround by department', 'متوسط زمن الإنجاز حسب الإدارة', 'hbar', by('department'), avgOf('resolvedHours'), 'hours'), G('Within SLA by department', 'الالتزام حسب الإدارة', 'bar', by('department'), (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), 'pct')],
  },
  {
    id: 'bottlenecks', group: 'D', icon: 'bottleneck', en: 'Approval Bottleneck Analysis', ar: 'تحليل اختناقات الاعتماد',
    descEn: 'Stages and departments contributing most to delays.', descAr: 'المراحل والإدارات الأكثر إسهامًا في التأخير.',
    source: () => TASKS.map((t) => ({ ...t, delay: Math.max(0, (t.resolvedHours ?? t.ageingDays * 24) - t.slaHours) })) as unknown as Row[], dateKey: 'assigned', filters: ['department', 'project', 'category'], roles: ROLES.ops,
    table: (rows) => groupTable(rows, (r) => `${r.stage} · ${r.department}`, [['stage', (g) => g[0].stage], ['department', (g) => g[0].department], ['tasks', (g) => g.length], ['late', (g) => g.filter((r) => r.delay > 0).length], ['delay', (g) => sum(g, 'delay')]], 'key').sort((a, b) => b.delay - a.delay).slice(0, 25),
    columns: [C('stage', 'Stage', 'المرحلة'), C('department', 'Department', 'الإدارة'), C('tasks', 'Tasks', 'المهام', 'num'), C('late', 'Late tasks', 'المهام المتأخرة', 'num'), C('delay', 'Delay hours', 'ساعات التأخير', 'hours')],
    kpis: [
      K('Delay hours', 'ساعات التأخير', 'hours', sumOf('delay'), ['Hours beyond SLA across all tasks.', 'الساعات بعد مستوى الخدمة لكل المهام.'], (r) => r.delay > 0, 'down'),
      K('Late tasks', 'المهام المتأخرة', 'num', cnt((r) => r.delay > 0), ['Tasks that exceeded SLA.', 'المهام التي تجاوزت مستوى الخدمة.'], (r) => r.delay > 0, 'down'),
      K('Worst stage share', 'حصة المرحلة الأسوأ', 'pct', (rows) => topShare(rows, 'stage', 'delay'), ['Share of delay hours in the worst stage.', 'حصة ساعات التأخير في المرحلة الأسوأ.'], undefined, 'down'),
      K('Worst department share', 'حصة الإدارة الأسوأ', 'pct', (rows) => topShare(rows, 'department', 'delay'), ['Share of delay hours in the worst department.', 'حصة ساعات التأخير في الإدارة الأسوأ.'], undefined, 'down'),
    ],
    charts: [G('Delay hours by stage', 'ساعات التأخير حسب المرحلة', 'hbar', by('stage'), sumOf('delay'), 'hours'), G('Delay hours by department', 'ساعات التأخير حسب الإدارة', 'bar', by('department'), sumOf('delay'), 'hours')],
  },
  {
    id: 'sla', group: 'D', icon: 'sla', en: 'SLA Compliance', ar: 'الالتزام بمستوى الخدمة',
    descEn: 'Within SLA, breached SLA, average resolution time.', descAr: 'ضمن مستوى الخدمة، المتجاوز، ومتوسط زمن الحل.',
    source: () => TASKS.map((t) => ({ ...t, slaState: t.withinSla ? 'Within SLA' : 'Breached' })) as unknown as Row[], dateKey: 'assigned', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.ops,
    columns: [C('id', 'Task', 'المهمة', 'mono'), C('type', 'Type', 'النوع'), C('department', 'Department', 'الإدارة'), C('slaHours', 'SLA', 'مستوى الخدمة', 'hours'), C('resolvedHours', 'Resolution time', 'زمن الحل', 'hours'), C('slaState', 'SLA status', 'حالة المستوى', 'status'), C('status', 'Task status', 'حالة المهمة', 'status')],
    kpis: [
      K('Within SLA', 'ضمن المستوى', 'pct', (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), ['Tasks within SLA ÷ all tasks.', 'المهام ضمن المستوى ÷ جميع المهام.'], (r) => r.withinSla, 'up'),
      K('Breached', 'متجاوزة', 'num', cnt((r) => !r.withinSla), ['Tasks that breached SLA.', 'المهام المتجاوزة لمستوى الخدمة.'], (r) => !r.withinSla, 'down'),
      K('Avg resolution', 'متوسط زمن الحل', 'hours', avgOf('resolvedHours'), ['Average hours to complete a task.', 'متوسط الساعات لإنجاز المهمة.'], undefined, 'down'),
      K('Avg SLA', 'متوسط المستوى', 'hours', avgOf('slaHours'), ['Average SLA target in hours.', 'متوسط هدف مستوى الخدمة بالساعات.']),
    ],
    charts: [G('SLA status', 'حالة المستوى', 'donut', by('slaState')), G('Within SLA by month', 'الالتزام شهريًا', 'line', month('assigned'), (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), 'pct'), G('Breaches by task type', 'التجاوزات حسب النوع', 'hbar', by('type'), (rows) => rows.filter((r) => !r.withinSla).length)],
  },
  {
    id: 'task-completion', group: 'D', icon: 'check', en: 'Task Completion Analysis', ar: 'تحليل إنجاز المهام',
    descEn: 'Assigned vs completed tasks, completion time and rework.', descAr: 'المسندة مقابل المكتملة وزمن الإنجاز وإعادة العمل.',
    source: () => TASKS as unknown as Row[], dateKey: 'assigned', filters: ['department', 'project', 'category'], roles: ROLES.ops,
    table: (rows) => groupTable(rows, 'owner', [['assigned', (g) => g.length], ['completed', (g) => g.filter((r) => r.status === 'Completed').length], ['rate', (g) => pct(g.filter((r) => r.status === 'Completed').length, g.length)], ['time', (g) => avg(g, 'resolvedHours')], ['rework', (g) => sum(g, 'rework')]]),
    columns: [C('owner', 'Owner', 'المالك'), C('assigned', 'Assigned', 'المسندة', 'num'), C('completed', 'Completed', 'المكتملة', 'num'), C('rate', 'Completion rate', 'معدل الإنجاز', 'pct'), C('time', 'Avg completion time', 'متوسط زمن الإنجاز', 'hours'), C('rework', 'Rework loops', 'دورات إعادة العمل', 'num')],
    kpis: [
      K('Assigned', 'المسندة', 'num', cnt(), ['Tasks assigned in the period.', 'المهام المسندة خلال الفترة.']),
      K('Completed', 'المكتملة', 'num', cnt((r) => r.status === 'Completed'), ['Tasks completed.', 'المهام المكتملة.'], (r) => r.status === 'Completed', 'up'),
      K('Completion rate', 'معدل الإنجاز', 'pct', (rows) => pct(rows.filter((r) => r.status === 'Completed').length, rows.length), ['Completed ÷ assigned.', 'المكتملة ÷ المسندة.'], undefined, 'up'),
      K('Rework rate', 'معدل إعادة العمل', 'pct', (rows) => pct(rows.filter((r) => r.rework > 0).length, rows.length), ['Tasks returned at least once ÷ all tasks.', 'المهام المعادة مرة على الأقل ÷ جميع المهام.'], (r) => r.rework > 0, 'down'),
    ],
    charts: [G('Completed per month', 'المكتملة شهريًا', 'line', month('assigned'), (rows) => rows.filter((r) => r.status === 'Completed').length), G('Completion rate by type', 'معدل الإنجاز حسب النوع', 'hbar', by('type'), (rows) => pct(rows.filter((r) => r.status === 'Completed').length, rows.length), 'pct')],
  },
  {
    id: 'exceptions', group: 'D', icon: 'alert', en: 'Workflow Exception Report', ar: 'تقرير استثناءات سير العمل',
    descEn: 'Failed transitions, blocked tasks and unresolved dependencies.', descAr: 'الانتقالات الفاشلة والمهام المحجوبة والاعتماديات غير المحلولة.',
    source: () => EXCEPTIONS as unknown as Row[], dateKey: 'since', filters: ['department', 'status'], statusKey: 'status', roles: ['Work Engine Admin'], sortKey: 'since',
    columns: [C('id', 'Exception', 'الاستثناء', 'mono'), C('kind', 'Type', 'النوع'), C('detail', 'Detail', 'التفاصيل'), C('task', 'Task', 'المهمة', 'mono'), C('stage', 'Stage', 'المرحلة'), C('severity', 'Severity', 'الخطورة', 'status'), C('status', 'Status', 'الحالة', 'status'), C('since', 'Since', 'منذ', 'date')],
    kpis: [
      K('Open exceptions', 'الاستثناءات المفتوحة', 'num', cnt((r) => r.status !== 'Resolved'), ['Exceptions not yet resolved.', 'استثناءات لم تُحل بعد.'], (r) => r.status !== 'Resolved', 'down'),
      K('Failed transitions', 'انتقالات فاشلة', 'num', cnt((r) => r.kind === 'Failed transition'), ['Workflow steps that failed to move on.', 'خطوات لم تنتقل للمرحلة التالية.'], (r) => r.kind === 'Failed transition', 'down'),
      K('Blocked tasks', 'مهام محجوبة', 'num', cnt((r) => r.kind === 'Blocked task'), ['Tasks that cannot be actioned.', 'مهام لا يمكن تنفيذها.'], (r) => r.kind === 'Blocked task', 'down'),
      K('High severity', 'خطورة عالية', 'num', cnt((r) => r.severity === 'High'), ['High-severity exceptions.', 'استثناءات عالية الخطورة.'], (r) => r.severity === 'High', 'down'),
    ],
    charts: [G('By type', 'حسب النوع', 'donut', by('kind')), G('By stage', 'حسب المرحلة', 'hbar', by('stage'))],
  },

  // ── E. Purchase Order & Contract Reports ──────────────────────────────────
  {
    id: 'po-register', group: 'E', icon: 'po', en: 'PO Register', ar: 'سجل أوامر الشراء',
    descEn: 'PO number, supplier, value, date, status and project.', descAr: 'رقم أمر الشراء والمورد والقيمة والتاريخ والحالة والمشروع.',
    source: () => POS as unknown as Row[], dateKey: 'date', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.proc, sortKey: 'date',
    columns: [C('id', 'PO number', 'رقم أمر الشراء', 'mono'), C('supplier', 'Supplier', 'المورد'), C('project', 'Project', 'المشروع'), C('department', 'Department', 'الإدارة'), C('value', 'Value', 'القيمة', 'money'), C('date', 'Date', 'التاريخ', 'date'), C('status', 'Status', 'الحالة', 'status')],
    kpis: [
      K('POs', 'أوامر الشراء', 'num', cnt(), ['Purchase orders issued.', 'أوامر الشراء الصادرة.']),
      K('PO value', 'قيمة أوامر الشراء', 'money', sumOf('value'), ['Sum of PO values.', 'مجموع قيم أوامر الشراء.']),
      K('Open', 'مفتوحة', 'num', cnt((r) => ['Open', 'Partially received'].includes(r.status)), ['Open or partially received POs.', 'أوامر مفتوحة أو مستلمة جزئيًا.'], (r) => ['Open', 'Partially received'].includes(r.status)),
      K('Suppliers', 'الموردون', 'num', (rows) => new Set(rows.map((r) => r.supplier)).size, ['Distinct suppliers.', 'الموردون المختلفون.']),
    ],
    charts: [G('POs by status', 'أوامر الشراء حسب الحالة', 'donut', by('status')), G('PO value per month', 'قيمة أوامر الشراء شهريًا', 'line', month('date'), sumOf('value'), 'money')],
  },
  {
    id: 'po-spend', group: 'E', icon: 'chart', en: 'PO Spend Analysis', ar: 'تحليل الإنفاق على أوامر الشراء',
    descEn: 'PO value by category, supplier and department.', descAr: 'قيمة أوامر الشراء حسب الفئة والمورد والإدارة.',
    source: () => POS.filter((p) => p.status !== 'Cancelled') as unknown as Row[], dateKey: 'date', filters: ['department', 'project', 'category'], roles: ROLES.exec,
    table: (rows) => groupTable(rows, 'supplier', [['pos', (g) => g.length], ['value', (g) => sum(g, 'value')], ['share', (g, all) => pct(sum(g, 'value'), sum(all, 'value'))], ['categories', (g) => new Set(g.map((r) => r.category)).size]]),
    columns: [C('supplier', 'Supplier', 'المورد'), C('pos', 'POs', 'أوامر الشراء', 'num'), C('value', 'Spend', 'الإنفاق', 'money'), C('share', 'Share', 'الحصة', 'pct'), C('categories', 'Categories', 'الفئات', 'num')],
    kpis: [
      K('PO spend', 'الإنفاق', 'money', sumOf('value'), ['Sum of non-cancelled PO values.', 'مجموع قيم أوامر الشراء غير الملغاة.']),
      K('Suppliers', 'الموردون', 'num', (rows) => new Set(rows.map((r) => r.supplier)).size, ['Distinct suppliers paid.', 'الموردون المختلفون.']),
      K('Top supplier share', 'حصة المورد الأكبر', 'pct', (rows) => topShare(rows, 'supplier', 'value'), ['Share of spend with the largest supplier.', 'حصة الإنفاق مع أكبر مورد.'], undefined, 'down'),
      K('Avg PO value', 'متوسط قيمة الأمر', 'money', avgOf('value'), ['Spend ÷ number of POs.', 'الإنفاق ÷ عدد أوامر الشراء.']),
    ],
    charts: [G('Spend by category', 'الإنفاق حسب الفئة', 'donut', by('category'), sumOf('value'), 'money'), G('Top suppliers', 'أكبر الموردين', 'hbar', by('supplier'), sumOf('value'), 'money', 8), G('Spend by department', 'الإنفاق حسب الإدارة', 'bar', by('department'), sumOf('value'), 'money')],
  },
  {
    id: 'contract-register', group: 'E', icon: 'contract', en: 'Contract Register', ar: 'سجل العقود',
    descEn: 'Contract number, supplier, start/end date, value and status.', descAr: 'رقم العقد والمورد وتاريخ البداية والنهاية والقيمة والحالة.',
    source: () => CONTRACTS as unknown as Row[], dateKey: 'start', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ['Contract Managers', 'Procurement'], sortKey: 'end',
    columns: [C('id', 'Contract', 'العقد', 'mono'), C('title', 'Title', 'العنوان'), C('supplier', 'Supplier', 'المورد'), C('start', 'Start', 'البداية', 'date'), C('end', 'End', 'النهاية', 'date'), C('value', 'Value', 'القيمة', 'money'), C('status', 'Status', 'الحالة', 'status')],
    kpis: [
      K('Contracts', 'العقود', 'num', cnt(), ['Contracts in the register.', 'العقود في السجل.']),
      K('Contract value', 'قيمة العقود', 'money', sumOf('value'), ['Sum of contract values.', 'مجموع قيم العقود.']),
      K('Active', 'سارية', 'num', cnt((r) => r.status === 'Active'), ['Contracts currently active.', 'العقود السارية حاليًا.'], (r) => r.status === 'Active'),
      K('Expiring ≤ 90 days', 'تنتهي خلال 90 يومًا', 'num', cnt((r) => r.status === 'Expiring'), ['Contracts ending within 90 days.', 'عقود تنتهي خلال 90 يومًا.'], (r) => r.status === 'Expiring', 'down'),
    ],
    charts: [G('Contracts by status', 'العقود حسب الحالة', 'donut', by('status')), G('Value by supplier', 'القيمة حسب المورد', 'hbar', by('supplier'), sumOf('value'), 'money', 8)],
  },
  {
    id: 'contract-expiry', group: 'E', icon: 'calendar', en: 'Contract Expiry', ar: 'انتهاء العقود',
    descEn: 'Contracts expiring in 30/60/90 days.', descAr: 'العقود التي تنتهي خلال 30/60/90 يومًا.',
    source: () => CONTRACTS.filter((c) => c.daysToExpiry >= 0 && c.daysToExpiry <= 120).map((c) => ({ ...c, band: c.daysToExpiry <= 30 ? '≤ 30 days' : c.daysToExpiry <= 60 ? '31–60 days' : c.daysToExpiry <= 90 ? '61–90 days' : '91–120 days' })) as unknown as Row[], dateKey: 'end', filters: ['department', 'project', 'category'], roles: ['Contract Managers', 'Procurement'], sortKey: 'daysToExpiry',
    columns: [C('id', 'Contract', 'العقد', 'mono'), C('title', 'Title', 'العنوان'), C('supplier', 'Supplier', 'المورد'), C('end', 'End date', 'تاريخ النهاية', 'date'), C('daysToExpiry', 'Days left', 'الأيام المتبقية', 'days'), C('band', 'Window', 'النافذة', 'status'), C('value', 'Value', 'القيمة', 'money')],
    kpis: [
      K('≤ 30 days', 'خلال 30 يومًا', 'num', cnt((r) => r.daysToExpiry <= 30), ['Contracts ending within 30 days.', 'عقود تنتهي خلال 30 يومًا.'], (r) => r.daysToExpiry <= 30, 'down'),
      K('31–60 days', '31–60 يومًا', 'num', cnt((r) => r.daysToExpiry > 30 && r.daysToExpiry <= 60), ['Contracts ending in 31–60 days.', 'عقود تنتهي خلال 31–60 يومًا.'], (r) => r.daysToExpiry > 30 && r.daysToExpiry <= 60),
      K('61–90 days', '61–90 يومًا', 'num', cnt((r) => r.daysToExpiry > 60 && r.daysToExpiry <= 90), ['Contracts ending in 61–90 days.', 'عقود تنتهي خلال 61–90 يومًا.'], (r) => r.daysToExpiry > 60 && r.daysToExpiry <= 90),
      K('Value at risk', 'القيمة المعرضة', 'money', (rows) => sum(rows.filter((r) => r.daysToExpiry <= 90), 'value'), ['Value of contracts ending within 90 days.', 'قيمة العقود المنتهية خلال 90 يومًا.']),
    ],
    charts: [G('Expiry window', 'نافذة الانتهاء', 'bar', by('band')), G('Expiring value by supplier', 'القيمة المنتهية حسب المورد', 'hbar', by('supplier'), sumOf('value'), 'money')],
  },
  {
    id: 'contract-utilisation', group: 'E', icon: 'gauge', en: 'Contract Utilisation', ar: 'استخدام العقود',
    descEn: 'Contract value, consumed value and remaining value.', descAr: 'قيمة العقد والقيمة المستهلكة والمتبقية.',
    source: () => CONTRACTS.filter((c) => c.status !== 'Draft').map((c) => ({ ...c, remaining: Math.max(0, c.value - c.consumed), used: pct(c.consumed, c.value) })) as unknown as Row[], dateKey: 'start', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ['Contract Managers', 'Finance'], sortKey: 'used',
    columns: [C('id', 'Contract', 'العقد', 'mono'), C('supplier', 'Supplier', 'المورد'), C('value', 'Contract value', 'قيمة العقد', 'money'), C('consumed', 'Consumed', 'المستهلك', 'money'), C('remaining', 'Remaining', 'المتبقي', 'money'), C('used', 'Utilisation', 'نسبة الاستخدام', 'pct'), C('status', 'Status', 'الحالة', 'status')],
    kpis: [
      K('Contract value', 'قيمة العقود', 'money', sumOf('value'), ['Sum of contract values.', 'مجموع قيم العقود.']),
      K('Consumed', 'المستهلك', 'money', sumOf('consumed'), ['Invoiced / received value against contracts.', 'القيمة المفوترة أو المستلمة مقابل العقود.']),
      K('Remaining', 'المتبقي', 'money', sumOf('remaining'), ['Contract value − consumed.', 'قيمة العقد − المستهلك.']),
      K('Over 90% used', 'مستخدمة فوق 90٪', 'num', cnt((r) => r.used > 90), ['Contracts nearly exhausted.', 'عقود شارفت على النفاد.'], (r) => r.used > 90, 'down'),
    ],
    charts: [G('Utilisation bands', 'شرائح الاستخدام', 'bar', (r) => (r.used < 25 ? '< 25%' : r.used < 50 ? '25–50%' : r.used < 75 ? '50–75%' : r.used < 90 ? '75–90%' : '≥ 90%')), G('Remaining by category', 'المتبقي حسب الفئة', 'donut', by('category'), sumOf('remaining'), 'money')],
  },
  {
    id: 'po-delivery', group: 'E', icon: 'truck', en: 'PO Delivery Performance', ar: 'أداء تسليم أوامر الشراء',
    descEn: 'Ordered quantity, received quantity, pending quantity and delays.', descAr: 'الكمية المطلوبة والمستلمة والمعلقة والتأخير.',
    source: () => POS.filter((p) => p.status !== 'Cancelled').map((p) => ({ ...p, pendingQty: p.orderedQty - p.receivedQty, onTime: p.delayDays === 0 ? 'On time' : 'Delayed' })) as unknown as Row[], dateKey: 'date', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.proc, sortKey: 'delayDays',
    columns: [C('id', 'PO number', 'رقم أمر الشراء', 'mono'), C('supplier', 'Supplier', 'المورد'), C('orderedQty', 'Ordered', 'المطلوبة', 'num'), C('receivedQty', 'Received', 'المستلمة', 'num'), C('pendingQty', 'Pending', 'المعلقة', 'num'), C('delayDays', 'Delay', 'التأخير', 'days'), C('onTime', 'Delivery', 'التسليم', 'status')],
    kpis: [
      K('Ordered qty', 'الكمية المطلوبة', 'num', sumOf('orderedQty'), ['Total ordered quantity.', 'إجمالي الكمية المطلوبة.']),
      K('Received qty', 'الكمية المستلمة', 'num', sumOf('receivedQty'), ['Total goods receipts.', 'إجمالي الكميات المستلمة.']),
      K('On-time delivery', 'التسليم في الموعد', 'pct', (rows) => pct(rows.filter((r) => r.delayDays === 0).length, rows.length), ['POs with no delay ÷ all POs.', 'الأوامر بلا تأخير ÷ جميع الأوامر.'], (r) => r.delayDays > 0, 'up'),
      K('Avg delay', 'متوسط التأخير', 'days', (rows) => avg(rows.filter((r) => r.delayDays > 0), 'delayDays'), ['Average delay of delayed POs.', 'متوسط تأخير الأوامر المتأخرة.'], undefined, 'down'),
    ],
    charts: [G('Delivery status', 'حالة التسليم', 'donut', by('onTime')), G('Avg delay by supplier', 'متوسط التأخير حسب المورد', 'hbar', by('supplier'), (rows) => avg(rows.filter((r) => r.delayDays > 0), 'delayDays'), 'days', 8)],
  },
  {
    id: 'po-amendments', group: 'E', icon: 'edit', en: 'PO Amendment Analysis', ar: 'تحليل تعديلات أوامر الشراء',
    descEn: 'Change orders, revised values and amendment frequency.', descAr: 'أوامر التغيير والقيم المعدلة وتكرار التعديل.',
    source: () => POS.filter((p) => p.amendments > 0).map((p) => ({ ...p, change: p.revisedValue - p.value, changePct: pct(p.revisedValue - p.value, p.value) })) as unknown as Row[], dateKey: 'date', filters: ['department', 'project', 'category', 'status'], statusKey: 'status', roles: ROLES.proc, sortKey: 'amendments',
    columns: [C('id', 'PO number', 'رقم أمر الشراء', 'mono'), C('supplier', 'Supplier', 'المورد'), C('amendments', 'Change orders', 'أوامر التغيير', 'num'), C('value', 'Original value', 'القيمة الأصلية', 'money'), C('revisedValue', 'Revised value', 'القيمة المعدلة', 'money'), C('change', 'Change', 'التغير', 'money'), C('changePct', 'Change %', 'نسبة التغير', 'pct')],
    kpis: [
      K('Amended POs', 'أوامر معدلة', 'num', cnt(), ['POs with at least one change order.', 'أوامر بها أمر تغيير واحد على الأقل.']),
      K('Change orders', 'أوامر التغيير', 'num', sumOf('amendments'), ['Total change orders.', 'إجمالي أوامر التغيير.']),
      K('Net value change', 'صافي تغير القيمة', 'money', sumOf('change'), ['Revised − original value.', 'المعدلة − الأصلية.'], undefined, 'down'),
      K('Amendment rate', 'معدل التعديل', 'pct', (rows) => pct(rows.length, POS.length), ['Amended POs ÷ all POs.', 'الأوامر المعدلة ÷ جميع الأوامر.'], undefined, 'down'),
    ],
    charts: [G('Change orders per PO', 'أوامر التغيير لكل أمر', 'bar', (r) => `${r.amendments} change order${r.amendments > 1 ? 's' : ''}`), G('Value change by supplier', 'تغير القيمة حسب المورد', 'hbar', by('supplier'), sumOf('change'), 'money', 8)],
  },
];

// ── table helpers ────────────────────────────────────────────────────────────
function groupBy(rows: Row[], key: string | ((r: Row) => string)) {
  const f = typeof key === 'string' ? (r: Row) => String(r[key] ?? '—') : key;
  return rows.reduce<Record<string, Row[]>>((m, r) => { (m[f(r)] ||= []).push(r); return m; }, {});
}
function groupTable(rows: Row[], key: string | ((r: Row) => string), cols: [string, (g: Row[], all: Row[]) => any][], keyName?: string): Row[] {
  const name = keyName ?? (typeof key === 'string' ? key : 'key');
  return Object.entries(groupBy(rows, key)).map(([k, g]) => Object.fromEntries([[name, k], ...cols.map(([c, f]) => [c, f(g, rows)])]));
}
function topShare(rows: Row[], key: string, metric?: string) {
  const g = Object.values(groupBy(rows, key)).map((x) => (metric ? sum(x, metric) : x.length));
  const total = g.reduce((a, b) => a + b, 0);
  return total ? (Math.max(...g) / total) * 100 : 0;
}
