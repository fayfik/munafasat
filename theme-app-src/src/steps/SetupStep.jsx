import { useState } from 'react';
import { Icon, Btn, Field, Tooltip } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, TextArea, DetailMeter, AiBtn, Dialog, Choice } from '../components/FormKit.jsx';
import { PRIORITY_LEVELS } from '../lib/qualGuide.js';
import { AiCard, AiTag } from '../components/AiKit.jsx';
import { PROJECTS, COST_CENTERS, EXPENSE_TYPES, AI_PURPOSE } from '../data/newRequest.js';
import { similarFor, allPast, importPayload, IMPORT_SECTIONS } from '../data/aiContent.js';
import { expenseTypeOf, MIN_WORDS, uid } from '../lib/requestRules.js';
import { withAccounting } from '../lib/accounting.js';

export function SetupStep() {
  const { f, set, em } = useForm();
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const cc = COST_CENTERS.find((c) => c.id === f.costCenterId);
  const items = p ? p.items.filter((i) => (f.selectedItemIds || []).includes(i.id)) : [];
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, 4);
  const aiPurpose = p ? AI_PURPOSE(p) : '';

  return (
    <div className="stack">
      {em && (
        <div className="banner brand"><Icon name="icon-check-brand" size={16} /><div className="banner-text"><div className="t-body-medium">Direct purchase from the Etimad E-Market catalogue</div><div className="t-body-small">No competition, evaluation or qualification steps — set up the order and add your items.</div></div></div>
      )}

      <Block title="Project" info="Project and budgeted names come from the approved budget. Check with IT for any changes.">
        <div className="field-grid">
          <Field label="Project name">{p?.name}{p?.nameAr && <div dir="rtl" lang="ar" className="ar-under">{p.nameAr}</div>}</Field>
          <Field label="Project code">{p?.code}</Field>
          <Field label="Cost center">{cc ? `${cc.code} · ${cc.name}` : '—'}</Field>
        </div>
      </Block>

      <Block title="Budgeted items in this request" meta={`${items.length + (f.freeItems?.length || 0)} items`} info="Picked in the procurement route step. Go back to that step to change them.">
        {items.length || f.freeItems?.length ? (
          <table className="plain-table compact">
            <thead><tr><th>Item</th><th className="ar-col">Arabic name</th><th>Expense type</th></tr></thead>
            <tbody>
              {shown.map((i) => <tr key={i.id}><td>{i.name}</td><td className="muted ar-col" dir="rtl" lang="ar">{i.nameAr}</td><td className="muted">{EXPENSE_TYPES[expenseTypeOf(i)]}</td></tr>)}
              {(f.freeItems || []).map((n) => <tr key={n}><td>{n}</td><td className="muted ar-col">—</td><td className="muted">Added by you</td></tr>)}
            </tbody>
          </table>
        ) : <p className="t-body-small muted">No items in this request.</p>}
        {items.length > 4 && <button type="button" className="inline-link" style={{ marginTop: 8 }} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all ${items.length}`}</button>}
      </Block>

      <SimilarRequests project={p} />

      {!em && (
        <Block id="q-priority" title="Project priority" info="How important this project is. It sets the recommended qualification ranges, and Procurement sees it when they plan the tender.">
          <Choice name="Project priority" options={PRIORITY_LEVELS.map((o) => ({ ...o, dot: true }))} value={f.projectPriority} onChange={(v) => set('projectPriority', v)} />
          {f.projectPriority && <p className="t-body-small muted fade-in" style={{ margin: '8px 0 0' }}>{PRIORITY_LEVELS.find((o) => o.id === f.projectPriority).hint}</p>}
        </Block>
      )}

      <Block title={em ? 'Purpose of purchase' : 'Purpose of this request'} info="Say why these items are needed. Your manager returns requests that don’t." actions={<AiBtn onRun={() => set('purpose', aiPurpose)} />}>
        <FieldBlock id="q-purpose">
          <TextArea id="q-purpose-input" rows={4} value={f.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder={em ? 'Describe why these items are being purchased…' : 'Describe the purpose of this tender…'} aria-label="Purpose" />
          <div className="with-ai-tag">
            {!em ? <DetailMeter text={f.purpose} min={MIN_WORDS.purpose} /> : <span />}
            {f.purpose && f.purpose === aiPurpose && <AiTag />}
          </div>
        </FieldBlock>
      </Block>
    </div>
  );
}

/** AI: past requests in this project the requester can import from (Figma R04 "Found 2 similar requests"). */
function SimilarRequests({ project }) {
  const { f, patch, em } = useForm();
  const route = em ? 'emarket' : 'tendering';
  const list = project ? similarFor(project.id, route) : [];
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const imp = f.importedFrom;

  const doImport = (req) => {
    const next = importPayload(req, f, project, em);
    const prev = Object.fromEntries(Object.keys(next).map((k) => [k, f[k]]));
    const withIds = { ...next };
    if (next.boqItems) withIds.boqItems = next.boqItems.map((r) => withAccounting({ id: uid(), ...r }));
    ['paymentStages', 'technicalRequirements', 'evaluationCriteria'].forEach((k) => { if (next[k]) withIds[k] = next[k].map((r) => ({ id: uid(), ...r })); });
    patch({ ...withIds, importedFrom: { code: req.code, title: req.title, prev } });
    setBrowse(false); setOpen(false);
  };
  const undo = () => patch({ ...imp.prev, importedFrom: null });

  if (imp) {
    return (
      <div className="ai-done" role="status">
        <Icon name="icon-check-brand" size={16} />
        <div className="grow">
          <span className="t-body-medium">Imported {imp.code} · {imp.title}</span>
          <span className="t-body-small muted">{em ? 'The purpose and catalogue items are now pre-filled.' : `${IMPORT_SECTIONS.join(', ')} are now pre-filled.`} Review each one before you submit.</span>
        </div>
        <button type="button" className="inline-link t-body-small" onClick={undo}>Undo</button>
      </div>
    );
  }
  if (!list.length) return null;

  const noun = em ? 'similar purchase' : 'similar request';
  return (
    <>
      <AiCard className="similar" title={`Found ${list.length} ${noun}${list.length === 1 ? '' : 's'}`}
        info={<Tooltip text={em ? 'E-Market purchases made in this project before. Import one to pre-fill the purpose and catalogue items, then edit anything you need.' : 'Requests made in this project before. Import one to pre-fill the scope, BOQ, payment schedule and technical evaluation — then edit anything you need.'} label="About similar requests" />}
        right={<button type="button" className="ai-link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'}<Icon name="icon-chevron-down-link" size={14} className="chev" /></button>}>
        {open && (
          <>
            <ul className="ai-rows">
              {list.map((r) => <SimilarRow key={r.code} r={r} onImport={() => doImport(r)} />)}
            </ul>
            <button type="button" className="ai-link" onClick={() => setBrowse(true)}>Browse all requests<Icon name="icon-chevron-right-link" size={14} /></button>
          </>
        )}
      </AiCard>
      <BrowseDialog open={browse} route={route} onClose={() => setBrowse(false)} onImport={doImport} />
    </>
  );
}

function SimilarRow({ r, onImport }) {
  return (
    <li className="ai-row">
      <div className="grow">
        <span className="t-body-medium">{r.title}</span>
        <span className="t-caption muted">{r.code} · Created {r.created}</span>
      </div>
      <Btn variant="secondary-sm" onClick={onImport}>Import</Btn>
    </li>
  );
}

function BrowseDialog({ open, route, onClose, onImport }) {
  const [q, setQ] = useState('');
  const all = allPast(route).filter((r) => !q.trim() || `${r.title} ${r.code} ${r.by}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog open={open} onClose={onClose} title="Import from a past request" sub="Pick a request to start from. You can edit everything it fills in." foot={<Btn variant="secondary" onClick={onClose}>Close</Btn>}>
      <label className="search people-search" style={{ marginBottom: 12 }}>
        <Icon name="icon-search" size={16} /><span className="sr-only">Search past requests</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, reference or person" />
      </label>
      <ul className="ai-rows">
        {all.map((r) => (
          <li key={r.code} className="ai-row">
            <div className="grow"><span className="t-body-medium">{r.title}</span><span className="t-caption muted">{r.code} · {r.value} · {r.by} · {r.created}</span></div>
            <Btn variant="secondary-sm" onClick={() => onImport(r)}>Import</Btn>
          </li>
        ))}
        {!all.length && <li className="t-body-small muted">No past requests match “{q}”.</li>}
      </ul>
    </Dialog>
  );
}
