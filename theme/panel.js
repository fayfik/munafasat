// Comments & Process side panel.
// Each page supplies its data in <script type="application/json" id="task-data">.
(() => {
  const data = JSON.parse(document.getElementById('task-data').textContent);
  const panel = document.getElementById('side-panel');
  const railBtns = [...document.querySelectorAll('.util-btn[data-view]')];
  const tabs = { comments: document.getElementById('ptab-comments'), process: document.getElementById('ptab-process') };
  const thread = document.getElementById('thread');
  const summary = document.getElementById('comments-summary');
  const empty = document.getElementById('comments-empty');
  const ta = document.getElementById('composer-input');
  const postBtn = document.getElementById('composer-post');
  const ctxBar = document.getElementById('composer-context');
  const steps = document.getElementById('steps');
  let current = null;            // open view or null
  let context = null;            // { type: 'reply', id, name } | { type: 'anchor', id, label }
  let showAllSteps = false;
  let seq = 100;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => {
    const d = new Date();
    const mon = d.toLocaleString('en-GB', { month: 'short' });
    return `${String(d.getDate()).padStart(2, '0')} ${mon}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const allComments = () => data.comments.flatMap((c) => [c, ...(c.replies || [])]);
  const findComment = (id) => allComments().find((c) => c.id === id);

  /* ---------- Open / close ---------- */
  function open(view) {
    current = view;
    panel.hidden = false;
    tabs[view].click();
    railBtns.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.view === view)));
    history.replaceState(null, '', `#${view}`);
  }
  function close() {
    current = null;
    panel.hidden = true;
    railBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    history.replaceState(null, '', location.pathname + location.search);
  }
  railBtns.forEach((b) => b.addEventListener('click', () => (current === b.dataset.view ? close() : open(b.dataset.view))));
  Object.entries(tabs).forEach(([view, tab]) => tab.addEventListener('click', () => {
    current = view;
    railBtns.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.view === view)));
    history.replaceState(null, '', `#${view}`);
  }));
  document.getElementById('panel-close').addEventListener('click', () => {
    const btn = railBtns.find((b) => b.dataset.view === current);
    close();
    btn?.focus();
  });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const btn = railBtns.find((b) => b.dataset.view === current); close(); btn?.focus(); } });

  /* ---------- Comments ---------- */
  function avatar(a, small) {
    const cls = a.me ? 'me' : a.alt ? 'alt' : '';
    return `<span class="cmt-avatar ${cls}" aria-hidden="true">${esc(a.initials)}</span>`;
  }
  function commentHTML(c, isReply) {
    const mine = c.author.me;
    const chip = c.anchor
      ? `<button class="anchor-chip" type="button" data-goto="${esc(c.anchor.id)}" title="Show in request"><img src="assets/icon-anchor.svg" alt=""><span>${esc(c.anchor.label)}</span></button>`
      : '';
    const actions = isReply ? '' : `<div class="cmt-actions">
        <button class="link-btn" type="button" data-reply="${esc(c.id)}"><img src="assets/icon-reply.svg" alt="">Reply</button>
        ${c.anchor ? (c.resolved
          ? `<span class="resolved-tag t-caption-medium"><img src="assets/icon-check.svg" alt="">Resolved</span><button class="link-btn" type="button" data-resolve="${esc(c.id)}">Reopen</button>`
          : `<button class="link-btn resolve" type="button" data-resolve="${esc(c.id)}">Resolve</button>`) : ''}
      </div>`;
    const replies = !isReply && c.replies?.length
      ? `<ul class="replies">${c.replies.map((r) => `<li>${commentHTML(r, true)}</li>`).join('')}</ul>` : '';
    return `<div class="cmt ${mine ? 'mine' : ''} ${c.resolved ? 'resolved' : ''}" id="cmt-${esc(c.id)}">
      ${avatar(c.author)}
      <div class="cmt-main">
        <div class="cmt-meta"><span class="t-label">${esc(c.author.name)}</span><span class="t-caption muted">${esc(c.author.role ? c.author.role + ' · ' : '')}${esc(c.at)}</span></div>
        ${chip}
        <p class="cmt-text">${esc(c.text)}</p>
        ${actions}${replies}
      </div>
    </div>`;
  }
  function renderComments() {
    const total = allComments().length;
    const openReview = data.comments.filter((c) => c.anchor && !c.resolved).length;
    const reviewTotal = data.comments.filter((c) => c.anchor).length;
    thread.innerHTML = data.comments.map((c) => `<li>${commentHTML(c, false)}</li>`).join('');
    empty.hidden = total > 0;
    thread.hidden = total === 0;
    summary.hidden = total === 0;
    summary.innerHTML = `<span class="t-caption">${total} comment${total === 1 ? '' : 's'}</span>` +
      (reviewTotal ? `<span class="open-count t-caption ${openReview ? 'has-open' : ''}">${openReview ? `${openReview} open` : 'All resolved'}</span>` : '');
    document.querySelectorAll('[data-comment-count]').forEach((el) => { el.textContent = total || ''; });
    // per-field counts in Request details
    document.querySelectorAll('.kv > div[data-anchor]').forEach((f) => {
      const n = data.comments.filter((c) => c.anchor?.id === f.dataset.anchor).length;
      let b = f.querySelector('.field-count');
      if (n && !b) { b = document.createElement('span'); b.className = 'field-count'; f.appendChild(b); }
      if (b) { b.textContent = n; b.hidden = !n; b.setAttribute('aria-label', `${n} comment${n === 1 ? '' : 's'}`); }
    });
  }
  function land(id) {
    const el = document.getElementById(`cmt-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el.classList.add('landed');
    setTimeout(() => el.classList.remove('landed'), 1400);
  }

  thread.addEventListener('click', (e) => {
    const reply = e.target.closest('[data-reply]');
    const resolve = e.target.closest('[data-resolve]');
    const go = e.target.closest('[data-goto]');
    if (reply) { const c = findComment(reply.dataset.reply); setContext({ type: 'reply', id: c.id, name: c.author.name }); }
    if (resolve) { const c = findComment(resolve.dataset.resolve); c.resolved = !c.resolved; renderComments(); land(c.id); }
    if (go) gotoField(go.dataset.goto);
  });

  /* ---------- Composer ---------- */
  function setContext(ctx) {
    context = ctx;
    if (!ctx) { ctxBar.hidden = true; ctxBar.innerHTML = ''; }
    else {
      ctxBar.hidden = false;
      ctxBar.innerHTML = (ctx.type === 'reply'
        ? `<span class="t-caption">Replying to <strong style="font-weight:500;color:var(--ink-primary)">${esc(ctx.name)}</strong></span>`
        : `<span class="t-caption">On</span><span class="anchor-chip"><img src="assets/icon-anchor.svg" alt=""><span>${esc(ctx.label)}</span></span>`) +
        `<button class="x-btn" type="button" aria-label="Cancel"><img src="assets/icon-x.svg" alt=""></button>`;
      ctxBar.querySelector('.x-btn').addEventListener('click', () => { setContext(null); ta.focus(); });
    }
    ta.placeholder = ctx?.type === 'reply' ? 'Write a reply…' : ctx?.type === 'anchor' ? 'Comment on this field…' : 'Add a comment…';
    ta.focus();
  }
  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; };
  const sync = () => { postBtn.disabled = !ta.value.trim(); grow(); };
  ta.addEventListener('input', sync);
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); post(); }
    if (e.key === 'Escape' && context) { e.stopPropagation(); setContext(null); }
  });
  postBtn.addEventListener('click', post);
  function post() {
    const text = ta.value.trim();
    if (!text) return;
    const c = { id: `n${seq++}`, author: data.me, at: now(), text };
    if (context?.type === 'reply') { const parent = findComment(context.id); (parent.replies ||= []).push(c); }
    else { if (context?.type === 'anchor') { c.anchor = { id: context.id, label: context.label }; c.resolved = false; } data.comments.push(c); }
    ta.value = ''; sync(); setContext(null); renderComments(); land(c.id);
  }

  /* ---------- Field anchors in Request details ---------- */
  document.querySelectorAll('.kv > div[data-anchor]').forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'field-comment';
    b.setAttribute('aria-label', `Comment on ${f.dataset.label}`); b.title = 'Comment on this field';
    b.innerHTML = '<img src="assets/icon-comment-add.svg" alt="">';
    b.addEventListener('click', () => { open('comments'); setContext({ type: 'anchor', id: f.dataset.anchor, label: f.dataset.label }); });
    f.appendChild(b);
  });
  function gotoField(id) {
    document.getElementById('tab-details')?.click();
    const f = document.querySelector(`.kv > div[data-anchor="${CSS.escape(id)}"]`);
    if (!f) return;
    f.scrollIntoView({ block: 'center', behavior: 'smooth' });
    f.classList.add('flash');
    setTimeout(() => f.classList.remove('flash'), 1400);
  }

  // Elsewhere on the page: "Reply" on the requester note, etc.
  document.querySelectorAll('[data-open-reply]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    open('comments');
    const c = findComment(a.dataset.openReply);
    setContext({ type: 'reply', id: c.id, name: c.author.name });
  }));
  document.querySelectorAll('[data-open-panel]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(a.dataset.openPanel); }));

  /* ---------- Process ---------- */
  function stepHTML(s) {
    const node = `<div class="step-rail"><span class="step-node">${s.state === 'done' ? '<img src="assets/icon-step-done.svg" alt="">' : ''}</span><span class="step-line"></span></div>`;
    const label = s.state === 'done' ? 'Completed' : s.state === 'current' ? 'Current step' : 'Upcoming';
    let body;
    if (s.group) {
      body = `<div class="step-body">
        <span class="step-group-label">${esc(s.group)}</span>
        <ul class="step-group">${s.items.map((i) => `<li class="${i.state === 'current' ? 'current' : ''}">
          ${i.state === 'current' ? '<span class="eyebrow-label t-count" style="color:var(--brand-800);letter-spacing:.4px;text-transform:uppercase">You are here</span>' : ''}
          <span class="${i.state === 'upcoming' ? 't-body secondary' : 't-body-medium'}">${esc(i.name)}</span>
          <span class="t-caption muted">${esc(i.who)}${i.note ? ` · ${esc(i.note)}` : ''}</span>
        </li>`).join('')}</ul></div>`;
    } else if (s.state === 'current') {
      body = `<div class="step-body"><div class="step-current">
        <span class="eyebrow-label">You are here</span>
        <span class="t-body-medium">${esc(s.name)}</span>
        <span class="t-caption muted">${esc(s.who)}${s.when ? ` · ${esc(s.when)}` : ''}</span>
        ${s.note ? `<span class="t-caption secondary">${esc(s.note)}</span>` : ''}
      </div></div>`;
    } else {
      body = `<div class="step-body">
        <span class="t-body-medium step-name">${esc(s.name)}</span>
        <span class="t-caption muted">${esc(s.who)}${s.when ? ` · ${esc(s.when)}` : ''}</span>
      </div>`;
    }
    return `<li class="step-item ${s.group ? (s.items.some((i) => i.state === 'current') ? 'current' : s.state) : s.state}"><span class="sr-only">${label}: </span>${node}${body}</li>`;
  }
  function renderProcess() {
    const p = data.process;
    document.getElementById('process-step').textContent = p.stepLabel;
    document.getElementById('process-fill').style.width = `${(p.done / p.total) * 100}%`;
    const firstUpcoming = p.steps.findIndex((s, i) => i > p.steps.findIndex((x) => x.state === 'current' || x.items?.some((it) => it.state === 'current')) && (s.state === 'upcoming'));
    const cut = firstUpcoming === -1 ? p.steps.length : firstUpcoming + (p.visibleUpcoming ?? 2);
    const visible = showAllSteps ? p.steps : p.steps.slice(0, cut);
    const hiddenCount = p.steps.slice(cut).reduce((n, s) => n + (s.items ? s.items.length : 1), 0);
    steps.innerHTML = visible.map(stepHTML).join('');
    const more = document.getElementById('steps-more');
    more.hidden = showAllSteps || hiddenCount === 0;
    more.querySelector('span').textContent = `Show ${hiddenCount} more step${hiddenCount === 1 ? '' : 's'}`;
  }
  document.getElementById('steps-more').addEventListener('click', () => { showAllSteps = true; renderProcess(); });

  // Cyber review: picking up the task updates who holds the current step.
  document.addEventListener('task:claimed', () => {
    const walk = (list) => list.forEach((s) => { if (s.items) walk(s.items); if (s.state === 'current') { s.who = `${data.me.name} (you)`; s.note = 'In review'; } });
    walk(data.process.steps);
    renderProcess();
  });

  renderComments();
  renderProcess();
  sync();
  if (location.hash === '#comments' || location.hash === '#process') open(location.hash.slice(1));
})();
