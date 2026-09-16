# Component mapping — Munafasat prototype → PowerApps UI library

Reference: https://www.powerappsui.com/components

This maps every reusable piece in `components/` (and a few structural patterns
used in `pages/`) to its PowerApps Canvas equivalent, so the PowerApps team
can swap in the real YAML component without re-deriving the UI from scratch.

| Our component | File | PowerApps UI component | Notes |
|---|---|---|---|
| Sidebar | `components/sidebar/sidebar.js` + `.css` | **Sidebar** (Side navigation - Customisable) | Collapsed = icon rail (64px), expanded = 240px with labels. Active-state left accent bar + tinted background matches the reference screenshot (`assets/reference/Side navigation - Customisable-with content.png`). Tooltips only render while collapsed. |
| Notification badge / status pill | `components/badge/badge.js` + `.css` | **Badge** | `badge-anchor` + `badge` = numeric count badge (used on the header bell). `badge-status` variants (`badge-status-draft`, `-submitted`, `-under-review`, `-active`, `-awarded`) are the same primitive, styled for RFP status pills — reuse these directly in the future My Requests table. |
| App header | `components/header/header.js` + `.css` | Composed from **Icon Button**, **Avatar**, **Dropdown Menu**, and **Badge** | Not a single listed component — build as a PowerApps container combining those four. Logo image uses a CSS `brightness(0) invert(1)` filter to render white on the green gradient; in PowerApps, use a white/reversed logo asset instead of a filter. |
| Coming-soon / empty state | `.placeholder-state` in `styles/app-shell.css`, used in `pages/inbox.html`, `pages/reports.html` | Pattern for **Loading Screen/Overlay**'s companion empty-state slot | Illustration + heading + supporting text, centered. Illustrations sourced from `assets/state illustrations/` (Inbox → "Inbox" illustration, Reports → "Statistical files" illustration). |
| Create (+) dropdown, user avatar dropdown | inline markup in `components/header/header.js`, styled via `.app-header-dropdown` / `.app-header-menu` in `header.css` | **Dropdown Menu** | Click-to-toggle, closes on outside click. Menu items map to PowerApps Dropdown Menu item slots. |
| KPI card + drill-down row | `components/kpi-card/kpi-card.js` + `.css` | **KPI Cards** | Renders the Procurement Snapshot row and a single shared drill-down panel beneath it (only one card open at a time). Each card's filtered row list reuses the Table component. |
| Requests by Status chart | `components/donut-chart/donut-chart.js` + `.css` | **Pie Chart** | Rendered as a CSS `conic-gradient` ring (no SVG/chart library) with a separate legend list. Segment clicks are resolved by converting the click point to an angle in JS and matching it to the slice's cumulative percentage range — a PowerApps Pie Chart's native click/select event replaces this entirely. |
| Data table | `components/table/table.js` + `.css` | **Table** | Pure `buildTableHtml({ columns, rows })` renderer, not self-mounting — reused as-is for My Recent 10 Requests, the status drill-down dialog, and each KPI drill-down panel, each with its own column set. |
| Modal / drill-down dialog | `components/dialog/dialog.js` + `.css` | **Dialog** | Self-mounting singleton (`openDialog({ title, bodyHtml })` / `closeDialog()`); creates `#dialog-root` on first use so any page can call it without extra markup. |
| Recent Activity feed | `components/activity-timeline/activity-timeline.js` + `.css` | **Activity Timeline** | Vertical list with a connector line between items and a per-action-type icon (approved/submitted/comment/awarded/status-change/vendor-update/published). Reads `mock-data/activity.json`. |
| Multi-select chips field | `components/chips/chips.js` + `.css` | **Chips** | `createChipsField({ mountId, options, selected, onChange })` — a bordered field showing selected values as removable pills plus a checkbox dropdown to add more. Returns a `{ getSelected, setSelected }` controller so callers (the filter panel's saved-filter presets) can update it programmatically. Used for the Status and Project filter fields on My Requests. |
| Date range field (native) | `components/date-picker/date-picker.css` | **Date Picker** | CSS only — styles a native `<input type="date">` with a leading calendar icon. Used for the Created On range on My Requests (a simple range doesn't need the full calendar below). |
| Date picker (Hijri/Gregorian) | `components/date-picker/date-picker.js` | **Date Picker** | `createDatePicker({ mountId, value, onChange })` — a custom popup calendar (Gregorian/Hijri tab toggle, month/year nav, day grid), used for Step 1's "Project start date". The stored value is always canonical Gregorian ISO (`yyyy-mm-dd`); a caption shows the Hijri equivalent once a date is picked. Hijri↔Gregorian conversion uses the standard civil/tabular Islamic calendar (Kuwaiti algorithm) — accurate to within a day or two of the real Umm al-Qura calendar, fine for a prototype. PowerApps should use its native Date Picker with a Hijri locale/calendar-system setting instead of reimplementing this. |
| Breadcrumb trail | `components/breadcrumbs/breadcrumbs.js` + `.css` | **Breadcrumbs** | `renderBreadcrumbs(containerId, trail)`, `trail = [{ label, href? }]`; the last entry renders as the current (non-link) page. Used on `request-detail.html` ("My Requests > [Request Number]"). |
| Filter drawer | `components/filter-panel/filter-panel.js` + `.css` | No single catalog match — composed from **Dropdown Menu** (saved-filter select), **Chips** (Status/Project), **Date Picker** (Created On), and **Button** | Self-mounting singleton (`openFilterPanel({...})`), same pattern as Dialog but slides in from the right and dims rather than centers. Built once on first open; later opens just re-populate and toggle visibility, so the Chips controllers aren't recreated. Custom "Save Filter" presets are kept in-memory only (`fpCustomPresets`), not persisted. |
| Pagination bar | `components/pagination/pagination.js` + `.css` | No single catalog match — a Gallery + Button group pattern | Stateless: `renderPagination({ containerId, totalItems, page, pageSize, onPageChange, onPageSizeChange })`. The caller (e.g. `my-requests.js`) owns `page`/`pageSize` state and recomputes the filtered row slice; this component only renders controls and reports intent. |
| Vertical stepper rail | `components/stepper/stepper.js` + `.css` | **Stepper** | `renderVerticalStepper({ containerId, steps, statuses, onStepClick })`. Four visual states (current/completed/upcoming/error) per the spec; only `completed` steps are clickable — steps must be completed in order, so `upcoming` ones ignore clicks entirely. |
| Wizard shell | `components/wizard-shell/wizard-shell.js` + `.css` | Composed from **Stepper**, **Button**, and a Container | The frame Steps 1-8 render inside: header card (title + Copilot + "Try a new experience"), a two-column body (Stepper rail + content card), and a fixed footer (save-state text + Save as Draft + Continue). Renders into a mount id and leaves an empty `#wizard-step-content` div for each step page's own script to fill. `onSaveDraft`/`onContinue` callbacks and the `setWizardSaveState`/`setWizardContinueEnabled` helpers let a step page wire real behavior into the shared footer. |
| Copilot drawer | `components/copilot-drawer/copilot-drawer.js` + `.css` | Right-side **Container** slide-in (same pattern as the Dialog/Filter panel drawers) | `openCopilotDrawer()` / `closeCopilotDrawer()`, self-mounting singleton. Empty placeholder body only — real Copilot content is Phase 5 scope. |
| Searchable select (single/multi) | `components/searchable-select/searchable-select.js` + `.css` | No single catalog match — a **Dropdown**/**Combo Box** with search, closest to a searchable Combo Box control | `createSearchableSelect({ mountId, mode, options, selected, onChange, ... })`. Supports in-dropdown search, custom two-line option rendering (`line2Left`/`line2Right` — used for the Project field's number/department), keyboard nav (arrows/Enter/Escape), and in multi mode a chip row below the field with a "+N…" overflow toggle. Used for Step 1's Project, Budgeted Items, and Categories fields. |
| File upload | `components/file-upload/file-upload.js` + `.css` | **File Upload** | `createFileUpload({ mountId, acceptExtensions, maxSizeMB, onChange })` — drag-and-drop + click-to-browse dropzone, client-side extension/size validation, file cards with a delete action. No backend: files are kept as `{ name, size, type }` metadata for the list UI, not uploaded anywhere. Used for Step 1's Supporting Documents. |
| Toast | `components/toast/toast.js` + `.css` | No single catalog match — a transient **Notification** pattern | `showToast(message, duration)` — auto-mounts a `#toast-stack` on first use, auto-dismisses. Used for "Request saved as draft successfully." |

## Design tokens → PowerApps theme

`styles/tokens.css` defines every color, spacing, radius, shadow, and typography
value as a CSS custom property, sourced from `assets/reference/Colors.png`
(primary green/blue scales, semantic error/warning/success, neutrals) plus the
explicit brand values given for this project:

- Header gradient: `#699843` → `#517632` (`--color-brand-gradient-start` / `--color-brand-gradient-end`)
- Sidebar background: `#F6F8F4` (`--surface-sidebar`)

Each CSS variable should become one PowerApps Canvas theme/style value — the
naming (`--color-green-600`, `--space-4`, `--radius-md`, etc.) is intended to
read the same way in both places.

## Dashboard-only compositions (not a catalog component)

These sections on `pages/dashboard.html` are built from tokens + existing
components directly in `pages/dashboard.js` / `dashboard.css`, since they
don't correspond to a single named powerappsui.com component:

- **Dashboard greeting + "New RFP / Request" CTA** — plain heading/paragraph plus a Dropdown Menu (same pattern as the header's Create menu).
- **RFPs Closing Soon** — a compact link-list with an urgency pill (`.closing-soon-days`, red/amber/green by days-left threshold). In PowerApps this is a Gallery bound to RFPs with a non-null deadline, sorted ascending.
- **AI Assistant Suggestions** — a compact icon+text+link list (`.ai-suggestion-item`), deliberately not a chat-bubble panel.
- **Quick Actions** — a compact icon+label list (`.quick-action-item`).

The "Riyal" amount on the two value KPI cards uses `fa-solid fa-sack-dollar`
as a placeholder icon (no official Riyal glyph asset was provided) — swap for
the real Saudi Riyal symbol asset when available.

## Mock data notes (Phase 2)

- `mock-data/rfps.json` gained `type`, `stage`, `project`, `description`,
  `nextStep`, `lastUpdatedDate`, `pendingApproval`, and (on 3 records only)
  `closingSoonDaysLeft`/`closingSoonDueLabel`, on top of the Phase 1 fields.
  Status counts are unchanged (Draft 4 / Submitted 6 / Under Review 7 /
  Active RFP 8 / Awarded 1 = 26), since the donut chart and KPI cards both
  depend on them staying exact.
- **Total RFP Value (500,000 SAR)** and **Total PO Value (300,000 SAR)** are
  static, curated headline numbers, not a sum of `estimatedBudgetSAR` across
  the dataset (the real per-record budgets go well into the millions) — a
  deliberate simplification for a "compact KPI" demo number. Their
  drill-downs still show real, live-filtered data: the top 10 RFPs by value.
- **RFPs Closing Soon** deadlines (`closingSoonDaysLeft`) are stored as
  static day-counts rather than computed against a real "today", since the
  rest of the dataset's dates (Apr–Nov 2024) don't share a common "now" with
  the given "22/25/26 May 2024" examples. If a real current-date reference is
  introduced later, recompute these from `submissionDeadline` instead.
- `mock-data/activity.json` references `PR-2024-112`, which intentionally
  does not exist in `rfps.json` (per the Phase 2 spec's example activity
  entry) — its reference link resolves to the `request-detail.html` stub
  like any other ID.

| Vertical stepper rail | `components/stepper/stepper.js` + `.css` | **Stepper** | `renderVerticalStepper({ containerId, steps, statuses, onStepClick })`. Four visual states (current/completed/upcoming/error) per the spec; only `completed` steps are clickable — steps must be completed in order, so `upcoming` ones ignore clicks entirely. |
| Wizard shell | `components/wizard-shell/wizard-shell.js` + `.css` | Composed from **Stepper**, **Button**, and a Container | The frame Steps 1-8 render inside: header card (title + Copilot + "Try a new experience"), a two-column body (Stepper rail + content card), and a fixed footer (save-state text + Save as Draft + Continue). Renders into a mount id and leaves an empty `#wizard-step-content` div for each step page's own script to fill. |
| Copilot drawer | `components/copilot-drawer/copilot-drawer.js` + `.css` | Right-side **Container** slide-in (same pattern as the Dialog/Filter panel drawers) | `openCopilotDrawer()` / `closeCopilotDrawer()`, self-mounting singleton. Empty placeholder body only — real Copilot content is Phase 5 scope. |

## Wizard state (Phase 4a)

`js/data-store.js` also defines `WIZARD_STEPS` (the 8-step list: id, title,
description, href) and a `WizardStore` object, kept separate from
`DataStore` since it's transient per-tab creation-flow state, not mock
backend data:

- Persisted to `sessionStorage` under `munafasat.wizardState` — survives
  navigation between wizard step pages (each step is its own HTML page, not
  an SPA route) but resets when the tab closes, matching a real in-progress
  draft that hasn't been saved.
- Shape: `{ mode: 'scratch' | 'previous', sourceRequestId, stepStatuses: { [stepId]: 'current' | 'completed' | 'upcoming' | 'error' }, formData }`.
- `WizardStore.start({ mode, sourceRequestId, formData })` is called from
  `create-request.js` when either entry-page option is chosen — "Create from
  Previous Request" seeds `formData` with a shallow copy of the selected
  RFP's fields (Step 1's real form isn't built yet, so nothing consumes this
  further this phase).
- Only `wizard-basic-details.html` (Step 1) exists; the other 7 steps' `href`
  values in `WIZARD_STEPS` point to pages that don't exist yet. This is safe
  today because a fresh wizard only ever marks Step 1 `current` and the rest
  `upcoming`, and `upcoming` steps are never clickable in the stepper.
- `WizardStore.getFormData()` / `updateFormData(patch)` (added Phase 4b)
  shallow-merge into `state.formData` and persist on every field change —
  this is what makes Step 1 survive a page refresh and what Step 2+ will
  read `projectId`/`budgetedItemIds`/etc. back from later.

## Step 1 - Basic Details (Phase 4b)

- `mock-data/projects.json` — 8 projects, each with `budgetedItems`
  (2-4 line items) and `suggestedCategories` (a subset of the 6 fixed
  `CATEGORY_OPTIONS` in `data-store.js`). Selecting a project in Step 1
  auto-populates Department (disabled) and Categories (editable) from
  these; **the selected budgeted items are stored but not yet wired to
  Step 2 (BOQ)** — per the spec, one BOQ section per selected item is
  future work, tagged with a `NOTE:` comment at the call site in
  `wizard-basic-details.js`.
- `approvalStatus`/`status` (from `rfps.json`, Phase 2/3) are unrelated to
  anything in Step 1 — Step 1 introduces its own fresh field set on
  `formData` (`procurementCategory`, `projectId`, `requestNameEn`, etc.),
  listed in full at the top of `wizard-basic-details.js`.
- EN↔AR translation (the sparkle icon on Request name) and all "Generate
  with AI" / "Autofill with AI" text are **canned, not real AI** — a small
  word-substitution dictionary for translation, and template strings that
  interpolate the selected project/item/request names for justification
  text. Good enough to demo the interaction pattern; swap for a real
  translation/LLM call when this becomes a real backend.
- Two real bugs were found and fixed while building this step, both worth
  knowing about if extending these components:
  1. **Searchable select / date picker / chips "closes immediately on
     click"**: any component that fully re-renders (`mount.innerHTML = ...`)
     from inside a click handler, while a document-level "click outside to
     close" listener is also watching, will falsely detect that click as
     "outside" — the re-render detaches the original `event.target` before
     the same click event finishes bubbling to `document`. Fixed by adding
     `mount.addEventListener('click', e => e.stopPropagation())` once per
     component instance (searchable-select.js, date-picker.js, chips.js).
     Any *new* component with this shape needs the same guard.
  2. **Stale closure state in persistent event listeners**: the radio-card
     click handler captured `const f = step1.formData` once when the form
     was built, but `patchForm()` reassigns `step1.formData` to a new
     object rather than mutating it — so `f` went stale after the first
     click and toggle-off logic broke on the second click. Fixed by reading
     current selection from the DOM (`classList.contains('selected')`)
     instead of the stale snapshot. Anywhere a live listener needs "the
     current value" after the first render, prefer reading the DOM or a
     `step1.formData` access made *inside* the handler, not a value
     captured in an outer closure.
- The Hijri/Gregorian conversion in `date-picker.js` had two subtle bugs
  during development (documented in the code comments there): the Gregorian
  JD formula needs C-style truncating division, not `Math.floor`, for its
  negative intermediate terms (Jan/Feb roll into the previous Islamic-
  calendar-relevant year); and the forward/reverse Islamic-calendar JD
  formulas must share the exact same epoch convention or the round trip
  drifts by a day or two. Both are fixed and round-trip-tested now — see
  the code comments before changing either function.

## Procurement AI Assistant (Phase 5d lite)

`pages/ai-assistant.html` + `.css` + `.js` — a standalone page (own sidebar
+ header, not inside the wizard shell) reached via the wizard header's
"Try a new experience" button (`components/wizard-shell/wizard-shell.js`,
one-line change: now navigates to `ai-assistant.html` instead of opening a
"coming soon" dialog). No new shared components; this page is entirely
self-contained.

- **All conversation logic lives in one function, `getScriptedResponse()`**
  in `ai-assistant.js`, exactly per the spec's ask — everything else
  (message rendering, the Accept/Edit/Reject suggestion card, the
  progress panel) is generic UI plumbing that should survive unchanged
  once that one function is swapped for a real Claude API call. The file's
  header comment and a `TODO` at the function itself both flag this.
- **This is keyword-matching, not NLU** — it recognizes "`<number>
  <word>`" (e.g. "50 laptops") for the BOQ-item turn and
  `/project|department|dept\.?/i` for the follow-up turn, with a generic
  fallback ("Thanks, I've noted that...") for everything else, including
  anything sent before/after those two matches. Verified live: the exact
  spec example produces the exact spec'd reply; a "random unrelated
  gibberish" input never breaks the flow, it just gets the fallback.
- **Suggestion cards are real interaction, not decoration**: Accept moves
  that Request-Structure item to "Complete" and stores the value; Reject
  reverts it to "Not started"; Edit swaps the suggestion body for an
  inline input and only commits (as an accept) once the user confirms —
  verified all three paths, including that an edited value is what
  actually gets stored, not the original scripted text.
- **"Continue with Form" only carries forward *accepted* values** — into
  `WizardStore.formData` via the same `updateFormData` every wizard step
  uses, so Step 1 picks it up immediately with no special-casing. A
  demo item accepted on the laptops example prefilled `requestNameEn`
  and a real `boqItems` entry (`quantity: 50`, `uom: 'EA'`, etc.) — the
  point being this is a genuine data write, not a screenshot of one; the
  BOQ item shows up for real once the user reaches Step 2.

## App-wide modal/dropdown consistency retrofit (Phase 5b)

Applied to shared components, not to any individual step page, so every
step that already uses these gets the fix automatically:

- **`components/dialog/dialog.js`** (used by every step's Add/Edit/confirm
  modals): added a real focus trap — Tab/Shift+Tab now wrap within the
  open dialog instead of escaping to the page behind it, initial focus
  moves to the first focusable control in the dialog body (falling back to
  the close button for text-only confirm dialogs), and focus returns to
  whatever triggered the dialog on close. Escape-to-close already existed
  from Phase 4a. Verified this didn't regress Step 2's BOQ modal (focus
  landed correctly, save flow still worked) after the change.
  - Found and fixed a real bug while verifying this: the initial
    focus-move used `requestAnimationFrame`, which browsers throttle or
    skip entirely in a backgrounded/non-visible tab — exactly the
    situation when driving the page via browser automation — so focus
    silently never moved. Switched to `setTimeout(fn, 0)`, which isn't
    subject to that throttling.
- **`components/filter-panel/filter-panel.js`** and
  **`components/copilot-drawer/copilot-drawer.js`**: both were missing
  Escape-to-close (`dialog.js` already had it); added, each calling that
  drawer's own discard/close logic rather than a shared handler, since
  the filter panel treats Escape as "discard unsaved changes" same as its
  X/Cancel buttons.
- **`components/searchable-select/searchable-select.js`**: single-select
  already closed on selection and multi-select already stayed open —
  audited, no change needed there. Character-count textareas across
  Steps 1 and 3 already hard-stop via the native `maxlength` attribute —
  also audited, no change needed.

## Step 5 - Attachments / Certificates and Documents (Phase 5b)

`pages/wizard-attachments.js` + `.css`, plus `mock-data/certificates.json`
and `mock-data/technical-documents.json`. Required Certificates and
Technical Documents are two fully independent collections
(`certCardCtl` / `techCardCtl`), persisted as separate `formData` keys
(`attachmentCertificates` / `attachmentTechnicalDocuments`) — verified an
item added to one card never appears in or affects the other.

- **Unified chip collection, tagged by source**: within each card, the
  predefined dropdown, the "Other" text input, and (Technical Documents
  only) AI-accepted suggestions all write into one `items` array
  (`{ id, label, source: 'predefined' | 'custom' | 'ai' }`) so they render
  as a single chip row per the spec, while still being visually
  distinguishable (`.att-chip.source-custom` / `.source-ai`) and
  independently traceable.
- **`components/searchable-select/searchable-select.js` gained a
  `showChips` option** (default `true`, so Steps 1/2/4's existing usage is
  unaffected — verified) so this step can use it purely as the
  dropdown/search mechanism while rendering its own unified chip row
  instead of the component's built-in one.
- **Bidirectional chip↔dropdown sync, both directions verified live**:
  removing a chip for a predefined item unchecks it in the dropdown
  (confirmed via `predefinedSelect.getSelected()`), and unchecking an item
  in the dropdown removes its chip — same guarantee Phase 1's Budgeted
  Items field already had, now proven for a case where the chip row is
  rendered entirely outside the component.
- Technical Documents' AI suggestions are a checkbox review list (checked
  by default) rather than the Accept/Reject-per-item pattern used in
  Steps 1/3 — matches this spec's literal "Accept & Apply | Regenerate |
  Cancel" wording for the whole suggestion set at once; verified
  unchecking one suggestion before Accept & Apply correctly excluded only
  that one.

## Step 4 - Payments (Phase 5a)

`pages/wizard-payments.js` + `.css` — payment stages live in
`WizardStore.formData.paymentStages`, same shared bag as every other step.
No new components; the table reuses `buildTableHtml`, the row-delete icon
reuses `table.css`'s `.row-action` classes, and the Add/Edit Stage modal
reuses `components/dialog` + `components/date-picker`.

- **Total RFP/BOQ value** is read live from Step 2's own data
  (`boqItems`), computed with the *exact same formula* Step 2 displays
  (`subtotal × 1.15`, i.e. Grand Total incl. 15% VAT) — reimplemented
  locally as `computeTotalRfpValue()` rather than calling into
  `wizard-boq.js`, consistent with this project's rule of not reaching
  into another step's file. Verified: with BOQ items summing to SAR
  100,000 subtotal, Payments correctly computed SAR 115,000 as the base
  for all percentage→amount math.
- **Percentage ↔ Amount bidirectional sync**: editing either field in the
  Add/Edit modal recalculates the other live (`amountFromPercent` /
  `percentFromAmount`), which is how this implements the spec's "keep
  percentage and amount in sync" instruction — by construction they can't
  drift apart, so there's no separate mismatch-warning UI. Verified both
  directions independently (25% → SAR 28,750.00; SAR 11,500 → 10%).
- **S.No is never stored**, same pattern as BOQ's Item No. — always the
  stage's live index in `pay.stages`, so delete re-sequencing is automatic.
- **Two AI entry points, deliberately different scope**: the Add-Stage
  popup's AI (`generateSingleStageSuggestion`) proposes exactly one stage —
  picks the next name from `['Advance Payment', 'Delivery and
  Installation', 'Final Acceptance']` by existing-stage count, suggests
  only the percentage still needed to reach 100% (capped at 30%), and
  chains its start date off the *previous* stage's start + duration
  (verified: adding a 4th stage after the AI-generated 3-stage schedule
  correctly proposed a start date 180 days after the last stage's start).
  The header/empty-state AI (`generateFullScheduleSuggestion`) proposes a
  complete 3-stage 20/50/30 schedule at once, dates derived from Step 1's
  `projectStartDate` + total duration. Neither commits without an explicit
  "Accept & Apply" in a review step.
- **Continue gate is stricter than other steps**: `pay.stages.length > 0 &&
  percentTotal() === 100`, not just "at least one item" — verified the
  button flips disabled/enabled live as stages are added/edited/deleted
  crossing the 100% line in both directions (under, exactly, and over).
- Found and fixed a real timezone bug while testing: `addDaysIso()`
  originally built dates with `.toISOString().slice(0, 10)`, which
  converts to UTC first — in any timezone ahead of UTC, local midnight
  becomes the *previous* day once converted, so every AI-suggested date
  was landing one day early. Fixed by formatting from the `Date` object's
  local getters (`getFullYear`/`getMonth`/`getDate`) instead. Worth
  checking for the same pattern if a future step does its own date math.

## Step 3 - Scope of Work (Phase 4d)

`pages/wizard-scope-of-work.js` + `.css` — 13 plain textareas across 5
cards, all writing directly into the shared `WizardStore.formData` bag
(same one Steps 1-2 use), no new components needed.

- **Wizard shell extended again, not Steps 1/2 touched**: `wizard-shell.js`
  gained a second optional param, `footerActionsPrefixHtml`, rendered just
  before the Save as Draft / Continue buttons — Step 3's spec wants a
  "Saved just now" indicator *near the actions* (not owning the whole left
  slot like Step 1, and not absent like Step 2). It reuses the existing
  `setWizardSaveState()` helper unchanged, since that function just targets
  `#wizard-save-state` wherever it happens to be in the DOM. Verified after
  this edit that Step 1's default footer and Step 2's back-link footer are
  both still exactly as they were.
- **Two different AI review patterns, deliberately**: the spec asked for
  different behavior at field level vs. section level, so they're genuinely
  different flows, not the same component reused:
  - Field-level (`runFieldAi`): always offers a suggestion when clicked —
    regardless of whether the field already has text — inline below that
    field, with only Accept & Apply / Regenerate (plus a dismiss ×). Never
    auto-overwrites; matches the spec's "show the suggestion alongside for
    the user to choose" instruction for a non-empty field.
  - Section-level (`runSectionAi` → `showSectionReview`): confirm Yes/No,
    then generates only for fields that are currently empty, and opens one
    dialog listing all of them with an editable textarea + Accept /
    Regenerate / Reject each, plus "Accept all remaining". The spec listed
    a fourth action, "Edit" — implemented as the review textarea always
    being directly editable before Accept, rather than a separate
    edit-mode toggle (same simplification already used for this pattern in
    Steps 1-2). Verified: rejecting one field and accepting the rest left
    the rejected one empty and didn't touch the field the user had already
    filled in via the field-level AI moments earlier.
- Generators reference real state where the spec calls for it — verified
  live: "Timelines / Milestones" computed an actual date range from Step
  1's `projectStartDate`/`durationType`/`durationValue` (matching the same
  math as Step 1's own closure-date display, reimplemented locally as
  `computeSowClosureDate` — small intentional duplication rather than
  reaching into `wizard-basic-details.js`, which this phase isn't allowed
  to touch), and "Project Scope" / "In Scope" listed the actual BOQ item
  names from Step 2's `boqItems`.
- None of the 13 fields are mandatory — `setWizardContinueEnabled(true)` is
  called unconditionally on load, per the spec's explicit "don't block
  Continue on them being filled."

## Step 2 - Bill of Quantity (Phase 4c)

`pages/wizard-boq.js` + `wizard-boq.css` — no new component folders were
added; the BOQ table reuses `components/table/table.js`'s `buildTableHtml`
(sticky header + horizontal scroll added via scoped `.boq-table-wrap`
overrides in `wizard-boq.css`, not by editing `table.css`), and the Add/Edit
item modal reuses `components/dialog`, `components/searchable-select` (for
Procurement type / Purchase group / Material group / UOM), and
`components/date-picker` (Delivery date — its Hijri tab is unused here but
harmless to leave in).

- **Shared wizard shell extended, not Step 1 touched**: `wizard-shell.js`
  gained an optional `footerLeftHtml` param to `renderWizardShell(...)` —
  Step 2's footer-left is a "← Basic Details" link instead of Step 1's
  save-state text. Omitting the param (as `wizard-basic-details.js` still
  does) reproduces the exact old markup, verified unchanged after this edit.
- **Data model**: `WizardStore.formData.boqItems` (array) and
  `.boqImportBatches` (array of `{ id, filename, importedAt, itemCount }`)
  — the same `formData` bag Step 1 writes to, so later steps (Attachments'
  AI step, per the product doc) can read `boqItems` back out. Each item
  carries `sourceImportId: string | null`; editing an imported item via the
  modal clears this field, which is what lets "Remove / Re-upload" sweep
  away only the untouched rows from that import (verified: editing one row
  from a 2-row import, then removing that import, leaves the edited row and
  removes the other).
- **Item No.** is never stored — it's always the item's live index in
  `boq.items` (padded to 2 digits) at render/export time, so delete/import
  re-sequencing is automatic and can't drift out of sync.
- **Real .xlsx, not a stub**: SheetJS (`XLSX`, via the cdnjs CDN — see the
  `<script>` tag in `wizard-boq.html`) powers both Export Template
  (`XLSX.utils.aoa_to_sheet` + `XLSX.writeFile`) and Import
  (`XLSX.read` + `sheet_to_json`), verified end-to-end in-session: built a
  workbook in memory with the 13 required headers, ran it through the real
  `handleImportFile`, and got back correctly-typed BOQ items (numbers,
  booleans, brand justification text all parsed right); also verified the
  missing-columns error path reports exactly the missing header names.
- **AI generation, two tiers**: the BOQ-header "Generate with AI" derives
  suggested line items from Step 1's *real* `projectId`/`budgetedItemIds`
  (reads `WizardStore.getFormData()` + `mock-data/projects.json`) — verified
  it correctly produced items named after the actual selected budgeted
  items ("SAP modules implementation", "AMS"). The per-field "Generate with
  AI" inside the Add/Edit modal is generic/templated (no strong context
  available there beyond what's already typed), consistent with Step 1's
  "canned, not real AI" approach.
- `formatBoqSAR` (in `wizard-boq.js`) is intentionally named differently
  from the global `formatSAR` already defined by `components/table/table.js`
  — both are plain global function declarations loaded on the same page, so
  reusing the same name would have silently shadowed one with the other
  depending on script order. `formatBoqSAR` produces `"SAR 11,500.00"` (the
  format this spec asked for); table.js's `formatSAR` produces `"11500 SAR"`
  and is used elsewhere (KPI cards, dashboard).

## Mock data notes (Phase 3)

- `mock-data/rfps.json` grew from 26 to 32 records and every record gained
  `approvalStatus` (Draft/Submitted/Approved/Rejected). This is intentionally
  **separate** from the existing `status` field: `status` is the Dashboard's
  5-value lifecycle field (Draft/Submitted/Under Review/Active RFP/Awarded)
  driving the donut chart; `approvalStatus` is My Requests' 4-value field
  with the exact chip colors specified for that page. They're derived
  independently, so don't assume one can be computed from the other beyond
  the rough mapping used when seeding the data (see `/tmp` script history:
  Draft→Draft, Submitted/Under Review→Submitted, Active RFP/Awarded→Approved,
  plus a few curated Rejected records since no `status` value maps to it).
  Extending `rfps.json` further updates Dashboard's totals automatically
  (it's fully data-driven) — that's expected, not a regression.
- `DataStore.deleteRfp(id)` removes a record from the **in-memory** cache
  only; it resets on page reload since there's no backend. My Requests'
  delete action calls this directly.
- The "Download" row action and the donut chart's "Download data" option
  both generate a client-side `Blob` and trigger a real browser download of
  a stub file — there's no server export endpoint to wire up later, PowerApps
  should replace this with its native Export/Download control.

## Not yet built (future phases)

The following components from the powerappsui.com library are referenced in
the product spec but have no implementation yet: Bar Chart, Stepper, File
Upload, and a dedicated Loading Screen/Overlay component (currently only the
empty-state illustration pattern exists).

## Buttons

`assets/reference/button variants.png` shows three button styles (primary
filled green, secondary outlined, tertiary/disabled gray). The header's
"Create" button (`.app-header-create-btn`) and "AI Assistant" button
(`.app-header-ai-btn`) are early instances of the primary/secondary treatment;
a dedicated `components/button/` pair should be extracted once more pages
need buttons, so all button instances share one source of truth.
