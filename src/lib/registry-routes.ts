// Registry-backed dynamic routes whose valid params are known statically.
// The middleware asks this before rendering so an unknown rocket, site or
// out-of-window month returns a real HTTP 404 (Next's notFound() inside a
// force-dynamic page cannot set the status — see src/middleware.ts). No
// fetch, no DB: a pure lookup, safe on the edge runtime.

import { allRocketSlugs } from '@/lib/rocket-registry';
import { getSite, isMonthInWindow, parseMonthParam } from '@/lib/launch-site-registry';
import { getViewingCity } from '@/lib/launch-viewing-cities';
import { getChartDef } from '@/lib/charts/registry';
import { getTonightCity } from '@/lib/tonight-cities';
import { isChartWeekKey, EARLIEST_CHART_WEEK } from '@/lib/chart-week-keys';
import { getRelease, isPeriodKey } from '@/lib/research-releases';

const ROCKET = /^\/rockets\/([^/]+)\/?$/;
const SITE = /^\/launches\/([^/]+)\/?$/;
const SITE_MONTH = /^\/launches\/([^/]+)\/([^/]+)\/?$/;
const CITY = /^\/guide\/watch-a-launch\/([^/]+)\/?$/;
const CHART = /^\/chart\/([^/]+)\/?$/;
const CHART_WEEK = /^\/chart\/week\/([^/]+)\/?$/;
const TONIGHT = /^\/tonight\/([^/]+)\/?$/;
const RELEASE_SERIES = /^\/releases\/([^/]+)\/?$/;
const RELEASE_EDITION = /^\/releases\/([^/]+)\/([^/]+)\/?$/;

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

  // /chart/week and /chart/week/<key> are the pinned weekly archive, not a
  // chart slug. Checked before CHART so the archive index is not 404'd by the
  // single-segment rule below.
  m = pathname.match(CHART_WEEK);
  if (m) {
    const key = safeDecode(m[1]);
    return !isChartWeekKey(key) || key < EARLIEST_CHART_WEEK;
  }

  m = pathname.match(CHART);
  if (m) {
    const slug = safeDecode(m[1]);
    if (slug === 'week') return false;
    return !getChartDef(slug);
  }

  // Recurring release franchises. An unknown series or a period the release
  // does not publish must be a REAL 404: notFound() inside a force-dynamic
  // page cannot set the status (see src/middleware.ts).
  m = pathname.match(RELEASE_EDITION);
  if (m) {
    const series = safeDecode(m[1]);
    const release = getRelease(series);
    // Only 'series'-surfaced releases have an edition page here; the others
    // are read on their own long-standing public pages.
    if (!release || release.surface !== 'series') return true;
    const period = safeDecode(m[2]);
    return !isPeriodKey(release.cadence, period) || period < release.earliestPeriod;
  }

  m = pathname.match(RELEASE_SERIES);
  if (m) return !getRelease(safeDecode(m[1]));

  m = pathname.match(TONIGHT);
  if (m) return !getTonightCity(safeDecode(m[1]));

  return false;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
