// ─── Space Tycoon: Resource Definitions ─────────────────────────────────────
// Resources are produced by mining operations and consumed by upgrades,
// research, and fabrication. They can be traded on the multiplayer market.

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
  | 'antimatter_precursors';

export interface ResourceDefinition {
  id: ResourceId;
  name: string;
  icon: string;
  category: 'water' | 'metal' | 'precious' | 'rare_earth' | 'hydrocarbon' | 'exotic'
    // Wave E2: crafted-goods tiers (§E2 "category refined/component/product")
    | 'refined' | 'component' | 'product'
    // Wave E2: adopted colony-resource categories (verbatim from colonies.ts)
    | 'industrial' | 'energy';
  description: string;
  baseMarketPrice: number; // $ per unit
  minPrice: number;
  maxPrice: number;
  volatility: number; // price sensitivity to supply/demand (0.01 = stable, 0.15 = volatile)
  /** Starting market supply quantity. This is the baseline for supply-based pricing. */
  startingSupply: number;
  /** NPC restock rate: units added to market per real hour by NPC market makers */
  npcRestockPerHour: number;
}

export type ResourceInventory = Partial<Record<ResourceId, number>>;

export const RESOURCES: ResourceDefinition[] = [
  // ─── WATER / ICE ──────────────────────────────────────────────────────
  {
    id: 'lunar_water', name: 'Lunar Water Ice', icon: '💧', category: 'water',
    description: 'Extracted from permanently shadowed craters. Splits into H2+O2 for propellant.',
    baseMarketPrice: 50_000, minPrice: 10_000, maxPrice: 500_000, volatility: 0.03,
    startingSupply: 3_000, npcRestockPerHour: 15,
  },
  {
    id: 'mars_water', name: 'Martian Water', icon: '🧊', category: 'water',
    description: 'Subsurface ice from Mars. Essential for colony life support.',
    baseMarketPrice: 80_000, minPrice: 20_000, maxPrice: 800_000, volatility: 0.04,
    startingSupply: 2_000, npcRestockPerHour: 10,
  },

  // ─── METALS ───────────────────────────────────────────────────────────
  {
    id: 'iron', name: 'Iron Ore', icon: '🔩', category: 'metal',
    description: 'Structural metal for construction. Abundant in asteroids and Mars.',
    baseMarketPrice: 5_000, minPrice: 1_000, maxPrice: 50_000, volatility: 0.02,
    startingSupply: 10_000, npcRestockPerHour: 50,
  },
  {
    id: 'aluminum', name: 'Aluminum', icon: '🪶', category: 'metal',
    description: 'Lightweight structural metal. Used in spacecraft hulls and habitats.',
    baseMarketPrice: 8_000, minPrice: 2_000, maxPrice: 80_000, volatility: 0.03,
    startingSupply: 5_000, npcRestockPerHour: 25,
  },
  {
    id: 'titanium', name: 'Titanium', icon: '⚙️', category: 'metal',
    description: 'High-strength, heat-resistant metal for engines and critical structures.',
    baseMarketPrice: 25_000, minPrice: 8_000, maxPrice: 250_000, volatility: 0.05,
    startingSupply: 2_000, npcRestockPerHour: 8,
  },

  // ─── PRECIOUS METALS ──────────────────────────────────────────────────
  {
    id: 'platinum_group', name: 'Platinum Group Metals', icon: '💎', category: 'precious',
    description: 'Platinum, palladium, rhodium. Catalysts, electronics, and high-value export.',
    baseMarketPrice: 500_000, minPrice: 100_000, maxPrice: 5_000_000, volatility: 0.08,
    startingSupply: 200, npcRestockPerHour: 1,
  },
  {
    id: 'gold', name: 'Gold', icon: '🥇', category: 'precious',
    description: 'Conductor and store of value. Found in metallic asteroids.',
    baseMarketPrice: 300_000, minPrice: 80_000, maxPrice: 3_000_000, volatility: 0.06,
    startingSupply: 300, npcRestockPerHour: 2,
  },

  // ─── RARE EARTH ───────────────────────────────────────────────────────
  {
    id: 'rare_earth', name: 'Rare Earth Elements', icon: '🔬', category: 'rare_earth',
    description: 'Critical for electronics, sensors, and advanced propulsion systems.',
    baseMarketPrice: 200_000, minPrice: 50_000, maxPrice: 2_000_000, volatility: 0.07,
    startingSupply: 500, npcRestockPerHour: 3,
  },

  // ─── HYDROCARBONS ─────────────────────────────────────────────────────
  {
    id: 'methane', name: 'Methane (CH4)', icon: '⛽', category: 'hydrocarbon',
    description: 'Rocket fuel and chemical feedstock. Abundant on Titan.',
    baseMarketPrice: 15_000, minPrice: 3_000, maxPrice: 150_000, volatility: 0.04,
    startingSupply: 1_000, npcRestockPerHour: 12,
  },
  {
    id: 'ethane', name: 'Ethane (C2H6)', icon: '🛢️', category: 'hydrocarbon',
    description: 'Chemical feedstock for plastics and materials. From Titan\'s lakes.',
    baseMarketPrice: 20_000, minPrice: 5_000, maxPrice: 200_000, volatility: 0.05,
    startingSupply: 800, npcRestockPerHour: 8,
  },

  // ─── EXOTIC ───────────────────────────────────────────────────────────
  {
    id: 'exotic_materials', name: 'Exotic Materials', icon: '✨', category: 'exotic',
    description: 'Unique compounds from Europa\'s subsurface ocean. Extreme scientific value.',
    baseMarketPrice: 2_000_000, minPrice: 500_000, maxPrice: 20_000_000, volatility: 0.15,
    startingSupply: 50, npcRestockPerHour: 0.2,
  },
  {
    id: 'helium3', name: 'Helium-3', icon: '⚛️', category: 'exotic',
    description: 'Fusion fuel isotope from lunar regolith. The ultimate energy source.',
    baseMarketPrice: 5_000_000, minPrice: 1_000_000, maxPrice: 50_000_000, volatility: 0.12,
    startingSupply: 20, npcRestockPerHour: 0.1,
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
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'xenogenic_biomatter', name: 'Xenogenic Biomatter', icon: '🧬', category: 'exotic',
    description: 'Non-terrestrial biological compounds — the trade currency of the Hive Collective. Found only beyond the heliopause.',
    baseMarketPrice: 8_000_000, minPrice: 2_000_000, maxPrice: 80_000_000, volatility: 0.15,
    startingSupply: 0, npcRestockPerHour: 0,
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
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'aluminum_alloy', name: 'Aluminum Alloy', icon: '🪶', category: 'refined',
    description: 'Aluminum-titanium alloy processed for spacecraft-grade structural use.',
    baseMarketPrice: 80_000, minPrice: 20_000, maxPrice: 480_000, volatility: 0.05,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'rocket_fuel', name: 'Refined Rocket Fuel', icon: '⛽', category: 'refined',
    description: 'Cracked water ice, refined into launch-grade propellant.',
    baseMarketPrice: 120_000, minPrice: 30_000, maxPrice: 720_000, volatility: 0.05,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'refined_rare_earth', name: 'Refined Rare Earth Oxides', icon: '🔬', category: 'refined',
    description: 'Processed rare-earth oxides — the feedstock for electronics and solar manufacturing.',
    baseMarketPrice: 500_000, minPrice: 125_000, maxPrice: 3_000_000, volatility: 0.06,
    startingSupply: 0, npcRestockPerHour: 0,
  },

  // Tier 2 — Components
  {
    id: 'structural_beams', name: 'Structural Beams', icon: '🏗️', category: 'component',
    description: 'Forged steel-and-alloy beams. The construction backbone for station modules.',
    baseMarketPrice: 800_000, minPrice: 200_000, maxPrice: 4_800_000, volatility: 0.07,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'electronics_package', name: 'Electronics Package', icon: '💻', category: 'component',
    description: 'Rad-hardened avionics and compute modules built from refined rare earths and gold.',
    baseMarketPrice: 1_500_000, minPrice: 375_000, maxPrice: 9_000_000, volatility: 0.07,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'solar_panel_array', name: 'Solar Panel Array', icon: '☀️', category: 'component',
    description: 'Perovskite-tandem panel assemblies for power generation.',
    baseMarketPrice: 1_200_000, minPrice: 300_000, maxPrice: 7_200_000, volatility: 0.07,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'propulsion_unit', name: 'Propulsion Unit', icon: '💨', category: 'component',
    description: 'Assembled Hall-thruster propulsion module — titanium frame, fuel, and avionics.',
    baseMarketPrice: 3_000_000, minPrice: 750_000, maxPrice: 18_000_000, volatility: 0.08,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'life_support_pack', name: 'Life Support Pack', icon: '🫁', category: 'component',
    description: 'Water, ammonia, and organic-compound cartridge sized for 25 crew per game-month. New in Wave E2 — the recipe and life_support_works building land with the Consumption Engine wave.',
    baseMarketPrice: 400_000, minPrice: 100_000, maxPrice: 2_400_000, volatility: 0.06,
    startingSupply: 0, npcRestockPerHour: 0,
  },

  // Tier 3–4 — Products (T4 gets zero NPC maker liquidity — see
  // market-orderbook.ts's NPC_VOLUME_CAPS — player-only markets at the top
  // of the chain, per this same MINED_ONLY precedent, so crafting can't be
  // laundered into a free-money printer via NPC standing orders.)
  {
    id: 'station_module', name: 'Station Module Kit', icon: '🏠', category: 'product',
    description: 'Prefabricated station module — beams, electronics, and solar assembled into a habitable kit.',
    baseMarketPrice: 15_000_000, minPrice: 3_000_000, maxPrice: 120_000_000, volatility: 0.10,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'satellite_bus', name: 'Satellite Bus', icon: '🛰️', category: 'product',
    description: 'Complete satellite platform — electronics, solar, propulsion, and airframe.',
    baseMarketPrice: 12_000_000, minPrice: 2_400_000, maxPrice: 96_000_000, volatility: 0.10,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'ai_compute_cluster', name: 'AI Compute Cluster', icon: '🧠', category: 'product',
    description: 'Rack-scale neuromorphic compute cluster for datacenter and constellation control.',
    baseMarketPrice: 20_000_000, minPrice: 4_000_000, maxPrice: 160_000_000, volatility: 0.10,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'fusion_core', name: 'Fusion Core', icon: '⚛️', category: 'product',
    description: 'Assembled He-3/exotic-materials fusion reactor core. Top of the energy chain.',
    baseMarketPrice: 80_000_000, minPrice: 16_000_000, maxPrice: 800_000_000, volatility: 0.13,
    startingSupply: 0, npcRestockPerHour: 0,
  },
  {
    id: 'habitat_pod', name: 'Habitat Pod', icon: '🏘️', category: 'product',
    description: 'Fully outfitted crewed habitat pod — station modules, solar, beams, and water reserves.',
    baseMarketPrice: 50_000_000, minPrice: 10_000_000, maxPrice: 500_000_000, volatility: 0.13,
    startingSupply: 0, npcRestockPerHour: 0,
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
    startingSupply: 4_000, npcRestockPerHour: 20,
  },
  {
    id: 'ammonia', name: 'Ammonia', icon: '💨', category: 'industrial',
    description: 'Ceres ice-mine ammonia. Feedstock for life support and industrial chemistry.',
    baseMarketPrice: 18_000, minPrice: 5_000, maxPrice: 70_000, volatility: 0.05,
    startingSupply: 3_000, npcRestockPerHour: 15,
  },
  {
    id: 'solar_concentrate', name: 'Solar Concentrate', icon: '☀️', category: 'energy',
    description: 'Mercury orbital-array concentrated solar feedstock for energy systems.',
    baseMarketPrice: 25_000, minPrice: 5_000, maxPrice: 100_000, volatility: 0.03,
    startingSupply: 1_500, npcRestockPerHour: 10,
  },
  {
    id: 'organic_compounds', name: 'Organic Compounds', icon: '🧬', category: 'exotic',
    description: 'Complex organics from Ceres and Titan agriculture. Life-support and biochemistry feedstock.',
    baseMarketPrice: 800_000, minPrice: 200_000, maxPrice: 4_000_000, volatility: 0.10,
    startingSupply: 250, npcRestockPerHour: 1.5,
  },
  {
    id: 'deuterium', name: 'Deuterium', icon: '⚛️', category: 'exotic',
    description: 'Uranian-moon deuterium ice, refined for fusion-reactor fuel cycles.',
    baseMarketPrice: 8_000_000, minPrice: 2_000_000, maxPrice: 30_000_000, volatility: 0.12,
    startingSupply: 15, npcRestockPerHour: 0.08,
  },
  {
    id: 'bio_samples', name: 'Bio Samples', icon: '🧫', category: 'exotic',
    description: 'Enceladus hydrothermal-vent biological samples. Prized by research corps and the Hive trade.',
    baseMarketPrice: 15_000_000, minPrice: 5_000_000, maxPrice: 50_000_000, volatility: 0.15,
    startingSupply: 8, npcRestockPerHour: 0.04,
  },
  {
    id: 'antimatter_precursors', name: 'Antimatter Precursors', icon: '✴️', category: 'exotic',
    description: 'Triton Archive antimatter-precursor compounds. Interstellar-era propulsion research feedstock.',
    baseMarketPrice: 50_000_000, minPrice: 10_000_000, maxPrice: 200_000_000, volatility: 0.20,
    startingSupply: 3, npcRestockPerHour: 0.015,
  },
];

export const RESOURCE_MAP = new Map(RESOURCES.map(r => [r.id, r]));

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
};
