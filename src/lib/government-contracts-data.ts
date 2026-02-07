import prisma from './db';
import { logger } from './logger';

// Government Contract Types
export type ContractAgency = 'NASA' | 'USSF' | 'ESA';
export type ContractType = 'RFP' | 'RFI' | 'Award' | 'IDIQ';
export type ContractStatus = 'open' | 'closed' | 'awarded' | 'closing_soon';
export type ContractCategory =
  | 'lunar_exploration'
  | 'earth_observation'
  | 'satellite_launch'
  | 'ground_systems'
  | 'research_development'
  | 'space_station'
  | 'defense_systems'
  | 'communications'
  | 'propulsion'
  | 'sbir_sttr';

export interface GovernmentContract {
  id: string;
  slug: string;
  agency: ContractAgency;
  title: string;
  description: string;
  type: ContractType;
  value: string | null;
  valueMin: number | null;
  valueMax: number | null;
  solicitationNumber: string | null;
  postedDate: Date;
  dueDate: Date | null;
  awardDate: Date | null;
  awardee: string | null;
  naicsCode: string | null;
  category: ContractCategory;
  status: ContractStatus;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Agency badge colors
export const CONTRACT_AGENCIES: { value: ContractAgency; label: string; color: string; bgColor: string }[] = [
  { value: 'NASA', label: 'NASA', color: 'text-blue-300', bgColor: 'bg-blue-600' },
  { value: 'USSF', label: 'Space Force', color: 'text-slate-200', bgColor: 'bg-slate-700' },
  { value: 'ESA', label: 'ESA', color: 'text-blue-200', bgColor: 'bg-blue-900' },
];

// Contract type badges
export const CONTRACT_TYPES: { value: ContractType; label: string; color: string }[] = [
  { value: 'RFP', label: 'RFP', color: 'bg-green-600' },
  { value: 'RFI', label: 'RFI', color: 'bg-yellow-600' },
  { value: 'Award', label: 'Award', color: 'bg-purple-600' },
  { value: 'IDIQ', label: 'IDIQ', color: 'bg-cyan-600' },
];

// Status badges
export const CONTRACT_STATUS_INFO: Record<ContractStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: 'text-green-400', bgColor: 'bg-green-600' },
  closing_soon: { label: 'Closing Soon', color: 'text-yellow-400', bgColor: 'bg-yellow-600' },
  awarded: { label: 'Awarded', color: 'text-purple-400', bgColor: 'bg-purple-600' },
  closed: { label: 'Closed', color: 'text-gray-400', bgColor: 'bg-gray-600' },
};

// Category labels
export const CONTRACT_CATEGORIES: { value: ContractCategory; label: string }[] = [
  { value: 'lunar_exploration', label: 'Lunar Exploration' },
  { value: 'earth_observation', label: 'Earth Observation' },
  { value: 'satellite_launch', label: 'Satellite Launch' },
  { value: 'ground_systems', label: 'Ground Systems' },
  { value: 'research_development', label: 'R&D' },
  { value: 'space_station', label: 'Space Station' },
  { value: 'defense_systems', label: 'Defense Systems' },
  { value: 'communications', label: 'Communications' },
  { value: 'propulsion', label: 'Propulsion' },
  { value: 'sbir_sttr', label: 'SBIR/STTR' },
];

// Seed data for government contracts
const GOVERNMENT_CONTRACTS_SEED: Omit<GovernmentContract, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // NASA Contracts (10-12)
  {
    slug: 'nasa-clps-cp-22',
    agency: 'NASA',
    title: 'CLPS Task Order CP-22: South Pole Delivery',
    description: 'Commercial Lunar Payload Services task order for scientific instrument delivery to the lunar south pole region in support of Artemis.',
    type: 'IDIQ',
    value: '$150M',
    valueMin: 120000000,
    valueMax: 180000000,
    solicitationNumber: 'NNH22ZCQ002L',
    postedDate: new Date('2025-11-15'),
    dueDate: new Date('2026-03-15'),
    awardDate: null,
    awardee: null,
    naicsCode: '336414',
    category: 'lunar_exploration',
    status: 'open',
    sourceUrl: 'https://sam.gov/opp/nasa-clps-cp-22',
  },
  {
    slug: 'nasa-artemis-suit-services',
    agency: 'NASA',
    title: 'Artemis Extravehicular Activity Services',
    description: 'Next-generation spacesuit development and certification for Artemis lunar surface operations.',
    type: 'RFP',
    value: '$3.5B (ceiling)',
    valueMin: 1500000000,
    valueMax: 3500000000,
    solicitationNumber: 'NNJ22ZA001R',
    postedDate: new Date('2025-09-01'),
    dueDate: new Date('2026-02-28'),
    awardDate: null,
    awardee: null,
    naicsCode: '336419',
    category: 'lunar_exploration',
    status: 'closing_soon',
    sourceUrl: 'https://sam.gov/opp/artemis-suits',
  },
  {
    slug: 'nasa-crs-3-iss-resupply',
    agency: 'NASA',
    title: 'Commercial Resupply Services 3 (CRS-3)',
    description: 'ISS cargo resupply missions through 2030, including both pressurized and unpressurized cargo delivery.',
    type: 'IDIQ',
    value: '$7B (ceiling)',
    valueMin: 3000000000,
    valueMax: 7000000000,
    solicitationNumber: 'NNK23MA001L',
    postedDate: new Date('2025-06-15'),
    dueDate: new Date('2025-12-01'),
    awardDate: new Date('2026-01-20'),
    awardee: 'SpaceX, Northrop Grumman',
    naicsCode: '336414',
    category: 'space_station',
    status: 'awarded',
    sourceUrl: 'https://sam.gov/opp/crs-3',
  },
  {
    slug: 'nasa-sbir-phase-ii-propulsion',
    agency: 'NASA',
    title: 'SBIR Phase II: Advanced In-Space Propulsion',
    description: 'Small business research grants for novel propulsion technologies including nuclear thermal and electric propulsion systems.',
    type: 'RFP',
    value: '$1.5M per award',
    valueMin: 750000,
    valueMax: 1500000,
    solicitationNumber: 'SBIR-24-P2-H9',
    postedDate: new Date('2025-10-01'),
    dueDate: new Date('2026-04-15'),
    awardDate: null,
    awardee: null,
    naicsCode: '541715',
    category: 'sbir_sttr',
    status: 'open',
    sourceUrl: 'https://sbir.nasa.gov/solicitations',
  },
  {
    slug: 'nasa-sttr-lunar-isru',
    agency: 'NASA',
    title: 'STTR: Lunar ISRU Technology Development',
    description: 'Technology transfer grants for in-situ resource utilization systems to support sustained lunar presence.',
    type: 'RFP',
    value: '$2M per award',
    valueMin: 1000000,
    valueMax: 2000000,
    solicitationNumber: 'STTR-24-T11',
    postedDate: new Date('2025-08-15'),
    dueDate: new Date('2026-02-10'),
    awardDate: null,
    awardee: null,
    naicsCode: '541715',
    category: 'sbir_sttr',
    status: 'closing_soon',
    sourceUrl: 'https://sbir.nasa.gov/solicitations',
  },
  {
    slug: 'nasa-gateway-logistics',
    agency: 'NASA',
    title: 'Gateway Logistics Services',
    description: 'Cargo delivery services to the lunar Gateway station, including crew supplies and science payloads.',
    type: 'RFI',
    value: 'TBD',
    valueMin: null,
    valueMax: null,
    solicitationNumber: 'NNH25ZA001I',
    postedDate: new Date('2025-12-01'),
    dueDate: new Date('2026-03-01'),
    awardDate: null,
    awardee: null,
    naicsCode: '336414',
    category: 'lunar_exploration',
    status: 'open',
    sourceUrl: 'https://sam.gov/opp/gateway-logistics',
  },
  {
    slug: 'nasa-commercial-leo-destinations',
    agency: 'NASA',
    title: 'Commercial LEO Destinations Phase 2',
    description: 'Development of commercial space stations to ensure continuous American presence in low Earth orbit post-ISS.',
    type: 'Award',
    value: '$415M',
    valueMin: 400000000,
    valueMax: 430000000,
    solicitationNumber: 'NNH21ZCQ001L',
    postedDate: new Date('2024-02-15'),
    dueDate: null,
    awardDate: new Date('2025-08-15'),
    awardee: 'Axiom Space, Vast, Orbital Reef',
    naicsCode: '336414',
    category: 'space_station',
    status: 'awarded',
    sourceUrl: 'https://sam.gov/opp/cld-phase2',
  },
  {
    slug: 'nasa-earth-system-observatory',
    agency: 'NASA',
    title: 'Earth System Observatory Instruments',
    description: 'Scientific instruments for next-generation Earth observation satellites studying climate, weather, and natural hazards.',
    type: 'RFP',
    value: '$800M',
    valueMin: 600000000,
    valueMax: 900000000,
    solicitationNumber: 'NNG24ZA003R',
    postedDate: new Date('2025-07-20'),
    dueDate: new Date('2026-05-01'),
    awardDate: null,
    awardee: null,
    naicsCode: '334511',
    category: 'earth_observation',
    status: 'open',
    sourceUrl: 'https://sam.gov/opp/eso-instruments',
  },
  {
    slug: 'nasa-moon-mars-comm-network',
    agency: 'NASA',
    title: 'Lunar Communications Relay and Navigation',
    description: 'Development of communications and navigation infrastructure for sustained lunar operations.',
    type: 'RFP',
    value: '$4.8B',
    valueMin: 4000000000,
    valueMax: 5200000000,
    solicitationNumber: 'NNH24ZA008R',
    postedDate: new Date('2025-05-10'),
    dueDate: new Date('2026-01-15'),
    awardDate: null,
    awardee: null,
    naicsCode: '334220',
    category: 'communications',
    status: 'closed',
    sourceUrl: 'https://sam.gov/opp/lcran',
  },
  {
    slug: 'nasa-human-lander-sustaining',
    agency: 'NASA',
    title: 'Human Landing System Sustaining',
    description: 'Sustainment contract for human lunar lander operations supporting recurring Artemis missions.',
    type: 'IDIQ',
    value: '$2.9B',
    valueMin: 2500000000,
    valueMax: 3200000000,
    solicitationNumber: 'NNJ24ZA002L',
    postedDate: new Date('2025-04-01'),
    dueDate: new Date('2025-10-01'),
    awardDate: new Date('2025-12-15'),
    awardee: 'SpaceX',
    naicsCode: '336414',
    category: 'lunar_exploration',
    status: 'awarded',
    sourceUrl: 'https://sam.gov/opp/hls-sustaining',
  },
  {
    slug: 'nasa-crew-transport-iss',
    agency: 'NASA',
    title: 'Commercial Crew Transportation Extension',
    description: 'Extension of Commercial Crew Program services for astronaut transportation to ISS through station end-of-life.',
    type: 'Award',
    value: '$1.4B',
    valueMin: 1200000000,
    valueMax: 1500000000,
    solicitationNumber: 'NNK24ZA001L',
    postedDate: new Date('2025-03-15'),
    dueDate: null,
    awardDate: new Date('2025-11-01'),
    awardee: 'SpaceX, Boeing',
    naicsCode: '336414',
    category: 'space_station',
    status: 'awarded',
    sourceUrl: 'https://sam.gov/opp/ccp-extension',
  },

  // Space Force Contracts (8-10)
  {
    slug: 'ussf-nssl-phase-3-lane-1',
    agency: 'USSF',
    title: 'NSSL Phase 3 Lane 1: Heavy/Medium Launch',
    description: 'National Security Space Launch program for heavy and medium-lift launch services for national security payloads.',
    type: 'IDIQ',
    value: '$5.6B (ceiling)',
    valueMin: 3000000000,
    valueMax: 5600000000,
    solicitationNumber: 'FA8811-23-R-0001',
    postedDate: new Date('2025-02-01'),
    dueDate: new Date('2025-08-15'),
    awardDate: new Date('2026-01-05'),
    awardee: 'ULA, SpaceX, Blue Origin',
    naicsCode: '336414',
    category: 'satellite_launch',
    status: 'awarded',
    sourceUrl: 'https://sam.gov/opp/nssl-phase3-lane1',
  },
  {
    slug: 'ussf-ground-systems-modernization',
    agency: 'USSF',
    title: 'Satellite Ground Systems Modernization',
    description: 'Next-generation satellite command and control ground systems with enhanced cybersecurity capabilities.',
    type: 'RFP',
    value: '$890M',
    valueMin: 750000000,
    valueMax: 950000000,
    solicitationNumber: 'FA8819-25-R-0023',
    postedDate: new Date('2025-09-15'),
    dueDate: new Date('2026-04-30'),
    awardDate: null,
    awardee: null,
    naicsCode: '541512',
    category: 'ground_systems',
    status: 'open',
    sourceUrl: 'https://sam.gov/opp/gsm',
  },
  {
    slug: 'ussf-tactically-responsive-space',
    agency: 'USSF',
    title: 'Tactically Responsive Space Launch',
    description: 'Rapid launch capability for deploying small satellites within 24-48 hours of call-up for national security.',
    type: 'RFP',
    value: '$350M',
    valueMin: 250000000,
    valueMax: 400000000,
    solicitationNumber: 'FA8811-25-R-0045',
    postedDate: new Date('2025-11-01'),
    dueDate: new Date('2026-05-15'),
    awardDate: null,
    awardee: null,
    naicsCode: '336414',
    category: 'satellite_launch',
    status: 'open',
    sourceUrl: 'https://sam.gov/opp/trs',
  },
  {
    slug: 'ussf-sbir-space-domain-awareness',
    agency: 'USSF',
    title: 'SBIR: Space Domain Awareness Sensors',
    description: 'Small business innovation research for advanced sensors to track objects in cislunar space.',
    type: 'RFP',
    value: '$2.5M per award',
    valueMin: 1500000,
    valueMax: 2500000,
    solicitationNumber: 'FA8819-25-S-0012',
    postedDate: new Date('2025-10-20'),
    dueDate: new Date('2026-03-20'),
    awardDate: null,
    awardee: null,
    naicsCode: '541715',
    category: 'sbir_sttr',
    status: 'open',
    sourceUrl: 'https://sam.gov/opp/sbir-sda',
  },
  {
    slug: 'ussf-proliferated-warfighter',
    agency: 'USSF',
    title: 'Proliferated Warfighter Space Architecture Tranche 2',
    description: 'Hundreds of satellites in LEO providing missile warning, tracking, and communications.',
    type: 'Award',
    value: '$2.4B',
    valueMin: 2200000000,
    valueMax: 2600000000,
    solicitationNumber: 'HQ0860-24-R-0001',
    postedDate: new Date('2024-09-01'),
    dueDate: null,
    awardDate: new Date('2025-07-15'),
    awardee: 'Lockheed Martin, Northrop Grumman, York Space',
    naicsCode: '336414',
    category: 'defense_systems',
    status: 'awarded',
    sourceUrl: 'https://sam.gov/opp/pwsa-t2',
  },
  {
    slug: 'ussf-gps-iii-follow-on',
    agency: 'USSF',
    title: 'GPS III Follow-On Production',
    description: 'Continued production of GPS IIIF satellites with enhanced anti-jamming and accuracy capabilities.',
    type: 'Award',
    value: '$732M',
    valueMin: 700000000,
    valueMax: 780000000,
    solicitationNumber: 'FA8807-24-C-0001',
    postedDate: new Date('2024-05-01'),
    dueDate: null,
    awardDate: new Date('2025-03-20'),
    awardee: 'Lockheed Martin',
    naicsCode: '336414',
    category: 'defense_systems',
    status: 'awarded',
    sourceUrl: 'https://sam.gov/opp/gps-iii-fo',
  },
  {
    slug: 'ussf-satellite-communications-mgmt',
    agency: 'USSF',
    title: 'SATCOM Enterprise Management',
    description: 'Integrated management of military satellite communications across multiple constellations.',
    type: 'RFP',
    value: '$1.2B',
    valueMin: 1000000000,
    valueMax: 1400000000,
    solicitationNumber: 'FA8808-25-R-0067',
    postedDate: new Date('2025-08-01'),
    dueDate: new Date('2026-02-15'),
    awardDate: null,
    awardee: null,
    naicsCode: '517410',
    category: 'communications',
    status: 'closing_soon',
    sourceUrl: 'https://sam.gov/opp/satcom-em',
  },
  {
    slug: 'ussf-space-training-ranges',
    agency: 'USSF',
    title: 'National Space Test and Training Complex',
    description: 'Modernization of space operations training facilities and simulation capabilities.',
    type: 'RFI',
    value: '$450M estimated',
    valueMin: 350000000,
    valueMax: 500000000,
    solicitationNumber: 'FA8819-25-I-0089',
    postedDate: new Date('2025-12-10'),
    dueDate: new Date('2026-02-28'),
    awardDate: null,
    awardee: null,
    naicsCode: '611519',
    category: 'ground_systems',
    status: 'open',
    sourceUrl: 'https://sam.gov/opp/nsttc',
  },

  // ESA Contracts (5-8)
  {
    slug: 'esa-ariane-6-services',
    agency: 'ESA',
    title: 'Ariane 6 Launch Services Pool',
    description: 'Multi-year launch services contract for European institutional missions using Ariane 6.',
    type: 'IDIQ',
    value: '1.2B EUR',
    valueMin: 1000000000,
    valueMax: 1400000000,
    solicitationNumber: 'ESA-IPL-PLM-2025-001',
    postedDate: new Date('2025-04-15'),
    dueDate: new Date('2025-10-30'),
    awardDate: new Date('2025-12-20'),
    awardee: 'Arianespace',
    naicsCode: '336414',
    category: 'satellite_launch',
    status: 'awarded',
    sourceUrl: 'https://emits.esa.int/ariane6-pool',
  },
  {
    slug: 'esa-copernicus-expansion',
    agency: 'ESA',
    title: 'Copernicus Expansion Missions',
    description: 'Development of six new Sentinel satellite missions for enhanced Earth observation capabilities.',
    type: 'RFP',
    value: '800M EUR',
    valueMin: 700000000,
    valueMax: 900000000,
    solicitationNumber: 'ESA-EOP-2025-034',
    postedDate: new Date('2025-06-01'),
    dueDate: new Date('2026-01-31'),
    awardDate: null,
    awardee: null,
    naicsCode: '336414',
    category: 'earth_observation',
    status: 'open',
    sourceUrl: 'https://emits.esa.int/copernicus-exp',
  },
  {
    slug: 'esa-iss-contribution-extension',
    agency: 'ESA',
    title: 'ISS Operations and Exploitation Extension',
    description: 'European contribution to ISS operations through 2030 including Columbus module maintenance.',
    type: 'Award',
    value: '350M EUR',
    valueMin: 320000000,
    valueMax: 380000000,
    solicitationNumber: 'ESA-HSO-2024-012',
    postedDate: new Date('2024-11-01'),
    dueDate: null,
    awardDate: new Date('2025-06-15'),
    awardee: 'Airbus Defence and Space, Thales Alenia Space',
    naicsCode: '336414',
    category: 'space_station',
    status: 'awarded',
    sourceUrl: 'https://emits.esa.int/iss-extension',
  },
  {
    slug: 'esa-lunar-pathfinder',
    agency: 'ESA',
    title: 'Lunar Pathfinder Communications Relay',
    description: 'Communications relay satellite for lunar surface missions, enabling continuous contact with Earth.',
    type: 'RFP',
    value: '240M EUR',
    valueMin: 200000000,
    valueMax: 280000000,
    solicitationNumber: 'ESA-HRE-2025-007',
    postedDate: new Date('2025-07-15'),
    dueDate: new Date('2026-03-30'),
    awardDate: null,
    awardee: null,
    naicsCode: '334220',
    category: 'communications',
    status: 'open',
    sourceUrl: 'https://emits.esa.int/lunar-pathfinder',
  },
  {
    slug: 'esa-phoebus-thermal-protection',
    agency: 'ESA',
    title: 'PHOEBUS: Reusable Launch Vehicle TPS',
    description: 'Development of thermal protection systems for European reusable launch vehicles.',
    type: 'RFI',
    value: '150M EUR estimated',
    valueMin: 100000000,
    valueMax: 180000000,
    solicitationNumber: 'ESA-STS-2025-042',
    postedDate: new Date('2025-11-20'),
    dueDate: new Date('2026-02-20'),
    awardDate: null,
    awardee: null,
    naicsCode: '336414',
    category: 'research_development',
    status: 'open',
    sourceUrl: 'https://emits.esa.int/phoebus',
  },
  {
    slug: 'esa-iris2-constellation',
    agency: 'ESA',
    title: 'IRIS2 Secure Connectivity Constellation',
    description: 'European sovereign secure satellite constellation for government and commercial communications.',
    type: 'RFP',
    value: '2.4B EUR',
    valueMin: 2000000000,
    valueMax: 2800000000,
    solicitationNumber: 'ESA-TDE-2025-001',
    postedDate: new Date('2025-03-01'),
    dueDate: new Date('2025-09-30'),
    awardDate: null,
    awardee: null,
    naicsCode: '334220',
    category: 'communications',
    status: 'closed',
    sourceUrl: 'https://emits.esa.int/iris2',
  },
  {
    slug: 'esa-exomars-sample-return',
    agency: 'ESA',
    title: 'ExoMars Sample Return Contribution',
    description: 'European contribution to Mars sample return mission including Earth Return Orbiter.',
    type: 'IDIQ',
    value: '500M EUR',
    valueMin: 450000000,
    valueMax: 600000000,
    solicitationNumber: 'ESA-SCI-2025-018',
    postedDate: new Date('2025-05-20'),
    dueDate: new Date('2026-06-30'),
    awardDate: null,
    awardee: null,
    naicsCode: '336414',
    category: 'research_development',
    status: 'open',
    sourceUrl: 'https://emits.esa.int/exomars-return',
  },
];

// Initialize government contracts data
export async function initializeGovernmentContracts(): Promise<{ count: number }> {
  let count = 0;

  for (const contract of GOVERNMENT_CONTRACTS_SEED) {
    try {
      await prisma.governmentContract.upsert({
        where: { slug: contract.slug },
        update: contract,
        create: contract,
      });
      count++;
    } catch (error) {
      logger.error(`Failed to save contract ${contract.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { count };
}

// Get contracts with filtering
export async function getGovernmentContracts(options?: {
  agency?: ContractAgency;
  type?: ContractType;
  status?: ContractStatus;
  category?: ContractCategory;
  limit?: number;
  offset?: number;
}): Promise<{ contracts: GovernmentContract[]; total: number }> {
  const where: Record<string, unknown> = {};

  if (options?.agency) {
    where.agency = options.agency;
  }
  if (options?.type) {
    where.type = options.type;
  }
  if (options?.status) {
    where.status = options.status;
  }
  if (options?.category) {
    where.category = options.category;
  }

  const [contracts, total] = await Promise.all([
    prisma.governmentContract.findMany({
      where,
      select: {
        id: true,
        slug: true,
        agency: true,
        title: true,
        description: true,
        type: true,
        value: true,
        valueMin: true,
        valueMax: true,
        solicitationNumber: true,
        postedDate: true,
        dueDate: true,
        awardDate: true,
        awardee: true,
        naicsCode: true,
        category: true,
        status: true,
        sourceUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { status: 'asc' }, // Open first
        { postedDate: 'desc' },
      ],
      take: options?.limit || 30,
      skip: options?.offset || 0,
    }),
    prisma.governmentContract.count({ where }),
  ]);

  return { contracts: contracts as GovernmentContract[], total };
}

// Get recent contracts for ticker
export async function getRecentContracts(limit: number = 10): Promise<GovernmentContract[]> {
  const contracts = await prisma.governmentContract.findMany({
    select: {
      id: true,
      slug: true,
      agency: true,
      title: true,
      description: true,
      type: true,
      value: true,
      valueMin: true,
      valueMax: true,
      solicitationNumber: true,
      postedDate: true,
      dueDate: true,
      awardDate: true,
      awardee: true,
      naicsCode: true,
      category: true,
      status: true,
      sourceUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { postedDate: 'desc' },
    take: limit,
  });

  return contracts as GovernmentContract[];
}

// Get contract stats
export async function getContractStats() {
  const [total, byAgency, byType, byStatus, openCount, awardedThisMonth] = await Promise.all([
    prisma.governmentContract.count(),
    prisma.governmentContract.groupBy({
      by: ['agency'],
      _count: { agency: true },
    }),
    prisma.governmentContract.groupBy({
      by: ['type'],
      _count: { type: true },
    }),
    prisma.governmentContract.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.governmentContract.count({
      where: { status: { in: ['open', 'closing_soon'] } },
    }),
    prisma.governmentContract.count({
      where: {
        status: 'awarded',
        awardDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        },
      },
    }),
  ]);

  // Calculate total value of open contracts
  const openContracts = await prisma.governmentContract.findMany({
    where: { status: { in: ['open', 'closing_soon'] } },
    select: { valueMax: true },
  });

  const totalOpenValue = openContracts.reduce((sum, c) => sum + (c.valueMax || 0), 0);

  return {
    total,
    openCount,
    awardedThisMonth,
    totalOpenValue,
    byAgency: Object.fromEntries(byAgency.map((a) => [a.agency, a._count.agency])),
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count.type])),
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
  };
}
