/**
 * @jest-environment node
 *
 * Outliner Attention dismissals (2026-09-13, founder: "we need a way to
 * delete stale notices from the Attention section of the Outliner").
 *
 * Nothing in the Attention section is stored — every row is re-derived from
 * live GameState — so the feature is a DISMISSAL, and its whole safety story
 * is the two self-healing rules in outliner.ts:
 *   PRUNE     a dismissal whose id is no longer derived is dropped, so a
 *             genuine recurrence surfaces again.
 *   ESCALATE  an item whose severity has climbed above the severity it was
 *             dismissed at re-appears, and loses its dismissal.
 * Plus the save migration (an old save has dismissed nothing).
 */
import { getNewGameState, migrateLoadedState } from '../save-load';
import type { GameState } from '../types';
import {
  deriveAllAttentionItems,
  deriveAttentionItems,
  deriveAttentionView,
  dismissNotice,
  isDismissed,
  pruneDismissals,
  readDismissals,
  restoreNotice,
} from '../outliner';

const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), ...overrides };
}

function damagedBuilding(instanceId: string, damagePct: number) {
  return {
    instanceId,
    definitionId: 'launch_pad_small',
    locationId: 'earth_surface',
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 1 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 1,
    damagePct,
  };
}

describe('dismissing an Attention notice', () => {
  it('hides the row from the filtered list while the raw derivation keeps it', () => {
    const state = baseState({ buildings: [damagedBuilding('b1', 0.2)] });
    expect(deriveAttentionItems(state, NOW).map(i => i.id)).toContain('att-bld-dmg-b1');

    const dismissed = dismissNotice(state, { id: 'att-bld-dmg-b1', severity: 'warning' }, NOW);
    expect(deriveAttentionItems(dismissed, NOW).map(i => i.id)).not.toContain('att-bld-dmg-b1');
    // The condition is still true — the derivation must not stop producing it.
    expect(deriveAllAttentionItems(dismissed, NOW).map(i => i.id)).toContain('att-bld-dmg-b1');
  });

  it('records when it was dismissed and the severity at that moment', () => {
    const state = baseState({ buildings: [damagedBuilding('b1', 0.2)] });
    const dismissed = dismissNotice(state, { id: 'att-bld-dmg-b1', severity: 'warning' }, NOW);
    expect(dismissed.dismissedNotices!['att-bld-dmg-b1']).toEqual({ atMs: NOW, severity: 'warning' });
    // Never mutates the input state.
    expect(readDismissals(state)).toEqual({});
  });

  it('surfaces the hidden item under `dismissed`, never discarding it', () => {
    const state = dismissNotice(
      baseState({ buildings: [damagedBuilding('b1', 0.2)] }),
      { id: 'att-bld-dmg-b1', severity: 'warning' }, NOW,
    );
    const view = deriveAttentionView(state, NOW);
    expect(view.visible.map(i => i.id)).not.toContain('att-bld-dmg-b1');
    expect(view.dismissed.map(i => i.id)).toEqual(['att-bld-dmg-b1']);
    expect(view.all.length).toBe(view.visible.length + view.dismissed.length);
  });

  it('restoreNotice puts the row back', () => {
    const dismissed = dismissNotice(
      baseState({ buildings: [damagedBuilding('b1', 0.2)] }),
      { id: 'att-bld-dmg-b1', severity: 'warning' }, NOW,
    );
    const restored = restoreNotice(dismissed, 'att-bld-dmg-b1');
    expect(deriveAttentionItems(restored, NOW).map(i => i.id)).toContain('att-bld-dmg-b1');
    expect(readDismissals(restored)).toEqual({});
    // Restoring an id that was never dismissed is a no-op, not a rewrite.
    expect(restoreNotice(restored, 'att-bld-dmg-b1')).toBe(restored);
  });
});

describe('prune — a dismissal dies with the condition it hid', () => {
  it('drops a dismissal whose id is no longer derived', () => {
    const dismissed = dismissNotice(
      baseState({ buildings: [damagedBuilding('b1', 0.2)] }),
      { id: 'att-bld-dmg-b1', severity: 'warning' }, NOW,
    );
    // The player repaired it: damagePct gone, so the item is not derived.
    const repaired: GameState = { ...dismissed, buildings: [damagedBuilding('b1', 0)] };
    const view = deriveAttentionView(repaired, NOW);
    expect(view.dismissalsChanged).toBe(true);
    expect(view.dismissals).toEqual({});
    expect(view.dismissed).toEqual([]);
  });

  it('a cleared-then-recurring condition shows again', () => {
    const dismissed = dismissNotice(
      baseState({ buildings: [damagedBuilding('b1', 0.2)] }),
      { id: 'att-bld-dmg-b1', severity: 'warning' }, NOW,
    );
    // 1. Repaired -> the caller writes the pruned map back into state.
    const repaired: GameState = { ...dismissed, buildings: [damagedBuilding('b1', 0)] };
    const afterPrune: GameState = { ...repaired, dismissedNotices: deriveAttentionView(repaired, NOW).dismissals };
    expect(afterPrune.dismissedNotices).toEqual({});
    // 2. A later hazard damages the SAME building to the same degree. The
    //    row is a genuine recurrence and must not be muted by the old dismissal.
    const recurred: GameState = { ...afterPrune, buildings: [damagedBuilding('b1', 0.2)] };
    expect(deriveAttentionItems(recurred, NOW).map(i => i.id)).toContain('att-bld-dmg-b1');
  });

  it('pruneDismissals is pure and reports whether anything changed', () => {
    const items = deriveAllAttentionItems(baseState({ buildings: [damagedBuilding('b1', 0.2)] }), NOW);
    const input = { 'att-bld-dmg-b1': { atMs: NOW, severity: 'warning' as const }, 'att-bld-dmg-gone': { atMs: NOW, severity: 'critical' as const } };
    const { dismissals, changed } = pruneDismissals(input, items);
    expect(changed).toBe(true);
    expect(Object.keys(dismissals)).toEqual(['att-bld-dmg-b1']);
    expect(Object.keys(input)).toHaveLength(2); // input untouched
    // Nothing to prune -> changed false, so the caller writes nothing back.
    expect(pruneDismissals(dismissals, items).changed).toBe(false);
  });
});

describe('escalate — a worsening item re-asserts itself', () => {
  it('re-shows an item whose severity climbed above the dismissed severity', () => {
    const dismissed = dismissNotice(
      baseState({ buildings: [damagedBuilding('b1', 0.2)] }),
      { id: 'att-bld-dmg-b1', severity: 'warning' }, NOW,
    );
    // 20% -> 60% damage crosses outliner.ts's 50% critical threshold.
    const worse: GameState = { ...dismissed, buildings: [damagedBuilding('b1', 0.6)] };
    const view = deriveAttentionView(worse, NOW);
    expect(view.visible.map(i => i.id)).toContain('att-bld-dmg-b1');
    expect(view.dismissed).toEqual([]);
    expect(view.dismissalsChanged).toBe(true);
    expect(view.dismissals).toEqual({});
  });

  it('keeps hiding an item at or below the dismissed severity', () => {
    const dismissed = dismissNotice(
      baseState({ buildings: [damagedBuilding('b1', 0.6)] }),
      { id: 'att-bld-dmg-b1', severity: 'critical' }, NOW,
    );
    // Partially repaired: critical -> warning. Still dismissed.
    const better: GameState = { ...dismissed, buildings: [damagedBuilding('b1', 0.2)] };
    const view = deriveAttentionView(better, NOW);
    expect(view.visible.map(i => i.id)).not.toContain('att-bld-dmg-b1');
    expect(view.dismissalsChanged).toBe(false);
  });

  it('isDismissed compares live severity against the recorded one', () => {
    const map = { x: { atMs: NOW, severity: 'warning' as const } };
    expect(isDismissed({ id: 'x', severity: 'info' }, map)).toBe(true);
    expect(isDismissed({ id: 'x', severity: 'warning' }, map)).toBe(true);
    expect(isDismissed({ id: 'x', severity: 'critical' }, map)).toBe(false);
    expect(isDismissed({ id: 'y', severity: 'critical' }, map)).toBe(false);
  });
});

describe('save migration', () => {
  it('a new game has dismissed nothing', () => {
    expect(getNewGameState().dismissedNotices).toEqual({});
  });

  it('defaults an old save with no dismissedNotices block', () => {
    const s = getNewGameState();
    delete (s as Partial<GameState>).dismissedNotices;
    const migrated = migrateLoadedState(s)!;
    expect(migrated.dismissedNotices).toEqual({});
    // And every Attention row behaves exactly as it did before the feature.
    const withDamage: GameState = { ...migrated, buildings: [damagedBuilding('b1', 0.2)] };
    expect(deriveAttentionItems(withDamage, NOW).map(i => i.id)).toContain('att-bld-dmg-b1');
  });

  it('keeps real dismissals and replaces a malformed block', () => {
    const s = getNewGameState();
    s.dismissedNotices = { 'att-bld-dmg-b1': { atMs: NOW, severity: 'warning' } };
    expect(migrateLoadedState(s)!.dismissedNotices).toEqual({ 'att-bld-dmg-b1': { atMs: NOW, severity: 'warning' } });

    const bad = getNewGameState();
    (bad as unknown as { dismissedNotices: unknown }).dismissedNotices = ['nope'];
    expect(migrateLoadedState(bad)!.dismissedNotices).toEqual({});
    // readDismissals is defensive on its own, for states that never round-tripped.
    expect(readDismissals({ ...getNewGameState(), dismissedNotices: undefined })).toEqual({});
  });
});
