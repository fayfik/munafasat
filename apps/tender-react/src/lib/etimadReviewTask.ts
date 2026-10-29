// Manual mode: when a tender request is submitted, Procurement gets an "Etimad review"
// task in the Inbox listing every BOQ line with the requester's Yes/No answer.
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import { ME } from '../inbox/data';
import type { Task } from '../inbox/types';
import type { TenderFormData } from '../types/tender';
import { etimadAnswerOf } from './etimadCheck';
import { effectiveQty } from './boqManpower';

export function buildEtimadReviewTask(form: TenderFormData, requestNo: string, userName: string, total: number, requestId?: string): Task | null {
  if (form.sourceType !== 'tendering' || form.boqItems.length === 0) return null;
  const p = PROJECTS.find((x) => x.id === form.projectId);
  const cc = ALL_COST_CENTERS.find((x) => x.id === form.costCenterId);
  const now = new Date();
  const due = new Date(now.getTime() + 2 * 86400000);
  const items = form.boqItems.map((r) => ({
    id: r.id, name: r.itemName || 'Unnamed item',
    qty: (effectiveQty(r) || r.quantity) as number | '', unit: r.unitOfMeasure || 'Each', unitPrice: r.unitPrice,
    answer: (etimadAnswerOf(r) ?? 'no') as 'yes' | 'no',
    justification: r.etimadJustification || undefined, verdict: null,
  }));
  const yes = items.filter((i) => i.answer === 'yes').length;
  const requester = { id: 'u-requester', name: userName || 'Mohammed H.', role: 'Requester', roleAr: 'مقدم الطلب', dept: cc?.name, deptAr: cc?.nameAr };
  const title = p?.name ?? 'Tender request';
  return {
    id: `ETR-${requestNo}`, type: 'etimad-review',
    titleEn: 'Check Etimad E-Market answers', titleAr: 'التحقق من إجابات سوق اعتماد',
    summaryEn: `${title}: ${items.length} BOQ line${items.length === 1 ? '' : 's'} to check against Etimad E-Market${yes ? ` — ${yes} kept in the tender with a justification` : ''}.`,
    summaryAr: `${p?.nameAr ?? title}: ${items.length} بند للتحقق منه في سوق اعتماد${yes ? ` — ${yes} أُبقيت في المنافسة بمبرر` : ''}.`,
    state: 'available', priority: yes ? 'high' : 'medium',
    entity: { kind: 'RFP', ref: requestNo, titleEn: title, titleAr: p?.nameAr ?? title },
    project: { en: title, ar: p?.nameAr ?? title },
    amount: total || undefined,
    requester, assignee: ME,
    department: { en: cc?.name ?? 'Procurement', ar: cc?.nameAr ?? 'المشتريات' },
    stageEn: 'Etimad E-Market review', stageAr: 'مراجعة سوق اعتماد',
    receivedAt: now.toISOString(), dueAt: due.toISOString(), mineAction: true,
    etimadItems: items,
    sourceRequest: { id: requestId, projectId: form.projectId, costCenterId: form.costCenterId, purpose: form.tenderingPurpose, requestNo, title },
    activity: [
      { id: `${requestNo}-a1`, kind: 'system', actor: requester, at: now.toISOString(), system: { en: 'Tender request submitted', ar: 'تم تقديم طلب المنافسة' } },
      { id: `${requestNo}-a2`, kind: 'system', actor: ME, at: now.toISOString(), system: { en: 'Assigned to Procurement for the Etimad E-Market check', ar: 'أُسند إلى المشتريات لفحص سوق اعتماد' } },
    ],
  };
}
