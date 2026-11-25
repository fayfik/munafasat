import { useState } from 'react';
import { Icon, Btn } from '../components/ui.jsx';
import { useImportPicker } from '../components/ImportPicker.jsx';
import { TECH_REQ_LIBRARY, EVAL_LIBRARY } from '../data/criteriaLibrary.js';
import { useForm, Block, FieldBlock, Input, TextArea, NumInput, AiBtn, TotalBar, ChipList, PeoplePicker, MoreMenu, ConfirmDelete } from '../components/FormKit.jsx';
import { useTouched } from '../components/FormKit.jsx';
import { PEOPLE, MANDATORY_DOCS, AI_TECH_DOCS, AI_TECH_REQ, AI_EVAL } from '../data/newRequest.js';
import { totals, uid } from '../lib/requestRules.js';

export function TechStep() {
  const { f, set, list } = useForm();
  const req = list('technicalRequirements');
  const ev = list('evaluationCriteria');
  const touched = useTouched();
  const [del, setDel] = useState(null);
  const [pick, setPick] = useState(!f.technicalCommitteeMembers.length);
  const t = totals(f);
  const member = f.technicalCommitteeMembers[0];
  const pass = Number(f.technicalPassingPercentage);

  // Import individual rows from past requests (design-review): rows already in the request show as imported.
  const allReq = Object.values(TECH_REQ_LIBRARY).flat();
  const haveReq = new Set(allReq.filter((c) => f.technicalRequirements.some((r) => (r.requirement || '').trim() === c.requirement.trim())).map((c) => c.id));
  const [reqImport, reqBanner, reqPicker] = useImportPicker({
    title: 'Import technical requirements', noun: { one: 'requirement', many: 'requirements' }, existingKeys: haveReq,
    itemsFor: (pid) => (TECH_REQ_LIBRARY[pid] || []).map((r) => ({ key: r.id, title: r.requirement, sub: r.description, addedBy: r.addedBy, addedOn: r.addedOn })),
    onImport: (keys) => {
      const prev = f.technicalRequirements;
      const add = keys.map((k) => allReq.find((c) => c.id === k)).filter(Boolean).map((c) => ({ requirement: c.requirement, description: c.description }));
      set('technicalRequirements', [...prev.filter((r) => (r.requirement || '').trim() || (r.description || '').trim()), ...add.map((r) => ({ id: uid(), ...r }))]);
      return () => set('technicalRequirements', prev);
    },
  });
  const allEval = Object.values(EVAL_LIBRARY).flat();
  const haveEval = new Set(allEval.filter((c) => f.evaluationCriteria.some((r) => (r.description || '').trim() === c.description.trim())).map((c) => c.id));
  const [evImport, evBanner, evPicker] = useImportPicker({
    title: 'Import evaluation criteria', noun: { one: 'criterion', many: 'criteria' }, existingKeys: haveEval,
    itemsFor: (pid) => (EVAL_LIBRARY[pid] || []).map((c) => ({ key: c.id, title: c.description, sub: c.howApplied, badge: `${c.weight}%`, addedBy: c.addedBy, addedOn: c.addedOn })),
    onImport: (keys) => {
      const prev = f.evaluationCriteria;
      const add = keys.map((k) => allEval.find((c) => c.id === k)).filter(Boolean).map((c) => ({ id: uid(), description: c.description, howApplied: c.howApplied, weight: c.weight }));
      set('evaluationCriteria', [...prev.filter((r) => (r.description || '').trim()), ...add]);
      return () => set('evaluationCriteria', prev);
    },
  });
  return (
    <div className="stack">
      {reqPicker}{evPicker}
      <Block title="Technical evaluator" info="The one person who scores technical proposals. People who reviewed RFPs in this project are listed first.">
        {member && !pick ? (
          <div className="member-line">
            <span className="avatar-dot" style={{ width: 36, height: 36, fontSize: 13 }} aria-hidden="true">{member.initials}</span>
            <div className="grow"><div className="t-body-medium">{member.name}</div><div className="t-body-small muted">{member.role} · {member.department}</div></div>
            <Btn variant="secondary-sm" onClick={() => setPick(true)}>Change</Btn>
          </div>
        ) : (
          <>
            <PeoplePicker people={PEOPLE} value={f.technicalCommitteeMembers} single label="technical evaluator" onChange={(v) => { set('technicalCommitteeMembers', v); if (v.length) setPick(false); }} />
            {member && <button type="button" className="inline-link" onClick={() => setPick(false)}>Keep {member.name}</button>}
          </>
        )}
      </Block>

      <Block title="Documents vendors must submit" info="Mandatory documents are locked. Add any others your evaluation needs." actions={<AiBtn label="Suggest documents" onRun={() => set('technicalDocumentsList', [...new Set([...f.technicalDocumentsList, ...AI_TECH_DOCS])])} />}>
        <ChipList items={f.technicalDocumentsList} locked={MANDATORY_DOCS} onChange={(v) => set('technicalDocumentsList', v)} placeholder="Type a document name and press Enter" label="Technical documents" />
      </Block>

      <Block title="Technical requirements" id="q-req" info="What the solution must meet, with acceptance criteria. EA returns requirements that only have a title."
        actions={<>{reqImport}<AiBtn label="Suggest requirements" onRun={() => { req.clear(); req.addMany(AI_TECH_REQ.map((x) => ({ ...x }))); }} />{f.technicalRequirements.length > 0 && <MoreMenu items={[{ label: 'Delete all requirements', danger: true, onClick: () => setDel('req') }]} />}</>}>
        {reqBanner}
        {f.technicalRequirements.length ? (
          <ol className="edit-list">
            {f.technicalRequirements.map((r, i) => (
              <li key={r.id} className="edit-item">
                <span className="edit-num t-caption muted">{i + 1}</span>
                <div className="edit-fields">
                  <Input value={r.requirement} onChange={(e) => req.update(r.id, { requirement: e.target.value })} placeholder="Requirement title…" aria-label={`Requirement ${i + 1} title`} className="strong" />
                  <TextArea rows={2} value={r.description} onChange={(e) => req.update(r.id, { description: e.target.value })} onBlur={touched.leave(`r-${r.id}`)} placeholder="Description and acceptance criteria…" aria-label={`Requirement ${i + 1} description`} />
                  {!String(r.description ?? '').trim() && touched.seen(`r-${r.id}`) && <div className="issue t-caption"><Icon name="icon-warn" size={12} />Add a description and acceptance criteria</div>}
                </div>
                <button type="button" className="icon-btn" aria-label={`Delete requirement ${i + 1}`} onClick={() => req.remove(r.id)}><Icon name="icon-x" size={16} /></button>
              </li>
            ))}
          </ol>
        ) : <p className="empty-line t-body-small muted">No requirements yet.</p>}
        <button type="button" className="add-row" onClick={() => req.add({ requirement: '', description: '' })}><Icon name="icon-plus" size={14} />Add requirement</button>
      </Block>

      <Block title="Evaluation criteria" id="q-eval" info="Weighted criteria the evaluator scores. Weights must total 100%; say how each one is applied."
        actions={<>{evImport}<AiBtn label="Suggest criteria" onRun={() => { ev.clear(); ev.addMany(AI_EVAL.map((x) => ({ ...x }))); }} />{f.evaluationCriteria.length > 0 && <MoreMenu items={[{ label: 'Delete all criteria', danger: true, onClick: () => setDel('eval') }]} />}</>}>
        {evBanner}
        {f.evaluationCriteria.length ? (
          <ol className="edit-list">
            {f.evaluationCriteria.map((r, i) => (
              <li key={r.id} className="edit-item">
                <span className="edit-num t-caption muted">{i + 1}</span>
                <div className="edit-fields">
                  <Input value={r.description} onChange={(e) => ev.update(r.id, { description: e.target.value })} placeholder="Criterion…" aria-label={`Criterion ${i + 1}`} className="strong" />
                  <TextArea rows={2} value={r.howApplied} onChange={(e) => ev.update(r.id, { howApplied: e.target.value })} onBlur={touched.leave(`e-${r.id}`)} placeholder="How it is scored…" aria-label={`How criterion ${i + 1} is scored`} />
                  {!String(r.howApplied ?? '').trim() && touched.seen(`e-${r.id}`) && <div className="issue t-caption"><Icon name="icon-warn" size={12} />Say how it’s scored</div>}
                </div>
                <div className="weight-in"><NumInput value={r.weight} max={100} suffix="%" onChange={(v) => ev.update(r.id, { weight: v })} placeholder="0" aria-label={`Criterion ${i + 1} weight`} /></div>
                <button type="button" className="icon-btn" aria-label={`Delete criterion ${i + 1}`} onClick={() => ev.remove(r.id)}><Icon name="icon-x" size={16} /></button>
              </li>
            ))}
          </ol>
        ) : <p className="empty-line t-body-small muted">No evaluation criteria yet.</p>}
        <button type="button" className="add-row" onClick={() => ev.add({ description: '', howApplied: '', weight: '' })}><Icon name="icon-plus" size={14} />Add criterion</button>
        {f.evaluationCriteria.length > 0 && <TotalBar label="Total weight" value={t.evalPct} />}
      </Block>

      <FieldBlock label="Technical passing score" info="The minimum technical score a proposal needs to go forward." error={pass > 100 ? 'Can’t be more than 100%.' : ''}>
        <div style={{ width: 140 }}><NumInput value={f.technicalPassingPercentage === '' ? '' : pass} max={100} suffix="%" onChange={(v) => set('technicalPassingPercentage', v === '' ? '' : String(v))} placeholder="70" aria-label="Technical passing percentage" /></div>
      </FieldBlock>

      <ConfirmDelete open={!!del} onClose={() => setDel(null)} onConfirm={() => (del === 'req' ? req.clear() : ev.clear())} title={del === 'req' ? 'Delete all requirements?' : 'Delete all criteria?'} />
    </div>
  );
}
