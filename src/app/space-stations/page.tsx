'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

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

// ────────────────────────────────────────
// Data - Active Stations
// ────────────────────────────────────────

const ACTIVE_STATIONS: SpaceStation[] = [
  {
    id: 'iss',
    name: 'International Space Station (ISS)',
    operator: 'NASA / Roscosmos / ESA / JAXA / CSA',
    country: 'International',
    status: 'operational',
    orbit: 'Low Earth Orbit (LEO)',
    altitude: '~408 km',
    inclination: '51.6 degrees',
    crewCapacity: 6,
    currentCrew: 7,
    mass: '~420,000 kg',
    pressurizedVolume: '916 m3',
    power: '~215 kW (solar arrays)',
    dockingPorts: 8,
    modules: [
      { name: 'Zarya (FGB)', type: 'Control Module', launchDate: 'Nov 1998', mass: '19,323 kg', builder: 'Khrunichev' },
      { name: 'Unity (Node 1)', type: 'Connecting Node', launchDate: 'Dec 1998', mass: '11,612 kg', builder: 'Boeing' },
      { name: 'Zvezda (SM)', type: 'Service Module', launchDate: 'Jul 2000', mass: '19,051 kg', builder: 'RSC Energia' },
      { name: 'Destiny', type: 'US Laboratory', launchDate: 'Feb 2001', mass: '14,515 kg', builder: 'Boeing' },
      { name: 'Quest', type: 'Joint Airlock', launchDate: 'Jul 2001', mass: '6,064 kg', builder: 'Boeing' },
      { name: 'Harmony (Node 2)', type: 'Connecting Node', launchDate: 'Oct 2007', mass: '14,288 kg', builder: 'Thales Alenia Space' },
      { name: 'Columbus', type: 'ESA Laboratory', launchDate: 'Feb 2008', mass: '10,300 kg', builder: 'Thales Alenia Space' },
      { name: 'Kibo (JEM)', type: 'JAXA Laboratory', launchDate: 'Jun 2008', mass: '15,900 kg', builder: 'JAXA / Mitsubishi' },
      { name: 'Tranquility (Node 3)', type: 'Life Support Node', launchDate: 'Feb 2010', mass: '15,500 kg', builder: 'Thales Alenia Space' },
      { name: 'Cupola', type: 'Observation Module', launchDate: 'Feb 2010', mass: '1,805 kg', builder: 'Thales Alenia Space' },
      { name: 'Rassvet (MRM-1)', type: 'Docking/Storage', launchDate: 'May 2010', mass: '5,075 kg', builder: 'RSC Energia' },
      { name: 'BEAM', type: 'Expandable Module', launchDate: 'Apr 2016', mass: '1,413 kg', builder: 'Bigelow Aerospace' },
      { name: 'Nauka (MLM)', type: 'Multipurpose Lab', launchDate: 'Jul 2021', mass: '20,350 kg', builder: 'Khrunichev' },
      { name: 'Prichal', type: 'Docking Node', launchDate: 'Nov 2021', mass: '3,890 kg', builder: 'RSC Energia' },
    ],
    visitingVehicles: [
      { name: 'Crew Dragon', type: 'crew', operator: 'SpaceX', status: 'active' },
      { name: 'Soyuz MS', type: 'crew', operator: 'Roscosmos', status: 'active' },
      { name: 'Cargo Dragon', type: 'cargo', operator: 'SpaceX', status: 'active' },
      { name: 'Cygnus', type: 'cargo', operator: 'Northrop Grumman', status: 'active' },
      { name: 'Progress MS', type: 'cargo', operator: 'Roscosmos', status: 'active' },
      { name: 'HTV-X', type: 'cargo', operator: 'JAXA', status: 'active' },
      { name: 'Starliner', type: 'crew', operator: 'Boeing', status: 'active' },
    ],
    launchDate: 'November 20, 1998',
    continuousOccupation: 'Since November 2, 2000 (Expedition 1)',
    plannedRetirement: '~2030 (controlled deorbit planned)',
    researchFacilities: [
      'US National Laboratory',
      'Columbus (ESA) laboratory',
      'Kibo (JAXA) laboratory with exposed facility',
      'Nauka (Russian) multipurpose laboratory',
      'Cold Atom Laboratory',
      'Materials Science Research Rack',
      'Combustion Integrated Rack',
      'Fluids Integrated Rack',
      'Microgravity Science Glovebox',
    ],
    description: 'The International Space Station is the largest human-made structure in space, a collaborative effort of 15 nations. It has been continuously inhabited since November 2, 2000, making it the longest continuous human presence in low Earth orbit -- over 25 years. The ISS orbits Earth approximately every 90 minutes at a speed of about 28,000 km/h. Over 270 individuals from 21 countries have visited the station. The ISS serves as a microgravity and space environment research laboratory where scientific research is conducted in astrobiology, astronomy, meteorology, physics, and other fields. It is scheduled for decommissioning around 2030, with NASA planning a controlled deorbit using a dedicated deorbit vehicle.',
  },
  {
    id: 'tiangong',
    name: 'Tiangong Space Station',
    operator: 'CMSA (China Manned Space Agency)',
    country: 'China',
    status: 'operational',
    orbit: 'Low Earth Orbit (LEO)',
    altitude: '~390 km',
    inclination: '41.5 degrees',
    crewCapacity: 3,
    currentCrew: 3,
    mass: '~100,000 kg (with visiting vehicles)',
    pressurizedVolume: '~340 m3',
    power: '~100 kW (solar arrays)',
    dockingPorts: 5,
    modules: [
      { name: 'Tianhe (Core Module)', type: 'Core/Living Module', launchDate: 'Apr 2021', mass: '22,600 kg', builder: 'CAST' },
      { name: 'Wentian', type: 'Laboratory Module', launchDate: 'Jul 2022', mass: '23,000 kg', builder: 'CAST' },
      { name: 'Mengtian', type: 'Laboratory Module', launchDate: 'Oct 2022', mass: '23,000 kg', builder: 'CAST' },
    ],
    visitingVehicles: [
      { name: 'Shenzhou', type: 'crew', operator: 'CMSA', status: 'active' },
      { name: 'Tianzhou', type: 'cargo', operator: 'CMSA', status: 'active' },
    ],
    launchDate: 'April 29, 2021 (Tianhe core)',
    continuousOccupation: 'Since June 2022 (Shenzhou-14)',
    plannedRetirement: '2035+ (designed for 15+ year lifespan)',
    researchFacilities: [
      'Wentian laboratory (life sciences, biotechnology)',
      'Mengtian laboratory (microgravity physics, fluid science)',
      'Exposed experiment platform (space science payloads)',
      'Robotic arm (10m, 25-ton capacity)',
      'Xuntian space telescope (co-orbital, 2m aperture)',
      'Cold atom clock experiments',
      'Containerless processing facilities',
    ],
    description: 'China\'s Tiangong (meaning "Heavenly Palace") is the country\'s permanently crewed space station in low Earth orbit. The T-shaped three-module station was assembled between 2021 and 2022, with Tianhe serving as the core living and command module, and Wentian and Mengtian as laboratory modules. The station supports a crew of 3, with 6 during rotation handovers. China plans to expand Tiangong with additional modules over the coming years, potentially increasing its mass to over 180 tonnes. The associated Xuntian Space Telescope, a Hubble-class observatory, orbits near the station and can dock for servicing. China has invited international collaboration, with experiments from multiple countries being conducted aboard.',
  },
];

// ────────────────────────────────────────
// Data - Commercial Stations
// ────────────────────────────────────────

const COMMERCIAL_STATIONS: CommercialStation[] = [
  {
    id: 'axiom',
    name: 'Axiom Station',
    developer: 'Axiom Space',
    partners: ['NASA', 'Thales Alenia Space', 'SpaceX'],
    status: 'assembly',
    fundingSource: 'NASA CLD award ($228M) + private funding',
    estimatedCost: '$2B+',
    targetLaunch: 'Axiom Hab 1 module: 2026 (attached to ISS), free-flying: ~2028-2030',
    crewCapacity: 8,
    pressurizedVolume: 'TBD (multi-module station)',
    orbit: 'LEO (~400 km)',
    launchVehicle: 'SpaceX Falcon Heavy / Starship',
    capabilities: [
      'Initially attached to ISS Node 2 forward port',
      'Modules detach to become free-flying station when ISS retires',
      'Research and manufacturing in microgravity',
      'Earth observation cupola window',
      'Commercial astronaut missions (Ax-1 through Ax-4 completed/planned)',
      'In-space manufacturing and materials science',
      'Space tourism and sovereign astronaut training',
    ],
    nasaCLD: true,
    description: 'Axiom Space is building the world\'s first commercial space station. The station will initially attach modules to the ISS beginning in 2026, then detach to become an independent free-flying station when the ISS is retired. Axiom has already conducted multiple private astronaut missions (Ax-1, Ax-2, Ax-3, Ax-4) to the ISS using SpaceX Crew Dragon. The company was awarded $228 million by NASA under the Commercial LEO Destinations program. Axiom Station is designed to serve researchers, manufacturers, and sovereign astronauts from countries that don\'t have their own space programs.',
  },
  {
    id: 'vast-haven1',
    name: 'Haven-1',
    developer: 'Vast',
    partners: ['SpaceX', 'Launcher (Vast subsidiary)'],
    status: 'development',
    fundingSource: 'Private funding (~$400M+ raised)',
    targetLaunch: 'NET 2026 (on SpaceX Falcon 9)',
    crewCapacity: 4,
    pressurizedVolume: '~100 m3',
    orbit: 'LEO',
    launchVehicle: 'SpaceX Falcon 9',
    capabilities: [
      'Single-module station (first commercial single-launch station)',
      'Artificial gravity research (future Haven-2 rotating station)',
      'Crew transported via SpaceX Crew Dragon',
      'Up to 30-day crew missions',
      'Microgravity research platform',
      'Pathfinder for larger Vast stations',
    ],
    nasaCLD: false,
    description: 'Vast\'s Haven-1 aims to be the world\'s first commercial space station to achieve orbit, launching as a single module aboard a SpaceX Falcon 9 rocket. Founded by cryptocurrency entrepreneur Jed McCaleb, Vast has raised over $400 million in private funding. Haven-1 is designed as a pathfinder for the larger Haven-2 station, which will incorporate artificial gravity via rotation. The first crewed mission will use SpaceX Crew Dragon to transport up to 4 astronauts for stays of up to 30 days. Vast acquired Launcher in 2023, gaining in-house propulsion and vehicle expertise.',
  },
  {
    id: 'orbital-reef',
    name: 'Orbital Reef',
    developer: 'Blue Origin / Sierra Space',
    partners: ['Blue Origin', 'Sierra Space', 'Boeing', 'Redwire Space', 'Genesis Engineering Solutions', 'Arizona State University'],
    status: 'development',
    fundingSource: 'NASA CLD award ($130M) + Blue Origin/Sierra Space funding',
    estimatedCost: '$3B+ estimated',
    targetLaunch: '2027-2028',
    crewCapacity: 10,
    pressurizedVolume: '~830 m3 (with LIFE module)',
    orbit: 'LEO (~500 km)',
    launchVehicle: 'Blue Origin New Glenn / ULA Vulcan',
    capabilities: [
      'Core module by Blue Origin',
      'LIFE inflatable habitat by Sierra Space (expandable module)',
      'Science and research park concept',
      'In-space manufacturing facilities',
      'Film and media production studio',
      'Space tourism accommodations',
      'Regenerative life support systems',
      'Dream Chaser cargo vehicle access (Sierra Space)',
    ],
    nasaCLD: true,
    description: 'Orbital Reef is a planned commercial space station being developed as a joint venture between Blue Origin and Sierra Space, with contributions from Boeing, Redwire Space, and others. Designed as a "mixed-use business park in space," it aims to accommodate research, industrial, commercial, and tourism activities. NASA awarded the consortium $130 million under the CLD program. Sierra Space\'s LIFE (Large Integrated Flexible Environment) expandable module would provide significantly more pressurized volume than traditional rigid modules. The station will be serviced by Sierra Space\'s Dream Chaser spaceplane and other commercial vehicles.',
  },
  {
    id: 'starlab',
    name: 'Starlab',
    developer: 'Starlab Space (Voyager Space / Airbus)',
    partners: ['Voyager Space', 'Airbus Defence and Space', 'Mitsubishi Corporation', 'MDA Space'],
    status: 'development',
    fundingSource: 'NASA CLD award ($217.5M) + Airbus/Voyager funding',
    estimatedCost: '$2-3B estimated',
    targetLaunch: '2028',
    crewCapacity: 4,
    pressurizedVolume: '~340 m3',
    orbit: 'LEO (~400 km)',
    launchVehicle: 'SpaceX Starship (single launch)',
    capabilities: [
      'Single-launch deployment on Starship',
      'George Washington Carver Science Park',
      'Regenerative ECLSS (life support)',
      'Canadarm-heritage robotic arm (MDA)',
      'Open architecture for international partners',
      'Continuous crewed operations',
      'Modular payload accommodation',
    ],
    nasaCLD: true,
    description: 'Starlab is a commercial space station being developed by Starlab Space, a joint venture between Voyager Space and Airbus Defence and Space. It was awarded $217.5 million by NASA under the CLD program. The station is designed for single-launch deployment aboard a SpaceX Starship, which would deliver the entire station to orbit in one mission. Starlab features an integrated design with the "George Washington Carver Science Park" for research, and a robotic arm developed by MDA Space (the Canadian company behind Canadarm). Mitsubishi Corporation joined the partnership to bring Japanese expertise and international partnerships.',
  },
];

// ────────────────────────────────────────
// Data - Current Crews
// ────────────────────────────────────────

const CURRENT_CREW: CrewMember[] = [
  // ISS Expedition 72/73
  { name: 'Sunita Williams', nationality: 'United States', agency: 'NASA', role: 'Commander', station: 'ISS', mission: 'Crew Flight Test / Expedition 72', launchDate: 'Jun 2024', expectedReturn: 'Early 2025' },
  { name: 'Butch Wilmore', nationality: 'United States', agency: 'NASA', role: 'Flight Engineer', station: 'ISS', mission: 'Crew Flight Test / Expedition 72', launchDate: 'Jun 2024', expectedReturn: 'Early 2025' },
  { name: 'Don Pettit', nationality: 'United States', agency: 'NASA', role: 'Flight Engineer', station: 'ISS', mission: 'Expedition 72 (Soyuz MS-26)', launchDate: 'Sep 2024', expectedReturn: 'Mar 2025' },
  { name: 'Aleksandr Gorbunov', nationality: 'Russia', agency: 'Roscosmos', role: 'Flight Engineer', station: 'ISS', mission: 'SpaceX Crew-9', launchDate: 'Sep 2024', expectedReturn: 'Feb 2025' },
  { name: 'Nick Hague', nationality: 'United States', agency: 'NASA', role: 'Flight Engineer', station: 'ISS', mission: 'SpaceX Crew-9', launchDate: 'Sep 2024', expectedReturn: 'Feb 2025' },
  { name: 'Alexey Ovchinin', nationality: 'Russia', agency: 'Roscosmos', role: 'Flight Engineer', station: 'ISS', mission: 'Soyuz MS-26', launchDate: 'Sep 2024', expectedReturn: 'Mar 2025' },
  { name: 'Ivan Vagner', nationality: 'Russia', agency: 'Roscosmos', role: 'Flight Engineer', station: 'ISS', mission: 'Soyuz MS-26', launchDate: 'Sep 2024', expectedReturn: 'Mar 2025' },
  // Tiangong - Shenzhou-19
  { name: 'Cai Xuzhe', nationality: 'China', agency: 'CMSA', role: 'Commander', station: 'Tiangong', mission: 'Shenzhou-19', launchDate: 'Oct 2024', expectedReturn: 'Apr 2025' },
  { name: 'Song Lingdong', nationality: 'China', agency: 'CMSA', role: 'Flight Engineer', station: 'Tiangong', mission: 'Shenzhou-19', launchDate: 'Oct 2024', expectedReturn: 'Apr 2025' },
  { name: 'Wang Haoze', nationality: 'China', agency: 'CMSA', role: 'Payload Specialist', station: 'Tiangong', mission: 'Shenzhou-19', launchDate: 'Oct 2024', expectedReturn: 'Apr 2025' },
];

const CREW_ROTATIONS: CrewRotation[] = [
  { mission: 'SpaceX Crew-9', station: 'ISS', vehicle: 'Crew Dragon', launchDate: 'Sep 2024', status: 'current', crew: ['Nick Hague', 'Aleksandr Gorbunov'] },
  { mission: 'Soyuz MS-26', station: 'ISS', vehicle: 'Soyuz', launchDate: 'Sep 2024', status: 'current', crew: ['Alexey Ovchinin', 'Ivan Vagner', 'Don Pettit'] },
  { mission: 'Shenzhou-19', station: 'Tiangong', vehicle: 'Shenzhou', launchDate: 'Oct 2024', status: 'current', crew: ['Cai Xuzhe', 'Song Lingdong', 'Wang Haoze'] },
  { mission: 'SpaceX Crew-10', station: 'ISS', vehicle: 'Crew Dragon', launchDate: 'Early 2025', status: 'upcoming', crew: ['Anne McClain', 'Nichole Ayers', 'Takuya Onishi', 'Kirill Peskov'] },
  { mission: 'Soyuz MS-27', station: 'ISS', vehicle: 'Soyuz', launchDate: 'Mar 2025', status: 'upcoming', crew: ['TBD (3 crew)'] },
  { mission: 'Shenzhou-20', station: 'Tiangong', vehicle: 'Shenzhou', launchDate: 'Apr 2025', status: 'upcoming', crew: ['TBD (3 crew)'] },
  { mission: 'SpaceX Crew-11', station: 'ISS', vehicle: 'Crew Dragon', launchDate: 'Mid 2025', status: 'planned', crew: ['TBD (4 crew)'] },
  { mission: 'Soyuz MS-28', station: 'ISS', vehicle: 'Soyuz', launchDate: 'Sep 2025', status: 'planned', crew: ['TBD (3 crew)'] },
  { mission: 'Shenzhou-21', station: 'Tiangong', vehicle: 'Shenzhou', launchDate: 'Oct 2025', status: 'planned', crew: ['TBD (3 crew)'] },
  { mission: 'Axiom-4 (Ax-4)', station: 'ISS', vehicle: 'Crew Dragon', launchDate: '2025', status: 'planned', crew: ['Peggy Whitson (Cmdr)', '3 private astronauts'] },
];

// ────────────────────────────────────────
// Data - ISS Transition / CLD Program
// ────────────────────────────────────────

interface CLDMilestone {
  date: string;
  event: string;
  details: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'planned';
}

const CLD_MILESTONES: CLDMilestone[] = [
  { date: 'Dec 2021', event: 'CLD Phase 1 Awards', details: 'NASA awarded $415.6M to three companies: Blue Origin ($130M), Nanoracks/Voyager ($160M), Northrop Grumman ($125.6M)', status: 'completed' },
  { date: '2022', event: 'Nanoracks/Voyager recompeted as Starlab', details: 'Voyager Space partnered with Airbus, later forming Starlab Space JV. Northrop Grumman exited, Axiom Space entered.', status: 'completed' },
  { date: 'Jan 2023', event: 'Axiom CLD Award', details: 'Axiom Space received $228M NASA CLD funding for their commercial station concept', status: 'completed' },
  { date: '2023-2024', event: 'CLD Phase 1 Development', details: 'Continued design maturation, systems definition reviews, and preliminary design reviews for all CLD partners', status: 'completed' },
  { date: '2025-2026', event: 'CLD Critical Design Reviews', details: 'CLD providers undergo critical design reviews; NASA evaluates readiness for Phase 2 certification', status: 'in-progress' },
  { date: '2026-2027', event: 'First Commercial Modules Launch', details: 'Axiom Hab 1 module attaches to ISS; Vast Haven-1 targets independent orbit', status: 'upcoming' },
  { date: '2028', event: 'Starlab & Orbital Reef Launches', details: 'Second wave of commercial stations target initial operational capability', status: 'planned' },
  { date: '2030', event: 'ISS Decommissioning', details: 'NASA plans controlled deorbit of ISS into remote South Pacific (Point Nemo). SpaceX awarded ~$843M for deorbit vehicle.', status: 'planned' },
  { date: '2030+', event: 'Full Commercial LEO Operations', details: 'NASA transitions to purchasing services from commercial stations rather than operating its own facility', status: 'planned' },
];

interface TransitionRisk {
  category: string;
  risk: string;
  mitigation: string;
  severity: 'high' | 'medium' | 'low';
}

const TRANSITION_RISKS: TransitionRisk[] = [
  { category: 'Capability Gap', risk: 'Commercial stations may not be operational before ISS retirement in 2030', mitigation: 'NASA extended ISS to 2030; multiple CLD providers reduce single-point failures', severity: 'high' },
  { category: 'Research Continuity', risk: 'Loss of continuous microgravity research capability during transition', mitigation: 'Overlapping ISS operations with early commercial station deployments (Axiom modules on ISS)', severity: 'high' },
  { category: 'International Partners', risk: 'Partner nations may lose crew access during gap period', mitigation: 'Commercial stations offer sovereign astronaut programs; ESA/JAXA investing in Starlab', severity: 'medium' },
  { category: 'Budget', risk: 'ISS costs ~$3-4B/year; commercial services must be more cost-effective', mitigation: 'NASA targets ~$1B/year for commercial LEO services vs. current ISS operating costs', severity: 'medium' },
  { category: 'Technical Readiness', risk: 'New stations may face development delays (common in aerospace)', mitigation: 'Three independent CLD providers plus Vast self-funded effort provide redundancy', severity: 'high' },
  { category: 'Deorbit Safety', risk: 'Controlled ISS deorbit is an unprecedented engineering challenge (~420 tonnes)', mitigation: 'SpaceX awarded $843M contract for purpose-built deorbit vehicle; extensive planning underway', severity: 'medium' },
];

// ────────────────────────────────────────
// Status Styling
// ────────────────────────────────────────

const STATUS_STYLES: Record<StationStatus, { label: string; color: string; bg: string; border: string }> = {
  operational: { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/40' },
  assembly: { label: 'Under Assembly', color: 'text-cyan-400', bg: 'bg-cyan-900/30', border: 'border-cyan-500/40' },
  development: { label: 'In Development', color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/40' },
  concept: { label: 'Concept Phase', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-500/40' },
  planned: { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/40' },
};

const ROTATION_STATUS_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  completed: { label: 'Completed', color: 'text-gray-400', bg: 'bg-gray-900/20', dot: 'bg-gray-500' },
  current: { label: 'On Station', color: 'text-green-400', bg: 'bg-green-900/20', dot: 'bg-green-500 animate-pulse' },
  upcoming: { label: 'Upcoming', color: 'text-yellow-400', bg: 'bg-yellow-900/20', dot: 'bg-yellow-500' },
  planned: { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20', dot: 'bg-blue-500' },
};

const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  high: { color: 'text-red-400', bg: 'bg-red-900/20' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  low: { color: 'text-green-400', bg: 'bg-green-900/20' },
};

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
        <div key={stat.label} className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
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
  const statusStyle = STATUS_STYLES[station.status];

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
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
          <div className="text-center px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50">
            <div className="text-cyan-400 font-bold text-xl">{station.currentCrew}</div>
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
          <div key={spec.label} className="rounded-lg bg-slate-900/40 p-2.5">
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
              v.type === 'crew' ? 'bg-cyan-900/20 text-cyan-400 border-cyan-500/30' :
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
            <span key={facility} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs">
              {facility}
            </span>
          ))}
        </div>
      </div>

      {/* Expandable Module List */}
      <button
        onClick={() => setShowModules(!showModules)}
        className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1 mb-2"
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
        <div className="border-t border-slate-700/50 pt-3 mt-2">
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
              <tbody className="divide-y divide-slate-700/30">
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
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-star-300 text-sm leading-relaxed mt-4 border-t border-slate-700/50 pt-4">
        {station.description}
      </p>
    </div>
  );
}

function CommercialStationCard({ station }: { station: CommercialStation }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_STYLES[station.status];

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
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
        <div className="text-center px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50">
          <div className="text-cyan-400 font-bold text-lg">{station.crewCapacity}</div>
          <div className="text-star-400 text-xs">Crew Cap.</div>
        </div>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-slate-900/40 p-2.5">
          <div className="text-star-400 text-xs">Target Launch</div>
          <div className="text-white text-sm font-medium">{station.targetLaunch}</div>
        </div>
        <div className="rounded-lg bg-slate-900/40 p-2.5">
          <div className="text-star-400 text-xs">Funding</div>
          <div className="text-white text-sm font-medium">{station.fundingSource}</div>
        </div>
        {station.pressurizedVolume && (
          <div className="rounded-lg bg-slate-900/40 p-2.5">
            <div className="text-star-400 text-xs">Volume</div>
            <div className="text-white text-sm font-medium">{station.pressurizedVolume}</div>
          </div>
        )}
        {station.launchVehicle && (
          <div className="rounded-lg bg-slate-900/40 p-2.5">
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
            <span key={partner} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
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
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
              {cap}
            </li>
          ))}
        </ul>
        {station.capabilities.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors mt-2"
          >
            {expanded ? 'Show less' : `+${station.capabilities.length - 4} more`}
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-star-300 text-sm leading-relaxed border-t border-slate-700/50 pt-4">
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
    <div className="card border border-slate-700/50 bg-slate-800/50 backdrop-blur overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-white font-bold text-lg">Station Comparison Matrix</h2>
        <p className="text-star-400 text-sm mt-1">Side-by-side comparison of all active and planned space stations</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left p-3 text-star-400 text-xs uppercase tracking-widest min-w-[160px] sticky left-0 bg-slate-800/90 backdrop-blur z-10">Parameter</th>
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
          <tbody className="divide-y divide-slate-700/30">
            {comparisonFields.map((field) => (
              <tr key={field.key} className="hover:bg-slate-700/20 transition-colors">
                <td className="p-3 text-star-400 text-xs uppercase tracking-widest sticky left-0 bg-slate-800/90 backdrop-blur z-10">
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

function CrewTracker() {
  const issCrewCount = CURRENT_CREW.filter((c) => c.station === 'ISS').length;
  const tiangongCrewCount = CURRENT_CREW.filter((c) => c.station === 'Tiangong').length;

  const nationalities = Array.from(new Set(CURRENT_CREW.map((c) => c.nationality)));
  const agencies = Array.from(new Set(CURRENT_CREW.map((c) => c.agency)));

  return (
    <div className="space-y-6">
      {/* Crew Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur text-center">
          <div className="text-white font-bold text-2xl">{CURRENT_CREW.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">Humans in Space</div>
        </div>
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur text-center">
          <div className="text-cyan-400 font-bold text-2xl">{issCrewCount}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">ISS Crew</div>
        </div>
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur text-center">
          <div className="text-amber-400 font-bold text-2xl">{tiangongCrewCount}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">Tiangong Crew</div>
        </div>
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur text-center">
          <div className="text-purple-400 font-bold text-2xl">{nationalities.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest">Nationalities</div>
        </div>
      </div>

      {/* Nationality Breakdown */}
      <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h3 className="text-white font-semibold mb-4">Nationality & Agency Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-star-400 text-xs uppercase tracking-widest mb-3">By Nationality</div>
            {nationalities.map((nat) => {
              const count = CURRENT_CREW.filter((c) => c.nationality === nat).length;
              const pct = (count / CURRENT_CREW.length) * 100;
              return (
                <div key={nat} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-star-200">{nat}</span>
                    <span className="text-white font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-nebula-500 rounded-full"
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
              const count = CURRENT_CREW.filter((c) => c.agency === agency).length;
              const pct = (count / CURRENT_CREW.length) * 100;
              return (
                <div key={agency} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-star-200">{agency}</span>
                    <span className="text-white font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
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
        const crew = CURRENT_CREW.filter((c) => c.station === stationName);
        return (
          <div key={stationName} className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${stationName === 'ISS' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
              {stationName} Current Crew ({crew.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {crew.map((member) => (
                <div key={member.name} className="rounded-lg bg-slate-900/50 border border-slate-700/30 p-3">
                  <div className="text-white font-semibold text-sm">{member.name}</div>
                  <div className="text-star-400 text-xs mt-1">{member.role}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-nebula-400">{member.agency}</span>
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
      <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h3 className="text-white font-bold text-lg mb-4">Crew Rotation Schedule</h3>
        <div className="space-y-3">
          {CREW_ROTATIONS.map((rotation) => {
            const style = ROTATION_STATUS_STYLES[rotation.status];
            return (
              <div key={rotation.mission} className={`rounded-lg ${style.bg} border border-slate-700/30 p-4`}>
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
                    <span key={name} className="px-2 py-0.5 bg-slate-800/50 text-star-200 rounded text-xs">
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

function ISSTransition() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
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
            The program has awarded a combined <span className="text-cyan-400 font-semibold">~$575.5 million</span> across
            three providers (Axiom Space, Blue Origin/Sierra Space, and Voyager Space/Airbus) to develop commercial
            stations that can host NASA astronauts and research alongside paying commercial customers. This public-private
            partnership model aims to reduce NASA&apos;s LEO operational costs from approximately $3-4 billion per year
            (ISS) to an estimated $1 billion per year for purchased services.
          </p>
        </div>
      </div>

      {/* Budget Comparison */}
      <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
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
      <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h3 className="text-white font-bold text-lg mb-6">CLD & ISS Transition Timeline</h3>
        <div className="relative">
          <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 opacity-30" />
          <div className="space-y-5">
            {CLD_MILESTONES.map((milestone) => {
              const dotColor = milestone.status === 'completed' ? 'bg-green-500 border-green-400' :
                milestone.status === 'in-progress' ? 'bg-yellow-500 border-yellow-400 animate-pulse' :
                milestone.status === 'upcoming' ? 'bg-cyan-500 border-cyan-400' :
                'bg-slate-600 border-slate-500';
              const statusLabel = milestone.status === 'completed' ? 'Completed' :
                milestone.status === 'in-progress' ? 'In Progress' :
                milestone.status === 'upcoming' ? 'Upcoming' : 'Planned';
              const statusColor = milestone.status === 'completed' ? 'text-green-400' :
                milestone.status === 'in-progress' ? 'text-yellow-400' :
                milestone.status === 'upcoming' ? 'text-cyan-400' : 'text-blue-400';

              return (
                <div key={milestone.event} className="relative pl-12">
                  <div className={`absolute left-2.5 top-2 w-4 h-4 rounded-full border-2 ${dotColor}`} />
                  <div className="rounded-lg bg-slate-900/40 border border-slate-700/30 p-4">
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
      <div className="card p-5 border border-amber-500/30 bg-amber-900/10 backdrop-blur">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          ISS Deorbit Plan
        </h3>
        <div className="space-y-3 text-star-300 text-sm leading-relaxed">
          <p>
            NASA has contracted <span className="text-white font-semibold">SpaceX</span> for approximately
            <span className="text-cyan-400 font-semibold"> $843 million</span> to develop and build a dedicated
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
      <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h3 className="text-white font-bold text-lg mb-4">Transition Risk Assessment</h3>
        <p className="text-star-300 text-sm mb-4">
          Key risks and mitigations for the transition from ISS to commercial stations.
        </p>
        <div className="space-y-3">
          {TRANSITION_RISKS.map((risk) => {
            const sevStyle = SEVERITY_STYLES[risk.severity];
            return (
              <div key={risk.category} className="rounded-lg bg-slate-900/40 border border-slate-700/30 p-4">
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
      <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h3 className="text-white font-bold text-lg mb-4">CLD Provider Awards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Axiom Space', award: '$228M', status: 'Assembly phase', station: 'Axiom Station', notes: 'First modules attach to ISS, then free-fly' },
            { name: 'Blue Origin / Sierra Space', award: '$130M', status: 'Development', station: 'Orbital Reef', notes: 'Mixed-use business park concept with LIFE habitat' },
            { name: 'Voyager Space / Airbus', award: '$217.5M', status: 'Development', station: 'Starlab', notes: 'Single-launch design on SpaceX Starship' },
          ].map((provider) => (
            <div key={provider.name} className="rounded-lg bg-slate-900/50 border border-slate-700/30 p-4">
              <div className="text-white font-semibold mb-1">{provider.name}</div>
              <div className="text-cyan-400 font-bold text-lg mb-2">{provider.award}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Station</div>
              <div className="text-star-200 text-sm mb-2">{provider.station}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Status</div>
              <div className="text-star-200 text-sm mb-2">{provider.status}</div>
              <p className="text-star-400 text-xs mt-2 border-t border-slate-700/30 pt-2">{provider.notes}</p>
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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Space Station Tracker"
          subtitle="Comprehensive tracking of active and planned space stations, crew rotations, and the transition to commercial LEO destinations"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Space Station Tracker' },
          ]}
        />

        {/* Hero Stats */}
        <HeroStats />

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
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'active' && (
          <div className="space-y-8">
            {ACTIVE_STATIONS.map((station) => (
              <ActiveStationCard key={station.id} station={station} />
            ))}
          </div>
        )}

        {activeTab === 'commercial' && (
          <div className="space-y-6">
            <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-6">
              <h2 className="text-white font-bold text-lg mb-3">Next-Generation Commercial Space Stations</h2>
              <p className="text-star-300 text-sm leading-relaxed">
                As the ISS approaches its planned retirement around 2030, a new generation of commercial space stations
                is being developed to ensure continued human presence and research capability in low Earth orbit. NASA&apos;s
                Commercial LEO Destinations (CLD) program is funding three station concepts, while Vast is self-funding
                Haven-1 as a pathfinder for larger stations.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {COMMERCIAL_STATIONS.map((station) => (
                <CommercialStationCard key={station.id} station={station} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'comparison' && <ComparisonTable />}

        {activeTab === 'crew' && <CrewTracker />}

        {activeTab === 'transition' && <ISSTransition />}

        {/* Related Modules */}
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/lunar-gateway" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Lunar Gateway
            </Link>
            <Link href="/debris-monitor" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Debris Monitor
            </Link>
            <Link href="/launch-windows" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Launch Windows
            </Link>
            <Link href="/space-tourism" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Tourism
            </Link>
            <Link href="/constellations" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Constellations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
