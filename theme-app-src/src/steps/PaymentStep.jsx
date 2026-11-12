import { useState } from 'react';
import { Icon } from '../components/ui.jsx';
import { useForm, Block, Input, NumInput, AiBtn, TotalBar, MoreMenu, ConfirmDelete, sarFmt } from '../components/FormKit.jsx';
import { AI_PAYMENTS } from '../data/newRequest.js';
import { totals, num, words, MIN_WORDS } from '../lib/requestRules.js';

export function PaymentStep() {
  const { f, list } = useForm();
  const rows = list('paymentStages');
  const [confirmAll, setConfirmAll] = useState(false);
  const t = totals(f);
  const base = t.subtotal;

  return (
    <div className="stack" id="q-payment">
      <Block title="Payment stages" info="Tie each payment to a milestone. Enter a percentage or an amount — the other is worked out from the BOQ subtotal. The total must equal 100%."
        actions={<><AiBtn label="Suggest stages" onRun={() => { rows.clear(); rows.addMany(AI_PAYMENTS.map((x) => ({ ...x }))); }} />{f.paymentStages.length > 0 && <MoreMenu items={[{ label: 'Delete all stages', danger: true, onClick: () => setConfirmAll(true) }]} />}</>}>
        {f.paymentStages.length ? (
          <div className="table-scroll">
            <table className="plain-table edit-table">
              <thead><tr><th style={{ width: 28 }} aria-label="Order" /><th>Stage</th><th>Deliverables it pays for</th><th className="num" style={{ width: 110 }}>Share</th><th className="num" style={{ width: 160 }}>Amount (SAR)</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {f.paymentStages.map((r, i) => {
                  const amount = typeof r.amount === 'number' ? r.amount : (num(r.percentage) / 100) * base;
                  const thin = words(r.itemsDeliverables) < MIN_WORDS.deliverable;
                  return (
                    <tr key={r.id}>
                      <td className="order-cell">
                        <button type="button" className="mini-btn" aria-label="Move up" disabled={i === 0} onClick={() => rows.move(r.id, -1)}>↑</button>
                        <button type="button" className="mini-btn" aria-label="Move down" disabled={i === f.paymentStages.length - 1} onClick={() => rows.move(r.id, 1)}>↓</button>
                      </td>
                      <td><Input value={r.stageName} onChange={(e) => rows.update(r.id, { stageName: e.target.value })} placeholder="Stage name…" aria-label={`Stage ${i + 1} name`} /></td>
                      <td>
                        <Input value={r.itemsDeliverables} onChange={(e) => rows.update(r.id, { itemsDeliverables: e.target.value })} placeholder="e.g. Signed design document" aria-label={`Stage ${i + 1} deliverables`} />
                        {thin && r.stageName && <div className="issue t-caption"><Icon name="icon-warn" size={12} />Name the deliverable this pays for</div>}
                      </td>
                      <td className="num"><NumInput value={r.percentage} max={100} suffix="%" onChange={(v) => rows.update(r.id, { percentage: v, amount: undefined })} placeholder="0" aria-label={`Stage ${i + 1} percentage`} /></td>
                      <td className="num"><NumInput value={base ? Math.round(amount * 100) / 100 : ''} disabled={!base} onChange={(v) => rows.update(r.id, { amount: v === '' ? undefined : v, percentage: v === '' || !base ? '' : Math.round((v / base) * 10000) / 100 })} placeholder={base ? '0' : 'Add BOQ first'} aria-label={`Stage ${i + 1} amount`} /></td>
                      <td className="row-actions"><button type="button" className="icon-btn" aria-label={`Delete stage ${i + 1}`} onClick={() => rows.remove(r.id)}><Icon name="icon-x" size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="empty-line t-body-small muted">No payment stages yet. Add them yourself or let AI suggest stages from your deliverables.</p>}
        <button type="button" className="add-row" onClick={() => rows.add({ stageName: '', itemsDeliverables: '', percentage: '' })}><Icon name="icon-plus" size={14} />Add stage</button>
      </Block>
      {f.paymentStages.length > 0 && <TotalBar label="Total" value={Math.round(t.payPct * 100) / 100} extra={base ? <span className="t-caption muted">of {sarFmt(base)} before VAT</span> : null} />}
      <ConfirmDelete open={confirmAll} onClose={() => setConfirmAll(false)} onConfirm={rows.clear} title="Delete all payment stages?" />
    </div>
  );
}
