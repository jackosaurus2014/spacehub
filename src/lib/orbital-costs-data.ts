/**
 * Orbital System Costs Data
 *
 * Comprehensive cost estimates for orbital systems including habitats,
 * fabrication facilities, data centers, depots, solar arrays, and more.
 * Each system includes subsystem breakdown, bill of materials, launch costs,
 * assembly costs, insurance estimates, and operating costs.
 *
 * Data sources: NASA CLD program awards, Axiom/Vast/Orbital Reef public
 * disclosures, ISS historical costs, ESA SOLARIS studies, industry reports,
 * academic papers, and SpaceX/ULA published pricing.
 */

// ── Types ──────────────────────────────────────────

export interface BOMItem {
  name: string;
  category: 'structure' | 'power' | 'thermal' | 'propulsion' | 'avionics' | 'life_support' | 'communications' | 'payload' | 'shielding' | 'docking' | 'robotics' | 'software';
  quantity: number;
  unitMassKg: number;
  unitCostUSD: number;
  totalMassKg: number;
  totalCostUSD: number;
  supplier?: string;
  notes?: string;
}

export interface Subsystem {
  name: string;
  description: string;
  massKg: number;
  costUSD: number;
  items: BOMItem[];
}

export interface CostBreakdown {
  procurement: number;       // Total hardware/material cost
  launch: number;            // Launch to orbit
  assembly: number;          // In-space assembly & integration
  testing: number;           // Ground testing & qualification
  operations: number;        // First year operations
  insurance: number;         // Launch + first year in-orbit insurance
  regulatory: number;        // Licensing, spectrum, compliance
  contingency: number;       // 15-20% contingency
  total: number;
}

export interface InsuranceEstimate {
  insuredValue: number;
  launchPremiumRate: number;
  launchPremiumUSD: number;
  inOrbitPremiumRate: number;
  inOrbitAnnualUSD: number;
  liabilityAnnualUSD: number;
  totalFirstYearUSD: number;
  notes: string;
}

export interface OrbitalSystem {
  slug: string;
  name: string;
  variant?: string;          // e.g., 'small', 'large'
  icon: string;
  category: 'habitat' | 'manufacturing' | 'infrastructure' | 'power' | 'services' | 'science';
  description: string;
  orbit: string;             // Target orbit (LEO, GEO, etc.)
  altitudeKm: number;
  totalMassKg: number;
  crewCapacity: number;      // 0 for uncrewed
  powerKw: number;
  designLifeYears: number;
  timelineYears: number;     // Development to operational
  techReadinessLevel: number; // TRL 1-9
  subsystems: Subsystem[];
  costBreakdown: CostBreakdown;
  insurance: InsuranceEstimate;
  annualOperatingCostUSD: number;
  revenueModelNotes: string[];
  referencePrograms: string[];
  crossLinks: {
    insurancePage: boolean;
    resourceExchange: boolean;
    launchVehicles: boolean;
    missionCost: boolean;
  };
}

// ── Launch Cost Constants ──────────────────────────

const LAUNCH_COST_PER_KG_LEO = {
  falcon9: 2720,
  falconHeavy: 1500,
  starship: 200,        // Projected at scale
  vulcan: 8500,
  newGlenn: 3500,
};

// Use Falcon Heavy as baseline for large systems, Starship for future
const BASE_LAUNCH_COST = LAUNCH_COST_PER_KG_LEO.falconHeavy;
const FUTURE_LAUNCH_COST = LAUNCH_COST_PER_KG_LEO.starship;

// ── Insurance Rate Constants ───────────────────────

const INSURANCE_RATES = {
  launchRate: 0.085,        // 8.5% of insured value
  inOrbitRate: 0.044,       // 4.4% annual
  liabilityRate: 0.018,     // 1.8% of insured value
};

function calculateInsurance(systemValue: number, notes: string = ''): InsuranceEstimate {
  return {
    insuredValue: systemValue,
    launchPremiumRate: INSURANCE_RATES.launchRate * 100,
    launchPremiumUSD: Math.round(systemValue * INSURANCE_RATES.launchRate),
    inOrbitPremiumRate: INSURANCE_RATES.inOrbitRate * 100,
    inOrbitAnnualUSD: Math.round(systemValue * INSURANCE_RATES.inOrbitRate),
    liabilityAnnualUSD: Math.round(systemValue * INSURANCE_RATES.liabilityRate),
    totalFirstYearUSD: Math.round(
      systemValue * INSURANCE_RATES.launchRate +
      systemValue * INSURANCE_RATES.inOrbitRate +
      systemValue * INSURANCE_RATES.liabilityRate
    ),
    notes: notes || 'Based on industry benchmark rates. Actual premiums depend on underwriter assessment, mission specifics, and operator track record.',
  };
}

function calculateCostBreakdown(
  procurement: number,
  totalMassKg: number,
  assemblyFactor: number,    // Fraction of procurement cost
  testingFactor: number,     // Fraction of procurement cost
  annualOps: number,
  contingencyRate: number = 0.18,
): CostBreakdown {
  const launch = Math.round(totalMassKg * BASE_LAUNCH_COST);
  const assembly = Math.round(procurement * assemblyFactor);
  const testing = Math.round(procurement * testingFactor);
  const insurance = calculateInsurance(procurement + launch).totalFirstYearUSD;
  const regulatory = 2_500_000; // FAA + FCC + NOAA baseline
  const subtotal = procurement + launch + assembly + testing + annualOps + insurance + regulatory;
  const contingency = Math.round(subtotal * contingencyRate);

  return {
    procurement,
    launch,
    assembly,
    testing,
    operations: annualOps,
    insurance,
    regulatory,
    contingency,
    total: subtotal + contingency,
  };
}

// ── Orbital Systems Database ───────────────────────

export const ORBITAL_SYSTEMS: OrbitalSystem[] = [

  // ═══════════════════════════════════════════════════
  // 1. ORBITAL HABITAT — SMALL (4-person commercial)
  // ═══════════════════════════════════════════════════
  {
    slug: 'habitat-small',
    name: 'Orbital Habitat',
    variant: 'Small (4 Crew)',
    icon: '🏠',
    category: 'habitat',
    description: 'A compact commercial orbital habitat supporting 4 crew members for missions up to 6 months. Similar in concept to Vast Haven-1 or an Axiom single module. Includes basic life support, power, and docking capability.',
    orbit: 'LEO',
    altitudeKm: 400,
    totalMassKg: 22_000,
    crewCapacity: 4,
    powerKw: 20,
    designLifeYears: 15,
    timelineYears: 5,
    techReadinessLevel: 7,
    subsystems: [
      {
        name: 'Pressure Vessel & Structure',
        description: 'Primary aluminum-lithium alloy pressure vessel with MMOD shielding, internal outfitting, and viewport',
        massKg: 8_500,
        costUSD: 120_000_000,
        items: [
          { name: 'Al-Li 2195 pressure shell', category: 'structure', quantity: 1, unitMassKg: 5500, unitCostUSD: 65_000_000, totalMassKg: 5500, totalCostUSD: 65_000_000, supplier: 'Northrop Grumman / Thales Alenia' },
          { name: 'MMOD Whipple shields', category: 'shielding', quantity: 1, unitMassKg: 1200, unitCostUSD: 18_000_000, totalMassKg: 1200, totalCostUSD: 18_000_000 },
          { name: 'Internal racks & outfitting', category: 'structure', quantity: 1, unitMassKg: 1200, unitCostUSD: 22_000_000, totalMassKg: 1200, totalCostUSD: 22_000_000 },
          { name: 'Viewport assembly', category: 'structure', quantity: 1, unitMassKg: 300, unitCostUSD: 8_000_000, totalMassKg: 300, totalCostUSD: 8_000_000 },
          { name: 'Hatches & seals', category: 'structure', quantity: 2, unitMassKg: 150, unitCostUSD: 3_500_000, totalMassKg: 300, totalCostUSD: 7_000_000 },
        ],
      },
      {
        name: 'Life Support (ECLSS)',
        description: 'Environmental Control and Life Support: O2 generation, CO2 removal, water recycling, humidity and temperature control',
        massKg: 3_200,
        costUSD: 95_000_000,
        items: [
          { name: 'O2 generation (electrolysis)', category: 'life_support', quantity: 1, unitMassKg: 450, unitCostUSD: 18_000_000, totalMassKg: 450, totalCostUSD: 18_000_000 },
          { name: 'CO2 removal (CDRA-type)', category: 'life_support', quantity: 1, unitMassKg: 380, unitCostUSD: 15_000_000, totalMassKg: 380, totalCostUSD: 15_000_000 },
          { name: 'Water recovery system', category: 'life_support', quantity: 1, unitMassKg: 520, unitCostUSD: 22_000_000, totalMassKg: 520, totalCostUSD: 22_000_000 },
          { name: 'Thermal control (ATCS)', category: 'thermal', quantity: 1, unitMassKg: 850, unitCostUSD: 20_000_000, totalMassKg: 850, totalCostUSD: 20_000_000 },
          { name: 'Air circulation & filtration', category: 'life_support', quantity: 1, unitMassKg: 280, unitCostUSD: 8_000_000, totalMassKg: 280, totalCostUSD: 8_000_000 },
          { name: 'Fire detection & suppression', category: 'life_support', quantity: 1, unitMassKg: 120, unitCostUSD: 5_000_000, totalMassKg: 120, totalCostUSD: 5_000_000 },
          { name: 'Waste management system', category: 'life_support', quantity: 1, unitMassKg: 200, unitCostUSD: 4_000_000, totalMassKg: 200, totalCostUSD: 4_000_000 },
          { name: 'Food storage & galley', category: 'life_support', quantity: 1, unitMassKg: 400, unitCostUSD: 3_000_000, totalMassKg: 400, totalCostUSD: 3_000_000 },
        ],
      },
      {
        name: 'Power System',
        description: 'Solar array panels, batteries, and power distribution for 20 kW capacity',
        massKg: 2_800,
        costUSD: 55_000_000,
        items: [
          { name: 'Triple-junction GaAs solar arrays', category: 'power', quantity: 2, unitMassKg: 600, unitCostUSD: 15_000_000, totalMassKg: 1200, totalCostUSD: 30_000_000 },
          { name: 'Li-ion battery packs', category: 'power', quantity: 6, unitMassKg: 180, unitCostUSD: 2_000_000, totalMassKg: 1080, totalCostUSD: 12_000_000 },
          { name: 'Power distribution unit', category: 'power', quantity: 1, unitMassKg: 320, unitCostUSD: 8_000_000, totalMassKg: 320, totalCostUSD: 8_000_000 },
          { name: 'Solar array drive assemblies', category: 'power', quantity: 2, unitMassKg: 100, unitCostUSD: 2_500_000, totalMassKg: 200, totalCostUSD: 5_000_000 },
        ],
      },
      {
        name: 'Avionics & Communications',
        description: 'GN&C, computing, S-band and Ka-band comms, tracking',
        massKg: 1_500,
        costUSD: 45_000_000,
        items: [
          { name: 'Flight computers (triple redundant)', category: 'avionics', quantity: 3, unitMassKg: 25, unitCostUSD: 5_000_000, totalMassKg: 75, totalCostUSD: 15_000_000 },
          { name: 'CMG attitude control', category: 'avionics', quantity: 4, unitMassKg: 150, unitCostUSD: 3_000_000, totalMassKg: 600, totalCostUSD: 12_000_000 },
          { name: 'Star trackers', category: 'avionics', quantity: 2, unitMassKg: 8, unitCostUSD: 1_500_000, totalMassKg: 16, totalCostUSD: 3_000_000 },
          { name: 'S-band transponder', category: 'communications', quantity: 2, unitMassKg: 15, unitCostUSD: 2_000_000, totalMassKg: 30, totalCostUSD: 4_000_000 },
          { name: 'Ka-band high-rate antenna', category: 'communications', quantity: 1, unitMassKg: 45, unitCostUSD: 5_000_000, totalMassKg: 45, totalCostUSD: 5_000_000 },
          { name: 'GPS/GNSS receiver', category: 'avionics', quantity: 2, unitMassKg: 5, unitCostUSD: 500_000, totalMassKg: 10, totalCostUSD: 1_000_000 },
          { name: 'Data handling & network', category: 'avionics', quantity: 1, unitMassKg: 120, unitCostUSD: 5_000_000, totalMassKg: 120, totalCostUSD: 5_000_000 },
          { name: 'Sensors & instrumentation', category: 'avionics', quantity: 1, unitMassKg: 604, unitCostUSD: 0, totalMassKg: 604, totalCostUSD: 0, notes: 'Mass allocation for various sensors' },
        ],
      },
      {
        name: 'Propulsion',
        description: 'Reboost thrusters and RCS for orbit maintenance and attitude control',
        massKg: 2_200,
        costUSD: 30_000_000,
        items: [
          { name: 'Bipropellant thruster system', category: 'propulsion', quantity: 1, unitMassKg: 350, unitCostUSD: 12_000_000, totalMassKg: 350, totalCostUSD: 12_000_000 },
          { name: 'RCS thrusters', category: 'propulsion', quantity: 16, unitMassKg: 5, unitCostUSD: 500_000, totalMassKg: 80, totalCostUSD: 8_000_000 },
          { name: 'Propellant tanks', category: 'propulsion', quantity: 4, unitMassKg: 120, unitCostUSD: 1_500_000, totalMassKg: 480, totalCostUSD: 6_000_000 },
          { name: 'Propellant (hydrazine/MON-3)', category: 'propulsion', quantity: 1, unitMassKg: 1290, unitCostUSD: 4_000_000, totalMassKg: 1290, totalCostUSD: 4_000_000 },
        ],
      },
      {
        name: 'Docking & Berthing',
        description: 'International Docking Adapters for crew and cargo vehicle visits',
        massKg: 1_800,
        costUSD: 35_000_000,
        items: [
          { name: 'International Docking Adapter (IDA)', category: 'docking', quantity: 2, unitMassKg: 500, unitCostUSD: 12_000_000, totalMassKg: 1000, totalCostUSD: 24_000_000 },
          { name: 'Common Berthing Mechanism', category: 'docking', quantity: 1, unitMassKg: 450, unitCostUSD: 8_000_000, totalMassKg: 450, totalCostUSD: 8_000_000 },
          { name: 'Docking sensors & cameras', category: 'avionics', quantity: 1, unitMassKg: 350, unitCostUSD: 3_000_000, totalMassKg: 350, totalCostUSD: 3_000_000 },
        ],
      },
      {
        name: 'Crew Accommodations',
        description: 'Sleep stations, exercise equipment, medical supplies, personal hygiene',
        massKg: 2_000,
        costUSD: 20_000_000,
        items: [
          { name: 'Crew quarters (sleep stations)', category: 'payload', quantity: 4, unitMassKg: 200, unitCostUSD: 2_000_000, totalMassKg: 800, totalCostUSD: 8_000_000 },
          { name: 'Exercise equipment (ARED + T2)', category: 'payload', quantity: 1, unitMassKg: 450, unitCostUSD: 5_000_000, totalMassKg: 450, totalCostUSD: 5_000_000 },
          { name: 'Medical kit & monitoring', category: 'payload', quantity: 1, unitMassKg: 150, unitCostUSD: 3_000_000, totalMassKg: 150, totalCostUSD: 3_000_000 },
          { name: 'Personal hygiene station', category: 'payload', quantity: 1, unitMassKg: 200, unitCostUSD: 2_000_000, totalMassKg: 200, totalCostUSD: 2_000_000 },
          { name: 'Stowage & logistics', category: 'payload', quantity: 1, unitMassKg: 400, unitCostUSD: 2_000_000, totalMassKg: 400, totalCostUSD: 2_000_000 },
        ],
      },
    ],
    costBreakdown: calculateCostBreakdown(400_000_000, 22_000, 0.12, 0.10, 80_000_000),
    insurance: calculateInsurance(433_000_000, 'Small habitat — moderate risk profile. Falcon Heavy or Starship launch.'),
    annualOperatingCostUSD: 80_000_000,
    revenueModelNotes: [
      'Crew seat sales: $35-55M per seat (Axiom benchmark)',
      'Research rack rental: $2-5M per rack per month',
      'Tourism stays: $50M+ per 10-day visit',
      'Sovereign astronaut programs: $60-80M per mission',
    ],
    referencePrograms: ['Vast Haven-1 (~$300M est.)', 'Axiom Module 1 ($350M+ est.)', 'NASA CLD awards ($150-325M each)'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 2. ORBITAL HABITAT — LARGE (10+ crew multi-module)
  // ═══════════════════════════════════════════════════
  {
    slug: 'habitat-large',
    name: 'Orbital Habitat',
    variant: 'Large (12 Crew)',
    icon: '🏗️',
    category: 'habitat',
    description: 'A multi-module commercial space station supporting 12 crew for extended missions. Comparable to Orbital Reef or a multi-module Axiom station. Includes dedicated lab, habitation, and utility modules with redundant life support.',
    orbit: 'LEO',
    altitudeKm: 400,
    totalMassKg: 85_000,
    crewCapacity: 12,
    powerKw: 60,
    designLifeYears: 20,
    timelineYears: 8,
    techReadinessLevel: 6,
    subsystems: [
      {
        name: 'Core Module (Hab)',
        description: 'Primary habitation module with crew quarters, galley, exercise, and medical facilities',
        massKg: 25_000,
        costUSD: 450_000_000,
        items: [
          { name: 'Pressure vessel (Al-Li)', category: 'structure', quantity: 1, unitMassKg: 12000, unitCostUSD: 180_000_000, totalMassKg: 12000, totalCostUSD: 180_000_000 },
          { name: 'MMOD protection', category: 'shielding', quantity: 1, unitMassKg: 2500, unitCostUSD: 35_000_000, totalMassKg: 2500, totalCostUSD: 35_000_000 },
          { name: 'ECLSS primary (crew of 12)', category: 'life_support', quantity: 1, unitMassKg: 4500, unitCostUSD: 120_000_000, totalMassKg: 4500, totalCostUSD: 120_000_000 },
          { name: 'Crew accommodations (12 berths)', category: 'payload', quantity: 1, unitMassKg: 3000, unitCostUSD: 45_000_000, totalMassKg: 3000, totalCostUSD: 45_000_000 },
          { name: 'Internal outfitting & racks', category: 'structure', quantity: 1, unitMassKg: 3000, unitCostUSD: 70_000_000, totalMassKg: 3000, totalCostUSD: 70_000_000 },
        ],
      },
      {
        name: 'Laboratory Module',
        description: 'Research laboratory with experiment racks, glovebox, and centrifuge',
        massKg: 18_000,
        costUSD: 350_000_000,
        items: [
          { name: 'Pressure vessel', category: 'structure', quantity: 1, unitMassKg: 9000, unitCostUSD: 140_000_000, totalMassKg: 9000, totalCostUSD: 140_000_000 },
          { name: 'Research racks (EXPRESS-type)', category: 'payload', quantity: 12, unitMassKg: 350, unitCostUSD: 8_000_000, totalMassKg: 4200, totalCostUSD: 96_000_000 },
          { name: 'Microgravity Science Glovebox', category: 'payload', quantity: 1, unitMassKg: 200, unitCostUSD: 15_000_000, totalMassKg: 200, totalCostUSD: 15_000_000 },
          { name: 'Materials science furnace', category: 'payload', quantity: 1, unitMassKg: 350, unitCostUSD: 20_000_000, totalMassKg: 350, totalCostUSD: 20_000_000 },
          { name: 'ECLSS secondary (backup)', category: 'life_support', quantity: 1, unitMassKg: 2000, unitCostUSD: 45_000_000, totalMassKg: 2000, totalCostUSD: 45_000_000 },
          { name: 'Outfitting & equipment', category: 'structure', quantity: 1, unitMassKg: 2250, unitCostUSD: 34_000_000, totalMassKg: 2250, totalCostUSD: 34_000_000 },
        ],
      },
      {
        name: 'Utility & Power Module',
        description: 'Power generation, thermal management, propulsion, and communications hub',
        massKg: 22_000,
        costUSD: 380_000_000,
        items: [
          { name: 'Solar array wings (60 kW)', category: 'power', quantity: 4, unitMassKg: 1500, unitCostUSD: 40_000_000, totalMassKg: 6000, totalCostUSD: 160_000_000 },
          { name: 'Battery energy storage', category: 'power', quantity: 12, unitMassKg: 200, unitCostUSD: 3_000_000, totalMassKg: 2400, totalCostUSD: 36_000_000 },
          { name: 'Thermal control radiators', category: 'thermal', quantity: 2, unitMassKg: 2000, unitCostUSD: 25_000_000, totalMassKg: 4000, totalCostUSD: 50_000_000 },
          { name: 'Main propulsion (reboost)', category: 'propulsion', quantity: 1, unitMassKg: 3500, unitCostUSD: 45_000_000, totalMassKg: 3500, totalCostUSD: 45_000_000 },
          { name: 'Communications suite (S/Ka/laser)', category: 'communications', quantity: 1, unitMassKg: 800, unitCostUSD: 35_000_000, totalMassKg: 800, totalCostUSD: 35_000_000 },
          { name: 'GN&C avionics', category: 'avionics', quantity: 1, unitMassKg: 1200, unitCostUSD: 30_000_000, totalMassKg: 1200, totalCostUSD: 30_000_000 },
          { name: 'Power distribution & cabling', category: 'power', quantity: 1, unitMassKg: 2100, unitCostUSD: 12_000_000, totalMassKg: 2100, totalCostUSD: 12_000_000 },
          { name: 'Structural truss', category: 'structure', quantity: 1, unitMassKg: 2000, unitCostUSD: 12_000_000, totalMassKg: 2000, totalCostUSD: 12_000_000 },
        ],
      },
      {
        name: 'Node & Docking Module',
        description: 'Multi-port node connecting all modules with docking adapters for visiting vehicles',
        massKg: 12_000,
        costUSD: 180_000_000,
        items: [
          { name: 'Node pressure vessel', category: 'structure', quantity: 1, unitMassKg: 5000, unitCostUSD: 65_000_000, totalMassKg: 5000, totalCostUSD: 65_000_000 },
          { name: 'IDA docking ports', category: 'docking', quantity: 4, unitMassKg: 500, unitCostUSD: 12_000_000, totalMassKg: 2000, totalCostUSD: 48_000_000 },
          { name: 'CBM berthing ports', category: 'docking', quantity: 2, unitMassKg: 450, unitCostUSD: 8_000_000, totalMassKg: 900, totalCostUSD: 16_000_000 },
          { name: 'Airlock (EVA)', category: 'structure', quantity: 1, unitMassKg: 2500, unitCostUSD: 35_000_000, totalMassKg: 2500, totalCostUSD: 35_000_000 },
          { name: 'Proximity sensors & cameras', category: 'avionics', quantity: 1, unitMassKg: 600, unitCostUSD: 8_000_000, totalMassKg: 600, totalCostUSD: 8_000_000 },
          { name: 'Internal pass-through outfitting', category: 'structure', quantity: 1, unitMassKg: 1000, unitCostUSD: 8_000_000, totalMassKg: 1000, totalCostUSD: 8_000_000 },
        ],
      },
      {
        name: 'Robotic Systems',
        description: 'External manipulator arm and inspection systems for assembly and maintenance',
        massKg: 8_000,
        costUSD: 120_000_000,
        items: [
          { name: 'Robotic manipulator arm (Canadarm-type)', category: 'robotics', quantity: 1, unitMassKg: 1800, unitCostUSD: 45_000_000, totalMassKg: 1800, totalCostUSD: 45_000_000 },
          { name: 'Dexterous manipulator (SPDM-type)', category: 'robotics', quantity: 1, unitMassKg: 1600, unitCostUSD: 35_000_000, totalMassKg: 1600, totalCostUSD: 35_000_000 },
          { name: 'Mobile base system', category: 'robotics', quantity: 1, unitMassKg: 1800, unitCostUSD: 20_000_000, totalMassKg: 1800, totalCostUSD: 20_000_000 },
          { name: 'Inspection cameras & drones', category: 'avionics', quantity: 1, unitMassKg: 200, unitCostUSD: 8_000_000, totalMassKg: 200, totalCostUSD: 8_000_000 },
          { name: 'EVA tools & equipment', category: 'payload', quantity: 1, unitMassKg: 2600, unitCostUSD: 12_000_000, totalMassKg: 2600, totalCostUSD: 12_000_000 },
        ],
      },
    ],
    costBreakdown: calculateCostBreakdown(1_480_000_000, 85_000, 0.15, 0.12, 250_000_000),
    insurance: calculateInsurance(1_607_500_000, 'Multi-module station — complex assembly increases risk. Multiple launch campaigns required.'),
    annualOperatingCostUSD: 250_000_000,
    revenueModelNotes: [
      'Research rack rental: $2-5M per rack/month (12 racks available)',
      'Crew seat sales to national agencies: $50-80M per seat',
      'Commercial tourism: $50-100M per visitor',
      'In-space manufacturing partnerships: Revenue share',
      'Media & entertainment licensing: $5-20M annually',
    ],
    referencePrograms: ['ISS ($150B total)', 'Orbital Reef (Blue Origin, $3-5B est.)', 'Starlab (Voyager/Airbus, $2-3B est.)'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 3. ORBITAL FABRICATION FACILITY
  // ═══════════════════════════════════════════════════
  {
    slug: 'fabrication-facility',
    name: 'Orbital Fabrication Facility',
    icon: '🏭',
    category: 'manufacturing',
    description: 'An autonomous or semi-autonomous in-space manufacturing platform for high-value products. Produces ZBLAN optical fiber, pharmaceutical crystals, semiconductor wafers, and metal alloys in microgravity. Based on Varda Space, Space Forge, and Redwire concepts scaled to a permanent platform.',
    orbit: 'LEO',
    altitudeKm: 450,
    totalMassKg: 15_000,
    crewCapacity: 0,
    powerKw: 30,
    designLifeYears: 10,
    timelineYears: 4,
    techReadinessLevel: 6,
    subsystems: [
      {
        name: 'Manufacturing Module',
        description: 'Clean-room enclosed manufacturing bay with furnaces, printers, and materials handling',
        massKg: 5_500,
        costUSD: 180_000_000,
        items: [
          { name: 'Pressure vessel (clean room grade)', category: 'structure', quantity: 1, unitMassKg: 2500, unitCostUSD: 55_000_000, totalMassKg: 2500, totalCostUSD: 55_000_000 },
          { name: 'ZBLAN fiber draw tower', category: 'payload', quantity: 2, unitMassKg: 350, unitCostUSD: 25_000_000, totalMassKg: 700, totalCostUSD: 50_000_000 },
          { name: 'Protein crystallization facility', category: 'payload', quantity: 1, unitMassKg: 250, unitCostUSD: 15_000_000, totalMassKg: 250, totalCostUSD: 15_000_000 },
          { name: 'Metal alloy furnace', category: 'payload', quantity: 1, unitMassKg: 400, unitCostUSD: 20_000_000, totalMassKg: 400, totalCostUSD: 20_000_000 },
          { name: 'Additive manufacturing system', category: 'payload', quantity: 1, unitMassKg: 300, unitCostUSD: 12_000_000, totalMassKg: 300, totalCostUSD: 12_000_000 },
          { name: 'Robotic handling arms', category: 'robotics', quantity: 2, unitMassKg: 200, unitCostUSD: 8_000_000, totalMassKg: 400, totalCostUSD: 16_000_000 },
          { name: 'Vibration isolation platform', category: 'structure', quantity: 1, unitMassKg: 450, unitCostUSD: 6_000_000, totalMassKg: 450, totalCostUSD: 6_000_000 },
          { name: 'Contamination control system', category: 'life_support', quantity: 1, unitMassKg: 500, unitCostUSD: 6_000_000, totalMassKg: 500, totalCostUSD: 6_000_000 },
        ],
      },
      {
        name: 'Bus & Power',
        description: 'Spacecraft bus with solar arrays, batteries, thermal management, and avionics',
        massKg: 6_000,
        costUSD: 110_000_000,
        items: [
          { name: 'Solar arrays (30 kW)', category: 'power', quantity: 2, unitMassKg: 1200, unitCostUSD: 25_000_000, totalMassKg: 2400, totalCostUSD: 50_000_000 },
          { name: 'Battery system', category: 'power', quantity: 8, unitMassKg: 150, unitCostUSD: 1_500_000, totalMassKg: 1200, totalCostUSD: 12_000_000 },
          { name: 'Active thermal control', category: 'thermal', quantity: 1, unitMassKg: 1200, unitCostUSD: 22_000_000, totalMassKg: 1200, totalCostUSD: 22_000_000 },
          { name: 'Avionics & GN&C', category: 'avionics', quantity: 1, unitMassKg: 500, unitCostUSD: 18_000_000, totalMassKg: 500, totalCostUSD: 18_000_000 },
          { name: 'Structure & MMOD', category: 'structure', quantity: 1, unitMassKg: 700, unitCostUSD: 8_000_000, totalMassKg: 700, totalCostUSD: 8_000_000 },
        ],
      },
      {
        name: 'Return & Logistics',
        description: 'Reentry capsule for product return and docking for supply missions',
        massKg: 3_500,
        costUSD: 65_000_000,
        items: [
          { name: 'Reentry capsule (Varda W-type)', category: 'structure', quantity: 2, unitMassKg: 1000, unitCostUSD: 18_000_000, totalMassKg: 2000, totalCostUSD: 36_000_000 },
          { name: 'Docking adapter', category: 'docking', quantity: 1, unitMassKg: 500, unitCostUSD: 12_000_000, totalMassKg: 500, totalCostUSD: 12_000_000 },
          { name: 'Product storage & packaging', category: 'payload', quantity: 1, unitMassKg: 600, unitCostUSD: 8_000_000, totalMassKg: 600, totalCostUSD: 8_000_000 },
          { name: 'Propulsion (deorbit & reboost)', category: 'propulsion', quantity: 1, unitMassKg: 400, unitCostUSD: 9_000_000, totalMassKg: 400, totalCostUSD: 9_000_000 },
        ],
      },
    ],
    costBreakdown: calculateCostBreakdown(355_000_000, 15_000, 0.08, 0.10, 35_000_000),
    insurance: calculateInsurance(377_500_000, 'Autonomous platform — lower risk than crewed. Reentry capsules add complexity.'),
    annualOperatingCostUSD: 35_000_000,
    revenueModelNotes: [
      'ZBLAN fiber: $1-2M per km (vs $100 on Earth) — potential $100M+/yr',
      'Pharma crystallization: $50-500K per batch, dozens of batches/year',
      'Specialty alloy production: Contracted manufacturing services',
      'IP licensing from microgravity process patents',
    ],
    referencePrograms: ['Varda Space W-Series ($60M per capsule mission)', 'Space Forge ForgeStar', 'Redwire In-Space Manufacturing'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 4. ORBITAL DATA CENTER
  // ═══════════════════════════════════════════════════
  {
    slug: 'orbital-data-center',
    name: 'Orbital Data Center',
    icon: '🖥️',
    category: 'infrastructure',
    description: 'A space-based computing platform leveraging vacuum cooling and solar power for high-performance computing, AI training, and edge processing. Based on Lumen Orbit and OrbitsEdge concepts. Provides latency advantages for certain satellite data processing and removes terrestrial power grid constraints.',
    orbit: 'LEO',
    altitudeKm: 550,
    totalMassKg: 8_000,
    crewCapacity: 0,
    powerKw: 50,
    designLifeYears: 7,
    timelineYears: 3,
    techReadinessLevel: 5,
    subsystems: [
      {
        name: 'Computing Payload',
        description: 'Radiation-hardened server racks, GPU clusters, storage, and networking',
        massKg: 2_500,
        costUSD: 120_000_000,
        items: [
          { name: 'Rad-hard server modules', category: 'payload', quantity: 20, unitMassKg: 50, unitCostUSD: 3_000_000, totalMassKg: 1000, totalCostUSD: 60_000_000 },
          { name: 'GPU accelerator cards (space-rated)', category: 'payload', quantity: 40, unitMassKg: 10, unitCostUSD: 500_000, totalMassKg: 400, totalCostUSD: 20_000_000 },
          { name: 'SSD storage arrays', category: 'payload', quantity: 10, unitMassKg: 30, unitCostUSD: 1_000_000, totalMassKg: 300, totalCostUSD: 10_000_000 },
          { name: 'Network switches & fiber', category: 'communications', quantity: 1, unitMassKg: 200, unitCostUSD: 5_000_000, totalMassKg: 200, totalCostUSD: 5_000_000 },
          { name: 'Radiation shielding enclosure', category: 'shielding', quantity: 1, unitMassKg: 600, unitCostUSD: 25_000_000, totalMassKg: 600, totalCostUSD: 25_000_000 },
        ],
      },
      {
        name: 'Power & Thermal',
        description: 'High-capacity solar arrays and radiative cooling system (vacuum advantage)',
        massKg: 3_000,
        costUSD: 80_000_000,
        items: [
          { name: 'Solar arrays (50 kW)', category: 'power', quantity: 4, unitMassKg: 400, unitCostUSD: 12_000_000, totalMassKg: 1600, totalCostUSD: 48_000_000 },
          { name: 'Battery packs', category: 'power', quantity: 10, unitMassKg: 80, unitCostUSD: 1_200_000, totalMassKg: 800, totalCostUSD: 12_000_000 },
          { name: 'Radiative cooling panels', category: 'thermal', quantity: 1, unitMassKg: 400, unitCostUSD: 12_000_000, totalMassKg: 400, totalCostUSD: 12_000_000 },
          { name: 'Power management system', category: 'power', quantity: 1, unitMassKg: 200, unitCostUSD: 8_000_000, totalMassKg: 200, totalCostUSD: 8_000_000 },
        ],
      },
      {
        name: 'Communications & Bus',
        description: 'High-bandwidth laser and RF downlinks, spacecraft bus, and propulsion',
        massKg: 2_500,
        costUSD: 75_000_000,
        items: [
          { name: 'Optical laser terminal (100 Gbps)', category: 'communications', quantity: 2, unitMassKg: 50, unitCostUSD: 10_000_000, totalMassKg: 100, totalCostUSD: 20_000_000 },
          { name: 'Ka-band phased array antenna', category: 'communications', quantity: 2, unitMassKg: 80, unitCostUSD: 6_000_000, totalMassKg: 160, totalCostUSD: 12_000_000 },
          { name: 'Inter-satellite links', category: 'communications', quantity: 4, unitMassKg: 20, unitCostUSD: 2_000_000, totalMassKg: 80, totalCostUSD: 8_000_000 },
          { name: 'Spacecraft bus & avionics', category: 'avionics', quantity: 1, unitMassKg: 800, unitCostUSD: 20_000_000, totalMassKg: 800, totalCostUSD: 20_000_000 },
          { name: 'Electric propulsion (ion)', category: 'propulsion', quantity: 1, unitMassKg: 400, unitCostUSD: 8_000_000, totalMassKg: 400, totalCostUSD: 8_000_000 },
          { name: 'Structure & MMOD', category: 'structure', quantity: 1, unitMassKg: 960, unitCostUSD: 7_000_000, totalMassKg: 960, totalCostUSD: 7_000_000 },
        ],
      },
    ],
    costBreakdown: calculateCostBreakdown(275_000_000, 8_000, 0.05, 0.08, 25_000_000),
    insurance: calculateInsurance(287_000_000, 'Uncrewed, single launch — standard commercial satellite risk profile.'),
    annualOperatingCostUSD: 25_000_000,
    revenueModelNotes: [
      'Cloud computing as a service: Competitive with terrestrial HPC rates',
      'Satellite data processing (edge compute): Reduces downlink bandwidth',
      'AI model training: Continuous solar power advantage',
      'Government/defense secure computing contracts',
    ],
    referencePrograms: ['Lumen Orbit (seed-funded 2024)', 'OrbitsEdge (edge computing demos)', 'Microsoft Azure Space'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 5. ORBITAL PROPELLANT DEPOT
  // ═══════════════════════════════════════════════════
  {
    slug: 'propellant-depot',
    name: 'Orbital Propellant Depot',
    icon: '⛽',
    category: 'infrastructure',
    description: 'A cryogenic propellant storage and transfer facility in LEO, enabling on-orbit refueling for deep space missions, satellite servicing, and space tugs. Stores LOX/LCH4 or LOX/LH2 with active cryo-cooling to minimize boil-off. Based on NASA depot studies and SpaceX Starship depot concepts.',
    orbit: 'LEO',
    altitudeKm: 400,
    totalMassKg: 35_000,
    crewCapacity: 0,
    powerKw: 25,
    designLifeYears: 15,
    timelineYears: 5,
    techReadinessLevel: 5,
    subsystems: [
      {
        name: 'Cryogenic Storage Tanks',
        description: 'Multi-layer insulated tanks for LOX and LCH4 with zero boil-off technology',
        massKg: 18_000,
        costUSD: 200_000_000,
        items: [
          { name: 'LOX tank (150 m³)', category: 'structure', quantity: 1, unitMassKg: 6000, unitCostUSD: 60_000_000, totalMassKg: 6000, totalCostUSD: 60_000_000 },
          { name: 'LCH4 tank (200 m³)', category: 'structure', quantity: 1, unitMassKg: 5000, unitCostUSD: 55_000_000, totalMassKg: 5000, totalCostUSD: 55_000_000 },
          { name: 'Multi-layer insulation', category: 'thermal', quantity: 1, unitMassKg: 2000, unitCostUSD: 20_000_000, totalMassKg: 2000, totalCostUSD: 20_000_000 },
          { name: 'Zero boil-off cryo-coolers', category: 'thermal', quantity: 4, unitMassKg: 500, unitCostUSD: 8_000_000, totalMassKg: 2000, totalCostUSD: 32_000_000 },
          { name: 'Tank supports & structure', category: 'structure', quantity: 1, unitMassKg: 1500, unitCostUSD: 15_000_000, totalMassKg: 1500, totalCostUSD: 15_000_000 },
          { name: 'Vapor pressure control', category: 'thermal', quantity: 1, unitMassKg: 1500, unitCostUSD: 18_000_000, totalMassKg: 1500, totalCostUSD: 18_000_000 },
        ],
      },
      {
        name: 'Transfer & Docking Systems',
        description: 'Automated propellant transfer, docking interfaces, and fluid couplings',
        massKg: 5_000,
        costUSD: 120_000_000,
        items: [
          { name: 'Automated fluid couplings', category: 'docking', quantity: 4, unitMassKg: 300, unitCostUSD: 12_000_000, totalMassKg: 1200, totalCostUSD: 48_000_000 },
          { name: 'Transfer pumps & valves', category: 'propulsion', quantity: 1, unitMassKg: 800, unitCostUSD: 25_000_000, totalMassKg: 800, totalCostUSD: 25_000_000 },
          { name: 'Docking adapters (multiple standards)', category: 'docking', quantity: 3, unitMassKg: 500, unitCostUSD: 10_000_000, totalMassKg: 1500, totalCostUSD: 30_000_000 },
          { name: 'Propellant gauging system', category: 'avionics', quantity: 1, unitMassKg: 200, unitCostUSD: 8_000_000, totalMassKg: 200, totalCostUSD: 8_000_000 },
          { name: 'Leak detection system', category: 'avionics', quantity: 1, unitMassKg: 300, unitCostUSD: 9_000_000, totalMassKg: 300, totalCostUSD: 9_000_000 },
        ],
      },
      {
        name: 'Platform Bus',
        description: 'Power, communications, propulsion for stationkeeping, and avionics',
        massKg: 12_000,
        costUSD: 130_000_000,
        items: [
          { name: 'Solar arrays (25 kW)', category: 'power', quantity: 2, unitMassKg: 1000, unitCostUSD: 20_000_000, totalMassKg: 2000, totalCostUSD: 40_000_000 },
          { name: 'Battery system', category: 'power', quantity: 6, unitMassKg: 150, unitCostUSD: 1_500_000, totalMassKg: 900, totalCostUSD: 9_000_000 },
          { name: 'Avionics & autonomy software', category: 'avionics', quantity: 1, unitMassKg: 600, unitCostUSD: 25_000_000, totalMassKg: 600, totalCostUSD: 25_000_000 },
          { name: 'Stationkeeping thrusters', category: 'propulsion', quantity: 1, unitMassKg: 2500, unitCostUSD: 18_000_000, totalMassKg: 2500, totalCostUSD: 18_000_000 },
          { name: 'Communications (S/Ka-band)', category: 'communications', quantity: 1, unitMassKg: 300, unitCostUSD: 12_000_000, totalMassKg: 300, totalCostUSD: 12_000_000 },
          { name: 'Structure & MMOD shielding', category: 'structure', quantity: 1, unitMassKg: 5700, unitCostUSD: 26_000_000, totalMassKg: 5700, totalCostUSD: 26_000_000 },
        ],
      },
    ],
    costBreakdown: calculateCostBreakdown(450_000_000, 35_000, 0.10, 0.08, 30_000_000),
    insurance: calculateInsurance(502_500_000, 'Cryogenic propellants add risk. Long-duration autonomous ops. Multiple docking events per year.'),
    annualOperatingCostUSD: 30_000_000,
    revenueModelNotes: [
      'Propellant sales: $5-15M per refueling (depending on volume)',
      'NASA/DoD depot-as-a-service contracts',
      'Enables deep space missions at 30-50% lower total cost',
      'Satellite life extension services via refueling',
    ],
    referencePrograms: ['SpaceX Starship Depot (in development)', 'NASA On-Orbit Propellant Storage studies', 'ULA ACES concept'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 6-8. ORBITAL SOLAR ARRAYS (Small / Medium / Large)
  // ═══════════════════════════════════════════════════
  {
    slug: 'solar-array-small',
    name: 'Orbital Solar Power Array',
    variant: 'Small (<1 MW)',
    icon: '☀️',
    category: 'power',
    description: 'A small orbital solar power demonstrator generating up to 500 kW. Validates key SBSP technologies: large-aperture solar collection, DC-to-RF conversion, and precision microwave beaming to a ground rectenna. Based on Caltech SSPP and ESA SOLARIS Phase 0 concepts.',
    orbit: 'LEO',
    altitudeKm: 600,
    totalMassKg: 5_000,
    crewCapacity: 0,
    powerKw: 500,
    designLifeYears: 5,
    timelineYears: 4,
    techReadinessLevel: 4,
    subsystems: [
      { name: 'Solar Collection', description: 'Lightweight deployable photovoltaic array', massKg: 2000, costUSD: 40_000_000, items: [
        { name: 'Ultra-thin PV tiles', category: 'power', quantity: 1, unitMassKg: 1200, unitCostUSD: 25_000_000, totalMassKg: 1200, totalCostUSD: 25_000_000 },
        { name: 'Deployable structure', category: 'structure', quantity: 1, unitMassKg: 600, unitCostUSD: 10_000_000, totalMassKg: 600, totalCostUSD: 10_000_000 },
        { name: 'Power conditioning', category: 'power', quantity: 1, unitMassKg: 200, unitCostUSD: 5_000_000, totalMassKg: 200, totalCostUSD: 5_000_000 },
      ]},
      { name: 'Wireless Power Transmission', description: 'Microwave or laser transmission system for beaming power to ground', massKg: 1500, costUSD: 60_000_000, items: [
        { name: 'Phased array RF transmitter', category: 'communications', quantity: 1, unitMassKg: 800, unitCostUSD: 35_000_000, totalMassKg: 800, totalCostUSD: 35_000_000 },
        { name: 'Beam steering electronics', category: 'avionics', quantity: 1, unitMassKg: 300, unitCostUSD: 15_000_000, totalMassKg: 300, totalCostUSD: 15_000_000 },
        { name: 'Thermal management', category: 'thermal', quantity: 1, unitMassKg: 400, unitCostUSD: 10_000_000, totalMassKg: 400, totalCostUSD: 10_000_000 },
      ]},
      { name: 'Bus & Attitude Control', description: 'Spacecraft bus with precision pointing', massKg: 1500, costUSD: 35_000_000, items: [
        { name: 'Spacecraft bus', category: 'avionics', quantity: 1, unitMassKg: 600, unitCostUSD: 15_000_000, totalMassKg: 600, totalCostUSD: 15_000_000 },
        { name: 'Precision attitude control', category: 'avionics', quantity: 1, unitMassKg: 400, unitCostUSD: 10_000_000, totalMassKg: 400, totalCostUSD: 10_000_000 },
        { name: 'Propulsion & MMOD', category: 'propulsion', quantity: 1, unitMassKg: 500, unitCostUSD: 10_000_000, totalMassKg: 500, totalCostUSD: 10_000_000 },
      ]},
    ],
    costBreakdown: calculateCostBreakdown(135_000_000, 5_000, 0.05, 0.12, 8_000_000),
    insurance: calculateInsurance(142_500_000, 'Technology demonstrator — higher risk premium for unproven concept.'),
    annualOperatingCostUSD: 8_000_000,
    revenueModelNotes: [
      'Technology demonstration — revenue from IP licensing and follow-on contracts',
      'Ground rectenna power sales (pilot scale)',
      'Government research funding (DoE, DARPA, ESA)',
    ],
    referencePrograms: ['Caltech SSPP ($100M Caltech program)', 'ESA SOLARIS (Phase 0 study)', 'JAXA SPS2 concept'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  {
    slug: 'solar-array-medium',
    name: 'Orbital Solar Power Array',
    variant: 'Medium (1-10 MW)',
    icon: '⚡',
    category: 'power',
    description: 'A 5 MW orbital solar power station demonstrating commercial-scale wireless power transmission. Multiple modular tiles assembled in orbit to form a large collector. Beams power via microwave to a dedicated ground rectenna.',
    orbit: 'GEO',
    altitudeKm: 35_786,
    totalMassKg: 50_000,
    crewCapacity: 0,
    powerKw: 5_000,
    designLifeYears: 20,
    timelineYears: 8,
    techReadinessLevel: 3,
    subsystems: [
      { name: 'Solar Collection Array', description: 'Modular tile-based solar collection over ~1 hectare', massKg: 25000, costUSD: 500_000_000, items: [
        { name: 'PV tile modules (1000 units)', category: 'power', quantity: 1000, unitMassKg: 15, unitCostUSD: 300_000, totalMassKg: 15000, totalCostUSD: 300_000_000 },
        { name: 'Structural backbone', category: 'structure', quantity: 1, unitMassKg: 8000, unitCostUSD: 120_000_000, totalMassKg: 8000, totalCostUSD: 120_000_000 },
        { name: 'Power routing & conditioning', category: 'power', quantity: 1, unitMassKg: 2000, unitCostUSD: 80_000_000, totalMassKg: 2000, totalCostUSD: 80_000_000 },
      ]},
      { name: 'Microwave Transmitter Array', description: 'GEO-scale phased array for 5.8 GHz power beaming', massKg: 15000, costUSD: 600_000_000, items: [
        { name: 'Phased array modules', category: 'communications', quantity: 500, unitMassKg: 20, unitCostUSD: 800_000, totalMassKg: 10000, totalCostUSD: 400_000_000 },
        { name: 'Beam forming network', category: 'avionics', quantity: 1, unitMassKg: 2000, unitCostUSD: 100_000_000, totalMassKg: 2000, totalCostUSD: 100_000_000 },
        { name: 'Thermal management', category: 'thermal', quantity: 1, unitMassKg: 3000, unitCostUSD: 100_000_000, totalMassKg: 3000, totalCostUSD: 100_000_000 },
      ]},
      { name: 'Platform & Assembly', description: 'GEO platform bus with robotic assembly capability', massKg: 10000, costUSD: 250_000_000, items: [
        { name: 'GEO bus (high-power)', category: 'avionics', quantity: 1, unitMassKg: 4000, unitCostUSD: 80_000_000, totalMassKg: 4000, totalCostUSD: 80_000_000 },
        { name: 'Robotic assembly system', category: 'robotics', quantity: 1, unitMassKg: 2000, unitCostUSD: 60_000_000, totalMassKg: 2000, totalCostUSD: 60_000_000 },
        { name: 'Stationkeeping (electric)', category: 'propulsion', quantity: 1, unitMassKg: 2000, unitCostUSD: 40_000_000, totalMassKg: 2000, totalCostUSD: 40_000_000 },
        { name: 'Structure & shielding', category: 'structure', quantity: 1, unitMassKg: 2000, unitCostUSD: 70_000_000, totalMassKg: 2000, totalCostUSD: 70_000_000 },
      ]},
    ],
    costBreakdown: calculateCostBreakdown(1_350_000_000, 50_000, 0.20, 0.10, 40_000_000),
    insurance: calculateInsurance(1_425_000_000, 'GEO deployment, complex multi-launch assembly. Unproven power beaming at scale.'),
    annualOperatingCostUSD: 40_000_000,
    revenueModelNotes: [
      'Power sales to ground utility: $0.10-0.20/kWh (competitive at scale)',
      'Remote/disaster area power delivery (premium pricing)',
      'Military forward base power: DoD contracts',
      'Revenue potential: ~$20-40M/year at 5 MW',
    ],
    referencePrograms: ['ESA SOLARIS ($500M+ Phase 1)', 'China SSPS Chongqing test site', 'UK CASSIOPeiA concept'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  {
    slug: 'solar-array-large',
    name: 'Orbital Solar Power Array',
    variant: 'Large (>10 MW)',
    icon: '🌞',
    category: 'power',
    description: 'A full-scale 100 MW+ space-based solar power station in GEO. Requires Starship-class launch to be economically viable. Would provide baseload power to a city-scale ground rectenna. This is a 2030s+ concept requiring significant technology maturation.',
    orbit: 'GEO',
    altitudeKm: 35_786,
    totalMassKg: 800_000,
    crewCapacity: 0,
    powerKw: 100_000,
    designLifeYears: 30,
    timelineYears: 15,
    techReadinessLevel: 2,
    subsystems: [
      { name: 'Solar Collection (100 MW)', description: 'Massive deployable photovoltaic array spanning ~20 hectares', massKg: 400000, costUSD: 5_000_000_000, items: [
        { name: 'PV tile modules', category: 'power', quantity: 20000, unitMassKg: 15, unitCostUSD: 150_000, totalMassKg: 300000, totalCostUSD: 3_000_000_000 },
        { name: 'Structural framework', category: 'structure', quantity: 1, unitMassKg: 80000, unitCostUSD: 1_200_000_000, totalMassKg: 80000, totalCostUSD: 1_200_000_000 },
        { name: 'Power aggregation', category: 'power', quantity: 1, unitMassKg: 20000, unitCostUSD: 800_000_000, totalMassKg: 20000, totalCostUSD: 800_000_000 },
      ]},
      { name: 'Transmitter Array (100 MW)', description: 'Kilometer-scale phased array for continuous power beaming', massKg: 250000, costUSD: 6_000_000_000, items: [
        { name: 'Phased array transmitter modules', category: 'communications', quantity: 10000, unitMassKg: 20, unitCostUSD: 400_000, totalMassKg: 200000, totalCostUSD: 4_000_000_000 },
        { name: 'Beam control & safety systems', category: 'avionics', quantity: 1, unitMassKg: 20000, unitCostUSD: 1_000_000_000, totalMassKg: 20000, totalCostUSD: 1_000_000_000 },
        { name: 'Thermal management', category: 'thermal', quantity: 1, unitMassKg: 30000, unitCostUSD: 1_000_000_000, totalMassKg: 30000, totalCostUSD: 1_000_000_000 },
      ]},
      { name: 'Platform & Assembly', description: 'GEO mega-structure with autonomous robotic assembly', massKg: 150000, costUSD: 4_000_000_000, items: [
        { name: 'Robotic assembly fleet', category: 'robotics', quantity: 1, unitMassKg: 30000, unitCostUSD: 1_500_000_000, totalMassKg: 30000, totalCostUSD: 1_500_000_000 },
        { name: 'Station platforms & trusses', category: 'structure', quantity: 1, unitMassKg: 80000, unitCostUSD: 1_500_000_000, totalMassKg: 80000, totalCostUSD: 1_500_000_000 },
        { name: 'Stationkeeping & propulsion', category: 'propulsion', quantity: 1, unitMassKg: 20000, unitCostUSD: 500_000_000, totalMassKg: 20000, totalCostUSD: 500_000_000 },
        { name: 'GEO bus & comms', category: 'avionics', quantity: 1, unitMassKg: 20000, unitCostUSD: 500_000_000, totalMassKg: 20000, totalCostUSD: 500_000_000 },
      ]},
    ],
    costBreakdown: calculateCostBreakdown(15_000_000_000, 800_000, 0.25, 0.08, 200_000_000, 0.20),
    insurance: calculateInsurance(15_160_000_000, 'Unprecedented scale. Multi-year assembly campaign in GEO. TRL 2 — very high risk premium.'),
    annualOperatingCostUSD: 200_000_000,
    revenueModelNotes: [
      'Baseload power to grid: 100 MW × 8760h × $0.10/kWh = ~$87M/year at utility rates',
      'Premium pricing for 24/7 carbon-free power could yield $200-400M/year',
      'Government contracts for energy security',
      'Requires Starship at $200/kg to be economically viable',
    ],
    referencePrograms: ['ESA SOLARIS long-term roadmap', 'China 2030s SSPS plans', 'NASA SPS-ALPHA concept'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 9. SPACE TUG / ORBITAL TRANSFER VEHICLE
  // ═══════════════════════════════════════════════════
  {
    slug: 'space-tug',
    name: 'Space Tug / Orbital Transfer Vehicle',
    icon: '🚜',
    category: 'services',
    description: 'A reusable orbital transfer vehicle for last-mile delivery, orbit raising, satellite servicing, and debris removal. Can move payloads between orbits (LEO to GEO, GTO to GEO insertion). Based on Momentus Vigoride, Impulse Space Mira, and Northrop MEV concepts.',
    orbit: 'LEO-GEO',
    altitudeKm: 400,
    totalMassKg: 3_500,
    crewCapacity: 0,
    powerKw: 8,
    designLifeYears: 5,
    timelineYears: 3,
    techReadinessLevel: 7,
    subsystems: [
      { name: 'Propulsion System', description: 'High-efficiency electric or chemical propulsion for orbit transfers', massKg: 1500, costUSD: 40_000_000, items: [
        { name: 'Hall-effect thrusters', category: 'propulsion', quantity: 4, unitMassKg: 30, unitCostUSD: 3_000_000, totalMassKg: 120, totalCostUSD: 12_000_000 },
        { name: 'Xenon propellant tanks', category: 'propulsion', quantity: 2, unitMassKg: 200, unitCostUSD: 3_000_000, totalMassKg: 400, totalCostUSD: 6_000_000 },
        { name: 'Xenon propellant', category: 'propulsion', quantity: 1, unitMassKg: 600, unitCostUSD: 6_000_000, totalMassKg: 600, totalCostUSD: 6_000_000 },
        { name: 'Chemical backup thruster', category: 'propulsion', quantity: 1, unitMassKg: 200, unitCostUSD: 5_000_000, totalMassKg: 200, totalCostUSD: 5_000_000 },
        { name: 'Feed system & PPU', category: 'propulsion', quantity: 1, unitMassKg: 180, unitCostUSD: 11_000_000, totalMassKg: 180, totalCostUSD: 11_000_000 },
      ]},
      { name: 'Payload Interface & Capture', description: 'Docking, grapple, and payload accommodation', massKg: 800, costUSD: 25_000_000, items: [
        { name: 'Grapple/capture mechanism', category: 'robotics', quantity: 1, unitMassKg: 300, unitCostUSD: 12_000_000, totalMassKg: 300, totalCostUSD: 12_000_000 },
        { name: 'Payload adapter ring', category: 'docking', quantity: 1, unitMassKg: 200, unitCostUSD: 5_000_000, totalMassKg: 200, totalCostUSD: 5_000_000 },
        { name: 'Sensors & proximity nav', category: 'avionics', quantity: 1, unitMassKg: 300, unitCostUSD: 8_000_000, totalMassKg: 300, totalCostUSD: 8_000_000 },
      ]},
      { name: 'Bus & Power', description: 'Spacecraft bus, solar arrays, batteries, communications', massKg: 1200, costUSD: 30_000_000, items: [
        { name: 'Solar arrays (8 kW)', category: 'power', quantity: 2, unitMassKg: 200, unitCostUSD: 5_000_000, totalMassKg: 400, totalCostUSD: 10_000_000 },
        { name: 'Avionics & flight software', category: 'avionics', quantity: 1, unitMassKg: 300, unitCostUSD: 10_000_000, totalMassKg: 300, totalCostUSD: 10_000_000 },
        { name: 'Batteries & power distribution', category: 'power', quantity: 1, unitMassKg: 250, unitCostUSD: 4_000_000, totalMassKg: 250, totalCostUSD: 4_000_000 },
        { name: 'Communications & structure', category: 'communications', quantity: 1, unitMassKg: 250, unitCostUSD: 6_000_000, totalMassKg: 250, totalCostUSD: 6_000_000 },
      ]},
    ],
    costBreakdown: calculateCostBreakdown(95_000_000, 3_500, 0.05, 0.10, 10_000_000),
    insurance: calculateInsurance(100_250_000, 'Proven concept (MEV-1/2 heritage). Multiple docking events increase risk per mission.'),
    annualOperatingCostUSD: 10_000_000,
    revenueModelNotes: [
      'Last-mile delivery service: $5-15M per transfer',
      'GEO satellite life extension: $10-15M per year per satellite (MEV pricing)',
      'Debris removal contracts: $5-20M per object',
      'Rideshare orbit raising: $1-5M per smallsat',
    ],
    referencePrograms: ['Northrop Grumman MEV-1/MEV-2 ($150M each)', 'Momentus Vigoride ($10-30M)', 'Impulse Space Mira'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 10. FREE-FLYING RESEARCH LABORATORY
  // ═══════════════════════════════════════════════════
  {
    slug: 'research-lab',
    name: 'Free-Flying Research Laboratory',
    icon: '🔬',
    category: 'science',
    description: 'An autonomous free-flying microgravity laboratory for materials science, biotech, and physics experiments. Provides ultra-quiet microgravity environment (no crew disturbances). Periodically visited for experiment swap-out. Based on ESA Columbus Free-Flyer concepts.',
    orbit: 'LEO',
    altitudeKm: 450,
    totalMassKg: 6_000,
    crewCapacity: 0,
    powerKw: 12,
    designLifeYears: 10,
    timelineYears: 3,
    techReadinessLevel: 7,
    subsystems: [
      { name: 'Laboratory Module', description: 'Pressurized experiment chamber with 8 research racks', massKg: 3000, costUSD: 110_000_000, items: [
        { name: 'Pressure vessel', category: 'structure', quantity: 1, unitMassKg: 1500, unitCostUSD: 40_000_000, totalMassKg: 1500, totalCostUSD: 40_000_000 },
        { name: 'Research racks', category: 'payload', quantity: 8, unitMassKg: 100, unitCostUSD: 5_000_000, totalMassKg: 800, totalCostUSD: 40_000_000 },
        { name: 'Vibration isolation', category: 'structure', quantity: 1, unitMassKg: 300, unitCostUSD: 12_000_000, totalMassKg: 300, totalCostUSD: 12_000_000 },
        { name: 'Experiment automation', category: 'robotics', quantity: 1, unitMassKg: 200, unitCostUSD: 10_000_000, totalMassKg: 200, totalCostUSD: 10_000_000 },
        { name: 'Environment control', category: 'life_support', quantity: 1, unitMassKg: 200, unitCostUSD: 8_000_000, totalMassKg: 200, totalCostUSD: 8_000_000 },
      ]},
      { name: 'Bus & Support', description: 'Power, propulsion, communications, docking', massKg: 3000, costUSD: 65_000_000, items: [
        { name: 'Solar arrays (12 kW)', category: 'power', quantity: 2, unitMassKg: 400, unitCostUSD: 10_000_000, totalMassKg: 800, totalCostUSD: 20_000_000 },
        { name: 'Avionics & GN&C', category: 'avionics', quantity: 1, unitMassKg: 500, unitCostUSD: 15_000_000, totalMassKg: 500, totalCostUSD: 15_000_000 },
        { name: 'Propulsion', category: 'propulsion', quantity: 1, unitMassKg: 600, unitCostUSD: 10_000_000, totalMassKg: 600, totalCostUSD: 10_000_000 },
        { name: 'Docking adapter', category: 'docking', quantity: 1, unitMassKg: 500, unitCostUSD: 10_000_000, totalMassKg: 500, totalCostUSD: 10_000_000 },
        { name: 'Thermal & communications', category: 'thermal', quantity: 1, unitMassKg: 600, unitCostUSD: 10_000_000, totalMassKg: 600, totalCostUSD: 10_000_000 },
      ]},
    ],
    costBreakdown: calculateCostBreakdown(175_000_000, 6_000, 0.05, 0.10, 15_000_000),
    insurance: calculateInsurance(184_000_000, 'Autonomous lab — standard commercial satellite risk. Docking visits add minor complexity.'),
    annualOperatingCostUSD: 15_000_000,
    revenueModelNotes: [
      'Research rack rental: $3-8M per rack per year',
      'Pharma/biotech experiment hosting: $5-50M per campaign',
      'Government research grants (NASA, ESA, JAXA)',
      'Ultra-quiet microgravity premium over crewed stations',
    ],
    referencePrograms: ['ESA Free-Flyer studies', 'Bishop Airlock (Nanoracks)', 'Space Tango CubeLab'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },

  // ═══════════════════════════════════════════════════
  // 11. ORBITAL DEBRIS REMOVAL PLATFORM
  // ═══════════════════════════════════════════════════
  {
    slug: 'debris-removal',
    name: 'Orbital Debris Removal Platform',
    icon: '🧹',
    category: 'services',
    description: 'An active debris removal (ADR) spacecraft designed to capture and deorbit large debris objects. Uses rendezvous, proximity ops, and mechanical capture to attach to non-cooperative targets. Based on ClearSpace-1, Astroscale ELSA-d, and D-Orbit concepts.',
    orbit: 'LEO',
    altitudeKm: 800,
    totalMassKg: 2_500,
    crewCapacity: 0,
    powerKw: 5,
    designLifeYears: 3,
    timelineYears: 3,
    techReadinessLevel: 7,
    subsystems: [
      { name: 'Capture System', description: 'Robotic arms and magnetic/mechanical capture for non-cooperative targets', massKg: 800, costUSD: 40_000_000, items: [
        { name: 'Robotic capture arms', category: 'robotics', quantity: 4, unitMassKg: 80, unitCostUSD: 5_000_000, totalMassKg: 320, totalCostUSD: 20_000_000 },
        { name: 'Target sensors (LIDAR, cameras)', category: 'avionics', quantity: 1, unitMassKg: 200, unitCostUSD: 10_000_000, totalMassKg: 200, totalCostUSD: 10_000_000 },
        { name: 'Capture mechanism (net/clamp)', category: 'robotics', quantity: 1, unitMassKg: 280, unitCostUSD: 10_000_000, totalMassKg: 280, totalCostUSD: 10_000_000 },
      ]},
      { name: 'Spacecraft Bus', description: 'Agile maneuvering platform with precision GN&C', massKg: 1700, costUSD: 55_000_000, items: [
        { name: 'Propulsion (bipropellant)', category: 'propulsion', quantity: 1, unitMassKg: 800, unitCostUSD: 15_000_000, totalMassKg: 800, totalCostUSD: 15_000_000 },
        { name: 'Avionics & autonomy', category: 'avionics', quantity: 1, unitMassKg: 300, unitCostUSD: 18_000_000, totalMassKg: 300, totalCostUSD: 18_000_000 },
        { name: 'Solar arrays & power', category: 'power', quantity: 1, unitMassKg: 300, unitCostUSD: 8_000_000, totalMassKg: 300, totalCostUSD: 8_000_000 },
        { name: 'Communications & structure', category: 'communications', quantity: 1, unitMassKg: 300, unitCostUSD: 14_000_000, totalMassKg: 300, totalCostUSD: 14_000_000 },
      ]},
    ],
    costBreakdown: calculateCostBreakdown(95_000_000, 2_500, 0.05, 0.10, 8_000_000),
    insurance: calculateInsurance(98_750_000, 'Non-cooperative target rendezvous — elevated risk. Pioneering mission profile.'),
    annualOperatingCostUSD: 8_000_000,
    revenueModelNotes: [
      'ESA/government debris removal contracts: $50-100M per object',
      'Insurance company sponsored removal: Reduce orbital debris risk premiums',
      'Regulatory compliance service: Help operators meet 25-year deorbit rule',
      'Multi-target servicing missions to reduce per-unit cost',
    ],
    referencePrograms: ['ClearSpace-1 (ESA, ~€100M)', 'Astroscale ELSA-d/m ($50M+)', 'D-Orbit ION carrier'],
    crossLinks: { insurancePage: true, resourceExchange: true, launchVehicles: true, missionCost: true },
  },
];

// ── Utility Functions ──────────────────────────────

export function getOrbitalSystem(slug: string): OrbitalSystem | undefined {
  return ORBITAL_SYSTEMS.find((s) => s.slug === slug);
}

export function getOrbitalSystemsByCategory(category: OrbitalSystem['category']): OrbitalSystem[] {
  return ORBITAL_SYSTEMS.filter((s) => s.category === category);
}

export function getAllCategories(): { value: string; label: string; icon: string; count: number }[] {
  const categories: Record<string, { label: string; icon: string; count: number }> = {
    habitat: { label: 'Orbital Habitats', icon: '🏠', count: 0 },
    manufacturing: { label: 'Manufacturing', icon: '🏭', count: 0 },
    infrastructure: { label: 'Infrastructure', icon: '🔧', count: 0 },
    power: { label: 'Power Systems', icon: '⚡', count: 0 },
    services: { label: 'Orbital Services', icon: '🚜', count: 0 },
    science: { label: 'Science & Research', icon: '🔬', count: 0 },
  };

  for (const system of ORBITAL_SYSTEMS) {
    if (categories[system.category]) {
      categories[system.category].count++;
    }
  }

  return Object.entries(categories).map(([value, data]) => ({ value, ...data }));
}

export function formatCostCompact(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

export function formatMass(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M kg`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}t`;
  return `${kg.toFixed(0)} kg`;
}

export function getTRLLabel(trl: number): string {
  const labels: Record<number, string> = {
    1: 'Basic principles',
    2: 'Concept formulated',
    3: 'Proof of concept',
    4: 'Lab validated',
    5: 'Relevant environment',
    6: 'Demo in relevant env',
    7: 'System prototype',
    8: 'Qualified system',
    9: 'Flight proven',
  };
  return labels[trl] || `TRL ${trl}`;
}

export function getTRLColor(trl: number): string {
  if (trl >= 7) return 'text-green-500';
  if (trl >= 5) return 'text-yellow-500';
  if (trl >= 3) return 'text-orange-500';
  return 'text-red-500';
}
