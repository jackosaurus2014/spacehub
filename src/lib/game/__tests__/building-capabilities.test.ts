/**
 * @jest-environment node
 *
 * Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md):
 * buildings have uses beyond revenue. Every capability is a bounded modifier
 * into an EXISTING formula. These tests prove:
 *  - scoping (location vs global) and central caps
 *  - operational gating (mothballed copies contribute nothing)
 *  - each consumer hook actually moves its formula, within bounds
 */
import {
  CAPABILITY_CAPS,
  getLocationCapabilityBonus,
  getGlobalCapabilityBonus,
  getCapabilityCrewQuarters,
  getCapabilityShipyardSlots,
  getDetectionBonusFromBuildingList,
  getCapabilityChipsForDefinition,
  summarizeCapabilities,
} from '../building-capabilities';
import { getBuildingHazardMitigation, getShipHazardMitigation, rollLocationInventoryShocks, MITIGATION_CAP } from '../hazards';
import { getFreightFuelCost } from '../cargo-logistics';
import { enqueueProgram, PROGRAM_DEF_MAP } from '../programs';
import { getAwayEfficiencyInvestmentBonus } from '../away-operations';
import { shiftReputation } from '../factions';
import { getCrewCapacity } from '../workforce';
import { getShipyardSlots } from '../shipyard-slots';
import { executeEspionageAction, type AttackerProfile, type TargetEspionageProfile, type TargetGameProfile } from '../espionage-system';
import { BUILDINGS, BUILDING_MAP } from '../buildings';
import type { GameState, BuildingInstance } from '../types';

const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0);

let instSeq = 0;
function bld(definitionId: string, locationId: string, extra: Partial<BuildingInstance> = {}): BuildingInstance {
  return {
    instanceId: `bld_${definitionId}_${instSeq++}`,
    definitionId,
    locationId,
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 2 },
    isComplete: true,
    startedAtMs: fixedNow - 100_000,
    realDurationSeconds: 60,
    ...extra,
  } as BuildingInstance;
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 100_000_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 3 },
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
    insuranceActive: false,
    ...overrides,
  } as GameState;
}

// ─── Content sanity ─────────────────────────────────────────────────────────

describe('capability content coverage', () => {
  it('every previously revenue-only building now has at least one capability', () => {
    // The founder's complaint list: buildings whose ONLY purpose was an
    // enabled revenue service (no power, no production, no zone category).
    const revenueOnlyIds = [
      'launch_pad_small', 'launch_pad_medium', 'launch_pad_heavy',
      'ground_station', 'mission_control',
      'sat_telecom', 'sat_sensor', 'sat_telecom_geo', 'sat_sensor_geo',
      'datacenter_orbital', 'datacenter_mars_orbit', 'datacenter_jupiter',
      'sat_lunar_relay', 'sat_mars_relay', 'deep_space_relay',
    ];
    for (const id of revenueOnlyIds) {
      const def = BUILDING_MAP.get(id)!;
      expect(def).toBeDefined();
      const caps = Object.entries(def.capabilities || {}).filter(([, v]) => (v as number) > 0);
      expect(caps.length).toBeGreaterThan(0);
    }
  });

  it('all authored capability values are positive and individually below their cap', () => {
    for (const def of BUILDINGS) {
      for (const [key, value] of Object.entries(def.capabilities || {})) {
        expect(value).toBeGreaterThan(0);
        if (key !== 'crewQuarters' && key !== 'shipyardSlots') {
          const cap = CAPABILITY_CAPS[key as keyof typeof CAPABILITY_CAPS];
          expect(value).toBeLessThanOrEqual(cap);
        }
      }
    }
  });

  it('every capability def has UI chip metadata + a summary line', () => {
    for (const def of BUILDINGS) {
      const capCount = Object.entries(def.capabilities || {}).filter(([, v]) => (v as number) > 0).length;
      const chips = getCapabilityChipsForDefinition(def.id);
      expect(chips.length).toBe(capCount);
      if (capCount > 0) {
        expect(summarizeCapabilities(def.id)).toBeTruthy();
      } else {
        expect(summarizeCapabilities(def.id)).toBeNull();
      }
    }
  });
});

// ─── Scoping, caps, gating ──────────────────────────────────────────────────

describe('scoping and caps', () => {
  it('location capability only counts buildings AT that location', () => {
    const s = makeState({ buildings: [bld('space_station_small', 'leo')] });
    expect(getLocationCapabilityBonus(s, 'leo', 'hazardShielding')).toBeCloseTo(0.03);
    expect(getLocationCapabilityBonus(s, 'geo', 'hazardShielding')).toBe(0);
  });

  it('stacking copies is additive but capped (hazardShielding ≤ 0.12)', () => {
    const many = makeState({
      buildings: Array.from({ length: 10 }, () => bld('space_station_small', 'leo')),
    });
    expect(getLocationCapabilityBonus(many, 'leo', 'hazardShielding')).toBeCloseTo(CAPABILITY_CAPS.hazardShielding);
  });

  it('global capability sums across locations and is capped', () => {
    const s = makeState({
      buildings: [
        bld('mission_control', 'earth_surface'),  // trainingSpeed 0.10
        bld('habitat_lunar', 'lunar_surface'),    // trainingSpeed 0.05
        bld('habitat_mars', 'mars_surface'),      // trainingSpeed 0.08
        bld('habitat_mars', 'mars_surface'),      // +0.08 → raw 0.31 > cap
      ],
    });
    expect(getGlobalCapabilityBonus(s, 'trainingSpeed')).toBeCloseTo(CAPABILITY_CAPS.trainingSpeed);
  });

  it('incomplete and mothballed buildings contribute nothing', () => {
    const s = makeState({
      buildings: [
        bld('space_station_small', 'leo', { isComplete: false }),
        bld('space_station_small', 'leo', { status: 'mothballed' } as Partial<BuildingInstance>),
      ],
    });
    expect(getLocationCapabilityBonus(s, 'leo', 'hazardShielding')).toBe(0);
    expect(getCapabilityCrewQuarters(s)).toBe(0);
  });

  it('crewQuarters sums per copy; shipyardSlots counts once per definition', () => {
    const s = makeState({
      buildings: [
        bld('habitat_lunar', 'lunar_surface'),   // crew 4
        bld('habitat_lunar', 'lunar_surface'),   // crew 4
        bld('launch_pad_heavy', 'earth_surface'),   // shipyard 1
        bld('launch_pad_heavy', 'earth_surface'),   // dup — no extra slot
        bld('fabrication_orbital', 'leo'),          // shipyard 1
      ],
    });
    expect(getCapabilityCrewQuarters(s)).toBe(8);
    const yard = getCapabilityShipyardSlots(s);
    expect(yard.slots).toBe(2);
    expect(yard.sources.sort()).toEqual(['fabrication_orbital', 'launch_pad_heavy']);
  });
});

// ─── Consumer hooks ─────────────────────────────────────────────────────────

describe('hazard mitigation umbrella', () => {
  it('a station raises building mitigation for co-located assets, still under MITIGATION_CAP', () => {
    const bare = makeState({ buildings: [bld('sat_telecom', 'leo')] });
    const shielded = makeState({ buildings: [bld('sat_telecom', 'leo'), bld('space_station_small', 'leo')] });
    const m0 = getBuildingHazardMitigation(bare, 'sat_telecom', 'leo');
    const m1 = getBuildingHazardMitigation(shielded, 'sat_telecom', 'leo');
    expect(m1 - m0).toBeCloseTo(0.03, 5);
    expect(m1).toBeLessThanOrEqual(MITIGATION_CAP);
  });

  it('ships under the umbrella benefit too; omitting locationId reproduces pre-wave math', () => {
    const s = makeState({
      buildings: [bld('space_station_belt', 'asteroid_belt')],
      ships: [{ instanceId: 'ship1', definitionId: 'prospector_drone', name: 'P-1', status: 'idle', currentLocation: 'asteroid_belt', isBuilt: true }] as GameState['ships'],
    });
    const without = getShipHazardMitigation(s, 'ship1', 'solar_storm');
    const withUmbrella = getShipHazardMitigation(s, 'ship1', 'solar_storm', 'asteroid_belt');
    expect(withUmbrella - without).toBeCloseTo(0.05, 5);
  });
});

describe('inventory shock buffering', () => {
  it('hardened storage reduces shock losses at the protected location only', () => {
    const inventories = { asteroid_belt: { iron: 10_000 } };
    const bare = makeState({ locationInventories: inventories } as Partial<GameState>);
    const hardened = makeState({
      locationInventories: inventories,
      buildings: [bld('fabrication_asteroid', 'asteroid_belt')], // inventoryProtection 0.15
    } as Partial<GameState>);

    // Find a month with a shock at the belt, then compare losses.
    for (let m = 0; m < 5_000; m++) {
      const shocksBare = rollLocationInventoryShocks(bare, m, fixedNow);
      const beltShock = shocksBare.find(r => r.locationId === 'asteroid_belt');
      if (!beltShock) continue;
      const shocksHardened = rollLocationInventoryShocks(hardened, m, fixedNow);
      const hardenedShock = shocksHardened.find(r => r.locationId === 'asteroid_belt' && r.type === beltShock.type);
      expect(hardenedShock).toBeDefined();
      expect(hardenedShock!.qtyLost).toBeLessThan(beltShock.qtyLost);
      // 15% protection → ~15% fewer units lost (floor rounding tolerance)
      expect(hardenedShock!.qtyLost).toBeGreaterThan(0);
      return;
    }
    throw new Error('no belt inventory shock found in 5000 months (unexpected)');
  });
});

describe('freight fuel discount', () => {
  const ship = { instanceId: 'ship1', definitionId: 'cargo_shuttle', name: 'C-1', status: 'idle', currentLocation: 'leo', isBuilt: true };
  it('endpoint logistics infrastructure cuts the fuel bill, capped at 15%', () => {
    const base = makeState({ ships: [ship] as GameState['ships'] });
    const withPads = makeState({
      ships: [ship] as GameState['ships'],
      buildings: [
        bld('launch_pad_heavy', 'earth_surface'),      // 0.06 at origin
        bld('propellant_plant_lunar', 'lunar_surface'), // 0.05 — not an endpoint here
      ],
    });
    const c0 = getFreightFuelCost(base, 'ship1', 'earth_surface', 'leo', { iron: 10 });
    const c1 = getFreightFuelCost(withPads, 'ship1', 'earth_surface', 'leo', { iron: 10 });
    expect(c1).toBeLessThan(c0);
    expect(c1 / c0).toBeCloseTo(0.94, 2);
  });

  it('origin + destination discounts combine but never exceed the cap', () => {
    const stacked = makeState({
      ships: [ship] as GameState['ships'],
      buildings: [
        bld('launch_pad_small', 'earth_surface'),  // 0.03
        bld('launch_pad_medium', 'earth_surface'), // 0.05
        bld('launch_pad_heavy', 'earth_surface'),  // 0.06
        bld('propellant_plant_lunar', 'lunar_surface'), // 0.05 → raw total 0.19
      ],
    });
    const base = makeState({ ships: [ship] as GameState['ships'] });
    const c0 = getFreightFuelCost(base, 'ship1', 'earth_surface', 'lunar_surface', {});
    const c1 = getFreightFuelCost(stacked, 'ship1', 'earth_surface', 'lunar_surface', {});
    expect(c1 / c0).toBeCloseTo(1 - CAPABILITY_CAPS.logisticsSupport, 2);
  });
});

describe('training program acceleration', () => {
  it('Mission Control shortens a queued cohort program by its trainingSpeed', () => {
    const def = PROGRAM_DEF_MAP.get('eva_certification_cohort')!;
    const base = makeState({ workforce: { engineers: 0, scientists: 0, miners: 5, operators: 0 } });
    const withMc = makeState({
      workforce: { engineers: 0, scientists: 0, miners: 5, operators: 0 },
      buildings: [bld('mission_control', 'earth_surface')], // trainingSpeed 0.10
    });
    const r0 = enqueueProgram(base, 'crew_cohort', 'eva_certification_cohort', {}, fixedNow);
    const r1 = enqueueProgram(withMc, 'crew_cohort', 'eva_certification_cohort', {}, fixedNow);
    expect(r0.ok && r1.ok).toBe(true);
    const d0 = r0.state.programs!.queues.crew_cohort[0].durationMs;
    const d1 = r1.state.programs!.queues.crew_cohort[0].durationMs;
    expect(d0).toBe(def.durationDays * 24 * 60 * 60 * 1000);
    expect(d1 / d0).toBeCloseTo(0.90, 5);
  });
});

describe('away automation', () => {
  it('relay/ops buildings add to the away-efficiency investment bonus, capped', () => {
    const base = makeState({});
    const wired = makeState({
      buildings: [
        bld('mission_control', 'earth_surface'), // 0.03
        bld('deep_space_relay', 'outer_system'), // 0.04
        bld('sat_mars_relay', 'mars_orbit'),     // 0.03 → raw 0.10 > cap 0.08
      ],
    });
    const b0 = getAwayEfficiencyInvestmentBonus(base);
    const b1 = getAwayEfficiencyInvestmentBonus(wired);
    expect(b1 - b0).toBeCloseTo(CAPABILITY_CAPS.awayAutomation, 5);
  });
});

describe('diplomacy amplification', () => {
  it('positive rep gains are amplified; losses and rival penalties are not', () => {
    const base = makeState({});
    const embassy = makeState({
      buildings: [
        bld('space_station_lunar', 'lunar_orbit'),  // diplomacy 0.04
        bld('outpost_outer', 'outer_system'),       // diplomacy 0.08
      ],
    });
    const gain0 = shiftReputation(base, 'the-dominion', 10).factionReputation!['the-dominion'];
    const gain1 = shiftReputation(embassy, 'the-dominion', 10).factionReputation!['the-dominion'];
    expect(gain0).toBe(10);
    expect(gain1).toBe(11); // round(10 × 1.12)
    // Rival penalty keyed to the ORIGINAL delta in both cases
    const rival0 = shiftReputation(base, 'the-dominion', 10).factionReputation!['void-corsairs'];
    const rival1 = shiftReputation(embassy, 'the-dominion', 10).factionReputation!['void-corsairs'];
    expect(rival1).toBe(rival0);
    // Losses never softened
    const loss1 = shiftReputation(embassy, 'the-dominion', -10).factionReputation!['the-dominion'];
    expect(loss1).toBe(-10);
  });
});

describe('crew capacity and shipyard slots', () => {
  it('capability crew quarters raise total capacity with a breakdown row', () => {
    const cap0 = getCrewCapacity(5, 2, 3, 0, 0);
    const cap1 = getCrewCapacity(5, 2, 3, 0, 8);
    expect(cap1.total - cap0.total).toBe(8);
    expect(cap1.breakdown.some(b => b.source === 'Habitat crew quarters' && b.amount === 8)).toBe(true);
  });

  it('shipyard-capable buildings add construction slots (MAX 8 binds)', () => {
    const base = makeState({ corporationTier: 1 });
    const withYards = makeState({
      corporationTier: 1,
      buildings: [bld('launch_pad_heavy', 'earth_surface'), bld('fabrication_orbital', 'leo')],
    });
    expect(getShipyardSlots(withYards) - getShipyardSlots(base)).toBe(2);
  });
});

describe('espionage detection bonus', () => {
  const attacker: AttackerProfile = { netWorth: 1_000_000_000, completedResearch: [] };
  const targetEsp: TargetEspionageProfile = {
    netWorth: 1_000_000_000, securityLevel: 0, heightenedAlert: false, alertExpiresAt: null, blacklist: [],
  };
  function targetProfile(buildingsData: unknown[]): TargetGameProfile {
    return {
      id: 't1', companyName: 'Target Corp', netWorth: 1_000_000_000, money: 0, totalEarned: 0,
      buildingCount: buildingsData.length, researchCount: 0, serviceCount: 0, locationsUnlocked: 1,
      resources: {}, completedResearchList: [], buildingsData,
      activeServicesData: [], workforceData: null, shipsData: [],
    } as TargetGameProfile;
  }

  it('sensor buildings raise the detection rate from raw buildingsData', () => {
    expect(getDetectionBonusFromBuildingList([])).toBe(0);
    const sensors = [
      { definitionId: 'ground_station', isComplete: true },     // 0.02
      { definitionId: 'sat_sensor', isComplete: true },         // 0.03
      { definitionId: 'sat_sensor_geo', isComplete: true },     // 0.04
      { definitionId: 'sat_sensor_geo', isComplete: true },     // 0.04 → capped 0.10
      { definitionId: 'sat_sensor', isComplete: false },        // ignored
      { definitionId: 'sat_sensor', isComplete: true, status: 'mothballed' }, // ignored
      { junk: true },                                            // ignored
    ];
    expect(getDetectionBonusFromBuildingList(sensors)).toBeCloseTo(CAPABILITY_CAPS.detectionBonus, 5);

    const r0 = executeEspionageAction('scout', attacker, targetEsp, targetProfile([]));
    const r1 = executeEspionageAction('scout', attacker, targetEsp, targetProfile(sensors));
    expect(r1.detectionRate - r0.detectionRate).toBeCloseTo(0.10, 5);
    expect(r1.detectionRate).toBeLessThanOrEqual(0.95);
  });
});
