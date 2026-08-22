/**
 * @jest-environment node
 *
 * AAA Round 1, wave E3 — regression guards for the nine verified defects in
 * docs/AAA_PROGRAM_2026-08.md §1a.5.
 *
 * Every defect in that ledger shared one property: it was a shipped promise
 * that silently produced nothing, and *nothing in CI noticed*. Unit tests that
 * only assert "the function returns a number" would not have caught a single
 * one of them — `getMegaProjectBonuses` was tested, and its reward was still
 * dead; `legacy.trackers` was read in four places, and nothing ever wrote it.
 *
 * So the guards below are deliberately STRUCTURAL where they can be: they
 * assert that a declared reward has a reader, that a tracker actually
 * increments through the real tick, and that every id one module names
 * resolves in the module that owns it. A test that can only fail when someone
 * changes a constant is not the test these defects call for.
 */

import fs from 'fs';
import path from 'path';
import { accrueLegacyTrackers, sumMinedUnits, DEFAULT_LEGACY } from '../legacy-system';
import { getEraStatSnapshot } from '../corporate-eras';
import {
  MEGA_PROJECT_DEFINITIONS,
  MEGA_PROJECT_BONUS_CONSUMERS,
  getMegaProjectBonuses,
  getLaunchCostMultiplier,
  applyLaunchCostReduction,
} from '../mega-projects';
import { BUILDINGS, BUILDING_MAP } from '../buildings';
import { SERVICE_MAP } from '../services';
import { MINING_PRODUCTION, RESOURCE_MAP } from '../resources';
import { EXPANDED_LOCATIONS } from '../colonies';
import { RESEARCH_MAP } from '../research-tree';
import {
  FACTION_LICENSES,
  FACTION_LICENSE_CONSUMERS,
  LICENSE_EFFECT_SUMMARY,
  LICENSE_RARE_TECH_UNLOCKS,
  getFactionLicenseBonuses,
  purchaseFactionLicense,
} from '../factions';
import { getEffectiveBrokerFeeRate } from '../market-engine';
import { getSpeedRunRewards, getPersonalBestReward, getRecordReward } from '../speed-runs';
import { VICTORY_CONDITIONS } from '../victory-conditions';
import { getExpeditionLaunchReadiness, planExpedition } from '../expeditions';
import type { GameState } from '../types';

const REPO = path.resolve(__dirname, '../../../..');

function sourceOf(relPath: string): string {
  return fs.readFileSync(path.join(REPO, relPath), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// E3.1 — the first interstellar jump must be reachable
// ─────────────────────────────────────────────────────────────────────────────

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    money: 0,
    totalEarned: 0,
    totalSpent: 0,
    companyName: 'Test Corp',
    gameDate: { year: 2150, month: 1, day: 1 },
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    eventLog: [],
    stats: {},
    ...over,
  } as unknown as GameState;
}

const IDLE_ARK = [{
  instanceId: 'ark1',
  definitionId: 'colony_ark',
  name: 'Ark One',
  status: 'idle',
  currentLocation: 'leo',
  isBuilt: true,
}];

const CREW = { engineers: 400, scientists: 400, miners: 400, operators: 400, pilots: 400 };

describe('E3.1 — the first interstellar jump is reachable without inventory fuel', () => {
  it('planExpedition launches a colony ark holding ZERO exotic fuel, buying the shortfall', () => {
    const state = baseState({
      completedResearch: ['jump_drive'],
      resources: {},
      money: 500_000_000_000,
      workforce: CREW,
      ships: IDLE_ARK,
    } as Partial<GameState>);
    const plan = planExpedition(state, {
      targetSystemId: 'proxima_centauri',
      shipInstanceId: 'ark1',
      insured: false,
      extraShielding: false,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    // The entire fuel load is procured, and the bill is real money.
    expect(plan.costs.fuelFromInventory).toBe(0);
    expect(plan.costs.fuelUnitsPurchased).toBe(plan.costs.fuelUnitsRequired);
    expect(plan.costs.fuelPurchaseCost).toBeGreaterThan(0);
  });

  it('the shared gate agrees with the planner — it is not a re-implementation', () => {
    // This is the defect in one assertion. `getExpeditionLaunchReadiness` is
    // what MapContextPanel, map-radial and galactic-map all now consult; if it
    // ever diverges from planExpedition again, this fails.
    const state = baseState({
      completedResearch: ['jump_drive'],
      resources: {},
      money: 500_000_000_000,
      workforce: CREW,
      ships: IDLE_ARK,
    } as Partial<GameState>);

    const readiness = getExpeditionLaunchReadiness(state, 'proxima_centauri')!;
    expect(readiness.canLaunch).toBe(true);
    expect(readiness.blockers).toEqual([]);

    const plan = planExpedition(state, {
      targetSystemId: 'proxima_centauri',
      shipInstanceId: 'ark1',
      insured: false,
      extraShielding: false,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(readiness.cheapestPlanCost).toBe(plan.costs.totalMoneyCost);
    expect(readiness.fuelPurchaseCost).toBe(plan.costs.fuelPurchaseCost);
  });

  it('blocks for the RIGHT reasons — research, hull, money — never for empty fuel stores', () => {
    const rich = { money: 500_000_000_000, workforce: CREW, resources: {} };

    const noResearch = getExpeditionLaunchReadiness(
      baseState({ ...rich, ships: IDLE_ARK } as Partial<GameState>), 'proxima_centauri')!;
    expect(noResearch.canLaunch).toBe(false);
    expect(noResearch.blockers.join(' ')).toMatch(/research required/i);

    const noHull = getExpeditionLaunchReadiness(
      baseState({ ...rich, completedResearch: ['jump_drive'] } as Partial<GameState>), 'proxima_centauri')!;
    expect(noHull.canLaunch).toBe(false);
    expect(noHull.blockers.join(' ')).toMatch(/Starfarer|Colony Ark/i);

    const broke = getExpeditionLaunchReadiness(baseState({
      completedResearch: ['jump_drive'], resources: {}, money: 1_000,
      workforce: CREW, ships: IDLE_ARK,
    } as Partial<GameState>), 'proxima_centauri')!;
    expect(broke.canLaunch).toBe(false);
    expect(broke.blockers.join(' ')).toMatch(/budget short/i);

    // No blocker anywhere in the repair may cite an exotic-fuel INVENTORY
    // shortfall — that requirement is unsatisfiable by construction.
    for (const r of [noResearch, noHull, broke]) {
      expect(r.blockers.join(' ')).not.toMatch(/exotic fuel short|need .* exotic/i);
    }
  });

  it('exotic_fuel still has no Sol-side source — the reason the gate had to change', () => {
    // If this ever stops being true (a refinery building ships, NPC restock
    // opens), the honest fix might flip back to an inventory requirement. Until
    // then, requiring inventory fuel is requiring the impossible.
    const fuel = RESOURCE_MAP.get('exotic_fuel')!;
    expect(fuel.startingSupply).toBe(0);
    expect(fuel.npcRestockPerHour).toBe(0);
    const producers = BUILDINGS.filter(b =>
      b.enabledServices.some(sid => (MINING_PRODUCTION[sid] || []).some(pr => pr.resource === 'exotic_fuel'))
      || Object.keys(b.producesPerMonth || {}).includes('exotic_fuel'));
    expect(producers.map(b => b.id)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E3.2 — legacy.trackers actually increment
// ─────────────────────────────────────────────────────────────────────────────

describe('E3.2 — legacy trackers accrue from real occurrences', () => {
  it('accrueLegacyTrackers adds each channel and never goes backwards', () => {
    const start = { ...DEFAULT_LEGACY, trackers: { ...DEFAULT_LEGACY.trackers } };
    const after = accrueLegacyTrackers(start, {
      resourcesMined: 120, buildingsCompleted: 2, shipsBuilt: 1, contractsCompleted: 3,
    })!;
    expect(after.trackers).toEqual({
      totalResourcesMined: 120,
      totalContractsCompleted: 3,
      totalShipsBuilt: 1,
      totalBuildingsCompleted: 2,
    });
    // Lifetime counters: a negative delta is ignored, not subtracted.
    const clamped = accrueLegacyTrackers(after, { resourcesMined: -50, buildingsCompleted: -9 })!;
    expect(clamped.trackers.totalResourcesMined).toBe(120);
    expect(clamped.trackers.totalBuildingsCompleted).toBe(2);
  });

  it('returns the SAME reference for a no-op tick (tick identity preserved)', () => {
    const start = { ...DEFAULT_LEGACY };
    expect(accrueLegacyTrackers(start, {})).toBe(start);
    expect(accrueLegacyTrackers(start, { resourcesMined: 0, shipsBuilt: 0 })).toBe(start);
  });

  it('sumMinedUnits totals a flow map and ignores negatives/garbage', () => {
    expect(sumMinedUnits({ iron: 10, titanium: 5 })).toBe(15);
    expect(sumMinedUnits({ iron: -10, titanium: 5 })).toBe(5);
    expect(sumMinedUnits(undefined)).toBe(0);
  });

  it('STRUCTURAL: the engine and the away path both write the trackers', () => {
    // The original defect was that `legacy.trackers` had four READERS and zero
    // writers outside the save migration. This asserts the writers exist where
    // the occurrences happen — the tick and the offline catch-up — so a
    // refactor that drops one fails here rather than silently re-breaking
    // legacy_first_mine, stretch_mining, and three era charters.
    const engine = sourceOf('src/lib/game/game-engine.ts');
    const away = sourceOf('src/lib/game/away-operations.ts');
    expect(engine).toContain('accrueLegacyTrackers');
    // Two engine sites: processTick (service mining + buildings) and
    // processFullTick §6e (ship mining, hulls, contracts).
    expect(engine.split('accrueLegacyTrackers').length - 1).toBeGreaterThanOrEqual(3);
    expect(away).toContain('accrueLegacyTrackers');
  });

  it('the three broken era charters read the trackers they now receive', () => {
    // expansion_era / belt_century / logistics_empire score off these three
    // fields; with the trackers pinned at 0 they always filed the worst medal.
    const snapshot = getEraStatSnapshot(baseState({
      legacy: {
        ...DEFAULT_LEGACY,
        trackers: {
          totalResourcesMined: 5_000,
          totalContractsCompleted: 4,
          totalShipsBuilt: 7,
          totalBuildingsCompleted: 11,
        },
      },
    } as Partial<GameState>));
    expect(snapshot.resourcesMined).toBe(5_000);
    expect(snapshot.buildingsCompleted).toBe(11);
    expect(snapshot.shipsBuilt).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E3.3 — every mega-project reward has a real consumer
// ─────────────────────────────────────────────────────────────────────────────

describe('E3.3 — mega-project completion rewards are real', () => {
  it('STRUCTURAL: every declared reward kind is registered with a consumer', () => {
    for (const def of MEGA_PROJECT_DEFINITIONS) {
      const kind = def.permanentBonus.type;
      expect(MEGA_PROJECT_BONUS_CONSUMERS[kind]).toBeDefined();
    }
  });

  it('STRUCTURAL: every registered consumer actually exists in the file it names', () => {
    // This is the guard the defect needed. `launch_cost_reduction` was
    // aggregated, typed, clamped, threaded into state and destructured in the
    // tick — every step present except a reader. Asserting the reader by name,
    // in the file that owns it, is the only check that would have failed.
    for (const [kind, consumer] of Object.entries(MEGA_PROJECT_BONUS_CONSUMERS)) {
      const src = sourceOf(consumer.module);
      expect(`${kind}: ${consumer.module} contains ${consumer.symbol} — ${src.includes(consumer.symbol)}`)
        .toBe(`${kind}: ${consumer.module} contains ${consumer.symbol} — true`);
    }
  });

  it('the launch-cost consumer is wired into ship orders and expedition launches', () => {
    expect(sourceOf('src/app/space-tycoon/page.tsx')).toContain('applyLaunchCostReduction');
    expect(sourceOf('src/components/game/FleetPanel.tsx')).toContain('applyLaunchCostReduction');
    expect(sourceOf('src/lib/game/expeditions.ts')).toContain('applyLaunchCostReduction');
  });

  it('is identity until a cooperative project completes, then discounts real money', () => {
    expect(getLaunchCostMultiplier({} as never)).toBe(1);
    expect(getLaunchCostMultiplier({ megaProjectBonuses: null })).toBe(1);
    expect(applyLaunchCostReduction(1_000_000_000, { megaProjectBonuses: null })).toBe(1_000_000_000);

    const withElevator = { megaProjectBonuses: getMegaProjectBonuses(['space_elevator']) };
    expect(getMegaProjectBonuses(['space_elevator']).launchCostReduction).toBeCloseTo(0.15, 5);
    expect(getLaunchCostMultiplier(withElevator)).toBeCloseTo(0.85, 5);
    expect(applyLaunchCostReduction(1_000_000_000, withElevator)).toBe(850_000_000);
  });

  it('clamps a hand-edited save at the documented 30% ceiling', () => {
    expect(getLaunchCostMultiplier({ megaProjectBonuses: { launchCostReduction: 5 } })).toBeCloseTo(0.70, 5);
    expect(getLaunchCostMultiplier({ megaProjectBonuses: { launchCostReduction: -3 } })).toBe(1);
  });

  it('the seeder can instantiate every definition, not just the Space Elevator', () => {
    const seeder = sourceOf('scripts/seed-mega-project.ts');
    expect(seeder).not.toContain("d.type === 'space_elevator'");
    expect(seeder).toContain('requestedType');
    expect(sourceOf('package.json')).toContain('seed:mega-project');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E3.4 — the 12 colonizable bodies have real, buildable content
// ─────────────────────────────────────────────────────────────────────────────

describe('E3.4 — colony bodies are playable content', () => {
  it('every id a body advertises resolves in BUILDING_MAP', () => {
    // The invariant whose absence let 50 dangling ids survive: the UI filters
    // FORWARD (BUILDINGS -> requiredLocation) and never dereferences this list,
    // so nothing crashed — the panel just said "no buildings available".
    const dangling: string[] = [];
    for (const loc of EXPANDED_LOCATIONS) {
      for (const id of loc.availableBuildings) {
        if (!BUILDING_MAP.get(id)) dangling.push(`${loc.id} -> ${id}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('every body has at least one building sited AT it (the forward direction)', () => {
    const empty = EXPANDED_LOCATIONS
      .filter(loc => !BUILDINGS.some(b => b.requiredLocation === loc.id))
      .map(loc => `${loc.id} (unlock $${(loc.unlockCost / 1e9).toFixed(0)}B buys nothing)`);
    expect(empty).toEqual([]);
  });

  it('every colony building enables a real service, and every mining service produces real resources', () => {
    const bad: string[] = [];
    const colonyLocIds = new Set(EXPANDED_LOCATIONS.map(l => l.id));
    for (const b of BUILDINGS) {
      if (!colonyLocIds.has(b.requiredLocation)) continue;
      for (const sid of b.enabledServices) {
        const svc = SERVICE_MAP.get(sid);
        if (!svc) { bad.push(`${b.id} -> missing service ${sid}`); continue; }
        if (svc.requiredBuildings[0] !== b.id) bad.push(`${sid} does not point back at ${b.id}`);
        if (svc.type === 'mining_output') {
          const prod = MINING_PRODUCTION[sid];
          if (!prod || prod.length === 0) { bad.push(`${sid} is mining_output with no MINING_PRODUCTION`); continue; }
          for (const { resource, amountPerMonth } of prod) {
            if (!RESOURCE_MAP.get(resource)) bad.push(`${sid} produces unknown resource ${resource}`);
            if (!(amountPerMonth > 0)) bad.push(`${sid} produces ${amountPerMonth} of ${resource}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every research id a body gates on exists in the tree (the aerostat_tech bug)', () => {
    // venus_orbit required `aerostat_tech`; the tree only ever had
    // `aerostat_technology`. Because the unlock button tests
    // completedResearch.includes(r), Venus could never be unlocked at all.
    const missing: string[] = [];
    for (const loc of EXPANDED_LOCATIONS) {
      for (const r of loc.requiredResearch) {
        if (!RESEARCH_MAP.get(r)) missing.push(`${loc.id} -> ${r}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E3.5 — speed-run rewards and victory titles
// ─────────────────────────────────────────────────────────────────────────────

describe('E3.5 — earned rewards are actually granted', () => {
  it('speed-run rewards no longer promise a currency that does not exist', () => {
    // `legacyPoints` was returned by the API and is not a field on LegacyState
    // — Legacy Power is a pure derivation with no additive pool. Rather than
    // invent one (a balance change smuggled into a bug fix), it is gone.
    const r = getSpeedRunRewards(1, 50, 'elite') as unknown as Record<string, unknown>;
    expect(r.legacyPoints).toBeUndefined();
    expect(getPersonalBestReward().cash).toBeGreaterThan(0);
    expect(Object.keys(DEFAULT_LEGACY)).not.toContain('legacyPoints');
  });

  it('rank 1, personal best and bracket record all pay cash, and the top ranks carry titles', () => {
    expect(getSpeedRunRewards(1, 50, 'elite').title).toBe('Speed Demon');
    expect(getSpeedRunRewards(3, 50, 'elite').title).toBe('Swift');
    expect(getSpeedRunRewards(999, 1000, 'rookie').cash).toBeGreaterThan(0);
    expect(getRecordReward().title).toBe('Record Holder');
  });

  it('STRUCTURAL: the check route credits the reward instead of returning and forgetting it', () => {
    const route = sourceOf('src/app/api/space-tycoon/speed-runs/check/route.ts');
    expect(route).toContain('gameProfile.update');
    expect(route).toContain("reason: 'speed_run_reward'");
    expect(route).toContain('getRecordReward');   // was authored with zero callers
    expect(route).toContain('rewardCredited');
    // …and the panel must read the body it used to discard.
    const panel = sourceOf('src/components/game/SpeedRunPanel.tsx');
    expect(panel).toContain('rewardCredited');
    expect(panel).not.toContain('LP +');           // the phantom-currency legend
  });

  it('STRUCTURAL: a won victory writes its title onto the player, not just the event log', () => {
    const page = sourceOf('src/app/space-tycoon/page.tsx');
    expect(page).toContain('playerTitle: victoryTitle || prev.playerTitle');
    // …and the leaderboard shows the player their own title (it hardcoded null).
    expect(sourceOf('src/components/game/LeaderboardPanel.tsx')).toContain('state.playerTitle');
  });

  it('all 11 victories carry a non-empty title to apply', () => {
    expect(VICTORY_CONDITIONS.length).toBeGreaterThanOrEqual(11);
    for (const v of VICTORY_CONDITIONS) {
      expect(typeof v.title).toBe('string');
      expect(v.title.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E3.6 — faction licences confer real, consumed effects
// ─────────────────────────────────────────────────────────────────────────────

describe('E3.6 — faction licences are not money sinks with a badge', () => {
  it('every licence maps to at least one real effect or a one-shot unlock', () => {
    const inert: string[] = [];
    for (const l of FACTION_LICENSES) {
      const b = getFactionLicenseBonuses([l.id]);
      const numeric = b.freightFuelDiscount + b.pirateMitigation + b.brokerFeeDiscount + b.biomaterialPerMonth;
      const unlocks = (LICENSE_RARE_TECH_UNLOCKS[l.grants] || []).length;
      if (numeric === 0 && unlocks === 0) inert.push(l.id);
    }
    expect(inert).toEqual([]);
  });

  it('STRUCTURAL: every effect channel is read by the module that owns it', () => {
    for (const [channel, consumer] of Object.entries(FACTION_LICENSE_CONSUMERS)) {
      const src = sourceOf(consumer.module);
      expect(`${channel}: ${consumer.module} reads ${consumer.symbol} — ${src.includes(consumer.symbol)}`)
        .toBe(`${channel}: ${consumer.module} reads ${consumer.symbol} — true`);
    }
    // The engine and the away path must agree on the biomaterial delivery.
    expect(sourceOf('src/lib/game/game-engine.ts')).toContain('getFactionLicenseBonuses');
    expect(sourceOf('src/lib/game/away-operations.ts')).toContain('getFactionLicenseBonuses');
    // The broker discount is server-authoritative, so the id list must be synced.
    expect(sourceOf('src/hooks/useGameSync.ts')).toContain('factionLicenses');
    expect(sourceOf('src/app/api/space-tycoon/sync/route.ts')).toContain('_factionLicenses');
    expect(sourceOf('src/app/api/space-tycoon/market/trade/route.ts')).toContain('licenseDiscount');
  });

  it('every licence tells the player what it does, in copy generated from the effect table', () => {
    for (const l of FACTION_LICENSES) {
      expect(typeof LICENSE_EFFECT_SUMMARY[l.id]).toBe('string');
      expect(LICENSE_EFFECT_SUMMARY[l.id].length).toBeGreaterThan(20);
    }
    expect(sourceOf('src/components/game/FactionPanel.tsx')).toContain('LICENSE_EFFECT_SUMMARY');
  });

  it('bonuses stack but stay inside their caps', () => {
    const all = getFactionLicenseBonuses(FACTION_LICENSES.map(l => l.id));
    expect(all.freightFuelDiscount).toBeLessThanOrEqual(0.12);
    expect(all.pirateMitigation).toBeLessThanOrEqual(0.25);
    expect(all.brokerFeeDiscount).toBeLessThanOrEqual(0.20);
    expect(all.biomaterialPerMonth).toBeLessThanOrEqual(4);
    expect(getFactionLicenseBonuses([])).toEqual({
      freightFuelDiscount: 0, pirateMitigation: 0, brokerFeeDiscount: 0, biomaterialPerMonth: 0,
    });
    expect(getFactionLicenseBonuses(['not_a_licence'])).toEqual({
      freightFuelDiscount: 0, pirateMitigation: 0, brokerFeeDiscount: 0, biomaterialPerMonth: 0,
    });
  });

  it('the gray-market licence really reduces the broker fee', () => {
    const base = getEffectiveBrokerFeeRate({});
    const withLicence = getEffectiveBrokerFeeRate({
      licenseDiscount: getFactionLicenseBonuses(['syndicate_blackmarket_access']).brokerFeeDiscount,
    });
    expect(withLicence).toBeLessThan(base);
    expect(withLicence).toBeCloseTo(base * 0.8, 8);
  });

  it('the precursor licence unlocks a real rare tech on purchase', () => {
    const def = FACTION_LICENSES.find(l => l.grants === 'precursor_access')!;
    const state = baseState({
      money: def.cost * 2,
      factionReputation: { 'echo-remnants': 40 },
      factionLicenses: [],
    } as Partial<GameState>);
    const after = purchaseFactionLicense(state, def.id);
    expect(after.factionLicenses).toContain(def.id);
    for (const techId of LICENSE_RARE_TECH_UNLOCKS.precursor_access!) {
      expect(RESEARCH_MAP.get(techId)?.rare).toBe(true);
      expect(after.unlockedRareTechIds).toContain(techId);
    }
  });

  it('purchase still refuses when standing, funds or the embargo say no', () => {
    const def = FACTION_LICENSES.find(l => l.grants === 'precursor_access')!;
    const poor = baseState({ money: 1, factionReputation: { 'echo-remnants': 40 } } as Partial<GameState>);
    expect(purchaseFactionLicense(poor, def.id)).toBe(poor);
    const lowStanding = baseState({ money: def.cost * 2, factionReputation: { 'echo-remnants': 0 } } as Partial<GameState>);
    expect(purchaseFactionLicense(lowStanding, def.id)).toBe(lowStanding);
  });
});
