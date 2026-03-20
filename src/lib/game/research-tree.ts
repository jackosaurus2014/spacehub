// ─── Space Tycoon: Research Tree ────────────────────────────────────────────

import type { ResearchDefinition } from './types';

/** Real-time research duration by tier: T1=10min, T2=30min, T3=90min, T4=4hr, T5=12hr */
const TIER_RESEARCH_SECONDS: Record<number, number> = {
  1: 600,     // 10 minutes
  2: 1800,    // 30 minutes
  3: 5400,    // 90 minutes
  4: 14400,   // 4 hours
  5: 43200,   // 12 hours
};

/** Resource costs by research tier (cumulative with money cost) */
const TIER_RESEARCH_RESOURCES: Record<number, Record<string, number>> = {
  1: {},  // Tier 1: money only
  2: {},  // Tier 2: money only
  3: { rare_earth: 15, titanium: 30 },
  4: { rare_earth: 40, titanium: 60, platinum_group: 10 },
  5: { rare_earth: 100, platinum_group: 30, exotic_materials: 5, helium3: 3 },
};

type RawResearch = Omit<ResearchDefinition, 'realResearchSeconds' | 'resourceCost'>;

const RAW_RESEARCH: RawResearch[] = [
  // ─── ROCKETRY ─────────────────────────────────────────────────────────
  { id: 'reusable_boosters', name: 'Reusable Boosters', category: 'rocketry', tier: 1,
    description: 'Land and refly first-stage boosters, reducing launch cost by 40%.',
    effect: '-40% launch cost, enables lunar missions',
    baseCostMoney: 200_000_000, baseTimeMonths: 12, prerequisites: [], unlocks: ['launch_pad_medium'] },
  { id: 'rapid_launch_cadence', name: 'Rapid Launch Cadence', category: 'rocketry', tier: 2,
    description: 'Turn boosters around in days instead of weeks.',
    effect: '-30% build time for rockets',
    baseCostMoney: 500_000_000, baseTimeMonths: 18, prerequisites: ['reusable_boosters'], unlocks: [] },
  { id: 'super_heavy_lift', name: 'Super Heavy Lift', category: 'rocketry', tier: 3,
    description: 'Build vehicles capable of 100+ tons to LEO.',
    effect: 'Enables Mars and asteroid belt missions',
    baseCostMoney: 2_000_000_000, baseTimeMonths: 24, prerequisites: ['rapid_launch_cadence'], unlocks: ['launch_pad_heavy'] },
  { id: 'nuclear_thermal', name: 'Nuclear Thermal Propulsion', category: 'rocketry', tier: 4,
    description: 'Nuclear reactors heating propellant for high-efficiency deep space travel.',
    effect: '-50% travel time to outer planets, enables Jupiter/Saturn',
    baseCostMoney: 15_000_000_000, baseTimeMonths: 36, prerequisites: ['super_heavy_lift'], unlocks: [] },
  { id: 'fusion_drive', name: 'Fusion Drive', category: 'rocketry', tier: 5,
    description: 'Sustained fusion reactions for ultimate propulsion efficiency.',
    effect: 'Enables outer system, -75% travel time everywhere',
    baseCostMoney: 100_000_000_000, baseTimeMonths: 60, prerequisites: ['nuclear_thermal'], unlocks: [] },

  // ─── SPACECRAFT DESIGN ────────────────────────────────────────────────
  { id: 'modular_spacecraft', name: 'Modular Spacecraft', category: 'spacecraft', tier: 1,
    description: 'Standardized docking ports and swappable modules.',
    effect: 'Enables space stations and orbital assembly',
    baseCostMoney: 150_000_000, baseTimeMonths: 10, prerequisites: [], unlocks: ['space_station_small'] },
  { id: 'autonomous_docking', name: 'Autonomous Docking', category: 'spacecraft', tier: 2,
    description: 'Automated rendezvous and docking without human operators.',
    effect: 'Enables asteroid capture, -20% station build time',
    baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['modular_spacecraft'], unlocks: [] },
  { id: 'interplanetary_cruisers', name: 'Interplanetary Cruisers', category: 'spacecraft', tier: 3,
    description: 'Large crewed vessels for multi-month deep space journeys.',
    effect: 'Enables Jupiter/Saturn crewed missions',
    baseCostMoney: 5_000_000_000, baseTimeMonths: 30, prerequisites: ['autonomous_docking'], unlocks: [] },
  { id: 'self_repair', name: 'Self-Repair Systems', category: 'spacecraft', tier: 4,
    description: 'Autonomous repair bots maintain spacecraft without human EVA.',
    effect: '-50% maintenance costs on all buildings',
    baseCostMoney: 10_000_000_000, baseTimeMonths: 36, prerequisites: ['interplanetary_cruisers'], unlocks: [] },
  { id: 'generation_ships', name: 'Generation Ships', category: 'spacecraft', tier: 5,
    description: 'Self-sustaining vessels for multi-decade voyages.',
    effect: 'Enables outer system colonization',
    baseCostMoney: 200_000_000_000, baseTimeMonths: 72, prerequisites: ['self_repair'], unlocks: [] },

  // ─── SENSORS ──────────────────────────────────────────────────────────
  { id: 'high_res_optical', name: 'High-Res Optical', category: 'sensors', tier: 1,
    description: 'Sub-meter optical imaging from orbit.',
    effect: '+50% sensor service revenue',
    baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: ['sat_sensor'] },
  { id: 'sar_imaging', name: 'Synthetic Aperture Radar', category: 'sensors', tier: 2,
    description: 'All-weather, day-night radar imaging.',
    effect: '+30% sensor revenue, new service tier',
    baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['high_res_optical'], unlocks: [] },
  { id: 'quantum_sensors', name: 'Quantum Sensors', category: 'sensors', tier: 4,
    description: 'Quantum-enhanced gravity and magnetic field measurements.',
    effect: '+100% sensor revenue, enables mining prospecting',
    baseCostMoney: 8_000_000_000, baseTimeMonths: 30, prerequisites: ['sar_imaging'], unlocks: [] },

  // ─── AI CHIP DESIGN ───────────────────────────────────────────────────
  { id: 'rad_hard_processors', name: 'Rad-Hardened Processors', category: 'ai_chips', tier: 1,
    description: 'Processors that survive the radiation environment of space.',
    effect: 'Enables orbital data centers',
    baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: [], unlocks: ['datacenter_orbital'] },
  { id: 'edge_ai', name: 'Edge AI Accelerators', category: 'ai_chips', tier: 2,
    description: 'On-board AI inference for autonomous satellite operations.',
    effect: '+40% datacenter revenue, -20% operating costs',
    baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['rad_hard_processors'], unlocks: [] },
  { id: 'neuromorphic_chips', name: 'Neuromorphic Chips', category: 'ai_chips', tier: 3,
    description: 'Brain-inspired computing for extreme energy efficiency.',
    effect: '+80% datacenter revenue',
    baseCostMoney: 3_000_000_000, baseTimeMonths: 24, prerequisites: ['edge_ai'], unlocks: [] },
  { id: 'quantum_coprocessors', name: 'Quantum Co-processors', category: 'ai_chips', tier: 4,
    description: 'Hybrid quantum-classical computing in orbit.',
    effect: '2x datacenter revenue',
    baseCostMoney: 20_000_000_000, baseTimeMonths: 36, prerequisites: ['neuromorphic_chips'], unlocks: [] },

  // ─── SATELLITE COMPONENTS ─────────────────────────────────────────────
  { id: 'improved_cooling', name: 'Improved Cooling Systems', category: 'satellite_components', tier: 1,
    description: 'Advanced thermal management for satellites.',
    effect: '-15% satellite maintenance costs',
    baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'high_power_comms', name: 'High-Power Communications', category: 'satellite_components', tier: 2,
    description: 'Higher throughput transponders and phased array antennas.',
    effect: '+50% telecom service revenue',
    baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: ['improved_cooling'], unlocks: [] },
  { id: 'compact_power', name: 'Compact Power Systems', category: 'satellite_components', tier: 3,
    description: 'Miniaturized reactors and advanced batteries.',
    effect: '-30% satellite build cost',
    baseCostMoney: 1_500_000_000, baseTimeMonths: 18, prerequisites: ['high_power_comms'], unlocks: [] },
  { id: 'swarm_intelligence', name: 'Swarm Intelligence', category: 'satellite_components', tier: 5,
    description: 'Satellites that coordinate as autonomous swarms.',
    effect: '3x sensor and telecom revenue from constellations',
    baseCostMoney: 50_000_000_000, baseTimeMonths: 48, prerequisites: ['compact_power', 'neuromorphic_chips'], unlocks: [] },

  // ─── SOLAR ARRAYS ─────────────────────────────────────────────────────
  { id: 'triple_junction', name: 'Triple-Junction Solar Cells', category: 'solar_arrays', tier: 1,
    description: '30%+ efficiency multi-junction photovoltaics.',
    effect: 'Enables solar farms, +20% power generation',
    baseCostMoney: 60_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: ['solar_farm_orbital'] },
  { id: 'perovskite_tandem', name: 'Perovskite-Si Tandem', category: 'solar_arrays', tier: 2,
    description: 'Next-gen solar cells combining perovskite and silicon layers.',
    effect: '+40% power, -30% solar farm cost',
    baseCostMoney: 200_000_000, baseTimeMonths: 12, prerequisites: ['triple_junction'], unlocks: [] },
  { id: 'beamed_power', name: 'Beamed Power Reception', category: 'solar_arrays', tier: 4,
    description: 'Receive energy beamed from solar collection stations.',
    effect: 'Enables deep-space operations without local solar',
    baseCostMoney: 12_000_000_000, baseTimeMonths: 30, prerequisites: ['perovskite_tandem'], unlocks: [] },

  // ─── MINING TECHNOLOGY ────────────────────────────────────────────────
  { id: 'resource_prospecting', name: 'Resource Prospecting', category: 'mining', tier: 1,
    description: 'Survey and identify extractable resources on celestial bodies.',
    effect: 'Enables lunar and Mars mining',
    baseCostMoney: 150_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: ['mining_lunar_ice'] },
  { id: 'regolith_processing', name: 'Regolith Processing', category: 'mining', tier: 2,
    description: 'Extract water, oxygen, and metals from lunar/Mars regolith.',
    effect: '+60% mining output',
    baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['resource_prospecting'], unlocks: [] },
  { id: 'asteroid_capture', name: 'Asteroid Capture', category: 'mining', tier: 3,
    description: 'Redirect small asteroids into stable orbits for mining.',
    effect: 'Enables asteroid belt mining',
    baseCostMoney: 3_000_000_000, baseTimeMonths: 24, prerequisites: ['regolith_processing', 'autonomous_docking'], unlocks: ['mining_asteroid'] },
  { id: 'deep_drilling', name: 'Deep Drilling', category: 'mining', tier: 4,
    description: 'Drill through ice and rock on moons for subsurface resources.',
    effect: '2x mining revenue, enables Titan/Europa mining',
    baseCostMoney: 8_000_000_000, baseTimeMonths: 30, prerequisites: ['asteroid_capture'], unlocks: ['mining_europa', 'mining_titan'] },
  { id: 'automated_mining_fleet', name: 'Automated Mining Fleet', category: 'mining', tier: 5,
    description: 'Self-replicating mining robots that expand operations autonomously.',
    effect: '5x mining revenue, autonomous expansion',
    baseCostMoney: 80_000_000_000, baseTimeMonths: 48, prerequisites: ['deep_drilling', 'swarm_intelligence'], unlocks: [] },

  // ─── SPACE INFRASTRUCTURE ─────────────────────────────────────────────
  { id: 'orbital_assembly', name: 'Orbital Assembly', category: 'infrastructure', tier: 1,
    description: 'Build structures in orbit from delivered components.',
    effect: 'Enables fabrication facilities',
    baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['modular_spacecraft'], unlocks: ['fabrication_orbital'] },
  { id: 'rotating_habitats', name: 'Rotating Habitats', category: 'infrastructure', tier: 3,
    description: 'Artificial gravity through rotation. Enables long-term habitation.',
    effect: '+100% station capacity, enables tourism',
    baseCostMoney: 5_000_000_000, baseTimeMonths: 30, prerequisites: ['orbital_assembly'], unlocks: [] },
  { id: 'mega_structures', name: 'Mega-Structures', category: 'infrastructure', tier: 4,
    description: 'O\'Neill cylinders and large-scale orbital habitats.',
    effect: '3x station capacity, unlocks Tier 5 buildings',
    baseCostMoney: 50_000_000_000, baseTimeMonths: 48, prerequisites: ['rotating_habitats'], unlocks: [] },

  // ─── PROPULSION ───────────────────────────────────────────────────────
  { id: 'ion_drives', name: 'Ion Drives', category: 'propulsion', tier: 1,
    description: 'High-efficiency electric propulsion for long-duration missions.',
    effect: '-30% travel time, enables Mars missions',
    baseCostMoney: 120_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'hall_thrusters', name: 'Hall-Effect Thrusters', category: 'propulsion', tier: 2,
    description: 'Higher-thrust electric propulsion for station-keeping and transfers.',
    effect: '-20% satellite maintenance, better orbit control',
    baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['ion_drives'], unlocks: [] },
  { id: 'vasimr', name: 'VASIMR Engines', category: 'propulsion', tier: 3,
    description: 'Variable Specific Impulse Magnetoplasma Rocket for flexible missions.',
    effect: '-40% travel time to Mars and asteroids',
    baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['hall_thrusters'], unlocks: [] },
  { id: 'solar_sails_adv', name: 'Advanced Solar Sails', category: 'propulsion', tier: 4,
    description: 'Laser-boosted solar sails for propellant-free travel.',
    effect: 'Zero-fuel transit to inner system destinations',
    baseCostMoney: 6_000_000_000, baseTimeMonths: 24, prerequisites: ['vasimr'], unlocks: [] },
  { id: 'antimatter_propulsion', name: 'Antimatter Propulsion', category: 'propulsion', tier: 5,
    description: 'The ultimate propulsion technology. Matter-antimatter annihilation.',
    effect: 'Enables interstellar precursor missions',
    baseCostMoney: 500_000_000_000, baseTimeMonths: 72, prerequisites: ['solar_sails_adv', 'fusion_drive'], unlocks: [] },
];

// Apply real-time durations and resource costs from tier mapping
export const RESEARCH: ResearchDefinition[] = RAW_RESEARCH.map(r => {
  const resCost = TIER_RESEARCH_RESOURCES[r.tier] || {};
  return {
    ...r,
    realResearchSeconds: TIER_RESEARCH_SECONDS[r.tier] || 600,
    resourceCost: Object.keys(resCost).length > 0 ? resCost : undefined,
  };
});

export const RESEARCH_MAP = new Map(RESEARCH.map(r => [r.id, r]));

export const RESEARCH_CATEGORIES = [
  { id: 'rocketry', name: 'Rocketry', icon: '🚀' },
  { id: 'spacecraft', name: 'Spacecraft Design', icon: '🛸' },
  { id: 'sensors', name: 'Sensors', icon: '📡' },
  { id: 'ai_chips', name: 'AI Chip Design', icon: '🧠' },
  { id: 'satellite_components', name: 'Satellite Components', icon: '🛰️' },
  { id: 'solar_arrays', name: 'Solar Arrays', icon: '☀️' },
  { id: 'mining', name: 'Mining Tech', icon: '⛏️' },
  { id: 'infrastructure', name: 'Infrastructure', icon: '🏗️' },
  { id: 'propulsion', name: 'Propulsion', icon: '💨' },
] as const;
