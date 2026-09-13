/**
 * Server-side data for the 24/7 pad view. The decision itself lives in the
 * pure module (launch-pad-view.ts); this is only the I/O around it, shared by
 * /live/pad and the pad card on a live launch page.
 */
import prisma from './db';
import { logger } from './logger';
import { detectLiveStreams } from './livestream-detector';
import { choosePadView, type PadNextLaunch, type PadReplay, type PadView } from './launch-pad-view';
import type { DetectedStreamLike } from './launch-live-window';

/** Standing project rule: a scheduled launch is one of these four statuses. */
export const SCHEDULED_STATUSES = ['upcoming', 'go', 'tbc', 'tbd'] as const;

async function getNextScheduledLaunch(): Promise<PadNextLaunch | null> {
  try {
    const row = await prisma.spaceEvent.findFirst({
      where: { launchDate: { gte: new Date() }, status: { in: [...SCHEDULED_STATUSES] } },
      orderBy: { launchDate: 'asc' },
      select: { id: true, name: true, launchDate: true, rocket: true, location: true, agency: true, status: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      launchDate: row.launchDate?.toISOString() ?? null,
      rocket: row.rocket,
      location: row.location,
      agency: row.agency,
      status: row.status,
    };
  } catch (error) {
    logger.warn('pad view: next launch query failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function getMostRecentReplay(): Promise<PadReplay | null> {
  try {
    const row = await prisma.spaceEvent.findFirst({
      where: {
        launchDate: { lte: new Date(), gte: new Date(Date.now() - 120 * 86_400_000) },
        status: { in: ['completed', 'failed'] },
        OR: [{ videoUrl: { not: null } }, { streamUrl: { not: null } }],
      },
      orderBy: { launchDate: 'desc' },
      select: { id: true, name: true, launchDate: true, videoUrl: true, streamUrl: true },
    });
    const url = row?.videoUrl || row?.streamUrl;
    if (!row || !url) return null;
    return { id: row.id, name: row.name, launchDate: row.launchDate?.toISOString() ?? null, videoUrl: url };
  } catch (error) {
    logger.warn('pad view: replay query failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function getPadView(preloadedStreams?: readonly DetectedStreamLike[]): Promise<PadView> {
  const [streams, nextLaunch, replay] = await Promise.all([
    preloadedStreams ? Promise.resolve(preloadedStreams) : detectLiveStreams().catch(() => [] as DetectedStreamLike[]),
    getNextScheduledLaunch(),
    getMostRecentReplay(),
  ]);
  return choosePadView({ streams, nextLaunch, replay });
}
