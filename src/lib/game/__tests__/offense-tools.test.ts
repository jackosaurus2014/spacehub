/**
 * Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O7 + O8) — bid insurance math,
 * the sharper espionage products (defs, detection floor, pure input-
 * dependency aggregation), and the two new offense-gate techs.
 */
import { computeBidInsuranceFee, computeMarginLost, BID_INSURANCE_FRACTION } from '../contract-bidding';
import {
  ESPIONAGE_ACTIONS, executeEspionageAction, computeMonthlyInputDependency,
  type AttackerProfile, type TargetEspionageProfile, type TargetGameProfile,
} from '../espionage-system';
import { RESEARCH_MAP } from '../research-tree';
import { MARKET_MICROSTRUCTURE_TECH_ID } from '../cornering-intel';
import { GUILD_ARBITRATION_TECH_ID } from '../talent-poaching';

describe('M5 O7 — bid insurance', () => {
  it('fee is 5% of collateral, rounded', () => {
    expect(BID_INSURANCE_FRACTION).toBe(0.05);
    expect(computeBidInsuranceFee(10_000_000)).toBe(500_000);
    expect(computeBidInsuranceFee(0)).toBe(0);
    expect(computeBidInsuranceFee(-5)).toBe(0);
  });

  it('margin lost points in the direction the loser needed to move', () => {
    // Reverse (lowest wins): loser at 120 vs winner at 100 → 20 too high.
    expect(computeMarginLost('reverse', 120, 100)).toBe(20);
    // Forward (highest wins): loser at 80 vs winner at 100 → 20 too low.
    expect(computeMarginLost('forward', 80, 100)).toBe(20);
  });

  it('a loser who out-priced the winner reads margin 0 (price was not the problem)', () => {
    expect(computeMarginLost('reverse', 90, 100)).toBe(0);
    expect(computeMarginLost('forward', 110, 100)).toBe(0);
  });
});

describe('M5 O8 — sharper espionage products', () => {
  const products = ['pool_share_trend', 'input_dependency_report', 'labor_roster_report'] as const;

  it('all three exist, are priced, cooldown-gated, and research-locked', () => {
    for (const id of products) {
      const def = ESPIONAGE_ACTIONS[id];
      expect(def).toBeDefined();
      expect(def.baseCost).toBeGreaterThan(0);
      expect(def.cooldownHours).toBeGreaterThanOrEqual(24);
      expect(def.unlockRequirement).toBeTruthy();
      // Visible-to-victim 25% of the time minimum (spec verbatim).
      expect(def.minDetectionChance).toBe(0.25);
      // Info-only — reconnaissance, never target-side harm.
      expect(def.category).toBe('reconnaissance');
    }
  });

  it('the detection floor binds even against a zero-security target', () => {
    const attacker: AttackerProfile = { netWorth: 1_000_000_000, completedResearch: [] };
    const target: TargetEspionageProfile = {
      netWorth: 1_000_000_000, securityLevel: 0, heightenedAlert: false, alertExpiresAt: null, blacklist: [],
    };
    const targetGame: TargetGameProfile = {
      id: 't', companyName: 'T Corp', netWorth: 1_000_000_000, money: 0, totalEarned: 0,
      buildingCount: 0, researchCount: 0, serviceCount: 0, locationsUnlocked: 0,
      resources: {}, completedResearchList: [], buildingsData: [], activeServicesData: [],
      workforceData: null, shipsData: [],
    };
    const result = executeEspionageAction('pool_share_trend', attacker, target, targetGame);
    // Level-0 security detects at 5% normally; the M5 floor raises it to 25%.
    expect(result.detectionRate).toBeGreaterThanOrEqual(0.25);
    // Pre-M5 actions are untouched by the floor.
    const legacy = executeEspionageAction('scout', attacker, target, targetGame);
    expect(legacy.detectionRate).toBeLessThan(0.25);
  });

  it('input dependency aggregates recipes per (location, resource), skipping incomplete buildings', () => {
    const deps = computeMonthlyInputDependency([
      { definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true },
      { definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true },
      { definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: false },
      { definitionId: 'no_such_building', locationId: 'leo', isComplete: true },
    ]);
    const fuel = deps.find(d => d.resourceId === 'rocket_fuel' && d.locationId === 'earth_surface');
    expect(fuel).toBeDefined();
    // Two complete pads × 10 fuel/month each; the incomplete one contributes nothing.
    expect(fuel!.perMonth).toBe(20);
  });
});

describe('M5 — the two offense-gate techs exist in the tree', () => {
  it('market_microstructure gates the standing-demand report', () => {
    const def = RESEARCH_MAP.get(MARKET_MICROSTRUCTURE_TECH_ID);
    expect(def).toBeDefined();
    expect(def!.category).toBe('economy');
    expect(def!.baseCostMoney).toBeGreaterThan(0);
  });

  it('guild_arbitration grants the defender-side free retention', () => {
    const def = RESEARCH_MAP.get(GUILD_ARBITRATION_TECH_ID);
    expect(def).toBeDefined();
    expect(def!.category).toBe('economy');
    expect(def!.baseCostMoney).toBeGreaterThan(0);
  });
});
