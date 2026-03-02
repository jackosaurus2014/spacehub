'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import PremiumGate from '@/components/PremiumGate';
import ExportButton from '@/components/ui/ExportButton';
import SupplyChainNode from '@/components/supply-chain/SupplyChainNode';
import ShortageAlert from '@/components/supply-chain/ShortageAlert';
import DependencyChart from '@/components/supply-chain/DependencyChart';
import { clientLogger } from '@/lib/client-logger';
import EmptyState from '@/components/ui/EmptyState';
import {
  SupplyChainCompany,
  SupplyRelationship,
  SupplyShortage,
  SUPPLY_CHAIN_TIERS,
  SUPPLY_CHAIN_COUNTRIES,
  SUPPLY_CHAIN_PRODUCT_CATEGORIES,
  SHORTAGE_SEVERITY_INFO,
} from '@/types';

// Lazy-load the BOM Risk Analysis tab (~600 lines, only visible when tab selected)
const BOMRiskAnalysisTab = dynamic(() => import('./BOMRiskAnalysisTab'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}</div>
      <div className="h-64 bg-slate-800 rounded-xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}</div>
    </div>
  ),
});

interface SupplyChainStats {
  totalCompanies: number;
  primeContractors: number;
  tier1Suppliers: number;
  tier2Suppliers: number;
  tier3Suppliers: number;
  totalRelationships: number;
  highRiskRelationships: number;
  criticalRelationships: number;
  totalShortages: number;
  criticalShortages: number;
  highSeverityShortages: number;
  countriesWithHighRisk: string[];
  usCompanies: number;
  europeanCompanies: number;
}

// ============================================================
// Supply Chain Category Data (static, client-side)
// ============================================================

interface SupplierInfo {
  name: string;
  description: string;
  headquarters: string;
  keyProducts: string[];
  notablePrograms: string[];
  tier: 'prime' | 'tier1' | 'tier2' | 'tier3';
}

interface SupplyChainCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  marketSize: string;
  keyTrends: string[];
  suppliers: SupplierInfo[];
}

const SUPPLY_CHAIN_CATEGORIES_DETAILED: SupplyChainCategory[] = [
  {
    id: 'propulsion',
    label: 'Propulsion Systems',
    icon: '\uD83D\uDE80',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500',
    description: 'Rocket engines, thrusters, propellant systems, and electric propulsion for launch vehicles and spacecraft.',
    marketSize: '$8.2B',
    keyTrends: [
      'Shift toward reusable engine designs (Raptor, BE-4)',
      'Growth in electric propulsion for satellite constellations',
      'Green propellant adoption replacing toxic hydrazine',
      '3D-printed engines reducing manufacturing lead times',
    ],
    suppliers: [
      {
        name: 'Aerojet Rocketdyne (L3Harris)',
        description: 'Premier US rocket engine manufacturer. Produces RS-25 (SLS), RL-10 (Centaur), and AJ-10 thrusters. Acquired by L3Harris in 2023.',
        headquarters: 'El Segundo, CA',
        keyProducts: ['RS-25 Engine', 'RL-10 Engine', 'AJ-10 Thruster', 'MR-104 Monoprop'],
        notablePrograms: ['SLS/Artemis', 'Vulcan Centaur', 'Orion Spacecraft'],
        tier: 'tier1',
      },
      {
        name: 'Ursa Major Technologies',
        description: 'Modular rocket engine startup producing Hadley (5,000 lbf) and Arroway (200,000 lbf) engines with rapid iteration and US-only supply chain.',
        headquarters: 'Berthoud, CO',
        keyProducts: ['Hadley Engine', 'Arroway Engine', 'Ripley Engine'],
        notablePrograms: ['Firefly Antares 330', 'DARPA Launch Challenge'],
        tier: 'tier1',
      },
      {
        name: 'Launcher (Vast)',
        description: 'Acquired by Vast in 2023. Developed 3D-printed copper alloy E-2 engine. Propulsion tech now integrated into Vast space station program.',
        headquarters: 'Long Beach, CA',
        keyProducts: ['E-2 Engine', '3D-Printed Combustion Chamber'],
        notablePrograms: ['Vast Haven-1 Station'],
        tier: 'tier2',
      },
    ],
  },
  {
    id: 'avionics',
    label: 'Avionics & Electronics',
    icon: '\uD83D\uDCE1',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    description: 'Flight computers, guidance systems, sensors, communication payloads, and radiation-hardened electronics.',
    marketSize: '$12.5B',
    keyTrends: [
      'Demand surge for rad-hard processors as constellations scale',
      'Transition from RAD750 to next-gen RAD5545 processors',
      'COTS-based fault-tolerant architectures for LEO missions',
      'AI/ML processing on-orbit driving FPGA demand',
    ],
    suppliers: [
      {
        name: 'BAE Systems Electronic Systems',
        description: 'Sole manufacturer of RAD750 flight processor used on Mars rovers, Orion, and dozens of NASA/DoD spacecraft. Developing RAD5545 next-gen.',
        headquarters: 'Manassas, VA',
        keyProducts: ['RAD750 Processor', 'RAD5545 Processor', 'Radiation-Hardened ASICs'],
        notablePrograms: ['Mars Perseverance', 'JWST', 'Orion MPCV', 'GPS III'],
        tier: 'tier1',
      },
      {
        name: 'Honeywell Aerospace',
        description: 'Avionics, guidance systems, IMUs, and sensors for virtually every US space program. Critical single-source for many navigation components.',
        headquarters: 'Phoenix, AZ',
        keyProducts: ['Star Trackers', 'IMU Systems', 'Guidance Electronics', 'Actuators'],
        notablePrograms: ['ISS', 'Orion', 'Dream Chaser', 'Commercial Crew'],
        tier: 'tier1',
      },
      {
        name: 'Collins Aerospace (RTX)',
        description: 'Avionics and life support systems provider. Sole developer of next-gen EVA suits and ISS ECLSS components.',
        headquarters: 'Charlotte, NC',
        keyProducts: ['ECLSS Systems', 'EVA Suits', 'Avionics', 'Displays'],
        notablePrograms: ['ISS ECLSS', 'Artemis xEMU', 'Axiom AxEMU'],
        tier: 'tier1',
      },
    ],
  },
  {
    id: 'solar_panels',
    label: 'Solar Panels & Power',
    icon: '\u2600\uFE0F',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500',
    description: 'Space-grade solar cells, solar array assemblies, power management, and energy storage systems.',
    marketSize: '$3.8B',
    keyTrends: [
      'III-V multi-junction cells exceeding 32% efficiency',
      'Roll-out and flexible solar array technology for high-power missions',
      'Mega-constellation demand straining production capacity',
      'European push for supply chain independence (Azur Space)',
    ],
    suppliers: [
      {
        name: 'SolAero Technologies (Rocket Lab)',
        description: 'Acquired by Rocket Lab in 2022. Premier III-V solar cell manufacturer with ZTJ and IMM-alpha cells at 32%+ efficiency.',
        headquarters: 'Albuquerque, NM',
        keyProducts: ['ZTJ Solar Cell', 'IMM-alpha Cell', 'Solar Panel Assemblies'],
        notablePrograms: ['Mars InSight', 'Parker Solar Probe', 'GOES Satellites'],
        tier: 'tier1',
      },
      {
        name: 'Spectrolab (Boeing)',
        description: 'World largest space solar cell manufacturer. XTJ Prime cells at 30.7% efficiency. Powers ISS, GPS, and most US military spacecraft.',
        headquarters: 'Sylmar, CA',
        keyProducts: ['XTJ Prime Cell', 'UTJ Cell', 'Solar Panel CIC'],
        notablePrograms: ['ISS Solar Arrays', 'GPS III', 'SBIRS', 'WGS'],
        tier: 'tier1',
      },
      {
        name: 'Azur Space Solar Power',
        description: 'Leading European III-V space solar cell manufacturer with 30%+ efficiency triple-junction cells.',
        headquarters: 'Heilbronn, Germany',
        keyProducts: ['3G30C Cell', 'Triple-Junction Cells', 'Concentrator Cells'],
        notablePrograms: ['ESA Science Missions', 'Galileo', 'Sentinel'],
        tier: 'tier2',
      },
    ],
  },
  {
    id: 'thermal',
    label: 'Thermal Management',
    icon: '\uD83C\uDF21\uFE0F',
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    description: 'Heat pipes, radiators, thermal control systems, cryocoolers, and MLI blankets for spacecraft thermal regulation.',
    marketSize: '$2.1B',
    keyTrends: [
      'Deployable radiator technology for high-power satellites',
      'Advanced loop heat pipes for variable thermal loads',
      'Cryocooler development for propellant depot ZBO',
      'Phase-change materials for smallsat thermal management',
    ],
    suppliers: [
      {
        name: 'Northrop Grumman Space Systems',
        description: 'Major provider of spacecraft thermal control systems, deployable radiators, and cryogenic subsystems for defense and science missions.',
        headquarters: 'Falls Church, VA',
        keyProducts: ['Deployable Radiators', 'Cryocoolers', 'Thermal Straps', 'Heat Pipes'],
        notablePrograms: ['JWST Sunshield', 'Cygnus', 'SBIRS'],
        tier: 'prime',
      },
      {
        name: 'Moog Inc.',
        description: 'Precision thermal control valves, actuators, and fluid loop systems for spacecraft and satellite thermal management.',
        headquarters: 'East Aurora, NY',
        keyProducts: ['Thermal Control Valves', 'Fluid Loop Pumps', 'Actuators', 'Heater Controllers'],
        notablePrograms: ['ISS Thermal Control', 'Orion TCS', 'Commercial Satellites'],
        tier: 'tier1',
      },
      {
        name: 'Curtiss-Wright',
        description: 'Defense and aerospace systems provider including thermal management electronics, sensor systems, and ruggedized power electronics.',
        headquarters: 'Davidson, NC',
        keyProducts: ['Thermal Switches', 'Power Electronics', 'Sensor Systems', 'Actuation'],
        notablePrograms: ['Submarine/Naval Programs', 'Defense Satellites', 'ISS'],
        tier: 'tier2',
      },
    ],
  },
  {
    id: 'structures',
    label: 'Structures & Materials',
    icon: '\uD83C\uDFD7\uFE0F',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500',
    description: 'Carbon fiber composites, metallic structures, fairings, pressure vessels, and advanced materials for launch vehicles and spacecraft.',
    marketSize: '$6.7B',
    keyTrends: [
      'Automated fiber placement reducing composite manufacturing time',
      'Additive manufacturing for complex metallic structures',
      'Out-of-autoclave composite curing for cost reduction',
      'Demand surge from mega-constellation satellite bus production',
    ],
    suppliers: [
      {
        name: 'Spirit AeroSystems',
        description: 'Major aerostructures manufacturer producing composite rocket fairings, structural components, and satellite structures. Being acquired by Boeing.',
        headquarters: 'Wichita, KS',
        keyProducts: ['Rocket Fairings', 'Composite Structures', 'Fuselage Sections'],
        notablePrograms: ['Boeing 787', 'Atlas V Fairing', 'Military Programs'],
        tier: 'tier1',
      },
      {
        name: 'Hexcel Corporation',
        description: 'Leading carbon fiber and composite materials manufacturer. HexPly prepregs and HexWeb honeycomb used across the space industry.',
        headquarters: 'Stamford, CT',
        keyProducts: ['HexPly Prepreg', 'HexWeb Honeycomb', 'Carbon Fiber Fabric', 'Structural Adhesives'],
        notablePrograms: ['Falcon 9 Fairing', 'A350', 'F-35', 'Satellite Panels'],
        tier: 'tier2',
      },
      {
        name: 'Toray Composite Materials America',
        description: 'World largest carbon fiber manufacturer (Torayca brand). Supplies aerospace-grade fiber for rocket and satellite structures.',
        headquarters: 'Tacoma, WA',
        keyProducts: ['T800S Fiber', 'T1100G Fiber', 'Torayca Prepreg', 'Woven Fabric'],
        notablePrograms: ['Boeing 787', 'Falcon 9', 'Dragon Capsule', 'Military Aircraft'],
        tier: 'tier2',
      },
    ],
  },
  {
    id: 'ground_equipment',
    label: 'Ground Equipment',
    icon: '\uD83D\uDCE1',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500',
    description: 'Ground station antennas, satellite control systems, data downlink networks, and mission operations infrastructure.',
    marketSize: '$4.3B',
    keyTrends: [
      'Cloud-based ground station networks (AWS, Azure Orbital)',
      'Optical ground-to-space links replacing RF for high data rates',
      'Ground station as a service (GSaaS) model proliferating',
      'Polar station demand increasing for LEO constellation support',
    ],
    suppliers: [
      {
        name: 'KSAT (Kongsberg Satellite Services)',
        description: 'World largest commercial ground station network with 200+ antennas at 25+ locations including polar stations at Svalbard and Antarctica.',
        headquarters: 'Tromso, Norway',
        keyProducts: ['Ground Station Network', 'Antenna Systems', 'TT&C Services', 'Data Downlink'],
        notablePrograms: ['NASA Near Space Network', 'ESA Missions', 'Copernicus', 'Commercial LEO'],
        tier: 'tier1',
      },
      {
        name: 'Kongsberg Defence & Aerospace',
        description: 'Norwegian defense and space technology company providing ground segment systems, satellite control, and space surveillance capabilities.',
        headquarters: 'Kongsberg, Norway',
        keyProducts: ['Satellite Control Systems', 'C2 Software', 'Space Surveillance', 'Tracking Antennas'],
        notablePrograms: ['Norwegian MoD', 'NATO', 'ESA Programs'],
        tier: 'tier1',
      },
      {
        name: 'Viasat Inc.',
        description: 'Global satellite communications company providing ground terminals, Ka-band systems, and network infrastructure. Merged with Inmarsat (2023).',
        headquarters: 'Carlsbad, CA',
        keyProducts: ['Ka-Band Terminals', 'Satellite Modems', 'Network Mgmt', 'Cybersecurity'],
        notablePrograms: ['ViaSat-3', 'Military SATCOM', 'Airline Connectivity'],
        tier: 'tier1',
      },
    ],
  },
  {
    id: 'testing_integration',
    label: 'Testing & Integration',
    icon: '\uD83D\uDD2C',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500',
    description: 'Environmental testing, vibration/thermal vacuum qualification, failure analysis, reliability testing, and systems integration services.',
    marketSize: '$1.9B',
    keyTrends: [
      'Testing capacity bottleneck as commercial space scales production',
      'Virtual testing and digital twin reducing physical test cycles',
      'Companies building in-house TVAC chambers to avoid queue times',
      'Radiation testing demand surging for mega-constellation components',
    ],
    suppliers: [
      {
        name: 'National Technical Systems (NTS)',
        description: 'Largest independent testing laboratory in North America. Full environmental qualification testing for spacecraft components and subsystems.',
        headquarters: 'Calabasas, CA',
        keyProducts: ['Vibration Testing', 'TVAC Testing', 'Acoustic Testing', 'EMC/EMI Testing'],
        notablePrograms: ['SpaceX Falcon/Dragon', 'NASA Programs', 'DoD Satellites'],
        tier: 'tier2',
      },
      {
        name: 'Element Materials Technology',
        description: 'Global testing provider with space division offering component qualification, failure analysis, and radiation testing for European and US programs.',
        headquarters: 'London, UK',
        keyProducts: ['Materials Testing', 'Failure Analysis', 'Radiation Testing', 'Product Assurance'],
        notablePrograms: ['ESA Programs', 'Airbus Satellites', 'Boeing Defense'],
        tier: 'tier2',
      },
      {
        name: 'Serco Space',
        description: 'Major provider of satellite operations, mission control, and systems integration. Operates ESA ESOC mission control for 30+ satellite missions.',
        headquarters: 'Hook, UK',
        keyProducts: ['Mission Operations', 'Systems Integration', 'Ground Segment Ops', 'Launch Support'],
        notablePrograms: ['ESA ESOC', 'EUMETSAT', 'Galileo Operations'],
        tier: 'tier2',
      },
    ],
  },
];

// ============================================================
// Supply Chain Challenges Data
// ============================================================

interface SupplyChainChallenge {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  impacts: string[];
  mitigations: string[];
  icon: string;
}

const SUPPLY_CHAIN_CHALLENGES: SupplyChainChallenge[] = [
  {
    id: 'itar',
    title: 'ITAR Restrictions Limiting International Sourcing',
    severity: 'critical',
    description: 'International Traffic in Arms Regulations (ITAR) classify most space hardware as defense articles, severely restricting international collaboration and sourcing options.',
    impacts: [
      'Non-US companies cannot access US propulsion, guidance, or satellite components',
      'Foreign nationals excluded from ITAR-controlled projects, limiting talent pool',
      'Parallel supply chains required for US and international programs',
      '6-12 month delays for export license approvals',
      'Dedicated secure facilities and IT networks required for compliance',
    ],
    mitigations: [
      'EAR99 classification for commercial components where possible',
      'TAA (Technical Assistance Agreements) for allied nations',
      'European autonomous supply chain development (Ariane, VEGA)',
      'Defense trade treaties with UK, Australia, Canada',
    ],
    icon: '\uD83D\uDEE1\uFE0F',
  },
  {
    id: 'single-source',
    title: 'Single-Source Dependencies',
    severity: 'critical',
    description: 'Critical space components often have only one qualified supplier globally, creating catastrophic risk if that supplier faces disruption.',
    impacts: [
      'RAD750 processor: BAE Systems is the sole source for most NASA missions',
      'Beryllium: Materion is the only Western aerospace-grade producer',
      'EVA suits: Collins Aerospace is the sole next-gen suit developer',
      'ECLSS: Collins Aerospace sole source for ISS-heritage life support',
      'Heavy rare earth processing: 90%+ controlled by China',
    ],
    mitigations: [
      'Second-source qualification programs (multi-year, multi-$M efforts)',
      'Strategic national stockpiles for critical materials',
      'CHIPS Act investment in domestic semiconductor capacity',
      'Recycling programs for rare earths and specialty metals',
    ],
    icon: '\u26A0\uFE0F',
  },
  {
    id: 'lead-times',
    title: 'Long Lead Times (18-24 Months for Custom Components)',
    severity: 'high',
    description: 'Space-qualified components require extensive qualification testing, specialized manufacturing, and often custom fabrication, resulting in lead times far exceeding commercial electronics.',
    impacts: [
      'Rad-hard semiconductors: 18-24 month lead times',
      'Large titanium/Inconel forgings: 18-24 months',
      'Custom optical assemblies: 12-18 months',
      'Space-qualified actuators and mechanisms: 9-18 months',
      'Program schedules slip due to component availability',
    ],
    mitigations: [
      'Early procurement of long-lead items (program inception)',
      'Additive manufacturing reducing lead times for some metallic parts',
      'Heritage design reuse to avoid new qualification cycles',
      'Block-buy procurement for constellation-scale orders',
    ],
    icon: '\u23F1\uFE0F',
  },
  {
    id: 'quality-reliability',
    title: 'Space-Grade vs. Commercial-Grade Requirements',
    severity: 'high',
    description: 'Space hardware must survive extreme radiation, thermal cycling, vacuum, and vibration environments for years without maintenance, driving dramatically higher qualification and testing costs.',
    impacts: [
      'Space-grade parts cost 10-100x more than commercial equivalents',
      'Full qualification testing (TVAC, vibration, radiation) adds 6-12 months',
      'Limited testing facility availability creates scheduling bottlenecks',
      'Failure rates must be parts-per-billion, not parts-per-million',
      'COTS components require extensive screening and derating',
    ],
    mitigations: [
      'COTS+ approach: commercial parts with additional screening',
      'Radiation shielding allowing use of commercial electronics in LEO',
      'Fault-tolerant architectures with redundant commercial components',
      'In-house testing facilities for high-volume producers',
    ],
    icon: '\uD83D\uDD2C',
  },
  {
    id: 'small-batch',
    title: 'Small Batch Sizes Driving Up Costs',
    severity: 'medium',
    description: 'Traditional space programs order components in quantities of 1-100, far below minimum efficient production runs, resulting in high per-unit costs and limited supplier interest.',
    impacts: [
      'Semiconductor foundries deprioritize small aerospace orders',
      'Custom forgings cost 5-10x more in small quantities',
      'Tooling amortization over few units drives unit cost up',
      'Suppliers may exit space market due to low volume/margin',
      'Limited negotiating leverage compared to automotive/consumer buyers',
    ],
    mitigations: [
      'Mega-constellation production driving volumes to commercial levels',
      'Multi-program procurement pooling demand across agencies',
      'Standardized satellite buses reducing custom component needs',
      'Government SBIR/STTR programs supporting niche suppliers',
    ],
    icon: '\uD83D\uDCCA',
  },
];

// ============================================================
// Material Criticality Data
// ============================================================

interface CriticalMaterial {
  id: string;
  name: string;
  category: string;
  riskLevel: 'critical' | 'high' | 'medium';
  primarySources: string[];
  spaceApplications: string[];
  supplyRisk: string;
  substitutability: 'none' | 'limited' | 'moderate';
  icon: string;
}

const CRITICAL_MATERIALS: CriticalMaterial[] = [
  {
    id: 'neodymium',
    name: 'Neodymium (Rare Earth)',
    category: 'Rare Earths',
    riskLevel: 'critical',
    primarySources: ['China (85%+)', 'Australia (Lynas)', 'USA (MP Materials)'],
    spaceApplications: ['Permanent magnets for reaction wheels', 'Electric motor magnets', 'Sensor systems', 'Actuator motors'],
    supplyRisk: 'China dominates processing. Export controls in effect. Alternative supply 5+ years from scale.',
    substitutability: 'none',
    icon: '\u2699\uFE0F',
  },
  {
    id: 'yttrium',
    name: 'Yttrium (Rare Earth)',
    category: 'Rare Earths',
    riskLevel: 'critical',
    primarySources: ['China (90%+)', 'Australia', 'India'],
    spaceApplications: ['Thermal barrier coatings for engines', 'Laser crystals (YAG)', 'Phosphors for displays', 'Superconductor coatings'],
    supplyRisk: 'Near-total Chinese monopoly on processing. Critical for high-temperature applications in propulsion.',
    substitutability: 'limited',
    icon: '\uD83C\uDF21\uFE0F',
  },
  {
    id: 'rad-hard-electronics',
    name: 'Radiation-Hardened Electronics',
    category: 'Electronics',
    riskLevel: 'critical',
    primarySources: ['BAE Systems (USA)', 'Cobham (USA)', 'Microchip (USA)', '3D-Plus (France)'],
    spaceApplications: ['Flight computers (RAD750)', 'Memory modules', 'FPGAs for signal processing', 'Power management ICs'],
    supplyRisk: 'Only 3-4 global suppliers. TSMC dependency for advanced nodes. 18-24 month lead times. ITAR restricted.',
    substitutability: 'none',
    icon: '\uD83D\uDCBB',
  },
  {
    id: 'carbon-fiber',
    name: 'Aerospace Carbon Fiber Composites',
    category: 'Composites',
    riskLevel: 'high',
    primarySources: ['Toray (Japan, 50%+)', 'Hexcel (USA)', 'SGL Carbon (Germany)', 'Mitsubishi (Japan)'],
    spaceApplications: ['Rocket fairings and interstages', 'Satellite bus panels', 'Pressure vessels (COPVs)', 'Solar array substrates'],
    supplyRisk: 'Japanese supplier concentration. Aerospace competes with auto/wind for capacity. 12-month qualification cycles.',
    substitutability: 'limited',
    icon: '\uD83E\uDDF1',
  },
  {
    id: 'hydrazine',
    name: 'Hydrazine & Propellants',
    category: 'Propellants',
    riskLevel: 'high',
    primarySources: ['Arch Chemicals (USA)', 'Lonza (Switzerland)', 'ISRO (India)'],
    spaceApplications: ['Satellite station-keeping thrusters', 'Attitude control systems', 'Spacecraft maneuvering', 'Emergency deorbit'],
    supplyRisk: 'Limited production facilities. Highly toxic handling requirements. REACH regulations driving replacement. Green propellant alternatives emerging but not yet widely qualified.',
    substitutability: 'moderate',
    icon: '\u2622\uFE0F',
  },
  {
    id: 'inconel',
    name: 'Inconel Superalloys (718/625)',
    category: 'Specialty Alloys',
    riskLevel: 'high',
    primarySources: ['ATI (USA)', 'Special Metals/Carpenter (USA)', 'Howmet Aerospace (USA)', 'VDM Metals (Germany)'],
    spaceApplications: ['Rocket engine combustion chambers', 'Turbopump housings', 'Exhaust nozzles', 'High-temperature structural components'],
    supplyRisk: 'VIM/VAR processing bottleneck. 18-24 month lead for large forgings. Nickel supply chain volatility.',
    substitutability: 'limited',
    icon: '\uD83D\uDD27',
  },
  {
    id: 'titanium',
    name: 'Aerospace Titanium Alloys',
    category: 'Specialty Alloys',
    riskLevel: 'high',
    primarySources: ['ATI (USA)', 'TIMET (USA)', 'VSMPO-AVISMA (Russia, sanctioned)', 'Kobe Steel (Japan)'],
    spaceApplications: ['Rocket structures and tanks', 'Satellite frames', 'Engine components', 'Fasteners and fittings'],
    supplyRisk: 'Russia sanctions removed 30% of global aerospace supply. Western alternatives ramping but 2-3 year lag. Price volatility.',
    substitutability: 'limited',
    icon: '\u2699\uFE0F',
  },
];

// ============================================================
// Main Component
// ============================================================

function SupplyChainContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL state
  const initialTab = searchParams.get('tab') || 'overview';
  const initialTier = searchParams.get('tier') || '';
  const initialCountry = searchParams.get('country') || '';
  const initialSeverity = searchParams.get('severity') || '';
  const initialCategory = searchParams.get('category') || '';

  // Local state
  type TabId = 'overview' | 'categories' | 'companies' | 'shortages' | 'challenges' | 'materials' | 'risks' | 'bom-risks';
  const [activeTab, setActiveTab] = useState<TabId>(
    initialTab as TabId
  );
  const [stats, setStats] = useState<SupplyChainStats | null>(null);
  const [companies, setCompanies] = useState<SupplyChainCompany[]>([]);
  const [relationships, setRelationships] = useState<SupplyRelationship[]>([]);
  const [shortages, setShortages] = useState<SupplyShortage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<string>(initialTier);
  const [countryFilter, setCountryFilter] = useState<string>(initialCountry);
  const [severityFilter, setSeverityFilter] = useState<string>(initialSeverity);
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>(SUPPLY_CHAIN_CATEGORIES_DETAILED[0].id);

  // BOM Risk tab state is managed inside the lazy-loaded BOMRiskAnalysisTab component

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab && activeTab !== 'overview') params.set('tab', activeTab);
    if (tierFilter) params.set('tier', tierFilter);
    if (countryFilter) params.set('country', countryFilter);
    if (severityFilter) params.set('severity', severityFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeTab, tierFilter, countryFilter, severityFilter, categoryFilter, router, pathname]);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/supply-chain?type=stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      clientLogger.error('Failed to fetch stats', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    }
  }, []);

  const fetchRelationships = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/supply-chain?type=relationships');
      const data = await res.json();
      setRelationships(data.relationships || []);
    } catch (error) {
      clientLogger.error('Failed to fetch relationships', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    }
  }, []);

  const fetchTabData = useCallback(async () => {
    // Client-only tabs — no fetch needed
    if (activeTab === 'bom-risks' || activeTab === 'categories' || activeTab === 'challenges' || activeTab === 'materials') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'overview':
        case 'companies': {
          const params = new URLSearchParams({ type: 'companies' });
          if (tierFilter) params.set('tier', tierFilter);
          if (countryFilter) params.set('country', countryFilter);
          if (categoryFilter) params.set('category', categoryFilter);
          const res = await fetch(`/api/supply-chain?${params}`);
          const data = await res.json();
          setCompanies(data.companies || []);
          break;
        }
        case 'shortages': {
          const params = new URLSearchParams({ type: 'shortages' });
          if (severityFilter) params.set('severity', severityFilter);
          if (categoryFilter) params.set('category', categoryFilter);
          const res = await fetch(`/api/supply-chain?${params}`);
          const data = await res.json();
          setShortages(data.shortages || []);
          break;
        }
        case 'risks': {
          const [companiesRes, shortagesRes] = await Promise.all([
            fetch('/api/supply-chain?type=companies'),
            fetch('/api/supply-chain?type=shortages&severity=critical'),
          ]);
          const companiesData = await companiesRes.json();
          const shortagesData = await shortagesRes.json();
          setCompanies(companiesData.companies || []);
          setShortages(shortagesData.shortages || []);
          break;
        }
      }
    } catch (error) {
      clientLogger.error('Failed to fetch data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, tierFilter, countryFilter, severityFilter, categoryFilter]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
    fetchRelationships();
  }, [fetchStats, fetchRelationships]);

  // Fetch data based on active tab
  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Filter companies by search query (client-side text search)
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        c.products.some((p) => p.replace(/_/g, ' ').toLowerCase().includes(q)) ||
        c.country.toLowerCase().includes(q) ||
        (c.headquarters || '').toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  // Filter shortages by search query
  const filteredShortages = useMemo(() => {
    if (!searchQuery.trim()) return shortages;
    const q = searchQuery.toLowerCase();
    return shortages.filter(
      (s) =>
        s.material.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.affectedProducts || []).some((p) => p.replace(/_/g, ' ').toLowerCase().includes(q))
    );
  }, [shortages, searchQuery]);

  // Get unique countries from companies
  const availableCountries = Array.from(new Set(companies.map((c) => c.countryCode)));

  // BOM risk data is managed inside the lazy-loaded BOMRiskAnalysisTab

  return (
    <>
      {/* Stats Overview */}
      {stats && (
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-white">{stats.totalCompanies}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Companies</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-blue-400">{stats.primeContractors}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Primes</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-cyan-400">
                {stats.tier1Suppliers}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Tier 1</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-green-400">
                {stats.tier2Suppliers + stats.tier3Suppliers}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Tier 2-3</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-purple-400">{stats.totalRelationships}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Relationships</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-red-400">{stats.highRiskRelationships}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">High Risk</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-orange-400">{stats.criticalShortages}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Crit. Shortages</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-4 text-center">
              <div className="text-2xl font-bold font-display tracking-tight text-amber-400">{stats.totalShortages}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Total Shortages</div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Risk Summary Banner */}
      {stats && stats.highRiskRelationships > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="Warning">&#9888;&#65039;</span>
            <div>
              <h3 className="font-semibold text-white">Supply Chain Risk Alert</h3>
              <p className="text-sm text-slate-300">
                {stats.highRiskRelationships} high-risk supplier relationships and {stats.criticalShortages} critical material shortages detected.
                Key dependencies include China (rare earths), Taiwan (semiconductors), and Russia (titanium).
              </p>
            </div>
            <button
              onClick={() => setActiveTab('risks')}
              className="ml-auto text-sm text-red-400 hover:text-red-300 whitespace-nowrap"
            >
              View Details &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { id: 'overview' as const, label: 'Value Chain Map', icon: '\uD83D\uDDFA\uFE0F' },
          { id: 'categories' as const, label: 'Categories', icon: '\uD83D\uDCCA' },
          { id: 'companies' as const, label: 'Companies', icon: '\uD83C\uDFE2' },
          { id: 'shortages' as const, label: 'Shortages', icon: '\u26A0\uFE0F' },
          { id: 'challenges' as const, label: 'Challenges', icon: '\uD83D\uDEA7' },
          { id: 'materials' as const, label: 'Critical Materials', icon: '\u269B\uFE0F' },
          { id: 'risks' as const, label: 'Risk Analysis', icon: '\uD83D\uDD34' },
          { id: 'bom-risks' as const, label: 'BOM Risks', icon: '\uD83D\uDCCB' },
        ] satisfies { id: TabId; label: string; icon: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
              activeTab === tab.id
                ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/50'
                : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters Bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search input - shown for companies, shortages, categories */}
          {(activeTab === 'companies' || activeTab === 'shortages' || activeTab === 'overview') && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'companies' ? 'Search companies, products, locations...' : activeTab === 'shortages' ? 'Search materials, categories...' : 'Search...'}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {(activeTab === 'overview' || activeTab === 'companies') && (
            <>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                <option value="">All Tiers</option>
                {SUPPLY_CHAIN_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                <option value="">All Countries</option>
                {Object.entries(SUPPLY_CHAIN_COUNTRIES).map(([code, info]) => (
                  <option key={code} value={code}>{info.flag} {info.name}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                <option value="">All Product Categories</option>
                {SUPPLY_CHAIN_PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </>
          )}
          {activeTab === 'shortages' && (
            <>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                <option value="">All Severities</option>
                {Object.entries(SHORTAGE_SEVERITY_INFO).map(([key, info]) => (
                  <option key={key} value={key}>{info.icon} {info.label}</option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                <option value="">All Categories</option>
                {SUPPLY_CHAIN_PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </>
          )}
          {/* BOM Risk filters are handled inside the lazy-loaded BOMRiskAnalysisTab */}
          {activeTab === 'overview' && (
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showHighRiskOnly}
                onChange={(e) => setShowHighRiskOnly(e.target.checked)}
                className="rounded bg-space-700 border-space-600 text-nebula-300 focus:ring-nebula-500"
              />
              Show high-risk only
            </label>
          )}
          <div className="ml-auto flex items-center gap-2">
            {(activeTab === 'companies' || activeTab === 'shortages') && searchQuery && (
              <span className="text-xs text-slate-400">
                {activeTab === 'companies' ? filteredCompanies.length : filteredShortages.length} results
              </span>
            )}
            {activeTab === 'companies' && (
              <ExportButton
                data={filteredCompanies}
                filename="supply-chain-companies"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'tier', label: 'Tier' },
                  { key: 'country', label: 'Country' },
                  { key: 'criticality', label: 'Criticality' },
                  { key: 'products', label: 'Products' },
                  { key: 'description', label: 'Description' },
                ]}
              />
            )}
            {activeTab === 'shortages' && (
              <ExportButton
                data={filteredShortages}
                filename="supply-shortages"
                columns={[
                  { key: 'material', label: 'Material' },
                  { key: 'category', label: 'Category' },
                  { key: 'severity', label: 'Severity' },
                  { key: 'notes', label: 'Notes' },
                  { key: 'estimatedResolution', label: 'Est. Resolution' },
                ]}
              />
            )}
            {/* BOM Risk export is handled inside the lazy-loaded BOMRiskAnalysisTab */}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
          <button
            onClick={() => fetchTabData()}
            className="mt-3 px-4 py-2 min-h-[44px] bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Overview / Value Chain Map */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <DependencyChart
                companies={filteredCompanies}
                relationships={relationships}
                selectedCompanyId={selectedCompanyId}
                onSelectCompany={setSelectedCompanyId}
                showHighRiskOnly={showHighRiskOnly}
              />

              {/* Top critical shortages */}
              <div className="card p-4">
                <h3 className="font-semibold text-white mb-4">Active Critical Shortages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shortages
                    .filter((s) => s.severity === 'critical' || s.severity === 'high')
                    .slice(0, 4)
                    .map((shortage) => (
                      <ShortageAlert key={shortage.id} shortage={shortage} />
                    ))}
                </div>
                <button
                  onClick={() => setActiveTab('shortages')}
                  className="mt-4 text-sm text-nebula-300 hover:text-nebula-200"
                >
                  View all shortages &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* Categories Tab - Key Supply Chain Categories */}
          {/* ============================================================ */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {SUPPLY_CHAIN_CATEGORIES_DETAILED.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryTab(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeCategoryTab === cat.id
                        ? `${cat.bgColor}/20 ${cat.color} border border-current`
                        : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="hidden sm:inline">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Active Category Content */}
              {(() => {
                const cat = SUPPLY_CHAIN_CATEGORIES_DETAILED.find((c) => c.id === activeCategoryTab);
                if (!cat) return null;
                return (
                  <ScrollReveal>
                    <div className="space-y-6">
                      {/* Category Header */}
                      <div className={`card p-6 border-l-4 ${cat.bgColor.replace('bg-', 'border-')}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-3xl">{cat.icon}</span>
                              <h2 className={`text-2xl font-bold font-display ${cat.color}`}>{cat.label}</h2>
                            </div>
                            <p className="text-slate-300 text-sm max-w-2xl">{cat.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-2xl font-bold ${cat.color}`}>{cat.marketSize}</div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Market Size</div>
                          </div>
                        </div>

                        {/* Key Trends */}
                        <div className="mt-4 pt-4 border-t border-space-700">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Trends</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {cat.keyTrends.map((trend, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className={`${cat.color} mt-0.5 shrink-0`}>&bull;</span>
                                {trend}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Supplier Cards */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Key Suppliers</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          {cat.suppliers.map((supplier) => {
                            const tierInfo = SUPPLY_CHAIN_TIERS.find((t) => t.value === supplier.tier);
                            return (
                              <div
                                key={supplier.name}
                                className="bg-space-800 border border-space-700 rounded-xl overflow-hidden hover:border-space-600 transition-all group"
                              >
                                {/* Supplier Header */}
                                <div className={`${cat.bgColor}/10 p-4 border-b border-space-700`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-white group-hover:text-nebula-300 transition-colors">{supplier.name}</h4>
                                    {tierInfo && (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${tierInfo.bgColor}/20 ${tierInfo.color}`}>
                                        {tierInfo.label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400">
                                    <svg className="inline w-3 h-3 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {supplier.headquarters}
                                  </p>
                                </div>

                                {/* Supplier Body */}
                                <div className="p-4 space-y-3">
                                  <p className="text-sm text-slate-300">{supplier.description}</p>

                                  {/* Key Products */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Key Products</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {supplier.keyProducts.map((product) => (
                                        <span key={product} className={`text-xs ${cat.bgColor}/10 ${cat.color} px-2 py-0.5 rounded border border-current/20`}>
                                          {product}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Notable Programs */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Notable Programs</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {supplier.notablePrograms.map((program) => (
                                        <span key={program} className="text-xs bg-space-700 text-slate-300 px-2 py-0.5 rounded">
                                          {program}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })()}
            </div>
          )}

          {/* Companies Tab */}
          {activeTab === 'companies' && (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCompanies.map((company) => (
                <StaggerItem key={company.id}>
                  <SupplyChainNode
                    company={company}
                    relationships={relationships}
                    onSelectCompany={setSelectedCompanyId}
                    allCompanies={companies}
                  />
                </StaggerItem>
              ))}
              {filteredCompanies.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    icon={<svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                    title="No suppliers found"
                    description={searchQuery ? `No companies match "${searchQuery}". Try adjusting your search.` : 'No companies match your current filters. Try adjusting your search criteria.'}
                  />
                </div>
              )}
            </StaggerContainer>
          )}

          {/* Shortages Tab */}
          {activeTab === 'shortages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredShortages.map((shortage) => (
                <ShortageAlert key={shortage.id} shortage={shortage} />
              ))}
              {filteredShortages.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl block mb-4">&#9989;</span>
                  <p className="text-slate-400">
                    {searchQuery ? `No shortages match "${searchQuery}".` : 'No shortages found matching filters.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* Challenges Tab - Supply Chain Challenges */}
          {/* ============================================================ */}
          {activeTab === 'challenges' && (
            <div className="space-y-6">
              {/* Overview Header */}
              <div className="card p-6">
                <h2 className="text-xl font-bold font-display text-white mb-2">Space Industry Supply Chain Challenges</h2>
                <p className="text-sm text-slate-300 max-w-3xl">
                  The aerospace supply chain faces unique challenges that differentiate it from commercial manufacturing.
                  Extreme reliability requirements, regulatory restrictions, and limited supplier bases create systemic risks
                  that require proactive management and strategic planning.
                </p>
              </div>

              {/* Challenge Cards */}
              <StaggerContainer className="space-y-4">
                {SUPPLY_CHAIN_CHALLENGES.map((challenge) => (
                  <StaggerItem key={challenge.id}>
                    <ChallengeCard challenge={challenge} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          )}

          {/* ============================================================ */}
          {/* Critical Materials Tab */}
          {/* ============================================================ */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              {/* Overview Header */}
              <div className="card p-6">
                <h2 className="text-xl font-bold font-display text-white mb-2">Critical Material Dependencies</h2>
                <p className="text-sm text-slate-300 max-w-3xl">
                  Space hardware depends on specialized materials with concentrated supply chains. Many critical inputs
                  have limited or no substitutes, creating strategic vulnerabilities that extend beyond individual programs
                  to national security concerns.
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-slate-400">Critical - No alternatives, concentrated supply</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="text-slate-400">High - Limited alternatives, supply at risk</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="text-slate-400">Medium - Alternatives exist but with tradeoffs</span>
                  </div>
                </div>
              </div>

              {/* Materials Grid */}
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {CRITICAL_MATERIALS.map((material) => (
                  <StaggerItem key={material.id}>
                    <MaterialCard material={material} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          )}

          {/* Risks Tab */}
          {activeTab === 'risks' && (
            <div className="space-y-6">
              {/* Geopolitical Risk Summary */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Geopolitical Risk Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* China */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">&#127464;&#127475;</span>
                      <h4 className="font-semibold text-red-400">China - High Risk</h4>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>- 90%+ rare earth processing</li>
                      <li>- 80% gallium production</li>
                      <li>- Export controls on critical materials</li>
                      <li>- Geopolitical tensions</li>
                    </ul>
                  </div>

                  {/* Taiwan */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">&#127481;&#127484;</span>
                      <h4 className="font-semibold text-yellow-400">Taiwan - Medium Risk</h4>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>- 90%+ advanced semiconductors</li>
                      <li>- TSMC critical dependency</li>
                      <li>- Cross-strait tensions</li>
                      <li>- Single point of failure</li>
                    </ul>
                  </div>

                  {/* Russia */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">&#127479;&#127482;</span>
                      <h4 className="font-semibold text-red-400">Russia - High Risk</h4>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>- 30% aerospace titanium</li>
                      <li>- Sanctions in effect</li>
                      <li>- Supply chain disruption</li>
                      <li>- Alternative sourcing needed</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* High-Risk Relationships */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">High-Risk Supply Relationships</h3>
                <div className="space-y-3">
                  {relationships
                    .filter((r) => r.geopoliticalRisk === 'high')
                    .map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{rel.supplierName}</span>
                            <span className="text-slate-400">&rarr;</span>
                            <span className="font-medium text-white">{rel.customerName}</span>
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            Products: {rel.products.join(', ').replace(/_/g, ' ')}
                          </div>
                          {rel.notes && (
                            <div className="text-sm text-red-400 mt-1">&#9888;&#65039; {rel.notes}</div>
                          )}
                        </div>
                        {rel.annualValue && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-400">
                              ${(rel.annualValue / 1000000).toFixed(0)}M/yr
                            </div>
                            <div className="text-xs text-slate-400">Annual value</div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Critical Shortages */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Critical Material Shortages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shortages
                    .filter((s) => s.severity === 'critical')
                    .map((shortage) => (
                      <ShortageAlert key={shortage.id} shortage={shortage} isExpanded />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* BOM Risk Analysis Tab (lazy-loaded) */}
          {activeTab === 'bom-risks' && <BOMRiskAnalysisTab />}
        </>
      )}
    </>
  );
}

// ============================================================
// Challenge Card Component
// ============================================================

function ChallengeCard({ challenge }: { challenge: SupplyChainChallenge }) {
  const [expanded, setExpanded] = useState(false);

  const severityColors = {
    critical: { border: 'border-red-500/50', bg: 'bg-red-500/5', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
    high: { border: 'border-orange-500/50', bg: 'bg-orange-500/5', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
    medium: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/5', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  };

  const colors = severityColors[challenge.severity];

  return (
    <div className={`border-2 rounded-xl transition-all duration-200 ${colors.border} ${colors.bg} hover:shadow-lg`}>
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{challenge.icon}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                {challenge.severity.toUpperCase()}
              </span>
            </div>
            <h3 className="font-semibold text-white text-lg">{challenge.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{challenge.description}</p>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-space-700 p-5 space-y-4">
          {/* Impacts */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Impacts</h4>
            <ul className="space-y-2">
              {challenge.impacts.map((impact, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className={`${colors.text} shrink-0 mt-0.5`}>&#8226;</span>
                  {impact}
                </li>
              ))}
            </ul>
          </div>

          {/* Mitigations */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mitigation Strategies</h4>
            <ul className="space-y-2">
              {challenge.mitigations.map((mitigation, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400 shrink-0 mt-0.5">&#10003;</span>
                  {mitigation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Material Card Component
// ============================================================

function MaterialCard({ material }: { material: CriticalMaterial }) {
  const [expanded, setExpanded] = useState(false);

  const riskColors = {
    critical: { border: 'border-red-500/50', bg: 'bg-red-500/5', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400', dot: 'bg-red-500' },
    high: { border: 'border-orange-500/50', bg: 'bg-orange-500/5', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400', dot: 'bg-orange-500' },
    medium: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/5', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-500' },
  };

  const substitutabilityInfo = {
    none: { label: 'No Substitutes', color: 'text-red-400', bg: 'bg-red-500/20' },
    limited: { label: 'Limited Substitutes', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    moderate: { label: 'Moderate Substitutes', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  };

  const colors = riskColors[material.riskLevel];
  const subInfo = substitutabilityInfo[material.substitutability];

  return (
    <div className={`border-2 rounded-xl transition-all duration-200 ${colors.border} ${colors.bg} hover:shadow-lg`}>
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{material.icon}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                {material.riskLevel.toUpperCase()}
              </span>
              <span className="text-xs bg-space-700 text-slate-300 px-2 py-0.5 rounded">{material.category}</span>
            </div>
            <h3 className="font-semibold text-white">{material.name}</h3>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{material.supplyRisk}</p>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className={`text-xs px-2 py-0.5 rounded ${subInfo.bg} ${subInfo.color}`}>
                {subInfo.label}
              </span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">{material.primarySources.length}</span> primary sources
              </span>
              <span className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">{material.spaceApplications.length}</span> applications
              </span>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-space-700 p-5 space-y-4">
          {/* Primary Sources */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Primary Sources</h4>
            <div className="flex flex-wrap gap-1.5">
              {material.primarySources.map((source) => (
                <span key={source} className="text-xs bg-space-700 text-slate-300 px-2 py-1 rounded border border-space-600">
                  {source}
                </span>
              ))}
            </div>
          </div>

          {/* Space Applications */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Space Applications</h4>
            <div className="flex flex-wrap gap-1.5">
              {material.spaceApplications.map((app) => (
                <span key={app} className={`text-xs ${colors.bg} ${colors.text} px-2 py-1 rounded border border-current/20`}>
                  {app}
                </span>
              ))}
            </div>
          </div>

          {/* Full Risk Analysis */}
          <div className="pt-2 border-t border-space-700">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Supply Risk Analysis</h4>
            <p className="text-sm text-slate-300">{material.supplyRisk}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Page Export
// ============================================================

export default function SupplyChainPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Global Supply Chain"
          subtitle="Aerospace supply chain tracking with geopolitical risk analysis"
          icon="\uD83D\uDD17"
          accentColor="cyan"
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            &larr; Back to Dashboard
          </Link>
        </AnimatedPageHeader>

        <PremiumGate requiredTier="pro">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <SupplyChainContent />
          </Suspense>
        </PremiumGate>
      </div>

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Business Opportunities', description: 'Contracts and procurement opportunities', href: '/business-opportunities', icon: '📋' },
              { name: 'Marketplace', description: 'Find space service providers', href: '/marketplace', icon: '🏪' },
              { name: 'Space Manufacturing', description: 'In-space and terrestrial manufacturing', href: '/space-manufacturing', icon: '🏭' },
              { name: 'Supply Chain Risk', description: 'Risk assessment and mitigation strategies', href: '/supply-chain-risk', icon: '⚠️' },
                ]}
              />
            </ScrollReveal>

    </div>
  );
}
