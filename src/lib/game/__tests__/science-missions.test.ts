/**
 * @jest-environment node
 *
 * 4X Upgrade Wave W6 — flagship scientific missions (docs/4X_BASELINE_2026-08.md
 * Part 2b). Covers:
 *  - Content integrity: 12 programs, real research prerequisites, valid
 *    instrument references, every discovery reachable by a legal loadout,
 *    and NO dominant loadout (no single 3-instrument combo sweeps a table).
 *  - Planning validation + cost quoting (mass budget, research gates, tier
 *    gates, duplicate-program guard, insurance math).
 *  - Program lifecycle: design → build → launch roll → cruise → science ops
 *    → completion / extended ops, with catch-up processing.
 *  - Launch failure + insurance payout (deterministic seed scan).
 *  - Instrument tradeoffs: discovery tables are instrument-gated; rare-tech
 *    and mining-buff payoffs land through the wired hooks.
 *  - Milestone first-claim eligibility (instrument-gated).
 *  - Sentinel forecast-horizon extension + post-roll damage multipliers.
 *  - Expedition science bonuses (heliopause charting).
 *  - ISO interceptor wait/window mechanics.
 *  - NPC co-funding determinism + settlement.
 *  - Determinism (identical runs, big-jump == stepped catch-up).
 *  - V18 save migration (additive fields).
 */
import {
  SCIENCE_PROGRAMS,
  SCIENCE_PROGRAM_MAP,
  planScienceMission,
  startScienceMission,
  processScienceMissionTick,
  getPhaseBoundaries,
  getForecastHorizonMonths,
  getScienceHazardDamageMultipliers,
  getExpeditionScienceBonuses,
  getIsoWindowProb,
  getNpcProgramStatuses,
  getNpcSettlementMultiplier,
  coFundNpcProgram,
  isDiscoveryReachable,
  getActiveMissionForProgram,
  getScienceMissionProgress,
  getTotalGameMonths,
  markMilestoneClaimAttempted,
  INSTRUMENTS_PER_MISSION,
  SCIENCE_INSURANCE_PREMIUM_RATE,
  SCIENCE_INSURANCE_PAYOUT_RATE,
  ISO_INTERCEPT_OPS_MONTHS,
  NPC_PROGRAMS,
} from '../science-missions';
import { RESEARCH_MAP } from '../research-tree';
import { getNewGameState, loadGame } from '../save-load';
import { SAVE_KEY } from '../constants';
import type { GameState, ScienceMissionState } from '../types';

const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 200_000_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 1 },
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
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, morale: 1.0 },
    corporationTier: 5,
    reputation: 0,
    miningBonuses: [],
    unlockedRareTechIds: [],
    scienceMissions: [],
    npcProgramContributions: [],
    ...overrides,
  } as GameState;
}

/** Set the calendar so getTotalGameMonths(state.gameDate) === monthIndex. */
function atMonth(state: GameState, monthIndex: number): GameState {
  return {
    ...state,
    gameDate: { year: 2026 + Math.floor(monthIndex / 12), month: (monthIndex % 12) + 1 },
  };
}

const EUROPA = SCIENCE_PROGRAM_MAP.get('europa_ocean_access')!;
const DART = SCIENCE_PROGRAM_MAP.get('kinetic_deflection_demo')!;
const SENTINELS = SCIENCE_PROGRAM_MAP.get('heliophysics_sentinels')!;

/** Start a mission with prerequisites satisfied, at month 0. */
function startProgram(
  programId: string,
  instrumentIds: string[],
  seed: number,
  opts: { insured?: boolean; money?: number } = {},
): { state: GameState; mission: ScienceMissionState } {
  const program = SCIENCE_PROGRAM_MAP.get(programId)!;
  const base = makeState({
    completedResearch: [...program.requiredResearch],
    money: opts.money ?? 200_000_000_000,
  });
  const result = startScienceMission(
    base,
    { programId, instrumentIds, insured: opts.insured ?? true },
    fixedNow,
    seed,
  );
  if (!result.ok) throw new Error(`startProgram failed: ${result.reason}`);
  return { state: result.state, mission: result.mission };
}

/** Advance the world calendar to `monthIndex` and run the tick. */
function tickTo(state: GameState, monthIndex: number): GameState {
  return processScienceMissionTick(atMonth(state, monthIndex), fixedNow);
}

function missionOf(state: GameState, id: string): ScienceMissionState {
  const m = (state.scienceMissions || []).find(x => x.id === id);
  if (!m) throw new Error('mission not found');
  return m;
}

// ─── Content integrity ──────────────────────────────────────────────────────

describe('science-missions: content integrity', () => {
  test('all 12 flagship programs of the doc are present with unique ids', () => {
    expect(SCIENCE_PROGRAMS.length).toBe(12);
    const ids = SCIENCE_PROGRAMS.map(p => p.id);
    expect(new Set(ids).size).toBe(12);
    for (const expected of [
      'meridian_observatory', 'europa_ocean_access', 'enceladus_plume_sampler',
      'venus_aerostat', 'mars_deep_drill', 'kinetic_deflection_demo',
      'iso_interceptor', 'restricted_sample_return', 'heliophysics_sentinels',
      'titan_rotorcraft', 'gravitational_wave_array', 'heliopause_probe',
    ]) {
      expect(SCIENCE_PROGRAM_MAP.has(expected)).toBe(true);
    }
  });

  test('every program offers 5-7 instruments with unique ids, positive mass/cost, and real heritage strings', () => {
    for (const p of SCIENCE_PROGRAMS) {
      expect(p.instruments.length).toBeGreaterThanOrEqual(5);
      expect(p.instruments.length).toBeLessThanOrEqual(7);
      const ids = p.instruments.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const inst of p.instruments) {
        expect(inst.massKg).toBeGreaterThan(0);
        expect(inst.cost).toBeGreaterThan(0);
        expect(inst.heritage.length).toBeGreaterThan(5);
      }
    }
  });

  test('every required research id exists in the research tree', () => {
    for (const p of SCIENCE_PROGRAMS) {
      for (const id of p.requiredResearch) {
        expect(RESEARCH_MAP.has(id)).toBe(true);
      }
    }
  });

  test('every discovery entry references valid instruments and is reachable by a legal 3-instrument loadout', () => {
    for (const p of SCIENCE_PROGRAMS) {
      const instIds = new Set(p.instruments.map(i => i.id));
      for (const entry of p.discoveryTable) {
        for (const id of [...entry.requiresInstruments, ...(entry.requiresAllInstruments || [])]) {
          expect(instIds.has(id)).toBe(true);
        }
        expect(isDiscoveryReachable(p, entry)).toBe(true);
      }
    }
  });

  test('no dominant loadout: no single legal 3-instrument combo reaches every entry of a 3+-entry table', () => {
    for (const p of SCIENCE_PROGRAMS) {
      if (p.discoveryTable.length < 3) continue; // small tables (DART) trade WHICH measurement, not coverage
      const ids = p.instruments.map(i => i.id);
      const massOf = new Map(p.instruments.map(i => [i.id, i.massKg]));
      let dominantFound = false;
      for (let a = 0; a < ids.length && !dominantFound; a++) {
        for (let b = a + 1; b < ids.length && !dominantFound; b++) {
          for (let c = b + 1; c < ids.length && !dominantFound; c++) {
            const comboIds = [ids[a], ids[b], ids[c]];
            const combo = new Set(comboIds);
            const mass = comboIds.reduce((s, id) => s + (massOf.get(id) || 0), 0);
            if (mass > p.massBudgetKg) continue;
            const coversAll = p.discoveryTable.every(entry =>
              entry.requiresInstruments.some(id => combo.has(id)) &&
              (entry.requiresAllInstruments || []).every(id => combo.has(id)),
            );
            if (coversAll) dominantFound = true;
          }
        }
      }
      expect(dominantFound).toBe(false);
    }
  });

  test('program phases, costs, and payouts are positive and mass budgets admit at least one legal combo', () => {
    for (const p of SCIENCE_PROGRAMS) {
      expect(p.designMonths).toBeGreaterThan(0);
      expect(p.buildMonths).toBeGreaterThan(0);
      expect(p.cruiseMonths).toBeGreaterThan(0);
      expect(p.opsMonths).toBeGreaterThan(0);
      expect(p.baseCost).toBeGreaterThan(0);
      expect(p.completionPayout).toBeGreaterThan(0);
      // Completion payout stays well below interstellar survey payouts —
      // solar-system data < another star's data (module doc invariant).
      expect(p.completionPayout).toBeLessThanOrEqual(3_000_000_000);
      // At least one legal 3-combo fits the mass budget.
      const masses = p.instruments.map(i => i.massKg).sort((x, y) => x - y);
      expect(masses[0] + masses[1] + masses[2]).toBeLessThanOrEqual(p.massBudgetKg);
    }
  });
});

// ─── Planning + quoting ─────────────────────────────────────────────────────

describe('science-missions: planning validation and cost quote', () => {
  const europaLoadout = ['cryobot', 'plume_masspec', 'fluxgate_mag'];

  test('rejects unknown programs and missing research', () => {
    const s = makeState();
    expect(planScienceMission(s, { programId: 'nope', instrumentIds: [], insured: false })).toMatchObject({ ok: false, reason: 'unknown_program' });
    const r = planScienceMission(s, { programId: 'europa_ocean_access', instrumentIds: europaLoadout, insured: false });
    expect(r).toMatchObject({ ok: false, reason: 'missing_research' });
    expect((r as { missingResearch?: string[] }).missingResearch).toEqual(expect.arrayContaining(['ice_penetrator', 'ocean_exploration']));
  });

  test('rejects wrong instrument counts, duplicates, unknown instruments, and over-mass loadouts', () => {
    const s = makeState({ completedResearch: [...EUROPA.requiredResearch] });
    expect(planScienceMission(s, { programId: EUROPA.id, instrumentIds: ['cryobot'], insured: false })).toMatchObject({ ok: false, reason: 'wrong_instrument_count' });
    expect(planScienceMission(s, { programId: EUROPA.id, instrumentIds: ['cryobot', 'cryobot', 'plume_masspec'], insured: false })).toMatchObject({ ok: false, reason: 'duplicate_instrument' });
    expect(planScienceMission(s, { programId: EUROPA.id, instrumentIds: ['cryobot', 'plume_masspec', 'warp_coil'], insured: false })).toMatchObject({ ok: false, reason: 'unknown_instrument' });
    // Meridian: NIRSpec (480) + MIRI (520) + astrometric (400) = 1400 kg > 1300 budget.
    const sm = makeState({ completedResearch: [...SCIENCE_PROGRAM_MAP.get('meridian_observatory')!.requiredResearch] });
    expect(planScienceMission(sm, { programId: 'meridian_observatory', instrumentIds: ['nirspec_ifu', 'mir_imager', 'astrometric_camera'], insured: false }))
      .toMatchObject({ ok: false, reason: 'over_mass_budget' });
  });

  test('rejects tier-gated programs below their corp tier and duplicate active programs', () => {
    const gw = SCIENCE_PROGRAM_MAP.get('gravitational_wave_array')!;
    const low = makeState({ completedResearch: [...gw.requiredResearch], corporationTier: 2 });
    expect(planScienceMission(low, { programId: gw.id, instrumentIds: ['test_mass_assy', 'interferometry_bench', 'phasemeter'], insured: false }))
      .toMatchObject({ ok: false, reason: 'tier_too_low' });

    const { state } = startProgram(EUROPA.id, europaLoadout, 42);
    expect(planScienceMission(state, { programId: EUROPA.id, instrumentIds: europaLoadout, insured: false }))
      .toMatchObject({ ok: false, reason: 'program_already_active' });
    expect(getActiveMissionForProgram(state, EUROPA.id)).toBeDefined();
  });

  test('quote adds up: base + instruments + 8% insurance premium on the basis', () => {
    const s = makeState({ completedResearch: [...EUROPA.requiredResearch] });
    const plan = planScienceMission(s, { programId: EUROPA.id, instrumentIds: europaLoadout, insured: true });
    if (!plan.ok) throw new Error('plan should be ok');
    const instCost = europaLoadout.reduce((sum, id) => sum + EUROPA.instruments.find(i => i.id === id)!.cost, 0);
    expect(plan.costs.programBaseCost).toBe(EUROPA.baseCost);
    expect(plan.costs.instrumentsCost).toBe(instCost);
    expect(plan.costs.insurancePremium).toBe(Math.round((EUROPA.baseCost + instCost) * SCIENCE_INSURANCE_PREMIUM_RATE));
    expect(plan.costs.totalMoneyCost).toBe(EUROPA.baseCost + instCost + plan.costs.insurancePremium);
    // Insufficient funds is a plan error, not a silent clamp.
    const broke = makeState({ completedResearch: [...EUROPA.requiredResearch], money: 1_000_000 });
    expect(planScienceMission(broke, { programId: EUROPA.id, instrumentIds: europaLoadout, insured: true }))
      .toMatchObject({ ok: false, reason: 'insufficient_funds' });
  });

  test('startScienceMission deducts the full cost through the ledger and records the seed', () => {
    const { state, mission } = startProgram(EUROPA.id, europaLoadout, 1234);
    expect(mission.seed).toBe(1234);
    expect(mission.phase).toBe('design');
    expect(state.money).toBe(200_000_000_000 - mission.totalCost);
    expect(state.totalSpent).toBe(mission.totalCost);
    expect(mission.insurancePremiumPaid).toBeGreaterThan(0);
  });
});

// ─── Lifecycle ──────────────────────────────────────────────────────────────

/** Find a seed whose DART mission survives launch + cruise (97%+ do). */
function findSurvivingDartSeed(): number {
  const bounds = getPhaseBoundaries(DART);
  for (let seed = 1; seed < 200; seed++) {
    const { state, mission } = startProgram(DART.id, ['impactor_bus', 'trailing_cubesat', 'laser_altimeter'], seed);
    const done = tickTo(state, bounds.opsEnd + 2);
    if (missionOf(done, mission.id).phase === 'completed') return seed;
  }
  throw new Error('no surviving DART seed found in scan');
}

/** Find a seed that fails at launch (build→cruise boundary). */
function findLaunchFailureSeed(insured: boolean): number {
  for (let seed = 1; seed < 2000; seed++) {
    const { state, mission } = startProgram(DART.id, ['impactor_bus', 'trailing_cubesat', 'laser_altimeter'], seed, { insured });
    const bounds = getPhaseBoundaries(DART);
    const at = tickTo(state, bounds.buildEnd);
    const m = missionOf(at, mission.id);
    if (m.phase === 'failed' && m.failedReason === 'launch_failure') return seed;
  }
  throw new Error('no launch-failure seed found in scan');
}

describe('science-missions: program lifecycle', () => {
  test('phases advance at the authored boundaries (design → build → cruise → science ops → completed)', () => {
    const seed = findSurvivingDartSeed();
    const { state, mission } = startProgram(DART.id, ['impactor_bus', 'trailing_cubesat', 'laser_altimeter'], seed);
    const b = getPhaseBoundaries(DART);

    expect(missionOf(tickTo(state, b.designEnd - 1), mission.id).phase).toBe('design');
    expect(missionOf(tickTo(state, b.designEnd), mission.id).phase).toBe('build');
    const cruising = missionOf(tickTo(state, b.buildEnd), mission.id);
    expect(cruising.phase).toBe('cruise');
    expect(cruising.launched).toBe(true);
    expect(missionOf(tickTo(state, b.cruiseEnd), mission.id).phase).toBe('science_ops');
    const done = tickTo(state, b.opsEnd + 1);
    expect(missionOf(done, mission.id).phase).toBe('completed');
    // Completion payout credited through totalEarned (honest ledger).
    expect(done.totalEarned).toBeGreaterThanOrEqual(DART.completionPayout);
  });

  test('launch failure: insured missions receive the 70% payout, uninsured receive nothing', () => {
    const b = getPhaseBoundaries(DART);
    const insuredSeed = findLaunchFailureSeed(true);
    const { state: s1, mission: m1 } = startProgram(DART.id, ['impactor_bus', 'trailing_cubesat', 'laser_altimeter'], insuredSeed, { insured: true });
    const after1 = tickTo(s1, b.buildEnd);
    const failed1 = missionOf(after1, m1.id);
    expect(failed1.phase).toBe('failed');
    const expectedPayout = Math.round(m1.totalCost * SCIENCE_INSURANCE_PAYOUT_RATE);
    expect(after1.money).toBe(s1.money + expectedPayout);
    expect(after1.totalEarned).toBe(s1.totalEarned + expectedPayout);

    // The SAME failure decision is seed-determined, so the identical seed
    // uninsured also fails — and pays nothing. (Premium changes totalCost,
    // not the roll: the rng stream keys on (seed, month) only.)
    const { state: s2, mission: m2 } = startProgram(DART.id, ['impactor_bus', 'trailing_cubesat', 'laser_altimeter'], insuredSeed, { insured: false });
    const after2 = tickTo(s2, b.buildEnd);
    expect(missionOf(after2, m2.id).phase).toBe('failed');
    expect(after2.money).toBe(s2.money);
    expect(after2.totalEarned).toBe(s2.totalEarned);
  });

  test('a failed program can be restarted (no duplicate-active guard on terminal missions)', () => {
    const seed = findLaunchFailureSeed(true);
    const { state, mission } = startProgram(DART.id, ['impactor_bus', 'trailing_cubesat', 'laser_altimeter'], seed);
    const after = tickTo(state, getPhaseBoundaries(DART).buildEnd);
    expect(missionOf(after, mission.id).phase).toBe('failed');
    const replan = planScienceMission(after, { programId: DART.id, instrumentIds: ['impactor_bus', 'trailing_cubesat', 'laser_altimeter'], insured: true });
    expect(replan.ok).toBe(true);
  });

  test('open-ended programs enter extended_ops (not completed) after primary ops and pay the completion payout once', () => {
    const b = getPhaseBoundaries(SENTINELS);
    for (let seed = 1; seed < 100; seed++) {
      const { state, mission } = startProgram(SENTINELS.id, ['coronagraph_wl', 'particle_suite', 'l5_imager'], seed);
      const done = tickTo(state, b.opsEnd + 3);
      const m = missionOf(done, mission.id);
      if (m.phase === 'failed') continue;
      expect(m.phase).toBe('extended_ops');
      expect(m.completedAtMs).toBeUndefined();
      return;
    }
    throw new Error('no surviving sentinel seed in scan');
  });
});

// ─── Instrument tradeoffs drive outcomes ────────────────────────────────────

describe('science-missions: instrument selection gates discoveries', () => {
  test('discovered entries are always a subset of what the fitted instruments allow', () => {
    // Loadout WITHOUT mass spec or cryobot: biosignature entries can never fire.
    for (let seed = 1; seed < 60; seed++) {
      const { state, mission } = startProgram(EUROPA.id, ['fluxgate_mag', 'reason_radar', 'thermal_imager'], seed);
      const done = tickTo(state, getPhaseBoundaries(EUROPA).opsEnd + 1);
      const m = missionOf(done, mission.id);
      if (m.phase === 'failed') continue;
      expect(m.discoveredEntryIds).not.toContain('disequilibrium_chemistry');
      expect(m.discoveredEntryIds).not.toContain('vent_field');
      // chaos_transport needs thermal AND... any-of thermal/dust — allowed.
      for (const id of m.discoveredEntryIds) {
        expect(['ocean_salinity', 'shell_chart', 'chaos_transport']).toContain(id);
      }
    }
  });

  test('the cryobot + mass-spec loadout can confirm Europan biochemistry — granting rare-tech access', () => {
    for (let seed = 1; seed < 400; seed++) {
      const { state, mission } = startProgram(EUROPA.id, ['cryobot', 'plume_masspec', 'fluxgate_mag'], seed);
      const done = tickTo(state, getPhaseBoundaries(EUROPA).opsEnd + 1);
      const m = missionOf(done, mission.id);
      if (m.phase === 'failed' || !m.discoveredEntryIds.includes('disequilibrium_chemistry')) continue;
      expect(done.unlockedRareTechIds).toContain('europan_biochemistry');
      expect(m.discoveries.some(d => d.entryId === 'disequilibrium_chemistry')).toBe(true);
      return;
    }
    throw new Error('no seed produced the biosignature discovery in scan');
  });

  test('regional buff discoveries land in the shared miningBonuses array (buffed production, not printed money)', () => {
    for (let seed = 1; seed < 400; seed++) {
      const { state, mission } = startProgram(EUROPA.id, ['reason_radar', 'fluxgate_mag', 'thermal_imager'], seed);
      const done = tickTo(state, getPhaseBoundaries(EUROPA).opsEnd + 1);
      const m = missionOf(done, mission.id);
      if (m.phase === 'failed' || !m.discoveredEntryIds.includes('shell_chart')) continue;
      expect((done.miningBonuses || []).some(b => b.locationId === 'jupiter_system' && b.resourceId === 'exotic_materials')).toBe(true);
      return;
    }
    throw new Error('no seed produced the shell-chart discovery in scan');
  });

  test('discoveries feed the discoveries database and the reports inbox', () => {
    for (let seed = 1; seed < 400; seed++) {
      const { state, mission } = startProgram(EUROPA.id, ['reason_radar', 'fluxgate_mag', 'thermal_imager'], seed);
      const done = tickTo(state, getPhaseBoundaries(EUROPA).opsEnd + 1);
      const m = missionOf(done, mission.id);
      if (m.phase === 'failed' || !m.discoveredEntryIds.includes('shell_chart')) continue;
      expect((done.knownAnomalies || []).some(a => a.title === 'Ice-Shell Thickness Chart' && a.claimed)).toBe(true);
      expect((done.reports || []).some(r => r.type === 'probe_discovery' && r.title.includes('Ice-Shell'))).toBe(true);
      return;
    }
    throw new Error('no seed produced the shell-chart discovery in scan');
  });
});

// ─── Milestones ─────────────────────────────────────────────────────────────

describe('science-missions: global first-claim milestones', () => {
  test('Europa ocean-entry milestone requires the cryobot to be fitted', () => {
    const b = getPhaseBoundaries(EUROPA);
    for (let seed = 1; seed < 100; seed++) {
      const withCryobot = startProgram(EUROPA.id, ['cryobot', 'plume_masspec', 'fluxgate_mag'], seed);
      const done = tickTo(withCryobot.state, b.cruiseEnd + 1);
      const m = missionOf(done, withCryobot.mission.id);
      if (m.phase === 'failed') continue;
      expect(m.milestoneEligibleId).toBe('first_europa_ocean_entry');

      const without = startProgram(EUROPA.id, ['reason_radar', 'plume_masspec', 'fluxgate_mag'], seed);
      const done2 = tickTo(without.state, b.cruiseEnd + 1);
      expect(missionOf(done2, without.mission.id).milestoneEligibleId).toBeUndefined();
      return;
    }
    throw new Error('no surviving Europa seed in scan');
  });

  test('markMilestoneClaimAttempted is idempotent page bookkeeping', () => {
    const b = getPhaseBoundaries(EUROPA);
    for (let seed = 1; seed < 100; seed++) {
      const { state, mission } = startProgram(EUROPA.id, ['cryobot', 'plume_masspec', 'fluxgate_mag'], seed);
      const done = tickTo(state, b.cruiseEnd + 1);
      if (missionOf(done, mission.id).phase === 'failed') continue;
      const marked = markMilestoneClaimAttempted(done, mission.id);
      expect(missionOf(marked, mission.id).milestoneClaimAttempted).toBe(true);
      // Second call is a no-op returning the same reference.
      expect(markMilestoneClaimAttempted(marked, mission.id)).toBe(marked);
      return;
    }
    throw new Error('no surviving Europa seed in scan');
  });
});

// ─── Standing benefits: forecast horizon, hazard trims, expedition bonuses ──

function withMissionPhase(programId: string, phase: ScienceMissionState['phase']): GameState {
  const mission: ScienceMissionState = {
    id: 'm1', programId, instrumentIds: [], phase,
    startedAtMs: fixedNow, startGameMonth: 0, monthsElapsed: 10, seed: 1,
    insured: false, insurancePremiumPaid: 0, totalCost: 0,
    discoveries: [], discoveredEntryIds: [],
  };
  return makeState({ scienceMissions: [mission] });
}

describe('science-missions: standing benefits', () => {
  test('forecast horizon is 1 month baseline, 2 with an operational Sentinel constellation, and not during build', () => {
    expect(getForecastHorizonMonths(makeState())).toBe(1);
    expect(getForecastHorizonMonths(withMissionPhase('heliophysics_sentinels', 'science_ops'))).toBe(2);
    expect(getForecastHorizonMonths(withMissionPhase('heliophysics_sentinels', 'extended_ops'))).toBe(2);
    expect(getForecastHorizonMonths(withMissionPhase('heliophysics_sentinels', 'build'))).toBe(1);
    expect(getForecastHorizonMonths(withMissionPhase('heliophysics_sentinels', 'failed'))).toBe(1);
  });

  test('Sentinels trim solar-storm damage while operational; the deflection demo trims impact damage permanently', () => {
    const neutral = getScienceHazardDamageMultipliers(makeState());
    expect(neutral.solar_storm).toBe(1);
    expect(neutral.micrometeorite).toBe(1);

    const sentinelOps = getScienceHazardDamageMultipliers(withMissionPhase('heliophysics_sentinels', 'science_ops'));
    expect(sentinelOps.solar_storm).toBeCloseTo(0.85, 5);
    expect(sentinelOps.micrometeorite).toBe(1);

    // Deflection demo persists after completion (persistAfterCompletion).
    const dartDone = getScienceHazardDamageMultipliers(withMissionPhase('kinetic_deflection_demo', 'completed'));
    expect(dartDone.micrometeorite).toBeCloseTo(0.80, 5);
    // A completed sentinel WITHOUT persistAfterCompletion grants nothing.
    const sentinelDone = getScienceHazardDamageMultipliers(withMissionPhase('heliophysics_sentinels', 'completed'));
    expect(sentinelDone.solar_storm).toBe(1);
  });

  test('heliopause charting buffs expedition survey payouts and trims transit damage', () => {
    const neutral = getExpeditionScienceBonuses(makeState());
    expect(neutral.surveyPayoutMult).toBe(1);
    expect(neutral.hazardDamageMult).toBe(1);
    const charted = getExpeditionScienceBonuses(withMissionPhase('heliopause_probe', 'extended_ops'));
    expect(charted.surveyPayoutMult).toBeCloseTo(1.15, 5);
    expect(charted.hazardDamageMult).toBeCloseTo(0.90, 5);
  });

  test('Meridian raises the ISO detection window probability while operational', () => {
    expect(getIsoWindowProb(makeState())).toBeCloseTo(0.03, 5);
    expect(getIsoWindowProb(withMissionPhase('meridian_observatory', 'extended_ops'))).toBeCloseTo(0.05, 5);
  });
});

// ─── ISO interceptor wait/window mechanics ──────────────────────────────────

describe('science-missions: ISO interceptor', () => {
  test('parks on station after cruise, opens a world-seeded window, then runs intercept ops to completion', () => {
    const iso = SCIENCE_PROGRAM_MAP.get('iso_interceptor')!;
    const b = getPhaseBoundaries(iso);
    for (let seed = 1; seed < 60; seed++) {
      const { state, mission } = startProgram(iso.id, ['dust_impact_analyzer', 'neutral_masspec', 'capture_cell'], seed);
      const parked = tickTo(state, b.cruiseEnd + 1);
      const m0 = missionOf(parked, mission.id);
      if (m0.phase === 'failed') continue;
      expect(['on_station', 'science_ops']).toContain(m0.phase);

      // Step far enough for the ~3%/month world roll to fire (world-shared:
      // keyed on absolute world month, so it is deterministic per start month).
      const later = tickTo(state, b.cruiseEnd + 240);
      const m1 = missionOf(later, mission.id);
      if (m1.interceptWindowMonth === undefined) continue; // pathological month run — try next seed
      expect(m1.interceptWindowMonth).toBeGreaterThanOrEqual(b.cruiseEnd);
      // After the window + intercept ops, the mission completes with payout.
      expect(m1.phase).toBe('completed');
      expect(later.totalEarned).toBeGreaterThanOrEqual(iso.completionPayout);
      return;
    }
    throw new Error('no seed produced an ISO intercept in scan');
  });
});

// ─── NPC co-funding ─────────────────────────────────────────────────────────

describe('science-missions: NPC program co-funding', () => {
  test('NPC schedules are deterministic, forecastable, and world-shared', () => {
    const a = getNpcProgramStatuses(30);
    const b = getNpcProgramStatuses(30);
    expect(JSON.stringify(a.map(s => ({ id: s.def.id, c: s.cycleIndex, p: s.phaseLabel, s: s.settlesAtMonth }))))
      .toBe(JSON.stringify(b.map(s => ({ id: s.def.id, c: s.cycleIndex, p: s.phaseLabel, s: s.settlesAtMonth }))));
    expect(a.length).toBe(NPC_PROGRAMS.length);
    // Settlement multipliers are world-shared per (program, cycle).
    expect(getNpcSettlementMultiplier('npc_dominion_sentinels', 3)).toBe(getNpcSettlementMultiplier('npc_dominion_sentinels', 3));
    const [min, max] = NPC_PROGRAMS[0].payoutMultRange;
    const mult = getNpcSettlementMultiplier(NPC_PROGRAMS[0].id, 7);
    expect(mult).toBeGreaterThanOrEqual(min);
    expect(mult).toBeLessThanOrEqual(max);
  });

  test('co-funding stakes money in an open window, rejects double-funding, and settles at the shared multiplier', () => {
    // Month 0: dominion program (offset 0, window 6) is open.
    const s0 = makeState();
    const funded = coFundNpcProgram(s0, 'npc_dominion_sentinels', fixedNow);
    if (!funded.ok) throw new Error(`co-fund failed: ${funded.reason}`);
    const def = NPC_PROGRAMS.find(p => p.id === 'npc_dominion_sentinels')!;
    expect(funded.state.money).toBe(s0.money - def.coFundCost);
    expect(funded.state.totalSpent).toBe(s0.totalSpent + def.coFundCost);
    const stake = (funded.state.npcProgramContributions || [])[0];
    expect(stake.settlesAtMonth).toBe(def.cycleMonths);

    expect(coFundNpcProgram(funded.state, 'npc_dominion_sentinels', fixedNow)).toMatchObject({ ok: false, reason: 'already_funded' });

    // Settlement: advance to the settle month and tick.
    const settled = tickTo(funded.state, stake.settlesAtMonth);
    const doneStake = (settled.npcProgramContributions || [])[0];
    expect(doneStake.settled).toBe(true);
    const expectedMult = getNpcSettlementMultiplier('npc_dominion_sentinels', stake.cycleIndex);
    expect(doneStake.payout).toBe(Math.round(def.coFundCost * expectedMult));
    expect(settled.money).toBe(funded.state.money + doneStake.payout!);
    expect(settled.factionReputation?.['the-dominion']).toBe(def.factionRepOnSettle);
  });

  test('co-funding outside the window is rejected', () => {
    // Dominion window is months 0-5 of each 24-month cycle; month 10 is closed.
    const s = atMonth(makeState(), 10);
    expect(coFundNpcProgram(s, 'npc_dominion_sentinels', fixedNow)).toMatchObject({ ok: false, reason: 'window_closed' });
  });
});

// ─── Determinism ────────────────────────────────────────────────────────────

describe('science-missions: determinism', () => {
  test('identical seeds + identical months produce identical mission state', () => {
    const run = () => {
      const { state, mission } = startProgram(EUROPA.id, ['cryobot', 'plume_masspec', 'fluxgate_mag'], 777);
      const m = missionOf(tickTo(state, 70), mission.id);
      // Strip generated record ids (generateId is id-only, never gameplay).
      return JSON.stringify({ ...m, id: 'X', discoveries: m.discoveries.map(d => ({ ...d, id: 'D' })) });
    };
    expect(run()).toBe(run());
  });

  test('one big catch-up jump equals stepped monthly processing (offline-safe)', () => {
    const target = getPhaseBoundaries(EUROPA).opsEnd + 1;
    const mk = () => startProgram(EUROPA.id, ['cryobot', 'plume_masspec', 'fluxgate_mag'], 999);

    const a = mk();
    const jumped = tickTo(a.state, target);

    const b = mk();
    let stepped = b.state;
    for (let mi = 1; mi <= target; mi++) stepped = tickTo(stepped, mi);

    const strip = (m: ScienceMissionState) => ({ ...m, id: 'X', discoveries: m.discoveries.map(d => ({ ...d, id: 'D' })) });
    expect(JSON.stringify(strip(missionOf(jumped, a.mission.id))))
      .toBe(JSON.stringify(strip(missionOf(stepped, b.mission.id))));
    // Money outcomes match too (same payouts on the same months).
    expect(jumped.money).toBe(stepped.money);
    expect(jumped.totalEarned).toBe(stepped.totalEarned);
  });

  test('processScienceMissionTick is a no-op (same reference) with nothing to do', () => {
    const idle = makeState();
    expect(processScienceMissionTick(idle, fixedNow)).toBe(idle);
  });
});

// ─── Progress helper + save migration ───────────────────────────────────────

describe('science-missions: progress helper and V18 migration', () => {
  test('getScienceMissionProgress reports phase label, pct, and months to next phase', () => {
    const { state, mission } = startProgram(EUROPA.id, ['cryobot', 'plume_masspec', 'fluxgate_mag'], 5);
    const p0 = getScienceMissionProgress(state, mission.id)!;
    expect(p0.phaseLabel).toBe('Design & integration studies');
    expect(p0.monthsToNextPhase).toBe(EUROPA.designMonths);
    const mid = tickTo(state, EUROPA.designMonths + 2);
    const p1 = getScienceMissionProgress(mid, mission.id)!;
    expect(p1.phaseLabel).toBe('Flight hardware build');
    expect(p1.progressPct).toBeGreaterThan(0);
    expect(p1.progressPct).toBeLessThan(1);
  });

  test('getTotalGameMonths matches the expeditions/quarterly convention', () => {
    expect(getTotalGameMonths({ year: 2026, month: 1 })).toBe(0);
    expect(getTotalGameMonths({ year: 2027, month: 3 })).toBe(14);
  });

  test('getNewGameState initializes the V18 fields', () => {
    const fresh = getNewGameState();
    expect(fresh.scienceMissions).toEqual([]);
    expect(fresh.npcProgramContributions).toEqual([]);
  });

  test('loadGame migrates pre-V18 saves additively (fields default to empty arrays)', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    const legacy = makeState();
    delete (legacy as Partial<GameState>).scienceMissions;
    delete (legacy as Partial<GameState>).npcProgramContributions;
    store.set(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.scienceMissions).toEqual([]);
    expect(loaded!.npcProgramContributions).toEqual([]);
    // Existing mission state round-trips untouched.
    const { state, mission } = startProgram(EUROPA.id, ['cryobot', 'plume_masspec', 'fluxgate_mag'], 11);
    store.set(SAVE_KEY, JSON.stringify(state));
    const reloaded = loadGame();
    expect(reloaded!.scienceMissions!.find(m => m.id === mission.id)?.seed).toBe(11);
  });
});
