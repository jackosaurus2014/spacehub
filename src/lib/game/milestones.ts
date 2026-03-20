// ─── Space Tycoon: Competitive Milestones ───────────────────────────────────
// "First to" achievements that can only be claimed once — by player OR NPC.
// Creates genuine competitive urgency.

import type { GameState } from './types';
import type { NPCCompanyState } from './npc-companies';

export interface CompetitiveMilestone {
  id: string;
  name: string;
  icon: string;
  description: string;
  reward: number; // Cash bonus
  checkPlayer: (state: GameState) => boolean;
  checkNPC: (npc: NPCCompanyState) => boolean;
}

export const MILESTONES: CompetitiveMilestone[] = [
  {
    id: 'first_orbit', name: 'First to Orbit', icon: '🛰️',
    description: 'First company to deploy a satellite in LEO.',
    reward: 10_000_000,
    checkPlayer: (s) => s.buildings.some(b => b.isComplete && b.locationId === 'leo'),
    checkNPC: (n) => n.unlockedLocations.includes('leo') && n.buildingCount >= 3,
  },
  {
    id: 'first_moon', name: 'First to the Moon', icon: '🌙',
    description: 'First company to establish operations on the Moon.',
    reward: 50_000_000,
    checkPlayer: (s) => s.unlockedLocations.includes('lunar_surface'),
    checkNPC: (n) => n.unlockedLocations.includes('lunar_surface'),
  },
  {
    id: 'first_mars', name: 'First to Mars', icon: '🔴',
    description: 'First company to reach Mars orbit.',
    reward: 200_000_000,
    checkPlayer: (s) => s.unlockedLocations.includes('mars_orbit'),
    checkNPC: (n) => n.unlockedLocations.includes('mars_orbit'),
  },
  {
    id: 'first_asteroid_mine', name: 'First Asteroid Miner', icon: '☄️',
    description: 'First company to mine the asteroid belt.',
    reward: 300_000_000,
    checkPlayer: (s) => s.buildings.some(b => b.isComplete && b.definitionId === 'mining_asteroid'),
    checkNPC: (n) => n.activeServiceIds.includes('svc_mining_asteroid'),
  },
  {
    id: 'first_billion', name: 'First Billionaire', icon: '💰',
    description: 'First company to accumulate $1B in cash.',
    reward: 100_000_000,
    checkPlayer: (s) => s.money >= 1_000_000_000,
    checkNPC: (n) => n.money >= 1_000_000_000,
  },
  {
    id: 'first_ten_research', name: 'First Tech Leader', icon: '🔬',
    description: 'First company to complete 10 research projects.',
    reward: 75_000_000,
    checkPlayer: (s) => s.completedResearch.length >= 10,
    checkNPC: (n) => n.completedResearch.length >= 10,
  },
  {
    id: 'first_outer_system', name: 'First to the Outer System', icon: '🌌',
    description: 'First company to reach Uranus and beyond.',
    reward: 1_000_000_000,
    checkPlayer: (s) => s.unlockedLocations.includes('outer_system'),
    checkNPC: (n) => n.unlockedLocations.includes('outer_system'),
  },
  {
    id: 'first_ten_services', name: 'First Service Giant', icon: '🏛️',
    description: 'First company to run 10+ active services.',
    reward: 150_000_000,
    checkPlayer: (s) => s.activeServices.length >= 10,
    checkNPC: (n) => n.activeServiceIds.length >= 10,
  },
  {
    id: 'first_jupiter', name: 'First to Jupiter', icon: '🪐',
    description: 'First company to reach the Jupiter system.',
    reward: 500_000_000,
    checkPlayer: (s) => s.unlockedLocations.includes('jupiter_system'),
    checkNPC: (n) => n.unlockedLocations.includes('jupiter_system'),
  },
  {
    id: 'first_trillion', name: 'First Trillionaire', icon: '👑',
    description: 'First company to accumulate $1T in cash.',
    reward: 5_000_000_000,
    checkPlayer: (s) => s.money >= 1_000_000_000_000,
    checkNPC: (n) => n.money >= 1_000_000_000_000,
  },
];

/**
 * Check all unclaimed milestones against player and NPC states.
 * Returns newly claimed milestones with the claimant name.
 */
export function checkMilestones(
  state: GameState,
  claimedMilestones: Record<string, string>,
): { id: string; claimedBy: string; isPlayer: boolean; reward: number }[] {
  const results: { id: string; claimedBy: string; isPlayer: boolean; reward: number }[] = [];

  for (const milestone of MILESTONES) {
    if (claimedMilestones[milestone.id]) continue; // Already claimed

    // Check player first (player gets priority on ties)
    if (milestone.checkPlayer(state)) {
      results.push({
        id: milestone.id,
        claimedBy: state.companyName || 'Your Company',
        isPlayer: true,
        reward: milestone.reward,
      });
      continue;
    }

    // Check NPCs
    for (const npc of (state.npcCompanies || [])) {
      if (milestone.checkNPC(npc)) {
        results.push({
          id: milestone.id,
          claimedBy: npc.name,
          isPlayer: false,
          reward: 0, // NPCs don't get cash rewards
        });
        break; // First NPC to qualify claims it
      }
    }
  }

  return results;
}
