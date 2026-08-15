/**
 * Live-Service Wave LS5 — charter metric aggregation (mocked Prisma).
 * computeWeeklyContribution takes its PrismaClient as a plain parameter (no
 * module-level `@/lib/db` import), so a lightweight fake object stands in
 * for it directly — no jest.mock() wiring needed. This is the "mocked
 * prisma" coverage for the charter pledge flow: every charter type's
 * metric source query shape is exercised here.
 */
import { computeWeeklyContribution } from '../alliance-charter-metrics';
import type { PrismaClient } from '@prisma/client';

function fakePrisma(overrides: {
  gameLedgerEntry?: { moneyDelta: number }[];
  npcProgramStakeCount?: number;
  allianceEventContribution?: { score: number }[];
} = {}): PrismaClient {
  return {
    gameLedgerEntry: {
      findMany: jest.fn().mockResolvedValue(overrides.gameLedgerEntry ?? []),
    },
    npcProgramStake: {
      count: jest.fn().mockResolvedValue(overrides.npcProgramStakeCount ?? 0),
    },
    allianceEventContribution: {
      findMany: jest.fn().mockResolvedValue(overrides.allianceEventContribution ?? []),
    },
  } as unknown as PrismaClient;
}

const WEEK_START = Date.UTC(2026, 7, 10);
const WEEK_END = WEEK_START + 7 * 24 * 60 * 60 * 1000;

describe('computeWeeklyContribution — treasury_growth', () => {
  it('sums the absolute value of treasury_deposit ledger entries', async () => {
    const prisma = fakePrisma({ gameLedgerEntry: [{ moneyDelta: -5_000_000 }, { moneyDelta: -2_000_000 }] });
    const total = await computeWeeklyContribution(prisma, 'treasury_growth', 'alliance_1', 'profile_1', WEEK_START, WEEK_END);
    expect(total).toBe(7_000_000);
  });

  it('queries scoped to the member, the alliance (via refId), and the week window', async () => {
    const prisma = fakePrisma();
    await computeWeeklyContribution(prisma, 'treasury_growth', 'alliance_1', 'profile_1', WEEK_START, WEEK_END);
    expect(prisma.gameLedgerEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        profileId: 'profile_1',
        reason: 'treasury_deposit',
        refId: 'alliance_1',
        createdAt: { gte: new Date(WEEK_START), lt: new Date(WEEK_END) },
      }),
    }));
  });

  it('returns 0 when there are no deposits this week', async () => {
    const prisma = fakePrisma({ gameLedgerEntry: [] });
    const total = await computeWeeklyContribution(prisma, 'treasury_growth', 'alliance_1', 'profile_1', WEEK_START, WEEK_END);
    expect(total).toBe(0);
  });
});

describe('computeWeeklyContribution — science_cofund_count', () => {
  it('counts NpcProgramStake rows staked within the week', async () => {
    const prisma = fakePrisma({ npcProgramStakeCount: 3 });
    const total = await computeWeeklyContribution(prisma, 'science_cofund_count', 'alliance_1', 'profile_1', WEEK_START, WEEK_END);
    expect(total).toBe(3);
    expect(prisma.npcProgramStake.count).toHaveBeenCalledWith(expect.objectContaining({
      where: { profileId: 'profile_1', stakedAt: { gte: new Date(WEEK_START), lt: new Date(WEEK_END) } },
    }));
  });
});

describe('computeWeeklyContribution — event_points', () => {
  it('sums AllianceEventContribution.score scoped to the alliance and member', async () => {
    const prisma = fakePrisma({ allianceEventContribution: [{ score: 400 }, { score: 150 }] });
    const total = await computeWeeklyContribution(prisma, 'event_points', 'alliance_1', 'profile_1', WEEK_START, WEEK_END);
    expect(total).toBe(550);
  });

  it('ignores negative score rows defensively', async () => {
    const prisma = fakePrisma({ allianceEventContribution: [{ score: -100 }, { score: 200 }] });
    const total = await computeWeeklyContribution(prisma, 'event_points', 'alliance_1', 'profile_1', WEEK_START, WEEK_END);
    expect(total).toBe(200);
  });
});

describe('computeWeeklyContribution — unknown charter type', () => {
  it('returns 0 without querying anything', async () => {
    const prisma = fakePrisma();
    const total = await computeWeeklyContribution(prisma, 'not_a_real_type' as never, 'alliance_1', 'profile_1', WEEK_START, WEEK_END);
    expect(total).toBe(0);
  });
});
