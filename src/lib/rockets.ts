// ─── Rocket pages: registry + live stats ─────────────────────────────────────
// /rockets/[slug] joins two sources: the curated spec catalogue
// (launch-vehicles-data.ts — height, payload, price, career record) and the
// live SpaceEvent table (what actually flew, when, where, and what's next).
//
// Why this exists (2026-08-28): Search Console shows the site's organic
// traffic comes almost entirely from launch-logistics pages (launch-cost
// guide 28.7k impressions, launch schedule 25.3k). Google already treats us
// as an authority on "how much does a rocket cost / when does it fly"; a
// page per rocket with live cadence and outcomes is the same authority,
// twenty times over, from data we already keep current.
//
// Matching: SpaceEvent.rocket is Launch Library's full_name ("Falcon 9
// Block 5", "Ariane 64", "Soyuz 2.1b Volga"). Each registry entry carries a
// matcher regex over that string. Vehicles without a catalogue entry (Long
// March 6C, Spectrum, Kinetica…) simply have no page yet — add a catalogue
// row and a matcher to light one up.

import prisma from '@/lib/db';
import type { LaunchVehicle } from '@/lib/launch-vehicles-data';

export { ROCKET_REGISTRY, getRocketSpec, getRocketEntry, rocketSlugForName, allRocketSlugs } from '@/lib/rocket-registry';
export type { RocketRegistryEntry } from '@/lib/rocket-registry';
import { getRocketEntry, getRocketSpec, allRocketSlugs } from '@/lib/rocket-registry';

/** Event types that represent a rocket leaving a pad (LL2 events are excluded). */
export const LAUNCH_EVENT_TYPES = ['launch', 'satellite', 'crewed_mission', 'space_station', 'probe', 'moon_mission', 'mars_mission', 'payload'] as const;

export interface TrackedLaunch {
  id: string;
  name: string;
  mission: string | null;
  launchDate: Date | null;
  status: string;
  location: string | null;
  agency: string | null;
  rocket: string | null;
  imageUrl: string | null;
}

export interface RocketLiveStats {
  trackedSince: Date | null;
  flown: number;         // completed + failed
  completed: number;
  failed: number;
  scrubbedOrUnknown: number;
  last90Days: number;
  successRatePct: number | null;
  nextLaunch: TrackedLaunch | null;
  upcoming: TrackedLaunch[];
  recent: TrackedLaunch[];
  sites: Array<{ location: string; count: number }>;
  variants: string[];
}

const SELECT = {
  id: true, name: true, mission: true, launchDate: true, status: true,
  location: true, agency: true, rocket: true, imageUrl: true,
} as const;

/**
 * Live stats for one rocket from SpaceEvent. Pulls every event with a rocket
 * string (a few hundred rows) and matches in JS — the registry is regex-based
 * and the table is small; a per-request scan is cheaper than N `contains`
 * queries and stays correct as LL2 renames variants.
 */
export async function getRocketLiveStats(slug: string, now: Date = new Date()): Promise<RocketLiveStats> {
  const entry = getRocketEntry(slug);
  const empty: RocketLiveStats = {
    trackedSince: null, flown: 0, completed: 0, failed: 0, scrubbedOrUnknown: 0, last90Days: 0,
    successRatePct: null, nextLaunch: null, upcoming: [], recent: [], sites: [], variants: [],
  };
  if (!entry) return empty;

  const rows = await prisma.spaceEvent.findMany({
    where: { rocket: { not: null }, type: { in: [...LAUNCH_EVENT_TYPES] } },
    select: SELECT,
    orderBy: { launchDate: 'asc' },
  });
  const mine = rows.filter((r) => entry.matcher.test(r.rocket ?? ''));
  if (mine.length === 0) return empty;

  const past = mine.filter((r) => r.launchDate && r.launchDate.getTime() <= now.getTime());
  const future = mine.filter((r) => r.launchDate && r.launchDate.getTime() > now.getTime());
  const completed = past.filter((r) => r.status === 'completed').length;
  const failed = past.filter((r) => r.status === 'failed').length;
  const flown = completed + failed;
  const ninety = now.getTime() - 90 * 86_400_000;
  const siteCounts = new Map<string, number>();
  for (const r of past) if (r.location) siteCounts.set(r.location, (siteCounts.get(r.location) ?? 0) + 1);

  return {
    trackedSince: past[0]?.launchDate ?? mine[0]?.launchDate ?? null,
    flown,
    completed,
    failed,
    scrubbedOrUnknown: past.length - flown,
    last90Days: past.filter((r) => r.launchDate!.getTime() >= ninety && r.status !== 'scrubbed').length,
    successRatePct: flown > 0 ? Math.round((completed / flown) * 1000) / 10 : null,
    nextLaunch: future[0] ?? null,
    upcoming: future.slice(0, 8),
    recent: past.slice(-10).reverse(),
    sites: Array.from(siteCounts.entries()).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count),
    variants: Array.from(new Set(mine.map((r) => r.rocket!))).sort(),
  };
}

/** Index-page summary for every catalogued rocket in one scan. */
export async function getRocketIndex(now: Date = new Date()): Promise<Array<{ slug: string; spec: LaunchVehicle; flown: number; last90Days: number; nextLaunch: Date | null }>> {
  const rows = await prisma.spaceEvent.findMany({
    where: { rocket: { not: null }, type: { in: [...LAUNCH_EVENT_TYPES] } },
    select: { rocket: true, launchDate: true, status: true },
  });
  const ninety = now.getTime() - 90 * 86_400_000;
  return allRocketSlugs().map((slug) => {
    const entry = getRocketEntry(slug)!;
    const spec = getRocketSpec(slug)!;
    const mine = rows.filter((r) => entry.matcher.test(r.rocket ?? ''));
    const past = mine.filter((r) => r.launchDate && r.launchDate.getTime() <= now.getTime());
    const future = mine.filter((r) => r.launchDate && r.launchDate.getTime() > now.getTime()).sort((a, b) => a.launchDate!.getTime() - b.launchDate!.getTime());
    return {
      slug,
      spec,
      flown: past.filter((r) => r.status === 'completed' || r.status === 'failed').length,
      last90Days: past.filter((r) => r.launchDate!.getTime() >= ninety && r.status !== 'scrubbed').length,
      nextLaunch: future[0]?.launchDate ?? null,
    };
  });
}
