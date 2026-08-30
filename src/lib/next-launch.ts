import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// The one line the whole site promises: the next launch. Server-side, cached
// 60s, one query. Returns null on any failure so callers render a static
// "Next launch →" link — never an em-dash (audit 2026-08-30, LiveRail).
export interface NextLaunch {
  id: string;
  name: string;
  launchDate: string; // ISO
  rocket: string | null;
  location: string | null;
  status: string;
}

async function queryNextLaunch(): Promise<NextLaunch | null> {
  try {
    const now = new Date();
    const ev = await prisma.spaceEvent.findFirst({
      where: { launchDate: { gte: now }, status: { in: ['upcoming', 'go', 'tbc', 'tbd'] }, externalId: { not: null } },
      orderBy: { launchDate: 'asc' },
      select: { id: true, name: true, launchDate: true, rocket: true, location: true, status: true },
    });
    if (!ev || !ev.launchDate) return null;
    return { id: ev.id, name: ev.name, launchDate: ev.launchDate.toISOString(), rocket: ev.rocket, location: ev.location, status: ev.status };
  } catch (error) {
    logger.warn('next-launch: query failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export const getNextLaunch = unstable_cache(queryNextLaunch, ['next-launch-v1'], { revalidate: 60 });

/** "Starlink 12-8" from "Falcon 9 Block 5 | Starlink 12-8". */
export function missionOf(name: string): string {
  const parts = name.split(' | ');
  return (parts.length > 1 ? parts[parts.length - 1] : name).trim();
}
