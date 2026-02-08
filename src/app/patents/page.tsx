'use client';

import { useState, useEffect, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'dashboard' | 'portfolios' | 'trends' | 'nasa';

interface PatentHolder {
  id: string;
  name: string;
  country: string;
  portfolioSize: number;
  recentFilings: number; // last 2 years
  citationCount: number;
  keyAreas: string[];
  trend: 'up' | 'stable' | 'down';
  trendPct: number;
  description: string;
  notablePatents: string[];
}

interface TechCategory {
  id: string;
  name: string;
  color: string;
  totalPatents: number;
  growthRate: number; // annual %
  recentFilings: number; // last 2 years
  topHolders: string[];
  description: string;
  emergingSubfields: string[];
  acceleration: 'high' | 'moderate' | 'steady' | 'declining';
}

interface FilingsByYear {
  year: number;
  total: number;
  us: number;
  china: number;
  europe: number;
  japan: number;
  other: number;
}

interface NASAPatent {
  id: string;
  title: string;
  center: string;
  category: string;
  patentNumber: string;
  year: number;
  description: string;
  licensable: boolean;
  status: 'active' | 'available' | 'licensed' | 'expired';
}

interface LitigationCase {
  id: string;
  title: string;
  parties: string;
  year: number;
  status: 'settled' | 'ongoing' | 'dismissed' | 'decided';
  category: string;
  summary: string;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const FILINGS_BY_YEAR: FilingsByYear[] = [
  { year: 2015, total: 28400, us: 11200, china: 6800, europe: 5100, japan: 2900, other: 2400 },
  { year: 2016, total: 30100, us: 11800, china: 7600, europe: 5300, japan: 2800, other: 2600 },
  { year: 2017, total: 32500, us: 12400, china: 8700, europe: 5500, japan: 2700, other: 3200 },
  { year: 2018, total: 35200, us: 13100, china: 10100, europe: 5600, japan: 2800, other: 3600 },
  { year: 2019, total: 38400, us: 13800, china: 12200, europe: 5700, japan: 2700, other: 4000 },
  { year: 2020, total: 41100, us: 14200, china: 14100, europe: 5900, japan: 2600, other: 4300 },
  { year: 2021, total: 44800, us: 14900, china: 16500, europe: 6100, japan: 2700, other: 4600 },
  { year: 2022, total: 48200, us: 15600, china: 18400, europe: 6300, japan: 2800, other: 5100 },
  { year: 2023, total: 52100, us: 16200, china: 20800, europe: 6500, japan: 2900, other: 5700 },
  { year: 2024, total: 56300, us: 17100, china: 23100, europe: 6700, japan: 3000, other: 6400 },
  { year: 2025, total: 58900, us: 17600, china: 24600, europe: 6800, japan: 3100, other: 6800 },
];

const PATENT_HOLDERS: PatentHolder[] = [
  {
    id: 'boeing',
    name: 'Boeing',
    country: 'USA',
    portfolioSize: 4280,
    recentFilings: 620,
    citationCount: 38500,
    keyAreas: ['Satellite Systems', 'Launch Vehicles', 'Space Stations', 'Autonomous Guidance'],
    trend: 'stable',
    trendPct: 2.1,
    description: 'Boeing maintains one of the largest space patent portfolios, covering satellite communications, Starliner crew systems, SLS components, and ISS technologies. Strong in structural design and avionics.',
    notablePatents: ['Starliner docking mechanism', 'SLS cryo propulsion management', 'Wideband Global SATCOM antenna'],
  },
  {
    id: 'lockheed',
    name: 'Lockheed Martin',
    country: 'USA',
    portfolioSize: 3950,
    recentFilings: 580,
    citationCount: 34200,
    keyAreas: ['Missile Defense', 'Satellite Buses', 'Deep Space Navigation', 'Space Optics'],
    trend: 'up',
    trendPct: 5.4,
    description: 'Lockheed Martin holds significant IP in military satellite systems, the Orion spacecraft, GPS III, and advanced optics. Increasing filings in hypersonic and cislunar technologies.',
    notablePatents: ['Orion heat shield composition', 'GPS III digital payload', 'A2100 satellite bus architecture'],
  },
  {
    id: 'spacex',
    name: 'SpaceX',
    country: 'USA',
    portfolioSize: 890,
    recentFilings: 310,
    citationCount: 8700,
    keyAreas: ['Reusable Vehicles', 'Satellite Constellations', 'Propulsion', 'Landing Systems'],
    trend: 'up',
    trendPct: 22.5,
    description: 'SpaceX relies heavily on trade secrets but has been increasing patent filings, particularly around Starlink constellation management, Raptor engine components, and Starship heat shield tiles.',
    notablePatents: ['Autonomous drone ship landing platform', 'Phased array satellite antenna', 'Grid fin steering system'],
  },
  {
    id: 'northrop',
    name: 'Northrop Grumman',
    country: 'USA',
    portfolioSize: 3420,
    recentFilings: 490,
    citationCount: 28900,
    keyAreas: ['Solid Rocket Motors', 'Space Sensors', 'In-Orbit Servicing', 'Spacecraft Autonomy'],
    trend: 'up',
    trendPct: 6.8,
    description: 'Northrop Grumman (including legacy Orbital ATK IP) holds extensive patents in solid propulsion, MEV in-orbit servicing, James Webb Space Telescope components, and military space systems.',
    notablePatents: ['Mission Extension Vehicle docking system', 'Solid rocket motor grain design', 'Pegasus air-launch mechanism'],
  },
  {
    id: 'airbus',
    name: 'Airbus Defence & Space',
    country: 'Europe',
    portfolioSize: 3180,
    recentFilings: 440,
    citationCount: 26400,
    keyAreas: ['Telecom Satellites', 'Earth Observation', 'Launch Systems', 'Space Structures'],
    trend: 'stable',
    trendPct: 3.2,
    description: 'Airbus holds major IP in OneSat flexible satellite platforms, Ariane launch vehicles, Sentinel EO instruments, and European space station modules (Columbus, Bartolomeo).',
    notablePatents: ['OneSat software-defined payload', 'Ariane 6 cryogenic upper stage', 'Copernicus Sentinel SAR antenna'],
  },
  {
    id: 'raytheon',
    name: 'RTX (Raytheon)',
    country: 'USA',
    portfolioSize: 2870,
    recentFilings: 380,
    citationCount: 22100,
    keyAreas: ['Space Sensors', 'Missile Warning', 'Satellite Comms', 'Electro-Optical Systems'],
    trend: 'stable',
    trendPct: 2.8,
    description: 'RTX (formerly Raytheon Technologies) holds patents through its Collins Aerospace and Raytheon Intelligence & Space divisions. Strong in sensors, missile warning, and Pratt & Whitney propulsion.',
    notablePatents: ['Next-gen overhead persistent infrared sensor', 'Advanced EHF satellite payload', 'RL10 engine turbopump'],
  },
  {
    id: 'thales',
    name: 'Thales Alenia Space',
    country: 'Europe',
    portfolioSize: 2240,
    recentFilings: 320,
    citationCount: 18600,
    keyAreas: ['Telecom Payloads', 'Navigation Satellites', 'Pressurized Modules', 'Earth Observation'],
    trend: 'stable',
    trendPct: 3.5,
    description: 'Thales Alenia Space is a major patent holder in European navigation (Galileo), telecom payload technologies, space habitat pressurized modules, and Copernicus environmental monitoring instruments.',
    notablePatents: ['Galileo navigation signal generator', 'Spacebus NEO platform', 'HALO module life support'],
  },
  {
    id: 'casc',
    name: 'CASC / CAST',
    country: 'China',
    portfolioSize: 5100,
    recentFilings: 1840,
    citationCount: 15200,
    keyAreas: ['Launch Vehicles', 'Space Stations', 'Lunar Exploration', 'BeiDou Navigation'],
    trend: 'up',
    trendPct: 28.4,
    description: 'China Aerospace Science and Technology Corporation has surged in patent filings, driven by the Long March vehicle family, Tiangong space station, BeiDou navigation system, and Chang\'e lunar programs.',
    notablePatents: ['Long March 5 cryogenic engine', 'Tiangong docking mechanism', 'BeiDou-3 inter-satellite link'],
  },
  {
    id: 'blue-origin',
    name: 'Blue Origin',
    country: 'USA',
    portfolioSize: 620,
    recentFilings: 240,
    citationCount: 4100,
    keyAreas: ['Reusable Launch', 'Lunar Landers', 'Propulsion', 'Space Habitats'],
    trend: 'up',
    trendPct: 18.2,
    description: 'Blue Origin has been steadily building its patent portfolio around BE-4 and BE-7 engines, New Glenn reusability features, Blue Moon lunar lander systems, and Orbital Reef station technologies.',
    notablePatents: ['BE-4 oxygen-rich staged combustion cycle', 'Vertical landing guidance algorithm', 'Blue Moon cargo descent stage'],
  },
  {
    id: 'nasa',
    name: 'NASA',
    country: 'USA',
    portfolioSize: 3600,
    recentFilings: 280,
    citationCount: 52000,
    keyAreas: ['Propulsion', 'Life Support', 'Materials Science', 'Remote Sensing', 'Robotics'],
    trend: 'stable',
    trendPct: 1.5,
    description: 'NASA holds ~3,600 active patents across all space technology domains. Its Technology Transfer Program makes over 1,200 patents available for licensing, driving commercial spinoffs.',
    notablePatents: ['Space Launch System RS-25 improvements', 'MOXIE oxygen extraction', 'Ingenuity rotor blade design'],
  },
  {
    id: 'jaxa-mitsubishi',
    name: 'JAXA / MHI',
    country: 'Japan',
    portfolioSize: 1680,
    recentFilings: 210,
    citationCount: 14800,
    keyAreas: ['H3 Launch Vehicle', 'Asteroid Sample Return', 'Ion Propulsion', 'Space Robotics'],
    trend: 'stable',
    trendPct: 3.1,
    description: 'JAXA and Mitsubishi Heavy Industries hold joint and individual patents across the H3 launch vehicle, Hayabusa asteroid exploration, ion engine technology, and ISS experiment modules.',
    notablePatents: ['H3 LE-9 expander bleed cycle engine', 'Hayabusa2 sample collection horn', 'HTV cargo berthing mechanism'],
  },
  {
    id: 'isro',
    name: 'ISRO',
    country: 'India',
    portfolioSize: 820,
    recentFilings: 190,
    citationCount: 5200,
    keyAreas: ['Low-Cost Launch', 'Remote Sensing', 'Navigation', 'Cryogenic Propulsion'],
    trend: 'up',
    trendPct: 14.3,
    description: 'ISRO has been accelerating patent filings around cost-effective satellite technologies, GSLV cryogenic stages, NavIC navigation, and small satellite launch vehicles (SSLV).',
    notablePatents: ['GSLV CE-20 cryogenic engine', 'Chandrayaan-3 soft landing algorithm', 'SSLV kick stage design'],
  },
  {
    id: 'l3harris',
    name: 'L3Harris Technologies',
    country: 'USA',
    portfolioSize: 2150,
    recentFilings: 310,
    citationCount: 17400,
    keyAreas: ['Electro-Optical', 'RF Systems', 'Resilient Comms', 'Space Domain Awareness'],
    trend: 'up',
    trendPct: 7.2,
    description: 'L3Harris holds substantial IP in space-based electro-optical sensors, responsive satellite bus technologies, weather satellite instruments, and space domain awareness systems.',
    notablePatents: ['Responsive Space payload adapter', 'Vivisat refueling mechanism', 'Advanced weather imager focal plane'],
  },
  {
    id: 'rocket-lab',
    name: 'Rocket Lab',
    country: 'USA',
    portfolioSize: 180,
    recentFilings: 85,
    citationCount: 1200,
    keyAreas: ['Electric Pump Engines', 'Carbon Composite Structures', 'Satellite Platforms', 'Electron Recovery'],
    trend: 'up',
    trendPct: 32.1,
    description: 'Rocket Lab, though smaller, is one of the fastest-growing patent filers in NewSpace. Key IP covers the Rutherford electric pump-fed engine, Electron helicopter recovery, and Photon satellite platform.',
    notablePatents: ['Rutherford electric turbopump cycle', 'Mid-air helicopter stage recovery', 'Photon configurable satellite bus'],
  },
  {
    id: 'esa',
    name: 'ESA / CNES',
    country: 'Europe',
    portfolioSize: 1420,
    recentFilings: 180,
    citationCount: 19800,
    keyAreas: ['Earth Observation', 'Navigation', 'Space Science', 'In-Orbit Servicing'],
    trend: 'stable',
    trendPct: 2.4,
    description: 'ESA and CNES jointly and individually hold patents across Copernicus instruments, Galileo navigation, Ariane propulsion, and ClearSpace debris removal technologies.',
    notablePatents: ['Sentinel-1 C-band SAR antenna', 'Galileo Open Service signal', 'Vega C solid motor casing'],
  },
];

const TECH_CATEGORIES: TechCategory[] = [
  {
    id: 'propulsion',
    name: 'Propulsion Systems',
    color: 'text-orange-400',
    totalPatents: 12400,
    growthRate: 7.2,
    recentFilings: 2100,
    topHolders: ['Boeing', 'Northrop Grumman', 'CASC', 'SpaceX', 'Blue Origin'],
    description: 'Chemical rockets, electric propulsion, nuclear thermal, green propellants, and advanced engine cycles. Fastest growth in methane/LOX full-flow staged combustion and high-power Hall thrusters.',
    emergingSubfields: ['Nuclear thermal propulsion', 'Rotating detonation engines', 'Solar electric propulsion', 'Laser propulsion'],
    acceleration: 'high',
  },
  {
    id: 'satcom',
    name: 'Satellite Communications',
    color: 'text-blue-400',
    totalPatents: 14200,
    growthRate: 9.8,
    recentFilings: 3200,
    topHolders: ['Boeing', 'Airbus', 'Thales', 'SpaceX', 'Lockheed Martin'],
    description: 'Ka-band, V-band, optical inter-satellite links, software-defined payloads, and mega-constellation management. Led by massive Starlink, OneWeb, and Kuiper filings.',
    emergingSubfields: ['Optical inter-satellite links', 'Direct-to-device satellite', 'Regenerative payloads', 'V-band/W-band spectrum'],
    acceleration: 'high',
  },
  {
    id: 'earth-obs',
    name: 'Earth Observation',
    color: 'text-green-400',
    totalPatents: 9800,
    growthRate: 8.4,
    recentFilings: 1900,
    topHolders: ['Airbus', 'Lockheed Martin', 'L3Harris', 'CASC', 'Thales'],
    description: 'SAR, multispectral/hyperspectral imaging, LIDAR, weather instruments, and AI-powered analytics. Growing focus on persistent monitoring and real-time data fusion.',
    emergingSubfields: ['Hyperspectral imaging', 'Methane/GHG detection', 'SAR constellation coherence', 'AI on-board processing'],
    acceleration: 'high',
  },
  {
    id: 'debris',
    name: 'Debris Removal & SSA',
    color: 'text-red-400',
    totalPatents: 2800,
    growthRate: 18.5,
    recentFilings: 820,
    topHolders: ['Northrop Grumman', 'Astroscale', 'ESA/CNES', 'CASC', 'ClearSpace'],
    description: 'Active debris removal, space situational awareness, conjunction analysis, and deorbiting technologies. The fastest-growing category as orbital debris concerns intensify.',
    emergingSubfields: ['Magnetic capture systems', 'Laser debris nudging', 'AI collision avoidance', 'Debris-resistant materials'],
    acceleration: 'high',
  },
  {
    id: 'manufacturing',
    name: 'In-Space Manufacturing',
    color: 'text-yellow-400',
    totalPatents: 1900,
    growthRate: 22.3,
    recentFilings: 650,
    topHolders: ['NASA', 'Made In Space (Redwire)', 'Varda Space', 'CASC', 'Airbus'],
    description: 'Additive manufacturing in microgravity, crystal growth, fiber optics production, and pharmaceutical manufacturing. Explosive growth driven by commercial space station plans.',
    emergingSubfields: ['Microgravity pharmaceuticals', 'ZBLAN fiber optics', 'Metal 3D printing in orbit', 'Semiconductor crystal growth'],
    acceleration: 'high',
  },
  {
    id: 'reusable',
    name: 'Reusable Launch Vehicles',
    color: 'text-purple-400',
    totalPatents: 4200,
    growthRate: 11.6,
    recentFilings: 1100,
    topHolders: ['SpaceX', 'Blue Origin', 'CASC', 'Rocket Lab', 'Relativity Space'],
    description: 'Vertical and horizontal landing, thermal protection, propulsive return, fairings recovery, and stage refurbishment. Dominated by SpaceX Falcon/Starship and Blue Origin New Glenn IP.',
    emergingSubfields: ['Full-flow staged combustion reuse', 'Autonomous recovery vessels', 'Upper stage reusability', 'Methane engine relighting'],
    acceleration: 'moderate',
  },
  {
    id: 'optical-comms',
    name: 'Optical Communications',
    color: 'text-cyan-400',
    totalPatents: 3100,
    growthRate: 24.7,
    recentFilings: 980,
    topHolders: ['NASA', 'SpaceX', 'Mynaric', 'CACI', 'Airbus'],
    description: 'Laser communications (lasercom) for space-to-ground and inter-satellite links. The highest growth rate of any category as mega-constellations adopt optical backhaul.',
    emergingSubfields: ['Deep space optical comms', 'Quantum key distribution', 'Adaptive optics terminals', 'Terabit-class links'],
    acceleration: 'high',
  },
  {
    id: 'life-support',
    name: 'Life Support & Habitation',
    color: 'text-emerald-400',
    totalPatents: 3400,
    growthRate: 6.8,
    recentFilings: 520,
    topHolders: ['NASA', 'Boeing', 'Lockheed Martin', 'Axiom Space', 'Sierra Space'],
    description: 'ECLSS (Environmental Control and Life Support), radiation shielding, habitat structures, food production, and crew health systems. Growing with commercial station development.',
    emergingSubfields: ['Bioregenerative life support', 'In-situ radiation shielding', 'Inflatable habitats', 'Space agriculture'],
    acceleration: 'moderate',
  },
  {
    id: 'isru',
    name: 'ISRU & Resource Utilization',
    color: 'text-amber-400',
    totalPatents: 1600,
    growthRate: 19.8,
    recentFilings: 480,
    topHolders: ['NASA', 'CASC', 'ESA/CNES', 'Lockheed Martin', 'Blue Origin'],
    description: 'In-Situ Resource Utilization including water ice extraction, regolith processing, oxygen production (MOXIE-derived), and propellant manufacturing on Moon/Mars.',
    emergingSubfields: ['Lunar water ice extraction', 'Regolith-based construction', 'Mars atmospheric CO2 processing', 'Asteroid mining extraction'],
    acceleration: 'high',
  },
  {
    id: 'navigation',
    name: 'Navigation & PNT',
    color: 'text-indigo-400',
    totalPatents: 5800,
    growthRate: 5.1,
    recentFilings: 680,
    topHolders: ['Lockheed Martin', 'CASC', 'Thales', 'Northrop Grumman', 'L3Harris'],
    description: 'GPS III, BeiDou, Galileo, and next-generation PNT systems including cislunar navigation, anti-jamming, and alternative navigation for GPS-denied environments.',
    emergingSubfields: ['Cislunar navigation', 'Quantum inertial navigation', 'LEO PNT augmentation', 'Anti-jam/anti-spoof'],
    acceleration: 'steady',
  },
];

const NASA_PATENTS: NASAPatent[] = [
  {
    id: 'nasa-1',
    title: 'High-Performance Spaceflight Computing (HPSC) Processor Architecture',
    center: 'Goddard Space Flight Center',
    category: 'Computing',
    patentNumber: 'US 11,442,868',
    year: 2022,
    description: 'Radiation-hardened multi-core processor architecture enabling 100x computing performance improvement over current flight heritage processors for autonomous spacecraft operations.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-2',
    title: 'MOXIE - Mars Oxygen In-Situ Resource Utilization Experiment',
    center: 'Jet Propulsion Laboratory',
    category: 'ISRU',
    patentNumber: 'US 11,236,001',
    year: 2022,
    description: 'Solid oxide electrolysis system that extracts oxygen from Mars atmospheric CO2. Successfully demonstrated on Perseverance rover, producing oxygen at 98% purity.',
    licensable: true,
    status: 'licensed',
  },
  {
    id: 'nasa-3',
    title: 'Ingenuity Mars Helicopter Rotor Blade Design',
    center: 'Jet Propulsion Laboratory',
    category: 'Aeronautics',
    patentNumber: 'US 11,305,866',
    year: 2022,
    description: 'Ultra-lightweight carbon fiber rotor blade design optimized for flight in Mars thin atmosphere (1% of Earth). Enables powered flight on other planetary bodies.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-4',
    title: 'Laser Communication Relay Demonstration (LCRD) Terminal',
    center: 'Goddard Space Flight Center',
    category: 'Communications',
    patentNumber: 'US 11,588,556',
    year: 2023,
    description: 'Space-qualified optical communication terminal capable of 1.2 Gbps bidirectional data rates between GEO and ground stations, enabling 10-100x improvement over RF links.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-5',
    title: 'X-ray Navigation Autonomous Position System (XNAV)',
    center: 'Goddard Space Flight Center',
    category: 'Navigation',
    patentNumber: 'US 10,859,712',
    year: 2020,
    description: 'Deep space navigation using millisecond pulsar X-ray timing. NICER/SEXTANT demonstrated GPS-like positioning accuracy in deep space without ground-based tracking.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-6',
    title: 'Advanced Composite Solar Sail System (ACS3)',
    center: 'Ames Research Center',
    category: 'Propulsion',
    patentNumber: 'US 11,691,754',
    year: 2023,
    description: 'Composite boom technology enabling deployment of large solar sails for propellantless propulsion. ACS3 demonstrated 80 m2 sail deployment in LEO in 2024.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-7',
    title: 'Orion MPCV Thermal Protection System (AVCOAT)',
    center: 'Johnson Space Center',
    category: 'Materials',
    patentNumber: 'US 11,174,032',
    year: 2021,
    description: 'Advanced ablative thermal protection system for Orion crew module capable of withstanding lunar return reentry speeds of 11 km/s and temperatures exceeding 2,760 C.',
    licensable: false,
    status: 'active',
  },
  {
    id: 'nasa-8',
    title: 'Regolith Advanced Surface Systems Operations Robot (RASSOR)',
    center: 'Kennedy Space Center',
    category: 'Robotics',
    patentNumber: 'US 10,968,590',
    year: 2021,
    description: 'Counter-rotating bucket drum excavator robot designed for lunar and Martian regolith mining. Low-mass design enables efficient excavation in reduced gravity environments.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-9',
    title: 'Shape Memory Alloy Rock Splitter (SMARS)',
    center: 'Glenn Research Center',
    category: 'Mining',
    patentNumber: 'US 11,421,522',
    year: 2022,
    description: 'Nickel-titanium shape memory alloy actuator for splitting rocks and extracting resources on planetary surfaces without explosive or high-energy mechanical systems.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-10',
    title: 'Deep Space Optical Communications (DSOC) Photon-Counting Receiver',
    center: 'Jet Propulsion Laboratory',
    category: 'Communications',
    patentNumber: 'US 11,843,415',
    year: 2023,
    description: 'Superconducting nanowire single-photon detector array for deep space laser communications. Psyche mission DSOC demonstrated 267 Mbps from 33 million km distance.',
    licensable: true,
    status: 'available',
  },
  {
    id: 'nasa-11',
    title: 'Kilopower Fission Reactor for Space Applications',
    center: 'Glenn Research Center',
    category: 'Power',
    patentNumber: 'US 11,183,311',
    year: 2021,
    description: 'Compact fission reactor using HEU-235 and Stirling converters to produce 1-10 kWe of continuous power on planetary surfaces. Foundation for Fission Surface Power project.',
    licensable: false,
    status: 'active',
  },
  {
    id: 'nasa-12',
    title: 'Electrodynamic Dust Shield (EDS)',
    center: 'Kennedy Space Center',
    category: 'Materials',
    patentNumber: 'US 10,722,927',
    year: 2020,
    description: 'Transparent electrode system using traveling electric waves to repel lunar and Martian dust from solar panels, optical surfaces, and habitat windows without mechanical contact.',
    licensable: true,
    status: 'licensed',
  },
];

const LITIGATION_CASES: LitigationCase[] = [
  {
    id: 'lit-1',
    title: 'Blue Origin v. SpaceX (Lunar Lander Patent)',
    parties: 'Blue Origin LLC v. Space Exploration Technologies Corp.',
    year: 2022,
    status: 'dismissed',
    category: 'Propulsion / Landing',
    summary: 'Blue Origin challenged SpaceX patents related to vertical landing on floating platforms. The case was ultimately dismissed, with the court finding sufficient differentiation in the approaches.',
  },
  {
    id: 'lit-2',
    title: 'Boeing v. Launch Vehicles Inc.',
    parties: 'Boeing Company v. Launch Vehicles Inc.',
    year: 2021,
    status: 'settled',
    category: 'Launch Systems',
    summary: 'Patent infringement dispute over rocket fairing separation mechanisms. Settled out of court with cross-licensing agreement.',
  },
  {
    id: 'lit-3',
    title: 'Viasat v. SpaceX (Starlink Interference)',
    parties: 'Viasat Inc. v. FCC / Space Exploration Technologies',
    year: 2023,
    status: 'ongoing',
    category: 'Satellite Communications',
    summary: 'Viasat challenged FCC approval of SpaceX Starlink modifications, citing patent and spectrum interference concerns with its own satellite broadband systems.',
  },
  {
    id: 'lit-4',
    title: 'Maxar v. Planet Labs (Imaging Technology)',
    parties: 'Maxar Technologies v. Planet Labs PBC',
    year: 2023,
    status: 'settled',
    category: 'Earth Observation',
    summary: 'Dispute over satellite imaging data processing algorithms and super-resolution techniques. Resolved through mutual licensing agreement.',
  },
  {
    id: 'lit-5',
    title: 'Iridium v. AST SpaceMobile',
    parties: 'Iridium Communications v. AST SpaceMobile',
    year: 2024,
    status: 'ongoing',
    category: 'Direct-to-Device',
    summary: 'Iridium filed patent claims against AST SpaceMobile regarding direct-to-cellphone satellite communication technology and large phased array antenna deployment methods.',
  },
];

const GEOGRAPHIC_DISTRIBUTION = [
  { country: 'United States', flag: 'US', share: 29.9, totalPatents: 17600, trend: 'stable', color: 'bg-blue-500' },
  { country: 'China', flag: 'CN', share: 41.8, totalPatents: 24600, trend: 'up', color: 'bg-red-500' },
  { country: 'Europe (EPO)', flag: 'EU', share: 11.5, totalPatents: 6800, trend: 'stable', color: 'bg-yellow-500' },
  { country: 'Japan', flag: 'JP', share: 5.3, totalPatents: 3100, trend: 'stable', color: 'bg-pink-500' },
  { country: 'India', flag: 'IN', share: 3.2, totalPatents: 1900, trend: 'up', color: 'bg-green-500' },
  { country: 'South Korea', flag: 'KR', share: 2.1, totalPatents: 1250, trend: 'up', color: 'bg-indigo-500' },
  { country: 'Russia', flag: 'RU', share: 1.8, totalPatents: 1050, trend: 'down', color: 'bg-slate-500' },
  { country: 'Other', flag: 'OT', share: 4.4, totalPatents: 2600, trend: 'up', color: 'bg-gray-500' },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function getTrendIcon(trend: 'up' | 'stable' | 'down'): string {
  switch (trend) {
    case 'up': return 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941';
    case 'down': return 'M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181';
    default: return 'M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75';
  }
}

function getTrendColor(trend: 'up' | 'stable' | 'down'): string {
  switch (trend) {
    case 'up': return 'text-green-400';
    case 'down': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

function getAccelerationBadge(acc: string): { label: string; color: string; bg: string } {
  switch (acc) {
    case 'high': return { label: 'Accelerating', color: 'text-green-400', bg: 'bg-green-500/20' };
    case 'moderate': return { label: 'Growing', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    case 'steady': return { label: 'Steady', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    case 'declining': return { label: 'Declining', color: 'text-red-400', bg: 'bg-red-500/20' };
    default: return { label: acc, color: 'text-slate-400', bg: 'bg-slate-500/20' };
  }
}

function getStatusBadge(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'available': return { label: 'Available', color: 'text-green-400', bg: 'bg-green-500/20' };
    case 'licensed': return { label: 'Licensed', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    case 'active': return { label: 'Active (Restricted)', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    case 'expired': return { label: 'Expired', color: 'text-slate-400', bg: 'bg-slate-500/20' };
    default: return { label: status, color: 'text-slate-400', bg: 'bg-slate-500/20' };
  }
}

function getLitigationBadge(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'settled': return { label: 'Settled', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    case 'ongoing': return { label: 'Ongoing', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    case 'dismissed': return { label: 'Dismissed', color: 'text-slate-400', bg: 'bg-slate-500/20' };
    case 'decided': return { label: 'Decided', color: 'text-green-400', bg: 'bg-green-500/20' };
    default: return { label: status, color: 'text-slate-400', bg: 'bg-slate-500/20' };
  }
}

// ────────────────────────────────────────
// Dashboard Tab
// ────────────────────────────────────────

function DashboardTab({ filingsData, holdersData, categoriesData, litigationData, geoData }: {
  filingsData: FilingsByYear[];
  holdersData: PatentHolder[];
  categoriesData: TechCategory[];
  litigationData: LitigationCase[];
  geoData: any[];
}) {
  const latestYear = filingsData[filingsData.length - 1];
  const prevYear = filingsData[filingsData.length - 2];
  const growthRate = prevYear ? ((latestYear.total - prevYear.total) / prevYear.total * 100).toFixed(1) : '0';
  const totalAllTime = filingsData.reduce((sum, y) => sum + y.total, 0);
  const maxTotal = Math.max(...filingsData.map(f => f.total));
  const topHolder = [...holdersData].sort((a, b) => b.portfolioSize - a.portfolioSize)[0];
  const totalCategories = categoriesData.length;

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{formatNumber(latestYear.total)}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Patents Filed (2025)</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-green-400">+{growthRate}%</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Annual Growth</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">{holdersData.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Major Holders Tracked</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-purple-400">{totalCategories}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Technology Domains</div>
        </div>
      </div>

      {/* Filing Trends Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-nebula-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Global Space Patent Filings by Year
        </h3>
        <p className="text-slate-400 text-sm mb-6">Annual patent applications across all space technology domains</p>

        <div className="flex items-end gap-2 h-56">
          {filingsData.map((item) => {
            const heightPct = (item.total / maxTotal) * 100;
            const isLatest = item.year === latestYear.year;
            return (
              <div key={item.year} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-medium text-slate-400">
                  {(item.total / 1000).toFixed(1)}k
                </div>
                <div className="w-full flex justify-center">
                  <div
                    className={`w-full max-w-[44px] rounded-t-md transition-all duration-500 ${
                      isLatest
                        ? 'bg-gradient-to-t from-nebula-600 to-nebula-400'
                        : 'bg-gradient-to-t from-slate-300 to-slate-200'
                    }`}
                    style={{ height: `${heightPct * 1.8}px` }}
                  />
                </div>
                <div className="text-xs text-slate-400 font-medium">{item.year}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Cumulative: ~{formatNumber(totalAllTime)} filings tracked since 2015
          </span>
          <span className="text-xs text-slate-400">
            Source: WIPO, USPTO, CNIPA, EPO estimates
          </span>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          Patent Filings by Country/Region (2025)
        </h3>
        <p className="text-slate-400 text-sm mb-4">Market share of space technology patent applications</p>

        <div className="space-y-3">
          {geoData.map((geo) => (
            <div key={geo.flag} className="flex items-center gap-4">
              <div className="w-32 text-sm text-slate-900 font-medium truncate">{geo.country}</div>
              <div className="flex-1">
                <div className="w-full bg-slate-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full ${geo.color} opacity-70 transition-all duration-700`}
                    style={{ width: `${(geo.share / 42) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-slate-700">
                    {geo.share}% ({formatNumber(geo.totalPatents)})
                  </span>
                </div>
              </div>
              <div className="w-16 text-right">
                <svg className={`w-4 h-4 inline ${getTrendColor(geo.trend as 'up' | 'stable' | 'down')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTrendIcon(geo.trend as 'up' | 'stable' | 'down')} />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/50">
          <p className="text-xs text-slate-500">
            China has overtaken the US in raw filing volume since 2020, driven by state-sponsored programs (BeiDou, Tiangong, Chang&apos;e). The US leads in citation impact and international PCT filings.
          </p>
        </div>
      </div>

      {/* Technology Category Overview */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Technology Category Breakdown</h3>
        <p className="text-slate-400 text-sm mb-4">Patent distribution across space technology domains</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...categoriesData].sort((a, b) => b.totalPatents - a.totalPatents).map((cat) => {
            const accBadge = getAccelerationBadge(cat.acceleration);
            return (
              <div key={cat.id} className="bg-slate-50/50 border border-slate-200/50 rounded-lg p-4 hover:border-nebula-500/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium text-sm ${cat.color}`}>{cat.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${accBadge.color} ${accBadge.bg}`}>
                    {accBadge.label}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">{formatNumber(cat.totalPatents)}</div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="text-green-400 font-medium">+{cat.growthRate}% YoY</span>
                  <span>{formatNumber(cat.recentFilings)} recent</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Patent Holders Quick View */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Top Patent Holders</h3>
        <p className="text-slate-400 text-sm mb-4">Ranked by total portfolio size</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Rank</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Organization</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Portfolio Size</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Recent (2yr)</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Citations</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {[...holdersData]
                .sort((a, b) => b.portfolioSize - a.portfolioSize)
                .slice(0, 10)
                .map((holder, idx) => (
                  <tr key={holder.id} className="border-b border-slate-200/50 hover:bg-slate-100/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">#{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{holder.name}</div>
                      <div className="text-xs text-slate-400">{holder.country}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">{formatNumber(holder.portfolioSize)}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatNumber(holder.recentFilings)}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatNumber(holder.citationCount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <svg className={`w-4 h-4 ${getTrendColor(holder.trend)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTrendIcon(holder.trend)} />
                        </svg>
                        <span className={`text-xs font-medium ${getTrendColor(holder.trend)}`}>
                          {holder.trendPct > 0 ? '+' : ''}{holder.trendPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Litigation Highlights */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
          </svg>
          Notable IP Litigation
        </h3>
        <p className="text-slate-400 text-sm mb-4">Recent and ongoing space technology patent disputes</p>

        <div className="space-y-3">
          {litigationData.map((lcase) => {
            const badge = getLitigationBadge(lcase.status);
            return (
              <div key={lcase.id} className="bg-slate-50/50 border border-slate-200/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">{lcase.title}</h4>
                    <div className="text-xs text-slate-400">{lcase.parties}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-400">{lcase.year}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.color} ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{lcase.summary}</p>
                <div className="mt-2">
                  <span className="text-xs text-nebula-300">{lcase.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Company Portfolios Tab
// ────────────────────────────────────────

function PortfoliosTab({ holdersData }: { holdersData: PatentHolder[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'portfolio' | 'recent' | 'citations' | 'growth'>('portfolio');
  const [countryFilter, setCountryFilter] = useState('');

  const countries = useMemo(() => {
    return Array.from(new Set(holdersData.map(h => h.country))).sort();
  }, [holdersData]);

  const filtered = useMemo(() => {
    let result = [...holdersData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.keyAreas.some(a => a.toLowerCase().includes(q)) ||
        h.description.toLowerCase().includes(q)
      );
    }

    if (countryFilter) {
      result = result.filter(h => h.country === countryFilter);
    }

    switch (sortBy) {
      case 'portfolio':
        result.sort((a, b) => b.portfolioSize - a.portfolioSize);
        break;
      case 'recent':
        result.sort((a, b) => b.recentFilings - a.recentFilings);
        break;
      case 'citations':
        result.sort((a, b) => b.citationCount - a.citationCount);
        break;
      case 'growth':
        result.sort((a, b) => b.trendPct - a.trendPct);
        break;
    }

    return result;
  }, [searchQuery, sortBy, countryFilter, holdersData]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search organizations, technologies..."
                className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Country</label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'portfolio' | 'recent' | 'citations' | 'growth')}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="portfolio">Portfolio Size</option>
              <option value="recent">Recent Filings</option>
              <option value="citations">Citation Count</option>
              <option value="growth">Growth Rate</option>
            </select>
          </div>

          {(searchQuery || countryFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setCountryFilter(''); }}
              className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-slate-400 mb-2">
        Showing {filtered.length} of {holdersData.length} organizations
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((holder) => (
          <CompanyPortfolioCard key={holder.id} holder={holder} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Organizations Found</h2>
          <p className="text-slate-400">No patent holders match your current filters.</p>
        </div>
      )}
    </div>
  );
}

function CompanyPortfolioCard({ holder }: { holder: PatentHolder }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card p-5 hover:border-nebula-500/30 transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900 truncate">{holder.name}</h4>
            <svg className={`w-4 h-4 flex-shrink-0 ${getTrendColor(holder.trend)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTrendIcon(holder.trend)} />
            </svg>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">{holder.country}</span>
            <span className={`text-xs font-medium ${getTrendColor(holder.trend)}`}>
              {holder.trendPct > 0 ? '+' : ''}{holder.trendPct}% growth
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-2xl font-bold text-slate-900">{formatNumber(holder.portfolioSize)}</div>
          <div className="text-xs text-slate-400">Patents</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-slate-50/50 rounded-lg p-2.5 text-center">
          <div className="text-slate-900 font-bold text-sm">{formatNumber(holder.recentFilings)}</div>
          <div className="text-slate-400 text-xs">Recent (2yr)</div>
        </div>
        <div className="bg-slate-50/50 rounded-lg p-2.5 text-center">
          <div className="text-slate-900 font-bold text-sm">{formatNumber(holder.citationCount)}</div>
          <div className="text-slate-400 text-xs">Citations</div>
        </div>
        <div className="bg-slate-50/50 rounded-lg p-2.5 text-center">
          <div className="text-slate-900 font-bold text-sm">
            {(holder.citationCount / holder.portfolioSize).toFixed(1)}
          </div>
          <div className="text-slate-400 text-xs">Cites/Patent</div>
        </div>
      </div>

      {/* Key Areas */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {holder.keyAreas.map((area) => (
          <span
            key={area}
            className="px-2 py-0.5 bg-nebula-500/10 text-nebula-600 rounded text-xs font-medium"
          >
            {area}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <p className="text-sm text-slate-500 mb-3">{holder.description}</p>

          <div className="mb-3">
            <div className="text-xs text-slate-400 uppercase tracking-widest mb-1.5">Notable Patents</div>
            <ul className="space-y-1">
              {holder.notablePatents.map((patent) => (
                <li key={patent} className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-nebula-400 rounded-full flex-shrink-0" />
                  {patent}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Technology Trends Tab
// ────────────────────────────────────────

function TrendsTab({ categoriesData, filingsData }: { categoriesData: TechCategory[]; filingsData: FilingsByYear[] }) {
  const [sortBy, setSortBy] = useState<'patents' | 'growth' | 'recent'>('patents');

  const sorted = useMemo(() => {
    const result = [...categoriesData];
    switch (sortBy) {
      case 'patents':
        result.sort((a, b) => b.totalPatents - a.totalPatents);
        break;
      case 'growth':
        result.sort((a, b) => b.growthRate - a.growthRate);
        break;
      case 'recent':
        result.sort((a, b) => b.recentFilings - a.recentFilings);
        break;
    }
    return result;
  }, [sortBy, categoriesData]);

  const maxPatents = Math.max(...categoriesData.map(c => c.totalPatents));

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">
            {formatNumber(categoriesData.reduce((s, c) => s + c.totalPatents, 0))}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Categorized</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-green-400">
            {categoriesData.filter(c => c.acceleration === 'high').length}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Accelerating Fields</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-cyan-400">
            +{Math.max(...categoriesData.map(c => c.growthRate)).toFixed(1)}%
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Fastest Growth</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-purple-400">
            {formatNumber(categoriesData.reduce((s, c) => s + c.recentFilings, 0))}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Filed Last 2 Years</div>
        </div>
      </div>

      {/* Sort Control */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Technology Domain Analysis</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'patents' | 'growth' | 'recent')}
          className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
        >
          <option value="patents">Sort by Total Patents</option>
          <option value="growth">Sort by Growth Rate</option>
          <option value="recent">Sort by Recent Activity</option>
        </select>
      </div>

      {/* Category Cards */}
      <div className="space-y-4">
        {sorted.map((cat) => {
          const accBadge = getAccelerationBadge(cat.acceleration);
          const barWidth = (cat.totalPatents / maxPatents) * 100;

          return (
            <div key={cat.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-semibold text-lg ${cat.color}`}>{cat.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${accBadge.color} ${accBadge.bg}`}>
                      {accBadge.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 max-w-2xl">{cat.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-6">
                  <div className="text-2xl font-bold text-slate-900">{formatNumber(cat.totalPatents)}</div>
                  <div className="text-xs text-green-400 font-medium">+{cat.growthRate}% YoY</div>
                </div>
              </div>

              {/* Visual Bar */}
              <div className="mb-4">
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-nebula-600 to-nebula-400 transition-all duration-700"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-widest mb-1.5">Top Holders</div>
                  <div className="flex flex-wrap gap-1">
                    {cat.topHolders.map((holder) => (
                      <span key={holder} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {holder}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-widest mb-1.5">Emerging Subfields</div>
                  <ul className="space-y-0.5">
                    {cat.emergingSubfields.map((sub) => (
                      <li key={sub} className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-end">
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="bg-slate-50/50 rounded-lg p-2.5 text-center">
                      <div className="text-slate-900 font-bold text-sm">{formatNumber(cat.recentFilings)}</div>
                      <div className="text-slate-400 text-xs">Last 2yr</div>
                    </div>
                    <div className="bg-slate-50/50 rounded-lg p-2.5 text-center">
                      <div className="text-slate-900 font-bold text-sm">{cat.growthRate}%</div>
                      <div className="text-slate-400 text-xs">Annual Growth</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Country Filing Trends Over Time */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Filing Trends by Country</h3>
        <p className="text-slate-400 text-sm mb-4">How patent filings have shifted across major jurisdictions</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Year</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Total</th>
                <th className="text-right py-3 px-4 text-blue-400 font-medium">US</th>
                <th className="text-right py-3 px-4 text-red-400 font-medium">China</th>
                <th className="text-right py-3 px-4 text-yellow-400 font-medium">Europe</th>
                <th className="text-right py-3 px-4 text-pink-400 font-medium">Japan</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">Other</th>
              </tr>
            </thead>
            <tbody>
              {filingsData.map((year) => (
                <tr key={year.year} className="border-b border-slate-200/50 hover:bg-slate-100/30 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-900">{year.year}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-900">{formatNumber(year.total)}</td>
                  <td className="py-2.5 px-4 text-right text-blue-500">{formatNumber(year.us)}</td>
                  <td className="py-2.5 px-4 text-right text-red-500">{formatNumber(year.china)}</td>
                  <td className="py-2.5 px-4 text-right text-yellow-600">{formatNumber(year.europe)}</td>
                  <td className="py-2.5 px-4 text-right text-pink-500">{formatNumber(year.japan)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-400">{formatNumber(year.other)}</td>
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
// NASA Patents Tab
// ────────────────────────────────────────

function NASATab({ nasaData }: { nasaData: NASAPatent[] }) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const categories = useMemo(() => {
    return Array.from(new Set(nasaData.map(p => p.category))).sort();
  }, [nasaData]);

  const statuses = useMemo(() => {
    return Array.from(new Set(nasaData.map(p => p.status))).sort();
  }, [nasaData]);

  const filtered = useMemo(() => {
    let result = [...nasaData];
    if (categoryFilter) result = result.filter(p => p.category === categoryFilter);
    if (statusFilter) result = result.filter(p => p.status === statusFilter);
    return result;
  }, [categoryFilter, statusFilter, nasaData]);

  const licensableCount = nasaData.filter(p => p.licensable).length;
  const availableCount = nasaData.filter(p => p.status === 'available').length;
  const centers = Array.from(new Set(nasaData.map(p => p.center)));

  return (
    <div className="space-y-8">
      {/* NASA Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">3,600+</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active Patents</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-green-400">1,200+</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Available for License</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">10</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">NASA Centers</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-purple-400">2,000+</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active Licenses</div>
        </div>
      </div>

      {/* NASA Technology Transfer Program */}
      <div className="card p-6 border-l-4 border-l-blue-500">
        <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          NASA Technology Transfer Program
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          NASA&apos;s Technology Transfer Program ensures that innovations developed for space exploration benefit the public through commercial licensing.
          The program has generated over 2,000 spinoff technologies and manages a portfolio of approximately 3,600 active patents across all 10 NASA centers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50/50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-900 mb-1">Startup Licensing</div>
            <p className="text-xs text-slate-400">Free evaluation license for first 3 years for qualifying startups. No upfront fees, only running royalties on commercialization.</p>
          </div>
          <div className="bg-slate-50/50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-900 mb-1">Patent Portfolio</div>
            <p className="text-xs text-slate-400">Technologies span propulsion, materials science, robotics, sensors, life support, software, and medical devices. New patents added monthly.</p>
          </div>
          <div className="bg-slate-50/50 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-900 mb-1">Spinoff Impact</div>
            <p className="text-xs text-slate-400">Over 2,000 documented spinoff technologies. Annual economic impact estimated at $7+ billion across healthcare, agriculture, IT, and manufacturing.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Technology Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {(categoryFilter || statusFilter) && (
            <button
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); }}
              className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Patent Cards */}
      <div className="text-sm text-slate-400 mb-2">
        Showing {filtered.length} of {nasaData.length} highlighted patents
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((patent) => {
          const statusBadge = getStatusBadge(patent.status);
          return (
            <div key={patent.id} className="card p-5 hover:border-nebula-500/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm leading-tight mb-1">{patent.title}</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-nebula-300 font-mono">{patent.patentNumber}</span>
                    <span className="text-xs text-slate-400">{patent.year}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ml-3 ${statusBadge.color} ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-3 leading-relaxed">{patent.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{patent.center}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{patent.category}</span>
                </div>
                {patent.licensable && (
                  <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Licensable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NASA Centers */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">NASA Centers Contributing Patents</h3>
        <p className="text-slate-400 text-sm mb-4">Highlighted patents originate from these NASA field centers</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: 'Jet Propulsion Laboratory', location: 'Pasadena, CA', focus: 'Deep space, robotics, propulsion', patents: 680 },
            { name: 'Goddard Space Flight Center', location: 'Greenbelt, MD', focus: 'Earth science, astrophysics, comms', patents: 520 },
            { name: 'Glenn Research Center', location: 'Cleveland, OH', focus: 'Propulsion, power systems, materials', patents: 410 },
            { name: 'Johnson Space Center', location: 'Houston, TX', focus: 'Human spaceflight, EVA, life support', patents: 390 },
            { name: 'Kennedy Space Center', location: 'Merritt Island, FL', focus: 'Launch systems, ground ops, ISRU', patents: 340 },
            { name: 'Marshall Space Flight Center', location: 'Huntsville, AL', focus: 'SLS, propulsion, ISS systems', patents: 310 },
            { name: 'Langley Research Center', location: 'Hampton, VA', focus: 'Aerodynamics, structures, materials', patents: 280 },
            { name: 'Ames Research Center', location: 'Mountain View, CA', focus: 'AI/ML, thermal protection, astrobiology', patents: 260 },
            { name: 'Stennis Space Center', location: 'Hancock County, MS', focus: 'Engine testing, propulsion validation', patents: 120 },
          ].map((center) => (
            <div key={center.name} className="bg-slate-50/50 border border-slate-200/50 rounded-lg p-4 hover:border-nebula-500/30 transition-colors">
              <div className="font-medium text-slate-900 text-sm mb-0.5">{center.name}</div>
              <div className="text-xs text-slate-400 mb-2">{center.location}</div>
              <div className="text-xs text-slate-500 mb-2">{center.focus}</div>
              <div className="text-xs text-nebula-300 font-medium">~{formatNumber(center.patents)} patents</div>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Transfer Opportunities */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
          High-Value Technology Transfer Opportunities
        </h3>
        <p className="text-slate-400 text-sm mb-4">Promising NASA technologies available for commercial licensing</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              area: 'In-Situ Resource Utilization',
              description: 'MOXIE-derived oxygen extraction and RASSOR excavation technologies applicable to lunar/Mars missions and terrestrial mineral processing.',
              readiness: 'TRL 6-7',
              potential: 'High',
            },
            {
              area: 'Optical Communications',
              description: 'LCRD and DSOC laser communication terminals enabling 10-100x bandwidth improvement for satellite networks and deep space missions.',
              readiness: 'TRL 7-8',
              potential: 'Very High',
            },
            {
              area: 'Advanced Materials',
              description: 'Thermal protection systems, electrodynamic dust shields, and shape memory alloys with applications in extreme environment engineering.',
              readiness: 'TRL 5-7',
              potential: 'High',
            },
            {
              area: 'Space Computing',
              description: 'HPSC radiation-hardened processors and AI/ML flight software enabling autonomous spacecraft operations without ground-in-the-loop.',
              readiness: 'TRL 5-6',
              potential: 'High',
            },
          ].map((opp) => (
            <div key={opp.area} className="bg-slate-50/50 border border-slate-200/50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 text-sm mb-1">{opp.area}</h4>
              <p className="text-xs text-slate-500 mb-2">{opp.description}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-nebula-300">Readiness: {opp.readiness}</span>
                <span className="text-green-400 font-medium">Potential: {opp.potential}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  { id: 'portfolios', label: 'Company Portfolios', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z' },
  { id: 'trends', label: 'Technology Trends', icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' },
  { id: 'nasa', label: 'NASA Patents', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
];

export default function PatentTrackerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  // API-fetched data (overrides module-level consts when available)
  const [filingsData, setFilingsData] = useState<FilingsByYear[]>(FILINGS_BY_YEAR);
  const [holdersData, setHoldersData] = useState<PatentHolder[]>(PATENT_HOLDERS);
  const [categoriesData, setCategoriesData] = useState<TechCategory[]>(TECH_CATEGORIES);
  const [nasaData, setNasaData] = useState<NASAPatent[]>(NASA_PATENTS);
  const [litigationData, setLitigationData] = useState<LitigationCase[]>(LITIGATION_CASES);
  const [geoData, setGeoData] = useState<any[]>(GEOGRAPHIC_DISTRIBUTION);

  useEffect(() => {
    async function loadData() {
      try {
        const [r1, r2, r3, r4, r5, r6] = await Promise.all([
          fetch('/api/content/patents?section=filings-by-year'),
          fetch('/api/content/patents?section=patent-holders'),
          fetch('/api/content/patents?section=tech-categories'),
          fetch('/api/content/patents?section=nasa-patents'),
          fetch('/api/content/patents?section=litigation-cases'),
          fetch('/api/content/patents?section=geographic-distribution'),
        ]);
        const [d1, d2, d3, d4, d5, d6] = await Promise.all([
          r1.json(), r2.json(), r3.json(), r4.json(), r5.json(), r6.json(),
        ]);
        if (d1.data?.length) setFilingsData(d1.data);
        if (d2.data?.length) setHoldersData(d2.data);
        if (d3.data?.length) setCategoriesData(d3.data);
        if (d4.data?.length) setNasaData(d4.data);
        if (d5.data?.length) setLitigationData(d5.data);
        if (d6.data?.length) setGeoData(d6.data);
        setRefreshedAt(d1.meta?.lastRefreshed || null);
      } catch (error) {
        console.error('Failed to load patent data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Patent & IP Tracker"
          subtitle="Monitor space technology patent filings, company portfolios, technology trends, and NASA licensing opportunities"
          icon="📜"
          accentColor="purple"
        />

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />

        {/* Tabs */}
        <div className="border-b border-slate-500/30 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-nebula-500 text-nebula-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                    : 'border-transparent text-slate-200 hover:text-white hover:border-slate-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <DashboardTab filingsData={filingsData} holdersData={holdersData} categoriesData={categoriesData} litigationData={litigationData} geoData={geoData} />}
        {activeTab === 'portfolios' && <PortfoliosTab holdersData={holdersData} />}
        {activeTab === 'trends' && <TrendsTab categoriesData={categoriesData} filingsData={filingsData} />}
        {activeTab === 'nasa' && <NASATab nasaData={nasaData} />}

        {/* Disclaimer */}
        <ScrollReveal>
        <div className="card p-6 mt-8 mb-8 border-dashed">
          <div className="text-center">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">About Patent & IP Tracker</h3>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              Patent data is compiled from USPTO, WIPO, EPO, CNIPA, and other patent office databases.
              Portfolio sizes are approximate and include granted patents, pending applications, and utility models.
              Growth rates and trend indicators are based on filing date analysis over the past 3-5 years.
              This tracker is for informational and research purposes only and does not constitute legal advice.
              Data sources include WIPO Global Brand Database, USPTO PatentsView, Google Patents, and Orbit Intelligence.
            </p>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
