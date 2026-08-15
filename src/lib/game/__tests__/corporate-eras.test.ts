/**
 * @jest-environment node
 *
 * Live-Service Wave LS4 — Corporate Eras.
 * Covers: deterministic 90-real-day era boundary math, focus bonus/malus
 * trade-off application (getActiveEraModifiers), medal evaluation from mock
 * tracked stats, and chartering lifecycle guards.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  ERA_CHARTERS, ERA_CHARTER_MAP, ERA_DURATION_MS, ERA_MIN_CORPORATION_TIER,
  NEUTRAL_ERA_MODIFIERS, canCharterEra, charterEra, getActiveEraModifiers,
  getEraBracketScale, getEraGoalTarget, computeEraGoalScore, getEraMedalForScore,
  getEraProgress, shouldCompleteEra, completeCurrentEra, getEraStatSnapshot,
  getCompletedEraCount, getBestEraMedal,
} from '../corporate-eras';

const NOW = Date.UTC(2026, 7, 14, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  // money: 0 pins netWorth to 0 so assignPlayerToLeague always resolves to
  // bracket 1 (Suborbital, minNetWorth 0) unless a test explicitly overrides
  // money/totalEarned/totalSpent — STARTING_MONEY (100,000,000) sits exactly
  // on League 2's floor, which would otherwise silently bracket-scale every
  // goal target in this file's tests.
  return { ...getNewGameState(), corporationTier: 3, money: 0, ...overrides };
}

describe('era boundary math — determinism', () => {
  it('sets endsAtMs to exactly startedAtMs + 90 real days', () => {
    const state = baseState();
    const next = charterEra(state, 'expansion_era', NOW);
    const active = next.corporateEras!.currentEra!;
    expect(active.startedAtMs).toBe(NOW);
    expect(active.endsAtMs).toBe(NOW + ERA_DURATION_MS);
    expect(ERA_DURATION_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('produces an identical ActiveCorporateEra for the same state/charter/now (pure function)', () => {
    const state = baseState();
    const a = charterEra(state, 'research_renaissance', NOW).corporateEras!.currentEra;
    const b = charterEra(state, 'research_renaissance', NOW).corporateEras!.currentEra;
    expect(a).toEqual(b);
  });

  it('shouldCompleteEra is false before endsAtMs and true at/after it — same math live or during away catch-up', () => {
    const state = charterEra(baseState(), 'expansion_era', NOW);
    expect(shouldCompleteEra(state, NOW)).toBe(false);
    expect(shouldCompleteEra(state, NOW + ERA_DURATION_MS - 1)).toBe(false);
    expect(shouldCompleteEra(state, NOW + ERA_DURATION_MS)).toBe(true);
    // A "returned after months away" wall-clock jump produces the identical
    // true/false verdict a live tick would — no drift risk.
    expect(shouldCompleteEra(state, NOW + ERA_DURATION_MS + 400 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it('bracket scale is monotonic and pinned at bracket 1 = 1.0x / bracket 8 = 4.5x', () => {
    expect(getEraBracketScale(1)).toBe(1);
    expect(getEraBracketScale(8)).toBeCloseTo(4.5);
    for (let b = 1; b < 8; b++) {
      expect(getEraBracketScale(b + 1)).toBeGreaterThan(getEraBracketScale(b));
    }
  });

  it('bracket scale clamps out-of-range inputs instead of throwing', () => {
    expect(getEraBracketScale(0)).toBe(getEraBracketScale(1));
    expect(getEraBracketScale(99)).toBe(getEraBracketScale(8));
    expect(getEraBracketScale(NaN)).toBe(getEraBracketScale(1));
  });

  it('getEraGoalTarget scales the charter base target by the bracket factor', () => {
    const charter = ERA_CHARTER_MAP.get('expansion_era')!;
    expect(getEraGoalTarget(charter, 1)).toBe(charter.goalBaseTarget);
    expect(getEraGoalTarget(charter, 8)).toBeCloseTo(charter.goalBaseTarget * 4.5);
  });
});

describe('charter catalog integrity', () => {
  it('defines exactly 8 charters, each with a distinct id', () => {
    expect(ERA_CHARTERS).toHaveLength(8);
    const ids = new Set(ERA_CHARTERS.map(c => c.id));
    expect(ids.size).toBe(8);
  });

  it('every charter pairs a FAVORABLE bonus with an UNFAVORABLE malus — never a free win', () => {
    // "Favorable" flips sign for the 'cost' category: a cost bonus is
    // negative (cheaper) and a cost malus is positive (pricier overhead);
    // every other category is the opposite (positive = favorable).
    const isFavorable = (term: typeof ERA_CHARTERS[number]['bonus']) =>
      term.category === 'cost' ? term.value < 0 : term.value > 0;
    for (const charter of ERA_CHARTERS) {
      expect(isFavorable(charter.bonus)).toBe(true);
      expect(isFavorable(charter.malus)).toBe(false);
    }
  });
});

describe('focus trade-off application — getActiveEraModifiers', () => {
  it('returns the neutral 1.0 set when no era is chartered', () => {
    expect(getActiveEraModifiers(baseState())).toEqual(NEUTRAL_ERA_MODIFIERS);
  });

  it('is safe on an undefined/null state (pre-LS4 save shape)', () => {
    expect(getActiveEraModifiers(undefined)).toEqual(NEUTRAL_ERA_MODIFIERS);
    expect(getActiveEraModifiers(null)).toEqual(NEUTRAL_ERA_MODIFIERS);
  });

  it('applies Expansion Era\'s +10% revenue / +8% overhead exactly, other categories untouched', () => {
    const state = charterEra(baseState(), 'expansion_era', NOW);
    const mods = getActiveEraModifiers(state);
    expect(mods.revenueMultiplier).toBeCloseTo(1.10);
    expect(mods.costMultiplier).toBeCloseTo(1.08);
    expect(mods.buildSpeedMultiplier).toBe(1);
    expect(mods.researchSpeedMultiplier).toBe(1);
    expect(mods.miningMultiplier).toBe(1);
  });

  it('applies Consolidation\'s cost REDUCTION (malus is a revenue cut, not another cost term)', () => {
    const state = charterEra(baseState(), 'consolidation', NOW);
    const mods = getActiveEraModifiers(state);
    expect(mods.costMultiplier).toBeCloseTo(0.88);
    expect(mods.revenueMultiplier).toBeCloseTo(0.92);
  });

  it('applies Belt Century\'s mining bonus paired with a build-speed malus', () => {
    const state = charterEra(baseState(), 'belt_century', NOW);
    const mods = getActiveEraModifiers(state);
    expect(mods.miningMultiplier).toBeCloseTo(1.15);
    expect(mods.buildSpeedMultiplier).toBeCloseTo(0.92);
  });

  it('never stacks two eras — only ONE charter\'s terms are ever active at a time', () => {
    const state = charterEra(baseState(), 'expansion_era', NOW);
    // Attempting to charter a second era while one is active is rejected
    // (canCharterEra guard) — modifiers stay Expansion Era's, not stacked.
    const attempted = charterEra(state, 'belt_century', NOW + 1000);
    expect(attempted.corporateEras!.currentEra!.charterId).toBe('expansion_era');
    const mods = getActiveEraModifiers(attempted);
    expect(mods.miningMultiplier).toBe(1); // belt_century's bonus never applied
  });
});

describe('chartering lifecycle guards', () => {
  it('rejects chartering below the minimum corporation tier', () => {
    const state = baseState({ corporationTier: 1 });
    const gate = canCharterEra(state, NOW);
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain(`Tier ${ERA_MIN_CORPORATION_TIER}`);
    const next = charterEra(state, 'expansion_era', NOW);
    expect(next).toBe(state); // defensive no-op — same reference, not just equal
    expect(next.corporateEras?.currentEra).toBeNull();
  });

  it('rejects a second charter while one is already active', () => {
    const chartered = charterEra(baseState(), 'expansion_era', NOW);
    const gate = canCharterEra(chartered, NOW + 1000);
    expect(gate.allowed).toBe(false);
  });

  it('ignores an unknown charter id (defensive no-op, same state reference)', () => {
    const state = baseState();
    // @ts-expect-error deliberately invalid id for the defensive-guard test
    const next = charterEra(state, 'not_a_real_charter', NOW);
    expect(next).toBe(state);
  });

  it('assigns sequential eraIndex values across a corporation\'s lifetime', () => {
    let state = charterEra(baseState(), 'expansion_era', NOW);
    state = completeCurrentEra(state, NOW + ERA_DURATION_MS);
    expect(state.corporateEras!.completedEras[0].eraIndex).toBe(0);
    state = charterEra(state, 'research_renaissance', NOW + ERA_DURATION_MS + 1000);
    expect(state.corporateEras!.currentEra!.eraIndex).toBe(1);
  });
});

describe('medal evaluation — computeEraGoalScore / getEraMedalForScore', () => {
  const atLeastCharter = ERA_CHARTER_MAP.get('expansion_era')!; // goalDirection: 'atLeast'
  const atMostCharter = ERA_CHARTER_MAP.get('consolidation')!; // goalDirection: 'atMost'

  it('atLeast: hitting the target exactly scores 1.0 -> gold', () => {
    const score = computeEraGoalScore(atLeastCharter, 8, 8);
    expect(score).toBeCloseTo(1.0);
    expect(getEraMedalForScore(score)).toBe('gold');
  });

  it('atLeast: 1.5x the target scores 1.5 -> platinum', () => {
    const score = computeEraGoalScore(atLeastCharter, 12, 8);
    expect(score).toBeCloseTo(1.5);
    expect(getEraMedalForScore(score)).toBe('platinum');
  });

  it('atLeast: zero progress scores 0 -> filed (not punitive, just factual)', () => {
    const score = computeEraGoalScore(atLeastCharter, 0, 8);
    expect(score).toBe(0);
    expect(getEraMedalForScore(score)).toBe('filed');
  });

  it('atLeast: partial progress lands in bronze/silver bands correctly', () => {
    expect(getEraMedalForScore(computeEraGoalScore(atLeastCharter, 2, 8))).toBe('bronze'); // 0.25
    expect(getEraMedalForScore(computeEraGoalScore(atLeastCharter, 5, 8))).toBe('silver'); // 0.625
  });

  it('atMost: spending nothing scores exactly 2.0 -> platinum', () => {
    const score = computeEraGoalScore(atMostCharter, 0, 250_000_000);
    expect(score).toBe(2);
    expect(getEraMedalForScore(score)).toBe('platinum');
  });

  it('atMost: spending exactly the target scores 1.0 -> gold', () => {
    const score = computeEraGoalScore(atMostCharter, 250_000_000, 250_000_000);
    expect(score).toBeCloseTo(1.0);
    expect(getEraMedalForScore(score)).toBe('gold');
  });

  it('atMost: overspending by 50% scores ~0.667, in the silver band', () => {
    const score = computeEraGoalScore(atMostCharter, 375_000_000, 250_000_000);
    expect(score).toBeCloseTo(0.667, 2);
    expect(getEraMedalForScore(score)).toBe('silver');
  });

  it('atMost: overspending 2x scores 0.5, in the bronze band', () => {
    const score = computeEraGoalScore(atMostCharter, 500_000_000, 250_000_000);
    expect(score).toBeCloseTo(0.5);
    expect(getEraMedalForScore(score)).toBe('bronze');
  });

  it('handles a zero/invalid target without throwing or dividing by zero', () => {
    expect(computeEraGoalScore(atLeastCharter, 5, 0)).toBe(0);
    expect(computeEraGoalScore(atLeastCharter, -5, 8)).toBe(0); // negative actual clamped
  });
});

describe('medal evaluation — completeCurrentEra end-to-end from mock stats', () => {
  it('is a no-op before the era has expired', () => {
    const state = charterEra(baseState(), 'expansion_era', NOW);
    const result = completeCurrentEra(state, NOW + 1000);
    expect(result).toBe(state);
  });

  it('grades a gold-tier era from mock building-completion progress', () => {
    let state = charterEra(baseState(), 'expansion_era', NOW);
    // expansion_era's goal is buildingsCompleted, base target 8, bracket 1 = 8.
    state = {
      ...state,
      legacy: {
        ...state.legacy!,
        trackers: { ...state.legacy!.trackers, totalBuildingsCompleted: 8 },
      },
    };
    const completed = completeCurrentEra(state, NOW + ERA_DURATION_MS);
    expect(completed.corporateEras!.currentEra).toBeNull();
    const record = completed.corporateEras!.completedEras[0];
    expect(record.medal).toBe('gold');
    expect(record.goalActual).toBe(8);
    expect(record.goalTarget).toBe(8);
    expect(record.charterId).toBe('expansion_era');
  });

  it('grades a filed (below-bronze) era when the goal metric never moved', () => {
    const state = charterEra(baseState(), 'expansion_era', NOW);
    const completed = completeCurrentEra(state, NOW + ERA_DURATION_MS);
    const record = completed.corporateEras!.completedEras[0];
    expect(record.medal).toBe('filed');
    expect(record.goalActual).toBe(0);
  });

  it('scores the DELTA since era start, not the cumulative total (no head-start credit)', () => {
    // Start the era with 4 buildings already completed pre-charter — those
    // shouldn't count toward this era's goal.
    let state = baseState({
      legacy: { ...getNewGameState().legacy!, trackers: { ...getNewGameState().legacy!.trackers, totalBuildingsCompleted: 4 } },
    });
    state = charterEra(state, 'expansion_era', NOW);
    // Only 3 MORE buildings complete during the era (4 -> 7).
    state = {
      ...state,
      legacy: { ...state.legacy!, trackers: { ...state.legacy!.trackers, totalBuildingsCompleted: 7 } },
    };
    const completed = completeCurrentEra(state, NOW + ERA_DURATION_MS);
    const record = completed.corporateEras!.completedEras[0];
    expect(record.goalActual).toBe(3); // delta, not the raw 7
  });

  it('clears the active era and re-opens chartering for the next one', () => {
    let state = charterEra(baseState(), 'expansion_era', NOW);
    state = completeCurrentEra(state, NOW + ERA_DURATION_MS);
    expect(canCharterEra(state, NOW + ERA_DURATION_MS).allowed).toBe(true);
  });

  it('feeds getCompletedEraCount / getBestEraMedal correctly across multiple eras', () => {
    let state = charterEra(baseState(), 'expansion_era', NOW);
    state = completeCurrentEra(state, NOW + ERA_DURATION_MS); // filed (no progress)
    expect(getCompletedEraCount(state)).toBe(1);
    expect(getBestEraMedal(state)).toBe('filed');

    state = charterEra(state, 'research_renaissance', NOW + ERA_DURATION_MS + 1000);
    state = { ...state, completedResearch: Array.from({ length: 6 }, (_, i) => `tech_${i}`) };
    state = completeCurrentEra(state, NOW + 2 * ERA_DURATION_MS + 1000); // exactly hits target -> gold
    expect(getCompletedEraCount(state)).toBe(2);
    expect(getBestEraMedal(state)).toBe('gold');
  });
});

describe('getEraProgress — live read-only view', () => {
  it('returns the inactive shape when nothing is chartered', () => {
    const progress = getEraProgress(baseState(), NOW);
    expect(progress.active).toBe(false);
  });

  it('reports pctComplete and daysRemaining consistently mid-era', () => {
    const state = charterEra(baseState(), 'expansion_era', NOW);
    const midway = NOW + ERA_DURATION_MS / 2;
    const progress = getEraProgress(state, midway);
    expect(progress.active).toBe(true);
    expect(progress.pctComplete).toBeCloseTo(0.5, 1);
    expect(progress.daysRemaining).toBeCloseTo(45, 0);
  });

  it('does not mutate state (pure read)', () => {
    const state = charterEra(baseState(), 'expansion_era', NOW);
    const snapshotBefore = JSON.stringify(state);
    getEraProgress(state, NOW + 1000);
    expect(JSON.stringify(state)).toBe(snapshotBefore);
  });
});

describe('getEraStatSnapshot', () => {
  it('reads from legacy trackers when available (matches legacy-system.ts conventions)', () => {
    const state = baseState({
      legacy: {
        ...getNewGameState().legacy!,
        trackers: {
          totalResourcesMined: 500, totalContractsCompleted: 2,
          totalShipsBuilt: 3, totalBuildingsCompleted: 6,
        },
      },
    });
    const snap = getEraStatSnapshot(state);
    expect(snap.buildingsCompleted).toBe(6);
    expect(snap.resourcesMined).toBe(500);
    expect(snap.shipsBuilt).toBe(3);
  });

  it('never throws on a minimal/fresh game state', () => {
    expect(() => getEraStatSnapshot(getNewGameState())).not.toThrow();
  });
});
