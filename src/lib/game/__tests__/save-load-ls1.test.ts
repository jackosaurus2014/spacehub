/**
 * @jest-environment jsdom
 *
 * Live-Service Wave LS1 "Night Shift" — save migration (V24).
 * Covers: getNewGameState ships the new fields; loadGame additively migrates
 * a pre-LS1 save (missing commandQueue/standingDirectives/awayLedger)
 * without touching anything else; an already-migrated save round-trips
 * untouched.
 */
import { getNewGameState, saveGame, loadGame, deleteSave } from '../save-load';
import { SAVE_KEY } from '../constants';
import type { GameState } from '../types';

describe('V24 migration — command queue / standing directives / away ledger', () => {
  afterEach(() => deleteSave());

  it('a fresh game starts with empty queue/directives and no away ledger', () => {
    const state = getNewGameState();
    expect(state.commandQueue).toEqual([]);
    expect(state.standingDirectives).toEqual([]);
    expect(state.awayLedger).toBeNull();
  });

  it('migrates a pre-V24 save (fields absent) additively', () => {
    const legacy = getNewGameState() as GameState & { commandQueue?: unknown; standingDirectives?: unknown; awayLedger?: unknown };
    delete legacy.commandQueue;
    delete legacy.standingDirectives;
    delete legacy.awayLedger;
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded).not.toBeNull();
    expect(loaded.commandQueue).toEqual([]);
    expect(loaded.standingDirectives).toEqual([]);
    expect(loaded.awayLedger).toBeNull();
  });

  it('preserves existing queue/directive data on reload (no silent reset)', () => {
    const state = getNewGameState();
    state.commandQueue = [{ id: 'q1', kind: 'research', createdAtMs: 1, label: 'Test', researchId: 'reusable_boosters' }];
    state.standingDirectives = [{ id: 'd1', type: 'maintenance_reserve', createdAtMs: 1, active: true, label: 'Reserve', reserveAmount: 1_000_000 }];
    saveGame(state);

    const loaded = loadGame()!;
    expect(loaded.commandQueue).toHaveLength(1);
    expect(loaded.commandQueue![0].id).toBe('q1');
    expect(loaded.standingDirectives).toHaveLength(1);
    expect(loaded.standingDirectives![0].id).toBe('d1');
  });

  it('does not disturb unrelated pre-existing fields during migration', () => {
    const legacy = getNewGameState() as GameState & { commandQueue?: unknown };
    legacy.money = 42_000_000;
    delete legacy.commandQueue;
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded.money).toBe(42_000_000);
  });
});
