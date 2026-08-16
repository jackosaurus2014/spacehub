/**
 * @jest-environment jsdom
 *
 * Economic PvP Wave E5 "Depletion, Labor & Lanes" — save migration (V34).
 * Covers: getNewGameState ships the new neutral-default fields; loadGame
 * additively migrates a pre-E5 save (missing extractionPressure/laborMarket/
 * laneBonuses/pendingLaneUsage) without touching anything else; an
 * already-migrated save round-trips untouched; the migration needs NO
 * grandfather phase-in (unlike E3/E4) because every new field's neutral
 * default already reproduces pre-E5 behavior exactly.
 */
import { getNewGameState, saveGame, loadGame, deleteSave } from '../save-load';
import { SAVE_KEY } from '../constants';
import type { GameState } from '../types';

describe('V34 migration — deposit depletion / labor market / trade lanes', () => {
  afterEach(() => deleteSave());

  it('a fresh game starts with neutral E5 defaults (no server snapshot yet)', () => {
    const state = getNewGameState();
    expect(state.extractionPressure).toBeNull();
    expect(state.laborMarket).toBeNull();
    expect(state.laneBonuses).toBeNull();
    expect(state.pendingLaneUsage).toEqual({});
  });

  it('migrates a pre-E5 save (fields absent) additively', () => {
    const legacy = getNewGameState() as GameState & {
      extractionPressure?: unknown; laborMarket?: unknown; laneBonuses?: unknown; pendingLaneUsage?: unknown;
    };
    delete legacy.extractionPressure;
    delete legacy.laborMarket;
    delete legacy.laneBonuses;
    delete legacy.pendingLaneUsage;
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded).not.toBeNull();
    expect(loaded.extractionPressure).toBeNull();
    expect(loaded.laborMarket).toBeNull();
    expect(loaded.laneBonuses).toBeNull();
    expect(loaded.pendingLaneUsage).toEqual({});
    // A one-shot explainer event is posted, mirroring V15/V32/V33.
    expect(loaded.eventLog.some(e => e.id === 'evt_v34_depletion_labor_lanes')).toBe(true);
  });

  it('preserves existing E5 snapshots on reload (no silent reset)', () => {
    const state = getNewGameState();
    state.extractionPressure = {
      entries: { 'asteroid_belt:platinum_group': { locationId: 'asteroid_belt', resourceId: 'platinum_group', pressure: 0.7 } },
      asOf: 123,
    };
    state.laborMarket = { index: { engineer: 1.3 }, asOf: 456 };
    state.laneBonuses = { bonuses: { 'earth_surface|leo': 0.05 }, asOf: 789 };
    state.pendingLaneUsage = { 'earth_surface|leo': 3 };
    saveGame(state);

    const loaded = loadGame()!;
    expect(loaded.extractionPressure?.entries['asteroid_belt:platinum_group'].pressure).toBe(0.7);
    expect(loaded.laborMarket?.index.engineer).toBe(1.3);
    expect(loaded.laneBonuses?.bonuses['earth_surface|leo']).toBe(0.05);
    expect(loaded.pendingLaneUsage?.['earth_surface|leo']).toBe(3);
  });

  it('does not disturb unrelated pre-existing fields during migration', () => {
    const legacy = getNewGameState() as GameState & { extractionPressure?: unknown };
    legacy.money = 42_000_000;
    delete legacy.extractionPressure;
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded.money).toBe(42_000_000);
  });

  it('an already-migrated save is left untouched (idempotent load)', () => {
    const state = getNewGameState();
    state.laborMarket = { index: { miner: 1.6 }, asOf: 999 };
    saveGame(state);

    const loaded1 = loadGame()!;
    saveGame(loaded1);
    const loaded2 = loadGame()!;
    expect(loaded2.laborMarket).toEqual(loaded1.laborMarket);
  });

  it('pendingMarketFlows gets the new minedByLocation/shock sub-fields on migration', () => {
    const legacy = getNewGameState() as GameState & { pendingMarketFlows?: { mined: Record<string, number>; npc: Record<string, number> } };
    legacy.pendingMarketFlows = { mined: { iron: 5 }, npc: {} };
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded.pendingMarketFlows?.mined).toEqual({ iron: 5 });
    expect(loaded.pendingMarketFlows?.minedByLocation).toEqual({});
    expect(loaded.pendingMarketFlows?.shock).toEqual({});
  });
});
