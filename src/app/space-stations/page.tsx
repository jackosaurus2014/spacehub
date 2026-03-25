'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';
import { clientLogger } from '@/lib/client-logger';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type StationStatus = 'operational' | 'assembly' | 'development' | 'concept' | 'planned';

interface StationModule {
  name: string;
  type: string;
  launchDate: string;
  mass?: string;
  builder?: string;
}

interface VisitingVehicle {
  name: string;
  type: 'crew' | 'cargo' | 'crew+cargo';
  operator: string;
  status: 'active' | 'retired' | 'development';
}

interface SpaceStation {
  id: string;
  name: string;
  operator: string;
  country: string;
  status: StationStatus;
  orbit: string;
  altitude: string;
  inclination: string;
  crewCapacity: number;
  currentCrew?: number;
  mass: string;
  pressurizedVolume: string;
  power: string;
  dockingPorts: number;
  modules: StationModule[];
  visitingVehicles: VisitingVehicle[];
  launchDate: string;
  continuousOccupation?: string;
  plannedRetirement?: string;
  researchFacilities: string[];
  description: string;
}

interface CommercialStation {
  id: string;
  name: string;
  developer: string;
  partners: string[];
  status: StationStatus;
  fundingSource: string;
  estimatedCost?: string;
  targetLaunch: string;
  crewCapacity: number;
  pressurizedVolume?: string;
  orbit?: string;
  launchVehicle?: string;
  capabilities: string[];
  nasaCLD: boolean;
  description: string;
}

interface CrewMember {
  name: string;
  nationality: string;
  agency: string;
  role: string;
  station: string;
  mission: string;
  launchDate: string;
  expectedReturn: string;
}

interface CrewRotation {
  mission: string;
  station: string;
  vehicle: string;
  launchDate: string;
  status: 'completed' | 'current' | 'upcoming' | 'planned';
  crew: string[];
}

interface CLDMilestone {
  date: string;
  event: string;
  details: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'planned';
}

interface TransitionRisk {
  category: string;
  risk: string;
  mitigation: string;
  severity: 'high' | 'medium' | 'low';
}

interface ISSPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  timestamp: number;
  footprint: number;
}

// ────────────────────────────────────────
// Fallback Data
// ────────────────────────────────────────

const FALLBACK_ACTIVE_STATIONS: SpaceStation[] = [
  {
    id: 'iss',
    name: 'International Space Station (ISS)',
    operator: 'NASA / Roscosmos / ESA / JAXA / CSA',
    country: 'International',
    status: 'operational',
    orbit: 'LEO',
    altitude: '~408 km',
    inclination: '51.6°',
    crewCapacity: 6,
    currentCrew: 7,
    mass: '~420,000 kg',
    pressurizedVolume: '916 m³',
    power: '215 kW (solar arrays)',
    dockingPorts: 8,
    modules: [
      { name: 'Zarya (FGB)', type: 'Functional Cargo Block', launchDate: 'Nov 1998', mass: '19,323 kg', builder: 'Khrunichev' },
      { name: 'Unity (Node 1)', type: 'Connecting Node', launchDate: 'Dec 1998', mass: '11,612 kg', builder: 'Boeing' },
      { name: 'Zvezda (SM)', type: 'Service Module', launchDate: 'Jul 2000', mass: '19,051 kg', builder: 'RSC Energia' },
      { name: 'Destiny (US Lab)', type: 'Laboratory', launchDate: 'Feb 2001', mass: '14,515 kg', builder: 'Boeing' },
      { name: 'Quest', type: 'Joint Airlock', launchDate: 'Jul 2001', mass: '6,064 kg', builder: 'Boeing' },
      { name: 'Harmony (Node 2)', type: 'Connecting Node', launchDate: 'Oct 2007', mass: '14,288 kg', builder: 'Thales Alenia' },
      { name: 'Columbus', type: 'Laboratory', launchDate: 'Feb 2008', mass: '10,300 kg', builder: 'Thales Alenia / ESA' },
      { name: 'Kibo (JEM)', type: 'Laboratory', launchDate: 'Jun 2008', mass: '15,900 kg', builder: 'JAXA / Mitsubishi' },
      { name: 'Tranquility (Node 3)', type: 'Connecting Node', launchDate: 'Feb 2010', mass: '15,500 kg', builder: 'Thales Alenia' },
      { name: 'Cupola', type: 'Observation Module', launchDate: 'Feb 2010', mass: '1,880 kg', builder: 'Thales Alenia / ESA' },
      { name: 'Rassvet (MRM-1)', type: 'Mini Research Module', launchDate: 'May 2010', mass: '5,075 kg', builder: 'RSC Energia' },
      { name: 'Leonardo (PMM)', type: 'Permanent Multipurpose Module', launchDate: 'Mar 2011', mass: '4,082 kg', builder: 'Thales Alenia / ASI' },
      { name: 'BEAM', type: 'Expandable Module', launchDate: 'Apr 2016', mass: '1,413 kg', builder: 'Bigelow Aerospace' },
      { name: 'IDA-2', type: 'Docking Adapter', launchDate: 'Jul 2016', mass: '526 kg', builder: 'Boeing' },
      { name: 'IDA-3', type: 'Docking Adapter', launchDate: 'Jul 2019', mass: '526 kg', builder: 'Boeing' },
      { name: 'Nauka (MLM)', type: 'Multipurpose Laboratory', launchDate: 'Jul 2021', mass: '20,350 kg', builder: 'Khrunichev' },
      { name: 'Prichal (UM)', type: 'Node Module', launchDate: 'Nov 2021', mass: '4,070 kg', builder: 'RSC Energia' },
    ],
    visitingVehicles: [
      { name: 'Crew Dragon', type: 'crew', operator: 'SpaceX', status: 'active' },
      { name: 'Cargo Dragon', type: 'cargo', operator: 'SpaceX', status: 'active' },
      { name: 'Cygnus', type: 'cargo', operator: 'Northrop Grumman', status: 'active' },
      { name: 'Soyuz MS', type: 'crew', operator: 'Roscosmos', status: 'active' },
      { name: 'Progress MS', type: 'cargo', operator: 'Roscosmos', status: 'active' },
      { name: 'Starliner', type: 'crew', operator: 'Boeing', status: 'development' },
      { name: 'Dream Chaser', type: 'cargo', operator: 'Sierra Space', status: 'development' },
    ],
    launchDate: 'November 20, 1998',
    continuousOccupation: 'Since November 2, 2000 — over 25 years of continuous human presence',
    plannedRetirement: '~2030 — Controlled deorbit via SpaceX deorbit vehicle into South Pacific Ocean (Point Nemo)',
    researchFacilities: [
      'Destiny Laboratory (US)',
      'Columbus Laboratory (ESA)',
      'Kibo Laboratory (JAXA)',
      'Nauka Laboratory (Russia)',
      'Cold Atom Laboratory',
      'Alpha Magnetic Spectrometer (AMS-02)',
      'Materials Science Lab',
      'Microgravity Science Glovebox',
      'Combustion Integrated Rack',
      'Fluids Integrated Rack',
      'Electrostatic Levitation Furnace',
      'CREAM Cosmic Ray Detector',
    ],
    description: 'The International Space Station is a multinational collaborative project involving five space agencies: NASA (United States), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada). It is the largest modular space station in low Earth orbit and serves as a microgravity and space environment research laboratory. The ISS has hosted over 270 visitors from 21 countries and has supported thousands of scientific experiments across biology, physics, astronomy, and materials science.',
  },
  {
    id: 'tiangong',
    name: 'Tiangong Space Station',
    operator: 'China Manned Space Agency (CMSA)',
    country: 'China',
    status: 'operational',
    orbit: 'LEO',
    altitude: '~390 km',
    inclination: '41.5°',
    crewCapacity: 3,
    currentCrew: 3,
    mass: '~68,600 kg',
    pressurizedVolume: '~110 m³',
    power: '~100 kW (solar arrays)',
    dockingPorts: 5,
    modules: [
      { name: 'Tianhe (Core Module)', type: 'Core Module', launchDate: 'Apr 2021', mass: '22,600 kg', builder: 'CAST / CASC' },
      { name: 'Wentian', type: 'Laboratory Module', launchDate: 'Jul 2022', mass: '23,000 kg', builder: 'CAST / CASC' },
      { name: 'Mengtian', type: 'Laboratory Module', launchDate: 'Oct 2022', mass: '23,000 kg', builder: 'CAST / CASC' },
    ],
    visitingVehicles: [
      { name: 'Shenzhou', type: 'crew', operator: 'CMSA', status: 'active' },
      { name: 'Tianzhou', type: 'cargo', operator: 'CMSA', status: 'active' },
    ],
    launchDate: 'April 29, 2021',
    continuousOccupation: 'Since June 2022 — continuous crew presence maintained through Shenzhou rotation missions',
    plannedRetirement: '2035+ — Station designed for at least 15 years of operation with expansion potential',
    researchFacilities: [
      'Wentian Laboratory',
      'Mengtian Laboratory',
      'Microgravity Fluid Physics Facility',
      'Combustion Science Experiment Rack',
      'Containerless Materials Processing',
      'High-Precision Cold Atomic Clock',
      'Xuntian Space Telescope (co-orbital, planned)',
    ],
    description: 'Tiangong (meaning "Heavenly Palace") is China\'s permanently crewed modular space station in low Earth orbit. It is China\'s first long-term space station and the second fully operational space station after the ISS. The T-shaped station consists of the Tianhe core module and two laboratory modules (Wentian and Mengtian). China plans to expand Tiangong to six modules and increase crew capacity to six. The station supports research in microgravity science, space medicine, astronomy, and Earth observation.',
  },
];

const FALLBACK_COMMERCIAL_STATIONS: CommercialStation[] = [
  {
    id: 'axiom',
    name: 'Axiom Station',
    developer: 'Axiom Space',
    partners: ['NASA', 'Thales Alenia Space', 'Collins Aerospace'],
    status: 'development',
    fundingSource: 'NASA CLD ($228M) + Private',
    estimatedCost: '$2B+',
    targetLaunch: '2026 (AxH1 module to ISS)',
    crewCapacity: 8,
    pressurizedVolume: 'Multi-module expandable',
    orbit: 'LEO (~400 km)',
    launchVehicle: 'SpaceX Falcon Heavy',
    capabilities: [
      'Modules initially attach to ISS forward port, then detach as free-flying station',
      'Axiom Hub 1 (AxH1) first module planned for 2026',
      'Research and manufacturing in microgravity',
      'Space tourism and private astronaut missions',
      'Earth observation payload hosting',
      'In-space manufacturing for semiconductors and fiber optics',
      'Has flown 3 private astronaut missions (Ax-1, Ax-2, Ax-3) to ISS',
      'Developing next-gen EVA spacesuit (AxEMU) for NASA Artemis',
    ],
    nasaCLD: true,
    description: 'Axiom Space is developing the world\'s first commercial space station, beginning with modules that will initially attach to the ISS before separating into a free-flying station. Axiom has already conducted three successful private astronaut missions to the ISS (Ax-1, Ax-2, Ax-3), demonstrating operational capability. The station will serve as a research laboratory, manufacturing facility, and destination for government and commercial astronauts.',
  },
  {
    id: 'orbital-reef',
    name: 'Orbital Reef',
    developer: 'Blue Origin & Sierra Space',
    partners: ['Blue Origin', 'Sierra Space', 'Boeing', 'Redwire Space', 'Genesis Engineering', 'Arizona State University'],
    status: 'development',
    fundingSource: 'NASA CLD ($130M) + Private',
    estimatedCost: 'Multi-billion',
    targetLaunch: '2027-2028',
    crewCapacity: 10,
    pressurizedVolume: '~830 m³ (LIFE module)',
    orbit: 'LEO (~500 km)',
    launchVehicle: 'Blue Origin New Glenn / ULA Vulcan',
    capabilities: [
      'Mixed-use "business park" concept in space',
      'Sierra Space LIFE inflatable habitat (3x volume of ISS module)',
      'Blue Origin orbital core module with crew and utility systems',
      'Redwire microgravity research and manufacturing payload',
      'Boeing Starliner crew transport and ISS heritage systems',
      'Dedicated science and manufacturing modules',
      'Hosting for government, commercial, and international customers',
      'Single-person spacecraft for external operations',
    ],
    nasaCLD: true,
    description: 'Orbital Reef is envisioned as a commercially operated, privately funded space station and mixed-use business park in low Earth orbit. The partnership brings together Blue Origin\'s orbital systems, Sierra Space\'s LIFE expandable habitat (tested to 150% of design pressure), Boeing\'s Starliner crew vehicle, and Redwire\'s microgravity manufacturing expertise. The station will support research, industrial processing, tourism, and media production.',
  },
  {
    id: 'starlab',
    name: 'Starlab',
    developer: 'Voyager Space & Airbus Defence and Space',
    partners: ['Voyager Space', 'Airbus', 'MDA', 'Mitsubishi Electric', 'Northrop Grumman'],
    status: 'development',
    fundingSource: 'NASA CLD ($217.5M) + Private',
    estimatedCost: '$3B+',
    targetLaunch: '2028',
    crewCapacity: 4,
    pressurizedVolume: '~340 m³',
    orbit: 'LEO (~400 km)',
    launchVehicle: 'SpaceX Starship',
    capabilities: [
      'Single-launch deployment on SpaceX Starship — no on-orbit assembly required',
      'George Washington Carver Science Park for research',
      'MDA-built Canadarm-style robotic arm (Skymaker)',
      'Airbus-designed habitat and life support systems',
      'Multiple docking ports for crew and cargo vehicles',
      'Open architecture for international partners',
      'In-space manufacturing and materials research',
      'Mitsubishi Electric power systems heritage',
    ],
    nasaCLD: true,
    description: 'Starlab is a commercial space station designed for single-launch deployment aboard SpaceX Starship, eliminating the need for complex on-orbit assembly. The station features the George Washington Carver Science Park research facility and an MDA-built robotic arm. Voyager Space and Airbus bring complementary expertise in commercial space operations and spacecraft systems. Starlab is designed to serve as a permanent commercial platform for research, manufacturing, and crew operations.',
  },
  {
    id: 'haven-1',
    name: 'Haven-1',
    developer: 'Vast',
    partners: ['SpaceX', 'Launcher (acquired)'],
    status: 'development',
    fundingSource: 'Private (Vast)',
    estimatedCost: 'Undisclosed',
    targetLaunch: '2025-2026',
    crewCapacity: 4,
    pressurizedVolume: '~100 m³',
    orbit: 'LEO (~400 km)',
    launchVehicle: 'SpaceX Falcon 9',
    capabilities: [
      'Single-module pathfinder station',
      'Crew transported via SpaceX Dragon',
      'Artificial gravity research platform (spin gravity studies)',
      'Microgravity research and experimentation',
      'In-orbit demonstration and validation missions',
      'Precursor to larger Vast stations with artificial gravity',
      'Compact and rapidly deployable design',
      'Private astronaut mission hosting',
    ],
    nasaCLD: false,
    description: 'Haven-1 is a privately funded single-module space station being developed by Vast as a pathfinder for the company\'s long-term vision of large rotating stations with artificial gravity. It will be the first commercial single-module station and is designed to support crews of up to four people for missions of up to 30 days. Haven-1 serves as a proof of concept before Vast moves to larger multi-module stations. Crew will travel aboard SpaceX Crew Dragon capsules.',
  },
];

const FALLBACK_CURRENT_CREW: CrewMember[] = [
  // ISS Expedition 72 crew
  {
    name: 'Sunita Williams',
    nationality: 'American',
    agency: 'NASA',
    role: 'Station Commander',
    station: 'ISS',
    mission: 'Expedition 72',
    launchDate: 'Jun 2024',
    expectedReturn: 'Mar 2025',
  },
  {
    name: 'Butch Wilmore',
    nationality: 'American',
    agency: 'NASA',
    role: 'Flight Engineer',
    station: 'ISS',
    mission: 'Expedition 72',
    launchDate: 'Jun 2024',
    expectedReturn: 'Mar 2025',
  },
  {
    name: 'Don Pettit',
    nationality: 'American',
    agency: 'NASA',
    role: 'Flight Engineer',
    station: 'ISS',
    mission: 'Expedition 72 (Soyuz MS-26)',
    launchDate: 'Sep 2024',
    expectedReturn: 'Mar 2025',
  },
  {
    name: 'Aleksey Ovchinin',
    nationality: 'Russian',
    agency: 'Roscosmos',
    role: 'Flight Engineer',
    station: 'ISS',
    mission: 'Expedition 72 (Soyuz MS-26)',
    launchDate: 'Sep 2024',
    expectedReturn: 'Mar 2025',
  },
  {
    name: 'Ivan Vagner',
    nationality: 'Russian',
    agency: 'Roscosmos',
    role: 'Flight Engineer',
    station: 'ISS',
    mission: 'Expedition 72 (Soyuz MS-26)',
    launchDate: 'Sep 2024',
    expectedReturn: 'Mar 2025',
  },
  {
    name: 'Nick Hague',
    nationality: 'American',
    agency: 'NASA',
    role: 'Flight Engineer',
    station: 'ISS',
    mission: 'SpaceX Crew-9',
    launchDate: 'Sep 2024',
    expectedReturn: 'Feb 2025',
  },
  {
    name: 'Aleksandr Gorbunov',
    nationality: 'Russian',
    agency: 'Roscosmos',
    role: 'Flight Engineer',
    station: 'ISS',
    mission: 'SpaceX Crew-9',
    launchDate: 'Sep 2024',
    expectedReturn: 'Feb 2025',
  },
  // Tiangong Shenzhou-19 crew
  {
    name: 'Cai Xuzhe',
    nationality: 'Chinese',
    agency: 'CMSA',
    role: 'Commander',
    station: 'Tiangong',
    mission: 'Shenzhou-19',
    launchDate: 'Oct 2024',
    expectedReturn: 'Apr 2025',
  },
  {
    name: 'Song Lingdong',
    nationality: 'Chinese',
    agency: 'CMSA',
    role: 'Flight Engineer',
    station: 'Tiangong',
    mission: 'Shenzhou-19',
    launchDate: 'Oct 2024',
    expectedReturn: 'Apr 2025',
  },
  {
    name: 'Wang Haoze',
    nationality: 'Chinese',
    agency: 'CMSA',
    role: 'Payload Specialist',
    station: 'Tiangong',
    mission: 'Shenzhou-19',
    launchDate: 'Oct 2024',
    expectedReturn: 'Apr 2025',
  },
];

const FALLBACK_CREW_ROTATIONS: CrewRotation[] = [
  {
    mission: 'SpaceX Crew-8',
    station: 'ISS',
    vehicle: 'SpaceX Crew Dragon Endeavour',
    launchDate: 'Mar 3, 2024',
    status: 'completed',
    crew: ['Matthew Dominick', 'Michael Barratt', 'Jeanette Epps', 'Alexander Grebenkin (Roscosmos)'],
  },
  {
    mission: 'Soyuz MS-25',
    station: 'ISS',
    vehicle: 'Soyuz MS-25',
    launchDate: 'Mar 23, 2024',
    status: 'completed',
    crew: ['Oleg Novitskiy', 'Marina Vasilevskaya (Belarus)', 'Tracy Dyson (NASA)'],
  },
  {
    mission: 'Boeing CFT (Starliner)',
    station: 'ISS',
    vehicle: 'Boeing Starliner Calypso',
    launchDate: 'Jun 5, 2024',
    status: 'completed',
    crew: ['Butch Wilmore', 'Sunita Williams'],
  },
  {
    mission: 'Shenzhou-18',
    station: 'Tiangong',
    vehicle: 'CZ-2F / Shenzhou-18',
    launchDate: 'Apr 25, 2024',
    status: 'completed',
    crew: ['Ye Guangfu', 'Li Cong', 'Li Guangsu'],
  },
  {
    mission: 'Soyuz MS-26',
    station: 'ISS',
    vehicle: 'Soyuz MS-26',
    launchDate: 'Sep 11, 2024',
    status: 'current',
    crew: ['Aleksey Ovchinin', 'Ivan Vagner', 'Don Pettit (NASA)'],
  },
  {
    mission: 'SpaceX Crew-9',
    station: 'ISS',
    vehicle: 'SpaceX Crew Dragon Freedom',
    launchDate: 'Sep 28, 2024',
    status: 'current',
    crew: ['Nick Hague', 'Aleksandr Gorbunov (Roscosmos)'],
  },
  {
    mission: 'Shenzhou-19',
    station: 'Tiangong',
    vehicle: 'CZ-2F / Shenzhou-19',
    launchDate: 'Oct 29, 2024',
    status: 'current',
    crew: ['Cai Xuzhe', 'Song Lingdong', 'Wang Haoze'],
  },
  {
    mission: 'SpaceX Crew-10',
    station: 'ISS',
    vehicle: 'SpaceX Crew Dragon',
    launchDate: 'Mar 2025',
    status: 'upcoming',
    crew: ['Anne McClain', 'Nicola Winter (ESA)', 'Takuya Onishi (JAXA)', 'Kirill Peskov (Roscosmos)'],
  },
  {
    mission: 'Soyuz MS-27',
    station: 'ISS',
    vehicle: 'Soyuz MS-27',
    launchDate: 'Mar 2025',
    status: 'upcoming',
    crew: ['Sergey Ryzhikov', 'Alexey Zubritsky', 'Jonny Kim (NASA)'],
  },
  {
    mission: 'Shenzhou-20',
    station: 'Tiangong',
    vehicle: 'CZ-2F / Shenzhou-20',
    launchDate: 'Apr 2025',
    status: 'planned',
    crew: ['TBD Commander', 'TBD Flight Engineer', 'TBD Payload Specialist'],
  },
  {
    mission: 'SpaceX Crew-11',
    station: 'ISS',
    vehicle: 'SpaceX Crew Dragon',
    launchDate: 'Aug 2025',
    status: 'planned',
    crew: ['TBD (4 crew)'],
  },
];

const FALLBACK_CLD_MILESTONES: CLDMilestone[] = [
  {
    date: 'Jan 2020',
    event: 'NASA Releases CLD Strategy',
    details: 'NASA formally announces the Commercial LEO Destinations strategy to transition from ISS to commercially owned and operated stations, purchasing services rather than owning infrastructure.',
    status: 'completed',
  },
  {
    date: 'Dec 2021',
    event: 'CLD Phase 1 Awards Announced',
    details: 'NASA awards a combined $415.6 million to three providers: Blue Origin ($130M for Orbital Reef), Nanoracks/Voyager Space ($160M for Starlab), and Northrop Grumman ($125.6M for a station concept).',
    status: 'completed',
  },
  {
    date: 'Jan 2022',
    event: 'Axiom Space Receives ISS Module Contract',
    details: 'Axiom Space receives NASA approval to attach its first commercial module (AxH1) to the ISS forward port, valued at up to $228M under a separate Space Act Agreement.',
    status: 'completed',
  },
  {
    date: 'Jan 2023',
    event: 'Axiom-2 Private Astronaut Mission',
    details: 'Axiom Space completes its second private astronaut mission (Ax-2) to the ISS, further demonstrating commercial crew operations capability and validating the CLD business model.',
    status: 'completed',
  },
  {
    date: 'Jul 2023',
    event: 'Voyager Space & Airbus Partnership for Starlab',
    details: 'Voyager Space and Airbus announce a joint venture for Starlab, combining European space heritage with American commercial expertise. Starlab redesigned for single Starship launch.',
    status: 'completed',
  },
  {
    date: 'Aug 2023',
    event: 'NASA CLD Certification Requirements Defined',
    details: 'NASA releases detailed certification requirements for commercial stations, covering crew safety, life support, structural integrity, and docking compatibility standards.',
    status: 'completed',
  },
  {
    date: 'Jan 2024',
    event: 'Axiom-3 Mission Completed',
    details: 'Axiom Space completes its third private astronaut mission (Ax-3) with ESA and Turkish astronauts, flying the first European commander of a commercial mission.',
    status: 'completed',
  },
  {
    date: 'Jun 2024',
    event: 'SpaceX ISS Deorbit Vehicle Contract',
    details: 'NASA awards SpaceX approximately $843 million to develop a modified Dragon spacecraft to serve as the ISS deorbit vehicle, ensuring controlled re-entry over the South Pacific.',
    status: 'completed',
  },
  {
    date: 'Aug 2024',
    event: 'Voyager Space CLD Award Increased to $217.5M',
    details: 'NASA increases Voyager Space/Airbus Starlab CLD award to $217.5 million, reflecting expanded scope and design maturity including Northrop Grumman joining as a partner.',
    status: 'completed',
  },
  {
    date: '2025',
    event: 'CLD Phase 2 Negotiations & Design Reviews',
    details: 'NASA enters Phase 2 certification discussions with CLD providers. Preliminary Design Reviews (PDR) for Starlab and Orbital Reef. Axiom continues AxH1 module fabrication.',
    status: 'in-progress',
  },
  {
    date: '2025-2026',
    event: 'Haven-1 Launch (Vast)',
    details: 'Vast targets launch of Haven-1, the first privately funded single-module station, aboard SpaceX Falcon 9. Would be the first commercial free-flying station.',
    status: 'upcoming',
  },
  {
    date: '2026',
    event: 'Axiom AxH1 Module Launch to ISS',
    details: 'Launch of Axiom Hub 1 (AxH1), the first commercial module to attach to the ISS forward port of Node 2 (Harmony). This module begins the Axiom Station assembly.',
    status: 'planned',
  },
  {
    date: '2027-2028',
    event: 'Orbital Reef & Starlab Initial Launch',
    details: 'Blue Origin/Sierra Space target Orbital Reef initial capability, and Voyager/Airbus target Starlab single-launch deployment on SpaceX Starship.',
    status: 'planned',
  },
  {
    date: '2028-2029',
    event: 'Commercial Station Certification & Initial Operations',
    details: 'NASA begins certifying commercial stations for crew operations. First NASA crew rotations on commercial stations. ISS begins phased handover activities.',
    status: 'planned',
  },
  {
    date: '~2030',
    event: 'ISS Controlled Deorbit',
    details: 'The International Space Station undergoes controlled deorbit using the SpaceX deorbit vehicle. The station re-enters over Point Nemo in the South Pacific Ocean.',
    status: 'planned',
  },
];

const FALLBACK_TRANSITION_RISKS: TransitionRisk[] = [
  {
    category: 'Schedule Gap',
    risk: 'Commercial stations may not be operational before ISS deorbit, creating a gap in US human spaceflight capability in LEO and loss of continuous human presence in space.',
    mitigation: 'NASA is pursuing multiple CLD providers to reduce single-point-of-failure risk. ISS life may be extended if commercial stations are delayed. Axiom\'s ISS-attached approach provides a transition bridge.',
    severity: 'high',
  },
  {
    category: 'Commercial Viability',
    risk: 'Insufficient non-NASA commercial demand to sustain station economics. NASA alone cannot be the sole anchor tenant if the business model depends on commercial revenue.',
    mitigation: 'Providers are developing diverse customer bases including pharmaceutical companies, materials science, media, tourism, and international space agencies. In-space manufacturing markets are growing.',
    severity: 'high',
  },
  {
    category: 'Technical Readiness',
    risk: 'New stations require proven life support, power, thermal control, and radiation protection systems that have never been operated outside of ISS heritage hardware.',
    mitigation: 'All CLD providers leverage ISS heritage systems and proven technologies. NASA provides technical consultation and access to ISS test data. Phased testing and certification approach reduces risk.',
    severity: 'medium',
  },
  {
    category: 'Research Continuity',
    risk: 'Decades of ISS research programs, long-duration experiments, and unique research facilities may be disrupted or lost during the transition period.',
    mitigation: 'NASA is planning research transition roadmaps, prioritizing critical experiments. Some ISS equipment can be transferred. Commercial stations are designing compatible research racks and interfaces.',
    severity: 'medium',
  },
  {
    category: 'International Partnerships',
    risk: 'ISS partner agencies (ESA, JAXA, CSA) may not have agreements in place with commercial station operators, fragmenting the international cooperation model built over 25+ years.',
    mitigation: 'Starlab includes Airbus (ESA heritage) and Mitsubishi (JAXA heritage). International partners are being integrated into CLD planning. Bilateral agreements are being negotiated.',
    severity: 'medium',
  },
  {
    category: 'Crew Safety & Emergency Return',
    risk: 'New commercial stations must demonstrate crew safety equivalent to ISS, including emergency return capability, safe haven during system failures, and radiation storm sheltering.',
    mitigation: 'NASA\'s rigorous Human Rating certification process applies to all CLD stations. Crew Dragon and Starliner provide proven emergency return vehicles. Stations must pass integrated safety reviews.',
    severity: 'medium',
  },
  {
    category: 'Launch Vehicle Dependency',
    risk: 'Some commercial stations (e.g., Starlab on Starship) depend on launch vehicles that are still in development and have not yet achieved required reliability for crewed payload delivery.',
    mitigation: 'Alternative launch vehicles are being considered as backup options. Station designs can be adapted to multiple launch vehicles. Phased deployment reduces dependency on single launches.',
    severity: 'medium',
  },
  {
    category: 'ISS Structural Aging',
    risk: 'ISS hardware is aging beyond original design life. Increasing maintenance costs and risk of critical system failures could force early retirement before commercial alternatives are ready.',
    mitigation: 'NASA conducts ongoing structural health monitoring. Preventive maintenance and component replacement programs. Contingency plans for accelerated transition if ISS develops critical issues.',
    severity: 'low',
  },
  {
    category: 'Geopolitical Tensions',
    risk: 'Continued US-Russia tensions could affect ISS operations, crew rotation schedules, and complicate the transition timeline for the Russian segment.',
    mitigation: 'Cross-seating agreements ensure both sides can access the station. Russia has indicated cooperation through 2028+. US segment can operate with reduced Russian support if necessary.',
    severity: 'low',
  },
];

const FALLBACK_ISS_POSITION: ISSPosition = {
  latitude: 24.5834,
  longitude: -47.2193,
  altitude: 408.2,
  velocity: 27576,
  visibility: 'daylight',
  timestamp: Math.floor(Date.now() / 1000),
  footprint: 4558,
};

// ────────────────────────────────────────
// Status Styling
// ────────────────────────────────────────

const STATUS_STYLES: Record<StationStatus, { label: string; color: string; bg: string; border: string }> = {
  operational: { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/40' },
  assembly: { label: 'Under Assembly', color: 'text-slate-300', bg: 'bg-white/[0.04]', border: 'border-white/15' },
  development: { label: 'In Development', color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/40' },
  concept: { label: 'Concept Phase', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-500/40' },
  planned: { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/40' },
};

const DEFAULT_STATUS_STYLE = { label: 'Unknown', color: 'text-slate-400', bg: 'bg-black/30', border: 'border-white/[0.08]' };

const ROTATION_STATUS_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  completed: { label: 'Completed', color: 'text-slate-400', bg: 'bg-black/20', dot: 'bg-slate-500' },
  current: { label: 'On Station', color: 'text-green-400', bg: 'bg-green-900/20', dot: 'bg-green-500 animate-pulse' },
  upcoming: { label: 'Upcoming', color: 'text-yellow-400', bg: 'bg-yellow-900/20', dot: 'bg-yellow-500' },
  planned: { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20', dot: 'bg-blue-500' },
};

const DEFAULT_ROTATION_STATUS_STYLE = { label: 'Unknown', color: 'text-slate-400', bg: 'bg-black/20', dot: 'bg-slate-500' };

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  high: { color: 'text-red-400', bg: 'bg-red-900/20' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  low: { color: 'text-green-400', bg: 'bg-green-900/20' },
};

const DEFAULT_SEVERITY_STYLE = { color: 'text-slate-400', bg: 'bg-black/20' };

// ────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────

function HeroStats() {
  const stats = [
    { label: 'Active Stations', value: '2', sub: 'ISS & Tiangong' },
    { label: 'Crew in Space', value: '10', sub: 'Across 2 stations' },
    { label: 'Commercial Planned', value: '4+', sub: 'Next-gen stations' },
    { label: 'ISS Retirement', value: '~2030', sub: 'Controlled deorbit' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5">
          <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
          <div className="text-white font-bold text-2xl mt-1">{stat.value}</div>
          <div className="text-star-400 text-xs mt-0.5">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

function ActiveStationCard({ station }: { station: SpaceStation }) {
  const [showModules, setShowModules] = useState(false);
  const statusStyle = STATUS_STYLES[station.status] || DEFAULT_STATUS_STYLE;

  return (
    <div className="card p-6 hover:border-white/15">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-bold text-xl">{station.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-star-400 text-sm">{station.operator}</p>
        </div>
        {station.currentCrew !== undefined && (
          <div className="text-center px-3 py-2 rounded-lg bg-black/50 border border-white/[0.06]">
            <div className="text-slate-300 font-bold text-xl">{station.currentCrew}</div>
            <div className="text-star-400 text-xs">Crew</div>
          </div>
        )}
      </div>

      {/* Key Specs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Orbit', value: station.altitude },
          { label: 'Inclination', value: station.inclination },
          { label: 'Mass', value: station.mass },
          { label: 'Volume', value: station.pressurizedVolume },
          { label: 'Power', value: station.power },
          { label: 'Docking Ports', value: String(station.dockingPorts) },
          { label: 'Crew Capacity', value: String(station.crewCapacity) },
          { label: 'Modules', value: String(station.modules.length) },
          { label: 'First Launch', value: station.launchDate },
        ].map((spec) => (
          <div key={spec.label} className="rounded-lg bg-black/40 p-2.5">
            <div className="text-star-400 text-xs">{spec.label}</div>
            <div className="text-white text-sm font-medium">{spec.value}</div>
          </div>
        ))}
      </div>

      {/* Continuous Occupation */}
      {station.continuousOccupation && (
        <div className="rounded-lg bg-green-900/20 border border-green-500/30 p-3 mb-4">
          <div className="text-green-400 text-xs font-medium uppercase tracking-widest mb-1">Continuous Occupation</div>
          <div className="text-white text-sm">{station.continuousOccupation}</div>
        </div>
      )}

      {/* Retirement */}
      {station.plannedRetirement && (
        <div className="rounded-lg bg-amber-900/20 border border-amber-500/30 p-3 mb-4">
          <div className="text-amber-400 text-xs font-medium uppercase tracking-widest mb-1">Planned Retirement</div>
          <div className="text-white text-sm">{station.plannedRetirement}</div>
        </div>
      )}

      {/* Visiting Vehicles */}
      <div className="mb-4">
        <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Visiting Vehicles</div>
        <div className="flex flex-wrap gap-2">
          {station.visitingVehicles.map((v) => (
            <span key={v.name} className={`px-2 py-1 rounded text-xs font-medium border ${
              v.type === 'crew' ? 'bg-white/[0.04] text-slate-300 border-white/10' :
              v.type === 'cargo' ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' :
              'bg-blue-900/20 text-blue-400 border-blue-500/30'
            }`}>
              {v.name} ({v.operator})
            </span>
          ))}
        </div>
      </div>

      {/* Research Facilities */}
      <div className="mb-4">
        <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Research Facilities</div>
        <div className="flex flex-wrap gap-1.5">
          {station.researchFacilities.map((facility) => (
            <span key={facility} className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-xs">
              {facility}
            </span>
          ))}
        </div>
      </div>

      {/* Expandable Module List */}
      <button
        onClick={() => setShowModules(!showModules)}
        className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1 mb-2"
      >
        <svg
          className={`w-3 h-3 transition-transform ${showModules ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {showModules ? 'Hide' : 'Show'} Module Details ({station.modules.length} modules)
      </button>
      {showModules && (
        <div className="border-t border-white/[0.06] pt-3 mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-star-400 text-xs uppercase tracking-widest">
                  <th className="text-left pb-2 pr-4">Module</th>
                  <th className="text-left pb-2 pr-4">Type</th>
                  <th className="text-left pb-2 pr-4">Launch</th>
                  <th className="text-left pb-2 pr-4">Mass</th>
                  <th className="text-left pb-2">Builder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {station.modules.map((mod) => (
                  <tr key={mod.name} className="text-star-300">
                    <td className="py-1.5 pr-4 text-white font-medium">{mod.name}</td>
                    <td className="py-1.5 pr-4">{mod.type}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{mod.launchDate}</td>
                    <td className="py-1.5 pr-4">{mod.mass || '--'}</td>
                    <td className="py-1.5">{mod.builder || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

        <RelatedModules modules={PAGE_RELATIONS['space-stations']} />
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-star-300 text-sm leading-relaxed mt-4 border-t border-white/[0.06] pt-4">
        {station.description}
      </p>
    </div>
  );
}

function CommercialStationCard({ station }: { station: CommercialStation }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_STYLES[station.status] || DEFAULT_STATUS_STYLE;

  return (
    <div className="card p-6 hover:border-white/15">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold text-lg">{station.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
            {station.nasaCLD && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">
                NASA CLD
              </span>
            )}
          </div>
          <p className="text-star-400 text-sm">{station.developer}</p>
        </div>
        <div className="text-center px-3 py-2 rounded-lg bg-black/50 border border-white/[0.06]">
          <div className="text-slate-300 font-bold text-lg">{station.crewCapacity}</div>
          <div className="text-star-400 text-xs">Crew Cap.</div>
        </div>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-black/40 p-2.5">
          <div className="text-star-400 text-xs">Target Launch</div>
          <div className="text-white text-sm font-medium">{station.targetLaunch}</div>
        </div>
        <div className="rounded-lg bg-black/40 p-2.5">
          <div className="text-star-400 text-xs">Funding</div>
          <div className="text-white text-sm font-medium">{station.fundingSource}</div>
        </div>
        {station.pressurizedVolume && (
          <div className="rounded-lg bg-black/40 p-2.5">
            <div className="text-star-400 text-xs">Volume</div>
            <div className="text-white text-sm font-medium">{station.pressurizedVolume}</div>
          </div>
        )}
        {station.launchVehicle && (
          <div className="rounded-lg bg-black/40 p-2.5">
            <div className="text-star-400 text-xs">Launch Vehicle</div>
            <div className="text-white text-sm font-medium">{station.launchVehicle}</div>
          </div>
        )}
      </div>

      {/* Partners */}
      <div className="mb-4">
        <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Partners</div>
        <div className="flex flex-wrap gap-1.5">
          {station.partners.map((partner) => (
            <span key={partner} className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-xs font-medium">
              {partner}
            </span>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <div className="mb-4">
        <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Key Capabilities</div>
        <ul className="space-y-1">
          {station.capabilities.slice(0, expanded ? undefined : 4).map((cap) => (
            <li key={cap} className="text-star-300 text-sm flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 flex-shrink-0" />
              {cap}
            </li>
          ))}
        </ul>
        {station.capabilities.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-300 hover:text-white transition-colors mt-2"
          >
            {expanded ? 'Show less' : `+${station.capabilities.length - 4} more`}
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-star-300 text-sm leading-relaxed border-t border-white/[0.06] pt-4">
        {station.description}
      </p>
    </div>
  );
}

function ComparisonTable() {
  const allStations = [
    {
      name: 'ISS',
      type: 'Government',
      status: 'Operational',
      operator: 'International (5 agencies)',
      crewCapacity: '6 (up to 13)',
      volume: '916 m3',
      mass: '~420,000 kg',
      power: '215 kW',
      orbit: 'LEO (408 km)',
      dockingPorts: '8',
      modules: '16',
      researchLabs: '4 (Destiny, Columbus, Kibo, Nauka)',
      launchDate: '1998',
      retirement: '~2030',
    },
    {
      name: 'Tiangong',
      type: 'Government',
      status: 'Operational',
      operator: 'CMSA (China)',
      crewCapacity: '3 (6 during rotation)',
      volume: '~340 m3',
      mass: '~100,000 kg',
      power: '~100 kW',
      orbit: 'LEO (390 km)',
      dockingPorts: '5',
      modules: '3 (expandable)',
      researchLabs: '2 (Wentian, Mengtian)',
      launchDate: '2021',
      retirement: '2035+',
    },
    {
      name: 'Axiom Station',
      type: 'Commercial',
      status: 'In Development',
      operator: 'Axiom Space',
      crewCapacity: '8',
      volume: 'TBD (multi-module)',
      mass: 'TBD',
      power: 'TBD',
      orbit: 'LEO (~400 km)',
      dockingPorts: 'TBD',
      modules: '4+ (planned)',
      researchLabs: 'Integrated research facility',
      launchDate: '2026 (modules)',
      retirement: 'N/A',
    },
    {
      name: 'Haven-1',
      type: 'Commercial',
      status: 'In Development',
      operator: 'Vast',
      crewCapacity: '4',
      volume: '~100 m3',
      mass: 'TBD',
      power: 'TBD',
      orbit: 'LEO',
      dockingPorts: '1',
      modules: '1 (single module)',
      researchLabs: 'Microgravity research platform',
      launchDate: '2026',
      retirement: 'N/A',
    },
    {
      name: 'Orbital Reef',
      type: 'Commercial',
      status: 'In Development',
      operator: 'Blue Origin / Sierra Space',
      crewCapacity: '10',
      volume: '~830 m3',
      mass: 'TBD',
      power: 'TBD',
      orbit: 'LEO (~500 km)',
      dockingPorts: 'Multiple',
      modules: 'Core + LIFE inflatable + Science',
      researchLabs: 'Full research park + manufacturing',
      launchDate: '2027-2028',
      retirement: 'N/A',
    },
    {
      name: 'Starlab',
      type: 'Commercial',
      status: 'In Development',
      operator: 'Voyager Space / Airbus',
      crewCapacity: '4',
      volume: '~340 m3',
      mass: 'TBD',
      power: 'TBD',
      orbit: 'LEO (~400 km)',
      dockingPorts: 'TBD',
      modules: 'Single-launch integrated',
      researchLabs: 'George Washington Carver Science Park',
      launchDate: '2028',
      retirement: 'N/A',
    },
  ];

  const comparisonFields = [
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'operator', label: 'Operator' },
    { key: 'crewCapacity', label: 'Crew Capacity' },
    { key: 'volume', label: 'Pressurized Volume' },
    { key: 'mass', label: 'Mass' },
    { key: 'power', label: 'Power Generation' },
    { key: 'orbit', label: 'Orbit' },
    { key: 'dockingPorts', label: 'Docking Ports' },
    { key: 'modules', label: 'Modules' },
    { key: 'researchLabs', label: 'Research Facilities' },
    { key: 'launchDate', label: 'First Launch' },
    { key: 'retirement', label: 'Retirement' },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-white/[0.06]">
        <h2 className="text-white font-bold text-lg">Station Comparison Matrix</h2>
        <p className="text-star-400 text-sm mt-1">Side-by-side comparison of all active and planned space stations</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left p-3 text-star-400 text-xs uppercase tracking-widest min-w-[160px] sticky left-0 bg-white/[0.06] backdrop-blur z-10">Parameter</th>
              {allStations.map((s) => (
                <th key={s.name} className="text-left p-3 text-white font-semibold min-w-[160px]">
                  <div>{s.name}</div>
                  <div className={`text-xs font-normal mt-0.5 ${
                    s.status === 'Operational' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {s.status}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {comparisonFields.map((field) => (
              <tr key={field.key} className="hover:bg-white/[0.04] transition-colors">
                <td className="p-3 text-star-400 text-xs uppercase tracking-widest sticky left-0 bg-white/[0.06] backdrop-blur z-10">
                  {field.label}
                </td>
                {allStations.map((s) => (
                  <td key={s.name} className="p-3 text-star-200 text-sm">
                    {(s as Record<string, string>)[field.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CrewTracker({ currentCrew, crewRotations }: { currentCrew: CrewMember[]; crewRotations: CrewRotation[] }) {
  const issCrewCount = currentCrew.filter((c) => c.station === 'ISS').length;
  const tiangongCrewCount = currentCrew.filter((c) => c.station === 'Tiangong').length;

  const nationalities = Array.from(new Set(currentCrew.map((c) => c.nationality)));
  const agencies = Array.from(new Set(currentCrew.map((c) => c.agency)));

  return (
    <div className="space-y-6">
      {/* Crew Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-white font-bold text-2xl">{currentCrew.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">Humans in Space</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-slate-300 font-bold text-2xl">{issCrewCount}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">ISS Crew</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-amber-400 font-bold text-2xl">{tiangongCrewCount}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">Tiangong Crew</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-purple-400 font-bold text-2xl">{nationalities.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">Nationalities</div>
        </div>
      </div>

      {/* Nationality Breakdown */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4">Nationality & Agency Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-star-400 text-xs uppercase tracking-widest mb-3">By Nationality</div>
            {nationalities.map((nat) => {
              const count = currentCrew.filter((c) => c.nationality === nat).length;
              const pct = (count / currentCrew.length) * 100;
              return (
                <div key={nat} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-star-200">{nat}</span>
                    <span className="text-white font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-white to-slate-200 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <div className="text-star-400 text-xs uppercase tracking-widest mb-3">By Agency</div>
            {agencies.map((agency) => {
              const count = currentCrew.filter((c) => c.agency === agency).length;
              const pct = (count / currentCrew.length) * 100;
              return (
                <div key={agency} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-star-200">{agency}</span>
                    <span className="text-white font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Crew Cards by Station */}
      {['ISS', 'Tiangong'].map((stationName) => {
        const crew = currentCrew.filter((c) => c.station === stationName);
        return (
          <div key={stationName} className="card p-5">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${stationName === 'ISS' ? 'bg-white' : 'bg-amber-500'}`} />
              {stationName} Current Crew ({crew.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {crew.map((member) => (
                <div key={member.name} className="rounded-lg bg-black/50 border border-white/[0.06] p-3">
                  <div className="text-white font-semibold text-sm">{member.name}</div>
                  <div className="text-star-400 text-xs mt-1">{member.role}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-slate-300">{member.agency}</span>
                    <span className="text-star-500">|</span>
                    <span className="text-star-300">{member.nationality}</span>
                  </div>
                  <div className="text-star-400 text-xs mt-1">Mission: {member.mission}</div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-star-500">Launch: {member.launchDate}</span>
                    <span className="text-star-500">Return: {member.expectedReturn}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Crew Rotation Schedule */}
      <div className="card p-5">
        <h3 className="text-white font-bold text-lg mb-4">Crew Rotation Schedule</h3>
        <div className="space-y-3">
          {crewRotations.map((rotation) => {
            const style = ROTATION_STATUS_STYLES[rotation.status] || DEFAULT_ROTATION_STATUS_STYLE;
            return (
              <div key={rotation.mission} className={`rounded-lg ${style.bg} border border-white/[0.06] p-4`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    <span className="text-white font-semibold">{rotation.mission}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.bg} ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-star-400">{rotation.station}</span>
                    <span className="text-star-500">|</span>
                    <span className="text-star-300">{rotation.vehicle}</span>
                    <span className="text-star-500">|</span>
                    <span className="text-star-300 font-mono">{rotation.launchDate}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-5">
                  {rotation.crew.map((name) => (
                    <span key={name} className="px-2 py-0.5 bg-white/[0.04] text-star-200 rounded text-xs">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ISSTransition({ cldMilestones, transitionRisks }: { cldMilestones: CLDMilestone[]; transitionRisks: TransitionRisk[] }) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4">NASA Commercial LEO Destinations (CLD) Program</h2>
        <div className="space-y-4 text-star-300 leading-relaxed">
          <p>
            NASA&apos;s <span className="text-white font-semibold">Commercial LEO Destinations (CLD)</span> program
            represents the agency&apos;s strategy for transitioning from the International Space Station to commercially
            operated space stations. Rather than building and operating the next station itself, NASA will purchase
            services -- crew time, research facilities, and cargo transportation -- from private companies, similar to
            how it now buys crew transportation from SpaceX.
          </p>
          <p>
            The program has awarded a combined <span className="text-slate-300 font-semibold">~$575.5 million</span> across
            three providers (Axiom Space, Blue Origin/Sierra Space, and Voyager Space/Airbus) to develop commercial
            stations that can host NASA astronauts and research alongside paying commercial customers. This public-private
            partnership model aims to reduce NASA&apos;s LEO operational costs from approximately $3-4 billion per year
            (ISS) to an estimated $1 billion per year for purchased services.
          </p>
        </div>
      </div>

      {/* Budget Comparison */}
      <div className="card p-5">
        <h3 className="text-white font-semibold mb-4">Budget Implications</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-red-900/20 border border-red-500/30 p-4 text-center">
            <div className="text-red-400 text-xs uppercase tracking-widest mb-2">Current ISS Cost</div>
            <div className="text-white font-bold text-2xl">~$3-4B/yr</div>
            <div className="text-star-400 text-xs mt-1">Operations, maintenance, crew</div>
          </div>
          <div className="rounded-lg bg-yellow-900/20 border border-yellow-500/30 p-4 text-center">
            <div className="text-yellow-400 text-xs uppercase tracking-widest mb-2">CLD Investment</div>
            <div className="text-white font-bold text-2xl">~$575.5M</div>
            <div className="text-star-400 text-xs mt-1">Phase 1 development awards</div>
          </div>
          <div className="rounded-lg bg-green-900/20 border border-green-500/30 p-4 text-center">
            <div className="text-green-400 text-xs uppercase tracking-widest mb-2">Target Commercial Cost</div>
            <div className="text-white font-bold text-2xl">~$1B/yr</div>
            <div className="text-star-400 text-xs mt-1">Purchased services model</div>
          </div>
        </div>
      </div>

      {/* CLD Timeline */}
      <div className="card p-5">
        <h3 className="text-white font-bold text-lg mb-6">CLD & ISS Transition Timeline</h3>
        <div className="relative">
          <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 opacity-30" />
          <div className="space-y-5">
            {cldMilestones.map((milestone) => {
              const dotColor = milestone.status === 'completed' ? 'bg-green-500 border-green-400' :
                milestone.status === 'in-progress' ? 'bg-yellow-500 border-yellow-400 animate-pulse' :
                milestone.status === 'upcoming' ? 'bg-white border-white/10' :
                'bg-white/[0.1] border-white/[0.1]';
              const statusLabel = milestone.status === 'completed' ? 'Completed' :
                milestone.status === 'in-progress' ? 'In Progress' :
                milestone.status === 'upcoming' ? 'Upcoming' : 'Planned';
              const statusColor = milestone.status === 'completed' ? 'text-green-400' :
                milestone.status === 'in-progress' ? 'text-yellow-400' :
                milestone.status === 'upcoming' ? 'text-slate-300' : 'text-blue-400';

              return (
                <div key={milestone.event} className="relative pl-12">
                  <div className={`absolute left-2.5 top-2 w-4 h-4 rounded-full border-2 ${dotColor}`} />
                  <div className="rounded-lg bg-black/40 border border-white/[0.06] p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span className="text-star-300 text-sm font-mono">{milestone.date}</span>
                      <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                    </div>
                    <h4 className="text-white font-semibold">{milestone.event}</h4>
                    <p className="text-star-400 text-sm mt-1">{milestone.details}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ISS Deorbit Plan */}
      <div className="card p-5 border-amber-500/30 bg-amber-900/10">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          ISS Deorbit Plan
        </h3>
        <div className="space-y-3 text-star-300 text-sm leading-relaxed">
          <p>
            NASA has contracted <span className="text-white font-semibold">SpaceX</span> for approximately
            <span className="text-slate-300 font-semibold"> $843 million</span> to develop and build a dedicated
            deorbit vehicle for the ISS. The station, weighing approximately 420,000 kg, will be the largest
            human-made object ever intentionally deorbited.
          </p>
          <p>
            The controlled deorbit is planned for <span className="text-white font-semibold">approximately 2030</span>.
            The ISS will be guided to re-enter Earth&apos;s atmosphere over a remote area of the South Pacific Ocean,
            known as the <span className="text-white font-semibold">Spacecraft Cemetery</span> near Point Nemo --
            the oceanic point farthest from any land mass. This is the same area where Russia deorbited the Mir
            space station in 2001.
          </p>
          <p>
            The SpaceX deorbit vehicle is based on a modified Dragon spacecraft with significantly enhanced propulsion
            capability. The vehicle will dock with the ISS and perform a series of deorbit burns to lower the station&apos;s
            orbit in a controlled manner, ensuring debris falls within the designated oceanic impact zone.
          </p>
        </div>
      </div>

      {/* Capability Gap Analysis */}
      <div className="card p-5">
        <h3 className="text-white font-bold text-lg mb-4">Transition Risk Assessment</h3>
        <p className="text-star-300 text-sm mb-4">
          Key risks and mitigations for the transition from ISS to commercial stations.
        </p>
        <div className="space-y-3">
          {transitionRisks.map((risk) => {
            const sevStyle = SEVERITY_STYLES[risk.severity] || DEFAULT_SEVERITY_STYLE;
            return (
              <div key={risk.category} className="rounded-lg bg-black/40 border border-white/[0.06] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-semibold text-sm">{risk.category}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${sevStyle.bg} ${sevStyle.color}`}>
                    {risk.severity.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-red-400 text-xs uppercase tracking-widest mb-1">Risk</div>
                    <p className="text-star-300">{risk.risk}</p>
                  </div>
                  <div>
                    <div className="text-green-400 text-xs uppercase tracking-widest mb-1">Mitigation</div>
                    <p className="text-star-300">{risk.mitigation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CLD Provider Summary */}
      <div className="card p-5">
        <h3 className="text-white font-bold text-lg mb-4">CLD Provider Awards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Axiom Space', award: '$228M', status: 'Assembly phase', station: 'Axiom Station', notes: 'First modules attach to ISS, then free-fly' },
            { name: 'Blue Origin / Sierra Space', award: '$130M', status: 'Development', station: 'Orbital Reef', notes: 'Mixed-use business park concept with LIFE habitat' },
            { name: 'Voyager Space / Airbus', award: '$217.5M', status: 'Development', station: 'Starlab', notes: 'Single-launch design on SpaceX Starship' },
          ].map((provider) => (
            <div key={provider.name} className="rounded-lg bg-black/50 border border-white/[0.06] p-4">
              <div className="text-white font-semibold mb-1">{provider.name}</div>
              <div className="text-slate-300 font-bold text-lg mb-2">{provider.award}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Station</div>
              <div className="text-star-200 text-sm mb-2">{provider.station}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Status</div>
              <div className="text-star-200 text-sm mb-2">{provider.status}</div>
              <p className="text-star-400 text-xs mt-2 border-t border-white/[0.06] pt-2">{provider.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tabs
// ────────────────────────────────────────

type TabId = 'active' | 'commercial' | 'comparison' | 'crew' | 'transition';

const TABS: { id: TabId; label: string }[] = [
  { id: 'active', label: 'Active Stations' },
  { id: 'commercial', label: 'Commercial Stations' },
  { id: 'comparison', label: 'Station Comparison' },
  { id: 'crew', label: 'Crew Tracker' },
  { id: 'transition', label: 'ISS Transition' },
];

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceStationTrackerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data state — initialized with fallback data so page renders immediately
  const [issPosition, setIssPosition] = useState<ISSPosition | null>(FALLBACK_ISS_POSITION);
  const [issPositionLoading, setIssPositionLoading] = useState(false);
  const [activeStations, setActiveStations] = useState<SpaceStation[]>(FALLBACK_ACTIVE_STATIONS);
  const [commercialStations, setCommercialStations] = useState<CommercialStation[]>(FALLBACK_COMMERCIAL_STATIONS);
  const [currentCrew, setCurrentCrew] = useState<CrewMember[]>(FALLBACK_CURRENT_CREW);
  const [crewRotations, setCrewRotations] = useState<CrewRotation[]>(FALLBACK_CREW_ROTATIONS);
  const [cldMilestones, setCldMilestones] = useState<CLDMilestone[]>(FALLBACK_CLD_MILESTONES);
  const [transitionRisks, setTransitionRisks] = useState<TransitionRisk[]>(FALLBACK_TRANSITION_RISKS);

  useEffect(() => {
    async function loadData() {
      setError(null);
      try {
        const [stationsRes, commercialRes, crewRes, rotationsRes, milestonesRes, risksRes, issRes] = await Promise.all([
          fetch('/api/content/space-stations?section=active-stations'),
          fetch('/api/content/space-stations?section=commercial-stations'),
          fetch('/api/content/space-stations?section=crew'),
          fetch('/api/content/space-stations?section=crew-rotations'),
          fetch('/api/content/space-stations?section=cld-milestones'),
          fetch('/api/content/space-stations?section=transition-risks'),
          fetch('/api/content/space-stations?section=iss-position'),
        ]);

        const stationsData = await stationsRes.json();
        const commercialData = await commercialRes.json();
        const crewData = await crewRes.json();
        const rotationsData = await rotationsRes.json();
        const milestonesData = await milestonesRes.json();
        const risksData = await risksRes.json();
        const issData = await issRes.json();

        // Only use API data when it contains sufficient results; otherwise keep fallback
        if (Array.isArray(stationsData.data) && stationsData.data.length > 0) {
          setActiveStations(stationsData.data);
        }
        if (Array.isArray(commercialData.data) && commercialData.data.length > 0) {
          setCommercialStations(commercialData.data);
        }
        if (Array.isArray(crewData.data) && crewData.data.length > 0) {
          setCurrentCrew(crewData.data);
        }
        if (Array.isArray(rotationsData.data) && rotationsData.data.length > 0) {
          setCrewRotations(rotationsData.data);
        }
        if (Array.isArray(milestonesData.data) && milestonesData.data.length > 0) {
          setCldMilestones(milestonesData.data);
        }
        if (Array.isArray(risksData.data) && risksData.data.length > 0) {
          setTransitionRisks(risksData.data);
        }
        if (issData.data?.[0]) {
          setIssPosition(issData.data[0]);
        } else if (issData.data && !Array.isArray(issData.data) && issData.data.latitude !== undefined) {
          setIssPosition(issData.data);
        }
        // If API returned valid meta, show it
        if (stationsData.meta?.lastRefreshed) {
          setRefreshedAt(stationsData.meta.lastRefreshed);
        }
      } catch (err) {
        clientLogger.error('Failed to load space stations data', { error: err instanceof Error ? err.message : String(err) });
        // Fallback data is already in state, so no action needed — just log the failure
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshIssPosition = useCallback(async () => {
    setIssPositionLoading(true);
    try {
      const res = await fetch('/api/content/space-stations?section=iss-position');
      const data = await res.json();
      if (data.data?.[0]) setIssPosition(data.data[0]);
      else if (data.data && !Array.isArray(data.data)) setIssPosition(data.data);
    } catch (error) {
      clientLogger.error('Failed to refresh ISS position', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIssPositionLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/[0.06] rounded w-1/3"></div>
            <div className="h-4 bg-white/[0.06] rounded w-2/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white/[0.06] rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 bg-white/[0.06] rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/art/hero-space-stations.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <AnimatedPageHeader
            title="Space Station Tracker"
            subtitle="Comprehensive tracking of active and planned space stations, crew rotations, and the transition to commercial LEO destinations"
            icon="🏗️"
            accentColor="cyan"
          />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* ISS Live Position */}
        {issPosition && (
          <div className="card p-5 border-2 border-white/15 bg-gradient-to-r from-white/[0.04] to-white/[0.06] mb-6 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                ISS Live Position
              </h3>
              <button
                onClick={refreshIssPosition}
                disabled={issPositionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/90 hover:bg-white/15 transition-colors border border-white/10 disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${issPositionLoading ? 'animate-spin' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                {issPositionLoading ? 'Updating...' : 'Refresh'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="rounded-lg bg-black/50 border border-white/[0.06] p-3 text-center">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Latitude</div>
                <div className="text-white font-bold text-lg">{issPosition.latitude.toFixed(4)}&deg;</div>
              </div>
              <div className="rounded-lg bg-black/50 border border-white/[0.06] p-3 text-center">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Longitude</div>
                <div className="text-white font-bold text-lg">{issPosition.longitude.toFixed(4)}&deg;</div>
              </div>
              <div className="rounded-lg bg-black/50 border border-white/[0.06] p-3 text-center">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Altitude</div>
                <div className="text-slate-300 font-bold text-lg">{issPosition.altitude.toFixed(1)} km</div>
              </div>
              <div className="rounded-lg bg-black/50 border border-white/[0.06] p-3 text-center">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Velocity</div>
                <div className="text-slate-300 font-bold text-lg">{issPosition.velocity.toFixed(0)} km/h</div>
              </div>
              <div className="rounded-lg bg-black/50 border border-white/[0.06] p-3 text-center">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Visibility</div>
                <div className="text-white font-bold text-lg capitalize">{issPosition.visibility || '--'}</div>
              </div>
            </div>
            <div className="text-star-500 text-xs mt-3 text-right">
              Last updated: {issPosition.timestamp ? new Date(issPosition.timestamp * 1000).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) : '--'}
            </div>
          </div>
        )}

        {/* Hero Stats */}
        <ScrollReveal>
          <HeroStats />
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="border-b border-white/[0.06] mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-white/15 text-white/90'
                    : 'border-transparent text-star-300 hover:text-white hover:border-white/[0.1]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'active' && (
          <div className="space-y-8">
            {activeStations.map((station) => (
              <ActiveStationCard key={station.id} station={station} />
            ))}
          </div>
        )}

        {activeTab === 'commercial' && (
          <div className="space-y-6">
            <div className="card p-5 mb-6">
              <h2 className="text-white font-bold text-lg mb-3">Next-Generation Commercial Space Stations</h2>
              <p className="text-star-300 text-sm leading-relaxed">
                As the ISS approaches its planned retirement around 2030, a new generation of commercial space stations
                is being developed to ensure continued human presence and research capability in low Earth orbit. NASA&apos;s
                Commercial LEO Destinations (CLD) program is funding three station concepts, while Vast is self-funding
                Haven-1 as a pathfinder for larger stations.
              </p>
            </div>
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {commercialStations.map((station) => (
                <StaggerItem key={station.id}>
                  <CommercialStationCard station={station} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}

        {activeTab === 'comparison' && <ComparisonTable />}

        {activeTab === 'crew' && <CrewTracker currentCrew={currentCrew} crewRotations={crewRotations} />}

        {activeTab === 'transition' && <ISSTransition cldMilestones={cldMilestones} transitionRisks={transitionRisks} />}

        {/* Related Modules */}
        <div className="card p-4 mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/cislunar?tab=gateway" className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-star-300 hover:text-white hover:bg-white/[0.08] text-sm transition-colors">
              Lunar Gateway
            </Link>
            <Link href="/space-environment?tab=debris" className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-star-300 hover:text-white hover:bg-white/[0.08] text-sm transition-colors">
              Debris Monitor
            </Link>
            <Link href="/launch-windows" className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-star-300 hover:text-white hover:bg-white/[0.08] text-sm transition-colors">
              Launch Windows
            </Link>
            <Link href="/space-tourism" className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-star-300 hover:text-white hover:bg-white/[0.08] text-sm transition-colors">
              Space Tourism
            </Link>
            <Link href="/constellations" className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-star-300 hover:text-white hover:bg-white/[0.08] text-sm transition-colors">
              Constellations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
