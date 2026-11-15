// "Import from similar projects" — pick a past project from the organisation
// library and start a section from its rows (payment, requirements, criteria,
// qualification values). The step keeps an Undo until the person moves on.
import { useState } from 'react';
import { Icon, Btn } from './ui.jsx';
import { Dialog } from './FormKit.jsx';
import { LIBRARY, libraryRows } from '../data/aiContent.js';

const NOUN = { payment: 'payment stages', requirements: 'technical requirements', criteria: 'evaluation criteria', documents: 'documents', qualification: 'qualification ranges and weights' };

/** Returns [button, banner] so the step can place them apart (actions row vs. block body). */
export function useImport(kind, onApply) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(LIBRARY[0].id);
  const [done, setDone] = useState(null);
  const rows = libraryRows(pick, kind);
  const count = Array.isArray(rows) ? rows.length : Object.keys(rows).length;
  const go = () => {
    const lib = LIBRARY.find((l) => l.id === pick);
    const undo = onApply(libraryRows(pick, kind), lib);
    setDone({ lib, undo }); setOpen(false);
  };

  const button = (
    <>
      <Btn variant="secondary-sm" icon="icon-library" onClick={() => setOpen(true)}>Import from similar projects</Btn>
      <Dialog open={open} onClose={() => setOpen(false)} title="Import from similar projects" sub={`Start the ${NOUN[kind]} from a project your organisation has already tendered. You can edit everything after.`}
        foot={<><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={go}>Import {count} {kind === 'qualification' ? 'groups' : 'rows'}</Btn></>}>
        <div className="choice-stack" role="radiogroup" aria-label="Project to import from">
          {LIBRARY.map((l) => (
            <label key={l.id} className={`choice-row${pick === l.id ? ' on' : ''}`}>
              <input type="radio" name={`lib-${kind}`} checked={pick === l.id} onChange={() => setPick(l.id)} />
              <span><span className="t-body-medium">{l.name}</span><span className="t-body-small muted">{l.code} · {l.requestNo} · {l.entity} · {l.by}</span></span>
            </label>
          ))}
        </div>
      </Dialog>
    </>
  );
  const banner = done && (
    <div className="ai-done import-done" role="status">
      <Icon name="icon-check-brand" size={16} />
      <div className="grow"><span className="t-body-medium">Imported from {done.lib.requestNo} · {done.lib.name}</span><span className="t-body-small muted">A starting point for this request — review the {NOUN[kind]} before you submit.</span></div>
      {done.undo && <button type="button" className="inline-link t-body-small" onClick={() => { done.undo(); setDone(null); }}>Undo</button>}
    </div>
  );
  return [button, banner];
}
