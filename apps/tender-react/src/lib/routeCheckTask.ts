// Manual mode, "Help me decide": the requester's items go to Procurement as an Inbox
// task. Procurement searches Etimad E-Market and answers per item — on Etimad (with the
// listing they found) or not — then replies; the requester then chooses the route.
import { PROJECTS, ALL_COST_CENTERS } from '../data/mockData';
import { ME } from '../inbox/data';
import type { Task, RouteCheckItem } from '../inbox/types';

export interface RouteCheckInput {
  requestId: string;
  projectId: string;
  userName: string;
  items: Omit<RouteCheckItem, 'verdict' | 'match' | 'note'>[];
  text?: string;
}

export const routeCheckTaskId = (requestId: string) => `RTC-${requestId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

export function buildRouteCheckTask({ requestId, projectId, userName, items, text }: RouteCheckInput): Task {
  const p = PROJECTS.find((x) => x.id === projectId);
  const cc = ALL_COST_CENTERS.find((x) => x.id === p?.costCenterId);
  const now = new Date();
  const due = new Date(now.getTime() + 86400000);
  const id = routeCheckTaskId(requestId);
  const requester = { id: 'u-requester', name: userName || 'Mohammed H.', role: 'Requester', roleAr: 'مقدم الطلب', dept: cc?.name, deptAr: cc?.nameAr };
  const title = p?.name ?? 'New request';
  const n = items.length;
  // The requester's own estimate (qty × unit price), where they gave one.
  const est = items.reduce((sum, it) => sum + (it.qty !== '' && it.unitPrice !== '' ? Number(it.qty) * Number(it.unitPrice) : 0), 0);
  return {
    id, type: 'route-check',
    titleEn: 'Check items on Etimad E-Market', titleAr: 'فحص البنود في سوق اعتماد',
    summaryEn: `${title}: the requester isn’t sure of the route — check ${n} item${n === 1 ? '' : 's'} on Etimad E-Market and reply with what you find.`,
    summaryAr: `${p?.nameAr ?? title}: مقدم الطلب غير متأكد من المسار — افحص ${n} بند في سوق اعتماد وأرسل ما تجده.`,
    state: 'available', priority: 'high',
    entity: { kind: 'PR', ref: id.replace('RTC-', 'REQ-'), titleEn: title, titleAr: p?.nameAr ?? title },
    project: { en: title, ar: p?.nameAr ?? title },
    amount: est || undefined,
    requester, assignee: ME,
    department: { en: cc?.name ?? 'Procurement', ar: cc?.nameAr ?? 'المشتريات' },
    stageEn: 'Procurement route check', stageAr: 'فحص مسار الشراء',
    receivedAt: now.toISOString(), dueAt: due.toISOString(), slaHours: 24, mineAction: true,
    routeItems: items.map((it) => ({ ...it, verdict: null })),
    routeRequestText: text?.trim() || undefined,
    sourceDraftId: requestId,
    activity: [
      { id: `${id}-a1`, kind: 'system', actor: requester, at: now.toISOString(), system: { en: 'Sent by the requester — “Help me decide”', ar: 'أرسله مقدم الطلب — «ساعدني في الاختيار»' } },
      { id: `${id}-a2`, kind: 'system', actor: ME, at: now.toISOString(), system: { en: 'Assigned to Procurement for the Etimad E-Market check', ar: 'أُسند إلى المشتريات لفحص سوق اعتماد' } },
    ],
  };
}
