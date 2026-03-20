// ─── Space Tycoon: Ship/Fleet System ────────────────────────────────────────
// Transport ships carry resources between locations. Travel takes real time.

export interface ShipDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  cargoCapacity: number; // Units of resources per trip
  baseCost: number;
  resourceCost: Record<string, number>;
  requiredResearch: string[];
  tier: number;
}

export interface ShipInstance {
  instanceId: string;
  definitionId: string;
  status: 'idle' | 'in_transit' | 'loading';
  currentLocation: string; // Location ID
  route?: {
    from: string;
    to: string;
    departedAtMs: number;
    arrivalAtMs: number;
    cargo: Record<string, number>; // What's being transported
  };
}

export const SHIPS: ShipDefinition[] = [
  {
    id: 'shuttle', name: 'Cargo Shuttle', icon: '🚀',
    description: 'Basic orbital transport. Moves resources between Earth and LEO/GEO.',
    cargoCapacity: 50, baseCost: 20_000_000,
    resourceCost: { aluminum: 20, iron: 30 },
    requiredResearch: ['reusable_boosters'], tier: 1,
  },
  {
    id: 'freighter', name: 'Space Freighter', icon: '🚢',
    description: 'Mid-range transport. Can reach the Moon and back.',
    cargoCapacity: 200, baseCost: 100_000_000,
    resourceCost: { titanium: 30, aluminum: 50, iron: 80 },
    requiredResearch: ['modular_spacecraft'], tier: 2,
  },
  {
    id: 'heavy_transport', name: 'Heavy Transport', icon: '🏗️',
    description: 'Large-capacity vessel for Mars and asteroid belt routes.',
    cargoCapacity: 500, baseCost: 500_000_000,
    resourceCost: { titanium: 80, aluminum: 100, rare_earth: 20 },
    requiredResearch: ['interplanetary_cruisers'], tier: 3,
  },
  {
    id: 'interplanetary_cruiser', name: 'Interplanetary Cruiser', icon: '🛸',
    description: 'Advanced vessel for Jupiter, Saturn, and outer system routes.',
    cargoCapacity: 1000, baseCost: 2_000_000_000,
    resourceCost: { titanium: 200, rare_earth: 50, platinum_group: 10 },
    requiredResearch: ['nuclear_thermal'], tier: 4,
  },
];

export const SHIP_MAP = new Map(SHIPS.map(s => [s.id, s]));

// Travel times between locations (in real seconds)
// Simplified: nearby = fast, far = slow
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
  return TRAVEL_TIMES[from]?.[to] || TRAVEL_TIMES[to]?.[from] || 600; // Default 10 min
}
