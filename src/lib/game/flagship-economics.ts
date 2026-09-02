// ─── Space Tycoon: Flagship economics (D5) ──────────────────────────────────
// docs/GAME_DESIGN_REVIEW_2026-09.md §1 D5 / §2 row 5 (founder-approved
// 2026-09-02); docs/BALANCE.md "D5 flagship economics".
//
// Pass 5 measured the T4/T5 flagship BUILDINGS' first-copy self-paybacks at
// 618–3,393 game-months (mining_titan 618, mining_europa 737,
// fabrication_titan 1,372, mining_kuiper 1,558, datacenter_jupiter 3,393 —
// harness `marginalCurve`, solo, base multipliers). Pass 7 kept the >50-year
// research horizon as canon but left the flagship paybacks as a WATCH item:
// even a corporation that eventually unlocks a flagship buys a strictly
// money-losing asset. D5 fixes that as a PAIR (both halves or neither —
// research spend is ~30% of all money destroyed, so removing it alone
// breaks the money supply):
//
//   (a) FLAGSHIP UPKEEP FLOOR — every building with baseCost >= the floor
//       pays maintenance = max(authored, baseCost x FLAGSHIP_UPKEEP_RATE)
//       per game-month. A $40B rig costs $160M/mo to keep pressurised
//       whatever the tooltip used to say. This is the sink that replaces
//       the research money the T5 reprice no longer destroys.
//   (b) T5 RESEARCH REPRICE ÷10 on every node whose authored cost was
//       >= T5_RESEARCH_REPRICE_THRESHOLD (35 nodes — 34 T5 + mega_structures
//       T4; the table below is the pre-reprice ledger for docs and tests),
//       plus a flagship INCOME raise sized so that every income flagship's
//       self-payback lands in FLAGSHIP_PAYBACK_BAND at the reference stack.
//
// Where the floor sits: the parent spec suggested $5B, but $5B catches
// fourteen T3 buildings (mining_mars $5B, orbital_refinery $6B,
// space_station_mars $8B, habitat_mars $15B, space_station_belt $15B …) and
// T1–T3 numbers are explicitly out of scope. The self-payback set starts at
// datacenter_jupiter ($20B); nothing between $16.0B (mining_titan_deep, T5,
// pays back in ~500 mo without help) and $20B exists in the catalog, so $20B
// is the natural cut. Eleven buildings qualify: eight with income
// (datacenter_jupiter, fabrication_titan, mining_europa, mining_titan,
// deep_space_relay, mining_kuiper, mining_triton, mining_pluto) and three
// pure-infrastructure stations (space_station_jupiter, space_station_saturn,
// outpost_outer) whose return is the +15% location bonus, crew quarters,
// hazard shielding and expedition support rather than a service line.
//
// The reference stack used for the payback band is the product of the three
// PERSISTENT, solo-earnable, documented revenue caps a mature corporation
// holds continuously: research serviceRevenueBonus cap (+50%,
// research-tree.ts), the top corporation-tier revenueBonus (+20%,
// corporation-tiers.ts) and one space station at the location (+15%,
// game-engine.ts §1). Transient terms (random events, returning-commander
// boost), prestige resets (legacy) and corporate-scale packs (alliance,
// subsidiaries, victory) are deliberately excluded — the band must be
// reachable by a single diligent corporation, not only by a coalition on a
// lucky month.

import type { BuildingDefinition } from './types';

/** Buildings at or above this authored baseCost are flagships. */
export const FLAGSHIP_COST_FLOOR = 20_000_000_000;

/** Monthly upkeep floor as a fraction of baseCost (0.4%/game-month ≈ 4.8%/yr). */
export const FLAGSHIP_UPKEEP_RATE = 0.004;

/** Product of the three persistent documented revenue caps — see header. */
export const FLAGSHIP_REFERENCE_STACK = 1.5 * 1.2 * 1.15;

/** Target first-copy self-payback (game-months) at FLAGSHIP_REFERENCE_STACK. */
export const FLAGSHIP_PAYBACK_BAND = { min: 120, max: 240 } as const;

/** Pre-reprice authored cost at/above which a research node was divided. */
export const T5_RESEARCH_REPRICE_THRESHOLD = 50_000_000_000;
export const T5_RESEARCH_REPRICE_DIVISOR = 10;

/** Ledger of every repriced research node: id → authored cost BEFORE the ÷10.
 *  research-tree.ts now carries the divided figure; this table is the audit
 *  trail (docs table, guard test) so a future edit cannot silently drift. */
export const T5_RESEARCH_REPRICED: Readonly<Record<string, number>> = {
  space_elevator_cable: 100_000_000_000,
  fusion_drive: 100_000_000_000,
  metallic_hydrogen: 80_000_000_000,
  generation_ships: 200_000_000_000,
  gravitational_wave_det: 50_000_000_000,
  swarm_intelligence: 50_000_000_000,
  fusion_reactor: 80_000_000_000,
  antimatter_reactor: 200_000_000_000,
  automated_mining_fleet: 80_000_000_000,
  self_replicating_miners: 120_000_000_000,
  mega_structures: 50_000_000_000,
  space_elevator_design: 150_000_000_000,
  orbital_ring: 500_000_000_000,
  antimatter_propulsion: 500_000_000_000,
  jump_drive: 500_000_000_000,
  exotic_matter_refining: 200_000_000_000,
  heavy_radiation_shielding: 120_000_000_000,
  interstellar_colonization: 300_000_000_000,
  fission_fragment: 300_000_000_000,
  interstellar_probe: 100_000_000_000,
  magnetic_shield: 100_000_000_000,
  ocean_seeding: 200_000_000_000,
  programmable_matter: 80_000_000_000,
  quantum_cryptanalysis: 50_000_000_000,
  intelligence_directorate: 60_000_000_000,
  oort_cloud_probe: 50_000_000_000,
  exoplanet_survey: 80_000_000_000,
  europan_biochemistry: 60_000_000_000,
  xenobiochemistry: 65_000_000_000,
  deep_biosphere_ecology: 55_000_000_000,
  iso_materials_analysis: 70_000_000_000,
  precursor_studies: 75_000_000_000,
  vacuum_metallurgy_breakthrough: 58_000_000_000,
  hive_pattern_mathematics: 62_000_000_000,
  metric_engineering_refinements: 80_000_000_000,
};

/** Income flagships whose services were retuned for the payback band, with
 *  the pre-D5 `revenuePerMonth` for the docs table / guard test. */
export const FLAGSHIP_INCOME_SET: ReadonlyArray<{ buildingId: string; serviceId: string; prevRevenuePerMonth: number }> = [
  { buildingId: 'datacenter_jupiter', serviceId: 'svc_jupiter_relay', prevRevenuePerMonth: 36_000_000 },
  { buildingId: 'fabrication_titan', serviceId: 'svc_titan_processing', prevRevenuePerMonth: 50_000_000 },
  { buildingId: 'mining_europa', serviceId: 'svc_mining_europa', prevRevenuePerMonth: 120_000_000 },
  { buildingId: 'mining_titan', serviceId: 'svc_mining_titan', prevRevenuePerMonth: 160_000_000 },
  { buildingId: 'deep_space_relay', serviceId: 'svc_deep_space_comm', prevRevenuePerMonth: 40_000_000 },
  { buildingId: 'mining_kuiper', serviceId: 'svc_mining_kuiper', prevRevenuePerMonth: 140_000_000 },
  { buildingId: 'mining_triton', serviceId: 'svc_triton_mining', prevRevenuePerMonth: 101_206_000 },
  { buildingId: 'mining_pluto', serviceId: 'svc_pluto_mining', prevRevenuePerMonth: 108_000_000 },
];

/** Pure-infrastructure flagships (no service line) that still pay the floor. */
export const FLAGSHIP_INFRASTRUCTURE_SET: ReadonlyArray<string> = [
  'space_station_jupiter', 'space_station_saturn', 'outpost_outer',
];

type CostBearing = Pick<BuildingDefinition, 'baseCost' | 'maintenanceCostPerMonth'>;

/** True for every building at or above FLAGSHIP_COST_FLOOR. */
export function isFlagshipBuilding(def: Pick<BuildingDefinition, 'baseCost'>): boolean {
  return Number.isFinite(def.baseCost) && def.baseCost >= FLAGSHIP_COST_FLOOR;
}

/** The upkeep floor in $/game-month (0 for non-flagships). */
export function flagshipUpkeepFloor(def: Pick<BuildingDefinition, 'baseCost'>): number {
  return isFlagshipBuilding(def) ? Math.round(def.baseCost * FLAGSHIP_UPKEEP_RATE) : 0;
}

/**
 * The authored-side monthly maintenance every P&L site must start from:
 * max(authored maintenanceCostPerMonth, flagship floor). Every downstream
 * reduction (research maintenanceReduction, corporation tier, reputation,
 * mothball 25%, congestion, Mark multipliers) applies AFTER this — the floor
 * is a bigger sticker price, not an un-discountable tax.
 */
export function getEffectiveMaintenancePerMonth(def: CostBearing): number {
  return Math.max(def.maintenanceCostPerMonth || 0, flagshipUpkeepFloor(def));
}

/**
 * Self-payback (game-months) for a first copy at a given revenue stack —
 * the arithmetic the D5 band is stated in: baseCost / (revenue x stack −
 * operating − effective maintenance). Returns Infinity when the building
 * never pays back. The harness (`scripts/sim-harness.ts marginalCurve`)
 * is the authoritative figure (it adds pools, power, inputs and overhead);
 * this helper is the transparent back-of-envelope the docs table shows
 * alongside it.
 */
export function flagshipPaybackMonths(
  def: CostBearing,
  service: { revenuePerMonth: number; operatingCostPerMonth: number },
  stack: number = FLAGSHIP_REFERENCE_STACK,
): number {
  const net = service.revenuePerMonth * stack - service.operatingCostPerMonth - getEffectiveMaintenancePerMonth(def);
  return net > 0 ? Math.ceil(def.baseCost / net) : Infinity;
}
