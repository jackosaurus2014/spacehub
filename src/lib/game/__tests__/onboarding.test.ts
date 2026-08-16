// ─── Onboarding chain (FTUE v2) — pure-logic tests ──────────────────────────
// Covers: step-definition integrity, archetype-aware completion detection
// (the bug that broke the old overlay: archetype starting buildings must NOT
// auto-complete the build/income steps), advancement + one-time reward
// grants, skip/restart, newcomer-HUD gating, and the V41 save migration that
// maps the old "6 = done" sentinel onto the longer chain.

import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_MAP,
  ONBOARDING_DONE_STEP,
  ONBOARDING_CHAIN_VERSION,
  hasPlayerBuiltBuilding,
  hasPlayerBuiltCompleteBuilding,
  isOnboardingStepComplete,
  isOnboardingActive,
  isOnboardingComplete,
  isEarlyOnboarding,
  isNewcomerHud,
  getCurrentOnboardingStep,
  advanceOnboarding,
  skipOnboarding,
  completeOnboarding,
  restartOnboarding,
} from '../onboarding';
import { getNewGameState, loadGame, saveGame } from '../save-load';
import { applyArchetype } from '../archetypes';
import type { GameState } from '../types';

function freshArchetypeState(): GameState {
  return applyArchetype(getNewGameState(), 'cape_heritage');
}

function stepNumber(id: string): number {
  const def = ONBOARDING_STEPS.find(s => s.id === id);
  if (!def) throw new Error(`unknown step id ${id}`);
  return def.step;
}

describe('onboarding step definitions', () => {
  it('steps are 1..N contiguous and unique, done sentinel is N+1', () => {
    const nums = ONBOARDING_STEPS.map(s => s.step);
    expect(nums).toEqual(Array.from({ length: ONBOARDING_STEPS.length }, (_, i) => i + 1));
    expect(ONBOARDING_DONE_STEP).toBe(ONBOARDING_STEPS.length + 1);
    expect(ONBOARDING_STEP_MAP.size).toBe(ONBOARDING_STEPS.length);
  });

  it('every step carries what/why/where copy and a target tab', () => {
    for (const s of ONBOARDING_STEPS) {
      expect(s.what.length).toBeGreaterThan(10);
      expect(s.why.length).toBeGreaterThan(10);
      expect(s.where.length).toBeGreaterThan(5);
      expect(s.targetTab).toBeTruthy();
    }
  });

  it('total chain rewards stay below the $60M starter contract (honest, small grants)', () => {
    const total = ONBOARDING_STEPS.reduce((sum, s) => sum + s.rewardMoney, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(60_000_000);
  });
});

describe('archetype-aware detection', () => {
  it('a fresh archetype save starts the chain at step 1 with buildings already present', () => {
    const state = freshArchetypeState();
    expect(state.buildings.length).toBeGreaterThan(0); // archetypes pre-seed
    expect(isOnboardingActive(state)).toBe(true);
    expect(getCurrentOnboardingStep(state)?.id).toBe('command_deck');
  });

  it('archetype starting buildings do NOT complete the first-build step', () => {
    const state = freshArchetypeState();
    expect(hasPlayerBuiltBuilding(state)).toBe(false);
    expect(isOnboardingStepComplete(state, stepNumber('first_build'))).toBe(false);
    expect(isOnboardingStepComplete(state, stepNumber('first_income'))).toBe(false);
  });

  it('a player-ordered building completes first_build; its completion completes first_income', () => {
    const state = freshArchetypeState();
    const withBuild: GameState = {
      ...state,
      buildings: [...state.buildings, {
        instanceId: 'player-bld-1',
        definitionId: 'ground_station',
        locationId: 'earth_surface',
        buildStartDate: state.gameDate,
        completionDate: state.gameDate,
        isComplete: false,
        startedAtMs: Date.now(),
        realDurationSeconds: 180,
      }],
    };
    expect(hasPlayerBuiltBuilding(withBuild)).toBe(true);
    expect(isOnboardingStepComplete(withBuild, stepNumber('first_build'))).toBe(true);
    expect(hasPlayerBuiltCompleteBuilding(withBuild)).toBe(false);
    expect(isOnboardingStepComplete(withBuild, stepNumber('first_income'))).toBe(false);

    const completed: GameState = {
      ...withBuild,
      buildings: withBuild.buildings.map(b =>
        b.instanceId === 'player-bld-1' ? { ...b, isComplete: true } : b),
    };
    expect(isOnboardingStepComplete(completed, stepNumber('first_income'))).toBe(true);
  });

  it('research / contract / trade / GEO / Luna detections read the right state', () => {
    const base = freshArchetypeState();
    expect(isOnboardingStepComplete(base, stepNumber('first_research'))).toBe(false);
    expect(isOnboardingStepComplete(
      { ...base, activeResearch: { definitionId: 'x', startDate: base.gameDate, progressMonths: 0, totalMonths: 1, startedAtMs: 0, realDurationSeconds: 1 } },
      stepNumber('first_research'),
    )).toBe(true);

    expect(isOnboardingStepComplete(base, stepNumber('first_contract'))).toBe(false);
    expect(isOnboardingStepComplete({ ...base, activeContracts: ['c_first_launch'] }, stepNumber('first_contract'))).toBe(true);

    expect(isOnboardingStepComplete(base, stepNumber('first_trade'))).toBe(false);
    expect(isOnboardingStepComplete({ ...base, hasTradedOnMarket: true }, stepNumber('first_trade'))).toBe(true);

    expect(isOnboardingStepComplete(base, stepNumber('next_orbit'))).toBe(false);
    expect(isOnboardingStepComplete({ ...base, unlockedLocations: [...base.unlockedLocations, 'geo'] }, stepNumber('next_orbit'))).toBe(true);

    expect(isOnboardingStepComplete(base, stepNumber('road_to_luna'))).toBe(false);
    expect(isOnboardingStepComplete({ ...base, unlockedLocations: [...base.unlockedLocations, 'lunar_orbit'] }, stepNumber('road_to_luna'))).toBe(true);
  });
});

describe('advancement and rewards', () => {
  it('step 1 (orientation) advances manually, never automatically, with no grant', () => {
    const state = freshArchetypeState();
    // Non-manual advance is refused (no detection on step 1).
    expect(advanceOnboarding(state, { manual: false })).toBe(state);
    const advanced = advanceOnboarding(state, { manual: true });
    expect(advanced.tutorialStep).toBe(2);
    expect(advanced.money).toBe(state.money);
    expect(advanced.totalEarned).toBe(state.totalEarned);
  });

  it('detection-backed steps refuse manual advance and grant their reward exactly at the boundary', () => {
    let state = advanceOnboarding(freshArchetypeState(), { manual: true }); // → step 2
    expect(state.tutorialStep).toBe(2);

    // Manual click on an undetected detection-backed step: refused.
    expect(advanceOnboarding(state, { manual: true })).toBe(state);

    // Player orders a building → detection passes → advance grants $8M once.
    state = {
      ...state,
      buildings: [...state.buildings, {
        instanceId: 'player-bld-1', definitionId: 'ground_station', locationId: 'earth_surface',
        buildStartDate: state.gameDate, completionDate: state.gameDate,
        isComplete: false, startedAtMs: Date.now(), realDurationSeconds: 180,
      }],
    };
    const before = state.money;
    const rewardDef = ONBOARDING_STEP_MAP.get(2)!;
    const advanced = advanceOnboarding(state, { manual: false });
    expect(advanced.tutorialStep).toBe(3);
    expect(advanced.money).toBe(before + rewardDef.rewardMoney);
    expect(advanced.totalEarned).toBe(state.totalEarned + rewardDef.rewardMoney);
    expect(advanced.eventLog[0].title).toContain('Commissioning grant');

    // Advancing again does NOT re-grant step 2's reward (chain moved on).
    const again = advanceOnboarding(advanced, { manual: false });
    // step 3 detection (player building complete) not met → unchanged.
    expect(again).toBe(advanced);
  });

  it('the horizon step allows a manual finish without granting its reward', () => {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
    const state: GameState = { ...freshArchetypeState(), tutorialStep: last.step };
    const finished = advanceOnboarding(state, { manual: true });
    expect(finished.tutorialStep).toBe(ONBOARDING_DONE_STEP);
    expect(finished.money).toBe(state.money); // no unearned grant
    expect(isOnboardingComplete(finished)).toBe(true);
  });

  it('the horizon step grants its reward when Luna is actually reached', () => {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
    const state: GameState = {
      ...freshArchetypeState(),
      tutorialStep: last.step,
      unlockedLocations: ['earth_surface', 'leo', 'lunar_orbit'],
    };
    const finished = advanceOnboarding(state, { manual: false });
    expect(finished.tutorialStep).toBe(ONBOARDING_DONE_STEP);
    expect(finished.money).toBe(state.money + last.rewardMoney);
  });

  it('skip ends the chain and forfeits grants; restart re-arms it', () => {
    const state = freshArchetypeState();
    const skipped = skipOnboarding(state);
    expect(isOnboardingActive(skipped)).toBe(false);
    expect(skipped.tutorialDismissed).toBe(true);
    expect(skipped.money).toBe(state.money);

    const restarted = restartOnboarding(skipped);
    expect(isOnboardingActive(restarted)).toBe(true);
    expect(restarted.tutorialStep).toBe(1);

    const done = completeOnboarding(restarted);
    expect(isOnboardingComplete(done)).toBe(true);
  });
});

describe('newcomer HUD + early-onboarding gates', () => {
  it('is on for a fresh tier-1 save mid-chain, off after skip/completion or at tier 2+', () => {
    const state = freshArchetypeState();
    expect(isNewcomerHud(state)).toBe(true);
    expect(isEarlyOnboarding(state)).toBe(true);
    expect(isNewcomerHud(skipOnboarding(state))).toBe(false);
    expect(isNewcomerHud(completeOnboarding(state))).toBe(false);
    expect(isNewcomerHud({ ...state, corporationTier: 2 })).toBe(false);
    expect(isEarlyOnboarding({ ...state, tutorialStep: 4 })).toBe(false);
  });
});

describe('V41 save migration (old done-sentinel → chain-aware sentinel)', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('an un-migrated save with the OLD "6 = done" sentinel loads as chain-complete', () => {
    const state = freshArchetypeState();
    const legacy = { ...state, tutorialStep: 6 } as GameState;
    delete (legacy as Partial<GameState>).onboardingChainVersion;
    saveGame(legacy);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.tutorialStep).toBe(ONBOARDING_DONE_STEP);
    expect(loaded!.onboardingChainVersion).toBe(ONBOARDING_CHAIN_VERSION);
    expect(isOnboardingComplete(loaded!)).toBe(true);
  });

  it('a save already on chain v2 keeps its mid-chain position (never re-bumped)', () => {
    const state = { ...freshArchetypeState(), tutorialStep: 6 }; // NEW step 6 (first_trade)
    saveGame(state);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.tutorialStep).toBe(6);
    expect(isOnboardingActive(loaded!)).toBe(true);
  });

  it('an un-migrated save mid-old-tutorial keeps its position', () => {
    const state = freshArchetypeState();
    const legacy = { ...state, tutorialStep: 3 } as GameState;
    delete (legacy as Partial<GameState>).onboardingChainVersion;
    saveGame(legacy);
    const loaded = loadGame();
    expect(loaded!.tutorialStep).toBe(3);
    expect(loaded!.onboardingChainVersion).toBe(ONBOARDING_CHAIN_VERSION);
  });

  it('fresh games are stamped with the current chain version and step 1', () => {
    const fresh = getNewGameState();
    expect(fresh.tutorialStep).toBe(1);
    expect(fresh.onboardingChainVersion).toBe(ONBOARDING_CHAIN_VERSION);
    expect(fresh.hasTradedOnMarket).toBe(false);
  });
});
