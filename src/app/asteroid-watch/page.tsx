'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import DataFreshness from '@/components/ui/DataFreshness';
import ExportButton from '@/components/ui/ExportButton';
import { clientLogger } from '@/lib/client-logger';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'approaches' | 'known-objects' | 'defense' | 'mining' | 'discovery';

interface CloseApproach {
  id: string;
  name: string;
  date: string;
  distanceLD: number;
  distanceAU: number;
  diameterMin: number;
  diameterMax: number;
  velocity: number;
  torino: number;
  palermo: number;
  isPHA: boolean;
  orbitClass: string;
}

interface SizeCategory {
  label: string;
  range: string;
  known: number;
  estimated: number;
  completeness: number;
  color: string;
}

interface DefenseProgram {
  id: string;
  name: string;
  agency: string;
  status: string;
  statusColor: string;
  description: string;
  keyResults: string[];
  timeline: string;
  link?: string;
}

interface MiningTarget {
  id: string;
  name: string;
  designation: string;
  spectralType: string;
  diameterKm: number;
  deltaV: number;
  estimatedValue: string;
  resources: string[];
  accessibility: string;
  accessColor: string;
  notes: string;
}

interface MiningCompany {
  name: string;
  status: string;
  statusColor: string;
  focus: string;
  funding: string;
  description: string;
}

interface SurveyTelescope {
  name: string;
  operator: string;
  location: string;
  neoDiscoveries: number;
  percentContribution: number;
  status: string;
  statusColor: string;
  description: string;
}

interface DiscoveryMilestone {
  year: number;
  cumulativeNEOs: number;
  cumulativePHAs: number;
  notable: string;
}

interface ImpactRiskObject {
  des: string;
  fullname: string;
  ip: string;
  ps_cum: string;
  ps_max: string;
  v_inf: string;
  last_obs: string;
  n_imp: string;
  range: string;
  ts_max: string;
  diameter: string;
}

interface FireballEvent {
  date: string;
  energy: string;
  impact_e: string;
  lat: string;
  lon: string;
  alt: string;
  vel: string;
}

// ────────────────────────────────────────
// Fallback Data (shown when DB is not seeded)
// ────────────────────────────────────────

const FALLBACK_CLOSE_APPROACHES: CloseApproach[] = [
  {
    id: 'apophis-2029',
    name: '99942 Apophis',
    date: '2029-04-13',
    distanceLD: 0.08,
    distanceAU: 0.00021,
    diameterMin: 340,
    diameterMax: 370,
    velocity: 7.42,
    torino: 0,
    palermo: -10,
    isPHA: true,
    orbitClass: 'Aten',
  },
  {
    id: '2024-yr4',
    name: '2024 YR4',
    date: '2032-12-22',
    distanceLD: 0.6,
    distanceAU: 0.0015,
    diameterMin: 40,
    diameterMax: 90,
    velocity: 16.8,
    torino: 0,
    palermo: -3.2,
    isPHA: true,
    orbitClass: 'Apollo',
  },
  {
    id: 'bennu-2060',
    name: '101955 Bennu',
    date: '2060-09-25',
    distanceLD: 1.9,
    distanceAU: 0.005,
    diameterMin: 490,
    diameterMax: 510,
    velocity: 6.02,
    torino: 0,
    palermo: -1.7,
    isPHA: true,
    orbitClass: 'Apollo',
  },
  {
    id: '2023-dw',
    name: '2023 DW',
    date: '2046-02-14',
    distanceLD: 5.1,
    distanceAU: 0.013,
    diameterMin: 40,
    diameterMax: 70,
    velocity: 24.6,
    torino: 0,
    palermo: -4.2,
    isPHA: false,
    orbitClass: 'Apollo',
  },
  {
    id: '2024-bx1',
    name: '2024 BX1',
    date: '2024-01-21',
    distanceLD: 0.0,
    distanceAU: 0.0,
    diameterMin: 0.5,
    diameterMax: 1,
    velocity: 15.2,
    torino: 0,
    palermo: -10,
    isPHA: false,
    orbitClass: 'Apollo',
  },
  {
    id: '2024-mk',
    name: '2024 MK',
    date: '2024-06-29',
    distanceLD: 0.75,
    distanceAU: 0.0019,
    diameterMin: 120,
    diameterMax: 260,
    velocity: 21.0,
    torino: 0,
    palermo: -10,
    isPHA: true,
    orbitClass: 'Apollo',
  },
  {
    id: 'didymos-2123',
    name: '65803 Didymos',
    date: '2123-11-04',
    distanceLD: 16.1,
    distanceAU: 0.041,
    diameterMin: 780,
    diameterMax: 780,
    velocity: 11.9,
    torino: 0,
    palermo: -10,
    isPHA: true,
    orbitClass: 'Apollo',
  },
  {
    id: '2015-rn35',
    name: '2015 RN35',
    date: '2026-12-18',
    distanceLD: 1.7,
    distanceAU: 0.0044,
    diameterMin: 4,
    diameterMax: 14,
    velocity: 13.0,
    torino: 0,
    palermo: -10,
    isPHA: false,
    orbitClass: 'Apollo',
  },
  {
    id: '1950-da',
    name: '29075 (1950 DA)',
    date: '2880-03-16',
    distanceLD: 0.04,
    distanceAU: 0.0001,
    diameterMin: 1100,
    diameterMax: 1400,
    velocity: 14.4,
    torino: 0,
    palermo: -2.0,
    isPHA: true,
    orbitClass: 'Apollo',
  },
  {
    id: '2006-qv89',
    name: '2006 QV89',
    date: '2029-09-21',
    distanceLD: 17.2,
    distanceAU: 0.044,
    diameterMin: 20,
    diameterMax: 50,
    velocity: 12.1,
    torino: 0,
    palermo: -10,
    isPHA: false,
    orbitClass: 'Apollo',
  },
];

const FALLBACK_NEO_STATS = {
  totalNEOs: 34521,
  totalPHAs: 2381,
  totalNEAs: 34397,
  totalNECs: 124,
  last30DaysDiscoveries: 248,
  lastYearDiscoveries: 3112,
  largestNEA: { name: '1036 Ganymed', diameter: 32.4 },
  closestApproach2025: { name: '2024 MK', distance: '0.0019 AU' },
};

const FALLBACK_SIZE_CATEGORIES: SizeCategory[] = [
  { label: 'Sub-meter', range: '< 1 m', known: 7, estimated: 1000000000, completeness: 0.001, color: 'from-red-600 to-red-400' },
  { label: 'Small', range: '1 - 10 m', known: 412, estimated: 500000000, completeness: 0.001, color: 'from-orange-600 to-orange-400' },
  { label: 'Medium', range: '10 - 100 m', known: 3850, estimated: 5000000, completeness: 0.08, color: 'from-yellow-600 to-yellow-400' },
  { label: 'Large', range: '100 m - 1 km', known: 10840, estimated: 25000, completeness: 43, color: 'from-green-600 to-green-400' },
  { label: 'Very Large', range: '> 1 km', known: 862, estimated: 920, completeness: 93, color: 'from-emerald-600 to-emerald-400' },
];

const FALLBACK_SPECTRAL_DISTRIBUTION: {
  type: string; percentage: number; color: string; description: string; count: number;
}[] = [
  { type: 'S-type (Silicaceous)', percentage: 35, color: 'from-orange-500 to-yellow-500', description: 'Rocky composition with silicate minerals and nickel-iron. Most common among inner belt and NEOs.', count: 12050 },
  { type: 'C-type (Carbonaceous)', percentage: 20, color: 'from-slate-500 to-slate-400', description: 'Carbon-rich, dark surfaces with water-bearing clay minerals. Rich in volatiles for ISRU.', count: 6890 },
  { type: 'Q-type (Ordinary Chondrite)', percentage: 14, color: 'from-amber-500 to-amber-400', description: 'Fresh, unweathered silicate surfaces similar to ordinary chondrite meteorites.', count: 4830 },
  { type: 'X-type (Metallic/Enstatite)', percentage: 10, color: 'from-zinc-400 to-zinc-300', description: 'Includes M-type metallic asteroids. May contain significant iron, nickel, and platinum-group metals.', count: 3450 },
  { type: 'V-type (Vestoid)', percentage: 6, color: 'from-purple-500 to-purple-400', description: 'Basaltic composition linked to asteroid 4 Vesta. Evidence of past volcanic activity.', count: 2070 },
  { type: 'D-type (Dark/Trojan)', percentage: 4, color: 'from-red-800 to-red-600', description: 'Very dark, organic-rich surfaces. Common among Trojans and outer belt. Possibly primordial material.', count: 1380 },
  { type: 'Other / Unclassified', percentage: 11, color: 'from-blue-500 to-blue-400', description: 'Includes A, B, K, L, O, R, T types and objects without spectral data.', count: 3790 },
];

const FALLBACK_DEFENSE_PROGRAMS: DefenseProgram[] = [
  {
    id: 'dart',
    name: 'DART (Double Asteroid Redirection Test)',
    agency: 'NASA / APL',
    status: 'Completed',
    statusColor: 'text-green-400',
    description: 'The first planetary defense technology demonstration mission. DART intentionally impacted Dimorphos, the small moon of near-Earth asteroid Didymos, on September 26, 2022, to test kinetic impactor deflection.',
    keyResults: [
      'Successfully impacted Dimorphos at 6.1 km/s on Sept 26, 2022',
      'Changed orbital period by 33 minutes (from 11h 55m to 11h 22m), far exceeding the 73-second minimum benchmark',
      'Ejected roughly 1 million kg of debris, amplifying momentum transfer by factor of 3.6',
      'LICIACube cubesat captured close-up imagery of impact and ejecta cone',
      'Confirmed kinetic impactor as viable planetary defense method',
    ],
    timeline: '2021 - 2022',
    link: 'https://dart.jhuapl.edu',
  },
  {
    id: 'hera',
    name: 'Hera',
    agency: 'ESA',
    status: 'In Transit',
    statusColor: 'text-blue-400',
    description: 'ESA follow-up mission to the Didymos-Dimorphos system to conduct a detailed post-impact survey. Launched October 2024, arriving late 2026. Will characterize the DART impact crater and measure Dimorphos mass and internal structure.',
    keyResults: [
      'Launched October 7, 2024, on Falcon 9',
      'Carries two CubeSats: Milani (dust/mineralogy) and Juventas (radar interior mapping)',
      'Will determine Dimorphos mass to calculate exact momentum transfer efficiency',
      'First detailed survey of a binary asteroid system',
      'Results will calibrate kinetic impactor models for future deflection scenarios',
    ],
    timeline: '2024 - 2027',
    link: 'https://www.esa.int/Safety_Security/Hera',
  },
  {
    id: 'neo-surveyor',
    name: 'NEO Surveyor',
    agency: 'NASA / JPL',
    status: 'In Development',
    statusColor: 'text-yellow-400',
    description: 'Space-based infrared telescope designed to discover and characterize NEOs. Positioned at Sun-Earth L1 point to detect asteroids approaching from the sunward direction that ground-based surveys cannot easily see.',
    keyResults: [
      'Planned launch NET 2028, positioned at Sun-Earth L1 Lagrange point',
      'Two infrared channels (4-5.2 microns and 6-10 microns) for thermal detection',
      'Expected to find 65%+ of remaining 140m+ NEOs within 5 years of operation',
      'Can detect dark asteroids invisible to optical surveys by their thermal emission',
      'Key to meeting Congressional mandate for 90% completeness of 140m+ NEOs',
    ],
    timeline: '2028 - 2040+',
    link: 'https://neos.arizona.edu/mission',
  },
  {
    id: 'pdco',
    name: 'Planetary Defense Coordination Office (PDCO)',
    agency: 'NASA HQ',
    status: 'Operational',
    statusColor: 'text-green-400',
    description: 'Established in 2016 within NASA\'s Science Mission Directorate to lead U.S. efforts in finding, tracking, and characterizing potentially hazardous NEOs, issuing warnings, and coordinating response planning.',
    keyResults: [
      'Coordinates all NASA-funded NEO observation programs',
      'Manages CNEOS (Center for Near-Earth Object Studies) at JPL for orbit computation',
      'Issues impact warnings through the International Asteroid Warning Network (IAWN)',
      'Runs tabletop exercises with FEMA for asteroid impact emergency response',
      'Annual budget ~$200M (FY2025) for planetary defense activities',
    ],
    timeline: '2016 - Present',
  },
  {
    id: 'neowise',
    name: 'NEOWISE (retired)',
    agency: 'NASA / JPL',
    status: 'Completed',
    statusColor: 'text-slate-400',
    description: 'Repurposed WISE infrared space telescope that operated as a NEO hunter from 2013 until February 2024. Provided thermal measurements crucial for determining asteroid sizes and albedos.',
    keyResults: [
      'Discovered 388 NEOs including 34 PHAs during its mission',
      'Characterized over 1,850 NEOs with thermal model diameters',
      'Detected over 215,000 asteroids and comets in total across all populations',
      'Deorbited and burned up in atmosphere on March 30, 2024',
      'Successor NEO Surveyor will provide 50x improvement in sensitivity',
    ],
    timeline: '2013 - 2024',
  },
  {
    id: 'smpag',
    name: 'Space Mission Planning Advisory Group (SMPAG)',
    agency: 'UN / International',
    status: 'Operational',
    statusColor: 'text-green-400',
    description: 'UN-endorsed intergovernmental forum that prepares for an international response to a NEO threat through development of deflection mission options and coordination between space agencies.',
    keyResults: [
      'Established in 2014 under UN Committee on the Peaceful Uses of Outer Space',
      '18 space agency members coordinate deflection mission concepts',
      'Published framework for international response to credible impact threat',
      'Conducts regular planetary defense exercises with IAWN',
      'Working on rapid-response mission architectures for short-warning scenarios',
    ],
    timeline: '2014 - Present',
  },
];

const FALLBACK_MINING_TARGETS: MiningTarget[] = [
  {
    id: 'psyche',
    name: '16 Psyche',
    designation: '(16) Psyche',
    spectralType: 'M-type (Metallic)',
    diameterKm: 226,
    deltaV: 9.4,
    estimatedValue: '$10,000 quadrillion',
    resources: ['Iron', 'Nickel', 'Gold', 'Platinum', 'Copper'],
    accessibility: 'Difficult',
    accessColor: 'text-orange-400',
    notes: 'Believed to be the exposed iron core of a protoplanet. NASA Psyche spacecraft arrived October 2029. Contains enough iron to satisfy Earth demand for millions of years.',
  },
  {
    id: 'ryugu',
    name: '162173 Ryugu',
    designation: '(162173) Ryugu',
    spectralType: 'C-type (Carbonaceous)',
    diameterKm: 0.9,
    deltaV: 4.66,
    estimatedValue: '$82.76 billion',
    resources: ['Water', 'Carbon', 'Organic Compounds', 'Phosphorus', 'Nitrogen'],
    accessibility: 'Accessible',
    accessColor: 'text-green-400',
    notes: 'Sampled by JAXA Hayabusa2. Returned 5.4 grams of material in December 2020. Found amino acids, confirming pristine carbonaceous composition. Excellent ISRU candidate for water extraction.',
  },
  {
    id: 'bennu-mining',
    name: '101955 Bennu',
    designation: '(101955) Bennu',
    spectralType: 'B-type (Carbonaceous)',
    diameterKm: 0.49,
    deltaV: 5.09,
    estimatedValue: '$669 million',
    resources: ['Water', 'Organic Compounds', 'Platinum Group Metals', 'Iron', 'Hydrogen'],
    accessibility: 'Accessible',
    accessColor: 'text-green-400',
    notes: 'Sampled by NASA OSIRIS-REx, returned 121.6 grams in September 2023. Contains hydrated clay minerals (~10% water by mass). Most thoroughly characterized small asteroid.',
  },
  {
    id: 'nereus',
    name: '4660 Nereus',
    designation: '(4660) Nereus',
    spectralType: 'X-type (Enstatite)',
    diameterKm: 0.33,
    deltaV: 4.98,
    estimatedValue: '$4.71 billion',
    resources: ['Iron', 'Nickel', 'Cobalt', 'Platinum Group Metals'],
    accessibility: 'Accessible',
    accessColor: 'text-green-400',
    notes: 'One of the most accessible NEOs by delta-v. Frequent Earth close approaches (every ~7 years). Often cited as a prime early mining target due to low energy requirements.',
  },
  {
    id: 'anteros',
    name: '1943 Anteros',
    designation: '(1943) Anteros',
    spectralType: 'S-type (Silicaceous)',
    diameterKm: 2.3,
    deltaV: 5.45,
    estimatedValue: '$5.57 trillion',
    resources: ['Iron', 'Magnesium Silicate', 'Nickel', 'Aluminum'],
    accessibility: 'Accessible',
    accessColor: 'text-green-400',
    notes: 'Amor-class asteroid with relatively low delta-v. Large diameter provides substantial total resource mass. Silicate-rich composition suitable for construction materials in space.',
  },
  {
    id: 'itokawa',
    name: '25143 Itokawa',
    designation: '(25143) Itokawa',
    spectralType: 'S-type (Silicaceous)',
    diameterKm: 0.35,
    deltaV: 6.01,
    estimatedValue: '$2.1 billion',
    resources: ['Iron', 'Olivine', 'Pyroxene', 'Nickel', 'Troilite'],
    accessibility: 'Challenging',
    accessColor: 'text-yellow-400',
    notes: 'First asteroid from which surface samples were returned (JAXA Hayabusa, 2010). Rubble pile structure confirmed -- important for mining technique development.',
  },
  {
    id: '2011-uw158',
    name: '2011 UW158',
    designation: '2011 UW158',
    spectralType: 'X-type (Metallic)',
    diameterKm: 0.3,
    deltaV: 5.84,
    estimatedValue: '$5.4 trillion',
    resources: ['Platinum', 'Rhenium', 'Osmium', 'Iron', 'Nickel'],
    accessibility: 'Challenging',
    accessColor: 'text-yellow-400',
    notes: 'Estimated to contain ~$5 trillion in platinum-group metals based on radar-derived density. Fast rotator (37-minute period) suggesting monolithic metallic interior.',
  },
  {
    id: 'davida',
    name: '511 Davida',
    designation: '(511) Davida',
    spectralType: 'C-type (Carbonaceous)',
    diameterKm: 289,
    deltaV: 8.95,
    estimatedValue: '$27 trillion',
    resources: ['Water', 'Carbon', 'Organic Compounds', 'Silicates', 'Iron'],
    accessibility: 'Difficult',
    accessColor: 'text-orange-400',
    notes: 'One of the largest main-belt asteroids. Enormous resource potential but high delta-v makes access challenging. Future in-situ resource utilization could make this viable.',
  },
];

const FALLBACK_MINING_COMPANIES: MiningCompany[] = [
  {
    name: 'AstroForge',
    status: 'Active',
    statusColor: 'text-green-400',
    focus: 'Platinum-group metal extraction from M-type asteroids',
    funding: '$55M+ (Series A, 2024)',
    description: 'Founded 2022. Launched Odin test payload in April 2023. Planning Vestri refinery mission to a near-Earth asteroid. Developing in-situ refining technology to process asteroid material in space and return only purified metals.',
  },
  {
    name: 'TransAstra Corporation',
    status: 'Active',
    statusColor: 'text-green-400',
    focus: 'Optical mining using concentrated sunlight for volatile extraction',
    funding: '$20M+ (NASA contracts + private)',
    description: 'Founded 2015 by Joel Sercel (JPL veteran). Developing optical mining technology that uses concentrated sunlight to extract water and volatiles from asteroids and lunar regolith. Won multiple NASA SBIR/STTR contracts. Building Worker Bee spacecraft for asteroid capture.',
  },
  {
    name: 'Karman+',
    status: 'Active',
    statusColor: 'text-green-400',
    focus: 'Near-Earth asteroid prospecting and resource mapping',
    funding: '$4M+ (Seed)',
    description: 'UK-based startup focused on asteroid prospecting missions. Developing low-cost spacecraft to characterize NEO compositions before committing to full mining operations. Applying AI for autonomous navigation and resource identification.',
  },
  {
    name: 'Origin Space',
    status: 'Active',
    statusColor: 'text-green-400',
    focus: 'Space resource utilization and asteroid mining technology',
    funding: '$62M+ (Series B)',
    description: 'Chinese company founded 2017. Launched NEO-01 debris/asteroid observation satellite in 2021. Developing small spacecraft fleet for asteroid prospecting. Planning demonstration mining mission by 2030.',
  },
  {
    name: 'Planetary Resources (Defunct)',
    status: 'Acquired / Defunct',
    statusColor: 'text-slate-500',
    focus: 'NEO water and PGM extraction',
    funding: '$50M+ raised before acquisition',
    description: 'Pioneer asteroid mining company (2012-2018). Backed by Larry Page and Eric Schmidt. Launched Arkyd-6 test satellite. Acquired by ConsenSys in 2018; space assets later dissolved. Demonstrated early interest but market timing was premature.',
  },
  {
    name: 'Deep Space Industries (Defunct)',
    status: 'Acquired / Defunct',
    statusColor: 'text-slate-500',
    focus: 'Asteroid prospecting and small spacecraft propulsion',
    funding: '$10M+ raised',
    description: 'Founded 2013, acquired by Bradford Space (now Firefly Aerospace subsidiary) in 2019. Developed Comet water-based thruster technology. Pivoted from mining to propulsion systems before acquisition. Technology lives on in current spacecraft systems.',
  },
];

const FALLBACK_SURVEY_TELESCOPES: SurveyTelescope[] = [
  {
    name: 'Catalina Sky Survey (CSS)',
    operator: 'University of Arizona / NASA',
    location: 'Mt. Lemmon & Mt. Bigelow, Arizona',
    neoDiscoveries: 14700,
    percentContribution: 47,
    status: 'Operational',
    statusColor: 'text-green-400',
    description: 'The most prolific NEO discovery survey in history. Uses three telescopes: the 1.5m Mt. Lemmon telescope, the 0.7m Schmidt on Mt. Bigelow, and a 1.0m telescope at Siding Spring, Australia.',
  },
  {
    name: 'Pan-STARRS (PS1 & PS2)',
    operator: 'University of Hawaii / USAF',
    location: 'Haleakala, Maui, Hawaii',
    neoDiscoveries: 8200,
    percentContribution: 26,
    status: 'Operational',
    statusColor: 'text-green-400',
    description: 'Two 1.8m telescopes with 1.4-gigapixel cameras each. Discovered the first known interstellar object 1I/Oumuamua in 2017. Excels at finding faint, distant objects due to large aperture.',
  },
  {
    name: 'ATLAS (Asteroid Terrestrial-impact Last Alert System)',
    operator: 'University of Hawaii / NASA',
    location: 'Hawaii, Chile, South Africa, Canary Islands',
    neoDiscoveries: 870,
    percentContribution: 3,
    status: 'Operational',
    statusColor: 'text-green-400',
    description: 'Four 0.5m telescopes providing near-all-sky coverage every 24 hours. Designed for final warning of imminent impactors. Detected 2024 BX1 and 2023 CX1 hours before atmospheric entry.',
  },
  {
    name: 'Spacewatch',
    operator: 'University of Arizona',
    location: 'Kitt Peak, Arizona',
    neoDiscoveries: 3840,
    percentContribution: 12,
    status: 'Operational',
    statusColor: 'text-green-400',
    description: 'Pioneering NEO survey operating since 1984. Uses 0.9m and 1.8m telescopes on Kitt Peak. First survey to use CCDs for automated asteroid detection. Specializes in follow-up and recovery observations.',
  },
  {
    name: 'LINEAR (Lincoln Near-Earth Asteroid Research)',
    operator: 'MIT Lincoln Laboratory / USAF',
    location: 'White Sands, New Mexico',
    neoDiscoveries: 2430,
    percentContribution: 8,
    status: 'Decommissioned',
    statusColor: 'text-slate-400',
    description: 'Operated 1996-2012 using two 1.0m GEODSS telescopes. Was the leading NEO discovery survey from 1998-2005 before CSS and Pan-STARRS surpassed it. Discovered over 2,400 NEOs.',
  },
  {
    name: 'Vera C. Rubin Observatory (LSST)',
    operator: 'Rubin Observatory / NSF / DOE',
    location: 'Cerro Pachon, Chile',
    neoDiscoveries: 0,
    percentContribution: 0,
    status: 'Commissioning',
    statusColor: 'text-yellow-400',
    description: 'Revolutionary 8.4m telescope with 3.2-gigapixel camera. First light achieved 2025, beginning 10-year LSST survey. Expected to discover 60-70% of remaining 140m+ NEOs and detect ~5 million NEO observations.',
  },
  {
    name: 'NEO Surveyor (space-based)',
    operator: 'NASA / JPL',
    location: 'Sun-Earth L1 Lagrange Point (planned)',
    neoDiscoveries: 0,
    percentContribution: 0,
    status: 'In Development',
    statusColor: 'text-yellow-400',
    description: 'Infrared space telescope launching NET 2028. Will detect NEOs by thermal emission, finding dark asteroids invisible to optical surveys. Key to achieving the Congressional 90% completeness mandate for 140m+ NEOs.',
  },
];

const FALLBACK_DISCOVERY_MILESTONES: DiscoveryMilestone[] = [
  { year: 1898, cumulativeNEOs: 1, cumulativePHAs: 0, notable: '433 Eros discovered -- first known Near-Earth Asteroid' },
  { year: 1932, cumulativeNEOs: 2, cumulativePHAs: 1, notable: '1862 Apollo discovered -- defines the Apollo class of Earth-crossers' },
  { year: 1976, cumulativeNEOs: 40, cumulativePHAs: 8, notable: '2062 Aten discovered -- defines the Aten class (a < 1 AU)' },
  { year: 1989, cumulativeNEOs: 89, cumulativePHAs: 20, notable: '4581 Asclepius passes 0.003 AU from Earth -- motivates survey programs' },
  { year: 1995, cumulativeNEOs: 350, cumulativePHAs: 70, notable: 'Spaceguard goal set: find 90% of 1 km+ NEOs within 10 years' },
  { year: 1998, cumulativeNEOs: 460, cumulativePHAs: 120, notable: 'LINEAR survey begins, dramatically accelerating discovery rate' },
  { year: 2000, cumulativeNEOs: 1200, cumulativePHAs: 280, notable: 'NEAR Shoemaker orbits and lands on 433 Eros' },
  { year: 2004, cumulativeNEOs: 3200, cumulativePHAs: 650, notable: 'Apophis initially rated Torino 4 -- highest ever. Later downgraded.' },
  { year: 2005, cumulativeNEOs: 3800, cumulativePHAs: 780, notable: 'George E. Brown Jr. Act mandates 90% of 140m+ NEOs by 2020' },
  { year: 2008, cumulativeNEOs: 5700, cumulativePHAs: 1050, notable: '2008 TC3 detected 20 hours before impact -- first predicted Earth strike' },
  { year: 2010, cumulativeNEOs: 7500, cumulativePHAs: 1200, notable: 'Hayabusa returns first asteroid samples from 25143 Itokawa' },
  { year: 2013, cumulativeNEOs: 10500, cumulativePHAs: 1450, notable: 'Chelyabinsk airburst: undetected 20m asteroid injures 1,500 people' },
  { year: 2015, cumulativeNEOs: 13500, cumulativePHAs: 1650, notable: 'Total known NEOs surpass 13,000; discovery rate accelerating' },
  { year: 2017, cumulativeNEOs: 17000, cumulativePHAs: 1850, notable: 'Oumuamua -- first interstellar object detected (Pan-STARRS)' },
  { year: 2019, cumulativeNEOs: 21000, cumulativePHAs: 2000, notable: '2019 OK (100m) passes 0.19 LD undetected until hours before' },
  { year: 2020, cumulativeNEOs: 24000, cumulativePHAs: 2090, notable: 'Hayabusa2 returns 5.4g sample from Ryugu; OSIRIS-REx collects from Bennu' },
  { year: 2022, cumulativeNEOs: 29000, cumulativePHAs: 2200, notable: 'DART impacts Dimorphos -- first successful asteroid deflection test' },
  { year: 2023, cumulativeNEOs: 31500, cumulativePHAs: 2290, notable: 'OSIRIS-REx returns 121.6g of Bennu; 2023 CX1 detected pre-impact' },
  { year: 2024, cumulativeNEOs: 33200, cumulativePHAs: 2340, notable: '2024 BX1 detected hours pre-impact; Hera launches to Didymos; 2024 YR4 rated Torino 3' },
  { year: 2025, cumulativeNEOs: 34521, cumulativePHAs: 2381, notable: 'Rubin Observatory first light; NEO Surveyor nearing launch; 34,500+ NEOs known' },
];

const FALLBACK_IMPACT_RISK_OBJECTS: ImpactRiskObject[] = [
  {
    des: '2024 YR4',
    fullname: '2024 YR4',
    ip: '1.2e-02',
    ps_cum: '-1.35',
    ps_max: '-1.67',
    v_inf: '16.80',
    last_obs: '2025-02-14',
    n_imp: '2',
    range: '2032-2032',
    ts_max: '0',
    diameter: '40-90 m',
  },
  {
    des: '101955',
    fullname: '101955 Bennu',
    ip: '3.7e-04',
    ps_cum: '-1.42',
    ps_max: '-2.20',
    v_inf: '6.02',
    last_obs: '2023-09-24',
    n_imp: '78',
    range: '2178-2300',
    ts_max: '0',
    diameter: '490 m',
  },
  {
    des: '29075',
    fullname: '29075 (1950 DA)',
    ip: '2.5e-04',
    ps_cum: '-2.05',
    ps_max: '-2.05',
    v_inf: '14.40',
    last_obs: '2024-03-12',
    n_imp: '1',
    range: '2880-2880',
    ts_max: '0',
    diameter: '1.1-1.4 km',
  },
  {
    des: '410777',
    fullname: '410777 (2009 FD)',
    ip: '2.7e-04',
    ps_cum: '-1.80',
    ps_max: '-2.53',
    v_inf: '15.49',
    last_obs: '2024-06-01',
    n_imp: '38',
    range: '2185-2198',
    ts_max: '0',
    diameter: '120-270 m',
  },
  {
    des: '7482',
    fullname: '7482 (1994 PC1)',
    ip: '6.8e-07',
    ps_cum: '-4.21',
    ps_max: '-4.54',
    v_inf: '19.56',
    last_obs: '2022-01-19',
    n_imp: '3',
    range: '2182-2199',
    ts_max: '0',
    diameter: '1.0 km',
  },
  {
    des: '2023 DW',
    fullname: '2023 DW',
    ip: '1.4e-05',
    ps_cum: '-3.80',
    ps_max: '-3.80',
    v_inf: '24.60',
    last_obs: '2024-01-15',
    n_imp: '1',
    range: '2046-2046',
    ts_max: '0',
    diameter: '40-70 m',
  },
  {
    des: '2010 RF12',
    fullname: '2010 RF12',
    ip: '5.9e-02',
    ps_cum: '-2.83',
    ps_max: '-3.42',
    v_inf: '7.78',
    last_obs: '2023-09-10',
    n_imp: '18',
    range: '2095-2118',
    ts_max: '0',
    diameter: '6-14 m',
  },
  {
    des: '2008 JL3',
    fullname: '2008 JL3',
    ip: '5.2e-05',
    ps_cum: '-3.46',
    ps_max: '-4.10',
    v_inf: '10.15',
    last_obs: '2024-04-22',
    n_imp: '5',
    range: '2027-2114',
    ts_max: '0',
    diameter: '10-23 m',
  },
];

const FALLBACK_FIREBALL_EVENTS: FireballEvent[] = [
  {
    date: '2013-02-15 03:20:33',
    energy: '3.75e+14',
    impact_e: '440',
    lat: '54.8N',
    lon: '61.1E',
    alt: '23.3',
    vel: '19.16',
  },
  {
    date: '2024-01-21 00:32:38',
    energy: '3.2e+09',
    impact_e: '0.0008',
    lat: '52.5N',
    lon: '13.2E',
    alt: '35.0',
    vel: '15.2',
  },
  {
    date: '2023-02-13 02:59:22',
    energy: '7.4e+10',
    impact_e: '0.018',
    lat: '50.3N',
    lon: '0.7W',
    alt: '30.0',
    vel: '14.5',
  },
  {
    date: '2018-12-18 23:48:20',
    energy: '8.2e+13',
    impact_e: '173',
    lat: '56.9N',
    lon: '172.4E',
    alt: '25.6',
    vel: '32.0',
  },
  {
    date: '2024-09-04 16:39:43',
    energy: '1.1e+10',
    impact_e: '0.003',
    lat: '42.7N',
    lon: '12.3E',
    alt: '42.0',
    vel: '12.8',
  },
  {
    date: '2023-11-19 09:45:12',
    energy: '2.8e+10',
    impact_e: '0.007',
    lat: '34.1S',
    lon: '150.8E',
    alt: '38.5',
    vel: '17.3',
  },
  {
    date: '2022-03-11 21:22:45',
    energy: '4.5e+11',
    impact_e: '0.1',
    lat: '60.1N',
    lon: '24.9E',
    alt: '22.0',
    vel: '23.7',
  },
  {
    date: '2019-12-18 11:48:17',
    energy: '1.3e+14',
    impact_e: '49',
    lat: '56.9N',
    lon: '172.4E',
    alt: '25.6',
    vel: '32.0',
  },
  {
    date: '2021-04-28 03:05:33',
    energy: '5.6e+09',
    impact_e: '0.0013',
    lat: '45.2N',
    lon: '8.1E',
    alt: '44.0',
    vel: '15.8',
  },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function getTorinoColor(scale: number): { bg: string; text: string; border: string; label: string } {
  if (scale === 0) return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500', label: 'No Hazard' };
  if (scale === 1) return { bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-400', label: 'Normal' };
  if (scale >= 2 && scale <= 4) return { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500', label: 'Meriting Attention' };
  if (scale >= 5 && scale <= 7) return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500', label: 'Threatening' };
  return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500', label: 'Certain Collision' };
}

function formatDiameter(min: number, max: number): string {
  if (min === max) return `${min} m`;
  return `${min} - ${max} m`;
}

function getDistanceColor(ld: number): string {
  if (ld <= 1) return 'text-red-400';
  if (ld <= 5) return 'text-orange-400';
  if (ld <= 10) return 'text-yellow-400';
  return 'text-slate-300';
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function ApproachCard({ approach }: { approach: CloseApproach }) {
  const torino = getTorinoColor(approach.torino);
  const approachDate = new Date(approach.date);
  const now = new Date();
  const daysUntil = Math.ceil((approachDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isPast = daysUntil < 0;

  return (
    <div className={`card p-5 border ${approach.torino >= 2 ? torino.border : 'border-white/[0.06]'} ${approach.torino >= 2 ? torino.bg : ''}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-semibold text-white text-lg">{approach.name}</h4>
            {approach.isPHA && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-500/50">
                PHA
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${torino.bg} ${torino.text} border ${torino.border}`}>
              Torino {approach.torino}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/[0.08] text-slate-400">
              {approach.orbitClass}
            </span>
            {isPast && (
              <span className="text-xs bg-white/[0.08] text-slate-500 px-2 py-0.5 rounded">Past</span>
            )}
          </div>
          <div className="text-slate-400 text-sm">
            {approachDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            <span className="text-slate-500 ml-2">
              ({isPast ? `${Math.abs(daysUntil)}d ago` : daysUntil === 0 ? 'Today' : `in ${daysUntil}d`})
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0 space-y-1">
          <div className="text-sm">
            <span className="text-slate-400">Distance: </span>
            <span className={`font-bold ${getDistanceColor(approach.distanceLD)}`}>
              {approach.distanceLD.toFixed(1)} LD
            </span>
            <span className="text-slate-500 text-xs ml-1">({approach.distanceAU.toFixed(4)} AU)</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">Velocity: </span>
            <span className="text-white font-medium">{approach.velocity.toFixed(1)} km/s</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.06] text-xs">
        <span className="text-slate-400">
          Diameter: <span className="text-slate-300 font-medium">{formatDiameter(approach.diameterMin, approach.diameterMax)}</span>
        </span>
        <span className="text-slate-400">
          Palermo: <span className={`font-medium ${approach.palermo > -2 ? 'text-yellow-400' : 'text-slate-500'}`}>
            {approach.palermo <= -10 ? '< -10' : approach.palermo.toFixed(1)}
          </span>
        </span>
        {approach.torino >= 2 && (
          <span className={`font-medium ${torino.text}`}>
            {torino.label}
          </span>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, subValue, valueColor }: { value: string; label: string; subValue?: string; valueColor?: string }) {
  return (
    <div className="card-elevated p-4 text-center">
      <div className={`text-2xl font-bold font-display ${valueColor || 'text-white'}`}>
        {value}
      </div>
      <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
        {label}
      </div>
      {subValue && (
        <div className="text-slate-500 text-xs mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Main Content
// ────────────────────────────────────────

function AsteroidWatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = (searchParams.get('tab') as TabId) || 'approaches';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // API-fetched data (initialized with fallback so page renders immediately)
  const [CLOSE_APPROACHES, setCloseApproaches] = useState<CloseApproach[]>(FALLBACK_CLOSE_APPROACHES);
  const [NEO_STATS, setNeoStats] = useState<any>(FALLBACK_NEO_STATS);
  const [SIZE_CATEGORIES, setSizeCategories] = useState<SizeCategory[]>(FALLBACK_SIZE_CATEGORIES);
  const [SPECTRAL_DISTRIBUTION, setSpectralDistribution] = useState<any[]>(FALLBACK_SPECTRAL_DISTRIBUTION);
  const [DEFENSE_PROGRAMS, setDefensePrograms] = useState<DefenseProgram[]>(FALLBACK_DEFENSE_PROGRAMS);
  const [MINING_TARGETS, setMiningTargets] = useState<MiningTarget[]>(FALLBACK_MINING_TARGETS);
  const [MINING_COMPANIES, setMiningCompanies] = useState<MiningCompany[]>(FALLBACK_MINING_COMPANIES);
  const [SURVEY_TELESCOPES, setSurveyTelescopes] = useState<SurveyTelescope[]>(FALLBACK_SURVEY_TELESCOPES);
  const [DISCOVERY_MILESTONES, setDiscoveryMilestones] = useState<DiscoveryMilestone[]>(FALLBACK_DISCOVERY_MILESTONES);
  const [IMPACT_RISK_OBJECTS, setImpactRiskObjects] = useState<ImpactRiskObject[]>(FALLBACK_IMPACT_RISK_OBJECTS);
  const [FIREBALL_EVENTS, setFireballEvents] = useState<FireballEvent[]>(FALLBACK_FIREBALL_EVENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setError(null);
      try {
        const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11] = await Promise.all([
          fetch('/api/content/asteroid-watch?section=close-approaches'),
          fetch('/api/content/asteroid-watch?section=neo-stats'),
          fetch('/api/content/asteroid-watch?section=size-categories'),
          fetch('/api/content/asteroid-watch?section=spectral-distribution'),
          fetch('/api/content/asteroid-watch?section=defense-programs'),
          fetch('/api/content/asteroid-watch?section=mining-targets'),
          fetch('/api/content/asteroid-watch?section=mining-companies'),
          fetch('/api/content/asteroid-watch?section=survey-telescopes'),
          fetch('/api/content/asteroid-watch?section=discovery-milestones'),
          fetch('/api/content/asteroid-watch?section=impact-risk'),
          fetch('/api/content/asteroid-watch?section=fireballs'),
        ]);
        const [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11] = await Promise.all([
          r1.json(), r2.json(), r3.json(), r4.json(), r5.json(), r6.json(), r7.json(), r8.json(), r9.json(), r10.json(), r11.json(),
        ]);
        setCloseApproaches(d1.data?.length > 3 ? d1.data : FALLBACK_CLOSE_APPROACHES);
        if (d2.data?.[0] && d2.data[0].totalNEOs > 0) setNeoStats(d2.data[0]);
        setSizeCategories(d3.data?.length > 2 ? d3.data : FALLBACK_SIZE_CATEGORIES);
        setSpectralDistribution(d4.data?.length > 2 ? d4.data : FALLBACK_SPECTRAL_DISTRIBUTION);
        setDefensePrograms(d5.data?.length > 2 ? d5.data : FALLBACK_DEFENSE_PROGRAMS);
        setMiningTargets(d6.data?.length > 2 ? d6.data : FALLBACK_MINING_TARGETS);
        setMiningCompanies(d7.data?.length > 2 ? d7.data : FALLBACK_MINING_COMPANIES);
        setSurveyTelescopes(d8.data?.length > 2 ? d8.data : FALLBACK_SURVEY_TELESCOPES);
        setDiscoveryMilestones(d9.data?.length > 3 ? d9.data : FALLBACK_DISCOVERY_MILESTONES);
        setImpactRiskObjects(d10.data?.length > 2 ? d10.data : FALLBACK_IMPACT_RISK_OBJECTS);
        setFireballEvents(d11.data?.length > 2 ? d11.data : FALLBACK_FIREBALL_EVENTS);
        setRefreshedAt(d1.meta?.lastRefreshed || null);
      } catch (error) {
        clientLogger.error('Failed to load asteroid watch data', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'approaches') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'approaches', label: 'Close Approaches' },
    { id: 'known-objects', label: 'Known Objects' },
    { id: 'defense', label: 'Planetary Defense' },
    { id: 'mining', label: 'Mining Targets' },
    { id: 'discovery', label: 'Discovery' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/[0.06] rounded w-1/3"></div>
            <div className="h-4 bg-white/[0.06] rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sortedApproaches = [...CLOSE_APPROACHES].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  const phaCount = CLOSE_APPROACHES.filter(a => a.isPHA).length;
  const closestApproach = [...CLOSE_APPROACHES].sort((a, b) => a.distanceLD - b.distanceLD)[0];
  const highestTorino = [...CLOSE_APPROACHES].sort((a, b) => b.torino - a.torino)[0];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Asteroid Watch"
          subtitle="Near-Earth object tracking, planetary defense intelligence, and asteroid mining prospects"
          icon="☄️"
          accentColor="amber"
        />

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />

        {error && !loading && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard value={NEO_STATS.totalNEOs.toLocaleString()} label="Known NEOs" subValue={`+${NEO_STATS.last30DaysDiscoveries} last 30d`} />
          <StatCard value={NEO_STATS.totalPHAs.toLocaleString()} label="Known PHAs" valueColor="text-orange-400" />
          <StatCard value={`${CLOSE_APPROACHES.length}`} label="Tracked Approaches" />
          <StatCard value={`${phaCount}`} label="PHAs in List" valueColor={phaCount > 0 ? 'text-red-400' : 'text-green-400'} />
          <StatCard value={closestApproach ? `${closestApproach.distanceLD.toFixed(1)} LD` : 'N/A'} label="Closest Pass" valueColor={getDistanceColor(closestApproach?.distanceLD || 99)} />
          <StatCard
            value={`${highestTorino?.torino || 0}`}
            label="Highest Torino"
            valueColor={highestTorino?.torino >= 2 ? 'text-yellow-400' : 'text-green-400'}
            subValue={highestTorino?.name}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900'
                    : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ExportButton
            data={CLOSE_APPROACHES.map(a => ({
              name: a.name,
              date: a.date,
              distanceLD: a.distanceLD,
              distanceAU: a.distanceAU,
              diameterMinM: a.diameterMin,
              diameterMaxM: a.diameterMax,
              velocityKmS: a.velocity,
              torinoScale: a.torino,
              palermoScale: a.palermo,
              isPHA: a.isPHA ? 'Yes' : 'No',
              orbitClass: a.orbitClass,
            })) as Record<string, unknown>[]}
            filename="spacenexus-asteroids"
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'date', label: 'Close Approach Date' },
              { key: 'distanceLD', label: 'Distance (LD)' },
              { key: 'distanceAU', label: 'Distance (AU)' },
              { key: 'diameterMinM', label: 'Diameter Min (m)' },
              { key: 'diameterMaxM', label: 'Diameter Max (m)' },
              { key: 'velocityKmS', label: 'Velocity (km/s)' },
              { key: 'torinoScale', label: 'Torino Scale' },
              { key: 'palermoScale', label: 'Palermo Scale' },
              { key: 'isPHA', label: 'PHA' },
              { key: 'orbitClass', label: 'Orbit Class' },
            ]}
            label="Export NEOs"
          />
        </div>

        {/* ──────────────── CLOSE APPROACHES TAB ──────────────── */}
        {activeTab === 'approaches' && (
          <div className="space-y-4">
            {/* Torino Scale Legend */}
            <div className="card p-4 mb-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400 font-medium">Torino Scale:</span>
                {[
                  { range: '0', label: 'No Hazard', color: 'bg-green-500' },
                  { range: '1', label: 'Normal', color: 'bg-green-400' },
                  { range: '2-4', label: 'Meriting Attention', color: 'bg-yellow-500' },
                  { range: '5-7', label: 'Threatening', color: 'bg-orange-500' },
                  { range: '8-10', label: 'Certain Collision', color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.range} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${item.color}`} />
                    <span className="text-slate-400">{item.range}: {item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Approach Cards */}
            {sortedApproaches.map((approach) => (
              <ApproachCard key={approach.id} approach={approach} />
            ))}

            {/* Key Upcoming Events Highlight */}
            <div className="card p-6 border border-white/10 bg-white/5 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Key Upcoming Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.04] rounded-lg">
                  <div className="text-white/90 font-semibold mb-1">Apophis Close Approach</div>
                  <div className="text-slate-400 text-sm">April 13, 2029</div>
                  <p className="text-slate-400 text-sm mt-2">
                    99942 Apophis will pass within 31,600 km of Earth -- closer than geostationary satellites.
                    Visible to the naked eye from parts of the Eastern Hemisphere. No impact risk (Torino 0),
                    but the closest approach of an asteroid this large in recorded history.
                  </p>
                </div>
                <div className="p-4 bg-white/[0.04] rounded-lg">
                  <div className="text-white/90 font-semibold mb-1">Bennu Close Approach</div>
                  <div className="text-slate-400 text-sm">September 25, 2060</div>
                  <p className="text-slate-400 text-sm mt-2">
                    101955 Bennu will make a very close approach to Earth. While cumulative impact
                    probability through 2300 is ~1/2,700, the OSIRIS-REx mission refined its orbit
                    to high precision. Bennu remains the best-characterized PHA.
                  </p>
                </div>
              </div>
            </div>

            {/* Impact Risk Assessment */}
            {IMPACT_RISK_OBJECTS.length > 0 && (
              <div className="card p-6 mt-6">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-red-400">&#9888;</span> Impact Risk Assessment
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Objects with non-zero impact probability tracked by NASA/JPL Sentry system. Most risks are extremely small and decrease with additional observations.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-white/[0.06]">
                        <th className="pb-3 pr-4">Object</th>
                        <th className="pb-3 pr-4">Diameter</th>
                        <th className="pb-3 pr-4 text-right">Impact Prob.</th>
                        <th className="pb-3 pr-4 text-right">Torino Max</th>
                        <th className="pb-3 pr-4 text-right">Palermo Cum.</th>
                        <th className="pb-3 pr-4">Potential Impacts</th>
                        <th className="pb-3">Last Observed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IMPACT_RISK_OBJECTS.map((obj) => {
                        const torinoVal = parseInt(obj.ts_max) || 0;
                        const torinoStyle = getTorinoColor(torinoVal);
                        return (
                          <tr key={obj.des} className="border-b border-white/[0.06]">
                            <td className="py-2.5 pr-4">
                              <div className="text-white font-medium">{obj.fullname || obj.des}</div>
                              <div className="text-slate-500 text-xs">{obj.range}</div>
                            </td>
                            <td className="py-2.5 pr-4 text-slate-300">{obj.diameter || '--'}</td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className={`font-medium ${parseFloat(obj.ip) > 0.01 ? 'text-red-400' : parseFloat(obj.ip) > 0.001 ? 'text-yellow-400' : 'text-slate-300'}`}>
                                {obj.ip}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${torinoStyle.bg} ${torinoStyle.text} border ${torinoStyle.border}`}>
                                {obj.ts_max}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className={`font-medium ${parseFloat(obj.ps_cum) > -2 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                {obj.ps_cum}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-slate-400">{obj.n_imp}</td>
                            <td className="py-2.5 text-slate-400 text-xs">{obj.last_obs}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-500 text-xs mt-4 italic">
                  Data from NASA/JPL Sentry impact monitoring system. Impact probabilities are cumulative over all potential impact dates.
                </p>
              </div>
            )}

            {/* Recent Fireball Events */}
            {FIREBALL_EVENTS.length > 0 && (
              <div className="card p-6 mt-6">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-orange-400">&#9728;</span> Recent Fireball Events
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Bright meteors (fireballs) detected by U.S. Government sensors entering Earth&apos;s atmosphere.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FIREBALL_EVENTS.map((fb, idx) => (
                    <div key={idx} className="card p-4 hover:border-orange-500/30">
                      <div className="text-white font-medium text-sm mb-2">{fb.date}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {fb.lat && fb.lon && (
                          <div>
                            <span className="text-slate-500 block">Location</span>
                            <span className="text-slate-300">{fb.lat}, {fb.lon}</span>
                          </div>
                        )}
                        {fb.vel && (
                          <div>
                            <span className="text-slate-500 block">Velocity</span>
                            <span className="text-slate-300">{fb.vel} km/s</span>
                          </div>
                        )}
                        {fb.alt && (
                          <div>
                            <span className="text-slate-500 block">Altitude</span>
                            <span className="text-slate-300">{fb.alt} km</span>
                          </div>
                        )}
                        {fb.energy && (
                          <div>
                            <span className="text-slate-500 block">Radiated Energy</span>
                            <span className="text-orange-400 font-medium">{fb.energy} J</span>
                          </div>
                        )}
                        {fb.impact_e && (
                          <div>
                            <span className="text-slate-500 block">Impact Energy</span>
                            <span className="text-red-400 font-medium">{fb.impact_e} kt</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {FIREBALL_EVENTS.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8">No recent fireball events available.</p>
                )}
                <p className="text-slate-500 text-xs mt-4 italic">
                  Data from NASA/JPL Center for NEO Studies (CNEOS) fireball database. Energy in joules (radiated) and kilotons TNT equivalent (impact).
                </p>
              </div>
            )}

            {/* Data source note */}
            <ScrollReveal><div className="card p-4 border-dashed text-sm text-slate-500">
              Close approach data sourced from NASA Center for Near-Earth Object Studies (CNEOS) and
              JPL Small-Body Database. Distances in LD (Lunar Distances, 1 LD = 384,400 km) and AU
              (Astronomical Units, 1 AU = 149,597,871 km). Torino Scale ratings reflect current
              impact probability assessments.
            </div></ScrollReveal>
          </div>
        )}

        {/* ──────────────── KNOWN OBJECTS TAB ──────────────── */}
        {activeTab === 'known-objects' && (
          <div className="space-y-6">
            {/* NEO Census Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-white">{NEO_STATS.totalNEAs.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Near-Earth Asteroids</div>
                <div className="text-slate-500 text-xs mt-0.5">Including all orbital classes</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-white">{NEO_STATS.totalNECs.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Near-Earth Comets</div>
                <div className="text-slate-500 text-xs mt-0.5">Periodic and long-period</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-orange-400">{NEO_STATS.totalPHAs.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Potentially Hazardous</div>
                <div className="text-slate-500 text-xs mt-0.5">MOID &lt; 0.05 AU, H &lt; 22</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-white/90">{NEO_STATS.lastYearDiscoveries.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Discovered Last Year</div>
                <div className="text-slate-500 text-xs mt-0.5">~{Math.round(NEO_STATS.lastYearDiscoveries / 12)} per month average</div>
              </div>
            </div>

            {/* Discovery Completeness by Size */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Discovery Completeness by Size</h3>
              <p className="text-slate-400 text-sm mb-6">
                Estimated percentage of existing NEOs discovered for each size category. Larger objects are nearly
                fully cataloged, while small objects remain mostly undiscovered.
              </p>
              <div className="space-y-5">
                {SIZE_CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-white font-medium">{cat.label}</span>
                        <span className="text-slate-500 text-xs ml-2">{cat.range}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300 text-sm font-medium">
                          {cat.known.toLocaleString()} found
                        </span>
                        <span className="text-slate-500 text-xs ml-2">
                          / ~{cat.estimated.toLocaleString()} est.
                        </span>
                      </div>
                    </div>
                    <div className="h-4 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${cat.color} rounded-full transition-all`}
                        style={{ width: `${Math.min(cat.completeness, 100)}%` }}
                      />
                    </div>
                    <div className="text-right mt-0.5">
                      <span className={`text-xs font-medium ${cat.completeness >= 80 ? 'text-green-400' : cat.completeness >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {cat.completeness >= 1 ? `${cat.completeness}%` : `${cat.completeness}%`} complete
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spectral Type Distribution */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Spectral Type Distribution</h3>
              <p className="text-slate-400 text-sm mb-6">
                Classification of known NEOs by spectral type, indicating composition and surface properties.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SPECTRAL_DISTRIBUTION.map((spec) => (
                  <div key={spec.type} className="p-4 bg-white/[0.04] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{spec.type}</span>
                      <span className="text-slate-300 font-bold">{spec.percentage}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full bg-gradient-to-r ${spec.color} rounded-full`}
                        style={{ width: `${spec.percentage * 2.5}%` }}
                      />
                    </div>
                    <div className="text-slate-400 text-xs">{spec.description}</div>
                    <div className="text-slate-500 text-xs mt-1">~{spec.count.toLocaleString()} objects</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orbital Class Distribution */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">NEO Orbital Classifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Apollo', count: 18_940, description: 'Earth-crossing, semi-major axis > 1 AU. Largest class of NEOs.', color: 'text-red-400', percentage: 53 },
                  { name: 'Amor', count: 11_280, description: 'Earth-approaching, orbits exterior to Earth. Do not cross Earth orbit.', color: 'text-orange-400', percentage: 32 },
                  { name: 'Aten', count: 4_840, description: 'Earth-crossing, semi-major axis < 1 AU. Spend most time inside Earth orbit.', color: 'text-yellow-400', percentage: 14 },
                  { name: 'Atira', count: 412, description: 'Orbit entirely interior to Earth orbit. Hardest to detect from ground.', color: 'text-slate-300', percentage: 1 },
                ].map((cls) => (
                  <div key={cls.name} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold ${cls.color}`}>{cls.name}</span>
                      <span className="text-white font-display text-lg">{cls.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-white to-plasma-400 rounded-full" style={{ width: `${cls.percentage}%` }} />
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{cls.description}</p>
                    <div className="text-slate-500 text-xs mt-1">{cls.percentage}% of NEOs</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cumulative Discovery Timeline */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Cumulative Discovery Timeline</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-white/[0.06]">
                      <th className="pb-3 pr-4">Year</th>
                      <th className="pb-3 pr-4 text-right">Total NEOs</th>
                      <th className="pb-3 pr-4 text-right">Total PHAs</th>
                      <th className="pb-3">Notable Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISCOVERY_MILESTONES.map((milestone) => (
                      <tr key={milestone.year} className="border-b border-white/[0.06]">
                        <td className="py-2.5 pr-4 text-white font-medium">{milestone.year}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-300">{milestone.cumulativeNEOs.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right text-orange-400">{milestone.cumulativePHAs.toLocaleString()}</td>
                        <td className="py-2.5 text-slate-400 text-xs">{milestone.notable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Visual bar representation */}
              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Discovery Growth</h4>
                <div className="flex items-end gap-1 h-32">
                  {DISCOVERY_MILESTONES.map((m) => {
                    const maxNEO = DISCOVERY_MILESTONES[DISCOVERY_MILESTONES.length - 1].cumulativeNEOs;
                    const heightPct = (m.cumulativeNEOs / maxNEO) * 100;
                    return (
                      <div key={m.year} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-gradient-to-t from-white to-plasma-400 rounded-t transition-all group-hover:opacity-80"
                          style={{ height: `${heightPct}%`, minHeight: '2px' }}
                        />
                        <span className="text-[9px] text-slate-500 rotate-[-45deg] origin-center whitespace-nowrap">{m.year}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-black border border-white/[0.06] rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
                            <div className="text-white font-medium">{m.year}</div>
                            <div className="text-slate-400">{m.cumulativeNEOs.toLocaleString()} NEOs</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── PLANETARY DEFENSE TAB ──────────────── */}
        {activeTab === 'defense' && (
          <div className="space-y-6">
            {/* DART Impact Banner */}
            <div className="card p-6 border-2 border-green-500/30 bg-green-900/10">
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">&#127775;</div>
                <div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">DART Mission: Planetary Defense Validated</h3>
                  <p className="text-slate-300">
                    On September 26, 2022, NASA&apos;s DART spacecraft successfully impacted Dimorphos at 6.1 km/s,
                    changing its orbital period by <span className="text-green-400 font-bold">33 minutes</span> (from 11h 55m to 11h 22m).
                    This far exceeded the minimum 73-second benchmark and confirmed kinetic impactor technology
                    as a viable method to deflect an asteroid on a collision course with Earth.
                  </p>
                </div>
              </div>
            </div>

            {/* Defense Programs */}
            <div className="space-y-4">
              {DEFENSE_PROGRAMS.map((program) => (
                <div key={program.id} className="card p-6">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{program.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-slate-400 text-sm">{program.agency}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white/[0.06] ${program.statusColor}`}>
                          {program.status}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs">{program.timeline}</span>
                  </div>

                  <p className="text-slate-400 text-sm mb-4">{program.description}</p>

                  <div className="space-y-1.5">
                    <h4 className="text-slate-300 text-sm font-medium">Key Results & Facts</h4>
                    <ul className="space-y-1">
                      {program.keyResults.map((result, idx) => (
                        <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                          <span className="text-slate-300 mt-1 flex-shrink-0">&#9656;</span>
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Deflection Methods Overview */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Deflection Technology Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Kinetic Impactor', readiness: 'Flight-Proven (DART)', readinessColor: 'text-green-400', description: 'High-speed spacecraft collision to change asteroid velocity. Most mature technology. Effectiveness depends on target composition and impact geometry.', effectiveness: 'Best for small-medium asteroids with years of warning.' },
                  { name: 'Gravity Tractor', readiness: 'Conceptual', readinessColor: 'text-yellow-400', description: 'Spacecraft hovers near asteroid, using gravitational attraction to slowly alter its orbit. Requires no physical contact but needs long lead time.', effectiveness: 'Best for precise, gentle deflection over decades.' },
                  { name: 'Nuclear Standoff', readiness: 'Theoretical', readinessColor: 'text-orange-400', description: 'Detonation of nuclear device near asteroid surface to vaporize material and create deflection thrust. Only option for large, late-detected threats.', effectiveness: 'Last resort for large objects with short warning time.' },
                  { name: 'Ion Beam Deflection', readiness: 'Conceptual', readinessColor: 'text-yellow-400', description: 'Direct ion thruster exhaust at asteroid surface to impart momentum. Spacecraft maintains position with second thruster.', effectiveness: 'Efficient for slow, sustained deflection campaigns.' },
                  { name: 'Laser Ablation', readiness: 'Laboratory', readinessColor: 'text-orange-400', description: 'Focused laser beam vaporizes asteroid surface material, creating a jet of ejecta that pushes the asteroid. Could operate from orbit.', effectiveness: 'Promising for continuous, controlled deflection.' },
                  { name: 'Mass Driver', readiness: 'Conceptual', readinessColor: 'text-yellow-400', description: 'Robotic device lands on asteroid and uses electromagnetic launcher to eject surface material, producing reaction force.', effectiveness: 'Self-sustaining using asteroid material as propellant.' },
                ].map((method) => (
                  <div key={method.name} className="p-4 bg-white/[0.04] rounded-lg">
                    <h4 className="text-white font-medium mb-1">{method.name}</h4>
                    <span className={`text-xs ${method.readinessColor}`}>{method.readiness}</span>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">{method.description}</p>
                    <p className="text-slate-500 text-xs mt-2 italic">{method.effectiveness}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related modules */}
            <ScrollReveal><div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Related Modules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/space-environment?tab=debris" className="p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-white/90">Debris Monitor</div>
                  <p className="text-xs text-slate-400 mt-1">Impact debris and conjunction tracking</p>
                </Link>
                <Link href="/solar-exploration" className="p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-white/90">Solar Exploration</div>
                  <p className="text-xs text-slate-400 mt-1">Planetary missions and surface landers</p>
                </Link>
                <Link href="/space-mining" className="p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-white/90">Space Mining</div>
                  <p className="text-xs text-slate-400 mt-1">Asteroid mining intelligence</p>
                </Link>
              </div>
            </div></ScrollReveal>
          </div>
        )}

        {/* ──────────────── MINING TARGETS TAB ──────────────── */}
        {activeTab === 'mining' && (
          <div className="space-y-6">
            {/* Mining Targets */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Highest-Value Asteroid Targets</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {MINING_TARGETS.map((target) => (
                  <div key={target.id} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold text-lg">{target.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-500 text-xs">Designation: {target.designation}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300">
                            {target.spectralType}
                          </span>
                          <span className={`text-xs font-medium ${target.accessColor}`}>
                            {target.accessibility}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white/90 font-bold text-sm">{target.estimatedValue}</div>
                        <div className="text-slate-500 text-xs">Est. Value</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-slate-500 block">Diameter</span>
                        <span className="text-slate-300 font-medium">{target.diameterKm} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Delta-V</span>
                        <span className="text-slate-300 font-medium">{target.deltaV} km/s</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-slate-500 text-xs block mb-1">Key Resources</span>
                      <div className="flex flex-wrap gap-1">
                        {target.resources.map((resource) => (
                          <span key={resource} className="text-xs px-2 py-0.5 rounded bg-white/[0.06]/80 text-slate-400">
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed">{target.notes}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mining Companies */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Asteroid Mining Companies</h3>
              <div className="space-y-4">
                {MINING_COMPANIES.map((company) => (
                  <div key={company.name} className="p-4 bg-white/[0.04] rounded-lg">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <h4 className="text-white font-medium">{company.name}</h4>
                        <span className="text-slate-400 text-xs">{company.focus}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium ${company.statusColor}`}>{company.status}</span>
                        <div className="text-slate-500 text-xs">{company.funding}</div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm">{company.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delta-V Accessibility Note */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Understanding Delta-V & Accessibility</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">What is Delta-V?</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Delta-V (change in velocity) measures the energy needed to reach an asteroid from Earth orbit.
                    Lower delta-v means less fuel and lower mission cost. Some NEOs require less delta-v to reach
                    than the Moon (which needs ~6.3 km/s from LEO), making them more accessible for mining operations.
                  </p>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Accessibility Rankings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-medium">Accessible:</span>
                      <span className="text-slate-400">&lt; 5.5 km/s delta-v, favorable windows</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-medium">Challenging:</span>
                      <span className="text-slate-400">5.5 - 7.0 km/s, less frequent windows</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 font-medium">Difficult:</span>
                      <span className="text-slate-400">&gt; 7.0 km/s, main belt or high inclination</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cross-link to Space Mining module */}
            <div className="card p-4 flex items-center justify-between">
              <div>
                <span className="text-white font-medium text-sm">Want comprehensive mining intelligence?</span>
                <p className="text-slate-400 text-xs mt-1">Full commodity pricing, resource exchange, and economic analysis</p>
              </div>
              <Link
                href="/space-mining"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/90 hover:bg-white/15 transition-colors border border-white/10 whitespace-nowrap"
              >
                Space Mining Hub &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* ──────────────── DISCOVERY TAB ──────────────── */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            {/* Survey Telescope Contributions */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Survey Telescope Contributions</h3>
              <p className="text-slate-400 text-sm mb-6">
                NEO discovery credits by major survey telescope programs. Numbers represent confirmed NEO discoveries attributed to each survey.
              </p>
              <div className="space-y-4">
                {[...SURVEY_TELESCOPES]
                  .sort((a, b) => b.neoDiscoveries - a.neoDiscoveries)
                  .map((telescope) => {
                    const maxDiscoveries = SURVEY_TELESCOPES.reduce((max, t) => Math.max(max, t.neoDiscoveries), 0);
                    const widthPct = maxDiscoveries > 0 ? (telescope.neoDiscoveries / maxDiscoveries) * 100 : 0;

                    return (
                      <div key={telescope.name} className="p-4 bg-white/[0.04] rounded-lg">
                        <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                          <div>
                            <h4 className="text-white font-medium">{telescope.name}</h4>
                            <span className="text-slate-500 text-xs">{telescope.operator}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-medium ${telescope.statusColor}`}>{telescope.status}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 h-3 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-white to-plasma-400 rounded-full"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className="text-white font-bold text-sm w-20 text-right">
                            {telescope.neoDiscoveries > 0 ? telescope.neoDiscoveries.toLocaleString() : 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{telescope.location}</span>
                          <span className="text-slate-400">
                            {telescope.percentContribution > 0 ? `${telescope.percentContribution}% of all NEOs` : 'Survey beginning'}
                          </span>
                        </div>

                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">{telescope.description}</p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Vera Rubin Observatory Highlight */}
            <div className="card p-6 border-2 border-blue-500/30 bg-blue-900/10">
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">&#128301;</div>
                <div>
                  <h3 className="text-xl font-bold text-blue-400 mb-2">Vera C. Rubin Observatory: A Revolution in NEO Discovery</h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    The Vera C. Rubin Observatory (formerly LSST) on Cerro Pachon, Chile, achieved first light in 2025
                    and is beginning its 10-year Legacy Survey of Space and Time. Its 8.4-meter primary mirror and
                    3.2-gigapixel camera will survey the entire visible sky every few nights, fundamentally
                    transforming NEO detection capabilities.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-white/[0.04] rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">~5M</div>
                      <div className="text-slate-400 text-xs">Predicted NEO detections over survey lifetime</div>
                    </div>
                    <div className="p-3 bg-white/[0.04] rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">60-70%</div>
                      <div className="text-slate-400 text-xs">Expected to find this share of remaining 140m+ NEOs</div>
                    </div>
                    <div className="p-3 bg-white/[0.04] rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">Every 3 nights</div>
                      <div className="text-slate-400 text-xs">Full southern sky cadence</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Discovery Rate Trends */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Discovery Rate Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-white/[0.04] rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">~260</div>
                  <div className="text-slate-400 text-sm">NEOs per month (2025)</div>
                  <div className="text-slate-500 text-xs mt-1">Up from ~150/month in 2020</div>
                </div>
                <div className="p-4 bg-white/[0.04] rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">~10</div>
                  <div className="text-slate-400 text-sm">PHAs per month (average)</div>
                  <div className="text-slate-500 text-xs mt-1">Rate increasing with survey capability</div>
                </div>
                <div className="p-4 bg-white/[0.04] rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">2</div>
                  <div className="text-slate-400 text-sm">Pre-impact detections to date</div>
                  <div className="text-slate-500 text-xs mt-1">2008 TC3, 2024 BX1</div>
                </div>
              </div>

              <h4 className="text-slate-300 font-medium mb-3">Notable Recent Discoveries</h4>
              <div className="space-y-2">
                {[
                  { date: '2024', name: '2024 YR4', note: 'Initially rated Torino 3 -- highest rating for any object in years. Further observations will refine orbit and likely reduce risk.' },
                  { date: '2024', name: '2024 BX1', note: 'Detected by ATLAS just hours before impact. Third object ever detected before atmospheric entry. Harmless 1-meter object over Germany.' },
                  { date: '2023', name: '2023 CX1', note: 'Detected ~7 hours before impact over English Channel. Demonstrates improving early warning capability.' },
                  { date: '2020', name: '2020 CD3', note: 'Second known temporarily captured natural satellite (mini-moon) of Earth, discovered by Catalina Sky Survey.' },
                  { date: '2019', name: '2019 OK', note: '~100m asteroid passed within 0.19 LD -- discovered only hours before closest approach. Highlighted gaps in detection.' },
                  { date: '2017', name: 'Oumuamua (1I/2017 U1)', note: 'First known interstellar object to pass through our solar system. Discovered by Pan-STARRS.' },
                ].map((discovery, idx) => (
                  <div key={idx} className="p-3 bg-white/[0.04] rounded-lg flex items-start gap-3">
                    <span className="text-slate-300 text-xs font-mono font-medium mt-0.5 flex-shrink-0 w-10">{discovery.date}</span>
                    <div>
                      <span className="text-white font-medium text-sm">{discovery.name}</span>
                      <p className="text-slate-400 text-xs mt-0.5">{discovery.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detection Capabilities */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Detection Capabilities & Gaps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-slate-300 font-medium mb-3">Current Strengths</h4>
                  <ul className="space-y-2">
                    {[
                      '93% of 1km+ NEOs are cataloged -- any civilization-ending impactor is likely known',
                      'All-sky coverage with ATLAS providing 24-hour cadence for bright objects',
                      'Proven ability to detect objects hours before atmospheric entry',
                      'Infrared characterization has measured sizes of 1,850+ NEOs',
                      'International cooperation through IAWN ensures global coverage',
                    ].map((item, idx) => (
                      <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">&#9632;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium mb-3">Remaining Gaps</h4>
                  <ul className="space-y-2">
                    {[
                      'Only ~43% of 140m+ NEOs found (Congress mandated 90% by George E. Brown Jr. Act)',
                      'Less than 3% of 40-140m "city killer" asteroids are cataloged',
                      'Sun-approaching objects (Atira class) are extremely difficult to detect from ground',
                      'No space-based dedicated NEO survey until NEO Surveyor launches (2028)',
                      'Southern hemisphere coverage historically weaker (improving with Rubin, ATLAS South)',
                    ].map((item, idx) => (
                      <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">&#9632;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="card p-5 border-dashed">
              <h3 className="text-lg font-semibold text-white mb-3">Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Discovery Data</h4>
                  <ul className="space-y-1">
                    <li>NASA/JPL Center for Near-Earth Object Studies (CNEOS)</li>
                    <li>Minor Planet Center (MPC) discovery statistics</li>
                    <li>ESA NEO Coordination Centre (NEOCC)</li>
                    <li>Individual survey program publications</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Characterization</h4>
                  <ul className="space-y-1">
                    <li>NEOWISE thermal model diameters and albedos</li>
                    <li>SMASS spectral classification survey</li>
                    <li>JPL Small-Body Database (SBDB)</li>
                    <li>Planetary Data System (PDS) mission data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Solar Exploration', description: 'Planetary science and mission data', href: '/solar-exploration', icon: '🪐' },
              { name: 'Space Environment', description: 'Space weather and debris tracking', href: '/space-environment', icon: '🌍' },
              { name: 'Cislunar Economy', description: 'Earth-Moon commerce and ISRU', href: '/cislunar', icon: '🌙' },
              { name: 'Mars Planner', description: 'Deep space mission planning', href: '/mars-planner', icon: '🔴' },
                ]}
              />
            </ScrollReveal>

    </div>
  );
}

// ────────────────────────────────────────
// Page Export (Suspense boundary)
// ────────────────────────────────────────

export default function AsteroidWatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <AsteroidWatchContent />
    </Suspense>
  );
}
