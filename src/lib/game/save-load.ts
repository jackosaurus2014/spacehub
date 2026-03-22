// ─── Space Tycoon: Save/Load System ─────────────────────────────────────────
// 200-cycle polish: initialize all game subsystems, persist NPC state,
// initialize prestige/workforce/milestones/achievements on load.

import type { GameState } from './types';
import { SAVE_KEY, SAVE_VERSION, STARTING_MONEY, STARTING_YEAR, STARTING_MONEY_PRO, STARTING_MONEY_ENTERPRISE } from './constants';
import { createAllNPCs } from './npc-companies';

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
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
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
    npcCompanies: createAllNPCs(),
    npcMarketPressure: {},
    // Initialize all subsystems
    activeEffects: [],
    incomeHistory: [],
    pendingChoice: null,
    activeRefining: null,
    activeMarketEvents: [],
    claimedMilestones: {},
    earnedAchievements: [],
    playerTitle: null,
    ships: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
    prestige: {
      level: 0,
      legacyPoints: 0,
      permanentBonuses: {
        revenueMultiplier: 1,
        buildSpeedMultiplier: 1,
        researchSpeedMultiplier: 1,
        miningMultiplier: 1,
        startingMoney: STARTING_MONEY,
      },
    },
    completedContracts: [],
    activeContracts: [],
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

/** Load game state from localStorage — migrates missing fields */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    if (!state || typeof state.version !== 'number') return null;

    // Restore NPCs from save, or create fresh if missing/corrupt
    if (!Array.isArray(state.npcCompanies) || state.npcCompanies.length === 0) {
      state.npcCompanies = createAllNPCs();
    }

    // Migrate missing fields (backwards compatibility)
    if (!state.npcMarketPressure) state.npcMarketPressure = {};
    if (!state.resources) state.resources = {};
    if (!state.activeEffects) state.activeEffects = [];
    if (!state.incomeHistory) state.incomeHistory = [];
    if (state.pendingChoice === undefined) state.pendingChoice = null;
    if (state.activeRefining === undefined) state.activeRefining = null;
    if (!state.activeMarketEvents) state.activeMarketEvents = [];
    if (!state.claimedMilestones) state.claimedMilestones = {};
    if (!state.earnedAchievements) state.earnedAchievements = [];
    if (!state.playerTitle) state.playerTitle = null;
    if (!state.ships) state.ships = [];
    if (!state.workforce) state.workforce = { engineers: 0, scientists: 0, miners: 0, operators: 0 };
    if (!state.prestige) {
      state.prestige = {
        level: 0, legacyPoints: 0,
        permanentBonuses: { revenueMultiplier: 1, buildSpeedMultiplier: 1, researchSpeedMultiplier: 1, miningMultiplier: 1, startingMoney: STARTING_MONEY },
      };
    }
    if (!state.completedContracts) state.completedContracts = [];
    if (!state.activeContracts) state.activeContracts = [];

    state.tickSpeed = 1; // Always 1x for fairness
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
