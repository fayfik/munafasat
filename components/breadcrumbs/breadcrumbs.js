/*
  Breadcrumbs component — maps to powerappsui.com "Breadcrumbs".
  renderBreadcrumbs(containerId, trail) — trail is [{ label, href? }],
  the last entry (no href) renders as the current page.
*/

function renderBreadcrumbs(containerId, trail) {
  const mount = document.getElementById(containerId);
  if (!mount) return;

  mount.innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      ${trail.map((item, i) => {
        const isLast = i === trail.length - 1;
        const sep = i > 0 ? `<i class="fa-solid fa-chevron-right breadcrumb-sep"></i>` : '';
        const content = isLast || !item.href
          ? `<span class="breadcrumb-current">${item.label}</span>`
          : `<a href="${item.href}">${item.label}</a>`;
        return `${sep}${content}`;
      }).join('')}
    </nav>
  `;
}
