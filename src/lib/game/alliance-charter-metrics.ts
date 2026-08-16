// ─── Space Tycoon: Live-Service Wave LS5 — Charter metric aggregation ──────
// docs/LIVE_SERVICE_2026-08.md §LS5. The ONE place that turns a charter type
// + (profileId, allianceId, week window) into "how much did this member
// actually contribute this week" — used identically by the charter route
// (live, in-progress week) and the weekly alliance-cron close step (final,
// authoritative week). Every number here is aggregated from rows a server
// route already wrote for an unrelated reason (see alliance-charters.ts's
// header comment) — nothing here is client-reported.

import type { PrismaClient } from '@prisma/client';
import type { AllianceCharterType } from './alliance-charters';

/**
 * How much a member contributed toward a charter's metric within
 * [weekStartMs, weekEndMs). Pure DB read, no mutation — safe to call for a
 * still-open (in-progress) week as well as a just-closed one.
 */
export async function computeWeeklyContribution(
  prisma: PrismaClient,
  charterType: AllianceCharterType,
  allianceId: string,
  profileId: string,
  weekStartMs: number,
  weekEndMs: number,
): Promise<number> {
  const gte = new Date(weekStartMs);
  const lt = new Date(weekEndMs);

  if (charterType === 'treasury_growth') {
    // Existing depositToTreasury (alliance-treasury.ts) already records a
    // per-member GameLedgerEntry: reason 'treasury_deposit', refId =
    // allianceId. Sum absolute deposit amounts within the week window.
    const rows = await prisma.gameLedgerEntry.findMany({
      where: {
        profileId,
        reason: 'treasury_deposit',
        refId: allianceId,
        createdAt: { gte, lt },
      },
      select: { moneyDelta: true },
    });
    return rows.reduce((sum, r) => sum + Math.abs(r.moneyDelta), 0);
  }

  if (charterType === 'science_cofund_count') {
    // NpcProgramStake (this same wave, part 2) — count of stakes placed
    // within the week, regardless of program/cycle. A "co-fund" pledge
    // counts commitments, not dollars — matches the spec example verbatim
    // ("complete 3 alliance science co-funds").
    const count = await prisma.npcProgramStake.count({
      where: { profileId, stakedAt: { gte, lt } },
    });
    return count;
  }

  if (charterType === 'event_points') {
    // AllianceEventContribution.score, scoped to this alliance, for any
    // event whose window overlaps the pledge week (a sprint/challenge/
    // mega-event that straddles the week boundary counts proportionally to
    // nothing special — the member's contribution score is whatever they
    // banked; `updatedAt` falling inside the week is the practical signal
    // that new scoring happened during this pledge week).
    const rows = await prisma.allianceEventContribution.findMany({
      where: {
        profileId,
        allianceId,
        updatedAt: { gte, lt },
      },
      select: { score: true },
    });
    return rows.reduce((sum, r) => sum + Math.max(0, r.score), 0);
  }

  if (charterType === 'market_share') {
    // Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 6): "hold X% of a
    // resource's traded volume" is season-long/relative by nature, which
    // doesn't fit this function's per-week additive contribution shape —
    // the weekly PLEDGE instead tracks raw trade value moved (MarketFill,
    // buyer+seller) within the window, same raw material league trade_volume
    // uses. computeCharterGoal's perMemberSeasonTarget is denominated in
    // that same $ unit (see alliance-charters.ts definition below).
    const [asBuyer, asSeller] = await Promise.all([
      prisma.marketFill.aggregate({
        where: { buyerProfileId: profileId, createdAt: { gte, lt } }, _sum: { totalValue: true },
      }),
      prisma.marketFill.aggregate({
        where: { sellerProfileId: profileId, createdAt: { gte, lt } }, _sum: { totalValue: true },
      }),
    ]);
    return (asBuyer._sum.totalValue || 0) + (asSeller._sum.totalValue || 0);
  }

  return 0;
}
