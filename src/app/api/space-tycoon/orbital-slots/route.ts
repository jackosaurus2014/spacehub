import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { ORBITAL_SLOT_POOLS, SATURATED_OCCUPANCY_PCT } from '@/lib/game/spatial-strategy';
import { computeMinBid, isSlotPoolLocation, AUCTION_WINDOW_MS } from '@/lib/game/orbital-slot-auctions';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';

export const dynamic = 'force-dynamic';

/**
 * Orbital-slot lease auctions (Wave E7, docs/ECONOMY_PVP_2026-08.md §E7 /
 * §5 item 5): finite ORBITAL_SLOT_POOLS (GEO/lunar-polar/Mars/Jupiter),
 * server-aggregated occupancy (OrbitalSlotOccupancy cache, populated by
 * orbital-slots/resolve's cron), sealed-bid auctions once a pool crosses
 * SATURATED_OCCUPANCY_PCT. Escrow/refund/burn follow the exact
 * ResourceBounty pattern (bounties/route.ts) — ledgered via server-ledger.ts.
 *
 * GET  — pool status (occupancy, saturation, open auctions, my bids/leases).
 * POST — { action: 'bid', auctionId, amount } place/revise a sealed bid.
 *        { action: 'open', locationId } manually request an auction once
 *          saturated (the resolve cron also auto-opens these).
 *        { action: 'transfer', leaseId, toCompanyName, price } P2P sale of
 *          an existing lease at a mutually agreed price ("ownership
 *          transfers at market-clearing prices" — canon).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const [occupancyRows, openAuctions, myLeases] = await Promise.all([
      prisma.orbitalSlotOccupancy.findMany(),
      prisma.orbitalSlotAuction.findMany({
        where: { status: 'open' },
        include: {
          bids: { where: { profileId: profile.id }, select: { id: true, amount: true, createdAt: true } },
          _count: { select: { bids: true } },
        },
        orderBy: { closesAt: 'asc' },
      }),
      prisma.orbitalSlotLease.findMany({
        where: { holderId: profile.id, status: 'active' },
        orderBy: { expiresAt: 'asc' },
      }),
    ]);

    const occupancyByLocation = new Map(occupancyRows.map(r => [r.locationId, r]));

    const pools = ORBITAL_SLOT_POOLS.map(pool => {
      const occ = occupancyByLocation.get(pool.locationId);
      const occupiedCount = occ?.occupiedCount ?? 0;
      const occupancyPct = pool.totalSlots > 0 ? Math.round((occupiedCount / pool.totalSlots) * 1000) / 10 : 0;
      return {
        locationId: pool.locationId,
        label: pool.label,
        totalSlots: pool.totalSlots,
        occupiedCount,
        occupancyPct,
        bucket: occ?.bucket ?? 'low',
        saturated: occupancyPct >= SATURATED_OCCUPANCY_PCT,
        minBid: computeMinBid(pool.locationId),
      };
    });

    return NextResponse.json({
      pools,
      openAuctions: openAuctions.map(a => ({
        id: a.id,
        locationId: a.locationId,
        minBid: a.minBid,
        chokepointPremium: a.chokepointPremium,
        closesAt: a.closesAt.toISOString(),
        bidCount: a._count.bids,
        myBid: a.bids[0] ? { amount: a.bids[0].amount, createdAt: a.bids[0].createdAt.toISOString() } : null,
      })),
      myLeases: myLeases.map(l => ({
        id: l.id,
        locationId: l.locationId,
        leaseAmount: l.leaseAmount,
        startedAt: l.startedAt.toISOString(),
        expiresAt: l.expiresAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Orbital slots fetch error', { error: String(error) });
    return NextResponse.json({ pools: [], openAuctions: [], myLeases: [] });
  }
}

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

    const body = await request.json();
    const ledgerOn = await isLedgerAvailable();

    if (body.action === 'open') {
      const { locationId } = body;
      if (!locationId || !isSlotPoolLocation(locationId)) {
        return NextResponse.json({ error: 'Unknown orbital slot pool' }, { status: 400 });
      }
      const occ = await prisma.orbitalSlotOccupancy.findUnique({ where: { locationId } });
      if (!occ || occ.bucket !== 'saturated') {
        return NextResponse.json({ error: 'This pool is not yet saturated — no lease auction required' }, { status: 400 });
      }
      const existing = await prisma.orbitalSlotAuction.findFirst({ where: { locationId, status: 'open' } });
      if (existing) {
        return NextResponse.json({ success: true, auctionId: existing.id, alreadyOpen: true });
      }
      const minBid = computeMinBid(locationId);
      const auction = await prisma.orbitalSlotAuction.create({
        data: {
          locationId,
          minBid,
          chokepointPremium: Math.round((minBid / (locationId === 'lunar_orbit' ? 60_000_000 : locationId === 'geo' ? 25_000_000 : locationId === 'mars_orbit' ? 15_000_000 : 20_000_000)) * 100) / 100,
          closesAt: new Date(Date.now() + AUCTION_WINDOW_MS),
          status: 'open',
        },
      });
      return NextResponse.json({ success: true, auctionId: auction.id });
    }

    if (body.action === 'bid') {
      const { auctionId, amount } = body;
      if (!auctionId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid bid parameters' }, { status: 400 });
      }
      const auction = await prisma.orbitalSlotAuction.findUnique({ where: { id: auctionId } });
      if (!auction || auction.status !== 'open' || auction.closesAt < new Date()) {
        return NextResponse.json({ error: 'Auction is not open for bidding' }, { status: 400 });
      }
      const bidAmount = Math.round(amount);
      if (bidAmount < auction.minBid) {
        return NextResponse.json({ error: `Bid must be at least $${auction.minBid.toLocaleString()}` }, { status: 400 });
      }

      const existingBid = await prisma.orbitalSlotBid.findUnique({
        where: { auctionId_profileId: { auctionId, profileId: profile.id } },
      });
      const delta = bidAmount - (existingBid?.amount ?? 0);

      if (ledgerOn && delta > 0 && profile.money < delta) {
        return NextResponse.json({ error: 'Insufficient funds to escrow this bid' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        if (existingBid) {
          await tx.orbitalSlotBid.update({ where: { id: existingBid.id }, data: { amount: bidAmount } });
        } else {
          await tx.orbitalSlotBid.create({ data: { auctionId, profileId: profile.id, amount: bidAmount } });
        }
        if (ledgerOn && delta !== 0) {
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: delta } } });
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: -delta,
            reason: delta > 0 ? 'slot_auction_bid_escrow' : 'slot_auction_bid_refund',
            refId: auctionId,
          });
        }
      });

      return NextResponse.json({ success: true, escrowed: ledgerOn ? bidAmount : 0 });
    }

    if (body.action === 'transfer') {
      const { leaseId, toCompanyName, price } = body;
      if (!leaseId || !toCompanyName || !price || price <= 0) {
        return NextResponse.json({ error: 'Invalid transfer parameters' }, { status: 400 });
      }
      const lease = await prisma.orbitalSlotLease.findUnique({ where: { id: leaseId } });
      if (!lease || lease.status !== 'active' || lease.holderId !== profile.id) {
        return NextResponse.json({ error: 'You do not hold this lease' }, { status: 400 });
      }
      const buyer = await prisma.gameProfile.findFirst({ where: { companyName: toCompanyName } });
      if (!buyer || buyer.id === profile.id) {
        return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
      }
      const transferAmount = Math.round(price);
      if (ledgerOn && buyer.money < transferAmount) {
        return NextResponse.json({ error: 'Buyer has insufficient funds' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.orbitalSlotLease.update({
          where: { id: leaseId },
          data: { holderId: buyer.id, leaseAmount: transferAmount, transferredFromId: profile.id },
        });
        if (ledgerOn) {
          await tx.gameProfile.update({ where: { id: buyer.id }, data: { money: { decrement: transferAmount } } });
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { increment: transferAmount } } });
          await recordLedger(tx, { profileId: buyer.id, moneyDelta: -transferAmount, reason: 'slot_lease_transfer_payment', refId: leaseId });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: transferAmount, reason: 'slot_lease_transfer_receipt', refId: leaseId });
        }
      });

      logger.info('Orbital slot lease transferred', { leaseId, from: profile.id, to: buyer.id, transferAmount });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Orbital slots action error', { error: String(error) });
    return NextResponse.json({ error: 'Orbital slot action failed' }, { status: 500 });
  }
}
