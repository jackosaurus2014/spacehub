/**
 * @jest-environment node
 */
// ─── Interstellar Expedition Engine tests (Wave 10, Phase 1) ────────────────
// Covers: plan/launch validation + cost quoting, travel + arrival + return
// lifecycle, hazard determinism (seeded), insured vs. uninsured total loss,
// colony establishment + production + upgrades, trade-route shipments, and
// V13 save migration.

import type { GameState, InterstellarColonyState } from '../types';
import {
  GAME_MONTHS_PER_LY,
  EXPLORE_DURATION_MONTHS,
  SUPPLIES_COST_PER_MONTH,
  FUEL_PROCUREMENT_PREMIUM,
  INSURANCE_PAYOUT_RATE,
  COLONY_FOUNDING_COST,
  COLONY_STARTING_POPULATION,
  COLONY_POP_CAP_PER_LEVEL,
  COLONY_UPGRADE_MONTHS_PER_LEVEL,
  TRADE_ROUTE_SETUP_COST,
  getTotalGameMonths,
  getColonyUpgradeCost,
  planExpedition,
  launchExpedition,
  processExpeditionTick,
  establishColony,
  upgradeColony,
  establishTradeRoute,
  setTradeRouteStatus,
  getExpeditionCapableShips,
  getExpeditionProgress,
} from '../expeditions';
import { INTERSTELLAR_SYSTEM_MAP } from '../interstellar';
import { STARTING_YEAR, SAVE_KEY } from '../constants';
import { getNewGameState, loadGame } from '../save-load';

// ─── Helpers ────────────────────────────────────────────────────────────────

function monthToDate(totalMonths: number): { year: number; month: number } {
  return {
    year: STARTING_YEAR + Math.floor(totalMonths / 12),
    month: (totalMonths % 12) + 1,
  };
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: 0,
    lastTickAt: 0,
    money: 1_000_000_000_000, // $1T — end-game scale (corp tier 5+ territory)
    totalEarned: 1_000_000_000_000,
    totalSpent: 0,
    gameDate: { year: STARTING_YEAR, month: 1 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: ['jump_drive'],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    workforce: { engineers: 30, scientists: 30, miners: 10, operators: 10 },
    ships: [{
      instanceId: 'explorer-1',
      definitionId: 'starfarer_explorer',
      name: 'ISV Wanderer-2',
      status: 'idle',
      currentLocation: 'earth_surface',
      isBuilt: true,
    }],
    expeditions: [],
    interstellarColonies: [],
    interstellarTradeRoutes: [],
    ...overrides,
  };
}

function withArk(overrides: Partial<GameState> = {}): GameState {
  return baseState({
    completedResearch: ['jump_drive', 'interstellar_colonization'],
    ships: [{
      instanceId: 'ark-1',
      definitionId: 'colony_ark',
      name: 'ISV Generation',
      status: 'idle',
      currentLocation: 'earth_surface',
      isBuilt: true,
    }],
    workforce: { engineers: 40, scientists: 40, miners: 10, operators: 10 },
    ...overrides,
  });
}

/** Set the game date to an absolute month index and run the tick. */
function tickAtMonth(state: GameState, totalMonths: number, now = 1_000_000): GameState {
  return processExpeditionTick({ ...state, gameDate: monthToDate(totalMonths) }, now);
}

const PROXIMA = INTERSTELLAR_SYSTEM_MAP.get('proxima_centauri')!;
const PROXIMA_OUTBOUND = Math.ceil(PROXIMA.distanceLy * GAME_MONTHS_PER_LY);

// ─── Plan: validation + cost quote ──────────────────────────────────────────

describe('planExpedition — validation', () => {
  it('rejects unknown systems', () => {
    const res = planExpedition(baseState(), {
      targetSystemId: 'nope', shipInstanceId: 'explorer-1', insured: false, extraShielding: false,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('unknown_system');
  });

  it('rejects when jump prerequisites are missing (via getJumpPrerequisites)', () => {
    const res = planExpedition(baseState({ completedResearch: [] }), {
      targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('missing_prerequisites');
      expect(res.missingPrerequisites).toContain('jump_drive');
    }
  });

  it('rejects non-expedition-capable hulls, busy ships, and unknown ships', () => {
    const state = baseState({
      ships: [
        { instanceId: 'drone-1', definitionId: 'mining_drone', name: 'D', status: 'idle', currentLocation: 'leo', isBuilt: true },
        { instanceId: 'explorer-1', definitionId: 'starfarer_explorer', name: 'E', status: 'mining', currentLocation: 'leo', isBuilt: true },
      ],
    });
    const wrongHull = planExpedition(state, { targetSystemId: 'proxima_centauri', shipInstanceId: 'drone-1', insured: false, extraShielding: false });
    expect(!wrongHull.ok && wrongHull.reason).toBe('ship_not_expedition_capable');
    const busy = planExpedition(state, { targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false });
    expect(!busy.ok && busy.reason).toBe('ship_busy');
    const missing = planExpedition(state, { targetSystemId: 'proxima_centauri', shipInstanceId: 'ghost', insured: false, extraShielding: false });
    expect(!missing.ok && missing.reason).toBe('ship_not_found');
  });

  it('rejects when the workforce cannot supply the crew', () => {
    const res = planExpedition(baseState({ workforce: { engineers: 2, scientists: 2, miners: 0, operators: 0 } }), {
      targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false,
    });
    expect(!res.ok && res.reason).toBe('insufficient_crew');
  });

  it('rejects when funds are insufficient', () => {
    const res = planExpedition(baseState({ money: 1_000_000 }), {
      targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false,
    });
    expect(!res.ok && res.reason).toBe('insufficient_funds');
  });

  it('quotes round-trip fuel + supplies for an explorer, at the broker premium', () => {
    const res = planExpedition(baseState(), {
      targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.outboundMonths).toBe(PROXIMA_OUTBOUND);
      expect(res.totalPlannedMonths).toBe(PROXIMA_OUTBOUND * 2 + EXPLORE_DURATION_MONTHS);
      // Explorers buy fuel for both jumps.
      expect(res.costs.fuelUnitsRequired).toBe(PROXIMA.jumpFuelRequired * 2);
      expect(res.costs.fuelPurchaseCost).toBe(Math.round(PROXIMA.jumpFuelRequired * 2 * 5_000_000 * FUEL_PROCUREMENT_PREMIUM));
      expect(res.costs.suppliesCost).toBe(res.totalPlannedMonths * SUPPLIES_COST_PER_MONTH);
      expect(res.costs.insurancePremium).toBe(0);
    }
  });

  it('draws exotic fuel from inventory first, reducing the purchase cost', () => {
    const res = planExpedition(baseState({ resources: { exotic_fuel: 400 } }), {
      targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.costs.fuelFromInventory).toBe(400);
      expect(res.costs.fuelUnitsPurchased).toBe(PROXIMA.jumpFuelRequired * 2 - 400);
    }
  });

  it('quotes one-way fuel for a colony ark (permanent commitment)', () => {
    const res = planExpedition(withArk(), {
      targetSystemId: 'proxima_centauri', shipInstanceId: 'ark-1', insured: false, extraShielding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.isColonyShip).toBe(true);
      expect(res.costs.fuelUnitsRequired).toBe(PROXIMA.jumpFuelRequired);
      expect(res.totalPlannedMonths).toBe(PROXIMA_OUTBOUND + EXPLORE_DURATION_MONTHS);
    }
  });
});

// ─── Launch ─────────────────────────────────────────────────────────────────

describe('launchExpedition', () => {
  it('deducts money + inventory fuel, commits crew and ship, records the expedition', () => {
    const state = baseState({ resources: { exotic_fuel: 1_000 } });
    const plan = planExpedition(state, { targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: true, extraShielding: false });
    expect(plan.ok).toBe(true);
    const res = launchExpedition(state, { targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: true, extraShielding: false }, 5000, 42);
    expect(res.ok).toBe(true);
    if (res.ok && plan.ok) {
      expect(res.state.money).toBe(state.money - plan.costs.totalMoneyCost);
      expect(res.state.resources.exotic_fuel).toBe(0); // 1000 units consumed, round trip needs 1000
      const ship = res.state.ships!.find(s => s.instanceId === 'explorer-1')!;
      expect(ship.status).toBe('expedition');
      expect(res.expedition.phase).toBe('outbound');
      expect(res.expedition.seed).toBe(42);
      expect(res.expedition.insured).toBe(true);
      expect(res.expedition.crew).toBe(12); // starfarer_explorer crewRequired override
      const committed = Object.values(res.expedition.crewBreakdown || {}).reduce((a, b) => a + b, 0);
      expect(committed).toBe(12);
      const wfTotal = res.state.workforce!.engineers + res.state.workforce!.scientists
        + res.state.workforce!.miners + res.state.workforce!.operators;
      expect(wfTotal).toBe(80 - 12);
    }
  });
});

// ─── Lifecycle: travel → arrival → return ───────────────────────────────────

describe('expedition lifecycle', () => {
  function launched(seed = 7): GameState {
    const res = launchExpedition(baseState(), { targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: true, extraShielding: true }, 1000, seed);
    if (!res.ok) throw new Error('launch failed');
    return res.state;
  }

  it('stays outbound before the transit completes', () => {
    const s = tickAtMonth(launched(), PROXIMA_OUTBOUND - 1);
    expect(s.expeditions![0].phase).toBe('outbound');
    expect(s.expeditions![0].monthsElapsed).toBe(PROXIMA_OUTBOUND - 1);
  });

  it('arrives and rolls a survey outcome at the destination', () => {
    const s = tickAtMonth(launched(), PROXIMA_OUTBOUND);
    const exp = s.expeditions![0];
    expect(exp.phase).toBe('exploring');
    expect(exp.outcome).toBeDefined();
    expect(exp.outcome!.surveyDataPayout).toBeGreaterThan(0);
    // Proxima is a habitable-zone system — suitability floors at 0.7.
    expect(exp.outcome!.colonySuitability).toBeGreaterThanOrEqual(0.7);
    // First-contact system (Echo Remnants) yields biomatter samples.
    expect(exp.outcome!.firstContactFactionId).toBe('echo-remnants');
    expect(exp.outcome!.resourceSamples.xenogenic_biomatter).toBeGreaterThan(0);
    // Arrival files a report the player can read (ReportsPanel).
    expect(s.reports!.some(r => r.title.includes('Interstellar Survey'))).toBe(true);
  });

  it('returns home: pays survey data, delivers samples, frees ship and crew', () => {
    const start = launched();
    const total = PROXIMA_OUTBOUND * 2 + EXPLORE_DURATION_MONTHS;
    const mid = tickAtMonth(start, PROXIMA_OUTBOUND + EXPLORE_DURATION_MONTHS);
    expect(mid.expeditions![0].phase).toBe('returning');
    const done = tickAtMonth(mid, total);
    const exp = done.expeditions![0];
    expect(exp.phase).toBe('completed');
    expect(done.money).toBeGreaterThan(mid.money); // data payout credited
    // Samples entered the same inventory the market trades from.
    for (const [resId, qty] of Object.entries(exp.outcome!.resourceSamples)) {
      expect(done.resources[resId] || 0).toBeGreaterThanOrEqual(qty);
    }
    const ship = done.ships!.find(s => s.instanceId === 'explorer-1')!;
    expect(ship.status).toBe('idle');
    const wfTotal = done.workforce!.engineers + done.workforce!.scientists
      + done.workforce!.miners + done.workforce!.operators;
    expect(wfTotal).toBe(80); // crew returned to their pools
  });

  it('is a no-op (same reference) when there is no interstellar activity', () => {
    const s = baseState();
    expect(processExpeditionTick(s, 1000)).toBe(s);
  });

  it('getExpeditionProgress reports phase and completion fraction', () => {
    const s = tickAtMonth(launched(), Math.floor(PROXIMA_OUTBOUND / 2));
    const prog = getExpeditionProgress(s, s.expeditions![0].id)!;
    expect(prog.systemName).toBe('Proxima Centauri');
    expect(prog.phaseLabel).toContain('outbound');
    expect(prog.progressPct).toBeGreaterThan(0);
    expect(prog.progressPct).toBeLessThan(0.5);
  });
});

// ─── Hazard determinism + insurance ─────────────────────────────────────────

describe('hazards — deterministic, mitigable, insurable', () => {
  it('identical seeds produce identical hazard logs and outcomes', () => {
    const run = () => {
      const res = launchExpedition(baseState(), { targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false }, 1000, 12345);
      if (!res.ok) throw new Error('launch failed');
      return tickAtMonth(res.state, PROXIMA_OUTBOUND * 2 + EXPLORE_DURATION_MONTHS);
    };
    const a = run().expeditions![0];
    const b = run().expeditions![0];
    expect(a.hazardLog).toEqual(b.hazardLog);
    expect(a.hullIntegrity).toBe(b.hullIntegrity);
    expect(a.outcome).toEqual(b.outcome);
  });

  it('extra shielding never results in a worse hull than baseline (same seed)', () => {
    const run = (extraShielding: boolean) => {
      const res = launchExpedition(baseState(), { targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding }, 1000, 999);
      if (!res.ok) throw new Error('launch failed');
      return tickAtMonth(res.state, PROXIMA_OUTBOUND * 2 + EXPLORE_DURATION_MONTHS).expeditions![0];
    };
    expect(run(true).hullIntegrity).toBeGreaterThanOrEqual(run(false).hullIntegrity);
  });

  // The Sirius route is the game's hottest (2× hazard multiplier, ~520 transit
  // months). Search a bounded seed range for a total loss so we can assert the
  // loss/insurance mechanics deterministically. Prereqs per interstellar.ts.
  const SIRIUS_RESEARCH = ['jump_drive', 'exotic_matter_refining', 'heavy_radiation_shielding'];
  const SIRIUS = INTERSTELLAR_SYSTEM_MAP.get('sirius')!;
  const SIRIUS_TOTAL = Math.ceil(SIRIUS.distanceLy * GAME_MONTHS_PER_LY) * 2 + EXPLORE_DURATION_MONTHS;

  function runSirius(seed: number, insured: boolean) {
    const state = baseState({ completedResearch: SIRIUS_RESEARCH });
    const res = launchExpedition(state, { targetSystemId: 'sirius', shipInstanceId: 'explorer-1', insured, extraShielding: false }, 1000, seed);
    if (!res.ok) throw new Error('launch failed');
    return { afterLaunch: res.state, final: tickAtMonth(res.state, SIRIUS_TOTAL) };
  }

  function findLossSeed(): number | null {
    for (let seed = 1; seed <= 400; seed++) {
      if (runSirius(seed, false).final.expeditions![0].phase === 'lost') return seed;
    }
    return null;
  }

  it('an uninsured total loss forfeits ship, crew, and cargo — no payout', () => {
    const seed = findLossSeed();
    expect(seed).not.toBeNull(); // the hottest route must be genuinely dangerous
    const { afterLaunch, final } = runSirius(seed!, false);
    const exp = final.expeditions![0];
    expect(exp.phase).toBe('lost');
    expect(exp.hullIntegrity).toBe(0);
    expect(final.ships!.some(s => s.instanceId === 'explorer-1')).toBe(false);
    expect(final.money).toBe(afterLaunch.money); // no insurance payout
    const wfTotal = final.workforce!.engineers + final.workforce!.scientists
      + final.workforce!.miners + final.workforce!.operators;
    expect(wfTotal).toBe(80 - 12); // crew not returned (baseState workforce totals 80)
  });

  it('insurance converts the same catastrophe into a 70% payout', () => {
    const seed = findLossSeed();
    expect(seed).not.toBeNull();
    const { afterLaunch, final } = runSirius(seed!, true);
    const exp = final.expeditions![0];
    expect(exp.phase).toBe('lost');
    expect(final.money).toBe(afterLaunch.money + Math.round(exp.totalCost * INSURANCE_PAYOUT_RATE));
  });
});

// ─── Colonies ───────────────────────────────────────────────────────────────

describe('colonies', () => {
  function arkAtProxima(research: string[] = ['jump_drive', 'interstellar_colonization']): GameState {
    const res = launchExpedition(withArk({ completedResearch: research }), { targetSystemId: 'proxima_centauri', shipInstanceId: 'ark-1', insured: true, extraShielding: true }, 1000, 3);
    if (!res.ok) throw new Error('launch failed');
    return tickAtMonth(res.state, PROXIMA_OUTBOUND);
  }

  it('a colony ark holds station at the destination instead of auto-returning', () => {
    const s = tickAtMonth(arkAtProxima(), PROXIMA_OUTBOUND + EXPLORE_DURATION_MONTHS + 60);
    expect(s.expeditions![0].phase).toBe('exploring');
  });

  it('explorers cannot found colonies; expeditions still in transit cannot either', () => {
    const explorerRes = launchExpedition(baseState(), { targetSystemId: 'proxima_centauri', shipInstanceId: 'explorer-1', insured: false, extraShielding: false }, 1000, 3);
    if (!explorerRes.ok) throw new Error('launch failed');
    const arrived = tickAtMonth(explorerRes.state, PROXIMA_OUTBOUND);
    const c1 = establishColony(arrived, arrived.expeditions![0].id);
    expect(!c1.ok && c1.reason).toBe('ship_not_colony_capable');

    const inTransit = tickAtMonth(arkAtProxima(), PROXIMA_OUTBOUND); // fresh state helper
    const early = { ...inTransit, expeditions: inTransit.expeditions!.map(e => ({ ...e, phase: 'outbound' as const })) };
    const c2 = establishColony(early, early.expeditions![0].id);
    expect(!c2.ok && c2.reason).toBe('not_at_destination');
  });

  it('establishColony charges the founding cost and commits ark + crew permanently', () => {
    const s = arkAtProxima();
    const res = establishColony(s, s.expeditions![0].id, 'New Geneva', 2000);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.money).toBe(s.money - COLONY_FOUNDING_COST);
      expect(res.state.expeditions![0].phase).toBe('colonizing');
      expect(res.colony.name).toBe('New Geneva');
      expect(res.colony.population).toBe(COLONY_STARTING_POPULATION);
      expect(res.colony.suitability).toBeGreaterThanOrEqual(0.7);
      // Proxima knownResources → exotic_materials + helium3 are colony-producible.
      expect(res.colony.localResources).toEqual(expect.arrayContaining(['exotic_materials', 'helium3']));
      // Without exotic_matter_refining research, no fuel production yet.
      expect(res.colony.localResources).not.toContain('exotic_fuel');
      // Ark stays on the books at the colony (its maintenance = colony upkeep).
      const ark = res.state.ships!.find(sh => sh.instanceId === 'ark-1')!;
      expect(ark.currentLocation).toBe('proxima_centauri');
      // A second colony in the same system is blocked.
      const dup = establishColony(res.state, res.state.expeditions![0].id);
      expect(dup.ok).toBe(false);
    }
  });

  it('exotic_matter_refining research unlocks exotic-fuel production at founding', () => {
    const s = arkAtProxima(['jump_drive', 'interstellar_colonization', 'exotic_matter_refining']);
    const res = establishColony(s, s.expeditions![0].id);
    expect(res.ok && res.colony.localResources).toContain('exotic_fuel');
  });

  it('colonies produce into their stockpile and grow population over the months', () => {
    const s = arkAtProxima();
    const founded = establishColony(s, s.expeditions![0].id);
    if (!founded.ok) throw new Error('founding failed');
    const after = tickAtMonth(founded.state, getTotalGameMonths(founded.state.gameDate) + 24);
    const colony = after.interstellarColonies![0];
    expect(colony.stockpile.exotic_materials).toBeGreaterThan(0);
    expect(colony.stockpile.helium3).toBeGreaterThan(0);
    expect(colony.population).toBeGreaterThan(COLONY_STARTING_POPULATION * 0.5); // crises can dent it, floor can't erase it
    expect(colony.population).toBeLessThanOrEqual(colony.infrastructureLevel * COLONY_POP_CAP_PER_LEVEL);
    // Production stays local until a trade route ships it — nothing teleports.
    expect(after.resources.exotic_materials || 0).toBe(0);
  });

  it('upgradeColony gates on population, charges doubling costs, completes after months', () => {
    const s = arkAtProxima();
    const founded = establishColony(s, s.expeditions![0].id);
    if (!founded.ok) throw new Error('founding failed');

    // Too few colonists initially (100 < 80% of 500).
    const tooEarly = upgradeColony(founded.state, founded.colony.id);
    expect(!tooEarly.ok && tooEarly.reason).toBe('population_too_low');

    // Force-grow the population, then upgrade.
    const grown: GameState = {
      ...founded.state,
      interstellarColonies: founded.state.interstellarColonies!.map(c => ({ ...c, population: 450 })),
    };
    const up = upgradeColony(grown, founded.colony.id);
    expect(up.ok).toBe(true);
    if (up.ok) {
      expect(up.state.money).toBe(grown.money - getColonyUpgradeCost(1));
      const nowMonth = getTotalGameMonths(up.state.gameDate);
      const inProgress = up.state.interstellarColonies![0].upgradeInProgress!;
      expect(inProgress.targetLevel).toBe(2);
      expect(inProgress.completesAtGameMonth).toBe(nowMonth + COLONY_UPGRADE_MONTHS_PER_LEVEL * 2);
      // Double-start is blocked.
      const again = upgradeColony(up.state, founded.colony.id);
      expect(!again.ok && again.reason).toBe('upgrade_in_progress');
      // Completes once the months elapse.
      const done = tickAtMonth(up.state, inProgress.completesAtGameMonth);
      expect(done.interstellarColonies![0].infrastructureLevel).toBe(2);
      expect(done.interstellarColonies![0].upgradeInProgress).toBeNull();
    }
  });

  it('upgrade cost doubles per level', () => {
    expect(getColonyUpgradeCost(1)).toBe(25_000_000_000);
    expect(getColonyUpgradeCost(2)).toBe(50_000_000_000);
    expect(getColonyUpgradeCost(4)).toBe(200_000_000_000);
  });
});

// ─── Trade routes ───────────────────────────────────────────────────────────

describe('interstellar trade routes', () => {
  function stateWithColony(stockpile: Record<string, number> = { exotic_materials: 100 }): { state: GameState; colony: InterstellarColonyState } {
    const base = baseState({ ships: [] });
    const month = getTotalGameMonths(base.gameDate);
    const colony: InterstellarColonyState = {
      id: 'col-1',
      systemId: 'proxima_centauri',
      name: 'Test Colony',
      foundedAtMs: 0,
      foundedGameMonth: month,
      population: 100,
      infrastructureLevel: 1,
      upgradeInProgress: null,
      localResources: ['exotic_materials', 'helium3'],
      stockpile,
      lastProcessedGameMonth: month,
      suitability: 1,
    };
    return { state: { ...base, interstellarColonies: [colony] }, colony };
  }

  it('validates resource + duplicates and charges the setup cost', () => {
    const { state } = stateWithColony();
    const bad = establishTradeRoute(state, 'col-1', 'gold');
    expect(!bad.ok && bad.reason).toBe('resource_not_produced');
    const missing = establishTradeRoute(state, 'nope', 'exotic_materials');
    expect(!missing.ok && missing.reason).toBe('colony_not_found');

    const ok = establishTradeRoute(state, 'col-1', 'exotic_materials');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.state.money).toBe(state.money - TRADE_ROUTE_SETUP_COST);
      expect(ok.route.transitMonths).toBe(PROXIMA_OUTBOUND);
      const dup = establishTradeRoute(ok.state, 'col-1', 'exotic_materials');
      expect(!dup.ok && dup.reason).toBe('route_already_exists');
    }
  });

  it('ships the stockpile after a full cycle and delivers to player inventory after transit', () => {
    const { state } = stateWithColony();
    const est = establishTradeRoute(state, 'col-1', 'exotic_materials');
    if (!est.ok) throw new Error('route failed');
    const route = est.route;

    // Departure at nextDepartureGameMonth: stockpile shipped, logistics fee paid.
    const atDeparture = tickAtMonth(est.state, route.nextDepartureGameMonth);
    const dep = atDeparture.interstellarTradeRoutes![0];
    expect(dep.inTransit.length).toBe(1);
    expect(dep.inTransit[0].quantity).toBeGreaterThanOrEqual(100); // seed stock + accrued production (minus possible crisis)
    expect(atDeparture.interstellarColonies![0].stockpile.exotic_materials).toBeLessThan(1);
    expect(atDeparture.totalSpent).toBeGreaterThan(est.state.totalSpent); // fee charged

    // Arrival after transitMonths: same inventory the market trades from.
    const shipped = dep.inTransit[0];
    const atArrival = tickAtMonth(atDeparture, shipped.arrivesGameMonth);
    const arr = atArrival.interstellarTradeRoutes![0];
    // The first shipment has arrived; later departure windows may have fired
    // in the same catch-up (their shipments are still in transit).
    expect(arr.inTransit.every(s => s.arrivesGameMonth > shipped.arrivesGameMonth)).toBe(true);
    expect(arr.totalDelivered).toBe(shipped.quantity);
    expect(atArrival.resources.exotic_materials).toBe(shipped.quantity);
  });

  it('skips a departure window when the stockpile is below the minimum shipment', () => {
    const { state } = stateWithColony({ exotic_materials: 0 });
    // Colony produces nothing for this test — strip its production.
    const noProd: GameState = {
      ...state,
      interstellarColonies: state.interstellarColonies!.map(c => ({ ...c, localResources: [] })),
    };
    const est = establishTradeRoute(noProd, 'col-1', 'exotic_materials');
    // localResources was emptied after the check would fail — re-add for route validity.
    expect(est.ok).toBe(false); // resource_not_produced with stripped production
    // Instead: keep localResources, but freeze suitability at 0 so nothing accrues.
    const frozen: GameState = {
      ...state,
      interstellarColonies: state.interstellarColonies!.map(c => ({ ...c, suitability: 0 })),
    };
    const est2 = establishTradeRoute(frozen, 'col-1', 'exotic_materials');
    if (!est2.ok) throw new Error('route failed');
    const after = tickAtMonth(est2.state, est2.route.nextDepartureGameMonth);
    const r = after.interstellarTradeRoutes![0];
    expect(r.inTransit.length).toBe(0); // nothing worth shipping
    expect(r.nextDepartureGameMonth).toBe(est2.route.nextDepartureGameMonth + r.cycleMonths); // window advanced
  });

  it('suspended routes do not depart; resuming re-anchors the schedule', () => {
    const { state } = stateWithColony();
    const est = establishTradeRoute(state, 'col-1', 'exotic_materials');
    if (!est.ok) throw new Error('route failed');
    const suspended = setTradeRouteStatus(est.state, est.route.id, 'suspended');
    const after = tickAtMonth(suspended, est.route.nextDepartureGameMonth + est.route.cycleMonths * 2);
    expect(after.interstellarTradeRoutes![0].inTransit.length).toBe(0);
    const resumed = setTradeRouteStatus(after, est.route.id, 'active');
    const currentMonth = getTotalGameMonths(after.gameDate);
    expect(resumed.interstellarTradeRoutes![0].nextDepartureGameMonth).toBeGreaterThan(currentMonth);
  });

  it('suspends a route (instead of going negative) when the logistics fee cannot be paid', () => {
    const { state } = stateWithColony({ exotic_materials: 500 });
    const est = establishTradeRoute(state, 'col-1', 'exotic_materials');
    if (!est.ok) throw new Error('route failed');
    const broke: GameState = { ...est.state, money: 0 };
    const after = tickAtMonth(broke, est.route.nextDepartureGameMonth);
    expect(after.interstellarTradeRoutes![0].status).toBe('suspended');
    expect(after.interstellarTradeRoutes![0].inTransit.length).toBe(0);
    expect(after.money).toBeGreaterThanOrEqual(0);
  });
});

// ─── Misc helpers ───────────────────────────────────────────────────────────

describe('helpers', () => {
  it('getTotalGameMonths matches the quarterly-reports convention', () => {
    expect(getTotalGameMonths({ year: STARTING_YEAR, month: 1 })).toBe(0);
    expect(getTotalGameMonths({ year: STARTING_YEAR + 1, month: 1 })).toBe(12);
    expect(getTotalGameMonths({ year: STARTING_YEAR, month: 7 })).toBe(6);
  });

  it('getExpeditionCapableShips filters to idle, built, capable hulls', () => {
    const state = baseState({
      ships: [
        { instanceId: 'a', definitionId: 'starfarer_explorer', name: 'A', status: 'idle', currentLocation: 'leo', isBuilt: true },
        { instanceId: 'b', definitionId: 'starfarer_explorer', name: 'B', status: 'mining', currentLocation: 'leo', isBuilt: true },
        { instanceId: 'c', definitionId: 'colony_ark', name: 'C', status: 'idle', currentLocation: 'leo', isBuilt: false },
        { instanceId: 'd', definitionId: 'mining_drone', name: 'D', status: 'idle', currentLocation: 'leo', isBuilt: true },
      ],
    });
    expect(getExpeditionCapableShips(state).map(s => s.instanceId)).toEqual(['a']);
  });
});

// ─── Save migration (V13) ───────────────────────────────────────────────────

describe('save-load V13 migration', () => {
  const store = new Map<string, string>();
  beforeAll(() => {
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  it('getNewGameState() initializes the three interstellar fields to empty arrays', () => {
    const fresh = getNewGameState();
    expect(fresh.expeditions).toEqual([]);
    expect(fresh.interstellarColonies).toEqual([]);
    expect(fresh.interstellarTradeRoutes).toEqual([]);
  });

  it('loadGame() defaults the fields for a pre-Wave-10 save that lacks them', () => {
    const oldSave = getNewGameState() as unknown as Record<string, unknown>;
    delete oldSave.expeditions;
    delete oldSave.interstellarColonies;
    delete oldSave.interstellarTradeRoutes;
    store.set(SAVE_KEY, JSON.stringify(oldSave));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.expeditions).toEqual([]);
    expect(loaded!.interstellarColonies).toEqual([]);
    expect(loaded!.interstellarTradeRoutes).toEqual([]);
  });

  it('loadGame() preserves in-flight expeditions on newer saves', () => {
    const save = getNewGameState();
    save.expeditions = [{
      id: 'e1', targetSystemId: 'proxima_centauri', shipInstanceId: 's1',
      shipDefinitionId: 'starfarer_explorer', crew: 12, phase: 'outbound',
      launchedAtMs: 1, launchGameMonth: 0, outboundMonths: 128, exploreMonths: 12,
      monthsElapsed: 5, seed: 42, insured: true, insurancePremiumPaid: 1,
      extraShielding: false, totalCost: 1, hullIntegrity: 1, hazardLog: [],
    }];
    store.set(SAVE_KEY, JSON.stringify(save));
    const loaded = loadGame();
    expect(loaded!.expeditions).toHaveLength(1);
    expect(loaded!.expeditions![0].id).toBe('e1');
  });
});
