import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import { validatePriceBand } from '@/lib/game/price-band';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';

/**
 * Resource bounty board.
 *
 * One Wallet fix (audit hotlist #4): bounty money now actually moves.
 *   - Posting a bounty ESCROWS the full budget from the poster (money debit
 *     + ledger entry, atomically).
 *   - Filling a bounty debits the filler's server-held resources, credits
 *     the filler the payout, and credits the resources to the poster — all
 *     ledgered, all settled into clients via sync reconciliation.
 *   - Expired unfilled bounties lazily refund the un-spent escrow.
 *
 * Legacy guard: bounties created BEFORE escrow existed have no
 * 'bounty_escrow' ledger entry. Those are never refunded and never pay out
 * server-side (paying them would mint money that was never escrowed) — they
 * keep the old display-only behavior until they expire.
 */

async function hasEscrow(bountyId: string): Promise<boolean> {
  const entry = await prisma.gameLedgerEntry.findFirst({
    where: { reason: 'bounty_escrow', refId: bountyId },
    select: { id: true },
  });
  return !!entry;
}

/** Lazily expire + refund overdue bounties (best-effort, never throws). */
async function sweepExpiredBounties(): Promise<void> {
  if (!(await isLedgerAvailable())) return;
  try {
    const overdue = await prisma.resourceBounty.findMany({
      where: { status: { in: ['open', 'partial'] }, expiresAt: { lt: new Date() } },
      take: 20,
    });
    for (const bounty of overdue) {
      const escrowed = await hasEscrow(bounty.id);
      const remainingBudget = Math.max(
        0,
        Math.round(bounty.totalBudget - bounty.filledQty * bounty.pricePerUnit),
      );
      await prisma.$transaction(async (tx) => {
        // Guard against concurrent sweeps: only transition once.
        const updated = await tx.resourceBounty.updateMany({
          where: { id: bounty.id, status: { in: ['open', 'partial'] } },
          data: { status: 'expired' },
        });
        if (updated.count === 0) return;
        if (escrowed && remainingBudget > 0) {
          await tx.gameProfile.update({
            where: { id: bounty.posterId },
            data: { money: { increment: remainingBudget } },
          });
          await recordLedger(tx, {
            profileId: bounty.posterId, moneyDelta: remainingBudget,
            reason: 'bounty_escrow_refund', refId: bounty.id,
          });
        }
      });
    }
  } catch (error) {
    logger.error('Bounty expiry sweep failed', { error: String(error) });
  }
}

/**
 * GET /api/space-tycoon/bounties
 * Returns open resource bounties that other players can fill.
 */
export async function GET() {
  try {
    await sweepExpiredBounties();

    const bounties = await prisma.resourceBounty.findMany({
      where: {
        status: { in: ['open', 'partial'] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        resourceSlug: true,
        quantity: true,
        filledQty: true,
        pricePerUnit: true,
        totalBudget: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        poster: { select: { companyName: true } },
      },
    });

    return NextResponse.json({ bounties });
  } catch (error) {
    return NextResponse.json({ bounties: [] });
  }
}

/**
 * POST /api/space-tycoon/bounties
 * Create a new resource bounty or fill an existing one.
 *
 * Create: { action: "create", resourceSlug, quantity, pricePerUnit }
 * Fill:   { action: "fill", bountyId, quantity }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    await sweepExpiredBounties();

    const body = await request.json();
    const ledgerOn = await isLedgerAvailable();

    if (body.action === 'create') {
      const { resourceSlug, quantity, pricePerUnit } = body;
      if (!resourceSlug || !quantity || !pricePerUnit || quantity <= 0 || pricePerUnit <= 0) {
        return NextResponse.json({ error: 'Invalid bounty parameters' }, { status: 400 });
      }

      const resourceDef = RESOURCE_MAP.get(resourceSlug as ResourceId);
      if (!resourceDef) {
        return NextResponse.json({ error: `Unknown resource "${resourceSlug}"` }, { status: 400 });
      }

      // Same price band the order book enforces — a bounty at a fantasy
      // price would otherwise be a player-to-player money funnel.
      const band = validatePriceBand(
        pricePerUnit,
        resourceDef.baseMarketPrice,
        resourceDef.minPrice,
        resourceDef.maxPrice,
      );
      if (!band.valid) {
        return NextResponse.json({
          error: `Price per unit must be between ${band.min.toLocaleString()} and ${band.max.toLocaleString()}`,
        }, { status: 400 });
      }

      const qty = Math.round(quantity);
      const totalBudget = Math.round(qty * pricePerUnit);

      // Escrow check against the server-reconciled balance
      if (ledgerOn && profile.money < totalBudget) {
        return NextResponse.json({
          error: `Insufficient funds to escrow this bounty ($${totalBudget.toLocaleString()} required)`,
        }, { status: 400 });
      }

      const bounty = await prisma.$transaction(async (tx) => {
        const created = await tx.resourceBounty.create({
          data: {
            posterId: profile.id,
            resourceSlug,
            quantity: qty,
            pricePerUnit,
            totalBudget,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
          },
        });

        // Escrow the budget from the poster (audit hotlist #4)
        if (ledgerOn) {
          await tx.gameProfile.update({
            where: { id: profile.id },
            data: { money: { decrement: totalBudget } },
          });
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: -totalBudget,
            reason: 'bounty_escrow', refId: created.id,
          });
        }

        return created;
      });

      // Log activity
      await prisma.playerActivity.create({
        data: {
          profileId: profile.id,
          companyName: profile.companyName,
          type: 'bounty_posted',
          title: `${profile.companyName} posted a bounty for ${qty} ${String(resourceSlug).replace(/_/g, ' ')}`,
          metadata: { resourceSlug, quantity: qty, pricePerUnit, totalBudget },
        },
      }).catch(() => { /* non-critical */ });

      return NextResponse.json({ success: true, bounty, escrowed: ledgerOn ? totalBudget : 0 });
    }

    if (body.action === 'fill') {
      const { bountyId, quantity } = body;
      if (!bountyId || (quantity != null && quantity <= 0)) {
        return NextResponse.json({ error: 'Invalid fill parameters' }, { status: 400 });
      }

      const bounty = await prisma.resourceBounty.findUnique({ where: { id: bountyId } });
      if (!bounty || !['open', 'partial'].includes(bounty.status) || bounty.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Bounty not available' }, { status: 400 });
      }
      if (bounty.posterId === profile.id) {
        return NextResponse.json({ error: 'Cannot fill your own bounty' }, { status: 400 });
      }

      const remaining = bounty.quantity - bounty.filledQty;
      // Quantity omitted (BountyPanel's flow) = fill as much as possible.
      const fillQty = Math.min(quantity != null ? Math.round(quantity) : remaining, remaining);
      if (fillQty <= 0) {
        return NextResponse.json({ error: 'Bounty already filled' }, { status: 400 });
      }

      // Only escrowed bounties transfer real money/resources (legacy guard)
      const escrowed = ledgerOn && (await hasEscrow(bounty.id));

      // The filler must actually hold the resources server-side
      const fillerResources = (profile.resources as Record<string, number>) || {};
      const held = fillerResources[bounty.resourceSlug] || 0;
      if (escrowed && held < fillQty) {
        return NextResponse.json({
          error: `Insufficient ${bounty.resourceSlug.replace(/_/g, ' ')}: you have ${held}, need ${fillQty}`,
        }, { status: 400 });
      }

      const payout = Math.round(fillQty * bounty.pricePerUnit);
      const newFilledQty = bounty.filledQty + fillQty;
      const newStatus = newFilledQty >= bounty.quantity ? 'filled' : 'partial';

      await prisma.$transaction(async (tx) => {
        // Guard against double-fill races
        const updated = await tx.resourceBounty.updateMany({
          where: { id: bountyId, filledQty: bounty.filledQty, status: { in: ['open', 'partial'] } },
          data: {
            filledQty: newFilledQty,
            status: newStatus,
            fillerId: profile.id,
            filledAt: newStatus === 'filled' ? new Date() : undefined,
          },
        });
        if (updated.count === 0) {
          throw new Error('Bounty was modified concurrently — try again');
        }

        if (escrowed) {
          // Debit resources from the filler
          const nextFillerResources = { ...fillerResources };
          nextFillerResources[bounty.resourceSlug] = Math.max(0, held - fillQty);
          await tx.gameProfile.update({
            where: { id: profile.id },
            data: {
              resources: nextFillerResources,
              money: { increment: payout },
            },
          });
          await recordLedger(tx, {
            profileId: profile.id, resourceSlug: bounty.resourceSlug, resourceDelta: -fillQty,
            reason: 'bounty_resources_delivered', refId: bounty.id,
          });
          // Pay the filler from the poster's escrow (audit hotlist #4 — this
          // payout previously existed only in the response JSON)
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: payout,
            reason: 'bounty_payout', refId: bounty.id,
          });

          // Credit the delivered resources to the poster
          const posterProfile = await tx.gameProfile.findUnique({ where: { id: bounty.posterId } });
          if (posterProfile) {
            const posterResources = (posterProfile.resources as Record<string, number>) || {};
            posterResources[bounty.resourceSlug] = (posterResources[bounty.resourceSlug] || 0) + fillQty;
            await tx.gameProfile.update({
              where: { id: bounty.posterId },
              data: { resources: posterResources },
            });
            await recordLedger(tx, {
              profileId: bounty.posterId, resourceSlug: bounty.resourceSlug, resourceDelta: fillQty,
              reason: 'bounty_resources_received', refId: bounty.id,
            });
          }
        }
      });

      logger.info('Bounty filled', {
        bountyId, fillQty, payout, escrowed,
        filler: profile.companyName,
        poster: bounty.posterId,
      });

      return NextResponse.json({
        success: true,
        filled: fillQty,
        payout: escrowed ? payout : 0,
        remainingQty: remaining - fillQty,
        status: newStatus,
        settled: escrowed,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Bounty error', { error: String(error) });
    return NextResponse.json({ error: 'Bounty operation failed' }, { status: 500 });
  }
}
