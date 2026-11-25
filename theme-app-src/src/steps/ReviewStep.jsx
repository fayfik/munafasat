import { useEffect, useState } from 'react';
import { Dialog } from '../components/FormKit.jsx';
import { useActor } from '../state/actor.jsx';
import { downloadPdf } from '../lib/pdf.js';
import { Icon, Btn, Collapsible, Field, Segment, Tooltip } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Input, TextArea, YesNo, ChipList, Choice, sarFmt } from '../components/FormKit.jsx';
import { AREA_OPTS, DELIVERY_OPTS, natureOf, priorityName, aboveRange } from '../lib/qualGuide.js';
import { AiTag } from '../components/AiKit.jsx';
import { PROJECTS, COST_CENTERS, STD_GROUPS, STD_VERSION, BCM_VERDICT, RISK_RATING, NEXT_STEPS, BOQ_CATEGORIES, SECTIONS } from '../data/newRequest.js';
import {
  totals, lineTotal, blockers, inEaScope, visibleSteps, sectionStatus, stdQuestions, standardsFor, deploymentOf,
  bcmQuestions, tprQuestions, bcmVerdict, bcmClauses, tprRating, num,
} from '../lib/requestRules.js';
import { fileExt, fileSize } from './AttachmentsStep.jsx';
import { withAccounting } from '../lib/accounting.js';
import { AiCard, AiSpark, AiBtn } from '../components/AiKit.jsx';
import { requestNarrative } from '../data/aiContent.js';
import { preReview, REVIEWERS, SEVERITY, CHECK_ORDER } from '../lib/preReview.js';

/** AI executive summary of the request — a narrative for the approving manager (design-review "Generate Summary"). */
function RequestSummary() {
  const { f, em } = useForm();
  const [v, setV] = useState(null);
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const lines = v == null ? null : requestNarrative(f, totals(f), { em, project: p, variant: v });
  return (
    <AiCard className="req-summary" title="AI executive summary"
      right={<AiBtn label={v == null ? 'Generate summary' : 'Regenerate'} busyLabel="Writing…" onRun={() => setV((x) => (x == null ? 0 : x + 1))} />}>
      {lines ? (
        <div className="summary-text fade-in">{lines.map((l, i) => <p key={i} className={`t-body-small${i === lines.length - 1 ? ' summary-check' : ''}`}>{l}</p>)}</div>
      ) : <p className="t-body-small muted" style={{ margin: 0 }}>A short narrative of this request for your approver — what is bought and why, value and timeline, how vendors are judged, and anything to check.</p>}
    </AiCard>
  );
}

/** Priority (from Project setup) and the project nature, read from the BOQ and scope — the requester can correct it. */
function ProjectProfile() {
  const { f, set, goto } = useForm();
  const { area, delivery, auto } = natureOf(f);
  return (
    <Block id="q-nature" title="Project profile" info="Finance and Procurement use these to judge the qualification criteria. The nature is read from your BOQ and scope — correct it if it’s wrong.">
      <div className="profile-grid">
        <div className="t-caption muted">Priority</div>
        <div className="row-gap">{f.projectPriority ? <span className="t-body-medium"><span className={`prio-dot p-${f.projectPriority}`} style={{ display: 'inline-block', marginRight: 6 }} />{priorityName(f.projectPriority)}</span> : <span className="t-body-small amber-text">Not set</span>}<button type="button" className="link-btn t-body-small" onClick={() => goto('setup')}>Change</button></div>
        <div className="t-caption muted">Nature {auto && <AiTag>Auto-detected</AiTag>}</div>
        <div className="row-gap" style={{ flexWrap: 'wrap' }}>
          <Choice name="IT or non-IT" options={AREA_OPTS} value={area} onChange={(v) => set('projectArea', v)} />
          <Choice name="Delivery type" options={DELIVERY_OPTS} value={delivery} onChange={(v) => set('deliveryType', v)} />
        </div>
      </div>
    </Block>
  );
}

const stepTitle = (id, em) => { const s = SECTIONS.find((x) => x.id === id); return id === 'setup' && em ? s.emTitle : s.title; };
const DOT_CLS = { done: 'done', missing: 'missing', todo: 'todo' };

/* Review & confirm (design-review ReviewConfirm): the AI pre-review runs first; once it's done the
   request overview, executive summary, route cards and every section of the request appear. */
export function ReviewStep() {
  const { f, set, goto, em, routeConfirmed } = useForm();
  const [phase, setPhase] = useState(em || f.preReviewRan ? 'done' : 'running');
  const t = totals(f);
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const cc = COST_CENTERS.find((c) => c.id === f.costCenterId);
  const extraCcs = (f.extraCostCenters || []).map((id) => COST_CENTERS.find((c) => c.id === id)).filter(Boolean);
  const bl = blockers(f, routeConfirmed);
  const steps = visibleSteps(f, routeConfirmed).filter((x) => !['review', 'attachments'].includes(x.id));
  const st = Object.fromEntries(steps.map((x) => [x.id, sectionStatus(x.id, f, routeConfirmed)]));
  const done = steps.filter((x) => st[x.id] === 'done').length;
  const ready = bl.length === 0;
  const [openBoq, setOpenBoq] = useState(null);
  const edit = (id) => <button type="button" className="inline-link t-body-small" onClick={() => goto(id)}><Icon name="icon-pencil" size={12} /> Edit</button>;
  const Sec = ({ id, title, children, meta }) => (
    <section className="rv-sec" id={`rv-sec-${id}`}>
      <div className="rv-sec-head"><span className={`sdot ${DOT_CLS[st[id] || (id === 'attachments' ? (f.attachments.length ? 'done' : 'todo') : 'todo')]}`} aria-hidden="true" /><h3 className="t-title">{title}</h3>{meta && <span className="t-caption muted">{meta}</span>}<span className="grow" />{edit(id)}</div>
      {children}
    </section>
  );

  return (
    <div className="stack">
      {!em && <PreReview phase={phase} setPhase={setPhase} />}
      {phase === 'done' && (
        <div className="stack review-reveal">
          <div className="rv-hero">
            <div className="rv-hero-top">
              <div className="grow">
                <div className="t-caption rv-eyebrow">{em ? 'Purchase request' : 'Request for proposal'}</div>
                <div className="t-heading">{p?.name || 'Untitled request'}</div>
                <div className="t-body-small rv-hero-sub">{cc?.name || '—'}{p?.code ? ` · ${p.code}` : ''}</div>
              </div>
              <span className="rv-badge t-caption-medium">{ready ? 'Ready' : 'Draft'}</span>
            </div>
            <div className="rv-hero-stats">
              <div><span className="t-caption">Total value</span><span className="t-title tnum">{t.subtotal > 0 ? sarFmt(t.subtotal) : '—'}</span></div>
              <div><span className="t-caption">Grand total</span><span className="t-title tnum">{t.total > 0 ? sarFmt(t.total) : '—'}</span><span className="t-caption">incl. 15% VAT</span></div>
              <div><span className="t-caption">BOQ items</span><span className="t-title tnum">{f.boqItems.length}</span></div>
              <div><span className="t-caption">Payment milestones</span><span className="t-title tnum">{em ? '—' : `${f.paymentStages.length} stages`}</span></div>
            </div>
          </div>
          <div className="rv-completion">
            <div className="row-gap"><span className="t-body-medium grow">Completion status</span><span className={`t-body-medium tnum ${ready ? 'brand-text' : 'amber'}`}>{done}/{steps.length} · {Math.round((done / Math.max(1, steps.length)) * 100)}%</span></div>
            <div className="rv-bar"><span className={ready ? '' : 'warn'} style={{ width: `${(done / Math.max(1, steps.length)) * 100}%` }} /></div>
            <div className="rv-chips">{steps.map((x) => <button key={x.id} type="button" className="rv-chip t-caption" onClick={() => goto(x.id)}><span className={`sdot ${DOT_CLS[st[x.id]]}`} aria-hidden="true" />{stepTitle(x.id, em)}</button>)}</div>
          </div>

          {em && bl.length > 0 && (
            <div className="todo-box" role="status">
              <div className="todo-head"><Icon name="icon-warn" size={16} /><span className="t-body-medium">{bl.length} {bl.length > 1 ? 'sections need attention' : 'section needs attention'}</span></div>
              <ul>{bl.map((b, i) => <li key={i}><button type="button" className="todo-link" onClick={() => goto(b.step)}><span className="t-body">{b.en}</span><span className="t-caption brand-text">Edit</span></button></li>)}</ul>
            </div>
          )}

          <RequestSummary />
          {!em && <RouteCards f={f} />}

          <Sec id="setup" title={stepTitle('setup', em)}>
            <div className="field-grid">
              <Field label="Cost center">{cc ? `${cc.name} (${cc.code})` : '—'}</Field><Field label="Project">{p?.name || '—'}</Field><Field label="Project code">{p?.code || '—'}</Field>
              {extraCcs.length > 0 && <Field label="Additional cost centers">{extraCcs.map((c) => `${c.name} (${c.code})`).join(', ')}</Field>}
              {!em && <Field label="Project priority">{priorityName(f.projectPriority) || <span className="muted">Not set</span>}</Field>}
              <Field label="Source type">{em ? 'Etimad E-Market' : 'Competitive tender'}</Field>
            </div>
            {f.purpose && <div className="rv-para"><div className="t-caption muted">{em ? 'Purpose of purchase' : 'Purpose of tendering'}</div><p className="t-body-small pre">{f.purpose}</p></div>}
            {!em && <ProjectProfile />}
          </Sec>

          {!em && (
            <Sec id="scope" title="Scope of work">
              {f.scopeOfWork ? <p className="t-body-small pre" style={{ margin: 0 }}>{f.scopeOfWork}</p> : <span className="muted t-body-small">Not completed</span>}
              {f.scopeTerms && <div className="rv-para"><div className="t-caption muted">Scope-specific terms &amp; conditions</div><p className="t-body-small pre">{f.scopeTerms}</p></div>}
              <div className="rv-minis">
                <div><span className="t-caption muted">Start date</span><span className="t-body-medium tnum">{f.startDate || '—'}</span></div>
                <div><span className="t-caption muted">Duration</span><span className="t-body-medium">{f.contractDuration ? `${f.contractDuration} ${f.contractDurationType}` : '—'}</span></div>
                <div><span className="t-caption muted">Location</span><span className="t-body-medium">{f.executionLocation ? 'See below' : '—'}</span></div>
              </div>
              {f.executionLocation && <div className="rv-para"><div className="t-caption muted">Execution location</div><p className="t-body-small pre">{f.executionLocation}</p></div>}
            </Sec>
          )}

          <Sec id="boq" title="Bill of quantities" meta={`${f.boqItems.length} items`}>
            {f.boqItems.length ? (
              <div className="table-scroll"><table className="plain-table compact rv-boq">
                <thead><tr><th>Item</th>{!em && <th>Category</th>}<th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th><th aria-label="View" /></tr></thead>
                <tbody>{f.boqItems.map((r) => [
                  <tr key={r.id} className={`rv-boq-row${openBoq === r.id ? ' open' : ''}`} onClick={() => setOpenBoq(openBoq === r.id ? null : r.id)} aria-expanded={openBoq === r.id}>
                    <td className="t-body-medium">{r.itemName || '—'}</td>{!em && <td><span className="tag">{BOQ_CATEGORIES.find((c) => c.id === r.category)?.en || '—'}</span></td>}
                    <td className="num">{r.category === 'manpower' ? r.staffCount : num(r.quantity) || 1}</td><td className="num">{num(r.unitPrice) ? sarFmt(r.unitPrice, 2) : '—'}</td><td className="num t-body-medium">{sarFmt(lineTotal(r, em), 2)}</td>
                    <td className="num"><button type="button" className="icon-btn" aria-label="View item details" onClick={(e) => { e.stopPropagation(); setOpenBoq(openBoq === r.id ? null : r.id); }}><Icon name="icon-eye" size={15} /></button></td>
                  </tr>,
                  openBoq === r.id && <tr key={`${r.id}-d`} className="rv-boq-detail"><td colSpan={em ? 5 : 6}><dl className="rv-dl">{(em
                    ? [['Purchase type', r.purchaseType], ['Product ID', r.productId], ['Supplier', r.supplier], ['Order unit', r.orderUnit], ['Delivery', r.deliveryDate || (r.startDate && `${r.startDate} → ${r.endDate}`)]]
                    : [['Budgeted item', r.projectItem], ['Description', r.itemDescription], ['Unit', r.unitOfMeasure], ['Needed by', r.deliveryDate], ['Has brand name', r.hasBrandName ? `Yes — ${r.brandJustification || ''}` : 'No']]).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="t-caption muted">{k}</dt><dd className="t-body-small">{v}</dd></div>)}</dl></td></tr>,
                ])}</tbody>
                <tfoot>
                  <tr><td colSpan={em ? 3 : 4} className="muted">Subtotal</td><td className="num">{sarFmt(t.subtotal, 2)}</td><td /></tr>
                  <tr><td colSpan={em ? 3 : 4} className="muted">VAT (15%)</td><td className="num">{sarFmt(t.vat, 2)}</td><td /></tr>
                  <tr className="grand"><td colSpan={em ? 3 : 4}>Grand total</td><td className="num">{sarFmt(t.total, 2)}</td><td /></tr>
                </tfoot>
              </table></div>
            ) : <p className="t-body-small muted" style={{ margin: 0 }}>No items added</p>}
          </Sec>

          {!em && (
            <>
              <Sec id="payment" title="Payment schedule" meta={`${f.paymentStages.length} stages · ${t.payPct}%`}>
                {f.paymentStages.length ? (
                  <>
                    <div className="pay-bar" aria-hidden="true">{f.paymentStages.map((s, i) => <span key={s.id} title={`${s.stageName}: ${num(s.percentage)}%`} style={{ width: `${num(s.percentage)}%`, background: PAY_COLORS[i % PAY_COLORS.length] }} />)}</div>
                    <div className="pay-cards">{f.paymentStages.map((s, i) => (
                      <div key={s.id} className="pay-card"><span className="pay-swatch" style={{ background: PAY_COLORS[i % PAY_COLORS.length] }} /><span className="grow"><span className="t-body-small t-strong">{s.stageName || `Stage ${i + 1}`}</span><span className="t-caption muted">{s.itemsDeliverables || '—'}</span></span><span className="num"><span className="t-body-medium tnum">{num(s.percentage)}%</span><span className="t-caption muted tnum">{sarFmt(typeof s.amount === 'number' ? s.amount : (num(s.percentage) / 100) * t.subtotal)}</span></span></div>
                    ))}</div>
                  </>
                ) : <p className="t-body-small muted" style={{ margin: 0 }}>No payment stages defined</p>}
              </Sec>
              <Sec id="tech" title="Technical evaluation" meta={`Passing ${f.technicalPassingPercentage || '—'}%`}>
                <div className="field-grid"><Field label="Evaluator">{f.technicalCommitteeMembers[0]?.name || <span className="muted">No one selected</span>}</Field><Field label="Technical documents">{(f.technicalDocumentsList || []).length || '—'}</Field><Field label="Technical requirements">{f.technicalRequirements.length || '—'}</Field></div>
                {f.evaluationCriteria.length > 0 && (
                  <div className="crit-bars">{f.evaluationCriteria.map((c) => <div key={c.id} className="crit-bar"><span className="t-body-small grow">{c.description || 'Criterion'}</span><span className="cb-track"><span style={{ width: `${num(c.weight)}%` }} /></span><span className="t-body-small tnum">{num(c.weight)}%</span></div>)}
                    <div className="crit-bar total"><span className="t-body-small t-strong grow">Total weight</span><span className={`t-body-small tnum t-strong ${t.evalPct === 100 ? 'brand-text' : 'danger-text'}`}>{t.evalPct}%</span></div></div>
                )}
              </Sec>
              <Sec id="qual" title="Qualification criteria" meta={`Passing ${f.qualificationPassingPercentage || '—'}%`}>
                <div className="field-grid"><Field label="Reviewer">{f.qualificationCommitteeMembers[0]?.name || <span className="muted">No one selected</span>}</Field><Field label="Open to SMEs">{aboveRange(f).length ? `No — ${aboveRange(f).length} criteria above the recommended range` : 'Yes'}</Field></div>
                <table className="plain-table compact"><thead><tr><th>Criteria</th><th>Range</th><th className="num">Weight (%)</th></tr></thead>
                  <tbody>{f.qualificationCriteria.map((m) => [<tr key={m.id} className="group-row"><td colSpan={2}>{m.name}</td><td className="num">{num(m.percentage)}%</td></tr>, ...m.subCriteria.map((x) => <tr key={x.id}><td style={{ paddingLeft: 24 }}>{x.name}</td><td className="muted">{x.range || '—'}</td><td className="num">{num(x.percentage)}%</td></tr>)])}</tbody>
                  <tfoot><tr className="grand"><td colSpan={2}>Main criteria total</td><td className="num">{t.qualPct}%</td></tr></tfoot></table>
              </Sec>
              {p && (
                <Block title="Regulatory records" info="Vendors must provide valid copies of these records with their proposals. Project records are locked; add any extra ones this request needs.">
                  <ChipList locked={p.regulatoryRecords} items={f.extraRegulatoryRecords} onChange={(v) => set('extraRegulatoryRecords', v)} placeholder="Type a record or licence and press Enter" label="Regulatory records" />
                </Block>
              )}
            </>
          )}

          <Sec id="attachments" title="Attachments" meta={f.attachments.length ? `${f.attachments.length} files` : 'Optional'}>
            {f.attachments.length ? <ul className="file-list">{f.attachments.map((a) => <li key={a.id}><span className={`file-type t-${fileExt(a.name)}`}>{fileExt(a.name).toUpperCase()}</span><span className="file-name"><span className="t-body">{a.name}</span><span className="t-caption muted">{fileSize(a.size)}</span></span></li>)}</ul> : <p className="t-body-small muted" style={{ margin: 0 }}>No attachments uploaded (optional)</p>}
          </Sec>
        </div>
      )}
    </div>
  );
}
const PAY_COLORS = ['#517632', '#2a6193', '#c8912f', '#6a47d6', '#0e8c8c', '#b5487a', '#868d80'];

/** Finance review route (from the BOQ asset lines) and whether Enterprise Architecture reviews the request. */
function RouteCards({ f }) {
  const lines = f.boqItems.map((r) => (r.mg ? r : withAccounting(r)));
  const assets = lines.filter((r) => r.ptype === 'asset' || r.ptype === 'service-asset').length;
  const ea = inEaScope(f);
  return (
    <div className="route-cards">
      <div className="route-card">
        <div className="t-caption muted">Finance review route</div>
        <div className="t-body-medium">{assets ? 'Assets + GL (parallel)' : 'GL'}</div>
        <div className="t-body-small muted">{assets ? `This request contains ${assets} asset line${assets === 1 ? '' : 's'}, so it goes to the Assets team as well as GL.` : 'No asset lines — only GL reviews the accounting.'}</div>
      </div>
      <div className="route-card">
        <div className="t-caption muted">Enterprise Architecture review</div>
        <div className="t-body-medium">{ea ? 'Required' : 'Not required'}</div>
        <div className="t-body-small muted">{ea ? 'The scope and BOQ include technology items, so EA reviews the technical standards.' : 'Not required — no technology items in this request.'}</div>
      </div>
    </div>
  );
}

/* ── AI pre-review ───────────────────────────────────────────────────────── */
// Where "Take me to the field" lands for each recommendation (the step opens, then the field is focused).
const REC_FIELD = { 'fin-pay': 'q-payment', 'fin-advance': 'q-payment', 'fin-mg': 'q-boq', 'fin-price': 'q-boq', 'ea-sow': 'q-scope', 'ea-reqs': 'q-req', 'ea-integ': 'q-req', 'cy-test': 'q-req', 'cy-pdpl': 'q-req', 'cy-nda': 'q-scope', 'pr-eval': 'q-eval', 'pr-pass': 'q-eval', 'pr-dates': 'q-boq', 'mgr-duration': 'q-duration', 'mgr-location': 'q-location', 'mgr-objective': 'q-purpose', 'risk-dr': 'q-req', 'risk-sla': 'q-req', 'fq-priority': 'q-priority', 'fq-nature': 'q-nature', 'em-purpose': 'q-purpose', 'em-supplier': 'q-boq' };
const recSig = (f) => { const j = JSON.stringify([f.boqItems, f.paymentStages, f.scopeOfWork, f.scopeTerms, f.purpose, f.technicalRequirements, f.evaluationCriteria, f.technicalPassingPercentage, f.technicalCommitteeMembers, f.qualificationCriteria, f.qualificationCommitteeMembers, f.startDate, f.contractDuration, f.executionLocation, f.projectPriority, f.attachments]); let h = 7; for (let i = 0; i < j.length; i++) h = (h * 31 + j.charCodeAt(i)) | 0; return h; };
const SEV_LABEL = { return: 'Would be returned', improve: 'Should fix', tip: 'Suggestion' };

function PreReview({ phase, setPhase }) {
  const { f, patch, goto, em, routeConfirmed } = useForm();
  const order = CHECK_ORDER;
  const [at, setAt] = useState(0);
  const [tab, setTab] = useState(null);
  const [marks, setMarks] = useState({}); // id -> 'applied' | 'dismissed'
  const [applied, setApplied] = useState({}); // id -> rec snapshot (so it stays listed after the fix)
  const [fixing, setFixing] = useState(null);
  const run = () => { setAt(0); setMarks({}); setApplied({}); setTab(null); setPhase('running'); };
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const ts = order.map((_, i) => setTimeout(() => setAt(i + 1), 650 * (i + 1)));
    ts.push(setTimeout(() => finish(), 650 * (order.length + 1)));
    return () => ts.forEach(clearTimeout);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const finish = () => { patch({ preReviewRan: true, preReviewSig: recSig(f) }); setPhase('done'); };
  const takeMe = (r) => {
    goto(r.step);
    const id = REC_FIELD[r.id];
    if (!id) return;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.querySelector('input,textarea,select,button')?.focus({ preventScroll: true });
      el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
    }, 450);
  };

  const live = preReview(f);
  const recs = [...live, ...Object.values(applied).filter((a) => !live.some((r) => r.id === a.id))];
  const bl = blockers(f, routeConfirmed);
  const general = bl.filter((b) => b.step !== 'review');
  const stdN = bl.filter((b) => b.anchor === 'std').length;
  const riskN = bl.filter((b) => b.anchor === 'bcm').length;
  const openCount = (d) => recs.filter((r) => r.dept === d && !marks[r.id]).length + (d === 'ea' ? stdN : d === 'risk' ? riskN : 0);
  const returns = recs.filter((r) => r.severity === 'return' && !marks[r.id]).length + general.length;
  const totalRecs = recs.length + general.length;
  const curTab = tab ?? (general.length ? 'general' : order.find((d) => openCount(d)) || 'finance');
  const changed = phase === 'done' && f.preReviewSig != null && f.preReviewSig !== recSig(f);

  if (phase === 'running') {
    const cur = Math.min(order.length - 1, at);
    const pct = Math.min(100, Math.round((at / order.length) * 100));
    return (
      <section className="pr-loader" aria-live="polite">
        <div className="pr-head">
          <span className="pr-orb"><AiSpark size={18} /></span>
          <div className="grow"><div className="t-title">Reviewing your request before it goes out</div><div className="t-body-small muted" key={cur}>Reading it as {REVIEWERS[order[cur]].en} would…</div></div>
          <button type="button" className="link-btn t-body-small" onClick={finish}>Skip</button>
        </div>
        <div className="pr-wheel">
          {order.map((d, i) => {
            const off = i - cur; const a = Math.abs(off);
            if (a > 2) return null;
            const isDone = i < cur;
            return (
              <div key={d} className={`pr-item${off === 0 ? ' on' : ''}`} style={{ transform: `translateY(${off * 58}px) scale(${off === 0 ? 1.04 : 1 - a * 0.06})`, opacity: off === 0 ? 1 : 1 - a * 0.32 }}>
                <span className="grow"><span className={off === 0 ? 't-title' : 't-body'}>{REVIEWERS[d].check}</span>{off === 0 && <span className="t-caption muted">{REVIEWERS[d].en} perspective</span>}</span>
                {off === 0 ? <span className="spinner sm" aria-hidden="true" /> : isDone ? <span className="pr-tick"><Icon name="icon-check-white" size={11} /></span> : null}
              </div>
            );
          })}
        </div>
        <div className="pr-bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="pr-depts">{order.map((d, i) => {
          const state = at > i ? 'done' : at === i ? 'active' : 'queued';
          const n = live.filter((r) => r.dept === d).length;
          return <div key={d} className={`pr-dept ${state}`}><span className="t-caption grow">{REVIEWERS[d].short}</span>{state === 'done' ? <span className="t-caption tnum t-strong">{n ? `${n} found` : '✓'}</span> : state === 'active' ? <span className="spinner xs" aria-hidden="true" /> : null}</div>;
        })}</div>
      </section>
    );
  }

  const list = curTab === 'general' ? [] : recs.filter((r) => r.dept === curTab);
  const tabs = [{ id: 'general', label: 'General', n: general.length }, ...order.map((d) => ({ id: d, label: REVIEWERS[d].en, n: openCount(d) }))];
  const apply = (r) => { const next = r.apply(f); patch({ ...next, preReviewSig: recSig({ ...f, ...next }) }); setMarks((m) => ({ ...m, [r.id]: 'applied' })); setApplied((x) => ({ ...x, [r.id]: r })); setFixing(null); };
  return (
    <section className="pr-results">
      <div className="pr-top">
        <span className="pr-orb sm"><AiSpark size={14} /></span>
        <div className="grow"><div className="t-title">AI pre-review</div><div className="t-body-small muted">{totalRecs === 0 ? 'Nothing to fix — every reviewer would accept this request.' : returns > 0 ? `${totalRecs} recommendations · ${returns} to fix before you submit` : `${totalRecs} recommendations · nothing blocking`}</div></div>
        <button type="button" className="link-btn t-body-small" onClick={run}>Review again</button>
      </div>
      {changed && <div className="pr-stale t-body-small"><span className="grow">The request changed since this review.</span><button type="button" className="inline-link t-body-small" onClick={run}>Review again</button></div>}
      <div className="pr-body">
        <div className="pr-rail" role="tablist" aria-orientation="vertical" aria-label="Reviewers">
          {tabs.map((x, i) => (
            <div key={x.id} className="contents">
              {i === 1 && <div className="t-caption muted pr-rail-label">Reviewers</div>}
              <button type="button" role="tab" aria-selected={curTab === x.id} className="pr-tab t-body-small" onClick={() => setTab(x.id)}>
                <span className="grow">{x.label}</span><span className={`pr-count tnum${x.n ? ' on' : ''}`}>{x.n || '✓'}</span>
              </button>
            </div>
          ))}
        </div>
        <div className="pr-pane" role="tabpanel">
          <div className="t-title" style={{ marginBottom: 4 }}>{tabs.find((x) => x.id === curTab)?.label}</div>
          {curTab === 'general' ? (
            !general.length ? <Empty title="Every step is complete" sub="Nothing your manager would send back." /> : (
              <>
                <p className="t-body-small muted" style={{ margin: '0 0 4px' }}>Missing or thin details your manager would send back. Submit unlocks once these are done.</p>
                <ul className="pr-list">{general.map((g, i) => <Row key={i} sev="return" title={g.en} why={/isn’t complete$/.test(g.en) ? 'Required fields are still empty. Your manager returns incomplete requests.' : 'Your manager returns requests with this missing.'} section={stepTitle(g.step, em)} action={<button type="button" className="fix-btn t-body-small" onClick={() => goto(g.step)}>{/isn’t complete$/.test(g.en) ? 'Complete' : 'Fix'}</button>} />)}</ul>
              </>
            )
          ) : (
            <>
              {!list.length && !(curTab === 'ea' && inEaScope(f)) && curTab !== 'risk' && <Empty title={`No concerns from ${REVIEWERS[curTab].en}`} sub="This part of the request looks ready for their review." />}
              {list.length > 0 && (
                <ul className="pr-list">{list.map((r) => {
                  const m = marks[r.id];
                  return (
                    <Row key={r.id} sev={r.severity} state={m} title={r.title} why={r.why} section={stepTitle(r.step, em)}
                      action={!m ? (<>
                        <button type="button" className="fix-btn t-body-small" onClick={() => (r.apply ? setFixing(fixing === r.id ? null : r.id) : takeMe(r))}>{r.apply && <AiSpark size={12} />}{r.apply ? 'Fix it' : 'Show me'}</button>
                        <button type="button" className="icon-btn" aria-label="Dismiss" title="Dismiss" onClick={() => setMarks((x) => ({ ...x, [r.id]: 'dismissed' }))}><Icon name="icon-x" size={14} /></button>
                      </>) : m === 'applied' ? <span className="t-body-small brand-text t-strong">✓ Applied</span>
                        : <button type="button" className="link-btn t-body-small" onClick={() => setMarks((x) => { const n = { ...x }; delete n[r.id]; return n; })}>Undo dismiss</button>}>
                      {fixing === r.id && r.proposal && (
                        <div className="rec-proposal">
                          <div className="t-caption ai-label"><AiSpark size={12} />{r.proposal.label}{r.proposal.replaces ? ` · replaces your ${r.proposal.replaces}` : ''}{r.proposal.append ? ' · added after your current terms — nothing you wrote is removed' : ''}</div>
                          {r.proposal.text && <p className="t-body-small pre">{r.proposal.text}</p>}
                          {r.proposal.rows && <ul>{r.proposal.rows.map((x, i) => <li key={i}><span className="grow"><span className="t-body-small">{x.title}</span>{x.sub && <span className="t-caption muted">{x.sub}</span>}</span>{x.badge && <span className="t-caption-medium tnum">{x.badge}</span>}</li>)}</ul>}
                          <div className="row-gap"><Btn variant="primary-sm" onClick={() => apply(r)}>Apply it</Btn><Btn variant="ghost-sm" onClick={() => takeMe(r)}>Take me to the field</Btn><Btn variant="ghost-sm" onClick={() => setFixing(null)}>Cancel</Btn></div>
                        </div>
                      )}
                    </Row>
                  );
                })}</ul>
              )}
              {curTab === 'risk' && <div className="pr-embed"><div className="row-gap"><span className="t-body-medium grow">Business continuity &amp; third-party risk</span><span className={`t-caption ${riskN ? 'amber' : 'brand-text'}`}>{riskN ? `${riskN} to complete` : 'Ready for BCM & ORM'}</span></div><Continuity /></div>}
              {curTab === 'ea' && inEaScope(f) && <div className="pr-embed"><div className="row-gap"><span className="t-body-medium grow">Technical standards</span><span className={`t-caption ${stdN ? 'amber' : 'brand-text'}`}>{stdN ? `${stdN} to complete` : 'Ready for EA'}</span></div><Standards /></div>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
function Row({ sev, state, title, why, section, action, children }) {
  return (
    <li className={`pr-row${state ? ` is-${state}` : ''}`}>
      <span className={`pr-dot sev-${state === 'applied' ? 'ok' : state === 'dismissed' ? 'off' : sev}`} aria-hidden="true" />
      <div className="grow">
        <div className="t-body-medium pr-title">{title}</div>
        <div className="t-body-small muted">{why}</div>
        <div className="t-caption muted">{SEV_LABEL[sev]}{section ? ` · ${section}` : ''}</div>
        {children}
      </div>
      <div className="pr-act">{action}</div>
    </li>
  );
}
function Empty({ title, sub }) {
  return <div className="pr-empty"><span className="pr-ok"><Icon name="icon-check-white" size={16} /></span><div className="t-body-medium">{title}</div><div className="t-body-small muted">{sub}</div></div>;
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
export function SubmittedScreen({ rec, project, onExit, onView }) {
  const [copied, setCopied] = useState(false);
  const [doc, setDoc] = useState(false);
  const { actor } = useActor();
  const f = rec.form;
  const t = totals(f);
  const em = f.sourceType === 'emarket';
  const at = new Date(rec.submittedAt || Date.now());
  const cc = COST_CENTERS.find((c) => c.id === f.costCenterId);
  const dept = cc?.name || actor.dept || 'IT & Digital';
  const email = `${actor.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@sidf.gov.sa`;
  const link = `${location.origin}${location.pathname}#/requests/view/${rec.id}`;
  const steps = em ? [{ en: 'Line manager review', meta: '1–2 business days' }, { en: 'Etimad E-Market check & order', meta: 'After approval' }, { en: 'Purchase requisition created in SAP ECC', meta: 'Upon approval' }] : NEXT_STEPS;
  const pdf = () => downloadPdf(rec.requestNo, {
    title: project?.name || rec.title, sub: `${rec.requestNo} · Submitted ${at.toLocaleString('en-GB')}`,
    rows: [['Reference', rec.requestNo], ['Department', dept], ['Route', em ? 'Etimad E-Market' : 'Tendering'], ['Total value (excl. VAT)', sarFmt(t.subtotal)], ['Grand total (incl. VAT)', sarFmt(t.total)], ['BOQ items', String(f.boqItems.length)], ['Payment milestones', String(f.paymentStages.length)]],
    paras: [f.purpose && { head: 'Purpose', body: f.purpose }, f.scopeOfWork && { head: 'Scope of work', body: f.scopeOfWork }].filter(Boolean),
  });
  const share = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2500); };
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, () => {});
    else { const ta = Object.assign(document.createElement('textarea'), { value: link }); document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); }
  };
  const ACTIONS = [
    { icon: 'icon-eye', title: 'View request', sub: 'Open full document', primary: true, onClick: () => setDoc(true) },
    { icon: 'icon-download', title: 'Download PDF', sub: 'Save a local copy', onClick: pdf },
    { icon: 'icon-send', title: copied ? 'Link copied' : 'Share', sub: 'Send link to colleagues', onClick: share },
    { icon: 'icon-file', title: 'Return to Requests', sub: 'Back to My requests', onClick: onExit },
  ];
  return (
    <main className="detail standalone req-form submitted" aria-labelledby="sub-title">
      <div className="submitted-body">
        <div className="sub-check" aria-hidden="true"><Icon name="icon-check-white" size={22} /></div>
        <h1 className="t-display" id="sub-title">Request submitted successfully</h1>
        <p className="t-body muted" style={{ margin: 0 }}>{em ? 'Your purchase request has been sent for approval.' : 'Your request has been received by the Procurement Committee and is now under review.'}</p>
        <section className="sub-card">
          <div className="sub-card-top">
            <div><span className="t-caption sub-eyebrow">{em ? 'Purchase request' : 'Request for proposal'}</span><span className="t-title tnum">{rec.requestNo}</span></div>
            <div className="sub-card-meta"><span className="sub-badge t-caption-medium">Submitted</span><span className="t-caption tnum">{at.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
          <div className="sub-card-body">
            <div className="t-body-medium">{project?.name || rec.title}</div>
            <div className="t-body-small muted">{dept}{project?.code ? ` · ${project.code}` : ''}</div>
            <dl className="sub-stats">
              <div><dt className="t-caption muted">Total value</dt><dd className="t-body-medium tnum">{sarFmt(t.subtotal)}</dd></div>
              <div><dt className="t-caption muted">Grand total</dt><dd className="t-body-medium tnum">{sarFmt(t.total)}</dd></div>
              <div><dt className="t-caption muted">{em ? 'Items' : 'Payment milestones'}</dt><dd className="t-body-medium tnum">{em ? f.boqItems.length : `${f.paymentStages.length} stages`}</dd></div>
            </dl>
          </div>
        </section>
        <div className="next-box">
          <div className="t-label">What happens next</div>
          <ol>{steps.map((s, i) => <li key={s.en}><span className="num-dot">{i + 1}</span><span className="grow t-body">{s.en}</span><span className="t-caption muted">{s.meta}</span></li>)}</ol>
        </div>
        <div className="sub-actions">
          {ACTIONS.map((a) => (
            <button key={a.sub} type="button" className={`sub-action${a.primary ? ' primary' : ''}`} onClick={a.onClick}>
              <span className="sub-action-ico"><Icon name={a.icon} size={18} /></span>
              <span className="grow"><span className="t-body-medium">{a.title}</span><span className="t-body-small muted">{a.sub}</span></span>
              <Icon name="icon-chevron-right" size={14} />
            </button>
          ))}
        </div>
        <p className="t-caption muted" style={{ margin: 0 }}>A confirmation has been sent to <span className="ink">{email}</span> · Reference <span className="tnum">{rec.requestNo}</span></p>
      </div>
      <Dialog open={doc} onClose={() => setDoc(false)} title={project?.name || rec.title} sub={`${rec.requestNo} · ${dept}`} className="sheet rv-preview"
        foot={<><Btn variant="ghost" icon="icon-download" onClick={pdf}>Download PDF</Btn><span className="grow" />{onView && <Btn variant="secondary" onClick={() => onView(rec.id)}>Open in My requests</Btn>}<Btn variant="primary" onClick={() => setDoc(false)}>Close</Btn></>}>
        <FullDocument f={f} t={t} em={em} />
      </Dialog>
    </main>
  );
}

/** The whole submitted request as one read-only document. */
function FullDocument({ f, t, em }) {
  const sec = (title, body, show = true) => show && <section className="fd-sec"><div className="t-label">{title}</div>{body}</section>;
  const table = (head, rows, empty) => (rows.length ? <table className="rv-table t-body-small fd-table"><thead><tr>{head.map((h, i) => <th key={h} className={i === head.length - 1 ? 'num' : ''}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === r.length - 1 ? 'num tnum' : ''}>{c}</td>)}</tr>)}</tbody></table> : <p className="t-body-small muted">{empty}</p>);
  return (
    <div className="fd">
      <dl className="sub-stats"><div><dt className="t-caption muted">Total value</dt><dd className="t-body-medium tnum">{sarFmt(t.subtotal)}</dd></div><div><dt className="t-caption muted">Grand total</dt><dd className="t-body-medium tnum">{sarFmt(t.total)}</dd></div><div><dt className="t-caption muted">BOQ items</dt><dd className="t-body-medium tnum">{f.boqItems.length}</dd></div></dl>
      {sec('Purpose', <p className="t-body-small">{f.purpose}</p>, !!f.purpose)}
      {sec('Scope of work', <p className="t-body-small fd-pre">{f.scopeOfWork}</p>, !!f.scopeOfWork)}
      {sec('Bill of quantities', table(['Item', 'Qty', 'Unit price', 'Total'], f.boqItems.map((r) => [r.itemName || 'Untitled item', `${r.quantity || 1} ${r.unitOfMeasure || r.orderUnit || ''}`, sarFmt(Number(r.unitPrice) || 0), sarFmt(lineTotal(r, em))]), 'No items added'))}
      {sec('Payment stages', table(['Stage', 'Deliverables', '%'], f.paymentStages.map((p) => [p.stageName || '—', p.itemsDeliverables || '—', `${p.percentage || 0}%`]), 'No payment stages defined'), !em)}
      {sec('Evaluation criteria', table(['Criterion', 'Weight'], f.evaluationCriteria.map((c) => [c.requirement || c.name || c.description || '—', `${c.weight || 0}%`]), 'No evaluation criteria'), !em)}
      {sec('Qualification criteria', table(['Main category', 'Weight'], f.qualificationCriteria.map((m) => [m.name, `${m.percentage || 0}%`]), 'No qualification criteria'), !em)}
      {sec('Attachments', f.attachments.length ? <ul className="fd-list t-body-small">{f.attachments.map((a) => <li key={a.id || a.name}>{a.name}</li>)}</ul> : <p className="t-body-small muted">No attachments uploaded (optional)</p>)}
    </div>
  );
}
