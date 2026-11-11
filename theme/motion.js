// Subtle motion helpers shared by every page.
// 1. Segmented controls get a white "thumb" that slides to the selected tab.
(() => {
  const segments = document.querySelectorAll('.segment');
  segments.forEach((seg) => {
    const thumb = document.createElement('span');
    thumb.className = 'segment-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    seg.prepend(thumb);
    seg.classList.add('has-thumb');

    const place = (instant) => {
      const sel = seg.querySelector('[role="tab"][aria-selected="true"]');
      if (!sel || !seg.offsetWidth) return;     // hidden (e.g. closed panel) — try again when it shows
      if (instant) thumb.style.transition = 'none';
      thumb.style.width = `${sel.offsetWidth}px`;
      thumb.style.height = `${sel.offsetHeight}px`;
      thumb.style.transform = `translate(${sel.offsetLeft}px, ${sel.offsetTop}px)`;
      thumb.classList.add('ready');
      if (instant) { void thumb.offsetWidth; thumb.style.transition = ''; }
    };

    place(true);
    new MutationObserver(() => place(false)).observe(seg, { subtree: true, attributes: true, attributeFilter: ['aria-selected'], characterData: true, childList: true });
    new ResizeObserver(() => place(true)).observe(seg);
    document.fonts?.ready.then(() => place(true));
  });
})();
