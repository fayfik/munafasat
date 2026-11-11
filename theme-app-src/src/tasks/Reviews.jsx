import { useEffect, useMemo, useState } from 'react';
import { useTask, ReviewHeader, SectionHead, ReviewRow, LibraryDialog, countDone, isDone } from '../components/ReviewKit.jsx';
import { Icon, Btn, Avatar, Tags, Collapsible } from '../components/ui.jsx';
import { SPECIALIST, LIBRARY, EA } from '../data/content.js';
import { sar } from '../data/requests.js';

function Member({ person, label }) {
  return (
    <div className="member">
      <span className="t-caption muted">{label}</span>
      <span className="person-chip"><Avatar person={person} size={20} /><span className="t-body">{person.name}</span><span className="t-caption muted">{person.role}</span></span>
    </div>
  );
}

function BoqReference({ request, label }) {
  const items = request.boq.flatMap((g) => g.items);
  return (
    <Collapsible title="BOQ — for reference" meta={`${items.length} items · ${label}`} defaultOpen={false}>
      <table className="plain-table compact">
        <thead><tr><th>#</th><th>Item</th><th className="num">Qty</th><th className="num">Total</th></tr></thead>
        <tbody>{items.map((i) => <tr key={i.no}><td className="muted">{i.no}</td><td>{i.item}<span className="sub">{i.desc}</span></td><td className="num muted">{i.qty}</td><td className="num">{sar(i.total, 0)}</td></tr>)}</tbody>
      </table>
    </Collapsible>
  );
}

/* ---------- Technical evaluation (Technical member) ---------- */
export function TechEval() {
  const { request, review, setGates } = useTask();
  const te = request.techEval;
  const docs = te.documents.filter((d) => !d.mandatory);
  const keys = [...docs.map((d) => `doc-${d.id}`), ...te.requirements.map((r) => `req-${r.id}`), ...te.criteria.map((c) => `cri-${c.id}`), 'passing'];
  const done = countDone(keys, review.decisions);
  const weights = te.criteria.map((c) => Number(review.decisions[`cri-${c.id}`]?.value?.weight ?? c.weight));
  const total = weights.reduce((a, b) => a + b, 0);
  useEffect(() => { setGates({ approve: done === keys.length ? (total === 100 ? true : 'Evaluation weights must total 100%.') : `Review all ${keys.length} items to approve.` }); }, [done, total]);
  const acceptAll = () => review.set(keys.filter((k) => !review.decisions[k]), { state: 'accepted' });
  return (
    <div className="stack">
      <ReviewHeader title="Review the technical evaluation" desc="Accept each item, or modify a row to change it. Approve unlocks when every item is reviewed." done={done} total={keys.length} onAll={acceptAll} />
      <Member person={te.member} label="Technical evaluation member" />

      <section className="sec">
        <SectionHead name="Technical documents" hint="Mandatory documents are fixed; review the rest." done={countDone(docs.map((d) => `doc-${d.id}`), review.decisions)} total={docs.length} />
        <div className="fixed-list">{te.documents.filter((d) => d.mandatory).map((d) => <span key={d.id} className="fixed-item"><Icon name="icon-check" size={13} />{d.name}<span className="t-caption muted">Mandatory</span></span>)}</div>
        {docs.map((d) => <ReviewRow key={d.id} k={`doc-${d.id}`} title={d.name} mode="modify" fields={[{ key: 'title', label: 'Document', value: d.name, wide: true }]} compact />)}
      </section>

      <section className="sec">
        <SectionHead name="Technical requirements" done={countDone(te.requirements.map((r) => `req-${r.id}`), review.decisions)} total={te.requirements.length} />
        {te.requirements.map((r, i) => (
          <ReviewRow key={r.id} k={`req-${r.id}`} title={`${i + 1}. ${r.name}`} sub={r.desc} mode="modify"
            fields={[{ key: 'title', label: 'Requirement', value: `${i + 1}. ${r.name}` }, { key: 'sub', label: 'Description', value: r.desc, type: 'textarea', wide: true }]} />
        ))}
      </section>

      <section className="sec">
        <SectionHead name="Evaluation criteria" right={<span className={`t-caption-medium ${total === 100 ? 'brand-text' : 'danger-text'}`}>Total weight {total}%</span>} done={countDone(te.criteria.map((c) => `cri-${c.id}`), review.decisions)} total={te.criteria.length} />
        {te.criteria.map((c, i) => (
          <ReviewRow key={c.id} k={`cri-${c.id}`} mode="modify"
            fields={[{ key: 'name', label: 'Criteria', value: c.name, wide: true }, { key: 'how', label: 'How it is applied', value: c.how, type: 'textarea', wide: true }, { key: 'weight', label: 'Weight', value: c.weight, type: 'number', suffix: '%' }]}
            title={c.name}
            render={(v) => (
              <div className="crit-row">
                <div><div className="t-body rrow-title">{i + 1}. {v?.name ?? c.name}</div><div className="t-body-small muted">{v?.how ?? c.how}</div></div>
                <span className="weight">{v?.weight ?? c.weight}%</span>
              </div>
            )} />
        ))}
      </section>

      <section className="sec">
        <SectionHead name="Technical passing percentage" hint="Minimum score a vendor must reach to pass the technical stage." done={isDone(review.decisions.passing) ? 1 : 0} total={1} />
        <ReviewRow k="passing" mode="modify" title="Passing percentage" fields={[{ key: 'pct', label: 'Passing percentage', value: te.passing, type: 'number', suffix: '%' }]}
          render={(v) => <div className="crit-row"><div className="t-body rrow-title">Passing percentage</div><span className="weight">{v?.pct ?? te.passing}%</span></div>} />
      </section>
    </div>
  );
}

/* ---------- Specialist reviews: Cyber · BCM · Operational risk ---------- */
export function Specialist() {
  const { task, request, review, setGates } = useTask();
  const cfg = SPECIALIST[task.type];
  const added = review.extra.added || {};
  const [lib, setLib] = useState(null);
  const sections = cfg.sections.map((s) => ({ ...s, rows: [...s.rows, ...(added[s.id] || [])] }));
  const keys = sections.flatMap((s) => s.rows.map((r) => r.key));
  const done = countDone(keys, review.decisions);
  useEffect(() => { setGates({ [cfg.primary]: done === keys.length ? true : `Review all ${keys.length} items first.` }); }, [done, keys.length]);
  const acceptAll = () => review.set(keys.filter((k) => !review.decisions[k]), { state: 'accepted' });
  const insert = (section, item) => {
    const row = { key: `lib-${item.id}`, title: item.title, sub: item.sub, fromLib: true };
    review.setExtra({ added: { ...added, [section.id]: [...(added[section.id] || []), row] } });
    review.set(row.key, { state: 'accepted' });
  };
  const usedIds = new Set(keys);
  return (
    <div className="stack">
      <ReviewHeader title={cfg.title} desc={cfg.desc} done={done} total={keys.length} noun={cfg.noun} onAll={acceptAll} />
      {sections.map((s) => (
        <section className="sec" key={s.id}>
          <SectionHead name={s.name} hint={s.hint} done={countDone(s.rows.map((r) => r.key), review.decisions)} total={s.rows.length} />
          {s.rows.map((r) => <ReviewRow key={r.key} k={r.key} title={r.title} sub={r.sub} tone={r.tone} reasons={cfg.reasons} anchor={{ id: r.key, label: `${s.name} › ${r.title.length > 48 ? `${r.title.slice(0, 48)}…` : r.title}` }}>{r.fromLib && <span className="lib-tag t-caption"><Icon name="icon-library" size={12} />From library</span>}</ReviewRow>)}
          {s.canAdd && <button type="button" className="add-row" onClick={() => setLib(s)}><Icon name="icon-plus" size={12} />{cfg.add}</button>}
        </section>
      ))}
      <BoqReference request={request} label={`not part of this review`} />
      {lib && <LibraryDialog title={`${cfg.add} from the library`} items={(LIBRARY[lib.lib] || []).filter((i) => !usedIds.has(`lib-${i.id}`) && !lib.rows.some((r) => r.title === i.title))} onInsert={(it) => insert(lib, it)} onClose={() => setLib(null)} />}
    </div>
  );
}

/* ---------- Enterprise architecture ---------- */
function Standard({ s }) {
  return (
    <li className={`std${s.na ? ' na' : ''}`}>
      <div className="t-body-small">{s.text}{s.na && <div className="t-caption muted">Not applicable — {s.na}</div>}</div>
      <Tags items={s.na ? ['N/A', ...s.tags] : s.tags} />
    </li>
  );
}
function EaBody({ body, request }) {
  if (body.kind === 'scope') return (
    <div className="ea-body">
      <p className="t-body-small" style={{ margin: 0 }}>{request.scope}</p>
      <div className="ea-cols">
        <div><span className="t-caption muted">Objectives</span><ul className="dot-list">{EA.objectives.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div><span className="t-caption muted">In scope</span><ul className="dot-list">{EA.inScope.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div><span className="t-caption muted">Out of scope</span><ul className="dot-list">{EA.outScope.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>
    </div>
  );
  if (body.kind === 'list') return <ul className="dot-list ea-body">{body.items.map((x) => <li key={x}>{x}</li>)}</ul>;
  if (body.kind === 'licences') {
    const lic = request.boq.flatMap((g) => g.items).filter((i) => /Licen/.test(i.item));
    return (
      <div className="ea-body">
        <table className="plain-table compact"><thead><tr><th>BOQ item</th><th className="num">Quantity</th><th className="num">Amount</th></tr></thead>
          <tbody>{lic.map((i) => <tr key={i.no}><td>{i.no}. {i.item}<span className="sub">{i.desc}</span></td><td className="num">{i.qty}</td><td className="num">{sar(i.total, 0)}</td></tr>)}</tbody></table>
        <p className="t-caption muted" style={{ margin: 0 }}>{body.note}</p>
      </div>
    );
  }
  if (body.kind === 'hosting') return (
    <div className="ea-body">
      <div className="pill-line"><span className="t-body-medium">Deployment model: SaaS</span><Tags items={['EA preferred']} tone="strong" /></div>
      <details className="answers"><summary className="t-caption-medium">Requester’s answers about the project</summary>
        <dl className="answers-grid">{body.answers.map(([q, a]) => <div key={q}><dt className="t-caption muted">{q}</dt><dd className="t-body-small">{a}</dd></div>)}</dl>
      </details>
      <ul className="std-list">{body.standards.map((s) => <Standard key={s.text} s={s} />)}</ul>
    </div>
  );
  return <ul className="std-list ea-body">{body.standards.map((s) => <Standard key={s.text} s={s} />)}</ul>;
}

export function EaReview() {
  const { request, review, setGates } = useTask();
  const keys = EA.sections.map((s) => `ea-${s.id}`);
  const done = countDone(keys, review.decisions);
  useEffect(() => { setGates({ approve: done === keys.length ? true : `Review all ${keys.length} sections to approve.` }); }, [done]);
  return (
    <div className="stack">
      <ReviewHeader title="Review the technical sections" desc="Only the sections EA owns. Accept each, or comment for the requester." done={done} total={keys.length} noun="sections reviewed"
        onAll={() => review.set(keys.filter((k) => !review.decisions[k]), { state: 'accepted' })}>
        <p className="t-caption muted why"><Icon name="icon-info" size={14} />Why EA reviews this: {EA.why}</p>
      </ReviewHeader>
      {EA.sections.map((s) => (
        <ReviewRow key={s.id} k={`ea-${s.id}`} title={s.name} anchor={{ id: `ea-${s.id}`, label: s.name }}
          render={() => <div className="t-title rrow-title">{s.name}</div>}>
          <EaBody body={s.body} request={request} />
        </ReviewRow>
      ))}
      <p className="t-caption muted">Outside EA scope — for reference: {EA.outside}</p>
    </div>
  );
}

/* ---------- Qualification criteria ---------- */
export function Qualification() {
  const { request, review, setGates } = useTask();
  const q = request.qualification;
  const rows = q.groups.flatMap((g) => [{ ...g, main: true }, ...g.subs.map((s) => ({ ...s, parent: g.id }))]);
  const keys = rows.map((r) => `q-${r.id}`);
  const done = countDone(keys, review.decisions);
  const w = (r) => Number(review.decisions[`q-${r.id}`]?.value?.weight ?? r.weight);
  const mainTotal = q.groups.reduce((a, g) => a + w(g), 0);
  const subTotals = Object.fromEntries(q.groups.map((g) => [g.id, g.subs.reduce((a, s) => a + w(s), 0)]));
  const allOk = mainTotal === 100 && Object.values(subTotals).every((t) => t === 100);
  useEffect(() => { setGates({ complete: done < keys.length ? `Review all ${keys.length} criteria to complete.` : allOk ? true : 'Weights must total 100% at every level.' }); }, [done, allOk]);
  return (
    <div className="stack">
      <ReviewHeader title="Review the qualification criteria" desc="Prefilled from the request. Accept each criterion, or modify its range and weight. Totals must be 100%." done={done} total={keys.length} noun="criteria reviewed"
        onAll={() => review.set(keys.filter((k) => !review.decisions[k]), { state: 'accepted' })} />
      <Member person={q.member} label="Qualification member" />
      {q.groups.map((g, gi) => (
        <section className="sec" key={g.id}>
          <SectionHead name={`${gi + 1}. ${g.name}`} right={<span className={`t-caption-medium ${subTotals[g.id] === 100 ? 'brand-text' : 'danger-text'}`}>Sub-criteria {subTotals[g.id]}%</span>} />
          {[{ ...g, main: true }, ...g.subs].map((r) => (
            <ReviewRow key={r.id} k={`q-${r.id}`} mode="modify" title={r.name}
              fields={r.main ? [{ key: 'weight', label: 'Main weight', value: r.weight, type: 'number', suffix: '%' }] : [{ key: 'range', label: 'Range', value: r.range }, { key: 'weight', label: 'Weight', value: r.weight, type: 'number', suffix: '%' }]}
              render={(v) => (
                <div className={`crit-row${r.main ? ' main' : ' sub'}`}>
                  <div><div className={r.main ? 't-body-medium rrow-title' : 't-body rrow-title'}>{r.main ? 'Main category weight' : r.name}</div>{!r.main && <div className="t-body-small muted">{v?.range ?? r.range}</div>}</div>
                  <span className="weight">{v?.weight ?? r.weight}%</span>
                </div>
              )} />
          ))}
        </section>
      ))}
      <div className={`total-line${mainTotal === 100 ? '' : ' bad'}`}><span className="t-body-medium">Main criteria total</span><span className="t-body-medium">{mainTotal}%</span></div>
      <p className="t-caption muted" style={{ margin: 0 }}>Qualification passing percentage: {q.passing}%</p>
    </div>
  );
}
