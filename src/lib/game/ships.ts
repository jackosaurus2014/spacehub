// ─── Space Tycoon: Ship/Fleet System ────────────────────────────────────────
// Ships mine resources, transport cargo, and interact with stations/refineries.

export type ShipRole = 'transport' | 'mining' | 'survey' | 'tanker';

export interface ShipDefinition {
  id: string;
  name: string;
  icon: string;
  role: ShipRole;
  description: string;
  cargoCapacity: number;
  miningRate?: number; // Resources mined per real minute (mining ships only)
  miningTargets?: string[]; // Resource IDs this ship can mine
  baseCost: number;
  resourceCost: Record<string, number>;
  requiredResearch: string[];
  buildTimeSeconds: number;
  tier: number;
}

export type ShipStatus = 'idle' | 'in_transit' | 'mining' | 'loading' | 'refining' | 'building';

export interface ShipInstance {
  instanceId: string;
  definitionId: string;
  name: string; // Player-customizable ship name
  status: ShipStatus;
  currentLocation: string;
  // Transport route
  route?: {
    from: string;
    to: string;
    departedAtMs: number;
    arrivalAtMs: number;
    cargo: Record<string, number>;
  };
  // Mining operation
  miningOperation?: {
    resourceId: string;
    startedAtMs: number;
    locationId: string;
  };
  // Build timer
  buildStartedAtMs?: number;
  buildDurationSeconds?: number;
  isBuilt: boolean;
}

// ─── TRANSPORT SHIPS ────────────────────────────────────────────────────────

export const SHIPS: ShipDefinition[] = [
  {
    id: 'cargo_shuttle', name: 'Cargo Shuttle', icon: '🚀', role: 'transport',
    description: 'Basic orbital transport. Moves resources between Earth surface, LEO, and GEO.',
    cargoCapacity: 50, baseCost: 20_000_000,
    resourceCost: { aluminum: 20, iron: 30 },
    requiredResearch: ['reusable_boosters'], buildTimeSeconds: 300, tier: 1,
  },
  {
    id: 'freighter', name: 'Space Freighter', icon: '🚢', role: 'transport',
    description: 'Mid-range hauler. Can reach the Moon with 200 units of cargo.',
    cargoCapacity: 200, baseCost: 100_000_000,
    resourceCost: { titanium: 30, aluminum: 50, iron: 80 },
    requiredResearch: ['modular_spacecraft'], buildTimeSeconds: 600, tier: 2,
  },
  {
    id: 'heavy_transport', name: 'Heavy Transport', icon: '🏗️', role: 'transport',
    description: 'Massive hauler for Mars and asteroid belt routes. 500 unit capacity.',
    cargoCapacity: 500, baseCost: 500_000_000,
    resourceCost: { titanium: 80, aluminum: 100, rare_earth: 20 },
    requiredResearch: ['interplanetary_cruisers'], buildTimeSeconds: 1200, tier: 3,
  },

  // ─── TANKER SHIPS ─────────────────────────────────────────────────────────
  {
    id: 'fuel_tanker', name: 'Fuel Tanker', icon: '⛽', role: 'tanker',
    description: 'Specialized for transporting water and fuel. Double capacity for liquids.',
    cargoCapacity: 300, baseCost: 80_000_000,
    resourceCost: { iron: 60, aluminum: 40 },
    requiredResearch: ['resource_prospecting'], buildTimeSeconds: 480, tier: 2,
  },

  // ─── MINING SHIPS ─────────────────────────────────────────────────────────
  {
    id: 'mining_drone', name: 'Mining Drone', icon: '⛏️', role: 'mining',
    description: 'Automated mining vessel. Extracts iron and aluminum from asteroids in LEO debris.',
    cargoCapacity: 30, miningRate: 5, // 5 units per real minute
    miningTargets: ['iron', 'aluminum'],
    baseCost: 15_000_000,
    resourceCost: { iron: 15, aluminum: 10 },
    requiredResearch: ['resource_prospecting'], buildTimeSeconds: 240, tier: 1,
  },
  {
    id: 'ore_harvester', name: 'Ore Harvester', icon: '🔩', role: 'mining',
    description: 'Dedicated mining vessel for the Moon and Mars. Mines metals and water.',
    cargoCapacity: 100, miningRate: 12,
    miningTargets: ['iron', 'aluminum', 'titanium', 'lunar_water', 'mars_water'],
    baseCost: 80_000_000,
    resourceCost: { titanium: 20, iron: 50, aluminum: 30 },
    requiredResearch: ['regolith_processing'], buildTimeSeconds: 600, tier: 2,
  },
  {
    id: 'asteroid_miner', name: 'Asteroid Mining Ship', icon: '☄️', role: 'mining',
    description: 'Heavy mining vessel for the asteroid belt. Extracts precious metals and rare earth.',
    cargoCapacity: 200, miningRate: 8,
    miningTargets: ['iron', 'titanium', 'platinum_group', 'gold', 'rare_earth'],
    baseCost: 300_000_000,
    resourceCost: { titanium: 60, rare_earth: 15, aluminum: 40 },
    requiredResearch: ['asteroid_capture'], buildTimeSeconds: 900, tier: 3,
  },
  {
    id: 'deep_space_miner', name: 'Deep Space Miner', icon: '🌌', role: 'mining',
    description: 'Advanced mining vessel for Jupiter, Saturn, and beyond. Mines exotic materials.',
    cargoCapacity: 150, miningRate: 4,
    miningTargets: ['exotic_materials', 'helium3', 'methane', 'ethane'],
    baseCost: 1_000_000_000,
    resourceCost: { titanium: 100, rare_earth: 40, platinum_group: 10 },
    requiredResearch: ['nuclear_thermal'], buildTimeSeconds: 1500, tier: 4,
  },

  // ─── SURVEY SHIPS ─────────────────────────────────────────────────────────
  {
    id: 'survey_probe', name: 'Survey Probe', icon: '📡', role: 'survey',
    description: 'Scans locations for resource deposits. Boosts mining output at surveyed locations by 25%.',
    cargoCapacity: 10, baseCost: 30_000_000,
    resourceCost: { rare_earth: 5, aluminum: 15 },
    requiredResearch: ['high_res_optical'], buildTimeSeconds: 300, tier: 1,
  },
];

export const SHIP_MAP = new Map(SHIPS.map(s => [s.id, s]));

// Travel times between locations (in real seconds)
export const TRAVEL_TIMES: Record<string, Record<string, number>> = {
  earth_surface: { leo: 30, geo: 60, lunar_orbit: 180, lunar_surface: 240 },
  leo: { earth_surface: 30, geo: 45, lunar_orbit: 150, lunar_surface: 210, mars_orbit: 600 },
  geo: { earth_surface: 60, leo: 45, lunar_orbit: 180 },
  lunar_orbit: { leo: 150, lunar_surface: 60, earth_surface: 180 },
  lunar_surface: { lunar_orbit: 60, leo: 210, earth_surface: 240 },
  mars_orbit: { leo: 600, mars_surface: 120, asteroid_belt: 300 },
  mars_surface: { mars_orbit: 120 },
  asteroid_belt: { mars_orbit: 300, leo: 900, jupiter_system: 600 },
  jupiter_system: { asteroid_belt: 600, saturn_system: 900 },
  saturn_system: { jupiter_system: 900, outer_system: 1200 },
  outer_system: { saturn_system: 1200 },
};

/** Get travel time between two locations in seconds */
export function getTravelTime(from: string, to: string): number {
  return TRAVEL_TIMES[from]?.[to] || TRAVEL_TIMES[to]?.[from] || 600;
}

/** Generate a ship name */
const SHIP_PREFIXES = ['SN', 'SNX', 'NX', 'SS', 'ISV'];
const SHIP_NAMES = ['Endeavour', 'Pioneer', 'Voyager', 'Horizon', 'Pathfinder', 'Discovery',
  'Atlas', 'Titan', 'Nova', 'Zenith', 'Apex', 'Meridian', 'Polaris', 'Vanguard', 'Sentinel'];
let shipCounter = 0;
export function generateShipName(role: ShipRole): string {
  shipCounter++;
  const prefix = SHIP_PREFIXES[Math.floor(Math.random() * SHIP_PREFIXES.length)];
  const name = SHIP_NAMES[Math.floor(Math.random() * SHIP_NAMES.length)];
  return `${prefix}-${name}-${shipCounter}`;
}
