/**
 * @jest-environment node
 */
import type { GameState } from '../types';
import {
  LANES,
  LANE_MAP,
  ORBITAL_SLOT_POOLS,
  computeChokepoints,
  computeLaneTraffic,
  computeOrbitalSlotReport,
  countPlayerBuildingsAt,
} from '../spatial-strategy';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: 0, lastTickAt: 0,
    money: 0, totalEarned: 0, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'], resources: {}, eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  };
}

describe('spatial-strategy — lane definitions', () => {
  it('at least 20 lanes defined', () => {
    expect(LANES.length).toBeGreaterThanOrEqual(20);
  });

  it('all lane IDs unique', () => {
    const ids = new Set(LANES.map(l => l.id));
    expect(ids.size).toBe(LANES.length);
  });

  it('LANE_MAP is consistent with LANES', () => {
    expect(LANE_MAP.size).toBe(LANES.length);
    for (const lane of LANES) {
      expect(LANE_MAP.get(lane.id)).toBe(lane);
    }
  });

  it('every lane has positive delta-v and travel time', () => {
    for (const lane of LANES) {
      expect(lane.deltaV).toBeGreaterThan(0);
      expect(lane.travelDays).toBeGreaterThan(0);
    }
  });

  it('every lane has a valid category', () => {
    const valid = new Set(['orbital', 'cislunar', 'interplanetary', 'outer', 'deep']);
    for (const lane of LANES) {
      expect(valid.has(lane.category)).toBe(true);
    }
  });
});

describe('spatial-strategy — chokepoints', () => {
  it('LEO is the top critical chokepoint', () => {
    const chokes = computeChokepoints();
    expect(chokes.length).toBeGreaterThan(0);
    expect(chokes[0].locationId).toBe('leo');
    expect(chokes[0].severity).toBe('critical');
  });

  it('chokepoints are sorted by lane count descending', () => {
    const chokes = computeChokepoints();
    for (let i = 1; i < chokes.length; i++) {
      expect(chokes[i - 1].laneCount).toBeGreaterThanOrEqual(chokes[i].laneCount);
    }
  });

  it('severity matches lane count thresholds', () => {
    for (const c of computeChokepoints()) {
      if (c.laneCount >= 6) expect(c.severity).toBe('critical');
      else if (c.laneCount >= 3) expect(c.severity).toBe('major');
      else expect(c.severity).toBe('minor');
    }
  });

  it('every lane contributes to exactly 2 chokepoint entries', () => {
    const chokes = computeChokepoints();
    const totalReferences = chokes.reduce((sum, c) => sum + c.laneIds.length, 0);
    expect(totalReferences).toBe(LANES.length * 2);  // from + to for each lane
  });
});

describe('spatial-strategy — orbital slot pools', () => {
  it('all four expected pools exist', () => {
    const ids = ORBITAL_SLOT_POOLS.map(p => p.locationId);
    expect(ids).toEqual(expect.arrayContaining(['geo', 'lunar_orbit', 'mars_orbit', 'jupiter_system']));
  });

  it('each pool has a positive total slot count', () => {
    for (const p of ORBITAL_SLOT_POOLS) {
      expect(p.totalSlots).toBeGreaterThan(0);
    }
  });

  it('GEO has the largest slot pool', () => {
    const geo = ORBITAL_SLOT_POOLS.find(p => p.locationId === 'geo');
    expect(geo!.totalSlots).toBe(180);
  });
});

describe('spatial-strategy — player-perspective computations', () => {
  it('countPlayerBuildingsAt counts only completed buildings at the location', () => {
    const s = baseState({
      buildings: [
        { instanceId: '1', definitionId: 'x', locationId: 'geo', buildStartDate: { year: 0, month: 0 }, completionDate: { year: 0, month: 0 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 0 },
        { instanceId: '2', definitionId: 'x', locationId: 'geo', buildStartDate: { year: 0, month: 0 }, completionDate: { year: 0, month: 0 }, isComplete: false, startedAtMs: 0, realDurationSeconds: 0 },
        { instanceId: '3', definitionId: 'x', locationId: 'leo', buildStartDate: { year: 0, month: 0 }, completionDate: { year: 0, month: 0 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 0 },
      ],
    });
    expect(countPlayerBuildingsAt(s, 'geo')).toBe(1);
    expect(countPlayerBuildingsAt(s, 'leo')).toBe(1);
    expect(countPlayerBuildingsAt(s, 'mars_orbit')).toBe(0);
  });

  it('computeLaneTraffic flags unlocked-endpoint lanes', () => {
    const s = baseState({ unlockedLocations: ['earth_surface', 'leo'] });
    const traffic = computeLaneTraffic(s);
    const earthLeo = traffic.find(t => t.lane.id === 'earth_leo');
    expect(earthLeo!.bothLocationsUnlocked).toBe(true);
    const leoMars = traffic.find(t => t.lane.id === 'leo_mars_orbit');
    expect(leoMars!.bothLocationsUnlocked).toBe(false);
  });

  it('computeLaneTraffic counts in-transit ships', () => {
    const s = baseState({
      ships: [
        {
          instanceId: 's1', definitionId: 'freighter', name: 'Alpha',
          status: 'in_transit', currentLocation: 'leo', isBuilt: true,
          route: { from: 'leo', to: 'lunar_orbit', departedAtMs: 0, arrivalAtMs: 1e15, cargo: {} },
        },
      ],
      unlockedLocations: ['earth_surface', 'leo', 'lunar_orbit'],
    });
    const traffic = computeLaneTraffic(s);
    const leoLunar = traffic.find(t => t.lane.id === 'leo_lunar_orbit');
    expect(leoLunar!.inTransit).toBe(1);
  });

  it('computeOrbitalSlotReport returns a report per pool', () => {
    const s = baseState();
    const report = computeOrbitalSlotReport(s);
    expect(report).toHaveLength(ORBITAL_SLOT_POOLS.length);
    for (const r of report) {
      expect(r.playerOccupied).toBe(0);
      expect(r.playerOccupancyPct).toBe(0);
    }
  });

  it('computeOrbitalSlotReport reports player occupancy', () => {
    const s = baseState({
      buildings: [
        { instanceId: '1', definitionId: 'x', locationId: 'geo', buildStartDate: { year: 0, month: 0 }, completionDate: { year: 0, month: 0 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 0 },
        { instanceId: '2', definitionId: 'x', locationId: 'geo', buildStartDate: { year: 0, month: 0 }, completionDate: { year: 0, month: 0 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 0 },
      ],
    });
    const report = computeOrbitalSlotReport(s);
    const geo = report.find(r => r.pool.locationId === 'geo');
    expect(geo!.playerOccupied).toBe(2);
    expect(geo!.playerOccupancyPct).toBeCloseTo((2 / 180) * 100);
  });
});
