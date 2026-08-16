/**
 * @jest-environment node
 */
// Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7): assorted small-surface wiring
// checks that don't warrant their own file — NPC-drive contract type
// isolation, real zone-tagged contractIp, and mega-project permanentBonus
// aggregation/clamping.

import { CONTRACT_TYPES, generateBiddingContracts } from '../contract-bidding';
import { calculateInfluenceFromActivity } from '../zone-influence';
import { getMegaProjectBonuses } from '../mega-projects';
import {
  clampMegaProjectBonuses,
  MEGA_PROJECT_REVENUE_BONUS_CAP,
  MEGA_PROJECT_MINING_BONUS_CAP,
  MEGA_PROJECT_RESEARCH_BONUS_CAP,
} from '../server-effects';

describe('npc_procurement_drive is never picked by the player-facing generator', () => {
  it('CONTRACT_TYPES marks it playerFacing: false', () => {
    expect(CONTRACT_TYPES.npc_procurement_drive.playerFacing).toBe(false);
  });

  it('generateBiddingContracts never returns an npc_procurement_drive contract across many runs', () => {
    for (let i = 0; i < 25; i++) {
      const contracts = generateBiddingContracts(0, 100);
      for (const c of contracts) {
        expect(c.contractType).not.toBe('npc_procurement_drive');
      }
    }
  });
});

describe('calculateInfluenceFromActivity — real zone-tagged contractIp (E7 §5 item 1)', () => {
  it('uses the real per-zone count when supplied, ignoring the fabricated estimate entirely', () => {
    const withReal = calculateInfluenceFromActivity([], [], [], [], 'zone_leo', { regular: 4, competitive: 1 });
    // CONTRACT_IP_REGULAR=5, CONTRAT_IP_COMPETITIVE=15 per zone-influence.ts
    expect(withReal.contractIp).toBe(4 * 5 + 1 * 15);
  });

  it('falls back to the pre-E7 estimate when realZoneContracts is omitted (backward compatible)', () => {
    const buildings = [{ definitionId: 'launch_pad_1', locationId: 'earth_surface', isComplete: true, upgradeLevel: 0 }] as never;
    const withEstimate = calculateInfluenceFromActivity(buildings, [], [], ['c1', 'c2', 'c3', 'c4', 'c5'], 'zone_leo');
    // Old heuristic: ceil(5 * 0.2) = 1 contract * CONTRACT_IP_REGULAR(5) = 5
    expect(withEstimate.contractIp).toBe(5);
  });

  it('a zero real count yields zero contractIp even with completedContracts populated', () => {
    const result = calculateInfluenceFromActivity([], [], [], ['c1', 'c2'], 'zone_leo', { regular: 0, competitive: 0 });
    expect(result.contractIp).toBe(0);
  });
});

describe('getMegaProjectBonuses — permanentBonus aggregation (audit §1d, finally applied)', () => {
  it('a single completed project contributes its exact baseValue', () => {
    const bonuses = getMegaProjectBonuses(['space_elevator']); // -15% launch cost
    expect(bonuses.launchCostReduction).toBeCloseTo(0.15, 6);
    expect(bonuses.revenueBonus).toBe(0);
    expect(bonuses.miningBonus).toBe(0);
    expect(bonuses.researchBonus).toBe(0);
  });

  it('multiple completed projects stack additively before clamping', () => {
    const bonuses = getMegaProjectBonuses(['generation_ship', 'dyson_sphere']); // +10% revenue, +25% mining
    expect(bonuses.revenueBonus).toBeCloseTo(0.10, 6);
    expect(bonuses.miningBonus).toBeCloseTo(0.25, 6);
  });

  it('an unknown/uncompleted project type contributes nothing', () => {
    const bonuses = getMegaProjectBonuses(['not_a_real_project']);
    expect(bonuses).toEqual({ revenueBonus: 0, miningBonus: 0, researchBonus: 0, launchCostReduction: 0 });
  });

  it('no completed projects -> all zero', () => {
    expect(getMegaProjectBonuses([])).toEqual({ revenueBonus: 0, miningBonus: 0, researchBonus: 0, launchCostReduction: 0 });
  });
});

describe('clampMegaProjectBonuses — safety ceiling against a bugged aggregate', () => {
  it('clamps each field to its documented cap', () => {
    const clamped = clampMegaProjectBonuses({
      revenueBonus: 99, miningBonus: 99, researchBonus: 99, launchCostReduction: 99,
    });
    expect(clamped!.revenueBonus).toBe(MEGA_PROJECT_REVENUE_BONUS_CAP);
    expect(clamped!.miningBonus).toBe(MEGA_PROJECT_MINING_BONUS_CAP);
    expect(clamped!.researchBonus).toBe(MEGA_PROJECT_RESEARCH_BONUS_CAP);
  });

  it('null/undefined passes through as null (no bonus, matches pre-E7 behavior)', () => {
    expect(clampMegaProjectBonuses(null)).toBeNull();
    expect(clampMegaProjectBonuses(undefined)).toBeNull();
  });

  it('never produces a negative bonus from garbage input', () => {
    const clamped = clampMegaProjectBonuses({
      revenueBonus: -5, miningBonus: NaN, researchBonus: Infinity, launchCostReduction: -1,
    } as never);
    expect(clamped!.revenueBonus).toBeGreaterThanOrEqual(0);
    expect(clamped!.miningBonus).toBeGreaterThanOrEqual(0);
    expect(clamped!.researchBonus).toBeGreaterThanOrEqual(0);
    expect(clamped!.launchCostReduction).toBeGreaterThanOrEqual(0);
  });
});
