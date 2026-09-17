import { createHash, randomBytes } from 'crypto';

/**
 * Cookieless, consent-free visitor counting.
 *
 * WHY THIS EXISTS. GA4 is gated on the cookie banner. A visitor who ignores
 * the banner runs with `analytics_storage: denied`, is given no `_ga` cookie,
 * and gets a fresh client id on every page load. Those pings reach Google but
 * do not become `activeUsers` at our volume. The gap is not subtle: GA4
 * reported 748 monthly active users for a month in which Search Console
 * counted 2,916 clicks from Google alone, and Search Console only sees
 * organic search — not direct, not LinkedIn, not referral.
 *
 * That matters because MAU is the number the 10k goal is measured against and
 * the number in every CEO brief. "673 against a curve target of 3,275" and
 * "not reachable organically" were both computed on a partial count.
 *
 * HOW IT STAYS ANONYMOUS. The visitor key is
 *
 *     sha256(dailySalt + ip + userAgent)  truncated to 128 bits
 *
 * where `dailySalt` is 32 random bytes generated in memory and thrown away
 * when the UTC day turns. Because the salt never touches disk, yesterday's
 * hashes cannot be linked to today's or reversed to an IP by anyone,
 * ourselves included. No identifier is stored, nothing is written to the
 * visitor's device, and no personal data is retained — which is why this
 * needs no consent, and why it must stay that way. Do not add a stable
 * identifier, a cookie, or anything that survives the salt rotation.
 *
 * WHAT IT IS NOT. This is not a replacement for GA4 and not an attempt to
 * work around the banner. GA4 keeps doing what it does for consenting users
 * (engagement, funnels, events). This answers exactly one question GA4 cannot
 * answer honestly for us: how many people actually came.
 */

let saltDay = '';
let salt: Buffer = randomBytes(32);

/** UTC midnight of the given instant. */
export function utcDay(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

function dayKey(at: Date): string {
  return utcDay(at).toISOString().slice(0, 10);
}

/**
 * The salt for the current UTC day, rotating on first use after midnight.
 * Exported for the test that proves rotation actually breaks linkability.
 */
export function currentSalt(at: Date = new Date()): Buffer {
  const key = dayKey(at);
  if (key !== saltDay) {
    saltDay = key;
    salt = randomBytes(32);
  }
  return salt;
}

/**
 * The visitor key. `ip` and `userAgent` are read and immediately discarded by
 * the caller — only the return value is ever persisted.
 */
export function visitorHash(ip: string, userAgent: string, at: Date = new Date()): string {
  return createHash('sha256')
    .update(currentSalt(at))
    .update(' ')
    .update(ip)
    .update(' ')
    .update(userAgent)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Referrer reduced to a bare host. The full URL can carry a search query or a
 * private document path, so it never reaches the database.
 */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host.endsWith('spacenexus.us')) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

/** Path with any query string and fragment removed, capped for storage. */
export function cleanPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) return null;
  return path.slice(0, 200);
}

/**
 * Obvious non-humans. The beacon is client-side JavaScript so most crawlers
 * never reach it, but our own probes do and they must not inflate the number
 * the growth snapshot reads.
 */
const NON_HUMAN = /bot|crawler|spider|slurp|headless|puppeteer|playwright|lighthouse|monitor|preview|curl|wget|python-requests|node-fetch/i;

export function looksAutomated(userAgent: string): boolean {
  return NON_HUMAN.test(userAgent);
}
