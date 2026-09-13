// ─── Space Tycoon: Resource Definitions ─────────────────────────────────────
// Resources are produced by mining operations and consumed by upgrades,
// research, and fabrication. They can be traded on the multiplayer market.

import { EPOCH_BEGAN_AT } from './world-reset';

export type ResourceId =
  | 'lunar_water'
  | 'mars_water'
  | 'iron'
  | 'aluminum'
  | 'titanium'
  | 'platinum_group'
  | 'gold'
  | 'rare_earth'
  | 'methane'
  | 'ethane'
  | 'exotic_materials'
  | 'helium3'
  // Interstellar era (Wave 10) — see expeditions.ts / interstellar.ts
  | 'exotic_fuel'
  | 'xenogenic_biomatter'
  // ─── Wave E2 "Goods on the Book" (docs/ECONOMY_PVP_2026-08.md §E2) ───────
  // Crafted production-chain outputs (production-chains.ts CRAFTED_PRODUCT_IDS),
  // promoted from untradeable byproducts to first-class market resources.
  | 'steel_ingots'
  | 'aluminum_alloy'
  | 'rocket_fuel'
  | 'refined_rare_earth'
  | 'structural_beams'
  | 'electronics_package'
  | 'solar_panel_array'
  | 'propulsion_unit'
  | 'life_support_pack' // new resource ID (§3.0) — no recipe yet; lands with E3's life_support_works
  | 'station_module'
  | 'satellite_bus'
  | 'ai_compute_cluster'
  | 'fusion_core'
  | 'habitat_pod'
  // Adopted colony-era orphan slugs (§1's audit: 7 `MarketResource` rows that
  // predate `RESOURCE_MAP` — prices/bands sourced verbatim from
  // colonies.ts's COLONY_RESOURCES, which authored them originally).
  | 'ammonia'
  | 'sulfur'
  | 'solar_concentrate'
  | 'organic_compounds'
  | 'deuterium'
  | 'bio_samples'
  | 'antimatter_precursors'
  // ─── Interactive asteroid mining Phase A (docs/SPACE_MINING_DESIGN_2026-09-12.md
  // §4 "Processing"; founder ruling 2026-09-12: ore is a REAL intermediate).
  // Raw ore by spectral class — hauled, stored, sold like any resource;
  // Phase C adds the refinery ratios. Ids fixed now so no save migrates.
  | 'ore_carbonaceous'
  | 'ore_silicate'
  | 'ore_metallic'
  | 'ore_exotic';

// ─── Opening scarcity by origin (Balance Pass 14, 2026-09-14) ───────────────
// Founder ruling (2026-09-13): "We should start the games with non-abundant
// resources of things like Martian water and Lunar water ice which haven't
// been harvested yet … Getting places early and mining should be very
// rewarding. We should probably start all resources at scarce levels to
// support mining."
//
// Two numbers that used to be ONE. `startingSupply` was simultaneously the
// opening stock AND the pricing yardstick
// (`getSupplyPriceMultiplier(supply, baseline)`), so lowering it moved the
// yardstick down with the stock and produced no scarcity at all. They are now
// separate fields:
//
//   baselineSupply — what a FUNCTIONING market holds. The pricing yardstick.
//                    Unchanged from the pre-Pass-14 `startingSupply` figures
//                    (except the four ores, see below), so a mature market
//                    prices exactly as it did before this pass.
//   startingSupply — what actually EXISTS when a world opens.
//
// The gap between them is the windfall. A resource opening at f × baseline
// prices at 1/√f of base, capped by the anti-cornering band ([0.3×, 3.0×] of
// base, price-band.ts) on the seller side and by the resource's maxPrice on
// the buyer side. It closes as players and NPCs mine: every sale and every
// mined unit raises `MarketResource.totalSupply`, the multiplier falls, and
// the hourly mean-revert cron walks spot down to the new fundamental.
//
// Terrestrial goods open TIGHT but NOT scarce: Earth industry already makes
// steel, aluminium, titanium, rare earths and methane and lifts them, so a
// new corporation can still buy the feedstock its first buildings consume.
// That constraint is load-bearing — Balance Pass 10 put the starter launch
// pad on `supplyPolicy: 'market'` for its refined rocket fuel, and the
// cheapest fuel route in production-chains.ts (`synthesize_rp1`) runs on
// market-bought METHANE. Methane is therefore terrestrial on purpose.

export type ResourceOrigin =
  /** Earth industry already makes it at scale and lifts it. Tight, not scarce. */
  | 'terrestrial'
  /** LEO/GEO/lunar-orbit in-space industry. Thin but existent at world open. */
  | 'cislunar'
  /** Lunar surface and regolith — unharvested when a world opens. */
  | 'lunar'
  /** Mercury/Venus in-space industry — unbuilt when a world opens. */
  | 'inner'
  /** Mars surface and subsurface — unharvested when a world opens. */
  | 'martian'
  /** Main belt, Ceres, near-Earth asteroids — unharvested when a world opens. */
  | 'belt'
  /** Jovian, Saturnian, Uranian, Neptunian and Kuiper bodies. Effectively untouched. */
  | 'outer'
  /** Beyond the heliopause. No Sol-side source at all. */
  | 'interstellar'
  /** Manufactured hardware. No NPC price curve — the order book prices it. */
  | 'fabricated';

export interface ResourceOriginProfile {
  id: ResourceOrigin;
  label: string;
  /** Fraction of `baselineSupply` a world opens with. */
  openingFraction: number;
  /** Days after the scarcity clock starts before NPC restock begins at all. */
  rampStartDays: number;
  /** Days after the scarcity clock starts at which NPC restock reaches the
   *  authored mature `npcRestockPerHour`. Equal to rampStartDays ⇒ instant. */
  rampFullDays: number;
  blurb: string;
}

/**
 * The opening-scarcity and NPC-arrival profile per origin.
 *
 * `openingFraction` is chosen so the opening price multiplier (1/√f) reads
 * as a deliberate band rather than a random number:
 *   terrestrial 0.75 → ×1.15   cislunar 0.25 → ×2.0
 *   lunar 0.03 → ×5.8          inner/martian 0.015 → ×8.2
 *   belt 0.02 → ×7.1           outer 0.01 → ×10 (the clamp)
 * None of the off-world tiers is pinned to the ×10 clamp except `outer`,
 * which is the point: nobody has been to Triton.
 *
 * The ramp windows say when an NPC could PLAUSIBLY have built the
 * infrastructure. Earth industry is already there (0 → 0). A lunar ISRU
 * plant is a season's work; a Kuiper operation is a year and a half.
 */
export const RESOURCE_ORIGINS: Record<ResourceOrigin, ResourceOriginProfile> = {
  terrestrial: {
    id: 'terrestrial', label: 'Terrestrial industry', openingFraction: 0.75,
    rampStartDays: 0, rampFullDays: 0,
    blurb: 'Made on Earth and lifted. Tight at world open, never scarce — the on-ramp feedstock.',
  },
  cislunar: {
    id: 'cislunar', label: 'Cislunar space', openingFraction: 0.25,
    rampStartDays: 0, rampFullDays: 14,
    blurb: 'LEO/GEO/lunar-orbit industry exists but is thin. No resource sits here today; it is where future orbital-ISRU outputs land.',
  },
  lunar: {
    id: 'lunar', label: 'Lunar surface', openingFraction: 0.03,
    rampStartDays: 21, rampFullDays: 120,
    blurb: 'Permanently shadowed ice and regolith volatiles. Unharvested at world open; NPC ISRU plants appear over the first four months.',
  },
  inner: {
    id: 'inner', label: 'Inner system', openingFraction: 0.015,
    rampStartDays: 60, rampFullDays: 300,
    blurb: 'Mercury and Venus. Thermally brutal; NPC infrastructure is slow to appear.',
  },
  martian: {
    id: 'martian', label: 'Martian surface', openingFraction: 0.015,
    rampStartDays: 45, rampFullDays: 240,
    blurb: 'Subsurface ice and Martian regolith. The founder\'s named example — opens near empty.',
  },
  belt: {
    id: 'belt', label: 'Asteroid belt', openingFraction: 0.02,
    rampStartDays: 60, rampFullDays: 300,
    blurb: 'Main belt, Ceres and the near-Earth rocks. Nobody has mined an asteroid when a world opens.',
  },
  outer: {
    id: 'outer', label: 'Outer system', openingFraction: 0.01,
    rampStartDays: 120, rampFullDays: 540,
    blurb: 'Jovian, Saturnian, Uranian, Neptunian and Kuiper bodies. Effectively untouched for the first year and a half.',
  },
  interstellar: {
    id: 'interstellar', label: 'Interstellar', openingFraction: 0,
    rampStartDays: Number.POSITIVE_INFINITY, rampFullDays: Number.POSITIVE_INFINITY,
    blurb: 'No Sol-side source. Enters the economy only through interstellar colonies and expeditions.',
  },
  fabricated: {
    id: 'fabricated', label: 'Manufactured', openingFraction: 0,
    rampStartDays: Number.POSITIVE_INFINITY, rampFullDays: Number.POSITIVE_INFINITY,
    blurb: 'Built, not mined. The NPC curve neither sells nor buys it — the order book is the only price.',
  },
};

/**
 * When the opening-scarcity model went live. A world that opened BEFORE this
 * date (Epoch 2 opened 2026-08-24) has its scarcity clock start here instead
 * of at its epoch start, so the live world gets the full head start rather
 * than three weeks of NPC ramp it never actually ran.
 */
export const OPENING_SCARCITY_LIVE_AT: number = Date.UTC(2026, 8, 14, 0, 0, 0);

/** Start of the NPC-arrival clock for a world whose epoch began at `epochBeganAtMs`. */
export function scarcityClockStartMs(epochBeganAtMs: number = EPOCH_BEGAN_AT): number {
  return Math.max(epochBeganAtMs, OPENING_SCARCITY_LIVE_AT);
}

/** Days elapsed on the scarcity clock. Never negative. */
export function scarcityClockDays(nowMs: number, epochBeganAtMs: number = EPOCH_BEGAN_AT): number {
  return Math.max(0, (nowMs - scarcityClockStartMs(epochBeganAtMs)) / 86_400_000);
}

/**
 * Fraction of the authored mature `npcRestockPerHour` the NPC backdrop is
 * running at, for this origin, this many days into the world. 0 before the
 * origin's infrastructure could exist, linear to 1 across its window.
 */
export function npcRestockRampFactor(origin: ResourceOrigin, clockDays: number): number {
  const p = RESOURCE_ORIGINS[origin];
  if (!p || !Number.isFinite(p.rampStartDays)) return 0;
  if (clockDays < p.rampStartDays) return 0;
  // Zero-width window (terrestrial): the infrastructure is already there.
  if (p.rampFullDays <= p.rampStartDays) return 1;
  return Math.max(0, Math.min(1, (clockDays - p.rampStartDays) / (p.rampFullDays - p.rampStartDays)));
}

/**
 * Units the NPC backdrop actually adds per real hour right now.
 *
 * `populationScale` (npc-industry.ts's populationScale, 1 at low population,
 * floor 0.25 at 200+ active corporations) is folded in so the NPC restock
 * floor recedes as the player base grows, exactly as NPC_BACKDROP.md
 * requires: "NPCs are a floor, not a ceiling." It defaults to 1 so every
 * existing caller and test is unchanged.
 */
export function effectiveNpcRestockPerHour(
  def: Pick<ResourceDefinition, 'origin' | 'npcRestockPerHour'>,
  nowMs: number,
  opts: { epochBeganAtMs?: number; populationScale?: number } = {},
): number {
  const base = Number.isFinite(def.npcRestockPerHour) ? def.npcRestockPerHour : 0;
  if (base <= 0) return 0;
  const ramp = npcRestockRampFactor(def.origin, scarcityClockDays(nowMs, opts.epochBeganAtMs ?? EPOCH_BEGAN_AT));
  const pop = typeof opts.populationScale === 'number' && Number.isFinite(opts.populationScale)
    ? Math.max(0, Math.min(1, opts.populationScale))
    : 1;
  return base * ramp * pop;
}

/** Opening stock implied by a baseline and an origin (the authored
 *  `startingSupply` values are exactly this, and a test enforces it). */
export function computeOpeningSupply(baselineSupply: number, origin: ResourceOrigin): number {
  const f = RESOURCE_ORIGINS[origin]?.openingFraction ?? 0;
  return Math.max(0, Math.round(baselineSupply * f));
}

export interface ResourceDefinition {
  id: ResourceId;
  name: string;
  icon: string;
  category: 'water' | 'metal' | 'precious' | 'rare_earth' | 'hydrocarbon' | 'exotic'
    // Wave E2: crafted-goods tiers (§E2 "category refined/component/product")
    | 'refined' | 'component' | 'product'
    // Wave E2: adopted colony-resource categories (verbatim from colonies.ts)
    | 'industrial' | 'energy'
    // Mining Phase A (2026-09-12): raw asteroid ore — bulk, low value per
    // unit, refined in Phase C. cargo-logistics.ts weighs it at
    // ORE_LOAD_WEIGHT against a hold.
    | 'ore';
  description: string;
  baseMarketPrice: number; // $ per unit
  minPrice: number;
  maxPrice: number;
  volatility: number; // price sensitivity to supply/demand (0.01 = stable, 0.15 = volatile)
  /**
   * Where the resource physically comes from (Balance Pass 14). Decides how
   * much of it exists when a world opens and when NPC supply plausibly
   * arrives. See RESOURCE_ORIGINS above.
   */
  origin: ResourceOrigin;
  /**
   * PRICING BASELINE — what a FUNCTIONING, mature market for this resource
   * holds. This is the yardstick `getSupplyPriceMultiplier` measures live
   * supply against; it never changes over a world's life. It is NOT what the
   * world opens with (see `startingSupply`).
   *
   * 0 means "this resource has no NPC price curve at all" (manufactured and
   * interstellar goods, priced purely by the order book) — the supply
   * multiplier is a flat 1.0 for them.
   */
  baselineSupply: number;
  /**
   * OPENING STOCK — how many units exist on the market the day a world
   * opens, before anybody has mined anything. Derived from
   * `baselineSupply × RESOURCE_ORIGINS[origin].openingFraction`
   * (computeOpeningSupply); an off-world resource nobody has harvested yet
   * opens at a small fraction of its baseline, so the first corporation to
   * land and mine sells into a hungry market.
   */
  startingSupply: number;
  /**
   * MATURE NPC restock rate: units the NPC backdrop adds per real hour once
   * its infrastructure for this origin exists. A fresh world does not start
   * here — `effectiveNpcRestockPerHour` ramps it in from zero over the
   * origin's window so NPCs arrive rather than pre-empt the player.
   */
  npcRestockPerHour: number;
}

export type ResourceInventory = Partial<Record<ResourceId, number>>;

export const RESOURCES: ResourceDefinition[] = [
  // ─── WATER / ICE ──────────────────────────────────────────────────────
  {
    id: 'lunar_water', name: 'Lunar Water Ice', icon: '💧', category: 'water',
    description: 'Extracted from permanently shadowed craters. Splits into H2+O2 for propellant.',
    baseMarketPrice: 50_000, minPrice: 10_000, maxPrice: 500_000, volatility: 0.03,
    origin: 'lunar', baselineSupply: 3000, startingSupply: 90, npcRestockPerHour: 15,
  },
  {
    id: 'mars_water', name: 'Martian Water', icon: '🧊', category: 'water',
    description: 'Subsurface ice from Mars. Essential for colony life support.',
    baseMarketPrice: 80_000, minPrice: 20_000, maxPrice: 800_000, volatility: 0.04,
    origin: 'martian', baselineSupply: 2000, startingSupply: 30, npcRestockPerHour: 10,
  },

  // ─── METALS ───────────────────────────────────────────────────────────
  {
    id: 'iron', name: 'Iron Ore', icon: '🔩', category: 'metal',
    description: 'Structural metal for construction. Abundant in asteroids and Mars.',
    baseMarketPrice: 5_000, minPrice: 1_000, maxPrice: 50_000, volatility: 0.02,
    origin: 'terrestrial', baselineSupply: 10_000, startingSupply: 7500, npcRestockPerHour: 50,
  },
  {
    id: 'aluminum', name: 'Aluminum', icon: '🪶', category: 'metal',
    description: 'Lightweight structural metal. Used in spacecraft hulls and habitats.',
    baseMarketPrice: 8_000, minPrice: 2_000, maxPrice: 80_000, volatility: 0.03,
    origin: 'terrestrial', baselineSupply: 5000, startingSupply: 3750, npcRestockPerHour: 25,
  },
  {
    id: 'titanium', name: 'Titanium', icon: '⚙️', category: 'metal',
    description: 'High-strength, heat-resistant metal for engines and critical structures.',
    baseMarketPrice: 25_000, minPrice: 8_000, maxPrice: 250_000, volatility: 0.05,
    origin: 'terrestrial', baselineSupply: 2000, startingSupply: 1500, npcRestockPerHour: 8,
  },

  // ─── PRECIOUS METALS ──────────────────────────────────────────────────
  {
    id: 'platinum_group', name: 'Platinum Group Metals', icon: '💎', category: 'precious',
    description: 'Platinum, palladium, rhodium. Catalysts, electronics, and high-value export.',
    baseMarketPrice: 500_000, minPrice: 100_000, maxPrice: 5_000_000, volatility: 0.08,
    origin: 'belt', baselineSupply: 200, startingSupply: 4, npcRestockPerHour: 1,
  },
  {
    id: 'gold', name: 'Gold', icon: '🥇', category: 'precious',
    description: 'Conductor and store of value. Found in metallic asteroids.',
    baseMarketPrice: 300_000, minPrice: 80_000, maxPrice: 3_000_000, volatility: 0.06,
    origin: 'belt', baselineSupply: 300, startingSupply: 6, npcRestockPerHour: 2,
  },

  // ─── RARE EARTH ───────────────────────────────────────────────────────
  {
    id: 'rare_earth', name: 'Rare Earth Elements', icon: '🔬', category: 'rare_earth',
    description: 'Critical for electronics, sensors, and advanced propulsion systems.',
    baseMarketPrice: 200_000, minPrice: 50_000, maxPrice: 2_000_000, volatility: 0.07,
    origin: 'terrestrial', baselineSupply: 500, startingSupply: 375, npcRestockPerHour: 3,
  },

  // ─── HYDROCARBONS ─────────────────────────────────────────────────────
  {
    id: 'methane', name: 'Methane (CH4)', icon: '⛽', category: 'hydrocarbon',
    description: 'Rocket fuel and chemical feedstock. Abundant on Titan.',
    baseMarketPrice: 15_000, minPrice: 3_000, maxPrice: 150_000, volatility: 0.04,
    origin: 'terrestrial', baselineSupply: 1000, startingSupply: 750, npcRestockPerHour: 12,
  },
  {
    id: 'ethane', name: 'Ethane (C2H6)', icon: '🛢️', category: 'hydrocarbon',
    description: 'Chemical feedstock for plastics and materials. From Titan\'s lakes.',
    baseMarketPrice: 20_000, minPrice: 5_000, maxPrice: 200_000, volatility: 0.05,
    origin: 'outer', baselineSupply: 800, startingSupply: 8, npcRestockPerHour: 8,
  },

  // ─── EXOTIC ───────────────────────────────────────────────────────────
  {
    id: 'exotic_materials', name: 'Exotic Materials', icon: '✨', category: 'exotic',
    description: 'Unique compounds from Europa\'s subsurface ocean. Extreme scientific value.',
    baseMarketPrice: 2_000_000, minPrice: 500_000, maxPrice: 20_000_000, volatility: 0.15,
    origin: 'outer', baselineSupply: 50, startingSupply: 1, npcRestockPerHour: 0.2,
  },
  {
    id: 'helium3', name: 'Helium-3', icon: '⚛️', category: 'exotic',
    description: 'Fusion fuel isotope from lunar regolith. The ultimate energy source.',
    baseMarketPrice: 5_000_000, minPrice: 1_000_000, maxPrice: 50_000_000, volatility: 0.12,
    origin: 'lunar', baselineSupply: 20, startingSupply: 1, npcRestockPerHour: 0.1,
  },

  // ─── INTERSTELLAR (Wave 10) ───────────────────────────────────────────
  // Numbers for exotic_fuel come verbatim from EXOTIC_FUEL_RESOURCE in
  // interstellar.ts (the Phase VIII data spec). Neither resource has NPC
  // supply — they enter the economy only through interstellar colonies and
  // trade routes (expeditions.ts), per STATS_DESIGN §13 "Interstellar
  // markets: commodities unique to specific star systems."
  {
    id: 'exotic_fuel', name: 'Exotic-Matter Fuel', icon: '⚛️', category: 'exotic',
    description: 'Concentrated negative-mass particulates. Required to sustain the Alcubierre warp bubble on interstellar jumps.',
    baseMarketPrice: 5_000_000, minPrice: 1_000_000, maxPrice: 50_000_000, volatility: 0.12,
    origin: 'interstellar', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'xenogenic_biomatter', name: 'Xenogenic Biomatter', icon: '🧬', category: 'exotic',
    description: 'Non-terrestrial biological compounds — the trade currency of the Hive Collective. Found only beyond the heliopause.',
    baseMarketPrice: 8_000_000, minPrice: 2_000_000, maxPrice: 80_000_000, volatility: 0.15,
    origin: 'interstellar', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },

  // ─── WAVE E2 "GOODS ON THE BOOK" — CRAFTED PRODUCTS ───────────────────
  // docs/ECONOMY_PVP_2026-08.md §E2. Promotes production-chains.ts outputs
  // to first-class tradeable resources. baseMarketPrice mirrors each
  // recipe's existing `marketValue` in production-chains.ts (the number
  // every downstream surface — mega-projects, building costs, the crafting
  // panel's "sells for" readout — already anchors to), so promotion doesn't
  // silently reprice anything on day one; the live order book takes over
  // from there. No NPC production exists yet for any of these (that's
  // E3's consumption/production engine), so — same treatment as
  // exotic_fuel/xenogenic_biomatter above — startingSupply/npcRestockPerHour
  // are 0 and every ID is listed in economic-sinks.ts's
  // MINED_ONLY_RESOURCE_IDS: players must craft them or trade player-to-
  // player via the order book. Selling remains fully open (the E2 payoff).

  // Tier 1 — Refined
  {
    id: 'steel_ingots', name: 'Steel Ingots', icon: '🔩', category: 'refined',
    description: 'Smelted structural steel. The base input for beams, hulls, and station frames.',
    baseMarketPrice: 50_000, minPrice: 12_000, maxPrice: 300_000, volatility: 0.05,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'aluminum_alloy', name: 'Aluminum Alloy', icon: '🪶', category: 'refined',
    description: 'Aluminum-titanium alloy processed for spacecraft-grade structural use.',
    baseMarketPrice: 80_000, minPrice: 20_000, maxPrice: 480_000, volatility: 0.05,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'rocket_fuel', name: 'Refined Rocket Fuel', icon: '⛽', category: 'refined',
    description: 'Cracked water ice, refined into launch-grade propellant.',
    baseMarketPrice: 120_000, minPrice: 30_000, maxPrice: 720_000, volatility: 0.05,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'refined_rare_earth', name: 'Refined Rare Earth Oxides', icon: '🔬', category: 'refined',
    description: 'Processed rare-earth oxides — the feedstock for electronics and solar manufacturing.',
    baseMarketPrice: 500_000, minPrice: 125_000, maxPrice: 3_000_000, volatility: 0.06,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },

  // Tier 2 — Components
  {
    id: 'structural_beams', name: 'Structural Beams', icon: '🏗️', category: 'component',
    description: 'Forged steel-and-alloy beams. The construction backbone for station modules.',
    baseMarketPrice: 800_000, minPrice: 200_000, maxPrice: 4_800_000, volatility: 0.07,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'electronics_package', name: 'Electronics Package', icon: '💻', category: 'component',
    description: 'Rad-hardened avionics and compute modules built from refined rare earths and gold.',
    baseMarketPrice: 1_500_000, minPrice: 375_000, maxPrice: 9_000_000, volatility: 0.07,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'solar_panel_array', name: 'Solar Panel Array', icon: '☀️', category: 'component',
    description: 'Perovskite-tandem panel assemblies for power generation.',
    baseMarketPrice: 1_200_000, minPrice: 300_000, maxPrice: 7_200_000, volatility: 0.07,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'propulsion_unit', name: 'Propulsion Unit', icon: '💨', category: 'component',
    description: 'Assembled Hall-thruster propulsion module — titanium frame, fuel, and avionics.',
    baseMarketPrice: 3_000_000, minPrice: 750_000, maxPrice: 18_000_000, volatility: 0.08,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'life_support_pack', name: 'Life Support Pack', icon: '🫁', category: 'component',
    description: 'Water, ammonia, and organic-compound cartridge sized for 25 crew per game-month. New in Wave E2 — the recipe and life_support_works building land with the Consumption Engine wave.',
    baseMarketPrice: 400_000, minPrice: 100_000, maxPrice: 2_400_000, volatility: 0.06,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },

  // Tier 3–4 — Products (T4 gets zero NPC maker liquidity — see
  // market-orderbook.ts's NPC_VOLUME_CAPS — player-only markets at the top
  // of the chain, per this same MINED_ONLY precedent, so crafting can't be
  // laundered into a free-money printer via NPC standing orders.)
  {
    id: 'station_module', name: 'Station Module Kit', icon: '🏠', category: 'product',
    description: 'Prefabricated station module — beams, electronics, and solar assembled into a habitable kit.',
    baseMarketPrice: 15_000_000, minPrice: 3_000_000, maxPrice: 120_000_000, volatility: 0.10,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'satellite_bus', name: 'Satellite Bus', icon: '🛰️', category: 'product',
    description: 'Complete satellite platform — electronics, solar, propulsion, and airframe.',
    baseMarketPrice: 12_000_000, minPrice: 2_400_000, maxPrice: 96_000_000, volatility: 0.10,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'ai_compute_cluster', name: 'AI Compute Cluster', icon: '🧠', category: 'product',
    description: 'Rack-scale neuromorphic compute cluster for datacenter and constellation control.',
    baseMarketPrice: 20_000_000, minPrice: 4_000_000, maxPrice: 160_000_000, volatility: 0.10,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'fusion_core', name: 'Fusion Core', icon: '⚛️', category: 'product',
    description: 'Assembled He-3/exotic-materials fusion reactor core. Top of the energy chain.',
    baseMarketPrice: 80_000_000, minPrice: 16_000_000, maxPrice: 800_000_000, volatility: 0.13,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'habitat_pod', name: 'Habitat Pod', icon: '🏘️', category: 'product',
    description: 'Fully outfitted crewed habitat pod — station modules, solar, beams, and water reserves.',
    baseMarketPrice: 50_000_000, minPrice: 10_000_000, maxPrice: 500_000_000, volatility: 0.13,
    origin: 'fabricated', baselineSupply: 0, startingSupply: 0, npcRestockPerHour: 0,
  },

  // ─── WAVE E2 — ADOPTED COLONY-ERA ORPHAN SLUGS ────────────────────────
  // These 7 already have live MarketResource rows in prod (colonies.ts's
  // COLONY_RESOURCES seeded them once, standalone, before RESOURCE_MAP
  // existed as the single source of truth) — prices/bands below are
  // copied verbatim from colonies.ts so re-running /market/init doesn't
  // move anyone's live spot. Real NPC production exists for these
  // (colonies.ts COLONY_MINING_PRODUCTION) so, unlike the crafted goods
  // above, they stay normally buyable — not MINED_ONLY.
  {
    id: 'sulfur', name: 'Sulfur', icon: '🟡', category: 'industrial',
    description: 'Geothermal sulfur deposits from Io\'s volcanic surface. Industrial feedstock.',
    baseMarketPrice: 12_000, minPrice: 3_000, maxPrice: 50_000, volatility: 0.04,
    origin: 'outer', baselineSupply: 4000, startingSupply: 40, npcRestockPerHour: 20,
  },
  {
    id: 'ammonia', name: 'Ammonia', icon: '💨', category: 'industrial',
    description: 'Ceres ice-mine ammonia. Feedstock for life support and industrial chemistry.',
    baseMarketPrice: 18_000, minPrice: 5_000, maxPrice: 70_000, volatility: 0.05,
    origin: 'belt', baselineSupply: 3000, startingSupply: 60, npcRestockPerHour: 15,
  },
  {
    id: 'solar_concentrate', name: 'Solar Concentrate', icon: '☀️', category: 'energy',
    description: 'Mercury orbital-array concentrated solar feedstock for energy systems.',
    baseMarketPrice: 25_000, minPrice: 5_000, maxPrice: 100_000, volatility: 0.03,
    origin: 'inner', baselineSupply: 1500, startingSupply: 23, npcRestockPerHour: 10,
  },
  {
    id: 'organic_compounds', name: 'Organic Compounds', icon: '🧬', category: 'exotic',
    description: 'Complex organics from Ceres and Titan agriculture. Life-support and biochemistry feedstock.',
    baseMarketPrice: 800_000, minPrice: 200_000, maxPrice: 4_000_000, volatility: 0.10,
    origin: 'belt', baselineSupply: 250, startingSupply: 5, npcRestockPerHour: 1.5,
  },
  {
    id: 'deuterium', name: 'Deuterium', icon: '⚛️', category: 'exotic',
    description: 'Uranian-moon deuterium ice, refined for fusion-reactor fuel cycles.',
    baseMarketPrice: 8_000_000, minPrice: 2_000_000, maxPrice: 30_000_000, volatility: 0.12,
    origin: 'outer', baselineSupply: 15, startingSupply: 0, npcRestockPerHour: 0.08,
  },
  {
    id: 'bio_samples', name: 'Bio Samples', icon: '🧫', category: 'exotic',
    description: 'Enceladus hydrothermal-vent biological samples. Prized by research corps and the Hive trade.',
    baseMarketPrice: 15_000_000, minPrice: 5_000_000, maxPrice: 50_000_000, volatility: 0.15,
    origin: 'outer', baselineSupply: 8, startingSupply: 0, npcRestockPerHour: 0.04,
  },
  {
    id: 'antimatter_precursors', name: 'Antimatter Precursors', icon: '✴️', category: 'exotic',
    description: 'Triton Archive antimatter-precursor compounds. Interstellar-era propulsion research feedstock.',
    baseMarketPrice: 50_000_000, minPrice: 10_000_000, maxPrice: 200_000_000, volatility: 0.20,
    origin: 'outer', baselineSupply: 3, startingSupply: 0, npcRestockPerHour: 0.015,
  },

  // ─── RAW ASTEROID ORE (mining Phase A, 2026-09-12) ─────────────────────
  // Priced BELOW the refined goods each class yields (Phase C ratios), so
  // hauling ore is the low-margin option and refining near the field is the
  // reason depots and refinery barges exist. NPC restock is thin: the NPC
  // backdrop mines little ore of its own, so player supply moves the price.
  {
    id: 'ore_carbonaceous', name: 'Carbonaceous Ore', icon: '🪨', category: 'ore',
    description: 'Raw C-type asteroid material: water ice, carbon, organics. Refines to water and organics (Phase C).',
    baseMarketPrice: 14_000, minPrice: 3_500, maxPrice: 70_000, volatility: 0.04,
    origin: 'belt', baselineSupply: 3200, startingSupply: 64, npcRestockPerHour: 4,
  },
  {
    id: 'ore_silicate', name: 'Silicate Ore', icon: '🪨', category: 'ore',
    description: 'Raw S-type asteroid material: iron, nickel, silicates. The bulk starter ore — cheap, heavy, everywhere.',
    baseMarketPrice: 7_000, minPrice: 1_500, maxPrice: 35_000, volatility: 0.03,
    origin: 'belt', baselineSupply: 6000, startingSupply: 120, npcRestockPerHour: 8,
  },
  {
    id: 'ore_metallic', name: 'Metallic Ore', icon: '🪨', category: 'ore',
    description: 'Raw M-type asteroid material: iron-nickel with platinum-group and gold inclusions. The prize of the belt.',
    baseMarketPrice: 10_000, minPrice: 2_500, maxPrice: 50_000, volatility: 0.06,
    origin: 'belt', baselineSupply: 1600, startingSupply: 32, npcRestockPerHour: 2,
  },
  {
    id: 'ore_exotic', name: 'Exotic Ore', icon: '🪨', category: 'ore',
    description: 'Raw X-type material from the outer swarms: exotic-bearing matrices no fixed refinery on Earth is tuned for yet.',
    baseMarketPrice: 70_000, minPrice: 15_000, maxPrice: 350_000, volatility: 0.10,
    origin: 'outer', baselineSupply: 240, startingSupply: 2, npcRestockPerHour: 0.3,
  },
];

export const RESOURCE_MAP = new Map(RESOURCES.map(r => [r.id, r]));

/**
 * The pricing yardstick for a slug — what a functioning market holds.
 * ALWAYS use this rather than reading `startingSupply`: `startingSupply` is
 * the opening stock and measuring live supply against it would price a
 * freshly-opened world as if it were mature (Balance Pass 14).
 *
 * Returns 0 for manufactured/interstellar goods (no NPC curve; the multiplier
 * is 1.0) and `fallback` for a MarketResource row with no definition at all.
 */
export function getPricingBaseline(slug: string, fallback: number = 1000): number {
  const def = RESOURCE_MAP.get(slug as ResourceId);
  return def ? def.baselineSupply : fallback;
}

/** The opening stock for a slug — what a fresh world seeds onto the market. */
export function getOpeningSupply(slug: string): number {
  return RESOURCE_MAP.get(slug as ResourceId)?.startingSupply ?? 0;
}

/** Every resource whose market is priced by the NPC supply curve (baseline > 0). */
export function curvePricedResources(): ResourceDefinition[] {
  return RESOURCES.filter(r => r.baselineSupply > 0);
}

/** What each mining service produces per game month */
export const MINING_PRODUCTION: Record<string, { resource: ResourceId; amountPerMonth: number }[]> = {
  svc_mining_lunar_basic: [
    { resource: 'lunar_water', amountPerMonth: 20 },
    { resource: 'helium3', amountPerMonth: 0.5 },
  ],
  svc_mining_lunar: [
    { resource: 'lunar_water', amountPerMonth: 100 },
    { resource: 'helium3', amountPerMonth: 2 },
  ],
  svc_mining_mars: [
    { resource: 'mars_water', amountPerMonth: 80 },
    { resource: 'iron', amountPerMonth: 200 },
    { resource: 'aluminum', amountPerMonth: 50 },
  ],
  svc_mining_asteroid: [
    { resource: 'iron', amountPerMonth: 500 },
    { resource: 'platinum_group', amountPerMonth: 10 },
    { resource: 'gold', amountPerMonth: 15 },
    { resource: 'rare_earth', amountPerMonth: 20 },
    { resource: 'titanium', amountPerMonth: 30 },
  ],
  svc_mining_europa: [
    { resource: 'exotic_materials', amountPerMonth: 5 },
    { resource: 'lunar_water', amountPerMonth: 200 }, // Europa has lots of water
  ],
  svc_mining_titan: [
    { resource: 'methane', amountPerMonth: 300 },
    { resource: 'ethane', amountPerMonth: 150 },
  ],
  // Ground tracking and fabrication produce small amounts
  svc_fabrication_orbital: [
    { resource: 'titanium', amountPerMonth: 5 },
    { resource: 'rare_earth', amountPerMonth: 3 },
  ],
  svc_fabrication_lunar: [
    { resource: 'aluminum', amountPerMonth: 30 },
    { resource: 'iron', amountPerMonth: 50 },
  ],
  svc_mining_kuiper: [
    { resource: 'exotic_materials', amountPerMonth: 3 },
    { resource: 'helium3', amountPerMonth: 2 },
    { resource: 'platinum_group', amountPerMonth: 8 },
  ],
  svc_titan_processing: [
    { resource: 'methane', amountPerMonth: 15 },
    { resource: 'ethane', amountPerMonth: 10 },
  ],


  // ─── AAA Round 1 E3.4 — colony extraction ────────────────────────────────
  // Monthly output for the 12 colony mining services. These are the entries
  // that make an unlocked body produce something: without a MINING_PRODUCTION
  // key a `mining_output` service yields zero resources and falls back to its
  // flat revenue figure (game-engine.ts §1 and §6 both key off this map).
  //
  // colonies.ts exports a parallel COLONY_MINING_PRODUCTION that no consumer
  // has ever read (scripts/sim-harness.ts and docs/BALANCE.md both say so in
  // as many words). This is the real one; every `resource` below is a genuine
  // ResourceId, and every mix reflects the body's authored `uniqueResources`.
  svc_mining_ceres: [
    { resource: 'ammonia', amountPerMonth: 600 },
    { resource: 'organic_compounds', amountPerMonth: 10 },
    { resource: 'iron', amountPerMonth: 960 },
  ],
  svc_venus_volatiles: [
    { resource: 'sulfur', amountPerMonth: 1000 },
    { resource: 'ammonia', amountPerMonth: 467 },
    { resource: 'methane', amountPerMonth: 240 },
  ],
  svc_mercury_mining: [
    { resource: 'iron', amountPerMonth: 1440 },
    { resource: 'platinum_group', amountPerMonth: 22 },
    { resource: 'rare_earth', amountPerMonth: 30 },
  ],
  svc_io_mining: [
    { resource: 'sulfur', amountPerMonth: 1333 },
    { resource: 'iron', amountPerMonth: 2000 },
    { resource: 'rare_earth', amountPerMonth: 70 },
  ],
  svc_europa_deep_mining: [
    { resource: 'exotic_materials', amountPerMonth: 11 },
    { resource: 'organic_compounds', amountPerMonth: 22 },
  ],
  svc_mining_ganymede: [
    { resource: 'iron', amountPerMonth: 2000 },
    { resource: 'titanium', amountPerMonth: 640 },
    { resource: 'rare_earth', amountPerMonth: 70 },
  ],
  svc_mining_callisto: [
    { resource: 'iron', amountPerMonth: 2400 },
    { resource: 'aluminum', amountPerMonth: 1500 },
    { resource: 'ammonia', amountPerMonth: 889 },
  ],
  svc_titan_lake_mining: [
    { resource: 'methane', amountPerMonth: 1707 },
    { resource: 'ethane', amountPerMonth: 1120 },
    { resource: 'organic_compounds', amountPerMonth: 20 },
  ],
  svc_enceladus_collection: [
    { resource: 'organic_compounds', amountPerMonth: 32 },
    { resource: 'bio_samples', amountPerMonth: 1 },
    { resource: 'ammonia', amountPerMonth: 889 },
  ],
  svc_titania_mining: [
    { resource: 'deuterium', amountPerMonth: 4 },
    { resource: 'titanium', amountPerMonth: 512 },
    { resource: 'rare_earth', amountPerMonth: 80 },
  ],
  svc_triton_mining: [
    { resource: 'antimatter_precursors', amountPerMonth: 1 },
    { resource: 'deuterium', amountPerMonth: 4 },
    { resource: 'ammonia', amountPerMonth: 1067 },
  ],
  svc_pluto_mining: [
    { resource: 'antimatter_precursors', amountPerMonth: 1 },
    { resource: 'exotic_materials', amountPerMonth: 17 },
    { resource: 'rare_earth', amountPerMonth: 120 },
  ],
};
