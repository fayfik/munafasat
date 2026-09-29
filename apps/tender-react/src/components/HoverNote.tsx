import { useState, useRef, useLayoutEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip for a small trigger (a pill or icon). Opens on hover and on keyboard
 * focus, closes on leave/blur/Escape. Rendered in a portal with fixed
 * positioning so it is never clipped by table or card overflow.
 */
export default function HoverNote({ trigger, title, children, width = 280 }: { trigger: ReactNode; title?: string; children: ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({ top: 0, left: 0, above: true });
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const above = r.top > 140;
    const isRtl = document.documentElement.dir === 'rtl';
    let left = isRtl ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({ top: above ? r.top - 8 : r.bottom + 8, left, above });
  }, [open, width]);

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className="inline-flex cursor-help rounded focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        {trigger}
      </span>
      {open && createPortal(
        <div
          id={id}
          role="tooltip"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width, transform: pos.above ? 'translateY(-100%)' : undefined, zIndex: 60 }}
          className="rounded-lg bg-neutral-900 text-white shadow-lg px-3 py-2.5 text-[12px] leading-relaxed pointer-events-none fade-in"
        >
          {title && <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">{title}</p>}
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
