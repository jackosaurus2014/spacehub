'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import RelatedModules from '@/components/ui/RelatedModules';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

type MainTab = 'companies' | 'statistics' | 'regulations' | 'technologies';

type ApproachType =
  | 'magnetic-capture'
  | 'robotic-arm'
  | 'net-capture'
  | 'harpoon'
  | 'laser-ablation'
  | 'drag-sail'
  | 'ion-beam'
  | 'capture-bag'
  | 'collision-avoidance'
  | 'tracking'
  | 'deorbit-kit'
  | 'tether'
  | 'eddy-current'
  | 'refueling'
  | 'multi-method';

type MissionStatus = 'operational' | 'launched' | 'planned' | 'in-development' | 'concept' | 'completed' | 'decommissioned';

interface ADRCompany {
  id: string;
  company: string;
  country: string;
  missionName: string;
  approach: ApproachType;
  approachLabel: string;
  status: MissionStatus;
  targetOrbit: string;
  timeline: string;
  description: string;
  website: string;
  fundingStage?: string;
  customers?: string[];
}

interface DebrisStat {
  label: string;
  value: string;
  detail: string;
  icon: string;
  color: string;
}

interface OrbitBand {
  name: string;
  altitudeRange: string;
  objectCount: string;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  description: string;
}

interface Regulation {
  id: string;
  name: string;
  body: string;
  year: number;
  type: 'binding' | 'guideline' | 'standard' | 'charter';
  scope: string;
  summary: string;
  keyProvisions: string[];
  status: 'active' | 'proposed' | 'adopted' | 'in-force';
}

interface Technology {
  id: string;
  name: string;
  category: 'capture' | 'deorbit' | 'deflection' | 'servicing' | 'tracking';
  trl: number; // Technology Readiness Level 1-9
  description: string;
  advantages: string[];
  challenges: string[];
  keyDevelopers: string[];
  flightHeritage: boolean;
}

// ════════════════════════════════════════════════════════════════
// APPROACH & STATUS METADATA
// ════════════════════════════════════════════════════════════════

const APPROACH_INFO: Record<ApproachType, { label: string; color: string; icon: string }> = {
  'magnetic-capture': { label: 'Magnetic Capture', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '\u{1F9F2}' },
  'robotic-arm': { label: 'Robotic Arm', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '\u{1F9BE}' },
  'net-capture': { label: 'Net Capture', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30', icon: '\u{1FAA4}' },
  'harpoon': { label: 'Harpoon', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '\u{1F531}' },
  'laser-ablation': { label: 'Laser Ablation', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '\u{1F4A5}' },
  'drag-sail': { label: 'Drag Sail', color: 'bg-white/10 text-slate-300 border-white/10', icon: '\u{26F5}' },
  'ion-beam': { label: 'Ion Beam Deflection', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: '\u{26A1}' },
  'capture-bag': { label: 'Capture Bag', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '\u{1F4E6}' },
  'collision-avoidance': { label: 'Collision Avoidance', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '\u{1F6E1}\u{FE0F}' },
  'tracking': { label: 'Tracking & SSA', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: '\u{1F4E1}' },
  'deorbit-kit': { label: 'Deorbit Kit', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: '\u{1F4A8}' },
  'tether': { label: 'Electrodynamic Tether', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', icon: '\u{1FA62}' },
  'eddy-current': { label: 'Eddy Current Brake', color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30', icon: '\u{1F300}' },
  'refueling': { label: 'On-Orbit Refueling', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30', icon: '\u{26FD}' },
  'multi-method': { label: 'Multi-Method', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: '\u{1F527}' },
};

const STATUS_INFO: Record<MissionStatus, { label: string; color: string }> = {
  operational: { label: 'Operational', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  launched: { label: 'Launched', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  planned: { label: 'Planned', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'in-development': { label: 'In Development', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  concept: { label: 'Concept', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  decommissioned: { label: 'Decommissioned', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  moderate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-green-400 bg-green-500/10 border-green-500/30',
};

const REGULATION_TYPE_COLORS: Record<string, string> = {
  binding: 'bg-red-500/20 text-red-400 border-red-500/30',
  guideline: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  standard: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  charter: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const TECH_CATEGORY_COLORS: Record<string, string> = {
  capture: 'bg-white/10 text-slate-300 border-white/10',
  deorbit: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  deflection: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  servicing: 'bg-green-500/20 text-green-400 border-green-500/30',
  tracking: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
};

// ════════════════════════════════════════════════════════════════
// DATA: ADR COMPANIES & MISSIONS (18 entries)
// ════════════════════════════════════════════════════════════════

const ADR_COMPANIES: ADRCompany[] = [
  {
    id: 'astroscale-elsa-d',
    company: 'Astroscale',
    country: 'Japan',
    missionName: 'ELSA-d (End-of-Life Services)',
    approach: 'magnetic-capture',
    approachLabel: 'Magnetic Docking Plate',
    status: 'completed',
    targetOrbit: 'LEO (550 km)',
    timeline: '2021 - 2023',
    description: 'Demonstrated magnetic capture technology with a servicer and client satellite pair. Successfully performed rendezvous, proximity operations, and docking in orbit using a magnetic docking plate system.',
    website: 'https://astroscale.com',
    fundingStage: 'Series G ($400M+ total)',
    customers: ['JAXA', 'ESA', 'OneWeb'],
  },
  {
    id: 'astroscale-adras-j',
    company: 'Astroscale',
    country: 'Japan',
    missionName: 'ADRAS-J',
    approach: 'robotic-arm',
    approachLabel: 'Rendezvous & Proximity Operations',
    status: 'launched',
    targetOrbit: 'LEO (600 km)',
    timeline: '2024 - ongoing',
    description: 'Commercial debris removal demonstration targeting a large Japanese H-2A upper stage. First mission to demonstrate RPO with an actual piece of debris. Successfully approached and imaged the target.',
    website: 'https://astroscale.com',
    fundingStage: 'Series G ($400M+ total)',
    customers: ['JAXA'],
  },
  {
    id: 'clearspace-1',
    company: 'ClearSpace',
    country: 'Switzerland',
    missionName: 'ClearSpace-1',
    approach: 'robotic-arm',
    approachLabel: 'Four-Armed Robotic Capture',
    status: 'planned',
    targetOrbit: 'LEO (660 km)',
    timeline: '2026 (launch)',
    description: 'ESA-contracted mission to capture and deorbit the Vespa upper stage adapter left by Vega flight VV02 in 2013. Uses four robotic arms to grasp and then deorbit the debris via controlled re-entry.',
    website: 'https://clearspace.today',
    fundingStage: 'Series B ($100M+)',
    customers: ['ESA', 'UK Space Agency'],
  },
  {
    id: 'dorbit-ion',
    company: 'D-Orbit',
    country: 'Italy',
    missionName: 'ION Satellite Carrier',
    approach: 'deorbit-kit',
    approachLabel: 'Satellite Carrier & Decommissioning',
    status: 'operational',
    targetOrbit: 'LEO (500-600 km)',
    timeline: '2020 - ongoing (17+ missions)',
    description: 'Orbital transportation vehicle that precisely deploys satellites and can perform active decommissioning. ION includes a built-in deorbiting capability, ensuring it does not become debris itself.',
    website: 'https://www.dorbit.space',
    fundingStage: 'Series C ($310M total)',
    customers: ['ESA', 'ASI', 'Planet Labs', 'Airbus'],
  },
  {
    id: 'obruta-space',
    company: 'Obruta Space Solutions',
    country: 'Canada',
    missionName: 'Space Sweeper',
    approach: 'net-capture',
    approachLabel: 'Tethered Net Capture System',
    status: 'in-development',
    targetOrbit: 'LEO (700-900 km)',
    timeline: '2027 (planned demo)',
    description: 'Developing a tethered net capture system to envelop and deorbit large debris objects. The net expands to wrap around tumbling debris, then a propulsion module drags it to a lower altitude for re-entry.',
    website: 'https://obruta.com',
    fundingStage: 'Seed',
  },
  {
    id: 'transastra',
    company: 'TransAstra',
    country: 'USA',
    missionName: 'Worker Bee / Capture Bag',
    approach: 'capture-bag',
    approachLabel: 'Inflatable Capture Bag',
    status: 'in-development',
    targetOrbit: 'LEO / Cislunar',
    timeline: '2026-2027 (demo)',
    description: 'Developed an inflatable capture bag technology originally designed for asteroid mining, adapted for debris removal. The bag encloses the entire debris object, preventing fragment creation during capture.',
    website: 'https://www.transastra.com',
    fundingStage: 'Series A (NASA contracts)',
    customers: ['NASA'],
  },
  {
    id: 'kayhan-space',
    company: 'Kayhan Space',
    country: 'USA',
    missionName: 'Pathfinder',
    approach: 'collision-avoidance',
    approachLabel: 'AI-Powered Collision Avoidance',
    status: 'operational',
    targetOrbit: 'All orbits',
    timeline: '2020 - ongoing',
    description: 'Provides automated collision avoidance and space traffic management services using AI-driven conjunction assessment. Pathfinder platform processes millions of conjunction data points daily.',
    website: 'https://www.kayhan.space',
    fundingStage: 'Series A ($6M)',
    customers: ['US Space Force', 'Commercial operators'],
  },
  {
    id: 'privateer-wayfinder',
    company: 'Privateer Space',
    country: 'USA',
    missionName: 'Wayfinder',
    approach: 'tracking',
    approachLabel: 'Global Debris Tracking Platform',
    status: 'operational',
    targetOrbit: 'All orbits',
    timeline: '2022 - ongoing',
    description: 'Founded by Apple co-founder Steve Wozniak. Wayfinder provides a comprehensive space object mapping and tracking platform, fusing data from multiple sources for enhanced space situational awareness.',
    website: 'https://www.privateer.com',
    fundingStage: 'Series A',
  },
  {
    id: 'leolabs',
    company: 'LeoLabs',
    country: 'USA',
    missionName: 'LeoTrack',
    approach: 'tracking',
    approachLabel: 'Phased-Array Radar Tracking Network',
    status: 'operational',
    targetOrbit: 'LEO (200-2,000 km)',
    timeline: '2016 - ongoing',
    description: 'Operates a global network of phased-array radars providing high-fidelity tracking of objects as small as 2 cm in LEO. Offers conjunction warnings and orbital data services to operators worldwide.',
    website: 'https://www.leolabs.space',
    fundingStage: 'Series B ($80M+)',
    customers: ['US DoD', 'ESA', 'JAXA', 'Commercial operators'],
  },
  {
    id: 'slingshot-aerospace',
    company: 'Slingshot Aerospace',
    country: 'USA',
    missionName: 'Beacon / Seradata',
    approach: 'tracking',
    approachLabel: 'AI Space Domain Awareness',
    status: 'operational',
    targetOrbit: 'All orbits',
    timeline: '2019 - ongoing',
    description: 'Provides AI-powered space domain awareness and simulation tools. Beacon platform delivers real-time space environment monitoring, collision risk assessment, and debris tracking analytics.',
    website: 'https://www.slingshotaerospace.com',
    fundingStage: 'Series B ($78M)',
    customers: ['US Space Force', 'USSF', 'NASA'],
  },
  {
    id: 'exoanalytic',
    company: 'ExoAnalytic Solutions',
    country: 'USA',
    missionName: 'ExoAnalytic Network',
    approach: 'tracking',
    approachLabel: 'Optical Telescope Network',
    status: 'operational',
    targetOrbit: 'GEO / MEO / LEO',
    timeline: '2009 - ongoing',
    description: 'Operates the world\'s largest commercial optical telescope network for space domain awareness. Provides high-accuracy tracking, characterization, and anomaly detection for objects across all orbital regimes.',
    website: 'https://www.exoanalytic.com',
    fundingStage: 'Established ($50M+ revenue)',
    customers: ['US DoD', 'Allied nations', 'Commercial operators'],
  },
  {
    id: 'orbit-fab',
    company: 'Orbit Fab',
    country: 'USA',
    missionName: 'Gas Stations in Space',
    approach: 'refueling',
    approachLabel: 'On-Orbit Refueling Infrastructure',
    status: 'operational',
    targetOrbit: 'GEO / LEO',
    timeline: '2019 - ongoing',
    description: 'Building the first fuel depot network in space. RAFTI (Rapidly Attachable Fluid Transfer Interface) standard enables satellite life extension, reducing the need for replacement launches and associated debris.',
    website: 'https://www.orbitfab.com',
    fundingStage: 'Series A ($28.5M)',
    customers: ['Northrop Grumman', 'Lockheed Martin', 'US DoD'],
  },
  {
    id: 'neumann-space',
    company: 'Neumann Space',
    country: 'Australia',
    missionName: 'Neumann Drive',
    approach: 'deorbit-kit',
    approachLabel: 'Solid Metal Ion Thruster for Deorbit',
    status: 'launched',
    targetOrbit: 'LEO (500-700 km)',
    timeline: '2022 - ongoing',
    description: 'Developed an innovative ion thruster that uses solid metal propellant (including recycled space debris metals). Enables efficient deorbiting maneuvers and can be integrated as a decommissioning module.',
    website: 'https://www.neumannspace.com',
    fundingStage: 'Series A (ASX-listed)',
  },
  {
    id: 'skyrora-deorbit',
    company: 'Skyrora',
    country: 'UK',
    missionName: 'SkyHy / Space Tug',
    approach: 'deorbit-kit',
    approachLabel: 'Orbital Transfer & Deorbit Vehicle',
    status: 'in-development',
    targetOrbit: 'LEO (400-800 km)',
    timeline: '2026 (planned)',
    description: 'Developing an orbital maneuvering vehicle (Space Tug) capable of rendezvousing with dead satellites and using its propulsion system to push them into graveyard orbits or controlled re-entry trajectories.',
    website: 'https://www.skyrora.com',
    fundingStage: 'Series B ($80M)',
  },
  {
    id: 'northrop-mev',
    company: 'Northrop Grumman',
    country: 'USA',
    missionName: 'MEV-1 / MEV-2 / MRV',
    approach: 'robotic-arm',
    approachLabel: 'Satellite Docking & Life Extension',
    status: 'operational',
    targetOrbit: 'GEO',
    timeline: '2020 - ongoing',
    description: 'Mission Extension Vehicle (MEV) program demonstrated in-orbit docking and satellite life extension. MEV-1 docked with Intelsat 901 in 2020, MEV-2 with Intelsat 10-02 in 2021. MRV (Mission Robotic Vehicle) adds robotic servicing.',
    website: 'https://www.northropgrumman.com',
    fundingStage: 'Public (NYSE: NOC)',
    customers: ['Intelsat', 'SES'],
  },
  {
    id: 'airbus-removedebris',
    company: 'Airbus / Surrey Space Centre',
    country: 'UK / EU',
    missionName: 'RemoveDEBRIS',
    approach: 'multi-method',
    approachLabel: 'Net, Harpoon & Drag Sail Demo',
    status: 'completed',
    targetOrbit: 'LEO (400 km, ISS orbit)',
    timeline: '2018 - 2019',
    description: 'EU-funded technology demonstration that successfully tested three debris removal methods in orbit: net capture, harpoon penetration, and drag sail deployment. First mission to demonstrate multiple ADR techniques in space.',
    website: 'https://www.surrey.ac.uk/surrey-space-centre',
    fundingStage: 'EU FP7 funded',
    customers: ['ESA', 'EU Commission'],
  },
  {
    id: 'esa-e-deorbit',
    company: 'ESA (with consortium)',
    country: 'Europe',
    missionName: 'e.Deorbit / ADRIOS',
    approach: 'robotic-arm',
    approachLabel: 'Robotic Capture & Controlled Re-entry',
    status: 'planned',
    targetOrbit: 'LEO (800 km SSO)',
    timeline: '2026-2028',
    description: 'ESA\'s Active Debris Removal / In-Orbit Servicing program, now evolved into ClearSpace-1 contract. Targeting a Vespa payload adapter for capture and controlled deorbit. Aims to establish European debris removal capability.',
    website: 'https://www.esa.int',
    customers: ['ESA Member States'],
  },
  {
    id: 'starfish-otter',
    company: 'Starfish Space',
    country: 'USA',
    missionName: 'Otter Pup / Otter',
    approach: 'magnetic-capture',
    approachLabel: 'Electrostatic & Magnetic Docking',
    status: 'launched',
    targetOrbit: 'LEO / GEO',
    timeline: '2023 - ongoing',
    description: 'Developing spacecraft capable of docking with uncooperative targets using electrostatic and magnetic methods. Otter Pup demo launched in 2023 aboard Rocket Lab Electron. Otter servicing vehicle planned for debris removal and satellite servicing.',
    website: 'https://www.starfishspace.com',
    fundingStage: 'Series A ($21M)',
    customers: ['DARPA', 'US Space Force'],
  },
];

// ════════════════════════════════════════════════════════════════
// DATA: DEBRIS STATISTICS
// ════════════════════════════════════════════════════════════════

const DEBRIS_STATISTICS: DebrisStat[] = [
  {
    label: 'Tracked Objects (>10 cm)',
    value: '~36,500',
    detail: 'Cataloged by the US Space Surveillance Network (18th Space Defense Squadron). Includes active satellites, spent rocket bodies, and fragments.',
    icon: '\u{1F4E1}',
    color: 'from-white to-blue-600',
  },
  {
    label: 'Objects 1-10 cm',
    value: '~1,000,000',
    detail: 'Estimated by statistical models. Too small to individually track but large enough to disable or destroy an operational spacecraft on impact.',
    icon: '\u{26A0}\u{FE0F}',
    color: 'from-amber-500 to-orange-600',
  },
  {
    label: 'Objects 1 mm - 1 cm',
    value: '~130 million',
    detail: 'Modeled population based on returned spacecraft surface analysis and ground-based radar measurements. Can penetrate spacecraft shielding and damage components.',
    icon: '\u{1F534}',
    color: 'from-red-500 to-rose-600',
  },
  {
    label: 'Particles <1 mm',
    value: '~330 million',
    detail: 'Microscopic debris including paint flecks, solid rocket motor slag, and surface degradation particles. Cause erosion and surface pitting over time.',
    icon: '\u{1F30C}',
    color: 'from-purple-500 to-violet-600',
  },
  {
    label: 'Active Satellites',
    value: '~10,500',
    detail: 'Operational satellites as of early 2026. SpaceX Starlink alone accounts for over 6,000. Number growing rapidly with mega-constellation deployments.',
    icon: '\u{1F6F0}\u{FE0F}',
    color: 'from-green-500 to-emerald-600',
  },
  {
    label: 'Annual Collision Avoidance Maneuvers',
    value: '~300+',
    detail: 'Major operators perform hundreds of collision avoidance maneuvers yearly. The ISS alone performs 30+ maneuvers per year. Starlink satellites auto-maneuver thousands of times.',
    icon: '\u{1F6A8}',
    color: 'from-sky-500 to-indigo-600',
  },
  {
    label: 'Average Impact Velocity (LEO)',
    value: '10 km/s',
    detail: 'Objects in LEO collide at average relative velocities of 10 km/s (36,000 km/h). A 1 cm object at this speed has the kinetic energy of a hand grenade.',
    icon: '\u{1F4A5}',
    color: 'from-rose-500 to-red-700',
  },
  {
    label: 'Mass in Orbit',
    value: '~11,000 tonnes',
    detail: 'Total mass of all objects in Earth orbit, including operational satellites, rocket bodies, and debris. Continues to increase as launch cadence accelerates.',
    icon: '\u{2696}\u{FE0F}',
    color: 'from-slate-400 to-slate-600',
  },
];

const ORBIT_BANDS: OrbitBand[] = [
  {
    name: 'LEO 200-600 km',
    altitudeRange: '200-600 km',
    objectCount: '~8,200',
    riskLevel: 'high',
    description: 'Heavily populated by mega-constellations (Starlink, OneWeb). Objects naturally deorbit within 5-25 years due to atmospheric drag.',
  },
  {
    name: 'LEO 700-900 km (Critical Zone)',
    altitudeRange: '700-900 km',
    objectCount: '~6,800',
    riskLevel: 'critical',
    description: 'Most congested and dangerous region. Sun-synchronous orbits for Earth observation. Minimal atmospheric drag means debris persists for centuries. Contains Cosmos-Iridium collision debris field.',
  },
  {
    name: 'LEO 900-1,200 km',
    altitudeRange: '900-1,200 km',
    objectCount: '~3,100',
    riskLevel: 'high',
    description: 'Legacy debris from Cold War-era anti-satellite tests and Fengyun-1C destruction (2007). Objects remain in orbit for thousands of years.',
  },
  {
    name: 'MEO 1,200-35,000 km',
    altitudeRange: '1,200-35,000 km',
    objectCount: '~1,200',
    riskLevel: 'moderate',
    description: 'Navigation constellation region (GPS, Galileo, GLONASS, BeiDou). Lower object density but critical infrastructure.',
  },
  {
    name: 'GEO ~35,786 km',
    altitudeRange: '35,786 km',
    objectCount: '~1,400+',
    riskLevel: 'moderate',
    description: 'Geostationary orbit housing communications and weather satellites. Limited slots make debris especially problematic. Graveyard orbit above GEO used for disposal.',
  },
  {
    name: 'HEO / Highly Elliptical',
    altitudeRange: 'Varies (perigee 250 km - apogee 40,000+ km)',
    objectCount: '~500',
    riskLevel: 'low',
    description: 'Molniya orbits, transfer orbits, and other highly elliptical paths. Lower density but objects cross multiple orbital regimes.',
  },
];

const KESSLER_SYNDROME = {
  title: 'Kessler Syndrome',
  description: 'A theoretical scenario proposed by NASA scientist Donald Kessler in 1978, where the density of objects in LEO becomes high enough that collisions between objects generate a cascade of further collisions and debris. This self-sustaining chain reaction could render certain orbital bands unusable for generations.',
  currentAssessment: 'Some researchers believe cascading has already begun in the 700-900 km band. The Cosmos-Iridium collision (2009) and Chinese ASAT test (2007) together created over 7,000 trackable debris fragments, significantly increasing collision probability in LEO.',
  criticalThreshold: 'Models suggest that even if no new launches occur, the existing population in the 700-900 km band will generate new debris through mutual collisions faster than atmospheric drag removes objects from orbit.',
  mitigationRequired: 'Studies by ESA, NASA, and JAXA consistently show that actively removing 5-10 large objects per year from congested orbits is necessary to stabilize the LEO debris population, in addition to full compliance with the 25-year deorbit guideline.',
};

const MAJOR_DEBRIS_EVENTS = [
  {
    year: 2007,
    event: 'Chinese ASAT Test (Fengyun-1C)',
    fragments: '3,500+ tracked',
    description: 'China destroyed its own Fengyun-1C weather satellite at 865 km altitude, creating the single largest debris cloud from a deliberate event.',
  },
  {
    year: 2009,
    event: 'Cosmos-Iridium Collision',
    fragments: '2,300+ tracked',
    description: 'First accidental hypervelocity collision between two intact satellites: defunct Cosmos 2251 and active Iridium 33 at 790 km altitude.',
  },
  {
    year: 2019,
    event: 'India ASAT Test (Mission Shakti)',
    fragments: '400+ tracked',
    description: 'India destroyed its Microsat-R satellite at 300 km. Lower altitude meant most debris deorbited quickly, but some fragments were lofted to higher altitudes.',
  },
  {
    year: 2021,
    event: 'Russian ASAT Test (Cosmos 1408)',
    fragments: '1,500+ tracked',
    description: 'Russia destroyed the defunct Cosmos 1408 satellite at 480 km altitude, forcing the ISS crew to shelter in their spacecraft multiple times.',
  },
  {
    year: 2023,
    event: 'Fragmentation Events',
    fragments: '200+ tracked',
    description: 'Multiple upper stage fragmentations and at least two unattributed breakup events added hundreds of debris objects across LEO.',
  },
];

// ════════════════════════════════════════════════════════════════
// DATA: REGULATIONS
// ════════════════════════════════════════════════════════════════

const REGULATIONS: Regulation[] = [
  {
    id: 'un-copuos',
    name: 'UN COPUOS Space Debris Mitigation Guidelines',
    body: 'United Nations Committee on the Peaceful Uses of Outer Space',
    year: 2007,
    type: 'guideline',
    scope: 'Global (193 UN member states)',
    summary: 'Voluntary guidelines establishing the international framework for debris mitigation. Seven guidelines covering mission planning, orbital lifetime, passivation, and collision avoidance.',
    keyProvisions: [
      'Limit debris released during normal operations',
      'Minimize potential for post-mission break-ups',
      'Limit long-term presence of spacecraft in LEO after mission end',
      'Minimize potential for collision during operational phases',
      'Avoid intentional destruction creating long-lived debris',
      'Limit probability of accidental collision in orbit',
      'Limit long-term interference with GEO region',
    ],
    status: 'active',
  },
  {
    id: 'fcc-5year',
    name: 'FCC 5-Year Deorbit Rule',
    body: 'U.S. Federal Communications Commission',
    year: 2022,
    type: 'binding',
    scope: 'All FCC-licensed spacecraft (US jurisdiction)',
    summary: 'Landmark regulation requiring all LEO satellites licensed by the FCC to deorbit within 5 years of mission end, reduced from the prior 25-year guideline. Applies to all new applications from September 2024.',
    keyProvisions: [
      'Maximum 5-year post-mission orbital lifetime in LEO',
      'Applies to all new FCC license applications from Sept 2024',
      'Existing operators encouraged to comply voluntarily',
      'Operators must disclose deorbit plans in license applications',
      'Penalties for non-compliance including license revocation',
    ],
    status: 'in-force',
  },
  {
    id: 'esa-zero-debris',
    name: 'ESA Zero Debris Charter',
    body: 'European Space Agency',
    year: 2023,
    type: 'charter',
    scope: 'ESA member states and signatories',
    summary: 'Ambitious commitment to achieve zero debris creation from ESA missions by 2030. Signatories pledge to ensure no mission-related objects are left in orbit beyond defined lifetime limits.',
    keyProvisions: [
      'Zero debris production from ESA missions by 2030',
      'Compliant disposal of all spacecraft and orbital stages',
      'Support active debris removal research and missions',
      'Transparent reporting on compliance metrics',
      'Industry signatories commit to design-for-demise principles',
      'Promote international adoption of similar standards',
    ],
    status: 'active',
  },
  {
    id: 'iso-24113',
    name: 'ISO 24113:2024 - Space Debris Mitigation',
    body: 'International Organization for Standardization',
    year: 2011,
    type: 'standard',
    scope: 'International voluntary standard',
    summary: 'Technical standard defining debris mitigation requirements for all types of space missions. Updated in 2019 and 2024 with stricter passivation, collision avoidance, and disposal requirements.',
    keyProvisions: [
      'Limit debris released during normal operations to <1mm or tethered',
      'Stored energy passivation within 5 years of end of mission',
      'Collision avoidance capability requirements',
      'Post-mission disposal: 25-year rule or direct re-entry',
      'Design for demise: minimize ground casualty risk <1:10,000',
      'Protected regions: LEO below 2,000 km, GEO +/-200 km',
    ],
    status: 'active',
  },
  {
    id: 'iadc-guidelines',
    name: 'IADC Space Debris Mitigation Guidelines',
    body: 'Inter-Agency Space Debris Coordination Committee',
    year: 2002,
    type: 'guideline',
    scope: '13 member space agencies worldwide',
    summary: 'The IADC brings together the world\'s major space agencies to coordinate debris research and mitigation policy. Their guidelines serve as the technical foundation for UN COPUOS recommendations.',
    keyProvisions: [
      'LEO protected region: up to 2,000 km altitude',
      'GEO protected region: +/-200 km of GEO altitude, +/-15 deg latitude',
      'Post-mission disposal within 25 years in LEO',
      'GEO spacecraft disposal to graveyard orbit (+235 km minimum)',
      'Passivation of all stored energy sources after mission end',
      'Collision avoidance maneuvers when probability exceeds threshold',
      'Support development of active debris removal capabilities',
    ],
    status: 'active',
  },
  {
    id: 'us-spd3',
    name: 'US Space Policy Directive-3 (SPD-3)',
    body: 'United States Government',
    year: 2018,
    type: 'guideline',
    scope: 'US government and commercial operators',
    summary: 'National Space Traffic Management Policy establishing the framework for US space traffic management, debris tracking, and conjunction assessment services.',
    keyProvisions: [
      'Transition SSA data sharing from DoD to Department of Commerce',
      'Develop open-architecture SSA data repository',
      'Provide basic SSA services to all operators at no cost',
      'Update US Orbital Debris Mitigation Standard Practices',
      'Encourage international adoption of best practices',
      'Support development of debris removal technologies',
    ],
    status: 'active',
  },
  {
    id: 'uk-plan',
    name: 'UK National Space Debris Action Plan',
    body: 'UK Space Agency',
    year: 2024,
    type: 'guideline',
    scope: 'UK licensed operators',
    summary: 'Comprehensive national plan for debris mitigation and remediation. Includes funding for ADR technology development and requirement for debris impact assessments in licensing.',
    keyProvisions: [
      'Mandatory debris impact assessments for new missions',
      'GBP 50M+ investment in ADR technology development',
      'Support for ClearSpace-1 and national ADR missions',
      'Enhanced SSA capabilities through partnership with LeoLabs',
      'Stricter licensing conditions for orbital lifetime',
    ],
    status: 'active',
  },
  {
    id: 'itu-regulations',
    name: 'ITU Radio Regulations (Space Services)',
    body: 'International Telecommunication Union',
    year: 2019,
    type: 'binding',
    scope: 'All ITU member states (193 countries)',
    summary: 'ITU regulations require coordination and notification for all space radio systems. Increasingly linked to debris mitigation as spectrum-orbital slot resource management becomes critical.',
    keyProvisions: [
      'Mandatory coordination for GEO satellite placement',
      'Frequency assignment linked to orbital slot compliance',
      'Due diligence on end-of-life spectrum release',
      'Non-operational satellites must cease transmission',
    ],
    status: 'in-force',
  },
];

// ════════════════════════════════════════════════════════════════
// DATA: TECHNOLOGIES
// ════════════════════════════════════════════════════════════════

const TECHNOLOGIES: Technology[] = [
  {
    id: 'drag-sail',
    name: 'Drag Sails / Deorbit Sails',
    category: 'deorbit',
    trl: 9,
    description: 'Deployable lightweight membranes that increase atmospheric drag on a spacecraft, accelerating its natural orbital decay. Simple, reliable, and flight-proven technology for LEO deorbiting.',
    advantages: ['Low mass and volume', 'No propellant required', 'Flight-proven (multiple missions)', 'Low cost', 'Passive operation after deployment'],
    challenges: ['Only effective below ~800 km', 'Slow deorbit (months to years)', 'Vulnerable to debris impacts on sail', 'No active guidance during deorbit'],
    keyDevelopers: ['Cranfield University (Icarus)', 'Tethers Unlimited', 'Purdue (Aerodynamic Deorbit Experiment)', 'NanoAvionics'],
    flightHeritage: true,
  },
  {
    id: 'electrodynamic-tether',
    name: 'Electrodynamic Tethers',
    category: 'deorbit',
    trl: 7,
    description: 'Conducting tethers deployed from a spacecraft that interact with Earth\'s magnetic field. Electric current generated by the tether\'s motion through the field produces a Lorentz force that lowers the orbit without propellant.',
    advantages: ['No propellant required', 'Faster than drag sails', 'Works at higher altitudes than drag sails', 'Can generate electrical power'],
    challenges: ['Complex deployment mechanism', 'Tether can be severed by debris', 'Requires functioning electronics', 'Less effective far from Earth\'s magnetic field'],
    keyDevelopers: ['JAXA (KITE experiment)', 'Tethers Unlimited (Terminator Tape)', 'ESA (EDT studies)'],
    flightHeritage: true,
  },
  {
    id: 'laser-ablation',
    name: 'Ground-Based or Space-Based Laser Ablation',
    category: 'deflection',
    trl: 4,
    description: 'High-powered lasers ablate material from the surface of debris objects, creating a small thrust that alters their orbit. Can potentially be used from ground stations or dedicated orbital platforms.',
    advantages: ['No contact required', 'Can address many objects from one station', 'Scalable to different debris sizes', 'No rendezvous needed'],
    challenges: ['Requires very high power levels', 'Atmospheric distortion for ground-based systems', 'Dual-use weapon concerns', 'Limited testing in space', 'Precise tracking required'],
    keyDevelopers: ['JAXA (ground-based studies)', 'Lockheed Martin (ILRS concept)', 'EOS Space Systems (Australia)', 'Chinese Academy of Sciences'],
    flightHeritage: false,
  },
  {
    id: 'robotic-capture',
    name: 'Robotic Arms & Grippers',
    category: 'capture',
    trl: 8,
    description: 'Spacecraft-mounted robotic manipulators that physically grasp debris objects for removal. Requires precise rendezvous and proximity operations. Proven in space station robotics and being adapted for debris capture.',
    advantages: ['Precise control of captured object', 'Can handle tumbling targets', 'Adaptable to different target shapes', 'Heritage from station robotics (Canadarm)'],
    challenges: ['Complex guidance and control', 'Risk of creating more debris on contact', 'Each mission addresses only one target', 'Requires large, capable servicer spacecraft'],
    keyDevelopers: ['ClearSpace', 'Northrop Grumman (MEV)', 'Astroscale', 'MDA (Canadarm heritage)'],
    flightHeritage: true,
  },
  {
    id: 'net-capture',
    name: 'Net Capture Systems',
    category: 'capture',
    trl: 7,
    description: 'Deployable nets launched at or around a debris object to envelop and restrain it. The net and attached tether system then enables the servicer to tow the debris to a lower orbit for re-entry.',
    advantages: ['Tolerant of tumbling targets', 'Does not require precise docking', 'Works with various target shapes', 'Large capture envelope'],
    challenges: ['Single-use per net', 'Risk of net entanglement', 'Must control tethered dynamics', 'Demonstrated only once in orbit (RemoveDEBRIS)'],
    keyDevelopers: ['Airbus / Surrey (RemoveDEBRIS)', 'Obruta Space', 'ESA studies'],
    flightHeritage: true,
  },
  {
    id: 'harpoon',
    name: 'Harpoon / Tethered Penetrator',
    category: 'capture',
    trl: 7,
    description: 'A projectile fired at a debris object that embeds itself and establishes a tethered connection. The servicer then uses its propulsion to alter the debris orbit. Demonstrated in the RemoveDEBRIS mission.',
    advantages: ['Works at standoff distance', 'Effective against large, slow-tumbling targets', 'Mechanically simple', 'Demonstrated in orbit'],
    challenges: ['Risk of creating secondary debris', 'Single-use mechanism', 'May not work on all materials', 'Requires accurate targeting'],
    keyDevelopers: ['Airbus (RemoveDEBRIS harpoon)', 'ESA studies'],
    flightHeritage: true,
  },
  {
    id: 'ion-beam',
    name: 'Ion Beam Deflection (IBS)',
    category: 'deflection',
    trl: 5,
    description: 'A servicer spacecraft directs its ion thruster exhaust at a debris object, transferring momentum without physical contact. The debris is gradually nudged to a lower orbit while the servicer compensates with its own thrust.',
    advantages: ['No physical contact needed', 'No risk of creating contact debris', 'Can be used repeatedly', 'Works on tumbling targets'],
    challenges: ['Very slow orbit change', 'Requires long station-keeping near debris', 'High fuel consumption for servicer', 'Not yet demonstrated in orbit'],
    keyDevelopers: ['University of Surrey', 'Airbus (concept studies)', 'JAXA'],
    flightHeritage: false,
  },
  {
    id: 'magnetic-capture',
    name: 'Magnetic / Eddy Current Capture',
    category: 'capture',
    trl: 6,
    description: 'Uses magnetic fields or eddy current interactions to slow tumbling debris objects and enable capture. Cooperative targets use pre-installed docking plates; uncooperative targets leverage induced eddy currents in their metallic structures.',
    advantages: ['Contactless detumbling possible', 'Cooperative docking plates very reliable', 'Can slow target rotation before capture', 'Reduced collision risk'],
    challenges: ['Limited to metallic/conductive targets', 'Cooperative plates must be pre-installed', 'Eddy current approach still in development', 'Close proximity required'],
    keyDevelopers: ['Astroscale (ELSA docking plates)', 'Starfish Space', 'University of Colorado'],
    flightHeritage: true,
  },
  {
    id: 'on-orbit-servicing',
    name: 'On-Orbit Servicing & Life Extension',
    category: 'servicing',
    trl: 9,
    description: 'Extending satellite operational life through refueling, repair, upgrade, or attitude control assistance. Reduces debris creation by keeping satellites operational longer and avoiding premature replacement launches.',
    advantages: ['Reduces replacement launches', 'Proven concept (MEV-1, MEV-2)', 'Revenue-generating business model', 'Addresses root cause of debris creation'],
    challenges: ['Most satellites not designed for servicing', 'Expensive per-target economics', 'Primarily for GEO high-value assets', 'Requires standard servicing interfaces'],
    keyDevelopers: ['Northrop Grumman (SpaceLogistics)', 'Orbit Fab', 'Astroscale', 'Starfish Space'],
    flightHeritage: true,
  },
  {
    id: 'ssa-tracking',
    name: 'Advanced Space Situational Awareness',
    category: 'tracking',
    trl: 9,
    description: 'Next-generation tracking using phased-array radars, optical telescopes, and AI-driven data fusion to catalog and predict the orbits of debris as small as 1-2 cm. Critical enabler for all debris mitigation activities.',
    advantages: ['Foundation for all ADR activities', 'Mature commercial market', 'Global coverage achievable', 'AI improves prediction accuracy'],
    challenges: ['Cannot track sub-centimeter debris', 'Data sharing between nations limited', 'Increasing object count stresses catalogs', 'Space-based sensors expensive to deploy'],
    keyDevelopers: ['LeoLabs', 'ExoAnalytic', 'Slingshot Aerospace', 'Privateer Space', 'US Space Force (18th SDS)'],
    flightHeritage: true,
  },
  {
    id: 'capture-bag',
    name: 'Inflatable Capture Bags',
    category: 'capture',
    trl: 4,
    description: 'Large inflatable structures that fully enclose a debris object, preventing fragment generation during capture. Originally developed for asteroid mining applications and adapted for debris remediation.',
    advantages: ['Encloses entire object (no fragments)', 'Works with any target shape', 'No structural connection needed', 'Can contain loose fragments'],
    challenges: ['Requires very close approach', 'Large deployment mechanism', 'Not yet flight tested for debris', 'May be difficult to deorbit large enclosed objects'],
    keyDevelopers: ['TransAstra', 'NASA (concept studies)'],
    flightHeritage: false,
  },
  {
    id: 'design-for-demise',
    name: 'Design for Demise (D4D)',
    category: 'deorbit',
    trl: 8,
    description: 'Designing spacecraft components and structures to completely ablate during atmospheric re-entry, leaving no surviving fragments that could cause ground casualties. Increasingly required by regulators.',
    advantages: ['Eliminates ground casualty risk', 'Enables safe uncontrolled re-entry', 'Lower insurance costs', 'Regulatory compliance'],
    challenges: ['May increase spacecraft mass or cost', 'Limits material choices', 'Testing is difficult and expensive', 'Some components inherently resistant to demise'],
    keyDevelopers: ['ESA (CleanSat)', 'Thales Alenia Space', 'Airbus', 'NASA'],
    flightHeritage: true,
  },
];

// ════════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ════════════════════════════════════════════════════════════════

const MAIN_TABS: { id: MainTab; label: string; description: string }[] = [
  { id: 'companies', label: 'ADR Companies & Missions', description: 'Active debris removal providers' },
  { id: 'statistics', label: 'Debris Statistics', description: 'Population data & Kessler Syndrome' },
  { id: 'regulations', label: 'Regulatory Framework', description: 'International rules & standards' },
  { id: 'technologies', label: 'Technologies', description: 'Removal & mitigation methods' },
];

// ════════════════════════════════════════════════════════════════
// TAB: ADR COMPANIES & MISSIONS
// ════════════════════════════════════════════════════════════════

function CompaniesTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all');
  const [approachFilter, setApproachFilter] = useState<ApproachType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(ADR_COMPANIES.map((c) => c.status));
    return Array.from(statuses).sort();
  }, []);

  const uniqueApproaches = useMemo(() => {
    const approaches = new Set(ADR_COMPANIES.map((c) => c.approach));
    return Array.from(approaches).sort();
  }, []);

  const filtered = useMemo(() => {
    return ADR_COMPANIES.filter((c) => {
      const matchesSearch = search === '' ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.missionName.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.approachLabel.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesApproach = approachFilter === 'all' || c.approach === approachFilter;
      return matchesSearch && matchesStatus && matchesApproach;
    });
  }, [search, statusFilter, approachFilter]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-slate-300">{ADR_COMPANIES.length}</div>
            <div className="text-sm text-slate-400 mt-1">Companies/Missions</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{ADR_COMPANIES.filter(c => c.status === 'operational').length}</div>
            <div className="text-sm text-slate-400 mt-1">Operational</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{ADR_COMPANIES.filter(c => ['planned', 'in-development'].includes(c.status)).length}</div>
            <div className="text-sm text-slate-400 mt-1">In Development</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{ADR_COMPANIES.filter(c => c.status === 'launched').length}</div>
            <div className="text-sm text-slate-400 mt-1">Launched</div>
          </div>
        </div>
      </ScrollReveal>

      {/* Search & Filter Controls */}
      <ScrollReveal delay={0.1}>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="search"
                placeholder="Search companies, missions, or approaches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 pl-10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MissionStatus | 'all')}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{STATUS_INFO[s]?.label || s}</option>
              ))}
            </select>
            <select
              value={approachFilter}
              onChange={(e) => setApproachFilter(e.target.value as ApproachType | 'all')}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="all">All Approaches</option>
              {uniqueApproaches.map((a) => (
                <option key={a} value={a}>{APPROACH_INFO[a]?.label || a}</option>
              ))}
            </select>
          </div>
          {(search || statusFilter !== 'all' || approachFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <span>Showing {filtered.length} of {ADR_COMPANIES.length} entries</span>
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); setApproachFilter('all'); }}
                className="text-slate-300 hover:text-white underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Company Cards */}
      <StaggerContainer className="grid gap-4">
        {filtered.map((company) => {
          const approach = APPROACH_INFO[company.approach];
          const status = STATUS_INFO[company.status];
          const isExpanded = expandedId === company.id;
          return (
            <StaggerItem key={company.id}>
              <div
                className={`bg-slate-800/60 border rounded-xl overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'border-white/15 shadow-lg shadow-black/5' : 'border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : company.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-100">{company.company}</h3>
                        <span className="text-xs text-slate-500">{company.country}</span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium">{company.missionName}</p>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{company.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${approach.color}`}>
                        <span>{approach.icon}</span> {approach.label}
                      </span>
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-slate-500">
                    <span>Target: {company.targetOrbit}</span>
                    <span>Timeline: {company.timeline}</span>
                    {company.fundingStage && <span>Funding: {company.fundingStage}</span>}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/50 p-5 bg-slate-900/30 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-1">Approach</h4>
                      <p className="text-sm text-slate-400">{company.approachLabel} - {company.description}</p>
                    </div>
                    {company.customers && company.customers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-1">Key Customers</h4>
                        <div className="flex flex-wrap gap-2">
                          {company.customers.map((c) => (
                            <span key={c} className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-300 hover:text-white underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">No companies match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB: DEBRIS STATISTICS
// ════════════════════════════════════════════════════════════════

function StatisticsTab() {
  const [expandedBand, setExpandedBand] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Key Statistics Grid */}
      <ScrollReveal>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Debris Population Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEBRIS_STATISTICS.map((stat, idx) => (
            <div
              key={stat.label}
              className="group relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 rounded-xl`} />
              <div className="relative">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
                <div className="text-sm font-medium text-slate-300 mt-1">{stat.label}</div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 group-hover:line-clamp-none transition-all">{stat.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Kessler Syndrome */}
      <ScrollReveal delay={0.1}>
        <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">&#x26A0;&#xFE0F;</span>
            <div>
              <h2 className="text-xl font-semibold text-red-400">{KESSLER_SYNDROME.title}</h2>
              <p className="text-sm text-slate-400 mt-1">Proposed by Donald Kessler, NASA, 1978</p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-slate-300">
            <p>{KESSLER_SYNDROME.description}</p>
            <div className="bg-slate-900/40 border border-red-500/10 rounded-lg p-4">
              <h4 className="font-semibold text-orange-400 mb-1">Current Assessment</h4>
              <p className="text-slate-400">{KESSLER_SYNDROME.currentAssessment}</p>
            </div>
            <div className="bg-slate-900/40 border border-red-500/10 rounded-lg p-4">
              <h4 className="font-semibold text-amber-400 mb-1">Critical Threshold</h4>
              <p className="text-slate-400">{KESSLER_SYNDROME.criticalThreshold}</p>
            </div>
            <div className="bg-slate-900/40 border border-green-500/10 rounded-lg p-4">
              <h4 className="font-semibold text-green-400 mb-1">Mitigation Required</h4>
              <p className="text-slate-400">{KESSLER_SYNDROME.mitigationRequired}</p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Congested Orbits */}
      <ScrollReveal delay={0.15}>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Orbital Congestion by Band</h2>
        <div className="space-y-3">
          {ORBIT_BANDS.map((band) => {
            const isExpanded = expandedBand === band.name;
            const riskColor = RISK_COLORS[band.riskLevel] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';
            return (
              <button
                key={band.name}
                onClick={() => setExpandedBand(isExpanded ? null : band.name)}
                className={`w-full text-left bg-slate-800/60 border rounded-xl p-4 transition-all ${
                  isExpanded ? 'border-white/15' : 'border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-200">{band.name}</h3>
                    <p className="text-xs text-slate-500">{band.altitudeRange} altitude</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-100">{band.objectCount}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${riskColor}`}>
                      {band.riskLevel.charAt(0).toUpperCase() + band.riskLevel.slice(1)} Risk
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <p className="text-sm text-slate-400 mt-3 border-t border-slate-700/50 pt-3">{band.description}</p>
                )}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Major Debris Events */}
      <ScrollReveal delay={0.2}>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Major Debris-Creating Events</h2>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/50 via-orange-500/50 to-amber-500/50 hidden sm:block" />

          <StaggerContainer className="space-y-4">
            {MAJOR_DEBRIS_EVENTS.map((event) => (
              <StaggerItem key={event.year + event.event}>
                <div className="sm:ml-14 bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 relative">
                  {/* Timeline dot */}
                  <div className="hidden sm:block absolute -left-[3.55rem] top-6 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900 shadow-lg shadow-red-500/30" />
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <span className="text-2xl font-bold text-red-400 shrink-0">{event.year}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-200">{event.event}</h3>
                      <p className="text-sm text-orange-400 font-medium">{event.fragments} fragments</p>
                      <p className="text-sm text-slate-400 mt-1">{event.description}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </ScrollReveal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB: REGULATORY FRAMEWORK
// ════════════════════════════════════════════════════════════════

function RegulationsTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return REGULATIONS.filter((r) => {
      const matchesSearch = search === '' ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.body.toLowerCase().includes(search.toLowerCase()) ||
        r.summary.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <ScrollReveal>
        <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/10 border border-blue-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-blue-400 mb-2">International Debris Governance</h2>
          <p className="text-sm text-slate-300">
            Space debris mitigation is governed by a layered framework of international guidelines, national regulations,
            and industry standards. While the UN COPUOS guidelines and IADC recommendations provide the global baseline,
            enforcement occurs primarily at the national level through licensing authorities. The FCC&apos;s 2022 adoption of
            a binding 5-year deorbit rule and ESA&apos;s Zero Debris Charter represent the most aggressive regulatory actions to date.
          </p>
        </div>
      </ScrollReveal>

      {/* Search & Filter */}
      <ScrollReveal delay={0.1}>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="search"
                placeholder="Search regulations, bodies, or provisions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 pl-10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Types</option>
              <option value="binding">Binding</option>
              <option value="guideline">Guideline</option>
              <option value="standard">Standard</option>
              <option value="charter">Charter</option>
            </select>
          </div>
          {(search || typeFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <span>Showing {filtered.length} of {REGULATIONS.length} entries</span>
              <button
                onClick={() => { setSearch(''); setTypeFilter('all'); }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Regulation Cards */}
      <StaggerContainer className="space-y-4">
        {filtered.map((reg) => {
          const isExpanded = expandedId === reg.id;
          const typeColor = REGULATION_TYPE_COLORS[reg.type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
          return (
            <StaggerItem key={reg.id}>
              <div className={`bg-slate-800/60 border rounded-xl overflow-hidden transition-all duration-300 ${
                isExpanded ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-slate-700/50 hover:border-slate-600/50'
              }`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-100">{reg.name}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{reg.body}</p>
                      <p className="text-sm text-slate-400 mt-2 line-clamp-2">{reg.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${typeColor}`}>
                        {reg.type.charAt(0).toUpperCase() + reg.type.slice(1)}
                      </span>
                      <span className="text-xs text-slate-500">{reg.year}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        reg.status === 'in-force' ? 'bg-green-500/20 text-green-400' :
                        reg.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {reg.status === 'in-force' ? 'In Force' : reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Scope: {reg.scope}</div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/50 p-5 bg-slate-900/30">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Key Provisions</h4>
                    <ul className="space-y-2">
                      {reg.keyProvisions.map((provision, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="text-blue-400 mt-1 shrink-0">&#x2022;</span>
                          <span>{provision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">No regulations match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB: TECHNOLOGIES
// ════════════════════════════════════════════════════════════════

function TechnologiesTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return TECHNOLOGIES.filter((t) => {
      const matchesSearch = search === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.keyDevelopers.some(d => d.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter]);

  const getTRLColor = (trl: number) => {
    if (trl >= 8) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (trl >= 6) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    if (trl >= 4) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };

  const getTRLLabel = (trl: number) => {
    if (trl >= 9) return 'Flight Proven';
    if (trl >= 7) return 'Space Demonstrated';
    if (trl >= 5) return 'Ground Validated';
    if (trl >= 3) return 'Lab Tested';
    return 'Conceptual';
  };

  return (
    <div className="space-y-6">
      {/* Category Overview */}
      <ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['capture', 'deorbit', 'deflection', 'servicing', 'tracking'] as const).map((cat) => {
            const count = TECHNOLOGIES.filter(t => t.category === cat).length;
            const catColor = TECH_CATEGORY_COLORS[cat] || '';
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                className={`rounded-xl p-3 text-center transition-all border ${
                  categoryFilter === cat
                    ? catColor + ' border-opacity-100'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <div className={`text-xl font-bold ${categoryFilter === cat ? '' : 'text-slate-200'}`}>{count}</div>
                <div className={`text-xs mt-0.5 capitalize ${categoryFilter === cat ? '' : 'text-slate-400'}`}>{cat}</div>
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Search */}
      <ScrollReveal delay={0.1}>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="search"
                placeholder="Search technologies or developers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 pl-10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="all">All Categories</option>
              <option value="capture">Capture</option>
              <option value="deorbit">Deorbit</option>
              <option value="deflection">Deflection</option>
              <option value="servicing">Servicing</option>
              <option value="tracking">Tracking</option>
            </select>
          </div>
          {(search || categoryFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <span>Showing {filtered.length} of {TECHNOLOGIES.length} technologies</span>
              <button
                onClick={() => { setSearch(''); setCategoryFilter('all'); }}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Technology Cards */}
      <StaggerContainer className="space-y-4">
        {filtered.map((tech) => {
          const isExpanded = expandedId === tech.id;
          const catColor = TECH_CATEGORY_COLORS[tech.category] || '';
          const trlColor = getTRLColor(tech.trl);
          return (
            <StaggerItem key={tech.id}>
              <div className={`bg-slate-800/60 border rounded-xl overflow-hidden transition-all duration-300 ${
                isExpanded ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : 'border-slate-700/50 hover:border-slate-600/50'
              }`}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : tech.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-100">{tech.name}</h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{tech.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border capitalize ${catColor}`}>
                        {tech.category}
                      </span>
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${trlColor}`}>
                        TRL {tech.trl} - {getTRLLabel(tech.trl)}
                      </span>
                      {tech.flightHeritage && (
                        <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                          Flight Heritage
                        </span>
                      )}
                    </div>
                  </div>
                  {/* TRL Bar */}
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">TRL</span>
                      <div className="flex-1 h-2 bg-slate-900/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            tech.trl >= 8 ? 'bg-green-500' :
                            tech.trl >= 6 ? 'bg-yellow-500' :
                            tech.trl >= 4 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(tech.trl / 9) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{tech.trl}/9</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/50 p-5 bg-slate-900/30 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-green-400 mb-2">Advantages</h4>
                        <ul className="space-y-1">
                          {tech.advantages.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                              <span className="text-green-500 mt-0.5 shrink-0">+</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Challenges</h4>
                        <ul className="space-y-1">
                          {tech.challenges.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                              <span className="text-orange-500 mt-0.5 shrink-0">-</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2">Key Developers</h4>
                      <div className="flex flex-wrap gap-2">
                        {tech.keyDevelopers.map((d) => (
                          <span key={d} className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">No technologies match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN CONTENT COMPONENT (inside Suspense)
// ════════════════════════════════════════════════════════════════

function DebrisRemediationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab') as MainTab | null;
  const initialTab: MainTab = (tabParam && ['companies', 'statistics', 'regulations', 'technologies'].includes(tabParam))
    ? tabParam
    : 'companies';

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = useCallback((tab: MainTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'companies') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  useSwipeTabs(
    ['companies', 'statistics', 'regulations', 'technologies'],
    activeTab,
    (tab) => handleTabChange(tab as MainTab)
  );

  return (
    <PullToRefresh onRefresh={async () => { setRefreshKey((k) => k + 1); }}>
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <AnimatedPageHeader
            title="Space Debris Remediation"
            subtitle="Active debris removal missions, remediation technologies, population statistics, and international regulatory frameworks for space sustainability"
            icon="&#x1F6F0;&#xFE0F;"
            accentColor="red"
          />

          {/* Main Tab Navigation */}
          <div className="flex gap-1 mb-8 p-1 bg-slate-800/50 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-thin">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap touch-target ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <div className="text-sm font-semibold">{tab.label}</div>
                <div className={`text-xs mt-0.5 hidden sm:block ${activeTab === tab.id ? 'text-white/70' : 'text-slate-500'}`}>
                  {tab.description}
                </div>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'companies' && <CompaniesTab key={`companies-${refreshKey}`} />}
          {activeTab === 'statistics' && <StatisticsTab key={`statistics-${refreshKey}`} />}
          {activeTab === 'regulations' && <RegulationsTab key={`regulations-${refreshKey}`} />}
          {activeTab === 'technologies' && <TechnologiesTab key={`technologies-${refreshKey}`} />}

          <RelatedModules modules={[
            { name: 'Space Environment', description: 'Solar weather, debris tracking & ops', href: '/space-environment', icon: '\u{2604}\u{FE0F}' },
            { name: 'Satellite Tracker', description: 'Real-time satellite positions', href: '/satellites', icon: '\u{1F6F0}\u{FE0F}' },
            { name: 'Asteroid Watch', description: 'Near-Earth object tracking', href: '/asteroid-watch', icon: '\u{2604}\u{FE0F}' },
            { name: 'Regulatory Hub', description: 'Space law & compliance', href: '/compliance', icon: '\u{2696}\u{FE0F}' },
          ]} />
        </div>
      </div>
    </PullToRefresh>
  );
}

// ════════════════════════════════════════════════════════════════
// DEFAULT EXPORT (Suspense boundary for useSearchParams)
// ════════════════════════════════════════════════════════════════

export default function DebrisRemediationPage() {
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
      <DebrisRemediationContent />
    </Suspense>
  );
}
