let seed = 20261101;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const int = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const round = (n, step = 1e3) => Math.round(n / step) * step;
const DAY = 864e5;
const NOW = (/* @__PURE__ */ new Date("2026-11-01T09:00:00Z")).getTime();
const dateAgo = (d) => new Date(NOW - d * DAY).toISOString().slice(0, 10);
const dateAhead = (d) => new Date(NOW + d * DAY).toISOString().slice(0, 10);
const DEPARTMENTS = ["IT & Digital", "Finance", "Human Resources", "Legal Affairs", "Facilities & Services", "Information Security", "Enterprise Risk", "General Administration"];
const DEPT_AR = {
  "IT & Digital": "\u062A\u0642\u0646\u064A\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0648\u0627\u0644\u062A\u062D\u0648\u0644 \u0627\u0644\u0631\u0642\u0645\u064A",
  Finance: "\u0627\u0644\u0645\u0627\u0644\u064A\u0629",
  "Human Resources": "\u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629",
  "Legal Affairs": "\u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629",
  "Facilities & Services": "\u0627\u0644\u0645\u0631\u0627\u0641\u0642 \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A",
  "Information Security": "\u0623\u0645\u0646 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A",
  "Enterprise Risk": "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062E\u0627\u0637\u0631",
  "General Administration": "\u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629"
};
const PROJECTS = ["Core ERP Modernization", "Digital Services Portal", "HQ Facilities Upgrade", "Cyber Resilience 2026", "Workforce Excellence", "Operational Continuity"];
const CATEGORIES = ["IT Software", "IT Hardware", "Professional Services", "Facilities", "Consumables", "Consulting"];
const MATERIAL_GROUPS = {
  "IT Software": ["Licences", "SaaS subscriptions"],
  "IT Hardware": ["End-user devices", "Network equipment"],
  "Professional Services": ["Implementation", "Managed services"],
  Facilities: ["Maintenance", "Furniture"],
  Consumables: ["Stationery", "Printing supplies"],
  Consulting: ["Advisory", "Audit & assurance"]
};
const METHODS = ["RFI", "RFQ", "RFP", "Public tender", "Limited tender", "Direct purchase", "Etimad E-Market"];
const PEOPLE = ["Ibrahim Al-Rashid", "Fatima Al-Zahrani", "Khalid Al-Qahtani", "Noura Al-Dosari", "Sara Al-Ghamdi", "Mohammed Al-Otaibi", "Reem Al-Harbi", "Omar Al-Shehri", "Lama Al-Subaie", "Yousef Al-Harthi"];
const APPROVERS = ["Faisal Al-Dossari", "Saad Al-Malki", "Abdullah Al-Qahtani", "Hana Al-Ghamdi", "Khalid Al-Otaibi", "Noura Al-Shamrani", "Majed Al-Zahrani", "Turki Al-Anazi"];
const SUPPLIERS = ["Al-Faisaliah Systems", "Elm Information Security", "Saudi Business Machines", "Bayan Consulting", "Al Moammar Information Systems", "Takamol Holding", "Mobily Business", "STC Solutions", "Rawabi Facility Services", "Jarir Business", "Deloitte Middle East", "PwC Saudi Arabia"];
const STAGES = ["Department approval", "Technical review", "Specialist reviews", "Finance review", "Qualification", "Procurement review", "DOA approval", "Estimated price approval"];
const PR_TITLES = {
  "IT Software": ["ERP licence renewal", "Document management platform", "Analytics subscription", "Identity & access management"],
  "IT Hardware": ["Laptop refresh", "Data centre UPS", "Network switches", "Meeting room AV"],
  "Professional Services": ["ERP finance support", "SOC managed services", "Portal development", "Cloud migration"],
  Facilities: ["HQ cleaning services", "Fit-out of floor 4", "Ergonomic chairs", "HVAC maintenance"],
  Consumables: ["Office stationery Q4", "Printer toner", "Branded materials", "Pantry supplies"],
  Consulting: ["Annual audit 2027", "BCM consultancy", "Procurement strategy review", "Org design advisory"]
};
const RETURN_REASONS = ["Incomplete BOQ", "Missing technical specification", "Budget line not confirmed", "Scope unclear", "Evaluation criteria missing"];
const REJECT_REASONS = ["Budget not available", "Duplicate request", "Not aligned with strategy", "Covered by existing contract"];
const PRS = Array.from({ length: 140 }, (_, i) => {
  const category = pick(CATEGORIES);
  const department = pick(DEPARTMENTS);
  const status = pick(["Draft", "Submitted", "Under review", "Under review", "Returned", "Approved", "Approved", "Approved", "Rejected"]);
  const value = round(category === "Consumables" ? int(20, 180) * 1e3 : category === "IT Hardware" ? int(150, 2200) * 1e3 : int(250, 6500) * 1e3);
  const age = int(2, 330);
  const allocated = round(value * (0.9 + rnd() * 0.9));
  const done = status === "Approved";
  const rfpDays = status === "Draft" ? void 0 : int(6, 28);
  return {
    id: `PR-2026-${String(4300 + i).padStart(4, "0")}`,
    title: pick(PR_TITLES[category]),
    requester: pick(PEOPLE),
    department,
    project: pick(PROJECTS),
    category,
    materialGroup: pick(MATERIAL_GROUPS[category]),
    method: category === "Consumables" ? pick(["Etimad E-Market", "Direct purchase", "RFQ"]) : pick(METHODS),
    value,
    status,
    created: dateAgo(age),
    stage: done ? "Completed" : status === "Draft" ? "Draft" : pick(STAGES),
    owner: status === "Draft" || status === "Returned" ? pick(PEOPLE) : pick(APPROVERS),
    daysPending: done || status === "Rejected" ? 0 : Math.min(age, int(1, 45)),
    budgetAllocated: allocated,
    budgetAvailable: Math.max(0, round(allocated - value * (0.4 + rnd() * 0.9))),
    returnReason: status === "Returned" ? pick(RETURN_REASONS) : void 0,
    rejectReason: status === "Rejected" ? pick(REJECT_REASONS) : void 0,
    items: int(3, 24),
    qty: int(5, 600),
    rfpDays,
    awardDays: done ? int(25, 75) : void 0,
    poDays: done ? int(5, 18) : void 0,
    awarded: done ? round(value * (0.78 + rnd() * 0.2)) : void 0,
    dueMilestone: done ? void 0 : dateAhead(int(2, 60))
  };
});
const RFPS = PRS.filter((p) => !["Draft", "Rejected"].includes(p.status) && p.method !== "Etimad E-Market").slice(0, 72).map((p, i) => {
  const status = p.status === "Approved" ? pick(["Sourcing", "Evaluation", "Award", "Awarded", "Awarded"]) : pick(["Preparation", "Review", "Review"]);
  const invited = int(4, 14);
  const participants = Math.max(1, invited - int(0, 6));
  const qualified = Math.max(1, participants - int(0, 3));
  const awarded = status === "Awarded" ? round(p.value * (0.76 + rnd() * 0.22)) : void 0;
  return {
    id: `RFP-2026-${String(600 + i).padStart(3, "0")}`,
    title: p.title,
    type: p.method,
    department: p.department,
    project: p.project,
    category: p.category,
    value: p.value,
    status,
    owner: pick(["Abdullah Al-Qahtani", "Mohammed Al-Harbi", "Yousef Al-Harthi", "Amal Al-Qahtani"]),
    created: p.created,
    reviewDept: pick(["IT", "Finance", "Legal", "Cybersecurity", "Enterprise Architecture", "Risk"]),
    reviewDays: int(1, 9),
    reviewStatus: pick(["Completed", "Completed", "Completed", "In progress", "Overdue"]),
    publishDays: int(3, 14),
    bidDays: int(14, 35),
    evalDays: int(7, 25),
    awardDays: int(3, 15),
    invited,
    participants,
    qualified,
    techScore: int(62, 95),
    commScore: int(55, 98),
    rank: 1,
    outcome: status === "Awarded" ? "Awarded" : status === "Award" ? "Recommended" : "In evaluation",
    supplier: pick(SUPPLIERS),
    awarded
  };
});
const TASK_TYPES = ["Approval", "Review", "Data collection", "Technical evaluation", "Qualification", "DOA approval", "Clarification"];
const REVIEW_DEPTS = ["IT & Digital", "Finance", "Legal Affairs", "Information Security", "Enterprise Risk", "General Administration"];
const TASKS = Array.from({ length: 260 }, (_, i) => {
  const pr = PRS[i % PRS.length];
  const status = pick(["Completed", "Completed", "Completed", "Pending", "Pending", "Overdue"]);
  const sla = pick([24, 24, 48, 48, 72, 96]);
  const resolved = status === "Completed" ? Math.round(sla * (0.3 + rnd() * 1.1)) : void 0;
  const age = int(0, 20);
  return {
    id: `TSK-${String(9e3 + i)}`,
    type: pick(TASK_TYPES),
    department: pick(REVIEW_DEPTS),
    owner: pick(APPROVERS),
    status,
    stage: pick(STAGES),
    request: pr.id,
    value: pr.value,
    ageingDays: status === "Completed" ? 0 : age,
    slaHours: sla,
    resolvedHours: resolved,
    withinSla: status === "Completed" ? (resolved ?? 0) <= sla : status === "Pending" && age * 24 <= sla,
    rework: rnd() < 0.18 ? int(1, 3) : 0,
    assigned: dateAgo(int(1, 300)),
    completed: status === "Completed" ? dateAgo(int(0, 280)) : void 0,
    category: pr.category,
    project: pr.project
  };
});
const EXCEPTIONS = Array.from({ length: 26 }, (_, i) => {
  const kind = pick(["Failed transition", "Blocked task", "Unresolved dependency"]);
  return {
    id: `EXC-${300 + i}`,
    kind,
    task: TASKS[i * 7].id,
    request: TASKS[i * 7].request,
    stage: pick(STAGES),
    department: pick(REVIEW_DEPTS),
    since: dateAgo(int(0, 40)),
    severity: pick(["High", "Medium", "Medium", "Low"]),
    detail: kind === "Failed transition" ? pick(["SAP ECC PR creation timed out", "Etimad publish API returned 502", "DOA rule not matched"]) : kind === "Blocked task" ? pick(["Approver on leave \u2014 no delegate", "Mandatory checklist incomplete", "Budget check unavailable"]) : pick(["Waiting for parallel reviewers", "Qualification criteria missing", "Asset item not created in ECC"]),
    status: pick(["Open", "Open", "Investigating", "Resolved"])
  };
});
const POS = Array.from({ length: 96 }, (_, i) => {
  const pr = PRS[i * 3 % PRS.length];
  const ordered = int(10, 800);
  const status = pick(["Open", "Partially received", "Received", "Received", "Closed", "Cancelled"]);
  const received = status === "Received" || status === "Closed" ? ordered : status === "Partially received" ? int(1, ordered - 1) : 0;
  const amendments = rnd() < 0.3 ? int(1, 4) : 0;
  const value = round(pr.value * (0.7 + rnd() * 0.3));
  return {
    id: `45000${String(1200 + i)}`,
    supplier: pick(SUPPLIERS),
    value,
    date: dateAgo(int(1, 340)),
    status,
    project: pr.project,
    category: pr.category,
    department: pr.department,
    orderedQty: ordered,
    receivedQty: received,
    delayDays: status === "Open" || status === "Partially received" ? rnd() < 0.45 ? int(1, 40) : 0 : rnd() < 0.2 ? int(1, 15) : 0,
    amendments,
    revisedValue: amendments ? round(value * (1 + (rnd() * 0.25 - 0.05))) : value,
    contract: `CN-2026-${String(100 + i % 40).padStart(3, "0")}`
  };
});
const CONTRACTS = Array.from({ length: 40 }, (_, i) => {
  const daysToExpiry = int(-40, 420);
  const value = round(int(300, 9e3) * 1e3);
  const pr = PRS[i * 5 % PRS.length];
  return {
    id: `CN-2026-${String(100 + i).padStart(3, "0")}`,
    supplier: pick(SUPPLIERS),
    title: pick(PR_TITLES[pr.category]),
    start: dateAgo(int(60, 700)),
    end: daysToExpiry >= 0 ? dateAhead(daysToExpiry) : dateAgo(-daysToExpiry),
    value,
    consumed: round(value * (0.1 + rnd() * 0.95)),
    status: daysToExpiry < 0 ? "Expired" : daysToExpiry <= 90 ? "Expiring" : rnd() < 0.08 ? "Draft" : "Active",
    department: pr.department,
    category: pr.category,
    project: pr.project,
    daysToExpiry
  };
});
export {
  CATEGORIES,
  CONTRACTS,
  DEPARTMENTS,
  DEPT_AR,
  EXCEPTIONS,
  MATERIAL_GROUPS,
  METHODS,
  NOW,
  POS,
  PROJECTS,
  PRS,
  RFPS,
  TASKS
};
