/*
  Searchable Select — single/multi select with in-dropdown search, optional
  two-line custom option rendering, keyboard navigation, and (multi mode) a
  chip row with a "+N…" overflow toggle below the field.

  createSearchableSelect({
    mountId, mode: 'single'|'multi', options: [{ value, label, line2Left, line2Right }],
    selected, placeholder, searchPlaceholder, onChange, maxVisibleChips, showChips
  }) -> { getSelected, setSelected, setOptions, clear }

  `showChips` (multi mode only, default true): set to false when the caller
  wants to render its own unified chip row instead (e.g. Step 5's
  Attachments cards, where predefined + custom + AI-suggested entries all
  need to appear together as one chip collection) — the component still
  tracks selection and fires onChange normally, it just skips its own
  `.sel-chip-row` markup.
*/

function createSearchableSelect({
  mountId,
  mode = 'single',
  options = [],
  selected = mode === 'multi' ? [] : null,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  onChange = () => {},
  maxVisibleChips = 6,
  showChips = true,
}) {
  const mount = document.getElementById(mountId);
  let opts = options;
  let sel = mode === 'multi' ? [...(selected || [])] : selected;
  let query = '';
  let activeIndex = -1;
  let chipsExpanded = false;

  function filteredOptions() {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    return opts.filter((o) => {
      const hay = `${o.label} ${o.line2Left || ''} ${o.line2Right || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function isSelected(value) {
    return mode === 'multi' ? sel.includes(value) : sel === value;
  }

  function triggerLabel() {
    if (mode === 'single') {
      const opt = opts.find((o) => o.value === sel);
      return opt ? opt.label : placeholder;
    }
    return sel.length > 0 ? `${sel.length} selected` : placeholder;
  }

  function render() {
    const isOpen = mount.querySelector('.sel-field')?.classList.contains('open');
    const filtered = filteredOptions();

    mount.innerHTML = `
      <div class="sel-field${isOpen ? ' open' : ''}">
        <div class="sel-trigger" id="${mountId}-trigger">
          <span class="sel-trigger-label${(mode === 'single' && !sel) || (mode === 'multi' && sel.length === 0) ? ' placeholder' : ''}">${triggerLabel()}</span>
          ${(mode === 'single' ? sel : sel.length > 0) ? `<button type="button" class="sel-trigger-clear" id="${mountId}-clear" aria-label="Clear"><i class="fa-solid fa-xmark"></i></button>` : ''}
          <i class="fa-solid fa-chevron-down sel-trigger-caret"></i>
        </div>
        <div class="sel-dropdown" id="${mountId}-dropdown">
          <label class="sel-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="${mountId}-search" placeholder="${searchPlaceholder}" value="${query}">
          </label>
          <div class="sel-options" id="${mountId}-options">
            ${filtered.length === 0 ? `<div class="sel-empty">No matches found.</div>` : filtered.map((o, i) => `
              <div class="sel-option${isSelected(o.value) ? ' selected' : ''}${i === activeIndex ? ' active' : ''}" data-value="${o.value}" data-index="${i}">
                <i class="fa-solid fa-check sel-option-check"></i>
                <div class="sel-option-body">
                  <div class="sel-option-line1">${o.label}</div>
                  ${(o.line2Left || o.line2Right) ? `<div class="sel-option-line2"><span>${o.line2Left || ''}</span><span>${o.line2Right || ''}</span></div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      ${mode === 'multi' && showChips ? `<div class="sel-chip-row" id="${mountId}-chips"></div>` : ''}
    `;

    if (mode === 'multi' && showChips) renderChips();
    wireEvents();
    if (isOpen) document.getElementById(`${mountId}-search`).focus();
  }

  function renderChips() {
    const chipMount = document.getElementById(`${mountId}-chips`);
    if (!chipMount) return;
    const selectedOpts = sel.map((v) => opts.find((o) => o.value === v)).filter(Boolean);
    const visible = chipsExpanded ? selectedOpts : selectedOpts.slice(0, maxVisibleChips);
    const overflowCount = selectedOpts.length - visible.length;

    chipMount.innerHTML = `
      ${visible.map((o) => `
        <span class="sel-chip" data-value="${o.value}">
          ${o.label}
          <i class="fa-solid fa-xmark" data-remove="${o.value}"></i>
        </span>
      `).join('')}
      ${overflowCount > 0 ? `<span class="sel-chip-overflow" id="${mountId}-overflow">+${overflowCount}…</span>` : ''}
    `;

    chipMount.querySelectorAll('[data-remove]').forEach((el) => {
      el.addEventListener('click', () => {
        sel = sel.filter((v) => v !== el.dataset.remove);
        onChange([...sel]);
        render();
      });
    });
    const overflowEl = document.getElementById(`${mountId}-overflow`);
    if (overflowEl) {
      overflowEl.addEventListener('click', () => {
        chipsExpanded = true;
        renderChips();
      });
    }
  }

  function open() {
    mount.querySelector('.sel-field').classList.add('open');
    query = '';
    activeIndex = -1;
    render();
  }

  function close() {
    const field = mount.querySelector('.sel-field');
    if (field) field.classList.remove('open');
    query = '';
    activeIndex = -1;
  }

  function selectValue(value) {
    if (mode === 'multi') {
      sel = sel.includes(value) ? sel.filter((v) => v !== value) : [...sel, value];
      onChange([...sel]);
      render();
      document.getElementById(`${mountId}-search`)?.focus();
    } else {
      sel = value;
      onChange(sel);
      close();
      render();
    }
  }

  function wireEvents() {
    const trigger = document.getElementById(`${mountId}-trigger`);
    const dropdown = document.getElementById(`${mountId}-dropdown`);
    const searchInput = document.getElementById(`${mountId}-search`);
    const clearBtn = document.getElementById(`${mountId}-clear`);

    trigger.addEventListener('click', (e) => {
      if (e.target.closest('.sel-trigger-clear')) return;
      const isOpen = mount.querySelector('.sel-field').classList.contains('open');
      if (isOpen) close(); else open();
      render();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sel = mode === 'multi' ? [] : null;
        onChange(mode === 'multi' ? [] : null);
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        query = e.target.value;
        activeIndex = -1;
        render();
      });

      searchInput.addEventListener('keydown', (e) => {
        const filtered = filteredOptions();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
          render();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeIndex = Math.max(activeIndex - 1, 0);
          render();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (activeIndex >= 0 && filtered[activeIndex]) selectValue(filtered[activeIndex].value);
        } else if (e.key === 'Escape') {
          close();
          render();
        }
      });
    }

    dropdown?.querySelectorAll('.sel-option').forEach((el) => {
      el.addEventListener('click', () => selectValue(el.dataset.value));
    });
  }

  // Every click inside `mount` re-renders (full innerHTML replace), which
  // detaches the original event.target before this same click finishes
  // bubbling to document — so the outside-click check below must never see
  // clicks that originated inside `mount`. Stopping propagation at the
  // stable outer `mount` node (not replaced by render()) fixes that.
  mount.addEventListener('click', (event) => event.stopPropagation());

  document.addEventListener('click', (event) => {
    const field = mount.querySelector('.sel-field');
    if (field && field.classList.contains('open') && !mount.contains(event.target)) {
      close();
      render();
    }
  });

  render();

  return {
    getSelected: () => (mode === 'multi' ? [...sel] : sel),
    setSelected: (v) => { sel = mode === 'multi' ? [...(v || [])] : v; chipsExpanded = false; render(); },
    setOptions: (newOptions) => { opts = newOptions; render(); },
    clear: () => { sel = mode === 'multi' ? [] : null; render(); },
  };
}
