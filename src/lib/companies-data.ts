import prisma from './db';

export interface CompanyData {
  slug: string;
  name: string;
  description: string;
  country: string;
  headquarters?: string;
  founded?: number;
  website?: string;
  logoUrl?: string;
  isPublic: boolean;
  ticker?: string;
  exchange?: string;
  marketCap?: number;
  isPreIPO?: boolean;
  expectedIPODate?: string;
  lastFundingRound?: string;
  lastFundingAmount?: number;
  lastFundingDate?: string;
  totalFunding?: number;
  nextFundingRound?: string;
  valuation?: number;
  focusAreas: string[];
  subSectors?: string[];
  employeeCount?: number;
  revenueEstimate?: number;
}

// Initial company data
const SPACE_COMPANIES: CompanyData[] = [
  // US Public Companies
  {
    slug: 'rocket-lab',
    name: 'Rocket Lab USA',
    description: 'End-to-end space company providing launch services, spacecraft manufacturing, and on-orbit management.',
    country: 'USA',
    headquarters: 'Long Beach, CA',
    founded: 2006,
    website: 'https://www.rocketlabusa.com',
    isPublic: true,
    ticker: 'RKLB',
    exchange: 'NASDAQ',
    marketCap: 11.2,
    focusAreas: ['launch_provider', 'spacecraft', 'satellite_components'],
    subSectors: ['small_launch', 'electron', 'neutron', 'photon'],
    employeeCount: 2000,
  },
  {
    slug: 'intuitive-machines',
    name: 'Intuitive Machines',
    description: 'Space exploration company focused on lunar access and services.',
    country: 'USA',
    headquarters: 'Houston, TX',
    founded: 2013,
    website: 'https://www.intuitivemachines.com',
    isPublic: true,
    ticker: 'LUNR',
    exchange: 'NASDAQ',
    marketCap: 1.8,
    focusAreas: ['lunar_services', 'lunar_landers', 'space_infrastructure'],
    subSectors: ['clps', 'nova_c', 'lunar_data'],
    employeeCount: 400,
  },
  {
    slug: 'ast-spacemobile',
    name: 'AST SpaceMobile',
    description: 'Building the first space-based cellular broadband network accessible by standard smartphones.',
    country: 'USA',
    headquarters: 'Midland, TX',
    founded: 2017,
    website: 'https://ast-science.com',
    isPublic: true,
    ticker: 'ASTS',
    exchange: 'NASDAQ',
    marketCap: 7.5,
    focusAreas: ['space_broadband', 'satellites', 'telecommunications'],
    subSectors: ['direct_to_cell', 'bluebird_satellites'],
    employeeCount: 350,
  },
  {
    slug: 'planet-labs',
    name: 'Planet Labs PBC',
    description: 'Earth imaging company operating the largest fleet of Earth observation satellites.',
    country: 'USA',
    headquarters: 'San Francisco, CA',
    founded: 2010,
    website: 'https://www.planet.com',
    isPublic: true,
    ticker: 'PL',
    exchange: 'NYSE',
    marketCap: 1.2,
    focusAreas: ['earth_observation', 'satellites', 'geospatial_data'],
    subSectors: ['dove_satellites', 'skysat', 'analytics'],
    employeeCount: 700,
  },
  {
    slug: 'redwire-space',
    name: 'Redwire Corporation',
    description: 'Space infrastructure company providing critical components and systems for space missions.',
    country: 'USA',
    headquarters: 'Jacksonville, FL',
    founded: 2020,
    website: 'https://redwirespace.com',
    isPublic: true,
    ticker: 'RDW',
    exchange: 'NYSE',
    marketCap: 0.85,
    focusAreas: ['space_infrastructure', 'spacecraft_components', 'in_space_manufacturing'],
    subSectors: ['solar_arrays', '3d_printing', 'sensors'],
    employeeCount: 700,
  },
  {
    slug: 'blacksky',
    name: 'BlackSky Technology',
    description: 'Real-time geospatial intelligence company providing satellite imagery and analytics.',
    country: 'USA',
    headquarters: 'Herndon, VA',
    founded: 2014,
    website: 'https://www.blacksky.com',
    isPublic: true,
    ticker: 'BKSY',
    exchange: 'NYSE',
    marketCap: 0.45,
    focusAreas: ['earth_observation', 'geospatial_intelligence', 'satellites'],
    subSectors: ['real_time_imagery', 'ai_analytics', 'spectra'],
    employeeCount: 300,
  },
  {
    slug: 'spire-global',
    name: 'Spire Global',
    description: 'Space-to-cloud data and analytics company providing maritime, aviation, and weather tracking.',
    country: 'USA',
    headquarters: 'Vienna, VA',
    founded: 2012,
    website: 'https://spire.com',
    isPublic: true,
    ticker: 'SPIR',
    exchange: 'NYSE',
    marketCap: 0.35,
    focusAreas: ['satellites', 'data_analytics', 'weather'],
    subSectors: ['maritime_tracking', 'aviation', 'rf_sensing'],
    employeeCount: 500,
  },
  {
    slug: 'lockheed-martin',
    name: 'Lockheed Martin',
    description: 'Global aerospace, defense, and security company with major space systems division.',
    country: 'USA',
    headquarters: 'Bethesda, MD',
    founded: 1995,
    website: 'https://www.lockheedmartin.com',
    isPublic: true,
    ticker: 'LMT',
    exchange: 'NYSE',
    marketCap: 135,
    focusAreas: ['defense', 'satellites', 'spacecraft', 'launch_provider'],
    subSectors: ['orion', 'gps_satellites', 'missile_defense', 'space_systems'],
    employeeCount: 116000,
    revenueEstimate: 67000,
  },
  {
    slug: 'northrop-grumman',
    name: 'Northrop Grumman',
    description: 'Aerospace and defense company providing space systems, launch vehicles, and satellites.',
    country: 'USA',
    headquarters: 'Falls Church, VA',
    founded: 1994,
    website: 'https://www.northropgrumman.com',
    isPublic: true,
    ticker: 'NOC',
    exchange: 'NYSE',
    marketCap: 75,
    focusAreas: ['defense', 'launch_provider', 'satellites', 'spacecraft'],
    subSectors: ['antares', 'cygnus', 'james_webb', 'missile_systems'],
    employeeCount: 95000,
    revenueEstimate: 40000,
  },
  {
    slug: 'honeywell',
    name: 'Honeywell Aerospace',
    description: 'Diversified technology company with major aerospace division supplying avionics and propulsion systems.',
    country: 'USA',
    headquarters: 'Charlotte, NC',
    founded: 1906,
    website: 'https://aerospace.honeywell.com',
    isPublic: true,
    ticker: 'HON',
    exchange: 'NASDAQ',
    marketCap: 145,
    focusAreas: ['aerospace_components', 'avionics', 'propulsion'],
    subSectors: ['navigation', 'satellite_communications', 'space_sensors'],
    employeeCount: 97000,
    revenueEstimate: 36000,
  },
  {
    slug: 'heico',
    name: 'HEICO Corporation',
    description: 'Aerospace and electronics company providing components for commercial and defense markets.',
    country: 'USA',
    headquarters: 'Hollywood, FL',
    founded: 1957,
    website: 'https://www.heico.com',
    isPublic: true,
    ticker: 'HEI',
    exchange: 'NYSE',
    marketCap: 32,
    focusAreas: ['aerospace_components', 'electronics', 'defense'],
    subSectors: ['replacement_parts', 'electronic_technologies'],
    employeeCount: 9500,
    revenueEstimate: 3000,
  },

  // US Private Companies
  {
    slug: 'spacex',
    name: 'SpaceX',
    description: 'Leading private aerospace company developing rockets and spacecraft for orbital and interplanetary missions.',
    country: 'USA',
    headquarters: 'Hawthorne, CA',
    founded: 2002,
    website: 'https://www.spacex.com',
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: 'TBD - Starlink spinoff possible',
    lastFundingRound: 'Series N',
    lastFundingAmount: 750,
    lastFundingDate: '2024',
    totalFunding: 10000,
    valuation: 210,
    focusAreas: ['launch_provider', 'spacecraft', 'space_broadband', 'interplanetary'],
    subSectors: ['falcon_9', 'falcon_heavy', 'starship', 'starlink', 'dragon'],
    employeeCount: 13000,
    revenueEstimate: 9000,
  },
  {
    slug: 'blue-origin',
    name: 'Blue Origin',
    description: 'Aerospace company developing reusable launch vehicles and space tourism services.',
    country: 'USA',
    headquarters: 'Kent, WA',
    founded: 2000,
    website: 'https://www.blueorigin.com',
    isPublic: false,
    isPreIPO: false,
    lastFundingRound: 'Private (Bezos funded)',
    totalFunding: 15000,
    valuation: 28,
    focusAreas: ['launch_provider', 'space_tourism', 'lunar_services'],
    subSectors: ['new_shepard', 'new_glenn', 'blue_moon', 'be4_engine'],
    employeeCount: 11000,
  },
  {
    slug: 'sierra-space',
    name: 'Sierra Space',
    description: 'Commercial space company developing Dream Chaser spaceplane and orbital platforms.',
    country: 'USA',
    headquarters: 'Louisville, CO',
    founded: 2021,
    website: 'https://www.sierraspace.com',
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: '2025-2026',
    lastFundingRound: 'Series B',
    lastFundingAmount: 1400,
    lastFundingDate: '2023',
    totalFunding: 2000,
    valuation: 5.3,
    focusAreas: ['spacecraft', 'space_stations', 'cargo_transport'],
    subSectors: ['dream_chaser', 'orbital_reef', 'life_habitat'],
    employeeCount: 1500,
  },
  {
    slug: 'axiom-space',
    name: 'Axiom Space',
    description: 'Building the world\'s first commercial space station and providing ISS missions.',
    country: 'USA',
    headquarters: 'Houston, TX',
    founded: 2016,
    website: 'https://www.axiomspace.com',
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: '2026-2027',
    lastFundingRound: 'Series C',
    lastFundingAmount: 350,
    lastFundingDate: '2023',
    totalFunding: 600,
    valuation: 3.5,
    focusAreas: ['space_stations', 'space_tourism', 'astronaut_training'],
    subSectors: ['axiom_station', 'private_missions', 'spacesuits'],
    employeeCount: 700,
  },
  {
    slug: 'vast-space',
    name: 'Vast',
    description: 'Developing artificial gravity space stations for long-duration human spaceflight.',
    country: 'USA',
    headquarters: 'Long Beach, CA',
    founded: 2021,
    website: 'https://www.vastspace.com',
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: 'TBD',
    lastFundingRound: 'Series A',
    lastFundingAmount: 300,
    lastFundingDate: '2023',
    totalFunding: 400,
    valuation: 1.2,
    focusAreas: ['space_stations', 'artificial_gravity', 'life_support'],
    subSectors: ['haven_1', 'rotating_stations'],
    employeeCount: 200,
  },
  {
    slug: 'relativity-space',
    name: 'Relativity Space',
    description: 'Aerospace company using 3D printing to manufacture rockets.',
    country: 'USA',
    headquarters: 'Long Beach, CA',
    founded: 2015,
    website: 'https://www.relativityspace.com',
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: '2026-2027',
    lastFundingRound: 'Series E',
    lastFundingAmount: 650,
    lastFundingDate: '2023',
    totalFunding: 1300,
    valuation: 4.2,
    focusAreas: ['launch_provider', 'manufacturing'],
    subSectors: ['terran_r', '3d_printing', 'stargate'],
    employeeCount: 1000,
  },
  {
    slug: 'varda-space',
    name: 'Varda Space Industries',
    description: 'In-space manufacturing company producing pharmaceuticals and materials in microgravity.',
    country: 'USA',
    headquarters: 'El Segundo, CA',
    founded: 2020,
    website: 'https://www.varda.com',
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: 'TBD',
    lastFundingRound: 'Series B',
    lastFundingAmount: 90,
    lastFundingDate: '2024',
    totalFunding: 150,
    valuation: 0.5,
    focusAreas: ['in_space_manufacturing', 'pharmaceuticals'],
    subSectors: ['reentry_capsules', 'microgravity_production'],
    employeeCount: 80,
  },
  {
    slug: 'orbit-fab',
    name: 'Orbit Fab',
    description: 'In-space refueling infrastructure company building gas stations in space.',
    country: 'USA',
    headquarters: 'San Francisco, CA',
    founded: 2018,
    website: 'https://www.orbitfab.com',
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: 'TBD',
    lastFundingRound: 'Series A',
    lastFundingAmount: 28,
    lastFundingDate: '2022',
    totalFunding: 35,
    valuation: 0.15,
    focusAreas: ['space_infrastructure', 'refueling', 'satellite_services'],
    subSectors: ['fuel_depots', 'rapidv_interface'],
    employeeCount: 50,
  },
  {
    slug: 'ula',
    name: 'United Launch Alliance',
    description: 'Joint venture of Lockheed Martin and Boeing providing launch services.',
    country: 'USA',
    headquarters: 'Centennial, CO',
    founded: 2006,
    website: 'https://www.ulalaunch.com',
    isPublic: false,
    isPreIPO: false,
    valuation: 3,
    focusAreas: ['launch_provider', 'national_security'],
    subSectors: ['vulcan', 'atlas_v', 'delta_iv'],
    employeeCount: 3000,
  },

  // International - Japan
  {
    slug: 'mitsubishi-heavy',
    name: 'Mitsubishi Heavy Industries',
    description: 'Japanese industrial conglomerate with major aerospace and launch vehicle division.',
    country: 'JPN',
    headquarters: 'Tokyo, Japan',
    founded: 1884,
    website: 'https://www.mhi.com',
    isPublic: true,
    ticker: '7011',
    exchange: 'TSE',
    marketCap: 45,
    focusAreas: ['launch_provider', 'spacecraft', 'defense'],
    subSectors: ['h3_rocket', 'h2a', 'satellites'],
    employeeCount: 77000,
    revenueEstimate: 35000,
  },

  // International - China
  {
    slug: 'casc',
    name: 'China Aerospace Science and Technology Corporation',
    description: 'Chinese state-owned aerospace and defense company, main contractor for Chinese space program.',
    country: 'CHN',
    headquarters: 'Beijing, China',
    founded: 1999,
    website: 'http://english.spacechina.com',
    isPublic: false,
    isPreIPO: false,
    focusAreas: ['launch_provider', 'spacecraft', 'satellites', 'lunar_services'],
    subSectors: ['long_march', 'shenzhou', 'tianzhou', 'change'],
    employeeCount: 170000,
  },
  {
    slug: 'casic',
    name: 'China Aerospace Science and Industry Corporation',
    description: 'Chinese state-owned aerospace company focusing on missiles, rockets, and satellites.',
    country: 'CHN',
    headquarters: 'Beijing, China',
    founded: 1999,
    isPublic: false,
    isPreIPO: false,
    focusAreas: ['launch_provider', 'missiles', 'satellites'],
    subSectors: ['kuaizhou', 'commercial_rockets'],
    employeeCount: 150000,
  },
  {
    slug: 'galactic-energy',
    name: 'Galactic Energy',
    description: 'Chinese private rocket company developing commercial launch vehicles.',
    country: 'CHN',
    headquarters: 'Beijing, China',
    founded: 2018,
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: 'TBD',
    lastFundingRound: 'Series C',
    totalFunding: 200,
    valuation: 0.8,
    focusAreas: ['launch_provider'],
    subSectors: ['ceres_1', 'pallas_1'],
    employeeCount: 500,
  },
  {
    slug: 'landspace',
    name: 'LandSpace',
    description: 'Chinese private aerospace company that achieved first methane rocket orbital flight.',
    country: 'CHN',
    headquarters: 'Huzhou, China',
    founded: 2015,
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: 'TBD',
    lastFundingRound: 'Series D',
    totalFunding: 300,
    valuation: 1.0,
    focusAreas: ['launch_provider'],
    subSectors: ['zhuque_2', 'methane_engines'],
    employeeCount: 800,
  },
  {
    slug: 'ispace-china',
    name: 'iSpace (China)',
    description: 'Chinese private rocket startup focused on small satellite launches.',
    country: 'CHN',
    headquarters: 'Beijing, China',
    founded: 2016,
    isPublic: false,
    isPreIPO: true,
    expectedIPODate: 'TBD',
    lastFundingRound: 'Series B',
    totalFunding: 170,
    focusAreas: ['launch_provider'],
    subSectors: ['hyperbola'],
    employeeCount: 400,
  },

  // International - Russia
  {
    slug: 'roscosmos',
    name: 'Roscosmos State Corporation',
    description: 'Russian governmental body responsible for space program and aerospace research.',
    country: 'RUS',
    headquarters: 'Moscow, Russia',
    founded: 2015,
    website: 'https://www.roscosmos.ru',
    isPublic: false,
    isPreIPO: false,
    focusAreas: ['launch_provider', 'spacecraft', 'space_stations', 'satellites'],
    subSectors: ['soyuz', 'proton', 'angara', 'iss_operations'],
    employeeCount: 170000,
  },
  {
    slug: 'energia',
    name: 'RSC Energia',
    description: 'Russian spacecraft manufacturer responsible for Soyuz and Progress vehicles.',
    country: 'RUS',
    headquarters: 'Korolev, Russia',
    founded: 1946,
    isPublic: false,
    isPreIPO: false,
    focusAreas: ['spacecraft', 'space_stations'],
    subSectors: ['soyuz_spacecraft', 'progress', 'nauka_module'],
    employeeCount: 22000,
  },
  {
    slug: 'khrunichev',
    name: 'Khrunichev State Research and Production Space Center',
    description: 'Russian rocket manufacturer producing Proton and Angara launch vehicles.',
    country: 'RUS',
    headquarters: 'Moscow, Russia',
    founded: 1916,
    isPublic: false,
    isPreIPO: false,
    focusAreas: ['launch_provider'],
    subSectors: ['proton', 'angara', 'briz_upper_stage'],
    employeeCount: 40000,
  },

  // International - Europe
  {
    slug: 'arianespace',
    name: 'Arianespace',
    description: 'European launch service provider operating Ariane, Soyuz, and Vega rockets.',
    country: 'FRA',
    headquarters: 'Évry-Courcouronnes, France',
    founded: 1980,
    website: 'https://www.arianespace.com',
    isPublic: false,
    isPreIPO: false,
    focusAreas: ['launch_provider'],
    subSectors: ['ariane_6', 'vega_c', 'commercial_launches'],
    employeeCount: 400,
  },
  {
    slug: 'airbus-defence-space',
    name: 'Airbus Defence and Space',
    description: 'European aerospace company building satellites, launchers, and space systems.',
    country: 'FRA',
    headquarters: 'Toulouse, France',
    founded: 2014,
    website: 'https://www.airbus.com/space',
    isPublic: true,
    ticker: 'AIR',
    exchange: 'EPA',
    marketCap: 120,
    focusAreas: ['satellites', 'spacecraft', 'launch_provider'],
    subSectors: ['telecom_satellites', 'earth_observation', 'orion_esm'],
    employeeCount: 35000,
    revenueEstimate: 12000,
  },
];

export async function initializeCompanies(): Promise<number> {
  let count = 0;

  for (const company of SPACE_COMPANIES) {
    try {
      await prisma.spaceCompany.upsert({
        where: { slug: company.slug },
        update: {
          name: company.name,
          description: company.description,
          country: company.country,
          headquarters: company.headquarters,
          founded: company.founded,
          website: company.website,
          logoUrl: company.logoUrl,
          isPublic: company.isPublic,
          ticker: company.ticker,
          exchange: company.exchange,
          marketCap: company.marketCap,
          isPreIPO: company.isPreIPO || false,
          expectedIPODate: company.expectedIPODate,
          lastFundingRound: company.lastFundingRound,
          lastFundingAmount: company.lastFundingAmount,
          lastFundingDate: company.lastFundingDate,
          totalFunding: company.totalFunding,
          nextFundingRound: company.nextFundingRound,
          valuation: company.valuation,
          focusAreas: JSON.stringify(company.focusAreas),
          subSectors: company.subSectors ? JSON.stringify(company.subSectors) : null,
          employeeCount: company.employeeCount,
          revenueEstimate: company.revenueEstimate,
        },
        create: {
          slug: company.slug,
          name: company.name,
          description: company.description,
          country: company.country,
          headquarters: company.headquarters,
          founded: company.founded,
          website: company.website,
          logoUrl: company.logoUrl,
          isPublic: company.isPublic,
          ticker: company.ticker,
          exchange: company.exchange,
          marketCap: company.marketCap,
          isPreIPO: company.isPreIPO || false,
          expectedIPODate: company.expectedIPODate,
          lastFundingRound: company.lastFundingRound,
          lastFundingAmount: company.lastFundingAmount,
          lastFundingDate: company.lastFundingDate,
          totalFunding: company.totalFunding,
          nextFundingRound: company.nextFundingRound,
          valuation: company.valuation,
          focusAreas: JSON.stringify(company.focusAreas),
          subSectors: company.subSectors ? JSON.stringify(company.subSectors) : null,
          employeeCount: company.employeeCount,
          revenueEstimate: company.revenueEstimate,
        },
      });
      count++;
    } catch (err) {
      console.error(`Failed to add company ${company.name}:`, err);
    }
  }

  return count;
}

export async function getCompanies(options?: {
  country?: string;
  isPublic?: boolean;
  focusArea?: string;
  limit?: number;
  offset?: number;
}) {
  const { country, isPublic, focusArea, limit = 50, offset = 0 } = options || {};

  const where: Record<string, unknown> = {};

  if (country) {
    where.country = country;
  }

  if (isPublic !== undefined) {
    where.isPublic = isPublic;
  }

  if (focusArea) {
    where.focusAreas = { contains: focusArea };
  }

  const companies = await prisma.spaceCompany.findMany({
    where,
    orderBy: [
      { marketCap: 'desc' },
      { valuation: 'desc' },
      { name: 'asc' },
    ],
    take: limit,
    skip: offset,
  });

  const total = await prisma.spaceCompany.count({ where });

  return { companies, total };
}

export async function getPublicCompanies() {
  return prisma.spaceCompany.findMany({
    where: { isPublic: true },
    orderBy: { marketCap: 'desc' },
  });
}

export async function getPrivateCompanies() {
  return prisma.spaceCompany.findMany({
    where: { isPublic: false },
    orderBy: [{ valuation: 'desc' }, { name: 'asc' }],
  });
}

export async function getCompanyBySlug(slug: string) {
  return prisma.spaceCompany.findUnique({ where: { slug } });
}

export async function getCompanyStats() {
  const total = await prisma.spaceCompany.count();
  const publicCount = await prisma.spaceCompany.count({ where: { isPublic: true } });
  const privateCount = await prisma.spaceCompany.count({ where: { isPublic: false } });
  const preIPOCount = await prisma.spaceCompany.count({ where: { isPreIPO: true } });

  const countries = await prisma.spaceCompany.groupBy({
    by: ['country'],
    _count: { country: true },
  });

  return {
    total,
    publicCount,
    privateCount,
    preIPOCount,
    countriesCount: countries.length,
  };
}
