// ─── Space Tycoon: Save/Load System ─────────────────────────────────────────
// 200-cycle polish: initialize all game subsystems, persist NPC state,
// initialize prestige/workforce/milestones/achievements on load.

import type { GameState } from './types';
import { SAVE_KEY, SAVE_VERSION, STARTING_MONEY, STARTING_YEAR, STARTING_MONEY_PRO, STARTING_MONEY_ENTERPRISE } from './constants';
import { createAllNPCs } from './npc-companies';
import { DEFAULT_LEGACY, LEGACY_MILESTONES, STRETCH_LEGACIES, getLegacyPower, getLegacyDisplayTier } from './legacy-system';
import type { LegacyState } from './legacy-system';
import { checkCorporationTier } from './corporation-tiers';

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
    activeResearch2: null,
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
    reports: [],
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
    // V3 fields
    availableBoosts: [],
    activeBoosts: [],
    servicePriceMultipliers: {},
    // V5 fields — mini-activities
    miniActivityCooldowns: {},
    // V6 fields — legacy system & corporation tiers
    legacy: { ...DEFAULT_LEGACY },
    corporationTier: 1,
    // V7 fields — megastructures & reputation
    megastructures: [],
    reputation: 0,
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
    if (!state.reports) state.reports = [];
    if (!state.workforce) state.workforce = { engineers: 0, scientists: 0, miners: 0, operators: 0 };
    if (!state.prestige) {
      state.prestige = {
        level: 0, legacyPoints: 0,
        permanentBonuses: { revenueMultiplier: 1, buildSpeedMultiplier: 1, researchSpeedMultiplier: 1, miningMultiplier: 1, startingMoney: STARTING_MONEY },
      };
    }
    if (!state.completedContracts) state.completedContracts = [];
    if (!state.activeContracts) state.activeContracts = [];
    // V3 fields — speed boosts and service pricing
    if (!state.availableBoosts) state.availableBoosts = [];
    if (!state.activeBoosts) state.activeBoosts = [];
    if (!state.servicePriceMultipliers) state.servicePriceMultipliers = {};
    // V4 fields — timed competitive events
    if (!state.activeTimedEvents) state.activeTimedEvents = [];
    if (!state.lastTimedEventSpawnMs) state.lastTimedEventSpawnMs = 0;
    // V5 fields — mini-activities (rotating slot system)
    if (!state.miniActivityCooldowns) state.miniActivityCooldowns = {};
    if (!state.miniActivitySlots) state.miniActivitySlots = [];
    if (!state.miniActivityLastSpawnMs) state.miniActivityLastSpawnMs = 0;

    // V6 fields — Legacy system & Corporation tiers
    if (!state.legacy) {
      // Migrate prestige -> legacy if player had prestige
      if (state.prestige && state.prestige.level > 0) {
        const prestigeLevel = state.prestige.level || 0;
        const milestonesPerPrestige = 4;
        const totalToGrant = Math.min(prestigeLevel * milestonesPerPrestige, 40);
        const milestonesToGrant: string[] = [];
        for (let i = 0; i < totalToGrant && i < LEGACY_MILESTONES.length; i++) {
          milestonesToGrant.push(LEGACY_MILESTONES[i].id);
        }

        // Convert legacy points into stretch legacy levels
        const legacyPoints = state.prestige.legacyPoints || 0;
        const totalStretchLevels = Math.floor(legacyPoints / 15);
        const stretchLevels: Record<string, number> = {};
        const stretchIds = STRETCH_LEGACIES.map(s => s.id);
        for (let i = 0; i < totalStretchLevels; i++) {
          const id = stretchIds[i % stretchIds.length];
          stretchLevels[id] = (stretchLevels[id] || 0) + 1;
        }

        const newLegacy: LegacyState = {
          completedMilestones: milestonesToGrant,
          stretchLevels,
          trackers: {
            totalResourcesMined: Object.values(state.resources || {}).reduce((a, b) => a + b, 0),
            totalContractsCompleted: (state.completedContracts || []).length,
            totalShipsBuilt: (state.ships || []).filter(s => s.isBuilt).length,
            totalBuildingsCompleted: state.buildings.filter(b => b.isComplete).length,
          },
          legacyPower: 0,
          displayTier: 'Pioneer',
        };
        newLegacy.legacyPower = getLegacyPower(newLegacy);
        newLegacy.displayTier = getLegacyDisplayTier(newLegacy);
        state.legacy = newLegacy;
      } else {
        // Fresh legacy state, initialize trackers from current game state
        state.legacy = {
          ...DEFAULT_LEGACY,
          trackers: {
            totalResourcesMined: Object.values(state.resources || {}).reduce((a, b) => a + b, 0),
            totalContractsCompleted: (state.completedContracts || []).length,
            totalShipsBuilt: (state.ships || []).filter(s => s.isBuilt).length,
            totalBuildingsCompleted: state.buildings.filter(b => b.isComplete).length,
          },
        };
      }
    }
    if (!state.corporationTier) {
      state.corporationTier = checkCorporationTier(state);
    }

    // V7 fields — megastructures & reputation
    if (!state.megastructures) state.megastructures = [];
    if (state.reputation === undefined || state.reputation === null) state.reputation = 0;
    // V8 fields — second research queue
    if (state.activeResearch2 === undefined) state.activeResearch2 = null;

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
