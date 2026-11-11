// Shared behaviour for the Munafasat inbox pages.

// Segmented tabs: any [role="tablist"] whose tabs carry aria-controls switch panels;
// tabs without aria-controls (the inbox filters) just move the selection.
document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = t.getAttribute('aria-controls') && document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  };
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => { if (!tab.disabled) select(tab); });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const enabled = tabs.filter((t) => !t.disabled);
      const i = enabled.indexOf(tab);
      const next = enabled[(i + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
      next.focus();
      select(next);
    });
  });
});

// "Open request" jumps to the Request details tab.
document.querySelectorAll('[data-open-tab]').forEach((btn) => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.openTab)?.click());
});

// A/B switch for reviewing the two variants. Add ?test=1 to any page to hide it
// for the rest of the session (use for participants); ?test=0 brings it back.
(() => {
  const body = document.body;
  if (!body.dataset.variant) return;
  const p = new URLSearchParams(location.search);
  try {
    if (p.get('test') === '1') sessionStorage.setItem('munafasat-test', '1');
    if (p.get('test') === '0') sessionStorage.removeItem('munafasat-test');
    if (sessionStorage.getItem('munafasat-test') === '1') return;
  } catch (e) { if (p.get('test') === '1') return; }
  const root = body.dataset.root || '';
  const v = body.dataset.variant;
  const nav = document.createElement('nav');
  nav.className = 'ab-switch';
  nav.setAttribute('aria-label', 'Prototype variant');
  nav.innerHTML = `<span>Variant</span>
    <a href="${root}index.html"${v === 'a' ? ' aria-current="page"' : ''}>A · Split</a>
    <a href="${root}list/index.html"${v === 'b' ? ' aria-current="page"' : ''}>B · List</a>`;
  body.appendChild(nav);
})();
