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
| `src/data/newRequest.js` | New Request reference data: projects, cost centers, people, samples, standards library, BCM / third-party risk questions |
| `src/lib/requestRules.js` | Routing, step completeness, “will this be returned?” checks, standards and continuity screening |
| `src/pages/` | New Request form shell and the interim My requests page |
| `src/steps/` | One component per New Request step |
| `src/components/` | Shell, inbox column, task page, review kit (Accept / Modify / Comment), request details, side panel, dialogs |
| `src/tasks/` | One component per Required-action type |
| `src/styles/theme.css` | Tokens and base styles shared with `/theme/` |
| `src/styles/app.css` | Component styles for this build |
| `src/styles/form.css` | New Request form styles |

Content is transcribed from the design-review build deployed on 11 Nov 2026.
Review progress, comments, decisions and requests you create are kept for the browser session only.

Routes: `#/inbox/<task>` · `#/requests` · `#/requests/new` · `#/requests/<id>`.

## Batches

1. **Inbox — all task types** (done)
2. **New Request form** — tender (9 steps) and E-Market (5 steps) (done) · My Requests list and request page (next)
3. Dashboard and Reports
4. Arabic / right-to-left pass
