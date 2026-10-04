// Procurement-route triage (v2).
//
// Two routes only — Etimad eSouq or Tendering. (The "product / mandatory
// catalogue" of listed Saudi companies is a choice INSIDE tendering, per item,
// not a separate route.) A single Etimad request is scoped to ONE BOQ type AND
// ONE route, so selected project items are grouped by (BOQ type × route): each
// group is its own request. DEMO rules stand in for live Etimad lookups.
import type { ProjectItemType, SourceType } from '../types/tender';

export type RouteKey = 'souq-etimad' | 'tendering';
export type BoqType = 'manpower' | 'services' | 'equipment' | 'material';

export interface ItemVerdict {
  id: string;
  name: string;
  nameAr: string;
  boqType: BoqType;
  route: RouteKey;
  reason: string;
  reasonAr: string;
  /** Set when the item came from the project's item list (not free-typed). */
  projectItemId?: string;
}

/** Item fed into the triage — a project item, or a free-typed/pasted one. */
export interface ClsItem {
  id: string;
  name: string;
  nameAr?: string;
  type?: ProjectItemType;
  projectItemId?: string;
}

export interface RequestGroup {
  key: string;              // route key — one request per route
  route: RouteKey;
  boqTypes: BoqType[];      // distinct BOQ types bundled in this request
  items: ItemVerdict[];
}

const MANPOWER = ['manpower', 'man power', 'staff', 'personnel', 'labor', 'labour', 'resourcing', 'secondment', 'عمالة', 'كوادر', 'موظف'];
const SERVICES = ['service', 'consult', 'implementation', 'integration', 'development', 'design', 'training', 'migration', 'assessment', 'hardening', 'maintenance', 'support', 'managed', 'operation', 'hosting', 'خدمة', 'خدمات', 'استشار', 'تنفيذ', 'تطوير', 'تدريب', 'صيانة', 'دعم'];
const EQUIPMENT = ['server', 'hardware', 'device', 'equipment', 'infrastructure', 'machine', 'appliance', 'laptop', 'desktop', 'printer', 'router', 'switch', 'storage', 'خادم', 'جهاز', 'معدات'];
const MATERIAL = ['license', 'licence', 'software', 'subscription', 'supply', 'supplies', 'material', 'consumable', 'toner', 'paper', 'part', 'component', 'ترخيص', 'اشتراك', 'مواد', 'قرطاسية'];
// Signals that an equipment/material item still needs a tender (bespoke, bundled with work, or high-complexity).
const TENDER_SIGNAL = ['implementation', 'integration', 'development', 'custom', 'bespoke', 'migration', 'assessment', 'hardening', 'consult', 'managed', 'maintenance', 'support', 'hosting', 'تنفيذ', 'تكامل', 'تطوير', 'صيانة', 'دعم'];

const has = (text: string, words: string[]) => {
  const t = text.toLowerCase();
  return words.some((w) => (/^[a-z]/.test(w) ? new RegExp(`(^|[^a-z])${w}`).test(t) : t.includes(w)));
};

function deriveBoqType(name: string, type?: ProjectItemType): BoqType {
  if (has(name, MANPOWER)) return 'manpower';
  if (has(name, SERVICES) || type === 'services') return 'services';
  if (has(name, MATERIAL)) return 'material';
  if (has(name, EQUIPMENT)) return 'equipment';
  return type === 'consumables' ? 'material' : type === 'assets' ? 'equipment' : 'equipment';
}

function deriveRoute(boqType: BoqType, name: string): RouteKey {
  if (boqType === 'services' || boqType === 'manpower') return 'tendering';
  return has(name, TENDER_SIGNAL) ? 'tendering' : 'souq-etimad';
}

export function classifyItem(item: ClsItem, override?: RouteKey | null): ItemVerdict {
  const boqType = deriveBoqType(item.name, item.type);
  const route = override ?? deriveRoute(boqType, item.name);
  const bt = BOQ_TYPE_META[boqType];
  return {
    id: item.id, name: item.name, nameAr: item.nameAr ?? item.name, projectItemId: item.projectItemId, boqType, route,
    reason: `${bt.en} · ${route === 'souq-etimad' ? 'standard catalogue item, buy on eSouq' : 'requires a competitive tender'}`,
    reasonAr: `${bt.ar} · ${route === 'souq-etimad' ? 'بند كتالوجي، يُشترى من السوق الإلكتروني' : 'يتطلب منافسة'}`,
  };
}

/** Parse pasted / typed text into item names. One per line; a trailing "x3",
 *  "- 3", "(3)" or "qty 3" is dropped (quantities are captured later in the BOQ). */
export function parseItemNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((raw) => raw.replace(/^\s*(?:[-*••]|\d+[.)])\s*/, '').trim())
    .map((line) => line.replace(/\s*(?:\bx|×|\bqty\.?|\bquantity|[-,])\s*\d{1,6}\s*$/i, '').replace(/\s*\(\d{1,6}\)\s*$/, '').trim())
    .filter((l) => l.length > 0);
}

export const EXAMPLE_TEXT = [
  '20 contractor engineers (manpower)',
  'Office cleaning services',
  'Adobe Creative Cloud licenses - 15',
  'Network switches x4',
].join('\n');

export function groupItems(verdicts: ItemVerdict[]): RequestGroup[] {
  // One request per ROUTE — an Etimad eSouq request and/or a Competitive Tender
  // request. BOQ types are bundled within each route, not split into their own card.
  const map = new Map<RouteKey, RequestGroup>();
  for (const v of verdicts) {
    if (!map.has(v.route)) map.set(v.route, { key: v.route, route: v.route, boqTypes: [], items: [] });
    const g = map.get(v.route)!;
    g.items.push(v);
    if (!g.boqTypes.includes(v.boqType)) g.boqTypes.push(v.boqType);
  }
  // Tendering first, then eSouq.
  return [...map.values()].sort((a, b) => (a.route === b.route ? 0 : a.route === 'tendering' ? -1 : 1));
}

export function forcedRoute(): RouteKey | null {
  try {
    const v = new URLSearchParams(window.location.search).get('route');
    if (v === 'esouq' || v === 'souq') return 'souq-etimad';
    if (v === 'tender' || v === 'tendering') return 'tendering';
  } catch { /* ignore */ }
  return null;
}

export const ROUTE_META: Record<RouteKey, { en: string; ar: string; shortEn: string; shortAr: string; badge: 'success' | 'warning'; sourceType: SourceType }> = {
  'souq-etimad': { en: 'Etimad eSouq', ar: 'السوق الإلكتروني', shortEn: 'eSouq', shortAr: 'السوق', badge: 'success', sourceType: 'souq-etimad' },
  'tendering':   { en: 'Competitive Tender', ar: 'منافسة', shortEn: 'Tender', shortAr: 'منافسة', badge: 'warning', sourceType: 'tendering' },
};

export const BOQ_TYPE_META: Record<BoqType, { en: string; ar: string; badge: 'assets' | 'services' | 'consumables' | 'info' }> = {
  manpower:  { en: 'Manpower', ar: 'قوى عاملة', badge: 'info' },
  services:  { en: 'Services', ar: 'خدمات', badge: 'services' },
  equipment: { en: 'Equipment', ar: 'معدات', badge: 'assets' },
  material:  { en: 'Material', ar: 'مواد', badge: 'consumables' },
};
