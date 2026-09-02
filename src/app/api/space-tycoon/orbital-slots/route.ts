import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { ORBITAL_SLOT_POOLS } from '@/lib/game/spatial-strategy';
import {
  computeMinBid, computeSlotAuctionEligibility, isSlotPoolLocation, AUCTION_WINDOW_MS, applySoftClose,
} from '@/lib/game/orbital-slot-auctions';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import {
  putListing, getListing, removeListing, listOpenListings, listingPriceBand,
} from '@/lib/game/slot-transfer-listings';

export const dynamic = 'force-dynamic';

/**
 * Orbital-slot lease auctions (Wave E7, docs/ECONOMY_PVP_2026-08.md §E7 /
 * §5 item 5): finite ORBITAL_SLOT_POOLS (GEO/lunar-polar/Mars/Jupiter),
 * server-aggregated occupancy (OrbitalSlotOccupancy cache, populated by
 * orbital-slots/resolve's cron), sealed-bid auctions once a pool is
 * CONTESTED — absolute SATURATED_OCCUPANCY_PCT or the D6 relative rule
 * (computeSlotAuctionEligibility; docs/BALANCE.md "D6 population gates").
 * Escrow/refund/burn follow the exact ResourceBounty pattern
 * (bounties/route.ts) — ledgered via server-ledger.ts.
 *
 * GET  — pool status (occupancy, contested flag, the D6 auction-eligibility
 *        line {occupied, threshold, eligible}, open auctions, my bids/leases).
 * POST — { action: 'bid', auctionId, amount } place/revise a sealed bid.
 *        { action: 'open', locationId } manually request an auction once
 *          contested (the resolve cron also auto-opens these).
 *        { action: 'list', leaseId, askingPrice, toProfileId? } the HOLDER
 *          posts a lease for sale (asking price banded around the lease's
 *          reference price; optional pinned buyer).
 *        { action: 'unlist', leaseId } the holder withdraws the listing.
 *        { action: 'accept', leaseId } the BUYER's own session pays the
 *          asking price; debit/credit ledgered in one transaction.
 *
 * Game exploit batch 2026-09-02 (C-3): the old `transfer` action let the
 * seller name a buyer by (non-unique) companyName and a price, and debited
 * that buyer on the spot — and its "Buyer has insufficient funds" 400 was a
 * balance oracle. Counterparties are now resolved by profileId only, the
 * buyer consents by calling `accept` from their own session, and no
 * response ever reveals whether a third party can afford anything
 * (generic 400 "Transfer not available"). Listings live in
 * slot-transfer-listings.ts (in-memory; see its header for the schema
 * column a durable version needs).
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

    const listings = listOpenListings(profile.id);
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

    // D6: the same relative-eligibility pass the resolve cron runs, so the
    // panel can say "auction opens at N leases" from the same rule that
    // will actually open it.
    const eligibility = computeSlotAuctionEligibility(
      ORBITAL_SLOT_POOLS.map(p => ({
        locationId: p.locationId,
        occupiedCount: occupancyByLocation.get(p.locationId)?.occupiedCount ?? 0,
        totalSlots: p.totalSlots,
      })),
    );

    const pools = ORBITAL_SLOT_POOLS.map(pool => {
      const occ = occupancyByLocation.get(pool.locationId);
      const occupiedCount = occ?.occupiedCount ?? 0;
      const occupancyPct = pool.totalSlots > 0 ? Math.round((occupiedCount / pool.totalSlots) * 1000) / 10 : 0;
      const bucket = occ?.bucket ?? 'low';
      const elig = eligibility.get(pool.locationId);
      return {
        locationId: pool.locationId,
        label: pool.label,
        totalSlots: pool.totalSlots,
        occupiedCount,
        occupancyPct,
        bucket,
        // The stored bucket is what the build gate enforces; it lags the
        // live eligibility by at most one resolve-cron cycle.
        saturated: bucket === 'saturated',
        minBid: computeMinBid(pool.locationId),
        auctionEligibility: elig
          ? {
              occupied: elig.occupiedCount,
              threshold: Number.isFinite(elig.thresholdOccupied) ? elig.thresholdOccupied : pool.totalSlots,
              thresholdPct: elig.thresholdPct,
              eligible: elig.eligible,
              reason: elig.reason,
            }
          : null,
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
        listing: (() => {
          const lst = getListing(l.id);
          return lst ? { askingPrice: lst.askingPrice, toProfileId: lst.toProfileId, expiresAt: new Date(lst.expiresAtMs).toISOString() } : null;
        })(),
      })),
      // C-3: leases other holders have listed that this profile may accept.
      transferListings: listings
        .filter(l => l.sellerProfileId !== profile.id)
        .map(l => ({
          leaseId: l.leaseId,
          locationId: l.locationId,
          askingPrice: l.askingPrice,
          pinnedToMe: l.toProfileId === profile.id,
          expiresAt: new Date(l.expiresAtMs).toISOString(),
        })),
    });
  } catch (error) {
    logger.error('Orbital slots fetch error', { error: String(error) });
    return NextResponse.json({ pools: [], openAuctions: [], myLeases: [], transferListings: [] });
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    // M-7 (docs/SECURITY_AUDIT_2026-09.md, game exploit batch 2026-09-02):
    // per-profile budget on this economic route.
    const throttle = throttleAllow(profile.id, 'orbital-slots', 10, 60_000);
    if (!throttle.allowed) {
      return NextResponse.json(throttledBody('orbital-slots', throttle), { status: 429 });
    }

    const ledgerOn = await isLedgerAvailable();

    if (body.action === 'open') {
      const { locationId } = body;
      if (!locationId || !isSlotPoolLocation(locationId)) {
        return NextResponse.json({ error: 'Unknown orbital slot pool' }, { status: 400 });
      }
      const occ = await prisma.orbitalSlotOccupancy.findUnique({ where: { locationId } });
      if (!occ || occ.bucket !== 'saturated') {
        return NextResponse.json({ error: 'This pool is not yet contested — no lease auction required' }, { status: 400 });
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

      // Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O7): soft-close — a bid
      // inside the final 10 minutes extends the close by 10 minutes (capped
      // at +1h past the original window), so last-second sniping gives
      // rivals a response window instead of being a timing gimmick.
      const nowMs = Date.now();
      const extendedCloseMs = applySoftClose(auction.closesAt.getTime(), auction.createdAt.getTime(), nowMs);
      const softClosed = extendedCloseMs !== auction.closesAt.getTime();

      await prisma.$transaction(async (tx) => {
        if (existingBid) {
          await tx.orbitalSlotBid.update({ where: { id: existingBid.id }, data: { amount: bidAmount } });
        } else {
          await tx.orbitalSlotBid.create({ data: { auctionId, profileId: profile.id, amount: bidAmount } });
        }
        if (softClosed) {
          await tx.orbitalSlotAuction.update({
            where: { id: auctionId },
            data: { closesAt: new Date(extendedCloseMs) },
          });
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

      return NextResponse.json({
        success: true,
        escrowed: ledgerOn ? bidAmount : 0,
        softClosed,
        closesAt: new Date(extendedCloseMs).toISOString(),
      });
    }

    if (body.action === 'transfer') {
      // C-3: the one-shot seller-initiated debit is gone for good.
      return NextResponse.json(
        { error: 'Direct transfers are disabled. List the lease (action "list") and let the buyer accept it from their own session.' },
        { status: 410 },
      );
    }

    if (body.action === 'list') {
      const { leaseId, askingPrice, toProfileId } = body;
      if (typeof leaseId !== 'string' || !leaseId || typeof askingPrice !== 'number' || !Number.isFinite(askingPrice) || askingPrice <= 0) {
        return NextResponse.json({ error: 'Invalid listing parameters' }, { status: 400 });
      }
      const lease = await prisma.orbitalSlotLease.findUnique({ where: { id: leaseId } });
      if (!lease || lease.status !== 'active' || lease.holderId !== profile.id || lease.expiresAt <= new Date()) {
        return NextResponse.json({ error: 'You do not hold this lease' }, { status: 400 });
      }
      const band = listingPriceBand(lease.locationId, lease.leaseAmount);
      const price = Math.round(askingPrice);
      if (price < band.min || price > band.max) {
        return NextResponse.json(
          { error: `Asking price must be between $${band.min.toLocaleString()} and $${band.max.toLocaleString()}`, min: band.min, max: band.max },
          { status: 400 },
        );
      }
      // Counterparties by profileId only. A pinned buyer must exist and not
      // be the seller; nothing about their balance is ever read here.
      let pinned: string | null = null;
      if (toProfileId !== undefined && toProfileId !== null) {
        if (typeof toProfileId !== 'string' || !toProfileId || toProfileId === profile.id) {
          return NextResponse.json({ error: 'Invalid buyer' }, { status: 400 });
        }
        const exists = await prisma.gameProfile.findUnique({ where: { id: toProfileId }, select: { id: true } });
        if (!exists) {
          return NextResponse.json({ error: 'Invalid buyer' }, { status: 400 });
        }
        pinned = exists.id;
      }
      const listing = putListing({ leaseId, sellerProfileId: profile.id, locationId: lease.locationId, askingPrice: price, toProfileId: pinned });
      logger.info('Orbital slot lease listed', { leaseId, seller: profile.id, askingPrice: price, pinned: !!pinned });
      return NextResponse.json({
        success: true,
        listing: { leaseId, askingPrice: listing.askingPrice, toProfileId: listing.toProfileId, expiresAt: new Date(listing.expiresAtMs).toISOString() },
      });
    }

    if (body.action === 'unlist') {
      const { leaseId } = body;
      if (typeof leaseId !== 'string' || !leaseId) {
        return NextResponse.json({ error: 'Invalid listing parameters' }, { status: 400 });
      }
      const listing = getListing(leaseId);
      if (!listing || listing.sellerProfileId !== profile.id) {
        return NextResponse.json({ error: 'No such listing' }, { status: 400 });
      }
      removeListing(leaseId);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'accept') {
      const { leaseId } = body;
      if (typeof leaseId !== 'string' || !leaseId) {
        return NextResponse.json({ error: 'Invalid transfer parameters' }, { status: 400 });
      }
      const unavailable = () => NextResponse.json({ error: 'Transfer not available' }, { status: 400 });
      const listing = getListing(leaseId);
      if (!listing) return unavailable();
      if (listing.sellerProfileId === profile.id) return unavailable();
      if (listing.toProfileId && listing.toProfileId !== profile.id) return unavailable();
      const lease = await prisma.orbitalSlotLease.findUnique({ where: { id: leaseId } });
      if (!lease || lease.status !== 'active' || lease.holderId !== listing.sellerProfileId || lease.expiresAt <= new Date()) {
        removeListing(leaseId);
        return unavailable();
      }
      const transferAmount = listing.askingPrice;
      // The BUYER is the session: telling them about their OWN balance is fine.
      if (ledgerOn && profile.money < transferAmount) {
        return NextResponse.json({ error: 'Insufficient funds to accept this listing' }, { status: 400 });
      }

      const sellerId = listing.sellerProfileId;
      const moved = await prisma.$transaction(async (tx) => {
        // Atomic against a concurrent accept / expiry: the lease must still
        // be the seller's and active at write time.
        const updated = await tx.orbitalSlotLease.updateMany({
          where: { id: leaseId, holderId: sellerId, status: 'active' },
          data: { holderId: profile.id, leaseAmount: transferAmount, transferredFromId: sellerId },
        });
        if (updated.count !== 1) return false;
        if (ledgerOn) {
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: transferAmount }, totalSpent: { increment: transferAmount } } });
          await tx.gameProfile.update({ where: { id: sellerId }, data: { money: { increment: transferAmount }, totalEarned: { increment: transferAmount } } });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: -transferAmount, reason: 'slot_lease_transfer_payment', refId: leaseId });
          await recordLedger(tx, { profileId: sellerId, moneyDelta: transferAmount, reason: 'slot_lease_transfer_receipt', refId: leaseId });
        }
        return true;
      });
      removeListing(leaseId);
      if (!moved) return unavailable();

      logger.info('Orbital slot lease transferred', { leaseId, from: sellerId, to: profile.id, transferAmount });
      return NextResponse.json({ success: true, leaseId, paid: ledgerOn ? transferAmount : 0 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Orbital slots action error', { error: String(error) });
    return NextResponse.json({ error: 'Orbital slot action failed' }, { status: 500 });
  }
}
