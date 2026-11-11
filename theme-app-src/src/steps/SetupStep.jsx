import { useState } from 'react';
import { Icon, Btn, Field } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, TextArea, Select, DetailMeter, AiBtn } from '../components/FormKit.jsx';
import { PROJECTS, COST_CENTERS, EXPENSE_TYPES, AI_PURPOSE } from '../data/newRequest.js';
import { expenseTypeOf, MIN_WORDS } from '../lib/requestRules.js';

export function SetupStep() {
  const { f, set, em, goto } = useForm();
  const [moreCc, setMoreCc] = useState(false);
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const cc = COST_CENTERS.find((c) => c.id === f.costCenterId);
  const items = p ? p.items.filter((i) => (f.selectedItemIds || []).includes(i.id)) : [];
  const extraCc = f.additionalCostCenterIds || [];
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, 4);

  return (
    <div className="stack">
      {em && (
        <div className="banner brand"><Icon name="icon-check-brand" size={16} /><div className="banner-text"><div className="t-body-medium">Direct purchase from the Etimad E-Market catalogue</div><div className="t-body-small">No competition, evaluation or qualification steps — set up the order and add your items.</div></div></div>
      )}

      <Block title="Project" info="Project and budgeted names come from the approved budget. Check with IT for any changes.">
        <div className="field-grid">
          <Field label="Project name">{p?.name}</Field>
          <Field label="Project code">{p?.code}</Field>
          <Field label="Cost center">{cc ? `${cc.code} · ${cc.name}` : '—'}</Field>
          <Field label="Project name (Arabic)"><span dir="rtl" lang="ar">{p?.nameAr}</span></Field>
          <Field label="Route">{em ? 'Etimad E-Market' : 'Competitive tender'} <button type="button" className="inline-link" onClick={() => goto('route')}>Change</button></Field>
        </div>
        {extraCc.length > 0 && (
          <div className="chips" style={{ marginTop: 12 }} aria-label="Additional cost centers">
            {extraCc.map((id) => { const c = COST_CENTERS.find((x) => x.id === id); return <span key={id} className="chip">{c.code} · {c.name}<button type="button" className="chip-x" aria-label={`Remove ${c.name}`} onClick={() => set('additionalCostCenterIds', extraCc.filter((x) => x !== id))}><Icon name="icon-x" size={12} /></button></span>; })}
          </div>
        )}
        {moreCc ? (
          <div className="inline-pick">
            <Select autoFocus defaultValue="" aria-label="Add a cost center" onChange={(e) => { if (e.target.value) { set('additionalCostCenterIds', [...extraCc, e.target.value]); setMoreCc(false); } }}>
              <option value="">Add a cost center…</option>
              {COST_CENTERS.filter((c) => c.id !== f.costCenterId && !extraCc.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </Select>
            <Btn variant="ghost-sm" onClick={() => setMoreCc(false)}>Cancel</Btn>
          </div>
        ) : <button type="button" className="add-row" onClick={() => setMoreCc(true)}><Icon name="icon-plus" size={14} />Split with another cost center</button>}
      </Block>

      <Block title="Budgeted items in this request" meta={`${items.length + (f.freeItems?.length || 0)} items`} info="Picked in the procurement route step. Go back to that step to change them.">
        {items.length || f.freeItems?.length ? (
          <table className="plain-table compact">
            <thead><tr><th>Item</th><th>Arabic name</th><th>Expense type</th></tr></thead>
            <tbody>
              {shown.map((i) => <tr key={i.id}><td>{i.name}</td><td className="muted" dir="rtl" lang="ar">{i.nameAr}</td><td className="muted">{EXPENSE_TYPES[expenseTypeOf(i)]}</td></tr>)}
              {(f.freeItems || []).map((n) => <tr key={n}><td>{n}</td><td className="muted">—</td><td className="muted">Added by you</td></tr>)}
            </tbody>
          </table>
        ) : <p className="t-body-small muted">No items in this request.</p>}
        {items.length > 4 && <button type="button" className="inline-link" style={{ marginTop: 8 }} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all ${items.length}`}</button>}
      </Block>

      <Block title={em ? 'Purpose of purchase' : 'Purpose of this request'} info="Say why these items are needed. Your manager returns requests that don’t." actions={<AiBtn onRun={() => set('purpose', AI_PURPOSE(p))} />}>
        <FieldBlock id="q-purpose">
          <TextArea id="q-purpose-input" rows={4} value={f.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder={em ? 'Describe why these items are being purchased…' : 'Describe the purpose of this tender…'} aria-label="Purpose" />
          {!em && <DetailMeter text={f.purpose} min={MIN_WORDS.purpose} />}
        </FieldBlock>
      </Block>
    </div>
  );
}
