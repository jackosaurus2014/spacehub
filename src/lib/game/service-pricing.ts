// ─── Space Tycoon: Dynamic Service Pricing Engine ────────────────────────────
// When many players operate the same service, its revenue decreases slightly.
// This creates natural market pressure and encourages diversification.
//
// Formula: multiplier = max(FLOOR, 1 - log10(max(1, globalCount)) * DECAY_RATE)
//
// Examples with DECAY_RATE = 0.05:
//   1 total instance:      1.00x (no penalty)
//   10 total instances:    0.95x (-5%)
//   100 total instances:   0.90x (-10%)
//   1,000 total instances: 0.85x (-15%)
//   10,000 total instances: 0.80x (-20%)
//
// Floor of 0.50 ensures services always generate at least half their base revenue.
// Higher-tier services have LOWER decay (rarer = less competition).

/** Minimum revenue multiplier — services never drop below 50% base revenue */
const PRICE_FLOOR = 0.50;

/** Decay rate per log10 of global service count, by tier */
const TIER_DECAY_RATES: Record<number, number> = {
  1: 0.06,  // Common services: 6% per order of magnitude
  2: 0.04,  // Mid-tier: 4% per order of magnitude
  3: 0.025, // Advanced: 2.5% per order of magnitude
  4: 0.015, // Rare: 1.5% per order of magnitude
  5: 0.01,  // Endgame: 1% per order of magnitude
};

/** Service tier mapping for pricing decay */
const SERVICE_TIERS: Record<string, number> = {
  // Tier 1 — accessible early, most competitive
  svc_ground_tracking: 1,
  svc_mission_ops: 1,
  svc_launch_small: 1,
  svc_telecom_leo: 1,
  svc_telecom_geo: 1,
  svc_sensor_leo: 1,
  svc_power_orbital: 1,
  svc_tourism_leo: 1,

  // Tier 2 — require research, moderate competition
  svc_launch_medium: 2,
  svc_sensor_geo: 2,
  svc_ai_datacenter: 2,
  svc_mining_lunar: 2,
  svc_power_lunar: 2,
  svc_tourism_lunar_gateway: 2,
  svc_tourism_moon: 2,
  svc_fabrication_orbital: 2,
  svc_fabrication_lunar: 2,
  svc_propellant_depot: 2,
  svc_debris_removal: 2,
  svc_navigation: 2,
  svc_space_insurance: 2,

  // Tier 3 — expensive, fewer competitors
  svc_launch_heavy: 3,
  svc_ai_mars: 3,
  svc_mining_mars: 3,
  svc_mining_asteroid: 3,
  svc_mars_station_ops: 3,
  svc_tourism_mars: 3,
  svc_asteroid_survey: 3,
  svc_propellant_brokerage: 3,

  // Tier 4 — endgame, very few operators
  svc_mining_europa: 4,
  svc_mining_titan: 4,
};

/**
 * Calculate service revenue multiplier based on how many players globally
 * are running this service. More competition = lower price per unit.
 */
export function getServicePriceMultiplier(
  serviceId: string,
  globalInstanceCount: number,
): number {
  const tier = SERVICE_TIERS[serviceId] || 2;
  const decayRate = TIER_DECAY_RATES[tier] || 0.04;

  if (globalInstanceCount <= 1) return 1.0;

  const penalty = Math.log10(globalInstanceCount) * decayRate;
  return Math.max(PRICE_FLOOR, 1 - penalty);
}

/**
 * Calculate multipliers for all services given global counts.
 * Returns a map of serviceId → multiplier (0.50 to 1.00).
 */
export function getAllServicePriceMultipliers(
  globalServiceCounts: Record<string, number>,
): Record<string, number> {
  const multipliers: Record<string, number> = {};
  for (const [serviceId, count] of Object.entries(globalServiceCounts)) {
    multipliers[serviceId] = getServicePriceMultiplier(serviceId, count);
  }
  return multipliers;
}

export type ServicePriceMultipliers = Record<string, number>;
