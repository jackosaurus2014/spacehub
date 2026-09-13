// Markets ▸ Sourcing (2026-09-12): the pure row model behind SourcingPanel.
// Guards: consuming buildings listed, non-consuming skipped, months-of-cover
// math (weakest input, engine's own pool), short/covered/on-market status,
// under-construction and mothballed rows dimmed (inactive), grouping, and
// the Dashboard's short count.

import { buildSourcingRows, countBuildingsShortOnInputs, groupSourcingRowsByLocation } from '../sourcing';
import { DEFAULT_CONSUMPTION_STATE } from '../consumption';
import { BUILDING_MAP } from '../buildings';
import { getNewGameState } from '../save-load';
import type { GameState, BuildingInstance } from '../types';

function makeBuilding(partial: Partial<BuildingInstance> & { instanceId: string; definitionId: string; locationId: string }): BuildingInstance {
  return {
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 6 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 0,
    ...partial,
  };
}

/** No phase-in (fresh game), no research — effective draw == authored draw. */
function baseState(overrides: Partial<GameState> = {}): GameState {
  const s = getNewGameState();
  return {
    ...s,
    completedResearch: [],
    consumptionState: { ...DEFAULT_CONSUMPTION_STATE, lastProcessedMonth: 4999 },
    resources: {},
    locationInventories: {},
    ...overrides,
  };
}

describe('buildSourcingRows', () => {
  it('lists a consuming building and skips buildings with no recipe inputs', () => {
    expect(BUILDING_MAP.get('launch_pad_small')?.consumesPerMonth).toEqual({ rocket_fuel: 10 });
    expect(BUILDING_MAP.get('mining_lunar_basic')?.consumesPerMonth).toBeUndefined();
    const state = baseState({
      buildings: [
        makeBuilding({ instanceId: 'pad', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
        makeBuilding({ instanceId: 'mine', definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' }),
      ],
      resources: { rocket_fuel: 25 },
    });
    const rows = buildSourcingRows(state);
    expect(rows.map(r => r.instanceId)).toEqual(['pad']);
    const pad = rows[0];
    expect(pad.buildingName).toBe('Small Launch Pad');
    expect(pad.locationId).toBe('earth_surface');
    expect(pad.policy).toBe('local');
    expect(pad.inputs).toEqual([
      { resourceId: 'rocket_fuel', name: expect.any(String), perMonth: 10, stock: 25, coverMonths: 2.5 },
    ]);
  });

  it('months of cover is stock ÷ monthly need, weakest input wins, and < 1 month is "short"', () => {
    // T4 reactor consumes two inputs — cover is the weaker of the two.
    expect(BUILDING_MAP.get('nuclear_reactor_jupiter')?.consumesPerMonth).toEqual({ helium3: 0.2, deuterium: 0.5 });
    const covered = baseState({
      buildings: [makeBuilding({ instanceId: 'r', definitionId: 'nuclear_reactor_jupiter', locationId: 'earth_surface' })],
      resources: { helium3: 1, deuterium: 5 },
    });
    const row = buildSourcingRows(covered)[0];
    expect(row.inputs.find(i => i.resourceId === 'helium3')?.coverMonths).toBe(5);
    expect(row.inputs.find(i => i.resourceId === 'deuterium')?.coverMonths).toBe(10);
    expect(row.monthsOfCover).toBe(5);
    expect(row.status).toBe('covered');

    const short = baseState({
      buildings: [makeBuilding({ instanceId: 'r', definitionId: 'nuclear_reactor_jupiter', locationId: 'earth_surface' })],
      resources: { helium3: 0.1, deuterium: 5 },
    });
    const shortRow = buildSourcingRows(short)[0];
    expect(shortRow.monthsOfCover).toBe(0.5);
    expect(shortRow.status).toBe('short');
  });

  it('a standing market order reports "market" with no months-of-cover figure', () => {
    const state = baseState({
      buildings: [makeBuilding({ instanceId: 'pad', definitionId: 'launch_pad_small', locationId: 'earth_surface', supplyPolicy: 'market' })],
      resources: {}, // nothing on hand — the market covers it
    });
    const row = buildSourcingRows(state)[0];
    expect(row.policy).toBe('market');
    expect(row.status).toBe('market');
    expect(row.monthsOfCover).toBeNull();
    // Per-input cover is still computed for the "on hand" column.
    expect(row.inputs[0].coverMonths).toBe(0);
  });

  it('reads the pool the engine draws from: Earth pool until logistics unlock, the location stockpile after', () => {
    const bld = makeBuilding({ instanceId: 'pad', definitionId: 'launch_pad_small', locationId: 'lunar_surface' });
    const before = baseState({
      buildings: [bld],
      logisticsUnlocked: false,
      resources: { rocket_fuel: 30 },
      locationInventories: { lunar_surface: { rocket_fuel: 5 } },
    });
    expect(buildSourcingRows(before)[0].inputs[0].stock).toBe(30);
    expect(buildSourcingRows(before)[0].status).toBe('covered');

    const after = { ...before, logisticsUnlocked: true };
    expect(buildSourcingRows(after)[0].inputs[0].stock).toBe(5);
    expect(buildSourcingRows(after)[0].status).toBe('short');
  });

  it('under-construction and mothballed buildings are listed but inactive (dimmed), never "short"', () => {
    const state = baseState({
      buildings: [
        makeBuilding({ instanceId: 'wip', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: false }),
        makeBuilding({ instanceId: 'parked', definitionId: 'launch_pad_small', locationId: 'earth_surface', status: 'mothballed' }),
        makeBuilding({ instanceId: 'live', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
      ],
      resources: {}, // everyone is short on paper
    });
    const rows = buildSourcingRows(state);
    const byId = Object.fromEntries(rows.map(r => [r.instanceId, r]));
    expect(byId.wip.status).toBe('inactive');
    expect(byId.wip.inactiveReason).toBe('building');
    expect(byId.wip.operational).toBe(false);
    expect(byId.parked.status).toBe('inactive');
    expect(byId.parked.inactiveReason).toBe('mothballed');
    expect(byId.live.status).toBe('short');
    expect(byId.live.inactiveReason).toBeNull();
  });

  it('groups rows by location in a stable order', () => {
    const state = baseState({
      buildings: [
        makeBuilding({ instanceId: 'b', definitionId: 'launch_pad_small', locationId: 'mars_surface' }),
        makeBuilding({ instanceId: 'a', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
        makeBuilding({ instanceId: 'c', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
      ],
    });
    const groups = groupSourcingRowsByLocation(buildSourcingRows(state));
    expect(groups.map(g => g.locationId)).toEqual(['earth_surface', 'mars_surface']);
    expect(groups[0].rows.map(r => r.instanceId)).toEqual(['a', 'c']);
    expect(groups[0].locationName).not.toBe('earth_surface'); // resolved to a display name
  });
});

describe('countBuildingsShortOnInputs (Dashboard attention line)', () => {
  it('counts only operational, local-policy buildings under a month of cover', () => {
    const state = baseState({
      buildings: [
        makeBuilding({ instanceId: 'short1', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
        makeBuilding({ instanceId: 'short2', definitionId: 'launch_pad_small', locationId: 'earth_surface' }),
        makeBuilding({ instanceId: 'market', definitionId: 'launch_pad_small', locationId: 'earth_surface', supplyPolicy: 'market' }),
        makeBuilding({ instanceId: 'parked', definitionId: 'launch_pad_small', locationId: 'earth_surface', status: 'mothballed' }),
      ],
      resources: { rocket_fuel: 3 },
    });
    expect(countBuildingsShortOnInputs(state)).toBe(2);
    expect(countBuildingsShortOnInputs({ ...state, resources: { rocket_fuel: 100 } })).toBe(0);
    expect(countBuildingsShortOnInputs({ ...state, buildings: [] })).toBe(0);
  });
});
