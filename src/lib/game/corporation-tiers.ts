// ─── Space Tycoon: Corporation Tiers / Company Evolution ─────────────────────
// Your company evolves through 6 named tiers as you hit progression thresholds.
// Each tier unlocks new tabs, grants base slot increases, and applies bonuses.

import type { GameState, GameTab } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CorporationTierDef {
  tier: number;
  name: string;
  icon: string;
  color: string;
  /** Requirements to reach this tier (tier 1 is automatic) */
  requirements: {
    totalEarned?: number;
    completedBuildings?: number;
    completedResearch?: number;
    unlockedLocations?: number;
    activeServices?: number;
    builtShips?: number;
    completedContracts?: number;
    prestigeLevel?: number;
  };
  /** Base construction slots granted at this tier */
  constructionSlots: number;
  /** Base shipyard slots granted at this tier */
  shipyardSlots: number;
  /** Passive bonuses */
  bonuses: {
    maintenanceReduction: number; // 0-1 fraction
    revenueBonus: number;        // 0+ fraction
    miningBonus: number;         // 0+ fraction
  };
  /** Tabs unlocked at this tier */
  unlockedTabs: GameTab[];
}

// ─── Tier Definitions ────────────────────────────────────────────────────────

export const CORPORATION_TIERS: CorporationTierDef[] = [
  {
    tier: 1, name: 'Startup', icon: '🚀', color: '#94a3b8',
    requirements: {},
    constructionSlots: 2,
    shipyardSlots: 1,
    bonuses: { maintenanceReduction: 0, revenueBonus: 0, miningBonus: 0 },
    unlockedTabs: ['dashboard', 'build', 'research', 'map', 'services'],
  },
  {
    tier: 2, name: 'Venture', icon: '📈', color: '#22d3ee',
    requirements: {
      totalEarned: 500_000_000,
      completedBuildings: 5,
      completedResearch: 3,
      unlockedLocations: 3,
    },
    constructionSlots: 3,
    shipyardSlots: 1,
    bonuses: { maintenanceReduction: 0.03, revenueBonus: 0.03, miningBonus: 0 },
    unlockedTabs: ['fleet', 'contracts', 'reports'],
  },
  {
    tier: 3, name: 'Enterprise', icon: '🏢', color: '#a78bfa',
    requirements: {
      totalEarned: 5_000_000_000,
      completedBuildings: 12,
      completedResearch: 8,
      unlockedLocations: 5,
      activeServices: 6,
    },
    constructionSlots: 4,
    shipyardSlots: 2,
    bonuses: { maintenanceReduction: 0.05, revenueBonus: 0.05, miningBonus: 0.05 },
    unlockedTabs: ['crafting', 'market', 'workforce'],
  },
  {
    tier: 4, name: 'Corporation', icon: '🏛️', color: '#fbbf24',
    requirements: {
      totalEarned: 50_000_000_000,
      completedBuildings: 25,
      completedResearch: 15,
      unlockedLocations: 7,
      builtShips: 3,
    },
    constructionSlots: 5,
    shipyardSlots: 3,
    bonuses: { maintenanceReduction: 0.08, revenueBonus: 0.08, miningBonus: 0.10 },
    unlockedTabs: ['alliance', 'bounties', 'rivals'],
  },
  {
    tier: 5, name: 'Conglomerate', icon: '👑', color: '#f97316',
    requirements: {
      totalEarned: 500_000_000_000,
      completedBuildings: 40,
      completedResearch: 25,
      unlockedLocations: 9,
      builtShips: 6,
      activeServices: 15,
      completedContracts: 10,
    },
    constructionSlots: 7,
    shipyardSlots: 4,
    bonuses: { maintenanceReduction: 0.10, revenueBonus: 0.12, miningBonus: 0.15 },
    unlockedTabs: ['leagues', 'bidding', 'megaproject'],
  },
  {
    tier: 6, name: 'Megacorp', icon: '🌟', color: '#ef4444',
    requirements: {
      totalEarned: 5_000_000_000_000,
      completedBuildings: 60,
      completedResearch: 35,
      unlockedLocations: 11,
      builtShips: 10,
      activeServices: 25,
      prestigeLevel: 1,
    },
    constructionSlots: 10,
    shipyardSlots: 5,
    bonuses: { maintenanceReduction: 0.15, revenueBonus: 0.15, miningBonus: 0.20 },
    unlockedTabs: ['espionage', 'territory', 'speedruns', 'seasons'],
  },
];

export const TIER_MAP = new Map(CORPORATION_TIERS.map(t => [t.tier, t]));

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Determine the highest corporation tier the player qualifies for.
 * Checks tiers from highest to lowest, returns the first one met.
 */
export function checkCorporationTier(state: GameState): number {
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const completedResearch = state.completedResearch.length;
  const unlockedLocations = state.unlockedLocations.length;
  const activeServices = state.activeServices.length;
  const builtShips = (state.ships || []).filter(s => s.isBuilt).length;
  const completedContracts = (state.completedContracts || []).length;
  const prestigeLevel = state.prestige?.level || 0;

  // Check from highest tier down
  for (let i = CORPORATION_TIERS.length - 1; i >= 0; i--) {
    const tier = CORPORATION_TIERS[i];
    const req = tier.requirements;

    const meets =
      (req.totalEarned === undefined || state.totalEarned >= req.totalEarned) &&
      (req.completedBuildings === undefined || completedBuildings >= req.completedBuildings) &&
      (req.completedResearch === undefined || completedResearch >= req.completedResearch) &&
      (req.unlockedLocations === undefined || unlockedLocations >= req.unlockedLocations) &&
      (req.activeServices === undefined || activeServices >= req.activeServices) &&
      (req.builtShips === undefined || builtShips >= req.builtShips) &&
      (req.completedContracts === undefined || completedContracts >= req.completedContracts) &&
      (req.prestigeLevel === undefined || prestigeLevel >= req.prestigeLevel);

    if (meets) return tier.tier;
  }

  return 1; // Default to Startup
}

/**
 * Get the tier definition for a given tier number.
 */
export function getTierDef(tier: number): CorporationTierDef {
  return TIER_MAP.get(tier) || CORPORATION_TIERS[0];
}

/**
 * Get the base construction slots for a tier (replaces constant).
 */
export function getTierConstructionSlots(tier: number): number {
  return getTierDef(tier).constructionSlots;
}

/**
 * Get the base shipyard slots for a tier (replaces constant).
 */
export function getTierShipyardSlots(tier: number): number {
  return getTierDef(tier).shipyardSlots;
}

/**
 * Get tier bonuses (maintenance reduction, revenue bonus, mining bonus).
 */
export function getTierBonuses(tier: number): CorporationTierDef['bonuses'] {
  return getTierDef(tier).bonuses;
}

/**
 * Get all tabs unlocked up to and including a given tier.
 * Accumulates tabs from tier 1 through the given tier.
 */
export function getTierUnlockedTabs(tier: number): GameTab[] {
  const tabs = new Set<GameTab>();
  for (const tierDef of CORPORATION_TIERS) {
    if (tierDef.tier > tier) break;
    for (const tab of tierDef.unlockedTabs) {
      tabs.add(tab);
    }
  }
  // Leaderboard is always available
  tabs.add('leaderboard');
  return Array.from(tabs);
}

/**
 * Get the next tier the player hasn't reached yet (for progress display).
 * Returns null if player is at max tier.
 */
export function getNextTier(currentTier: number): CorporationTierDef | null {
  const next = CORPORATION_TIERS.find(t => t.tier === currentTier + 1);
  return next || null;
}

/**
 * Get progress toward next tier as an object of requirement -> { current, required, met }.
 */
export function getNextTierProgress(state: GameState, currentTier: number): {
  label: string;
  current: number;
  required: number;
  met: boolean;
}[] | null {
  const next = getNextTier(currentTier);
  if (!next) return null;

  const req = next.requirements;
  const progress: { label: string; current: number; required: number; met: boolean }[] = [];

  if (req.totalEarned !== undefined) {
    progress.push({ label: 'Total Earned', current: state.totalEarned, required: req.totalEarned, met: state.totalEarned >= req.totalEarned });
  }
  if (req.completedBuildings !== undefined) {
    const current = state.buildings.filter(b => b.isComplete).length;
    progress.push({ label: 'Buildings', current, required: req.completedBuildings, met: current >= req.completedBuildings });
  }
  if (req.completedResearch !== undefined) {
    const current = state.completedResearch.length;
    progress.push({ label: 'Research', current, required: req.completedResearch, met: current >= req.completedResearch });
  }
  if (req.unlockedLocations !== undefined) {
    const current = state.unlockedLocations.length;
    progress.push({ label: 'Locations', current, required: req.unlockedLocations, met: current >= req.unlockedLocations });
  }
  if (req.activeServices !== undefined) {
    const current = state.activeServices.length;
    progress.push({ label: 'Services', current, required: req.activeServices, met: current >= req.activeServices });
  }
  if (req.builtShips !== undefined) {
    const current = (state.ships || []).filter(s => s.isBuilt).length;
    progress.push({ label: 'Ships', current, required: req.builtShips, met: current >= req.builtShips });
  }
  if (req.completedContracts !== undefined) {
    const current = (state.completedContracts || []).length;
    progress.push({ label: 'Contracts', current, required: req.completedContracts, met: current >= req.completedContracts });
  }
  if (req.prestigeLevel !== undefined) {
    const current = state.prestige?.level || 0;
    progress.push({ label: 'Prestige Level', current, required: req.prestigeLevel, met: current >= req.prestigeLevel });
  }

  return progress;
}
