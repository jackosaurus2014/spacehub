'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MiningBody,
  MiningResource,
  CommodityPrice,
  MiningBodyType,
  SpectralType,
  TrajectoryStatus,
  ValueConfidence,
  MINING_BODY_TYPES,
  SPECTRAL_TYPES,
  formatLargeValue,
  formatDistance,
  formatMass,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import { clientLogger } from '@/lib/client-logger';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface MiningStats {
  totalBodies: number;
  totalResources: number;
  totalCommodities: number;
  accessibleBodies: number;
  totalEstimatedValue: number;
  bodiesByType: Record<string, number>;
  bodiesBySpectralType: Record<string, number>;
}

interface SpaceMiningData {
  bodies: MiningBody[];
  total: number;
}

interface MiningTarget {
  full_name: string;
  spec_B: string | null;
  spec_T: string | null;
  profit: number | null;
  price: number | null;
  closeness: number | null;
  accessibility: number | null;
  score: number | null;
  moid: number | null;
  a: number | null;
  e: number | null;
  i: number | null;
  diameter: number | null;
  description?: string;
  keyResources?: string[];
  missionStatus?: string;
}

interface MiningCompany {
  name: string;
  focus: string;
  description: string;
  founded: string;
  status: 'active' | 'acquired' | 'stealth' | 'pre-revenue';
  website: string;
  keyTech: string[];
  fundingStage: string;
  targetBodies: string[];
}

interface ResourceEstimate {
  resource: string;
  category: 'volatile' | 'precious_metal' | 'rare_earth' | 'fuel' | 'structural';
  earthPrice: string;
  inSpaceValue: string;
  primarySources: string[];
  applications: string[];
  demandOutlook: 'very_high' | 'high' | 'medium' | 'emerging';
  notes: string;
}

interface MiningTechnology {
  name: string;
  category: 'extraction' | 'processing' | 'transport' | 'prospecting';
  trl: number; // Technology Readiness Level 1-9
  description: string;
  advantages: string[];
  challenges: string[];
  developers: string[];
  applicableBodies: string[];
}

type TabId = 'overview' | 'asteroids' | 'moons' | 'planets' | 'commodities' | 'companies' | 'technologies' | 'resources';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TRAJECTORY_STYLES: Record<TrajectoryStatus, { label: string; color: string; bg: string }> = {
  accessible: { label: 'Accessible', color: 'text-green-400', bg: 'bg-green-900/20' },
  challenging: { label: 'Challenging', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  difficult: { label: 'Difficult', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  not_feasible: { label: 'Not Feasible', color: 'text-red-400', bg: 'bg-red-900/20' },
};

const DEFAULT_TRAJECTORY_STYLE = { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-900/20' };

const CONFIDENCE_STYLES: Record<ValueConfidence, { label: string; color: string }> = {
  high: { label: 'High Confidence', color: 'text-green-400' },
  medium: { label: 'Medium Confidence', color: 'text-yellow-400' },
  low: { label: 'Low Confidence', color: 'text-orange-400' },
  speculative: { label: 'Speculative', color: 'text-red-400' },
};

const DEFAULT_CONFIDENCE_STYLE = { label: 'Unknown', color: 'text-slate-400' };

const SPECTRAL_TYPE_INFO: Record<string, { label: string; description: string; color: string }> = {
  C: { label: 'C-type (Carbonaceous)', description: 'Water-rich, organic compounds', color: 'text-blue-400' },
  S: { label: 'S-type (Silicaceous)', description: 'Stony, silicate minerals', color: 'text-yellow-400' },
  M: { label: 'M-type (Metallic)', description: 'Metal-rich, iron-nickel', color: 'text-slate-300' },
  V: { label: 'V-type (Vestoid)', description: 'Basaltic, pyroxene-rich', color: 'text-purple-400' },
  X: { label: 'X-type', description: 'Metallic or enstatite', color: 'text-slate-400' },
  D: { label: 'D-type', description: 'Dark, organic-rich', color: 'text-amber-400' },
  P: { label: 'P-type', description: 'Primitive, low albedo', color: 'text-amber-500' },
  E: { label: 'E-type (Enstatite)', description: 'Enstatite achondrite', color: 'text-cyan-400' },
  B: { label: 'B-type', description: 'Blue, volatile-rich', color: 'text-blue-300' },
  Q: { label: 'Q-type', description: 'Ordinary chondrite', color: 'text-orange-400' },
};

const DEFAULT_SPECTRAL_TYPE = { label: 'Unknown', description: 'Unknown spectral type', color: 'text-slate-400' };

// ────────────────────────────────────────
// Fallback Mining Targets
// ────────────────────────────────────────

const FALLBACK_MINING_TARGETS: MiningTarget[] = [
  {
    full_name: '16 Psyche',
    spec_B: 'Xk',
    spec_T: 'M',
    profit: 10000000000000000,
    price: 12500,
    closeness: 0.82,
    accessibility: 1.58,
    score: 9.8,
    moid: 1.5412,
    a: 2.9215,
    e: 0.1339,
    i: 3.0946,
    diameter: 226,
    description: 'Largest M-type asteroid in the main belt. Estimated ~$10,000 quadrillion in iron, nickel, and gold. NASA Psyche mission launched Oct 2023, arriving Aug 2029.',
    keyResources: ['Iron', 'Nickel', 'Gold', 'Platinum'],
    missionStatus: 'NASA Psyche spacecraft en route (arrival 2029)',
  },
  {
    full_name: '3554 Amun',
    spec_B: null,
    spec_T: 'M',
    profit: 20000000000000,
    price: 8200,
    closeness: 1.45,
    accessibility: 1.82,
    score: 9.1,
    moid: 0.0904,
    a: 0.9737,
    e: 0.2814,
    i: 23.36,
    diameter: 2.48,
    description: 'Near-Earth metallic asteroid. One of the most accessible M-type NEAs for mining operations.',
    keyResources: ['Iron', 'Nickel', 'Cobalt', 'PGMs'],
    missionStatus: 'No missions planned',
  },
  {
    full_name: '241 Germania',
    spec_B: 'Cb',
    spec_T: 'C',
    profit: 95000000000000,
    price: 1850,
    closeness: 0.55,
    accessibility: 0.98,
    score: 8.5,
    moid: 1.7834,
    a: 3.0512,
    e: 0.1023,
    i: 5.5107,
    diameter: 169,
    description: 'Large carbonaceous main-belt asteroid. Potential source of water and carbon compounds.',
    keyResources: ['Water', 'Carbon', 'Organics', 'Silicates'],
    missionStatus: 'No missions planned',
  },
  {
    full_name: '162173 Ryugu',
    spec_B: 'Cg',
    spec_T: 'C',
    profit: 83000000000,
    price: 6300,
    closeness: 1.72,
    accessibility: 1.95,
    score: 8.2,
    moid: 0.0601,
    a: 1.1896,
    e: 0.1902,
    i: 5.8837,
    diameter: 0.896,
    description: 'C-type NEA visited by JAXA Hayabusa2. Sample returned Dec 2020 confirmed water-rich minerals, amino acids, and organic compounds. Diamond-shaped rubble pile.',
    keyResources: ['Water', 'Amino Acids', 'Organics', 'Hydrated Minerals'],
    missionStatus: 'Sample returned by Hayabusa2 (2020)',
  },
  {
    full_name: '101955 Bennu',
    spec_B: 'B',
    spec_T: 'B',
    profit: 669000000,
    price: 4800,
    closeness: 1.81,
    accessibility: 2.01,
    score: 7.9,
    moid: 0.0032,
    a: 1.1264,
    e: 0.2037,
    i: 6.0349,
    diameter: 0.4897,
    description: 'B-type NEA visited by NASA OSIRIS-REx. 121g sample returned Sep 2023 revealed water-bearing clays, carbon, and sulfur. Highly accessible for future missions.',
    keyResources: ['Water', 'Carbon', 'Sulfur', 'Magnetite'],
    missionStatus: 'Sample returned by OSIRIS-REx (2023)',
  },
  {
    full_name: '4660 Nereus',
    spec_B: 'Xe',
    spec_T: 'E',
    profit: 4800000000,
    price: 7400,
    closeness: 1.92,
    accessibility: 2.38,
    score: 8.0,
    moid: 0.0029,
    a: 1.4891,
    e: 0.3600,
    i: 1.4316,
    diameter: 0.33,
    description: 'One of the easiest NEAs to reach with only ~4.9 km/s round-trip delta-V. Small but highly accessible target for early mining demonstrations.',
    keyResources: ['Iron', 'Nickel', 'Cobalt', 'Silicates'],
    missionStatus: 'JAXA Hayabusa considered as target; no active mission',
  },
  {
    full_name: '511 Davida',
    spec_B: 'C',
    spec_T: 'C',
    profit: 26700000000000,
    price: 1200,
    closeness: 0.48,
    accessibility: 0.85,
    score: 7.5,
    moid: 1.7611,
    a: 3.1684,
    e: 0.1862,
    i: 15.9387,
    diameter: 326,
    description: 'One of the largest C-type asteroids (326 km diameter). Massive potential water source. Low-albedo surface suggests volatile-rich composition.',
    keyResources: ['Water', 'Carbon', 'Organics', 'Silicates'],
    missionStatus: 'No missions planned',
  },
  {
    full_name: '2016 ED85',
    spec_B: null,
    spec_T: null,
    profit: 1200000000,
    price: 5600,
    closeness: 1.88,
    accessibility: 2.22,
    score: 7.2,
    moid: 0.0156,
    a: 1.0058,
    e: 0.0749,
    i: 4.0213,
    diameter: 0.015,
    description: 'Small near-Earth asteroid with very favorable delta-V for rendezvous. Low inclination and near-circular orbit make it an ideal early mining target.',
    keyResources: ['Unknown - requires prospecting'],
    missionStatus: 'No missions planned; flagged as high-priority prospecting target',
  },
  {
    full_name: '1 Ceres',
    spec_B: 'C',
    spec_T: 'G',
    profit: 72000000000000,
    price: 980,
    closeness: 0.42,
    accessibility: 0.75,
    score: 7.6,
    moid: 1.5926,
    a: 2.7691,
    e: 0.0758,
    i: 10.5934,
    diameter: 939.4,
    description: 'Largest object in the asteroid belt, dwarf planet. NASA Dawn mission confirmed subsurface water ice. Could serve as deep-space resource depot.',
    keyResources: ['Water Ice', 'Ammonia', 'Clays', 'Salts'],
    missionStatus: 'Orbited by NASA Dawn (2015-2018)',
  },
  {
    full_name: '433 Eros',
    spec_B: 'S',
    spec_T: 'S',
    profit: 1200000000000,
    price: 3100,
    closeness: 1.35,
    accessibility: 1.67,
    score: 7.3,
    moid: 0.1491,
    a: 1.4583,
    e: 0.2227,
    i: 10.8289,
    diameter: 16.84,
    description: 'One of the best-studied NEAs. NASA NEAR Shoemaker orbited and landed in 2001. Rich in silicates with significant iron content.',
    keyResources: ['Iron', 'Magnesium', 'Silicon', 'Aluminum'],
    missionStatus: 'Visited by NEAR Shoemaker (2001)',
  },
  {
    full_name: '2011 UW158',
    spec_B: null,
    spec_T: null,
    profit: 5400000000000,
    price: 15200,
    closeness: 1.56,
    accessibility: 1.74,
    score: 7.0,
    moid: 0.0174,
    a: 1.6197,
    e: 0.3755,
    i: 4.7862,
    diameter: 0.457,
    description: 'Platinum-rich NEA estimated to contain $5.4 trillion in precious metals. Radar observations suggest dense metallic composition.',
    keyResources: ['Platinum', 'Gold', 'Iron', 'Nickel'],
    missionStatus: 'No missions planned',
  },
  {
    full_name: '1986 DA',
    spec_B: null,
    spec_T: 'M',
    profit: 27000000000000,
    price: 9700,
    closeness: 0.91,
    accessibility: 1.12,
    score: 6.8,
    moid: 0.3512,
    a: 2.8165,
    e: 0.5854,
    i: 4.2971,
    diameter: 2.3,
    description: 'Metallic NEA estimated at $1.4 trillion in precious metals. Radar data confirms iron-nickel composition with platinum group metals.',
    keyResources: ['Iron', 'Nickel', 'Platinum', 'Gold'],
    missionStatus: 'No missions planned; high-value target',
  },
  {
    full_name: 'Moon (Lunar Regolith)',
    spec_B: null,
    spec_T: null,
    profit: 500000000000,
    price: 2500,
    closeness: 2.0,
    accessibility: 2.5,
    score: 6.5,
    moid: 0.0026,
    a: null,
    e: null,
    i: null,
    diameter: 3474.8,
    description: 'Earth\'s Moon is the nearest and most accessible body for resource extraction. Permanently shadowed craters at the poles contain water ice. Helium-3 in regolith is a potential fusion fuel.',
    keyResources: ['Water Ice', 'Helium-3', 'Iron', 'Titanium', 'Silicon'],
    missionStatus: 'Multiple missions (Artemis, CLPS, Chang\'e, Chandrayaan)',
  },
];

// ────────────────────────────────────────
// Space Mining Companies
// ────────────────────────────────────────

const MINING_COMPANIES: MiningCompany[] = [
  {
    name: 'AstroForge',
    focus: 'Platinum Group Metals from Asteroids',
    description: 'Los Angeles-based startup focused on refining platinum group metals from asteroids. Launched first test payload on SpaceX rideshare (Odin) in April 2023. Second mission (Vestri) aimed at asteroid flyby.',
    founded: '2022',
    status: 'active',
    website: 'https://www.astroforge.com',
    keyTech: ['In-space refining', 'CubeSat prospectors', 'Platinum extraction'],
    fundingStage: 'Series A ($13M)',
    targetBodies: ['Near-Earth asteroids', 'M-type asteroids'],
  },
  {
    name: 'TransAstra',
    focus: 'Optical Mining & Asteroid Capture',
    description: 'Pioneering optical mining technology using concentrated sunlight to excavate volatiles from asteroids. Developing capture bags for small asteroid redirect and processing. NASA-funded research.',
    founded: '2015',
    status: 'active',
    website: 'https://www.transastracorp.com',
    keyTech: ['Optical mining (solar thermal)', 'Capture bags', 'Worker Bee spacecraft', 'Omnivore thruster'],
    fundingStage: 'Series A ($20M+)',
    targetBodies: ['C-type NEAs', 'Carbonaceous asteroids', 'Small NEAs (<50m)'],
  },
  {
    name: 'OffWorld',
    focus: 'Robotic Mining Systems',
    description: 'Developing autonomous robotic mining platforms for Moon, Mars, and asteroids. AI-driven swarm robotics approach to resource extraction and construction.',
    founded: '2016',
    status: 'active',
    website: 'https://www.offworld.ai',
    keyTech: ['AI-driven swarm robots', 'Autonomous excavation', 'Machine learning', 'Modular robotic platforms'],
    fundingStage: 'Series A ($10M+)',
    targetBodies: ['Moon', 'Mars', 'Near-Earth asteroids'],
  },
  {
    name: 'ispace',
    focus: 'Lunar Resource Exploration',
    description: 'Japanese company building lunar landers and rovers for resource exploration. HAKUTO-R Mission 1 attempted lunar landing (April 2023). Mission 2 planned with micro-rover.',
    founded: '2010',
    status: 'active',
    website: 'https://ispace-inc.com',
    keyTech: ['Lunar landers', 'Micro-rovers', 'Lunar mapping', 'Resource prospecting sensors'],
    fundingStage: 'Public (TSE: 9348, ~$200M+ raised)',
    targetBodies: ['Moon (polar regions)', 'Moon (permanently shadowed craters)'],
  },
  {
    name: 'Lunar Outpost',
    focus: 'Lunar Prospecting & Operations',
    description: 'Building the MAPP (Mobile Autonomous Prospecting Platform) rover for lunar surface operations. Selected by NASA for CLPS payload delivery. Focus on in-situ resource characterization.',
    founded: '2017',
    status: 'active',
    website: 'https://www.lunaroutpost.com',
    keyTech: ['MAPP rover', 'PROSPECT drill', 'LunaR resource scanner', 'Autonomous navigation'],
    fundingStage: 'Series A ($12M+)',
    targetBodies: ['Moon (south pole)', 'Moon (Shackleton Crater region)'],
  },
  {
    name: 'Shackleton Energy Company',
    focus: 'Lunar Water Mining for Propellant',
    description: 'Focused on harvesting water ice from permanently shadowed craters at the lunar poles and converting it to rocket propellant (LOX/LH2) for orbital fuel depots.',
    founded: '2007',
    status: 'pre-revenue',
    website: 'https://www.shackletonenergy.com',
    keyTech: ['Cryogenic extraction', 'Water electrolysis', 'Propellant depot architecture', 'Solar power towers'],
    fundingStage: 'Seed',
    targetBodies: ['Moon (Shackleton Crater)', 'Moon (south pole PSRs)'],
  },
  {
    name: 'Karman+',
    focus: 'Space Resources Venture',
    description: 'Successor to Deep Space Industries (acquired by Bradford Space in 2019). Continuing development of asteroid prospecting and resource utilization technologies under new venture structure.',
    founded: '2020',
    status: 'stealth',
    website: 'https://karmanplus.com',
    keyTech: ['Asteroid prospecting', 'Water extraction', 'In-space manufacturing', 'Propellant production'],
    fundingStage: 'Pre-seed',
    targetBodies: ['C-type NEAs', 'Water-rich asteroids'],
  },
];

// ────────────────────────────────────────
// Resource Value Estimates
// ────────────────────────────────────────

const RESOURCE_ESTIMATES: ResourceEstimate[] = [
  {
    resource: 'Water (In-Space)',
    category: 'volatile',
    earthPrice: '$0.001/kg (Earth surface)',
    inSpaceValue: '$1M - $10M per ton',
    primarySources: ['C-type asteroids', 'Lunar poles', 'Mars ice caps', 'Ceres'],
    applications: ['Rocket propellant (H2/O2)', 'Life support', 'Radiation shielding', 'Agriculture'],
    demandOutlook: 'very_high',
    notes: 'Most valuable near-term space resource. Eliminates need to launch from Earth. Lunar water at ~$500K/ton from surface; cislunar delivery at $1M-10M/ton.',
  },
  {
    resource: 'Platinum Group Metals',
    category: 'precious_metal',
    earthPrice: '$25,000 - $50,000/oz',
    inSpaceValue: '$25,000 - $50,000/oz (returned to Earth)',
    primarySources: ['M-type asteroids', 'Iron meteorites', '16 Psyche', '1986 DA'],
    applications: ['Catalytic converters', 'Electronics', 'Hydrogen fuel cells', 'Medical devices'],
    demandOutlook: 'high',
    notes: 'Platinum, palladium, rhodium, iridium, osmium, ruthenium. A single 500m M-type asteroid may contain more PGMs than ever mined on Earth.',
  },
  {
    resource: 'Rare Earth Elements',
    category: 'rare_earth',
    earthPrice: '$2,000 - $100,000/ton',
    inSpaceValue: 'Strategic value (supply chain diversification)',
    primarySources: ['S-type asteroids', 'Lunar regolith', 'Differentiated asteroids'],
    applications: ['Magnets', 'Batteries', 'Electronics', 'Wind turbines', 'Military systems'],
    demandOutlook: 'high',
    notes: 'Neodymium, europium, yttrium, etc. Currently 60%+ sourced from China. Space mining could diversify supply chains for critical defense and energy technologies.',
  },
  {
    resource: 'Helium-3 (Lunar)',
    category: 'fuel',
    earthPrice: '$16,000/g (research grade)',
    inSpaceValue: '$3 billion/ton (estimated fusion fuel)',
    primarySources: ['Lunar regolith (solar wind implanted)', 'Gas giants (long-term)'],
    applications: ['Fusion reactor fuel (D-He3)', 'Cryogenics', 'Medical imaging (MRI)', 'Neutron detectors'],
    demandOutlook: 'emerging',
    notes: 'Extremely rare on Earth (<0.001 ppm) but implanted in lunar soil by solar wind at ~20-50 ppb. Potential clean fusion fuel with no radioactive waste. Requires large-scale regolith processing.',
  },
  {
    resource: 'Iron/Nickel (In-Space)',
    category: 'structural',
    earthPrice: '$0.05 - $0.50/kg (Earth)',
    inSpaceValue: '$500 - $5,000/kg (in-orbit use)',
    primarySources: ['M-type asteroids', 'S-type asteroids', 'Iron meteorites', 'Lunar regolith'],
    applications: ['In-space construction', 'Radiation shielding', 'Structural components', '3D-printed habitats'],
    demandOutlook: 'medium',
    notes: 'Cheap on Earth but extremely expensive to launch to orbit (~$2,700/kg to LEO). In-space value is driven by avoiding launch costs. Foundation for orbital construction.',
  },
  {
    resource: 'Silicon & Solar Cell Materials',
    category: 'structural',
    earthPrice: '$1 - $3/kg (metallurgical grade)',
    inSpaceValue: '$10,000 - $50,000/kg (solar-grade, in orbit)',
    primarySources: ['S-type asteroids', 'Lunar regolith', 'V-type asteroids'],
    applications: ['Solar panels', 'Semiconductor devices', 'Glass/ceramics', 'Optical fiber'],
    demandOutlook: 'high',
    notes: 'Key material for space-based solar power. Processing in microgravity could produce higher-purity crystals. Enables large-scale solar arrays without Earth launches.',
  },
  {
    resource: 'Carbon & Organics',
    category: 'volatile',
    earthPrice: 'Variable by form',
    inSpaceValue: '$50,000 - $500,000/ton (in-space)',
    primarySources: ['C-type asteroids', 'D-type asteroids', 'Comets', 'Ryugu', 'Bennu'],
    applications: ['Carbon fiber composites', 'Life support (CO2)', 'Plastics', 'Fuel synthesis'],
    demandOutlook: 'medium',
    notes: 'Carbonaceous asteroids are 10-20% carbon by mass. Essential for manufacturing composites and polymers in space. Combined with hydrogen for synthetic fuels.',
  },
];

// ────────────────────────────────────────
// Mining Technologies
// ────────────────────────────────────────

const MINING_TECHNOLOGIES: MiningTechnology[] = [
  {
    name: 'Optical Mining (Concentrated Solar Thermal)',
    category: 'extraction',
    trl: 4,
    description: 'Uses concentrated sunlight via inflatable reflectors to heat asteroid surfaces to 300-1000C, sublimating volatiles (water, CO2) which are captured in enclosing bags. No moving parts needed for volatile extraction.',
    advantages: ['No mechanical contact needed', 'Works in microgravity', 'Scalable with larger reflectors', 'Extracts water without drilling', 'Low power requirements'],
    challenges: ['Requires sunlight (no shadowed regions)', 'Limited to volatile-rich bodies', 'Thermal cycling stress', 'Bag containment at scale'],
    developers: ['TransAstra', 'University of Central Florida'],
    applicableBodies: ['C-type asteroids', 'Carbonaceous NEAs', 'Comets', 'Icy moons'],
  },
  {
    name: 'Mechanical Excavation & Drilling',
    category: 'extraction',
    trl: 6,
    description: 'Traditional drilling, scooping, and excavation adapted for low-gravity environments. Includes bucket drums, auger drills, pneumatic excavators, and trenching systems. Well understood but requires anchoring.',
    advantages: ['Proven terrestrial technology', 'Works on all body types', 'Can process regolith directly', 'Precise material targeting'],
    challenges: ['Anchoring in microgravity', 'Dust management', 'Power requirements', 'Mechanical wear in vacuum', 'Tool replacement logistics'],
    developers: ['Lunar Outpost (MAPP)', 'Honeybee Robotics (TRIDENT drill)', 'OffWorld', 'Caterpillar (Lunar partnership)'],
    applicableBodies: ['Moon', 'Mars', 'Large asteroids', 'Phobos/Deimos'],
  },
  {
    name: 'Electrochemical Extraction (Molten Oxide Electrolysis)',
    category: 'processing',
    trl: 4,
    description: 'Uses electrical current to reduce metal oxides in molten regolith, separating pure metals and producing oxygen as a byproduct. Can extract iron, aluminum, titanium, and silicon from regolith.',
    advantages: ['Produces oxygen byproduct', 'Works with any oxide-bearing regolith', 'No consumable reagents', 'Can process multiple metals simultaneously'],
    challenges: ['High temperature requirements (1600+C)', 'Electrode degradation', 'High energy consumption', 'Complex thermal management in vacuum'],
    developers: ['MIT (Donald Sadoway group)', 'ESA (PROSPECT)', 'NASA (ISRU projects)'],
    applicableBodies: ['Moon', 'Mars', 'S-type asteroids', 'Rocky bodies'],
  },
  {
    name: 'In-Situ Resource Utilization (ISRU)',
    category: 'processing',
    trl: 6,
    description: 'Umbrella term for processing local materials into useful products on-site. Includes water ice extraction, oxygen production from regolith, propellant synthesis (Sabatier process), and building material fabrication.',
    advantages: ['Eliminates Earth launch costs', 'Enables sustainable presence', 'Multiple product outputs', 'NASA & ESA extensively researched'],
    challenges: ['Complex multi-step processes', 'Requires reliable power source', 'Maintenance in remote locations', 'Scale-up from demos to production'],
    developers: ['NASA (MOXIE on Perseverance)', 'ESA', 'Blue Origin (Blue Alchemist)', 'Lockheed Martin'],
    applicableBodies: ['Moon', 'Mars', 'Any body with suitable feedstock'],
  },
  {
    name: 'Beneficiation in Microgravity',
    category: 'processing',
    trl: 3,
    description: 'Separation and concentration of valuable minerals from bulk regolith in microgravity. Techniques include magnetic separation, electrostatic sorting, centrifugal processing, and froth flotation adaptations.',
    advantages: ['Low energy vs. melting', 'Can use waste heat', 'Concentrates ore before smelting', 'Reduces processing volume'],
    challenges: ['Fluid dynamics in microgravity', 'Dust particle behavior', 'No settling under low-g', 'Untested at scale'],
    developers: ['Colorado School of Mines', 'University of Adelaide', 'AstroForge'],
    applicableBodies: ['Asteroids', 'Lunar regolith', 'Martian soil'],
  },
  {
    name: 'Magnetic/Electrostatic Separation',
    category: 'processing',
    trl: 5,
    description: 'Uses magnetic fields or electrostatic charge to separate metallic particles from silicate regolith. Iron and nickel particles in regolith are naturally magnetic. UV-charged dust can be electrostatically separated.',
    advantages: ['Works in vacuum', 'Low energy requirement', 'No fluids or reagents needed', 'Continuous operation'],
    challenges: ['Limited to magnetic/chargeable materials', 'Particle size dependency', 'Static charge control in plasma environment'],
    developers: ['Kennedy Space Center', 'Lunar Outpost', 'Honeybee Robotics'],
    applicableBodies: ['Moon', 'Metal-rich asteroids', 'Mars'],
  },
  {
    name: 'Asteroid Capture & Redirect',
    category: 'transport',
    trl: 3,
    description: 'Capturing small asteroids (5-20m diameter) and redirecting them to stable orbits near Earth or Moon for processing. Uses gravity tractors, ion beam deflection, or physical capture bags.',
    advantages: ['Brings resources to processing facility', 'Enables thorough extraction', 'Lower per-kg transport cost for small bodies', 'Proof of concept studied by NASA ARM'],
    challenges: ['Limited to very small asteroids', 'Long transit times', 'Orbital mechanics complexity', 'Planetary protection concerns'],
    developers: ['TransAstra', 'NASA (ARM study, cancelled)', 'Made In Space'],
    applicableBodies: ['Small NEAs (<20m)', 'Near-Earth objects with low delta-V'],
  },
  {
    name: 'Laser/Microwave Ablation',
    category: 'extraction',
    trl: 3,
    description: 'High-energy lasers or microwave emitters heat targeted surface areas to fracture, ablate, or vaporize material. Can be precisely controlled for selective mining of specific mineral veins.',
    advantages: ['Precise targeting', 'No physical contact', 'Works in vacuum', 'Can operate from orbit'],
    challenges: ['Extremely high power requirements', 'Limited depth penetration', 'Heat management', 'Targeting accuracy at distance'],
    developers: ['TransAstra (solar variant)', 'Momentus', 'Masten Space Systems'],
    applicableBodies: ['Asteroids', 'Moon', 'Any rocky body'],
  },
];

const BODY_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'bodyType', label: 'Type' },
  { key: 'spectralType', label: 'Spectral Type' },
  { key: 'diameter', label: 'Diameter (km)' },
  { key: 'mass', label: 'Mass (kg)' },
  { key: 'deltaV', label: 'Delta-V (km/s)' },
  { key: 'trajectoryStatus', label: 'Accessibility' },
  { key: 'estimatedValue', label: 'Est. Value ($)' },
  { key: 'valueConfidence', label: 'Confidence' },
];

const COMMODITY_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'category', label: 'Category' },
  { key: 'pricePerKg', label: 'Price ($/kg)' },
  { key: 'pricePerTonne', label: 'Price ($/tonne)' },
  { key: 'annualProduction', label: 'Annual Production (tonnes)' },
  { key: 'inSpaceValue', label: 'In-Space Value ($/kg)' },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0';
  return n.toLocaleString();
}

function formatProfit(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPricePerKgShort(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M/kg`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K/kg`;
  return `$${value.toFixed(2)}/kg`;
}

function getBodyIcon(bodyType: MiningBodyType): string {
  const icon = MINING_BODY_TYPES.find(t => t.value === bodyType)?.icon;
  return icon || '🪨';
}

function getSpectralColor(spectralType: SpectralType | null | undefined): string {
  if (!spectralType) return 'text-slate-400';
  return (SPECTRAL_TYPE_INFO[spectralType] || DEFAULT_SPECTRAL_TYPE).color;
}

function getDeltaVColor(deltaV: number | null | undefined): string {
  if (!deltaV) return 'text-slate-400';
  if (deltaV <= 5) return 'text-green-400';
  if (deltaV <= 8) return 'text-yellow-400';
  if (deltaV <= 12) return 'text-orange-400';
  return 'text-red-400';
}

function formatDeltaV(deltaV: number | null | undefined): string {
  if (!deltaV) return 'Unknown';
  return `${deltaV.toFixed(1)} km/s`;
}

function parseComposition(composition: string | Record<string, number> | null): Record<string, number> {
  if (!composition) return {};
  if (typeof composition === 'string') {
    try {
      return JSON.parse(composition);
    } catch {
      return {};
    }
  }
  return composition;
}

function parseMissionHistory(missionHistory: string | string[] | null): string[] {
  if (!missionHistory) return [];
  if (typeof missionHistory === 'string') {
    try {
      return JSON.parse(missionHistory);
    } catch {
      return [];
    }
  }
  return missionHistory;
}

// ────────────────────────────────────────
// Mining Body Card
// ────────────────────────────────────────

function MiningBodyCard({ body }: { body: MiningBody }) {
  const trajectory = body.trajectoryStatus ? (TRAJECTORY_STYLES[body.trajectoryStatus] || DEFAULT_TRAJECTORY_STYLE) : null;
  const confidence = body.valueConfidence ? (CONFIDENCE_STYLES[body.valueConfidence] || DEFAULT_CONFIDENCE_STYLE) : null;
  const composition = parseComposition(body.composition as Record<string, number> | string | null);
  const missionHistory = parseMissionHistory(body.missionHistory as string[] | string | null);
  const topResources = Object.entries(composition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-amber-500/30 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getBodyIcon(body.bodyType)}</span>
          <div>
            <h3 className="text-white font-semibold text-lg">{body.name}</h3>
            {body.designation && (
              <span className="text-slate-400 text-sm">{body.designation}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {trajectory && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${trajectory.bg} ${trajectory.color}`}>
              {trajectory.label}
            </span>
          )}
          {body.spectralType && (
            <span className={`text-xs ${getSpectralColor(body.spectralType)}`}>
              {body.spectralType}-type
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {body.description && (
        <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2">{body.description}</p>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-2.5 text-center border border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Value</div>
          <div className="text-white font-bold text-sm">
            {body.estimatedValue ? formatLargeValue(body.estimatedValue) : 'Unknown'}
          </div>
          {confidence && (
            <div className={`text-xs ${confidence.color}`}>{confidence.label}</div>
          )}
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2.5 text-center border border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Delta-V</div>
          <div className={`font-bold text-sm ${getDeltaVColor(body.deltaV)}`}>
            {formatDeltaV(body.deltaV)}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2.5 text-center border border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Diameter</div>
          <div className="text-white font-bold text-sm">
            {body.diameter ? formatDistance(body.diameter) : 'Unknown'}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2.5 text-center border border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Mass</div>
          <div className="text-white font-bold text-sm">
            {body.mass ? formatMass(body.mass) : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Composition */}
      {topResources.length > 0 && (
        <div className="mb-4">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-2">Composition</div>
          <div className="flex flex-wrap gap-1.5">
            {topResources.map(([resource, percent]) => (
              <span
                key={resource}
                className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-medium"
              >
                {resource}: {percent}%
              </span>
            ))}

        <RelatedModules modules={PAGE_RELATIONS['space-mining']} />
          </div>
        </div>
      )}

      {/* Orbital Info */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 border-t border-slate-700/30 pt-3">
        {body.orbitalFamily && (
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Family:</span> {body.orbitalFamily}
          </span>
        )}
        {body.semiMajorAxis && (
          <span className="flex items-center gap-1">
            <span className="text-slate-500">SMA:</span> {body.semiMajorAxis.toFixed(3)} AU
          </span>
        )}
        {body.orbitalPeriod && (
          <span className="flex items-center gap-1">
            <span className="text-slate-500">Period:</span> {body.orbitalPeriod.toFixed(2)} years
          </span>
        )}
      </div>

      {/* Mission History */}
      {missionHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Missions</div>
          <div className="text-slate-400 text-xs">{missionHistory.join(', ')}</div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Commodity Card
// ────────────────────────────────────────

function CommodityCard({ commodity }: { commodity: CommodityPrice }) {
  const categoryLabels: Record<string, { label: string; color: string }> = {
    precious_metal: { label: 'Precious Metal', color: 'text-yellow-400' },
    industrial_metal: { label: 'Industrial Metal', color: 'text-slate-400' },
    rare_earth: { label: 'Rare Earth', color: 'text-purple-400' },
    volatile: { label: 'Volatile', color: 'text-blue-400' },
    mineral: { label: 'Mineral', color: 'text-amber-400' },
  };

  const categoryInfo = categoryLabels[commodity.category] || { label: commodity.category, color: 'text-slate-400' };
  let spaceApplications: string[] = [];
  try {
    spaceApplications = typeof commodity.spaceApplications === 'string'
      ? JSON.parse(commodity.spaceApplications)
      : commodity.spaceApplications || [];
  } catch { /* ignore malformed JSON */ }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-amber-500/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-semibold">{commodity.name}</h4>
          {commodity.symbol && (
            <span className="text-slate-400 text-sm">{commodity.symbol}</span>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${categoryInfo.color} bg-slate-700/50`}>
          {categoryInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-900/50 rounded p-2 border border-slate-700/30">
          <div className="text-slate-400 text-xs">Earth Price</div>
          <div className="text-white font-bold text-sm">
            ${commodity.pricePerKg != null
              ? (commodity.pricePerKg >= 1000
                  ? formatNumber(commodity.pricePerKg)
                  : commodity.pricePerKg.toFixed(2))
              : '0'}/kg
          </div>
        </div>
        {commodity.inSpaceValue && (
          <div className="bg-amber-500/10 rounded p-2 border border-amber-500/20">
            <div className="text-amber-400 text-xs">In-Space Value</div>
            <div className="text-amber-300 font-bold text-sm">
              ${formatNumber(commodity.inSpaceValue)}/kg
            </div>
          </div>
        )}
      </div>

      {commodity.annualProduction && (
        <div className="text-slate-400 text-xs mb-2">
          Annual Production: {formatNumber(commodity.annualProduction)} tonnes
        </div>
      )}

      {spaceApplications.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {spaceApplications.slice(0, 3).map((app: string) => (
            <span key={app} className="px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">
              {app}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Stats Card
// ────────────────────────────────────────

function StatsCard({ label, value, subValue, icon }: { label: string; value: string; subValue?: string; icon: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-widest">{label}</div>
          <div className="text-white font-bold text-xl">{value}</div>
          {subValue && <div className="text-slate-400 text-xs">{subValue}</div>}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Company Card
// ────────────────────────────────────────

const COMPANY_STATUS_STYLES: Record<MiningCompany['status'], { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-900/30' },
  acquired: { label: 'Acquired', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  stealth: { label: 'Stealth', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  'pre-revenue': { label: 'Pre-Revenue', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
};

function CompanyCard({ company }: { company: MiningCompany }) {
  const statusStyle = COMPANY_STATUS_STYLES[company.status];
  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold text-lg">{company.name}</h3>
          <p className="text-cyan-400 text-sm font-medium">{company.focus}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.color}`}>
          {statusStyle.label}
        </span>
      </div>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{company.description}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Founded</div>
          <div className="text-white font-bold text-sm">{company.founded}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Funding</div>
          <div className="text-white font-bold text-sm">{company.fundingStage}</div>
        </div>
      </div>
      <div className="mb-3">
        <div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Key Technologies</div>
        <div className="flex flex-wrap gap-1.5">
          {company.keyTech.map((tech) => (
            <span key={tech} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs font-medium">{tech}</span>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Target Bodies</div>
        <div className="flex flex-wrap gap-1.5">
          {company.targetBodies.map((target) => (
            <span key={target} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-medium">{target}</span>
          ))}
        </div>
      </div>
      <a
        href={company.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium inline-flex items-center gap-1 mt-1"
      >
        Visit Website
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
      </a>
    </div>
  );
}

// ────────────────────────────────────────
// Technology Card
// ────────────────────────────────────────

const TECH_CATEGORY_STYLES: Record<MiningTechnology['category'], { label: string; color: string; bg: string }> = {
  extraction: { label: 'Extraction', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  processing: { label: 'Processing', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  transport: { label: 'Transport', color: 'text-green-400', bg: 'bg-green-900/30' },
  prospecting: { label: 'Prospecting', color: 'text-purple-400', bg: 'bg-purple-900/30' },
};

function TechnologyCard({ tech }: { tech: MiningTechnology }) {
  const catStyle = TECH_CATEGORY_STYLES[tech.category];
  const trlColor = tech.trl >= 7 ? 'text-green-400' : tech.trl >= 5 ? 'text-yellow-400' : tech.trl >= 3 ? 'text-orange-400' : 'text-red-400';
  const trlBarWidth = `${(tech.trl / 9) * 100}%`;
  const trlBarColor = tech.trl >= 7 ? 'bg-green-500' : tech.trl >= 5 ? 'bg-yellow-500' : tech.trl >= 3 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-orange-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold text-lg pr-2">{tech.name}</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded whitespace-nowrap ${catStyle.bg} ${catStyle.color}`}>
          {catStyle.label}
        </span>
      </div>

      {/* TRL indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 text-xs uppercase tracking-widest">Technology Readiness</span>
          <span className={`text-sm font-bold ${trlColor}`}>TRL {tech.trl}/9</span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-2">
          <div className={`h-2 rounded-full ${trlBarColor} transition-all`} style={{ width: trlBarWidth }} />
        </div>
      </div>

      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{tech.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-green-400 text-xs uppercase tracking-widest mb-1.5 font-semibold">Advantages</div>
          <ul className="space-y-1">
            {tech.advantages.slice(0, 4).map((adv) => (
              <li key={adv} className="text-slate-300 text-xs flex items-start gap-1.5">
                <span className="text-green-400 mt-0.5 shrink-0">+</span> {adv}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-red-400 text-xs uppercase tracking-widest mb-1.5 font-semibold">Challenges</div>
          <ul className="space-y-1">
            {tech.challenges.slice(0, 4).map((ch) => (
              <li key={ch} className="text-slate-300 text-xs flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5 shrink-0">-</span> {ch}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs border-t border-slate-700/30 pt-3">
        <div>
          <span className="text-slate-500">Developers: </span>
          <span className="text-slate-300">{tech.developers.join(', ')}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {tech.applicableBodies.map((body) => (
          <span key={body} className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">{body}</span>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Resource Estimate Card
// ────────────────────────────────────────

const RESOURCE_CATEGORY_STYLES: Record<ResourceEstimate['category'], { label: string; color: string; bg: string; icon: string }> = {
  volatile: { label: 'Volatile', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: '💧' },
  precious_metal: { label: 'Precious Metal', color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: '💰' },
  rare_earth: { label: 'Rare Earth', color: 'text-purple-400', bg: 'bg-purple-900/30', icon: '⚛' },
  fuel: { label: 'Fuel', color: 'text-red-400', bg: 'bg-red-900/30', icon: '🔥' },
  structural: { label: 'Structural', color: 'text-slate-300', bg: 'bg-slate-700/30', icon: '🏗' },
};

const DEMAND_STYLES: Record<ResourceEstimate['demandOutlook'], { label: string; color: string }> = {
  very_high: { label: 'Very High', color: 'text-green-400' },
  high: { label: 'High', color: 'text-emerald-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  emerging: { label: 'Emerging', color: 'text-cyan-400' },
};

function ResourceEstimateCard({ resource }: { resource: ResourceEstimate }) {
  const catStyle = RESOURCE_CATEGORY_STYLES[resource.category];
  const demandStyle = DEMAND_STYLES[resource.demandOutlook];

  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-purple-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{catStyle.icon}</span>
          <h3 className="text-white font-semibold text-lg">{resource.resource}</h3>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded ${catStyle.bg} ${catStyle.color}`}>
          {catStyle.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Earth Price</div>
          <div className="text-white font-bold text-sm">{resource.earthPrice}</div>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
          <div className="text-amber-400 text-xs uppercase tracking-widest mb-1">In-Space Value</div>
          <div className="text-amber-300 font-bold text-sm">{resource.inSpaceValue}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-slate-400 text-xs">Demand Outlook:</span>
        <span className={`text-xs font-bold ${demandStyle.color}`}>{demandStyle.label}</span>
      </div>

      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{resource.notes}</p>

      <div className="mb-3">
        <div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Primary Sources</div>
        <div className="flex flex-wrap gap-1.5">
          {resource.primarySources.map((src) => (
            <span key={src} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">{src}</span>
          ))}
        </div>
      </div>

      <div>
        <div className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Applications</div>
        <div className="flex flex-wrap gap-1.5">
          {resource.applications.map((app) => (
            <span key={app} className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">{app}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Search Input
// ────────────────────────────────────────

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder:text-slate-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Filter Bar
// ────────────────────────────────────────

function FilterBar({
  bodyType,
  setBodyType,
  spectralType,
  setSpectralType,
  trajectoryStatus,
  setTrajectoryStatus,
  sortBy,
  setSortBy,
}: {
  bodyType: MiningBodyType | '';
  setBodyType: (v: MiningBodyType | '') => void;
  spectralType: SpectralType | '';
  setSpectralType: (v: SpectralType | '') => void;
  trajectoryStatus: TrajectoryStatus | '';
  setTrajectoryStatus: (v: TrajectoryStatus | '') => void;
  sortBy: 'value' | 'deltaV' | 'diameter' | 'name';
  setSortBy: (v: 'value' | 'deltaV' | 'diameter' | 'name') => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={bodyType}
        onChange={(e) => setBodyType(e.target.value as MiningBodyType | '')}
        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
      >
        <option value="">All Body Types</option>
        {MINING_BODY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
        ))}
      </select>

      <select
        value={spectralType}
        onChange={(e) => setSpectralType(e.target.value as SpectralType | '')}
        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
      >
        <option value="">All Spectral Types</option>
        {SPECTRAL_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.value}-type: {t.label}</option>
        ))}
      </select>

      <select
        value={trajectoryStatus}
        onChange={(e) => setTrajectoryStatus(e.target.value as TrajectoryStatus | '')}
        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
      >
        <option value="">All Accessibility</option>
        {Object.entries(TRAJECTORY_STYLES).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as 'value' | 'deltaV' | 'diameter' | 'name')}
        className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
      >
        <option value="value">Sort by Value</option>
        <option value="deltaV">Sort by Delta-V</option>
        <option value="diameter">Sort by Size</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>
  );
}

// ────────────────────────────────────────
// Main Content Component
// ────────────────────────────────────────

function SpaceMiningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [bodies, setBodies] = useState<MiningBody[]>([]);
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mining targets from DynamicContent system
  const [miningTargets, setMiningTargets] = useState<MiningTarget[]>(FALLBACK_MINING_TARGETS);
  const [miningTargetsLoading, setMiningTargetsLoading] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [bodyType, setBodyType] = useState<MiningBodyType | ''>('');
  const [spectralType, setSpectralType] = useState<SpectralType | ''>('');
  const [trajectoryStatus, setTrajectoryStatus] = useState<TrajectoryStatus | ''>('');
  const [sortBy, setSortBy] = useState<'value' | 'deltaV' | 'diameter' | 'name'>('value');

  // Company/tech/resource filters
  const [companyStatusFilter, setCompanyStatusFilter] = useState<MiningCompany['status'] | ''>('');
  const [techCategoryFilter, setTechCategoryFilter] = useState<MiningTechnology['category'] | ''>('');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState<ResourceEstimate['category'] | ''>('');
  const [companySortBy, setCompanySortBy] = useState<'name' | 'founded' | 'status'>('name');
  const [techSortBy, setTechSortBy] = useState<'name' | 'trl' | 'category'>('trl');

  // Load tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = ['overview', 'asteroids', 'moons', 'planets', 'commodities', 'companies', 'technologies', 'resources'];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab as TabId);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/space-mining/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data.stats || data);
      } catch (err) {
        clientLogger.error('Failed to fetch stats', { error: err instanceof Error ? err.message : String(err) });
      }
    }
    fetchStats();
  }, []);

  // Fetch bodies
  useEffect(() => {
    async function fetchBodies() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (bodyType) params.set('bodyType', bodyType);
        if (spectralType) params.set('spectralType', spectralType);
        if (trajectoryStatus) params.set('trajectoryStatus', trajectoryStatus);
        params.set('sortBy', sortBy);
        params.set('limit', '100');

        const res = await fetch(`/api/space-mining?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch mining bodies');
        const data = await res.json();
        setBodies(data.bodies || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchBodies();
  }, [bodyType, spectralType, trajectoryStatus, sortBy]);

  // Fetch commodities
  useEffect(() => {
    async function fetchCommodities() {
      try {
        const res = await fetch('/api/space-mining/commodities');
        if (!res.ok) throw new Error('Failed to fetch commodities');
        const data = await res.json();
        setCommodities(data.commodities || []);
      } catch (err) {
        clientLogger.error('Failed to fetch commodities', { error: err instanceof Error ? err.message : String(err) });
      }
    }
    fetchCommodities();
  }, []);

  // Fetch mining targets from DynamicContent system
  useEffect(() => {
    async function fetchMiningTargets() {
      setMiningTargetsLoading(true);
      try {
        const res = await fetch('/api/content/space-mining?section=mining-targets');
        if (!res.ok) throw new Error('Failed to fetch mining targets');
        const json = await res.json();
        const targets: MiningTarget[] = json.data || [];
        // Sort by score descending, then by profit descending
        targets.sort((a, b) => {
          const scoreA = a.score ?? 0;
          const scoreB = b.score ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.profit ?? 0) - (a.profit ?? 0);
        });
        setMiningTargets(targets.length >= 5 ? targets : FALLBACK_MINING_TARGETS);
      } catch (err) {
        clientLogger.error('Failed to fetch mining targets', { error: err instanceof Error ? err.message : String(err) });
        setMiningTargets(FALLBACK_MINING_TARGETS);
      } finally {
        setMiningTargetsLoading(false);
      }
    }
    fetchMiningTargets();
  }, []);

  // Filter bodies by tab and search
  const searchLower = searchTerm.toLowerCase();
  const filteredBodies = bodies.filter((body) => {
    if (activeTab === 'asteroids' && body.bodyType !== 'asteroid') return false;
    if (activeTab === 'moons' && body.bodyType !== 'moon') return false;
    if (activeTab === 'planets' && body.bodyType !== 'planet' && body.bodyType !== 'dwarf_planet') return false;
    if (searchTerm) {
      return (
        body.name.toLowerCase().includes(searchLower) ||
        (body.designation && body.designation.toLowerCase().includes(searchLower)) ||
        (body.description && body.description.toLowerCase().includes(searchLower)) ||
        (body.orbitalFamily && body.orbitalFamily.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  // Filter commodities by search
  const filteredCommodities = commodities.filter((c) => {
    if (!searchTerm) return true;
    return (
      c.name.toLowerCase().includes(searchLower) ||
      (c.symbol && c.symbol.toLowerCase().includes(searchLower)) ||
      c.category.toLowerCase().includes(searchLower)
    );
  });

  // Filter companies
  const filteredCompanies = MINING_COMPANIES
    .filter((c) => {
      if (companyStatusFilter && c.status !== companyStatusFilter) return false;
      if (searchTerm) {
        return (
          c.name.toLowerCase().includes(searchLower) ||
          c.focus.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower) ||
          c.keyTech.some(t => t.toLowerCase().includes(searchLower)) ||
          c.targetBodies.some(b => b.toLowerCase().includes(searchLower))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (companySortBy === 'name') return a.name.localeCompare(b.name);
      if (companySortBy === 'founded') return parseInt(b.founded) - parseInt(a.founded);
      return a.status.localeCompare(b.status);
    });

  // Filter technologies
  const filteredTechnologies = MINING_TECHNOLOGIES
    .filter((t) => {
      if (techCategoryFilter && t.category !== techCategoryFilter) return false;
      if (searchTerm) {
        return (
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.developers.some(d => d.toLowerCase().includes(searchLower)) ||
          t.applicableBodies.some(b => b.toLowerCase().includes(searchLower))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (techSortBy === 'trl') return b.trl - a.trl;
      if (techSortBy === 'category') return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

  // Filter resources
  const filteredResources = RESOURCE_ESTIMATES.filter((r) => {
    if (resourceCategoryFilter && r.category !== resourceCategoryFilter) return false;
    if (searchTerm) {
      return (
        r.resource.toLowerCase().includes(searchLower) ||
        r.notes.toLowerCase().includes(searchLower) ||
        r.primarySources.some(s => s.toLowerCase().includes(searchLower)) ||
        r.applications.some(a => a.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  // Filter mining targets by search
  const filteredMiningTargets = miningTargets.filter((t) => {
    if (!searchTerm) return true;
    return (
      t.full_name.toLowerCase().includes(searchLower) ||
      (t.description && t.description.toLowerCase().includes(searchLower)) ||
      (t.keyResources && t.keyResources.some(r => r.toLowerCase().includes(searchLower))) ||
      (t.spec_T && t.spec_T.toLowerCase().includes(searchLower))
    );
  });

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🎯' },
    { id: 'asteroids', label: 'Asteroids', icon: '☄️' },
    { id: 'moons', label: 'Moons', icon: '🌙' },
    { id: 'planets', label: 'Planets', icon: '🪐' },
    { id: 'commodities', label: 'Commodities', icon: '💰' },
    { id: 'companies', label: 'Companies', icon: '🏢' },
    { id: 'technologies', label: 'Technologies', icon: '🔧' },
    { id: 'resources', label: 'Resources', icon: '💎' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            icon="🪨"
            label="Total Bodies"
            value={formatNumber(stats.totalBodies)}
            subValue={`${stats.accessibleBodies} accessible`}
          />
          <StatsCard
            icon="💎"
            label="Total Value"
            value={formatLargeValue(stats.totalEstimatedValue)}
            subValue="Combined estimate"
          />
          <StatsCard
            icon="☄️"
            label="Asteroids"
            value={formatNumber(stats.bodiesByType?.asteroid || 0)}
            subValue="Catalogued"
          />
          <StatsCard
            icon="🌙"
            label="Moons & Planets"
            value={formatNumber((stats.bodiesByType?.moon || 0) + (stats.bodiesByType?.planet || 0) + (stats.bodiesByType?.dwarf_planet || 0))}
            subValue="Major bodies"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-500/30">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-nebula-500 text-nebula-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                  : 'border-transparent text-slate-200 hover:text-white hover:border-slate-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Search */}
      <div className="max-w-md">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search asteroids, companies, technologies, resources..."
        />
      </div>

      {/* Tab-specific filters */}
      {(activeTab === 'overview' || activeTab === 'asteroids' || activeTab === 'moons' || activeTab === 'planets') && (
        <FilterBar
          bodyType={bodyType}
          setBodyType={setBodyType}
          spectralType={spectralType}
          setSpectralType={setSpectralType}
          trajectoryStatus={trajectoryStatus}
          setTrajectoryStatus={setTrajectoryStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      )}

      {activeTab === 'companies' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={companyStatusFilter}
            onChange={(e) => setCompanyStatusFilter(e.target.value as MiningCompany['status'] | '')}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pre-revenue">Pre-Revenue</option>
            <option value="stealth">Stealth</option>
            <option value="acquired">Acquired</option>
          </select>
          <select
            value={companySortBy}
            onChange={(e) => setCompanySortBy(e.target.value as 'name' | 'founded' | 'status')}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="founded">Sort by Founded</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      )}

      {activeTab === 'technologies' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={techCategoryFilter}
            onChange={(e) => setTechCategoryFilter(e.target.value as MiningTechnology['category'] | '')}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            <option value="">All Categories</option>
            <option value="extraction">Extraction</option>
            <option value="processing">Processing</option>
            <option value="transport">Transport</option>
            <option value="prospecting">Prospecting</option>
          </select>
          <select
            value={techSortBy}
            onChange={(e) => setTechSortBy(e.target.value as 'name' | 'trl' | 'category')}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            <option value="trl">Sort by TRL (Readiness)</option>
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={resourceCategoryFilter}
            onChange={(e) => setResourceCategoryFilter(e.target.value as ResourceEstimate['category'] | '')}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm min-w-[140px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          >
            <option value="">All Categories</option>
            <option value="volatile">Volatiles</option>
            <option value="precious_metal">Precious Metals</option>
            <option value="rare_earth">Rare Earth Elements</option>
            <option value="fuel">Fuel</option>
            <option value="structural">Structural Materials</option>
          </select>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'companies' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Space Mining Companies ({filteredCompanies.length})
            </h2>
          </div>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <p className="text-4xl mb-4">🏢</p>
              <p>No companies found matching your filters.</p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCompanies.map((company) => (
                <StaggerItem key={company.name}>
                  <CompanyCard company={company} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      ) : activeTab === 'technologies' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Mining Technologies ({filteredTechnologies.length})
            </h2>
          </div>
          {filteredTechnologies.length === 0 ? (
            <div className="text-center py-12 text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <p className="text-4xl mb-4">🔧</p>
              <p>No technologies found matching your filters.</p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTechnologies.map((tech) => (
                <StaggerItem key={tech.name}>
                  <TechnologyCard tech={tech} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      ) : activeTab === 'resources' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Space Resource Value Estimates ({filteredResources.length})
            </h2>
          </div>
          {filteredResources.length === 0 ? (
            <div className="text-center py-12 text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <p className="text-4xl mb-4">💎</p>
              <p>No resources found matching your filters.</p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredResources.map((resource) => (
                <StaggerItem key={resource.resource}>
                  <ResourceEstimateCard resource={resource} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-12">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-secondary"
          >
            Retry
          </button>
        </div>
      ) : activeTab === 'commodities' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Commodity Prices ({filteredCommodities.length})
            </h2>
            <ExportButton
              data={filteredCommodities}
              columns={COMMODITY_EXPORT_COLUMNS}
              filename="space-mining-commodities"
            />
          </div>
          {filteredCommodities.length === 0 ? (
            <div className="text-center py-12 text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <p className="text-4xl mb-4">💰</p>
              <p>No commodities found matching your search.</p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCommodities.map((commodity) => (
                <StaggerItem key={commodity.id}>
                  <CommodityCard commodity={commodity} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {activeTab === 'overview' ? 'All Mining Targets' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({filteredBodies.length})
            </h2>
            <ExportButton
              data={filteredBodies}
              columns={BODY_EXPORT_COLUMNS}
              filename={`space-mining-${activeTab}`}
            />
          </div>

          {filteredBodies.length === 0 ? (
            <div className="text-center py-12 text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <p className="text-4xl mb-4">🪨</p>
              <p>No mining bodies found matching your filters.</p>
              <p className="text-sm mt-2">Try adjusting your filter criteria or search term.</p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBodies.map((body) => (
                <StaggerItem key={body.id}>
                  <MiningBodyCard body={body} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      )}

      {/* Spectral Type Legend - only on body tabs */}
      {(activeTab === 'overview' || activeTab === 'asteroids' || activeTab === 'moons' || activeTab === 'planets') && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-3">Spectral Type Guide</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(SPECTRAL_TYPE_INFO).slice(0, 5).map(([type, info]) => (
              <div key={type} className="flex items-start gap-2">
                <span className={`font-bold ${info.color}`}>{type}</span>
                <div>
                  <div className="text-slate-300 text-xs font-medium">{info.label.split('(')[1]?.replace(')', '') || info.label}</div>
                  <div className="text-slate-400 text-xs">{info.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Mining Targets (DynamicContent) - Enhanced with detailed cards */}
      <ScrollReveal>
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">💎</span> High-Value Target Asteroids
              <span className="text-xs font-normal text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full ml-2">
                {filteredMiningTargets.length} Targets
              </span>
            </h3>
            {filteredMiningTargets.length > 0 && (
              <ExportButton
                data={filteredMiningTargets}
                columns={[
                  { key: 'full_name', label: 'Asteroid' },
                  { key: 'spec_B', label: 'Spectral (SMASS)' },
                  { key: 'spec_T', label: 'Spectral (Tholen)' },
                  { key: 'profit', label: 'Est. Profit ($)' },
                  { key: 'price', label: 'Price ($/kg)' },
                  { key: 'score', label: 'Mining Score' },
                  { key: 'accessibility', label: 'Accessibility' },
                  { key: 'diameter', label: 'Diameter (km)' },
                  { key: 'moid', label: 'MOID (AU)' },
                  { key: 'description', label: 'Description' },
                  { key: 'missionStatus', label: 'Mission Status' },
                ]}
                filename="top-mining-targets"
              />
            )}
          </div>

          {miningTargetsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredMiningTargets.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No mining targets match your search.</p>
          ) : (
            <>
              {/* Table view */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-amber-500/30">
                      <th className="text-left py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">#</th>
                      <th className="text-left py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">Asteroid</th>
                      <th className="text-left py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">Spectral</th>
                      <th className="text-right py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">Est. Profit</th>
                      <th className="text-right py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">Price/kg</th>
                      <th className="text-right py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">Diameter</th>
                      <th className="text-right py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">Accessibility</th>
                      <th className="text-right py-2.5 px-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">MOID (AU)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMiningTargets.map((target, idx) => {
                      const isTop3 = idx < 3;
                      return (
                        <tr
                          key={target.full_name}
                          className={`border-b border-slate-700/30 hover:bg-amber-500/5 transition-colors ${
                            isTop3 ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            {isTop3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-bold">
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`font-semibold ${isTop3 ? 'text-white' : 'text-slate-300'}`}>
                              {target.full_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1">
                              {target.spec_T && (
                                <span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">{target.spec_T}</span>
                              )}
                              {target.spec_B && (
                                <span className="px-1.5 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs">{target.spec_B}</span>
                              )}
                              {!target.spec_T && !target.spec_B && (
                                <span className="text-slate-400 text-xs">--</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`font-bold ${
                              (target.profit ?? 0) >= 1e12 ? 'text-green-400' :
                              (target.profit ?? 0) >= 1e9 ? 'text-emerald-400' :
                              'text-slate-300'
                            }`}>
                              {formatProfit(target.profit)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {formatPricePerKgShort(target.price)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {target.diameter != null ? `${target.diameter.toFixed(target.diameter < 1 ? 3 : 1)} km` : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {target.accessibility != null ? (
                              <span className={`font-medium ${
                                target.accessibility >= 1.5 ? 'text-green-400' :
                                target.accessibility >= 1.0 ? 'text-yellow-400' :
                                'text-orange-400'
                              }`}>
                                {target.accessibility.toFixed(2)}
                              </span>
                            ) : '--'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {target.moid != null ? target.moid.toFixed(4) : '--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Detailed target cards */}
              <h4 className="text-sm font-semibold text-white mb-3 border-t border-slate-700/30 pt-4">Detailed Target Profiles</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredMiningTargets.map((target, idx) => (
                  <div key={target.full_name} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30 hover:border-amber-500/20 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="text-white font-semibold">{target.full_name}</h5>
                          <div className="flex gap-1 mt-0.5">
                            {target.spec_T && <span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">{target.spec_T}-type</span>}
                            {target.diameter != null && <span className="text-slate-400 text-xs">{target.diameter.toFixed(target.diameter < 1 ? 3 : 1)} km diameter</span>}
                          </div>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${(target.profit ?? 0) >= 1e12 ? 'text-green-400' : (target.profit ?? 0) >= 1e9 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {formatProfit(target.profit)}
                      </span>
                    </div>
                    {target.description && (
                      <p className="text-slate-400 text-sm mb-3 leading-relaxed">{target.description}</p>
                    )}
                    {target.missionStatus && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-xs text-slate-500">Mission:</span>
                        <span className="text-xs text-cyan-400 font-medium">{target.missionStatus}</span>
                      </div>
                    )}
                    {target.keyResources && target.keyResources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {target.keyResources.map((res) => (
                          <span key={res} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-medium">{res}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-3 pt-2 border-t border-slate-700/20">
                      {target.accessibility != null && (
                        <span>Accessibility: <span className={`font-medium ${target.accessibility >= 1.5 ? 'text-green-400' : target.accessibility >= 1.0 ? 'text-yellow-400' : 'text-orange-400'}`}>{target.accessibility.toFixed(2)}</span></span>
                      )}
                      {target.moid != null && <span>MOID: {target.moid.toFixed(4)} AU</span>}
                      {target.a != null && <span>SMA: {target.a.toFixed(3)} AU</span>}
                      {target.score != null && <span>Score: <span className="text-amber-400 font-bold">{target.score.toFixed(1)}</span></span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollReveal>

      {/* Industry Overview Summary - only on overview tab */}
      {activeTab === 'overview' && (
        <ScrollReveal>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <span className="text-2xl">🏭</span> Space Mining Industry at a Glance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <div className="text-cyan-400 text-xs uppercase tracking-widest mb-2 font-semibold">Active Companies</div>
                <div className="text-white font-bold text-2xl mb-1">{MINING_COMPANIES.filter(c => c.status === 'active').length}</div>
                <p className="text-slate-400 text-xs">Developing asteroid and lunar mining technologies</p>
                <button onClick={() => handleTabChange('companies')} className="text-cyan-400 hover:text-cyan-300 text-xs mt-2 font-medium min-h-[44px] inline-flex items-center">View all companies &rarr;</button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <div className="text-orange-400 text-xs uppercase tracking-widest mb-2 font-semibold">Mining Technologies</div>
                <div className="text-white font-bold text-2xl mb-1">{MINING_TECHNOLOGIES.length}</div>
                <p className="text-slate-400 text-xs">From optical mining to beneficiation in microgravity</p>
                <button onClick={() => handleTabChange('technologies')} className="text-orange-400 hover:text-orange-300 text-xs mt-2 font-medium min-h-[44px] inline-flex items-center">View technologies &rarr;</button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <div className="text-purple-400 text-xs uppercase tracking-widest mb-2 font-semibold">Tracked Resources</div>
                <div className="text-white font-bold text-2xl mb-1">{RESOURCE_ESTIMATES.length}</div>
                <p className="text-slate-400 text-xs">Water, PGMs, rare earths, He-3, iron, silicon, carbon</p>
                <button onClick={() => handleTabChange('resources')} className="text-purple-400 hover:text-purple-300 text-xs mt-2 font-medium min-h-[44px] inline-flex items-center">View resource values &rarr;</button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Cross-links */}
      <ScrollReveal>
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/solar-exploration" className="btn-secondary text-sm">
            🌍 Solar Exploration
          </Link>
          <Link href="/resource-exchange" className="btn-secondary text-sm">
            💰 Resource Exchange
          </Link>
          <Link href="/launch-windows" className="btn-secondary text-sm">
            🪟 Launch Windows
          </Link>
          <Link href="/space-environment?tab=debris" className="btn-secondary text-sm">
            ⚠️ Debris Monitor
          </Link>
          <Link href="/market-intel" className="btn-secondary text-sm">
            📊 Market Intelligence
          </Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">
            🏢 Company Profiles
          </Link>
        </div>
      </div>
      </ScrollReveal>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceMiningPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Mining Intelligence"
          subtitle="Comprehensive database of asteroids, moons, and planetary bodies with resource valuations, accessibility metrics, and mining feasibility analysis"
          icon="⛏️"
          accentColor="amber"
        />

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }>
          <SpaceMiningContent />
        </Suspense>
      </div>
    </div>
  );
}
