/**
 * Growth metrics — GA4 active users + Search Console clicks, tracked against
 * the 10k-MAU-by-2027-02-12 goal (re-based 2026-09-14).
 *
 * Auth: no `googleapis` / `google-auth-library` dependency in package.json,
 * so this implements the OAuth2 service-account JWT-bearer flow by hand
 * using node:crypto (RS256) — see `getAccessToken()`. The signed JWT is
 * exchanged for a bearer token at Google's token endpoint and the token is
 * cached in-memory until shortly before it expires.
 *
 * Every public fetcher is best-effort: missing credentials or a failing API
 * call never throws to the caller. Failures are collected into an `errors`
 * array so the admin UI can render a clear "not configured" / "API error"
 * state instead of crashing.
 */

import { logger } from './logger';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA4_PROPERTY_ID = '524865220';
const SEARCH_CONSOLE_SITE = 'sc-domain:spacenexus.us';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// Module-level in-memory cache — survives for the lifetime of the server
// process / lambda instance, cleared on redeploy.
let cachedToken: CachedToken | null = null;

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function loadServiceAccountKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_METRICS_CREDENTIALS;
  if (!raw) {
    throw new Error('GOOGLE_METRICS_CREDENTIALS is not configured');
  }
  let parsed: ServiceAccountKey;
  try {
    parsed = JSON.parse(raw) as ServiceAccountKey;
  } catch {
    throw new Error('GOOGLE_METRICS_CREDENTIALS is not valid JSON');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_METRICS_CREDENTIALS is missing client_email or private_key');
  }
  return parsed;
}

/**
 * Sign a Google OAuth2 service-account JWT-bearer assertion (RS256) with
 * node:crypto and exchange it for an access token. Result is cached
 * in-memory until 60s before expiry.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  // Deferred import so a missing/invalid crypto call surfaces as a normal
  // Error that callers can catch, rather than a module-load failure.
  const crypto = await import('node:crypto');

  const key = loadServiceAccountKey();
  const nowSec = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPES,
      aud: TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );
  const signingInput = `${header}.${claimSet}`;
  const signature = base64url(
    crypto.sign('RSA-SHA256', Buffer.from(signingInput), key.private_key)
  );
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('Token exchange response missing access_token');
  }

  cachedToken = {
    accessToken: json.access_token,
    // Refresh 60s early to avoid edge-of-expiry failures.
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000,
  };

  return cachedToken.accessToken;
}

export interface GA4UsersResult {
  mau: number;
  wau: number;
}

/**
 * GA4 Data API: active users over the last 30 days (MAU) and 7 days (WAU)
 * in a single runReport call using two named date ranges.
 */
export async function fetchGA4Users(): Promise<GA4UsersResult> {
  const token = await getAccessToken();

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [
          { startDate: '30daysAgo', endDate: 'today', name: 'last30' },
          { startDate: '7daysAgo', endDate: 'today', name: 'last7' },
        ],
        metrics: [{ name: 'activeUsers' }],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GA4 runReport failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  };

  let mau = 0;
  let wau = 0;
  for (const row of json.rows ?? []) {
    const rangeName = row.dimensionValues?.[0]?.value;
    const value = Number(row.metricValues?.[0]?.value ?? 0);
    if (rangeName === 'last30') mau = value;
    if (rangeName === 'last7') wau = value;
  }

  return { mau, wau };
}

export interface LandingReturnRow {
  landingPage: string;
  users: number;
  returningUsers: number;
  returnRatePct: number;
}

/**
 * GA4: per landing page over the last 30 days, total users and how many
 * of them were returning users — the proxy for "came back within 30 days"
 * the roadmap (2026-08-29, Tier 2 #16) wants so week-3 reallocation is
 * measured, not argued. Pages under `minUsers` are dropped as noise.
 */
export async function fetchGA4LandingReturns(minUsers = 10, limit = 40): Promise<LandingReturnRow[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'landingPage' }, { name: 'newVsReturning' }],
        metrics: [{ name: 'totalUsers' }],
        limit: 2000,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GA4 runReport (landing returns) failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }> };
  const byPage = new Map<string, { users: number; returning: number }>();
  for (const row of json.rows ?? []) {
    const page = (row.dimensionValues?.[0]?.value || '/').split('?')[0];
    const kind = row.dimensionValues?.[1]?.value || '';
    const n = Number(row.metricValues?.[0]?.value ?? 0);
    const cur = byPage.get(page) ?? { users: 0, returning: 0 };
    cur.users += n;
    if (kind === 'returning') cur.returning += n;
    byPage.set(page, cur);
  }
  return Array.from(byPage.entries())
    .filter(([, v]) => v.users >= minUsers)
    .map(([landingPage, v]) => ({ landingPage, users: v.users, returningUsers: v.returning, returnRatePct: Math.round((v.returning / v.users) * 1000) / 10 }))
    .sort((a, b) => b.users - a.users)
    .slice(0, limit);
}

export interface SearchClicksResult {
  clicks: number;
  impressions: number;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleFilter {
  dimension: string;
  operator: string;
  expression: string;
}

/**
 * Search Console API, with dimensions — the general form of
 * fetchSearchClicks below. Used by scripts/search-ctr-audit.ts to find pages
 * that rank but are not clicked, which is the cheapest traffic we can win
 * because the impressions are already earned.
 *
 * `dimensions` are Search Console's own ('page', 'query', 'country',
 * 'device', 'date'). Returns [] rather than throwing on an empty result, but
 * DOES throw on a non-2xx — a caller that silently swallows an auth failure
 * cannot tell "no data" from "no access", and we have been bitten by exactly
 * that this week with the FCC feed.
 */
export async function fetchSearchConsoleRows(
  dimensions: string[],
  days = 28,
  rowLimit = 500,
  dimensionFilters: SearchConsoleFilter[] = [],
): Promise<SearchConsoleRow[]> {
  const token = await getAccessToken();
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_CONSOLE_SITE)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: formatDate(start),
        endDate: formatDate(end),
        dimensions,
        rowLimit,
        ...(dimensionFilters.length > 0
          ? { dimensionFilterGroups: [{ filters: dimensionFilters }] }
          : {}),
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Search Console query failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { rows?: SearchConsoleRow[] };
  return (json.rows || []).map((r) => ({
    keys: r.keys || [],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));
}

/**
 * Search Console API: total clicks + impressions over the last 28 days,
 * no dimensions requested → a single aggregated row for the whole site.
 */
export async function fetchSearchClicks(): Promise<SearchClicksResult> {
  const token = await getAccessToken();

  const end = new Date();
  const start = new Date(end.getTime() - 28 * 24 * 60 * 60 * 1000);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      SEARCH_CONSOLE_SITE
    )}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: formatDate(start),
        endDate: formatDate(end),
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Search Console query failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    rows?: Array<{ clicks?: number; impressions?: number }>;
  };

  const row = json.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
  };
}

// --------------- Growth goal curve ---------------

export interface GrowthMilestone {
  date: string; // YYYY-MM-DD
  target: number;
}

export const GROWTH_GOAL_TARGET = 10_000;

/**
 * RE-BASED 2026-09-14. The original curve (3,000 by 2026-09-12; 6,000 by
 * 2026-10-12; 10,000 by 2026-11-12) was set on 2026-08-13 from a base of
 * 435 MAU and was never met: the Monday reading was 673 MAU against a curve
 * target of 3,275, and holding the November date would have required 38.3%
 * compounding weekly growth for eight weeks. A target nobody can hit stops
 * being a target — every weekly reading says "behind" and none of them say
 * anything useful about whether the week went well.
 *
 * What the same evidence actually shows is a HEALTHY trajectory: 435 → 673
 * over 4.6 weeks is 10.0% a week, compounding. So the goal of 10,000 MAU is
 * kept and the DATE moves to 2027-02-12, which needs 13.3% a week from the
 * 2026-09-14 base — about a third faster than we are already managing, which
 * is what the unposted launch materials and the search-CTR work are for.
 * Milestones below sit on that 13.3% curve.
 *
 * Re-base this again when the base moves materially, and record the reason
 * here rather than quietly editing the numbers.
 */
export const GROWTH_GOAL_DATE = '2027-02-12';

export const GROWTH_MILESTONES: GrowthMilestone[] = [
  // THE BASELINE IS A REAL MILESTONE, not an implied one.
  //
  // interpolateGrowthTarget() synthesises an anchor of ZERO one cadence
  // before the first milestone. With the first entry at 2026-10-12 that put a
  // zero at roughly 2026-09-11, so on 2026-09-16 the curve claimed a target of
  // 216 against an actual 738 — reporting us 522 AHEAD when we were roughly on
  // track. A goal line that flatters is as useless as one nobody can hit,
  // which is the reason this curve was re-based in the first place.
  //
  // So the measured starting point is stated explicitly: 673 monthly actives
  // read on 2026-09-14, the day the curve moved.
  { date: '2026-09-14', target: 673 },
  { date: '2026-10-12', target: 1_100 },
  { date: '2026-11-12', target: 1_950 },
  { date: '2026-12-31', target: 4_600 },
  { date: '2027-02-12', target: 10_000 },
];

/**
 * Linearly interpolate the "expected MAU today" curve.
 *
 * The milestones are evenly spaced ~30 days apart, so the segment before the
 * first milestone is extrapolated backward using that same cadence, anchored
 * at 0 MAU — i.e. the curve assumes growth started from zero roughly 30 days
 * before the first (Sep 12) milestone. Before that anchor date the target is
 * clamped to 0; after the final milestone it's clamped to the overall goal.
 */
export function interpolateGrowthTarget(
  now: Date,
  milestones: GrowthMilestone[] = GROWTH_MILESTONES,
  finalTarget: number = GROWTH_GOAL_TARGET
): number {
  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return finalTarget;

  const first = sorted[0];
  const second = sorted.length > 1 ? sorted[1] : null;
  const cadenceMs = second
    ? new Date(second.date).getTime() - new Date(first.date).getTime()
    : 30 * 24 * 60 * 60 * 1000;
  const anchorDate = new Date(new Date(first.date).getTime() - cadenceMs);

  const points: Array<{ time: number; target: number }> = [
    { time: anchorDate.getTime(), target: 0 },
    ...sorted.map((m) => ({ time: new Date(m.date).getTime(), target: m.target })),
  ];

  const t = now.getTime();

  if (t <= points[0].time) return points[0].target;
  if (t >= points[points.length - 1].time) return finalTarget;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.time && t <= b.time) {
      const frac = b.time === a.time ? 0 : (t - a.time) / (b.time - a.time);
      return a.target + frac * (b.target - a.target);
    }
  }

  return finalTarget;
}

export interface GrowthSnapshot {
  generatedAt: string;
  mau: number | null;
  wau: number | null;
  searchClicks: number | null;
  searchImpressions: number | null;
  goal: {
    target: number;
    milestones: GrowthMilestone[];
    currentTarget: number;
    onTrack: boolean | null;
  };
  errors: string[];
}

/**
 * Fetch GA4 + Search Console metrics and compare against the 10k-MAU goal
 * curve. Never throws — any failure (missing credentials, network error,
 * non-2xx response) is captured in `errors` and the corresponding fields
 * are returned as `null`.
 */
export async function getGrowthSnapshot(): Promise<GrowthSnapshot> {
  const errors: string[] = [];
  const now = new Date();
  const currentTarget = Math.round(interpolateGrowthTarget(now));

  if (!process.env.GOOGLE_METRICS_CREDENTIALS) {
    errors.push('GOOGLE_METRICS_CREDENTIALS is not configured');
    return {
      generatedAt: now.toISOString(),
      mau: null,
      wau: null,
      searchClicks: null,
      searchImpressions: null,
      goal: {
        target: GROWTH_GOAL_TARGET,
        milestones: GROWTH_MILESTONES,
        currentTarget,
        onTrack: null,
      },
      errors,
    };
  }

  let mau: number | null = null;
  let wau: number | null = null;
  let searchClicks: number | null = null;
  let searchImpressions: number | null = null;

  try {
    const users = await fetchGA4Users();
    mau = users.mau;
    wau = users.wau;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`GA4: ${message}`);
    logger.warn('Growth metrics: GA4 fetch failed', { error: message });
  }

  try {
    const search = await fetchSearchClicks();
    searchClicks = search.clicks;
    searchImpressions = search.impressions;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Search Console: ${message}`);
    logger.warn('Growth metrics: Search Console fetch failed', { error: message });
  }

  const onTrack = mau !== null ? mau >= currentTarget : null;

  return {
    generatedAt: now.toISOString(),
    mau,
    wau,
    searchClicks,
    searchImpressions,
    goal: {
      target: GROWTH_GOAL_TARGET,
      milestones: GROWTH_MILESTONES,
      currentTarget,
      onTrack,
    },
    errors,
  };
}
