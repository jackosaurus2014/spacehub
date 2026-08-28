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

export interface LaunchSite {
  slug: string;
  name: string;
  shortName: string;
  region: string;
  country: string;
  matcher: RegExp;
  /** Public viewing guide, when we have one. */
  viewingGuide?: string;
  blurb: string;
}

export const LAUNCH_SITES: readonly LaunchSite[] = [
  { slug: 'cape-canaveral', name: 'Cape Canaveral & Kennedy Space Center', shortName: 'Cape Canaveral', region: 'Florida', country: 'USA', matcher: /Cape Canaveral|Kennedy Space Center/i, viewingGuide: '/guide/watch-a-launch-cape-canaveral', blurb: 'The busiest spaceport on Earth: SpaceX from SLC-40 and LC-39A, ULA from SLC-41, Blue Origin from LC-36.' },
  { slug: 'vandenberg', name: 'Vandenberg Space Force Base', shortName: 'Vandenberg', region: 'California', country: 'USA', matcher: /Vandenberg/i, viewingGuide: '/guide/watch-a-launch-vandenberg', blurb: 'The West Coast gateway to polar and sun-synchronous orbit — Starlink shells, Earth-observation and national-security payloads.' },
  { slug: 'starbase', name: 'SpaceX Starbase', shortName: 'Starbase', region: 'Texas', country: 'USA', matcher: /Starbase/i, viewingGuide: '/guide/watch-a-launch-starbase', blurb: 'Starship\'s development and launch site at Boca Chica, on the Texas coast.' },
  { slug: 'wallops', name: 'Wallops Flight Facility', shortName: 'Wallops', region: 'Virginia', country: 'USA', matcher: /Wallops/i, blurb: 'NASA\'s Virginia range: Rocket Lab\'s Electron and Neutron pads and Northrop Grumman\'s Antares.' },
  { slug: 'mahia', name: 'Rocket Lab Launch Complex 1, Mahia', shortName: 'Mahia', region: 'Hawke\'s Bay', country: 'New Zealand', matcher: /Mahia|Rocket Lab Launch Complex 1/i, blurb: 'The world\'s first private orbital launch site, home of Electron.' },
  { slug: 'kourou', name: 'Guiana Space Centre, Kourou', shortName: 'Kourou', region: 'French Guiana', country: 'France', matcher: /Guiana Space Centre|Kourou/i, blurb: 'Europe\'s spaceport: Ariane 6 and Vega-C, five degrees from the equator.' },
  { slug: 'jiuquan', name: 'Jiuquan Satellite Launch Center', shortName: 'Jiuquan', region: 'Inner Mongolia', country: 'China', matcher: /Jiuquan/i, blurb: 'China\'s oldest launch site and its crewed-spaceflight gateway; also the home range for most commercial Chinese launchers.' },
  { slug: 'wenchang', name: 'Wenchang Space Launch Site', shortName: 'Wenchang', region: 'Hainan', country: 'China', matcher: /Wenchang|Hainan Commercial/i, blurb: 'China\'s coastal heavy-lift site for Long March 5, 7 and 8, plus the new commercial pads next door.' },
  { slug: 'taiyuan', name: 'Taiyuan Satellite Launch Center', shortName: 'Taiyuan', region: 'Shanxi', country: 'China', matcher: /Taiyuan/i, blurb: 'China\'s polar and sun-synchronous launch site.' },
  { slug: 'xichang', name: 'Xichang Satellite Launch Center', shortName: 'Xichang', region: 'Sichuan', country: 'China', matcher: /Xichang/i, blurb: 'China\'s geostationary launch site for Long March 3B and BeiDou missions.' },
  { slug: 'haiyang', name: 'Haiyang Oriental Spaceport', shortName: 'Haiyang', region: 'Shandong', country: 'China', matcher: /Haiyang|Oriental Spaceport/i, blurb: 'China\'s sea-launch base for solid-fuel commercial rockets launched from ships offshore.' },
  { slug: 'sriharikota', name: 'Satish Dhawan Space Centre, Sriharikota', shortName: 'Sriharikota', region: 'Andhra Pradesh', country: 'India', matcher: /Satish Dhawan|Sriharikota/i, blurb: 'ISRO\'s launch site for PSLV, GSLV and LVM3.' },
  { slug: 'baikonur', name: 'Baikonur Cosmodrome', shortName: 'Baikonur', region: 'Kyzylorda', country: 'Kazakhstan', matcher: /Baikonur/i, blurb: 'The original spaceport: Soyuz crew and Progress cargo flights to the ISS since 1957.' },
  { slug: 'plesetsk', name: 'Plesetsk Cosmodrome', shortName: 'Plesetsk', region: 'Arkhangelsk', country: 'Russia', matcher: /Plesetsk/i, blurb: 'Russia\'s northern military launch site for Soyuz-2 and Angara.' },
  { slug: 'tanegashima', name: 'Tanegashima Space Center', shortName: 'Tanegashima', region: 'Kagoshima', country: 'Japan', matcher: /Tanegashima/i, blurb: 'JAXA\'s island launch site for the H3.' },
  { slug: 'andoya', name: 'Andøya Spaceport', shortName: 'Andøya', region: 'Nordland', country: 'Norway', matcher: /And[øo]ya/i, blurb: 'Europe\'s newest orbital site, above the Arctic Circle, launching Isar Aerospace\'s Spectrum.' },
];

export function getSite(slug: string): LaunchSite | null {
  return LAUNCH_SITES.find((s) => s.slug === slug) ?? null;
}

export function siteSlugForLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  for (const s of LAUNCH_SITES) if (s.matcher.test(location)) return s.slug;
  return null;
}

/** 'YYYY-MM' → { year, month } or null. */
export function parseMonthParam(param: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(param);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/**
 * Months that get a page per site: the last 12 and the next 6 from `now`.
 * generateStaticParams enumerates these so unknown months 404 at the router
 * (dynamicParams=false) instead of rendering an empty page.
 */
export function monthWindow(now: Date = new Date(), past = 12, future = 6): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  for (let delta = -past; delta <= future; delta++) out.push(shiftMonth(y, m, delta));
  return out;
}

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
