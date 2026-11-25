// View a request from My requests (design-review RequestDetail): Overview,
// the full request, BOQ items, documents and the end-to-end process — plus
// edit & resubmit, cancel and download, in the simpler theme-app UI.
import { useMemo, useState } from 'react';
import { Btn, Icon, Collapsible, CollapseCtx, Segment } from '../components/ui.jsx';
import { Dialog, Select } from '../components/FormKit.jsx';
import { TaskCtx } from '../components/ReviewKit.jsx';
import { RequestDetails } from '../components/RequestDetails.jsx';
import { useRequestRows, STATUS, TYPE, initials } from './RequestsHome.jsx';
import { REQUESTS, sar, boqTotal } from '../data/requests.js';
import { useRequests, emptyForm } from '../state/requests.jsx';
import { useActor } from '../state/actor.jsx';
import { setOverride } from '../lib/requestOverrides.js';
import { downloadPdf } from '../lib/pdf.js';
import { lineTotal } from '../lib/requestRules.js';
import { PROJECTS } from '../data/newRequest.js';

const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'details', label: 'Request details' }, { id: 'boq', label: 'BOQ items' }, { id: 'documents', label: 'Documents' }, { id: 'process', label: 'Process' }];
const DAY = 864e5;
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const stamp = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const COST_CENTRES = { 'IT & Digital Transformation': 'IT-ERP-2026', 'IT & Digital': 'IT-ERP-2026', 'Information Security': 'SEC-OPS-2026', Finance: 'FIN-TRS-2026', 'Human Resources': 'HR-DEV-2026', 'Legal Affairs': 'LEG-GEN-2026', 'General Administration': 'GA-ADM-2026' };
const TENDER_BASES = ['REQ-4478', 'REQ-4471', 'REQ-4429', 'REQ-4433'];
const EM_BOQ = [['E-Market items', [
  ['Catalogue items', 'Items ordered from the Etimad E-Market catalogue', 'Material', 0.82],
  ['Delivery & installation', 'Delivery to Riyadh head office and installation', 'Service', 0.1],
  ['Extended warranty', 'Manufacturer warranty extension — 2 years', 'Service', 0.08],
]]];

/* ── The request record behind every tab ─────────────────────────────────── */
function useModel(r) {
  const { get } = useRequests();
  return useMemo(() => {
    if (!r) return null;
    const em = r.type === 'emarket';
    const base = REQUESTS[TENDER_BASES[hash(r.id) % TENDER_BASES.length]];
    const excl = (r.amount || 0) / 1.15;
    const saved = r.session ? get(r.id) : null;
    let boq;
    if (saved?.form?.boqItems?.length) {
      const by = {};
      saved.form.boqItems.forEach((x, i) => {
        const g = x.projectItem || (x.category ? x.category[0].toUpperCase() + x.category.slice(1) : 'Items');
        (by[g] = by[g] || []).push({ no: i + 1, item: x.itemName || 'Untitled item', desc: x.itemDescription || '', cat: x.purchaseType === 'service' || x.category === 'manpower' ? 'Service' : 'Material', delivery: x.deliveryDate || x.endDate || '', qty: `${x.quantity || 1} ${x.unitOfMeasure || x.orderUnit || ''}`.trim(), total: lineTotal(x, em) });
      });
      boq = Object.entries(by).map(([name, items]) => ({ name, items }));
    } else if (em) {
      let no = 0;
      boq = EM_BOQ.map(([name, items]) => ({ name, items: items.map(([item, desc, cat, share]) => ({ no: ++no, item, desc, cat, delivery: new Date(+new Date(r.createdAt) + 30 * DAY).toISOString().slice(0, 10), qty: cat === 'Material' ? `${10 + (hash(r.id) % 110)} Each` : '1 LS', total: Math.round(excl * share) })) }));
    } else {
      const k = boqTotal(base) ? excl / boqTotal(base) : 1;
      boq = base.boq.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, unit: Math.round(i.unit * k), total: Math.round(i.total * k) })) }));
    }
    const request = {
      ...base, id: r.id, project: r.title, projectEn: r.title, projectAr: base.projectAr, route: em ? 'Etimad E-Market' : 'Competitive Tender',
      costCenter: COST_CENTRES[r.department] || 'GEN-2026', amount: excl, amountVat: r.amount,
      requester: { name: r.by, initials: initials(r.by), role: 'Requester', dept: r.department }, boq, comments: [],
      purpose: saved?.form?.purpose || base.purpose, scope: saved?.form?.scopeOfWork || base.scope,
    };
    return { em, request, boq, process: buildProcess(r, em) };
  }, [r, get]);
}

/* ── Process: the approval chain, then what happens after approval ───────── */
const W = (name, role) => ({ name, role });
const PAR = { spec: 'Specialist reviews · in parallel', fin: 'Finance review · in parallel', qual: 'Qualification · in parallel' };
function approvalSteps(r, em) {
  const s = (id, name, who, group) => ({ id, name, who, group });
  return [
    s('sub', 'Request submitted', W(r.by, 'Requester')),
    s('dept', 'Department approval', W('Nasser Al-Harthi', 'Department manager')),
    ...(em ? [s('emk', 'Etimad E-Market check', W('Hana Al-Ghamdi', 'Procurement'))] : [
      s('tech', 'Technical review', W('Sara Al-Zahrani', 'Technical review'), PAR.spec),
      s('cyber', 'Cyber security review', W('Noura Al-Shamrani', 'Cyber Security'), PAR.spec),
      s('bcm', 'Business continuity review', W('Turki Al-Anazi', 'Risk Management'), PAR.spec),
      s('orm', 'Operational risk review', W('Reem Al-Dossary', 'Risk Management'), PAR.spec),
      s('ea', 'Enterprise architecture review', W('Majed Al-Zahrani', 'Enterprise Architecture'), PAR.spec),
    ]),
    s('gl', 'GL account review', W('Khalid Al-Otaibi', 'Finance'), PAR.fin),
    s('assets', 'Assets review', W('Lama Al-Subaie', 'Finance'), PAR.fin),
    ...(em ? [] : [
      s('qfin', 'Financial qualification', W('Abdulrahman Al-Shehri', 'Finance'), PAR.qual),
      s('qproc', 'Procurement qualification', W('Hana Al-Ghamdi', 'Procurement'), PAR.qual),
      s('method', 'Procurement method', W('Abdullah Al-Qahtani', 'Procurement team lead')),
      s('officer', 'Procurement officer review', W('Mohammed Al-Harbi', 'Procurement officer')),
    ]),
    s('doa', 'DOA approval', W('Abdullah Al-Qahtani', 'Procurement team lead · DOA')),
    ...(em ? [] : [s('price', 'Estimated price approval', W('Saad Al-Malki', 'Department director'))]),
    s('pr', 'Purchase requisition created in SAP ECC', W('SAP ECC', 'System')),
  ];
}
function buildProcess(r, em) {
  const steps = approvalSteps(r, em);
  const status = r.status === 'cancelled' ? r.prevStatus || 'under-review' : r.status;
  const n = steps.length;
  let cur; let returned = false;
  switch (status) {
    case 'draft': cur = 0; break;
    case 'submitted': cur = 1; break;
    case 'under-review': cur = 2 + (hash(r.id) % Math.max(1, n - 4)); break;
    case 'returned': cur = 1 + (hash(r.id) % 3); returned = true; break;
    default: cur = r.prNumber ? n : n - 1;
  }
  const curGroup = steps[cur]?.group;
  const created = +new Date(r.createdAt);
  const approval = steps.map((s, i) => {
    const inGroup = !!curGroup && s.group === curGroup;
    let state = status === 'draft' ? (i === 0 ? 'current' : 'upcoming')
      : returned && i === cur ? 'returned'
        : inGroup && !returned ? (i < cur ? 'done' : 'current')
          : i < cur ? 'done' : i === cur ? 'current' : 'upcoming';
    if (r.status === 'cancelled' && (state === 'current' || state === 'upcoming')) state = 'withdrawn';
    const at = state === 'done' || state === 'returned' ? new Date(created + (i === 0 ? 0 : i * 0.6 * DAY)).toISOString() : null;
    const note = state === 'returned' ? 'Returned to the requester — update the BOQ quantities and the delivery schedule, then resubmit.'
      : s.id === 'pr' && state === 'done' && r.prNumber ? `PR ${r.prNumber} created.` : null;
    return { ...s, state, at, note };
  });
  const approved = approval.every((s) => s.state === 'done');
  const officer = W('Mohammed Al-Harbi', 'Procurement officer');
  const later = (id, name, owner, list) => ({ id, name, owner, steps: list.map(([sid, sn, who, group], i) => ({ id: sid, name: sn, who, group, state: r.status === 'cancelled' ? 'withdrawn' : approved && id === 'committee' && (i === 0 || (group && list[0][3] === group)) ? 'current' : 'upcoming' })) });
  const phases = [
    { id: 'approval', name: 'Request approval', owner: 'Department, specialists, finance & procurement', steps: approval },
    later('committee', em ? 'E-Market procurement' : 'Committee process', em ? 'Procurement' : 'Evaluation & qualification committees', em ? [
      ['c1', 'Order placed on Etimad E-Market', officer], ['c2', 'Supplier confirmation', W('Supplier', 'Etimad E-Market')], ['c3', 'Order acceptance', W('Abdullah Al-Qahtani', 'Procurement team lead')],
    ] : [
      ['c1', 'Tender published on Etimad', officer], ['c2', 'Bid submission & opening', W('Hana Al-Ghamdi', 'Evaluation committee chair')],
      ['c3', 'Technical evaluation', W('Sara Al-Zahrani', 'Technical reviewer'), 'Committee evaluation · in parallel'], ['c4', 'Qualification review', W('Khalid Al-Otaibi', 'Qualification committee chair'), 'Committee evaluation · in parallel'],
      ['c5', 'Commercial evaluation', W('Abdullah Al-Qahtani', 'Procurement team lead')], ['c6', 'Award recommendation', W('Hana Al-Ghamdi', 'Evaluation committee chair')], ['c7', 'Award approval (DOA)', W('Saad Al-Malki', 'Department director')],
    ]),
    later('contract', 'Contract', 'Procurement & Legal', [['k1', 'Contract drafting', officer], ['k2', 'Legal review', W('Lina Al-Mutairi', 'Legal counsel')], ['k3', 'Performance bond received', W('Supplier', 'Awarded supplier')], ['k4', 'Contract signed', W('Saad Al-Malki', 'Department director')], ['k5', 'Purchase order created in SAP ECC', W('SAP ECC', 'System')]]),
    later('coc', 'Certificate of Completion (CoC)', 'Requester', [['o1', em ? 'Goods delivered' : 'Delivery / service performed', W('Supplier', 'Awarded supplier')], ['o2', 'Inspection & acceptance testing', W(r.by, 'Requester')], ['o3', 'Certificate of Completion issued', W(r.by, 'Requester')], ['o4', 'Goods receipt / service entry in SAP', W('SAP ECC', 'System')]]),
    later('closure', 'Closure', 'Finance & Procurement', [['z1', 'Invoice verified', W('Khalid Al-Otaibi', 'Accounts payable')], ['z2', 'Final payment released', W('Finance', 'Treasury')], ...(em ? [] : [['z3', 'Bank guarantee released', W('Finance', 'Treasury')]]), ['z4', 'Request closed & archived', officer]]),
  ];
  return phases;
}
const phaseState = (p) => (p.steps.some((s) => s.state === 'returned') ? 'returned' : p.steps.every((s) => s.state === 'done') ? 'done' : p.steps.some((s) => s.state === 'current' || s.state === 'done') ? 'current' : p.steps.every((s) => s.state === 'withdrawn') ? 'withdrawn' : 'upcoming');

/* ── Page ─────────────────────────────────────────────────────────────────── */
export function RequestView({ id, onBack, onEdit }) {
  const rows = useRequestRows();
  const r = rows.find((x) => x.id === id);
  const m = useModel(r);
  const [tab, setTab] = useState('overview');
  const [ask, setAsk] = useState(false);
  const { save } = useRequests();
  const { actor } = useActor();
  if (!r) {
    return <main className="detail standalone req-home"><div className="req-empty"><div className="t-title">Request not found</div><Btn variant="secondary" onClick={onBack}>Back to My requests</Btn></div></main>;
  }
  const ref = r.requestNo || 'Draft';
  const cancelled = r.status === 'cancelled';
  const editable = (r.status === 'draft' || r.status === 'returned') && !cancelled;
  const current = m.process[0].steps.filter((s) => s.state === 'current' || s.state === 'returned');
  const edit = () => {
    if (r.session) return onEdit(r.id);
    // A returned request from the seed list: reopen it as an editable copy that keeps its request number.
    const did = `rs-${r.id}`;
    const proj = PROJECTS.find((p) => p.name === r.title) || PROJECTS[0];
    save(did, { createdBy: actor.id, title: r.title, type: r.type, status: 'draft', routeConfirmed: true, step: 'setup', resubmitOf: r.requestNo,
      form: { ...emptyForm(), sourceType: r.type, routeChoice: r.type === 'emarket' ? 'emarket' : 'tender', projectId: proj.id, costCenterId: proj.costCenterId, selectedItemIds: proj.items.map((i) => i.id), purpose: proj.name === r.title ? proj.purpose : m.request.purpose, scopeOfWork: m.request.scope } });
    onEdit(did);
  };
  const pdf = () => downloadPdf(ref, {
    title: r.title, sub: `${ref} · ${TYPE[r.type]} · ${STATUS[r.status]}`,
    rows: [['Request number', ref], ['Status', STATUS[r.status]], ['Type', TYPE[r.type]], ['Department', r.department], ['Estimated value (incl. VAT)', r.value], ['Cost centre', m.request.costCenter], ['Created by', r.by], ['Created on', day(r.createdAt)], ['Last updated', day(r.updatedAt)], ['PR number', r.prNumber || '-']],
    paras: [{ head: 'Purpose', body: m.request.purpose }, { head: 'Scope of work', body: m.request.scope }],
  });

  return (
    <main className="detail standalone req-home req-view" aria-labelledby="rv-title">
      <nav className="crumbs t-body-small" aria-label="Breadcrumb">
        <button type="button" className="back-btn" aria-label="Back to My requests" onClick={onBack}><Icon name="icon-arrow-left" size={18} /></button>
        <button type="button" className="link-btn muted" onClick={onBack}>My requests</button><span className="muted">/</span><span className="tnum">{ref}</span><span className="muted">/</span><span className="brand-text">{TABS.find((t) => t.id === tab).label}</span>
      </nav>
      <div className="req-home-head">
        <div className="rv-titles">
          <h1 className="t-display" id="rv-title">{r.title}</h1>
          <span className={`status-pill t-caption-medium st-${r.status}`}><span className="pill-dot" />{STATUS[r.status]}</span>
          <span className={`tag ${r.type === 'emarket' ? 'em' : 'blue'}`}>{TYPE[r.type]}</span>
        </div>
        <div className="row-gap">
          {editable && <Btn variant="primary" icon="icon-pencil" onClick={edit}>{r.status === 'draft' ? 'Continue editing' : 'Edit & resubmit'}</Btn>}
          {r.status !== 'approved' && !cancelled && <Btn variant="danger" icon="icon-x" onClick={() => setAsk(true)}>Cancel request</Btn>}
          <button type="button" className="icon-btn bordered" aria-label="Download request PDF" title="Download request PDF" onClick={pdf}><Icon name="icon-download" size={16} /></button>
        </div>
      </div>
      <div className="rv-tabs" role="tablist" aria-label="Request sections">
        {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="rv-tab t-body-medium" onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {cancelled && <div className="banner"><Icon name="icon-info" size={16} /><div className="banner-text t-body-small">This request was cancelled. Pending approval tasks have been withdrawn.</div></div>}
      {r.status === 'returned' && <div className="banner warn"><Icon name="icon-return" size={16} /><div className="banner-text"><div className="t-body-medium">Returned for changes</div><div className="t-body-small">A reviewer sent this back with comments. Update the commented fields and resubmit.</div></div></div>}

      <div role="tabpanel" key={tab} className="rv-panel">
        {tab === 'overview' && <Overview r={r} m={m} current={current} onTab={setTab} />}
        {tab === 'details' && <Details m={m} refId={ref} />}
        {tab === 'boq' && <BoqItems boq={m.boq} em={m.em} />}
        {tab === 'documents' && <Documents r={r} m={m} refId={ref} editable={editable} />}
        {tab === 'process' && <Process phases={m.process} em={m.em} />}
      </div>

      <Dialog open={ask} onClose={() => setAsk(false)} title="Cancel this request?" className="narrow"
        foot={<><span className="grow" /><Btn variant="secondary" onClick={() => setAsk(false)}>Keep request</Btn><Btn variant="danger-solid" onClick={() => { setOverride(r.id, { status: 'cancelled', prevStatus: r.status }); setAsk(false); }}>Cancel request</Btn></>}>
        <p className="t-body" style={{ margin: 0 }}><strong className="tnum">{ref}</strong> will be withdrawn and any pending approval tasks removed from approvers’ inboxes. This can’t be undone.</p>
      </Dialog>
    </main>
  );
}

/* ── Overview ─────────────────────────────────────────────────────────────── */
const PHASES = (em) => ['Request', 'Approvals', 'PR creation', em ? 'E-Market order' : 'Tendering', em ? 'Delivery' : 'Evaluation & award', 'PO & contract'];
const phaseIdx = (r) => (r.status === 'draft' ? 0 : r.status === 'approved' ? (r.prNumber ? 3 : 2) : 1);
const COMMITTEE = [
  ['Sara Al-Zahrani', 'Technical reviewer', 'Technical', 'Technical evaluation'],
  ['Hana Al-Ghamdi', 'Evaluation committee chair', 'Procurement', 'Bid evaluation'],
  ['Khalid Al-Otaibi', 'Qualification committee chair', 'Financial', 'Qualification'],
  ['Abdulrahman Al-Shehri', 'Finance qualification', 'Financial', 'Financial evaluation'],
  ['Abdullah Al-Qahtani', 'Procurement team lead', 'Procurement', 'Commercial evaluation'],
  ['Mohammed Al-Harbi', 'Procurement officer', 'Procurement', 'Tender secretary'],
  ['Lina Al-Mutairi', 'Legal counsel', 'Legal', 'Contract review'],
  ['Majed Al-Zahrani', 'Enterprise architect', 'Technical', 'Solution compliance'],
];
function Field({ label, wide, children }) {
  return <div className={`rv-field${wide ? ' wide' : ''}`}><dt className="t-body-small muted">{label}</dt><dd className="t-body-medium">{children}</dd></div>;
}
function Overview({ r, m, current, onTab }) {
  const pi = phaseIdx(r);
  const approvers = m.process[0].steps.filter((s) => !['sub', 'pr'].includes(s.id));
  const assigned = approvers.filter((s) => s.state !== 'upcoming' && s.state !== 'withdrawn');
  const doneN = approvers.filter((s) => s.state === 'done').length;
  const start = new Date(+new Date(r.createdAt) + 45 * DAY), end = new Date(+new Date(r.createdAt) + (m.em ? 75 : 410) * DAY);
  const members = m.em ? COMMITTEE.filter((c) => c[2] === 'Procurement') : COMMITTEE;
  const service = /Services|Consult|Support|Audit|Program|Subscription|Migration|Development/i.test(r.title);
  return (
    <div className="rv-stack">
      <section className="proc-card">
        <ol className="rv-phases" aria-label="Where this request is">
          {PHASES(m.em).map((p, i) => {
            const st = r.status === 'cancelled' && i >= pi ? 'todo' : i < pi ? 'done' : i === pi ? (r.status === 'returned' ? 'returned' : 'current') : 'todo';
            return <li key={p} className={`rv-phase ${st}`} aria-current={st === 'current' ? 'step' : undefined}>{st === 'done' && <Icon name="icon-check-white" size={12} />}<span>{p}</span></li>;
          })}
        </ol>
        <p className="t-body-small rv-now">
          <Icon name="icon-clock" size={16} />
          {r.status === 'cancelled' ? <span className="muted">Cancelled — no further approvals.</span>
            : r.status === 'draft' ? <span><span className="muted">Not submitted yet —</span> complete the remaining sections and submit.</span>
              : current.length ? <span><span className="muted">{r.status === 'returned' ? 'Returned at' : 'Currently with'}</span> {current.map((s, i) => <span key={s.id}><strong className="ink">{s.who.name}</strong> <span className="muted">({s.name})</span>{i < current.length - 1 ? ', ' : ''}</span>)}</span>
                : <span className="muted">All approvals complete.</span>}
          <button type="button" className="link-btn t-body-small rv-push" onClick={() => onTab('process')}>View process</button>
        </p>
      </section>

      <section className="proc-card">
        <div className="proc-card-head"><h2 className="t-title">Request details</h2><button type="button" className="link-btn t-body-small" onClick={() => onTab('details')}>View full request</button></div>
        <dl className="rv-fields">
          <Field label="Request title" wide>{r.title}</Field>
          <Field label="Request number">{r.requestNo ? <span className="tnum">{r.requestNo}</span> : <span className="muted rv-ital">Assigned on submission</span>}</Field>
          <Field label="Department">{r.department}</Field>
          <Field label="Status"><span className={`status-pill t-caption-medium st-${r.status}`}><span className="pill-dot" />{STATUS[r.status]}</span></Field>
          <Field label="Type"><span className={`tag ${m.em ? 'em' : 'blue'}`}>{TYPE[r.type]}</span></Field>
          <Field label="Budget code / Cost centre"><span className="tnum">{m.request.costCenter}</span></Field>
          <Field label="Estimated cost (incl. VAT)"><span className="tnum">{r.value}</span></Field>
          <Field label="Requester"><span className="by-cell"><span className="avatar-dot" aria-hidden="true">{initials(r.by)}</span>{r.by}</span></Field>
          <Field label="Approvers">
            <button type="button" className="rv-approvers" onClick={() => onTab('process')}>
              <span className="avatar-stack">{assigned.slice(0, 5).map((s) => <span key={s.id} className={`avatar-dot ring-${s.state}`} title={`${s.who.name} · ${s.name}`}>{initials(s.who.name)}</span>)}{assigned.length > 5 && <span className="avatar-dot more">+{assigned.length - 5}</span>}</span>
              <span className="t-body-small muted tnum">{doneN}/{approvers.length} approved</span>
            </button>
          </Field>
          <Field label="Created on">{day(r.createdAt)}</Field>
          <Field label="Last updated">{day(r.updatedAt)}</Field>
        </dl>
      </section>

      <section className="proc-card">
        <div className="proc-card-head"><h2 className="t-title">PR details</h2></div>
        <dl className="rv-fields">
          <Field label="PR number">{r.prNumber ? <span className="tnum">{r.prNumber}</span> : <span className="muted rv-ital">Created in SAP ECC after final approval</span>}</Field>
          <Field label="Etimad reference">{r.requestNo ? <span className="tnum">{r.requestNo.replace(/^(TEN|PR)/, m.em ? 'EMK' : 'ETM')}</span> : <span className="muted">—</span>}</Field>
          <Field label="Purchase type">{m.em ? 'Etimad E-Market order' : 'Competitive tender'}</Field>
          <Field label="PR type">{service ? 'Service' : 'Material'}</Field>
          <Field label="Urgency">{r.amount > 3000000 ? 'High' : 'Normal'}</Field>
          <Field label="Delivery location">Riyadh — Head office</Field>
          <Field label="Expected start date">{day(start)}</Field>
          <Field label="Expected end date">{day(end)}</Field>
          <Field label="Contract duration">{m.em ? 'One-off purchase' : '12 months'}</Field>
          <Field label="Detailed requirement / statement of work (SOW)" wide><span className="t-body rv-sow">{m.request.scope}</span></Field>
        </dl>
      </section>

      <section className="proc-card">
        <div className="proc-card-head"><h2 className="t-title">Committee members</h2><span className="t-caption muted">{members.length} members</span></div>
        <ul className="rv-members">
          {members.map(([name, role, chip, duty]) => (
            <li key={name}>
              <span className="avatar-dot lg" aria-hidden="true">{initials(name)}</span>
              <span className="grow"><span className="t-body-medium">{name}</span><span className="t-body-small muted">{role}</span></span>
              <span className={`tag rv-chip ${chip.toLowerCase()}`}>{chip}</span>
              <span className="t-body-small muted rv-duty"><Icon name="icon-user" size={14} />{duty}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ── Request details: the same read-only view reviewers see ──────────────── */
function Details({ m, refId }) {
  const [ctl, setCtl] = useState({ open: true, rev: 0 });
  const ctx = useMemo(() => ({ request: m.request, viewOnly: true, commenting: false, comment: () => {}, openDetails: () => {}, store: { comments: {}, rfp: {} } }), [m.request]);
  return (
    <div className="rv-stack">
      <div className="rv-toolbar">
        <span className="t-body-small muted">Request <strong className="ink tnum">{refId}</strong> · {m.request.projectEn}</span>
        <Btn variant="secondary-sm" icon={ctl.open ? 'icon-chevron-down' : 'icon-chevron-right'} onClick={() => setCtl((c) => ({ open: !c.open, rev: c.rev + 1 }))}>{ctl.open ? 'Collapse all' : 'Expand all'}</Btn>
      </div>
      <TaskCtx.Provider value={ctx}><CollapseCtx.Provider value={ctl}><RequestDetails /></CollapseCtx.Provider></TaskCtx.Provider>
    </div>
  );
}

/* ── BOQ items ────────────────────────────────────────────────────────────── */
const quarterOf = (d) => { if (!d) return ''; const x = new Date(d); return Number.isNaN(+x) ? '' : `Q${Math.floor(x.getMonth() / 3) + 1} ${x.getFullYear()}`; };
const qKey = (q) => { const [a, y] = q.split(' '); return `${y}${a}`; };
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
function BoqItems({ boq, em }) {
  const [q, setQ] = useState('');
  const [line, setLine] = useState('all');
  const [qtr, setQtr] = useState('all');
  const [sort, setSort] = useState('none');
  const [view, setView] = useState('list');
  const [ctl, setCtl] = useState({ open: true, rev: 0 });
  const all = boq.flatMap((g) => g.items.map((i) => ({ ...i, line: g.name, q: quarterOf(i.delivery) })));
  const total = all.reduce((s, i) => s + i.total, 0);
  const lines = boq.map((g) => ({ name: g.name, n: g.items.length, value: g.items.reduce((s, i) => s + i.total, 0) })).sort((a, b) => b.value - a.value);
  const quarters = [...new Set(all.map((i) => i.q).filter(Boolean))].sort((a, b) => qKey(a).localeCompare(qKey(b)));
  const qStats = quarters.map((k) => ({ k, n: all.filter((i) => i.q === k).length, value: all.filter((i) => i.q === k).reduce((s, i) => s + i.total, 0) }));
  const first = all.map((i) => i.delivery).filter(Boolean).sort()[0];
  const top = [...all].sort((a, b) => b.total - a.total).slice(0, 5);
  const query = q.trim().toLowerCase();
  let shown = all.filter((i) => (line === 'all' || i.line === line) && (qtr === 'all' || i.q === qtr) && (!query || `${i.item} ${i.desc} ${i.line}`.toLowerCase().includes(query)));
  if (sort !== 'none') shown = [...shown].sort((a, b) => (sort === 'high' ? b.total - a.total : sort === 'low' ? a.total - b.total : a.item.localeCompare(b.item)));
  const filtered = line !== 'all' || qtr !== 'all' || !!query;
  const clear = () => { setQ(''); setLine('all'); setQtr('all'); };
  const maxLine = Math.max(...lines.map((l) => l.value), 1), maxQ = Math.max(...qStats.map((s) => s.value), 1);
  const groups = sort === 'none' ? boq.map((g) => ({ name: g.name, items: shown.filter((i) => i.line === g.name) })).filter((g) => g.items.length) : [{ name: 'All items', items: shown }];
  return (
    <div className="rv-stack">
      <dl className="kv-tiles rv-boq-tiles">
        <div><dt className="t-caption muted">Line items</dt><dd className="t-heading tnum">{all.length}</dd><dd className="t-caption muted">{lines.length} budget lines</dd></div>
        <div><dt className="t-caption muted">Total value (excl. VAT)</dt><dd className="t-heading tnum">{sar(total, 0)}</dd><dd className="t-caption muted tnum">{sar(total * 1.15, 0)} incl. VAT</dd></div>
        <div><dt className="t-caption muted">First delivery</dt><dd className="t-heading">{first ? day(first) : '—'}</dd><dd className="t-caption muted">{quarters.length} delivery quarters</dd></div>
      </dl>
      <div className="rv-charts">
        <section className="proc-card">
          <h2 className="t-title">Value by budget line</h2>
          <ul className="rv-bars">{lines.map((l) => (
            <li key={l.name}><button type="button" className={`rv-bar-row${line === l.name ? ' on' : ''}`} onClick={() => setLine(line === l.name ? 'all' : l.name)}>
              <span className="t-body-small rv-bar-label">{l.name}</span><span className="rv-bar"><span style={{ width: `${(l.value / maxLine) * 100}%` }} /></span><span className="t-body-small tnum">{short(l.value)}</span>
            </button></li>))}</ul>
        </section>
        <section className="proc-card">
          <h2 className="t-title">Top items by value</h2>
          <ol className="rv-top">{top.map((i) => <li key={`${i.line}-${i.no}`}><span className="t-body-small grow">{i.item}<span className="muted"> · {i.line}</span></span><span className="t-body-small tnum">{short(i.total)}</span><span className="t-caption muted tnum">{total ? Math.round((i.total / total) * 100) : 0}%</span></li>)}</ol>
        </section>
        {qStats.length > 1 && (
          <section className="proc-card rv-span">
            <div className="proc-card-head"><h2 className="t-title">Delivery schedule</h2><span className="t-caption muted">Bar height = value; number = items. Click a bar to filter.</span></div>
            <div className="rv-cols">{qStats.map((s) => (
              <button key={s.k} type="button" className={`rv-col${qtr === s.k ? ' on' : ''}`} onClick={() => setQtr(qtr === s.k ? 'all' : s.k)} title={`${s.k}: ${s.n} items · ${sar(s.value, 0)}`}>
                <span className="t-caption tnum">{s.n}</span><span className="rv-col-bar" style={{ height: `${Math.max(6, (s.value / maxQ) * 100)}%` }} /><span className="t-caption muted">{s.k}</span>
              </button>))}</div>
          </section>
        )}
      </div>
      <div className="rv-toolbar">
        <label className="search rv-search"><Icon name="icon-search" size={16} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items, descriptions, budget lines…" aria-label="Search items" /></label>
        <Select value={line} onChange={(e) => setLine(e.target.value)} aria-label="Budget line"><option value="all">All budget lines</option>{lines.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}</Select>
        {quarters.length > 1 && <Select value={qtr} onChange={(e) => setQtr(e.target.value)} aria-label="Delivery quarter"><option value="all">Any delivery</option>{quarters.map((k) => <option key={k}>{k}</option>)}</Select>}
        <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="none">Sort: by budget line</option><option value="high">Value: high → low</option><option value="low">Value: low → high</option><option value="name">Name A → Z</option></Select>
        <span className="grow" />
        {view === 'list' && <Btn variant="ghost-sm" onClick={() => setCtl((c) => ({ open: !c.open, rev: c.rev + 1 }))}>{ctl.open ? 'Collapse all' : 'Expand all'}</Btn>}
        <Segment size="sm" label="Layout" value={view} onChange={setView} items={[{ id: 'list', label: 'List view' }, { id: 'table', label: 'Table view' }]} />
      </div>
      {filtered && <p className="t-body-small muted" style={{ margin: 0 }}>Showing <strong className="ink">{shown.length}</strong> of {all.length} items · <button type="button" className="link-btn t-body-small" onClick={clear}>Clear filters</button></p>}
      {!shown.length ? (
        <div className="req-empty"><div className="t-title">No items match</div><Btn variant="secondary" onClick={clear}>Clear filters</Btn></div>
      ) : view === 'table' ? (
        <div className="rv-table-wrap"><table className="rv-table t-body-small">
          <thead><tr><th>#</th><th>Item</th><th>Budget line</th><th>Type</th><th>Quantity</th><th>Needed by</th><th className="num">Total (SAR)</th></tr></thead>
          <tbody>{shown.map((i) => <tr key={`${i.line}-${i.no}`}><td className="tnum muted">{i.no}</td><td><div className="t-body-medium">{i.item}</div>{i.desc && <div className="muted">{i.desc}</div>}</td><td>{i.line}</td><td>{i.cat}</td><td className="tnum">{i.qty}</td><td className="tnum">{day(i.delivery)}</td><td className="num tnum">{Math.round(i.total).toLocaleString('en-US')}</td></tr>)}</tbody>
        </table></div>
      ) : (
        <CollapseCtx.Provider value={ctl}>
          {groups.map((g) => (
            <div className="proc-card rv-group" key={g.name}>
              <Collapsible title={g.name} meta={`${g.items.length} item${g.items.length > 1 ? 's' : ''} · ${sar(g.items.reduce((s, i) => s + i.total, 0), 0)}`}>
                <ul className="rv-items">{g.items.map((i) => (
                  <li key={`${i.line}-${i.no}`}>
                    <span className="t-caption muted tnum rv-no">{i.no}</span>
                    <span className="grow"><span className="t-body-medium">{i.item}</span>{i.desc && <span className="t-body-small muted">{i.desc}</span>}<span className="t-caption muted">{i.cat} · {i.qty}{i.delivery ? ` · needed by ${day(i.delivery)}` : ''}{sort !== 'none' ? ` · ${i.line}` : ''}</span></span>
                    <span className="t-body-medium tnum">{sar(i.total, 0)}</span>
                  </li>))}</ul>
              </Collapsible>
            </div>
          ))}
        </CollapseCtx.Provider>
      )}
      {em && <p className="t-caption muted" style={{ margin: 0 }}>E-Market prices come from the Etimad catalogue at the time of ordering.</p>}
    </div>
  );
}

/* ── Documents ────────────────────────────────────────────────────────────── */
function Documents({ r, m, refId, editable }) {
  const [added, setAdded] = useState([]);
  const [preview, setPreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const attachments = [...m.request.attachments.slice(0, m.em ? 2 : 5).map((d) => ({ ...d, by: r.by, at: r.createdAt })), ...added];
  const generated = [
    ...(r.status !== 'draft' && r.requestNo ? [{ name: `Request summary — ${r.requestNo}`, type: 'PDF', size: '412 KB', by: 'Munafasat', at: r.createdAt }] : []),
    ...(r.status === 'approved' ? [{ name: 'Approval memo (DOA)', type: 'PDF', size: '188 KB', by: 'Munafasat', at: r.updatedAt }] : []),
    ...(r.prNumber ? [{ name: `Purchase requisition ${r.prNumber}`, type: 'PDF', size: '96 KB', by: 'SAP ECC', at: r.updatedAt }] : []),
  ];
  const spec = (d) => ({ title: d.name, sub: `${refId} · ${r.title}`, rows: [['Request', refId], ['Title', r.title], ['Department', r.department], ['Estimated value', r.value], ['Document type', d.type], ['Uploaded by', d.by], ['Date', day(d.at)]] });
  const upload = (e) => {
    const fs = Array.from(e.target.files || []);
    setAdded((a) => [...a, ...fs.map((f) => ({ name: f.name.replace(/\.[^.]+$/, ''), type: (f.name.split('.').pop() || 'FILE').toUpperCase(), size: f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1e3))} KB`, by: 'You', at: new Date().toISOString() }))]);
    e.target.value = '';
  };
  const group = (title, docs, empty, action) => (
    <section className="proc-card">
      <div className="proc-card-head"><h2 className="t-title">{title} <span className="t-caption muted tnum">{docs.length}</span></h2>{action}</div>
      {!docs.length ? <p className="t-body-small muted rv-doc-empty">{empty}</p> : (
        <ul className="rv-docs">{docs.map((d, i) => (
          <li key={i}>
            <button type="button" className="rv-doc-main" onClick={() => setPreview(d)}>
              <span className={`file-type t-${d.type.toLowerCase()}`}>{d.type}</span>
              <span className="grow"><span className="t-body-medium">{d.name}</span><span className="t-body-small muted">{d.size} · by {d.by} · {day(d.at)}</span></span>
            </button>
            <Btn variant="ghost-sm" icon="icon-eye" onClick={() => setPreview(d)}>Preview</Btn>
            <button type="button" className="icon-btn" aria-label={`Download ${d.name}`} title="Download" onClick={() => downloadPdf(d.name, spec(d))}><Icon name="icon-download" size={16} /></button>
          </li>))}</ul>
      )}
    </section>
  );
  return (
    <div className="rv-stack">
      {group('Request attachments', attachments, 'No attachments yet.', editable && <label className="btn btn-secondary-sm rv-upload"><Icon name="icon-upload" size={16} />Upload<input type="file" multiple hidden onChange={upload} /></label>)}
      {group('Generated documents', generated, 'Documents are generated once the request is submitted.')}
      <Dialog open={!!preview} onClose={() => setPreview(null)} title={preview?.name} sub={preview && `${preview.type} · ${preview.size} · by ${preview.by}`} className="sheet rv-preview"
        foot={preview && <><span className="zoom-ctl"><button type="button" className="icon-btn" aria-label="Zoom out" disabled={zoom <= 0.6} onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}>−</button><span className="t-caption tnum">{Math.round(zoom * 100)}%</span><button type="button" className="icon-btn" aria-label="Zoom in" disabled={zoom >= 1.6} onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))}>+</button></span><span className="grow" /><Btn variant="secondary" onClick={() => setPreview(null)}>Close</Btn><Btn variant="primary" icon="icon-download" onClick={() => downloadPdf(preview.name, spec(preview))}>Download</Btn></>}>
        {preview && (
          <div className="rv-page-wrap"><div className="rv-page" style={{ zoom }}>
            <div className="rv-page-bar" />
            <div className="t-heading">{preview.name}</div>
            <div className="t-body-small muted">{refId} · {r.title}</div>
            <dl className="rv-page-rows t-body-small">{spec(preview).rows.map(([k, v]) => <div key={k}><dt className="muted">{k}</dt><dd>{v}</dd></div>)}</dl>
            <p className="t-body-small muted">{m.request.scope}</p>
          </div></div>
        )}
      </Dialog>
    </div>
  );
}

/* ── Process ──────────────────────────────────────────────────────────────── */
const PILL = { done: ['Completed', 'done'], returned: ['Returned', 'st-returned'], current: ['In progress', 'st-under-review'], upcoming: ['Not started', 'st-draft'], withdrawn: ['Withdrawn', 'st-draft'] };
function Process({ phases, em }) {
  const all = phases.flatMap((p) => p.steps);
  const done = all.filter((s) => s.state === 'done').length;
  const [open, setOpen] = useState(() => new Set(phases.filter((p) => ['current', 'returned'].includes(phaseState(p))).map((p) => p.id)));
  const allOpen = open.size === phases.length;
  const toggle = (k) => setOpen((o) => { const x = new Set(o); x.has(k) ? x.delete(k) : x.add(k); return x; });
  return (
    <div className="rv-stack">
      <div className="rv-toolbar">
        <span className="rv-progress"><span style={{ width: `${(done / all.length) * 100}%` }} /></span>
        <span className="t-body-small tnum"><strong>{done}/{all.length}</strong> steps completed</span>
        <span className="grow" />
        <Btn variant="secondary-sm" onClick={() => setOpen(allOpen ? new Set() : new Set(phases.map((p) => p.id)))}>{allOpen ? 'Collapse all' : 'Expand all'}</Btn>
      </div>
      {phases.map((p, i) => {
        const st = phaseState(p); const isOpen = open.has(p.id); const pd = p.steps.filter((s) => s.state === 'done').length;
        return (
          <section key={p.id} className={`proc-card rv-phase-card ${st}`}>
            <button type="button" className="rv-phase-head" aria-expanded={isOpen} onClick={() => toggle(p.id)}>
              <Node state={st} n={i + 1} />
              <span className="grow"><span className="t-title">{p.name}</span><span className="t-body-small muted">{p.owner} · {pd}/{p.steps.length} steps</span></span>
              <span className="rv-progress sm"><span style={{ width: `${(pd / p.steps.length) * 100}%` }} /></span>
              <span className={`status-pill t-caption-medium ${PILL[st][1]}`}>{PILL[st][0]}</span>
              <Icon name="icon-chevron-down" size={14} className={`rv-chev${isOpen ? ' open' : ''}`} />
            </button>
            {isOpen && <Timeline steps={p.steps} />}
          </section>
        );
      })}
      {em && <p className="t-caption muted" style={{ margin: 0 }}>Etimad E-Market flow — qualification and committee evaluation are not required.</p>}
    </div>
  );
}
function Timeline({ steps }) {
  const blocks = [];
  steps.forEach((s) => { const last = blocks[blocks.length - 1]; if (s.group && last?.group === s.group) last.items.push(s); else blocks.push({ group: s.group, items: [s] }); });
  return (
    <ol className="rv-timeline">
      {blocks.map((b, i) => {
        const st = b.items.some((s) => s.state === 'returned') ? 'returned' : b.items.some((s) => s.state === 'current') ? 'current' : b.items.every((s) => s.state === 'done') ? 'done' : b.items[0].state;
        return (
          <li key={i} className={`rv-tl ${st}`}>
            <Node state={st} n={i + 1} small />
            <div className="grow">
              {b.group ? <><div className="t-caption muted rv-group-label">{b.group}</div><div className="rv-par">{b.items.map((s) => <StepCard key={s.id} s={s} />)}</div></> : <StepCard s={b.items[0]} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
function Node({ state, n, small }) {
  return <span className={`rv-node2 ${state}${small ? ' sm' : ''}`} aria-hidden="true">{state === 'done' ? <Icon name="icon-check-white" size={12} /> : state === 'returned' ? <Icon name="icon-return" size={12} /> : n}</span>;
}
function StepCard({ s }) {
  const tag = { done: 'Completed', current: 'In progress', returned: 'Returned', upcoming: 'Upcoming', withdrawn: 'Withdrawn' }[s.state];
  return (
    <div className={`rv-stepcard ${s.state}`} data-step-state={s.state}>
      <div className="rv-stepcard-top"><span className="t-body-medium">{s.name}</span><span className={`t-caption-medium rv-tag ${s.state}`}>{tag}</span></div>
      {s.state !== 'upcoming' && s.state !== 'withdrawn' && (
        <div className="t-body-small muted rv-who"><span className="avatar-dot" aria-hidden="true">{initials(s.who.name)}</span><span className="grow"><span className="ink">{s.who.name}</span> · {s.who.role}</span>{s.at && <span className="t-caption tnum">{stamp(s.at)}</span>}</div>
      )}
      {s.note && <p className={`t-body-small rv-note${s.state === 'returned' ? ' bad' : ''}`}>{s.note}</p>}
    </div>
  );
}
