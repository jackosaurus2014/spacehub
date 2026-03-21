// ─── Space Tycoon: Ship/Fleet System ────────────────────────────────────────
// Ships mine resources, transport cargo, survey locations, and haul fuel.
// Balance pass: adjusted mining rates for ROI, added survey expedition system,
// added fleet maintenance costs, buffed deep space miner.

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
  maintenancePerMonth: number; // Monthly upkeep cost (prevents infinite fleet spam)
}

export type ShipStatus = 'idle' | 'in_transit' | 'mining' | 'loading' | 'refining' | 'building' | 'surveying';

export interface ShipInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  status: ShipStatus;
  currentLocation: string;
  route?: {
    from: string;
    to: string;
    departedAtMs: number;
    arrivalAtMs: number;
    cargo: Record<string, number>;
  };
  miningOperation?: {
    resourceId: string;
    startedAtMs: number;
    locationId: string;
  };
  // Survey expedition (probe is consumed on completion)
  surveyExpedition?: {
    targetLocation: string;
    startedAtMs: number;
    durationSeconds: number;
  };
  buildStartedAtMs?: number;
  buildDurationSeconds?: number;
  isBuilt: boolean;
}

// ─── Survey Expedition System ────────────────────────────────────────────────
// Probes are consumed after a single expedition. They discover resources,
// anomalies, or location bonuses.

export interface SurveyDiscovery {
  type: 'resource_deposit' | 'anomaly' | 'cache' | 'signal';
  title: string;
  description: string;
  rewards: {
    money?: number;
    resources?: Record<string, number>;
    miningBonus?: { locationId: string; resourceId: string; bonusPct: number; durationMonths: number };
  };
}

// Discovery tables by location tier
export const SURVEY_DISCOVERIES: Record<string, SurveyDiscovery[]> = {
  // Tier 1: Near-Earth
  leo: [
    { type: 'cache', title: 'Decommissioned Satellite', description: 'Salvaged rare electronics from defunct hardware.', rewards: { resources: { rare_earth: 5, aluminum: 20 } } },
    { type: 'anomaly', title: 'Orbital Debris Field', description: 'Mapped recyclable materials worth recovering.', rewards: { money: 10_000_000, resources: { iron: 50 } } },
    { type: 'signal', title: 'Survey Data Package', description: 'Sold orbital mapping data to commercial operators.', rewards: { money: 25_000_000 } },
  ],
  geo: [
    { type: 'cache', title: 'Abandoned Relay Station', description: 'Found intact communications hardware.', rewards: { money: 15_000_000, resources: { rare_earth: 8 } } },
    { type: 'resource_deposit', title: 'Solar Wind Collection Point', description: 'Identified optimal helium-3 collection orbit.', rewards: { resources: { helium3: 1 }, miningBonus: { locationId: 'geo', resourceId: 'helium3', bonusPct: 15, durationMonths: 24 } } },
  ],

  // Tier 2: Moon
  lunar_orbit: [
    { type: 'anomaly', title: 'Mascon Anomaly', description: 'Mapped a mass concentration useful for orbital mechanics.', rewards: { money: 30_000_000 } },
    { type: 'resource_deposit', title: 'Ice-Rich Crater', description: 'Discovered a permanently shadowed crater with deep ice.', rewards: { resources: { lunar_water: 100 }, miningBonus: { locationId: 'lunar_surface', resourceId: 'lunar_water', bonusPct: 25, durationMonths: 36 } } },
  ],
  lunar_surface: [
    { type: 'resource_deposit', title: 'Rare Earth Vein', description: 'High-concentration rare earth deposit on the far side.', rewards: { resources: { rare_earth: 30 }, miningBonus: { locationId: 'lunar_surface', resourceId: 'rare_earth', bonusPct: 20, durationMonths: 24 } } },
    { type: 'cache', title: 'Apollo-era Artifacts', description: 'Located preserved artifacts. Enormous historical value.', rewards: { money: 100_000_000 } },
    { type: 'resource_deposit', title: 'Helium-3 Hotspot', description: 'Found regolith exceptionally rich in He-3.', rewards: { resources: { helium3: 3 }, miningBonus: { locationId: 'lunar_surface', resourceId: 'helium3', bonusPct: 30, durationMonths: 24 } } },
  ],

  // Tier 3: Mars & Asteroids
  mars_orbit: [
    { type: 'anomaly', title: 'Phobos Cavern', description: 'Discovered a large subsurface cavity in Phobos.', rewards: { money: 50_000_000, resources: { titanium: 40, iron: 100 } } },
    { type: 'signal', title: 'Martian Atmospheric Data', description: 'Sold atmospheric models to terraforming researchers.', rewards: { money: 75_000_000 } },
  ],
  mars_surface: [
    { type: 'resource_deposit', title: 'Subsurface Aquifer', description: 'Massive underground water reservoir beneath Valles Marineris.', rewards: { resources: { mars_water: 200 }, miningBonus: { locationId: 'mars_surface', resourceId: 'mars_water', bonusPct: 30, durationMonths: 36 } } },
    { type: 'resource_deposit', title: 'Iron Oxide Megadeposit', description: 'Pure iron oxide formation spanning 200 km.', rewards: { resources: { iron: 500 }, miningBonus: { locationId: 'mars_surface', resourceId: 'iron', bonusPct: 25, durationMonths: 24 } } },
    { type: 'cache', title: 'Meteorite Impact Zone', description: 'Platinum-rich meteorite fragments scattered across a crater.', rewards: { resources: { platinum_group: 8, gold: 12 } } },
  ],
  asteroid_belt: [
    { type: 'resource_deposit', title: 'Platinum-Core Asteroid', description: 'A 500m metallic asteroid with platinum core.', rewards: { resources: { platinum_group: 20, titanium: 50 }, miningBonus: { locationId: 'asteroid_belt', resourceId: 'platinum_group', bonusPct: 35, durationMonths: 36 } } },
    { type: 'resource_deposit', title: 'Gold Cluster', description: 'Three nearby asteroids rich in gold deposits.', rewards: { resources: { gold: 30 }, miningBonus: { locationId: 'asteroid_belt', resourceId: 'gold', bonusPct: 25, durationMonths: 24 } } },
    { type: 'anomaly', title: 'Ancient Collision Site', description: 'Rare mineral formations from a prehistoric impact.', rewards: { resources: { rare_earth: 40, exotic_materials: 2 } } },
  ],

  // Tier 4: Outer System
  jupiter_system: [
    { type: 'resource_deposit', title: 'Europa Ice Shelf', description: 'Mapped ideal drilling location through Europa\'s ice crust.', rewards: { resources: { exotic_materials: 5 }, miningBonus: { locationId: 'jupiter_system', resourceId: 'exotic_materials', bonusPct: 40, durationMonths: 48 } } },
    { type: 'signal', title: 'Io Volcanic Data', description: 'Unique geological data from Io\'s active volcanoes.', rewards: { money: 200_000_000, resources: { exotic_materials: 3 } } },
    { type: 'anomaly', title: 'Jovian Magnetic Anomaly', description: 'Discovered concentrated He-3 in Jupiter\'s magnetosphere.', rewards: { resources: { helium3: 5 }, miningBonus: { locationId: 'jupiter_system', resourceId: 'helium3', bonusPct: 30, durationMonths: 36 } } },
  ],
  saturn_system: [
    { type: 'resource_deposit', title: 'Titan Methane Lake', description: 'Identified an easily accessible methane reservoir.', rewards: { resources: { methane: 500, ethane: 200 }, miningBonus: { locationId: 'saturn_system', resourceId: 'methane', bonusPct: 35, durationMonths: 36 } } },
    { type: 'anomaly', title: 'Ring Particle Analysis', description: 'Discovered pure water ice in Saturn\'s rings.', rewards: { resources: { lunar_water: 300 } } },
    { type: 'cache', title: 'Enceladus Geyser Sample', description: 'Captured exotic compounds from ocean plumes.', rewards: { resources: { exotic_materials: 8, helium3: 2 } } },
  ],
  outer_system: [
    { type: 'signal', title: 'Interstellar Object', description: 'Tracked a passing interstellar object. Data sold for billions.', rewards: { money: 1_000_000_000 } },
    { type: 'resource_deposit', title: 'Kuiper Belt Deposit', description: 'Found a trans-Neptunian body rich in exotic materials.', rewards: { resources: { exotic_materials: 15, helium3: 8 }, miningBonus: { locationId: 'outer_system', resourceId: 'exotic_materials', bonusPct: 50, durationMonths: 60 } } },
    { type: 'anomaly', title: 'Gravitational Anomaly', description: 'Unexplained mass concentration. Research value immeasurable.', rewards: { money: 500_000_000, resources: { exotic_materials: 10 } } },
  ],
};

// Survey expedition duration by location (real seconds)
export const SURVEY_DURATION: Record<string, number> = {
  leo: 60,            // 1 min
  geo: 90,            // 1.5 min
  lunar_orbit: 120,   // 2 min
  lunar_surface: 180, // 3 min
  mars_orbit: 240,    // 4 min
  mars_surface: 300,  // 5 min
  asteroid_belt: 360, // 6 min
  jupiter_system: 480,// 8 min
  saturn_system: 600, // 10 min
  outer_system: 900,  // 15 min
};

/** Roll a random discovery for a surveyed location */
export function rollSurveyDiscovery(locationId: string): SurveyDiscovery | null {
  const table = SURVEY_DISCOVERIES[locationId];
  if (!table || table.length === 0) return null;
  return table[Math.floor(Math.random() * table.length)];
}

// ─── SHIP DEFINITIONS (Balance Pass) ────────────────────────────────────────

export const SHIPS: ShipDefinition[] = [
  // TRANSPORT
  {
    id: 'cargo_shuttle', name: 'Cargo Shuttle', icon: '🚀', role: 'transport',
    description: 'Basic orbital transport. Moves resources between Earth surface, LEO, and GEO.',
    cargoCapacity: 50, baseCost: 20_000_000,
    resourceCost: { aluminum: 20, iron: 30 },
    requiredResearch: ['reusable_boosters'], buildTimeSeconds: 300, tier: 1,
    maintenancePerMonth: 200_000,
  },
  {
    id: 'freighter', name: 'Space Freighter', icon: '🚢', role: 'transport',
    description: 'Mid-range hauler. Can reach the Moon with 200 units of cargo.',
    cargoCapacity: 200, baseCost: 100_000_000,
    resourceCost: { titanium: 30, aluminum: 50, iron: 80 },
    requiredResearch: ['modular_spacecraft'], buildTimeSeconds: 600, tier: 2,
    maintenancePerMonth: 800_000,
  },
  {
    id: 'heavy_transport', name: 'Heavy Transport', icon: '🏗️', role: 'transport',
    description: 'Massive hauler for Mars and asteroid belt routes. 500 unit capacity.',
    cargoCapacity: 500, baseCost: 500_000_000,
    resourceCost: { titanium: 80, aluminum: 100, rare_earth: 20 },
    requiredResearch: ['interplanetary_cruisers'], buildTimeSeconds: 1200, tier: 3,
    maintenancePerMonth: 3_000_000,
  },

  // TANKER — doubles capacity for water/fuel, reduces propellant depot costs
  {
    id: 'fuel_tanker', name: 'Fuel Tanker', icon: '⛽', role: 'tanker',
    description: 'Specialized for water and fuel transport. 2x capacity for liquids. Boosts propellant depot revenue by 15% when stationed.',
    cargoCapacity: 300, baseCost: 80_000_000,
    resourceCost: { iron: 60, aluminum: 40 },
    requiredResearch: ['resource_prospecting'], buildTimeSeconds: 480, tier: 2,
    maintenancePerMonth: 500_000,
  },

  // MINING — rebalanced for better ROI
  {
    id: 'mining_drone', name: 'Mining Drone', icon: '⛏️', role: 'mining',
    description: 'Automated mining vessel. Extracts iron and aluminum. Cheap and reliable.',
    cargoCapacity: 30, miningRate: 8, // Buffed from 5 → 8 for better early ROI
    miningTargets: ['iron', 'aluminum'],
    baseCost: 15_000_000,
    resourceCost: { iron: 15, aluminum: 10 },
    requiredResearch: ['resource_prospecting'], buildTimeSeconds: 240, tier: 1,
    maintenancePerMonth: 150_000,
  },
  {
    id: 'ore_harvester', name: 'Ore Harvester', icon: '🔩', role: 'mining',
    description: 'Dedicated mining vessel for the Moon and Mars. Mines metals, water, and titanium.',
    cargoCapacity: 100, miningRate: 15, // Buffed from 12 → 15
    miningTargets: ['iron', 'aluminum', 'titanium', 'lunar_water', 'mars_water'],
    baseCost: 80_000_000,
    resourceCost: { titanium: 20, iron: 50, aluminum: 30 },
    requiredResearch: ['regolith_processing'], buildTimeSeconds: 600, tier: 2,
    maintenancePerMonth: 600_000,
  },
  {
    id: 'asteroid_miner', name: 'Asteroid Mining Ship', icon: '☄️', role: 'mining',
    description: 'Heavy mining vessel for the asteroid belt. Extracts precious metals and rare earth elements.',
    cargoCapacity: 200, miningRate: 10, // Buffed from 8 → 10
    miningTargets: ['iron', 'titanium', 'platinum_group', 'gold', 'rare_earth'],
    baseCost: 300_000_000,
    resourceCost: { titanium: 60, rare_earth: 15, aluminum: 40 },
    requiredResearch: ['asteroid_capture'], buildTimeSeconds: 900, tier: 3,
    maintenancePerMonth: 2_000_000,
  },
  {
    id: 'deep_space_miner', name: 'Deep Space Miner', icon: '🌌', role: 'mining',
    description: 'Nuclear-powered mining vessel for Jupiter, Saturn, and beyond. Mines exotic materials and He-3.',
    cargoCapacity: 200, miningRate: 6, // Buffed from 4 → 6, cargo from 150 → 200
    miningTargets: ['exotic_materials', 'helium3', 'methane', 'ethane'],
    baseCost: 1_000_000_000,
    resourceCost: { titanium: 100, rare_earth: 40, platinum_group: 10 },
    requiredResearch: ['nuclear_thermal'], buildTimeSeconds: 1500, tier: 4,
    maintenancePerMonth: 5_000_000,
  },

  // SURVEY — single-use probes that discover resources and anomalies
  {
    id: 'survey_probe', name: 'Survey Probe', icon: '📡', role: 'survey',
    description: 'Single-use probe. Send to any location to discover resource deposits, anomalies, and mining bonuses. Consumed after expedition.',
    cargoCapacity: 0, baseCost: 25_000_000, // Reduced from 30M → 25M (it's single-use)
    resourceCost: { rare_earth: 5, aluminum: 10 },
    requiredResearch: ['high_res_optical'], buildTimeSeconds: 180, tier: 1, // Faster build (3 min)
    maintenancePerMonth: 0, // No maintenance (consumed on use)
  },
];

export const SHIP_MAP = new Map(SHIPS.map(s => [s.id, s]));

// Travel times between locations (in real seconds)
// Expanded to include all colony locations
export const TRAVEL_TIMES: Record<string, Record<string, number>> = {
  // Inner system
  earth_surface: { leo: 30, geo: 60, lunar_orbit: 180, lunar_surface: 240, venus_orbit: 360, mercury_surface: 480 },
  leo: { earth_surface: 30, geo: 45, lunar_orbit: 150, lunar_surface: 210, mars_orbit: 600, venus_orbit: 300, mercury_surface: 420 },
  geo: { earth_surface: 60, leo: 45, lunar_orbit: 180 },
  venus_orbit: { leo: 300, earth_surface: 360, mercury_surface: 240 },
  mercury_surface: { venus_orbit: 240, leo: 420, earth_surface: 480 },

  // Moon
  lunar_orbit: { leo: 150, lunar_surface: 60, earth_surface: 180 },
  lunar_surface: { lunar_orbit: 60, leo: 210, earth_surface: 240 },

  // Mars
  mars_orbit: { leo: 600, mars_surface: 120, asteroid_belt: 300, ceres_surface: 240 },
  mars_surface: { mars_orbit: 120 },

  // Asteroid Belt
  asteroid_belt: { mars_orbit: 300, leo: 900, jupiter_system: 600, ceres_surface: 60 },
  ceres_surface: { asteroid_belt: 60, mars_orbit: 240, jupiter_system: 540 },

  // Jupiter System — individual moons
  jupiter_system: { asteroid_belt: 600, saturn_system: 900, io_surface: 30, europa_surface: 45, ganymede_surface: 60, callisto_surface: 90 },
  io_surface: { jupiter_system: 30, europa_surface: 30, ganymede_surface: 45, callisto_surface: 75 },
  europa_surface: { jupiter_system: 45, io_surface: 30, ganymede_surface: 30, callisto_surface: 60 },
  ganymede_surface: { jupiter_system: 60, europa_surface: 30, callisto_surface: 45 },
  callisto_surface: { jupiter_system: 90, ganymede_surface: 45, saturn_system: 840 },

  // Saturn System — individual moons
  saturn_system: { jupiter_system: 900, outer_system: 1200, titan_surface: 30, enceladus_surface: 45 },
  titan_surface: { saturn_system: 30, enceladus_surface: 30 },
  enceladus_surface: { saturn_system: 45, titan_surface: 30 },

  // Uranus/Neptune
  titania_surface: { saturn_system: 1200, triton_surface: 1500 },
  outer_system: { saturn_system: 1200, titania_surface: 300, triton_surface: 1500, pluto_surface: 1800 },
  triton_surface: { outer_system: 1500, titania_surface: 1500, pluto_surface: 900 },
  pluto_surface: { triton_surface: 900, outer_system: 1800 },
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
