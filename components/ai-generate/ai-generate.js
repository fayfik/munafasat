/*
  Shared "Generate with AI" confirm -> apply -> success ribbon -> Undo
  pattern (correction pass, applied app-wide to every existing AI
  touchpoint: Step 1's Business Justification, Step 3's field- and
  section-level AI, BOQ's section-level AI, Payments' section-level AI,
  and Attachments' Technical Documents AI suggestion).

  This intentionally REPLACES the earlier bespoke per-field
  Accept/Reject/Edit review boxes built in those steps — the product
  correction asks for one uniform interaction everywhere: confirm ->
  fill only what's empty (or, for widgets that add rows/chips rather
  than fill fields, add only new ones) -> a ribbon says so -> a single
  Undo button reverts exactly that run.

  TODO: `performApply()` callers below call into each step's own
  scripted/canned generator functions (unchanged) — swap those for real
  model calls later; this component only owns the confirm/ribbon/undo
  UX, not the content generation itself.

  Depends on: components/dialog/dialog.js.
*/

/*
  runAiGenerate({
    confirmMessage: string,
    hasWork: () => boolean,           // is there anything to generate?
    performApply: () => (() => void), // does the work, returns an undo fn
    ribbonMountId: string,            // empty <div> already in the page
    undoMountId: string,              // empty <div> (or a <button> slot) already in the page
    emptyMessage?: string,            // shown instead of the ribbon when hasWork() is false
    emptyState?: 'warning',           // pass 'warning' when the empty-state message is
                                       // blocking rather than just informational (e.g.
                                       // "clear it first") — renders red/orange, not grey.
  })
*/
function runAiGenerate({ confirmMessage, hasWork, performApply, ribbonMountId, undoMountId, emptyMessage, emptyState }) {
  openDialog({
    title: 'Generate with AI',
    bodyHtml: `
      <p style="margin:0 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">${confirmMessage}</p>
      <div style="display:flex; justify-content:flex-end; gap: var(--space-2);">
        <button type="button" class="aig-dialog-no" id="aig-confirm-no" style="height:36px;padding:0 var(--space-4);border-radius:var(--radius-md);border:1px solid var(--border-default);background:var(--surface-card);color:var(--text-primary);font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);cursor:pointer;">No</button>
        <button type="button" class="aig-dialog-yes" id="aig-confirm-yes" style="height:36px;padding:0 var(--space-4);border-radius:var(--radius-md);border:none;background:var(--color-green-600);color:var(--color-neutral-0);font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);cursor:pointer;">Yes</button>
      </div>
    `,
  });

  document.getElementById('aig-confirm-no').addEventListener('click', closeDialog);
  document.getElementById('aig-confirm-yes').addEventListener('click', () => {
    closeDialog();

    if (!hasWork()) {
      showAiRibbon(ribbonMountId, emptyMessage || 'Nothing to update — everything already has a value.', emptyState || false);
      return;
    }

    const undo = performApply();
    showAiRibbon(ribbonMountId, 'Data updated successfully', true);
    showAiUndoButton(undoMountId, () => {
      undo();
      hideAiRibbon(ribbonMountId);
      hideAiUndoButton(undoMountId);
    });
  });
}

/*
  Runs the confirm -> fill-empty-only -> ribbon -> Undo pattern for a whole
  section at once, given `fieldDefs = [{ key, isApplicable(), isEmpty(),
  generate(), apply(value) }]`. Undo restores every touched field back to
  empty (they were empty by definition — only empty fields are ever
  touched, per "never overwrite user-entered values").
*/
function runSectionAiGenerate({ ribbonMountId, undoMountId, fieldDefs, confirmMessage }) {
  runAiGenerate({
    confirmMessage: confirmMessage || 'Would you like AI to fill this section using the information already provided?',
    ribbonMountId,
    undoMountId,
    emptyMessage: 'Nothing to update — this section is already filled in.',
    hasWork: () => fieldDefs.some((f) => f.isApplicable() && f.isEmpty()),
    performApply: () => {
      const eligible = fieldDefs.filter((f) => f.isApplicable() && f.isEmpty());
      eligible.forEach((f) => f.apply(f.generate()));
      return () => eligible.forEach((f) => f.apply(''));
    },
  });
}

/* Same pattern for a single field. */
function runFieldAiGenerate({ ribbonMountId, undoMountId, isEmpty, generate, apply, confirmMessage }) {
  runAiGenerate({
    confirmMessage: confirmMessage || 'Would you like AI to fill this field using the information already provided?',
    ribbonMountId,
    undoMountId,
    emptyMessage: 'Nothing to update — this field already has a value.',
    hasWork: () => isEmpty(),
    performApply: () => {
      apply(generate());
      return () => apply('');
    },
  });
}

// `state`: `true` -> success (green), `'warning'` -> attention-seeking
// (red/orange, for messages that block an action rather than just
// informing), anything else (including plain `false`) -> neutral.
function showAiRibbon(mountId, message, state) {
  const el = document.getElementById(mountId);
  if (!el) return;
  const cls = state === true ? 'success' : state === 'warning' ? 'warning' : 'neutral';
  const icon = cls === 'success' ? 'fa-circle-check' : cls === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
  el.className = `aig-ribbon show ${cls}`;
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
}

function hideAiRibbon(mountId) {
  const el = document.getElementById(mountId);
  if (!el) return;
  el.className = 'aig-ribbon';
  el.innerHTML = '';
}

function showAiUndoButton(mountId, onUndo) {
  const el = document.getElementById(mountId);
  if (!el) return;
  el.className = 'aig-undo-btn show';
  el.innerHTML = `<i class="fa-solid fa-rotate-left"></i><span>Undo changes</span>`;
  el.onclick = onUndo;
}

function hideAiUndoButton(mountId) {
  const el = document.getElementById(mountId);
  if (!el) return;
  el.className = 'aig-undo-btn';
  el.onclick = null;
}
