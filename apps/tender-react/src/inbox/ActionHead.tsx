// One "Your action" card per task. Every task panel (approval, technical, qualification,
// EA, GL, Assets, changes) opens with this card instead of stacking its own intro card
// under a separate "Review the request" card. Hierarchy inside the card:
//   bulk action (secondary) · comment on the request (ghost) — the decision (primary)
//   stays in the task header.
import { createContext, useContext, type ReactNode } from 'react';
import { CheckIcon } from '../components/Icons';

type T = (en: string, ar: string) => string;

/** Comment-on-request entry point, supplied by TaskDetail for approver tasks. */
export interface ReviewSlot { onReview: () => void; count: number; resolved: number; respond?: boolean; t: T; /** The review is the task's main work → secondary weight, else ghost. */ primary?: boolean }
export const ReviewSlotCtx = createContext<ReviewSlot | null>(null);

const Bubble = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></svg>
);

/** Ghost link to the request details in comment mode, with the comment count. */
export function ReviewLink() {
  const s = useContext(ReviewSlotCtx);
  if (!s) return null;
  const emphasis = s.primary ? 'secondary' : undefined;
  const { t } = s;
  const label = s.respond ? t('Open request details', 'فتح تفاصيل الطلب') : t('Comment on request', 'التعليق على الطلب');
  return (
    <button type="button" onClick={s.onReview} data-review-link
      className={`h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${emphasis === 'secondary'
        ? 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 shadow-sm'
        : 'text-[#2A6193] hover:bg-[#EEF4FB]'}`}>
      <Bubble />{label}
      {s.count > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#EEF4FB] text-[#21507A] text-[10.5px] font-bold tabular-nums inline-flex items-center justify-center">{s.count}</span>}
    </button>
  );
}

/** Bulk "accept everything left" — secondary weight, never competes with Approve. */
export function BulkButton({ onClick, children, testAttr }: { onClick: () => void; children: ReactNode; testAttr?: Record<string, string> }) {
  return (
    <button type="button" onClick={onClick} {...testAttr}
      className="h-9 px-3.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-[12.5px] font-semibold hover:bg-neutral-50 shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap">
      <CheckIcon className="w-4 h-4 text-success-600" />{children}
    </button>
  );
}

export function ActionHead({ title, desc, progress, bulk, extra, aside, note }: {
  title: string;
  desc?: ReactNode;
  /** done / total + the counted noun; attrs carry the data-*-progress test hooks. */
  progress?: { done: number; total: number; label: string; attrs?: Record<string, string>; tail?: ReactNode };
  bulk?: ReactNode;
  extra?: ReactNode;
  aside?: ReactNode;
  note?: ReactNode;
}) {
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;
  const complete = progress && progress.done >= progress.total;
  return (
    <section className="rounded-xl border border-neutral-200 bg-white px-5 py-4" data-action-head>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="min-w-[240px] flex-1">
          <h3 className="text-[15px] font-bold text-neutral-900 leading-snug">{title}</h3>
          {desc && <p className="text-[12.5px] text-neutral-500 mt-0.5 leading-relaxed max-w-[720px]">{desc}</p>}
          {note}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {aside}
          <ReviewLink />
          {bulk}
        </div>
      </div>
      {(progress || extra) && (
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {progress && (
            <>
              <div className="h-1.5 w-40 rounded-full bg-neutral-100 overflow-hidden"><div className={`h-full rounded-full transition-all ${complete ? 'bg-success-500' : 'bg-[#2A6193]'}`} style={{ width: `${pct}%` }} /></div>
              <span className={`text-[12px] font-semibold tabular-nums ${complete ? 'text-success-700' : 'text-neutral-600'}`} {...progress.attrs}>{progress.done}/{progress.total} <span className="font-medium text-neutral-500">{progress.label}</span>{progress.tail}</span>
            </>
          )}
          {extra}
        </div>
      )}
    </section>
  );
}
