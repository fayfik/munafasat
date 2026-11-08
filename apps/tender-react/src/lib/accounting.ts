// Finance accounting data captured per BOQ line, so GL and Assets can review a request
// inside Munafasat. The requester never has to know accounting: Purchase Type and
// Material Group are suggested from the item name / description (editable), and the
// GL account follows the Material Group (read-only).
import type { BOQRow, TenderFormData } from '../types/tender';
import { ALL_COST_CENTERS, PROJECTS } from '../data/mockData';

export type FinPurchaseType = 'consumable' | 'asset' | 'service' | 'service-asset';
export type AssetFlag = 'asset' | 'non-asset';
export type ComponentRole = 'hardware' | 'licence' | 'implementation' | 'installation';
export type MgKind = 'asset' | 'consumable' | 'service';

export const PURCHASE_TYPES: Record<FinPurchaseType, { en: string; ar: string }> = {
  consumable:      { en: 'Consumable',      ar: 'مستهلكات' },
  asset:           { en: 'Asset',           ar: 'أصل' },
  service:         { en: 'Service',         ar: 'خدمة' },
  'service-asset': { en: 'Service + Asset', ar: 'خدمة + أصل' },
};

export const COMPONENT_ROLES: Record<ComponentRole, { en: string; ar: string }> = {
  hardware:       { en: 'Hardware',       ar: 'أجهزة' },
  licence:        { en: 'Licence',        ar: 'ترخيص' },
  implementation: { en: 'Implementation', ar: 'تنفيذ' },
  installation:   { en: 'Installation',   ar: 'تركيب' },
};

export interface GlAccount { code: string; en: string; ar: string }
export interface MaterialGroup {
  code: string; en: string; ar: string; kind: MgKind;
  glMain: GlAccount;
  /** Detailed sub-account. Missing for a few legacy groups — GL must assign one. */
  glSub?: GlAccount;
}

const GL = {
  itAssets:   { code: '1230', en: 'IT Equipment (CapEx)', ar: 'معدات تقنية (رأسمالي)' },
  intangible: { code: '1260', en: 'Intangible Assets', ar: 'الأصول غير الملموسة' },
  furniture:  { code: '1240', en: 'Furniture & Fixtures', ar: 'الأثاث والتجهيزات' },
  vehicles:   { code: '1250', en: 'Vehicles', ar: 'المركبات' },
  auc:        { code: '1290', en: 'Assets Under Construction', ar: 'أصول تحت الإنشاء' },
  itConsult:  { code: '4250', en: 'IT Consulting Expenses', ar: 'مصروفات الاستشارات التقنية' },
  itMaint:    { code: '4260', en: 'IT Maintenance & Support', ar: 'الصيانة والدعم التقني' },
  telecom:    { code: '4270', en: 'Communication Expenses', ar: 'مصروفات الاتصالات' },
  supplies:   { code: '4310', en: 'Office Supplies & Consumables', ar: 'اللوازم المكتبية والمستهلكات' },
  facility:   { code: '4410', en: 'Facility Services', ar: 'خدمات المرافق' },
  training:   { code: '4520', en: 'Training & Development', ar: 'التدريب والتطوير' },
} satisfies Record<string, GlAccount>;
const sub = (code: string, en: string, ar: string): GlAccount => ({ code, en, ar });

export const MATERIAL_GROUPS: MaterialGroup[] = [
  { code: 'MG-IT-HW',   en: 'IT Hardware',             ar: 'أجهزة تقنية',          kind: 'asset',      glMain: GL.itAssets,   glSub: sub('1230-01', 'Servers & Storage', 'الخوادم والتخزين') },
  { code: 'MG-IT-EUD',  en: 'End-user Devices',        ar: 'أجهزة المستخدمين',     kind: 'asset',      glMain: GL.itAssets,   glSub: sub('1230-02', 'Laptops & Desktops', 'الحواسيب المحمولة والمكتبية') },
  { code: 'MG-IT-NET',  en: 'Network Equipment',       ar: 'معدات الشبكات',        kind: 'asset',      glMain: GL.itAssets,   glSub: sub('1230-03', 'Network & Security Appliances', 'أجهزة الشبكات والأمن') },
  { code: 'MG-SW-LIC',  en: 'Software Licences',       ar: 'تراخيص البرمجيات',     kind: 'asset',      glMain: GL.intangible, glSub: sub('1260-01', 'Perpetual Software Licences', 'تراخيص برمجيات دائمة') },
  { code: 'MG-SW-SUB',  en: 'Software Subscriptions',  ar: 'اشتراكات البرمجيات',   kind: 'service',    glMain: GL.itConsult,  glSub: sub('4250-02', 'Software Licences & Fees', 'رسوم وتراخيص البرمجيات') },
  { code: 'MG-IT-IMP',  en: 'IT Implementation',       ar: 'تنفيذ تقني',            kind: 'service',    glMain: GL.itConsult,  glSub: sub('4250-01', 'Implementation Services', 'خدمات التنفيذ') },
  { code: 'MG-IT-CONS', en: 'IT Consulting',           ar: 'استشارات تقنية',        kind: 'service',    glMain: GL.itConsult,  glSub: sub('4250-03', 'Advisory Fees', 'أتعاب استشارية') },
  { code: 'MG-IT-MNT',  en: 'IT Maintenance & Support', ar: 'الصيانة والدعم التقني', kind: 'service',   glMain: GL.itMaint,    glSub: sub('4260-01', 'Support & Maintenance Contracts', 'عقود الدعم والصيانة') },
  { code: 'MG-IT-INST', en: 'Installation & Delivery', ar: 'التركيب والتوصيل',      kind: 'service',    glMain: GL.auc },
  { code: 'MG-TEL',     en: 'Telecom & Connectivity',  ar: 'الاتصالات والربط',      kind: 'service',    glMain: GL.telecom,    glSub: sub('4270-01', 'Data Lines & Bandwidth', 'خطوط البيانات وعرض النطاق') },
  { code: 'MG-TRN',     en: 'Training',                ar: 'التدريب',               kind: 'service',    glMain: GL.training,   glSub: sub('4520-01', 'Technical Training', 'التدريب التقني') },
  { code: 'MG-OFF',     en: 'Office Supplies',         ar: 'اللوازم المكتبية',      kind: 'consumable', glMain: GL.supplies,   glSub: sub('4310-01', 'Stationery & Supplies', 'القرطاسية واللوازم') },
  { code: 'MG-IT-CNS',  en: 'IT Consumables',          ar: 'مستهلكات تقنية',        kind: 'consumable', glMain: GL.supplies,   glSub: sub('4310-02', 'IT Accessories & Toner', 'ملحقات تقنية وأحبار') },
  { code: 'MG-FUR',     en: 'Furniture',               ar: 'الأثاث',                kind: 'asset',      glMain: GL.furniture,  glSub: sub('1240-01', 'Office Furniture', 'أثاث مكتبي') },
  { code: 'MG-FAC',     en: 'Facility Services',       ar: 'خدمات المرافق',         kind: 'service',    glMain: GL.facility,   glSub: sub('4410-01', 'Cleaning & Maintenance', 'النظافة والصيانة') },
  { code: 'MG-VEH',     en: 'Vehicles',                ar: 'المركبات',              kind: 'asset',      glMain: GL.vehicles,   glSub: sub('1250-01', 'Passenger Vehicles', 'سيارات الركاب') },
];
export const mgByCode = (code?: string) => MATERIAL_GROUPS.find((m) => m.code === code);

/** Purchase type that naturally goes with a Material Group. */
export const ptForKind = (k: MgKind): FinPurchaseType => (k === 'asset' ? 'asset' : k === 'consumable' ? 'consumable' : 'service');
/** Asset flag for a line — Service + Asset still produces an asset. */
export const assetFlagOf = (r: Pick<BOQRow, 'finPurchaseType' | 'assetFlag'>): AssetFlag | undefined =>
  r.assetFlag ?? (r.finPurchaseType ? (r.finPurchaseType === 'asset' || r.finPurchaseType === 'service-asset' ? 'asset' : 'non-asset') : undefined);

/** Keyword rules, most specific first. */
const RULES: { re: RegExp; mg: string; role?: ComponentRole }[] = [
  { re: /\b(install|installation|delivery|cabling|racking|rack and stack|mounting|shipping)\b/, mg: 'MG-IT-INST', role: 'installation' },
  { re: /\b(maintenance|support|warranty|amc|sla|managed service|helpdesk)\b/, mg: 'MG-IT-MNT' },
  { re: /\b(subscription|saas|cloud|annual licen[cs]e|yearly)\b/, mg: 'MG-SW-SUB', role: 'licence' },
  { re: /\b(licen[cs]e|licen[cs]es|software|perpetual|edition)\b/, mg: 'MG-SW-LIC', role: 'licence' },
  { re: /\b(implementation|implement|integration|migration|configuration|deployment|development|customi[sz]ation|go-live)\b/, mg: 'MG-IT-IMP', role: 'implementation' },
  { re: /\b(consult|consulting|consultancy|advisory|assessment|audit|study|design)\b/, mg: 'MG-IT-CONS', role: 'implementation' },
  { re: /\b(training|workshop|course|certification)\b/, mg: 'MG-TRN' },
  { re: /\b(switch|router|firewall|access point|wifi|load balancer|network)\b/, mg: 'MG-IT-NET', role: 'hardware' },
  { re: /\b(laptop|desktop|monitor|tablet|workstation|printer|scanner|phone)\b/, mg: 'MG-IT-EUD', role: 'hardware' },
  { re: /\b(server|storage|san|nas|appliance|hardware|blade|ups|gpu)\b/, mg: 'MG-IT-HW', role: 'hardware' },
  { re: /\b(internet|bandwidth|telecom|connectivity|line|mpls|sim)\b/, mg: 'MG-TEL' },
  { re: /\b(toner|cartridge|cable|mouse|keyboard|accessor(y|ies)|usb)\b/, mg: 'MG-IT-CNS' },
  { re: /\b(paper|stationery|pen|supplies|consumable|consumables)\b/, mg: 'MG-OFF' },
  { re: /\b(chair|desk|table|furniture|cabinet|sofa|partition)\b/, mg: 'MG-FUR' },
  { re: /\b(cleaning|security guard|facility|facilities|landscap|pest)\b/, mg: 'MG-FAC' },
  { re: /\b(vehicle|car|van|bus|truck)\b/, mg: 'MG-VEH' },
];

export interface AcctSuggestion { finPurchaseType: FinPurchaseType; materialGroup: string; componentRole?: ComponentRole }
/** AI-style suggestion from the item name and description. Returns null when there is too little text. */
export function suggestAccounting(name: string, description = ''): AcctSuggestion | null {
  const txt = `${name} ${description}`.toLowerCase();
  if (txt.trim().length < 3) return null;
  // The item name is the strongest signal; the description only breaks ties.
  const nm = name.toLowerCase();
  const hit = RULES.find((r) => r.re.test(nm)) ?? RULES.find((r) => r.re.test(txt));
  const mg = mgByCode(hit?.mg ?? 'MG-IT-CONS')!;
  // Supply-and-install style lines are both a service and an asset.
  const both = mg.kind === 'asset' && /\b(supply and install|supply & install|with installation|including installation)\b/.test(txt);
  return { finPurchaseType: both ? 'service-asset' : ptForKind(mg.kind), materialGroup: mg.code, componentRole: hit?.role };
}

/** The GL account always follows the Material Group (not editable by the requester). */
export function glFor(materialGroup?: string): { glMain?: GlAccount; glSub?: GlAccount } {
  const mg = mgByCode(materialGroup);
  return { glMain: mg?.glMain, glSub: mg?.glSub };
}

export type CheckCode = 'pt-mg' | 'asset-mg-nonasset' | 'no-sub';
export interface AcctIssue { code: CheckCode; en: string; ar: string }
/** Accounting checks Finance cares about — computed live per line. */
export function accountingIssues(r: BOQRow): AcctIssue[] {
  const out: AcctIssue[] = [];
  if (!r.materialGroup || !r.finPurchaseType) return out; // not classified yet
  const mg = mgByCode(r.materialGroup);
  if (!mg) return out;
  const flag = assetFlagOf(r);
  if (mg.kind === 'asset' && flag === 'non-asset')
    out.push({ code: 'asset-mg-nonasset', en: `Asset Material Group on a non-asset line (${PURCHASE_TYPES[r.finPurchaseType].en})`, ar: `مجموعة مواد أصول على بند غير أصل (${PURCHASE_TYPES[r.finPurchaseType].ar})` });
  else if (mg.kind !== 'asset' && r.finPurchaseType !== 'service-asset' && ptForKind(mg.kind) !== r.finPurchaseType)
    out.push({ code: 'pt-mg', en: `Purchase Type (${PURCHASE_TYPES[r.finPurchaseType].en}) disagrees with Material Group (${mg.en})`, ar: `نوع الشراء (${PURCHASE_TYPES[r.finPurchaseType].ar}) لا يتوافق مع مجموعة المواد (${mg.ar})` });
  if (!glFor(r.materialGroup).glSub && !r.glSubOverride)
    out.push({ code: 'no-sub', en: 'GL sub-account missing for this Material Group', ar: 'الحساب الفرعي غير محدد لمجموعة المواد هذه' });
  return out;
}

/** Request-level accounting carried over from the budget stage (read-only). */
export function requestAccounting(f: Pick<TenderFormData, 'costCenterId' | 'projectId'>) {
  const cc = ALL_COST_CENTERS.find((c) => c.id === f.costCenterId);
  const proj = PROJECTS.find((p) => p.id === f.projectId);
  const n = (cc?.code ?? 'CC-0000').replace(/\D/g, '');
  return {
    costCenter: cc ? { code: cc.code, en: cc.name, ar: cc.nameAr } : undefined,
    commitmentItem: cc ? { code: `CI-${n}-${proj ? proj.code.slice(-3) : '000'}`, en: `${proj?.name ?? cc.name} — committed budget`, ar: `${proj?.nameAr ?? cc.nameAr} — الميزانية الملتزم بها` } : undefined,
  };
}

/** IT requests get the optional "Component role" column. */
export function isItRequest(f: Pick<TenderFormData, 'costCenterId' | 'projectId' | 'boqItems'>): boolean {
  if (['cc-2401', 'cc-3105', 'cc-2210'].includes(f.costCenterId)) return true;
  return f.boqItems.some((r) => ['MG-IT-HW', 'MG-IT-EUD', 'MG-IT-NET', 'MG-SW-LIC', 'MG-SW-SUB', 'MG-IT-IMP'].includes(r.materialGroup ?? ''));
}

export type RoutingOrder = 'assets-first' | 'parallel';
/** Finance routing derived from the asset flags on the BOQ. */
export function financeRouting(rows: BOQRow[], order: RoutingOrder) {
  const classified = rows.filter((r) => r.finPurchaseType);
  const assets = classified.filter((r) => assetFlagOf(r) === 'asset').length;
  const nonAssets = classified.length - assets;
  const kind: 'assets' | 'gl' | 'mixed' | 'none' = !classified.length ? 'none' : assets && nonAssets ? 'mixed' : assets ? 'assets' : 'gl';
  const steps = kind === 'assets' ? ['assets'] : kind === 'gl' ? ['gl'] : kind === 'mixed' ? (order === 'parallel' ? ['assets+gl'] : ['assets', 'gl']) : [];
  return { assets, nonAssets, unclassified: rows.length - classified.length, kind, steps };
}

/* ── Routing order setting (Finance / admin toggle, kept per browser) ───────── */
const ROUTE_KEY = 'mf:finance-routing-order';
export function getRoutingOrder(): RoutingOrder {
  try { return (localStorage.getItem(ROUTE_KEY) as RoutingOrder) || 'assets-first'; } catch { return 'assets-first'; }
}
export function setRoutingOrder(v: RoutingOrder) {
  try { localStorage.setItem(ROUTE_KEY, v); } catch { /* ignore */ }
  window.dispatchEvent(new Event(ROUTE_KEY));
}
export const ROUTE_EVENT = ROUTE_KEY;
