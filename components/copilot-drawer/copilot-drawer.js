/*
  Copilot drawer — self-mounting right-side placeholder drawer.
  openCopilotDrawer() / closeCopilotDrawer(). Real content arrives in Phase 5;
  for now it's just the empty shell, same singleton pattern as dialog.js.
*/

function ensureCopilotDrawerRoot() {
  let root = document.getElementById('copilot-drawer-root');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'copilot-drawer-root';
  root.className = 'copilot-drawer-overlay';
  root.innerHTML = `
    <div class="copilot-drawer-panel" role="dialog" aria-label="Copilot">
      <div class="copilot-drawer-header">
        <span class="copilot-drawer-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Copilot</span>
        <button class="copilot-drawer-close" id="copilot-drawer-close-btn" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="copilot-drawer-body">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <p>Copilot will help you draft this request. Coming soon.</p>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  root.addEventListener('click', (event) => {
    if (event.target === root) closeCopilotDrawer();
  });
  document.getElementById('copilot-drawer-close-btn').addEventListener('click', closeCopilotDrawer);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('open')) closeCopilotDrawer();
  });

  return root;
}

function openCopilotDrawer() {
  ensureCopilotDrawerRoot().classList.add('open');
}

function closeCopilotDrawer() {
  const root = document.getElementById('copilot-drawer-root');
  if (root) root.classList.remove('open');
}
