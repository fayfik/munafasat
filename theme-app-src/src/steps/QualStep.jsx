import { useState } from 'react';
import { Icon, Btn } from '../components/ui.jsx';
import { useForm, Block, FieldBlock, Input, NumInput, AiBtn, TotalBar, PeoplePicker } from '../components/FormKit.jsx';
import { PEOPLE, AI_QUAL, RANGE_PLACEHOLDERS } from '../data/newRequest.js';
import { recommendedFor, recText, aboveRange, suggestedRange, priorityName } from '../lib/qualGuide.js';
import { useImportPicker } from '../components/ImportPicker.jsx';
import { QUAL_LIBRARY } from '../data/criteriaLibrary.js';
import { totals, num } from '../lib/requestRules.js';

export function QualStep() {
  const { f, set, goto } = useForm();
  const [pick, setPick] = useState(!f.qualificationCommitteeMembers.length);
  const t = totals(f);
  const pass = Number(f.qualificationPassingPercentage);
  const upd = (mid, fn) => set('qualificationCriteria', (cs) => cs.map((m) => (m.id === mid ? fn(m) : m)));
  const updSub = (mid, sid, p) => upd(mid, (m) => ({ ...m, subCriteria: m.subCriteria.map((s) => (s.id === sid ? { ...s, ...p } : s)) }));
  const suggest = () => set('qualificationCriteria', (cs) => cs.map((m) => { const a = AI_QUAL[m.id]; return a ? { ...m, percentage: a.percentage, subCriteria: m.subCriteria.map((s) => (a.sub[s.id] ? { ...s, range: suggestedRange(s.id, f) || a.sub[s.id][0], percentage: a.sub[s.id][1] } : s)) } : m; }));
  const members = f.qualificationCommitteeMembers;
  const flags = new Map(aboveRange(f).map((x) => [x.subId, x]));
  const unjustified = [...flags.values()].filter((x) => !x.justified).length;
  const setJust = (sid, v) => set('qualJustifications', (j) => ({ ...(j || {}), [sid]: v }));
  // Import a criterion's ranges and weights from past requests; one source per criterion (the last pick wins).
  const allQual = Object.values(QUAL_LIBRARY).flat();
  const [qImport, qBanner, qPicker] = useImportPicker({
    title: 'Import qualification values', noun: { one: 'criterion', many: 'criteria' },
    itemsFor: (pid) => (QUAL_LIBRARY[pid] || []).map((m) => ({ key: m.id, title: m.name, sub: m.subCriteria.map((x) => `${x.name}: ${x.range} (${x.percentage}%)`).join(' · '), badge: `${m.percentage}%`, addedBy: m.addedBy, addedOn: m.addedOn })),
    onImport: (keys) => {
      const prev = f.qualificationCriteria;
      const by = new Map(); keys.forEach((k) => { const m = allQual.find((x) => x.id === k); if (m) by.set(m.fixedId, m); });
      set('qualificationCriteria', prev.map((c) => { const src = by.get(c.id); return src ? { ...c, percentage: src.percentage, subCriteria: c.subCriteria.map((x) => { const v = src.subCriteria.find((y) => y.id === x.id); return v ? { ...x, range: v.range, percentage: v.percentage } : x; }) } : c; }));
      return () => set('qualificationCriteria', prev);
    },
  });

  return (
    <div className="stack">
      {qPicker}
      <Block title="Qualification reviewer" info="The one person who checks vendors against the criteria below.">
        {members.length > 0 && !pick ? (
          <div className="member-stack">
            <div className="member-line">
              <span className="avatar-dot" style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden="true">{members[0].initials}</span>
              <div className="grow"><div className="t-body-medium">{members[0].name}</div><div className="t-body-small muted">{members[0].role} · {members[0].department}</div></div>
              <Btn variant="secondary-sm" onClick={() => setPick(true)}>Change</Btn>
            </div>
          </div>
        ) : (
          <PeoplePicker single people={PEOPLE} value={members.slice(0, 1)} label="qualification reviewer" onChange={(v) => { set('qualificationCommitteeMembers', v); if (v.length) setPick(false); }} />
        )}
      </Block>

      <Block title="Qualification criteria" info="The criteria are fixed across Munafasat; you set the range and weight. Main criteria must total 100%, and so must each group of sub-criteria." actions={<>{qImport}<AiBtn label="Suggest values" onRun={suggest} /></>}>
        {qBanner}
        <div className="qual-basis">
          {flags.size === 0
            ? <span className="ok-chip t-caption-medium" data-sme="open"><Icon name="icon-check" size={13} />Open to SMEs</span>
            : <span className="ok-chip warn t-caption-medium" data-sme="restricted"><Icon name="icon-alert" size={13} />May exclude SMEs — {flags.size} above range</span>}
          {f.projectPriority
            ? <span className="t-body-small muted">Recommended ranges for <strong className="ink">{priorityName(f.projectPriority)} priority</strong></span>
            : <span className="t-body-small amber-text">Set the project priority to see recommended ranges. <button type="button" className="inline-link" onClick={() => goto('setup')}>Go to Project setup</button></span>}
        </div>
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
                {m.subCriteria.map((s) => {
                  const rec = recommendedFor(s.id, f); const fl = flags.get(s.id); const sg = suggestedRange(s.id, f);
                  return (
                    <div key={s.id} className={`qual-sub-wrap${fl ? ' above' : ''}`} data-qual-sub={s.id}>
                      <div className="qual-sub">
                        <span className="grow"><span className="t-body">{s.name}</span>{s.hint && <span className="t-caption muted qual-hint">{s.hint}</span>}</span>
                        <Input value={s.range} onChange={(e) => updSub(m.id, s.id, { range: e.target.value })} placeholder={sg ? `e.g. ${sg}` : RANGE_PLACEHOLDERS[s.id] || 'Range'} aria-label={`${s.name} range`} className="range-in" />
                        <span className={`qual-rec t-caption${fl ? ' amber-text' : ' muted'}`} title="Recommended for this project's priority">{rec ? <>{recText(rec)}{fl && ' · above'}</> : '—'}</span>
                        <div className="weight-in"><NumInput value={s.percentage} max={100} suffix="%" onChange={(v) => updSub(m.id, s.id, { percentage: v })} placeholder="0" aria-label={`${s.name} weight`} /></div>
                      </div>
                      {fl && (
                        <label className="qual-justify fade-in">
                          <span className="t-caption-medium">Why is a higher threshold needed?</span>
                          <Input value={f.qualJustifications?.[s.id] || ''} onChange={(e) => setJust(s.id, e.target.value)} placeholder="One line, e.g. “Core banking migration — needs proven scale”" aria-label={`Why ${s.name} is above the recommended range`} className={fl.justified ? '' : 'needs'} />
                        </label>
                      )}
                    </div>
                  );
                })}
                <div className={`qual-subtotal t-caption${sub === 100 ? ' ok' : sub > 0 ? ' warn' : ''}`}>Sub-criteria total {sub}%{sub !== 100 && ' · must equal 100%'}</div>
              </div>
            );
          })}
        </div>
        {unjustified > 0 && <p className="t-body-small amber-text" style={{ margin: 0 }}>{unjustified === 1 ? '1 criterion is' : `${unjustified} criteria are`} above the recommended range without a reason. Add one line each, or lower the threshold so SMEs can compete.</p>}
        <TotalBar label="Main criteria total" value={t.qualPct} />
      </Block>

      <FieldBlock label="Qualification passing score" info="Minimum score out of 100% a vendor must reach to qualify. Default 60%." error={pass > 100 ? 'Can’t be more than 100%.' : ''}>
        <div style={{ width: 140 }}><NumInput value={f.qualificationPassingPercentage === '' ? '' : pass} max={100} suffix="%" onChange={(v) => set('qualificationPassingPercentage', v === '' ? '' : String(v))} placeholder="60" aria-label="Qualification passing percentage" /></div>
      </FieldBlock>
    </div>
  );
}
