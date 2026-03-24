// ─── Space Tycoon: Alliance Research Tree ──────────────────────────────────
// 30 research items across 6 categories x 5 tiers.
// Categories: logistics, mining, commerce, military, science, infrastructure
// Each tier has increasing XP cost, treasury cost, and duration.

import { getMaxResearchTier } from './alliance-xp';

// ─── Research Definition Types ─────────────────────────────────────────────

export type ResearchCategory =
  | 'logistics'
  | 'mining'
  | 'commerce'
  | 'military'
  | 'science'
  | 'infrastructure';

export type ResearchBonusType =
  | 'build_speed'
  | 'mining_bonus'
  | 'revenue_bonus'
  | 'defense_bonus'
  | 'research_speed'
  | 'member_cap'
  | 'trade_bonus'
  | 'xp_multiplier'
  | 'project_speed';

export interface AllianceResearchDefinition {
  researchId: string;
  name: string;
  category: ResearchCategory;
  tier: number;
  xpCost: number;
  treasuryCost: number;
  durationDays: number;
  bonusType: ResearchBonusType;
  bonusValue: number;
  description: string;
  /** Research ID that must be completed before this one can start */
  prerequisite: string | null;
}

// ─── Tier Costs ────────────────────────────────────────────────────────────

const TIER_COSTS: Record<number, { xp: number; money: number; durationDays: number }> = {
  1: { xp: 200,  money: 0,              durationDays: 1 },
  2: { xp: 500,  money: 5_000_000_000,  durationDays: 3 },
  3: { xp: 1000, money: 20_000_000_000, durationDays: 7 },
  4: { xp: 2000, money: 50_000_000_000, durationDays: 14 },
  5: { xp: 4000, money: 100_000_000_000, durationDays: 30 },
};

// ─── Research Tree ─────────────────────────────────────────────────────────

export const ALLIANCE_RESEARCH_TREE: AllianceResearchDefinition[] = [
  // ── Logistics (Build Speed) ─────────────────────────────────────────────
  {
    researchId: 'logistics_1', name: 'Streamlined Supply Lines', category: 'logistics', tier: 1,
    xpCost: 200, treasuryCost: 0, durationDays: 1,
    bonusType: 'build_speed', bonusValue: 0.03, description: '+3% build speed for all members.',
    prerequisite: null,
  },
  {
    researchId: 'logistics_2', name: 'Automated Assembly', category: 'logistics', tier: 2,
    xpCost: 500, treasuryCost: 5_000_000_000, durationDays: 3,
    bonusType: 'build_speed', bonusValue: 0.05, description: '+5% build speed (stacks with T1).',
    prerequisite: 'logistics_1',
  },
  {
    researchId: 'logistics_3', name: 'Modular Construction', category: 'logistics', tier: 3,
    xpCost: 1000, treasuryCost: 20_000_000_000, durationDays: 7,
    bonusType: 'build_speed', bonusValue: 0.08, description: '+8% build speed (stacks with T1+T2).',
    prerequisite: 'logistics_2',
  },
  {
    researchId: 'logistics_4', name: 'Nanofabrication', category: 'logistics', tier: 4,
    xpCost: 2000, treasuryCost: 50_000_000_000, durationDays: 14,
    bonusType: 'build_speed', bonusValue: 0.12, description: '+12% build speed (stacks with T1-T3).',
    prerequisite: 'logistics_3',
  },
  {
    researchId: 'logistics_5', name: 'Quantum Manufacturing', category: 'logistics', tier: 5,
    xpCost: 4000, treasuryCost: 100_000_000_000, durationDays: 30,
    bonusType: 'build_speed', bonusValue: 0.15, description: '+15% build speed (stacks with T1-T4).',
    prerequisite: 'logistics_4',
  },

  // ── Mining (Output) ─────────────────────────────────────────────────────
  {
    researchId: 'mining_1', name: 'Enhanced Drill Bits', category: 'mining', tier: 1,
    xpCost: 200, treasuryCost: 0, durationDays: 1,
    bonusType: 'mining_bonus', bonusValue: 0.03, description: '+3% mining output for all members.',
    prerequisite: null,
  },
  {
    researchId: 'mining_2', name: 'Seismic Mapping', category: 'mining', tier: 2,
    xpCost: 500, treasuryCost: 5_000_000_000, durationDays: 3,
    bonusType: 'mining_bonus', bonusValue: 0.05, description: '+5% mining output (stacks with T1).',
    prerequisite: 'mining_1',
  },
  {
    researchId: 'mining_3', name: 'Deep Core Extraction', category: 'mining', tier: 3,
    xpCost: 1000, treasuryCost: 20_000_000_000, durationDays: 7,
    bonusType: 'mining_bonus', bonusValue: 0.08, description: '+8% mining output (stacks with T1+T2).',
    prerequisite: 'mining_2',
  },
  {
    researchId: 'mining_4', name: 'Asteroid Belt Networks', category: 'mining', tier: 4,
    xpCost: 2000, treasuryCost: 50_000_000_000, durationDays: 14,
    bonusType: 'mining_bonus', bonusValue: 0.12, description: '+12% mining output (stacks with T1-T3).',
    prerequisite: 'mining_3',
  },
  {
    researchId: 'mining_5', name: 'Stellar Harvesting', category: 'mining', tier: 5,
    xpCost: 4000, treasuryCost: 100_000_000_000, durationDays: 30,
    bonusType: 'mining_bonus', bonusValue: 0.15, description: '+15% mining output (stacks with T1-T4).',
    prerequisite: 'mining_4',
  },

  // ── Commerce (Revenue) ──────────────────────────────────────────────────
  {
    researchId: 'commerce_1', name: 'Trade Route Optimization', category: 'commerce', tier: 1,
    xpCost: 200, treasuryCost: 0, durationDays: 1,
    bonusType: 'revenue_bonus', bonusValue: 0.03, description: '+3% revenue for all members.',
    prerequisite: null,
  },
  {
    researchId: 'commerce_2', name: 'Market Analytics', category: 'commerce', tier: 2,
    xpCost: 500, treasuryCost: 5_000_000_000, durationDays: 3,
    bonusType: 'revenue_bonus', bonusValue: 0.05, description: '+5% revenue (stacks with T1).',
    prerequisite: 'commerce_1',
  },
  {
    researchId: 'commerce_3', name: 'Interplanetary Banking', category: 'commerce', tier: 3,
    xpCost: 1000, treasuryCost: 20_000_000_000, durationDays: 7,
    bonusType: 'revenue_bonus', bonusValue: 0.08, description: '+8% revenue (stacks with T1+T2).',
    prerequisite: 'commerce_2',
  },
  {
    researchId: 'commerce_4', name: 'Galactic Trade Networks', category: 'commerce', tier: 4,
    xpCost: 2000, treasuryCost: 50_000_000_000, durationDays: 14,
    bonusType: 'revenue_bonus', bonusValue: 0.12, description: '+12% revenue (stacks with T1-T3).',
    prerequisite: 'commerce_3',
  },
  {
    researchId: 'commerce_5', name: 'Universal Commerce Protocol', category: 'commerce', tier: 5,
    xpCost: 4000, treasuryCost: 100_000_000_000, durationDays: 30,
    bonusType: 'revenue_bonus', bonusValue: 0.15, description: '+15% revenue (stacks with T1-T4).',
    prerequisite: 'commerce_4',
  },

  // ── Military (Defense) ──────────────────────────────────────────────────
  {
    researchId: 'military_1', name: 'Perimeter Defenses', category: 'military', tier: 1,
    xpCost: 200, treasuryCost: 0, durationDays: 1,
    bonusType: 'defense_bonus', bonusValue: 0.05, description: '+5% zone defense for all members.',
    prerequisite: null,
  },
  {
    researchId: 'military_2', name: 'Shield Array Systems', category: 'military', tier: 2,
    xpCost: 500, treasuryCost: 5_000_000_000, durationDays: 3,
    bonusType: 'defense_bonus', bonusValue: 0.08, description: '+8% zone defense (stacks with T1).',
    prerequisite: 'military_1',
  },
  {
    researchId: 'military_3', name: 'Fleet Command', category: 'military', tier: 3,
    xpCost: 1000, treasuryCost: 20_000_000_000, durationDays: 7,
    bonusType: 'defense_bonus', bonusValue: 0.12, description: '+12% zone defense (stacks with T1+T2).',
    prerequisite: 'military_2',
  },
  {
    researchId: 'military_4', name: 'Orbital Weapons Platform', category: 'military', tier: 4,
    xpCost: 2000, treasuryCost: 50_000_000_000, durationDays: 14,
    bonusType: 'defense_bonus', bonusValue: 0.15, description: '+15% zone defense (stacks with T1-T3).',
    prerequisite: 'military_3',
  },
  {
    researchId: 'military_5', name: 'Planetary Shield Network', category: 'military', tier: 5,
    xpCost: 4000, treasuryCost: 100_000_000_000, durationDays: 30,
    bonusType: 'defense_bonus', bonusValue: 0.20, description: '+20% zone defense (stacks with T1-T4).',
    prerequisite: 'military_4',
  },

  // ── Science (Research Speed) ────────────────────────────────────────────
  {
    researchId: 'science_1', name: 'Collaborative Labs', category: 'science', tier: 1,
    xpCost: 200, treasuryCost: 0, durationDays: 1,
    bonusType: 'research_speed', bonusValue: 0.03, description: '+3% research speed for all members.',
    prerequisite: null,
  },
  {
    researchId: 'science_2', name: 'Data Sharing Networks', category: 'science', tier: 2,
    xpCost: 500, treasuryCost: 5_000_000_000, durationDays: 3,
    bonusType: 'research_speed', bonusValue: 0.05, description: '+5% research speed (stacks with T1).',
    prerequisite: 'science_1',
  },
  {
    researchId: 'science_3', name: 'Quantum Computing Arrays', category: 'science', tier: 3,
    xpCost: 1000, treasuryCost: 20_000_000_000, durationDays: 7,
    bonusType: 'research_speed', bonusValue: 0.08, description: '+8% research speed (stacks with T1+T2).',
    prerequisite: 'science_2',
  },
  {
    researchId: 'science_4', name: 'AI Research Assistants', category: 'science', tier: 4,
    xpCost: 2000, treasuryCost: 50_000_000_000, durationDays: 14,
    bonusType: 'research_speed', bonusValue: 0.12, description: '+12% research speed (stacks with T1-T3).',
    prerequisite: 'science_3',
  },
  {
    researchId: 'science_5', name: 'Transcendent Knowledge Base', category: 'science', tier: 5,
    xpCost: 4000, treasuryCost: 100_000_000_000, durationDays: 30,
    bonusType: 'research_speed', bonusValue: 0.15, description: '+15% research speed (stacks with T1-T4).',
    prerequisite: 'science_4',
  },

  // ── Infrastructure (Member Cap) ─────────────────────────────────────────
  {
    researchId: 'infrastructure_1', name: 'Extended Comms', category: 'infrastructure', tier: 1,
    xpCost: 200, treasuryCost: 0, durationDays: 1,
    bonusType: 'member_cap', bonusValue: 2, description: '+2 max members.',
    prerequisite: null,
  },
  {
    researchId: 'infrastructure_2', name: 'Alliance Outpost', category: 'infrastructure', tier: 2,
    xpCost: 500, treasuryCost: 5_000_000_000, durationDays: 3,
    bonusType: 'member_cap', bonusValue: 3, description: '+3 max members (stacks with T1).',
    prerequisite: 'infrastructure_1',
  },
  {
    researchId: 'infrastructure_3', name: 'Orbital Headquarters', category: 'infrastructure', tier: 3,
    xpCost: 1000, treasuryCost: 20_000_000_000, durationDays: 7,
    bonusType: 'member_cap', bonusValue: 5, description: '+5 max members (stacks with T1+T2).',
    prerequisite: 'infrastructure_2',
  },
  {
    researchId: 'infrastructure_4', name: 'Interplanetary Network', category: 'infrastructure', tier: 4,
    xpCost: 2000, treasuryCost: 50_000_000_000, durationDays: 14,
    bonusType: 'member_cap', bonusValue: 5, description: '+5 max members (stacks with T1-T3).',
    prerequisite: 'infrastructure_3',
  },
  {
    researchId: 'infrastructure_5', name: 'Galactic Federation Hub', category: 'infrastructure', tier: 5,
    xpCost: 4000, treasuryCost: 100_000_000_000, durationDays: 30,
    bonusType: 'member_cap', bonusValue: 5, description: '+5 max members (stacks with T1-T4).',
    prerequisite: 'infrastructure_4',
  },
];

export const RESEARCH_MAP = new Map(
  ALLIANCE_RESEARCH_TREE.map(r => [r.researchId, r])
);

// ─── Available Research ────────────────────────────────────────────────────

/**
 * Filter the research tree to what an alliance can see/start.
 * Research is available if:
 * 1. Its tier is unlocked at the alliance level
 * 2. Its prerequisite (if any) is in completedIds
 * 3. It has not already been completed
 */
export function getAvailableResearch(
  completedIds: string[],
  allianceLevel: number,
): AllianceResearchDefinition[] {
  const completedSet = new Set(completedIds);
  const maxTier = getMaxResearchTier(allianceLevel);

  return ALLIANCE_RESEARCH_TREE.filter(r => {
    // Tier must be unlocked
    if (r.tier > maxTier) return false;
    // Must not already be completed
    if (completedSet.has(r.researchId)) return false;
    // Prerequisite must be completed (or null)
    if (r.prerequisite && !completedSet.has(r.prerequisite)) return false;
    return true;
  });
}

// ─── Can Start Research ────────────────────────────────────────────────────

export interface CanStartResearchResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if an alliance can begin a specific research item.
 */
export function canStartResearch(
  alliance: { xp: number; treasury: number; level: number },
  researchDef: AllianceResearchDefinition,
  completedIds: string[],
  currentlyResearchingCount: number,
): CanStartResearchResult {
  const maxTier = getMaxResearchTier(alliance.level);
  if (researchDef.tier > maxTier) {
    return { allowed: false, reason: `Tier ${researchDef.tier} research requires alliance level ${tierRequiredLevel(researchDef.tier)}.` };
  }

  if (researchDef.prerequisite && !completedIds.includes(researchDef.prerequisite)) {
    const prereq = RESEARCH_MAP.get(researchDef.prerequisite);
    return { allowed: false, reason: `Prerequisite "${prereq?.name ?? researchDef.prerequisite}" must be completed first.` };
  }

  if (completedIds.includes(researchDef.researchId)) {
    return { allowed: false, reason: 'This research is already completed.' };
  }

  if (currentlyResearchingCount >= 1) {
    return { allowed: false, reason: 'Only one research can be in progress at a time.' };
  }

  if (alliance.xp < researchDef.xpCost) {
    return { allowed: false, reason: `Insufficient alliance XP. Need ${researchDef.xpCost}, have ${alliance.xp}.` };
  }

  if (alliance.treasury < researchDef.treasuryCost) {
    return { allowed: false, reason: `Insufficient treasury funds. Need $${formatMoney(researchDef.treasuryCost)}, have $${formatMoney(alliance.treasury)}.` };
  }

  return { allowed: true };
}

function tierRequiredLevel(tier: number): number {
  switch (tier) {
    case 1: return 5;
    case 2: return 10;
    case 3: return 15;
    case 4: return 25;
    case 5: return 25;
    default: return 99;
  }
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  return amount.toLocaleString();
}

// ─── Aggregate Research Bonuses ────────────────────────────────────────────

export interface ResearchBonuses {
  revenueBonus: number;
  miningBonus: number;
  researchBonus: number;
  buildSpeedBonus: number;
  defenseBonus: number;
  memberCapBonus: number;
  tradeBonus: number;
  xpMultiplier: number;
  projectSpeedBonus: number;
}

/**
 * Aggregate all bonuses from completed research.
 * Accepts an array of completed research records.
 */
export function getAllianceResearchBonuses(
  completedResearch: Array<{ bonusType: string; bonusValue: number }>,
): ResearchBonuses {
  const bonuses: ResearchBonuses = {
    revenueBonus: 0,
    miningBonus: 0,
    researchBonus: 0,
    buildSpeedBonus: 0,
    defenseBonus: 0,
    memberCapBonus: 0,
    tradeBonus: 0,
    xpMultiplier: 0,
    projectSpeedBonus: 0,
  };

  for (const r of completedResearch) {
    switch (r.bonusType) {
      case 'revenue_bonus':   bonuses.revenueBonus += r.bonusValue; break;
      case 'mining_bonus':    bonuses.miningBonus += r.bonusValue; break;
      case 'research_speed':  bonuses.researchBonus += r.bonusValue; break;
      case 'build_speed':     bonuses.buildSpeedBonus += r.bonusValue; break;
      case 'defense_bonus':   bonuses.defenseBonus += r.bonusValue; break;
      case 'member_cap':      bonuses.memberCapBonus += r.bonusValue; break;
      case 'trade_bonus':     bonuses.tradeBonus += r.bonusValue; break;
      case 'xp_multiplier':   bonuses.xpMultiplier += r.bonusValue; break;
      case 'project_speed':   bonuses.projectSpeedBonus += r.bonusValue; break;
    }
  }

  return bonuses;
}

/**
 * Get the full research tree annotated with status for a specific alliance.
 */
export function getAnnotatedResearchTree(
  completedIds: string[],
  researchingId: string | null,
  allianceLevel: number,
): Array<AllianceResearchDefinition & { status: 'locked' | 'available' | 'researching' | 'completed' }> {
  const completedSet = new Set(completedIds);
  const maxTier = getMaxResearchTier(allianceLevel);

  return ALLIANCE_RESEARCH_TREE.map(r => {
    let status: 'locked' | 'available' | 'researching' | 'completed';

    if (completedSet.has(r.researchId)) {
      status = 'completed';
    } else if (researchingId === r.researchId) {
      status = 'researching';
    } else if (
      r.tier <= maxTier &&
      (!r.prerequisite || completedSet.has(r.prerequisite))
    ) {
      status = 'available';
    } else {
      status = 'locked';
    }

    return { ...r, status };
  });
}

/**
 * Get research duration in milliseconds.
 */
export function getResearchDurationMs(durationDays: number): number {
  return durationDays * 24 * 60 * 60 * 1000;
}

/**
 * Get tier costs (for display purposes).
 */
export function getTierCosts(tier: number): { xp: number; money: number; durationDays: number } {
  return TIER_COSTS[tier] ?? TIER_COSTS[1];
}
