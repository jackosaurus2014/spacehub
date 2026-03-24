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
  /** Detailed tooltip explaining gameplay purpose, when to build, and ROI */
  tooltip: string;
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

/**
 * Locations where ship-based mining is allowed and their output multipliers.
 * Earth surface and orbits are NOT mineable — ships must go to actual celestial bodies.
 * Higher-risk/further locations give better output multipliers.
 */
export const MINING_LOCATIONS: Record<string, { name: string; multiplier: number; description: string }> = {
  lunar_surface:  { name: 'Lunar Surface',   multiplier: 0.8,  description: 'Low risk, moderate yields. Water and helium-3.' },
  mars_surface:   { name: 'Mars Surface',    multiplier: 1.0,  description: 'Standard yields. Water, iron, aluminum.' },
  asteroid_belt:  { name: 'Asteroid Belt',   multiplier: 1.5,  description: 'Rich deposits. Precious metals and rare earth.' },
  jupiter_system: { name: 'Jupiter System',  multiplier: 2.0,  description: 'Exotic materials from Europa. High value, high risk.' },
  saturn_system:  { name: 'Saturn System',   multiplier: 2.0,  description: 'Titan hydrocarbons. Methane and ethane lakes.' },
  outer_system:   { name: 'Outer System',    multiplier: 3.0,  description: 'Extreme frontier. Maximum yields for rare resources.' },
};

/** Check if a location allows ship-based mining */
export function canMineAtLocation(locationId: string): boolean {
  return locationId in MINING_LOCATIONS;
}

/** Get the mining output multiplier for a location */
export function getMiningMultiplier(locationId: string): number {
  return MINING_LOCATIONS[locationId]?.multiplier ?? 0;
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
    tooltip: 'WHY BUILD: Move resources you mine at one location to where you need them. For example, mine iron on the Lunar Surface and shuttle it to LEO for building space stations. Also useful for fulfilling resource bounties that require delivery to specific locations. At 50 units capacity and $200K/mo maintenance, this is your affordable early workhorse. Build 2-3 once you start mining.',
    cargoCapacity: 50, baseCost: 20_000_000,
    resourceCost: { aluminum: 20, iron: 30 },
    requiredResearch: ['reusable_boosters'], buildTimeSeconds: 300, tier: 1,
    maintenancePerMonth: 200_000,
  },
  {
    id: 'freighter', name: 'Space Freighter', icon: '🚢', role: 'transport',
    description: 'Mid-range hauler. Can reach the Moon with 200 units of cargo.',
    tooltip: 'WHY BUILD: Your first serious bulk hauler. With 200-unit capacity (4x a Cargo Shuttle), it makes lunar supply runs efficient. Move large quantities of lunar water, iron, and aluminum between your Moon mining operations and LEO/Earth facilities. Essential once you have multiple mining operations producing resources faster than shuttles can move them. The $800K/mo maintenance is easily justified by mid-game resource volumes.',
    cargoCapacity: 200, baseCost: 100_000_000,
    resourceCost: { titanium: 30, aluminum: 50, iron: 80 },
    requiredResearch: ['modular_spacecraft'], buildTimeSeconds: 600, tier: 2,
    maintenancePerMonth: 800_000,
  },
  {
    id: 'heavy_transport', name: 'Heavy Transport', icon: '🏗️', role: 'transport',
    description: 'Massive hauler for Mars and asteroid belt routes. 500 unit capacity.',
    tooltip: 'WHY BUILD: The only ship with enough cargo capacity (500 units) to make Mars and asteroid belt supply runs worthwhile. Long travel times to these destinations mean you want to move as much as possible per trip. Critical for delivering titanium, rare earth, and platinum from the asteroid belt back to your inner system facilities. Also needed to supply Mars colonies with equipment. Build when you expand beyond the Moon.',
    cargoCapacity: 500, baseCost: 500_000_000,
    resourceCost: { titanium: 80, aluminum: 100, rare_earth: 20 },
    requiredResearch: ['interplanetary_cruisers'], buildTimeSeconds: 1200, tier: 3,
    maintenancePerMonth: 3_000_000,
  },

  // TANKER — doubles capacity for water/fuel, reduces propellant depot costs
  {
    id: 'fuel_tanker', name: 'Fuel Tanker', icon: '⛽', role: 'tanker',
    description: 'Specialized for water and fuel transport. 2x capacity for liquids. Boosts propellant depot revenue by 15% when stationed.',
    tooltip: 'WHY BUILD: Carries 300 units with 2x effective capacity for water and fuel (effectively 600 units of liquids). Park one at your lunar mining operation to shuttle water efficiently. When stationed at a location with a Propellant Depot, it boosts depot service revenue by 15%. Cheaper than a Freighter ($80M vs $100M) with better liquid capacity. Build once you have lunar water mining active.',
    cargoCapacity: 300, baseCost: 80_000_000,
    resourceCost: { iron: 60, aluminum: 40 },
    requiredResearch: ['resource_prospecting'], buildTimeSeconds: 480, tier: 2,
    maintenancePerMonth: 500_000,
  },

  // MINING — rebalanced for better ROI
  {
    id: 'mining_drone', name: 'Mining Drone', icon: '⛏️', role: 'mining',
    description: 'Automated mining vessel. Extracts iron and aluminum. Cheap and reliable.',
    tooltip: 'WHY BUILD: Your cheapest way to produce iron and aluminum — the two resources you need for almost every building and ship. At 8 units/minute and only $150K/mo maintenance, the ROI is excellent. Send it to any location where you have mining operations and set it to mine. Iron sells for $5K/unit and aluminum for $8K/unit on the market. Each drone generates ~$40-64K/minute in resources. Build 2-3 early to stockpile building materials.',
    cargoCapacity: 30, miningRate: 8,
    miningTargets: ['iron', 'aluminum'],
    baseCost: 15_000_000,
    resourceCost: { iron: 15, aluminum: 10 },
    requiredResearch: ['resource_prospecting'], buildTimeSeconds: 240, tier: 1,
    maintenancePerMonth: 150_000,
  },
  {
    id: 'ore_harvester', name: 'Ore Harvester', icon: '🔩', role: 'mining',
    description: 'Dedicated mining vessel for the Moon and Mars. Mines metals, water, and titanium.',
    tooltip: 'WHY BUILD: The first ship that can mine titanium ($25K/unit) and lunar/Mars water ($50-80K/unit). At 15 units/minute, it produces high-value resources much faster than facility-based mining alone. Titanium is required for most mid-to-late-game buildings and ships. Water is needed for life support and can be refined into fuel. Deploy at the Lunar Surface or Mars Surface for best results. One Ore Harvester mining titanium generates ~$375K/minute in resources.',
    cargoCapacity: 100, miningRate: 15,
    miningTargets: ['iron', 'aluminum', 'titanium', 'lunar_water', 'mars_water'],
    baseCost: 80_000_000,
    resourceCost: { titanium: 20, iron: 50, aluminum: 30 },
    requiredResearch: ['regolith_processing'], buildTimeSeconds: 600, tier: 2,
    maintenancePerMonth: 600_000,
  },
  {
    id: 'asteroid_miner', name: 'Asteroid Mining Ship', icon: '☄️', role: 'mining',
    description: 'Heavy mining vessel for the asteroid belt. Extracts precious metals and rare earth elements.',
    tooltip: 'WHY BUILD: The only ship-based way to mine platinum ($500K/unit), gold ($300K/unit), and rare earth ($200K/unit). These high-value resources are needed for Tier 3-5 research and endgame buildings. At 10 units/minute mining platinum, you generate $5M/minute in resource value. Even at $2M/mo maintenance, the payback period is minutes, not months. Essential for anyone pushing into late-game content. Deploy at the Asteroid Belt.',
    cargoCapacity: 200, miningRate: 10,
    miningTargets: ['iron', 'titanium', 'platinum_group', 'gold', 'rare_earth'],
    baseCost: 300_000_000,
    resourceCost: { titanium: 60, rare_earth: 15, aluminum: 40 },
    requiredResearch: ['asteroid_capture'], buildTimeSeconds: 900, tier: 3,
    maintenancePerMonth: 2_000_000,
  },
  {
    id: 'deep_space_miner', name: 'Deep Space Miner', icon: '🌌', role: 'mining',
    description: 'Nuclear-powered mining vessel for Jupiter, Saturn, and beyond. Mines exotic materials and He-3.',
    tooltip: 'WHY BUILD: The only way to mine exotic materials ($2M/unit) and helium-3 ($5M/unit) — the two rarest and most valuable resources in the game. These are required for Tier 5 research and endgame construction (including fusion reactors and generation ships). At 6 units/minute mining He-3, you generate $30M/minute. Despite $5M/mo maintenance, a single Deep Space Miner can fund your entire late-game progression. Deploy at Jupiter or Saturn system.',
    cargoCapacity: 200, miningRate: 6,
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
    tooltip: 'WHY BUILD: Cheap ($25M) single-use probes that discover hidden rewards at any location. Possible discoveries include: resource caches (free resources), mining bonuses (+15-50% mining output at a location for months), cash windfalls ($10M-$1B depending on location), and rare anomalies. Higher-tier locations yield bigger rewards — a probe sent to the Outer System can discover $1B+ in value. Build several and send them to every new location you unlock. The probe is consumed after one expedition.',
    cargoCapacity: 0, baseCost: 25_000_000,
    resourceCost: { rare_earth: 5, aluminum: 10 },
    requiredResearch: ['high_res_optical'], buildTimeSeconds: 180, tier: 1,
    maintenancePerMonth: 0,
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
