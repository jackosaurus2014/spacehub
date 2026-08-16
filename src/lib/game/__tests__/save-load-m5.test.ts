/**
 * @jest-environment jsdom
 *
 * Meaningful Decisions Wave M5 "Offense Toolkit I" — save migration (V38).
 * Additive only: offense snapshot null until sync delivers one, the poach
 * idempotency cursor starts empty, no pending tolls; one-shot explainer.
 */
import { getNewGameState, saveGame, loadGame, deleteSave } from '../save-load';
import { SAVE_KEY } from '../constants';
import type { GameState } from '../types';

describe('V38 migration — offense toolkit', () => {
  afterEach(() => deleteSave());

  it('a fresh game starts with neutral M5 defaults', () => {
    const state = getNewGameState();
    expect(state.offense).toBeNull();
    expect(state.appliedPoachOfferIds).toEqual([]);
    expect(state.pendingTollPayments).toEqual({});
  });

  it('migrates a pre-M5 save (fields absent) additively, with the one-shot explainer', () => {
    const legacy = getNewGameState() as GameState & {
      offense?: unknown; appliedPoachOfferIds?: unknown; pendingTollPayments?: unknown;
    };
    delete legacy.offense;
    delete legacy.appliedPoachOfferIds;
    delete legacy.pendingTollPayments;
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded.offense).toBeNull();
    expect(loaded.appliedPoachOfferIds).toEqual([]);
    expect(loaded.pendingTollPayments).toEqual({});
    expect(loaded.eventLog.some(e => e.id === 'evt_v38_offense_toolkit')).toBe(true);
  });

  it('an already-migrated save round-trips untouched (no duplicate explainer)', () => {
    const state = getNewGameState();
    state.appliedPoachOfferIds = ['offer_a'];
    state.pendingTollPayments = { zone_leo: 1_000_000 };
    saveGame(state);

    const loaded1 = loadGame()!;
    expect(loaded1.appliedPoachOfferIds).toEqual(['offer_a']);
    expect(loaded1.pendingTollPayments).toEqual({ zone_leo: 1_000_000 });
    expect(loaded1.eventLog.some(e => e.id === 'evt_v38_offense_toolkit')).toBe(false);
  });

  it('does not disturb unrelated fields during migration', () => {
    const legacy = getNewGameState() as GameState & { appliedPoachOfferIds?: unknown };
    legacy.money = 77_000_000;
    delete legacy.appliedPoachOfferIds;
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded.money).toBe(77_000_000);
  });
});
