'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

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

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const CLOSE_APPROACHES: CloseApproach[] = [
  { id: 'ca-1', name: '2024 YR4', date: '2032-12-22', distanceLD: 0.8, distanceAU: 0.0021, diameterMin: 40, diameterMax: 90, velocity: 17.2, torino: 3, palermo: -1.2, isPHA: true, orbitClass: 'Apollo' },
  { id: 'ca-2', name: '99942 Apophis', date: '2029-04-13', distanceLD: 0.1, distanceAU: 0.00026, diameterMin: 340, diameterMax: 340, velocity: 7.4, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Aten' },
  { id: 'ca-3', name: '2025 BZ2', date: '2026-02-12', distanceLD: 3.2, distanceAU: 0.0082, diameterMin: 8, diameterMax: 18, velocity: 12.8, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-4', name: '2020 FE', date: '2026-02-15', distanceLD: 7.4, distanceAU: 0.019, diameterMin: 15, diameterMax: 34, velocity: 9.1, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-5', name: '2024 MK', date: '2026-02-18', distanceLD: 5.1, distanceAU: 0.013, diameterMin: 120, diameterMax: 260, velocity: 21.3, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Apollo' },
  { id: 'ca-6', name: '2021 QM1', date: '2026-02-21', distanceLD: 11.8, distanceAU: 0.030, diameterMin: 50, diameterMax: 110, velocity: 14.7, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Amor' },
  { id: 'ca-7', name: '2023 DW', date: '2026-02-24', distanceLD: 4.6, distanceAU: 0.012, diameterMin: 40, diameterMax: 90, velocity: 24.6, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-8', name: '2019 AQ3', date: '2026-02-27', distanceLD: 15.3, distanceAU: 0.039, diameterMin: 10, diameterMax: 23, velocity: 8.9, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Atira' },
  { id: 'ca-9', name: '2022 NX1', date: '2026-03-02', distanceLD: 2.1, distanceAU: 0.0054, diameterMin: 5, diameterMax: 12, velocity: 16.5, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-10', name: '2015 RN35', date: '2026-03-05', distanceLD: 8.7, distanceAU: 0.022, diameterMin: 25, diameterMax: 56, velocity: 11.2, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-11', name: '2024 JN16', date: '2026-03-08', distanceLD: 6.3, distanceAU: 0.016, diameterMin: 70, diameterMax: 160, velocity: 18.9, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Amor' },
  { id: 'ca-12', name: '2012 TC4', date: '2026-03-11', distanceLD: 1.7, distanceAU: 0.0044, diameterMin: 10, diameterMax: 23, velocity: 7.6, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-13', name: '2023 TL4', date: '2026-03-14', distanceLD: 9.4, distanceAU: 0.024, diameterMin: 30, diameterMax: 68, velocity: 13.4, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-14', name: '2025 AA', date: '2026-03-17', distanceLD: 12.6, distanceAU: 0.032, diameterMin: 200, diameterMax: 450, velocity: 25.1, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Apollo' },
  { id: 'ca-15', name: '2020 SW', date: '2026-03-20', distanceLD: 0.3, distanceAU: 0.00077, diameterMin: 5, diameterMax: 11, velocity: 7.7, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
  { id: 'ca-16', name: '2021 PDC', date: '2026-03-22', distanceLD: 4.9, distanceAU: 0.013, diameterMin: 35, diameterMax: 78, velocity: 15.8, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Amor' },
  { id: 'ca-17', name: '101955 Bennu', date: '2060-09-25', distanceLD: 1.9, distanceAU: 0.005, diameterMin: 490, diameterMax: 490, velocity: 6.2, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Apollo' },
  { id: 'ca-18', name: '2024 BX1', date: '2026-03-25', distanceLD: 18.2, distanceAU: 0.047, diameterMin: 90, diameterMax: 200, velocity: 19.6, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Apollo' },
];

const NEO_STATS = {
  totalNEOs: 35_472,
  totalPHAs: 2_397,
  totalNEAs: 35_110,
  totalNECs: 132,
  last30DaysDiscoveries: 148,
  lastYearDiscoveries: 3_128,
  largestNEA: { name: '1036 Ganymed', diameter: 41 },
  closestApproach2025: { name: '2024 YR4', distance: '0.002 AU' },
};

const SIZE_CATEGORIES: SizeCategory[] = [
  { label: '1 km+', range: '>1 km diameter', known: 856, estimated: 920, completeness: 93, color: 'from-red-500 to-red-400' },
  { label: '140 m - 1 km', range: '140m to 1km diameter', known: 10_832, estimated: 25_000, completeness: 43, color: 'from-orange-500 to-orange-400' },
  { label: '40 m - 140 m', range: '40m to 140m diameter', known: 14_200, estimated: 500_000, completeness: 2.8, color: 'from-yellow-500 to-yellow-400' },
  { label: '10 m - 40 m', range: '10m to 40m diameter', known: 6_800, estimated: 10_000_000, completeness: 0.07, color: 'from-green-500 to-green-400' },
  { label: '<10 m', range: 'Less than 10m', known: 2_784, estimated: 100_000_000, completeness: 0.003, color: 'from-blue-500 to-blue-400' },
];

const SPECTRAL_DISTRIBUTION = [
  { type: 'S-type (Silicaceous)', percentage: 35, count: 12_415, description: 'Stony composition, silicate minerals, moderate albedo', color: 'from-yellow-500 to-yellow-400' },
  { type: 'C-type (Carbonaceous)', percentage: 20, count: 7_094, description: 'Carbon-rich, dark surfaces, water and organics', color: 'from-blue-500 to-blue-400' },
  { type: 'X-type (Metallic/Other)', percentage: 10, count: 3_547, description: 'Iron-nickel metals, enstatite, high density', color: 'from-gray-400 to-gray-300' },
  { type: 'Q-type (Chondrite)', percentage: 8, count: 2_838, description: 'Ordinary chondrite, fresh surfaces', color: 'from-orange-500 to-orange-400' },
  { type: 'V-type (Vestoid)', percentage: 5, count: 1_774, description: 'Basaltic, related to 4 Vesta', color: 'from-purple-500 to-purple-400' },
  { type: 'Other/Unknown', percentage: 22, count: 7_804, description: 'D, P, B, E, A types and unclassified', color: 'from-slate-500 to-slate-400' },
];

const DEFENSE_PROGRAMS: DefenseProgram[] = [
  {
    id: 'dart',
    name: 'DART (Double Asteroid Redirection Test)',
    agency: 'NASA',
    status: 'Completed - Success',
    statusColor: 'text-green-400',
    description: 'First-ever planetary defense technology demonstration. DART successfully impacted Dimorphos on September 26, 2022, demonstrating kinetic impactor deflection.',
    keyResults: [
      'Reduced Dimorphos orbital period by 33 minutes (from 11 hours 55 min to 11 hours 22 min)',
      'Far exceeded minimum benchmark of 73 seconds change',
      'Ejected approximately 10,000 tonnes of debris, creating a 10,000 km tail',
      'Confirmed kinetic impactor is a viable deflection technique for small asteroids',
      'Impact velocity: 6.1 km/s; spacecraft mass: 570 kg',
      'Beta (momentum enhancement factor) estimated at 3.6, meaning ejecta contributed significantly',
    ],
    timeline: 'Launched Nov 2021, Impact Sep 26 2022',
  },
  {
    id: 'hera',
    name: 'Hera Mission',
    agency: 'ESA',
    status: 'En Route - Arriving 2026',
    statusColor: 'text-blue-400',
    description: 'ESA follow-up mission to the Didymos-Dimorphos system to conduct detailed post-impact survey. Launched October 7, 2024 aboard a SpaceX Falcon 9.',
    keyResults: [
      'Launched successfully on October 7, 2024',
      'Performed Mars gravity assist in March 2025',
      'Carrying two CubeSats: Milani (dust/mineralogy) and Juventas (internal structure radar)',
      'Will measure Dimorphos mass, crater size, and internal structure',
      'Expected arrival at Didymos system: late 2026',
      'Will provide precise measurement of DART momentum transfer efficiency',
    ],
    timeline: 'Launched Oct 2024, Mars flyby Mar 2025, Arrival late 2026',
  },
  {
    id: 'neo-surveyor',
    name: 'NEO Surveyor',
    agency: 'NASA/JPL',
    status: 'In Development',
    statusColor: 'text-yellow-400',
    description: 'Space-based infrared telescope designed to discover and characterize potentially hazardous NEOs. Will operate at the Sun-Earth L1 Lagrange point.',
    keyResults: [
      'Primary mission: find 90% of NEOs 140m+ within 10 years of operations',
      'Infrared observation enables detection of dark asteroids invisible to optical surveys',
      'Two infrared channels: 4-5.2 microns and 6-10 microns',
      'Expected to discover ~100,000 new NEOs during its baseline mission',
      'Currently in final design and fabrication phase (Phase C)',
      'Congress mandated goal: catalog 90% of 140m+ NEOs (George E. Brown Jr. Act)',
    ],
    timeline: 'Launch planned: June 2028, Operations: 5-year baseline + 7 yr extended',
  },
  {
    id: 'pdco',
    name: 'Planetary Defense Coordination Office (PDCO)',
    agency: 'NASA',
    status: 'Active',
    statusColor: 'text-green-400',
    description: 'NASA office responsible for finding, tracking, and characterizing potentially hazardous NEOs, issuing warnings, and coordinating U.S. government response planning.',
    keyResults: [
      'Coordinates all NASA-funded NEO detection surveys',
      'Issues impact warnings and notifications globally',
      'Manages planetary defense missions (DART, NEO Surveyor)',
      'Partners with FEMA for impact emergency response planning',
      'Annual budget approximately $200M for planetary defense activities',
      'Published National Near-Earth Object Preparedness Strategy and Action Plan',
    ],
    timeline: 'Established 2016, ongoing',
  },
  {
    id: 'iawn',
    name: 'International Asteroid Warning Network (IAWN)',
    agency: 'UN-endorsed / Multi-national',
    status: 'Active',
    statusColor: 'text-green-400',
    description: 'International group of organizations coordinated by the UN Committee on the Peaceful Uses of Outer Space to detect, track, and physically characterize NEOs.',
    keyResults: [
      'Established by UN General Assembly in 2013',
      '40+ member organizations from 20+ countries',
      'Coordinates NEO observation campaigns worldwide',
      'Issues international impact warning notifications',
      'Conducts annual planetary defense exercises with SMPAG',
      'Maintains global NEO observation network for rapid response',
    ],
    timeline: 'Established 2013, ongoing',
  },
  {
    id: 'smpag',
    name: 'Space Mission Planning Advisory Group (SMPAG)',
    agency: 'UN-endorsed / ESA-chaired',
    status: 'Active',
    statusColor: 'text-green-400',
    description: 'International forum for space agencies to plan coordinated response to a potential NEO impact threat, including deflection mission design.',
    keyResults: [
      'Chaired by ESA, 18 space agency members',
      'Develops framework for international deflection mission coordination',
      'Published reference deflection mission architectures',
      'Conducts regular NEO threat response exercises',
      'Evaluates technologies: kinetic impactor, gravity tractor, ion beam deflection',
      'Coordinates with IAWN for threat assessment and response planning',
    ],
    timeline: 'Established 2014, ongoing',
  },
  {
    id: 'osiris-apex',
    name: 'OSIRIS-APEX (formerly OSIRIS-REx extended)',
    agency: 'NASA',
    status: 'En Route to Apophis',
    statusColor: 'text-blue-400',
    description: 'Redirected OSIRIS-REx spacecraft now heading to asteroid Apophis. Will arrive shortly after Apophis\'s historic close approach to Earth on April 13, 2029.',
    keyResults: [
      'OSIRIS-REx returned 121.6 grams of Bennu samples on Sep 24, 2023',
      'Bennu samples contain water, carbon, and organic molecules',
      'Spacecraft renamed OSIRIS-APEX and redirected to Apophis',
      'Will study physical changes to Apophis caused by Earth tidal forces during 2029 flyby',
      'Arrival at Apophis: April 2029, entering orbit around the asteroid',
      'Will attempt to disturb surface material with thruster maneuver for subsurface study',
    ],
    timeline: 'Bennu sample return Sep 2023, Apophis rendezvous Apr 2029',
  },
];

const MINING_TARGETS: MiningTarget[] = [
  { id: 'mt-1', name: 'Ryugu', designation: '162173', spectralType: 'Cb', diameterKm: 0.9, deltaV: 4.66, estimatedValue: '$82.76 billion', resources: ['Water', 'Carbon', 'Organic compounds', 'Phosphorus'], accessibility: 'Accessible', accessColor: 'text-green-400', notes: 'Sample returned by Hayabusa2. Extremely carbon-rich.' },
  { id: 'mt-2', name: 'Bennu', designation: '101955', spectralType: 'B', diameterKm: 0.49, deltaV: 5.09, estimatedValue: '$669 million', resources: ['Water', 'Carbon', 'Organics', 'Magnetite'], accessibility: 'Accessible', accessColor: 'text-green-400', notes: 'OSIRIS-REx returned 121.6g sample. Highly porous rubble pile.' },
  { id: 'mt-3', name: 'Nereus', designation: '4660', spectralType: 'Xe', diameterKm: 0.33, deltaV: 4.97, estimatedValue: '$4.71 billion', resources: ['Iron', 'Nickel', 'Cobalt', 'Platinum-group metals'], accessibility: 'Accessible', accessColor: 'text-green-400', notes: 'Very low delta-v. Often cited as prime mining candidate.' },
  { id: 'mt-4', name: '1989 ML', designation: '1989 ML', spectralType: 'X', diameterKm: 0.6, deltaV: 4.87, estimatedValue: '$13.9 billion', resources: ['Iron', 'Nickel', 'Platinum', 'Gold'], accessibility: 'Accessible', accessColor: 'text-green-400', notes: 'One of the most accessible large metallic asteroids.' },
  { id: 'mt-5', name: 'Anteros', designation: '1943', spectralType: 'S', diameterKm: 2.3, deltaV: 5.44, estimatedValue: '$5.57 trillion', resources: ['Iron', 'Magnesium silicates', 'Nickel', 'Cobalt'], accessibility: 'Challenging', accessColor: 'text-yellow-400', notes: 'Large Amor-class. Higher delta-v but enormous resource content.' },
  { id: 'mt-6', name: 'Itokawa', designation: '25143', spectralType: 'S', diameterKm: 0.35, deltaV: 5.53, estimatedValue: '$2.1 billion', resources: ['Iron', 'Magnesium', 'Silicon', 'Olivine'], accessibility: 'Challenging', accessColor: 'text-yellow-400', notes: 'Hayabusa sample return confirmed S-type composition.' },
  { id: 'mt-7', name: 'Didymos', designation: '65803', spectralType: 'S', diameterKm: 0.78, deltaV: 5.14, estimatedValue: '$3.4 billion', resources: ['Silicates', 'Iron', 'Nickel', 'Pyroxene'], accessibility: 'Accessible', accessColor: 'text-green-400', notes: 'DART target. Binary system with moon Dimorphos.' },
  { id: 'mt-8', name: '16 Psyche', designation: '16', spectralType: 'M', diameterKm: 226, deltaV: 9.4, estimatedValue: '$10 quintillion (theoretical)', resources: ['Iron', 'Nickel', 'Gold', 'Platinum', 'Copper'], accessibility: 'Difficult', accessColor: 'text-orange-400', notes: 'NASA Psyche mission en route. Potentially a stripped planetary core.' },
  { id: 'mt-9', name: 'Apophis', designation: '99942', spectralType: 'Sq', diameterKm: 0.37, deltaV: 5.47, estimatedValue: '$2.6 billion', resources: ['Silicates', 'Iron', 'Nickel', 'Olivine'], accessibility: 'Accessible', accessColor: 'text-green-400', notes: '2029 close approach within 31,600 km. OSIRIS-APEX will study it.' },
  { id: 'mt-10', name: 'Ceres', designation: '1', spectralType: 'C', diameterKm: 940, deltaV: 10.1, estimatedValue: '$100+ trillion (water/minerals)', resources: ['Water ice', 'Ammoniated clays', 'Carbonates', 'Salts'], accessibility: 'Difficult', accessColor: 'text-orange-400', notes: 'Dwarf planet. Dawn mission revealed subsurface ocean and organics.' },
];

const MINING_COMPANIES: MiningCompany[] = [
  { name: 'AstroForge', status: 'Active', statusColor: 'text-green-400', focus: 'Platinum-group metal extraction from asteroids', funding: '$13M+ (Series A)', description: 'Developing refinery technology for in-space platinum extraction. Launched Odin test mission on SpaceX rideshare in 2023. Planning Vestri prospecting mission to target asteroid.' },
  { name: 'TransAstra', status: 'Active', statusColor: 'text-green-400', focus: 'Optical mining using concentrated sunlight', funding: '$18M+ (NASA contracts + private)', description: 'Patented "optical mining" technology that uses concentrated solar energy to extract volatiles from asteroids. Also developing space tugs and debris capture systems.' },
  { name: 'Karman+', status: 'Active', statusColor: 'text-green-400', focus: 'In-space resource utilization infrastructure', funding: '$4.7M (Seed)', description: 'Building orbital infrastructure for processing asteroid materials. Focus on creating a supply chain for space-based manufacturing.' },
  { name: 'Origin Space', status: 'Active', statusColor: 'text-green-400', focus: 'NEO mining and space resources', funding: 'Undisclosed (Chinese venture)', description: 'Chinese company that launched NEO-1 test spacecraft in 2021 and Yuanwang-1 space telescope for asteroid observation. Planning robotic mining missions.' },
  { name: 'Planetary Resources', status: 'Defunct (2018)', statusColor: 'text-red-400', focus: 'Asteroid prospecting and water mining', funding: '$50M+ before closure', description: 'Pioneer asteroid mining company. Assets acquired by ConsenSys in 2018. Developed Arkyd satellite series for asteroid prospecting before running out of funding.' },
  { name: 'Deep Space Industries', status: 'Acquired (2019)', statusColor: 'text-yellow-400', focus: 'Asteroid mining and spacecraft propulsion', funding: 'Acquired by Bradford Space', description: 'Developed Comet water-based thruster technology. Acquired by Bradford Space in 2019. Technology lives on in Bradford\'s spacecraft propulsion products.' },
];

const SURVEY_TELESCOPES: SurveyTelescope[] = [
  { name: 'Catalina Sky Survey (CSS)', operator: 'University of Arizona / NASA', location: 'Mt. Lemmon & Mt. Bigelow, Arizona', neoDiscoveries: 14_250, percentContribution: 47.2, status: 'Active', statusColor: 'text-green-400', description: 'Leading NEO discovery survey since 2004. Operates three telescopes including a 1.5m on Mt. Lemmon. Has been the top NEO discoverer for over a decade.' },
  { name: 'Pan-STARRS (PS1 & PS2)', operator: 'University of Hawaii / NASA', location: 'Haleakala, Maui, Hawaii', neoDiscoveries: 8_930, percentContribution: 29.6, status: 'Active', statusColor: 'text-green-400', description: 'Panoramic Survey Telescope & Rapid Response System. Two 1.8m telescopes surveying the sky. Discovered first known interstellar object Oumuamua in 2017.' },
  { name: 'ATLAS (Asteroid Terrestrial-impact Last Alert System)', operator: 'University of Hawaii / NASA', location: 'Hawaii, Chile, South Africa, Canary Islands', neoDiscoveries: 3_840, percentContribution: 12.7, status: 'Active', statusColor: 'text-green-400', description: 'Four-telescope network providing whole-sky coverage every 24 hours. Optimized for finding imminent impactors. Detected 2024 BX1 before atmospheric entry.' },
  { name: 'NEOWISE (Wide-field Infrared Survey Explorer)', operator: 'NASA/JPL', location: 'Low-Earth Orbit', neoDiscoveries: 528, percentContribution: 1.8, status: 'Decommissioned (2024)', statusColor: 'text-red-400', description: 'Space-based infrared survey. Characterized 1,850+ NEOs including sizes and albedos. Deorbited and reentered atmosphere in 2024 after 14 years of service.' },
  { name: 'Vera C. Rubin Observatory (LSST)', operator: 'NSF / DOE', location: 'Cerro Pachon, Chile', neoDiscoveries: 0, percentContribution: 0, status: 'Commissioning - First Light 2025', statusColor: 'text-blue-400', description: 'Revolutionary 8.4m telescope with 3.2-gigapixel camera. Expected to discover 60-70% of remaining 140m+ NEOs in its first 10 years. Will catalog ~5 million NEOs total over its survey lifetime.' },
  { name: 'Spacewatch', operator: 'University of Arizona', location: 'Kitt Peak, Arizona', neoDiscoveries: 1_360, percentContribution: 4.5, status: 'Active', statusColor: 'text-green-400', description: 'Pioneer NEO survey operating since 1980. Uses 0.9m and 1.8m telescopes. Discovered many of the first PHAs and helped establish modern survey techniques.' },
  { name: 'LINEAR (Lincoln Near-Earth Asteroid Research)', operator: 'MIT Lincoln Laboratory / USAF', location: 'White Sands, New Mexico', neoDiscoveries: 2_850, percentContribution: 9.4, status: 'Reduced Operations', statusColor: 'text-yellow-400', description: 'Formerly the top NEO discoverer (1998-2005). Used two 1m telescopes with GEODSS technology. Surpassed by Catalina and Pan-STARRS in discovery rate.' },
];

const DISCOVERY_MILESTONES: DiscoveryMilestone[] = [
  { year: 1990, cumulativeNEOs: 134, cumulativePHAs: 20, notable: 'Spaceguard Survey proposed' },
  { year: 1995, cumulativeNEOs: 380, cumulativePHAs: 65, notable: 'LINEAR begins operations' },
  { year: 2000, cumulativeNEOs: 1_222, cumulativePHAs: 277, notable: 'LINEAR dominates discovery' },
  { year: 2005, cumulativeNEOs: 3_742, cumulativePHAs: 784, notable: 'Catalina Sky Survey ramps up' },
  { year: 2010, cumulativeNEOs: 7_075, cumulativePHAs: 1_190, notable: 'WISE/NEOWISE launches' },
  { year: 2012, cumulativeNEOs: 9_147, cumulativePHAs: 1_369, notable: 'Pan-STARRS begins NEO surveys' },
  { year: 2015, cumulativeNEOs: 13_251, cumulativePHAs: 1_644, notable: 'PDCO established at NASA' },
  { year: 2017, cumulativeNEOs: 17_030, cumulativePHAs: 1_857, notable: 'Oumuamua discovered by Pan-STARRS' },
  { year: 2018, cumulativeNEOs: 19_470, cumulativePHAs: 1_963, notable: 'ATLAS network expanding' },
  { year: 2020, cumulativeNEOs: 24_126, cumulativePHAs: 2_110, notable: '2020 CD3 - second known mini-moon' },
  { year: 2022, cumulativeNEOs: 29_723, cumulativePHAs: 2_268, notable: 'DART impacts Dimorphos' },
  { year: 2023, cumulativeNEOs: 32_417, cumulativePHAs: 2_325, notable: 'OSIRIS-REx returns Bennu sample' },
  { year: 2024, cumulativeNEOs: 33_950, cumulativePHAs: 2_365, notable: 'Hera mission launches; NEOWISE decommissioned' },
  { year: 2025, cumulativeNEOs: 35_100, cumulativePHAs: 2_390, notable: 'Vera Rubin first light; CSS crosses 14,000 discoveries' },
  { year: 2026, cumulativeNEOs: 35_472, cumulativePHAs: 2_397, notable: 'Rubin Observatory survey operations begin' },
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
    <div className={`card p-5 border ${approach.torino >= 2 ? torino.border : 'border-slate-700/50'} ${approach.torino >= 2 ? torino.bg : ''}`}>
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
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
              {approach.orbitClass}
            </span>
            {isPast && (
              <span className="text-xs bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded">Past</span>
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

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-700/50 text-xs">
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
        <div className="text-slate-500 text-[10px] mt-0.5">{subValue}</div>
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
        <PageHeader
          title="Asteroid Watch"
          subtitle="Near-Earth object tracking, planetary defense intelligence, and asteroid mining prospects"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Asteroid Watch' }]}
        />

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard value={NEO_STATS.totalNEOs.toLocaleString()} label="Known NEOs" subValue={`+${NEO_STATS.last30DaysDiscoveries} last 30d`} />
          <StatCard value={NEO_STATS.totalPHAs.toLocaleString()} label="Known PHAs" valueColor="text-orange-400" />
          <StatCard value={`${CLOSE_APPROACHES.length}`} label="Tracked Approaches" />
          <StatCard value={`${phaCount}`} label="PHAs in List" valueColor={phaCount > 0 ? 'text-red-400' : 'text-green-400'} />
          <StatCard value={`${closestApproach?.distanceLD.toFixed(1)} LD`} label="Closest Pass" valueColor={getDistanceColor(closestApproach?.distanceLD || 99)} />
          <StatCard
            value={`${highestTorino?.torino || 0}`}
            label="Highest Torino"
            valueColor={highestTorino?.torino >= 2 ? 'text-yellow-400' : 'text-green-400'}
            subValue={highestTorino?.name}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
            <div className="card p-6 border border-nebula-500/30 bg-nebula-500/5 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Key Upcoming Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-nebula-300 font-semibold mb-1">Apophis Close Approach</div>
                  <div className="text-slate-400 text-sm">April 13, 2029</div>
                  <p className="text-slate-400 text-sm mt-2">
                    99942 Apophis will pass within 31,600 km of Earth -- closer than geostationary satellites.
                    Visible to the naked eye from parts of the Eastern Hemisphere. No impact risk (Torino 0),
                    but the closest approach of an asteroid this large in recorded history.
                  </p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-nebula-300 font-semibold mb-1">Bennu Close Approach</div>
                  <div className="text-slate-400 text-sm">September 25, 2060</div>
                  <p className="text-slate-400 text-sm mt-2">
                    101955 Bennu will make a very close approach to Earth. While cumulative impact
                    probability through 2300 is ~1/2,700, the OSIRIS-REx mission refined its orbit
                    to high precision. Bennu remains the best-characterized PHA.
                  </p>
                </div>
              </div>
            </div>

            {/* Data source note */}
            <div className="card p-4 border-dashed text-sm text-slate-500">
              Close approach data sourced from NASA Center for Near-Earth Object Studies (CNEOS) and
              JPL Small-Body Database. Distances in LD (Lunar Distances, 1 LD = 384,400 km) and AU
              (Astronomical Units, 1 AU = 149,597,871 km). Torino Scale ratings reflect current
              impact probability assessments.
            </div>
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
                <div className="text-3xl font-bold font-display text-nebula-300">{NEO_STATS.lastYearDiscoveries.toLocaleString()}</div>
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
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
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
                  <div key={spec.type} className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{spec.type}</span>
                      <span className="text-slate-300 font-bold">{spec.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
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
                  { name: 'Atira', count: 412, description: 'Orbit entirely interior to Earth orbit. Hardest to detect from ground.', color: 'text-cyan-400', percentage: 1 },
                ].map((cls) => (
                  <div key={cls.name} className="card p-4 bg-slate-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold ${cls.color}`}>{cls.name}</span>
                      <span className="text-white font-display text-lg">{cls.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full" style={{ width: `${cls.percentage}%` }} />
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
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="pb-3 pr-4">Year</th>
                      <th className="pb-3 pr-4 text-right">Total NEOs</th>
                      <th className="pb-3 pr-4 text-right">Total PHAs</th>
                      <th className="pb-3">Notable Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISCOVERY_MILESTONES.map((milestone) => (
                      <tr key={milestone.year} className="border-b border-slate-800">
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
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Discovery Growth</h4>
                <div className="flex items-end gap-1 h-32">
                  {DISCOVERY_MILESTONES.map((m) => {
                    const maxNEO = DISCOVERY_MILESTONES[DISCOVERY_MILESTONES.length - 1].cumulativeNEOs;
                    const heightPct = (m.cumulativeNEOs / maxNEO) * 100;
                    return (
                      <div key={m.year} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-gradient-to-t from-nebula-500 to-plasma-400 rounded-t transition-all group-hover:opacity-80"
                          style={{ height: `${heightPct}%`, minHeight: '2px' }}
                        />
                        <span className="text-[9px] text-slate-500 rotate-[-45deg] origin-center whitespace-nowrap">{m.year}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
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
                        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-slate-800 ${program.statusColor}`}>
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
                          <span className="text-nebula-400 mt-1 flex-shrink-0">&#9656;</span>
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
                  <div key={method.name} className="p-4 bg-slate-800/30 rounded-lg">
                    <h4 className="text-white font-medium mb-1">{method.name}</h4>
                    <span className={`text-xs ${method.readinessColor}`}>{method.readiness}</span>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">{method.description}</p>
                    <p className="text-slate-500 text-xs mt-2 italic">{method.effectiveness}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related modules */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Related Modules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/debris-monitor" className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-nebula-300">Debris Monitor</div>
                  <p className="text-xs text-slate-400 mt-1">Impact debris and conjunction tracking</p>
                </Link>
                <Link href="/solar-exploration" className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-nebula-300">Solar Exploration</div>
                  <p className="text-xs text-slate-400 mt-1">Planetary missions and surface landers</p>
                </Link>
                <Link href="/space-mining" className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-nebula-300">Space Mining</div>
                  <p className="text-xs text-slate-400 mt-1">Asteroid mining intelligence</p>
                </Link>
              </div>
            </div>
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
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {target.spectralType}
                          </span>
                          <span className={`text-xs font-medium ${target.accessColor}`}>
                            {target.accessibility}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-nebula-300 font-bold text-sm">{target.estimatedValue}</div>
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
                          <span key={resource} className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
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
                  <div key={company.name} className="p-4 bg-slate-800/30 rounded-lg">
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
            <div className="card p-6 border border-slate-700">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30 whitespace-nowrap"
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
                      <div key={telescope.name} className="p-4 bg-slate-800/30 rounded-lg">
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
                          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full"
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
                    <div className="p-3 bg-slate-800/40 rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">~5M</div>
                      <div className="text-slate-400 text-xs">Predicted NEO detections over survey lifetime</div>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">60-70%</div>
                      <div className="text-slate-400 text-xs">Expected to find this share of remaining 140m+ NEOs</div>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-lg">
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
                <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">~260</div>
                  <div className="text-slate-400 text-sm">NEOs per month (2025)</div>
                  <div className="text-slate-500 text-xs mt-1">Up from ~150/month in 2020</div>
                </div>
                <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">~10</div>
                  <div className="text-slate-400 text-sm">PHAs per month (average)</div>
                  <div className="text-slate-500 text-xs mt-1">Rate increasing with survey capability</div>
                </div>
                <div className="p-4 bg-slate-800/30 rounded-lg text-center">
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
                  <div key={idx} className="p-3 bg-slate-800/20 rounded-lg flex items-start gap-3">
                    <span className="text-nebula-400 text-xs font-mono font-medium mt-0.5 flex-shrink-0 w-10">{discovery.date}</span>
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
          <div
            className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      }
    >
      <AsteroidWatchContent />
    </Suspense>
  );
}
