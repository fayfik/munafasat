import { useMemo, useRef, useState } from 'react';
import { Icon, Btn, Segment } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Input, Select, TextArea, NumInput, YesNo, Dialog, ConfirmDelete, MoreMenu, sarFmt } from '../components/FormKit.jsx';
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
  const { f, list, em } = useForm();
  const rows = list('boqItems');
  const [editing, setEditing] = useState(null); // row or {} for new
  const [view, setView] = useState('grouped');
  const [confirmAll, setConfirmAll] = useState(false);
  const [template, setTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [detail, setDetail] = useState(null);
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const budgeted = p ? p.items.filter((i) => (f.selectedItemIds || []).includes(i.id)) : [];
  const t = totals(f);

  const suggest = () => {
    setBusy(true);
    setTimeout(() => {
      if (em) rows.addMany(AI_EM_BOQ.map((r) => ({ ...r })));
      else {
        const names = budgeted.map((b) => b.name);
        const pick = AI_BOQ.filter((r) => !names.length || names.includes(r.projectItem));
        const src = pick.length ? pick : budgeted.map((b) => ({ projectItem: b.name, category: boqTypeOf(b.name, b.type), itemName: b.name, itemDescription: `Supply of ${b.name.toLowerCase()} as described in the scope of work, including delivery and handover`, unitOfMeasure: 'Service', quantity: 1, unitPrice: 100000 }));
        rows.addMany(src.map((r) => ({ ...r })));
      }
      setBusy(false);
    }, 1100);
  };

  const checkAll = () => {
    setChecking(true);
    setTimeout(() => { f.boqItems.forEach((r) => { if (!r.etimad || etimadStale(r)) rows.update(r.id, { etimad: checkEtimad(r) }); }); setChecking(false); }, 900);
  };

  const groups = useMemo(() => {
    if (view !== 'grouped' || em) return [['', f.boqItems]];
    const m = new Map();
    f.boqItems.forEach((r) => { const k = r.projectItem || 'Other items'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
    return [...m.entries()];
  }, [f.boqItems, view, em]);

  const unchecked = f.boqItems.filter((r) => !r.etimad || etimadStale(r)).length;
  const exportCsv = () => download('boq.csv', [COLS.join(','), ...f.boqItems.map((r) => [r.projectItem, catName(r.category), r.itemName, r.itemDescription, r.unitOfMeasure, r.quantity, r.unitPrice].map(csvCell).join(','))].join('\n'));

  if (!f.boqItems.length && !busy) {
    return (
      <div className="stack" id="q-boq">
        <p className="lede t-body muted">{em ? 'Add the products and services you’re buying directly from the Etimad E-Market catalogue.' : 'Define every item, quantity and unit price for this tender. Choose how you want to start — you can mix methods later.'}</p>
        <div className="start-grid">
          <button type="button" className="start-card rec" onClick={suggest}>
            <span className="tag strong">Recommended</span>
            <span className="t-title">Draft items with AI</span>
            <span className="t-body-small muted">Drafts items from your budgeted items and scope. Review and adjust each one.</span>
          </button>
          <button type="button" className="start-card" onClick={() => setTemplate(true)}>
            <span className="t-title">Use a template</span>
            <span className="t-body-small muted">Download the sheet, fill it in, upload it back. Fastest for long lists.</span>
          </button>
          <button type="button" className="start-card" onClick={() => setEditing({})}>
            <span className="t-title">Add items one by one</span>
            <span className="t-body-small muted">Full control over every detail.</span>
          </button>
        </div>
        <TemplateDialog open={template} onClose={() => setTemplate(false)} onRows={(rs) => rows.addMany(rs)} />
        {editing && <ItemDialog row={editing} em={em} budgeted={budgeted} onClose={() => setEditing(null)} onSave={(r) => { if (r.id) rows.update(r.id, r); else rows.add(r); setEditing(null); }} />}
      </div>
    );
  }

  return (
    <div className="stack" id="q-boq">
      {busy && <div className="checking compact" role="status"><span className="spinner" aria-hidden="true" /><span className="t-body">Drafting items from your project…</span></div>}

      <Block title={`${f.boqItems.length} item${f.boqItems.length === 1 ? '' : 's'}`} actions={
        <>
          {!em && <Segment size="sm" label="BOQ view" value={view} onChange={setView} items={[{ id: 'grouped', label: 'Grouped' }, { id: 'table', label: 'Table' }]} />}
          <Btn variant="secondary-sm" icon="icon-plus" onClick={() => setEditing({})}>Add item</Btn>
          <MoreMenu items={[
            { label: 'Draft more with AI', onClick: suggest },
            { label: 'Upload from a template', onClick: () => setTemplate(true) },
            { label: 'Download as CSV', onClick: exportCsv },
            { label: 'Delete all items', danger: true, onClick: () => setConfirmAll(true) },
          ]} />
        </>
      }>
        {!em && (
          <div className="etimad-bar">
            <div className="t-body-small"><span className="t-body-medium">Etimad E-Market availability</span> <span className="muted">· {unchecked ? `${unchecked} item${unchecked === 1 ? '' : 's'} not checked yet` : 'All items checked'}</span></div>
            <Btn variant="ghost-sm" disabled={!unchecked || checking} onClick={checkAll}>{checking ? 'Checking Etimad…' : 'Check all in Etimad'}</Btn>
          </div>
        )}
        <div className="table-scroll">
          <table className="plain-table boq-table">
            <thead><tr>
              <th>Item</th>
              {em ? <><th>Supplier</th><th className="num">Qty / period</th></> : <><th className="num">Qty</th><th className="num">Unit price</th></>}
              <th className="num">Total</th>
              {!em && <th>Etimad</th>}
              <th aria-label="Actions" />
            </tr></thead>
            {groups.map(([g, rs]) => (
              <tbody key={g || 'all'}>
                {g && <tr className="group-row"><td colSpan={6}>{g}<span className="muted" style={{ fontWeight: 400 }}> · {sarFmt(rs.reduce((s, r) => s + lineTotal(r, em), 0))}</span></td></tr>}
                {rs.map((r) => <BoqRow key={r.id} r={r} em={em} onEdit={() => setEditing(r)} onView={() => setDetail(r)} onRemove={() => rows.remove(r.id)} onCheck={() => rows.update(r.id, { etimad: checkEtimad(r) })} onReason={(v) => rows.update(r.id, { etimadReason: v })} />)}
              </tbody>
            ))}
            <tfoot>
              <tr><td colSpan={em ? 3 : 3} className="muted">Subtotal</td><td className="num">{sarFmt(t.subtotal, 2)}</td><td colSpan={2} /></tr>
              <tr><td colSpan={3} className="muted">VAT (15%)</td><td className="num">{sarFmt(t.vat, 2)}</td><td colSpan={2} /></tr>
              <tr className="grand"><td colSpan={3}>Total incl. VAT</td><td className="num">{sarFmt(t.total, 2)}</td><td colSpan={2} /></tr>
            </tfoot>
          </table>
        </div>
        <button type="button" className="add-row" onClick={() => setEditing({})}><Icon name="icon-plus" size={14} />Add item</button>
      </Block>

      {editing && <ItemDialog row={editing} em={em} budgeted={budgeted} onClose={() => setEditing(null)} onSave={(r) => { if (r.id) rows.update(r.id, r); else rows.add(r); setEditing(null); }} />}
      {detail && <DetailDialog r={f.boqItems.find((x) => x.id === detail.id) || detail} em={em} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); }} />}
      <TemplateDialog open={template} onClose={() => setTemplate(false)} onRows={(rs) => rows.addMany(rs)} existing={f.boqItems} />
      <ConfirmDelete open={confirmAll} onClose={() => setConfirmAll(false)} onConfirm={rows.clear} title="Delete all items?" />
    </div>
  );
}

function BoqRow({ r, em, onEdit, onView, onRemove, onCheck, onReason }) {
  const st = r.etimad && !etimadStale(r) ? ETIMAD[r.etimad.status] : null;
  const thin = !em && words(r.itemDescription) < MIN_WORDS.boqDesc;
  const brandMissing = r.hasBrandName && !(r.brandJustification ?? '').trim();
  return (
    <>
      <tr className="boq-row">
        <td>
          <button type="button" className="row-title" onClick={onView}><span className="t-body-medium">{r.itemName || 'Unnamed item'}</span></button>
          <div className="t-body-small muted clamp-2">{em ? [r.purchaseType && (r.purchaseType === 'vehicle-leasing' ? 'Vehicle leasing' : r.purchaseType[0].toUpperCase() + r.purchaseType.slice(1)), r.productId].filter(Boolean).join(' · ') : r.itemDescription}</div>
          {(thin || brandMissing) && <div className="issue t-caption"><Icon name="icon-warn" size={12} />{brandMissing ? 'Brand name needs a justification' : 'Add a clearer description'}</div>}
        </td>
        {em ? (
          <><td className="muted">{r.supplier || '—'}</td><td className="num">{r.purchaseType === 'product' ? `${num(r.quantity) || 1} ${r.orderUnit || ''}` : r.startDate && r.endDate ? `${r.startDate} → ${r.endDate}` : '—'}</td></>
        ) : (
          <><td className="num">{r.category === 'manpower' ? `${num(r.staffCount) || num(r.quantity)} staff` : `${num(r.quantity)} ${r.unitOfMeasure || ''}`}</td><td className="num">{sarFmt(r.unitPrice)}</td></>
        )}
        <td className="num t-body-medium">{sarFmt(lineTotal(r, em))}</td>
        {!em && (
          <td>
            {st ? <span className={`state-tag ${st.cls}`} title={r.etimad.comment}>{st.label}</span>
              : <button type="button" className="inline-link t-body-small" onClick={onCheck}>{r.etimad ? 'Item changed — re-check' : 'Check'}</button>}
          </td>
        )}
        <td className="row-actions">
          <button type="button" className="icon-btn" aria-label={`Edit ${r.itemName}`} onClick={onEdit}><Icon name="icon-pencil" size={16} /></button>
          <button type="button" className="icon-btn" aria-label={`Delete ${r.itemName}`} onClick={onRemove}><Icon name="icon-x" size={16} /></button>
        </td>
      </tr>
      {!em && st && r.etimad.status === 'available' && (
        <tr className="boq-sub"><td colSpan={6}>
          <div className="etimad-note">
            <span className="t-body-small">{r.etimad.comment} Keep it in this tender only if it must be bundled — say why.</span>
            <TextArea rows={1} value={r.etimadReason || ''} onChange={(e) => onReason(e.target.value)} placeholder="Why tender this instead of buying it on E-Market?" aria-label={`Why tender ${r.itemName}`} />
            {needsEtimadReason(r) && <span className="t-caption amber">A reason is needed before you can submit.</span>}
          </div>
        </td></tr>
      )}
    </>
  );
}

const EMPTY = { projectItem: '', category: '', itemName: '', itemDescription: '', unitOfMeasure: 'Each', quantity: '', unitPrice: '', deliveryDate: '', hasBrandName: false, brandJustification: '', mandatoryList: '' };
const EM_EMPTY = { purchaseType: 'product', itemName: '', productId: '', supplier: '', orderUnit: 'Each', quantity: 1, unitPrice: '', shippingCharges: '', startDate: '', endDate: '', deliveryDate: '', respName: '', respMobile: '' };

function ItemDialog({ row, em, budgeted, onClose, onSave }) {
  const [r, setR] = useState(() => ({ ...(em ? EM_EMPTY : EMPTY), ...row }));
  const s = (k) => (v) => setR((x) => ({ ...x, [k]: v && v.target ? v.target.value : v }));
  const isNew = !row.id;
  const cat = r.category || (r.itemName ? boqTypeOf(r.itemName) : '');
  const mp = cat === 'manpower';
  const goods = cat === 'material' || cat === 'equipment';
  const valid = r.itemName.trim() && (em ? num(r.unitPrice) > 0 : (mp ? num(r.staffCount) > 0 : num(r.quantity) > 0) && num(r.unitPrice) > 0 && (!r.hasBrandName || r.brandJustification.trim()));
  // A changed name, description, quantity or price makes the stored Etimad check stale (see etimadStale).
  const save = () => onSave({ ...r, category: em ? undefined : cat });

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
          <FieldBlock label="Description" wide hint={`${words(r.itemDescription)} of ${MIN_WORDS.boqDesc}+ words — EA checks the specification and Finance picks the material group from it.`}>
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
              <FieldBlock label="Nationality required?"><YesNo name="Nationality required" value={!!r.nationalityRequired} onChange={s('nationalityRequired')} /></FieldBlock>
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
              <FieldBlock label="Delivery date" optional><Input type="date" value={r.deliveryDate} onChange={s('deliveryDate')} /></FieldBlock>
              {goods && <FieldBlock label="Mandatory list reference" optional wide info="Material and equipment may fall under the mandatory list of national products and must be bought from approved listed companies."><Input value={r.mandatoryList} onChange={s('mandatoryList')} placeholder="Listed company or product reference…" /></FieldBlock>}
              <FieldBlock label="Specific brand required?"><YesNo name="Brand name" value={!!r.hasBrandName} onChange={s('hasBrandName')} /></FieldBlock>
              {r.hasBrandName && <FieldBlock label="Brand justification" required wide><TextArea rows={2} value={r.brandJustification} onChange={s('brandJustification')} placeholder="Explain why a specific brand is required…" /></FieldBlock>}
            </>
          )}
          <div className="dlg-total t-body wide"><span className="muted">Line total</span><span className="t-body-medium">{sarFmt(lineTotal({ ...r, category: cat }), 2)}</span></div>
        </div>
      )}
    </Dialog>
  );
}

function DetailDialog({ r, em, onClose, onEdit }) {
  const rows = em
    ? [['Purchase type', r.purchaseType], ['Product ID', r.productId], ['Supplier', r.supplier], ['Price', sarFmt(r.unitPrice, 2)], ['Quantity', r.quantity], ['Shipping', sarFmt(r.shippingCharges, 2)], ['Period', r.startDate && `${r.startDate} → ${r.endDate}`], ['Responsible', [r.respName, r.respMobile].filter(Boolean).join(' · ')], ['Line total', sarFmt(lineTotal(r, true), 2)]]
    : [['Budgeted item', r.projectItem], ['Category', catName(r.category)], ['Description', r.itemDescription], ['Quantity', r.category === 'manpower' ? `${r.staffCount} staff` : `${r.quantity} ${r.unitOfMeasure}`], ['Unit price', sarFmt(r.unitPrice, 2)], ['Job title', r.jobTitle], ['Min. qualification', QUALIFICATIONS.find((q) => q.value === r.minQualification)?.en], ['Experience', r.minExperienceYears && `${r.minExperienceYears}+ years`], ['Nationalities', r.nationalityRequired && (r.nationalities || []).join(', ')], ['Brand', r.hasBrandName ? r.brandJustification : 'Not required'], ['Mandatory list', r.mandatoryList], ['Etimad', r.etimad && `${ETIMAD[r.etimad.status].label} — ${r.etimad.comment}`], ['Line total', sarFmt(lineTotal(r), 2)]];
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
