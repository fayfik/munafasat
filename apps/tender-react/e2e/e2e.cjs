// End-to-end test for the Munafasat prototype (Playwright, no test runner needed).
// Usage:  npx vite preview --port 4299 &   then   node e2e/e2e.cjs [baseUrl]
// Requires the `playwright` package (resolved from NODE_PATH or local node_modules).
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:4299/';
const OUT = process.env.E2E_OUT || '/tmp/munafasat-e2e';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
let page, errors = [];
const wait = (ms) => page.waitForTimeout(ms);
const LOAD = 700; // > simulated load delay

function expect(cond, msg) { if (!cond) throw new Error(msg); }
async function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  const before = errors.length;
  try {
    await fn();
    expect(errors.length === before, `page error: ${errors.slice(before).join(' | ')}`);
    results.push({ name, ok: true });
  } catch (e) {
    const shot = `${OUT}/FAIL-${results.length + 1}.png`;
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, ok: false, err: String(e.message || e).split('\n').slice(0, process.env.ONLY ? 6 : 1).join(' / '), shot });
  }
}
const nav = (title) => page.click(`button[title="${title}"]`);
const tab = (name) => page.getByRole('button', { name, exact: true }).first().click();
const text = (s) => page.getByText(s, { exact: false });
async function count(sel) { return page.locator(sel).count(); }

async function openRequest(title) {
  await nav('My Requests'); await wait(LOAD);
  await page.fill('input[placeholder^="Search request number"]', title); await wait(150);
  await text(title).first().click(); await wait(LOAD);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.googleapis|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.goto(BASE);

  // ── Loaders ────────────────────────────────────────────────────────────────
  await test('Loader: dashboard shows skeleton then content', async () => {
    expect(await count('.ld-shimmer') > 0, 'no skeleton on first load');
    await wait(LOAD);
    expect(await count('.ld-shimmer') === 0, 'skeleton still visible after load');
  });
  await test('Loader: top progress bar on navigation', async () => {
    await nav('My Requests'); await wait(60);
    expect(await page.locator('[role="progressbar"][aria-busy="true"]').count() === 1, 'progress bar not busy');
    await wait(LOAD);
    expect(await page.locator('[role="progressbar"][aria-busy="false"]').count() === 1, 'progress bar stuck busy');
  });

  // ── My Requests list ───────────────────────────────────────────────────────
  await test('My Requests: title count and two tabs only', async () => {
    const h1 = await page.locator('h1').first().innerText();
    expect(/My Requests\s*24/.test(h1), `title count missing: ${h1}`);
    expect(await page.getByRole('button', { name: /^All requests/ }).count() === 1, 'All tab');
    expect(await page.getByRole('button', { name: /^Closed requests/ }).count() === 1, 'Closed tab');
    expect(await page.getByRole('button', { name: /^Draft\s*\d/ }).count() === 0, 'old status tabs still present');
  });
  await test('My Requests: columns', async () => {
    for (const c of ['Request number', 'Request', 'Status', 'Type', 'Department', 'Created on', 'PR number', 'Created by'])
      expect(await page.locator('thead th', { hasText: c }).count() > 0, `missing column ${c}`);
  });
  await test('My Requests: pagination 10 per page', async () => {
    expect(await count('tbody tr') === 10, 'expected 10 rows');
    await page.getByRole('button', { name: '3', exact: true }).click(); await wait(LOAD);
    expect(await count('tbody tr') === 4, 'page 3 should have 4 rows');
    await page.getByRole('button', { name: '1', exact: true }).click(); await wait(LOAD);
  });
  await test('My Requests: Closed tab shows only approved', async () => {
    await page.getByRole('button', { name: /^Closed requests/ }).click(); await wait(LOAD);
    const statuses = await page.locator('tbody tr td:nth-child(4)').allInnerTexts();
    expect(statuses.length === 7 && statuses.every((s) => s.includes('Approved')), `closed rows: ${statuses.join(',')}`);
    await page.getByRole('button', { name: /^All requests/ }).click(); await wait(LOAD);
  });
  await test('My Requests: search by PR number', async () => {
    await page.fill('input[placeholder^="Search request number"]', '1000004521'); await wait(200);
    expect(await count('tbody tr') === 1 && (await text('Office Supplies').count()) > 0, 'PR search failed');
    await page.fill('input[placeholder^="Search request number"]', 'zzzz'); await wait(200);
    expect(await text('No requests match').count() > 0, 'empty state missing');
    await page.fill('input[placeholder^="Search request number"]', '');
    await wait(LOAD);
  });
  await test('My Requests: sort by request number', async () => {
    await page.locator('thead button', { hasText: 'Request number' }).click(); await wait(LOAD);
    const first = await page.locator('tbody tr td:nth-child(2)').first().innerText();
    expect(/Not assigned/.test(first), `ascending should start with unassigned drafts, got ${first}`);
    await page.locator('thead button', { hasText: 'Created on' }).click(); await wait(LOAD);
  });
  await test('Filter panel: opens as side panel with all sections', async () => {
    await page.getByRole('button', { name: /^Filters/ }).click(); await wait(300);
    const dlg = page.getByRole('dialog', { name: 'Filters' });
    expect(await dlg.isVisible(), 'panel not visible');
    for (const s of ['Status', 'Type', 'Department', 'Created by', 'Created on', 'PR number'])
      expect(await dlg.getByRole('button', { name: s, exact: true }).count() === 1, `missing section ${s}`);
  });
  await test('Filter panel: combined filters + faceted count + apply', async () => {
    const dlg = page.getByRole('dialog', { name: 'Filters' });
    await dlg.getByRole('button', { name: 'Type', exact: true }).click();
    await dlg.locator('button', { hasText: 'Tender' }).first().click();
    await dlg.locator('button', { hasText: 'Under review' }).click();
    const show = await dlg.locator('button', { hasText: /^Show \d+ request/ }).innerText();
    expect(/Show 4 requests/.test(show), `expected 4 results, got "${show}"`);
    await dlg.locator('button', { hasText: /^Show/ }).click(); await wait(LOAD);
    expect(await count('tbody tr') === 4, 'table not filtered to 4');
    expect(await page.getByRole('button', { name: /^Filters\s*2/ }).count() === 1, 'filter count badge');
  });
  await test('Filter chips: remove one and clear all', async () => {
    await page.locator('span', { hasText: /^Tender$/ }).locator('button').first().click(); await wait(LOAD);
    expect(await count('tbody tr') === 5, `expected 5 under review, got ${await count('tbody tr')}`);
    await page.getByRole('button', { name: 'Clear all' }).click(); await wait(LOAD);
    expect(await count('tbody tr') === 10, 'clear all failed');
  });
  await test('Filter panel: saved view + date + PR presence', async () => {
    await page.getByRole('button', { name: /^Filters/ }).click(); await wait(300);
    const dlg = page.getByRole('dialog', { name: 'Filters' });
    await dlg.getByRole('button', { name: /Custom filter|All requests/ }).first().click();
    await dlg.locator('div', { hasText: /^PR created/ }).last().click(); await wait(150);
    expect(/Show 7 requests/.test(await dlg.locator('button', { hasText: /^Show/ }).innerText()), 'PR created view');
    await dlg.getByRole('button', { name: 'Created on', exact: true }).click();
    await dlg.getByRole('button', { name: 'This year', exact: true }).click();
    await dlg.getByRole('button', { name: /Save as view/ }).click();
    await dlg.locator('input[placeholder="View name"]').fill('My approved 2026');
    await dlg.getByRole('button', { name: 'Save', exact: true }).click();
    await dlg.locator('button', { hasText: /^Show/ }).click(); await wait(LOAD);
    expect(await text('My approved 2026').count() > 0, 'saved view label not shown');
    await page.getByRole('button', { name: 'Clear all' }).click(); await wait(LOAD);
  });
  await test('Export CSV downloads', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Export/ }).click()]);
    expect(dl.suggestedFilename() === 'my-requests.csv', 'wrong file name');
    const body = fs.readFileSync(await dl.path(), 'utf8');
    expect(body.split('\n').length === 25, `csv rows ${body.split('\n').length}`);
  });

  // ── Request detail ─────────────────────────────────────────────────────────
  await test('Detail: opens on row click with 4 tabs and breadcrumb', async () => {
    await openRequest('Enterprise ERP System Upgrade');
    for (const t of ['Overview', 'Request details', 'Documents', 'Process'])
      expect(await page.getByRole('button', { name: t, exact: true }).count() > 0, `missing tab ${t}`);
    expect(await text('TEN-2026-').count() > 0, 'request number not in header');
  });
  await test('Detail Overview: stepper, cards, committee', async () => {
    for (const s of ['Request details', 'PR details', 'Committee members', 'Approvals', 'PR creation'])
      expect(await text(s).count() > 0, `missing ${s}`);
  });
  await test('Detail Request details: Inbox view, collapsed by default', async () => {
    await tab('Request details'); await wait(LOAD);
    const expanded = await page.locator('section[id^="rfp-"] button[aria-expanded]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-expanded')));
    expect(expanded.length >= 6 && expanded.every((v) => v === 'false'), `sections not collapsed: ${expanded}`);
  });
  await test('Detail Request details: Expand all / Collapse all', async () => {
    await page.getByRole('button', { name: 'Expand all' }).click(); await wait(150);
    let ex = await page.locator('section[id^="rfp-"] button[aria-expanded]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-expanded')));
    expect(ex.every((v) => v === 'true'), 'expand all failed');
    await page.getByRole('button', { name: 'Collapse all' }).click(); await wait(150);
    ex = await page.locator('section[id^="rfp-"] button[aria-expanded]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-expanded')));
    expect(ex.every((v) => v === 'false'), 'collapse all failed');
  });
  await test('Detail Request details: floating Jump to section opens target', async () => {
    await page.locator('button[title="Jump to section"]').click(); await wait(200);
    await page.locator('button', { hasText: /^Qualification$/ }).click(); await wait(500);
    const ex = await page.locator('#rfp-qualification button[aria-expanded]').getAttribute('aria-expanded');
    expect(ex === 'true', 'qualification not opened');
    expect(await page.locator('#rfp-qualification').isVisible(), 'not scrolled into view');
  });
  await test('Detail Documents: preview modal + download', async () => {
    await tab('Documents'); await wait(LOAD);
    await page.getByRole('button', { name: 'Preview' }).first().click(); await wait(800);
    expect(await page.getByRole('dialog', { name: 'Scope of work' }).isVisible(), 'preview not open');
    expect(await text('1. Background').count() > 0, 'preview content missing');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('dialog').getByRole('button', { name: 'Download' }).click()]);
    expect(dl.suggestedFilename().endsWith('.pdf'), 'download not pdf');
    await page.keyboard.press('Escape'); await wait(200);
    expect(await page.getByRole('dialog', { name: 'Scope of work' }).count() === 0, 'preview did not close');
  });
  await test('Detail Process: 5 accordions, current open', async () => {
    await tab('Process'); await wait(LOAD);
    for (const s of ['Request approval', 'Committee process', 'Contract', 'Certificate of Completion (CoC)', 'Closure'])
      expect(await page.locator('section > button p', { hasText: s }).count() > 0, `missing phase ${s}`);
    expect(await text('In progress').count() > 0, 'no in-progress phase');
  });
  await test('Detail Process: upcoming steps show no user', async () => {
    await page.getByRole('button', { name: 'Expand all' }).click(); await wait(200);
    const upcoming = page.locator('[data-step-state="upcoming"]');
    const n = await upcoming.count();
    expect(n > 0, 'no upcoming steps rendered');
    expect(await upcoming.locator('[data-step-user]').count() === 0, 'upcoming step shows a user');
    expect(await page.locator('[data-step-state="done"] [data-step-user]').count() > 0, 'done steps should show a user');
  });
  await test('Detail: cancel request confirmation', async () => {
    await page.getByRole('button', { name: 'Cancel request' }).first().click(); await wait(200);
    expect(await text('Cancel this request?').count() === 1, 'confirm dialog missing');
    await page.getByRole('button', { name: 'Keep request' }).click();
    expect(await text('Cancel this request?').count() === 0, 'dialog did not close');
  });
  await test('Detail: back to list', async () => {
    await page.locator('button[title="Back to My Requests"]').click(); await wait(LOAD);
    expect(await count('tbody tr') > 0, 'list not shown');
  });
  await test('Detail: E-Market request hides tender-only sections', async () => {
    await openRequest('Laptops for New Joiners');
    await tab('Request details'); await wait(LOAD);
    expect(await count('#rfp-evaluation') === 0 && await count('#rfp-payment') === 0, 'tender sections on E-Market');
    await tab('Process'); await wait(LOAD);
    expect(await text('E-Market procurement').count() > 0, 'E-Market phase missing');
  });
  await test('Detail: draft request offers Continue editing → form', async () => {
    await openRequest('Meeting Room AV Upgrade');
    expect(await page.getByRole('button', { name: 'Continue editing' }).count() === 1, 'no continue editing');
    await page.getByRole('button', { name: 'Continue editing' }).click(); await wait(LOAD);
    expect(await text('Procurement Route').count() > 0, 'form not opened');
  });
  await test('Detail: returned request offers Edit & resubmit', async () => {
    await openRequest('Digital Services Portal Development');
    expect(await page.getByRole('button', { name: 'Edit & resubmit' }).count() === 1, 'no edit & resubmit');
    await tab('Process'); await wait(LOAD);
    expect(await text('Returned').count() > 0, 'returned state missing');
  });

  await test('BOQ items tab: summary, charts, table/list, search & filter, accordion details', async () => {
    await openRequest('Cloud Infrastructure Migration');
    await tab('BOQ items'); await wait(LOAD);
    for (const s of ['Line items', 'Total value (excl. VAT)', 'Materials', 'Services', 'First delivery', 'Value by budget line', 'Top items by value', 'Delivery schedule'])
      expect(await text(s).count() > 0, `missing ${s}`);
    const cnt = async () => Number(await page.locator('[data-boq-count]').getAttribute('data-boq-count'));
    expect(await cnt() === 12, `expected 12 items, got ${await cnt()}`);
    expect(await count('tbody tr') === 12, 'table rows');
    expect(await page.getByRole('button', { name: /Cards/ }).count() === 0, 'cards view should be removed');
    await page.getByRole('button', { name: /^List/ }).click();
    expect(await text('Software Licenses').count() > 0, 'list grouped by budget line');
    await page.getByRole('button', { name: 'Materials', exact: true }).click();
    expect(await cnt() === 2, 'material filter');
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.fill('input[placeholder^="Search items"]', 'migration');
    expect(await cnt() === 1, 'search');
    await page.fill('input[placeholder^="Search items"]', 'zzz');
    expect(await text('No items match').count() === 1, 'empty state');
    await page.getByRole('button', { name: 'Clear search & filters' }).click();
    await page.locator('select[aria-label="Budget line"]').selectOption({ label: 'Implementation Services' });
    expect(await cnt() === 5, 'budget line filter');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('button', { name: /^Table/ }).click();
    await page.locator('tbody tr').first().click(); await wait(200);
    expect(await count('[data-boq-details]') === 1, 'row did not expand inline');
    expect(await page.getByRole('dialog').count() === 0, 'no popup expected');
    expect(await text('Line total (incl. VAT)').count() > 0, 'details content missing');
    await page.locator('tbody tr').first().click(); await wait(150);
    expect(await count('[data-boq-details]') === 0, 'row did not collapse');
    await page.getByRole('button', { name: 'Expand all', exact: true }).last().click(); await wait(150);
    expect(await count('[data-boq-details]') === 12, 'expand all');
    await page.getByRole('button', { name: /^List/ }).click();
    expect(await count('[data-boq-details]') === 12, 'list keeps expanded items');
    await page.getByRole('button', { name: 'Collapse all', exact: true }).last().click();
    expect(await count('[data-boq-details]') === 0, 'collapse all');
    await page.locator('#boq-item-2 button[aria-expanded]').click();
    expect(await count('[data-boq-details]') === 1, 'list row accordion');
  });

  // ── Inbox ──────────────────────────────────────────────────────────────────
  await test('Inbox: list skeleton then tasks', async () => {
    await nav('Inbox'); await wait(80);
    expect(await count('.ld-shimmer') > 0, 'no inbox skeleton');
    await wait(LOAD);
    expect(await page.locator('ul li > button:visible', { hasText: 'REQ-4433' }).count() >= 10, 'tasks missing');
  });
  await test('Inbox: task opens with loader, info toggle, request details', async () => {
    await page.locator('ul li > button:visible', { hasText: 'REQ-4433' }).first().click(); await wait(80);
    expect(await count('.ld-shimmer') > 0, 'no task skeleton');
    await wait(LOAD);
    expect(await text('This task is at the').count() === 0, 'stage note should be hidden by default');
    await page.locator('[data-task-info]').click(); await wait(200);
    expect(await page.locator('[data-task-info-pop]').getByText('This task is at the').count() === 1, 'info toggle failed');
    expect(await count('[data-action-head]') === 1, 'one action card per task');
    await page.keyboard.press('Escape'); await wait(100);
    await tab('Request details'); await wait(300);
    expect(await count('#rfp-overview') === 1, 'request details missing');
    expect(await page.locator('#rfp-overview button[aria-expanded]').getAttribute('aria-expanded') === 'true', 'inbox sections should stay open');
  });
  await test('Inbox: document preview in request details', async () => {
    await page.locator('#rfp-documents').scrollIntoViewIfNeeded();
    await page.locator('#rfp-documents').getByRole('button', { name: 'Preview' }).first().click(); await wait(800);
    expect(await page.locator('[role="dialog"]').count() > 0, 'preview did not open');
    await page.keyboard.press('Escape'); await wait(200);
  });
  await test('Inbox: CTA order Approve → Return → Reject (primary · secondary · ghost), filter tabs without scroll, project opens request in new tab', async () => {
    await page.locator('ul li > button:visible', { hasText: 'REQ-4471' }).first().click(); await wait(LOAD);
    const names = await page.locator('h2').first().locator('xpath=ancestor::div[2]').locator('button').allInnerTexts();
    const order = names.map((n) => n.trim()).filter((n) => ['Approve', 'Reject', 'Return'].includes(n));
    expect(order.join(',') === 'Approve,Return,Reject', `order: ${order}`);
    const tabsRow = page.locator('button', { hasText: 'Needs action' }).first().locator('xpath=..');
    const ov = await tabsRow.evaluate((el) => { const c = getComputedStyle(el); return [c.overflowX, c.overflowY, el.scrollWidth <= el.clientWidth]; });
    expect(!['auto', 'scroll'].includes(ov[0]) && !['auto', 'scroll'].includes(ov[1]) && ov[2], `filter row scrolls: ${ov}`);
    const link = page.locator('[data-project-link]');
    expect(await link.count() === 1, 'project link missing');
    expect(await link.getAttribute('target') === '_blank', 'link should open a new tab');
    const [tab2] = await Promise.all([page.context().waitForEvent('page'), link.click()]);
    await tab2.waitForLoadState(); await tab2.waitForTimeout(1500);
    expect(await tab2.getByText('Cloud Infrastructure Migration').count() > 0, 'request detail did not open');
    expect(await tab2.getByRole('button', { name: 'BOQ items' }).count() > 0 || await tab2.getByText('Overview').count() > 0, 'request detail tabs missing');
    await tab2.close();
    await page.locator('ul li > button:visible', { hasText: 'REQ-4433' }).first().click(); await wait(LOAD);
  });
  await test('Inbox: approve via decision dialog', async () => {
    await tab('Required action'); await wait(200);
    if (await count('[data-budget-state]')) await page.waitForSelector('[data-budget-state="ok"], [data-budget-state="short"]');
    const approve = page.getByRole('button', { name: 'Approve', exact: true }).first();
    if (await approve.isDisabled()) {
      for (const cb of await page.locator('input[type="checkbox"]:visible').all()) await cb.check().catch(() => {});
    }
    await approve.click(); await wait(300);
    expect(await text("What's next?").count() === 1, 'decision dialog missing');
    await page.getByRole('dialog').getByRole('radio', { name: /Yes/ }).first().click().catch(async () => { await page.getByRole('dialog').getByText('Yes', { exact: true }).first().click(); });
    await page.getByRole('dialog').getByRole('button', { name: 'Complete', exact: true }).click(); await wait(400);
    expect(await text("What's next?").count() === 0, 'dialog did not close');
  });

  await test('Inbox: next task arrives with a push notification and a ringing bell', async () => {
    expect(await count('[data-task-push="TSK-4433-02"]') === 1, 'push card for the next step');
    expect(Number(await page.getAttribute('[data-bell]', 'data-unread')) >= 1, 'bell unread count');
    expect(await count('[data-bell] .bell-ring') === 1, 'bell animates');
    await page.click('[data-task-push="TSK-4433-02"] [data-push-open]'); await wait(LOAD);
    expect((await page.locator('[data-task-eyebrow]').innerText()).includes('TSK-4433-02'), 'opened the new task');
    await page.click('[data-bell]'); await wait(150);
    expect(await count('[data-bell-panel] li') >= 1, 'bell list');
    await page.click('[data-bell]'); await wait(100);
  });
  await test('Inbox: task instructions sit behind an info icon next to the title', async () => {
    expect(!(/add comments on any section or field/.test(await page.locator('h2').first().innerText())), 'no visible instructions under the title');
    await page.click('[data-task-info]'); await wait(150);
    expect(await count('[data-task-info-pop]') === 1, 'popover opens on click');
    await page.keyboard.press('Escape'); await wait(100);
    expect(await count('[data-task-info-pop]') === 0, 'closes with Esc');
  });
  await test('Inbox: tasks are listed in process-flow order', async () => {
    await page.locator('[data-inbox-tab="all"]').click(); await wait(300);
    const ids = await page.locator('li[data-task-id]').evaluateAll((e) => e.map((x) => x.getAttribute('data-task-id')));
    const step = (id) => { const m = /^TSK-\d+-(\d+)(R)?(-R)?$/.exec(id); return m ? Number(m[1]) + (m[2] ? 0.5 : 0) + (m[3] ? 0.25 : 0) : 99; };
    const steps = ids.map(step);
    expect(steps.every((v, i) => i === 0 || v >= steps[i - 1]), `order: ${ids.join(', ')}`);
    expect(ids.indexOf('TSK-4433-06') < ids.indexOf('TSK-4433-09') && ids.indexOf('TSK-4433-13') < ids.indexOf('TSK-4433-14'), 'flow order');
  });

  // ── Budget checker (manager approval) ─────────────────────────────────────
  const openTask = async (ref) => { await page.locator('ul li > button:visible', { hasText: ref }).first().click(); await wait(LOAD); };
  await test('Budget checker: loads on open, approve blocked while checking', async () => {
    await nav('Dashboard').catch(() => {}); await nav('Inbox'); await wait(LOAD);
    await openTask('REQ-4471');
    expect(await page.locator('[data-budget-state="checking"]').count() === 1, 'not checking on open');
    expect(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled(), 'approve enabled while checking');
  });
  await test('Budget checker: sufficient budget enables approve (REQ-4471)', async () => {
    await page.waitForSelector('[data-budget-state="ok"]', { timeout: 4000 });
    for (const s of ['Total budget available', 'Request estimated value', 'Remaining if approved', 'of annual budget left'])
      expect(await text(s).count() > 0, `missing ${s}`);
    expect(await text('SAR 2,070,000.00').count() > 0, 'VAT-inclusive value not shown');
    expect(await text('SAR 510,000.00').count() > 0, 'remaining amount wrong');
    expect(await text('15.9% of annual budget left').count() > 0, 'remaining % wrong');
    expect(!(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled()), 'approve should be enabled');
  });
  await test('Budget checker: refresh re-runs the check', async () => {
    await page.locator('button[title="Refresh budget check"]').click(); await wait(100);
    expect(await page.locator('[data-budget-state="checking"]').count() === 1, 'refresh did not reload');
    expect(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled(), 'approve not blocked during refresh');
    await page.waitForSelector('[data-budget-state="ok"]', { timeout: 4000 });
  });
  await test('Budget checker: insufficient budget blocks approve (REQ-4478)', async () => {
    await openTask('REQ-4478');
    await page.waitForSelector('[data-budget-state="short"]', { timeout: 4000 });
    expect(await text('Insufficient budget').count() > 0, 'status chip missing');
    expect(await text('Shortfall').count() > 0 && await text('SAR 2,360,000.00').count() > 0, 'shortfall wrong');
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    expect(await approve.isDisabled(), 'approve should be blocked');
    expect((await approve.getAttribute('title') || '').includes('Insufficient budget'), 'blocked reason tooltip missing');
    expect(!(await page.getByRole('button', { name: 'Return', exact: true }).isDisabled()), 'return should stay available');
  });

  await test('Budget checker: sits below the action card', async () => {
    const order = await page.evaluate(() => {
      const review = document.querySelector('[data-action-head]');
      const budget = document.querySelector('[data-budget-state]');
      return review && budget ? !!(review.compareDocumentPosition(budget) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
    });
    expect(order === true, `budget widget not below review card (${order})`);
  });
  await test('Inbox: task names match the Tasks-list PDF (RFP → request)', async () => {
    await page.locator('[data-inbox-tab="all"]').click(); await wait(300);
    const titles = await page.locator('ul li > button:visible p:first-child, ul li > button:visible h3').allInnerTexts().catch(() => []);
    const body = (await page.locator('ul li > button:visible').allInnerTexts()).join('\n').replace(/\s+/g, ' ');
    for (const want of ['Review & approve request #4433 from Ibrahim Al-Rashid', 'Review technical evaluation criteria for request #4433 from Ibrahim Al-Rashid', 'Review request #4433 from IT & Digital', 'Review request & add qualification criteria for request #4433 from IT & Digital', 'Approval DOA', 'Approve estimated price for request #4433 from IT & Digital', 'Review & approve request #4471 from Fatima Al-Zahrani', 'Review & approve request #4478 from Khalid Al-Qahtani'])
      expect(body.includes(want), `missing task "${want}"`);
    expect(!/\bRFP\b/.test(body), 'the word RFP is still listed');
    const top3 = (await page.locator('ul li > button:visible', { hasText: 'REQ-' }).allInnerTexts()).slice(0, 3).join(' | ');
    expect(['#4478', '#4471', '#4433'].every((n) => top3.includes(`Review & approve request ${n}`)), `manager tasks not on top: ${top3.slice(0, 160)}`);
    expect((body.match(/REQ-44\d\d/g) || []).length === 17, `expected 17 tasks, got ${(body.match(/REQ-44\d\d/g) || []).length}`);
    void titles;
  });

  await test('Inbox: manager return creates the requester task dynamically', async () => {
    await page.locator('[data-inbox-tab="all"]').click(); await wait(300);
    await openTask('REQ-4471');
    await page.waitForSelector('[data-budget-state="ok"]', { timeout: 4000 });
    await page.getByRole('button', { name: 'Return', exact: true }).click(); await wait(300);
    const dlg = page.getByRole('dialog');
    await dlg.getByText('Yes', { exact: true }).first().click();
    await dlg.locator('textarea').fill('Please split the hosting line by environment.');
    await dlg.getByRole('button', { name: 'Complete', exact: true }).click(); await wait(500);
    const row = page.locator('ul li > button:visible', { hasText: 'Review comments for request #4471 added by Faisal Al-Dossari' });
    expect(await row.count() === 1, 'requester task not created');
    const ids = await page.locator('li[data-task-id]').evaluateAll((e) => e.map((x) => x.getAttribute('data-task-id')));
    expect(ids.indexOf('TSK-4471-01-R') > -1 && ids.indexOf('TSK-4471-01-R') < ids.indexOf('TSK-4433-02'), `returned task should sit with step 1: ${ids.slice(0, 6)}`);
    await row.click(); await wait(LOAD);
    expect(await page.getByRole('button', { name: 'Resubmit for approval' }).count() === 1, 'resubmit CTA missing');
    expect(await text('Please split the hosting line by environment.').count() > 0, 'return note not carried over');
  });

  await test('Technical member task: creation-page criteria in view mode with Accept / Modify', async () => {
    await page.locator('[data-inbox-tab="all"]').click(); await wait(200);
    await page.locator('ul li > button:visible', { hasText: 'Review technical evaluation criteria' }).first().click(); await wait(LOAD);
    for (const s of ['Technical Evaluation Member', 'Technical Documents List', 'Technical Requirements', 'Evaluation Criteria', 'Technical Passing Percentage'])
      expect(await text(s).count() > 0, `missing ${s}`);
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    expect(await approve.isDisabled(), 'approve should be blocked until all items are reviewed');
    await page.locator('[data-accept="req-0"]').click();
    expect(await page.locator('[data-row="req-0"]').getAttribute('data-state') === 'accepted', 'accept');
    await page.locator('[data-modify="eval-0"]').click();
    expect(await count('[data-editing]') === 1 && await count('[data-row="eval-0"]') === 0, 'modify should open only that row');
    await page.locator('[data-editing="eval-0"] input[type=number]').fill('40');
    await page.locator('[data-save="eval-0"]').click();
    expect(await page.locator('[data-row="eval-0"]').getAttribute('data-state') === 'modified', 'modified state');
    expect(await page.locator('[data-weight-total]').getAttribute('data-weight-total') !== '100', 'weight total should change');
    await page.getByRole('button', { name: 'Accept all remaining' }).click();
    expect(await approve.isDisabled(), 'approve must stay blocked while weights ≠ 100%');
    await page.locator('[data-row="eval-0"] button', { hasText: 'Undo' }).click();
    await page.locator('[data-modify="eval-0"]').click();
    const w = Number(await page.locator('[data-weight-total]').getAttribute('data-weight-total'));
    const cur = Number(await page.locator('[data-editing="eval-0"] input[type=number]').inputValue());
    await page.locator('[data-editing="eval-0"] input[type=number]').fill(String(cur - (w - 100)));
    await page.locator('[data-save="eval-0"]').click();
    expect(await page.locator('[data-weight-total]').getAttribute('data-weight-total') === '100', 'weights back to 100');
    expect(!(await approve.isDisabled()), 'approve should be enabled once everything is reviewed');
  });
  await test('Qualification task: prefilled criteria with Accept / Modify, Complete gated', async () => {
    await page.locator('ul li > button:visible', { hasText: 'Review request & add qualification criteria' }).first().click(); await wait(LOAD);
    expect(await count('[data-qual-review]') === 1, 'qualification review missing');
    for (const s of ['Qualification Member', 'Qualification Criteria', 'Previous Experience', 'Main Criteria Total: 100%'])
      expect(await text(s).count() > 0, `missing ${s}`);
    const keys = await page.locator('[data-qual-review] [data-row]').evaluateAll((els) => els.map((e) => e.getAttribute('data-row')));
    expect(keys.length > 3 && keys.includes('qm-0') && keys.includes('qs-0-0'), `rows: ${keys}`);
    expect(await count('[data-qual-review] [data-accept]') === keys.length, 'each row needs Accept');
    expect(await count('[data-qual-review] [data-modify]') === keys.length, 'each row needs Modify');
    const complete = page.getByRole('button', { name: 'Complete', exact: true });
    expect(await complete.isDisabled(), 'complete should be disabled before review');
    await page.click('[data-accept="qm-0"]');
    expect(await page.getAttribute('[data-row="qm-0"]', 'data-state') === 'accepted', 'accept failed');
    // Modify opens that row only
    await page.click('[data-modify="qs-0-0"]');
    expect(await count('[data-qual-review] [data-editing]') === 1, 'only one row should open');
    const inputs = page.locator('[data-editing="qs-0-0"] input');
    await inputs.nth(0).fill('≥ 7 years');
    await page.click('[data-save="qs-0-0"]'); await wait(150);
    expect(await page.getAttribute('[data-row="qs-0-0"]', 'data-state') === 'modified', 'modify failed');
    expect(await text('≥ 7 years').count() > 0, 'modified range not shown');
    await page.getByRole('button', { name: /Accept all remaining/ }).click(); await wait(150);
    expect(await page.locator('[data-qual-progress]').getAttribute('data-qual-progress') === `${keys.length}/${keys.length}`, 'progress');
    expect(!(await complete.isDisabled()), 'complete should be enabled after review');
    await tab('Activity'); await wait(200); await tab('Required action'); await wait(300);
    expect(await text('≥ 7 years').count() > 0, 'values lost after switching tabs');
  });

  // ── Reports ───────────────────────────────────────────────────────────────
  const rowCount = async () => Number(await page.locator('[data-row-count]').getAttribute('data-row-count'));
  await test('Reports landing: 33 report tiles in 5 groups, search, group filter, favourites', async () => {
    await nav('Reports'); await wait(LOAD);
    expect(await count('[data-report-tile]') === 33, `expected 33 tiles, got ${await count('[data-report-tile]')}`);
    for (const g of ['Procurement Overview & Performance', 'Purchase Request Reports', 'RFP & Sourcing Reports', 'Work Engine & Approval Reports', 'Purchase Order & Contract Reports'])
      expect(await page.locator('h2', { hasText: g }).count() === 1, `missing group ${g}`);
    await page.fill('input[placeholder="Search reports…"]', 'contract');
    expect(await count('[data-report-tile]') === 3, `search: ${await count('[data-report-tile]')}`);
    await page.fill('input[placeholder="Search reports…"]', '');
    await page.getByRole('button', { name: /Work Engine & approvals/ }).click();
    expect(await count('[data-report-tile]') === 7, 'group filter D');
    await page.getByRole('button', { name: /^All$/ }).click();
    await page.locator('[data-report-tile="savings"] button[title="Add to favourites"]').click();
    await page.getByRole('button', { name: /Favourites/ }).click();
    expect(await count('[data-report-tile="savings"]') === 1, 'favourite not listed');
    await page.getByRole('button', { name: /^All$/ }).click();
  });
  await test('Reports: every report opens with KPIs, charts and records (no errors)', async () => {
    const ids = await page.locator('[data-report-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-report-tile')));
    for (const id of ids) {
      await page.locator(`[data-report-tile="${id}"]`).click(); await wait(650);
      expect(await count('[data-kpi]') >= 4, `${id}: KPIs`);
      expect(await count('[data-chart]') >= 2, `${id}: charts`);
      expect(await rowCount() > 0, `${id}: no records`);
      await page.locator('button[title="Back to reports"]').click(); await wait(150);
    }
  });
  await test('Report: global filters, KPI drill-down, chart drill-down', async () => {
    await page.locator('[data-report-tile="pr-register"]').click(); await wait(LOAD);
    const all = await rowCount();
    await page.locator('select[aria-label="Department"]').selectOption('Finance');
    const fin = await rowCount();
    expect(fin > 0 && fin < all, `department filter ${fin}/${all}`);
    await page.locator('select[aria-label="Department"]').selectOption('all');
    await page.locator('[data-kpi="Approved"]').click();
    expect(await count('[data-drill]') === 1, 'KPI drill chip');
    const approved = await rowCount();
    const statuses = await page.locator('[data-report-table] tbody tr td:nth-child(7)').allInnerTexts();
    expect(approved < all && statuses.every((x) => x.includes('Approved')), 'KPI drill did not filter records');
    await page.locator('[data-drill] button').click();
    await page.locator('[data-chart="Requests by department"] button', { hasText: 'Legal Affairs' }).first().click();
    const legal = await page.locator('[data-report-table] tbody tr td:nth-child(4)').allInnerTexts();
    expect(legal.length > 0 && legal.every((x) => x.includes('Legal Affairs')), 'chart drill did not filter');
    await page.locator('[data-drill] button').click();
    expect(await rowCount() === all, 'drill not cleared');
  });
  await test('Report: role-based access limits data', async () => {
    const all = await rowCount();
    await page.locator('select[aria-label="Viewing as"]').selectOption('it-mgr'); await wait(100);
    const depts = await page.locator('[data-report-table] tbody tr td:nth-child(4)').allInnerTexts();
    expect(await rowCount() < all && depts.every((x) => x.includes('IT & Digital')), 'role restriction');
    expect(await text('limited to IT & Digital').count() === 1, 'access note');
    await page.locator('select[aria-label="Viewing as"]').selectOption('director');
  });
  await test('Report: comparison (previous period and department vs department)', async () => {
    await page.locator('select[aria-label="Period"]').selectOption('90');
    await page.locator('select[aria-label="Compare"]').selectOption('period'); await wait(100);
    expect(await count('[data-delta]') > 0, 'no period deltas');
    await page.locator('select[aria-label="Compare"]').selectOption('department'); await wait(100);
    expect(await count('select[aria-label="A"]') === 1 && await count('select[aria-label="B"]') === 1, 'A/B pickers');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
  });
  await test('Report: saved views', async () => {
    await page.locator('select[aria-label="Category"]').selectOption('Consulting');
    await page.getByRole('button', { name: 'Save view' }).click();
    const opts = await page.locator('select[aria-label="Saved view"] option').allInnerTexts();
    expect(opts.some((o) => o.includes('Consulting')), 'saved view missing');
    await page.locator('select[aria-label="Saved view"]').selectOption('default');
    expect(await page.locator('select[aria-label="Category"]').inputValue() === 'all', 'default view not restored');
    await page.locator('select[aria-label="Saved view"]').selectOption({ index: 1 });
    expect(await page.locator('select[aria-label="Category"]').inputValue() === 'Consulting', 'saved view not applied');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
  });
  await test('Report: export Excel, CSV and PDF', async () => {
    for (const [label, ext] of [['Excel (.xlsx)', '.xlsx'], ['CSV', '.csv'], ['PDF', '.pdf']]) {
      await page.getByRole('button', { name: /^Export/ }).click();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: label }).click()]);
      expect(dl.suggestedFilename().endsWith(ext), `${label} → ${dl.suggestedFilename()}`);
    }
  });
  await test('Report: schedule, definitions and data freshness', async () => {
    await page.getByRole('button', { name: /^Schedule/ }).click();
    await page.fill('input[placeholder^="name@"]', 'cfo@entity.gov.sa');
    await page.getByRole('button', { name: 'Create schedule' }).click();
    expect(await page.locator('[data-schedules] li').count() === 1, 'schedule not created');
    await page.keyboard.press('Escape'); await wait(150);
    await page.getByRole('button', { name: 'Definitions' }).click();
    expect(await page.getByRole('dialog', { name: 'Definitions' }).isVisible() && await text('Data source:').count() > 0, 'definitions panel');
    await page.keyboard.press('Escape'); await wait(150);
    await page.locator('[data-freshness]').click(); await wait(80);
    expect(await count('.ld-shimmer') > 0, 'refresh did not reload');
    await wait(LOAD);
  });

  // ── Arabic / RTL ───────────────────────────────────────────────────────────
  await test('Arabic: RTL layout on My Requests and detail', async () => {
    await page.click('button[title="التبديل إلى العربية"]'); await wait(200);
    await nav('طلباتي'); await page.waitForSelector('.ld-shimmer', { state: 'detached' }); await wait(200);
    expect((await page.locator('html').getAttribute('dir')) === 'rtl', 'dir not rtl');
    expect(await text('طلباتي').count() > 0, 'arabic title missing');
    await page.locator('tbody tr').first().locator('td').nth(2).click(); await wait(LOAD);
    expect(await text('نظرة عامة').count() > 0, 'arabic detail tabs missing');
    await page.click('button[title="Switch to English"]'); await wait(200);
  });

  // ── Mobile ─────────────────────────────────────────────────────────────────
  await test('Mobile 390px: list and detail render without page overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await nav('My Requests').catch(() => {}); await wait(LOAD);
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ow <= 1, `horizontal overflow ${ow}px`);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  // ── Request creation: BOQ empty state + Qualification import ──────────────
  const openDraft = async (seed) => {
    await page.goto(BASE); await wait(300);
    await page.evaluate((f) => localStorage.setItem('munafasat:etimad-draft', JSON.stringify(f)), seed);
    await page.goto(BASE + '?open=etimad-draft'); await wait(1500);
  };
  // Review & Confirm: skip the AI review animation, wait for the page, optionally open a reviewer tab.
  const openReview = async (tab) => {
    await page.locator('button', { hasText: 'Review & Confirm' }).first().click(); await wait(400);
    if (await count('[data-ai-skip]')) await page.click('[data-ai-skip]');
    await page.waitForSelector('[data-ai-results]', { timeout: 8000 }).catch(() => {});
    await wait(800);
    if (tab) { await page.click(`[data-ai-tab="${tab}"]`); await wait(300); }
  };
  const boqRows = () => Array.from({ length: 2 }, (_, i) => ({ id: 'r' + i, projectItem: 'Hardware', itemName: 'Server ' + (i + 1), itemDescription: 'Rack server', unitOfMeasure: 'Each', quantity: '2', unitPrice: '1000', deliveryDate: '', hasBrandName: false, brandJustification: '' }));
  const delSel = 'button[aria-label*="Delete" i], button[title*="Delete" i], button[aria-label*="Remove" i], button[title*="Remove" i]';
  for (const view of ['Table', 'Grouped', 'Grid']) {
    await test(`BOQ ${view}: deleting all rows shows the 3 options; Add manually matches the view`, async () => {
      await openDraft({ sourceType: 'tender', boqItems: boqRows() });
      await page.locator('button', { hasText: 'Bill of Quantities' }).first().click(); await wait(800);
      await page.getByRole('radio', { name: view }).click(); await wait(400);
      for (let k = 0; k < 2; k++) { await page.locator(delSel).first().click(); await wait(350); }
      for (const o of ['Upload via template', 'Generate with AI', 'Add manually'])
        expect(await page.getByRole('button', { name: new RegExp(o) }).count() === 1, `${view}: option "${o}" missing after deleting all rows`);
      await page.getByRole('button', { name: /Add manually/ }).click(); await wait(500);
      if (view === 'Table') {
        expect(await page.locator('input[placeholder="Item name"]').count() === 1, 'Table: inline row expected');
        expect(await text('Add BOQ Item').count() === 0, 'Table should not open the card form');
        await page.locator(delSel).first().click(); await wait(400);
      } else {
        expect(await text('Add BOQ Item').count() === 1, `${view}: card create form expected`);
        expect(await page.locator('input[placeholder="Item name"]').count() === 0, `${view}: should not add a table row`);
        await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await wait(400);
      }
      expect(await page.getByRole('button', { name: /Add manually/ }).count() === 1, `${view}: options should return`);
    });
  }
  await test('BOQ: with no items added, Grid / Grouped open the Add BOQ Item section by default', async () => {
    await openDraft({ sourceType: 'tender', boqItems: [] });
    await page.locator('button', { hasText: 'Bill of Quantities' }).first().click(); await wait(800);
    await page.getByRole('button', { name: /Add manually/ }).click(); await wait(400);
    for (const v of ['Grid', 'Grouped', 'Table', 'Grouped']) {
      await page.getByRole('radio', { name: v }).click(); await wait(450);
      if (v === 'Table') {
        expect(await page.locator('input[placeholder="Item name"]').count() === 1, 'Table: one inline row expected');
        expect(await text('Add BOQ Item').count() === 0, 'Table: card form should be closed');
      } else {
        expect(await text('Add BOQ Item').count() === 1, `${v}: Add BOQ Item section should be open`);
        expect(await page.locator('input[placeholder="Item name"]').count() === 0, `${v}: blank table row should not remain`);
      }
    }
  });
  await test('Qualification import: fills values for the fixed criteria only, never adds criteria', async () => {
    await openDraft({ sourceType: 'tender', boqItems: [], qualificationCriteria: [{ id: 'x-extra', name: 'Legacy extra', nameAr: 'x', percentage: 10, subCriteria: [] }] });
    await page.locator('button', { hasText: 'Qualification Criteria' }).first().click(); await wait(800);
    expect(await text('Legacy extra').count() === 0, 'non-fixed criterion should be dropped');
    await page.getByRole('button', { name: /Import from similar projects/ }).click(); await wait(500);
    await page.getByRole('button', { name: 'Select all' }).click(); await wait(150);
    await page.getByRole('button', { name: /Import \d+ selected/ }).click(); await wait(600);
    const body = await page.locator('main').first().innerText();
    for (const m of ['Previous Experience', 'Existing Contractual Obligations', 'Human Resources'])
      expect(body.split(m).length - 1 === 1, `criterion ${m} should appear exactly once`);
    expect(await text('Company Experience').count() === 0, 'library criteria must not be added');
    const vals = await page.locator('main input').evaluateAll((els) => els.map((e) => e.value));
    expect(vals.includes('7+ years') || (await text('7+ years').count()) > 0, 'imported range not applied');
    expect(/Main Criteria Total[^\n]*100%/.test(body), 'main total should be 100% after import');
  });

  await test('Technical requirements: import from similar requests (request no. + creator left, multi-select across requests)', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', technicalRequirements: [] });
    await page.locator('button', { hasText: 'Technical Evaluation' }).first().click(); await wait(700);
    await page.click('[data-import-reqs]'); await wait(400);
    const dlg = page.getByRole('dialog');
    expect(/Import technical requirements/.test(await dlg.innerText()), 'drawer title');
    expect(await dlg.locator('[data-lib-request]').count() >= 5 && /REQ-2024-0412/.test(await dlg.locator('[data-lib-request]').first().innerText()), 'request numbers in the left panel');
    expect(/Fatima Al-Zahrani/.test(await dlg.locator('[data-lib-creator]').first().innerText()), 'creator in the left panel');
    await dlg.getByRole('button', { name: /Arabic & English user interface/ }).click();
    await dlg.getByRole('button', { name: /Integration with Etimad and SADAD/ }).click();
    await dlg.getByRole('button', { name: /Cybersecurity Enhancement Program/ }).click(); await wait(150);
    await dlg.getByRole('button', { name: /NCA ECC compliance/ }).click();
    expect(/3 requirements selected across requests/.test(await dlg.innerText()), 'multi-select across requests');
    await dlg.getByRole('button', { name: /Import 3 selected/ }).click(); await wait(500);
    const vals = await page.locator('main input, main textarea').evaluateAll((els) => els.map((e) => e.value));
    for (const r of ['Arabic & English user interface', 'Integration with Etimad and SADAD', 'NCA ECC compliance']) expect(vals.includes(r), `imported ${r}`);
  });
  await test('Qualification passing percentage: required field like the technical one', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002' });
    await page.locator('button', { hasText: 'Qualification Criteria' }).first().click(); await wait(700);
    expect(await count('#qualification-passing-pct') === 1, 'field present');
    expect(/Qualification Passing Percentage/.test(await page.locator('#q-qualPassing').innerText()), 'label');
    await page.fill('#qualification-passing-pct', '120'); await wait(100);
    expect(/Cannot exceed 100%/.test(await page.locator('#q-qualPassing').innerText()), '>100 warning');
    await page.fill('#qualification-passing-pct', '60');
  });
  await test('AI pre-review: animated department review → tabs → Fix it opens the step → Apply it', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', scopeOfWork: 'Implement SAP S/4HANA cloud subscription. Integrate with HR. Employee payroll data.', paymentStages: [], evaluationCriteria: [], technicalPassingPercentage: '',
      boqItems: [['SAP S/4HANA subscription', 'Cloud ERP licences'], ['Integration with HR system', 'APIs via iPaaS']].map(([n, d], i) => ({ id: 'ai' + i, projectItem: 'Software', itemName: n, itemDescription: d, unitOfMeasure: 'Each', quantity: 2, unitPrice: 1000, deliveryDate: '', hasBrandName: false, brandJustification: '' })) });
    await page.locator('button', { hasText: 'Review & Confirm' }).first().click(); await wait(500);
    expect(await count('[data-ai-loader] [data-ai-dept-row]') === 7, 'loader lists the seven reviewers');
    expect(await page.getAttribute('[data-ai-dept-row="manager"]', 'data-state') === 'active', 'Manager reviewed first');
    expect(await count('[data-ai-wheel] [data-ai-wheel-item][data-state="active"]') === 1, 'one check in the centre of the wheel');
    expect(await count('[data-review-boq]') === 0 && await count('.review-reveal') === 0, 'rest of the page waits for the review');
    await wait(2800);
    expect(await page.getAttribute('[data-ai-wheel-item][data-state="active"]', 'data-ai-wheel-item') === 'ea-1', 'Technical standards holds the centre longer');
    const t0 = Date.now();
    await page.waitForSelector('[data-ai-results]', { timeout: 6000 }); await wait(300);
    expect(Date.now() - t0 < 4800, 'whole review done in about 7 seconds');
    expect(await count('.review-reveal [data-review-boq]') === 1, 'page sections load after the review');
    expect(await page.getAttribute('[data-ai-tab="general"]', 'aria-selected') === 'true', 'opens on General (before any tab click)');
    const tabIds = await page.locator('[data-ai-tab]').evaluateAll((e) => e.map((x) => x.getAttribute('data-ai-tab')));
    expect(tabIds.join(',') === 'general,manager,risk,ea,cyber,finance,finqual,procurement', `reviewer order: ${tabIds}`);
    await page.click('[data-ai-tab="procurement"]'); await wait(200);
    expect(!/at least 3/.test(await page.locator('[role="tabpanel"]').innerText()), 'committee needs one member, not three');
    await page.click('[data-ai-tab="risk"]'); await wait(200);
    expect(await count('[data-ai-rec="risk-sla"]') === 1, 'risk reviewer finds the missing SLA');
    await page.click('[data-ai-tab="finqual"]'); await wait(200);
    expect(await count('[data-ai-rec="fq-pass"]') === 1, 'qualification passing % sits with the finance qualification member');
    expect(/recommendations/.test(await page.locator('[data-ai-summary]').innerText()), 'summary');
    await page.click('[data-ai-tab="finance"]'); await wait(150);
    await page.click('[data-ai-fix="fin-pay"]'); await wait(700);
    expect(/Payment Schedule/.test(await page.locator('h2').first().innerText()), 'opened the Payment Schedule step');
    expect(await count('[data-ai-fix-panel="fin-pay"] [data-ai-proposal] li') >= 3, 'suggested stages shown in a separate panel');
    await page.click('[data-ai-apply]'); await wait(400);
    expect(await count('[data-ai-applied]') === 1, 'applied state');
    expect(/Total[^\n]*100%/.test(await page.locator('main').first().innerText()) || (await page.locator('main input').evaluateAll((e) => e.map((x) => x.value))).includes('55'), 'stages written into the request');
    await page.click('[data-ai-back]'); await wait(800);
    expect(await count('[data-ai-loader]') === 0, 'no re-run for our own fix');
    expect(await page.getAttribute('[data-ai-rec="fin-pay"]', 'data-state') === 'applied', 'marked applied in the list');
    await page.click('[data-ai-tab="procurement"]'); await wait(150);
    await page.click('[data-ai-fix="pr-tpass"]'); await wait(600);
    await page.click('[data-ai-apply]'); await wait(300);
    expect(await page.inputValue('#technical-passing-pct') === '70', 'passing % applied');
    await page.click('[data-ai-back]'); await wait(600);
  });
  // ── Finance accounting (BOQ) ───────────────────────────────────────────────
  const finRows = () => [['Dell PowerEdge R760 server', '2U rack server'], ['Microsoft 365 E5 annual subscription', 'User licences'], ['SAP S/4HANA implementation', 'Implementation services'], ['Installation and racking', 'On-site delivery']]
    .map(([n, d], i) => ({ id: 'f' + i, projectItem: 'Hardware', itemName: n, itemDescription: d, unitOfMeasure: 'Each', quantity: 2, unitPrice: 1000, deliveryDate: '', hasBrandName: false, brandJustification: '' }));
  await test('BOQ finance: no accordion — Purchase type & Material group shown on every line, AI-prefilled, no GL', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', boqItems: finRows() });
    await page.locator('button', { hasText: 'Bill of Quantities' }).first().click(); await wait(700);
    expect(/have been filled for 4 items/.test((await page.locator('[data-toast]').allInnerTexts()).join(' ')), 'bulk prefill toast missing');
    await page.getByRole('radio', { name: 'Grid' }).click(); await wait(300);
    expect(await count('[data-acct-toggle]') === 0, 'no Show more / accordion');
    expect(await count('[data-acct-request]') === 0, 'no request-level finance card');
    expect(await count('[data-acct-row]') === 4, 'PT / MG on every line');
    const v = await page.locator('[data-acct-row]').first().innerText();
    expect(/Purchase type/.test(v) && /IT Hardware/.test(v) && !/1230|GL/.test(v), `row values wrong: ${v}`);
    await page.getByRole('radio', { name: 'Table' }).click(); await wait(300);
    expect(await count('[data-fin="pt"]') === 4 && await count('[data-fin="mg"]') === 4, 'table shows PT / MG columns');
    expect(!(await page.locator('table thead').first().innerText()).includes('GL account'), 'no GL column');
  });
  await test('BOQ finance: typing an item shows "Determining…" then a toast; PT & MG editable, GL read-only', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', boqItems: [] });
    await page.locator('button', { hasText: 'Bill of Quantities' }).first().click(); await wait(600);
    await page.getByRole('button', { name: /Add manually/ }).click(); await wait(300);
    await page.getByRole('radio', { name: 'Grid' }).click(); await wait(300);
    await page.getByPlaceholder('Item name…').fill('Cisco Catalyst 9300 switch');
    await page.getByPlaceholder('Describe this item…').click(); await wait(200);
    expect(await count('[data-acct-loading]') === 1, 'loader missing');
    expect((await page.locator('[data-acct-loading]').innerText()).includes('Determining Purchase type, Material group'), 'loader text');
    await wait(1100);
    expect((await page.locator('[data-toast]').allInnerTexts()).some((x) => x.includes('Purchase type and Material group have been filled')), 'toast missing');
    expect(await count('[data-acct-toggle]') === 0 && await count('[data-gl-main]') === 0, 'no accordion, no GL in the form');
    const pos = await page.evaluate(() => { const u = [...document.querySelectorAll('label, span')].find((e) => e.textContent.trim() === 'Unit of Measure'); const f = document.querySelector('[data-acct-form]'); return u && f ? (u.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING ? 'after' : 'before') : 'missing'; });
    expect(pos === 'after', `PT / MG should sit below Unit of measure (${pos})`);
    expect((await page.locator('[data-acct-form]').innerText()).includes('Purchase type'), 'PT field');
  });
  await test('Review & Confirm: finance route preview with order setting', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', boqItems: finRows() });
    await openReview();
    const card = page.locator('[data-finance-routing]');
    expect(await card.getAttribute('data-finance-routing') === 'mixed', 'should be a mixed request');
    expect(/goes to Assets, then GL/.test(await page.locator('[data-routing-sentence]').innerText()), 'assets-first sentence');
    await page.click('[data-acct-toggle="routing"]'); await wait(150);
    await page.click('[data-routing-order="parallel"]'); await wait(150);
    expect(/in parallel/.test(await page.locator('[data-routing-sentence]').innerText()), 'parallel sentence');
    await page.click('[data-routing-order="assets-first"]');
  });

  // ── Finance Inbox tasks ─────────────────────────────────────────────────────
  const openTaskId = async (id) => {
    await page.goto(BASE); await wait(600);
    await nav('Inbox'); await wait(LOAD);
    const rows = page.locator('ul li > button:visible', { hasText: 'REQ-' }); const n = await rows.count();
    for (let i = 0; i < n; i++) { await rows.nth(i).click(); await wait(500); if ((await page.locator('[data-task-eyebrow]').innerText()).includes(id)) return; }
    throw new Error('task not found ' + id);
  };
  await test('GL task: lines with mismatches first, filter, Modify one row, prefilled Return, Approve gated', async () => {
    await openTaskId('TSK-4433-07');
    expect(await count('[data-gl-review]') === 1, 'GL review missing');
    await page.locator('[data-gl-review] [data-boq-view]').first().click(); await wait(200);
    expect((await page.locator('[data-gl-review] [data-boq-details]').first().innerText()).includes('GL account'), 'GL details shown in the GL task');
    await page.locator('[data-gl-review] [data-boq-view]').first().click(); await wait(100);
    const states = await page.locator('[data-gl-row]').evaluateAll((els) => els.map((e) => e.getAttribute('data-issue')));
    expect(states.length === 9 && states.slice(0, 3).every((x) => x === 'yes') && states.slice(3).every((x) => x === 'no'), `mismatches first: ${states}`);
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    expect(await approve.isDisabled(), 'approve should be gated');
    await page.click('[data-gl-filter="issues"]'); await wait(150);
    expect(await count('[data-gl-row]') === 3, 'To check filter');
    await page.click('[data-gl-filter="all"]'); await wait(150);
    await page.getByRole('button', { name: 'Return', exact: true }).click(); await wait(300);
    await page.getByRole('radio', { name: /Yes/ }).first().click().catch(() => {}); await wait(200);
    const draft = await page.locator('[role="dialog"] textarea').inputValue().catch(() => '');
    expect(draft.includes('Data migration') && draft.includes('Hypercare'), `return note not prefilled: ${draft.slice(0, 80)}`);
    await page.keyboard.press('Escape'); await wait(200);
    await page.click('[data-modify="gl-L6"]'); await wait(150);
    expect(await count('[data-editing]') === 1, 'only that row opens');
    await page.selectOption('[data-edit-pt]', 'service');
    await page.click('[data-save="L6"]'); await wait(200);
    expect(await page.getAttribute('[data-gl-row="L6"]', 'data-state') === 'modified', 'row should be modified');
    expect(await page.getAttribute('[data-gl-row="L6"]', 'data-issue') === 'no', 'fix should clear the mismatch');
    await page.click('[data-fin-all="gl"]'); await wait(200);
    expect(!(await approve.isDisabled()), 'approve should enable once all lines reviewed');
  });
  await test('Assets task: asset lines only, AUC + Group with, decisions shown in GL task', async () => {
    await openTaskId('TSK-4433-08');
    expect(await count('[data-asset-line]') === 4, 'expected 4 asset-flagged BOQ items');
    expect(await count('[data-assets-context]') === 0, 'project context panel removed');
    const first = page.locator('[data-asset-line]').first();
    await first.locator('[data-cap="auc"]').click();
    const key = await first.getAttribute('data-asset-line');
    await first.locator(`[data-group="${key}"]`).selectOption({ index: 1 });
    await first.locator(`[data-confirm="${key}"]`).click(); await wait(150);
    expect(await first.getAttribute('data-confirmed') === 'yes', 'confirm failed');
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    expect(await approve.isDisabled(), 'approve gated until all confirmed');
    // Non-asset BOQ items are listed too, collapsed; one can be moved into the asset group.
    expect(await count('[data-nonassets]') === 1, 'non-asset group missing');
    expect(await count('[data-nonasset-line]') === 0, 'non-asset group should start collapsed');
    await page.click('[data-nonassets-toggle]'); await wait(150);
    expect(await count('[data-nonasset-line]') === 5, 'expected 5 non-asset BOQ items');
    await page.click('[data-mark-asset="L9"]'); await wait(150);
    expect(await count('[data-asset-line]') === 5 && await count('[data-promoted]') === 1, 'marked item should move to the asset group');
    expect(await count('[data-nonasset-line]') === 4, 'marked item should leave the non-asset list');
    await page.click('[data-fin-all="assets"]'); await wait(150);
    expect(await approve.isDisabled(), 'approve still gated until the non-asset items are checked');
    await page.click('[data-none-assets]'); await wait(150);
    expect(await page.getAttribute('[data-nonassets]', 'data-checked') === 'yes', 'non-asset check not recorded');
    expect(!(await approve.isDisabled()), 'approve should enable');
    const glRow = page.locator('ul li > button:visible', { hasText: 'REQ-4433' });
    const n = await glRow.count();
    for (let i = 0; i < n; i++) { await glRow.nth(i).click(); await wait(400); if ((await page.locator('[data-task-eyebrow]').innerText()).includes('TSK-4433-07')) break; }
    const banner = await page.locator('[data-assets-decided]').innerText();
    expect(banner.includes('Assets decided') && banner.includes('Asset Under Construction') && banner.includes('grouped with'), `banner: ${banner.slice(0, 120)}`);
  });
  await test('Changes since your review: impact groups, Re-open my review turns into a GL review', async () => {
    await openTaskId('TSK-4429-07R');
    expect(await count('[data-changes-review]') === 1, 'changes panel missing');
    for (const [k, v] of [['rereview', 3], ['decide', 2], ['info', 1]])
      expect((await page.locator(`[data-impact-count="${k}"]`).innerText()).startsWith(String(v)), `impact ${k}`);
    expect(await page.getByRole('button', { name: 'No re-review needed' }).count() === 1 && await count('[data-reopen]') === 1, 'decision once in the header + Re-open in the card');
    await page.click('[data-reopen]'); await wait(300);
    expect(await count('[data-gl-review]') === 1, 'should switch to the GL review');
  });

  // ── Enterprise Architecture ────────────────────────────────────────────────
  const eaRows = (pairs) => pairs.map(([n, d], i) => ({ id: 'e' + i, projectItem: 'Software', itemName: n, itemDescription: d, unitOfMeasure: 'Each', quantity: 2, unitPrice: 1000, deliveryDate: '', hasBrandName: false, brandJustification: '' }));
  await test('EA scope: technology items require EA review; consultancy does not', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', boqItems: eaRows([['SAP S/4HANA subscription', 'Cloud ERP licences'], ['Integration with HR system', 'APIs via iPaaS']]) });
    await openReview();
    expect(await page.getAttribute('[data-ea-route]', 'data-ea-route') === 'required', 'tech request should need EA');
    const why = await page.locator('[data-ea-sentence]').innerText();
    expect(/software licences/i.test(why) && /integration/i.test(why), `reasons: ${why}`);
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', boqItems: eaRows([['Governance consultancy', 'Advisory on quality and performance measurement']]) });
    await openReview();
    expect(await page.getAttribute('[data-ea-route]', 'data-ea-route') === 'not-required', 'consultancy should not need EA');
    expect(/consultancy/i.test(await page.locator('[data-ea-sentence]').innerText()), 'exclusion reason');
  });
  await test('Technical standards: worked out in Review & Confirm from earlier steps; asks only what is missing', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002',
      scopeOfWork: 'Implement SAP S/4HANA as a cloud subscription hosted by the vendor. Integrate with the HR system and Etimad through APIs. Migrate open items and three years of history from the legacy ECC system. Employee and payroll data will be processed. Internal staff use only.',
      boqItems: eaRows([['SAP S/4HANA subscription', 'Cloud ERP licences'], ['Integration with HR system', 'APIs via iPaaS']]) });
    await page.locator('button', { hasText: 'Scope of Work' }).first().click(); await wait(600);
    expect(await count('[data-tech-standards]') === 0, 'not in Scope of Work any more');
    await openReview('ea');
    expect(await count('[data-tech-standards]') === 1, 'in Review & Confirm');
    for (const id of ['saas', 'integrates', 'migration', 'personal-data', 'external-users']) expect(await page.getAttribute(`[data-answer="${id}"]`, 'data-source') === 'derived', `${id} derived from the request`);
    expect(await page.getAttribute('[data-answer="external-users"]', 'data-yes') === null, 'internal use → No');
    await page.click('[data-ai-tab="general"]'); await wait(200);
    expect(await count('[data-before-item="tech-questions"]') === 1, 'open questions listed in the General tab');
    await page.click('[data-ai-tab="ea"]'); await wait(300);
    for (let i = 0; i < 10 && await count('[data-q]'); i++) { await page.click('[data-q-answer="no"]'); await wait(150); }
    await wait(200);
    expect(await page.getAttribute('[data-tech-standards]', 'data-std-phase') === 'built', 'standards built');
    expect(await page.getAttribute('[data-tech-standards] [data-deploy-result]', 'data-deploy-result') === 'saas', 'SaaS from scope');
    await page.click('[data-std-group="data"] > button'); await wait(150);
    expect(await page.getAttribute('[data-std="d4"]', 'data-std-state') === 'included', 'PDPL from personal data');
    expect(await page.getAttribute('[data-std="d2"]', 'data-std-state') === 'included', 'migration std');
    // Change a derived answer → rebuilt
    await page.click('[data-answer="saas"]'); await wait(150);
    await page.click('[data-q="saas"] [data-q-answer="no"]'); await wait(300);
    expect(await page.getAttribute('[data-tech-standards] [data-deploy-result]', 'data-deploy-result') === 'on-prem', 'rebuilt as on-prem');
    expect(await page.getAttribute('[data-answer="saas"]', 'data-source') === 'user', 'now the requester’s answer');
    await page.click('[data-std-group="hosting"] > button'); await wait(150);
    expect(await page.getAttribute('[data-std="h3"]', 'data-std-state') === 'included', 'on-prem spec added');
    await page.click('[data-std-na="h2"]'); await wait(100);
    await page.click('[data-ai-tab="general"]'); await wait(200);
    expect(await count('[data-before-item="na-reason"]') === 1, 'N/A needs a reason before submit');
    await page.click('[data-ai-tab="ea"]'); await wait(300);
    await page.click('[data-std-group="hosting"] > button').catch(() => {}); await wait(150);
    if (!(await count('[data-std-reason="h2"]'))) { await page.click('[data-std-group="hosting"] > button'); await wait(150); }
    await page.fill('[data-std-reason="h2"]', 'Hosted by a government cloud provider under a separate contract');
    await page.click('[data-ai-tab="general"]'); await wait(200);
    expect(await count('[data-before-item="na-reason"]') === 0, 'reason given');
  });
  await test('Technical standards: licence renewal reads "not a new build" and skips migration', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', boqItems: eaRows([['Microsoft 365 licence renewal', 'Annual subscription renewal']]) });
    await openReview('ea');
    expect(await page.getAttribute('[data-answer="build"]', 'data-source') === 'derived' && await page.getAttribute('[data-answer="build"]', 'data-yes') === null, 'build = No from the BOQ');
    expect(await count('[data-answer="migration"], [data-q="migration"]') === 0, 'migration not asked');
  });
  await test('Continue is blocked when a step would be returned (short Scope of Work)', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', scopeOfWork: 'Implement ERP system.', executionLocation: 'Riyadh', startDate: '2027-01-01', contractDuration: '12' });
    await page.locator('button', { hasText: 'Scope of Work' }).first().click(); await wait(600);
    expect(await count('[data-detail-meter="sow"]') === 1, 'word meter under the scope');
    await page.click('[data-continue]'); await wait(300);
    expect(await count('[data-quality-gate] [data-quality-issue="sow"]') === 1, 'gate lists the short scope');
    await page.click('[data-quality-fix]'); await wait(700);
    expect(await count('[data-quality-gate]') === 0, 'gate closed');
    expect(/Scope of Work/.test(await page.locator('h2').first().innerText()), 'still on Scope of Work');
    await page.locator('#q-scopeOfWork textarea').fill('Implement SAP S/4HANA Finance, Procurement and Funds Management for the IT department. The vendor delivers blueprint, configuration, data migration, integration with Etimad and HR, testing, training and three months of hypercare. Hosting and hardware are out of scope. Work is delivered in Riyadh with weekly status reporting to the PMO.');
    expect(await page.getAttribute('[data-detail-meter="sow"]', 'data-ok') !== null, 'meter turns green');
    await page.click('[data-continue]'); await wait(600);
    expect(await count('[data-quality-gate]') === 0 && /Bill of Quantities/.test(await page.locator('h2').first().innerText()), 'moved on to BOQ');
  });
  await test('Review & Confirm: no BOQ chart, view icon opens the item drawer; technical standards summary', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', techAnswers: { saas: true, 'own-servers': false, build: true, integrates: true, migration: false, 'personal-data': true, 'external-users': false, critical: true, ai: false }, deploymentModel: 'saas', techStandards: [{ id: 'h1', status: 'included' }, { id: 'd4', status: 'included', ai: true }, { id: 'a1', status: 'na', naReason: 'Documented already' }], boqItems: eaRows([['SAP S/4HANA subscription', 'Cloud ERP licences'], ['Integration with HR system', 'APIs via iPaaS']]) });
    await openReview();
    expect(await count('[data-review-boq]') === 1, 'BOQ table');
    expect(!/\bsubtotal\b/.test(await page.locator('[data-review-boq]').locator('xpath=..').innerText()), 'donut removed');
    await page.click('[data-review-boq] [data-boq-view="0"]'); await wait(250);
    expect(await count('[data-review-boq] [data-boq-details-inline]') === 1, 'inline details open');
    const dt = await page.locator('[data-review-boq] [data-boq-details]').innerText();
    for (const k of ['Item name', 'Description', 'Category', 'Budgeted item', 'Purchase type', 'Material group', 'Unit of measure', 'Line total (incl. VAT)']) expect(dt.includes(k), `view mode missing ${k}`);
    expect(!dt.includes('GL account') && !/\bFINANCE\b|\bFinance\b/.test(dt), 'no Finance group / GL outside finance tasks');
    expect(await count('[data-boq-drawer]') === 0, 'no drawer');
    expect(await page.getAttribute('[data-review-boq] [data-boq-view="0"]', 'data-open') === 'true', 'eye expanded');
    await page.click('[data-review-boq] [data-boq-view="1"]'); await wait(150);
    expect(await count('[data-review-boq] [data-boq-details-inline]') === 2, 'accordion keeps both open');
    await page.click('[data-review-boq] [data-boq-view="0"]'); await page.click('[data-review-boq] [data-boq-view="1"]'); await wait(150);
    expect(await count('[data-review-boq] [data-boq-details-inline]') === 0, 'collapsed');
    await page.click('[data-ai-tab="ea"]'); await wait(300);
    expect(await count('[data-ai-standards] [data-std-review]') === 1, 'tech standards inside the EA review tab');
    expect(await page.getAttribute('[data-tech-standards] [data-deploy-result]', 'data-deploy-result') === 'saas', 'deployment');
    expect(await count('[data-tech-standards] [data-answer]') === 9, 'answer tiles');
  });
  await test('BOQ view icon in Inbox request tab and request detail BOQ items', async () => {
    await openTaskId('TSK-4433-06');
    await tab('Request details'); await wait(600);
    const btn = page.locator('[data-boq-view]').first();
    if (await btn.count() === 0) throw new Error('no view icon in inbox request tab');
    await btn.click(); await wait(250);
    expect(await count('[data-boq-details-inline]') === 1, 'inbox inline details');
    await btn.click(); await wait(150);
    await openRequest('Cloud Infrastructure Migration');
    await tab('BOQ items'); await wait(LOAD);
    await page.locator('tbody [data-boq-view]').first().click(); await wait(250);
    expect(await count('[data-boq-details]') === 1, 'request detail accordion');
    expect(await count('[data-boq-drawer]') === 0, 'no drawer');
  });
  await test('EA task: Hosting & deployment shows deployment card, answer tiles and a clean standards list', async () => {
    await openTaskId('TSK-4433-06');
    const h = page.locator('[data-ea-hosting]');
    expect(await h.locator('[data-deploy-result="saas"]').count() === 1, 'deployment card');
    expect(await h.locator('[data-answer]').count() === 9, 'answer tiles');
    expect(await h.locator('[data-std-row]').count() >= 3, 'standards rows');
    await page.locator('[data-ea-section="licences"] [data-boq-view]').first().click(); await wait(250);
    expect(await count('[data-ea-section="licences"] [data-boq-details-inline]') === 1, 'licence inline details');
  });
  await test('EA task: only EA sections, comment one, return needs a reason, accept all unlocks Approve', async () => {
    await openTaskId('TSK-4433-06');
    const ids = await page.locator('[data-ea-section]').evaluateAll((e) => e.map((x) => x.getAttribute('data-ea-section')));
    expect(ids.includes('scope') && ids.includes('licences') && ids.includes('std-security') && !ids.includes('std-delivery'), `sections: ${ids}`);
    expect(await count('[data-ea-outside]') === 1, 'outside-scope group missing');
    expect(await count('[data-ea-task-why]') === 1, 'why EA reviews missing');
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    expect(await approve.isDisabled(), 'approve gated');
    await page.click('[data-ea-comment="licences"]');
    await page.fill('[data-ea-comment-text="licences"]', 'Professional licences: 500 requested, 420 agreed in the assessment.');
    await page.click('[data-ea-save="licences"]'); await wait(150);
    expect(await page.getAttribute('[data-ea-section="licences"]', 'data-state') === 'comment', 'comment saved');
    await page.getByRole('button', { name: 'Return', exact: true }).click(); await wait(300);
    await page.getByRole('radio', { name: /Yes/ }).first().click(); await wait(150);
    expect((await page.locator('[role="dialog"] textarea').inputValue()).includes('500 requested'), 'return prefilled with comment');
    const done = page.locator('[role="dialog"]').getByRole('button', { name: 'Complete' });
    expect(await done.isDisabled(), 'return needs a reason');
    await page.click('[data-ea-reason="quantity"]'); await wait(100);
    expect(!(await done.isDisabled()), 'reason picked → can return');
    await page.keyboard.press('Escape'); await wait(200);
    await page.click('[data-ea-all]'); await wait(150);
    expect(!(await approve.isDisabled()), 'approve should enable once every section is reviewed');
  });

  // ── Cybersecurity review (EA pattern) ───────────────────────────────────────
  await test('Cyber task: sections, accept / comment with autosaved draft, insert library clause, gated Submit review', async () => {
    await openTaskId('TSK-4433-03');
    expect(await count('[data-cyber-review]') === 1, 'cyber review missing');
    for (const s of ['scope', 'tech', 'integration', 'data', 'security']) expect(await count(`[data-cyber-section="${s}"]`) === 1, `section ${s}`);
    const submit = page.getByRole('button', { name: 'Submit review', exact: true });
    expect(await submit.isDisabled(), 'submit gated until every requirement is reviewed');
    await page.click('[data-cyber-accept="scope"]'); await wait(100);
    expect(await page.getAttribute('[data-cyber-row="scope"]', 'data-state') === 'accepted', 'scope accepted');
    // Draft survives closing the editor and switching tasks
    await page.click('[data-cyber-comment="std-s1"]');
    const long = 'Attach the ECC compliance matrix. '.repeat(30);
    await page.fill('[data-cyber-comment-input="std-s1"]', long); await wait(150);
    await page.locator('[data-cyber-row="std-s1"]').getByRole('button', { name: 'Close' }).click(); await wait(100);
    await page.click('[data-inbox-tab="all"]'); await wait(200);
    await page.locator('li[data-task-id="TSK-4471-01"] button').click(); await wait(LOAD);
    await page.locator('li[data-task-id="TSK-4433-03"] button').click(); await wait(LOAD);
    await page.click('[data-cyber-comment="std-s1"]'); await wait(100);
    expect((await page.inputValue('[data-cyber-comment-input="std-s1"]')).length === long.length, 'draft kept, no length limit');
    await page.click('[data-cyber-save="std-s1"]'); await wait(100);
    expect(await page.getAttribute('[data-cyber-row="std-s1"]', 'data-state') === 'comment', 'comment saved');
    // Library clause goes into the request
    await page.click('[data-cyber-add="data"]'); await wait(200);
    await page.click('[data-clause-insert="c-residency"]'); await wait(200);
    expect(await count('[data-cyber-section="data"] [data-cyber-added]') === 1, 'clause inserted in Data section');
    await tab('Request details'); await wait(400);
    expect(await text('Data residency in KSA').count() > 0, 'clause visible in the request');
    await tab('Required action'); await wait(300);
    // Return needs a Cyber reason; note prefilled with comments
    await page.getByRole('button', { name: 'Return', exact: true }).click(); await wait(300);
    await page.getByRole('radio', { name: /Yes/ }).first().click(); await wait(150);
    expect((await page.locator('[role="dialog"] textarea').inputValue()).includes('ECC compliance matrix'), 'return prefilled with comments');
    const done = page.locator('[role="dialog"]').getByRole('button', { name: 'Complete' });
    expect(await done.isDisabled(), 'reason required');
    expect(await count('[data-ea-reason="no-class"]') === 1, 'cyber reasons listed');
    await page.click('[data-ea-reason="missing-sec"]'); await wait(100);
    expect(!(await done.isDisabled()), 'reason picked');
    await page.keyboard.press('Escape'); await wait(200);
    await page.click('[data-cyber-all]'); await wait(150);
    expect(!(await submit.isDisabled()), 'submit enabled once all reviewed');
  });

  // ── Team queue · delegation · Excel ─────────────────────────────────────────
  await test('TL view: header persona switch shows the team-queue banner; queue only in TL view', async () => {
    await page.goto(BASE); await wait(600); await nav('Inbox'); await wait(LOAD);
    expect(await count('[data-scope-switch]') === 0 && await count('[data-team-banner]') === 0, 'no team queue outside TL view');
    await page.click('[data-persona-switch]'); await wait(150);
    await page.click('[data-persona="tl"]'); await wait(200);
    expect(await count('[data-tl-tag]') === 1, 'TL view tag in header');
    expect(await page.getAttribute('[data-team-banner]', 'data-team-banner') === '4', 'banner counts unassigned');
    await page.click('[data-team-banner-open]'); await wait(300);
    expect(await page.getAttribute('[data-scope-panel]', 'data-scope-panel') === 'team', 'banner opens the team queue');
  });
  await test('Team queue: switch from Inbox title, assign to an officer, row moves to Assigned', async () => {
    await page.click('[data-scope-switch]'); await wait(150);
    await page.click('[data-scope="mine"]'); await wait(200);
    await page.click('[data-scope-switch]'); await wait(150);
    await page.click('[data-scope="team"]'); await wait(300);
    expect(await count('li[data-task-id]') === 4, 'four unassigned requests');
    expect(await count('[data-row-unassigned]') === 4, 'unassigned chips');
    await page.locator('li[data-task-id="TSK-4487-12"] button').click(); await wait(LOAD);
    expect(await count('[data-assign-picker] [data-assign-to]') === 4, 'officers listed (TL excluded)');
    await page.click('[data-assign-to="u-amal"]'); await wait(100);
    await page.click('[data-assign-confirm]'); await wait(200);
    expect(await count('[data-task-assigned]') === 1, 'assigned banner');
    expect(await count('li[data-task-id="TSK-4487-12"]') === 0, 'gone from Unassigned');
    await page.click('[data-inbox-tab="completed"]'); await wait(200);
    expect(await count('li[data-task-id="TSK-4487-12"]') === 1, 'listed under Assigned');
    await page.click('[data-scope-switch]'); await page.click('[data-scope="mine"]'); await wait(300);
    expect(await count('li[data-task-id^="TSK-4487"]') === 0, 'not in my tasks');
  });
  await test('Delegation: dialog summary, banner, tasks move, cancel brings them back', async () => {
    const before = Number(await page.locator('[data-inbox-count]').innerText());
    await page.click('[data-delegate-open]'); await wait(200);
    expect(Number(await page.getAttribute('[data-delegate-summary]', 'data-delegate-summary')) === before, 'summary counts tasks that move');
    await page.click('[data-delegate-to="u-rawan"]'); await wait(80);
    await page.click('[data-delegate-apply]'); await wait(200);
    expect((await page.locator('[data-delegation-banner]').innerText()).includes('Rawan'), 'banner names the delegate');
    expect(Number(await page.locator('[data-inbox-count]').innerText()) === 0, 'needs action empties');
    await page.click('[data-inbox-tab="all"]'); await wait(200);
    expect(await count('[data-row-delegated]') === before, 'rows marked With Rawan');
    await page.locator('li[data-task-id] button').first().click(); await wait(LOAD);
    expect(await count('[data-task-delegated]') === 1 && await page.getByRole('button', { name: 'Approve', exact: true }).count() === 0, 'delegated task is read-only');
    await page.click('[data-delegation-cancel]'); await wait(200);
    expect(await count('[data-delegation-banner]') === 0 && Number(await page.locator('[data-inbox-count]').innerText()) === before, 'cancel restores');
  });
  await test('Inbox: more menu downloads the list as Excel', async () => {
    await page.click('[data-inbox-more]'); await wait(150);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export-excel]')]);
    expect(/\.xlsx$/.test(dl.suggestedFilename()), `file ${dl.suggestedFilename()}`);
  });

  // ── Layouts: Compact (default) / List ──────────────────────────────────────
  await test('List view: More → View → List; row decisions, gated rows locked, eye opens the task page', async () => {
    await page.goto(BASE); await wait(600); await nav('Inbox'); await wait(LOAD);
    await page.click('[data-inbox-more]'); await wait(120);
    await page.hover('[data-view-menu]'); await wait(200);
    expect(await count('[data-view-sub]') === 1, 'View submenu opens on hover');
    await page.click('[data-layout="list"]'); await wait(LOAD);
    expect(await count('[data-layout-active="list"]') === 1 && await count('[data-list-row]') === Number(await page.locator('[data-inbox-count]').innerText()), 'table lists the tasks');
    expect(await page.locator('[data-list-row="TSK-4478-01"] [data-row-action="approve"]').isDisabled(), 'insufficient budget blocks approve in the row');
    expect(await page.locator('[data-list-row="TSK-4433-02"] [data-row-action="approve"]').isDisabled(), 'gated approve locked in the row');
    await page.click('[data-sort="due"]'); await wait(100);
    // Approve from the row
    await page.click('[data-list-row="TSK-4471-01"] [data-row-action="approve"]'); await wait(300);
    await page.getByRole('radio', { name: /Yes/ }).first().click(); await wait(100);
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Complete' }).click(); await wait(300);
    expect(await count('[data-list-row="TSK-4471-01"]') === 0, 'approved row leaves Needs action');
    // Eye → full page, everything from the task detail is there
    await page.click('[data-row-view="TSK-4433-03"]'); await wait(LOAD);
    expect(await count('[data-task-page] [data-task-breadcrumb]') === 1 && await count('[data-cyber-review]') === 1, 'task page with breadcrumb and the Cyber panel');
    expect(await count('[data-action-head] [data-review-link]') === 1, 'Comment on request inside the action card');
    await page.click('[data-task-back]'); await wait(300);
    expect(await count('[data-inbox-list]') === 1, 'back to the list');
    // Back to compact for the rest of the suite
    await page.click('[data-inbox-more]'); await page.hover('[data-view-menu]'); await wait(150);
    await page.click('[data-layout="compact"]'); await wait(300);
    expect(await count('[data-layout-active="compact"]') === 1, 'compact restored');
  });

  // ── Business continuity & third-party risk (Review & Confirm) ──────────────
  await test('Review & Confirm: BCM screening reads the service, adds continuity clauses, blocks submit until values and risk checklist are filled', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002',
      scopeOfWork: 'Provide a 24/7 security monitoring service for the bank SOC with on-site operators, covering SIEM triage, incident escalation and monthly reporting.' });
    await openReview('risk');
    expect(await count('[data-ai-continuity] [data-continuity]') === 1, 'panel in the Risk tab');
    expect(await page.getAttribute('[data-bcm-verdict]', 'data-bcm-verdict') === 'applies', 'BCM applies from the service');
    expect(await count('[data-bcm-clause="backup"]') === 1, 'staff clauses because the service relies on people');
    await page.click('[data-ai-tab="general"]'); await wait(200);
    expect(await count('[data-ai-general-item="bcm-values"]') === 1, 'missing values listed before submit');
    await page.click('[data-ai-general-item="bcm-values"] button'); await wait(500);
    for (const id of ['rto', 'rpo', 'incident', 'replace']) await page.fill(`[data-bcm-value="${id}"]`, id === 'replace' ? '5 working days' : '2 hours');
    // Answer whatever the request could not
    for (let i = 0; i < 12 && await count('[data-cr-questions] [data-cr-answer="no"]'); i++) { await page.locator('[data-cr-questions] [data-cr-answer="no"]').first().click(); await wait(120); }
    expect(await page.getAttribute('[data-continuity]', 'data-cr-open') === '0', 'everything answered');
    expect(await count('[data-tpr-rating]') === 1, 'risk rating shown');
    await page.click('[data-ai-tab="general"]'); await wait(200);
    expect(await count('[data-ai-general-item="bcm-values"]') === 0 && await count('[data-ai-general-item="cr-questions"]') === 0, 'no continuity items left');
  });
  await test('Review & Confirm: a supplementary service (branding) → BCM not applicable, no clauses', async () => {
    await openDraft({ sourceType: 'tender', costCenterId: 'cc-2401', projectId: 'proj-002', scopeOfWork: 'Refresh the bank branding and brand identity guidelines for the Communications department, including templates and marketing collateral.' });
    await openReview('risk');
    for (let i = 0; i < 6 && await count('[data-bcm-screening] [data-cr-questions] [data-cr-answer="no"]'); i++) { await page.locator('[data-bcm-screening] [data-cr-answer="no"]').first().click(); await wait(120); }
    expect(await page.getAttribute('[data-bcm-verdict]', 'data-bcm-verdict') === 'na', 'not applicable');
    expect(await count('[data-bcm-clauses]') === 0, 'no clauses');
  });

  // ── BCM & ORM review tasks (Cyber pattern) ─────────────────────────────────
  await test('BCM task: applicability + clauses, add a clause from the library into the request, BCM return reasons, gated submit', async () => {
    await openTaskId('TSK-4433-04');
    expect(await page.getAttribute('[data-cyber-review]', 'data-dept') === 'bcm', 'BCM review');
    for (const sec of ['applicability', 'scope', 'continuity']) expect(await count(`[data-cyber-section="${sec}"]`) === 1, `section ${sec}`);
    const submit = page.getByRole('button', { name: 'Submit review', exact: true });
    expect(await submit.isDisabled(), 'gated');
    await page.click('[data-cyber-add="continuity"]'); await wait(200);
    await page.click('[data-clause-insert="iso"]'); await wait(200);
    expect(await page.getAttribute('[data-cyber-row="bcm-iso"]', 'data-state') === 'accepted', 'inserted clause counts as accepted');
    await page.getByRole('button', { name: 'Return', exact: true }).click(); await wait(300);
    await page.getByRole('radio', { name: /Yes/ }).first().click(); await wait(100);
    expect(await count('[data-ea-reason="bcm-values"]') === 1 && await count('[data-ea-reason="bcm-doc"]') === 1, 'BCM return reasons');
    await page.keyboard.press('Escape'); await wait(200);
    await tab('Request details'); await wait(400);
    expect(await count('[data-rfp-bcm="iso"]') === 1, 'clause visible in the request');
    await tab('Required action'); await wait(300);
    await page.click('[data-cyber-all]'); await wait(150);
    expect(!(await submit.isDisabled()), 'submit enabled');
  });
  await test('ORM task: checklist + risk rating (WAEI), add a control, Confirm review', async () => {
    await page.click('[data-inbox-tab="all"]'); await wait(200);
    await page.locator('li[data-task-id="TSK-4433-05"] button').click(); await wait(LOAD);
    expect(await page.getAttribute('[data-cyber-review]', 'data-dept') === 'orm', 'ORM review');
    expect((await page.locator('[data-cyber-row="tpr-rating"]').innerText()).includes('WAEI'), 'rating row flags WAEI monitoring');
    await page.click('[data-cyber-add="controls"]'); await wait(200);
    await page.click('[data-clause-insert="audit"]'); await wait(200);
    expect(await count('[data-cyber-row="orm-audit"]') === 1, 'control added');
    const confirm = page.getByRole('button', { name: 'Confirm review', exact: true });
    expect(await confirm.isDisabled(), 'gated');
    await page.click('[data-cyber-all]'); await wait(150);
    expect(!(await confirm.isDisabled()), 'confirm enabled');
  });

  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass}/${results.length} passed\n`);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      → ${r.err}  [${r.shot}]`}`);
  process.exit(pass === results.length ? 0 : 1);
})();
