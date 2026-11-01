// Deterministic sample dataset for the Reports module. Real deployments read
// these from the procurement data mart (Munafasat Work Engine, SAP ECC, Etimad).

let seed = 20261101;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
const round = (n: number, step = 1000) => Math.round(n / step) * step;
const DAY = 864e5;
export const NOW = new Date('2026-11-01T09:00:00Z').getTime();
const dateAgo = (d: number) => new Date(NOW - d * DAY).toISOString().slice(0, 10);
const dateAhead = (d: number) => new Date(NOW + d * DAY).toISOString().slice(0, 10);

export const DEPARTMENTS = ['IT & Digital', 'Finance', 'Human Resources', 'Legal Affairs', 'Facilities & Services', 'Information Security', 'Enterprise Risk', 'General Administration'] as const;
export const DEPT_AR: Record<string, string> = {
  'IT & Digital': 'تقنية المعلومات والتحول الرقمي', Finance: 'المالية', 'Human Resources': 'الموارد البشرية', 'Legal Affairs': 'الشؤون القانونية',
  'Facilities & Services': 'المرافق والخدمات', 'Information Security': 'أمن المعلومات', 'Enterprise Risk': 'إدارة المخاطر', 'General Administration': 'الشؤون الإدارية',
};
export const PROJECTS = ['Core ERP Modernization', 'Digital Services Portal', 'HQ Facilities Upgrade', 'Cyber Resilience 2026', 'Workforce Excellence', 'Operational Continuity'] as const;
export const CATEGORIES = ['IT Software', 'IT Hardware', 'Professional Services', 'Facilities', 'Consumables', 'Consulting'] as const;
export const MATERIAL_GROUPS: Record<string, string[]> = {
  'IT Software': ['Licences', 'SaaS subscriptions'], 'IT Hardware': ['End-user devices', 'Network equipment'],
  'Professional Services': ['Implementation', 'Managed services'], Facilities: ['Maintenance', 'Furniture'],
  Consumables: ['Stationery', 'Printing supplies'], Consulting: ['Advisory', 'Audit & assurance'],
};
export const METHODS = ['RFI', 'RFQ', 'RFP', 'Public tender', 'Limited tender', 'Direct purchase', 'Etimad E-Market'] as const;
const PEOPLE = ['Ibrahim Al-Rashid', 'Fatima Al-Zahrani', 'Khalid Al-Qahtani', 'Noura Al-Dosari', 'Sara Al-Ghamdi', 'Mohammed Al-Otaibi', 'Reem Al-Harbi', 'Omar Al-Shehri', 'Lama Al-Subaie', 'Yousef Al-Harthi'];
const APPROVERS = ['Faisal Al-Dossari', 'Saad Al-Malki', 'Abdullah Al-Qahtani', 'Hana Al-Ghamdi', 'Khalid Al-Otaibi', 'Noura Al-Shamrani', 'Majed Al-Zahrani', 'Turki Al-Anazi'];
const SUPPLIERS = ['Al-Faisaliah Systems', 'Elm Information Security', 'Saudi Business Machines', 'Bayan Consulting', 'Al Moammar Information Systems', 'Takamol Holding', 'Mobily Business', 'STC Solutions', 'Rawabi Facility Services', 'Jarir Business', 'Deloitte Middle East', 'PwC Saudi Arabia'];
const STAGES = ['Department approval', 'Technical review', 'Specialist reviews', 'Finance review', 'Qualification', 'Procurement review', 'DOA approval', 'Estimated price approval'];
const PR_TITLES: Record<string, string[]> = {
  'IT Software': ['ERP licence renewal', 'Document management platform', 'Analytics subscription', 'Identity & access management'],
  'IT Hardware': ['Laptop refresh', 'Data centre UPS', 'Network switches', 'Meeting room AV'],
  'Professional Services': ['ERP finance support', 'SOC managed services', 'Portal development', 'Cloud migration'],
  Facilities: ['HQ cleaning services', 'Fit-out of floor 4', 'Ergonomic chairs', 'HVAC maintenance'],
  Consumables: ['Office stationery Q4', 'Printer toner', 'Branded materials', 'Pantry supplies'],
  Consulting: ['Annual audit 2027', 'BCM consultancy', 'Procurement strategy review', 'Org design advisory'],
};

export type PrStatus = 'Draft' | 'Submitted' | 'Under review' | 'Returned' | 'Approved' | 'Rejected';
export interface PR {
  id: string; title: string; requester: string; department: string; project: string; category: string; materialGroup: string;
  method: string; value: number; status: PrStatus; created: string; stage: string; owner: string; daysPending: number;
  budgetAllocated: number; budgetAvailable: number; rejectReason?: string; returnReason?: string; items: number; qty: number;
  rfpDays?: number; awardDays?: number; poDays?: number; awarded?: number; dueMilestone?: string;
}
const RETURN_REASONS = ['Incomplete BOQ', 'Missing technical specification', 'Budget line not confirmed', 'Scope unclear', 'Evaluation criteria missing'];
const REJECT_REASONS = ['Budget not available', 'Duplicate request', 'Not aligned with strategy', 'Covered by existing contract'];

export const PRS: PR[] = Array.from({ length: 140 }, (_, i) => {
  const category = pick(CATEGORIES);
  const department = pick(DEPARTMENTS);
  const status: PrStatus = pick(['Draft', 'Submitted', 'Under review', 'Under review', 'Returned', 'Approved', 'Approved', 'Approved', 'Rejected'] as const);
  const value = round(category === 'Consumables' ? int(20, 180) * 1000 : category === 'IT Hardware' ? int(150, 2200) * 1000 : int(250, 6500) * 1000);
  const age = int(2, 330);
  const allocated = round(value * (0.9 + rnd() * 0.9));
  const done = status === 'Approved';
  const rfpDays = status === 'Draft' ? undefined : int(6, 28);
  return {
    id: `PR-2026-${String(4300 + i).padStart(4, '0')}`,
    title: pick(PR_TITLES[category]), requester: pick(PEOPLE), department, project: pick(PROJECTS), category,
    materialGroup: pick(MATERIAL_GROUPS[category]), method: category === 'Consumables' ? pick(['Etimad E-Market', 'Direct purchase', 'RFQ'] as const) : pick(METHODS),
    value, status, created: dateAgo(age), stage: done ? 'Completed' : status === 'Draft' ? 'Draft' : pick(STAGES),
    owner: status === 'Draft' || status === 'Returned' ? pick(PEOPLE) : pick(APPROVERS),
    daysPending: done || status === 'Rejected' ? 0 : Math.min(age, int(1, 45)),
    budgetAllocated: allocated, budgetAvailable: Math.max(0, round(allocated - value * (0.4 + rnd() * 0.9))),
    returnReason: status === 'Returned' ? pick(RETURN_REASONS) : undefined,
    rejectReason: status === 'Rejected' ? pick(REJECT_REASONS) : undefined,
    items: int(3, 24), qty: int(5, 600),
    rfpDays, awardDays: done ? int(25, 75) : undefined, poDays: done ? int(5, 18) : undefined,
    awarded: done ? round(value * (0.78 + rnd() * 0.2)) : undefined,
    dueMilestone: done ? undefined : dateAhead(int(2, 60)),
  };
});

export type RfpStage = 'Preparation' | 'Review' | 'Sourcing' | 'Evaluation' | 'Award' | 'Awarded';
export interface RFP {
  id: string; title: string; type: string; department: string; project: string; category: string; value: number; status: RfpStage; owner: string; created: string;
  reviewDept: string; reviewDays: number; reviewStatus: 'Completed' | 'In progress' | 'Overdue';
  publishDays: number; bidDays: number; evalDays: number; awardDays: number;
  invited: number; participants: number; qualified: number; techScore: number; commScore: number; rank: number; outcome: string;
  supplier: string; awarded?: number;
}
export const RFPS: RFP[] = PRS.filter((p) => !['Draft', 'Rejected'].includes(p.status) && p.method !== 'Etimad E-Market').slice(0, 72).map((p, i) => {
  const status: RfpStage = p.status === 'Approved' ? pick(['Sourcing', 'Evaluation', 'Award', 'Awarded', 'Awarded'] as const) : pick(['Preparation', 'Review', 'Review'] as const);
  const invited = int(4, 14); const participants = Math.max(1, invited - int(0, 6)); const qualified = Math.max(1, participants - int(0, 3));
  const awarded = status === 'Awarded' ? round(p.value * (0.76 + rnd() * 0.22)) : undefined;
  return {
    id: `RFP-2026-${String(600 + i).padStart(3, '0')}`, title: p.title, type: p.method, department: p.department, project: p.project, category: p.category,
    value: p.value, status, owner: pick(['Abdullah Al-Qahtani', 'Mohammed Al-Harbi', 'Yousef Al-Harthi', 'Amal Al-Qahtani']), created: p.created,
    reviewDept: pick(['IT', 'Finance', 'Legal', 'Cybersecurity', 'Enterprise Architecture', 'Risk']), reviewDays: int(1, 9),
    reviewStatus: pick(['Completed', 'Completed', 'Completed', 'In progress', 'Overdue'] as const),
    publishDays: int(3, 14), bidDays: int(14, 35), evalDays: int(7, 25), awardDays: int(3, 15),
    invited, participants, qualified, techScore: int(62, 95), commScore: int(55, 98), rank: 1,
    outcome: status === 'Awarded' ? 'Awarded' : status === 'Award' ? 'Recommended' : 'In evaluation', supplier: pick(SUPPLIERS), awarded,
  };
});

export type TaskStatus = 'Pending' | 'Completed' | 'Overdue';
export interface TaskRow {
  id: string; type: string; department: string; owner: string; status: TaskStatus; stage: string; request: string; value: number;
  ageingDays: number; slaHours: number; resolvedHours?: number; withinSla: boolean; rework: number; assigned: string; completed?: string; category: string; project: string;
}
const TASK_TYPES = ['Approval', 'Review', 'Data collection', 'Technical evaluation', 'Qualification', 'DOA approval', 'Clarification'];
const REVIEW_DEPTS = ['IT & Digital', 'Finance', 'Legal Affairs', 'Information Security', 'Enterprise Risk', 'General Administration'];
export const TASKS: TaskRow[] = Array.from({ length: 260 }, (_, i) => {
  const pr = PRS[i % PRS.length];
  const status: TaskStatus = pick(['Completed', 'Completed', 'Completed', 'Pending', 'Pending', 'Overdue']);
  const sla = pick([24, 24, 48, 48, 72, 96]);
  const resolved = status === 'Completed' ? Math.round(sla * (0.3 + rnd() * 1.1)) : undefined;
  const age = int(0, 20);
  return {
    id: `TSK-${String(9000 + i)}`, type: pick(TASK_TYPES), department: pick(REVIEW_DEPTS), owner: pick(APPROVERS), status, stage: pick(STAGES),
    request: pr.id, value: pr.value, ageingDays: status === 'Completed' ? 0 : age, slaHours: sla, resolvedHours: resolved,
    withinSla: status === 'Completed' ? (resolved ?? 0) <= sla : status === 'Pending' && age * 24 <= sla, rework: rnd() < 0.18 ? int(1, 3) : 0,
    assigned: dateAgo(int(1, 300)), completed: status === 'Completed' ? dateAgo(int(0, 280)) : undefined, category: pr.category, project: pr.project,
  };
});

export interface ExceptionRow { id: string; kind: 'Failed transition' | 'Blocked task' | 'Unresolved dependency'; task: string; request: string; stage: string; department: string; since: string; severity: 'High' | 'Medium' | 'Low'; detail: string; status: 'Open' | 'Investigating' | 'Resolved' }
export const EXCEPTIONS: ExceptionRow[] = Array.from({ length: 26 }, (_, i) => {
  const kind = pick(['Failed transition', 'Blocked task', 'Unresolved dependency'] as const);
  return {
    id: `EXC-${300 + i}`, kind, task: TASKS[i * 7].id, request: TASKS[i * 7].request, stage: pick(STAGES), department: pick(REVIEW_DEPTS), since: dateAgo(int(0, 40)),
    severity: pick(['High', 'Medium', 'Medium', 'Low'] as const),
    detail: kind === 'Failed transition' ? pick(['SAP ECC PR creation timed out', 'Etimad publish API returned 502', 'DOA rule not matched']) : kind === 'Blocked task' ? pick(['Approver on leave — no delegate', 'Mandatory checklist incomplete', 'Budget check unavailable']) : pick(['Waiting for parallel reviewers', 'Qualification criteria missing', 'Asset item not created in ECC']),
    status: pick(['Open', 'Open', 'Investigating', 'Resolved'] as const),
  };
});

export type PoStatus = 'Open' | 'Partially received' | 'Received' | 'Closed' | 'Cancelled';
export interface PO {
  id: string; supplier: string; value: number; date: string; status: PoStatus; project: string; category: string; department: string;
  orderedQty: number; receivedQty: number; delayDays: number; amendments: number; revisedValue: number; contract: string;
}
export const POS: PO[] = Array.from({ length: 96 }, (_, i) => {
  const pr = PRS[(i * 3) % PRS.length];
  const ordered = int(10, 800); const status: PoStatus = pick(['Open', 'Partially received', 'Received', 'Received', 'Closed', 'Cancelled']);
  const received = status === 'Received' || status === 'Closed' ? ordered : status === 'Partially received' ? int(1, ordered - 1) : 0;
  const amendments = rnd() < 0.3 ? int(1, 4) : 0; const value = round(pr.value * (0.7 + rnd() * 0.3));
  return {
    id: `45000${String(1200 + i)}`, supplier: pick(SUPPLIERS), value, date: dateAgo(int(1, 340)), status, project: pr.project, category: pr.category, department: pr.department,
    orderedQty: ordered, receivedQty: received, delayDays: status === 'Open' || status === 'Partially received' ? (rnd() < 0.45 ? int(1, 40) : 0) : (rnd() < 0.2 ? int(1, 15) : 0),
    amendments, revisedValue: amendments ? round(value * (1 + (rnd() * 0.25 - 0.05))) : value, contract: `CN-2026-${String(100 + (i % 40)).padStart(3, '0')}`,
  };
});

export type ContractStatus = 'Active' | 'Expiring' | 'Expired' | 'Draft';
export interface Contract { id: string; supplier: string; title: string; start: string; end: string; value: number; consumed: number; status: ContractStatus; department: string; category: string; project: string; daysToExpiry: number }
export const CONTRACTS: Contract[] = Array.from({ length: 40 }, (_, i) => {
  const daysToExpiry = int(-40, 420); const value = round(int(300, 9000) * 1000);
  const pr = PRS[(i * 5) % PRS.length];
  return {
    id: `CN-2026-${String(100 + i).padStart(3, '0')}`, supplier: pick(SUPPLIERS), title: pick(PR_TITLES[pr.category]), start: dateAgo(int(60, 700)), end: daysToExpiry >= 0 ? dateAhead(daysToExpiry) : dateAgo(-daysToExpiry),
    value, consumed: round(value * (0.1 + rnd() * 0.95)), status: daysToExpiry < 0 ? 'Expired' : daysToExpiry <= 90 ? 'Expiring' : rnd() < 0.08 ? 'Draft' : 'Active',
    department: pr.department, category: pr.category, project: pr.project, daysToExpiry,
  };
});
