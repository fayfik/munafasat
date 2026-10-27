// Prototype stand-in for the Etimad E-Market catalogue that Procurement searches.
// When Procurement replies to a "Help me decide" request, each eMarket item comes
// back with ONE matched listing (product name, SKU, supplier, price). In a real
// deployment Procurement picks these on Etimad; here sample listings are chosen by
// keyword so the flow can be shown. Nothing here is live Etimad data.

export interface EtimadMatch {
  productName: string;
  productNameAr: string;
  sku: string;
  supplier: string;
  supplierAr: string;
  unitPrice: number;   // SAR, excl. VAT, as listed on the day it was checked
  unit: string;
  checkedAt: string;   // ISO
}

type Entry = { kw: string[]; name: string; nameAr: string; sku: string; supplier: string; supplierAr: string; price: number; unit: string };

const CATALOGUE: Entry[] = [
  { kw: ['laptop', 'notebook', 'محمول'], name: 'Dell Latitude 5450 14" — Core Ultra 5, 16 GB RAM, 512 GB SSD', nameAr: 'ديل لاتيتيود 5450 مقاس 14 — 16 جيجابايت، 512 جيجابايت', sku: 'ETM-IT-LAP-5450-16', supplier: 'Jarir Marketing Co.', supplierAr: 'شركة جرير للتسويق', price: 4650, unit: 'Each' },
  { kw: ['desktop', 'pc ', 'workstation'], name: 'HP Pro Tower 400 G9 — Core i5, 16 GB RAM, 512 GB SSD', nameAr: 'إتش بي برو تاور 400 — 16 جيجابايت', sku: 'ETM-IT-DSK-400G9', supplier: 'Jarir Marketing Co.', supplierAr: 'شركة جرير للتسويق', price: 3480, unit: 'Each' },
  { kw: ['monitor', 'screen', 'display', 'شاشة'], name: 'Dell P2425H 24" IPS monitor', nameAr: 'شاشة ديل P2425H مقاس 24', sku: 'ETM-IT-MON-P2425H', supplier: 'Extra (United Electronics Co.)', supplierAr: 'إكسترا (الشركة المتحدة للإلكترونيات)', price: 890, unit: 'Each' },
  { kw: ['printer', 'طابعة'], name: 'HP LaserJet Pro MFP 4103fdw', nameAr: 'طابعة إتش بي ليزرجت برو 4103', sku: 'ETM-IT-PRN-4103', supplier: 'Saudi Business Machines (SBM)', supplierAr: 'الآلات السعودية للأعمال', price: 2150, unit: 'Each' },
  { kw: ['toner', 'cartridge', 'حبر'], name: 'HP 151A black toner cartridge', nameAr: 'خرطوشة حبر إتش بي 151A سوداء', sku: 'ETM-CON-TNR-151A', supplier: 'Saudi Business Machines (SBM)', supplierAr: 'الآلات السعودية للأعمال', price: 420, unit: 'Each' },
  { kw: ['paper', 'a4', 'ورق'], name: 'Double A A4 copy paper, 80 gsm (box of 5 reams)', nameAr: 'ورق تصوير دبل إيه A4 — 80 جرام (كرتون 5 رزم)', sku: 'ETM-CON-PAP-A480', supplier: 'Al-Mutlaq Stationery', supplierAr: 'المطلق للقرطاسية', price: 95, unit: 'Box' },
  { kw: ['stationery', 'pen', 'قرطاسية'], name: 'Office stationery starter kit (per desk)', nameAr: 'حقيبة قرطاسية مكتبية (لكل مكتب)', sku: 'ETM-CON-STN-KIT', supplier: 'Al-Mutlaq Stationery', supplierAr: 'المطلق للقرطاسية', price: 160, unit: 'Kit' },
  { kw: ['chair', 'كرسي'], name: 'Ergonomic task chair — mesh back, adjustable arms', nameAr: 'كرسي مكتبي مريح — ظهر شبكي', sku: 'ETM-FUR-CHR-ERG', supplier: 'Al-Abdulkarim Furniture', supplierAr: 'أثاث العبدالكريم', price: 1180, unit: 'Each' },
  { kw: ['desk', 'table', 'مكتب'], name: 'Office desk 160×80 cm with cable tray', nameAr: 'مكتب 160×80 سم مع مجرى كابلات', sku: 'ETM-FUR-DSK-1680', supplier: 'Al-Abdulkarim Furniture', supplierAr: 'أثاث العبدالكريم', price: 1450, unit: 'Each' },
  { kw: ['furniture', 'أثاث'], name: 'Open-office furniture set (desk, chair, pedestal)', nameAr: 'طقم أثاث مكتبي (مكتب، كرسي، خزانة)', sku: 'ETM-FUR-SET-OPN', supplier: 'Al-Abdulkarim Furniture', supplierAr: 'أثاث العبدالكريم', price: 3200, unit: 'Set' },
  { kw: ['switch', 'محول'], name: 'Cisco Catalyst 9200L 48-port PoE+ switch', nameAr: 'محول سيسكو كاتاليست 9200L بـ 48 منفذاً', sku: 'ETM-NET-SW-C9200L48', supplier: 'Saudi Business Machines (SBM)', supplierAr: 'الآلات السعودية للأعمال', price: 21400, unit: 'Each' },
  { kw: ['router', 'firewall', 'جدار'], name: 'Fortinet FortiGate 100F firewall', nameAr: 'جدار حماية فورتينت 100F', sku: 'ETM-NET-FW-100F', supplier: 'Saudi Business Machines (SBM)', supplierAr: 'الآلات السعودية للأعمال', price: 18900, unit: 'Each' },
  { kw: ['server', 'خادم', 'خوادم'], name: 'Dell PowerEdge R660 rack server — 2× Xeon Silver, 128 GB', nameAr: 'خادم ديل باور إيدج R660', sku: 'ETM-IT-SRV-R660', supplier: 'Saudi Business Machines (SBM)', supplierAr: 'الآلات السعودية للأعمال', price: 48500, unit: 'Each' },
  { kw: ['headset', 'سماعة'], name: 'Jabra Evolve2 50 headset', nameAr: 'سماعة جابرا إيفولف 2 50', sku: 'ETM-IT-HDS-EV250', supplier: 'Extra (United Electronics Co.)', supplierAr: 'إكسترا (الشركة المتحدة للإلكترونيات)', price: 760, unit: 'Each' },
  { kw: ['microsoft', 'office 365', 'm365'], name: 'Microsoft 365 E3 — annual subscription per user', nameAr: 'مايكروسوفت 365 E3 — اشتراك سنوي لكل مستخدم', sku: 'ETM-SW-M365-E3', supplier: 'Saudi Business Machines (SBM)', supplierAr: 'الآلات السعودية للأعمال', price: 1650, unit: 'User / year' },
  { kw: ['licence', 'license', 'subscription', 'ترخيص', 'تراخيص', 'اشتراك'], name: 'Standard software licence — annual subscription', nameAr: 'ترخيص برنامج قياسي — اشتراك سنوي', sku: 'ETM-SW-LIC-STD', supplier: 'Saudi Business Machines (SBM)', supplierAr: 'الآلات السعودية للأعمال', price: 1200, unit: 'User / year' },
  { kw: ['ssl', 'certificate', 'domain', 'شهادة'], name: 'DigiCert OV SSL certificate — 1 year', nameAr: 'شهادة SSL من DigiCert — سنة واحدة', sku: 'ETM-SW-SSL-OV1', supplier: 'Elm Company', supplierAr: 'شركة علم', price: 1450, unit: 'Each' },
  { kw: ['cable', 'كابل'], name: 'Cat6 patch cable, 3 m (pack of 10)', nameAr: 'كابل شبكة Cat6 طول 3 م (10 قطع)', sku: 'ETM-NET-CBL-C6-3', supplier: 'Extra (United Electronics Co.)', supplierAr: 'إكسترا (الشركة المتحدة للإلكترونيات)', price: 140, unit: 'Pack' },
];

function hash(s: string) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

/** The single listing Procurement sends back for an item they found on Etimad E-Market. */
export function etimadMatchFor(name: string, given?: { unitPrice?: number | '' }): EtimadMatch {
  const text = ` ${name.toLowerCase()} `;
  const e = CATALOGUE.find((x) => x.kw.some((k) => (/^[a-z]/.test(k) ? new RegExp(`(^|[^a-z])${k}`).test(text) : text.includes(k))));
  const checkedAt = new Date().toISOString();
  if (e) return { productName: e.name, productNameAr: e.nameAr, sku: e.sku, supplier: e.supplier, supplierAr: e.supplierAr, unitPrice: e.price, unit: e.unit, checkedAt };
  const clean = name.replace(/^\s*\d+\s*[x×]?\s*/i, '').trim() || name;
  return {
    productName: `${clean} — standard catalogue listing`, productNameAr: `${clean} — منتج قياسي في الكتالوج`,
    sku: `ETM-GEN-${(hash(clean) % 90000 + 10000)}`, supplier: 'Al-Mutlaq Trading Est.', supplierAr: 'مؤسسة المطلق التجارية',
    unitPrice: typeof given?.unitPrice === 'number' && given.unitPrice > 0 ? given.unitPrice : 1000, unit: 'Each', checkedAt,
  };
}

/** Quantity typed in "20 laptops" style text, if any. */
export function qtyFromText(name: string): number | '' {
  const m = name.match(/^\s*(\d+)\s*[x×]?\s/i) ?? name.match(/[x×]\s*(\d+)\b/i) ?? name.match(/\b(\d+)\s*(?:pcs|units|nos)\b/i);
  return m ? Number(m[1]) : '';
}
