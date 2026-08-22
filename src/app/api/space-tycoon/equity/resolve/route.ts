import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import { getGlobalGameDate, REAL_SECONDS_PER_GAME_MONTH } from '@/lib/game/server-time';
import {
  rankContestOffers,
  planTenderSettlement,
  classifyDistressMonth,
  distressPricePerShare,
  distressTrancheShares,
  planDividend,
  getTakeoverGateStatus,
  DISTRESS_MONTHS_REQUIRED,
  TENDER_TARGET_COOLDOWN_MS,
  MANDATORY_BID_WINDOW_MS,
  INTEGRATION_MALUS_GAME_MONTHS,
  LISTING_WINDOW_MS,
  type ContestOffer,
  type EquityOfferKind,
} from '@/lib/game/share-registry';
import {
  isEquitySchemaAvailable,
  countActiveCorps,
  getCorpValuation,
  getLatestPublishedReport,
  transferShares,
} from '@/lib/game/server-equity';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Wave M6 (docs/MEANINGFUL_2026-08.md §M6): equity resolution cron
 * (cron-scheduler.ts 'tycoon-equity-resolve').
 *
 * AUTH: requireCronSecret. NOTE — an earlier version of this comment claimed
 * the route was "CRON_SECRET-authenticated via middleware.ts's cronPaths".
 * That was false and left this endpoint world-callable: middleware's cronPaths
 * list only *skips the CSRF check* when a valid secret is present; it never
 * *requires* one. With no Bearer token the request fell through to the plain
 * Origin/Referer comparison, which any attacker satisfies by sending
 * `Origin: https://<host>`. Since this route settles tenders, moves shares,
 * refunds escrow and pays dividends, it must authenticate itself.
 *
 * Deterministic settler for everything time-boxed in the equity system:
 *   1. orphan healing — holdings whose holder profile no longer exists
 *      escheat back to the founder (keeps sum(holdings) == totalShares
 *      without cascade deletes);
 *   2. tender contests — all expired open buy-side offers per target
 *      resolve as ONE contest (share-registry.ts rankContestOffers: highest
 *      price wins, defender wins ties, then earliest, then id — no RNG),
 *      winner settles pro-rata from acceptances, losers get escrow back;
 *   3. control changes — crossing 50% sets the controller, opens the 30-day
 *      mandatory-bid window at the same price (minority protection), starts
 *      the 2-game-month integration malus, and writes the chronicle entry;
 *   4. sell-side listing expiry (raise/distress);
 *   5. distress checks — once per world game-month, cash-negative corps
 *      accrue distress months; at 3, a 10-share tranche auto-lists at a 15%
 *      discount (the stakes-bearing exit that transfers assets);
 *   6. dividends — once per NEW published quarterly report, payout-ratio %
 *      of profit pro-rata to minority holders.
 *
 * Population gate: contests still SETTLE below the gate (open offers made
 * while enabled must resolve — never strand escrow), but no NEW distress
 * tranches or dividends are initiated while the gate is closed.
 */
export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    if (!(await isEquitySchemaAvailable())) {
      return NextResponse.json({ skipped: 'equity schema not provisioned' });
    }
    const now = Date.now();
    const nowDate = new Date(now);
    const ledgerOn = await isLedgerAvailable();
    const gate = getTakeoverGateStatus(await countActiveCorps(now));
    const summary = {
      orphansHealed: 0,
      contestsResolved: 0,
      offersSettled: 0,
      offersRefunded: 0,
      listingsExpired: 0,
      distressChecked: 0,
      distressTranchesOpened: 0,
      dividendsPaid: 0,
      controlChanges: 0,
    };

    // ── 1. Orphan healing ─────────────────────────────────────────────────
    try {
      const holdings = await prisma.corpShareHolding.findMany({
        include: { registry: { select: { id: true, profileId: true } } },
      });
      const holderIds = Array.from(new Set(holdings.map(h => h.holderProfileId)));
      const existing = new Set(
        (await prisma.gameProfile.findMany({ where: { id: { in: holderIds } }, select: { id: true } })).map(p => p.id),
      );
      for (const h of holdings) {
        if (existing.has(h.holderProfileId)) continue;
        await prisma.$transaction(async (tx) => {
          await tx.corpShareHolding.delete({ where: { id: h.id } });
          await tx.corpShareHolding.upsert({
            where: { registryId_holderProfileId: { registryId: h.registryId, holderProfileId: h.registry.profileId } },
            create: { registryId: h.registryId, holderProfileId: h.registry.profileId, shares: h.shares },
            update: { shares: { increment: h.shares } },
          });
          await tx.shareTransaction.create({
            data: {
              registryId: h.registryId,
              kind: 'escheat',
              fromProfileId: h.holderProfileId,
              toProfileId: h.registry.profileId,
              shares: h.shares,
              pricePerShare: 0,
            },
          });
        });
        summary.orphansHealed++;
      }
    } catch (e) {
      logger.error('Equity orphan healing failed', { error: String(e) });
    }

    // ── 2+3. Tender contests ──────────────────────────────────────────────
    const expired = await prisma.tenderOffer.findMany({
      where: { status: 'open', kind: { in: ['tender', 'white_knight', 'buyback'] }, closesAt: { lte: nowDate } },
      include: { acceptances: true },
    });
    const byTarget = new Map<string, typeof expired>();
    for (const o of expired) {
      const list = byTarget.get(o.targetProfileId) || [];
      list.push(o);
      byTarget.set(o.targetProfileId, list);
    }

    for (const [targetProfileId, offers] of Array.from(byTarget.entries())) {
      summary.contestsResolved++;
      const contest: ContestOffer[] = offers.map(o => ({
        id: o.id,
        kind: o.kind as EquityOfferKind,
        initiatorProfileId: o.initiatorProfileId,
        pricePerShare: o.pricePerShare,
        sharesSought: o.sharesSought,
        createdAtMs: o.createdAt.getTime(),
      }));
      const ranked = rankContestOffers(contest);
      const winner = ranked[0];
      const registryId = offers[0].registryId;

      // Losers: full escrow refund.
      for (const o of offers) {
        if (o.id === winner.id) continue;
        await prisma.$transaction(async (tx) => {
          await tx.tenderOffer.update({ where: { id: o.id }, data: { status: 'lost' } });
          if (ledgerOn && o.escrowAmount > 0) {
            await tx.gameProfile.update({ where: { id: o.initiatorProfileId }, data: { money: { increment: o.escrowAmount } } });
            await recordLedger(tx, { profileId: o.initiatorProfileId, moneyDelta: o.escrowAmount, reason: 'tender_escrow_refund', refId: o.id });
          }
        });
        summary.offersRefunded++;
      }

      // Winner: settle pro-rata from its acceptances.
      const winnerRow = offers.find(o => o.id === winner.id)!;
      const buyerHolding = await prisma.corpShareHolding.findUnique({
        where: { registryId_holderProfileId: { registryId, holderProfileId: winner.initiatorProfileId } },
      });
      const plan = planTenderSettlement({
        offer: winner,
        targetProfileId,
        acceptances: winnerRow.acceptances
          .filter(a => a.holderProfileId !== winner.initiatorProfileId || winner.kind === 'buyback')
          .map(a => ({ holderProfileId: a.holderProfileId, shares: a.shares })),
        buyerCurrentShares: buyerHolding?.shares ?? 0,
        escrowAmount: winnerRow.escrowAmount,
      });

      await prisma.$transaction(async (tx) => {
        // Verify each seller still holds what they accepted; clamp down if not.
        for (const move of plan.shareMoves) {
          const h = await tx.corpShareHolding.findUnique({
            where: { registryId_holderProfileId: { registryId, holderProfileId: move.fromProfileId } },
          });
          const actual = Math.min(move.shares, h?.shares ?? 0);
          if (actual <= 0) continue;
          await transferShares(tx, registryId, move.fromProfileId, move.toProfileId, actual);
          await tx.shareTransaction.create({
            data: {
              registryId,
              kind: winner.kind === 'buyback' ? 'buyback' : 'tender_settlement',
              fromProfileId: move.fromProfileId,
              toProfileId: move.toProfileId,
              shares: actual,
              pricePerShare: winner.pricePerShare,
              refId: winner.id,
            },
          });
          if (ledgerOn) {
            const pay = actual * winner.pricePerShare;
            await tx.gameProfile.update({ where: { id: move.fromProfileId }, data: { money: { increment: pay } } });
            await recordLedger(tx, { profileId: move.fromProfileId, moneyDelta: pay, reason: 'share_sale_proceeds', refId: winner.id });
          }
        }
        if (ledgerOn && plan.escrowRefund > 0) {
          await tx.gameProfile.update({ where: { id: winner.initiatorProfileId }, data: { money: { increment: plan.escrowRefund } } });
          await recordLedger(tx, { profileId: winner.initiatorProfileId, moneyDelta: plan.escrowRefund, reason: 'tender_escrow_refund', refId: winner.id });
        }

        const controlChange = plan.crossedControl;
        await tx.tenderOffer.update({
          where: { id: winner.id },
          data: {
            status: controlChange ? 'settled_control' : plan.sharesAcquired > 0 ? 'settled' : 'expired',
            sharesFilled: plan.sharesAcquired,
            mandatoryBidEndsAt: controlChange ? new Date(now + MANDATORY_BID_WINDOW_MS) : null,
          },
        });
        await tx.corpShareRegistry.update({
          where: { id: registryId },
          data: {
            tenderCooldownUntil: new Date(now + TENDER_TARGET_COOLDOWN_MS),
            ...(controlChange
              ? {
                  controllerProfileId: winner.initiatorProfileId,
                  integrationMalusUntil: new Date(
                    now + INTEGRATION_MALUS_GAME_MONTHS * REAL_SECONDS_PER_GAME_MONTH * 1000,
                  ),
                }
              : {}),
          },
        });
      });
      summary.offersSettled++;

      // Chronicle + public feed ("player corporations write their own chapter").
      try {
        const [buyerP, targetP] = await Promise.all([
          prisma.gameProfile.findUnique({ where: { id: winner.initiatorProfileId }, select: { id: true, companyName: true } }),
          prisma.gameProfile.findUnique({ where: { id: targetProfileId }, select: { id: true, companyName: true } }),
        ]);
        if (buyerP && targetP) {
          if (plan.crossedControl) {
            summary.controlChanges++;
            await prisma.playerActivity.create({
              data: {
                profileId: buyerP.id,
                companyName: buyerP.companyName,
                type: 'takeover_settled',
                title: `🏢 ${buyerP.companyName} acquires control of ${targetP.companyName}`,
                description: `${plan.buyerSharesAfter}% stake at $${winner.pricePerShare.toLocaleString()}/share. Minority holders may sell at the same price for 30 days (mandatory bid rule).`,
                metadata: { offerId: winner.id, targetProfileId, sharesAcquired: plan.sharesAcquired },
              },
            });
          } else if (plan.sharesAcquired > 0) {
            await prisma.playerActivity.create({
              data: {
                profileId: buyerP.id,
                companyName: buyerP.companyName,
                type: 'tender_settled',
                title: winner.kind === 'buyback'
                  ? `🛡 ${targetP.companyName}'s buyback defense succeeds`
                  : `📊 ${buyerP.companyName} settles a tender in ${targetP.companyName}`,
                description: `${plan.sharesAcquired} shares changed hands at $${winner.pricePerShare.toLocaleString()}/share`,
                metadata: { offerId: winner.id, targetProfileId, sharesAcquired: plan.sharesAcquired },
              },
            });
          }
        }
      } catch { /* chronicle non-critical */ }
    }

    // ── 4. Sell-side listing expiry ───────────────────────────────────────
    const expiredListings = await prisma.tenderOffer.updateMany({
      where: { status: 'open', kind: { in: ['raise', 'distress'] }, closesAt: { lte: nowDate } },
      data: { status: 'expired' },
    });
    summary.listingsExpired = expiredListings.count;

    // ── 5. Distress checks (once per world game-month, gate-dependent) ────
    if (gate.enabled) {
      const worldMonth = getGlobalGameDate(now).totalMonths;
      const registries = await prisma.corpShareRegistry.findMany({
        where: { OR: [{ lastDistressCheckMonth: null }, { lastDistressCheckMonth: { lt: worldMonth } }] },
        include: { holdings: true },
        take: 500,
      });
      for (const reg of registries) {
        const profile = await prisma.gameProfile.findUnique({
          where: { id: reg.profileId },
          select: { id: true, companyName: true, money: true, netWorth: true, createdAt: true },
        });
        if (!profile) continue;
        summary.distressChecked++;
        const inDistress = classifyDistressMonth(reg.lastDistressCash, profile.money, profile.netWorth);
        const distressMonths = inDistress ? reg.distressMonths + 1 : 0;
        await prisma.corpShareRegistry.update({
          where: { id: reg.id },
          data: { distressMonths, lastDistressCheckMonth: worldMonth, lastDistressCash: profile.money },
        });
        if (distressMonths >= DISTRESS_MONTHS_REQUIRED) {
          const founderShares = reg.holdings.find(h => h.holderProfileId === reg.profileId)?.shares ?? 0;
          const tranche = distressTrancheShares(founderShares);
          const openListing = await prisma.tenderOffer.findFirst({
            where: { targetProfileId: reg.profileId, kind: { in: ['raise', 'distress'] }, status: 'open' },
          });
          if (tranche > 0 && !openListing) {
            const valuation = await getCorpValuation({ id: profile.id, netWorth: profile.netWorth });
            const price = distressPricePerShare(valuation.fairSharePrice);
            await prisma.$transaction(async (tx) => {
              await tx.tenderOffer.create({
                data: {
                  registryId: reg.id,
                  targetProfileId: reg.profileId,
                  initiatorProfileId: reg.profileId,
                  kind: 'distress',
                  pricePerShare: price,
                  sharesSought: tranche,
                  closesAt: new Date(now + LISTING_WINDOW_MS),
                },
              });
              await tx.corpShareRegistry.update({ where: { id: reg.id }, data: { distressMonths: 0 } });
              await tx.playerActivity.create({
                data: {
                  profileId: profile.id,
                  companyName: profile.companyName,
                  type: 'distress_auction',
                  title: `⚠ ${profile.companyName} enters a distress share auction`,
                  description: `${tranche} shares list at $${price.toLocaleString()}/share after ${DISTRESS_MONTHS_REQUIRED} cash-negative months — proceeds recapitalize the corporation.`,
                },
              });
            });
            summary.distressTranchesOpened++;
          }
        }
      }
    }

    // ── 6. Dividends (once per NEW published quarterly, gate-dependent) ───
    if (gate.enabled && ledgerOn) {
      const policies = await prisma.dividendPolicy.findMany({
        where: { payoutRatioPct: { gt: 0 } },
        include: { registry: { include: { holdings: true } } },
        take: 500,
      });
      for (const policy of policies) {
        const reg = policy.registry;
        const minorityExists = reg.holdings.some(h => h.holderProfileId !== reg.profileId && h.shares > 0);
        if (!minorityExists) continue;
        const report = await getLatestPublishedReport(reg.profileId);
        if (!report || report.quarter === policy.lastPaidQuarterKey) continue;
        const payer = await prisma.gameProfile.findUnique({
          where: { id: reg.profileId },
          select: { id: true, companyName: true, money: true },
        });
        if (!payer) continue;
        const plan = planDividend({
          quarterProfit: report.profit,
          payoutRatioPct: policy.payoutRatioPct,
          holdings: reg.holdings.map(h => ({ holderProfileId: h.holderProfileId, shares: h.shares })),
          founderProfileId: reg.profileId,
          founderCash: payer.money,
        });
        await prisma.$transaction(async (tx) => {
          // Stamp the quarter even when the plan is empty (profit <= 0 or
          // cash-short) so the check doesn't retry forever.
          await tx.dividendPolicy.update({ where: { id: policy.id }, data: { lastPaidQuarterKey: report.quarter } });
          if (plan.total <= 0) return;
          await tx.gameProfile.update({ where: { id: payer.id }, data: { money: { decrement: plan.total } } });
          await recordLedger(tx, { profileId: payer.id, moneyDelta: -plan.total, reason: 'dividend_paid', refId: reg.id });
          for (const entry of plan.entries) {
            await tx.gameProfile.update({ where: { id: entry.holderProfileId }, data: { money: { increment: entry.amount } } });
            await recordLedger(tx, { profileId: entry.holderProfileId, moneyDelta: entry.amount, reason: 'dividend_received', refId: reg.id });
          }
        });
        if (plan.total > 0) summary.dividendsPaid++;
      }
    }

    logger.info('Equity resolve complete', summary);
    return NextResponse.json({ success: true, gate, ...summary });
  } catch (error) {
    logger.error('Equity resolve error', { error: String(error) });
    return NextResponse.json({ error: 'Equity resolve failed' }, { status: 500 });
  }
}
