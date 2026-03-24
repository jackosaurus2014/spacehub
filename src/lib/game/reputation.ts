// ─── Space Tycoon: Reputation System ────────────────────────────────────────
// Global score from all positive actions. Higher reputation unlocks threshold
// bonuses that compound with other multipliers. Reputation never decreases.

import type { GameState } from './types';

// ─── Point Values ───────────────────────────────────────────────────────────

export const REPUTATION_POINTS = {
  // Building completion (by tier)
  building_tier_1: 100,
  building_tier_2: 250,
  building_tier_3: 500,
  building_tier_4: 1000,
  building_tier_5: 2500,

  // Research completion (by tier)
  research_tier_1: 75,
  research_tier_2: 200,
  research_tier_3: 500,
  research_tier_4: 1000,
  research_tier_5: 2000,

  // Contracts
  contract_complete: 300,

  // Megastructure phases
  megastructure_phase: 1500,
  megastructure_complete: 5000,

  // Locations
  location_unlock: 200,

  // Ships
  ship_built: 150,
  survey_complete: 250,

  // Milestones
  milestone_claimed: 1000,

  // Achievements
  achievement_earned: 500,
} as const;

export type ReputationSource = keyof typeof REPUTATION_POINTS;

// ─── Threshold Bonuses ──────────────────────────────────────────────────────

export interface ReputationThreshold {
  points: number;
  title: string;
  bonuses: ReputationBonuses;
  description: string;
}

export interface ReputationBonuses {
  revenueMultiplier: number;       // 1.0 = no bonus
  maintenanceMultiplier: number;   // 1.0 = no bonus (lower is better)
  researchSpeedMultiplier: number; // 1.0 = no bonus
  miningMultiplier: number;        // 1.0 = no bonus
  contractRewardMultiplier: number; // 1.0 = no bonus
  buildSpeedMultiplier: number;    // 1.0 = no bonus
}

const EMPTY_BONUSES: ReputationBonuses = {
  revenueMultiplier: 1.0,
  maintenanceMultiplier: 1.0,
  researchSpeedMultiplier: 1.0,
  miningMultiplier: 1.0,
  contractRewardMultiplier: 1.0,
  buildSpeedMultiplier: 1.0,
};

export const REPUTATION_THRESHOLDS: ReputationThreshold[] = [
  {
    points: 1_000,
    title: 'Aspiring Operator',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.02, contractRewardMultiplier: 1.05 },
    description: '+2% revenue, +5% contract rewards',
  },
  {
    points: 5_000,
    title: 'Established Contractor',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.05, maintenanceMultiplier: 0.97, contractRewardMultiplier: 1.10 },
    description: '+5% revenue, -3% maintenance, +10% contract rewards',
  },
  {
    points: 10_000,
    title: 'Respected Industrialist',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.08, maintenanceMultiplier: 0.95, researchSpeedMultiplier: 1.05, contractRewardMultiplier: 1.15 },
    description: '+8% revenue, -5% maintenance, +5% research speed, +15% contract rewards',
  },
  {
    points: 25_000,
    title: 'Space Baron',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.12, maintenanceMultiplier: 0.92, researchSpeedMultiplier: 1.10, miningMultiplier: 1.05, contractRewardMultiplier: 1.20 },
    description: '+12% revenue, -8% maintenance, +10% research, +5% mining, +20% contract rewards',
  },
  {
    points: 50_000,
    title: 'Orbital Magnate',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.16, maintenanceMultiplier: 0.88, researchSpeedMultiplier: 1.15, miningMultiplier: 1.10, contractRewardMultiplier: 1.25, buildSpeedMultiplier: 1.05 },
    description: '+16% revenue, -12% maintenance, +15% research, +10% mining, +25% contracts, +5% build speed',
  },
  {
    points: 100_000,
    title: 'Solar System Tycoon',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.20, maintenanceMultiplier: 0.85, researchSpeedMultiplier: 1.20, miningMultiplier: 1.15, contractRewardMultiplier: 1.30, buildSpeedMultiplier: 1.10 },
    description: '+20% revenue, -15% maintenance, +20% research, +15% mining, +30% contracts, +10% build speed',
  },
  {
    points: 250_000,
    title: 'Galactic Pioneer',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.25, maintenanceMultiplier: 0.80, researchSpeedMultiplier: 1.25, miningMultiplier: 1.20, contractRewardMultiplier: 1.40, buildSpeedMultiplier: 1.15 },
    description: '+25% revenue, -20% maintenance, +25% research, +20% mining, +40% contracts, +15% build speed',
  },
  {
    points: 500_000,
    title: 'Interstellar Visionary',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.30, maintenanceMultiplier: 0.75, researchSpeedMultiplier: 1.30, miningMultiplier: 1.25, contractRewardMultiplier: 1.50, buildSpeedMultiplier: 1.20 },
    description: '+30% revenue, -25% maintenance, +30% research, +25% mining, +50% contracts, +20% build speed',
  },
  {
    points: 1_000_000,
    title: 'Cosmic Ascendant',
    bonuses: { ...EMPTY_BONUSES, revenueMultiplier: 1.40, maintenanceMultiplier: 0.70, researchSpeedMultiplier: 1.40, miningMultiplier: 1.30, contractRewardMultiplier: 1.60, buildSpeedMultiplier: 1.25 },
    description: '+40% revenue, -30% maintenance, +40% research, +30% mining, +60% contracts, +25% build speed',
  },
];

// ─── Functions ──────────────────────────────────────────────────────────────

/** Add reputation points to the game state */
export function addReputation(state: GameState, source: ReputationSource): GameState {
  const points = REPUTATION_POINTS[source];
  if (!points) return state;

  const currentRep = state.reputation || 0;
  const newRep = currentRep + points;

  return {
    ...state,
    reputation: newRep,
  };
}

/** Add a custom number of reputation points */
export function addReputationPoints(state: GameState, points: number): GameState {
  if (points <= 0) return state;
  const currentRep = state.reputation || 0;
  return {
    ...state,
    reputation: currentRep + points,
  };
}

/** Get the current reputation bonuses for the given reputation score */
export function getReputationBonuses(reputation: number): ReputationBonuses {
  let best = { ...EMPTY_BONUSES };

  for (const threshold of REPUTATION_THRESHOLDS) {
    if (reputation >= threshold.points) {
      best = { ...threshold.bonuses };
    } else {
      break; // Thresholds are sorted ascending
    }
  }

  return best;
}

/** Get the title string for the given reputation score */
export function getReputationTitle(reputation: number): string {
  let title = 'Newcomer';

  for (const threshold of REPUTATION_THRESHOLDS) {
    if (reputation >= threshold.points) {
      title = threshold.title;
    } else {
      break;
    }
  }

  return title;
}

/** Get the current threshold and progress to next */
export function getReputationProgress(reputation: number): {
  currentThreshold: ReputationThreshold | null;
  nextThreshold: ReputationThreshold | null;
  progressToNext: number; // 0-1
} {
  let current: ReputationThreshold | null = null;
  let next: ReputationThreshold | null = null;

  for (let i = 0; i < REPUTATION_THRESHOLDS.length; i++) {
    if (reputation >= REPUTATION_THRESHOLDS[i].points) {
      current = REPUTATION_THRESHOLDS[i];
      next = REPUTATION_THRESHOLDS[i + 1] || null;
    } else {
      if (!current) next = REPUTATION_THRESHOLDS[i];
      break;
    }
  }

  let progressToNext = 0;
  if (next) {
    const base = current ? current.points : 0;
    progressToNext = (reputation - base) / (next.points - base);
  } else if (current) {
    progressToNext = 1; // Max threshold reached
  }

  return { currentThreshold: current, nextThreshold: next, progressToNext: Math.min(1, Math.max(0, progressToNext)) };
}
