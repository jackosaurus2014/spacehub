// ─── Space Tycoon: Contract/Mission System ──────────────────────────────────
// Rotating contracts give players short-term goals with cash + resource rewards.
// 3-5 contracts available at a time, refreshing every 12 game months.

import type { GameState, GameDate } from './types';
import { generateId } from './formulas';

export interface ContractRequirement {
  type: 'money_earned' | 'buildings_completed' | 'resources_mined' | 'services_active' | 'research_completed' | 'locations_unlocked';
  target: number;
  label: string;
}

export interface ContractReward {
  money?: number;
  resources?: Record<string, number>;
}

export interface ContractDefinition {
  id: string;
  name: string;
  icon: string;
  client: string; // flavor text — who's offering the contract
  description: string;
  tier: number;
  requirements: ContractRequirement[];
  reward: ContractReward;
  durationMonths: number;
}

export interface ContractInstance {
  definitionId: string;
  acceptedAt: GameDate;
  deadline: GameDate;
  status: 'active' | 'completed' | 'failed';
}

// ─── Contract Pool ──────────────────────────────────────────────────────────

export const CONTRACT_POOL: ContractDefinition[] = [
  // Tier 1 — Early game
  {
    id: 'c_first_launch', name: 'Launch Provider Contract', icon: '🚀', client: 'National Space Agency',
    description: 'Demonstrate launch capability by operating a launch pad.', tier: 1,
    requirements: [{ type: 'services_active', target: 2, label: '2 active services' }],
    reward: { money: 30_000_000 }, durationMonths: 12,
  },
  {
    id: 'c_satellite_net', name: 'Satellite Network Deployment', icon: '📡', client: 'Global Telecom Corp',
    description: 'Deploy a telecom satellite constellation.', tier: 1,
    requirements: [{ type: 'buildings_completed', target: 5, label: '5 completed buildings' }],
    reward: { money: 50_000_000 }, durationMonths: 18,
  },
  {
    id: 'c_research_push', name: 'Technology Development Grant', icon: '🔬', client: 'Space Research Foundation',
    description: 'Advance space technology by completing research.', tier: 1,
    requirements: [{ type: 'research_completed', target: 3, label: '3 completed research' }],
    reward: { money: 40_000_000, resources: { rare_earth: 10 } }, durationMonths: 24,
  },
  {
    id: 'c_revenue_target', name: 'Revenue Milestone', icon: '💰', client: 'Board of Directors',
    description: 'Prove the business model by earning revenue.', tier: 1,
    requirements: [{ type: 'money_earned', target: 100_000_000, label: '$100M total earned' }],
    reward: { money: 20_000_000 }, durationMonths: 24,
  },

  // Tier 2 — Mid game
  {
    id: 'c_lunar_ops', name: 'Lunar Operations Contract', icon: '🌙', client: 'Artemis Program Office',
    description: 'Establish a presence on the Moon.', tier: 2,
    requirements: [{ type: 'locations_unlocked', target: 4, label: '4 locations unlocked' }],
    reward: { money: 200_000_000, resources: { titanium: 50, rare_earth: 20 } }, durationMonths: 36,
  },
  {
    id: 'c_mining_output', name: 'Resource Supply Agreement', icon: '⛏️', client: 'Orbital Manufacturing Ltd',
    description: 'Produce resources through mining operations.', tier: 2,
    requirements: [
      { type: 'resources_mined', target: 500, label: '500 total resources mined' },
      { type: 'services_active', target: 5, label: '5 active services' },
    ],
    reward: { money: 150_000_000, resources: { platinum_group: 10 } }, durationMonths: 24,
  },
  {
    id: 'c_empire_builder', name: 'Infrastructure Expansion', icon: '🏗️', client: 'Space Development Bank',
    description: 'Build a substantial space infrastructure.', tier: 2,
    requirements: [{ type: 'buildings_completed', target: 15, label: '15 completed buildings' }],
    reward: { money: 300_000_000 }, durationMonths: 36,
  },

  // Tier 3 — Late game
  {
    id: 'c_mars_colony', name: 'Mars Colonization Initiative', icon: '🔴', client: 'United Nations Space Command',
    description: 'Establish operations on Mars.', tier: 3,
    requirements: [
      { type: 'locations_unlocked', target: 7, label: '7 locations unlocked' },
      { type: 'research_completed', target: 15, label: '15 research completed' },
    ],
    reward: { money: 1_000_000_000, resources: { exotic_materials: 5, helium3: 3 } }, durationMonths: 48,
  },
  {
    id: 'c_tech_leader', name: 'Technology Leadership Award', icon: '🏆', client: 'Space Industry Council',
    description: 'Become a technology leader through extensive research.', tier: 3,
    requirements: [{ type: 'research_completed', target: 25, label: '25 research completed' }],
    reward: { money: 500_000_000, resources: { platinum_group: 30, exotic_materials: 10 } }, durationMonths: 60,
  },
  {
    id: 'c_mega_corp', name: 'Megacorporation Status', icon: '🌟', client: 'Galactic Commerce Authority',
    description: 'Build a truly massive space enterprise.', tier: 3,
    requirements: [
      { type: 'buildings_completed', target: 30, label: '30 completed buildings' },
      { type: 'services_active', target: 10, label: '10 active services' },
    ],
    reward: { money: 2_000_000_000 }, durationMonths: 60,
  },
];

/** Get current progress for a requirement */
export function getRequirementProgress(state: GameState, req: ContractRequirement): number {
  switch (req.type) {
    case 'money_earned': return state.totalEarned;
    case 'buildings_completed': return state.buildings.filter(b => b.isComplete).length;
    case 'resources_mined': {
      let total = 0;
      for (const qty of Object.values(state.resources || {})) total += qty;
      return total;
    }
    case 'services_active': return state.activeServices.length;
    case 'research_completed': return state.completedResearch.length;
    case 'locations_unlocked': return state.unlockedLocations.length;
    default: return 0;
  }
}

/** Check if all requirements for a contract are met */
export function isContractComplete(state: GameState, contract: ContractDefinition): boolean {
  return contract.requirements.every(req => getRequirementProgress(state, req) >= req.target);
}

/** Generate available contracts based on player's current tier/progress */
export function generateContracts(state: GameState): ContractDefinition[] {
  const playerTier = Math.max(1, Math.floor(state.completedResearch.length / 5) + 1);
  const eligible = CONTRACT_POOL.filter(c => c.tier <= Math.min(playerTier, 3));

  // Pick 3-4 contracts, avoiding ones already completed
  const completedIds = (state.completedContracts || []);
  const available = eligible.filter(c => !completedIds.includes(c.id));

  // Shuffle and take up to 4
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

/** Apply contract reward to game state */
export function applyContractReward(state: GameState, contract: ContractDefinition): GameState {
  const newState = { ...state };
  if (contract.reward.money) {
    newState.money += contract.reward.money;
    newState.totalEarned += contract.reward.money;
  }
  if (contract.reward.resources) {
    const resources = { ...newState.resources };
    for (const [id, qty] of Object.entries(contract.reward.resources)) {
      resources[id] = (resources[id] || 0) + qty;
    }
    newState.resources = resources;
  }
  return newState;
}
