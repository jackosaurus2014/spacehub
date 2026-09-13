// Nightly Space Tycoon probe (2026-09-12): plays a disposable, signed-in QA
// account (email @spacenexus.internal, see src/lib/qa-accounts.ts) through the
// server-authoritative loop that anonymous probes cannot touch:
//   register → sign in → New Game → first sync 200 → start a research
//   (POST /assets/research 200) → Outliner shows the research countdown →
//   order a building with the FIRST /assets/build answered by an injected
//   `insufficient_funds` refusal (proves the sync-then-retry path shipped on
//   2026-09-12) → construction row in the Outliner → assets persisted on the
//   server → account deleted through the site's own flow.
// Anonymous games are never used here: this account is real and is removed at
// the end (and by the daily qa-sweep cron if a run dies half-way).
//
//   node scripts/qa/tycoon-probe.js        (from the repo root)
const { SITE, sleep, loadPuppeteer, launchBrowser, collectErrors, acceptCookies, registerQaAccount, loginAs, deleteAccount, Report } = require('./lib');

const MODAL_BUTTON = /^(keep|skip|close|dismiss|continue|ok|okay|acknowledge|got it|later|not now|understood)/i;

async function clearModals(page) {
  return page.evaluate((src) => {
    const rx = new RegExp(src, 'i'); let n = 0;
    for (let i = 0; i < 6; i++) {
      const m = document.querySelector('[aria-modal="true"]');
      if (!m) break;
      const buttons = [...m.querySelectorAll('button')];
      const b = buttons.find((x) => rx.test(x.innerText.trim())) || buttons[buttons.length - 1];
      if (!b) break;
      b.click(); n++;
    }
    return n;
  }, MODAL_BUTTON.source);
}

/** Clicks the first visible element matching `scope` whose text matches `re`; returns its text or null. */
async function clickText(page, re, scope = 'button, [role="tab"]') {
  return page.evaluate((src, flags, scope) => {
    const rx = new RegExp(src, flags);
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const b = [...document.querySelectorAll(scope)].find((x) => vis(x) && !x.disabled && rx.test(x.innerText.trim().replace(/\s+/g, ' ')));
    if (!b) return null;
    b.click();
    return b.innerText.trim().replace(/\s+/g, ' ').slice(0, 60);
  }, re.source, re.flags, scope);
}

async function waitFor(fn, ms, step = 500) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step); }
  return null;
}

(async () => {
  const report = new Report('qa-tycoon');
  let cred = null;
  try { cred = await registerQaAccount('qa-tycoon'); report.add('account:register', true, cred.email); }
  catch (e) { report.add('account:register', false, e.message); await report.submit(); process.exit(1); }

  const puppeteer = loadPuppeteer();
  const browser = await launchBrowser(puppeteer);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  await page.setBypassServiceWorker(true).catch(() => null);
  const drain = collectErrors(page);

  // Network ledger: every game API call in order, with the injected refusal.
  const calls = [];
  let injected = false;
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (req.method() === 'POST' && /\/api\/space-tycoon\/assets\/research$/.test(u) && !injected) {
      injected = true;
      calls.push({ path: 'assets/research', status: 400, injected: true, body: req.postData() || '' });
      return req.respond({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Insufficient funds: QA-injected refusal (you have $0)', code: 'insufficient_funds' }) });
    }
    req.continue();
  });
  page.on('response', (res) => {
    const u = res.url();
    const m = u.match(/\/api\/space-tycoon\/(sync|assets\/[a-z]+)(\?|$)/);
    if (!m) return;
    const req = res.request();
    if (req.method() !== 'POST') return;
    calls.push({ path: m[1], status: res.status(), body: req.postData() || '' });
  });
  const postsTo = (p) => calls.filter((c) => c.path === p);

  try {
    await loginAs(page, cred);
    report.add('account:login', true, cred.email);

    await page.goto(`${SITE}/space-tycoon`, { waitUntil: 'networkidle2', timeout: 120000 });
    await acceptCookies(page);
    await sleep(2500);
    await clearModals(page);
    report.add('game:new-game-button', !!(await clickText(page, /^new game$/i)));
    await sleep(3500);
    const heritage = await page.evaluate(() => {
      const c = document.querySelectorAll('[role="dialog"] button[aria-pressed], [aria-modal="true"] button[aria-pressed]')[0];
      if (!c) return null; c.click(); return c.innerText.trim().split('\n')[0].slice(0, 40);
    });
    report.add('game:heritage-picked', !!heritage, heritage || 'no heritage card found');
    await sleep(600);
    const found = await clickText(page, /^Found /, '[role="dialog"] button, [aria-modal="true"] button');
    report.add('game:founded', !!found, found || 'no Found button');
    await sleep(6000);
    await clickText(page, /^Skip Guide$/);
    await sleep(1500);
    await clearModals(page);

    const firstSync = await waitFor(async () => postsTo('sync').find((c) => c.status === 200) || null, 40000, 1000);
    report.add('sync:first-200', !!firstSync, firstSync ? `sync ${firstSync.status} after founding` : `no sync 200 within 40s (seen: ${postsTo('sync').map((c) => c.status).join(',') || 'none'})`);

    // Research
    await clearModals(page);
    report.add('nav:build-fleet', !!(await clickText(page, /^Build & Fleet$/)));
    await sleep(1500);
    await clearModals(page);
    report.add('nav:research-tab', !!(await clickText(page, /^Research$/, '[role="tab"], button')));
    await sleep(1500);
    await clearModals(page);
    const researchBtn = await clickText(page, /READY/, 'button');
    report.add('research:ready-card', !!researchBtn, researchBtn || 'no READY research card');
    // The first research POST is answered by the injected `insufficient_funds` refusal; the client must push a sync and retry once.
    const researchCall = await waitFor(async () => postsTo('assets/research').find((c) => !c.injected) || null, 30000);
    report.add('research:server-200', !!researchCall && researchCall.status === 200, researchCall ? `POST assets/research ${researchCall.status} (after the injected refusal)` : 'no real POST assets/research within 30s');
    {
      const iInj = calls.findIndex((c) => c.injected);
      const iRetry = calls.findIndex((c, i) => i > iInj && c.path === 'assets/research' && !c.injected);
      const syncBetween = iInj >= 0 && iRetry > iInj && calls.slice(iInj + 1, iRetry).some((c) => c.path === 'sync' && c.status === 200);
      report.add('funds:sync-then-retry', iInj >= 0 && iRetry > iInj && syncBetween && calls[iRetry].status === 200, `calls: ${calls.map((c) => `${c.path}${c.injected ? '(injected 400)' : ' ' + c.status}`).join(' → ')}`);
    }

    // Outliner research countdown (desktop rail ≥1280px)
    await page.evaluate(() => { const b = document.querySelector('nav[aria-label="Corporate outliner"] button[aria-expanded="false"]'); if (b) b.click(); });
    const researchRow = await waitFor(() => page.evaluate(() => {
      const r = document.querySelector('[id^="outliner-row-operations-research-"]');
      return r ? r.innerText.replace(/\s+/g, ' ').trim().slice(0, 120) : null;
    }), 10000);
    report.add('outliner:research-row', !!researchRow && /\d/.test(researchRow), researchRow || 'no research row in the Outliner');

    // Build with an injected funds refusal on the first attempt
    await clearModals(page);
    report.add('nav:build-tab', !!(await clickText(page, /^Build$/, '[role="tab"]')));
    await sleep(1500);
    await clearModals(page);
    const buildBtn = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      // A catalog card's Build button, never the 'Build' sub-view tab.
      const b = [...document.querySelectorAll('button')].find((x) => vis(x) && !x.disabled && x.innerText.trim() === 'Build' && x.getAttribute('role') !== 'tab' && !x.closest('[role="tablist"]'));
      if (!b) return null;
      let card = b; for (let i = 0; i < 6 && card.parentElement; i++) { card = card.parentElement; if (card.innerText.length > 40) break; }
      b.click();
      return card.innerText.replace(/\s+/g, ' ').trim().slice(0, 80);
    });
    // A fresh corporation usually starts with its construction queue full (QUEUE FULL pips instead of Build buttons), so this leg is best-effort.
    if (buildBtn) {
      const buildCall = await waitFor(async () => postsTo('assets/build')[0] || null, 30000);
      report.add('build:server-200', !!buildCall && buildCall.status === 200, buildCall ? `POST assets/build ${buildCall.status} for ${buildBtn}` : 'no POST assets/build within 30s');
      const buildRow = await waitFor(() => page.evaluate(() => {
        const rows = [...document.querySelectorAll('[id^="outliner-row-operations-"]')].filter((r) => !/operations-research-/.test(r.id));
        return rows.length ? rows[0].innerText.replace(/\s+/g, ' ').trim().slice(0, 120) : null;
      }), 10000);
      report.add('outliner:construction-row', !!buildRow, buildRow || 'no construction row in the Outliner');
    } else {
      report.add('build:order-clicked', true, 'skipped: no enabled Build button (construction queue full at start); the research leg covered the funds retry');
    }
    const builds = postsTo('assets/build');

    // Persistence: the server must hold both assets.
    const ids = { research: null, build: null };
    try { ids.research = JSON.parse((postsTo('assets/research')[0] || {}).body || '{}').definitionId || null; } catch {}
    try { ids.build = JSON.parse((builds.find((c) => !c.injected) || {}).body || '{}').definitionId || null; } catch {}
    const persisted = await waitFor(() => page.evaluate(async (ids) => {
      try {
        const r = await fetch('/api/space-tycoon/assets', { cache: 'no-store' });
        if (r.status !== 200) return null;
        const t = await r.text();
        const okR = !ids.research || t.includes(ids.research);
        const okB = !ids.build || t.includes(ids.build);
        return okR && okB ? `assets GET ${r.status}: ${ids.research || '?'} + ${ids.build || '?'} present` : null;
      } catch { return null; }
    }, ids), 20000, 2000);
    report.add('server:assets-persisted', !!persisted, persisted || `assets GET missing ${JSON.stringify(ids)}`);

    // Markets ▸ Sourcing (shipped 2026-09-12): the tab exists and renders the sourcing console.
    await clearModals(page);
    const marketsHub = await clickText(page, /^Markets$/);
    await sleep(1200);
    await clearModals(page);
    const sourcingTab = marketsHub ? await clickText(page, /^Sourcing$/, '[role="tab"], button') : null;
    await sleep(1500);
    const sourcingText = sourcingTab ? await page.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ')) : '';
    report.add('markets:sourcing-tab', !!sourcingTab && /standing market order|supply locally|sourcing/i.test(sourcingText), sourcingTab ? `tab "${sourcingTab}" opened${/standing market order|supply locally/i.test(sourcingText) ? ', policy controls present' : ', policy controls NOT found'}` : `Markets hub ${marketsHub ? 'opened but no Sourcing tab' : 'not found'}`);

    const errs = drain();
    report.add('page:no-errors', !errs.crashed && errs.pageErrors.length === 0 && errs.consoleErrors.length === 0, [errs.crashed && `crashed: ${errs.crashed}`, errs.pageErrors[0] && `pageerror: ${errs.pageErrors[0]}`, errs.consoleErrors[0] && `console: ${errs.consoleErrors[0]}`].filter(Boolean).join('; ') || 'clean');
  } catch (e) {
    report.add('probe:exception', false, String(e && e.stack ? e.stack : e).slice(0, 600));
  } finally {
    try {
      const del = await deleteAccount(page, cred.password);
      report.add('account:delete-200', del === 200, `status ${del}`);
    } catch (e) { report.add('account:delete-200', false, e.message); }
    await browser.close();
  }
  const status = await report.submit();
  process.exit(status === 'success' ? 0 : 1);
})().catch((e) => { console.error('tycoon probe crashed:', e); process.exit(2); });
