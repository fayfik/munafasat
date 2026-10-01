# Munafasat — AI tender creation (React) · SIDF colour theme

This branch (`boq-sidf-theme`) restyles the app with the Munafasat colour tokens in `munafasat-colors.css` / `munafasat-colors.json`: green gradient top bar, green-tinted neutrals, purple AI accents, navy "add" buttons and current step, and SIDF status chips. The sidebar expand/collapse switch sits beside the "Main Menu" title. The earlier look is kept on the `boq-sheet-ab` branch.

React 19 + Vite + Tailwind v4 version of the tender request wizard, including the Bill of Quantities step with:

- AI Suggest BOQ (demo content, no AI credits used)
- Manual BOQ items with brand justification (tooltip on the "Brand req." pill)
- Etimad Souq availability check (demo rules): move to an Etimad Souq draft, or keep with a justification (submit / edit)
- Edit / delete line items
- **Two BOQ views**
  - **Grid** — items grouped by project item, "Add BOQ Item" form
  - **Table** — one spreadsheet-style table, every cell editable in place; Enter moves down, Tab moves right, rows can be pasted from the Excel template

Pick the view with the Grid / Table switch on the BOQ step, or force it with `?boq=sheet` / `?boq=cards` in the URL.

## Run

```bash
cd apps/tender-react
npm install
npm run dev
```

`npm run build` writes a static build to `dist/`.

## Switches

- **Cost centers** (`src/lib/features.ts`, `DEFAULT_COST_CENTER_MODE`)
  - `single` (default): one cost center per request — pick a tile, or pick one from "View more cost centers".
  - `multi`: the tile is the default cost center and "View more cost centers" adds additional ones.
  - Try the other behaviour without changing code by adding `?cc=multi` or `?cc=single` to the URL.
