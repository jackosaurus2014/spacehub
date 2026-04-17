/**
 * Seed script: New Space Companies (April 2026)
 *
 * Adds 20 new company profiles and updates tier levels for 4 existing
 * companies that have had major milestones since the original seed.
 *
 * Safe to re-run: uses upsert by slug for new companies and updateMany
 * for tier upgrades.
 *
 * Usage:
 *   npx tsx scripts/seed-new-companies-2026.ts
 */

import { PrismaClient } from '@prisma/client';
import { calculateCompleteness } from '../src/lib/company-completeness';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────────
// Types (mirrors seed-company-profiles.ts)
// ────────────────────────────────────────────────────────────────

interface CompanyData {
  name: string;
  legalName?: string;
  slug: string;
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
  scores?: Array<{
    scoreType: string;
    score: number;
  }>;
}

interface TierUpgrade {
  slug: string;
  name: string;
  tier: number;
  description: string;
  totalFunding?: number;
  valuation?: number;
  isPublic?: boolean;
  ticker?: string;
  exchange?: string;
  marketCap?: number;
  employeeRange?: string;
  lastFundingRound?: string;
  lastFundingDate?: string;
}

// ────────────────────────────────────────────────────────────────
// NEW COMPANIES (20)
// ────────────────────────────────────────────────────────────────

const NEW_COMPANIES: CompanyData[] = [
  // ── TIER 1 ──────────────────────────────────────────────────
  {
    name: 'Anduril Industries',
    legalName: 'Anduril Industries, Inc.',
    slug: 'anduril',
    headquarters: 'Costa Mesa, California',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '1001-5000',
    employeeCount: 4000,
    website: 'https://www.anduril.com',
    description: 'AI-first defense technology. Golden Dome missile shield prime contractor. Acquired ExoAnalytic Solutions March 2026. $60B valuation.',
    longDescription: 'Anduril Industries builds AI-powered defense systems including autonomous drones, surveillance towers, and counter-UAS platforms. The company was selected as a prime contractor for the Golden Dome missile defense shield program. In March 2026, Anduril acquired ExoAnalytic Solutions, gaining a global network of optical telescopes for space domain awareness. With a $60B valuation, Anduril is one of the highest-valued defense technology companies in history.',
    ceo: 'Brian Schimpf',
    isPublic: false,
    status: 'active',
    sector: 'defense',
    subsector: 'ai-defense',
    tags: ['defense', 'ai', 'autonomous-systems', 'missile-defense', 'space-domain-awareness', 'counter-uas'],
    tier: 1,
    totalFunding: 4000000000,
    valuation: 60000000000,
    lastFundingRound: 'Series F',
    lastFundingDate: '2024-08-01',
    ownershipType: 'private',
    products: [
      { name: 'Lattice', category: 'software_platform', description: 'AI-powered command and control platform for multi-domain operations.', status: 'active' },
      { name: 'Ghost', category: 'drone', description: 'Autonomous drone system for ISR and strike missions.', status: 'active' },
      { name: 'Sentry Tower', category: 'surveillance', description: 'Autonomous surveillance tower with AI-based detection.', status: 'active' },
      { name: 'Anvil', category: 'counter_uas', description: 'Autonomous interceptor for counter-UAS operations.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Brian Schimpf', title: 'CEO', role: 'founder', bio: 'Co-founded Anduril after serving as Engineering Director at Palantir.', previousCompanies: ['Palantir Technologies'] },
      { name: 'Palmer Luckey', title: 'Founder', role: 'founder', bio: 'Founder of Oculus VR and Anduril Industries.', previousCompanies: ['Oculus VR', 'Meta'] },
      { name: 'Trae Stephens', title: 'Executive Chairman', role: 'founder', previousCompanies: ['Palantir Technologies', 'Founders Fund'] },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Anduril Industries founded by Palmer Luckey and team', importance: 8 },
      { date: '2026-03-01', type: 'acquisition', title: 'Acquired ExoAnalytic Solutions for space domain awareness', importance: 8 },
      { date: '2025-01-01', type: 'contract', title: 'Selected as Golden Dome missile shield prime contractor', importance: 9 },
    ],
    facilities: [
      { name: 'Anduril HQ', type: 'headquarters', city: 'Costa Mesa', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 82 }],
  },

  // ── TIER 2 ──────────────────────────────────────────────────
  {
    name: 'Skylo Technologies',
    slug: 'skylo',
    headquarters: 'Mountain View, California',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 200,
    website: 'https://www.skylo.tech',
    description: 'Standards-based NTN satellite connectivity for phones, wearables, and IoT devices. 8M+ activated devices on its network.',
    longDescription: 'Skylo Technologies provides non-terrestrial network (NTN) satellite connectivity using 3GPP standards, enabling existing smartphones, wearables, and IoT devices to connect via satellite without hardware modifications. The company has activated over 8 million devices on its network and partners with major mobile operators worldwide.',
    ceo: 'Parthsarathi Trivedi',
    sector: 'satellite',
    subsector: 'ntn-connectivity',
    tags: ['satellite-connectivity', 'ntn', 'iot', 'direct-to-device', '3gpp', 'mobile'],
    tier: 2,
    ownershipType: 'private',
    products: [
      { name: 'Skylo NTN Platform', category: 'connectivity_platform', description: 'Standards-based NTN satellite connectivity platform for phones, wearables, and IoT.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Parthsarathi Trivedi', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Skylo Technologies founded in Mountain View, California', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 68 }],
  },
  {
    name: 'ClearSpace SA',
    slug: 'clearspace',
    headquarters: 'Renens, Switzerland',
    country: 'CH',
    foundedYear: 2018,
    employeeRange: '51-200',
    employeeCount: 150,
    website: 'https://clearspace.today',
    description: 'Active debris removal company with ESA EUR86M contract for world\'s first debris removal mission ClearSpace-1.',
    longDescription: 'ClearSpace SA is a Swiss company developing debris removal and in-orbit servicing solutions. Selected by the European Space Agency (ESA) for the ClearSpace-1 mission, a EUR86M contract to remove the Vespa upper stage from orbit, making it the world\'s first active debris removal mission. The company uses capture-based approaches with robotic arms.',
    ceo: 'Luc Piguet',
    sector: 'satellite',
    subsector: 'debris-removal',
    tags: ['debris-removal', 'in-orbit-servicing', 'esa', 'space-sustainability', 'robotics'],
    tier: 2,
    ownershipType: 'private',
    products: [
      { name: 'ClearSpace-1', category: 'spacecraft', description: 'World\'s first active debris removal mission, contracted by ESA to remove the Vespa upper stage.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Luc Piguet', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['EPFL Space Center'] },
    ],
    events: [
      { date: '2018-01-01', type: 'founding', title: 'ClearSpace SA founded in Renens, Switzerland', importance: 6 },
      { date: '2020-12-01', type: 'contract', title: 'ESA awards EUR86M ClearSpace-1 debris removal contract', importance: 9 },
    ],
    contracts: [
      { agency: 'ESA', title: 'ClearSpace-1 Active Debris Removal', description: 'World\'s first active debris removal mission to capture the Vespa upper stage.', value: 95000000 },
    ],
    scores: [{ scoreType: 'overall', score: 72 }],
  },
  {
    name: 'LeoLabs',
    slug: 'leolabs',
    headquarters: 'Menlo Park, California',
    country: 'US',
    foundedYear: 2016,
    employeeRange: '51-200',
    employeeCount: 150,
    website: 'https://www.leolabs.space',
    description: 'Ground-based phased array radar network tracking 25,000+ LEO objects. $60M+ contracts in 2025.',
    longDescription: 'LeoLabs operates a global network of ground-based phased array radars to track objects in low Earth orbit. The company provides space situational awareness data, conjunction assessment, and collision avoidance services to satellite operators, governments, and space agencies. LeoLabs tracks over 25,000 objects in LEO and secured over $60M in contracts in 2025.',
    ceo: 'Dan Ceperley',
    sector: 'analytics',
    subsector: 'space-domain-awareness',
    tags: ['space-situational-awareness', 'radar', 'tracking', 'conjunction-assessment', 'sda'],
    tier: 2,
    totalFunding: 100000000,
    ownershipType: 'private',
    products: [
      { name: 'LeoLabs Radar Network', category: 'ground_infrastructure', description: 'Global phased array radar network for LEO object tracking.', status: 'active' },
      { name: 'LeoTrack', category: 'software_platform', description: 'Space domain awareness platform for conjunction assessment and collision avoidance.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Dan Ceperley', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['SRI International'] },
    ],
    events: [
      { date: '2016-01-01', type: 'founding', title: 'LeoLabs founded to commercialize SRI International radar technology', importance: 6 },
    ],
    scores: [{ scoreType: 'overall', score: 70 }],
  },
  {
    name: 'Slingshot Aerospace',
    slug: 'slingshot-aerospace',
    headquarters: 'Austin, Texas',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 200,
    website: 'https://www.slingshotaerospace.com',
    description: 'Space domain awareness platform. TraCSS UX design contract. Fast Company Most Innovative 2026.',
    longDescription: 'Slingshot Aerospace develops AI-powered space domain awareness and simulation tools. The company won the user experience design contract for the U.S. Space Force\'s Traffic Coordination System for Space (TraCSS). Recognized by Fast Company as one of the Most Innovative Companies of 2026.',
    ceo: 'Melanie Stricklan',
    sector: 'analytics',
    subsector: 'space-domain-awareness',
    tags: ['space-domain-awareness', 'simulation', 'ai', 'space-force', 'tracss'],
    tier: 2,
    ownershipType: 'private',
    products: [
      { name: 'Slingshot Beacon', category: 'software_platform', description: 'Space domain awareness and visualization platform.', status: 'active' },
      { name: 'Slingshot Laboratory', category: 'simulation', description: 'Digital twin simulation environment for space operations training.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Melanie Stricklan', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['U.S. Air Force'] },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Slingshot Aerospace founded in Austin, Texas', importance: 5 },
      { date: '2025-01-01', type: 'contract', title: 'Won TraCSS UX design contract from U.S. Space Force', importance: 8 },
    ],
    scores: [{ scoreType: 'overall', score: 69 }],
  },
  {
    name: 'Starlab Space',
    legalName: 'Starlab Space LLC',
    slug: 'starlab-space',
    headquarters: 'Houston, Texas',
    country: 'US',
    foundedYear: 2023,
    employeeRange: '201-500',
    employeeCount: 300,
    website: 'https://www.starlabspace.com',
    description: 'Voyager/Airbus JV building commercial LEO space station. NASA CLD program. Critical Design Review completed Feb 2026.',
    longDescription: 'Starlab Space is a joint venture between Voyager Space and Airbus to develop and operate a commercial low Earth orbit space station. Selected as one of NASA\'s Commercial LEO Destinations (CLD) program partners, Starlab completed its Critical Design Review in February 2026, marking a major development milestone toward replacing ISS capabilities.',
    sector: 'infrastructure',
    subsector: 'commercial-leo',
    tags: ['space-station', 'commercial-leo', 'nasa-cld', 'airbus', 'voyager-space'],
    tier: 2,
    ownershipType: 'joint-venture',
    parentCompany: 'Voyager Space / Airbus',
    products: [
      { name: 'Starlab Station', category: 'space_station', description: 'Commercial LEO space station with laboratory, habitation, and docking capabilities.', status: 'development' },
    ],
    events: [
      { date: '2023-01-01', type: 'founding', title: 'Starlab Space JV formed by Voyager Space and Airbus', importance: 8 },
      { date: '2026-02-01', type: 'milestone', title: 'Starlab Critical Design Review completed', importance: 8 },
    ],
    contracts: [
      { agency: 'NASA', title: 'Commercial LEO Destinations (CLD)', description: 'NASA CLD program partner for post-ISS commercial space station development.' },
    ],
    scores: [{ scoreType: 'overall', score: 71 }],
  },
  {
    name: 'Pulsar Fusion',
    legalName: 'Pulsar Fusion Ltd.',
    slug: 'pulsar-fusion',
    headquarters: 'Bletchley, United Kingdom',
    country: 'GB',
    foundedYear: 2011,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.pulsarfusion.com',
    description: 'Nuclear fusion propulsion. Achieved world\'s first fusion rocket plasma ignition March 2026. Sunbird system could reach Mars in under 6 months.',
    longDescription: 'Pulsar Fusion is developing nuclear fusion propulsion systems for in-space transportation. In March 2026, the company achieved the world\'s first fusion rocket plasma ignition, a historic milestone for interplanetary travel. The Sunbird propulsion system aims to dramatically reduce transit times, potentially reaching Mars in under 6 months.',
    ceo: 'Richard Dinan',
    sector: 'manufacturing',
    subsector: 'propulsion',
    tags: ['fusion-propulsion', 'nuclear', 'interplanetary', 'propulsion', 'deep-space'],
    tier: 2,
    ownershipType: 'private',
    products: [
      { name: 'Sunbird', category: 'propulsion_system', description: 'Nuclear fusion propulsion system for rapid interplanetary travel.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Richard Dinan', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2011-01-01', type: 'founding', title: 'Pulsar Fusion founded in Bletchley, UK', importance: 5 },
      { date: '2026-03-01', type: 'milestone', title: 'World\'s first fusion rocket plasma ignition achieved', importance: 10 },
    ],
    scores: [{ scoreType: 'overall', score: 70 }],
  },
  {
    name: 'Astrolab',
    slug: 'astrolab',
    headquarters: 'Hawthorne, California',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '51-200',
    employeeCount: 100,
    website: 'https://www.astrolab.space',
    description: 'FLEX lunar rover (2+ ton, carries 1600kg) for Starship delivery to Moon. FLIP rover on Astrobotic Griffin-1.',
    longDescription: 'Astrolab develops lunar rovers for cargo and crew transport on the Moon. The FLEX rover is a 2+ ton vehicle capable of carrying 1,600 kg of payload, designed for delivery to the lunar surface aboard SpaceX Starship. The smaller FLIP rover will fly on Astrobotic\'s Griffin-1 lander mission.',
    ceo: 'Jaret Matthews',
    sector: 'satellite',
    subsector: 'lunar-systems',
    tags: ['lunar-rover', 'moon', 'planetary-exploration', 'starship', 'astrobotic'],
    tier: 2,
    ownershipType: 'private',
    products: [
      { name: 'FLEX Rover', category: 'rover', description: 'Large lunar rover (2+ ton) carrying 1,600 kg payload, designed for Starship delivery.', status: 'development', specs: { mass_kg: 2000, payload_capacity_kg: 1600 } },
      { name: 'FLIP Rover', category: 'rover', description: 'Smaller lunar rover for early missions aboard Astrobotic Griffin-1 lander.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jaret Matthews', title: 'Founder & CEO', role: 'founder', previousCompanies: ['NASA JPL'] },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Astrolab founded in Hawthorne, California', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 65 }],
  },
  {
    name: 'Space42',
    slug: 'space42',
    headquarters: 'Abu Dhabi, UAE',
    country: 'AE',
    foundedYear: 2024,
    employeeRange: '1001-5000',
    employeeCount: 1500,
    website: 'https://www.space42.ai',
    description: 'UAE integrated space and AI company from Bayanat/Yahsat merger. Al Yah satellite fleet + AI geospatial analytics. ADX listed.',
    longDescription: 'Space42 is a UAE-based integrated space and AI company formed from the 2024 merger of Bayanat and Al Yah Satellite Communications (Yahsat). The company combines the Al Yah satellite fleet with advanced AI geospatial analytics capabilities. Listed on the Abu Dhabi Securities Exchange (ADX), Space42 serves government and commercial customers across the Middle East and globally.',
    isPublic: true,
    exchange: 'ADX',
    ticker: 'SPACE42',
    sector: 'satellite',
    subsector: 'integrated-space-ai',
    tags: ['satellite-operator', 'ai', 'geospatial', 'uae', 'earth-observation', 'satcom'],
    tier: 2,
    ownershipType: 'public',
    products: [
      { name: 'Al Yah Satellites', category: 'satellite_constellation', description: 'Satellite fleet providing broadband and secure communications across Middle East, Africa, and beyond.', status: 'active' },
      { name: 'Geospatial AI Platform', category: 'software_platform', description: 'AI-powered geospatial analytics for government and commercial applications.', status: 'active' },
    ],
    events: [
      { date: '2024-01-01', type: 'founding', title: 'Space42 formed from Bayanat/Yahsat merger', importance: 8 },
    ],
    scores: [{ scoreType: 'overall', score: 72 }],
  },
  {
    name: 'Loft Orbital',
    slug: 'loft-orbital',
    headquarters: 'San Francisco, California',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 150,
    website: 'https://www.loftorbital.com',
    description: 'Satellite infrastructure-as-a-service. Hosts customer payloads on shared satellites. $140M BlackRock-led round 2025.',
    longDescription: 'Loft Orbital provides satellite infrastructure-as-a-service, enabling customers to fly their payloads on shared satellite platforms. This approach dramatically reduces cost and time to orbit for customers. In 2025, the company raised $140M in a BlackRock-led funding round to scale operations.',
    ceo: 'Pierre-Damien Vaujour',
    sector: 'satellite',
    subsector: 'satellite-as-a-service',
    tags: ['satellite-as-a-service', 'shared-satellite', 'payload-hosting', 'space-infrastructure'],
    tier: 2,
    totalFunding: 237000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2025-01-01',
    ownershipType: 'private',
    products: [
      { name: 'YAM Satellite Platform', category: 'satellite_bus', description: 'Shared satellite platform hosting multiple customer payloads per mission.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Pierre-Damien Vaujour', title: 'Co-Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Loft Orbital founded in San Francisco', importance: 5 },
      { date: '2025-01-01', type: 'funding', title: '$140M Series C led by BlackRock', importance: 7 },
    ],
    scores: [{ scoreType: 'overall', score: 70 }],
  },

  // ── TIER 3 ──────────────────────────────────────────────────
  {
    name: 'COMSPOC',
    slug: 'comspoc',
    headquarters: 'Centennial, Colorado',
    country: 'US',
    foundedYear: 2017,
    employeeRange: '11-50',
    employeeCount: 60,
    website: 'https://comspoc.com',
    description: 'Commercial Space Operations Center providing conjunction assessment and space catalog services for TraCSS.',
    ceo: 'Paul Shortridge',
    sector: 'analytics',
    subsector: 'space-catalog',
    tags: ['space-situational-awareness', 'conjunction-assessment', 'tracss', 'space-catalog'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'COMSPOC Space Catalog', category: 'data_service', description: 'Comprehensive space object catalog with conjunction assessment for satellite operators.', status: 'active' },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'COMSPOC founded in Centennial, Colorado', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 48 }],
  },
  {
    name: 'Gravitics',
    slug: 'gravitics',
    headquarters: 'Seattle, Washington',
    country: 'US',
    foundedYear: 2022,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.gravitics.com',
    description: 'StarMax inflatable space habitat modules designed for Starship payload capacity. 100,000 sqft manufacturing facility.',
    longDescription: 'Gravitics designs and manufactures large-scale space habitat modules optimized for Starship\'s payload volume. The StarMax modules use inflatable technology to maximize livable space. The company operates a 100,000 sqft manufacturing facility in Seattle.',
    ceo: 'Colin Doughan',
    sector: 'infrastructure',
    subsector: 'space-habitats',
    tags: ['space-habitat', 'inflatable', 'starship', 'manufacturing', 'leo-station'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'StarMax', category: 'habitat_module', description: 'Inflatable space habitat modules designed for Starship payload capacity.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Colin Doughan', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2022-01-01', type: 'founding', title: 'Gravitics founded in Seattle, Washington', importance: 5 },
    ],
    facilities: [
      { name: 'Gravitics Manufacturing Facility', type: 'manufacturing', city: 'Seattle', state: 'WA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 50 }],
  },
  {
    name: 'Katalyst Space',
    slug: 'katalyst-space',
    headquarters: 'Houston, Texas',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '11-50',
    employeeCount: 60,
    website: 'https://www.katalystspace.com',
    description: 'In-space servicing via Quark satellite servicing vehicle. Acquired Atomos Space 2025.',
    ceo: 'Jed Taylor',
    sector: 'satellite',
    subsector: 'in-space-servicing',
    tags: ['in-space-servicing', 'satellite-servicing', 'orbital-transfer', 'rpso'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'Quark', category: 'spacecraft', description: 'Satellite servicing vehicle for inspection, refueling, and orbit modification.', status: 'development' },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Katalyst Space founded in Houston, Texas', importance: 5 },
      { date: '2025-01-01', type: 'acquisition', title: 'Acquired Atomos Space to expand in-space servicing capabilities', importance: 7 },
    ],
    scores: [{ scoreType: 'overall', score: 48 }],
  },
  {
    name: 'Innospace',
    slug: 'innospace',
    headquarters: 'Daejeon, South Korea',
    country: 'KR',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 120,
    website: 'https://www.innospace.kr',
    description: 'South Korea\'s first private orbital launch provider. HANBIT-Nano hybrid-propulsion rocket.',
    longDescription: 'Innospace is South Korea\'s first private orbital launch company, developing the HANBIT-Nano rocket with hybrid propulsion technology. The company aims to provide dedicated small satellite launch services from Korean and international launch sites.',
    ceo: 'Kim Soo-jong',
    sector: 'launch',
    subsector: 'small-sat-launch',
    tags: ['launch-provider', 'south-korea', 'small-sat', 'hybrid-propulsion'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'HANBIT-Nano', category: 'launch_vehicle', description: 'Hybrid-propulsion small satellite launch vehicle.', status: 'development' },
    ],
    events: [
      { date: '2017-01-01', type: 'founding', title: 'Innospace founded in Daejeon, South Korea', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 50 }],
  },
  {
    name: 'Pale Blue',
    slug: 'pale-blue',
    headquarters: 'Kashiwa, Japan',
    country: 'JP',
    foundedYear: 2020,
    employeeRange: '11-50',
    employeeCount: 50,
    website: 'https://www.pale-blue.co.jp',
    description: 'Water-based electric propulsion for small satellites. Mitsubishi Electric investment. Series C completed Aug 2025.',
    ceo: 'Jun Asakawa',
    sector: 'manufacturing',
    subsector: 'propulsion',
    tags: ['propulsion', 'water-based', 'electric-propulsion', 'small-sat', 'green-propulsion'],
    tier: 3,
    ownershipType: 'private',
    lastFundingRound: 'Series C',
    lastFundingDate: '2025-08-01',
    products: [
      { name: 'Water Resistojet Thruster', category: 'propulsion_system', description: 'Water-based electric propulsion system for small satellite orbit maintenance and maneuvers.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'Jun Asakawa', title: 'Co-Founder & CEO', role: 'founder', previousCompanies: ['University of Tokyo'] },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'Pale Blue founded as University of Tokyo spinout', importance: 5 },
      { date: '2025-08-01', type: 'funding', title: 'Series C completed with Mitsubishi Electric investment', importance: 6 },
    ],
    scores: [{ scoreType: 'overall', score: 48 }],
  },
  {
    name: 'ALL.SPACE',
    slug: 'all-space',
    headquarters: 'Reading, United Kingdom',
    country: 'GB',
    foundedYear: 2014,
    employeeRange: '51-200',
    employeeCount: 150,
    website: 'https://all.space',
    description: 'World\'s first multi-orbit phased array terminal for simultaneous GEO+MEO+LEO connectivity.',
    longDescription: 'ALL.SPACE (formerly Isotropic Systems) developed the world\'s first multi-orbit phased array antenna terminal capable of simultaneously connecting to GEO, MEO, and LEO satellites. This technology enables seamless multi-network connectivity for defense, maritime, and enterprise applications.',
    ceo: 'John Finney',
    sector: 'ground-segment',
    subsector: 'antenna-systems',
    tags: ['phased-array', 'multi-orbit', 'antenna', 'ground-segment', 'connectivity'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'Smart Terminal', category: 'antenna_terminal', description: 'Multi-orbit phased array terminal for simultaneous GEO+MEO+LEO satellite connectivity.', status: 'active' },
    ],
    keyPersonnel: [
      { name: 'John Finney', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2014-01-01', type: 'founding', title: 'ALL.SPACE (originally Isotropic Systems) founded in Reading, UK', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 52 }],
  },
  {
    name: 'Arkisys',
    slug: 'arkisys',
    headquarters: 'Denver, Colorado',
    country: 'US',
    foundedYear: 2019,
    employeeRange: '11-50',
    employeeCount: 50,
    website: 'https://arkisys.com',
    description: 'Autonomous in-space assembly and construction platform for orbital structures.',
    ceo: 'Jonathan Goff',
    sector: 'infrastructure',
    subsector: 'in-space-assembly',
    tags: ['in-space-assembly', 'autonomous-construction', 'orbital-structures', 'space-infrastructure'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'Arkisys Assembly Platform', category: 'spacecraft', description: 'Autonomous platform for in-space assembly and construction of orbital structures.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jonathan Goff', title: 'Founder & CEO', role: 'founder', previousCompanies: ['Masten Space Systems', 'Blue Origin'] },
    ],
    events: [
      { date: '2019-01-01', type: 'founding', title: 'Arkisys founded in Denver, Colorado', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 42 }],
  },
  {
    name: 'NorthStar Earth & Space',
    slug: 'northstar-earth-space',
    headquarters: 'Montreal, Canada',
    country: 'CA',
    foundedYear: 2015,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.northstar-data.com',
    description: 'In-orbit SDA constellation using optical sensors in LEO to track space objects from space.',
    longDescription: 'NorthStar Earth & Space is building a constellation of LEO satellites equipped with optical sensors to provide space situational awareness from orbit. Unlike ground-based systems, the in-orbit approach enables continuous monitoring of space objects without atmospheric interference or geographic limitations.',
    ceo: 'Stewart Bain',
    sector: 'analytics',
    subsector: 'space-domain-awareness',
    tags: ['space-situational-awareness', 'sda', 'constellation', 'optical-sensing', 'in-orbit'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'NorthStar SDA Constellation', category: 'satellite_constellation', description: 'LEO constellation with optical sensors for in-orbit space object tracking.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Stewart Bain', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2015-01-01', type: 'founding', title: 'NorthStar Earth & Space founded in Montreal, Canada', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 52 }],
  },
  {
    name: 'SpaceNav',
    slug: 'spacenav',
    headquarters: 'Washington, DC',
    country: 'US',
    foundedYear: 2020,
    employeeRange: '11-50',
    employeeCount: 30,
    website: 'https://www.spacenav.com',
    description: 'SSA data quality assessment for TraCSS Consolidated Pathfinder program.',
    ceo: 'Joshua Stoff',
    sector: 'analytics',
    subsector: 'data-quality',
    tags: ['space-situational-awareness', 'data-quality', 'tracss', 'space-safety'],
    tier: 3,
    ownershipType: 'private',
    products: [
      { name: 'SSA Data Quality Platform', category: 'software_platform', description: 'Space situational awareness data quality assessment tools for TraCSS program.', status: 'active' },
    ],
    events: [
      { date: '2020-01-01', type: 'founding', title: 'SpaceNav founded in Washington, DC', importance: 5 },
    ],
    scores: [{ scoreType: 'overall', score: 40 }],
  },
  {
    name: 'Portal Space',
    slug: 'portal-space',
    headquarters: 'San Francisco, California',
    country: 'US',
    foundedYear: 2021,
    employeeRange: '11-50',
    employeeCount: 40,
    website: 'https://www.portalspace.com',
    description: 'Supernova orbital transfer vehicle. $17.5M seed funding. 50K sqft factory. 2026 on-orbit demo planned.',
    longDescription: 'Portal Space develops the Supernova orbital transfer vehicle for last-mile satellite delivery and in-space logistics. The company secured $17.5M in seed funding, operates a 50,000 sqft manufacturing facility, and plans an on-orbit demonstration mission in 2026.',
    ceo: 'Jeff Feige',
    sector: 'launch',
    subsector: 'orbital-transfer',
    tags: ['orbital-transfer', 'in-space-transportation', 'last-mile-delivery', 'otv'],
    tier: 3,
    totalFunding: 17500000,
    lastFundingRound: 'Seed',
    ownershipType: 'private',
    products: [
      { name: 'Supernova OTV', category: 'spacecraft', description: 'Orbital transfer vehicle for last-mile satellite delivery and in-space logistics.', status: 'development' },
    ],
    keyPersonnel: [
      { name: 'Jeff Feige', title: 'Founder & CEO', role: 'founder' },
    ],
    events: [
      { date: '2021-01-01', type: 'founding', title: 'Portal Space founded in San Francisco', importance: 5 },
    ],
    facilities: [
      { name: 'Portal Space Factory', type: 'manufacturing', city: 'San Francisco', state: 'CA', country: 'US' },
    ],
    scores: [{ scoreType: 'overall', score: 45 }],
  },
];

// ────────────────────────────────────────────────────────────────
// TIER UPGRADES (4 existing companies with major milestones)
// ────────────────────────────────────────────────────────────────

const TIER_UPGRADES: TierUpgrade[] = [
  {
    slug: 'firefly-aerospace',
    name: 'Firefly Aerospace',
    tier: 1,
    description: 'Firefly Aerospace develops launch vehicles, spacecraft, and in-space services. IPO on NYSE August 2025 ($868M raise, $8.5B valuation). Blue Ghost lunar lander achieved successful Moon landing March 2025, delivering NASA CLPS payloads.',
    isPublic: true,
    ticker: 'AFLY',
    exchange: 'NYSE',
    totalFunding: 868000000,
    marketCap: 8500000000,
    employeeRange: '501-1000',
  },
  {
    slug: 'voyager-space',
    name: 'Voyager Space',
    tier: 1,
    description: 'Voyager Space is a space technology holding company and parent of Starlab Space station JV with Airbus. NYSE IPO June 2025 ($383M raise). NASA CLD program partner building the next-generation commercial LEO destination.',
    isPublic: true,
    ticker: 'VOYG',
    exchange: 'NYSE',
    totalFunding: 383000000,
    employeeRange: '201-500',
  },
  {
    slug: 'varda-space-industries',
    name: 'Varda Space Industries',
    tier: 2,
    description: 'Varda Space Industries manufactures products in microgravity aboard autonomous spacecraft and returns them to Earth. $187M Series C completed. Successful W-2 capsule reentry demonstrated reliable in-space manufacturing and Earth return capability.',
    totalFunding: 340000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2025-06-01',
    employeeRange: '51-200',
  },
  {
    slug: 'stoke-space',
    name: 'Stoke Space',
    tier: 2,
    description: 'Stoke Space is developing the Nova fully reusable rocket with a novel actively-cooled second-stage heat shield for rapid reusability. $860M Series D completed. Nova inaugural launch planned early 2026.',
    totalFunding: 1035000000,
    lastFundingRound: 'Series D',
    lastFundingDate: '2025-09-01',
    employeeRange: '201-500',
  },
];

// ────────────────────────────────────────────────────────────────
// Seed function (mirrors logic from seed-company-profiles.ts)
// ────────────────────────────────────────────────────────────────

async function seedCompanyProfile(data: CompanyData) {
  const profile = await prisma.companyProfile.upsert({
    where: { slug: data.slug },
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
      slug: data.slug,
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
  const completeness = calculateCompleteness({
    ...data,
    _count: {
      fundingRounds: 0,
      revenueEstimates: 0,
      products: data.products?.length ?? 0,
      keyPersonnel: data.keyPersonnel?.length ?? 0,
      facilities: data.facilities?.length ?? 0,
      satelliteAssets: 0,
      contracts: data.contracts?.length ?? 0,
      events: data.events?.length ?? 0,
      partnerships: 0,
      acquisitions: 0,
      scores: data.scores?.length ?? 0,
      secFilings: 0,
      competitorOf: 0,
      newsArticles: 0,
    },
  });

  // Seed related records (skip duplicates on re-run)
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
      }).catch(() => {}); // skip duplicates on re-run
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

// ────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SpaceNexus: Seed New Companies (April 2026) ===\n');

  // ── Phase 1: Add new companies ──────────────────────────────
  console.log('-- Adding 20 new company profiles --\n');

  let created = 0;
  let updated = 0;

  for (const company of NEW_COMPANIES) {
    const existing = await prisma.companyProfile.findUnique({
      where: { slug: company.slug },
      select: { id: true },
    });

    const profile = await seedCompanyProfile(company);

    if (existing) {
      console.log(`  ~ Updated: ${company.name} [tier ${company.tier}] (${profile.id})`);
      updated++;
    } else {
      console.log(`  + Created: ${company.name} [tier ${company.tier}] (${profile.id})`);
      created++;
    }
  }

  console.log(`\n  Summary: ${created} created, ${updated} updated\n`);

  // ── Phase 2: Tier upgrades for existing companies ───────────
  console.log('-- Upgrading tiers for milestone companies --\n');

  for (const upgrade of TIER_UPGRADES) {
    const result = await prisma.companyProfile.updateMany({
      where: { slug: upgrade.slug },
      data: {
        tier: upgrade.tier,
        description: upgrade.description,
        ...(upgrade.totalFunding !== undefined && { totalFunding: upgrade.totalFunding }),
        ...(upgrade.valuation !== undefined && { valuation: upgrade.valuation }),
        ...(upgrade.isPublic !== undefined && { isPublic: upgrade.isPublic }),
        ...(upgrade.ticker !== undefined && { ticker: upgrade.ticker }),
        ...(upgrade.exchange !== undefined && { exchange: upgrade.exchange }),
        ...(upgrade.marketCap !== undefined && { marketCap: upgrade.marketCap }),
        ...(upgrade.employeeRange !== undefined && { employeeRange: upgrade.employeeRange }),
        ...(upgrade.lastFundingRound !== undefined && { lastFundingRound: upgrade.lastFundingRound }),
        ...(upgrade.lastFundingDate !== undefined && { lastFundingDate: new Date(upgrade.lastFundingDate) }),
        lastVerified: new Date(),
      },
    });

    if (result.count > 0) {
      console.log(`  ^ Upgraded: ${upgrade.name} -> tier ${upgrade.tier}`);
    } else {
      console.log(`  ! Not found: ${upgrade.name} (slug: ${upgrade.slug}) — skipped`);
    }
  }

  // ── Final count ─────────────────────────────────────────────
  const total = await prisma.companyProfile.count();
  const byTier = await prisma.companyProfile.groupBy({
    by: ['tier'],
    _count: true,
    orderBy: { tier: 'asc' },
  });

  console.log(`\n=== Done! Total company profiles: ${total} ===`);
  for (const t of byTier) {
    const label = t.tier === 1 ? 'Must-Have' : t.tier === 2 ? 'High-Growth' : 'Emerging';
    console.log(`  Tier ${t.tier} (${label}): ${t._count}`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
