// ─── Space Tycoon: Personal Megastructures ──────────────────────────────────
// Massive personal construction projects that take days-weeks with multi-phase
// construction. Each phase grants interim bonuses, and completion unlocks
// permanent empire-wide modifiers. Max 1 phase under construction at a time.

import type { GameState } from './types';
import type { ResourceId } from './resources';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MegastructurePhase {
  name: string;
  durationSeconds: number;
  moneyCost: number;
  resourceCosts: Partial<Record<ResourceId, number>>;
  interimBonuses: MegastructureBonuses;
}

export interface MegastructureBonuses {
  revenueMultiplier?: number;        // e.g. 1.05 = +5% revenue
  maintenanceMultiplier?: number;    // e.g. 0.95 = -5% maintenance
  buildSpeedMultiplier?: number;     // e.g. 1.10 = +10% build speed
  researchSpeedMultiplier?: number;  // e.g. 1.10 = +10% research speed
  miningMultiplier?: number;         // e.g. 1.20 = +20% mining output
  passiveIncome?: number;            // $/month passive income
  passiveResources?: Partial<Record<ResourceId, number>>; // resources/month
}

export interface MegastructureDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  phases: MegastructurePhase[];
  prerequisites: {
    research: string[];
    minMoney: number;
    minBuildings: number;
    minLocations: number;
  };
  completionBonus: MegastructureBonuses;
}

export interface PersonalMegastructureInstance {
  definitionId: string;
  currentPhase: number;
  completedPhases: number;
  totalPhases: number;
  status: 'building' | 'paused' | 'complete';
  phaseStartedAtMs?: number;
  phaseDurationSeconds?: number;
  startedAtMs: number;
  completedAtMs?: number;
}

// ─── Definitions ────────────────────────────────────────────────────────────

export const MEGASTRUCTURES: MegastructureDefinition[] = [
  // 1. Orbital Ring — massive ring around Earth for cheap orbit access
  {
    id: 'orbital_ring',
    name: 'Orbital Ring',
    icon: '💫',
    description: 'A rigid ring encircling Earth in LEO, enabling near-zero-cost orbital launches and vastly expanded construction capacity.',
    phases: [
      {
        name: 'Ring Foundation Segments',
        durationSeconds: 14400, // 4 hours
        moneyCost: 50_000_000_000,
        resourceCosts: { iron: 2000, aluminum: 1000, titanium: 500 },
        interimBonuses: { buildSpeedMultiplier: 1.05 },
      },
      {
        name: 'Structural Assembly',
        durationSeconds: 28800, // 8 hours
        moneyCost: 80_000_000_000,
        resourceCosts: { iron: 3000, titanium: 800, rare_earth: 200 },
        interimBonuses: { buildSpeedMultiplier: 1.10, maintenanceMultiplier: 0.97 },
      },
      {
        name: 'Power & Transport Rails',
        durationSeconds: 43200, // 12 hours
        moneyCost: 120_000_000_000,
        resourceCosts: { titanium: 1000, rare_earth: 400, platinum_group: 100 },
        interimBonuses: { buildSpeedMultiplier: 1.15, maintenanceMultiplier: 0.95, revenueMultiplier: 1.05 },
      },
      {
        name: 'Ring Completion & Activation',
        durationSeconds: 57600, // 16 hours
        moneyCost: 200_000_000_000,
        resourceCosts: { titanium: 1500, exotic_materials: 10, helium3: 5 },
        interimBonuses: { buildSpeedMultiplier: 1.25, maintenanceMultiplier: 0.90, revenueMultiplier: 1.10 },
      },
    ],
    prerequisites: {
      research: ['orbital_assembly', 'space_elevator_cable'],
      minMoney: 50_000_000_000,
      minBuildings: 20,
      minLocations: 6,
    },
    completionBonus: {
      buildSpeedMultiplier: 1.30,
      maintenanceMultiplier: 0.85,
      revenueMultiplier: 1.15,
      passiveIncome: 100_000_000,
    },
  },

  // 2. Solar Power Array — massive orbital solar collector
  {
    id: 'solar_power_array',
    name: 'Solar Power Array',
    icon: '☀️',
    description: 'A vast network of orbital solar collectors beaming energy to your facilities across the solar system.',
    phases: [
      {
        name: 'Collector Panel Fabrication',
        durationSeconds: 10800, // 3 hours
        moneyCost: 30_000_000_000,
        resourceCosts: { aluminum: 800, rare_earth: 150, iron: 500 },
        interimBonuses: { maintenanceMultiplier: 0.97 },
      },
      {
        name: 'Orbital Deployment',
        durationSeconds: 21600, // 6 hours
        moneyCost: 50_000_000_000,
        resourceCosts: { titanium: 400, rare_earth: 250, aluminum: 1200 },
        interimBonuses: { maintenanceMultiplier: 0.93, revenueMultiplier: 1.05 },
      },
      {
        name: 'Power Transmission Grid',
        durationSeconds: 36000, // 10 hours
        moneyCost: 80_000_000_000,
        resourceCosts: { titanium: 600, platinum_group: 80, exotic_materials: 5 },
        interimBonuses: { maintenanceMultiplier: 0.88, revenueMultiplier: 1.10, passiveIncome: 30_000_000 },
      },
    ],
    prerequisites: {
      research: ['concentrator_solar', 'beamed_power'],
      minMoney: 30_000_000_000,
      minBuildings: 12,
      minLocations: 4,
    },
    completionBonus: {
      maintenanceMultiplier: 0.80,
      revenueMultiplier: 1.15,
      passiveIncome: 80_000_000,
    },
  },

  // 3. Asteroid Foundry — in-situ asteroid processing megafacility
  {
    id: 'asteroid_foundry',
    name: 'Asteroid Foundry',
    icon: '🔨',
    description: 'A colossal automated foundry in the asteroid belt that processes entire asteroids into refined materials at industrial scale.',
    phases: [
      {
        name: 'Capture Framework',
        durationSeconds: 14400, // 4 hours
        moneyCost: 40_000_000_000,
        resourceCosts: { iron: 3000, titanium: 600, aluminum: 1500 },
        interimBonuses: { miningMultiplier: 1.10 },
      },
      {
        name: 'Smelter Arrays',
        durationSeconds: 28800, // 8 hours
        moneyCost: 70_000_000_000,
        resourceCosts: { titanium: 1000, platinum_group: 50, rare_earth: 300 },
        interimBonuses: { miningMultiplier: 1.25, passiveResources: { iron: 200, titanium: 20 } },
      },
      {
        name: 'Refinery & Logistics',
        durationSeconds: 43200, // 12 hours
        moneyCost: 100_000_000_000,
        resourceCosts: { titanium: 1200, platinum_group: 100, exotic_materials: 8 },
        interimBonuses: { miningMultiplier: 1.40, passiveResources: { iron: 500, titanium: 50, rare_earth: 30 } },
      },
      {
        name: 'Full Automation',
        durationSeconds: 57600, // 16 hours
        moneyCost: 150_000_000_000,
        resourceCosts: { exotic_materials: 15, helium3: 8, platinum_group: 150 },
        interimBonuses: { miningMultiplier: 1.60, passiveResources: { iron: 1000, titanium: 100, rare_earth: 60, platinum_group: 15 } },
      },
    ],
    prerequisites: {
      research: ['asteroid_capture', 'automated_mining_fleet'],
      minMoney: 40_000_000_000,
      minBuildings: 15,
      minLocations: 5,
    },
    completionBonus: {
      miningMultiplier: 2.0,
      passiveResources: { iron: 1500, titanium: 150, rare_earth: 80, platinum_group: 25, gold: 10 },
    },
  },

  // 4. Helios Station — inner-system solar research mega-station
  {
    id: 'helios_station',
    name: 'Helios Station',
    icon: '🌟',
    description: 'A massive research station in close solar orbit, harnessing extreme energy for revolutionary scientific breakthroughs.',
    phases: [
      {
        name: 'Heat Shield Construction',
        durationSeconds: 18000, // 5 hours
        moneyCost: 60_000_000_000,
        resourceCosts: { titanium: 800, platinum_group: 60, rare_earth: 200 },
        interimBonuses: { researchSpeedMultiplier: 1.10 },
      },
      {
        name: 'Research Module Deployment',
        durationSeconds: 28800, // 8 hours
        moneyCost: 90_000_000_000,
        resourceCosts: { titanium: 1000, exotic_materials: 10, rare_earth: 400 },
        interimBonuses: { researchSpeedMultiplier: 1.25, revenueMultiplier: 1.05 },
      },
      {
        name: 'Solar Tap Integration',
        durationSeconds: 43200, // 12 hours
        moneyCost: 130_000_000_000,
        resourceCosts: { exotic_materials: 20, helium3: 10, platinum_group: 120 },
        interimBonuses: { researchSpeedMultiplier: 1.40, revenueMultiplier: 1.10, passiveIncome: 50_000_000 },
      },
    ],
    prerequisites: {
      research: ['nuclear_thermal', 'beamed_power'],
      minMoney: 60_000_000_000,
      minBuildings: 18,
      minLocations: 6,
    },
    completionBonus: {
      researchSpeedMultiplier: 1.50,
      revenueMultiplier: 1.12,
      passiveIncome: 120_000_000,
    },
  },

  // 5. Lunar Mass Driver — electromagnetic launcher on the Moon
  {
    id: 'lunar_mass_driver',
    name: 'Lunar Mass Driver',
    icon: '🌙',
    description: 'An electromagnetic catapult on the lunar surface that launches cargo into orbit at near-zero marginal cost.',
    phases: [
      {
        name: 'Rail Foundation',
        durationSeconds: 10800, // 3 hours
        moneyCost: 25_000_000_000,
        resourceCosts: { iron: 2000, aluminum: 800, titanium: 300 },
        interimBonuses: { buildSpeedMultiplier: 1.05 },
      },
      {
        name: 'Accelerator Coils',
        durationSeconds: 21600, // 6 hours
        moneyCost: 45_000_000_000,
        resourceCosts: { titanium: 600, rare_earth: 300, platinum_group: 40 },
        interimBonuses: { buildSpeedMultiplier: 1.10, maintenanceMultiplier: 0.95 },
      },
      {
        name: 'Power Plant & Control',
        durationSeconds: 36000, // 10 hours
        moneyCost: 70_000_000_000,
        resourceCosts: { titanium: 800, exotic_materials: 5, helium3: 3 },
        interimBonuses: { buildSpeedMultiplier: 1.15, maintenanceMultiplier: 0.90, miningMultiplier: 1.10 },
      },
      {
        name: 'Cargo Handling System',
        durationSeconds: 43200, // 12 hours
        moneyCost: 90_000_000_000,
        resourceCosts: { iron: 1500, titanium: 500, rare_earth: 200 },
        interimBonuses: { buildSpeedMultiplier: 1.20, maintenanceMultiplier: 0.85, miningMultiplier: 1.15 },
      },
      {
        name: 'Full Operational Capacity',
        durationSeconds: 57600, // 16 hours
        moneyCost: 120_000_000_000,
        resourceCosts: { exotic_materials: 10, platinum_group: 80, helium3: 5 },
        interimBonuses: { buildSpeedMultiplier: 1.25, maintenanceMultiplier: 0.80, miningMultiplier: 1.20, passiveIncome: 40_000_000 },
      },
    ],
    prerequisites: {
      research: ['mass_driver', 'resource_prospecting'],
      minMoney: 25_000_000_000,
      minBuildings: 10,
      minLocations: 4,
    },
    completionBonus: {
      buildSpeedMultiplier: 1.30,
      maintenanceMultiplier: 0.75,
      miningMultiplier: 1.25,
      passiveIncome: 80_000_000,
      passiveResources: { lunar_water: 200, iron: 300, aluminum: 150 },
    },
  },

  // 6. Mars Terraforming Engine — begin transforming Mars
  {
    id: 'mars_terraforming_engine',
    name: 'Mars Terraforming Engine',
    icon: '🔴',
    description: 'An atmospheric processor of unprecedented scale that will begin the centuries-long transformation of Mars into a habitable world.',
    phases: [
      {
        name: 'Atmospheric Processors',
        durationSeconds: 21600, // 6 hours
        moneyCost: 80_000_000_000,
        resourceCosts: { iron: 2500, titanium: 800, aluminum: 1500 },
        interimBonuses: { revenueMultiplier: 1.05 },
      },
      {
        name: 'Greenhouse Gas Factories',
        durationSeconds: 43200, // 12 hours
        moneyCost: 150_000_000_000,
        resourceCosts: { titanium: 1200, rare_earth: 500, methane: 1000 },
        interimBonuses: { revenueMultiplier: 1.10, miningMultiplier: 1.10 },
      },
      {
        name: 'Orbital Mirror Network',
        durationSeconds: 57600, // 16 hours
        moneyCost: 200_000_000_000,
        resourceCosts: { aluminum: 3000, platinum_group: 100, exotic_materials: 15 },
        interimBonuses: { revenueMultiplier: 1.15, miningMultiplier: 1.15, passiveIncome: 60_000_000 },
      },
      {
        name: 'Magnetic Shield Generator',
        durationSeconds: 86400, // 24 hours
        moneyCost: 350_000_000_000,
        resourceCosts: { exotic_materials: 30, helium3: 15, platinum_group: 200 },
        interimBonuses: { revenueMultiplier: 1.20, miningMultiplier: 1.20, passiveIncome: 150_000_000 },
      },
    ],
    prerequisites: {
      research: ['mars_warming', 'greenhouse_engineering'],
      minMoney: 80_000_000_000,
      minBuildings: 25,
      minLocations: 8,
    },
    completionBonus: {
      revenueMultiplier: 1.25,
      miningMultiplier: 1.30,
      passiveIncome: 300_000_000,
      passiveResources: { mars_water: 500, iron: 400 },
    },
  },

  // 7. Jovian Fuel Depot — helium-3 harvesting megafacility at Jupiter
  {
    id: 'jovian_fuel_depot',
    name: 'Jovian Fuel Depot',
    icon: '⛽',
    description: 'A massive atmospheric scoop station in Jupiter\'s upper atmosphere, harvesting helium-3 fusion fuel on an industrial scale.',
    phases: [
      {
        name: 'Orbital Platform',
        durationSeconds: 18000, // 5 hours
        moneyCost: 60_000_000_000,
        resourceCosts: { titanium: 1000, iron: 2000, rare_earth: 300 },
        interimBonuses: { miningMultiplier: 1.10 },
      },
      {
        name: 'Atmospheric Scoops',
        durationSeconds: 36000, // 10 hours
        moneyCost: 100_000_000_000,
        resourceCosts: { titanium: 1500, platinum_group: 80, exotic_materials: 10 },
        interimBonuses: { miningMultiplier: 1.20, passiveResources: { helium3: 5, methane: 100 } },
      },
      {
        name: 'Fuel Processing & Storage',
        durationSeconds: 50400, // 14 hours
        moneyCost: 150_000_000_000,
        resourceCosts: { exotic_materials: 20, helium3: 10, platinum_group: 120 },
        interimBonuses: { miningMultiplier: 1.35, passiveResources: { helium3: 15, methane: 300 }, passiveIncome: 50_000_000 },
      },
    ],
    prerequisites: {
      research: ['nuclear_thermal', 'deep_drilling'],
      minMoney: 60_000_000_000,
      minBuildings: 20,
      minLocations: 7,
    },
    completionBonus: {
      miningMultiplier: 1.50,
      passiveIncome: 150_000_000,
      passiveResources: { helium3: 25, methane: 500, ethane: 200 },
    },
  },

  // 8. Dyson Swarm — ultimate energy megastructure
  {
    id: 'dyson_swarm',
    name: 'Dyson Swarm',
    icon: '🔆',
    description: 'A constellation of millions of solar collectors surrounding the Sun, providing virtually limitless energy to your entire empire.',
    phases: [
      {
        name: 'Prototype Swarm Elements',
        durationSeconds: 28800, // 8 hours
        moneyCost: 100_000_000_000,
        resourceCosts: { aluminum: 2000, titanium: 1000, rare_earth: 500 },
        interimBonuses: { revenueMultiplier: 1.05, maintenanceMultiplier: 0.97 },
      },
      {
        name: 'Mass Production Facility',
        durationSeconds: 43200, // 12 hours
        moneyCost: 200_000_000_000,
        resourceCosts: { iron: 5000, titanium: 2000, platinum_group: 150 },
        interimBonuses: { revenueMultiplier: 1.10, maintenanceMultiplier: 0.93, buildSpeedMultiplier: 1.05 },
      },
      {
        name: 'Swarm Deployment Phase I',
        durationSeconds: 72000, // 20 hours
        moneyCost: 350_000_000_000,
        resourceCosts: { titanium: 3000, exotic_materials: 25, helium3: 15, platinum_group: 200 },
        interimBonuses: { revenueMultiplier: 1.20, maintenanceMultiplier: 0.88, buildSpeedMultiplier: 1.10, passiveIncome: 100_000_000 },
      },
      {
        name: 'Swarm Deployment Phase II',
        durationSeconds: 100800, // 28 hours
        moneyCost: 500_000_000_000,
        resourceCosts: { exotic_materials: 50, helium3: 30, platinum_group: 300, rare_earth: 1000 },
        interimBonuses: { revenueMultiplier: 1.30, maintenanceMultiplier: 0.80, buildSpeedMultiplier: 1.15, passiveIncome: 250_000_000 },
      },
      {
        name: 'Full Dyson Swarm Activation',
        durationSeconds: 129600, // 36 hours
        moneyCost: 800_000_000_000,
        resourceCosts: { exotic_materials: 100, helium3: 50, platinum_group: 500 },
        interimBonuses: { revenueMultiplier: 1.50, maintenanceMultiplier: 0.70, buildSpeedMultiplier: 1.25, passiveIncome: 500_000_000 },
      },
    ],
    prerequisites: {
      research: ['space_elevator_cable', 'fusion_drive'],
      minMoney: 100_000_000_000,
      minBuildings: 30,
      minLocations: 10,
    },
    completionBonus: {
      revenueMultiplier: 1.50,
      maintenanceMultiplier: 0.65,
      buildSpeedMultiplier: 1.30,
      researchSpeedMultiplier: 1.20,
      miningMultiplier: 1.20,
      passiveIncome: 750_000_000,
    },
  },

  // 9. Dyson Swarm Segment — multi-phase orbital energy harvester (endgame tier)
  {
    id: 'dyson_swarm_segment',
    name: 'Dyson Swarm Segment',
    icon: '🌞',
    description: 'A dedicated segment of self-replicating solar collectors that forms an independent power grid, generating enormous energy output for deep-space operations.',
    phases: [
      {
        name: 'Fusion Bootstrap Reactor',
        durationSeconds: 36000, // 10 hours
        moneyCost: 150_000_000_000,
        resourceCosts: { helium3: 20, titanium: 1500, rare_earth: 600 },
        interimBonuses: { revenueMultiplier: 1.08, passiveIncome: 80_000_000 },
      },
      {
        name: 'Self-Replicating Collector Foundry',
        durationSeconds: 57600, // 16 hours
        moneyCost: 300_000_000_000,
        resourceCosts: { iron: 4000, aluminum: 3000, exotic_materials: 20, platinum_group: 200 },
        interimBonuses: { revenueMultiplier: 1.15, maintenanceMultiplier: 0.90, passiveIncome: 200_000_000 },
      },
      {
        name: 'Orbital Swarm Deployment',
        durationSeconds: 86400, // 24 hours
        moneyCost: 500_000_000_000,
        resourceCosts: { titanium: 3000, exotic_materials: 40, helium3: 30, platinum_group: 300 },
        interimBonuses: { revenueMultiplier: 1.25, maintenanceMultiplier: 0.82, buildSpeedMultiplier: 1.10, passiveIncome: 400_000_000 },
      },
      {
        name: 'Beamed Power Relay Network',
        durationSeconds: 115200, // 32 hours
        moneyCost: 700_000_000_000,
        resourceCosts: { exotic_materials: 80, helium3: 50, platinum_group: 400, rare_earth: 1500 },
        interimBonuses: { revenueMultiplier: 1.40, maintenanceMultiplier: 0.72, buildSpeedMultiplier: 1.20, passiveIncome: 600_000_000 },
      },
      {
        name: 'Full Segment Activation',
        durationSeconds: 172800, // 48 hours
        moneyCost: 1_000_000_000_000,
        resourceCosts: { exotic_materials: 150, helium3: 80, platinum_group: 600 },
        interimBonuses: { revenueMultiplier: 1.60, maintenanceMultiplier: 0.60, buildSpeedMultiplier: 1.30, researchSpeedMultiplier: 1.15, passiveIncome: 1_000_000_000 },
      },
    ],
    prerequisites: {
      research: ['fusion_drive', 'beamed_power'],
      minMoney: 150_000_000_000,
      minBuildings: 40,
      minLocations: 10,
    },
    completionBonus: {
      revenueMultiplier: 1.60,
      maintenanceMultiplier: 0.55,
      buildSpeedMultiplier: 1.35,
      researchSpeedMultiplier: 1.25,
      miningMultiplier: 1.25,
      passiveIncome: 1_500_000_000,
    },
  },

  // 10. Interstellar Probe — the first object sent beyond the solar system
  {
    id: 'interstellar_probe',
    name: 'Interstellar Probe',
    icon: '🛸',
    description: 'An autonomous probe accelerated to 10% light speed via solar sail and laser array, destined for Alpha Centauri. Takes real-time months to arrive, but delivers unique discovery reports along the way.',
    phases: [
      {
        name: 'Solar Sail Fabrication',
        durationSeconds: 43200, // 12 hours
        moneyCost: 120_000_000_000,
        resourceCosts: { aluminum: 2000, titanium: 1200, rare_earth: 800, platinum_group: 100 },
        interimBonuses: { researchSpeedMultiplier: 1.10 },
      },
      {
        name: 'Laser Propulsion Array',
        durationSeconds: 86400, // 24 hours
        moneyCost: 250_000_000_000,
        resourceCosts: { titanium: 2000, exotic_materials: 30, helium3: 20, rare_earth: 1000 },
        interimBonuses: { researchSpeedMultiplier: 1.20, revenueMultiplier: 1.05 },
      },
      {
        name: 'Probe AI Core & Instruments',
        durationSeconds: 72000, // 20 hours
        moneyCost: 180_000_000_000,
        resourceCosts: { exotic_materials: 50, platinum_group: 200, rare_earth: 600 },
        interimBonuses: { researchSpeedMultiplier: 1.30, revenueMultiplier: 1.08 },
      },
      {
        name: 'Launch & Acceleration',
        durationSeconds: 129600, // 36 hours
        moneyCost: 400_000_000_000,
        resourceCosts: { helium3: 40, exotic_materials: 60, platinum_group: 300 },
        interimBonuses: { researchSpeedMultiplier: 1.40, revenueMultiplier: 1.12, passiveIncome: 100_000_000 },
      },
    ],
    prerequisites: {
      research: ['fusion_drive', 'deep_drilling'],
      minMoney: 120_000_000_000,
      minBuildings: 35,
      minLocations: 9,
    },
    completionBonus: {
      researchSpeedMultiplier: 1.50,
      revenueMultiplier: 1.20,
      passiveIncome: 500_000_000,
    },
  },

  // 11. Space Elevator — Earth-to-LEO tether for dramatically cheaper access
  {
    id: 'space_elevator',
    name: 'Space Elevator',
    icon: '🗼',
    description: 'A carbon nanotube tether from equatorial Earth to geostationary orbit, reducing launch costs by 90% and opening the floodgates to orbital commerce.',
    phases: [
      {
        name: 'Nanotube Cable Production',
        durationSeconds: 28800, // 8 hours
        moneyCost: 80_000_000_000,
        resourceCosts: { iron: 3000, aluminum: 2000, rare_earth: 500 },
        interimBonuses: { buildSpeedMultiplier: 1.08, maintenanceMultiplier: 0.96 },
      },
      {
        name: 'Anchor Station & Counterweight',
        durationSeconds: 57600, // 16 hours
        moneyCost: 160_000_000_000,
        resourceCosts: { titanium: 2000, iron: 4000, platinum_group: 120 },
        interimBonuses: { buildSpeedMultiplier: 1.15, maintenanceMultiplier: 0.90, revenueMultiplier: 1.05 },
      },
      {
        name: 'Climber Deployment & Rail System',
        durationSeconds: 72000, // 20 hours
        moneyCost: 250_000_000_000,
        resourceCosts: { titanium: 1500, exotic_materials: 15, rare_earth: 700, aluminum: 2500 },
        interimBonuses: { buildSpeedMultiplier: 1.25, maintenanceMultiplier: 0.82, revenueMultiplier: 1.12, passiveIncome: 100_000_000 },
      },
      {
        name: 'Orbital Port & Full Operation',
        durationSeconds: 100800, // 28 hours
        moneyCost: 350_000_000_000,
        resourceCosts: { exotic_materials: 30, platinum_group: 200, helium3: 10, titanium: 2000 },
        interimBonuses: { buildSpeedMultiplier: 1.35, maintenanceMultiplier: 0.75, revenueMultiplier: 1.20, passiveIncome: 250_000_000 },
      },
    ],
    prerequisites: {
      research: ['space_elevator_cable', 'orbital_assembly'],
      minMoney: 80_000_000_000,
      minBuildings: 25,
      minLocations: 7,
    },
    completionBonus: {
      buildSpeedMultiplier: 1.40,
      maintenanceMultiplier: 0.65,
      revenueMultiplier: 1.25,
      passiveIncome: 400_000_000,
    },
  },

  // 12. Terraforming Engine — the ultimate Mars megaproject
  {
    id: 'terraforming_engine',
    name: 'Terraforming Engine',
    icon: '🌎',
    description: 'The definitive planetary engineering project: a continent-scale atmospheric processor, orbital mirror array, and magnetic shield that will make Mars breathable within decades. The longest and most prestigious construction in the game.',
    phases: [
      {
        name: 'Polar Ice Cap Sublimation Array',
        durationSeconds: 43200, // 12 hours
        moneyCost: 200_000_000_000,
        resourceCosts: { iron: 5000, aluminum: 3000, titanium: 1500, methane: 800 },
        interimBonuses: { revenueMultiplier: 1.08, miningMultiplier: 1.10 },
      },
      {
        name: 'Industrial Greenhouse Gas Emitters',
        durationSeconds: 86400, // 24 hours
        moneyCost: 400_000_000_000,
        resourceCosts: { titanium: 2500, rare_earth: 1200, methane: 2000, exotic_materials: 20 },
        interimBonuses: { revenueMultiplier: 1.15, miningMultiplier: 1.20, passiveIncome: 100_000_000 },
      },
      {
        name: 'Orbital Mirror Constellation',
        durationSeconds: 115200, // 32 hours
        moneyCost: 600_000_000_000,
        resourceCosts: { aluminum: 5000, platinum_group: 250, exotic_materials: 40, helium3: 20 },
        interimBonuses: { revenueMultiplier: 1.25, miningMultiplier: 1.30, buildSpeedMultiplier: 1.10, passiveIncome: 250_000_000 },
      },
      {
        name: 'Planetary Magnetic Shield',
        durationSeconds: 172800, // 48 hours
        moneyCost: 900_000_000_000,
        resourceCosts: { exotic_materials: 80, helium3: 50, platinum_group: 400, rare_earth: 2000 },
        interimBonuses: { revenueMultiplier: 1.35, miningMultiplier: 1.40, buildSpeedMultiplier: 1.15, researchSpeedMultiplier: 1.10, passiveIncome: 500_000_000 },
      },
      {
        name: 'Biosphere Seeding & Activation',
        durationSeconds: 259200, // 72 hours (3 real days — the ultimate commitment)
        moneyCost: 1_500_000_000_000,
        resourceCosts: { exotic_materials: 150, helium3: 100, platinum_group: 600, mars_water: 2000 },
        interimBonuses: { revenueMultiplier: 1.50, miningMultiplier: 1.50, buildSpeedMultiplier: 1.25, researchSpeedMultiplier: 1.20, passiveIncome: 1_000_000_000 },
      },
    ],
    prerequisites: {
      research: ['mars_warming', 'greenhouse_engineering'],
      minMoney: 200_000_000_000,
      minBuildings: 50,
      minLocations: 10,
    },
    completionBonus: {
      revenueMultiplier: 1.60,
      miningMultiplier: 1.50,
      buildSpeedMultiplier: 1.30,
      researchSpeedMultiplier: 1.25,
      maintenanceMultiplier: 0.60,
      passiveIncome: 2_000_000_000,
      passiveResources: { mars_water: 1000, iron: 800, rare_earth: 200, methane: 500 },
    },
  },
];

export const MEGASTRUCTURE_MAP = new Map(MEGASTRUCTURES.map(m => [m.id, m]));

// ─── Bonus Aggregation ─────────────────────────────────────────────────────

/** Combine two bonus objects (multiplicative for multipliers, additive for passive) */
function combineBonuses(a: MegastructureBonuses, b: MegastructureBonuses): MegastructureBonuses {
  return {
    revenueMultiplier: (a.revenueMultiplier || 1) * (b.revenueMultiplier || 1),
    maintenanceMultiplier: (a.maintenanceMultiplier || 1) * (b.maintenanceMultiplier || 1),
    buildSpeedMultiplier: (a.buildSpeedMultiplier || 1) * (b.buildSpeedMultiplier || 1),
    researchSpeedMultiplier: (a.researchSpeedMultiplier || 1) * (b.researchSpeedMultiplier || 1),
    miningMultiplier: (a.miningMultiplier || 1) * (b.miningMultiplier || 1),
    passiveIncome: (a.passiveIncome || 0) + (b.passiveIncome || 0),
    passiveResources: mergeResources(a.passiveResources, b.passiveResources),
  };
}

function mergeResources(
  a?: Partial<Record<ResourceId, number>>,
  b?: Partial<Record<ResourceId, number>>,
): Partial<Record<ResourceId, number>> | undefined {
  if (!a && !b) return undefined;
  const result: Partial<Record<ResourceId, number>> = { ...(a || {}) };
  if (b) {
    for (const [key, val] of Object.entries(b)) {
      const rKey = key as ResourceId;
      result[rKey] = (result[rKey] || 0) + (val || 0);
    }
  }
  return result;
}

const EMPTY_BONUSES: MegastructureBonuses = {
  revenueMultiplier: 1,
  maintenanceMultiplier: 1,
  buildSpeedMultiplier: 1,
  researchSpeedMultiplier: 1,
  miningMultiplier: 1,
  passiveIncome: 0,
};

/**
 * Aggregate bonuses from all megastructures (completed phases contribute interim bonuses,
 * fully completed megastructures contribute their completionBonus instead).
 */
export function getMegastructureBonuses(megastructures: PersonalMegastructureInstance[]): MegastructureBonuses {
  let total = { ...EMPTY_BONUSES };

  for (const inst of megastructures) {
    const def = MEGASTRUCTURE_MAP.get(inst.definitionId);
    if (!def) continue;

    if (inst.status === 'complete') {
      // Fully complete — use the final completion bonus
      total = combineBonuses(total, def.completionBonus);
    } else {
      // In progress or paused — use the highest completed phase's interim bonuses
      if (inst.completedPhases > 0) {
        const lastCompleted = def.phases[inst.completedPhases - 1];
        if (lastCompleted) {
          total = combineBonuses(total, lastCompleted.interimBonuses);
        }
      }
    }
  }

  return total;
}

// ─── Game Logic Functions ───────────────────────────────────────────────────

/** Check if a megastructure can be started (prerequisites, money, resources) */
export function canStartMegastructure(state: GameState, defId: string): { can: boolean; reason?: string } {
  const def = MEGASTRUCTURE_MAP.get(defId);
  if (!def) return { can: false, reason: 'Unknown megastructure' };

  const megastructures = state.megastructures || [];

  // Already started?
  if (megastructures.some(m => m.definitionId === defId)) {
    return { can: false, reason: 'Already started or completed' };
  }

  // Any phase currently building?
  if (megastructures.some(m => m.status === 'building')) {
    return { can: false, reason: 'Another megastructure phase is under construction' };
  }

  // Research prerequisites
  for (const req of def.prerequisites.research) {
    if (!state.completedResearch.includes(req)) {
      return { can: false, reason: `Missing research: ${req}` };
    }
  }

  // Building count
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  if (completedBuildings < def.prerequisites.minBuildings) {
    return { can: false, reason: `Need ${def.prerequisites.minBuildings} completed buildings (have ${completedBuildings})` };
  }

  // Location count
  if (state.unlockedLocations.length < def.prerequisites.minLocations) {
    return { can: false, reason: `Need ${def.prerequisites.minLocations} unlocked locations (have ${state.unlockedLocations.length})` };
  }

  // First phase costs
  const phase = def.phases[0];
  if (state.money < phase.moneyCost) {
    return { can: false, reason: `Need ${phase.moneyCost} (have ${Math.floor(state.money)})` };
  }

  for (const [resId, qty] of Object.entries(phase.resourceCosts)) {
    const have = (state.resources || {})[resId] || 0;
    if (have < (qty || 0)) {
      return { can: false, reason: `Need ${qty} ${resId} (have ${have})` };
    }
  }

  return { can: true };
}

/** Check if the next phase of a megastructure can be started */
export function canAdvancePhase(state: GameState, defId: string): { can: boolean; reason?: string } {
  const megastructures = state.megastructures || [];
  const inst = megastructures.find(m => m.definitionId === defId);
  if (!inst) return { can: false, reason: 'Megastructure not started' };
  if (inst.status === 'complete') return { can: false, reason: 'Already complete' };
  if (inst.status === 'building') return { can: false, reason: 'Phase still under construction' };

  // Check if any OTHER megastructure has a phase building
  if (megastructures.some(m => m.status === 'building')) {
    return { can: false, reason: 'Another megastructure phase is under construction' };
  }

  const def = MEGASTRUCTURE_MAP.get(defId);
  if (!def) return { can: false, reason: 'Unknown megastructure' };

  const nextPhaseIdx = inst.completedPhases;
  if (nextPhaseIdx >= def.phases.length) return { can: false, reason: 'All phases complete' };

  const phase = def.phases[nextPhaseIdx];

  if (state.money < phase.moneyCost) {
    return { can: false, reason: `Need ${phase.moneyCost} (have ${Math.floor(state.money)})` };
  }

  for (const [resId, qty] of Object.entries(phase.resourceCosts)) {
    const have = (state.resources || {})[resId] || 0;
    if (have < (qty || 0)) {
      return { can: false, reason: `Need ${qty} ${resId} (have ${have})` };
    }
  }

  return { can: true };
}

/** Start a new megastructure (pay first phase costs, begin timer) */
export function startMegastructure(state: GameState, defId: string): GameState {
  const check = canStartMegastructure(state, defId);
  if (!check.can) return state;

  const def = MEGASTRUCTURE_MAP.get(defId)!;
  const phase = def.phases[0];
  const now = Date.now();

  const money = state.money - phase.moneyCost;
  const totalSpent = state.totalSpent + phase.moneyCost;
  const resources = { ...(state.resources || {}) };

  for (const [resId, qty] of Object.entries(phase.resourceCosts)) {
    resources[resId] = (resources[resId] || 0) - (qty || 0);
  }

  const megastructures = [...(state.megastructures || [])];
  megastructures.push({
    definitionId: defId,
    currentPhase: 0,
    completedPhases: 0,
    totalPhases: def.phases.length,
    status: 'building',
    phaseStartedAtMs: now,
    phaseDurationSeconds: phase.durationSeconds,
    startedAtMs: now,
  });

  return {
    ...state,
    money,
    totalSpent,
    resources,
    megastructures,
  };
}

/** Advance to the next phase of a megastructure (pay costs, start timer) */
export function advanceMegastructurePhase(state: GameState, defId: string): GameState {
  const check = canAdvancePhase(state, defId);
  if (!check.can) return state;

  const def = MEGASTRUCTURE_MAP.get(defId)!;
  const megastructures = [...(state.megastructures || [])];
  const idx = megastructures.findIndex(m => m.definitionId === defId);
  if (idx === -1) return state;

  const inst = megastructures[idx];
  const nextPhaseIdx = inst.completedPhases;
  const phase = def.phases[nextPhaseIdx];
  const now = Date.now();

  const money = state.money - phase.moneyCost;
  const totalSpent = state.totalSpent + phase.moneyCost;
  const resources = { ...(state.resources || {}) };

  for (const [resId, qty] of Object.entries(phase.resourceCosts)) {
    resources[resId] = (resources[resId] || 0) - (qty || 0);
  }

  megastructures[idx] = {
    ...inst,
    currentPhase: nextPhaseIdx,
    status: 'building',
    phaseStartedAtMs: now,
    phaseDurationSeconds: phase.durationSeconds,
  };

  return {
    ...state,
    money,
    totalSpent,
    resources,
    megastructures,
  };
}

/**
 * Check phase completion for all megastructures. Called each tick.
 * Returns updated state with completed phases marked and events.
 */
export function checkMegastructureCompletion(state: GameState): GameState {
  const megastructures = state.megastructures;
  if (!megastructures || megastructures.length === 0) return state;

  const now = Date.now();
  let changed = false;
  const updatedMegastructures = megastructures.map(inst => {
    if (inst.status !== 'building' || !inst.phaseStartedAtMs || !inst.phaseDurationSeconds) return inst;

    const elapsed = (now - inst.phaseStartedAtMs) / 1000;
    // Apply build speed multiplier from OTHER completed megastructures
    const otherMegas = megastructures.filter(m => m.definitionId !== inst.definitionId);
    const bonuses = getMegastructureBonuses(otherMegas);
    const effectiveDuration = inst.phaseDurationSeconds / (bonuses.buildSpeedMultiplier || 1);

    if (elapsed >= effectiveDuration) {
      changed = true;
      const def = MEGASTRUCTURE_MAP.get(inst.definitionId);
      const newCompletedPhases = inst.completedPhases + 1;
      const isFullyComplete = def ? newCompletedPhases >= def.phases.length : true;

      return {
        ...inst,
        completedPhases: newCompletedPhases,
        currentPhase: inst.currentPhase,
        status: (isFullyComplete ? 'complete' : 'paused') as PersonalMegastructureInstance['status'],
        phaseStartedAtMs: undefined,
        phaseDurationSeconds: undefined,
        completedAtMs: isFullyComplete ? now : undefined,
      };
    }
    return inst;
  });

  if (!changed) return state;

  // Generate events for completed phases
  const events = [...state.eventLog];
  for (let i = 0; i < updatedMegastructures.length; i++) {
    const newInst = updatedMegastructures[i];
    const oldInst = megastructures[i];
    if (newInst.completedPhases > oldInst.completedPhases) {
      const def = MEGASTRUCTURE_MAP.get(newInst.definitionId);
      if (def) {
        const phaseName = def.phases[oldInst.completedPhases]?.name || 'Phase';
        if (newInst.status === 'complete') {
          events.unshift({
            id: `mega_${now}_${newInst.definitionId}`,
            date: state.gameDate,
            type: 'milestone',
            title: `${def.icon} ${def.name} Complete!`,
            description: `Your ${def.name} is fully operational. Permanent bonuses now active.`,
          });
        } else {
          events.unshift({
            id: `mega_phase_${now}_${newInst.definitionId}`,
            date: state.gameDate,
            type: 'build_complete',
            title: `${def.icon} ${def.name}: ${phaseName} Complete`,
            description: `Phase ${newInst.completedPhases}/${def.phases.length} complete. Ready for next phase.`,
          });
        }
      }
    }
  }

  return {
    ...state,
    megastructures: updatedMegastructures,
    eventLog: events.slice(0, 50),
  };
}
