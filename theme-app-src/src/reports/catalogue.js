import { PRS, RFPS, TASKS, EXCEPTIONS, POS, CONTRACTS, NOW } from './dataset.js';
const GROUPS = {
  A: { en: "Procurement Overview & Performance", ar: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0648\u0627\u0644\u0623\u062F\u0627\u0621", short: ["Overview & performance", "\u0627\u0644\u0646\u0638\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0648\u0627\u0644\u0623\u062F\u0627\u0621"], who: "CTO, CFO, Procurement Director, Department Heads", whoAr: "\u0627\u0644\u0631\u0626\u064A\u0633 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A \u0644\u0644\u062A\u0642\u0646\u064A\u0629\u060C \u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u060C \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A\u060C \u0631\u0624\u0633\u0627\u0621 \u0627\u0644\u0625\u062F\u0627\u0631\u0627\u062A", color: "#2A6193", soft: "#EEF4FB", tag: ["Executive reports", "\u062A\u0642\u0627\u0631\u064A\u0631 \u062A\u0646\u0641\u064A\u0630\u064A\u0629"] },
  B: { en: "Purchase Request Reports", ar: "\u062A\u0642\u0627\u0631\u064A\u0631 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621", short: ["Purchase requests", "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621"], who: "Requesters, Finance, Procurement, Department Managers", whoAr: "\u0645\u0642\u062F\u0645\u0648 \u0627\u0644\u0637\u0644\u0628\u0627\u062A\u060C \u0627\u0644\u0645\u0627\u0644\u064A\u0629\u060C \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A\u060C \u0645\u062F\u0631\u0627\u0621 \u0627\u0644\u0625\u062F\u0627\u0631\u0627\u062A", color: "#517632", soft: "#EEF5E8" },
  C: { en: "RFP & Sourcing Reports", ar: "\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0648\u0627\u0644\u062A\u0648\u0631\u064A\u062F", short: ["RFP & sourcing", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0648\u0627\u0644\u062A\u0648\u0631\u064A\u062F"], who: "Procurement, Sourcing Teams, Evaluation Committees, Management", whoAr: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A\u060C \u0641\u0631\u0642 \u0627\u0644\u062A\u0648\u0631\u064A\u062F\u060C \u0644\u062C\u0627\u0646 \u0627\u0644\u062A\u0642\u064A\u064A\u0645\u060C \u0627\u0644\u0625\u062F\u0627\u0631\u0629", color: "#6A47D6", soft: "#F1EEFB" },
  D: { en: "Work Engine & Approval Reports", ar: "\u062A\u0642\u0627\u0631\u064A\u0631 \u0645\u062D\u0631\u0643 \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A", short: ["Work Engine & approvals", "\u0645\u062D\u0631\u0643 \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A"], who: "Procurement Operations, Department Heads, Work Engine Administrators", whoAr: "\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A\u060C \u0631\u0624\u0633\u0627\u0621 \u0627\u0644\u0625\u062F\u0627\u0631\u0627\u062A\u060C \u0645\u0633\u0624\u0648\u0644\u0648 \u0645\u062D\u0631\u0643 \u0627\u0644\u0639\u0645\u0644", color: "#B25B00", soft: "#FFF3E6", tag: ["Important differentiator", "\u0645\u064A\u0632\u0629 \u062A\u0646\u0627\u0641\u0633\u064A\u0629 \u0645\u0647\u0645\u0629"] },
  E: { en: "Purchase Order & Contract Reports", ar: "\u062A\u0642\u0627\u0631\u064A\u0631 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u0639\u0642\u0648\u062F", short: ["POs & contracts", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u0639\u0642\u0648\u062F"], who: "Procurement, Contract Managers, Finance", whoAr: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A\u060C \u0645\u062F\u0631\u0627\u0621 \u0627\u0644\u0639\u0642\u0648\u062F\u060C \u0627\u0644\u0645\u0627\u0644\u064A\u0629", color: "#0E7A7A", soft: "#E6F4F4" }
};
const sum = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const avg = (rows, k) => {
  const v = rows.filter((r) => r[k] != null);
  return v.length ? sum(v, k) / v.length : 0;
};
const pct = (a, b) => b ? a / b * 100 : 0;
const cnt = (f) => (rows) => f ? rows.filter(f).length : rows.length;
const by = (k) => (r) => String(r[k] ?? "\u2014");
const sumOf = (k) => (rows) => sum(rows, k);
const avgOf = (k) => (rows) => avg(rows, k);
const month = (k) => (r) => String(r[k] ?? "").slice(0, 7);
const quarter = (k) => (r) => {
  const d = new Date(r[k]);
  return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
};
const C = (key, en, ar, kind) => ({ key, en, ar, kind });
const K = (en, ar, fmt, calc, def, drill, good) => ({ en, ar, fmt, calc, def, drill, good });
const G = (en, ar, type, group, metric = "count", fmt = "num", top) => ({ en, ar, type, group, metric, fmt, top });
const open = (r) => !["Approved", "Rejected", "Draft"].includes(r.status);
const prRows = () => PRS;
const ageBand = (d) => d <= 7 ? "0\u20137 days" : d <= 15 ? "8\u201315 days" : d <= 30 ? "16\u201330 days" : "30+ days";
const cycle = (p) => (p.rfpDays ?? 0) + (p.awardDays ?? 0) + (p.poDays ?? 0);
const ROLES = { exec: ["Executive", "Procurement Director", "Finance"], proc: ["Procurement", "Department Managers"], ops: ["Procurement Operations", "Work Engine Admin"], all: ["All users (own department)"] };
const PR_COLS = [C("id", "PR ID", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("requester", "Requester", "\u0645\u0642\u062F\u0651\u0645 \u0627\u0644\u0637\u0644\u0628"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("project", "Project", "\u0627\u0644\u0645\u0634\u0631\u0648\u0639"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status"), C("created", "Created", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621", "date")];
const REPORTS = [
  // ── A. Procurement Overview & Performance ─────────────────────────────────
  {
    id: "overview",
    group: "A",
    icon: "overview",
    en: "Procurement Overview",
    ar: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A",
    descEn: "Total PRs, RFPs, POs, estimated, awarded and pending value.",
    descAr: "\u0625\u062C\u0645\u0627\u0644\u064A \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0648\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0631\u0633\u0627\u0629 \u0648\u0627\u0644\u0645\u0639\u0644\u0642\u0629.",
    source: prRows,
    dateKey: "created",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.exec,
    table: (rows) => groupTable(rows, "department", [["prs", (g) => g.length], ["rfps", (g) => g.filter((r) => r.rfpDays != null).length], ["pos", (g) => g.filter((r) => r.poDays != null).length], ["value", (g) => sum(g, "value")], ["awarded", (g) => sum(g, "awarded")], ["pending", (g) => sum(g.filter(open), "value")]]),
    columns: [C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("prs", "PRs", "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621", "num"), C("rfps", "RFPs", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A", "num"), C("pos", "POs", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "num"), C("value", "Estimated value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629", "money"), C("awarded", "Awarded value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0631\u0633\u0627\u0629", "money"), C("pending", "Pending value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629", "money")],
    kpis: [
      K("Total PRs", "\u0625\u062C\u0645\u0627\u0644\u064A \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621", "num", cnt(), ["Count of purchase requests created in the period.", "\u0639\u062F\u062F \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u0646\u0634\u0623\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629."]),
      K("RFPs", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A", "num", cnt((r) => r.rfpDays != null), ["PRs that progressed to an RFP / sourcing event.", "\u0637\u0644\u0628\u0627\u062A \u0627\u0646\u062A\u0642\u0644\u062A \u0625\u0644\u0649 \u0645\u0646\u0627\u0641\u0633\u0629 \u0623\u0648 \u062D\u062F\u062B \u062A\u0648\u0631\u064A\u062F."], (r) => r.rfpDays != null),
      K("POs", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "num", cnt((r) => r.poDays != null), ["PRs with a purchase order issued in SAP ECC.", "\u0637\u0644\u0628\u0627\u062A \u0635\u062F\u0631 \u0644\u0647\u0627 \u0623\u0645\u0631 \u0634\u0631\u0627\u0621 \u0641\u064A SAP ECC."], (r) => r.poDays != null),
      K("Estimated value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629", "money", sumOf("value"), ["Sum of estimated PR values (excl. VAT).", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0644\u0644\u0637\u0644\u0628\u0627\u062A (\u0642\u0628\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u0629)."]),
      K("Awarded value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0631\u0633\u0627\u0629", "money", sumOf("awarded"), ["Sum of awarded contract values.", "\u0645\u062C\u0645\u0648\u0639 \u0642\u064A\u0645 \u0627\u0644\u0639\u0642\u0648\u062F \u0627\u0644\u0645\u0631\u0633\u0627\u0629."], (r) => r.awarded != null),
      K("Pending value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629", "money", (rows) => sum(rows.filter(open), "value"), ["Estimated value of PRs still in approval.", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0644\u0644\u0637\u0644\u0628\u0627\u062A \u0642\u064A\u062F \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F."], open, "down")
    ],
    charts: [G("Value by department", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"), sumOf("value"), "money"), G("PRs by status", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062D\u0627\u0644\u0629", "donut", by("status")), G("Monthly PR value", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0634\u0647\u0631\u064A\u064B\u0627", "line", month("created"), sumOf("value"), "money")]
  },
  {
    id: "spend",
    group: "A",
    icon: "spend",
    en: "Procurement Spend Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A",
    descEn: "Spend by department, project, category, material group and period.",
    descAr: "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u0641\u0626\u0629 \u0648\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0641\u062A\u0631\u0629.",
    source: () => PRS.filter((p) => p.awarded != null),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.exec,
    table: (rows) => groupTable(rows, "materialGroup", [["category", (g) => g[0].category], ["prs", (g) => g.length], ["awarded", (g) => sum(g, "awarded")], ["share", (g, all) => pct(sum(g, "awarded"), sum(all, "awarded"))]]),
    columns: [C("materialGroup", "Material group", "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0648\u0627\u062F"), C("category", "Category", "\u0627\u0644\u0641\u0626\u0629"), C("prs", "Awards", "\u0627\u0644\u062A\u0631\u0633\u064A\u0627\u062A", "num"), C("awarded", "Spend", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642", "money"), C("share", "Share", "\u0627\u0644\u062D\u0635\u0629", "pct")],
    kpis: [
      K("Total spend", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u0646\u0641\u0627\u0642", "money", sumOf("awarded"), ["Sum of awarded values in the period.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u0645\u0631\u0633\u0627\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629."]),
      K("Awards", "\u0627\u0644\u062A\u0631\u0633\u064A\u0627\u062A", "num", cnt(), ["Number of awarded requests.", "\u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0627\u0629."]),
      K("Avg award value", "\u0645\u062A\u0648\u0633\u0637 \u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0631\u0633\u064A\u0629", "money", avgOf("awarded"), ["Total spend \xF7 number of awards.", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u0646\u0641\u0627\u0642 \xF7 \u0639\u062F\u062F \u0627\u0644\u062A\u0631\u0633\u064A\u0627\u062A."]),
      K("Top category share", "\u062D\u0635\u0629 \u0627\u0644\u0641\u0626\u0629 \u0627\u0644\u0623\u0639\u0644\u0649", "pct", (rows) => topShare(rows, "category", "awarded"), ["Share of spend in the largest category.", "\u062D\u0635\u0629 \u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0641\u064A \u0627\u0644\u0641\u0626\u0629 \u0627\u0644\u0623\u0643\u0628\u0631."])
    ],
    charts: [G("Spend by category", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629", "donut", by("category"), sumOf("awarded"), "money"), G("Spend by department", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"), sumOf("awarded"), "money"), G("Spend by quarter", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0631\u0628\u0639 \u0627\u0644\u0633\u0646\u0648\u064A", "bar", quarter("created"), sumOf("awarded"), "money")]
  },
  {
    id: "pipeline",
    group: "A",
    icon: "pipeline",
    en: "Procurement Pipeline",
    ar: "\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A",
    descEn: "Requests at each stage, expected value, ageing and upcoming milestones.",
    descAr: "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0641\u064A \u0643\u0644 \u0645\u0631\u062D\u0644\u0629 \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629 \u0648\u0627\u0644\u062A\u0642\u0627\u062F\u0645 \u0648\u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u0642\u0627\u062F\u0645\u0629.",
    source: () => PRS.filter(open),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.exec,
    sortKey: "dueMilestone",
    columns: [C("id", "PR ID", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("stage", "Stage", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629"), C("value", "Expected value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629", "money"), C("daysPending", "Ageing", "\u0627\u0644\u062A\u0642\u0627\u062F\u0645", "days"), C("dueMilestone", "Next milestone", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629", "date")],
    kpis: [
      K("In pipeline", "\u0642\u064A\u062F \u0627\u0644\u0645\u0633\u0627\u0631", "num", cnt(), ["Requests submitted and not yet approved or rejected.", "\u0637\u0644\u0628\u0627\u062A \u0645\u0642\u062F\u0645\u0629 \u0648\u0644\u0645 \u062A\u064F\u0639\u062A\u0645\u062F \u0623\u0648 \u062A\u064F\u0631\u0641\u0636 \u0628\u0639\u062F."]),
      K("Expected value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629", "money", sumOf("value"), ["Sum of estimated values in the pipeline.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u0627\u0631."]),
      K("Avg ageing", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0642\u0627\u062F\u0645", "days", avgOf("daysPending"), ["Average days since the request entered its current stage.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u064A\u0627\u0645 \u0645\u0646\u0630 \u062F\u062E\u0648\u0644 \u0627\u0644\u0637\u0644\u0628 \u0645\u0631\u062D\u0644\u062A\u0647 \u0627\u0644\u062D\u0627\u0644\u064A\u0629."], void 0, "down"),
      K("Milestones in 14 days", "\u0645\u0631\u0627\u062D\u0644 \u062E\u0644\u0627\u0644 14 \u064A\u0648\u0645\u064B\u0627", "num", cnt((r) => +new Date(r.dueMilestone) - NOW <= 14 * 864e5), ["Requests with a milestone due in the next 14 days.", "\u0637\u0644\u0628\u0627\u062A \u0644\u0647\u0627 \u0645\u0631\u062D\u0644\u0629 \u0645\u0633\u062A\u062D\u0642\u0629 \u062E\u0644\u0627\u0644 14 \u064A\u0648\u0645\u064B\u0627."], (r) => +new Date(r.dueMilestone) - NOW <= 14 * 864e5)
    ],
    charts: [G("Requests by stage", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "bar", by("stage")), G("Value by stage", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "hbar", by("stage"), sumOf("value"), "money"), G("Ageing bands", "\u0634\u0631\u0627\u0626\u062D \u0627\u0644\u062A\u0642\u0627\u062F\u0645", "donut", (r) => ageBand(r.daysPending))]
  },
  {
    id: "trends",
    group: "A",
    icon: "trend",
    en: "Procurement Trends",
    ar: "\u0627\u062A\u062C\u0627\u0647\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A",
    descEn: "Monthly and quarterly request volume, spend and growth.",
    descAr: "\u062D\u062C\u0645 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0648\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0648\u0627\u0644\u0646\u0645\u0648 \u0634\u0647\u0631\u064A\u064B\u0627 \u0648\u0631\u0628\u0639 \u0633\u0646\u0648\u064A\u064B\u0627.",
    source: prRows,
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.exec,
    table: (rows) => groupTable(rows, (r) => String(r.created).slice(0, 7), [["prs", (g) => g.length], ["value", (g) => sum(g, "value")], ["awarded", (g) => sum(g, "awarded")]], "period").sort((a, b) => a.period.localeCompare(b.period)).map((r, i, a) => ({ ...r, growth: i ? pct(r.value - a[i - 1].value, a[i - 1].value || 1) : 0 })),
    columns: [C("period", "Month", "\u0627\u0644\u0634\u0647\u0631"), C("prs", "Requests", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A", "num"), C("value", "Requested value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", "money"), C("awarded", "Spend", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642", "money"), C("growth", "MoM growth", "\u0627\u0644\u0646\u0645\u0648 \u0627\u0644\u0634\u0647\u0631\u064A", "pct")],
    kpis: [
      K("Requests", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A", "num", cnt(), ["Requests created in the period.", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0646\u0634\u0623\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629."]),
      K("Requested value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", "money", sumOf("value"), ["Sum of estimated values.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629."]),
      K("Monthly average", "\u0627\u0644\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0634\u0647\u0631\u064A", "num", (rows) => rows.length / Math.max(1, new Set(rows.map((r) => String(r.created).slice(0, 7))).size), ["Requests \xF7 months with activity.", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \xF7 \u0627\u0644\u0623\u0634\u0647\u0631 \u0627\u0644\u062A\u064A \u0628\u0647\u0627 \u0646\u0634\u0627\u0637."]),
      K("Spend", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642", "money", sumOf("awarded"), ["Sum of awarded values.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u0645\u0631\u0633\u0627\u0629."])
    ],
    charts: [G("Monthly volume", "\u0627\u0644\u062D\u062C\u0645 \u0627\u0644\u0634\u0647\u0631\u064A", "line", month("created")), G("Monthly value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0634\u0647\u0631\u064A\u0629", "line", month("created"), sumOf("value"), "money"), G("Quarterly spend", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0631\u0628\u0639 \u0627\u0644\u0633\u0646\u0648\u064A", "bar", quarter("created"), sumOf("awarded"), "money")]
  },
  {
    id: "cycle",
    group: "A",
    icon: "clock",
    en: "Procurement Cycle Time",
    ar: "\u0632\u0645\u0646 \u062F\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A",
    descEn: "Average time from PR submission to RFP, award and PO.",
    descAr: "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0632\u0645\u0646 \u0645\u0646 \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0637\u0644\u0628 \u062D\u062A\u0649 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629 \u0648\u0627\u0644\u062A\u0631\u0633\u064A\u0629 \u0648\u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621.",
    source: () => PRS.filter((p) => p.poDays != null).map((p) => ({ ...p, cycle: cycle(p) })),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.exec,
    sortKey: "cycle",
    columns: [C("id", "PR ID", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("method", "Method", "\u0627\u0644\u0637\u0631\u064A\u0642\u0629"), C("rfpDays", "PR \u2192 RFP", "\u0627\u0644\u0637\u0644\u0628 \u2190 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "days"), C("awardDays", "RFP \u2192 Award", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629 \u2190 \u0627\u0644\u062A\u0631\u0633\u064A\u0629", "days"), C("poDays", "Award \u2192 PO", "\u0627\u0644\u062A\u0631\u0633\u064A\u0629 \u2190 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "days"), C("cycle", "Total cycle", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u0648\u0631\u0629", "days")],
    kpis: [
      K("Avg PR \u2192 RFP", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0637\u0644\u0628 \u2190 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "days", avgOf("rfpDays"), ["Average days from PR submission to RFP publication.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u064A\u0627\u0645 \u0645\u0646 \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0637\u0644\u0628 \u062D\u062A\u0649 \u0637\u0631\u062D \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629."], void 0, "down"),
      K("Avg RFP \u2192 Award", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629 \u2190 \u0627\u0644\u062A\u0631\u0633\u064A\u0629", "days", avgOf("awardDays"), ["Average days from RFP publication to award.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u064A\u0627\u0645 \u0645\u0646 \u0627\u0644\u0637\u0631\u062D \u062D\u062A\u0649 \u0627\u0644\u062A\u0631\u0633\u064A\u0629."], void 0, "down"),
      K("Avg Award \u2192 PO", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0631\u0633\u064A\u0629 \u2190 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "days", avgOf("poDays"), ["Average days from award to PO in SAP ECC.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u064A\u0627\u0645 \u0645\u0646 \u0627\u0644\u062A\u0631\u0633\u064A\u0629 \u062D\u062A\u0649 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621."], void 0, "down"),
      K("Avg total cycle", "\u0645\u062A\u0648\u0633\u0637 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u0648\u0631\u0629", "days", avgOf("cycle"), ["Sum of the three stage durations, averaged.", "\u0645\u062A\u0648\u0633\u0637 \u0645\u062C\u0645\u0648\u0639 \u0645\u062F\u062F \u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062B\u0644\u0627\u062B."], (r) => r.cycle > 90, "down")
    ],
    charts: [G("Avg cycle by department", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062F\u0648\u0631\u0629 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"), avgOf("cycle"), "days"), G("Avg cycle by method", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062F\u0648\u0631\u0629 \u062D\u0633\u0628 \u0627\u0644\u0637\u0631\u064A\u0642\u0629", "bar", by("method"), avgOf("cycle"), "days"), G("Cycle-time bands", "\u0634\u0631\u0627\u0626\u062D \u0632\u0645\u0646 \u0627\u0644\u062F\u0648\u0631\u0629", "donut", (r) => r.cycle <= 45 ? "\u2264 45 days" : r.cycle <= 75 ? "46\u201375 days" : r.cycle <= 100 ? "76\u2013100 days" : "100+ days")]
  },
  {
    id: "methods",
    group: "A",
    icon: "route",
    en: "Procurement Method Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0637\u0631\u0642 \u0627\u0644\u0634\u0631\u0627\u0621",
    descEn: "RFI, RFQ, RFP, tender and other procurement routes.",
    descAr: "\u0637\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A\u060C \u0637\u0644\u0628 \u0623\u0633\u0639\u0627\u0631\u060C \u0645\u0646\u0627\u0641\u0633\u0629\u060C \u0645\u0646\u0627\u0642\u0635\u0629 \u0648\u063A\u064A\u0631\u0647\u0627 \u0645\u0646 \u0637\u0631\u0642 \u0627\u0644\u0634\u0631\u0627\u0621.",
    source: prRows,
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.exec,
    table: (rows) => groupTable(rows, "method", [["prs", (g) => g.length], ["value", (g) => sum(g, "value")], ["share", (g, all) => pct(g.length, all.length)], ["avgValue", (g) => avg(g, "value")], ["cycle", (g) => avg(g.filter((r) => r.poDays != null).map((r) => ({ c: cycle(r) })), "c")]]),
    columns: [C("method", "Method", "\u0627\u0644\u0637\u0631\u064A\u0642\u0629"), C("prs", "Requests", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A", "num"), C("share", "Share of requests", "\u062D\u0635\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A", "pct"), C("value", "Total value", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("avgValue", "Avg value", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("cycle", "Avg cycle", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062F\u0648\u0631\u0629", "days")],
    kpis: [
      K("Methods used", "\u0627\u0644\u0637\u0631\u0642 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629", "num", (rows) => new Set(rows.map((r) => r.method)).size, ["Distinct procurement routes used.", "\u0639\u062F\u062F \u0637\u0631\u0642 \u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u062E\u062A\u0644\u0641\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629."]),
      K("Competitive share", "\u062D\u0635\u0629 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "pct", (rows) => pct(rows.filter((r) => ["RFP", "Public tender", "Limited tender"].includes(r.method)).length, rows.length), ["RFP + public/limited tenders \xF7 all requests.", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0648\u0627\u0644\u0645\u0646\u0627\u0642\u0635\u0627\u062A \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062A."], (r) => ["RFP", "Public tender", "Limited tender"].includes(r.method), "up"),
      K("Direct purchase share", "\u062D\u0635\u0629 \u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u0628\u0627\u0634\u0631", "pct", (rows) => pct(rows.filter((r) => r.method === "Direct purchase").length, rows.length), ["Direct purchases \xF7 all requests.", "\u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062A."], (r) => r.method === "Direct purchase", "down"),
      K("E-Market share", "\u062D\u0635\u0629 \u0633\u0648\u0642 \u0627\u0639\u062A\u0645\u0627\u062F", "pct", (rows) => pct(rows.filter((r) => r.method === "Etimad E-Market").length, rows.length), ["Etimad E-Market orders \xF7 all requests.", "\u0637\u0644\u0628\u0627\u062A \u0633\u0648\u0642 \u0627\u0639\u062A\u0645\u0627\u062F \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062A."], (r) => r.method === "Etimad E-Market")
    ],
    charts: [G("Requests by method", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0637\u0631\u064A\u0642\u0629", "donut", by("method")), G("Value by method", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0637\u0631\u064A\u0642\u0629", "hbar", by("method"), sumOf("value"), "money"), G("Method mix by quarter", "\u0645\u0632\u064A\u062C \u0627\u0644\u0637\u0631\u0642 \u0631\u0628\u0639 \u0627\u0644\u0633\u0646\u0648\u064A", "bar", quarter("created"))]
  },
  // ── B. Purchase Request Reports ───────────────────────────────────────────
  {
    id: "pr-register",
    group: "B",
    icon: "list",
    en: "PR Register",
    ar: "\u0633\u062C\u0644 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621",
    descEn: "PR ID, requester, department, project, value, status, created date.",
    descAr: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0648\u0645\u0642\u062F\u0651\u0645\u0647 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0648\u0627\u0644\u062D\u0627\u0644\u0629 \u0648\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621.",
    source: prRows,
    dateKey: "created",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.all,
    sortKey: "created",
    columns: PR_COLS,
    kpis: [
      K("Requests", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A", "num", cnt(), ["All purchase requests in the period.", "\u062C\u0645\u064A\u0639 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621 \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629."]),
      K("Total value", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0642\u064A\u0645\u0629", "money", sumOf("value"), ["Sum of estimated values.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629."]),
      K("Approved", "\u0645\u0639\u062A\u0645\u062F\u0629", "num", cnt((r) => r.status === "Approved"), ["Requests fully approved.", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644."], (r) => r.status === "Approved", "up"),
      K("In progress", "\u0642\u064A\u062F \u0627\u0644\u062A\u0646\u0641\u064A\u0630", "num", cnt(open), ["Submitted, under review or returned.", "\u0645\u0642\u062F\u0645\u0629 \u0623\u0648 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0623\u0648 \u0645\u0639\u0627\u062F\u0629."], open)
    ],
    charts: [G("Requests by status", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062D\u0627\u0644\u0629", "donut", by("status")), G("Requests by department", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"))]
  },
  {
    id: "pr-status",
    group: "B",
    icon: "status",
    en: "PR Status Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A",
    descEn: "Draft, submitted, under review, returned, approved, rejected.",
    descAr: "\u0645\u0633\u0648\u062F\u0629\u060C \u0645\u0642\u062F\u0645\u060C \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629\u060C \u0645\u0639\u0627\u062F\u060C \u0645\u0639\u062A\u0645\u062F\u060C \u0645\u0631\u0641\u0648\u0636.",
    source: prRows,
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.proc,
    table: (rows) => groupTable(rows, "status", [["prs", (g) => g.length], ["share", (g, all) => pct(g.length, all.length)], ["value", (g) => sum(g, "value")], ["avgAge", (g) => avg(g, "daysPending")]]),
    columns: [C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status"), C("prs", "Requests", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A", "num"), C("share", "Share", "\u0627\u0644\u062D\u0635\u0629", "pct"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("avgAge", "Avg days pending", "\u0645\u062A\u0648\u0633\u0637 \u0623\u064A\u0627\u0645 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", "days")],
    kpis: ["Draft", "Submitted", "Under review", "Returned", "Approved", "Rejected"].map((s) => K(s, { Draft: "\u0645\u0633\u0648\u062F\u0629", Submitted: "\u0645\u0642\u062F\u0645", "Under review": "\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629", Returned: "\u0645\u0639\u0627\u062F", Approved: "\u0645\u0639\u062A\u0645\u062F", Rejected: "\u0645\u0631\u0641\u0648\u0636" }[s], "num", cnt((r) => r.status === s), [`Requests currently in "${s}".`, `\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0641\u064A \u062D\u0627\u0644\u0629 "${s}".`], (r) => r.status === s)),
    charts: [G("Status mix", "\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062D\u0627\u0644\u0627\u062A", "donut", by("status")), G("Status by department", "\u0627\u0644\u062D\u0627\u0644\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department")), G("Approved per month", "\u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0634\u0647\u0631\u064A\u064B\u0627", "line", month("created"), (rows) => rows.filter((r) => r.status === "Approved").length)]
  },
  {
    id: "pr-ageing",
    group: "B",
    icon: "hourglass",
    en: "PR Ageing Report",
    ar: "\u062A\u0642\u0631\u064A\u0631 \u062A\u0642\u0627\u062F\u0645 \u0627\u0644\u0637\u0644\u0628\u0627\u062A",
    descEn: "Days pending, current owner, current stage, overdue status.",
    descAr: "\u0623\u064A\u0627\u0645 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0648\u0627\u0644\u0645\u0627\u0644\u0643 \u0627\u0644\u062D\u0627\u0644\u064A \u0648\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0648\u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0623\u062E\u0631.",
    source: () => PRS.filter(open).map((p) => ({ ...p, overdue: p.daysPending > 15 ? "Overdue" : "On track" })),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.proc,
    sortKey: "daysPending",
    columns: [C("id", "PR ID", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("stage", "Current stage", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629"), C("owner", "Current owner", "\u0627\u0644\u0645\u0627\u0644\u0643 \u0627\u0644\u062D\u0627\u0644\u064A"), C("daysPending", "Days pending", "\u0623\u064A\u0627\u0645 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", "days"), C("overdue", "Overdue status", "\u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0623\u062E\u0631", "status"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money")],
    kpis: [
      K("Open requests", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629", "num", cnt(), ["Requests awaiting action.", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0625\u062C\u0631\u0627\u0621."]),
      K("Overdue", "\u0645\u062A\u0623\u062E\u0631\u0629", "num", cnt((r) => r.daysPending > 15), ["Pending more than 15 working days in the current stage.", "\u0645\u0646\u062A\u0638\u0631\u0629 \u0623\u0643\u062B\u0631 \u0645\u0646 15 \u064A\u0648\u0645 \u0639\u0645\u0644 \u0641\u064A \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629."], (r) => r.daysPending > 15, "down"),
      K("Avg days pending", "\u0645\u062A\u0648\u0633\u0637 \u0623\u064A\u0627\u0645 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631", "days", avgOf("daysPending"), ["Average days in the current stage.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u064A\u0627\u0645 \u0641\u064A \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629."], void 0, "down"),
      K("Oldest (days)", "\u0627\u0644\u0623\u0642\u062F\u0645 (\u0623\u064A\u0627\u0645)", "days", (rows) => Math.max(0, ...rows.map((r) => r.daysPending)), ["Longest pending request.", "\u0623\u0637\u0648\u0644 \u0637\u0644\u0628 \u0645\u0646\u062A\u0638\u0631."], void 0, "down")
    ],
    charts: [G("Ageing bands", "\u0634\u0631\u0627\u0626\u062D \u0627\u0644\u062A\u0642\u0627\u062F\u0645", "bar", (r) => ageBand(r.daysPending)), G("Pending by owner", "\u0627\u0644\u0645\u0639\u0644\u0642 \u062D\u0633\u0628 \u0627\u0644\u0645\u0627\u0644\u0643", "hbar", by("owner"), "count", "num", 8), G("Pending by stage", "\u0627\u0644\u0645\u0639\u0644\u0642 \u062D\u0633\u0628 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "donut", by("stage"))]
  },
  {
    id: "pr-returns",
    group: "B",
    icon: "return",
    en: "PR Rejection & Return Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0631\u0641\u0636 \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A",
    descEn: "Rejection reasons, return reasons, department and frequency.",
    descAr: "\u0623\u0633\u0628\u0627\u0628 \u0627\u0644\u0631\u0641\u0636 \u0648\u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u062A\u0643\u0631\u0627\u0631.",
    source: () => PRS.filter((p) => p.status === "Returned" || p.status === "Rejected").map((p) => ({ ...p, reason: p.returnReason ?? p.rejectReason, outcome: p.status })),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.proc,
    columns: [C("id", "PR ID", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("outcome", "Outcome", "\u0627\u0644\u0646\u062A\u064A\u062C\u0629", "status"), C("reason", "Reason", "\u0627\u0644\u0633\u0628\u0628"), C("owner", "By", "\u0628\u0648\u0627\u0633\u0637\u0629"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("created", "Created", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621", "date")],
    kpis: [
      K("Returned", "\u0645\u0639\u0627\u062F\u0629", "num", cnt((r) => r.status === "Returned"), ["Requests returned for correction.", "\u0637\u0644\u0628\u0627\u062A \u0623\u0639\u064A\u062F\u062A \u0644\u0644\u062A\u0635\u062D\u064A\u062D."], (r) => r.status === "Returned", "down"),
      K("Rejected", "\u0645\u0631\u0641\u0648\u0636\u0629", "num", cnt((r) => r.status === "Rejected"), ["Requests rejected.", "\u0637\u0644\u0628\u0627\u062A \u0645\u0631\u0641\u0648\u0636\u0629."], (r) => r.status === "Rejected", "down"),
      K("Return rate", "\u0645\u0639\u062F\u0644 \u0627\u0644\u0625\u0639\u0627\u062F\u0629", "pct", (rows) => pct(rows.filter((r) => r.status === "Returned").length, PRS.filter((p) => p.status !== "Draft").length), ["Returned \xF7 all submitted requests.", "\u0627\u0644\u0645\u0639\u0627\u062F\u0629 \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0642\u062F\u0645\u0629."], void 0, "down"),
      K("Top reason share", "\u062D\u0635\u0629 \u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u0623\u0639\u0644\u0649", "pct", (rows) => topShare(rows, "reason"), ["Share of the most frequent reason.", "\u062D\u0635\u0629 \u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u0623\u0643\u062B\u0631 \u062A\u0643\u0631\u0627\u0631\u064B\u0627."])
    ],
    charts: [G("By reason", "\u062D\u0633\u0628 \u0627\u0644\u0633\u0628\u0628", "hbar", by("reason")), G("By department", "\u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "bar", by("department")), G("Return vs reject", "\u0627\u0644\u0625\u0639\u0627\u062F\u0629 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0631\u0641\u0636", "donut", by("outcome"))]
  },
  {
    id: "pr-budget",
    group: "B",
    icon: "wallet",
    en: "PR Budget Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A",
    descEn: "Requested amount, allocated budget, available budget, variance.",
    descAr: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0648\u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0627\u0644\u0645\u062E\u0635\u0635\u0629 \u0648\u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0648\u0627\u0644\u0641\u0631\u0642.",
    source: () => PRS.map((p) => ({ ...p, variance: p.budgetAvailable - p.value, fit: p.budgetAvailable >= p.value ? "Within budget" : "Over budget" })),
    dateKey: "created",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ["Finance", "Department Managers"],
    sortKey: "variance",
    columns: [C("id", "PR ID", "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("value", "Requested", "\u0627\u0644\u0645\u0637\u0644\u0648\u0628", "money"), C("budgetAllocated", "Allocated", "\u0627\u0644\u0645\u062E\u0635\u0635", "money"), C("budgetAvailable", "Available", "\u0627\u0644\u0645\u062A\u0627\u062D", "money"), C("variance", "Variance", "\u0627\u0644\u0641\u0631\u0642", "money"), C("fit", "Budget fit", "\u0645\u0644\u0627\u0621\u0645\u0629 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629", "status")],
    kpis: [
      K("Requested", "\u0627\u0644\u0645\u0637\u0644\u0648\u0628", "money", sumOf("value"), ["Sum of requested amounts.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629."]),
      K("Allocated", "\u0627\u0644\u0645\u062E\u0635\u0635", "money", sumOf("budgetAllocated"), ["Sum of allocated budget lines.", "\u0645\u062C\u0645\u0648\u0639 \u0628\u0646\u0648\u062F \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0627\u0644\u0645\u062E\u0635\u0635\u0629."]),
      K("Available", "\u0627\u0644\u0645\u062A\u0627\u062D", "money", sumOf("budgetAvailable"), ["Allocated \u2212 consumed \u2212 committed (SAP FM).", "\u0627\u0644\u0645\u062E\u0635\u0635 \u2212 \u0627\u0644\u0645\u0633\u062A\u0647\u0644\u0643 \u2212 \u0627\u0644\u0645\u0631\u062A\u0628\u0637 (\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u0645\u0648\u0627\u0644)."]),
      K("Over budget", "\u0641\u0648\u0642 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629", "num", cnt((r) => r.variance < 0), ["Requests whose value exceeds the available budget.", "\u0637\u0644\u0628\u0627\u062A \u062A\u062A\u062C\u0627\u0648\u0632 \u0642\u064A\u0645\u062A\u0647\u0627 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u0627\u0644\u0645\u062A\u0627\u062D\u0629."], (r) => r.variance < 0, "down")
    ],
    charts: [G("Budget fit", "\u0645\u0644\u0627\u0621\u0645\u0629 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629", "donut", by("fit")), G("Variance by department", "\u0627\u0644\u0641\u0631\u0642 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"), sumOf("variance"), "money"), G("Requested vs available", "\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0645\u062A\u0627\u062D", "bar", by("category"), sumOf("value"), "money")]
  },
  {
    id: "pr-items",
    group: "B",
    icon: "box",
    en: "PR Item Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0628\u0646\u0648\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A",
    descEn: "Items, material groups, quantities, estimated prices and values.",
    descAr: "\u0627\u0644\u0628\u0646\u0648\u062F \u0648\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629.",
    source: prRows,
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.proc,
    table: (rows) => groupTable(rows, "materialGroup", [["category", (g) => g[0].category], ["items", (g) => sum(g, "items")], ["qty", (g) => sum(g, "qty")], ["value", (g) => sum(g, "value")], ["unit", (g) => sum(g, "value") / Math.max(1, sum(g, "qty"))]]),
    columns: [C("materialGroup", "Material group", "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0648\u0627\u062F"), C("category", "Category", "\u0627\u0644\u0641\u0626\u0629"), C("items", "Line items", "\u0627\u0644\u0628\u0646\u0648\u062F", "num"), C("qty", "Quantity", "\u0627\u0644\u0643\u0645\u064A\u0629", "num"), C("unit", "Avg est. unit price", "\u0645\u062A\u0648\u0633\u0637 \u0633\u0639\u0631 \u0627\u0644\u0648\u062D\u062F\u0629", "money"), C("value", "Est. value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629", "money")],
    kpis: [
      K("Line items", "\u0627\u0644\u0628\u0646\u0648\u062F", "num", sumOf("items"), ["Total BOQ line items across requests.", "\u0625\u062C\u0645\u0627\u0644\u064A \u0628\u0646\u0648\u062F \u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u0643\u0645\u064A\u0627\u062A."]),
      K("Quantity", "\u0627\u0644\u0643\u0645\u064A\u0629", "num", sumOf("qty"), ["Total requested quantity.", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629."]),
      K("Material groups", "\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F", "num", (rows) => new Set(rows.map((r) => r.materialGroup)).size, ["Distinct material groups.", "\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u062E\u062A\u0644\u0641\u0629."]),
      K("Est. value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629", "money", sumOf("value"), ["Sum of estimated values.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629."])
    ],
    charts: [G("Value by material group", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0645\u0648\u0627\u062F", "hbar", by("materialGroup"), sumOf("value"), "money"), G("Items by category", "\u0627\u0644\u0628\u0646\u0648\u062F \u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629", "donut", by("category"), sumOf("items"))]
  },
  // ── C. RFP & Sourcing Reports ─────────────────────────────────────────────
  {
    id: "rfp-register",
    group: "C",
    icon: "file",
    en: "RFP Register",
    ar: "\u0633\u062C\u0644 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A",
    descEn: "RFP ID, title, procurement type, value, status and owner.",
    descAr: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0646\u0648\u0639 \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0648\u0627\u0644\u062D\u0627\u0644\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u0643.",
    source: () => RFPS,
    dateKey: "created",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.proc,
    sortKey: "created",
    columns: [C("id", "RFP ID", "\u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("type", "Procurement type", "\u0646\u0648\u0639 \u0627\u0644\u0634\u0631\u0627\u0621"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status"), C("owner", "Owner", "\u0627\u0644\u0645\u0627\u0644\u0643")],
    kpis: [
      K("RFPs", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A", "num", cnt(), ["Sourcing events in the period.", "\u0623\u062D\u062F\u0627\u062B \u0627\u0644\u062A\u0648\u0631\u064A\u062F \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629."]),
      K("Total value", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0642\u064A\u0645\u0629", "money", sumOf("value"), ["Sum of RFP estimated values.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0644\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A."]),
      K("Awarded", "\u0645\u0631\u0633\u0627\u0629", "num", cnt((r) => r.status === "Awarded"), ["RFPs awarded.", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0627\u0629."], (r) => r.status === "Awarded", "up"),
      K("Open", "\u0645\u0641\u062A\u0648\u062D\u0629", "num", cnt((r) => r.status !== "Awarded"), ["RFPs not yet awarded.", "\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0644\u0645 \u062A\u064F\u0631\u0633\u064E \u0628\u0639\u062F."], (r) => r.status !== "Awarded")
    ],
    charts: [G("RFPs by status", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062D\u0627\u0644\u0629", "donut", by("status")), G("Value by type", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "hbar", by("type"), sumOf("value"), "money")]
  },
  {
    id: "rfp-pipeline",
    group: "C",
    icon: "stages",
    en: "RFP Pipeline",
    ar: "\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A",
    descEn: "RFPs by preparation, review, sourcing, evaluation and award stage.",
    descAr: "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u062D\u0633\u0628 \u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F \u0648\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u0648\u0631\u064A\u062F \u0648\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0633\u064A\u0629.",
    source: () => RFPS.filter((r) => r.status !== "Awarded"),
    dateKey: "created",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.proc,
    table: (rows) => ["Preparation", "Review", "Sourcing", "Evaluation", "Award"].map((s) => {
      const g = rows.filter((r) => r.status === s);
      return { status: s, rfps: g.length, value: sum(g, "value"), share: pct(g.length, rows.length) };
    }),
    columns: [C("status", "Stage", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629", "status"), C("rfps", "RFPs", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A", "num"), C("share", "Share", "\u0627\u0644\u062D\u0635\u0629", "pct"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money")],
    kpis: ["Preparation", "Review", "Sourcing", "Evaluation", "Award"].map((s) => K(s, { Preparation: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F", Review: "\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629", Sourcing: "\u0627\u0644\u062A\u0648\u0631\u064A\u062F", Evaluation: "\u0627\u0644\u062A\u0642\u064A\u064A\u0645", Award: "\u0627\u0644\u062A\u0631\u0633\u064A\u0629" }[s], "num", cnt((r) => r.status === s), [`RFPs currently in ${s}.`, `\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0641\u064A \u0645\u0631\u062D\u0644\u0629 ${s}.`], (r) => r.status === s)),
    charts: [G("RFPs by stage", "\u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "bar", by("status")), G("Value by stage", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "donut", by("status"), sumOf("value"), "money")]
  },
  {
    id: "rfp-review",
    group: "C",
    icon: "review",
    en: "RFP Review Performance",
    ar: "\u0623\u062F\u0627\u0621 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A",
    descEn: "Department-wise review status and turnaround time.",
    descAr: "\u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632 \u0644\u0643\u0644 \u0625\u062F\u0627\u0631\u0629.",
    source: () => RFPS,
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.proc,
    table: (rows) => groupTable(rows, "reviewDept", [["reviews", (g) => g.length], ["done", (g) => g.filter((r) => r.reviewStatus === "Completed").length], ["overdue", (g) => g.filter((r) => r.reviewStatus === "Overdue").length], ["tat", (g) => avg(g, "reviewDays")]]),
    columns: [C("reviewDept", "Reviewing department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629"), C("reviews", "Reviews", "\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A", "num"), C("done", "Completed", "\u0645\u0643\u062A\u0645\u0644\u0629", "num"), C("overdue", "Overdue", "\u0645\u062A\u0623\u062E\u0631\u0629", "num"), C("tat", "Avg turnaround", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632", "days")],
    kpis: [
      K("Reviews", "\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A", "num", cnt(), ["Department reviews requested.", "\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0627\u062A."]),
      K("Completed", "\u0645\u0643\u062A\u0645\u0644\u0629", "pct", (rows) => pct(rows.filter((r) => r.reviewStatus === "Completed").length, rows.length), ["Completed \xF7 all reviews.", "\u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629 \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A."], (r) => r.reviewStatus === "Completed", "up"),
      K("Overdue", "\u0645\u062A\u0623\u062E\u0631\u0629", "num", cnt((r) => r.reviewStatus === "Overdue"), ["Reviews past their SLA.", "\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u062A\u062C\u0627\u0648\u0632\u062A \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629."], (r) => r.reviewStatus === "Overdue", "down"),
      K("Avg turnaround", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632", "days", avgOf("reviewDays"), ["Average working days per review.", "\u0645\u062A\u0648\u0633\u0637 \u0623\u064A\u0627\u0645 \u0627\u0644\u0639\u0645\u0644 \u0644\u0643\u0644 \u0645\u0631\u0627\u062C\u0639\u0629."], void 0, "down")
    ],
    charts: [G("Turnaround by department", "\u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("reviewDept"), avgOf("reviewDays"), "days"), G("Review status", "\u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629", "donut", by("reviewStatus"))]
  },
  {
    id: "sourcing-perf",
    group: "C",
    icon: "speed",
    en: "Sourcing Performance",
    ar: "\u0623\u062F\u0627\u0621 \u0627\u0644\u062A\u0648\u0631\u064A\u062F",
    descEn: "Time taken to publish, receive bids, evaluate and award.",
    descAr: "\u0627\u0644\u0632\u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u063A\u0631\u0642 \u0644\u0644\u0637\u0631\u062D \u0648\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0633\u064A\u0629.",
    source: () => RFPS.filter((r) => ["Sourcing", "Evaluation", "Award", "Awarded"].includes(r.status)).map((r) => ({ ...r, total: r.publishDays + r.bidDays + r.evalDays + r.awardDays })),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.proc,
    sortKey: "total",
    columns: [C("id", "RFP ID", "\u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("publishDays", "To publish", "\u062D\u062A\u0649 \u0627\u0644\u0637\u0631\u062D", "days"), C("bidDays", "Bid period", "\u0641\u062A\u0631\u0629 \u0627\u0644\u0639\u0631\u0648\u0636", "days"), C("evalDays", "Evaluation", "\u0627\u0644\u062A\u0642\u064A\u064A\u0645", "days"), C("awardDays", "To award", "\u062D\u062A\u0649 \u0627\u0644\u062A\u0631\u0633\u064A\u0629", "days"), C("total", "Total", "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A", "days")],
    kpis: [
      K("Avg to publish", "\u0645\u062A\u0648\u0633\u0637 \u062D\u062A\u0649 \u0627\u0644\u0637\u0631\u062D", "days", avgOf("publishDays"), ["Days from approval to publication on Etimad.", "\u0627\u0644\u0623\u064A\u0627\u0645 \u0645\u0646 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u062D\u062A\u0649 \u0627\u0644\u0637\u0631\u062D \u0639\u0644\u0649 \u0627\u0639\u062A\u0645\u0627\u062F."], void 0, "down"),
      K("Avg bid period", "\u0645\u062A\u0648\u0633\u0637 \u0641\u062A\u0631\u0629 \u0627\u0644\u0639\u0631\u0648\u0636", "days", avgOf("bidDays"), ["Days the RFP is open for bids.", "\u0627\u0644\u0623\u064A\u0627\u0645 \u0627\u0644\u062A\u064A \u062A\u0628\u0642\u0649 \u0641\u064A\u0647\u0627 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629 \u0645\u0641\u062A\u0648\u062D\u0629."]),
      K("Avg evaluation", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0642\u064A\u064A\u0645", "days", avgOf("evalDays"), ["Days from bid opening to evaluation sign-off.", "\u0627\u0644\u0623\u064A\u0627\u0645 \u0645\u0646 \u0641\u062A\u062D \u0627\u0644\u0639\u0631\u0648\u0636 \u062D\u062A\u0649 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u062A\u0642\u064A\u064A\u0645."], void 0, "down"),
      K("Avg end-to-end", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0645\u062F\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629", "days", avgOf("total"), ["Publish + bid + evaluation + award.", "\u0627\u0644\u0637\u0631\u062D + \u0627\u0644\u0639\u0631\u0648\u0636 + \u0627\u0644\u062A\u0642\u064A\u064A\u0645 + \u0627\u0644\u062A\u0631\u0633\u064A\u0629."], (r) => r.total > 70, "down")
    ],
    charts: [G("End-to-end by type", "\u0627\u0644\u0645\u062F\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "bar", by("type"), avgOf("total"), "days"), G("End-to-end by department", "\u0627\u0644\u0645\u062F\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"), avgOf("total"), "days")]
  },
  {
    id: "participation",
    group: "C",
    icon: "users",
    en: "Tender Participation",
    ar: "\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0641\u064A \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A",
    descEn: "Number of invited suppliers, participants and qualified suppliers.",
    descAr: "\u0639\u062F\u062F \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0627\u0644\u0645\u062F\u0639\u0648\u064A\u0646 \u0648\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u064A\u0646 \u0648\u0627\u0644\u0645\u0624\u0647\u0644\u064A\u0646.",
    source: () => RFPS.filter((r) => ["Evaluation", "Award", "Awarded"].includes(r.status)).map((r) => ({ ...r, rate: pct(r.participants, r.invited) })),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.proc,
    columns: [C("id", "RFP ID", "\u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("type", "Type", "\u0627\u0644\u0646\u0648\u0639"), C("invited", "Invited", "\u0627\u0644\u0645\u062F\u0639\u0648\u0648\u0646", "num"), C("participants", "Participants", "\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0648\u0646", "num"), C("qualified", "Qualified", "\u0627\u0644\u0645\u0624\u0647\u0644\u0648\u0646", "num"), C("rate", "Participation", "\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629", "pct")],
    kpis: [
      K("Invited", "\u0627\u0644\u0645\u062F\u0639\u0648\u0648\u0646", "num", sumOf("invited"), ["Suppliers invited across RFPs.", "\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646 \u0627\u0644\u0645\u062F\u0639\u0648\u0648\u0646 \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A."]),
      K("Participants", "\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0648\u0646", "num", sumOf("participants"), ["Suppliers who submitted a bid.", "\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646 \u0627\u0644\u0630\u064A\u0646 \u0642\u062F\u0645\u0648\u0627 \u0639\u0631\u0648\u0636\u064B\u0627."]),
      K("Qualified", "\u0627\u0644\u0645\u0624\u0647\u0644\u0648\u0646", "num", sumOf("qualified"), ["Bidders passing qualification.", "\u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0648\u0646 \u0627\u0644\u0630\u064A\u0646 \u0627\u062C\u062A\u0627\u0632\u0648\u0627 \u0627\u0644\u062A\u0623\u0647\u064A\u0644."]),
      K("Participation rate", "\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629", "pct", (rows) => pct(sum(rows, "participants"), sum(rows, "invited")), ["Participants \xF7 invited.", "\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0648\u0646 \xF7 \u0627\u0644\u0645\u062F\u0639\u0648\u0648\u0646."], (r) => r.rate < 50, "up")
    ],
    charts: [G("Avg participants by type", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u064A\u0646 \u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "bar", by("type"), avgOf("participants")), G("Participation by department", "\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"), (rows) => pct(sum(rows, "participants"), sum(rows, "invited")), "pct")]
  },
  {
    id: "bid-eval",
    group: "C",
    icon: "scale",
    en: "Bid Evaluation Summary",
    ar: "\u0645\u0644\u062E\u0635 \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0639\u0631\u0648\u0636",
    descEn: "Technical scores, commercial scores, rankings and outcomes.",
    descAr: "\u0627\u0644\u062F\u0631\u062C\u0627\u062A \u0627\u0644\u0641\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0648\u0627\u0644\u0646\u062A\u0627\u0626\u062C.",
    source: () => RFPS.filter((r) => ["Evaluation", "Award", "Awarded"].includes(r.status)).map((r) => ({ ...r, combined: Math.round(r.techScore * 0.7 + r.commScore * 0.3) })),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ["Evaluation Committees", "Procurement"],
    sortKey: "combined",
    columns: [C("id", "RFP ID", "\u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("supplier", "Top-ranked supplier", "\u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u0623\u0648\u0644"), C("techScore", "Technical", "\u0627\u0644\u0641\u0646\u064A", "num"), C("commScore", "Commercial", "\u0627\u0644\u0645\u0627\u0644\u064A", "num"), C("combined", "Combined (70/30)", "\u0627\u0644\u0645\u062C\u0645\u0639 (70/30)", "num"), C("rank", "Rank", "\u0627\u0644\u062A\u0631\u062A\u064A\u0628", "num"), C("outcome", "Outcome", "\u0627\u0644\u0646\u062A\u064A\u062C\u0629", "status")],
    kpis: [
      K("Evaluated", "\u0645\u0642\u064A\u0645\u0629", "num", cnt(), ["RFPs with completed or ongoing evaluation.", "\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0628\u062A\u0642\u064A\u064A\u0645 \u0645\u0643\u062A\u0645\u0644 \u0623\u0648 \u062C\u0627\u0631\u064D."]),
      K("Avg technical", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0641\u0646\u064A", "num", avgOf("techScore"), ["Average technical score of the top bidder.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062F\u0631\u062C\u0629 \u0627\u0644\u0641\u0646\u064A\u0629 \u0644\u0644\u0645\u062A\u0642\u062F\u0645 \u0627\u0644\u0623\u0648\u0644."], void 0, "up"),
      K("Avg commercial", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0645\u0627\u0644\u064A", "num", avgOf("commScore"), ["Average commercial score of the top bidder.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062F\u0631\u062C\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u062A\u0642\u062F\u0645 \u0627\u0644\u0623\u0648\u0644."], void 0, "up"),
      K("Below 70 technical", "\u0623\u0642\u0644 \u0645\u0646 70 \u0641\u0646\u064A\u064B\u0627", "num", cnt((r) => r.techScore < 70), ["Top bidder scored under the 70% passing mark.", "\u0627\u0644\u0645\u062A\u0642\u062F\u0645 \u0627\u0644\u0623\u0648\u0644 \u0623\u0642\u0644 \u0645\u0646 \u062F\u0631\u062C\u0629 \u0627\u0644\u0627\u062C\u062A\u064A\u0627\u0632 70\u066A."], (r) => r.techScore < 70, "down")
    ],
    charts: [G("Outcomes", "\u0627\u0644\u0646\u062A\u0627\u0626\u062C", "donut", by("outcome")), G("Avg combined score by type", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062F\u0631\u062C\u0629 \u0627\u0644\u0645\u062C\u0645\u0639\u0629 \u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "bar", by("type"), avgOf("combined"))]
  },
  {
    id: "savings",
    group: "C",
    icon: "savings",
    en: "Sourcing Savings",
    ar: "\u0648\u0641\u0648\u0631\u0627\u062A \u0627\u0644\u062A\u0648\u0631\u064A\u062F",
    descEn: "Estimated value vs awarded value, savings and percentage.",
    descAr: "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0645\u0631\u0633\u0627\u0629 \u0648\u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A \u0648\u0646\u0633\u0628\u062A\u0647\u0627.",
    source: () => RFPS.filter((r) => r.awarded != null).map((r) => ({ ...r, saving: r.value - (r.awarded ?? 0), savingPct: pct(r.value - (r.awarded ?? 0), r.value) })),
    dateKey: "created",
    filters: ["department", "project", "category"],
    roles: ROLES.exec,
    sortKey: "saving",
    columns: [C("id", "RFP ID", "\u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0627\u0641\u0633\u0629", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("value", "Estimated", "\u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629", "money"), C("awarded", "Awarded", "\u0627\u0644\u0645\u0631\u0633\u0627\u0629", "money"), C("saving", "Savings", "\u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A", "money"), C("savingPct", "Savings %", "\u0646\u0633\u0628\u0629 \u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A", "pct")],
    kpis: [
      K("Estimated", "\u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629", "money", sumOf("value"), ["Sum of estimated values of awarded RFPs.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0644\u0644\u0645\u0646\u0627\u0641\u0633\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0627\u0629."]),
      K("Awarded", "\u0627\u0644\u0645\u0631\u0633\u0627\u0629", "money", sumOf("awarded"), ["Sum of awarded values.", "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u0645\u0631\u0633\u0627\u0629."]),
      K("Savings", "\u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A", "money", sumOf("saving"), ["Estimated \u2212 awarded.", "\u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u2212 \u0627\u0644\u0645\u0631\u0633\u0627\u0629."], void 0, "up"),
      K("Savings %", "\u0646\u0633\u0628\u0629 \u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A", "pct", (rows) => pct(sum(rows, "saving"), sum(rows, "value")), ["Savings \xF7 estimated value.", "\u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A \xF7 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629."], (r) => r.savingPct >= 15, "up")
    ],
    charts: [G("Savings by category", "\u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629", "hbar", by("category"), sumOf("saving"), "money"), G("Savings by department", "\u0627\u0644\u0648\u0641\u0648\u0631\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "bar", by("department"), sumOf("saving"), "money")]
  },
  // ── D. Work Engine & Approval Reports ─────────────────────────────────────
  {
    id: "task-distribution",
    group: "D",
    icon: "tasks",
    en: "Task Distribution",
    ar: "\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0645\u0647\u0627\u0645",
    descEn: "Tasks by department, task type, owner and status.",
    descAr: "\u0627\u0644\u0645\u0647\u0627\u0645 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0646\u0648\u0639 \u0627\u0644\u0645\u0647\u0645\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u0643 \u0648\u0627\u0644\u062D\u0627\u0644\u0629.",
    source: () => TASKS,
    dateKey: "assigned",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.ops,
    sortKey: "assigned",
    columns: [C("id", "Task", "\u0627\u0644\u0645\u0647\u0645\u0629", "mono"), C("type", "Type", "\u0627\u0644\u0646\u0648\u0639"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("owner", "Owner", "\u0627\u0644\u0645\u0627\u0644\u0643"), C("stage", "Stage", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629"), C("request", "Request", "\u0627\u0644\u0637\u0644\u0628", "mono"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status"), C("assigned", "Assigned", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0633\u0646\u0627\u062F", "date")],
    kpis: [
      K("Tasks", "\u0627\u0644\u0645\u0647\u0627\u0645", "num", cnt(), ["Tasks created by the Work Engine.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0646\u0634\u0623\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 \u0645\u062D\u0631\u0643 \u0627\u0644\u0639\u0645\u0644."]),
      K("Pending", "\u0645\u0639\u0644\u0642\u0629", "num", cnt((r) => r.status === "Pending"), ["Assigned and not yet completed.", "\u0645\u0633\u0646\u062F\u0629 \u0648\u0644\u0645 \u062A\u0643\u062A\u0645\u0644 \u0628\u0639\u062F."], (r) => r.status === "Pending"),
      K("Overdue", "\u0645\u062A\u0623\u062E\u0631\u0629", "num", cnt((r) => r.status === "Overdue"), ["Past their SLA and still open.", "\u062A\u062C\u0627\u0648\u0632\u062A \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629 \u0648\u0645\u0627 \u0632\u0627\u0644\u062A \u0645\u0641\u062A\u0648\u062D\u0629."], (r) => r.status === "Overdue", "down"),
      K("Completed", "\u0645\u0643\u062A\u0645\u0644\u0629", "num", cnt((r) => r.status === "Completed"), ["Tasks completed.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629."], (r) => r.status === "Completed", "up")
    ],
    charts: [G("Tasks by department", "\u0627\u0644\u0645\u0647\u0627\u0645 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department")), G("Tasks by type", "\u0627\u0644\u0645\u0647\u0627\u0645 \u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "donut", by("type")), G("Tasks by owner", "\u0627\u0644\u0645\u0647\u0627\u0645 \u062D\u0633\u0628 \u0627\u0644\u0645\u0627\u0644\u0643", "bar", by("owner"), "count", "num", 8)]
  },
  {
    id: "pending-approvals",
    group: "D",
    icon: "approval",
    en: "Pending Approvals",
    ar: "\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
    descEn: "Pending tasks, approver, value and ageing.",
    descAr: "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0648\u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0648\u0627\u0644\u062A\u0642\u0627\u062F\u0645.",
    source: () => TASKS.filter((t) => t.status !== "Completed"),
    dateKey: "assigned",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.ops,
    sortKey: "ageingDays",
    columns: [C("id", "Task", "\u0627\u0644\u0645\u0647\u0645\u0629", "mono"), C("type", "Type", "\u0627\u0644\u0646\u0648\u0639"), C("owner", "Approver", "\u0627\u0644\u0645\u0639\u062A\u0645\u062F"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("request", "Request", "\u0627\u0644\u0637\u0644\u0628", "mono"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("ageingDays", "Ageing", "\u0627\u0644\u062A\u0642\u0627\u062F\u0645", "days"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status")],
    kpis: [
      K("Pending", "\u0645\u0639\u0644\u0642\u0629", "num", cnt(), ["Open approval tasks.", "\u0645\u0647\u0627\u0645 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629."]),
      K("Value pending", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629", "money", sumOf("value"), ["Request value held in pending approvals.", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u062D\u062A\u062C\u0632\u0629 \u0641\u064A \u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0645\u0639\u0644\u0642\u0629."]),
      K("Avg ageing", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0642\u0627\u062F\u0645", "days", avgOf("ageingDays"), ["Average days a task has been open.", "\u0645\u062A\u0648\u0633\u0637 \u0623\u064A\u0627\u0645 \u0641\u062A\u062D \u0627\u0644\u0645\u0647\u0645\u0629."], void 0, "down"),
      K("Older than 7 days", "\u0623\u0642\u062F\u0645 \u0645\u0646 7 \u0623\u064A\u0627\u0645", "num", cnt((r) => r.ageingDays > 7), ["Pending for more than 7 days.", "\u0645\u0639\u0644\u0642\u0629 \u0644\u0623\u0643\u062B\u0631 \u0645\u0646 7 \u0623\u064A\u0627\u0645."], (r) => r.ageingDays > 7, "down")
    ],
    charts: [G("Pending by approver", "\u0627\u0644\u0645\u0639\u0644\u0642 \u062D\u0633\u0628 \u0627\u0644\u0645\u0639\u062A\u0645\u062F", "hbar", by("owner")), G("Ageing bands", "\u0634\u0631\u0627\u0626\u062D \u0627\u0644\u062A\u0642\u0627\u062F\u0645", "bar", (r) => ageBand(r.ageingDays)), G("Value by department", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "donut", by("department"), sumOf("value"), "money")]
  },
  {
    id: "dept-review",
    group: "D",
    icon: "dept",
    en: "Department Review Performance",
    ar: "\u0623\u062F\u0627\u0621 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0627\u062A",
    descEn: "IT, Finance, Legal, Cybersecurity turnaround.",
    descAr: "\u0632\u0645\u0646 \u0625\u0646\u062C\u0627\u0632 \u062A\u0642\u0646\u064A\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0648\u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0648\u0627\u0644\u0623\u0645\u0646 \u0627\u0644\u0633\u064A\u0628\u0631\u0627\u0646\u064A.",
    source: () => TASKS.filter((t) => t.status === "Completed"),
    dateKey: "assigned",
    filters: ["department", "project", "category"],
    roles: ROLES.ops,
    table: (rows) => groupTable(rows, "department", [["done", (g) => g.length], ["tat", (g) => avg(g, "resolvedHours")], ["sla", (g) => pct(g.filter((r) => r.withinSla).length, g.length)], ["rework", (g) => g.filter((r) => r.rework > 0).length]]),
    columns: [C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("done", "Reviews completed", "\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629", "num"), C("tat", "Avg turnaround", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632", "hours"), C("sla", "Within SLA", "\u0636\u0645\u0646 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629", "pct"), C("rework", "With rework", "\u0645\u0639 \u0625\u0639\u0627\u062F\u0629 \u0639\u0645\u0644", "num")],
    kpis: [
      K("Reviews completed", "\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629", "num", cnt(), ["Completed review tasks.", "\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629."]),
      K("Avg turnaround", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632", "hours", avgOf("resolvedHours"), ["Average hours from assignment to completion.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0645\u0646 \u0627\u0644\u0625\u0633\u0646\u0627\u062F \u062D\u062A\u0649 \u0627\u0644\u0625\u0646\u062C\u0627\u0632."], void 0, "down"),
      K("Within SLA", "\u0636\u0645\u0646 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629", "pct", (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), ["Completed within SLA \xF7 completed.", "\u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629 \u0636\u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \xF7 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629."], (r) => !r.withinSla, "up"),
      K("Slowest department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u0628\u0637\u0623 (\u0633\u0627\u0639\u0627\u062A)", "hours", (rows) => Math.max(0, ...Object.values(groupBy(rows, "department")).map((g) => avg(g, "resolvedHours"))), ["Highest average turnaround of any department.", "\u0623\u0639\u0644\u0649 \u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0625\u0646\u062C\u0627\u0632 \u0628\u064A\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0627\u062A."], void 0, "down")
    ],
    charts: [G("Avg turnaround by department", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "hbar", by("department"), avgOf("resolvedHours"), "hours"), G("Within SLA by department", "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "bar", by("department"), (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), "pct")]
  },
  {
    id: "bottlenecks",
    group: "D",
    icon: "bottleneck",
    en: "Approval Bottleneck Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0627\u062E\u062A\u0646\u0627\u0642\u0627\u062A \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F",
    descEn: "Stages and departments contributing most to delays.",
    descAr: "\u0627\u0644\u0645\u0631\u0627\u062D\u0644 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u0627\u062A \u0627\u0644\u0623\u0643\u062B\u0631 \u0625\u0633\u0647\u0627\u0645\u064B\u0627 \u0641\u064A \u0627\u0644\u062A\u0623\u062E\u064A\u0631.",
    source: () => TASKS.map((t) => ({ ...t, delay: Math.max(0, (t.resolvedHours ?? t.ageingDays * 24) - t.slaHours) })),
    dateKey: "assigned",
    filters: ["department", "project", "category"],
    roles: ROLES.ops,
    table: (rows) => groupTable(rows, (r) => `${r.stage} \xB7 ${r.department}`, [["stage", (g) => g[0].stage], ["department", (g) => g[0].department], ["tasks", (g) => g.length], ["late", (g) => g.filter((r) => r.delay > 0).length], ["delay", (g) => sum(g, "delay")]], "key").sort((a, b) => b.delay - a.delay).slice(0, 25),
    columns: [C("stage", "Stage", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("tasks", "Tasks", "\u0627\u0644\u0645\u0647\u0627\u0645", "num"), C("late", "Late tasks", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629", "num"), C("delay", "Delay hours", "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u062A\u0623\u062E\u064A\u0631", "hours")],
    kpis: [
      K("Delay hours", "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u062A\u0623\u062E\u064A\u0631", "hours", sumOf("delay"), ["Hours beyond SLA across all tasks.", "\u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0628\u0639\u062F \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629 \u0644\u0643\u0644 \u0627\u0644\u0645\u0647\u0627\u0645."], (r) => r.delay > 0, "down"),
      K("Late tasks", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629", "num", cnt((r) => r.delay > 0), ["Tasks that exceeded SLA.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u062A\u064A \u062A\u062C\u0627\u0648\u0632\u062A \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629."], (r) => r.delay > 0, "down"),
      K("Worst stage share", "\u062D\u0635\u0629 \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0623\u0633\u0648\u0623", "pct", (rows) => topShare(rows, "stage", "delay"), ["Share of delay hours in the worst stage.", "\u062D\u0635\u0629 \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u062A\u0623\u062E\u064A\u0631 \u0641\u064A \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0623\u0633\u0648\u0623."], void 0, "down"),
      K("Worst department share", "\u062D\u0635\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u0633\u0648\u0623", "pct", (rows) => topShare(rows, "department", "delay"), ["Share of delay hours in the worst department.", "\u062D\u0635\u0629 \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u062A\u0623\u062E\u064A\u0631 \u0641\u064A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u0633\u0648\u0623."], void 0, "down")
    ],
    charts: [G("Delay hours by stage", "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u062A\u0623\u062E\u064A\u0631 \u062D\u0633\u0628 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "hbar", by("stage"), sumOf("delay"), "hours"), G("Delay hours by department", "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u062A\u0623\u062E\u064A\u0631 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "bar", by("department"), sumOf("delay"), "hours")]
  },
  {
    id: "sla",
    group: "D",
    icon: "sla",
    en: "SLA Compliance",
    ar: "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629",
    descEn: "Within SLA, breached SLA, average resolution time.",
    descAr: "\u0636\u0645\u0646 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629\u060C \u0627\u0644\u0645\u062A\u062C\u0627\u0648\u0632\u060C \u0648\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u062D\u0644.",
    source: () => TASKS.map((t) => ({ ...t, slaState: t.withinSla ? "Within SLA" : "Breached" })),
    dateKey: "assigned",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.ops,
    columns: [C("id", "Task", "\u0627\u0644\u0645\u0647\u0645\u0629", "mono"), C("type", "Type", "\u0627\u0644\u0646\u0648\u0639"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("slaHours", "SLA", "\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629", "hours"), C("resolvedHours", "Resolution time", "\u0632\u0645\u0646 \u0627\u0644\u062D\u0644", "hours"), C("slaState", "SLA status", "\u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649", "status"), C("status", "Task status", "\u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0647\u0645\u0629", "status")],
    kpis: [
      K("Within SLA", "\u0636\u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0648\u0649", "pct", (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), ["Tasks within SLA \xF7 all tasks.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0636\u0645\u0646 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0647\u0627\u0645."], (r) => r.withinSla, "up"),
      K("Breached", "\u0645\u062A\u062C\u0627\u0648\u0632\u0629", "num", cnt((r) => !r.withinSla), ["Tasks that breached SLA.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u062A\u062C\u0627\u0648\u0632\u0629 \u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629."], (r) => !r.withinSla, "down"),
      K("Avg resolution", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u062D\u0644", "hours", avgOf("resolvedHours"), ["Average hours to complete a task.", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0644\u0625\u0646\u062C\u0627\u0632 \u0627\u0644\u0645\u0647\u0645\u0629."], void 0, "down"),
      K("Avg SLA", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0645\u0633\u062A\u0648\u0649", "hours", avgOf("slaHours"), ["Average SLA target in hours.", "\u0645\u062A\u0648\u0633\u0637 \u0647\u062F\u0641 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062E\u062F\u0645\u0629 \u0628\u0627\u0644\u0633\u0627\u0639\u0627\u062A."])
    ],
    charts: [G("SLA status", "\u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0633\u062A\u0648\u0649", "donut", by("slaState")), G("Within SLA by month", "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0634\u0647\u0631\u064A\u064B\u0627", "line", month("assigned"), (rows) => pct(rows.filter((r) => r.withinSla).length, rows.length), "pct"), G("Breaches by task type", "\u0627\u0644\u062A\u062C\u0627\u0648\u0632\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "hbar", by("type"), (rows) => rows.filter((r) => !r.withinSla).length)]
  },
  {
    id: "task-completion",
    group: "D",
    icon: "check",
    en: "Task Completion Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0625\u0646\u062C\u0627\u0632 \u0627\u0644\u0645\u0647\u0627\u0645",
    descEn: "Assigned vs completed tasks, completion time and rework.",
    descAr: "\u0627\u0644\u0645\u0633\u0646\u062F\u0629 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629 \u0648\u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632 \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0639\u0645\u0644.",
    source: () => TASKS,
    dateKey: "assigned",
    filters: ["department", "project", "category"],
    roles: ROLES.ops,
    table: (rows) => groupTable(rows, "owner", [["assigned", (g) => g.length], ["completed", (g) => g.filter((r) => r.status === "Completed").length], ["rate", (g) => pct(g.filter((r) => r.status === "Completed").length, g.length)], ["time", (g) => avg(g, "resolvedHours")], ["rework", (g) => sum(g, "rework")]]),
    columns: [C("owner", "Owner", "\u0627\u0644\u0645\u0627\u0644\u0643"), C("assigned", "Assigned", "\u0627\u0644\u0645\u0633\u0646\u062F\u0629", "num"), C("completed", "Completed", "\u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629", "num"), C("rate", "Completion rate", "\u0645\u0639\u062F\u0644 \u0627\u0644\u0625\u0646\u062C\u0627\u0632", "pct"), C("time", "Avg completion time", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0625\u0646\u062C\u0627\u0632", "hours"), C("rework", "Rework loops", "\u062F\u0648\u0631\u0627\u062A \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0639\u0645\u0644", "num")],
    kpis: [
      K("Assigned", "\u0627\u0644\u0645\u0633\u0646\u062F\u0629", "num", cnt(), ["Tasks assigned in the period.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0633\u0646\u062F\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629."]),
      K("Completed", "\u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629", "num", cnt((r) => r.status === "Completed"), ["Tasks completed.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629."], (r) => r.status === "Completed", "up"),
      K("Completion rate", "\u0645\u0639\u062F\u0644 \u0627\u0644\u0625\u0646\u062C\u0627\u0632", "pct", (rows) => pct(rows.filter((r) => r.status === "Completed").length, rows.length), ["Completed \xF7 assigned.", "\u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629 \xF7 \u0627\u0644\u0645\u0633\u0646\u062F\u0629."], void 0, "up"),
      K("Rework rate", "\u0645\u0639\u062F\u0644 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0639\u0645\u0644", "pct", (rows) => pct(rows.filter((r) => r.rework > 0).length, rows.length), ["Tasks returned at least once \xF7 all tasks.", "\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0639\u0627\u062F\u0629 \u0645\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0647\u0627\u0645."], (r) => r.rework > 0, "down")
    ],
    charts: [G("Completed per month", "\u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629 \u0634\u0647\u0631\u064A\u064B\u0627", "line", month("assigned"), (rows) => rows.filter((r) => r.status === "Completed").length), G("Completion rate by type", "\u0645\u0639\u062F\u0644 \u0627\u0644\u0625\u0646\u062C\u0627\u0632 \u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "hbar", by("type"), (rows) => pct(rows.filter((r) => r.status === "Completed").length, rows.length), "pct")]
  },
  {
    id: "exceptions",
    group: "D",
    icon: "alert",
    en: "Workflow Exception Report",
    ar: "\u062A\u0642\u0631\u064A\u0631 \u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A \u0633\u064A\u0631 \u0627\u0644\u0639\u0645\u0644",
    descEn: "Failed transitions, blocked tasks and unresolved dependencies.",
    descAr: "\u0627\u0644\u0627\u0646\u062A\u0642\u0627\u0644\u0627\u062A \u0627\u0644\u0641\u0627\u0634\u0644\u0629 \u0648\u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u062D\u062C\u0648\u0628\u0629 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u064A\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062D\u0644\u0648\u0644\u0629.",
    source: () => EXCEPTIONS,
    dateKey: "since",
    filters: ["department", "status"],
    statusKey: "status",
    roles: ["Work Engine Admin"],
    sortKey: "since",
    columns: [C("id", "Exception", "\u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621", "mono"), C("kind", "Type", "\u0627\u0644\u0646\u0648\u0639"), C("detail", "Detail", "\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644"), C("task", "Task", "\u0627\u0644\u0645\u0647\u0645\u0629", "mono"), C("stage", "Stage", "\u0627\u0644\u0645\u0631\u062D\u0644\u0629"), C("severity", "Severity", "\u0627\u0644\u062E\u0637\u0648\u0631\u0629", "status"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status"), C("since", "Since", "\u0645\u0646\u0630", "date")],
    kpis: [
      K("Open exceptions", "\u0627\u0644\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629", "num", cnt((r) => r.status !== "Resolved"), ["Exceptions not yet resolved.", "\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A \u0644\u0645 \u062A\u064F\u062D\u0644 \u0628\u0639\u062F."], (r) => r.status !== "Resolved", "down"),
      K("Failed transitions", "\u0627\u0646\u062A\u0642\u0627\u0644\u0627\u062A \u0641\u0627\u0634\u0644\u0629", "num", cnt((r) => r.kind === "Failed transition"), ["Workflow steps that failed to move on.", "\u062E\u0637\u0648\u0627\u062A \u0644\u0645 \u062A\u0646\u062A\u0642\u0644 \u0644\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629."], (r) => r.kind === "Failed transition", "down"),
      K("Blocked tasks", "\u0645\u0647\u0627\u0645 \u0645\u062D\u062C\u0648\u0628\u0629", "num", cnt((r) => r.kind === "Blocked task"), ["Tasks that cannot be actioned.", "\u0645\u0647\u0627\u0645 \u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0646\u0641\u064A\u0630\u0647\u0627."], (r) => r.kind === "Blocked task", "down"),
      K("High severity", "\u062E\u0637\u0648\u0631\u0629 \u0639\u0627\u0644\u064A\u0629", "num", cnt((r) => r.severity === "High"), ["High-severity exceptions.", "\u0627\u0633\u062A\u062B\u0646\u0627\u0621\u0627\u062A \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062E\u0637\u0648\u0631\u0629."], (r) => r.severity === "High", "down")
    ],
    charts: [G("By type", "\u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639", "donut", by("kind")), G("By stage", "\u062D\u0633\u0628 \u0627\u0644\u0645\u0631\u062D\u0644\u0629", "hbar", by("stage"))]
  },
  // ── E. Purchase Order & Contract Reports ──────────────────────────────────
  {
    id: "po-register",
    group: "E",
    icon: "po",
    en: "PO Register",
    ar: "\u0633\u062C\u0644 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621",
    descEn: "PO number, supplier, value, date, status and project.",
    descAr: "\u0631\u0642\u0645 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u0645\u0648\u0631\u062F \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0648\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0648\u0627\u0644\u062D\u0627\u0644\u0629 \u0648\u0627\u0644\u0645\u0634\u0631\u0648\u0639.",
    source: () => POS,
    dateKey: "date",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.proc,
    sortKey: "date",
    columns: [C("id", "PO number", "\u0631\u0642\u0645 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "mono"), C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("project", "Project", "\u0627\u0644\u0645\u0634\u0631\u0648\u0639"), C("department", "Department", "\u0627\u0644\u0625\u062F\u0627\u0631\u0629"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("date", "Date", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E", "date"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status")],
    kpis: [
      K("POs", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "num", cnt(), ["Purchase orders issued.", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0635\u0627\u062F\u0631\u0629."]),
      K("PO value", "\u0642\u064A\u0645\u0629 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "money", sumOf("value"), ["Sum of PO values.", "\u0645\u062C\u0645\u0648\u0639 \u0642\u064A\u0645 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621."]),
      K("Open", "\u0645\u0641\u062A\u0648\u062D\u0629", "num", cnt((r) => ["Open", "Partially received"].includes(r.status)), ["Open or partially received POs.", "\u0623\u0648\u0627\u0645\u0631 \u0645\u0641\u062A\u0648\u062D\u0629 \u0623\u0648 \u0645\u0633\u062A\u0644\u0645\u0629 \u062C\u0632\u0626\u064A\u064B\u0627."], (r) => ["Open", "Partially received"].includes(r.status)),
      K("Suppliers", "\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646", "num", (rows) => new Set(rows.map((r) => r.supplier)).size, ["Distinct suppliers.", "\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646 \u0627\u0644\u0645\u062E\u062A\u0644\u0641\u0648\u0646."])
    ],
    charts: [G("POs by status", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u062D\u0633\u0628 \u0627\u0644\u062D\u0627\u0644\u0629", "donut", by("status")), G("PO value per month", "\u0642\u064A\u0645\u0629 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0634\u0647\u0631\u064A\u064B\u0627", "line", month("date"), sumOf("value"), "money")]
  },
  {
    id: "po-spend",
    group: "E",
    icon: "chart",
    en: "PO Spend Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0639\u0644\u0649 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621",
    descEn: "PO value by category, supplier and department.",
    descAr: "\u0642\u064A\u0645\u0629 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629 \u0648\u0627\u0644\u0645\u0648\u0631\u062F \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u0629.",
    source: () => POS.filter((p) => p.status !== "Cancelled"),
    dateKey: "date",
    filters: ["department", "project", "category"],
    roles: ROLES.exec,
    table: (rows) => groupTable(rows, "supplier", [["pos", (g) => g.length], ["value", (g) => sum(g, "value")], ["share", (g, all) => pct(sum(g, "value"), sum(all, "value"))], ["categories", (g) => new Set(g.map((r) => r.category)).size]]),
    columns: [C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("pos", "POs", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "num"), C("value", "Spend", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642", "money"), C("share", "Share", "\u0627\u0644\u062D\u0635\u0629", "pct"), C("categories", "Categories", "\u0627\u0644\u0641\u0626\u0627\u062A", "num")],
    kpis: [
      K("PO spend", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642", "money", sumOf("value"), ["Sum of non-cancelled PO values.", "\u0645\u062C\u0645\u0648\u0639 \u0642\u064A\u0645 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u063A\u064A\u0631 \u0627\u0644\u0645\u0644\u063A\u0627\u0629."]),
      K("Suppliers", "\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646", "num", (rows) => new Set(rows.map((r) => r.supplier)).size, ["Distinct suppliers paid.", "\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646 \u0627\u0644\u0645\u062E\u062A\u0644\u0641\u0648\u0646."]),
      K("Top supplier share", "\u062D\u0635\u0629 \u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u0623\u0643\u0628\u0631", "pct", (rows) => topShare(rows, "supplier", "value"), ["Share of spend with the largest supplier.", "\u062D\u0635\u0629 \u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0645\u0639 \u0623\u0643\u0628\u0631 \u0645\u0648\u0631\u062F."], void 0, "down"),
      K("Avg PO value", "\u0645\u062A\u0648\u0633\u0637 \u0642\u064A\u0645\u0629 \u0627\u0644\u0623\u0645\u0631", "money", avgOf("value"), ["Spend \xF7 number of POs.", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \xF7 \u0639\u062F\u062F \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621."])
    ],
    charts: [G("Spend by category", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629", "donut", by("category"), sumOf("value"), "money"), G("Top suppliers", "\u0623\u0643\u0628\u0631 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646", "hbar", by("supplier"), sumOf("value"), "money", 8), G("Spend by department", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629", "bar", by("department"), sumOf("value"), "money")]
  },
  {
    id: "contract-register",
    group: "E",
    icon: "contract",
    en: "Contract Register",
    ar: "\u0633\u062C\u0644 \u0627\u0644\u0639\u0642\u0648\u062F",
    descEn: "Contract number, supplier, start/end date, value and status.",
    descAr: "\u0631\u0642\u0645 \u0627\u0644\u0639\u0642\u062F \u0648\u0627\u0644\u0645\u0648\u0631\u062F \u0648\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u0648\u0627\u0644\u0646\u0647\u0627\u064A\u0629 \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0648\u0627\u0644\u062D\u0627\u0644\u0629.",
    source: () => CONTRACTS,
    dateKey: "start",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ["Contract Managers", "Procurement"],
    sortKey: "end",
    columns: [C("id", "Contract", "\u0627\u0644\u0639\u0642\u062F", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("start", "Start", "\u0627\u0644\u0628\u062F\u0627\u064A\u0629", "date"), C("end", "End", "\u0627\u0644\u0646\u0647\u0627\u064A\u0629", "date"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status")],
    kpis: [
      K("Contracts", "\u0627\u0644\u0639\u0642\u0648\u062F", "num", cnt(), ["Contracts in the register.", "\u0627\u0644\u0639\u0642\u0648\u062F \u0641\u064A \u0627\u0644\u0633\u062C\u0644."]),
      K("Contract value", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0642\u0648\u062F", "money", sumOf("value"), ["Sum of contract values.", "\u0645\u062C\u0645\u0648\u0639 \u0642\u064A\u0645 \u0627\u0644\u0639\u0642\u0648\u062F."]),
      K("Active", "\u0633\u0627\u0631\u064A\u0629", "num", cnt((r) => r.status === "Active"), ["Contracts currently active.", "\u0627\u0644\u0639\u0642\u0648\u062F \u0627\u0644\u0633\u0627\u0631\u064A\u0629 \u062D\u0627\u0644\u064A\u064B\u0627."], (r) => r.status === "Active"),
      K("Expiring \u2264 90 days", "\u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 90 \u064A\u0648\u0645\u064B\u0627", "num", cnt((r) => r.status === "Expiring"), ["Contracts ending within 90 days.", "\u0639\u0642\u0648\u062F \u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 90 \u064A\u0648\u0645\u064B\u0627."], (r) => r.status === "Expiring", "down")
    ],
    charts: [G("Contracts by status", "\u0627\u0644\u0639\u0642\u0648\u062F \u062D\u0633\u0628 \u0627\u0644\u062D\u0627\u0644\u0629", "donut", by("status")), G("Value by supplier", "\u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0648\u0631\u062F", "hbar", by("supplier"), sumOf("value"), "money", 8)]
  },
  {
    id: "contract-expiry",
    group: "E",
    icon: "calendar",
    en: "Contract Expiry",
    ar: "\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0639\u0642\u0648\u062F",
    descEn: "Contracts expiring in 30/60/90 days.",
    descAr: "\u0627\u0644\u0639\u0642\u0648\u062F \u0627\u0644\u062A\u064A \u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 30/60/90 \u064A\u0648\u0645\u064B\u0627.",
    source: () => CONTRACTS.filter((c) => c.daysToExpiry >= 0 && c.daysToExpiry <= 120).map((c) => ({ ...c, band: c.daysToExpiry <= 30 ? "\u2264 30 days" : c.daysToExpiry <= 60 ? "31\u201360 days" : c.daysToExpiry <= 90 ? "61\u201390 days" : "91\u2013120 days" })),
    dateKey: "end",
    filters: ["department", "project", "category"],
    roles: ["Contract Managers", "Procurement"],
    sortKey: "daysToExpiry",
    columns: [C("id", "Contract", "\u0627\u0644\u0639\u0642\u062F", "mono"), C("title", "Title", "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"), C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("end", "End date", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0646\u0647\u0627\u064A\u0629", "date"), C("daysToExpiry", "Days left", "\u0627\u0644\u0623\u064A\u0627\u0645 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629", "days"), C("band", "Window", "\u0627\u0644\u0646\u0627\u0641\u0630\u0629", "status"), C("value", "Value", "\u0627\u0644\u0642\u064A\u0645\u0629", "money")],
    kpis: [
      K("\u2264 30 days", "\u062E\u0644\u0627\u0644 30 \u064A\u0648\u0645\u064B\u0627", "num", cnt((r) => r.daysToExpiry <= 30), ["Contracts ending within 30 days.", "\u0639\u0642\u0648\u062F \u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 30 \u064A\u0648\u0645\u064B\u0627."], (r) => r.daysToExpiry <= 30, "down"),
      K("31\u201360 days", "31\u201360 \u064A\u0648\u0645\u064B\u0627", "num", cnt((r) => r.daysToExpiry > 30 && r.daysToExpiry <= 60), ["Contracts ending in 31\u201360 days.", "\u0639\u0642\u0648\u062F \u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 31\u201360 \u064A\u0648\u0645\u064B\u0627."], (r) => r.daysToExpiry > 30 && r.daysToExpiry <= 60),
      K("61\u201390 days", "61\u201390 \u064A\u0648\u0645\u064B\u0627", "num", cnt((r) => r.daysToExpiry > 60 && r.daysToExpiry <= 90), ["Contracts ending in 61\u201390 days.", "\u0639\u0642\u0648\u062F \u062A\u0646\u062A\u0647\u064A \u062E\u0644\u0627\u0644 61\u201390 \u064A\u0648\u0645\u064B\u0627."], (r) => r.daysToExpiry > 60 && r.daysToExpiry <= 90),
      K("Value at risk", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0639\u0631\u0636\u0629", "money", (rows) => sum(rows.filter((r) => r.daysToExpiry <= 90), "value"), ["Value of contracts ending within 90 days.", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0642\u0648\u062F \u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u062E\u0644\u0627\u0644 90 \u064A\u0648\u0645\u064B\u0627."])
    ],
    charts: [G("Expiry window", "\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621", "bar", by("band")), G("Expiring value by supplier", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0646\u062A\u0647\u064A\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0648\u0631\u062F", "hbar", by("supplier"), sumOf("value"), "money")]
  },
  {
    id: "contract-utilisation",
    group: "E",
    icon: "gauge",
    en: "Contract Utilisation",
    ar: "\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0639\u0642\u0648\u062F",
    descEn: "Contract value, consumed value and remaining value.",
    descAr: "\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0642\u062F \u0648\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0633\u062A\u0647\u0644\u0643\u0629 \u0648\u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629.",
    source: () => CONTRACTS.filter((c) => c.status !== "Draft").map((c) => ({ ...c, remaining: Math.max(0, c.value - c.consumed), used: pct(c.consumed, c.value) })),
    dateKey: "start",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ["Contract Managers", "Finance"],
    sortKey: "used",
    columns: [C("id", "Contract", "\u0627\u0644\u0639\u0642\u062F", "mono"), C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("value", "Contract value", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0642\u062F", "money"), C("consumed", "Consumed", "\u0627\u0644\u0645\u0633\u062A\u0647\u0644\u0643", "money"), C("remaining", "Remaining", "\u0627\u0644\u0645\u062A\u0628\u0642\u064A", "money"), C("used", "Utilisation", "\u0646\u0633\u0628\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645", "pct"), C("status", "Status", "\u0627\u0644\u062D\u0627\u0644\u0629", "status")],
    kpis: [
      K("Contract value", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0642\u0648\u062F", "money", sumOf("value"), ["Sum of contract values.", "\u0645\u062C\u0645\u0648\u0639 \u0642\u064A\u0645 \u0627\u0644\u0639\u0642\u0648\u062F."]),
      K("Consumed", "\u0627\u0644\u0645\u0633\u062A\u0647\u0644\u0643", "money", sumOf("consumed"), ["Invoiced / received value against contracts.", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0641\u0648\u062A\u0631\u0629 \u0623\u0648 \u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0629 \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u0639\u0642\u0648\u062F."]),
      K("Remaining", "\u0627\u0644\u0645\u062A\u0628\u0642\u064A", "money", sumOf("remaining"), ["Contract value \u2212 consumed.", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0639\u0642\u062F \u2212 \u0627\u0644\u0645\u0633\u062A\u0647\u0644\u0643."]),
      K("Over 90% used", "\u0645\u0633\u062A\u062E\u062F\u0645\u0629 \u0641\u0648\u0642 90\u066A", "num", cnt((r) => r.used > 90), ["Contracts nearly exhausted.", "\u0639\u0642\u0648\u062F \u0634\u0627\u0631\u0641\u062A \u0639\u0644\u0649 \u0627\u0644\u0646\u0641\u0627\u062F."], (r) => r.used > 90, "down")
    ],
    charts: [G("Utilisation bands", "\u0634\u0631\u0627\u0626\u062D \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645", "bar", (r) => r.used < 25 ? "< 25%" : r.used < 50 ? "25\u201350%" : r.used < 75 ? "50\u201375%" : r.used < 90 ? "75\u201390%" : "\u2265 90%"), G("Remaining by category", "\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629", "donut", by("category"), sumOf("remaining"), "money")]
  },
  {
    id: "po-delivery",
    group: "E",
    icon: "truck",
    en: "PO Delivery Performance",
    ar: "\u0623\u062F\u0627\u0621 \u062A\u0633\u0644\u064A\u0645 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621",
    descEn: "Ordered quantity, received quantity, pending quantity and delays.",
    descAr: "\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0629 \u0648\u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0648\u0627\u0644\u062A\u0623\u062E\u064A\u0631.",
    source: () => POS.filter((p) => p.status !== "Cancelled").map((p) => ({ ...p, pendingQty: p.orderedQty - p.receivedQty, onTime: p.delayDays === 0 ? "On time" : "Delayed" })),
    dateKey: "date",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.proc,
    sortKey: "delayDays",
    columns: [C("id", "PO number", "\u0631\u0642\u0645 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "mono"), C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("orderedQty", "Ordered", "\u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", "num"), C("receivedQty", "Received", "\u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0629", "num"), C("pendingQty", "Pending", "\u0627\u0644\u0645\u0639\u0644\u0642\u0629", "num"), C("delayDays", "Delay", "\u0627\u0644\u062A\u0623\u062E\u064A\u0631", "days"), C("onTime", "Delivery", "\u0627\u0644\u062A\u0633\u0644\u064A\u0645", "status")],
    kpis: [
      K("Ordered qty", "\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", "num", sumOf("orderedQty"), ["Total ordered quantity.", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629."]),
      K("Received qty", "\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0629", "num", sumOf("receivedQty"), ["Total goods receipts.", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0629."]),
      K("On-time delivery", "\u0627\u0644\u062A\u0633\u0644\u064A\u0645 \u0641\u064A \u0627\u0644\u0645\u0648\u0639\u062F", "pct", (rows) => pct(rows.filter((r) => r.delayDays === 0).length, rows.length), ["POs with no delay \xF7 all POs.", "\u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0628\u0644\u0627 \u062A\u0623\u062E\u064A\u0631 \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0648\u0627\u0645\u0631."], (r) => r.delayDays > 0, "up"),
      K("Avg delay", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0623\u062E\u064A\u0631", "days", (rows) => avg(rows.filter((r) => r.delayDays > 0), "delayDays"), ["Average delay of delayed POs.", "\u0645\u062A\u0648\u0633\u0637 \u062A\u0623\u062E\u064A\u0631 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629."], void 0, "down")
    ],
    charts: [G("Delivery status", "\u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0633\u0644\u064A\u0645", "donut", by("onTime")), G("Avg delay by supplier", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0623\u062E\u064A\u0631 \u062D\u0633\u0628 \u0627\u0644\u0645\u0648\u0631\u062F", "hbar", by("supplier"), (rows) => avg(rows.filter((r) => r.delayDays > 0), "delayDays"), "days", 8)]
  },
  {
    id: "po-amendments",
    group: "E",
    icon: "edit",
    en: "PO Amendment Analysis",
    ar: "\u062A\u062D\u0644\u064A\u0644 \u062A\u0639\u062F\u064A\u0644\u0627\u062A \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621",
    descEn: "Change orders, revised values and amendment frequency.",
    descAr: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u063A\u064A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u0645\u0639\u062F\u0644\u0629 \u0648\u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u062A\u0639\u062F\u064A\u0644.",
    source: () => POS.filter((p) => p.amendments > 0).map((p) => ({ ...p, change: p.revisedValue - p.value, changePct: pct(p.revisedValue - p.value, p.value) })),
    dateKey: "date",
    filters: ["department", "project", "category", "status"],
    statusKey: "status",
    roles: ROLES.proc,
    sortKey: "amendments",
    columns: [C("id", "PO number", "\u0631\u0642\u0645 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", "mono"), C("supplier", "Supplier", "\u0627\u0644\u0645\u0648\u0631\u062F"), C("amendments", "Change orders", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u063A\u064A\u064A\u0631", "num"), C("value", "Original value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629", "money"), C("revisedValue", "Revised value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0639\u062F\u0644\u0629", "money"), C("change", "Change", "\u0627\u0644\u062A\u063A\u064A\u0631", "money"), C("changePct", "Change %", "\u0646\u0633\u0628\u0629 \u0627\u0644\u062A\u063A\u064A\u0631", "pct")],
    kpis: [
      K("Amended POs", "\u0623\u0648\u0627\u0645\u0631 \u0645\u0639\u062F\u0644\u0629", "num", cnt(), ["POs with at least one change order.", "\u0623\u0648\u0627\u0645\u0631 \u0628\u0647\u0627 \u0623\u0645\u0631 \u062A\u063A\u064A\u064A\u0631 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644."]),
      K("Change orders", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u063A\u064A\u064A\u0631", "num", sumOf("amendments"), ["Total change orders.", "\u0625\u062C\u0645\u0627\u0644\u064A \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u063A\u064A\u064A\u0631."]),
      K("Net value change", "\u0635\u0627\u0641\u064A \u062A\u063A\u064A\u0631 \u0627\u0644\u0642\u064A\u0645\u0629", "money", sumOf("change"), ["Revised \u2212 original value.", "\u0627\u0644\u0645\u0639\u062F\u0644\u0629 \u2212 \u0627\u0644\u0623\u0635\u0644\u064A\u0629."], void 0, "down"),
      K("Amendment rate", "\u0645\u0639\u062F\u0644 \u0627\u0644\u062A\u0639\u062F\u064A\u0644", "pct", (rows) => pct(rows.length, POS.length), ["Amended POs \xF7 all POs.", "\u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u0639\u062F\u0644\u0629 \xF7 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0648\u0627\u0645\u0631."], void 0, "down")
    ],
    charts: [G("Change orders per PO", "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u063A\u064A\u064A\u0631 \u0644\u0643\u0644 \u0623\u0645\u0631", "bar", (r) => `${r.amendments} change order${r.amendments > 1 ? "s" : ""}`), G("Value change by supplier", "\u062A\u063A\u064A\u0631 \u0627\u0644\u0642\u064A\u0645\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0648\u0631\u062F", "hbar", by("supplier"), sumOf("change"), "money", 8)]
  }
];
function groupBy(rows, key) {
  const f = typeof key === "string" ? (r) => String(r[key] ?? "\u2014") : key;
  return rows.reduce((m, r) => {
    var _a;
    (m[_a = f(r)] || (m[_a] = [])).push(r);
    return m;
  }, {});
}
function groupTable(rows, key, cols, keyName) {
  const name = keyName ?? (typeof key === "string" ? key : "key");
  return Object.entries(groupBy(rows, key)).map(([k, g]) => Object.fromEntries([[name, k], ...cols.map(([c, f]) => [c, f(g, rows)])]));
}
function topShare(rows, key, metric) {
  const g = Object.values(groupBy(rows, key)).map((x) => metric ? sum(x, metric) : x.length);
  const total = g.reduce((a, b) => a + b, 0);
  return total ? Math.max(...g) / total * 100 : 0;
}
export {
  GROUPS,
  REPORTS
};
