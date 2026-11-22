// View a request from My requests: key facts, where it is in the approval
// process and who has it now (design-review RequestDetail, read-only).
import { Btn, Icon } from '../components/ui.jsx';
import { useRequestRows, STATUS, TYPE, initials } from './RequestsHome.jsx';

const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const TENDER = [
  ['Request submitted', 'Requester'],
  ['Department approval', 'Department manager'],
  ['Specialist & Finance reviews', 'Technical, Cyber, Risk, EA and Finance teams — in parallel'],
  ['Qualification', 'Finance and Procurement teams'],
  ['Procurement method & officer review', 'Procurement team'],
  ['DOA & estimated price approval', 'Procurement team lead · Department director'],
  ['Published in Etimad', 'Procurement officer'],
  ['PR created in SAP ECC', 'Procurement'],
];
const EMARKET = [
  ['Request submitted', 'Requester'],
  ['Department approval', 'Department manager'],
  ['Etimad E-Market check & order', 'Procurement team'],
  ['PR created in SAP ECC', 'Procurement'],
];
// How far each status has got: index of the current step (-1 = not submitted, length = all done).
const currentStep = (r, steps) => ({ draft: -1, submitted: 1, returned: 1, 'under-review': r.type === 'emarket' ? 2 : 2, approved: steps.length }[r.status]);

export function RequestView({ id, onBack, onEdit }) {
  const rows = useRequestRows();
  const r = rows.find((x) => x.id === id);
  if (!r) {
    return (
      <main className="detail standalone req-home"><div className="req-empty"><div className="t-title">Request not found</div><Btn variant="secondary" onClick={onBack}>Back to My requests</Btn></div></main>
    );
  }
  const steps = r.type === 'emarket' ? EMARKET : TENDER;
  const cur = currentStep(r, steps);
  const doneN = Math.max(0, Math.min(cur, steps.length));
  const withNow = cur >= 0 && cur < steps.length ? steps[cur] : null;
  const facts = [
    ['Request number', r.requestNo || <span className="muted">Not assigned yet</span>],
    ['Type', <span className={`tag ${r.type === 'emarket' ? 'em' : 'blue'}`}>{TYPE[r.type]}</span>],
    ['Estimated value (incl. VAT)', r.value],
    ['Department', r.department],
    ['Created by', <span className="by-cell"><span className="avatar-dot" aria-hidden="true">{initials(r.by)}</span>{r.by}</span>],
    ['Created on', day(r.createdAt)],
    ['Last updated', day(r.updatedAt)],
    ['PR number', r.prNumber || <span className="muted">Created in SAP ECC after final approval</span>],
  ];
  return (
    <main className="detail standalone req-home req-view" aria-labelledby="rv-title">
      <nav className="crumbs t-body-small" aria-label="Breadcrumb">
        <button type="button" className="back-btn" aria-label="Back to My requests" onClick={onBack}><Icon name="icon-arrow-left" size={18} /></button>
        <button type="button" className="link-btn muted" onClick={onBack}>My requests</button><span className="muted">/</span><span>{r.requestNo || 'Draft'}</span>
      </nav>
      <div className="req-home-head">
        <div>
          <div className="row-gap" style={{ marginBottom: 6 }}>
            <span className={`status-pill t-caption-medium st-${r.status}`}><span className="pill-dot" />{STATUS[r.status]}</span>
            {withNow && <span className="t-body-small muted">Currently with <strong className="ink">{withNow[1]}</strong></span>}
          </div>
          <h1 className="t-display" id="rv-title">{r.title}</h1>
        </div>
        <div className="row-gap">
          <Btn variant="ghost" icon="icon-download">Download PDF</Btn>
          {r.session && r.status === 'draft' && <Btn variant="primary" icon="icon-pencil" onClick={() => onEdit(r.id)}>Continue editing</Btn>}
        </div>
      </div>

      {r.status === 'returned' && <div className="banner warn"><Icon name="icon-return" size={16} /><div className="banner-text"><div className="t-body-medium">Returned for changes</div><div className="t-body-small">A reviewer sent this back with comments. Update the commented fields and resubmit.</div></div></div>}
      {r.status === 'draft' && <div className="banner"><Icon name="icon-file" size={16} /><div className="banner-text"><div className="t-body-medium">Not submitted yet</div><div className="t-body-small">{r.note || 'Complete the remaining sections and submit.'}</div></div></div>}

      <div className="rv-grid">
        <section className="proc-card">
          <div className="proc-card-head"><h2 className="t-title" style={{ margin: 0 }}>Request details</h2></div>
          <dl className="kv-tiles rv-facts">{facts.map(([k, v]) => <div key={k}><dt className="t-caption muted">{k}</dt><dd className="t-body-medium">{v}</dd></div>)}</dl>
        </section>
        <section className="proc-card">
          <div className="proc-card-head"><h2 className="t-title" style={{ margin: 0 }}>Approval process</h2><span className="t-caption muted tnum">{doneN} of {steps.length} steps completed</span></div>
          <ol className="rv-steps">
            {steps.map(([name, who], i) => {
              const st = i < cur ? 'done' : i === cur ? (r.status === 'returned' ? 'returned' : 'current') : 'todo';
              return (
                <li key={name} className={`rv-step ${st}`}>
                  <span className="rv-node" aria-hidden="true">{st === 'done' && <Icon name="icon-check-white" size={12} />}</span>
                  <div><div className="t-body-medium">{name}</div><div className="t-caption muted">{st === 'returned' ? 'Returned to the requester' : st === 'current' ? `In progress · ${who}` : st === 'done' ? 'Completed' : who}</div></div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
