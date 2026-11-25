// Who holds each task, and the team-queue moves: pick up, return to queue,
// assign and reassign. Mirrors design-review-manual's team queue.
import { TASKS } from '../data/tasks.js';
import { ACTORS, actorById, teamOfStep, teamById, membersOf, isLead } from '../data/actors.js';

/** Actor id holding the task, or null while it waits in the team queue. */
export function assigneeOf(task, state) {
  const moved = state.assign?.[task.id];
  const team = teamOfStep(task.step);
  if (!team) return moved?.to || (ACTORS.find((a) => a.steps.includes(task.step))?.id ?? null); // personal steps move only by delegation
  return moved ? moved.to : task.assignee ?? null;
}
/** Tasks this person delegated to a colleague (still theirs to follow). */
export const delegatedBy = (actor, state) => {
  const d = state.delegation?.[actor.id];
  return d ? TASKS.filter((t) => d.tasks.includes(t.id)) : [];
};
/** Colleagues a person can delegate their inbox to: their team, else reviewers in their department. */
export function delegatesFor(actor) {
  const pool = actor.team ? membersOf(actor.team) : ACTORS.filter((a) => a.dept === actor.dept && (a.steps.length || a.team));
  return pool.filter((a) => a.id !== actor.id);
}
export const teamOf = (task) => teamOfStep(task.step);
export const inQueue = (task, state) => !!teamOf(task) && !assigneeOf(task, state);

/** Tasks on this person's own list. */
export const mineFor = (actor, state) => TASKS.filter((t) => assigneeOf(t, state) === actor.id);

/** The team view: the lead sees every open team task; members see what is waiting to be picked up. */
export function teamTasksFor(actor, state) {
  if (!actor.team) return [];
  const lead = isLead(actor);
  return TASKS.filter((t) => teamOf(t)?.id === actor.team && !state.done[t.id] && (lead || !assigneeOf(t, state)));
}
export const queuedFor = (actor, state) => teamTasksFor(actor, state).filter((t) => !assigneeOf(t, state));

/** Open tasks a person holds: work outside the prototype plus what they hold here. */
export const workload = (id, state) => (actorById(id).load || 0) + TASKS.filter((t) => assigneeOf(t, state) === id && !state.done[t.id]).length;

/** Team members, lightest load first. */
export function teamLoad(teamId, state) {
  return membersOf(teamId).map((m) => ({ ...m, open: workload(m.id, state) })).sort((a, b) => a.open - b.open);
}

/** Who to "view as" when a task link is opened: its holder, else the team lead. */
export function openerFor(task, state) {
  return assigneeOf(task, state) || teamById(teamOf(task)?.id)?.lead || ACTORS[0].id;
}

/** Can this person see the task at all? */
export const canSee = (actor, task, state) => assigneeOf(task, state) === actor.id || !!state.delegation?.[actor.id]?.tasks.includes(task.id) || teamTasksFor(actor, state).some((t) => t.id === task.id) || (actor.team && teamOf(task)?.id === actor.team && isLead(actor));

const first = (name) => name.split(' ')[0];
/** The history line for a queue move (also shown in Activity). */
export function moveText(kind, { by, to, from, team }) {
  switch (kind) {
    case 'pickup': return `Picked up from the ${team.name} queue by ${by.name}`;
    case 'release': return `Returned to the ${team.name} queue by ${by.name}`;
    case 'assign': return to.id === by.id ? `Picked up from the ${team.name} queue by ${by.name}` : `Assigned to ${to.name} by ${first(by.name)} (team lead)`;
    case 'reassign': return `Reassigned from ${from.name} to ${to.name} by ${first(by.name)} (team lead)`;
    default: return '';
  }
}
