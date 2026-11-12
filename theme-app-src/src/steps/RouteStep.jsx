import { useRef, useState } from 'react';
import { Icon, Btn } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Select, TextArea, Input, Dialog } from '../components/FormKit.jsx';
import { PROJECTS, ROUTES, ROUTE_MODES, EXPENSE_TYPES, EXAMPLE_ITEMS, BOQ_CATEGORIES } from '../data/newRequest.js';
import { classify, expenseTypeOf, parseItemNames, looksReal, uid } from '../lib/requestRules.js';

const catLabel = (id) => BOQ_CATEGORIES.find((c) => c.id === id)?.en || id;

export function RouteStep() {
  const { f, routeConfirmed, confirmRoute } = useForm();
  const [editing, setEditing] = useState(!routeConfirmed);
  const [projectId, setProjectId] = useState(f.projectId);
  const [itemIds, setItemIds] = useState(f.selectedItemIds || []);
  const [mode, setMode] = useState(f.routeChoice || '');
  const [text, setText] = useState('');
  const [free, setFree] = useState([]);
  const [phase, setPhase] = useState('select'); // select · checking · result · review
  const [checks, setChecks] = useState(0);
  const [verdicts, setVerdicts] = useState([]);
  const [action, setAction] = useState('move');
  const [why, setWhy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(false);
  const [chosen, setChosen] = useState('');
  const fileRef = useRef(null);

  const project = PROJECTS.find((p) => p.id === projectId);
  const items = project?.items ?? [];
  const selected = items.filter((i) => itemIds.includes(i.id));

  if (routeConfirmed && !editing) {
    const p = PROJECTS.find((x) => x.id === f.projectId);
    const n = (f.selectedItemIds || []).length;
    return (
      <div className="stack">
        <div className="route-summary">
          <div>
            <div className="t-caption muted">Route</div>
            <div className="t-heading" style={{ marginTop: 2 }}>{ROUTES[f.sourceType].en}</div>
            <div className="t-body-small muted" style={{ marginTop: 4 }}>{p?.name} · {n} budgeted item{n === 1 ? '' : 's'}</div>
          </div>
          <Btn variant="secondary" icon="icon-pencil" onClick={() => setEditing(true)}>Change</Btn>
        </div>
        {f.movedToDraft && <div className="banner info"><Icon name="icon-info" size={16} /><div className="banner-text t-body-small">{f.movedToDraft.count} item{f.movedToDraft.count === 1 ? ' was' : 's were'} moved to a separate {ROUTES[f.movedToDraft.route].short} draft in My requests.</div></div>}
        {f.routeJustification && <div className="quiet-note"><div className="t-caption muted">Why E-Market items stay in this tender</div><div className="t-body">{f.routeJustification}</div></div>}
        <div className="req-foot inline"><span className="grow" /><Btn variant="primary" onClick={() => confirmRoute({ sourceType: f.sourceType, projectId: f.projectId, itemIds: f.selectedItemIds, choice: f.routeChoice, justification: f.routeJustification, justifiedItems: f.justifiedItems })}>Continue<Icon name="icon-arrow-right" size={16} className="invert" /></Btn></div>
      </div>
    );
  }

  const pick = (id) => { setProjectId(id); setItemIds((PROJECTS.find((p) => p.id === id)?.items ?? []).map((i) => i.id)); setPhase('select'); };
  const toggle = (id) => setItemIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const allOn = items.length > 0 && itemIds.length === items.length;

  const input = () => {
    let fr = free.filter((x) => x.name.trim());
    if (!fr.length && text.trim()) fr = parseItemNames(text).map((n) => ({ id: uid(), name: n }));
    return { fr, all: [...selected.map((i) => ({ id: i.id, name: i.name, type: i.type, projectItemId: i.id })), ...fr.map((x) => ({ id: x.id, name: x.name.trim() }))] };
  };

  const run = () => {
    const { fr, all } = input();
    if (!all.length) return;
    if (fr.length && !fr.some((x) => looksReal(x.name))) { setError('We couldn’t recognise any procurement items in what you typed. Describe what you need to buy — e.g. “20 laptops”, “office cleaning services”.'); return; }
    setError(''); if (fr.length && !free.length) setFree(fr);
    setPhase('checking'); setChecks(0);
    setTimeout(() => setChecks(1), 700); setTimeout(() => setChecks(2), 1400);
    setTimeout(() => {
      const v = all.map(classify);
      setVerdicts(v);
      if (mode === 'help') { setPhase('result'); return; }
      const off = mode === 'tender' ? 'emarket' : 'tendering';
      const flagged = v.filter((x) => x.route === off);
      if (!flagged.length) { confirm(mode === 'tender' ? 'tendering' : 'emarket', v); return; }
      setAction(flagged.length === v.length ? 'justify' : 'move'); setWhy('');
      setPhase('review');
    }, 1900);
  };

  const ids = (vs) => vs.map((x) => x.projectItemId).filter(Boolean);
  const confirm = (route, keep, extra = {}) => confirmRoute({ sourceType: route, projectId, itemIds: ids(keep), freeItems: keep.filter((x) => !x.projectItemId).map((x) => x.name), choice: mode, ...extra });

  const off = mode === 'tender' ? 'emarket' : 'tendering';
  const flagged = verdicts.filter((x) => x.route === off);
  const rest = verdicts.filter((x) => x.route !== off);

  const finishReview = () => {
    if (mode === 'tender') {
      if (action === 'move' && rest.length) confirm('tendering', rest, { movedToDraft: { count: flagged.length, route: 'emarket', names: flagged.map((x) => x.name), ids: ids(flagged) } });
      else confirm('tendering', [...rest, ...flagged], { justification: why.trim(), justifiedItems: flagged.map((x) => x.name) });
    } else if (!rest.length) confirm('tendering', flagged);
    else confirm('emarket', rest, { movedToDraft: { count: flagged.length, route: 'tendering', names: flagged.map((x) => x.name), ids: ids(flagged) } });
  };

  const groups = ['tendering', 'emarket'].map((r) => ({ route: r, items: verdicts.filter((v) => v.route === r) })).filter((g) => g.items.length);
  const chosenRoute = chosen || groups[0]?.route;

  return (
    <div className="stack">
      {phase === 'select' && (
        <>
          <p className="lede t-body muted">Pick your project and the items you need. We’ll route each one the right way — Etimad E-Market or a competitive tender. <button type="button" className="inline-link" onClick={() => setInfo(true)}>How routing works</button></p>

          <FieldBlock label="Project" id="q-project">
            <Select id="q-project-input" value={projectId} onChange={(e) => pick(e.target.value)}>
              <option value="">Select a project…</option>
              {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </Select>
          </FieldBlock>

          {project && (
            <Block title="Budgeted items" info="Items approved in this project’s budget. Untick any you don’t need in this request." meta={`${itemIds.length} of ${items.length} selected`}>
              <div className="pick-list" role="group" aria-label="Budgeted items">
                <label className="pick-row head">
                  <input type="checkbox" className="cbox" checked={allOn} ref={(el) => { if (el) el.indeterminate = itemIds.length > 0 && !allOn; }} onChange={() => setItemIds(allOn ? [] : items.map((i) => i.id))} />
                  <span className="t-caption muted">Item</span><span className="t-caption muted">Expense type</span>
                </label>
                {items.map((i) => (
                  <label key={i.id} className={`pick-row${itemIds.includes(i.id) ? ' on' : ''}`}>
                    <input type="checkbox" className="cbox" checked={itemIds.includes(i.id)} onChange={() => toggle(i.id)} />
                    <span className="pick-name"><span className="t-body">{i.name}</span><span className="t-caption muted" dir="rtl" lang="ar">{i.nameAr}</span></span>
                    <span className="t-body-small muted">{EXPENSE_TYPES[expenseTypeOf(i)]}</span>
                  </label>
                ))}
              </div>
            </Block>
          )}

          {selected.length > 0 && (
            <Block title="How do you want to buy these?" info="Choose the route if you already know it. Not sure? We’ll check each item and suggest one.">
              <div className="mode-grid" role="radiogroup" aria-label="Procurement route">
                {ROUTE_MODES.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className={`mode${mode === m.id ? ' on' : ''}`} onClick={() => { setMode(m.id); setError(''); }}>
                    <span className="mode-radio" aria-hidden="true" />
                    <span className="t-body-medium">{m.en}</span>
                    <span className="t-body-small muted">{m.desc}</span>
                  </button>
                ))}
              </div>
            </Block>
          )}

          {selected.length > 0 && mode === 'help' && (
            <Block title="Anything else to add?" info="List extra things you need — type them, paste a list or attach a file. Each item is checked against Etimad.">
              <TextArea rows={4} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} placeholder={`One item per line, e.g.\n${EXAMPLE_ITEMS}`} aria-label="Items you need" />
              <div className="row-gap">
                <Btn variant="ghost-sm" icon="icon-file" onClick={() => fileRef.current?.click()}>Attach a list</Btn>
                <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv,.txt,.pdf,.docx" onChange={(e) => { if (e.target.files?.[0]) { setText(EXAMPLE_ITEMS); setFree(parseItemNames(EXAMPLE_ITEMS).map((n) => ({ id: uid(), name: n }))); } e.target.value = ''; }} />
                <Btn variant="ghost-sm" disabled={!text.trim()} onClick={() => setFree(parseItemNames(text).map((n) => ({ id: uid(), name: n })))}>Pick out items</Btn>
              </div>
              {free.length > 0 && (
                <ul className="free-list">
                  {free.map((x) => (
                    <li key={x.id}>
                      <Input value={x.name} onChange={(e) => setFree((xs) => xs.map((y) => (y.id === x.id ? { ...y, name: e.target.value } : y)))} aria-label="Item name" />
                      <button type="button" className="icon-btn" aria-label={`Remove ${x.name}`} onClick={() => setFree((xs) => xs.filter((y) => y.id !== x.id))}><Icon name="icon-x" size={16} /></button>
                    </li>
                  ))}
                  <li><button type="button" className="add-row" onClick={() => setFree((xs) => [...xs, { id: uid(), name: '' }])}><Icon name="icon-plus" size={14} />Add item</button></li>
                </ul>
              )}
              {error && <p className="ffield-error t-body-small" role="alert">{error}</p>}
            </Block>
          )}

          <div className="req-foot inline">
            <span className="t-body-small muted">{!projectId ? 'Select a project to continue' : !selected.length ? 'Select at least one item' : !mode ? 'Choose how you want to buy to continue' : ''}</span>
            <span className="grow" />
            <Btn variant="primary" disabled={!selected.length || !mode} onClick={run}>{mode === 'help' ? 'Check the route' : mode === 'emarket' ? 'Continue with E-Market' : 'Continue with tender'}<Icon name="icon-arrow-right" size={16} className="invert" /></Btn>
          </div>
        </>
      )}

      {phase === 'checking' && (
        <div className="checking" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <div className="t-title">Checking your items against Etimad…</div>
          <ul className="check-steps t-body-small">
            {['Reading your items', 'Matching the Etimad catalogue', 'Choosing the route'].map((s, i) => (
              <li key={s} className={checks > i ? 'done' : checks === i ? 'now' : ''}><span className="cs-dot" aria-hidden="true" />{s}</li>
            ))}
          </ul>
        </div>
      )}

      {phase === 'result' && (
        <>
          <p className="lede t-body muted">A request follows one route. Your items split into {groups.length === 1 ? 'one request' : 'two requests'} — continue with one now; the other is saved as a draft.</p>
          <div className="result-groups" role="radiogroup" aria-label="Request to create">
            {groups.map((g) => (
              <button key={g.route} type="button" role="radio" aria-checked={chosenRoute === g.route} className={`result-group${chosenRoute === g.route ? ' on' : ''}`} onClick={() => setChosen(g.route)}>
                <div className="rg-head"><span className="mode-radio" aria-hidden="true" /><span className="t-title">{ROUTES[g.route].en}</span><span className="t-caption muted">{g.items.length} item{g.items.length === 1 ? '' : 's'}</span></div>
                <ul className="rg-items">{g.items.map((v) => <li key={v.id}><span className="t-body">{v.name}</span><span className="t-caption muted">{catLabel(v.boqType)} · {v.reason}</span></li>)}</ul>
              </button>
            ))}
          </div>
          <div className="req-foot inline">
            <Btn variant="ghost" icon="icon-arrow-left" onClick={() => setPhase('select')}>Back to items</Btn><span className="grow" />
            <Btn variant="primary" onClick={() => {
              const g = groups.find((x) => x.route === chosenRoute);
              const other = groups.find((x) => x.route !== chosenRoute);
              confirm(chosenRoute, g.items, other ? { movedToDraft: { count: other.items.length, route: other.route, names: other.items.map((x) => x.name), ids: ids(other.items) } } : {});
            }}>Create this request & continue<Icon name="icon-arrow-right" size={16} className="invert" /></Btn>
          </div>
        </>
      )}

      {phase === 'review' && (
        <>
          {mode === 'tender' ? (
            <>
              <div className="banner"><Icon name="icon-info" size={16} /><div className="banner-text"><div className="t-body-medium">{flagged.length} item{flagged.length === 1 ? ' is' : 's are'} listed on Etimad E-Market</div><div className="t-body-small">Items on E-Market are normally bought there directly. Choose how to handle {flagged.length === 1 ? 'it' : 'them'}.</div></div></div>
              <ul className="flag-list">{flagged.map((v) => <li key={v.id}><span className="t-body">{v.name}</span><span className="tag strong">On E-Market</span></li>)}</ul>
              <div className="choice-stack" role="radiogroup" aria-label="What to do with these items">
                <label className={`choice-row${action === 'move' ? ' on' : ''}${!rest.length ? ' disabled' : ''}`}>
                  <input type="radio" name="flag-action" checked={action === 'move'} disabled={!rest.length} onChange={() => setAction('move')} />
                  <span><span className="t-body-medium">Move them to an E-Market draft</span><span className="t-body-small muted">{rest.length ? 'They’re saved as a separate request in My requests.' : 'Nothing would be left for this tender.'}</span></span>
                </label>
                <label className={`choice-row${action === 'justify' ? ' on' : ''}`}>
                  <input type="radio" name="flag-action" checked={action === 'justify'} onChange={() => setAction('justify')} />
                  <span><span className="t-body-medium">Keep them in this tender</span><span className="t-body-small muted">Explain why they need to be tendered rather than bought on E-Market.</span></span>
                </label>
              </div>
              {action === 'justify' && (
                <FieldBlock label="Justification" required error={why && why.trim().length < 15 ? 'Add a little more detail (at least 15 characters).' : ''}>
                  <TextArea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Needs to be bundled with installation and support under one contract." />
                </FieldBlock>
              )}
            </>
          ) : (
            <>
              <div className="banner"><Icon name="icon-info" size={16} /><div className="banner-text"><div className="t-body-medium">{rest.length ? `${flagged.length} item${flagged.length === 1 ? ' needs' : 's need'} a tender` : 'None of these items are on Etimad E-Market'}</div><div className="t-body-small">{rest.length ? 'They’ll be moved to a separate tender draft. The rest continue as an E-Market purchase.' : 'These items need a competitive tender. Continue as a tender request instead.'}</div></div></div>
              <ul className="flag-list">{flagged.map((v) => <li key={v.id}><span className="t-body">{v.name}</span><span className="tag">Needs a tender</span></li>)}</ul>
              {rest.length > 0 && <><div className="t-caption muted">Continuing on E-Market</div><ul className="flag-list">{rest.map((v) => <li key={v.id}><span className="t-body">{v.name}</span></li>)}</ul></>}
            </>
          )}
          <div className="req-foot inline">
            <Btn variant="ghost" icon="icon-arrow-left" onClick={() => setPhase('select')}>Back to items</Btn><span className="grow" />
            <Btn variant="primary" disabled={mode === 'tender' && action === 'justify' && why.trim().length < 15} onClick={finishReview}>
              {mode === 'tender' ? (action === 'move' ? 'Move to draft & continue' : 'Continue with justification') : rest.length ? 'Move to draft & continue' : 'Continue as a tender'}
              <Icon name="icon-arrow-right" size={16} className="invert" />
            </Btn>
          </div>
        </>
      )}

      <Dialog open={info} onClose={() => setInfo(false)} title="The procurement route" sub="Before you build a request, Munafasat checks how each item can be bought."
        foot={<Btn variant="primary" onClick={() => setInfo(false)}>Got it</Btn>}>
        <dl className="info-list">
          <div><dt className="t-body-medium">Etimad E-Market</dt><dd className="t-body-small muted">Catalogue items bought directly from listed suppliers — fast, no tender needed.</dd></div>
          <div><dt className="t-body-medium">Competitive tender</dt><dd className="t-body-small muted">Items that must be competed — suppliers submit offers on Etimad against your scope and BOQ.</dd></div>
          <div><dt className="t-body-medium">One route per request</dt><dd className="t-body-small muted">If your items span both, we split them so each follows the right process. The other request is saved as a draft.</dd></div>
        </dl>
      </Dialog>
    </div>
  );
}
