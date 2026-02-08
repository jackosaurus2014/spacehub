'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types — Manufacturing
// ────────────────────────────────────────

type TopTabId = 'manufacturing' | 'imagery';
type MfgTabId = 'overview' | 'companies' | 'iss-lab' | 'products';

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
// Types — Imagery Marketplace
// ────────────────────────────────────────

type ImgTabId = 'providers' | 'compare' | 'usecases' | 'market';
type SensorType = 'Optical' | 'SAR' | 'Multispectral' | 'Hyperspectral' | 'Thermal';
type PricingTier = '$' | '$$' | '$$$';
type ProviderStatus = 'Operational' | 'Deploying' | 'Development';

interface ImageryProvider {
  id: string;
  name: string;
  headquarters: string;
  sensorType: SensorType;
  constellationSize: string;
  resolutionM: string;
  spectralBands: string;
  revisitHours: string;
  swathWidthKm: string;
  orbit: string;
  launchYear: number;
  status: ProviderStatus;
  pricingTier: PricingTier;
  archiveAvailable: boolean;
  taskingAvailable: boolean;
  coveragePercent: number;
  description: string;
  highlights: string[];
}

interface UseCase {
  id: string;
  name: string;
  icon: string;
  description: string;
  topProviders: string[];
  requirements: string[];
  keyMetrics: string[];
}

interface MarketTrend {
  title: string;
  description: string;
  color: string;
  borderColor: string;
  stats: string[];
}

// ────────────────────────────────────────
// Data — Manufacturing
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

const MFG_TABS: { id: MfgTabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏭' },
  { id: 'companies', label: 'Companies', icon: '🏢' },
  { id: 'iss-lab', label: 'ISS Lab', icon: '🧪' },
  { id: 'products', label: 'Products & Markets', icon: '📦' },
];

// ────────────────────────────────────────
// Data — Imagery Marketplace
// ────────────────────────────────────────

const IMG_PROVIDERS: ImageryProvider[] = [
  {
    id: 'maxar', name: 'Maxar Technologies', headquarters: 'Westminster, CO, USA', sensorType: 'Optical',
    constellationSize: '6 satellites (WorldView Legion + heritage)', resolutionM: '0.30',
    spectralBands: '8 multispectral + panchromatic', revisitHours: '4-6 (with Legion)', swathWidthKm: '14.5',
    orbit: 'SSO, ~450-770 km', launchYear: 2007, status: 'Operational', pricingTier: '$$$',
    archiveAvailable: true, taskingAvailable: true, coveragePercent: 95,
    description: 'Industry leader in very high resolution commercial satellite imagery. WorldView Legion constellation (launched 2023-2024) provides 30cm native resolution with rapid revisit. Heritage fleet includes WorldView-2, WorldView-3 (31cm, SWIR capable), and GeoEye-1. SecureWatch platform serves defense and intelligence communities.',
    highlights: ['30cm native resolution -- highest commercially available', 'WorldView-3 offers 8 SWIR bands for material identification', '20+ year image archive (back to IKONOS era)', 'Primary provider for US National Reconnaissance programs'],
  },
  {
    id: 'planet', name: 'Planet Labs PBC', headquarters: 'San Francisco, CA, USA', sensorType: 'Multispectral',
    constellationSize: '200+ (PlanetScope) + 21 (SkySat) + 2 (Tanager)', resolutionM: '3.0-5.0 (PlanetScope), 0.5 (SkySat)',
    spectralBands: '8 bands (SuperDove), 400+ (Tanager hyperspectral)', revisitHours: '24 (daily global)',
    swathWidthKm: '24.6 (PlanetScope), 23x5 (SkySat)', orbit: 'SSO, ~475-500 km', launchYear: 2013,
    status: 'Operational', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 100,
    description: 'Operates the largest commercial Earth observation constellation. PlanetScope SuperDove fleet images the entire landmass daily at 3m resolution. SkySat provides sub-meter tasking capability. Tanager (launched 2024) is a hyperspectral mission built with NASA/JPL for methane and CO2 detection. Planetary Variables product delivers analysis-ready data feeds.',
    highlights: ['Only provider imaging entire Earth landmass every single day', 'Tanager hyperspectral for greenhouse gas detection (400+ bands)', 'SkySat sub-meter video and collect capability', 'Planet Insights / Planetary Variables for automated analytics'],
  },
  {
    id: 'airbus', name: 'Airbus Defence & Space', headquarters: 'Toulouse, France', sensorType: 'Optical',
    constellationSize: '6 (Pleiades Neo 3/4, Pleiades 1A/1B, SPOT 6/7)', resolutionM: '0.30 (Pleiades Neo), 0.50 (Pleiades), 1.5 (SPOT)',
    spectralBands: '4 MS + pan (Pleiades Neo), 4 MS + pan (SPOT)', revisitHours: '24 (any point on Earth)',
    swathWidthKm: '14 (Pleiades Neo), 60 (SPOT)', orbit: 'SSO, ~500-694 km', launchYear: 2012,
    status: 'Operational', pricingTier: '$$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 95,
    description: 'Major European EO provider operating the Pleiades Neo constellation (30cm native resolution, launched 2021-2022) alongside heritage Pleiades (50cm) and SPOT (1.5m) satellites. OneAtlas platform provides cloud-based access to imagery, basemaps, and analytics. Key supplier to European defence and government customers.',
    highlights: ['Pleiades Neo: 30cm resolution with 14km swath width', 'SPOT 6/7 provides wide-area 1.5m coverage', 'OneAtlas cloud platform and Living Library archive', 'Strong European government and defence customer base'],
  },
  {
    id: 'capella', name: 'Capella Space', headquarters: 'San Francisco, CA, USA', sensorType: 'SAR',
    constellationSize: '10 operational satellites', resolutionM: '0.25-0.50 (Spotlight), 1.0 (Stripmap)',
    spectralBands: 'X-band SAR (single polarization)', revisitHours: '1-6 (average latency)',
    swathWidthKm: '5 (Spot), 10 (Strip), 40 (Sliding Spot)', orbit: 'SSO, ~525 km', launchYear: 2020,
    status: 'Operational', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 85,
    description: 'Leading US commercial SAR provider with sub-25cm resolution spotlight capability. Acadia-generation satellites deliver industry-leading SAR resolution day or night, through clouds and smoke. Platform offers automated change detection, coherent change detection (CCD), and interferometric SAR (InSAR) products. Key US defense and intelligence contractor.',
    highlights: ['Sub-25cm SAR resolution -- sharpest commercial radar imagery', 'All-weather, day/night imaging capability', 'Automated tasking with sub-hour collection latency', 'InSAR and coherent change detection products'],
  },
  {
    id: 'iceye', name: 'ICEYE', headquarters: 'Espoo, Finland', sensorType: 'SAR',
    constellationSize: '30+ operational satellites', resolutionM: '0.25 (Spot Fine), 1.0 (Strip), 3.0 (Scan)',
    spectralBands: 'X-band SAR (VV polarization)', revisitHours: '4-20 (depending on mode)',
    swathWidthKm: '5 (Spot), 30 (Strip), 100 (Scan)', orbit: 'SSO & mid-inclination, ~570 km', launchYear: 2018,
    status: 'Operational', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 90,
    description: 'Finnish SAR microsatellite operator with the world\'s largest commercial SAR constellation (30+ satellites). Pioneered microsatellite SAR technology enabling rapid revisit. Strong flood monitoring and insurance analytics business.',
    highlights: ['World\'s largest commercial SAR constellation', '25cm Spot Fine resolution with rapid revisit', 'Industry-leading flood extent and damage analytics', 'Persistent monitoring and change detection solutions'],
  },
  {
    id: 'satellogic', name: 'Satellogic', headquarters: 'Buenos Aires, Argentina', sensorType: 'Multispectral',
    constellationSize: '22 operational satellites', resolutionM: '0.70 (multispectral), 0.50 (panchromatic)',
    spectralBands: '4 MS + pan, hyperspectral option (29 bands)', revisitHours: '12-24',
    swathWidthKm: '5-10', orbit: 'SSO, ~475-500 km', launchYear: 2020,
    status: 'Deploying', pricingTier: '$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 75,
    description: 'Argentine NewSpace company offering sub-meter multispectral imagery at disruptive pricing. Constellation of 22+ microsatellites provides 70cm multispectral and 50cm panchromatic resolution. Also operates hyperspectral payloads. Pursuing constellation expansion to 200+ satellites for daily global coverage.',
    highlights: ['Most affordable sub-meter commercial imagery provider', 'Hyperspectral capability alongside multispectral', 'Vertically integrated satellite manufacturing', 'Targeting 200+ satellite constellation for daily global coverage'],
  },
  {
    id: 'blacksky', name: 'BlackSky Technology', headquarters: 'Herndon, VA, USA', sensorType: 'Optical',
    constellationSize: '16 operational satellites', resolutionM: '0.50-1.0',
    spectralBands: '4 MS + pan', revisitHours: '1-4 (rapid revisit)',
    swathWidthKm: '4.4', orbit: 'Low-inclination + SSO, ~430-450 km', launchYear: 2018,
    status: 'Operational', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 80,
    description: 'Real-time geospatial intelligence company combining satellite imagery with AI analytics. Operates 16 Gen-2 satellites in low-inclination and SSO orbits for rapid revisit of populated areas. Spectra AI platform fuses imagery with open-source intelligence for automated monitoring and alerting.',
    highlights: ['Sub-1m resolution with rapid revisit focus', 'Spectra AI platform for automated geospatial intelligence', 'Dawn-to-dusk orbit strategy for maximum revisit', 'Integrated OSINT + satellite intelligence fusion'],
  },
  {
    id: 'umbra', name: 'Umbra', headquarters: 'Santa Barbara, CA, USA', sensorType: 'SAR',
    constellationSize: '6 operational satellites', resolutionM: '0.16-0.25 (Spotlight), 1.0 (Stripmap)',
    spectralBands: 'X-band SAR (dual-pol capable)', revisitHours: '12-36',
    swathWidthKm: '5 (Spot), 15 (Strip)', orbit: 'SSO, ~525 km', launchYear: 2021,
    status: 'Deploying', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 60,
    description: 'US commercial SAR company with industry-leading 16cm resolution spotlight mode. Open data model with SAR data available for direct download. Deploying constellation of next-generation satellites with improved imaging modes and throughput.',
    highlights: ['16cm SAR resolution -- among finest commercial radar imagery', 'Open data model with direct download access', 'Dual-polarization capable for enhanced analytics', 'Expanding constellation for improved revisit'],
  },
  {
    id: 'pixxel', name: 'Pixxel', headquarters: 'Bengaluru, India', sensorType: 'Hyperspectral',
    constellationSize: '6 satellites (Fireflies constellation)', resolutionM: '5.0',
    spectralBands: '150+ contiguous bands (400-2500nm VNIR-SWIR)', revisitHours: '24-48',
    swathWidthKm: '40', orbit: 'SSO, ~550 km', launchYear: 2022,
    status: 'Deploying', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 50,
    description: 'Indian hyperspectral imaging company deploying the Fireflies constellation for commercial hyperspectral Earth observation. Satellites capture 150+ contiguous spectral bands from visible through SWIR wavelengths at 5m spatial resolution. Aurora platform provides analysis-ready hyperspectral analytics.',
    highlights: ['150+ spectral bands from VNIR through SWIR', 'First commercial hyperspectral constellation at 5m resolution', 'Aurora analytics platform for automated spectral analysis', 'Applications in agriculture, mining, oil & gas, environment'],
  },
  {
    id: 'wyvern', name: 'Wyvern', headquarters: 'Edmonton, Canada', sensorType: 'Hyperspectral',
    constellationSize: '3 (Dragonette pathfinders)', resolutionM: '2.0-5.0 (target)',
    spectralBands: '32+ bands (VNIR, 400-1000nm)', revisitHours: '48-72',
    swathWidthKm: '40 (target)', orbit: 'SSO, ~550 km', launchYear: 2023,
    status: 'Deploying', pricingTier: '$', archiveAvailable: false, taskingAvailable: true, coveragePercent: 20,
    description: 'Canadian hyperspectral satellite startup focused on precision agriculture and environmental monitoring. Dragonette pathfinder satellites validated the proprietary deployable optics technology. Uses innovative folded optics design for higher resolution from smaller satellites.',
    highlights: ['Innovative deployable optics for high-res from small sats', 'Focus on precision agriculture analytics', '32+ spectral bands in VNIR range', 'Canadian Space Agency supported technology'],
  },
  {
    id: 'satvu', name: 'SatVu (Satellite Vu)', headquarters: 'London, UK', sensorType: 'Thermal',
    constellationSize: '1 operational (HotSat-1) + 7 planned', resolutionM: '3.5 (thermal MWIR)',
    spectralBands: 'Mid-wave infrared (MWIR, 3-5 micron)', revisitHours: '24-48 (planned constellation: 1-3 hrs)',
    swathWidthKm: '10', orbit: 'SSO, ~500 km', launchYear: 2023,
    status: 'Deploying', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 30,
    description: 'UK-based thermal imaging satellite company. HotSat-1 (launched June 2023) provides 3.5m thermal resolution -- highest commercially available from space. Measures building-level heat emissions for energy efficiency, urban heat island mapping, industrial monitoring, and carbon emissions estimation.',
    highlights: ['3.5m thermal resolution -- best commercial thermal from space', 'Building-level heat loss detection and energy analytics', 'Urban heat island and carbon emissions monitoring', 'Planning 8-satellite constellation for hourly thermal revisit'],
  },
  {
    id: 'albedo', name: 'Albedo Space', headquarters: 'Denver, CO, USA', sensorType: 'Optical',
    constellationSize: '0 (first launch planned 2025)', resolutionM: '0.10 (target visible), 2.0 (thermal)',
    spectralBands: 'Visible + thermal IR (co-registered)', revisitHours: '24-48 (planned)',
    swathWidthKm: '4.5', orbit: 'VLEO, ~250 km', launchYear: 2025,
    status: 'Development', pricingTier: '$$$', archiveAvailable: false, taskingAvailable: true, coveragePercent: 0,
    description: 'US startup developing 10cm visible resolution satellites from very low Earth orbit (~250km). Will also capture 2m co-registered thermal imagery, a unique dual-modality combination. VLEO orbit enables unprecedented resolution without larger apertures.',
    highlights: ['10cm visible -- highest resolution commercial satellite planned', 'Co-registered visible + thermal from single platform', 'Very Low Earth Orbit (VLEO) approach for resolution', 'Applications in urban analytics, infrastructure, and insurance'],
  },
  {
    id: 'synspective', name: 'Synspective', headquarters: 'Tokyo, Japan', sensorType: 'SAR',
    constellationSize: '4 operational (StriX series)', resolutionM: '1.0-3.0 (Strip/Slide)',
    spectralBands: 'X-band SAR', revisitHours: '12-24',
    swathWidthKm: '10-30', orbit: 'SSO, ~560 km', launchYear: 2020,
    status: 'Deploying', pricingTier: '$$', archiveAvailable: true, taskingAvailable: true, coveragePercent: 40,
    description: 'Japanese SAR satellite startup operating the StriX small SAR constellation. Provides all-weather monitoring solutions for infrastructure, land subsidence, and disaster response in the Asia-Pacific region. Planning 30-satellite constellation for global persistent monitoring.',
    highlights: ['Compact SAR microsatellite design (StriX platform)', 'Strong Asia-Pacific regional coverage', 'Infrastructure monitoring and land subsidence analytics', 'Planning 30-satellite constellation for sub-hour revisit'],
  },
  {
    id: 'earthdaily', name: 'EarthDaily Analytics', headquarters: 'Vancouver, Canada', sensorType: 'Multispectral',
    constellationSize: '8 planned (EarthDaily constellation)', resolutionM: '3.5-5.0',
    spectralBands: '22 spectral bands (VNIR + Red Edge)', revisitHours: '24 (daily global)',
    swathWidthKm: '220', orbit: 'SSO, ~630 km', launchYear: 2025,
    status: 'Development', pricingTier: '$$', archiveAvailable: true, taskingAvailable: false, coveragePercent: 0,
    description: 'Canadian Earth observation analytics company developing a new 8-satellite constellation for daily global multispectral coverage with 22 spectral bands. Wide 220km swath enables full-Earth daily revisit. EarthPipeline platform integrates imagery with analytics for agriculture, forestry, and environmental monitoring.',
    highlights: ['22 spectral bands including red edge for vegetation analysis', '220km swath for efficient daily global coverage', 'EarthPipeline science-grade analytics platform', 'Heritage from Deimos/UrtheCast Earth observation programs'],
  },
];

const IMG_USE_CASES: UseCase[] = [
  { id: 'agriculture', name: 'Agriculture & Precision Farming', icon: '\uD83C\uDF3E', description: 'Crop health monitoring, yield prediction, irrigation management, and soil analysis using multispectral and hyperspectral imagery.', topProviders: ['Planet Labs', 'Pixxel', 'Wyvern', 'EarthDaily Analytics', 'Satellogic'], requirements: ['Daily revisit for crop phenology tracking', 'Red edge and NIR bands for vegetation indices (NDVI, EVI)', 'Hyperspectral for nutrient deficiency detection', '3-10m resolution sufficient for field-level analysis'], keyMetrics: ['3-5m resolution', 'Daily revisit', 'NIR/Red Edge bands', '$-$$ pricing'] },
  { id: 'defense', name: 'Defense & Intelligence', icon: '\uD83D\uDEE1\uFE0F', description: 'Geospatial intelligence, change detection, activity monitoring, and battle damage assessment.', topProviders: ['Maxar Technologies', 'Capella Space', 'BlackSky Technology', 'Airbus Defence & Space', 'ICEYE'], requirements: ['Sub-50cm resolution for feature identification', 'SAR for all-weather / denied area monitoring', 'Rapid tasking with sub-hour collection latency', 'Secure delivery and handling (ITAR/classified)'], keyMetrics: ['<50cm resolution', '<1hr tasking', 'All-weather (SAR)', '$$$ pricing'] },
  { id: 'insurance', name: 'Insurance & Risk Assessment', icon: '\uD83D\uDCCA', description: 'Pre-event risk assessment, post-disaster damage quantification, flood extent mapping, and portfolio exposure analysis.', topProviders: ['ICEYE', 'Maxar Technologies', 'Planet Labs', 'Capella Space', 'SatVu'], requirements: ['SAR for flood and weather-event monitoring through clouds', 'Thermal for building-level risk assessment', 'Historical archive for change-over-time analysis', 'Automated analytics and API integration'], keyMetrics: ['SAR + optical fusion', '4-24hr revisit', 'Archive depth', '$$-$$$ pricing'] },
  { id: 'infrastructure', name: 'Infrastructure Monitoring', icon: '\uD83C\uDFD7\uFE0F', description: 'Bridge and dam stability, pipeline surveillance, construction progress tracking, and subsidence detection.', topProviders: ['ICEYE', 'Capella Space', 'Synspective', 'Maxar Technologies', 'Umbra'], requirements: ['InSAR for millimeter-level displacement detection', 'High resolution for structural feature identification', 'Consistent revisit for time-series analysis', 'All-weather capability for continuous monitoring'], keyMetrics: ['<1m SAR resolution', 'InSAR capability', '12-24hr revisit', '$$ pricing'] },
  { id: 'maritime', name: 'Maritime & Vessel Tracking', icon: '\uD83D\uDEA2', description: 'Ship detection and classification, port activity monitoring, oil spill detection, and maritime domain awareness.', topProviders: ['ICEYE', 'Capella Space', 'Maxar Technologies', 'Planet Labs', 'Airbus Defence & Space'], requirements: ['SAR for all-weather ocean monitoring', 'Wide-area scan mode for ocean surveillance', 'Frequent revisit for vessel tracking', 'AIS correlation and dark vessel detection'], keyMetrics: ['Wide swath SAR', '<6hr revisit', 'AIS fusion', '$$-$$$ pricing'] },
  { id: 'environment', name: 'Environmental & Climate', icon: '\uD83C\uDF0D', description: 'Deforestation monitoring, methane detection, carbon stock estimation, wildfire mapping, and ecosystem health.', topProviders: ['Planet Labs', 'Pixxel', 'Wyvern', 'EarthDaily Analytics', 'SatVu'], requirements: ['Hyperspectral for gas detection and vegetation species', 'Daily coverage for deforestation alerts', 'Thermal for wildfire and industrial emissions', 'Global basemap for change detection'], keyMetrics: ['Hyperspectral bands', 'Daily global', 'Thermal IR', '$-$$ pricing'] },
  { id: 'urban', name: 'Urban Planning & Smart Cities', icon: '\uD83C\uDFD9\uFE0F', description: 'Urban growth monitoring, land use classification, building footprint extraction, and urban heat island analysis.', topProviders: ['Maxar Technologies', 'Airbus Defence & Space', 'Albedo Space', 'SatVu', 'BlackSky Technology'], requirements: ['Very high resolution (<50cm) for building-level detail', 'Thermal for urban heat mapping', '3D elevation models from stereo pairs', 'Frequent revisit for change monitoring'], keyMetrics: ['<50cm resolution', 'Thermal + visible', 'Stereo/3D', '$$-$$$ pricing'] },
  { id: 'disaster', name: 'Disaster Response', icon: '\u26A1', description: 'Rapid damage assessment, flood mapping, earthquake impact, wildfire perimeter tracking, and humanitarian response.', topProviders: ['ICEYE', 'Capella Space', 'Maxar Technologies', 'Planet Labs', 'BlackSky Technology'], requirements: ['Rapid tasking (<1hr from request to collect)', 'SAR for cloud-penetrating disaster imaging', 'Before/after comparison capability', 'Fast delivery and open data licensing for NGOs'], keyMetrics: ['<1hr tasking', 'All-weather SAR', 'Fast delivery', 'Variable pricing'] },
];

const IMG_MARKET_TRENDS: MarketTrend[] = [
  { title: 'SAR Market Expansion', description: 'Synthetic Aperture Radar has emerged as the fastest-growing segment in commercial Earth observation. All-weather, day-night capability drives adoption for defense, insurance, maritime, and infrastructure monitoring.', color: 'text-cyan-400', borderColor: 'border-cyan-500/30', stats: ['SAR market growing at 15-20% CAGR through 2030', '100+ commercial SAR satellites now in orbit', 'Sub-25cm SAR resolution now commercially available', 'InSAR analytics market exceeding $500M annually'] },
  { title: 'Hyperspectral Emergence', description: 'Commercial hyperspectral satellites are transitioning from experimental to operational. Pixxel, Wyvern, Planet (Tanager), and OroraTech are deploying constellations that capture hundreds of spectral bands.', color: 'text-purple-400', borderColor: 'border-purple-500/30', stats: ['First commercial hyperspectral constellations deployed 2023-2024', 'Methane detection from space now operational (Tanager, MethaneSAT)', 'Precision agriculture driving demand for 10+ spectral bands', 'Hyperspectral market projected to reach $1.8B by 2030'] },
  { title: 'AI-Powered Analytics', description: 'The value chain is shifting from raw imagery to automated intelligence. Providers are increasingly offering AI/ML analytics layers as the primary product, with imagery as the underlying data source.', color: 'text-amber-400', borderColor: 'border-amber-500/30', stats: ['Geospatial AI analytics market exceeding $3B annually', 'Automated object detection accuracy now >95% for major features', 'Foundation models (IBM/NASA Prithvi, Clay) accelerating adoption', 'Analytics revenue growing faster than imagery revenue for most providers'] },
  { title: 'Very High Resolution Competition', description: 'The sub-50cm resolution market is intensifying with new entrants challenging Maxar and Airbus dominance. Albedo targets 10cm from VLEO, Satellogic offers sub-meter at disruptive pricing.', color: 'text-green-400', borderColor: 'border-green-500/30', stats: ['10cm resolution planned from VLEO (Albedo) by 2025-2026', '30cm now standard for premium optical providers', 'Sub-meter imagery pricing dropped 50%+ since 2020', 'Daily sub-meter coverage becoming feasible by 2027'] },
  { title: 'Thermal & Specialized Sensors', description: 'New sensor modalities are expanding the commercial EO market beyond traditional optical and radar. Thermal infrared (SatVu, Albedo), SIGINT-adjacent RF sensing, and LIDAR pathfinders are creating entirely new data products.', color: 'text-red-400', borderColor: 'border-red-500/30', stats: ['SatVu HotSat-1 achieves 3.5m thermal resolution from space', 'Building-level heat loss detection now possible from orbit', 'Thermal data enabling carbon emissions estimation', 'Combined visible+thermal co-registration a key differentiator'] },
  { title: 'Constellation Scale & Daily Coverage', description: 'The industry is moving toward daily or sub-daily global coverage as the baseline expectation. Planet demonstrated daily global imaging at 3m. Multiple providers now targeting daily revisit at higher resolutions.', color: 'text-blue-400', borderColor: 'border-blue-500/30', stats: ['Planet images entire Earth landmass daily at 3m resolution', '1,000+ commercial EO satellites now in orbit', 'Average satellite manufacturing cost down 70% since 2015', 'Daily sub-meter global coverage targeted by multiple providers by 2028'] },
];

const IMG_HERO_STATS = [
  { label: 'Providers Tracked', value: '14', color: 'text-cyan-400' },
  { label: 'Satellites in Orbit', value: '500+', color: 'text-blue-400' },
  { label: 'Best Optical GSD', value: '30cm', color: 'text-green-400' },
  { label: 'Best SAR GSD', value: '16cm', color: 'text-amber-400' },
];

const IMG_STATUS_STYLES: Record<ProviderStatus, { bg: string; text: string; border: string }> = {
  Operational: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/40' },
  Deploying: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  Development: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/40' },
};

const SENSOR_COLORS: Record<SensorType, string> = {
  Optical: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  SAR: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  Multispectral: 'text-green-400 bg-green-500/10 border-green-500/30',
  Hyperspectral: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Thermal: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const IMG_PRICING_INFO: Record<string, { archive: string; tasking: string; notes: string }> = {
  '$': { archive: '$5-15 / km\u00B2', tasking: '$10-25 / km\u00B2', notes: 'Budget-friendly providers, often NewSpace startups with competitive pricing models.' },
  '$$': { archive: '$10-30 / km\u00B2', tasking: '$20-75 / km\u00B2', notes: 'Mid-tier pricing with strong resolution and revisit capabilities.' },
  '$$$': { archive: '$15-50 / km\u00B2', tasking: '$25-150+ / km\u00B2', notes: 'Premium very high resolution imagery from established providers.' },
};

const IMG_TABS: { id: ImgTabId; label: string; icon: string }[] = [
  { id: 'providers', label: 'Providers', icon: '\uD83D\uDEF0\uFE0F' },
  { id: 'compare', label: 'Compare', icon: '\uD83D\uDCCA' },
  { id: 'usecases', label: 'Use Cases', icon: '\uD83C\uDFAF' },
  { id: 'market', label: 'Market Overview', icon: '\uD83D\uDCC8' },
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
// Imagery Sub-Components
// ────────────────────────────────────────

function ImgProviderCard({ provider }: { provider: ImageryProvider }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = IMG_STATUS_STYLES[provider.status];
  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-cyan-500/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg group-hover:text-cyan-300 transition-colors">{provider.name}</h3>
          <p className="text-star-400 text-sm mt-0.5">{provider.headquarters}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${SENSOR_COLORS[provider.sensorType]}`}>{provider.sensorType}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>{provider.status}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-700/30 rounded-lg p-2.5"><div className="text-star-400 text-xs uppercase tracking-widest mb-0.5">Resolution</div><div className="text-white text-sm font-semibold">{provider.resolutionM}m</div></div>
        <div className="bg-slate-700/30 rounded-lg p-2.5"><div className="text-star-400 text-xs uppercase tracking-widest mb-0.5">Revisit</div><div className="text-white text-sm font-semibold">{provider.revisitHours}h</div></div>
        <div className="bg-slate-700/30 rounded-lg p-2.5"><div className="text-star-400 text-xs uppercase tracking-widest mb-0.5">Satellites</div><div className="text-white text-sm font-semibold">{provider.constellationSize.split(' ')[0]}</div></div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="px-2 py-0.5 bg-slate-700/50 text-star-300 border border-slate-600/30 rounded text-xs">{provider.spectralBands}</span>
        <span className="px-2 py-0.5 bg-slate-700/50 text-star-300 border border-slate-600/30 rounded text-xs">Swath: {provider.swathWidthKm}km</span>
        <span className="px-2 py-0.5 bg-slate-700/50 text-amber-300 border border-slate-600/30 rounded text-xs font-semibold">{provider.pricingTier}</span>
        {provider.archiveAvailable && <span className="px-2 py-0.5 bg-green-900/20 text-green-400 border border-green-500/20 rounded text-xs">Archive</span>}
        {provider.taskingAvailable && <span className="px-2 py-0.5 bg-cyan-900/20 text-cyan-400 border border-cyan-500/20 rounded text-xs">Tasking</span>}
      </div>
      <p className="text-star-300 text-sm leading-relaxed mb-4">{expanded ? provider.description : provider.description.slice(0, 180) + '...'}</p>
      {expanded && (
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Orbit</div><div className="text-white text-sm">{provider.orbit}</div></div>
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Since</div><div className="text-white text-sm">{provider.launchYear}</div></div>
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Constellation</div><div className="text-white text-sm">{provider.constellationSize}</div></div>
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Coverage</div><div className="text-white text-sm">{provider.coveragePercent}% global</div></div>
          </div>
          <div>
            <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Key Highlights</div>
            <ul className="space-y-1">{provider.highlights.map((h, i) => (<li key={i} className="text-star-300 text-sm flex items-start gap-2"><span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>{h}</li>))}</ul>
          </div>
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
        {expanded ? 'Show less' : 'Show details'} {expanded ? '\u2191' : '\u2193'}
      </button>
    </div>
  );
}

function ImgComparisonTable({ sensorFilter }: { sensorFilter: string }) {
  const filtered = sensorFilter ? IMG_PROVIDERS.filter((p) => p.sensorType === sensorFilter) : IMG_PROVIDERS;
  return (
    <div className="card border border-slate-700/50 bg-slate-800/50 backdrop-blur overflow-hidden">
      <div className="p-4 border-b border-slate-700/50"><h3 className="text-white font-semibold">Provider Comparison</h3><p className="text-star-400 text-sm mt-1">Side-by-side comparison of {filtered.length} satellite imagery providers</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700/50">
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Provider</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Type</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Resolution</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Revisit</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Bands</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Coverage</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Pricing</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Archive</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Tasking</th>
          </tr></thead>
          <tbody>{filtered.map((p, idx) => (
            <tr key={p.id} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${idx % 2 === 0 ? 'bg-slate-800/30' : ''}`}>
              <td className="py-3 px-4 text-white font-medium whitespace-nowrap">{p.name}</td>
              <td className="py-3 px-4 whitespace-nowrap"><span className={`text-xs font-medium px-2 py-0.5 rounded border ${SENSOR_COLORS[p.sensorType]}`}>{p.sensorType}</span></td>
              <td className="py-3 px-4 text-cyan-400 font-mono whitespace-nowrap">{p.resolutionM}m</td>
              <td className="py-3 px-4 text-star-300 whitespace-nowrap">{p.revisitHours}h</td>
              <td className="py-3 px-4 text-star-400 max-w-[200px] truncate">{p.spectralBands}</td>
              <td className="py-3 px-4 text-star-300 whitespace-nowrap">{p.coveragePercent}%</td>
              <td className="py-3 px-4 text-amber-400 font-semibold whitespace-nowrap">{p.pricingTier}</td>
              <td className="py-3 px-4 whitespace-nowrap">{p.archiveAvailable ? <span className="text-green-400 text-xs font-medium">Yes</span> : <span className="text-star-400 text-xs">No</span>}</td>
              <td className="py-3 px-4 whitespace-nowrap">{p.taskingAvailable ? <span className="text-green-400 text-xs font-medium">Yes</span> : <span className="text-star-400 text-xs">No</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-700/50">
        <h4 className="text-white font-semibold text-sm mb-3">Pricing Reference (Typical Ranges)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(IMG_PRICING_INFO).map(([tier, info]) => (
            <div key={tier} className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-amber-400 font-bold text-lg mb-2">{tier}</div>
              <div className="space-y-1 mb-2"><div className="text-star-300 text-xs"><span className="text-star-400">Archive:</span> {info.archive}</div><div className="text-star-300 text-xs"><span className="text-star-400">Tasking:</span> {info.tasking}</div></div>
              <p className="text-star-400 text-xs leading-relaxed">{info.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImgUseCaseCard({ useCase }: { useCase: UseCase }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-cyan-500/30 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">{useCase.icon}</span>
        <div><h3 className="text-white font-semibold text-lg">{useCase.name}</h3><p className="text-star-400 text-sm mt-1 leading-relaxed">{useCase.description}</p></div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">{useCase.keyMetrics.map((metric) => (<span key={metric} className="px-2 py-0.5 bg-cyan-900/20 text-cyan-300 border border-cyan-500/20 rounded text-xs font-medium">{metric}</span>))}</div>
      <div className="mb-4">
        <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Recommended Providers</div>
        <div className="flex flex-wrap gap-1.5">{useCase.topProviders.map((provider, idx) => (<span key={provider} className={`px-2.5 py-1 rounded text-xs font-medium ${idx === 0 ? 'bg-amber-900/20 text-amber-300 border border-amber-500/20' : 'bg-slate-700/50 text-star-300 border border-slate-600/30'}`}>{idx === 0 ? `\u2B50 ${provider}` : provider}</span>))}</div>
      </div>
      {expanded && (<div className="mb-4"><div className="text-star-400 text-xs uppercase tracking-widest mb-2">Key Requirements</div><ul className="space-y-1">{useCase.requirements.map((req, i) => (<li key={i} className="text-star-300 text-sm flex items-start gap-2"><span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>{req}</li>))}</ul></div>)}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">{expanded ? 'Show less' : 'View requirements'} {expanded ? '\u2191' : '\u2193'}</button>
    </div>
  );
}

function ImageryMarketplaceContent() {
  const [imgTab, setImgTab] = useState<ImgTabId>('providers');
  const [sensorFilter, setSensorFilter] = useState<string>('');
  const sensorTypes: SensorType[] = Array.from(new Set(IMG_PROVIDERS.map((p) => p.sensorType))) as SensorType[];
  const filteredProviders = sensorFilter ? IMG_PROVIDERS.filter((p) => p.sensorType === sensorFilter) : IMG_PROVIDERS;

  return (
    <div>
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {IMG_HERO_STATS.map((stat) => (
          <div key={stat.label} className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur text-center">
            <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</div>
            <div className="text-star-400 text-xs uppercase tracking-widest font-medium mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Market Overview Banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">{'\uD83C\uDF0D'}</span>
          <div>
            <h3 className="font-semibold text-white mb-1">Earth Observation Market</h3>
            <p className="text-sm text-star-300 leading-relaxed">
              The commercial Earth observation market is projected to exceed $8 billion by 2028, growing at
              approximately 12% CAGR. Over 1,000 commercial EO satellites are now in orbit, with SAR, hyperspectral,
              and thermal sensors emerging alongside traditional optical imaging. AI-powered analytics platforms
              are transforming raw imagery into automated intelligence products.
            </p>
          </div>
        </div>
      </div>

      {/* Imagery Sub-Tab Navigation */}
      <div className="border-b border-slate-700/50 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {IMG_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setImgTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${imgTab === tab.id ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'}`}>
              <span className="mr-1.5">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Providers Sub-Tab */}
      {imgTab === 'providers' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-star-400 text-sm">Filter by sensor:</span>
            <button onClick={() => setSensorFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === '' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>All ({IMG_PROVIDERS.length})</button>
            {sensorTypes.map((type) => {
              const count = IMG_PROVIDERS.filter((p) => p.sensorType === type).length;
              return (<button key={type} onClick={() => setSensorFilter(type)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === type ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>{type} ({count})</button>);
            })}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProviders.map((provider) => (<ImgProviderCard key={provider.id} provider={provider} />))}
          </div>
          {filteredProviders.length === 0 && (<div className="text-center py-12"><span className="text-5xl block mb-4">{'\uD83D\uDEF0\uFE0F'}</span><p className="text-star-400">No providers match the selected filter.</p></div>)}
          <div className="mt-8 card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <h3 className="font-semibold text-white mb-4">Providers by Sensor Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {sensorTypes.map((type) => {
                const count = IMG_PROVIDERS.filter((p) => p.sensorType === type).length;
                const colorClass = SENSOR_COLORS[type]?.split(' ')[0] || 'text-star-400';
                return (<div key={type} className="bg-slate-700/30 rounded-xl p-4 text-center"><div className={`text-2xl font-bold mb-1 ${colorClass}`}>{count}</div><div className="text-star-400 text-sm">{type}</div></div>);
              })}
            </div>
          </div>
        </div>
      )}

      {/* Compare Sub-Tab */}
      {imgTab === 'compare' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-star-400 text-sm">Filter by sensor:</span>
            <button onClick={() => setSensorFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === '' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>All</button>
            {sensorTypes.map((type) => (<button key={type} onClick={() => setSensorFilter(type)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === type ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>{type}</button>))}
          </div>
          <ImgComparisonTable sensorFilter={sensorFilter} />
          <div className="mt-6 card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <h3 className="text-white font-semibold mb-4">Key Selection Insights</h3>
            <div className="space-y-3">
              {[
                { num: '01', text: <><strong className="text-white">Resolution vs. coverage tradeoff.</strong> Maxar and Airbus offer 30cm resolution but limited daily capacity. Planet delivers daily global coverage at 3m. Choose based on whether you need detail or temporal frequency.</> },
                { num: '02', text: <><strong className="text-white">SAR is essential for all-weather operations.</strong> If your use case requires cloud-penetrating or nighttime imaging, SAR providers (ICEYE, Capella, Umbra) are necessary.</> },
                { num: '03', text: <><strong className="text-white">Archive vs. tasking pricing differs significantly.</strong> Archive imagery is typically 30-60% cheaper than new tasking collections. Always check archive availability before commissioning new collects.</> },
                { num: '04', text: <><strong className="text-white">Hyperspectral is the emerging differentiator.</strong> Pixxel, Wyvern, and Planet Tanager enable material identification and gas detection that traditional multispectral imagery cannot achieve.</> },
              ].map((item) => (<div key={item.num} className="flex items-start gap-3"><span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">{item.num}</span><p className="text-star-300 text-sm">{item.text}</p></div>))}
            </div>
          </div>
        </div>
      )}

      {/* Use Cases Sub-Tab */}
      {imgTab === 'usecases' && (
        <div>
          <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-6">
            <h3 className="text-white font-semibold mb-2">Choosing the Right Provider for Your Use Case</h3>
            <p className="text-star-400 text-sm leading-relaxed">Different applications require different combinations of spatial resolution, spectral bands, revisit frequency, and sensor type. Below are provider recommendations organized by primary use case.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{IMG_USE_CASES.map((useCase) => (<ImgUseCaseCard key={useCase.id} useCase={useCase} />))}</div>
          <div className="mt-8 card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <h3 className="font-semibold text-white mb-4">Most Versatile Providers</h3>
            <p className="text-star-400 text-sm mb-4">Providers ranked by number of use cases where they appear as a top recommendation:</p>
            <div className="space-y-3">
              {(() => {
                const providerCounts: Record<string, number> = {};
                IMG_USE_CASES.forEach((uc) => { uc.topProviders.forEach((p) => { providerCounts[p] = (providerCounts[p] || 0) + 1; }); });
                const sorted = Object.entries(providerCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
                const maxCount = sorted[0]?.[1] || 1;
                return sorted.map(([name, count]) => (<div key={name} className="flex items-center gap-4"><div className="w-40 flex-shrink-0 text-sm text-white font-medium truncate">{name}</div><div className="flex-1 h-6 bg-slate-700/30 rounded overflow-hidden relative"><div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded transition-all" style={{ width: `${Math.max((count / maxCount) * 100, 3)}%` }} /><span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">{count} use cases</span></div></div>));
              })()}
            </div>
          </div>
          <div className="mt-6 card p-6 border border-cyan-500/20 bg-slate-800/50 backdrop-blur">
            <h3 className="text-cyan-400 font-semibold mb-4">Multi-Sensor Fusion Strategy</h3>
            <p className="text-star-400 text-sm leading-relaxed mb-4">Most operational intelligence workflows benefit from combining multiple sensor types:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { combo: 'Optical + SAR', providers: 'Maxar + ICEYE', reason: 'All-weather, high-resolution monitoring. Optical for detail, SAR for cloud penetration and nighttime coverage.' },
                { combo: 'Daily Optical + Hyperspectral', providers: 'Planet + Pixxel', reason: 'Daily change detection combined with material-level identification. Ideal for agriculture and environmental monitoring.' },
                { combo: 'SAR + Thermal', providers: 'Capella + SatVu', reason: 'Infrastructure monitoring combining structural displacement detection with thermal anomaly identification.' },
                { combo: 'VHR Optical + Daily MS', providers: 'Airbus + Planet', reason: 'Detailed feature extraction from 30cm imagery combined with daily temporal monitoring at 3m.' },
              ].map((s) => (<div key={s.combo} className="bg-slate-700/30 rounded-lg p-4"><div className="text-white font-semibold text-sm mb-1">{s.combo}</div><div className="text-cyan-400 text-xs font-medium mb-2">{s.providers}</div><p className="text-star-400 text-xs leading-relaxed">{s.reason}</p></div>))}
            </div>
          </div>
        </div>
      )}

      {/* Market Sub-Tab */}
      {imgTab === 'market' && (
        <div>
          <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">Global Earth Observation Market</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '2024 Market Size', value: '$5.5B', color: 'text-cyan-400' },
                { label: '2028 Projected', value: '$8.3B', color: 'text-green-400' },
                { label: 'CAGR 2024-2030', value: '~12%', color: 'text-amber-400' },
                { label: 'Commercial EO Sats', value: '1,000+', color: 'text-purple-400' },
              ].map((stat) => (<div key={stat.label} className="bg-slate-700/30 rounded-xl p-4 text-center"><div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div><div className="text-star-400 text-xs uppercase tracking-widest mt-1">{stat.label}</div></div>))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4"><h4 className="text-white font-semibold text-sm mb-2">Data Revenue</h4><p className="text-star-400 text-xs leading-relaxed">Satellite imagery data sales represent approximately 60% of the EO market. Archive sales continue growing as historical datasets become more valuable for AI training and change detection.</p></div>
              <div className="bg-slate-700/30 rounded-lg p-4"><h4 className="text-white font-semibold text-sm mb-2">Analytics / Value-Added</h4><p className="text-star-400 text-xs leading-relaxed">Value-added analytics represent the fastest-growing segment at 18-22% CAGR. Multiple providers report analytics revenue growing faster than raw data revenue.</p></div>
              <div className="bg-slate-700/30 rounded-lg p-4"><h4 className="text-white font-semibold text-sm mb-2">Government vs. Commercial</h4><p className="text-star-400 text-xs leading-relaxed">Government and defense remain the largest customer segment (~55% of revenue), but commercial adoption is accelerating in insurance, agriculture, energy, and finance.</p></div>
            </div>
          </div>
          <h3 className="text-white font-semibold text-lg mb-4">Key Market Trends</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {IMG_MARKET_TRENDS.map((trend) => (
              <div key={trend.title} className={`card p-6 border ${trend.borderColor} bg-slate-800/50 backdrop-blur`}>
                <h3 className={`text-lg font-semibold ${trend.color} mb-2`}>{trend.title}</h3>
                <p className="text-star-400 text-sm leading-relaxed mb-4">{trend.description}</p>
                <div className="space-y-2">{trend.stats.map((stat, i) => (<div key={i} className="text-star-300 text-sm flex items-start gap-2"><span className={`mt-0.5 flex-shrink-0 ${trend.color}`}>-</span>{stat}</div>))}</div>
              </div>
            ))}
          </div>
          <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-6">
            <h3 className="text-white font-semibold mb-4">Industry Evolution</h3>
            <div className="space-y-4">
              {[
                { era: '1999-2010', title: 'Pioneer Era', description: 'IKONOS (1m), QuickBird (60cm), WorldView-1 (50cm). First commercial high-resolution satellites. Government as primary customer.', color: 'text-star-400' },
                { era: '2010-2018', title: 'NewSpace Revolution', description: 'Planet launches Dove flock (3m daily). WorldView-3 achieves 31cm. Smallsat EO becomes viable. SAR microsatellites emerge (ICEYE).', color: 'text-blue-400' },
                { era: '2018-2023', title: 'Constellation Scale', description: 'Planet achieves daily global imaging. ICEYE and Capella deploy commercial SAR fleets. Maxar launches WorldView Legion (30cm). Pricing drops significantly.', color: 'text-cyan-400' },
                { era: '2024-2028', title: 'Multi-Modal & AI Era', description: 'Hyperspectral goes operational (Pixxel, Tanager). Thermal from space (SatVu). 10cm VLEO planned (Albedo). AI analytics become primary product. Market exceeds $8B.', color: 'text-green-400' },
              ].map((era) => (<div key={era.era} className="flex items-start gap-4"><div className={`text-sm font-mono font-bold flex-shrink-0 w-24 ${era.color}`}>{era.era}</div><div><h4 className="text-white font-semibold text-sm">{era.title}</h4><p className="text-star-400 text-xs leading-relaxed mt-1">{era.description}</p></div></div>))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-semibold mb-4">Market by Region</h3>
              <div className="space-y-3">
                {[
                  { region: 'North America', share: '38%', color: 'from-blue-500 to-blue-400', providers: 'Maxar, Planet, Capella, BlackSky, Umbra, Albedo' },
                  { region: 'Europe', share: '28%', color: 'from-cyan-500 to-cyan-400', providers: 'Airbus, ICEYE, SatVu' },
                  { region: 'Asia-Pacific', share: '22%', color: 'from-green-500 to-green-400', providers: 'Pixxel, Synspective' },
                  { region: 'Rest of World', share: '12%', color: 'from-amber-500 to-amber-400', providers: 'Satellogic, Wyvern, EarthDaily' },
                ].map((r) => (<div key={r.region}><div className="flex justify-between mb-1"><span className="text-white text-sm font-medium">{r.region}</span><span className="text-star-400 text-sm">{r.share}</span></div><div className="h-2 bg-slate-700/30 rounded-full overflow-hidden mb-1"><div className={`h-full rounded-full bg-gradient-to-r ${r.color}`} style={{ width: r.share }} /></div><p className="text-star-400 text-xs">{r.providers}</p></div>))}
              </div>
            </div>
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-semibold mb-4">Market by Sensor Type</h3>
              <div className="space-y-3">
                {[
                  { type: 'Optical (VHR)', share: '45%', growth: '8% CAGR', color: 'from-blue-500 to-blue-400' },
                  { type: 'SAR', share: '25%', growth: '17% CAGR', color: 'from-cyan-500 to-cyan-400' },
                  { type: 'Multispectral (Med-Res)', share: '18%', growth: '10% CAGR', color: 'from-green-500 to-green-400' },
                  { type: 'Hyperspectral', share: '7%', growth: '25% CAGR', color: 'from-purple-500 to-purple-400' },
                  { type: 'Thermal / Other', share: '5%', growth: '20% CAGR', color: 'from-red-500 to-red-400' },
                ].map((s) => (<div key={s.type}><div className="flex justify-between mb-1"><span className="text-white text-sm font-medium">{s.type}</span><div className="flex items-center gap-3"><span className="text-green-400 text-xs">{s.growth}</span><span className="text-star-400 text-sm">{s.share}</span></div></div><div className="h-2 bg-slate-700/30 rounded-full overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${s.color}`} style={{ width: s.share }} /></div></div>))}
              </div>
            </div>
          </div>
          <div className="card p-5 border border-slate-700/50 border-dashed bg-slate-800/50 backdrop-blur">
            <h3 className="text-sm font-semibold text-white mb-2">Data Sources & Methodology</h3>
            <p className="text-star-400 text-xs leading-relaxed">Market size estimates derived from Euroconsult, Northern Sky Research (NSR), and publicly available industry reports. Provider specifications sourced from official company documentation, SEC filings, and satellite operator disclosures. Resolution figures represent best-available modes under optimal conditions. Data as of early 2025.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

function ManufacturingAndImageryContent() {
  const searchParams = useSearchParams();
  const topTab = (searchParams.get('tab') === 'imagery' ? 'imagery' : 'manufacturing') as TopTabId;
  const [mfgTab, setMfgTab] = useState<MfgTabId>('overview');

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Manufacturing & Imagery"
          subtitle="In-space manufacturing intelligence and satellite imagery marketplace -- pharmaceutical production, advanced materials, Earth observation providers, and the emerging orbital economy"
          icon="🏭"
          accentColor="emerald"
        />

        {/* Top-Level Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1">
            <Link
              href="/space-manufacturing"
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                topTab === 'manufacturing'
                  ? 'border-nebula-500 text-nebula-300'
                  : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <span className="mr-1.5">{'🏭'}</span>
              Space Manufacturing
            </Link>
            <Link
              href="/space-manufacturing?tab=imagery"
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                topTab === 'imagery'
                  ? 'border-cyan-500 text-cyan-300'
                  : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <span className="mr-1.5">{'\uD83D\uDEF0\uFE0F'}</span>
              Imagery Marketplace
            </Link>
          </div>
        </div>

        {/* Manufacturing Content */}
        {topTab === 'manufacturing' && (
          <>
            {/* Manufacturing Sub-Tab Navigation */}
            <div className="border-b border-slate-700/50 mb-8">
              <div className="flex gap-1 overflow-x-auto">
                {MFG_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMfgTab(tab.id)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      mfgTab === tab.id
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

            {mfgTab === 'overview' && <OverviewTab />}
            {mfgTab === 'companies' && <CompaniesTab />}
            {mfgTab === 'iss-lab' && <ISSLabTab />}
            {mfgTab === 'products' && <ProductsTab />}
          </>
        )}

        {/* Imagery Marketplace Content */}
        {topTab === 'imagery' && <ImageryMarketplaceContent />}

        {/* Related Modules */}
        <ScrollReveal><div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur mt-8">
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
        </div></ScrollReveal>
      </div>
    </div>
  );
}

export default function SpaceManufacturingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-star-300">Loading...</div></div>}>
      <ManufacturingAndImageryContent />
    </Suspense>
  );
}
