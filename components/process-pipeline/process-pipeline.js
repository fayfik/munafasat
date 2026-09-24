/*
  Process Pipeline component — the horizontal chevron/arrow stage tracker
  shown on the Request Detail page's Overview tab (below the tabs, above
  the Overview cards).

  renderProcessPipeline({ containerId, stages, currentIndex })
  `stages` = string[] (stage labels, in order). `currentIndex` = the index
  of the stage currently in progress.

  Stages before `currentIndex` are "completed" — rendered as a narrow
  checkmark-only green segment (no label), deliberately compact so the
  full pipeline fits on one row. The stage at `currentIndex` is the wide
  navy "current" segment with its label. Stages after it are plain grey
  "upcoming" segments with their label.
*/

function renderProcessPipeline({ containerId, stages, currentIndex }) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  mount.innerHTML = `
    <div class="pp-track">
      ${stages.map((label, i) => {
        const state = i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'upcoming';
        const content = state === 'completed' ? '<i class="fa-solid fa-check"></i>' : `<span>${label}</span>`;
        return `<div class="pp-segment pp-${state}" title="${label}">${content}</div>`;
      }).join('')}
    </div>
  `;
}
