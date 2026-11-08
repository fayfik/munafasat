// Sections an Enterprise Architecture reviewer owns on a request, and the
// standard return reasons (from the EA meeting).
import type { Task } from './types';
import { STD_GROUPS, type StdGroup } from '../lib/eaStandards';

export interface EaSection { id: string; en: string; ar: string; kind: 'scope' | 'tech' | 'licences' | 'std'; group?: StdGroup }

const EA_GROUPS: StdGroup[] = ['hosting', 'integration', 'security', 'data', 'nfr', 'docs'];
export const LICENCE_RX = /licen[cs]e|subscription|saas|renewal/i;

/** The sections EA reviews on this request (only those with content). */
export function eaSections(task: Task): EaSection[] {
  const rfp = task.rfp;
  if (!rfp) return [];
  const out: EaSection[] = [{ id: 'scope', en: 'Scope of Work', ar: 'نطاق العمل', kind: 'scope' }];
  if (rfp.techRequirements?.length) out.push({ id: 'tech', en: 'Technical requirements', ar: 'المتطلبات التقنية', kind: 'tech' });
  if (rfp.boq.some((l) => LICENCE_RX.test(`${l.itemEn} ${l.descEn ?? ''}`))) out.push({ id: 'licences', en: 'Licences & quantities', ar: 'التراخيص والكميات', kind: 'licences' });
  const std = rfp.techStandards ?? [];
  for (const g of EA_GROUPS) {
    if (std.some((s) => s.id.startsWith(groupPrefix(g)))) out.push({ id: `std-${g}`, en: STD_GROUPS[g].en, ar: STD_GROUPS[g].ar, kind: 'std', group: g });
  }
  return out;
}
const groupPrefix = (g: StdGroup) => ({ hosting: 'h', integration: 'i', security: 's', data: 'd', nfr: 'n', docs: 'a', delivery: 'p' }[g]);

/** Return reasons EA uses (EA meeting, "Reasons for returning an RFP"). */
export const EA_RETURN_REASONS: { id: string; en: string; ar: string }[] = [
  { id: 'unclear', en: 'Unclear technical description', ar: 'وصف تقني غير واضح' },
  { id: 'conflict', en: 'Conflicts with architecture or technical standards', ar: 'تعارض مع البنية أو المعايير التقنية' },
  { id: 'no-alignment', en: 'No prior alignment with EA — assessment needed', ar: 'لا يوجد توافق مسبق مع البنية المؤسسية — يلزم تقييم' },
  { id: 'missing', en: 'Previously agreed requirement is missing', ar: 'متطلب متفق عليه مسبقاً مفقود' },
  { id: 'quantity', en: 'Licence / subscription quantity above what was agreed', ar: 'كمية التراخيص / الاشتراكات أعلى من المتفق عليه' },
  { id: 'scope-diff', en: 'Scope differs from the agreed solution', ar: 'النطاق يختلف عن الحل المتفق عليه' },
];

/** Draft for the requester: every section EA commented on. */
export function eaReturnDraft(task: Task, isAr: boolean): string {
  const secs = eaSections(task);
  const lines = Object.entries(task.eaDecisions ?? {})
    .filter(([, d]) => d.state === 'comment' && d.comment?.trim())
    .map(([k, d]) => { const s = secs.find((x) => x.id === k); return `• ${s ? (isAr ? s.ar : s.en) : k}: ${d.comment}`; });
  return lines.join('\n');
}
