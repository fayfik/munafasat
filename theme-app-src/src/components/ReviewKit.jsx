import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Icon, ProgressBar, Btn } from './ui.jsx';

// Shared context for a task's Required-action content.
export const TaskCtx = createContext(null);
export const useTask = () => useContext(TaskCtx);

export const isDone = (d) => !!d && ['accepted', 'modified', 'commented', 'flagged', 'confirmed'].includes(d.state);
export const countDone = (keys, decisions) => keys.filter((k) => isDone(decisions[k])).length;

/* Header for a review: title, description, progress, "Accept all remaining". */
export function ReviewHeader({ title, desc, done, total, noun = 'items reviewed', allLabel = 'Accept all remaining', onAll, children }) {
  const complete = total > 0 && done === total;
  return (
    <div className="review-head">
      <div className="review-head-row">
        <div className="review-head-text">
          <h2 className="t-title" style={{ margin: 0 }}>{title}</h2>
          {desc && <p className="t-body-small muted" style={{ margin: '2px 0 0' }}>{desc}</p>}
        </div>
        {onAll && <Btn variant="secondary" onClick={onAll} disabled={complete} icon="icon-check-brand">{allLabel}</Btn>}
      </div>
      {total > 0 && (
        <div className="review-progress">
          <ProgressBar value={done} total={total} />
          <span className={`t-caption-medium ${complete ? 'brand' : 'muted'}`}>{complete ? `All ${total} reviewed` : `${done} of ${total} ${noun}`}</span>
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionHead({ name, hint, done, total, right }) {
  return (
    <div className="sec-head">
      <div>
        <h3 className="t-title" style={{ margin: 0 }}>{name}</h3>
        {hint && <p className="t-caption muted" style={{ margin: '2px 0 0' }}>{hint}</p>}
      </div>
      <div className="sec-head-right">
        {right}
        {total != null && <span className={`t-caption ${done === total ? 'brand-text' : 'muted'}`}>{done}/{total}</span>}
      </div>
    </div>
  );
}

function StatusTag({ d }) {
  if (!d || d.state === 'accepted') return null;
  const map = { accepted: ['Accepted', 'ok'], modified: ['Modified', 'mod'], commented: ['Commented', 'cmt'], flagged: ['Flagged', 'warn'], confirmed: ['Confirmed', 'ok'] };
  const [label, tone] = map[d.state] || [];
  return label ? <span className={`state-tag ${tone}`}>{d.state !== 'commented' && <Icon name="icon-check-brand" size={12} />}{label}</span> : null;
}

/* Inline comment composer with optional reason chips. */
export function CommentBox({ reasons, onSubmit, onCancel, placeholder = 'What should the requester change?' }) {
  const [text, setText] = useState('');
  const [reason, setReason] = useState(null);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const ok = text.trim() || reason;
  const submit = () => ok && onSubmit((reason ? `${reason}${text.trim() ? ' — ' : ''}` : '') + text.trim());
  return (
    <div className="inline-editor">
      {reasons?.length > 0 && (
        <div className="reason-chips" role="group" aria-label="Common reasons">
          {reasons.map((r) => <button key={r} type="button" className={`chip-btn${reason === r ? ' on' : ''}`} aria-pressed={reason === r} onClick={() => setReason(reason === r ? null : r)}>{r}</button>)}
        </div>
      )}
      <label className="sr-only" htmlFor={`cb-${placeholder.length}`}>Comment</label>
      <textarea ref={ref} rows={2} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }} />
      <div className="inline-editor-foot">
        <span className="t-caption muted">Posted to Comments for the requester</span>
        <div className="row-gap">
          <Btn variant="ghost-sm" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary-sm" disabled={!ok} onClick={submit}>Add comment</Btn>
        </div>
      </div>
    </div>
  );
}

/* Inline editor for "Modify". fields: [{ key, label, value, type: 'text'|'number'|'select', options, suffix }] */
export function ModifyBox({ fields, onSave, onCancel }) {
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ''])));
  const first = useRef(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <div className="inline-editor">
      <div className="modify-grid">
        {fields.map((f, i) => (
          <label key={f.key} className={`mod-field${f.wide ? ' wide' : ''}`}>
            <span className="t-caption muted">{f.label}</span>
            {f.type === 'select' ? (
              <select ref={i === 0 ? first : null} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
                {f.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea ref={i === 0 ? first : null} rows={2} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
            ) : (
              <span className="input-wrap">
                <input ref={i === 0 ? first : null} type={f.type || 'text'} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSave(vals); if (e.key === 'Escape') onCancel(); }} />
                {f.suffix && <span className="t-caption muted">{f.suffix}</span>}
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="inline-editor-foot">
        <span className="t-caption muted">Saved as your modification</span>
        <div className="row-gap">
          <Btn variant="ghost-sm" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary-sm" onClick={() => onSave(vals)}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

/* One reviewable row. mode: 'comment' (Accept/Comment) or 'modify' (Accept/Modify). */
export function ReviewRow({ k, title, sub, tone, mode = 'comment', fields, reasons, anchor, children, render, compact, readOnlyNote }) {
  const { review, comment } = useTask();
  const d = review.decisions[k];
  const [open, setOpen] = useState(null);
  const accept = () => (d?.state === 'accepted' ? review.clear(k) : review.set(k, { state: 'accepted' }));
  const shown = d?.state === 'modified' && d.value ? d.value : null;
  return (
    <div className={`rrow${d ? ` is-${d.state}` : ''}${tone ? ` tone-${tone}` : ''}${compact ? ' compact' : ''}`} data-key={k}>
      <div className="rrow-main">
        <div className="rrow-text">
          {render ? render(shown) : (
            <>
              <div className="t-body rrow-title">{shown?.title ?? title}</div>
              {(shown?.sub ?? sub) && <div className="t-body-small muted">{shown?.sub ?? sub}</div>}
            </>
          )}
          {children}
          {d?.state === 'commented' && d.note && <div className="rrow-note"><Icon name="rail-comments" size={14} /><span className="t-body-small">{d.note}</span></div>}
          {readOnlyNote}
        </div>
        <div className="rrow-actions">
          <StatusTag d={d} />
          {!readOnlyNote && (
            <>
              {d && d.state !== 'accepted' ? (
                <button type="button" className="link-btn" onClick={() => review.clear(k)}>Undo</button>
              ) : (
                <>
                  <button type="button" className={`act-btn${d?.state === 'accepted' ? ' on' : ''}`} aria-pressed={d?.state === 'accepted'} onClick={accept}>
                    <Icon name="icon-check-brand" size={14} />{d?.state === 'accepted' ? 'Accepted' : 'Accept'}
                  </button>
                  {mode === 'modify' && fields && <button type="button" className="act-btn" onClick={() => setOpen(open === 'mod' ? null : 'mod')}><Icon name="icon-pencil" size={14} />Modify</button>}
                  {mode === 'comment' && <button type="button" className="act-btn" onClick={() => setOpen(open === 'cmt' ? null : 'cmt')}><Icon name="rail-comments" size={14} />Comment</button>}
                </>
              )}
            </>
          )}
        </div>
      </div>
      {open === 'cmt' && (
        <CommentBox reasons={reasons} onCancel={() => setOpen(null)} onSubmit={(text) => { review.set(k, { state: 'commented', note: text }); comment(anchor || { id: k, label: title }, text); setOpen(null); }} />
      )}
      {open === 'mod' && (
        <ModifyBox fields={fields} onCancel={() => setOpen(null)} onSave={(vals) => { review.set(k, { state: 'modified', value: vals }); setOpen(null); }} />
      )}
    </div>
  );
}

/* Library picker for "Add requirement / clause / control". */
export function LibraryDialog({ title, items, onInsert, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal?.();
    const el = ref.current; const close = () => onClose();
    el?.addEventListener('close', close); return () => el?.removeEventListener('close', close);
  }, []);
  return (
    <dialog ref={ref} className="dialog sheet" aria-labelledby="lib-title">
      <div className="dialog-head">
        <div>
          <h2 id="lib-title" className="t-heading" style={{ fontSize: 18, lineHeight: '24px', margin: 0 }}>{title}</h2>
          <p className="t-body-small muted" style={{ margin: '4px 0 0' }}>Vendor-ready wording. It is inserted into the request and marked as accepted.</p>
        </div>
        <button className="icon-btn" type="button" aria-label="Close" onClick={() => ref.current.close()}><Icon name="icon-x" size={14} /></button>
      </div>
      <div className="dialog-body">
        {items.length === 0 && <p className="t-body-small muted">Everything from this library is already in the request.</p>}
        <ul className="lib-list">
          {items.map((it) => (
            <li key={it.id}>
              <div>
                <div className="t-body-medium">{it.title}</div>
                <div className="t-body-small muted">{it.sub}</div>
              </div>
              <Btn variant="secondary-sm" onClick={() => onInsert(it)}>Insert</Btn>
            </li>
          ))}
        </ul>
      </div>
      <div className="dialog-foot"><Btn variant="primary" onClick={() => ref.current.close()}>Done</Btn></div>
    </dialog>
  );
}

/* "Read the full request" row that opens Request details in commenting mode. */
export function ReadRequestRow({ text = 'Go through the request and comment on any section or field, then decide.' }) {
  const { openDetails } = useTask();
  return (
    <div className="read-row">
      <div className="icon-tile"><Icon name="icon-file-tile" size={20} /></div>
      <div className="read-text">
        <span className="t-title">Read the full request</span>
        <span className="t-body-small muted">{text}</span>
      </div>
      <Btn variant="secondary" onClick={() => openDetails(true)}>Comment on request</Btn>
    </div>
  );
}

export function Banner({ tone = 'info', icon, title, children, action }) {
  return (
    <div className={`banner ${tone}`}>
      {icon && <Icon name={icon} size={18} />}
      <div className="banner-text">
        {title && <div className="t-body-medium">{title}</div>}
        {children && <div className="t-body-small">{children}</div>}
      </div>
      {action}
    </div>
  );
}
