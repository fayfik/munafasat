// Procurement-route triage: parse a free-text / pasted need into items, then
// classify each item down the mandated waterfall — Etimad eSouq → Mandatory
// Catalogue → Competitive Tender — and aggregate to one route for the request.
//
// DEMO: classification uses keyword rules (no AI credits). Swap classifyItem
// for the real Etimad catalogue lookups later; the shapes below stay the same.
import type { SourceType } from '../types/tender';

export type RouteKey = 'souq-etimad' | 'mandatory-catalogue' | 'tendering';

export interface ParsedItem {
  id: string;
  name: string;
  quantity: number | '';
}

export interface ItemVerdict extends ParsedItem {
  route: RouteKey;
  reason: string;
  reasonAr: string;
}

export interface TriageResult {
  route: RouteKey;          // the request-level route (most-restrictive wins)
  items: ItemVerdict[];
  forced: boolean;          // route came from the ?route= demo override
}

// ── keyword rules (stand-ins for live Etimad lookups) ──────────────────────
const ESOUQ = [
  'laptop', 'desktop', 'computer', 'printer', 'monitor', 'toner', 'ink', 'paper', 'stationery',
  'license', 'licence', 'subscription', 'software', 'keyboard', 'mouse', 'headset', 'webcam',
  'cable', 'ups', 'scanner', 'hard disk', 'ssd', 'ram', 'switch', 'router', 'projector',
  'ترخيص', 'اشتراك', 'حاسب', 'طابعة', 'شاشة', 'قرطاسية', 'برنامج', 'كابل', 'ماسح',
];
const MANDATORY = [
  'vehicle', 'car', 'truck', 'bus', 'ambulance', 'tyre', 'tire', 'uniform', 'furniture', 'chair',
  'desk', 'water', 'dates', 'catering', 'cleaning', 'generator', 'medical supply', 'medicine',
  'fuel', 'office supply',
  'مركبة', 'سيارة', 'إطار', 'زي', 'أثاث', 'كرسي', 'مكتب', 'مياه', 'تمور', 'إعاشة', 'نظافة', 'وقود',
];
const TENDER = [
  'implementation', 'consult', 'integration', 'migration', 'development', 'design', 'construction',
  'managed service', 'maintenance contract', 'hypercare', 'customiz', 'customis', 'architecture',
  'assessment', 'advisory', 'training program', 'operation', 'build',
  'تنفيذ', 'استشار', 'تكامل', 'تطوير', 'إنشاء', 'صيانة', 'تشغيل', 'تصميم',
];

function hit(text: string, words: string[]): string | null {
  const t = text.toLowerCase();
  for (const w of words) {
    if (/^[a-z]/.test(w)) { if (new RegExp(`(^|[^a-z])${w}`).test(t)) return w; }
    else if (t.includes(w)) return w;
  }
  return null;
}

function classifyItem(name: string): { route: RouteKey; key: string } {
  // Waterfall order matters: a tender signal (bespoke work) overrides a
  // commodity keyword, then eSouq, then mandatory, else tender by default.
  const tender = hit(name, TENDER);
  if (tender) return { route: 'tendering', key: tender };
  const esouq = hit(name, ESOUQ);
  if (esouq) return { route: 'souq-etimad', key: esouq };
  const mand = hit(name, MANDATORY);
  if (mand) return { route: 'mandatory-catalogue', key: mand };
  return { route: 'tendering', key: '' };
}

function reasonFor(route: RouteKey, key: string): { en: string; ar: string } {
  switch (route) {
    case 'souq-etimad':
      return {
        en: `Standard catalogue item${key ? ` ("${key}")` : ''} — available to buy directly on Etimad eSouq.`,
        ar: `بند قياسي${key ? ` ("${key}")` : ''} — متاح للشراء مباشرة من السوق الإلكتروني في اعتماد.`,
      };
    case 'mandatory-catalogue':
      return {
        en: `Listed on the Etimad Mandatory Catalogue${key ? ` ("${key}")` : ''} — must be sourced through it.`,
        ar: `مدرج في كتالوج اعتماد الإلزامي${key ? ` ("${key}")` : ''} — يجب شراؤه من خلاله.`,
      };
    default:
      return {
        en: key
          ? `Bespoke scope ("${key}") — not a catalogue item, so a competitive tender is required.`
          : `No match in eSouq or the Mandatory Catalogue — a competitive tender is required.`,
        ar: key
          ? `نطاق مخصص ("${key}") — ليس بنداً كتالوجياً، لذا تلزم منافسة.`
          : `لا يوجد تطابق في السوق الإلكتروني أو الكتالوج الإلزامي — تلزم منافسة.`,
      };
  }
}

const SEVERITY: Record<RouteKey, number> = { 'souq-etimad': 0, 'mandatory-catalogue': 1, 'tendering': 2 };

/** Parse pasted / typed text into items. One item per line; trailing "x3",
 *  "× 3", "- 3", "(3)" or "qty 3" is read as the quantity. */
export function parseItems(text: string): ParsedItem[] {
  return text
    .split(/\r?\n/)
    .map((raw) => raw.replace(/^\s*(?:[-*••]|\d+[.)])\s*/, '').trim()) // strip bullets / "1." "2)"
    .filter((l) => l.length > 0)
    .map((line) => {
      let name = line;
      let quantity: number | '' = '';
      const m = line.match(/(?:\bx|×|\bqty\.?|\bquantity|[-,])\s*(\d{1,6})\s*$/i) || line.match(/\((\d{1,6})\)\s*$/);
      if (m) { quantity = parseInt(m[1], 10); name = line.slice(0, m.index).trim().replace(/[-,:]\s*$/, '').trim(); }
      return { id: crypto.randomUUID(), name, quantity };
    })
    .filter((it) => it.name.length > 0);
}

function forcedRoute(): RouteKey | null {
  try {
    const v = new URLSearchParams(window.location.search).get('route');
    if (v === 'esouq' || v === 'souq') return 'souq-etimad';
    if (v === 'mandatory' || v === 'mand') return 'mandatory-catalogue';
    if (v === 'tender' || v === 'tendering') return 'tendering';
  } catch { /* ignore */ }
  return null;
}

/** Classify every item, then pick the request route. Mixed baskets take the
 *  most-restrictive route (tender > mandatory > eSouq) so nothing that needs a
 *  tender is bought off-catalogue. A ?route= override forces the outcome for demos. */
export function triage(items: ParsedItem[], override?: RouteKey | null): TriageResult {
  const forced = override ?? forcedRoute();
  const verdicts: ItemVerdict[] = items.map((it) => {
    const base = forced ? { route: forced, key: '' } : classifyItem(it.name);
    const r = reasonFor(base.route, base.key);
    return { ...it, route: base.route, reason: r.en, reasonAr: r.ar };
  });
  let route: RouteKey = 'souq-etimad';
  if (forced) route = forced;
  else for (const v of verdicts) if (SEVERITY[v.route] > SEVERITY[route]) route = v.route;
  return { route, items: verdicts, forced: !!forced };
}

export const ROUTE_META: Record<RouteKey, {
  en: string; ar: string; shortEn: string; shortAr: string;
  badge: 'success' | 'info' | 'warning'; sourceType: SourceType;
}> = {
  'souq-etimad':        { en: 'Etimad eSouq', ar: 'السوق الإلكتروني', shortEn: 'eSouq', shortAr: 'السوق', badge: 'success', sourceType: 'souq-etimad' },
  'mandatory-catalogue':{ en: 'Mandatory Catalogue', ar: 'الكتالوج الإلزامي', shortEn: 'Mandatory', shortAr: 'إلزامي', badge: 'info', sourceType: 'mandatory-catalogue' },
  'tendering':          { en: 'Competitive Tender', ar: 'منافسة', shortEn: 'Tender', shortAr: 'منافسة', badge: 'warning', sourceType: 'tendering' },
};

export const EXAMPLE_TEXT = [
  '10x Dell Latitude laptops',
  'Microsoft 365 E3 licenses - 50',
  'HP LaserJet printer x2',
  'A4 printing paper (200)',
].join('\n');
