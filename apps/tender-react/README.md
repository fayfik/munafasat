# Munafasat — AI tender creation (React)

React 19 + Vite + Tailwind v4 version of the tender request wizard, including the Bill of Quantities step with:

- AI Suggest BOQ (demo content, no AI credits used)
- Manual BOQ items with brand justification (tooltip on the "Brand req." pill)
- Etimad Souq availability check (demo rules): move to an Etimad Souq draft, or keep with a justification (submit / edit)
- Edit / delete line items
- **A/B test of the BOQ layout**
  - **A · Grouped + form** — items grouped by project item, "Add BOQ Item" form
  - **B · Sheet** — one spreadsheet-style table, every cell editable in place; Enter moves down, Tab moves right, rows can be pasted from the Excel template

Pick the layout with the switch on the BOQ step, or force it with `?boq=sheet` / `?boq=cards` in the URL.

## Run

```bash
cd apps/tender-react
npm install
npm run dev
```

`npm run build` writes a static build to `dist/`.
