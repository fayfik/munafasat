import type { ProjectItemType } from '../types/tender';

/**
 * Expense categories shown against budgeted items (replaces the old Asset/Services
 * "BOQ type" display). These mirror the finance expense-type taxonomy used when a
 * budgeted line is booked.
 */
export type ExpenseType =
  | 'intangible'
  | 'tangible'
  | 'it-equipment'
  | 'communication'
  | 'consumables'
  | 'it-maintenance'
  | 'consultation';

type Badge = 'ai' | 'assets' | 'info' | 'warning' | 'consumables' | 'success' | 'services';

export const EXPENSE_TYPES: Record<ExpenseType, { en: string; ar: string; badge: Badge }> = {
  intangible:       { en: 'Intangible assets (CapEx)', ar: 'أصول غير ملموسة (رأسمالي)', badge: 'ai' },
  tangible:         { en: 'Tangible assets (CapEx)',   ar: 'أصول ملموسة (رأسمالي)',     badge: 'assets' },
  'it-equipment':   { en: 'IT Equipment (CapEx)',      ar: 'معدات تقنية (رأسمالي)',     badge: 'info' },
  communication:    { en: 'Communication Exp',         ar: 'مصروفات اتصالات',           badge: 'warning' },
  consumables:      { en: 'Consumables',               ar: 'مستهلكات',                  badge: 'consumables' },
  'it-maintenance': { en: 'IT Maintenance',            ar: 'صيانة تقنية',               badge: 'success' },
  consultation:     { en: 'Consultation',              ar: 'استشارات',                  badge: 'services' },
};

/** Keyword-driven classification of a budgeted item into an expense category. */
export function expenseTypeOf(item: { name: string; type?: ProjectItemType }): ExpenseType {
  const n = (item.name || '').toLowerCase();

  // Maintenance / support / managed — regardless of the stored item type.
  if (/\b(maintenance|support|managed|warranty|sla)\b/.test(n)) return 'it-maintenance';

  // Communication / telecom / connectivity.
  if (/\b(communication|telecom|network|internet|connectivity|bandwidth|voice|sms|line)\b/.test(n)) return 'communication';

  // Services → consulting / implementation / training are booked as consultation.
  if (item.type === 'services' || /\b(service|services|consult|consulting|implementation|integration|development|design|migration|assessment|training|advisory)\b/.test(n)) {
    return 'consultation';
  }

  // Consumables.
  if (item.type === 'consumables' || /\b(consumable|consumables|supplies|stationery)\b/.test(n)) return 'consumables';

  // Assets → split intangible vs IT equipment vs tangible.
  if (/\b(license|licence|licenses|software|subscription|subscriptions|certificate|certificates|domain|saas|platform)\b/.test(n)) return 'intangible';
  if (/\b(server|hosting|infrastructure|hardware|switch|switches|router|storage|device|devices|equipment|computer|laptop|laptops)\b/.test(n)) return 'it-equipment';

  // Default for assets.
  return 'tangible';
}
