// Expense type shown for each budgeted item in step 1 (replaces the BOQ type column).
import type { ProjectItem } from '../types/tender';

export type ExpenseType =
  | 'intangible-capex' | 'tangible-capex' | 'it-equipment-capex'
  | 'communication' | 'consumables' | 'it-maintenance' | 'consultation';

export const EXPENSE_TYPES: Record<ExpenseType, { en: string; ar: string }> = {
  'intangible-capex':   { en: 'Intangible assets (CapEx)', ar: 'أصول غير ملموسة (رأسمالية)' },
  'tangible-capex':     { en: 'Tangible assets (CapEx)',   ar: 'أصول ملموسة (رأسمالية)' },
  'it-equipment-capex': { en: 'IT Equipment (CapEx)',      ar: 'معدات تقنية (رأسمالية)' },
  'communication':      { en: 'Communication Exp',         ar: 'مصروفات اتصالات' },
  'consumables':        { en: 'Consumables',               ar: 'مستهلكات' },
  'it-maintenance':     { en: 'IT Maintenance',            ar: 'صيانة تقنية' },
  'consultation':       { en: 'Consultation',              ar: 'استشارات' },
};

// Sample budget lines → expense type.
const BY_ITEM: Record<string, ExpenseType> = {
  'item-001': 'intangible-capex', 'item-002': 'consultation', 'item-003': 'consultation', 'item-004': 'consultation', 'item-005': 'it-maintenance',
  'item-010': 'intangible-capex', 'item-011': 'consultation', 'item-012': 'consultation', 'item-013': 'it-maintenance',
  'item-020': 'intangible-capex', 'item-021': 'consultation', 'item-022': 'it-equipment-capex', 'item-023': 'communication',
  'item-101': 'intangible-capex', 'item-102': 'consultation', 'item-103': 'consultation', 'item-104': 'consultation',
  'item-401': 'tangible-capex', 'item-402': 'tangible-capex', 'item-403': 'it-equipment-capex', 'item-404': 'consumables',
};

export function expenseTypeOf(item: ProjectItem): ExpenseType {
  return BY_ITEM[item.id] ?? (item.type === 'assets' ? 'tangible-capex' : item.type === 'consumables' ? 'consumables' : 'consultation');
}
