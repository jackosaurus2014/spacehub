// ─── Space Tycoon: Economic Sinks & Resource-Gated Progression ───────────────
//
// PROBLEM: In most tycoon games, money becomes meaningless mid-game because
// income grows exponentially while costs stay flat. Players stop caring
// about decisions because they can afford everything.
//
// SOLUTION: Multiple "money sinks" that scale WITH the player's income,
// plus resource requirements that can ONLY be met through mining/trading.
// Money alone can never buy everything — you need the right resources
// from the right locations.
//
// DESIGN GOALS:
// 1. Money should ALWAYS feel tight — even at $5B/month income
// 2. Every building/research decision should have opportunity cost
// 3. Mid-to-late game items require specific mined resources (can't shortcut)
// 4. Economic disasters can set players back (risk is real)
// 5. Maintenance costs scale with empire size (prevents infinite expansion)

// ─── 1. Scaling Maintenance ──────────────────────────────────────────────────
// As empires grow, overhead costs increase non-linearly.
// This prevents players from building infinite facilities.

export function calculateEmpireOverhead(
  buildingCount: number,
  serviceCount: number,
  colonyCount: number,
  shipCount: number,
): number {
  // Base overhead: $500K per building + $1M per service + $5M per colony + $200K per ship
  const base = buildingCount * 500_000 + serviceCount * 1_000_000 + colonyCount * 5_000_000 + shipCount * 200_000;

  // Scaling factor: overhead grows 2% per building past 10, compounding
  // At 10 buildings: 1.0x overhead
  // At 20 buildings: 1.22x overhead
  // At 50 buildings: 2.21x overhead
  // At 100 buildings: 4.93x overhead
  const scaleFactor = Math.pow(1.02, Math.max(0, buildingCount - 10));

  return Math.round(base * scaleFactor);
}

// ─── 2. Insurance Premiums ───────────────────────────────────────────────────
// Players must pay insurance or risk losing buildings to disasters.
// Insurance costs scale with asset value.

export function calculateInsurancePremium(
  totalAssetValue: number, // Sum of all building costs
  riskLocations: number,   // Number of hazardous location colonies
): number {
  // Base: 0.5% of asset value per month
  const basePremium = totalAssetValue * 0.005;

  // Risk surcharge: +0.2% per hazardous location (Io, Mercury, etc.)
  const riskSurcharge = totalAssetValue * 0.002 * riskLocations;

  return Math.round(basePremium + riskSurcharge);
}

// ─── 3. Resource Decay ───────────────────────────────────────────────────────
// Some resources decay over time if not used, preventing infinite hoarding.
// Water evaporates, fuel degrades, organics decompose.

export const RESOURCE_DECAY_RATES: Record<string, number> = {
  // % lost per game month (0 = no decay)
  lunar_water: 0.01,       // 1% per month (evaporation)
  mars_water: 0.01,        // 1% per month
  methane: 0.005,          // 0.5% per month (slow leak)
  ethane: 0.005,           // 0.5% per month
  organic_compounds: 0.02, // 2% per month (decomposition)
  bio_samples: 0.03,       // 3% per month (degradation without lab)
  rocket_fuel: 0.01,       // 1% per month (boil-off)
  // Metals, minerals, and exotics don't decay
  iron: 0,
  aluminum: 0,
  titanium: 0,
  platinum_group: 0,
  gold: 0,
  rare_earth: 0,
  exotic_materials: 0,
  helium3: 0,
  deuterium: 0,
  antimatter_precursors: 0,
  sulfur: 0,
  ammonia: 0.01,
  solar_concentrate: 0,
};

export function applyResourceDecay(
  resources: Record<string, number>,
): Record<string, number> {
  const decayed = { ...resources };
  for (const [resId, qty] of Object.entries(decayed)) {
    const rate = RESOURCE_DECAY_RATES[resId] || 0;
    if (rate > 0 && qty > 0) {
      const loss = Math.max(1, Math.floor(qty * rate));
      decayed[resId] = Math.max(0, qty - loss);
    }
  }
  return decayed;
}

// ─── 4. Economic Disasters ───────────────────────────────────────────────────
// Random events that cost significant money and can't be prevented.
// Forces players to maintain cash reserves (can't invest everything).

export interface EconomicDisaster {
  id: string;
  name: string;
  description: string;
  probability: number; // Per tick probability
  costFormula: 'flat' | 'percentage' | 'per_building';
  costAmount: number;  // Flat amount, or percentage (0.05 = 5%), or per-building amount
  requiresInsurance: boolean; // Insurance covers this
  minBuildings: number; // Only happens to players with this many+ buildings
}

export const ECONOMIC_DISASTERS: EconomicDisaster[] = [
  {
    id: 'disaster_equipment_failure',
    name: 'Critical Equipment Failure',
    description: 'A major system failure requires emergency repairs across multiple facilities.',
    probability: 0.003, // ~0.3% per month
    costFormula: 'per_building', costAmount: 2_000_000, // $2M per building
    requiresInsurance: true, minBuildings: 5,
  },
  {
    id: 'disaster_solar_storm',
    name: 'Severe Solar Storm',
    description: 'A coronal mass ejection damages satellite electronics and disrupts operations.',
    probability: 0.002, // ~0.2% per month
    costFormula: 'percentage', costAmount: 0.03, // 3% of total cash
    requiresInsurance: true, minBuildings: 3,
  },
  {
    id: 'disaster_market_crash',
    name: 'Market Flash Crash',
    description: 'Resource prices plummet temporarily. Inventory value drops significantly.',
    probability: 0.005, // ~0.5% per month
    costFormula: 'percentage', costAmount: 0.05, // 5% of cash lost
    requiresInsurance: false, minBuildings: 8, // Only affects larger players
  },
  {
    id: 'disaster_supply_chain',
    name: 'Supply Chain Disruption',
    description: 'A key supplier failed. Emergency procurement costs spike.',
    probability: 0.004, // ~0.4% per month
    costFormula: 'flat', costAmount: 50_000_000, // $50M flat
    requiresInsurance: true, minBuildings: 10,
  },
  {
    id: 'disaster_regulatory',
    name: 'Regulatory Fine',
    description: 'Space authority imposes fines for compliance violations.',
    probability: 0.002,
    costFormula: 'percentage', costAmount: 0.02, // 2% of cash
    requiresInsurance: false, minBuildings: 15,
  },
  {
    id: 'disaster_colony_crisis',
    name: 'Colony Life Support Crisis',
    description: 'Emergency life support repairs needed at a colony. Extremely expensive.',
    probability: 0.001, // Very rare
    costFormula: 'flat', costAmount: 500_000_000, // $500M
    requiresInsurance: true, minBuildings: 20,
  },
];

// ─── 5. Resource-Gated Buildings (Cannot Buy With Money Alone) ───────────────
// Mid-to-endgame buildings require specific mined resources.
// These resources can ONLY come from mining operations or player trading.
// Money can buy resources on the market, but market supply is limited
// by what other players/NPCs have mined.

export const RESOURCE_GATED_REQUIREMENTS: Record<string, {
  description: string;
  resources: Record<string, number>;
  canBuyOnMarket: boolean; // Can these resources be purchased, or MUST be mined?
}> = {
  // Tier 3 — require basic mined metals
  'launch_pad_heavy': {
    description: 'Heavy launch pads need structural metals only available from asteroid mining.',
    resources: { iron: 200, titanium: 50, aluminum: 100 },
    canBuyOnMarket: true, // Available on market
  },

  // Tier 4 — require precious/rare resources
  'space_station_mars': {
    description: 'Mars stations need radiation-hardened components made from rare earth.',
    resources: { titanium: 100, aluminum: 200, rare_earth: 30, iron: 300 },
    canBuyOnMarket: true,
  },

  // Tier 5 — require colony-exclusive resources (market supply is very limited)
  'colony_titan': {
    description: 'Titan colony needs cryogenic-rated materials only available from outer system mining.',
    resources: { titanium: 200, rare_earth: 80, exotic_materials: 10, helium3: 5 },
    canBuyOnMarket: true, // Can buy on market but supply is very scarce
  },

  // Tier 6 — MUST be mined (cannot shortcut)
  'colony_triton': {
    description: 'Triton base requires antimatter containment systems. Materials must be mined from Jupiter/Saturn moons.',
    resources: { exotic_materials: 50, deuterium: 20, helium3: 30, antimatter_precursors: 5 },
    canBuyOnMarket: false, // MUST mine these yourself or trade with other players
  },
  'colony_pluto': {
    description: 'Pluto colony needs the rarest materials in the solar system. No shortcuts.',
    resources: { antimatter_precursors: 30, deuterium: 40, exotic_materials: 100, helium3: 50, bio_samples: 20 },
    canBuyOnMarket: false, // MUST mine or trade — cannot buy on open market
  },

  // Endgame ships — require mined components
  'deep_space_miner': {
    description: 'Nuclear-powered mining vessel requires fusion fuel components.',
    resources: { titanium: 100, rare_earth: 40, platinum_group: 10 },
    canBuyOnMarket: true,
  },

  // Alliance starbases — require member contributions
  'starbase': {
    description: 'Alliance starbases need contributions from multiple member mining operations.',
    resources: { iron: 1000, titanium: 500, rare_earth: 200, aluminum: 800, exotic_materials: 20 },
    canBuyOnMarket: false, // Must be contributed by alliance members
  },
};

// ─── 6. Opportunity Cost System ──────────────────────────────────────────────
// Every research slot is exclusive (can only research one thing at a time).
// Every build slot is location-limited (can't build everywhere at once).
// This creates real trade-offs even when money isn't the constraint.

export const PROGRESSION_LIMITS = {
  // Research: only 1 active research at a time (2 for Enterprise subscribers)
  maxActiveResearch: 1,
  maxActiveResearchEnterprise: 2,

  // Building: max 3 simultaneous constructions (5 for Enterprise)
  maxSimultaneousBuilds: 3,
  maxSimultaneousBuildsEnterprise: 5,

  // Mining: max 5 active mining operations per location
  maxMiningOpsPerLocation: 5,

  // Ships: fleet size limited by service level
  maxShipsBase: 10,
  maxShipsPerSpaceStation: 5, // Each space station adds 5 ship slots

  // Contracts: limited by tier
  maxActiveContractsFree: 3,
  maxActiveContractsPro: 5,
  maxActiveContractsEnterprise: 8,
};

// ─── 7. Cash Reserve Requirement ─────────────────────────────────────────────
// Players must maintain a cash reserve proportional to their empire size.
// If cash drops below the reserve, services operate at reduced efficiency.
// This prevents players from investing literally every dollar.

export function calculateRequiredReserve(
  monthlyRevenue: number,
  monthlyExpenses: number,
): number {
  // Must keep 3 months of expenses in reserve
  return Math.round(monthlyExpenses * 3);
}

export function getReserveStatus(
  currentCash: number,
  requiredReserve: number,
): { status: 'healthy' | 'warning' | 'critical'; efficiencyMultiplier: number } {
  const ratio = currentCash / Math.max(1, requiredReserve);

  if (ratio >= 1.0) return { status: 'healthy', efficiencyMultiplier: 1.0 };
  if (ratio >= 0.5) return { status: 'warning', efficiencyMultiplier: 0.85 }; // 15% penalty
  return { status: 'critical', efficiencyMultiplier: 0.60 }; // 40% penalty — serious
}

// ─── Summary: Why Money Always Matters ───────────────────────────────────────
//
// EARLY GAME ($75M start):
// - Can only afford 1-2 buildings. Every choice matters.
// - First research costs $100M — need to save for it.
//
// MID GAME ($50-200M/month income):
// - Empire overhead scales: 50 buildings = 2.2x maintenance
// - Insurance premiums: 0.5% of total assets per month
// - Resource decay: water and organics degrade if not used
// - Economic disasters: 1-2% chance per month of significant losses
// - Cash reserve requirement: must keep 3 months expenses liquid
//
// LATE GAME ($1B+/month income):
// - Colony buildings require mined resources (can't just buy with cash)
// - Tier 6 buildings MUST have resources from outer system mining
// - Alliance starbases need member contributions (can't solo)
// - 100 buildings = 4.93x maintenance scaling
// - Insurance for hazardous colonies is expensive
// - Economic disasters scale with empire size
//
// ENDGAME ($5B+/month):
// - Pluto colony needs $750B PLUS antimatter/deuterium/exotics
// - T9-T10 research needs resources from every corner of the solar system
// - Maintaining 25+ colonies costs $500M+/month in overhead alone
// - Market crashes can wipe $250M+ in a single event
// - Victory conditions require sustained investment, not one-time spending
