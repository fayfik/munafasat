/*
  Chips component — maps to powerappsui.com "Chips".
  createChipsField(...) renders a multi-select field (dropdown of options,
  selected values shown as removable chips) into a mount element and
  returns a small controller so the caller can read/set selection
  programmatically (used by the filter panel's saved-filter presets).
*/

function createChipsField({ mountId, options, selected = [], placeholder = 'Select…', onChange = () => {} }) {
  const mount = document.getElementById(mountId);
  let state = [...selected];

  function render() {
    mount.innerHTML = `
      <div class="chips-field">
        <div class="chips-field-box" id="${mountId}-box">
          ${state.length === 0 ? `<span class="chips-field-placeholder">${placeholder}</span>` : ''}
          ${state.map((val) => `
            <span class="chip-pill" data-value="${val}">
              ${val}
              <button type="button" class="chip-pill-remove" data-remove="${val}" aria-label="Remove ${val}">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </span>
          `).join('')}
          <i class="fa-solid fa-chevron-down chips-field-caret"></i>
        </div>
        <div class="chips-dropdown" id="${mountId}-dropdown">
          ${options.map((opt) => `
            <label class="chips-dropdown-option">
              <input type="checkbox" value="${opt}" ${state.includes(opt) ? 'checked' : ''}>
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    const box = document.getElementById(`${mountId}-box`);
    const dropdown = document.getElementById(`${mountId}-dropdown`);

    box.addEventListener('click', (event) => {
      if (event.target.closest('.chip-pill-remove')) return;
      dropdown.classList.toggle('open');
    });

    dropdown.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!state.includes(cb.value)) state.push(cb.value);
        } else {
          state = state.filter((v) => v !== cb.value);
        }
        onChange([...state]);
        render();
        document.getElementById(`${mountId}-dropdown`).classList.add('open');
      });
    });

    mount.querySelectorAll('.chip-pill-remove').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const val = btn.dataset.remove;
        state = state.filter((v) => v !== val);
        onChange([...state]);
        render();
      });
    });
  }

  // Checking a checkbox re-renders (full innerHTML replace) while the
  // dropdown should stay open, which detaches the original event.target
  // before this same click bubbles to document — stop it here so the
  // outside-click check below never misreads an inside click as outside.
  mount.addEventListener('click', (event) => event.stopPropagation());

  document.addEventListener('click', (event) => {
    const dropdown = document.getElementById(`${mountId}-dropdown`);
    const box = document.getElementById(`${mountId}-box`);
    if (dropdown && box && !box.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.classList.remove('open');
    }
  });

  render();

  return {
    getSelected: () => [...state],
    setSelected: (vals) => { state = [...vals]; render(); },
  };
}
