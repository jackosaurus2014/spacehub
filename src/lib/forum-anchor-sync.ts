/**
 * Anchor sync — keeps the forum attached to what the site is already showing.
 *
 * Runs on a cron (hourly). Three jobs, in order of how much pulse they buy:
 *
 *   1. LAUNCHES. Every upcoming launch inside the horizon gets a standing
 *      thread. This is the one that matters, because it is the only anchor
 *      with an audience already assembled and already being emailed: the
 *      launch-watch list gets a T-24 and a T-1 alert per launch, and those
 *      emails now carry a discussion link. A launch is also naturally
 *      time-boxed — interest spikes, people want to talk during the window,
 *      and the thread is a permanent record afterwards.
 *   2. REFRESH. Launches slip constantly (the site has a whole Slip Index
 *      about it). When the date or status moves, the anchor snapshot moves
 *      with it, so the thread header and the empty state never show a T-0
 *      that has already passed.
 *   3. RETIRE. When a subject disappears from the feed, the anchor is marked
 *      retired rather than deleted: the conversation stays, the link into a
 *      404 does not.
 *
 * Guides and companies are deliberately NOT bulk-created here. There are 31
 * guides and 253 company profiles; opening 284 empty threads would recreate
 * the exact ghost town this revival exists to avoid. Those anchor on first
 * post instead (see POST /api/forums/anchor) — the thread comes into being
 * with a real reader's words already in it.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';
import { ensureAnchor, refreshAnchor, type AnchorSubject } from '@/lib/forum-anchors';
import { FORUM_CATEGORY_SEEDS } from '@/lib/forum-categories';

/**
 * How far ahead a launch gets a thread. Three weeks is roughly when a launch
 * stops being a rumour and starts being a date people plan around — far
 * enough out that the T-24 alert finds a thread waiting, near enough that the
 * category is not filled with threads for flights six months away.
 */
export const LAUNCH_ANCHOR_HORIZON_DAYS = 21;

/** Ceiling per run, so a feed backfill can never open hundreds of threads. */
export const MAX_ANCHORS_PER_RUN = 25;

export interface LaunchEventLike {
  id: string;
  name: string;
  rocket: string | null;
  location: string | null;
  agency: string | null;
  mission: string | null;
  launchDate: Date | null;
  launchDatePrecision: string | null;
  status: string;
}

/**
 * Format a launch date for display, honouring the feed's own precision flag.
 * The site learned this lesson the hard way: undated launches lumped into
 * December because a null precision was treated as an exact timestamp.
 */
export function formatLaunchWhen(
  date: Date | null,
  precision: string | null
): string {
  if (!date) return 'Date not yet announced';
  const p = (precision || 'exact').toLowerCase();
  if (p === 'year') {
    return date.getUTCFullYear().toString();
  }
  if (p === 'quarter' || p === 'month') {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  if (p === 'day') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return `${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })} · ${date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })} UTC`;
}

/** The anchor subject for one launch — the snapshot the thread renders. */
export function launchSubject(e: LaunchEventLike): AnchorSubject {
  const facts: Record<string, string> = {};
  if (e.rocket) facts['Vehicle'] = e.rocket;
  if (e.agency) facts['Provider'] = e.agency;
  if (e.location) facts['Pad'] = e.location;
  facts['T-0'] = formatLaunchWhen(e.launchDate, e.launchDatePrecision);
  if (e.status && e.status !== 'upcoming') facts['Status'] = e.status;

  const subtitle = e.mission
    ? `Mission: ${e.mission}`
    : e.rocket
      ? `${e.rocket} from ${e.location || 'a pad to be confirmed'}.`
      : undefined;

  return {
    anchorType: 'launch',
    anchorKey: e.id,
    title: e.name,
    url: `${APP_URL}/launch/${e.id}`,
    subtitle,
    facts,
    subjectDate: e.launchDate,
  };
}

export interface AnchorSyncResult {
  scanned: number;
  created: number;
  refreshed: number;
  retired: number;
  skipped: number;
}

/**
 * Open, refresh and retire launch anchors. Safe to run repeatedly — every
 * step is keyed on (anchorType, anchorKey) and does nothing when the world
 * already matches.
 */
export async function syncLaunchAnchors(now: Date = new Date()): Promise<AnchorSyncResult> {
  const result: AnchorSyncResult = { scanned: 0, created: 0, refreshed: 0, retired: 0, skipped: 0 };

  const horizon = new Date(now.getTime() + LAUNCH_ANCHOR_HORIZON_DAYS * 24 * 3600_000);

  // A launch earns a thread when it is real enough to plan around: a named
  // vehicle, a date inside the horizon, and a status that is not already
  // closed out. 'tbd' is included deliberately — a launch nobody can pin down
  // is often exactly what people want to talk about.
  const events = (await prisma.spaceEvent.findMany({
    where: {
      type: 'launch',
      rocket: { not: null },
      launchDate: { gte: new Date(now.getTime() - 24 * 3600_000), lte: horizon },
      status: { in: ['upcoming', 'tbd', 'in_progress'] },
    },
    select: {
      id: true,
      name: true,
      rocket: true,
      location: true,
      agency: true,
      mission: true,
      launchDate: true,
      launchDatePrecision: true,
      status: true,
    },
    orderBy: { launchDate: 'asc' },
    take: 200,
  })) as LaunchEventLike[];

  result.scanned = events.length;

  const existing = await prisma.forumAnchor.findMany({
    where: { anchorType: 'launch' },
    select: { anchorKey: true, subjectDate: true, subjectTitle: true, retiredAt: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byKey = new Map(existing.map((a: any) => [a.anchorKey, a]));

  for (const e of events) {
    const subject = launchSubject(e);
    const prior = byKey.get(e.id);

    if (!prior) {
      if (result.created >= MAX_ANCHORS_PER_RUN) {
        result.skipped++;
        continue;
      }
      const made = await ensureAnchor(subject);
      if (made?.created) result.created++;
      else result.skipped++;
      continue;
    }

    // Only write when something a reader would notice has actually moved.
    const dateMoved =
      (prior.subjectDate?.getTime() ?? null) !== (e.launchDate?.getTime() ?? null);
    const titleMoved = prior.subjectTitle !== e.name;
    if (dateMoved || titleMoved || prior.retiredAt) {
      await refreshAnchor(subject);
      result.refreshed++;
    }
  }

  // Retire anchors whose launch has left the feed entirely. Past launches are
  // NOT retired — a flown mission's thread should still link to its page.
  const liveKeys = new Set(events.map((e) => e.id));
  const stale = existing.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => !a.retiredAt && !liveKeys.has(a.anchorKey)
  );
  if (stale.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staleKeys = stale.map((a: any) => a.anchorKey);
    const stillReal = await prisma.spaceEvent.findMany({
      where: { id: { in: staleKeys } },
      select: { id: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realIds = new Set(stillReal.map((e: any) => e.id));
    const gone = staleKeys.filter((k: string) => !realIds.has(k));
    if (gone.length > 0) {
      const { count } = await prisma.forumAnchor.updateMany({
        where: { anchorType: 'launch', anchorKey: { in: gone } },
        data: { retiredAt: now } as never,
      });
      result.retired = count;
    }
  }

  logger.info('Forum launch anchors synced', { ...result });
  return result;
}

/**
 * Sweep anchors whose thread has been deleted. The anchor row holds threadId
 * as a plain string by design (no FK, no cascade), so a moderator removing a
 * thread leaves an anchor pointing at nothing — which would otherwise make
 * the subject page offer a "Discuss this" link into a 404, and block a fresh
 * anchor from ever being opened for that subject.
 */
export async function sweepOrphanedAnchors(): Promise<number> {
  const anchors = await prisma.forumAnchor.findMany({ select: { id: true, threadId: true } });
  if (anchors.length === 0) return 0;

  const threads = await prisma.forumThread.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { id: { in: anchors.map((a: any) => a.threadId) } },
    select: { id: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const live = new Set(threads.map((t: any) => t.id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orphans = anchors.filter((a: any) => !live.has(a.threadId)).map((a: any) => a.id);
  if (orphans.length === 0) return 0;

  const { count } = await prisma.forumAnchor.deleteMany({ where: { id: { in: orphans } } });
  logger.info('Forum anchors swept (thread deleted)', { count });
  return count;
}

/**
 * Make sure the category structure exists before anything tries to file a
 * thread into it.
 *
 * ensureAnchor refuses to create a thread when its category is missing, which
 * is the right call — an orphaned thread in a category nobody can browse to
 * is worse than no thread. But that turns a fresh database into a forum that
 * silently never opens an anchor. The routes each auto-seed on read, so the
 * gap only shows when the cron runs before any human has loaded the forum;
 * doing it here closes it and makes the cron self-sufficient.
 *
 * Upsert with an empty update: an operator who has renamed a category or
 * reworded a description keeps their wording.
 */
export async function ensureForumCategories(): Promise<number> {
  const existing = await prisma.forumCategory.count();
  if (existing >= FORUM_CATEGORY_SEEDS.length) return 0;

  let created = 0;
  for (const cat of FORUM_CATEGORY_SEEDS) {
    const before = await prisma.forumCategory.findUnique({
      where: { slug: cat.slug },
      select: { id: true },
    });
    if (before) continue;
    // upsert, not create: two runs overlapping on a cold start would race on
    // the unique slug and one would throw half-way through the set.
    await prisma.forumCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat as never,
    });
    created++;
  }
  if (created > 0) logger.info('Forum categories seeded', { created });
  return created;
}

/** The whole cron run. */
export async function runForumAnchorSync(now: Date = new Date()): Promise<
  AnchorSyncResult & { orphansSwept: number; categoriesSeeded: number }
> {
  const categoriesSeeded = await ensureForumCategories();
  const orphansSwept = await sweepOrphanedAnchors();
  const launches = await syncLaunchAnchors(now);
  return { ...launches, orphansSwept, categoriesSeeded };
}
