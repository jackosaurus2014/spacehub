// ─── Space Tycoon: Contract Bidding System ────────────────────────────────────
//
// Sealed-bid, first-price auction system for high-value NPC contracts.
// Players submit bids during a window, then bids are evaluated by composite
// score: 70% price + 15% reputation + 15% delivery speed.
//
// Contract types: satellite_deployment, resource_delivery, station_construction,
// fleet_transport, research_partnership, emergency_supply, mining_rights_lease.

import { getGlobalGameDate, REAL_SECONDS_PER_GAME_MONTH } from './server-time';
import { getCurrentEconomicPhase, getReputationTier } from './economic-systems';
import type { EconomicCycle } from './economic-systems';

// ─── Contract Type Definitions ──────────────────────────────────────────────

export interface BiddingContractType {
  type: string;
  category: string;
  icon: string;
  baseValue: number;
  availableTiers: number[];
  deliveryMonthsByTier: Record<number, number>;
  supportsPartialFulfillment: boolean;
  bidDirection: 'reverse' | 'forward'; // reverse = lowest wins, forward = highest wins
  clients: string[];
  titleTemplates: string[];
  descriptionTemplates: string[];
}

export const CONTRACT_TYPES: Record<string, BiddingContractType> = {
  satellite_deployment: {
    type: 'satellite_deployment',
    category: 'procurement',
    icon: 'satellite',
    baseValue: 150_000_000,
    availableTiers: [1, 2, 3, 4],
    deliveryMonthsByTier: { 1: 3, 2: 4, 3: 6, 4: 10 },
    supportsPartialFulfillment: false,
    bidDirection: 'reverse',
    clients: ['NASA', 'ESA', 'World Telecommunications Union', 'DARPA'],
    titleTemplates: [
      'LEO Satellite Constellation Deployment',
      'GEO Communication Satellite Array',
      'Mars Orbital Relay Network',
      'Deep Space Observation Platform',
    ],
    descriptionTemplates: [
      'Deploy {target} satellites at {location}. Full deployment required for payment.',
    ],
  },
  resource_delivery: {
    type: 'resource_delivery',
    category: 'supply',
    icon: 'package',
    baseValue: 200_000_000,
    availableTiers: [1, 2, 3, 4],
    deliveryMonthsByTier: { 1: 2, 2: 3, 3: 4, 4: 6 },
    supportsPartialFulfillment: true,
    bidDirection: 'reverse',
    clients: ['Mars Colony Authority', 'Interplanetary Mining Consortium', 'Fusion Authority', 'Board of Directors'],
    titleTemplates: [
      '{resource} Supply Contract',
      'Emergency {resource} Procurement',
      '{resource} Delivery to {location}',
      'Strategic {resource} Reserve Build-up',
    ],
    descriptionTemplates: [
      'Deliver {target} units of {resource}. Partial delivery accepted with reduced payment.',
    ],
  },
  station_construction: {
    type: 'station_construction',
    category: 'construction',
    icon: 'building',
    baseValue: 500_000_000,
    availableTiers: [2, 3, 4, 5],
    deliveryMonthsByTier: { 2: 6, 3: 8, 4: 12, 5: 18 },
    supportsPartialFulfillment: false,
    bidDirection: 'reverse',
    clients: ['Artemis Program Office', 'United Nations Space Command', 'Mars Colony Authority', 'Outer Planets Foundation'],
    titleTemplates: [
      '{location} Station Construction',
      '{location} Research Outpost',
      '{location} Deep Space Facility',
      '{location} Colony Hub Development',
    ],
    descriptionTemplates: [
      'Construct a station at {location}. Full construction required for payment.',
    ],
  },
  fleet_transport: {
    type: 'fleet_transport',
    category: 'transport',
    icon: 'ship',
    baseValue: 100_000_000,
    availableTiers: [1, 2, 3],
    deliveryMonthsByTier: { 1: 1, 2: 2, 3: 3 },
    supportsPartialFulfillment: true,
    bidDirection: 'reverse',
    clients: ['Interplanetary Logistics Authority', 'Space Logistics Corp', 'Board of Directors'],
    titleTemplates: [
      'Fleet Transport Operations',
      'Cargo Fleet Deployment',
      'Interplanetary Fleet Positioning',
    ],
    descriptionTemplates: [
      'Have {target} operational ships positioned at required locations.',
    ],
  },
  research_partnership: {
    type: 'research_partnership',
    category: 'procurement',
    icon: 'flask',
    baseValue: 250_000_000,
    availableTiers: [1, 2, 3],
    deliveryMonthsByTier: { 1: 4, 2: 6, 3: 10 },
    supportsPartialFulfillment: false,
    bidDirection: 'reverse',
    clients: ['Space Research Foundation', 'DARPA', 'Space Science Academy', 'ESA'],
    titleTemplates: [
      'Research Partnership Program',
      'Technology Development Initiative',
      'Advanced Research Collaboration',
    ],
    descriptionTemplates: [
      'Complete {target} research projects in the specified category.',
    ],
  },
  emergency_supply: {
    type: 'emergency_supply',
    category: 'emergency',
    icon: 'alert',
    baseValue: 300_000_000,
    availableTiers: [1, 2, 3, 4],
    deliveryMonthsByTier: { 1: 1, 2: 1, 3: 1, 4: 1 },
    supportsPartialFulfillment: false,
    bidDirection: 'reverse',
    clients: ['Fusion Authority', 'United Nations Space Command', 'Mars Colony Authority'],
    titleTemplates: [
      'URGENT: {resource} Emergency Supply',
      'Critical {resource} Shortage Response',
    ],
    descriptionTemplates: [
      'Urgent delivery of {target} {resource}. Short deadline, 100% required.',
    ],
  },
  mining_rights_lease: {
    type: 'mining_rights_lease',
    category: 'rights',
    icon: 'pickaxe',
    baseValue: 400_000_000,
    availableTiers: [2, 3, 4],
    deliveryMonthsByTier: { 2: 6, 3: 12, 4: 18 },
    supportsPartialFulfillment: false,
    bidDirection: 'forward', // Highest bid wins
    clients: ['Interplanetary Mining Consortium', 'Planetary Resources Foundation', 'Board of Directors'],
    titleTemplates: [
      '{location} Mining Rights Lease',
      'Exclusive {location} Extraction Permit',
    ],
    descriptionTemplates: [
      'Exclusive mining rights at {location} for {duration} months. +{bonus}% mining output.',
    ],
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────

export const TIER_VALUE_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 3.0,
  3: 10.0,
  4: 30.0,
  5: 100.0,
};

export const COLLATERAL_BY_TIER: Record<number, number> = {
  1: 0.05,
  2: 0.08,
  3: 0.10,
  4: 0.12,
  5: 0.15,
};

const BASE_MAX_ACTIVE = 12;
const MAX_ACTIVE_CAP = 20;
const MAX_CONCURRENT_BIDS = 3;
const MAX_CONCURRENT_WON = 2;
const MIN_BALANCE_AFTER_COLLATERAL = 1_000_000;
const MAX_SAME_TYPE_ACTIVE = 3;

// Tier distribution by game month bracket
const TIER_WEIGHTS_BY_MONTH: Record<string, Record<number, number>> = {
  'early': { 1: 0.75, 2: 0.25 },
  'mid_early': { 1: 0.35, 2: 0.50, 3: 0.15 },
  'mid': { 1: 0.15, 2: 0.35, 3: 0.40, 4: 0.10 },
  'mid_late': { 1: 0.10, 2: 0.25, 3: 0.35, 4: 0.25, 5: 0.05 },
  'late': { 1: 0.05, 2: 0.15, 3: 0.30, 4: 0.30, 5: 0.20 },
};

function getMonthBracket(gameMonth: number): string {
  if (gameMonth <= 6) return 'early';
  if (gameMonth <= 18) return 'mid_early';
  if (gameMonth <= 36) return 'mid';
  if (gameMonth <= 60) return 'mid_late';
  return 'late';
}

// Location names for display
const LOCATION_NAMES: Record<string, string> = {
  leo: 'Low Earth Orbit',
  geo: 'Geostationary Orbit',
  lunar_orbit: 'Lunar Orbit',
  lunar_surface: 'Lunar Surface',
  mars_orbit: 'Mars Orbit',
  mars_surface: 'Mars Surface',
  asteroid_belt: 'Asteroid Belt',
  ceres_surface: 'Ceres',
  mercury_surface: 'Mercury',
  jupiter_system: 'Jupiter System',
  io_surface: 'Io',
  europa_surface: 'Europa',
  titan_surface: 'Titan',
  pluto_surface: 'Pluto',
};

// Resources by tier
const RESOURCES_BY_TIER: Record<number, string[]> = {
  1: ['iron', 'aluminum'],
  2: ['titanium', 'rare_earth'],
  3: ['helium3', 'platinum_group'],
  4: ['exotic_materials', 'helium3'],
};

// Locations by tier
const LOCATIONS_BY_TIER: Record<number, string[]> = {
  1: ['leo', 'geo'],
  2: ['lunar_orbit', 'lunar_surface', 'mars_orbit'],
  3: ['mars_surface', 'asteroid_belt', 'ceres_surface'],
  4: ['jupiter_system', 'io_surface', 'europa_surface'],
  5: ['titan_surface', 'pluto_surface'],
};

// ─── Utility Functions ──────────────────────────────────────────────────────

function weightedRandom(weights: Record<number, number>): number {
  const entries = Object.entries(weights).map(([k, v]) => [Number(k), v] as [number, number]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Contract Generation ────────────────────────────────────────────────────

export interface GeneratedContract {
  contractType: string;
  tier: number;
  title: string;
  description: string;
  requirements: ContractRequirements;
  baseReward: number;
  minBid: number;
  maxBid: number;
  collateralPct: number;
  biddingEndsAt: Date;
  deliveryMonths: number;
  status: string;
}

export interface ContractRequirements {
  type: string;
  target: number;
  locationId?: string;
  resourceId?: string;
  categoryId?: string;
  leaseDurationMonths?: number;
  miningBonus?: number;
  label: string;
}

/**
 * Generate new bidding contracts for the current cycle.
 * @param activeCount - Number of currently open contracts
 * @param playerCount - Number of active players (last 24h)
 */
export function generateBiddingContracts(
  activeCount: number,
  playerCount: number,
): GeneratedContract[] {
  const gameDate = getGlobalGameDate();
  const gameMonth = gameDate.totalMonths;
  const currentPhase = getCurrentEconomicPhase(gameMonth);

  // Step 1: Calculate max active contracts
  let maxActive = BASE_MAX_ACTIVE + Math.floor(playerCount / 50);
  maxActive = Math.min(maxActive, MAX_ACTIVE_CAP);

  if (activeCount >= maxActive) return [];

  // Step 2: How many to generate
  let baseSlots = randomInt(2, 4);
  if (currentPhase.phase === 'recession') baseSlots += 1;
  if (currentPhase.phase === 'boom') baseSlots += 1;

  let slotsToFill = Math.min(baseSlots, maxActive - activeCount);

  // Ensure minimum floor
  if (activeCount < 6) {
    slotsToFill = Math.max(slotsToFill, 6 - activeCount);
  }

  // Step 3: Generate contracts
  const contracts: GeneratedContract[] = [];
  const bracket = getMonthBracket(gameMonth);
  const tierWeights = TIER_WEIGHTS_BY_MONTH[bracket];

  for (let i = 0; i < slotsToFill; i++) {
    const contract = generateSingleContract(gameMonth, tierWeights, currentPhase);
    if (contract) contracts.push(contract);
  }

  return contracts;
}

function generateSingleContract(
  gameMonth: number,
  tierWeights: Record<number, number>,
  econPhase: EconomicCycle,
): GeneratedContract | null {
  // Select tier
  const tier = weightedRandom(tierWeights);

  // Select contract type available at this tier
  const availableTypes = Object.values(CONTRACT_TYPES).filter(
    ct => ct.availableTiers.includes(tier)
  );
  if (availableTypes.length === 0) return null;

  const contractDef = randomElement(availableTypes);

  // Calculate estimated value
  const tierMultiplier = TIER_VALUE_MULTIPLIERS[tier] || 1;
  const econMultiplier = econPhase.revenueMultiplier;
  const jitter = 0.85 + Math.random() * 0.30;
  const estimatedValue = Math.round(contractDef.baseValue * tierMultiplier * econMultiplier * jitter);

  // Set bid bounds
  const minBid = Math.round(estimatedValue * 0.10);
  const maxBid = Math.round(estimatedValue * 2.00);

  // Set bid window
  let bidWindowHours: number;
  if (tier <= 2) bidWindowHours = randomFloat(6, 12);
  else if (tier === 3) bidWindowHours = randomFloat(12, 24);
  else bidWindowHours = randomFloat(24, 48);

  // Emergency contracts have shorter windows
  if (contractDef.type === 'emergency_supply') {
    bidWindowHours = randomFloat(1, 2);
  }

  const biddingEndsAt = new Date(Date.now() + bidWindowHours * 3600 * 1000);

  // Delivery months
  const deliveryMonths = contractDef.deliveryMonthsByTier[tier] || 3;

  // Generate requirements
  const requirements = generateRequirements(contractDef, tier);

  // Generate title
  const client = randomElement(contractDef.clients);
  const title = generateTitle(contractDef, tier, requirements);

  // Generate description
  const description = generateDescription(contractDef, requirements);

  const collateralPct = COLLATERAL_BY_TIER[tier] || 0.10;

  return {
    contractType: contractDef.type,
    tier,
    title: `${client}: ${title}`,
    description,
    requirements,
    baseReward: estimatedValue,
    minBid,
    maxBid,
    collateralPct,
    biddingEndsAt,
    deliveryMonths,
    status: 'open',
  };
}

function generateRequirements(def: BiddingContractType, tier: number): ContractRequirements {
  const locations = LOCATIONS_BY_TIER[tier] || LOCATIONS_BY_TIER[1];
  const resources = RESOURCES_BY_TIER[Math.min(tier, 4)] || RESOURCES_BY_TIER[1];

  switch (def.type) {
    case 'satellite_deployment': {
      const targets: Record<number, [number, number]> = { 1: [3, 5], 2: [8, 12], 3: [15, 20], 4: [30, 40] };
      const [min, max] = targets[tier] || [3, 5];
      const target = randomInt(min, max);
      const locationId = randomElement(locations);
      return {
        type: 'satellites_at_location',
        target,
        locationId,
        label: `Deploy ${target} satellites at ${LOCATION_NAMES[locationId] || locationId}`,
      };
    }
    case 'resource_delivery': {
      const targets: Record<number, [number, number]> = { 1: [200, 500], 2: [500, 2000], 3: [100, 500], 4: [10, 50] };
      const [min, max] = targets[tier] || [200, 500];
      const target = randomInt(min, max);
      const resourceId = randomElement(resources);
      return {
        type: 'resources_delivered',
        target,
        resourceId,
        label: `Deliver ${target} ${resourceId.replace(/_/g, ' ')}`,
      };
    }
    case 'station_construction': {
      const locationId = randomElement(locations);
      return {
        type: 'station_at_location',
        target: 1,
        locationId,
        label: `Build station at ${LOCATION_NAMES[locationId] || locationId}`,
      };
    }
    case 'fleet_transport': {
      const targets: Record<number, [number, number]> = { 1: [2, 3], 2: [5, 8], 3: [10, 15] };
      const [min, max] = targets[tier] || [2, 3];
      const target = randomInt(min, max);
      return {
        type: 'ships_at_location',
        target,
        label: `Have ${target} operational ships`,
      };
    }
    case 'research_partnership': {
      const targets: Record<number, [number, number]> = { 1: [2, 3], 2: [5, 8], 3: [10, 15] };
      const [min, max] = targets[tier] || [2, 3];
      const target = randomInt(min, max);
      const categories = ['rocketry', 'spacecraft', 'mining', 'propulsion', 'materials'];
      const categoryId = randomElement(categories);
      return {
        type: 'research_completed_category',
        target,
        categoryId,
        label: `Complete ${target} ${categoryId} research projects`,
      };
    }
    case 'emergency_supply': {
      const target = randomInt(50, 200);
      const resourceId = randomElement(resources);
      return {
        type: 'resources_delivered',
        target,
        resourceId,
        label: `URGENT: Deliver ${target} ${resourceId.replace(/_/g, ' ')}`,
      };
    }
    case 'mining_rights_lease': {
      const locationId = randomElement(locations);
      const leaseDurationMonths = def.deliveryMonthsByTier[tier] || 6;
      const bonusByTier: Record<number, number> = { 2: 25, 3: 35, 4: 50 };
      const miningBonus = bonusByTier[tier] || 25;
      return {
        type: 'mining_rights',
        target: 1,
        locationId,
        leaseDurationMonths,
        miningBonus,
        label: `Mining rights at ${LOCATION_NAMES[locationId] || locationId} (+${miningBonus}% output, ${leaseDurationMonths} months)`,
      };
    }
    default:
      return { type: 'generic', target: 1, label: 'Complete contract requirements' };
  }
}

function generateTitle(def: BiddingContractType, tier: number, reqs: ContractRequirements): string {
  const location = reqs.locationId ? (LOCATION_NAMES[reqs.locationId] || reqs.locationId) : '';
  const resource = reqs.resourceId ? reqs.resourceId.replace(/_/g, ' ') : '';

  switch (def.type) {
    case 'satellite_deployment':
      return `${location} Satellite Deployment (${reqs.target} units)`;
    case 'resource_delivery':
      return `${resource.charAt(0).toUpperCase() + resource.slice(1)} Delivery (${reqs.target} units)`;
    case 'station_construction':
      return `${location} Station Construction`;
    case 'fleet_transport':
      return `Fleet Transport Operations (${reqs.target} ships)`;
    case 'research_partnership':
      return `Research Partnership: ${reqs.categoryId || 'General'}`;
    case 'emergency_supply':
      return `EMERGENCY ${resource.toUpperCase()} Supply`;
    case 'mining_rights_lease':
      return `${location} Mining Rights Lease`;
    default:
      return def.titleTemplates[0] || 'Contract';
  }
}

function generateDescription(def: BiddingContractType, reqs: ContractRequirements): string {
  switch (def.type) {
    case 'satellite_deployment':
      return `Deploy ${reqs.target} satellites at ${LOCATION_NAMES[reqs.locationId!] || reqs.locationId}. Full deployment required for payment.`;
    case 'resource_delivery':
      return `Deliver ${reqs.target} units of ${(reqs.resourceId || '').replace(/_/g, ' ')}. Partial delivery accepted with reduced payment.`;
    case 'station_construction':
      return `Construct a station facility at ${LOCATION_NAMES[reqs.locationId!] || reqs.locationId}. Full construction required.`;
    case 'fleet_transport':
      return `Ensure ${reqs.target} operational ships are positioned and ready. Partial completion accepted.`;
    case 'research_partnership':
      return `Complete ${reqs.target} research projects in the ${reqs.categoryId || 'general'} category.`;
    case 'emergency_supply':
      return `URGENT: Deliver ${reqs.target} units of ${(reqs.resourceId || '').replace(/_/g, ' ')}. Short deadline, 100% delivery required.`;
    case 'mining_rights_lease':
      return `Exclusive mining rights at ${LOCATION_NAMES[reqs.locationId!] || reqs.locationId} for ${reqs.leaseDurationMonths} months with +${reqs.miningBonus}% mining output bonus. Highest bid wins.`;
    default:
      return 'Complete contract requirements.';
  }
}

// ─── Bid Evaluation ─────────────────────────────────────────────────────────

export interface BidForEvaluation {
  id: string;
  profileId: string;
  companyName: string;
  priceOffer: number;
  deliveryPromise: number;
  collateralLocked: number;
  reputationAtBid: number;
  reliabilityAtBid: number;
  createdAt: Date;
}

export interface ContractForEvaluation {
  id: string;
  contractType: string;
  minBid: number;
  maxBid: number;
  deliveryMonths: number;
  tier: number;
}

export interface BidEvaluationResult {
  bidId: string;
  profileId: string;
  companyName: string;
  compositeScore: number;
  priceScore: number;
  repScore: number;
  deliveryScore: number;
  isWinner: boolean;
}

/**
 * Evaluate all bids for a contract and determine the winner.
 * Uses composite score: 70% price + 15% reputation + 15% delivery speed.
 */
export function evaluateBids(
  contract: ContractForEvaluation,
  bids: BidForEvaluation[],
): BidEvaluationResult[] {
  if (bids.length === 0) return [];

  const contractDef = CONTRACT_TYPES[contract.contractType];
  const isForwardAuction = contractDef?.bidDirection === 'forward';

  // Calculate max reputation in pool
  const maxRepInPool = Math.max(...bids.map(b => b.reputationAtBid), 1);

  const scored = bids.map(bid => {
    // Price score (0-100)
    let priceScore: number;
    const priceRange = contract.maxBid - contract.minBid;

    if (isForwardAuction) {
      // Forward: highest bid is best
      priceScore = priceRange > 0
        ? 100 * ((bid.priceOffer - contract.minBid) / priceRange)
        : 50;
    } else {
      // Reverse: lowest bid is best
      priceScore = priceRange > 0
        ? 100 * (1 - (bid.priceOffer - contract.minBid) / priceRange)
        : 50;
    }
    priceScore = clamp(priceScore, 0, 100);

    // Reputation score (0-100)
    let repScore: number;
    if (maxRepInPool === 0) {
      repScore = 50; // All unknown, neutral
    } else {
      repScore = 100 * (bid.reputationAtBid / maxRepInPool);
    }

    // Delivery score (0-100) - shorter is better
    let deliveryScore: number;
    if (isForwardAuction) {
      deliveryScore = 50; // Not applicable for forward auctions
    } else {
      deliveryScore = contract.deliveryMonths > 0
        ? 100 * (1 - bid.deliveryPromise / contract.deliveryMonths)
        : 50;
      deliveryScore = clamp(deliveryScore, 0, 100);
    }

    // Composite score
    let compositeScore: number;
    if (isForwardAuction) {
      compositeScore = (priceScore * 0.85) + (repScore * 0.15);
    } else {
      compositeScore = (priceScore * 0.70) + (repScore * 0.15) + (deliveryScore * 0.15);
    }

    // Apply reputation-tier discount bonus
    const repTier = getReputationTier(bid.reputationAtBid);
    compositeScore *= (1 + repTier.contractDiscount);

    // Apply reliability bonus/penalty
    if (bid.reliabilityAtBid >= 0.90) {
      compositeScore *= 1.05;
    } else if (bid.reliabilityAtBid < 0.30) {
      compositeScore *= 0.80;
    } else if (bid.reliabilityAtBid < 0.50) {
      compositeScore *= 0.90;
    }

    return {
      bidId: bid.id,
      profileId: bid.profileId,
      companyName: bid.companyName,
      compositeScore: Math.round(compositeScore * 10000) / 10000,
      priceScore: Math.round(priceScore * 100) / 100,
      repScore: Math.round(repScore * 100) / 100,
      deliveryScore: Math.round(deliveryScore * 100) / 100,
      isWinner: false,
      // Keep original bid data for tiebreaking
      _reputationAtBid: bid.reputationAtBid,
      _deliveryPromise: bid.deliveryPromise,
      _createdAt: bid.createdAt,
    };
  }) as (BidEvaluationResult & { _reputationAtBid: number; _deliveryPromise: number; _createdAt: Date })[];

  // Sort by composite score descending, then tiebreak
  scored.sort((a, b) => {
    if (Math.abs(a.compositeScore - b.compositeScore) > 0.0001) {
      return b.compositeScore - a.compositeScore;
    }
    // Tiebreak 1: reputation
    if (a._reputationAtBid !== b._reputationAtBid) {
      return b._reputationAtBid - a._reputationAtBid;
    }
    // Tiebreak 2: delivery promise (lower is better)
    if (a._deliveryPromise !== b._deliveryPromise) {
      return a._deliveryPromise - b._deliveryPromise;
    }
    // Tiebreak 3: earlier bid wins
    return a._createdAt.getTime() - b._createdAt.getTime();
  });

  // Mark winner
  if (scored.length > 0) {
    scored[0].isWinner = true;
  }

  // Strip internal fields and return
  return scored.map(({ _reputationAtBid, _deliveryPromise, _createdAt, ...rest }) => rest);
}

// ─── Fulfillment Checking ───────────────────────────────────────────────────

export interface GameProfileForFulfillment {
  buildingsData: unknown;
  resources: unknown;
  completedResearchList: string[];
  shipsData: unknown;
  unlockedLocationsList: string[];
}

export interface FulfillmentResult {
  percentage: number;
  details: string;
  isFulfilled: boolean;
}

/**
 * Check if a winner can fulfill a contract based on their current game state.
 */
export function checkContractFulfillment(
  requirements: ContractRequirements,
  profile: GameProfileForFulfillment,
): FulfillmentResult {
  switch (requirements.type) {
    case 'satellites_at_location': {
      const buildings = (profile.buildingsData as Array<{ definitionId: string; locationId: string; isComplete: boolean }>) || [];
      const count = buildings.filter(b =>
        b.isComplete &&
        (b.definitionId.startsWith('sat_') || b.definitionId.includes('telecom') || b.definitionId.includes('sensor')) &&
        (!requirements.locationId || b.locationId === requirements.locationId)
      ).length;
      const pct = Math.min(100, (count / requirements.target) * 100);
      return {
        percentage: pct,
        details: `${count}/${requirements.target} satellites at ${LOCATION_NAMES[requirements.locationId!] || requirements.locationId || 'target'}`,
        isFulfilled: count >= requirements.target,
      };
    }
    case 'resources_delivered': {
      const resources = (profile.resources as Record<string, number>) || {};
      const available = resources[requirements.resourceId!] || 0;
      const pct = Math.min(100, (available / requirements.target) * 100);
      return {
        percentage: pct,
        details: `${available}/${requirements.target} ${(requirements.resourceId || '').replace(/_/g, ' ')} available`,
        isFulfilled: available >= requirements.target,
      };
    }
    case 'station_at_location': {
      const buildings = (profile.buildingsData as Array<{ definitionId: string; locationId: string; isComplete: boolean }>) || [];
      const count = buildings.filter(b =>
        b.isComplete &&
        b.definitionId.includes('space_station') &&
        (!requirements.locationId || b.locationId === requirements.locationId)
      ).length;
      const pct = count >= requirements.target ? 100 : 0;
      return {
        percentage: pct,
        details: `${count}/${requirements.target} station(s) at ${LOCATION_NAMES[requirements.locationId!] || requirements.locationId || 'target'}`,
        isFulfilled: count >= requirements.target,
      };
    }
    case 'ships_at_location': {
      const ships = (profile.shipsData as Array<{ isBuilt: boolean }>) || [];
      const count = ships.filter(s => s.isBuilt).length;
      const pct = Math.min(100, (count / requirements.target) * 100);
      return {
        percentage: pct,
        details: `${count}/${requirements.target} operational ships`,
        isFulfilled: count >= requirements.target,
      };
    }
    case 'research_completed_category': {
      // Count completed research (simple count since we don't have category mapping in this scope)
      const count = profile.completedResearchList.length;
      const pct = Math.min(100, (count / requirements.target) * 100);
      return {
        percentage: pct,
        details: `${count}/${requirements.target} research projects completed`,
        isFulfilled: count >= requirements.target,
      };
    }
    case 'mining_rights': {
      // Mining rights are always fulfilled immediately (forward auction, paid upfront)
      return {
        percentage: 100,
        details: 'Mining rights lease active',
        isFulfilled: true,
      };
    }
    default:
      return { percentage: 0, details: 'Unknown requirement type', isFulfilled: false };
  }
}

// ─── Collateral Calculation ─────────────────────────────────────────────────

/**
 * Calculate collateral amount for a bid.
 * Escalates based on recent wins.
 */
export function calculateCollateral(
  tier: number,
  bidAmount: number,
  recentWinCount: number,
): { collateralPct: number; collateralAmount: number } {
  const baseCollateralPct = COLLATERAL_BY_TIER[tier] || 0.10;
  const escalation = recentWinCount * 0.05;
  const collateralPct = Math.min(0.25, baseCollateralPct + escalation);
  const collateralAmount = Math.round(bidAmount * collateralPct);

  return { collateralPct, collateralAmount };
}

// ─── Reliability Score ──────────────────────────────────────────────────────

export type FulfillmentOutcome =
  | 'fulfilled_on_time'
  | 'fulfilled_with_bonus'
  | 'partial_75'
  | 'partial_50'
  | 'partial_25'
  | 'timeout_fail'
  | 'abandoned';

/**
 * Update reliability score using exponential moving average.
 */
export function updateReliability(
  currentReliability: number,
  outcome: FulfillmentOutcome,
): number {
  let weight: number;
  let target: number;

  switch (outcome) {
    case 'fulfilled_on_time':
      weight = 0.9;
      target = 1.0;
      break;
    case 'fulfilled_with_bonus':
      weight = 0.85;
      target = 1.0;
      break;
    case 'partial_75':
      weight = 0.9;
      target = 0.7;
      break;
    case 'partial_50':
      weight = 0.9;
      target = 0.4;
      break;
    case 'partial_25':
      weight = 0.9;
      target = 0.1;
      break;
    case 'timeout_fail':
      weight = 0.9;
      target = 0.0;
      break;
    case 'abandoned':
      weight = 0.85;
      target = 0.0;
      break;
    default:
      return currentReliability;
  }

  const newReliability = currentReliability * weight + target * (1 - weight);
  return Math.round(newReliability * 1000) / 1000;
}

// ─── Penalty Calculation ────────────────────────────────────────────────────

export interface PenaltyResult {
  paymentPct: number;
  collateralForfeitPct: number;
  reputationChange: number;
  cooldownMonths: number;
}

/**
 * Calculate penalties based on fulfillment progress at deadline.
 */
export function calculatePenalty(
  progressPct: number,
  supportsPartialFulfillment: boolean,
): PenaltyResult {
  // Mining rights never fail
  if (progressPct >= 100) {
    return { paymentPct: 1.0, collateralForfeitPct: 0, reputationChange: 15, cooldownMonths: 0 };
  }

  if (!supportsPartialFulfillment) {
    // Binary contracts: any progress below 100 = full fail
    return {
      paymentPct: 0,
      collateralForfeitPct: 1.0,
      reputationChange: -20,
      cooldownMonths: 2,
    };
  }

  // Partial delivery contracts
  if (progressPct >= 75) {
    return { paymentPct: 0.50, collateralForfeitPct: 0, reputationChange: -5, cooldownMonths: 0 };
  }
  if (progressPct >= 50) {
    return { paymentPct: 0.25, collateralForfeitPct: 0.25, reputationChange: -10, cooldownMonths: 0 };
  }
  if (progressPct >= 25) {
    return { paymentPct: 0, collateralForfeitPct: 0.50, reputationChange: -15, cooldownMonths: 1 };
  }
  // Below 25%
  return { paymentPct: 0, collateralForfeitPct: 0.75, reputationChange: -20, cooldownMonths: 1 };
}

// ─── Validation Helpers ─────────────────────────────────────────────────────

export { MAX_CONCURRENT_BIDS, MAX_CONCURRENT_WON, MIN_BALANCE_AFTER_COLLATERAL, MAX_SAME_TYPE_ACTIVE };
export { REAL_SECONDS_PER_GAME_MONTH as SECONDS_PER_GAME_MONTH };

/**
 * Format money for display in the bidding system.
 */
export function formatBidMoney(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

/**
 * Get icon class/emoji for a contract type.
 */
export function getContractTypeIcon(contractType: string): string {
  const icons: Record<string, string> = {
    satellite_deployment: 'satellite',
    resource_delivery: 'package',
    station_construction: 'building',
    fleet_transport: 'ship',
    research_partnership: 'flask',
    emergency_supply: 'alert',
    mining_rights_lease: 'pickaxe',
  };
  return icons[contractType] || 'file';
}

/**
 * Get tier color class for the UI.
 */
export function getTierColor(tier: number): string {
  const colors: Record<number, string> = {
    1: 'text-green-400 border-green-500/30 bg-green-500/10',
    2: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    3: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    4: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    5: 'text-red-400 border-red-500/30 bg-red-500/10',
  };
  return colors[tier] || colors[1];
}
