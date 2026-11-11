import { Children, cloneElement, useState } from 'react';
import { Icon, Btn, Collapsible, Avatar, Tags } from './ui.jsx';
import { useTask, CommentBox } from './ReviewKit.jsx';
import { sar, boqTotal } from '../data/requests.js';
import { STANDARDS_4433, BCM_4433 } from '../data/content.js';

/* Wraps any section, field or row so it can be commented on while commenting mode is on. */
function C({ id, label, children, as: Tag = 'div', className = '' }) {
  const { commenting, comment, request, store } = useTask();
  const [open, setOpen] = useState(false);
  const count = (store.comments[request.id] || []).filter((c) => c.anchor?.id === id).length;
  const badge = count > 0 && <span className="c-count" title={`${count} comment${count > 1 ? 's' : ''}`}>{count}</span>;
  const controls = commenting && (
    <>
      <button type="button" className="c-btn" aria-label={`Comment on ${label}`} onClick={() => setOpen(!open)}><Icon name="icon-comment-add" size={14} />Comment</button>
      {open && <div className="c-pop"><CommentBox placeholder={`Comment on ${label}…`} onCancel={() => setOpen(false)} onSubmit={(t) => { comment({ id, label }, t); setOpen(false); }} /></div>}
    </>
  );
  const cls = `${className}${commenting ? ' c-target' : ''}${open ? ' c-open' : ''}${count ? ' has-c' : ''}`;
  if (Tag === 'tr') {
    // Table rows can't hold extra elements: put the controls inside the last cell.
    const cells = Children.toArray(children);
    const last = cells.pop();
    return <tr className={cls} data-anchor={id}>{cells}{cloneElement(last, { className: `${last.props.className || ''} c-cell` }, last.props.children, badge, controls)}</tr>;
  }
  return <Tag className={cls} data-anchor={id}>{children}{badge}{controls}</Tag>;
}

function KV({ id, label, children }) {
  return <C id={id} label={label} className="field"><span className="t-caption muted">{label}</span><div className="t-body">{children}</div></C>;
}

export function RequestDetails() {
  const { request: r, commenting, openDetails } = useTask();
  const total = boqTotal(r);
  const items = r.boq.reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="details">
      {commenting ? (
        <div className="banner brand sticky-banner">
          <Icon name="rail-comments" size={18} />
          <div className="banner-text"><div className="t-body-medium">Commenting is on</div><div className="t-body-small">Hover any section, row or field and choose Comment. Comments are posted to the Comments panel with the section name.</div></div>
          <Btn variant="secondary" icon="icon-check-brand" onClick={() => openDetails(false)}>Done commenting</Btn>
        </div>
      ) : (
        <div className="details-bar">
          <span className="t-body-small muted">Add comments to any section or field — they are posted to Comments with the section name.</span>
          <div className="row-gap">
            <Btn variant="ghost-sm" icon="icon-download">Download PDF</Btn>
            <Btn variant="secondary" icon="icon-comment-add" onClick={() => openDetails(true)}>Add comments</Btn>
          </div>
        </div>
      )}

      <C id="sec-setup" label="Project setup" as="div" className="c-section">
        <Collapsible title="Project setup">
          <div className="field-grid">
            <KV id="f-code" label="Project code">{r.code}</KV>
            <KV id="f-name-en" label="Project name (English)">{r.projectEn}</KV>
            <KV id="f-name-ar" label="Project name (Arabic)"><span dir="rtl" lang="ar">{r.projectAr}</span></KV>
            <KV id="f-cc" label="Cost center">{r.costCenter}</KV>
            <KV id="f-route" label="Procurement route">{r.route}</KV>
          </div>
          <KV id="f-items" label="Selected budgeted items"><span className="chips">{r.budgetItems.map((b) => <span className="chip" key={b}>{b}</span>)}</span></KV>
          <KV id="f-purpose" label="Purpose">{r.purpose}</KV>
        </Collapsible>
      </C>

      <C id="sec-scope" label="Scope of work" className="c-section">
        <Collapsible title="Scope of work">
          <KV id="f-scope" label="Project scope of work">{r.scope}</KV>
          <KV id="f-approvals" label="Which department’s approval is necessary?"><span className="chips">{r.approvals.map((b) => <span className="chip" key={b}>{b}</span>)}</span></KV>
          <KV id="f-terms" label="Scope-specific terms & conditions">{r.terms}</KV>
          <div className="field-grid">
            <KV id="f-start" label="Work / services start date">{r.start}</KV>
            <KV id="f-duration" label="Contract duration">{r.duration}</KV>
            <KV id="f-location" label="Execution location">{r.location}</KV>
          </div>
        </Collapsible>
      </C>

      <C id="sec-boq" label="Bill of quantities" className="c-section">
        <Collapsible title="Bill of quantities" meta={`${items} items · ${sar(total)}`}>
          <div className="table-scroll">
            <table className="plain-table boq">
              <thead><tr><th>#</th><th>Item</th><th>Category</th><th>Delivery</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th></tr></thead>
              {r.boq.map((g) => (
                <tbody key={g.name}>
                  <tr className="group-row"><td colSpan={6}>{g.name} <span className="muted">· {g.items.length} item{g.items.length > 1 ? 's' : ''}</span></td><td className="num">{sar(g.items.reduce((a, i) => a + i.total, 0))}</td></tr>
                  {g.items.map((i) => (
                    <C key={i.no} as="tr" id={`boq-${i.no}`} label={`BOQ item ${i.no} — ${i.item}`}>
                      <td className="muted">{i.no}</td><td>{i.item}<span className="sub">{i.desc}</span></td><td>{i.cat}</td><td className="muted">{i.delivery}</td><td className="num">{i.qty}</td><td className="num">{sar(i.unit)}</td><td className="num">{sar(i.total)}</td>
                    </C>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr><td colSpan={6}>Subtotal</td><td className="num">{sar(total)}</td></tr>
                <tr><td colSpan={6} className="muted">VAT (15%)</td><td className="num muted">{sar(total * 0.15)}</td></tr>
                <tr className="grand"><td colSpan={6}>Grand total</td><td className="num">{sar(total * 1.15)}</td></tr>
              </tfoot>
            </table>
          </div>
        </Collapsible>
      </C>

      <C id="sec-pay" label="Payment schedule" className="c-section">
        <Collapsible title="Payment schedule" meta={`${r.payments.length} stages · adds up to 100%`}>
          <table className="plain-table">
            <thead><tr><th>#</th><th>Stage</th><th>Deliverables</th><th className="num">%</th><th className="num">Amount</th></tr></thead>
            <tbody>{r.payments.map(([n, d, p], i) => <C key={n} as="tr" id={`pay-${i}`} label={`Payment stage ${i + 1} — ${n}`}><td className="muted">{i + 1}</td><td>{n}</td><td className="muted">{d}</td><td className="num">{p}%</td><td className="num">{sar(total * p / 100)}</td></C>)}</tbody>
            <tfoot><tr className="grand"><td colSpan={3}>Total</td><td className="num">100%</td><td className="num">{sar(total)}</td></tr></tfoot>
          </table>
        </Collapsible>
      </C>

      <C id="sec-tech" label="Technical evaluation" className="c-section">
        <Collapsible title="Technical evaluation" meta={`${r.techEval.criteria.length} criteria · passing ${r.techEval.passing}%`} defaultOpen={false}>
          <KV id="f-te-member" label="Technical evaluation member"><span className="person-chip"><Avatar person={r.techEval.member} size={20} /><span className="t-body">{r.techEval.member.name}</span><span className="t-caption muted">{r.techEval.member.role}</span></span></KV>
          <KV id="f-te-docs" label="Technical documents"><ul className="dot-list">{r.techEval.documents.map((d) => <li key={d.id}>{d.name}{d.mandatory && <span className="t-caption muted"> · Mandatory</span>}</li>)}</ul></KV>
          <table className="plain-table"><thead><tr><th>#</th><th>Requirement</th><th>Description</th></tr></thead>
            <tbody>{r.techEval.requirements.map((q, i) => <C key={q.id} as="tr" id={`te-req-${q.id}`} label={`Requirement — ${q.name}`}><td className="muted">{i + 1}</td><td>{q.name}</td><td className="muted">{q.desc}</td></C>)}</tbody></table>
          <table className="plain-table"><thead><tr><th>#</th><th>Criteria</th><th>How it is applied</th><th className="num">Weight</th></tr></thead>
            <tbody>{r.techEval.criteria.map((c, i) => <C key={c.id} as="tr" id={`te-cri-${c.id}`} label={`Criteria — ${c.name}`}><td className="muted">{i + 1}</td><td>{c.name}</td><td className="muted">{c.how}</td><td className="num">{c.weight}%</td></C>)}</tbody>
            <tfoot><tr className="grand"><td colSpan={3}>Total weight</td><td className="num">100%</td></tr></tfoot></table>
        </Collapsible>
      </C>

      <C id="sec-qual" label="Qualification criteria" className="c-section">
        <Collapsible title="Qualification criteria" meta={`3 main · 7 sub-criteria · passing ${r.qualification.passing}%`} defaultOpen={false}>
          <table className="plain-table"><thead><tr><th>Criteria</th><th>Range</th><th className="num">Weight</th></tr></thead>
            <tbody>{r.qualification.groups.flatMap((g) => [
              <tr key={g.id} className="group-row"><td colSpan={2}>{g.name}</td><td className="num">{g.weight}%</td></tr>,
              ...g.subs.map((s) => <C key={s.id} as="tr" id={`q-${s.id}`} label={`Qualification — ${s.name}`}><td style={{ paddingLeft: 24 }}>{s.name}</td><td className="muted">{s.range}</td><td className="num">{s.weight}%</td></C>),
            ])}</tbody></table>
        </Collapsible>
      </C>

      <C id="sec-att" label="Attachments" className="c-section">
        <Collapsible title="Attachments" meta={`${r.attachments.length} files`}>
          <ul className="file-list">
            {r.attachments.map((a) => (
              <li key={a.name}><span className={`file-type t-${a.type.toLowerCase()}`}>{a.type}</span><span className="file-name"><span className="t-body">{a.name}</span><span className="t-caption muted">{a.size} · {a.owner}</span></span><button type="button" className="link-btn">Preview</button></li>
            ))}
          </ul>
          {r.regulatory && <KV id="f-reg" label="Regulatory records"><span className="chips">{r.regulatory.map((b) => <span className="chip" key={b}>{b}</span>)}</span></KV>}
        </Collapsible>
      </C>

      {r.standards && (
        <>
          <C id="sec-std" label="Technical standards" className="c-section">
            <Collapsible title="Technical standards" meta="21 included · 1 not applicable" defaultOpen={false}>
              <ul className="std-list">{STANDARDS_4433.map((s) => <li key={s.text} className={`std${s.na ? ' na' : ''}`}><div className="t-body-small">{s.text}{s.na && <div className="t-caption muted">Not applicable — {s.na}</div>}</div><Tags items={s.na ? ['N/A', ...s.tags] : s.tags} /></li>)}</ul>
            </Collapsible>
          </C>
          <C id="sec-bcm" label="Business continuity" className="c-section">
            <Collapsible title="Business continuity & third-party risk" meta="BCM applies" defaultOpen={false}>
              <ul className="dot-list">{BCM_4433.map((b) => <li key={b}>{b}</li>)}</ul>
            </Collapsible>
          </C>
        </>
      )}
    </div>
  );
}
