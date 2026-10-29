// Prototype budgets for each budgeted (project) item, excl. VAT. In a real deployment
// these come from Finance's approved budget lines. Unknown items get a stable sample value.
import { PROJECTS } from '../data/mockData';

const KNOWN: Record<string, number> = {
  'item-001': 1_800_000, // ERP Software Licenses
  'item-002': 3_400_000, // Implementation & Configuration Services
  'item-003': 400_000,   // Data Migration Services
  'item-004': 150_000,   // End-User Training Program
  'item-005': 900_000,   // Annual Technical Support & Maintenance
};

function hash(s: string) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

/** Approved budget (SAR, excl. VAT) of a budgeted item, looked up by project + item name. */
export function budgetFor(projectId: string, itemName: string): number | null {
  const it = PROJECTS.find((p) => p.id === projectId)?.items.find((x) => x.name === itemName);
  if (!it) return null;
  return KNOWN[it.id] ?? (250_000 + (hash(it.id) % 36) * 50_000);
}
