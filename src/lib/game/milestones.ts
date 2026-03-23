// ─── Space Tycoon: Progression Milestones ────────────────────────────────────
// Time-based milestones that reward players for reaching goals within a target
// number of real-world days since their account was created.
// Every player can earn every milestone — no "first to" exclusivity.
// Deadlines are calibrated for a semi-active player (5-6 check-ins/day).

import type { GameState } from './types';

export interface ProgressionMilestone {
  id: string;
  name: string;
  icon: string;
  description: string;
  reward: number;
  /** Real-world days from account creation to complete this milestone */
  targetDays: number;
  /** Check if the player has met the milestone condition */
  check: (state: GameState) => boolean;
}

export const MILESTONES: ProgressionMilestone[] = [
  {
    id: 'milestone_first_orbit',
    name: 'Orbital Operations',
    icon: '🛰️',
    description: 'Deploy a satellite or station in LEO within 1 day.',
    reward: 50_000_000,
    targetDays: 1,
    check: (s) => s.buildings.some(b => b.isComplete && b.locationId === 'leo'),
  },
  {
    id: 'milestone_ten_research',
    name: 'Tech Pioneer',
    icon: '🔬',
    description: 'Complete 10 research projects within 5 days.',
    reward: 200_000_000,
    targetDays: 5,
    check: (s) => s.completedResearch.length >= 10,
  },
  {
    id: 'milestone_first_billion',
    name: 'Billionaire',
    icon: '💰',
    description: 'Accumulate $1B in cash within 5 days.',
    reward: 200_000_000,
    targetDays: 5,
    check: (s) => s.money >= 1_000_000_000,
  },
  {
    id: 'milestone_moon',
    name: 'Lunar Pioneer',
    icon: '🌙',
    description: 'Establish operations on the Lunar Surface within 3 days.',
    reward: 150_000_000,
    targetDays: 3,
    check: (s) => s.unlockedLocations.includes('lunar_surface'),
  },
  {
    id: 'milestone_ten_services',
    name: 'Service Empire',
    icon: '🏛️',
    description: 'Run 10+ active services within 7 days.',
    reward: 400_000_000,
    targetDays: 7,
    check: (s) => s.activeServices.length >= 10,
  },
  {
    id: 'milestone_mars',
    name: 'Mars Explorer',
    icon: '🔴',
    description: 'Reach Mars orbit within 7 days.',
    reward: 500_000_000,
    targetDays: 7,
    check: (s) => s.unlockedLocations.includes('mars_orbit'),
  },
  {
    id: 'milestone_asteroid_mine',
    name: 'Asteroid Miner',
    icon: '☄️',
    description: 'Mine the asteroid belt within 10 days.',
    reward: 800_000_000,
    targetDays: 10,
    check: (s) => s.buildings.some(b => b.isComplete && b.definitionId === 'mining_asteroid'),
  },
  {
    id: 'milestone_jupiter',
    name: 'Jovian Expedition',
    icon: '🪐',
    description: 'Reach the Jupiter system within 21 days.',
    reward: 500_000_000,
    targetDays: 21,
    check: (s) => s.unlockedLocations.includes('jupiter_system'),
  },
  {
    id: 'milestone_trillion',
    name: 'Trillionaire',
    icon: '👑',
    description: 'Accumulate $1T in cash within 30 days.',
    reward: 5_000_000_000,
    targetDays: 30,
    check: (s) => s.money >= 1_000_000_000_000,
  },
  {
    id: 'milestone_outer_system',
    name: 'Outer System Pioneer',
    icon: '🌌',
    description: 'Reach the Outer System within 45 days.',
    reward: 1_000_000_000,
    targetDays: 45,
    check: (s) => s.unlockedLocations.includes('outer_system'),
  },
];

/**
 * Check all milestones against player state and account age.
 * Returns newly completed milestones (those completed within the target time).
 * Milestones can still be completed after the deadline — they just don't
 * get the bonus reward.
 */
export function checkMilestones(
  state: GameState,
  claimedMilestones: Record<string, string>,
): { id: string; claimedBy: string; isPlayer: boolean; reward: number }[] {
  const results: { id: string; claimedBy: string; isPlayer: boolean; reward: number }[] = [];

  const accountAgeMs = Date.now() - (state.createdAt || Date.now());
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

  for (const milestone of MILESTONES) {
    if (claimedMilestones[milestone.id]) continue;

    if (milestone.check(state)) {
      const withinDeadline = accountAgeDays <= milestone.targetDays;
      results.push({
        id: milestone.id,
        claimedBy: state.companyName || 'Your Company',
        isPlayer: true,
        reward: withinDeadline ? milestone.reward : Math.round(milestone.reward * 0.25), // 25% reward if late
      });
    }
  }

  return results;
}
