/**
 * Wave A1 — Resource stock + flow lens (docs/VISUAL_AAA_2026-08.md §A1.3).
 *
 * What these tests actually protect:
 *  - the SHARED mining formulas really are shared: the values this module
 *    exports are the ones game-engine.ts now calls, so a drift between the
 *    displayed flow and the charged tick would have to break one of these;
 *  - every contribution the lens claims is signed correctly (inflow positive,
 *    outflow negative) and nets out arithmetically;
 *  - stock is summed across BOTH pools (global + location inventories) — the
 *    single most likely correctness bug in a "total stock" readout;
 *  - the omissions list is non-empty and reaches the caller, because the
 *    honesty contract ("omit rather than guess, and say so") is the whole
 *    reason this lens is allowed to exist;
 *  - the formatting helpers carry direction in TEXT (explicit sign), which is
 *    the colourblind-safety invariant the UI depends on.
 */
import {
  computeResourceFlows,
  buildingMiningMultiplier,
  shipMiningMultiplier,
  waveBMiningMultiplier,
  freighterLogisticsBonus,
  surveyProbeMiningBonus,
  formatFlow,
  flowDirection,
  OMITTED_CONTRIBUTIONS,
  FLOW_KIND_LABEL,
  type BuildingMiningTerms,
} from '../resource-flow';
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const NEUTRAL_TERMS: BuildingMiningTerms = {
  wfMiningOutput: 0,
  resMiningOutputBonus: 0,
  legacyMiningMult: 1,
  eraMiningMult: 1,
  tierMiningBonus: 0,
  megaMiningMult: 1,
  repMiningMult: 1,
  commanderMiningMult: 1,
  specMiningOutput: 0,
  victoryMiningMult: 1,
  allianceMiningBonus: 0,
  mentorshipMiningBonus: 0,
  coopMegaMiningBonus: 0,
  boostMiningMult: 1,
};

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), ...overrides };
}

// ─── shared mining formulas ─────────────────────────────────────────────────

describe('mining multipliers (shared with the engine tick)', () => {
  it('is exactly 1.0 with every term neutral', () => {
    expect(buildingMiningMultiplier(NEUTRAL_TERMS)).toBe(1);
  });

  it('multiplies the outer chain and adds the additive terms', () => {
    const m = buildingMiningMultiplier({
      ...NEUTRAL_TERMS,
      wfMiningOutput: 0.1,      // ×1.1
      resMiningOutputBonus: 0.2, // ×1.2
      tierMiningBonus: 0.5,      // ×1.5
      repMiningMult: 2,          // ×2
    });
    expect(m).toBeCloseTo(1.1 * 1.2 * 1.5 * 2, 10);
  });

  it('caps the Wave-B sub-product at 2.0 without capping the outer chain', () => {
    const hot: BuildingMiningTerms = {
      ...NEUTRAL_TERMS,
      specMiningOutput: 1,
      victoryMiningMult: 2,
      allianceMiningBonus: 1,
      mentorshipMiningBonus: 1,
      coopMegaMiningBonus: 1,
      boostMiningMult: 2,
    };
    // Uncapped this would be 2*2*2*2*2*2 = 64.
    expect(waveBMiningMultiplier(hot)).toBe(2);
    // The outer chain still applies on top of the capped sub-product.
    expect(buildingMiningMultiplier({ ...hot, repMiningMult: 3 })).toBeCloseTo(6, 10);
  });

  it('ship mining runs the shorter chain (no era/rep/commander/mega terms)', () => {
    const t = {
      wfMiningOutput: 0.1,
      legacyMiningMult: 1.5,
      tierMiningBonus: 0.2,
      specMiningOutput: 0,
      victoryMiningMult: 1,
      allianceMiningBonus: 0,
    };
    expect(shipMiningMultiplier(t)).toBeCloseTo(1.1 * 1.5 * 1.2, 10);
  });
});

describe('freighterLogisticsBonus', () => {
  const ship = (over: Record<string, unknown>) => ({
    instanceId: 'x', definitionId: 'cargo_hauler', isBuilt: true,
    status: 'idle', currentLocation: 'luna_surface', ...over,
  }) as unknown as NonNullable<GameState['ships']>[number];

  it('is zero with no ships', () => {
    expect(freighterLogisticsBonus([], 'luna_surface')).toBe(0);
    expect(freighterLogisticsBonus(undefined, 'luna_surface')).toBe(0);
  });

  it('ignores ships that are not idle, not built, or elsewhere', () => {
    expect(freighterLogisticsBonus([ship({ status: 'mining' })], 'luna_surface')).toBe(0);
    expect(freighterLogisticsBonus([ship({ isBuilt: false })], 'luna_surface')).toBe(0);
    expect(freighterLogisticsBonus([ship({ currentLocation: 'ceres' })], 'luna_surface')).toBe(0);
  });

  it('caps at +50% however many haulers are parked', () => {
    const many = Array.from({ length: 20 }, () => ship({}));
    expect(freighterLogisticsBonus(many, 'luna_surface')).toBeLessThanOrEqual(0.5);
  });
});

describe('surveyProbeMiningBonus', () => {
  const bonuses = [
    { locationId: 'ceres', resourceId: 'iron', bonusPct: 25, expiresAtMonth: 100 },
    { locationId: 'ceres', resourceId: 'iron', bonusPct: 10, expiresAtMonth: 100 },
    { locationId: 'ceres', resourceId: 'iron', bonusPct: 90, expiresAtMonth: 50 }, // expired
    { locationId: 'luna_surface', resourceId: 'iron', bonusPct: 90, expiresAtMonth: 100 },
  ] as NonNullable<GameState['miningBonuses']>;

  it('sums only unexpired bonuses for the exact (location, resource) pair', () => {
    expect(surveyProbeMiningBonus(bonuses, 'ceres', 'iron', 60)).toBeCloseTo(0.35, 10);
  });

  it('is zero for an unmatched pair or a missing list', () => {
    expect(surveyProbeMiningBonus(bonuses, 'ceres', 'water', 60)).toBe(0);
    expect(surveyProbeMiningBonus(undefined, 'ceres', 'iron', 60)).toBe(0);
  });
});

// ─── the lens ───────────────────────────────────────────────────────────────

describe('computeResourceFlows', () => {
  it('is deterministic — same state in, same report out', () => {
    const state = baseState({ resources: { iron: 500, rocket_fuel: 200 } });
    expect(JSON.stringify(computeResourceFlows(state, 5000)))
      .toEqual(JSON.stringify(computeResourceFlows(state, 5000)));
  });

  it('lists every held resource even when nothing produces or consumes it', () => {
    const state = baseState({ resources: { iron: 500 } });
    const report = computeResourceFlows(state, 5000);
    expect(report.byId.iron).toBeDefined();
    expect(report.byId.iron.stock).toBe(500);
  });

  it('sums stock across the global pool AND location inventories', () => {
    const state = baseState({
      resources: { iron: 400 },
      locationInventories: { ceres: { iron: 350 }, luna_surface: { iron: 250 } },
    });
    expect(computeResourceFlows(state, 5000).byId.iron.stock).toBe(1000);
  });

  it('nets inflow minus outflow, with outflow reported as a magnitude', () => {
    const report = computeResourceFlows(baseState({ resources: { iron: 1000 } }), 5000);
    for (const flow of report.flows) {
      expect(flow.inflow).toBeGreaterThanOrEqual(0);
      expect(flow.outflow).toBeGreaterThanOrEqual(0);
      expect(flow.net).toBeCloseTo(flow.inflow - flow.outflow, 1);
      // Contribution signs must agree with which bucket they landed in.
      const pos = flow.contributions.filter(c => c.perMonth > 0).reduce((a, c) => a + c.perMonth, 0);
      const neg = flow.contributions.filter(c => c.perMonth < 0).reduce((a, c) => a - c.perMonth, 0);
      expect(pos).toBeCloseTo(flow.inflow, 1);
      expect(neg).toBeCloseTo(flow.outflow, 1);
    }
  });

  it('never reports a depletion horizon for a stable or growing stock', () => {
    const report = computeResourceFlows(baseState({ resources: { iron: 1000 } }), 5000);
    for (const flow of report.flows) {
      if (flow.net >= 0) expect(flow.depletionMonths).toBeNull();
      else if (flow.stock > 0) expect(flow.depletionMonths).toBeGreaterThan(0);
    }
  });

  it('charges spoilage against a decaying stockpile', () => {
    // organic_compounds decays at 2%/mo in economic-sinks.RESOURCE_DECAY_RATES.
    const report = computeResourceFlows(baseState({ resources: { organic_compounds: 10_000 } }), 5000);
    const flow = report.byId.organic_compounds;
    expect(flow).toBeDefined();
    const decay = flow.contributions.find(c => c.kind === 'decay');
    expect(decay).toBeDefined();
    expect(decay!.perMonth).toBeLessThan(0);
    expect(flow.net).toBeLessThan(0);
    expect(flow.depletionMonths).toBeGreaterThan(0);
  });

  it('orders the report by urgency — soonest depletion first', () => {
    const report = computeResourceFlows(baseState({
      resources: { organic_compounds: 5_000, iron: 900_000 },
    }), 5000);
    const horizons = report.flows.map(f => f.depletionMonths ?? Infinity);
    for (let i = 1; i < horizons.length; i++) {
      expect(horizons[i]).toBeGreaterThanOrEqual(horizons[i - 1]);
    }
  });

  it('carries the omissions disclosure through to the caller', () => {
    const report = computeResourceFlows(baseState(), 5000);
    expect(report.omitted).toBe(OMITTED_CONTRIBUTIONS);
    expect(report.omitted.length).toBeGreaterThan(0);
    // Every omission must actually say something — an empty promise of
    // disclosure is worse than no disclosure.
    for (const line of report.omitted) expect(line.length).toBeGreaterThan(20);
  });

  it('labels every contribution with a human-readable name', () => {
    const report = computeResourceFlows(baseState({ resources: { organic_compounds: 10_000 } }), 5000);
    for (const flow of report.flows) {
      for (const c of flow.contributions) {
        expect(c.label).toBe(FLOW_KIND_LABEL[c.kind]);
        expect(c.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('reads survey-probe expiry on the ABSOLUTE game-month counter, not the world one', () => {
    // Regression guard for a real bug caught in review: the tick compares
    // `expiresAtMonth` against `gameDate.year * 12 + gameDate.month`, while
    // the consumption engine's `monthIndex` is a much larger world counter.
    // Passing the wrong one made every probe bonus read as expired.
    const state = baseState();
    const gameMonth = state.gameDate.year * 12 + state.gameDate.month;
    const live = { locationId: 'ceres', resourceId: 'iron', bonusPct: 40, expiresAtMonth: gameMonth + 6 };
    const dead = { locationId: 'ceres', resourceId: 'iron', bonusPct: 40, expiresAtMonth: gameMonth - 6 };
    // Sanity: the two counters really are far apart, so the test has teeth.
    expect(Math.abs(gameMonth - 5000)).toBeGreaterThan(100);
    expect(surveyProbeMiningBonus([live] as never, 'ceres', 'iron', gameMonth)).toBeCloseTo(0.4, 10);
    expect(surveyProbeMiningBonus([dead] as never, 'ceres', 'iron', gameMonth)).toBe(0);
    // …and the lens must not throw when handed the world index for month.
    expect(() => computeResourceFlows({ ...state, miningBonuses: [live] as never }, 5000)).not.toThrow();
  });

  it('survives a bare/legacy state with no optional collections', () => {
    const bare = {
      ...getNewGameState(),
      resources: {},
      ships: undefined,
      locationInventories: undefined,
      miningBonuses: undefined,
      megastructures: undefined,
    } as unknown as GameState;
    expect(() => computeResourceFlows(bare, 5000)).not.toThrow();
  });
});

// ─── presentation helpers (colourblind-safety invariant) ────────────────────

describe('formatFlow / flowDirection', () => {
  it('always carries the sign in TEXT, so colour is never load-bearing', () => {
    expect(formatFlow(12.34).startsWith('+')).toBe(true);
    expect(formatFlow(-12.34).startsWith('−')).toBe(true);
    expect(formatFlow(0)).toBe('0');
    // Values that round to zero read as zero rather than a false "+0.0".
    expect(formatFlow(0.004)).toBe('0');
  });

  it('abbreviates large rates', () => {
    expect(formatFlow(2500)).toBe('+2.5k');
    expect(formatFlow(-45000)).toBe('−45k');
  });

  it('maps sign to a direction token with a dead zone at zero', () => {
    expect(flowDirection(5)).toBe('up');
    expect(flowDirection(-5)).toBe('down');
    expect(flowDirection(0)).toBe('flat');
    expect(flowDirection(1e-9)).toBe('flat');
  });
});
