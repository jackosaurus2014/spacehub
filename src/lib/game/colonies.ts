// ─── Space Tycoon: Colony & Expanded Solar System ────────────────────────────
// 500-wave competitive economic design for 500+ players.
//
// COLONIZABLE BODIES (based on real science):
// ─────────────────────────────────────────────
// INNER SYSTEM:
//   Mercury     — Extreme heat/cold, rich in metals (iron, nickel), solar energy
//   Venus Orbit — Floating cloud cities at 50km altitude, sulfuric acid processing
//   Moon        — Already in game (water ice, helium-3, regolith)
//   Mars        — Already in game (water, iron, CO2 processing)
//
// ASTEROID BELT:
//   Ceres       — Dwarf planet, water ice, ammonia, organic compounds
//   Vesta       — Iron/nickel core, basaltic surface
//   Already in game as generic "asteroid belt"
//
// OUTER SYSTEM:
//   Jupiter Moons:
//     Io         — Volcanically active, sulfur, silicates (extreme radiation)
//     Europa     — Already partially in game (subsurface ocean, exotic materials)
//     Ganymede   — Largest moon, magnetic field, water ice, iron core
//     Callisto   — Low radiation, water ice, good for bases
//   Saturn Moons:
//     Titan      — Already partially in game (methane, ethane lakes, thick atmosphere)
//     Enceladus  — Water geysers, organic compounds, potential life
//     Rhea       — Water ice, possible ring system
//   Uranus Moons:
//     Titania    — Water ice, CO2 frost, largest Uranus moon
//     Miranda    — Dramatic terrain, water ice
//   Neptune:
//     Triton     — Nitrogen geysers, water ice, retrograde orbit
//   Kuiper Belt:
//     Pluto      — Nitrogen ice, methane, water ice mountains
//     Eris       — Most massive dwarf planet, methane ice
//
// COMPETITIVE DESIGN FOR 500+ PLAYERS:
// ────────────────────────────────────
// 1. Limited colony slots per body (first-come-first-served for premium locations)
// 2. Resource extraction rights that deplete over time (forcing expansion)
// 3. Orbital toll stations that charge other players for transit
// 4. Exclusive research bonuses for first colonizer of each body
// 5. Supply chain dependencies (inner system needs outer system fuel, outer needs inner metals)
// 6. Trade route monopolies (control Ceres = control belt logistics)
// 7. Alliance territory control (alliances can claim entire subsystems)

// ─── New Location Definitions ────────────────────────────────────────────────
// These extend the existing LOCATIONS array in solar-system.ts

export interface ColonyLocation {
  id: string;
  name: string;
  type: string;
  body: string; // Physical body (mercury, venus_clouds, ceres, etc.)
  description: string;
  distanceFromEarthAU: number;
  deltaVFromLEO: number;
  travelTimeMonths: number;
  unlockCost: number;
  requiredResearch: string[];
  availableBuildings: string[];
  tier: number;
  // Colony-specific
  maxColonySlots: number; // Limits how many players can colonize (competitive)
  surfaceGravity: number; // g (affects construction costs)
  hasAtmosphere: boolean;
  temperature: string; // Descriptive
  uniqueResources: string[]; // Resources only found here
  hazards: string[]; // Environmental dangers
  colonyBonus?: string; // First-colonizer bonus description
}

export const EXPANDED_LOCATIONS: ColonyLocation[] = [
  // ─── INNER SYSTEM ──────────────────────────────────────────────────

  {
    id: 'mercury_surface',
    name: 'Mercury Surface',
    type: 'mercury',
    body: 'mercury',
    description: 'Extreme temperatures but incredibly rich in metals and solar energy. Permanently shadowed craters hold water ice.',
    distanceFromEarthAU: 0.39,
    deltaVFromLEO: 13000,
    travelTimeMonths: 6,
    unlockCost: 50_000_000_000,
    requiredResearch: ['super_heavy_lift', 'radiation_hardening', 'extreme_thermal'],
    availableBuildings: ['colony_mercury', 'mining_mercury', 'solar_mega_array', 'metal_refinery_mercury'],
    tier: 3,
    maxColonySlots: 50,
    surfaceGravity: 0.38,
    hasAtmosphere: false,
    temperature: '-180°C to 430°C',
    uniqueResources: ['mercury_iron', 'solar_concentrate'],
    hazards: ['extreme_heat', 'no_atmosphere', 'solar_radiation'],
    colonyBonus: 'First colonizer: +50% solar energy generation permanently',
  },

  {
    id: 'venus_orbit',
    name: 'Venus Cloud Cities',
    type: 'venus',
    body: 'venus',
    description: 'Floating habitats at 50km altitude where pressure and temperature are Earth-like. Mine sulfuric acid and CO2.',
    distanceFromEarthAU: 0.72,
    deltaVFromLEO: 7500,
    travelTimeMonths: 5,
    unlockCost: 40_000_000_000,
    requiredResearch: ['super_heavy_lift', 'atmospheric_processing', 'aerostat_tech'],
    availableBuildings: ['colony_venus', 'atmospheric_processor', 'sulfuric_refinery', 'venus_observatory'],
    tier: 3,
    maxColonySlots: 30,
    surfaceGravity: 0.91,
    hasAtmosphere: true,
    temperature: '30°C at 50km altitude',
    uniqueResources: ['sulfuric_acid', 'venus_co2'],
    hazards: ['acid_clouds', 'high_winds'],
    colonyBonus: 'First colonizer: Atmospheric research grants +25% research speed',
  },

  // ─── CERES (Asteroid Belt Hub) ─────────────────────────────────────

  {
    id: 'ceres_surface',
    name: 'Ceres',
    type: 'asteroid_belt',
    body: 'ceres',
    description: 'Dwarf planet and logistics hub of the asteroid belt. Water ice, ammonia, and organic compounds.',
    distanceFromEarthAU: 2.77,
    deltaVFromLEO: 9500,
    travelTimeMonths: 15,
    unlockCost: 20_000_000_000,
    requiredResearch: ['asteroid_capture', 'autonomous_docking', 'resource_prospecting'],
    availableBuildings: ['colony_ceres', 'mining_ceres', 'trade_hub_ceres', 'ice_refinery_ceres', 'shipyard_ceres'],
    tier: 3,
    maxColonySlots: 100, // Major hub, more slots
    surfaceGravity: 0.03,
    hasAtmosphere: false,
    temperature: '-106°C',
    uniqueResources: ['ammonia', 'organic_compounds'],
    hazards: ['micro_gravity', 'radiation'],
    colonyBonus: 'First colonizer: Trade hub fees reduced 50% (logistics monopoly)',
  },

  // ─── JUPITER MOONS ─────────────────────────────────────────────────

  {
    id: 'io_surface',
    name: 'Io (Volcanic Moon)',
    type: 'jupiter',
    body: 'io',
    description: 'Most volcanically active body in the solar system. Rich in sulfur and silicates. Extreme radiation from Jupiter.',
    distanceFromEarthAU: 5.2,
    deltaVFromLEO: 14500,
    travelTimeMonths: 28,
    unlockCost: 80_000_000_000,
    requiredResearch: ['nuclear_thermal', 'radiation_hardening', 'extreme_thermal'],
    availableBuildings: ['colony_io', 'mining_io', 'geothermal_plant', 'sulfur_refinery'],
    tier: 4,
    maxColonySlots: 20, // Very hostile, few slots
    surfaceGravity: 0.18,
    hasAtmosphere: false,
    temperature: '-130°C to 1700°C (near volcanoes)',
    uniqueResources: ['sulfur', 'silicates', 'geothermal_energy'],
    hazards: ['extreme_radiation', 'volcanic_eruptions', 'tidal_stress'],
    colonyBonus: 'First colonizer: Geothermal energy is free (no maintenance)',
  },

  {
    id: 'europa_surface',
    name: 'Europa (Ice Moon)',
    type: 'jupiter',
    body: 'europa',
    description: 'Subsurface ocean beneath ice crust. Potential for life. Source of exotic materials and pure water.',
    distanceFromEarthAU: 5.2,
    deltaVFromLEO: 14200,
    travelTimeMonths: 30,
    unlockCost: 120_000_000_000,
    requiredResearch: ['nuclear_thermal', 'deep_drilling', 'cryogenic_systems'],
    availableBuildings: ['colony_europa', 'mining_europa_deep', 'ocean_lab', 'bio_research_lab'],
    tier: 4,
    maxColonySlots: 25,
    surfaceGravity: 0.13,
    hasAtmosphere: false,
    temperature: '-160°C',
    uniqueResources: ['europa_water', 'bio_compounds', 'exotic_materials'],
    hazards: ['extreme_radiation', 'ice_quakes', 'subsurface_pressure'],
    colonyBonus: 'First colonizer: Bio research produces 2x exotic materials',
  },

  {
    id: 'ganymede_surface',
    name: 'Ganymede',
    type: 'jupiter',
    body: 'ganymede',
    description: 'Largest moon in the solar system. Own magnetic field provides radiation shielding. Water ice and iron core.',
    distanceFromEarthAU: 5.2,
    deltaVFromLEO: 14800,
    travelTimeMonths: 32,
    unlockCost: 90_000_000_000,
    requiredResearch: ['nuclear_thermal', 'interplanetary_cruisers', 'rotating_habitats'],
    availableBuildings: ['colony_ganymede', 'mining_ganymede', 'research_campus', 'orbital_dock_ganymede'],
    tier: 4,
    maxColonySlots: 60, // Most hospitable Jupiter moon
    surfaceGravity: 0.15,
    hasAtmosphere: false,
    temperature: '-160°C',
    uniqueResources: ['ganymede_ice', 'iron_core_metals'],
    hazards: ['moderate_radiation'],
    colonyBonus: 'First colonizer: Magnetic shielding reduces all colony maintenance 20%',
  },

  {
    id: 'callisto_surface',
    name: 'Callisto',
    type: 'jupiter',
    body: 'callisto',
    description: 'Low radiation, stable surface. Ideal staging point for outer system expeditions. Ancient, heavily cratered.',
    distanceFromEarthAU: 5.2,
    deltaVFromLEO: 15000,
    travelTimeMonths: 33,
    unlockCost: 70_000_000_000,
    requiredResearch: ['nuclear_thermal', 'interplanetary_cruisers'],
    availableBuildings: ['colony_callisto', 'mining_callisto', 'fuel_depot_callisto', 'deep_space_observatory'],
    tier: 4,
    maxColonySlots: 40,
    surfaceGravity: 0.13,
    hasAtmosphere: false,
    temperature: '-139°C',
    uniqueResources: ['callisto_ice', 'ancient_minerals'],
    hazards: ['low_gravity', 'distance_from_earth'],
    colonyBonus: 'First colonizer: Fuel depot services cost 30% less',
  },

  // ─── SATURN MOONS ──────────────────────────────────────────────────

  {
    id: 'titan_surface',
    name: 'Titan',
    type: 'saturn',
    body: 'titan',
    description: 'Thick atmosphere, methane lakes. Only moon with dense atmosphere. Chemical industry paradise.',
    distanceFromEarthAU: 9.5,
    deltaVFromLEO: 18500,
    travelTimeMonths: 55,
    unlockCost: 150_000_000_000,
    requiredResearch: ['nuclear_thermal', 'deep_drilling', 'atmospheric_processing'],
    availableBuildings: ['colony_titan', 'mining_titan_deep', 'chemical_plant', 'methane_refinery', 'titan_shipyard'],
    tier: 5,
    maxColonySlots: 40,
    surfaceGravity: 0.14,
    hasAtmosphere: true,
    temperature: '-179°C',
    uniqueResources: ['liquid_methane', 'liquid_ethane', 'tholin_organics'],
    hazards: ['extreme_cold', 'methane_rain'],
    colonyBonus: 'First colonizer: Chemical plant produces 3x output',
  },

  {
    id: 'enceladus_surface',
    name: 'Enceladus',
    type: 'saturn',
    body: 'enceladus',
    description: 'Geysers eject water and organics from subsurface ocean. Prime target for life detection and exotic material collection.',
    distanceFromEarthAU: 9.5,
    deltaVFromLEO: 18200,
    travelTimeMonths: 58,
    unlockCost: 180_000_000_000,
    requiredResearch: ['nuclear_thermal', 'deep_drilling', 'cryogenic_systems'],
    availableBuildings: ['colony_enceladus', 'geyser_collector', 'bio_lab_enceladus', 'exotic_refinery'],
    tier: 5,
    maxColonySlots: 15, // Very small moon, limited slots
    surfaceGravity: 0.01,
    hasAtmosphere: false,
    temperature: '-198°C',
    uniqueResources: ['enceladus_water', 'hydrothermal_compounds', 'bio_samples'],
    hazards: ['micro_gravity', 'geyser_eruptions', 'extreme_cold'],
    colonyBonus: 'First colonizer: Bio samples worth 5x market value',
  },

  // ─── URANUS SYSTEM ─────────────────────────────────────────────────

  {
    id: 'titania_surface',
    name: 'Titania',
    type: 'uranus',
    body: 'titania',
    description: 'Largest Uranus moon. Water ice and CO2 frost. Extreme cold but mineral-rich.',
    distanceFromEarthAU: 19.2,
    deltaVFromLEO: 22000,
    travelTimeMonths: 84,
    unlockCost: 300_000_000_000,
    requiredResearch: ['fusion_drive', 'generation_ships', 'cryogenic_systems'],
    availableBuildings: ['colony_titania', 'mining_titania', 'deep_space_relay_uranus', 'cryo_lab'],
    tier: 5,
    maxColonySlots: 20,
    surfaceGravity: 0.04,
    hasAtmosphere: false,
    temperature: '-213°C',
    uniqueResources: ['co2_frost', 'titania_minerals', 'deuterium'],
    hazards: ['extreme_cold', 'extreme_distance', 'communication_delay'],
    colonyBonus: 'First colonizer: Deuterium mining exclusive for 120 months',
  },

  // ─── NEPTUNE SYSTEM ────────────────────────────────────────────────

  {
    id: 'triton_surface',
    name: 'Triton',
    type: 'neptune',
    body: 'triton',
    description: 'Neptune\'s largest moon. Retrograde orbit suggests captured Kuiper Belt object. Nitrogen geysers and water ice.',
    distanceFromEarthAU: 30.1,
    deltaVFromLEO: 26000,
    travelTimeMonths: 120,
    unlockCost: 400_000_000_000,
    requiredResearch: ['fusion_drive', 'generation_ships', 'antimatter_propulsion'],
    availableBuildings: ['colony_triton', 'mining_triton', 'nitrogen_plant', 'frontier_outpost'],
    tier: 6,
    maxColonySlots: 10, // Extreme frontier, very few slots
    surfaceGravity: 0.08,
    hasAtmosphere: true, // Thin nitrogen atmosphere
    temperature: '-235°C',
    uniqueResources: ['nitrogen_ice', 'triton_exotics', 'antimatter_precursors'],
    hazards: ['extreme_cold', 'communication_delay_8hr', 'isolation'],
    colonyBonus: 'First colonizer: Antimatter precursor mining monopoly (no competition for 240 months)',
  },

  // ─── KUIPER BELT / PLUTO ───────────────────────────────────────────

  {
    id: 'pluto_surface',
    name: 'Pluto-Charon',
    type: 'outer_system',
    body: 'pluto',
    description: 'Binary dwarf planet system at the edge of the solar system. Nitrogen ice plains, methane mountains, and the gateway to interstellar space.',
    distanceFromEarthAU: 39.5,
    deltaVFromLEO: 30000,
    travelTimeMonths: 180,
    unlockCost: 750_000_000_000,
    requiredResearch: ['fusion_drive', 'generation_ships', 'antimatter_propulsion', 'mega_structures'],
    availableBuildings: ['colony_pluto', 'mining_pluto', 'interstellar_beacon', 'gravity_lens_observatory'],
    tier: 6,
    maxColonySlots: 5, // Ultimate frontier, extremely limited
    surfaceGravity: 0.06,
    hasAtmosphere: true, // Thin, seasonal nitrogen atmosphere
    temperature: '-230°C',
    uniqueResources: ['nitrogen_ice_pure', 'charon_minerals', 'interstellar_particles'],
    hazards: ['extreme_cold', 'communication_delay_5hr', 'total_isolation'],
    colonyBonus: 'First colonizer: Interstellar beacon grants +100% research speed to ALL projects permanently',
  },
];

// ─── New Research Requirements ───────────────────────────────────────────────

export const COLONY_RESEARCH = [
  {
    id: 'radiation_hardening', name: 'Radiation Hardening', category: 'infrastructure', tier: 3,
    description: 'Protect electronics and habitats from intense radiation environments.',
    effect: 'Enables colonies on Io and Mercury',
    baseCost: 5_000_000_000,
    baseMonths: 24,
    realBuildSeconds: 5400, // 90 min
  },
  {
    id: 'extreme_thermal', name: 'Extreme Thermal Management', category: 'infrastructure', tier: 3,
    description: 'Survive temperature extremes from -270°C to 430°C.',
    effect: 'Enables Mercury and Io colonies',
    baseCost: 8_000_000_000,
    baseMonths: 30,
    realBuildSeconds: 7200, // 2 hr
  },
  {
    id: 'atmospheric_processing', name: 'Atmospheric Processing', category: 'mining', tier: 3,
    description: 'Extract and process gases from planetary atmospheres.',
    effect: 'Enables Venus cloud cities and Titan chemical plants',
    baseCost: 6_000_000_000,
    baseMonths: 24,
    realBuildSeconds: 5400,
  },
  {
    id: 'aerostat_tech', name: 'Aerostat Technology', category: 'infrastructure', tier: 3,
    description: 'Build floating platforms in dense atmospheres.',
    effect: 'Enables Venus cloud colonies',
    baseCost: 10_000_000_000,
    baseMonths: 30,
    realBuildSeconds: 7200,
  },
  {
    id: 'cryogenic_systems', name: 'Cryogenic Life Support', category: 'infrastructure', tier: 4,
    description: 'Maintain habitats in extreme cold (-200°C and below).',
    effect: 'Enables Europa, Enceladus, Titan, and outer system colonies',
    baseCost: 15_000_000_000,
    baseMonths: 36,
    realBuildSeconds: 10800, // 3 hr
  },
];

// ─── New Building Types for Colonies ─────────────────────────────────────────

export const COLONY_BUILDINGS = [
  // Mercury
  { id: 'colony_mercury', name: 'Mercury Outpost', category: 'habitat', tier: 3,
    description: 'Shielded colony in Mercury\'s polar craters. Powered by concentrated solar energy.',
    baseCost: 30_000_000_000, maintenanceCostPerMonth: 15_000_000, realBuildSeconds: 7200,
    requiredResearch: ['radiation_hardening', 'extreme_thermal'], requiredLocation: 'mercury_surface',
    enabledServices: ['svc_mercury_mining'] },
  { id: 'solar_mega_array', name: 'Solar Mega-Array', category: 'solar_farm', tier: 3,
    description: 'Massive solar collection facility. Mercury receives 6.5x more solar energy than Earth.',
    baseCost: 15_000_000_000, maintenanceCostPerMonth: 3_000_000, realBuildSeconds: 3600,
    requiredResearch: ['extreme_thermal', 'beamed_power'], requiredLocation: 'mercury_surface',
    enabledServices: ['svc_beamed_power'] },

  // Venus
  { id: 'colony_venus', name: 'Venus Cloud Habitat', category: 'habitat', tier: 3,
    description: 'Floating habitat at 50km altitude. Earth-like pressure and temperature.',
    baseCost: 25_000_000_000, maintenanceCostPerMonth: 12_000_000, realBuildSeconds: 5400,
    requiredResearch: ['aerostat_tech', 'atmospheric_processing'], requiredLocation: 'venus_orbit',
    enabledServices: ['svc_venus_research'] },

  // Ceres
  { id: 'colony_ceres', name: 'Ceres Colony', category: 'habitat', tier: 3,
    description: 'Underground colony in Ceres\' ice-rich subsurface. Hub for asteroid belt logistics.',
    baseCost: 15_000_000_000, maintenanceCostPerMonth: 8_000_000, realBuildSeconds: 3600,
    requiredResearch: ['asteroid_capture', 'rotating_habitats'], requiredLocation: 'ceres_surface',
    enabledServices: ['svc_ceres_logistics'] },
  { id: 'trade_hub_ceres', name: 'Ceres Trade Hub', category: 'space_station', tier: 3,
    description: 'Central marketplace for asteroid belt commerce. Charges transit fees.',
    baseCost: 20_000_000_000, maintenanceCostPerMonth: 10_000_000, realBuildSeconds: 5400,
    requiredResearch: ['asteroid_capture', 'autonomous_docking'], requiredLocation: 'ceres_surface',
    enabledServices: ['svc_trade_hub'] },

  // Jupiter Moons
  { id: 'colony_ganymede', name: 'Ganymede Colony', category: 'habitat', tier: 4,
    description: 'Protected by Ganymede\'s magnetic field. Most habitable Jupiter moon.',
    baseCost: 60_000_000_000, maintenanceCostPerMonth: 20_000_000, realBuildSeconds: 7200,
    requiredResearch: ['nuclear_thermal', 'rotating_habitats'], requiredLocation: 'ganymede_surface',
    enabledServices: ['svc_ganymede_research'] },
  { id: 'colony_callisto', name: 'Callisto Base', category: 'habitat', tier: 4,
    description: 'Low-radiation staging base for deep space operations.',
    baseCost: 45_000_000_000, maintenanceCostPerMonth: 15_000_000, realBuildSeconds: 5400,
    requiredResearch: ['nuclear_thermal', 'interplanetary_cruisers'], requiredLocation: 'callisto_surface',
    enabledServices: ['svc_callisto_staging'] },
  { id: 'colony_europa', name: 'Europa Ice Station', category: 'habitat', tier: 4,
    description: 'Research station on Europa\'s ice crust. Drills to subsurface ocean.',
    baseCost: 80_000_000_000, maintenanceCostPerMonth: 25_000_000, realBuildSeconds: 10800,
    requiredResearch: ['deep_drilling', 'cryogenic_systems'], requiredLocation: 'europa_surface',
    enabledServices: ['svc_europa_deep_mining'] },
  { id: 'colony_io', name: 'Io Volcanic Station', category: 'habitat', tier: 4,
    description: 'Radiation-hardened station harvesting geothermal energy from Io\'s volcanoes.',
    baseCost: 50_000_000_000, maintenanceCostPerMonth: 30_000_000, realBuildSeconds: 7200,
    requiredResearch: ['radiation_hardening', 'extreme_thermal'], requiredLocation: 'io_surface',
    enabledServices: ['svc_io_geothermal'] },

  // Saturn Moons
  { id: 'colony_titan', name: 'Titan Colony', category: 'habitat', tier: 5,
    description: 'Pressurized colony on Titan. Uses methane atmosphere for chemical industry.',
    baseCost: 100_000_000_000, maintenanceCostPerMonth: 30_000_000, realBuildSeconds: 10800,
    requiredResearch: ['atmospheric_processing', 'cryogenic_systems'], requiredLocation: 'titan_surface',
    enabledServices: ['svc_titan_chemicals'] },
  { id: 'colony_enceladus', name: 'Enceladus Station', category: 'habitat', tier: 5,
    description: 'Geyser collection station. Captures exotic materials from plume eruptions.',
    baseCost: 120_000_000_000, maintenanceCostPerMonth: 35_000_000, realBuildSeconds: 14400,
    requiredResearch: ['cryogenic_systems', 'deep_drilling'], requiredLocation: 'enceladus_surface',
    enabledServices: ['svc_enceladus_collection'] },

  // Uranus/Neptune
  { id: 'colony_titania', name: 'Titania Outpost', category: 'habitat', tier: 5,
    description: 'Deep space outpost on Uranus\' largest moon. Deuterium extraction facility.',
    baseCost: 200_000_000_000, maintenanceCostPerMonth: 40_000_000, realBuildSeconds: 14400,
    requiredResearch: ['fusion_drive', 'cryogenic_systems'], requiredLocation: 'titania_surface',
    enabledServices: ['svc_deuterium_mining'] },
  { id: 'colony_triton', name: 'Triton Frontier Base', category: 'habitat', tier: 6,
    description: 'Neptune\'s captured moon. Gateway to the Kuiper Belt. Antimatter research.',
    baseCost: 300_000_000_000, maintenanceCostPerMonth: 50_000_000, realBuildSeconds: 21600,
    requiredResearch: ['fusion_drive', 'antimatter_propulsion'], requiredLocation: 'triton_surface',
    enabledServices: ['svc_antimatter_research'] },
  { id: 'colony_pluto', name: 'Pluto Colony', category: 'habitat', tier: 6,
    description: 'The ultimate frontier. Interstellar launch point at the edge of the solar system.',
    baseCost: 500_000_000_000, maintenanceCostPerMonth: 60_000_000, realBuildSeconds: 28800,
    requiredResearch: ['fusion_drive', 'generation_ships', 'antimatter_propulsion', 'mega_structures'],
    requiredLocation: 'pluto_surface',
    enabledServices: ['svc_interstellar_research'] },
];

// ─── New Services for Colonies ───────────────────────────────────────────────

export const COLONY_SERVICES = [
  // Mercury
  { id: 'svc_mercury_mining', name: 'Mercury Metal Extraction', type: 'mining_output', tier: 3,
    description: 'Mine ultra-pure iron, nickel, and rare metals from Mercury\'s crust.',
    revenuePerMonth: 45_000_000, operatingCostPerMonth: 15_000_000,
    requiredBuildings: ['colony_mercury'], requiredResearch: ['extreme_thermal'] },
  { id: 'svc_beamed_power', name: 'Beamed Solar Power', type: 'fabrication_output', tier: 3,
    description: 'Beam concentrated solar energy to other locations via microwave relay.',
    revenuePerMonth: 35_000_000, operatingCostPerMonth: 8_000_000,
    requiredBuildings: ['solar_mega_array'], requiredResearch: ['beamed_power'] },

  // Venus
  { id: 'svc_venus_research', name: 'Venus Atmospheric Research', type: 'sensor_service', tier: 3,
    description: 'Study Venus\'s atmosphere. Sell data to terraforming researchers.',
    revenuePerMonth: 30_000_000, operatingCostPerMonth: 10_000_000,
    requiredBuildings: ['colony_venus'], requiredResearch: ['atmospheric_processing'] },

  // Ceres
  { id: 'svc_ceres_logistics', name: 'Ceres Belt Logistics', type: 'fabrication_output', tier: 3,
    description: 'Central hub for asteroid belt supply chain. Charges transit and storage fees.',
    revenuePerMonth: 40_000_000, operatingCostPerMonth: 12_000_000,
    requiredBuildings: ['colony_ceres'], requiredResearch: ['asteroid_capture'] },
  { id: 'svc_trade_hub', name: 'Ceres Trade Exchange', type: 'fabrication_output', tier: 3,
    description: 'Multiplayer trade hub. Earns fees from all resource trades passing through the belt.',
    revenuePerMonth: 60_000_000, operatingCostPerMonth: 20_000_000,
    requiredBuildings: ['trade_hub_ceres'], requiredResearch: ['autonomous_docking'] },

  // Jupiter Moons
  { id: 'svc_ganymede_research', name: 'Ganymede Research Campus', type: 'ai_datacenter', tier: 4,
    description: 'Advanced research facility protected by Ganymede\'s magnetosphere.',
    revenuePerMonth: 80_000_000, operatingCostPerMonth: 25_000_000,
    requiredBuildings: ['colony_ganymede'], requiredResearch: ['nuclear_thermal'] },
  { id: 'svc_callisto_staging', name: 'Callisto Deep Space Staging', type: 'fabrication_output', tier: 4,
    description: 'Staging base for outer system expeditions. Fuel and supply depot.',
    revenuePerMonth: 50_000_000, operatingCostPerMonth: 18_000_000,
    requiredBuildings: ['colony_callisto'], requiredResearch: ['interplanetary_cruisers'] },
  { id: 'svc_europa_deep_mining', name: 'Europa Deep Ocean Mining', type: 'mining_output', tier: 4,
    description: 'Extract exotic materials from Europa\'s subsurface ocean.',
    revenuePerMonth: 120_000_000, operatingCostPerMonth: 40_000_000,
    requiredBuildings: ['colony_europa'], requiredResearch: ['deep_drilling'] },
  { id: 'svc_io_geothermal', name: 'Io Geothermal Power', type: 'fabrication_output', tier: 4,
    description: 'Harvest volcanic energy from Io. Unlimited power generation.',
    revenuePerMonth: 70_000_000, operatingCostPerMonth: 20_000_000,
    requiredBuildings: ['colony_io'], requiredResearch: ['extreme_thermal'] },

  // Saturn Moons
  { id: 'svc_titan_chemicals', name: 'Titan Chemical Industry', type: 'fabrication_output', tier: 5,
    description: 'Process Titan\'s methane and ethane into rocket fuel and industrial chemicals.',
    revenuePerMonth: 100_000_000, operatingCostPerMonth: 30_000_000,
    requiredBuildings: ['colony_titan'], requiredResearch: ['atmospheric_processing'] },
  { id: 'svc_enceladus_collection', name: 'Enceladus Geyser Collection', type: 'mining_output', tier: 5,
    description: 'Collect exotic compounds ejected by Enceladus\'s geysers. Extremely valuable.',
    revenuePerMonth: 150_000_000, operatingCostPerMonth: 45_000_000,
    requiredBuildings: ['colony_enceladus'], requiredResearch: ['deep_drilling'] },

  // Outer System
  { id: 'svc_deuterium_mining', name: 'Deuterium Extraction', type: 'mining_output', tier: 5,
    description: 'Extract deuterium fuel from Titania\'s ice. Essential for fusion reactors.',
    revenuePerMonth: 130_000_000, operatingCostPerMonth: 40_000_000,
    requiredBuildings: ['colony_titania'], requiredResearch: ['fusion_drive'] },
  { id: 'svc_antimatter_research', name: 'Antimatter Research', type: 'ai_datacenter', tier: 6,
    description: 'Cutting-edge antimatter production research. The key to interstellar travel.',
    revenuePerMonth: 250_000_000, operatingCostPerMonth: 80_000_000,
    requiredBuildings: ['colony_triton'], requiredResearch: ['antimatter_propulsion'] },
  { id: 'svc_interstellar_research', name: 'Interstellar Research', type: 'ai_datacenter', tier: 6,
    description: 'Push the boundaries of physics at the edge of the solar system.',
    revenuePerMonth: 500_000_000, operatingCostPerMonth: 150_000_000,
    requiredBuildings: ['colony_pluto'], requiredResearch: ['mega_structures'] },
];

// ─── New Resources from Colony Locations ─────────────────────────────────────

export const COLONY_RESOURCES = [
  { id: 'sulfur', name: 'Sulfur', icon: '🟡', category: 'industrial', baseMarketPrice: 12_000, minPrice: 3_000, maxPrice: 50_000, volatility: 0.04 },
  { id: 'ammonia', name: 'Ammonia', icon: '💨', category: 'industrial', baseMarketPrice: 18_000, minPrice: 5_000, maxPrice: 70_000, volatility: 0.05 },
  { id: 'organic_compounds', name: 'Organic Compounds', icon: '🧬', category: 'exotic', baseMarketPrice: 800_000, minPrice: 200_000, maxPrice: 4_000_000, volatility: 0.10 },
  { id: 'deuterium', name: 'Deuterium', icon: '⚛️', category: 'exotic', baseMarketPrice: 8_000_000, minPrice: 2_000_000, maxPrice: 30_000_000, volatility: 0.12 },
  { id: 'bio_samples', name: 'Bio Samples', icon: '🧫', category: 'exotic', baseMarketPrice: 15_000_000, minPrice: 5_000_000, maxPrice: 50_000_000, volatility: 0.15 },
  { id: 'antimatter_precursors', name: 'Antimatter Precursors', icon: '✴️', category: 'exotic', baseMarketPrice: 50_000_000, minPrice: 10_000_000, maxPrice: 200_000_000, volatility: 0.20 },
  { id: 'solar_concentrate', name: 'Solar Concentrate', icon: '☀️', category: 'energy', baseMarketPrice: 25_000, minPrice: 5_000, maxPrice: 100_000, volatility: 0.03 },
];

// ─── Colony Mining Production ────────────────────────────────────────────────

export const COLONY_MINING_PRODUCTION: Record<string, { resource: string; amountPerMonth: number }[]> = {
  svc_mercury_mining: [
    { resource: 'iron', amountPerMonth: 800 },
    { resource: 'titanium', amountPerMonth: 100 },
    { resource: 'solar_concentrate', amountPerMonth: 200 },
  ],
  svc_europa_deep_mining: [
    { resource: 'exotic_materials', amountPerMonth: 10 },
    { resource: 'bio_samples', amountPerMonth: 2 },
    { resource: 'lunar_water', amountPerMonth: 500 },
  ],
  svc_enceladus_collection: [
    { resource: 'exotic_materials', amountPerMonth: 8 },
    { resource: 'bio_samples', amountPerMonth: 5 },
    { resource: 'organic_compounds', amountPerMonth: 20 },
  ],
  svc_titan_chemicals: [
    { resource: 'methane', amountPerMonth: 600 },
    { resource: 'ethane', amountPerMonth: 300 },
    { resource: 'organic_compounds', amountPerMonth: 10 },
  ],
  svc_deuterium_mining: [
    { resource: 'deuterium', amountPerMonth: 3 },
    { resource: 'lunar_water', amountPerMonth: 300 },
  ],
  svc_antimatter_research: [
    { resource: 'antimatter_precursors', amountPerMonth: 1 },
    { resource: 'exotic_materials', amountPerMonth: 3 },
  ],
  svc_io_geothermal: [
    { resource: 'sulfur', amountPerMonth: 500 },
    { resource: 'iron', amountPerMonth: 200 },
  ],
  svc_ceres_logistics: [
    { resource: 'ammonia', amountPerMonth: 100 },
    { resource: 'organic_compounds', amountPerMonth: 5 },
    { resource: 'lunar_water', amountPerMonth: 200 },
  ],
  svc_interstellar_research: [
    { resource: 'antimatter_precursors', amountPerMonth: 3 },
    { resource: 'deuterium', amountPerMonth: 5 },
    { resource: 'exotic_materials', amountPerMonth: 15 },
  ],
};

// ─── Supply Chain Dependencies (drives competitive gameplay) ─────────────────
// Outer system colonies NEED inner system metals for construction.
// Inner system colonies NEED outer system fuel for propulsion.
// This creates trade dependencies between players at different locations.

export const SUPPLY_CHAIN_DEPENDENCIES: Record<string, { needs: string[]; produces: string[] }> = {
  mercury_surface: { needs: ['lunar_water', 'aluminum'], produces: ['iron', 'titanium', 'solar_concentrate'] },
  venus_orbit: { needs: ['iron', 'titanium'], produces: ['sulfuric_acid', 'organic_compounds'] },
  ceres_surface: { needs: ['titanium', 'rare_earth'], produces: ['ammonia', 'organic_compounds', 'lunar_water'] },
  io_surface: { needs: ['aluminum', 'titanium', 'lunar_water'], produces: ['sulfur', 'iron'] },
  europa_surface: { needs: ['iron', 'titanium', 'rare_earth'], produces: ['exotic_materials', 'bio_samples'] },
  ganymede_surface: { needs: ['iron', 'aluminum'], produces: ['lunar_water', 'iron'] },
  callisto_surface: { needs: ['methane', 'iron'], produces: ['lunar_water'] },
  titan_surface: { needs: ['iron', 'titanium', 'rare_earth'], produces: ['methane', 'ethane', 'organic_compounds'] },
  enceladus_surface: { needs: ['iron', 'titanium'], produces: ['exotic_materials', 'bio_samples', 'organic_compounds'] },
  titania_surface: { needs: ['iron', 'titanium', 'methane'], produces: ['deuterium'] },
  triton_surface: { needs: ['deuterium', 'exotic_materials', 'titanium'], produces: ['antimatter_precursors'] },
  pluto_surface: { needs: ['deuterium', 'antimatter_precursors', 'exotic_materials'], produces: ['antimatter_precursors', 'deuterium'] },
};
