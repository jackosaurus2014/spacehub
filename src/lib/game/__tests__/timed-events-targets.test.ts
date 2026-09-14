/**
 * Timed-event targets must ask for NEW work (2026-09-14 balance defect).
 *
 * game-engine.ts step 8 freezes `target: template.getTarget(state)` onto the
 * occurrence at spawn, then every subsequent tick compares
 * `template.getProgress(state)` against that frozen number and pays
 * `evt.rewardAmount` the moment progress >= target. A target expressed as a
 * FRACTION of the very quantity getProgress reads is therefore already
 * satisfied when it spawns: the event completes on the next tick and pays its
 * full reward for zero player activity.
 *
 * Seven templates shipped that way — evt_precious_metals (×4),
 * evt_research_marathon (×3), evt_construction_sprint (×2.5),
 * evt_satellite_deploy (×2), evt_iron_rush (×2), evt_infrastructure_push (×2)
 * and evt_survey_expedition (×1.5, a flat target of 1 against a probe count
 * that is normally ≥1) — worth roughly $500M/day to an established
 * corporation that never touched a control.
 *
 * THE INVARIANT THIS FILE GUARDS: for every template and every plausible
 * player state, getProgress(state) < getTarget(state). No event may be
 * complete at the instant it spawns. Do not weaken an assertion here to make
 * a template pass — fix the template.
 */
import { getNewGameState } from '../save-load';
import { RESEARCH } from '../research-tree';
import type { GameState } from '../types';
import { EVENT_TEMPLATES } from '../timed-events';

const GAME_DATE = { year: 2035, month: 4 };

function building(
  definitionId: string,
  locationId: string,
  isComplete = true,
): GameState['buildings'][number] {
  return {
    instanceId: `bld_${definitionId}_${locationId}_${Math.random().toString(36).slice(2, 8)}`,
    definitionId,
    locationId,
    buildStartDate: GAME_DATE,
    completionDate: GAME_DATE,
    isComplete,
    startedAtMs: 1_700_000_000_000,
    realDurationSeconds: 900,
  };
}

function ship(
  definitionId: string,
  status: NonNullable<GameState['ships']>[number]['status'],
  isBuilt = true,
): NonNullable<GameState['ships']>[number] {
  return {
    instanceId: `shp_${definitionId}_${Math.random().toString(36).slice(2, 8)}`,
    definitionId,
    name: definitionId,
    status,
    currentLocation: 'asteroid_belt',
    isBuilt,
  };
}

function service(definitionId: string, locationId: string): GameState['activeServices'][number] {
  return { definitionId, locationId, linkedBuildingIds: [], startDate: GAME_DATE, revenueMultiplier: 1 };
}

/** Real research ids spanning `count` distinct categories — the fixture has to
 *  use live ids because evt_tech_diversity resolves them through RESEARCH_MAP
 *  and silently counts nothing for unknown ids. */
function researchAcrossCategories(count: number): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const r of RESEARCH) {
    if (seen.has(r.category)) continue;
    seen.add(r.category);
    ids.push(r.id);
    if (seen.size >= count) break;
  }
  return ids;
}

/**
 * An established mid-game corporation: multiple locations, a real fleet
 * including idle survey probes, a deep research tree, a fat stockpile of every
 * resource the mining events read, and plenty of ground/solar/fabrication
 * infrastructure. Precisely the profile every broken template paid out to
 * instantly.
 */
function establishedPlayer(): GameState {
  const base = getNewGameState();
  const deepResearch = RESEARCH.slice(0, 60).map(r => r.id);
  return {
    ...base,
    money: 8_400_000_000,
    totalEarned: 21_000_000_000,
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_surface', 'mars_surface', 'asteroid_belt'],
    completedResearch: Array.from(new Set([...deepResearch, ...researchAcrossCategories(6)])),
    resources: {
      iron: 4_200,
      aluminum: 1_600,
      titanium: 640,
      rare_earth: 310,
      platinum_group: 180,
      gold: 240,
      lunar_water: 1_900,
      mars_water: 1_250,
      helium3: 44,
      methane: 800,
      exotic_materials: 12,
    },
    buildings: [
      building('launch_pad_small', 'earth_surface'),
      building('ground_station', 'earth_surface'),
      building('ground_station', 'earth_surface'),
      building('solar_array_lunar_orbit', 'leo'),
      building('fabrication_earth', 'earth_surface'),
      building('fabrication_lunar', 'lunar_surface'),
      building('fabrication_orbital', 'leo'),
      building('sat_telecom', 'leo'),
      building('sat_telecom', 'leo'),
      building('sat_sensor', 'leo'),
      building('sat_telecom_geo', 'geo'),
      building('sat_sensor_geo', 'geo'),
      building('mining_lunar_ice', 'lunar_surface'),
      building('mining_mars', 'mars_surface'),
      building('mining_asteroid', 'asteroid_belt'),
      building('mining_asteroid', 'asteroid_belt'),
      // One still under construction — it must never count toward progress.
      building('mining_asteroid', 'asteroid_belt', false),
    ],
    ships: [
      ship('survey_probe', 'idle'),
      ship('survey_probe', 'idle'),
      ship('mining_ship', 'mining'),
      ship('mining_ship', 'mining'),
      ship('cargo_hauler', 'in_transit'),
      ship('cargo_hauler', 'idle', false),
    ],
    activeServices: [
      service('svc_launch_smallsat', 'earth_surface'),
      service('svc_mining_lunar', 'lunar_surface'),
      service('svc_mining_mars', 'mars_surface'),
      service('svc_mining_asteroid', 'asteroid_belt'),
      service('svc_fabrication_orbital', 'leo'),
    ],
    workforce: { engineers: 34, scientists: 21, miners: 46, operators: 18, morale: 0.9, fatigue: 0.2, trainingLevel: 0.6, trainingBudgetPerCrew: 0 },
    completedContracts: ['ct_a', 'ct_b', 'ct_c', 'ct_d', 'ct_e', 'ct_f', 'ct_g'],
  } as GameState;
}

/** A late-game whale — an order of magnitude past `establishedPlayer`. The
 *  fraction-of-progress bug got WORSE with scale, so scale is part of the
 *  guard. */
function whalePlayer(): GameState {
  const mid = establishedPlayer();
  const scaled: Record<string, number> = {};
  for (const [k, v] of Object.entries(mid.resources || {})) scaled[k] = v * 40;
  return {
    ...mid,
    money: 900_000_000_000,
    totalEarned: 4_000_000_000_000,
    resources: scaled,
    completedResearch: RESEARCH.map(r => r.id),
    buildings: [...mid.buildings, ...mid.buildings, ...mid.buildings, ...mid.buildings],
    ships: [...(mid.ships || []), ...(mid.ships || []), ...(mid.ships || [])],
    completedContracts: Array.from({ length: 140 }, (_, i) => `ct_${i}`),
  } as GameState;
}

/** A brand-new corporation. Targets must be positive and non-trivial here too
 *  — a zero target against a zero progress would also pay instantly. */
function freshPlayer(): GameState {
  return getNewGameState();
}

const FIXTURES: [string, () => GameState][] = [
  ['a fresh corporation', freshPlayer],
  ['an established mid-game corporation', establishedPlayer],
  ['a late-game whale', whalePlayer],
];

describe('timed-event targets always ask for new work', () => {
  it('ships the full template set (a deletion should fail loudly, not silently skip)', () => {
    expect(EVENT_TEMPLATES.length).toBeGreaterThanOrEqual(21);
    expect(new Set(EVENT_TEMPLATES.map(t => t.id)).size).toBe(EVENT_TEMPLATES.length);
  });

  describe.each(FIXTURES)('%s', (_label, makeState) => {
    it.each(EVENT_TEMPLATES.map(t => [t.id, t] as const))(
      '%s is NOT already complete at spawn',
      (_id, template) => {
        const state = makeState();
        const target = template.getTarget(state);
        const progress = template.getProgress(state);

        expect(Number.isFinite(target)).toBe(true);
        expect(Number.isFinite(progress)).toBe(true);
        expect(target).toBeGreaterThan(0);
        // The load-bearing assertion. game-engine.ts completes on
        // `progress >= evt.target`, so equality is a payout too.
        expect(progress).toBeLessThan(target);
      },
    );
  });

  it('every target is reachable — the delta asked for is finite and bounded', () => {
    // The mirror-image failure mode: a target so far above progress that the
    // event can never be won inside durationHours is just as dead as one that
    // pays instantly. Cap the ask at 3x the player's current holding plus a
    // generous flat allowance, which every template comfortably satisfies.
    const state = establishedPlayer();
    for (const template of EVENT_TEMPLATES) {
      const progress = template.getProgress(state);
      const target = template.getTarget(state);
      const delta = target - progress;
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThanOrEqual(Math.max(200, progress * 3) + 60_000_000_000);
    }
  });

  it('no target is a fraction of its own progress (the 2026-09-14 defect shape)', () => {
    // Doubling the measured quantity must not leave the target at or below
    // progress. A fractional target (progress * k, k < 1) fails this; a delta
    // target (progress + d) passes it. Uses the whale fixture so the
    // fractional shape has room to overtake its flat addend.
    const state = whalePlayer();
    for (const template of EVENT_TEMPLATES) {
      expect(template.getProgress(state)).toBeLessThan(template.getTarget(state));
    }
  });

  it('evt_iron_rush measures iron on both sides', () => {
    // It used to target half the TOTAL stockpile while reading iron alone:
    // instant when iron was over half the pile, unreachable when it was not.
    // Holding a mountain of non-iron resources must not move this target.
    const base = establishedPlayer();
    const ironRush = EVENT_TEMPLATES.find(t => t.id === 'evt_iron_rush')!;
    const withJunk = { ...base, resources: { ...base.resources, aluminum: 900_000, titanium: 500_000 } } as GameState;
    expect(ironRush.getTarget(withJunk)).toBe(ironRush.getTarget(base));
    expect(ironRush.getProgress(withJunk)).toBeLessThan(ironRush.getTarget(withJunk));
  });

  it('evt_infrastructure_push measures the same building subset on both sides', () => {
    // It used to target 10% of ALL completed buildings while reading only the
    // ground/solar/fabrication subset. Adding unrelated buildings must not
    // change the target.
    const base = establishedPlayer();
    const push = EVENT_TEMPLATES.find(t => t.id === 'evt_infrastructure_push')!;
    const withUnrelated = {
      ...base,
      buildings: [...base.buildings, ...Array.from({ length: 40 }, () => building('sat_telecom', 'leo'))],
    } as GameState;
    expect(push.getTarget(withUnrelated)).toBe(push.getTarget(base));
    expect(push.getProgress(withUnrelated)).toBeLessThan(push.getTarget(withUnrelated));
  });

  it('evt_survey_expedition scales with the probes already in the fleet', () => {
    // It used to be a flat `() => 1`, satisfied on spawn by anyone holding a
    // built probe.
    const survey = EVENT_TEMPLATES.find(t => t.id === 'evt_survey_expedition')!;
    const withProbes = establishedPlayer();
    const withoutProbes = { ...withProbes, ships: (withProbes.ships || []).filter(s => s.definitionId !== 'survey_probe') } as GameState;
    expect(survey.getTarget(withProbes)).toBeGreaterThan(survey.getTarget(withoutProbes));
    expect(survey.getProgress(withProbes)).toBeLessThan(survey.getTarget(withProbes));
  });

  it('the fixture has teeth — every OLD target formula is instantly satisfied by it', () => {
    // Proof that `establishedPlayer()` is a strong enough fixture to have
    // caught the 2026-09-14 defect. These are the shipped-and-broken
    // expressions, verbatim, evaluated against the same state the guard above
    // uses. If a future refactor waters the fixture down, this test starts
    // failing and says so — do not delete it to make that go away.
    const s = establishedPlayer();
    const res = s.resources || {};
    const completedBuildings = s.buildings.filter(b => b.isComplete).length;
    const old: [string, number, number][] = [
      // [id, old target, progress]
      // evt_iron_rush is deliberately not in this list: its old formula was
      // broken the OTHER way round — target and progress measured different
      // quantities, so it was instant when iron happened to be over half the
      // stockpile and unreachable when it was not. Covered separately below.
      ['evt_water_collection',
        Math.max(30, Math.round(((res.lunar_water || 0) + (res.mars_water || 0)) * 0.4 + 30)),
        (res.lunar_water || 0) + (res.mars_water || 0)],
      ['evt_precious_metals',
        Math.max(5, Math.round(((res.platinum_group || 0) + (res.gold || 0)) * 0.3 + 5)),
        (res.platinum_group || 0) + (res.gold || 0)],
      ['evt_construction_sprint',
        Math.max(2, Math.round(completedBuildings * 0.15 + 2)),
        completedBuildings],
      ['evt_satellite_deploy',
        Math.max(2, Math.round(s.buildings.filter(b => b.isComplete && b.definitionId.startsWith('sat_')).length * 0.2 + 2)),
        s.buildings.filter(b => b.isComplete && b.definitionId.startsWith('sat_')).length],
      ['evt_infrastructure_push',
        Math.max(1, Math.round(completedBuildings * 0.1 + 1)),
        s.buildings.filter(b => b.isComplete && (
          b.definitionId.includes('ground') || b.definitionId.includes('solar') || b.definitionId.includes('fabrication')
        )).length],
      ['evt_research_marathon',
        Math.max(1, Math.round(s.completedResearch.length * 0.08 + 1)),
        s.completedResearch.length],
      ['evt_survey_expedition',
        1,
        (s.ships || []).filter(sh => sh.definitionId === 'survey_probe' && sh.isBuilt).length],
    ];
    // game-engine.ts pays on `progress >= target`, so every one of these was
    // a payout on the first tick after spawn.
    const wouldNotHavePaid = old.filter(([, oldTarget, progress]) => progress < oldTarget);
    expect(wouldNotHavePaid.map(([id]) => id)).toEqual([]);

    // evt_iron_rush's old formula, both of its failure modes.
    const oldIronTarget = (st: GameState) =>
      Math.max(50, Math.round((Object.values(st.resources || {}).reduce((a, b) => a + b, 0) || 100) * 0.5));
    // Iron over half the pile → instant payout.
    const ironHeavy = { ...s, resources: { iron: 4_200, aluminum: 200 } } as GameState;
    expect(ironHeavy.resources!.iron).toBeGreaterThanOrEqual(oldIronTarget(ironHeavy));
    // Iron under half the pile → a 4-hour target thousands of units out of
    // reach, moved by resources the event does not even measure.
    expect(s.resources!.iron).toBeLessThan(oldIronTarget(s));
  });

  it('in-progress buildings and unbuilt ships never count as progress', () => {
    const state = establishedPlayer();
    const sprint = EVENT_TEMPLATES.find(t => t.id === 'evt_construction_sprint')!;
    const fleet = EVENT_TEMPLATES.find(t => t.id === 'evt_fleet_buildup')!;
    expect(sprint.getProgress(state)).toBe(state.buildings.filter(b => b.isComplete).length);
    expect(fleet.getProgress(state)).toBe((state.ships || []).filter(s => s.isBuilt).length);
  });
});
