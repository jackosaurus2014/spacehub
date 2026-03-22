import { NextResponse } from 'next/server';
import { getGlobalGameDate, formatServerDate, secondsUntilNextMonth, REAL_SECONDS_PER_GAME_MONTH } from '@/lib/game/server-time';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/time
 * Returns the canonical global game date that ALL players share.
 * Clients should use this to sync their display, not their local gameDate.
 */
export async function GET() {
  const now = Date.now();
  const gameDate = getGlobalGameDate(now);
  const nextMonthIn = secondsUntilNextMonth(now);

  return NextResponse.json({
    gameDate: {
      year: gameDate.year,
      month: gameDate.month,
      totalMonths: gameDate.totalMonths,
      formatted: formatServerDate(gameDate),
    },
    nextMonthInSeconds: Math.round(nextMonthIn),
    realSecondsPerGameMonth: REAL_SECONDS_PER_GAME_MONTH,
    serverTimeMs: now,
  });
}
