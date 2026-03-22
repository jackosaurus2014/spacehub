// ─── Space Tycoon: Building Definitions ─────────────────────────────────────
// realBuildSeconds: Tier 1 ≈ 5 min (300s), Tier 2 ≈ 15 min, Tier 3 ≈ 45 min, Tier 4 ≈ 2 hr
// Duplicate builds at same location scale by 1.3x time (in addition to cost scaling)

import type { BuildingDefinition } from './types';

export const BUILDINGS: BuildingDefinition[] = [
  // ─── LAUNCH PADS ──────────────────────────────────────────────────────
  { id: 'launch_pad_small', name: 'Small Launch Pad', category: 'launch_pad', tier: 1,
    description: 'Supports small and medium rockets up to 5 tons to LEO.',
    baseCost: 50_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 500_000,
    requiredResearch: [], requiredLocation: 'earth_surface', enabledServices: ['svc_launch_small'],
    realBuildSeconds: 300 }, // 5 min
  { id: 'launch_pad_medium', name: 'Medium Launch Pad', category: 'launch_pad', tier: 2,
    description: 'Supports reusable medium-lift vehicles up to 25 tons to LEO.',
    baseCost: 200_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 1_500_000,
    requiredResearch: ['reusable_boosters'], requiredLocation: 'earth_surface', enabledServices: ['svc_launch_medium'],
    realBuildSeconds: 900, resourceCost: { iron: 50, aluminum: 30 } }, // 15 min
  { id: 'launch_pad_heavy', name: 'Heavy Launch Pad', category: 'launch_pad', tier: 3,
    description: 'Supports super-heavy vehicles. 100+ tons to LEO.',
    baseCost: 800_000_000, buildTimeMonths: 18, maintenanceCostPerMonth: 3_000_000,
    requiredResearch: ['super_heavy_lift'], requiredLocation: 'earth_surface', enabledServices: ['svc_launch_heavy'],
    realBuildSeconds: 2700, resourceCost: { iron: 200, titanium: 50, aluminum: 100 } }, // 45 min

  // ─── GROUND ───────────────────────────────────────────────────────────
  { id: 'ground_station', name: 'Ground Station', category: 'ground_station', tier: 1,
    description: 'Antenna complex for satellite comms and tracking. Generates revenue from tracking services.',
    baseCost: 30_000_000, buildTimeMonths: 4, maintenanceCostPerMonth: 300_000,
    requiredResearch: [], requiredLocation: 'earth_surface', enabledServices: ['svc_ground_tracking'],
    realBuildSeconds: 180 }, // 3 min (cheapest/fastest building)
  { id: 'mission_control', name: 'Mission Control Center', category: 'ground_station', tier: 1,
    description: 'Command center for space ops. Generates revenue from mission management contracts.',
    baseCost: 80_000_000, buildTimeMonths: 8, maintenanceCostPerMonth: 800_000,
    requiredResearch: [], requiredLocation: 'earth_surface', enabledServices: ['svc_mission_ops'],
    realBuildSeconds: 360 }, // 6 min

  // ─── SATELLITES (LEO) ─────────────────────────────────────────────────
  { id: 'sat_telecom', name: 'LEO Telecom Satellite', category: 'satellite', tier: 1,
    description: 'Low-latency broadband satellite for LEO constellation.',
    baseCost: 15_000_000, buildTimeMonths: 3, maintenanceCostPerMonth: 200_000,
    requiredResearch: [], requiredLocation: 'leo', enabledServices: ['svc_telecom_leo'],
    realBuildSeconds: 240 }, // 4 min
  { id: 'sat_sensor', name: 'LEO Sensor Satellite', category: 'satellite', tier: 1,
    description: 'Earth observation satellite with optical and infrared sensors.',
    baseCost: 25_000_000, buildTimeMonths: 4, maintenanceCostPerMonth: 250_000,
    requiredResearch: ['high_res_optical'], requiredLocation: 'leo', enabledServices: ['svc_sensor_leo'],
    realBuildSeconds: 300 }, // 5 min

  // ─── SATELLITES (GEO) ─────────────────────────────────────────────────
  { id: 'sat_telecom_geo', name: 'GEO Telecom Satellite', category: 'satellite', tier: 1,
    description: 'High-throughput geostationary communications satellite.',
    baseCost: 150_000_000, buildTimeMonths: 8, maintenanceCostPerMonth: 800_000,
    requiredResearch: [], requiredLocation: 'geo', enabledServices: ['svc_telecom_geo'],
    realBuildSeconds: 420 }, // 7 min
  { id: 'sat_sensor_geo', name: 'GEO Sensor Satellite', category: 'satellite', tier: 2,
    description: 'Persistent Earth monitoring from geostationary orbit.',
    baseCost: 200_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 1_000_000,
    requiredResearch: ['high_res_optical'], requiredLocation: 'geo', enabledServices: ['svc_sensor_geo'],
    realBuildSeconds: 900, resourceCost: { rare_earth: 10, titanium: 20 } }, // 15 min

  // ─── SPACE STATIONS ───────────────────────────────────────────────────
  { id: 'space_station_small', name: 'Orbital Outpost', category: 'space_station', tier: 1,
    description: 'Small modular space station in LEO. 4-person crew capacity.',
    baseCost: 500_000_000, buildTimeMonths: 18, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['modular_spacecraft'], requiredLocation: 'leo', enabledServices: ['svc_tourism_leo'],
    realBuildSeconds: 480, resourceCost: { aluminum: 50, titanium: 20 } }, // 8 min
  { id: 'space_station_lunar', name: 'Lunar Gateway', category: 'space_station', tier: 2,
    description: 'Orbital station around the Moon. Staging point for surface operations.',
    baseCost: 2_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['modular_spacecraft', 'reusable_boosters'], requiredLocation: 'lunar_orbit', enabledServices: ['svc_tourism_lunar_gateway'],
    realBuildSeconds: 1200, resourceCost: { aluminum: 100, titanium: 40, iron: 80 } }, // 20 min
  { id: 'space_station_mars', name: 'Mars Orbital Station', category: 'space_station', tier: 3,
    description: 'Permanent crewed station in Mars orbit.',
    baseCost: 10_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 15_000_000,
    requiredResearch: ['interplanetary_cruisers'], requiredLocation: 'mars_orbit', enabledServices: ['svc_mars_station_ops'],
    realBuildSeconds: 3600, resourceCost: { titanium: 100, aluminum: 200, rare_earth: 30, iron: 300 } }, // 1 hr

  // ─── DATA CENTERS ─────────────────────────────────────────────────────
  { id: 'datacenter_orbital', name: 'Orbital Data Center', category: 'datacenter', tier: 1,
    description: 'AI compute facility in orbit. Free cooling, solar powered.',
    baseCost: 300_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 2_000_000,
    requiredResearch: ['rad_hard_processors'], requiredLocation: 'leo', enabledServices: ['svc_ai_datacenter'],
    realBuildSeconds: 420, resourceCost: { rare_earth: 15, titanium: 10 } }, // 7 min
  { id: 'datacenter_mars_orbit', name: 'Mars Data Relay', category: 'datacenter', tier: 3,
    description: 'Data processing and relay facility at Mars.',
    baseCost: 3_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['edge_ai'], requiredLocation: 'mars_orbit', enabledServices: ['svc_ai_mars'],
    realBuildSeconds: 2700, resourceCost: { rare_earth: 50, titanium: 40, iron: 100 } }, // 45 min

  // ─── SOLAR FARMS ──────────────────────────────────────────────────────
  { id: 'solar_farm_orbital', name: 'Orbital Solar Farm', category: 'solar_farm', tier: 1,
    description: 'Large solar array providing power to orbital facilities.',
    baseCost: 100_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 500_000,
    requiredResearch: ['triple_junction'], requiredLocation: 'leo', enabledServices: ['svc_power_orbital'],
    realBuildSeconds: 300 }, // 5 min
  { id: 'solar_farm_lunar', name: 'Lunar Solar Farm', category: 'solar_farm', tier: 2,
    description: 'Solar arrays on the lunar surface. Powers mining and fabrication.',
    baseCost: 400_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 800_000,
    requiredResearch: ['triple_junction'], requiredLocation: 'lunar_surface', enabledServices: ['svc_power_lunar'],
    realBuildSeconds: 900 }, // 15 min

  // ─── MINING ───────────────────────────────────────────────────────────
  { id: 'mining_lunar_ice', name: 'Lunar Ice Mine', category: 'mining_enterprise', tier: 2,
    description: 'Extract water ice from permanently shadowed craters.',
    baseCost: 1_500_000_000, buildTimeMonths: 18, maintenanceCostPerMonth: 3_000_000,
    requiredResearch: ['resource_prospecting'], requiredLocation: 'lunar_surface', enabledServices: ['svc_mining_lunar'],
    realBuildSeconds: 1200, resourceCost: { iron: 80, aluminum: 40, titanium: 15 } }, // 20 min
  { id: 'mining_mars', name: 'Mars Mining Operation', category: 'mining_enterprise', tier: 3,
    description: 'Extract metals and water from Martian regolith.',
    baseCost: 5_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['regolith_processing'], requiredLocation: 'mars_surface', enabledServices: ['svc_mining_mars'],
    realBuildSeconds: 2700, resourceCost: { iron: 200, titanium: 80, aluminum: 100, rare_earth: 20 } }, // 45 min
  { id: 'mining_asteroid', name: 'Asteroid Mining Rig', category: 'mining_enterprise', tier: 3,
    description: 'Capture and process metallic asteroids.',
    baseCost: 8_000_000_000, buildTimeMonths: 30, maintenanceCostPerMonth: 10_000_000,
    requiredResearch: ['asteroid_capture'], requiredLocation: 'asteroid_belt', enabledServices: ['svc_mining_asteroid'],
    realBuildSeconds: 3600, resourceCost: { titanium: 100, iron: 300, rare_earth: 30 } }, // 1 hr
  { id: 'mining_europa', name: 'Europa Ice Drill', category: 'mining_enterprise', tier: 4,
    description: 'Drill through Europa\'s ice shell for subsurface ocean resources.',
    baseCost: 30_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 20_000_000,
    requiredResearch: ['deep_drilling'], requiredLocation: 'jupiter_system', enabledServices: ['svc_mining_europa'],
    realBuildSeconds: 7200, resourceCost: { titanium: 200, rare_earth: 80, platinum_group: 20, exotic_materials: 5 } }, // 2 hr
  { id: 'mining_titan', name: 'Titan Hydrocarbon Harvester', category: 'mining_enterprise', tier: 4,
    description: 'Harvest methane and ethane from Titan\'s lakes.',
    baseCost: 40_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 25_000_000,
    requiredResearch: ['deep_drilling'], requiredLocation: 'saturn_system', enabledServices: ['svc_mining_titan'],
    realBuildSeconds: 7200, resourceCost: { titanium: 250, rare_earth: 100, platinum_group: 30 } }, // 2 hr

  // ─── FABRICATION ──────────────────────────────────────────────────────
  { id: 'fabrication_orbital', name: 'Orbital Fabrication Lab', category: 'fabrication_facility', tier: 2,
    description: 'Manufacture components in microgravity.',
    baseCost: 600_000_000, buildTimeMonths: 14, maintenanceCostPerMonth: 3_000_000,
    requiredResearch: ['orbital_assembly'], requiredLocation: 'leo', enabledServices: ['svc_fabrication_orbital'],
    realBuildSeconds: 900, resourceCost: { iron: 60, aluminum: 40, rare_earth: 10 } }, // 15 min
  { id: 'fabrication_lunar', name: 'Lunar Manufacturing Plant', category: 'fabrication_facility', tier: 2,
    description: 'Use lunar materials to build components on-site.',
    baseCost: 2_000_000_000, buildTimeMonths: 20, maintenanceCostPerMonth: 4_000_000,
    requiredResearch: ['orbital_assembly', 'regolith_processing'], requiredLocation: 'lunar_surface', enabledServices: ['svc_fabrication_lunar'],
    realBuildSeconds: 1200, resourceCost: { iron: 100, aluminum: 60, lunar_water: 30, titanium: 20 } }, // 20 min

  // ─── HABITATS ─────────────────────────────────────────────────────────
  { id: 'habitat_lunar', name: 'Lunar Habitat', category: 'space_station', tier: 2,
    description: 'Pressurized habitat on the lunar surface. 8-person capacity.',
    baseCost: 3_000_000_000, buildTimeMonths: 24, maintenanceCostPerMonth: 5_000_000,
    requiredResearch: ['modular_spacecraft', 'resource_prospecting'], requiredLocation: 'lunar_surface', enabledServices: ['svc_tourism_moon'],
    realBuildSeconds: 1500, resourceCost: { aluminum: 80, titanium: 30, lunar_water: 50, iron: 60 } }, // 25 min
  { id: 'habitat_mars', name: 'Mars Habitat', category: 'space_station', tier: 3,
    description: 'First permanent human settlement on Mars.',
    baseCost: 15_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 12_000_000,
    requiredResearch: ['interplanetary_cruisers', 'regolith_processing'], requiredLocation: 'mars_surface', enabledServices: ['svc_tourism_mars'],
    realBuildSeconds: 3600, resourceCost: { titanium: 120, aluminum: 150, iron: 200, mars_water: 50, rare_earth: 25 } }, // 1 hr

  // ─── GEO INFRASTRUCTURE ─────────────────────────────────────────────
  { id: 'solar_farm_geo', name: 'GEO Solar Power Platform', category: 'solar_farm', tier: 2,
    description: 'High-power solar farm in geostationary orbit for space-based solar power.',
    baseCost: 300_000_000, buildTimeMonths: 10, maintenanceCostPerMonth: 1_500_000,
    requiredResearch: ['triple_junction', 'high_power_comms'], requiredLocation: 'geo', enabledServices: ['svc_navigation'],
    realBuildSeconds: 600, resourceCost: { aluminum: 40, rare_earth: 10 } }, // 10 min

  // ─── RELAY SATELLITES ───────────────────────────────────────────────
  { id: 'sat_lunar_relay', name: 'Lunar Relay Satellite', category: 'satellite', tier: 2,
    description: 'Communication relay for cislunar operations and debris tracking.',
    baseCost: 200_000_000, buildTimeMonths: 6, maintenanceCostPerMonth: 800_000,
    requiredResearch: ['reusable_boosters'], requiredLocation: 'lunar_orbit', enabledServices: ['svc_debris_removal', 'svc_space_insurance'],
    realBuildSeconds: 420, resourceCost: { aluminum: 15, rare_earth: 5 } }, // 7 min
  { id: 'sat_mars_relay', name: 'Mars Relay Satellite', category: 'satellite', tier: 3,
    description: 'Deep-space communications relay for Mars operations.',
    baseCost: 1_000_000_000, buildTimeMonths: 12, maintenanceCostPerMonth: 2_000_000,
    requiredResearch: ['super_heavy_lift', 'ion_drives'], requiredLocation: 'mars_orbit', enabledServices: ['svc_propellant_brokerage'],
    realBuildSeconds: 900, resourceCost: { titanium: 20, rare_earth: 10 } }, // 15 min

  // ─── MARS SURFACE INFRASTRUCTURE ────────────────────────────────────
  { id: 'fabrication_mars', name: 'Mars Manufacturing Plant', category: 'fabrication_facility', tier: 3,
    description: 'Manufacture components using Martian resources. Key to Mars self-sufficiency.',
    baseCost: 8_000_000_000, buildTimeMonths: 28, maintenanceCostPerMonth: 6_000_000,
    requiredResearch: ['orbital_assembly', 'regolith_processing'], requiredLocation: 'mars_surface', enabledServices: ['svc_propellant_depot'],
    realBuildSeconds: 2400, resourceCost: { titanium: 80, aluminum: 100, iron: 150, mars_water: 40 } }, // 40 min
  { id: 'solar_farm_mars', name: 'Mars Solar Farm', category: 'solar_farm', tier: 3,
    description: 'Large solar array on the Martian surface. Lower efficiency than Earth but essential.',
    baseCost: 2_000_000_000, buildTimeMonths: 14, maintenanceCostPerMonth: 2_000_000,
    requiredResearch: ['triple_junction', 'resource_prospecting'], requiredLocation: 'mars_surface', enabledServices: [],
    realBuildSeconds: 1200, resourceCost: { aluminum: 60, iron: 80, rare_earth: 15 } }, // 20 min

  // ─── ASTEROID BELT INFRASTRUCTURE ───────────────────────────────────
  { id: 'fabrication_asteroid', name: 'Asteroid Refinery', category: 'fabrication_facility', tier: 3,
    description: 'Process asteroid materials in-situ. Reduces transport costs dramatically.',
    baseCost: 12_000_000_000, buildTimeMonths: 30, maintenanceCostPerMonth: 8_000_000,
    requiredResearch: ['asteroid_capture', 'orbital_assembly'], requiredLocation: 'asteroid_belt', enabledServices: ['svc_asteroid_survey'],
    realBuildSeconds: 2700, resourceCost: { titanium: 100, iron: 200, platinum_group: 10, rare_earth: 30 } }, // 45 min
  { id: 'space_station_belt', name: 'Ceres Station', category: 'space_station', tier: 3,
    description: 'Deep-space outpost at Ceres. Hub for asteroid belt operations.',
    baseCost: 15_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 10_000_000,
    requiredResearch: ['asteroid_capture', 'modular_spacecraft'], requiredLocation: 'asteroid_belt', enabledServices: [],
    realBuildSeconds: 3600, resourceCost: { titanium: 150, aluminum: 200, iron: 300, rare_earth: 40 } }, // 1 hr

  // ─── JUPITER SYSTEM INFRASTRUCTURE ──────────────────────────────────
  { id: 'space_station_jupiter', name: 'Jovian Station', category: 'space_station', tier: 4,
    description: 'Orbital research platform in Jupiter system. Supports Europa operations.',
    baseCost: 50_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 30_000_000,
    requiredResearch: ['nuclear_thermal', 'interplanetary_cruisers'], requiredLocation: 'jupiter_system', enabledServices: [],
    realBuildSeconds: 7200, resourceCost: { titanium: 200, platinum_group: 25, rare_earth: 60, exotic_materials: 3 } }, // 2 hr
  { id: 'datacenter_jupiter', name: 'Jupiter Relay Hub', category: 'datacenter', tier: 4,
    description: 'Deep-space data relay and edge computing center for outer system.',
    baseCost: 20_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 15_000_000,
    requiredResearch: ['nuclear_thermal', 'edge_ai'], requiredLocation: 'jupiter_system', enabledServices: [],
    realBuildSeconds: 5400, resourceCost: { titanium: 100, rare_earth: 50, platinum_group: 15 } }, // 90 min

  // ─── SATURN SYSTEM INFRASTRUCTURE ───────────────────────────────────
  { id: 'space_station_saturn', name: 'Kronos Station', category: 'space_station', tier: 4,
    description: 'Saturn orbital platform. Staging for Titan and Enceladus operations.',
    baseCost: 80_000_000_000, buildTimeMonths: 60, maintenanceCostPerMonth: 40_000_000,
    requiredResearch: ['nuclear_thermal', 'interplanetary_cruisers', 'deep_drilling'], requiredLocation: 'saturn_system', enabledServices: [],
    realBuildSeconds: 7200, resourceCost: { titanium: 300, platinum_group: 40, rare_earth: 80, exotic_materials: 5 } }, // 2 hr
  { id: 'fabrication_titan', name: 'Titan Chemical Plant', category: 'fabrication_facility', tier: 4,
    description: 'Process Titan hydrocarbons into rocket fuel and industrial chemicals.',
    baseCost: 25_000_000_000, buildTimeMonths: 36, maintenanceCostPerMonth: 18_000_000,
    requiredResearch: ['deep_drilling', 'orbital_assembly'], requiredLocation: 'saturn_system', enabledServices: [],
    realBuildSeconds: 5400, resourceCost: { titanium: 150, rare_earth: 60, platinum_group: 20, methane: 100 } }, // 90 min

  // ─── OUTER SYSTEM INFRASTRUCTURE ────────────────────────────────────
  { id: 'outpost_outer', name: 'Deep Space Outpost', category: 'space_station', tier: 5,
    description: 'Humanity\'s farthest permanent settlement. Research and exploration hub.',
    baseCost: 200_000_000_000, buildTimeMonths: 96, maintenanceCostPerMonth: 60_000_000,
    requiredResearch: ['fusion_drive', 'generation_ships'], requiredLocation: 'outer_system', enabledServices: [],
    realBuildSeconds: 14400, resourceCost: { titanium: 500, platinum_group: 100, exotic_materials: 20, helium3: 10 } }, // 4 hr
  { id: 'mining_kuiper', name: 'Kuiper Belt Mining Platform', category: 'mining_enterprise', tier: 5,
    description: 'Extract exotic materials and volatiles from Kuiper Belt objects.',
    baseCost: 150_000_000_000, buildTimeMonths: 72, maintenanceCostPerMonth: 50_000_000,
    requiredResearch: ['fusion_drive', 'automated_mining_fleet'], requiredLocation: 'outer_system', enabledServices: [],
    realBuildSeconds: 10800, resourceCost: { titanium: 400, platinum_group: 80, exotic_materials: 15 } }, // 3 hr
  { id: 'deep_space_relay', name: 'Deep Space Communication Relay', category: 'satellite', tier: 5,
    description: 'Long-range communication relay for outer system operations.',
    baseCost: 50_000_000_000, buildTimeMonths: 48, maintenanceCostPerMonth: 20_000_000,
    requiredResearch: ['fusion_drive'], requiredLocation: 'outer_system', enabledServices: [],
    realBuildSeconds: 7200, resourceCost: { titanium: 200, rare_earth: 80, exotic_materials: 10 } }, // 2 hr
];

export const BUILDING_MAP = new Map(BUILDINGS.map(b => [b.id, b]));

/** Scale build time for duplicates: 1.3x per existing instance at same location */
export function scaledBuildTime(baseSec: number, countAtLocation: number): number {
  return Math.round(baseSec * Math.pow(1.3, countAtLocation));
}
