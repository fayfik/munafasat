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
  const before = errors.length;
  try {
    await fn();
    expect(errors.length === before, `page error: ${errors.slice(before).join(' | ')}`);
    results.push({ name, ok: true });
  } catch (e) {
    const shot = `${OUT}/FAIL-${results.length + 1}.png`;
    await page.screenshot({ path: shot }).catch(() => {});
    results.push({ name, ok: false, err: String(e.message || e).split('\n')[0], shot });
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
    await page.locator('#boq-item-2 > button').click();
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
    await page.locator('button[aria-pressed]').first().click(); await wait(200);
    expect(await text('This task is at the').count() === 1, 'info toggle failed');
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
  await test('Inbox: CTA order Approve → Reject → Return, filter tabs without scroll, project opens request in new tab', async () => {
    await page.locator('ul li > button:visible', { hasText: 'REQ-4471' }).first().click(); await wait(LOAD);
    const names = await page.locator('h2').first().locator('xpath=ancestor::div[2]').locator('button').allInnerTexts();
    const order = names.map((n) => n.trim()).filter((n) => ['Approve', 'Reject', 'Return'].includes(n));
    expect(order.join(',') === 'Approve,Reject,Return', `order: ${order}`);
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

  await test('Budget checker: sits below "Review the request details"', async () => {
    const order = await page.evaluate(() => {
      const review = [...document.querySelectorAll('p')].find((p) => p.textContent === 'Review the request details');
      const budget = document.querySelector('[data-budget-state]');
      return review && budget ? !!(review.compareDocumentPosition(budget) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
    });
    expect(order === true, `budget widget not below review card (${order})`);
  });
  await test('Inbox: task names match the Tasks-list PDF (RFP → request)', async () => {
    await page.getByRole('button', { name: /^All\s*16/ }).click(); await wait(300);
    const titles = await page.locator('ul li > button:visible p:first-child, ul li > button:visible h3').allInnerTexts().catch(() => []);
    const body = (await page.locator('ul li > button:visible').allInnerTexts()).join('\n').replace(/\s+/g, ' ');
    for (const want of ['Review & approve request #4433 from Ibrahim Al-Rashid', 'Review technical evaluation criteria for request #4433 from Ibrahim Al-Rashid', 'Review request #4433 from IT & Digital', 'Review request & add qualification criteria for request #4433 from IT & Digital', 'Approval DOA', 'Approve estimated price for request #4433 from IT & Digital', 'Review & approve request #4471 from Fatima Al-Zahrani', 'Review & approve request #4478 from Khalid Al-Qahtani'])
      expect(body.includes(want), `missing task "${want}"`);
    expect(!/\bRFP\b/.test(body), 'the word RFP is still listed');
    const top3 = (await page.locator('ul li > button:visible', { hasText: 'REQ-' }).allInnerTexts()).slice(0, 3).join(' | ');
    expect(['#4478', '#4471', '#4433'].every((n) => top3.includes(`Review & approve request ${n}`)), `manager tasks not on top: ${top3.slice(0, 160)}`);
    expect((body.match(/REQ-44\d\d/g) || []).length === 16, `expected 16 tasks, got ${(body.match(/REQ-44\d\d/g) || []).length}`);
    void titles;
  });

  await test('Inbox: manager return creates the requester task dynamically', async () => {
    await page.getByRole('button', { name: /^All\s*\d+/ }).click(); await wait(300);
    await openTask('REQ-4471');
    await page.waitForSelector('[data-budget-state="ok"]', { timeout: 4000 });
    await page.getByRole('button', { name: 'Return', exact: true }).click(); await wait(300);
    const dlg = page.getByRole('dialog');
    await dlg.getByText('Yes', { exact: true }).first().click();
    await dlg.locator('textarea').fill('Please split the hosting line by environment.');
    await dlg.getByRole('button', { name: 'Complete', exact: true }).click(); await wait(500);
    const row = page.locator('ul li > button:visible', { hasText: 'Review comments for request #4471 added by Faisal Al-Dossari' });
    expect(await row.count() === 1, 'requester task not created');
    const first = await page.locator('ul li > button:visible', { hasText: 'REQ-' }).first().innerText();
    expect(first.includes('Review comments for request #4471'), 'returned task should be listed first');
    await row.click(); await wait(LOAD);
    expect(await page.getByRole('button', { name: 'Resubmit for approval' }).count() === 1, 'resubmit CTA missing');
    expect(await text('Please split the hosting line by environment.').count() > 0, 'return note not carried over');
  });

  await test('Technical member task: creation-page criteria in view mode with Accept / Modify', async () => {
    await page.getByRole('button', { name: /^All\s*\d+/ }).click(); await wait(200);
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

  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass}/${results.length} passed\n`);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      → ${r.err}  [${r.shot}]`}`);
  process.exit(pass === results.length ? 0 : 1);
})();
