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

// Right utility rail toggles (panels not designed yet).
document.querySelectorAll('.util-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    document.querySelectorAll('.util-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', String(on));
  });
});
