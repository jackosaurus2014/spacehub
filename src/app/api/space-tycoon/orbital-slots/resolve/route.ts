import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { ORBITAL_SLOT_POOLS, occupancyBucket } from '@/lib/game/spatial-strategy';
import {
  computeMinBid,
  resolveAuction,
  splitAuctionProceeds,
  LEASE_TERM_MS,
  AUCTION_WINDOW_MS,
} from '@/lib/game/orbital-slot-auctions';
import { getControllingFactionForLocation, LOCATION_TO_ZONE } from '@/lib/game/zone-influence';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import type { BuildingInstance } from '@/lib/game/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/orbital-slots/resolve
 * Cron job: recompute server-aggregated slot occupancy, auto-open auctions
 * for newly-saturated pools, resolve closed auctions (burn winning bid minus
 * governor cut, mint lease, refund losers), expire spent leases.
 * Should be called every 5-15 minutes by a cron job (mirrors bidding/resolve).
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const ledgerOn = await isLedgerAvailable();

    // ── Step 1: server-aggregated occupancy (closes the computeOrbitalSlotReport
    // TODO — the whole point of this wave). Bounded scan of recently-active
    // profiles, mirroring zones/update/route.ts's 7-day-active precedent. ──
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const poolLocationIds = new Set(ORBITAL_SLOT_POOLS.map(p => p.locationId));
    const occupiedCounts = new Map<string, number>();
    for (const loc of Array.from(poolLocationIds)) occupiedCounts.set(loc, 0);

    const profiles = await prisma.gameProfile.findMany({
      where: { lastSyncAt: { gte: thirtyDaysAgo } },
      select: { buildingsData: true },
      take: 5000,
    });
    for (const p of profiles) {
      const buildings = (p.buildingsData as unknown as BuildingInstance[]) || [];
      for (const b of buildings) {
        if (!b.isComplete) continue;
        if (poolLocationIds.has(b.locationId)) {
          occupiedCounts.set(b.locationId, (occupiedCounts.get(b.locationId) || 0) + 1);
        }
      }
    }

    let autoOpened = 0;
    for (const pool of ORBITAL_SLOT_POOLS) {
      const occupiedCount = occupiedCounts.get(pool.locationId) || 0;
      const bucket = occupancyBucket(occupiedCount, pool.totalSlots);
      await prisma.orbitalSlotOccupancy.upsert({
        where: { locationId: pool.locationId },
        create: { locationId: pool.locationId, occupiedCount, totalSlots: pool.totalSlots, bucket },
        update: { occupiedCount, totalSlots: pool.totalSlots, bucket },
      });

      // Auto-open an auction the moment a pool crosses saturation, if none
      // is already open — makes the gate self-enforcing rather than relying
      // on a player noticing and clicking "open" first.
      if (bucket === 'saturated') {
        const existing = await prisma.orbitalSlotAuction.findFirst({ where: { locationId: pool.locationId, status: 'open' } });
        if (!existing) {
          const minBid = computeMinBid(pool.locationId);
          await prisma.orbitalSlotAuction.create({
            data: {
              locationId: pool.locationId,
              minBid,
              chokepointPremium: Math.round((minBid / (pool.locationId === 'lunar_orbit' ? 60_000_000 : pool.locationId === 'geo' ? 25_000_000 : pool.locationId === 'mars_orbit' ? 15_000_000 : 20_000_000)) * 100) / 100,
              closesAt: new Date(now.getTime() + AUCTION_WINDOW_MS),
              status: 'open',
            },
          });
          autoOpened++;
        }
      }
    }

    // ── Step 2: resolve closed auctions ──────────────────────────────
    const closingAuctions = await prisma.orbitalSlotAuction.findMany({
      where: { status: 'open', closesAt: { lte: now } },
      include: { bids: true },
    });

    let resolved = 0;
    for (const auction of closingAuctions) {
      try {
        const result = resolveAuction(
          auction.bids.map(b => ({ bidId: b.id, profileId: b.profileId, amount: b.amount, createdAt: b.createdAt.getTime() })),
          auction.minBid,
        );

        const zoneSlug = LOCATION_TO_ZONE.get(auction.locationId);
        const controllingFaction = getControllingFactionForLocation(auction.locationId);
        // Governor lookup: best-effort — a zone might not exist in the Zone
        // table yet (seed-zones.ts not run), or have no governor.
        let governorId: string | null = null;
        if (zoneSlug) {
          const zone = await prisma.zone.findUnique({ where: { slug: zoneSlug }, select: { governorId: true } });
          governorId = zone?.governorId ?? null;
        }

        await prisma.$transaction(async (tx) => {
          await tx.orbitalSlotAuction.update({
            where: { id: auction.id },
            data: {
              status: 'resolved',
              resolvedAt: now,
              winnerId: result.winnerProfileId,
              winningBid: result.winnerProfileId ? result.winningAmount : null,
            },
          });

          // Refund every losing bid (and the winner's bid amount stays
          // escrowed — it gets split governor-cut/burned below, never
          // returned to the winner).
          for (const bid of auction.bids) {
            if (bid.id === result.winnerBidId) continue;
            if (ledgerOn) {
              await tx.gameProfile.update({ where: { id: bid.profileId }, data: { money: { increment: bid.amount } } });
              await recordLedger(tx, { profileId: bid.profileId, moneyDelta: bid.amount, reason: 'slot_auction_bid_refund', refId: auction.id });
            }
          }

          if (result.winnerProfileId) {
            // The winning bid was already escrowed (debited) when the bid
            // was placed. The `burned` portion of splitAuctionProceeds
            // simply stays gone (no credit to anyone — BALANCE.md money
            // sink); only `governorCut` moves anywhere.
            const { governorCut } = splitAuctionProceeds(result.winningAmount, !!governorId);
            if (ledgerOn && governorId && governorCut > 0) {
              await tx.gameProfile.update({ where: { id: governorId }, data: { money: { increment: governorCut } } });
              await recordLedger(tx, { profileId: governorId, moneyDelta: governorCut, reason: 'slot_auction_burn', refId: auction.id });
            }

            await tx.orbitalSlotLease.create({
              data: {
                locationId: auction.locationId,
                holderId: result.winnerProfileId,
                leaseAmount: result.winningAmount,
                status: 'active',
                startedAt: now,
                expiresAt: new Date(now.getTime() + LEASE_TERM_MS),
              },
            });

            await tx.playerActivity.create({
              data: {
                profileId: result.winnerProfileId,
                companyName: '',
                type: 'orbital_slot_lease_won',
                title: `Won an orbital-slot lease auction`,
                description: `$${result.winningAmount.toLocaleString()} — ${auction.locationId}${controllingFaction ? ` (${controllingFaction} space)` : ''}`,
                metadata: { auctionId: auction.id, locationId: auction.locationId, winningBid: result.winningAmount },
              },
            }).catch(() => { /* non-critical */ });
          }
        });

        resolved++;
      } catch (auctionError) {
        logger.error('Failed to resolve orbital slot auction', { auctionId: auction.id, error: String(auctionError) });
      }
    }

    // ── Step 3: expire spent leases (the slot returns to the open pool —
    // does NOT retroactively remove any building already constructed there,
    // consistent with the game's no-PvP-destruction invariant). ──────────
    const expiredLeases = await prisma.orbitalSlotLease.updateMany({
      where: { status: 'active', expiresAt: { lte: now } },
      data: { status: 'expired' },
    });

    logger.info('Orbital slot resolution cycle complete', {
      autoOpened, resolved, expiredLeases: expiredLeases.count,
    });

    return NextResponse.json({
      success: true,
      autoOpened,
      resolved,
      expiredLeases: expiredLeases.count,
    });
  } catch (error) {
    logger.error('Orbital slot resolution error', { error: String(error) });
    return NextResponse.json({ error: 'Resolution cycle failed' }, { status: 500 });
  }
}
