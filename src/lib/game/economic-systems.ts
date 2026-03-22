// ─── Space Tycoon: Advanced Economic Systems ─────────────────────────────────
// Designed for 500+ player competitive gameplay with deep strategy.
//
// CORE ECONOMIC SYSTEMS:
// 1. Supply Chain Dependencies — forces inter-player trade
// 2. Resource Scarcity Curves — diminishing returns on extraction
// 3. Technology Licensing — sell research to other players
// 4. Infrastructure Monopolies — control trade routes
// 5. Economic Cycles — boom/bust dynamics
// 6. Contract Bidding — competitive procurement
// 7. Insurance Markets — risk management
// 8. Futures Trading — speculate on resource prices
// 9. Tax & Tariff System — location-based fees
// 10. Credit & Debt — borrow against future revenue

// ─── 1. Supply Chain Dependency Matrix ───────────────────────────────────────
// Every major operation requires inputs from other locations.
// This forces players to either control multiple locations or trade.

export interface SupplyChainNode {
  locationId: string;
  inputs: { resourceId: string; amountPerMonth: number; source: string }[];
  outputs: { resourceId: string; amountPerMonth: number }[];
  processingBonus: number; // % bonus if all inputs are locally sourced
}

export const SUPPLY_CHAIN_NODES: SupplyChainNode[] = [
  // Inner system produces metals, needs fuel
  {
    locationId: 'earth_surface',
    inputs: [],
    outputs: [{ resourceId: 'aluminum', amountPerMonth: 100 }],
    processingBonus: 0,
  },
  {
    locationId: 'mercury_surface',
    inputs: [
      { resourceId: 'lunar_water', amountPerMonth: 50, source: 'lunar_surface' },
      { resourceId: 'aluminum', amountPerMonth: 20, source: 'earth_surface' },
    ],
    outputs: [
      { resourceId: 'iron', amountPerMonth: 800 },
      { resourceId: 'titanium', amountPerMonth: 100 },
      { resourceId: 'solar_concentrate', amountPerMonth: 200 },
    ],
    processingBonus: 0.25, // +25% if all inputs are locally sourced
  },
  // Outer system produces fuel/exotics, needs metals
  {
    locationId: 'titan_surface',
    inputs: [
      { resourceId: 'iron', amountPerMonth: 100, source: 'asteroid_belt' },
      { resourceId: 'titanium', amountPerMonth: 30, source: 'mars_surface' },
      { resourceId: 'rare_earth', amountPerMonth: 10, source: 'asteroid_belt' },
    ],
    outputs: [
      { resourceId: 'methane', amountPerMonth: 600 },
      { resourceId: 'ethane', amountPerMonth: 300 },
      { resourceId: 'organic_compounds', amountPerMonth: 10 },
    ],
    processingBonus: 0.30,
  },
];

// ─── 2. Resource Scarcity System ─────────────────────────────────────────────
// Mining output decreases over time as deposits are exhausted.
// Forces players to explore new locations or invest in extraction tech.

export interface ScarcityLevel {
  thresholdMined: number; // Total units mined before this kicks in
  outputMultiplier: number; // Mining output multiplied by this
  name: string;
}

export const SCARCITY_LEVELS: ScarcityLevel[] = [
  { thresholdMined: 0, outputMultiplier: 1.0, name: 'Abundant' },
  { thresholdMined: 10_000, outputMultiplier: 0.85, name: 'Moderate' },
  { thresholdMined: 50_000, outputMultiplier: 0.65, name: 'Declining' },
  { thresholdMined: 200_000, outputMultiplier: 0.40, name: 'Scarce' },
  { thresholdMined: 1_000_000, outputMultiplier: 0.20, name: 'Depleted' },
  { thresholdMined: 5_000_000, outputMultiplier: 0.05, name: 'Exhausted' },
];

export function getScarcityMultiplier(totalMined: number): number {
  for (let i = SCARCITY_LEVELS.length - 1; i >= 0; i--) {
    if (totalMined >= SCARCITY_LEVELS[i].thresholdMined) {
      return SCARCITY_LEVELS[i].outputMultiplier;
    }
  }
  return 1.0;
}

export function getScarcityName(totalMined: number): string {
  for (let i = SCARCITY_LEVELS.length - 1; i >= 0; i--) {
    if (totalMined >= SCARCITY_LEVELS[i].thresholdMined) {
      return SCARCITY_LEVELS[i].name;
    }
  }
  return 'Abundant';
}

// ─── 3. Technology Licensing ─────────────────────────────────────────────────
// Players who complete research first can license it to others.
// Creates a tech brokerage market.

export interface TechLicense {
  researchId: string;
  ownerId: string; // GameProfile ID of the patent holder
  ownerCompanyName: string;
  licenseFee: number; // One-time fee to license
  royaltyRate: number; // % of revenue from services enabled by this tech
  licensees: string[]; // GameProfile IDs who have licensed
  createdAt: number;
}

export function calculateLicenseFee(researchCost: number, tier: number): number {
  // License fee = 20% of research cost × tier multiplier
  return Math.round(researchCost * 0.2 * (1 + tier * 0.1));
}

export function calculateRoyaltyRate(tier: number): number {
  // 2% base + 0.5% per tier (max 7% at tier 10)
  return Math.min(0.07, 0.02 + tier * 0.005);
}

// ─── 4. Infrastructure Monopoly System ───────────────────────────────────────
// Control of key infrastructure grants economic advantages.

export interface InfrastructureControl {
  facilityType: string;
  locationId: string;
  controllerId: string; // GameProfile ID
  transitFee: number; // Fee charged to other players per unit of cargo
  maxTransitFee: number; // Cap to prevent griefing
  monopolyBonus: number; // Revenue bonus for controlling a chokepoint
}

export const CHOKEPOINT_LOCATIONS: { locationId: string; maxFee: number; bonus: number }[] = [
  { locationId: 'ceres_surface', maxFee: 1000, bonus: 0.15 }, // Belt logistics hub
  { locationId: 'callisto_surface', maxFee: 5000, bonus: 0.10 }, // Outer system staging
  { locationId: 'mars_orbit', maxFee: 2000, bonus: 0.12 }, // Mars-belt corridor
  { locationId: 'lunar_orbit', maxFee: 500, bonus: 0.08 }, // Cislunar corridor
];

// ─── 5. Economic Cycles ─────────────────────────────────────────────────────
// Global economic conditions that affect all players.

export type EconomicPhase = 'boom' | 'growth' | 'stable' | 'contraction' | 'recession';

export interface EconomicCycle {
  phase: EconomicPhase;
  revenueMultiplier: number;
  costMultiplier: number;
  resourceDemandMultiplier: number;
  durationMonths: number;
}

export const ECONOMIC_CYCLES: EconomicCycle[] = [
  { phase: 'boom', revenueMultiplier: 1.30, costMultiplier: 1.10, resourceDemandMultiplier: 1.50, durationMonths: 12 },
  { phase: 'growth', revenueMultiplier: 1.15, costMultiplier: 1.05, resourceDemandMultiplier: 1.20, durationMonths: 18 },
  { phase: 'stable', revenueMultiplier: 1.00, costMultiplier: 1.00, resourceDemandMultiplier: 1.00, durationMonths: 24 },
  { phase: 'contraction', revenueMultiplier: 0.85, costMultiplier: 1.10, resourceDemandMultiplier: 0.80, durationMonths: 12 },
  { phase: 'recession', revenueMultiplier: 0.70, costMultiplier: 1.20, resourceDemandMultiplier: 0.60, durationMonths: 8 },
];

/** Get the current economic phase based on game month */
export function getCurrentEconomicPhase(gameMonth: number): EconomicCycle {
  // Cycle through phases deterministically
  const totalCycleDuration = ECONOMIC_CYCLES.reduce((sum, c) => sum + c.durationMonths, 0);
  let monthInCycle = gameMonth % totalCycleDuration;

  for (const cycle of ECONOMIC_CYCLES) {
    if (monthInCycle < cycle.durationMonths) return cycle;
    monthInCycle -= cycle.durationMonths;
  }
  return ECONOMIC_CYCLES[2]; // Stable fallback
}

// ─── 6. Contract Bidding System ──────────────────────────────────────────────
// Government and commercial contracts that players bid on competitively.

export interface CompetitiveContract {
  id: string;
  title: string;
  description: string;
  category: 'government' | 'commercial' | 'scientific' | 'military';
  requirements: {
    minResearchCount?: number;
    minBuildingCount?: number;
    requiredLocations?: string[];
    requiredResources?: Record<string, number>;
  };
  reward: {
    money: number;
    resources?: Record<string, number>;
    reputationBonus?: number;
  };
  duration: number; // Months to complete
  maxBidders: number; // How many can bid
  minBid: number; // Minimum bid to qualify
}

export const GOVERNMENT_CONTRACTS: CompetitiveContract[] = [
  {
    id: 'gov_lunar_gateway', title: 'Lunar Gateway Construction', category: 'government',
    description: 'NASA contract to build and operate a lunar orbital station.',
    requirements: { minResearchCount: 5, requiredLocations: ['lunar_orbit'] },
    reward: { money: 5_000_000_000, reputationBonus: 100 },
    duration: 36, maxBidders: 5, minBid: 500_000_000,
  },
  {
    id: 'gov_mars_base', title: 'Mars Base Alpha', category: 'government',
    description: 'International contract for the first permanent Mars settlement.',
    requirements: { minResearchCount: 15, requiredLocations: ['mars_surface'] },
    reward: { money: 25_000_000_000, resources: { titanium: 500, rare_earth: 200 }, reputationBonus: 500 },
    duration: 60, maxBidders: 3, minBid: 5_000_000_000,
  },
  {
    id: 'gov_asteroid_defense', title: 'Planetary Defense Network', category: 'military',
    description: 'Build an asteroid detection and deflection system.',
    requirements: { minResearchCount: 10, requiredLocations: ['asteroid_belt'] },
    reward: { money: 15_000_000_000, reputationBonus: 300 },
    duration: 48, maxBidders: 5, minBid: 2_000_000_000,
  },
  {
    id: 'gov_europa_mission', title: 'Europa Life Detection', category: 'scientific',
    description: 'Scientific expedition to search for life in Europa\'s ocean.',
    requirements: { minResearchCount: 20, requiredLocations: ['europa_surface'] },
    reward: { money: 50_000_000_000, resources: { bio_samples: 20, exotic_materials: 50 }, reputationBonus: 1000 },
    duration: 72, maxBidders: 2, minBid: 10_000_000_000,
  },
  {
    id: 'gov_fusion_reactor', title: 'Fusion Power Demonstration', category: 'scientific',
    description: 'Build and demonstrate a commercial fusion reactor in space.',
    requirements: { minResearchCount: 25, requiredResources: { deuterium: 10, helium3: 20 } },
    reward: { money: 100_000_000_000, reputationBonus: 2000 },
    duration: 96, maxBidders: 2, minBid: 20_000_000_000,
  },
];

// ─── 7. Reputation System ────────────────────────────────────────────────────
// Player reputation affects contract access, alliance invitations, and pricing.

export interface ReputationTier {
  minReputation: number;
  name: string;
  benefits: string;
  contractDiscount: number; // % discount on contract bids
  tradeBonus: number; // % better prices when trading
}

export const REPUTATION_TIERS: ReputationTier[] = [
  { minReputation: 0, name: 'Unknown', benefits: 'No special benefits', contractDiscount: 0, tradeBonus: 0 },
  { minReputation: 100, name: 'Recognized', benefits: 'Access to tier 1 gov contracts', contractDiscount: 0.02, tradeBonus: 0.01 },
  { minReputation: 500, name: 'Established', benefits: 'Access to tier 2 contracts, +1% trade prices', contractDiscount: 0.05, tradeBonus: 0.02 },
  { minReputation: 1000, name: 'Respected', benefits: 'Priority contract access, +2% trade', contractDiscount: 0.08, tradeBonus: 0.03 },
  { minReputation: 2500, name: 'Prestigious', benefits: 'Exclusive contracts, +3% trade', contractDiscount: 0.10, tradeBonus: 0.05 },
  { minReputation: 5000, name: 'Legendary', benefits: 'All contracts available, +5% trade', contractDiscount: 0.15, tradeBonus: 0.08 },
  { minReputation: 10000, name: 'Galactic Authority', benefits: 'Set market policies, +10% trade', contractDiscount: 0.20, tradeBonus: 0.10 },
];

export function getReputationTier(reputation: number): ReputationTier {
  for (let i = REPUTATION_TIERS.length - 1; i >= 0; i--) {
    if (reputation >= REPUTATION_TIERS[i].minReputation) return REPUTATION_TIERS[i];
  }
  return REPUTATION_TIERS[0];
}

// ─── 8. Strategic Resource Categories ────────────────────────────────────────
// Resources grouped by strategic importance for competitive play.

export const STRATEGIC_RESOURCE_GROUPS = {
  // Construction materials — needed for all building
  construction: ['iron', 'aluminum', 'titanium', 'steel_ingots', 'structural_beams'],
  // Energy resources — needed for operations
  energy: ['solar_concentrate', 'methane', 'ethane', 'helium3', 'deuterium'],
  // Advanced materials — needed for research and high-tier buildings
  advanced: ['rare_earth', 'platinum_group', 'gold', 'exotic_materials'],
  // Life support — needed for colonies
  life_support: ['lunar_water', 'mars_water', 'ammonia', 'organic_compounds'],
  // Endgame — needed for tier 8-10 research
  endgame: ['bio_samples', 'antimatter_precursors', 'deuterium'],
};

// ─── 9. Victory Conditions ───────────────────────────────────────────────────
// Multiple paths to victory in competitive play.

export interface VictoryCondition {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (stats: {
    netWorth: number;
    researchCount: number;
    locationsUnlocked: number;
    buildingCount: number;
    serviceCount: number;
    reputation: number;
    allianceSize: number;
  }) => boolean;
}

export const VICTORY_CONDITIONS: VictoryCondition[] = [
  {
    id: 'economic_domination', name: 'Economic Domination', icon: '💰',
    description: 'Accumulate $10 trillion in net worth.',
    check: (s) => s.netWorth >= 10_000_000_000_000,
  },
  {
    id: 'tech_singularity', name: 'Technological Singularity', icon: '🧠',
    description: 'Complete 500 research projects.',
    check: (s) => s.researchCount >= 500,
  },
  {
    id: 'solar_emperor', name: 'Solar Emperor', icon: '👑',
    description: 'Establish colonies on all 25 solar system bodies.',
    check: (s) => s.locationsUnlocked >= 25,
  },
  {
    id: 'industrial_titan', name: 'Industrial Titan', icon: '🏗️',
    description: 'Build 100 facilities and run 50 services.',
    check: (s) => s.buildingCount >= 100 && s.serviceCount >= 50,
  },
  {
    id: 'galactic_authority', name: 'Galactic Authority', icon: '🌌',
    description: 'Reach Galactic Authority reputation and lead an alliance of 20.',
    check: (s) => s.reputation >= 10000 && s.allianceSize >= 20,
  },
];
