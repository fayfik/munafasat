// Sample content behind the AI touchpoints. The prototype has no live model:
// "similar requests", imports and summaries come from this file.
import { AI_SCOPE, AI_TERMS, AI_LOCATION, AI_PAYMENTS, AI_TECH_REQ, AI_EVAL, AI_TECH_DOCS, AI_EM_BOQ, AI_QUAL } from './newRequest.js';

/** Past requests in the same project — offered on Project setup. */
export const SIMILAR_REQUESTS = [
  { code: 'REQ-2024-047', title: 'Citizen Services Mobile App', created: '2 Oct 2024', projects: ['proj-001', 'proj-003'], route: 'tendering', value: 'SAR 1.3M', by: 'Fatima Al-Zahrani' },
  { code: 'REQ-2024-033', title: 'Portal Hosting & Managed Services', created: '9 Jul 2024', projects: ['proj-001', 'proj-003'], route: 'tendering', value: 'SAR 720K', by: 'Ahmed Al-Rashidi' },
  { code: 'REQ-2024-041', title: 'Data Center Network Refresh', created: '14 Aug 2024', projects: ['proj-002'], route: 'tendering', value: 'SAR 1.5M', by: 'Mohammed Al-Otaibi' },
  { code: 'REQ-2024-038', title: 'Backup & Disaster Recovery Service', created: '21 Jul 2024', projects: ['proj-002'], route: 'tendering', value: 'SAR 940K', by: 'Noura Al-Dossari' },
  { code: 'REQ-2024-049', title: 'Accounts Payable Automation', created: '16 Oct 2024', projects: ['proj-101'], route: 'tendering', value: 'SAR 640K', by: 'Sara Al-Ghamdi' },
  { code: 'REQ-2024-036', title: 'Treasury Management System', created: '30 Jul 2024', projects: ['proj-101'], route: 'tendering', value: 'SAR 880K', by: 'Khalid Al-Shehri' },
  { code: 'REQ-2024-051', title: 'Executive Office Renovation', created: '28 Oct 2024', projects: ['proj-401'], route: 'tendering', value: 'SAR 1.2M', by: 'Reem Al-Mutairi' },
  { code: 'REQ-2024-042', title: 'Headquarters Deep Cleaning Services', created: '11 Oct 2024', projects: ['proj-401'], route: 'tendering', value: 'SAR 310K', by: 'Reem Al-Mutairi' },
  { code: 'PR-2024-126', title: 'Ergonomic seating for the onboarding floor', created: '3 Nov 2024', projects: ['proj-401'], route: 'emarket', value: 'SAR 86K', by: 'Reem Al-Mutairi' },
  { code: 'PR-2024-118', title: 'Laptops for the new finance analysts', created: '19 Oct 2024', projects: ['proj-101', 'proj-001'], route: 'emarket', value: 'SAR 93K', by: 'Sara Al-Ghamdi' },
  { code: 'PR-2024-097', title: 'Adobe Creative Cloud renewal', created: '2 Sep 2024', projects: ['proj-003', 'proj-002'], route: 'emarket', value: 'SAR 46K', by: 'Ahmed Al-Rashidi' },
];
export const similarFor = (projectId, route) => SIMILAR_REQUESTS.filter((r) => r.projects.includes(projectId) && r.route === route);
export const allPast = (route) => SIMILAR_REQUESTS.filter((r) => r.route === route);

export const IMPORT_SECTIONS = ['Scope of work', 'Bill of quantities', 'Payment schedule', 'Technical evaluation'];

/** What importing a past request fills in. Tender: scope, BOQ, payments, tech. E-Market: purpose + catalogue items. */
export function importPayload(req, f, project, em) {
  if (em) {
    return {
      purpose: `${project?.purpose || 'Purchase the listed catalogue items.'} Same catalogue items and supplier as ${req.code} (${req.title}), adjusted to this request's quantities.`,
      boqItems: AI_EM_BOQ.map((r) => ({ ...r })),
    };
  }
  const items = project ? project.items.filter((i) => (f.selectedItemIds || []).includes(i.id)) : [];
  return {
    scopeOfWork: AI_SCOPE,
    scopeTerms: f.scopeTerms || AI_TERMS,
    executionLocation: f.executionLocation || AI_LOCATION,
    contractDuration: f.contractDuration || '18',
    contractDurationType: f.contractDurationType || 'months',
    boqItems: items.map((b) => ({
      projectItem: b.name, itemName: b.name,
      itemDescription: `${b.name} — scope and quantities carried over from ${req.code}; check them against this project before you submit`,
      unitOfMeasure: b.type === 'services' ? 'Service' : 'Each', quantity: 1, unitPrice: b.type === 'services' ? 250000 : 120000,
    })),
    paymentStages: AI_PAYMENTS.map((r) => ({ ...r })),
    technicalRequirements: AI_TECH_REQ.slice(0, 5).map((r) => ({ ...r })),
    evaluationCriteria: AI_EVAL.map((r) => ({ ...r })),
  };
}

/** Organisation-wide library for "Import from similar projects" on later steps. */
export const LIBRARY = [
  { id: 'lib-erp', name: 'Enterprise ERP Implementation', code: 'PRJ-2024-118', requestNo: 'REQ-2024-0412', entity: 'Finance & IT', by: 'Fatima Al-Zahrani', year: 2024 },
  { id: 'lib-cloud', name: 'Cloud Infrastructure Migration', code: 'PRJ-2024-074', requestNo: 'REQ-2024-0288', entity: 'IT Infrastructure', by: 'Sara Al-Qahtani', year: 2024 },
  { id: 'lib-cyber', name: 'Cybersecurity Enhancement Program', code: 'PRJ-2024-051', requestNo: 'REQ-2024-0195', entity: 'Cybersecurity Office', by: 'Omar Al-Shehri', year: 2024 },
  { id: 'lib-dc', name: 'Data Center Modernization', code: 'PRJ-2023-162', requestNo: 'REQ-2023-0604', entity: 'IT Infrastructure', by: 'Ahmed Al-Rashidi', year: 2023 },
];

const CYBER_REQ = [
  { requirement: 'Penetration testing before go-live', description: 'Independent penetration test before go-live and yearly; critical findings fixed within 30 days.' },
  { requirement: 'NCA ECC compliance', description: 'All components comply with NCA Essential Cybersecurity Controls (ECC-1:2018), evidenced by a compliance report.' },
  { requirement: 'Security event logging', description: 'All administrative and access events are logged and forwarded to the organisation SIEM for 12 months.' },
];
const DC_PAY = [
  { stageName: 'Mobilisation & site survey', itemsDeliverables: 'Site survey report, detailed design, delivery plan', percentage: 10 },
  { stageName: 'Hardware delivery', itemsDeliverables: 'Delivered equipment, serial-number register, delivery notes', percentage: 40 },
  { stageName: 'Installation & cut-over', itemsDeliverables: 'Installed and configured equipment, cut-over report', percentage: 30 },
  { stageName: 'Final acceptance', itemsDeliverables: 'Acceptance certificate, as-built documents, training records', percentage: 20 },
];

/** Section rows a library project offers. kind: payment · requirements · criteria · documents · qualification */
export function libraryRows(libId, kind) {
  const cyber = libId === 'lib-cyber';
  const dc = libId === 'lib-dc';
  switch (kind) {
    case 'payment': return (dc ? DC_PAY : AI_PAYMENTS).map((r) => ({ ...r }));
    case 'requirements': return (cyber ? CYBER_REQ : dc ? [...CYBER_REQ.slice(0, 1), ...AI_TECH_REQ.slice(1, 3)] : AI_TECH_REQ.slice(0, 5)).map((r) => ({ ...r }));
    case 'criteria': return AI_EVAL.map((r) => ({ ...r }));
    case 'documents': return AI_TECH_DOCS.slice(0, cyber ? 3 : 5);
    case 'qualification': return AI_QUAL;
    default: return [];
  }
}

const sarShort = (n) => (n >= 1e6 ? `SAR ${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')}M` : `SAR ${Math.round(n / 1e3)}K`);
const FOCUS = {
  dept: 'For your decision: the budget position and whether the scope matches the department’s plan.',
  doa: 'For your decision: the total commitment against your delegation limit and the budget position.',
  price: 'To check: whether the line prices are in line with recent purchases and market rates.',
  tech: 'To check: whether the technical requirements and evaluation criteria are specific enough to score vendors.',
  ea: 'To check: hosting, integrations and data residency against the architecture standards.',
  cyber: 'To check: security testing, data protection and vendor access in the requirements.',
  bcm: 'To check: whether the service is critical and the continuity clauses cover it.',
  orm: 'To check: operational risk, service levels and the exit plan.',
  gl: 'To check: the purchase type and material group on each line — they decide the GL account.',
  glchanged: 'To check: what changed since your approval and whether the accounting still holds.',
  assets: 'To check: which lines should be capitalised and how assets group together.',
  qual: 'To check: the qualification ranges and weights for the vendors.',
  lead: 'To decide: who runs this tender and how urgent it is.',
  officer: 'To prepare: the Etimad publication — documents, dates and committee.',
};

/** Sentences for the reviewer-side "AI executive summary". */
export function executiveSummary(request, taskType, variant = 0) {
  const lines = (request.boq || []).flatMap((g) => g.items).sort((a, b) => b.total - a.total);
  const top = lines.slice(0, 3).map((l) => `${l.item} (${sarShort(l.total)})`);
  const b = request.budget;
  const budget = !b ? null : b.status === 'insufficient'
    ? `Budget is short: ${sarShort(b.available)} is available against ${sarShort(b.request)} requested — a ${sarShort(b.shortfall)} shortfall.`
    : `Budget is available: ${sarShort(b.available)} left on ${b.ref.split(' · ')[0]} covers the ${sarShort(b.request)} requested.`;
  const s = [
    `${request.requester?.name || 'The requester'} (${request.requester?.dept || 'department'}) asks for ${request.project} through a ${String(request.route || 'tender').toLowerCase()}, starting ${request.start || 'on approval'} for ${request.duration || 'the contract period'}.`,
    `${sarShort(request.amountVat || request.amount || 0)} incl. VAT across ${lines.length} BOQ lines${top.length ? `; the largest are ${top.join(', ')}` : ''}.`,
    budget,
    FOCUS[taskType] || 'Check the scope, the BOQ and the budget against your department’s rules.',
  ].filter(Boolean);
  return variant % 2 ? [s[0], s[2], s[1], s[3]].filter(Boolean) : s;
}
