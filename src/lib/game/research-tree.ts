// ─── Space Tycoon: Research Tree (272 Researches) ───────────────────────────
// 254 base researches (W1 pass) + 18 from Waves W3+W10 (4X_BASELINE Part 2a
// Op4/Op5): 4 new doctrine-pair techs (+2 existing techs re-pointed into a
// 3rd doctrine pair, not counted twice), 6 repeatable programs, 8 rare
// techs — 272 total across 17 categories and 5 tiers. Every tech has
// hand-authored effects[] (see EFFECTS_BY_ID) — the flavor-keyword parser
// below remains only as a fallback for future/legacy content that lacks
// authored effects.
// Each research has realistic costs, prerequisites, and meaningful gameplay effects.

import type { ResearchDefinition, ResearchEffect, ResearchEffectType } from './types';
// Re-exported for backward compatibility — these were previously defined
// locally in this file; they now live in types.ts (ResearchDefinition.effects
// needs the type, and types.ts must not import from research-tree.ts).
export type { ResearchEffect, ResearchEffectType } from './types';

/** Real-time research duration by tier */
const TIER_RESEARCH_SECONDS: Record<number, number> = {
  1: 600,     // 10 minutes
  2: 1800,    // 30 minutes
  3: 5400,    // 90 minutes
  4: 14400,   // 4 hours
  5: 43200,   // 12 hours
};

/** Resource costs by tier */
const TIER_RESEARCH_RESOURCES: Record<number, Record<string, number>> = {
  1: {},
  2: {},
  3: { rare_earth: 15, titanium: 30 },
  4: { rare_earth: 40, titanium: 60, platinum_group: 10 },
  5: { rare_earth: 100, platinum_group: 30, exotic_materials: 5, helium3: 3 },
};

type RawResearch = Omit<ResearchDefinition, 'realResearchSeconds' | 'resourceCost'>;

const RAW_RESEARCH: RawResearch[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ROCKETRY (15 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'reusable_boosters', name: 'Reusable Boosters', category: 'rocketry', tier: 1, description: 'Land and refly first-stage boosters.', effect: '-30% launch cost', baseCostMoney: 200_000_000, baseTimeMonths: 12, prerequisites: [], unlocks: ['launch_pad_medium'] },
  { id: 'rapid_launch_cadence', name: 'Rapid Launch Cadence', category: 'rocketry', tier: 2, description: 'Turn boosters around in days.', effect: '-30% build time for rockets', baseCostMoney: 500_000_000, baseTimeMonths: 18, prerequisites: ['reusable_boosters'], unlocks: [] },
  { id: 'methane_engines', name: 'Methane-LOX Engines', category: 'rocketry', tier: 2, description: 'Full-flow staged combustion with methane.', effect: '+25% engine thrust-to-weight', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['reusable_boosters'], unlocks: [] },
  { id: 'super_heavy_lift', name: 'Super Heavy Lift', category: 'rocketry', tier: 3, description: '100+ ton payload to LEO.', effect: 'Enables Mars and asteroid missions', baseCostMoney: 2_000_000_000, baseTimeMonths: 24, prerequisites: ['rapid_launch_cadence'], unlocks: ['launch_pad_heavy'] },
  { id: 'fairing_recovery', name: 'Fairing Recovery', category: 'rocketry', tier: 2, description: 'Recover and reuse payload fairings.', effect: '-15% per-launch cost', baseCostMoney: 300_000_000, baseTimeMonths: 10, prerequisites: ['reusable_boosters'], unlocks: [] },
  { id: 'orbital_refueling', name: 'Orbital Refueling', category: 'rocketry', tier: 3, description: 'Refuel spacecraft in orbit from tanker vehicles.', effect: 'Enables deep space with smaller rockets', baseCostMoney: 1_500_000_000, baseTimeMonths: 20, prerequisites: ['super_heavy_lift'], unlocks: [] },
  { id: 'nuclear_thermal', name: 'Nuclear Thermal Propulsion', category: 'rocketry', tier: 4, description: 'Nuclear reactor-heated propellant — NTR doctrine: thrust now. W3 doctrine gate (4X_BASELINE Op4 #1, "NTR-first vs NEP-first"): mutually exclusive with Nuclear Electric Propulsion. Choosing NTR keeps the fusion_drive -> jump_drive interstellar chain open immediately; choosing NEP first locks this until a 2x-cost/6-month-retool override.', effect: '-30% outer planet travel time', baseCostMoney: 15_000_000_000, baseTimeMonths: 36, prerequisites: ['super_heavy_lift'], unlocks: [], excludes: ['nuclear_electric'], doctrineGroup: 'propulsion_doctrine' },
  { id: 'launch_abort_systems', name: 'Launch Abort Systems', category: 'rocketry', tier: 1, description: 'Crew escape during launch failure.', effect: 'Enables crewed launches, +20% safety', baseCostMoney: 150_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'propellant_depots', name: 'Propellant Depot Design', category: 'rocketry', tier: 3, description: 'Long-term fuel storage in orbit.', effect: '-30% fuel costs for deep space', baseCostMoney: 2_500_000_000, baseTimeMonths: 22, prerequisites: ['orbital_refueling'], unlocks: [] },
  { id: 'mass_driver', name: 'Electromagnetic Mass Driver', category: 'rocketry', tier: 4, description: 'Launch cargo from Moon/Mars without rockets.', effect: '$0 marginal launch cost from surfaces', baseCostMoney: 20_000_000_000, baseTimeMonths: 40, prerequisites: ['propellant_depots'], unlocks: [] },
  { id: 'space_elevator_cable', name: 'Space Elevator Materials', category: 'rocketry', tier: 5, description: 'Carbon nanotube ribbon for orbital elevator.', effect: '-30% Earth-to-orbit cost (stepping-stone toward full elevator economics)', baseCostMoney: 100_000_000_000, baseTimeMonths: 60, prerequisites: ['mass_driver'], unlocks: [] },
  { id: 'fusion_drive', name: 'Fusion Drive', category: 'rocketry', tier: 5, description: 'Sustained fusion for propulsion.', effect: '-30% travel time everywhere', baseCostMoney: 100_000_000_000, baseTimeMonths: 60, prerequisites: ['nuclear_thermal'], unlocks: [] },
  { id: 'rotating_detonation', name: 'Rotating Detonation Engine', category: 'rocketry', tier: 3, description: 'Pressure gain combustion cycle.', effect: '+30% fuel efficiency', baseCostMoney: 1_800_000_000, baseTimeMonths: 18, prerequisites: ['methane_engines'], unlocks: [] },
  { id: 'metallic_hydrogen', name: 'Metallic Hydrogen Propellant', category: 'rocketry', tier: 5, description: 'Theoretical ultra-dense propellant — metastability at ambient pressure has never been demonstrated; treat as a capstone extrapolation, not near-term engineering.', effect: '+30% specific impulse (theoretical; metastability unproven)', baseCostMoney: 80_000_000_000, baseTimeMonths: 48, prerequisites: ['fusion_drive'], unlocks: [] },
  { id: 'launch_site_optimization', name: 'Launch Site Optimization', category: 'rocketry', tier: 1, description: 'Weather prediction and pad turnaround improvements.', effect: '+20% launch success rate', baseCostMoney: 100_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACECRAFT DESIGN (18 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'modular_spacecraft', name: 'Modular Spacecraft', category: 'spacecraft', tier: 1, description: 'Standardized docking ports and modules.', effect: 'Enables space stations', baseCostMoney: 150_000_000, baseTimeMonths: 10, prerequisites: [], unlocks: ['space_station_small'] },
  { id: 'autonomous_docking', name: 'Autonomous Docking', category: 'spacecraft', tier: 2, description: 'Automated rendezvous without human operators.', effect: '-20% station build time', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['modular_spacecraft'], unlocks: [] },
  { id: 'life_support_recycling', name: 'Closed-Loop Life Support', category: 'spacecraft', tier: 2, description: '95% water and air recycling.', effect: '-30% habitat maintenance', baseCostMoney: 350_000_000, baseTimeMonths: 16, prerequisites: ['modular_spacecraft'], unlocks: [] },
  { id: 'radiation_shielding', name: 'Active Radiation Shielding', category: 'spacecraft', tier: 3, description: 'Magnetic field generators for crew protection.', effect: 'Enables deep space crewed missions', baseCostMoney: 3_000_000_000, baseTimeMonths: 24, prerequisites: ['life_support_recycling'], unlocks: [] },
  { id: 'interplanetary_cruisers', name: 'Interplanetary Cruisers', category: 'spacecraft', tier: 3, description: 'Large crewed vessels for deep space.', effect: 'Enables Jupiter/Saturn missions', baseCostMoney: 5_000_000_000, baseTimeMonths: 30, prerequisites: ['autonomous_docking', 'radiation_shielding'], unlocks: [] },
  { id: 'self_repair', name: 'Self-Repair Systems', category: 'spacecraft', tier: 4, description: 'Autonomous repair robots.', effect: '-30% maintenance costs', baseCostMoney: 10_000_000_000, baseTimeMonths: 36, prerequisites: ['interplanetary_cruisers'], unlocks: [] },
  { id: 'generation_ships', name: 'Generation Ships', category: 'spacecraft', tier: 5, description: 'Self-sustaining vessels for decade-long voyages.', effect: 'Enables outer system colonization', baseCostMoney: 200_000_000_000, baseTimeMonths: 72, prerequisites: ['self_repair'], unlocks: [] },
  { id: 'hull_composites', name: 'Advanced Hull Composites', category: 'spacecraft', tier: 1, description: 'Carbon fiber and ceramic matrix composites.', effect: '-15% spacecraft mass, -10% build cost', baseCostMoney: 120_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'cryo_hibernation', name: 'Crew Hibernation Systems', category: 'spacecraft', tier: 4, description: 'Torpor-inducing systems for long voyages.', effect: '-30% life support costs on long missions', baseCostMoney: 8_000_000_000, baseTimeMonths: 30, prerequisites: ['life_support_recycling'], unlocks: [] },
  { id: 'artificial_gravity', name: 'Centrifugal Gravity Modules', category: 'spacecraft', tier: 3, description: 'Rotating sections for artificial gravity.', effect: '+30% crew morale; enables long-term habitation', baseCostMoney: 4_000_000_000, baseTimeMonths: 26, prerequisites: ['modular_spacecraft'], unlocks: [] },
  { id: 'debris_avoidance', name: 'Autonomous Debris Avoidance', category: 'spacecraft', tier: 2, description: 'AI-driven collision avoidance system.', effect: '-30% debris damage risk', baseCostMoney: 250_000_000, baseTimeMonths: 12, prerequisites: ['autonomous_docking'], unlocks: [] },
  { id: 'spacecraft_armor', name: 'Whipple Shield Enhancement', category: 'spacecraft', tier: 2, description: 'Multi-layer micrometeorite protection.', effect: '+30% hull defense rating', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: ['hull_composites'], unlocks: [] },
  { id: 'emergency_escape', name: 'Emergency Escape Pods', category: 'spacecraft', tier: 1, description: 'Deployable escape capsules for stations.', effect: '+30% crew survival in emergencies', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'thermal_management_adv', name: 'Advanced Thermal Management', category: 'spacecraft', tier: 2, description: 'Variable-emissivity radiators and heat pipes.', effect: '-25% thermal system maintenance', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['hull_composites'], unlocks: [] },
  { id: 'modular_cargo', name: 'Standardized Cargo Containers', category: 'spacecraft', tier: 1, description: 'Universal cargo module for all ship types.', effect: '+20% cargo capacity all ships', baseCostMoney: 90_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'inflatable_habitats', name: 'Inflatable Habitat Modules', category: 'spacecraft', tier: 2, description: 'Expandable living space deployed on-orbit.', effect: '+30% habitat volume at reduced launch mass', baseCostMoney: 450_000_000, baseTimeMonths: 14, prerequisites: ['modular_spacecraft'], unlocks: [] },
  { id: 'nuclear_power_spacecraft', name: 'Spacecraft Nuclear Reactors', category: 'spacecraft', tier: 3, description: 'Compact fission reactors for spacecraft power.', effect: '+30% power generation vs solar. Unlocks deep-space nuclear reactors.', baseCostMoney: 6_000_000_000, baseTimeMonths: 28, prerequisites: ['radiation_shielding'], unlocks: ['nuclear_reactor_asteroid', 'nuclear_reactor_jupiter', 'nuclear_reactor_saturn'] },
  { id: 'laser_comm_relay', name: 'Laser Communication Relay', category: 'spacecraft', tier: 3, description: 'High-bandwidth optical links between spacecraft.', effect: '+30% data transmission rate', baseCostMoney: 2_000_000_000, baseTimeMonths: 18, prerequisites: ['autonomous_docking'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SENSORS & REMOTE SENSING (15 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'high_res_optical', name: 'High-Res Optical', category: 'sensors', tier: 1, description: 'Sub-meter imaging from orbit.', effect: '+30% sensor revenue', baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: ['sat_sensor'] },
  { id: 'sar_imaging', name: 'Synthetic Aperture Radar', category: 'sensors', tier: 2, description: 'All-weather day-night imaging.', effect: '+30% sensor revenue', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['high_res_optical'], unlocks: [] },
  { id: 'multispectral_imaging', name: 'Multispectral Imaging', category: 'sensors', tier: 2, description: 'Simultaneous imaging across multiple wavelengths.', effect: '+30% Earth observation value', baseCostMoney: 350_000_000, baseTimeMonths: 14, prerequisites: ['high_res_optical'], unlocks: [] },
  { id: 'hyperspectral', name: 'Hyperspectral Sensors', category: 'sensors', tier: 3, description: '200+ spectral bands for mineral identification.', effect: 'Enables remote mining prospecting', baseCostMoney: 1_500_000_000, baseTimeMonths: 20, prerequisites: ['multispectral_imaging'], unlocks: [] },
  { id: 'lidar_systems', name: 'Space-Based LiDAR', category: 'sensors', tier: 2, description: 'Laser altimetry for terrain mapping.', effect: '+25% survey probe discovery rate', baseCostMoney: 400_000_000, baseTimeMonths: 12, prerequisites: ['high_res_optical'], unlocks: [] },
  { id: 'quantum_sensors', name: 'Quantum Sensors', category: 'sensors', tier: 4, description: 'Quantum-enhanced gravity measurements.', effect: '+30% sensor revenue', baseCostMoney: 8_000_000_000, baseTimeMonths: 30, prerequisites: ['hyperspectral'], unlocks: [] },
  { id: 'gravity_gradiometer', name: 'Gravity Gradiometer', category: 'sensors', tier: 3, description: 'Precision gravity field mapping.', effect: 'Reveals subsurface resource deposits', baseCostMoney: 2_000_000_000, baseTimeMonths: 18, prerequisites: ['lidar_systems'], unlocks: [] },
  { id: 'magnetometer_array', name: 'Magnetometer Array', category: 'sensors', tier: 1, description: 'Measure planetary magnetic fields.', effect: '+20% mining survey accuracy', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'infrared_telescope', name: 'Infrared Space Telescope', category: 'sensors', tier: 3, description: 'Deep-space infrared observatory.', effect: '+30% asteroid detection range', baseCostMoney: 3_000_000_000, baseTimeMonths: 22, prerequisites: ['sar_imaging'], unlocks: [] },
  { id: 'neutrino_detector', name: 'Neutrino Detector', category: 'sensors', tier: 4, description: 'Detect neutrinos from stellar processes.', effect: 'Reveals deep subsurface composition', baseCostMoney: 12_000_000_000, baseTimeMonths: 36, prerequisites: ['quantum_sensors'], unlocks: [] },
  { id: 'space_weather_monitoring', name: 'Space Weather Monitoring', category: 'sensors', tier: 1, description: 'Solar wind and CME detection satellites.', effect: '+30% storm warning time', baseCostMoney: 120_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'rf_spectrum_sensing', name: 'RF Spectrum Sensing', category: 'sensors', tier: 2, description: 'Wide-band radio frequency monitoring.', effect: '+20% communication revenue', baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: ['magnetometer_array'], unlocks: [] },
  { id: 'autonomous_survey', name: 'Autonomous Survey AI', category: 'sensors', tier: 3, description: 'AI-driven autonomous survey missions.', effect: '-30% survey time, +30% discovery rate', baseCostMoney: 2_500_000_000, baseTimeMonths: 20, prerequisites: ['lidar_systems', 'sar_imaging'], unlocks: [] },
  { id: 'gravitational_wave_det', name: 'Gravitational Wave Detector', category: 'sensors', tier: 5, description: 'Space-based gravitational wave observatory.', effect: 'Ultimate sensing capability', baseCostMoney: 50_000_000_000, baseTimeMonths: 48, prerequisites: ['neutrino_detector'], unlocks: [] },
  { id: 'adaptive_optics', name: 'Adaptive Optics', category: 'sensors', tier: 2, description: 'Real-time atmospheric correction.', effect: '+30% ground resolution from orbit', baseCostMoney: 280_000_000, baseTimeMonths: 10, prerequisites: ['high_res_optical'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTING & AI (15 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'rad_hard_processors', name: 'Rad-Hardened Processors', category: 'ai_chips', tier: 1, description: 'Processors that survive space radiation.', effect: 'Enables orbital data centers', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: [], unlocks: ['datacenter_orbital'] },
  { id: 'edge_ai', name: 'Edge AI Accelerators', category: 'ai_chips', tier: 2, description: 'On-board AI inference.', effect: '+30% datacenter revenue', baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['rad_hard_processors'], unlocks: [] },
  { id: 'neuromorphic_chips', name: 'Neuromorphic Chips', category: 'ai_chips', tier: 3, description: 'Brain-inspired computing.', effect: '+30% datacenter revenue', baseCostMoney: 3_000_000_000, baseTimeMonths: 24, prerequisites: ['edge_ai'], unlocks: [] },
  { id: 'quantum_coprocessors', name: 'Quantum Co-processors', category: 'ai_chips', tier: 4, description: 'Hybrid quantum-classical computing.', effect: '+30% datacenter revenue', baseCostMoney: 20_000_000_000, baseTimeMonths: 36, prerequisites: ['neuromorphic_chips'], unlocks: [] },
  { id: 'fpga_reconfigurable', name: 'Reconfigurable FPGA Arrays', category: 'ai_chips', tier: 1, description: 'Field-programmable gate arrays for flexible computing.', effect: '+15% computing efficiency', baseCostMoney: 100_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'optical_computing', name: 'Optical Computing', category: 'ai_chips', tier: 3, description: 'Photonic processors for ultra-fast computation.', effect: '+30% data processing speed', baseCostMoney: 4_000_000_000, baseTimeMonths: 26, prerequisites: ['edge_ai'], unlocks: [] },
  { id: 'swarm_ai', name: 'Distributed Swarm AI', category: 'ai_chips', tier: 3, description: 'Coordinated AI across multiple spacecraft.', effect: '+30% fleet coordination efficiency', baseCostMoney: 2_500_000_000, baseTimeMonths: 22, prerequisites: ['edge_ai'], unlocks: [] },
  { id: 'predictive_maintenance', name: 'Predictive Maintenance AI', category: 'ai_chips', tier: 2, description: 'AI predicts equipment failures before they happen.', effect: '-25% maintenance costs', baseCostMoney: 350_000_000, baseTimeMonths: 12, prerequisites: ['rad_hard_processors'], unlocks: [] },
  { id: 'autonomous_ops', name: 'Autonomous Operations', category: 'ai_chips', tier: 2, description: 'Stations and mines run without human oversight.', effect: '-30% crew requirements', baseCostMoney: 600_000_000, baseTimeMonths: 16, prerequisites: ['edge_ai'], unlocks: [] },
  { id: 'quantum_ml', name: 'Quantum Machine Learning', category: 'ai_chips', tier: 4, description: 'Quantum-enhanced pattern recognition.', effect: '+30% research speed', baseCostMoney: 15_000_000_000, baseTimeMonths: 30, prerequisites: ['quantum_coprocessors'], unlocks: [] },
  { id: 'digital_twin', name: 'Digital Twin Simulation', category: 'ai_chips', tier: 2, description: 'Full digital replica of physical systems.', effect: '-20% build time, +15% success rate', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['rad_hard_processors'], unlocks: [] },
  { id: 'cybersecurity_adv', name: 'Advanced Space Cybersecurity', category: 'ai_chips', tier: 2, description: 'Quantum-safe encryption for space systems.', effect: '+20% defense rating', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['fpga_reconfigurable'], unlocks: [] },
  { id: 'data_compression', name: 'Neural Data Compression', category: 'ai_chips', tier: 1, description: 'AI-powered data compression for downlinks.', effect: '+30% data throughput', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'mission_planning_ai', name: 'AI Mission Planning', category: 'ai_chips', tier: 3, description: 'Optimal trajectory and resource planning.', effect: '-15% travel time, -10% fuel cost', baseCostMoney: 1_500_000_000, baseTimeMonths: 18, prerequisites: ['swarm_ai'], unlocks: [] },
  { id: 'parallel_research', name: 'Parallel Research Labs', category: 'ai_chips', tier: 3, description: 'Dedicated secondary research facility with independent teams.', effect: 'Unlocks a second simultaneous research queue', baseCostMoney: 3_000_000_000, baseTimeMonths: 18, prerequisites: ['neuromorphic_chips'], unlocks: ['research_queue_2'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SATELLITE SYSTEMS (15 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'improved_cooling', name: 'Improved Cooling Systems', category: 'satellite_components', tier: 1, description: 'Advanced thermal management.', effect: '-15% satellite maintenance', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'high_power_comms', name: 'High-Power Communications', category: 'satellite_components', tier: 2, description: 'Higher throughput transponders.', effect: '+30% telecom revenue', baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: ['improved_cooling'], unlocks: [] },
  { id: 'compact_power', name: 'Compact Power Systems', category: 'satellite_components', tier: 3, description: 'Miniaturized reactors and batteries.', effect: '-30% satellite build cost', baseCostMoney: 1_500_000_000, baseTimeMonths: 18, prerequisites: ['high_power_comms'], unlocks: [] },
  { id: 'swarm_intelligence', name: 'Swarm Intelligence', category: 'satellite_components', tier: 5, description: 'Satellites coordinate as swarms.', effect: '+30% sensor and telecom revenue', baseCostMoney: 50_000_000_000, baseTimeMonths: 48, prerequisites: ['compact_power', 'neuromorphic_chips'], unlocks: [] },
  { id: 'electric_propulsion_sat', name: 'Electric Propulsion for Satellites', category: 'satellite_components', tier: 1, description: 'Ion thrusters for station-keeping.', effect: '+30% satellite lifespan', baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'inter_satellite_links', name: 'Inter-Satellite Links', category: 'satellite_components', tier: 2, description: 'Laser links between constellation satellites.', effect: '+30% network throughput', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['high_power_comms'], unlocks: [] },
  { id: 'on_orbit_servicing', name: 'On-Orbit Servicing', category: 'satellite_components', tier: 3, description: 'Refuel and repair satellites in orbit.', effect: '+30% satellite lifespan', baseCostMoney: 3_000_000_000, baseTimeMonths: 22, prerequisites: ['autonomous_docking'], unlocks: [] },
  { id: 'mega_constellation', name: 'Mega-Constellation Management', category: 'satellite_components', tier: 3, description: 'Manage 1000+ satellite constellations.', effect: '+30% telecom capacity', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['inter_satellite_links', 'swarm_ai'], unlocks: [] },
  { id: 'v_band_comms', name: 'V-Band Communications', category: 'satellite_components', tier: 2, description: '40-75 GHz frequency utilization.', effect: '+30% bandwidth per satellite', baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['high_power_comms'], unlocks: [] },
  { id: 'flat_panel_antenna', name: 'Flat Panel User Terminals', category: 'satellite_components', tier: 2, description: 'Low-cost phased array ground terminals.', effect: '+30% subscriber base', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: ['improved_cooling'], unlocks: [] },
  { id: 'satellite_deorbit', name: 'Active Deorbit Systems', category: 'satellite_components', tier: 1, description: 'Controlled deorbit for debris prevention.', effect: '+15% regulatory compliance, -10% insurance', baseCostMoney: 60_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'software_defined_sat', name: 'Software-Defined Satellites', category: 'satellite_components', tier: 3, description: 'Reconfigure satellite capabilities via software.', effect: '+30% revenue flexibility', baseCostMoney: 2_500_000_000, baseTimeMonths: 20, prerequisites: ['edge_ai', 'v_band_comms'], unlocks: [] },
  { id: 'optical_intersatlinks', name: 'Optical Inter-Satellite Links', category: 'satellite_components', tier: 3, description: 'Laser communication between satellites.', effect: '+30% data relay capacity', baseCostMoney: 1_800_000_000, baseTimeMonths: 16, prerequisites: ['inter_satellite_links'], unlocks: [] },
  { id: 'satellite_formation', name: 'Formation Flying', category: 'satellite_components', tier: 4, description: 'Precise multi-satellite formation control.', effect: '+30% interferometry capability', baseCostMoney: 8_000_000_000, baseTimeMonths: 28, prerequisites: ['swarm_ai', 'mega_constellation'], unlocks: [] },
  { id: 'space_debris_cleanup', name: 'Active Debris Removal', category: 'satellite_components', tier: 3, description: 'Capture and deorbit defunct satellites.', effect: 'Enables debris removal contracts', baseCostMoney: 3_500_000_000, baseTimeMonths: 24, prerequisites: ['on_orbit_servicing'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY & POWER (14 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'triple_junction', name: 'Triple-Junction Solar Cells', category: 'solar_arrays', tier: 1, description: '30%+ efficiency photovoltaics.', effect: 'Enables solar farms, +20% power', baseCostMoney: 60_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: ['solar_farm_orbital'] },
  { id: 'perovskite_tandem', name: 'Perovskite-Si Tandem', category: 'solar_arrays', tier: 2, description: 'Next-gen tandem solar cells.', effect: '+30% power, -30% cost. Unlocks Lunar Orbital Solar Array.', baseCostMoney: 200_000_000, baseTimeMonths: 12, prerequisites: ['triple_junction'], unlocks: ['solar_array_lunar_orbit'] },
  { id: 'beamed_power', name: 'Beamed Power Reception', category: 'solar_arrays', tier: 4, description: 'Receive microwave-beamed energy.', effect: 'Enables deep-space power', baseCostMoney: 12_000_000_000, baseTimeMonths: 30, prerequisites: ['perovskite_tandem'], unlocks: [] },
  { id: 'concentrator_solar', name: 'Solar Concentrator Arrays', category: 'solar_arrays', tier: 2, description: 'Mirror-focused solar thermal power.', effect: '+30% power density', baseCostMoney: 300_000_000, baseTimeMonths: 10, prerequisites: ['triple_junction'], unlocks: [] },
  { id: 'solar_sail_power', name: 'Solar Sail Power Generation', category: 'solar_arrays', tier: 3, description: 'Thin-film solar sails that generate power.', effect: 'Combined propulsion + power', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['perovskite_tandem'], unlocks: [] },
  { id: 'fission_surface_power', name: 'Surface Fission Reactor', category: 'solar_arrays', tier: 3, description: 'Compact fission power for planetary surfaces.', effect: '+30% surface power generation. Unlocks nuclear reactors at all locations.', baseCostMoney: 4_000_000_000, baseTimeMonths: 24, prerequisites: ['concentrator_solar'], unlocks: ['nuclear_reactor_leo', 'nuclear_reactor_lunar', 'nuclear_reactor_mars_orbit', 'nuclear_reactor_mars_surface'] },
  { id: 'fusion_reactor', name: 'Fusion Power Reactor', category: 'solar_arrays', tier: 5, description: 'Controlled He-3 fusion for unlimited power.', effect: '+30% power, enables endgame operations', baseCostMoney: 80_000_000_000, baseTimeMonths: 48, prerequisites: ['fission_surface_power'], unlocks: [] },
  { id: 'battery_advanced', name: 'Advanced Energy Storage', category: 'solar_arrays', tier: 1, description: 'Solid-state batteries for space.', effect: '+30% energy storage density', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'wireless_power_transfer', name: 'Wireless Power Transfer', category: 'solar_arrays', tier: 3, description: 'Beam power between spacecraft.', effect: 'Enables power sharing', baseCostMoney: 2_500_000_000, baseTimeMonths: 18, prerequisites: ['concentrator_solar'], unlocks: [] },
  { id: 'rtg_enhanced', name: 'Enhanced RTGs', category: 'solar_arrays', tier: 2, description: 'Improved radioisotope thermoelectric generators.', effect: '+30% deep space power', baseCostMoney: 350_000_000, baseTimeMonths: 12, prerequisites: ['battery_advanced'], unlocks: [] },
  { id: 'energy_harvesting', name: 'Ambient Energy Harvesting', category: 'solar_arrays', tier: 2, description: 'Harvest thermal gradients and vibrations.', effect: '+10% station power at no cost', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: ['battery_advanced'], unlocks: [] },
  { id: 'superconducting_grid', name: 'Superconducting Power Grid', category: 'solar_arrays', tier: 4, description: 'Zero-loss power distribution.', effect: '-20% power losses, +15% efficiency', baseCostMoney: 10_000_000_000, baseTimeMonths: 28, prerequisites: ['wireless_power_transfer'], unlocks: [] },
  { id: 'antimatter_reactor', name: 'Antimatter Power Reactor', category: 'solar_arrays', tier: 5, description: 'Matter-antimatter annihilation power — Penning-trap microgram-scale antimatter production scaled by the 2147 industrial base (LORE.md Breakthrough era); explicitly lore-tech, not a near-term extrapolation of today\'s picogram-scale physics.', effect: 'Ultimate power source', baseCostMoney: 200_000_000_000, baseTimeMonths: 60, prerequisites: ['fusion_reactor'], unlocks: [] },
  { id: 'space_based_solar_power', name: 'Space-Based Solar Power', category: 'solar_arrays', tier: 4, description: 'Orbital power stations beaming to Earth.', effect: 'New revenue stream: power sales to Earth', baseCostMoney: 5_000_000_000, baseTimeMonths: 24, prerequisites: ['concentrator_solar', 'beamed_power'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // MINING & EXTRACTION (18 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'resource_prospecting', name: 'Resource Prospecting', category: 'mining', tier: 1, description: 'Survey for extractable resources.', effect: 'Enables lunar/Mars mining', baseCostMoney: 150_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: ['mining_lunar_ice'] },
  { id: 'regolith_processing', name: 'Regolith Processing', category: 'mining', tier: 2, description: 'Extract materials from regolith.', effect: '+30% mining output', baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['resource_prospecting'], unlocks: [] },
  { id: 'asteroid_capture', name: 'Asteroid Capture', category: 'mining', tier: 3, description: 'Redirect asteroids for mining.', effect: 'Enables asteroid belt mining', baseCostMoney: 3_000_000_000, baseTimeMonths: 24, prerequisites: ['regolith_processing', 'autonomous_docking'], unlocks: ['mining_asteroid'] },
  { id: 'deep_drilling', name: 'Deep Drilling', category: 'mining', tier: 4, description: 'Drill through ice and rock.', effect: '+30% mining revenue, Europa/Titan', baseCostMoney: 8_000_000_000, baseTimeMonths: 30, prerequisites: ['asteroid_capture'], unlocks: ['mining_europa', 'mining_titan'] },
  { id: 'automated_mining_fleet', name: 'Automated Mining Fleet', category: 'mining', tier: 5, description: 'Self-replicating mining robots.', effect: '+30% mining revenue', baseCostMoney: 80_000_000_000, baseTimeMonths: 48, prerequisites: ['deep_drilling', 'swarm_intelligence'], unlocks: [] },
  { id: 'isru_water', name: 'Water ISRU', category: 'mining', tier: 1, description: 'In-situ water extraction from ice.', effect: 'Produces propellant locally', baseCostMoney: 120_000_000, baseTimeMonths: 8, prerequisites: ['resource_prospecting'], unlocks: [] },
  { id: 'isru_oxygen', name: 'Oxygen Extraction', category: 'mining', tier: 2, description: 'Extract O2 from regolith oxides.', effect: '-30% life support imports', baseCostMoney: 400_000_000, baseTimeMonths: 12, prerequisites: ['isru_water'], unlocks: [] },
  { id: 'isru_metals', name: 'Metal Refining ISRU', category: 'mining', tier: 2, description: 'Refine iron, aluminum, titanium locally.', effect: '+30% construction material output', baseCostMoney: 600_000_000, baseTimeMonths: 16, prerequisites: ['regolith_processing'], unlocks: [] },
  { id: 'electrochemical_mining', name: 'Electrochemical Extraction', category: 'mining', tier: 3, description: 'Extract metals using electrolysis.', effect: '+30% precious metal yield', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['isru_metals'], unlocks: [] },
  { id: 'solar_thermal_mining', name: 'Solar Thermal Mining', category: 'mining', tier: 2, description: 'Use focused sunlight to extract volatiles.', effect: '+30% ice mining efficiency', baseCostMoney: 350_000_000, baseTimeMonths: 10, prerequisites: ['resource_prospecting'], unlocks: [] },
  { id: 'bioleaching', name: 'Space Bioleaching', category: 'mining', tier: 3, description: 'Use microbes to extract metals from ore.', effect: '+25% rare earth yield', baseCostMoney: 1_500_000_000, baseTimeMonths: 18, prerequisites: ['regolith_processing'], unlocks: [] },
  { id: 'plasma_processing', name: 'Plasma Ore Processing', category: 'mining', tier: 4, description: 'High-temperature plasma refining.', effect: '+30% refining efficiency', baseCostMoney: 10_000_000_000, baseTimeMonths: 30, prerequisites: ['electrochemical_mining'], unlocks: [] },
  { id: 'cryogenic_mining', name: 'Cryogenic Mining Systems', category: 'mining', tier: 4, description: 'Mining in extreme cold (Titan, Enceladus).', effect: 'Enables outer moon mining', baseCostMoney: 4_000_000_000, baseTimeMonths: 24, prerequisites: ['deep_drilling'], unlocks: [] },
  { id: 'subsurface_radar', name: 'Ground Penetrating Radar', category: 'mining', tier: 1, description: 'Map underground deposits from surface.', effect: '+30% deposit discovery rate', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'autonomous_excavation', name: 'Autonomous Excavation', category: 'mining', tier: 3, description: 'Self-driving mining equipment.', effect: '-30% mining labor costs', baseCostMoney: 2_500_000_000, baseTimeMonths: 22, prerequisites: ['regolith_processing', 'autonomous_ops'], unlocks: [] },
  { id: 'magnetic_separation', name: 'Magnetic Ore Separation', category: 'mining', tier: 2, description: 'Sort ore by magnetic properties.', effect: '+30% metal purity', baseCostMoney: 300_000_000, baseTimeMonths: 10, prerequisites: ['isru_metals'], unlocks: [] },
  { id: 'zero_g_refining', name: 'Zero-G Refining', category: 'mining', tier: 3, description: 'Purify materials in microgravity.', effect: '+30% product purity', baseCostMoney: 3_000_000_000, baseTimeMonths: 20, prerequisites: ['orbital_assembly'], unlocks: [] },
  // ─── Wave E3 "The Consumption Engine" new techs (docs/ECONOMY_PVP_2026-08.md §4.3) ───
  { id: 'sabatier_process', name: 'Sabatier Process', category: 'mining', tier: 2, description: 'Methanation reactors crack CH4 into launch-grade propellant — the methane route to rocket fuel on Mars and Titan.', effect: 'Unlocks the Sabatier methane→rocket fuel refining recipe; -10% freight fuel bills', baseCostMoney: 800_000_000, baseTimeMonths: 14, prerequisites: ['isru_water'], unlocks: [] },
  { id: 'self_replicating_miners', name: 'Self-Replicating Miners', category: 'mining', tier: 5, description: 'Mining robots that build copies of themselves — self-replicating industry remains theoretical at any scale (no working demonstration exists); treat as a capstone extrapolation, not near-term engineering.', effect: 'Exponential mining capacity growth', baseCostMoney: 120_000_000_000, baseTimeMonths: 60, prerequisites: ['automated_mining_fleet'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACE INFRASTRUCTURE (16 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'orbital_assembly', name: 'Orbital Assembly', category: 'infrastructure', tier: 1, description: 'Build structures in orbit.', effect: 'Enables fabrication facilities', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['modular_spacecraft'], unlocks: ['fabrication_orbital'] },
  { id: 'rotating_habitats', name: 'Rotating Habitats', category: 'infrastructure', tier: 3, description: 'Artificial gravity through rotation.', effect: '+30% station capacity', baseCostMoney: 5_000_000_000, baseTimeMonths: 30, prerequisites: ['orbital_assembly'], unlocks: [] },
  { id: 'mega_structures', name: 'Mega-Structures', category: 'infrastructure', tier: 4, description: "O'Neill cylinders and large habitats.", effect: '+30% station capacity', baseCostMoney: 50_000_000_000, baseTimeMonths: 48, prerequisites: ['rotating_habitats'], unlocks: [] },
  { id: 'space_dock', name: 'Space Dock Construction', category: 'infrastructure', tier: 2, description: 'Orbital shipyard for assembling vessels.', effect: '-20% ship build time', baseCostMoney: 800_000_000, baseTimeMonths: 16, prerequisites: ['orbital_assembly'], unlocks: [] },
  { id: 'lunar_base_design', name: 'Lunar Base Design', category: 'infrastructure', tier: 2, description: 'Permanent surface structures.', effect: 'Enables lunar habitats', baseCostMoney: 600_000_000, baseTimeMonths: 14, prerequisites: ['orbital_assembly'], unlocks: [] },
  { id: 'mars_base_design', name: 'Mars Base Design', category: 'infrastructure', tier: 3, description: 'Pressurized Martian structures.', effect: 'Enables Mars habitats', baseCostMoney: 3_000_000_000, baseTimeMonths: 24, prerequisites: ['lunar_base_design'], unlocks: [] },
  { id: 'lava_tube_habitats', name: 'Lava Tube Habitats', category: 'infrastructure', tier: 3, description: 'Use natural caves for radiation-shielded living.', effect: '+30% habitat space at low cost', baseCostMoney: 2_000_000_000, baseTimeMonths: 18, prerequisites: ['lunar_base_design'], unlocks: [] },
  { id: 'space_elevator_design', name: 'Space Elevator Architecture', category: 'infrastructure', tier: 5, description: 'Full orbital elevator engineering.', effect: 'Enables near-zero launch cost', baseCostMoney: 150_000_000_000, baseTimeMonths: 72, prerequisites: ['mega_structures', 'space_elevator_cable'], unlocks: [] },
  { id: 'orbital_ring', name: 'Orbital Ring Segment', category: 'infrastructure', tier: 5, description: 'Partial orbital ring around Earth.', effect: '-30% all launch costs', baseCostMoney: 500_000_000_000, baseTimeMonths: 96, prerequisites: ['space_elevator_design'], unlocks: [] },
  { id: 'modular_station', name: 'Modular Station Expansion', category: 'infrastructure', tier: 2, description: 'Add new modules to existing stations.', effect: '+4 module slots per station', baseCostMoney: 500_000_000, baseTimeMonths: 12, prerequisites: ['orbital_assembly'], unlocks: [] },
  { id: 'pressurized_rovers', name: 'Pressurized Rovers', category: 'infrastructure', tier: 2, description: 'Mobile habitats for surface exploration.', effect: '+30% surface area coverage', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['lunar_base_design'], unlocks: [] },
  { id: '3d_printing_space', name: 'Space 3D Printing', category: 'infrastructure', tier: 2, description: 'Additive manufacturing in orbit/surface.', effect: '-30% component import costs', baseCostMoney: 450_000_000, baseTimeMonths: 12, prerequisites: ['orbital_assembly'], unlocks: [] },
  // Wave E3 (§4.3): unlocks the belt-anchored Orbital Refinery — passive T1 refining throughput.
  { id: 'orbital_refining_complex', name: 'Orbital Refining Complex', category: 'infrastructure', tier: 3, description: 'Belt-scale bulk refining architecture: continuous smelters that run without a fabrication queue.', effect: 'Unlocks the Orbital Refinery (passive iron/aluminum → ingots/alloy throughput at the Belt)', baseCostMoney: 3_500_000_000, baseTimeMonths: 22, prerequisites: ['orbital_assembly', 'zero_g_refining'], unlocks: ['orbital_refinery'] },
  { id: 'atmospheric_processing', name: 'Atmospheric Processing', category: 'infrastructure', tier: 3, description: 'Extract gases from planetary atmospheres.', effect: 'Enables Venus and Titan colonies', baseCostMoney: 6_000_000_000, baseTimeMonths: 24, prerequisites: ['mars_base_design'], unlocks: [] },
  { id: 'radiation_hardening', name: 'Radiation Hardening', category: 'infrastructure', tier: 3, description: 'Protect habitats from intense radiation.', effect: 'Enables Mercury and Io colonies', baseCostMoney: 5_000_000_000, baseTimeMonths: 24, prerequisites: ['radiation_shielding'], unlocks: [] },
  { id: 'extreme_thermal', name: 'Extreme Thermal Management', category: 'infrastructure', tier: 3, description: 'Survive -270C to +430C.', effect: 'Enables Mercury and Io surface ops', baseCostMoney: 8_000_000_000, baseTimeMonths: 30, prerequisites: ['radiation_hardening'], unlocks: [] },
  { id: 'cryogenic_systems', name: 'Cryogenic Life Support', category: 'infrastructure', tier: 4, description: 'Habitats in extreme cold.', effect: 'Enables outer moon colonies', baseCostMoney: 15_000_000_000, baseTimeMonths: 36, prerequisites: ['extreme_thermal'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPULSION (16 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'ion_drives', name: 'Ion Drives', category: 'propulsion', tier: 1, description: 'High-efficiency electric propulsion.', effect: '-30% travel time', baseCostMoney: 120_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'hall_thrusters', name: 'Hall-Effect Thrusters', category: 'propulsion', tier: 2, description: 'Higher-thrust electric propulsion.', effect: '-20% maintenance, better orbits', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['ion_drives'], unlocks: [] },
  { id: 'vasimr', name: 'VASIMR Engines', category: 'propulsion', tier: 3, description: 'Variable impulse plasma rocket.', effect: '-30% Mars travel time', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['hall_thrusters'], unlocks: [] },
  { id: 'solar_sails_adv', name: 'Advanced Solar Sails', category: 'propulsion', tier: 4, description: 'Laser-boosted solar sails.', effect: 'Zero-fuel inner system transit', baseCostMoney: 6_000_000_000, baseTimeMonths: 24, prerequisites: ['vasimr'], unlocks: [] },
  { id: 'antimatter_propulsion', name: 'Antimatter Propulsion', category: 'propulsion', tier: 5, description: 'Matter-antimatter annihilation drive — Penning-trap microgram-scale antimatter production scaled by the 2147 industrial base (LORE.md Breakthrough era); explicitly lore-tech, not a near-term extrapolation of today\'s picogram-scale physics.', effect: 'Enables interstellar missions', baseCostMoney: 500_000_000_000, baseTimeMonths: 72, prerequisites: ['solar_sails_adv', 'fusion_drive'], unlocks: [] },
  // ─── Interstellar era (Wave 10) — registers the research spec'd in interstellar.ts ───
  // Costs/prereqs come from JUMP_DRIVE_RESEARCH / EXOTIC_MATTER_REFINING_RESEARCH
  // in interstellar.ts (Phase VIII data). These four are the prerequisites that
  // getJumpPrerequisites() checks; without them the expedition engine is unreachable.
  { id: 'jump_drive', name: 'Alcubierre-Class Jump Drive', category: 'propulsion', tier: 5, description: 'Controlled metric-space warp bubble — the Breakthrough of 2147 made commercial. Enables single-jump transit to nearby star systems given sufficient exotic-matter fuel.', effect: 'Enables interstellar expeditions (Starfarer-class ships)', baseCostMoney: 500_000_000_000, baseTimeMonths: 72, prerequisites: ['fusion_drive', 'metallic_hydrogen'], unlocks: ['exotic_matter_refining', 'interstellar_colonization'] },
  { id: 'exotic_matter_refining', name: 'Exotic Matter Refining', category: 'materials', tier: 5, description: 'Production of negative-mass particulates in volume sufficient to sustain jump-drive operations.', effect: 'Enables longer jumps (Alpha Centauri, Sirius); colonies can refine exotic fuel', baseCostMoney: 200_000_000_000, baseTimeMonths: 60, prerequisites: ['jump_drive'], unlocks: [] },
  { id: 'heavy_radiation_shielding', name: 'Heavy Radiation Shielding', category: 'defense', tier: 5, description: 'Multi-layer magnetohydrodynamic shielding rated for white-dwarf accretion environments.', effect: 'Enables high-radiation routes (Sirius); -25% expedition hazard damage', baseCostMoney: 120_000_000_000, baseTimeMonths: 48, prerequisites: ['radiation_hardening'], unlocks: [] },
  { id: 'interstellar_colonization', name: 'Interstellar Colonization', category: 'terraforming', tier: 5, description: 'Closed-loop generational settlement systems for worlds beyond Sol.', effect: 'Enables Colony Ark ships and interstellar colonies', baseCostMoney: 300_000_000_000, baseTimeMonths: 72, prerequisites: ['jump_drive', 'generation_ships'], unlocks: [] },
  { id: 'mpd_thruster', name: 'MPD Thruster', category: 'propulsion', tier: 2, description: 'Magnetoplasmadynamic thruster for cargo.', effect: '+30% cargo ship speed', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['hall_thrusters'], unlocks: [] },
  { id: 'nuclear_electric', name: 'Nuclear Electric Propulsion', category: 'propulsion', tier: 4, description: 'Nuclear reactor powers ion engines — NEP doctrine: efficiency forever. W3 doctrine gate (4X_BASELINE Op4 #1, "NTR-first vs NEP-first"): mutually exclusive with Nuclear Thermal Propulsion. Cheaper and faster to research than NTR, but locks the fusion_drive -> jump_drive interstellar chain (both require nuclear_thermal) until a 2x-cost/6-month-retool override.', effect: '-30% outer planet travel time', baseCostMoney: 4_000_000_000, baseTimeMonths: 24, prerequisites: ['super_heavy_lift'], unlocks: [], excludes: ['nuclear_thermal'], doctrineGroup: 'propulsion_doctrine' },
  { id: 'photon_sail_station_keeping', name: 'Photon-Sail Station-Keeping', category: 'propulsion', tier: 4, description: 'Radiation-pressure trim for GEO assets using thin-film reflective sails — flown: IKAROS (2010) demonstrated solar-sail propulsion in deep space. Op2 replacement for the debunked EM Drive (reactionless thrust was a measured thermal artifact, not new physics).', effect: '+10% station-keeping efficiency (radiation-pressure trim, IKAROS-heritage)', baseCostMoney: 5_000_000_000, baseTimeMonths: 20, prerequisites: ['vasimr'], unlocks: [] },
  { id: 'laser_propulsion', name: 'Laser-Pushed Lightsails', category: 'propulsion', tier: 4, description: 'Ground-based laser pushes lightsails.', effect: 'Enables fast interplanetary probes', baseCostMoney: 15_000_000_000, baseTimeMonths: 30, prerequisites: ['solar_sails_adv'], unlocks: [] },
  { id: 'magnetic_sail', name: 'Magnetic Sail (Magsail)', category: 'propulsion', tier: 3, description: 'Use magnetic field to brake in solar wind.', effect: '-30% deceleration fuel needs', baseCostMoney: 1_500_000_000, baseTimeMonths: 16, prerequisites: ['vasimr'], unlocks: [] },
  { id: 'aerocapture', name: 'Aerocapture Technology', category: 'propulsion', tier: 2, description: 'Use atmospheres for orbital insertion.', effect: '-30% Mars orbit insertion fuel', baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['ion_drives'], unlocks: [] },
  { id: 'gravity_assist_ai', name: 'AI Gravity Assist Planning', category: 'propulsion', tier: 2, description: 'Optimal multi-body gravity slingshots.', effect: '-30% fuel for outer planet missions', baseCostMoney: 300_000_000, baseTimeMonths: 10, prerequisites: ['ion_drives'], unlocks: [] },
  { id: 'pulse_detonation', name: 'Pulsed Detonation Engine', category: 'propulsion', tier: 3, description: 'Repeated detonation cycle propulsion.', effect: '+30% thrust at lower fuel cost', baseCostMoney: 2_500_000_000, baseTimeMonths: 22, prerequisites: ['hall_thrusters'], unlocks: [] },
  { id: 'plasma_thruster', name: 'Helicon Plasma Thruster', category: 'propulsion', tier: 2, description: 'High-density plasma propulsion.', effect: '+30% cargo transport efficiency', baseCostMoney: 350_000_000, baseTimeMonths: 12, prerequisites: ['hall_thrusters'], unlocks: [] },
  { id: 'fission_fragment', name: 'Fission Fragment Propulsion', category: 'propulsion', tier: 5, description: 'Direct thrust from fission products.', effect: 'ISP > 100,000s, 0.02c-class capstone', baseCostMoney: 300_000_000_000, baseTimeMonths: 60, prerequisites: ['antimatter_propulsion'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CREW & WORKFORCE (14 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'crew_training', name: 'Advanced Crew Training', category: 'crew', tier: 1, description: 'VR-based astronaut training programs.', effect: '+20% crew efficiency', baseCostMoney: 60_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'space_medicine', name: 'Space Medicine', category: 'crew', tier: 1, description: 'Counter bone loss and radiation effects.', effect: '+30% crew tour duration', baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'crew_rotation', name: 'Crew Rotation Logistics', category: 'crew', tier: 2, description: 'Efficient crew transport and scheduling.', effect: '-25% crew transport costs', baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: ['crew_training'], unlocks: [] },
  { id: 'robotic_assistants', name: 'Robotic Crew Assistants', category: 'crew', tier: 2, description: 'Robots handle routine maintenance.', effect: '-30% crew requirements', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['crew_training'], unlocks: [] },
  { id: 'space_nutrition', name: 'Space Nutrition Systems', category: 'crew', tier: 1, description: 'Optimize food production and nutrition.', effect: '-20% life support costs', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'psychology_support', name: 'Crew Psychology Support', category: 'crew', tier: 2, description: 'AI-assisted mental health for isolation.', effect: '+30% crew morale, -15% turnover', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: ['space_medicine'], unlocks: [] },
  { id: 'eva_suits_advanced', name: 'Advanced EVA Suits', category: 'crew', tier: 2, description: 'Next-gen spacesuits for surface ops.', effect: '+30% EVA productivity', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['crew_training'], unlocks: [] },
  { id: 'bioregenerative_lss', name: 'Bioregenerative Life Support', category: 'crew', tier: 3, description: 'Plants and algae recycle air and water.', effect: '-30% life support resupply', baseCostMoney: 1_500_000_000, baseTimeMonths: 20, prerequisites: ['space_nutrition', 'life_support_recycling'], unlocks: [] },
  { id: 'zero_g_fitness', name: 'Zero-G Fitness Systems', category: 'crew', tier: 1, description: 'Exercise equipment for microgravity.', effect: '+10% crew health, -5% medical costs', baseCostMoney: 40_000_000, baseTimeMonths: 4, prerequisites: [], unlocks: [] },
  { id: 'crew_augmentation', name: 'Crew Performance Augmentation', category: 'crew', tier: 3, description: 'Exoskeletons and neural interfaces — powered exoskeletons are flight-proven (ISS EVA trials); direct neural-interface integration for EVA control remains experimental.', effect: '+30% surface EVA capabilities', baseCostMoney: 3_000_000_000, baseTimeMonths: 24, prerequisites: ['eva_suits_advanced'], unlocks: [] },
  { id: 'space_agriculture', name: 'Space Agriculture', category: 'crew', tier: 3, description: 'Grow food in orbit and on surfaces.', effect: '-30% food import costs', baseCostMoney: 2_000_000_000, baseTimeMonths: 18, prerequisites: ['bioregenerative_lss'], unlocks: [] },
  { id: 'autonomous_hab_mgmt', name: 'Autonomous Habitat Management', category: 'crew', tier: 3, description: 'AI manages habitat systems autonomously.', effect: '-30% crew needed for operations', baseCostMoney: 2_500_000_000, baseTimeMonths: 20, prerequisites: ['robotic_assistants', 'autonomous_ops'], unlocks: [] },
  { id: 'space_construction_crew', name: 'Construction Crew Training', category: 'crew', tier: 2, description: 'Specialized orbital construction workers.', effect: '-20% build time, +10% quality', baseCostMoney: 350_000_000, baseTimeMonths: 12, prerequisites: ['crew_training'], unlocks: [] },
  { id: 'remote_telepresence', name: 'Remote Telepresence', category: 'crew', tier: 2, description: 'Operate robots remotely from orbit.', effect: '+30% surface operations from orbit', baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['robotic_assistants'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACE SERVICES & COMMERCE (15 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'space_tourism_ops', name: 'Space Tourism Operations', category: 'services', tier: 1, description: 'Commercial passenger space travel.', effect: 'Enables tourism revenue', baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: ['launch_abort_systems'], unlocks: [] },
  { id: 'orbital_advertising', name: 'Orbital Advertising', category: 'services', tier: 1, description: 'LED displays visible from ground.', effect: '+10% station revenue', baseCostMoney: 50_000_000, baseTimeMonths: 4, prerequisites: [], unlocks: [] },
  { id: 'space_burial', name: 'Space Memorial Services', category: 'services', tier: 1, description: 'Launch remains into space/orbit.', effect: 'New niche revenue stream', baseCostMoney: 30_000_000, baseTimeMonths: 4, prerequisites: [], unlocks: [] },
  { id: 'microgravity_research', name: 'Microgravity Research Services', category: 'services', tier: 2, description: 'Sell research time on orbital labs.', effect: '+30% fabrication revenue', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['orbital_assembly'], unlocks: [] },
  { id: 'satellite_as_service', name: 'Satellite-as-a-Service', category: 'services', tier: 3, description: 'Lease satellite capacity on demand.', effect: '+30% telecom flexibility', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['software_defined_sat'], unlocks: [] },
  { id: 'data_analytics_service', name: 'Earth Observation Analytics', category: 'services', tier: 2, description: 'Sell analyzed satellite data.', effect: '+30% sensor data value', baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: ['edge_ai'], unlocks: [] },
  { id: 'space_manufacturing', name: 'Commercial Space Manufacturing', category: 'services', tier: 3, description: 'Sell products made in microgravity.', effect: '+30% fabrication revenue', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['microgravity_research'], unlocks: [] },
  { id: 'space_logistics', name: 'Space Logistics Network', category: 'services', tier: 2, description: 'Regular cargo delivery routes.', effect: '-25% transport costs', baseCostMoney: 500_000_000, baseTimeMonths: 14, prerequisites: ['modular_cargo'], unlocks: [] },
  { id: 'space_insurance_tech', name: 'Space Insurance Modeling', category: 'services', tier: 2, description: 'AI-driven risk assessment.', effect: '-20% insurance premiums', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: ['predictive_maintenance'], unlocks: [] },
  { id: 'debris_tracking_svc', name: 'Debris Tracking Service', category: 'services', tier: 2, description: 'Commercial space surveillance.', effect: 'New revenue: debris tracking contracts', baseCostMoney: 350_000_000, baseTimeMonths: 12, prerequisites: ['space_weather_monitoring'], unlocks: [] },
  { id: 'lunar_tourism', name: 'Lunar Tourism Packages', category: 'services', tier: 3, description: 'Surface excursions for tourists.', effect: '+30% Moon tourism revenue', baseCostMoney: 3_000_000_000, baseTimeMonths: 22, prerequisites: ['space_tourism_ops', 'lunar_base_design'], unlocks: [] },
  { id: 'space_entertainment', name: 'Space Entertainment Platform', category: 'services', tier: 2, description: 'Live streaming and VR from space.', effect: '+20% all station revenue', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: ['space_tourism_ops'], unlocks: [] },
  { id: 'propellant_trading', name: 'Propellant Trading Network', category: 'services', tier: 3, description: 'Buy/sell propellant between operators.', effect: '+30% propellant depot revenue', baseCostMoney: 1_500_000_000, baseTimeMonths: 16, prerequisites: ['propellant_depots'], unlocks: [] },
  { id: 'space_law', name: 'Space Law Expertise', category: 'services', tier: 2, description: 'Navigate regulatory frameworks.', effect: '-30% regulatory compliance costs', baseCostMoney: 150_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'orbital_hotel', name: 'Orbital Hotel Design', category: 'services', tier: 3, description: 'Premium space hospitality.', effect: '+30% tourism revenue per module', baseCostMoney: 5_000_000_000, baseTimeMonths: 24, prerequisites: ['lunar_tourism', 'rotating_habitats'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPS & FLEET (15 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'cargo_optimization', name: 'Cargo Loading Optimization', category: 'ships', tier: 1, description: 'AI-optimized cargo placement.', effect: '+15% effective cargo capacity', baseCostMoney: 60_000_000, baseTimeMonths: 4, prerequisites: [], unlocks: [] },
  { id: 'ship_automation', name: 'Ship Automation', category: 'ships', tier: 1, description: 'Automated navigation and docking.', effect: '-30% crew needed per ship', baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'mining_laser', name: 'Mining Laser Systems', category: 'ships', tier: 2, description: 'Laser ablation for asteroid mining.', effect: '+30% mining ship extraction rate', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['resource_prospecting'], unlocks: [] },
  { id: 'heavy_hauler_design', name: 'Heavy Hauler Design', category: 'ships', tier: 2, description: 'Massive cargo vessels for bulk transport.', effect: '+30% heavy transport capacity', baseCostMoney: 500_000_000, baseTimeMonths: 16, prerequisites: ['cargo_optimization'], unlocks: [] },
  { id: 'tanker_efficiency', name: 'Tanker Efficiency', category: 'ships', tier: 2, description: 'Improved propellant storage systems.', effect: '+30% tanker capacity, -10% boil-off', baseCostMoney: 300_000_000, baseTimeMonths: 10, prerequisites: ['cargo_optimization'], unlocks: [] },
  { id: 'ship_armor', name: 'Ship Armor Plating', category: 'ships', tier: 2, description: 'Reinforced hulls for hazardous zones.', effect: '+30% ship survival in debris fields', baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: ['spacecraft_armor'], unlocks: [] },
  { id: 'fleet_coordination', name: 'Fleet Coordination AI', category: 'ships', tier: 3, description: 'Coordinate multiple ships as one unit.', effect: '+25% fleet efficiency', baseCostMoney: 2_000_000_000, baseTimeMonths: 18, prerequisites: ['swarm_ai', 'ship_automation'], unlocks: [] },
  { id: 'survey_probe_adv', name: 'Advanced Survey Probes', category: 'ships', tier: 2, description: 'Better sensors and longer range.', effect: '+30% survey discovery rate, +30% rewards', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['high_res_optical'], unlocks: [] },
  { id: 'mining_drone_swarm', name: 'Mining Drone Swarm', category: 'ships', tier: 3, description: 'Coordinated mining drone operations.', effect: '+30% mining drone output', baseCostMoney: 1_500_000_000, baseTimeMonths: 18, prerequisites: ['mining_laser', 'swarm_ai'], unlocks: [] },
  { id: 'ship_recycling', name: 'Ship Recycling Protocol', category: 'ships', tier: 2, description: 'Salvage useful materials from old ships.', effect: '+30% scrap value (39% instead of 30%)', baseCostMoney: 200_000_000, baseTimeMonths: 8, prerequisites: ['ship_automation'], unlocks: [] },
  { id: 'tug_design', name: 'Orbital Tug Design', category: 'ships', tier: 2, description: 'Specialized vessel for moving cargo/stations.', effect: 'Enables station repositioning', baseCostMoney: 350_000_000, baseTimeMonths: 12, prerequisites: ['cargo_optimization'], unlocks: [] },
  { id: 'deep_space_nav', name: 'Deep Space Navigation', category: 'ships', tier: 3, description: 'Autonomous navigation beyond Mars.', effect: '-30% outer system travel time', baseCostMoney: 2_500_000_000, baseTimeMonths: 20, prerequisites: ['gravity_assist_ai'], unlocks: [] },
  { id: 'ship_manufacturing', name: 'In-Space Ship Manufacturing', category: 'ships', tier: 4, description: 'Build ships in orbit from raw materials.', effect: '-30% ship build cost', baseCostMoney: 15_000_000_000, baseTimeMonths: 36, prerequisites: ['space_dock', '3d_printing_space'], unlocks: [] },
  { id: 'nuclear_ship', name: 'Nuclear-Powered Ships', category: 'ships', tier: 4, description: 'Ships with onboard fission reactors.', effect: '+30% range, -30% fuel needs', baseCostMoney: 20_000_000_000, baseTimeMonths: 36, prerequisites: ['nuclear_thermal'], unlocks: [] },
  { id: 'interstellar_probe', name: 'Interstellar Probe Design', category: 'ships', tier: 5, description: 'Probes capable of reaching nearby stars.', effect: 'Enables interstellar exploration', baseCostMoney: 100_000_000_000, baseTimeMonths: 60, prerequisites: ['laser_propulsion', 'fission_fragment'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // TERRAFORMING (11 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'atmospheric_analysis', name: 'Atmospheric Analysis', category: 'terraforming', tier: 3, description: 'Study planetary atmospheres for modification.', effect: 'Enables terraforming planning', baseCostMoney: 2_000_000_000, baseTimeMonths: 18, prerequisites: ['atmospheric_processing'], unlocks: [] },
  { id: 'greenhouse_engineering', name: 'Greenhouse Gas Engineering', category: 'terraforming', tier: 3, description: 'Deploy orbital mirrors and greenhouse gases.', effect: '+25% colony habitability on Mars', baseCostMoney: 5_000_000_000, baseTimeMonths: 30, prerequisites: ['atmospheric_analysis'], unlocks: [] },
  { id: 'mars_warming', name: 'Mars Atmospheric Warming', category: 'terraforming', tier: 4, description: 'Begin warming Mars atmosphere — peer-reviewed models (Jakosky & Edwards 2018) find Mars lacks enough accessible CO2 for full warming with current techniques and put realistic timelines in the centuries; treat as a multi-generational project.', effect: '+30% Mars colony capacity', baseCostMoney: 30_000_000_000, baseTimeMonths: 48, prerequisites: ['greenhouse_engineering'], unlocks: [] },
  { id: 'oxygen_production', name: 'Industrial O2 Production', category: 'terraforming', tier: 3, description: 'Large-scale oxygen from CO2/water.', effect: '+30% colony oxygen production', baseCostMoney: 4_000_000_000, baseTimeMonths: 24, prerequisites: ['isru_oxygen'], unlocks: [] },
  // Wave E3 (§4.3): unlocks the Agricultural Dome — the organics leg of the life-support chain (§3.1 chain E).
  { id: 'hydroponic_agriculture', name: 'Hydroponic Agriculture', category: 'terraforming', tier: 2, description: 'Closed-loop soil-free crop systems sized for dome farming on Luna and Mars.', effect: 'Unlocks the Agricultural Dome; -10% building recipe input consumption', baseCostMoney: 600_000_000, baseTimeMonths: 12, prerequisites: ['resource_prospecting'], unlocks: ['agri_dome'] },
  { id: 'soil_creation', name: 'Synthetic Soil Engineering', category: 'terraforming', tier: 3, description: 'Convert regolith to fertile soil.', effect: '+30% food production on Mars', baseCostMoney: 3_000_000_000, baseTimeMonths: 20, prerequisites: ['space_agriculture'], unlocks: [] },
  { id: 'dome_construction', name: 'Pressurized Dome Construction', category: 'terraforming', tier: 3, description: 'Large transparent pressure domes.', effect: '+30% colony capacity', baseCostMoney: 2_500_000_000, baseTimeMonths: 20, prerequisites: ['mars_base_design'], unlocks: [] },
  { id: 'magnetic_shield', name: 'Artificial Magnetosphere', category: 'terraforming', tier: 5, description: 'Protect Mars atmosphere from solar wind — an artificial Mars magnetosphere is a real NASA workshop proposal (2017) but remains unbuilt at any scale.', effect: 'Prerequisite for full terraforming', baseCostMoney: 100_000_000_000, baseTimeMonths: 60, prerequisites: ['mars_warming'], unlocks: [] },
  { id: 'ocean_seeding', name: 'Ocean Creation', category: 'terraforming', tier: 5, description: 'Create liquid water oceans from ice.', effect: 'Enables full planetary colonization', baseCostMoney: 200_000_000_000, baseTimeMonths: 72, prerequisites: ['magnetic_shield'], unlocks: [] },
  { id: 'biosphere_engineering', name: 'Biosphere Engineering', category: 'terraforming', tier: 4, description: 'Introduce microbial ecosystems.', effect: '+30% self-sufficiency', baseCostMoney: 20_000_000_000, baseTimeMonths: 36, prerequisites: ['bioregenerative_lss', 'soil_creation'], unlocks: [] },
  { id: 'paraterraforming', name: 'Paraterraforming', category: 'terraforming', tier: 3, description: 'Enclosed terraforming zones.', effect: '+30% habitable area at lower cost', baseCostMoney: 6_000_000_000, baseTimeMonths: 26, prerequisites: ['dome_construction'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIALS SCIENCE (11 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'carbon_nanotubes', name: 'Carbon Nanotube Production', category: 'materials', tier: 2, description: 'Mass production of CNTs.', effect: '-20% structural mass', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: [], unlocks: [] },
  { id: 'metamaterials', name: 'Electromagnetic Metamaterials', category: 'materials', tier: 3, description: 'Materials with engineered EM properties.', effect: '+30% antenna efficiency', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['carbon_nanotubes'], unlocks: [] },
  { id: 'aerogel_insulation', name: 'Aerogel Insulation', category: 'materials', tier: 1, description: 'Ultra-lightweight thermal insulation.', effect: '-20% thermal management costs', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'self_healing_materials', name: 'Self-Healing Materials', category: 'materials', tier: 3, description: 'Materials that repair micro-damage.', effect: '+30% hull lifespan', baseCostMoney: 3_000_000_000, baseTimeMonths: 22, prerequisites: ['carbon_nanotubes'], unlocks: [] },
  { id: 'lunar_concrete', name: 'Lunar Concrete (Lunarcrete)', category: 'materials', tier: 2, description: 'Construction material from lunar regolith.', effect: '-30% lunar construction import costs', baseCostMoney: 300_000_000, baseTimeMonths: 10, prerequisites: ['regolith_processing'], unlocks: [] },
  { id: 'radiation_shielding_mat', name: 'Radiation Shielding Materials', category: 'materials', tier: 2, description: 'Hydrogen-rich polymers for radiation protection.', effect: '+30% radiation shielding efficiency', baseCostMoney: 350_000_000, baseTimeMonths: 12, prerequisites: ['aerogel_insulation'], unlocks: [] },
  { id: 'high_temp_alloys', name: 'High-Temperature Alloys', category: 'materials', tier: 3, description: 'Alloys for extreme environments.', effect: 'Enables Mercury surface operations', baseCostMoney: 2_500_000_000, baseTimeMonths: 18, prerequisites: ['isru_metals'], unlocks: [] },
  { id: 'graphene_production', name: 'Space Graphene Production', category: 'materials', tier: 3, description: 'Produce graphene in microgravity.', effect: '+30% electronics performance', baseCostMoney: 1_800_000_000, baseTimeMonths: 16, prerequisites: ['carbon_nanotubes'], unlocks: [] },
  { id: 'superconductors', name: 'Room-Temperature Superconductors', category: 'materials', tier: 4, description: 'Superconducting materials without cooling — ambient-pressure superconductivity claims have historically required years of failed replication (2023\'s LK-99 controversy); commercial timelines here assume the claim eventually replicates.', effect: 'Revolutionary power and propulsion efficiency', baseCostMoney: 25_000_000_000, baseTimeMonths: 36, prerequisites: ['graphene_production'], unlocks: [] },
  { id: 'programmable_matter', name: 'Programmable Matter', category: 'materials', tier: 5, description: 'Materials that change shape on command — lab-scale programmable-matter demos exist (claytronics, modular swarm robotics); macro-scale structural reconfiguration on demand remains speculative.', effect: 'Reconfigurable structures', baseCostMoney: 80_000_000_000, baseTimeMonths: 48, prerequisites: ['superconductors', 'neuromorphic_chips'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSE & SAFETY (11 researches — 10 here + heavy_radiation_shielding registered in the interstellar-era block below)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'collision_avoidance', name: 'Collision Avoidance Network', category: 'defense', tier: 1, description: 'Space traffic management system.', effect: '-30% collision risk', baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'asteroid_deflection', name: 'Asteroid Deflection', category: 'defense', tier: 3, description: 'Kinetic impactor for NEO deflection.', effect: 'Planetary defense capability', baseCostMoney: 5_000_000_000, baseTimeMonths: 24, prerequisites: ['autonomous_docking'], unlocks: [] },
  { id: 'solar_storm_protection', name: 'Solar Storm Protection', category: 'defense', tier: 2, description: 'Rapid shelter protocols for CME events.', effect: '-30% solar storm damage', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['space_weather_monitoring'], unlocks: [] },
  { id: 'debris_shield_active', name: 'Active Debris Shielding', category: 'defense', tier: 3, description: 'Laser or projectile debris defense.', effect: '+30% station defense rating', baseCostMoney: 4_000_000_000, baseTimeMonths: 22, prerequisites: ['space_debris_cleanup'], unlocks: [] },
  { id: 'hardened_electronics', name: 'EMP-Hardened Electronics', category: 'defense', tier: 2, description: 'Protect systems from electromagnetic pulses.', effect: '+30% system resilience', baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: ['rad_hard_processors'], unlocks: [] },
  { id: 'emergency_response', name: 'Space Emergency Response', category: 'defense', tier: 2, description: 'Rapid deployment rescue teams.', effect: '+30% crew survival in emergencies', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['emergency_escape'], unlocks: [] },
  { id: 'nuclear_deflection', name: 'Nuclear Asteroid Deflection', category: 'defense', tier: 4, description: 'Nuclear standoff burst for large asteroids.', effect: 'Can deflect planet-killer asteroids', baseCostMoney: 15_000_000_000, baseTimeMonths: 30, prerequisites: ['asteroid_deflection'], unlocks: [] },
  { id: 'space_situational', name: 'Space Situational Awareness', category: 'defense', tier: 1, description: 'Track all objects in Earth orbit.', effect: '+20% debris tracking revenue', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'cyber_defense', name: 'Space Cyber Defense', category: 'defense', tier: 3, description: 'Protect space assets from cyber attacks.', effect: '+30% defense rating', baseCostMoney: 2_000_000_000, baseTimeMonths: 18, prerequisites: ['cybersecurity_adv'], unlocks: [] },
  { id: 'gravity_tractor', name: 'Gravity Tractor', category: 'defense', tier: 3, description: 'Slowly redirect asteroids using gravity.', effect: 'Precise long-term deflection', baseCostMoney: 3_000_000_000, baseTimeMonths: 20, prerequisites: ['asteroid_deflection'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // ESPIONAGE & INTELLIGENCE (9 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'signals_intelligence', name: 'Signals Intelligence', category: 'defense', tier: 2, description: 'Intercept and analyze electromagnetic signals from rival operations.', effect: 'Unlocks tech_probe, workforce_intel, supply_chain_analysis, trade_route_intel espionage actions', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['high_res_optical'], unlocks: [] },
  { id: 'corporate_infiltration', name: 'Corporate Infiltration', category: 'defense', tier: 2, description: 'Place covert operatives within rival corporate structures.', effect: 'Unlocks contract_snipe espionage action', baseCostMoney: 500_000_000, baseTimeMonths: 16, prerequisites: [], unlocks: [] },
  { id: 'psychological_operations', name: 'Psychological Operations', category: 'defense', tier: 3, description: 'Develop disinformation and perception management campaigns.', effect: 'Unlocks disinformation espionage action', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['corporate_infiltration'], unlocks: [] },
  { id: 'talent_acquisition', name: 'Talent Acquisition Programs', category: 'defense', tier: 3, description: 'Identify and recruit key personnel from competitors.', effect: 'Unlocks employee_headhunt espionage action', baseCostMoney: 1_500_000_000, baseTimeMonths: 18, prerequisites: ['signals_intelligence'], unlocks: [] },
  { id: 'deep_space_surveillance', name: 'Deep Space Surveillance', category: 'defense', tier: 3, description: 'Monitor rival activities across the solar system.', effect: '+4% espionage success rate', baseCostMoney: 3_000_000_000, baseTimeMonths: 22, prerequisites: ['signals_intelligence'], unlocks: [] },
  { id: 'counterintelligence_ops', name: 'Counterintelligence Operations', category: 'defense', tier: 4, description: 'Detect, deceive, and neutralize rival espionage attempts.', effect: '+4% espionage success rate, enhanced counter-intelligence', baseCostMoney: 10_000_000_000, baseTimeMonths: 30, prerequisites: ['deep_space_surveillance'], unlocks: [] },
  { id: 'cyber_warfare_suite', name: 'Cyber Warfare Suite', category: 'defense', tier: 4, description: 'Advanced digital intrusion and defense toolkit.', effect: '+4% espionage success rate', baseCostMoney: 12_000_000_000, baseTimeMonths: 32, prerequisites: ['cyber_defense', 'signals_intelligence'], unlocks: [] },
  { id: 'quantum_cryptanalysis', name: 'Quantum Cryptanalysis', category: 'defense', tier: 5, description: 'Break quantum-encrypted communications using advanced algorithms.', effect: '+4% espionage success rate, ultimate code-breaking', baseCostMoney: 50_000_000_000, baseTimeMonths: 48, prerequisites: ['cyber_warfare_suite', 'quantum_coprocessors'], unlocks: [] },
  { id: 'intelligence_directorate', name: 'Intelligence Directorate', category: 'defense', tier: 5, description: 'Establish a centralized intelligence command overseeing all espionage operations.', effect: 'Unlocks strategic_assessment espionage action, +6% espionage success rate', baseCostMoney: 60_000_000_000, baseTimeMonths: 50, prerequisites: ['counterintelligence_ops', 'quantum_cryptanalysis'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPLORATION (14 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'sample_return', name: 'Sample Return Missions', category: 'exploration', tier: 2, description: 'Return samples from other bodies.', effect: '+30% survey rewards', baseCostMoney: 500_000_000, baseTimeMonths: 16, prerequisites: ['resource_prospecting'], unlocks: [] },
  { id: 'landing_precision', name: 'Precision Landing', category: 'exploration', tier: 1, description: 'Land within 100m of target.', effect: '+30% landing success', baseCostMoney: 100_000_000, baseTimeMonths: 8, prerequisites: [], unlocks: [] },
  { id: 'subsurface_exploration', name: 'Subsurface Exploration', category: 'exploration', tier: 4, description: 'Explore underground caves and lava tubes.', effect: 'Reveals hidden resources', baseCostMoney: 8_000_000_000, baseTimeMonths: 28, prerequisites: ['deep_drilling'], unlocks: [] },
  { id: 'ocean_exploration', name: 'Subsurface Ocean Exploration', category: 'exploration', tier: 4, description: 'Explore Europa and Enceladus oceans.', effect: 'Enables exotic material discovery', baseCostMoney: 15_000_000_000, baseTimeMonths: 36, prerequisites: ['subsurface_exploration', 'cryogenic_systems'], unlocks: [] },
  { id: 'rover_autonomy', name: 'Autonomous Rover Networks', category: 'exploration', tier: 2, description: 'Self-driving surface exploration robots.', effect: '+30% surface survey area', baseCostMoney: 400_000_000, baseTimeMonths: 14, prerequisites: ['landing_precision'], unlocks: [] },
  { id: 'aerial_exploration', name: 'Titan/Mars Aerial Vehicles', category: 'exploration', tier: 3, description: 'Drones/helicopters for atmospheric bodies.', effect: '+30% Titan/Mars survey rate', baseCostMoney: 3_000_000_000, baseTimeMonths: 22, prerequisites: ['rover_autonomy'], unlocks: [] },
  { id: 'jupiter_deep_probe', name: 'Jupiter Deep Atmosphere Probe', category: 'exploration', tier: 4, description: 'Survive extreme pressure and temperature.', effect: 'Reveals Jupiter atmospheric resources', baseCostMoney: 10_000_000_000, baseTimeMonths: 30, prerequisites: ['extreme_thermal'], unlocks: [] },
  { id: 'kuiper_belt_survey', name: 'Kuiper Belt Survey', category: 'exploration', tier: 4, description: 'Map resources in the outer solar system.', effect: '+30% outer system discovery rate', baseCostMoney: 12_000_000_000, baseTimeMonths: 36, prerequisites: ['deep_space_nav'], unlocks: [] },
  { id: 'cometary_mining', name: 'Comet Mining Technology', category: 'exploration', tier: 3, description: 'Extract water and volatiles from comets.', effect: 'New water/fuel source', baseCostMoney: 4_000_000_000, baseTimeMonths: 24, prerequisites: ['asteroid_capture'], unlocks: [] },
  { id: 'oort_cloud_probe', name: 'Oort Cloud Probe', category: 'exploration', tier: 5, description: 'Probes reaching the Oort cloud.', effect: 'Reveals interstellar resources', baseCostMoney: 50_000_000_000, baseTimeMonths: 48, prerequisites: ['kuiper_belt_survey', 'fusion_drive'], unlocks: [] },
  { id: 'aerostat_technology', name: 'Aerostat Technology', category: 'exploration', tier: 3, description: 'Floating platforms in dense atmospheres.', effect: 'Enables Venus cloud colonies', baseCostMoney: 10_000_000_000, baseTimeMonths: 30, prerequisites: ['atmospheric_processing'], unlocks: [] },
  { id: 'ice_penetrator', name: 'Ice Penetrator Probe', category: 'exploration', tier: 4, description: 'Melt through ice crusts to subsurface.', effect: 'Enables Europa/Enceladus access', baseCostMoney: 8_000_000_000, baseTimeMonths: 28, prerequisites: ['deep_drilling'], unlocks: [] },
  { id: 'volcano_monitoring', name: 'Volcanic Activity Monitoring', category: 'exploration', tier: 3, description: 'Monitor Io and other volcanic bodies.', effect: '+30% geothermal energy efficiency', baseCostMoney: 1_500_000_000, baseTimeMonths: 16, prerequisites: ['infrared_telescope'], unlocks: [] },
  { id: 'exoplanet_survey', name: 'Exoplanet Survey', category: 'exploration', tier: 5, description: 'Identify habitable exoplanets.', effect: 'Enables interstellar colonization planning', baseCostMoney: 80_000_000_000, baseTimeMonths: 60, prerequisites: ['gravitational_wave_det', 'interstellar_probe'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMY & TRADE (12 researches)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'market_analytics', name: 'Market Analytics Platform', category: 'economy', tier: 1, description: 'AI-driven commodity price prediction.', effect: '+15% trade profit margin', baseCostMoney: 80_000_000, baseTimeMonths: 6, prerequisites: [], unlocks: [] },
  { id: 'supply_chain_opt', name: 'Supply Chain Optimization', category: 'economy', tier: 2, description: 'Optimize resource flow between locations.', effect: '-20% transport costs', baseCostMoney: 300_000_000, baseTimeMonths: 12, prerequisites: ['market_analytics'], unlocks: [] },
  { id: 'futures_trading', name: 'Resource Futures Market', category: 'economy', tier: 2, description: 'Trade resource delivery contracts.', effect: '+25% trading revenue', baseCostMoney: 200_000_000, baseTimeMonths: 10, prerequisites: ['market_analytics'], unlocks: [] },
  { id: 'currency_system', name: 'Space Currency System', category: 'economy', tier: 3, description: 'Cryptocurrency for interplanetary trade.', effect: '-15% cross-location transaction costs', baseCostMoney: 1_000_000_000, baseTimeMonths: 16, prerequisites: ['supply_chain_opt'], unlocks: [] },
  { id: 'automated_trading', name: 'Automated Trading Bots', category: 'economy', tier: 3, description: 'AI executes optimal market trades.', effect: '+30% passive trading income', baseCostMoney: 1_500_000_000, baseTimeMonths: 18, prerequisites: ['futures_trading', 'edge_ai'], unlocks: [] },
  { id: 'monopoly_economics', name: 'Monopoly Economics', category: 'economy', tier: 3, description: 'Maximize revenue from controlled locations.', effect: '+25% chokepoint transit fee revenue', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['supply_chain_opt'], unlocks: [] },
  { id: 'tech_licensing', name: 'Technology Licensing Framework', category: 'economy', tier: 2, description: 'License your research to other players.', effect: 'Enables tech license revenue', baseCostMoney: 250_000_000, baseTimeMonths: 10, prerequisites: [], unlocks: [] },
  { id: 'insurance_modeling', name: 'Insurance Actuarial Models', category: 'economy', tier: 2, description: 'Better space insurance pricing.', effect: '-25% insurance costs', baseCostMoney: 200_000_000, baseTimeMonths: 8, prerequisites: ['market_analytics'], unlocks: [] },
  { id: 'venture_capital', name: 'Space Venture Fund', category: 'economy', tier: 3, description: 'Fund other players for equity.', effect: '+10% revenue from funded players', baseCostMoney: 3_000_000_000, baseTimeMonths: 20, prerequisites: ['tech_licensing'], unlocks: [] },
  { id: 'tax_optimization', name: 'Tax Optimization Strategy', category: 'economy', tier: 1, description: 'Minimize operational tax burden.', effect: '-10% all costs', baseCostMoney: 50_000_000, baseTimeMonths: 4, prerequisites: [], unlocks: [] },
  { id: 'brand_management', name: 'Brand & Reputation', category: 'economy', tier: 1, description: 'Build corporate reputation.', effect: '+10% contract win rate', baseCostMoney: 40_000_000, baseTimeMonths: 4, prerequisites: [], unlocks: [] },
  { id: 'merger_acquisition', name: 'M&A Strategy', category: 'economy', tier: 4, description: 'Acquire competitor assets.', effect: 'Enables corporate acquisitions', baseCostMoney: 10_000_000_000, baseTimeMonths: 24, prerequisites: ['venture_capital'], unlocks: [] },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCTRINE CHOICES (Waves W3+W10 — 4X_BASELINE Part 2a Op4) — 4 new techs.
  // MoO2-style mutually exclusive picks. `nuclear_thermal`/`nuclear_electric`
  // above (rocketry/propulsion sections) form the 3rd pair — both were
  // re-pointed to share the `super_heavy_lift` branch point and got
  // `excludes`/`doctrineGroup` added in place, so they stay in their
  // original category sections rather than being duplicated here.
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'crewed_forward_doctrine', name: 'Crewed-Forward Doctrine', category: 'crew', tier: 3, description: 'Corporate bet: humans remain the primary operational asset — exoskeletons, SANS mitigation, and crew augmentation take budget priority over further automation. W3 doctrine gate (4X_BASELINE Op4 #2, "Crewed-forward vs Robotic-forward" — mirrors the real Moon-vs-robots budget fight). Mutually exclusive with the Robotic-Forward doctrine.', effect: '-15% crew-spine maintenance cost, +10% crew morale', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['crew_training'], unlocks: [], excludes: ['robotic_forward_doctrine'], doctrineGroup: 'workforce_doctrine' },
  { id: 'robotic_forward_doctrine', name: 'Robotic-Forward Doctrine', category: 'ai_chips', tier: 3, description: 'Corporate bet: autonomy and robotics absorb operational load ahead of further crewed investment — telerobotics and autonomous habitat/ops management take budget priority over crew expansion. W3 doctrine gate (4X_BASELINE Op4 #2). Mutually exclusive with the Crewed-Forward doctrine.', effect: '+15% automation-spine build speed, -10% maintenance via autonomous ops', baseCostMoney: 2_000_000_000, baseTimeMonths: 20, prerequisites: ['crew_training'], unlocks: [], excludes: ['crewed_forward_doctrine'], doctrineGroup: 'workforce_doctrine' },
  { id: 'proprietary_research_doctrine', name: 'Proprietary Research Doctrine', category: 'economy', tier: 3, description: 'Keep discoveries in-house — faster internal R&D, no faction science-standing dividend or cheap licensing-in deals. W3 doctrine gate (4X_BASELINE Op4 #3, "Proprietary vs Open Science" — doubles as the internal-politics seed, CLAUDE.md §1.7). Mutually exclusive with the Open Science doctrine; the faction-standing half of this tradeoff awaits the Accord Council wave (W11) — this wave wires the research-speed/licensing-cost half only.', effect: '+15% research speed', baseCostMoney: 1_500_000_000, baseTimeMonths: 16, prerequisites: ['market_analytics'], unlocks: [], excludes: ['open_science_doctrine'], doctrineGroup: 'research_doctrine' },
  { id: 'open_science_doctrine', name: 'Open Science Doctrine', category: 'economy', tier: 3, description: 'Publish discoveries openly — cheaper technology licensing and modest ongoing revenue from shared research, at the cost of proprietary research speed. W3 doctrine gate (4X_BASELINE Op4 #3). Mutually exclusive with the Proprietary Research doctrine.', effect: '+10% licensing revenue, -10% operating cost from shared tooling', baseCostMoney: 1_500_000_000, baseTimeMonths: 16, prerequisites: ['market_analytics'], unlocks: [], excludes: ['proprietary_research_doctrine'], doctrineGroup: 'research_doctrine' },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPEATABLE PROGRAMS (Wave W3 — 4X_BASELINE Part 2a Op5) — 6 bounded
  // programs, 5 levels each. Never enter completedResearch (see
  // ResearchDefinition.repeatable doc comment in types.ts) — completion
  // increments GameState.repeatableResearchLevels[id] and the research
  // re-arms at 2.5x cost (doc formula) for the next level, up to level 5.
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'launch_cadence_optimization', name: 'Launch Cadence Optimization Program', category: 'rocketry', tier: 4, description: 'Bounded process-improvement program — each completed cycle trims launch-pad turnaround further. W3 repeatable (4X_BASELINE Op5): re-arms after each completion for another level, up to 5, at 2.5x cost per level (doc formula). Level 5 caps at +10% cumulative build speed on launch-dependent construction.', effect: '+2% launch-cadence build speed per completed level (cap 5 levels / +10%)', baseCostMoney: 1_200_000_000, baseTimeMonths: 20, prerequisites: ['rapid_launch_cadence'], unlocks: [], repeatable: { maxLevel: 5, effectPerLevel: [{ type: 'buildSpeed', magnitude: 0.02 }], costMultiplierPerLevel: 2.5 } },
  { id: 'yield_learning_curve_program', name: 'Yield Learning Curve Program', category: 'mining', tier: 4, description: 'Manufacturing/extraction learning-curve program — real industrial learning, bounded and re-armable. W3 repeatable (4X_BASELINE Op5): 5 levels, 2.5x cost per level, +2% mining output per level (cap +10%).', effect: '+2% mining output per completed level (cap 5 levels / +10%)', baseCostMoney: 1_000_000_000, baseTimeMonths: 18, prerequisites: ['regolith_processing'], unlocks: [], repeatable: { maxLevel: 5, effectPerLevel: [{ type: 'mining', magnitude: 0.02 }], costMultiplierPerLevel: 2.5 } },
  { id: 'ops_automation_program', name: 'Ops Automation Program', category: 'ai_chips', tier: 4, description: 'Iterative automation rollout across stations and mines — each cycle trims a little more manual overhead. W3 repeatable (4X_BASELINE Op5): 5 levels, 2.5x cost per level, -2% maintenance per level (cap -10%).', effect: '-2% maintenance cost per completed level (cap 5 levels / -10%)', baseCostMoney: 1_300_000_000, baseTimeMonths: 20, prerequisites: ['autonomous_ops'], unlocks: [], repeatable: { maxLevel: 5, effectPerLevel: [{ type: 'maintenance', magnitude: 0.02 }], costMultiplierPerLevel: 2.5 } },
  { id: 'radiation_hardening_program', name: 'Radiation Hardening Program', category: 'defense', tier: 4, description: 'Ongoing shielding-material refinement across the fleet and habitats. W3 repeatable (4X_BASELINE Op5): 5 levels, 2.5x cost per level, +2% hazard resistance per level (cap +10%, inside the risk-pillar 30% aggregate cap).', effect: '+2% hazard resistance per completed level (cap 5 levels / +10%)', baseCostMoney: 1_500_000_000, baseTimeMonths: 22, prerequisites: ['radiation_hardening'], unlocks: [], repeatable: { maxLevel: 5, effectPerLevel: [{ type: 'hazardResistance', magnitude: 0.02 }], costMultiplierPerLevel: 2.5 } },
  { id: 'logistics_research_program', name: 'Logistics Research Program', category: 'ships', tier: 4, description: 'Continuous route-planning and fleet-scheduling refinement. W3 repeatable (4X_BASELINE Op5): 5 levels, 2.5x cost per level, +2% ship transit speed per level (cap +10%).', effect: '+2% ship transit speed per completed level (cap 5 levels / +10%)', baseCostMoney: 1_100_000_000, baseTimeMonths: 18, prerequisites: ['supply_chain_opt'], unlocks: [], repeatable: { maxLevel: 5, effectPerLevel: [{ type: 'travelSpeed', magnitude: 0.02 }], costMultiplierPerLevel: 2.5 } },
  { id: 'deep_space_network_expansion', name: 'Deep Space Network Expansion', category: 'satellite_components', tier: 4, description: 'Incremental DSN-heritage relay capacity buildout — real NASA program precedent (the Deep Space Network has expanded in phases for six decades). W3 repeatable (4X_BASELINE Op5): 5 levels, 2.5x cost per level, +2% comms/data service revenue per level (cap +10%).', effect: '+2% relay/data service revenue per completed level (cap 5 levels / +10%)', baseCostMoney: 1_400_000_000, baseTimeMonths: 20, prerequisites: ['inter_satellite_links'], unlocks: [], repeatable: { maxLevel: 5, effectPerLevel: [{ type: 'revenue', magnitude: 0.02 }], costMultiplierPerLevel: 2.5 } },

  // ═══════════════════════════════════════════════════════════════════════════
  // RARE TECHS (Wave W10 — 4X_BASELINE Part 2a Op5) — 8 discovery-gated
  // techs. Hidden from the tree (isRareTechVisible) until their id lands in
  // GameState.unlockedRareTechIds — the W4 (narrative-events.ts) / W6
  // (science-missions.ts) grant channel that predates this wave.
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'europan_biochemistry', name: 'Europan Biochemistry', category: 'exploration', tier: 5, description: 'Confirmed subsurface disequilibrium biosignature chemistry from Europa. W10 rare tech (4X_BASELINE Op5) — hidden until a Europa Clipper II Ocean Access discovery or the Europa biosignature narrative chain grants access via state.unlockedRareTechIds; not researchable from the tree before that.', effect: '+20% mining output (exotic biomatter extraction), +15% service revenue (biosignature data licensing)', baseCostMoney: 60_000_000_000, baseTimeMonths: 48, prerequisites: ['ice_penetrator'], unlocks: [], rare: true },
  { id: 'xenobiochemistry', name: 'Xenobiochemistry', category: 'exploration', tier: 5, description: 'Chirality-anomaly follow-up research into non-terrestrial biochemical pathways. W10 rare tech (4X_BASELINE Op5) — hidden until an ISO/deep-drill chirality-anomaly discovery grants access via state.unlockedRareTechIds.', effect: '+25% mining output (exotic biomatter/xenogenic resource yield)', baseCostMoney: 65_000_000_000, baseTimeMonths: 50, prerequisites: ['deep_drilling'], unlocks: [], rare: true },
  { id: 'deep_biosphere_ecology', name: 'Deep-Biosphere Ecology', category: 'exploration', tier: 5, description: 'Subsurface aquifer ecosystem modeling from Mars Deep Drill-class programs. W10 rare tech (4X_BASELINE Op5) — hidden until a Mars aquifer-biosphere discovery grants access via state.unlockedRareTechIds.', effect: '+20% mining output (aquifer resource access), +10% hazard resistance (contamination-protocol maturity)', baseCostMoney: 55_000_000_000, baseTimeMonths: 46, prerequisites: ['deep_drilling'], unlocks: [], rare: true },
  { id: 'iso_materials_analysis', name: 'ISO Materials Analysis', category: 'materials', tier: 5, description: 'Exotic-composition analysis from an intercepted interstellar object. W10 rare tech (4X_BASELINE Op5) — hidden until an ISO Rapid-Response Interceptor exotic-composition result grants access via state.unlockedRareTechIds.', effect: '+20% mining output (exotic materials processing), +15% research speed', baseCostMoney: 70_000_000_000, baseTimeMonths: 50, prerequisites: ['infrared_telescope'], unlocks: [], rare: true },
  { id: 'precursor_studies', name: 'Precursor Studies', category: 'exploration', tier: 5, description: 'Systematic analysis of the Triton Archive precursor artifacts (LORE.md, Echo Remnants arc, 2149 breach). W10 rare tech (4X_BASELINE Op5) — hidden until the Triton Archive investigation chain grants access via state.unlockedRareTechIds; finally gives the long-dangling "precursor_studies" id (referenced by exploration.ts survey rewards since before this wave) a real research anchor.', effect: '+20% research speed, +10% service revenue (artifact-derived licensing)', baseCostMoney: 75_000_000_000, baseTimeMonths: 52, prerequisites: ['gravitational_wave_det'], unlocks: [], rare: true },
  { id: 'vacuum_metallurgy_breakthrough', name: 'Vacuum Metallurgy Breakthrough', category: 'materials', tier: 5, description: "Post-replication industrial process built on a confirmed room-temperature superconductor claim (the LK-99-pattern replication-crisis event chain). W10 rare tech (4X_BASELINE Op5) — hidden until the superconductor replication chain resolves in the claim's favor and grants access via state.unlockedRareTechIds.", effect: '-20% building cost, -10% maintenance cost', baseCostMoney: 58_000_000_000, baseTimeMonths: 46, prerequisites: ['superconductors'], unlocks: [], rare: true },
  { id: 'hive_pattern_mathematics', name: 'Hive Pattern Mathematics', category: 'ai_chips', tier: 5, description: 'Non-human mathematical formalism recovered from Hive Collective contact. W10 rare tech (4X_BASELINE Op5) — hidden until a Hive Collective first-contact/pattern-recognition discovery grants access via state.unlockedRareTechIds.', effect: '+25% research speed', baseCostMoney: 62_000_000_000, baseTimeMonths: 48, prerequisites: ['quantum_ml'], unlocks: [], rare: true },
  { id: 'metric_engineering_refinements', name: 'Metric Engineering Refinements', category: 'propulsion', tier: 5, description: 'Post-Breakthrough refinements to Alcubierre-class warp-bubble metric engineering. W10 rare tech (4X_BASELINE Op5) — hidden until a jump-drive-era discovery grants access via state.unlockedRareTechIds; a capstone refinement of the one licensed miracle (LORE.md 2147 Breakthrough), not a new one.', effect: '+25% ship transit speed, +15% fuel efficiency', baseCostMoney: 80_000_000_000, baseTimeMonths: 56, prerequisites: ['jump_drive'], unlocks: [], rare: true },
];

// ─── Authored per-tech effects (4X_BASELINE_2026-08.md Part 2a / Wave W1) ───
// Every one of the 254 techs above has a hand-authored effects[] entry here,
// reviewed against its `effect` flavor text so the number displayed matches
// the number that actually resolves (no more "5x mining revenue" silently
// resolving to +30%). Magnitudes are pre-clamped to PER_EFFECT_CAP (0.30);
// resolveEffects() clamps again defensively. Gate-only techs (no numeric claim
// in their flavor, e.g. "Enables Mars missions") keep the original legacy
// category-tier formula magnitude, now made explicit instead of computed at
// runtime as a silent fallback.
export const EFFECTS_BY_ID: Record<string, ResearchEffect[]> = {
  reusable_boosters: [{ type: 'buildCost', magnitude: 0.3 }],
  rapid_launch_cadence: [{ type: 'buildSpeed', magnitude: 0.3 }],
  methane_engines: [{ type: 'travelSpeed', magnitude: 0.25 }],
  super_heavy_lift: [{ type: 'buildCost', magnitude: 0.06 }],
  fairing_recovery: [{ type: 'buildCost', magnitude: 0.15 }],
  orbital_refueling: [{ type: 'buildCost', magnitude: 0.06 }],
  nuclear_thermal: [{ type: 'travelSpeed', magnitude: 0.3 }],
  launch_abort_systems: [{ type: 'hazardResistance', magnitude: 0.2 }],
  propellant_depots: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  mass_driver: [{ type: 'buildCost', magnitude: 0.08 }],
  space_elevator_cable: [{ type: 'buildCost', magnitude: 0.3 }],
  fusion_drive: [{ type: 'travelSpeed', magnitude: 0.3 }],
  rotating_detonation: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  metallic_hydrogen: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  launch_site_optimization: [{ type: 'buildSpeed', magnitude: 0.2 }],
  modular_spacecraft: [{ type: 'maintenance', magnitude: 0.02 }],
  autonomous_docking: [{ type: 'buildSpeed', magnitude: 0.2 }],
  life_support_recycling: [{ type: 'maintenance', magnitude: 0.3 }],
  radiation_shielding: [{ type: 'maintenance', magnitude: 0.06 }],
  interplanetary_cruisers: [{ type: 'maintenance', magnitude: 0.06 }],
  self_repair: [{ type: 'maintenance', magnitude: 0.3 }],
  generation_ships: [{ type: 'maintenance', magnitude: 0.1 }],
  hull_composites: [{ type: 'buildCost', magnitude: 0.1 }],
  cryo_hibernation: [{ type: 'maintenance', magnitude: 0.3 }],
  artificial_gravity: [{ type: 'crewMorale', magnitude: 0.3 }],
  debris_avoidance: [{ type: 'hazardResistance', magnitude: 0.3 }],
  spacecraft_armor: [{ type: 'hazardResistance', magnitude: 0.3 }],
  emergency_escape: [{ type: 'hazardResistance', magnitude: 0.3 }],
  thermal_management_adv: [{ type: 'maintenance', magnitude: 0.25 }],
  modular_cargo: [{ type: 'buildCost', magnitude: 0.2 }],
  inflatable_habitats: [{ type: 'buildCost', magnitude: 0.3 }],
  nuclear_power_spacecraft: [{ type: 'revenue', magnitude: 0.3 }],
  laser_comm_relay: [{ type: 'revenue', magnitude: 0.3 }],
  high_res_optical: [{ type: 'revenue', magnitude: 0.3 }],
  sar_imaging: [{ type: 'revenue', magnitude: 0.3 }],
  multispectral_imaging: [{ type: 'revenue', magnitude: 0.3 }],
  hyperspectral: [{ type: 'revenue', magnitude: 0.042 }, { type: 'research', magnitude: 0.018 }],
  lidar_systems: [{ type: 'mining', magnitude: 0.25 }],
  quantum_sensors: [{ type: 'revenue', magnitude: 0.3 }],
  gravity_gradiometer: [{ type: 'revenue', magnitude: 0.042 }, { type: 'research', magnitude: 0.018 }],
  magnetometer_array: [{ type: 'mining', magnitude: 0.2 }],
  infrared_telescope: [{ type: 'mining', magnitude: 0.3 }],
  neutrino_detector: [{ type: 'revenue', magnitude: 0.056 }, { type: 'research', magnitude: 0.024 }],
  space_weather_monitoring: [{ type: 'hazardResistance', magnitude: 0.3 }],
  rf_spectrum_sensing: [{ type: 'revenue', magnitude: 0.2 }],
  autonomous_survey: [{ type: 'buildSpeed', magnitude: 0.3 }, { type: 'mining', magnitude: 0.3 }],
  gravitational_wave_det: [{ type: 'revenue', magnitude: 0.07 }, { type: 'research', magnitude: 0.03 }],
  adaptive_optics: [{ type: 'revenue', magnitude: 0.3 }],
  rad_hard_processors: [{ type: 'research', magnitude: 0.014 }, { type: 'revenue', magnitude: 0.006 }],
  edge_ai: [{ type: 'revenue', magnitude: 0.3 }],
  neuromorphic_chips: [{ type: 'revenue', magnitude: 0.3 }],
  quantum_coprocessors: [{ type: 'revenue', magnitude: 0.3 }],
  fpga_reconfigurable: [{ type: 'research', magnitude: 0.15 }],
  optical_computing: [{ type: 'research', magnitude: 0.3 }],
  swarm_ai: [{ type: 'maintenance', magnitude: 0.3 }],
  predictive_maintenance: [{ type: 'maintenance', magnitude: 0.25 }],
  autonomous_ops: [{ type: 'maintenance', magnitude: 0.3 }],
  quantum_ml: [{ type: 'research', magnitude: 0.3 }],
  digital_twin: [{ type: 'buildSpeed', magnitude: 0.2 }],
  cybersecurity_adv: [{ type: 'hazardResistance', magnitude: 0.2 }],
  data_compression: [{ type: 'revenue', magnitude: 0.3 }],
  mission_planning_ai: [{ type: 'travelSpeed', magnitude: 0.15 }],
  parallel_research: [{ type: 'research', magnitude: 0.042 }, { type: 'revenue', magnitude: 0.018 }],
  improved_cooling: [{ type: 'maintenance', magnitude: 0.15 }],
  high_power_comms: [{ type: 'revenue', magnitude: 0.3 }],
  compact_power: [{ type: 'buildCost', magnitude: 0.3 }],
  swarm_intelligence: [{ type: 'revenue', magnitude: 0.3 }],
  electric_propulsion_sat: [{ type: 'maintenance', magnitude: 0.3 }],
  inter_satellite_links: [{ type: 'revenue', magnitude: 0.3 }],
  on_orbit_servicing: [{ type: 'maintenance', magnitude: 0.3 }],
  mega_constellation: [{ type: 'revenue', magnitude: 0.3 }],
  v_band_comms: [{ type: 'revenue', magnitude: 0.3 }],
  flat_panel_antenna: [{ type: 'revenue', magnitude: 0.3 }],
  satellite_deorbit: [{ type: 'insuranceDiscount', magnitude: 0.1 }],
  software_defined_sat: [{ type: 'revenue', magnitude: 0.3 }],
  optical_intersatlinks: [{ type: 'revenue', magnitude: 0.3 }],
  satellite_formation: [{ type: 'revenue', magnitude: 0.3 }],
  space_debris_cleanup: [{ type: 'revenue', magnitude: 0.06 }],
  triple_junction: [{ type: 'revenue', magnitude: 0.2 }],
  perovskite_tandem: [{ type: 'revenue', magnitude: 0.3 }, { type: 'buildCost', magnitude: 0.3 }],
  beamed_power: [{ type: 'revenue', magnitude: 0.08 }],
  concentrator_solar: [{ type: 'revenue', magnitude: 0.3 }],
  solar_sail_power: [{ type: 'revenue', magnitude: 0.06 }],
  fission_surface_power: [{ type: 'revenue', magnitude: 0.3 }],
  fusion_reactor: [{ type: 'revenue', magnitude: 0.3 }],
  battery_advanced: [{ type: 'maintenance', magnitude: 0.3 }],
  wireless_power_transfer: [{ type: 'revenue', magnitude: 0.06 }],
  rtg_enhanced: [{ type: 'revenue', magnitude: 0.3 }],
  energy_harvesting: [{ type: 'revenue', magnitude: 0.1 }],
  superconducting_grid: [{ type: 'maintenance', magnitude: 0.2 }],
  antimatter_reactor: [{ type: 'revenue', magnitude: 0.1 }],
  space_based_solar_power: [{ type: 'revenue', magnitude: 0.08 }],
  resource_prospecting: [{ type: 'mining', magnitude: 0.02 }],
  regolith_processing: [{ type: 'mining', magnitude: 0.3 }],
  asteroid_capture: [{ type: 'mining', magnitude: 0.06 }],
  deep_drilling: [{ type: 'mining', magnitude: 0.3 }],
  automated_mining_fleet: [{ type: 'mining', magnitude: 0.3 }],
  isru_water: [{ type: 'mining', magnitude: 0.02 }],
  isru_oxygen: [{ type: 'maintenance', magnitude: 0.3 }],
  isru_metals: [{ type: 'mining', magnitude: 0.3 }],
  electrochemical_mining: [{ type: 'mining', magnitude: 0.3 }],
  solar_thermal_mining: [{ type: 'mining', magnitude: 0.3 }],
  bioleaching: [{ type: 'mining', magnitude: 0.25 }],
  plasma_processing: [{ type: 'mining', magnitude: 0.3 }],
  cryogenic_mining: [{ type: 'mining', magnitude: 0.08 }],
  subsurface_radar: [{ type: 'mining', magnitude: 0.3 }],
  autonomous_excavation: [{ type: 'maintenance', magnitude: 0.3 }],
  magnetic_separation: [{ type: 'mining', magnitude: 0.3 }],
  zero_g_refining: [{ type: 'mining', magnitude: 0.3 }],
  self_replicating_miners: [{ type: 'mining', magnitude: 0.1 }],
  orbital_assembly: [{ type: 'maintenance', magnitude: 0.01 }, { type: 'buildSpeed', magnitude: 0.01 }],
  rotating_habitats: [{ type: 'buildCost', magnitude: 0.3 }],
  mega_structures: [{ type: 'buildCost', magnitude: 0.3 }],
  space_dock: [{ type: 'buildSpeed', magnitude: 0.2 }],
  lunar_base_design: [{ type: 'maintenance', magnitude: 0.02 }, { type: 'buildSpeed', magnitude: 0.02 }],
  mars_base_design: [{ type: 'maintenance', magnitude: 0.03 }, { type: 'buildSpeed', magnitude: 0.03 }],
  lava_tube_habitats: [{ type: 'buildCost', magnitude: 0.3 }],
  space_elevator_design: [{ type: 'maintenance', magnitude: 0.05 }, { type: 'buildSpeed', magnitude: 0.05 }],
  orbital_ring: [{ type: 'buildCost', magnitude: 0.3 }],
  modular_station: [{ type: 'maintenance', magnitude: 0.02 }, { type: 'buildSpeed', magnitude: 0.02 }],
  pressurized_rovers: [{ type: 'mining', magnitude: 0.3 }],
  '3d_printing_space': [{ type: 'buildCost', magnitude: 0.3 }],
  atmospheric_processing: [{ type: 'maintenance', magnitude: 0.03 }, { type: 'buildSpeed', magnitude: 0.03 }],
  radiation_hardening: [{ type: 'maintenance', magnitude: 0.03 }, { type: 'buildSpeed', magnitude: 0.03 }],
  extreme_thermal: [{ type: 'maintenance', magnitude: 0.03 }, { type: 'buildSpeed', magnitude: 0.03 }],
  cryogenic_systems: [{ type: 'maintenance', magnitude: 0.04 }, { type: 'buildSpeed', magnitude: 0.04 }],
  ion_drives: [{ type: 'travelSpeed', magnitude: 0.3 }],
  hall_thrusters: [{ type: 'maintenance', magnitude: 0.2 }],
  vasimr: [{ type: 'travelSpeed', magnitude: 0.3 }],
  solar_sails_adv: [{ type: 'buildCost', magnitude: 0.04 }, { type: 'buildSpeed', magnitude: 0.04 }],
  antimatter_propulsion: [{ type: 'buildCost', magnitude: 0.05 }, { type: 'buildSpeed', magnitude: 0.05 }],
  jump_drive: [{ type: 'buildCost', magnitude: 0.05 }, { type: 'buildSpeed', magnitude: 0.05 }],
  exotic_matter_refining: [{ type: 'mining', magnitude: 0.05 }, { type: 'maintenance', magnitude: 0.05 }],
  heavy_radiation_shielding: [{ type: 'expeditionRisk', magnitude: 0.25 }],
  interstellar_colonization: [{ type: 'revenue', magnitude: 0.05 }, { type: 'mining', magnitude: 0.05 }],
  mpd_thruster: [{ type: 'travelSpeed', magnitude: 0.3 }],
  nuclear_electric: [{ type: 'travelSpeed', magnitude: 0.3 }],
  laser_propulsion: [{ type: 'buildCost', magnitude: 0.04 }, { type: 'buildSpeed', magnitude: 0.04 }],
  magnetic_sail: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  aerocapture: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  gravity_assist_ai: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  pulse_detonation: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  plasma_thruster: [{ type: 'travelSpeed', magnitude: 0.3 }],
  fission_fragment: [{ type: 'buildCost', magnitude: 0.05 }, { type: 'buildSpeed', magnitude: 0.05 }],
  crew_training: [{ type: 'buildSpeed', magnitude: 0.2 }],
  space_medicine: [{ type: 'crewMorale', magnitude: 0.3 }],
  crew_rotation: [{ type: 'maintenance', magnitude: 0.25 }],
  robotic_assistants: [{ type: 'maintenance', magnitude: 0.3 }],
  space_nutrition: [{ type: 'maintenance', magnitude: 0.2 }],
  psychology_support: [{ type: 'crewMorale', magnitude: 0.3 }],
  eva_suits_advanced: [{ type: 'buildSpeed', magnitude: 0.3 }],
  bioregenerative_lss: [{ type: 'maintenance', magnitude: 0.3 }],
  zero_g_fitness: [{ type: 'crewMorale', magnitude: 0.1 }],
  crew_augmentation: [{ type: 'buildSpeed', magnitude: 0.3 }],
  space_agriculture: [{ type: 'buildCost', magnitude: 0.3 }],
  autonomous_hab_mgmt: [{ type: 'maintenance', magnitude: 0.3 }],
  space_construction_crew: [{ type: 'buildSpeed', magnitude: 0.2 }],
  remote_telepresence: [{ type: 'buildSpeed', magnitude: 0.3 }],
  space_tourism_ops: [{ type: 'revenue', magnitude: 0.02 }],
  orbital_advertising: [{ type: 'revenue', magnitude: 0.1 }],
  space_burial: [{ type: 'revenue', magnitude: 0.02 }],
  microgravity_research: [{ type: 'revenue', magnitude: 0.3 }],
  satellite_as_service: [{ type: 'revenue', magnitude: 0.3 }],
  data_analytics_service: [{ type: 'revenue', magnitude: 0.3 }],
  space_manufacturing: [{ type: 'revenue', magnitude: 0.3 }],
  space_logistics: [{ type: 'maintenance', magnitude: 0.25 }],
  space_insurance_tech: [{ type: 'insuranceDiscount', magnitude: 0.2 }],
  debris_tracking_svc: [{ type: 'revenue', magnitude: 0.04 }],
  lunar_tourism: [{ type: 'revenue', magnitude: 0.3 }],
  space_entertainment: [{ type: 'revenue', magnitude: 0.2 }],
  propellant_trading: [{ type: 'revenue', magnitude: 0.3 }],
  space_law: [{ type: 'maintenance', magnitude: 0.3 }],
  orbital_hotel: [{ type: 'revenue', magnitude: 0.3 }],
  cargo_optimization: [{ type: 'buildCost', magnitude: 0.15 }],
  ship_automation: [{ type: 'maintenance', magnitude: 0.3 }],
  mining_laser: [{ type: 'mining', magnitude: 0.3 }],
  heavy_hauler_design: [{ type: 'buildCost', magnitude: 0.3 }],
  tanker_efficiency: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  ship_armor: [{ type: 'hazardResistance', magnitude: 0.3 }],
  fleet_coordination: [{ type: 'buildSpeed', magnitude: 0.25 }],
  survey_probe_adv: [{ type: 'mining', magnitude: 0.3 }, { type: 'revenue', magnitude: 0.3 }],
  mining_drone_swarm: [{ type: 'mining', magnitude: 0.3 }],
  ship_recycling: [{ type: 'revenue', magnitude: 0.3 }],
  tug_design: [{ type: 'buildSpeed', magnitude: 0.02 }, { type: 'mining', magnitude: 0.02 }],
  deep_space_nav: [{ type: 'travelSpeed', magnitude: 0.3 }],
  ship_manufacturing: [{ type: 'buildCost', magnitude: 0.3 }],
  nuclear_ship: [{ type: 'fuelEfficiency', magnitude: 0.3 }],
  interstellar_probe: [{ type: 'buildSpeed', magnitude: 0.05 }, { type: 'mining', magnitude: 0.05 }],
  atmospheric_analysis: [{ type: 'revenue', magnitude: 0.03 }, { type: 'mining', magnitude: 0.03 }],
  greenhouse_engineering: [{ type: 'revenue', magnitude: 0.25 }],
  mars_warming: [{ type: 'revenue', magnitude: 0.3 }],
  oxygen_production: [{ type: 'revenue', magnitude: 0.3 }],
  soil_creation: [{ type: 'revenue', magnitude: 0.3 }],
  dome_construction: [{ type: 'buildCost', magnitude: 0.3 }],
  magnetic_shield: [{ type: 'revenue', magnitude: 0.05 }, { type: 'mining', magnitude: 0.05 }],
  ocean_seeding: [{ type: 'revenue', magnitude: 0.05 }, { type: 'mining', magnitude: 0.05 }],
  biosphere_engineering: [{ type: 'maintenance', magnitude: 0.3 }],
  paraterraforming: [{ type: 'buildCost', magnitude: 0.3 }],
  carbon_nanotubes: [{ type: 'buildCost', magnitude: 0.2 }],
  metamaterials: [{ type: 'revenue', magnitude: 0.3 }],
  aerogel_insulation: [{ type: 'maintenance', magnitude: 0.2 }],
  self_healing_materials: [{ type: 'maintenance', magnitude: 0.3 }],
  lunar_concrete: [{ type: 'buildCost', magnitude: 0.3 }],
  radiation_shielding_mat: [{ type: 'hazardResistance', magnitude: 0.3 }],
  high_temp_alloys: [{ type: 'mining', magnitude: 0.03 }, { type: 'maintenance', magnitude: 0.03 }],
  graphene_production: [{ type: 'revenue', magnitude: 0.3 }],
  superconductors: [{ type: 'mining', magnitude: 0.04 }, { type: 'maintenance', magnitude: 0.04 }],
  programmable_matter: [{ type: 'mining', magnitude: 0.05 }, { type: 'maintenance', magnitude: 0.05 }],
  collision_avoidance: [{ type: 'hazardResistance', magnitude: 0.3 }],
  asteroid_deflection: [{ type: 'maintenance', magnitude: 0.06 }],
  solar_storm_protection: [{ type: 'hazardResistance', magnitude: 0.3 }],
  debris_shield_active: [{ type: 'hazardResistance', magnitude: 0.3 }],
  hardened_electronics: [{ type: 'hazardResistance', magnitude: 0.3 }],
  emergency_response: [{ type: 'hazardResistance', magnitude: 0.3 }],
  nuclear_deflection: [{ type: 'maintenance', magnitude: 0.08 }],
  space_situational: [{ type: 'revenue', magnitude: 0.2 }],
  cyber_defense: [{ type: 'hazardResistance', magnitude: 0.3 }],
  gravity_tractor: [{ type: 'maintenance', magnitude: 0.06 }],
  signals_intelligence: [{ type: 'maintenance', magnitude: 0.04 }],
  corporate_infiltration: [{ type: 'maintenance', magnitude: 0.04 }],
  psychological_operations: [{ type: 'maintenance', magnitude: 0.06 }],
  talent_acquisition: [{ type: 'maintenance', magnitude: 0.06 }],
  deep_space_surveillance: [{ type: 'buildSpeed', magnitude: 0.04 }],
  counterintelligence_ops: [{ type: 'buildSpeed', magnitude: 0.04 }],
  cyber_warfare_suite: [{ type: 'buildSpeed', magnitude: 0.04 }],
  quantum_cryptanalysis: [{ type: 'buildSpeed', magnitude: 0.04 }],
  intelligence_directorate: [{ type: 'buildSpeed', magnitude: 0.06 }],
  sample_return: [{ type: 'revenue', magnitude: 0.3 }],
  landing_precision: [{ type: 'buildSpeed', magnitude: 0.3 }],
  subsurface_exploration: [{ type: 'mining', magnitude: 0.04 }, { type: 'revenue', magnitude: 0.04 }],
  ocean_exploration: [{ type: 'mining', magnitude: 0.04 }, { type: 'revenue', magnitude: 0.04 }],
  rover_autonomy: [{ type: 'mining', magnitude: 0.3 }],
  aerial_exploration: [{ type: 'mining', magnitude: 0.3 }],
  jupiter_deep_probe: [{ type: 'mining', magnitude: 0.04 }, { type: 'revenue', magnitude: 0.04 }],
  kuiper_belt_survey: [{ type: 'mining', magnitude: 0.3 }],
  cometary_mining: [{ type: 'mining', magnitude: 0.03 }, { type: 'revenue', magnitude: 0.03 }],
  oort_cloud_probe: [{ type: 'mining', magnitude: 0.05 }, { type: 'revenue', magnitude: 0.05 }],
  ice_penetrator: [{ type: 'mining', magnitude: 0.04 }, { type: 'revenue', magnitude: 0.04 }],
  volcano_monitoring: [{ type: 'revenue', magnitude: 0.3 }],
  exoplanet_survey: [{ type: 'mining', magnitude: 0.05 }, { type: 'revenue', magnitude: 0.05 }],
  market_analytics: [{ type: 'revenue', magnitude: 0.15 }],
  supply_chain_opt: [{ type: 'maintenance', magnitude: 0.2 }],
  futures_trading: [{ type: 'revenue', magnitude: 0.25 }],
  currency_system: [{ type: 'maintenance', magnitude: 0.15 }],
  automated_trading: [{ type: 'revenue', magnitude: 0.3 }],
  monopoly_economics: [{ type: 'revenue', magnitude: 0.25 }],
  tech_licensing: [{ type: 'revenue', magnitude: 0.02 }, { type: 'maintenance', magnitude: 0.02 }],
  insurance_modeling: [{ type: 'insuranceDiscount', magnitude: 0.25 }],
  venture_capital: [{ type: 'revenue', magnitude: 0.1 }],
  tax_optimization: [{ type: 'buildCost', magnitude: 0.1 }],
  brand_management: [{ type: 'revenue', magnitude: 0.1 }],
  merger_acquisition: [{ type: 'revenue', magnitude: 0.04 }, { type: 'maintenance', magnitude: 0.04 }],
  photon_sail_station_keeping: [{ type: 'maintenance', magnitude: 0.1 }],
  aerostat_technology: [{ type: 'mining', magnitude: 0.03 }, { type: 'revenue', magnitude: 0.03 }],

  // ─── Waves W3+W10 additions (4X_BASELINE Part 2a Op4/Op5) ────────────────
  // Doctrine choices (Op4) — magnitudes match each tech's flavor exactly.
  crewed_forward_doctrine: [{ type: 'maintenance', magnitude: 0.15 }, { type: 'crewMorale', magnitude: 0.1 }],
  robotic_forward_doctrine: [{ type: 'buildSpeed', magnitude: 0.15 }, { type: 'maintenance', magnitude: 0.1 }],
  proprietary_research_doctrine: [{ type: 'research', magnitude: 0.15 }],
  open_science_doctrine: [{ type: 'revenue', magnitude: 0.1 }, { type: 'maintenance', magnitude: 0.1 }],
  // Repeatable programs (Op5) — per-level magnitude (0.02 = doc's "+2% per
  // level"); getResearchBonuses multiplies this by levels completed, not
  // resolveEffects (repeatables never enter completedResearchIds), but the
  // entry here still drives getResearchMechanicalEffect's per-level display.
  launch_cadence_optimization: [{ type: 'buildSpeed', magnitude: 0.02 }],
  yield_learning_curve_program: [{ type: 'mining', magnitude: 0.02 }],
  ops_automation_program: [{ type: 'maintenance', magnitude: 0.02 }],
  radiation_hardening_program: [{ type: 'hazardResistance', magnitude: 0.02 }],
  logistics_research_program: [{ type: 'travelSpeed', magnitude: 0.02 }],
  deep_space_network_expansion: [{ type: 'revenue', magnitude: 0.02 }],
  // Rare techs (Op5) — magnitudes match each tech's flavor exactly.
  europan_biochemistry: [{ type: 'mining', magnitude: 0.2 }, { type: 'revenue', magnitude: 0.15 }],
  xenobiochemistry: [{ type: 'mining', magnitude: 0.25 }],
  deep_biosphere_ecology: [{ type: 'mining', magnitude: 0.2 }, { type: 'hazardResistance', magnitude: 0.1 }],
  iso_materials_analysis: [{ type: 'mining', magnitude: 0.2 }, { type: 'research', magnitude: 0.15 }],
  precursor_studies: [{ type: 'research', magnitude: 0.2 }, { type: 'revenue', magnitude: 0.1 }],
  vacuum_metallurgy_breakthrough: [{ type: 'buildCost', magnitude: 0.2 }, { type: 'maintenance', magnitude: 0.1 }],
  hive_pattern_mathematics: [{ type: 'research', magnitude: 0.25 }],
  metric_engineering_refinements: [{ type: 'travelSpeed', magnitude: 0.25 }, { type: 'fuelEfficiency', magnitude: 0.15 }],
  // ─── Wave E3 new techs (docs/ECONOMY_PVP_2026-08.md §4.3) — effects on the
  // new supply chains, wired through the same authored-effects system.
  // Primary value of all three is their gate (recipe/building unlocks);
  // magnitudes stay modest per PER_EFFECT_CAP discipline.
  sabatier_process: [{ type: 'fuelEfficiency', magnitude: 0.10 }],
  orbital_refining_complex: [{ type: 'mining', magnitude: 0.05 }, { type: 'maintenance', magnitude: 0.05 }],
  hydroponic_agriculture: [{ type: 'consumptionReduction', magnitude: 0.10 }],
};

// Apply real-time durations and resource costs
export const RESEARCH: ResearchDefinition[] = RAW_RESEARCH.map(r => {
  const resCost = TIER_RESEARCH_RESOURCES[r.tier] || {};
  return {
    ...r,
    realResearchSeconds: TIER_RESEARCH_SECONDS[r.tier] || 600,
    resourceCost: Object.keys(resCost).length > 0 ? resCost : undefined,
    // W1 effect-authoring pass: every tech's hand-authored effects, keyed by
    // id. resolveEffects() below reads def.effects first (precedence over
    // the flavor-text parser) — see EFFECTS_BY_ID above.
    effects: EFFECTS_BY_ID[r.id],
  };
});

export const RESEARCH_MAP = new Map(RESEARCH.map(r => [r.id, r]));

// ─── Research Effects (per-research custom bonuses) ────────────────────────
// As of the W1 effect-authoring pass, every one of the 254 techs above has an
// explicit effects[] entry in EFFECTS_BY_ID (hand-authored, reviewed against
// flavor text). ResearchEffectType/ResearchEffect now live in types.ts (see
// the re-export at the top of this file) since ResearchDefinition.effects
// needs the type. The flavor-text keyword parser below (inferEffectsFromFlavor)
// remains as a fallback ONLY for future/legacy content that lacks authored
// effects — resolveEffects() always checks def.effects first.

/** Max per-effect magnitude. Hyperbolic flavor like "+200%" is capped here.
 *  Exported for tests (property test: every authored EFFECTS_BY_ID magnitude
 *  must be <= this). */
export const PER_EFFECT_CAP = 0.30;

/**
 * Parse flavor text into structured effects. Handles the common patterns:
 *   "-15% per-launch cost"        → [{ buildCost, 0.15 }]
 *   "+30% revenue from sensors"   → [{ revenue, 0.30 }]
 *   "Double research speed"       → [{ research, 0.30 }] (capped)
 *   "Enables Venus cloud colonies" (no numeric) → [] (gate-only, category fallback used)
 */
export function inferEffectsFromFlavor(effectText: string): ResearchEffect[] {
  if (!effectText) return [];
  const lower = effectText.toLowerCase();
  const effects: ResearchEffect[] = [];

  // Keyword → effect-type map. Order matters — specific before generic.
  const keywordTypes: Array<[string[], ResearchEffectType]> = [
    [['research speed', 'research rate', 'r&d speed', 'faster research', 'parallel'], 'research'],
    [['mining yield', 'mining rate', 'mining output', 'extraction', 'yield', 'deposit'], 'mining'],
    [['build speed', 'construction speed', 'faster build', 'build time', 'construction time'], 'buildSpeed'],
    [['launch cost', 'building cost', 'construction cost', 'per-unit cost', 'manufacturing cost', 'ship cost', 'spacecraft cost', 'hardware cost'], 'buildCost'],
    [['maintenance', 'upkeep', 'operating cost', 'crew comfort', 'crew survival', 'reliability', 'radiation damage', 'wear', 'durability', 'life support', 'insurance cost', 'shielding'], 'maintenance'],
    [['revenue', 'income', 'profit', 'earnings', 'sales', 'customer', 'broadband', 'data rate', 'throughput', 'service quality'], 'revenue'],
    // generic 'cost' falls to buildCost
    [['cost'], 'buildCost'],
    // generic 'speed' falls to buildSpeed
    [['speed'], 'buildSpeed'],
  ];

  let type: ResearchEffectType | null = null;
  for (const [keywords, t] of keywordTypes) {
    if (keywords.some(k => lower.includes(k))) { type = t; break; }
  }
  if (type === null) return [];

  // Number extraction.
  //   "-15%" → 15
  //   "+200%" → 200 (will be capped)
  //   "double" → 100  "triple" → 200  "half" → 50
  //   "2x" / "3x" → 100 / 200 (× multiplier minus 1 × 100)
  let magnitudePct: number | null = null;
  const pctMatch = effectText.match(/([+-]?\d+(?:\.\d+)?)%/);
  if (pctMatch) {
    magnitudePct = Math.abs(parseFloat(pctMatch[1]));
  } else if (lower.includes('double')) {
    magnitudePct = 100;
  } else if (lower.includes('triple')) {
    magnitudePct = 200;
  } else if (lower.includes('half') || lower.includes('halved')) {
    magnitudePct = 50;
  } else {
    const xMatch = effectText.match(/(\d+(?:\.\d+)?)[xX×]/);
    if (xMatch) magnitudePct = (parseFloat(xMatch[1]) - 1) * 100;
  }

  if (magnitudePct === null || magnitudePct <= 0) return [];

  const magnitude = Math.min(PER_EFFECT_CAP, magnitudePct / 100);
  effects.push({ type, magnitude });
  return effects;
}

/**
 * Resolve the final effect list for a research. If `def.effects` is set
 * explicitly, use it. Otherwise infer from flavor text. If the flavor yields
 * nothing, fall back to the legacy category-tier formula so no research is
 * ever completely silent.
 */
function resolveEffects(def: ResearchDefinition): ResearchEffect[] {
  // Explicit effects field (future) — use as-is, clamp magnitudes.
  const explicit = (def as ResearchDefinition & { effects?: ResearchEffect[] }).effects;
  if (explicit && explicit.length > 0) {
    return explicit.map(e => ({ type: e.type, magnitude: Math.min(PER_EFFECT_CAP, Math.max(0, e.magnitude)) }));
  }

  // Inferred from flavor text
  const inferred = inferEffectsFromFlavor(def.effect);
  if (inferred.length > 0) return inferred;

  // Legacy category-tier fallback (same formula as before this refactor)
  const tierBonus = def.tier * 0.02;
  const push = (type: ResearchEffectType, magnitude: number): ResearchEffect => ({ type, magnitude });
  switch (def.category) {
    case 'rocketry':             return [push('buildCost', tierBonus)];
    case 'propulsion':           return [push('buildCost', tierBonus * 0.5), push('buildSpeed', tierBonus * 0.5)];
    case 'mining':               return [push('mining', tierBonus)];
    case 'materials':            return [push('mining', tierBonus * 0.5), push('maintenance', tierBonus * 0.5)];
    case 'spacecraft':           return [push('maintenance', tierBonus)];
    case 'infrastructure':       return [push('maintenance', tierBonus * 0.5), push('buildSpeed', tierBonus * 0.5)];
    case 'solar_arrays':         return [push('revenue', tierBonus)];
    case 'services':             return [push('revenue', tierBonus)];
    case 'economy':              return [push('revenue', tierBonus * 0.5), push('maintenance', tierBonus * 0.5)];
    case 'sensors':              return [push('revenue', tierBonus * 0.7), push('research', tierBonus * 0.3)];
    case 'ai_chips':             return [push('research', tierBonus * 0.7), push('revenue', tierBonus * 0.3)];
    case 'satellite_components': return [push('revenue', tierBonus)];
    case 'crew':                 return [push('buildSpeed', tierBonus * 0.5), push('maintenance', tierBonus * 0.5)];
    case 'ships':                return [push('buildSpeed', tierBonus * 0.5), push('mining', tierBonus * 0.5)];
    case 'defense':              return [push('maintenance', tierBonus)];
    case 'exploration':          return [push('mining', tierBonus * 0.5), push('revenue', tierBonus * 0.5)];
    case 'terraforming':         return [push('revenue', tierBonus * 0.5), push('mining', tierBonus * 0.5)];
    default:                     return [];
  }
}

// ─── Research Bonuses ────────────────────────────────────────────────────────

export interface ResearchBonuses {
  buildCostReduction: number;    // % less building cost
  buildSpeedBonus: number;       // % faster construction
  miningOutputBonus: number;     // % more resources from mining
  serviceRevenueBonus: number;   // % more service revenue
  researchSpeedBonus: number;    // % faster research
  maintenanceReduction: number;  // % less maintenance cost
  // ─── Added by the W1 effect-authoring pass (STATS_DESIGN §5 expansion) ───
  travelSpeedBonus: number;        // % faster ship transit (wired: game-engine.ts transitSpeedMult)
  insuranceDiscountBonus: number;  // % less monthly insurance premium (wired: game-engine.ts premium calc)
  hazardResistanceBonus: number;   // % less hazard damage, on top of ship/building mitigation (wired: game-engine.ts hazard post-processing)
  crewMoraleBonus: number;         // additive morale (0-1 scale) added post-hoc to the workforce writer (wired: game-engine.ts workforceOut)
  fuelEfficiencyBonus: number;     // % less fuel consumption — CONSUMED as of wave W14: cargo-logistics.ts
                                    // getFuelEfficiencyMultiplier multiplies every freight dispatch's Δv-priced
                                    // fuel bill by (1 − bonus), cap 50% (docs/4X_BASELINE_2026-08.md C1 / W14).
  consumptionReductionBonus: number; // Wave E3 (§4.1): % less building recipe input draw — CONSUMED by
                                    // consumption.ts processConsumptionForMonth (effective required inputs are
                                    // multiplied by (1 − bonus)); cap 0.40 per §4.1.
  expeditionRiskBonus: number;     // % less interstellar-expedition hazard damage — DECLARED/AGGREGATED, NOT YET
                                    // CONSUMED as a generic bucket: expeditions.ts currently only recognizes the
                                    // single hardcoded 'heavy_radiation_shielding' research id (HEAVY_SHIELDING_DAMAGE_REDUCTION);
                                    // generalizing that into this bucket is deeper expeditions.ts work, out of W1's
                                    // file scope (research-tree.ts + game-engine.ts only) — flagged for W6/W10.
}

/** Aggregate gameplay bonuses from all completed research */
export function getResearchBonuses(
  completedResearchIds: string[],
  repeatableLevels?: Record<string, number>,
): ResearchBonuses {
  let buildCostReduction = 0;
  let buildSpeedBonus = 0;
  let miningOutputBonus = 0;
  let serviceRevenueBonus = 0;
  let researchSpeedBonus = 0;
  let maintenanceReduction = 0;
  let travelSpeedBonus = 0;
  let insuranceDiscountBonus = 0;
  let hazardResistanceBonus = 0;
  let crewMoraleBonus = 0;
  let fuelEfficiencyBonus = 0;
  let consumptionReductionBonus = 0;
  let expeditionRiskBonus = 0;

  const applyEffect = (eff: ResearchEffect) => {
    switch (eff.type) {
      case 'buildCost':          buildCostReduction      += eff.magnitude; break;
      case 'buildSpeed':         buildSpeedBonus         += eff.magnitude; break;
      case 'mining':             miningOutputBonus       += eff.magnitude; break;
      case 'revenue':            serviceRevenueBonus     += eff.magnitude; break;
      case 'research':           researchSpeedBonus      += eff.magnitude; break;
      case 'maintenance':        maintenanceReduction    += eff.magnitude; break;
      case 'travelSpeed':        travelSpeedBonus        += eff.magnitude; break;
      case 'insuranceDiscount':  insuranceDiscountBonus  += eff.magnitude; break;
      case 'hazardResistance':   hazardResistanceBonus   += eff.magnitude; break;
      case 'crewMorale':         crewMoraleBonus         += eff.magnitude; break;
      case 'fuelEfficiency':     fuelEfficiencyBonus     += eff.magnitude; break;
      case 'consumptionReduction': consumptionReductionBonus += eff.magnitude; break;
      case 'expeditionRisk':     expeditionRiskBonus     += eff.magnitude; break;
    }
  };

  for (const resId of completedResearchIds) {
    const def = RESEARCH_MAP.get(resId);
    if (!def) continue;
    for (const eff of resolveEffects(def)) applyEffect(eff);
  }

  // W3 (4X_BASELINE Op5): repeatable program levels. These never appear in
  // completedResearchIds (see ResearchDefinition.repeatable doc comment), so
  // they're summed separately here — once per completed level, additive,
  // inside the SAME aggregate caps below (the doc's "fill toward the cap,
  // never past it" design; a maxed 5-level repeatable contributing 10% can't
  // push an already-capped bucket any higher than 50%/30%/etc.).
  if (repeatableLevels) {
    for (const [id, level] of Object.entries(repeatableLevels)) {
      if (!level || level <= 0) continue;
      const def = RESEARCH_MAP.get(id);
      if (!def?.repeatable) continue;
      const levels = Math.min(level, def.repeatable.maxLevel);
      for (let i = 0; i < levels; i++) {
        for (const eff of def.repeatable.effectPerLevel) applyEffect(eff);
      }
    }
  }

  return {
    buildCostReduction: Math.min(buildCostReduction, 0.50),    // Cap 50%
    buildSpeedBonus: Math.min(buildSpeedBonus, 0.50),          // Cap 50%
    miningOutputBonus: Math.min(miningOutputBonus, 1.0),       // Cap 100%
    serviceRevenueBonus: Math.min(serviceRevenueBonus, 0.50),  // Cap 50%
    researchSpeedBonus: Math.min(researchSpeedBonus, 0.50),    // Cap 50%
    maintenanceReduction: Math.min(maintenanceReduction, 0.50), // Cap 50%
    // BALANCE.md caps below follow the same "sinks > sources, no frictionless
    // stacking" thesis as the six above. hazardResistance/expeditionRisk are
    // deliberately capped lower (0.30, matching PER_EFFECT_CAP) to preserve
    // CLAUDE.md's "real risk" invariant — hazards.ts's own MITIGATION_CAP is
    // 0.90 and even that is a documented "don't fully delete the risk pillar"
    // compromise; research on top of ship/building mitigation must stay modest.
    travelSpeedBonus: Math.min(travelSpeedBonus, 0.50),           // Cap 50%
    insuranceDiscountBonus: Math.min(insuranceDiscountBonus, 0.40), // Cap 40%
    hazardResistanceBonus: Math.min(hazardResistanceBonus, 0.30),   // Cap 30% (risk pillar)
    crewMoraleBonus: Math.min(crewMoraleBonus, 0.30),               // Cap 0.30 on a 0-1 morale scale
    fuelEfficiencyBonus: Math.min(fuelEfficiencyBonus, 0.50),       // Cap 50% (consumed by cargo-logistics.ts freight pricing, W14)
    consumptionReductionBonus: Math.min(consumptionReductionBonus, 0.40), // Cap 40% (§4.1; consumed by consumption.ts, wave E3)
    expeditionRiskBonus: Math.min(expeditionRiskBonus, 0.30),       // Cap 30% (risk pillar; dormant as generic bucket — see interface comment)
  };
}

// ─── W3 (4X_BASELINE Op4) — Doctrine gates ──────────────────────────────────

/** True once ANY research listed in `def.excludes` has been completed — the
 *  doctrine-locked state. A locked research is still visible and still
 *  startable, just at the override price (`getDoctrineOverrideCost`). */
export function isDoctrineLocked(def: ResearchDefinition, completedResearchIds: string[]): boolean {
  if (!def.excludes || def.excludes.length === 0) return false;
  const completed = new Set(completedResearchIds);
  return def.excludes.some(id => completed.has(id));
}

/** The already-completed sibling responsible for locking `def`, if any —
 *  used to render "Doctrine locked — chose X" in the research UI. */
export function getDoctrineLockedBy(def: ResearchDefinition, completedResearchIds: string[]): ResearchDefinition | null {
  if (!def.excludes) return null;
  const completed = new Set(completedResearchIds);
  const lockId = def.excludes.find(id => completed.has(id));
  return lockId ? RESEARCH_MAP.get(lockId) || null : null;
}

/** Op4: "picking one locks the sibling for a real cost to unlock later (2x
 *  price + 6-month retooling), not forever." The 6-month surcharge is added
 *  to real-time duration proportionally to the tech's own month:real-second
 *  ratio, so higher-tier (longer) techs pay a proportionally longer retool. */
export function getDoctrineOverrideCost(def: ResearchDefinition): { money: number; realDurationSeconds: number; totalMonths: number } {
  const RETOOL_MONTHS = 6;
  const retoolSeconds = def.baseTimeMonths > 0
    ? Math.round((RETOOL_MONTHS / def.baseTimeMonths) * def.realResearchSeconds)
    : 0;
  return {
    money: def.baseCostMoney * 2,
    realDurationSeconds: def.realResearchSeconds + retoolSeconds,
    totalMonths: def.baseTimeMonths + RETOOL_MONTHS,
  };
}

// ─── W10 (4X_BASELINE Op5) — Rare-tech visibility ───────────────────────────

/** Rare techs (`def.rare`) are invisible until their id is granted into
 *  GameState.unlockedRareTechIds by a narrative chain (narrative-events.ts)
 *  or science-mission discovery (science-missions.ts). Non-rare techs are
 *  always visible — this is the single gate ResearchPanel and any
 *  research-start validation must check before showing/starting a tech. */
export function isRareTechVisible(def: ResearchDefinition, unlockedRareTechIds: string[] | undefined): boolean {
  if (!def.rare) return true;
  return !!unlockedRareTechIds && unlockedRareTechIds.includes(def.id);
}

// ─── W3 (4X_BASELINE Op5) — Repeatable programs ─────────────────────────────

/** Levels already completed for a repeatable program (0 if never started or
 *  not a repeatable). */
export function getRepeatableLevel(id: string, repeatableLevels: Record<string, number> | undefined): number {
  return repeatableLevels?.[id] || 0;
}

/** True once a repeatable has reached def.repeatable.maxLevel (the doc's
 *  cap-5 bound) — the only "completed"/hidden-forever state a repeatable
 *  has, since it never enters completedResearchIds before that. */
export function isRepeatableMaxed(def: ResearchDefinition, repeatableLevels: Record<string, number> | undefined): boolean {
  if (!def.repeatable) return false;
  return getRepeatableLevel(def.id, repeatableLevels) >= def.repeatable.maxLevel;
}

/** Cost/duration for the NEXT level of a repeatable, given levels already
 *  completed. Doc formula: money scales `costMultiplierPerLevel` (2.5) per
 *  level already completed; duration is left flat (cost, not time, is the
 *  doc's designated sink). */
export function getRepeatableNextCost(def: ResearchDefinition, currentLevel: number): { money: number; realDurationSeconds: number; totalMonths: number } {
  const mult = def.repeatable ? Math.pow(def.repeatable.costMultiplierPerLevel, currentLevel) : 1;
  return {
    money: Math.round(def.baseCostMoney * mult),
    realDurationSeconds: def.realResearchSeconds,
    totalMonths: def.baseTimeMonths,
  };
}

// ─── W3+W10 — Consolidated per-tech display/start state ───────────────────

/** Everything a research-UI list item (or a start-research validator) needs
 *  to know about one tech, given the player's current state. Single source
 *  of truth so the panel's rendering and handleStartResearch's charging
 *  logic can never drift apart. */
export interface ResearchDisplayState {
  /** false => hidden rare tech; don't render this item at all. */
  visible: boolean;
  /** Fully done — for a repeatable, means maxed out (isRepeatableMaxed). */
  completed: boolean;
  doctrineLocked: boolean;
  lockedBySiblingId?: string;
  /** 0 if not a repeatable. */
  repeatableLevel: number;
  effectiveMoneyCost: number;
  effectiveRealDurationSeconds: number;
  effectiveTotalMonths: number;
}

export function getResearchDisplayState(
  def: ResearchDefinition,
  state: { completedResearch: string[]; unlockedRareTechIds?: string[]; repeatableResearchLevels?: Record<string, number> },
): ResearchDisplayState {
  const visible = isRareTechVisible(def, state.unlockedRareTechIds);
  const repLevel = getRepeatableLevel(def.id, state.repeatableResearchLevels);
  const isRepeatable = !!def.repeatable;
  const completed = isRepeatable
    ? isRepeatableMaxed(def, state.repeatableResearchLevels)
    : state.completedResearch.includes(def.id);
  const lockedBy = !isRepeatable ? getDoctrineLockedBy(def, state.completedResearch) : null;
  const overrideCost = lockedBy ? getDoctrineOverrideCost(def) : null;
  const repCost = isRepeatable ? getRepeatableNextCost(def, repLevel) : null;

  return {
    visible,
    completed,
    doctrineLocked: !!lockedBy,
    lockedBySiblingId: lockedBy?.id,
    repeatableLevel: repLevel,
    effectiveMoneyCost: repCost ? repCost.money : (overrideCost ? overrideCost.money : def.baseCostMoney),
    effectiveRealDurationSeconds: repCost ? repCost.realDurationSeconds : (overrideCost ? overrideCost.realDurationSeconds : def.realResearchSeconds),
    effectiveTotalMonths: repCost ? repCost.totalMonths : (overrideCost ? overrideCost.totalMonths : def.baseTimeMonths),
  };
}

/**
 * Return a human-readable string describing the *actual mechanical* bonus a
 * single research grants, derived from its category + tier. The `effect`
 * field on each research definition is narrative flavor text; the real
 * in-game effect comes from the category bucket the research sits in.
 *
 * Display this alongside the flavor text so players can see what the research
 * actually does — answers the common "it says -15% launch cost but my costs
 * didn't move" confusion.
 */
export function getResearchMechanicalEffect(def: ResearchDefinition): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const effects = resolveEffects(def);
  if (effects.length === 0) return '—';
  return effects.map(e => {
    switch (e.type) {
      case 'buildCost':         return `-${pct(e.magnitude)} building cost`;
      case 'buildSpeed':        return `+${pct(e.magnitude)} build speed`;
      case 'mining':            return `+${pct(e.magnitude)} mining output`;
      case 'revenue':           return `+${pct(e.magnitude)} service revenue`;
      case 'research':          return `+${pct(e.magnitude)} research speed`;
      case 'maintenance':       return `-${pct(e.magnitude)} maintenance cost`;
      case 'travelSpeed':       return `+${pct(e.magnitude)} ship transit speed`;
      case 'insuranceDiscount': return `-${pct(e.magnitude)} insurance premium`;
      case 'hazardResistance':  return `-${pct(e.magnitude)} hazard damage`;
      case 'crewMorale':        return `+${pct(e.magnitude)} crew morale`;
      case 'fuelEfficiency':    return `-${pct(e.magnitude)} fuel consumption`;
      case 'consumptionReduction': return `-${pct(e.magnitude)} building input consumption`;
      case 'expeditionRisk':    return `-${pct(e.magnitude)} expedition hazard damage`;
    }
  }).join(' · ');
}

export const RESEARCH_CATEGORIES = [
  { id: 'rocketry', name: 'Rocketry', icon: '🚀' },
  { id: 'spacecraft', name: 'Spacecraft Design', icon: '🛸' },
  { id: 'sensors', name: 'Sensors & Remote Sensing', icon: '📡' },
  { id: 'ai_chips', name: 'Computing & AI', icon: '🧠' },
  { id: 'satellite_components', name: 'Satellite Systems', icon: '🛰️' },
  { id: 'solar_arrays', name: 'Energy & Power', icon: '⚡' },
  { id: 'mining', name: 'Mining & Extraction', icon: '⛏️' },
  { id: 'infrastructure', name: 'Infrastructure', icon: '🏗️' },
  { id: 'propulsion', name: 'Propulsion', icon: '💨' },
  { id: 'crew', name: 'Crew & Workforce', icon: '👨‍🚀' },
  { id: 'services', name: 'Services & Commerce', icon: '💼' },
  { id: 'ships', name: 'Ships & Fleet', icon: '🚢' },
  { id: 'terraforming', name: 'Terraforming', icon: '🌍' },
  { id: 'materials', name: 'Materials Science', icon: '🧱' },
  { id: 'defense', name: 'Defense & Safety', icon: '🛡️' },
  { id: 'exploration', name: 'Exploration', icon: '🔭' },
  { id: 'economy', name: 'Economy & Trade', icon: '📊' },
] as const;
