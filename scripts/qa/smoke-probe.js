// Nightly smoke probe (2026-09-12): renders the highest-traffic pages in a real
// headless Chrome and checks what a status code cannot — page errors, console
// errors, error boundaries, missing key content, text smells, empty mains, and
// horizontal overflow on a phone viewport. Page list = GA4 top pages by
// 28-day views (Sept 2026) plus the product surfaces we sell.
//
//   node scripts/qa/smoke-probe.js            (from the repo root)
//   SITE_URL=... CRON_SECRET=... node scripts/qa/smoke-probe.js
const { SITE, sleep, loadPuppeteer, launchBrowser, collectErrors, acceptCookies, Report } = require('./lib');

function ym(offsetMonths) {
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + offsetMonths);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// expect: regex the visible body text must match. links: [selector, min count].
const PAGES = [
  { path: '/', expect: /SpaceNexus/, minChars: 1500, phone: true },
  { path: '/mission-control', expect: /mission control/i },
  { path: '/guide/space-launch-schedule-2026', expect: /2026/, minChars: 3000, phone: true },
  { path: '/guide/space-launch-cost-comparison', expect: /Falcon 9/i, minChars: 3000, phone: true },
  { path: `/launches/cape-canaveral/${ym(0)}`, expect: /Cape Canaveral/i, phone: true },
  { path: `/launches/cape-canaveral/${ym(1)}`, expect: /Cape Canaveral/i },
  { path: '/launches/cape-canaveral', expect: /Cape Canaveral/i },
  { path: '/space-tycoon', expect: /New Game/i },
  { path: '/guide/space-companies-directory', expect: /SpaceX/, minChars: 2000 },
  { path: '/space-stocks', expect: /Rocket Lab|RKLB/i },
  { path: '/space-stats', expect: /satellite/i },
  { path: '/pricing', expect: /\$19\.99/ },
  { path: '/satellites', expect: /satellite/i },
  { path: '/tonight', expect: /tonight|pass|ISS/i },
  { path: '/live', expect: /live|stream/i },
  { path: '/news', expect: /space/i, minChars: 2500, links: ['main a[href]', 20], phone: true },
  { path: '/space-talent', expect: /talent|hiring|jobs/i },
  { path: '/spectrum', expect: /spectrum|FCC/i },
  { path: '/reports/space-economy-2026', expect: /space economy/i, minChars: 800 },
  { path: '/rockets', expect: /Falcon|Starship/i },
  { path: '/mission-cost', expect: /cost/i },
  { path: '/company-profiles', expect: /SpaceX/ },
  { path: '/compare/spacex-vs-blue-origin', expect: /Blue Origin/ },
  { path: '/startups', expect: /funding|round/i },
  { path: '/tools', expect: /tool/i },
  { path: '/jobs', expect: /jobs|roles/i, links: ['a[href^="/space-talent/job/"]', 10], phone: true },
  { path: '/jobs/companies', expect: /employers/i, links: ['a[href^="/jobs?company="]', 20] },
  { path: '/hire', expect: /\$125|\$199/ },
  { path: '/blog', expect: /blog/i, links: ['a[href^="/blog/"]', 10] },
  { path: '/ai-insights', expect: /insight/i },
  { path: '/launch', expect: /launch/i },
];

const SMELLS = [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /Invalid Date/, /\$NaN/, /\bInfinity\b/, /Lorem ipsum/i];
const ERROR_BOUNDARY = /Something went wrong|Application error|Internal Server Error|An error occurred/i;

async function probePage(page, drain, p, viewport) {
  const url = SITE + p.path;
  const label = `${p.path}${viewport === 'phone' ? ' [phone]' : ''}`;
  let status = null, navErr = null, finalUrl = null;
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    status = res ? res.status() : null;
    finalUrl = page.url();
    if (status === null) {
      // Puppeteer returns no response for navigations the site's service worker answered; ask the document instead.
      status = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n && typeof n.responseStatus === 'number' && n.responseStatus > 0 ? n.responseStatus : 200; }).catch(() => null);
    }
  } catch (e) { navErr = String(e && e.message).slice(0, 160); }
  await acceptCookies(page);
  await sleep(1500);
  const errs = drain();
  const info = await page.evaluate((linkSel) => {
    const text = document.body ? document.body.innerText || '' : '';
    const main = document.querySelector('main') || document.body;
    const mainText = main ? (main.innerText || '').trim() : '';
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    const links = linkSel ? document.querySelectorAll(linkSel).length : null;
    return { text: text.slice(0, 200000), mainChars: mainText.length, overflow, links, title: document.title };
  }, p.links ? p.links[0] : null).catch((e) => ({ text: '', mainChars: 0, overflow: false, links: null, title: '', evalErr: String(e.message) }));

  const problems = [];
  if (navErr) problems.push(`navigation: ${navErr}`);
  if (status !== 200) problems.push(`status ${status}`);
  if (finalUrl && /\/login(\?|$)/.test(finalUrl)) problems.push('redirected to /login');
  if (errs.crashed) problems.push(`renderer crashed: ${errs.crashed}`);
  if (errs.pageErrors.length) problems.push(`pageerror: ${errs.pageErrors[0]}`);
  if (errs.consoleErrors.length) problems.push(`console: ${errs.consoleErrors[0]}`);
  if (ERROR_BOUNDARY.test(info.text)) problems.push('error boundary text on page');
  if (!p.expect.test(info.text)) problems.push(`expected text ${p.expect} missing`);
  if (info.mainChars < (p.minChars || 300)) problems.push(`main has only ${info.mainChars} chars`);
  for (const re of SMELLS) { const m = info.text.match(re); if (m) { problems.push(`smell "${m[0]}"`); break; } }
  if (p.links && info.links !== null && info.links < p.links[1]) problems.push(`only ${info.links} links match ${p.links[0]} (want ≥${p.links[1]})`);
  if (viewport === 'phone' && info.overflow) problems.push('horizontal overflow at 390px');
  if (info.evalErr) problems.push(`evaluate: ${info.evalErr}`);
  return { label, ok: problems.length === 0, detail: problems.join('; ') || `${status} ${info.mainChars} chars` };
}

async function siteChecks(report) {
  const get = async (p) => { const r = await fetch(SITE + p, { headers: { 'User-Agent': 'SpaceNexus-QA/1.0' } }); return { status: r.status, text: await r.text() }; };
  try {
    const h = await get('/api/health');
    let j = null; try { j = JSON.parse(h.text); } catch {}
    report.add('site:health', h.status === 200 && j && j.status === 'healthy', `status ${h.status}${j ? ' ' + j.status : ''}`);
  } catch (e) { report.add('site:health', false, e.message); }
  try {
    const s = await get('/sitemap.xml');
    const n = (s.text.match(/<loc>/g) || []).length;
    report.add('site:sitemap-index', s.status === 200 && n >= 1, `${s.status}, ${n} <loc>`);
    const s0 = await get('/sitemap/0.xml');
    const n0 = (s0.text.match(/<loc>/g) || []).length;
    report.add('site:sitemap-0-has-urls', s0.status === 200 && n0 >= 200, `${s0.status}, ${n0} urls (sitemaps were empty for a week in Sept 2026 — this is the guard)`);
    const js = await get('/jobs-sitemap.xml');
    const nj = (js.text.match(/<loc>/g) || []).length;
    report.add('site:jobs-sitemap', js.status === 200 && nj >= 100, `${js.status}, ${nj} urls`);
  } catch (e) { report.add('site:sitemaps', false, e.message); }
  try {
    const r = await get('/robots.txt');
    report.add('site:robots', r.status === 200 && /Sitemap:/i.test(r.text), `${r.status}`);
  } catch (e) { report.add('site:robots', false, e.message); }
}

(async () => {
  const report = new Report('qa-smoke');
  await siteChecks(report);
  const puppeteer = loadPuppeteer();
  const browser = await launchBrowser(puppeteer);
  try {
    for (const viewport of ['desktop', 'phone']) {
      const page = await browser.newPage();
      await page.setViewport(viewport === 'phone' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1366, height: 900 });
      await page.setBypassServiceWorker(true).catch(() => null); // the PWA service worker would otherwise answer navigations from its cache
      await page.setRequestInterception(true);
      page.on('request', (r) => { if (r.method() !== 'GET' && /\/api\/space-tycoon\//.test(r.url())) return r.abort(); r.continue(); });
      const drain = collectErrors(page);
      const list = viewport === 'phone' ? PAGES.filter((p) => p.phone) : PAGES;
      for (const p of list) {
        const r = await probePage(page, drain, p, viewport);
        report.add(`page:${r.label}`, r.ok, r.detail);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const status = await report.submit();
  process.exit(status === 'success' ? 0 : 1);
})().catch((e) => { console.error('smoke probe crashed:', e); process.exit(2); });
