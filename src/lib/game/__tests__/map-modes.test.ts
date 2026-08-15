/**
 * @jest-environment node
 *
 * Wave V4 (docs/VISUAL_DEPTH_2026-08.md §V4) — map-mode lenses.
 * The derivations are PURE and shared by both renderers (SolarMap3D +
 * SolarSystemCanvas), so these tests are the parity guarantee: whatever
 * holds here holds on the WebGL map and the 2D a11y canvas alike.
 */
import {
  MAP_MODES,
  MAP_MODE_MAP,
  MODE_TINT,
  HAZARD_LENS_RECENT_MS,
  cycleMapMode,
  computeLocationPnL,
  computeStandingByLocation,
  computeModeVisuals,
  type MapMode,
} from '../map-modes';
import { ORBITAL_SLOT_POOLS } from '../spatial-strategy';
import type { GameState } from '../types';

const fixedNow = Date.UTC(2026, 7, 15, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 100_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 8 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    ships: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
    frontierStatus: 'graduated',
    ...overrides,
  } as GameState;
}

function completeBuilding(instanceId: string, definitionId: string, locationId: string) {
  return {
    instanceId,
    definitionId,
    locationId,
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 2 },
    isComplete: true,
    startedAtMs: fixedNow - 100_000,
    realDurationSeconds: 60,
  };
}

describe('mode catalog + cycling', () => {
  it('exposes exactly the five spec modes in spec order', () => {
    expect(MAP_MODES.map(m => m.id)).toEqual(['standard', 'economy', 'hazard', 'territory', 'logistics']);
  });

  it('every mode has a text legend and an icon (never color-only)', () => {
    for (const m of MAP_MODES) {
      expect(m.legend.length).toBeGreaterThan(10);
      expect(m.icon.length).toBeGreaterThan(0);
      expect(MAP_MODE_MAP.get(m.id)).toBe(m);
    }
  });

  it('M-key cycling wraps in both directions', () => {
    let mode: MapMode = 'standard';
    const seen: MapMode[] = [];
    for (let i = 0; i < MAP_MODES.length; i++) {
      seen.push(mode);
      mode = cycleMapMode(mode);
    }
    expect(mode).toBe('standard'); // full loop
    expect(new Set(seen).size).toBe(MAP_MODES.length); // hits every mode once
    expect(cycleMapMode('standard', -1)).toBe('logistics'); // reverse wraps
  });
});

describe('economy lens', () => {
  it('computes per-location net P&L from services minus building maintenance', () => {
    const state = makeState({
      buildings: [completeBuilding('b1', 'ground_station', 'earth_surface')],
      activeServices: [{
        definitionId: 'svc_ground_tracking',
        locationId: 'earth_surface',
        linkedBuildingIds: ['b1'],
        startDate: { year: 2026, month: 2 },
        revenueMultiplier: 1,
      }],
    });
    const pnl = computeLocationPnL(state);
    // svc_ground_tracking: $2.0M revenue − $0.6M opcost; ground_station: $0.3M maintenance
    expect(pnl.earth_surface).toBe(2_000_000 - 600_000 - 300_000);
  });

  it('profitable locations get ▲ green, lossy locations ▼ red, with money badges', () => {
    const state = makeState({
      buildings: [
        completeBuilding('b1', 'ground_station', 'earth_surface'),
        completeBuilding('b2', 'ground_station', 'lunar_surface'), // maintenance only → loss
      ],
      activeServices: [{
        definitionId: 'svc_ground_tracking',
        locationId: 'earth_surface',
        linkedBuildingIds: ['b1'],
        startDate: { year: 2026, month: 2 },
        revenueMultiplier: 1,
      }],
    });
    const vis = computeModeVisuals(state, 'economy', fixedNow);
    expect(vis.earth_surface.glyph).toBe('▲');
    expect(vis.earth_surface.tint).toBe(MODE_TINT.profit);
    expect(vis.earth_surface.badge).toMatch(/^\+\$.+\/mo$/);
    expect(vis.earth_surface.srText).toContain('earning');
    expect(vis.lunar_surface.glyph).toBe('▼');
    expect(vis.lunar_surface.tint).toBe(MODE_TINT.loss);
    expect(vis.lunar_surface.badge).toMatch(/^−\$.+\/mo$/);
    // the biggest absolute P&L carries the strongest tint
    expect(vis.earth_surface.intensity).toBeGreaterThanOrEqual(vis.lunar_surface.intensity);
    expect(vis.earth_surface.intensity).toBeLessThanOrEqual(1);
  });

  it('locations with no P&L are absent (render unchanged)', () => {
    const vis = computeModeVisuals(makeState(), 'economy', fixedNow);
    expect(Object.keys(vis)).toHaveLength(0);
  });
});

describe('hazard lens', () => {
  const warning = {
    id: 'w1', type: 'solar_storm' as const, severity: 'severe' as const,
    locationId: 'leo', forecastMonthIndex: 100, issuedAtMs: fixedNow - 1000, summary: 'Severe solar storm expected',
  };
  const strike = {
    id: 'h1', type: 'pirate_raid' as const, locationId: 'asteroid_belt',
    occurredAtMs: fixedNow - 60_000, damagePct: 0.4, mitigatedPct: 0,
    destroyed: false, insurancePayout: 0, summary: 'Raid',
  };

  it('forecasts telegraph amber ⚠, recent strikes red ✸', () => {
    const state = makeState({ hazardWarnings: [warning], recentHazards: [strike] });
    const vis = computeModeVisuals(state, 'hazard', fixedNow);
    expect(vis.leo.glyph).toBe('⚠');
    expect(vis.leo.tint).toBe(MODE_TINT.forecast);
    expect(vis.leo.srText).toContain('forecast next month');
    expect(vis.asteroid_belt.glyph).toBe('✸');
    expect(vis.asteroid_belt.tint).toBe(MODE_TINT.struck);
    expect(vis.asteroid_belt.srText).toContain('recent hazard strike');
  });

  it('struck-and-forecast locations show BOTH glyphs with the struck tint', () => {
    const state = makeState({
      hazardWarnings: [warning, { ...warning, id: 'w2' }],
      recentHazards: [{ ...strike, locationId: 'leo' }],
    });
    const vis = computeModeVisuals(state, 'hazard', fixedNow);
    expect(vis.leo.tint).toBe(MODE_TINT.struck);
    expect(vis.leo.glyph).toContain('✸');
    expect(vis.leo.glyph).toContain('⚠×2');
  });

  it('strikes age out of the lens after HAZARD_LENS_RECENT_MS', () => {
    const stale = { ...strike, occurredAtMs: fixedNow - HAZARD_LENS_RECENT_MS - 1 };
    const vis = computeModeVisuals(makeState({ recentHazards: [stale] }), 'hazard', fixedNow);
    expect(vis.asteroid_belt).toBeUndefined();
  });
});

describe('territory lens', () => {
  it('paints governor ♛ gold at full intensity across the zone, stakeholder ◆ cyan', () => {
    const state = makeState({
      zoneStandings: [{ zoneSlug: 'zone_leo', sharePct: 12, isGovernor: true, taxBaseMonthly: 0 }],
    });
    const vis = computeModeVisuals(state, 'territory', fixedNow);
    // zone_leo covers earth_surface, leo, mercury_surface, venus_orbit
    for (const locId of ['earth_surface', 'leo', 'mercury_surface', 'venus_orbit']) {
      expect(vis[locId].glyph).toBe('♛');
      expect(vis[locId].tint).toBe(MODE_TINT.governor);
      expect(vis[locId].intensity).toBe(1);
      expect(vis[locId].badge).toBe('Governor');
    }
  });

  it('governor precedence over stakeholder on overlap (same rule both renderers use)', () => {
    const state = makeState({
      zoneStandings: [
        { zoneSlug: 'zone_leo', sharePct: 2, isGovernor: false, taxBaseMonthly: 0 },
        { zoneSlug: 'zone_leo', sharePct: 30, isGovernor: true, taxBaseMonthly: 0 },
      ],
    });
    expect(computeStandingByLocation(state).leo).toBe('governor');
    expect(computeModeVisuals(state, 'territory', fixedNow).leo.glyph).toBe('♛');
  });

  it('sub-1% share earns no standing', () => {
    const state = makeState({
      zoneStandings: [{ zoneSlug: 'zone_leo', sharePct: 0.4, isGovernor: false, taxBaseMonthly: 0 }],
    });
    expect(computeModeVisuals(state, 'territory', fixedNow)).toEqual({});
  });
});

describe('logistics lens', () => {
  it('marks chokepoints ⇄ with lane counts and orbital-slot pools ◍ with occupancy', () => {
    const state = makeState({
      buildings: [
        completeBuilding('g1', 'sat_telecom', 'geo'),
        completeBuilding('g2', 'sat_telecom', 'geo'),
      ],
    });
    const vis = computeModeVisuals(state, 'logistics', fixedNow);
    // LEO is the ultimate chokepoint (most lanes touch it)
    expect(vis.leo.glyph).toContain('⇄');
    expect(vis.leo.intensity).toBe(1);
    expect(vis.leo.badge).toMatch(/\d+ lanes/);
    // GEO is a finite slot pool — occupancy badge from player buildings
    const geoPool = ORBITAL_SLOT_POOLS.find(p => p.locationId === 'geo')!;
    expect(vis.geo.glyph).toContain('◍');
    expect(vis.geo.badge).toBe(`2/${geoPool.totalSlots} slots`);
    expect(vis.geo.tint).toBe(MODE_TINT.slots);
  });

  it('live in-transit traffic shows on lane endpoints as ⇄×n', () => {
    const state = makeState({
      ships: [{
        instanceId: 's1', definitionId: 'ship_cargo_hauler', isBuilt: true,
        status: 'in_transit', currentLocation: 'leo',
        route: { from: 'leo', to: 'lunar_orbit', departedAtMs: fixedNow - 1000, arrivalAtMs: fixedNow + 60_000 },
      }] as GameState['ships'],
    });
    const vis = computeModeVisuals(state, 'logistics', fixedNow);
    expect(vis.leo.glyph).toContain('⇄×1');
    expect(vis.leo.srText).toContain('1 of your ships in transit');
  });
});

describe('standard mode + a11y invariants', () => {
  it('standard returns an empty record (no repaint)', () => {
    const state = makeState({
      buildings: [completeBuilding('b1', 'ground_station', 'earth_surface')],
      hazardWarnings: [{ id: 'w', type: 'solar_storm', severity: 'severe', locationId: 'leo', forecastMonthIndex: 1, issuedAtMs: fixedNow, summary: 's' }],
    });
    expect(computeModeVisuals(state, 'standard', fixedNow)).toEqual({});
  });

  it('every visual in every mode carries text (glyph + srText) — never color alone', () => {
    const state = makeState({
      buildings: [
        completeBuilding('b1', 'ground_station', 'earth_surface'),
        completeBuilding('g1', 'sat_telecom', 'geo'),
      ],
      activeServices: [{
        definitionId: 'svc_ground_tracking', locationId: 'earth_surface',
        linkedBuildingIds: ['b1'], startDate: { year: 2026, month: 2 }, revenueMultiplier: 1,
      }],
      hazardWarnings: [{ id: 'w', type: 'solar_storm', severity: 'severe', locationId: 'leo', forecastMonthIndex: 1, issuedAtMs: fixedNow, summary: 's' }],
      zoneStandings: [{ zoneSlug: 'zone_leo', sharePct: 5, isGovernor: false, taxBaseMonthly: 0 }],
    });
    for (const mode of ['economy', 'hazard', 'territory', 'logistics'] as MapMode[]) {
      const vis = computeModeVisuals(state, mode, fixedNow);
      expect(Object.keys(vis).length).toBeGreaterThan(0);
      for (const v of Object.values(vis)) {
        expect(v.glyph.length).toBeGreaterThan(0);
        expect(v.srText.length).toBeGreaterThan(0);
        expect(v.tint).toMatch(/^#[0-9a-f]{6}$/i);
        expect(v.intensity).toBeGreaterThan(0);
        expect(v.intensity).toBeLessThanOrEqual(1);
      }
    }
  });
});
