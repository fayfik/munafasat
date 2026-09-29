// "Check Etimad availability" for BOQ items.
//
// TODAY: Claude estimates whether each item is the kind of standard,
// catalog-listed good or service normally bought through Etimad Souq
// (the e-marketplace) rather than a competitive tender. Results are
// marked source: 'estimate' and the UI says so.
//
// LATER: replace `checkWithEstimate` with a call to the real Etimad
// integration (keep the same return shape and set source: 'etimad').
// Nothing else in the app needs to change.
import { askJson } from './claudeRuntime';
import { PROJECTS } from '../data/mockData';
import type { BOQRow, EtimadAvailability, EtimadCheck, TenderFormData } from '../types/tender';

export function etimadItemKey(r: BOQRow): string {
  return [r.itemName.trim(), r.itemDescription.trim(), r.unitOfMeasure, r.quantity, r.unitPrice].join('|');
}

export function isStale(r: BOQRow): boolean {
  return !!r.etimadCheck && r.etimadCheck.itemKey !== etimadItemKey(r);
}

/** Needs the user's attention: available in Etimad, kept in the tender, no justification. */
export function needsJustification(r: BOQRow): boolean {
  return r.etimadCheck?.status === 'available' && !isStale(r) && !!r.etimadKeep && !(r.etimadJustification ?? '').trim();
}

type RawResult = { id: string; status: string; comment: string };

async function checkWithEstimate(rows: BOQRow[], form: TenderFormData, isAr: boolean): Promise<Record<string, EtimadCheck> | null> {
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const items = rows.map((r) => {
    const q = Number(r.quantity) || 0;
    const u = Number(r.unitPrice) || 0;
    return {
      id: r.id,
      category: r.projectItem,
      name: r.itemName,
      description: r.itemDescription,
      quantity: q,
      unit: r.unitOfMeasure,
      unitPriceSAR: u,
      totalSAR: q * u,
    };
  });
  const prompt = `You are assisting a procurement officer at a Saudi government entity. Etimad Souq is the Saudi government e-marketplace on the Etimad platform, where standard, catalogued goods and simple services (office supplies, IT hardware and peripherals, standard software licenses and subscriptions, furniture, consumables, and similar off-the-shelf items with fixed specifications and list prices) are bought directly from registered suppliers instead of through a competitive tender. Custom, bespoke or high-complexity work (system implementation, integration, consulting, custom development, managed services with bespoke SLAs, construction) generally needs a tender.

You cannot see the live Etimad catalog. Give your best ESTIMATE, for each item below, of whether it is likely to be available to buy through Etimad Souq.
${p ? `Project: ${p.name}. ${p.purpose}` : ''}

Items:
${JSON.stringify(items)}

Reply with only a JSON array, one object per item, in the same order:
{"id": string (copy the item id), "status": "available" | "not-available" | "uncertain", "comment": string}
- "available": standard catalog-type item likely listed on Etimad Souq. In the comment say why, and name the kind of Etimad Souq category it would fall under.
- "not-available": needs a tender (custom scope, bespoke service, complex integration, or very high-value tailored work). Say why in one sentence.
- "uncertain": could go either way; say what the officer should confirm on Etimad.
Consider the quantity and value: a very large volume or value may still warrant a tender even for a standard item; mention it if so.
Keep each comment to 1-2 sentences. ${isAr ? 'Write the comments in formal Modern Standard Arabic.' : 'Write the comments in clear professional English.'}`;

  const res = await askJson<RawResult[]>(prompt);
  if (res === null) return null;
  const out: Record<string, EtimadCheck> = {};
  const now = new Date().toISOString();
  const list = Array.isArray(res) ? res : [];
  rows.forEach((r, i) => {
    const hit = list.find((x) => x && String(x.id) === r.id) ?? list[i];
    if (!hit) return;
    const st = String(hit.status) as EtimadAvailability;
    out[r.id] = {
      status: st === 'available' || st === 'not-available' ? st : 'uncertain',
      comment: String(hit.comment ?? '').trim(),
      checkedAt: now,
      source: 'estimate',
      itemKey: etimadItemKey(r),
    };
  });
  return out;
}

// ── Demo mode ────────────────────────────────────────────────────────────
// Keyword rules standing in for the Etimad catalog, so the flow can be shown
// without spending AI usage. Switch DEMO_MODE off to use the Claude estimate,
// or replace checkEtimadAvailability with the real Etimad integration.
export const DEMO_MODE = true;

const CATALOG_WORDS = [
  'licence', 'license', 'subscription', 'laptop', 'desktop', 'computer', 'printer', 'monitor', 'toner',
  'paper', 'stationery', 'furniture', 'chair', 'desk', 'ssl', 'certificate', 'domain', 'hardware',
  'server', 'storage', 'switch', 'router', 'cable', 'consumable', 'supplies', 'accessor', 'headset',
  'ترخيص', 'تراخيص', 'اشتراك', 'حاسب', 'طابعة', 'شاشة', 'أثاث', 'قرطاسية', 'شهادة', 'خادم', 'خوادم',
];
const TENDER_WORDS = [
  'implementation', 'consult', 'integration', 'migration', 'development', 'design', 'project management',
  'managed', 'customi', 'configuration', 'architect', 'go-live', 'hypercare', 'assessment', 'hardening',
  'تنفيذ', 'استشار', 'تكامل', 'ترحيل', 'تطوير', 'تصميم', 'إدارة المشروع', 'تهيئة', 'تقييم',
];

function demoVerdict(r: BOQRow, isAr: boolean): { status: EtimadAvailability; comment: string } {
  const text = `${r.projectItem} ${r.itemName} ${r.itemDescription}`.toLowerCase();
  const total = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
  // Latin keywords match at a word start ("desk" must not match "helpdesk"); Arabic ones anywhere.
  const hit = (words: string[]) => words.find((w) =>
    /^[a-z]/.test(w) ? new RegExp(`(^|[^a-z])${w.replace(/[-]/g, '\\-')}`).test(text) : text.includes(w));
  const tender = hit(TENDER_WORDS);
  const catalog = hit(CATALOG_WORDS);
  const big = total >= 1_000_000;
  const sar = `SAR ${Math.round(total).toLocaleString('en-US')}`;

  if (tender) {
    return { status: 'not-available', comment: isAr
      ? `خدمة مخصصة ("${tender}") بنطاق خاص بالمشروع، ولا تُدرج عادة في سوق اعتماد، لذا تتطلب منافسة.`
      : `A tailored service ("${tender}") with project-specific scope. These are not normally listed on Etimad Souq and need a competitive tender.` };
  }
  if (catalog) {
    return { status: 'available', comment: isAr
      ? `بند قياسي ("${catalog}") تتوفر أمثاله عادة لدى موردين مسجلين في سوق اعتماد.${big ? ` القيمة كبيرة (${sar})، فقد تبرر منافسة للحصول على سعر أفضل.` : ''}`
      : `A standard catalog-type item ("${catalog}") that registered suppliers usually list on Etimad Souq.${big ? ` The value is large (${sar}), which may justify a tender to get a better price.` : ''}` };
  }
  return { status: 'uncertain', comment: isAr
    ? 'لا يطابق البند فئة معروفة في سوق اعتماد. ابحث عنه في اعتماد أو تحقق من وجود اتفاقية إطارية تغطيه.'
    : 'This item does not match a known Etimad Souq category. Search for it on Etimad, or check whether a framework agreement covers it.' };
}

async function checkWithDemoRules(rows: BOQRow[], isAr: boolean): Promise<Record<string, EtimadCheck>> {
  await new Promise((res) => setTimeout(res, 700 + Math.min(rows.length, 8) * 120));
  const now = new Date().toISOString();
  const out: Record<string, EtimadCheck> = {};
  rows.forEach((r) => {
    const v = demoVerdict(r, isAr);
    out[r.id] = { ...v, checkedAt: now, source: 'demo', itemKey: etimadItemKey(r) };
  });
  return out;
}

/** Check one or more rows. Resolves null only when the AI estimate is in use and AI is unavailable. */
export function checkEtimadAvailability(rows: BOQRow[], form: TenderFormData, isAr: boolean) {
  return DEMO_MODE ? checkWithDemoRules(rows, isAr) : checkWithEstimate(rows, form, isAr);
}
