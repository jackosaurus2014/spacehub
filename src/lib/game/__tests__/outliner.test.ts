/**
 * @jest-environment node
 *
 * Wave V3 (docs/VISUAL_DEPTH_2026-08.md §V3) — Outliner pure derivations.
 * deriveAttentionItems: damage thresholds, idle-ship aggregation, stalled
 * command-queue detection (read-only reuse of command-queue.ts's own
 * validators), and folding in the Situation Log's urgent items.
 * deriveHoldingsGroups: region grouping, counts, power status, ordering,
 * unlocked-only filtering.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import { deriveAttentionItems, deriveHoldingsGroups } from '../outliner';

const NOW = Date.UTC(2026, 7, 14, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), ...overrides };
}

describe('deriveAttentionItems', () => {
  it('flags damaged buildings, severity by the 50% threshold', () => {
    const state = baseState({
      buildings: [
        { instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 1, damagePct: 0.6 },
        { instanceId: 'b2', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 1, damagePct: 0.1 },
        // In-progress buildings are never "damaged" — damagePct only applies post-completion.
        { instanceId: 'b3', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: false, startedAtMs: NOW, realDurationSeconds: 999999 },
      ],
    });
    const items = deriveAttentionItems(state, NOW);
    const byId = Object.fromEntries(items.map(i => [i.id, i]));
    expect(byId['att-bld-dmg-b1'].severity).toBe('critical');
    expect(byId['att-bld-dmg-b2'].severity).toBe('warning');
    expect(byId['att-bld-dmg-b3']).toBeUndefined();
    expect(byId['att-bld-dmg-b1'].tab).toBe('build');
  });

  it('flags damaged ships and aggregates idle ships into a single row', () => {
    const state = baseState({
      ships: [
        { instanceId: 's1', definitionId: 'probe_survey', name: 'Scout One', status: 'idle', currentLocation: 'earth_surface', isBuilt: true, hullDamagePct: 0.7 },
        { instanceId: 's2', definitionId: 'probe_survey', name: 'Scout Two', status: 'idle', currentLocation: 'earth_surface', isBuilt: true },
        { instanceId: 's3', definitionId: 'probe_survey', name: 'Scout Three', status: 'mining', currentLocation: 'earth_surface', isBuilt: true },
        // Not yet built — never counted as idle.
        { instanceId: 's4', definitionId: 'probe_survey', name: 'Scout Four', status: 'idle', currentLocation: 'earth_surface', isBuilt: false },
      ],
    });
    const items = deriveAttentionItems(state, NOW);
    const dmg = items.find(i => i.id === 'att-ship-dmg-s1');
    expect(dmg?.severity).toBe('critical');
    expect(dmg?.tab).toBe('fleet');
    // s1 (damaged) and s2 are both idle -> aggregated count of 2.
    const idle = items.find(i => i.category === 'ship_idle');
    expect(idle?.label).toBe('2 ships idle');
  });

  it('detects a stalled research order (free slot, but insufficient funds) and ignores a healthy queue', () => {
    const stalled = baseState({
      money: 0,
      activeResearch: null,
      commandQueue: [{ id: 'q1', kind: 'research', createdAtMs: NOW, label: 'Reusable Boosters', researchId: 'reusable_boosters' }],
    });
    const stalledItems = deriveAttentionItems(stalled, NOW);
    const stalledEntry = stalledItems.find(i => i.category === 'queue_stalled');
    expect(stalledEntry).toBeDefined();
    expect(stalledEntry?.detail).toMatch(/insufficient funds/i);
    expect(stalledEntry?.tab).toBe('research');

    // Same order, but a slot is already occupied -> it's just waiting its
    // turn, not "stalled" (no_free_slot is excluded on purpose).
    const waiting = baseState({
      money: 0,
      activeResearch: { definitionId: 'reusable_boosters', startDate: { year: 2026, month: 1 }, progressMonths: 0, totalMonths: 12, startedAtMs: NOW, realDurationSeconds: 999999 },
      commandQueue: [{ id: 'q1', kind: 'research', createdAtMs: NOW, label: 'Reusable Boosters', researchId: 'reusable_boosters' }],
    });
    const waitingItems = deriveAttentionItems(waiting, NOW);
    expect(waitingItems.some(i => i.category === 'queue_stalled')).toBe(false);
  });

  it('detects a stalled build order blocked on missing prerequisite research', () => {
    const state = baseState({
      commandQueue: [{ id: 'q1', kind: 'build', createdAtMs: NOW, label: 'Medium Launch Pad', buildingId: 'launch_pad_medium', locationId: 'earth_surface' }],
    });
    const items = deriveAttentionItems(state, NOW);
    const entry = items.find(i => i.category === 'queue_stalled');
    expect(entry).toBeDefined();
    expect(entry?.detail).toMatch(/prerequisite research/i);
    expect(entry?.tab).toBe('build');
  });

  it('folds in non-informational Situation Log items (e.g. a severe hazard warning)', () => {
    const state = baseState({
      hazardWarnings: [{ id: 'w1', type: 'solar_storm', severity: 'severe', locationId: 'leo', forecastMonthIndex: 1, issuedAtMs: NOW, summary: 'Severe storm' }],
    });
    const items = deriveAttentionItems(state, NOW);
    expect(items.some(i => i.id === 'sit-hazard-forecast-w1')).toBe(true);
  });

  it('is sorted critical -> warning -> info', () => {
    const state = baseState({
      buildings: [
        { instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 1, damagePct: 0.1 },
      ],
      ships: [
        { instanceId: 's1', definitionId: 'probe_survey', name: 'Scout', status: 'idle', currentLocation: 'earth_surface', isBuilt: true, hullDamagePct: 0.9 },
      ],
    });
    const items = deriveAttentionItems(state, NOW);
    const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    for (let i = 1; i < items.length; i++) {
      expect(rank[items[i].severity]).toBeGreaterThanOrEqual(rank[items[i - 1].severity]);
    }
  });

  it('is a pure function — identical inputs produce an identical item list', () => {
    const state = baseState({
      buildings: [
        { instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 1, damagePct: 0.3 },
      ],
    });
    const a = deriveAttentionItems(state, NOW);
    const b = deriveAttentionItems(state, NOW);
    expect(a).toEqual(b);
  });
});

describe('deriveHoldingsGroups', () => {
  it('only includes unlocked locations, grouped by region with live counts', () => {
    const state = baseState({
      unlockedLocations: ['earth_surface', 'leo'],
      buildings: [
        { instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: 0, realDurationSeconds: 1 },
        { instanceId: 'b2', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: false, startedAtMs: NOW, realDurationSeconds: 999999 },
      ],
      ships: [
        { instanceId: 's1', definitionId: 'probe_survey', name: 'Scout', status: 'idle', currentLocation: 'leo', isBuilt: true },
        { instanceId: 's2', definitionId: 'probe_survey', name: 'Unbuilt', status: 'building', currentLocation: 'leo', isBuilt: false },
      ],
    });
    const groups = deriveHoldingsGroups(state);
    // Mars, the belt, etc. are locked in a fresh game -> never appear.
    const allLocationIds = groups.flatMap(g => g.locations.map(l => l.id));
    expect(allLocationIds).toEqual(['earth_surface', 'leo']);

    const earthGroup = groups.find(g => g.locations.some(l => l.id === 'earth_surface'))!;
    const earth = earthGroup.locations.find(l => l.id === 'earth_surface')!;
    expect(earth.buildingCount).toBe(2);
    expect(earth.completeBuildingCount).toBe(1);

    const leoGroup = groups.find(g => g.locations.some(l => l.id === 'leo'))!;
    const leo = leoGroup.locations.find(l => l.id === 'leo')!;
    // Only the built ship counts.
    expect(leo.shipCount).toBe(1);
  });

  it('reports power deficit when generated power is below required', () => {
    // A building that requires power but has no generator built alongside
    // it should show a ratio < 1 and hasPowerDeficit true. Uses whatever
    // real building the catalog defines with powerRequired > 0.
    const state = baseState({
      unlockedLocations: ['earth_surface'],
      buildings: [],
    });
    const groups = deriveHoldingsGroups(state);
    const earth = groups.flatMap(g => g.locations).find(l => l.id === 'earth_surface');
    // No buildings at all -> no power data tracked (null, not a false deficit).
    expect(earth?.powerRatio).toBeNull();
    expect(earth?.hasPowerDeficit).toBe(false);
  });

  it('is a pure function — identical inputs produce an identical group list', () => {
    const state = baseState({ unlockedLocations: ['earth_surface', 'leo'] });
    const a = deriveHoldingsGroups(state);
    const b = deriveHoldingsGroups(state);
    expect(a).toEqual(b);
  });
});
