// Form building blocks for the New Request flow. Calm defaults: labels above
// fields, help text in an (i) tooltip, one subtle border, no cards inside cards.
import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState } from 'react';
import { Icon, Btn, Tooltip } from './ui.jsx';
import { words } from '../lib/requestRules.js';

export const FormCtx = createContext(null);
export const useForm = () => useContext(FormCtx);

/** Section heading inside a step: title, optional (i) help and actions on the right. */
export function Block({ title, info, actions, children, id, meta }) {
  return (
    <section className="fblock" id={id}>
      {(title || actions) && (
        <div className="fblock-head">
          <div className="fblock-title">
            {title && <h2 className="t-title">{title}</h2>}
            {info && <Tooltip text={info} label={`About ${title}`} />}
            {meta && <span className="t-caption muted">{meta}</span>}
          </div>
          {actions && <div className="fblock-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function FieldBlock({ label, hint, info, required, error, id, children, wide, optional }) {
  const auto = useId();
  // Link the label to the control when the child is one of our inputs.
  const linkable = isValidElement(children) && [Input, Select, TextArea, NumInput].includes(children.type);
  const inputId = linkable ? children.props.id || (id ? `${id}-input` : auto) : undefined;
  const hintId = `${auto}-hint`;
  const child = linkable ? cloneElement(children, { id: inputId, 'aria-describedby': error || hint ? hintId : undefined, 'aria-invalid': error ? true : undefined }) : children;
  return (
    <div className={`ffield${wide ? ' wide' : ''}${error ? ' has-error' : ''}`} id={id}>
      {label && (
        <div className="ffield-label t-label">
          <label htmlFor={inputId}>{label}{required && <span className="req" aria-hidden="true"> *</span>}{optional && <span className="t-caption muted"> · optional</span>}</label>
          {info && <Tooltip text={info} label={`About ${label}`} />}
        </div>
      )}
      {child}
      {error ? <span className="ffield-error t-caption" id={hintId} role="alert">{error}</span> : hint ? <span className="ffield-hint t-caption muted" id={hintId}>{hint}</span> : null}
    </div>
  );
}

export const Input = ({ className = '', ...p }) => <input className={`finput ${className}`} {...p} />;
export const Select = ({ className = '', children, ...p }) => <select className={`finput fselect ${className}`} {...p}>{children}</select>;
export function TextArea({ className = '', autoGrow = true, ...p }) {
  const ref = useRef(null);
  useEffect(() => { if (autoGrow && ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${Math.min(ref.current.scrollHeight + 2, 520)}px`; } }, [p.value, autoGrow]);
  return <textarea ref={ref} className={`finput ftextarea ${className}`} {...p} />;
}

export function NumInput({ value, onChange, min = 0, max, suffix, ...p }) {
  return (
    <span className={`num-input${suffix ? ' has-suffix' : ''}`}>
      <input className="finput" type="number" inputMode="decimal" min={min} max={max} value={value === '' || value == null ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} {...p}
        style={suffix ? { paddingRight: 18 + suffix.length * 7.5, ...p.style } : p.style} />
      {suffix && <span className="num-suffix t-body-small muted">{suffix}</span>}
    </span>
  );
}

/** Thin word meter under long text fields. */
export function DetailMeter({ text, min }) {
  const n = words(text);
  const ok = n >= min;
  return (
    <div className={`meter${ok ? ' ok' : n ? ' some' : ''}`}>
      <span className="meter-track"><span className="meter-fill" style={{ width: `${Math.min(100, (n / min) * 100)}%` }} /></span>
      <span className="t-caption">{ok ? `${n} words · enough detail` : `${n} of ${min} words`}</span>
    </div>
  );
}

/** "Draft with AI" — the prototype fills sample content after a short pause. */
export function AiBtn({ onRun, label = 'Draft with AI', busyLabel = 'Drafting…', delay = 900, variant = 'ghost-sm', disabled }) {
  const [busy, setBusy] = useState(false);
  const run = () => { setBusy(true); setTimeout(() => { onRun(); setBusy(false); }, delay); };
  return (
    <button type="button" className={`btn btn-${variant} ai-btn${busy ? ' busy' : ''}`} onClick={run} disabled={busy || disabled} aria-busy={busy}>
      <span className="ai-spark" aria-hidden="true" />{busy ? busyLabel : label}
    </button>
  );
}

export function YesNo({ value, onChange, name, suggested }) {
  return (
    <div className="yesno" role="radiogroup" aria-label={name}>
      {[[true, 'Yes'], [false, 'No']].map(([v, l]) => (
        <button key={l} type="button" role="radio" aria-checked={value === v} className={`yn${value === v ? ' on' : ''}${value === undefined && suggested === v ? ' hint' : ''}`} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

/** Pill list with a typed "add" field. Locked items can't be removed. */
export function ChipList({ items, locked = [], onChange, placeholder, label }) {
  const [v, setV] = useState('');
  const add = () => { const t = v.trim(); if (t && !items.includes(t) && !locked.includes(t)) onChange([...items, t]); setV(''); };
  return (
    <div className="chiplist">
      <ul className="chiplist-items" aria-label={label}>
        {locked.map((x) => <li key={x} className="chip locked" title="Mandatory"><Icon name="icon-check-brand" size={12} />{x}</li>)}
        {items.map((x) => (
          <li key={x} className="chip">{x}
            <button type="button" className="chip-x" aria-label={`Remove ${x}`} onClick={() => onChange(items.filter((i) => i !== x))}><Icon name="icon-x" size={12} /></button>
          </li>
        ))}
      </ul>
      <div className="chiplist-add">
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} aria-label={placeholder} />
        <Btn variant="secondary-sm" onClick={add} disabled={!v.trim()}>Add</Btn>
      </div>
    </div>
  );
}

/** Running total that must reach a target (100%). */
export function TotalBar({ label, value, target = 100, suffix = '%', extra }) {
  const ok = value === target;
  return (
    <div className={`totalbar${ok ? ' ok' : value > target ? ' over' : ''}`} role="status">
      <span className="t-body-small">{label}</span>
      <span className="totalbar-track"><span className="totalbar-fill" style={{ width: `${Math.min(100, (value / target) * 100)}%` }} /></span>
      <span className="t-body-medium tnum">{value}{suffix}</span>
      <span className="t-caption totalbar-note">{ok ? 'Balanced' : value > target ? `${value - target}${suffix} over` : `${target - value}${suffix} to go`}</span>
      {extra}
    </div>
  );
}

export function Dialog({ open, onClose, title, sub, children, foot, className = 'sheet' }) {
  const ref = useRef(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  if (!open) return null;
  return (
    <dialog ref={ref} className={`dialog ${className}`} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="fdlg-title">
      <div className="dialog-head">
        <div><h2 className="t-heading" id="fdlg-title" style={{ fontSize: 20, lineHeight: '26px' }}>{title}</h2>{sub && <p className="t-body-small muted" style={{ margin: '4px 0 0' }}>{sub}</p>}</div>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="icon-x" size={18} /></button>
      </div>
      <div className="dialog-body">{children}</div>
      {foot && <div className="dialog-foot">{foot}</div>}
    </dialog>
  );
}

export function ConfirmDelete({ open, onClose, onConfirm, title, sub }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} sub={sub || 'This can’t be undone.'} className="sheet narrow"
      foot={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="danger-solid" onClick={() => { onConfirm(); onClose(); }}>Delete all</Btn></>} />
  );
}

/** Small overflow menu (⋯). */
export function MoreMenu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  return (
    <div className="more" ref={ref}>
      <button type="button" className="icon-btn more-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}><span className="dots" aria-hidden="true">⋯</span></button>
      {open && (
        <div className="more-menu" role="menu">
          {items.map((it) => <button key={it.label} type="button" role="menuitem" className={it.danger ? 'danger' : ''} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>)}
        </div>
      )}
    </div>
  );
}

/** Person picker: recommended first, search, single or multi select. */
export function PeoplePicker({ people, value, onChange, single, label }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = people.filter((p) => !query || `${p.name} ${p.role} ${p.department}`.toLowerCase().includes(query));
  const rec = list.filter((p) => p.reviewed);
  const rest = list.filter((p) => !p.reviewed);
  const on = (p) => value.some((m) => m.id === p.id);
  const toggle = (p) => onChange(single ? (on(p) ? [] : [p]) : on(p) ? value.filter((m) => m.id !== p.id) : [...value, p]);
  const row = (p) => (
    <li key={p.id}>
      <button type="button" className={`person-row${on(p) ? ' on' : ''}`} aria-pressed={on(p)} onClick={() => toggle(p)}>
        <span className="avatar-dot" style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden="true">{p.initials}</span>
        <span className="person-text"><span className="t-body-medium">{p.name}</span><span className="t-caption muted">{p.role} · {p.department}</span></span>
        {p.reviewed ? <span className="t-caption muted nowrap">Reviewed {p.reviewed} RFPs here</span> : null}
        <span className={`tick${on(p) ? ' on' : ''}`} aria-hidden="true">{on(p) && <Icon name="icon-check-white" size={12} />}</span>
      </button>
    </li>
  );
  return (
    <div className="people">
      <label className="search people-search">
        <Icon name="icon-search" size={16} /><span className="sr-only">Search {label}</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, role or department" />
      </label>
      <div className="people-lists">
        {rec.length > 0 && <><div className="t-caption muted people-group">Recommended for this project</div><ul>{rec.map(row)}</ul></>}
        {rest.length > 0 && <><div className="t-caption muted people-group">Everyone</div><ul>{rest.map(row)}</ul></>}
        {!list.length && <p className="t-body-small muted" style={{ padding: '12px 4px' }}>No one matches “{q}”.</p>}
      </div>
    </div>
  );
}

export const sarFmt = (n, dp = 0) => `SAR ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
