// ─── Space Tycoon: Competitive Economic Engine ──────────────────────────────
// Integrates ALL disconnected systems into one cohesive competitive game.
// This module is called from the game engine to apply:
// 1. Resource scarcity (mining depletes over time)
// 2. Economic cycles (boom/bust affects all revenue)
// 3. Supply chain enforcement (colonies need inputs to operate)
// 4. Facility degradation (unpaid maintenance causes damage)
// 5. Risk events (hostile environment, equipment failure, market crash)
// 6. Alliance shared bonuses
// 7. Reputation tracking
// 8. Victory condition checking
//
// DESIGN PHILOSOPHY:
// Every decision has economic consequences. Safe choices yield moderate returns.
// Risky choices (frontier colonies, volatile resources, aggressive expansion)
// can yield 3-10x returns but also catastrophic losses.

import type { GameState } from './types';
import { SCARCITY_LEVELS, getCurrentEconomicPhase, REPUTATION_TIERS } from './economic-systems';
import type { EconomicCycle } from './economic-systems';

// ─── 1. Resource Scarcity ────────────────────────────────────────────────────
// Track total units mined per resource globally. As cumulative mining increases,
// output decreases. Forces expansion to new locations.

export interface ScarcityState {
  totalMined: Record<string, number>; // resource → total units ever mined
}

export function applyScarcityToMining(
  baseAmount: number,
  resourceId: string,
  scarcityState: ScarcityState,
): number {
  const totalMined = scarcityState.totalMined[resourceId] || 0;

  // Find applicable scarcity level
  let multiplier = 1.0;
  for (let i = SCARCITY_LEVELS.length - 1; i >= 0; i--) {
    if (totalMined >= SCARCITY_LEVELS[i].thresholdMined) {
      multiplier = SCARCITY_LEVELS[i].outputMultiplier;
      break;
    }
  }

  return Math.max(1, Math.round(baseAmount * multiplier));
}

// ─── 2. Economic Cycle Application ───────────────────────────────────────────
// Global economic conditions affect all revenue and costs.

export function getEconomicMultipliers(gameMonth: number): {
  revenueMultiplier: number;
  costMultiplier: number;
  demandMultiplier: number;
  phaseName: string;
} {
  const cycle = getCurrentEconomicPhase(gameMonth);
  return {
    revenueMultiplier: cycle.revenueMultiplier,
    costMultiplier: cycle.costMultiplier,
    demandMultiplier: cycle.resourceDemandMultiplier,
    phaseName: cycle.phase,
  };
}

// ─── 3. Facility Degradation ─────────────────────────────────────────────────
// If a player can't pay maintenance, facilities degrade.
// Degraded facilities produce less revenue. Fully degraded = offline.
// This creates real consequences for overexpansion.

export interface FacilityHealth {
  buildingId: string;
  healthPct: number; // 0-100, facilities below 50% operate at reduced capacity
  degradationRate: number; // How fast it degrades when unpaid (per month)
}

export function calculateDegradedRevenue(
  baseRevenue: number,
  healthPct: number,
): number {
  if (healthPct >= 80) return baseRevenue; // Full operation above 80%
  if (healthPct >= 50) return Math.round(baseRevenue * (healthPct / 100)); // Linear degradation
  if (healthPct >= 20) return Math.round(baseRevenue * 0.25); // Minimal operation
  return 0; // Below 20% = offline
}

export function calculateMaintenanceResult(
  canAffordMaintenance: boolean,
  currentHealth: number,
  monthlyMaintenanceCost: number,
): { newHealth: number; actualCost: number } {
  if (canAffordMaintenance) {
    // Paying maintenance slowly repairs (max 5% per month)
    const repairRate = currentHealth < 100 ? Math.min(5, 100 - currentHealth) : 0;
    return {
      newHealth: Math.min(100, currentHealth + repairRate),
      actualCost: monthlyMaintenanceCost,
    };
  } else {
    // Can't pay: facility degrades 10% per month
    return {
      newHealth: Math.max(0, currentHealth - 10),
      actualCost: 0, // No payment made
    };
  }
}

// ─── 4. Risk/Reward Events ───────────────────────────────────────────────────
// High-risk decisions offer big payouts but can go wrong.

export interface RiskDecision {
  id: string;
  name: string;
  description: string;
  category: 'exploration' | 'investment' | 'expansion' | 'research' | 'trade';
  cost: number;
  successChance: number; // 0.0 to 1.0
  successReward: {
    money?: number;
    resources?: Record<string, number>;
    reputationGain?: number;
    bonusDescription: string;
  };
  failurePenalty: {
    moneyLoss?: number;
    resourceLoss?: Record<string, number>;
    reputationLoss?: number;
    penaltyDescription: string;
  };
  requiredResearch?: string[];
  requiredLocations?: string[];
  cooldownMonths: number; // Can't repeat this decision for N months
}

export const RISK_DECISIONS: RiskDecision[] = [
  // ─── LOW RISK (70-90% success) ─────────────────────────────────────
  {
    id: 'risk_asteroid_survey',
    name: 'Speculative Asteroid Survey',
    description: 'Send a probe to an uncharted asteroid. Could find valuable deposits.',
    category: 'exploration',
    cost: 50_000_000,
    successChance: 0.80,
    successReward: { money: 200_000_000, resources: { platinum_group: 10, gold: 15 }, reputationGain: 10, bonusDescription: 'Rich asteroid discovered! Valuable metals recovered.' },
    failurePenalty: { moneyLoss: 50_000_000, reputationLoss: 2, penaltyDescription: 'Probe lost in transit. Investment gone.' },
    cooldownMonths: 6,
  },
  {
    id: 'risk_market_speculation',
    name: 'Resource Market Speculation',
    description: 'Buy a large position in a volatile resource, betting on price increase.',
    category: 'trade',
    cost: 100_000_000,
    successChance: 0.65,
    successReward: { money: 300_000_000, reputationGain: 5, bonusDescription: 'Market moved in your favor! 3x return.' },
    failurePenalty: { moneyLoss: 100_000_000, reputationLoss: 5, penaltyDescription: 'Market crashed. Full investment lost.' },
    cooldownMonths: 3,
  },

  // ─── MEDIUM RISK (40-60% success) ──────────────────────────────────
  {
    id: 'risk_deep_space_expedition',
    name: 'Deep Space Expedition',
    description: 'Send a crewed mission to an uncharted region. High reward potential but dangerous.',
    category: 'exploration',
    cost: 500_000_000,
    successChance: 0.55,
    successReward: { money: 2_000_000_000, resources: { exotic_materials: 20, helium3: 10 }, reputationGain: 50, bonusDescription: 'Expedition discovered exotic material deposits worth billions!' },
    failurePenalty: { moneyLoss: 500_000_000, reputationLoss: 20, penaltyDescription: 'Expedition failed. Crew rescued but equipment lost.' },
    requiredResearch: ['interplanetary_cruisers'],
    cooldownMonths: 12,
  },
  {
    id: 'risk_hostile_takeover',
    name: 'Corporate Acquisition Bid',
    description: 'Attempt to acquire a failing competitor\'s assets at a discount.',
    category: 'investment',
    cost: 1_000_000_000,
    successChance: 0.50,
    successReward: { money: 3_000_000_000, reputationGain: 30, bonusDescription: 'Acquisition successful! Gained competitor\'s best assets.' },
    failurePenalty: { moneyLoss: 1_000_000_000, reputationLoss: 30, penaltyDescription: 'Bid rejected. Legal fees and reputation damage.' },
    cooldownMonths: 18,
  },

  // ─── HIGH RISK (20-35% success) ────────────────────────────────────
  {
    id: 'risk_frontier_colony',
    name: 'Frontier Colony Rush',
    description: 'Establish a colony on an unstable body. First-mover advantage if successful.',
    category: 'expansion',
    cost: 5_000_000_000,
    successChance: 0.35,
    successReward: { money: 20_000_000_000, resources: { antimatter_precursors: 5, deuterium: 10 }, reputationGain: 200, bonusDescription: 'Colony thriving! Exclusive access to rare resources.' },
    failurePenalty: { moneyLoss: 5_000_000_000, reputationLoss: 50, penaltyDescription: 'Colony failed due to environmental hazards. Investment lost.' },
    requiredResearch: ['nuclear_thermal'],
    requiredLocations: ['jupiter_system'],
    cooldownMonths: 24,
  },
  {
    id: 'risk_antimatter_experiment',
    name: 'Antimatter Production Experiment',
    description: 'Attempt experimental antimatter production. Could revolutionize energy.',
    category: 'research',
    cost: 10_000_000_000,
    successChance: 0.25,
    successReward: { money: 50_000_000_000, resources: { antimatter_precursors: 30 }, reputationGain: 500, bonusDescription: 'Breakthrough! Antimatter production rate doubled.' },
    failurePenalty: { moneyLoss: 10_000_000_000, reputationLoss: 100, penaltyDescription: 'Containment failure. Massive financial loss.' },
    requiredResearch: ['fusion_drive'],
    cooldownMonths: 36,
  },

  // ─── EXTREME RISK (10-15% success) ─────────────────────────────────
  {
    id: 'risk_warp_field_test',
    name: 'Experimental Warp Field Test',
    description: 'Attempt to generate a microscopic warp bubble. Paradigm-shifting if it works.',
    category: 'research',
    cost: 50_000_000_000,
    successChance: 0.12,
    successReward: { money: 500_000_000_000, resources: { antimatter_precursors: 100 }, reputationGain: 5000, bonusDescription: 'WARP FIELD GENERATED! You changed the course of human history.' },
    failurePenalty: { moneyLoss: 50_000_000_000, reputationLoss: 500, penaltyDescription: 'Experiment failed catastrophically. Equipment destroyed.' },
    requiredResearch: ['antimatter_propulsion'],
    cooldownMonths: 48,
  },
];

// ─── 5. Alliance Shared Facilities ───────────────────────────────────────────
// Alliances can pool resources to build shared starbases and facilities.

export interface SharedFacility {
  id: string;
  name: string;
  type: 'starbase' | 'trade_hub' | 'research_center' | 'shipyard' | 'defense_platform';
  locationId: string;
  allianceId: string;
  buildCost: number;
  monthlyMaintenance: number;
  monthlyRevenue: number;
  healthPct: number;
  contributorShares: Record<string, number>; // profileId → % share of revenue
  bonuses: {
    memberRevenue?: number; // +X% revenue for all alliance members
    memberMining?: number;  // +X% mining for all members
    memberResearch?: number; // +X% research speed
    memberDefense?: number; // +X% protection from hostile events
  };
}

export const SHARED_FACILITY_TYPES = [
  {
    type: 'starbase',
    name: 'Alliance Starbase',
    buildCost: 50_000_000_000,
    monthlyMaintenance: 25_000_000,
    monthlyRevenue: 100_000_000,
    bonuses: { memberRevenue: 0.10, memberDefense: 0.20 },
    description: 'A massive orbital station jointly owned by alliance members. Provides 10% revenue boost and 20% protection.',
  },
  {
    type: 'trade_hub',
    name: 'Alliance Trade Hub',
    buildCost: 30_000_000_000,
    monthlyMaintenance: 15_000_000,
    monthlyRevenue: 80_000_000,
    bonuses: { memberRevenue: 0.05, memberMining: 0.10 },
    description: 'Shared marketplace. Members get better trade prices and 10% mining bonus.',
  },
  {
    type: 'research_center',
    name: 'Alliance Research Center',
    buildCost: 40_000_000_000,
    monthlyMaintenance: 20_000_000,
    monthlyRevenue: 60_000_000,
    bonuses: { memberResearch: 0.15 },
    description: 'Shared R&D facility. All members get 15% research speed boost.',
  },
  {
    type: 'shipyard',
    name: 'Alliance Shipyard',
    buildCost: 35_000_000_000,
    monthlyMaintenance: 18_000_000,
    monthlyRevenue: 70_000_000,
    bonuses: { memberMining: 0.15 },
    description: 'Shared ship construction. Members build ships 15% faster.',
  },
  {
    type: 'defense_platform',
    name: 'Alliance Defense Platform',
    buildCost: 25_000_000_000,
    monthlyMaintenance: 12_000_000,
    monthlyRevenue: 40_000_000,
    bonuses: { memberDefense: 0.30, memberRevenue: 0.03 },
    description: 'Orbital defense. Protects alliance territory from hostile events.',
  },
];

// ─── 6. Facility Contestability ──────────────────────────────────────────────
// Colonies and key facilities can be CONTESTED by other players/alliances.
// This ensures no resource or location is permanently locked.

export interface ContestableLocation {
  locationId: string;
  controllerId: string | null; // GameProfile ID, null = unclaimed
  controllerAllianceId: string | null;
  controlStrength: number; // 0-100, decays if not maintained
  contestCost: number; // Cost to initiate a contest
  contestDuration: number; // Months to resolve
  monthlyUpkeep: number; // Cost to maintain control
}

export function calculateContestOutcome(
  attackerStrength: number, // Based on fleet size, research, money
  defenderStrength: number, // Based on facilities, defense platforms, alliance size
): { attackerWins: boolean; margin: number } {
  // Add randomness (±20%)
  const attackRoll = attackerStrength * (0.8 + Math.random() * 0.4);
  const defendRoll = defenderStrength * (0.8 + Math.random() * 0.4);

  return {
    attackerWins: attackRoll > defendRoll,
    margin: Math.abs(attackRoll - defendRoll) / Math.max(attackRoll, defendRoll),
  };
}

// Contest costs scale with location value
export function getContestCost(locationId: string): number {
  const CONTEST_COSTS: Record<string, number> = {
    ceres_surface: 5_000_000_000,
    mercury_surface: 8_000_000_000,
    venus_orbit: 6_000_000_000,
    io_surface: 10_000_000_000,
    europa_surface: 15_000_000_000,
    ganymede_surface: 12_000_000_000,
    callisto_surface: 8_000_000_000,
    titan_surface: 20_000_000_000,
    enceladus_surface: 25_000_000_000,
    titania_surface: 30_000_000_000,
    triton_surface: 50_000_000_000,
    pluto_surface: 100_000_000_000,
  };
  return CONTEST_COSTS[locationId] || 5_000_000_000;
}

// ─── 7. Reputation Events ────────────────────────────────────────────────────
// Actions that earn or lose reputation.

export const REPUTATION_EVENTS = {
  // Positive
  complete_contract: 10,
  fill_bounty: 5,
  complete_research: 3,
  build_colony: 50,
  first_colonizer_bonus: 200,
  win_seasonal_milestone: 100,
  mentor_new_player: 20,
  alliance_contribution: 15,

  // Negative
  fail_contract: -20,
  default_on_debt: -50,
  abandon_colony: -100,
  failed_risk_decision: -10,
  hostile_takeover_attempt: -30,
};

// ─── 8. Game Balance Constants ───────────────────────────────────────────────

export const COMPETITIVE_BALANCE = {
  // Revenue scaling — ensures income grows enough to fund endgame
  earlyGameMonthlyTarget: 10_000_000, // $10M/mo by month 2
  midGameMonthlyTarget: 200_000_000, // $200M/mo by month 6
  lateGameMonthlyTarget: 1_000_000_000, // $1B/mo by month 12
  endGameMonthlyTarget: 5_000_000_000, // $5B/mo by year 2

  // Expansion pacing — how long it takes to reach each tier
  tier3AccessMonths: 2, // Inner system colonies at 2 months
  tier4AccessMonths: 6, // Jupiter moons at 6 months
  tier5AccessMonths: 12, // Saturn/Uranus at 12 months
  tier6AccessMonths: 18, // Neptune/Pluto at 18 months

  // Competition intensity
  maxPlayersPerLocation: {
    mercury: 50, venus: 30, ceres: 100,
    io: 20, europa: 25, ganymede: 60, callisto: 40,
    titan: 40, enceladus: 15, titania: 20,
    triton: 10, pluto: 5,
  },

  // Late joiner runway (months to become competitive)
  lateJoinerCompetitiveMonths: 2, // Within 2 months of joining
  maxPioneerBonus: 5_000_000_000, // $5B cap

  // Risk/reward balance
  lowRiskReturn: 3, // 3x return on low-risk decisions
  medRiskReturn: 5, // 5x on medium
  highRiskReturn: 10, // 10x on high
  extremeRiskReturn: 20, // 20x on extreme (but only 12% success)
};
