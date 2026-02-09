/**
 * Seed script for Company Intelligence Database
 *
 * Seeds 15-20 major space companies with realistic data including:
 * - Company profiles with detailed metadata
 * - Funding rounds for private companies
 * - Revenue estimates for public companies (from SEC filings)
 * - Key personnel (CEO, CTO)
 * - Notable M&A transactions
 * - Key products (rockets, satellites, services)
 * - Government contract awards
 *
 * Run with: npx tsx scripts/seed-company-intelligence.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CompanySeed {
  name: string;
  legalName?: string;
  ticker?: string;
  headquarters: string;
  foundedDate: string;
  employeeCount?: number;
  employeeCountSource?: string;
  website: string;
  description: string;
  ceo: string;
  cto?: string;
  isPublic: boolean;
  status: string;
  sector: string;
  subsector?: string;
  cageCode?: string;
  samUei?: string;
  fundingRounds?: {
    date: string;
    amount?: number;
    seriesLabel: string;
    roundType: string;
    leadInvestor?: string;
    investors: string[];
    source: string;
  }[];
  revenueEstimates?: {
    year: number;
    quarter?: number;
    revenue?: number;
    revenueRange?: string;
    source: string;
    confidenceLevel: string;
  }[];
  products?: {
    name: string;
    category: string;
    description: string;
    status: string;
  }[];
  personnel?: {
    name: string;
    title: string;
    role: string;
    isCurrent: boolean;
    previousCompanies: string[];
  }[];
}

const companies: CompanySeed[] = [
  {
    name: 'SpaceX',
    legalName: 'Space Exploration Technologies Corp.',
    headquarters: 'Hawthorne, California, USA',
    foundedDate: '2002-05-06',
    employeeCount: 13000,
    employeeCountSource: 'Industry Report',
    website: 'https://www.spacex.com',
    description: 'Leading private aerospace manufacturer and space transportation company. Designs, manufactures, and launches advanced rockets and spacecraft.',
    ceo: 'Elon Musk',
    cto: 'Elon Musk',
    isPublic: false,
    status: 'active',
    sector: 'launch',
    subsector: 'launch_provider',
    fundingRounds: [
      {
        date: '2024-06-01',
        amount: 7_500_000_000,
        seriesLabel: 'Series N',
        roundType: 'equity',
        leadInvestor: 'Andreessen Horowitz',
        investors: ['Andreessen Horowitz', 'Founders Fund', 'Sequoia Capital', 'Gigafund'],
        source: 'Press Release',
      },
      {
        date: '2023-11-01',
        amount: 750_000_000,
        seriesLabel: 'Series M',
        roundType: 'equity',
        leadInvestor: 'Andreessen Horowitz',
        investors: ['Andreessen Horowitz', 'Founders Fund'],
        source: 'Crunchbase',
      },
      {
        date: '2022-05-01',
        amount: 1_680_000_000,
        seriesLabel: 'Series L',
        roundType: 'equity',
        leadInvestor: 'Andreessen Horowitz',
        investors: ['Andreessen Horowitz', 'Fidelity', 'Sequoia Capital'],
        source: 'Crunchbase',
      },
    ],
    revenueEstimates: [
      { year: 2025, revenue: 15_000_000_000, revenueRange: '$13B-$15B', source: 'Industry Report', confidenceLevel: 'estimate' },
      { year: 2024, revenue: 9_800_000_000, revenueRange: '$8B-$10B', source: 'Industry Report', confidenceLevel: 'estimate' },
    ],
    products: [
      { name: 'Falcon 9', category: 'launch_vehicle', description: 'Partially reusable medium-lift launch vehicle. Most frequently launched orbital rocket.', status: 'active' },
      { name: 'Falcon Heavy', category: 'launch_vehicle', description: 'Partially reusable heavy-lift launch vehicle composed of three Falcon 9 cores.', status: 'active' },
      { name: 'Starship', category: 'launch_vehicle', description: 'Fully reusable super heavy-lift launch vehicle under development. Designed for Mars missions.', status: 'development' },
      { name: 'Dragon', category: 'satellite_bus', description: 'Crew and cargo spacecraft for ISS resupply and crewed missions.', status: 'active' },
      { name: 'Starlink', category: 'service', description: 'Satellite internet constellation providing global broadband coverage.', status: 'active' },
    ],
    personnel: [
      { name: 'Elon Musk', title: 'CEO & CTO', role: 'founder', isCurrent: true, previousCompanies: ['Tesla', 'PayPal', 'The Boring Company'] },
      { name: 'Gwynne Shotwell', title: 'President & COO', role: 'executive', isCurrent: true, previousCompanies: ['Aerospace Corporation', 'Microcosm'] },
    ],
  },
  {
    name: 'Blue Origin',
    legalName: 'Blue Origin, LLC',
    headquarters: 'Kent, Washington, USA',
    foundedDate: '2000-09-08',
    employeeCount: 11000,
    employeeCountSource: 'LinkedIn',
    website: 'https://www.blueorigin.com',
    description: 'Aerospace manufacturer and suborbital spaceflight services company. Developing reusable launch vehicles and space infrastructure.',
    ceo: 'Dave Limp',
    cto: 'Gary Lai',
    isPublic: false,
    status: 'active',
    sector: 'launch',
    subsector: 'launch_provider',
    fundingRounds: [
      {
        date: '2023-01-01',
        amount: 1_000_000_000,
        seriesLabel: 'Private Investment',
        roundType: 'equity',
        leadInvestor: 'Jeff Bezos',
        investors: ['Jeff Bezos'],
        source: 'Press Release',
      },
      {
        date: '2021-01-01',
        amount: 1_000_000_000,
        seriesLabel: 'Private Investment',
        roundType: 'equity',
        leadInvestor: 'Jeff Bezos',
        investors: ['Jeff Bezos'],
        source: 'Press Release',
      },
    ],
    revenueEstimates: [
      { year: 2025, revenueRange: '$1B-$2B', source: 'Industry Report', confidenceLevel: 'speculation' },
    ],
    products: [
      { name: 'New Shepard', category: 'launch_vehicle', description: 'Reusable suborbital launch vehicle for space tourism and research.', status: 'active' },
      { name: 'New Glenn', category: 'launch_vehicle', description: 'Orbital heavy-lift launch vehicle with reusable first stage.', status: 'development' },
      { name: 'BE-4', category: 'service', description: 'Liquid oxygen/methane rocket engine powering New Glenn and ULA Vulcan.', status: 'active' },
      { name: 'Blue Moon', category: 'satellite_bus', description: 'Lunar lander for NASA Human Landing System program.', status: 'development' },
    ],
    personnel: [
      { name: 'Dave Limp', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['Amazon'] },
      { name: 'Jeff Bezos', title: 'Founder & Executive Chairman', role: 'founder', isCurrent: true, previousCompanies: ['Amazon'] },
    ],
  },
  {
    name: 'Rocket Lab',
    legalName: 'Rocket Lab USA, Inc.',
    ticker: 'RKLB',
    headquarters: 'Long Beach, California, USA',
    foundedDate: '2006-06-01',
    employeeCount: 2000,
    employeeCountSource: 'SEC Filing',
    website: 'https://www.rocketlabusa.com',
    description: 'End-to-end space company providing launch services, satellite manufacturing, and spacecraft components.',
    ceo: 'Peter Beck',
    cto: 'Peter Beck',
    isPublic: true,
    status: 'active',
    sector: 'launch',
    subsector: 'small_launch',
    revenueEstimates: [
      { year: 2025, revenue: 436_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2024, revenue: 360_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 245_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'Electron', category: 'launch_vehicle', description: 'Small-lift orbital launch vehicle. First private rocket to reach orbit from the Southern Hemisphere.', status: 'active' },
      { name: 'Neutron', category: 'launch_vehicle', description: 'Reusable medium-lift launch vehicle under development for mega-constellation deployment.', status: 'development' },
      { name: 'Photon', category: 'satellite_bus', description: 'Configurable spacecraft platform for satellite missions.', status: 'active' },
    ],
    personnel: [
      { name: 'Peter Beck', title: 'CEO & CTO', role: 'founder', isCurrent: true, previousCompanies: [] },
      { name: 'Adam Spice', title: 'CFO', role: 'executive', isCurrent: true, previousCompanies: ['Maxar Technologies', 'DigitalBridge'] },
    ],
  },
  {
    name: 'Relativity Space',
    legalName: 'Relativity Space, Inc.',
    headquarters: 'Long Beach, California, USA',
    foundedDate: '2015-01-01',
    employeeCount: 1000,
    employeeCountSource: 'LinkedIn',
    website: 'https://www.relativityspace.com',
    description: 'Aerospace company developing 3D-printed rockets. Building the next generation of launch vehicles with autonomous manufacturing.',
    ceo: 'Tim Ellis',
    cto: 'Tim Ellis',
    isPublic: false,
    status: 'active',
    sector: 'launch',
    subsector: 'launch_provider',
    fundingRounds: [
      {
        date: '2022-05-01',
        amount: 250_000_000,
        seriesLabel: 'Series E',
        roundType: 'equity',
        leadInvestor: 'Fidelity',
        investors: ['Fidelity', 'Baillie Gifford', 'K5 Global', 'Tiger Global'],
        source: 'Crunchbase',
      },
      {
        date: '2021-06-01',
        amount: 650_000_000,
        seriesLabel: 'Series E',
        roundType: 'equity',
        leadInvestor: 'Fidelity',
        investors: ['Fidelity', 'Tiger Global', 'Coatue', 'K5 Global'],
        source: 'Crunchbase',
      },
    ],
    products: [
      { name: 'Terran R', category: 'launch_vehicle', description: 'Fully reusable, 3D-printed medium-lift launch vehicle. Next-gen successor to Terran 1.', status: 'development' },
      { name: 'Stargate', category: 'service', description: 'Largest metal 3D printer in the world, used to manufacture rocket components.', status: 'active' },
    ],
    personnel: [
      { name: 'Tim Ellis', title: 'CEO & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['Blue Origin'] },
      { name: 'Jordan Noone', title: 'Co-Founder', role: 'founder', isCurrent: false, previousCompanies: ['SpaceX'] },
    ],
  },
  {
    name: 'Planet Labs',
    legalName: 'Planet Labs PBC',
    ticker: 'PL',
    headquarters: 'San Francisco, California, USA',
    foundedDate: '2010-12-01',
    employeeCount: 900,
    employeeCountSource: 'SEC Filing',
    website: 'https://www.planet.com',
    description: 'Earth imaging company operating the largest constellation of Earth observation satellites. Provides geospatial data and analytics.',
    ceo: 'Will Marshall',
    cto: 'Robbie Schingler',
    isPublic: true,
    status: 'active',
    sector: 'satellite',
    subsector: 'earth_observation',
    revenueEstimates: [
      { year: 2025, revenue: 244_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2024, revenue: 229_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 191_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'SuperDove', category: 'satellite_bus', description: 'Next-gen Earth observation smallsats with 8-band multispectral capability.', status: 'active' },
      { name: 'SkySat', category: 'satellite_bus', description: 'High-resolution sub-meter Earth observation satellites.', status: 'active' },
      { name: 'Pelican', category: 'satellite_bus', description: 'Next-generation high-resolution, high-revisit satellite constellation.', status: 'development' },
    ],
    personnel: [
      { name: 'Will Marshall', title: 'CEO & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['NASA Ames'] },
      { name: 'Robbie Schingler', title: 'Chief Strategy Officer & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['NASA'] },
    ],
  },
  {
    name: 'Maxar Technologies',
    legalName: 'Maxar Technologies Inc.',
    headquarters: 'Westminster, Colorado, USA',
    foundedDate: '2017-10-05',
    employeeCount: 4500,
    employeeCountSource: 'Industry Report',
    website: 'https://www.maxar.com',
    description: 'Space technology company specializing in Earth observation, geospatial intelligence, and satellite manufacturing.',
    ceo: 'Dan Jablonsky',
    isPublic: false,
    status: 'acquired',
    sector: 'satellite',
    subsector: 'earth_observation',
    cageCode: '4GPY0',
    revenueEstimates: [
      { year: 2023, revenue: 1_800_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2022, revenue: 1_720_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'WorldView Legion', category: 'satellite_bus', description: 'Next-generation Earth observation constellation with 30cm resolution.', status: 'active' },
      { name: 'GeoEye-1', category: 'satellite_bus', description: 'High-resolution commercial Earth observation satellite.', status: 'active' },
      { name: '1300 Series Bus', category: 'satellite_bus', description: 'GEO communications satellite platform.', status: 'active' },
    ],
    personnel: [
      { name: 'Dan Jablonsky', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['DigitalGlobe'] },
    ],
  },
  {
    name: 'L3Harris Technologies',
    legalName: 'L3Harris Technologies, Inc.',
    ticker: 'LHX',
    headquarters: 'Melbourne, Florida, USA',
    foundedDate: '2019-06-29',
    employeeCount: 50000,
    employeeCountSource: 'SEC Filing',
    website: 'https://www.l3harris.com',
    description: 'Defense and aerospace company providing mission-critical solutions for government and commercial customers. Space division builds satellites and payloads.',
    ceo: 'Christopher Kubasik',
    isPublic: true,
    status: 'active',
    sector: 'satellite',
    subsector: 'defense_space',
    cageCode: '88891',
    revenueEstimates: [
      { year: 2025, revenue: 21_500_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2024, revenue: 20_100_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'Space Payloads', category: 'satellite_bus', description: 'Mission-critical payloads for national security and civil space missions.', status: 'active' },
      { name: 'Responsive Space', category: 'service', description: 'Rapidly deployable satellite capabilities for tactical military users.', status: 'active' },
    ],
    personnel: [
      { name: 'Christopher Kubasik', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['Lockheed Martin'] },
    ],
  },
  {
    name: 'Northrop Grumman',
    legalName: 'Northrop Grumman Corporation',
    ticker: 'NOC',
    headquarters: 'Falls Church, Virginia, USA',
    foundedDate: '1939-01-01',
    employeeCount: 95000,
    employeeCountSource: 'SEC Filing',
    website: 'https://www.northropgrumman.com',
    description: 'Global aerospace and defense company. Space division provides launch vehicles, satellite systems, and space infrastructure.',
    ceo: 'Kathy Warden',
    isPublic: true,
    status: 'active',
    sector: 'launch',
    subsector: 'defense_space',
    cageCode: '80902',
    revenueEstimates: [
      { year: 2025, revenue: 41_000_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2024, revenue: 39_300_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'Antares', category: 'launch_vehicle', description: 'Medium-class orbital launch vehicle for Cygnus cargo missions to ISS.', status: 'active' },
      { name: 'Cygnus', category: 'satellite_bus', description: 'Automated cargo spacecraft for ISS resupply missions.', status: 'active' },
      { name: 'MEV (Mission Extension Vehicle)', category: 'service', description: 'In-orbit servicing vehicle that extends life of geostationary satellites.', status: 'active' },
      { name: 'HALO', category: 'satellite_bus', description: 'Habitation and Logistics Outpost module for NASA Lunar Gateway.', status: 'development' },
    ],
    personnel: [
      { name: 'Kathy Warden', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['General Dynamics'] },
    ],
  },
  {
    name: 'Boeing Space',
    legalName: 'The Boeing Company',
    ticker: 'BA',
    headquarters: 'Arlington, Virginia, USA',
    foundedDate: '1916-07-15',
    employeeCount: 170000,
    employeeCountSource: 'SEC Filing',
    website: 'https://www.boeing.com',
    description: 'Aerospace and defense company. Space division builds satellites, launch vehicles, and the CST-100 Starliner crew vehicle.',
    ceo: 'Kelly Ortberg',
    isPublic: true,
    status: 'active',
    sector: 'launch',
    subsector: 'defense_space',
    cageCode: '81205',
    revenueEstimates: [
      { year: 2025, revenue: 73_000_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2024, revenue: 66_500_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'CST-100 Starliner', category: 'satellite_bus', description: 'Crew capsule for NASA Commercial Crew Program to transport astronauts to ISS.', status: 'active' },
      { name: 'SLS Core Stage', category: 'launch_vehicle', description: 'Core stage for NASA Space Launch System super heavy-lift vehicle.', status: 'active' },
      { name: 'WGS', category: 'satellite_bus', description: 'Wideband Global SATCOM military communications satellites.', status: 'active' },
    ],
    personnel: [
      { name: 'Kelly Ortberg', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['Collins Aerospace', 'Rockwell Collins'] },
    ],
  },
  {
    name: 'Lockheed Martin Space',
    legalName: 'Lockheed Martin Corporation',
    ticker: 'LMT',
    headquarters: 'Bethesda, Maryland, USA',
    foundedDate: '1995-03-15',
    employeeCount: 116000,
    employeeCountSource: 'SEC Filing',
    website: 'https://www.lockheedmartin.com',
    description: 'Aerospace, defense, and security company. Space division builds satellites, missile defense systems, and the Orion crew capsule.',
    ceo: 'Jim Taiclet',
    isPublic: true,
    status: 'active',
    sector: 'satellite',
    subsector: 'defense_space',
    cageCode: '64217',
    revenueEstimates: [
      { year: 2025, revenue: 71_000_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2024, revenue: 67_600_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'Orion MPCV', category: 'satellite_bus', description: 'Multi-Purpose Crew Vehicle for deep space exploration and Artemis missions.', status: 'active' },
      { name: 'A2100', category: 'satellite_bus', description: 'Versatile GEO satellite bus platform for communications and defense.', status: 'active' },
      { name: 'SBIRS', category: 'satellite_bus', description: 'Space Based Infrared System for missile warning and defense.', status: 'active' },
    ],
    personnel: [
      { name: 'Jim Taiclet', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['American Tower Corporation'] },
      { name: 'Robert Lightfoot', title: 'EVP, Space', role: 'executive', isCurrent: true, previousCompanies: ['NASA'] },
    ],
  },
  {
    name: 'Virgin Orbit',
    legalName: 'Virgin Orbit Holdings, Inc.',
    headquarters: 'Long Beach, California, USA',
    foundedDate: '2017-01-01',
    employeeCount: 0,
    employeeCountSource: 'Bankruptcy Filing',
    website: 'https://virginorbit.com',
    description: 'Air-launch small satellite company that ceased operations in 2023. Launched rockets from modified Boeing 747 aircraft.',
    ceo: 'Dan Hart',
    isPublic: false,
    status: 'defunct',
    sector: 'launch',
    subsector: 'small_launch',
    fundingRounds: [
      {
        date: '2021-12-01',
        amount: 228_000_000,
        seriesLabel: 'SPAC Merger',
        roundType: 'spac',
        leadInvestor: 'NextGen Acquisition Corp. II',
        investors: ['NextGen Acquisition Corp. II', 'Boeing', 'AE Industrial Partners'],
        source: 'SEC Filing',
      },
    ],
    products: [
      { name: 'LauncherOne', category: 'launch_vehicle', description: 'Air-launched small satellite launch vehicle. Carried by Cosmic Girl 747.', status: 'retired' },
    ],
    personnel: [
      { name: 'Dan Hart', title: 'CEO', role: 'executive', isCurrent: false, previousCompanies: ['Boeing'] },
    ],
  },
  {
    name: 'Astra Space',
    legalName: 'Astra Space, Inc.',
    ticker: 'ASTR',
    headquarters: 'Alameda, California, USA',
    foundedDate: '2016-10-01',
    employeeCount: 250,
    employeeCountSource: 'LinkedIn',
    website: 'https://astra.com',
    description: 'Space technology company pivoting from launch to spacecraft propulsion systems after launch vehicle development challenges.',
    ceo: 'Chris Kemp',
    cto: 'Chris Kemp',
    isPublic: true,
    status: 'active',
    sector: 'services',
    subsector: 'propulsion',
    revenueEstimates: [
      { year: 2024, revenue: 3_400_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 1_400_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'Astra Spacecraft Engine', category: 'service', description: 'Electric propulsion system for small satellites.', status: 'active' },
    ],
    personnel: [
      { name: 'Chris Kemp', title: 'CEO & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['NASA', 'Nebula'] },
      { name: 'Adam London', title: 'CTO & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['University of Alabama Huntsville'] },
    ],
  },
  {
    name: 'Firefly Aerospace',
    legalName: 'Firefly Aerospace, Inc.',
    headquarters: 'Cedar Park, Texas, USA',
    foundedDate: '2017-01-01',
    employeeCount: 700,
    employeeCountSource: 'LinkedIn',
    website: 'https://fireflyspace.com',
    description: 'Launch vehicle and spacecraft company providing launch services, in-space transportation, and lunar landers.',
    ceo: 'Bill Weber',
    isPublic: false,
    status: 'active',
    sector: 'launch',
    subsector: 'small_launch',
    fundingRounds: [
      {
        date: '2023-06-01',
        amount: 175_000_000,
        seriesLabel: 'Series C',
        roundType: 'equity',
        leadInvestor: 'RPM Ventures',
        investors: ['RPM Ventures', 'DADA Holdings', 'Mallard Capital'],
        source: 'Press Release',
      },
      {
        date: '2021-05-01',
        amount: 75_000_000,
        seriesLabel: 'Series A',
        roundType: 'equity',
        leadInvestor: 'DADA Holdings',
        investors: ['DADA Holdings'],
        source: 'Crunchbase',
      },
    ],
    products: [
      { name: 'Alpha', category: 'launch_vehicle', description: 'Small-lift orbital launch vehicle for dedicated and rideshare missions.', status: 'active' },
      { name: 'MLV (Medium Launch Vehicle)', category: 'launch_vehicle', description: 'Medium-lift reusable launch vehicle under development with Northrop Grumman.', status: 'development' },
      { name: 'Blue Ghost', category: 'satellite_bus', description: 'Lunar lander for NASA CLPS program and commercial customers.', status: 'active' },
    ],
    personnel: [
      { name: 'Bill Weber', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['L3Harris', 'Northrop Grumman'] },
    ],
  },
  {
    name: 'Terran Orbital',
    legalName: 'Terran Orbital Corporation',
    headquarters: 'Boca Raton, Florida, USA',
    foundedDate: '2013-01-01',
    employeeCount: 450,
    employeeCountSource: 'SEC Filing',
    website: 'https://terranorbital.com',
    description: 'Small satellite manufacturer and mission solutions provider. Produces satellite buses and integrated satellite solutions for defense and commercial.',
    ceo: 'Marc Bell',
    isPublic: false,
    status: 'acquired',
    sector: 'satellite',
    subsector: 'satellite_manufacturing',
    revenueEstimates: [
      { year: 2024, revenue: 120_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 96_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'TRESTLES', category: 'satellite_bus', description: '6U-16U CubeSat platform for Earth observation and science.', status: 'active' },
      { name: 'ORCA', category: 'satellite_bus', description: 'ESPA-class satellite bus for defense and intelligence missions.', status: 'active' },
    ],
    personnel: [
      { name: 'Marc Bell', title: 'CEO & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['Globecomm Systems'] },
    ],
  },
  {
    name: 'Spire Global',
    legalName: 'Spire Global, Inc.',
    ticker: 'SPIR',
    headquarters: 'Vienna, Virginia, USA',
    foundedDate: '2012-01-01',
    employeeCount: 500,
    employeeCountSource: 'SEC Filing',
    website: 'https://spire.com',
    description: 'Space-to-cloud data analytics company operating a large constellation of nanosatellites for weather, maritime, and aviation tracking.',
    ceo: 'Peter Platzer',
    isPublic: true,
    status: 'active',
    sector: 'satellite',
    subsector: 'data_analytics',
    revenueEstimates: [
      { year: 2025, revenue: 120_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2024, revenue: 106_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 93_000_000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    products: [
      { name: 'LEMUR', category: 'satellite_bus', description: 'Multi-purpose nanosatellite for weather, maritime AIS, and aircraft ADS-B tracking.', status: 'active' },
      { name: 'Spire Weather', category: 'software', description: 'Global weather data and forecasting from space-based GNSS radio occultation.', status: 'active' },
      { name: 'Spire Maritime', category: 'software', description: 'Satellite AIS data for global vessel tracking and maritime intelligence.', status: 'active' },
    ],
    personnel: [
      { name: 'Peter Platzer', title: 'CEO & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['Goldman Sachs'] },
    ],
  },
  {
    name: 'Sierra Space',
    legalName: 'Sierra Space Corporation',
    headquarters: 'Louisville, Colorado, USA',
    foundedDate: '2021-01-01',
    employeeCount: 1500,
    employeeCountSource: 'LinkedIn',
    website: 'https://www.sierraspace.com',
    description: 'Commercial space company building the Dream Chaser spaceplane and LIFE habitat for commercial space stations.',
    ceo: 'Tom Vice',
    isPublic: false,
    status: 'active',
    sector: 'services',
    subsector: 'space_stations',
    fundingRounds: [
      {
        date: '2023-10-01',
        amount: 290_000_000,
        seriesLabel: 'Series B',
        roundType: 'equity',
        leadInvestor: 'Coatue Management',
        investors: ['Coatue Management', 'General Atlantic', 'Sequoia Capital', 'Moore Strategic Ventures'],
        source: 'Press Release',
      },
      {
        date: '2022-01-01',
        amount: 1_400_000_000,
        seriesLabel: 'Series A',
        roundType: 'equity',
        leadInvestor: 'Coatue Management',
        investors: ['Coatue Management', 'General Atlantic', 'Moore Strategic Ventures'],
        source: 'Press Release',
      },
    ],
    products: [
      { name: 'Dream Chaser', category: 'satellite_bus', description: 'Reusable winged spaceplane for cargo and crew transport to LEO. NASA CRS-2 contract.', status: 'development' },
      { name: 'LIFE Habitat', category: 'satellite_bus', description: 'Large Integrated Flexible Environment inflatable space station module.', status: 'development' },
    ],
    personnel: [
      { name: 'Tom Vice', title: 'CEO', role: 'executive', isCurrent: true, previousCompanies: ['Northrop Grumman', 'Sierra Nevada Corporation'] },
    ],
  },
  {
    name: 'Axiom Space',
    legalName: 'Axiom Space, Inc.',
    headquarters: 'Houston, Texas, USA',
    foundedDate: '2016-01-01',
    employeeCount: 800,
    employeeCountSource: 'LinkedIn',
    website: 'https://www.axiomspace.com',
    description: 'Commercial space station company building the first commercial module for the ISS and the successor commercial space station.',
    ceo: 'Michael Suffredini',
    isPublic: false,
    status: 'active',
    sector: 'services',
    subsector: 'space_stations',
    fundingRounds: [
      {
        date: '2023-08-01',
        amount: 350_000_000,
        seriesLabel: 'Series C',
        roundType: 'equity',
        leadInvestor: 'Aljazira Capital',
        investors: ['Aljazira Capital', 'Boryung', 'Galaxy Interactive'],
        source: 'Press Release',
      },
      {
        date: '2022-02-01',
        amount: 130_000_000,
        seriesLabel: 'Series B',
        roundType: 'equity',
        leadInvestor: 'C5 Capital',
        investors: ['C5 Capital', 'Alumni Ventures Group'],
        source: 'Crunchbase',
      },
    ],
    products: [
      { name: 'Axiom Station', category: 'satellite_bus', description: 'Commercial space station, initially attached to ISS before becoming free-flying.', status: 'development' },
      { name: 'Axiom Extravehicular Mobility Unit', category: 'service', description: 'Next-generation spacesuit for NASA Artemis moonwalks.', status: 'development' },
    ],
    personnel: [
      { name: 'Michael Suffredini', title: 'CEO & Co-Founder', role: 'founder', isCurrent: true, previousCompanies: ['NASA ISS Program'] },
    ],
  },
];

// Notable M&A transactions to seed
const mergerAcquisitions = [
  {
    acquirerName: 'L3Harris Technologies',
    targetName: 'Aerojet Rocketdyne',
    date: '2023-07-28',
    price: 4_700_000_000,
    dealType: 'acquisition',
    status: 'completed',
    rationale: 'Expanding propulsion capabilities and vertical integration in defense space. Strengthens position in solid rocket motors and liquid engines.',
    source: 'SEC Filing',
  },
  {
    acquirerName: 'Lockheed Martin Space',
    targetName: 'Terran Orbital',
    date: '2024-03-25',
    price: 450_000_000,
    dealType: 'acquisition',
    status: 'completed',
    rationale: 'Expanding small satellite manufacturing capabilities for defense and intelligence constellation programs.',
    source: 'Press Release',
  },
  {
    acquirerName: 'Northrop Grumman',
    targetName: 'Orbital ATK',
    date: '2018-06-06',
    price: 9_200_000_000,
    dealType: 'acquisition',
    status: 'completed',
    rationale: 'Created integrated aerospace and defense leader with launch, satellite, and propulsion capabilities.',
    source: 'SEC Filing',
  },
];

// Government contract awards
const contractAwards = [
  {
    companyName: 'SpaceX',
    contractNumber: 'NNJ19ZS006C',
    agency: 'NASA',
    title: 'Human Landing System (HLS) Starship',
    description: 'Development of the Starship Human Landing System for the Artemis program to return astronauts to the lunar surface.',
    awardDate: '2021-04-16',
    value: 2_890_000_000,
    ceiling: 4_000_000_000,
    type: 'firm_fixed_price',
    source: 'NASA',
  },
  {
    companyName: 'Blue Origin',
    contractNumber: '80MSFC23CA007',
    agency: 'NASA',
    title: 'Sustaining Lunar Development HLS',
    description: 'Second Human Landing System provider for sustained lunar exploration under Artemis program.',
    awardDate: '2023-05-19',
    value: 3_400_000_000,
    ceiling: 3_400_000_000,
    type: 'firm_fixed_price',
    source: 'NASA',
  },
  {
    companyName: 'Northrop Grumman',
    contractNumber: 'NNJ13ZBG18C',
    agency: 'NASA',
    title: 'CRS-2 Cygnus Resupply',
    description: 'Commercial Resupply Services Phase 2 contract for ISS cargo delivery using Cygnus spacecraft.',
    awardDate: '2016-01-14',
    value: 3_100_000_000,
    type: 'idiq',
    source: 'NASA',
  },
  {
    companyName: 'SpaceX',
    contractNumber: 'FA8811-20-C-0003',
    agency: 'Space Force',
    title: 'NSSL Phase 2 Launch Services',
    description: 'National Security Space Launch Phase 2 contract for launching critical national security payloads.',
    awardDate: '2020-08-07',
    value: 653_000_000,
    type: 'idiq',
    source: 'DoD',
  },
  {
    companyName: 'Lockheed Martin Space',
    contractNumber: 'NNJ20ZS005C',
    agency: 'NASA',
    title: 'Orion MPCV Production',
    description: 'Production and operations contract for the Orion Multi-Purpose Crew Vehicle for Artemis missions.',
    awardDate: '2019-09-22',
    value: 4_600_000_000,
    ceiling: 7_200_000_000,
    type: 'cost_plus',
    source: 'NASA',
  },
  {
    companyName: 'Firefly Aerospace',
    contractNumber: '80MSFC22CA004',
    agency: 'NASA',
    title: 'CLPS Blue Ghost Mission 1',
    description: 'Commercial Lunar Payload Services delivery of NASA science payloads to the lunar surface.',
    awardDate: '2021-02-04',
    value: 93_300_000,
    type: 'firm_fixed_price',
    source: 'NASA',
  },
];

async function main() {
  console.log('Seeding Company Intelligence Database...\n');

  // Check if data already exists - if so, skip to avoid duplicates
  const existingCount = await prisma.companyProfile.count();
  if (existingCount > 0) {
    console.log(`  Found ${existingCount} existing company profiles.`);
    console.log('  To re-seed, delete existing data first.');
    console.log('  Skipping seed to avoid duplicates.\n');

    // Still build the map for reference
    const existing = await prisma.companyProfile.findMany({ select: { id: true, name: true } });
    const companyMap = new Map<string, string>();
    for (const c of existing) {
      companyMap.set(c.name, c.id);
    }

    const totalCompanies = await prisma.companyProfile.count();
    const totalFunding = await prisma.fundingRound.count();
    const totalProducts = await prisma.companyProduct.count();
    const totalPersonnel = await prisma.keyPersonnel.count();
    const totalContracts = await prisma.governmentContractAward.count();

    console.log('=== Current Data ===');
    console.log(`  Companies:    ${totalCompanies}`);
    console.log(`  Funding:      ${totalFunding}`);
    console.log(`  Products:     ${totalProducts}`);
    console.log(`  Personnel:    ${totalPersonnel}`);
    console.log(`  Contracts:    ${totalContracts}`);
    return;
  }

  // Track created company IDs for M&A linking
  const companyMap = new Map<string, string>();

  for (const companySeed of companies) {
    console.log(`  Creating: ${companySeed.name}...`);

    const slug = companySeed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const profile = await prisma.companyProfile.create({
      data: {
        slug,
        name: companySeed.name,
        legalName: companySeed.legalName,
        ticker: companySeed.ticker,
        headquarters: companySeed.headquarters,
        foundedDate: new Date(companySeed.foundedDate),
        employeeCount: companySeed.employeeCount,
        employeeCountSource: companySeed.employeeCountSource,
        website: companySeed.website,
        description: companySeed.description,
        ceo: companySeed.ceo,
        cto: companySeed.cto,
        isPublic: companySeed.isPublic,
        status: companySeed.status,
        sector: companySeed.sector,
        subsector: companySeed.subsector,
        cageCode: companySeed.cageCode,
        samUei: companySeed.samUei,
      },
    });

    companyMap.set(companySeed.name, profile.id);

    // Seed funding rounds
    if (companySeed.fundingRounds) {
      for (const round of companySeed.fundingRounds) {
        await prisma.fundingRound.create({
          data: {
            companyId: profile.id,
            date: new Date(round.date),
            amount: round.amount,
            seriesLabel: round.seriesLabel,
            roundType: round.roundType,
            leadInvestor: round.leadInvestor,
            investors: round.investors,
            source: round.source,
          },
        });
      }
      console.log(`    + ${companySeed.fundingRounds.length} funding round(s)`);
    }

    // Seed revenue estimates
    if (companySeed.revenueEstimates) {
      for (const rev of companySeed.revenueEstimates) {
        await prisma.revenueEstimate.create({
          data: {
            companyId: profile.id,
            year: rev.year,
            quarter: rev.quarter,
            revenue: rev.revenue,
            revenueRange: rev.revenueRange,
            source: rev.source,
            confidenceLevel: rev.confidenceLevel,
          },
        });
      }
      console.log(`    + ${companySeed.revenueEstimates.length} revenue estimate(s)`);
    }

    // Seed products
    if (companySeed.products) {
      for (const prod of companySeed.products) {
        await prisma.companyProduct.create({
          data: {
            companyId: profile.id,
            name: prod.name,
            category: prod.category,
            description: prod.description,
            status: prod.status,
          },
        });
      }
      console.log(`    + ${companySeed.products.length} product(s)`);
    }

    // Seed personnel
    if (companySeed.personnel) {
      for (const person of companySeed.personnel) {
        await prisma.keyPersonnel.create({
          data: {
            companyId: profile.id,
            name: person.name,
            title: person.title,
            role: person.role,
            isCurrent: person.isCurrent,
            previousCompanies: person.previousCompanies,
          },
        });
      }
      console.log(`    + ${companySeed.personnel.length} personnel`);
    }
  }

  // Seed M&A transactions
  console.log('\n  Seeding M&A transactions...');
  for (const ma of mergerAcquisitions) {
    const acquirerId = companyMap.get(ma.acquirerName);
    const targetId = companyMap.get(ma.targetName);

    if (acquirerId) {
      await prisma.mergerAcquisition.create({
        data: {
          acquirerId,
          targetId: targetId || null,
          targetName: ma.targetName,
          date: new Date(ma.date),
          price: ma.price,
          dealType: ma.dealType,
          status: ma.status,
          rationale: ma.rationale,
          source: ma.source,
        },
      });
      console.log(`    + ${ma.acquirerName} -> ${ma.targetName}`);
    }
  }

  // Seed government contract awards
  console.log('\n  Seeding government contract awards...');
  for (const contract of contractAwards) {
    const companyId = companyMap.get(contract.companyName);

    await prisma.governmentContractAward.create({
      data: {
        companyId: companyId || null,
        companyName: contract.companyName,
        contractNumber: contract.contractNumber,
        agency: contract.agency,
        title: contract.title,
        description: contract.description,
        awardDate: new Date(contract.awardDate),
        value: contract.value,
        ceiling: contract.ceiling,
        type: contract.type,
        source: contract.source,
      },
    });
    console.log(`    + ${contract.agency}: ${contract.title}`);
  }

  // Seed some competitive mappings
  console.log('\n  Seeding competitive mappings...');
  const competitivePairs = [
    { company: 'SpaceX', competitor: 'Blue Origin', segment: 'heavy_launch', relationship: 'direct' },
    { company: 'SpaceX', competitor: 'Rocket Lab', segment: 'small_launch', relationship: 'indirect' },
    { company: 'Rocket Lab', competitor: 'Firefly Aerospace', segment: 'small_launch', relationship: 'direct' },
    { company: 'Planet Labs', competitor: 'Maxar Technologies', segment: 'earth_observation', relationship: 'direct' },
    { company: 'Planet Labs', competitor: 'Spire Global', segment: 'earth_observation', relationship: 'indirect' },
    { company: 'Sierra Space', competitor: 'Axiom Space', segment: 'commercial_space_stations', relationship: 'direct' },
    { company: 'Boeing Space', competitor: 'Lockheed Martin Space', segment: 'defense_space', relationship: 'direct' },
    { company: 'Northrop Grumman', competitor: 'L3Harris Technologies', segment: 'defense_space', relationship: 'direct' },
  ];

  for (const pair of competitivePairs) {
    const companyId = companyMap.get(pair.company);
    const competitorId = companyMap.get(pair.competitor);

    if (companyId && competitorId) {
      await prisma.competitiveMapping.create({
        data: {
          companyId,
          competitorId,
          segment: pair.segment,
          relationship: pair.relationship,
        },
      });
      console.log(`    + ${pair.company} <-> ${pair.competitor} (${pair.segment})`);
    }
  }

  // Seed some partnerships
  console.log('\n  Seeding partnerships...');
  const partnerships = [
    {
      company: 'SpaceX',
      partnerName: 'NASA',
      type: 'strategic_alliance',
      description: 'Commercial Crew Program partnership for astronaut transportation to ISS using Dragon spacecraft.',
      announcedDate: '2014-09-16',
    },
    {
      company: 'Northrop Grumman',
      partner: 'Firefly Aerospace',
      type: 'joint_venture',
      description: 'Partnership to develop the Antares 330 / MLV medium-lift reusable launch vehicle.',
      announcedDate: '2023-07-01',
    },
    {
      company: 'Blue Origin',
      partnerName: 'Lockheed Martin, Northrop Grumman, Draper',
      type: 'strategic_alliance',
      description: 'National Team partnership for NASA Human Landing System program.',
      announcedDate: '2019-10-22',
    },
  ];

  for (const p of partnerships) {
    const companyId = companyMap.get(p.company);
    const partnerId = p.partner ? companyMap.get(p.partner) : undefined;

    if (companyId) {
      await prisma.partnership.create({
        data: {
          companyId,
          partnerId: partnerId || null,
          partnerName: p.partnerName || p.partner || '',
          type: p.type,
          description: p.description,
          announcedDate: new Date(p.announcedDate),
        },
      });
      console.log(`    + ${p.company} <-> ${p.partnerName || p.partner}`);
    }
  }

  const totalCompanies = await prisma.companyProfile.count();
  const totalFunding = await prisma.fundingRound.count();
  const totalProducts = await prisma.companyProduct.count();
  const totalPersonnel = await prisma.keyPersonnel.count();
  const totalContracts = await prisma.governmentContractAward.count();

  console.log('\n=== Seed Summary ===');
  console.log(`  Companies:    ${totalCompanies}`);
  console.log(`  Funding:      ${totalFunding}`);
  console.log(`  Products:     ${totalProducts}`);
  console.log(`  Personnel:    ${totalPersonnel}`);
  console.log(`  Contracts:    ${totalContracts}`);
  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
