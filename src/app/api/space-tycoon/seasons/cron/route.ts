import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentSeasonNumber, getSeasonSchedule, SEASON_DEFINITIONS } from '@/lib/game/seasonal-events';
import { assembleSeasonChronicle, type AllianceCharterOutcome } from '@/lib/game/season-chronicle';

export const dynamic = 'force-dynamic';

/**
 * Live-Service Wave LS7 (docs/LIVE_SERVICE_2026-08.md §LS7): seal a
 * completed season's permanent Season Chronicle record. Runs once per
 * season — only when `results` is still null, so a sealed record is never
 * overwritten (the whole point of a "permanent archive"). Best-effort: any
 * failure here is caught by the caller and logged, never allowed to break
 * the status upsert this cron already exists to do.
 */
async function sealSeasonChronicle(seasonNumber: number, seasonType: string, now: Date): Promise<boolean> {
  const event = await prisma.seasonalEvent.findUnique({
    where: { seasonType_seasonNumber: { seasonType, seasonNumber } },
  });
  if (!event || event.status !== 'completed' || event.results !== null) return false;

  const [participations, charters] = await Promise.all([
    prisma.seasonParticipation.findMany({
      where: { eventId: event.id },
      orderBy: { totalScore: 'desc' },
      take: 10,
      select: {
        profileId: true,
        totalScore: true,
        bracket: true,
        profile: { select: { companyName: true, title: true } },
      },
    }),
    prisma.allianceCharter.findMany({
      where: { seasonNumber, status: 'completed' },
      select: {
        charterType: true,
        grade: true,
        alliance: { select: { name: true, tag: true } },
      },
    }),
  ]);

  const participantCount = await prisma.seasonParticipation.count({ where: { eventId: event.id } });

  const allianceOutcomes: AllianceCharterOutcome[] = charters.map(c => ({
    allianceName: c.alliance.name,
    allianceTag: c.alliance.tag,
    charterType: c.charterType,
    grade: c.grade,
  }));

  const record = assembleSeasonChronicle({
    seasonNumber,
    seasonType,
    title: event.title,
    startsAt: event.startsAt.getTime(),
    endsAt: event.endsAt.getTime(),
    participantCount,
    placements: participations.map(p => ({
      profileId: p.profileId,
      companyName: p.profile.companyName,
      title: p.profile.title,
      totalScore: p.totalScore,
      bracket: p.bracket,
    })),
    allianceOutcomes,
    nowMs: now.getTime(),
  });

  await prisma.seasonalEvent.update({
    where: { id: event.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { results: record as any },
  });
  return true;
}

/**
 * POST /api/space-tycoon/seasons/cron
 *
 * 4X Wave W3 (docs/4X_BASELINE_2026-08.md): seasonal-event generation —
 * closes audit finding C4 / defect ledger #8 ("no cron instantiates
 * SeasonalEvent rows"). GET /seasons, /seasons/join, /seasons/leaderboard,
 * and /seasons/progress have always been able to READ the SeasonalEvent
 * table; nothing has ever WRITTEN it, so the seasons feature has been a
 * permanently-empty shell since it shipped.
 *
 * The schedule (seasonal-events.ts getSeasonSchedule/getCurrentSeasonNumber)
 * is a deterministic, DB-free function of the clock alone — this route just
 * makes sure the previous/current/next season's row exists with the status
 * (upcoming/active/completed) that schedule implies. Idempotent: safe to run
 * on any cadence, any number of times — upserts on the (seasonType,
 * seasonNumber) unique key and only writes when status actually changed.
 *
 * Registered daily in cron-scheduler.ts (seasons run in ~31-day cycles, so
 * daily polling is far more than sufficient); CSRF-exempted in
 * middleware.ts alongside the other space-tycoon cron paths (same pattern
 * as /api/space-tycoon/market/mean-revert).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const currentN = getCurrentSeasonNumber(now);
    // Keep the previous season (recently-ended display), the current one,
    // and the next one (so REGISTRATION/ANNOUNCED phases have a row before
    // they start) all present — mirrors the GET route's take:3 window.
    const seasonNumbers = Array.from(new Set([currentN - 1, currentN, currentN + 1].filter(n => n >= 1)));

    const changes: { seasonNumber: number; seasonType: string; status: string; created: boolean }[] = [];

    for (const n of seasonNumbers) {
      const { seasonType, startsAt, endsAt } = getSeasonSchedule(n);
      const def = SEASON_DEFINITIONS[seasonType];
      const status = endsAt.getTime() <= now.getTime()
        ? 'completed'
        : startsAt.getTime() <= now.getTime()
          ? 'active'
          : 'upcoming';

      const existing = await prisma.seasonalEvent.findUnique({
        where: { seasonType_seasonNumber: { seasonType, seasonNumber: n } },
      });

      if (!existing) {
        await prisma.seasonalEvent.create({
          data: {
            seasonType,
            seasonNumber: n,
            title: `${def.name} — Season ${n}`,
            description: def.description,
            startsAt,
            endsAt,
            status,
            passRewards: [],
            challengePool: [],
          },
        });
        changes.push({ seasonNumber: n, seasonType, status, created: true });
      } else if (existing.status !== status) {
        await prisma.seasonalEvent.update({ where: { id: existing.id }, data: { status } });
        changes.push({ seasonNumber: n, seasonType, status, created: false });
      }
    }

    // LS7: seal the Season Chronicle for any season in this window that just
    // completed and hasn't been sealed yet. Cheap no-op for every other
    // season (sealSeasonChronicle short-circuits on status/results checks).
    let sealed = 0;
    for (const n of seasonNumbers) {
      const { seasonType } = getSeasonSchedule(n);
      try {
        if (await sealSeasonChronicle(n, seasonType, now)) sealed++;
      } catch (err) {
        logger.error('Season Chronicle seal failed', { seasonNumber: n, seasonType, error: String(err) });
      }
    }

    logger.info('Seasons cron completed', { currentSeasonNumber: currentN, processed: seasonNumbers, changes: changes.length, sealed });
    return NextResponse.json({ success: true, currentSeasonNumber: currentN, changes, sealed });
  } catch (error) {
    logger.error('Seasons cron error', { error: String(error) });
    return NextResponse.json({ error: 'Seasons cron failed' }, { status: 500 });
  }
}
