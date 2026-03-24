// ─── Space Tycoon: Contract System ───────────────────────────────────────────
// Contracts are missions from government and commercial clients.
// Each contract has requirements that logically match its description.

import type { GameState, GameDate } from './types';

export interface ContractRequirement {
  type: 'money_earned' | 'buildings_completed' | 'resources_mined' | 'services_active'
    | 'research_completed' | 'locations_unlocked' | 'satellites_deployed' | 'ships_built'
    | 'mining_services_active' | 'stations_built' | 'colonies_established';
  target: number;
  label: string;
}

export interface ContractReward {
  money: number;
  resources?: Record<string, number>;
}

export interface ContractDefinition {
  id: string;
  name: string;
  icon: string;
  client: string;
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
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1 — Early Game (accessible immediately)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'c_first_launch', name: 'Launch Provider Certification', icon: '🚀', client: 'National Space Agency',
    description: 'Demonstrate launch capability by operating at least one launch pad with active launch services.',
    tier: 1,
    requirements: [
      { type: 'services_active', target: 2, label: '2 active services (including launch)' },
    ],
    reward: { money: 60_000_000 }, durationMonths: 12,
  },
  {
    id: 'c_satellite_net', name: 'Satellite Network Deployment', icon: '📡', client: 'Global Telecom Corp',
    description: 'Deploy a constellation of at least 5 telecom or sensor satellites in orbit.',
    tier: 1,
    requirements: [
      { type: 'satellites_deployed', target: 5, label: '5 satellites deployed (telecom or sensor)' },
    ],
    reward: { money: 100_000_000 }, durationMonths: 18,
  },
  {
    id: 'c_research_push', name: 'Technology Development Grant', icon: '🔬', client: 'Space Research Foundation',
    description: 'Complete 3 research projects to demonstrate R&D capability.',
    tier: 1,
    requirements: [
      { type: 'research_completed', target: 3, label: '3 research projects completed' },
    ],
    reward: { money: 80_000_000, resources: { rare_earth: 15 } }, durationMonths: 24,
  },
  {
    id: 'c_revenue_target', name: 'Revenue Milestone', icon: '💰', client: 'Board of Directors',
    description: 'Prove the business model by generating $100M in total revenue from space services.',
    tier: 1,
    requirements: [
      { type: 'money_earned', target: 100_000_000, label: '$100M total revenue earned' },
    ],
    reward: { money: 50_000_000 }, durationMonths: 24,
  },
  {
    id: 'c_ground_network', name: 'Ground Station Network', icon: '📡', client: 'Department of Defense',
    description: 'Build and operate a network of ground tracking stations and a mission control center.',
    tier: 1,
    requirements: [
      { type: 'buildings_completed', target: 3, label: '3 ground facilities completed' },
      { type: 'services_active', target: 3, label: '3 active services' },
    ],
    reward: { money: 70_000_000 }, durationMonths: 18,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2 — Mid Game (requires some expansion)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'c_lunar_ops', name: 'Lunar Operations Contract', icon: '🌙', client: 'Artemis Program Office',
    description: 'Establish operations on or around the Moon, including surface or orbital facilities.',
    tier: 2,
    requirements: [
      { type: 'locations_unlocked', target: 4, label: '4 locations unlocked (including lunar)' },
      { type: 'buildings_completed', target: 8, label: '8 completed buildings' },
    ],
    reward: { money: 200_000_000, resources: { titanium: 50, rare_earth: 20 } }, durationMonths: 36,
  },
  {
    id: 'c_mining_output', name: 'Resource Supply Agreement', icon: '⛏️', client: 'Orbital Manufacturing Ltd',
    description: 'Establish mining operations and accumulate at least 500 units of mined resources.',
    tier: 2,
    requirements: [
      { type: 'resources_mined', target: 500, label: '500 total resources in inventory' },
      { type: 'mining_services_active', target: 1, label: '1 active mining service' },
    ],
    reward: { money: 150_000_000, resources: { platinum_group: 10 } }, durationMonths: 24,
  },
  {
    id: 'c_empire_builder', name: 'Infrastructure Expansion', icon: '🏗️', client: 'Space Development Bank',
    description: 'Build a substantial space infrastructure with at least 15 operational facilities.',
    tier: 2,
    requirements: [
      { type: 'buildings_completed', target: 15, label: '15 completed buildings' },
    ],
    reward: { money: 300_000_000 }, durationMonths: 36,
  },
  {
    id: 'c_station_ops', name: 'Space Station Operations', icon: '🛰️', client: 'International Space Consortium',
    description: 'Build and operate at least 2 space stations with crew support services.',
    tier: 2,
    requirements: [
      { type: 'stations_built', target: 2, label: '2 space stations completed' },
      { type: 'services_active', target: 6, label: '6 active services' },
    ],
    reward: { money: 250_000_000, resources: { aluminum: 80 } }, durationMonths: 30,
  },
  {
    id: 'c_fleet_buildup', name: 'Fleet Expansion Contract', icon: '🚢', client: 'Space Logistics Corp',
    description: 'Build a fleet of at least 5 ships for cargo and mining operations.',
    tier: 2,
    requirements: [
      { type: 'ships_built', target: 5, label: '5 ships built and operational' },
    ],
    reward: { money: 180_000_000, resources: { iron: 200, aluminum: 100 } }, durationMonths: 24,
  },
  {
    id: 'c_research_leader', name: 'Research Excellence Award', icon: '🔬', client: 'Space Science Academy',
    description: 'Complete 10 research projects across multiple categories.',
    tier: 2,
    requirements: [
      { type: 'research_completed', target: 10, label: '10 research projects completed' },
    ],
    reward: { money: 200_000_000, resources: { rare_earth: 30 } }, durationMonths: 30,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3 — Late Game (requires significant expansion)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'c_mars_colony', name: 'Mars Colonization Initiative', icon: '🔴', client: 'United Nations Space Command',
    description: 'Establish a presence on Mars with buildings, research, and mining operations.',
    tier: 3,
    requirements: [
      { type: 'locations_unlocked', target: 6, label: '6 locations unlocked (including Mars)' },
      { type: 'buildings_completed', target: 15, label: '15 buildings completed' },
      { type: 'research_completed', target: 15, label: '15 research completed' },
    ],
    reward: { money: 1_000_000_000, resources: { exotic_materials: 5, helium3: 3 } }, durationMonths: 48,
  },
  {
    id: 'c_tech_leader', name: 'Technology Leadership Award', icon: '🏆', client: 'Space Industry Council',
    description: 'Demonstrate technology leadership by completing 25 research projects.',
    tier: 3,
    requirements: [
      { type: 'research_completed', target: 25, label: '25 research projects completed' },
    ],
    reward: { money: 500_000_000, resources: { platinum_group: 30, exotic_materials: 10 } }, durationMonths: 60,
  },
  {
    id: 'c_mega_corp', name: 'Megacorporation Status', icon: '🌟', client: 'Galactic Commerce Authority',
    description: 'Build a massive space enterprise with 30+ buildings and 10+ active services.',
    tier: 3,
    requirements: [
      { type: 'buildings_completed', target: 30, label: '30 completed buildings' },
      { type: 'services_active', target: 10, label: '10 active services' },
    ],
    reward: { money: 2_000_000_000 }, durationMonths: 60,
  },
  {
    id: 'c_deep_space', name: 'Deep Space Operations', icon: '🌌', client: 'Outer Planets Foundation',
    description: 'Extend your operations to the outer solar system beyond the asteroid belt.',
    tier: 3,
    requirements: [
      { type: 'locations_unlocked', target: 9, label: '9 locations unlocked (outer system)' },
      { type: 'mining_services_active', target: 3, label: '3 active mining services' },
    ],
    reward: { money: 1_500_000_000, resources: { exotic_materials: 15, helium3: 5 } }, durationMonths: 48,
  },
  {
    id: 'c_satellite_empire', name: 'Global Satellite Empire', icon: '🛰️', client: 'World Telecommunications Union',
    description: 'Deploy a massive satellite constellation of 20+ satellites across multiple orbits.',
    tier: 3,
    requirements: [
      { type: 'satellites_deployed', target: 20, label: '20 satellites deployed' },
      { type: 'services_active', target: 8, label: '8 active services' },
    ],
    reward: { money: 800_000_000, resources: { titanium: 100 } }, durationMonths: 48,
  },
  {
    id: 'c_mining_empire', name: 'Resource Extraction Empire', icon: '💎', client: 'Interplanetary Mining Consortium',
    description: 'Build a mining empire with operations at 3+ locations and a large resource stockpile.',
    tier: 3,
    requirements: [
      { type: 'mining_services_active', target: 3, label: '3 active mining operations' },
      { type: 'resources_mined', target: 5000, label: '5,000 total resources in inventory' },
    ],
    reward: { money: 1_200_000_000, resources: { platinum_group: 50, gold: 30 } }, durationMonths: 48,
  },
];

/** Get current progress for a requirement */
export function getRequirementProgress(state: GameState, req: ContractRequirement): number {
  switch (req.type) {
    case 'money_earned':
      return state.totalEarned;
    case 'buildings_completed':
      return state.buildings.filter(b => b.isComplete).length;
    case 'satellites_deployed':
      // Count only satellite-type buildings (telecom + sensor in LEO/GEO)
      return state.buildings.filter(b =>
        b.isComplete && (
          b.definitionId.startsWith('sat_') ||
          b.definitionId.includes('telecom') ||
          b.definitionId.includes('sensor')
        )
      ).length;
    case 'stations_built':
      return state.buildings.filter(b =>
        b.isComplete && b.definitionId.includes('space_station')
      ).length;
    case 'ships_built':
      return (state.ships || []).filter(s => s.isBuilt).length;
    case 'mining_services_active':
      return state.activeServices.filter(s => s.definitionId.includes('mining')).length;
    case 'colonies_established':
      // Count locations beyond the base set (earth_surface, leo, geo, lunar_orbit, lunar_surface, mars_orbit, mars_surface)
      const baseLocations = new Set(['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface', 'asteroid_belt']);
      return state.unlockedLocations.filter(l => !baseLocations.has(l)).length;
    case 'resources_mined': {
      let total = 0;
      for (const qty of Object.values(state.resources || {})) total += qty;
      return total;
    }
    case 'services_active':
      return state.activeServices.length;
    case 'research_completed':
      return state.completedResearch.length;
    case 'locations_unlocked':
      return state.unlockedLocations.length;
    default:
      return 0;
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

  const completedIds = (state.completedContracts || []);
  const available = eligible.filter(c => !completedIds.includes(c.id));

  // Fisher-Yates shuffle and take up to 4
  const arr = [...available];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 4);
}

/** Apply contract reward to game state */
export function applyContractReward(state: GameState, reward: ContractReward): GameState {
  const resources = { ...state.resources };
  if (reward.resources) {
    for (const [id, qty] of Object.entries(reward.resources)) {
      resources[id] = (resources[id] || 0) + qty;
    }
  }
  return {
    ...state,
    money: state.money + reward.money,
    totalEarned: state.totalEarned + reward.money,
    resources,
  };
}
