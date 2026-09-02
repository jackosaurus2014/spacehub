/**
 * GAME_DESIGN_REVIEW_2026-09 §2 row 9 — static contract ladder keeps its
 * authored rewards; corporation tier 4+ scales the cash half by
 * STATIC_CONTRACT_TIER_MULT (×2.2 per tier step, measured T3→T4 in the
 * BALANCE.md Pass 5 decade tables, extrapolated above T4).
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  applyContractReward,
  getStaticContractTierMultiplier,
  STATIC_CONTRACT_TIER_MULT,
  CONTRACT_POOL,
} from '../contracts';

function state(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), reputation: 0, workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 }, worldEventBonuses: null, ...overrides } as GameState;
}

describe('static contract tier multiplier (row 9)', () => {
  it('is ×1 through T3 (the authored ladder is untouched below T4)', () => {
    expect(getStaticContractTierMultiplier(1)).toBe(1);
    expect(getStaticContractTierMultiplier(2)).toBe(1);
    expect(getStaticContractTierMultiplier(3)).toBe(1);
    expect(getStaticContractTierMultiplier(undefined)).toBe(1);
  });

  it('T4 is the measured ×2.2 and each further tier compounds the same step', () => {
    expect(STATIC_CONTRACT_TIER_MULT[4]).toBeCloseTo(2.2, 5);
    expect(STATIC_CONTRACT_TIER_MULT[5]).toBeCloseTo(2.2 ** 2, 0);
    expect(STATIC_CONTRACT_TIER_MULT[6]).toBeCloseTo(2.2 ** 3, 0);
    expect(STATIC_CONTRACT_TIER_MULT[7]).toBeCloseTo(2.2 ** 4, 0);
    for (let t = 2; t <= 7; t++) expect(STATIC_CONTRACT_TIER_MULT[t]).toBeGreaterThanOrEqual(STATIC_CONTRACT_TIER_MULT[t - 1]);
  });

  it('applyContractReward scales cash by tier but never resources', () => {
    const reward = { money: 1_000_000_000, resources: { titanium: 50 } };
    const t3 = applyContractReward(state({ corporationTier: 3, money: 0, totalEarned: 0 }), reward);
    const t4 = applyContractReward(state({ corporationTier: 4, money: 0, totalEarned: 0 }), reward);
    const t7 = applyContractReward(state({ corporationTier: 7, money: 0, totalEarned: 0 }), reward);
    expect(t3.money).toBe(1_000_000_000);
    expect(t4.money).toBe(2_200_000_000);
    expect(t7.money).toBe(23_400_000_000);
    expect(t4.totalEarned).toBe(2_200_000_000);
    expect(t4.resources.titanium).toBe(t3.resources.titanium);
  });

  it('ladder itself is unchanged: $50M → $2B', () => {
    const cash = CONTRACT_POOL.map(c => c.reward.money);
    expect(Math.min(...cash)).toBe(50_000_000);
    expect(Math.max(...cash)).toBe(2_000_000_000);
    expect(CONTRACT_POOL.length).toBeGreaterThanOrEqual(16);
  });
});
