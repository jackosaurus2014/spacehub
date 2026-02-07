export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Satellite Types
export type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO' | 'Polar';
export type SatelliteStatus = 'active' | 'inactive' | 'deorbited';

export interface Satellite {
  id: string;
  name: string;
  noradId: string;
  orbitType: OrbitType;
  altitude: number; // km
  velocity: number; // km/s
  operator: string;
  country: string;
  launchDate: string;
  status: SatelliteStatus;
  purpose: string;
  mass: number | null; // kg
  period: number | null; // minutes
  inclination: number | null; // degrees
  apogee: number | null; // km
  perigee: number | null; // km
  description: string | null;
}

// Mock satellite data
const SATELLITES: Satellite[] = [
  // ISS and Space Stations
  {
    id: 'iss-zarya',
    name: 'International Space Station (ISS)',
    noradId: '25544',
    orbitType: 'LEO',
    altitude: 420,
    velocity: 7.66,
    operator: 'NASA/Roscosmos/ESA/JAXA/CSA',
    country: 'International',
    launchDate: '1998-11-20',
    status: 'active',
    purpose: 'Space Station',
    mass: 420000,
    period: 92.68,
    inclination: 51.64,
    apogee: 422,
    perigee: 418,
    description: 'The largest modular space station in low Earth orbit. Continuously occupied since November 2000.',
  },
  {
    id: 'tiangong',
    name: 'Tiangong Space Station',
    noradId: '48274',
    orbitType: 'LEO',
    altitude: 390,
    velocity: 7.68,
    operator: 'CNSA',
    country: 'China',
    launchDate: '2021-04-29',
    status: 'active',
    purpose: 'Space Station',
    mass: 100000,
    period: 91.5,
    inclination: 41.47,
    apogee: 395,
    perigee: 385,
    description: 'China\'s modular space station, the third-largest space station currently in orbit.',
  },
  // Starlink Constellation
  {
    id: 'starlink-1007',
    name: 'Starlink-1007',
    noradId: '44713',
    orbitType: 'LEO',
    altitude: 550,
    velocity: 7.59,
    operator: 'SpaceX',
    country: 'USA',
    launchDate: '2019-11-11',
    status: 'active',
    purpose: 'Communications',
    mass: 260,
    period: 95.6,
    inclination: 53.0,
    apogee: 555,
    perigee: 545,
    description: 'Part of SpaceX\'s Starlink satellite internet constellation.',
  },
  {
    id: 'starlink-2547',
    name: 'Starlink-2547',
    noradId: '48601',
    orbitType: 'LEO',
    altitude: 550,
    velocity: 7.59,
    operator: 'SpaceX',
    country: 'USA',
    launchDate: '2021-05-09',
    status: 'active',
    purpose: 'Communications',
    mass: 295,
    period: 95.6,
    inclination: 53.0,
    apogee: 555,
    perigee: 545,
    description: 'Part of SpaceX\'s Starlink V1.5 satellite internet constellation.',
  },
  {
    id: 'starlink-5001',
    name: 'Starlink-5001',
    noradId: '55001',
    orbitType: 'LEO',
    altitude: 540,
    velocity: 7.60,
    operator: 'SpaceX',
    country: 'USA',
    launchDate: '2023-03-15',
    status: 'active',
    purpose: 'Communications',
    mass: 800,
    period: 95.2,
    inclination: 43.0,
    apogee: 545,
    perigee: 535,
    description: 'Part of SpaceX\'s Starlink V2 Mini satellite constellation with direct-to-cell capability.',
  },
  // GPS Constellation
  {
    id: 'gps-iif-1',
    name: 'GPS IIF-1 (USA-213)',
    noradId: '36585',
    orbitType: 'MEO',
    altitude: 20200,
    velocity: 3.87,
    operator: 'US Space Force',
    country: 'USA',
    launchDate: '2010-05-28',
    status: 'active',
    purpose: 'Navigation',
    mass: 1630,
    period: 718,
    inclination: 55.0,
    apogee: 20459,
    perigee: 20131,
    description: 'Part of the Global Positioning System Block IIF constellation.',
  },
  {
    id: 'gps-iii-sv01',
    name: 'GPS III SV01 (USA-289)',
    noradId: '43873',
    orbitType: 'MEO',
    altitude: 20200,
    velocity: 3.87,
    operator: 'US Space Force',
    country: 'USA',
    launchDate: '2018-12-23',
    status: 'active',
    purpose: 'Navigation',
    mass: 3880,
    period: 718,
    inclination: 55.0,
    apogee: 20459,
    perigee: 20131,
    description: 'First GPS III satellite with improved accuracy and anti-jamming capabilities.',
  },
  {
    id: 'gps-iii-sv06',
    name: 'GPS III SV06 (USA-319)',
    noradId: '51684',
    orbitType: 'MEO',
    altitude: 20200,
    velocity: 3.87,
    operator: 'US Space Force',
    country: 'USA',
    launchDate: '2023-01-18',
    status: 'active',
    purpose: 'Navigation',
    mass: 3880,
    period: 718,
    inclination: 55.0,
    apogee: 20459,
    perigee: 20131,
    description: 'GPS III satellite with enhanced signal strength and cyber hardening.',
  },
  // Weather Satellites
  {
    id: 'goes-16',
    name: 'GOES-16 (GOES-East)',
    noradId: '41866',
    orbitType: 'GEO',
    altitude: 35786,
    velocity: 3.07,
    operator: 'NOAA',
    country: 'USA',
    launchDate: '2016-11-19',
    status: 'active',
    purpose: 'Weather',
    mass: 5192,
    period: 1436,
    inclination: 0.05,
    apogee: 35790,
    perigee: 35782,
    description: 'Geostationary weather satellite providing real-time weather imagery and data for the Americas.',
  },
  {
    id: 'goes-18',
    name: 'GOES-18 (GOES-West)',
    noradId: '51850',
    orbitType: 'GEO',
    altitude: 35786,
    velocity: 3.07,
    operator: 'NOAA',
    country: 'USA',
    launchDate: '2022-03-01',
    status: 'active',
    purpose: 'Weather',
    mass: 5192,
    period: 1436,
    inclination: 0.02,
    apogee: 35790,
    perigee: 35782,
    description: 'Advanced geostationary weather satellite for Western Hemisphere monitoring.',
  },
  {
    id: 'himawari-8',
    name: 'Himawari-8',
    noradId: '40267',
    orbitType: 'GEO',
    altitude: 35786,
    velocity: 3.07,
    operator: 'JMA',
    country: 'Japan',
    launchDate: '2014-10-07',
    status: 'active',
    purpose: 'Weather',
    mass: 3500,
    period: 1436,
    inclination: 0.0,
    apogee: 35793,
    perigee: 35779,
    description: 'Japanese weather satellite providing imagery of Asia-Pacific region.',
  },
  {
    id: 'meteosat-11',
    name: 'Meteosat-11',
    noradId: '40732',
    orbitType: 'GEO',
    altitude: 35786,
    velocity: 3.07,
    operator: 'EUMETSAT',
    country: 'Europe',
    launchDate: '2015-07-15',
    status: 'active',
    purpose: 'Weather',
    mass: 2100,
    period: 1436,
    inclination: 0.1,
    apogee: 35800,
    perigee: 35772,
    description: 'European weather satellite monitoring Europe and Africa.',
  },
  // Earth Observation
  {
    id: 'landsat-9',
    name: 'Landsat 9',
    noradId: '49260',
    orbitType: 'SSO',
    altitude: 705,
    velocity: 7.50,
    operator: 'NASA/USGS',
    country: 'USA',
    launchDate: '2021-09-27',
    status: 'active',
    purpose: 'Earth Observation',
    mass: 2864,
    period: 99.0,
    inclination: 98.2,
    apogee: 708,
    perigee: 702,
    description: 'Earth observation satellite continuing the Landsat program\'s 50-year record of land imaging.',
  },
  {
    id: 'sentinel-2a',
    name: 'Sentinel-2A',
    noradId: '40697',
    orbitType: 'SSO',
    altitude: 786,
    velocity: 7.45,
    operator: 'ESA',
    country: 'Europe',
    launchDate: '2015-06-23',
    status: 'active',
    purpose: 'Earth Observation',
    mass: 1140,
    period: 100.6,
    inclination: 98.62,
    apogee: 789,
    perigee: 783,
    description: 'Part of the Copernicus Programme, providing high-resolution optical imagery.',
  },
  {
    id: 'worldview-3',
    name: 'WorldView-3',
    noradId: '40115',
    orbitType: 'SSO',
    altitude: 617,
    velocity: 7.55,
    operator: 'Maxar',
    country: 'USA',
    launchDate: '2014-08-13',
    status: 'active',
    purpose: 'Earth Observation',
    mass: 2800,
    period: 97.0,
    inclination: 97.9,
    apogee: 620,
    perigee: 614,
    description: 'Commercial Earth observation satellite with 31cm resolution capability.',
  },
  // Communications (GEO)
  {
    id: 'ses-17',
    name: 'SES-17',
    noradId: '49055',
    orbitType: 'GEO',
    altitude: 35786,
    velocity: 3.07,
    operator: 'SES',
    country: 'Luxembourg',
    launchDate: '2021-10-23',
    status: 'active',
    purpose: 'Communications',
    mass: 6411,
    period: 1436,
    inclination: 0.05,
    apogee: 35795,
    perigee: 35777,
    description: 'High-throughput satellite providing connectivity over the Americas and Atlantic Ocean.',
  },
  {
    id: 'viasat-3-americas',
    name: 'ViaSat-3 Americas',
    noradId: '56551',
    orbitType: 'GEO',
    altitude: 35786,
    velocity: 3.07,
    operator: 'Viasat',
    country: 'USA',
    launchDate: '2023-04-30',
    status: 'active',
    purpose: 'Communications',
    mass: 6400,
    period: 1436,
    inclination: 0.0,
    apogee: 35790,
    perigee: 35782,
    description: 'Ultra high-capacity broadband satellite with over 1 Tbps capacity.',
  },
  {
    id: 'intelsat-40e',
    name: 'Intelsat 40e',
    noradId: '56987',
    orbitType: 'GEO',
    altitude: 35786,
    velocity: 3.07,
    operator: 'Intelsat',
    country: 'USA',
    launchDate: '2024-01-08',
    status: 'active',
    purpose: 'Communications',
    mass: 5500,
    period: 1436,
    inclination: 0.0,
    apogee: 35792,
    perigee: 35780,
    description: 'Software-defined satellite with NASA\'s TEMPO air quality monitoring instrument.',
  },
  // OneWeb Constellation
  {
    id: 'oneweb-0012',
    name: 'OneWeb-0012',
    noradId: '44057',
    orbitType: 'LEO',
    altitude: 1200,
    velocity: 7.32,
    operator: 'OneWeb',
    country: 'UK',
    launchDate: '2019-02-27',
    status: 'active',
    purpose: 'Communications',
    mass: 147,
    period: 109.4,
    inclination: 87.9,
    apogee: 1205,
    perigee: 1195,
    description: 'Part of OneWeb\'s global internet constellation in polar orbit.',
  },
  // Iridium NEXT
  {
    id: 'iridium-next-100',
    name: 'Iridium NEXT 100',
    noradId: '42803',
    orbitType: 'LEO',
    altitude: 780,
    velocity: 7.46,
    operator: 'Iridium',
    country: 'USA',
    launchDate: '2017-01-14',
    status: 'active',
    purpose: 'Communications',
    mass: 860,
    period: 100.4,
    inclination: 86.4,
    apogee: 783,
    perigee: 777,
    description: 'Part of the Iridium NEXT constellation providing global voice and data coverage.',
  },
  // Scientific/Research
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    noradId: '20580',
    orbitType: 'LEO',
    altitude: 540,
    velocity: 7.59,
    operator: 'NASA/ESA',
    country: 'USA',
    launchDate: '1990-04-24',
    status: 'active',
    purpose: 'Research',
    mass: 11110,
    period: 95.4,
    inclination: 28.5,
    apogee: 545,
    perigee: 535,
    description: 'Space telescope that has provided unprecedented deep-space imagery since 1990.',
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    noradId: '50463',
    orbitType: 'HEO',
    altitude: 1500000,
    velocity: 0.21,
    operator: 'NASA/ESA/CSA',
    country: 'USA',
    launchDate: '2021-12-25',
    status: 'active',
    purpose: 'Research',
    mass: 6500,
    period: null,
    inclination: null,
    apogee: 1500000,
    perigee: 250000,
    description: 'Infrared space telescope at L2 Lagrange point, successor to Hubble.',
  },
  {
    id: 'chandra',
    name: 'Chandra X-ray Observatory',
    noradId: '25867',
    orbitType: 'HEO',
    altitude: 139000,
    velocity: 1.8,
    operator: 'NASA',
    country: 'USA',
    launchDate: '1999-07-23',
    status: 'active',
    purpose: 'Research',
    mass: 4800,
    period: 3808,
    inclination: 76.7,
    apogee: 133000,
    perigee: 16000,
    description: 'X-ray telescope detecting emissions from very hot regions of the universe.',
  },
  // Military/Reconnaissance (publicly known)
  {
    id: 'usa-224',
    name: 'USA-224 (KH-11)',
    noradId: '37348',
    orbitType: 'LEO',
    altitude: 400,
    velocity: 7.67,
    operator: 'NRO',
    country: 'USA',
    launchDate: '2011-01-20',
    status: 'active',
    purpose: 'Reconnaissance',
    mass: 19600,
    period: 92.5,
    inclination: 97.9,
    apogee: 1000,
    perigee: 250,
    description: 'National Reconnaissance Office optical imaging satellite.',
  },
  // Inactive/Deorbited examples
  {
    id: 'envisat',
    name: 'Envisat',
    noradId: '27386',
    orbitType: 'SSO',
    altitude: 790,
    velocity: 7.45,
    operator: 'ESA',
    country: 'Europe',
    launchDate: '2002-03-01',
    status: 'inactive',
    purpose: 'Earth Observation',
    mass: 8211,
    period: 100.6,
    inclination: 98.55,
    apogee: 792,
    perigee: 788,
    description: 'Former ESA environmental satellite, contact lost in 2012. Now space debris.',
  },
  {
    id: 'cosmos-954',
    name: 'Cosmos 954',
    noradId: '10361',
    orbitType: 'LEO',
    altitude: 0,
    velocity: 0,
    operator: 'Soviet Space Forces',
    country: 'Russia',
    launchDate: '1977-09-18',
    status: 'deorbited',
    purpose: 'Reconnaissance',
    mass: 3800,
    period: null,
    inclination: null,
    apogee: null,
    perigee: null,
    description: 'Nuclear-powered radar satellite that re-entered over Canada in 1978, spreading radioactive debris.',
  },
  // Planet Labs
  {
    id: 'planetscope-001',
    name: 'PlanetScope Dove-001',
    noradId: '44001',
    orbitType: 'SSO',
    altitude: 475,
    velocity: 7.62,
    operator: 'Planet Labs',
    country: 'USA',
    launchDate: '2019-01-01',
    status: 'active',
    purpose: 'Earth Observation',
    mass: 5,
    period: 94.0,
    inclination: 97.4,
    apogee: 478,
    perigee: 472,
    description: 'Small CubeSat Earth imaging satellite, part of Planet\'s 200+ satellite constellation.',
  },
  // Galileo Navigation
  {
    id: 'galileo-fm1',
    name: 'GSAT0101 (Galileo FM1)',
    noradId: '37846',
    orbitType: 'MEO',
    altitude: 23222,
    velocity: 3.67,
    operator: 'ESA/EU',
    country: 'Europe',
    launchDate: '2011-10-21',
    status: 'active',
    purpose: 'Navigation',
    mass: 700,
    period: 843,
    inclination: 56.0,
    apogee: 23250,
    perigee: 23194,
    description: 'Part of the European Galileo global navigation satellite system.',
  },
  // GLONASS
  {
    id: 'glonass-m-758',
    name: 'GLONASS-M 758',
    noradId: '41554',
    orbitType: 'MEO',
    altitude: 19140,
    velocity: 3.95,
    operator: 'Roscosmos',
    country: 'Russia',
    launchDate: '2016-05-29',
    status: 'active',
    purpose: 'Navigation',
    mass: 1415,
    period: 675,
    inclination: 64.8,
    apogee: 19170,
    perigee: 19110,
    description: 'Part of Russia\'s GLONASS global navigation satellite system.',
  },
  // BeiDou
  {
    id: 'beidou-3-m1',
    name: 'BeiDou-3 M1',
    noradId: '43001',
    orbitType: 'MEO',
    altitude: 21528,
    velocity: 3.77,
    operator: 'CNSA',
    country: 'China',
    launchDate: '2017-11-05',
    status: 'active',
    purpose: 'Navigation',
    mass: 1014,
    period: 773,
    inclination: 55.0,
    apogee: 21550,
    perigee: 21506,
    description: 'Part of China\'s BeiDou-3 global navigation satellite system.',
  },
  // Amazon Kuiper
  {
    id: 'kuiper-prototype-1',
    name: 'KuiperSat-1',
    noradId: '58001',
    orbitType: 'LEO',
    altitude: 590,
    velocity: 7.56,
    operator: 'Amazon',
    country: 'USA',
    launchDate: '2023-10-06',
    status: 'active',
    purpose: 'Communications',
    mass: 500,
    period: 96.5,
    inclination: 51.9,
    apogee: 595,
    perigee: 585,
    description: 'Prototype satellite for Amazon\'s Project Kuiper broadband constellation.',
  },
];

// Compute stats
function computeStats(satellites: Satellite[]) {
  const byOrbitType: Record<OrbitType, number> = {
    LEO: 0,
    MEO: 0,
    GEO: 0,
    HEO: 0,
    SSO: 0,
    Polar: 0,
  };

  const byOperator: Record<string, number> = {};
  const byStatus: Record<SatelliteStatus, number> = {
    active: 0,
    inactive: 0,
    deorbited: 0,
  };
  const byPurpose: Record<string, number> = {};

  satellites.forEach((sat) => {
    byOrbitType[sat.orbitType]++;
    byStatus[sat.status]++;
    byOperator[sat.operator] = (byOperator[sat.operator] || 0) + 1;
    byPurpose[sat.purpose] = (byPurpose[sat.purpose] || 0) + 1;
  });

  // Get top operators
  const topOperators = Object.entries(byOperator)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    total: satellites.length,
    byOrbitType,
    byStatus,
    byPurpose,
    topOperators,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orbitType = searchParams.get('orbitType') as OrbitType | null;
    const operator = searchParams.get('operator');
    const status = searchParams.get('status') as SatelliteStatus | null;
    const purpose = searchParams.get('purpose');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');

    let filteredSatellites = [...SATELLITES];

    // Apply filters
    if (orbitType) {
      filteredSatellites = filteredSatellites.filter((s) => s.orbitType === orbitType);
    }
    if (operator) {
      filteredSatellites = filteredSatellites.filter((s) =>
        s.operator.toLowerCase().includes(operator.toLowerCase())
      );
    }
    if (status) {
      filteredSatellites = filteredSatellites.filter((s) => s.status === status);
    }
    if (purpose) {
      filteredSatellites = filteredSatellites.filter((s) =>
        s.purpose.toLowerCase().includes(purpose.toLowerCase())
      );
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSatellites = filteredSatellites.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.noradId.includes(search) ||
          s.operator.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit
    const satellites = filteredSatellites.slice(0, limit);

    // Compute stats from all satellites (unfiltered)
    const stats = computeStats(SATELLITES);

    // Find ISS for highlight
    const iss = SATELLITES.find((s) => s.id === 'iss-zarya');

    // Get notable satellites (space stations, telescopes, newest)
    const notableSatellites = SATELLITES.filter(
      (s) =>
        s.purpose === 'Space Station' ||
        s.purpose === 'Research' ||
        s.name.includes('GPS III') ||
        s.name.includes('GOES')
    ).slice(0, 5);

    return NextResponse.json({
      satellites,
      stats,
      iss,
      notableSatellites,
      total: filteredSatellites.length,
    });
  } catch (error) {
    logger.error('Failed to fetch satellite data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch satellite data' },
      { status: 500 }
    );
  }
}
