import { useState } from 'react';
import { Icon, Btn } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Input, NumInput, AiBtn, TotalBar, PeoplePicker } from '../components/FormKit.jsx';
import { PEOPLE, AI_QUAL } from '../data/newRequest.js';
import { totals, num } from '../lib/requestRules.js';

export function QualStep() {
  const { f, set } = useForm();
  const [pick, setPick] = useState(!f.qualificationCommitteeMembers.length);
  const t = totals(f);
  const pass = Number(f.qualificationPassingPercentage);
  const upd = (mid, fn) => set('qualificationCriteria', (cs) => cs.map((m) => (m.id === mid ? fn(m) : m)));
  const updSub = (mid, sid, p) => upd(mid, (m) => ({ ...m, subCriteria: m.subCriteria.map((s) => (s.id === sid ? { ...s, ...p } : s)) }));
  const suggest = () => set('qualificationCriteria', (cs) => cs.map((m) => { const a = AI_QUAL[m.id]; return a ? { ...m, percentage: a.percentage, subCriteria: m.subCriteria.map((s) => (a.sub[s.id] ? { ...s, range: a.sub[s.id][0], percentage: a.sub[s.id][1] } : s)) } : m; }));
  const members = f.qualificationCommitteeMembers;

  return (
    <div className="stack">
      <Block title="Qualification reviewers" info="People who check vendors against the criteria below." meta={members.length ? `${members.length} selected` : undefined}>
        {members.length > 0 && !pick ? (
          <div className="member-stack">
            {members.map((m) => (
              <div key={m.id} className="member-line">
                <span className="avatar-dot" style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden="true">{m.initials}</span>
                <div className="grow"><div className="t-body-medium">{m.name}</div><div className="t-body-small muted">{m.role} · {m.department}</div></div>
                <button type="button" className="icon-btn" aria-label={`Remove ${m.name}`} onClick={() => set('qualificationCommitteeMembers', members.filter((x) => x.id !== m.id))}><Icon name="icon-x" size={16} /></button>
              </div>
            ))}
            <button type="button" className="add-row" onClick={() => setPick(true)}><Icon name="icon-plus" size={14} />Add reviewer</button>
          </div>
        ) : (
          <>
            <PeoplePicker people={PEOPLE} value={members} label="qualification reviewers" onChange={(v) => set('qualificationCommitteeMembers', v)} />
            {members.length > 0 && <Btn variant="secondary-sm" onClick={() => setPick(false)}>Done</Btn>}
          </>
        )}
      </Block>

      <Block title="Qualification criteria" info="The criteria are fixed across Munafasat; you set the range and weight. Main criteria must total 100%, and so must each group of sub-criteria." actions={<AiBtn label="Suggest values" onRun={suggest} />}>
        <div className="qual">
          {f.qualificationCriteria.map((m) => {
            const sub = m.subCriteria.reduce((s, c) => s + num(c.percentage), 0);
            return (
              <div key={m.id} className="qual-group">
                <div className="qual-main">
                  <span className="t-body-medium grow">{m.name}</span>
                  <span className="t-caption muted">Weight</span>
                  <div className="weight-in"><NumInput value={m.percentage} max={100} suffix="%" onChange={(v) => upd(m.id, (x) => ({ ...x, percentage: v }))} placeholder="0" aria-label={`${m.name} weight`} /></div>
                </div>
                {m.subCriteria.map((s) => (
                  <div key={s.id} className="qual-sub">
                    <span className="t-body grow">{s.name}</span>
                    <Input value={s.range} onChange={(e) => updSub(m.id, s.id, { range: e.target.value })} placeholder="Range, e.g. 5+ years" aria-label={`${s.name} range`} className="range-in" />
                    <div className="weight-in"><NumInput value={s.percentage} max={100} suffix="%" onChange={(v) => updSub(m.id, s.id, { percentage: v })} placeholder="0" aria-label={`${s.name} weight`} /></div>
                  </div>
                ))}
                <div className={`qual-subtotal t-caption${sub === 100 ? ' ok' : sub > 0 ? ' warn' : ''}`}>Sub-criteria total {sub}%{sub !== 100 && ' · must equal 100%'}</div>
              </div>
            );
          })}
        </div>
        <TotalBar label="Main criteria total" value={t.qualPct} />
      </Block>

      <FieldBlock label="Qualification passing score" info="Minimum score out of 100% a vendor must reach to qualify." error={pass > 100 ? 'Can’t be more than 100%.' : ''}>
        <div style={{ width: 140 }}><NumInput value={f.qualificationPassingPercentage === '' ? '' : pass} max={100} suffix="%" onChange={(v) => set('qualificationPassingPercentage', v === '' ? '' : String(v))} placeholder="60" aria-label="Qualification passing percentage" /></div>
      </FieldBlock>
    </div>
  );
}
