/*
  GuidedCard — reusable "progressive disclosure" pattern for a wizard
  step's own internal sections (distinct from the step-to-step stepper
  rail, which is unaffected by this).

  A step's content is a stack of collapsible cards, one per section:
  - 'active'    — the current, in-progress section. Always expanded,
                  highlighted border, fully interactive.
  - 'locked'    — a not-yet-reachable section. Header only (muted
                  background), body is not rendered at all (not just
                  hidden) so its fields can't be reached or focused
                  before the section ahead of it is done.
  - 'completed' — a finished section. Header shows a checkmark; body is
                  collapsed by default but the header is clickable to
                  re-expand it for review/editing.

  This component is intentionally "dumb": it has no notion of *when* a
  section counts as done — the calling page decides that (e.g. "Section 2
  unlocks once a Budgeted Item is selected in Section 1") and re-calls
  renderGuidedCards() with updated `state`/`expanded` values whenever that
  changes. Expansion of a 'completed' card is likewise owned by the
  caller via `expanded` + the `onToggle` callback, not by this component.

  renderGuidedCards({
    containerId,
    sections: [{ id, title, description?, bodyHtml, state, expanded? }],
    onToggle?: (sectionId) => void,   // called when a 'completed' card's header is clicked
  })
*/

function buildGuidedCardHtml(section) {
  const { id, title, description, bodyHtml, state, expanded } = section;
  const isExpanded = state === 'active' || (state === 'completed' && !!expanded);

  return `
    <div class="guided-card state-${state}${isExpanded ? ' expanded' : ''}" data-guided-card="${id}">
      <div class="guided-card-header" data-guided-header="${id}">
        <div class="guided-card-header-left">
          ${state === 'completed' ? '<i class="fa-solid fa-circle-check guided-card-check"></i>' : ''}
          <div>
            <div class="guided-card-title">${title}</div>
            ${description ? `<div class="guided-card-desc">${description}</div>` : ''}
          </div>
        </div>
        ${state === 'completed' ? '<i class="fa-solid fa-chevron-down guided-card-chevron"></i>' : ''}
      </div>
      ${state === 'locked' ? '' : `<div class="guided-card-body">${isExpanded ? (bodyHtml || '') : ''}</div>`}
    </div>
  `;
}

function renderGuidedCards({ containerId, sections, onToggle }) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  mount.innerHTML = sections.map((s) => buildGuidedCardHtml(s)).join('');

  if (onToggle) {
    sections.filter((s) => s.state === 'completed').forEach((s) => {
      mount.querySelector(`[data-guided-header="${s.id}"]`)?.addEventListener('click', () => onToggle(s.id));
    });
  }
}
