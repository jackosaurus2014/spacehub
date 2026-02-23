import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireCronSecret, internalError, createSuccessResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getExpiresAt } from '@/lib/freshness-policies';

export const dynamic = 'force-dynamic';

/**
 * Upsert a content item into the DynamicContent table.
 * Uses the same pattern as seed-dynamic-content.ts.
 */
async function upsertContent(
  module: string,
  section: string,
  data: unknown[],
) {
  const now = new Date();
  const contentKey = `${module}:${section}`;

  const record = {
    module,
    section,
    data: JSON.stringify(data),
    sourceType: 'seed',
    expiresAt: getExpiresAt(module),
    refreshedAt: now,
    lastVerified: now,
    aiConfidence: 1.0,
    isActive: true,
    version: 1,
  };

  await prisma.dynamicContent.upsert({
    where: { contentKey },
    update: { ...record, version: { increment: 1 } },
    create: { contentKey, ...record },
  });

  return contentKey;
}

// ────────────────────────────────────────
// Space Economy Data (2024-2025)
// Sources: Space Foundation, SIA, Euroconsult, NASA, ESA, official budgets
// ────────────────────────────────────────

const MARKET_SEGMENTS = [
  {
    name: 'Satellite Services',
    revenue: 197,
    share: 32.8,
    growth: 4.2,
    description: 'Direct-to-home TV, satellite radio, broadband (Starlink, OneWeb, Kuiper), managed services, remote sensing data, direct-to-device',
  },
  {
    name: 'Ground Equipment',
    revenue: 152,
    share: 25.3,
    growth: 4.8,
    description: 'GNSS devices, satellite terminals (Starlink kits, VSAT), network equipment, consumer electronics with satellite connectivity',
  },
  {
    name: 'Government Space Budgets',
    revenue: 129,
    share: 21.5,
    growth: 9.1,
    description: 'Civil space agencies, military/intelligence space programs, R&D. U.S. spending growth driven by Space Force and SDA',
  },
  {
    name: 'Non-Satellite Industry',
    revenue: 62,
    share: 10.3,
    growth: 7.5,
    description: 'Human spaceflight, commercial space stations (Axiom, Vast), deep space exploration, suborbital, in-space servicing and logistics',
  },
  {
    name: 'Satellite Manufacturing',
    revenue: 19.2,
    share: 3.2,
    growth: 14.3,
    description: 'Commercial and government satellite production, smallsat and CubeSat manufacturing, satellite buses and subsystems',
  },
  {
    name: 'Launch Industry',
    revenue: 10.5,
    share: 1.7,
    growth: 18.2,
    description: 'Commercial launch services (SpaceX, Rocket Lab, Arianespace), rideshare, dedicated small-launch, national launch programs',
  },
  {
    name: 'Emerging Space Economy',
    revenue: 30.3,
    share: 5.0,
    growth: 22.5,
    description: 'Space tourism, in-space manufacturing, orbital services, space-based solar power R&D, cislunar economy, debris removal',
  },
];

const QUARTERLY_VC = [
  { quarter: 'Q1', year: 2023, totalInvested: 1.9, dealCount: 48, topSector: 'Earth Observation' },
  { quarter: 'Q2', year: 2023, totalInvested: 1.4, dealCount: 42, topSector: 'Launch' },
  { quarter: 'Q3', year: 2023, totalInvested: 1.6, dealCount: 45, topSector: 'Communications' },
  { quarter: 'Q4', year: 2023, totalInvested: 1.2, dealCount: 38, topSector: 'In-Space Services' },
  { quarter: 'Q1', year: 2024, totalInvested: 2.1, dealCount: 62, topSector: 'Earth Observation' },
  { quarter: 'Q2', year: 2024, totalInvested: 1.8, dealCount: 55, topSector: 'Launch' },
  { quarter: 'Q3', year: 2024, totalInvested: 3.2, dealCount: 71, topSector: 'National Security' },
  { quarter: 'Q4', year: 2024, totalInvested: 2.4, dealCount: 58, topSector: 'In-Space Services' },
  { quarter: 'Q1', year: 2025, totalInvested: 2.9, dealCount: 67, topSector: 'National Security' },
];

const ANNUAL_INVESTMENT = [
  { year: 2019, vcInvestment: 5.8, debtFinancing: 3.2, publicOfferings: 0.6, totalPrivate: 9.6 },
  { year: 2020, vcInvestment: 7.6, debtFinancing: 4.1, publicOfferings: 3.2, totalPrivate: 14.9 },
  { year: 2021, vcInvestment: 15.4, debtFinancing: 7.8, publicOfferings: 13.3, totalPrivate: 36.5 },
  { year: 2022, vcInvestment: 8.0, debtFinancing: 5.9, publicOfferings: 1.1, totalPrivate: 15.0 },
  { year: 2023, vcInvestment: 6.1, debtFinancing: 4.5, publicOfferings: 0.8, totalPrivate: 11.4 },
  { year: 2024, vcInvestment: 9.5, debtFinancing: 5.8, publicOfferings: 2.1, totalPrivate: 17.4 },
];

const GOVERNMENT_BUDGETS = [
  {
    agency: 'NASA',
    country: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    budget2024: 25.4,
    budget2025: 25.4,
    change: 0.0,
    currency: 'USD',
    focusAreas: ['Artemis / Lunar', 'Mars Sample Return (restructured)', 'ISS Transition / Commercial LEO', 'Earth Science', 'Space Technology'],
    notes: 'FY2025 enacted under continuing resolution then omnibus. Artemis program continues with HLS awards to SpaceX and Blue Origin. MSR restructured for cost reduction.',
  },
  {
    agency: 'US Space Force (DoD Space)',
    country: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    budget2024: 30.3,
    budget2025: 33.7,
    change: 11.2,
    currency: 'USD',
    focusAreas: ['GPS III/IIIF', 'Next-Gen OPIR (missile warning)', 'Space Development Agency (Tranche 2)', 'NSSL Phase 3', 'Resilient Space Architecture'],
    notes: 'Includes USSF, NRO, SDA, and MDA space programs. Fastest-growing U.S. space budget segment. SDA proliferated LEO constellation expanding.',
  },
  {
    agency: 'NOAA (Space Programs)',
    country: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    budget2024: 3.2,
    budget2025: 3.5,
    change: 9.4,
    currency: 'USD',
    focusAreas: ['GOES-U (launched 2024)', 'JPSS Polar Satellites', 'Space Weather Follow On', 'GeoXO Program', 'Ocean/Climate Monitoring'],
    notes: 'GOES-U successfully launched June 2024. GeoXO next-gen geostationary program in development. Space Weather Follow On satellites planned.',
  },
  {
    agency: 'ESA',
    country: 'Europe',
    flag: '\u{1F1EA}\u{1F1FA}',
    budget2024: 7.8,
    budget2025: 7.5,
    change: -3.8,
    currency: 'EUR',
    focusAreas: ['Ariane 6 Operations', 'ExoMars / Rosalind Franklin', 'Copernicus / Sentinel Expansion', 'Lunar Gateway (I-HAB)', 'Space Safety / HERA'],
    notes: '22 member states. Ariane 6 maiden flight July 2024. HERA asteroid mission launched Oct 2024. Slight budget consolidation after record 2022 Ministerial.',
  },
  {
    agency: 'CNSA (estimated)',
    country: 'China',
    flag: '\u{1F1E8}\u{1F1F3}',
    budget2024: 14.0,
    budget2025: 16.0,
    change: 14.3,
    currency: 'USD',
    focusAreas: ['Tiangong Space Station Operations', 'Chang\'e-7 Lunar South Pole', 'Tianwen Mars & Jupiter', 'BeiDou-3 Navigation', 'Long March 9 / 10 Development'],
    notes: 'Estimated from open-source analysis. Includes CASC and military space. Chang\'e-6 lunar far side sample return success 2024. Actual figures not publicly disclosed.',
  },
  {
    agency: 'CNES',
    country: 'France',
    flag: '\u{1F1EB}\u{1F1F7}',
    budget2024: 3.4,
    budget2025: 3.5,
    change: 2.9,
    currency: 'EUR',
    focusAreas: ['Ariane Group / Ariane 6', 'Earth Observation (Pleiades Neo)', 'Defense Space (Syracuse IV)', 'Telecommunications', 'CO2M / Climate'],
    notes: 'Largest ESA contributor. Includes national programs and ESA contribution. Kourou spaceport operations for Ariane 6 and Vega-C.',
  },
  {
    agency: 'DLR (Space Agency)',
    country: 'Germany',
    flag: '\u{1F1E9}\u{1F1EA}',
    budget2024: 2.8,
    budget2025: 2.9,
    change: 3.6,
    currency: 'EUR',
    focusAreas: ['Earth Observation (EnMAP, TerraSAR)', 'Robotics & Exploration (MMX)', 'Satellite Communications (Heinrich Hertz)', 'Space Science', 'Quantum Technology'],
    notes: 'Second-largest ESA contributor. Strong in Earth observation, robotics, and materials science. Investing in quantum communications for space.',
  },
  {
    agency: 'JAXA',
    country: 'Japan',
    flag: '\u{1F1EF}\u{1F1F5}',
    budget2024: 1.5,
    budget2025: 1.8,
    change: 20.0,
    currency: 'USD',
    focusAreas: ['H3 Launch Vehicle (operational)', 'LUPEX Lunar Polar Exploration', 'MMX (Martian Moons)', 'SLIM Follow-On', 'ALOS / Earth Observation'],
    notes: 'Significant budget increase under Japan\'s space security strategy. SLIM lunar lander success Jan 2024. H3 rocket now operational after 2024 success.',
  },
  {
    agency: 'ISRO',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    budget2024: 1.5,
    budget2025: 1.8,
    change: 20.0,
    currency: 'USD',
    focusAreas: ['Gaganyaan (Human Spaceflight)', 'Chandrayaan-4 (Sample Return)', 'NISAR (NASA-ISRO SAR)', 'Next-Gen Launch Vehicle (NGLV)', 'NavIC Navigation'],
    notes: 'Major budget increase. Gaganyaan uncrewed test flights underway, crewed flight planned 2026. NISAR satellite launched 2025. Private sector opening accelerating.',
  },
  {
    agency: 'Roscosmos',
    country: 'Russia',
    flag: '\u{1F1F7}\u{1F1FA}',
    budget2024: 3.1,
    budget2025: 3.7,
    change: 19.4,
    currency: 'USD',
    focusAreas: ['ISS Operations / Soyuz', 'GLONASS Navigation Modernization', 'Angara A5 / Amur (reusable)', 'Luna-26 Orbiter', 'Sphere Constellation'],
    notes: 'Nominal ruble increase offset by exchange rate weakness. Luna-25 crash in 2023. Declining international partnerships post-2022. Focus on sovereign capabilities.',
  },
  {
    agency: 'ASI',
    country: 'Italy',
    flag: '\u{1F1EE}\u{1F1F9}',
    budget2024: 2.5,
    budget2025: 2.7,
    change: 8.0,
    currency: 'EUR',
    focusAreas: ['COSMO-SkyMed Second Gen', 'Vega-C Rocket (return to flight)', 'Space Rider (reusable)', 'ISS / Columbus', 'Lunar Exploration (Argonaut lander)'],
    notes: 'Third-largest ESA contributor. Strong in Earth observation and small launch. Space Rider reusable spacecraft in development.',
  },
  {
    agency: 'UKSA',
    country: 'United Kingdom',
    flag: '\u{1F1EC}\u{1F1E7}',
    budget2024: 0.8,
    budget2025: 1.0,
    change: 25.0,
    currency: 'GBP',
    focusAreas: ['OneWeb / Connectivity', 'Space Sustainability / ADR', 'Earth Observation (NovaSAR-2)', 'SaxaVord & Sutherland Spaceports', 'Regulation & Licensing'],
    notes: 'Accelerating investment. National Space Strategy. SaxaVord spaceport operational for suborbital. Focus on space sustainability and debris removal leadership.',
  },
  {
    agency: 'CSA',
    country: 'Canada',
    flag: '\u{1F1E8}\u{1F1E6}',
    budget2024: 0.4,
    budget2025: 0.5,
    change: 25.0,
    currency: 'CAD',
    focusAreas: ['Canadarm3 / Lunar Gateway', 'RADARSAT Constellation', 'Astronaut Program', 'Space Health Research', 'Quantum Encryption (QEYSSat)'],
    notes: 'CAD $834M planned through 2026. Key Lunar Gateway partner via Canadarm3 robotic arm. Jeremy Hansen assigned to Artemis II crew.',
  },
  {
    agency: 'KASA',
    country: 'South Korea',
    flag: '\u{1F1F0}\u{1F1F7}',
    budget2024: 0.7,
    budget2025: 0.9,
    change: 28.6,
    currency: 'USD',
    focusAreas: ['KSLV-II Nuri (operational)', 'Korea Pathfinder Lunar Orbiter (ops)', 'Next-Gen Sat Development', 'Space Surveillance Network', 'Reusable Vehicle R&D'],
    notes: 'Korea Aerospace Administration (KASA) established May 2024 as dedicated space agency. Nuri rocket operational. KPLO lunar mission continuing. Ramping up rapidly.',
  },
  {
    agency: 'UAESA',
    country: 'United Arab Emirates',
    flag: '\u{1F1E6}\u{1F1EA}',
    budget2024: 0.6,
    budget2025: 0.7,
    change: 16.7,
    currency: 'USD',
    focusAreas: ['Emirates Mars Mission (Hope)', 'MBR Explorer (Asteroid Belt)', 'Earth Observation', 'Space Industry Hub', 'Moon Mission Planning'],
    notes: 'Rapidly growing space program. Hope orbiter at Mars. MBR Explorer asteroid belt mission in development. Establishing Abu Dhabi as regional space hub.',
  },
  {
    agency: 'ASA',
    country: 'Australia',
    flag: '\u{1F1E6}\u{1F1FA}',
    budget2024: 0.2,
    budget2025: 0.3,
    change: 50.0,
    currency: 'AUD',
    focusAreas: ['Space Situational Awareness', 'Earth Observation (NovaSAR-1)', 'Satellite Communications', 'Launch Capability (Equatorial Launch)', 'Moon to Mars Program'],
    notes: 'AUD $450M over 5 years announced. AUKUS Pillar II space cooperation. Growing emphasis on sovereign space capabilities and launch.',
  },
];

const WORKFORCE_STATS = [
  {
    category: 'Total U.S. Space Workforce',
    value: '360,000+',
    detail: 'Direct space industry employment including commercial, civil government, and national security sectors',
    source: 'Space Foundation 2024',
  },
  {
    category: 'Global Space Workforce',
    value: '1,300,000+',
    detail: 'Estimated total across all space-faring nations including manufacturing, operations, and services',
    source: 'OECD Space Economy 2024',
  },
  {
    category: 'Space Companies Worldwide',
    value: '18,000+',
    detail: 'Registered entities in the global space industry, up from ~10,000 in 2020',
    source: 'Bryce Tech / CSIS 2024',
  },
  {
    category: 'U.S. Unfilled Positions',
    value: '45,000+',
    detail: 'Estimated open roles across aerospace and defense, primarily in software, systems engineering, and RF',
    source: 'AIAA / BLS 2024',
  },
  {
    category: 'Annual Space Graduates (U.S.)',
    value: '42,000+',
    detail: 'STEM graduates entering aerospace-relevant fields annually from U.S. universities',
    source: 'NSF / NCES 2024',
  },
  {
    category: 'Space Startup Employees',
    value: '85,000+',
    detail: 'Estimated employment at venture-backed space companies globally (Series A and beyond)',
    source: 'Space Capital Q4 2024',
  },
  {
    category: 'Women in Aerospace',
    value: '24%',
    detail: 'Percentage of aerospace and defense workforce that identifies as female, up from 20% in 2019',
    source: 'Aviation Week / AIAA 2024',
  },
  {
    category: 'Median Space Engineer Salary (U.S.)',
    value: '$128,000',
    detail: 'Median annual compensation for aerospace engineers, varies by role and location. Space software roles command ~$150K+',
    source: 'BLS / Glassdoor 2024',
  },
];

const LAUNCH_COST_TRENDS = [
  { vehicle: 'Starship (projected)', operator: 'SpaceX', year: 2025, costPerKgLEO: 100, payload: 150000, reusable: true },
  { vehicle: 'Falcon Heavy', operator: 'SpaceX', year: 2018, costPerKgLEO: 1500, payload: 63800, reusable: true },
  { vehicle: 'Falcon 9 Block 5', operator: 'SpaceX', year: 2018, costPerKgLEO: 2720, payload: 22800, reusable: true },
  { vehicle: 'New Glenn', operator: 'Blue Origin', year: 2025, costPerKgLEO: 1530, payload: 45000, reusable: true },
  { vehicle: 'H3', operator: 'JAXA / MHI', year: 2024, costPerKgLEO: 2300, payload: 22000, reusable: false },
  { vehicle: 'Long March 3B/E', operator: 'CASC (China)', year: 1996, costPerKgLEO: 2540, payload: 11500, reusable: false },
  { vehicle: 'Long March 8A', operator: 'CASC (China)', year: 2025, costPerKgLEO: 2750, payload: 9800, reusable: false },
  { vehicle: 'Long March 5', operator: 'CASC (China)', year: 2016, costPerKgLEO: 3000, payload: 25000, reusable: false },
  { vehicle: 'Proton-M', operator: 'Roscosmos', year: 2001, costPerKgLEO: 2900, payload: 23000, reusable: false },
  { vehicle: 'Terran R (dev)', operator: 'Relativity Space', year: 2026, costPerKgLEO: 3000, payload: 33500, reusable: true },
  { vehicle: 'Vulcan Centaur', operator: 'ULA', year: 2024, costPerKgLEO: 4400, payload: 27200, reusable: false },
  { vehicle: 'Neutron (dev)', operator: 'Rocket Lab', year: 2026, costPerKgLEO: 4100, payload: 13000, reusable: true },
  { vehicle: 'Ariane 6 (A64)', operator: 'Arianespace', year: 2024, costPerKgLEO: 4600, payload: 21600, reusable: false },
  { vehicle: 'Angara A5', operator: 'Roscosmos', year: 2014, costPerKgLEO: 3900, payload: 24500, reusable: false },
  { vehicle: 'Soyuz-2', operator: 'Roscosmos', year: 2004, costPerKgLEO: 5300, payload: 8200, reusable: false },
  { vehicle: 'LVM3 (GSLV Mk III)', operator: 'ISRO', year: 2017, costPerKgLEO: 6900, payload: 10000, reusable: false },
  { vehicle: 'PSLV', operator: 'ISRO', year: 1993, costPerKgLEO: 8100, payload: 3800, reusable: false },
  { vehicle: 'SSLV', operator: 'ISRO', year: 2022, costPerKgLEO: 8200, payload: 500, reusable: false },
  { vehicle: 'Atlas V', operator: 'ULA (retiring)', year: 2002, costPerKgLEO: 8600, payload: 18850, reusable: false },
  { vehicle: 'Long March 2D', operator: 'CASC (China)', year: 1992, costPerKgLEO: 8570, payload: 3500, reusable: false },
  { vehicle: 'Ariane 6 (A62)', operator: 'Arianespace', year: 2024, costPerKgLEO: 9700, payload: 10300, reusable: false },
  { vehicle: 'Kuaizhou-1A', operator: 'ExPace (China)', year: 2017, costPerKgLEO: 10000, payload: 300, reusable: false },
  { vehicle: 'Alpha', operator: 'Firefly Aerospace', year: 2023, costPerKgLEO: 14560, payload: 1030, reusable: false },
  { vehicle: 'Hyperbola-1', operator: 'iSpace (China)', year: 2019, costPerKgLEO: 16700, payload: 300, reusable: false },
  { vehicle: 'Vega C', operator: 'Arianespace', year: 2022, costPerKgLEO: 20000, payload: 2300, reusable: false },
  { vehicle: 'Electron', operator: 'Rocket Lab', year: 2017, costPerKgLEO: 25000, payload: 300, reusable: false },
  { vehicle: 'Minotaur IV', operator: 'Northrop Grumman', year: 2010, costPerKgLEO: 40000, payload: 1735, reusable: false },
  { vehicle: 'Space Shuttle', operator: 'NASA (retired)', year: 1981, costPerKgLEO: 54500, payload: 27500, reusable: true },
  { vehicle: 'Pegasus XL', operator: 'Northrop Grumman', year: 1994, costPerKgLEO: 126300, payload: 443, reusable: false },
];

export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const seeded: string[] = [];

    // 1. Market Segments
    const key1 = await upsertContent('space-economy', 'market-segments', MARKET_SEGMENTS);
    seeded.push(key1);

    // 2. Quarterly VC Data
    const key2 = await upsertContent('space-economy', 'quarterly-vc', QUARTERLY_VC);
    seeded.push(key2);

    // 3. Annual Investment
    const key3 = await upsertContent('space-economy', 'annual-investment', ANNUAL_INVESTMENT);
    seeded.push(key3);

    // 4. Government Budgets
    const key4 = await upsertContent('space-economy', 'government-budgets', GOVERNMENT_BUDGETS);
    seeded.push(key4);

    // 5. Workforce Stats
    const key5 = await upsertContent('space-economy', 'workforce-stats', WORKFORCE_STATS);
    seeded.push(key5);

    // 6. Launch Cost Trends
    const key6 = await upsertContent('space-economy', 'launch-cost-trends', LAUNCH_COST_TRENDS);
    seeded.push(key6);

    const duration = Date.now() - startTime;

    logger.info('Space economy data seeded successfully', {
      sections: seeded.length,
      duration,
    });

    return createSuccessResponse({
      message: 'Space economy data seeded successfully',
      sectionsSeeded: seeded,
      duration: `${duration}ms`,
      data: {
        marketSegments: MARKET_SEGMENTS.length,
        quarterlyVC: QUARTERLY_VC.length,
        annualInvestment: ANNUAL_INVESTMENT.length,
        governmentBudgets: GOVERNMENT_BUDGETS.length,
        workforceStats: WORKFORCE_STATS.length,
        launchCostTrends: LAUNCH_COST_TRENDS.length,
      },
    });
  } catch (error) {
    logger.error('Space economy init failed', { error });
    return internalError('Failed to seed space economy data');
  }
}
