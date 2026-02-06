/**
 * Mission Cost Simulator Data
 *
 * Comprehensive data for space launch costs, insurance premiums, and regulatory fees.
 * Data sourced from public information as of 2024-2025.
 *
 * Sources:
 * - SpaceX, ULA, Rocket Lab, Arianespace, Blue Origin official websites
 * - FAA Office of Commercial Space Transportation
 * - FCC Regulatory Fees Orders
 * - ITU Cost Recovery documentation
 * - Industry publications: SpaceNews, Payload Space, Via Satellite
 * - NASA CLPS program documentation
 * - Insurance industry reports from AXA XL, Swiss Re, Lloyd's
 */

import prisma from './db';

// =============================================================================
// LAUNCH PROVIDER COSTS
// =============================================================================

export interface LaunchCostData {
  slug: string;
  provider: string;
  vehicle: string;
  country: string;
  status: 'operational' | 'development' | 'retired';
  reusable: boolean;
  firstFlight: number | null;

  // Payload capacities (kg)
  payloadLEO: number | null;
  payloadSSO: number | null;
  payloadGTO: number | null;
  payloadGEO: number | null;
  payloadTLI: number | null; // Trans-Lunar Injection

  // Launch pricing (USD)
  dedicatedLaunchPrice: { min: number; max: number; typical: number } | null;
  ridesharePrice: { perKg: number; minMass: number } | null;

  // Cost per kg by orbit (USD)
  costPerKgLEO: { min: number; max: number; typical: number };
  costPerKgSSO: { min: number; max: number; typical: number } | null;
  costPerKgGTO: { min: number; max: number; typical: number } | null;
  costPerKgGEO: { min: number; max: number; typical: number } | null;
  costPerKgTLI: { min: number; max: number; typical: number } | null;

  notes: string[];
  lastUpdated: string;
}

export const LAUNCH_COST_DATA: LaunchCostData[] = [
  // ==========================================================================
  // SpaceX
  // ==========================================================================
  {
    slug: 'spacex-falcon-9',
    provider: 'SpaceX',
    vehicle: 'Falcon 9 Block 5',
    country: 'USA',
    status: 'operational',
    reusable: true,
    firstFlight: 2018,
    payloadLEO: 22800,
    payloadSSO: 15600,
    payloadGTO: 8300,
    payloadGEO: 5500,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 62000000, max: 75000000, typical: 67000000 },
    ridesharePrice: { perKg: 6000, minMass: 50 },
    costPerKgLEO: { min: 2720, max: 3300, typical: 2940 },
    costPerKgSSO: { min: 4000, max: 5500, typical: 4500 },
    costPerKgGTO: { min: 7500, max: 9000, typical: 8070 },
    costPerKgGEO: { min: 11000, max: 14000, typical: 12180 },
    costPerKgTLI: null,
    notes: [
      'Base price $67M as of 2024 (increased from $62M)',
      'SpaceX Rideshare Program: $6,000/kg to SSO (increasing $500/year)',
      'Minimum rideshare booking: $300,000 for 50kg',
      'Only 6% of 2024 flights used new boosters',
      'Some boosters reused 24+ times',
      'Internal cost estimated at ~$30M per flight with reuse'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'spacex-falcon-heavy',
    provider: 'SpaceX',
    vehicle: 'Falcon Heavy',
    country: 'USA',
    status: 'operational',
    reusable: true,
    firstFlight: 2018,
    payloadLEO: 63800,
    payloadSSO: null,
    payloadGTO: 26700,
    payloadGEO: 12000,
    payloadTLI: 16000,
    dedicatedLaunchPrice: { min: 97000000, max: 150000000, typical: 97000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 1400, max: 2350, typical: 1520 },
    costPerKgSSO: null,
    costPerKgGTO: { min: 3630, max: 5620, typical: 3630 },
    costPerKgGEO: { min: 8000, max: 12500, typical: 8080 },
    costPerKgTLI: { min: 6000, max: 9400, typical: 6060 },
    notes: [
      'Reusable configuration: $97M (8t to GTO)',
      'Expendable configuration: $150M (26.7t to GTO)',
      'Heavy-lift missions for GEO and beyond-Earth destinations',
      'Heaviest GTO payload: 9,200 kg (Jupiter-3, July 2023)'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'spacex-starship',
    provider: 'SpaceX',
    vehicle: 'Starship',
    country: 'USA',
    status: 'development',
    reusable: true,
    firstFlight: 2024,
    payloadLEO: 150000, // Expendable: 200-250t, Reusable: 100-150t
    payloadSSO: 100000,
    payloadGTO: 50000,
    payloadGEO: 21000,
    payloadTLI: 100000,
    dedicatedLaunchPrice: { min: 2000000, max: 90000000, typical: 10000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 10, max: 1200, typical: 100 },
    costPerKgSSO: { min: 20, max: 2000, typical: 200 },
    costPerKgGTO: { min: 40, max: 3000, typical: 400 },
    costPerKgGEO: { min: 100, max: 5000, typical: 1000 },
    costPerKgTLI: { min: 20, max: 2000, typical: 200 },
    notes: [
      'Build cost currently ~$90M, target $20M with scale, ultimately $2-5M',
      'Projected: $100/kg with booster reuse (10x cheaper than Falcon 9)',
      'Target: $10-20/kg with full reusability by 2030',
      'Single-use: $250-600/kg',
      '6 flights reusability: $78-94/kg',
      '20 flights: $32.50/kg',
      'Payload capacity varies significantly by configuration and reuse'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // ULA
  // ==========================================================================
  {
    slug: 'ula-atlas-v',
    provider: 'ULA',
    vehicle: 'Atlas V',
    country: 'USA',
    status: 'operational', // Final 10 launches remaining
    reusable: false,
    firstFlight: 2002,
    payloadLEO: 18850,
    payloadSSO: 15000,
    payloadGTO: 8900,
    payloadGEO: 4750,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 110000000, max: 175000000, typical: 153000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 5800, max: 9300, typical: 8100 },
    costPerKgSSO: { min: 7300, max: 11700, typical: 10200 },
    costPerKgGTO: { min: 12400, max: 19700, typical: 17200 },
    costPerKgGEO: { min: 23200, max: 36800, typical: 32200 },
    costPerKgTLI: null,
    notes: [
      'ULA has stopped selling Atlas V - only 10 launches remaining',
      'Primarily used for national security and NASA missions',
      'Carried astronauts to ISS for first time in June 2024 (Boeing Starliner)',
      'Configurations range from 401 to 551'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'ula-vulcan-centaur',
    provider: 'ULA',
    vehicle: 'Vulcan Centaur',
    country: 'USA',
    status: 'operational',
    reusable: false,
    firstFlight: 2024,
    payloadLEO: 27200, // VC6 configuration
    payloadSSO: 21000,
    payloadGTO: 13600,
    payloadGEO: 7000,
    payloadTLI: 10000,
    dedicatedLaunchPrice: { min: 100000000, max: 200000000, typical: 120000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 3700, max: 7400, typical: 4400 },
    costPerKgSSO: { min: 4800, max: 9500, typical: 5700 },
    costPerKgGTO: { min: 7350, max: 14700, typical: 8800 },
    costPerKgGEO: { min: 14300, max: 28600, typical: 17140 },
    costPerKgTLI: { min: 10000, max: 20000, typical: 12000 },
    notes: [
      'First launch January 8, 2024 (Peregrine lunar lander)',
      'VC6 configuration with six GEM boosters is most capable',
      'NSSL Phase 3 certification flights completed',
      'BE-4 engines from Blue Origin'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // Rocket Lab
  // ==========================================================================
  {
    slug: 'rocketlab-electron',
    provider: 'Rocket Lab',
    vehicle: 'Electron',
    country: 'USA',
    status: 'operational',
    reusable: true, // Partial recovery in development
    firstFlight: 2017,
    payloadLEO: 300,
    payloadSSO: 200,
    payloadGTO: null,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 5500000, max: 8500000, typical: 7500000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 18000, max: 28000, typical: 25000 },
    costPerKgSSO: { min: 27500, max: 42500, typical: 37500 },
    costPerKgGTO: null,
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'Small satellite dedicated launcher',
      'High cost/kg offset by dedicated launch timing and precision',
      'First US soil launch completed successfully',
      'Helicopter catch recovery program in development'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'rocketlab-neutron',
    provider: 'Rocket Lab',
    vehicle: 'Neutron',
    country: 'USA',
    status: 'development',
    reusable: true,
    firstFlight: null, // Expected mid-2026
    payloadLEO: 15000, // Expendable
    payloadSSO: 13000, // Reusable with downrange landing
    payloadGTO: 5000,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 50000000, max: 55000000, typical: 50000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 3300, max: 4230, typical: 3850 },
    costPerKgSSO: { min: 3850, max: 4230, typical: 4000 },
    costPerKgGTO: { min: 10000, max: 11000, typical: 10000 },
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'First flight expected mid-2026 (estimates range to mid-2027)',
      'Target $50M launch price competes directly with Falcon 9',
      'Cost of goods estimated at $20-25M per launch',
      '$4,000/kg matches SpaceX pricing strategy',
      'Launch pad ceremony held September 2025'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // Arianespace
  // ==========================================================================
  {
    slug: 'arianespace-ariane-6',
    provider: 'Arianespace',
    vehicle: 'Ariane 6',
    country: 'FRA',
    status: 'operational',
    reusable: false,
    firstFlight: 2024,
    payloadLEO: 21500, // A64 configuration
    payloadSSO: 15000,
    payloadGTO: 11500, // A64 dual payload
    payloadGEO: 5500,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 77000000, max: 126000000, typical: 90000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 3600, max: 5900, typical: 4200 },
    costPerKgSSO: { min: 5100, max: 8400, typical: 6000 },
    costPerKgGTO: { min: 6700, max: 11000, typical: 7800 },
    costPerKgGEO: { min: 14000, max: 23000, typical: 16400 },
    costPerKgTLI: null,
    notes: [
      'First flight July 9, 2024 (partial success - upper stage anomaly)',
      'Second launch March 6, 2025 (first commercial payload CSO-3)',
      'A62: 2 boosters, A64: 4 boosters',
      'Receives ESA subsidies of 290-340M euros/year through 2031',
      '30+ flights booked including 18 for Amazon Kuiper',
      'Development cost: ~4 billion euros'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'arianespace-vega-c',
    provider: 'Arianespace/Avio',
    vehicle: 'Vega C',
    country: 'ITA',
    status: 'operational',
    reusable: false,
    firstFlight: 2022,
    payloadLEO: 2500,
    payloadSSO: 2300, // 700km reference orbit
    payloadGTO: null,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 35000000, max: 45000000, typical: 40000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 14000, max: 18000, typical: 16000 },
    costPerKgSSO: { min: 15200, max: 19600, typical: 17400 },
    costPerKgGTO: null,
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'December 2022 launch failure led to redesign pause',
      'Returned to flight late 2024',
      'Final Arianespace-managed flight December 1, 2025',
      'Avio taking direct commercialization from 2026',
      '60% payload increase over original Vega',
      'Target: 6 launches per year by 2026'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // Blue Origin
  // ==========================================================================
  {
    slug: 'blue-origin-new-glenn',
    provider: 'Blue Origin',
    vehicle: 'New Glenn',
    country: 'USA',
    status: 'operational',
    reusable: true,
    firstFlight: 2025,
    payloadLEO: 45000,
    payloadSSO: 35000,
    payloadGTO: 13000,
    payloadGEO: 7000,
    payloadTLI: 10000,
    dedicatedLaunchPrice: { min: 68000000, max: 100000000, typical: 68000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 1500, max: 2200, typical: 1511 },
    costPerKgSSO: { min: 1900, max: 2850, typical: 1940 },
    costPerKgGTO: { min: 5200, max: 7700, typical: 5230 },
    costPerKgGEO: { min: 9700, max: 14300, typical: 9710 },
    costPerKgTLI: { min: 6800, max: 10000, typical: 6800 },
    notes: [
      'Maiden flight January 16, 2025',
      'First successful booster landing November 13, 2025 (NG-2)',
      'First stage designed for 25+ flights',
      'Arianespace estimated price at $68M',
      'NASA ESCAPADE bid was ~$20M (discounted)',
      'NSSL Phase 3 Lane 2 contract: ~$2.4B for 7 flights'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // Relativity Space
  // ==========================================================================
  {
    slug: 'relativity-terran-r',
    provider: 'Relativity Space',
    vehicle: 'Terran R',
    country: 'USA',
    status: 'development',
    reusable: true,
    firstFlight: null, // Expected late 2026
    payloadLEO: 23500,
    payloadSSO: 18000,
    payloadGTO: 8000,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 50000000, max: 80000000, typical: 65000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 2100, max: 3400, typical: 2770 },
    costPerKgSSO: { min: 2800, max: 4400, typical: 3610 },
    costPerKgGTO: { min: 6250, max: 10000, typical: 8125 },
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'First flight planned late 2026',
      'Partially 3D-printed construction',
      '$3B+ in launch service agreements',
      'Critical Design Review completed December 2024',
      'Customers: SES, Intelsat, OneWeb, NASA, US Space Force',
      'Terran 1 (predecessor) target was $12M for small payloads'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // ISRO (India)
  // ==========================================================================
  {
    slug: 'isro-pslv',
    provider: 'ISRO',
    vehicle: 'PSLV',
    country: 'IND',
    status: 'operational',
    reusable: false,
    firstFlight: 1993,
    payloadLEO: 3800,
    payloadSSO: 1750,
    payloadGTO: 1400,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 15000000, max: 32000000, typical: 21000000 },
    ridesharePrice: { perKg: 20000, minMass: 10 },
    costPerKgLEO: { min: 3950, max: 8420, typical: 5500 },
    costPerKgSSO: { min: 8570, max: 18300, typical: 12000 },
    costPerKgGTO: { min: 10700, max: 22900, typical: 15000 },
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'Workhorse of Indian space program',
      'Multiple variants: PSLV-CA, PSLV-XL, PSLV-DL, PSLV-QL',
      'Highly reliable with 50+ consecutive successes',
      'ISRO charges $10,000-$15,000/kg currently, targeting $5,000 future'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'isro-gslv-mk2',
    provider: 'ISRO',
    vehicle: 'GSLV Mk II',
    country: 'IND',
    status: 'retired', // As of October 2024
    reusable: false,
    firstFlight: 2001,
    payloadLEO: 5000,
    payloadSSO: null,
    payloadGTO: 2500,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 47000000, max: 47000000, typical: 47000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 9400, max: 9400, typical: 9400 },
    costPerKgSSO: null,
    costPerKgGTO: { min: 18800, max: 18800, typical: 18800 },
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'ISRO stopped selling GSLV Mk II as of October 2024',
      'Uses indigenous cryogenic upper stage',
      'Replaced by LVM3 for heavier payloads'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'isro-lvm3',
    provider: 'ISRO',
    vehicle: 'LVM3 (GSLV Mk III)',
    country: 'IND',
    status: 'operational',
    reusable: false,
    firstFlight: 2017,
    payloadLEO: 10000,
    payloadSSO: 8000,
    payloadGTO: 4000,
    payloadGEO: 2000,
    payloadTLI: 3500,
    dedicatedLaunchPrice: { min: 50000000, max: 65000000, typical: 55000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 5000, max: 6500, typical: 5500 },
    costPerKgSSO: { min: 6250, max: 8125, typical: 6875 },
    costPerKgGTO: { min: 12500, max: 16250, typical: 13750 },
    costPerKgGEO: { min: 25000, max: 32500, typical: 27500 },
    costPerKgTLI: { min: 14300, max: 18600, typical: 15700 },
    notes: [
      'India heavy-lift vehicle',
      'Used for Chandrayaan missions',
      'OneWeb constellation launches',
      'ISRO targeting 10x cost reduction with future reusable vehicles'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'isro-sslv',
    provider: 'ISRO',
    vehicle: 'SSLV',
    country: 'IND',
    status: 'operational',
    reusable: false,
    firstFlight: 2023,
    payloadLEO: 500,
    payloadSSO: 300,
    payloadGTO: null,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 3700000, max: 5000000, typical: 3700000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 7400, max: 10000, typical: 7400 },
    costPerKgSSO: { min: 12300, max: 16700, typical: 12300 },
    costPerKgGTO: null,
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'Small Satellite Launch Vehicle',
      'Designed for quick-turnaround smallsat launches',
      'Development cost ~$50M',
      'Launch-on-demand capability'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // JAXA (Japan)
  // ==========================================================================
  {
    slug: 'jaxa-h3',
    provider: 'JAXA/MHI',
    vehicle: 'H3',
    country: 'JPN',
    status: 'operational',
    reusable: false,
    firstFlight: 2024,
    payloadLEO: 6500,
    payloadSSO: 4000, // H3-30 configuration
    payloadGTO: 6500, // H3-24 configuration
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 33000000, max: 50000000, typical: 36650000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 5000, max: 7700, typical: 5640 },
    costPerKgSSO: { min: 8250, max: 12500, typical: 9160 },
    costPerKgGTO: { min: 5000, max: 7700, typical: 5640 },
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'First successful test flight February 2024',
      'December 2025 upper stage anomaly (second H3 failure)',
      'Target: half the cost of H-IIA predecessor',
      'Lower-cost LE-9 engine',
      'Development cost: ~$1.5B over 10 years'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // China (CASC)
  // ==========================================================================
  {
    slug: 'casc-long-march-2',
    provider: 'CASC',
    vehicle: 'Long March 2',
    country: 'CHN',
    status: 'operational',
    reusable: false,
    firstFlight: 1975,
    payloadLEO: 4000,
    payloadSSO: 2500,
    payloadGTO: null,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 15000000, max: 20000000, typical: 15760000 },
    ridesharePrice: { perKg: 20000, minMass: 20 },
    costPerKgLEO: { min: 3750, max: 5000, typical: 3940 },
    costPerKgSSO: { min: 6000, max: 8000, typical: 6300 },
    costPerKgGTO: null,
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'CZ-2C, CZ-2D, CZ-2F variants',
      'CZ-2F used for crewed Shenzhou missions',
      'Long March 8 rideshare: ~$20,000/kg (1/3 of Falcon 9 price)',
      'Contract data shows 112.9M Yuan (~$15.76M) per launch'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'casc-long-march-3b',
    provider: 'CASC',
    vehicle: 'Long March 3B/E',
    country: 'CHN',
    status: 'operational',
    reusable: false,
    firstFlight: 1996,
    payloadLEO: 12000,
    payloadSSO: null,
    payloadGTO: 5500,
    payloadGEO: 2700,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 36000000, max: 55000000, typical: 54400000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 3000, max: 4600, typical: 4530 },
    costPerKgSSO: null,
    costPerKgGTO: { min: 6550, max: 10000, typical: 9890 },
    costPerKgGEO: { min: 13300, max: 20400, typical: 20150 },
    costPerKgTLI: null,
    notes: [
      'Primary GTO launch vehicle for China',
      'ChinaSat contracts: 260-290M Yuan + 115M Yuan guidance',
      'Total typical cost: 390M Yuan (~$54.4M)'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'casc-long-march-5',
    provider: 'CASC',
    vehicle: 'Long March 5',
    country: 'CHN',
    status: 'operational',
    reusable: false,
    firstFlight: 2016,
    payloadLEO: 25000,
    payloadSSO: 15000,
    payloadGTO: 14000,
    payloadGEO: 7000,
    payloadTLI: 8200,
    dedicatedLaunchPrice: { min: 70000000, max: 100000000, typical: 75000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 2800, max: 4000, typical: 3000 },
    costPerKgSSO: { min: 4670, max: 6670, typical: 5000 },
    costPerKgGTO: { min: 5000, max: 7140, typical: 5360 },
    costPerKgGEO: { min: 10000, max: 14300, typical: 10710 },
    costPerKgTLI: { min: 8540, max: 12200, typical: 9150 },
    notes: [
      'China heavy-lift launch vehicle',
      '~$3,000/kg to LEO',
      'Used for Tianhe space station modules',
      'Chang e lunar missions'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'casc-long-march-8',
    provider: 'CASC',
    vehicle: 'Long March 8',
    country: 'CHN',
    status: 'operational',
    reusable: false, // Reusable variant in development
    firstFlight: 2020,
    payloadLEO: 7600,
    payloadSSO: 4500,
    payloadGTO: null,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 25000000, max: 30000000, typical: 27000000 },
    ridesharePrice: { perKg: 20000, minMass: 20 },
    costPerKgLEO: { min: 3300, max: 3950, typical: 3550 },
    costPerKgSSO: { min: 5550, max: 6670, typical: 6000 },
    costPerKgGTO: null,
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'SSO-focused medium-lift vehicle',
      'Target rideshare price competitive with SpaceX',
      'Reusable variant under development'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'casc-long-march-9',
    provider: 'CASC',
    vehicle: 'Long March 9',
    country: 'CHN',
    status: 'development',
    reusable: true, // Planned
    firstFlight: null, // Expected 2030+
    payloadLEO: 150000,
    payloadSSO: null,
    payloadGTO: 50000,
    payloadGEO: null,
    payloadTLI: 50000,
    dedicatedLaunchPrice: { min: 200000000, max: 300000000, typical: 225000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 1300, max: 2000, typical: 1500 },
    costPerKgSSO: null,
    costPerKgGTO: { min: 4000, max: 6000, typical: 4500 },
    costPerKgGEO: null,
    costPerKgTLI: { min: 4000, max: 6000, typical: 4500 },
    notes: [
      'Super heavy-lift vehicle for lunar and Mars missions',
      'Projected ~$1,500/kg to LEO (half of Long March 5)',
      'Reusable first stage planned',
      'Comparable to SLS/Starship class'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // Russia (Roscosmos)
  // ==========================================================================
  {
    slug: 'roscosmos-soyuz-2',
    provider: 'Roscosmos',
    vehicle: 'Soyuz-2',
    country: 'RUS',
    status: 'operational',
    reusable: false,
    firstFlight: 2004,
    payloadLEO: 9200,
    payloadSSO: 5000,
    payloadGTO: 3250,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 35000000, max: 80000000, typical: 48500000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 3800, max: 8700, typical: 5270 },
    costPerKgSSO: { min: 7000, max: 16000, typical: 9700 },
    costPerKgGTO: { min: 10800, max: 24600, typical: 14920 },
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'Price varies: $35-80M depending on provider (Roscosmos vs former Arianespace)',
      'Glavkosmos basic price: $48.5M with Fregat upper stage',
      'International commercial launches significantly reduced since 2022',
      'Soyuz-2.1a, 2.1b, 2.1v variants'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'roscosmos-proton-m',
    provider: 'Roscosmos',
    vehicle: 'Proton-M',
    country: 'RUS',
    status: 'operational',
    reusable: false,
    firstFlight: 2001,
    payloadLEO: 23000,
    payloadSSO: null,
    payloadGTO: 6300,
    payloadGEO: 3600,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 65000000, max: 100000000, typical: 65000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 2800, max: 4350, typical: 2830 },
    costPerKgSSO: null,
    costPerKgGTO: { min: 10300, max: 15900, typical: 10320 },
    costPerKgGEO: { min: 18100, max: 27800, typical: 18060 },
    costPerKgTLI: null,
    notes: [
      'Historical price: $65M for GEO communications satellites',
      'International commercial market significantly reduced since 2022',
      'Heavy-lift workhorse for Russian space program'
    ],
    lastUpdated: '2025-01',
  },
  {
    slug: 'roscosmos-soyuz-7',
    provider: 'Roscosmos',
    vehicle: 'Soyuz-7 (Amur)',
    country: 'RUS',
    status: 'development',
    reusable: true,
    firstFlight: null, // Expected 2030
    payloadLEO: 12500,
    payloadSSO: 9000,
    payloadGTO: null,
    payloadGEO: null,
    payloadTLI: null,
    dedicatedLaunchPrice: { min: 22000000, max: 30000000, typical: 25000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 1760, max: 2400, typical: 2000 },
    costPerKgSSO: { min: 2440, max: 3330, typical: 2780 },
    costPerKgGTO: null,
    costPerKgGEO: null,
    costPerKgTLI: null,
    notes: [
      'Partially-reusable methane-fueled replacement for Soyuz-2',
      'Maiden launch delayed to 2030 (as of November 2024)',
      'Intended to significantly reduce per-launch cost'
    ],
    lastUpdated: '2025-01',
  },

  // ==========================================================================
  // NASA (for reference - government costs)
  // ==========================================================================
  {
    slug: 'nasa-sls',
    provider: 'NASA',
    vehicle: 'Space Launch System',
    country: 'USA',
    status: 'operational',
    reusable: false,
    firstFlight: 2022,
    payloadLEO: 95000, // Block 1
    payloadSSO: null,
    payloadGTO: null,
    payloadGEO: null,
    payloadTLI: 27000, // Block 1 to TLI
    dedicatedLaunchPrice: { min: 2000000000, max: 4000000000, typical: 2500000000 },
    ridesharePrice: null,
    costPerKgLEO: { min: 21000, max: 42000, typical: 26300 },
    costPerKgSSO: null,
    costPerKgGTO: null,
    costPerKgGEO: null,
    costPerKgTLI: { min: 74000, max: 148000, typical: 92600 },
    notes: [
      'NASA deep space exploration vehicle',
      'Cost per launch: $2-4 billion depending on accounting method',
      'Block 1B: 40t to TLI',
      'Artemis program lunar missions',
      'FY2026 budget proposal threatened cancellation after Artemis III'
    ],
    lastUpdated: '2025-01',
  },
];

// =============================================================================
// SPACE INSURANCE DATA
// =============================================================================

export interface InsuranceRateData {
  category: string;
  coverageType: string;
  rateRange: { min: number; max: number; typical: number }; // Percentage of insured value
  factors: string[];
  notes: string[];
}

export const INSURANCE_RATE_DATA: InsuranceRateData[] = [
  {
    category: 'launch',
    coverageType: 'Launch Insurance',
    rateRange: { min: 2.0, max: 10.0, typical: 4.0 },
    factors: [
      'Launch vehicle heritage and success rate',
      'Payload value and complexity',
      'Orbit destination (LEO, GTO, GEO, etc.)',
      'Mission duration through commissioning',
      'Operator experience and track record',
      'Reusable vs expendable vehicle',
      'Number of prior successful launches on vehicle type'
    ],
    notes: [
      'Rates rose 15% in 2024 per Lloyd\'s data',
      'Historically low single digits (2-4%) for proven vehicles',
      'Can exceed 10% for new or unproven vehicles',
      '50% premium reduction possible for payloads on vehicles with 4+ prior successful flights',
      'Market capacity approximately $500M annually'
    ],
  },
  {
    category: 'in_orbit',
    coverageType: 'In-Orbit Insurance',
    rateRange: { min: 1.0, max: 5.0, typical: 2.5 },
    factors: [
      'Satellite design and heritage',
      'Mission duration (typical 15-year GEO life)',
      'Orbital environment (LEO debris risk vs GEO)',
      'Redundancy in critical systems',
      'Ground control capabilities',
      'End-of-life disposal compliance'
    ],
    notes: [
      'Typically covers operational anomalies, debris strikes, solar events',
      'Annual premiums or multi-year policies available',
      'Debris liability bundling available for operators with >95% orbital clearance rates',
      'In-orbit servicing coverage now available (2024)'
    ],
  },
  {
    category: 'third_party_liability',
    coverageType: 'Third-Party Liability',
    rateRange: { min: 0.1, max: 0.5, typical: 0.2 },
    factors: [
      'Launch trajectory and overflight zones',
      'Launch site location',
      'Vehicle size and propellant type',
      'Debris generation risk',
      'Re-entry characteristics'
    ],
    notes: [
      'Required by FAA for US launches',
      'Maximum required: $500M for third-party, $100M for government claims',
      'Less than 1% of coverage amount for large vehicles (0.1-0.2% typical)',
      'Probability of incident ~1 in 1 million',
      'Launching states are internationally liable under Outer Space Treaty'
    ],
  },
  {
    category: 'government_property',
    coverageType: 'Government Property Insurance',
    rateRange: { min: 1.5, max: 2.5, typical: 2.0 },
    factors: [
      'Launch site facilities at risk',
      'Government assets involved',
      'Historical claims experience'
    ],
    notes: [
      'Required for launches from government ranges',
      'Covers damage to launch complex and surrounding government facilities'
    ],
  },
  {
    category: 'pre_launch',
    coverageType: 'Pre-Launch/Transit Insurance',
    rateRange: { min: 0.5, max: 2.0, typical: 1.0 },
    factors: [
      'Transportation methods and routes',
      'Storage and handling procedures',
      'Integration complexity',
      'Duration of pre-launch phase'
    ],
    notes: [
      'Covers satellite from manufacturing through launch pad',
      'Includes transportation, storage, and integration phases',
      'Often bundled with launch insurance'
    ],
  },
];

// Insurance market statistics
export const INSURANCE_MARKET_STATS = {
  annualPremiumVolume: 500000000, // $500M annually
  marketCapacity2024: 2700000000, // $2.7B
  marketCapacity2025: 2900000000, // $2.9B (projected)
  lossRatio2023: 200, // Over 200% - worst in 20+ years
  lossRatio2024: 58.3, // Stabilized
  majorInsurers: [
    'AXA XL',
    'Swiss Re Corporate Solutions',
    'SCOR',
    'Global Aerospace',
    'Hiscox',
    'Munich Re',
    'HDI Global',
    'TATA AIG (entered May 2024)',
    'Lockton (new practice June 2024)'
  ],
  exitedInsurers: [
    'Brit (left 2023, $50M capacity)',
    'AIG (left 2023, $20-25M capacity)',
    'Swiss Re (left 2019)',
    'Allianz (left 2019)',
    'Aspen Re (left 2019)'
  ],
};

// =============================================================================
// REGULATORY FILING FEES
// =============================================================================

export interface RegulatoryFeeData {
  agency: string;
  country: string;
  feeType: string;
  amount: { min: number; max: number; typical: number };
  currency: string;
  frequency: string;
  notes: string[];
  lastUpdated: string;
}

export const REGULATORY_FEE_DATA: RegulatoryFeeData[] = [
  // FAA Fees
  {
    agency: 'FAA',
    country: 'USA',
    feeType: 'Launch/Reentry License (Part 450)',
    amount: { min: 0, max: 0, typical: 0 },
    currency: 'USD',
    frequency: 'per application',
    notes: [
      'FAA does not charge direct application fees for commercial space launch licenses',
      'Primary costs are financial responsibility/insurance requirements',
      'Average processing time: 151 days (2024)',
      'As of June 2025: 8 licenses issued under Part 450'
    ],
    lastUpdated: '2025-01',
  },
  {
    agency: 'FAA',
    country: 'USA',
    feeType: 'Financial Responsibility (Third-Party Liability)',
    amount: { min: 1000000, max: 500000000, typical: 100000000 },
    currency: 'USD',
    frequency: 'per launch',
    notes: [
      'Maximum required: $500M for third-party claims',
      'Maximum required: $100M for government claims',
      'Based on Maximum Probable Loss (MPL) calculation',
      'Can be covered by insurance or other financial instruments'
    ],
    lastUpdated: '2025-01',
  },
  {
    agency: 'FAA',
    country: 'USA',
    feeType: 'Spaceport License',
    amount: { min: 0, max: 0, typical: 0 },
    currency: 'USD',
    frequency: 'per application',
    notes: [
      'No direct application fee',
      'Environmental review and safety analysis costs borne by applicant',
      'May require additional state/local permits'
    ],
    lastUpdated: '2025-01',
  },

  // FCC Fees
  {
    agency: 'FCC',
    country: 'USA',
    feeType: 'Space Station License - Small Satellite (NGSO)',
    amount: { min: 12215, max: 12215, typical: 12215 },
    currency: 'USD',
    frequency: 'annual regulatory fee',
    notes: [
      'FY 2024 rate: $12,215 per license/call sign',
      'Includes Orbital Transfer Vehicles (OTV) and RPO/OOS spacecraft',
      'Annual adjustments based on FCC appropriation and unit count'
    ],
    lastUpdated: '2025-01',
  },
  {
    agency: 'FCC',
    country: 'USA',
    feeType: 'Space Station License - NGSO (Less Complex)',
    amount: { min: 130405, max: 130405, typical: 130405 },
    currency: 'USD',
    frequency: 'annual regulatory fee',
    notes: [
      'Systems with 20 or fewer US authorized earth stations',
      'Primarily EESS and AIS systems',
      'FY 2023 rate used as reference'
    ],
    lastUpdated: '2025-01',
  },
  {
    agency: 'FCC',
    country: 'USA',
    feeType: 'Space Station License - NGSO (Other)',
    amount: { min: 347755, max: 347755, typical: 347755 },
    currency: 'USD',
    frequency: 'annual regulatory fee',
    notes: [
      'Full NGSO systems (e.g., Starlink-class constellations)',
      'Per operational system in non-geostationary orbit',
      'FY 2023 rate used as reference'
    ],
    lastUpdated: '2025-01',
  },
  {
    agency: 'FCC',
    country: 'USA',
    feeType: 'Space Station License - GSO',
    amount: { min: 117580, max: 117580, typical: 117580 },
    currency: 'USD',
    frequency: 'annual regulatory fee',
    notes: [
      'Per operational space station in geostationary orbit',
      'FY 2023 rate used as reference',
      'FY 2024 allocation split adjusted to 60/40 GSO/NGSO'
    ],
    lastUpdated: '2025-01',
  },
  {
    agency: 'FCC',
    country: 'USA',
    feeType: 'Application Processing Fee',
    amount: { min: 1000, max: 50000, typical: 10000 },
    currency: 'USD',
    frequency: 'per application',
    notes: [
      '17.41% CPI increase applied in 2024',
      'Deposited in US Treasury (not retained by FCC)',
      'Varies by application type and complexity'
    ],
    lastUpdated: '2025-01',
  },

  // NOAA Fees
  {
    agency: 'NOAA',
    country: 'USA',
    feeType: 'Commercial Remote Sensing License',
    amount: { min: 0, max: 0, typical: 0 },
    currency: 'USD',
    frequency: 'per application',
    notes: [
      'No application fee charged by NOAA CRSRA',
      'Average review time: 14 days (reduced from 48 days in 2020)',
      '60-day statutory deadline for review',
      'Tiered system: Tier 1 (no restrictions), Tier 2 (same as other NOAA systems), Tier 3 (conditions)'
    ],
    lastUpdated: '2025-01',
  },

  // ITU Fees (International)
  {
    agency: 'ITU',
    country: 'INT',
    feeType: 'Advance Publication Information (API)',
    amount: { min: 570, max: 570, typical: 570 },
    currency: 'CHF',
    frequency: 'per filing',
    notes: [
      '570 CHF (~$650 USD) per API filing',
      'First step in satellite coordination process',
      'Due 6 months after invoice date'
    ],
    lastUpdated: '2024-01',
  },
  {
    agency: 'ITU',
    country: 'INT',
    feeType: 'Coordination Request (CR/C)',
    amount: { min: 5710, max: 67000, typical: 20000 },
    currency: 'CHF',
    frequency: 'per filing',
    notes: [
      'Range: 5,710 CHF to ~67,000 CHF',
      'Varies by complexity and spectrum requested',
      'Example: One US Ku-band filing charged 7,100 CHF; another charged 280,024 CHF'
    ],
    lastUpdated: '2024-01',
  },
  {
    agency: 'ITU',
    country: 'INT',
    feeType: 'Notification Filing',
    amount: { min: 15910, max: 116000, typical: 50000 },
    currency: 'CHF',
    frequency: 'per filing',
    notes: [
      'Range: 15,910 CHF to ~116,000 CHF',
      'Final step to register satellite network',
      'Fees based on cost recovery principle (adopted 1998)',
      'Electronic submission mandatory'
    ],
    lastUpdated: '2024-01',
  },
  {
    agency: 'ITU',
    country: 'INT',
    feeType: 'Total Satellite Coordination (Typical)',
    amount: { min: 25000, max: 500000, typical: 100000 },
    currency: 'CHF',
    frequency: 'per satellite network',
    notes: [
      'Combined API + CR/C + Notification process',
      'Simple systems: $25,000-50,000',
      'Complex systems (GEO, multiple bands): $100,000-500,000+',
      'Mega-constellations may incur significantly higher total costs'
    ],
    lastUpdated: '2024-01',
  },
];

// =============================================================================
// OTHER MISSION COSTS
// =============================================================================

export interface MiscCostData {
  category: string;
  item: string;
  costRange: { min: number; max: number; typical: number };
  currency: string;
  unit: string;
  notes: string[];
}

export const MISC_COST_DATA: MiscCostData[] = [
  // Launch Site & Range Fees
  {
    category: 'launch_site',
    item: 'Federal Range Direct Costs (US)',
    costRange: { min: 500000, max: 5000000, typical: 2000000 },
    currency: 'USD',
    unit: 'per launch',
    notes: [
      'Space Force estimates: ~$89M direct costs FY2026 (across all launches)',
      'Includes utilities, labor, and direct support',
      'FY2024 NDAA requires DOD to charge commercial entities'
    ],
  },
  {
    category: 'launch_site',
    item: 'Federal Range Indirect Costs (US)',
    costRange: { min: 100000, max: 1000000, typical: 400000 },
    currency: 'USD',
    unit: 'per launch',
    notes: [
      'Space Force estimates: ~$16M indirect costs FY2026',
      'Includes infrastructure maintenance, overhead'
    ],
  },
  {
    category: 'launch_site',
    item: 'Range Services (New Contract Model)',
    costRange: { min: 1000000, max: 10000000, typical: 3000000 },
    currency: 'USD',
    unit: 'per launch',
    notes: [
      '$4B Space Force Range Contract (Jacobs Technology)',
      'Commercial firms now pay directly for task orders',
      'Shifts upfront costs from government to commercial providers'
    ],
  },
  {
    category: 'launch_site',
    item: 'Commercial Spaceport Fees',
    costRange: { min: 250000, max: 3000000, typical: 1000000 },
    currency: 'USD',
    unit: 'per launch',
    notes: [
      'Varies significantly by spaceport',
      'Includes pad rental, facilities, and basic services',
      'Additional fees for specialized support'
    ],
  },

  // Permits and Licensing
  {
    category: 'permits',
    item: 'Total Permit/License Costs (Complex Mission)',
    costRange: { min: 100000, max: 500000, typical: 250000 },
    currency: 'USD',
    unit: 'per mission',
    notes: [
      'Environmental review, safety analysis, legal fees',
      'State/local permits may add additional costs',
      'Varies by launch site and mission complexity'
    ],
  },

  // Integration Costs
  {
    category: 'integration',
    item: 'Satellite Integration (Small Satellite)',
    costRange: { min: 50000, max: 500000, typical: 200000 },
    currency: 'USD',
    unit: 'per satellite',
    notes: [
      'Dispenser integration, testing, documentation',
      'Rideshare-specific integration services'
    ],
  },
  {
    category: 'integration',
    item: 'Satellite Integration (Large GEO)',
    costRange: { min: 2000000, max: 10000000, typical: 5000000 },
    currency: 'USD',
    unit: 'per satellite',
    notes: [
      'Dedicated mission integration',
      'Extensive testing and verification',
      'Fairing integration and acoustic testing'
    ],
  },
  {
    category: 'integration',
    item: 'Mission Planning and Analysis',
    costRange: { min: 100000, max: 2000000, typical: 500000 },
    currency: 'USD',
    unit: 'per mission',
    notes: [
      'Trajectory analysis, conjunction assessment',
      'End-of-life planning and debris mitigation analysis'
    ],
  },

  // Ground Segment
  {
    category: 'ground_segment',
    item: 'Ground Station Network (Build)',
    costRange: { min: 10000000, max: 300000000, typical: 50000000 },
    currency: 'USD',
    unit: 'total',
    notes: [
      'Ground infrastructure valued at $12B market (2024)',
      'Major projects: $200-800M for constellation ground segments',
      'Satellite Optical Ground Station market: $0.75B in 2024'
    ],
  },
  {
    category: 'ground_segment',
    item: 'Ground Station Services (GSaaS)',
    costRange: { min: 1000, max: 50000, typical: 10000 },
    currency: 'USD',
    unit: 'per month per satellite',
    notes: [
      'Ground Segment as a Service growing rapidly',
      'Virtualization reducing traditional costs',
      'Pay-per-pass or monthly subscription models'
    ],
  },
  {
    category: 'ground_segment',
    item: 'Mission Operations Center',
    costRange: { min: 500000, max: 20000000, typical: 5000000 },
    currency: 'USD',
    unit: 'setup + annual operations',
    notes: [
      'Smaller operators using outsourced services',
      'Constellation operations: $50-150M for full capability'
    ],
  },

  // Lunar/Deep Space Specific
  {
    category: 'lunar_missions',
    item: 'CLPS Lunar Delivery Service',
    costRange: { min: 73000000, max: 320000000, typical: 110000000 },
    currency: 'USD',
    unit: 'per mission',
    notes: [
      'NASA Commercial Lunar Payload Services program',
      'Firefly: $93.3M, Draper: $73M, Astrobotic Griffin: $199.5M',
      'Includes lander, launch, and delivery to lunar surface',
      'VIPER delivery: $320.4M (most expensive CLPS)'
    ],
  },
  {
    category: 'lunar_missions',
    item: 'Commercial Lunar Payload Delivery',
    costRange: { min: 1000000, max: 2000000, typical: 1500000 },
    currency: 'USD',
    unit: 'per kg to lunar surface',
    notes: [
      'Estimated based on CLPS contracts (~100kg+ payloads)',
      'Price expected to decrease with competition',
      'Current providers: Intuitive Machines, Astrobotic, Firefly'
    ],
  },
];

// =============================================================================
// RIDESHARE PRICING COMPARISON
// =============================================================================

export interface RidesharePricing {
  provider: string;
  program: string;
  pricePerKg: number;
  minMass: number;
  maxMass: number;
  orbit: string;
  frequency: string;
  notes: string[];
}

export const RIDESHARE_PRICING: RidesharePricing[] = [
  {
    provider: 'SpaceX',
    program: 'Transporter (SSO)',
    pricePerKg: 6000,
    minMass: 50,
    maxMass: 200,
    orbit: 'SSO (500-600km)',
    frequency: '3 per year',
    notes: [
      'Minimum booking: $300,000 for 50kg',
      'Price increasing $500/kg per year',
      '1,000+ satellites deployed through program',
      'ESPA-class payloads'
    ],
  },
  {
    provider: 'SpaceX',
    program: 'Bandwagon (Mid-Inclination)',
    pricePerKg: 6500,
    minMass: 50,
    maxMass: 200,
    orbit: 'Mid-inclination (~45 deg)',
    frequency: '2 per year',
    notes: [
      'Started in 2024',
      'Provides access to different orbital planes',
      'Similar pricing to Transporter'
    ],
  },
  {
    provider: 'Rocket Lab',
    program: 'Electron Rideshare',
    pricePerKg: 25000,
    minMass: 1,
    maxMass: 50,
    orbit: 'Various (LEO/SSO)',
    frequency: 'Opportunistic',
    notes: [
      'Premium for dedicated timing and orbit',
      'Small payloads only',
      'Rapid scheduling possible'
    ],
  },
  {
    provider: 'ISRO',
    program: 'PSLV Rideshare',
    pricePerKg: 20000,
    minMass: 10,
    maxMass: 500,
    orbit: 'Various (LEO/SSO)',
    frequency: '6 per year',
    notes: [
      'Competitive pricing for small satellites',
      'Multiple successful rideshare deployments'
    ],
  },
  {
    provider: 'CASC',
    program: 'Long March 8 Rideshare',
    pricePerKg: 20000,
    minMass: 20,
    maxMass: 500,
    orbit: 'SSO',
    frequency: 'Multiple per year',
    notes: [
      'Approximately 1/3 the price of SpaceX Transporter',
      'Growing commercial availability'
    ],
  },
  {
    provider: 'D-Orbit',
    program: 'ION Deployment Service',
    pricePerKg: 35000,
    minMass: 1,
    maxMass: 150,
    orbit: 'Various (customizable)',
    frequency: 'Multiple per year',
    notes: [
      'Orbital transfer vehicle deployment',
      'Precise orbit placement',
      'Launches on various providers'
    ],
  },
  {
    provider: 'Exolaunch',
    program: 'Rideshare Integration',
    pricePerKg: 30000,
    minMass: 1,
    maxMass: 200,
    orbit: 'Various',
    frequency: 'Multiple per year',
    notes: [
      'Integration services for rideshare',
      'Deploys on multiple launch providers'
    ],
  },
];

// NOTE: Database operations removed - data is exported as constants for use in API routes

// =============================================================================
// COST CALCULATOR FUNCTIONS (pure JavaScript, no database required)
// =============================================================================

/* DATABASE OPERATIONS REMOVED - The following functions were removed:
 * - initializeMissionCostData()
 * - getLaunchCosts()
 * - getInsuranceRates()
 * - getRegulatoryFees()
 * - getMiscCosts()
 * - getRidesharePricing()
 *
 * Use the exported constants directly (LAUNCH_COST_DATA, INSURANCE_RATE_DATA, etc.)
 * or the API routes at /api/mission-cost
 */

// Placeholder to mark where code was removed
const _databaseFunctionsRemoved = true;
export { _databaseFunctionsRemoved };

/* START REMOVED CODE ---
export async function initializeMissionCostData() {
  let launchProviders = 0;
  let insuranceRates = 0;
  let regulatoryFees = 0;
  let miscCosts = 0;
  let ridesharePricing = 0;

  // Upsert launch cost data
  for (const provider of LAUNCH_COST_DATA) {
    try {
      await prisma.missionLaunchCost.upsert({
        where: { slug: provider.slug },
        update: {
          provider: provider.provider,
          vehicle: provider.vehicle,
          country: provider.country,
          status: provider.status,
          reusable: provider.reusable,
          firstFlight: provider.firstFlight,
          payloadLEO: provider.payloadLEO,
          payloadSSO: provider.payloadSSO,
          payloadGTO: provider.payloadGTO,
          payloadGEO: provider.payloadGEO,
          payloadTLI: provider.payloadTLI,
          dedicatedLaunchPrice: provider.dedicatedLaunchPrice ? JSON.stringify(provider.dedicatedLaunchPrice) : null,
          ridesharePrice: provider.ridesharePrice ? JSON.stringify(provider.ridesharePrice) : null,
          costPerKgLEO: JSON.stringify(provider.costPerKgLEO),
          costPerKgSSO: provider.costPerKgSSO ? JSON.stringify(provider.costPerKgSSO) : null,
          costPerKgGTO: provider.costPerKgGTO ? JSON.stringify(provider.costPerKgGTO) : null,
          costPerKgGEO: provider.costPerKgGEO ? JSON.stringify(provider.costPerKgGEO) : null,
          costPerKgTLI: provider.costPerKgTLI ? JSON.stringify(provider.costPerKgTLI) : null,
          notes: JSON.stringify(provider.notes),
          lastUpdated: provider.lastUpdated,
        },
        create: {
          slug: provider.slug,
          provider: provider.provider,
          vehicle: provider.vehicle,
          country: provider.country,
          status: provider.status,
          reusable: provider.reusable,
          firstFlight: provider.firstFlight,
          payloadLEO: provider.payloadLEO,
          payloadSSO: provider.payloadSSO,
          payloadGTO: provider.payloadGTO,
          payloadGEO: provider.payloadGEO,
          payloadTLI: provider.payloadTLI,
          dedicatedLaunchPrice: provider.dedicatedLaunchPrice ? JSON.stringify(provider.dedicatedLaunchPrice) : null,
          ridesharePrice: provider.ridesharePrice ? JSON.stringify(provider.ridesharePrice) : null,
          costPerKgLEO: JSON.stringify(provider.costPerKgLEO),
          costPerKgSSO: provider.costPerKgSSO ? JSON.stringify(provider.costPerKgSSO) : null,
          costPerKgGTO: provider.costPerKgGTO ? JSON.stringify(provider.costPerKgGTO) : null,
          costPerKgGEO: provider.costPerKgGEO ? JSON.stringify(provider.costPerKgGEO) : null,
          costPerKgTLI: provider.costPerKgTLI ? JSON.stringify(provider.costPerKgTLI) : null,
          notes: JSON.stringify(provider.notes),
          lastUpdated: provider.lastUpdated,
        },
      });
      launchProviders++;
    } catch (error) {
      console.error(`Failed to upsert launch provider ${provider.slug}:`, error);
    }
  }

  // Upsert insurance rate data
  for (const rate of INSURANCE_RATE_DATA) {
    try {
      await prisma.missionInsuranceRate.upsert({
        where: {
          category_coverageType: {
            category: rate.category,
            coverageType: rate.coverageType
          }
        },
        update: {
          rateMin: rate.rateRange.min,
          rateMax: rate.rateRange.max,
          rateTypical: rate.rateRange.typical,
          factors: JSON.stringify(rate.factors),
          notes: JSON.stringify(rate.notes),
        },
        create: {
          category: rate.category,
          coverageType: rate.coverageType,
          rateMin: rate.rateRange.min,
          rateMax: rate.rateRange.max,
          rateTypical: rate.rateRange.typical,
          factors: JSON.stringify(rate.factors),
          notes: JSON.stringify(rate.notes),
        },
      });
      insuranceRates++;
    } catch (error) {
      console.error(`Failed to upsert insurance rate ${rate.category}:`, error);
    }
  }

  // Upsert regulatory fee data
  for (const fee of REGULATORY_FEE_DATA) {
    const slug = `${fee.agency}-${fee.feeType}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      await prisma.missionRegulatoryFee.upsert({
        where: { slug },
        update: {
          agency: fee.agency,
          country: fee.country,
          feeType: fee.feeType,
          amountMin: fee.amount.min,
          amountMax: fee.amount.max,
          amountTypical: fee.amount.typical,
          currency: fee.currency,
          frequency: fee.frequency,
          notes: JSON.stringify(fee.notes),
          lastUpdated: fee.lastUpdated,
        },
        create: {
          slug,
          agency: fee.agency,
          country: fee.country,
          feeType: fee.feeType,
          amountMin: fee.amount.min,
          amountMax: fee.amount.max,
          amountTypical: fee.amount.typical,
          currency: fee.currency,
          frequency: fee.frequency,
          notes: JSON.stringify(fee.notes),
          lastUpdated: fee.lastUpdated,
        },
      });
      regulatoryFees++;
    } catch (error) {
      console.error(`Failed to upsert regulatory fee ${slug}:`, error);
    }
  }

  // Upsert miscellaneous cost data
  for (const cost of MISC_COST_DATA) {
    const slug = `${cost.category}-${cost.item}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      await prisma.missionMiscCost.upsert({
        where: { slug },
        update: {
          category: cost.category,
          item: cost.item,
          costMin: cost.costRange.min,
          costMax: cost.costRange.max,
          costTypical: cost.costRange.typical,
          currency: cost.currency,
          unit: cost.unit,
          notes: JSON.stringify(cost.notes),
        },
        create: {
          slug,
          category: cost.category,
          item: cost.item,
          costMin: cost.costRange.min,
          costMax: cost.costRange.max,
          costTypical: cost.costRange.typical,
          currency: cost.currency,
          unit: cost.unit,
          notes: JSON.stringify(cost.notes),
        },
      });
      miscCosts++;
    } catch (error) {
      console.error(`Failed to upsert misc cost ${slug}:`, error);
    }
  }

  // Upsert rideshare pricing data
  for (const pricing of RIDESHARE_PRICING) {
    const slug = `${pricing.provider}-${pricing.program}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      await prisma.missionRidesharePricing.upsert({
        where: { slug },
        update: {
          provider: pricing.provider,
          program: pricing.program,
          pricePerKg: pricing.pricePerKg,
          minMass: pricing.minMass,
          maxMass: pricing.maxMass,
          orbit: pricing.orbit,
          frequency: pricing.frequency,
          notes: JSON.stringify(pricing.notes),
        },
        create: {
          slug,
          provider: pricing.provider,
          program: pricing.program,
          pricePerKg: pricing.pricePerKg,
          minMass: pricing.minMass,
          maxMass: pricing.maxMass,
          orbit: pricing.orbit,
          frequency: pricing.frequency,
          notes: JSON.stringify(pricing.notes),
        },
      });
      ridesharePricing++;
    } catch (error) {
      console.error(`Failed to upsert rideshare pricing ${slug}:`, error);
    }
  }

  return {
    launchProviders,
    insuranceRates,
    regulatoryFees,
    miscCosts,
    ridesharePricing,
  };
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

export async function getLaunchCosts(options?: {
  provider?: string;
  country?: string;
  status?: string;
  reusable?: boolean;
}) {
  const where: Record<string, unknown> = {};

  if (options?.provider) where.provider = options.provider;
  if (options?.country) where.country = options.country;
  if (options?.status) where.status = options.status;
  if (options?.reusable !== undefined) where.reusable = options.reusable;

  const costs = await prisma.missionLaunchCost.findMany({
    where,
    orderBy: [{ provider: 'asc' }, { vehicle: 'asc' }],
  });

  return costs.map((c) => ({
    ...c,
    dedicatedLaunchPrice: c.dedicatedLaunchPrice ? JSON.parse(c.dedicatedLaunchPrice) : null,
    ridesharePrice: c.ridesharePrice ? JSON.parse(c.ridesharePrice) : null,
    costPerKgLEO: JSON.parse(c.costPerKgLEO),
    costPerKgSSO: c.costPerKgSSO ? JSON.parse(c.costPerKgSSO) : null,
    costPerKgGTO: c.costPerKgGTO ? JSON.parse(c.costPerKgGTO) : null,
    costPerKgGEO: c.costPerKgGEO ? JSON.parse(c.costPerKgGEO) : null,
    costPerKgTLI: c.costPerKgTLI ? JSON.parse(c.costPerKgTLI) : null,
    notes: c.notes ? JSON.parse(c.notes) : null,
  }));
}

export async function getInsuranceRates(category?: string) {
  const where = category ? { category } : {};

  const rates = await prisma.missionInsuranceRate.findMany({
    where,
    orderBy: { category: 'asc' },
  });

  return rates.map((r) => ({
    ...r,
    rateRange: { min: r.rateMin, max: r.rateMax, typical: r.rateTypical },
    factors: JSON.parse(r.factors),
    notes: JSON.parse(r.notes),
  }));
}

export async function getRegulatoryFees(options?: {
  agency?: string;
  country?: string;
}) {
  const where: Record<string, unknown> = {};

  if (options?.agency) where.agency = options.agency;
  if (options?.country) where.country = options.country;

  const fees = await prisma.missionRegulatoryFee.findMany({
    where,
    orderBy: [{ agency: 'asc' }, { feeType: 'asc' }],
  });

  return fees.map((f) => ({
    ...f,
    amount: { min: f.amountMin, max: f.amountMax, typical: f.amountTypical },
    notes: JSON.parse(f.notes),
  }));
}

export async function getMiscCosts(category?: string) {
  const where = category ? { category } : {};

  const costs = await prisma.missionMiscCost.findMany({
    where,
    orderBy: [{ category: 'asc' }, { item: 'asc' }],
  });

  return costs.map((c) => ({
    ...c,
    costRange: { min: c.costMin, max: c.costMax, typical: c.costTypical },
    notes: JSON.parse(c.notes),
  }));
}

export async function getRidesharePricing(provider?: string) {
  const where = provider ? { provider } : {};

  const pricing = await prisma.missionRidesharePricing.findMany({
    where,
    orderBy: [{ pricePerKg: 'asc' }],
  });

  return pricing.map((p) => ({
    ...p,
    notes: JSON.parse(p.notes),
  }));
}
END REMOVED CODE --- */

export interface MissionCostEstimate {
  launch: {
    provider: string;
    vehicle: string;
    dedicatedCost: number;
    rideshareCost: number | null;
    costPerKg: number;
  };
  insurance: {
    launchPremium: number;
    inOrbitPremium: number;
    liabilityPremium: number;
    totalPremium: number;
  };
  regulatory: {
    faaFees: number;
    fccFees: number;
    ituFees: number;
    totalFees: number;
  };
  operations: {
    integrationCost: number;
    groundSegmentCost: number;
    rangeFees: number;
    totalOperations: number;
  };
  totalEstimate: {
    low: number;
    typical: number;
    high: number;
  };
}

export function estimateMissionCost(params: {
  payloadMass: number;
  orbit: 'LEO' | 'SSO' | 'GTO' | 'GEO' | 'TLI';
  missionType: 'dedicated' | 'rideshare';
  satelliteValue: number;
  missionDuration: number; // years
  requiresRemoteSensing: boolean;
  requiresSpectrum: boolean;
}): MissionCostEstimate {
  // Find best-value launch provider for the parameters
  const providers = LAUNCH_COST_DATA.filter(p => p.status === 'operational');

  // Get appropriate cost per kg based on orbit
  const getCostPerKg = (provider: LaunchCostData): number => {
    switch (params.orbit) {
      case 'LEO': return provider.costPerKgLEO?.typical || 0;
      case 'SSO': return provider.costPerKgSSO?.typical || provider.costPerKgLEO?.typical * 1.5 || 0;
      case 'GTO': return provider.costPerKgGTO?.typical || 0;
      case 'GEO': return provider.costPerKgGEO?.typical || 0;
      case 'TLI': return provider.costPerKgTLI?.typical || 0;
      default: return provider.costPerKgLEO?.typical || 0;
    }
  };

  // Sort by cost and find cheapest suitable provider
  const sortedProviders = providers
    .filter(p => getCostPerKg(p) > 0)
    .sort((a, b) => getCostPerKg(a) - getCostPerKg(b));

  const selectedProvider = sortedProviders[0];
  const costPerKg = getCostPerKg(selectedProvider);

  // Calculate launch costs
  const dedicatedCost = selectedProvider.dedicatedLaunchPrice?.typical || costPerKg * params.payloadMass;
  const rideshareCost = selectedProvider.ridesharePrice
    ? Math.max(selectedProvider.ridesharePrice.perKg * params.payloadMass, 300000)
    : null;

  const launchCost = params.missionType === 'rideshare' && rideshareCost
    ? rideshareCost
    : dedicatedCost;

  // Calculate insurance costs
  const launchRate = INSURANCE_RATE_DATA.find(r => r.category === 'launch')?.rateRange.typical || 4;
  const inOrbitRate = INSURANCE_RATE_DATA.find(r => r.category === 'in_orbit')?.rateRange.typical || 2.5;
  const liabilityRate = INSURANCE_RATE_DATA.find(r => r.category === 'third_party_liability')?.rateRange.typical || 0.2;

  const launchPremium = params.satelliteValue * (launchRate / 100);
  const inOrbitPremium = params.satelliteValue * (inOrbitRate / 100) * params.missionDuration;
  const liabilityPremium = 100000000 * (liabilityRate / 100); // Based on $100M liability coverage
  const totalPremium = launchPremium + inOrbitPremium + liabilityPremium;

  // Calculate regulatory fees
  const faaFees = 0; // No direct application fee
  const fccFees = 12215 * params.missionDuration; // Small satellite annual fee
  const ituFees = params.requiresSpectrum ? 50000 : 0; // Typical coordination cost
  const totalFees = faaFees + fccFees + ituFees + (params.requiresRemoteSensing ? 0 : 0);

  // Calculate operational costs
  const integrationCost = params.missionType === 'rideshare' ? 200000 : 2000000;
  const groundSegmentCost = 10000 * 12 * params.missionDuration; // $10k/month GSaaS
  const rangeFees = params.missionType === 'dedicated' ? 2000000 : 0;
  const totalOperations = integrationCost + groundSegmentCost + rangeFees;

  // Calculate totals
  const typicalTotal = launchCost + totalPremium + totalFees + totalOperations;
  const lowTotal = typicalTotal * 0.75;
  const highTotal = typicalTotal * 1.5;

  return {
    launch: {
      provider: selectedProvider.provider,
      vehicle: selectedProvider.vehicle,
      dedicatedCost,
      rideshareCost,
      costPerKg,
    },
    insurance: {
      launchPremium,
      inOrbitPremium,
      liabilityPremium,
      totalPremium,
    },
    regulatory: {
      faaFees,
      fccFees,
      ituFees,
      totalFees,
    },
    operations: {
      integrationCost,
      groundSegmentCost,
      rangeFees,
      totalOperations,
    },
    totalEstimate: {
      low: Math.round(lowTotal),
      typical: Math.round(typicalTotal),
      high: Math.round(highTotal),
    },
  };
}
