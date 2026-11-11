# Munafasat — calmer theme (component build)

The less-cluttered rebuild of the design-review prototype, one area at a time.
Source lives here; the built site is committed to `../theme-app/` so GitHub Pages
serves it at **https://fayfik.github.io/munafasat/theme-app/**.

## Run and build

```bash
cd theme-app-src
npm install
npm run dev      # local preview with hot reload
npm run build    # writes the static site to ../theme-app/
```

Commit both `theme-app-src/` and `theme-app/` after a build.

## Structure

| Path | What's in it |
|---|---|
| `src/data/requests.js` | The four requests (REQ-4478, 4471, 4433, 4429): details, BOQ, budget, comments |
| `src/data/tasks.js` | The 17 inbox tasks, the 15-step workflow, decision copy |
| `src/data/content.js` | Review content per task type (cyber, BCM, op-risk, EA, GL, assets…) and the libraries |
| `src/components/` | Shell, inbox column, task page, review kit (Accept / Modify / Comment), request details, side panel, dialogs |
| `src/tasks/` | One component per Required-action type |
| `src/styles/theme.css` | Tokens and base styles shared with `/theme/` |
| `src/styles/app.css` | Component styles for this build |

Content is transcribed from the design-review build deployed on 11 Nov 2026.
Review progress, comments and decisions are kept for the browser session only.

## Batches

1. **Inbox — all task types** (this batch)
2. My Requests — list, request page, New Request form
3. Dashboard and Reports
4. Arabic / right-to-left pass
