import { useState } from 'react';
import { Icon, Btn, Collapsible, Field } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Input, TextArea, YesNo, ChipList, sarFmt } from '../components/FormKit.jsx';
import { PROJECTS, COST_CENTERS, STD_GROUPS, STD_VERSION, BCM_VERDICT, RISK_RATING, NEXT_STEPS, BOQ_CATEGORIES, SECTIONS } from '../data/newRequest.js';
import {
  totals, lineTotal, blockers, inEaScope, stdQuestions, standardsFor, deploymentOf,
  bcmQuestions, tprQuestions, bcmVerdict, bcmClauses, tprRating, num,
} from '../lib/requestRules.js';
import { fileExt, fileSize } from './AttachmentsStep.jsx';

const stepTitle = (id, em) => { const s = SECTIONS.find((x) => x.id === id); return id === 'setup' && em ? s.emTitle : s.title; };

export function ReviewStep() {
  const { f, set, goto, em, routeConfirmed } = useForm();
  const t = totals(f);
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const cc = COST_CENTERS.find((c) => c.id === f.costCenterId);
  const bl = blockers(f, routeConfirmed);
  const jump = (b) => { if (b.step !== 'review') goto(b.step); else document.getElementById(`rv-${b.anchor}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="stack">
      <div className="review-hero">
        <div className="hero-stat"><div className="t-caption muted">Total value</div><div className="t-stat">{sarFmt(t.total)}</div><div className="t-caption muted">incl. 15% VAT</div></div>
        <div className="hero-stat"><div className="t-caption muted">Items</div><div className="t-stat">{f.boqItems.length}</div><div className="t-caption muted">in the BOQ</div></div>
        {!em && <div className="hero-stat"><div className="t-caption muted">Payment stages</div><div className="t-stat">{f.paymentStages.length}</div><div className="t-caption muted">{t.payPct}% allocated</div></div>}
        <div className="hero-stat"><div className="t-caption muted">Route</div><div className="t-stat" style={{ fontSize: 18 }}>{em ? 'E-Market' : 'Tender'}</div><div className="t-caption muted">{p?.code}</div></div>
      </div>

      {bl.length > 0 ? (
        <div className="todo-box" role="status">
          <div className="todo-head"><Icon name="icon-warn" size={16} /><span className="t-body-medium">{bl.length} thing{bl.length === 1 ? '' : 's'} to fix before you submit</span></div>
          <ul>{bl.map((b, i) => <li key={i}><button type="button" className="todo-link" onClick={() => jump(b)}><span className="t-body">{b.en}</span><span className="t-caption muted">{b.step === 'review' ? 'Below' : stepTitle(b.step, em)}</span><Icon name="icon-chevron-right" size={14} /></button></li>)}</ul>
        </div>
      ) : (
        <div className="banner brand"><Icon name="icon-check-brand" size={16} /><div className="banner-text"><div className="t-body-medium">Ready to submit</div><div className="t-body-small">Every required step is complete and nothing here is likely to be returned.</div></div></div>
      )}

      {!em && inEaScope(f) && <Standards />}
      {!em && <Continuity />}
      {!em && p && (
        <Block title="Regulatory records" info="Vendors must provide valid copies of these records with their proposals. Project records are locked; add any extra ones this request needs.">
          <ChipList locked={p.regulatoryRecords} items={f.extraRegulatoryRecords} onChange={(v) => set('extraRegulatoryRecords', v)} placeholder="Type a record or licence and press Enter" label="Regulatory records" />
        </Block>
      )}

      <div className="summary-head"><h2 className="t-title">Your request</h2><span className="t-caption muted">Check each part, then submit</span></div>
      <div className="details">
        <Collapsible title={stepTitle('setup', em)} defaultOpen={false} actions={<button type="button" className="inline-link t-body-small" onClick={() => goto('setup')}>Edit</button>}>
          <div className="field-grid">
            <Field label="Project">{p?.name}</Field><Field label="Project code">{p?.code}</Field><Field label="Cost center">{cc ? `${cc.code} · ${cc.name}` : '—'}</Field>
            <Field label="Route">{em ? 'Etimad E-Market' : 'Competitive tender'}</Field>
            <Field label={em ? 'Purpose of purchase' : 'Purpose'} wide>{f.purpose || <span className="muted">Not completed</span>}</Field>
          </div>
        </Collapsible>
        {!em && (
          <Collapsible title="Scope of work" defaultOpen={false} actions={<button type="button" className="inline-link t-body-small" onClick={() => goto('scope')}>Edit</button>}>
            <p className="t-body pre">{f.scopeOfWork || <span className="muted">Not completed</span>}</p>
            {f.scopeTerms && <><div className="t-caption muted">Scope-specific terms</div><p className="t-body pre" style={{ margin: 0 }}>{f.scopeTerms}</p></>}
            <div className="field-grid">
              <Field label="Start date">{f.startDate || '—'}</Field><Field label="Duration">{f.contractDuration ? `${f.contractDuration} ${f.contractDurationType}` : '—'}</Field><Field label="Location">{f.executionLocation || '—'}</Field>
            </div>
          </Collapsible>
        )}
        <Collapsible title="Bill of quantities" meta={`${f.boqItems.length} items · ${sarFmt(t.subtotal)}`} defaultOpen={false} actions={<button type="button" className="inline-link t-body-small" onClick={() => goto('boq')}>Edit</button>}>
          {f.boqItems.length ? (
            <div className="table-scroll"><table className="plain-table compact">
              <thead><tr><th>Item</th>{!em && <th>Category</th>}<th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th></tr></thead>
              <tbody>{f.boqItems.map((r) => <tr key={r.id}><td>{r.itemName}</td>{!em && <td className="muted">{BOQ_CATEGORIES.find((c) => c.id === r.category)?.en || '—'}</td>}<td className="num">{r.category === 'manpower' ? r.staffCount : num(r.quantity) || 1}</td><td className="num">{sarFmt(r.unitPrice)}</td><td className="num">{sarFmt(lineTotal(r, em))}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={em ? 3 : 4} className="muted">VAT (15%)</td><td className="num">{sarFmt(t.vat)}</td></tr><tr className="grand"><td colSpan={em ? 3 : 4}>Total incl. VAT</td><td className="num">{sarFmt(t.total)}</td></tr></tfoot>
            </table></div>
          ) : <p className="t-body-small muted">No items added.</p>}
        </Collapsible>
        {!em && (
          <>
            <Collapsible title="Payment schedule" meta={`${f.paymentStages.length} stages · ${t.payPct}%`} defaultOpen={false} actions={<button type="button" className="inline-link t-body-small" onClick={() => goto('payment')}>Edit</button>}>
              {f.paymentStages.length ? <table className="plain-table compact"><thead><tr><th>Stage</th><th>Deliverables</th><th className="num">Share</th><th className="num">Amount</th></tr></thead><tbody>{f.paymentStages.map((s) => <tr key={s.id}><td>{s.stageName}</td><td className="muted">{s.itemsDeliverables}</td><td className="num">{num(s.percentage)}%</td><td className="num">{sarFmt(typeof s.amount === 'number' ? s.amount : (num(s.percentage) / 100) * t.subtotal)}</td></tr>)}</tbody></table> : <p className="t-body-small muted">No payment stages defined.</p>}
            </Collapsible>
            <Collapsible title="Technical evaluation" meta={`Passing ${f.technicalPassingPercentage || '—'}%`} defaultOpen={false} actions={<button type="button" className="inline-link t-body-small" onClick={() => goto('tech')}>Edit</button>}>
              <Field label="Evaluator">{f.technicalCommitteeMembers[0]?.name || <span className="muted">No one selected</span>}</Field>
              {f.evaluationCriteria.length > 0 && <table className="plain-table compact"><thead><tr><th>Criterion</th><th>How it’s scored</th><th className="num">Weight</th></tr></thead><tbody>{f.evaluationCriteria.map((c) => <tr key={c.id}><td>{c.description}</td><td className="muted">{c.howApplied}</td><td className="num">{num(c.weight)}%</td></tr>)}</tbody></table>}
              <Field label="Technical requirements">{f.technicalRequirements.length ? f.technicalRequirements.map((r) => r.requirement).join(' · ') : '—'}</Field>
            </Collapsible>
            <Collapsible title="Qualification" meta={`Passing ${f.qualificationPassingPercentage || '—'}%`} defaultOpen={false} actions={<button type="button" className="inline-link t-body-small" onClick={() => goto('qual')}>Edit</button>}>
              <Field label="Reviewers">{f.qualificationCommitteeMembers.map((m) => m.name).join(', ') || <span className="muted">No one selected</span>}</Field>
              <table className="plain-table compact"><thead><tr><th>Criteria</th><th>Range</th><th className="num">Weight</th></tr></thead>
                <tbody>{f.qualificationCriteria.map((m) => [<tr key={m.id} className="group-row"><td colSpan={2}>{m.name}</td><td className="num">{num(m.percentage)}%</td></tr>, ...m.subCriteria.map((s) => <tr key={s.id}><td style={{ paddingLeft: 24 }}>{s.name}</td><td className="muted">{s.range || '—'}</td><td className="num">{num(s.percentage)}%</td></tr>)])}</tbody></table>
            </Collapsible>
          </>
        )}
        <Collapsible title="Attachments" meta={f.attachments.length ? `${f.attachments.length} files` : 'Optional'} defaultOpen={false} actions={<button type="button" className="inline-link t-body-small" onClick={() => goto('attachments')}>Edit</button>}>
          {f.attachments.length ? <ul className="file-list">{f.attachments.map((a) => <li key={a.id}><span className={`file-type t-${fileExt(a.name)}`}>{fileExt(a.name).toUpperCase()}</span><span className="file-name"><span className="t-body">{a.name}</span><span className="t-caption muted">{fileSize(a.size)}</span></span></li>)}</ul> : <p className="t-body-small muted">No attachments (optional).</p>}
        </Collapsible>
      </div>
    </div>
  );
}

/* ── Technical standards (EA) ─────────────────────────────────────────────── */
function Standards() {
  const { f, set } = useForm();
  const qs = stdQuestions(f);
  const open = qs.filter((q) => q.value === undefined);
  const answer = (id, v) => set('techAnswers', (a) => ({ ...a, [id]: v }));
  const useSuggestions = () => set('techAnswers', (a) => { const n = { ...a }; qs.forEach((q) => { if (n[q.id] === undefined && q.guess) n[q.id] = q.guess.yes; }); return n; });
  const stds = standardsFor(f);
  const dep = deploymentOf(f.techAnswers ?? {});
  const groups = Object.entries(STD_GROUPS).map(([g, label]) => [label, stds.filter((s) => s.group === g)]).filter(([, xs]) => xs.length);
  const setNa = (id, p) => set('stdOverrides', (o) => ({ ...o, [id]: { ...(o[id] || {}), ...p } }));
  const suggestedOpen = open.filter((q) => q.guess).length;

  return (
    <Block id="rv-std" title="Technical standards" info={`This request is in Enterprise Architecture’s scope. Your answers decide which EA, Cybersecurity and PMO standards go into the RFP (library v${STD_VERSION}).`}
      meta={open.length ? `${open.length} to answer` : `Deployment: ${dep === 'saas' ? 'SaaS' : dep === 'hybrid' ? 'Hybrid' : 'On-premises'}`}
      actions={suggestedOpen > 0 && <Btn variant="secondary-sm" onClick={useSuggestions}>Use {suggestedOpen} suggested answer{suggestedOpen === 1 ? '' : 's'}</Btn>}>
      <ul className="q-list">
        {qs.map((q) => (
          <li key={q.id} className={`q-row${q.value === undefined ? ' open' : ''}`}>
            <div className="q-text">
              <span className="t-body">{q.en}</span>
              {q.guess && q.value === undefined && <span className="t-caption muted">Suggested {q.guess.yes ? 'Yes' : 'No'} · {q.guess.src}: “{q.guess.basis}”</span>}
            </div>
            <YesNo name={q.en} value={q.value} suggested={q.guess?.yes} onChange={(v) => answer(q.id, v)} />
          </li>
        ))}
      </ul>
      {open.length === 0 && (
        <div className="std-wrap">
          <div className="t-caption muted">{stds.length} standards go into the RFP. Mark one N/A only with a reason.</div>
          {groups.map(([label, xs]) => (
            <div key={label} className="std-group">
              <div className="t-label">{label}</div>
              <ul className="std-list">
                {xs.map((s) => (
                  <li key={s.id} className={`std${s.na ? ' na' : ''}`}>
                    <div className="grow">
                      <div className="t-body-small">{s.en}</div>
                      <div className="t-caption muted">{s.owner}{s.required ? ' · Required' : s.because ? ` · Because: ${s.because}` : ''}</div>
                      {s.na && <Input value={s.naReason} onChange={(e) => setNa(s.id, { naReason: e.target.value })} placeholder={s.required ? 'Why doesn’t this apply? (required)' : 'Why doesn’t this apply?'} aria-label={`Reason ${s.id} is not applicable`} className="na-reason" />}
                    </div>
                    <button type="button" className={`act-btn${s.na ? ' on' : ''}`} aria-pressed={s.na} onClick={() => setNa(s.id, { na: !s.na })}>{s.na ? 'Not applicable' : 'Mark N/A'}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Block>
  );
}

/* ── Business continuity + third-party risk ───────────────────────────────── */
function Continuity() {
  const { f, set } = useForm();
  const bq = bcmQuestions(f);
  const tq = tprQuestions(f);
  const b = f.bcmAnswers ?? {};
  const v = bcmVerdict(b);
  const clauses = bcmClauses(b);
  const rating = tprRating(f.tprAnswers ?? {}, v);
  const fill = (key, qs) => set(key, (a) => { const n = { ...a }; qs.forEach((q) => { if (n[q.id] === undefined && q.guess) n[q.id] = q.guess.yes; }); return n; });
  const sugB = bq.filter((q) => q.value === undefined && q.guess).length;
  const sugT = tq.filter((q) => q.value === undefined && q.guess).length;
  // Called as a function (not a component) so rows aren't remounted on each answer.
  const renderQ = (q, k) => (
    <li key={q.id} className={`q-row${q.value === undefined ? ' open' : ''}`}>
      <div className="q-text"><span className="t-body">{q.en}</span><span className="t-caption muted">{q.guess && q.value === undefined ? `Suggested ${q.guess.yes ? 'Yes' : 'No'} · ${q.guess.src}: “${q.guess.basis}”` : q.desc}</span></div>
      <YesNo name={q.en} value={q.value} suggested={q.guess?.yes} onChange={(val) => set(k, (a) => ({ ...a, [q.id]: val }))} />
    </li>
  );
  return (
    <>
      <Block id="rv-bcm" title="Business continuity" info="Judge the service itself, not your department. The answers decide whether continuity clauses go into the RFP."
        meta={v ? BCM_VERDICT[v].en : undefined} actions={sugB > 0 && <Btn variant="secondary-sm" onClick={() => fill('bcmAnswers', bq)}>Use {sugB} suggested</Btn>}>
        <ul className="q-list">{bq.map((q) => renderQ(q, 'bcmAnswers'))}</ul>
        {v && <div className={`verdict ${v}`}><span className="t-body-medium">{BCM_VERDICT[v].en}</span><span className="t-body-small">{BCM_VERDICT[v].why}</span></div>}
        {clauses.length > 0 && (
          <ul className="clause-list">
            {clauses.map((c) => (
              <li key={c.id}>
                <div className="grow"><div className="t-body-medium">{c.en}</div><div className="t-body-small muted">{c.desc}</div></div>
                {c.value && <Input value={(f.bcmValues ?? {})[c.id] || ''} onChange={(e) => set('bcmValues', (o) => ({ ...o, [c.id]: e.target.value }))} placeholder={c.value} aria-label={c.en} className={`clause-in${!(f.bcmValues ?? {})[c.id]?.trim() ? ' empty' : ''}`} />}
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="Third-party risk" info="A short checklist every RFP needs. It sets the vendor risk rating Cybersecurity and Risk use."
        meta={rating ? `Rating: ${RISK_RATING[rating]}` : undefined} actions={sugT > 0 && <Btn variant="secondary-sm" onClick={() => fill('tprAnswers', tq)}>Use {sugT} suggested</Btn>}>
        <ul className="q-list">{tq.map((q) => renderQ(q, 'tprAnswers'))}</ul>
        {rating && <div className={`verdict risk-${rating}`}><span className="t-body-medium">{RISK_RATING[rating]} risk</span><span className="t-body-small">{rating === 'high' || rating === 'critical' ? 'A full third-party risk assessment is needed before award.' : 'Standard vendor due diligence applies.'}</span></div>}
      </Block>
    </>
  );
}

/* ── Submitted ─────────────────────────────────────────────────────────────── */
export function SubmittedScreen({ rec, project, onExit }) {
  const [copied, setCopied] = useState(false);
  const t = totals(rec.form);
  const em = rec.form.sourceType === 'emarket';
  return (
    <main className="detail standalone req-form submitted" aria-labelledby="sub-title">
      <div className="submitted-body">
        <div className="sub-check" aria-hidden="true"><Icon name="icon-check-white" size={22} /></div>
        <h1 className="t-display" id="sub-title">Request submitted</h1>
        <p className="t-body muted" style={{ margin: 0 }}>{project?.name} · {sarFmt(t.total)} incl. VAT</p>
        <div className="ref-line"><span className="t-caption muted">Reference</span><span className="t-title tnum">{rec.requestNo}</span>
          <button type="button" className="inline-link t-body-small" onClick={() => { navigator.clipboard?.writeText(rec.requestNo).then(() => setCopied(true), () => {}); }}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <div className="next-box">
          <div className="t-label">What happens next</div>
          <ol>{(em ? [{ en: 'Line manager review', meta: '1–2 business days' }, { en: 'Purchase order raised on Etimad', meta: 'After approval' }] : NEXT_STEPS).map((s, i) => <li key={s.en}><span className="num-dot">{i + 1}</span><span className="grow t-body">{s.en}</span><span className="t-caption muted">{s.meta}</span></li>)}</ol>
        </div>
        <p className="t-body-small muted" style={{ margin: 0 }}>You’ll find it in My requests. We’ll notify you as it moves through approvals.</p>
        <div className="row-gap" style={{ justifyContent: 'center' }}>
          <Btn variant="primary" onClick={onExit}>Back to My requests</Btn>
        </div>
      </div>
    </main>
  );
}
