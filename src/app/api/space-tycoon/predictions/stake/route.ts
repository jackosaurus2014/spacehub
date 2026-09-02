import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import { validateStakeAmount, type PredictionOption } from '@/lib/game/prediction-exchange';
import { apiCache } from '@/lib/api-cache';

export const dynamic = 'force-dynamic';

const stakeBodySchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
  stake: z.number().finite(),
});

/**
 * POST /api/space-tycoon/predictions/stake
 * Place a stake on an open prediction question. One stake per question per
 * player (enforced by the @@unique([questionId, profileId]) constraint —
 * this is a single bet you're locked into once placed, not a position you
 * can top up). Debits the stake from the player's server-reconciled balance
 * immediately (escrow model, same as bounty posting); a correct stake pays
 * 2x, credited by the daily resolver via the GameLedgerEntry ledger.
 *
 * Body: { questionId: string, optionId: string, stake: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    // M-7 (docs/SECURITY_AUDIT_2026-09.md, game exploit batch 2026-09-02):
    // per-profile budget on this economic route.
    const throttle = throttleAllow(profile.id, 'predictions', 10, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json(throttledBody('predictions', throttle), { status: 429 });
    }

    const parsed = stakeBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid stake request' }, { status: 400 });
    }
    const { questionId, optionId } = parsed.data;

    const question = await prisma.predictionQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    if (question.outcomeOptionId) {
      return NextResponse.json({ error: 'This question has already resolved' }, { status: 400 });
    }
    if (question.closesAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Stakes are closed for this question' }, { status: 400 });
    }
    const options = (question.options as unknown as PredictionOption[]) || [];
    if (!options.some(o => o.id === optionId)) {
      return NextResponse.json({ error: 'Invalid option for this question' }, { status: 400 });
    }

    const ledgerOn = await isLedgerAvailable();
    const validation = validateStakeAmount(parsed.data.stake, ledgerOn ? profile.money : Number.POSITIVE_INFINITY);
    if (!validation.valid || validation.amount == null) {
      return NextResponse.json({ error: validation.error || 'Invalid stake' }, { status: 400 });
    }
    const stakeAmount = validation.amount;

    const existing = await prisma.predictionStake.findUnique({
      where: { questionId_profileId: { questionId, profileId: profile.id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'You already staked on this question' }, { status: 400 });
    }

    const stake = await prisma.$transaction(async (tx) => {
      const created = await tx.predictionStake.create({
        data: { questionId, profileId: profile.id, optionId, stake: stakeAmount },
      });

      if (ledgerOn) {
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: { money: { decrement: stakeAmount } },
        });
        await recordLedger(tx, {
          profileId: profile.id, moneyDelta: -stakeAmount,
          reason: 'prediction_stake', refId: questionId,
        });
      }

      return created;
    });

    // Bust the shared list cache so the new stake's pool total shows up
    // without waiting out the full 5-minute TTL.
    apiCache.delete('prediction-exchange:list');

    logger.info('Prediction stake placed', { questionId, profileId: profile.id, optionId, stakeAmount, settled: ledgerOn });

    return NextResponse.json({ success: true, stake, escrowed: ledgerOn ? stakeAmount : 0, settled: ledgerOn });
  } catch (error) {
    // Unique-constraint race (two concurrent stakes on the same question)
    // surfaces here as a Prisma P2002 — treat it the same as the friendly
    // pre-check above rather than a 500.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unique constraint') || message.includes('P2002')) {
      return NextResponse.json({ error: 'You already staked on this question' }, { status: 400 });
    }
    logger.error('Prediction stake error', { error: message });
    return NextResponse.json({ error: 'Failed to place stake' }, { status: 500 });
  }
}
