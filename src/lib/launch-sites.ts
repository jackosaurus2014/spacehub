// ─── Launch-site pages: registry + month views ───────────────────────────────
// /launches/[site]/[yyyy-mm] answers the query the launch-schedule guide
// already ranks for but has no page to catch: "cape canaveral launch
// schedule october 2026" (Search Console, 2026-08: 140 + 113 impressions
// for the two month variants alone). Every page is generated from
// SpaceEvent — past launches with real outcomes, upcoming with NET dates —
// and links the viewing guide for sites that have one.
//
// Matching is by regex over SpaceEvent.location (LL2 pad location name).
// Cape Canaveral SFS and Kennedy Space Center are one page: visitors search
// for "Cape Canaveral" and watch both from the same beaches.

import prisma from '@/lib/db';
import { LAUNCH_EVENT_TYPES, type TrackedLaunch } from '@/lib/rockets';

export { LAUNCH_SITES, getSite, siteSlugForLocation, parseMonthParam, monthParam, monthLabel, shiftMonth, monthWindow, isMonthInWindow } from '@/lib/launch-site-registry';
export type { LaunchSite } from '@/lib/launch-site-registry';
import { LAUNCH_SITES, getSite, shiftMonth, type LaunchSite } from '@/lib/launch-site-registry';

export interface SiteMonth {
  site: LaunchSite;
  year: number;
  month: number;
  launches: TrackedLaunch[];
  completed: number;
  failed: number;
  upcoming: number;
  prev: { year: number; month: number };
  next: { year: number; month: number };
}

export async function getSiteMonth(siteSlug: string, year: number, month: number, now: Date = new Date()): Promise<SiteMonth | null> {
  const site = getSite(siteSlug);
  if (!site) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await prisma.spaceEvent.findMany({
    where: { type: { in: [...LAUNCH_EVENT_TYPES] }, launchDate: { gte: start, lt: end }, location: { not: null }, rocket: { not: null } },
    select: { id: true, name: true, mission: true, launchDate: true, status: true, location: true, agency: true, rocket: true, imageUrl: true },
    orderBy: { launchDate: 'asc' },
  });
  const launches = rows.filter((r) => site.matcher.test(r.location ?? ''));
  return {
    site, year, month, launches,
    completed: launches.filter((l) => l.status === 'completed').length,
    failed: launches.filter((l) => l.status === 'failed').length,
    upcoming: launches.filter((l) => l.launchDate && l.launchDate.getTime() > now.getTime()).length,
    prev: shiftMonth(year, month, -1),
    next: shiftMonth(year, month, 1),
  };
}

/** Per-site rollup for the index and site landing pages. */
export async function getSiteSummaries(now: Date = new Date()): Promise<Array<{ site: LaunchSite; last12Months: number; upcoming: number; nextLaunch: TrackedLaunch | null }>> {
  const since = new Date(now.getTime() - 365 * 86_400_000);
  const rows = await prisma.spaceEvent.findMany({
    where: { type: { in: [...LAUNCH_EVENT_TYPES] }, launchDate: { gte: since }, location: { not: null }, rocket: { not: null } },
    select: { id: true, name: true, mission: true, launchDate: true, status: true, location: true, agency: true, rocket: true, imageUrl: true },
    orderBy: { launchDate: 'asc' },
  });
  return LAUNCH_SITES.map((site) => {
    const mine = rows.filter((r) => site.matcher.test(r.location ?? ''));
    const past = mine.filter((r) => r.launchDate!.getTime() <= now.getTime() && r.status !== 'scrubbed');
    const future = mine.filter((r) => r.launchDate!.getTime() > now.getTime());
    return { site, last12Months: past.length, upcoming: future.length, nextLaunch: future[0] ?? null };
  });
}
