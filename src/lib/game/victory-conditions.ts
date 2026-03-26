// ─── Space Tycoon: Victory Conditions ──────────────────────────────────────
// 7 victory conditions that don't end the game — they grant permanent bonuses
// and titles. Achieving multiple victories compounds rewards.

import type { GameState } from './types';
import { BUILDING_MAP } from './buildings';
import { RESEARCH_MAP } from './research-tree';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VictoryDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  title: string;
  reward: VictoryReward;
  /** Returns true if the victory condition is met */
  check: (state: GameState) => boolean;
  /** Returns progress 0-1 plus detail lines */
  progress: (state: GameState) => VictoryProgress;
}

export interface VictoryReward {
  revenueMultiplier: number;   // e.g. 1.05 = +5%
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  miningMultiplier: number;
}

export interface VictoryProgress {
  percent: number;
  details: { label: string; current: number; target: number }[];
}

export interface VictoryBonuses {
  revenueMultiplier: number;
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  miningMultiplier: number;
}

// ─── Helper utilities ───────────────────────────────────────────────────────

function countDistinctBuildingCategories(state: GameState): number {
  const cats = new Set<string>();
  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (def) cats.add(def.category);
  }
  return cats.size;
}

function countDistinctResourceTypes(state: GameState): number {
  return Object.entries(state.resources || {}).filter(([, qty]) => qty > 0).length;
}

function countDistinctBuildingLocations(state: GameState): number {
  const locs = new Set<string>();
  for (const bld of state.buildings) {
    if (bld.isComplete) locs.add(bld.locationId);
  }
  return locs.size;
}

function hasOuterSystemBuilding(state: GameState): boolean {
  return state.buildings.some(b => b.isComplete && b.locationId === 'outer_system');
}

function countDistinctResearchCategories(state: GameState): number {
  const cats = new Set<string>();
  for (const rid of state.completedResearch) {
    const def = RESEARCH_MAP.get(rid);
    if (def) cats.add(def.category);
  }
  return cats.size;
}

function hasT5Research(state: GameState): boolean {
  return state.completedResearch.some(rid => {
    const def = RESEARCH_MAP.get(rid);
    return def && def.tier >= 5;
  });
}

function countDistinctShipLocations(state: GameState): number {
  const locs = new Set<string>();
  for (const ship of (state.ships || [])) {
    if (ship.isBuilt) locs.add(ship.currentLocation);
  }
  return locs.size;
}

function countDistinctMiningLocations(state: GameState): number {
  const locs = new Set<string>();
  for (const ship of (state.ships || [])) {
    if (ship.isBuilt && ship.status === 'mining' && ship.miningOperation) {
      locs.add(ship.miningOperation.locationId || ship.currentLocation);
    }
  }
  return locs.size;
}

function countShipMissions(state: GameState): number {
  // Count ships that have completed at least one transit (proxy: ships not at starting location)
  return (state.ships || []).filter(s => s.isBuilt && s.currentLocation !== 'earth_surface' && s.currentLocation !== 'leo').length;
}

function hasMarsResearch(state: GameState, id: string): boolean {
  return state.completedResearch.includes(id);
}

function hasMarsBuilding(state: GameState, defId: string): boolean {
  return state.buildings.some(b => b.isComplete && b.definitionId === defId);
}

function isMegastructureComplete(state: GameState, megaId: string): boolean {
  return (state.megastructures || []).some(m => m.definitionId === megaId && m.status === 'complete');
}

function getMegastructurePhaseProgress(state: GameState, megaId: string): { completed: number; total: number } {
  const inst = (state.megastructures || []).find(m => m.definitionId === megaId);
  if (!inst) return { completed: 0, total: 1 };
  return { completed: inst.completedPhases, total: inst.totalPhases };
}

// ─── Victory Definitions ────────────────────────────────────────────────────

export const VICTORY_CONDITIONS: VictoryDefinition[] = [
  // 1. Economic Dominion
  {
    id: 'economic_dominion',
    name: 'Economic Dominion',
    description: 'Amass $1T in cash, earn $5T total, run 20+ services, and complete 10+ contracts.',
    icon: '💎',
    title: 'Galactic Mogul',
    reward: { revenueMultiplier: 1.05, buildSpeedMultiplier: 1.0, researchSpeedMultiplier: 1.0, miningMultiplier: 1.0 },
    check: (s) =>
      s.money >= 1_000_000_000_000 &&
      s.totalEarned >= 5_000_000_000_000 &&
      s.activeServices.length >= 20 &&
      (s.completedContracts || []).length >= 10,
    progress: (s) => {
      const details = [
        { label: 'Cash', current: Math.min(s.money, 1_000_000_000_000), target: 1_000_000_000_000 },
        { label: 'Total Earned', current: Math.min(s.totalEarned, 5_000_000_000_000), target: 5_000_000_000_000 },
        { label: 'Active Services', current: Math.min(s.activeServices.length, 20), target: 20 },
        { label: 'Contracts Completed', current: Math.min((s.completedContracts || []).length, 10), target: 10 },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 2. Scientific Transcendence
  {
    id: 'scientific_transcendence',
    name: 'Scientific Transcendence',
    description: 'Complete 100+ research, achieve Tier 5 research, and research across 12+ categories.',
    icon: '🔬',
    title: 'Architect of Knowledge',
    reward: { revenueMultiplier: 1.0, buildSpeedMultiplier: 1.0, researchSpeedMultiplier: 1.10, miningMultiplier: 1.0 },
    check: (s) =>
      s.completedResearch.length >= 100 &&
      hasT5Research(s) &&
      countDistinctResearchCategories(s) >= 12,
    progress: (s) => {
      const details = [
        { label: 'Research Completed', current: Math.min(s.completedResearch.length, 100), target: 100 },
        { label: 'Tier 5 Research', current: hasT5Research(s) ? 1 : 0, target: 1 },
        { label: 'Research Categories', current: Math.min(countDistinctResearchCategories(s), 12), target: 12 },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 3. Solar Cartographer
  {
    id: 'solar_cartographer',
    name: 'Solar Cartographer',
    description: 'Unlock 11+ locations, build at 6+ locations, and place a building in the outer system.',
    icon: '🗺️',
    title: 'Solar Emperor',
    reward: { revenueMultiplier: 1.0, buildSpeedMultiplier: 1.0, researchSpeedMultiplier: 1.0, miningMultiplier: 1.05 },
    check: (s) =>
      s.unlockedLocations.length >= 11 &&
      countDistinctBuildingLocations(s) >= 6 &&
      hasOuterSystemBuilding(s),
    progress: (s) => {
      const details = [
        { label: 'Locations Unlocked', current: Math.min(s.unlockedLocations.length, 11), target: 11 },
        { label: 'Building Locations', current: Math.min(countDistinctBuildingLocations(s), 6), target: 6 },
        { label: 'Outer System Building', current: hasOuterSystemBuilding(s) ? 1 : 0, target: 1 },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 4. Industrial Titan
  {
    id: 'industrial_titan',
    name: 'Industrial Titan',
    description: 'Build 50+ buildings across 4+ categories, stockpile 1000+ of any resource, and hold 8+ resource types.',
    icon: '🏭',
    title: 'Master of Industry',
    reward: { revenueMultiplier: 1.0, buildSpeedMultiplier: 1.10, researchSpeedMultiplier: 1.0, miningMultiplier: 1.0 },
    check: (s) => {
      const completedCount = s.buildings.filter(b => b.isComplete).length;
      const hasLargeStock = Object.values(s.resources || {}).some(q => q >= 1000);
      return completedCount >= 50 &&
        countDistinctBuildingCategories(s) >= 4 &&
        hasLargeStock &&
        countDistinctResourceTypes(s) >= 8;
    },
    progress: (s) => {
      const completedCount = s.buildings.filter(b => b.isComplete).length;
      const maxResource = Math.max(0, ...Object.values(s.resources || {}));
      const details = [
        { label: 'Buildings Completed', current: Math.min(completedCount, 50), target: 50 },
        { label: 'Building Categories', current: Math.min(countDistinctBuildingCategories(s), 4), target: 4 },
        { label: 'Largest Resource Stock', current: Math.min(maxResource, 1000), target: 1000 },
        { label: 'Resource Types', current: Math.min(countDistinctResourceTypes(s), 8), target: 8 },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 5. Fleet Admiral
  {
    id: 'fleet_admiral',
    name: 'Fleet Admiral',
    description: 'Own 8+ ships, deploy to 5+ missions, park ships at 3+ locations, and mine at 2+ locations.',
    icon: '🚀',
    title: 'Grand Admiral',
    reward: { revenueMultiplier: 1.03, buildSpeedMultiplier: 1.0, researchSpeedMultiplier: 1.0, miningMultiplier: 1.05 },
    check: (s) => {
      const builtShips = (s.ships || []).filter(sh => sh.isBuilt).length;
      return builtShips >= 8 &&
        countShipMissions(s) >= 5 &&
        countDistinctShipLocations(s) >= 3 &&
        countDistinctMiningLocations(s) >= 2;
    },
    progress: (s) => {
      const builtShips = (s.ships || []).filter(sh => sh.isBuilt).length;
      const details = [
        { label: 'Built Ships', current: Math.min(builtShips, 8), target: 8 },
        { label: 'Ship Missions', current: Math.min(countShipMissions(s), 5), target: 5 },
        { label: 'Ship Locations', current: Math.min(countDistinctShipLocations(s), 3), target: 3 },
        { label: 'Mining Locations', current: Math.min(countDistinctMiningLocations(s), 2), target: 2 },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 6. Terraformer
  {
    id: 'terraformer',
    name: 'Terraformer',
    description: 'Research Mars Warming and Magnetic Shield, and build a Mars Habitat and Mars Mine.',
    icon: '🌍',
    title: 'World Builder',
    reward: { revenueMultiplier: 1.05, buildSpeedMultiplier: 1.0, researchSpeedMultiplier: 1.05, miningMultiplier: 1.0 },
    check: (s) =>
      hasMarsResearch(s, 'mars_warming') &&
      hasMarsResearch(s, 'magnetic_shield') &&
      hasMarsBuilding(s, 'habitat_mars') &&
      hasMarsBuilding(s, 'mining_mars'),
    progress: (s) => {
      const details = [
        { label: 'Mars Warming Research', current: hasMarsResearch(s, 'mars_warming') ? 1 : 0, target: 1 },
        { label: 'Magnetic Shield Research', current: hasMarsResearch(s, 'magnetic_shield') ? 1 : 0, target: 1 },
        { label: 'Mars Habitat', current: hasMarsBuilding(s, 'habitat_mars') ? 1 : 0, target: 1 },
        { label: 'Mars Mine', current: hasMarsBuilding(s, 'mining_mars') ? 1 : 0, target: 1 },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 7. Dyson Lord — complete the Dyson Swarm Segment
  {
    id: 'dyson_lord',
    name: 'Dyson Lord',
    description: 'Complete the Dyson Swarm Segment megastructure, harnessing a star\'s energy to power your civilization.',
    icon: '🌞',
    title: 'Star Harnasser',
    reward: { revenueMultiplier: 1.08, buildSpeedMultiplier: 1.05, researchSpeedMultiplier: 1.0, miningMultiplier: 1.0 },
    check: (s) => isMegastructureComplete(s, 'dyson_swarm_segment'),
    progress: (s) => {
      const { completed, total } = getMegastructurePhaseProgress(s, 'dyson_swarm_segment');
      const details = [
        { label: 'Swarm Segment Phases', current: completed, target: total },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 8. Interstellar Pioneer — build the Interstellar Probe
  {
    id: 'interstellar_pioneer',
    name: 'Interstellar Pioneer',
    description: 'Build and launch the Interstellar Probe, sending humanity\'s first emissary beyond the solar system.',
    icon: '🛸',
    title: 'Voyager',
    reward: { revenueMultiplier: 1.0, buildSpeedMultiplier: 1.0, researchSpeedMultiplier: 1.10, miningMultiplier: 1.0 },
    check: (s) => isMegastructureComplete(s, 'interstellar_probe'),
    progress: (s) => {
      const { completed, total } = getMegastructurePhaseProgress(s, 'interstellar_probe');
      const details = [
        { label: 'Probe Construction Phases', current: completed, target: total },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 9. Space Elevator Tycoon — build the Space Elevator
  {
    id: 'space_elevator_tycoon',
    name: 'Space Elevator Tycoon',
    description: 'Build the Space Elevator, linking Earth\'s surface to orbit and revolutionizing access to space.',
    icon: '🗼',
    title: 'Elevator Baron',
    reward: { revenueMultiplier: 1.05, buildSpeedMultiplier: 1.08, researchSpeedMultiplier: 1.0, miningMultiplier: 1.0 },
    check: (s) => isMegastructureComplete(s, 'space_elevator'),
    progress: (s) => {
      const { completed, total } = getMegastructurePhaseProgress(s, 'space_elevator');
      const details = [
        { label: 'Elevator Construction Phases', current: completed, target: total },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 10. Architect of Worlds — complete the Terraforming Engine
  {
    id: 'architect_of_worlds',
    name: 'Architect of Worlds',
    description: 'Complete the Terraforming Engine and begin the transformation of Mars into a habitable world. The ultimate expression of human ambition.',
    icon: '🌎',
    title: 'World Shaper',
    reward: { revenueMultiplier: 1.10, buildSpeedMultiplier: 1.05, researchSpeedMultiplier: 1.05, miningMultiplier: 1.05 },
    check: (s) => isMegastructureComplete(s, 'terraforming_engine'),
    progress: (s) => {
      const { completed, total } = getMegastructurePhaseProgress(s, 'terraforming_engine');
      const details = [
        { label: 'Terraforming Phases', current: completed, target: total },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },

  // 11. Hegemon (meta-victory) — updated to require 6 of 10 other victories
  {
    id: 'hegemon',
    name: 'Hegemon',
    description: 'Achieve 6 of the 10 other victories, prestige at least once, and earn 15+ achievements.',
    icon: '👑',
    title: 'Ascendant',
    reward: { revenueMultiplier: 1.10, buildSpeedMultiplier: 1.05, researchSpeedMultiplier: 1.05, miningMultiplier: 1.05 },
    check: (s) => {
      const earnedVictories = s.earnedVictories || [];
      const otherVictories = earnedVictories.filter(v => v !== 'hegemon').length;
      const hasPrestige = (s.prestige?.level || 0) >= 1;
      const achievementCount = (s.earnedAchievements || []).length;
      return otherVictories >= 6 && hasPrestige && achievementCount >= 15;
    },
    progress: (s) => {
      const earnedVictories = s.earnedVictories || [];
      const otherVictories = earnedVictories.filter(v => v !== 'hegemon').length;
      const details = [
        { label: 'Other Victories', current: Math.min(otherVictories, 6), target: 6 },
        { label: 'Prestige Level', current: Math.min(s.prestige?.level || 0, 1), target: 1 },
        { label: 'Achievements', current: Math.min((s.earnedAchievements || []).length, 15), target: 15 },
      ];
      const percent = details.reduce((sum, d) => sum + Math.min(1, d.current / d.target), 0) / details.length;
      return { percent, details };
    },
  },
];

export const VICTORY_MAP = new Map(VICTORY_CONDITIONS.map(v => [v.id, v]));

// ─── Runtime functions ──────────────────────────────────────────────────────

/** Check for newly earned victories. Returns array of newly won victory IDs. */
export function checkVictories(state: GameState, alreadyEarned: string[]): VictoryDefinition[] {
  const newlyWon: VictoryDefinition[] = [];
  for (const victory of VICTORY_CONDITIONS) {
    if (alreadyEarned.includes(victory.id)) continue;
    if (victory.check(state)) {
      newlyWon.push(victory);
    }
  }
  return newlyWon;
}

/** Aggregate permanent bonuses from all earned victories */
export function getVictoryBonuses(earnedVictoryIds: string[]): VictoryBonuses {
  const bonuses: VictoryBonuses = {
    revenueMultiplier: 1,
    buildSpeedMultiplier: 1,
    researchSpeedMultiplier: 1,
    miningMultiplier: 1,
  };
  for (const vid of earnedVictoryIds) {
    const def = VICTORY_MAP.get(vid);
    if (!def) continue;
    bonuses.revenueMultiplier *= def.reward.revenueMultiplier;
    bonuses.buildSpeedMultiplier *= def.reward.buildSpeedMultiplier;
    bonuses.researchSpeedMultiplier *= def.reward.researchSpeedMultiplier;
    bonuses.miningMultiplier *= def.reward.miningMultiplier;
  }
  return bonuses;
}

/** Get progress details for a specific victory */
export function getVictoryProgress(state: GameState, victoryId: string): VictoryProgress | null {
  const def = VICTORY_MAP.get(victoryId);
  if (!def) return null;
  return def.progress(state);
}
