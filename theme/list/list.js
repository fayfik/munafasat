// Variant B · inbox table. Rows come from ../data/tasks.js; decisions made on a
// detail page come back as ?done=REQ-xxxx&action=approved and show a toast.
(() => {
  const TASKS = window.MUNAFASAT_TASKS;
  const LABEL = window.MUNAFASAT_STATUS;
  const D = window.MUNAFASAT_DECISIONS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let rendered = false;
  const state = { view: 'needs', q: '', sort: 'due', dir: 1, types: new Set(), depts: new Set() };
  const statusOf = (t) => D.get(t.id) || t.status;
  const isDone = (t) => !!D.get(t.id);

  const sorters = {
    id: (t) => t.id, task: (t) => t.task, project: (t) => t.project, status: (t) => LABEL[statusOf(t)],
    type: (t) => t.type, department: (t) => t.department, requester: (t) => t.requester.name,
    received: (t) => t.receivedSort, due: (t) => t.dueHours
  };
  const sortNames = { id: 'request no.', task: 'task', project: 'project', status: 'status', type: 'type', department: 'department', requester: 'requester', received: 'received date', due: 'due date' };

  function visible() {
    const q = state.q.trim().toLowerCase();
    return TASKS
      .filter((t) => state.view === 'all' || (state.view === 'done' ? isDone(t) : state.view === 'needs' ? !isDone(t) : false))
      .filter((t) => !state.types.size || state.types.has(t.type))
      .filter((t) => !state.depts.size || state.depts.has(t.department))
      .filter((t) => !q || [t.id, t.task, t.project, t.department, t.requester.name, t.type].join(' ').toLowerCase().includes(q))
      .sort((a, b) => {
        const x = sorters[state.sort](a), y = sorters[state.sort](b);
        return (x > y ? 1 : x < y ? -1 : 0) * state.dir;
      });
  }

  function row(t) {
    const st = statusOf(t);
    const done = isDone(t);
    const open = !!t.page;
    const projectCell = open
      ? `<a class="row-link project-name ellipsis" href="${esc(t.page)}">${esc(t.project)}</a>`
      : `<span class="project-name ellipsis" style="display:block">${esc(t.project)}</span>`;
    return `<tr class="${open ? 'clickable' : 'inert'}${t.unread && !done ? ' unread' : ''}" data-id="${esc(t.id)}"${open ? ` data-href="${esc(t.page)}"` : ''}>
      <td class="cell-dot">${t.unread && !done ? '<img src="../assets/dot-unread.svg" alt="Unread">' : ''}</td>
      <td class="req">${esc(t.id)}</td>
      <td class="wrap"><span class="task-name">${esc(t.task)}</span></td>
      <td>${projectCell}<span class="sub">${esc(t.amount)}</span></td>
      <td><span class="status ${esc(st)}">${esc(LABEL[st])}</span></td>
      <td><span class="type-chip ${t.type === 'Tender' ? 'tender' : 'emarket'}">${esc(t.type)}</span></td>
      <td class="wrap"><span>${esc(t.department)}</span></td>
      <td class="wrap"><span class="person"><span class="avatar" aria-hidden="true">${esc(t.requester.initials)}</span><span>${esc(t.requester.name).replace(/-/g, "\u2011")}</span></span></td>
      <td>${esc(t.received)}</td>
      <td class="${!done && t.dueHours <= 24 ? 'due-soon' : 'muted'}">${done ? '—' : esc(t.due)}</td>
      <td class="chev">${open ? '<img src="../assets/icon-chevron-right.svg" alt="">' : ''}</td>
    </tr>`;
  }

  function render() {
    const list = visible();
    $('rows').innerHTML = list.map(row).join('');
    if (rendered) [...$('rows').children].forEach((tr, i) => { tr.classList.add('row-in'); tr.style.setProperty('--i', Math.min(i, 8)); });
    rendered = true;
    $('task-table').hidden = list.length === 0;
    $('table-empty').hidden = list.length > 0;
    if (!list.length) {
      const filtered = state.q || state.types.size || state.depts.size;
      $('empty-title').textContent = filtered ? 'No tasks match' : state.view === 'done' ? 'Nothing done yet' : 'You’re all caught up';
      $('empty-sub').textContent = filtered ? 'Try a different search or clear the filters.' : state.view === 'done' ? 'Tasks you approve, return or reject show up here.' : 'New tasks will appear here.';
    }
    const needs = TASKS.filter((t) => !isDone(t)).length;
    const done = TASKS.length - needs;
    $('needs-count').textContent = needs;
    $('count-needs').textContent = needs || '';
    $('count-done').textContent = done || '';
    $('showing').textContent = `Showing ${list.length} of ${state.view === 'done' ? done : state.view === 'needs' ? needs : TASKS.length}`;
    $('sorted-by').textContent = `${sortNames[state.sort]}${state.dir === 1 ? '' : ' (descending)'}`;
    document.querySelectorAll('th[data-sort]').forEach((th) => {
      if (th.dataset.sort === state.sort) th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });
  }

  /* Tabs, search, sort */
  document.querySelectorAll('#view-tabs [data-view]').forEach((b) => b.addEventListener('click', () => { if (!b.disabled) { state.view = b.dataset.view; render(); } }));
  $('search').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  document.querySelectorAll('th[data-sort] button').forEach((btn) => btn.addEventListener('click', () => {
    const key = btn.parentElement.dataset.sort;
    if (state.sort === key) state.dir *= -1; else { state.sort = key; state.dir = 1; }
    render();
  }));

  /* Rows */
  $('rows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr || e.target.closest('a')) return;
    if (tr.dataset.href) location.href = tr.dataset.href;
    else toast(`${tr.dataset.id} doesn’t open in this prototype yet — try REQ-4478 or REQ-4433.`);
  });

  /* Filters */
  const pop = $('filter-pop'), fbtn = $('filter-btn');
  const fill = (el, values, set) => {
    values.forEach((v) => {
      const l = document.createElement('label');
      l.innerHTML = `<input type="checkbox" value="${esc(v)}"> ${esc(v)}`;
      l.querySelector('input').addEventListener('change', (e) => { e.target.checked ? set.add(v) : set.delete(v); updateFilterCount(); render(); });
      el.appendChild(l);
    });
  };
  fill($('filter-type'), [...new Set(TASKS.map((t) => t.type))], state.types);
  fill($('filter-dept'), [...new Set(TASKS.map((t) => t.department))].sort(), state.depts);
  const updateFilterCount = () => { const n = state.types.size + state.depts.size; $('filter-count').textContent = n || ''; };
  const setPop = (open) => { pop.hidden = !open; fbtn.setAttribute('aria-expanded', String(open)); };
  fbtn.addEventListener('click', () => setPop(pop.hidden));
  $('filter-done').addEventListener('click', () => { setPop(false); fbtn.focus(); });
  $('filter-clear').addEventListener('click', () => {
    state.types.clear(); state.depts.clear();
    pop.querySelectorAll('input').forEach((i) => { i.checked = false; });
    updateFilterCount(); render();
  });
  document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('.filter-wrap')) setPop(false); });
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setPop(false); fbtn.focus(); } });

  /* Toast */
  let timer;
  function toast(text, undo) {
    $('toast-text').textContent = text;
    const u = $('toast-undo');
    u.hidden = !undo;
    u.onclick = () => { undo(); hide(); };
    $('toast').classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(hide, 6000);
  }
  const hide = () => $('toast').classList.remove('show');

  /* Coming back from a decision */
  const params = new URLSearchParams(location.search);
  const doneId = params.get('done'), action = params.get('action');
  if (doneId && action && TASKS.some((t) => t.id === doneId)) {
    D.set(doneId, action);
    history.replaceState(null, '', location.pathname);
    toast(`${doneId} ${LABEL[action].toLowerCase()}. It’s now under Done.`, () => {
      D.remove(doneId);
      render();
      const tr = document.querySelector(`tr[data-id="${doneId}"]`);
      if (tr) { tr.classList.add('flash'); setTimeout(() => tr.classList.remove('flash'), 1400); }
    });
  }

  render();
})();
