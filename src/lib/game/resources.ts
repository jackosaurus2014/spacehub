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
  | 'helium3';

export interface ResourceDefinition {
  id: ResourceId;
  name: string;
  icon: string;
  category: 'water' | 'metal' | 'precious' | 'rare_earth' | 'hydrocarbon' | 'exotic';
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
];

export const RESOURCE_MAP = new Map(RESOURCES.map(r => [r.id, r]));

/** What each mining service produces per game month */
export const MINING_PRODUCTION: Record<string, { resource: ResourceId; amountPerMonth: number }[]> = {
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
};
