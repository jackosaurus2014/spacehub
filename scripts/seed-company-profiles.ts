import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to create slug from company name
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface CompanyData {
  name: string;
  legalName?: string;
  slug?: string;
  ticker?: string;
  exchange?: string;
  headquarters: string;
  country: string;
  foundedYear: number;
  employeeRange: string;
  employeeCount?: number;
  website: string;
  description: string;
  longDescription?: string;
  logoUrl?: string;
  ceo?: string;
  cto?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  isPublic?: boolean;
  marketCap?: number;
  stockPrice?: number;
  status?: string;
  sector: string;
  subsector?: string;
  tags: string[];
  tier: number;
  totalFunding?: number;
  lastFundingRound?: string;
  lastFundingDate?: string;
  valuation?: number;
  revenueEstimate?: number;
  ownershipType?: string;
  parentCompany?: string;
  fundingRounds?: Array<{
    date: string;
    amount?: number;
    seriesLabel?: string;
    roundType?: string;
    leadInvestor?: string;
    investors?: string[];
    postValuation?: number;
  }>;
  products?: Array<{
    name: string;
    category?: string;
    description?: string;
    status?: string;
    specs?: Record<string, unknown>;
  }>;
  keyPersonnel?: Array<{
    name: string;
    title: string;
    role?: string;
    linkedinUrl?: string;
    bio?: string;
    previousCompanies?: string[];
  }>;
  events?: Array<{
    date: string;
    type: string;
    title: string;
    description?: string;
    importance?: number;
  }>;
  facilities?: Array<{
    name: string;
    type: string;
    city?: string;
    state?: string;
    country: string;
  }>;
  contracts?: Array<{
    agency: string;
    title: string;
    description?: string;
    awardDate?: string;
    value?: number;
    ceiling?: number;
  }>;
  revenueEstimates?: Array<{
    year: number;
    quarter?: number;
    revenue?: number;
    revenueRange?: string;
    source?: string;
    confidenceLevel?: string;
  }>;
  scores?: Array<{
    scoreType: string;
    score: number;
  }>;
}

// ────────────────────────────────────────────────────────────────
// TIER 1 COMPANIES (30 Must-Have)
// ────────────────────────────────────────────────────────────────

const TIER_1: CompanyData[] = [
  {
    name: 'SpaceX',
    legalName: 'Space Exploration Technologies Corp.',
    headquarters: 'Hawthorne, California',
    country: 'US',
    foundedYear: 2002,
    employeeRange: '5000+',
    employeeCount: 13000,
    website: 'https://www.spacex.com',
    description: 'SpaceX designs, manufactures and launches advanced rockets and spacecraft. Founded by Elon Musk with the goal of reducing space transportation costs to enable the colonization of Mars.',
    longDescription: 'SpaceX has revolutionized the launch industry with reusable rocket technology. The Falcon 9 is the world\'s most-flown orbital rocket, and Starship is the largest and most powerful rocket ever built. The company also operates Starlink, the world\'s largest satellite constellation providing broadband internet globally. SpaceX holds contracts with NASA for crew and cargo transport to the ISS, lunar lander development (HLS), and numerous commercial and government launch contracts.',
    ceo: 'Elon Musk',
    cto: 'Elon Musk',
    isPublic: false,
    status: 'active',
    sector: 'launch',
    subsector: 'heavy-lift',
    tags: ['launch-provider', 'reusable-rockets', 'starlink', 'human-spaceflight', 'mars', 'leo-broadband'],
    tier: 1,
    totalFunding: 9700000000,
    lastFundingRound: 'Series N',
    lastFundingDate: '2024-06-01',
    valuation: 210000000000,
    revenueEstimate: 13000000000,
    ownershipType: 'private',
    fundingRounds: [
      { date: '2024-06-01', amount: 750000000, seriesLabel: 'Series N', roundType: 'equity', leadInvestor: 'Andreessen Horowitz', investors: ['Andreessen Horowitz', 'Founders Fund', 'Sequoia Capital'], postValuation: 210000000000 },
      { date: '2023-12-01', amount: 750000000, seriesLabel: 'Series M', roundType: 'equity', postValuation: 180000000000 },
      { date: '2022-08-01', amount: 1680000000, seriesLabel: 'Series L', roundType: 'equity', postValuation: 127000000000 },
    ],
    products: [
      { name: 'Falcon 9', category: 'launch_vehicle', description: 'Partially reusable medium-lift orbital rocket. World\'s most-launched orbital rocket.', status: 'active', specs: { payload_leo_kg: 22800, payload_gto_kg: 8300, stages: 2, reusable: 'first stage' } },
      { name: 'Falcon Heavy', category: 'launch_vehicle', description: 'Partially reusable heavy-lift launch vehicle using three Falcon 9 boosters.', status: 'active', specs: { payload_leo_kg: 63800, payload_gto_kg: 26700 } },
      { name: 'Starship', category: 'launch_vehicle', description: 'Fully reusable super heavy-lift launch vehicle. Largest and most powerful rocket ever flown.', status: 'development', specs: { payload_leo_kg: 150000, height_m: 121 } },
      { name: 'Dragon', category: 'spacecraft', description: 'Reusable spacecraft for cargo and crew transport to ISS.', status: 'active' },
      { name: 'Starlink', category: 'satellite_constellation', description: 'LEO broadband internet constellation with 6,000+ satellites.', status: 'active', specs: { satellites_deployed: 6500, orbit_km: 550, users_millions: 4 } },
    ],
    keyPersonnel: [
      { name: 'Elon Musk', title: 'CEO & Chief Engineer', role: 'founder', bio: 'Founded SpaceX in 2002. Also CEO of Tesla and owner of X (Twitter).', previousCompanies: ['PayPal', 'Tesla', 'The Boring Company'] },
      { name: 'Gwynne Shotwell', title: 'President & COO', role: 'executive', bio: 'Joined SpaceX in 2002 as VP of Business Development. Oversees day-to-day operations and customer relationships.', previousCompanies: ['Aerospace Corporation', 'Microcosm'] },
      { name: 'Tom Mueller', title: 'Former VP of Propulsion', role: 'founder', bio: 'Co-founded SpaceX, designed Merlin and Raptor engines. Retired from SpaceX.', previousCompanies: ['TRW'] },
    ],
    events: [
      { date: '2002-05-06', type: 'founding', title: 'SpaceX founded by Elon Musk', importance: 10 },
      { date: '2008-09-28', type: 'first_launch', title: 'Falcon 1 reaches orbit — first privately-funded liquid-fuel rocket', importance: 10 },
      { date: '2012-05-25', type: 'milestone', title: 'Dragon becomes first commercial spacecraft to dock with ISS', importance: 9 },
      { date: '2015-12-22', type: 'milestone', title: 'First orbital-class rocket landing (Falcon 9 B1019)', importance: 10 },
      { date: '2020-05-30', type: 'milestone', title: 'Crew Dragon Demo-2: First commercial crew mission to ISS', importance: 10 },
      { date: '2024-10-13', type: 'milestone', title: 'Starship IFT-5: First successful Super Heavy booster catch by Mechazilla', importance: 9 },
      { date: '2025-01-16', type: 'milestone', title: 'Starship IFT-7: Full mission profile success', importance: 9 },
    ],
    facilities: [
      { name: 'SpaceX Headquarters & Factory', type: 'headquarters', city: 'Hawthorne', state: 'CA', country: 'US' },
      { name: 'Starbase', type: 'launch_site', city: 'Boca Chica', state: 'TX', country: 'US' },
      { name: 'Cape Canaveral SLC-40', type: 'launch_site', city: 'Cape Canaveral', state: 'FL', country: 'US' },
      { name: 'Kennedy Space Center LC-39A', type: 'launch_site', city: 'Merritt Island', state: 'FL', country: 'US' },
      { name: 'Vandenberg SLC-4E', type: 'launch_site', city: 'Lompoc', state: 'CA', country: 'US' },
      { name: 'Starlink Operations', type: 'office', city: 'Redmond', state: 'WA', country: 'US' },
    ],
    contracts: [
      { agency: 'NASA', title: 'Commercial Crew Program (CCtCap)', value: 2600000000, awardDate: '2014-09-16' },
      { agency: 'NASA', title: 'Human Landing System (HLS) - Artemis', value: 2890000000, awardDate: '2021-04-16' },
      { agency: 'Space Force', title: 'National Security Space Launch Phase 2', value: 2000000000, awardDate: '2020-08-07' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 13000000000, source: 'Industry estimate', confidenceLevel: 'estimate' },
      { year: 2023, revenue: 8700000000, source: 'Industry estimate', confidenceLevel: 'estimate' },
      { year: 2022, revenue: 4600000000, source: 'Industry estimate', confidenceLevel: 'estimate' },
    ],
    scores: [
      { scoreType: 'overall', score: 98 },
      { scoreType: 'technology', score: 99 },
      { scoreType: 'market_position', score: 97 },
      { scoreType: 'growth', score: 95 },
      { scoreType: 'funding', score: 96 },
    ],
  },
  {
    name: 'Rocket Lab',
    legalName: 'Rocket Lab USA, Inc.',
    ticker: 'RKLB',
    exchange: 'NASDAQ',
    headquarters: 'Long Beach, California',
    country: 'US',
    foundedYear: 2006,
    employeeRange: '1001-5000',
    employeeCount: 2000,
    website: 'https://www.rocketlabusa.com',
    description: 'Rocket Lab is an end-to-end space company delivering reliable launch services, satellite manufacturing, spacecraft components, and on-orbit management solutions.',
    longDescription: 'Founded by Peter Beck in New Zealand, Rocket Lab has become the second most frequently launched U.S. rocket company after SpaceX. The Electron rocket is a dedicated small-satellite launcher, while the medium-lift Neutron rocket is in development. Rocket Lab also manufactures satellites and spacecraft components through acquisitions of SolAero, Sinclair Interplanetary, and ASI.',
    ceo: 'Peter Beck',
    isPublic: true,
    marketCap: 12000000000,
    stockPrice: 25.50,
    status: 'active',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['launch-provider', 'small-sat', 'satellite-manufacturing', 'spacecraft-components', 'reusable'],
    tier: 1,
    totalFunding: 788000000,
    lastFundingRound: 'SPAC',
    valuation: 12000000000,
    revenueEstimate: 436000000,
    ownershipType: 'public',
    fundingRounds: [
      { date: '2021-08-25', amount: 320000000, seriesLabel: 'SPAC', roundType: 'spac', leadInvestor: 'Vector Acquisition Corp' },
      { date: '2019-11-01', amount: 140000000, seriesLabel: 'Series F', roundType: 'equity', leadInvestor: 'Future Fund' },
      { date: '2018-11-01', amount: 140000000, seriesLabel: 'Series E', roundType: 'equity' },
    ],
    products: [
      { name: 'Electron', category: 'launch_vehicle', description: 'Dedicated small satellite launcher. 3D-printed Rutherford engines.', status: 'active', specs: { payload_leo_kg: 300, height_m: 18, cost_per_launch: 7500000 } },
      { name: 'Neutron', category: 'launch_vehicle', description: 'Reusable medium-lift rocket targeting constellation deployment and human spaceflight.', status: 'development', specs: { payload_leo_kg: 13000 } },
      { name: 'Photon', category: 'satellite_bus', description: 'Configurable satellite platform for LEO and interplanetary missions.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Peter Beck', title: 'Founder, CEO & CTO', role: 'founder', bio: 'Self-taught rocket engineer from New Zealand. Founded Rocket Lab in 2006.', previousCompanies: ['Fisher & Paykel', 'Industrial Research Limited'] },
      { name: 'Adam Spice', title: 'CFO', role: 'executive', previousCompanies: ['MaxLinear', 'Broadcom'] },
    ],
    events: [
      { date: '2006-06-01', type: 'founding', title: 'Rocket Lab founded in Auckland, New Zealand', importance: 8 },
      { date: '2018-01-21', type: 'first_launch', title: 'Electron "Still Testing" reaches orbit', importance: 9 },
      { date: '2021-08-25', type: 'ipo', title: 'Rocket Lab goes public via SPAC merger with Vector Acquisition', importance: 8 },
      { date: '2024-03-21', type: 'milestone', title: 'Electron completes 50th launch', importance: 7 },
    ],
    facilities: [
      { name: 'Rocket Lab HQ', type: 'headquarters', city: 'Long Beach', state: 'CA', country: 'US' },
      { name: 'Launch Complex 1', type: 'launch_site', city: 'Mahia Peninsula', country: 'NZ' },
      { name: 'Launch Complex 2', type: 'launch_site', city: 'Wallops Island', state: 'VA', country: 'US' },
      { name: 'Neutron Production Complex', type: 'manufacturing', city: 'Middle River', state: 'MD', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 436000000, source: 'SEC Filing', confidenceLevel: 'reported' },
      { year: 2023, revenue: 245000000, source: 'SEC Filing', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'overall', score: 88 },
      { scoreType: 'technology', score: 85 },
      { scoreType: 'market_position', score: 82 },
      { scoreType: 'growth', score: 90 },
    ],
  },
  {
    name: 'United Launch Alliance',
    legalName: 'United Launch Alliance, LLC',
    headquarters: 'Centennial, Colorado',
    country: 'US',
    foundedYear: 2006,
    employeeRange: '1001-5000',
    employeeCount: 3400,
    website: 'https://www.ulalaunch.com',
    description: 'ULA is a joint venture of Lockheed Martin and Boeing providing reliable launch services for the U.S. government and commercial customers.',
    ceo: 'Tory Bruno',
    isPublic: false,
    status: 'active',
    sector: 'launch',
    subsector: 'heavy-lift',
    tags: ['launch-provider', 'national-security', 'government', 'vulcan', 'atlas-v'],
    tier: 1,
    revenueEstimate: 3000000000,
    ownershipType: 'joint-venture',
    parentCompany: 'Lockheed Martin / Boeing',
    products: [
      { name: 'Vulcan Centaur', category: 'launch_vehicle', description: 'Next-generation launch vehicle replacing Atlas V and Delta IV Heavy.', status: 'active', specs: { payload_leo_kg: 27200, payload_gto_kg: 11340 } },
      { name: 'Atlas V', category: 'launch_vehicle', description: 'Workhorse launch vehicle with 100+ consecutive successful missions.', status: 'active', specs: { payload_leo_kg: 18850 } },
    ],
    keyPersonnel: [
      { name: 'Tory Bruno', title: 'President & CEO', role: 'executive', previousCompanies: ['Lockheed Martin'] },
    ],
    events: [
      { date: '2006-12-01', type: 'founding', title: 'ULA formed as Lockheed Martin/Boeing joint venture', importance: 9 },
      { date: '2024-01-08', type: 'first_launch', title: 'Vulcan Centaur inaugural launch success', importance: 9 },
    ],
    facilities: [
      { name: 'ULA Headquarters', type: 'headquarters', city: 'Centennial', state: 'CO', country: 'US' },
      { name: 'SLC-41', type: 'launch_site', city: 'Cape Canaveral', state: 'FL', country: 'US' },
      { name: 'Decatur Factory', type: 'manufacturing', city: 'Decatur', state: 'AL', country: 'US' },
    ],
    contracts: [
      { agency: 'Space Force', title: 'National Security Space Launch Phase 2 Lane 2', value: 3200000000, awardDate: '2020-08-07' },
    ],
    scores: [
      { scoreType: 'overall', score: 82 },
      { scoreType: 'technology', score: 78 },
      { scoreType: 'market_position', score: 85 },
    ],
  },
  {
    name: 'Blue Origin',
    headquarters: 'Kent, Washington',
    country: 'US',
    foundedYear: 2000,
    employeeRange: '10000+',
    website: 'https://www.blueorigin.com',
    description: 'Blue Origin is a private aerospace manufacturer and spaceflight services company developing reusable launch vehicles and human spaceflight systems, founded by Jeff Bezos.',
    ceo: 'Dave Limp',
    sector: 'launch',
    tags: ['launch-provider', 'human-spaceflight', 'reusable-rockets', 'suborbital-tourism', 'engine-manufacturing'],
    tier: 1,
    totalFunding: 13000000000,
    ownershipType: 'private',
    products: [
      { name: 'New Shepard', category: 'launch_vehicle', description: 'Suborbital reusable launch vehicle for space tourism and research payloads.', status: 'active', specs: { apogee_km: 100, passengers: 6 } },
      { name: 'New Glenn', category: 'launch_vehicle', description: 'Heavy-lift reusable orbital launch vehicle with 7m fairing.', status: 'development', specs: { payload_leo_kg: 45000, payload_gto_kg: 13000 } },
      { name: 'BE-4', category: 'engine', description: 'LOX/LNG engine powering both New Glenn and ULA Vulcan Centaur.', status: 'active', specs: { thrust_kn: 2400 } },
    ],
    keyPersonnel: [
      { name: 'Dave Limp', title: 'CEO', role: 'executive', previousCompanies: ['Amazon'] },
      { name: 'Jeff Bezos', title: 'Founder & Executive Chairman', role: 'founder', previousCompanies: ['Amazon'] },
    ],
    events: [
      { date: '2000-09-08', type: 'founding', title: 'Blue Origin founded by Jeff Bezos', importance: 9 },
      { date: '2024-10-13', type: 'milestone', title: 'New Glenn first launch attempt', importance: 8 },
    ],
    facilities: [
      { name: 'Blue Origin HQ & Factory', type: 'headquarters', city: 'Kent', state: 'WA', country: 'US' },
      { name: 'Launch Complex 36', type: 'launch_site', city: 'Cape Canaveral', state: 'FL', country: 'US' },
      { name: 'West Texas Launch Site', type: 'launch_site', city: 'Van Horn', state: 'TX', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 88 }, { scoreType: 'technology', score: 90 }],
  },
  {
    name: 'Northrop Grumman',
    headquarters: 'Falls Church, Virginia',
    country: 'US',
    foundedYear: 1939,
    employeeRange: '10000+',
    website: 'https://www.northropgrumman.com',
    description: 'Major defense and aerospace company providing launch vehicles, satellites, and space systems including Cygnus cargo spacecraft and solid rocket boosters.',
    ceo: 'Kathy Warden',
    sector: 'defense',
    tags: ['defense-prime', 'launch-provider', 'satellite-manufacturer', 'solid-rockets'],
    tier: 1,
    totalFunding: 0,
    marketCap: 70000000000,
    exchange: 'NYSE',
    ticker: 'NOC',
    ownershipType: 'public',
    revenueEstimate: 36000000000,
    products: [
      { name: 'Cygnus', category: 'spacecraft', description: 'Cargo resupply spacecraft for the ISS.', status: 'active' },
      { name: 'OmegA/Pegasus', category: 'launch_vehicle', description: 'Launch vehicle family including Pegasus air-launch and legacy Antares.', status: 'active' },
      { name: 'MEV (Mission Extension Vehicle)', category: 'spacecraft', description: 'Satellite life-extension spacecraft that docks with aging GEO satellites.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Kathy Warden', title: 'Chair, CEO & President', role: 'executive' },
    ],
    events: [
      { date: '2018-06-06', type: 'acquisition', title: 'Completed acquisition of Orbital ATK for $9.2B', importance: 9 },
    ],
    facilities: [
      { name: 'Northrop Grumman HQ', type: 'headquarters', city: 'Falls Church', state: 'VA', country: 'US' },
      { name: 'Chandler Satellite Facility', type: 'manufacturing', city: 'Chandler', state: 'AZ', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 36600000000, source: 'SEC Filing' },
    ],
    scores: [{ scoreType: 'overall', score: 90 }, { scoreType: 'market_position', score: 95 }],
  },
  {
    name: 'Lockheed Martin',
    headquarters: 'Bethesda, Maryland',
    country: 'US',
    foundedYear: 1995,
    employeeRange: '10000+',
    website: 'https://www.lockheedmartin.com',
    description: 'World\'s largest defense contractor with major space systems including Orion crew capsule, GPS III satellites, and missile defense systems.',
    ceo: 'Jim Taiclet',
    sector: 'defense',
    tags: ['defense-prime', 'satellite-manufacturer', 'human-spaceflight', 'missile-defense', 'gps'],
    tier: 1,
    totalFunding: 0,
    marketCap: 130000000000,
    exchange: 'NYSE',
    ticker: 'LMT',
    ownershipType: 'public',
    revenueEstimate: 67600000000,
    products: [
      { name: 'Orion Spacecraft', category: 'spacecraft', description: 'Deep space crew capsule for Artemis lunar missions.', status: 'active' },
      { name: 'GPS III', category: 'satellite', description: 'Next-generation GPS satellites with enhanced accuracy and cyber resilience.', status: 'active' },
      { name: 'A2100 Satellite Bus', category: 'satellite_bus', description: 'Versatile GEO satellite platform for commercial and military missions.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Jim Taiclet', title: 'Chairman, President & CEO', role: 'executive', previousCompanies: ['American Tower'] },
    ],
    events: [
      { date: '1995-03-15', type: 'founding', title: 'Lockheed Martin formed from merger of Lockheed Corp and Martin Marietta', importance: 10 },
    ],
    facilities: [
      { name: 'Lockheed Martin HQ', type: 'headquarters', city: 'Bethesda', state: 'MD', country: 'US' },
      { name: 'Denver Space Campus', type: 'manufacturing', city: 'Littleton', state: 'CO', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 67600000000, source: 'SEC Filing' },
    ],
    scores: [{ scoreType: 'overall', score: 92 }, { scoreType: 'market_position', score: 97 }],
  },
  {
    name: 'Boeing',
    headquarters: 'Arlington, Virginia',
    country: 'US',
    foundedYear: 1916,
    employeeRange: '10000+',
    website: 'https://www.boeing.com',
    description: 'Major aerospace company responsible for SLS core stage, CST-100 Starliner crew capsule, and satellite systems. Key NASA and DoD space contractor.',
    ceo: 'Kelly Ortberg',
    sector: 'defense',
    tags: ['defense-prime', 'human-spaceflight', 'satellite-manufacturer', 'launch-systems'],
    tier: 1,
    totalFunding: 0,
    marketCap: 120000000000,
    exchange: 'NYSE',
    ticker: 'BA',
    ownershipType: 'public',
    revenueEstimate: 66000000000,
    products: [
      { name: 'SLS Core Stage', category: 'launch_vehicle', description: 'Core stage for NASA Space Launch System, America\'s deep space rocket.', status: 'active' },
      { name: 'CST-100 Starliner', category: 'spacecraft', description: 'Crew capsule for ISS transportation under NASA Commercial Crew Program.', status: 'active' },
      { name: 'WGS Satellites', category: 'satellite', description: 'Wideband Global SATCOM military communication satellites.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Kelly Ortberg', title: 'President & CEO', role: 'executive', previousCompanies: ['Rockwell Collins'] },
    ],
    events: [
      { date: '1916-07-15', type: 'founding', title: 'Boeing founded by William Boeing in Seattle', importance: 10 },
    ],
    facilities: [
      { name: 'Boeing HQ', type: 'headquarters', city: 'Arlington', state: 'VA', country: 'US' },
      { name: 'Kennedy Space Center Operations', type: 'manufacturing', city: 'Merritt Island', state: 'FL', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 66000000000, source: 'SEC Filing' },
    ],
    scores: [{ scoreType: 'overall', score: 80 }, { scoreType: 'market_position', score: 90 }],
  },
  {
    name: 'L3Harris Technologies',
    headquarters: 'Melbourne, Florida',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '10000+',
    website: 'https://www.l3harris.com',
    description: 'Defense technology company providing responsive space systems, small satellites, ISR payloads, and ground systems for national security missions.',
    ceo: 'Christopher Kubasik',
    sector: 'defense',
    tags: ['defense', 'satellites', 'ISR', 'responsive-space', 'ground-systems'],
    tier: 1,
    marketCap: 45000000000,
    exchange: 'NYSE',
    ticker: 'LHX',
    ownershipType: 'public',
    revenueEstimate: 19400000000,
    products: [
      { name: 'Responsive Space Satellites', category: 'satellite', description: 'Rapidly deployable small satellite systems for national security.', status: 'active' },
      { name: 'Navigation Payloads', category: 'payload', description: 'GPS and PNT payloads for military applications.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Christopher Kubasik', title: 'Chair & CEO', role: 'executive', previousCompanies: ['Lockheed Martin'] },
    ],
    events: [
      { date: '2019-06-29', type: 'founding', title: 'L3 Technologies and Harris Corporation merger completed', importance: 9 },
    ],
    facilities: [
      { name: 'L3Harris HQ', type: 'headquarters', city: 'Melbourne', state: 'FL', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 85 }],
  },
  {
    name: 'SES',
    headquarters: 'Betzdorf, Luxembourg',
    country: 'LU',
    foundedYear: 1985,
    employeeRange: '1001-5000',
    website: 'https://www.ses.com',
    description: 'Global satellite operator with GEO and MEO fleet including O3b mPOWER constellation. Acquired Intelsat in 2024 to become the world\'s largest satellite operator.',
    ceo: 'Adel Al-Saleh',
    sector: 'satellite-operator',
    tags: ['satellite-operator', 'geo', 'meo', 'broadband', 'video'],
    tier: 1,
    marketCap: 5000000000,
    exchange: 'Euronext',
    ticker: 'SESG',
    ownershipType: 'public',
    revenueEstimate: 2000000000,
    products: [
      { name: 'O3b mPOWER', category: 'satellite_constellation', description: 'MEO broadband constellation for high-throughput, low-latency connectivity.', status: 'active' },
      { name: 'SES GEO Fleet', category: 'satellite_constellation', description: 'Fleet of 50+ GEO satellites providing video and data services globally.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Adel Al-Saleh', title: 'CEO', role: 'executive', previousCompanies: ['T-Systems', 'Northgate Information Solutions'] },
    ],
    events: [
      { date: '2024-01-01', type: 'acquisition', title: 'Completed acquisition of Intelsat', importance: 9 },
    ],
    facilities: [
      { name: 'SES HQ', type: 'headquarters', city: 'Betzdorf', country: 'LU' },
    ],
    scores: [{ scoreType: 'overall', score: 88 }],
  },
  {
    name: 'Eutelsat',
    headquarters: 'Paris, France',
    country: 'FR',
    foundedYear: 1977,
    employeeRange: '1001-5000',
    website: 'https://www.eutelsat.com',
    description: 'European satellite operator that merged with OneWeb in 2023 to create an integrated GEO/LEO constellation operator.',
    ceo: 'Eva Berneke',
    sector: 'satellite-operator',
    tags: ['satellite-operator', 'geo', 'leo', 'broadband', 'oneweb'],
    tier: 1,
    marketCap: 3000000000,
    exchange: 'Euronext',
    ticker: 'ETL',
    ownershipType: 'public',
    revenueEstimate: 1300000000,
    products: [
      { name: 'Eutelsat GEO Fleet', category: 'satellite_constellation', description: 'Fleet of GEO satellites for broadcast, broadband, and government services.', status: 'active' },
      { name: 'OneWeb LEO Constellation', category: 'satellite_constellation', description: '648-satellite LEO constellation for global broadband.', status: 'active', specs: { satellites: 648, orbit_km: 1200 } },
    ],
    keyPersonnel: [
      { name: 'Eva Berneke', title: 'CEO', role: 'executive', previousCompanies: ['KMD'] },
    ],
    events: [
      { date: '2023-09-28', type: 'merger', title: 'Eutelsat completes merger with OneWeb', importance: 9 },
    ],
    facilities: [
      { name: 'Eutelsat HQ', type: 'headquarters', city: 'Paris', country: 'FR' },
    ],
    scores: [{ scoreType: 'overall', score: 82 }],
  },
  {
    name: 'Telesat',
    headquarters: 'Ottawa, Canada',
    country: 'CA',
    foundedYear: 1969,
    employeeRange: '501-1000',
    website: 'https://www.telesat.com',
    description: 'Canadian satellite operator developing Telesat Lightspeed, a 198-satellite LEO constellation for enterprise-grade broadband connectivity.',
    ceo: 'Dan Goldberg',
    sector: 'satellite-operator',
    tags: ['satellite-operator', 'leo', 'broadband', 'enterprise'],
    tier: 1,
    marketCap: 1000000000,
    exchange: 'Nasdaq',
    ticker: 'TSAT',
    ownershipType: 'public',
    products: [
      { name: 'Telesat Lightspeed', category: 'satellite_constellation', description: '198-satellite LEO constellation using optical inter-satellite links.', status: 'development', specs: { satellites: 198, orbit_km: 1000 } },
    ],
    keyPersonnel: [
      { name: 'Dan Goldberg', title: 'President & CEO', role: 'executive' },
    ],
    events: [
      { date: '2021-02-09', type: 'milestone', title: 'Telesat selects Thales Alenia Space for Lightspeed constellation', importance: 8 },
    ],
    facilities: [
      { name: 'Telesat HQ', type: 'headquarters', city: 'Ottawa', state: 'ON', country: 'CA' },
    ],
    scores: [{ scoreType: 'overall', score: 72 }],
  },
  {
    name: 'Amazon Kuiper',
    headquarters: 'Redmond, Washington',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '1001-5000',
    website: 'https://www.aboutamazon.com/what-we-do/devices-services/project-kuiper',
    description: 'Amazon\'s $10B+ LEO broadband constellation aiming to deploy 3,236 satellites for global internet connectivity.',
    ceo: 'Rajeev Badyal',
    sector: 'satellite-operator',
    tags: ['satellite-operator', 'leo', 'broadband', 'mega-constellation'],
    tier: 1,
    totalFunding: 10000000000,
    ownershipType: 'subsidiary',
    parentCompany: 'Amazon',
    products: [
      { name: 'Project Kuiper', category: 'satellite_constellation', description: '3,236-satellite LEO broadband constellation.', status: 'development', specs: { satellites: 3236, orbit_km: 590 } },
    ],
    keyPersonnel: [
      { name: 'Rajeev Badyal', title: 'VP, Project Kuiper', role: 'executive', previousCompanies: ['SpaceX'] },
    ],
    events: [
      { date: '2023-10-06', type: 'milestone', title: 'First two KuiperSat prototype satellites launched', importance: 8 },
    ],
    facilities: [
      { name: 'Kuiper HQ', type: 'headquarters', city: 'Redmond', state: 'WA', country: 'US' },
      { name: 'Kuiper Satellite Factory', type: 'manufacturing', city: 'Kirkland', state: 'WA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 80 }],
  },
  {
    name: 'Planet Labs',
    headquarters: 'San Francisco, California',
    country: 'US',
    foundedYear: 2010,
    employeeRange: '501-1000',
    website: 'https://www.planet.com',
    description: 'Largest commercial Earth observation fleet with 200+ satellites providing daily global imaging. Operates PlanetScope, SkySat, and Pelican constellations.',
    ceo: 'Will Marshall',
    sector: 'earth-observation',
    tags: ['earth-observation', 'satellite-operator', 'analytics', 'remote-sensing'],
    tier: 1,
    marketCap: 2000000000,
    exchange: 'NYSE',
    ticker: 'PL',
    ownershipType: 'public',
    revenueEstimate: 220000000,
    products: [
      { name: 'PlanetScope', category: 'satellite_constellation', description: '200+ Dove satellites providing daily 3m-resolution global coverage.', status: 'active', specs: { satellites: 200, resolution_m: 3 } },
      { name: 'SkySat', category: 'satellite_constellation', description: 'High-resolution 50cm imaging satellites for on-demand tasking.', status: 'active', specs: { resolution_m: 0.5 } },
      { name: 'Pelican', category: 'satellite_constellation', description: 'Next-gen 30cm resolution satellites with daily global coverage.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Will Marshall', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['NASA Ames'] },
      { name: 'Robbie Schingler', title: 'Co-Founder & Chief Strategy Officer', role: 'founder', previousCompanies: ['NASA'] },
    ],
    events: [
      { date: '2021-12-07', type: 'ipo', title: 'Planet Labs goes public via SPAC merger', importance: 8 },
    ],
    facilities: [
      { name: 'Planet Labs HQ', type: 'headquarters', city: 'San Francisco', state: 'CA', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 220000000, source: 'SEC Filing' },
    ],
    scores: [{ scoreType: 'overall', score: 82 }, { scoreType: 'technology', score: 85 }],
  },
  {
    name: 'Maxar Technologies',
    headquarters: 'Westminster, Colorado',
    country: 'US',
    foundedYear: 1969,
    employeeRange: '5001-10000',
    website: 'https://www.maxar.com',
    description: 'Leading geospatial intelligence and satellite manufacturer. Operates WorldView Legion constellation and provides geospatial analytics to defense and commercial customers.',
    ceo: 'Dan Jablonsky',
    sector: 'earth-observation',
    tags: ['earth-observation', 'satellite-manufacturer', 'geospatial', 'defense'],
    tier: 1,
    revenueEstimate: 1800000000,
    ownershipType: 'private',
    products: [
      { name: 'WorldView Legion', category: 'satellite_constellation', description: 'Next-gen 30cm resolution EO constellation with 15 revisits/day.', status: 'active' },
      { name: 'Maxar Geospatial Platform', category: 'software', description: 'Cloud-based platform for satellite imagery and geospatial analytics.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Dan Jablonsky', title: 'CEO', role: 'executive', previousCompanies: ['DigitalGlobe'] },
    ],
    events: [
      { date: '2023-05-02', type: 'acquisition', title: 'Acquired by Advent International for $6.4B', importance: 9 },
    ],
    facilities: [
      { name: 'Maxar HQ', type: 'headquarters', city: 'Westminster', state: 'CO', country: 'US' },
      { name: 'Palo Alto Satellite Facility', type: 'manufacturing', city: 'Palo Alto', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 85 }],
  },
  {
    name: 'Spire Global',
    headquarters: 'Vienna, Virginia',
    country: 'US',
    foundedYear: 2012,
    employeeRange: '501-1000',
    website: 'https://www.spire.com',
    description: 'Multi-purpose nanosatellite constellation providing weather, maritime AIS, and aviation ADS-B data through space-based sensors.',
    ceo: 'Peter Platzer',
    sector: 'data-analytics',
    tags: ['nanosatellite', 'weather', 'maritime', 'aviation', 'data-analytics'],
    tier: 1,
    marketCap: 300000000,
    exchange: 'NYSE',
    ticker: 'SPIR',
    ownershipType: 'public',
    revenueEstimate: 100000000,
    products: [
      { name: 'Lemur Constellation', category: 'satellite_constellation', description: 'Nanosatellite constellation with weather, AIS, and ADS-B payloads.', status: 'active', specs: { satellites: 100 } },
      { name: 'Spire Weather', category: 'data_service', description: 'GNSS-RO weather data and AI-powered forecasting models.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Peter Platzer', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2021-08-17', type: 'ipo', title: 'Spire Global goes public via SPAC', importance: 7 },
    ],
    facilities: [
      { name: 'Spire Global HQ', type: 'headquarters', city: 'Vienna', state: 'VA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 72 }],
  },
  {
    name: 'Iridium Communications',
    headquarters: 'McLean, Virginia',
    country: 'US',
    foundedYear: 1998,
    employeeRange: '501-1000',
    website: 'https://www.iridium.com',
    description: 'Global mobile satellite communications provider operating a 66-satellite LEO constellation providing voice, data, and IoT services worldwide including polar regions.',
    ceo: 'Matt Desch',
    sector: 'satellite-operator',
    tags: ['satellite-operator', 'leo', 'voice', 'iot', 'global-coverage'],
    tier: 1,
    marketCap: 7000000000,
    exchange: 'Nasdaq',
    ticker: 'IRDM',
    ownershipType: 'public',
    revenueEstimate: 780000000,
    products: [
      { name: 'Iridium NEXT', category: 'satellite_constellation', description: '66-satellite LEO constellation for global voice and data.', status: 'active', specs: { satellites: 66, orbit_km: 780 } },
      { name: 'Iridium Certus', category: 'service', description: 'Broadband service for maritime, aviation, and land mobile.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Matt Desch', title: 'CEO', role: 'executive' },
    ],
    events: [
      { date: '2019-01-11', type: 'milestone', title: 'Iridium NEXT constellation completed', importance: 9 },
    ],
    facilities: [
      { name: 'Iridium HQ', type: 'headquarters', city: 'McLean', state: 'VA', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 780000000, source: 'SEC Filing' },
    ],
    scores: [{ scoreType: 'overall', score: 88 }],
  },
  {
    name: 'Viasat',
    headquarters: 'Carlsbad, California',
    country: 'US',
    foundedYear: 1986,
    employeeRange: '5001-10000',
    website: 'https://www.viasat.com',
    description: 'Global communications company providing satellite broadband, in-flight Wi-Fi, and defense communications. Acquired Inmarsat in 2023 for $7.3B.',
    ceo: 'Mark Dankberg',
    sector: 'satellite-operator',
    tags: ['satellite-operator', 'broadband', 'defense-comms', 'in-flight-wifi'],
    tier: 1,
    marketCap: 3500000000,
    exchange: 'Nasdaq',
    ticker: 'VSAT',
    ownershipType: 'public',
    revenueEstimate: 4000000000,
    products: [
      { name: 'ViaSat-3', category: 'satellite_constellation', description: 'Three ultra-high-capacity GEO satellites for global broadband.', status: 'active' },
      { name: 'Inmarsat Fleet', category: 'satellite_constellation', description: 'GEO L-band constellation for maritime and aviation safety comms.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Mark Dankberg', title: 'Executive Chairman & Co-Founder', role: 'founder' },
    ],
    events: [
      { date: '2023-05-30', type: 'acquisition', title: 'Completed $7.3B acquisition of Inmarsat', importance: 9 },
    ],
    facilities: [
      { name: 'Viasat HQ', type: 'headquarters', city: 'Carlsbad', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 80 }],
  },
  {
    name: 'Arianespace',
    headquarters: 'Courcouronnes, France',
    country: 'FR',
    foundedYear: 1980,
    employeeRange: '5001-10000',
    website: 'https://www.arianespace.com',
    description: 'European launch service provider operating Ariane 6 heavy-lift and Vega-C small-lift rockets from French Guiana. Part of ArianeGroup (Airbus/Safran JV).',
    ceo: 'Stéphane Israël',
    sector: 'launch',
    tags: ['launch-provider', 'europe', 'heavy-lift', 'institutional'],
    tier: 1,
    ownershipType: 'subsidiary',
    parentCompany: 'ArianeGroup (Airbus/Safran)',
    products: [
      { name: 'Ariane 6', category: 'launch_vehicle', description: 'Next-gen European heavy-lift launcher in A62 and A64 configurations.', status: 'active', specs: { payload_gto_kg: 11500, payload_leo_kg: 21600 } },
      { name: 'Vega-C', category: 'launch_vehicle', description: 'European small/medium satellite launcher.', status: 'active', specs: { payload_leo_kg: 2200 } },
    ],
    keyPersonnel: [
      { name: 'Stéphane Israël', title: 'CEO, Arianespace', role: 'executive' },
      { name: 'Martin Sion', title: 'CEO, ArianeGroup', role: 'executive' },
    ],
    events: [
      { date: '2024-07-09', type: 'milestone', title: 'Ariane 6 inaugural launch', importance: 9 },
    ],
    facilities: [
      { name: 'Arianespace HQ', type: 'headquarters', city: 'Courcouronnes', country: 'FR' },
      { name: 'Guiana Space Centre', type: 'launch_site', city: 'Kourou', country: 'GF' },
    ],
    scores: [{ scoreType: 'overall', score: 82 }],
  },
  {
    name: 'Virgin Galactic',
    headquarters: 'Las Cruces, New Mexico',
    country: 'US',
    foundedYear: 2004,
    employeeRange: '501-1000',
    website: 'https://www.virgingalactic.com',
    description: 'Suborbital space tourism company developing air-launched spaceplanes for commercial passenger flights to the edge of space.',
    ceo: 'Michael Colglazier',
    sector: 'launch',
    tags: ['space-tourism', 'suborbital', 'human-spaceflight'],
    tier: 1,
    marketCap: 500000000,
    exchange: 'NYSE',
    ticker: 'SPCE',
    ownershipType: 'public',
    revenueEstimate: 2000000,
    products: [
      { name: 'VSS Unity (SpaceShipTwo)', category: 'spaceplane', description: 'Suborbital spaceplane for 6 passengers.', status: 'retired' },
      { name: 'Delta Class', category: 'spaceplane', description: 'Next-gen spaceplanes for higher flight rate commercial service.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Michael Colglazier', title: 'CEO', role: 'executive', previousCompanies: ['Disney Parks'] },
    ],
    events: [
      { date: '2023-06-29', type: 'milestone', title: 'First commercial spaceflight Galactic 01', importance: 8 },
    ],
    facilities: [
      { name: 'Spaceport America', type: 'launch_site', city: 'Truth or Consequences', state: 'NM', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 55 }],
  },
  {
    name: 'Relativity Space',
    headquarters: 'Long Beach, California',
    country: 'US',
    foundedYear: 2015,
    employeeRange: '501-1000',
    website: 'https://www.relativityspace.com',
    description: 'Pioneering 3D-printed rocket manufacturer developing Terran R medium-lift reusable launch vehicle using the world\'s largest metal 3D printer (Stargate).',
    ceo: 'Tim Ellis',
    sector: 'launch',
    tags: ['launch-provider', '3d-printing', 'reusable-rockets', 'advanced-manufacturing'],
    tier: 1,
    totalFunding: 1300000000,
    valuation: 4200000000,
    ownershipType: 'private',
    lastFundingRound: 'Series E',
    products: [
      { name: 'Terran R', category: 'launch_vehicle', description: 'Fully reusable 3D-printed medium-lift launch vehicle.', status: 'development', specs: { payload_leo_kg: 20000 } },
      { name: 'Stargate', category: 'manufacturing_system', description: 'World\'s largest metal 3D printer for rocket manufacturing.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Tim Ellis', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['Blue Origin'] },
      { name: 'Jordan Noone', title: 'Co-Founder', role: 'founder', previousCompanies: ['SpaceX'] },
    ],
    events: [
      { date: '2023-03-22', type: 'milestone', title: 'Terran 1 first launch attempt — reached Max Q before anomaly', importance: 7 },
    ],
    facilities: [
      { name: 'Relativity Space HQ & Factory', type: 'headquarters', city: 'Long Beach', state: 'CA', country: 'US' },
      { name: 'Launch Complex 16', type: 'launch_site', city: 'Cape Canaveral', state: 'FL', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 75 }, { scoreType: 'technology', score: 85 }],
  },
  {
    name: 'Firefly Aerospace',
    headquarters: 'Cedar Park, Texas',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '501-1000',
    website: 'https://www.fireflyspace.com',
    description: 'Launch provider developing Alpha small-lift rocket, MLV medium-lift vehicle, and Blue Ghost lunar lander for NASA CLPS missions.',
    ceo: 'Bill Weber',
    sector: 'launch',
    tags: ['launch-provider', 'small-sat', 'lunar-lander'],
    tier: 1,
    totalFunding: 275000000,
    ownershipType: 'private',
    products: [
      { name: 'Alpha', category: 'launch_vehicle', description: 'Dedicated small satellite launch vehicle.', status: 'active', specs: { payload_leo_kg: 1000 } },
      { name: 'MLV', category: 'launch_vehicle', description: 'Medium Launch Vehicle developed with Northrop Grumman.', status: 'development' },
      { name: 'Blue Ghost', category: 'lunar_lander', description: 'Lunar lander for NASA CLPS program.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Bill Weber', title: 'CEO', role: 'executive' },
    ],
    events: [
      { date: '2022-10-01', type: 'milestone', title: 'Alpha reaches orbit on second flight attempt', importance: 8 },
    ],
    facilities: [
      { name: 'Firefly HQ', type: 'headquarters', city: 'Cedar Park', state: 'TX', country: 'US' },
      { name: 'Vandenberg SLC-2W', type: 'launch_site', city: 'Lompoc', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 72 }],
  },
  {
    name: 'Sierra Space',
    headquarters: 'Louisville, Colorado',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '1001-5000',
    website: 'https://www.sierraspace.com',
    description: 'Commercial space company developing Dream Chaser spaceplane and LIFE habitat for NASA CRS-2 missions and future commercial space stations.',
    ceo: 'Tom Vice',
    sector: 'space-stations',
    tags: ['spaceplane', 'space-station', 'human-spaceflight', 'commercial-space'],
    tier: 1,
    totalFunding: 1400000000,
    valuation: 5300000000,
    ownershipType: 'private',
    products: [
      { name: 'Dream Chaser', category: 'spaceplane', description: 'Reusable spaceplane for ISS cargo resupply (CRS-2) and future crew missions.', status: 'active' },
      { name: 'LIFE Habitat', category: 'space_station', description: 'Large Integrated Flexible Environment inflatable habitat module.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Tom Vice', title: 'CEO', role: 'executive', previousCompanies: ['Northrop Grumman'] },
    ],
    events: [
      { date: '2024-01-01', type: 'milestone', title: 'Dream Chaser Tenacity delivered to Kennedy Space Center', importance: 8 },
    ],
    facilities: [
      { name: 'Sierra Space HQ', type: 'headquarters', city: 'Louisville', state: 'CO', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 78 }],
  },
  {
    name: 'Axiom Space',
    headquarters: 'Houston, Texas',
    country: 'US',
    foundedYear: 2016,
    employeeRange: '501-1000',
    website: 'https://www.axiomspace.com',
    description: 'Building the world\'s first commercial space station while conducting private astronaut missions to the ISS. Also developing NASA\'s next-gen spacesuit (AxEMU).',
    ceo: 'Michael Suffredini',
    sector: 'space-stations',
    tags: ['space-station', 'human-spaceflight', 'private-astronaut', 'spacesuits'],
    tier: 1,
    totalFunding: 505000000,
    ownershipType: 'private',
    products: [
      { name: 'Axiom Station', category: 'space_station', description: 'Commercial space station initially attached to ISS, later free-flying.', status: 'development' },
      { name: 'AxEMU Spacesuit', category: 'equipment', description: 'Next-generation spacesuit for NASA Artemis lunar missions.', status: 'development' },
      { name: 'Private Astronaut Missions', category: 'service', description: 'Commercial missions to the ISS for private astronauts and nations.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Michael Suffredini', title: 'President & CEO', role: 'founder', previousCompanies: ['NASA (ISS Program Manager)'] },
    ],
    events: [
      { date: '2022-04-08', type: 'milestone', title: 'Axiom-1: First all-private crew mission to ISS', importance: 9 },
    ],
    facilities: [
      { name: 'Axiom Space HQ', type: 'headquarters', city: 'Houston', state: 'TX', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 80 }],
  },
  {
    name: 'Capella Space',
    headquarters: 'San Francisco, California',
    country: 'US',
    foundedYear: 2016,
    employeeRange: '201-500',
    website: 'https://www.capellaspace.com',
    description: 'SAR (Synthetic Aperture Radar) satellite constellation operator providing all-weather, day-and-night high-resolution radar imagery.',
    ceo: 'Payam Banazadeh',
    sector: 'earth-observation',
    tags: ['earth-observation', 'sar', 'radar', 'defense', 'analytics'],
    tier: 1,
    totalFunding: 360000000,
    ownershipType: 'private',
    products: [
      { name: 'Capella SAR Constellation', category: 'satellite_constellation', description: 'High-resolution SAR microsatellite constellation with 50cm resolution.', status: 'active', specs: { resolution_m: 0.5 } },
      { name: 'Capella Console', category: 'software', description: 'Tasking and analytics platform for SAR imagery.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Payam Banazadeh', title: 'Founder & CEO', role: 'founder', previousCompanies: ['NASA JPL'] },
    ],
    events: [
      { date: '2020-08-31', type: 'milestone', title: 'First commercial SAR satellite Sequoia launched', importance: 7 },
    ],
    facilities: [
      { name: 'Capella Space HQ', type: 'headquarters', city: 'San Francisco', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 75 }],
  },
  {
    name: 'Astra Space',
    headquarters: 'Alameda, California',
    country: 'US',
    foundedYear: 2016,
    employeeRange: '201-500',
    website: 'https://www.astra.com',
    description: 'Space technology company that pivoted from launch to spacecraft propulsion systems (Astra Spacecraft Engine) after retiring its launch vehicle program.',
    ceo: 'Chris Kemp',
    sector: 'propulsion',
    tags: ['propulsion', 'electric-propulsion', 'space-products'],
    tier: 1,
    marketCap: 200000000,
    exchange: 'Nasdaq',
    ticker: 'ASTR',
    ownershipType: 'public',
    revenueEstimate: 5000000,
    products: [
      { name: 'Astra Spacecraft Engine', category: 'propulsion', description: 'Electric propulsion system for smallsat orbital maneuvering.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Chris Kemp', title: 'Co-Founder, Chairman & CEO', role: 'founder', previousCompanies: ['NASA'] },
    ],
    events: [
      { date: '2022-02-10', type: 'milestone', title: 'Astra reaches orbit successfully on LV0007', importance: 7 },
    ],
    facilities: [
      { name: 'Astra HQ', type: 'headquarters', city: 'Alameda', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 50 }],
  },
  {
    name: 'ABL Space Systems',
    headquarters: 'El Segundo, California',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '201-500',
    website: 'https://www.ablspacesystems.com',
    description: 'Launch company developing the RS1 small launch vehicle and GS0 deployable ground launch system for responsive and mobile launch operations.',
    ceo: 'Harry O\'Hanley',
    sector: 'launch',
    tags: ['launch-provider', 'responsive-launch', 'mobile-launch', 'small-sat'],
    tier: 1,
    totalFunding: 200000000,
    ownershipType: 'private',
    products: [
      { name: 'RS1', category: 'launch_vehicle', description: 'Small launch vehicle for dedicated 1,350kg to LEO missions.', status: 'development', specs: { payload_leo_kg: 1350 } },
      { name: 'GS0', category: 'ground_system', description: 'Deployable containerized ground launch system.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Harry O\'Hanley', title: 'Co-Founder & CEO', role: 'founder' },
      { name: 'Dan Piemont', title: 'Co-Founder & CTO', role: 'founder' },
    ],
    events: [
      { date: '2023-01-10', type: 'milestone', title: 'RS1 first launch attempt from Kodiak, Alaska', importance: 6 },
    ],
    facilities: [
      { name: 'ABL Space HQ', type: 'headquarters', city: 'El Segundo', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 60 }],
  },
  {
    name: 'Raytheon',
    headquarters: 'Arlington, Virginia',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '10000+',
    website: 'https://www.rtx.com',
    description: 'Major defense conglomerate (RTX Corporation) providing space sensors, missile defense interceptors, and OPIR (overhead persistent infrared) systems.',
    ceo: 'Chris Calio',
    sector: 'defense',
    tags: ['defense-prime', 'missile-defense', 'space-sensors', 'opir'],
    tier: 1,
    marketCap: 150000000000,
    exchange: 'NYSE',
    ticker: 'RTX',
    ownershipType: 'public',
    revenueEstimate: 69000000000,
    products: [
      { name: 'OPIR Systems', category: 'sensor', description: 'Overhead Persistent Infrared missile warning satellites.', status: 'active' },
      { name: 'SM-3 Interceptor', category: 'missile', description: 'Anti-ballistic missile interceptor with exoatmospheric capability.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Chris Calio', title: 'President & CEO', role: 'executive' },
    ],
    events: [
      { date: '2020-04-03', type: 'founding', title: 'RTX formed from Raytheon and United Technologies merger', importance: 9 },
    ],
    facilities: [
      { name: 'RTX HQ', type: 'headquarters', city: 'Arlington', state: 'VA', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 69000000000, source: 'SEC Filing' },
    ],
    scores: [{ scoreType: 'overall', score: 90 }],
  },
  {
    name: 'Intuitive Machines',
    headquarters: 'Houston, Texas',
    country: 'US',
    foundedYear: 2013,
    employeeRange: '501-1000',
    website: 'https://www.intuitivemachines.com',
    description: 'Lunar access services company that achieved the first commercial Moon landing with IM-1 Odysseus in February 2024 under NASA\'s CLPS program.',
    ceo: 'Steve Altemus',
    sector: 'lunar',
    tags: ['lunar-lander', 'nasa-clps', 'moon', 'lunar-services'],
    tier: 1,
    marketCap: 4000000000,
    exchange: 'Nasdaq',
    ticker: 'LUNR',
    ownershipType: 'public',
    revenueEstimate: 80000000,
    products: [
      { name: 'Nova-C Lander', category: 'lunar_lander', description: 'Lunar lander — IM-1 achieved first US commercial Moon landing in Feb 2024.', status: 'active' },
      { name: 'PRIME-1 Drill', category: 'instrument', description: 'Polar Resources Ice Mining Experiment for lunar ice prospecting.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Steve Altemus', title: 'Co-Founder, President & CEO', role: 'founder', previousCompanies: ['NASA JSC'] },
    ],
    events: [
      { date: '2024-02-22', type: 'milestone', title: 'IM-1 Odysseus: First commercial Moon landing', importance: 10 },
    ],
    facilities: [
      { name: 'Intuitive Machines HQ', type: 'headquarters', city: 'Houston', state: 'TX', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 82 }],
  },
  {
    name: 'Astrobotic',
    headquarters: 'Pittsburgh, Pennsylvania',
    country: 'US',
    foundedYear: 2007,
    employeeRange: '201-500',
    website: 'https://www.astrobotic.com',
    description: 'Lunar logistics company developing landers and rovers for NASA CLPS missions. Building Peregrine and Griffin landers for Moon delivery services.',
    ceo: 'John Thornton',
    sector: 'lunar',
    tags: ['lunar-lander', 'nasa-clps', 'moon', 'robotics'],
    tier: 1,
    totalFunding: 400000000,
    ownershipType: 'private',
    products: [
      { name: 'Peregrine Lander', category: 'lunar_lander', description: 'Small lunar lander for NASA CLPS deliveries.', status: 'active' },
      { name: 'Griffin Lander', category: 'lunar_lander', description: 'Large lunar lander capable of delivering NASA VIPER rover.', status: 'development' },
      { name: 'CubeRover', category: 'rover', description: 'Small, affordable lunar rover for exploration missions.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'John Thornton', title: 'CEO', role: 'executive' },
    ],
    events: [
      { date: '2024-01-08', type: 'milestone', title: 'Peregrine Mission One launch (anomaly after separation)', importance: 7 },
    ],
    facilities: [
      { name: 'Astrobotic HQ', type: 'headquarters', city: 'Pittsburgh', state: 'PA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 72 }],
  },
  {
    name: 'ICEYE',
    headquarters: 'Espoo, Finland',
    country: 'FI',
    foundedYear: 2014,
    employeeRange: '501-1000',
    website: 'https://www.iceye.com',
    description: 'Finnish SAR microsatellite constellation operator providing all-weather, 24/7 radar imaging. Expanded into flood and natural catastrophe monitoring services.',
    ceo: 'Rafal Modrzewski',
    sector: 'earth-observation',
    tags: ['earth-observation', 'sar', 'radar', 'insurance', 'flood-monitoring'],
    tier: 1,
    totalFunding: 300000000,
    ownershipType: 'private',
    products: [
      { name: 'ICEYE SAR Constellation', category: 'satellite_constellation', description: 'World\'s largest SAR microsatellite constellation.', status: 'active', specs: { satellites: 30 } },
      { name: 'ICEYE Flood Monitoring', category: 'data_service', description: 'Near real-time flood extent mapping for insurance and government.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Rafal Modrzewski', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2018-01-12', type: 'milestone', title: 'Launched world\'s first SAR microsatellite', importance: 8 },
    ],
    facilities: [
      { name: 'ICEYE HQ', type: 'headquarters', city: 'Espoo', country: 'FI' },
    ],
    scores: [{ scoreType: 'overall', score: 80 }],
  },
  {
    name: 'Redwire',
    headquarters: 'Jacksonville, Florida',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '501-1000',
    website: 'https://www.redwirespace.com',
    description: 'Space infrastructure company formed through acquisitions, providing roll-out solar arrays, 3D bioprinting, regolith processing, and digital engineering for space.',
    ceo: 'Peter Cannito',
    sector: 'manufacturing',
    tags: ['in-space-manufacturing', 'solar-arrays', 'infrastructure', '3d-printing'],
    tier: 1,
    marketCap: 1500000000,
    exchange: 'NYSE',
    ticker: 'RDW',
    ownershipType: 'public',
    revenueEstimate: 275000000,
    products: [
      { name: 'Roll-Out Solar Arrays (ROSA)', category: 'hardware', description: 'Flexible roll-out solar arrays used on ISS and Gateway.', status: 'active' },
      { name: '3D BioFabrication Facility', category: 'manufacturing', description: 'In-space 3D bioprinting for tissue engineering in microgravity.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Peter Cannito', title: 'Chairman & CEO', role: 'executive' },
    ],
    events: [
      { date: '2023-06-01', type: 'contract', title: 'Selected for NASA lunar construction technology development', importance: 7 },
    ],
    facilities: [
      { name: 'Redwire HQ', type: 'headquarters', city: 'Jacksonville', state: 'FL', country: 'US' },
    ],
    revenueEstimates: [
      { year: 2024, revenue: 275000000, source: 'SEC Filing' },
    ],
    scores: [{ scoreType: 'overall', score: 72 }],
  },
];

// Creating the seeding function

async function seedCompanyProfile(data: CompanyData) {
  const slug = data.slug || slugify(data.name);

  const profile = await prisma.companyProfile.upsert({
    where: { slug },
    update: {
      name: data.name,
      legalName: data.legalName,
      ticker: data.ticker,
      exchange: data.exchange,
      headquarters: data.headquarters,
      country: data.country,
      foundedYear: data.foundedYear,
      employeeCount: data.employeeCount,
      employeeRange: data.employeeRange,
      website: data.website,
      description: data.description,
      longDescription: data.longDescription,
      ceo: data.ceo,
      cto: data.cto,
      linkedinUrl: data.linkedinUrl,
      twitterUrl: data.twitterUrl,
      isPublic: data.isPublic ?? false,
      marketCap: data.marketCap,
      stockPrice: data.stockPrice,
      status: data.status ?? 'active',
      sector: data.sector,
      subsector: data.subsector,
      tags: data.tags,
      tier: data.tier,
      totalFunding: data.totalFunding,
      lastFundingRound: data.lastFundingRound,
      lastFundingDate: data.lastFundingDate ? new Date(data.lastFundingDate) : undefined,
      valuation: data.valuation,
      revenueEstimate: data.revenueEstimate,
      ownershipType: data.ownershipType ?? 'private',
      parentCompany: data.parentCompany,
      lastVerified: new Date(),
    },
    create: {
      slug,
      name: data.name,
      legalName: data.legalName,
      ticker: data.ticker,
      exchange: data.exchange,
      headquarters: data.headquarters,
      country: data.country,
      foundedYear: data.foundedYear,
      foundedDate: data.foundedYear ? new Date(`${data.foundedYear}-01-01`) : undefined,
      employeeCount: data.employeeCount,
      employeeRange: data.employeeRange,
      website: data.website,
      description: data.description,
      longDescription: data.longDescription,
      ceo: data.ceo,
      cto: data.cto,
      linkedinUrl: data.linkedinUrl,
      twitterUrl: data.twitterUrl,
      isPublic: data.isPublic ?? false,
      marketCap: data.marketCap,
      stockPrice: data.stockPrice,
      status: data.status ?? 'active',
      sector: data.sector,
      subsector: data.subsector,
      tags: data.tags,
      tier: data.tier,
      totalFunding: data.totalFunding,
      lastFundingRound: data.lastFundingRound,
      lastFundingDate: data.lastFundingDate ? new Date(data.lastFundingDate) : undefined,
      valuation: data.valuation,
      revenueEstimate: data.revenueEstimate,
      ownershipType: data.ownershipType ?? 'private',
      parentCompany: data.parentCompany,
      lastVerified: new Date(),
      dataCompleteness: 0,
    },
  });

  // Calculate data completeness
  let completeness = 20; // base for having basic info
  if (data.description) completeness += 5;
  if (data.longDescription) completeness += 5;
  if (data.totalFunding || data.marketCap) completeness += 10;
  if (data.revenueEstimate) completeness += 5;
  if (data.ceo) completeness += 5;
  if ((data.fundingRounds?.length ?? 0) > 0) completeness += 10;
  if ((data.products?.length ?? 0) > 0) completeness += 10;
  if ((data.keyPersonnel?.length ?? 0) > 0) completeness += 10;
  if ((data.events?.length ?? 0) > 0) completeness += 5;
  if ((data.contracts?.length ?? 0) > 0) completeness += 5;
  if ((data.facilities?.length ?? 0) > 0) completeness += 5;
  if ((data.revenueEstimates?.length ?? 0) > 0) completeness += 5;
  completeness = Math.min(completeness, 100);

  // Seed related data
  if (data.fundingRounds) {
    for (const r of data.fundingRounds) {
      await prisma.fundingRound.create({
        data: {
          companyId: profile.id,
          date: new Date(r.date),
          amount: r.amount,
          seriesLabel: r.seriesLabel,
          roundType: r.roundType,
          leadInvestor: r.leadInvestor,
          investors: r.investors ?? [],
          postValuation: r.postValuation,
        },
      }).catch(() => {}); // skip duplicates
    }
  }

  if (data.products) {
    for (const p of data.products) {
      await prisma.companyProduct.create({
        data: {
          companyId: profile.id,
          name: p.name,
          category: p.category,
          description: p.description,
          status: p.status ?? 'active',
          specs: p.specs as any,
        },
      }).catch(() => {});
    }
  }

  if (data.keyPersonnel) {
    for (const p of data.keyPersonnel) {
      await prisma.keyPersonnel.create({
        data: {
          companyId: profile.id,
          name: p.name,
          title: p.title,
          role: p.role ?? 'executive',
          linkedinUrl: p.linkedinUrl,
          bio: p.bio,
          previousCompanies: p.previousCompanies ?? [],
        },
      }).catch(() => {});
    }
  }

  if (data.events) {
    for (const e of data.events) {
      await prisma.companyEvent.create({
        data: {
          companyId: profile.id,
          date: new Date(e.date),
          type: e.type,
          title: e.title,
          description: e.description,
          importance: e.importance ?? 5,
        },
      }).catch(() => {});
    }
  }

  if (data.facilities) {
    for (const f of data.facilities) {
      await prisma.facilityLocation.create({
        data: {
          companyId: profile.id,
          name: f.name,
          type: f.type,
          city: f.city,
          state: f.state,
          country: f.country,
        },
      }).catch(() => {});
    }
  }

  if (data.contracts) {
    for (const c of data.contracts) {
      await prisma.governmentContractAward.create({
        data: {
          companyId: profile.id,
          companyName: data.name,
          agency: c.agency,
          title: c.title,
          description: c.description,
          awardDate: c.awardDate ? new Date(c.awardDate) : undefined,
          value: c.value,
          ceiling: c.ceiling,
        },
      }).catch(() => {});
    }
  }

  if (data.revenueEstimates) {
    for (const r of data.revenueEstimates) {
      await prisma.revenueEstimate.upsert({
        where: { companyId_year_quarter: { companyId: profile.id, year: r.year, quarter: r.quarter ?? 0 } },
        update: { revenue: r.revenue, source: r.source, confidenceLevel: r.confidenceLevel ?? 'estimate' },
        create: {
          companyId: profile.id,
          year: r.year,
          quarter: r.quarter,
          revenue: r.revenue,
          revenueRange: r.revenueRange,
          source: r.source,
          confidenceLevel: r.confidenceLevel ?? 'estimate',
        },
      }).catch(() => {});
    }
  }

  if (data.scores) {
    for (const s of data.scores) {
      await prisma.companyScore.upsert({
        where: { companyId_scoreType: { companyId: profile.id, scoreType: s.scoreType } },
        update: { score: s.score, calculatedAt: new Date() },
        create: {
          companyId: profile.id,
          scoreType: s.scoreType,
          score: s.score,
        },
      }).catch(() => {});
    }
  }

  // Update completeness
  await prisma.companyProfile.update({
    where: { id: profile.id },
    data: { dataCompleteness: completeness },
  });

  return profile;
}

async function main() {
  console.log('🚀 Starting company profiles seed...\n');

  // Clear existing data
  console.log('Clearing existing company profile data...');
  await prisma.companyScore.deleteMany({});
  await prisma.facilityLocation.deleteMany({});
  await prisma.companyEvent.deleteMany({});
  await prisma.satelliteAsset.deleteMany({});
  await prisma.governmentContractAward.deleteMany({});
  await prisma.competitiveMapping.deleteMany({});
  await prisma.sECFiling.deleteMany({});
  await prisma.partnership.deleteMany({});
  await prisma.mergerAcquisition.deleteMany({});
  await prisma.keyPersonnel.deleteMany({});
  await prisma.companyProduct.deleteMany({});
  await prisma.revenueEstimate.deleteMany({});
  await prisma.fundingRound.deleteMany({});
  await prisma.companyProfile.deleteMany({});

  // Seed Tier 1
  console.log('\n── TIER 1: Must-Have Companies ──');
  for (const company of TIER_1) {
    const p = await seedCompanyProfile(company);
    console.log(`  ✓ ${company.name} (${p.id})`);
  }

  // Seed Tier 2
  console.log('\n── TIER 2: High-Growth Companies ──');
  for (const company of TIER_2) {
    const p = await seedCompanyProfile(company);
    console.log(`  ✓ ${company.name} (${p.id})`);
  }

  // Seed Tier 3
  console.log('\n── TIER 3: Emerging Startups ──');
  for (const company of TIER_3) {
    const p = await seedCompanyProfile(company);
    console.log(`  ✓ ${company.name} (${p.id})`);
  }

  const total = await prisma.companyProfile.count();
  console.log(`\n✅ Done! Seeded ${total} company profiles.`);
}

// ────────────────────────────────────────────────────────────────
// TIER 2 COMPANIES (40 High-Growth & Strategic)
// ────────────────────────────────────────────────────────────────

const TIER_2: CompanyData[] = [
  // 1. Astroscale
  {
    name: 'Astroscale',
    headquarters: 'Tokyo, Japan',
    country: 'JP',
    foundedYear: 2013,
    employeeRange: '201-500',
    website: 'https://astroscale.com',
    description: 'Astroscale is the world leader in space debris removal and on-orbit servicing. The company develops satellite end-of-life and active debris removal solutions to ensure the long-term sustainability of space.',
    ceo: 'Nobu Okada',
    sector: 'on-orbit-servicing',
    tags: ['debris-removal', 'on-orbit-servicing', 'space-sustainability', 'rpso'],
    tier: 2,
    totalFunding: 380000000,
    ownershipType: 'private',
    products: [
      { name: 'ELSA-d', category: 'spacecraft', description: 'End-of-Life Services by Astroscale — demonstration mission for debris capture using magnetic docking technology.', status: 'completed' },
      { name: 'ADRAS-J', category: 'spacecraft', description: 'Active Debris Removal by Astroscale-Japan — JAXA-contracted mission to inspect and eventually remove a large piece of orbital debris.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Nobu Okada', title: 'Founder & CEO', role: 'founder', bio: 'Founded Astroscale to address the growing space debris problem. Background in IT and finance before pivoting to space.', previousCompanies: ['McKinsey & Company'] },
      { name: 'Chris Blackerby', title: 'Group COO', role: 'executive', previousCompanies: ['NASA', 'JAXA'] },
    ],
    events: [
      { date: '2013-01-01', type: 'founding', title: 'Astroscale founded by Nobu Okada in Singapore, later HQ moved to Tokyo', importance: 7 },
    ],
    scores: [
      { scoreType: 'overall', score: 78 },
    ],
  },
  // 32. Impulse Space
  {
    name: 'Impulse Space',
    legalName: 'Impulse Space, Inc.',
    headquarters: 'Redondo Beach, California',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '51-200',
    website: 'https://www.impulsespace.com',
    description: 'Impulse Space develops in-space transportation vehicles to provide last-mile delivery services for satellites and cargo throughout the solar system.',
    ceo: 'Tom Mueller',
    isPublic: false,
    status: 'active',
    sector: 'in-space-transportation',
    tags: ['orbital-transfer', 'last-mile-delivery', 'propulsion', 'in-space-transport'],
    tier: 2,
    totalFunding: 150000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2024-01-01',
    ownershipType: 'private',
    products: [
      { name: 'Mira', category: 'orbital_transfer_vehicle', description: 'LEO orbital transfer vehicle for last-mile satellite delivery.', status: 'active' },
      { name: 'Helios', category: 'orbital_transfer_vehicle', description: 'High-energy upper stage for GEO, cislunar, and interplanetary missions.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Tom Mueller', title: 'Founder & CEO', role: 'founder', bio: 'Co-founder of SpaceX and designer of Merlin and Raptor engines. Founded Impulse Space in 2021.', previousCompanies: ['SpaceX', 'TRW'] },
    ],
    events: [
      { date: '2021-09-01', type: 'founding', title: 'Impulse Space founded by SpaceX co-founder Tom Mueller', importance: 7 },
    ],
    facilities: [
      { name: 'Impulse Space Headquarters', type: 'headquarters', city: 'Redondo Beach', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 68 },
    ],
  },
  // 33. Muon Space
  {
    name: 'Muon Space',
    legalName: 'Muon Space, Inc.',
    headquarters: 'Mountain View, California',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '51-200',
    website: 'https://www.muonspace.com',
    description: 'Muon Space is a vertically integrated Earth observation company building satellite constellations to provide climate and weather intelligence.',
    ceo: 'Jonny Dyer',
    isPublic: false,
    status: 'active',
    sector: 'earth-observation',
    subsector: 'climate-monitoring',
    tags: ['earth-observation', 'climate', 'weather', 'satellite-constellation', 'microwave-radiometry'],
    tier: 2,
    totalFunding: 137000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2024-03-01',
    ownershipType: 'private',
    products: [
      { name: 'MuSat', category: 'satellite', description: 'Microwave radiometer satellite for climate and weather data collection.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Jonny Dyer', title: 'Co-Founder & CEO', role: 'founder', bio: 'Previously at Planet Labs and Google X. Co-founded Muon Space to tackle climate monitoring.', previousCompanies: ['Planet Labs', 'Google X'] },
    ],
    events: [
      { date: '2021-12-01', type: 'founding', title: 'Muon Space founded in Mountain View, California', importance: 6 },
    ],
    facilities: [
      { name: 'Muon Space Headquarters', type: 'headquarters', city: 'Mountain View', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 64 },
    ],
  },
  // 34. Vast
  {
    name: 'Vast',
    legalName: 'Vast Space LLC',
    headquarters: 'Long Beach, California',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '201-500',
    website: 'https://www.vastspace.com',
    description: 'Vast is developing the world\'s first commercial space station with artificial gravity to enable long-duration human habitation in orbit.',
    ceo: 'Max Haot',
    isPublic: false,
    status: 'active',
    sector: 'space-stations',
    tags: ['space-station', 'commercial-leo', 'human-spaceflight', 'artificial-gravity'],
    tier: 2,
    totalFunding: 400000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-06-01',
    ownershipType: 'private',
    products: [
      { name: 'Haven-1', category: 'space_station', description: 'Single-module commercial space station planned for LEO, targeting launch on SpaceX Falcon 9.', status: 'development' },
      { name: 'Haven-2', category: 'space_station', description: 'Multi-module space station with artificial gravity for long-duration habitation.', status: 'concept' },
    ],
    keyPersonnel: [
      { name: 'Max Haot', title: 'CEO', role: 'executive', bio: 'Serial entrepreneur and CEO of Vast, previously co-founded Livestream.', previousCompanies: ['Livestream', 'Vimeo'] },
    ],
    events: [
      { date: '2021-01-01', type: 'founding', title: 'Vast founded to build commercial space stations', importance: 7 },
    ],
    facilities: [
      { name: 'Vast Headquarters', type: 'headquarters', city: 'Long Beach', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 66 },
    ],
  },
  // 35. Voyager Space
  {
    name: 'Voyager Space',
    legalName: 'Voyager Space Holdings, Inc.',
    headquarters: 'Denver, Colorado',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '201-500',
    website: 'https://voyagerspace.com',
    description: 'Voyager Space is a space technology holding company building a vertically integrated platform of space exploration companies, including the Starlab space station partnership with Airbus.',
    ceo: 'Dylan Taylor',
    isPublic: false,
    status: 'active',
    sector: 'space-stations',
    subsector: 'commercial-leo',
    tags: ['space-station', 'starlab', 'holding-company', 'commercial-leo'],
    tier: 2,
    totalFunding: 290000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2023-01-01',
    ownershipType: 'private',
    products: [
      { name: 'Starlab', category: 'space_station', description: 'Commercial space station developed in partnership with Airbus to serve as an ISS successor.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Dylan Taylor', title: 'Chairman & CEO', role: 'founder', bio: 'Founder and CEO of Voyager Space, one of the most active investors in the space industry.', previousCompanies: ['Colliers International'] },
    ],
    events: [
      { date: '2019-10-01', type: 'founding', title: 'Voyager Space founded as space technology holding company', importance: 6 },
    ],
    facilities: [
      { name: 'Voyager Space Headquarters', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 65 },
    ],
  },
  // 36. True Anomaly
  {
    name: 'True Anomaly',
    legalName: 'True Anomaly, Inc.',
    headquarters: 'Denver, Colorado',
    country: 'US',
    foundedYear: 2022,
    employeeRange: '51-200',
    website: 'https://www.trueanomaly.com',
    description: 'True Anomaly develops spacecraft and software to enhance space security and enable responsible operations in contested orbital environments.',
    ceo: 'Even Rogers',
    isPublic: false,
    status: 'active',
    sector: 'space-defense',
    subsector: 'space-domain-awareness',
    tags: ['space-security', 'space-domain-awareness', 'defense', 'rendezvous-proximity-operations'],
    tier: 2,
    totalFunding: 100000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2024-01-01',
    ownershipType: 'private',
    products: [
      { name: 'Jackal', category: 'spacecraft', description: 'Autonomous orbital vehicle for space domain awareness and proximity operations.', status: 'development' },
      { name: 'Mosaic', category: 'software', description: 'Space battle management software for tracking and decision support.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Even Rogers', title: 'Co-Founder & CEO', role: 'founder', bio: 'Former US Air Force officer and SpaceX engineer. Co-founded True Anomaly to address space security.', previousCompanies: ['US Air Force', 'SpaceX'] },
    ],
    events: [
      { date: '2022-01-01', type: 'founding', title: 'True Anomaly founded to advance space security capabilities', importance: 6 },
    ],
    facilities: [
      { name: 'True Anomaly Headquarters', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 62 },
    ],
  },
  // 37. Apex
  {
    name: 'Apex',
    legalName: 'Apex Space, Inc.',
    headquarters: 'Los Angeles, California',
    country: 'US',
    foundedYear: 2022,
    employeeRange: '51-200',
    website: 'https://www.apex.aero',
    description: 'Apex designs and manufactures standardized satellite buses to dramatically reduce spacecraft build timelines from years to months.',
    ceo: 'Ian Cinnamon',
    isPublic: false,
    status: 'active',
    sector: 'satellite-manufacturing',
    subsector: 'satellite-buses',
    tags: ['satellite-bus', 'spacecraft-manufacturing', 'rapid-production', 'standardized-platforms'],
    tier: 2,
    totalFunding: 95000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2024-06-01',
    ownershipType: 'private',
    products: [
      { name: 'Aries', category: 'satellite_bus', description: 'Standardized ESPA-class satellite bus enabling rapid spacecraft production.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Ian Cinnamon', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded Apex to transform satellite manufacturing with standardized bus production.' },
    ],
    events: [
      { date: '2022-03-01', type: 'founding', title: 'Apex founded to revolutionize satellite bus manufacturing', importance: 6 },
    ],
    facilities: [
      { name: 'Apex Headquarters & Factory', type: 'headquarters', city: 'Los Angeles', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 63 },
    ],
  },
  // 38. Umbra
  {
    name: 'Umbra',
    legalName: 'Umbra Lab, Inc.',
    headquarters: 'Santa Barbara, California',
    country: 'US',
    foundedYear: 2015,
    employeeRange: '51-200',
    website: 'https://umbra.space',
    description: 'Umbra operates the highest-resolution commercial synthetic aperture radar (SAR) satellite constellation, delivering on-demand imagery day or night in any weather.',
    ceo: 'David Korte',
    isPublic: false,
    status: 'active',
    sector: 'earth-observation',
    subsector: 'sar-imaging',
    tags: ['sar', 'earth-observation', 'radar-imaging', 'all-weather', 'defense-intelligence'],
    tier: 2,
    totalFunding: 130000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-04-01',
    ownershipType: 'private',
    products: [
      { name: 'Umbra SAR Satellites', category: 'satellite_constellation', description: 'High-resolution SAR constellation delivering 16cm resolution radar imagery.', status: 'active', specs: { resolution_cm: 16 } },
    ],
    keyPersonnel: [
      { name: 'David Korte', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded Umbra to build the highest-resolution commercial SAR constellation.' },
    ],
    events: [
      { date: '2015-01-01', type: 'founding', title: 'Umbra founded to build commercial SAR satellite constellation', importance: 6 },
    ],
    facilities: [
      { name: 'Umbra Headquarters', type: 'headquarters', city: 'Santa Barbara', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 67 },
    ],
  },
  // 39. HawkEye 360
  {
    name: 'HawkEye 360',
    legalName: 'HawkEye 360, Inc.',
    headquarters: 'Herndon, Virginia',
    country: 'US',
    foundedYear: 2015,
    employeeRange: '201-500',
    website: 'https://www.hawkeye360.com',
    description: 'HawkEye 360 operates the first commercial satellite constellation to detect and geolocate radio frequency signals from space for maritime, defense, and intelligence applications.',
    ceo: 'John Serafini',
    isPublic: false,
    status: 'active',
    sector: 'earth-observation',
    subsector: 'rf-geolocation',
    tags: ['rf-geolocation', 'sigint', 'maritime-awareness', 'spectrum-monitoring', 'defense-intelligence'],
    tier: 2,
    totalFunding: 368000000,
    lastFundingRound: 'Series D',
    lastFundingDate: '2022-11-01',
    ownershipType: 'private',
    products: [
      { name: 'HawkEye 360 RF Constellation', category: 'satellite_constellation', description: 'Satellite clusters that detect, characterize, and geolocate radio frequency emissions.', status: 'active' },
      { name: 'RFGeo Platform', category: 'software', description: 'Analytics platform for RF signal intelligence and geolocation data.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'John Serafini', title: 'CEO', role: 'executive', bio: 'CEO of HawkEye 360, leading the company\'s RF geolocation and analytics business.', previousCompanies: ['Deep Water Point'] },
    ],
    events: [
      { date: '2015-05-01', type: 'founding', title: 'HawkEye 360 founded to pioneer commercial RF geolocation from space', importance: 7 },
    ],
    facilities: [
      { name: 'HawkEye 360 Headquarters', type: 'headquarters', city: 'Herndon', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 71 },
    ],
  },
  // 40. BlackSky
  {
    name: 'BlackSky',
    legalName: 'BlackSky Technology Inc.',
    ticker: 'BKSY',
    exchange: 'NYSE',
    headquarters: 'Herndon, Virginia',
    country: 'US',
    foundedYear: 2014,
    employeeRange: '201-500',
    website: 'https://www.blacksky.com',
    description: 'BlackSky is a real-time geospatial intelligence company operating a constellation of high-revisit Earth observation satellites with AI-driven analytics.',
    ceo: 'Brian O\'Toole',
    isPublic: true,
    marketCap: 600000000,
    status: 'active',
    sector: 'earth-observation',
    subsector: 'geospatial-intelligence',
    tags: ['earth-observation', 'geoint', 'ai-analytics', 'real-time-intelligence', 'defense'],
    tier: 2,
    revenueEstimate: 100000000,
    ownershipType: 'public',
    products: [
      { name: 'BlackSky Constellation', category: 'satellite_constellation', description: 'High-revisit multispectral imaging constellation with up to 15 revisits per day.', status: 'active' },
      { name: 'Spectra AI', category: 'software', description: 'AI-powered geospatial analytics platform for real-time monitoring and alerting.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Brian O\'Toole', title: 'CEO', role: 'executive', bio: 'CEO of BlackSky, leading the company\'s geospatial intelligence platform.', previousCompanies: ['In-Q-Tel'] },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'BlackSky founded as geospatial intelligence company', importance: 6 },
    ],
    facilities: [
      { name: 'BlackSky Headquarters', type: 'headquarters', city: 'Herndon', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 68 },
    ],
  },
  // 41. AST SpaceMobile
  {
    name: 'AST SpaceMobile',
    legalName: 'AST SpaceMobile, Inc.',
    ticker: 'ASTS',
    exchange: 'NASDAQ',
    headquarters: 'Midland, Texas',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '201-500',
    website: 'https://ast-science.com',
    description: 'AST SpaceMobile is building the first space-based cellular broadband network accessible directly by standard mobile phones without any hardware modifications.',
    ceo: 'Abel Avellan',
    isPublic: true,
    marketCap: 7000000000,
    status: 'active',
    sector: 'communications',
    subsector: 'direct-to-device',
    tags: ['direct-to-cell', 'broadband', 'mobile-connectivity', 'satellite-constellation', 'd2d'],
    tier: 2,
    totalFunding: 600000000,
    ownershipType: 'public',
    products: [
      { name: 'BlueBird Satellites', category: 'satellite_constellation', description: 'Large phased-array satellites providing cellular broadband directly to unmodified smartphones.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Abel Avellan', title: 'Founder, Chairman & CEO', role: 'founder', bio: 'Founded AST SpaceMobile to eliminate connectivity gaps by building a space-based cellular network.' },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'AST SpaceMobile founded to provide direct-to-phone satellite broadband', importance: 7 },
    ],
    facilities: [
      { name: 'AST SpaceMobile Headquarters', type: 'headquarters', city: 'Midland', state: 'TX', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 70 },
    ],
  },
  // 42. Lynk Global
  {
    name: 'Lynk Global',
    legalName: 'Lynk Global, Inc.',
    headquarters: 'Falls Church, Virginia',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '51-200',
    website: 'https://lynk.world',
    description: 'Lynk Global operates a satellite constellation providing cell-tower-in-space connectivity, enabling standard mobile phones to communicate via satellite.',
    ceo: 'Charles Miller',
    isPublic: false,
    status: 'active',
    sector: 'communications',
    subsector: 'direct-to-device',
    tags: ['direct-to-cell', 'mobile-connectivity', 'cell-tower-in-space', 'satellite-constellation'],
    tier: 2,
    totalFunding: 150000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-09-01',
    ownershipType: 'private',
    products: [
      { name: 'Lynk Cell-Tower-in-Space', category: 'satellite_constellation', description: 'LEO satellite constellation acting as cell towers to connect standard mobile phones.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Charles Miller', title: 'Co-Founder & CEO', role: 'founder', bio: 'Former NASA senior advisor who co-founded Lynk Global to extend mobile coverage globally.', previousCompanies: ['NASA'] },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Lynk Global founded to build cell-tower-in-space network', importance: 6 },
    ],
    facilities: [
      { name: 'Lynk Global Headquarters', type: 'headquarters', city: 'Falls Church', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
    ],
  },
  // 43. Momentus
  {
    name: 'Momentus',
    legalName: 'Momentus Inc.',
    headquarters: 'San Jose, California',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '51-200',
    website: 'https://momentus.space',
    description: 'Momentus provides in-space transportation services using its Vigoride orbital transfer vehicles to deliver satellites to precise orbits.',
    ceo: 'John Rood',
    isPublic: false,
    status: 'active',
    sector: 'in-space-transportation',
    tags: ['orbital-transfer', 'last-mile-delivery', 'in-space-transport', 'rideshare'],
    tier: 2,
    totalFunding: 230000000,
    ownershipType: 'private',
    products: [
      { name: 'Vigoride', category: 'orbital_transfer_vehicle', description: 'Orbital transfer vehicle for last-mile satellite delivery from rideshare launches.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'John Rood', title: 'CEO', role: 'executive', bio: 'Former Under Secretary of Defense for Acquisition and Sustainment. Leads Momentus in-space transport business.', previousCompanies: ['U.S. Department of Defense', 'Lockheed Martin'] },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Momentus founded to provide in-space transportation services', importance: 6 },
    ],
    facilities: [
      { name: 'Momentus Headquarters', type: 'headquarters', city: 'San Jose', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },
  // 44. Redwire
  {
    name: 'Redwire',
    legalName: 'Redwire Corporation',
    ticker: 'RDW',
    exchange: 'NYSE',
    headquarters: 'Jacksonville, Florida',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '501-1000',
    website: 'https://redwirespace.com',
    description: 'Redwire is a space infrastructure company providing mission-critical components, digital engineering, and on-orbit manufacturing solutions for government and commercial customers.',
    ceo: 'Peter Cannito',
    isPublic: true,
    marketCap: 1600000000,
    status: 'active',
    sector: 'space-infrastructure',
    subsector: 'components-manufacturing',
    tags: ['space-infrastructure', 'in-space-manufacturing', 'solar-arrays', 'digital-engineering', '3d-printing-space'],
    tier: 2,
    revenueEstimate: 300000000,
    ownershipType: 'public',
    products: [
      { name: 'ROSA Solar Arrays', category: 'component', description: 'Roll-Out Solar Array technology providing lightweight, high-power solar arrays for spacecraft and space stations.', status: 'active' },
      { name: 'Ceramic Manufacturing Module', category: 'manufacturing', description: 'On-orbit manufacturing facility for producing ceramics and other materials in microgravity.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Peter Cannito', title: 'Chairman & CEO', role: 'executive', bio: 'CEO of Redwire, leading the consolidation and growth of space infrastructure companies.' },
    ],
    events: [
      { date: '2020-06-01', type: 'founding', title: 'Redwire formed through consolidation of space infrastructure companies', importance: 6 },
    ],
    facilities: [
      { name: 'Redwire Headquarters', type: 'headquarters', city: 'Jacksonville', state: 'FL', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 69 },
    ],
  },
  // 45. Sidus Space
  {
    name: 'Sidus Space',
    legalName: 'Sidus Space, Inc.',
    headquarters: 'Cape Canaveral, Florida',
    country: 'US',
    foundedYear: 2012,
    employeeRange: '51-200',
    website: 'https://sidusspace.com',
    description: 'Sidus Space is a vertically integrated space company providing satellite manufacturing, AI-enabled data analytics, and space-as-a-service solutions.',
    ceo: 'Carol Craig',
    isPublic: true,
    marketCap: 30000000,
    status: 'active',
    sector: 'satellite-manufacturing',
    tags: ['satellite-manufacturing', 'space-as-a-service', 'ai-analytics', 'earth-observation'],
    tier: 2,
    ownershipType: 'public',
    products: [
      { name: 'LizzieSat', category: 'satellite', description: 'Multi-mission satellite platform with AI-powered edge computing for data processing in orbit.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Carol Craig', title: 'Founder & CEO', role: 'founder', bio: 'Founded Sidus Space, a woman-owned space company focused on satellite manufacturing and data services.' },
    ],
    events: [
      { date: '2012-01-01', type: 'founding', title: 'Sidus Space founded in Cape Canaveral, Florida', importance: 5 },
    ],
    facilities: [
      { name: 'Sidus Space Headquarters & Manufacturing', type: 'headquarters', city: 'Cape Canaveral', state: 'FL', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },
  // 46. Intuitive Machines
  {
    name: 'Intuitive Machines',
    legalName: 'Intuitive Machines, Inc.',
    ticker: 'LUNR',
    exchange: 'NASDAQ',
    headquarters: 'Houston, Texas',
    country: 'US',
    foundedYear: 2013,
    employeeRange: '201-500',
    website: 'https://www.intuitvemachines.com',
    description: 'Intuitive Machines is a leading lunar access company that achieved the first American Moon landing in over 50 years with its Nova-C lander under NASA\'s CLPS program.',
    ceo: 'Steve Altemus',
    isPublic: true,
    marketCap: 3000000000,
    status: 'active',
    sector: 'lunar',
    subsector: 'lunar-landers',
    tags: ['lunar-lander', 'clps', 'nasa', 'moon', 'lunar-services', 'human-spaceflight'],
    tier: 2,
    revenueEstimate: 228000000,
    ownershipType: 'public',
    products: [
      { name: 'Nova-C', category: 'lunar_lander', description: 'Lunar lander that achieved the first American Moon landing since Apollo under NASA CLPS.', status: 'active' },
      { name: 'Lunar Data Network', category: 'communications', description: 'Relay satellite network for cislunar communications and navigation services.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Steve Altemus', title: 'Co-Founder, President & CEO', role: 'founder', bio: 'Former NASA JSC Deputy Director. Co-founded Intuitive Machines to provide lunar access services.', previousCompanies: ['NASA'] },
    ],
    events: [
      { date: '2013-01-01', type: 'founding', title: 'Intuitive Machines founded in Houston, Texas', importance: 7 },
    ],
    facilities: [
      { name: 'Intuitive Machines Headquarters', type: 'headquarters', city: 'Houston', state: 'TX', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 75 },
    ],
  },
  // 47. Astrobotic
  {
    name: 'Astrobotic',
    legalName: 'Astrobotic Technology, Inc.',
    headquarters: 'Pittsburgh, Pennsylvania',
    country: 'US',
    foundedYear: 2007,
    employeeRange: '201-500',
    website: 'https://www.astrobotic.com',
    description: 'Astrobotic is a lunar logistics company delivering payloads to the Moon for space agencies, companies, and universities through its Peregrine and Griffin landers.',
    ceo: 'John Thornton',
    isPublic: false,
    status: 'active',
    sector: 'lunar',
    subsector: 'lunar-landers',
    tags: ['lunar-lander', 'clps', 'nasa', 'moon', 'lunar-logistics', 'payload-delivery'],
    tier: 2,
    totalFunding: 350000000,
    ownershipType: 'private',
    products: [
      { name: 'Peregrine', category: 'lunar_lander', description: 'Small-class lunar lander for delivering payloads to the Moon under NASA CLPS.', status: 'active' },
      { name: 'Griffin', category: 'lunar_lander', description: 'Medium-class lunar lander designed to deliver NASA\'s VIPER rover to the Moon.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'John Thornton', title: 'CEO', role: 'executive', bio: 'CEO of Astrobotic, leading the company\'s lunar delivery business.', previousCompanies: ['Carnegie Mellon University'] },
    ],
    events: [
      { date: '2007-01-01', type: 'founding', title: 'Astrobotic founded at Carnegie Mellon University as lunar robotics company', importance: 7 },
    ],
    facilities: [
      { name: 'Astrobotic Headquarters', type: 'headquarters', city: 'Pittsburgh', state: 'PA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 70 },
    ],
  },
  // 48. York Space Systems
  {
    name: 'York Space Systems',
    legalName: 'York Space Systems LLC',
    headquarters: 'Denver, Colorado',
    country: 'US',
    foundedYear: 2014,
    employeeRange: '201-500',
    website: 'https://www.yorkspacesystems.com',
    description: 'York Space Systems is a satellite manufacturer specializing in high-volume, low-cost production of standardized spacecraft platforms for defense and commercial customers.',
    ceo: 'Dirk Wallinger',
    isPublic: false,
    status: 'active',
    sector: 'satellite-manufacturing',
    tags: ['satellite-manufacturing', 'defense', 'mass-production', 'standardized-platforms', 'sda'],
    tier: 2,
    totalFunding: 130000000,
    ownershipType: 'private',
    products: [
      { name: 'S-CLASS', category: 'satellite_bus', description: 'Standardized satellite platform designed for rapid, low-cost mass production for defense constellations.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Dirk Wallinger', title: 'CEO', role: 'executive', bio: 'CEO of York Space Systems, driving mass production of defense satellite platforms.' },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'York Space Systems founded in Denver, Colorado', importance: 6 },
    ],
    facilities: [
      { name: 'York Space Systems Headquarters & Factory', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 66 },
    ],
  },
  // 49. Rocket Factory Augsburg
  {
    name: 'Rocket Factory Augsburg',
    legalName: 'Rocket Factory Augsburg AG',
    headquarters: 'Augsburg, Germany',
    country: 'DE',
    foundedYear: 2018,
    employeeRange: '51-200',
    website: 'https://www.rfa.space',
    description: 'Rocket Factory Augsburg is a European launch startup developing the RFA ONE small launch vehicle to provide sovereign European access to space.',
    ceo: 'Stefan Brieschenk',
    isPublic: false,
    status: 'active',
    sector: 'launch',
    subsector: 'small-lift',
    tags: ['launch-provider', 'small-sat', 'european-launch', 'new-space'],
    tier: 2,
    totalFunding: 75000000,
    ownershipType: 'private',
    products: [
      { name: 'RFA ONE', category: 'launch_vehicle', description: 'Three-stage orbital micro-launcher designed for LEO payload delivery.', status: 'development', specs: { payload_leo_kg: 1300 } },
    ],
    keyPersonnel: [
      { name: 'Stefan Brieschenk', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded RFA to provide independent European access to space.' },
    ],
    events: [
      { date: '2018-01-01', type: 'founding', title: 'Rocket Factory Augsburg founded in Germany', importance: 6 },
    ],
    facilities: [
      { name: 'RFA Headquarters', type: 'headquarters', city: 'Augsburg', country: 'DE' },
    ],
    scores: [
      { scoreType: 'overall', score: 56 },
    ],
  },
  // 50. ICEYE
  {
    name: 'ICEYE',
    legalName: 'ICEYE Oy',
    headquarters: 'Espoo, Finland',
    country: 'FI',
    foundedYear: 2014,
    employeeRange: '501-1000',
    website: 'https://www.iceye.com',
    description: 'ICEYE operates the world\'s largest synthetic aperture radar satellite constellation, providing persistent monitoring for disaster response, insurance, defense, and environmental applications.',
    ceo: 'Rafal Modrzewski',
    isPublic: false,
    status: 'active',
    sector: 'earth-observation',
    subsector: 'sar-imaging',
    tags: ['sar', 'earth-observation', 'radar', 'disaster-response', 'insurance-analytics', 'defense'],
    tier: 2,
    totalFunding: 304000000,
    lastFundingRound: 'Series E',
    lastFundingDate: '2024-01-01',
    ownershipType: 'private',
    products: [
      { name: 'ICEYE SAR Constellation', category: 'satellite_constellation', description: 'World\'s largest commercial SAR constellation providing sub-1m resolution imagery with rapid revisit.', status: 'active' },
      { name: 'ICEYE Flood Monitoring', category: 'software', description: 'Near real-time flood extent mapping and property-level damage assessment for insurance.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Rafal Modrzewski', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded ICEYE while at Aalto University to build affordable SAR microsatellites.' },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'ICEYE founded in Espoo, Finland', importance: 7 },
    ],
    facilities: [
      { name: 'ICEYE Headquarters', type: 'headquarters', city: 'Espoo', country: 'FI' },
    ],
    scores: [
      { scoreType: 'overall', score: 74 },
    ],
  },
  // 51. D-Orbit
  {
    name: 'D-Orbit',
    legalName: 'D-Orbit S.p.A.',
    headquarters: 'Como, Italy',
    country: 'IT',
    foundedYear: 2011,
    employeeRange: '201-500',
    website: 'https://www.dorbit.space',
    description: 'D-Orbit is a space logistics company providing in-orbit transportation, satellite deployment, and space infrastructure services through its ION satellite carrier.',
    ceo: 'Luca Rossettini',
    isPublic: false,
    status: 'active',
    sector: 'in-space-transportation',
    tags: ['orbital-transfer', 'satellite-deployment', 'space-logistics', 'decommissioning'],
    tier: 2,
    totalFunding: 180000000,
    ownershipType: 'private',
    products: [
      { name: 'ION Satellite Carrier', category: 'orbital_transfer_vehicle', description: 'Last-mile delivery vehicle for precise satellite deployment, in-orbit demonstrations, and edge computing.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Luca Rossettini', title: 'Founder & CEO', role: 'founder', bio: 'Founded D-Orbit to provide space logistics and in-orbit transportation services.' },
    ],
    events: [
      { date: '2011-01-01', type: 'founding', title: 'D-Orbit founded in Como, Italy', importance: 6 },
    ],
    facilities: [
      { name: 'D-Orbit Headquarters', type: 'headquarters', city: 'Como', country: 'IT' },
    ],
    scores: [
      { scoreType: 'overall', score: 63 },
    ],
  },
  // 52. Kayhan Space
  {
    name: 'Kayhan Space',
    legalName: 'Kayhan Space, Inc.',
    headquarters: 'Boulder, Colorado',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '11-50',
    website: 'https://www.kayhan.space',
    description: 'Kayhan Space provides autonomous space traffic management software to help satellite operators avoid collisions and manage orbital safety.',
    ceo: 'Siamak Hesar',
    isPublic: false,
    status: 'active',
    sector: 'space-situational-awareness',
    subsector: 'space-traffic-management',
    tags: ['space-traffic-management', 'collision-avoidance', 'space-safety', 'software'],
    tier: 2,
    totalFunding: 15000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2022-06-01',
    ownershipType: 'private',
    products: [
      { name: 'Pathfinder', category: 'software', description: 'Autonomous space traffic management platform for collision avoidance and orbital safety.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Siamak Hesar', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded Kayhan Space to address the growing challenge of space traffic management.' },
    ],
    events: [
      { date: '2019-01-01', type: 'founding', title: 'Kayhan Space founded to improve space traffic safety', importance: 5 },
    ],
    facilities: [
      { name: 'Kayhan Space Headquarters', type: 'headquarters', city: 'Boulder', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 52 },
    ],
  },
  // 53. Privateer
  {
    name: 'Privateer',
    legalName: 'Privateer Space Inc.',
    headquarters: 'Honolulu, Hawaii',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '11-50',
    website: 'https://www.privateer.com',
    description: 'Privateer is a space data and sustainability company co-founded by Steve Wozniak, building a comprehensive map of objects in Earth orbit for space traffic coordination.',
    ceo: 'Alex Fielding',
    isPublic: false,
    status: 'active',
    sector: 'space-situational-awareness',
    subsector: 'space-mapping',
    tags: ['space-sustainability', 'space-mapping', 'orbital-data', 'space-traffic'],
    tier: 2,
    totalFunding: 20000000,
    ownershipType: 'private',
    products: [
      { name: 'Wayfinder', category: 'software', description: 'Real-time visualization and data platform mapping all trackable objects in Earth orbit.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Alex Fielding', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded Privateer with Steve Wozniak to address space sustainability challenges.', previousCompanies: ['Apple', 'Ripcord'] },
    ],
    events: [
      { date: '2021-09-01', type: 'founding', title: 'Privateer founded by Alex Fielding and Steve Wozniak', importance: 6 },
    ],
    facilities: [
      { name: 'Privateer Headquarters', type: 'headquarters', city: 'Honolulu', state: 'HI', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 53 },
    ],
  },
  // 54. Albedo
  {
    name: 'Albedo',
    legalName: 'Albedo Space Corp.',
    headquarters: 'Broomfield, Colorado',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '51-200',
    website: 'https://albedo.com',
    description: 'Albedo is developing very low Earth orbit satellites to capture 10cm-resolution visible and 2m thermal imagery, bridging the gap between aerial and satellite imaging.',
    ceo: 'Topher Haddad',
    isPublic: false,
    status: 'active',
    sector: 'earth-observation',
    subsector: 'vleo-imaging',
    tags: ['earth-observation', 'vleo', 'high-resolution', 'thermal-imaging', 'aerial-satellite-gap'],
    tier: 2,
    totalFunding: 132000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2024-03-01',
    ownershipType: 'private',
    products: [
      { name: 'Albedo VLEO Constellation', category: 'satellite_constellation', description: 'Very low Earth orbit imaging satellites delivering 10cm visible and 2m thermal resolution.', status: 'development', specs: { resolution_visible_cm: 10, resolution_thermal_m: 2, orbit_km: 250 } },
    ],
    keyPersonnel: [
      { name: 'Topher Haddad', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded Albedo to provide satellite imagery at aerial-like resolution.' },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Albedo founded to build VLEO imaging constellation', importance: 6 },
    ],
    facilities: [
      { name: 'Albedo Headquarters', type: 'headquarters', city: 'Broomfield', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 62 },
    ],
  },
  // 55. Orbit Fab
  {
    name: 'Orbit Fab',
    legalName: 'Orbit Fab, Inc.',
    headquarters: 'San Francisco, California',
    country: 'US',
    foundedYear: 2018,
    employeeRange: '11-50',
    website: 'https://www.orbitfab.com',
    description: 'Orbit Fab is building an in-space refueling network, developing fuel depots and standardized refueling interfaces to extend the life of satellites in orbit.',
    ceo: 'Daniel Faber',
    isPublic: false,
    status: 'active',
    sector: 'on-orbit-services',
    subsector: 'in-space-refueling',
    tags: ['in-space-refueling', 'fuel-depot', 'satellite-servicing', 'on-orbit-services'],
    tier: 2,
    totalFunding: 52000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2022-10-01',
    ownershipType: 'private',
    products: [
      { name: 'RAFTI', category: 'component', description: 'Rapidly Attachable Fluid Transfer Interface — standardized refueling port for spacecraft.', status: 'active' },
      { name: 'Tanker-002', category: 'fuel_depot', description: 'In-orbit fuel shuttle for delivering hydrazine to GEO satellites.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Daniel Faber', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded Orbit Fab to create the first gas stations in space.' },
    ],
    events: [
      { date: '2018-01-01', type: 'founding', title: 'Orbit Fab founded to build in-space refueling infrastructure', importance: 6 },
    ],
    facilities: [
      { name: 'Orbit Fab Headquarters', type: 'headquarters', city: 'San Francisco', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
    ],
  },
  // 56. CesiumAstro
  {
    name: 'CesiumAstro',
    legalName: 'CesiumAstro Inc.',
    headquarters: 'Austin, Texas',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '51-200',
    website: 'https://www.cesiumastro.com',
    description: 'CesiumAstro develops active phased array communication systems for satellites, launch vehicles, and unmanned aerial systems.',
    ceo: 'Shey Sabripour',
    isPublic: false,
    status: 'active',
    sector: 'communications',
    subsector: 'phased-arrays',
    tags: ['phased-array', 'satellite-communications', 'antenna-systems', 'defense-comms'],
    tier: 2,
    totalFunding: 90000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2023-01-01',
    ownershipType: 'private',
    products: [
      { name: 'Nightingale', category: 'component', description: 'Software-defined multi-beam active phased array communication system for space and airborne platforms.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Shey Sabripour', title: 'Founder & CEO', role: 'founder', bio: 'Founded CesiumAstro to develop next-generation phased array communication systems.', previousCompanies: ['Firefly Aerospace'] },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'CesiumAstro founded in Austin, Texas', importance: 5 },
    ],
    facilities: [
      { name: 'CesiumAstro Headquarters', type: 'headquarters', city: 'Austin', state: 'TX', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 61 },
    ],
  },
  // 57. Phase Four
  {
    name: 'Phase Four',
    legalName: 'Phase Four, Inc.',
    headquarters: 'Hawthorne, California',
    country: 'US',
    foundedYear: 2015,
    employeeRange: '11-50',
    website: 'https://www.phasefour.io',
    description: 'Phase Four develops next-generation radio-frequency plasma thrusters that offer high performance with flexible propellant options for smallsat and medium-class spacecraft.',
    ceo: 'Beau Jarvis',
    isPublic: false,
    status: 'active',
    sector: 'propulsion',
    subsector: 'electric-propulsion',
    tags: ['electric-propulsion', 'plasma-thruster', 'smallsat-propulsion', 'rf-thruster'],
    tier: 2,
    totalFunding: 30000000,
    ownershipType: 'private',
    products: [
      { name: 'Maxwell', category: 'propulsion', description: 'Radio-frequency plasma thruster offering propellant flexibility and high performance for LEO and beyond.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Beau Jarvis', title: 'CEO', role: 'executive', bio: 'CEO of Phase Four, advancing RF plasma propulsion technology for the growing smallsat market.' },
    ],
    events: [
      { date: '2015-01-01', type: 'founding', title: 'Phase Four founded to develop RF plasma propulsion systems', importance: 5 },
    ],
    facilities: [
      { name: 'Phase Four Headquarters', type: 'headquarters', city: 'Hawthorne', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },
  // 58. Atomos Space
  {
    name: 'Atomos Space',
    legalName: 'Atomos Space, Inc.',
    headquarters: 'Denver, Colorado',
    country: 'US',
    foundedYear: 2018,
    employeeRange: '11-50',
    website: 'https://atomos.space',
    description: 'Atomos Space develops orbital transfer vehicles to provide in-space transportation for repositioning, deorbiting, and delivering satellites between orbits.',
    ceo: 'Vanessa Clark',
    isPublic: false,
    status: 'active',
    sector: 'in-space-transportation',
    tags: ['orbital-transfer', 'in-space-transport', 'satellite-repositioning', 'space-tug'],
    tier: 2,
    totalFunding: 15000000,
    ownershipType: 'private',
    products: [
      { name: 'Quark', category: 'orbital_transfer_vehicle', description: 'Electric orbital transfer vehicle for satellite repositioning and orbit-raising services.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Vanessa Clark', title: 'Co-Founder & CEO', role: 'founder', bio: 'Co-founded Atomos Space to build space tug infrastructure for in-orbit logistics.', previousCompanies: ['Lockheed Martin'] },
    ],
    events: [
      { date: '2018-01-01', type: 'founding', title: 'Atomos Space founded in Denver, Colorado', importance: 5 },
    ],
    facilities: [
      { name: 'Atomos Space Headquarters', type: 'headquarters', city: 'Denver', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 51 },
    ],
  },
  // 59. SpiderOak
  {
    name: 'SpiderOak',
    legalName: 'SpiderOak Mission Systems',
    headquarters: 'Reston, Virginia',
    country: 'US',
    foundedYear: 2007,
    employeeRange: '51-200',
    website: 'https://spideroak.com',
    description: 'SpiderOak provides zero-trust cybersecurity solutions for space systems, protecting satellite communications and data with end-to-end encryption.',
    ceo: 'Charlie Speight',
    isPublic: false,
    status: 'active',
    sector: 'cybersecurity',
    subsector: 'space-cybersecurity',
    tags: ['cybersecurity', 'zero-trust', 'space-security', 'encryption', 'satellite-security'],
    tier: 2,
    totalFunding: 45000000,
    ownershipType: 'private',
    products: [
      { name: 'OrbitSecure', category: 'software', description: 'Zero-trust data-at-rest and data-in-transit security platform for space systems and satellite constellations.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Charlie Speight', title: 'CEO', role: 'executive', bio: 'CEO of SpiderOak Mission Systems, leading zero-trust cybersecurity for space applications.' },
    ],
    events: [
      { date: '2007-01-01', type: 'founding', title: 'SpiderOak founded as zero-knowledge encryption company', importance: 5 },
    ],
    facilities: [
      { name: 'SpiderOak Headquarters', type: 'headquarters', city: 'Reston', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 57 },
    ],
  },
  // 60. Parsons
  {
    name: 'Parsons',
    legalName: 'Parsons Corporation',
    ticker: 'PSN',
    exchange: 'NYSE',
    headquarters: 'Chantilly, Virginia',
    country: 'US',
    foundedYear: 1944,
    employeeRange: '5000+',
    employeeCount: 17500,
    website: 'https://www.parsons.com',
    description: 'Parsons is a defense and intelligence technology company providing space systems, cybersecurity, missile defense, and critical infrastructure solutions.',
    ceo: 'Carey Smith',
    isPublic: true,
    marketCap: 9000000000,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'systems-integration',
    tags: ['defense', 'space-systems', 'cybersecurity', 'missile-defense', 'intelligence'],
    tier: 2,
    revenueEstimate: 6500000000,
    ownershipType: 'public',
    products: [
      { name: 'Space C2 Systems', category: 'software', description: 'Command and control systems for space domain awareness and satellite operations.', status: 'active' },
      { name: 'Missile Defense Integration', category: 'systems_integration', description: 'Integration and engineering services for ballistic missile defense systems.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Carey Smith', title: 'Chair, President & CEO', role: 'executive', bio: 'CEO of Parsons Corporation, leading growth in defense technology and space systems.', previousCompanies: ['Honeywell', 'Lockheed Martin'] },
    ],
    events: [
      { date: '1944-01-01', type: 'founding', title: 'Parsons Corporation founded', importance: 5 },
    ],
    facilities: [
      { name: 'Parsons Headquarters', type: 'headquarters', city: 'Chantilly', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 73 },
    ],
  },
  // 61. General Atomics
  {
    name: 'General Atomics',
    legalName: 'General Atomics',
    headquarters: 'San Diego, California',
    country: 'US',
    foundedYear: 1955,
    employeeRange: '5000+',
    employeeCount: 15000,
    website: 'https://www.ga.com',
    description: 'General Atomics is a privately held defense and diversified technologies company with major programs in electromagnetic systems, nuclear technology, and satellite systems for national security.',
    ceo: 'Neal Blue',
    isPublic: false,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'advanced-systems',
    tags: ['defense', 'satellite-systems', 'electromagnetic', 'nuclear', 'uas', 'national-security'],
    tier: 2,
    revenueEstimate: 4000000000,
    ownershipType: 'private',
    products: [
      { name: 'Electromagnetic Systems Satellites', category: 'satellite', description: 'Satellite systems and space electronics for national security and defense missions.', status: 'active' },
      { name: 'GA-EMS Orbital Test Bed', category: 'satellite_bus', description: 'Versatile satellite platform for DoD experimentation and hosted payloads.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Neal Blue', title: 'Chairman & CEO', role: 'executive', bio: 'Chairman and CEO of General Atomics, leading the company for over four decades.' },
    ],
    events: [
      { date: '1955-07-18', type: 'founding', title: 'General Atomics founded as division of General Dynamics', importance: 6 },
    ],
    facilities: [
      { name: 'General Atomics Headquarters', type: 'headquarters', city: 'San Diego', state: 'CA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 76 },
    ],
  },
  // 62. Ball Aerospace
  {
    name: 'Ball Aerospace',
    legalName: 'Ball Aerospace & Technologies Corp.',
    headquarters: 'Broomfield, Colorado',
    country: 'US',
    foundedYear: 1956,
    employeeRange: '5000+',
    employeeCount: 5800,
    website: 'https://www.ball.com/aerospace',
    description: 'Ball Aerospace, a subsidiary of BAE Systems, designs and manufactures spacecraft, instruments, and sensors for defense, civil, and commercial space missions including the James Webb Space Telescope.',
    ceo: 'David Kaufman',
    isPublic: false,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'spacecraft-instruments',
    tags: ['spacecraft', 'instruments', 'sensors', 'defense', 'nasa', 'jwst', 'earth-observation'],
    tier: 2,
    revenueEstimate: 2200000000,
    ownershipType: 'subsidiary',
    parentCompany: 'BAE Systems',
    products: [
      { name: 'Earth Observation Instruments', category: 'instrument', description: 'Advanced remote sensing instruments for weather, climate, and environmental monitoring satellites.', status: 'active' },
      { name: 'Tactical Spacecraft', category: 'satellite', description: 'Small, responsive satellites for national security and defense missions.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'David Kaufman', title: 'President', role: 'executive', bio: 'President of Ball Aerospace within BAE Systems, leading spacecraft and instrument programs.' },
    ],
    events: [
      { date: '1956-01-01', type: 'founding', title: 'Ball Aerospace founded as Ball Brothers Research Corporation', importance: 6 },
    ],
    facilities: [
      { name: 'Ball Aerospace Headquarters', type: 'headquarters', city: 'Broomfield', state: 'CO', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 80 },
    ],
  },
  // 63. Aerojet Rocketdyne / L3Harris
  {
    name: 'Aerojet Rocketdyne',
    legalName: 'Aerojet Rocketdyne Holdings, Inc.',
    headquarters: 'Arlington, Virginia',
    country: 'US',
    foundedYear: 1942,
    employeeRange: '5000+',
    employeeCount: 5000,
    website: 'https://www.l3harris.com/aerojet-rocketdyne',
    description: 'Aerojet Rocketdyne, now part of L3Harris Technologies, is the leading American manufacturer of rocket propulsion systems powering launch vehicles, spacecraft, and missile defense systems.',
    ceo: 'Christopher Kubasik',
    isPublic: false,
    status: 'active',
    sector: 'propulsion',
    subsector: 'rocket-engines',
    tags: ['propulsion', 'rocket-engines', 'solid-motors', 'defense', 'launch', 'missile-defense'],
    tier: 2,
    revenueEstimate: 2300000000,
    ownershipType: 'subsidiary',
    parentCompany: 'L3Harris Technologies',
    products: [
      { name: 'RL10', category: 'rocket_engine', description: 'Upper-stage cryogenic engine used on Atlas V, Delta IV, and Vulcan Centaur.', status: 'active' },
      { name: 'RS-25', category: 'rocket_engine', description: 'Liquid hydrogen/oxygen engine powering NASA\'s Space Launch System (SLS) core stage.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Christopher Kubasik', title: 'L3Harris Chair & CEO', role: 'executive', bio: 'CEO of L3Harris Technologies, overseeing Aerojet Rocketdyne following the 2023 acquisition.', previousCompanies: ['Lockheed Martin'] },
    ],
    events: [
      { date: '1942-03-01', type: 'founding', title: 'Aerojet founded as Aerojet Engineering Corporation', importance: 7 },
    ],
    facilities: [
      { name: 'Aerojet Rocketdyne Headquarters', type: 'headquarters', city: 'Arlington', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 82 },
    ],
  },
  // 64. Peraton
  {
    name: 'Peraton',
    legalName: 'Peraton Inc.',
    headquarters: 'Herndon, Virginia',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '5000+',
    employeeCount: 14000,
    website: 'https://www.peraton.com',
    description: 'Peraton is a national security company providing space, intelligence, cyber, defense, and health mission support services to U.S. government agencies.',
    ceo: 'Stu Shea',
    isPublic: false,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'mission-support',
    tags: ['defense', 'intelligence', 'space-operations', 'cybersecurity', 'government-it'],
    tier: 2,
    revenueEstimate: 7200000000,
    ownershipType: 'private',
    products: [
      { name: 'Space Mission Support', category: 'services', description: 'Ground systems engineering, satellite operations, and space mission support for government agencies.', status: 'active' },
      { name: 'Signals Intelligence', category: 'services', description: 'SIGINT collection, processing, and analysis services for the intelligence community.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Stu Shea', title: 'Chairman, President & CEO', role: 'executive', bio: 'CEO of Peraton, leading one of the largest national security technology providers.', previousCompanies: ['Leidos', 'SAIC'] },
    ],
    events: [
      { date: '2017-04-01', type: 'founding', title: 'Peraton formed from Harris IT Services and subsequent acquisitions', importance: 5 },
    ],
    facilities: [
      { name: 'Peraton Headquarters', type: 'headquarters', city: 'Herndon', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 74 },
    ],
  },
  // 65. Leidos
  {
    name: 'Leidos',
    legalName: 'Leidos Holdings, Inc.',
    ticker: 'LDOS',
    exchange: 'NYSE',
    headquarters: 'Reston, Virginia',
    country: 'US',
    foundedYear: 2013,
    employeeRange: '5000+',
    employeeCount: 47000,
    website: 'https://www.leidos.com',
    description: 'Leidos is a Fortune 500 defense, aviation, IT, and biomedical research company providing space systems engineering, ground systems, and satellite operations for the U.S. government.',
    ceo: 'Tom Bell',
    isPublic: true,
    marketCap: 18000000000,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'systems-integration',
    tags: ['defense', 'space-systems', 'ground-systems', 'it-services', 'intelligence'],
    tier: 2,
    revenueEstimate: 16000000000,
    ownershipType: 'public',
    products: [
      { name: 'Ground Systems', category: 'systems_integration', description: 'Satellite ground segment engineering, operations, and modernization services.', status: 'active' },
      { name: 'Space Sensor Systems', category: 'systems_integration', description: 'Space-based sensor systems for missile warning and defense applications.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Tom Bell', title: 'CEO', role: 'executive', bio: 'CEO of Leidos, leading one of the top defense and IT services companies.', previousCompanies: ['Rolls-Royce', 'Raytheon'] },
    ],
    events: [
      { date: '2013-09-27', type: 'founding', title: 'Leidos formed from SAIC split into two companies', importance: 6 },
    ],
    facilities: [
      { name: 'Leidos Headquarters', type: 'headquarters', city: 'Reston', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 78 },
    ],
  },
  // 66. CACI International
  {
    name: 'CACI International',
    legalName: 'CACI International Inc',
    ticker: 'CACI',
    exchange: 'NYSE',
    headquarters: 'Reston, Virginia',
    country: 'US',
    foundedYear: 1962,
    employeeRange: '5000+',
    employeeCount: 24000,
    website: 'https://www.caci.com',
    description: 'CACI International is a defense and intelligence technology company providing signals intelligence, electronic warfare, and space systems support to the U.S. government.',
    ceo: 'John Mengucci',
    isPublic: true,
    marketCap: 11000000000,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'intelligence-technology',
    tags: ['defense', 'intelligence', 'sigint', 'electronic-warfare', 'space-operations'],
    tier: 2,
    revenueEstimate: 8000000000,
    ownershipType: 'public',
    products: [
      { name: 'Space Operations Support', category: 'services', description: 'Engineering and operations support for military and intelligence space systems.', status: 'active' },
      { name: 'SIGINT/EW Solutions', category: 'systems_integration', description: 'Signals intelligence and electronic warfare systems for national security.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'John Mengucci', title: 'President & CEO', role: 'executive', bio: 'CEO of CACI International, leading defense technology and intelligence solutions.', previousCompanies: ['L3 Technologies'] },
    ],
    events: [
      { date: '1962-07-01', type: 'founding', title: 'CACI founded as California Analysis Center, Incorporated', importance: 5 },
    ],
    facilities: [
      { name: 'CACI Headquarters', type: 'headquarters', city: 'Reston', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 75 },
    ],
  },
  // 67. SAIC
  {
    name: 'SAIC',
    legalName: 'Science Applications International Corporation',
    ticker: 'SAIC',
    exchange: 'NYSE',
    headquarters: 'Reston, Virginia',
    country: 'US',
    foundedYear: 2013,
    employeeRange: '5000+',
    employeeCount: 26000,
    website: 'https://www.saic.com',
    description: 'SAIC is a premier technology integrator providing space systems engineering, IT modernization, and mission support to U.S. defense, intelligence, and civilian agencies.',
    ceo: 'Toni Townes-Whitley',
    isPublic: true,
    marketCap: 6000000000,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'technology-integration',
    tags: ['defense', 'space-systems', 'it-modernization', 'systems-engineering', 'government-it'],
    tier: 2,
    revenueEstimate: 7400000000,
    ownershipType: 'public',
    products: [
      { name: 'Space Systems Integration', category: 'systems_integration', description: 'Space systems engineering, integration, and sustainment services for defense and intelligence.', status: 'active' },
      { name: 'IT Modernization', category: 'services', description: 'Cloud migration, digital transformation, and IT services for government agencies.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Toni Townes-Whitley', title: 'CEO', role: 'executive', bio: 'CEO of SAIC, leading the company\'s technology integration and mission support business.', previousCompanies: ['Microsoft'] },
    ],
    events: [
      { date: '2013-09-27', type: 'founding', title: 'New SAIC formed from the SAIC/Leidos split', importance: 5 },
    ],
    facilities: [
      { name: 'SAIC Headquarters', type: 'headquarters', city: 'Reston', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 74 },
    ],
  },
  // 68. Booz Allen Hamilton
  {
    name: 'Booz Allen Hamilton',
    legalName: 'Booz Allen Hamilton Holding Corporation',
    ticker: 'BAH',
    exchange: 'NYSE',
    headquarters: 'McLean, Virginia',
    country: 'US',
    foundedYear: 1914,
    employeeRange: '5000+',
    employeeCount: 34000,
    website: 'https://www.boozallen.com',
    description: 'Booz Allen Hamilton is a leading management and technology consulting firm providing space analytics, AI/ML, and digital transformation services to defense and intelligence agencies.',
    ceo: 'Horacio Rozanski',
    isPublic: true,
    marketCap: 17000000000,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'consulting-technology',
    tags: ['consulting', 'ai-ml', 'defense', 'space-analytics', 'digital-transformation', 'intelligence'],
    tier: 2,
    revenueEstimate: 11000000000,
    ownershipType: 'public',
    products: [
      { name: 'Space Analytics & Mission Engineering', category: 'services', description: 'AI/ML-driven analytics, modeling, and simulation for space mission planning and operations.', status: 'active' },
      { name: 'Cyber & Digital Solutions', category: 'services', description: 'Cybersecurity, cloud, and digital transformation services for national security missions.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Horacio Rozanski', title: 'President & CEO', role: 'executive', bio: 'CEO of Booz Allen Hamilton, leading the firm\'s defense and technology consulting operations.' },
    ],
    events: [
      { date: '1914-01-01', type: 'founding', title: 'Booz Allen Hamilton founded as management consulting firm', importance: 5 },
    ],
    facilities: [
      { name: 'Booz Allen Hamilton Headquarters', type: 'headquarters', city: 'McLean', state: 'VA', country: 'US' },
    ],
    scores: [
      { scoreType: 'overall', score: 77 },
    ],
  },
  // 69. Airbus Defence & Space
  {
    name: 'Airbus Defence & Space',
    legalName: 'Airbus Defence and Space SAS',
    headquarters: 'Toulouse, France',
    country: 'FR',
    foundedYear: 2014,
    employeeRange: '5000+',
    employeeCount: 35000,
    website: 'https://www.airbus.com/en/space',
    description: 'Airbus Defence & Space is a division of Airbus SE and one of the world\'s largest space companies, providing satellites, launch vehicles, ISS modules, and Earth observation services.',
    ceo: 'Michael Schoellhorn',
    isPublic: false,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'full-spectrum-space',
    tags: ['satellites', 'launch', 'earth-observation', 'telecommunications', 'iss', 'defense', 'european-space'],
    tier: 2,
    revenueEstimate: 12000000000,
    ownershipType: 'subsidiary',
    parentCompany: 'Airbus SE',
    products: [
      { name: 'OneSat', category: 'satellite', description: 'Software-defined telecommunications satellite platform offering unprecedented in-orbit reconfigurability.', status: 'active' },
      { name: 'Pleiades Neo', category: 'satellite_constellation', description: 'Very high-resolution optical Earth observation constellation delivering 30cm native resolution.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Michael Schoellhorn', title: 'CEO, Airbus Defence & Space', role: 'executive', bio: 'CEO of Airbus Defence & Space division, overseeing European military aircraft, space systems, and defense electronics.' },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'Airbus Defence & Space formed from merger of Cassidian, Astrium, and Airbus Military', importance: 7 },
    ],
    facilities: [
      { name: 'Airbus Defence & Space Headquarters', type: 'headquarters', city: 'Toulouse', country: 'FR' },
    ],
    scores: [
      { scoreType: 'overall', score: 85 },
    ],
  },
  // 70. Thales Alenia Space
  {
    name: 'Thales Alenia Space',
    legalName: 'Thales Alenia Space SAS',
    headquarters: 'Cannes, France',
    country: 'FR',
    foundedYear: 2007,
    employeeRange: '5000+',
    employeeCount: 8500,
    website: 'https://www.thalesaleniaspace.com',
    description: 'Thales Alenia Space is a European leader in space systems manufacturing, providing telecommunications satellites, Earth observation, navigation, science missions, and orbital infrastructure including ISS modules.',
    ceo: 'Herve Derrey',
    isPublic: false,
    status: 'active',
    sector: 'defense-aerospace',
    subsector: 'satellite-manufacturing',
    tags: ['satellites', 'telecommunications', 'earth-observation', 'navigation', 'space-stations', 'european-space'],
    tier: 2,
    revenueEstimate: 2800000000,
    ownershipType: 'joint-venture',
    parentCompany: 'Thales (67%) / Leonardo (33%)',
    products: [
      { name: 'Spacebus Neo', category: 'satellite_bus', description: 'All-electric telecommunications satellite platform for GEO and MEO orbits.', status: 'active' },
      { name: 'HALO Module', category: 'space_station', description: 'Habitation and Logistics Outpost for NASA\'s Lunar Gateway space station.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Herve Derrey', title: 'CEO', role: 'executive', bio: 'CEO of Thales Alenia Space, leading European space manufacturing and systems.' },
    ],
    events: [
      { date: '2007-04-01', type: 'founding', title: 'Thales Alenia Space formed as joint venture of Thales and Leonardo', importance: 7 },
    ],
    facilities: [
      { name: 'Thales Alenia Space Headquarters', type: 'headquarters', city: 'Cannes', country: 'FR' },
    ],
    scores: [
      { scoreType: 'overall', score: 83 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// TIER 3 COMPANIES (30 Emerging Startups)
// ────────────────────────────────────────────────────────────────

const TIER_3: CompanyData[] = [
  {
    name: 'Stoke Space',
    headquarters: 'Kent, Washington',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '51-200',
    website: 'https://www.stokespace.com',
    description: 'Stoke Space is developing a fully reusable rocket with a novel second-stage recovery system designed for rapid turnaround and daily launch cadence.',
    ceo: 'Andy Lapsa',
    sector: 'launch',
    tags: ['launch-provider', 'reusable-rockets', 'full-reusability'],
    tier: 3,
    totalFunding: 175000000,
    ownershipType: 'private',
    products: [
      { name: 'Nova', category: 'launch_vehicle', description: 'Fully reusable medium-lift launch vehicle with differential throttling second-stage recovery.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Andy Lapsa', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['Blue Origin'] },
    ],
    events: [
      { date: '2019-01-01', type: 'founding', title: 'Stoke Space founded by Andy Lapsa and Tom Feldman', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 62 },
    ],
  },
  {
    name: 'Phantom Space',
    headquarters: 'Tucson, Arizona',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '51-200',
    website: 'https://www.phantomspace.com',
    description: 'Phantom Space is building affordable small-lift launch vehicles and satellite buses to democratize access to space.',
    ceo: 'Jim Cantrell',
    sector: 'launch',
    tags: ['launch-provider', 'small-sat', 'satellite-bus'],
    tier: 3,
    totalFunding: 26000000,
    ownershipType: 'private',
    products: [
      { name: 'Daytona', category: 'launch_vehicle', description: 'Small satellite launch vehicle for dedicated and rideshare missions.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jim Cantrell', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['SpaceX', 'Vector Launch'] },
    ],
    events: [
      { date: '2019-01-01', type: 'founding', title: 'Phantom Space founded by Jim Cantrell', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 42 },
    ],
  },
  {
    name: 'Varda Space Industries',
    headquarters: 'El Segundo, California',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '51-200',
    website: 'https://www.varda.com',
    description: 'Varda Space Industries manufactures products in microgravity aboard autonomous spacecraft and returns them to Earth for terrestrial use.',
    ceo: 'Will Bruey',
    sector: 'in-space-manufacturing',
    tags: ['in-space-manufacturing', 'microgravity', 'pharmaceuticals', 'reentry'],
    tier: 3,
    totalFunding: 153000000,
    ownershipType: 'private',
    products: [
      { name: 'W-Series Spacecraft', category: 'spacecraft', description: 'Autonomous orbital factory and reentry capsule for microgravity manufacturing.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Will Bruey', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['SpaceX'] },
    ],
    events: [
      { date: '2020-12-01', type: 'founding', title: 'Varda Space Industries founded by Will Bruey and Delian Asparouhov', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 65 },
    ],
  },
  {
    name: 'Outpost Technologies',
    headquarters: 'Chandler, Arizona',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '11-50',
    website: 'https://www.outpost.space',
    description: 'Outpost Technologies develops reusable reentry capsules that enable on-demand return of cargo and manufactured goods from orbit.',
    ceo: 'Jason Dunn',
    sector: 'in-space-services',
    tags: ['reentry', 'cargo-return', 'in-space-manufacturing'],
    tier: 3,
    totalFunding: 12000000,
    ownershipType: 'private',
    products: [
      { name: 'Outpost Re-entry Capsule', category: 'spacecraft', description: 'Small reusable capsule for returning payloads from space to Earth.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jason Dunn', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['Made In Space'] },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Outpost Technologies founded by Jason Dunn', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 45 },
    ],
  },
  {
    name: 'SpinLaunch',
    headquarters: 'Long Beach, California',
    country: 'US',
    foundedYear: 2014,
    employeeRange: '51-200',
    website: 'https://www.spinlaunch.com',
    description: 'SpinLaunch is developing a kinetic launch system that uses ground-based centrifugal acceleration to propel payloads to orbit at dramatically lower cost.',
    ceo: 'Jonathan Yaney',
    sector: 'launch',
    tags: ['launch-provider', 'kinetic-launch', 'alternative-launch'],
    tier: 3,
    totalFunding: 150000000,
    ownershipType: 'private',
    products: [
      { name: 'Orbital Accelerator', category: 'launch_system', description: 'Ground-based kinetic launch system using centrifugal force for orbital payload delivery.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jonathan Yaney', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'SpinLaunch founded by Jonathan Yaney', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },
  {
    name: 'Exolaunch',
    headquarters: 'Berlin, Germany',
    country: 'DE',
    foundedYear: 2015,
    employeeRange: '51-200',
    website: 'https://www.exolaunch.com',
    description: 'Exolaunch provides rideshare launch services, deployment systems, and in-orbit transportation for small satellites.',
    ceo: 'Jeanne Medvedeva',
    sector: 'launch-services',
    tags: ['rideshare', 'deployment-systems', 'small-sat', 'launch-services'],
    tier: 3,
    totalFunding: 45000000,
    ownershipType: 'private',
    products: [
      { name: 'CarboNIX', category: 'deployment_system', description: 'Shock-free satellite separation system for rideshare missions.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Jeanne Medvedeva', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2015-01-01', type: 'founding', title: 'Exolaunch founded in Berlin', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
    ],
  },
  {
    name: 'Epsilon3',
    headquarters: 'Los Angeles, California',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '11-50',
    website: 'https://www.epsilon3.io',
    description: 'Epsilon3 provides an operating system for spacecraft and launch vehicle operations, digitizing test and launch procedures.',
    ceo: 'Laura Crabtree',
    sector: 'software',
    tags: ['operations-software', 'mission-ops', 'saas', 'digital-procedures'],
    tier: 3,
    totalFunding: 39000000,
    ownershipType: 'private',
    products: [
      { name: 'Epsilon3 Platform', category: 'software', description: 'Cloud-based operating system for managing complex test and launch procedures.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Laura Crabtree', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['SpaceX', 'Northrop Grumman'] },
    ],
    events: [
      { date: '2021-01-01', type: 'founding', title: 'Epsilon3 founded by Laura Crabtree and Aaron Sullivan', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },
  {
    name: 'Cognitive Space',
    headquarters: 'Houston, Texas',
    country: 'US',
    foundedYear: 2018,
    employeeRange: '11-50',
    website: 'https://www.cognitivespace.com',
    description: 'Cognitive Space uses AI to autonomously optimize satellite constellation operations, tasking, and scheduling.',
    ceo: 'Guy de Carufel',
    sector: 'software',
    tags: ['ai', 'satellite-operations', 'autonomous', 'constellation-management'],
    tier: 3,
    totalFunding: 14000000,
    ownershipType: 'private',
    products: [
      { name: 'CNTIENT', category: 'software', description: 'AI-powered satellite constellation management and autonomous tasking platform.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Guy de Carufel', title: 'CEO', role: 'executive' },
    ],
    events: [
      { date: '2018-01-01', type: 'founding', title: 'Cognitive Space founded in Houston', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 48 },
    ],
  },
  {
    name: 'Pixxel',
    headquarters: 'Bengaluru, Karnataka',
    country: 'IN',
    foundedYear: 2019,
    employeeRange: '51-200',
    website: 'https://www.pixxel.space',
    description: 'Pixxel is building a constellation of hyperspectral imaging satellites to provide health-of-the-planet data at an unprecedented level of detail.',
    ceo: 'Awais Ahmed',
    sector: 'earth-observation',
    tags: ['hyperspectral', 'earth-observation', 'remote-sensing', 'india'],
    tier: 3,
    totalFunding: 71000000,
    ownershipType: 'private',
    products: [
      { name: 'Firefly Constellation', category: 'satellite_constellation', description: 'Hyperspectral earth imaging satellite constellation with 5m resolution across 150+ bands.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Awais Ahmed', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2019-01-01', type: 'founding', title: 'Pixxel founded in Bengaluru, India', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
    ],
  },
  {
    name: 'Skyroot Aerospace',
    headquarters: 'Hyderabad, Telangana',
    country: 'IN',
    foundedYear: 2018,
    employeeRange: '201-500',
    website: 'https://www.skyroot.in',
    description: 'Skyroot Aerospace is India\'s first private launch vehicle company, developing a family of small satellite launch vehicles.',
    ceo: 'Pawan Kumar Chandana',
    sector: 'launch',
    tags: ['launch-provider', 'small-sat', 'india', 'private-launch'],
    tier: 3,
    totalFunding: 100000000,
    ownershipType: 'private',
    products: [
      { name: 'Vikram-1', category: 'launch_vehicle', description: 'Small satellite launch vehicle with all-carbon-fiber structure and 3D-printed engines.', status: 'development', specs: { payload_leo_kg: 480 } },
    ],
    keyPersonnel: [
      { name: 'Pawan Kumar Chandana', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['ISRO'] },
    ],
    events: [
      { date: '2018-06-01', type: 'founding', title: 'Skyroot Aerospace founded in Hyderabad, India', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
    ],
  },
  {
    name: 'Agnikul Cosmos',
    headquarters: 'Chennai, Tamil Nadu',
    country: 'IN',
    foundedYear: 2017,
    employeeRange: '101-200',
    website: 'https://www.agnikul.in',
    description: 'Agnikul Cosmos is developing a small-lift launch vehicle with a single-piece 3D-printed semi-cryogenic rocket engine.',
    ceo: 'Srinath Ravichandran',
    sector: 'launch',
    tags: ['launch-provider', 'small-sat', 'india', '3d-printed-engine'],
    tier: 3,
    totalFunding: 50000000,
    ownershipType: 'private',
    products: [
      { name: 'Agnibaan', category: 'launch_vehicle', description: 'Small satellite launch vehicle featuring the world\'s first single-piece 3D-printed semi-cryogenic engine.', status: 'development', specs: { payload_leo_kg: 300 } },
    ],
    keyPersonnel: [
      { name: 'Srinath Ravichandran', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Agnikul Cosmos founded in Chennai, India', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 52 },
    ],
  },
  {
    name: 'GalaxEye',
    headquarters: 'Chennai, Tamil Nadu',
    country: 'IN',
    foundedYear: 2020,
    employeeRange: '11-50',
    website: 'https://www.galaxeye.space',
    description: 'GalaxEye is developing multi-sensor satellite payloads that fuse SAR and optical imaging for all-weather, day-and-night earth observation.',
    ceo: 'Suyash Singh',
    sector: 'earth-observation',
    tags: ['sar', 'earth-observation', 'multi-sensor', 'india'],
    tier: 3,
    totalFunding: 7000000,
    ownershipType: 'private',
    products: [
      { name: 'Drishti Mission', category: 'satellite', description: 'Multi-sensor satellite combining SAR and optical imaging for all-weather earth observation.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Suyash Singh', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'GalaxEye founded in Chennai, India', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 43 },
    ],
  },
  {
    name: 'Gilmour Space',
    headquarters: 'Gold Coast, Queensland',
    country: 'AU',
    foundedYear: 2012,
    employeeRange: '101-200',
    website: 'https://www.gilmourspace.com',
    description: 'Gilmour Space Technologies is an Australian launch company developing hybrid-propulsion rockets for small satellite delivery to orbit.',
    ceo: 'Adam Gilmour',
    sector: 'launch',
    tags: ['launch-provider', 'small-sat', 'australia', 'hybrid-propulsion'],
    tier: 3,
    totalFunding: 87000000,
    ownershipType: 'private',
    products: [
      { name: 'Eris', category: 'launch_vehicle', description: 'Three-stage hybrid-propulsion launch vehicle for small satellite delivery to LEO and SSO.', status: 'development', specs: { payload_leo_kg: 305 } },
    ],
    keyPersonnel: [
      { name: 'Adam Gilmour', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2012-01-01', type: 'founding', title: 'Gilmour Space Technologies founded on the Gold Coast, Australia', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },
  {
    name: 'Spaceflight Inc',
    headquarters: 'Seattle, Washington',
    country: 'US',
    foundedYear: 2011,
    employeeRange: '51-200',
    website: 'https://www.spaceflight.com',
    description: 'Spaceflight Inc is a leading rideshare and launch services provider that has arranged missions for hundreds of small satellites across multiple launch vehicles.',
    ceo: 'Curt Blake',
    sector: 'launch-services',
    tags: ['rideshare', 'launch-services', 'mission-management', 'small-sat'],
    tier: 3,
    totalFunding: 53000000,
    ownershipType: 'private',
    products: [
      { name: 'Sherpa OTV', category: 'orbital_transfer_vehicle', description: 'In-space transport vehicle for last-mile satellite delivery on rideshare missions.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Curt Blake', title: 'President & CEO', role: 'executive' },
    ],
    events: [
      { date: '2011-01-01', type: 'founding', title: 'Spaceflight Inc founded in Seattle', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 56 },
    ],
  },
  {
    name: 'NanoAvionics',
    headquarters: 'Vilnius',
    country: 'LT',
    foundedYear: 2014,
    employeeRange: '101-200',
    website: 'https://nanoavionics.com',
    description: 'NanoAvionics is a Lithuanian small satellite mission integrator and bus manufacturer specializing in nanosatellite and microsatellite platforms.',
    ceo: 'Vytenis Buzas',
    sector: 'satellite-manufacturing',
    tags: ['nanosatellite', 'satellite-bus', 'mission-integrator', 'europe'],
    tier: 3,
    totalFunding: 15000000,
    ownershipType: 'private',
    products: [
      { name: 'M6P Satellite Bus', category: 'satellite_bus', description: 'Preconfigured 6U nanosatellite bus for rapid mission deployment.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Vytenis Buzas', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'NanoAvionics founded in Vilnius, Lithuania', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 54 },
    ],
  },
  {
    name: 'EnduroSat',
    headquarters: 'Sofia',
    country: 'BG',
    foundedYear: 2015,
    employeeRange: '51-200',
    website: 'https://www.endurosat.com',
    description: 'EnduroSat provides shared satellite services and nanosatellite platforms, enabling companies to deploy space missions without building their own satellites.',
    ceo: 'Raycho Raychev',
    sector: 'satellite-manufacturing',
    tags: ['nanosatellite', 'shared-satellite', 'satellite-as-a-service', 'europe'],
    tier: 3,
    totalFunding: 26000000,
    ownershipType: 'private',
    products: [
      { name: 'Shared Satellite Service', category: 'satellite_service', description: 'Hosted payload and shared satellite platform for space-as-a-service missions.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Raycho Raychev', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2015-01-01', type: 'founding', title: 'EnduroSat founded in Sofia, Bulgaria', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 52 },
    ],
  },
  {
    name: 'AAC Clyde Space',
    ticker: 'AAC.ST',
    exchange: 'Nasdaq First North',
    headquarters: 'Uppsala, Sweden / Glasgow, UK',
    country: 'SE',
    foundedYear: 2014,
    employeeRange: '101-200',
    website: 'https://www.aac-clyde.space',
    description: 'AAC Clyde Space is a publicly listed nanosatellite and microsatellite manufacturer providing end-to-end satellite missions and space data services.',
    ceo: 'Luis Gomes',
    isPublic: true,
    sector: 'satellite-manufacturing',
    tags: ['nanosatellite', 'microsatellite', 'space-data', 'europe', 'public'],
    tier: 3,
    ownershipType: 'public',
    products: [
      { name: 'EPIC Satellite Platform', category: 'satellite_bus', description: 'Modular nanosatellite and microsatellite platform series from 3U to 16U.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Luis Gomes', title: 'CEO', role: 'executive' },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'AAC Clyde Space formed through merger of AAC Microtec and Clyde Space', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 53 },
    ],
  },
  {
    name: 'PLD Space',
    headquarters: 'Elche, Alicante',
    country: 'ES',
    foundedYear: 2011,
    employeeRange: '101-200',
    website: 'https://www.pldspace.com',
    description: 'PLD Space is a Spanish launch company developing reusable launch vehicles for small satellite and suborbital missions.',
    ceo: 'Raul Torres',
    sector: 'launch',
    tags: ['launch-provider', 'reusable-rockets', 'europe', 'small-sat'],
    tier: 3,
    totalFunding: 75000000,
    ownershipType: 'private',
    products: [
      { name: 'MIURA 5', category: 'launch_vehicle', description: 'Small satellite orbital launch vehicle, first European private reusable rocket.', status: 'development', specs: { payload_leo_kg: 450 } },
    ],
    keyPersonnel: [
      { name: 'Raul Torres', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2011-01-01', type: 'founding', title: 'PLD Space founded in Elche, Spain', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },
  {
    name: 'Turion Space',
    headquarters: 'Irvine, California',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '11-50',
    website: 'https://www.turionspace.com',
    description: 'Turion Space is developing spacecraft for in-orbit servicing, debris removal, and space domain awareness missions.',
    ceo: 'Ryan Westerdahl',
    sector: 'in-space-services',
    tags: ['orbital-servicing', 'debris-removal', 'space-domain-awareness'],
    tier: 3,
    totalFunding: 30000000,
    ownershipType: 'private',
    products: [
      { name: 'DROID', category: 'spacecraft', description: 'Autonomous spacecraft for proximity operations, inspection, and debris capture.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Ryan Westerdahl', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Turion Space founded in Irvine, California', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 48 },
    ],
  },
  {
    name: 'K2 Space',
    headquarters: 'Los Angeles, California',
    country: 'US',
    foundedYear: 2022,
    employeeRange: '11-50',
    website: 'https://www.k2space.com',
    description: 'K2 Space is developing large, high-power satellite platforms optimized for the Starship era of affordable heavy-lift launch.',
    ceo: 'Karan Kunjur',
    sector: 'satellite-manufacturing',
    tags: ['large-satellites', 'satellite-bus', 'high-power', 'starship-era'],
    tier: 3,
    totalFunding: 50000000,
    ownershipType: 'private',
    products: [
      { name: 'K2 Satellite Platform', category: 'satellite_bus', description: 'Large-format, high-power satellite bus designed for Starship-class launch vehicles.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Karan Kunjur', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['Astranis'] },
    ],
    events: [
      { date: '2022-01-01', type: 'founding', title: 'K2 Space founded in Los Angeles', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 47 },
    ],
  },
  {
    name: 'Inversion Space',
    headquarters: 'Torrance, California',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '11-50',
    website: 'https://www.inversionspace.com',
    description: 'Inversion Space is developing reentry capsules for rapid point-to-point delivery of cargo from orbit to anywhere on Earth.',
    ceo: 'Justin Fiaschetti',
    sector: 'in-space-services',
    tags: ['reentry', 'cargo-delivery', 'point-to-point', 'logistics'],
    tier: 3,
    totalFunding: 44000000,
    ownershipType: 'private',
    products: [
      { name: 'Arc Reentry Vehicle', category: 'spacecraft', description: 'Orbital reentry capsule for rapid global cargo delivery from space.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Justin Fiaschetti', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2021-01-01', type: 'founding', title: 'Inversion Space founded in Torrance, California', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },
  {
    name: 'Hadrian',
    headquarters: 'Torrance, California',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '201-500',
    website: 'https://www.hadrian.co',
    description: 'Hadrian is building autonomous precision manufacturing factories to accelerate production of aerospace and defense components.',
    ceo: 'Chris Power',
    sector: 'manufacturing',
    tags: ['precision-manufacturing', 'autonomous-factory', 'aerospace-supply-chain', 'defense'],
    tier: 3,
    totalFunding: 216000000,
    ownershipType: 'private',
    products: [
      { name: 'Hadrian Autonomous Factory', category: 'manufacturing', description: 'AI-driven autonomous precision machining facility for aerospace and defense parts.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Chris Power', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Hadrian founded to modernize aerospace manufacturing', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 68 },
    ],
  },
  {
    name: 'Ursa Major',
    headquarters: 'Berthoud, Colorado',
    country: 'US',
    foundedYear: 2015,
    employeeRange: '201-500',
    website: 'https://www.ursamajor.com',
    description: 'Ursa Major designs and manufactures modular rocket propulsion systems to serve as an independent U.S. engine supplier for the space industry.',
    ceo: 'Joe Laurienti',
    sector: 'propulsion',
    tags: ['rocket-engines', 'propulsion', 'manufacturing', 'defense'],
    tier: 3,
    totalFunding: 250000000,
    ownershipType: 'private',
    products: [
      { name: 'Hadley', category: 'rocket_engine', description: 'Liquid oxygen/kerosene engine producing 5,000 lbf of thrust, designed for modularity.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Joe Laurienti', title: 'Founder & CEO', role: 'founder', previousCompanies: ['Blue Origin'] },
    ],
    events: [
      { date: '2015-01-01', type: 'founding', title: 'Ursa Major founded in Berthoud, Colorado', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 65 },
    ],
  },
  {
    name: 'X-Bow Systems',
    headquarters: 'Albuquerque, New Mexico',
    country: 'US',
    foundedYear: 2016,
    employeeRange: '51-200',
    website: 'https://www.xbowsystems.com',
    description: 'X-Bow Systems develops additively manufactured solid rocket motors and launch vehicles for responsive national security space access.',
    ceo: 'Jason Hundley',
    sector: 'launch',
    tags: ['solid-rocket-motors', 'additive-manufacturing', 'national-security', 'responsive-launch'],
    tier: 3,
    totalFunding: 82000000,
    ownershipType: 'private',
    products: [
      { name: 'Bolt', category: 'launch_vehicle', description: 'Small responsive launch vehicle using 3D-printed solid rocket motors for rapid national security missions.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jason Hundley', title: 'CEO', role: 'executive', previousCompanies: ['Raytheon'] },
    ],
    events: [
      { date: '2016-01-01', type: 'founding', title: 'X-Bow Systems founded in Albuquerque, New Mexico', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },
  {
    name: 'Starfish Space',
    headquarters: 'Kent, Washington',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '11-50',
    website: 'https://www.starfishspace.com',
    description: 'Starfish Space develops satellite servicing vehicles using autonomous rendezvous and proximity operations for life extension and debris capture.',
    ceo: 'Austin Link',
    sector: 'in-space-services',
    tags: ['satellite-servicing', 'rpso', 'life-extension', 'autonomous'],
    tier: 3,
    totalFunding: 21000000,
    ownershipType: 'private',
    products: [
      { name: 'Otter', category: 'spacecraft', description: 'Satellite servicing vehicle capable of autonomous docking for orbit adjustment and life extension.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Austin Link', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['Blue Origin'] },
    ],
    events: [
      { date: '2019-01-01', type: 'founding', title: 'Starfish Space founded in Kent, Washington', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 47 },
    ],
  },
  {
    name: 'ThinkOrbital',
    headquarters: 'Broomfield, Colorado',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '11-50',
    website: 'https://www.thinkorbital.com',
    description: 'ThinkOrbital is developing large orbital platforms constructed from recycled rocket stages and space debris for in-space infrastructure.',
    ceo: 'Lee Rosen',
    sector: 'in-space-services',
    tags: ['orbital-platforms', 'space-infrastructure', 'debris-recycling', 'in-space-construction'],
    tier: 3,
    totalFunding: 8000000,
    ownershipType: 'private',
    products: [
      { name: 'ThinkPlatform', category: 'space_station', description: 'Modular orbital platform using automated welding for large-scale in-space construction.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Lee Rosen', title: 'Founder & CEO', role: 'founder', previousCompanies: ['United Launch Alliance'] },
    ],
    events: [
      { date: '2021-01-01', type: 'founding', title: 'ThinkOrbital founded in Broomfield, Colorado', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 40 },
    ],
  },
  {
    name: 'Rogue Space Systems',
    headquarters: 'Laconia, New Hampshire',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '11-50',
    website: 'https://www.intospace.com',
    description: 'Rogue Space Systems builds orbital robots and service vehicles for in-space inspection, debris management, and logistics.',
    ceo: 'Jeromy Grimmett',
    sector: 'in-space-services',
    tags: ['orbital-robotics', 'debris-removal', 'in-space-servicing', 'space-logistics'],
    tier: 3,
    totalFunding: 4500000,
    ownershipType: 'private',
    products: [
      { name: 'Barry-1', category: 'spacecraft', description: 'Orbital service vehicle for inspection, proximity operations, and debris characterization.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jeromy Grimmett', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Rogue Space Systems founded in Laconia, New Hampshire', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 42 },
    ],
  },
  {
    name: 'Space Perspective',
    headquarters: 'Titusville, Florida',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '51-200',
    website: 'https://www.spaceperspective.com',
    description: 'Space Perspective offers luxury stratospheric balloon flights to the edge of space, providing a gentle six-hour journey to 100,000 feet.',
    ceo: 'Jane Poynter',
    sector: 'space-tourism',
    tags: ['space-tourism', 'stratospheric-balloon', 'near-space', 'luxury-experience'],
    tier: 3,
    totalFunding: 80000000,
    ownershipType: 'private',
    products: [
      { name: 'Spaceship Neptune', category: 'spacecraft', description: 'Pressurized capsule lifted by a SpaceBalloon to 100,000 feet for luxury near-space experiences.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jane Poynter', title: 'Co-Founder & Co-CEO', role: 'founder', previousCompanies: ['World View', 'Paragon Space Development'] },
    ],
    events: [
      { date: '2019-01-01', type: 'founding', title: 'Space Perspective founded by Jane Poynter and Taber MacCallum', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
    ],
  },
  {
    name: 'Isar Aerospace',
    headquarters: 'Ottobrunn, Bavaria',
    country: 'DE',
    foundedYear: 2018,
    employeeRange: '201-500',
    website: 'https://www.isaraerospace.com',
    description: 'Isar Aerospace is a German launch company developing the Spectrum rocket to provide dedicated and rideshare launch services for small and medium satellites.',
    ceo: 'Daniel Metzler',
    sector: 'launch',
    tags: ['launch-provider', 'europe', 'small-sat', 'medium-lift'],
    tier: 3,
    totalFunding: 310000000,
    ownershipType: 'private',
    products: [
      { name: 'Spectrum', category: 'launch_vehicle', description: 'Two-stage orbital launch vehicle for small and medium satellite payloads up to 1,000 kg to SSO.', status: 'development', specs: { payload_leo_kg: 1300, payload_sso_kg: 1000 } },
    ],
    keyPersonnel: [
      { name: 'Daniel Metzler', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2018-01-01', type: 'founding', title: 'Isar Aerospace founded in Ottobrunn, Germany', importance: 6 },
    ],
    scores: [
      { scoreType: 'overall', score: 63 },
    ],
  },
  {
    name: 'Terran Orbital',
    headquarters: 'Boca Raton, Florida',
    country: 'US',
    foundedYear: 2013,
    employeeRange: '201-500',
    website: 'https://www.terranorbital.com',
    description: 'Terran Orbital is a small satellite manufacturer and mission solutions provider, acquired by Lockheed Martin to bolster its space capabilities.',
    ceo: 'Marc Bell',
    sector: 'satellite-manufacturing',
    tags: ['small-sat', 'satellite-manufacturing', 'defense', 'earth-observation'],
    tier: 3,
    totalFunding: 300000000,
    ownershipType: 'subsidiary',
    parentCompany: 'Lockheed Martin',
    products: [
      { name: 'TRESTLES Platform', category: 'satellite_bus', description: 'Modular small satellite platform supporting missions from 6U CubeSats to ESPA-class microsatellites.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Marc Bell', title: 'Co-Founder & Chairman', role: 'founder' },
    ],
    events: [
      { date: '2013-01-01', type: 'founding', title: 'Terran Orbital founded in Boca Raton, Florida', importance: 5 },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
    ],
  },
];

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
