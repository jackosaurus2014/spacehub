// ─── Space Tycoon: Economic Sinks & Resource-Gated Progression ───────────────
//
// AUDIT WAVE E (Change #9 / C5): this file was "100% orphaned — the designed
// anti-inflation economy" (audit §1e). It is now ACTIVE. game-engine's
// month-end pass charges insurance premiums, decays volatile stockpiles,
// rolls economic disasters, and enforces the T5+ cash-reserve requirement;
// the market/trade route enforces the mined-only resource restriction.
// Every activated rate below cites the audit section and the BALANCE.md
// invariant it satisfies at its definition site.
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

// ─── ACTIVATION LAYER (audit Wave E — Change #9 / C5) ────────────────────────
// Helpers consumed by game-engine.ts's month-end pass and the market routes.
// All deterministic; disaster rolls are seeded per (game-month) — no
// Math.random ("seeded rng patterns only" per the wave constraints).

import type { GameState } from './types';
import { BUILDING_MAP } from './buildings';
import { SHIP_MAP } from './ships';
import { mulberry32, hashStringToSeed } from './formulas';
// AAA Round 2: the crisis premium loading. One-way import — systemic-crises
// deliberately does NOT import this module (it recomputes the insured-asset
// arithmetic itself as `crisisOperationalCapital`, guarded by a drift test),
// because the reciprocal import would be a cycle.
import { getCrisisInsurancePremiumMultiplier } from './systemic-crises';

/** Locations whose occupancy raises the insurance risk surcharge
 *  (economic-sinks §2: "+0.2% per hazardous location (Io, Mercury, etc.)").
 *  Set mirrors the high-multiplier rows in hazards.ts LOCATION_MULTIPLIERS. */
export const HAZARDOUS_LOCATIONS = new Set([
  'mercury_surface', 'io_surface', 'asteroid_belt', 'outer_system', 'jupiter_system',
]);

/** Total insurable asset value: completed buildings + built ships at baseCost.
 *  The premium base for calculateInsurancePremium (audit A4: "opt-in
 *  recurring sink" — BALANCE.md invariant "cost scales with empire size" ✓). */
export function computeInsuredAssetValue(state: GameState): number {
  let total = 0;
  for (const b of state.buildings) {
    if (!b.isComplete) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    if (def) total += def.baseCost;
  }
  for (const s of state.ships || []) {
    if (!s.isBuilt) continue;
    const def = SHIP_MAP.get(s.definitionId);
    if (def) total += def.baseCost;
  }
  return total;
}

/** Count of distinct hazardous locations where the player has assets. */
export function countInsuranceRiskLocations(state: GameState): number {
  const locs = new Set<string>();
  for (const b of state.buildings) {
    if (b.isComplete && HAZARDOUS_LOCATIONS.has(b.locationId)) locs.add(b.locationId);
  }
  for (const s of state.ships || []) {
    if (s.isBuilt && HAZARDOUS_LOCATIONS.has(s.currentLocation)) locs.add(s.currentLocation);
  }
  return locs.size;
}

/** Monthly premium for the active policy: 0.5% of asset value + 0.2% per
 *  hazardous location (§2 rates, unchanged — "at the audit's recommended
 *  rates"). Returns 0 when no policy is active. */
export function getMonthlyInsurancePremium(state: GameState, nowMs: number = Date.now()): number {
  if (state.insuranceActive !== true) return 0;
  const base = calculateInsurancePremium(computeInsuredAssetValue(state), countInsuranceRiskLocations(state));
  // AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md): while an Accord
  // emergency is in force the reinsurance market hardens. Bounded
  // (1.0-1.6x), published two real weeks ahead, and applied only to this
  // OPT-IN sink — a corporation carrying no policy pays nothing extra and
  // simply retains its own risk. Returns exactly 1 for a pre-Round-2 save,
  // a Frontier corporation, a corporation still in the FTUE chain, an
  // Advisory-tier crisis, or any moment outside the active/aftermath
  // window, so the shipped premium is unchanged in every one of those
  // cases.
  return Math.round(base * getCrisisInsurancePremiumMultiplier(state, nowMs));
}

/** Engine-facing toggle for the UI wave (opt-in/out is a real economic
 *  decision: premiums vs. payout — audit A4). Exported so no page/component
 *  edit is needed later than a single onClick. */
export function setInsuranceActive(state: GameState, active: boolean): GameState {
  if ((state.insuranceActive === true) === active) return state;
  return { ...state, insuranceActive: active };
}

/** Fraction of a covered disaster's cost that insurance absorbs. */
export const DISASTER_INSURANCE_COVERAGE = 0.75;

export interface DisasterRoll {
  disaster: EconomicDisaster;
  grossCost: number;
  insuranceCovered: number;
  netCost: number;
}

/**
 * Roll at most ONE economic disaster for a game-month (§4 rates: 0.1%-0.5%
 * per month each; combined ~1.7%/month for a large empire). Deterministic:
 * seeded per (monthIndex, disasterId) so the same world month produces the
 * same disaster weather for every player, and reloading cannot re-roll.
 * minBuildings gates protect small operations (BALANCE.md: "new-player
 * exemption" pattern, same as exec comp); Frontier players are exempted by
 * the caller (gentle on-ramp per the wave constraints).
 */
export function rollMonthlyDisaster(state: GameState, monthIndex: number): DisasterRoll | null {
  const buildingCount = state.buildings.filter(b => b.isComplete).length;
  for (const disaster of ECONOMIC_DISASTERS) {
    if (buildingCount < disaster.minBuildings) continue;
    const rng = mulberry32(hashStringToSeed(`stw-disaster:${monthIndex}:${disaster.id}`));
    // §4 probabilities are documented per month ("~0.3% per month") and
    // applied per month here at the file's own recommended rates. Across the
    // gated ladder a 20+-building empire faces ~1.7%/month combined — the
    // §Summary's designed "1-2% chance per month of significant losses".
    if (rng() >= disaster.probability) continue;
    let grossCost = 0;
    switch (disaster.costFormula) {
      case 'flat': grossCost = disaster.costAmount; break;
      case 'percentage': grossCost = Math.max(0, Math.round(state.money * disaster.costAmount)); break;
      case 'per_building': grossCost = disaster.costAmount * buildingCount; break;
    }
    if (grossCost <= 0) return null;
    const insuranceCovered = disaster.requiresInsurance && state.insuranceActive === true
      ? Math.round(grossCost * DISASTER_INSURANCE_COVERAGE)
      : 0;
    return { disaster, grossCost, insuranceCovered, netCost: grossCost - insuranceCovered };
  }
  return null;
}

/**
 * Mined-only resources (audit C5: "resource-gated T6+ construction —
 * canBuyOnMarket:false enforcement — mined-only inputs make late-game mining
 * matter again"). The NPC market will not SELL these; they must be produced
 * (interstellar colonies / expeditions) or bought from other players via the
 * P2P order book — exactly the §5 "MUST mine these yourself or trade with
 * other players" contract, mapped onto the resource ids that actually exist.
 * (The §5 table's deuterium/antimatter_precursors/bio_samples are now
 * registered resources too — Wave E2 adopted them from colonies.ts's
 * COLONY_RESOURCES — but they keep real NPC colony production
 * (COLONY_MINING_PRODUCTION) and so are NOT mined-only; exotic_fuel and
 * xenogenic_biomatter remain the interstellar-only equivalents.)
 * Enforced in market/trade/route.ts.
 *
 * Wave E2 (docs/ECONOMY_PVP_2026-08.md §E2 "Goods on the Book"): every
 * crafted production-chain output (production-chains.ts
 * CRAFTED_PRODUCT_IDS) plus the new life_support_pack is added here too —
 * none of them has NPC production yet (that lands with E3's consumption/
 * production engine), so the same "craft it or trade player-to-player"
 * contract applies. Selling is NOT blocked — only buying from the NPC-backed
 * curve — so the crafting→market sell path (this wave's whole point) stays
 * open. [BAL] this is also what keeps the order-book's NPC maker safe:
 * market-orderbook.ts's NPC_VOLUME_CAPS gives these zero/tight caps, so no
 * standing NPC buy order can launder crafted output into free money.
 */
export const MINED_ONLY_RESOURCE_IDS: string[] = [
  'exotic_fuel', 'xenogenic_biomatter',
  // Crafted products (production-chains.ts CRAFTED_PRODUCT_IDS)
  'steel_ingots', 'aluminum_alloy', 'rocket_fuel', 'refined_rare_earth',
  'structural_beams', 'electronics_package', 'solar_panel_array', 'propulsion_unit',
  'station_module', 'satellite_bus', 'ai_compute_cluster', 'fusion_core', 'habitat_pod',
  // New in Wave E2 — no recipe yet (E3 lands life_support_works)
  'life_support_pack',
];

/** Reserve requirement (§7) applies from this corporation tier up (audit C5:
 *  "reserve requirements for T5+ — efficiency penalty below 3-month runway"). */
export const RESERVE_REQUIREMENT_MIN_TIER = 5;

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
