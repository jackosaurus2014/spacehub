import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  generateWeeklyEventQuestions, buildStockQuestionSpec, selectWeeklyTicker,
  resolveSpaceEventOutcome, resolveStockOutcome, computePayout,
  LAUNCH_CANDIDATE_WINDOW_DAYS,
  type LaunchCandidate, type TickerCandidate, type GeneratedQuestionSpec,
} from '@/lib/game/prediction-exchange';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance();

/**
 * Space Tycoon: Prediction Exchange cron.
 *
 * Two actions on one route (same pattern as /api/refresh?type=...):
 *   ?action=generate — weekly (Mondays): auto-generate 3-5 questions from
 *     data WE already track — upcoming SpaceEvent rows (launches +
 *     milestones) and one stock question snapshotting a real quote via
 *     yahoo-finance2 at generation time.
 *   ?action=resolve  — daily: settle any question past its resolvesAt gate
 *     against that SAME tracked data (never client input), then credit
 *     winning stakes 2x via the existing GameLedgerEntry ledger.
 *
 * Deployment safety: PredictionQuestion/PredictionStake ship in this PR but
 * the migration (`prisma db push`) may not have run yet. Both handlers probe
 * the table first and no-op (200, not 500) if it's missing, so the cron
 * scheduler's watchdog doesn't flag this as failing before the migration
 * lands — same pattern as server-ledger.ts's isLedgerAvailable() probe.
 */

async function isPredictionTableAvailable(): Promise<boolean> {
  try {
    await prisma.predictionQuestion.count({ take: 1 });
    return true;
  } catch {
    return false;
  }
}

function authorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return process.env.NODE_ENV !== 'production';
}

// ─── Generate ────────────────────────────────────────────────────────────────

async function runGenerate(now: Date) {
  const windowEnd = new Date(now.getTime() + LAUNCH_CANDIDATE_WINDOW_DAYS * 86_400_000);

  const eventRows = await prisma.spaceEvent.findMany({
    where: {
      status: { in: ['upcoming', 'go', 'tbd', 'tbc'] },
      OR: [
        { windowStart: { gte: now, lte: windowEnd } },
        { AND: [{ windowStart: null }, { launchDate: { gte: now, lte: windowEnd } }] },
      ],
    },
    orderBy: [{ windowStart: 'asc' }, { launchDate: 'asc' }],
    take: 30,
    select: { id: true, name: true, mission: true, rocket: true, type: true, windowStart: true, windowEnd: true, launchDate: true, infoUrl: true },
  });

  const candidates: LaunchCandidate[] = eventRows.map(e => ({
    id: e.id, name: e.name, mission: e.mission, rocket: e.rocket, type: e.type,
    windowStart: e.windowStart, windowEnd: e.windowEnd, launchDate: e.launchDate, infoUrl: e.infoUrl,
  }));

  const specs: GeneratedQuestionSpec[] = generateWeeklyEventQuestions({ now, candidates });

  // Stock question: deterministic weekly ticker pick from our public-company roster.
  let stockPick: { ticker: string; error?: string } | null = null;
  try {
    const companies = await prisma.companyProfile.findMany({
      where: { ticker: { not: null }, isPublic: true },
      select: { ticker: true, name: true },
      take: 300,
    });
    const seen = new Set<string>();
    const tickers: TickerCandidate[] = [];
    for (const c of companies) {
      if (!c.ticker || seen.has(c.ticker)) continue;
      seen.add(c.ticker);
      tickers.push({ ticker: c.ticker, name: c.name });
    }
    const picked = selectWeeklyTicker(tickers, now);
    if (picked) {
      stockPick = { ticker: picked.ticker };
      const quote = await yahooFinance.quote(picked.ticker);
      const price = quote.regularMarketPrice;
      if (typeof price === 'number' && price > 0) {
        const stockSpec = buildStockQuestionSpec(picked, now, price);
        if (stockSpec) specs.push(stockSpec);
      } else {
        stockPick.error = 'No live price returned';
      }
    }
  } catch (error) {
    logger.warn('Prediction exchange: stock question generation failed (skipping this week)', { error: String(error) });
    if (stockPick) stockPick.error = String(error);
  }

  if (specs.length === 0) {
    return { created: 0, attempted: 0, stockPick };
  }

  const result = await prisma.predictionQuestion.createMany({
    data: specs.map(s => ({
      key: s.key,
      question: s.question,
      options: s.options as unknown as Prisma.InputJsonValue,
      category: s.category,
      closesAt: s.closesAt,
      resolvesAt: s.resolvesAt,
      sourceHref: s.sourceHref,
      sourceRef: (s.sourceRef as Prisma.InputJsonValue | undefined) ?? undefined,
    })),
    skipDuplicates: true,
  });

  logger.info('Prediction exchange: weekly questions generated', {
    attempted: specs.length, created: result.count, stockPick,
  });

  return { created: result.count, attempted: specs.length, stockPick };
}

// ─── Resolve ─────────────────────────────────────────────────────────────────

async function runResolve(now: Date) {
  const ledgerOn = await isLedgerAvailable();

  const pending = await prisma.predictionQuestion.findMany({
    where: {
      outcomeOptionId: null,
      OR: [
        { resolvesAt: { lte: now } },
        { resolvesAt: null, closesAt: { lte: now } },
      ],
    },
    take: 25,
  });

  let resolved = 0;
  let skipped = 0;
  let payoutsCredited = 0;
  let totalPaidOut = 0;

  for (const question of pending) {
    try {
      let outcomeOptionId: string | null = null;

      if (question.category === 'launch' || question.category === 'milestone') {
        const ref = question.sourceRef as { spaceEventId?: string } | null;
        const spaceEventId = ref?.spaceEventId;
        const event = spaceEventId
          ? await prisma.spaceEvent.findUnique({ where: { id: spaceEventId }, select: { status: true } })
          : null;
        outcomeOptionId = resolveSpaceEventOutcome(event?.status ?? null);
      } else if (question.category === 'stocks') {
        const ref = question.sourceRef as { ticker?: string; basePrice?: number } | null;
        if (!ref?.ticker || typeof ref.basePrice !== 'number') {
          outcomeOptionId = 'down'; // malformed sourceRef — resolve conservatively rather than get stuck forever
        } else {
          try {
            const quote = await yahooFinance.quote(ref.ticker);
            const closePrice = quote.regularMarketPrice;
            if (typeof closePrice === 'number' && closePrice > 0) {
              outcomeOptionId = resolveStockOutcome(ref.basePrice, closePrice);
            }
          } catch (quoteError) {
            logger.warn('Prediction exchange: stock quote fetch failed during resolution, will retry next pass', {
              questionId: question.id, ticker: ref.ticker, error: String(quoteError),
            });
          }
        }
      }

      if (!outcomeOptionId) {
        skipped++;
        continue;
      }

      const stakes = await prisma.predictionStake.findMany({ where: { questionId: question.id, payout: null } });

      await prisma.$transaction(async (tx) => {
        await tx.predictionQuestion.update({
          where: { id: question.id },
          data: { outcomeOptionId, resolvedAt: now },
        });

        for (const stake of stakes) {
          const payout = computePayout(stake.stake, stake.optionId, outcomeOptionId!);
          await tx.predictionStake.update({
            where: { id: stake.id },
            data: { payout, paidOutAt: now },
          });
          if (payout > 0 && ledgerOn) {
            await tx.gameProfile.update({
              where: { id: stake.profileId },
              data: { money: { increment: payout } },
            });
            await recordLedger(tx, {
              profileId: stake.profileId, moneyDelta: payout,
              reason: 'prediction_payout', refId: question.id,
            });
            payoutsCredited++;
            totalPaidOut += payout;
          }
        }
      });

      resolved++;
    } catch (error) {
      logger.error('Prediction exchange: failed to resolve question', { questionId: question.id, error: String(error) });
    }
  }

  logger.info('Prediction exchange: resolution pass complete', { resolved, skipped, payoutsCredited, totalPaidOut, ledgerOn });
  return { resolved, skipped, payoutsCredited, totalPaidOut };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isPredictionTableAvailable())) {
      logger.warn('Prediction exchange cron: PredictionQuestion table unavailable — run prisma db push. Skipping.');
      return NextResponse.json({ success: true, skipped: true, reason: 'PredictionQuestion table not yet migrated' });
    }

    const action = new URL(request.url).searchParams.get('action') || 'generate';
    const now = new Date();

    if (action === 'resolve') {
      const result = await runResolve(now);
      return NextResponse.json({ success: true, action, ...result });
    }

    const result = await runGenerate(now);
    return NextResponse.json({ success: true, action: 'generate', ...result });
  } catch (error) {
    logger.error('Prediction exchange cron error', { error: String(error) });
    return NextResponse.json({ error: 'Prediction exchange cron failed' }, { status: 500 });
  }
}
