// Variant A · split view: renders the inbox column from data/tasks.js.
(() => {
  const list = document.getElementById('inbox-list');
  if (!list) return;
  const current = list.dataset.current;
  const tasks = window.MUNAFASAT_TASKS;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const groups = [['today', 'Due within a day'], ['week', 'Later this week']];

  const item = (t) => {
    const tag = t.split ? 'a' : 'div';
    const href = t.split ? ` href="${esc(t.split)}"` : ' title="Not part of this prototype yet"';
    const cur = t.id === current ? ' aria-current="true"' : '';
    return `<${tag} class="inbox-item${t.unread ? ' unread' : ''}${t.split ? '' : ' inert-item'}"${href}${cur}>
      <div class="item-row">
        <span class="dot-slot"><img src="assets/${t.unread ? 'dot-unread' : 'dot-read'}.svg" alt="${t.unread ? 'Unread' : ''}"></span>
        <span class="item-title">${esc(t.id)}: ${esc(t.task)}</span>
        <span class="item-due${t.dueHours <= 24 || t.group === 'today' ? ' soon' : ''}">${esc(t.due)}</span>
      </div>
      <div class="item-meta"><span class="item-project">${esc(t.project)}</span><span class="item-sep">·</span><span class="item-person">${esc(t.requester.name)}</span></div>
    </${tag}>`;
  };

  list.innerHTML = groups.map(([key, label]) => {
    const rows = tasks.filter((t) => t.group === key);
    return `<div class="group-head t-caption"><span>${label}</span><span>${rows.length}</span></div>${rows.map(item).join('')}`;
  }).join('');

  document.querySelectorAll('[data-task-count]').forEach((el) => { el.textContent = tasks.length; });
})();
