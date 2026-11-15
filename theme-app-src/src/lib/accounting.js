// AI classification of a BOQ line — purchase type and material group, read from
// the item name first, then the description. Ported from the design-review
// build (finance/accounting). The GL account follows the material group.

export const PURCHASE_TYPES = [
  { id: 'service', en: 'Service' },
  { id: 'asset', en: 'Asset' },
  { id: 'consumable', en: 'Consumable' },
  { id: 'service-asset', en: 'Service + Asset' },
];
export const ptypeName = (id) => PURCHASE_TYPES.find((p) => p.id === id)?.en || '';

export const MATERIAL_GROUPS = [
  { code: 'MG-IT-HW', en: 'IT Hardware', kind: 'asset', gl: '1230-01 Servers & Storage' },
  { code: 'MG-IT-EUD', en: 'End-user Devices', kind: 'asset', gl: '1230-02 Laptops & Desktops' },
  { code: 'MG-IT-NET', en: 'Network Equipment', kind: 'asset', gl: '1230-03 Network & Security Appliances' },
  { code: 'MG-SW-LIC', en: 'Software Licences', kind: 'asset', gl: '1260-01 Perpetual Software Licences' },
  { code: 'MG-SW-SUB', en: 'Software Subscriptions', kind: 'service', gl: '4250-02 Software Licences & Fees' },
  { code: 'MG-IT-IMP', en: 'IT Implementation', kind: 'service', gl: '4250-01 Implementation Services' },
  { code: 'MG-IT-CONS', en: 'IT Consulting', kind: 'service', gl: '4250-03 Advisory Fees' },
  { code: 'MG-IT-MNT', en: 'IT Maintenance & Support', kind: 'service', gl: '4260-01 Support & Maintenance Contracts' },
  { code: 'MG-IT-INST', en: 'Installation & Delivery', kind: 'service', gl: '1290 Assets Under Construction' },
  { code: 'MG-TEL', en: 'Telecom & Connectivity', kind: 'service', gl: '4270-01 Data Lines & Bandwidth' },
  { code: 'MG-TRN', en: 'Training', kind: 'service', gl: '4520-01 Technical Training' },
  { code: 'MG-OFF', en: 'Office Supplies', kind: 'consumable', gl: '4310-01 Stationery & Supplies' },
  { code: 'MG-IT-CNS', en: 'IT Consumables', kind: 'consumable', gl: '4310-02 IT Accessories & Toner' },
  { code: 'MG-FUR', en: 'Furniture', kind: 'asset', gl: '1240-01 Office Furniture' },
  { code: 'MG-FAC', en: 'Facility Services', kind: 'service', gl: '4410-01 Cleaning & Maintenance' },
  { code: 'MG-VEH', en: 'Vehicles', kind: 'asset', gl: '1250-01 Passenger Vehicles' },
];
export const mgOf = (code) => MATERIAL_GROUPS.find((m) => m.code === code);

// Goods first (a "laptop for consultants" is a laptop), then services. Plurals match too.
const RULES = [
  [/\b(install|installation|delivery|cabling|racking|rack and stack|mounting|shipping)\b/, 'MG-IT-INST'],
  [/\b(maintenance|support|warranty|amc|sla|managed services?|helpdesk)\b/, 'MG-IT-MNT'],
  [/\b(subscriptions?|saas|cloud|annual licen[cs]es?|yearly)\b/, 'MG-SW-SUB'],
  [/\b(licen[cs]es?|software|perpetual|edition)\b/, 'MG-SW-LIC'],
  [/\b(switch(es)?|routers?|firewalls?|access points?|wifi|load balancers?|network)\b/, 'MG-IT-NET'],
  [/\b(laptops?|desktops?|monitors?|tablets?|workstations?|printers?|scanners?|phones?)\b/, 'MG-IT-EUD'],
  [/\b(servers?|storage|san|nas|appliances?|hardware|blades?|ups|gpus?)\b/, 'MG-IT-HW'],
  [/\b(chairs?|desks?|tables?|furniture|cabinets?|sofas?|partitions?)\b/, 'MG-FUR'],
  [/\b(vehicles?|cars?|vans?|bus(es)?|trucks?)\b/, 'MG-VEH'],
  [/\b(toners?|cartridges?|cables?|mouse|mice|keyboards?|accessor(y|ies)|usb)\b/, 'MG-IT-CNS'],
  [/\b(paper|stationery|pens?|supplies|consumables?)\b/, 'MG-OFF'],
  [/\b(implementation|implement|integration|migration|configuration|deployment|development|customi[sz]ation|go-live)\b/, 'MG-IT-IMP'],
  [/\b(consult|consulting|consultancy|consultants?|advisory|assessments?|audits?|study|design|project management)\b/, 'MG-IT-CONS'],
  [/\b(training|workshops?|courses?|certifications?)\b/, 'MG-TRN'],
  [/\b(internet|bandwidth|telecom|connectivity|mpls|sim)\b/, 'MG-TEL'],
  [/\b(cleaning|security guards?|facility|facilities|landscap\w*|pest)\b/, 'MG-FAC'],
];

/** { ptype, mg } suggested from the name (first) and description, or null when there is too little to go on. */
export function suggestAccounting(name = '', desc = '') {
  const both = `${name} ${desc}`.toLowerCase();
  if (both.trim().length < 3) return null;
  const n = name.toLowerCase();
  const hit = RULES.find(([re]) => re.test(n)) || RULES.find(([re]) => re.test(both));
  const mg = mgOf(hit ? hit[1] : 'MG-IT-CONS');
  const bundled = mg.kind === 'asset' && /\b(supply and install|supply & install|with installation|including installation)\b/.test(both);
  return { ptype: bundled ? 'service-asset' : mg.kind, mg: mg.code };
}

/** Fill purchase type + material group on a BOQ row unless the requester set them. */
export function withAccounting(r) {
  if (r.acctSource === 'user') return r;
  const s = suggestAccounting(r.itemName, r.itemDescription);
  return s ? { ...r, ptype: s.ptype, mg: s.mg, acctSource: 'ai' } : r;
}
