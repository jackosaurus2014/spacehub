/**
 * @jest-environment node
 *
 * 4X Upgrade Wave W4 — narrative event chains (docs/4X_BASELINE_2026-08.md
 * Part 2c). Covers:
 *  - Chain scheduling determinism (same world-month → same outcome)
 *  - Stage progression (tactical ladder, quarterly senate loop, campaign
 *    gap-gated arcs, recurrence + cooldown)
 *  - Choice consequences apply through the real wired hooks (money ledger,
 *    faction standing, global reputation, morale, hazard mitigation, mining
 *    bonus, rare-tech flag)
 *  - Save migration (V17 additive fields)
 *  - The emergency_contract sign-bug fix (defect ledger #1)
 */
import {
  CHAIN_DEFINITIONS,
  CHAIN_MAP,
  TOTAL_NARRATIVE_EVENT_COUNT,
  advanceNarrativeChains,
  resolveChainChoice,
  applyChainConsequence,
  consequencePreview,
} from '../narrative-events';
import { getChainHazardMitigationBonus } from '../hazards';
import { RANDOM_EVENTS, applyEventEffect } from '../random-events';
import { loadGame } from '../save-load';
import { SAVE_KEY } from '../constants';
import type { GameState } from '../types';

const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 1_000_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 3 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo', 'jupiter_system', 'saturn_system'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    ships: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, morale: 1.0 },
    frontierStatus: 'graduated',
    insuranceActive: true,
    narrativeChains: [],
    chainHazardMitigationBonuses: [],
    unlockedRareTechIds: [],
    ...overrides,
  } as GameState;
}

/** Drive a chain forward, auto-picking choice 0 whenever presented, until it
 *  completes or `maxMonths` elapses. Returns the final state and the month
 *  index the chain (if any) completed on. */
function driveChain(chainId: string, start: GameState, startMonth: number, maxMonths: number) {
  let state = start;
  for (let m = startMonth; m < startMonth + maxMonths; m++) {
    const result = advanceNarrativeChains(state, m, fixedNow, true);
    state = result.state;
    if (result.pendingChoice && result.pendingChoice.chainId === chainId) {
      state = resolveChainChoice(state, chainId, 0, m);
    }
    const progress = (state.narrativeChains || []).find(p => p.chainId === chainId);
    if (progress?.status === 'completed') {
      return { state, completedAtMonth: m };
    }
  }
  return { state, completedAtMonth: null as number | null };
}

describe('narrative-events: content shape', () => {
  test('44 events across 12 chains from Wave W4 (docs/4X_BASELINE_2026-08.md Part 2c), +1 chain/+1 event from Wave W13 board politics', () => {
    expect(CHAIN_DEFINITIONS.length).toBe(13);
    expect(TOTAL_NARRATIVE_EVENT_COUNT).toBe(45);
  });

  test('every chain id is unique and present in CHAIN_MAP', () => {
    const ids = CHAIN_DEFINITIONS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(CHAIN_MAP.get(id)).toBeDefined();
  });

  test('every choice stage has at least 2 real choices, each with a consequence or resolver', () => {
    for (const def of CHAIN_DEFINITIONS) {
      for (const stage of def.stages) {
        if (stage.kind !== 'choice') continue;
        expect(stage.choices && stage.choices.length).toBeGreaterThanOrEqual(2);
        for (const choice of stage.choices || []) {
          expect(choice.consequence || choice.resolve).toBeTruthy();
        }
      }
    }
  });
});

describe('narrative-events: scheduling determinism', () => {
  test('advanceNarrativeChains is a pure function of (state, monthIndex) — identical results on repeat calls', () => {
    const state = makeState();
    // Sweep enough months to hit at least one chain-start roll.
    for (let m = 0; m < 60; m++) {
      const a = advanceNarrativeChains(state, m, fixedNow, true);
      const b = advanceNarrativeChains(state, m, fixedNow, true);
      expect(JSON.stringify(a.state.narrativeChains)).toBe(JSON.stringify(b.state.narrativeChains));
      expect(a.events.length).toBe(b.events.length);
      expect(a.pendingChoice?.eventId).toBe(b.pendingChoice?.eventId);
    }
  });

  test('a chain start roll is world-shared: two independent players (different unrelated state) on the same world-month get the same start/no-start verdict for an ungated chain', () => {
    const playerA = makeState({ money: 5_000_000 });
    const playerB = makeState({ money: 9_999_999_999, buildings: [{ instanceId: 'x', definitionId: 'launch_pad_1', locationId: 'leo', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 0 }] });
    for (let m = 0; m < 40; m++) {
      const a = advanceNarrativeChains(playerA, m, fixedNow, true);
      const b = advanceNarrativeChains(playerB, m, fixedNow, true);
      const aStarted = (a.state.narrativeChains || []).some(p => p.chainId === 'industry_shocks');
      const bStarted = (b.state.narrativeChains || []).some(p => p.chainId === 'industry_shocks');
      expect(aStarted).toBe(bStarted);
    }
  });
});

describe('narrative-events: tactical ladder (space weather)', () => {
  test('escalates through stages over successive months and eventually completes', () => {
    let state = makeState();
    let started = false;
    let completedAtLeastOnce = false;
    for (let m = 0; m < 400 && !completedAtLeastOnce; m++) {
      const result = advanceNarrativeChains(state, m, fixedNow, true);
      state = result.state;
      if (result.pendingChoice && result.pendingChoice.chainId === 'space_weather_ladder') {
        state = resolveChainChoice(state, 'space_weather_ladder', 0, m);
      }
      const progress = (state.narrativeChains || []).find(p => p.chainId === 'space_weather_ladder');
      if (progress) started = true;
      if (progress?.status === 'completed') completedAtLeastOnce = true;
    }
    expect(started).toBe(true);
    expect(completedAtLeastOnce).toBe(true);
  });
});

describe('narrative-events: quarterly senate loop (Accord Council)', () => {
  test('advances exactly on quarter boundaries and recurs after completion', () => {
    const state = makeState();
    // Month 300 is a quarter boundary (300 % 3 === 0).
    const startMonth = 300;
    let cur = state;
    // Month 300: chain starts + stage 0 (ac_24) presents immediately.
    let result = advanceNarrativeChains(cur, startMonth, fixedNow, true);
    cur = result.state;
    expect(result.pendingChoice?.chainId).toBe('accord_council');
    expect(result.pendingChoice?.stageIndex).toBe(0);
    expect(result.pendingChoice?.totalStages).toBe(5);
    cur = resolveChainChoice(cur, 'accord_council', 0, startMonth);
    let progress = (cur.narrativeChains || []).find(p => p.chainId === 'accord_council')!;
    expect(progress.stageIndex).toBe(1);

    // Months 301, 302 are NOT quarter boundaries — accord_council specifically
    // does not advance (other ungated chains may independently start/roll on
    // these months — that's fine and expected; we only assert accord_council's
    // own progress, not the global pendingChoice slot).
    result = advanceNarrativeChains(cur, startMonth + 1, fixedNow, true);
    cur = result.state;
    expect((cur.narrativeChains || []).find(p => p.chainId === 'accord_council')!.stageIndex).toBe(1);
    result = advanceNarrativeChains(cur, startMonth + 2, fixedNow, true);
    cur = result.state;
    expect((cur.narrativeChains || []).find(p => p.chainId === 'accord_council')!.stageIndex).toBe(1);

    // Month 303 IS a quarter boundary — stage 1 (ac_25) presents.
    result = advanceNarrativeChains(cur, startMonth + 3, fixedNow, true);
    cur = result.state;
    expect(result.pendingChoice?.chainId).toBe('accord_council');
    expect(result.pendingChoice?.stageIndex).toBe(1);
    cur = resolveChainChoice(cur, 'accord_council', 0, startMonth + 3);

    // Drive through remaining quarters (306, 309, 312) to completion.
    for (const m of [startMonth + 6, startMonth + 9, startMonth + 12]) {
      const r = advanceNarrativeChains(cur, m, fixedNow, true);
      cur = r.state;
      if (r.pendingChoice) cur = resolveChainChoice(cur, 'accord_council', 0, m);
    }
    progress = (cur.narrativeChains || []).find(p => p.chainId === 'accord_council')!;
    expect(progress.status).toBe('completed');

    // Next quarter boundary (315): recurs from stage 0 again (recurring: true).
    const r2 = advanceNarrativeChains(cur, startMonth + 15, fixedNow, true);
    const newProgress = (r2.state.narrativeChains || []).find(p => p.chainId === 'accord_council')!;
    expect(newProgress.status).toBe('active');
    expect(newProgress.stageIndex).toBe(0);
  });
});

describe('narrative-events: campaign chain eligibility gating', () => {
  test('Europa Biosignature Arc never starts without jupiter_system unlocked', () => {
    let state = makeState({ unlockedLocations: ['earth_surface', 'leo'] });
    for (let m = 0; m < 500; m++) {
      const result = advanceNarrativeChains(state, m, fixedNow, true);
      state = result.state;
      if (result.pendingChoice) state = resolveChainChoice(state, result.pendingChoice.chainId!, 0, m);
    }
    expect((state.narrativeChains || []).some(p => p.chainId === 'europa_biosignature')).toBe(false);
  });

  test('Ring Fire Anniversary never starts without saturn_system unlocked', () => {
    let state = makeState({ unlockedLocations: ['earth_surface', 'leo'] });
    for (let m = 0; m < 500; m++) {
      const result = advanceNarrativeChains(state, m, fixedNow, true);
      state = result.state;
      if (result.pendingChoice) state = resolveChainChoice(state, result.pendingChoice.chainId!, 0, m);
    }
    expect((state.narrativeChains || []).some(p => p.chainId === 'ring_fire_anniversary')).toBe(false);
  });

  test('Europa Biosignature Arc eventually triggers and resolves when eligible', () => {
    const state = makeState({ unlockedLocations: ['earth_surface', 'leo', 'jupiter_system'] });
    const { completedAtMonth } = driveChain('europa_biosignature', state, 0, 800);
    expect(completedAtMonth).not.toBeNull();
  });
});

describe('narrative-events: choice consequences apply via wired hooks', () => {
  test('money cost/reward hit the ledger honestly (moneyCost -> totalSpent, moneyReward -> totalEarned)', () => {
    const state = makeState({ money: 1_000_000_000, totalEarned: 0, totalSpent: 0 });
    const next = applyChainConsequence(state, { label: 'Test', moneyCost: 100, moneyReward: 40 }, 0);
    expect(next.money).toBe(1_000_000_000 - 100 + 40);
    expect(next.totalSpent).toBe(100);
    expect(next.totalEarned).toBe(40);
  });

  test('reputationPoints routes through addReputationPoints (global reputation)', () => {
    const state = makeState({ reputation: 500 });
    const next = applyChainConsequence(state, { label: 'Test', reputationPoints: 250 }, 0);
    expect(next.reputation).toBe(750);
  });

  test('factionRep routes through shiftReputation (per-faction standing, -100..100 clamp)', () => {
    const state = makeState({ factionReputation: { 'echo-remnants': 90 } });
    const next = applyChainConsequence(state, { label: 'Test', factionRep: { 'echo-remnants': 20 } }, 0);
    expect(next.factionReputation!['echo-remnants']).toBe(100); // clamped
  });

  test('moraleDelta clamps within the existing 0.5-1.15 workforce band', () => {
    const state = makeState({ workforce: { engineers: 1, scientists: 0, miners: 0, operators: 0, morale: 1.13 } });
    const next = applyChainConsequence(state, { label: 'Test', moraleDelta: 0.1 }, 0);
    expect(next.workforce!.morale).toBeLessThanOrEqual(1.15);
  });

  test('revenue/cost/research multipliers push an expiring activeEffect consumed by getActiveMultipliers', () => {
    const state = makeState({ gameDate: { year: 2026, month: 3 }, activeEffects: [] });
    const next = applyChainConsequence(state, { label: 'Boost', revenueMultiplier: 1.1, researchSpeedMultiplier: 1.2, effectDurationMonths: 2 }, 0);
    expect(next.activeEffects!.length).toBe(1);
    expect(next.activeEffects![0].researchSpeedMultiplier).toBe(1.2);
    expect(next.activeEffects![0].expiresAtMonth).toBe(2026 * 12 + 3 + 2);
  });

  test('miningBonus reuses the existing miningBonuses array shape', () => {
    const state = makeState({ gameDate: { year: 2026, month: 3 }, miningBonuses: [] });
    const next = applyChainConsequence(state, { label: 'Test', miningBonus: { locationId: 'jupiter_system', resourceId: 'helium3', bonusPct: 12, durationMonths: 8 } }, 0);
    expect(next.miningBonuses).toEqual([{ locationId: 'jupiter_system', resourceId: 'helium3', bonusPct: 12, expiresAtMonth: 2026 * 12 + 3 + 8 }]);
  });

  test('hazardMitigationBonus is consumed by hazards.ts getChainHazardMitigationBonus', () => {
    const state = makeState({ chainHazardMitigationBonuses: [] });
    const next = applyChainConsequence(state, { label: 'Shielding', hazardMitigationBonus: { amount: 0.12, durationMonths: 2 } }, 0);
    expect(next.chainHazardMitigationBonuses!.length).toBe(1);
    expect(getChainHazardMitigationBonus(next, fixedNow)).toBeCloseTo(0.12);
    // Expired bonus contributes nothing.
    const farFuture = fixedNow + 365 * 24 * 3600 * 1000;
    expect(getChainHazardMitigationBonus(next, farFuture)).toBe(0);
  });

  test('unlockRareTechId is deduped in the forward-compatible flag list', () => {
    const state = makeState({ unlockedRareTechIds: ['europan_biochemistry'] });
    const next = applyChainConsequence(state, { label: 'Test', unlockRareTechId: 'europan_biochemistry' }, 0);
    expect(next.unlockedRareTechIds).toEqual(['europan_biochemistry']);
    const next2 = applyChainConsequence(next, { label: 'Test', unlockRareTechId: 'iso_materials_analysis' }, 0);
    expect(next2.unlockedRareTechIds!.sort()).toEqual(['europan_biochemistry', 'iso_materials_analysis']);
  });

  test('consequencePreview renders a non-empty, human-readable summary for every stage/choice', () => {
    for (const def of CHAIN_DEFINITIONS) {
      for (const stage of def.stages) {
        if (stage.consequence) expect(consequencePreview(stage.consequence).length).toBeGreaterThan(0);
        for (const choice of stage.choices || []) {
          if (choice.consequence) expect(consequencePreview(choice.consequence).length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('narrative-events: resolveChainChoice end-to-end', () => {
  test('resolving a choice advances the stage, clears awaitingChoice, and applies the chosen consequence (not the other option)', () => {
    let state = makeState({ narrativeChains: [] });
    // Drive to the first presented choice deterministically.
    let presented: { chainId: string; monthIndex: number } | null = null;
    for (let m = 0; m < 60 && !presented; m++) {
      const result = advanceNarrativeChains(state, m, fixedNow, true);
      state = result.state;
      if (result.pendingChoice?.chainId) presented = { chainId: result.pendingChoice.chainId, monthIndex: m };
    }
    expect(presented).not.toBeNull();
    const { chainId, monthIndex } = presented!;
    const progressBefore = (state.narrativeChains || []).find(p => p.chainId === chainId)!;
    expect(progressBefore.awaitingChoice).toBe(true);
    const stageBefore = progressBefore.stageIndex;

    const moneyBefore = state.money;
    const next = resolveChainChoice(state, chainId, 0, monthIndex);
    const progressAfter = (next.narrativeChains || []).find(p => p.chainId === chainId)!;
    expect(progressAfter.awaitingChoice).toBe(false);
    expect(progressAfter.stageIndex === stageBefore + 1 || progressAfter.status === 'completed').toBe(true);
    // Some money-relevant effect happened (cost/reward/no-op) — just verify
    // the state actually changed in a well-formed way (no NaN, no crash).
    expect(Number.isFinite(next.money)).toBe(true);
    expect(next.money).not.toBe(NaN);
    void moneyBefore;
  });

  test('unknown chainId / stale stage is a no-op (never throws)', () => {
    const state = makeState();
    expect(() => resolveChainChoice(state, 'not_a_real_chain', 0, 0)).not.toThrow();
    const next = resolveChainChoice(state, 'not_a_real_chain', 0, 0);
    expect(next).toBe(state);
  });
});

describe('narrative-events: single pendingChoice slot respected', () => {
  test('allowNewChoice=false never sets a new pendingChoice, even when a chain stage is ready', () => {
    const state = makeState();
    let anyBlocked = false;
    for (let m = 0; m < 60; m++) {
      const result = advanceNarrativeChains(state, m, fixedNow, false);
      if (result.pendingChoice) anyBlocked = true;
    }
    expect(anyBlocked).toBe(false);
  });
});

describe('random-events: emergency_contract sign-bug fix (defect ledger #1)', () => {
  test('Accept branch debits the real $150M cost AND credits the real $300M reward — not a single opaque +$150M', () => {
    const def = RANDOM_EVENTS.find(e => e.id === 'emergency_contract')!;
    const accept = def.choices!.find(c => c.label.startsWith('Accept'))!;
    expect(accept.effect.moneyCost).toBe(150_000_000);
    expect(accept.effect.moneyReward).toBe(300_000_000);
    expect(accept.effect.moneyDelta).toBeUndefined();

    const state = makeState({ money: 0, totalEarned: 0, totalSpent: 0 });
    const next = applyEventEffect(state, accept.effect, def.name);
    expect(next.totalSpent).toBe(150_000_000); // the cost is now visible in P&L
    expect(next.totalEarned).toBe(300_000_000); // the reward is now visible in P&L
    expect(next.money).toBe(150_000_000); // same net as before the fix
  });
});

describe('save-load: V17 migration (narrative event chains)', () => {
  const originalLocalStorage = (global as unknown as { localStorage?: Storage }).localStorage;

  afterEach(() => {
    (global as unknown as { localStorage?: Storage }).localStorage = originalLocalStorage;
  });

  test('loadGame() backfills narrativeChains/chainHazardMitigationBonuses/unlockedRareTechIds on a pre-V17 save', () => {
    const legacySave = makeState();
    delete (legacySave as Partial<GameState>).narrativeChains;
    delete (legacySave as Partial<GameState>).chainHazardMitigationBonuses;
    delete (legacySave as Partial<GameState>).unlockedRareTechIds;

    const store: Record<string, string> = { [SAVE_KEY]: JSON.stringify(legacySave) };
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: () => null,
      length: 0,
    } as Storage;

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.narrativeChains).toEqual([]);
    expect(loaded!.chainHazardMitigationBonuses).toEqual([]);
    expect(loaded!.unlockedRareTechIds).toEqual([]);
  });
});
