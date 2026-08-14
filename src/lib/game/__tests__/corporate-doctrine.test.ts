/**
 * @jest-environment node
 *
 * 4X Wave W13 — Corporate Doctrine & Board Politics
 * (docs/4X_BASELINE_2026-08.md §1.7). Covers:
 *  - Policy bonus computation (neutral + all 6 stances, both sides of each pair)
 *  - switchDoctrinePolicy: cost/cooldown gating, invalid-input no-ops
 *  - Constituency approval: determinism, policy tension, hazard/cash inputs, clamping
 *  - Board directives: rotation, evaluation, the quarterly cycle hook
 *  - Save migration (V22 additive fields)
 */
import type { GameState } from '../types';
import {
  DOCTRINE_POLICIES,
  DOCTRINE_POLICY_MAP,
  getPoliciesForCategory,
  DEFAULT_DOCTRINE,
  DOCTRINE_SWITCH_COOLDOWN_MONTHS,
  getDoctrineSwitchCost,
  canSwitchDoctrinePolicy,
  switchDoctrinePolicy,
  getDoctrineBonuses,
  CONSTITUENCIES,
  moodForApproval,
  getConstituencyApprovals,
  getConstituencyMoraleModifier,
  generateBoardDirective,
  evaluateBoardDirective,
  advanceBoardDirectives,
  getCurrentBoardDirective,
  type CorporateDoctrineState,
} from '../corporate-doctrine';
import { STARTING_YEAR } from '../constants';
import { SAVE_KEY } from '../constants';
import { loadGame, getNewGameState } from '../save-load';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: 0,
    lastTickAt: 0,
    money: 500_000_000,
    totalEarned: 500_000_000,
    totalSpent: 0,
    gameDate: { year: STARTING_YEAR, month: 1 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface'],
    resources: {},
    eventLog: [],
    ships: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    workforce: { engineers: 2, scientists: 2, miners: 2, operators: 2, morale: 1.0, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 0 },
    ...overrides,
  };
}

// ─── Content shape ───────────────────────────────────────────────────────────

describe('corporate-doctrine: content shape', () => {
  test('exactly 3 categories, 2 policies each, all present in the map', () => {
    const categories = Array.from(new Set(DOCTRINE_POLICIES.map(p => p.category)));
    expect(categories.length).toBe(3);
    for (const cat of categories) {
      expect(getPoliciesForCategory(cat).length).toBe(2);
    }
    for (const p of DOCTRINE_POLICIES) {
      expect(DOCTRINE_POLICY_MAP.get(p.id)).toBe(p);
      expect(p.tradeoff.length).toBeGreaterThan(0); // every policy states its catch
    }
  });

  test('exactly 5 constituencies, unique ids', () => {
    expect(CONSTITUENCIES.length).toBe(5);
    expect(new Set(CONSTITUENCIES.map(c => c.id)).size).toBe(5);
  });
});

// ─── 1. Policy bonuses ───────────────────────────────────────────────────────

describe('corporate-doctrine: getDoctrineBonuses', () => {
  test('no doctrine chosen -> fully neutral (identical to pre-W13 behavior)', () => {
    expect(getDoctrineBonuses(undefined)).toEqual({
      hazardResistanceBonus: 0, buildSpeedMultiplier: 1, researchSpeedMultiplier: 1,
      revenueMultiplier: 1, payrollMultiplier: 1, crewMoraleBonus: 0,
    });
    expect(getDoctrineBonuses(DEFAULT_DOCTRINE)).toEqual(getDoctrineBonuses(undefined));
  });

  test('safety_first: +hazard resist, slower builds', () => {
    const d: CorporateDoctrineState = { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: {} };
    const b = getDoctrineBonuses(d);
    expect(b.hazardResistanceBonus).toBeGreaterThan(0);
    expect(b.buildSpeedMultiplier).toBeLessThan(1);
  });

  test('aggressive_schedule: -hazard resist, faster builds (exact inverse of safety_first)', () => {
    const safety = getDoctrineBonuses({ activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: {} });
    const aggressive = getDoctrineBonuses({ activePolicies: { operations: 'aggressive_schedule' }, lastSwitchedMonth: {} });
    expect(aggressive.hazardResistanceBonus).toBeCloseTo(-safety.hazardResistanceBonus, 6);
    expect(aggressive.buildSpeedMultiplier).toBeGreaterThan(1);
  });

  test('open_science: +research speed, slightly -revenue (rivals feed cost)', () => {
    const b = getDoctrineBonuses({ activePolicies: { disclosure: 'open_science' }, lastSwitchedMonth: {} });
    expect(b.researchSpeedMultiplier).toBeGreaterThan(1);
    expect(b.revenueMultiplier).toBeLessThan(1);
  });

  test('proprietary: -research speed, +revenue (exclusivity premium)', () => {
    const b = getDoctrineBonuses({ activePolicies: { disclosure: 'proprietary' }, lastSwitchedMonth: {} });
    expect(b.researchSpeedMultiplier).toBeLessThan(1);
    expect(b.revenueMultiplier).toBeGreaterThan(1);
  });

  test('generous_compensation: +payroll cost, +morale', () => {
    const b = getDoctrineBonuses({ activePolicies: { compensation: 'generous_compensation' }, lastSwitchedMonth: {} });
    expect(b.payrollMultiplier).toBeGreaterThan(1);
    expect(b.crewMoraleBonus).toBeGreaterThan(0);
  });

  test('lean_compensation: -payroll cost, -morale', () => {
    const b = getDoctrineBonuses({ activePolicies: { compensation: 'lean_compensation' }, lastSwitchedMonth: {} });
    expect(b.payrollMultiplier).toBeLessThan(1);
    expect(b.crewMoraleBonus).toBeLessThan(0);
  });

  test('all three categories stack independently (no cross-category interference)', () => {
    const b = getDoctrineBonuses({
      activePolicies: { operations: 'safety_first', disclosure: 'open_science', compensation: 'generous_compensation' },
      lastSwitchedMonth: {},
    });
    expect(b.hazardResistanceBonus).toBeGreaterThan(0);
    expect(b.researchSpeedMultiplier).toBeGreaterThan(1);
    expect(b.payrollMultiplier).toBeGreaterThan(1);
    expect(b.buildSpeedMultiplier).toBeLessThan(1); // safety_first's cost
    expect(b.revenueMultiplier).toBeLessThan(1);    // open_science's cost
  });
});

// ─── switchDoctrinePolicy ────────────────────────────────────────────────────

describe('corporate-doctrine: switchDoctrinePolicy', () => {
  test('succeeds: deducts the switch cost and records the switch month', () => {
    const s = baseState({ money: 1_000_000_000 });
    const cost = getDoctrineSwitchCost(s.workforce);
    const next = switchDoctrinePolicy(s, 'operations', 'safety_first', 10);
    expect(next).not.toBe(s);
    expect(next.corporateDoctrine!.activePolicies.operations).toBe('safety_first');
    expect(next.corporateDoctrine!.lastSwitchedMonth.operations).toBe(10);
    expect(next.money).toBe(1_000_000_000 - cost);
    expect(next.totalSpent).toBe(cost);
  });

  test('no-op: cannot afford the switch cost', () => {
    const s = baseState({ money: 0 });
    const next = switchDoctrinePolicy(s, 'operations', 'safety_first', 10);
    expect(next).toBe(s);
  });

  test('no-op: invalid category/policy pairing', () => {
    const s = baseState({ money: 1_000_000_000 });
    // 'open_science' belongs to 'disclosure', not 'operations'
    const next = switchDoctrinePolicy(s, 'operations', 'open_science', 10);
    expect(next).toBe(s);
  });

  test('no-op: selecting the already-active policy', () => {
    const s = baseState({
      money: 1_000_000_000,
      corporateDoctrine: { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: { operations: 0 } },
    });
    const next = switchDoctrinePolicy(s, 'operations', 'safety_first', 10);
    expect(next).toBe(s);
  });

  test('no-op: switching again before the cooldown elapses', () => {
    const s = baseState({
      money: 1_000_000_000,
      corporateDoctrine: { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: { operations: 0 } },
    });
    const next = switchDoctrinePolicy(s, 'operations', 'aggressive_schedule', DOCTRINE_SWITCH_COOLDOWN_MONTHS - 1);
    expect(next).toBe(s);
  });

  test('allowed: switching exactly at the cooldown boundary', () => {
    const s = baseState({
      money: 1_000_000_000,
      corporateDoctrine: { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: { operations: 0 } },
    });
    const next = switchDoctrinePolicy(s, 'operations', 'aggressive_schedule', DOCTRINE_SWITCH_COOLDOWN_MONTHS);
    expect(next).not.toBe(s);
    expect(next.corporateDoctrine!.activePolicies.operations).toBe('aggressive_schedule');
  });

  test('clearing a policy back to neutral (policyId: null) costs the same and is cooldown-gated', () => {
    const s = baseState({
      money: 1_000_000_000,
      corporateDoctrine: { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: { operations: 0 } },
    });
    const tooSoon = switchDoctrinePolicy(s, 'operations', null, 1);
    expect(tooSoon).toBe(s);
    const cleared = switchDoctrinePolicy(s, 'operations', null, DOCTRINE_SWITCH_COOLDOWN_MONTHS);
    expect(cleared.corporateDoctrine!.activePolicies.operations).toBeUndefined();
  });

  test('canSwitchDoctrinePolicy reports months remaining while on cooldown', () => {
    const doctrine: CorporateDoctrineState = { activePolicies: {}, lastSwitchedMonth: { compensation: 5 } };
    const gate = canSwitchDoctrinePolicy(doctrine, 'compensation', 8);
    expect(gate.allowed).toBe(false);
    expect(gate.monthsRemaining).toBe(DOCTRINE_SWITCH_COOLDOWN_MONTHS - 3);
  });
});

// ─── 2. Constituency approval ────────────────────────────────────────────────

describe('corporate-doctrine: getConstituencyApprovals', () => {
  test('deterministic: identical inputs (including `now`) produce identical output', () => {
    const s = baseState({ corporateDoctrine: { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: {} } });
    const a = getConstituencyApprovals(s, 1_000_000);
    const b = getConstituencyApprovals(s, 1_000_000);
    expect(a).toEqual(b);
  });

  test('baseline (no doctrine, no hazards, positive cash) sits at the ~62 base for every bloc', () => {
    const s = baseState();
    const approvals = getConstituencyApprovals(s, 1_000_000);
    for (const a of approvals) expect(a.approval).toBe(62);
  });

  test('safety_first raises labor blocs and lowers Executive Leadership', () => {
    const s = baseState({ corporateDoctrine: { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: {} } });
    const approvals = getConstituencyApprovals(s, 1_000_000);
    const byId = new Map(approvals.map(a => [a.id, a.approval]));
    expect(byId.get('miners_guild')!).toBeGreaterThan(62);
    expect(byId.get('engineers_union')!).toBeGreaterThan(62);
    expect(byId.get('executive_leadership')!).toBeLessThan(62);
  });

  test('recent hazards (within the current quarter) reduce exposed-bloc approval', () => {
    const s = baseState({
      recentHazards: [
        { id: 'h1', type: 'solar_storm', locationId: 'earth_surface', occurredAtMs: 900_000, damagePct: 0.1, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: 'Solar storm' },
        { id: 'h2', type: 'micrometeorite', locationId: 'earth_surface', occurredAtMs: 900_000, damagePct: 0.1, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: 'Micrometeorite' },
      ],
    });
    const now = 1_000_000; // both hazards well within the 3-game-month (18h) window
    const withHazards = getConstituencyApprovals(s, now);
    const without = getConstituencyApprovals(baseState(), now);
    const idOf = (arr: typeof withHazards, id: string) => arr.find(a => a.id === id)!.approval;
    expect(idOf(withHazards, 'miners_guild')).toBeLessThan(idOf(without, 'miners_guild'));
    expect(idOf(withHazards, 'engineers_union')).toBeLessThan(idOf(without, 'engineers_union'));
    // Science directorate isn't exposed to hazards in this model — unaffected.
    expect(idOf(withHazards, 'science_directorate')).toBe(idOf(without, 'science_directorate'));
  });

  test('negative cash reduces every bloc, Executive Leadership most of all', () => {
    const s = baseState({ money: -1 });
    const approvals = getConstituencyApprovals(s, 1_000_000);
    const byId = new Map(approvals.map(a => [a.id, a.approval]));
    for (const a of approvals) expect(a.approval).toBeLessThan(62);
    expect(byId.get('executive_leadership')!).toBeLessThan(byId.get('operations_corps')!);
  });

  test('training budget invested raises labor-bloc approval but not Executive Leadership', () => {
    const s = baseState({ workforce: { engineers: 2, scientists: 2, miners: 2, operators: 2, trainingBudgetPerCrew: 100_000 } });
    const approvals = getConstituencyApprovals(s, 1_000_000);
    const byId = new Map(approvals.map(a => [a.id, a.approval]));
    expect(byId.get('engineers_union')!).toBeGreaterThan(62);
    expect(byId.get('executive_leadership')!).toBe(62);
  });

  test('approval is clamped to [0, 100]', () => {
    // Stack every negative pressure at once.
    const s = baseState({
      money: -1,
      corporateDoctrine: { activePolicies: { operations: 'aggressive_schedule', compensation: 'lean_compensation' }, lastSwitchedMonth: {} },
      recentHazards: Array.from({ length: 20 }, (_, i) => ({
        id: `h${i}`, type: 'pirate_raid' as const, locationId: 'earth_surface', occurredAtMs: 900_000,
        damagePct: 0.1, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: 'Pirate raid',
      })),
      boardDirectives: [{ id: 'd1', quarterIndex: 0, metric: 'growth' as const, label: 'x', targetValue: 3, comparator: 'gte' as const, status: 'missed' as const }],
    });
    const approvals = getConstituencyApprovals(s, 1_000_000);
    for (const a of approvals) {
      expect(a.approval).toBeGreaterThanOrEqual(0);
      expect(a.approval).toBeLessThanOrEqual(100);
    }
  });

  test('moodForApproval buckets match the documented thresholds', () => {
    expect(moodForApproval(10)).toBe('restive');
    expect(moodForApproval(45)).toBe('uneasy');
    expect(moodForApproval(65)).toBe('steady');
    expect(moodForApproval(90)).toBe('supportive');
  });

  test('getConstituencyMoraleModifier is bounded to +/-0.05 and tracks the average deviation from baseline', () => {
    const high = getConstituencyMoraleModifier([{ id: 'engineers_union', approval: 100, mood: 'supportive' }]);
    const low = getConstituencyMoraleModifier([{ id: 'engineers_union', approval: 0, mood: 'restive' }]);
    expect(high).toBeCloseTo(0.05, 6);
    expect(low).toBeCloseTo(-0.05, 6);
    expect(getConstituencyMoraleModifier([])).toBe(0);
  });
});

// ─── 3. Board directives ─────────────────────────────────────────────────────

describe('corporate-doctrine: board directives', () => {
  test('metric rotates deterministically: growth -> profit -> safety -> growth', () => {
    expect(generateBoardDirective(0, null, 0).metric).toBe('growth');
    expect(generateBoardDirective(1, null, 0).metric).toBe('profit');
    expect(generateBoardDirective(2, null, 0).metric).toBe('safety');
    expect(generateBoardDirective(3, null, 0).metric).toBe('growth');
  });

  test('profit directive targets the prior quarter\'s profit (floored at 0)', () => {
    const d = generateBoardDirective(1, { profit: -50, growthRatePct: null }, 0);
    expect(d.targetValue).toBe(0);
    const d2 = generateBoardDirective(1, { profit: 200_000_000, growthRatePct: null }, 0);
    expect(d2.targetValue).toBe(200_000_000);
  });

  test('safety directive targets recent hazard pace with a floor of 2', () => {
    expect(generateBoardDirective(2, null, 0).targetValue).toBe(2);
    expect(generateBoardDirective(2, null, 5).targetValue).toBe(5);
  });

  test('evaluateBoardDirective: gte comparator hit/miss', () => {
    const d = generateBoardDirective(0, null, 0); // growth, gte 3
    const hit = evaluateBoardDirective(d, { growthRatePct: 5, profit: 0, hazardCount: 0 }, 1000);
    const miss = evaluateBoardDirective(d, { growthRatePct: 1, profit: 0, hazardCount: 0 }, 1000);
    expect(hit.status).toBe('hit');
    expect(hit.actualValue).toBe(5);
    expect(miss.status).toBe('missed');
  });

  test('evaluateBoardDirective: lte comparator (safety) hit/miss', () => {
    const d = generateBoardDirective(2, null, 3); // safety, lte 3
    const hit = evaluateBoardDirective(d, { growthRatePct: null, profit: 0, hazardCount: 2 }, 1000);
    const miss = evaluateBoardDirective(d, { growthRatePct: null, profit: 0, hazardCount: 4 }, 1000);
    expect(hit.status).toBe('hit');
    expect(miss.status).toBe('missed');
  });

  test('advanceBoardDirectives seeds a first directive when there is no history yet', () => {
    const cycle = advanceBoardDirectives({ boardDirectives: [] }, { quarterIndex: 0, profit: 10_000_000, growthRatePct: 4 }, 1000);
    expect(cycle.evaluated).toBeNull();
    expect(cycle.reputationGain).toBe(0);
    expect(cycle.moraleDelta).toBe(0);
    expect(cycle.boardDirectives).toHaveLength(1);
    expect(cycle.boardDirectives[0].quarterIndex).toBe(1);
    expect(cycle.boardDirectives[0].status).toBe('pending');
  });

  test('advanceBoardDirectives evaluates the pending directive for the just-reported quarter and seeds the next one', () => {
    const pending = generateBoardDirective(0, null, 0); // growth, gte 3%, governs quarter 0
    const cycle = advanceBoardDirectives(
      { boardDirectives: [pending] },
      { quarterIndex: 0, profit: 5_000_000, growthRatePct: 10 }, // beats the 3% target
      2000,
    );
    expect(cycle.evaluated?.status).toBe('hit');
    expect(cycle.reputationGain).toBe(150);
    expect(cycle.moraleDelta).toBeGreaterThan(0);
    expect(cycle.boardDirectives).toHaveLength(2); // evaluated quarter-0 + seeded quarter-1
    expect(cycle.boardDirectives[0].status).toBe('hit');
    expect(cycle.boardDirectives[1].status).toBe('pending');
  });

  test('advanceBoardDirectives: a miss grants no reputation and applies a negative morale delta', () => {
    const pending = generateBoardDirective(0, null, 0); // growth, gte 3%
    const cycle = advanceBoardDirectives(
      { boardDirectives: [pending] },
      { quarterIndex: 0, profit: 5_000_000, growthRatePct: 0 }, // misses
      2000,
    );
    expect(cycle.evaluated?.status).toBe('missed');
    expect(cycle.reputationGain).toBe(0);
    expect(cycle.moraleDelta).toBeLessThan(0);
  });

  test('advanceBoardDirectives caps history at 12 entries', () => {
    const history = Array.from({ length: 12 }, (_, i) => ({
      id: `d${i}`, quarterIndex: i, metric: 'growth' as const, label: 'x', targetValue: 3,
      comparator: 'gte' as const, status: 'hit' as const,
    }));
    const cycle = advanceBoardDirectives({ boardDirectives: history }, { quarterIndex: 20, profit: 0, growthRatePct: 0 }, 1000);
    expect(cycle.boardDirectives.length).toBeLessThanOrEqual(12);
  });

  test('getCurrentBoardDirective returns the most recent entry, or null when empty', () => {
    expect(getCurrentBoardDirective({ boardDirectives: [] })).toBeNull();
    expect(getCurrentBoardDirective({})).toBeNull();
    const d = generateBoardDirective(0, null, 0);
    expect(getCurrentBoardDirective({ boardDirectives: [d] })).toBe(d);
  });
});

// ─── Save-migration defaulting (additive-state requirement, V22) ───────────

describe('corporate-doctrine: save-migration defaulting', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  test('getNewGameState() initializes neutral doctrine and empty directive history', () => {
    const fresh = getNewGameState();
    expect(fresh.corporateDoctrine).toEqual({ activePolicies: {}, lastSwitchedMonth: {} });
    expect(fresh.boardDirectives).toEqual([]);
  });

  test('loadGame() defaults corporateDoctrine/boardDirectives for a pre-W13 save missing both fields', () => {
    const oldSave = getNewGameState();
    const oldSaveRecord = oldSave as unknown as Record<string, unknown>;
    delete oldSaveRecord.corporateDoctrine;
    delete oldSaveRecord.boardDirectives;
    store.set(SAVE_KEY, JSON.stringify(oldSaveRecord));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.corporateDoctrine).toEqual({ activePolicies: {}, lastSwitchedMonth: {} });
    expect(loaded!.boardDirectives).toEqual([]);
    // A migrated-neutral doctrine must be numerically identical to the
    // pre-W13 formula — no silent bonus/penalty change on reload.
    expect(getDoctrineBonuses(loaded!.corporateDoctrine)).toEqual(getDoctrineBonuses(undefined));
  });

  test('loadGame() preserves existing doctrine/directive state on newer saves', () => {
    const existing = getNewGameState();
    existing.corporateDoctrine = { activePolicies: { operations: 'safety_first' }, lastSwitchedMonth: { operations: 4 } };
    existing.boardDirectives = [generateBoardDirective(0, null, 0)];
    store.set(SAVE_KEY, JSON.stringify(existing));

    const loaded = loadGame();
    expect(loaded!.corporateDoctrine!.activePolicies.operations).toBe('safety_first');
    expect(loaded!.boardDirectives).toHaveLength(1);
  });
});
