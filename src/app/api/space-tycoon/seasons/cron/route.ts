import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentSeasonNumber, getSeasonSchedule, SEASON_DEFINITIONS } from '@/lib/game/seasonal-events';

export const dynamic = 'force-dynamic';

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

    logger.info('Seasons cron completed', { currentSeasonNumber: currentN, processed: seasonNumbers, changes: changes.length });
    return NextResponse.json({ success: true, currentSeasonNumber: currentN, changes });
  } catch (error) {
    logger.error('Seasons cron error', { error: String(error) });
    return NextResponse.json({ error: 'Seasons cron failed' }, { status: 500 });
  }
}
