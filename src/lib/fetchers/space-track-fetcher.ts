// ─── Space-Track.org Integration ─────────────────────────────────────────────
// Fetches satellite catalog data and conjunction alerts (CDM).
// Requires free account: https://www.space-track.org/auth/createAccount
// Env vars: SPACE_TRACK_USER, SPACE_TRACK_PASS

import { logger } from '../logger';
import { upsertContent } from '../dynamic-content';

const BASE_URL = 'https://www.space-track.org';
const LOGIN_URL = `${BASE_URL}/ajaxauth/login`;

let sessionCookie: string | null = null;
let sessionExpiry = 0;

/** Authenticate and get session cookie */
async function authenticate(): Promise<string | null> {
  const user = process.env.SPACE_TRACK_USER;
  const pass = process.env.SPACE_TRACK_PASS;
  if (!user || !pass) {
    logger.debug('Space-Track credentials not set — skipping');
    return null;
  }

  if (sessionCookie && Date.now() < sessionExpiry) return sessionCookie;

  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `identity=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      logger.error('Space-Track auth failed', { status: res.status });
      return null;
    }

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
      sessionExpiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hour session
      return sessionCookie;
    }
    return null;
  } catch (err) {
    logger.error('Space-Track auth error', { error: String(err) });
    return null;
  }
}

/** Fetch conjunction data messages (CDMs) for close approach events */
export async function fetchConjunctionAlerts(): Promise<number> {
  const cookie = await authenticate();
  if (!cookie) return 0;

  try {
    // Fetch CDMs from last 7 days with miss distance < 5 km
    const url = `${BASE_URL}/basicspacedata/query/class/cdm_public/CREATION_DATE/>now-7/TCA/>now/orderby/TCA%20asc/limit/100/format/json`;
    const res = await fetch(url, {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      logger.error('Space-Track CDM fetch failed', { status: res.status });
      return 0;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return 0;

    // Map to our format
    const alerts = data.map((cdm: Record<string, string>) => ({
      tcaTime: cdm.TCA,
      missDistance: parseFloat(cdm.MISS_DISTANCE || '0'),
      probability: parseFloat(cdm.COLLISION_PROBABILITY || '0'),
      sat1Name: cdm.SAT_1_NAME || 'Unknown',
      sat1NoradId: cdm.SAT1_OBJECT_DESIGNATOR || '',
      sat2Name: cdm.SAT_2_NAME || 'Unknown',
      sat2NoradId: cdm.SAT2_OBJECT_DESIGNATOR || '',
      createdAt: cdm.CREATION_DATE,
    }));

    await upsertContent(
      'satellites:conjunction-alerts:recent-cdms',
      'satellites',
      'conjunction-alerts',
      alerts,
      { sourceType: 'api', sourceUrl: 'https://www.space-track.org' },
    );

    logger.info('Space-Track conjunction alerts fetched', { count: alerts.length });
    return alerts.length;
  } catch (err) {
    logger.error('Space-Track CDM error', { error: String(err) });
    return 0;
  }
}

/** Fetch active satellite catalog (GP data) for specified groups */
export async function fetchSatelliteCatalog(group: string = 'active'): Promise<number> {
  const cookie = await authenticate();
  if (!cookie) return 0;

  try {
    const url = `${BASE_URL}/basicspacedata/query/class/gp/DECAY_DATE/null-val/EPOCH/%3Enow-30/orderby/NORAD_CAT_ID%20asc/limit/1000/format/json`;
    const res = await fetch(url, {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return 0;
    const data = await res.json();
    if (!Array.isArray(data)) return 0;

    // Store summary stats
    const summary = {
      totalActive: data.length,
      byOrbitType: {
        LEO: data.filter((s: Record<string, number>) => (s.MEAN_MOTION || 0) > 11.25).length,
        MEO: data.filter((s: Record<string, number>) => (s.MEAN_MOTION || 0) > 1 && (s.MEAN_MOTION || 0) <= 11.25).length,
        GEO: data.filter((s: Record<string, number>) => Math.abs((s.MEAN_MOTION || 0) - 1.0027) < 0.01).length,
      },
      lastUpdated: new Date().toISOString(),
    };

    await upsertContent(
      'satellites:catalog:active-summary',
      'satellites',
      'catalog',
      summary,
      { sourceType: 'api', sourceUrl: 'https://www.space-track.org' },
    );

    logger.info('Space-Track catalog fetched', { total: data.length });
    return data.length;
  } catch (err) {
    logger.error('Space-Track catalog error', { error: String(err) });
    return 0;
  }
}
