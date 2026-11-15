import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Btn, Segment, Tooltip } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Input, Select, TextArea, NumInput, YesNo, Dialog, ConfirmDelete, MoreMenu, sarFmt } from '../components/FormKit.jsx';
import { AiBtn, AiCard, AiSpark, AiMark } from '../components/AiKit.jsx';
import { useRequests, emptyForm } from '../state/requests.jsx';
import { useActor } from '../state/actor.jsx';
import { uid } from '../lib/requestRules.js';
import { PURCHASE_TYPES, MATERIAL_GROUPS, ptypeName, mgOf, suggestAccounting, withAccounting } from '../lib/accounting.js';
import { PROJECTS, UNITS, BOQ_CATEGORIES, QUALIFICATIONS, NATIONALITIES, AI_BOQ, AI_EM_BOQ } from '../data/newRequest.js';
import { totals, lineTotal, checkEtimad, etimadStale, needsEtimadReason, boqTypeOf, words, MIN_WORDS, num } from '../lib/requestRules.js';

const ETIMAD = {
  available: { label: 'On E-Market', cls: 'warn' },
  'not-available': { label: 'Needs tender', cls: 'ok' },
  uncertain: { label: 'Confirm on Etimad', cls: 'mod' },
};
const catName = (id) => BOQ_CATEGORIES.find((c) => c.id === id)?.en || 'Uncategorised';

const COLS = ['Budgeted item', 'Category', 'Item name', 'Description', 'Unit', 'Quantity', 'Unit price (SAR)'];
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function BoqStep() {
  const { f, list, em, headEl, set } = useForm();
  const rows = list('boqItems');
  const [editing, setEditing] = useState(null); // row or {} for new
  const [view, setView] = useState('grid');
  const [confirmAll, setConfirmAll] = useState(false);
  const [template, setTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const budgeted = p ? p.items.filter((i) => (f.selectedItemIds || []).includes(i.id)) : [];
  const t = totals(f);
  const due = scopeEnd(f);

  const suggest = () => {
    setBusy(true);
    setTimeout(() => {
      if (em) rows.addMany(AI_EM_BOQ.map((r) => ({ ...r })));
      else {
        const names = budgeted.map((b) => b.name);
        const pick = AI_BOQ.filter((r) => !names.length || names.includes(r.projectItem));
        const src = pick.length ? pick : budgeted.map((b) => ({ projectItem: b.name, category: boqTypeOf(b.name, b.type), itemName: b.name, itemDescription: `Supply of ${b.name.toLowerCase()} as described in the scope of work, including delivery and handover`, unitOfMeasure: 'Service', quantity: 1, unitPrice: 100000 }));
        rows.addMany(src.map((r) => withAccounting({ ...r, deliveryDate: r.deliveryDate || due })));
      }
      setBusy(false);
    }, 1100);
  };
  const addRows = (rs) => rows.addMany(em ? rs : rs.map((r) => withAccounting(r)));
  const save = (r) => { if (r.id) rows.update(r.id, r); else rows.add(r); setEditing(null); };

  const checkAll = () => f.boqItems.forEach((r) => rows.update(r.id, { etimad: checkEtimad(r) }));
  const [checking, setChecking] = useState([]);
  const checkOne = (r) => { setChecking((c) => [...c, r.id]); setTimeout(() => { rows.update(r.id, { etimad: checkEtimad(r) }); setChecking((c) => c.filter((x) => x !== r.id)); }, 900); };
  const store = useRequests();
  const { actor } = useActor();
  const [moved, setMoved] = useState(null);
  const moveToEm = (r) => {
    const keep = f.emDraftId && store.get(f.emDraftId)?.status !== 'submitted' ? f.emDraftId : null;
    const did = keep || uid();
    const prev = keep ? store.get(did) : null;
    const base = prev?.form || { ...emptyForm(), projectId: f.projectId, costCenterId: f.costCenterId, sourceType: 'emarket', routeChoice: 'emarket', purpose: `Catalogue items moved out of the ${p?.name || ''} tender after the Etimad check.`.replace('  ', ' ') };
    const emRow = { id: uid(), purchaseType: r.ptype === 'service' ? 'service' : 'product', itemName: r.itemName, productId: '', supplier: '', orderUnit: r.unitOfMeasure || 'Each', quantity: num(r.quantity) || 1, unitPrice: num(r.unitPrice), shippingCharges: 0 };
    store.save(did, { createdBy: prev?.createdBy || actor.id, title: `${p?.name || 'Request'} — E-Market items`, type: 'emarket', status: 'draft', routeConfirmed: true, step: 'boq', form: { ...base, boqItems: [...(base.boqItems || []), emRow] }, moved: [...(prev?.moved || []), r.itemName] });
    const before = f.boqItems;
    rows.remove(r.id);
    if (!keep) set('emDraftId', did);
    setMoved({ name: r.itemName, did, undo: () => { set('boqItems', before); store.save(did, prev ? { form: prev.form, moved: prev.moved } : { form: { ...base, boqItems: [] }, moved: [] }); setMoved(null); } });
  };

  const groups = useMemo(() => {
    if (view === 'table' || em) return [['', f.boqItems]];
    const m = new Map();
    f.boqItems.forEach((r) => { const k = r.projectItem || 'Other items'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
    return [...m.entries()];
  }, [f.boqItems, view, em]);

  const unchecked = f.boqItems.filter((r) => !r.etimad || etimadStale(r)).length;
  const exportCsv = () => download('boq.csv', [COLS.join(','), ...f.boqItems.map((r) => [r.projectItem, catName(r.category), r.itemName, r.itemDescription, r.unitOfMeasure, r.quantity, r.unitPrice].map(csvCell).join(','))].join('\n'));
  const dialogs = (
    <>
      {editing && <ItemDialog row={editing} em={em} budgeted={budgeted} due={due} onClose={() => setEditing(null)} onSave={save} />}
      {detail && <DetailDialog r={f.boqItems.find((x) => x.id === detail.id) || detail} em={em} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); }} />}
      <TemplateDialog open={template} onClose={() => setTemplate(false)} onRows={addRows} existing={f.boqItems} />
      <ConfirmDelete open={confirmAll} onClose={() => setConfirmAll(false)} onConfirm={rows.clear} title="Delete all items?" />
    </>
  );

  if (!f.boqItems.length && !busy) {
    return (
      <div className="stack" id="q-boq">
        <p className="lede t-body muted">{em ? 'Add the products and services you’re buying directly from the Etimad E-Market catalogue. Choose how you want to start.' : 'Define every item, quantity and unit price for this tender. Choose how you want to start — you can mix methods later.'}</p>
        <div className="start-grid">
          <button type="button" className="start-card" onClick={() => setTemplate(true)}>
            <span className="start-icon green"><Icon name="icon-upload" size={18} /></span>
            <span className="start-title">Upload via template</span>
            <span className="start-desc">Download the Excel template, fill it in, and upload. Fastest for long lists.</span>
            <span className="start-link green">Choose a file<Icon name="icon-chevron-right-green" size={12} /></span>
          </button>
          <button type="button" className="start-card ai" onClick={suggest}>
            <span className="ai-pill start-pill">Recommended</span>
            <span className="start-icon ai"><AiSpark size={18} /></span>
            <span className="start-title ai-text">Generate with AI</span>
            <span className="start-desc">{em ? 'Let AI pick catalogue items from your purpose, then review and adjust.' : 'Let AI draft items from your project scope, then review and adjust.'}</span>
            <span className="start-link ai-link-v">Suggest items<Icon name="icon-chevron-right-ai" size={12} /></span>
          </button>
          <button type="button" className="start-card" onClick={() => setEditing({})}>
            <span className="start-icon"><Icon name="icon-plus-ink" size={18} /></span>
            <span className="start-title">Add manually</span>
            <span className="start-desc">Enter each item yourself with full control over every detail.</span>
            <span className="start-link">Add first item<Icon name="icon-chevron-right-ink" size={12} /></span>
          </button>
        </div>
        {dialogs}
      </div>
    );
  }

  return (
    <div className="stack" id="q-boq">
      {headEl && createPortal(
        <>
          <Btn variant="secondary-sm" icon="icon-plus" onClick={() => setTemplate(true)}>Use a Template</Btn>
          <AiBtn label={busy ? 'Drafting…' : 'Draft with AI'} onRun={suggest} disabled={busy} delay={0} />
        </>, headEl)}
      {busy && <div className="checking compact" role="status"><AiSpark size={18} spin /><span className="t-body ai-text">Drafting items from your project…</span></div>}

      <Block title={`${f.boqItems.length} item${f.boqItems.length === 1 ? '' : 's'}`} actions={
        <>
          {!em && <Segment size="sm" label="BOQ view" value={view} onChange={setView} items={[{ id: 'grid', label: 'Grid' }, { id: 'table', label: 'Table' }, { id: 'grouped', label: 'Grouped' }]} />}
          <MoreMenu items={[
            { label: 'Add item', onClick: () => setEditing({}) },
            { label: 'Download as CSV', onClick: exportCsv },
            { label: 'Delete all items', danger: true, onClick: () => setConfirmAll(true) },
          ]} />
        </>
      }>
        {!em && (
          <AiCard className="etimad-ai" title={`Etimad E-Market availability · ${unchecked ? `${unchecked} item${unchecked === 1 ? '' : 's'} not checked yet` : 'All items checked'}`}
            info={<Tooltip text="AI matches each line against the Etimad E-Market catalogue. Off-the-shelf items listed there are normally bought on E-Market — keep them here only with a reason." label="About the Etimad check" />}
            right={<AiBtn variant="outline" label="Check in Etimad" busyLabel="Checking Etimad…" onRun={checkAll} />} />
        )}
        {moved && (
          <div className="ai-done" role="status"><Icon name="icon-check-brand" size={16} />
            <div className="grow"><span className="t-body-medium">Moved “{moved.name}” to an Etimad E-Market request</span><span className="t-body-small muted">It’s saved as a draft in My requests — buy it there directly from the catalogue.</span></div>
            <button type="button" className="inline-link t-body-small" onClick={moved.undo}>Undo</button>
          </div>
        )}

        {view === 'grid' && !em ? (
          <div className="boq-cards">
            {groups.map(([g, rs]) => {
              const shut = !!collapsed[g];
              return (
                <section key={g} className={`boq-card${shut ? ' shut' : ''}`}>
                  <button type="button" className="boq-card-head" aria-expanded={!shut} onClick={() => setCollapsed((c) => ({ ...c, [g]: !shut }))}>
                    <span className="boq-card-name"><Icon name="icon-chevron-down-ink" size={16} className="chev" /><span className="t-body-medium">{g}</span></span>
                    <span className="t-body-small muted tnum">{sarFmt(rs.reduce((s, r) => s + lineTotal(r, em), 0))}</span>
                  </button>
                  {!shut && (
                    <div className="table-scroll">
                      <table className="plain-table boq-table">
                        <BoqHead em={em} />
                        <tbody>{rs.map((r) => <BoqRow key={r.id} r={r} em={em} onEdit={() => setEditing(r)} onView={() => setDetail(r)} onRemove={() => rows.remove(r.id)} onCheck={() => checkOne(r)} checking={checking.includes(r.id)} onReason={(v) => rows.update(r.id, { etimadReason: v })} onKeep={(on) => rows.update(r.id, { etimadDecision: on ? 'keep' : '' })} onMove={() => moveToEm(r)} />)}</tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="table-scroll boq-flat">
            <table className="plain-table boq-table">
              <BoqHead em={em} />
              {groups.map(([g, rs]) => (
                <tbody key={g || 'all'}>
                  {g && <tr className="group-row"><td colSpan={COLSPAN}>{g}<span className="muted" style={{ fontWeight: 400 }}> · {sarFmt(rs.reduce((s, r) => s + lineTotal(r, em), 0))}</span></td></tr>}
                  {rs.map((r) => <BoqRow key={r.id} r={r} em={em} onEdit={() => setEditing(r)} onView={() => setDetail(r)} onRemove={() => rows.remove(r.id)} onCheck={() => checkOne(r)} checking={checking.includes(r.id)} onReason={(v) => rows.update(r.id, { etimadReason: v })} onKeep={(on) => rows.update(r.id, { etimadDecision: on ? 'keep' : '' })} onMove={() => moveToEm(r)} />)}
                </tbody>
              ))}
            </table>
          </div>
        )}
        <button type="button" className="add-row" onClick={() => setEditing({})}><Icon name="icon-plus" size={14} />Add item</button>
        <dl className="boq-totals">
          <div><dt className="muted">Subtotal</dt><dd className="tnum">{sarFmt(t.subtotal, 2)}</dd></div>
          <div><dt className="muted">VAT (15%)</dt><dd className="tnum">{sarFmt(t.vat, 2)}</dd></div>
          <div className="grand"><dt>Total incl. VAT</dt><dd className="tnum">{sarFmt(t.total, 2)}</dd></div>
        </dl>
      </Block>
      {dialogs}
    </div>
  );
}

const COLSPAN = 5;
const scopeEnd = (f) => {
  if (!f.startDate || !f.contractDuration) return '';
  const d = new Date(f.startDate); const n = Number(f.contractDuration);
  if (f.contractDurationType === 'days') d.setDate(d.getDate() + n); else if (f.contractDurationType === 'years') d.setFullYear(d.getFullYear() + n); else d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

function BoqHead({ em }) {
  return (
    <thead><tr>
      <th>Item</th>
      {em ? <><th>Supplier</th><th className="num">Qty / period</th></> : <><th className="num">Qty</th><th className="num">Unit price</th></>}
      <th className="num">Total</th>
      <th className="row-actions" aria-label="Actions" />
    </tr></thead>
  );
}

function BoqRow({ r, em, onEdit, onView, onRemove, onCheck, onReason, onMove, onKeep, checking }) {
  const fresh = r.etimad && !etimadStale(r);
  const thin = !em && words(r.itemDescription) < MIN_WORDS.boqDesc;
  const brandMissing = r.hasBrandName && !(r.brandJustification ?? '').trim();
  const acc = em ? null : (r.mg ? r : withAccounting(r));
  const mg = acc && mgOf(acc.mg);
  const onEm = !em && fresh && r.etimad.status === 'available';
  return (
    <>
      <tr className={`boq-row${onEm ? ' on-em' : ''}`}>
        <td>
          <div className="row-name">
            <button type="button" className="row-title" onClick={onView}><span className="t-body-medium">{r.itemName || 'Unnamed item'}</span></button>
            {acc?.ptype && <span className="status-pill t-caption-medium type-pill">{ptypeName(acc.ptype)}</span>}
          </div>
          <div className="t-body-small muted clamp-2 row-desc">{em ? [r.purchaseType && (r.purchaseType === 'vehicle-leasing' ? 'Vehicle leasing' : r.purchaseType[0].toUpperCase() + r.purchaseType.slice(1)), r.productId].filter(Boolean).join(' · ') : r.itemDescription}</div>
          {acc && (
            <div className="row-meta t-caption">
              {r.deliveryDate && <span className="muted" title="Needed by">Needed by {r.deliveryDate}</span>}
              {mg && <span className="row-mg">{r.deliveryDate && <span className="sep">·</span>}Material group: {mg.en} · {mg.code}{acc.acctSource === 'ai' && <AiMark />}</span>}
              {fresh && r.etimad.status === 'uncertain' && <span className="amber" title={r.etimad.comment}><span className="sep">·</span>Confirm on Etimad</span>}
              {fresh && r.etimad.status === 'not-available' && <span className="row-mg" title={r.etimad.comment}><span className="sep">·</span>Not on E-Market</span>}
              {r.etimad && !fresh && <span className="amber"><span className="sep">·</span>Changed — check Etimad again</span>}
            </div>
          )}
          {(thin || brandMissing) && <div className="issue t-caption"><Icon name="icon-warn" size={12} />{brandMissing ? 'Brand name needs a justification' : 'Add a clearer description'}</div>}
        </td>
        {em ? (
          <><td className="muted">{r.supplier || '—'}</td><td className="num">{r.purchaseType === 'product' ? `${num(r.quantity) || 1} ${r.orderUnit || ''}` : r.startDate && r.endDate ? `${r.startDate} → ${r.endDate}` : '—'}</td></>
        ) : (
          <><td className="num mid">{r.category === 'manpower' ? `${num(r.staffCount) || num(r.quantity)} staff` : `${num(r.quantity)} ${r.unitOfMeasure || ''}`}</td><td className="num mid">{sarFmt(r.unitPrice)}</td></>
        )}
        <td className="num mid t-body-medium">{sarFmt(lineTotal(r, em))}</td>
        <td className="row-actions mid">
          {!em && (
            <button type="button" className={`icon-btn ai-check${checking ? ' busy' : ''}${r.etimad && !fresh ? ' due' : ''}`} onClick={onCheck} disabled={checking}
              aria-label={`Check ${r.itemName} in Etimad E-Market`} title={checking ? 'Checking Etimad…' : r.etimad && fresh ? 'Check in Etimad again' : 'Check in Etimad'}>
              <AiSpark size={16} spin={checking} />
            </button>
          )}
          <button type="button" className="icon-btn" aria-label={`View ${r.itemName}`} title="View" onClick={onView}><Icon name="icon-eye" size={16} /></button>
          <button type="button" className="icon-btn" aria-label={`Edit ${r.itemName}`} title="Edit" onClick={onEdit}><Icon name="icon-pencil" size={16} /></button>
          <button type="button" className="icon-btn" aria-label={`Delete ${r.itemName}`} title="Delete" onClick={onRemove}><Icon name="icon-trash" size={16} /></button>
        </td>
      </tr>
      {onEm && (
        <tr className="boq-sub"><td colSpan={COLSPAN}>
          <div className="em-box" role="group" aria-label={`${r.itemName} is available in Etimad E-Market`}>
            <div className="em-box-head">
              <span className="em-box-title"><Icon name="icon-warn-amber" size={18} />Available in Etimad E-Market</span>
              <button type="button" className="ai-btn ai-pillbtn" onClick={onCheck} disabled={checking}><AiSpark size={14} spin={checking} /><span>{checking ? 'Checking…' : 'Check again'}</span></button>
            </div>
            <p className="t-body-small">{r.etimad.comment}</p>
            {r.etimadDecision !== 'keep' ? (
              <>
                <p className="t-body-small">We suggest buying this item through a separate Etimad E-Market request instead of this tender.</p>
                <div className="em-box-actions">
                  <button type="button" className="btn btn-em-primary" onClick={onMove}>Move to Etimad E-Market request</button>
                  <button type="button" className="btn btn-em-secondary" onClick={() => onKeep(true)}>Keep in this tender</button>
                </div>
              </>
            ) : (
              <div className="em-keep">
                <TextArea rows={2} autoFocus={!r.etimadReason} value={r.etimadReason || ''} onChange={(e) => onReason(e.target.value)} placeholder="Why tender this instead of buying it on E-Market? e.g. it must be bundled with installation under one contract." aria-label={`Why keep ${r.itemName} in this tender`} />
                <div className="em-keep-foot">
                  {needsEtimadReason(r) ? <span className="t-caption">A reason is needed before you can submit.</span> : <span className="t-caption">Kept in this tender with a reason.</span>}
                  <button type="button" className="inline-link t-caption" onClick={onMove}>Move to E-Market instead</button>
                </div>
              </div>
            )}
          </div>
        </td></tr>
      )}
    </>
  );
}

/** Sample "Generate with AI" description from the item name and category. */
function aiDescription(r, cat) {
  const n = r.itemName.trim();
  if (cat === 'manpower') return `${n} working on site in Riyadh during official hours. Responsible for delivering the assigned workstream, reporting progress weekly and handing over documentation at the end of the assignment.`;
  if (cat === 'service') return `${n} delivered by qualified specialists, covering planning, execution, documentation and handover, with weekly progress reports and sign-off by the project owner.`;
  if (cat === 'material') return `${n} — new, original manufacturer stock with the standard warranty, delivered to the head office in Riyadh with licence keys and documentation where applicable.`;
  return `${n} — new equipment to the agreed specification, delivered, installed and tested on site, with a 3-year manufacturer warranty and spare-parts availability.`;
}

const EMPTY = { projectItem: '', category: '', itemName: '', itemDescription: '', unitOfMeasure: 'Each', quantity: '', unitPrice: '', deliveryDate: '', hasBrandName: false, brandJustification: '', mandatoryList: '' };
const EM_EMPTY = { purchaseType: 'product', itemName: '', productId: '', supplier: '', orderUnit: 'Each', quantity: 1, unitPrice: '', shippingCharges: '', startDate: '', endDate: '', deliveryDate: '', respName: '', respMobile: '' };

function ItemDialog({ row, em, budgeted, due, onClose, onSave }) {
  const [r, setR] = useState(() => ({ ...(em ? EM_EMPTY : EMPTY), deliveryDate: row.id ? '' : due || '', ...row }));
  const s = (k) => (v) => setR((x) => ({ ...x, [k]: v && v.target ? v.target.value : v }));
  const isNew = !row.id;
  const cat = r.category || (r.itemName ? boqTypeOf(r.itemName) : '');
  const mp = cat === 'manpower';
  const goods = cat === 'material' || cat === 'equipment';
  const valid = r.itemName.trim() && (em ? num(r.unitPrice) > 0 : (mp ? num(r.staffCount) > 0 : num(r.quantity) > 0) && num(r.unitPrice) > 0 && (!r.hasBrandName || r.brandJustification.trim()));
  // A changed name, description, quantity or price makes the stored Etimad check stale (see etimadStale).
  const ai = !em && r.acctSource !== 'user' ? suggestAccounting(r.itemName, r.itemDescription) : null;
  const acc = r.acctSource === 'user' ? { ptype: r.ptype, mg: r.mg } : ai || { ptype: r.ptype, mg: r.mg };
  const setAcc = (k) => (e) => setR((x) => ({ ...x, ptype: acc.ptype, mg: acc.mg, [k]: e.target.value, acctSource: 'user' }));
  const save = () => onSave(em ? r : { ...r, category: cat, ptype: acc.ptype, mg: acc.mg, acctSource: r.acctSource === 'user' ? 'user' : ai ? 'ai' : r.acctSource });
  const aiNote = ai && r.acctSource !== 'user' ? 'Suggested by AI from the name and description' : undefined;

  return (
    <Dialog open onClose={onClose} title={isNew ? 'Add item' : 'Edit item'} sub={isNew ? (em ? 'Fields adapt to the purchase type.' : 'Fill the fields, then save to add it to the table.') : (em ? undefined : 'Changing the name, quantity or price resets the Etimad check.')} className="sheet wide"
      foot={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!valid} onClick={save}>{isNew ? 'Add item' : 'Save changes'}</Btn></>}>
      {em ? (
        <div className="form-grid">
          <FieldBlock label="Purchase type" wide><Segment size="sm" label="Purchase type" value={r.purchaseType} onChange={s('purchaseType')} items={[{ id: 'product', label: 'Product' }, { id: 'service', label: 'Service' }, { id: 'vehicle-leasing', label: 'Vehicle leasing' }]} /></FieldBlock>
          <FieldBlock label={r.purchaseType === 'product' ? 'Product name' : 'Service name'} required wide><Input value={r.itemName} onChange={s('itemName')} placeholder="e.g. Dell Latitude 5450" /></FieldBlock>
          <FieldBlock label="Product ID"><Input value={r.productId} onChange={s('productId')} placeholder="Catalogue / SKU" /></FieldBlock>
          <FieldBlock label="Supplier"><Input value={r.supplier} onChange={s('supplier')} placeholder="Approved supplier name" /></FieldBlock>
          <FieldBlock label="Price (SAR)" required><NumInput value={r.unitPrice} onChange={s('unitPrice')} placeholder="0.00" /></FieldBlock>
          {r.purchaseType === 'product' ? (
            <>
              <FieldBlock label="Quantity"><NumInput value={r.quantity} onChange={s('quantity')} min={1} placeholder="1" /></FieldBlock>
              <FieldBlock label="Order unit"><Input value={r.orderUnit} onChange={s('orderUnit')} placeholder="e.g. Each, Box" /></FieldBlock>
              <FieldBlock label="Shipping (SAR)" optional><NumInput value={r.shippingCharges} onChange={s('shippingCharges')} placeholder="0.00" /></FieldBlock>
              <FieldBlock label="Delivery date"><Input type="date" value={r.deliveryDate} onChange={s('deliveryDate')} /></FieldBlock>
            </>
          ) : (
            <><FieldBlock label="Start date"><Input type="date" value={r.startDate} onChange={s('startDate')} /></FieldBlock><FieldBlock label="End date"><Input type="date" min={r.startDate} value={r.endDate} onChange={s('endDate')} /></FieldBlock></>
          )}
          <FieldBlock label="Delivery note — responsible name" optional><Input value={r.respName} onChange={s('respName')} placeholder="Full name" /></FieldBlock>
          <FieldBlock label="Responsible mobile" optional><Input value={r.respMobile} onChange={s('respMobile')} placeholder="05XXXXXXXX" inputMode="tel" /></FieldBlock>
          <div className="dlg-total t-body wide"><span className="muted">Line total</span><span className="t-body-medium">{sarFmt(lineTotal(r, true), 2)}</span></div>
        </div>
      ) : (
        <div className="form-grid">
          <FieldBlock label="Budgeted item">
            <Select value={r.projectItem} onChange={s('projectItem')}><option value="">Select budgeted item…</option>{budgeted.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}</Select>
          </FieldBlock>
          <FieldBlock label="Category" hint={!r.category && cat ? `Detected: ${catName(cat)}` : undefined}>
            <Select value={r.category} onChange={s('category')}><option value="">Detect from the item</option>{BOQ_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.en}</option>)}</Select>
          </FieldBlock>
          <FieldBlock label={mp ? 'Role' : 'Item name'} required wide><Input value={r.itemName} onChange={s('itemName')} placeholder={mp ? 'e.g. Senior ERP Consultant' : 'Item name…'} /></FieldBlock>
          <FieldBlock label="Description" wide hint={`${words(r.itemDescription)} of ${MIN_WORDS.boqDesc}+ words — EA checks the specification and Finance picks the material group from it.`}
            action={<AiBtn label="Generate with AI" busyLabel="Writing…" className="ai-sm" disabled={!r.itemName.trim()} onRun={() => setR((x) => ({ ...x, itemDescription: aiDescription(x, cat) }))} delay={800} />}>
            <TextArea rows={3} value={r.itemDescription} onChange={s('itemDescription')} placeholder={mp ? 'Describe the role, responsibilities and requirements…' : 'Describe this item…'} />
          </FieldBlock>
          {mp ? (
            <>
              <FieldBlock label="Job title"><Input value={r.jobTitle || ''} onChange={s('jobTitle')} placeholder="e.g. ERP Technical Consultant" /></FieldBlock>
              <FieldBlock label="Staff count" required><NumInput value={r.staffCount ?? ''} onChange={s('staffCount')} min={1} placeholder="1" /></FieldBlock>
              <FieldBlock label="Minimum qualification"><Select value={r.minQualification || ''} onChange={s('minQualification')}><option value="">Select…</option>{QUALIFICATIONS.map((q) => <option key={q.value} value={q.value}>{q.en}</option>)}</Select></FieldBlock>
              <FieldBlock label="Minimum years of experience"><NumInput value={r.minExperienceYears ?? ''} onChange={s('minExperienceYears')} placeholder="0" /></FieldBlock>
              <FieldBlock label="Official working hours"><NumInput value={r.officialWorkingHours ?? ''} onChange={s('officialWorkingHours')} placeholder="e.g. 8" suffix="h/day" /></FieldBlock>
              <FieldBlock label="Expected extra hours" optional><NumInput value={r.extraWorkingHours ?? ''} onChange={s('extraWorkingHours')} placeholder="e.g. 2" suffix="h/day" /></FieldBlock>
              <FieldBlock label="Rate per staff (SAR)" required hint="Total = staff count × rate."><NumInput value={r.unitPrice} onChange={s('unitPrice')} placeholder="0.00" /></FieldBlock>
              <FieldBlock label="Nationality required?" inline><YesNo name="Nationality required" value={!!r.nationalityRequired} onChange={s('nationalityRequired')} /></FieldBlock>
              {r.nationalityRequired && (
                <FieldBlock label="Nationalities" wide>
                  <div className="chips">{NATIONALITIES.map((n) => { const on = (r.nationalities || []).includes(n); return <button key={n} type="button" className={`chip-btn${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setR((x) => ({ ...x, nationalities: on ? x.nationalities.filter((y) => y !== n) : [...(x.nationalities || []), n] }))}>{n}</button>; })}</div>
                </FieldBlock>
              )}
            </>
          ) : (
            <>
              <FieldBlock label="Unit"><Select value={r.unitOfMeasure} onChange={s('unitOfMeasure')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select></FieldBlock>
              <FieldBlock label="Quantity" required><NumInput value={r.quantity} onChange={s('quantity')} min={1} placeholder="0" /></FieldBlock>
              <FieldBlock label="Unit price (SAR)" required><NumInput value={r.unitPrice} onChange={s('unitPrice')} placeholder="0.00" /></FieldBlock>
              <FieldBlock label="Needed by" optional><Input type="date" value={r.deliveryDate} onChange={s('deliveryDate')} /></FieldBlock>
              {goods && <FieldBlock label="Mandatory list reference" optional wide info="Material and equipment may fall under the mandatory list of national products and must be bought from approved listed companies."><Input value={r.mandatoryList} onChange={s('mandatoryList')} placeholder="Listed company or product reference…" /></FieldBlock>}
              <FieldBlock label="Specific brand required?" inline><YesNo name="Brand name" value={!!r.hasBrandName} onChange={s('hasBrandName')} /></FieldBlock>
              {r.hasBrandName && <FieldBlock label="Brand justification" required wide><TextArea rows={2} value={r.brandJustification} onChange={s('brandJustification')} placeholder="Explain why a specific brand is required…" /></FieldBlock>}
            </>
          )}
          <FieldBlock label={<>Purchase type{aiNote && <AiMark />}</>} hint={aiNote}>
            <Select value={acc.ptype || ''} onChange={setAcc('ptype')}><option value="">Select…</option>{PURCHASE_TYPES.map((x) => <option key={x.id} value={x.id}>{x.en}</option>)}</Select>
          </FieldBlock>
          <FieldBlock label={<>Material group{aiNote && <AiMark />}</>} hint={acc.mg ? `GL: ${mgOf(acc.mg)?.gl}` : 'Finance books the line to this group’s GL account.'}>
            <Select value={acc.mg || ''} onChange={setAcc('mg')}><option value="">Select…</option>{MATERIAL_GROUPS.map((m) => <option key={m.code} value={m.code}>{m.en} · {m.code}</option>)}</Select>
          </FieldBlock>
          <div className="dlg-total t-body wide"><span className="muted">Line total</span><span className="t-body-medium">{sarFmt(lineTotal({ ...r, category: cat }), 2)}</span></div>
        </div>
      )}
    </Dialog>
  );
}

function DetailDialog({ r, em, onClose, onEdit }) {
  const rows = em
    ? [['Purchase type', r.purchaseType], ['Product ID', r.productId], ['Supplier', r.supplier], ['Price', sarFmt(r.unitPrice, 2)], ['Quantity', r.quantity], ['Shipping', sarFmt(r.shippingCharges, 2)], ['Period', r.startDate && `${r.startDate} → ${r.endDate}`], ['Responsible', [r.respName, r.respMobile].filter(Boolean).join(' · ')], ['Line total', sarFmt(lineTotal(r, true), 2)]]
    : [['Budgeted item', r.projectItem], ['Category', catName(r.category)], ['Description', r.itemDescription], ['Quantity', r.category === 'manpower' ? `${r.staffCount} staff` : `${r.quantity} ${r.unitOfMeasure}`], ['Unit price', sarFmt(r.unitPrice, 2)], ['Needed by', r.deliveryDate], ['Purchase type', ptypeName(r.ptype) + (r.acctSource === 'ai' ? ' · suggested by AI' : '')], ['Material group', mgOf(r.mg) && `${mgOf(r.mg).en} · ${r.mg}`], ['Job title', r.jobTitle], ['Min. qualification', QUALIFICATIONS.find((q) => q.value === r.minQualification)?.en], ['Experience', r.minExperienceYears && `${r.minExperienceYears}+ years`], ['Nationalities', r.nationalityRequired && (r.nationalities || []).join(', ')], ['Brand', r.hasBrandName ? r.brandJustification : 'Not required'], ['Mandatory list', r.mandatoryList], ['Etimad', r.etimad && `${ETIMAD[r.etimad.status].label} — ${r.etimad.comment}`], ['Line total', sarFmt(lineTotal(r), 2)]];
  return (
    <Dialog open onClose={onClose} title={r.itemName || 'Unnamed item'} className="sheet" foot={<><Btn variant="secondary" onClick={onClose}>Close</Btn><Btn variant="primary" icon="icon-pencil" onClick={onEdit}>Edit</Btn></>}>
      <dl className="kv-list">{rows.filter(([, v]) => v !== undefined && v !== '' && v !== null && v !== false).map(([k, v]) => <div key={k}><dt className="t-caption muted">{k}</dt><dd className="t-body">{String(v)}</dd></div>)}</dl>
    </Dialog>
  );
}

function TemplateDialog({ open, onClose, onRows, existing = [] }) {
  const ref = useRef(null);
  const [msg, setMsg] = useState('');
  const [over, setOver] = useState(false);
  const read = (file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { setMsg('Please upload the .csv template.'); return; }
    file.text().then((txt) => {
      const lines = txt.split(/\r?\n/).filter(Boolean).slice(1);
      const parsed = lines.map((l) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')))
        .filter((c) => c[2]?.trim())
        .map((c) => ({ projectItem: c[0], category: BOQ_CATEGORIES.find((x) => x.en.toLowerCase() === (c[1] || '').toLowerCase())?.id || '', itemName: c[2], itemDescription: c[3] || '', unitOfMeasure: c[4] || 'Each', quantity: Number(c[5]) || '', unitPrice: Number(c[6]) || '' }));
      if (!parsed.length) { setMsg('No valid rows found. Check the template columns.'); return; }
      onRows(parsed); setMsg(''); onClose();
    }).catch(() => setMsg('Couldn’t read the file. Use the downloaded template.'));
  };
  return (
    <Dialog open={open} onClose={onClose} title="Build from a template" sub="Download the sheet, fill it in, then upload it back." foot={<Btn variant="secondary" onClick={onClose}>Close</Btn>}>
      <ol className="tpl-steps">
        <li><span className="num-dot">1</span><div><div className="t-body-medium">Download the template</div><div className="t-body-small muted">A sheet with the right columns{existing.length ? ', pre-filled with your current items' : ''}.</div>
          <Btn variant="secondary-sm" icon="icon-download" onClick={() => download('boq-template.csv', [COLS.join(','), ...existing.map((r) => [r.projectItem, catName(r.category), r.itemName, r.itemDescription, r.unitOfMeasure, r.quantity, r.unitPrice].map(csvCell).join(','))].join('\n'))}>{existing.length ? 'Download pre-filled' : 'Download template'}</Btn></div></li>
        <li><span className="num-dot">2</span><div style={{ flex: 1 }}><div className="t-body-medium">Upload the completed file</div>
          <div className={`dropzone${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]); }}>
            <span className="t-body-small">Drop the file here, or <button type="button" className="inline-link" onClick={() => ref.current?.click()}>browse</button></span>
            <span className="t-caption muted">.csv · max 10 MB</span>
            <input ref={ref} type="file" accept=".csv" hidden onChange={(e) => { read(e.target.files[0]); e.target.value = ''; }} />
          </div>
          {msg && <p className="ffield-error t-body-small" role="alert">{msg}</p>}
        </div></li>
      </ol>
    </Dialog>
  );
}
