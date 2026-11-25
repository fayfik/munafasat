// Editable spreadsheet view of the BOQ (design-review BoqSheet / EsouqBoqTable):
// click any cell to edit, Enter moves down (and adds a row at the end), paste
// rows straight from Excel, add rows inline. Empty required cells are marked.
import { useRef } from 'react';
import { Icon } from './ui.jsx';
import { sarFmt } from './FormKit.jsx';
import { UNITS } from '../data/newRequest.js';
import { lineTotal, boqMissing } from '../lib/requestRules.js';
import { withAccounting } from '../lib/accounting.js';

const EM_TYPES = [['product', 'Product'], ['service', 'Service'], ['vehicle-leasing', 'Vehicle lease']];

export function BoqSheet({ rows, em, budgeted, list }) {
  const ref = useRef(null);
  const cols = em ? [
    { key: 'purchaseType', label: 'Type', type: 'select', opts: EM_TYPES, w: 120 },
    { key: 'itemName', label: 'Name', w: 220 },
    { key: 'productId', label: 'Product ID', w: 120 },
    { key: 'supplier', label: 'Supplier', w: 150 },
    { key: 'orderUnit', label: 'Order unit', w: 100, only: (r) => r.purchaseType === 'product' },
    { key: 'quantity', label: 'Qty', type: 'num', w: 70, only: (r) => r.purchaseType === 'product' },
    { key: 'unitPrice', label: 'Price (SAR)', type: 'num', w: 120 },
    { key: 'deliveryDate', label: 'Delivery date', type: 'date', w: 140, only: (r) => r.purchaseType === 'product' },
    { key: 'startDate', label: 'Start date', type: 'date', w: 140, only: (r) => r.purchaseType !== 'product' },
    { key: 'endDate', label: 'End date', type: 'date', w: 140, only: (r) => r.purchaseType !== 'product' },
  ] : [
    { key: 'projectItem', label: 'Budgeted item', type: 'select', opts: budgeted.map((b) => [b.name, b.name]), w: 170 },
    { key: 'itemName', label: 'Item name', w: 200 },
    { key: 'itemDescription', label: 'Description', w: 260 },
    { key: 'unitOfMeasure', label: 'Unit', type: 'select', opts: UNITS.map((u) => [u, u]), w: 110 },
    { key: 'quantity', label: 'Qty', type: 'num', w: 80 },
    { key: 'unitPrice', label: 'Unit price (SAR)', type: 'num', w: 130 },
    { key: 'deliveryDate', label: 'Needed by', type: 'date', w: 140 },
  ];
  const editable = cols.filter((c) => c.type !== 'select');
  const blank = (type = 'product') => (em ? { purchaseType: type, itemName: '', productId: '', supplier: '', orderUnit: 'Each', quantity: 1, unitPrice: '', shippingCharges: 0 } : { projectItem: budgeted.length === 1 ? budgeted[0].name : '', itemName: '', itemDescription: '', unitOfMeasure: '', quantity: '', unitPrice: '', deliveryDate: '' });
  const focus = (ri, key) => setTimeout(() => ref.current?.querySelector(`[data-cell="${ri}:${key}"]`)?.focus(), 30);
  const update = (r, key, v) => {
    const patch = { [key]: v };
    if (!em && (key === 'itemName' || key === 'itemDescription') && r.acctSource !== 'user') Object.assign(patch, withAccounting({ ...r, ...patch }));
    list.update(r.id, patch);
  };
  const onKey = (e, ri, key) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (ri === rows.length - 1) { list.add(blank(rows[ri]?.purchaseType)); }
    focus(ri + 1, key);
  };
  // Paste a block from Excel: tab-separated columns, one line per row, starting at this cell.
  const onPaste = (e, ri, key) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    const start = cols.findIndex((c) => c.key === key);
    const parse = (c, v) => (c.type === 'num' ? Number(String(v).replace(/[^\d.]/g, '')) || '' : String(v).trim());
    const add = [];
    lines.forEach((line, i) => {
      const vals = line.split('\t');
      const patch = {};
      vals.forEach((v, j) => { const c = cols[start + j]; if (c) patch[c.key] = parse(c, v); });
      const target = rows[ri + i];
      if (target) list.update(target.id, em ? patch : withAccounting({ ...target, ...patch }));
      else add.push(em ? { ...blank(), ...patch } : withAccounting({ ...blank(), ...patch }));
    });
    if (add.length) list.addMany(add);
  };

  return (
    <div className="sheet-wrap" ref={ref}>
      <p className="t-body-small muted sheet-hint"><Icon name="icon-info" size={14} />Click any cell to edit. Enter moves down and adds a row at the end. Paste rows from Excel straight into a cell.</p>
      <div className="table-scroll">
        <table className="boq-sheet t-body-small">
          <thead><tr><th className="sh-no">#</th>{cols.map((c) => <th key={c.key} style={{ minWidth: c.w }} className={c.type === 'num' ? 'num' : ''}>{c.label}</th>)}<th className="num" style={{ minWidth: 120 }}>Total (SAR)</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {rows.map((r, ri) => {
              const miss = new Set(boqMissing(r, em).map((m) => m.key));
              return (
                <tr key={r.id}>
                  <td className="sh-no tnum muted">{ri + 1}</td>
                  {cols.map((c) => {
                    if (c.only && !c.only(r)) return <td key={c.key} className="sh-na" title="Not applicable for this type">—</td>;
                    const v = r[c.key] ?? '';
                    const cls = `sh-cell${miss.has(c.key) ? ' miss' : ''}`;
                    const common = { 'data-cell': `${ri}:${c.key}`, 'aria-label': `${c.label}, row ${ri + 1}`, className: cls, onKeyDown: (e) => onKey(e, ri, c.key), onPaste: (e) => onPaste(e, ri, c.key) };
                    return (
                      <td key={c.key} className={c.type === 'num' ? 'num' : ''}>
                        {c.type === 'select' ? (
                          <select {...common} value={v} onChange={(e) => update(r, c.key, e.target.value)}><option value="">Select…</option>{c.opts.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
                        ) : (
                          <input {...common} type={c.type === 'date' ? 'date' : 'text'} inputMode={c.type === 'num' ? 'decimal' : undefined} value={v} onChange={(e) => update(r, c.key, c.type === 'num' ? (e.target.value === '' ? '' : Number(e.target.value.replace(/[^\d.]/g, '')) || 0) : e.target.value)} />
                        )}
                      </td>
                    );
                  })}
                  <td className="num tnum t-body-medium sh-total">{sarFmt(lineTotal(r, em))}</td>
                  <td className="sh-del"><button type="button" className="icon-btn" aria-label={`Delete row ${ri + 1}`} title="Delete row" onClick={() => list.remove(r.id)}><Icon name="icon-trash" size={15} /></button></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={cols.length + 3} className="sh-empty t-body-small muted">No items yet. Add a row below, or paste rows from Excel.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="row-gap sheet-add">
        {em ? EM_TYPES.map(([id, l]) => (
          <button key={id} type="button" className="add-row" onClick={() => { list.add(blank(id)); focus(rows.length, 'itemName'); }}><Icon name="icon-plus" size={14} />Add {l.toLowerCase()}</button>
        )) : <button type="button" className="add-row" onClick={() => { list.add(blank()); focus(rows.length, 'itemName'); }}><Icon name="icon-plus" size={14} />Add row</button>}
        <span className="grow" />
        {editable.length > 0 && rows.some((r) => boqMissing(r, em).length) && <span className="t-caption amber">Highlighted cells still need a value.</span>}
      </div>
    </div>
  );
}
