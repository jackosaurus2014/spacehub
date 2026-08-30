import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { sendFreshnessAlert } from '@/lib/freshness-alerts';

// Post-deploy smoke test (SYNTHESIS.md item 28): two brand-new pages 404'd on
// their first check and self-healed minutes later — invisible without a
// probe. Every six hours this fetches a fixed set of load-bearing pages plus
// a random sample of the sitemap, and raises one admin alert (reusing the
// freshness-alert plumbing) naming every URL that did not answer 2xx/3xx.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BASE = 'https://spacenexus.us';
const FIXED = [
  '/', '/mission-control', '/launches', '/rockets', '/rockets/falcon-9', '/news', '/space-stocks', '/company-profiles',
  '/startups', '/funding-tracker', '/tools', '/chart', '/chart/launches-per-month', '/api/chart/launches-per-month',
  '/guide/space-launch-cost-comparison', '/guide/blue-origin-vs-spacex', '/guide/watch-a-launch/orlando', '/guide/cost-to-launch/gps-satellite',
  '/space-tycoon', '/space-tycoon/about', '/space-tycoon/faq', '/pricing', '/sitemap.xml', '/api/pulse', '/api/space-tycoon/market/npc-industry',
];
const SAMPLE = 20;

async function sitemapUrls(): Promise<string[]> {
  try {
    const idx = await fetch(`${BASE}/sitemap.xml`, { cache: 'no-store', signal: AbortSignal.timeout(15000) }).then((r) => r.text());
    const maps = Array.from(idx.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).filter((u) => u.includes('/sitemap/'));
    const urls: string[] = [];
    for (const m of maps.slice(0, 3)) {
      const xml = await fetch(m, { cache: 'no-store', signal: AbortSignal.timeout(15000) }).then((r) => r.text());
      urls.push(...Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((x) => x[1]));
    }
    return urls;
  } catch (error) {
    logger.warn('smoke-test: sitemap read failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

function pick<T>(arr: T[], n: number, seed: number): T[] {
  // Deterministic per run-hour so a flaky URL repeats once, not forever.
  const out: T[] = []; const used = new Set<number>(); let s = seed;
  while (out.length < Math.min(n, arr.length)) {
    s = (s * 9301 + 49297) % 233280; const i = Math.floor((s / 233280) * arr.length);
    if (!used.has(i)) { used.add(i); out.push(arr[i]); }
  }
  return out;
}

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;
  const started = Date.now();
  const sample = pick((await sitemapUrls()).map((u) => u.replace(BASE, '')).filter((p) => p.startsWith('/') && !FIXED.includes(p)), SAMPLE, Math.floor(started / 3600000));
  const targets = [...FIXED, ...sample];
  const results = await Promise.all(targets.map(async (path) => {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE}${path}`, { method: 'GET', redirect: 'manual', cache: 'no-store', headers: { 'user-agent': 'SpaceNexus-smoke/1' }, signal: AbortSignal.timeout(20000) });
      return { path, status: res.status, ms: Date.now() - t0, ok: res.status < 400 };
    } catch (error) {
      return { path, status: 0, ms: Date.now() - t0, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }));
  const failed = results.filter((r) => !r.ok);
  const slow = results.filter((r) => r.ok && r.ms > 8000);
  if (failed.length > 0) {
    logger.error('smoke-test: failures', { failed });
    await sendFreshnessAlert(`smoke-test: ${failed.length} URL(s) failing — ${failed.map((f) => `${f.path} (${f.status || f.error})`).join(', ')}`.slice(0, 500), null, 360);
  } else {
    logger.info('smoke-test: all clear', { checked: results.length, slow: slow.length, ms: Date.now() - started });
  }
  return NextResponse.json({ success: failed.length === 0, checked: results.length, failed, slow, timestamp: new Date().toISOString() });
}
