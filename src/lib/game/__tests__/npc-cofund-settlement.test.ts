/**
 * @jest-environment node
 *
 * Live-Service Wave LS5 part 2 — NPC co-fund settlement sweep (mocked
 * Prisma). This is the escrow/settlement flow test: stakes get grouped by
 * cycle, settled exactly once via a guarded updateMany, credited to the
 * right profile, and ledgered — using the REAL deterministic settlement
 * math (computeNpcStakeSettlement / getNpcSettlementMultiplier), not a
 * stub, so this also doubles as a determinism check end-to-end.
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockIsLedgerAvailable = jest.fn();
const mockRecordLedger = jest.fn();
jest.mock('../server-ledger', () => ({
  isLedgerAvailable: (...args: unknown[]) => mockIsLedgerAvailable(...args),
  recordLedger: (...args: unknown[]) => mockRecordLedger(...args),
}));

const mockGetGlobalGameDate = jest.fn();
jest.mock('../server-time', () => ({
  getGlobalGameDate: (...args: unknown[]) => mockGetGlobalGameDate(...args),
}));

import { sweepNpcCoFundSettlements } from '../npc-cofund-settlement';
import { NPC_PROGRAMS, getNpcCycleWindow, getNpcSettlementMultiplier, computeNpcStakeSettlement } from '../science-missions';

const def = NPC_PROGRAMS[0]; // npc_dominion_sentinels
const otherDefs = NPC_PROGRAMS.slice(1);

function makeFakePrisma(stakesByProgram: Record<string, { id: string; cycleIndex: number; profileId: string; amount: number }[]>) {
  const updateManyMock = jest.fn().mockResolvedValue({ count: 1 });
  const gameProfileUpdateMock = jest.fn().mockResolvedValue({});
  const npcProgramStake = {
    findMany: jest.fn(({ where }: { where: { npcProgramId: string } }) =>
      Promise.resolve(stakesByProgram[where.npcProgramId] ?? [])),
    updateMany: updateManyMock,
  };
  const gameProfile = { update: gameProfileUpdateMock };
  type FakeTx = { npcProgramStake: typeof npcProgramStake; gameProfile: typeof gameProfile };
  const tx: FakeTx = { npcProgramStake, gameProfile };
  const prisma = {
    npcProgramStake,
    gameProfile,
    $transaction: jest.fn((fn: (tx: FakeTx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, updateManyMock, gameProfileUpdateMock };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsLedgerAvailable.mockResolvedValue(true);
});

describe('sweepNpcCoFundSettlements', () => {
  it('does nothing when the ledger is unavailable (graceful degradation — bounty precedent)', async () => {
    mockIsLedgerAvailable.mockResolvedValue(false);
    const { prisma } = makeFakePrisma({});
    const result = await sweepNpcCoFundSettlements(prisma as never);
    expect(result.settled).toBe(0);
    expect(prisma.npcProgramStake.findMany).not.toHaveBeenCalled();
  });

  it('leaves a cycle untouched while its window is still running (settlesAtMonth > worldMonth)', async () => {
    const { cycleStartMonth } = getNpcCycleWindow(def, 0);
    mockGetGlobalGameDate.mockReturnValue({ totalMonths: cycleStartMonth + 1 }); // mid-cycle, not yet settled
    const { prisma, updateManyMock } = makeFakePrisma({
      [def.id]: [{ id: 'stake_1', cycleIndex: 0, profileId: 'profile_a', amount: def.coFundCost }],
    });
    const result = await sweepNpcCoFundSettlements(prisma as never);
    expect(result.settled).toBe(0);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it('settles a cycle whose window has fully elapsed, crediting the deterministic payout and recording the ledger entry', async () => {
    const { settlesAtMonth } = getNpcCycleWindow(def, 0);
    mockGetGlobalGameDate.mockReturnValue({ totalMonths: settlesAtMonth }); // exactly due
    const stake = { id: 'stake_1', cycleIndex: 0, profileId: 'profile_a', amount: def.coFundCost };
    const { prisma, updateManyMock, gameProfileUpdateMock } = makeFakePrisma({ [def.id]: [stake] });

    const result = await sweepNpcCoFundSettlements(prisma as never);

    const expectedMult = getNpcSettlementMultiplier(def.id, 0);
    const [expectedSettlement] = computeNpcStakeSettlement([{ profileId: 'profile_a', amount: def.coFundCost }], expectedMult);

    expect(result.settled).toBe(1);
    expect(updateManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stake_1', settled: false },
      data: expect.objectContaining({ settled: true, payout: expectedSettlement.payout }),
    }));
    expect(gameProfileUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'profile_a' },
      data: { money: { increment: expectedSettlement.payout } },
    }));
    expect(mockRecordLedger).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      profileId: 'profile_a', moneyDelta: expectedSettlement.payout,
      reason: 'npc_program_payout', refId: `${def.id}:0`,
    }));
  });

  it('splits a multi-staker cycle pro-rata using the real settlement math (small-contributor bonus included)', async () => {
    const { settlesAtMonth } = getNpcCycleWindow(def, 0);
    mockGetGlobalGameDate.mockReturnValue({ totalMonths: settlesAtMonth });
    const stakes = [
      { id: 'stake_whale', cycleIndex: 0, profileId: 'whale', amount: 990 },
      { id: 'stake_minnow', cycleIndex: 0, profileId: 'minnow', amount: 10 },
    ];
    const { prisma, updateManyMock } = makeFakePrisma({ [def.id]: stakes });

    const result = await sweepNpcCoFundSettlements(prisma as never);
    expect(result.settled).toBe(2);

    const mult = getNpcSettlementMultiplier(def.id, 0);
    const expected = computeNpcStakeSettlement(
      [{ profileId: 'whale', amount: 990 }, { profileId: 'minnow', amount: 10 }], mult,
    );
    const expectedByProfile = new Map(expected.map(e => [e.profileId, e]));

    const calls = updateManyMock.mock.calls.map(c => c[0]);
    for (const call of calls) {
      const stake = stakes.find(s => s.id === call.where.id)!;
      const exp = expectedByProfile.get(stake.profileId)!;
      expect(call.data.payout).toBe(exp.payout);
    }
  });

  it('never touches a cycle for a different program (isolation across NPC_PROGRAMS)', async () => {
    const { settlesAtMonth } = getNpcCycleWindow(def, 0);
    mockGetGlobalGameDate.mockReturnValue({ totalMonths: settlesAtMonth });
    const { prisma, updateManyMock } = makeFakePrisma({
      [def.id]: [{ id: 'stake_1', cycleIndex: 0, profileId: 'profile_a', amount: def.coFundCost }],
    });
    await sweepNpcCoFundSettlements(prisma as never);
    // Confirm only this program's findMany returned data was acted on —
    // every other NPC program's findMany was still called (sweep checks all
    // programs) but produced zero settlements since our fake returns [].
    for (const otherDef of otherDefs) {
      expect(prisma.npcProgramStake.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ npcProgramId: otherDef.id }),
      }));
    }
    expect(updateManyMock).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a concurrent-sweep race (updateMany count 0) skips the payout instead of double-crediting', async () => {
    const { settlesAtMonth } = getNpcCycleWindow(def, 0);
    mockGetGlobalGameDate.mockReturnValue({ totalMonths: settlesAtMonth });
    const stake = { id: 'stake_1', cycleIndex: 0, profileId: 'profile_a', amount: def.coFundCost };
    const { prisma, gameProfileUpdateMock, updateManyMock } = makeFakePrisma({ [def.id]: [stake] });
    updateManyMock.mockResolvedValue({ count: 0 }); // already settled by a concurrent sweep

    const result = await sweepNpcCoFundSettlements(prisma as never);
    expect(result.settled).toBe(0); // the guarded updateMany found nothing to claim — not counted as settled
    expect(gameProfileUpdateMock).not.toHaveBeenCalled(); // ...and never pays twice
    expect(mockRecordLedger).not.toHaveBeenCalled();
  });
});
