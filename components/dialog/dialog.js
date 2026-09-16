/*
  Dialog component — maps to powerappsui.com "Dialog".
  Self-mounting: creates its own overlay/root on first use, so any page
  can call openDialog(...) without adding markup for it.
  App-wide modal rules (Phase 5b): Escape closes, focus moves into the
  panel on open and is trapped there (Tab/Shift+Tab wrap) until closed,
  and focus returns to whatever triggered the dialog afterward.
*/

let dialogLastFocused = null;

const DIALOG_FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function dialogFocusableElements() {
  const panel = document.querySelector('#dialog-root .dialog-panel');
  if (!panel) return [];
  return [...panel.querySelectorAll(DIALOG_FOCUSABLE_SELECTOR)].filter((el) => el.offsetParent !== null);
}

function dialogInitialFocusTarget() {
  // Prefer the first focusable control inside the body (a form field, for
  // most of our dialogs) over the header's close button, so typing/form
  // dialogs don't need an extra Tab before you can start filling them in.
  const body = document.getElementById('dialog-body');
  const bodyFirst = body && [...body.querySelectorAll(DIALOG_FOCUSABLE_SELECTOR)].filter((el) => el.offsetParent !== null)[0];
  return bodyFirst || dialogFocusableElements()[0] || document.querySelector('#dialog-root .dialog-panel');
}

function ensureDialogRoot() {
  let root = document.getElementById('dialog-root');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'dialog-root';
  root.className = 'dialog-overlay';
  root.innerHTML = `
    <div class="dialog-panel" role="dialog" aria-modal="true" tabindex="-1">
      <div class="dialog-header">
        <span class="dialog-title" id="dialog-title"></span>
        <button class="dialog-close-btn" id="dialog-close-btn" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="dialog-body" id="dialog-body"></div>
    </div>
  `;
  document.body.appendChild(root);

  root.addEventListener('click', (event) => {
    if (event.target === root) closeDialog();
  });
  document.getElementById('dialog-close-btn').addEventListener('click', closeDialog);

  document.addEventListener('keydown', (event) => {
    if (!root.classList.contains('open')) return;
    if (event.key === 'Escape') {
      closeDialog();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = dialogFocusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  return root;
}

function openDialog({ title, bodyHtml }) {
  const root = ensureDialogRoot();
  dialogLastFocused = document.activeElement;
  document.getElementById('dialog-title').textContent = title || '';
  document.getElementById('dialog-body').innerHTML = bodyHtml || '';
  root.classList.add('open');

  // Move focus inside the dialog so keyboard/screen-reader users land
  // there, not on whatever was behind it. setTimeout rather than
  // requestAnimationFrame — rAF is throttled/skipped in a backgrounded or
  // non-visible tab (common when driving this via automation), which
  // silently dropped the focus-move entirely.
  setTimeout(() => {
    dialogInitialFocusTarget()?.focus();
  }, 0);
}

function closeDialog() {
  const root = document.getElementById('dialog-root');
  if (root) root.classList.remove('open');
  if (dialogLastFocused && document.body.contains(dialogLastFocused)) {
    dialogLastFocused.focus();
  }
  dialogLastFocused = null;
}
