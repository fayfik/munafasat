// Etimad BOQ categorisation used across the Bill of Quantities views.
// Three categories — Service / Equipment / Material — mirroring how the
// procurement team must classify each line before entering it in Etimad.
import type { BOQCategory } from '../types/tender';
import { classifyItem } from './triage';

export const BOQ_CATEGORIES: BOQCategory[] = ['service', 'equipment', 'material'];

export const BOQ_CATEGORY_META: Record<BOQCategory, { en: string; ar: string; badge: 'services' | 'assets' | 'consumables' }> = {
  service:   { en: 'Service',   ar: 'خدمة',  badge: 'services' },
  equipment: { en: 'Equipment', ar: 'معدات', badge: 'assets' },
  material:  { en: 'Material',  ar: 'مواد',  badge: 'consumables' },
};

/** Best-guess category from an item name (user can always override). */
export function deriveCategory(name: string): BOQCategory {
  if (!name || !name.trim()) return 'service';
  const bt = classifyItem({ id: 'x', name }).boqType; // manpower | services | equipment | material
  return bt === 'equipment' ? 'equipment' : bt === 'material' ? 'material' : 'service';
}
