// ─── Space Tycoon: Legacy System ──────────────────────────────────────────────
// Permanent progression without resets. Players earn milestone bonuses through
// natural gameplay. Replaces the old prestige (reset-based) system.
// 40 fixed milestones across 4 tiers + 6 infinite stretch legacies.

import type { GameState } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LegacyBonusCategory =
  | 'revenue'
  | 'buildSpeed'
  | 'researchSpeed'
  | 'miningOutput'
  | 'costReduction'
  | 'crewCapacity';

export type LegacyTier = 1 | 2 | 3 | 4;
export type LegacyDisplayTier = 'Pioneer' | 'Colonist' | 'Admiral' | 'Architect' | 'Legend';

export interface LegacyMilestone {
  id: string;
  name: string;
  description: string;
  tier: LegacyTier;
  bonusCategory: LegacyBonusCategory;
  /** Percentage bonus (e.g. 3 = +3%) or flat slots for crewCapacity */
  bonusValue: number;
  check: (state: GameState) => boolean;
}

export interface StretchLegacy {
  id: string;
  name: string;
  description: string;
  bonusCategory: LegacyBonusCategory;
  /** Base percentage for the logarithmic formula */
  basePercent: number;
  /** Given level N, return the cumulative requirement */
  getRequirement: (level: number) => number;
  /** Get current progress value from state */
  getProgress: (state: GameState) => number;
}

export interface LegacyState {
  completedMilestones: string[];
  stretchLevels: Record<string, number>;
  trackers: {
    totalResourcesMined: number;
    totalContractsCompleted: number;
    totalShipsBuilt: number;
    totalBuildingsCompleted: number;
  };
  legacyPower: number;
  displayTier: LegacyDisplayTier;
}

export interface LegacyBonuses {
  revenueMultiplier: number;
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  miningMultiplier: number;
  costMultiplier: number;
  bonusCrewCapacity: number;
}

// ─── Default State ───────────────────────────────────────────────────────────

export const DEFAULT_LEGACY: LegacyState = {
  completedMilestones: [],
  stretchLevels: {},
  trackers: {
    totalResourcesMined: 0,
    totalContractsCompleted: 0,
    totalShipsBuilt: 0,
    totalBuildingsCompleted: 0,
  },
  legacyPower: 0,
  displayTier: 'Pioneer',
};

// ─── Helper: total workforce count ───────────────────────────────────────────

function totalWorkforce(wf: GameState['workforce']): number {
  if (!wf) return 0;
  return (wf.engineers || 0) + (wf.scientists || 0) + (wf.miners || 0) + (wf.operators || 0);
}

// ─── 40 Fixed Legacy Milestones ──────────────────────────────────────────────

export const LEGACY_MILESTONES: LegacyMilestone[] = [
  // ── Tier 1: Pioneer (10) ──────────────────────────────────────────────────
  {
    id: 'legacy_first_launch', name: 'First Launch', tier: 1,
    description: 'Your first satellite marks the dawn of an empire.',
    bonusCategory: 'revenue', bonusValue: 3,
    check: (s) => s.buildings.some(b => b.isComplete && b.locationId === 'leo'),
  },
  {
    id: 'legacy_orbit_trio', name: 'Orbital Trio', tier: 1,
    description: 'Assembly lines in zero-G run faster with experience.',
    bonusCategory: 'buildSpeed', bonusValue: 3,
    check: (s) => s.buildings.filter(b => b.isComplete && ['leo', 'geo', 'lunar_orbit', 'mars_orbit'].includes(b.locationId)).length >= 3,
  },
  {
    id: 'legacy_first_research', name: 'Knowledge Seeker', tier: 1,
    description: 'Your R&D labs develop institutional memory.',
    bonusCategory: 'researchSpeed', bonusValue: 3,
    check: (s) => s.completedResearch.length >= 5,
  },
  {
    id: 'legacy_first_billion', name: 'First Billion', tier: 1,
    description: 'Capital attracts capital.',
    bonusCategory: 'revenue', bonusValue: 3,
    check: (s) => s.totalEarned >= 1_000_000_000,
  },
  {
    id: 'legacy_geo_expansion', name: 'Geostationary Presence', tier: 1,
    description: 'Premium orbital slots pay premium dividends.',
    bonusCategory: 'revenue', bonusValue: 2,
    check: (s) => s.unlockedLocations.includes('geo'),
  },
  {
    id: 'legacy_five_services', name: 'Service Network', tier: 1,
    description: 'A diversified portfolio hedges against downturns.',
    bonusCategory: 'revenue', bonusValue: 3,
    check: (s) => s.activeServices.length >= 5,
  },
  {
    id: 'legacy_first_mine', name: 'Prospector', tier: 1,
    description: 'Strike the first vein, and more will follow.',
    bonusCategory: 'miningOutput', bonusValue: 5,
    check: (s) => (s.legacy?.trackers.totalResourcesMined || 0) >= 100,
  },
  {
    id: 'legacy_first_crew', name: 'Crew Commander', tier: 1,
    description: 'A skeleton crew is all you need to start.',
    bonusCategory: 'crewCapacity', bonusValue: 2,
    check: (s) => totalWorkforce(s.workforce) >= 3,
  },
  {
    id: 'legacy_ten_buildings', name: 'Builder', tier: 1,
    description: 'Each construction teaches the next.',
    bonusCategory: 'buildSpeed', bonusValue: 3,
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 10,
  },
  {
    id: 'legacy_first_contract', name: 'Contractor', tier: 1,
    description: 'Government contracts offset overhead.',
    bonusCategory: 'costReduction', bonusValue: 2,
    check: (s) => (s.completedContracts?.length || 0) >= 3,
  },

  // ── Tier 2: Colonist (10) ─────────────────────────────────────────────────
  {
    id: 'legacy_lunar_ops', name: 'Lunar Operations', tier: 2,
    description: 'Lunar regolith hides valuable resources.',
    bonusCategory: 'miningOutput', bonusValue: 5,
    check: (s) => s.buildings.filter(b => b.isComplete && b.locationId === 'lunar_surface').length >= 3,
  },
  {
    id: 'legacy_twenty_research', name: 'Research Director', tier: 2,
    description: 'Your scientists stand on the shoulders of giants.',
    bonusCategory: 'researchSpeed', bonusValue: 5,
    check: (s) => s.completedResearch.length >= 20,
  },
  {
    id: 'legacy_ten_billion', name: 'Ten Billion', tier: 2,
    description: 'Your brand name alone opens doors.',
    bonusCategory: 'revenue', bonusValue: 4,
    check: (s) => s.totalEarned >= 10_000_000_000,
  },
  {
    id: 'legacy_mars_footprint', name: 'Martian Footprint', tier: 2,
    description: 'Interplanetary construction expertise.',
    bonusCategory: 'buildSpeed', bonusValue: 4,
    check: (s) => s.unlockedLocations.includes('mars_surface'),
  },
  {
    id: 'legacy_fleet_commander', name: 'Fleet Commander', tier: 2,
    description: 'Bulk purchasing brings fleet discounts.',
    bonusCategory: 'costReduction', bonusValue: 3,
    check: (s) => (s.ships?.filter(sh => sh.isBuilt).length || 0) >= 5,
  },
  {
    id: 'legacy_resource_baron', name: 'Resource Baron', tier: 2,
    description: 'Diversified mining operations compound yields.',
    bonusCategory: 'miningOutput', bonusValue: 5,
    check: (s) => Object.values(s.resources || {}).filter(q => q >= 500).length >= 3,
  },
  {
    id: 'legacy_twenty_buildings', name: 'Mega Developer', tier: 2,
    description: 'Prefab modules cut construction time.',
    bonusCategory: 'buildSpeed', bonusValue: 4,
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 25,
  },
  {
    id: 'legacy_ten_services', name: 'Service Conglomerate', tier: 2,
    description: 'Network effects amplify every new service.',
    bonusCategory: 'revenue', bonusValue: 4,
    check: (s) => s.activeServices.length >= 10,
  },
  {
    id: 'legacy_asteroid_ops', name: 'Belt Operator', tier: 2,
    description: 'Asteroid mining is the backbone of expansion.',
    bonusCategory: 'miningOutput', bonusValue: 6,
    check: (s) => s.buildings.some(b => b.isComplete && b.locationId === 'asteroid_belt'),
  },
  {
    id: 'legacy_full_crew', name: 'Full Complement', tier: 2,
    description: 'A trained crew is your greatest asset.',
    bonusCategory: 'crewCapacity', bonusValue: 3,
    check: (s) => totalWorkforce(s.workforce) >= 10,
  },

  // ── Tier 3: Admiral (10) ──────────────────────────────────────────────────
  {
    id: 'legacy_hundred_billion', name: 'Hundred Billion', tier: 3,
    description: 'At this scale, money generates money.',
    bonusCategory: 'revenue', bonusValue: 5,
    check: (s) => s.totalEarned >= 100_000_000_000,
  },
  {
    id: 'legacy_jupiter_reach', name: 'Jovian Reach', tier: 3,
    description: "Jupiter's radiation labs accelerate breakthroughs.",
    bonusCategory: 'researchSpeed', bonusValue: 5,
    check: (s) => s.unlockedLocations.includes('jupiter_system'),
  },
  {
    id: 'legacy_forty_research', name: 'Chief Scientist', tier: 3,
    description: 'Your research department runs itself.',
    bonusCategory: 'researchSpeed', bonusValue: 5,
    check: (s) => s.completedResearch.length >= 40,
  },
  {
    id: 'legacy_fifty_buildings', name: 'Infrastructure Titan', tier: 3,
    description: 'Autonomous construction drones online.',
    bonusCategory: 'buildSpeed', bonusValue: 5,
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 50,
  },
  {
    id: 'legacy_fleet_admiral', name: 'Fleet Admiral', tier: 3,
    description: 'A massive fleet commands supplier discounts.',
    bonusCategory: 'costReduction', bonusValue: 4,
    check: (s) => (s.ships?.filter(sh => sh.isBuilt).length || 0) >= 10,
  },
  {
    id: 'legacy_resource_magnate', name: 'Resource Magnate', tier: 3,
    description: 'Vertical integration maximizes extraction.',
    bonusCategory: 'miningOutput', bonusValue: 7,
    check: (s) => Object.values(s.resources || {}).filter(q => q >= 1000).length >= 5,
  },
  {
    id: 'legacy_saturn_frontier', name: 'Saturn Frontier', tier: 3,
    description: "Titan's hydrocarbons fuel a new economy.",
    bonusCategory: 'revenue', bonusValue: 5,
    check: (s) => s.unlockedLocations.includes('saturn_system'),
  },
  {
    id: 'legacy_twenty_services', name: 'Service Titan', tier: 3,
    description: "Your services are the solar system's backbone.",
    bonusCategory: 'revenue', bonusValue: 5,
    check: (s) => s.activeServices.length >= 20,
  },
  {
    id: 'legacy_trillion', name: 'Trillionaire', tier: 3,
    description: 'At trillion-dollar scale, nothing is expensive.',
    bonusCategory: 'costReduction', bonusValue: 5,
    check: (s) => s.totalEarned >= 1_000_000_000_000,
  },
  {
    id: 'legacy_master_crew', name: 'Master Crew', tier: 3,
    description: 'Your crew trains the next generation.',
    bonusCategory: 'crewCapacity', bonusValue: 4,
    check: (s) => totalWorkforce(s.workforce) >= 20,
  },

  // ── Tier 4: Architect (10) ────────────────────────────────────────────────
  {
    id: 'legacy_outer_system', name: 'Outer Reach', tier: 4,
    description: 'The frontier pushes science forward.',
    bonusCategory: 'researchSpeed', bonusValue: 6,
    check: (s) => s.unlockedLocations.includes('outer_system'),
  },
  {
    id: 'legacy_all_locations', name: 'Solar Cartographer', tier: 4,
    description: 'Your network spans the solar system.',
    bonusCategory: 'revenue', bonusValue: 6,
    check: (s) => s.unlockedLocations.length >= 11,
  },
  {
    id: 'legacy_sixty_research', name: 'Polymath', tier: 4,
    description: 'Cross-discipline synergies emerge.',
    bonusCategory: 'researchSpeed', bonusValue: 6,
    check: (s) => s.completedResearch.length >= 60,
  },
  {
    id: 'legacy_hundred_buildings', name: 'Megastructure', tier: 4,
    description: 'Self-replicating construction swarms.',
    bonusCategory: 'buildSpeed', bonusValue: 6,
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 100,
  },
  {
    id: 'legacy_ten_trillion', name: 'Ten Trillionaire', tier: 4,
    description: "Your empire's GDP rivals nations.",
    bonusCategory: 'revenue', bonusValue: 6,
    check: (s) => s.totalEarned >= 10_000_000_000_000,
  },
  {
    id: 'legacy_resource_emperor', name: 'Resource Emperor', tier: 4,
    description: 'Every asteroid is a gold mine.',
    bonusCategory: 'miningOutput', bonusValue: 8,
    check: (s) => Object.values(s.resources || {}).filter(q => q >= 5000).length >= 7,
  },
  {
    id: 'legacy_fleet_sovereign', name: 'Fleet Sovereign', tier: 4,
    description: 'Your armada builds its own replacements.',
    bonusCategory: 'costReduction', bonusValue: 5,
    check: (s) => (s.ships?.filter(sh => sh.isBuilt).length || 0) >= 20,
  },
  {
    id: 'legacy_all_base_research', name: 'Omniscient', tier: 4,
    description: 'There are no more unknowns -- only applications.',
    bonusCategory: 'researchSpeed', bonusValue: 8,
    check: (s) => s.completedResearch.length >= 37,
  },
  {
    id: 'legacy_thirty_services', name: 'Galactic Provider', tier: 4,
    description: 'Your services are synonymous with civilization.',
    bonusCategory: 'revenue', bonusValue: 7,
    check: (s) => s.activeServices.length >= 30,
  },
  {
    id: 'legacy_endgame_crew', name: 'Legion', tier: 4,
    description: 'Your workforce is a civilization unto itself.',
    bonusCategory: 'crewCapacity', bonusValue: 5,
    check: (s) => totalWorkforce(s.workforce) >= 30,
  },
];

/** Fast lookup map: milestoneId -> definition */
export const LEGACY_MILESTONE_MAP = new Map(LEGACY_MILESTONES.map(m => [m.id, m]));

// ─── 6 Infinite Stretch Legacies ─────────────────────────────────────────────

export const STRETCH_LEGACIES: StretchLegacy[] = [
  {
    id: 'stretch_revenue', name: 'Revenue Dynasty',
    description: 'Each era of earnings compounds your legacy.',
    bonusCategory: 'revenue', basePercent: 5,
    getRequirement: (n) => 10_000_000_000 * Math.pow(5, n), // $10B * 5^N
    getProgress: (s) => s.totalEarned,
  },
  {
    id: 'stretch_buildings', name: 'Construction Dynasty',
    description: 'Your methods become industry standards.',
    bonusCategory: 'buildSpeed', basePercent: 4,
    getRequirement: (n) => 25 * n, // 25 * N additional buildings
    getProgress: (s) => s.legacy?.trackers.totalBuildingsCompleted || s.buildings.filter(b => b.isComplete).length,
  },
  {
    id: 'stretch_research', name: 'Knowledge Dynasty',
    description: 'Institutional knowledge accelerates discovery.',
    bonusCategory: 'researchSpeed', basePercent: 4,
    getRequirement: (n) => 15 * n, // 15 * N additional research
    getProgress: (s) => s.completedResearch.length,
  },
  {
    id: 'stretch_mining', name: 'Mining Dynasty',
    description: 'Every mine teaches the next.',
    bonusCategory: 'miningOutput', basePercent: 5,
    getRequirement: (n) => 5000 * n, // 5000 * N total mined
    getProgress: (s) => s.legacy?.trackers.totalResourcesMined || 0,
  },
  {
    id: 'stretch_contracts', name: 'Contract Dynasty',
    description: 'Your negotiators get better with practice.',
    bonusCategory: 'costReduction', basePercent: 3,
    getRequirement: (n) => 10 * n, // 10 * N additional contracts
    getProgress: (s) => s.legacy?.trackers.totalContractsCompleted || (s.completedContracts?.length || 0),
  },
  {
    id: 'stretch_fleet', name: 'Fleet Dynasty',
    description: 'Fleet expansion demands more crew.',
    bonusCategory: 'crewCapacity', basePercent: 2,
    getRequirement: (n) => 10 * n, // 10 * N total ship builds
    getProgress: (s) => s.legacy?.trackers.totalShipsBuilt || (s.ships?.filter(sh => sh.isBuilt).length || 0),
  },
];

export const STRETCH_LEGACY_MAP = new Map(STRETCH_LEGACIES.map(s => [s.id, s]));

// ─── Soft Cap Values ─────────────────────────────────────────────────────────

const CATEGORY_CAPS: Record<LegacyBonusCategory, number> = {
  revenue: 5.0,        // Max 500% -> ~6x multiplier
  buildSpeed: 2.0,     // Max 200% -> 3x faster
  researchSpeed: 2.0,  // Max 200% -> 3x faster
  miningOutput: 3.0,   // Max 300% -> 4x mining
  costReduction: 0.6,  // Max 60% off
  crewCapacity: 30,    // Max +30 slots (hard cap)
};

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Check which legacy milestones are newly earned.
 * Returns IDs of milestones just completed (not already in state.legacy.completedMilestones).
 */
export function checkLegacyMilestones(state: GameState): string[] {
  const earned = state.legacy?.completedMilestones || [];
  const newlyEarned: string[] = [];

  for (const milestone of LEGACY_MILESTONES) {
    if (earned.includes(milestone.id)) continue;
    try {
      if (milestone.check(state)) {
        newlyEarned.push(milestone.id);
      }
    } catch {
      // Skip broken checks silently
    }
  }

  return newlyEarned;
}

/**
 * Check stretch legacy levels. Returns updated levels for any that advanced.
 * Only returns entries where the new level is higher than the current level.
 */
export function checkStretchProgress(state: GameState): Record<string, number> {
  const currentLevels = state.legacy?.stretchLevels || {};
  const updated: Record<string, number> = {};

  for (const stretch of STRETCH_LEGACIES) {
    const currentLevel = currentLevels[stretch.id] || 0;
    const progress = stretch.getProgress(state);

    // Check if we've reached the next level
    let newLevel = currentLevel;
    // Check multiple levels at once (in case of big jumps)
    while (progress >= stretch.getRequirement(newLevel + 1)) {
      newLevel++;
      // Safety cap to prevent infinite loop on weird data
      if (newLevel > 1000) break;
    }

    if (newLevel > currentLevel) {
      updated[stretch.id] = newLevel;
    }
  }

  return updated;
}

/**
 * Compute the effective bonus for a single category from all legacy sources.
 * Applies the soft cap formula: effective = cap * (1 - e^(-raw / cap))
 */
function getCategoryBonus(
  category: LegacyBonusCategory,
  completedMilestones: string[],
  stretchLevels: Record<string, number>,
): number {
  // 1. Sum all fixed milestone bonuses for this category
  let rawTotal = 0;
  for (const milestoneId of completedMilestones) {
    const def = LEGACY_MILESTONE_MAP.get(milestoneId);
    if (def && def.bonusCategory === category) {
      rawTotal += def.bonusValue;
    }
  }

  // 2. Sum all stretch legacy bonuses for this category
  for (const stretch of STRETCH_LEGACIES) {
    if (stretch.bonusCategory !== category) continue;
    const level = stretchLevels[stretch.id] || 0;
    for (let n = 1; n <= level; n++) {
      rawTotal += stretch.basePercent * Math.log(1 + n * 0.5);
    }
  }

  if (rawTotal <= 0) return 0;

  // 3. Apply soft cap for crewCapacity (hard cap, no exponential decay)
  if (category === 'crewCapacity') {
    return Math.min(rawTotal, CATEGORY_CAPS.crewCapacity);
  }

  // 4. Apply soft cap via convergent function for percentage categories
  const cap = CATEGORY_CAPS[category];
  const rawFraction = rawTotal / 100; // Convert percentage to fraction
  const effective = cap * (1 - Math.exp(-rawFraction / cap));
  return effective;
}

/**
 * Get all legacy bonuses as multipliers ready for the game engine.
 */
export function getLegacyBonuses(legacy: LegacyState): LegacyBonuses {
  const { completedMilestones, stretchLevels } = legacy;

  const revBonus = getCategoryBonus('revenue', completedMilestones, stretchLevels);
  const buildBonus = getCategoryBonus('buildSpeed', completedMilestones, stretchLevels);
  const researchBonus = getCategoryBonus('researchSpeed', completedMilestones, stretchLevels);
  const miningBonus = getCategoryBonus('miningOutput', completedMilestones, stretchLevels);
  const costBonus = getCategoryBonus('costReduction', completedMilestones, stretchLevels);
  const crewBonus = getCategoryBonus('crewCapacity', completedMilestones, stretchLevels);

  return {
    revenueMultiplier: 1 + revBonus,
    buildSpeedMultiplier: 1 + buildBonus,
    researchSpeedMultiplier: 1 + researchBonus,
    miningMultiplier: 1 + miningBonus,
    costMultiplier: 1 - costBonus,         // Cost reduction: 0.19 -> 0.81x costs
    bonusCrewCapacity: Math.floor(crewBonus),
  };
}

/**
 * Calculate the Legacy Power score (cosmetic/leaderboard).
 * Tier 1 = 10 LP each, Tier 2 = 25, Tier 3 = 50, Tier 4 = 100.
 * Stretch levels = 15 LP each.
 */
export function getLegacyPower(legacy: LegacyState): number {
  const tierPoints: Record<number, number> = { 1: 10, 2: 25, 3: 50, 4: 100 };
  let power = 0;

  for (const id of legacy.completedMilestones) {
    const def = LEGACY_MILESTONE_MAP.get(id);
    if (def) power += tierPoints[def.tier] || 10;
  }

  for (const level of Object.values(legacy.stretchLevels)) {
    power += level * 15;
  }

  return power;
}

/**
 * Determine the display tier based on highest earned milestones.
 */
export function getLegacyDisplayTier(legacy: LegacyState): LegacyDisplayTier {
  const completed = legacy.completedMilestones;
  const t4Count = completed.filter(id => LEGACY_MILESTONE_MAP.get(id)?.tier === 4).length;
  const t3Count = completed.filter(id => LEGACY_MILESTONE_MAP.get(id)?.tier === 3).length;
  const t2Count = completed.filter(id => LEGACY_MILESTONE_MAP.get(id)?.tier === 2).length;
  const totalStretch = Object.values(legacy.stretchLevels).reduce((a, b) => a + b, 0);

  if (totalStretch >= 50 && t4Count >= 10) return 'Legend';
  if (t4Count >= 5) return 'Architect';
  if (t3Count >= 5) return 'Admiral';
  if (t2Count >= 5) return 'Colonist';
  return 'Pioneer';
}
