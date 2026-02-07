'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'overview' | 'companies' | 'iss-lab' | 'products';

interface ManufacturingCompany {
  id: string;
  name: string;
  hq: string;
  founded: number;
  ticker: string | null;
  funding: string;
  trl: number;
  technologyFocus: string;
  keyProducts: string[];
  status: 'operational' | 'development' | 'pre-revenue' | 'concept';
  milestones: string[];
  description: string;
  website: string;
}

interface ISSExperimentCategory {
  name: string;
  icon: string;
  count: number;
  color: string;
  description: string;
  keyResults: string[];
}

interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  marketPotential: string;
  trl: number;
  timeToMarket: string;
  keyAdvantage: string;
  competitiveLandscape: string;
  leaders: string[];
  description: string;
}

interface MarketProjection {
  year: number;
  low: number;
  mid: number;
  high: number;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const COMPANIES: ManufacturingCompany[] = [
  {
    id: 'varda',
    name: 'Varda Space Industries',
    hq: 'El Segundo, CA',
    founded: 2020,
    ticker: null,
    funding: '$150M+ (Series B)',
    trl: 7,
    technologyFocus: 'Pharmaceutical crystallization & materials processing in microgravity',
    keyProducts: ['W-Series re-entry capsule', 'Microgravity drug crystallization', 'Ritonavir crystal polymorphs'],
    status: 'operational',
    milestones: [
      'W-1 capsule: successful re-entry and recovery (Feb 2024)',
      'W-2 capsule: second successful re-entry mission (2024)',
      'Demonstrated improved pharmaceutical crystal forms in microgravity',
      'FAA re-entry license obtained after extended regulatory process',
      'Partnership with US Air Force for hypersonic re-entry data',
    ],
    description: 'Varda Space Industries is the leading in-space pharmaceutical manufacturing company. Their W-Series autonomous capsules are launched as secondary payloads on Rocket Lab Electron and SpaceX rideshares, process drug compounds in microgravity orbit, then de-orbit and land for recovery. The W-1 mission successfully produced ritonavir crystals with a superior polymorph form not achievable on Earth. W-2 demonstrated repeatable manufacturing capability.',
    website: 'https://varda.com',
  },
  {
    id: 'redwire',
    name: 'Redwire Corporation',
    hq: 'Jacksonville, FL',
    founded: 2020,
    ticker: 'RDW',
    funding: 'Public (NYSE)',
    trl: 8,
    technologyFocus: 'ISS-based manufacturing: ZBLAN fiber optics, ceramics, bioprinting, deployable structures',
    keyProducts: ['ZBLAN fiber optic cable', 'Ceramic manufacturing facility', '3D BioFabrication Facility', 'ROSA solar arrays'],
    status: 'operational',
    milestones: [
      'Multiple ZBLAN fiber optic draws on ISS with improving quality',
      'Ceramic Manufacturing Module operational on ISS since 2023',
      'BioFabrication Facility printed human tissue constructs in orbit',
      'Awarded NASA contracts for in-space manufacturing research',
      'Revenue of ~$300M+ annually across all space infrastructure segments',
    ],
    description: 'Redwire Corporation (NYSE: RDW) is the most diversified in-space manufacturing company, operating multiple production facilities aboard the International Space Station. Their ZBLAN fiber optic production has demonstrated exotic glass fibers with dramatically lower signal loss than terrestrial equivalents. The 3D BioFabrication Facility, developed in partnership with Uniformed Services University, has printed meniscus tissue and cardiac tissue constructs in microgravity.',
    website: 'https://redwirespace.com',
  },
  {
    id: 'space-forge',
    name: 'Space Forge',
    hq: 'Cardiff, Wales, UK',
    founded: 2018,
    ticker: null,
    funding: '~$15M (Series A)',
    trl: 5,
    technologyFocus: 'Semiconductor & advanced alloy manufacturing in space using returnable satellite platform',
    keyProducts: ['ForgeStar returnable satellite', 'Space-grown semiconductor wafers', 'Superalloy production'],
    status: 'development',
    milestones: [
      'ForgeStar-0 test mission launched (2022, lost during deployment)',
      'ForgeStar-1 mission in preparation with improved design',
      'UK Space Agency grant recipient for in-space manufacturing R&D',
      'Developing returnable satellite platform for repeated manufacturing runs',
    ],
    description: 'Space Forge is developing the ForgeStar platform, a returnable and reusable satellite designed for manufacturing semiconductors and advanced alloys in the microgravity and vacuum of space. Their approach focuses on materials that benefit from the unique space environment -- superior crystal structures for semiconductors, high-purity alloys free from container contamination, and novel metamaterials impossible to create under gravity.',
    website: 'https://spaceforge.com',
  },
  {
    id: 'gitai',
    name: 'GITAI',
    hq: 'Torrance, CA / Tokyo, Japan',
    founded: 2016,
    ticker: null,
    funding: '~$75M+',
    trl: 6,
    technologyFocus: 'Robotic assembly, manufacturing, and servicing in space',
    keyProducts: ['GITAI S2 robotic arm', 'Autonomous assembly robots', 'In-space construction robotics'],
    status: 'development',
    milestones: [
      'S2 robotic arm successfully demonstrated on ISS (2023)',
      'Completed autonomous panel assembly tasks in orbit',
      'Demonstrated dexterous manipulation in microgravity',
      'Contracts with JAXA and NASA for robotic assembly R&D',
      'Developing lunar surface construction robotics',
    ],
    description: 'GITAI is building general-purpose robotic workers for space. Their S2 robotic arm was demonstrated aboard the International Space Station, successfully performing autonomous assembly and panel installation tasks. The company envisions a fleet of robots performing construction, manufacturing, maintenance, and servicing tasks in orbit and on planetary surfaces, enabling large-scale space infrastructure without requiring extensive human EVA time.',
    website: 'https://gitai.tech',
  },
  {
    id: 'axiom',
    name: 'Axiom Space',
    hq: 'Houston, TX',
    founded: 2016,
    ticker: null,
    funding: '$500M+',
    trl: 7,
    technologyFocus: 'Commercial space station with integrated research & manufacturing capabilities',
    keyProducts: ['Axiom Station modules', 'ISS commercial missions (Ax-1 through Ax-4)', 'NASA spacesuit (AxEMU)'],
    status: 'operational',
    milestones: [
      'Ax-1: First all-private mission to ISS (Apr 2022)',
      'Ax-2: Second private mission with ESA participation (May 2023)',
      'Ax-3: Third mission with international crew (Jan 2024)',
      'Ax-4 mission planned for 2025',
      'First Axiom Station module targeting 2026 launch to ISS',
      'Manufacturing capabilities planned for standalone station phase',
    ],
    description: 'Axiom Space is building the world\'s first commercial space station, initially as modules attached to the ISS before detaching as a free-flying station. Their completed Ax-1, Ax-2, and Ax-3 private astronaut missions have included microgravity research payloads. The future standalone Axiom Station will include dedicated manufacturing bays for pharmaceutical production, advanced materials processing, and bioprinting at commercial scale.',
    website: 'https://axiomspace.com',
  },
  {
    id: 'vast',
    name: 'Vast',
    hq: 'Long Beach, CA',
    founded: 2021,
    ticker: null,
    funding: '$300M+ (Series A)',
    trl: 5,
    technologyFocus: 'Artificial gravity space station with integrated manufacturing capabilities',
    keyProducts: ['Haven-1 single-module station', 'Haven-2 expandable station', 'Artificial gravity research platform'],
    status: 'development',
    milestones: [
      'Haven-1 targeting 2025-2026 launch on Falcon 9',
      'SpaceX Crew Dragon selected for crew transport',
      'Developing artificial gravity spin capabilities for later stations',
      'Manufacturing research partnerships announced',
      'Founded by Jed McCaleb (co-founder of Stellar, Ripple)',
    ],
    description: 'Vast is developing Haven-1, a single-module commercial space station planned for launch in the 2025-2026 timeframe aboard a SpaceX Falcon 9, with crew transported via Crew Dragon. The company\'s longer-term vision includes larger stations with artificial gravity capability, which would enable a new class of manufacturing processes that benefit from controlled partial gravity rather than pure microgravity or full Earth gravity.',
    website: 'https://vastspace.com',
  },
  {
    id: 'sierra-space',
    name: 'Sierra Space',
    hq: 'Louisville, CO',
    founded: 2021,
    ticker: null,
    funding: '$1.5B+ valuation',
    trl: 6,
    technologyFocus: 'Large-scale inflatable habitat (LIFE) with integrated manufacturing and research volume',
    keyProducts: ['LIFE habitat', 'Dream Chaser spaceplane', 'Shooting Star cargo module'],
    status: 'development',
    milestones: [
      'LIFE habitat passed NASA full-scale burst test (exceeding ISS pressure requirements)',
      'Dream Chaser first flight targeting 2025 (cargo resupply to ISS)',
      'LIFE provides 3x volume of traditional rigid modules',
      'Orbital Reef partnership with Blue Origin for commercial station',
      'Spinning off from Sierra Nevada Corporation',
    ],
    description: 'Sierra Space is developing the Large Integrated Flexible Environment (LIFE) habitat, an inflatable space module that provides approximately three times the volume of traditional rigid modules at a fraction of the launch mass. LIFE successfully completed a NASA full-scale burst test, proving its structural integrity at pressures exceeding ISS requirements. The habitat is a key component of the Orbital Reef commercial space station (partnered with Blue Origin), designed to support manufacturing, research, and tourism.',
    website: 'https://sierraspace.com',
  },
  {
    id: 'nanoracks',
    name: 'Nanoracks (Voyager Space)',
    hq: 'Houston, TX',
    founded: 2009,
    ticker: null,
    funding: 'Acquired by Voyager Space',
    trl: 8,
    technologyFocus: 'ISS commercial airlock, satellite deployment, and in-space services',
    keyProducts: ['Bishop Airlock', 'CubeSat deployers', 'Outpost Mars habitat', 'StarLab commercial station'],
    status: 'operational',
    milestones: [
      'Bishop Airlock: first commercial airlock on ISS (installed 2020)',
      '1,800+ payloads deployed or hosted to date',
      'Over 400 small satellites deployed from ISS via Nanoracks deployers',
      'StarLab commercial station development underway with Lockheed Martin & Airbus',
      'Multiple manufacturing experiment hosting missions completed',
    ],
    description: 'Nanoracks, now part of Voyager Space, operates the Bishop Airlock on the ISS -- the station\'s first commercially developed and funded airlock. Bishop enables rapid deployment of experiments, CubeSats, and external payloads to the space environment. With over 1,800 payloads processed and 400+ satellites deployed, Nanoracks has been the primary commercial gateway to ISS manufacturing and research. StarLab, their next-generation commercial station being developed with Lockheed Martin and Airbus, will include dedicated manufacturing facilities.',
    website: 'https://nanoracks.com',
  },
  {
    id: 'orbital-assembly',
    name: 'Orbital Assembly',
    hq: 'Fontana, CA',
    founded: 2019,
    ticker: null,
    funding: '~$10M',
    trl: 3,
    technologyFocus: 'Large-scale orbital construction and artificial gravity structures',
    keyProducts: ['Pioneer Station (gravity ring demonstrator)', 'Voyager Station concept', 'DSTAR robotic truss assembly'],
    status: 'concept',
    milestones: [
      'DSTAR prototype: autonomous truss assembly demonstrated in 1-g environment',
      'Pioneer Station design completed (partial gravity ring for R&D)',
      'Voyager Station: larger rotating habitat concept for future development',
      'Exploring manufacturing applications in controlled partial gravity',
    ],
    description: 'Orbital Assembly is designing large rotating structures that generate artificial gravity through centripetal force. Their Pioneer Station concept is a smaller demonstrator featuring a gravity ring that could provide variable gravity levels for manufacturing research. The company\'s DSTAR (Demonstrator Structural Truss Assembly Robot) has been tested for autonomous truss construction. While still early-stage, the ability to manufacture in controlled partial gravity opens unique possibilities for processes that benefit from some gravity but not Earth\'s full 1g.',
    website: 'https://orbitalassembly.com',
  },
  {
    id: 'made-in-space',
    name: 'Made In Space (Redwire)',
    hq: 'Jacksonville, FL',
    founded: 2010,
    ticker: 'RDW',
    funding: 'Acquired by Redwire (2020)',
    trl: 9,
    technologyFocus: 'Additive manufacturing (3D printing) in microgravity, fiber optics production',
    keyProducts: ['Additive Manufacturing Facility (AMF)', 'Turbine Ceramic Manufacturing Module', 'Archinaut orbital manufacturing'],
    status: 'operational',
    milestones: [
      'First 3D printer on ISS (2014) -- printed first object manufactured in space',
      'Additive Manufacturing Facility: operational on ISS since 2016, printed 200+ parts',
      'Manufactured first tool printed in space from ground command',
      'Archinaut program: demonstrated large-scale autonomous manufacturing and assembly',
      'Acquired by Redwire in 2020, technologies integrated into Redwire portfolio',
    ],
    description: 'Made In Space (now part of Redwire) pioneered additive manufacturing in orbit with the first 3D printer aboard the ISS in 2014. Their Additive Manufacturing Facility (AMF) has produced over 200 parts in space, including tools, medical devices, and structural components. The Archinaut program demonstrated the ability to autonomously manufacture and assemble large structures in orbit. These foundational technologies proved that reliable, repeatable manufacturing in microgravity is viable.',
    website: 'https://redwirespace.com',
  },
  {
    id: 'spacepharma',
    name: 'SpacePharma',
    hq: 'Herzliya, Israel / Courgenay, Switzerland',
    founded: 2012,
    ticker: null,
    funding: '~$25M',
    trl: 7,
    technologyFocus: 'Miniaturized microgravity lab platforms for pharmaceutical and biotech R&D',
    keyProducts: ['DIDO miniaturized lab platform', 'Remote-controlled microgravity experiments', 'CubeSat-scale pharma labs'],
    status: 'operational',
    milestones: [
      'Multiple DIDO platform missions flown on ISS and standalone satellites',
      'Remotely conducted pharmaceutical crystallization experiments in orbit',
      'Partnerships with major pharmaceutical companies for drug development R&D',
      'Demonstrated autonomous experiment control from ground stations',
    ],
    description: 'SpacePharma operates miniaturized laboratory platforms that enable pharmaceutical and biotechnology companies to conduct microgravity experiments without requiring dedicated spacecraft. Their DIDO platform can fly as an ISS payload or integrated into a CubeSat-class satellite, offering remote-controlled experiment capabilities. Multiple major pharmaceutical companies have used SpacePharma\'s systems to investigate drug crystallization, protein behavior, and bioprocessing in microgravity.',
    website: 'https://spacepharma.com',
  },
  {
    id: 'yuri',
    name: 'yuri',
    hq: 'Meckenbeuren, Germany',
    founded: 2019,
    ticker: null,
    funding: '~$10M',
    trl: 6,
    technologyFocus: 'Biotech and pharmaceutical microgravity research services',
    keyProducts: ['yuri microgravity lab kits', 'Stem cell research in space', 'Bioprinting payloads'],
    status: 'development',
    milestones: [
      'Multiple payload missions to ISS via various launch providers',
      'Stem cell differentiation experiments in microgravity',
      'Partnerships with European pharmaceutical and biotech firms',
      'Developing standardized microgravity experiment hardware',
    ],
    description: 'yuri provides turnkey microgravity research services for biotechnology and pharmaceutical companies, focusing on the European market. Their standardized lab kits simplify the process of conducting experiments in space, handling hardware development, launch integration, and data analysis. Key research areas include stem cell biology, tissue engineering, protein crystallization, and drug formulation optimization in microgravity.',
    website: 'https://yurigravity.com',
  },
];

const ISS_EXPERIMENT_CATEGORIES: ISSExperimentCategory[] = [
  {
    name: 'Materials Science',
    icon: '🔬',
    count: 420,
    color: 'text-blue-400',
    description: 'Crystal growth, metal alloys, composites, ceramics, and optical fiber production in microgravity',
    keyResults: [
      'ZBLAN fiber optics with 10-100x lower signal loss than terrestrial equivalents',
      'Superior semiconductor crystal growth with fewer defects',
      'Novel metal alloy compositions impossible to mix under gravity',
      'Ceramic sintering at lower temperatures in microgravity',
      'Improved aerogel production with more uniform pore structures',
    ],
  },
  {
    name: 'Pharmaceutical & Biotech',
    icon: '💊',
    count: 380,
    color: 'text-green-400',
    description: 'Drug crystallization, protein crystallography, tissue engineering, and bioprocessing',
    keyResults: [
      'Protein crystals grown 10-100x larger than on Earth for structural analysis',
      'Ritonavir (HIV drug) crystal polymorph with improved bioavailability (Varda)',
      'Monoclonal antibody formulation improvements in microgravity',
      'Stem cell expansion and differentiation enhanced in microgravity',
      'Organ-on-chip models showing more realistic behavior in space',
    ],
  },
  {
    name: 'Bioprinting & Tissue Engineering',
    icon: '🧬',
    count: 85,
    color: 'text-purple-400',
    description: '3D printing of human tissues, organs, and biological structures in microgravity',
    keyResults: [
      'First human cardiac tissue constructs bioprinted in orbit (Redwire BFF)',
      'Meniscus tissue printed without scaffolding support (microgravity advantage)',
      'Retinal tissue organoids grown in microgravity showed improved structure',
      'Bone tissue constructs with improved mineralization in space',
    ],
  },
  {
    name: 'Technology Demonstrations',
    icon: '🛠️',
    count: 310,
    color: 'text-orange-400',
    description: 'Additive manufacturing, robotic assembly, thermal management, and process validation',
    keyResults: [
      'Over 200 3D-printed parts produced by AMF on ISS',
      'First tool manufactured in space from ground command (2014)',
      'GITAI S2 robotic arm autonomous assembly demonstration',
      'Fiber optic cable draws with production-grade quality achieved',
      'Bishop Airlock enabling rapid commercial payload deployment',
    ],
  },
  {
    name: 'Earth & Space Science',
    icon: '🌍',
    count: 520,
    color: 'text-cyan-400',
    description: 'Combustion science, fluid dynamics, fundamental physics, and Earth observation',
    keyResults: [
      'Cool flames discovery -- combustion at temperatures previously thought impossible',
      'Capillary flow experiments informing fuel tank and life support design',
      'Colloid studies revealing self-assembly patterns for nanomaterial production',
    ],
  },
  {
    name: 'Human Research',
    icon: '👨\u200D🚀',
    count: 350,
    color: 'text-red-400',
    description: 'Human physiology, radiation biology, countermeasures, and medical technology',
    keyResults: [
      'Telomere lengthening and gene expression changes documented (Twins Study)',
      'Bone density loss countermeasures developed and validated',
      'Immune system changes characterized for long-duration missions',
    ],
  },
];

const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'zblan',
    name: 'ZBLAN Fiber Optics',
    icon: '🔮',
    marketPotential: '$1.5B-$5B/year',
    trl: 7,
    timeToMarket: '2026-2028',
    keyAdvantage: '10-100x lower signal loss than silica fibers, enabling longer repeater-less spans',
    competitiveLandscape: 'Redwire (lead), FOMS Inc., Thorlabs (terrestrial competitor). Space-produced ZBLAN has demonstrated dramatically superior optical properties.',
    leaders: ['Redwire', 'FOMS Inc.', 'Flawless Photonics'],
    description: 'ZBLAN (ZrF4-BaF2-LaF3-AlF3-NaF) is a fluoride glass that, when drawn into fiber in microgravity, avoids the crystallization defects that plague terrestrial production. Space-produced ZBLAN fibers have demonstrated attenuation rates 10-100x lower than Earth-made equivalents, potentially revolutionizing long-haul telecommunications, undersea cables, and specialized sensing applications. At $1M+/km for specialty fiber applications, even small production quantities can be commercially viable.',
  },
  {
    id: 'pharma',
    name: 'Pharmaceutical Crystallization',
    icon: '💊',
    marketPotential: '$500M-$2B/year',
    trl: 7,
    timeToMarket: '2025-2027',
    keyAdvantage: 'Access to superior crystal polymorphs, improved drug formulation, enhanced bioavailability',
    competitiveLandscape: 'Varda Space Industries (lead), SpacePharma, yuri, Merck (pharma partner). First-mover advantage with FDA pathway being established.',
    leaders: ['Varda Space Industries', 'SpacePharma', 'yuri'],
    description: 'Microgravity enables crystal growth free from sedimentation and convection, producing larger, more uniform crystals and access to polymorphic forms not achievable on Earth. Varda\'s W-1 mission demonstrated production of ritonavir in a crystal form with potentially improved bioavailability. The pharmaceutical industry invests $150B+ annually in R&D, and even incremental improvements in drug formulation can be worth billions.',
  },
  {
    id: 'bioprinting',
    name: 'Bioprinting & Tissue Engineering',
    icon: '🧬',
    marketPotential: '$2B-$8B/year (long-term)',
    trl: 5,
    timeToMarket: '2028-2032',
    keyAdvantage: 'Microgravity enables scaffold-free 3D printing of complex tissues without gravitational collapse',
    competitiveLandscape: 'Redwire/BFF (ISS operational), Techshot (bioprinting), academic partnerships. Early-stage but transformative potential.',
    leaders: ['Redwire (3D BioFabrication Facility)', 'Techshot', 'nScrypt'],
    description: 'In microgravity, bioprinted tissue constructs maintain their 3D structure without requiring artificial scaffolding, as soft tissues do not collapse under their own weight. This enables printing of complex vascularized structures, functional organ tissues, and patient-specific implants. Redwire\'s BFF has successfully printed cardiac and meniscus tissue in orbit. Long-term, this could address the organ transplant shortage ($30B+ market) and revolutionize regenerative medicine.',
  },
  {
    id: 'semiconductors',
    name: 'Semiconductor Wafers',
    icon: '🔌',
    marketPotential: '$800M-$3B/year',
    trl: 4,
    timeToMarket: '2028-2032',
    keyAdvantage: 'Defect-free crystal growth, novel doping profiles, superior carrier mobility',
    competitiveLandscape: 'Space Forge (lead), academic programs (InGaAs, GaAs wafer growth). Very early commercial stage.',
    leaders: ['Space Forge', 'Various university programs'],
    description: 'Semiconductor crystals grown in microgravity exhibit fewer defects, more uniform doping distribution, and superior electrical properties compared to terrestrial Czochralski or Bridgman growth. Gallium arsenide (GaAs) and indium gallium arsenide (InGaAs) wafers for high-power RF, photovoltaic, and optoelectronic applications are the primary targets. Space Forge is developing the ForgeStar returnable satellite platform specifically for semiconductor production, though the technology remains in early development.',
  },
  {
    id: 'alloys',
    name: 'Advanced Alloys & Superalloys',
    icon: '🔩',
    marketPotential: '$200M-$1B/year',
    trl: 4,
    timeToMarket: '2029-2033',
    keyAdvantage: 'Containerless processing, immiscible metal mixing, novel phase structures',
    competitiveLandscape: 'Space Forge, ISS experiments (NASA/ESA), Redwire Ceramic Manufacturing Module. Primarily research stage.',
    leaders: ['Space Forge', 'Redwire', 'NASA/ESA research programs'],
    description: 'Microgravity enables containerless processing (electromagnetic or acoustic levitation) of metals, eliminating contamination from crucible walls. It also allows mixing of metals that separate under gravity due to density differences (immiscible alloys), creating novel materials with unique properties. Applications include high-temperature turbine blades, radiation shielding, biocompatible implant materials, and ultra-high-strength structural components.',
  },
  {
    id: 'optical',
    name: 'Optical Components & Crystals',
    icon: '🔭',
    marketPotential: '$300M-$1.5B/year',
    trl: 5,
    timeToMarket: '2027-2030',
    keyAdvantage: 'Larger, higher-purity crystals with superior optical properties for lasers, sensors, and telecommunications',
    competitiveLandscape: 'Redwire, SpacePharma (protein crystals), university programs. Protein crystallography already commercial via ISS.',
    leaders: ['Redwire', 'SpacePharma', 'Various university labs'],
    description: 'Microgravity crystal growth produces larger, more uniform optical crystals with fewer defects for applications in laser systems, infrared sensors, and nonlinear optical devices. Protein crystallography in space has already demonstrated commercial value, with structures of pharmaceutical targets solved at higher resolution than ground-based methods. The market for specialized optical components, including for defense and telecommunications, continues to grow rapidly.',
  },
];

const MARKET_PROJECTIONS: MarketProjection[] = [
  { year: 2024, low: 1.2, mid: 1.8, high: 2.5 },
  { year: 2026, low: 2.0, mid: 3.5, high: 5.0 },
  { year: 2028, low: 4.0, mid: 7.0, high: 12.0 },
  { year: 2030, low: 8.0, mid: 15.0, high: 28.0 },
  { year: 2032, low: 15.0, mid: 30.0, high: 55.0 },
  { year: 2035, low: 30.0, mid: 60.0, high: 120.0 },
];

const STATUS_STYLES: Record<ManufacturingCompany['status'], { label: string; color: string; bg: string }> = {
  operational: { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/30' },
  development: { label: 'In Development', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  'pre-revenue': { label: 'Pre-Revenue', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  concept: { label: 'Concept', color: 'text-purple-400', bg: 'bg-purple-900/30' },
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏭' },
  { id: 'companies', label: 'Companies', icon: '🏢' },
  { id: 'iss-lab', label: 'ISS Lab', icon: '🧪' },
  { id: 'products', label: 'Products & Markets', icon: '📦' },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function getTRLColor(trl: number): string {
  if (trl >= 8) return 'text-green-400';
  if (trl >= 6) return 'text-yellow-400';
  if (trl >= 4) return 'text-orange-400';
  return 'text-red-400';
}

function getTRLLabel(trl: number): string {
  if (trl >= 9) return 'Flight Proven';
  if (trl >= 7) return 'Prototype Demonstrated';
  if (trl >= 5) return 'Validated in Space';
  if (trl >= 3) return 'Proof of Concept';
  return 'Basic Research';
}

function formatMarketValue(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}T`;
  if (value >= 1) return `$${value.toFixed(0)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function OverviewTab() {
  const totalExperiments = ISS_EXPERIMENT_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0);
  const operationalCompanies = COMPANIES.filter(c => c.status === 'operational').length;

  const keyStats = [
    { label: 'Market Size (2030 est.)', value: '$15B+', icon: '📈', sub: 'Mid-range projection' },
    { label: 'Active Companies', value: `${COMPANIES.length}+`, icon: '🏢', sub: `${operationalCompanies} operational` },
    { label: 'ISS Experiments', value: `${totalExperiments.toLocaleString()}+`, icon: '🧪', sub: 'Across all categories' },
    { label: 'Product Categories', value: `${PRODUCT_CATEGORIES.length}`, icon: '📦', sub: 'Active market segments' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {keyStats.map((stat) => (
          <div key={stat.label} className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
                <div className="text-white font-bold text-xl">{stat.value}</div>
                <div className="text-star-400 text-xs">{stat.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Landscape Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🌐</span>
          In-Space Manufacturing Landscape
        </h2>
        <div className="space-y-4 text-star-300 leading-relaxed">
          <p>
            <span className="text-white font-semibold">In-space manufacturing</span> represents one of the most
            transformative emerging sectors of the space economy. By leveraging the unique properties of the space
            environment -- <span className="text-nebula-400">microgravity</span>, <span className="text-nebula-400">ultra-vacuum</span>,
            and <span className="text-nebula-400">extreme temperature differentials</span> -- companies are producing
            materials and products impossible or impractical to manufacture on Earth.
          </p>
          <p>
            The sector has moved from pure research to early commercial operations. Varda Space Industries has
            completed two successful autonomous manufacturing and re-entry missions (W-1 and W-2), demonstrating
            pharmaceutical production in orbit. Redwire Corporation operates multiple manufacturing facilities on the
            ISS, producing ZBLAN fiber optics and bioprinted tissue constructs. These milestones mark the transition
            from technology demonstration to genuine commercial activity.
          </p>
          <p>
            Market projections vary widely but consensus estimates place the in-space manufacturing market at
            <span className="text-white font-semibold"> $10-30 billion by 2030</span>, growing to potentially
            <span className="text-white font-semibold"> $50-120 billion by 2035</span> as commercial space stations
            come online and launch costs continue to decrease. The ISS National Lab has hosted over{' '}
            <span className="text-white font-semibold">{totalExperiments.toLocaleString()} experiments</span> across
            materials science, pharmaceuticals, biotech, and technology demonstrations, building the knowledge base
            for commercial-scale production.
          </p>
        </div>
      </div>

      {/* Market Projection Chart */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📈</span>
          Market Growth Projections
        </h2>
        <p className="text-star-300 text-sm mb-6">
          In-space manufacturing market size estimates (billions USD). Range reflects varying assumptions about
          launch cost reduction, commercial station availability, and product market penetration.
        </p>
        <div className="space-y-3">
          {MARKET_PROJECTIONS.map((proj) => {
            const maxVal = 120;
            return (
              <div key={proj.year} className="flex items-center gap-4">
                <span className="text-star-300 text-sm font-mono w-12">{proj.year}</span>
                <div className="flex-1 relative h-8">
                  {/* High range */}
                  <div
                    className="absolute inset-y-0 left-0 bg-nebula-500/10 rounded"
                    style={{ width: `${(proj.high / maxVal) * 100}%` }}
                  />
                  {/* Mid range */}
                  <div
                    className="absolute inset-y-0 left-0 bg-nebula-500/25 rounded"
                    style={{ width: `${(proj.mid / maxVal) * 100}%` }}
                  />
                  {/* Low range */}
                  <div
                    className="absolute inset-y-0 left-0 bg-nebula-500/50 rounded"
                    style={{ width: `${(proj.low / maxVal) * 100}%` }}
                  />
                  <div className="absolute inset-y-0 flex items-center pl-2">
                    <span className="text-white text-xs font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {formatMarketValue(proj.low)} - {formatMarketValue(proj.high)}
                    </span>
                  </div>
                </div>
                <span className="text-nebula-400 text-sm font-semibold w-16 text-right">{formatMarketValue(proj.mid)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 mt-4 text-xs text-star-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-nebula-500/50" /> Conservative
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-nebula-500/25" /> Mid-range
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-nebula-500/10" /> Optimistic
          </span>
        </div>
      </div>

      {/* Key Product Categories Quick View */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🔬</span>
          Key Product Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCT_CATEGORIES.slice(0, 6).map((product) => (
            <div key={product.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{product.icon}</span>
                <h3 className="text-white font-semibold text-sm">{product.name}</h3>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-semibold text-sm">{product.marketPotential}</span>
                <span className={`text-xs font-medium ${getTRLColor(product.trl)}`}>TRL {product.trl}</span>
              </div>
              <p className="text-star-400 text-xs">{product.timeToMarket} timeline</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Enablers */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🚀</span>
          Key Market Enablers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Declining Launch Costs',
              description: 'SpaceX Falcon 9 rideshare at ~$5,500/kg to LEO, with Starship promising $200-500/kg. Lower launch costs make manufacturing economics viable for more product categories.',
              metric: '$5,500/kg',
              metricLabel: 'Current LEO cost',
            },
            {
              title: 'Commercial Space Stations',
              description: 'Axiom Station, Orbital Reef (Blue Origin/Sierra Space), StarLab (Voyager/Nanoracks), and Vast Haven-1 will provide dedicated manufacturing volume post-ISS retirement.',
              metric: '4+',
              metricLabel: 'Stations planned',
            },
            {
              title: 'Returnable Capsule Technology',
              description: 'Varda W-Series, Space Forge ForgeStar, and Dragon cargo demonstrate the ability to return manufactured goods to Earth affordably and reliably.',
              metric: '3',
              metricLabel: 'Active capsule programs',
            },
            {
              title: 'Robotic Automation',
              description: 'GITAI, Canadarm3, and other robotic systems enable autonomous manufacturing without constant crew supervision, dramatically reducing operational costs.',
              metric: '24/7',
              metricLabel: 'Autonomous operation',
            },
          ].map((enabler) => (
            <div key={enabler.title} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-semibold">{enabler.title}</h3>
                <div className="text-right">
                  <div className="text-nebula-400 font-bold text-lg">{enabler.metric}</div>
                  <div className="text-star-400 text-xs">{enabler.metricLabel}</div>
                </div>
              </div>
              <p className="text-star-300 text-sm leading-relaxed">{enabler.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompaniesTab() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'trl' | 'founded'>('trl');

  const statuses = Array.from(new Set(COMPANIES.map(c => c.status)));

  const filteredCompanies = COMPANIES
    .filter(c => !statusFilter || c.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'trl') return b.trl - a.trl;
      if (sortBy === 'founded') return a.founded - b.founded;
      return a.name.localeCompare(b.name);
    });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-star-300 text-sm rounded-lg px-3 py-2 focus:ring-nebula-500 focus:border-nebula-500"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{STATUS_STYLES[s as ManufacturingCompany['status']].label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'trl' | 'founded')}
          className="bg-slate-800 border border-slate-600 text-star-300 text-sm rounded-lg px-3 py-2 focus:ring-nebula-500 focus:border-nebula-500"
        >
          <option value="trl">Sort by TRL</option>
          <option value="name">Sort by Name</option>
          <option value="founded">Sort by Founded</option>
        </select>
      </div>

      <p className="text-star-300 text-sm mb-6">
        Showing {filteredCompanies.length} of {COMPANIES.length} companies in the in-space manufacturing ecosystem.
      </p>

      {/* Company Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCompanies.map((company) => {
          const statusStyle = STATUS_STYLES[company.status];
          return (
            <div
              key={company.id}
              className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-lg">{company.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-star-400 text-sm">{company.hq}</span>
                    {company.ticker && (
                      <span className="text-nebula-400 text-xs font-mono font-bold bg-nebula-500/10 px-1.5 py-0.5 rounded">
                        {company.ticker}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-star-300 text-sm mb-4 leading-relaxed line-clamp-3">{company.description}</p>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">TRL</div>
                  <div className={`font-bold text-lg ${getTRLColor(company.trl)}`}>{company.trl}</div>
                  <div className={`text-xs ${getTRLColor(company.trl)}`}>{getTRLLabel(company.trl)}</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Founded</div>
                  <div className="text-white font-bold text-lg">{company.founded}</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Funding</div>
                  <div className="text-green-400 font-bold text-sm">{company.funding}</div>
                </div>
              </div>

              {/* Technology Focus */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Technology Focus</div>
                <p className="text-star-300 text-sm">{company.technologyFocus}</p>
              </div>

              {/* Key Products */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Key Products</div>
                <div className="flex flex-wrap gap-1.5">
                  {company.keyProducts.map((product) => (
                    <span
                      key={product}
                      className="px-2 py-0.5 bg-nebula-500/10 text-nebula-300 rounded text-xs font-medium"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Key Milestones</div>
                <ul className="space-y-1">
                  {company.milestones.slice(0, 3).map((milestone, i) => (
                    <li key={i} className="text-star-300 text-xs flex items-start gap-1.5">
                      <span className="text-nebula-400 mt-0.5">&#9656;</span>
                      {milestone}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nebula-300 hover:text-nebula-200 text-sm inline-flex items-center gap-1"
                >
                  Visit Website &rarr;
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ISSLabTab() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const totalExperiments = ISS_EXPERIMENT_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="space-y-8">
      {/* ISS Lab Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🛸</span>
          ISS National Laboratory
        </h2>
        <div className="space-y-3 text-star-300 leading-relaxed">
          <p>
            The <span className="text-white font-semibold">ISS National Laboratory</span>, managed by the Center
            for the Advancement of Science in Space (CASIS), has facilitated over{' '}
            <span className="text-nebula-400 font-semibold">{totalExperiments.toLocaleString()}+ experiments</span> since
            the station was designated as a U.S. National Laboratory in 2005. These span materials science,
            pharmaceutical development, biological research, technology demonstrations, and fundamental physics.
          </p>
          <p>
            The laboratory provides researchers from government, academia, and the private sector with access to the
            unique microgravity environment of low Earth orbit. As the ISS approaches retirement (currently planned
            for 2030), the focus has shifted to transitioning successful research programs to commercial platforms
            and scaling promising results to production-grade manufacturing.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Total Experiments</div>
          <div className="text-white font-bold text-2xl">{totalExperiments.toLocaleString()}+</div>
          <div className="text-star-400 text-xs">Since 2005</div>
        </div>
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Categories</div>
          <div className="text-white font-bold text-2xl">{ISS_EXPERIMENT_CATEGORIES.length}</div>
          <div className="text-star-400 text-xs">Research domains</div>
        </div>
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Operational Since</div>
          <div className="text-white font-bold text-2xl">2000</div>
          <div className="text-star-400 text-xs">First crew Nov 2000</div>
        </div>
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Planned Retirement</div>
          <div className="text-white font-bold text-2xl">2030</div>
          <div className="text-star-400 text-xs">Transition to commercial</div>
        </div>
      </div>

      {/* Experiment Categories */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Experiments by Category</h2>
        <div className="space-y-3">
          {ISS_EXPERIMENT_CATEGORIES.map((category) => {
            const isExpanded = expandedCategory === category.name;
            const percentage = ((category.count / totalExperiments) * 100).toFixed(1);
            return (
              <div
                key={category.name}
                className="card border border-slate-700/50 bg-slate-800/50 backdrop-blur overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-700/20 transition-colors"
                >
                  <span className="text-2xl">{category.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold ${category.color}`}>{category.name}</h3>
                      <span className="text-white font-bold">{category.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className="bg-nebula-500/60 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-star-400 text-xs mt-1">{percentage}% of total - {category.description}</p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-star-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                      <h4 className="text-white font-semibold text-sm mb-3">Key Results & Publications</h4>
                      <ul className="space-y-2">
                        {category.keyResults.map((result, i) => (
                          <li key={i} className="text-star-300 text-sm flex items-start gap-2">
                            <span className="text-nebula-400 mt-0.5">&#9656;</span>
                            {result}
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

      {/* Key ISS Manufacturing Facilities */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🔧</span>
          Active Manufacturing Facilities on ISS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              name: 'Additive Manufacturing Facility (AMF)',
              operator: 'Redwire (Made In Space)',
              capability: '3D printing of tools, parts, and structures in microgravity',
              parts: '200+',
              since: '2016',
            },
            {
              name: '3D BioFabrication Facility (BFF)',
              operator: 'Redwire / Uniformed Services University',
              capability: 'Bioprinting human tissue constructs (cardiac, meniscus, bone)',
              parts: '50+ tissue constructs',
              since: '2019',
            },
            {
              name: 'ZBLAN Fiber Optic Production',
              operator: 'Redwire / FOMS Inc.',
              capability: 'Drawing ultra-low-loss fluoride glass optical fibers',
              parts: 'Multiple fiber draws',
              since: '2017',
            },
            {
              name: 'Ceramic Manufacturing Module (CMM)',
              operator: 'Redwire',
              capability: 'Sintering ceramic components for turbines and electronics',
              parts: 'Multiple batches',
              since: '2023',
            },
            {
              name: 'Bishop Airlock',
              operator: 'Nanoracks (Voyager Space)',
              capability: 'Commercial airlock for payload deployment and external exposure',
              parts: '1,800+ payloads serviced',
              since: '2020',
            },
            {
              name: 'Protein Crystal Growth Facilities',
              operator: 'Multiple (NASA, ESA, JAXA)',
              capability: 'Growing large, high-quality protein crystals for drug development',
              parts: '100+ campaigns',
              since: '2001',
            },
          ].map((facility) => (
            <div key={facility.name} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <h3 className="text-white font-semibold text-sm mb-1">{facility.name}</h3>
              <p className="text-nebula-400 text-xs mb-2">{facility.operator}</p>
              <p className="text-star-300 text-xs mb-3">{facility.capability}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400 font-medium">{facility.parts} produced</span>
                <span className="text-star-400">Since {facility.since}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsTab() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📊</span>
          Product Categories & Market Analysis
        </h2>
        <p className="text-star-300 leading-relaxed">
          The in-space manufacturing market is segmented into distinct product categories, each with different
          technology readiness levels, market sizes, and timelines to commercialization. The most near-term
          opportunities are in pharmaceutical crystallization and specialty fiber optics, while bioprinting and
          semiconductor manufacturing represent larger but longer-term markets.
        </p>
      </div>

      {/* Product Cards */}
      <div className="space-y-4">
        {PRODUCT_CATEGORIES.map((product) => {
          const isExpanded = selectedProduct === product.id;
          return (
            <div
              key={product.id}
              className="card border border-slate-700/50 bg-slate-800/50 backdrop-blur overflow-hidden hover:border-nebula-500/30 transition-all"
            >
              <button
                onClick={() => setSelectedProduct(isExpanded ? null : product.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{product.icon}</span>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{product.name}</h3>
                      <p className="text-star-400 text-sm mt-1">{product.keyAdvantage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-green-400 font-bold">{product.marketPotential}</div>
                      <div className="text-star-400 text-xs">{product.timeToMarket}</div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-star-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-star-400 text-xs">TRL:</span>
                    <span className={`text-sm font-bold ${getTRLColor(product.trl)}`}>{product.trl}/9</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-star-400 text-xs">Market:</span>
                    <span className="text-green-400 text-sm font-medium">{product.marketPotential}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-star-400 text-xs">Timeline:</span>
                    <span className="text-nebula-400 text-sm font-medium">{product.timeToMarket}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4">
                  <div className="border-t border-slate-700/50 pt-4">
                    <p className="text-star-300 text-sm leading-relaxed">{product.description}</p>
                  </div>

                  {/* TRL Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-star-400 text-xs uppercase tracking-widest">Technology Readiness</span>
                      <span className={`text-sm font-bold ${getTRLColor(product.trl)}`}>
                        TRL {product.trl} - {getTRLLabel(product.trl)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3 flex">
                      {Array.from({ length: 9 }, (_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-3 ${i === 0 ? 'rounded-l-full' : ''} ${i === 8 ? 'rounded-r-full' : ''} ${
                            i < product.trl
                              ? product.trl >= 8
                                ? 'bg-green-500/60'
                                : product.trl >= 6
                                ? 'bg-yellow-500/60'
                                : product.trl >= 4
                                ? 'bg-orange-500/60'
                                : 'bg-red-500/60'
                              : 'bg-slate-700/30'
                          } ${i > 0 ? 'border-l border-slate-600/30' : ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Competitive Landscape */}
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                    <h4 className="text-white font-semibold text-sm mb-2">Competitive Landscape</h4>
                    <p className="text-star-300 text-sm mb-3">{product.competitiveLandscape}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.leaders.map((leader) => (
                        <span
                          key={leader}
                          className="px-2 py-0.5 bg-nebula-500/10 text-nebula-300 rounded text-xs font-medium"
                        >
                          {leader}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Market Comparison Table */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📋</span>
          Product Comparison Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-star-300 text-sm font-medium">Product</th>
                <th className="text-center px-4 py-3 text-star-300 text-sm font-medium">TRL</th>
                <th className="text-right px-4 py-3 text-star-300 text-sm font-medium">Market Potential</th>
                <th className="text-center px-4 py-3 text-star-300 text-sm font-medium">Timeline</th>
                <th className="text-left px-4 py-3 text-star-300 text-sm font-medium">Leaders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {PRODUCT_CATEGORIES.map((product) => (
                <tr key={product.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{product.icon}</span>
                      <span className="text-white font-medium text-sm">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${getTRLColor(product.trl)}`}>{product.trl}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-400 font-semibold text-sm">{product.marketPotential}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-star-300 text-sm">{product.timeToMarket}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-star-400 text-xs">{product.leaders.slice(0, 2).join(', ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceManufacturingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Space Manufacturing"
          subtitle="In-space manufacturing intelligence -- pharmaceutical production, advanced materials, bioprinting, and the emerging orbital economy"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Space Manufacturing' },
          ]}
        />

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-nebula-500 text-nebula-300'
                    : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'companies' && <CompaniesTab />}
        {activeTab === 'iss-lab' && <ISSLabTab />}
        {activeTab === 'products' && <ProductsTab />}

        {/* Related Modules */}
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/space-mining" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Mining
            </Link>
            <Link href="/orbital-services" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Orbital Services
            </Link>
            <Link href="/startups" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Startups
            </Link>
            <Link href="/supply-chain" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Supply Chain
            </Link>
            <Link href="/market-intel" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Market Intel
            </Link>
            <Link href="/resource-exchange" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Resource Exchange
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
