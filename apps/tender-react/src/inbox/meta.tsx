// Munafasat Inbox — shared labels, chips and small UI atoms (bilingual).
import { Badge } from '../components/ui';
import type { TaskType, TaskState, Priority, EntityKind, Bilingual } from './types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'ai' | 'assets' | 'services';

export const TYPE_META: Record<TaskType, { en: string; ar: string; variant: BadgeVariant }> = {
  approval:               { en: 'Approval',               ar: 'اعتماد',          variant: 'info' },
  review:                 { en: 'Review',                 ar: 'مراجعة',          variant: 'services' },
  'data-collection':      { en: 'Data Collection',        ar: 'جمع بيانات',      variant: 'ai' },
  'technical-evaluation': { en: 'Technical Evaluation',   ar: 'تقييم فني',       variant: 'assets' },
  'commercial-evaluation':{ en: 'Commercial Evaluation',  ar: 'تقييم تجاري',     variant: 'assets' },
  validation:             { en: 'Validation',             ar: 'تحقق',            variant: 'warning' },
  clarification:          { en: 'Clarification',          ar: 'توضيح',           variant: 'error' },
  'document-submission':  { en: 'Document Submission',    ar: 'تقديم مستندات',   variant: 'default' },
  'etimad-review':        { en: 'Etimad Review',          ar: 'مراجعة اعتماد',   variant: 'warning' },
};

export const STATE_META: Record<TaskState, { en: string; ar: string; variant: BadgeVariant }> = {
  available:     { en: 'Pending',     ar: 'معلّقة',       variant: 'info' },
  'in-progress': { en: 'In Progress', ar: 'قيد التنفيذ', variant: 'warning' },
  waiting:       { en: 'Waiting',     ar: 'بالانتظار',   variant: 'default' },
  returned:      { en: 'Returned',    ar: 'مُعادة',       variant: 'error' },
  completed:     { en: 'Completed',   ar: 'مكتملة',      variant: 'success' },
  rejected:      { en: 'Rejected',    ar: 'مرفوضة',      variant: 'error' },
  cancelled:     { en: 'Cancelled',   ar: 'ملغاة',       variant: 'default' },
};

export const PRIORITY_META: Record<Priority, { en: string; ar: string; dot: string; text: string }> = {
  urgent: { en: 'Urgent', ar: 'عاجلة',   dot: 'bg-error-500',   text: 'text-error-700' },
  high:   { en: 'High',   ar: 'عالية',    dot: 'bg-warning-500', text: 'text-warning-700' },
  medium: { en: 'Medium', ar: 'متوسطة',   dot: 'bg-blue-500',    text: 'text-blue-700' },
  low:    { en: 'Low',    ar: 'منخفضة',   dot: 'bg-neutral-400', text: 'text-neutral-500' },
};

export const ENTITY_META: Record<EntityKind, { en: string; ar: string }> = {
  PR:       { en: 'PR',       ar: 'طلب شراء' },
  RFP:      { en: 'RFP',      ar: 'منافسة' },
  RFQ:      { en: 'RFQ',      ar: 'طلب عرض' },
  PO:       { en: 'PO',       ar: 'أمر شراء' },
  INVOICE:  { en: 'Invoice',  ar: 'فاتورة' },
  CONTRACT: { en: 'Contract', ar: 'عقد' },
  DELIVERY: { en: 'Delivery', ar: 'تسليم' },
};

export function TypeChip({ type, isAr }: { type: TaskType; isAr: boolean }) {
  const m = TYPE_META[type];
  return <Badge variant={m.variant}>{isAr ? m.ar : m.en}</Badge>;
}
export function StateChip({ state, isAr }: { state: TaskState; isAr: boolean }) {
  const m = STATE_META[state];
  return <Badge variant={m.variant}>{isAr ? m.ar : m.en}</Badge>;
}
export function PriorityTag({ priority, isAr }: { priority: Priority; isAr: boolean }) {
  const m = PRIORITY_META[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {isAr ? m.ar : m.en}
    </span>
  );
}
export const tb = (b: Bilingual, isAr: boolean) => (isAr ? b.ar : b.en);
