import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { withCache, CACHE_TTL } from '@/lib/api-cache';
import type { PredictionOption } from '@/lib/game/prediction-exchange';

export const dynamic = 'force-dynamic';

interface CachedQuestion {
  id: string;
  question: string;
  options: PredictionOption[];
  category: string;
  closesAt: string;
  resolvesAt: string | null;
  sourceHref: string | null;
  status: 'open' | 'pending' | 'resolved';
  poolByOption: Record<string, number>;
  stakeCount: number;
  outcomeOptionId: string | null;
  resolvedAt: string | null;
}

interface CachedPayload {
  open: CachedQuestion[];
  resolved: CachedQuestion[];
}

function summarize(
  q: { id: string; question: string; options: unknown; category: string; closesAt: Date; resolvesAt: Date | null; sourceHref: string | null; outcomeOptionId: string | null; resolvedAt: Date | null; stakes: { optionId: string; stake: number }[] },
  status: CachedQuestion['status'],
): CachedQuestion {
  const poolByOption: Record<string, number> = {};
  for (const s of q.stakes) poolByOption[s.optionId] = (poolByOption[s.optionId] || 0) + s.stake;
  return {
    id: q.id,
    question: q.question,
    options: (q.options as PredictionOption[]) || [],
    category: q.category,
    closesAt: q.closesAt.toISOString(),
    resolvesAt: q.resolvesAt ? q.resolvesAt.toISOString() : null,
    sourceHref: q.sourceHref,
    status,
    poolByOption,
    stakeCount: q.stakes.length,
    outcomeOptionId: q.outcomeOptionId,
    resolvedAt: q.resolvedAt ? q.resolvedAt.toISOString() : null,
  };
}

/**
 * Shared (non-personalized) view of open + recently-resolved questions,
 * cached ~5min — this is the expensive aggregate-pool query and identical
 * for every viewer. Per-user "your stake" is merged in per-request below
 * (cheap, keyed off a handful of question ids).
 */
async function fetchQuestionsPayload(): Promise<CachedPayload> {
  const now = new Date();
  const [openRows, resolvedRows] = await Promise.all([
    prisma.predictionQuestion.findMany({
      where: { outcomeOptionId: null },
      orderBy: { closesAt: 'asc' },
      take: 20,
      include: { stakes: { select: { optionId: true, stake: true } } },
    }),
    prisma.predictionQuestion.findMany({
      where: { outcomeOptionId: { not: null } },
      orderBy: { resolvedAt: 'desc' },
      take: 15,
      include: { stakes: { select: { optionId: true, stake: true } } },
    }),
  ]);

  return {
    open: openRows.map(q => summarize(q, q.closesAt.getTime() <= now.getTime() ? 'pending' : 'open')),
    resolved: resolvedRows.map(q => summarize(q, 'resolved')),
  };
}

/**
 * GET /api/space-tycoon/predictions
 * Public read: open questions (with real-event links + aggregate stake
 * pools, no per-player breakdown) and recently-resolved questions with
 * outcomes. When logged in, each question also carries `yourStake` (your
 * chosen option, stake, and payout once resolved) — always fetched live,
 * never cached, so it can't leak between players.
 */
export async function GET() {
  try {
    const payload = await withCache('prediction-exchange:list', fetchQuestionsPayload, { ttlSeconds: CACHE_TTL.FREQUENT });

    let yourStakes: Record<string, { optionId: string; stake: number; payout: number | null }> = {};
    const session = await getServerSession(authOptions).catch(() => null);
    if (session?.user?.id) {
      const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (profile) {
        const ids = [...payload.open, ...payload.resolved].map(q => q.id);
        if (ids.length > 0) {
          const stakes = await prisma.predictionStake.findMany({
            where: { profileId: profile.id, questionId: { in: ids } },
            select: { questionId: true, optionId: true, stake: true, payout: true },
          });
          yourStakes = Object.fromEntries(stakes.map(s => [s.questionId, { optionId: s.optionId, stake: s.stake, payout: s.payout }]));
        }
      }
    }

    const attach = (q: CachedQuestion) => ({ ...q, yourStake: yourStakes[q.id] ?? null });
    return NextResponse.json({
      open: payload.open.map(attach),
      resolved: payload.resolved.map(attach),
    });
  } catch (error) {
    // Graceful degrade if PredictionQuestion hasn't been migrated yet, or on
    // any other failure — same pattern as the bounty board's GET.
    logger.error('Prediction exchange list error', { error: String(error) });
    return NextResponse.json({ open: [], resolved: [] });
  }
}
