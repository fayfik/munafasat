import { useEffect, useState } from 'react';
import { useTask, ReviewHeader, SectionHead, ReviewRow, Banner, countDone, isDone } from '../components/ReviewKit.jsx';
import { Icon, Btn, Segment } from '../components/ui.jsx';
import { GL_LINES, GL_CHANGES, MATERIAL_GROUPS, ASSET_FLAGGED, ASSET_UNFLAGGED } from '../data/content.js';

/* ---------- Finance review — GL ---------- */
function GlCells({ line, v }) {
  const mg = v?.mg ?? `${line.mg} · ${line.mgCode}`;
  const sub = v?.glSub ?? line.glSub;
  return (
    <div className="gl-grid">
      <div className="gl-item">
        <div className="t-body rrow-title"><span className="muted">{line.no}.</span> {line.item}</div>
        <div className="t-caption muted">{line.desc}</div>
        <div className="t-caption muted">{line.qty}</div>
      </div>
      <div><span className="t-caption muted">Purchase type</span><div className="t-body-small">{v?.ptype ?? line.ptype}</div></div>
      <div><span className="t-caption muted">Material group</span><div className="t-body-small">{mg}</div></div>
      <div><span className="t-caption muted">GL main / sub</span><div className="t-body-small">{v?.glMain ?? line.glMain}</div><div className={`t-body-small ${sub ? '' : 'danger-text'}`}>{sub || 'Sub-account missing'}</div></div>
    </div>
  );
}

export function GlReview() {
  const { review, setGates } = useTask();
  const [filter, setFilter] = useState('all');
  const keys = GL_LINES.map((l) => l.key);
  const done = countDone(keys, review.decisions);
  const toCheck = GL_LINES.filter((l) => l.issue);
  useEffect(() => { setGates({ approve: done === keys.length ? true : `Review all ${keys.length} BOQ lines to approve.` }); }, [done]);
  const lines = GL_LINES.filter((l) => (filter === 'all' ? true : filter === 'gl' ? l.glOwns : !!l.issue));
  return (
    <div className="stack">
      <ReviewHeader title="Review the accounting classification" desc="AI classified each line at creation. Accept it, or modify the classification. Lines that disagree come first." done={done} total={keys.length} noun="BOQ items reviewed"
        onAll={() => review.set(keys.filter((k) => !review.decisions[k]), { state: 'accepted' })} />
      <Banner tone="info" icon="icon-clock" title="Assets review in progress">Lama Al-Subaie is reviewing the asset lines; their decisions will appear here.</Banner>
      <section className="sec">
        <SectionHead name="BOQ items — accounting" hint={`${toCheck.length} lines disagree and are highlighted.`}
          right={<Segment size="sm" label="Filter lines" value={filter} onChange={setFilter} items={[{ id: 'all', label: 'All lines', count: GL_LINES.length }, { id: 'gl', label: 'GL owns', count: GL_LINES.filter((l) => l.glOwns).length }, { id: 'check', label: 'To check', count: toCheck.length }]} />} />
        {lines.map((l) => (
          <ReviewRow key={l.key} k={l.key} mode="modify" title={l.item} tone={l.issue ? 'warning' : undefined}
            fields={[
              { key: 'ptype', label: 'Purchase type', value: l.ptype, type: 'select', options: ['Asset', 'Service', 'Service + Asset', 'Consumable', 'Material'] },
              { key: 'mg', label: 'Material group', value: `${l.mg} · ${l.mgCode}`, type: 'select', options: MATERIAL_GROUPS },
              { key: 'glMain', label: 'GL main account', value: l.glMain },
              { key: 'glSub', label: 'GL sub-account', value: l.glSub },
            ]}
            render={(v) => <GlCells line={l} v={v} />}
            readOnlyNote={null}>
            {l.issue && !isDone(review.decisions[l.key]) && <div className="issue t-caption"><Icon name="icon-warn" size={14} />{l.issue}</div>}
          </ReviewRow>
        ))}
      </section>
    </div>
  );
}

/* ---------- GL: request changed after your approval ---------- */
export function GlChanged() {
  const { review, setGates, setActions } = useTask();
  const reopened = !!review.extra.reopened;
  const keys = GL_CHANGES.groups.flatMap((g) => g.items.map((i) => i.key));
  const done = countDone(keys, review.decisions);
  useEffect(() => {
    if (reopened) {
      setActions([{ id: 'return', label: 'Return', variant: 'secondary' }, { id: 'approve', label: 'Approve', variant: 'primary' }]);
      setGates({ approve: done === keys.length ? true : `Review all ${keys.length} changes to approve.` });
    } else {
      setActions(null); setGates({});
    }
  }, [reopened, done]);
  const total = keys.length;
  return (
    <div className="stack">
      {!reopened ? (
        <div className="review-head">
          <div className="review-head-row">
            <div className="review-head-text">
              <h2 className="t-title" style={{ margin: 0 }}>This request changed after you approved it</h2>
              <p className="t-body-small muted" style={{ margin: '2px 0 0' }}>{total} changes since your GL approval on {GL_CHANGES.approvedOn}. Keep your approval, or re-open your review.</p>
            </div>
            <Btn variant="secondary" icon="icon-reopen" onClick={() => review.setExtra({ reopened: true })}>Re-open my review</Btn>
          </div>
          <div className="summary-chips">{GL_CHANGES.groups.map((g) => <span key={g.id} className={`sum-chip ${g.tone}`}>{g.items.length} · {g.name}</span>)}</div>
        </div>
      ) : (
        <ReviewHeader title="Review the changes" desc="Your review is re-opened. Accept each change for the accounting, or modify the classification." done={done} total={total} noun="changes reviewed"
          onAll={() => review.set(keys.filter((k) => !review.decisions[k]), { state: 'accepted' })}>
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { review.setExtra({ reopened: false }); review.clear(keys); }}>Cancel — keep my original approval</button>
        </ReviewHeader>
      )}
      {GL_CHANGES.groups.map((g) => (
        <section className="sec" key={g.id}>
          <SectionHead name={g.name} hint={g.hint} done={reopened ? countDone(g.items.map((i) => i.key), review.decisions) : undefined} total={reopened ? g.items.length : undefined} />
          {g.items.map((c) => {
            const body = (
              <div className="change">
                <div className="t-body rrow-title">{c.line} <span className="t-caption muted">· {c.field}</span></div>
                <div className="diff"><span className="from">{c.from}</span><Icon name="icon-arrow-right" size={14} /><span className="to">{c.to}</span></div>
              </div>
            );
            return reopened
              ? <ReviewRow key={c.key} k={c.key} mode="modify" title={`${c.line} — ${c.field}`} tone={g.tone === 'warning' ? 'warning' : undefined} fields={[{ key: 'note', label: 'Classification to use', value: c.to, wide: true }]} render={() => body} />
              : <div key={c.key} className={`rrow static${g.tone === 'warning' ? ' tone-warning' : ''}`}><div className="rrow-main"><div className="rrow-text">{body}</div></div></div>;
          })}
        </section>
      ))}
    </div>
  );
}

/* ---------- Finance review — Assets ---------- */
function AssetCard({ a, others }) {
  const { review } = useTask();
  const d = review.decisions[a.key];
  const [val, setVal] = useState(() => d?.value || { asset: 'Asset', cap: 'Direct asset', group: 'Separate asset' });
  const confirmed = d?.state === 'confirmed';
  const set = (patch) => setVal({ ...val, ...patch });
  return (
    <div className={`asset-card${confirmed ? ' is-confirmed' : ''}`}>
      <div className="asset-head">
        <div>
          <span className="t-caption muted">BOQ item {a.no}</span>
          <div className="t-body-medium">{a.item}</div>
          <div className="t-caption muted">{a.desc}</div>
        </div>
        <span className="t-body-small" style={{ whiteSpace: 'nowrap' }}>{a.calc.split('= ')[1]}</span>
      </div>
      <div className="t-caption muted">{a.calc} · Purchase type: {a.ptype} · Material group: {a.mg} · Role: {a.role}</div>
      {confirmed ? (
        <div className="asset-result">
          <span className="state-tag ok"><Icon name="icon-check-brand" size={12} />Confirmed</span>
          <span className="t-body-small">{val.asset}{val.asset === 'Asset' ? ` · ${val.cap} · ${val.group}` : ''}</span>
          <button type="button" className="link-btn" onClick={() => review.clear(a.key)}>Change</button>
        </div>
      ) : (
        <div className="asset-form">
          <div className="opt-group"><span className="t-caption muted">Asset / non-asset</span><Segment size="sm" label="Asset or non-asset" value={val.asset} onChange={(v) => set({ asset: v })} items={[{ id: 'Asset', label: 'Asset' }, { id: 'Non-asset', label: 'Non-asset' }]} /></div>
          {val.asset === 'Asset' && (
            <>
              <div className="opt-group"><span className="t-caption muted">Capitalisation</span><Segment size="sm" label="Capitalisation" value={val.cap} onChange={(v) => set({ cap: v })} items={[{ id: 'Direct asset', label: 'Direct asset' }, { id: 'AUC', label: 'AUC' }]} /></div>
              <label className="opt-group"><span className="t-caption muted">Group with…</span>
                <select value={val.group} onChange={(e) => set({ group: e.target.value })}>
                  <option>Separate asset</option>{others.map((o) => <option key={o.key} value={`With item ${o.no}`}>Item {o.no} — {o.item}</option>)}
                </select>
              </label>
            </>
          )}
          <Btn variant="primary-sm" onClick={() => review.set(a.key, { state: 'confirmed', value: val })}>Confirm</Btn>
        </div>
      )}
    </div>
  );
}

export function AssetTreatment() {
  const { review, setGates } = useTask();
  const keys = [...ASSET_FLAGGED, ...ASSET_UNFLAGGED].map((a) => a.key);
  const done = countDone(keys, review.decisions);
  const [showRest, setShowRest] = useState(true);
  useEffect(() => { setGates({ approve: done === keys.length ? true : `Review all ${keys.length} BOQ items to approve.` }); }, [done]);
  const confirmAll = () => {
    ASSET_FLAGGED.filter((a) => !review.decisions[a.key]).forEach((a) => review.set(a.key, { state: 'confirmed', value: { asset: 'Asset', cap: 'Direct asset', group: 'Separate asset' } }));
    review.set(ASSET_UNFLAGGED.filter((a) => !review.decisions[a.key]).map((a) => a.key), { state: 'accepted', value: { asset: 'Non-asset' } });
  };
  return (
    <div className="stack">
      <ReviewHeader title="Decide the asset treatment" desc="Confirm the treatment for lines flagged as assets, then check the rest for any missed asset." done={done} total={keys.length} noun="BOQ items reviewed" allLabel="Confirm all as suggested" onAll={confirmAll} />
      <section className="sec">
        <SectionHead name={`Flagged as assets — ${ASSET_FLAGGED.length} of ${keys.length} BOQ items`} done={countDone(ASSET_FLAGGED.map((a) => a.key), review.decisions)} total={ASSET_FLAGGED.length} />
        <div className="asset-list">{ASSET_FLAGGED.map((a) => <AssetCard key={a.key} a={a} others={ASSET_FLAGGED.filter((o) => o.key !== a.key)} />)}</div>
      </section>
      <section className="sec">
        <SectionHead name={`Not flagged as assets — ${ASSET_UNFLAGGED.length} BOQ items`} hint="Check that none of these should be an asset."
          done={countDone(ASSET_UNFLAGGED.map((a) => a.key), review.decisions)} total={ASSET_UNFLAGGED.length}
          right={<button type="button" className="link-btn" onClick={() => setShowRest(!showRest)}>{showRest ? 'Hide' : 'Show'}</button>} />
        {showRest && ASSET_UNFLAGGED.map((a) => {
          const d = review.decisions[a.key];
          return (
            <div key={a.key} className={`rrow compact${d ? ` is-${d.state}` : ''}`}>
              <div className="rrow-main">
                <div className="rrow-text"><div className="t-body rrow-title"><span className="muted">{a.no}.</span> {a.item}</div><div className="t-caption muted">{a.calc} · {a.mg}</div></div>
                <div className="rrow-actions">
                  {d ? (
                    <><span className={`state-tag ${d.state === 'flagged' ? 'warn' : 'ok'}`}>{d.state === 'flagged' ? 'Flagged as asset' : 'Not an asset'}</span><button type="button" className="link-btn" onClick={() => review.clear(a.key)}>Undo</button></>
                  ) : (
                    <>
                      <button type="button" className="act-btn" onClick={() => review.set(a.key, { state: 'accepted', value: { asset: 'Non-asset' } })}><Icon name="icon-check-brand" size={14} />Not an asset</button>
                      <button type="button" className="act-btn" onClick={() => review.set(a.key, { state: 'flagged', value: { asset: 'Asset' } })}><Icon name="icon-warn" size={14} />Flag as asset</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
