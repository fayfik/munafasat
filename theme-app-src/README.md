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
| `src/data/actors.js` | The people who act on a request and the six reviewing teams (lead + members). Approvals by authority stay with one person |
| `src/data/tasks.js` | The inbox tasks, the workflow up to Create in Etimad, who holds each task at the start, decision copy |
| `src/lib/assign.js` · `src/components/Queue.jsx` | Team queues: who holds a task, pick up, return to queue, assign / reassign with workload |
| `src/lib/qualGuide.js` | Project priority, recommended qualification ranges, SME check, project nature, financial criteria |
| `src/lib/procRules.js` · `src/tasks/Procurement.jsx` | Finance qualification, procurement method, officer confirm and Create in Etimad |
| `src/data/content.js` | Review content per task type (cyber, BCM, op-risk, EA, GL, assets…) and the libraries |
| `src/data/newRequest.js` | New Request reference data: projects, cost centers, people, samples, standards library, BCM / third-party risk questions |
| `src/lib/requestRules.js` | Routing, step completeness, “will this be returned?” checks, standards and continuity screening |
| `src/lib/accounting.js` | AI purchase type + material group for each BOQ line (GL follows the material group) |
| `src/lib/preReview.js` | AI pre-review on Review & submit — what each reviewer is likely to return, with fixes to apply |
| `src/data/aiContent.js` | Sample content behind the AI touchpoints: similar requests, import payloads, project library, executive summary |
| `src/components/AiKit.jsx` · `src/styles/ai.css` | The shared AI look — spark, gradient text, AI card, AI buttons, “AI generated” tag |
| `src/pages/` | New Request form shell and the interim My requests page |
| `src/steps/` | One component per New Request step |
| `src/components/` | Shell, inbox column, task page, review kit (Accept / Modify / Comment), request details, side panel, dialogs |
| `src/tasks/` | One component per Required-action type |
| `src/styles/theme.css` | Tokens and base styles shared with `/theme/` |
| `src/styles/app.css` | Component styles for this build |
| `src/styles/form.css` | New Request form styles |

Content is transcribed from the design-review build deployed on 11 Nov 2026.
Review progress, comments, decisions and requests you create are kept for the browser session only.

Switch person from the profile menu in the top bar; each sees their own tasks and requests. Review tasks belong to a team: they wait in the team queue until a member picks one up, and the team lead can assign or reassign them (lightest workload suggested). People in a team switch between My tasks and Team queue at the top of the inbox. A link to someone else’s task opens it as that person — or as the team lead while it waits in the queue.

Synced with the design-review build of 22 Nov 2026: project priority and guided qualification ranges in the form, financial criteria as the fourth qualification criterion, and the approval steps up to Create in Etimad.

AI touchpoints (sample content, no live model): similar requests to import on Project setup, “Identify items with AI” in Help me decide, Generate scope / terms / purpose / location, Generate with AI on the BOQ (start card, title row and item descriptions), AI Etimad check, AI purchase type + material group per line, Import from similar projects (payment, requirements, criteria, qualification), AI pre-review on Review & submit, AI suggestions on My requests, and an AI executive summary on every reviewer task.

Routes: `#/inbox/<task>` · `#/requests` · `#/requests/new` · `#/requests/<id>`.

## Batches

1. **Inbox — all task types** (done)
2. **New Request form** — tender (9 steps) and E-Market (5 steps) (done) · My Requests list and request page (next)
3. Dashboard and Reports
4. Arabic / right-to-left pass
