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

  // ── Inbox ──────────────────────────────────────────────────────────────────
  await test('Inbox: list skeleton then tasks', async () => {
    await nav('Inbox'); await wait(80);
    expect(await count('.ld-shimmer') > 0, 'no inbox skeleton');
    await wait(LOAD);
    expect(await page.locator('ul li > button:visible', { hasText: 'RFP-4433' }).count() >= 10, 'tasks missing');
  });
  await test('Inbox: task opens with loader, info toggle, request details', async () => {
    await page.locator('ul li > button:visible', { hasText: 'RFP-4433' }).first().click(); await wait(80);
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
  await test('Inbox: approve via decision dialog', async () => {
    await tab('Required action'); await wait(200);
    if (await count('[data-budget-state]')) await page.waitForSelector('[data-budget-state="ok"], [data-budget-state="short"]');
    const approve = page.getByRole('button', { name: /^Approve/ }).first();
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
    await openTask('RFP-4471');
    expect(await page.locator('[data-budget-state="checking"]').count() === 1, 'not checking on open');
    expect(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled(), 'approve enabled while checking');
  });
  await test('Budget checker: sufficient budget enables approve (RFP-4471)', async () => {
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
  await test('Budget checker: insufficient budget blocks approve (RFP-4478)', async () => {
    await openTask('RFP-4478');
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
  await test('Inbox: task names match the Tasks-list PDF', async () => {
    await page.getByRole('button', { name: /^All\s*16/ }).click(); await wait(300);
    const titles = await page.locator('ul li > button:visible p:first-child, ul li > button:visible h3').allInnerTexts().catch(() => []);
    const body = (await page.locator('ul li > button:visible').allInnerTexts()).join('\n').replace(/\s+/g, ' ');
    for (const want of ['Review RFP #4433 from Ibrahim Al-Rashid', 'Review technical evaluation criteria for RFP #4433 from Ibrahim Al-Rashid', 'Review RFP #4433 from IT & Digital', 'Review request & add qualification criteria for RFP #4433 from IT & Digital', 'Approval DOA', 'Approve estimated price for RFP #4433 from IT & Digital', 'Review RFP #4471 from Fatima Al-Zahrani', 'Review RFP #4478 from Khalid Al-Qahtani'])
      expect(body.includes(want), `missing task "${want}"`);
    expect(!body.includes('Review & approve'), 'old "Review & approve" title still listed');
    expect((body.match(/RFP-44\d\d/g) || []).length === 16, `expected 16 tasks, got ${(body.match(/RFP-44\d\d/g) || []).length}`);
    void titles;
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

  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass}/${results.length} passed\n`);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      → ${r.err}  [${r.shot}]`}`);
  process.exit(pass === results.length ? 0 : 1);
})();
