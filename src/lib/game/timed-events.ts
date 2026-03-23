// ─── Space Tycoon: Dynamic Timed Events ──────────────────────────────────────
// Short-duration competitive challenges (2-12 hours) that spawn randomly.
// Goals are SCALED to the player's current income/score at the time the
// event spawns, so they're fair for players at any stage.
//
// Events appear in the Contracts tab alongside regular contracts.
// Players can complete as many as they qualify for during the window.

import type { GameState } from './types';

export type EventCategory = 'mining' | 'building' | 'research' | 'trading' | 'expansion' | 'fleet' | 'revenue' | 'milestone';

export interface TimedEventTemplate {
  id: string;
  name: string;
  icon: string;
  category: EventCategory;
  description: string;
  /** Duration in real hours (2-12) */
  durationHours: number;
  /** Function that returns the scaled target based on player state */
  getTarget: (state: GameState) => number;
  /** Function that returns current progress */
  getProgress: (state: GameState) => number;
  /** Label for the target (e.g., "iron mined", "buildings completed") */
  targetLabel: string;
  /** Base reward multiplier — actual reward = multiplier × player monthly income */
  rewardMultiplier: number;
  /** Speed boost reward type (null = cash only) */
  boostReward?: 'construction' | 'research' | null;
}

// ─── Event Templates (20+) ──────────────────────────────────────────────────
// Targets use getTarget() which scales based on the player's current state.
// A new player with $5M/mo income gets achievable targets.
// A late-game player with $200M/mo income gets proportionally harder targets.

export const EVENT_TEMPLATES: TimedEventTemplate[] = [
  // ═══ MINING EVENTS ═══
  {
    id: 'evt_iron_rush',
    name: 'Iron Rush',
    icon: '⛏️',
    category: 'mining',
    description: 'Mine as much iron as possible before time runs out.',
    durationHours: 4,
    getTarget: (s) => Math.max(50, Math.round((Object.values(s.resources || {}).reduce((a, b) => a + b, 0) || 100) * 0.5)),
    getProgress: (s) => s.resources?.iron || 0,
    targetLabel: 'iron in inventory',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_rare_earth_hunt',
    name: 'Rare Earth Hunt',
    icon: '💎',
    category: 'mining',
    description: 'Accumulate rare earth elements.',
    durationHours: 6,
    getTarget: (s) => Math.max(10, Math.round((s.resources?.rare_earth || 0) + 15)),
    getProgress: (s) => s.resources?.rare_earth || 0,
    targetLabel: 'rare earth in inventory',
    rewardMultiplier: 3,
    boostReward: 'research',
  },
  {
    id: 'evt_water_collection',
    name: 'Water Collection Drive',
    icon: '💧',
    category: 'mining',
    description: 'Stockpile lunar or Mars water.',
    durationHours: 4,
    getTarget: (s) => Math.max(30, Math.round(((s.resources?.lunar_water || 0) + (s.resources?.mars_water || 0)) * 0.4 + 30)),
    getProgress: (s) => (s.resources?.lunar_water || 0) + (s.resources?.mars_water || 0),
    targetLabel: 'water units',
    rewardMultiplier: 1.5,
    boostReward: null,
  },
  {
    id: 'evt_precious_metals',
    name: 'Precious Metals Bonanza',
    icon: '🥇',
    category: 'mining',
    description: 'Accumulate platinum or gold.',
    durationHours: 8,
    getTarget: (s) => Math.max(5, Math.round(((s.resources?.platinum_group || 0) + (s.resources?.gold || 0)) * 0.3 + 5)),
    getProgress: (s) => (s.resources?.platinum_group || 0) + (s.resources?.gold || 0),
    targetLabel: 'precious metal units',
    rewardMultiplier: 4,
    boostReward: null,
  },

  // ═══ BUILDING EVENTS ═══
  {
    id: 'evt_construction_sprint',
    name: 'Construction Sprint',
    icon: '🏗️',
    category: 'building',
    description: 'Complete buildings as fast as you can.',
    durationHours: 6,
    getTarget: (s) => Math.max(2, Math.round(s.buildings.filter(b => b.isComplete).length * 0.15 + 2)),
    getProgress: (s) => s.buildings.filter(b => b.isComplete).length,
    targetLabel: 'completed buildings',
    rewardMultiplier: 2.5,
    boostReward: 'construction',
  },
  {
    id: 'evt_satellite_deploy',
    name: 'Satellite Deployment Blitz',
    icon: '📡',
    category: 'building',
    description: 'Deploy new satellites across any orbit.',
    durationHours: 4,
    getTarget: (s) => {
      const sats = s.buildings.filter(b => b.isComplete && b.definitionId.startsWith('sat_')).length;
      return Math.max(2, Math.round(sats * 0.2 + 2));
    },
    getProgress: (s) => s.buildings.filter(b => b.isComplete && b.definitionId.startsWith('sat_')).length,
    targetLabel: 'satellites deployed',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_infrastructure_push',
    name: 'Infrastructure Push',
    icon: '🏭',
    category: 'building',
    description: 'Build ground stations, solar farms, or fabrication facilities.',
    durationHours: 6,
    getTarget: (s) => Math.max(1, Math.round(s.buildings.filter(b => b.isComplete).length * 0.1 + 1)),
    getProgress: (s) => s.buildings.filter(b => b.isComplete && (
      b.definitionId.includes('ground') || b.definitionId.includes('solar') || b.definitionId.includes('fabrication')
    )).length,
    targetLabel: 'infrastructure buildings',
    rewardMultiplier: 2,
    boostReward: 'construction',
  },

  // ═══ RESEARCH EVENTS ═══
  {
    id: 'evt_research_marathon',
    name: 'Research Marathon',
    icon: '🔬',
    category: 'research',
    description: 'Complete research projects during the event window.',
    durationHours: 8,
    getTarget: (s) => Math.max(1, Math.round(s.completedResearch.length * 0.08 + 1)),
    getProgress: (s) => s.completedResearch.length,
    targetLabel: 'researches completed',
    rewardMultiplier: 3,
    boostReward: 'research',
  },
  {
    id: 'evt_tech_diversity',
    name: 'Technology Diversity',
    icon: '🧪',
    category: 'research',
    description: 'Have research completed across multiple categories.',
    durationHours: 12,
    getTarget: (s) => {
      const cats = new Set(s.completedResearch.map(id => {
        const r = RESEARCH_MAP_IMPORT?.get(id);
        return r?.category;
      }).filter(Boolean));
      return Math.max(3, cats.size + 1);
    },
    getProgress: (s) => {
      const cats = new Set(s.completedResearch.map(id => {
        const r = RESEARCH_MAP_IMPORT?.get(id);
        return r?.category;
      }).filter(Boolean));
      return cats.size;
    },
    targetLabel: 'research categories',
    rewardMultiplier: 2,
    boostReward: 'research',
  },

  // ═══ REVENUE EVENTS ═══
  {
    id: 'evt_revenue_surge',
    name: 'Revenue Surge',
    icon: '📈',
    category: 'revenue',
    description: 'Increase your active service count.',
    durationHours: 6,
    getTarget: (s) => Math.max(1, s.activeServices.length + 1),
    getProgress: (s) => s.activeServices.length,
    targetLabel: 'active services',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_profit_target',
    name: 'Profit Target',
    icon: '💵',
    category: 'revenue',
    description: 'Reach a cash target based on your current holdings.',
    durationHours: 8,
    getTarget: (s) => Math.round(s.money * 1.3 + 10_000_000),
    getProgress: (s) => s.money,
    targetLabel: 'cash on hand',
    rewardMultiplier: 1.5,
    boostReward: null,
  },
  {
    id: 'evt_earnings_streak',
    name: 'Earnings Streak',
    icon: '🔥',
    category: 'revenue',
    description: 'Earn total revenue above a target.',
    durationHours: 6,
    getTarget: (s) => Math.round(s.totalEarned * 1.1 + 50_000_000),
    getProgress: (s) => s.totalEarned,
    targetLabel: 'total earned',
    rewardMultiplier: 2,
    boostReward: null,
  },

  // ═══ FLEET EVENTS ═══
  {
    id: 'evt_fleet_buildup',
    name: 'Fleet Buildup',
    icon: '🚢',
    category: 'fleet',
    description: 'Build and deploy operational ships.',
    durationHours: 6,
    getTarget: (s) => Math.max(1, (s.ships || []).filter(sh => sh.isBuilt).length + 1),
    getProgress: (s) => (s.ships || []).filter(sh => sh.isBuilt).length,
    targetLabel: 'operational ships',
    rewardMultiplier: 2.5,
    boostReward: 'construction',
  },
  {
    id: 'evt_mining_fleet',
    name: 'Mining Fleet Deployment',
    icon: '⛏️',
    category: 'fleet',
    description: 'Get mining ships actively extracting resources.',
    durationHours: 4,
    getTarget: (s) => Math.max(1, (s.ships || []).filter(sh => sh.status === 'mining').length + 1),
    getProgress: (s) => (s.ships || []).filter(sh => sh.status === 'mining').length,
    targetLabel: 'ships mining',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_survey_expedition',
    name: 'Survey Expedition',
    icon: '📡',
    category: 'fleet',
    description: 'Build and launch survey probes.',
    durationHours: 3,
    getTarget: () => 1,
    getProgress: (s) => (s.ships || []).filter(sh => sh.definitionId === 'survey_probe' && sh.isBuilt).length,
    targetLabel: 'survey probes ready',
    rewardMultiplier: 1.5,
    boostReward: null,
  },

  // ═══ EXPANSION EVENTS ═══
  {
    id: 'evt_new_frontier',
    name: 'New Frontier',
    icon: '🗺️',
    category: 'expansion',
    description: 'Unlock a new location in the solar system.',
    durationHours: 12,
    getTarget: (s) => s.unlockedLocations.length + 1,
    getProgress: (s) => s.unlockedLocations.length,
    targetLabel: 'locations unlocked',
    rewardMultiplier: 3,
    boostReward: 'construction',
  },
  {
    id: 'evt_multi_location',
    name: 'Multi-Location Operations',
    icon: '🌍',
    category: 'expansion',
    description: 'Have completed buildings across multiple locations.',
    durationHours: 8,
    getTarget: (s) => {
      const locs = new Set(s.buildings.filter(b => b.isComplete).map(b => b.locationId));
      return Math.max(2, locs.size + 1);
    },
    getProgress: (s) => {
      const locs = new Set(s.buildings.filter(b => b.isComplete).map(b => b.locationId));
      return locs.size;
    },
    targetLabel: 'locations with buildings',
    rewardMultiplier: 2.5,
    boostReward: null,
  },

  // ═══ MILESTONE EVENTS ═══
  {
    id: 'evt_hire_spree',
    name: 'Hiring Spree',
    icon: '👷',
    category: 'milestone',
    description: 'Grow your workforce.',
    durationHours: 4,
    getTarget: (s) => {
      const wf = s.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
      const total = wf.engineers + wf.scientists + wf.miners + wf.operators;
      return Math.max(1, total + 1);
    },
    getProgress: (s) => {
      const wf = s.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
      return wf.engineers + wf.scientists + wf.miners + wf.operators;
    },
    targetLabel: 'total crew members',
    rewardMultiplier: 1.5,
    boostReward: null,
  },
  {
    id: 'evt_resource_hoarder',
    name: 'Resource Hoarder',
    icon: '📦',
    category: 'milestone',
    description: 'Stockpile total resources across all types.',
    durationHours: 6,
    getTarget: (s) => {
      const total = Object.values(s.resources || {}).reduce((a, b) => a + b, 0);
      return Math.max(50, Math.round(total * 1.25 + 20));
    },
    getProgress: (s) => Object.values(s.resources || {}).reduce((a, b) => a + b, 0),
    targetLabel: 'total resource units',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_contract_completionist',
    name: 'Contract Completionist',
    icon: '📋',
    category: 'milestone',
    description: 'Complete any contract during the event window.',
    durationHours: 8,
    getTarget: (s) => (s.completedContracts || []).length + 1,
    getProgress: (s) => (s.completedContracts || []).length,
    targetLabel: 'contracts completed',
    rewardMultiplier: 2.5,
    boostReward: 'research',
  },
  {
    id: 'evt_diversified_income',
    name: 'Diversified Income',
    icon: '🏦',
    category: 'milestone',
    description: 'Have services generating revenue at multiple locations.',
    durationHours: 10,
    getTarget: (s) => {
      const locs = new Set(s.activeServices.map(svc => svc.locationId));
      return Math.max(2, locs.size + 1);
    },
    getProgress: (s) => {
      const locs = new Set(s.activeServices.map(svc => svc.locationId));
      return locs.size;
    },
    targetLabel: 'locations with active services',
    rewardMultiplier: 2,
    boostReward: null,
  },
];

// Lazy import to avoid circular dependency
let RESEARCH_MAP_IMPORT: Map<string, { category: string }> | null = null;
try {
  const { RESEARCH_MAP } = require('./research-tree');
  RESEARCH_MAP_IMPORT = RESEARCH_MAP;
} catch {}

/** Pick a random event appropriate for the current time */
export function rollTimedEvent(): TimedEventTemplate {
  const index = Math.floor(Math.random() * EVENT_TEMPLATES.length);
  return EVENT_TEMPLATES[index];
}

/** Calculate the cash reward for a timed event based on player's monthly income */
export function calculateEventReward(template: TimedEventTemplate, state: GameState): number {
  // Estimate monthly income from active services
  let monthlyIncome = 0;
  for (const svc of state.activeServices) {
    monthlyIncome += 5_000_000; // Rough average per service
  }
  monthlyIncome = Math.max(monthlyIncome, 10_000_000); // Minimum $10M base

  return Math.round(monthlyIncome * template.rewardMultiplier);
}
