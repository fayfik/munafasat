// "Import from similar projects" — browse past requests on the left, tick the
// individual rows you want on the right, import the selection (design-review
// ImportCriteriaDrawer). Rows already in the request show as imported.
import { useMemo, useState } from 'react';
import { Icon, Btn } from './ui.jsx';
import { Dialog } from './FormKit.jsx';
import { SIMILAR_PROJECTS, formatLibDate } from '../data/criteriaLibrary.js';

/**
 * Returns [button, banner, dialog].
 * itemsFor(projectId) → [{ key, title, sub?, badge?, addedBy, addedOn }]
 * onImport(keys) → undo function (or nothing)
 */
export function useImportPicker({ title, noun, itemsFor, existingKeys = new Set(), onImport }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(null);
  const button = <Btn variant="secondary-sm" icon="icon-library" onClick={() => setOpen(true)}>Import from similar projects</Btn>;
  const banner = done && (
    <div className="ai-done import-done" role="status">
      <Icon name="icon-check-brand" size={16} />
      <div className="grow"><span className="t-body-medium">Imported {done.n} {done.n === 1 ? noun.one : noun.many}</span><span className="t-body-small muted">From {done.from}. Review them before you submit.</span></div>
      {done.undo && <button type="button" className="inline-link t-body-small" onClick={() => { done.undo(); setDone(null); }}>Undo</button>}
    </div>
  );
  const dialog = open && (
    <PickerDialog title={title} noun={noun} itemsFor={itemsFor} existing={existingKeys} onClose={() => setOpen(false)}
      onImport={(keys, from) => { const undo = onImport(keys); setDone({ n: keys.length, from, undo }); setOpen(false); }} />
  );
  return [button, banner, dialog];
}

function PickerDialog({ title, noun, itemsFor, existing, onClose, onImport }) {
  const [active, setActive] = useState(SIMILAR_PROJECTS[0].id);
  const [sel, setSel] = useState(() => new Set());
  const [q, setQ] = useState('');
  const counts = useMemo(() => Object.fromEntries(SIMILAR_PROJECTS.map((p) => {
    const items = itemsFor(p.id);
    return [p.id, { total: items.length, selected: items.filter((i) => sel.has(i.key)).length }];
  })), [sel, itemsFor]);
  const query = q.trim().toLowerCase();
  const projects = SIMILAR_PROJECTS.filter((p) => !query || [p.name, p.code, p.entity, p.requestNo, p.createdBy].some((s) => (s || '').toLowerCase().includes(query)));
  const proj = SIMILAR_PROJECTS.find((p) => p.id === active);
  const items = itemsFor(active);
  const selectable = items.filter((i) => !existing.has(i.key));
  const allOn = selectable.length > 0 && selectable.every((i) => sel.has(i.key));
  const toggle = (k) => setSel((s) => { const x = new Set(s); x.has(k) ? x.delete(k) : x.add(k); return x; });
  const toggleAll = () => setSel((s) => { const x = new Set(s); selectable.forEach((i) => (allOn ? x.delete(i.key) : x.add(i.key))); return x; });
  const from = [...new Set(SIMILAR_PROJECTS.filter((p) => counts[p.id].selected).map((p) => p.requestNo))].join(', ');

  return (
    <Dialog open onClose={onClose} title={title} sub="Reuse from similar projects — pick the rows you want from any past request." className="sheet import-sheet"
      foot={<>
        <span className="t-body-small muted grow">{sel.size ? <><strong className="ink">{sel.size}</strong> {sel.size === 1 ? noun.one : noun.many} selected across requests · <button type="button" className="link-btn t-body-small" onClick={() => setSel(new Set())}>Clear all</button></> : `Select ${noun.many} to import`}</span>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!sel.size} onClick={() => onImport([...sel], from)}>Import {sel.size || ''} selected</Btn>
      </>}>
      <div className="imp-grid">
        <div className="imp-side">
          <label className="search imp-search"><Icon name="icon-search" size={16} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by request no., name or creator" aria-label="Search past requests" /></label>
          <div className="t-caption muted imp-label">Requests</div>
          <div className="imp-list" role="listbox" aria-label="Past requests">
            {projects.map((p) => (
              <button key={p.id} type="button" role="option" aria-selected={p.id === active} className={`imp-req${p.id === active ? ' on' : ''}`} onClick={() => setActive(p.id)}>
                <span className="t-body-medium imp-name">{p.name}</span>
                <span className="t-body-small muted tnum">{p.requestNo}</span>
                <span className="t-body-small muted">Created by {p.createdBy}</span>
                <span className="t-caption muted">{counts[p.id].total} {counts[p.id].total === 1 ? noun.one : noun.many}{counts[p.id].selected > 0 && <strong className="brand-text"> · {counts[p.id].selected} selected</strong>}</span>
              </button>
            ))}
            {!projects.length && <p className="t-body-small muted" style={{ padding: 16 }}>No matching requests.</p>}
          </div>
        </div>
        <div className="imp-main">
          <div className="imp-head">
            <div><div className="t-title">{proj.name}</div><div className="t-body-small muted"><span className="tnum">{proj.requestNo}</span> · Created by {proj.createdBy}</div></div>
            {selectable.length > 0 && <button type="button" className="link-btn t-body-small" onClick={toggleAll}>{allOn ? 'Clear all' : 'Select all'}</button>}
          </div>
          <div className="imp-items">
            {items.map((i) => {
              const have = existing.has(i.key); const on = sel.has(i.key);
              return (
                <label key={i.key} className={`imp-item${on ? ' on' : ''}${have ? ' have' : ''}`}>
                  <input type="checkbox" checked={have || on} disabled={have} onChange={() => toggle(i.key)} />
                  <span className="grow">
                    <span className="imp-item-top"><span className="t-body-medium">{i.title}</span>{i.badge && <span className="tag">{i.badge}</span>}</span>
                    {i.sub && <span className="t-body-small muted imp-sub">{i.sub}</span>}
                    <span className="t-caption muted">{have ? 'Already in your request' : <>Added by <span className="ink" style={{ fontWeight: 500 }}>{i.addedBy}</span> · {formatLibDate(i.addedOn, false)}</>}</span>
                  </span>
                </label>
              );
            })}
            {!items.length && <p className="t-body-small muted">No {noun.many} recorded for this request.</p>}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
