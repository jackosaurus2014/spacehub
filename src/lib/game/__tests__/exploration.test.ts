/**
 * @jest-environment node
 *
 * 4X Upgrade Wave W3 — unified discovery framework
 * (docs/4X_BASELINE_2026-08.md Part 4, W3 entry). Covers:
 *  - Determinism: rollDiscovery/rollAnomalyDiscovery never use Math.random;
 *    identical inputs always produce identical outputs (including across
 *    "replay" — the offline catch-up pattern game-engine.ts relies on).
 *  - Content/probability preservation: the merge is a refactor, not a
 *    balance change — every SURVEY_DISCOVERIES location table and the
 *    anomaly kind-weight distribution (30/20/15/13/10/8/4%) are unchanged.
 *  - Dead-end wiring (defect ledger #2): stakeClaim() applies
 *    unlocksResearchId → state.unlockedRareTechIds and moduleId →
 *    state.moduleInventory, instead of only displaying them.
 */
import {
  rollDiscovery,
  rollAnomalyDiscovery,
  recordDiscovery,
  stakeClaim,
  formatAnomalyRewards,
  SURVEY_DISCOVERIES,
  type Anomaly,
  type AnomalyKind,
} from '../exploration';
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
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface', 'mars_surface', 'jupiter_system'],
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
    knownAnomalies: [],
    claimStakes: [],
    moduleInventory: [],
    unlockedRareTechIds: [],
    ...overrides,
  } as GameState;
}

/** Strip record ids (generateId() — Date.now()+Math.random(), by design
 *  non-deterministic and never used for gameplay outcomes, per the
 *  codebase-wide convention documented in science-missions.ts /
 *  narrative-events.ts) before comparing rolled discoveries for equality. */
function withoutIds<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (key, v) => (key === 'id' ? undefined : v)));
}

describe('exploration: unified discovery framework — determinism', () => {
  test('rollDiscovery is a pure function of its inputs (same ship+location+anchor → same result)', () => {
    const a = rollDiscovery('lunar_surface', 'ship-1', 5000, 6000);
    const b = rollDiscovery('lunar_surface', 'ship-1', 5000, 6000);
    expect(withoutIds(a)).toEqual(withoutIds(b));
  });

  test('different anchors produce different (deterministic) streams', () => {
    const results = new Set<string>();
    for (let anchor = 0; anchor < 30; anchor++) {
      const r = rollDiscovery('asteroid_belt', 'ship-x', anchor, anchor);
      results.add(JSON.stringify(r));
    }
    // Not asserting every roll differs (some collisions are expected), but
    // the stream should not collapse to a single constant output.
    expect(results.size).toBeGreaterThan(1);
  });

  test('rollAnomalyDiscovery (standalone/dev-tool path) is also deterministic per call', () => {
    const a = rollAnomalyDiscovery('leo', 'dev-tool', 42);
    const b = rollAnomalyDiscovery('leo', 'dev-tool', 42);
    expect(withoutIds(a)).toEqual(withoutIds(b));
  });
});

describe('exploration: content/probability preservation (no balance change)', () => {
  test('guaranteed survey table is unchanged — every unlocked-tier location still has entries', () => {
    const locations = ['leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface', 'asteroid_belt', 'jupiter_system', 'saturn_system', 'outer_system'];
    for (const loc of locations) {
      expect(SURVEY_DISCOVERIES[loc]?.length).toBeGreaterThan(0);
    }
  });

  test('a known survey entry content is byte-for-byte preserved (spot check)', () => {
    const entry = SURVEY_DISCOVERIES.lunar_surface.find(d => d.title === 'Helium-3 Hotspot');
    expect(entry).toBeDefined();
    expect(entry?.rewards).toEqual({
      resources: { helium3: 3 },
      miningBonus: { locationId: 'lunar_surface', resourceId: 'helium3', bonusPct: 30, durationMonths: 24 },
    });
  });

  test('guaranteed survey pick always returns a non-null discovery for a tabled location', () => {
    for (let anchor = 0; anchor < 50; anchor++) {
      const { survey } = rollDiscovery('mars_surface', 'ship-a', anchor, anchor);
      expect(survey).not.toBeNull();
      expect(SURVEY_DISCOVERIES.mars_surface).toContainEqual(survey);
    }
  });

  test('anomaly kind-weight distribution matches the original 30/20/15/13/10/8/4% (statistical, generous tolerance)', () => {
    const N = 4000;
    const kindCounts: Record<AnomalyKind, number> = {
      rich_deposit: 0, uncharted_asteroid: 0, hazard_zone: 0, derelict_ship: 0,
      alien_signal: 0, ancient_artifact: 0, gravitational_lens: 0,
    };
    let gated = 0;
    for (let i = 0; i < N; i++) {
      const a = rollAnomalyDiscovery('leo', `ship-${i}`, i * 997);
      if (!a) { gated++; continue; }
      kindCounts[a.kind]++;
    }
    const hits = N - gated;
    // 30% hit rate (rng() < 0.30 succeeds) → ~70% gated out.
    expect(hits / N).toBeGreaterThan(0.20);
    expect(hits / N).toBeLessThan(0.40);
    // Within-gate kind shares (30/20/15/13/10/8/4%), generous ±8pp tolerance
    // for sample noise.
    const expected: Record<AnomalyKind, number> = {
      rich_deposit: 0.30, uncharted_asteroid: 0.20, hazard_zone: 0.15, derelict_ship: 0.13,
      alien_signal: 0.10, ancient_artifact: 0.08, gravitational_lens: 0.04,
    };
    for (const kind of Object.keys(expected) as AnomalyKind[]) {
      const share = kindCounts[kind] / hits;
      expect(share).toBeGreaterThan(Math.max(0, expected[kind] - 0.08));
      expect(share).toBeLessThan(expected[kind] + 0.08);
    }
  });

  test('derelict_ship module-grant sub-roll stays ~30% (unchanged from buildRewards)', () => {
    let withModule = 0;
    let total = 0;
    for (let i = 0; i < 3000; i++) {
      const a = rollAnomalyDiscovery('leo', `ship-derelict-${i}`, i * 613);
      if (a?.kind === 'derelict_ship') {
        total++;
        if (a.rewards.moduleId) withModule++;
      }
    }
    expect(total).toBeGreaterThan(20); // sanity: we actually sampled some
    const rate = withModule / total;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.45);
  });
});

describe('exploration: dead-end wiring (defect ledger #2)', () => {
  function forceAnomaly(kind: AnomalyKind, overrides: Partial<Anomaly> = {}): Anomaly {
    return {
      id: 'anomaly-test-1',
      kind,
      locationId: 'lunar_surface',
      discoveredAtMs: fixedNow,
      fadesAtMs: fixedNow + 10_000_000,
      claimed: false,
      title: 'Test Anomaly',
      summary: 'Test summary',
      rewards: {},
      ...overrides,
    };
  }

  test('unlocksResearchId reward is applied to state.unlockedRareTechIds on claim (not just displayed)', () => {
    const anomaly = forceAnomaly('ancient_artifact', {
      rewards: { money: 30_000_000, unlocksResearchId: 'precursor_studies' },
    });
    let state = makeState();
    state = recordDiscovery(state, anomaly);
    expect(state.unlockedRareTechIds).not.toContain('precursor_studies');

    state = stakeClaim(state, anomaly.id, fixedNow + 1000);
    expect(state.unlockedRareTechIds).toContain('precursor_studies');
    expect(state.money).toBe(1_000_000_000 + 30_000_000);

    // Claiming again (already claimed) is a no-op — no duplicate grant.
    const before = state.unlockedRareTechIds!.length;
    state = stakeClaim(state, anomaly.id, fixedNow + 2000);
    expect(state.unlockedRareTechIds!.length).toBe(before);
  });

  test('moduleId reward grants a real module into state.moduleInventory on claim', () => {
    const anomaly = forceAnomaly('derelict_ship', {
      rewards: { money: 20_000_000, moduleId: 'mod_stealth_coating' },
    });
    let state = makeState();
    state = recordDiscovery(state, anomaly);
    expect(state.moduleInventory).toHaveLength(0);

    state = stakeClaim(state, anomaly.id, fixedNow + 1000);
    expect(state.moduleInventory).toHaveLength(1);
    expect(state.moduleInventory![0].definitionId).toBe('mod_stealth_coating');
  });

  test('unknown moduleId is a safe no-op (grantModule guards against bad ids)', () => {
    const anomaly = forceAnomaly('derelict_ship', {
      rewards: { moduleId: 'mod_does_not_exist' },
    });
    let state = makeState();
    state = recordDiscovery(state, anomaly);
    state = stakeClaim(state, anomaly.id, fixedNow + 1000);
    expect(state.moduleInventory).toHaveLength(0);
  });

  test('formatAnomalyRewards still previews unlocksResearchId/moduleId for the UI', () => {
    const anomaly = forceAnomaly('ancient_artifact', {
      rewards: { money: 30_000_000, unlocksResearchId: 'precursor_studies' },
    });
    expect(formatAnomalyRewards(anomaly)).toContain('unlocks research: precursor studies');
  });
});
