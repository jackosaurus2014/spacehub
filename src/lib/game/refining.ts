// ─── Space Tycoon: Resource Refining ────────────────────────────────────────
// Combine basic resources into advanced/refined versions.
// Creates strategic decisions: sell raw resources or refine for higher value?

export interface RefiningRecipe {
  id: string;
  name: string;
  icon: string;
  description: string;
  inputs: Record<string, number>;   // ResourceId → quantity consumed
  outputs: Record<string, number>;  // ResourceId → quantity produced
  timeSeconds: number;              // Real-time seconds to process
  requiredResearch: string[];       // Research needed to unlock
  requiredBuilding: string;         // Must have this building type completed
}

export const REFINING_RECIPES: RefiningRecipe[] = [
  // ─── Basic Refining (available early) ─────────────────────────────
  {
    id: 'refine_rocket_fuel', name: 'Rocket Fuel Production', icon: '⛽',
    description: 'Split water into hydrogen + oxygen for rocket propellant. Increases water value 3x.',
    inputs: { lunar_water: 20 },
    outputs: { methane: 8 }, // Simplified: water → usable fuel
    timeSeconds: 120, // 2 min
    requiredResearch: ['resource_prospecting'],
    requiredBuilding: 'fabrication_orbital',
  },
  {
    id: 'refine_alloy', name: 'Titanium Alloy Forging', icon: '⚙️',
    description: 'Combine iron and titanium into high-strength alloy. Essential for advanced construction.',
    inputs: { iron: 50, titanium: 10 },
    outputs: { titanium: 25 }, // Net gain of titanium through efficient processing
    timeSeconds: 180, // 3 min
    requiredResearch: ['orbital_assembly'],
    requiredBuilding: 'fabrication_orbital',
  },
  {
    id: 'refine_electronics', name: 'Electronics Manufacturing', icon: '🔬',
    description: 'Process rare earth elements into advanced electronics components.',
    inputs: { rare_earth: 10, gold: 2 },
    outputs: { rare_earth: 20 }, // Refined rare earth worth double
    timeSeconds: 240, // 4 min
    requiredResearch: ['rad_hard_processors'],
    requiredBuilding: 'fabrication_orbital',
  },

  // ─── Advanced Refining (mid-game) ─────────────────────────────────
  {
    id: 'refine_platinum_catalyst', name: 'Platinum Catalyst Synthesis', icon: '💎',
    description: 'Refine platinum group metals into industrial catalysts. 2x value.',
    inputs: { platinum_group: 5, rare_earth: 5 },
    outputs: { platinum_group: 12 },
    timeSeconds: 360, // 6 min
    requiredResearch: ['regolith_processing'],
    requiredBuilding: 'fabrication_lunar',
  },
  {
    id: 'refine_mars_steel', name: 'Martian Steel Production', icon: '🔩',
    description: 'Forge Mars iron into high-grade construction steel.',
    inputs: { iron: 100, mars_water: 10, aluminum: 20 },
    outputs: { iron: 250, titanium: 15 },
    timeSeconds: 300, // 5 min
    requiredResearch: ['regolith_processing'],
    requiredBuilding: 'fabrication_lunar',
  },

  // ─── Exotic Refining (late-game) ──────────────────────────────────
  {
    id: 'refine_fusion_fuel', name: 'Fusion Fuel Enrichment', icon: '⚛️',
    description: 'Concentrate Helium-3 into fusion-grade fuel. Extremely valuable.',
    inputs: { helium3: 1, lunar_water: 50 },
    outputs: { helium3: 4 },
    timeSeconds: 600, // 10 min
    requiredResearch: ['deep_drilling'],
    requiredBuilding: 'fabrication_lunar',
  },
  {
    id: 'refine_exotic_compounds', name: 'Exotic Compound Synthesis', icon: '✨',
    description: 'Combine exotic materials with platinum for ultra-high-value compounds.',
    inputs: { exotic_materials: 2, platinum_group: 5, rare_earth: 10 },
    outputs: { exotic_materials: 8 },
    timeSeconds: 900, // 15 min
    requiredResearch: ['deep_drilling'],
    requiredBuilding: 'fabrication_lunar',
  },
];

export const RECIPE_MAP = new Map(REFINING_RECIPES.map(r => [r.id, r]));

/** Check if player can start a refining recipe */
export function canRefine(
  recipe: RefiningRecipe,
  resources: Record<string, number>,
  completedResearch: string[],
  completedBuildings: string[], // Building definition IDs that are complete
): boolean {
  // Check research
  if (!recipe.requiredResearch.every(r => completedResearch.includes(r))) return false;

  // Check building
  if (!completedBuildings.includes(recipe.requiredBuilding)) return false;

  // Check input resources
  for (const [resId, qty] of Object.entries(recipe.inputs)) {
    if ((resources[resId] || 0) < qty) return false;
  }

  return true;
}
