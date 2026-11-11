import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const ICONS = import.meta.glob('../assets/*.svg', { eager: true, query: '?url', import: 'default' });
export const iconUrl = (name) => ICONS[`../assets/${name}.svg`];

export function Icon({ name, size = 16, alt = '', className = '' }) {
  return <img src={iconUrl(name)} width={size} height={size} alt={alt} className={className} style={{ width: size, height: size, flex: 'none' }} />;
}

export function Avatar({ person, size = 20, tone }) {
  const cls = person?.me ? 'me' : tone || '';
  return <span className={`avatar-dot ${cls}`} style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) }} aria-hidden="true">{person?.initials}</span>;
}

export function PersonChip({ person, sub }) {
  return (
    <span className="person-chip">
      <span className="avatar t-micro">{person.initials}</span>
      <span className="t-body">{person.name}</span>
      {sub && <span className="t-caption muted" style={{ marginLeft: 2 }}>{sub}</span>}
    </span>
  );
}

// Segmented control with a sliding thumb.
export function Segment({ items, value, onChange, label, size }) {
  const ref = useRef(null);
  const [thumb, setThumb] = useState(null);
  const place = () => {
    const el = ref.current?.querySelector('[aria-selected="true"]');
    if (!el || !ref.current.offsetWidth) return;
    setThumb({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  };
  useLayoutEffect(place, [value, items.map((i) => `${i.label}${i.count ?? ''}`).join('|')]);
  useEffect(() => {
    const ro = new ResizeObserver(place); ro.observe(ref.current);
    document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={`segment has-thumb${size === 'sm' ? ' sm' : ''}`} role="tablist" aria-label={label} ref={ref}>
      {thumb && <span className="segment-thumb ready" aria-hidden="true" style={{ width: thumb.w, height: thumb.h, transform: `translate(${thumb.x}px, ${thumb.y}px)` }} />}
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" className="segment-tab" aria-selected={value === it.id} tabIndex={value === it.id ? 0 : -1}
          disabled={it.disabled} title={it.title} onClick={() => !it.disabled && onChange(it.id)}>
          <span className="segment-label">{it.label}</span>
          {it.count ? <span className="segment-count">{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Btn({ variant = 'secondary', icon, children, className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={16} />}{children}
    </button>
  );
}

export function Tooltip({ text, label = 'More information' }) {
  return (
    <span className="tip-wrap">
      <button className="icon-btn info-btn" type="button" aria-label={label}><Icon name="icon-info" size={18} /></button>
      <span className="tooltip" role="tooltip">{text}</span>
    </span>
  );
}

export function Collapsible({ title, meta, defaultOpen = true, children, id, actions }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`collapse${open ? ' open' : ''}`} id={id}>
      <div className="collapse-head">
        <button type="button" className="collapse-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="icon-chevron-down" size={14} className="collapse-chev" />
          <span className="t-title">{title}</span>
          {meta && <span className="t-caption muted">{meta}</span>}
        </button>
        {actions}
      </div>
      <div className="collapse-body" hidden={!open}>{children}</div>
    </section>
  );
}

export function Field({ label, children, wide }) {
  return (
    <div className={`field${wide ? ' wide' : ''}`}>
      <span className="t-caption muted">{label}</span>
      <div className="t-body">{children}</div>
    </div>
  );
}

export function Tags({ items, tone }) {
  return <span className="tags">{items.map((t) => <span key={t} className={`tag ${tone || tagTone(t)}`}>{t}</span>)}</span>;
}
const tagTone = (t) => (t === 'Required' ? 'strong' : t === 'Cybersecurity' ? 'blue' : t === 'N/A' ? 'muted' : 'plain');

export function ProgressBar({ value, total }) {
  return <div className="progress-track"><div className="progress-fill" style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></div>;
}

export function Empty({ icon = 'icon-inbox', title, sub }) {
  return (
    <div className="panel-empty">
      <div className="icon-tile"><Icon name={icon} size={20} /></div>
      <div className="t-title" style={{ color: 'var(--ink-primary)' }}>{title}</div>
      {sub && <div className="t-body-small">{sub}</div>}
    </div>
  );
}
