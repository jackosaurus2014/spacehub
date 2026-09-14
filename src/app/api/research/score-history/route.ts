import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, validationError } from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import { SPACE_SCORE_METHODOLOGY_VERSION } from '@/lib/research-export';

export const dynamic = 'force-dynamic';

const MAX_DAYS = 1095; // three years
const MAX_COMPANIES = 25;

/**
 * Space Score TIME SERIES. GATE: requireResearchAccess, server-side.
 *
 * What stays free, and did not move: the current leaderboard and every
 * company's current score at /space-score and /api/space-score. Research sells
 * the history, which did not exist before 2026-09-14 — nobody lost a reading
 * they used to have.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const params = new URL(req.url).searchParams;
  const slugs = (params.get('companies') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const days = Math.min(MAX_DAYS, Math.max(1, parseInt(params.get('days') || '365', 10) || 365));

  if (slugs.length > MAX_COMPANIES) {
    return validationError(
      `At most ${MAX_COMPANIES} companies per request. Use the Research export for the whole series.`
    );
  }

  try {
    const since = new Date(Date.now() - days * 86_400_000);
    const snapshots = await prisma.spaceScoreSnapshot.findMany({
      where: {
        day: { gte: since },
        ...(slugs.length > 0 ? { companySlug: { in: slugs } } : {}),
      },
      orderBy: [{ companySlug: 'asc' }, { day: 'asc' }],
      take: 20_000,
    });

    const series = new Map<
      string,
      { companySlug: string; companyName: string; points: { day: string; score: number }[] }
    >();
    for (const s of snapshots) {
      const entry =
        series.get(s.companySlug) ??
        { companySlug: s.companySlug, companyName: s.companyName, points: [] };
      entry.companyName = s.companyName;
      entry.points.push({ day: s.day.toISOString().slice(0, 10), score: s.score });
      series.set(s.companySlug, entry);
    }

    const earliest = await prisma.spaceScoreSnapshot.findFirst({
      orderBy: { day: 'asc' },
      select: { day: true },
    });

    return createSuccessResponse({
      series: Array.from(series.values()),
      requestedDays: days,
      methodologyVersion: SPACE_SCORE_METHODOLOGY_VERSION,
      historyStartsAt: earliest ? earliest.day.toISOString().slice(0, 10) : null,
      // Said plainly, every time, rather than in a footnote on one page.
      coverage:
        'Daily snapshots, not backfilled. Any date before historyStartsAt genuinely has no reading and we will not synthesise one. The current score stays free for everyone at /space-score.',
    });
  } catch (error) {
    logger.error('Score history failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not read the Space Score history.');
  }
}
