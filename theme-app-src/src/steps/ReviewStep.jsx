import { useState } from 'react';
import { Dialog } from '../components/FormKit.jsx';
import { useActor } from '../state/actor.jsx';
import { downloadPdf } from '../lib/pdf.js';
import { Icon, Btn, Collapsible, Field, Segment, Tooltip } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Input, TextArea, YesNo, ChipList, Choice, sarFmt } from '../components/FormKit.jsx';
import { AREA_OPTS, DELIVERY_OPTS, natureOf, priorityName, aboveRange } from '../lib/qualGuide.js';
import { AiTag } from '../components/AiKit.jsx';
import { PROJECTS, COST_CENTERS, STD_GROUPS, STD_VERSION, BCM_VERDICT, RISK_RATING, NEXT_STEPS, BOQ_CATEGORIES, SECTIONS } from '../data/newRequest.js';
import {
  totals, lineTotal, blockers, inEaScope, stdQuestions, standardsFor, deploymentOf,
  bcmQuestions, tprQuestions, bcmVerdict, bcmClauses, tprRating, num,
} from '../lib/requestRules.js';
import { fileExt, fileSize } from './AttachmentsStep.jsx';
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

      <PreReview />

      <RequestSummary />

      {!em && <ProjectProfile />}

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
            {!em && <Field label="Project priority">{priorityName(f.projectPriority) || <span className="muted">Not set</span>}</Field>}
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
              <Field label="Open to SMEs">{aboveRange(f).length ? `No — ${aboveRange(f).length} criteria above the recommended range` : 'Yes — every criterion is within the recommended range'}</Field>
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

/* ── AI pre-review ───────────────────────────────────────────────────────── */
// Where "Take me to the field" lands for each recommendation (the step opens, then the field is focused).
const REC_FIELD = { 'fin-pay': 'q-payment', 'fin-advance': 'q-payment', 'fin-mg': 'q-boq', 'fin-price': 'q-boq', 'ea-sow': 'q-scope', 'ea-reqs': 'q-req', 'ea-integ': 'q-req', 'cy-test': 'q-req', 'cy-pdpl': 'q-req', 'cy-nda': 'q-scope', 'pr-eval': 'q-eval', 'pr-pass': 'q-eval', 'pr-dates': 'q-boq', 'mgr-duration': 'q-duration', 'mgr-location': 'q-location', 'mgr-objective': 'q-purpose', 'risk-dr': 'q-req', 'risk-sla': 'q-req', 'fq-priority': 'q-priority', 'fq-nature': 'q-nature', 'em-purpose': 'q-purpose', 'em-supplier': 'q-boq' };
const recSig = (f) => { const j = JSON.stringify([f.boqItems, f.paymentStages, f.scopeOfWork, f.scopeTerms, f.purpose, f.technicalRequirements, f.evaluationCriteria, f.technicalPassingPercentage, f.technicalCommitteeMembers, f.qualificationCriteria, f.qualificationCommitteeMembers, f.startDate, f.contractDuration, f.executionLocation, f.projectPriority, f.attachments]); let h = 7; for (let i = 0; i < j.length; i++) h = (h * 31 + j.charCodeAt(i)) | 0; return h; };

function PreReview() {
  const { f, patch, goto, em } = useForm();
  const [undoDismiss, setUndoDismiss] = useState(null);
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
  const [phase, setPhase] = useState(f.preReviewRan ? 'done' : 'idle');
  const [at, setAt] = useState(0);
  const [tab, setTab] = useState('all');
  const [dismissed, setDismissed] = useState([]);
  const [applied, setApplied] = useState(null);
  const recs = preReview(f).filter((r) => !dismissed.includes(r.id));
  const order = em ? ['manager', 'procurement'] : CHECK_ORDER;
  const run = () => {
    setPhase('running'); setAt(0);
    order.forEach((_, i) => setTimeout(() => setAt(i + 1), 380 * (i + 1)));
    setTimeout(() => { setPhase('done'); patch({ preReviewRan: true, preReviewSig: recSig(f) }); setDismissed([]); setUndoDismiss(null); }, 380 * (order.length + 1));
  };
  const changed = phase === 'done' && f.preReviewSig != null && f.preReviewSig !== recSig(f);
  const quiet = order.filter((d) => !recs.some((r) => r.dept === d));
  const toFix = recs.filter((r) => r.severity === 'return').length;
  const shown = recs.filter((r) => tab === 'all' || r.severity === tab);
  const apply = (r) => {
    const next = r.apply(f);
    const prev = Object.fromEntries(Object.keys(next).map((k) => [k, f[k]]));
    patch(next); setApplied({ title: r.title, prev });
  };

  if (phase === 'idle') {
    return (
      <AiCard className="pre-review" title="AI pre-review" info={<Tooltip text="Checks the request the way each reviewer would — Manager, Finance, EA, Cybersecurity, Risk and Procurement — and suggests fixes before you submit." label="About the AI pre-review" />}
        right={<button type="button" className="ai-btn ai-outline" onClick={run}><AiSpark /><span className="ai-text">Run pre-review</span></button>}>
        <p className="t-body-small" style={{ margin: 0 }}>See what each reviewer is likely to return, and fix it now instead of waiting a review round.</p>
      </AiCard>
    );
  }
  if (phase === 'running') {
    return (
      <AiCard className="pre-review" title="AI pre-review" right={<span className="t-caption muted">Checking…</span>}>
        <ul className="ai-think" role="status" aria-live="polite">
          {order.map((d, i) => <li key={d} className={at > i ? 'done' : at === i ? 'now' : ''}><span className="dot" />{REVIEWERS[d].en}<span className="t-caption muted">· {REVIEWERS[d].check}</span></li>)}
        </ul>
      </AiCard>
    );
  }
  return (
    <AiCard className="pre-review" title="AI pre-review"
      info={<Tooltip text="Recommendations update as you edit. Apply a suggestion to fill it in, or go to the step to change it yourself." label="About the AI pre-review" />}
      right={<button type="button" className="ai-link" onClick={run}>Review again</button>}>
      {changed && <div className="pre-changed t-body-small"><Icon name="icon-info" size={14} />The request changed since this review. <button type="button" className="inline-link t-body-small" onClick={run}>Review again</button></div>}
      <div className="pre-summary">
        <span className="t-body-medium">{recs.length === 0 ? 'Nothing to fix — every reviewer would accept this request.' : `${recs.length} recommendation${recs.length === 1 ? '' : 's'} · ${toFix ? `${toFix} to fix before you submit` : 'nothing blocking'}`}</span>
        {recs.length > 0 && <Segment size="sm" label="Filter recommendations" value={tab} onChange={setTab} items={[{ id: 'all', label: 'All', count: recs.length }, ...Object.entries(SEVERITY).map(([k, v]) => ({ id: k, label: v, count: recs.filter((r) => r.severity === k).length, disabled: !recs.some((r) => r.severity === k) }))]} />}
      </div>
      {applied && (
        <div className="ai-done" role="status"><Icon name="icon-check-brand" size={16} /><div className="grow"><span className="t-body-medium">AI recommendation applied</span><span className="t-body-small muted">{applied.title}</span></div><button type="button" className="inline-link t-body-small" onClick={() => { patch(applied.prev); setApplied(null); }}>Undo</button></div>
      )}
      {undoDismiss && <div className="ai-done" role="status"><Icon name="icon-check-brand" size={16} /><div className="grow"><span className="t-body-medium">Recommendation dismissed</span><span className="t-body-small muted">{undoDismiss.title}</span></div><button type="button" className="inline-link t-body-small" onClick={() => { setDismissed((d) => d.filter((x) => x !== undoDismiss.id)); setUndoDismiss(null); }}>Undo dismiss</button></div>}
      {shown.length > 0 && (
        <ul className="rec-list">
          {shown.map((r) => (
            <li key={r.id} className={`rec sev-${r.severity}`}>
              <div className="rec-head">
                <span className="tag">{REVIEWERS[r.dept].short}</span>
                <span className={`rec-sev t-caption-medium sev-${r.severity}`}>{SEVERITY[r.severity]}</span>
              </div>
              <div className="t-body-medium">{r.title}</div>
              <div className="t-body-small muted">{r.why}</div>
              {r.proposal && (
                <div className="rec-proposal">
                  <div className="t-caption ai-label"><AiSpark size={12} />{r.proposal.label}{r.proposal.replaces ? ` · replaces your ${r.proposal.replaces}` : ''}{r.proposal.append ? ' · added after what you wrote' : ''}</div>
                  {r.proposal.text && <p className="t-body-small pre">{r.proposal.text}</p>}
                  {r.proposal.rows && <ul>{r.proposal.rows.map((x, i) => <li key={i}><span className="grow"><span className="t-body-small">{x.title}</span>{x.sub && <span className="t-caption muted">{x.sub}</span>}</span>{x.badge && <span className="t-caption-medium tnum">{x.badge}</span>}</li>)}</ul>}
                </div>
              )}
              {r.manual && <div className="t-body-small">{r.manual}</div>}
              <div className="rec-actions">
                {r.apply && <Btn variant="primary-sm" onClick={() => apply(r)}>Apply it</Btn>}
                <Btn variant="ghost-sm" onClick={() => takeMe(r)} title={`Opens ${stepTitle(r.step, em)}`}>Take me to the field</Btn>
                <Btn variant="ghost-sm" onClick={() => { setDismissed((d) => [...d, r.id]); setUndoDismiss({ id: r.id, title: r.title }); }}>Dismiss</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
      {tab === 'all' && quiet.length > 0 && recs.length > 0 && (
        <ul className="pre-quiet">
          {quiet.map((d) => <li key={d}><Icon name="icon-check-brand" size={14} /><span className="t-body-small"><strong>No concerns from {REVIEWERS[d].en}</strong> <span className="muted">— this part of the request looks ready for their review.</span></span></li>)}
        </ul>
      )}
    </AiCard>
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
