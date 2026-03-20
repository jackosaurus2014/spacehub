// ─── Space Tycoon: Save/Load System ─────────────────────────────────────────

import type { GameState } from './types';
import { SAVE_KEY, SAVE_VERSION, STARTING_MONEY, STARTING_YEAR } from './constants';

/** Create a fresh new game state */
export function getNewGameState(): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    lastTickAt: Date.now(),
    money: STARTING_MONEY,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: STARTING_YEAR, month: 1 },
    tickSpeed: 0, // Start paused
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    eventLog: [{
      id: 'start',
      date: { year: STARTING_YEAR, month: 1 },
      type: 'milestone',
      title: 'Company Founded',
      description: `Your space venture begins with $${(STARTING_MONEY / 1_000_000).toFixed(0)}M in funding. Build your first launch pad.`,
    }],
    stats: {
      rocketsLaunched: 0,
      satellitesDeployed: 0,
      stationsBuilt: 0,
      researchCompleted: 0,
      missionsToMoon: 0,
      missionsToMars: 0,
      missionsToOuterPlanets: 0,
    },
  };
}

/** Save game state to localStorage */
export function saveGame(state: GameState): boolean {
  try {
    const data = JSON.stringify({ ...state, lastTickAt: Date.now() });
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}

/** Load game state from localStorage */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    if (!state || typeof state.version !== 'number') return null;
    // Future: add migration logic here if state.version < SAVE_VERSION
    return state;
  } catch {
    return null;
  }
}

/** Delete saved game */
export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** Export save as base64 string */
export function exportSave(state: GameState): string {
  return btoa(JSON.stringify(state));
}

/** Import save from base64 string */
export function importSave(encoded: string): GameState | null {
  try {
    const state = JSON.parse(atob(encoded)) as GameState;
    if (!state || typeof state.version !== 'number') return null;
    return state;
  } catch {
    return null;
  }
}
