// ─── Space Tycoon: Territory/Zone Influence System ────────────────────────────
// Calculates influence points (IP) per zone per player based on economic activity.
// See docs/TERRITORY-ZONE-INFLUENCE-DESIGN.md for full specification.

import type { BuildingInstance, ServiceInstance } from './types';
import { BUILDING_MAP } from './buildings';
import { SERVICE_MAP } from './services';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Every $500K/month net service revenue = 1 IP */
const SERVICE_REVENUE_DIVISOR = 500_000;

/** Every $1M/month mining output value = 1 IP */
const MINING_REVENUE_DIVISOR = 1_000_000;

/** IP per completed zone-relevant research */
const RESEARCH_IP_PER_TECH = 5;

/** IP per regular contract completed in zone */
const CONTRACT_IP_REGULAR = 5;

/** IP per competitive contract in zone */
const CONTRACT_IP_COMPETITIVE = 15;

/** Base decay rate per day (2%) */
const BASE_DECAY_RATE = 0.02;

/** Governor decay rate (halved) */
const GOVERNOR_DECAY_RATE = 0.01;

/** Diminishing returns threshold */
const DIMINISHING_RETURNS_THRESHOLD = 500;

/** Blend ratio: 70% recalculated, 30% stored */
const RECALC_WEIGHT = 0.7;
const STORED_WEIGHT = 0.3;

/** Maximum influence share cap */
const MAX_INFLUENCE_SHARE = 60;

/** Challenger bonus cap */
const MAX_CHALLENGER_BONUS = 1.25;

/** Governance challenge duration: 72 hours in milliseconds */
export const CHALLENGE_DURATION_MS = 72 * 60 * 60 * 1000;

/** Minimum share % to become Governor */
const MIN_GOVERNOR_SHARE = 15;

/** Minimum governor IP ratio for challenger eligibility */
const CHALLENGE_THRESHOLD_RATIO = 0.80;

// ─── Building Tier Multiplier ────────────────────────────────────────────────

const BUILDING_TIER_MULTIPLIER: Record<number, number> = {
  1: 10,
  2: 30,
  3: 80,
  4: 200,
  5: 500,
};

// ─── Mining Building Estimated Monthly Values ────────────────────────────────

const MINING_BUILDING_VALUES: Record<string, number> = {
  mining_lunar_ice: 11_000_000,
  mining_mars: 22_000_000,
  mining_asteroid: 32_000_000,
  mining_europa: 75_000_000,
  mining_titan: 105_000_000,
  mining_kuiper: 150_000_000,
};

// ─── Zone Definitions ────────────────────────────────────────────────────────

export interface ZoneDefinition {
  slug: string;
  name: string;
  tier: number;
  locations: string[];  // Location IDs that map to this zone
  accentColor: string;  // For UI theming
  taxCap: number;       // Monthly tax revenue cap
  subZones: SubZoneDefinition[];
}

export interface SubZoneDefinition {
  slug: string;
  name: string;
  activityFocus: string;
}

export const ZONE_DEFINITIONS: ZoneDefinition[] = [
  {
    slug: 'zone_leo',
    name: 'Low Earth Orbit',
    tier: 1,
    locations: ['earth_surface', 'leo', 'mercury_surface', 'venus_orbit'],
    accentColor: '#3B82F6', // blue
    taxCap: 10_000_000,
    subZones: [
      { slug: 'sub_leo_comms', name: 'Communications Belt', activityFocus: 'Telecom satellites, broadband services' },
      { slug: 'sub_leo_stations', name: 'Station Cluster', activityFocus: 'Space stations, tourism, datacenter' },
      { slug: 'sub_leo_observation', name: 'Observation Ring', activityFocus: 'Sensor satellites, Earth observation' },
      { slug: 'sub_leo_launch', name: 'Launch Corridor', activityFocus: 'Launch pads, launch services' },
    ],
  },
  {
    slug: 'zone_geo',
    name: 'Geostationary Belt',
    tier: 1,
    locations: ['geo'],
    accentColor: '#8B5CF6', // violet
    taxCap: 10_000_000,
    subZones: [
      { slug: 'sub_geo_comms', name: 'GEO Comms Arc', activityFocus: 'GEO telecom satellites' },
      { slug: 'sub_geo_monitoring', name: 'Persistent Watch', activityFocus: 'GEO sensor satellites, monitoring' },
      { slug: 'sub_geo_power', name: 'Power Belt', activityFocus: 'Solar farms, power generation' },
    ],
  },
  {
    slug: 'zone_lunar',
    name: 'Cislunar Space',
    tier: 2,
    locations: ['lunar_orbit', 'lunar_surface'],
    accentColor: '#D1D5DB', // gray/silver (moon)
    taxCap: 25_000_000,
    subZones: [
      { slug: 'sub_lunar_mining', name: 'Shackleton Basin', activityFocus: 'Lunar ice mining, propellant' },
      { slug: 'sub_lunar_habitats', name: 'Settlement Zone', activityFocus: 'Habitats, tourism, fabrication' },
      { slug: 'sub_lunar_gateway', name: 'Orbital Gateway', activityFocus: 'Lunar orbital station, relay' },
    ],
  },
  {
    slug: 'zone_mars',
    name: 'Mars System',
    tier: 3,
    locations: ['mars_orbit', 'mars_surface'],
    accentColor: '#EF4444', // red
    taxCap: 50_000_000,
    subZones: [
      { slug: 'sub_mars_mining', name: 'Hellas Extraction', activityFocus: 'Mars mining, resource extraction' },
      { slug: 'sub_mars_colony', name: 'Olympus Settlement', activityFocus: 'Habitats, tourism, fabrication' },
      { slug: 'sub_mars_orbital', name: 'Deimos Station', activityFocus: 'Mars orbital station, data relay' },
    ],
  },
  {
    slug: 'zone_belt',
    name: 'Asteroid Belt',
    tier: 3,
    locations: ['asteroid_belt', 'ceres', 'vesta'],
    accentColor: '#F59E0B', // amber
    taxCap: 50_000_000,
    subZones: [
      { slug: 'sub_belt_mining', name: 'Ceres Fields', activityFocus: 'Asteroid mining operations' },
      { slug: 'sub_belt_fabrication', name: 'Belt Forge', activityFocus: 'Fabrication, manufacturing' },
      { slug: 'sub_belt_station', name: 'Belt Waystation', activityFocus: 'Stations, logistics hub' },
    ],
  },
  {
    slug: 'zone_jupiter',
    name: 'Jupiter System',
    tier: 4,
    locations: ['jupiter_system', 'io_surface', 'ganymede_surface', 'callisto_surface'],
    accentColor: '#F97316', // orange
    taxCap: 100_000_000,
    subZones: [
      { slug: 'sub_jupiter_europa', name: 'Europa Abyss', activityFocus: 'Europa subsurface mining' },
      { slug: 'sub_jupiter_ganymede', name: 'Ganymede Colony', activityFocus: 'Habitats, stations' },
      { slug: 'sub_jupiter_station', name: 'Jove Station', activityFocus: 'Jupiter system station, datacenter' },
    ],
  },
  {
    slug: 'zone_saturn',
    name: 'Saturn System',
    tier: 4,
    locations: ['saturn_system', 'enceladus_surface', 'rhea_orbit'],
    accentColor: '#EAB308', // yellow
    taxCap: 100_000_000,
    subZones: [
      { slug: 'sub_saturn_titan', name: 'Titan Lakes', activityFocus: 'Titan hydrocarbon mining' },
      { slug: 'sub_saturn_enceladus', name: 'Enceladus Geysers', activityFocus: 'Water/organic mining' },
      { slug: 'sub_saturn_station', name: 'Kronos Hub', activityFocus: 'Saturn system station' },
    ],
  },
  {
    slug: 'zone_outer',
    name: 'Outer System',
    tier: 5,
    locations: ['outer_system', 'titania_surface', 'miranda_surface', 'triton_surface', 'pluto_surface', 'eris_surface'],
    accentColor: '#6366F1', // indigo
    taxCap: 200_000_000,
    subZones: [
      { slug: 'sub_outer_kuiper', name: 'Kuiper Mining', activityFocus: 'Deep space resource extraction' },
      { slug: 'sub_outer_relay', name: 'Deep Space Network', activityFocus: 'Relay stations, outposts' },
      { slug: 'sub_outer_frontier', name: 'The Frontier', activityFocus: 'Exploration, survey operations' },
    ],
  },
];

export const ZONE_MAP = new Map(ZONE_DEFINITIONS.map(z => [z.slug, z]));

/** Lookup: locationId -> zoneSlug */
const _locationToZone = new Map<string, string>();
for (const zone of ZONE_DEFINITIONS) {
  for (const loc of zone.locations) {
    _locationToZone.set(loc, zone.slug);
  }
}
export const LOCATION_TO_ZONE = _locationToZone;

// ─── Research-to-Zone Mapping ────────────────────────────────────────────────

export const ZONE_RESEARCH_MAP: Record<string, string[]> = {
  zone_leo: [
    'reusable_boosters', 'modular_spacecraft', 'rad_hard_processors',
    'high_res_optical', 'triple_junction', 'autonomous_docking',
  ],
  zone_geo: [
    'high_res_optical', 'triple_junction', 'high_power_comms',
  ],
  zone_lunar: [
    'reusable_boosters', 'modular_spacecraft', 'resource_prospecting',
    'regolith_processing',
  ],
  zone_mars: [
    'super_heavy_lift', 'ion_drives', 'resource_prospecting',
    'regolith_processing', 'interplanetary_cruisers', 'edge_ai',
  ],
  zone_belt: [
    'asteroid_capture', 'autonomous_docking', 'resource_prospecting',
    'regolith_processing',
  ],
  zone_jupiter: [
    'nuclear_thermal', 'interplanetary_cruisers', 'deep_drilling',
  ],
  zone_saturn: [
    'nuclear_thermal', 'interplanetary_cruisers', 'deep_drilling',
  ],
  zone_outer: [
    'fusion_drive', 'generation_ships',
  ],
};

// ─── Influence Calculation Functions ─────────────────────────────────────────

export interface InfluenceBreakdown {
  buildingIp: number;
  serviceIp: number;
  miningIp: number;
  researchIp: number;
  contractIp: number;
  totalRawIp: number;
}

/**
 * Calculate a player's influence in a zone from their current game activity.
 * This is a pure function — no DB access.
 */
export function calculateInfluenceFromActivity(
  buildings: BuildingInstance[],
  activeServices: ServiceInstance[],
  completedResearch: string[],
  completedContracts: string[],
  zoneSlug: string,
): InfluenceBreakdown {
  const zoneDef = ZONE_MAP.get(zoneSlug);
  if (!zoneDef) {
    return { buildingIp: 0, serviceIp: 0, miningIp: 0, researchIp: 0, contractIp: 0, totalRawIp: 0 };
  }

  const zoneLocations = new Set(zoneDef.locations);

  // ─── Building IP ─────────────────────────────────────────────────────────
  let buildingIp = 0;
  let miningIp = 0;

  for (const b of buildings) {
    if (!b.isComplete) continue;
    if (!zoneLocations.has(b.locationId)) continue;

    const def = BUILDING_MAP.get(b.definitionId);
    if (!def) continue;

    const tierMult = BUILDING_TIER_MULTIPLIER[def.tier] || 10;
    const baseIp = tierMult;
    const upgradeBonus = (b.upgradeLevel || 0) * 0.25 * baseIp;
    buildingIp += baseIp + upgradeBonus;

    // Mining IP from mining buildings
    if (def.category === 'mining_enterprise') {
      const monthlyValue = MINING_BUILDING_VALUES[def.id] || 0;
      miningIp += monthlyValue / MINING_REVENUE_DIVISOR;
    }
  }

  // ─── Service IP ──────────────────────────────────────────────────────────
  let serviceIp = 0;

  for (const s of activeServices) {
    if (!zoneLocations.has(s.locationId)) continue;

    const def = SERVICE_MAP.get(s.definitionId);
    if (!def) continue;

    const netRevenue = def.revenuePerMonth - def.operatingCostPerMonth;
    if (netRevenue > 0) {
      serviceIp += netRevenue / SERVICE_REVENUE_DIVISOR;
    }
  }

  // ─── Research IP ─────────────────────────────────────────────────────────
  const zoneResearch = ZONE_RESEARCH_MAP[zoneSlug] || [];
  let researchIp = 0;
  for (const resId of zoneResearch) {
    if (completedResearch.includes(resId)) {
      researchIp += RESEARCH_IP_PER_TECH;
    }
  }

  // ─── Contract IP ─────────────────────────────────────────────────────────
  // Contracts are identified by ID. Zone-relevant contracts contain the zone
  // location ID in their name as a convention. For now, count all contracts
  // and assign a fraction based on zone tier accessibility.
  // In a full implementation, each contract would tag which zone it belongs to.
  let contractIp = 0;
  const contractCount = completedContracts?.length || 0;
  // Approximate: spread contracts across zones the player has unlocked
  // Each contract contributes a base amount
  if (contractCount > 0) {
    // Give a proportional share of contracts to zones where the player has buildings
    const playerHasBuildingsInZone = buildings.some(
      b => b.isComplete && zoneLocations.has(b.locationId)
    );
    if (playerHasBuildingsInZone) {
      // Estimate ~20% of contracts are per-zone for active zones
      const estimatedZoneContracts = Math.ceil(contractCount * 0.2);
      contractIp = estimatedZoneContracts * CONTRACT_IP_REGULAR;
    }
  }

  const totalRawIp = buildingIp + serviceIp + miningIp + researchIp + contractIp;

  return {
    buildingIp: Math.round(buildingIp * 100) / 100,
    serviceIp: Math.round(serviceIp * 100) / 100,
    miningIp: Math.round(miningIp * 100) / 100,
    researchIp: Math.round(researchIp * 100) / 100,
    contractIp: Math.round(contractIp * 100) / 100,
    totalRawIp: Math.round(totalRawIp * 100) / 100,
  };
}

// ─── Diminishing Returns ─────────────────────────────────────────────────────

/**
 * Apply logarithmic diminishing returns above threshold.
 * Below 500 IP: linear. Above 500: 500 + 200 * ln(raw/500).
 */
export function applyDiminishingReturns(rawIp: number): number {
  if (rawIp <= DIMINISHING_RETURNS_THRESHOLD) {
    return rawIp;
  }
  return DIMINISHING_RETURNS_THRESHOLD + 200 * Math.log(rawIp / DIMINISHING_RETURNS_THRESHOLD);
}

// ─── Decay ───────────────────────────────────────────────────────────────────

/**
 * Compute decay rate based on inactivity duration.
 * Returns the total daily decay rate (0.02 - 0.12).
 */
export function getDecayRate(daysSinceActive: number, isGovernor: boolean): number {
  let inactivityBonus = 0;
  if (daysSinceActive > 14) {
    inactivityBonus = 0.10;
  } else if (daysSinceActive > 7) {
    inactivityBonus = 0.06;
  } else if (daysSinceActive > 3) {
    inactivityBonus = 0.03;
  } else if (daysSinceActive > 1) {
    inactivityBonus = 0.01;
  }

  const baseRate = isGovernor ? GOVERNOR_DECAY_RATE : BASE_DECAY_RATE;
  return baseRate + inactivityBonus;
}

/**
 * Apply daily decay to stored influence.
 * Returns the new stored IP after decay for the given number of days.
 */
export function decayInfluence(storedIp: number, days: number, daysSinceActive: number, isGovernor: boolean): number {
  if (storedIp <= 0 || days <= 0) return storedIp;

  const dailyRate = getDecayRate(daysSinceActive, isGovernor);
  // Compound decay: IP * (1 - rate)^days
  return storedIp * Math.pow(1 - dailyRate, days);
}

// ─── Effective IP Calculation ────────────────────────────────────────────────

/**
 * Blend recalculated IP with stored (historical) IP.
 * 70% current activity, 30% historical.
 */
export function blendInfluence(recalculatedIp: number, storedIp: number): number {
  return (recalculatedIp * RECALC_WEIGHT) + (storedIp * STORED_WEIGHT);
}

// ─── Multi-Zone Governance Penalty ───────────────────────────────────────────

/**
 * Penalty multiplier based on number of zones governed.
 * 1 zone: 1.0x, 2: 0.9x, 3: 0.8x, 4: 0.65x, 5+: 0.5x
 */
export function getMultiZonePenalty(zonesGoverned: number): number {
  if (zonesGoverned <= 1) return 1.0;
  if (zonesGoverned === 2) return 0.90;
  if (zonesGoverned === 3) return 0.80;
  if (zonesGoverned === 4) return 0.65;
  return 0.50; // 5+
}

// ─── Challenger Bonus ────────────────────────────────────────────────────────

/**
 * Calculate challenger bonus multiplier.
 * Bonus = 1.0 + (governor% - challenger%) * 0.005, capped at 1.25.
 */
export function getChallengerBonus(governorSharePct: number, challengerSharePct: number): number {
  if (governorSharePct <= challengerSharePct) return 1.0;
  const bonus = 1.0 + (governorSharePct - challengerSharePct) * 0.005;
  return Math.min(bonus, MAX_CHALLENGER_BONUS);
}

// ─── Governor Benefits ───────────────────────────────────────────────────────

export interface GovernorBenefits {
  taxRate: number;         // 0.02 (2%)
  serviceBonusPct: number; // 5
  taxCap: number;
  zoneName: string;
  tier: number;
}

export function getGovernorBenefits(zoneSlug: string): GovernorBenefits {
  const zone = ZONE_MAP.get(zoneSlug);
  if (!zone) {
    return { taxRate: 0.02, serviceBonusPct: 5, taxCap: 10_000_000, zoneName: 'Unknown', tier: 1 };
  }
  return {
    taxRate: 0.02,
    serviceBonusPct: 5,
    taxCap: zone.taxCap,
    zoneName: zone.name,
    tier: zone.tier,
  };
}

// ─── Stakeholder Benefits ────────────────────────────────────────────────────

export function getStakeholderServiceBonus(sharePct: number, isGovernor: boolean): number {
  if (isGovernor) return 5.0;
  if (sharePct >= 8) return 3.0;  // Major stakeholder
  if (sharePct >= 3) return 1.5;  // Stakeholder
  if (sharePct >= 1) return 0.5;  // Contributor
  return 0;
}

export function getInfluenceStatus(sharePct: number, isGovernor: boolean): string {
  if (isGovernor) return 'governor';
  if (sharePct >= 8) return 'major_stakeholder';
  if (sharePct >= 3) return 'stakeholder';
  if (sharePct >= 1) return 'contributor';
  if (sharePct > 0) return 'present';
  return 'none';
}

// ─── Challenge Eligibility ───────────────────────────────────────────────────

/**
 * Check if a challenger has enough IP to challenge the governor.
 * Requires 80%+ of governor's effective IP.
 */
export function canChallengeGovernor(challengerIp: number, governorIp: number): boolean {
  if (governorIp <= 0) return challengerIp > 0;
  return challengerIp >= governorIp * CHALLENGE_THRESHOLD_RATIO;
}

// ─── Influence Share Calculation ─────────────────────────────────────────────

/**
 * Calculate influence share percentages for all players in a zone.
 * Enforces the 60% maximum share cap with redistribution.
 */
export function calculateInfluenceShares(
  players: { profileId: string; effectiveIp: number }[]
): { profileId: string; sharePct: number }[] {
  const totalIp = players.reduce((sum, p) => sum + p.effectiveIp, 0);
  if (totalIp <= 0) {
    return players.map(p => ({ profileId: p.profileId, sharePct: 0 }));
  }

  // Initial share calculation
  const shares = players.map(p => ({
    profileId: p.profileId,
    sharePct: (p.effectiveIp / totalIp) * 100,
  }));

  // Enforce 60% cap with redistribution
  let excess = 0;
  let cappedCount = 0;
  for (const s of shares) {
    if (s.sharePct > MAX_INFLUENCE_SHARE) {
      excess += s.sharePct - MAX_INFLUENCE_SHARE;
      s.sharePct = MAX_INFLUENCE_SHARE;
      cappedCount++;
    }
  }

  if (excess > 0) {
    const uncappedPlayers = shares.filter(s => s.sharePct < MAX_INFLUENCE_SHARE);
    const uncappedTotal = uncappedPlayers.reduce((sum, s) => sum + s.sharePct, 0);
    if (uncappedTotal > 0) {
      for (const s of uncappedPlayers) {
        s.sharePct += (s.sharePct / uncappedTotal) * excess;
      }
    }
  }

  return shares.map(s => ({
    profileId: s.profileId,
    sharePct: Math.round(s.sharePct * 10) / 10,
  }));
}

// ─── Governor Determination ──────────────────────────────────────────────────

/**
 * Determine if someone qualifies as governor.
 * Must have highest share AND >= 15% share.
 */
export function determineGovernor(
  shares: { profileId: string; sharePct: number }[]
): string | null {
  if (shares.length === 0) return null;

  const sorted = [...shares].sort((a, b) => b.sharePct - a.sharePct);
  const top = sorted[0];

  if (top.sharePct >= MIN_GOVERNOR_SHARE) {
    return top.profileId;
  }
  return null;
}
