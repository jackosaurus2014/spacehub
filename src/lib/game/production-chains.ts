// ─── Space Tycoon: Production Chains ────────────────────────────────────────
// Multi-step crafting: raw ore → refined metal → component → product
// Each step increases value. Products required for advanced buildings.

export interface ProductDefinition {
  id: string;
  name: string;
  icon: string;
  tier: number; // 1=raw processing, 2=components, 3=products, 4=advanced
  inputs: Record<string, number>;
  outputId: string;
  outputQuantity: number;
  timeSeconds: number;
  requiredResearch: string[];
  requiredBuilding: string;
  marketValue: number; // Price per unit if sold
}

// ─── TIER 1: Raw Processing (ore → refined) ────────────────────────────────
// Available early with basic fabrication

export const PRODUCTION_CHAINS: ProductDefinition[] = [
  // Steel production
  {
    id: 'smelt_steel', name: 'Smelt Steel Ingots', icon: '🔩', tier: 1,
    inputs: { iron: 20 }, outputId: 'steel_ingots', outputQuantity: 10,
    timeSeconds: 120, requiredResearch: ['orbital_assembly'], requiredBuilding: 'fabrication_orbital',
    marketValue: 15_000,
  },
  // Aluminum alloy
  {
    id: 'refine_aluminum_alloy', name: 'Aluminum Alloy Processing', icon: '🪶', tier: 1,
    inputs: { aluminum: 15, titanium: 3 }, outputId: 'aluminum_alloy', outputQuantity: 8,
    timeSeconds: 150, requiredResearch: ['orbital_assembly'], requiredBuilding: 'fabrication_orbital',
    marketValue: 25_000,
  },
  // Rocket fuel from water
  {
    id: 'crack_water_fuel', name: 'Crack Water → Rocket Fuel', icon: '⛽', tier: 1,
    inputs: { lunar_water: 15 }, outputId: 'rocket_fuel', outputQuantity: 10,
    timeSeconds: 90, requiredResearch: ['resource_prospecting'], requiredBuilding: 'fabrication_orbital',
    marketValue: 20_000,
  },
  // Refined rare earth
  {
    id: 'refine_rare_earth', name: 'Refine Rare Earth Oxides', icon: '🔬', tier: 1,
    inputs: { rare_earth: 10 }, outputId: 'refined_rare_earth', outputQuantity: 5,
    timeSeconds: 180, requiredResearch: ['rad_hard_processors'], requiredBuilding: 'fabrication_orbital',
    marketValue: 80_000,
  },

  // ─── TIER 2: Components (refined → component) ────────────────────────
  // Mid-game, requires lunar fabrication
  {
    id: 'forge_structural_beams', name: 'Forge Structural Beams', icon: '🏗️', tier: 2,
    inputs: { steel_ingots: 5, aluminum_alloy: 3 }, outputId: 'structural_beams', outputQuantity: 4,
    timeSeconds: 240, requiredResearch: ['orbital_assembly'], requiredBuilding: 'fabrication_lunar',
    marketValue: 120_000,
  },
  {
    id: 'make_electronics', name: 'Manufacture Electronics', icon: '💻', tier: 2,
    inputs: { refined_rare_earth: 3, gold: 1 }, outputId: 'electronics_package', outputQuantity: 2,
    timeSeconds: 300, requiredResearch: ['edge_ai'], requiredBuilding: 'fabrication_lunar',
    marketValue: 250_000,
  },
  {
    id: 'make_solar_panels', name: 'Assemble Solar Panels', icon: '☀️', tier: 2,
    inputs: { aluminum_alloy: 4, refined_rare_earth: 2 }, outputId: 'solar_panel_array', outputQuantity: 3,
    timeSeconds: 240, requiredResearch: ['perovskite_tandem'], requiredBuilding: 'fabrication_lunar',
    marketValue: 180_000,
  },
  {
    id: 'make_propulsion_unit', name: 'Build Propulsion Unit', icon: '💨', tier: 2,
    inputs: { titanium: 10, rocket_fuel: 5, electronics_package: 1 }, outputId: 'propulsion_unit', outputQuantity: 1,
    timeSeconds: 360, requiredResearch: ['hall_thrusters'], requiredBuilding: 'fabrication_lunar',
    marketValue: 500_000,
  },

  // ─── TIER 3: Products (component → product) ──────────────────────────
  // Late-game, high value
  {
    id: 'make_station_module', name: 'Build Station Module Kit', icon: '🏠', tier: 3,
    inputs: { structural_beams: 5, electronics_package: 2, solar_panel_array: 2 }, outputId: 'station_module', outputQuantity: 1,
    timeSeconds: 600, requiredResearch: ['rotating_habitats'], requiredBuilding: 'fabrication_lunar',
    marketValue: 2_000_000,
  },
  {
    id: 'make_satellite_bus', name: 'Assemble Satellite Bus', icon: '🛰️', tier: 3,
    inputs: { electronics_package: 2, solar_panel_array: 1, propulsion_unit: 1, aluminum_alloy: 5 }, outputId: 'satellite_bus', outputQuantity: 1,
    timeSeconds: 480, requiredResearch: ['compact_power'], requiredBuilding: 'fabrication_lunar',
    marketValue: 1_500_000,
  },
  {
    id: 'make_ai_cluster', name: 'Build AI Compute Cluster', icon: '🧠', tier: 3,
    inputs: { electronics_package: 5, refined_rare_earth: 3 }, outputId: 'ai_compute_cluster', outputQuantity: 1,
    timeSeconds: 420, requiredResearch: ['neuromorphic_chips'], requiredBuilding: 'fabrication_lunar',
    marketValue: 3_000_000,
  },

  // ─── TIER 4: Advanced Products (endgame) ─────────────────────────────
  {
    id: 'make_fusion_core', name: 'Assemble Fusion Core', icon: '⚛️', tier: 4,
    inputs: { helium3: 2, exotic_materials: 3, electronics_package: 3, titanium: 20 }, outputId: 'fusion_core', outputQuantity: 1,
    timeSeconds: 900, requiredResearch: ['nuclear_thermal'], requiredBuilding: 'fabrication_lunar',
    marketValue: 15_000_000,
  },
  {
    id: 'make_habitat_pod', name: 'Build Habitat Pod', icon: '🏘️', tier: 4,
    inputs: { station_module: 2, solar_panel_array: 3, structural_beams: 10, lunar_water: 50 }, outputId: 'habitat_pod', outputQuantity: 1,
    timeSeconds: 1200, requiredResearch: ['mega_structures'], requiredBuilding: 'fabrication_lunar',
    marketValue: 10_000_000,
  },
];

export const CHAIN_MAP = new Map(PRODUCTION_CHAINS.map(c => [c.id, c]));

// All crafted product IDs (for inventory tracking)
export const CRAFTED_PRODUCT_IDS = [
  'steel_ingots', 'aluminum_alloy', 'rocket_fuel', 'refined_rare_earth',
  'structural_beams', 'electronics_package', 'solar_panel_array', 'propulsion_unit',
  'station_module', 'satellite_bus', 'ai_compute_cluster',
  'fusion_core', 'habitat_pod',
] as const;
