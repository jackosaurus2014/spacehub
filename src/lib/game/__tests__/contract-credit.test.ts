// ─── Money desync fix (2026-09-12): verifiable contract income credit ────────
// contract-credit.ts — each completed CONTRACT_POOL id lifts the sync's money
// ceiling once, ever, by the contract's MAXIMUM plausible payout, derived
// from the same multiplier stack applyContractReward uses.

import {
  computeContractCredit,
  maxStaticContractPayout,
  readCreditedContractIds,
  CONTRACT_DEFINITION_MAP,
  tierMultForProfile,
  MAX_NEW_CONTRACT_CREDITS_PER_SYNC,
  MAX_STATIC_CONTRACT_PAYOUT_MULT,
  MAX_STATIC_CONTRACT_TIER_MULT,
  MAX_REPUTATION_CONTRACT_MULT,
} from '../contract-credit';
import { CONTRACT_POOL, STATIC_CONTRACT_TIER_MULT, applyContractReward } from '../contracts';
import { REPUTATION_THRESHOLDS } from '../reputation';
import { MAX_CONTRACT_PAY_BONUS, getWorkforceBonuses } from '../workforce';
import { WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP } from '../server-effects';
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';

const FIRST = CONTRACT_POOL[0].id;
const SECOND = CONTRACT_POOL[1].id;
const THIRD = CONTRACT_POOL[2].id;

describe('maxima are derived from the game\'s own constants', () => {
  it('tier maximum is the top of STATIC_CONTRACT_TIER_MULT', () => {
    expect(MAX_STATIC_CONTRACT_TIER_MULT).toBe(Math.max(...Object.values(STATIC_CONTRACT_TIER_MULT)));
    expect(MAX_STATIC_CONTRACT_TIER_MULT).toBeGreaterThan(1);
  });

  it('reputation maximum is the top contractRewardMultiplier on the ladder', () => {
    const top = Math.max(...REPUTATION_THRESHOLDS.map(t => t.bonuses.contractRewardMultiplier));
    expect(MAX_REPUTATION_CONTRACT_MULT).toBe(top);
    expect(top).toBeGreaterThan(1);
  });

  it('the product is tier x reputation x (1 + negotiator cap) x (1 + world-event cap)', () => {
    expect(MAX_STATIC_CONTRACT_PAYOUT_MULT).toBeCloseTo(
      MAX_STATIC_CONTRACT_TIER_MULT * MAX_REPUTATION_CONTRACT_MULT * (1 + MAX_CONTRACT_PAY_BONUS) * (1 + WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP),
      9,
    );
  });

  it('the negotiator cap really is what getWorkforceBonuses enforces', () => {
    const b = getWorkforceBonuses({ engineers: 0, scientists: 0, miners: 0, operators: 0, negotiators: 1_000, trainingLevel: 1, fatigue: 0, morale: 1 } as never);
    expect(b.contractPayBonus).toBe(MAX_CONTRACT_PAY_BONUS);
  });

  it('maxStaticContractPayout equals applyContractReward with every client-only term at its cap', () => {
    const def = CONTRACT_DEFINITION_MAP.get(FIRST)!;
    const maxed: GameState = {
      ...getNewGameState(),
      money: 0, totalEarned: 0,
      corporationTier: 7,
      reputation: 10_000_000,
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, negotiators: 1_000, trainingLevel: 1, fatigue: 0, morale: 1 } as never,
      worldEventBonuses: { contractPayoutBonus: 99, researchSpeedBonus: 0, expiresAtMs: Date.now() + 10_000_000 },
    } as GameState;
    const paid = applyContractReward(maxed, def.reward).money;
    expect(Math.abs(paid - maxStaticContractPayout(def))).toBeLessThanOrEqual(1);
  });

  it('a fresh corporation\'s actual payout never exceeds the maximum', () => {
    for (const def of CONTRACT_POOL) {
      const fresh = { ...getNewGameState(), money: 0, totalEarned: 0 } as GameState;
      expect(applyContractReward(fresh, def.reward).money).toBeLessThanOrEqual(maxStaticContractPayout(def));
      expect(applyContractReward(fresh, def.reward).money).toBeGreaterThanOrEqual(def.reward.money);
    }
  });
});

describe('computeContractCredit', () => {
  it('bounds the tier factor by the profile tier the server can vouch for', () => {
    const def = CONTRACT_DEFINITION_MAP.get(FIRST)!;
    const tier1 = computeContractCredit([FIRST], [], undefined, tierMultForProfile(1));
    const ladderTop = computeContractCredit([FIRST], []);
    expect(tier1.headroomCredit).toBe(maxStaticContractPayout(def, 1));
    expect(tier1.headroomCredit).toBeLessThan(ladderTop.headroomCredit);
    expect(tier1.headroomCredit).toBe(Math.round(def.reward.money * MAX_REPUTATION_CONTRACT_MULT * (1 + MAX_CONTRACT_PAY_BONUS) * (1 + WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP)));
    // A bogus factor above the ladder is clamped to the ladder top, never beyond.
    expect(maxStaticContractPayout(def, 999)).toBe(maxStaticContractPayout(def));
  });

  it('credits a real, previously uncredited id exactly once', () => {
    const first = computeContractCredit([FIRST], []);
    expect(first.creditedNow).toEqual([FIRST]);
    expect(first.headroomCredit).toBe(maxStaticContractPayout(CONTRACT_DEFINITION_MAP.get(FIRST)!));
    expect(first.creditedAfter).toEqual([FIRST]);

    const again = computeContractCredit([FIRST], first.creditedAfter);
    expect(again.creditedNow).toEqual([]);
    expect(again.headroomCredit).toBe(0);
    expect(again.creditedAfter).toEqual([FIRST]);
  });

  it('a duplicated id in one payload still counts once', () => {
    const r = computeContractCredit([FIRST, FIRST, FIRST], []);
    expect(r.creditedNow).toEqual([FIRST]);
  });

  it('ignores ids that are not CONTRACT_POOL definitions', () => {
    const r = computeContractCredit(['c_totally_fake', 'r_some_research', FIRST], []);
    expect(r.unknownIds).toEqual(['c_totally_fake', 'r_some_research']);
    expect(r.creditedNow).toEqual([FIRST]);
    expect(r.creditedAfter).toEqual([FIRST]);
    expect(r.headroomCredit).toBe(maxStaticContractPayout(CONTRACT_DEFINITION_MAP.get(FIRST)!));
  });

  it('caps new credits per sync and defers the rest (still uncredited, so a later sync picks them up)', () => {
    const r = computeContractCredit([FIRST, SECOND, THIRD], [], 2);
    expect(r.creditedNow).toEqual([FIRST, SECOND]);
    expect(r.deferred).toEqual([THIRD]);
    expect(r.creditedAfter).toEqual([FIRST, SECOND]);
    expect(r.headroomCredit).toBe(
      maxStaticContractPayout(CONTRACT_DEFINITION_MAP.get(FIRST)!) + maxStaticContractPayout(CONTRACT_DEFINITION_MAP.get(SECOND)!),
    );
    const next = computeContractCredit([FIRST, SECOND, THIRD], r.creditedAfter, 2);
    expect(next.creditedNow).toEqual([THIRD]);
    expect(next.deferred).toEqual([]);
  });

  it('the default cap is a sane number and above the pool size (honest clients never hit it)', () => {
    expect(MAX_NEW_CONTRACT_CREDITS_PER_SYNC).toBe(20);
    expect(CONTRACT_POOL.length).toBeLessThanOrEqual(MAX_NEW_CONTRACT_CREDITS_PER_SYNC);
  });

  it('lifetime abuse bound: every id in the pool credited at once is the finite sum of maxima', () => {
    const r = computeContractCredit(CONTRACT_POOL.map(c => c.id), []);
    expect(r.headroomCredit).toBe(CONTRACT_POOL.reduce((s, c) => s + maxStaticContractPayout(c), 0));
    expect(computeContractCredit(CONTRACT_POOL.map(c => c.id), r.creditedAfter).headroomCredit).toBe(0);
  });
});

describe('readCreditedContractIds', () => {
  it('tolerates a missing / malformed column', () => {
    expect(readCreditedContractIds(undefined)).toEqual([]);
    expect(readCreditedContractIds(null)).toEqual([]);
    expect(readCreditedContractIds('nope')).toEqual([]);
    expect(readCreditedContractIds([FIRST, 3, null, FIRST, SECOND])).toEqual([FIRST, SECOND]);
  });
});
