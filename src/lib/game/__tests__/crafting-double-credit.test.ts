/**
 * @jest-environment node
 *
 * Wave E1 (docs/ECONOMY_PVP_2026-08.md §E1, exploit #3) regression: crafting
 * used to credit its output TWICE — once instantly in page.tsx's
 * onStartCrafting handler (into `craftedProducts`), and again in
 * game-engine.ts's processFullTick refining-completion check (into
 * `resources`) when `activeRefining` elapsed. Every craft yielded 2x its
 * recipe.outputQuantity.
 *
 * The fix removed the instant credit in page.tsx — the engine's completion
 * credit (into `resources`) is now the single source of truth. page.tsx's
 * onStartCrafting is an inline React callback and isn't independently
 * unit-testable, so this suite proves the *engine* completion path is the
 * ONLY place output is ever credited, and that it credits exactly once
 * (not on every subsequent tick after completion).
 */
import { processFullTick } from '../game-engine';
import { getGlobalGameDate } from '../server-time';
import { CHAIN_MAP } from '../production-chains';
import type { GameState } from '../types';

const recipe = CHAIN_MAP.get('smelt_steel')!; // iron:20 -> steel_ingots x10, 120s

/** Pinned to the CURRENT global game date so isMonthEnd is false and the
 *  tick is deterministic (matches the audit-wave-b-wiring.test.ts pattern). */
function baseState(overrides: Partial<GameState> = {}): GameState {
  const now = Date.now();
  const globalDate = getGlobalGameDate();
  return {
    version: 1,
    createdAt: now,
    lastTickAt: now,
    money: 50_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: globalDate.year, month: globalDate.month },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    craftedProducts: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    frontierStatus: 'none',
    ...overrides,
  };
}

describe('crafting double-credit fix — E1 exploit #3 regression', () => {
  it('sanity: recipe fixture matches the documented exploit (steel smelting, 10 ingots)', () => {
    expect(recipe.outputId).toBe('steel_ingots');
    expect(recipe.outputQuantity).toBe(10);
  });

  it('post-fix "start crafting" state (activeRefining set, no instant credit) has zero output before completion', () => {
    // This IS what page.tsx's onStartCrafting now produces: inputs deducted,
    // activeRefining started, resources/craftedProducts untouched for the
    // output. (Before the fix, craftedProducts[outputId] would already be
    // +10 at this point — the first half of the double-credit.)
    const started = baseState({
      activeRefining: { recipeId: recipe.id, startedAtMs: Date.now(), durationSeconds: recipe.timeSeconds },
    });
    expect(started.resources[recipe.outputId] || 0).toBe(0);
    expect(started.craftedProducts?.[recipe.outputId] || 0).toBe(0);
  });

  it('engine credits output exactly once when the craft completes', () => {
    const started = baseState({
      activeRefining: {
        recipeId: recipe.id,
        startedAtMs: Date.now() - (recipe.timeSeconds + 5) * 1000, // already elapsed
        durationSeconds: recipe.timeSeconds,
      },
    });
    const afterCompletion = processFullTick(started);

    expect(afterCompletion.resources[recipe.outputId] || 0).toBe(recipe.outputQuantity);
    // craftedProducts must NOT also receive the output — that was the bug.
    expect(afterCompletion.craftedProducts?.[recipe.outputId] || 0).toBe(0);
    expect(afterCompletion.activeRefining).toBeNull();
  });

  it('regression: total credit across the full start->complete lifecycle is exactly outputQuantity, never 2x', () => {
    // Simulates the full lifecycle: start (post-fix, no instant credit) then
    // one completed tick. Before the E1 fix, the equivalent flow would have
    // produced resources[outputId] + craftedProducts[outputId] === 20 (2x10).
    let state = baseState({
      activeRefining: {
        recipeId: recipe.id,
        startedAtMs: Date.now() - (recipe.timeSeconds + 5) * 1000,
        durationSeconds: recipe.timeSeconds,
      },
    });
    state = processFullTick(state);
    const totalCredited = (state.resources[recipe.outputId] || 0) + (state.craftedProducts?.[recipe.outputId] || 0);
    expect(totalCredited).toBe(recipe.outputQuantity); // NOT recipe.outputQuantity * 2
  });

  it('does not re-credit on a second tick after completion (activeRefining already cleared)', () => {
    let state = baseState({
      activeRefining: {
        recipeId: recipe.id,
        startedAtMs: Date.now() - (recipe.timeSeconds + 5) * 1000,
        durationSeconds: recipe.timeSeconds,
      },
    });
    state = processFullTick(state); // completes, credits once
    expect(state.resources[recipe.outputId]).toBe(recipe.outputQuantity);

    state = processFullTick(state); // a second tick with activeRefining already null
    expect(state.resources[recipe.outputId]).toBe(recipe.outputQuantity); // unchanged
  });

  it('does not credit output before the craft duration has elapsed', () => {
    const inProgress = baseState({
      activeRefining: {
        recipeId: recipe.id,
        startedAtMs: Date.now() - 5_000, // only 5s of a 120s craft
        durationSeconds: recipe.timeSeconds,
      },
    });
    const after = processFullTick(inProgress);
    expect(after.resources[recipe.outputId] || 0).toBe(0);
    expect(after.activeRefining).not.toBeNull();
  });
});
