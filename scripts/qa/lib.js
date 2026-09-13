// Shared helpers for the nightly QA probes (2026-09-12). Plain Node + Puppeteer,
// no project imports, so the scripts run from a bare checkout in GitHub Actions
// (see .github/workflows/nightly-qa.yml) and from the repo root locally.
//
//   SITE_URL      target origin (default https://spacenexus.us)
//   CRON_SECRET   when set, results are POSTed to /api/qa/report (which emails
//                 the alerts inbox on failure); when unset, results only print
//   QA_RUN_URL    link back to the workflow run, included in the alert email
const path = require('path');

function loadPuppeteer() {
  const candidates = [process.cwd(), __dirname, path.join(__dirname, '..', '..')];
  const resolved = require.resolve('puppeteer', { paths: candidates });
  return require(resolved);
}

const SITE = (process.env.SITE_URL || 'https://spacenexus.us').replace(/\/$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Console noise that is never a site defect (ad frames, blocked third parties, RSC prefetch chatter).
const CONSOLE_NOISE = /Failed to load resource|RSC payload|ERR_BLOCKED_BY_CLIENT|net::ERR_|adsbygoogle|googlesyndication|doubleclick|Content Security Policy|third-party cookie|preloaded using link preload|was preloaded|Refused to (load|frame|connect)|Tracking Prevention|Permissions-Policy|AudioContext|WebGL: CONTEXT_LOST|GPU stall|Slow network|hydration.*(google|ads)/i;

async function launchBrowser(puppeteer) {
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
}

/** Wires error collectors on a page; returns a function that drains them. */
function collectErrors(page) {
  let pageErrors = [];
  let consoleErrors = [];
  let crashed = null;
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e).slice(0, 200)));
  page.on('error', (e) => { crashed = String(e && e.message ? e.message : e).slice(0, 200); });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!CONSOLE_NOISE.test(t)) consoleErrors.push(t.slice(0, 200));
  });
  return () => {
    const out = { pageErrors, consoleErrors: [...new Set(consoleErrors)], crashed };
    pageErrors = []; consoleErrors = [];
    return out;
  };
}

async function acceptCookies(page) {
  try {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /accept all/i.test(x.textContent || ''));
      if (b) b.click();
      try { localStorage.setItem('spacenexus-onboarding-complete', '1'); } catch {}
    });
  } catch {}
}

/** Registers a disposable QA account through the public API. Email domain marks it as QA (src/lib/qa-accounts.ts). */
async function registerQaAccount(prefix) {
  const email = `${prefix}-${Date.now()}@spacenexus.internal`;
  const password = 'Qa-' + Math.random().toString(36).slice(2, 10) + '-Probe!' + Date.now().toString(36).slice(-4);
  const r = await fetch(`${SITE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: SITE },
    body: JSON.stringify({ email, password, confirmPassword: password, name: 'QA Probe' }),
  });
  if (r.status !== 200 && r.status !== 201) throw new Error(`register ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return { email, password };
}

async function loginAs(page, cred) {
  await page.goto(`${SITE}/login`, { waitUntil: 'networkidle2', timeout: 120000 });
  await acceptCookies(page);
  await page.type('#email', cred.email);
  await page.type('#password', cred.password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => null),
  ]);
  await sleep(500);
  const who = await page.evaluate(async () => {
    try { const j = await (await fetch('/api/auth/session')).json(); return (j && j.user && j.user.email) || null; } catch { return null; }
  });
  if (who !== cred.email) throw new Error(`login failed: session is ${who || 'anonymous'}`);
}

/** Deletes the signed-in account through the site's own flow (cascades the game profile). */
async function deleteAccount(page, password) {
  return page.evaluate(async (pw) => {
    try {
      const r = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, confirmation: 'DELETE MY ACCOUNT' }),
      });
      return r.status;
    } catch (e) { return 'err ' + (e && e.message); }
  }, password);
}

class Report {
  constructor(module) { this.module = module; this.checks = []; this.t0 = Date.now(); }
  add(id, ok, detail = '') {
    this.checks.push({ id, ok: !!ok, detail: String(detail || '').slice(0, 2000) });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}${detail ? '  — ' + String(detail).slice(0, process.env.QA_VERBOSE ? 4000 : 160) : ''}`);
    return !!ok;
  }
  get failed() { return this.checks.filter((c) => !c.ok); }
  async submit() {
    const failed = this.failed;
    const status = failed.length === 0 ? 'success' : failed.length >= Math.ceil(this.checks.length / 2) ? 'failed' : 'partial';
    const body = { module: this.module, status, durationMs: Date.now() - this.t0, checks: this.checks };
    if (process.env.QA_RUN_URL) body.runUrl = process.env.QA_RUN_URL;
    console.log(`\n${this.module}: ${this.checks.length - failed.length}/${this.checks.length} passed → ${status}`);
    if (!process.env.CRON_SECRET) { console.log('(CRON_SECRET unset: report not posted)'); return status; }
    try {
      const r = await fetch(`${SITE}/api/qa/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}`, Origin: SITE },
        body: JSON.stringify(body),
      });
      console.log('report posted:', r.status, (await r.text()).slice(0, 200));
    } catch (e) {
      console.log('report post failed:', e && e.message);
    }
    return status;
  }
}

module.exports = { SITE, sleep, loadPuppeteer, launchBrowser, collectErrors, acceptCookies, registerQaAccount, loginAs, deleteAccount, Report };
