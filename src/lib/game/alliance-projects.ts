// ─── Space Tycoon: Alliance Shared Projects (Mega-Projects) ──────────────────
// Defines project types, costs, contribution logic, revenue splits,
// and share calculations for cooperative alliance building projects.

import { RESOURCE_MAP, type ResourceId } from './resources';

// ─── Project Definitions ─────────────────────────────────────────────────────

export interface AllianceProjectDefinition {
  type: string;
  name: string;
  icon: string;
  description: string;
  moneyCost: number;
  resourceCosts: Record<string, number>;
  buildDurationDays: number;
  minMembers: number;
  bonuses: {
    revenueBonus?: number;
    miningBonus?: number;
    researchBonus?: number;
    buildSpeedBonus?: number;
    defenseBonus?: number;
    launchCostReduction?: number;
    monthlyRevenue?: number;
  };
  xpReward: number;
  /** Tier for display — higher = more impressive */
  tier: number;
}

export const ALLIANCE_PROJECT_DEFINITIONS: AllianceProjectDefinition[] = [
  {
    type: 'orbital_mega_station',
    name: 'Orbital Mega-Station',
    icon: '🛰️',
    description: 'A massive orbital station providing revenue and defense bonuses to all members.',
    moneyCost: 50_000_000_000,
    resourceCosts: { titanium: 5000, aluminum: 2000 },
    buildDurationDays: 7,
    minMembers: 5,
    bonuses: { revenueBonus: 0.10, defenseBonus: 0.20 },
    xpReward: 500,
    tier: 1,
  },
  {
    type: 'deep_space_relay',
    name: 'Deep Space Relay Network',
    icon: '📡',
    description: 'Shared research network boosting research speed for all alliance members.',
    moneyCost: 30_000_000_000,
    resourceCosts: { rare_earth: 3000, iron: 1000 },
    buildDurationDays: 10,
    minMembers: 3,
    bonuses: { researchBonus: 0.15 },
    xpReward: 750,
    tier: 2,
  },
  {
    type: 'alliance_trade_hub',
    name: 'Alliance Trade Hub',
    icon: '🏪',
    description: 'Shared marketplace with better prices and passive income for the alliance.',
    moneyCost: 40_000_000_000,
    resourceCosts: { iron: 4000, titanium: 2000 },
    buildDurationDays: 7,
    minMembers: 5,
    bonuses: { revenueBonus: 0.10, monthlyRevenue: 500_000_000 },
    xpReward: 500,
    tier: 2,
  },
  {
    type: 'colony_ship',
    name: 'Colony Ship "Exodus"',
    icon: '🚢',
    description: 'Massive colony vessel unlocking an exclusive outer-system location for alliance members.',
    moneyCost: 100_000_000_000,
    resourceCosts: { titanium: 10000, exotic_materials: 5000, helium3: 2000 },
    buildDurationDays: 21,
    minMembers: 10,
    bonuses: { revenueBonus: 0.05, miningBonus: 0.10 },
    xpReward: 2000,
    tier: 3,
  },
  {
    type: 'space_elevator',
    name: 'Space Elevator',
    icon: '🗼',
    description: 'Dramatically reduces launch costs for all alliance members.',
    moneyCost: 200_000_000_000,
    resourceCosts: { titanium: 10000, iron: 20000, rare_earth: 5000 },
    buildDurationDays: 30,
    minMembers: 15,
    bonuses: { launchCostReduction: 0.50 },
    xpReward: 3000,
    tier: 4,
  },
  {
    type: 'dyson_swarm',
    name: 'Dyson Swarm Array',
    icon: '☀️',
    description: 'Harness the power of a star. Massive revenue boost and prestige for the alliance.',
    moneyCost: 500_000_000_000,
    resourceCosts: { rare_earth: 20000, platinum_group: 10000 },
    buildDurationDays: 45,
    minMembers: 15,
    bonuses: { revenueBonus: 0.25, monthlyRevenue: 5_000_000_000 },
    xpReward: 5000,
    tier: 5,
  },
];

export const PROJECT_DEFINITION_MAP = new Map(
  ALLIANCE_PROJECT_DEFINITIONS.map(p => [p.type, p])
);

// ─── Contribution Value Calculation ──────────────────────────────────────────

/**
 * Calculate the dollar value of a contribution (money + resource market values).
 * Resource values use base market prices from resource definitions.
 */
export function calculateContributionValue(
  money: number,
  resources: Record<string, number>,
): number {
  let value = money;
  for (const [resourceId, qty] of Object.entries(resources)) {
    const resourceDef = RESOURCE_MAP.get(resourceId as ResourceId);
    const pricePerUnit = resourceDef?.baseMarketPrice ?? 50_000;
    value += qty * pricePerUnit;
  }
  return value;
}

/**
 * Calculate each contributor's share of a project's total contributions.
 * Returns a map of profileId -> share (0.0 to 1.0).
 */
export function calculateContributionShares(
  contributions: Array<{
    profileId: string;
    moneyContributed: number;
    resourcesContributed: Record<string, number>;
  }>,
): Map<string, number> {
  const shares = new Map<string, number>();
  let totalValue = 0;

  const values: Array<{ profileId: string; value: number }> = [];
  for (const c of contributions) {
    const value = calculateContributionValue(
      c.moneyContributed,
      c.resourcesContributed,
    );
    values.push({ profileId: c.profileId, value });
    totalValue += value;
  }

  if (totalValue <= 0) return shares;

  for (const { profileId, value } of values) {
    shares.set(profileId, Math.round((value / totalValue) * 10000) / 10000);
  }

  return shares;
}

// ─── Revenue Split ───────────────────────────────────────────────────────────

export interface RevenueSplitResult {
  /** Per-member payout from the proportional portion */
  proportionalPayouts: Map<string, number>;
  /** Amount going to alliance treasury */
  treasuryAmount: number;
  /** Per-member equal share payout */
  equalShareAmount: number;
}

/**
 * Split revenue from a completed project:
 * - 60% proportional to contribution share
 * - 30% to alliance treasury
 * - 10% equal among all members
 */
export function splitProjectRevenue(
  totalRevenue: number,
  contributorShares: Map<string, number>,
  allMemberProfileIds: string[],
): RevenueSplitResult {
  const proportionalPool = totalRevenue * 0.60;
  const treasuryAmount = Math.round(totalRevenue * 0.30);
  const equalPool = totalRevenue * 0.10;
  const equalShareAmount = allMemberProfileIds.length > 0
    ? Math.round(equalPool / allMemberProfileIds.length)
    : 0;

  const proportionalPayouts = new Map<string, number>();
  contributorShares.forEach((share, profileId) => {
    proportionalPayouts.set(profileId, Math.round(proportionalPool * share));
  });

  return { proportionalPayouts, treasuryAmount, equalShareAmount };
}

// ─── Contribution Processing ─────────────────────────────────────────────────

export interface ContributeResult {
  success: boolean;
  error?: string;
  /** Money actually contributed (could be less than requested if project cap hit) */
  moneyContributed: number;
  /** Resources actually contributed */
  resourcesContributed: Record<string, number>;
  /** Whether this contribution completed the funding */
  fundingCompleted: boolean;
}

/**
 * Calculate how much of a proposed contribution can actually be applied.
 * Caps contributions so the project doesn't get overfunded.
 */
export function calculateActualContribution(
  project: {
    moneyCost: number;
    moneyFunded: number;
    resourceCosts: Record<string, number>;
    resourceFunded: Record<string, number>;
  },
  proposedMoney: number,
  proposedResources: Record<string, number>,
): { money: number; resources: Record<string, number>; fundingCompleted: boolean } {
  // Cap money contribution
  const moneyRemaining = Math.max(0, project.moneyCost - project.moneyFunded);
  const money = Math.min(proposedMoney, moneyRemaining);

  // Cap each resource contribution
  const resources: Record<string, number> = {};
  for (const [resourceId, proposed] of Object.entries(proposedResources)) {
    const required = project.resourceCosts[resourceId] ?? 0;
    const funded = (project.resourceFunded as Record<string, number>)[resourceId] ?? 0;
    const remaining = Math.max(0, required - funded);
    if (remaining > 0 && proposed > 0) {
      resources[resourceId] = Math.min(proposed, remaining);
    }
  }

  // Check if funding is now complete
  const newMoneyFunded = project.moneyFunded + money;
  const isMoneyComplete = newMoneyFunded >= project.moneyCost;

  let isResourcesComplete = true;
  for (const [resourceId, required] of Object.entries(project.resourceCosts)) {
    const currentFunded = ((project.resourceFunded as Record<string, number>)[resourceId] ?? 0) + (resources[resourceId] ?? 0);
    if (currentFunded < required) {
      isResourcesComplete = false;
      break;
    }
  }

  return {
    money,
    resources,
    fundingCompleted: isMoneyComplete && isResourcesComplete,
  };
}

/**
 * Calculate the overall funding progress of a project (0-100%).
 */
export function calculateFundingProgress(project: {
  moneyCost: number;
  moneyFunded: number;
  resourceCosts: Record<string, number>;
  resourceFunded: Record<string, number>;
}): number {
  // Weight money and each resource equally
  const totalComponents = 1 + Object.keys(project.resourceCosts).length;
  if (totalComponents <= 0) return 100;

  let progressSum = 0;

  // Money progress
  if (project.moneyCost > 0) {
    progressSum += Math.min(1, project.moneyFunded / project.moneyCost);
  } else {
    progressSum += 1;
  }

  // Resource progress
  for (const [resourceId, required] of Object.entries(project.resourceCosts)) {
    if (required <= 0) {
      progressSum += 1;
      continue;
    }
    const funded = (project.resourceFunded as Record<string, number>)[resourceId] ?? 0;
    progressSum += Math.min(1, funded / required);
  }

  return Math.round((progressSum / totalComponents) * 100);
}

// ─── Project Slot Limits ─────────────────────────────────────────────────────

/**
 * Maximum completed projects allowed based on alliance tier.
 */
export function getMaxProjectSlots(tier: number): number {
  if (tier >= 5) return 5;
  if (tier >= 3) return 4;
  return 3;
}

/**
 * Check if an alliance can propose a new project.
 */
export function canProposeProject(
  allianceLevel: number,
  activeProjectCount: number,
  completedProjectCount: number,
  tier: number,
): { allowed: boolean; reason?: string } {
  if (allianceLevel < 3) {
    return { allowed: false, reason: 'Alliance must be level 3 to propose shared projects.' };
  }

  if (activeProjectCount >= 1) {
    return { allowed: false, reason: 'Only one project can be under construction at a time.' };
  }

  const maxSlots = getMaxProjectSlots(tier);
  if (completedProjectCount >= maxSlots) {
    return { allowed: false, reason: `Maximum ${maxSlots} completed projects allowed at tier ${tier}. Decommission one first.` };
  }

  return { allowed: true };
}
