import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  TOTAL_SHARES,
  TENDER_WINDOW_MS,
  TENDER_MIN_SHARES,
  LISTING_WINDOW_MS,
  RAISE_MIN_SHARES,
  RAISE_MAX_SHARES,
  RAISE_COOLDOWN_MS,
  DIVIDEND_MAX_PAYOUT_PCT,
  arbitrationFee,
  raisePricePerShare,
  minTenderPricePerShare,
  isProfileTakeoverProtected,
  diligenceFee,
  applyDiligenceNoise,
  diligenceWeekKey,
} from '@/lib/game/share-registry';
import {
  isEquitySchemaAvailable,
  getServerGateStatus,
  ensureRegistry,
  getCorpValuation,
  getLatestPublishedReport,
  transferShares,
  buildEquitySnapshot,
} from '@/lib/game/server-equity';

export const dynamic = 'force-dynamic';

/**
 * Wave M6 (docs/MEANINGFUL_2026-08.md §M6 / §3.2 O1): Share Registry &
 * Hostile Takeovers — the canon end-game. All player-facing equity actions.
 * Deterministic contest resolution + distress checks + dividends live in
 * ./resolve (cron). Everything here is population-gated
 * (share-registry.ts getTakeoverGateStatus): below the active-corp
 * threshold every mutation answers 409 'awaiting_market_depth' and the UI
 * presents the system as awaiting market depth — honest, not broken.
 *
 * POST actions:
 *   tender / white_knight — open a public, priced, time-boxed buy offer on
 *     a target's outstanding shares (escrow + burned arbitration fee).
 *   buyback — target board counteroffer at >= best open external bid,
 *     escrowed from the target's own cash ("burning cash").
 *   accept — a holder opts shares INTO an open buy-side offer (voluntary).
 *   withdraw — initiator withdraws an open offer (escrow refunded,
 *     arbitration fee NOT refunded — the anti-spam cost floor).
 *   buy_listing — first-come purchase from an open sell-side listing
 *     (capital raise or distress tranche).
 *   raise — board sells 10-30 founder shares at a 10% discount (90-day
 *     cooldown) — the early-game financing decision.
 *   set_dividend — board sets the payout ratio (0-50%).
 *   diligence — buy a noisy (+/-15%, deterministic per week) report on a
 *     target's cash / book / profit. Never free, never perfect.
 *   exercise_mandatory_bid — minority sells to a new controller at the
 *     tender price during the 30-day mandatory-bid window.
 */

async function getProfile(userId: string) {
  return prisma.gameProfile.findUnique({ where: { userId } });
}

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return err('Must be logged in', 401);
    const profile = await getProfile(session.user.id);
    if (!profile) return err('No game profile', 404);

    if (!(await isEquitySchemaAvailable())) {
      return NextResponse.json({ available: false, snapshot: null, listings: [] });
    }

    const now = Date.now();
    const gate = await getServerGateStatus(now);
    const protectedNow = isProfileTakeoverProtected(
      { createdAtMs: profile.createdAt.getTime(), netWorth: profile.netWorth },
      now,
    );

    // Lazy registry creation: graduated corps get their capital structure
    // the first time they open the Capital & Control panel with the gate on.
    if (gate.enabled && !protectedNow) {
      await ensureRegistry(profile.id);
    }

    const snapshot = await buildEquitySnapshot(
      { id: profile.id, companyName: profile.companyName, netWorth: profile.netWorth },
      now,
    );

    // Open sell-side listings across the market (raise + distress tranches)
    // — the "shares become acquirable" surface.
    const listings = await prisma.tenderOffer.findMany({
      where: { kind: { in: ['raise', 'distress'] }, status: 'open', closesAt: { gt: new Date(now) } },
      orderBy: { closesAt: 'asc' },
      take: 25,
    });
    const targetIds = Array.from(new Set(listings.map(l => l.targetProfileId)));
    const names = new Map(
      (await prisma.gameProfile.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, companyName: true },
      })).map(p => [p.id, p.companyName]),
    );

    // Open buy-side tenders on corporations I hold shares in — the surface
    // a holder needs to decide "sell into this offer or hold for dividends".
    let tendersOnHoldings: { offerId: string; kind: string; targetName: string; initiatorName: string; pricePerShare: number; sharesSought: number; closesAtMs: number; myShares: number; myAccepted: number }[] = [];
    try {
      const myHoldingRows = await prisma.corpShareHolding.findMany({
        where: { holderProfileId: profile.id, shares: { gt: 0 } },
        include: { registry: { select: { id: true, profileId: true } } },
      });
      const heldRegistryIds = myHoldingRows.filter(h => h.registry.profileId !== profile.id).map(h => h.registry.id);
      if (heldRegistryIds.length > 0) {
        const offers = await prisma.tenderOffer.findMany({
          where: {
            registryId: { in: heldRegistryIds },
            status: 'open',
            kind: { in: ['tender', 'white_knight', 'buyback'] },
            closesAt: { gt: new Date(now) },
          },
          include: { acceptances: { where: { holderProfileId: profile.id } } },
        });
        const byRegistry = new Map(myHoldingRows.map(h => [h.registry.id, h]));
        const pids = Array.from(new Set(offers.flatMap(o => [o.targetProfileId, o.initiatorProfileId])));
        const nameRows = new Map(
          (await prisma.gameProfile.findMany({ where: { id: { in: pids } }, select: { id: true, companyName: true } }))
            .map(p => [p.id, p.companyName]),
        );
        tendersOnHoldings = offers.map(o => ({
          offerId: o.id,
          kind: o.kind,
          targetName: nameRows.get(o.targetProfileId) || 'Unknown Corp',
          initiatorName: nameRows.get(o.initiatorProfileId) || 'Unknown Corp',
          pricePerShare: o.pricePerShare,
          sharesSought: o.sharesSought,
          closesAtMs: o.closesAt.getTime(),
          myShares: byRegistry.get(o.registryId)?.shares ?? 0,
          myAccepted: o.acceptances[0]?.shares ?? 0,
        }));
      }
    } catch { /* non-critical */ }

    // Mandatory-bid windows open on corporations I hold shares in — the
    // minority-protection exit (sell to the new controller at the tender
    // price for 30 days).
    let mandatoryBids: { offerId: string; targetName: string; pricePerShare: number; endsAtMs: number; myShares: number }[] = [];
    try {
      const myHoldings = await prisma.corpShareHolding.findMany({
        where: { holderProfileId: profile.id, shares: { gt: 0 } },
        include: { registry: { select: { id: true, profileId: true } } },
      });
      const registryIds = myHoldings.filter(h => h.registry.profileId !== profile.id).map(h => h.registry.id);
      if (registryIds.length > 0) {
        const offers = await prisma.tenderOffer.findMany({
          where: {
            registryId: { in: registryIds },
            status: 'settled_control',
            mandatoryBidEndsAt: { gt: new Date(now) },
            initiatorProfileId: { not: profile.id },
          },
        });
        const holdingByRegistry = new Map(myHoldings.map(h => [h.registry.id, h]));
        const targetIds2 = Array.from(new Set(offers.map(o => o.targetProfileId)));
        const names2 = new Map(
          (await prisma.gameProfile.findMany({ where: { id: { in: targetIds2 } }, select: { id: true, companyName: true } }))
            .map(p => [p.id, p.companyName]),
        );
        mandatoryBids = offers.map(o => ({
          offerId: o.id,
          targetName: names2.get(o.targetProfileId) || 'Unknown Corp',
          pricePerShare: o.pricePerShare,
          endsAtMs: o.mandatoryBidEndsAt!.getTime(),
          myShares: holdingByRegistry.get(o.registryId)?.shares ?? 0,
        }));
      }
    } catch { /* non-critical */ }

    return NextResponse.json({
      available: true,
      frontierProtected: protectedNow,
      snapshot,
      mandatoryBids,
      tendersOnHoldings,
      listings: listings.map(l => ({
        id: l.id,
        kind: l.kind,
        targetProfileId: l.targetProfileId,
        targetName: names.get(l.targetProfileId) || 'Unknown Corp',
        pricePerShare: l.pricePerShare,
        sharesRemaining: l.sharesSought - l.sharesFilled,
        closesAtMs: l.closesAt.getTime(),
      })),
    });
  } catch (error) {
    logger.error('Equity GET error', { error: String(error) });
    return NextResponse.json({ available: false, snapshot: null, listings: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return err('Must be logged in', 401);
    const profile = await getProfile(session.user.id);
    if (!profile) return err('No game profile', 404);

    if (!(await isEquitySchemaAvailable())) {
      return err('Share registry is not yet provisioned on this server', 503);
    }

    const now = Date.now();
    const gate = await getServerGateStatus(now);
    if (!gate.enabled) {
      return NextResponse.json(
        { error: 'The equity market is awaiting market depth', reason: gate.reason, activeCorps: gate.activeCorps, requiredCorps: gate.requiredCorps },
        { status: 409 },
      );
    }

    const body = await request.json();
    const action = String(body.action || '');
    const ledgerOn = await isLedgerAvailable();

    const selfProtected = isProfileTakeoverProtected(
      { createdAtMs: profile.createdAt.getTime(), netWorth: profile.netWorth },
      now,
    );

    // ── Tender offers / white knights ─────────────────────────────────────
    if (action === 'tender' || action === 'white_knight') {
      if (selfProtected) return err('Frontier corporations must graduate before bidding in the equity market');
      const targetName = String(body.targetCompanyName || '').slice(0, 60);
      const target = await prisma.gameProfile.findFirst({ where: { companyName: targetName } });
      if (!target || target.id === profile.id) return err('Target corporation not found');
      if (isProfileTakeoverProtected({ createdAtMs: target.createdAt.getTime(), netWorth: target.netWorth }, now)) {
        return err('Frontier corporations cannot be tendered — canon on-ramp protection');
      }
      const registry = await ensureRegistry(target.id);
      if (!registry) return err('Target registry unavailable', 500);
      if (registry.tenderCooldownUntil && registry.tenderCooldownUntil.getTime() > now) {
        return err(`This corporation was recently contested — tender window reopens ${registry.tenderCooldownUntil.toISOString().slice(0, 10)}`);
      }

      const sharesSought = Math.floor(Number(body.shares));
      const pricePerShare = Math.round(Number(body.pricePerShare));
      if (!Number.isFinite(sharesSought) || sharesSought < TENDER_MIN_SHARES || sharesSought > TOTAL_SHARES) {
        return err(`Tender must seek between ${TENDER_MIN_SHARES} and ${TOTAL_SHARES} shares`);
      }
      const myHolding = registry.holdings.find(h => h.holderProfileId === profile.id)?.shares ?? 0;
      if (myHolding + sharesSought > TOTAL_SHARES) {
        return err(`You already hold ${myHolding} shares — you may seek at most ${TOTAL_SHARES - myHolding}`);
      }
      const valuation = await getCorpValuation({ id: target.id, netWorth: target.netWorth });
      const minPrice = minTenderPricePerShare(valuation.fairSharePrice);
      if (!Number.isFinite(pricePerShare) || pricePerShare < minPrice) {
        return err(`Tender price must be at least $${minPrice.toLocaleString()}/share (fair value + control premium)`);
      }

      const existingMine = await prisma.tenderOffer.findFirst({
        where: { targetProfileId: target.id, initiatorProfileId: profile.id, status: 'open' },
      });
      if (existingMine) return err('You already have an open offer on this corporation');

      // Competing offers inherit the incumbent contest deadline so the whole
      // contest resolves deterministically in one batch.
      const incumbent = await prisma.tenderOffer.findFirst({
        where: { targetProfileId: target.id, status: 'open', kind: { in: ['tender', 'white_knight', 'buyback'] } },
        orderBy: { closesAt: 'asc' },
      });
      const closesAt = incumbent ? incumbent.closesAt : new Date(now + TENDER_WINDOW_MS);

      const escrow = pricePerShare * sharesSought;
      const fee = arbitrationFee(pricePerShare, sharesSought);
      if (ledgerOn && profile.money < escrow + fee) {
        return err(`Insufficient funds: escrow $${escrow.toLocaleString()} + arbitration fee $${fee.toLocaleString()}`);
      }

      const offer = await prisma.$transaction(async (tx) => {
        const created = await tx.tenderOffer.create({
          data: {
            registryId: registry.id,
            targetProfileId: target.id,
            initiatorProfileId: profile.id,
            kind: action,
            pricePerShare,
            sharesSought,
            escrowAmount: escrow,
            arbitrationFee: fee,
            closesAt,
          },
        });
        if (ledgerOn) {
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: escrow + fee } } });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: -escrow, reason: 'tender_escrow', refId: created.id });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: -fee, reason: 'tender_arbitration_burn', refId: created.id });
        }
        // Public diplomacy feed — takeover attempts are legible (canon).
        await tx.playerActivity.create({
          data: {
            profileId: profile.id,
            companyName: profile.companyName,
            type: 'tender_offer',
            title: action === 'white_knight'
              ? `🤝 ${profile.companyName} enters as white knight for ${target.companyName}`
              : `📈 ${profile.companyName} launches a tender offer for ${target.companyName}`,
            description: `${sharesSought} shares at $${pricePerShare.toLocaleString()}/share — offer closes ${closesAt.toISOString().slice(0, 10)}`,
            metadata: { offerId: created.id, targetProfileId: target.id, pricePerShare, sharesSought },
          },
        });
        return created;
      });

      return NextResponse.json({ success: true, offerId: offer.id, closesAtMs: offer.closesAt.getTime(), escrowed: ledgerOn ? escrow : 0, arbitrationFee: fee });
    }

    // ── Board counteroffer (buyback at >= best external bid) ──────────────
    if (action === 'buyback') {
      const registry = await ensureRegistry(profile.id);
      if (!registry) return err('Registry unavailable', 500);
      const external = await prisma.tenderOffer.findMany({
        where: { targetProfileId: profile.id, status: 'open', kind: { in: ['tender', 'white_knight'] } },
        orderBy: { closesAt: 'asc' },
      });
      if (external.length === 0) return err('No open external tender to counter');
      const bestPrice = Math.max(...external.map(o => o.pricePerShare));
      const pricePerShare = Math.round(Number(body.pricePerShare));
      if (!Number.isFinite(pricePerShare) || pricePerShare < bestPrice) {
        return err(`Counteroffer must match or beat the best external bid ($${bestPrice.toLocaleString()}/share)`);
      }
      const founderShares = registry.holdings.find(h => h.holderProfileId === profile.id)?.shares ?? 0;
      const floatShares = registry.totalShares - founderShares;
      const sharesSought = Math.min(Math.floor(Number(body.shares) || floatShares), floatShares);
      if (sharesSought <= 0) return err('No float to buy back');
      const existingBuyback = await prisma.tenderOffer.findFirst({
        where: { targetProfileId: profile.id, initiatorProfileId: profile.id, kind: 'buyback', status: 'open' },
      });
      if (existingBuyback) return err('You already have an open counteroffer');

      const escrow = pricePerShare * sharesSought;
      const fee = arbitrationFee(pricePerShare, sharesSought);
      if (ledgerOn && profile.money < escrow + fee) {
        return err(`Insufficient cash to fund the buyback: escrow $${escrow.toLocaleString()} + fee $${fee.toLocaleString()}`);
      }
      const closesAt = external[0].closesAt; // resolve with the contest

      const offer = await prisma.$transaction(async (tx) => {
        const created = await tx.tenderOffer.create({
          data: {
            registryId: registry.id,
            targetProfileId: profile.id,
            initiatorProfileId: profile.id,
            kind: 'buyback',
            pricePerShare,
            sharesSought,
            escrowAmount: escrow,
            arbitrationFee: fee,
            closesAt,
          },
        });
        if (ledgerOn) {
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: escrow + fee } } });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: -escrow, reason: 'tender_escrow', refId: created.id });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: -fee, reason: 'tender_arbitration_burn', refId: created.id });
        }
        await tx.playerActivity.create({
          data: {
            profileId: profile.id,
            companyName: profile.companyName,
            type: 'tender_offer',
            title: `🛡 ${profile.companyName}'s board counters with a buyback`,
            description: `Defensive buyback at $${pricePerShare.toLocaleString()}/share for up to ${sharesSought} shares`,
            metadata: { offerId: created.id, pricePerShare, sharesSought },
          },
        });
        return created;
      });
      return NextResponse.json({ success: true, offerId: offer.id, closesAtMs: offer.closesAt.getTime() });
    }

    // ── Holder opts shares into an open buy-side offer ────────────────────
    if (action === 'accept') {
      const offerId = String(body.offerId || '');
      const shares = Math.floor(Number(body.shares));
      const offer = await prisma.tenderOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.status !== 'open' || offer.closesAt.getTime() <= now) return err('Offer is not open');
      if (!['tender', 'white_knight', 'buyback'].includes(offer.kind)) return err('Not a buy-side offer');
      if (offer.initiatorProfileId === profile.id && offer.kind !== 'buyback') return err('You cannot tender shares into your own offer');
      const holding = await prisma.corpShareHolding.findUnique({
        where: { registryId_holderProfileId: { registryId: offer.registryId, holderProfileId: profile.id } },
      });
      if (!holding || holding.shares <= 0) return err('You hold no shares of this corporation');
      if (offer.kind === 'buyback' && offer.initiatorProfileId === profile.id) return err('The board cannot tender into its own buyback');
      if (!Number.isFinite(shares) || shares < 1 || shares > holding.shares) {
        return err(`You may accept between 1 and ${holding.shares} shares`);
      }
      await prisma.tenderAcceptance.upsert({
        where: { offerId_holderProfileId: { offerId, holderProfileId: profile.id } },
        create: { offerId, holderProfileId: profile.id, shares },
        update: { shares },
      });
      return NextResponse.json({ success: true, accepted: shares });
    }

    // ── Withdraw an open offer (escrow refunded, fee burned) ──────────────
    if (action === 'withdraw') {
      const offerId = String(body.offerId || '');
      const offer = await prisma.tenderOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.status !== 'open' || offer.initiatorProfileId !== profile.id) {
        return err('No open offer of yours with that id');
      }
      await prisma.$transaction(async (tx) => {
        await tx.tenderOffer.update({ where: { id: offerId }, data: { status: 'withdrawn' } });
        if (ledgerOn && offer.escrowAmount > 0) {
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { increment: offer.escrowAmount } } });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: offer.escrowAmount, reason: 'tender_escrow_refund', refId: offerId });
        }
      });
      return NextResponse.json({ success: true, refunded: ledgerOn ? offer.escrowAmount : 0 });
    }

    // ── First-come purchase from a sell-side listing ──────────────────────
    if (action === 'buy_listing') {
      if (selfProtected) return err('Frontier corporations must graduate before buying equity');
      const offerId = String(body.offerId || '');
      const shares = Math.floor(Number(body.shares));
      const offer = await prisma.tenderOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.status !== 'open' || offer.closesAt.getTime() <= now) return err('Listing is not open');
      if (!['raise', 'distress'].includes(offer.kind)) return err('Not a sell-side listing');
      if (offer.targetProfileId === profile.id) return err('You cannot buy your own listing');
      const remaining = offer.sharesSought - offer.sharesFilled;
      if (!Number.isFinite(shares) || shares < 1 || shares > remaining) {
        return err(`Between 1 and ${remaining} shares are available`);
      }
      const cost = shares * offer.pricePerShare;
      if (ledgerOn && profile.money < cost) return err('Insufficient funds');

      await prisma.$transaction(async (tx) => {
        // Shares move from the listing's seller (the target founder).
        await transferShares(tx, offer.registryId, offer.initiatorProfileId, profile.id, shares);
        await tx.tenderOffer.update({
          where: { id: offerId },
          data: {
            sharesFilled: { increment: shares },
            status: offer.sharesFilled + shares >= offer.sharesSought ? 'settled' : 'open',
          },
        });
        await tx.shareTransaction.create({
          data: {
            registryId: offer.registryId,
            kind: offer.kind === 'raise' ? 'raise_sale' : 'distress_sale',
            fromProfileId: offer.initiatorProfileId,
            toProfileId: profile.id,
            shares,
            pricePerShare: offer.pricePerShare,
            refId: offerId,
          },
        });
        if (ledgerOn) {
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: cost } } });
          await tx.gameProfile.update({ where: { id: offer.initiatorProfileId }, data: { money: { increment: cost } } });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: -cost, reason: 'share_purchase', refId: offerId });
          await recordLedger(tx, {
            profileId: offer.initiatorProfileId,
            moneyDelta: cost,
            reason: offer.kind === 'raise' ? 'capital_raise_proceeds' : 'distress_sale_proceeds',
            refId: offerId,
          });
        }
      });
      return NextResponse.json({ success: true, shares, cost: ledgerOn ? cost : 0 });
    }

    // ── Capital raise (board sells 10-30 shares for cash) ─────────────────
    if (action === 'raise') {
      if (selfProtected) return err('Frontier corporations graduate before accessing capital markets');
      const registry = await ensureRegistry(profile.id);
      if (!registry) return err('Registry unavailable', 500);
      if (registry.lastRaiseAt && registry.lastRaiseAt.getTime() + RAISE_COOLDOWN_MS > now) {
        return err('Capital raise on cooldown — one raise per 90 days');
      }
      const shares = Math.floor(Number(body.shares));
      if (!Number.isFinite(shares) || shares < RAISE_MIN_SHARES || shares > RAISE_MAX_SHARES) {
        return err(`A raise sells between ${RAISE_MIN_SHARES} and ${RAISE_MAX_SHARES} shares`);
      }
      const founderShares = registry.holdings.find(h => h.holderProfileId === profile.id)?.shares ?? 0;
      if (shares > founderShares) return err(`You hold only ${founderShares} shares`);
      const existingListing = await prisma.tenderOffer.findFirst({
        where: { targetProfileId: profile.id, kind: { in: ['raise', 'distress'] }, status: 'open' },
      });
      if (existingListing) return err('You already have an open listing');
      const valuation = await getCorpValuation({ id: profile.id, netWorth: profile.netWorth });
      const pricePerShare = raisePricePerShare(valuation.fairSharePrice);

      const offer = await prisma.$transaction(async (tx) => {
        const created = await tx.tenderOffer.create({
          data: {
            registryId: registry.id,
            targetProfileId: profile.id,
            initiatorProfileId: profile.id,
            kind: 'raise',
            pricePerShare,
            sharesSought: shares,
            closesAt: new Date(now + LISTING_WINDOW_MS),
          },
        });
        await tx.corpShareRegistry.update({ where: { id: registry.id }, data: { lastRaiseAt: new Date(now) } });
        await tx.playerActivity.create({
          data: {
            profileId: profile.id,
            companyName: profile.companyName,
            type: 'capital_raise',
            title: `💰 ${profile.companyName} opens a capital raise`,
            description: `${shares} shares at $${pricePerShare.toLocaleString()}/share (10% discount to fair value)`,
            metadata: { offerId: created.id, shares, pricePerShare },
          },
        });
        return created;
      });
      return NextResponse.json({ success: true, offerId: offer.id, pricePerShare, closesAtMs: offer.closesAt.getTime() });
    }

    // ── Dividend policy ───────────────────────────────────────────────────
    if (action === 'set_dividend') {
      const registry = await ensureRegistry(profile.id);
      if (!registry) return err('Registry unavailable', 500);
      const pct = Math.floor(Number(body.payoutRatioPct));
      if (!Number.isFinite(pct) || pct < 0 || pct > DIVIDEND_MAX_PAYOUT_PCT) {
        return err(`Payout ratio must be 0-${DIVIDEND_MAX_PAYOUT_PCT}%`);
      }
      await prisma.dividendPolicy.upsert({
        where: { registryId: registry.id },
        create: { registryId: registry.id, payoutRatioPct: pct },
        update: { payoutRatioPct: pct },
      });
      return NextResponse.json({ success: true, payoutRatioPct: pct });
    }

    // ── Due diligence (purchased, noisy, deterministic per week) ──────────
    if (action === 'diligence') {
      const targetName = String(body.targetCompanyName || '').slice(0, 60);
      const target = await prisma.gameProfile.findFirst({ where: { companyName: targetName } });
      if (!target || target.id === profile.id) return err('Target corporation not found');
      const valuation = await getCorpValuation({ id: target.id, netWorth: target.netWorth });
      const fee = diligenceFee(valuation.valuation);
      if (ledgerOn && profile.money < fee) return err(`Diligence report costs $${fee.toLocaleString()}`);
      if (ledgerOn) {
        await prisma.$transaction(async (tx) => {
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: fee } } });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: -fee, reason: 'diligence_fee_burn', refId: target.id });
        });
      }
      const week = diligenceWeekKey(now);
      const seed = (field: string) => `${profile.id}:${target.id}:${week}:${field}`;
      const report = await getLatestPublishedReport(target.id);
      return NextResponse.json({
        success: true,
        fee: ledgerOn ? fee : 0,
        report: {
          targetName: target.companyName,
          cashEstimate: applyDiligenceNoise(target.money, seed('cash')),
          bookNetWorthEstimate: applyDiligenceNoise(target.netWorth, seed('book')),
          lastQuarterProfitEstimate: report ? applyDiligenceNoise(report.profit, seed('profit')) : null,
          publishedQuarter: report?.quarter ?? null,
          noiseBandPct: 15,
          note: 'Estimates carry ±15% noise. Figures refresh weekly — repeat purchases this week return the same estimates.',
        },
      });
    }

    // ── Mandatory-bid exercise (minority protection) ──────────────────────
    if (action === 'exercise_mandatory_bid') {
      const offerId = String(body.offerId || '');
      const shares = Math.floor(Number(body.shares));
      const offer = await prisma.tenderOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.status !== 'settled_control' || !offer.mandatoryBidEndsAt || offer.mandatoryBidEndsAt.getTime() <= now) {
        return err('No open mandatory-bid window on that offer');
      }
      if (offer.initiatorProfileId === profile.id) return err('The controller cannot exercise their own mandatory bid');
      const holding = await prisma.corpShareHolding.findUnique({
        where: { registryId_holderProfileId: { registryId: offer.registryId, holderProfileId: profile.id } },
      });
      if (!holding || holding.shares <= 0) return err('You hold no shares of this corporation');
      if (!Number.isFinite(shares) || shares < 1 || shares > holding.shares) {
        return err(`You may sell between 1 and ${holding.shares} shares`);
      }
      const buyer = await prisma.gameProfile.findUnique({ where: { id: offer.initiatorProfileId } });
      if (!buyer) return err('Controller profile not found', 404);
      const cost = shares * offer.pricePerShare;
      if (ledgerOn && buyer.money < cost) {
        return err('The controller cannot currently fund the mandatory bid — try again later');
      }
      await prisma.$transaction(async (tx) => {
        await transferShares(tx, offer.registryId, profile.id, buyer.id, shares);
        await tx.shareTransaction.create({
          data: {
            registryId: offer.registryId,
            kind: 'mandatory_bid',
            fromProfileId: profile.id,
            toProfileId: buyer.id,
            shares,
            pricePerShare: offer.pricePerShare,
            refId: offerId,
          },
        });
        if (ledgerOn) {
          await tx.gameProfile.update({ where: { id: buyer.id }, data: { money: { decrement: cost } } });
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { increment: cost } } });
          await recordLedger(tx, { profileId: buyer.id, moneyDelta: -cost, reason: 'mandatory_bid_payment', refId: offerId });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: cost, reason: 'mandatory_bid_receipt', refId: offerId });
        }
      });
      return NextResponse.json({ success: true, shares, proceeds: ledgerOn ? cost : 0 });
    }

    return err('Invalid action');
  } catch (error) {
    logger.error('Equity action error', { error: String(error) });
    return err('Equity action failed', 500);
  }
}
