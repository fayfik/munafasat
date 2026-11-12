import { useState } from 'react';
import { Icon, Btn } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, TextArea, Input, NumInput, DetailMeter, AiBtn, Dialog } from '../components/FormKit.jsx';
import { Segment } from '../components/ui.jsx';
import { PROJECTS, CATEGORIES, DEPARTMENTS, AI_SCOPE, AI_TERMS, AI_LOCATION } from '../data/newRequest.js';
import { lockedCategories, workflowFor, MIN_WORDS } from '../lib/requestRules.js';

function endDate(start, n, unit) {
  if (!start || !n) return '';
  const d = new Date(start);
  if (unit === 'days') d.setDate(d.getDate() + Number(n)); else if (unit === 'months') d.setMonth(d.getMonth() + Number(n)); else d.setFullYear(d.getFullYear() + Number(n));
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ScopeStep() {
  const { f, set } = useForm();
  const [wf, setWf] = useState(false);
  const p = PROJECTS.find((x) => x.id === f.projectId);
  const names = [...(p?.items.filter((i) => (f.selectedItemIds || []).includes(i.id)).map((i) => i.name) ?? []), ...(f.freeItems || []), ...f.boqItems.map((b) => b.itemName)].filter(Boolean);
  const locked = lockedCategories(names);
  const cats = [...new Set([...locked, ...f.scopeIncludes])];
  const stages = workflowFor(cats);
  const review = stages.filter((s) => ['cyber', 'ea', 'bcm'].includes(s));
  const today = new Date().toISOString().slice(0, 10);
  const past = f.startDate && f.startDate < today;
  const end = endDate(f.startDate, f.contractDuration, f.contractDurationType);

  return (
    <div className="stack">
      <Block title="What does this request include?" info="Picked from your project and items (locked). Add others if they apply — each category adds its reviewers to the approval workflow.">
        <div className="cat-grid" role="group" aria-label="Request categories">
          {CATEGORIES.map((c) => {
            const isLocked = locked.includes(c.id);
            const on = cats.includes(c.id);
            return (
              <button key={c.id} type="button" className={`cat${on ? ' on' : ''}${isLocked ? ' locked' : ''}`} aria-pressed={on} disabled={isLocked}
                title={isLocked ? 'Picked from your items' : undefined}
                onClick={() => set('scopeIncludes', on ? f.scopeIncludes.filter((x) => x !== c.id) : [...f.scopeIncludes, c.id])}>
                <span className="cat-check" aria-hidden="true">{on && <Icon name="icon-check-white" size={11} />}</span>
                <span className="t-body-medium">{c.en}{isLocked && <span className="t-caption muted"> · from your items</span>}</span>
                <span className="t-body-small muted">{c.desc}</span>
              </button>
            );
          })}
        </div>
        <div className="approvers t-body-small">
          <span className="muted">Reviewed by</span>
          <span>{review.length ? review.map((d) => DEPARTMENTS[d].en).join(', ') : 'Line manager, Finance and Procurement only'}</span>
          <button type="button" className="inline-link" onClick={() => setWf(true)}>See the approval workflow</button>
        </div>
      </Block>

      <Block title="Scope of work" info="Describe the full scope, deliverable expectations and technical requirements. Say what is delivered, where, by whom, and what is out of scope." actions={<AiBtn onRun={() => set('scopeOfWork', AI_SCOPE)} />}>
        <FieldBlock id="q-scope">
          <TextArea id="q-scope-input" rows={8} value={f.scopeOfWork} onChange={(e) => set('scopeOfWork', e.target.value)} placeholder="Describe what the vendor will deliver…" aria-label="Scope of work" />
          <DetailMeter text={f.scopeOfWork} min={MIN_WORDS.scope} />
        </FieldBlock>
      </Block>

      <Block title="Scope-specific terms & conditions" info="Terms that apply only to this scope — compliance, hosting, warranty, subcontracting." actions={<AiBtn onRun={() => set('scopeTerms', AI_TERMS)} />}>
        <FieldBlock optional>
          <TextArea rows={5} value={f.scopeTerms} onChange={(e) => set('scopeTerms', e.target.value)} placeholder="Add any terms that apply to this scope…" aria-label="Scope-specific terms and conditions" />
        </FieldBlock>
      </Block>

      <Block title="Contract duration & location">
        <div className="form-grid">
          <FieldBlock label="Where the work happens" wide id="q-location">
            <div className="with-action">
              <TextArea rows={2} value={f.executionLocation} onChange={(e) => set('executionLocation', e.target.value)} placeholder="e.g. Head office — Riyadh" aria-label="Execution location" />
              <AiBtn label="Suggest" onRun={() => set('executionLocation', AI_LOCATION)} delay={600} />
            </div>
          </FieldBlock>
          <FieldBlock label="Start date" id="q-start" error={past ? 'Start date can’t be in the past — pick today or a later date.' : ''}>
            <Input id="q-start-input" type="date" min={today} value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </FieldBlock>
          <FieldBlock label="Duration" id="q-duration" hint={end ? `Ends around ${end}` : 'The end date is worked out for you'}>
            <div className="duration">
              <NumInput value={f.contractDuration} onChange={(v) => set('contractDuration', v === '' ? '' : String(v))} min={1} placeholder="e.g. 18" aria-label="Number of units" />
              <Segment size="sm" label="Duration unit" value={f.contractDurationType} onChange={(v) => set('contractDurationType', v)} items={[{ id: 'days', label: 'Days' }, { id: 'months', label: 'Months' }, { id: 'years', label: 'Years' }]} />
            </div>
          </FieldBlock>
        </div>
      </Block>

      <Dialog open={wf} onClose={() => setWf(false)} title="How this request is approved" sub={`Based on: ${cats.map((c) => CATEGORIES.find((x) => x.id === c).en).join(', ') || 'no categories yet'}`} foot={<Btn variant="primary" onClick={() => setWf(false)}>Got it</Btn>}>
        <ol className="wf">
          {stages.map((s, i) => {
            const par = ['cyber', 'ea', 'bcm'].includes(s);
            const firstPar = par && !['cyber', 'ea', 'bcm'].includes(stages[i - 1]);
            return (
              <li key={s} className={par ? 'par' : ''}>
                {firstPar && review.length > 1 && <div className="t-caption muted wf-par">Parallel review — run at the same time, in any order</div>}
                <span className="num-dot">{i + 1}</span>
                <div><div className="t-body-medium">{DEPARTMENTS[s].en}</div><div className="t-body-small muted">{DEPARTMENTS[s].desc}</div></div>
              </li>
            );
          })}
        </ol>
      </Dialog>
    </div>
  );
}
