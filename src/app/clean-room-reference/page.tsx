'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type ActiveSection = 'iso-classes' | 'contamination' | 'requirements' | 'outgassing' | 'cleaning' | 'hvac';

interface ISOClass {
  isoClass: number;
  fedStdName: string;
  particles_0_1: number | null;
  particles_0_2: number | null;
  particles_0_3: number | null;
  particles_0_5: number | null;
  particles_1_0: number | null;
  particles_5_0: number | null;
  spaceApplications: string[];
  color: string;
}

interface ContaminationType {
  name: string;
  category: 'Particulate' | 'Molecular' | 'Biological';
  description: string;
  measurementStandard: string;
  measurementMethod: string;
  criticalConcern: string;
  mitigationStrategies: string[];
}

interface MissionRequirement {
  missionType: string;
  isoClass: string;
  particleLevel: string;
  molecularReq: string;
  biologicalReq: string;
  examples: string[];
  notes: string;
  stringency: 'Stringent' | 'Moderate' | 'Standard' | 'Relaxed';
}

interface OutgassingMaterial {
  name: string;
  category: string;
  tml: number;
  cvcm: number;
  wvr: number | null;
  passesE595: boolean;
  commonUses: string[];
  notes: string;
  outgassingLevel: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Restricted';
}

interface CleaningProcedure {
  name: string;
  method: string;
  description: string;
  solventsOrAgents: string[];
  temperatureRange: string;
  duration: string;
  effectiveness: string;
  applicableSurfaces: string[];
  precautions: string[];
  standard: string;
}

interface HVACRequirement {
  isoClass: number;
  airChangesPerHour: string;
  filterType: string;
  filterEfficiency: string;
  airVelocity: string;
  pressureDifferential: string;
  tempRange: string;
  humidityRange: string;
  monitoringFrequency: string;
}

// ────────────────────────────────────────
// ISO 14644-1 Clean Room Classification Data
// ────────────────────────────────────────

const ISO_CLASSES: ISOClass[] = [
  {
    isoClass: 1,
    fedStdName: 'Class 1',
    particles_0_1: 10,
    particles_0_2: 2,
    particles_0_3: null,
    particles_0_5: null,
    particles_1_0: null,
    particles_5_0: null,
    spaceApplications: ['Extreme UV lithography for space-grade semiconductors', 'Gravitational wave detector optics'],
    color: '#06b6d4',
  },
  {
    isoClass: 2,
    fedStdName: 'Class 10',
    particles_0_1: 100,
    particles_0_2: 24,
    particles_0_3: 10,
    particles_0_5: 4,
    particles_1_0: null,
    particles_5_0: null,
    spaceApplications: ['Space telescope primary mirrors', 'Extreme precision optical elements'],
    color: '#22d3ee',
  },
  {
    isoClass: 3,
    fedStdName: 'Class 100',
    particles_0_1: 1000,
    particles_0_2: 237,
    particles_0_3: 102,
    particles_0_5: 35,
    particles_1_0: 8,
    particles_5_0: null,
    spaceApplications: ['JWST mirror segment assembly', 'High-performance IR detector focal planes'],
    color: '#67e8f9',
  },
  {
    isoClass: 4,
    fedStdName: 'Class 1,000',
    particles_0_1: 10000,
    particles_0_2: 2370,
    particles_0_3: 1020,
    particles_0_5: 352,
    particles_1_0: 83,
    particles_5_0: null,
    spaceApplications: ['Star tracker optics assembly', 'Precision laser components', 'Gyroscope assemblies'],
    color: '#a5f3fc',
  },
  {
    isoClass: 5,
    fedStdName: 'Class 100',
    particles_0_1: 100000,
    particles_0_2: 23700,
    particles_0_3: 10200,
    particles_0_5: 3520,
    particles_1_0: 832,
    particles_5_0: 29,
    spaceApplications: ['Optical payload assembly', 'Infrared detectors & focal planes', 'Sensitive instrument integration', 'Solar cell assembly'],
    color: '#fbbf24',
  },
  {
    isoClass: 6,
    fedStdName: 'Class 1,000',
    particles_0_1: 1000000,
    particles_0_2: 237000,
    particles_0_3: 102000,
    particles_0_5: 35200,
    particles_1_0: 8320,
    particles_5_0: 293,
    spaceApplications: ['Electronics assembly & soldering', 'Thermal blanket (MLI) fabrication', 'Propellant valve assembly'],
    color: '#fb923c',
  },
  {
    isoClass: 7,
    fedStdName: 'Class 10,000',
    particles_0_1: null,
    particles_0_2: null,
    particles_0_3: null,
    particles_0_5: 352000,
    particles_1_0: 83200,
    particles_5_0: 2930,
    spaceApplications: ['General spacecraft assembly', 'Satellite bus integration', 'Reaction wheel assembly', 'Harness integration'],
    color: '#f97316',
  },
  {
    isoClass: 8,
    fedStdName: 'Class 100,000',
    particles_0_1: null,
    particles_0_2: null,
    particles_0_3: null,
    particles_0_5: 3520000,
    particles_1_0: 832000,
    particles_5_0: 29300,
    spaceApplications: ['Large structure assembly', 'Solar array fabrication', 'Antenna reflector integration', 'CubeSat assembly'],
    color: '#ef4444',
  },
  {
    isoClass: 9,
    fedStdName: 'Class 1,000,000',
    particles_0_1: null,
    particles_0_2: null,
    particles_0_3: null,
    particles_0_5: 35200000,
    particles_1_0: 8320000,
    particles_5_0: 293000,
    spaceApplications: ['Receiving inspection areas', 'Warehouse / controlled storage', 'Non-critical structural bonding'],
    color: '#dc2626',
  },
];

// ────────────────────────────────────────
// Contamination Types
// ────────────────────────────────────────

const CONTAMINATION_TYPES: ContaminationType[] = [
  {
    name: 'Surface Particulate',
    category: 'Particulate',
    description: 'Discrete particles deposited on surfaces, measured as particle count per unit area at specified sizes. Particles can scatter light in optical systems, cause electrical shorts, and degrade thermal control surfaces.',
    measurementStandard: 'MIL-STD-1246C / IEST-STD-CC1246E',
    measurementMethod: 'Tape lift, witness plates, optical particle counters, laser surface scanners',
    criticalConcern: 'Optical scatter, electrical shorts, thermal emissivity changes, mechanical interference in MEMS',
    mitigationStrategies: ['HEPA/ULPA filtered laminar flow', 'Cleanroom garments (bunny suits)', 'Tacky mats at entries', 'Regular surface wipe-downs', 'Particle fallout monitoring via witness plates'],
  },
  {
    name: 'Airborne Particulate',
    category: 'Particulate',
    description: 'Particles suspended in the clean room air volume. Controlled by ISO 14644-1 classification. Primary source of surface deposition over time.',
    measurementStandard: 'ISO 14644-1:2015',
    measurementMethod: 'Optical particle counters (OPC), condensation particle counters for <0.1 micron',
    criticalConcern: 'Continuous deposition on exposed hardware, rate depends on airflow patterns and particle concentration',
    mitigationStrategies: ['HEPA filtration (99.97% at 0.3 micron)', 'ULPA filtration (99.9995% at 0.12 micron)', 'Unidirectional laminar airflow', 'Positive pressure differential', 'Gowning protocols'],
  },
  {
    name: 'Molecular Outgassing',
    category: 'Molecular',
    description: 'Volatile compounds released from materials in vacuum, measured as Total Mass Loss (TML) and Collected Volatile Condensable Material (CVCM) per ASTM E595. Condensable molecules deposit on cold surfaces.',
    measurementStandard: 'NASA ASTM E595 (TML <1.0%, CVCM <0.1%)',
    measurementMethod: 'Thermogravimetric analysis (TGA), ASTM E595 test (125C, 24hr, vacuum), quartz crystal microbalance (QCM)',
    criticalConcern: 'Deposits on optics causing transmission loss, degrades thermal control coatings, contaminates sensitive detectors',
    mitigationStrategies: ['Material selection per NASA outgassing database', 'Bake-out procedures before integration', 'Molecular adsorbers / getters', 'Venting path design', 'QCM monitoring during thermal vacuum testing'],
  },
  {
    name: 'Non-Volatile Residue (NVR)',
    category: 'Molecular',
    description: 'Thin film of non-volatile organic compounds on surfaces, typically from fingerprints, lubricants, adhesive residues, and manufacturing processes. Measured in mass per unit area (mg/0.1m\u00B2).',
    measurementStandard: 'IEST-STD-CC1246E (Levels A through J)',
    measurementMethod: 'Solvent rinse and gravimetric analysis, optically stimulated electron emission (OSEE), contact angle measurement',
    criticalConcern: 'Degrades adhesive bond strength, changes surface energy, absorbs UV causing darkening, contaminates optical coatings',
    mitigationStrategies: ['Precision solvent cleaning (IPA, acetone)', 'UV/ozone cleaning', 'Glove protocols (powder-free nitrile)', 'NVR witness coupons', 'Surface energy verification'],
  },
  {
    name: 'Biological - Category I',
    category: 'Biological',
    description: 'COSPAR Category I: Missions where contamination is not a concern (e.g., flyby of Sun, Mercury). No special requirements.',
    measurementStandard: 'COSPAR Planetary Protection Policy',
    measurementMethod: 'N/A for Category I',
    criticalConcern: 'None for this category',
    mitigationStrategies: ['Standard clean room practices sufficient'],
  },
  {
    name: 'Biological - Category II',
    category: 'Biological',
    description: 'COSPAR Category II: Missions with only remote chance of contamination concern (e.g., Venus lander, Moon lander). Documentation required.',
    measurementStandard: 'COSPAR Planetary Protection Policy',
    measurementMethod: 'Documentation of contamination history',
    criticalConcern: 'Low probability of biological contamination of target body',
    mitigationStrategies: ['Standard clean room assembly', 'Contamination documentation plan', 'Short pre-launch report'],
  },
  {
    name: 'Biological - Category III',
    category: 'Biological',
    description: 'COSPAR Category III: Flyby/orbiter missions to bodies of biological interest (e.g., Mars orbiter, Europa flyby). Must demonstrate low probability of impact.',
    measurementStandard: 'COSPAR Planetary Protection Policy, NPR 8020.12D',
    measurementMethod: 'Trajectory biasing analysis, bioburden assay by NASA standard assay (spore counts)',
    criticalConcern: 'Accidental impact and contamination of target body with Earth organisms',
    mitigationStrategies: ['Trajectory biasing to avoid impact', 'Bioburden documentation', 'Cleanroom assembly with bioburden controls', 'End-of-mission disposal planning'],
  },
  {
    name: 'Biological - Category IV',
    category: 'Biological',
    description: 'COSPAR Category IV: Landers/probes to bodies of biological interest (e.g., Mars landers, Europa lander). Stringent bioburden limits. Mars: <300,000 spores total, <300 spores per m\u00B2.',
    measurementStandard: 'COSPAR Planetary Protection Policy, NPR 8020.12D, NASA-STD-5017',
    measurementMethod: 'NASA standard bioassay (spore counts), ATP luminometry, molecular assays (16S rRNA)',
    criticalConcern: 'Direct contamination of potentially habitable environment with Earth organisms, compromising detection of extraterrestrial life',
    mitigationStrategies: ['Dry heat microbial reduction (DHMR)', 'Vapor hydrogen peroxide (VHP) sterilization', 'ISO 5 or better bioburden-controlled clean room', 'Biobarriers for re-contamination prevention', 'Stringent spore count monitoring', 'Viking-level sterilization for special regions'],
  },
  {
    name: 'Biological - Category V',
    category: 'Biological',
    description: 'COSPAR Category V: Sample return missions from bodies of biological interest. "Restricted Earth return" requires containment of returned samples to prevent backward contamination of Earth.',
    measurementStandard: 'COSPAR Planetary Protection Policy, NPR 8020.12D',
    measurementMethod: 'Containment verification, break-the-chain analysis, sample handling protocol validation',
    criticalConcern: 'Backward contamination: preventing uncontrolled release of potentially hazardous extraterrestrial material on Earth',
    mitigationStrategies: ['Hermetic sample containment (triple containment)', 'Break-the-chain sterilization protocol', 'BSL-4 equivalent receiving facility', 'Automated sample handling to prevent human contact', 'Re-entry vehicle integrity assurance'],
  },
];

// ────────────────────────────────────────
// Spacecraft Cleanliness Requirements by Mission Type
// ────────────────────────────────────────

const MISSION_REQUIREMENTS: MissionRequirement[] = [
  {
    missionType: 'Earth Observation / Optical',
    isoClass: 'ISO 5',
    particleLevel: 'Level 300 A/2',
    molecularReq: 'NVR Level A (<1 mg/0.1m\u00B2), CVCM <0.1%',
    biologicalReq: 'Standard (COSPAR Cat I)',
    examples: ['Landsat', 'WorldView', 'Sentinel-2', 'GOES-R ABI'],
    notes: 'Most stringent particulate and molecular requirements due to optical surface sensitivity. Contamination directly degrades imaging performance.',
    stringency: 'Stringent',
  },
  {
    missionType: 'Communications Satellite',
    isoClass: 'ISO 7',
    particleLevel: 'Level 500',
    molecularReq: 'NVR Level C (<3 mg/0.1m\u00B2), CVCM <0.1%',
    biologicalReq: 'Standard (COSPAR Cat I)',
    examples: ['Intelsat', 'SES', 'Viasat-3', 'O3b mPOWER'],
    notes: 'Moderate requirements. RF payloads less sensitive than optical, but thermal control surfaces and solar arrays still require cleanliness.',
    stringency: 'Moderate',
  },
  {
    missionType: 'Scientific / Planetary Mission',
    isoClass: 'ISO 5-7',
    particleLevel: 'Level 300-500',
    molecularReq: 'NVR Level A-B, CVCM <0.1%',
    biologicalReq: 'COSPAR Cat III-IV (mission dependent)',
    examples: ['Mars 2020 / Perseverance', 'Europa Clipper', 'JUICE', 'Dragonfly'],
    notes: 'Wide range depending on instruments. Planetary protection adds biological contamination control. Mars landers require Category IV (bioburden limits).',
    stringency: 'Stringent',
  },
  {
    missionType: 'Mars Surface Mission',
    isoClass: 'ISO 5-7',
    particleLevel: 'Level 300 A',
    molecularReq: 'NVR Level A, CVCM <0.1%, organic inventory',
    biologicalReq: 'NASA Category IV: <300,000 spores total, <300 spores/m\u00B2',
    examples: ['Mars 2020 / Perseverance', 'InSight', 'Mars Sample Return'],
    notes: 'Dual contamination concern: particulate/molecular for instruments AND biological for planetary protection. Sample-handling hardware may require Viking-level sterilization.',
    stringency: 'Stringent',
  },
  {
    missionType: 'CubeSat / SmallSat',
    isoClass: 'ISO 7-8',
    particleLevel: 'Level 500-750',
    molecularReq: 'NVR Level C-D, standard ASTM E595 compliance',
    biologicalReq: 'Standard (COSPAR Cat I, unless planetary)',
    examples: ['TROPICS', 'MarCO', 'BioSentinel', 'Lunar Flashlight'],
    notes: 'Less stringent due to cost constraints and shorter mission life. University labs often use ISO 7-8 flow benches within less controlled rooms.',
    stringency: 'Relaxed',
  },
  {
    missionType: 'Crewed Spacecraft',
    isoClass: 'ISO 7-8',
    particleLevel: 'Level 500',
    molecularReq: 'NVR Level B, toxicity screening per NASA-STD-6001',
    biologicalReq: 'Standard plus crew health (cabin air quality)',
    examples: ['Orion', 'Crew Dragon', 'Starliner', 'Lunar Gateway modules'],
    notes: 'Crew health adds toxicity and offgassing requirements beyond standard contamination control. Materials must pass NASA-STD-6001 flammability and offgassing.',
    stringency: 'Moderate',
  },
  {
    missionType: 'Space Telescope / Astronomy',
    isoClass: 'ISO 4-5',
    particleLevel: 'Level 200-300 A',
    molecularReq: 'NVR Level A (<1 mg/0.1m\u00B2), molecular cleanliness Class A',
    biologicalReq: 'Standard (COSPAR Cat I)',
    examples: ['JWST', 'Roman Space Telescope', 'Hubble (servicing)', 'Chandra'],
    notes: 'Most demanding contamination control in aerospace. JWST required ISO 5 with molecular controls exceeding standard practice. Cryogenic optics act as molecular cold traps.',
    stringency: 'Stringent',
  },
  {
    missionType: 'Launch Vehicle Fairing',
    isoClass: 'ISO 8',
    particleLevel: 'Level 750',
    molecularReq: 'NVR Level C, outgassing per ASTM E595',
    biologicalReq: 'N/A (unless payload requires it)',
    examples: ['Falcon 9 fairing', 'Vulcan fairing', 'Ariane 6 fairing', 'H3 fairing'],
    notes: 'Launch providers certify fairing cleanliness to specified levels. Payload contamination budgets must account for fairing environment during encapsulation and launch.',
    stringency: 'Standard',
  },
];

// ────────────────────────────────────────
// Materials Outgassing Database
// ────────────────────────────────────────

const OUTGASSING_MATERIALS: OutgassingMaterial[] = [
  {
    name: 'Kapton (Polyimide Film)',
    category: 'Polymer Film',
    tml: 0.96,
    cvcm: 0.02,
    wvr: 0.58,
    passesE595: true,
    commonUses: ['Thermal blankets (MLI)', 'Flexible circuit substrates', 'Cable insulation', 'Heater elements'],
    notes: 'Industry standard for space-grade polymer film. Excellent thermal and radiation stability.',
    outgassingLevel: 'Low',
  },
  {
    name: 'Silicone Adhesive (RTV-566)',
    category: 'Adhesive',
    tml: 2.15,
    cvcm: 0.42,
    wvr: null,
    passesE595: false,
    commonUses: ['Thermal interface', 'Potting compound', 'Gaskets', 'Conformal coating'],
    notes: 'Fails ASTM E595 limits. Requires bake-out before use or substitution with low-outgassing alternative. Silicone deposits cause optics contamination.',
    outgassingLevel: 'High',
  },
  {
    name: 'Silicone Adhesive (CV-2566, low outgas)',
    category: 'Adhesive',
    tml: 0.55,
    cvcm: 0.03,
    wvr: null,
    passesE595: true,
    commonUses: ['Thermal interface (space-grade)', 'Potting compound', 'Gaskets'],
    notes: 'Low-outgassing silicone reformulation. Meets ASTM E595 requirements. Preferred over standard silicone RTV.',
    outgassingLevel: 'Low',
  },
  {
    name: 'Epoxy (Hysol EA 9396)',
    category: 'Adhesive',
    tml: 0.69,
    cvcm: 0.01,
    wvr: 0.29,
    passesE595: true,
    commonUses: ['Structural bonding', 'Insert potting', 'Composite lamination', 'Optical element bonding'],
    notes: 'Widely used space-grade structural adhesive. Requires proper cure cycle to minimize residual volatiles.',
    outgassingLevel: 'Moderate',
  },
  {
    name: 'PTFE / Teflon',
    category: 'Polymer',
    tml: 0.01,
    cvcm: 0.00,
    wvr: 0.00,
    passesE595: true,
    commonUses: ['Wire insulation', 'Bearings', 'Seals', 'Thermal blanket layers', 'Tubing'],
    notes: 'Extremely low outgassing. Industry gold standard for low-contamination polymer. Radiation resistance is moderate.',
    outgassingLevel: 'Very Low',
  },
  {
    name: 'PVC (Polyvinyl Chloride)',
    category: 'Polymer',
    tml: 3.80,
    cvcm: 1.50,
    wvr: null,
    passesE595: false,
    commonUses: ['RESTRICTED in spacecraft', 'Ground support equipment only'],
    notes: 'Heavily restricted or banned for spacecraft use. Extremely high outgassing, releases plasticizers and HCl. Common in commercial cables but must be replaced for flight hardware.',
    outgassingLevel: 'Restricted',
  },
  {
    name: 'Vectran (Liquid Crystal Polymer)',
    category: 'Fiber / Fabric',
    tml: 0.12,
    cvcm: 0.01,
    wvr: 0.04,
    passesE595: true,
    commonUses: ['Airbag landing systems', 'Tethers', 'Ballistic protection', 'Inflatable structures'],
    notes: 'Very low outgassing fiber. Used in Mars landing airbags (MER). Good strength-to-weight ratio.',
    outgassingLevel: 'Very Low',
  },
  {
    name: 'Aluminum 6061-T6',
    category: 'Metal',
    tml: 0.02,
    cvcm: 0.00,
    wvr: 0.01,
    passesE595: true,
    commonUses: ['Spacecraft structures', 'Brackets', 'Housings', 'Optical bench substrate'],
    notes: 'Metals have negligible outgassing. Concern is trapped fluids in machining pores; precision cleaning required.',
    outgassingLevel: 'Very Low',
  },
  {
    name: 'Nylon (Polyamide)',
    category: 'Polymer',
    tml: 2.45,
    cvcm: 0.21,
    wvr: 1.80,
    passesE595: false,
    commonUses: ['RESTRICTED: cable ties (ground only)', 'Use PEEK or Vespel substitutes for flight'],
    notes: 'Fails ASTM E595 due to moisture absorption and outgassing. Common terrestrial material that must be substituted for space use.',
    outgassingLevel: 'High',
  },
  {
    name: 'PEEK (Polyetheretherketone)',
    category: 'Polymer',
    tml: 0.14,
    cvcm: 0.01,
    wvr: 0.08,
    passesE595: true,
    commonUses: ['Structural fasteners', 'Bushings', 'Electrical connectors', 'Cable ties (space-grade)'],
    notes: 'Excellent space-grade polymer. Replaces nylon and many engineering plastics. Good radiation and thermal resistance.',
    outgassingLevel: 'Very Low',
  },
  {
    name: 'Vespel SP-1 (Polyimide)',
    category: 'Polymer',
    tml: 0.39,
    cvcm: 0.00,
    wvr: 0.25,
    passesE595: true,
    commonUses: ['Thermal isolators', 'Bearings', 'Bushings', 'Seal rings', 'Electrical standoffs'],
    notes: 'Excellent low-outgassing polyimide for structural applications. Zero CVCM makes it ideal near sensitive optics.',
    outgassingLevel: 'Low',
  },
  {
    name: 'Germanium (optical window)',
    category: 'Optical Material',
    tml: 0.00,
    cvcm: 0.00,
    wvr: 0.00,
    passesE595: true,
    commonUses: ['IR windows', 'Lenses', 'Thermal imaging optics', 'Beam splitters'],
    notes: 'Inorganic optical material, zero outgassing. Contamination concern is surface molecular deposition FROM other materials.',
    outgassingLevel: 'Very Low',
  },
  {
    name: 'FR-4 Circuit Board (with conformal coat)',
    category: 'Electronics',
    tml: 0.85,
    cvcm: 0.05,
    wvr: 0.42,
    passesE595: true,
    commonUses: ['Printed circuit boards', 'Electronic assemblies', 'Avionics boxes'],
    notes: 'Marginally passes ASTM E595. Conformal coating is critical to meet limits. Some FR-4 variants fail without pre-bake.',
    outgassingLevel: 'Moderate',
  },
  {
    name: 'Acrylic Adhesive (3M 966)',
    category: 'Adhesive / Tape',
    tml: 0.65,
    cvcm: 0.02,
    wvr: 0.35,
    passesE595: true,
    commonUses: ['Transfer adhesive tape', 'MLI attachment', 'Label bonding', 'Shielding attachment'],
    notes: 'Space-approved acrylic transfer adhesive. Good alternative to silicone-based tapes for contamination-sensitive areas.',
    outgassingLevel: 'Moderate',
  },
  {
    name: 'Braycote 601EF (PFPE Lubricant)',
    category: 'Lubricant',
    tml: 0.15,
    cvcm: 0.01,
    wvr: 0.03,
    passesE595: true,
    commonUses: ['Bearing lubrication', 'Mechanism lubrication', 'Deployment hinges', 'Reaction wheels'],
    notes: 'Standard space-grade PFPE lubricant. Very low outgassing and vapor pressure. Requires controlled application quantity.',
    outgassingLevel: 'Very Low',
  },
  {
    name: 'Uralane 5753 (Polyurethane)',
    category: 'Potting Compound',
    tml: 0.48,
    cvcm: 0.01,
    wvr: 0.22,
    passesE595: true,
    commonUses: ['Wire harness potting', 'Connector potting', 'Strain relief', 'Electronics encapsulation'],
    notes: 'Space-qualified polyurethane potting compound. Meets ASTM E595 with proper cure. Common in harness fabrication.',
    outgassingLevel: 'Low',
  },
  {
    name: 'MAP / SCV Conformal Coating',
    category: 'Coating',
    tml: 0.90,
    cvcm: 0.08,
    wvr: 0.30,
    passesE595: true,
    commonUses: ['Circuit board conformal coating', 'Electronics moisture barrier', 'Corrosion protection'],
    notes: 'At the limit of ASTM E595 compliance. Critical to apply correct thickness and cure fully. Pre-bake recommended for sensitive missions.',
    outgassingLevel: 'Moderate',
  },
];

// ────────────────────────────────────────
// Cleaning Procedures
// ────────────────────────────────────────

const CLEANING_PROCEDURES: CleaningProcedure[] = [
  {
    name: 'IPA Solvent Wipe',
    method: 'Solvent Cleaning',
    description: 'Manual wipe-down using lint-free wipes saturated with isopropyl alcohol (IPA). Most common first-step cleaning method. Removes particulate and light molecular contamination.',
    solventsOrAgents: ['Isopropyl Alcohol (IPA) 99.7%+ purity', 'Semiconductor-grade preferred'],
    temperatureRange: 'Ambient (20-25\u00B0C)',
    duration: '5-15 minutes per surface area',
    effectiveness: 'Removes 80-90% of surface particulate and NVR Level C-D contamination',
    applicableSurfaces: ['Metals', 'Glass', 'Ceramics', 'Most polymers (check compatibility)', 'Painted surfaces (check compatibility)'],
    precautions: ['Use unidirectional wiping only', 'Change wipes frequently to avoid re-deposition', 'Verify material compatibility', 'Adequate ventilation required', 'ESD precautions for electronics'],
    standard: 'IEST-STD-CC1246E, NASA-STD-5009',
  },
  {
    name: 'Acetone Precision Clean',
    method: 'Solvent Cleaning',
    description: 'Aggressive solvent cleaning for removal of stubborn organic residues, adhesive remnants, and heavy NVR contamination. Often used as a first step before IPA final clean.',
    solventsOrAgents: ['Acetone (semiconductor grade)', 'Follow with IPA rinse'],
    temperatureRange: 'Ambient (20-25\u00B0C)',
    duration: '5-10 minutes, followed by IPA rinse',
    effectiveness: 'Removes heavy organic contamination, adhesive residues, oils. Achieves NVR Level B-C',
    applicableSurfaces: ['Metals', 'Glass', 'Ceramics'],
    precautions: ['Attacks many polymers and plastics - verify compatibility', 'Highly flammable', 'Rapid evaporation can leave residue if not followed by IPA', 'Never use on painted surfaces', 'Strong ventilation required'],
    standard: 'NASA-STD-5009',
  },
  {
    name: 'Aqueous Precision Cleaning',
    method: 'Precision Cleaning',
    description: 'Multi-stage ultrasonic cleaning in heated deionized water with controlled detergent, followed by cascading DI rinses and clean-air drying. Achieves highest cleanliness levels.',
    solventsOrAgents: ['Deionized water (18 M-ohm)', 'Brulin 815GD or equivalent low-residue detergent', 'Cascading DI rinse stages'],
    temperatureRange: '40-60\u00B0C (ultrasonic bath), ambient rinse',
    duration: '30-60 minutes total cycle (wash, rinse, dry)',
    effectiveness: 'Achieves Level 200-300 particulate, NVR Level A. Industry standard for flight hardware precision cleaning.',
    applicableSurfaces: ['Metals', 'Glass', 'Ceramics', 'Selected polymers', 'Machined parts', 'Optical mounts'],
    precautions: ['Parts must be compatible with immersion', 'Trapped volumes must drain completely', 'Verify detergent compatibility with materials', 'Dry in filtered laminar flow or clean oven', 'Double-bag in certified clean bags after cleaning'],
    standard: 'IEST-STD-CC1246E, MIL-STD-1246C, NASA-STD-5009',
  },
  {
    name: 'UV/Ozone Cleaning',
    method: 'UV Ozone Cleaning',
    description: 'Exposure to short-wavelength UV light (185nm + 254nm) generates ozone which breaks down organic molecular contamination on surfaces through photo-oxidation. Non-contact method.',
    solventsOrAgents: ['UV light at 185nm and 254nm wavelengths', 'Ambient oxygen converted to ozone'],
    temperatureRange: 'Ambient to 60\u00B0C (slight surface heating from UV)',
    duration: '10-60 minutes depending on contamination level',
    effectiveness: 'Removes sub-monolayer molecular contamination. Achieves NVR Level A. Excellent for organic film removal.',
    applicableSurfaces: ['Optics', 'Glass', 'Silicon wafers', 'Metal mirrors', 'Ceramic substrates'],
    precautions: ['UV degrades some polymers - remove or mask polymeric materials', 'Ozone is toxic - enclosed chamber with exhaust required', 'Not effective for particulate removal', 'Surface must have line-of-sight to UV source', 'Verify coating compatibility with UV exposure'],
    standard: 'NASA-HDBK-6007, facility-specific procedures',
  },
  {
    name: 'CO2 Snow Cleaning',
    method: 'CO2 Snow Cleaning',
    description: 'High-purity liquid CO2 expands through a nozzle creating dry ice particles that impact the surface, mechanically dislodging particulate and dissolving organic contamination. Residue-free sublimation.',
    solventsOrAgents: ['High-purity liquid CO2 (99.999%)', 'Dry ice microparticles formed at nozzle'],
    temperatureRange: '-78\u00B0C at impact, ambient recovery',
    duration: '2-10 minutes per component',
    effectiveness: 'Removes particles down to 0.1 micron and light molecular contamination. Achieves Level 100-200 particulate.',
    applicableSurfaces: ['Optics', 'Mirrors', 'Detectors', 'Sensitive electronics', 'Mechanical assemblies', 'Virtually any surface'],
    precautions: ['Thermal shock risk on sensitive optics - control flow rate', 'Static charge generation - ground workpiece', 'Ensure CO2 supply purity', 'Perform in laminar flow environment to prevent re-contamination', 'Operator training required for optimal technique'],
    standard: 'NASA-HDBK-6007, IEST-STD-CC1246E',
  },
  {
    name: 'Thermal Vacuum Bake-out',
    method: 'Bake-out Procedures',
    description: 'Hardware is placed in a vacuum chamber and heated to elevated temperature to accelerate outgassing of volatile contaminants. Mass loss is monitored via QCM until acceptable rates are achieved.',
    solventsOrAgents: ['Vacuum (<1x10\u207B\u2075 Torr)', 'Heat', 'QCM monitoring'],
    temperatureRange: '50-125\u00B0C (material dependent; typically 10-25\u00B0C above max mission temperature)',
    duration: '24-72 hours typical; until QCM rate drops below threshold (e.g., <4x10\u207B\u2071\u2074 g/cm\u00B2/s)',
    effectiveness: 'Removes >95% of volatile molecular contamination. Essential for materials near sensitive optics or detectors.',
    applicableSurfaces: ['Complete sub-assemblies', 'Harnesses', 'Electronics boxes', 'Structural panels', 'MLI blankets', 'Any component with outgassing concern'],
    precautions: ['Temperature must not exceed material qualification limits', 'Some materials (silicones) require extended bake-out', 'Protect baked hardware from re-contamination (double-bag in clean bags)', 'QCM placement critical for accurate monitoring', 'Chamber cleanliness must be verified before use'],
    standard: 'ASTM E595, NASA-STD-5009, GSFC-STD-7000A',
  },
];

// ────────────────────────────────────────
// HVAC Requirements by ISO Class
// ────────────────────────────────────────

const HVAC_REQUIREMENTS: HVACRequirement[] = [
  {
    isoClass: 5,
    airChangesPerHour: '240-480 ACH',
    filterType: 'HEPA (H14) or ULPA (U15)',
    filterEfficiency: '99.995% at 0.12\u03BCm (ULPA) or 99.97% at 0.3\u03BCm (HEPA)',
    airVelocity: '0.3-0.5 m/s unidirectional (laminar)',
    pressureDifferential: '+12.5 Pa min vs adjacent lower-class area',
    tempRange: '20 \u00B1 0.5\u00B0C (tight control)',
    humidityRange: '45 \u00B1 5% RH',
    monitoringFrequency: 'Continuous particle monitoring, daily certification',
  },
  {
    isoClass: 6,
    airChangesPerHour: '90-180 ACH',
    filterType: 'HEPA (H14)',
    filterEfficiency: '99.97% at 0.3\u03BCm',
    airVelocity: '0.2-0.4 m/s, may use non-unidirectional with HEPA ceiling coverage >60%',
    pressureDifferential: '+12.5 Pa min vs adjacent lower-class area',
    tempRange: '20 \u00B1 1\u00B0C',
    humidityRange: '45 \u00B1 10% RH',
    monitoringFrequency: 'Continuous particle monitoring, weekly certification',
  },
  {
    isoClass: 7,
    airChangesPerHour: '30-90 ACH',
    filterType: 'HEPA (H13-H14)',
    filterEfficiency: '99.95-99.97% at 0.3\u03BCm',
    airVelocity: '0.15-0.3 m/s, non-unidirectional acceptable',
    pressureDifferential: '+10 Pa min vs adjacent lower-class area',
    tempRange: '20 \u00B1 2\u00B0C',
    humidityRange: '30-60% RH',
    monitoringFrequency: 'Daily particle sampling, monthly certification',
  },
  {
    isoClass: 8,
    airChangesPerHour: '10-25 ACH',
    filterType: 'HEPA (H13)',
    filterEfficiency: '99.95% at 0.3\u03BCm',
    airVelocity: 'Non-unidirectional, mixed flow',
    pressureDifferential: '+5 Pa min vs corridor/uncontrolled area',
    tempRange: '20 \u00B1 3\u00B0C',
    humidityRange: '30-60% RH',
    monitoringFrequency: 'Weekly particle sampling, quarterly certification',
  },
  {
    isoClass: 9,
    airChangesPerHour: '5-10 ACH',
    filterType: 'HEPA (H13) or high-efficiency MERV 16+',
    filterEfficiency: '99.95% at 0.3\u03BCm (HEPA) or 95% at 0.3\u03BCm (MERV 16)',
    airVelocity: 'Mixed flow, standard HVAC distribution',
    pressureDifferential: '+2.5 Pa min vs uncontrolled area',
    tempRange: '20 \u00B1 5\u00B0C',
    humidityRange: '20-70% RH',
    monitoringFrequency: 'Monthly particle sampling, semi-annual certification',
  },
];

// ────────────────────────────────────────
// Navigation sections
// ────────────────────────────────────────

const SECTIONS: { id: ActiveSection; label: string; icon: string }[] = [
  { id: 'iso-classes', label: 'ISO Classifications', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'contamination', label: 'Contamination Types', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z' },
  { id: 'requirements', label: 'Mission Requirements', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
  { id: 'outgassing', label: 'Outgassing Database', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { id: 'cleaning', label: 'Cleaning Procedures', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5' },
  { id: 'hvac', label: 'HVAC Requirements', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
];

// ────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────

function formatParticleCount(value: number | null): string {
  if (value === null) return '\u2014';
  return value.toLocaleString();
}

function getStringencyColor(stringency: string): string {
  switch (stringency) {
    case 'Stringent': return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'Moderate': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'Standard': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    case 'Relaxed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
}

function getOutgassingColor(level: string): string {
  switch (level) {
    case 'Very Low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'Low': return 'text-white/70 bg-white/5 border-white/10';
    case 'Moderate': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'High': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'Restricted': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
}

function getPassFailBadge(passes: boolean): string {
  return passes
    ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30'
    : 'text-red-400 bg-red-400/10 border border-red-400/30';
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function CleanRoomReferencePage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('iso-classes');
  const [isoSearch, setIsoSearch] = useState('');
  const [contaminationFilter, setContaminationFilter] = useState<'All' | 'Particulate' | 'Molecular' | 'Biological'>('All');
  const [outgassingSearch, setOutgassingSearch] = useState('');
  const [outgassingFilter, setOutgassingFilter] = useState<string>('All');
  const [expandedISO, setExpandedISO] = useState<number | null>(null);
  const [expandedContamination, setExpandedContamination] = useState<number | null>(null);
  const [expandedRequirement, setExpandedRequirement] = useState<number | null>(null);
  const [expandedCleaning, setExpandedCleaning] = useState<number | null>(null);
  const [expandedOutgassing, setExpandedOutgassing] = useState<number | null>(null);

  // Filtered data
  const filteredISO = useMemo(() => {
    if (!isoSearch) return ISO_CLASSES;
    const q = isoSearch.toLowerCase();
    return ISO_CLASSES.filter(c =>
      c.isoClass.toString().includes(q) ||
      c.fedStdName.toLowerCase().includes(q) ||
      c.spaceApplications.some(a => a.toLowerCase().includes(q))
    );
  }, [isoSearch]);

  const filteredContamination = useMemo(() => {
    if (contaminationFilter === 'All') return CONTAMINATION_TYPES;
    return CONTAMINATION_TYPES.filter(c => c.category === contaminationFilter);
  }, [contaminationFilter]);

  const outgassingCategories = useMemo(() => {
    const cats = new Set(OUTGASSING_MATERIALS.map(m => m.category));
    return ['All', ...Array.from(cats).sort()];
  }, []);

  const filteredOutgassing = useMemo(() => {
    let results = OUTGASSING_MATERIALS;
    if (outgassingFilter !== 'All') {
      results = results.filter(m => m.category === outgassingFilter);
    }
    if (outgassingSearch) {
      const q = outgassingSearch.toLowerCase();
      results = results.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.commonUses.some(u => u.toLowerCase().includes(q))
      );
    }
    return results;
  }, [outgassingFilter, outgassingSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <AnimatedPageHeader
          title="Clean Room & Contamination Control"
          subtitle="Comprehensive reference for spacecraft manufacturing clean room requirements, ISO classifications, outgassing data, and contamination control procedures"
          accentColor="cyan"
          icon={
            <svg className="w-8 h-8 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          }
        />

        {/* Key Standards Bar */}
        <ScrollReveal>
        <div className="card p-4 mb-8">
          <div className="flex flex-wrap gap-4 justify-center text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span className="text-white/70">ISO 14644-1:2015</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-white/70">ASTM E595</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-white/70">MIL-STD-1246C</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-white/70">COSPAR Planetary Protection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-white/70">NASA-STD-5009</span>
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* Section Navigation */}
        <ScrollReveal delay={0.1}>
        <div className="flex flex-wrap gap-2 mb-8">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeSection === section.id
                  ? 'bg-white/10 text-white/90 border border-white/10 shadow-lg shadow-black/5'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} />
              </svg>
              {section.label}
            </button>
          ))}
        </div>
        </ScrollReveal>

        {/* ──────────────────────────── ISO Classification Section ──────────────────────────── */}
        <ScrollReveal delay={0.2}>
        {activeSection === 'iso-classes' && (
          <div>
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2">ISO 14644-1 Clean Room Classification</h2>
              <p className="text-slate-400 text-sm mb-4">
                Maximum allowable particle concentrations (particles per cubic meter) at specified particle sizes for each ISO class.
                Click any row to see space industry applications.
              </p>
              <input
                type="search"
                placeholder="Search by ISO class, Federal Standard name, or application..."
                value={isoSearch}
                onChange={e => setIsoSearch(e.target.value)}
                className="w-full sm:w-96 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-slate-500 focus:outline-none focus:border-white/15"
              />
            </div>

            <div className="card overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">ISO Class</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Fed Std 209E</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">{'\u22650.1\u03BCm'}</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">{'\u22650.2\u03BCm'}</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">{'\u22650.3\u03BCm'}</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">{'\u22650.5\u03BCm'}</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">{'\u22651.0\u03BCm'}</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">{'\u22655.0\u03BCm'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredISO.map((iso, idx) => (
                      <>
                        <tr
                          key={iso.isoClass}
                          onClick={() => setExpandedISO(expandedISO === idx ? null : idx)}
                          className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                            expandedISO === idx ? 'bg-white/[0.05]' : 'hover:bg-white/[0.04]'
                          } ${iso.isoClass === 5 || iso.isoClass === 7 || iso.isoClass === 8 ? 'ring-1 ring-inset ring-white/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: iso.color }}></span>
                              <span className="font-bold text-slate-100">ISO {iso.isoClass}</span>
                              {(iso.isoClass === 5 || iso.isoClass === 7 || iso.isoClass === 8) && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-white/70 border border-white/10">
                                  Common
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/70 text-xs">{iso.fedStdName}</td>
                          <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">{formatParticleCount(iso.particles_0_1)}</td>
                          <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">{formatParticleCount(iso.particles_0_2)}</td>
                          <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">{formatParticleCount(iso.particles_0_3)}</td>
                          <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">{formatParticleCount(iso.particles_0_5)}</td>
                          <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">{formatParticleCount(iso.particles_1_0)}</td>
                          <td className="px-4 py-3 text-right text-white/70 font-mono text-xs">{formatParticleCount(iso.particles_5_0)}</td>
                        </tr>
                        {expandedISO === idx && (
                          <tr key={`${iso.isoClass}-detail`} className="bg-white/[0.04]">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="text-sm">
                                <h4 className="text-white/70 font-semibold mb-2">Space Industry Applications</h4>
                                <ul className="space-y-1">
                                  {iso.spaceApplications.map((app, appIdx) => (
                                    <li key={appIdx} className="flex items-start gap-2 text-white/70">
                                      <span className="text-white/70 mt-1">&#8226;</span>
                                      {app}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick reference highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-[#fbbf24]"></span>
                  <h3 className="font-bold text-slate-100">ISO 5 (Class 100)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-2">Max 3,520 particles per m\u00B3 at 0.5\u03BCm</p>
                <p className="text-sm text-white/70">Optics, detectors, focal plane assembly, solar cell fabrication</p>
              </div>
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-[#f97316]"></span>
                  <h3 className="font-bold text-slate-100">ISO 7 (Class 10,000)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-2">Max 352,000 particles per m\u00B3 at 0.5\u03BCm</p>
                <p className="text-sm text-white/70">General spacecraft assembly, bus integration, harness work</p>
              </div>
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                  <h3 className="font-bold text-slate-100">ISO 8 (Class 100,000)</h3>
                </div>
                <p className="text-sm text-slate-400 mb-2">Max 3,520,000 particles per m\u00B3 at 0.5\u03BCm</p>
                <p className="text-sm text-white/70">Large structure assembly, solar arrays, antenna reflectors, CubeSats</p>
              </div>

        <RelatedModules modules={PAGE_RELATIONS['clean-room-reference']} />
            </div>
          </div>
        )}

        {/* ──────────────────────────── Contamination Types Section ──────────────────────────── */}
        {activeSection === 'contamination' && (
          <div>
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Contamination Types</h2>
              <p className="text-slate-400 text-sm mb-4">
                Spacecraft contamination control addresses three primary categories: particulate, molecular, and biological.
                Each has distinct measurement standards and mitigation approaches.
              </p>
              <div className="flex flex-wrap gap-2">
                {(['All', 'Particulate', 'Molecular', 'Biological'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setContaminationFilter(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      contaminationFilter === cat
                        ? 'bg-white/10 text-white/90 border border-white/10'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08]'
                    }`}
                  >
                    {cat}
                    <span className="ml-2 text-xs opacity-60">
                      ({cat === 'All' ? CONTAMINATION_TYPES.length : CONTAMINATION_TYPES.filter(c => c.category === cat).length})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredContamination.map((contam, idx) => {
                const globalIdx = CONTAMINATION_TYPES.indexOf(contam);
                return (
                  <div key={globalIdx} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedContamination(expandedContamination === globalIdx ? null : globalIdx)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          contam.category === 'Particulate' ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' :
                          contam.category === 'Molecular' ? 'text-purple-400 bg-purple-400/10 border-purple-400/30' :
                          'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                        }`}>
                          {contam.category}
                        </span>
                        <h3 className="font-bold text-slate-100">{contam.name}</h3>
                      </div>
                      <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedContamination === globalIdx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedContamination === globalIdx && (
                      <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
                        <p className="text-sm text-white/70">{contam.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Measurement Standard</h4>
                            <p className="text-sm text-white/70">{contam.measurementStandard}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Measurement Method</h4>
                            <p className="text-sm text-white/70">{contam.measurementMethod}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Critical Concern</h4>
                          <p className="text-sm text-amber-400">{contam.criticalConcern}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mitigation Strategies</h4>
                          <ul className="space-y-1">
                            {contam.mitigationStrategies.map((strat, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="text-emerald-400 mt-0.5">&#10003;</span>
                                {strat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────────────────────────── Mission Requirements Section ──────────────────────────── */}
        {activeSection === 'requirements' && (
          <div>
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Spacecraft Cleanliness Requirements by Mission Type</h2>
              <p className="text-slate-400 text-sm">
                Cleanliness requirements vary dramatically based on mission type, payload sensitivity, and planetary protection category.
                Click any mission type for detailed requirements and examples.
              </p>
            </div>

            <div className="space-y-4">
              {MISSION_REQUIREMENTS.map((req, idx) => (
                <div key={idx} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedRequirement(expandedRequirement === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-slate-100">{req.missionType}</h3>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStringencyColor(req.stringency)}`}>
                        {req.stringency}
                      </span>
                      <span className="text-xs text-slate-500">{req.isoClass}</span>
                    </div>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${expandedRequirement === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedRequirement === idx && (
                    <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white/[0.04] rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ISO Class</h4>
                          <p className="text-sm text-white/70 font-bold">{req.isoClass}</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Particle Level</h4>
                          <p className="text-sm text-white/90">{req.particleLevel}</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Molecular</h4>
                          <p className="text-sm text-white/90">{req.molecularReq}</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Biological</h4>
                          <p className="text-sm text-white/90">{req.biologicalReq}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Example Missions</h4>
                        <div className="flex flex-wrap gap-2">
                          {req.examples.map((ex, exIdx) => (
                            <span key={exIdx} className="px-3 py-1 rounded-full bg-white/[0.06] text-white/70 text-xs border border-white/[0.06]">
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</h4>
                        <p className="text-sm text-white/70">{req.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────────────────────────── Outgassing Database Section ──────────────────────────── */}
        {activeSection === 'outgassing' && (
          <div>
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Materials Outgassing Database</h2>
              <p className="text-slate-400 text-sm mb-1">
                Outgassing data per NASA ASTM E595 testing (125{'\u00B0'}C, 24 hours, vacuum). Materials must meet:
              </p>
              <div className="flex flex-wrap gap-3 my-3">
                <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-sm font-mono border border-white/10">
                  TML {'<'} 1.0%
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-sm font-mono border border-white/10">
                  CVCM {'<'} 0.1%
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-4">
                TML = Total Mass Loss | CVCM = Collected Volatile Condensable Material | WVR = Water Vapor Regained
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="search"
                  placeholder="Search materials..."
                  value={outgassingSearch}
                  onChange={e => setOutgassingSearch(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/90 placeholder-slate-500 focus:outline-none focus:border-white/15"
                />
                <select
                  value={outgassingFilter}
                  onChange={e => setOutgassingFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/90 focus:outline-none focus:border-white/15"
                >
                  {outgassingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredOutgassing.map((mat, idx) => {
                const globalIdx = OUTGASSING_MATERIALS.indexOf(mat);
                return (
                  <div key={globalIdx} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedOutgassing(expandedOutgassing === globalIdx ? null : globalIdx)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                        <h3 className="font-bold text-slate-100 truncate">{mat.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getOutgassingColor(mat.outgassingLevel)}`}>
                          {mat.outgassingLevel}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPassFailBadge(mat.passesE595)}`}>
                          {mat.passesE595 ? 'PASSES E595' : 'FAILS E595'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        <div className="hidden sm:flex items-center gap-4 text-xs">
                          <div className="text-right">
                            <span className="text-slate-500">TML</span>
                            <span className={`ml-1 font-mono font-bold ${mat.tml >= 1.0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {mat.tml.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500">CVCM</span>
                            <span className={`ml-1 font-mono font-bold ${mat.cvcm >= 0.1 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {mat.cvcm.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedOutgassing === globalIdx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {expandedOutgassing === globalIdx && (
                      <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">TML</h4>
                            <p className={`text-lg font-mono font-bold ${mat.tml >= 1.0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {mat.tml.toFixed(2)}%
                            </p>
                            <p className="text-xs text-slate-500">Limit: {'<'}1.0%</p>
                          </div>
                          <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CVCM</h4>
                            <p className={`text-lg font-mono font-bold ${mat.cvcm >= 0.1 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {mat.cvcm.toFixed(2)}%
                            </p>
                            <p className="text-xs text-slate-500">Limit: {'<'}0.1%</p>
                          </div>
                          <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">WVR</h4>
                            <p className="text-lg font-mono font-bold text-white/70">
                              {mat.wvr !== null ? `${mat.wvr.toFixed(2)}%` : '\u2014'}
                            </p>
                            <p className="text-xs text-slate-500">Water Vapor Regained</p>
                          </div>
                          <div className="bg-white/[0.04] rounded-xl p-3 text-center">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</h4>
                            <p className="text-sm font-medium text-white/70">{mat.category}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Common Uses</h4>
                          <div className="flex flex-wrap gap-2">
                            {mat.commonUses.map((use, uIdx) => (
                              <span key={uIdx} className="px-3 py-1 rounded-full bg-white/[0.06] text-white/70 text-xs border border-white/[0.06]">
                                {use}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <p className="text-sm text-white/70">{mat.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredOutgassing.length === 0 && (
                <div className="card p-8 text-center">
                  <p className="text-slate-400">No materials match your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────────────────────────── Cleaning Procedures Section ──────────────────────────── */}
        {activeSection === 'cleaning' && (
          <div>
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Cleaning Procedures Reference</h2>
              <p className="text-slate-400 text-sm">
                Standard contamination removal procedures used in spacecraft manufacturing.
                Procedures are typically applied in sequence from most aggressive to final precision clean.
              </p>
            </div>

            <div className="space-y-4">
              {CLEANING_PROCEDURES.map((proc, idx) => (
                <div key={idx} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedCleaning(expandedCleaning === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-slate-100">{proc.name}</h3>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium text-purple-400 bg-purple-400/10 border border-purple-400/30">
                        {proc.method}
                      </span>
                    </div>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${expandedCleaning === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedCleaning === idx && (
                    <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
                      <p className="text-sm text-white/70">{proc.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white/[0.04] rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Temperature</h4>
                          <p className="text-sm text-white/90">{proc.temperatureRange}</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Duration</h4>
                          <p className="text-sm text-white/90">{proc.duration}</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl p-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reference Standard</h4>
                          <p className="text-sm text-white/70">{proc.standard}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Solvents / Agents</h4>
                        <div className="flex flex-wrap gap-2">
                          {proc.solventsOrAgents.map((agent, aIdx) => (
                            <span key={aIdx} className="px-3 py-1 rounded-full bg-white/5 text-white/70 text-xs border border-white/10">
                              {agent}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Effectiveness</h4>
                        <p className="text-sm text-emerald-400">{proc.effectiveness}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Applicable Surfaces</h4>
                          <ul className="space-y-1">
                            {proc.applicableSurfaces.map((surf, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="text-white/70 mt-0.5">&#10003;</span>
                                {surf}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Precautions</h4>
                          <ul className="space-y-1">
                            {proc.precautions.map((prec, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2 text-sm text-amber-300">
                                <span className="text-amber-400 mt-0.5">&#9888;</span>
                                {prec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────────────────────────── HVAC Requirements Section ──────────────────────────── */}
        {activeSection === 'hvac' && (
          <div>
            <div className="card p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-2">HVAC & Air Handling Requirements</h2>
              <p className="text-slate-400 text-sm">
                Air handling specifications for each ISO clean room class. Proper HVAC design is the foundation of contamination control,
                providing filtered air at the correct velocity, volume, temperature, and humidity.
              </p>
            </div>

            <div className="space-y-4">
              {HVAC_REQUIREMENTS.map((hvac, idx) => (
                <div key={idx} className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 font-bold border border-white/10">
                      ISO {hvac.isoClass}
                    </span>
                    <span className="text-sm text-slate-400">Air Handling Specifications</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Air Changes/Hour</h4>
                      <p className="text-sm text-slate-100 font-bold">{hvac.airChangesPerHour}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Air Velocity</h4>
                      <p className="text-sm text-white/90">{hvac.airVelocity}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pressure Differential</h4>
                      <p className="text-sm text-white/90">{hvac.pressureDifferential}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monitoring</h4>
                      <p className="text-sm text-white/90">{hvac.monitoringFrequency}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Filter Type</h4>
                      <p className="text-sm text-white/70">{hvac.filterType}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Filter Efficiency</h4>
                      <p className="text-sm text-white/90">{hvac.filterEfficiency}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Temperature</h4>
                      <p className="text-sm text-white/90">{hvac.tempRange}</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Humidity</h4>
                      <p className="text-sm text-white/90">{hvac.humidityRange}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer reference */}
        <div className="card p-6 mt-8">
          <h3 className="text-sm font-bold text-white/70 mb-3">Reference Standards</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-400">
            <div>
              <span className="text-white/70 font-medium">ISO 14644-1:2015</span> - Clean room air cleanliness classification
            </div>
            <div>
              <span className="text-white/70 font-medium">ASTM E595</span> - Outgassing testing (TML & CVCM)
            </div>
            <div>
              <span className="text-white/70 font-medium">MIL-STD-1246C</span> - Product cleanliness levels (particulate)
            </div>
            <div>
              <span className="text-white/70 font-medium">IEST-STD-CC1246E</span> - Updated product cleanliness standard
            </div>
            <div>
              <span className="text-white/70 font-medium">NASA-STD-5009</span> - Nondestructive evaluation
            </div>
            <div>
              <span className="text-white/70 font-medium">GSFC-STD-7000A</span> - Goddard contamination control
            </div>
            <div>
              <span className="text-white/70 font-medium">NASA-HDBK-6007</span> - Contamination control handbook
            </div>
            <div>
              <span className="text-white/70 font-medium">COSPAR Planetary Protection</span> - Biological controls
            </div>
            <div>
              <span className="text-white/70 font-medium">NPR 8020.12D</span> - NASA planetary protection provisions
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
