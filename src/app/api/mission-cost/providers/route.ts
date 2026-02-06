export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// ────────────────────────────────────────
// Launch Provider Data
// ────────────────────────────────────────

export interface LaunchProviderDetails {
  id: string;
  name: string;
  vehicle: string;
  country: string;
  headquarters: string;
  founded: number;
  website: string;

  // Performance specs
  maxPayloadLEO: number;
  maxPayloadGTO: number | null;
  maxPayloadGEO: number | null;
  maxPayloadLunar: number | null;

  // Pricing
  costPerKgLEO: { min: number; max: number };
  dedicatedCostM: number | null;
  rideshareMinCost: number | null;

  // Reliability & History
  totalFlights: number;
  successfulFlights: number;
  reliability: number;
  firstFlight: string;
  lastFlight: string;

  // Capabilities
  reusable: boolean;
  reusabilityType: string | null;
  turnaroundDays: number | null;

  supportsLEO: boolean;
  supportsSSO: boolean;
  supportsGTO: boolean;
  supportsGEO: boolean;
  supportsLunar: boolean;
  supportsMars: boolean;
  supportsCrewed: boolean;

  // Additional info
  propellant: string;
  stages: number;
  height: number; // meters
  diameter: number; // meters
  liftoffMass: number; // kg

  description: string;
  keyCustomers: string[];
  upcomingEnhancements: string[];
}

const LAUNCH_PROVIDERS: LaunchProviderDetails[] = [
  {
    id: 'spacex-f9',
    name: 'SpaceX',
    vehicle: 'Falcon 9',
    country: 'USA',
    headquarters: 'Hawthorne, California',
    founded: 2002,
    website: 'https://www.spacex.com',

    maxPayloadLEO: 22800,
    maxPayloadGTO: 8300,
    maxPayloadGEO: null,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 2720, max: 3300 },
    dedicatedCostM: 67,
    rideshareMinCost: 275000,

    totalFlights: 320,
    successfulFlights: 317,
    reliability: 0.99,
    firstFlight: '2010-06-04',
    lastFlight: '2024-12-15',

    reusable: true,
    reusabilityType: 'First stage landing (drone ship/RTLS)',
    turnaroundDays: 14,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: true,

    propellant: 'LOX/RP-1',
    stages: 2,
    height: 70,
    diameter: 3.7,
    liftoffMass: 549054,

    description: 'The industry workhorse and most-launched orbital rocket. Revolutionized spaceflight economics through reusability.',
    keyCustomers: ['NASA', 'Starlink', 'US Space Force', 'Commercial GEO operators'],
    upcomingEnhancements: ['Falcon 9 Block 6 with extended fairing'],
  },
  {
    id: 'spacex-fh',
    name: 'SpaceX',
    vehicle: 'Falcon Heavy',
    country: 'USA',
    headquarters: 'Hawthorne, California',
    founded: 2002,
    website: 'https://www.spacex.com',

    maxPayloadLEO: 63800,
    maxPayloadGTO: 26700,
    maxPayloadGEO: 16000,
    maxPayloadLunar: 15000,

    costPerKgLEO: { min: 1400, max: 2350 },
    dedicatedCostM: 150,
    rideshareMinCost: null,

    totalFlights: 12,
    successfulFlights: 12,
    reliability: 1.0,
    firstFlight: '2018-02-06',
    lastFlight: '2024-10-28',

    reusable: true,
    reusabilityType: 'Triple booster landing capability',
    turnaroundDays: 30,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: true,
    supportsCrewed: false,

    propellant: 'LOX/RP-1',
    stages: 2,
    height: 70,
    diameter: 12.2,
    liftoffMass: 1420788,

    description: 'The most powerful operational rocket. Three Falcon 9 cores strapped together for heavy-lift missions.',
    keyCustomers: ['NASA', 'US Space Force', 'National security missions'],
    upcomingEnhancements: ['Improved center core recovery'],
  },
  {
    id: 'spacex-starship',
    name: 'SpaceX',
    vehicle: 'Starship',
    country: 'USA',
    headquarters: 'Hawthorne, California',
    founded: 2002,
    website: 'https://www.spacex.com',

    maxPayloadLEO: 150000,
    maxPayloadGTO: 100000,
    maxPayloadGEO: 50000,
    maxPayloadLunar: 100000,

    costPerKgLEO: { min: 100, max: 500 },
    dedicatedCostM: 10,
    rideshareMinCost: 1000000,

    totalFlights: 6,
    successfulFlights: 4,
    reliability: 0.67,
    firstFlight: '2023-04-20',
    lastFlight: '2024-11-19',

    reusable: true,
    reusabilityType: 'Fully reusable (booster catch, ship landing)',
    turnaroundDays: 1,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: true,
    supportsCrewed: true,

    propellant: 'LOX/CH4',
    stages: 2,
    height: 121,
    diameter: 9,
    liftoffMass: 5000000,

    description: 'The most powerful rocket ever built. Designed for Mars colonization with full reusability.',
    keyCustomers: ['NASA Artemis', 'Starlink V2', 'Point-to-point transport'],
    upcomingEnhancements: ['Orbital refueling', 'Rapid turnaround operations'],
  },
  {
    id: 'ula-vulcan',
    name: 'ULA',
    vehicle: 'Vulcan Centaur',
    country: 'USA',
    headquarters: 'Centennial, Colorado',
    founded: 2006,
    website: 'https://www.ulalaunch.com',

    maxPayloadLEO: 27200,
    maxPayloadGTO: 14400,
    maxPayloadGEO: null,
    maxPayloadLunar: 10000,

    costPerKgLEO: { min: 3700, max: 7400 },
    dedicatedCostM: 110,
    rideshareMinCost: null,

    totalFlights: 2,
    successfulFlights: 2,
    reliability: 1.0,
    firstFlight: '2024-01-08',
    lastFlight: '2024-10-04',

    reusable: false,
    reusabilityType: 'SMART reuse (engine recovery planned)',
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: false,
    supportsCrewed: true,

    propellant: 'LOX/CH4 (BE-4)',
    stages: 2,
    height: 61.6,
    diameter: 5.4,
    liftoffMass: 546700,

    description: 'ULA\'s next-generation rocket replacing Atlas V and Delta IV. Built for national security missions.',
    keyCustomers: ['US Space Force', 'NASA', 'National Reconnaissance Office'],
    upcomingEnhancements: ['SMART engine recovery', 'Heavy variant'],
  },
  {
    id: 'rocketlab-electron',
    name: 'Rocket Lab',
    vehicle: 'Electron',
    country: 'USA/NZ',
    headquarters: 'Long Beach, California',
    founded: 2006,
    website: 'https://www.rocketlabusa.com',

    maxPayloadLEO: 300,
    maxPayloadGTO: null,
    maxPayloadGEO: null,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 18000, max: 28000 },
    dedicatedCostM: 7.5,
    rideshareMinCost: 1000000,

    totalFlights: 52,
    successfulFlights: 47,
    reliability: 0.90,
    firstFlight: '2017-05-25',
    lastFlight: '2024-12-12',

    reusable: true,
    reusabilityType: 'Helicopter mid-air catch (testing)',
    turnaroundDays: 14,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: false,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,

    propellant: 'LOX/RP-1',
    stages: 2,
    height: 18,
    diameter: 1.2,
    liftoffMass: 12550,

    description: 'The leading dedicated small satellite launch provider. High-frequency launches with responsive access.',
    keyCustomers: ['NASA', 'NRO', 'Commercial smallsat operators', 'Capella Space'],
    upcomingEnhancements: ['First stage reuse', 'Electron Heavy'],
  },
  {
    id: 'rocketlab-neutron',
    name: 'Rocket Lab',
    vehicle: 'Neutron',
    country: 'USA',
    headquarters: 'Long Beach, California',
    founded: 2006,
    website: 'https://www.rocketlabusa.com',

    maxPayloadLEO: 13000,
    maxPayloadGTO: 6000,
    maxPayloadGEO: null,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 3500, max: 5500 },
    dedicatedCostM: 55,
    rideshareMinCost: null,

    totalFlights: 0,
    successfulFlights: 0,
    reliability: 0.95,
    firstFlight: '2025-H2',
    lastFlight: 'N/A',

    reusable: true,
    reusabilityType: 'First stage RTLS landing',
    turnaroundDays: 7,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,

    propellant: 'LOX/CH4',
    stages: 2,
    height: 40,
    diameter: 5,
    liftoffMass: 480000,

    description: 'Rocket Lab\'s medium-lift reusable rocket designed for constellation deployment.',
    keyCustomers: ['Constellation operators', 'Government missions'],
    upcomingEnhancements: ['First flight 2025', 'Rapid reuse capability'],
  },
  {
    id: 'blue-origin-ng',
    name: 'Blue Origin',
    vehicle: 'New Glenn',
    country: 'USA',
    headquarters: 'Kent, Washington',
    founded: 2000,
    website: 'https://www.blueorigin.com',

    maxPayloadLEO: 45000,
    maxPayloadGTO: 13000,
    maxPayloadGEO: null,
    maxPayloadLunar: 10000,

    costPerKgLEO: { min: 1500, max: 2200 },
    dedicatedCostM: 68,
    rideshareMinCost: null,

    totalFlights: 1,
    successfulFlights: 1,
    reliability: 1.0,
    firstFlight: '2025-01-16',
    lastFlight: '2025-01-16',

    reusable: true,
    reusabilityType: 'First stage landing on drone ship',
    turnaroundDays: 25,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: false,
    supportsCrewed: false,

    propellant: 'LOX/CH4',
    stages: 2,
    height: 98,
    diameter: 7,
    liftoffMass: 1300000,

    description: 'Blue Origin\'s heavy-lift orbital rocket with reusable first stage. Designed for high reliability.',
    keyCustomers: ['NASA', 'Amazon Kuiper', 'Telesat'],
    upcomingEnhancements: ['New Glenn Heavy', 'Crew capability'],
  },
  {
    id: 'isro-pslv',
    name: 'ISRO',
    vehicle: 'PSLV',
    country: 'India',
    headquarters: 'Bengaluru, India',
    founded: 1969,
    website: 'https://www.isro.gov.in',

    maxPayloadLEO: 3800,
    maxPayloadGTO: 1425,
    maxPayloadGEO: null,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 3950, max: 8420 },
    dedicatedCostM: 30,
    rideshareMinCost: 500000,

    totalFlights: 62,
    successfulFlights: 59,
    reliability: 0.95,
    firstFlight: '1993-09-20',
    lastFlight: '2024-11-27',

    reusable: false,
    reusabilityType: null,
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,

    propellant: 'Solid + hypergolic',
    stages: 4,
    height: 44,
    diameter: 2.8,
    liftoffMass: 320000,

    description: 'India\'s reliable workhorse for polar orbit missions. Excellent value for small/medium satellites.',
    keyCustomers: ['ISRO', 'International commercial customers', 'European operators'],
    upcomingEnhancements: ['PSLV-DL and QL variants'],
  },
  {
    id: 'isro-lvm3',
    name: 'ISRO',
    vehicle: 'LVM3 (GSLV Mk III)',
    country: 'India',
    headquarters: 'Bengaluru, India',
    founded: 1969,
    website: 'https://www.isro.gov.in',

    maxPayloadLEO: 10000,
    maxPayloadGTO: 4000,
    maxPayloadGEO: null,
    maxPayloadLunar: 3500,

    costPerKgLEO: { min: 4000, max: 6000 },
    dedicatedCostM: 50,
    rideshareMinCost: null,

    totalFlights: 8,
    successfulFlights: 7,
    reliability: 0.88,
    firstFlight: '2014-12-18',
    lastFlight: '2024-03-14',

    reusable: false,
    reusabilityType: null,
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: true,
    supportsMars: false,
    supportsCrewed: true,

    propellant: 'Solid + LOX/LH2',
    stages: 3,
    height: 43.4,
    diameter: 4,
    liftoffMass: 640000,

    description: 'India\'s heavy-lift rocket for GTO and lunar missions. Carried Chandrayaan missions.',
    keyCustomers: ['ISRO', 'OneWeb', 'Gaganyaan crew program'],
    upcomingEnhancements: ['LVM3 Mk2', 'Human-rated version'],
  },
  {
    id: 'arianespace-a6',
    name: 'Arianespace',
    vehicle: 'Ariane 6',
    country: 'France/EU',
    headquarters: 'Evry-Courcouronnes, France',
    founded: 1980,
    website: 'https://www.arianespace.com',

    maxPayloadLEO: 21600,
    maxPayloadGTO: 11500,
    maxPayloadGEO: 5000,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 3600, max: 5900 },
    dedicatedCostM: 75,
    rideshareMinCost: null,

    totalFlights: 2,
    successfulFlights: 2,
    reliability: 1.0,
    firstFlight: '2024-07-09',
    lastFlight: '2024-12-03',

    reusable: false,
    reusabilityType: null,
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,

    propellant: 'LOX/LH2 + Solid',
    stages: 2,
    height: 62,
    diameter: 5.4,
    liftoffMass: 870000,

    description: 'Europe\'s next-generation heavy-lift rocket replacing Ariane 5. Available in 62 and 64 configurations.',
    keyCustomers: ['ESA', 'EU Commission', 'Commercial GEO operators'],
    upcomingEnhancements: ['Ariane 6 evolution with reusable Prometheus engine'],
  },
  {
    id: 'arianespace-vega',
    name: 'Arianespace',
    vehicle: 'Vega C',
    country: 'Italy/EU',
    headquarters: 'Evry-Courcouronnes, France',
    founded: 1980,
    website: 'https://www.arianespace.com',

    maxPayloadLEO: 2300,
    maxPayloadGTO: 1500,
    maxPayloadGEO: null,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 14000, max: 20000 },
    dedicatedCostM: 37,
    rideshareMinCost: 1500000,

    totalFlights: 3,
    successfulFlights: 2,
    reliability: 0.67,
    firstFlight: '2022-07-13',
    lastFlight: '2024-09-04',

    reusable: false,
    reusabilityType: null,
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,

    propellant: 'Solid + hypergolic',
    stages: 4,
    height: 34.8,
    diameter: 3.4,
    liftoffMass: 210000,

    description: 'European small/medium-lift rocket for polar and SSO missions. SSMS rideshare service.',
    keyCustomers: ['ESA', 'European institutions', 'Commercial smallsat operators'],
    upcomingEnhancements: ['Vega E with liquid upper stage'],
  },
  {
    id: 'jaxa-h3',
    name: 'JAXA/MHI',
    vehicle: 'H3',
    country: 'Japan',
    headquarters: 'Tokyo, Japan',
    founded: 2003,
    website: 'https://www.jaxa.jp',

    maxPayloadLEO: 16500,
    maxPayloadGTO: 6500,
    maxPayloadGEO: 3500,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 4500, max: 7000 },
    dedicatedCostM: 50,
    rideshareMinCost: null,

    totalFlights: 4,
    successfulFlights: 3,
    reliability: 0.75,
    firstFlight: '2023-03-07',
    lastFlight: '2024-11-04',

    reusable: false,
    reusabilityType: null,
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,

    propellant: 'LOX/LH2',
    stages: 2,
    height: 63,
    diameter: 5.2,
    liftoffMass: 574000,

    description: 'Japan\'s next-generation flagship rocket designed for 50% cost reduction vs H-IIA.',
    keyCustomers: ['JAXA', 'Japanese government', 'Commercial operators'],
    upcomingEnhancements: ['H3-24 heavy configuration', 'International commercial service'],
  },
  {
    id: 'china-lm5',
    name: 'CASC',
    vehicle: 'Long March 5',
    country: 'China',
    headquarters: 'Beijing, China',
    founded: 1956,
    website: 'https://www.spacechina.com',

    maxPayloadLEO: 25000,
    maxPayloadGTO: 14000,
    maxPayloadGEO: 8000,
    maxPayloadLunar: 9000,

    costPerKgLEO: { min: 3000, max: 5000 },
    dedicatedCostM: 100,
    rideshareMinCost: null,

    totalFlights: 14,
    successfulFlights: 13,
    reliability: 0.93,
    firstFlight: '2016-11-03',
    lastFlight: '2024-11-15',

    reusable: false,
    reusabilityType: null,
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: true,
    supportsCrewed: false,

    propellant: 'LOX/LH2 + LOX/RP-1',
    stages: 2,
    height: 62,
    diameter: 5,
    liftoffMass: 869000,

    description: 'China\'s most powerful rocket for heavy-lift missions. Limited for Western customers due to ITAR.',
    keyCustomers: ['CNSA', 'Chinese space station', 'Lunar exploration'],
    upcomingEnhancements: ['Long March 5 DY cargo variant', 'Long March 9 super-heavy'],
  },
  {
    id: 'roscosmos-soyuz',
    name: 'Roscosmos',
    vehicle: 'Soyuz-2',
    country: 'Russia',
    headquarters: 'Moscow, Russia',
    founded: 1992,
    website: 'https://www.roscosmos.ru',

    maxPayloadLEO: 8200,
    maxPayloadGTO: 3250,
    maxPayloadGEO: null,
    maxPayloadLunar: null,

    costPerKgLEO: { min: 4500, max: 7500 },
    dedicatedCostM: 48,
    rideshareMinCost: null,

    totalFlights: 1750,
    successfulFlights: 1720,
    reliability: 0.98,
    firstFlight: '2004-11-08',
    lastFlight: '2024-12-01',

    reusable: false,
    reusabilityType: null,
    turnaroundDays: null,

    supportsLEO: true,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: true,

    propellant: 'LOX/RP-1',
    stages: 3,
    height: 46.3,
    diameter: 10.3,
    liftoffMass: 312000,

    description: 'The most-launched rocket family in history. Limited commercial availability due to sanctions.',
    keyCustomers: ['Roscosmos', 'Russian military', 'ISS crew transport'],
    upcomingEnhancements: ['Soyuz-6 replacement program'],
  },
];

// ────────────────────────────────────────
// API Handler
// ────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('id');
    const country = searchParams.get('country');
    const supportsOrbit = searchParams.get('orbit');
    const minPayload = parseFloat(searchParams.get('minPayload') || '0');
    const reusable = searchParams.get('reusable');

    let providers = [...LAUNCH_PROVIDERS];

    // Filter by provider ID
    if (providerId) {
      providers = providers.filter(p => p.id === providerId);
    }

    // Filter by country
    if (country) {
      providers = providers.filter(p =>
        p.country.toLowerCase().includes(country.toLowerCase())
      );
    }

    // Filter by orbit capability
    if (supportsOrbit) {
      providers = providers.filter(p => {
        switch (supportsOrbit.toUpperCase()) {
          case 'LEO': return p.supportsLEO;
          case 'SSO': return p.supportsSSO;
          case 'GTO': return p.supportsGTO;
          case 'GEO': return p.supportsGEO;
          case 'LUNAR': return p.supportsLunar;
          case 'MARS': return p.supportsMars;
          default: return true;
        }
      });
    }

    // Filter by minimum payload capacity
    if (minPayload > 0) {
      providers = providers.filter(p => p.maxPayloadLEO >= minPayload);
    }

    // Filter by reusability
    if (reusable !== null) {
      const isReusable = reusable === 'true';
      providers = providers.filter(p => p.reusable === isReusable);
    }

    // Sort by reliability then by cost
    providers.sort((a, b) => {
      if (b.reliability !== a.reliability) return b.reliability - a.reliability;
      return a.costPerKgLEO.min - b.costPerKgLEO.min;
    });

    return NextResponse.json({
      providers,
      count: providers.length,
      filters: {
        providerId,
        country,
        supportsOrbit,
        minPayload,
        reusable,
      },
    });
  } catch (error) {
    console.error('Failed to fetch launch providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch launch providers' },
      { status: 500 }
    );
  }
}
