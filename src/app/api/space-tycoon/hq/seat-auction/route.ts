import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notQaProfile } from '@/lib/qa-accounts';
import { tierFromProfileScalars } from '@/lib/game/corporation-tiers';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  ASSET_KIND_BUILDING, ASSET_KIND_RESEARCH, ASSET_KIND_SHIP, LIVE_SHIP_STATUSES,
  ensureAssetAdoption, ensureAssetAdoption2, loadServerRegistry, rowsOfKind,
} from '@/lib/game/server-assets';
import { InsufficientFundsError, badRequest, debitMoney, loadAssetProfile } from '@/lib/game/asset-route-shared';
import { getHqStage, hqSeatIsAuctioned, isHqStageId, type HqStageId } from '@/lib/game/headquarters';
import { evaluateHqRequirementsFrom, type HqRequirementView } from '@/lib/game/hq-relocation';
import {
  HQ_SEAT_AUCTION_OPEN, HQ_SEAT_BID_OPEN, hqAuctionSoftClose, hqMinimumBid, isAdmissibleHqBid,
} from '@/lib/game/hq-seat-auctions';
import {
  HqAuctionError, loadHqAuctionSummaries, openHqSeatAuction, resolveDueHqSeatAuctions,
} from '@/lib/game/hq-relocation-server';

export const dynamic = 'force-dynamic';

/**
 * /api/space-tycoon/hq/seat-auction — CC-3 sealed-bid auctions for the
 * scarce headquarters seats (Mars, Jovian, Saturnian, deep space,
 * interstellar). docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2, "seats are
 * scarce … ownership transfers at market-clearing prices".
 *
 * GET  — every open auction, with the minimum qualifying bid and this
 *        corporation's own standing bid. Bids are SEALED: no rival's amount
 *        is ever returned, only the floor a new bid must clear.
 * POST { action: 'open', stage, amount } — open an auction on the lowest
 *        vacant seat at `stage` AND post the opening bid in the same
 *        transaction (an auction with no bidder would be a timer, not a
 *        market). The bidder must already satisfy the stage's tier /
 *        station / research / hull requirements.
 * POST { action: 'bid', auctionId, amount } — place or revise a sealed bid.
 *        Escrowed immediately ('hq_seat_bid_escrow'), refunded in full if
 *        the bid loses. A bid inside the last ten minutes extends the close
 *        (hq-seat-auctions.ts hqAuctionSoftClose) so sniping has counterplay.
 *
 * Resolution is the assets-complete cron (resolveDueHqSeatAuctions); this
 * route settles anything already due first so a GET never shows a closed
 * auction as live.
 */

type AssetProfile = NonNullable<Awaited<ReturnType<typeof loadAssetProfile>>['profile']>;

async function buildRequirementView(profile: AssetProfile): Promise<HqRequirementView | null> {
  try {
    await ensureAssetAdoption(profile, prisma);
    await ensureAssetAdoption2(profile, prisma);
    const registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    return {
      tier: tierFromProfileScalars({
        totalEarned: profile.totalEarned, buildingCount: profile.buildingCount, researchCount: profile.researchCount,
        locationsUnlocked: profile.locationsUnlocked, serviceCount: profile.serviceCount,
      }),
      buildings: rowsOfKind(registry.rows, ASSET_KIND_BUILDING).map(r => ({ definitionId: r.definitionId, locationId: r.locationId || '', isComplete: r.status === 'complete' })),
      research: rowsOfKind(registry.rows, ASSET_KIND_RESEARCH).filter(r => r.status === 'complete').map(r => r.definitionId),
      ships: rowsOfKind(registry.rows, ASSET_KIND_SHIP).filter(r => LIVE_SHIP_STATUSES.includes(r.status)).map(r => r.definitionId),
    };
  } catch (err) {
    logger.error('Asset registry unavailable (hq/seat-auction)', { error: String(err) });
    return null;
  }
}

export async function GET() {
  try {
    const loaded = await loadAssetProfile('hq');
    if (loaded.response) return loaded.response;
    await resolveDueHqSeatAuctions(prisma);
    const auctions = await loadHqAuctionSummaries(loaded.profile.id, prisma);
    return NextResponse.json({ success: true, auctions, fetchedAt: new Date().toISOString() });
  } catch (error) {
    logger.error('HQ seat auction GET error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile('hq');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const action = typeof body.action === 'string' ? body.action : '';
    const amount = typeof body.amount === 'number' && Number.isFinite(body.amount) ? Math.round(body.amount) : NaN;
    if (!Number.isFinite(amount) || amount <= 0) return badRequest('A bid amount is required.', 'invalid_amount');

    // QA profiles never hold seats (they would strand real inventory) — the
    // same rule the relocation route enforces.
    const real = await prisma.gameProfile.findFirst({ where: { id: profile.id, ...notQaProfile }, select: { id: true } });
    if (!real) return NextResponse.json({ error: 'QA accounts cannot bid on a headquarters seat.', code: 'qa_profile' }, { status: 403 });

    // Settle anything due so a closed auction can never take a bid.
    await resolveDueHqSeatAuctions(prisma);
    const ledgerOn = await isLedgerAvailable();
    const now = new Date();

    if (action === 'open') {
      const stageRaw = body.stage;
      if (!isHqStageId(stageRaw)) return badRequest('Unknown headquarters stage', 'unknown_stage');
      const stage: HqStageId = stageRaw;
      if (!hqSeatIsAuctioned(stage)) {
        return NextResponse.json({ error: `${getHqStage(stage).shortLabel} seats are leased first-come — relocate directly.`, code: 'not_auctioned' }, { status: 400 });
      }
      const view = await buildRequirementView(profile);
      if (!view) return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
      const check = evaluateHqRequirementsFrom(view, stage);
      if (!check.met) {
        return NextResponse.json({ error: `The corporation does not yet qualify for a ${getHqStage(stage).shortLabel} seat.`, code: 'requirements', check }, { status: 400 });
      }
      try {
        const result = await prisma.$transaction(async (tx) => {
          const { auction, seatIndex } = await openHqSeatAuction(tx, stage, now);
          if (!isAdmissibleHqBid(amount, auction.reserve, 0)) {
            throw new HqAuctionError('below_reserve', `The opening bid must be at least $${Math.round(hqMinimumBid(auction.reserve, 0) / 1_000_000).toLocaleString()}M.`);
          }
          await tx.hqSeatBid.create({ data: { auctionId: auction.id, profileId: profile.id, amount, status: HQ_SEAT_BID_OPEN } });
          await debitMoney(tx, profile.id, amount, 'hq_seat_bid_escrow', auction.id, ledgerOn);
          return { auction, seatIndex };
        });
        logger.info('HQ seat auction opened', { profileId: profile.id, stage, auctionId: result.auction.id, reserve: result.auction.reserve, amount });
        return NextResponse.json({
          success: true,
          auction: {
            id: result.auction.id, stage, seatIndex: result.seatIndex, reserve: result.auction.reserve,
            closesAtMs: result.auction.closesAt.getTime(), myBid: amount,
          },
          escrowed: amount,
        });
      } catch (err) {
        if (err instanceof HqAuctionError) return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
        if (err instanceof InsufficientFundsError) {
          return NextResponse.json({ error: 'Not enough cash to escrow that bid.', code: 'insufficient_funds', cost: amount }, { status: 400 });
        }
        throw err;
      }
    }

    if (action === 'bid') {
      const auctionId = typeof body.auctionId === 'string' ? body.auctionId : '';
      if (!auctionId) return badRequest('auctionId is required.', 'invalid_auction');
      const auction = await prisma.hqSeatAuction.findUnique({
        where: { id: auctionId },
        select: { id: true, stage: true, status: true, reserve: true, openedAt: true, closesAt: true },
      });
      if (!auction || auction.status !== HQ_SEAT_AUCTION_OPEN || auction.closesAt.getTime() <= now.getTime()) {
        return NextResponse.json({ error: 'That auction is closed.', code: 'auction_closed' }, { status: 409 });
      }
      if (!isHqStageId(auction.stage)) return NextResponse.json({ error: 'That auction is closed.', code: 'auction_closed' }, { status: 409 });
      const view = await buildRequirementView(profile);
      if (!view) return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
      const check = evaluateHqRequirementsFrom(view, auction.stage);
      if (!check.met) {
        return NextResponse.json({ error: `The corporation does not yet qualify for a ${getHqStage(auction.stage).shortLabel} seat.`, code: 'requirements', check }, { status: 400 });
      }

      const bids = await prisma.hqSeatBid.findMany({ where: { auctionId, status: HQ_SEAT_BID_OPEN }, select: { id: true, profileId: true, amount: true } });
      const mine = bids.find(b => b.profileId === profile.id) ?? null;
      const highBid = bids.reduce((m, b) => Math.max(m, b.amount), 0);
      if (!isAdmissibleHqBid(amount, auction.reserve, highBid)) {
        return NextResponse.json({
          error: `Bids must clear $${Math.round(hqMinimumBid(auction.reserve, highBid) / 1_000_000).toLocaleString()}M.`,
          code: 'below_minimum', minimumBid: hqMinimumBid(auction.reserve, highBid),
        }, { status: 400 });
      }
      const delta = amount - (mine?.amount ?? 0);
      if (delta <= 0) return badRequest('A revised bid must be higher than the one it replaces.', 'bid_not_raised');

      const extendedCloseMs = hqAuctionSoftClose(auction.closesAt.getTime(), auction.openedAt.getTime(), now.getTime());
      try {
        await prisma.$transaction(async (tx) => {
          if (mine) await tx.hqSeatBid.update({ where: { id: mine.id }, data: { amount } });
          else await tx.hqSeatBid.create({ data: { auctionId, profileId: profile.id, amount, status: HQ_SEAT_BID_OPEN } });
          if (extendedCloseMs !== auction.closesAt.getTime()) {
            await tx.hqSeatAuction.update({ where: { id: auctionId }, data: { closesAt: new Date(extendedCloseMs) } });
          }
          await debitMoney(tx, profile.id, delta, 'hq_seat_bid_escrow', auctionId, ledgerOn);
        });
      } catch (err) {
        if (err instanceof InsufficientFundsError) {
          return NextResponse.json({ error: 'Not enough cash to escrow that bid.', code: 'insufficient_funds', cost: delta }, { status: 400 });
        }
        throw err;
      }
      logger.info('HQ seat bid placed', { profileId: profile.id, auctionId, amount, delta, softClosed: extendedCloseMs !== auction.closesAt.getTime() });
      return NextResponse.json({
        success: true,
        auctionId,
        myBid: amount,
        escrowed: delta,
        closesAtMs: extendedCloseMs,
        softClosed: extendedCloseMs !== auction.closesAt.getTime(),
      });
    }

    return badRequest('Unknown action.', 'unknown_action');
  } catch (error) {
    logger.error('HQ seat auction error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
