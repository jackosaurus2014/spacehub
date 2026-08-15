// ─── Space Tycoon: Live-Service Wave LS5 — NPC co-fund settlement sweep ────
// docs/LIVE_SERVICE_2026-08.md §LS5 part 2. Shared by both
// /api/space-tycoon/science/co-fund (lazy sweep on visit — the
// sweepExpiredBounties precedent) and alliance-cron (periodic backstop so a
// cycle settles even if nobody visits the science tab that week — the
// calendar's settlement countdown must never lie).

import type { PrismaClient } from '@prisma/client';
import { recordLedger, isLedgerAvailable } from './server-ledger';
import { getGlobalGameDate } from './server-time';
import {
  NPC_PROGRAMS, getNpcCycleWindow, getNpcSettlementMultiplier, computeNpcStakeSettlement,
} from './science-missions';
import { logger } from '@/lib/logger';

/** Lazily settle any NPC program cycle whose co-fund window has fully
 *  elapsed. Deterministic (seeded settlement multiplier — no new
 *  randomness), idempotent (guarded updateMany + `settled` flag), and
 *  never throws — a failed sweep just means the next call retries. */
export async function sweepNpcCoFundSettlements(prisma: PrismaClient): Promise<{ settled: number }> {
  let settled = 0;
  if (!(await isLedgerAvailable())) return { settled };
  try {
    const worldMonth = getGlobalGameDate().totalMonths;
    for (const def of NPC_PROGRAMS) {
      const unsettled = await prisma.npcProgramStake.findMany({
        where: { npcProgramId: def.id, settled: false },
        select: { id: true, cycleIndex: true, profileId: true, amount: true },
        take: 200,
      });
      if (unsettled.length === 0) continue;

      const cycleIndexes = Array.from(new Set(unsettled.map(s => s.cycleIndex)));
      for (const cycleIndex of cycleIndexes) {
        const { settlesAtMonth } = getNpcCycleWindow(def, cycleIndex);
        if (settlesAtMonth > worldMonth) continue;

        const cycleStakes = unsettled.filter(s => s.cycleIndex === cycleIndex);
        const mult = getNpcSettlementMultiplier(def.id, cycleIndex);
        const settlements = computeNpcStakeSettlement(
          cycleStakes.map(s => ({ profileId: s.profileId, amount: s.amount })),
          mult,
        );
        const settlementByProfile = new Map(settlements.map(s => [s.profileId, s]));

        for (const stake of cycleStakes) {
          const settlement = settlementByProfile.get(stake.profileId);
          if (!settlement) continue;
          const wasSettled = await prisma.$transaction(async tx => {
            const updated = await tx.npcProgramStake.updateMany({
              where: { id: stake.id, settled: false },
              data: { settled: true, payout: settlement.payout, settledAt: new Date() },
            });
            if (updated.count === 0) return false; // already settled by a concurrent sweep
            await tx.gameProfile.update({
              where: { id: stake.profileId },
              data: { money: { increment: settlement.payout } },
            });
            await recordLedger(tx, {
              profileId: stake.profileId, moneyDelta: settlement.payout,
              reason: 'npc_program_payout', refId: `${def.id}:${cycleIndex}`,
            });
            return true;
          });
          if (wasSettled) settled++;
        }

        logger.info('NPC program cycle settled', {
          npcProgramId: def.id, cycleIndex, stakers: cycleStakes.length, settlementMult: mult,
        });
      }
    }
  } catch (error) {
    logger.error('NPC co-fund settlement sweep failed', { error: String(error) });
  }
  return { settled };
}
