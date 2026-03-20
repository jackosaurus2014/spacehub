// ─── Space Tycoon: Service Definitions (Revenue Generators) ─────────────────

import type { ServiceDefinition } from './types';

export const SERVICES: ServiceDefinition[] = [
  // ─── LAUNCH SERVICES ──────────────────────────────────────────────────
  { id: 'svc_launch_small', name: 'Small Launch Services', type: 'launch_payload', tier: 1,
    description: 'Offer payload capacity on small rockets (up to 5 tons to LEO).',
    revenuePerMonth: 8_000_000, operatingCostPerMonth: 3_000_000,
    requiredBuildings: ['launch_pad_small'], requiredResearch: [] },
  { id: 'svc_launch_medium', name: 'Medium Launch Services', type: 'launch_payload', tier: 2,
    description: 'Reusable medium-lift launches for commercial and government payloads.',
    revenuePerMonth: 25_000_000, operatingCostPerMonth: 8_000_000,
    requiredBuildings: ['launch_pad_medium'], requiredResearch: ['reusable_boosters'] },
  { id: 'svc_launch_heavy', name: 'Heavy Launch Services', type: 'launch_payload', tier: 3,
    description: 'Super-heavy launches for space stations, interplanetary missions.',
    revenuePerMonth: 80_000_000, operatingCostPerMonth: 25_000_000,
    requiredBuildings: ['launch_pad_heavy'], requiredResearch: ['super_heavy_lift'] },

  // ─── TELECOM SERVICES ─────────────────────────────────────────────────
  { id: 'svc_telecom_leo', name: 'LEO Broadband', type: 'telecom_service', tier: 1,
    description: 'Low-latency internet service from LEO constellation.',
    revenuePerMonth: 5_000_000, operatingCostPerMonth: 1_500_000,
    requiredBuildings: ['sat_telecom'], requiredResearch: [] },
  { id: 'svc_telecom_geo', name: 'GEO Communications', type: 'telecom_service', tier: 1,
    description: 'High-throughput broadcast and enterprise comms from GEO.',
    revenuePerMonth: 12_000_000, operatingCostPerMonth: 3_000_000,
    requiredBuildings: ['sat_telecom_geo'], requiredResearch: [] },

  // ─── SENSOR SERVICES ──────────────────────────────────────────────────
  { id: 'svc_sensor_leo', name: 'LEO Earth Observation', type: 'sensor_service', tier: 1,
    description: 'Sell satellite imagery and analytics data.',
    revenuePerMonth: 4_000_000, operatingCostPerMonth: 1_000_000,
    requiredBuildings: ['sat_sensor'], requiredResearch: ['high_res_optical'] },
  { id: 'svc_sensor_geo', name: 'GEO Persistent Monitoring', type: 'sensor_service', tier: 2,
    description: 'Continuous monitoring of specific regions from GEO.',
    revenuePerMonth: 10_000_000, operatingCostPerMonth: 3_000_000,
    requiredBuildings: ['sat_sensor_geo'], requiredResearch: ['high_res_optical'] },

  // ─── AI DATACENTER ────────────────────────────────────────────────────
  { id: 'svc_ai_datacenter', name: 'Orbital AI Compute', type: 'ai_datacenter', tier: 2,
    description: 'Sell AI inference and training compute from orbital data centers.',
    revenuePerMonth: 15_000_000, operatingCostPerMonth: 5_000_000,
    requiredBuildings: ['datacenter_orbital'], requiredResearch: ['rad_hard_processors'] },
  { id: 'svc_ai_mars', name: 'Mars Data Processing', type: 'ai_datacenter', tier: 3,
    description: 'Process Mars surface data and relay analytics to Earth.',
    revenuePerMonth: 30_000_000, operatingCostPerMonth: 10_000_000,
    requiredBuildings: ['datacenter_mars_orbit'], requiredResearch: ['edge_ai'] },

  // ─── MINING OUTPUT ────────────────────────────────────────────────────
  { id: 'svc_mining_lunar', name: 'Lunar Water Sales', type: 'mining_output', tier: 2,
    description: 'Sell water and propellant derived from lunar ice.',
    revenuePerMonth: 20_000_000, operatingCostPerMonth: 8_000_000,
    requiredBuildings: ['mining_lunar_ice'], requiredResearch: ['resource_prospecting'] },
  { id: 'svc_mining_mars', name: 'Mars Resource Extraction', type: 'mining_output', tier: 3,
    description: 'Metals, water, and construction materials from Mars.',
    revenuePerMonth: 40_000_000, operatingCostPerMonth: 15_000_000,
    requiredBuildings: ['mining_mars'], requiredResearch: ['regolith_processing'] },
  { id: 'svc_mining_asteroid', name: 'Asteroid Metals', type: 'mining_output', tier: 3,
    description: 'Platinum group metals and rare elements from asteroids.',
    revenuePerMonth: 60_000_000, operatingCostPerMonth: 20_000_000,
    requiredBuildings: ['mining_asteroid'], requiredResearch: ['asteroid_capture'] },
  { id: 'svc_mining_europa', name: 'Europa Subsurface Resources', type: 'mining_output', tier: 4,
    description: 'Exotic materials from Europa\'s subsurface ocean.',
    revenuePerMonth: 150_000_000, operatingCostPerMonth: 50_000_000,
    requiredBuildings: ['mining_europa'], requiredResearch: ['deep_drilling'] },
  { id: 'svc_mining_titan', name: 'Titan Hydrocarbon Exports', type: 'mining_output', tier: 4,
    description: 'Methane and ethane from Titan for fuel and chemical production.',
    revenuePerMonth: 200_000_000, operatingCostPerMonth: 60_000_000,
    requiredBuildings: ['mining_titan'], requiredResearch: ['deep_drilling'] },

  // ─── TOURISM ──────────────────────────────────────────────────────────
  { id: 'svc_tourism_leo', name: 'LEO Space Tourism', type: 'tourism', tier: 1,
    description: 'Short-duration stays on your orbital outpost.',
    revenuePerMonth: 8_000_000, operatingCostPerMonth: 4_000_000,
    requiredBuildings: ['space_station_small'], requiredResearch: ['modular_spacecraft'] },
  { id: 'svc_tourism_moon', name: 'Lunar Tourism', type: 'tourism', tier: 2,
    description: 'Lunar surface excursions for wealthy tourists.',
    revenuePerMonth: 30_000_000, operatingCostPerMonth: 12_000_000,
    requiredBuildings: ['habitat_lunar'], requiredResearch: ['modular_spacecraft'] },
  { id: 'svc_tourism_mars', name: 'Mars Tourism', type: 'tourism', tier: 3,
    description: 'Multi-month Mars expedition packages.',
    revenuePerMonth: 100_000_000, operatingCostPerMonth: 40_000_000,
    requiredBuildings: ['habitat_mars'], requiredResearch: ['interplanetary_cruisers'] },

  // ─── FABRICATION ──────────────────────────────────────────────────────
  { id: 'svc_fabrication_orbital', name: 'Orbital Manufacturing', type: 'fabrication_output', tier: 2,
    description: 'Sell microgravity-manufactured components.',
    revenuePerMonth: 12_000_000, operatingCostPerMonth: 5_000_000,
    requiredBuildings: ['fabrication_orbital'], requiredResearch: ['orbital_assembly'] },
  { id: 'svc_fabrication_lunar', name: 'Lunar Manufacturing', type: 'fabrication_output', tier: 2,
    description: 'Build components from lunar materials for local use or export.',
    revenuePerMonth: 18_000_000, operatingCostPerMonth: 7_000_000,
    requiredBuildings: ['fabrication_lunar'], requiredResearch: ['orbital_assembly', 'regolith_processing'] },
];

export const SERVICE_MAP = new Map(SERVICES.map(s => [s.id, s]));
