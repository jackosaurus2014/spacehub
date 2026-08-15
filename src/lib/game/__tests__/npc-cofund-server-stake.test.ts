// ─── Live-Service Wave LS5 part 2 — NPC co-fund server-stake math ──────────
// docs/LIVE_SERVICE_2026-08.md §LS5. Pure functions the science/co-fund
// route + the settlement sweep depend on: cycle window math (unchanged from
// the pre-LS5 client-simulated cycle timing — only who pays/gets paid
// moved), and pro-rata settlement with the small-contributor bonus shape.

import {
  getNpcCycleWindow, getNpcCycleIndexForMonth, computeNpcStakeSettlement,
  getNpcSettlementMultiplier, NPC_PROGRAMS, NPC_STAKE_SMALL_SHARE_THRESHOLD,
  NPC_STAKE_SMALL_SHARE_BONUS,
} from '../science-missions';

const def = NPC_PROGRAMS[0]; // npc_dominion_sentinels: offsetMonths 0, cycleMonths 24

describe('getNpcCycleWindow', () => {
  it('cycle 0 starts at the program offset and settles one full cycle later', () => {
    const w = getNpcCycleWindow(def, 0);
    expect(w.cycleStartMonth).toBe(def.offsetMonths);
    expect(w.settlesAtMonth).toBe(def.offsetMonths + def.cycleMonths);
  });

  it('cycle N starts N cycles after the offset', () => {
    const w = getNpcCycleWindow(def, 3);
    expect(w.cycleStartMonth).toBe(def.offsetMonths + 3 * def.cycleMonths);
  });

  it('never produces a negative cycleStartMonth for a negative cycle index', () => {
    const w = getNpcCycleWindow(def, -5);
    expect(w.cycleStartMonth).toBe(def.offsetMonths);
  });
});

describe('getNpcCycleIndexForMonth', () => {
  it('agrees with getNpcCycleWindow round-trip: the month a cycle starts maps back to that cycle', () => {
    for (let cycle = 0; cycle < 5; cycle++) {
      const { cycleStartMonth } = getNpcCycleWindow(def, cycle);
      expect(getNpcCycleIndexForMonth(def, cycleStartMonth)).toBe(cycle);
    }
  });

  it('is monotonic non-decreasing in month index', () => {
    const a = getNpcCycleIndexForMonth(def, 10);
    const b = getNpcCycleIndexForMonth(def, 40);
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it('never goes negative for a month before the program offset', () => {
    expect(getNpcCycleIndexForMonth(def, def.offsetMonths - 100)).toBe(0);
  });
});

describe('computeNpcStakeSettlement — determinism + pro-rata + small-contributor bonus', () => {
  it('is empty for an empty stake list', () => {
    expect(computeNpcStakeSettlement([], 1.2)).toEqual([]);
  });

  it('is empty when total staked is zero (no divide-by-zero payout)', () => {
    expect(computeNpcStakeSettlement([{ profileId: 'a', amount: 0 }], 1.2)).toEqual([]);
  });

  it('a single staker with no competing pool pays out staked * multiplier (small-contributor bonus does not apply — they ARE the whole pool)', () => {
    const result = computeNpcStakeSettlement([{ profileId: 'solo', amount: 800_000_000 }], 1.5);
    expect(result).toHaveLength(1);
    expect(result[0].payout).toBe(Math.round(800_000_000 * 1.5));
    expect(result[0].smallContributorBonus).toBe(false);
  });

  it('deterministic: identical inputs always produce identical outputs', () => {
    const stakes = [{ profileId: 'a', amount: 800_000_000 }, { profileId: 'b', amount: 200_000_000 }];
    const r1 = computeNpcStakeSettlement(stakes, 1.3);
    const r2 = computeNpcStakeSettlement(stakes, 1.3);
    expect(r1).toEqual(r2);
  });

  it('flags a staker below the small-share threshold and boosts their multiplier', () => {
    // Total pool 1,000; staker B is 1% of the pool — well under the 15% threshold.
    const stakes = [{ profileId: 'whale', amount: 990 }, { profileId: 'minnow', amount: 10 }];
    const result = computeNpcStakeSettlement(stakes, 1.0);
    const whale = result.find(r => r.profileId === 'whale')!;
    const minnow = result.find(r => r.profileId === 'minnow')!;
    expect(whale.smallContributorBonus).toBe(false);
    expect(minnow.smallContributorBonus).toBe(true);
    expect(minnow.payout).toBe(Math.round(10 * 1.0 * NPC_STAKE_SMALL_SHARE_BONUS));
    expect(whale.payout).toBe(Math.round(990 * 1.0));
  });

  it('every staker above the threshold gets the plain settlement multiplier, no bonus', () => {
    // Three equal stakers — each is 1/3 of the pool, above the 15% threshold.
    const stakes = [{ profileId: 'a', amount: 100 }, { profileId: 'b', amount: 100 }, { profileId: 'c', amount: 100 }];
    const result = computeNpcStakeSettlement(stakes, 1.2);
    for (const r of result) {
      expect(r.smallContributorBonus).toBe(false);
      expect(r.payout).toBe(Math.round(100 * 1.2));
    }
  });

  it('threshold boundary: a share exactly at NPC_STAKE_SMALL_SHARE_THRESHOLD does not count as small (strict <)', () => {
    // 150 out of 1000 total = exactly 15%.
    const stakes = [{ profileId: 'boundary', amount: 150 }, { profileId: 'rest', amount: 850 }];
    const result = computeNpcStakeSettlement(stakes, 1.0);
    const boundary = result.find(r => r.profileId === 'boundary')!;
    expect(150 / 1000).toBeCloseTo(NPC_STAKE_SMALL_SHARE_THRESHOLD, 10);
    expect(boundary.smallContributorBonus).toBe(false);
  });

  it('payout is a whole number of cents-equivalent (rounded), never fractional', () => {
    const stakes = [{ profileId: 'a', amount: 333 }, { profileId: 'b', amount: 667 }];
    const result = computeNpcStakeSettlement(stakes, 1.111);
    for (const r of result) {
      expect(Number.isInteger(r.payout)).toBe(true);
    }
  });
});

describe('getNpcSettlementMultiplier — unchanged by the LS5 server-stake conversion', () => {
  it('is deterministic for a given (program, cycle) pair', () => {
    const m1 = getNpcSettlementMultiplier(def.id, 2);
    const m2 = getNpcSettlementMultiplier(def.id, 2);
    expect(m1).toBe(m2);
  });

  it('falls within the program-defined payout band', () => {
    const m = getNpcSettlementMultiplier(def.id, 7);
    expect(m).toBeGreaterThanOrEqual(def.payoutMultRange[0]);
    expect(m).toBeLessThanOrEqual(def.payoutMultRange[1]);
  });

  it('different cycles roll different (but still deterministic) multipliers in general', () => {
    const multipliers = [0, 1, 2, 3, 4].map(c => getNpcSettlementMultiplier(def.id, c));
    const uniqueCount = new Set(multipliers.map(m => m.toFixed(6))).size;
    expect(uniqueCount).toBeGreaterThan(1); // not degenerately constant
  });
});
