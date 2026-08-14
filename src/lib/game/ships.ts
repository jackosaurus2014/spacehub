// ─── Space Tycoon: Ship/Fleet System ────────────────────────────────────────
// Ships mine resources, transport cargo, survey locations, and haul fuel.
// Balance pass: adjusted mining rates for ROI, added survey expedition system,
// added fleet maintenance costs, buffed deep space miner.

export type ShipRole = 'transport' | 'mining' | 'survey' | 'tanker';

export type ShipHardpointType = 'engine' | 'shield' | 'cargo' | 'sensor' | 'drone' | 'utility';

/**
 * Comprehensive ship stats per STATS_DESIGN.md Phase I. Derived from role+tier
 * when not set explicitly. Populated with sensible defaults by
 * getShipDerivedStats so game-engine changes in later phases can depend on
 * every ship having every stat.
 */
export interface ShipDerivedStats {
  // Movement & fuel
  sublightSpeed: number;       // m/s — intra-location travel
  warpFactor: number;          // unitless — interplanetary travel multiplier
  fuelCapacity: number;        // units
  fuelBurnRate: number;        // units per hour of travel
  deltaVBudget: number;        // m/s — total delta-v per mission
  // Crew & life support
  crewRequired: number;
  crewCapacity: number;
  lifeSupportDays: number;
  // Hazard resilience (per CLAUDE.md: no PvP combat — these defend against
  // micrometeorites, solar storms, NPC pirates, and environmental hazards only)
  hullIntegrity: number;
  shieldingRating: number;     // 0-0.9 — fraction of hazard damage absorbed
  pointDefenseRating: number;  // 0-1 — passive pirate-raid mitigation
  // Sensors & survey
  surveyRange: number;         // AU
  surveyAccuracy: number;      // 0-1 — quality of prospecting data returned
  stealthSignature: number;    // smaller = harder to detect; default 1.0 baseline
  // Reliability
  mtbfHours: number;           // mean time between failures
  insurancePremium: number;    // $ per game-month if insured
  insuredValue: number;        // $ payout on catastrophic loss
  // Modularity
  moduleSlots: number;
  hardpointTypes: ShipHardpointType[];
}

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
  /** Phase I: optional per-ship overrides for any of the derived stats.
   *  Values not specified here are filled in by role+tier defaults. */
  stats?: Partial<ShipDerivedStats>;
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

export type ShipStatus = 'idle' | 'in_transit' | 'mining' | 'loading' | 'refining' | 'building' | 'surveying' | 'expedition';

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
//
// 4X Wave W3 (docs/4X_BASELINE_2026-08.md): the discovery content table
// (SurveyDiscovery / SURVEY_DISCOVERIES) and its roll function used to live
// here as rollSurveyDiscovery(). They have moved to exploration.ts, merged
// with the anomaly/claim-stake system into one deterministic
// rollDiscovery() — see exploration.ts for the content and the unification
// rationale. SURVEY_DURATION (below) stays here — it's ship-expedition
// timing, not discovery content.

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

// ─── SHIP DEFINITIONS (Balance Pass) ────────────────────────────────────────

export const SHIPS: ShipDefinition[] = [
  // TRANSPORT
  {
    id: 'cargo_shuttle', name: 'Cargo Shuttle', icon: '🚀', role: 'transport',
    description: 'Basic orbital transport. Moves resources between Earth surface, LEO, and GEO.',
    tooltip: 'WHY BUILD: Move resources you mine at one location to where you need them. LOGISTICS BONUS: When idle at a location, provides +10% mining output bonus to all resource production there (stacks up to +50%). For example, mine iron on the Lunar Surface and shuttle it to LEO for building space stations. Also useful for fulfilling resource bounties that require delivery to specific locations. At 50 units capacity and $200K/mo maintenance, this is your affordable early workhorse. Build 2-3 once you start mining.',
    cargoCapacity: 50, baseCost: 20_000_000,
    resourceCost: { aluminum: 20, iron: 30 },
    requiredResearch: ['reusable_boosters'], buildTimeSeconds: 300, tier: 1,
    maintenancePerMonth: 200_000,
  },
  {
    id: 'freighter', name: 'Space Freighter', icon: '🚢', role: 'transport',
    description: 'Mid-range hauler. Can reach the Moon with 200 units of cargo.',
    tooltip: 'WHY BUILD: Your first serious bulk hauler. LOGISTICS BONUS: When idle at a location, provides +10% mining output bonus to all resource production there (stacks up to +50%). With 200-unit capacity (4x a Cargo Shuttle), it makes lunar supply runs efficient. Move large quantities of lunar water, iron, and aluminum between your Moon mining operations and LEO/Earth facilities. Essential once you have multiple mining operations producing resources faster than shuttles can move them. The $800K/mo maintenance is easily justified by mid-game resource volumes.',
    cargoCapacity: 200, baseCost: 100_000_000,
    resourceCost: { titanium: 30, aluminum: 50, iron: 80 },
    requiredResearch: ['modular_spacecraft'], buildTimeSeconds: 600, tier: 2,
    maintenancePerMonth: 800_000,
  },
  {
    id: 'heavy_transport', name: 'Heavy Transport', icon: '🏗️', role: 'transport',
    description: 'Massive hauler for Mars and asteroid belt routes. 500 unit capacity.',
    tooltip: 'WHY BUILD: The only ship with enough cargo capacity (500 units) to make Mars and asteroid belt supply runs worthwhile. LOGISTICS BONUS: When idle at a location, provides +10% mining output bonus to all resource production there (stacks up to +50%). Long travel times to these destinations mean you want to move as much as possible per trip. Critical for delivering titanium, rare earth, and platinum from the asteroid belt back to your inner system facilities. Also needed to supply Mars colonies with equipment. Build when you expand beyond the Moon.',
    cargoCapacity: 500, baseCost: 500_000_000,
    resourceCost: { titanium: 80, aluminum: 100, rare_earth: 20 },
    requiredResearch: ['interplanetary_cruisers'], buildTimeSeconds: 1200, tier: 3,
    maintenancePerMonth: 3_000_000,
  },

  // TANKER — doubles capacity for water/fuel, reduces propellant depot costs
  {
    id: 'fuel_tanker', name: 'Fuel Tanker', icon: '⛽', role: 'tanker',
    description: 'Specialized for water and fuel transport. 2x capacity for liquids. Boosts propellant depot revenue by 15% when stationed.',
    tooltip: 'WHY BUILD: Carries 300 units with 2x effective capacity for water and fuel (effectively 600 units of liquids). LOGISTICS BONUS: When idle at a location, provides +10% mining output bonus to all resource production there (stacks up to +50%). Park one at your lunar mining operation to shuttle water efficiently. When stationed at a location with a Propellant Depot, it boosts depot service revenue by 15%. Cheaper than a Freighter ($80M vs $100M) with better liquid capacity. Build once you have lunar water mining active.',
    cargoCapacity: 300, baseCost: 80_000_000,
    resourceCost: { iron: 60, aluminum: 40 },
    requiredResearch: ['resource_prospecting'], buildTimeSeconds: 480, tier: 2,
    maintenancePerMonth: 500_000,
  },

  // MINING — rebalanced for better ROI
  {
    id: 'prospector_drone', name: 'Prospector Drone', icon: '🛠️', role: 'mining',
    description: 'Bare-bones starter mining drone. No exotic materials to build — just money and a shipyard.',
    tooltip: 'STARTER MINER. Built from shelf parts with money alone — no iron, aluminum, or research gates. Mines a trickle of iron/aluminum anywhere ship-mining is allowed. Use it to bootstrap your first resource inventory before graduating to the Mining Drone or Ore Harvester. Low cargo (12 units), low mining rate (3/min), but always available.',
    cargoCapacity: 12, miningRate: 3,
    miningTargets: ['iron', 'aluminum'],
    baseCost: 30_000_000,
    resourceCost: {},
    requiredResearch: [], buildTimeSeconds: 120, tier: 1,
    maintenancePerMonth: 80_000,
  },
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

  // ─── INTERSTELLAR (Wave 10 — expedition-capable hulls) ────────────────────
  // Cost scale anchors: deep_space_miner (tier 4) = $1B; jump_drive research =
  // $500B; corporation tier 5 requires $500B totalEarned. Interstellar hulls
  // sit between those: end-game purchases that a tier-5+ corp can afford
  // repeatedly but that still represent a meaningful capital commitment.
  {
    id: 'starfarer_explorer', name: 'Starfarer-Class Explorer', icon: '🌠', role: 'survey',
    description: 'Alcubierre-capable survey vessel. The only ship class able to jump beyond the heliopause, survey a star system, and return.',
    tooltip: 'WHY BUILD: The gateway to the interstellar era. Jump to Proxima Centauri, Barnard\'s Star, and beyond; survey findings pay $5B-$20B+ per expedition in exclusive data sales, plus exotic resource samples. Reusable across expeditions (unlike survey probes). Requires the Alcubierre-Class Jump Drive research and exotic-matter fuel per jump. Insure your expeditions — interstellar space is unforgiving.',
    cargoCapacity: 400, baseCost: 25_000_000_000,
    resourceCost: { titanium: 400, rare_earth: 150, exotic_materials: 40, helium3: 20 },
    requiredResearch: ['jump_drive'], buildTimeSeconds: 43_200, tier: 5,
    maintenancePerMonth: 60_000_000, // ~0.24% of hull/month, matching deep_space_miner's 0.5% at half rate for a ship that spends most months in transit
    stats: { crewRequired: 12, crewCapacity: 20, lifeSupportDays: 4_000, shieldingRating: 0.35, hullIntegrity: 1_500 },
  },
  {
    id: 'colony_ark', name: 'Colony Ark', icon: '🛸', role: 'transport',
    description: 'Generation-ship-derived colony vessel. Carries an entire founding settlement — habitat rings, fabricators, and 100 colonists — to another star.',
    tooltip: 'WHY BUILD: The only way to found an interstellar colony. Launch it on an expedition; on arrival you may establish a permanent colony that produces exotic resources unavailable in Sol — including exotic-matter fuel, which makes every later jump cheaper. The ship is permanently committed to the colony it founds. Per STATS_DESIGN: colonial ships are slow, expensive, and generational.',
    cargoCapacity: 2_000, baseCost: 80_000_000_000,
    resourceCost: { titanium: 1_200, aluminum: 2_000, rare_earth: 300, exotic_materials: 100, helium3: 50 },
    requiredResearch: ['jump_drive', 'interstellar_colonization'], buildTimeSeconds: 86_400, tier: 5,
    maintenancePerMonth: 120_000_000,
    stats: { crewRequired: 40, crewCapacity: 160, lifeSupportDays: 8_000, shieldingRating: 0.40, hullIntegrity: 3_000 },
  },
];

export const SHIP_MAP = new Map(SHIPS.map(s => [s.id, s]));

// ─── Phase I: Ship Derived Stats ────────────────────────────────────────────
// Fills in every ShipDerivedStats field based on role + tier, then applies
// any per-ship overrides from def.stats. Role profile is the load-bearing
// behavior (cargo ships vs surveyors vs miners have very different stats).
//
// Defaults are intentionally conservative baselines for now — later waves
// (hazard system, module system, market-depth work) will consume them.

const ROLE_PROFILE: Record<ShipRole, (tier: number) => ShipDerivedStats> = {
  transport: (tier) => ({
    sublightSpeed: 2_000 + tier * 400,
    warpFactor: 0.8 + tier * 0.2,
    fuelCapacity: 400 + tier * 300,
    fuelBurnRate: 4 + tier * 0.8,
    deltaVBudget: 8_000 + tier * 2_000,
    crewRequired: 2 + tier,
    crewCapacity: 6 + tier * 2,
    lifeSupportDays: 60 + tier * 30,
    hullIntegrity: 400 + tier * 200,
    shieldingRating: 0.15 + tier * 0.05,
    pointDefenseRating: 0.10 + tier * 0.03,
    surveyRange: 0,
    surveyAccuracy: 0,
    stealthSignature: 1.4 - tier * 0.05,  // big ships = loud
    mtbfHours: 1_200 + tier * 600,
    insurancePremium: 0,  // pay-as-you-go
    insuredValue: 0,
    moduleSlots: 2 + tier,
    hardpointTypes: ['cargo', 'engine', 'utility'],
  }),
  tanker: (tier) => ({
    sublightSpeed: 1_500 + tier * 300,
    warpFactor: 0.6 + tier * 0.15,
    fuelCapacity: 1_500 + tier * 800,  // tankers carry a lot of fuel
    fuelBurnRate: 5 + tier,
    deltaVBudget: 10_000 + tier * 2_500,
    crewRequired: 3 + tier,
    crewCapacity: 6 + tier * 2,
    lifeSupportDays: 90 + tier * 30,
    hullIntegrity: 500 + tier * 250,  // robust — carrying fuel
    shieldingRating: 0.20 + tier * 0.05,
    pointDefenseRating: 0.15 + tier * 0.04,
    surveyRange: 0,
    surveyAccuracy: 0,
    stealthSignature: 1.5 - tier * 0.05,
    mtbfHours: 1_500 + tier * 600,
    insurancePremium: 0,
    insuredValue: 0,
    moduleSlots: 2 + tier,
    hardpointTypes: ['cargo', 'shield', 'utility'],
  }),
  mining: (tier) => ({
    sublightSpeed: 1_200 + tier * 300,
    warpFactor: 0.5 + tier * 0.15,
    fuelCapacity: 250 + tier * 200,
    fuelBurnRate: 3 + tier * 0.6,
    deltaVBudget: 6_000 + tier * 1_800,
    crewRequired: 1 + Math.floor(tier / 2),
    crewCapacity: 4 + tier,
    lifeSupportDays: 45 + tier * 20,
    hullIntegrity: 350 + tier * 180,
    shieldingRating: 0.12 + tier * 0.04,
    pointDefenseRating: 0.08 + tier * 0.03,
    surveyRange: 0.2 + tier * 0.1,  // basic prospecting range
    surveyAccuracy: 0.3 + tier * 0.08,
    stealthSignature: 1.2 - tier * 0.04,
    mtbfHours: 1_000 + tier * 500,  // mining wears ships down
    insurancePremium: 0,
    insuredValue: 0,
    moduleSlots: 3 + tier,
    hardpointTypes: ['drone', 'cargo', 'utility'],
  }),
  survey: (tier) => ({
    sublightSpeed: 3_500 + tier * 500,
    warpFactor: 1.2 + tier * 0.3,
    fuelCapacity: 500 + tier * 250,
    fuelBurnRate: 2 + tier * 0.4,  // efficient engines
    deltaVBudget: 12_000 + tier * 3_000,
    crewRequired: 1 + Math.floor(tier / 3),
    crewCapacity: 3 + tier,
    lifeSupportDays: 120 + tier * 40,
    hullIntegrity: 200 + tier * 120,  // fragile; speed > armor
    shieldingRating: 0.08 + tier * 0.03,
    pointDefenseRating: 0.05 + tier * 0.02,
    surveyRange: 2 + tier * 1.5,
    surveyAccuracy: 0.55 + tier * 0.1,
    stealthSignature: 0.6 - tier * 0.06,  // low signature by design
    mtbfHours: 2_000 + tier * 800,
    insurancePremium: 0,
    insuredValue: 0,
    moduleSlots: 3 + tier,
    hardpointTypes: ['sensor', 'engine', 'utility'],
  }),
};

const BASE_INSURANCE_RATE = 0.002;  // 0.2% of baseCost per game-month if insured

export function getShipDerivedStats(def: ShipDefinition): ShipDerivedStats {
  const profile = ROLE_PROFILE[def.role];
  const defaults = profile(def.tier);
  // Reasonable insured-value defaults — 80% of baseCost.
  defaults.insurancePremium = Math.round(def.baseCost * BASE_INSURANCE_RATE);
  defaults.insuredValue = Math.round(def.baseCost * 0.8);
  if (!def.stats) return defaults;
  return { ...defaults, ...def.stats };
}

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
