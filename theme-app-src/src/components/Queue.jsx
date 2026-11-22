// Team queue controls on a task: pick up, return to queue, assign / reassign (team lead).
import { useState } from 'react';
import { Icon, Btn } from './ui.jsx';
import { Dialog } from './FormKit.jsx';
import { useStore } from '../state/store.jsx';
import { useActor } from '../state/actor.jsx';
import { actorById, isLead } from '../data/actors.js';
import { assigneeOf, teamOf, teamLoad, moveText } from '../lib/assign.js';

/** Everything the task page needs to know about who holds the task. */
export function useQueue(task) {
  const { state, dispatch } = useStore();
  const { actor } = useActor();
  const team = teamOf(task);
  const holder = assigneeOf(task, state);
  const lead = !!team && isLead(actor) && actor.team === team.id;
  const move = (to, kind, from) => dispatch({ type: 'assign', task: task.id, to, text: moveText(kind, { by: actor, to: to ? actorById(to) : null, from: from ? actorById(from) : null, team }) });
  return {
    team, holder, lead,
    mine: holder === actor.id,
    queued: !!team && !holder,
    last: state.assign[task.id],
    pickUp: () => move(actor.id, 'pickup'),
    release: () => move(null, 'release'),
    assign: (to) => move(to, holder ? 'reassign' : 'assign', holder),
  };
}

/** Status line under the task header. */
export function QueueBar({ q, onAssign }) {
  if (!q.team) return null;
  const holder = q.holder && actorById(q.holder);
  if (q.queued) {
    return (
      <div className="queue-bar waiting" data-queue-bar="queued" role="status">
        <span className="q-icon" aria-hidden="true"><Icon name="icon-inbox" size={16} /></span>
        <div className="grow">
          <div className="t-body-medium">Waiting in the {q.team.name} queue</div>
          <div className="t-body-small muted">{q.lead ? 'Assign it to a member, or pick it up yourself.' : 'Nobody has picked this up yet. Pick it up to start your review — it moves to My tasks.'}{q.last?.history?.length ? ` · ${q.last.history.at(-1).text}` : ''}</div>
        </div>
      </div>
    );
  }
  if (!q.mine) {
    return (
      <div className="queue-bar held" data-queue-bar="held" role="status">
        <span className="avatar-dot" aria-hidden="true">{holder.initials}</span>
        <div className="grow">
          <div className="t-body-medium">With {holder.name}</div>
          <div className="t-body-small muted">{q.last?.history?.length ? q.last.history.at(-1).text : `${q.team.name} team · ${holder.role}`}. You can see it because you lead the team.</div>
        </div>
        {q.lead && <Btn variant="secondary-sm" onClick={onAssign}>Reassign</Btn>}
      </div>
    );
  }
  return (
    <div className="queue-bar mine" data-queue-bar="mine">
      <span className="t-body-small muted">{q.team.name} team{q.last?.history?.length ? ` · ${q.last.history.at(-1).text}` : ' · assigned to you'}</span>
      <span className="grow" />
      {q.lead && <button type="button" className="link-btn t-body-small" onClick={onAssign}>Reassign</button>}
      <button type="button" className="link-btn t-body-small" onClick={q.release} data-release>Return to queue</button>
    </div>
  );
}

/** Team lead: pick a member, lightest load first. */
export function AssignDialog({ q, open, onClose, onDone }) {
  const { state } = useStore();
  const { actor } = useActor();
  const list = q.team ? teamLoad(q.team.id, state) : [];
  const lightest = list.find((m) => m.id !== q.holder)?.id;
  const [pick, setPick] = useState(null);
  const choice = pick || lightest;
  const re = !!q.holder;
  return (
    <Dialog open={open} onClose={onClose} title={re ? 'Reassign task' : 'Assign task'} sub={`${q.team?.name} team · the task moves to their inbox. History stays on the request.`}
      foot={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!choice} onClick={() => { q.assign(choice); onDone?.(choice); onClose(); }}>{re ? 'Reassign' : 'Assign'}</Btn></>}>
      <div className="assign-list" role="radiogroup" aria-label="Team member">
        {list.map((m) => (
          <label key={m.id} className={`assign-row${choice === m.id ? ' on' : ''}${m.id === q.holder ? ' is-holder' : ''}`}>
            <input type="radio" name="assignee" checked={choice === m.id} disabled={m.id === q.holder} onChange={() => setPick(m.id)} />
            <span className="avatar-dot" aria-hidden="true">{m.initials}</span>
            <span className="grow">
              <span className="t-body-medium" style={{ display: 'block' }}>{m.name}{m.id === actor.id && ' (you)'}</span>
              <span className="t-caption muted">{m.id === q.holder ? 'Holds it now' : m.role}</span>
            </span>
            <span className="load-bar"><span className={m.open >= 6 ? 'busy' : ''} style={{ width: `${Math.min(100, m.open * 14)}%` }} /></span>
            <span className="t-caption muted" style={{ width: 52, textAlign: 'right' }}>{m.open} open</span>
            <span className="tag-slot">{m.id === lightest && <span className="lightest">Lightest</span>}</span>
          </label>
        ))}
      </div>
    </Dialog>
  );
}
