// Registry-backed dynamic routes whose valid params are known statically.
// The middleware asks this before rendering so an unknown rocket, site or
// out-of-window month returns a real HTTP 404 (Next's notFound() inside a
// force-dynamic page cannot set the status — see src/middleware.ts). No
// fetch, no DB: a pure lookup, safe on the edge runtime.

import { allRocketSlugs } from '@/lib/rocket-registry';
import { getSite, isMonthInWindow, parseMonthParam } from '@/lib/launch-site-registry';
import { getViewingCity } from '@/lib/launch-viewing-cities';

const ROCKET = /^\/rockets\/([^/]+)\/?$/;
const SITE = /^\/launches\/([^/]+)\/?$/;
const SITE_MONTH = /^\/launches\/([^/]+)\/([^/]+)\/?$/;
const CITY = /^\/guide\/watch-a-launch\/([^/]+)\/?$/;

/** True when the pathname is a registry route with a param that does not exist. */
export function registryRouteMissing(pathname: string, now: Date = new Date()): boolean {
  let m = pathname.match(ROCKET);
  if (m) return !allRocketSlugs().includes(safeDecode(m[1]));

  m = pathname.match(SITE_MONTH);
  if (m) {
    if (!getSite(safeDecode(m[1]))) return true;
    const parsed = parseMonthParam(safeDecode(m[2]));
    return !parsed || !isMonthInWindow(parsed.year, parsed.month, now);
  }

  m = pathname.match(SITE);
  if (m) return !getSite(safeDecode(m[1]));

  m = pathname.match(CITY);
  if (m) return !getViewingCity(safeDecode(m[1]));

  return false;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
