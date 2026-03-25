/**
 * @jest-environment node
 */
import { getPowerByLocation, getCraftingSpeedMultiplier, BUILDING_MAP } from '../game/buildings';
import { processTick } from '../game/game-engine';
import type { GameState, BuildingInstance, ActiveResearch } from '../game/types';

// ---------------------------------------------------------------------------
// Helper: minimal building stub
// ---------------------------------------------------------------------------
function makeBuilding(
  definitionId: string,
  locationId: string,
  opts: { isComplete?: boolean } = {},
): Pick<BuildingInstance, 'definitionId' | 'locationId' | 'isComplete' | 'instanceId'> {
  return {
    instanceId: `inst_${definitionId}_${locationId}_${Math.random().toString(36).slice(2, 8)}`,
    definitionId,
    locationId,
    isComplete: opts.isComplete ?? true,
  };
}

// ===========================================================================
// 1. Power System — getPowerByLocation
// ===========================================================================
describe('getPowerByLocation', () => {
  it('returns empty object when there are no buildings', () => {
    const result = getPowerByLocation([]);
    expect(result).toEqual({});
  });

  it('excludes earth_surface buildings (unlimited power)', () => {
    const buildings = [
      makeBuilding('solar_farm_orbital', 'earth_surface'),
      makeBuilding('mining_lunar_ice', 'earth_surface'),
    ];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    expect(result).toEqual({});
  });

  it('solar farms generate power at their location', () => {
    // solar_farm_lunar has powerGenerated: 30
    const buildings = [makeBuilding('solar_farm_lunar', 'lunar_surface')];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    expect(result['lunar_surface']).toBeDefined();
    expect(result['lunar_surface'].generated).toBe(30);
    expect(result['lunar_surface'].required).toBe(0);
    expect(result['lunar_surface'].ratio).toBe(1); // no power needed = fully powered
  });

  it('mining facilities require power', () => {
    // mining_lunar_ice has powerRequired: 10
    const buildings = [makeBuilding('mining_lunar_ice', 'lunar_surface')];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    expect(result['lunar_surface']).toBeDefined();
    expect(result['lunar_surface'].required).toBe(10);
    expect(result['lunar_surface'].generated).toBe(0);
    expect(result['lunar_surface'].ratio).toBe(0); // no power generated
  });

  it('calculates power ratio correctly when partially powered', () => {
    // solar_farm_lunar generates 30, mining_lunar_ice requires 10, fabrication_lunar requires 12
    // Total: 30 generated, 22 required → ratio = 1 (capped at 1 since 30/22 > 1)
    const buildings = [
      makeBuilding('solar_farm_lunar', 'lunar_surface'),
      makeBuilding('mining_lunar_ice', 'lunar_surface'),
      makeBuilding('fabrication_lunar', 'lunar_surface'),
    ];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    expect(result['lunar_surface'].generated).toBe(30);
    expect(result['lunar_surface'].required).toBe(22);
    expect(result['lunar_surface'].ratio).toBe(1); // 30/22 capped at 1
  });

  it('calculates ratio < 1 when underpowered', () => {
    // mining_mars requires 15 but no solar farm → ratio 0
    const buildings = [makeBuilding('mining_mars', 'mars_surface')];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    expect(result['mars_surface'].generated).toBe(0);
    expect(result['mars_surface'].required).toBe(15);
    expect(result['mars_surface'].ratio).toBe(0);
  });

  it('caps ratio at 1 when over-powered', () => {
    // solar_farm_mars generates 25, mining_mars requires 15 → 25/15 ≈ 1.67, capped at 1
    const buildings = [
      makeBuilding('solar_farm_mars', 'mars_surface'),
      makeBuilding('mining_mars', 'mars_surface'),
    ];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    expect(result['mars_surface'].ratio).toBe(1);
  });

  it('ignores incomplete buildings', () => {
    const buildings = [
      makeBuilding('solar_farm_lunar', 'lunar_surface', { isComplete: false }),
      makeBuilding('mining_lunar_ice', 'lunar_surface'),
    ];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    // Only the mining is counted (complete), solar is ignored (incomplete)
    expect(result['lunar_surface'].generated).toBe(0);
    expect(result['lunar_surface'].required).toBe(10);
  });

  it('tracks multiple locations independently', () => {
    const buildings = [
      makeBuilding('solar_farm_lunar', 'lunar_surface'),
      makeBuilding('mining_lunar_ice', 'lunar_surface'),
      makeBuilding('solar_farm_mars', 'mars_surface'),
      makeBuilding('mining_mars', 'mars_surface'),
    ];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['lunar_surface'].generated).toBe(30);
    expect(result['lunar_surface'].required).toBe(10);
    expect(result['mars_surface'].generated).toBe(25);
    expect(result['mars_surface'].required).toBe(15);
  });

  it('handles buildings with both powerRequired and powerGenerated', () => {
    // space_station_jupiter has powerRequired: 10 and powerGenerated: 15 (nuclear powered)
    const buildings = [makeBuilding('space_station_jupiter', 'jupiter_system')];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    const loc = result['jupiter_system'];
    expect(loc).toBeDefined();
    expect(loc.generated).toBe(15);
    expect(loc.required).toBe(10);
    expect(loc.ratio).toBe(1); // 15/10 capped at 1
  });

  it('ignores unknown building IDs gracefully', () => {
    const buildings = [makeBuilding('nonexistent_building', 'mars_surface')];
    const result = getPowerByLocation(buildings as BuildingInstance[]);
    // Unknown building def is skipped
    expect(result).toEqual({});
  });
});

// ===========================================================================
// 2. Crafting Speed — getCraftingSpeedMultiplier
// ===========================================================================
describe('getCraftingSpeedMultiplier', () => {
  it('returns 1.0x with 0 fabrication facilities', () => {
    const result = getCraftingSpeedMultiplier([]);
    expect(result).toBe(1);
  });

  it('returns 1.0x with 1 fabrication facility', () => {
    const buildings = [
      makeBuilding('fabrication_orbital', 'leo'),
    ];
    const result = getCraftingSpeedMultiplier(buildings as BuildingInstance[]);
    expect(result).toBe(1);
  });

  it('returns 1.15x with 2 fabrication facilities', () => {
    const buildings = [
      makeBuilding('fabrication_orbital', 'leo'),
      makeBuilding('fabrication_lunar', 'lunar_surface'),
    ];
    const result = getCraftingSpeedMultiplier(buildings as BuildingInstance[]);
    expect(result).toBeCloseTo(1.15, 10);
  });

  it('returns 1.30x with 3 fabrication facilities', () => {
    const buildings = [
      makeBuilding('fabrication_orbital', 'leo'),
      makeBuilding('fabrication_lunar', 'lunar_surface'),
      makeBuilding('fabrication_mars', 'mars_surface'),
    ];
    const result = getCraftingSpeedMultiplier(buildings as BuildingInstance[]);
    expect(result).toBeCloseTo(1.30, 10);
  });

  it('returns 1.60x with 5 fabrication facilities', () => {
    const buildings = [
      makeBuilding('fabrication_orbital', 'leo'),
      makeBuilding('fabrication_orbital', 'leo'),
      makeBuilding('fabrication_lunar', 'lunar_surface'),
      makeBuilding('fabrication_mars', 'mars_surface'),
      makeBuilding('fabrication_asteroid', 'asteroid_belt'),
    ];
    const result = getCraftingSpeedMultiplier(buildings as BuildingInstance[]);
    expect(result).toBeCloseTo(1.60, 10);
  });

  it('ignores incomplete fabrication facilities', () => {
    const buildings = [
      makeBuilding('fabrication_orbital', 'leo'),
      makeBuilding('fabrication_lunar', 'lunar_surface', { isComplete: false }),
    ];
    const result = getCraftingSpeedMultiplier(buildings as BuildingInstance[]);
    // Only 1 complete fab → 1.0x
    expect(result).toBe(1);
  });

  it('ignores non-fabrication buildings', () => {
    const buildings = [
      makeBuilding('fabrication_orbital', 'leo'),
      makeBuilding('solar_farm_lunar', 'lunar_surface'), // not a fab
      makeBuilding('mining_lunar_ice', 'lunar_surface'), // not a fab
    ];
    const result = getCraftingSpeedMultiplier(buildings as BuildingInstance[]);
    // Only 1 fab → 1.0x
    expect(result).toBe(1);
  });

  it('returns 2.35x with 10 fabrication facilities', () => {
    // 1 + 0.15 * (10 - 1) = 1 + 1.35 = 2.35
    const buildings = Array.from({ length: 10 }, () =>
      makeBuilding('fabrication_orbital', 'leo'),
    );
    const result = getCraftingSpeedMultiplier(buildings as BuildingInstance[]);
    expect(result).toBeCloseTo(2.35, 10);
  });
});

// ===========================================================================
// 3. Daily Metrics — reset on date change, accumulate within same day
// ===========================================================================
describe('Daily Metrics (via processTick)', () => {
  // getDailyMetrics is private, so we test it through processTick.
  // We mock getGlobalGameDate and Date to control the "today" string.

  let originalDateNow: () => number;
  const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0); // 2026-03-25 noon UTC

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = () => fixedNow;
    // Mock getGlobalGameDate via module mock
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-25T12:00:00.000Z');
  });

  afterEach(() => {
    Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
    return {
      version: 1,
      createdAt: fixedNow - 86400000,
      lastTickAt: fixedNow - 1000,
      money: 100_000_000,
      totalEarned: 0,
      totalSpent: 0,
      gameDate: { year: 2026, month: 3 },
      tickSpeed: 1,
      buildings: [],
      completedResearch: [],
      activeResearch: null,
      activeResearch2: null,
      activeServices: [],
      unlockedLocations: ['earth_surface', 'leo'],
      resources: {},
      eventLog: [],
      stats: {
        rocketsLaunched: 0,
        satellitesDeployed: 0,
        stationsBuilt: 0,
        researchCompleted: 0,
        missionsToMoon: 0,
        missionsToMars: 0,
        missionsToOuterPlanets: 0,
      },
      npcCompanies: [],
      npcMarketPressure: {},
      activeEffects: [],
      incomeHistory: [],
      pendingChoice: null,
      activeRefining: null,
      activeMarketEvents: [],
      claimedMilestones: {},
      earnedAchievements: [],
      playerTitle: null,
      ships: [],
      reports: [],
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
      activeBoosts: [],
      availableBoosts: [],
      tickCount: 0,
      ...overrides,
    };
  }

  it('creates fresh daily metrics when date changes', () => {
    // Existing metrics from yesterday
    const state = makeMinimalState({
      dailyMetrics: {
        date: '2026-03-24', // yesterday
        units_mined: 500,
        research_completed: 3,
        revenue_earned: 1_000_000,
        buildings_built: 2,
        contracts_completed: 1,
        research_started: 1,
        rockets_launched: 1,
        market_orders_filled: 5,
        trade_volume: 100_000,
        buildings_upgraded: 0,
        satellites_deployed: 1,
        cargo_delivered: 10,
        iron_mined: 200,
        titanium_mined: 50,
        platinum_group_mined: 5,
      },
    });

    const result = processTick(state);
    // Should have reset to today's date with zeroed counters
    expect(result.dailyMetrics).toBeDefined();
    expect(result.dailyMetrics!.date).toBe('2026-03-25');
    expect(result.dailyMetrics!.units_mined).toBe(0);
    expect(result.dailyMetrics!.research_completed).toBe(0);
    expect(result.dailyMetrics!.buildings_built).toBe(0);
  });

  it('preserves daily metrics when same date', () => {
    const state = makeMinimalState({
      dailyMetrics: {
        date: '2026-03-25', // today
        units_mined: 500,
        research_completed: 3,
        revenue_earned: 1_000_000,
        buildings_built: 2,
        contracts_completed: 1,
        research_started: 1,
        rockets_launched: 1,
        market_orders_filled: 5,
        trade_volume: 100_000,
        buildings_upgraded: 0,
        satellites_deployed: 1,
        cargo_delivered: 10,
        iron_mined: 200,
        titanium_mined: 50,
        platinum_group_mined: 5,
      },
    });

    const result = processTick(state);
    expect(result.dailyMetrics).toBeDefined();
    expect(result.dailyMetrics!.date).toBe('2026-03-25');
    // Metrics should be preserved (at least not reset to 0)
    // buildings_built stays at 2 since no new buildings completed
    expect(result.dailyMetrics!.buildings_built).toBe(2);
  });
});

// ===========================================================================
// 4. Research Queue — activeResearch2 with parallel_research
// ===========================================================================
describe('Research Queue (activeResearch2)', () => {
  let originalDateNow: () => number;
  const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0);

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = () => fixedNow;
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-25T12:00:00.000Z');
  });

  afterEach(() => {
    Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
    return {
      version: 1,
      createdAt: fixedNow - 86400000,
      lastTickAt: fixedNow - 1000,
      money: 100_000_000,
      totalEarned: 0,
      totalSpent: 0,
      gameDate: { year: 2026, month: 3 },
      tickSpeed: 1,
      buildings: [],
      completedResearch: [],
      activeResearch: null,
      activeResearch2: null,
      activeServices: [],
      unlockedLocations: ['earth_surface', 'leo'],
      resources: {},
      eventLog: [],
      stats: {
        rocketsLaunched: 0,
        satellitesDeployed: 0,
        stationsBuilt: 0,
        researchCompleted: 0,
        missionsToMoon: 0,
        missionsToMars: 0,
        missionsToOuterPlanets: 0,
      },
      npcCompanies: [],
      npcMarketPressure: {},
      activeEffects: [],
      incomeHistory: [],
      pendingChoice: null,
      activeRefining: null,
      activeMarketEvents: [],
      claimedMilestones: {},
      earnedAchievements: [],
      playerTitle: null,
      ships: [],
      reports: [],
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
      activeBoosts: [],
      availableBoosts: [],
      tickCount: 0,
      ...overrides,
    };
  }

  it('processes activeResearch2 when parallel_research is completed', () => {
    // Research started 2 hours ago with 60s duration → should be complete
    const researchItem: ActiveResearch = {
      definitionId: 'data_compression', // a real tier 1 research
      startDate: { year: 2026, month: 3 },
      progressMonths: 0,
      totalMonths: 6,
      startedAtMs: fixedNow - 7200_000, // 2 hours ago
      realDurationSeconds: 60, // 60 seconds to complete
    };

    const state = makeMinimalState({
      completedResearch: ['parallel_research'], // prerequisite for 2nd queue
      activeResearch2: researchItem,
    });

    const result = processTick(state);
    // data_compression should now be in completedResearch
    expect(result.completedResearch).toContain('data_compression');
    // Second queue should be cleared
    expect(result.activeResearch2).toBeNull();
    // Stats should reflect the completion
    expect(result.stats.researchCompleted).toBe(1);
  });

  it('does NOT process activeResearch2 without parallel_research', () => {
    const researchItem: ActiveResearch = {
      definitionId: 'data_compression',
      startDate: { year: 2026, month: 3 },
      progressMonths: 0,
      totalMonths: 6,
      startedAtMs: fixedNow - 7200_000,
      realDurationSeconds: 60,
    };

    const state = makeMinimalState({
      completedResearch: [], // NO parallel_research
      activeResearch2: researchItem,
    });

    const result = processTick(state);
    // data_compression should NOT be completed
    expect(result.completedResearch).not.toContain('data_compression');
    // Stats should remain at 0
    expect(result.stats.researchCompleted).toBe(0);
  });

  it('updates progress on activeResearch2 when not yet complete', () => {
    // Research started 5 seconds ago, takes 600 seconds → not done yet
    const researchItem: ActiveResearch = {
      definitionId: 'data_compression',
      startDate: { year: 2026, month: 3 },
      progressMonths: 0,
      totalMonths: 6,
      startedAtMs: fixedNow - 5_000, // 5 seconds ago
      realDurationSeconds: 600, // 10 minutes
    };

    const state = makeMinimalState({
      completedResearch: ['parallel_research'],
      activeResearch2: researchItem,
    });

    const result = processTick(state);
    // Should NOT be completed
    expect(result.completedResearch).not.toContain('data_compression');
    // Should still have the research in progress
    expect(result.activeResearch2).not.toBeNull();
    expect(result.activeResearch2!.definitionId).toBe('data_compression');
  });
});
