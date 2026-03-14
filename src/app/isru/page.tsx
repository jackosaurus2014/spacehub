'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

type MainTab = 'technologies' | 'locations' | 'companies' | 'economics';

interface ISRUTechnology {
  id: string;
  name: string;
  category: 'extraction' | 'processing' | 'production' | 'manufacturing';
  description: string;
  mechanism: string;
  inputs: string[];
  outputs: string[];
  trl: number; // Technology Readiness Level 1-9
  applicableLocations: string[];
  keyChallenge: string;
  energyRequirement: string;
  statusNote: string;
}

interface ISRULocation {
  id: string;
  name: string;
  body: 'Moon' | 'Mars' | 'Asteroid' | 'Phobos/Deimos';
  resources: ResourceDeposit[];
  accessDifficulty: 'low' | 'moderate' | 'high' | 'extreme';
  deltaV: string;
  description: string;
  keyAdvantage: string;
  activeMissions: string[];
  plannedMissions: string[];
}

interface ResourceDeposit {
  resource: string;
  estimatedQuantity: string;
  confidence: 'confirmed' | 'high' | 'moderate' | 'speculative';
  notes: string;
}

interface ISRUCompany {
  name: string;
  type: 'government' | 'commercial' | 'startup';
  focus: string;
  programs: string[];
  status: 'active' | 'funded' | 'concept' | 'completed';
  description: string;
  website?: string;
  fundingStage?: string;
}

interface EconomicScenario {
  id: string;
  label: string;
  description: string;
  costPerKgFromEarth: number;
  isruTargetCostPerKg: number;
  annualDemandKg: number;
  isruCapexM: number;
  isruOpexPerYearM: number;
  breakEvenYears: number;
  savingsOver10YearsM: number;
  keyAssumptions: string[];
}

// ════════════════════════════════════════════════════════════════
// DATA: ISRU TECHNOLOGIES (12 approaches)
// ════════════════════════════════════════════════════════════════

const ISRU_TECHNOLOGIES: ISRUTechnology[] = [
  {
    id: 'water-ice-extraction',
    name: 'Water Ice Extraction',
    category: 'extraction',
    description:
      'Harvesting water ice from permanently shadowed regions (PSRs) at the lunar poles or Mars subsurface deposits. Water is the most versatile ISRU product -- drinkable, splittable into propellant, and usable as radiation shielding.',
    mechanism:
      'Thermal mining heats regolith to sublimate ice, which is captured and condensed. On Mars, drilling and heating subsurface ice deposits releases water vapor collected in cold traps.',
    inputs: ['Solar or nuclear thermal energy', 'Regolith containing water ice'],
    outputs: ['Liquid water (H2O)', 'Water vapor for further processing'],
    trl: 4,
    applicableLocations: ['Lunar South Pole', 'Mars Subsurface', 'Ceres'],
    keyChallenge:
      'Operating in permanently shadowed craters at 40K (-233C) where no solar power is available and all equipment must survive extreme cold.',
    energyRequirement: '~2.6 kWh/kg of water extracted (thermal mining)',
    statusNote:
      'NASA PRIME-1 drill (Astrobotic/Intuitive Machines) targets 2026 lunar demonstration. VIPER rover cancelled in 2024 but data objectives transferred to commercial missions.',
  },
  {
    id: 'regolith-sintering',
    name: 'Regolith Processing (Sintering & Microwave)',
    category: 'processing',
    description:
      'Heating lunar or Martian regolith to fuse particles into solid construction material without melting. Microwave sintering is especially promising because lunar regolith contains nanophase iron that couples efficiently with microwave radiation.',
    mechanism:
      'Microwave or solar-thermal energy heats regolith to 1,000-1,200C, causing grain boundaries to fuse. The result is a ceramic-like building block. Electrolysis of molite regolith can also extract oxygen as a byproduct.',
    inputs: ['Raw regolith', 'Microwave or focused solar energy'],
    outputs: ['Sintered construction bricks', 'Oxygen (from molten electrolysis variant)'],
    trl: 5,
    applicableLocations: ['Lunar Surface', 'Mars Surface'],
    keyChallenge:
      'Regolith is extremely abrasive (sharp, unweathered grains) and electrostatically charged, causing rapid wear on mechanical components.',
    energyRequirement: '~4-8 kWh/kg of sintered material',
    statusNote:
      'ESA has demonstrated microwave sintering of lunar regolith simulant. NASA SBIR awards have funded multiple sintering approaches for Artemis infrastructure.',
  },
  {
    id: 'moxie',
    name: 'MOXIE (Mars Oxygen ISRU Experiment)',
    category: 'production',
    description:
      'Solid oxide electrolysis that splits CO2 from the Martian atmosphere into oxygen and carbon monoxide. Successfully demonstrated on Mars aboard the Perseverance rover from 2021-2023, producing 122g of O2 across 16 runs.',
    mechanism:
      'Mars atmosphere (95% CO2) is compressed and heated to ~800C in a solid oxide electrolysis cell. Yttria-stabilized zirconia membrane selectively conducts O2 ions, producing pure O2 on the cathode side and CO on the anode.',
    inputs: ['Mars atmospheric CO2', 'Electrical energy (~25W for MOXIE)'],
    outputs: ['Oxygen (O2)', 'Carbon monoxide (CO)'],
    trl: 6,
    applicableLocations: ['Mars Surface'],
    keyChallenge:
      'Scaling from the MOXIE proof-of-concept (6-10 g O2/hr) to a human-mission scale system (~2-3 kg O2/hr) requires 200x scale-up while maintaining thermal management.',
    energyRequirement: '~6-8 kWh/kg O2 produced',
    statusNote:
      'MOXIE completed operations in August 2023 with TRL 6 achieved. NASA is funding next-generation scaled MOXIE concepts for Mars Sample Return and crewed missions.',
  },
  {
    id: 'sabatier',
    name: 'Sabatier Process',
    category: 'production',
    description:
      'Catalytic reaction combining CO2 with hydrogen to produce methane (CH4) and water. Critical for Mars propellant production -- methane/LOX is the propellant choice for SpaceX Starship and could enable Earth-return missions fueled entirely from Mars resources.',
    mechanism:
      'CO2 + 4H2 -> CH4 + 2H2O at 300-400C with a nickel or ruthenium catalyst. The water byproduct can be electrolyzed to recover H2 (closed loop) and produce additional O2.',
    inputs: ['CO2 (from Mars atmosphere)', 'H2 (from water electrolysis or brought from Earth)'],
    outputs: ['Methane (CH4) propellant', 'Water (H2O)'],
    trl: 5,
    applicableLocations: ['Mars Surface'],
    keyChallenge:
      'Requires a hydrogen source. If no local water is available, H2 must be transported from Earth, negating some ISRU benefit. Catalyst deactivation from Mars dust contamination is also a concern.',
    energyRequirement: '~1.5 kWh/kg CH4 (exothermic reaction, energy mostly for H2 production)',
    statusNote:
      'Used operationally on ISS for CO2 removal. Zubrin\'s Mars Direct architecture (1991) first proposed in-situ Sabatier propellant production. Multiple NASA SBIR programs advancing Mars-scale Sabatier reactors.',
  },
  {
    id: 'solar-thermal',
    name: 'Solar Thermal Processing',
    category: 'processing',
    description:
      'Using concentrated solar energy to directly heat regolith for resource extraction. Concentrating mirrors or Fresnel lenses can achieve temperatures above 2,500C in vacuum, sufficient to vaporize and separate regolith components by their different vapor pressures.',
    mechanism:
      'A solar concentrator focuses sunlight onto regolith in a vacuum chamber. Different elements vaporize at different temperatures and are collected on cooled surfaces: water ice sublimes at low T, then metals separate at higher T.',
    inputs: ['Sunlight (concentrated)', 'Raw regolith'],
    outputs: ['Separated metals (Fe, Ti, Al)', 'Oxygen', 'Silicon', 'Volatiles'],
    trl: 4,
    applicableLocations: ['Lunar Surface (illuminated areas)', 'NEO Asteroids'],
    keyChallenge:
      'Requires constant solar illumination -- not viable in permanently shadowed craters or during Mars dust storms. Concentrator optics degrade from dust accumulation.',
    energyRequirement: 'Solar-dependent (~14 kW/m2 at Moon, ~0.6 kW/m2 at Mars)',
    statusNote:
      'Physical Sciences Inc. and TransAstra have demonstrated solar thermal asteroid processing prototypes. Peaks of Eternal Light near lunar south pole provide near-continuous sunlight.',
  },
  {
    id: 'ilmenite-reduction',
    name: 'Ilmenite Reduction',
    category: 'production',
    description:
      'Reducing ilmenite (FeTiO3), which constitutes 5-15% of lunar mare regolith, with hydrogen to extract oxygen. One of the most mature lunar oxygen production methods because it operates at relatively low temperatures.',
    mechanism:
      'FeTiO3 + H2 -> Fe + TiO2 + H2O at 900-1,050C. The water is then electrolyzed to recover H2 (recycled) and produce O2. Net reaction: ilmenite -> metallic iron + rutile + oxygen.',
    inputs: ['Ilmenite-bearing regolith', 'H2 (recycled)', 'Thermal energy'],
    outputs: ['Oxygen (O2)', 'Metallic iron (Fe)', 'Titanium dioxide (TiO2)'],
    trl: 5,
    applicableLocations: ['Lunar Mare Regions'],
    keyChallenge:
      'Ilmenite content varies significantly across the lunar surface (1-15%). Beneficiation (separating ilmenite from bulk regolith) adds complexity. Mare regions with high ilmenite are not near the polar water ice deposits.',
    energyRequirement: '~4.5 kWh/kg O2 produced',
    statusNote:
      'Demonstrated in laboratory at pilot scale by Carbotek/ORBITEC under NASA contracts. Considered one of the baseline approaches for NASA\'s Lunar Surface Innovation Initiative.',
  },
  {
    id: 'carbonyl-process',
    name: 'Carbonyl Process (Mond Process)',
    category: 'extraction',
    description:
      'Extracting high-purity metals (nickel, iron, cobalt) from asteroidal material using carbon monoxide gas at moderate temperatures. The Mond process has been used industrially on Earth since 1890 and is well-suited to microgravity processing.',
    mechanism:
      'CO gas reacts with metals at 50-60C to form volatile metal carbonyls (e.g., Ni(CO)4). Carbonyls are transported as gas, then decomposed at 200-250C to deposit pure metal and regenerate CO.',
    inputs: ['Asteroidal/regolith material', 'Carbon monoxide (CO)', 'Moderate heat'],
    outputs: ['High-purity nickel', 'High-purity iron', 'Cobalt', 'Recycled CO'],
    trl: 3,
    applicableLocations: ['M-type Asteroids', 'Metallic NEOs'],
    keyChallenge:
      'Ni(CO)4 is extremely toxic (30 ppm lethal). Containment in a space environment is critical. Pre-processing to expose fresh metal surfaces in consolidated asteroid material is needed.',
    energyRequirement: '~2.0 kWh/kg metal extracted',
    statusNote:
      'TransAstra and Deep Space Industries (now Bradford Space) have studied carbonyl processing for asteroid mining. TRL remains low due to lack of in-space feedstock testing.',
  },
  {
    id: 'water-electrolysis',
    name: 'Water Electrolysis',
    category: 'production',
    description:
      'Splitting water into hydrogen and oxygen using electrical current. The foundational process connecting water extraction to propellant production. Combined with Sabatier process, enables full propellant production loop on Mars.',
    mechanism:
      '2H2O -> 2H2 + O2 via PEM (Proton Exchange Membrane) or solid oxide electrolysis. PEM operates at 50-80C (mature tech), while solid oxide cells at 700-900C offer higher efficiency. Both produce gaseous H2 and O2 for storage.',
    inputs: ['Water (H2O)', 'Electrical energy'],
    outputs: ['Hydrogen (H2)', 'Oxygen (O2)'],
    trl: 7,
    applicableLocations: ['Lunar Surface', 'Mars Surface', 'Asteroid outposts'],
    keyChallenge:
      'Requires purified water -- dust and mineral contaminants degrade PEM membranes. High-pressure H2 storage or immediate liquefaction is needed. In low gravity, gas-liquid separation is complex.',
    energyRequirement: '~4.5-5.5 kWh/kg H2O (PEM), ~3.5 kWh/kg H2O (solid oxide)',
    statusNote:
      'TRL 9 on Earth, TRL 7 in space (ISS OGS system electrolyzes water for crew O2). Lunar-specific designs under development by multiple NASA SBIR awardees.',
  },
  {
    id: 'bioreactors',
    name: 'Bioreactors (Algae-Based O2 Production)',
    category: 'production',
    description:
      'Using photosynthetic microorganisms (cyanobacteria, chlorella algae) to convert CO2 into oxygen and biomass. Provides simultaneous life support (O2 + food) and CO2 scrubbing. Especially attractive for long-duration Mars habitats.',
    mechanism:
      'Algae in transparent photobioreactors use sunlight or LED light to photosynthesize: 6CO2 + 6H2O -> C6H12O6 + 6O2. Biomass harvested as food supplement. Some strains can also fix nitrogen from Mars atmosphere.',
    inputs: ['CO2', 'Water', 'Light (solar or artificial)', 'Nutrients (from regolith leachate)'],
    outputs: ['Oxygen (O2)', 'Edible biomass', 'Lipids for biofuel'],
    trl: 4,
    applicableLocations: ['Mars Surface', 'Lunar Habitats', 'Deep Space Habitats'],
    keyChallenge:
      'Biological systems are sensitive to radiation, temperature swings, and contamination. Maintaining sterile culture in a dusty extraterrestrial environment is difficult. Growth rates are much slower than electrolysis.',
    energyRequirement: '~0.5 kWh/kg O2 (light energy, much lower electrical demand)',
    statusNote:
      'ESA MELiSSA project has operated closed-loop bioreactor life support pilot plants since 2009. NASA Veggie and APH experiments on ISS demonstrate plant growth; algal bioreactors are at earlier TRL for space.',
  },
  {
    id: '3d-printing-regolith',
    name: '3D Printing from Regolith',
    category: 'manufacturing',
    description:
      'Additive manufacturing using processed lunar or Martian regolith as feedstock to construct habitats, landing pads, roads, and radiation shielding. Eliminates the need to launch massive structural components from Earth.',
    mechanism:
      'Regolith is mixed with a binder (polymer, sulfur, or sintered directly) and extruded/deposited layer by layer. Contour Crafting and ICON\'s Vulcan system can print structures at rates of 0.5-2 m3/hr. NASA\'s ACME project explores microwave sintering for binder-free printing.',
    inputs: ['Processed regolith', 'Binder material (optional)', 'Solar or nuclear power'],
    outputs: ['Structural components', 'Radiation shielding', 'Landing pads', 'Roads'],
    trl: 5,
    applicableLocations: ['Lunar Surface', 'Mars Surface'],
    keyChallenge:
      'Achieving consistent material properties with variable regolith composition. Binder transport from Earth adds mass penalty. Binder-free microwave sintering is slower and requires more energy.',
    energyRequirement: '~10-20 kWh/m3 of printed structure (varies by method)',
    statusNote:
      'ICON received $57.2M NASA contract for lunar construction system. AI SpaceFactory won NASA\'s 3D-Printed Habitat Challenge. ESA\'s Moon Village concept relies heavily on regolith 3D printing.',
  },
  {
    id: 'molten-regolith-electrolysis',
    name: 'Molten Regolith Electrolysis (MRE)',
    category: 'processing',
    description:
      'Electrolyzing molten regolith at high temperatures to extract oxygen from metal oxides without any reagents. Produces oxygen and a mix of metallic alloys from any regolith composition -- no beneficiation required.',
    mechanism:
      'Regolith heated to ~1,600C melts into a conductive slag. Electrodes pass current through the melt; oxygen migrates to the anode and is collected as gas, while reduced metals (Fe, Si, Ti, Al) pool at the cathode.',
    inputs: ['Any lunar regolith', 'High electrical power'],
    outputs: ['Oxygen (O2)', 'Iron-silicon alloy', 'Aluminum', 'Titanium', 'Calcium'],
    trl: 4,
    applicableLocations: ['Lunar Surface'],
    keyChallenge:
      'Extremely high operating temperature (1,600C) demands robust refractory materials for the electrolysis cell. Anode corrosion from nascent oxygen at high temperature is a major materials science challenge.',
    energyRequirement: '~10-13 kWh/kg O2 produced',
    statusNote:
      'MIT and Metalysis (UK) have demonstrated MRE in laboratory settings. ESA funded the ROXY project for lunar MRE. Potentially the most versatile lunar ISRU process since it works on any regolith.',
  },
  {
    id: 'carbothermal-reduction',
    name: 'Carbothermal Reduction',
    category: 'processing',
    description:
      'Using methane or carbon as a reducing agent to extract oxygen from metal oxides in regolith at temperatures above 1,600C. Can process silicate minerals that hydrogen reduction cannot touch, accessing the full 42% oxygen content of lunar regolith.',
    mechanism:
      'CH4 + metal oxide -> metal + CO + 2H2 at >1,625C. CO and H2 are recycled through water-gas shift and methanation reactions to regenerate CH4. Net input: regolith + energy. Net output: oxygen + metals.',
    inputs: ['Regolith', 'Methane (CH4, recycled)', 'Very high thermal energy'],
    outputs: ['Oxygen (O2)', 'Metallic alloys (Fe, Si, Ti)', 'Recycled methane'],
    trl: 4,
    applicableLocations: ['Lunar Surface'],
    keyChallenge:
      'Very high temperatures required (>1,600C). Carbon deposition can foul reactor surfaces. Methane leakage represents loss of a critical reagent that must be carefully managed.',
    energyRequirement: '~8-12 kWh/kg O2 produced',
    statusNote:
      'Demonstrated by Lockheed Martin under NASA Innovative Lunar Demonstrations Data (ILDD) program. Sierra Space is developing a carbothermal reactor for Artemis. Considered the highest oxygen yield process per kg of regolith.',
  },
];

// ════════════════════════════════════════════════════════════════
// DATA: ISRU LOCATIONS & RESOURCES
// ════════════════════════════════════════════════════════════════

const ISRU_LOCATIONS: ISRULocation[] = [
  {
    id: 'lunar-south-pole',
    name: 'Lunar South Pole (Shackleton Crater)',
    body: 'Moon',
    resources: [
      {
        resource: 'Water Ice',
        estimatedQuantity: '~600 million metric tons (upper estimate across all PSRs)',
        confidence: 'high',
        notes:
          'Chandrayaan-1 M3, LCROSS impact, and LRO neutron spectrometer data confirm water ice in permanently shadowed regions. Shackleton Crater alone may contain 300M+ tons.',
      },
      {
        resource: 'Hydrogen',
        estimatedQuantity: 'Concentrated at 0.1-2% by mass in top 1m of regolith in PSRs',
        confidence: 'confirmed',
        notes:
          'Enhanced hydrogen detected by neutron spectrometers. May be in form of water ice, hydroxyl groups, or implanted solar wind protons.',
      },
      {
        resource: 'Other Volatiles',
        estimatedQuantity: 'Trace amounts (CO2, NH3, H2S, SO2, CH4)',
        confidence: 'moderate',
        notes:
          'LCROSS impact detected multiple volatile species in Cabeus crater ejecta plume. These cold-trapped volatiles have accumulated over billions of years.',
      },
    ],
    accessDifficulty: 'high',
    deltaV: '~2.5 km/s from LEO (via low-energy transfer)',
    description:
      'The primary target for NASA Artemis ISRU operations. The rim of Shackleton Crater has near-continuous sunlight (Peaks of Eternal Light) while the interior holds permanently shadowed regions at 40K with confirmed water ice.',
    keyAdvantage:
      'Co-location of solar power (rim illumination) and water ice (PSR interior) within kilometers. Best-characterized ISRU site.',
    activeMissions: ['LRO (ongoing mapping)', 'Chandrayaan-3 (south polar landing, 2023)'],
    plannedMissions: [
      'Artemis III (crewed south pole landing, 2026)',
      'PRIME-1 drill (Intuitive Machines IM-2)',
      'ispace HAKUTO-R Mission 2',
      'Blue Ghost Mission 2 (Firefly)',
    ],
  },
  {
    id: 'lunar-regolith-general',
    name: 'Lunar Regolith (General Surface)',
    body: 'Moon',
    resources: [
      {
        resource: 'Oxygen (bound in oxides)',
        estimatedQuantity: '42-45% of regolith by mass',
        confidence: 'confirmed',
        notes:
          'All lunar rocks and soils are metal oxides. Oxygen is the most abundant element. Extraction requires high-energy processing (electrolysis, carbothermal, or hydrogen reduction).',
      },
      {
        resource: 'Iron (Fe)',
        estimatedQuantity: '5-14% by mass (higher in mare basalts)',
        confidence: 'confirmed',
        notes:
          'Present as FeO in silicates and ilmenite (FeTiO3). Nanophase metallic iron also exists from micrometeorite impacts and space weathering.',
      },
      {
        resource: 'Titanium (Ti)',
        estimatedQuantity: '1-8% as TiO2 (highest in high-Ti mare basalts)',
        confidence: 'confirmed',
        notes:
          'Concentrated in ilmenite. Apollo 11 and 17 samples showed TiO2 up to 12% in some basalt samples.',
      },
      {
        resource: 'Aluminum (Al)',
        estimatedQuantity: '10-18% as Al2O3 (highest in highland anorthosites)',
        confidence: 'confirmed',
        notes:
          'Lunar highlands are rich in plagioclase feldspar (anorthite CaAl2Si2O8). Aluminum extraction requires molten electrolysis or carbothermal reduction.',
      },
      {
        resource: 'Silicon (Si)',
        estimatedQuantity: '20-22% as SiO2',
        confidence: 'confirmed',
        notes:
          'Ubiquitous in all lunar regolith. Potential feedstock for solar cell production. Extractable as a byproduct of molten regolith electrolysis.',
      },
      {
        resource: 'Helium-3',
        estimatedQuantity: '~1.1 million metric tons (top 3m of regolith, global)',
        confidence: 'moderate',
        notes:
          'Implanted by solar wind over billions of years. Concentrations of 4-20 ppb. Potential fusion fuel, though fusion power plants capable of using He-3 do not yet exist.',
      },
    ],
    accessDifficulty: 'moderate',
    deltaV: '~2.5 km/s from LEO',
    description:
      'The entire lunar surface is covered in 4-15m of regolith -- a ready-made feedstock for ISRU. Mare regions are richer in iron and titanium; highlands are richer in aluminum and calcium.',
    keyAdvantage:
      'Available everywhere on the lunar surface. No specialized landing site required. Decades of ground-truth data from Apollo and Luna sample returns.',
    activeMissions: ['Chang\'e-6 sample return (far side, 2024)'],
    plannedMissions: [
      'Artemis surface missions',
      'ESA European Large Logistics Lander',
      'CLPS commercial deliveries',
    ],
  },
  {
    id: 'mars-atmosphere',
    name: 'Mars Atmosphere',
    body: 'Mars',
    resources: [
      {
        resource: 'Carbon Dioxide (CO2)',
        estimatedQuantity: '95.3% of atmosphere (~2.5 x 10^16 kg total)',
        confidence: 'confirmed',
        notes:
          'The dominant atmospheric constituent. Directly usable as feedstock for MOXIE (O2 production), Sabatier process (CH4 + H2O production), and greenhouse pressurization.',
      },
      {
        resource: 'Nitrogen (N2)',
        estimatedQuantity: '2.7% of atmosphere',
        confidence: 'confirmed',
        notes:
          'Essential for buffer gas in habitats (Earth air is 78% N2). Can support biological systems and fertilizer production.',
      },
      {
        resource: 'Argon (Ar)',
        estimatedQuantity: '1.6% of atmosphere',
        confidence: 'confirmed',
        notes:
          'Inert gas useful as welding shield gas, propellant for ion engines, and pressurization gas. Easily separated by fractional distillation.',
      },
      {
        resource: 'Water Vapor',
        estimatedQuantity: '~0.03% variable (210 ppm column average)',
        confidence: 'confirmed',
        notes:
          'Too dilute for practical extraction. Atmospheric water harvesting studied but considered impractical compared to subsurface ice mining.',
      },
    ],
    accessDifficulty: 'moderate',
    deltaV: '~4.0 km/s from LEO (with aerobraking)',
    description:
      'The Martian atmosphere is a vast, easily accessible reservoir of CO2 that can be converted into oxygen and methane propellant. MOXIE proved this works on Mars in 2021-2023.',
    keyAdvantage:
      'No mining, drilling, or excavation required. Atmosphere is globally accessible. MOXIE has already demonstrated the core process at TRL 6.',
    activeMissions: ['Perseverance rover (MOXIE completed 16 runs)'],
    plannedMissions: [
      'Mars Sample Return (O2 production support)',
      'SpaceX Starship Mars missions (Sabatier propellant production)',
    ],
  },
  {
    id: 'mars-subsurface',
    name: 'Mars Subsurface Ice Deposits',
    body: 'Mars',
    resources: [
      {
        resource: 'Water Ice',
        estimatedQuantity: '~5 million km3 estimated (polar caps + subsurface)',
        confidence: 'high',
        notes:
          'MRO SHARAD radar and Mars Odyssey neutron spectrometer confirm extensive subsurface ice. Some deposits begin just 1-2m below the surface at mid-latitudes.',
      },
      {
        resource: 'Perchlorate Salts',
        estimatedQuantity: '0.5-1% of regolith at some sites',
        confidence: 'confirmed',
        notes:
          'Phoenix lander detected perchlorates. These are both a resource (oxidizer, potential rocket propellant component) and a hazard (toxic to humans, must be removed from water).',
      },
      {
        resource: 'Mineral Resources',
        estimatedQuantity: 'Iron oxides (hematite, magnetite), clays, sulfates',
        confidence: 'confirmed',
        notes:
          'Opportunity and Curiosity found hematite berries, sulfate deposits. Clay minerals suggest past water interaction and may contain extractable metals.',
      },
    ],
    accessDifficulty: 'high',
    deltaV: '~4.0 km/s from LEO (with aerobraking)',
    description:
      'Mars has vast subsurface water ice deposits, particularly at mid-to-high latitudes. Some accessible ice tables begin within 1-2 meters of the surface, making them reachable with drilling technology.',
    keyAdvantage:
      'Enormous water reserves for propellant production, life support, and agriculture. Combined with atmospheric CO2, enables complete Sabatier propellant loop.',
    activeMissions: [
      'MRO (ice mapping with SHARAD radar)',
      'Mars Express (MARSIS subsurface radar)',
    ],
    plannedMissions: [
      'Mars Ice Mapper (NASA/ASI/CSA/JAXA, concept)',
      'SpaceX Starship early cargo missions',
    ],
  },
  {
    id: 'neo-asteroids',
    name: 'Near-Earth Object (NEO) Asteroids',
    body: 'Asteroid',
    resources: [
      {
        resource: 'Water (C-type asteroids)',
        estimatedQuantity: 'Up to 20% water by mass in carbonaceous chondrites',
        confidence: 'high',
        notes:
          'OSIRIS-REx confirmed hydrated minerals on Bennu (B-type). Hayabusa2 found water-bearing minerals on Ryugu. C-type asteroids are the most common NEO type.',
      },
      {
        resource: 'Platinum Group Metals (M-type)',
        estimatedQuantity:
          'A single 500m metallic asteroid may contain >$1 trillion in platinum group metals at terrestrial market prices',
        confidence: 'moderate',
        notes:
          'M-type asteroids are believed to be fragments of differentiated protoplanet cores. 16 Psyche mission (arrived 2029) will characterize the largest known metallic asteroid.',
      },
      {
        resource: 'Iron-Nickel (M-type)',
        estimatedQuantity: '80-95% Fe-Ni in metallic asteroids',
        confidence: 'high',
        notes:
          'Iron meteorites confirm the composition of M-type asteroids. Structural steel without the launch cost.',
      },
      {
        resource: 'Carbon & Organics (C-type)',
        estimatedQuantity: '1-5% carbon by mass',
        confidence: 'confirmed',
        notes:
          'Ryugu samples (Hayabusa2) contained amino acids, carbonates, and organic compounds. Carbon is essential for life support and manufacturing.',
      },
      {
        resource: 'Silicates (S-type)',
        estimatedQuantity: 'Olivine, pyroxene dominant (40-60% SiO2)',
        confidence: 'confirmed',
        notes:
          'S-type are the second most common NEO type. Silicates useful for glass, ceramics, radiation shielding, and oxygen extraction.',
      },
    ],
    accessDifficulty: 'extreme',
    deltaV: '~4-12 km/s depending on specific NEO orbit',
    description:
      'Near-Earth asteroids offer diverse resources with surprisingly low delta-v requirements for some targets. Over 34,000 known NEOs, with ~2,000 having lower delta-v than the Moon for a round trip.',
    keyAdvantage:
      'Some NEOs require less delta-v than a lunar landing. Microgravity simplifies material handling. Resources are already "mined" by nature (no regolith overburden).',
    activeMissions: [
      'OSIRIS-APEX (heading to Apophis, 2029 flyby)',
      'Psyche (en route to 16 Psyche, arriving 2029)',
    ],
    plannedMissions: [
      'AstroForge Odin (first commercial asteroid mining mission)',
      'TransAstra worker bee optical mining demo',
      'JAXA MMX (Phobos sample return)',
    ],
  },
  {
    id: 'phobos-deimos',
    name: 'Phobos & Deimos (Mars Moons)',
    body: 'Phobos/Deimos',
    resources: [
      {
        resource: 'Water / Hydrated Minerals',
        estimatedQuantity: 'Potentially 10-20% water if carbonaceous chondrite composition confirmed',
        confidence: 'speculative',
        notes:
          'Spectral data suggest Phobos may be a captured D-type asteroid rich in organics and water. JAXA MMX will resolve composition. Deimos may be similar.',
      },
      {
        resource: 'Regolith (shielding & construction)',
        estimatedQuantity: 'Thick regolith layers on both moons',
        confidence: 'high',
        notes:
          'Phobos and Deimos have loose, fine regolith suitable for radiation shielding and potentially for sintered construction material.',
      },
    ],
    accessDifficulty: 'moderate',
    deltaV: '~0.5-1.0 km/s from Mars orbit (very low)',
    description:
      'The Martian moons offer extremely low delta-v access from Mars orbit and may contain water and carbonaceous material. Phobos is especially attractive as a staging base for Mars operations.',
    keyAdvantage:
      'Ultra-low delta-v from Mars orbit. No atmosphere means easy landing/departure. If water is confirmed, Phobos becomes a propellant depot for Mars transit.',
    activeMissions: ['Mars Express (Phobos flybys)'],
    plannedMissions: [
      'JAXA MMX - Martian Moons eXploration (launch ~2026, Phobos sample return)',
    ],
  },
];

// ════════════════════════════════════════════════════════════════
// DATA: COMPANIES & PROGRAMS
// ════════════════════════════════════════════════════════════════

const ISRU_COMPANIES: ISRUCompany[] = [
  {
    name: 'NASA ISRU Programs',
    type: 'government',
    focus: 'MOXIE, Lunar ISRU Pilot, Break the Ice Challenge',
    programs: [
      'MOXIE (Mars O2 production, TRL 6 achieved)',
      'Lunar Surface Innovation Initiative (LSII)',
      'Break the Ice Lunar Challenge ($3.5M prize)',
      'ISRU System Capability Leadership Team',
      'Artemis ISRU Pathfinder',
    ],
    status: 'active',
    description:
      'NASA has invested over $200M in ISRU technology development across multiple programs. The agency views ISRU as critical path for sustainable lunar and Mars exploration.',
    website: 'https://www.nasa.gov/isru',
  },
  {
    name: 'ESA ISRU Programs',
    type: 'government',
    focus: 'PROSPECT drill, ROXY regolith oxygen extraction',
    programs: [
      'PROSPECT (Package for Resource Observation and in-Situ Prospecting)',
      'ROXY (Regolith to Oxygen and Metals)',
      'MELiSSA (Micro-Ecological Life Support Alternative)',
      'Moon Village concept',
    ],
    status: 'active',
    description:
      'ESA is developing the PROSPECT drill/mini-lab for Luna-27 (Roscosmos collaboration uncertain) and the ROXY system for extracting oxygen from regolith via molten salt electrolysis.',
    website: 'https://www.esa.int',
  },
  {
    name: 'Intuitive Machines',
    type: 'commercial',
    focus: 'Lunar landing, ISRU prospecting, communications',
    programs: [
      'IM-1 Nova-C (first commercial lunar landing, Feb 2024)',
      'IM-2 with PRIME-1 drill and mass spectrometer',
      'IM-3 data relay satellite',
      'Lunar ISRU demonstration payloads',
    ],
    status: 'active',
    description:
      'First commercial company to land on the Moon (IM-1, Feb 2024). IM-2 mission will carry NASA\'s PRIME-1 drill to search for water ice near the south pole -- the first in-situ lunar ice prospecting mission.',
    website: 'https://www.intuitivemachines.com',
    fundingStage: 'Public (NASDAQ: LUNR)',
  },
  {
    name: 'ispace',
    type: 'commercial',
    focus: 'Lunar resource survey, transportation',
    programs: [
      'HAKUTO-R Mission 1 (landing attempt Apr 2023)',
      'HAKUTO-R Mission 2 (micro-rover, 2025)',
      'HAKUTO-R Mission 3 (planned 2026)',
      'Lunar resource mapping payload integration',
    ],
    status: 'active',
    description:
      'Japanese lunar exploration company building a cislunar transportation network. Their micro-rover missions will conduct resource surveys to identify ISRU-viable sites on the lunar surface.',
    website: 'https://ispace-inc.com',
    fundingStage: 'Public (TSE: 9348)',
  },
  {
    name: 'TransAstra Corporation',
    type: 'startup',
    focus: 'Asteroid mining, optical mining technology',
    programs: [
      'Optical Mining -- concentrated sunlight to extract volatiles from asteroids',
      'Worker Bee spacecraft for asteroid capture',
      'Mini Bee and Queen Bee architecture',
      'NASA NIAC Phase II award recipient',
    ],
    status: 'funded',
    description:
      'Developing "optical mining" -- using concentrated sunlight in inflatable reflectors to heat asteroid surfaces and extract water and volatiles. Founded by former NASA JPL engineer Joel Sercel.',
    website: 'https://www.transastracorp.com',
    fundingStage: 'Series A ($20M+)',
  },
  {
    name: 'AstroForge',
    type: 'startup',
    focus: 'Asteroid mining for platinum group metals',
    programs: [
      'Odin (asteroid flyby/observation mission, launched 2023)',
      'Vestri (refinery demonstration in LEO)',
      'Commercial asteroid mining operations (planned 2026+)',
    ],
    status: 'active',
    description:
      'Y Combinator-backed startup aiming to be the first company to mine an asteroid commercially. Launched their Odin observation mission in 2023 to characterize a target asteroid.',
    website: 'https://www.astroforge.com',
    fundingStage: 'Series A ($13M)',
  },
  {
    name: 'Shackleton Energy Company',
    type: 'startup',
    focus: 'Lunar water ice mining for propellant',
    programs: [
      'Lunar ice mining and processing facility concept',
      'LEO propellant depot architecture',
      'Cislunar transportation infrastructure',
    ],
    status: 'concept',
    description:
      'Pioneering concept for mining water ice at the lunar south pole and selling propellant in cislunar space. Named after Shackleton Crater. One of the earliest commercial lunar ISRU ventures.',
    fundingStage: 'Early stage',
  },
  {
    name: 'OffWorld Inc.',
    type: 'startup',
    focus: 'Autonomous robotic mining for space and Earth',
    programs: [
      'Autonomous mining robot swarms',
      'AI-driven excavation and processing',
      'Dual-use terrestrial and space mining systems',
    ],
    status: 'funded',
    description:
      'Building autonomous robotic mining systems designed for both terrestrial and space applications. Their robot swarms can operate in GPS-denied, communication-delayed environments -- ideal for lunar/Mars ISRU.',
    website: 'https://www.offworld.ai',
    fundingStage: 'Series A',
  },
  {
    name: 'Honeybee Robotics (Blue Origin)',
    type: 'commercial',
    focus: 'Drilling, excavation, and sample acquisition systems',
    programs: [
      'PRIME-1 drill (NASA, launching on IM-2)',
      'TRIDENT drill for lunar ice sampling',
      'PlanetVac pneumatic surface sampler',
      'Mars sample handling systems',
    ],
    status: 'active',
    description:
      'Premier space drilling and excavation company, acquired by Blue Origin in 2022. Their PRIME-1 drill will be the first to attempt extracting water ice from the lunar subsurface.',
    website: 'https://www.honeybeerobotics.com',
    fundingStage: 'Blue Origin subsidiary',
  },
  {
    name: 'Astrobotic Technology',
    type: 'commercial',
    focus: 'Lunar delivery, ISRU payload hosting',
    programs: [
      'Peregrine Mission 1 (launched Jan 2024)',
      'Griffin lander (VIPER/PRIME payload carrier)',
      'CubeRover for surface mobility',
      'LunaGrid power service',
    ],
    status: 'active',
    description:
      'Pittsburgh-based lunar delivery company under NASA CLPS. Their Griffin lander is designed to carry heavy ISRU payloads to the lunar south pole, including drilling and processing experiments.',
    website: 'https://www.astrobotic.com',
    fundingStage: 'Pre-IPO (>$350M NASA contracts)',
  },
  {
    name: 'ICON Technology',
    type: 'commercial',
    focus: '3D-printed construction on Moon and Mars',
    programs: [
      'Project Olympus -- lunar surface construction system',
      '$57.2M NASA contract for lunar 3D printing',
      'Vulcan construction system (terrestrial, proven)',
      'Mars habitat construction concepts',
    ],
    status: 'active',
    description:
      'Leading construction technology company developing 3D printing systems for building structures from lunar regolith. Their Vulcan system has already printed homes on Earth; Project Olympus adapts this for the Moon.',
    website: 'https://www.iconbuild.com',
    fundingStage: 'Series B ($185M total raised)',
  },
  {
    name: 'Space Resources (Luxembourg)',
    type: 'startup',
    focus: 'Lunar resource prospecting and extraction',
    programs: [
      'Lunar resource prospecting missions',
      'Supported by Luxembourg Space Resources initiative',
      'European lunar mining technology development',
    ],
    status: 'funded',
    description:
      'Luxembourg-based company developing technologies for lunar resource extraction. Supported by Luxembourg\'s national space resources initiative, which established the first European legal framework for space resource utilization.',
    fundingStage: 'Government-backed',
  },
];

// ════════════════════════════════════════════════════════════════
// DATA: ECONOMICS
// ════════════════════════════════════════════════════════════════

const ECONOMIC_SCENARIOS: EconomicScenario[] = [
  {
    id: 'lunar-water',
    label: 'Lunar Water for Propellant',
    description: 'Mining water ice at the lunar south pole, electrolyzing into LH2/LOX propellant, and selling at a cislunar depot.',
    costPerKgFromEarth: 1000000,
    isruTargetCostPerKg: 500,
    annualDemandKg: 100000,
    isruCapexM: 2500,
    isruOpexPerYearM: 200,
    breakEvenYears: 3,
    savingsOver10YearsM: 95300,
    keyAssumptions: [
      'Earth-to-lunar-surface delivery: ~$1M/kg (current commercial rate)',
      'ISRU target cost: $500/kg including amortized equipment',
      'Annual demand: 100 metric tons (4 crewed missions + robotic ops)',
      'Equipment life: 10 years with periodic maintenance',
      'Ice concentration: ~5% by mass in top 1m of regolith',
    ],
  },
  {
    id: 'mars-propellant',
    label: 'Mars Propellant Production',
    description: 'Full Sabatier + electrolysis loop producing CH4/LOX propellant for Mars ascent vehicle from atmospheric CO2 and subsurface water.',
    costPerKgFromEarth: 2000000,
    isruTargetCostPerKg: 1000,
    annualDemandKg: 30000,
    isruCapexM: 1500,
    isruOpexPerYearM: 100,
    breakEvenYears: 1,
    savingsOver10YearsM: 57500,
    keyAssumptions: [
      'Transporting propellant Earth-to-Mars surface: ~$2M/kg',
      'Mars ascent vehicle requires ~30 metric tons of propellant',
      'ISRU plant operates for 26 months before crew arrival',
      'Nuclear power source provides 40kW continuous',
      'Sabatier conversion efficiency: 95%+',
    ],
  },
  {
    id: 'lunar-oxygen',
    label: 'Lunar Oxygen for Life Support',
    description: 'Extracting oxygen from regolith via ilmenite reduction or molten electrolysis for habitat life support and EVA consumables.',
    costPerKgFromEarth: 1000000,
    isruTargetCostPerKg: 200,
    annualDemandKg: 10000,
    isruCapexM: 500,
    isruOpexPerYearM: 50,
    breakEvenYears: 1,
    savingsOver10YearsM: 9450,
    keyAssumptions: [
      'Crew of 4 consumes ~3kg O2/person/day',
      'Annual demand includes EVA O2 and safety reserves',
      'Regolith feedstock available at any landing site',
      'Solar power at ~14 kW/m2 (near-continuous at poles)',
      'Equipment mass: ~2,000 kg (delivered by CLPS lander)',
    ],
  },
  {
    id: 'asteroid-metals',
    label: 'Asteroid Platinum Group Metals',
    description: 'Mining platinum group metals from M-type NEOs for return to Earth market. The most commercially ambitious ISRU scenario.',
    costPerKgFromEarth: 0,
    isruTargetCostPerKg: 50000,
    annualDemandKg: 1000,
    isruCapexM: 3000,
    isruOpexPerYearM: 300,
    breakEvenYears: 7,
    savingsOver10YearsM: 0,
    keyAssumptions: [
      'Platinum market price: ~$30,000/kg (2026)',
      'Single 30m M-type asteroid may contain $10B+ in PGMs',
      'Return capsule delivers 1 ton/year to Earth',
      'Selective extraction via carbonyl process',
      'Market disruption risk: flooding supply may crash prices',
      'Revenue model, not savings model -- projected $50M/ton revenue',
    ],
  },
  {
    id: 'construction-materials',
    label: 'Lunar Construction Materials',
    description: '3D printing habitats and infrastructure from sintered regolith, avoiding the need to launch structural mass from Earth.',
    costPerKgFromEarth: 1000000,
    isruTargetCostPerKg: 50,
    annualDemandKg: 500000,
    isruCapexM: 800,
    isruOpexPerYearM: 100,
    breakEvenYears: 1,
    savingsOver10YearsM: 498200,
    keyAssumptions: [
      'Habitat and landing pad construction requires ~500 metric tons of material',
      'Sintered regolith cost dominated by energy input (~$50/kg amortized)',
      'ICON Project Olympus system capable of 0.5-2 m3/hr',
      'Regolith available at zero raw material cost',
      'Largest potential savings due to enormous mass requirements',
    ],
  },
];

// ════════════════════════════════════════════════════════════════
// HELPER CONSTANTS
// ════════════════════════════════════════════════════════════════

const MAIN_TABS: { id: MainTab; label: string; description: string }[] = [
  { id: 'technologies', label: 'Technologies', description: '12 ISRU approaches & methods' },
  { id: 'locations', label: 'Locations & Resources', description: 'Where space resources are found' },
  { id: 'companies', label: 'Companies & Programs', description: 'Who is building ISRU systems' },
  { id: 'economics', label: 'Economics', description: 'Cost models & break-even analysis' },
];

const CATEGORY_LABELS: Record<ISRUTechnology['category'], { label: string; color: string }> = {
  extraction: { label: 'Extraction', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  processing: { label: 'Processing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  production: { label: 'Production', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  manufacturing: { label: 'Manufacturing', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

const BODY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Moon: { bg: 'bg-slate-500/20', text: 'text-white/70', border: 'border-slate-500/40' },
  Mars: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  Asteroid: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  'Phobos/Deimos': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  confirmed: 'text-emerald-400',
  high: 'text-white/70',
  moderate: 'text-yellow-400',
  speculative: 'text-orange-400',
};

const COMPANY_TYPE_COLORS: Record<string, string> = {
  government: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  commercial: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  startup: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  funded: 'bg-white/10 text-white/70',
  concept: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-slate-500/20 text-slate-400',
};

// ════════════════════════════════════════════════════════════════
// TRL GAUGE COMPONENT
// ════════════════════════════════════════════════════════════════

function TRLGauge({ trl }: { trl: number }) {
  const trlLabels: Record<number, string> = {
    1: 'Basic Principles',
    2: 'Concept Formulated',
    3: 'Proof of Concept',
    4: 'Lab Validated',
    5: 'Relevant Environment',
    6: 'Demonstrated',
    7: 'Prototype in Space',
    8: 'Flight Qualified',
    9: 'Flight Proven',
  };

  const trlColor = trl <= 3 ? 'bg-red-500' : trl <= 5 ? 'bg-yellow-500' : trl <= 7 ? 'bg-white' : 'bg-emerald-500';

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">Technology Readiness Level</span>
        <span className="text-white font-mono font-bold">TRL {trl}</span>
      </div>
      <div className="flex gap-0.5 mb-1">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm ${i < trl ? trlColor : 'bg-slate-700'}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">{trlLabels[trl]}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB: TECHNOLOGIES
// ════════════════════════════════════════════════════════════════

function TechnologiesTab() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  const categories = ['all', 'extraction', 'processing', 'production', 'manufacturing'] as const;

  const filtered = categoryFilter === 'all'
    ? ISRU_TECHNOLOGIES
    : ISRU_TECHNOLOGIES.filter((t) => t.category === categoryFilter);

  return (
    <div>
      {/* Summary Stats */}
      <ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-white">{ISRU_TECHNOLOGIES.length}</div>
            <div className="text-xs text-slate-400 mt-1">Technologies Tracked</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {ISRU_TECHNOLOGIES.filter((t) => t.trl >= 6).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">TRL 6+ (Demonstrated)</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-white/70">
              {ISRU_TECHNOLOGIES.filter((t) => t.trl >= 4 && t.trl < 6).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">TRL 4-5 (Lab Validated)</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {ISRU_TECHNOLOGIES.filter((t) => t.trl < 4).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">TRL 1-3 (Early Stage)</div>
          </div>
        </div>
      </ScrollReveal>

      {/* Category Filters */}
      <ScrollReveal delay={0.1}>
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.04]'
              }`}
            >
              {cat === 'all' ? 'All Technologies' : CATEGORY_LABELS[cat as ISRUTechnology['category']].label}
              <span className="ml-1.5 text-xs opacity-60">
                ({cat === 'all' ? ISRU_TECHNOLOGIES.length : ISRU_TECHNOLOGIES.filter((t) => t.category === cat).length})
              </span>
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Technology Cards */}
      <StaggerContainer className="space-y-4" staggerDelay={0.08}>
        {filtered.map((tech) => {
          const catInfo = CATEGORY_LABELS[tech.category];
          const isExpanded = expandedTech === tech.id;

          return (
            <StaggerItem key={tech.id}>
              <div
                className={`bg-white/[0.04] border rounded-xl overflow-hidden transition-all ${
                  isExpanded ? 'border-white/15' : 'border-white/[0.06] hover:border-white/[0.08]'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedTech(isExpanded ? null : tech.id)}
                  className="w-full text-left p-5 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">TRL {tech.trl}/9</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{tech.name}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{tech.description}</p>
                  </div>
                  <div className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-4">
                    <TRLGauge trl={tech.trl} />

                    <div>
                      <h4 className="text-sm font-semibold text-white/70 mb-1">How It Works</h4>
                      <p className="text-sm text-slate-400">{tech.mechanism}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-400 mb-1">Inputs</h4>
                        <ul className="space-y-1">
                          {tech.inputs.map((input, i) => (
                            <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                              <span className="text-emerald-500 mt-1 shrink-0">&#9654;</span>
                              {input}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white/70 mb-1">Outputs</h4>
                        <ul className="space-y-1">
                          {tech.outputs.map((output, i) => (
                            <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                              <span className="text-white/70 mt-1 shrink-0">&#9654;</span>
                              {output}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white/70 mb-1">Applicable Locations</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {tech.applicableLocations.map((loc) => (
                          <span key={loc} className="px-2 py-0.5 text-xs bg-slate-700/50 text-white/70 rounded-full">
                            {loc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white/70 mb-1">Energy Requirement</h4>
                      <p className="text-sm text-slate-400 font-mono">{tech.energyRequirement}</p>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-red-400 mb-1">Key Challenge</h4>
                      <p className="text-sm text-slate-400">{tech.keyChallenge}</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-white/70 mb-1">Current Status</h4>
                      <p className="text-sm text-slate-400">{tech.statusNote}</p>
                    </div>
                  </div>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB: LOCATIONS & RESOURCES
// ════════════════════════════════════════════════════════════════

function LocationsTab() {
  const [bodyFilter, setBodyFilter] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const bodies = ['all', 'Moon', 'Mars', 'Asteroid', 'Phobos/Deimos'] as const;

  const filtered = bodyFilter === 'all'
    ? ISRU_LOCATIONS
    : ISRU_LOCATIONS.filter((l) => l.body === bodyFilter);

  const difficultyColors: Record<string, string> = {
    low: 'text-emerald-400',
    moderate: 'text-yellow-400',
    high: 'text-orange-400',
    extreme: 'text-red-400',
  };

  return (
    <div>
      {/* Resource Overview */}
      <ScrollReveal>
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-800/40 border border-white/[0.06] rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Resource Distribution Across the Solar System</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-1">&#127761;</div>
              <div className="text-sm font-semibold text-white/70">Moon</div>
              <div className="text-xs text-slate-400 mt-0.5">Water ice, O2, metals</div>
              <div className="text-xs text-white/70 font-mono mt-1">~600M tons H2O (poles)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">&#127752;</div>
              <div className="text-sm font-semibold text-white/70">Mars</div>
              <div className="text-xs text-slate-400 mt-0.5">CO2, water ice, minerals</div>
              <div className="text-xs text-red-400 font-mono mt-1">95% CO2 atmosphere</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">&#9732;</div>
              <div className="text-sm font-semibold text-white/70">Asteroids</div>
              <div className="text-xs text-slate-400 mt-0.5">Water, PGMs, Fe-Ni, C</div>
              <div className="text-xs text-amber-400 font-mono mt-1">34,000+ known NEOs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">&#127762;</div>
              <div className="text-sm font-semibold text-white/70">Phobos/Deimos</div>
              <div className="text-xs text-slate-400 mt-0.5">Potential water, regolith</div>
              <div className="text-xs text-orange-400 font-mono mt-1">Ultra-low delta-v</div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Body Filters */}
      <ScrollReveal delay={0.1}>
        <div className="flex flex-wrap gap-2 mb-6">
          {bodies.map((body) => (
            <button
              key={body}
              onClick={() => setBodyFilter(body)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                bodyFilter === body
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.04]'
              }`}
            >
              {body === 'all' ? 'All Locations' : body}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Location Cards */}
      <StaggerContainer className="space-y-6" staggerDelay={0.1}>
        {filtered.map((loc) => {
          const bodyColor = BODY_COLORS[loc.body] || BODY_COLORS['Moon'];
          const isSelected = selectedLocation === loc.id;

          return (
            <StaggerItem key={loc.id}>
              <div
                className={`bg-white/[0.04] border rounded-xl overflow-hidden transition-all ${
                  isSelected ? 'border-white/15' : 'border-white/[0.06]'
                }`}
              >
                <button
                  onClick={() => setSelectedLocation(isSelected ? null : loc.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${bodyColor.bg} ${bodyColor.text} ${bodyColor.border}`}>
                          {loc.body}
                        </span>
                        <span className={`text-xs ${difficultyColors[loc.accessDifficulty]}`}>
                          Access: {loc.accessDifficulty.charAt(0).toUpperCase() + loc.accessDifficulty.slice(1)}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {loc.deltaV}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white">{loc.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">{loc.description}</p>
                    </div>
                    <div className={`text-slate-400 transition-transform shrink-0 ${isSelected ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {isSelected && (
                  <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-4">
                    {/* Key Advantage */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-1">Key Advantage</h4>
                      <p className="text-sm text-slate-400">{loc.keyAdvantage}</p>
                    </div>

                    {/* Resources Table */}
                    <div>
                      <h4 className="text-sm font-semibold text-white/70 mb-3">Confirmed & Estimated Resources</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                              <th className="pb-2 pr-4">Resource</th>
                              <th className="pb-2 pr-4">Estimated Quantity</th>
                              <th className="pb-2 pr-4">Confidence</th>
                              <th className="pb-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {loc.resources.map((res, i) => (
                              <tr key={i} className="text-slate-400">
                                <td className="py-2.5 pr-4 font-medium text-white whitespace-nowrap">
                                  {res.resource}
                                </td>
                                <td className="py-2.5 pr-4 font-mono text-xs">
                                  {res.estimatedQuantity}
                                </td>
                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                  <span className={`text-xs font-medium ${CONFIDENCE_COLORS[res.confidence]}`}>
                                    {res.confidence.charAt(0).toUpperCase() + res.confidence.slice(1)}
                                  </span>
                                </td>
                                <td className="py-2.5 text-xs">{res.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Missions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {loc.activeMissions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white/70 mb-2">Active Missions</h4>
                          <ul className="space-y-1">
                            {loc.activeMissions.map((m, i) => (
                              <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                <span className="text-white/70 mt-0.5 shrink-0">&#9679;</span>
                                {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {loc.plannedMissions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-purple-400 mb-2">Planned Missions</h4>
                          <ul className="space-y-1">
                            {loc.plannedMissions.map((m, i) => (
                              <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                <span className="text-purple-500 mt-0.5 shrink-0">&#9675;</span>
                                {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB: COMPANIES & PROGRAMS
// ════════════════════════════════════════════════════════════════

function CompaniesTab() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const types = ['all', 'government', 'commercial', 'startup'] as const;

  const filtered = typeFilter === 'all'
    ? ISRU_COMPANIES
    : ISRU_COMPANIES.filter((c) => c.type === typeFilter);

  return (
    <div>
      {/* Industry Overview */}
      <ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-white">{ISRU_COMPANIES.length}</div>
            <div className="text-xs text-slate-400 mt-1">Organizations Tracked</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {ISRU_COMPANIES.filter((c) => c.type === 'government').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Government Programs</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {ISRU_COMPANIES.filter((c) => c.type === 'commercial').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Commercial Companies</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {ISRU_COMPANIES.filter((c) => c.type === 'startup').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Startups</div>
          </div>
        </div>
      </ScrollReveal>

      {/* Type Filters */}
      <ScrollReveal delay={0.1}>
        <div className="flex flex-wrap gap-2 mb-6">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                typeFilter === type
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.04]'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Company Cards */}
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4" staggerDelay={0.08}>
        {filtered.map((company) => (
          <StaggerItem key={company.name}>
            <div className="card p-5 hover:border-white/[0.08] transition-all h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white">{company.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{company.focus}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${COMPANY_TYPE_COLORS[company.type]}`}>
                    {company.type.charAt(0).toUpperCase() + company.type.slice(1)}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[company.status]}`}>
                    {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-400 mb-3 flex-1">{company.description}</p>

              {/* Programs */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Key Programs</h4>
                <ul className="space-y-1">
                  {company.programs.slice(0, 3).map((prog, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-white/70 mt-0.5 shrink-0">&#8226;</span>
                      {prog}
                    </li>
                  ))}
                  {company.programs.length > 3 && (
                    <li className="text-xs text-slate-500">+{company.programs.length - 3} more programs</li>
                  )}
                </ul>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                {company.fundingStage && (
                  <span className="text-xs text-slate-500">{company.fundingStage}</span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/70 hover:text-white transition-colors"
                  >
                    Website &#8599;
                  </a>
                )}
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB: ECONOMICS
// ════════════════════════════════════════════════════════════════

function EconomicsTab() {
  const [selectedScenario, setSelectedScenario] = useState<string>(ECONOMIC_SCENARIOS[0].id);

  const scenario = ECONOMIC_SCENARIOS.find((s) => s.id === selectedScenario) || ECONOMIC_SCENARIOS[0];

  function formatMoney(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }

  function formatLargeMoney(valueM: number): string {
    if (valueM >= 1000) return `$${(valueM / 1000).toFixed(1)}B`;
    return `$${valueM.toLocaleString()}M`;
  }

  return (
    <div>
      {/* Key Insight Banner */}
      <ScrollReveal>
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-amber-400 mb-2">The Fundamental ISRU Value Proposition</h3>
          <p className="text-sm text-white/70 leading-relaxed">
            Delivering 1 kg of payload to the lunar surface costs approximately <span className="text-white font-bold">$1,000,000</span> using
            current commercial providers. Every kilogram of water, oxygen, or construction material produced locally eliminates this cost.
            For a permanent lunar base requiring thousands of tons of supplies annually, ISRU is not optional -- it is the only path
            to economic sustainability.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">~$1M/kg</div>
              <div className="text-xs text-slate-400">Earth to Lunar Surface</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">~$2M/kg</div>
              <div className="text-xs text-slate-400">Earth to Mars Surface</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">$50-$1K/kg</div>
              <div className="text-xs text-slate-400">ISRU Production Target</div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Scenario Selector */}
      <ScrollReveal delay={0.1}>
        <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">Select Scenario</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {ECONOMIC_SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedScenario === s.id
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.04]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Scenario Detail */}
      <ScrollReveal delay={0.15}>
        <div className="card overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-2">{scenario.label}</h3>
            <p className="text-sm text-slate-400 mb-6">{scenario.description}</p>

            {/* Cost Comparison Visual */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-white/70 mb-3">Cost Comparison (per kg)</h4>
              <div className="space-y-3">
                {scenario.costPerKgFromEarth > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400">Earth Launch</span>
                      <span className="text-white font-mono">{formatMoney(scenario.costPerKgFromEarth)}/kg</span>
                    </div>
                    <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400">ISRU Production</span>
                    <span className="text-white font-mono">{formatMoney(scenario.isruTargetCostPerKg)}/kg</span>
                  </div>
                  <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                      style={{
                        width: scenario.costPerKgFromEarth > 0
                          ? `${Math.max((scenario.isruTargetCostPerKg / scenario.costPerKgFromEarth) * 100, 2)}%`
                          : '50%',
                      }}
                    />
                  </div>
                </div>
                {scenario.costPerKgFromEarth > 0 && (
                  <p className="text-sm text-white/70 font-semibold">
                    {Math.round(scenario.costPerKgFromEarth / scenario.isruTargetCostPerKg)}x cost reduction with ISRU
                  </p>
                )}
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white font-mono">
                  {scenario.annualDemandKg >= 1000
                    ? `${(scenario.annualDemandKg / 1000).toLocaleString()}t`
                    : `${scenario.annualDemandKg.toLocaleString()} kg`}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Annual Demand</div>
              </div>
              <div className="bg-black/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white font-mono">
                  {formatLargeMoney(scenario.isruCapexM)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">ISRU CapEx</div>
              </div>
              <div className="bg-black/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white font-mono">
                  {formatLargeMoney(scenario.isruOpexPerYearM)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Annual OpEx</div>
              </div>
              <div className="bg-black/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {scenario.breakEvenYears} yr{scenario.breakEvenYears !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Break-Even</div>
              </div>
            </div>

            {/* Break-Even Timeline Visual */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-white/70 mb-3">10-Year Financial Timeline</h4>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => {
                  const year = i + 1;
                  const isPastBreakEven = year > scenario.breakEvenYears;
                  const isBreakEvenYear = year === scenario.breakEvenYears;
                  return (
                    <div key={i} className="flex-1 text-center">
                      <div
                        className={`h-10 rounded-sm mb-1 flex items-center justify-center text-xs font-mono ${
                          isPastBreakEven
                            ? 'bg-emerald-500/30 text-emerald-400'
                            : isBreakEvenYear
                              ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                              : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {isBreakEvenYear ? 'BE' : isPastBreakEven ? '+' : '-'}
                      </div>
                      <div className="text-xs text-slate-500">Y{year}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-500/20 rounded-sm inline-block" /> Investment
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-yellow-500/30 border border-yellow-500/50 rounded-sm inline-block" /> Break-Even
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-emerald-500/30 rounded-sm inline-block" /> Profitable
                </span>
              </div>
            </div>

            {/* Net Savings / Revenue */}
            {scenario.savingsOver10YearsM > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-400">Net Savings Over 10 Years</h4>
                    <p className="text-xs text-slate-400 mt-0.5">vs. launching equivalent mass from Earth</p>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {formatLargeMoney(scenario.savingsOver10YearsM)}
                  </div>
                </div>
              </div>
            )}

            {/* Assumptions */}
            <div>
              <h4 className="text-sm font-semibold text-white/70 mb-2">Key Assumptions</h4>
              <ul className="space-y-1.5">
                {scenario.keyAssumptions.map((assumption, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-slate-600 mt-0.5 shrink-0">&#8226;</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Propellant Production Potential */}
      <ScrollReveal delay={0.2}>
        <div className="mt-8 card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Propellant Production Potential</h3>
          <p className="text-sm text-slate-400 mb-4">
            ISRU-produced propellant is the highest-value product because it directly enables missions that would
            otherwise be impossible. A single Artemis crew mission requires ~30 metric tons of propellant for the
            ascent stage alone.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="pb-2 pr-4">Source</th>
                  <th className="pb-2 pr-4">Process</th>
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2 pr-4">Yield</th>
                  <th className="pb-2">Energy Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <tr className="text-slate-400">
                  <td className="py-2.5 pr-4 text-white">Lunar Water Ice</td>
                  <td className="py-2.5 pr-4">Electrolysis</td>
                  <td className="py-2.5 pr-4">LH2 + LOX</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">1 kg H2O &#8594; 0.11 kg H2 + 0.89 kg O2</td>
                  <td className="py-2.5 font-mono text-xs">~5 kWh/kg</td>
                </tr>
                <tr className="text-slate-400">
                  <td className="py-2.5 pr-4 text-white">Mars CO2 + H2O</td>
                  <td className="py-2.5 pr-4">Sabatier + Electrolysis</td>
                  <td className="py-2.5 pr-4">CH4 + LOX</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">4.5 kg CO2 &#8594; 1 kg CH4 + 3.5 kg O2 (with H2)</td>
                  <td className="py-2.5 font-mono text-xs">~12 kWh/kg CH4</td>
                </tr>
                <tr className="text-slate-400">
                  <td className="py-2.5 pr-4 text-white">Mars Atmosphere</td>
                  <td className="py-2.5 pr-4">MOXIE (SOEC)</td>
                  <td className="py-2.5 pr-4">LOX only</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">2.2 kg CO2 &#8594; 1 kg O2 + 1.2 kg CO</td>
                  <td className="py-2.5 font-mono text-xs">~7 kWh/kg O2</td>
                </tr>
                <tr className="text-slate-400">
                  <td className="py-2.5 pr-4 text-white">Asteroid Water</td>
                  <td className="py-2.5 pr-4">Thermal + Electrolysis</td>
                  <td className="py-2.5 pr-4">LH2 + LOX</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">C-type asteroid: up to 20% water by mass</td>
                  <td className="py-2.5 font-mono text-xs">~3-6 kWh/kg</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Timeline */}
      <ScrollReveal delay={0.25}>
        <div className="mt-8 card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">ISRU Development Roadmap</h3>
          <div className="space-y-0">
            {[
              { year: '2021-2023', event: 'MOXIE demonstrates Mars O2 production (TRL 6)', status: 'completed' as const },
              { year: '2024', event: 'First commercial lunar landings (IM-1, Peregrine), OSIRIS-REx sample analysis confirms asteroid water', status: 'completed' as const },
              { year: '2025-2026', event: 'PRIME-1 lunar drill demo, Artemis III crewed south pole landing, AstroForge asteroid flyby data', status: 'active' as const },
              { year: '2027-2028', event: 'First lunar ice extraction demo, JAXA MMX Phobos sample return, ESA PROSPECT drill', status: 'planned' as const },
              { year: '2029-2030', event: 'Lunar ISRU pilot plant (1 ton/year water), Psyche asteroid characterization complete', status: 'planned' as const },
              { year: '2031-2035', event: 'Operational lunar propellant depot, Mars ISRU plant pre-positioned for crewed mission', status: 'planned' as const },
              { year: '2035+', event: 'Commercial cislunar propellant economy, first asteroid mining returns, Mars base self-sufficiency', status: 'planned' as const },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      item.status === 'completed'
                        ? 'bg-emerald-400'
                        : item.status === 'active'
                          ? 'bg-white animate-pulse'
                          : 'bg-slate-600'
                    }`}
                  />
                  {i < 6 && <div className="w-0.5 h-12 bg-slate-700/50" />}
                </div>
                <div className="pb-6">
                  <div className="text-sm font-mono font-bold text-white/70">{item.year}</div>
                  <p className="text-sm text-slate-400 mt-0.5">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE CONTENT (with useSearchParams)
// ════════════════════════════════════════════════════════════════

function ISRUContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab') as MainTab | null;
  const initialTab: MainTab =
    tabParam && ['technologies', 'locations', 'companies', 'economics'].includes(tabParam)
      ? tabParam
      : 'technologies';

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);

  const handleTabChange = useCallback(
    (tab: MainTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'technologies') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  useSwipeTabs(
    ['technologies', 'locations', 'companies', 'economics'],
    activeTab,
    (tab) => handleTabChange(tab as MainTab)
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="In-Situ Resource Utilization (ISRU)"
          subtitle="Living off the land in space -- technologies, locations, companies, and economics of harvesting resources beyond Earth"
          icon={<span>&#9874;</span>}
          accentColor="amber"
        />

        {/* Main Tab Navigation */}
        <div className="flex gap-1 mb-8 p-1 bg-white/[0.04] rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-thin">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap touch-target ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-white/90 hover:bg-white/[0.08]'
              }`}
            >
              <div className="text-sm font-semibold">{tab.label}</div>
              <div
                className={`text-xs mt-0.5 hidden sm:block ${
                  activeTab === tab.id ? 'text-white/70' : 'text-slate-500'
                }`}
              >
                {tab.description}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'technologies' && <TechnologiesTab />}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'companies' && <CompaniesTab />}
        {activeTab === 'economics' && <EconomicsTab />}

        <RelatedModules
          modules={[
            {
              name: 'Solar System Exploration',
              description: 'Planetary missions and data',
              href: '/solar-exploration',
              icon: '\u{1F30D}',
            },
            {
              name: 'Asteroid Watch',
              description: 'Near-Earth object tracking',
              href: '/asteroid-watch',
              icon: '\u{2604}\uFE0F',
            },
            {
              name: 'Space Mining',
              description: 'Asteroid mining economics',
              href: '/business-opportunities?tab=mining',
              icon: '\u{26CF}\uFE0F',
            },
            {
              name: 'Launch Vehicles',
              description: 'Delivery systems to ISRU sites',
              href: '/mission-cost?tab=vehicles',
              icon: '\u{1F680}',
            },
            {
              name: 'Cislunar Ecosystem',
              description: 'Lunar economy infrastructure',
              href: '/cislunar',
              icon: '\u{1F311}',
            },
            {
              name: 'Mars Planner',
              description: 'Mars mission architecture',
              href: '/mars-planner',
              icon: '\u{1FA90}',
            },
          ]}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DEFAULT EXPORT (Suspense boundary for useSearchParams)
// ════════════════════════════════════════════════════════════════

export default function ISRUPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-20">
          <div
            className="w-12 h-12 border-3 border-white/15 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      }
    >
      <ISRUContent />
    </Suspense>
  );
}
