/**
 * @jest-environment jsdom
 *
 * World epoch machinery (V42, world-reset.ts) — the scheduled fresh-start
 * restart announced 2026-08-17 for 2026-08-24. A save from an older epoch is
 * archived (never destroyed) on load and the player starts the new era fresh.
 */
import { getNewGameState, saveGame, loadGame, deleteSave } from '../save-load';
import { SAVE_KEY } from '../constants';
import {
  WORLD_EPOCH,
  WORLD_RESET_AT,
  ARCHIVED_SAVE_KEY,
  isWorldResetPending,
  daysUntilWorldReset,
  formatWorldResetDate,
} from '../world-reset';

describe('V42 — world epoch stamping', () => {
  afterEach(() => {
    deleteSave();
    localStorage.removeItem(ARCHIVED_SAVE_KEY);
  });

  it('a fresh game is stamped with the current epoch', () => {
    expect(getNewGameState().worldEpoch).toBe(WORLD_EPOCH);
  });

  it('an unstamped (pre-V42) save is treated as epoch 1 and migrated in place', () => {
    const legacy = getNewGameState();
    delete (legacy as { worldEpoch?: number }).worldEpoch;
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded).not.toBeNull();
    expect(loaded.worldEpoch).toBe(WORLD_EPOCH);
    // Nothing archived — this save belongs to the current era.
    expect(localStorage.getItem(ARCHIVED_SAVE_KEY)).toBeNull();
  });

  it('a save from an OLDER epoch is archived and the player starts fresh', () => {
    const old = getNewGameState();
    old.worldEpoch = WORLD_EPOCH - 1;
    old.money = 123_456_789; // distinctive marker for the archive assertion
    localStorage.setItem(SAVE_KEY, JSON.stringify(old));

    const loaded = loadGame();
    expect(loaded).toBeNull(); // caller starts a new game

    // Old save archived verbatim, not destroyed; main slot cleared.
    const archived = JSON.parse(localStorage.getItem(ARCHIVED_SAVE_KEY)!);
    expect(archived.money).toBe(123_456_789);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('a current-epoch save round-trips normally', () => {
    const state = getNewGameState();
    saveGame(state);
    expect(loadGame()!.worldEpoch).toBe(WORLD_EPOCH);
  });
});

describe('world-reset schedule helpers', () => {
  it('the scheduled restart (if any) exposes consistent pending/countdown/date views', () => {
    if (WORLD_RESET_AT === null) {
      expect(isWorldResetPending(Date.now())).toBe(false);
      expect(daysUntilWorldReset(Date.now())).toBe(0);
      expect(formatWorldResetDate()).toBe('');
      return;
    }
    const dayBefore = WORLD_RESET_AT - 24 * 60 * 60 * 1000;
    expect(isWorldResetPending(dayBefore)).toBe(true);
    expect(daysUntilWorldReset(dayBefore)).toBe(1);
    expect(isWorldResetPending(WORLD_RESET_AT)).toBe(false);
    expect(daysUntilWorldReset(WORLD_RESET_AT + 1)).toBe(0);
    expect(formatWorldResetDate()).toContain('2026');
  });

  it('the 2026-08-24 restart gives a full 7-day notice from the 8/17 announcement', () => {
    if (WORLD_RESET_AT === null) return;
    const announcedAt = Date.UTC(2026, 7, 17, 16, 0, 0);
    expect(daysUntilWorldReset(announcedAt)).toBe(7);
  });
});
