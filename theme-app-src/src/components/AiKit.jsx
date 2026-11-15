// AI touchpoints share one look: a cyan→blue spark, blue→violet text and a
// pale-blue card with a faint gradient edge. The prototype has no live model —
// every "AI" action fills sample content after a short pause.
import { useId, useState } from 'react';

const SPARK = 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z';

export function AiSpark({ size = 14, spin = false }) {
  const id = useId();
  return (
    <svg className={`ai-spark-svg${spin ? ' spin' : ''}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7de8fc" /><stop offset="1" stopColor="#517fee" /></linearGradient></defs>
      <path d={SPARK} fill={`url(#${id})`} />
    </svg>
  );
}

/** Button that runs a (fake) AI action. variant: ghost (text) · outline (gradient edge) · solid-sm. */
export function AiBtn({ onRun, label = 'Draft with AI', busyLabel = 'Drafting…', delay = 900, variant = 'ghost', disabled, className = '' }) {
  const [busy, setBusy] = useState(false);
  const run = () => { setBusy(true); setTimeout(() => { onRun(); setBusy(false); }, delay); };
  return (
    <button type="button" className={`ai-btn ai-${variant}${busy ? ' busy' : ''} ${className}`} onClick={run} disabled={busy || disabled} aria-busy={busy}>
      <AiSpark spin={busy} /><span className="ai-text">{busy ? busyLabel : label}</span>
    </button>
  );
}

/** Pale-blue card for anything the AI found or suggests. */
export function AiCard({ title, info, right, children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`ai-card ${className}`} {...rest}>
      {(title || right) && (
        <div className="ai-card-head">
          <div className="ai-card-title"><AiSpark /><span className="ai-text t-body-medium">{title}</span>{info}</div>
          {right}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** Quiet note under content the AI wrote, until the person edits it. */
export function AiTag({ children = 'AI generated — review before submitting' }) {
  return <span className="ai-tag t-caption"><AiSpark size={12} />{children}</span>;
}

/** Small "Suggested by AI" marker next to a field label or value. */
export function AiMark({ title = 'Suggested by AI from the name and description' }) {
  return <span className="ai-mark" role="img" title={title} aria-label="Suggested by AI"><AiSpark size={11} /></span>;
}
