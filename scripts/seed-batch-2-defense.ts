import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

const COMPANIES: CompanyData[] = [
  // ─── 1. General Dynamics (Space Division) ───────────────────────────────────
  {
    name: 'General Dynamics',
    legalName: 'General Dynamics Corporation',
    slug: 'general-dynamics',
    ticker: 'GD',
    exchange: 'NYSE',
    headquarters: 'Reston, Virginia',
    country: 'United States',
    foundedYear: 1952,
    employeeRange: '100000+',
    employeeCount: 106500,
    website: 'https://www.gd.com',
    description: 'General Dynamics is a global aerospace and defense company with significant space capabilities through its Mission Systems division. The company delivers C4ISR solutions, space electronics, and satellite communication systems for military and intelligence customers.',
    longDescription: 'General Dynamics Corporation is one of the top five U.S. defense contractors, operating across four business segments: Aerospace, Marine Systems, Combat Systems, and Technologies. Its Mission Systems division provides advanced space-related capabilities including satellite ground systems, signals intelligence processing, and secure communications for national security space programs. The company plays a critical role in the U.S. space architecture through its work on next-generation ground systems, space-based sensors, and command-and-control infrastructure for the U.S. Space Force and intelligence community.',
    ceo: 'Phebe Novakovic',
    isPublic: true,
    marketCap: 82000000000,
    revenueEstimate: 42300000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'mission-systems',
    tags: ['C4ISR', 'satellite-ground-systems', 'defense-prime', 'mission-systems', 'SIGINT'],
    tier: 2,
    products: [
      {
        name: 'Mission Systems Space C4ISR Suite',
        category: 'mission-systems',
        description: 'Integrated command, control, communications, computers, intelligence, surveillance, and reconnaissance solutions for national security space operations.',
        status: 'active',
      },
      {
        name: 'Satellite Ground System Infrastructure',
        category: 'ground-systems',
        description: 'Next-generation ground control and data processing systems for military and intelligence satellite constellations.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Phebe Novakovic',
        title: 'Chairman and CEO',
        role: 'executive',
        bio: 'Has led General Dynamics since 2013, overseeing major growth in the Technologies segment including space mission systems.',
        previousCompanies: ['CIA', 'OMB'],
      },
      {
        name: 'Christopher Brady',
        title: 'President, Mission Systems',
        role: 'executive',
        bio: 'Leads the Mission Systems segment which encompasses space-related C4ISR capabilities and satellite ground systems.',
      },
    ],
    events: [
      {
        date: '1952-02-01',
        type: 'founding',
        title: 'General Dynamics Corporation founded',
        description: 'Formed through the reorganization of the Electric Boat Company, expanding into aerospace and defense.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Mission Systems Headquarters',
        type: 'headquarters',
        city: 'Fairfax',
        state: 'Virginia',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 68 },
    ],
  },

  // ─── 2. Kratos Defense ──────────────────────────────────────────────────────
  {
    name: 'Kratos Defense & Security Solutions',
    legalName: 'Kratos Defense & Security Solutions, Inc.',
    slug: 'kratos-defense',
    ticker: 'KTOS',
    exchange: 'NASDAQ',
    headquarters: 'Oklahoma City, Oklahoma',
    country: 'United States',
    foundedYear: 1994,
    employeeRange: '1001-5000',
    employeeCount: 4100,
    website: 'https://www.kratosdefense.com',
    description: 'Kratos Defense specializes in satellite communications, space electronics, and unmanned systems for national security applications. The company provides critical ground system infrastructure and RF electronics for military satellite programs.',
    longDescription: 'Kratos Defense & Security Solutions is a mid-cap defense technology company focused on rapid innovation for national security. Its Space & Satellite Communications division is a leading provider of ground system solutions, satellite signal monitoring, and electronic warfare systems. Kratos produces the OpenSpace platform for virtualized satellite ground systems, enabling software-defined ground architectures. The company is also a key supplier of microwave electronics, signal processing equipment, and drone target systems for DoD testing and training.',
    ceo: 'Eric DeMarco',
    isPublic: true,
    marketCap: 10500000000,
    revenueEstimate: 1100000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'satellite-ground-systems',
    tags: ['satellite-ground-systems', 'space-electronics', 'unmanned-systems', 'RF-subsystems', 'SATCOM'],
    tier: 2,
    products: [
      {
        name: 'OpenSpace Platform',
        category: 'ground-systems',
        description: 'Virtualized, software-defined satellite ground system platform enabling multi-orbit, multi-band satellite operations from a single architecture.',
        status: 'active',
      },
      {
        name: 'Spectral RF Monitoring Systems',
        category: 'electronics',
        description: 'Signal monitoring and interference detection systems for military and commercial satellite operators.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Eric DeMarco',
        title: 'President and CEO',
        role: 'executive',
        bio: 'Has led Kratos since 2004, transforming it from a consulting firm into a leading defense technology company focused on space and unmanned systems.',
        previousCompanies: ['Titan Corporation', 'SAIC'],
      },
    ],
    events: [
      {
        date: '1994-01-01',
        type: 'founding',
        title: 'Kratos Defense founded',
        description: 'Originally founded as Wireless Facilities Inc., later rebranded and pivoted to defense technology through strategic acquisitions.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Space & Satellite Communications HQ',
        type: 'office',
        city: 'Colorado Springs',
        state: 'Colorado',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 62 },
    ],
  },

  // ─── 3. Mercury Systems ─────────────────────────────────────────────────────
  {
    name: 'Mercury Systems',
    legalName: 'Mercury Systems, Inc.',
    slug: 'mercury-systems',
    ticker: 'MRCY',
    exchange: 'NASDAQ',
    headquarters: 'Andover, Massachusetts',
    country: 'United States',
    foundedYear: 1981,
    employeeRange: '1001-5000',
    employeeCount: 2300,
    website: 'https://www.mrcy.com',
    description: 'Mercury Systems provides mission-critical processing and RF subsystems hardened for space and defense applications. The company specializes in secure, rugged computing modules used in satellite payloads, electronic warfare, and radar systems.',
    longDescription: 'Mercury Systems is a leading commercial provider of secure processing subsystems and modules for critical defense and intelligence applications. The company designs and manufactures radiation-hardened electronics, secure memory modules, and RF/microwave components used in space-based sensors, satellite payloads, and missile defense systems. Mercury serves as a trusted subsystem provider to major defense primes, embedding its processing technology into platforms across land, sea, air, and space domains.',
    ceo: 'Bill Ballhaus',
    isPublic: true,
    marketCap: 2800000000,
    revenueEstimate: 900000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'space-electronics',
    tags: ['space-grade-processing', 'RF-subsystems', 'rad-hard-electronics', 'defense-electronics'],
    tier: 3,
    products: [
      {
        name: 'SCFE Secure Computing Modules',
        category: 'electronics',
        description: 'Space-qualified secure computing and field-programmable modules for satellite payloads and missile defense applications.',
        status: 'active',
      },
      {
        name: 'RF and Microwave Subsystems',
        category: 'electronics',
        description: 'High-performance RF receiver/exciter and digital signal processing subsystems for electronic warfare and space-based sensors.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Bill Ballhaus',
        title: 'President and CEO',
        role: 'executive',
        bio: 'Joined Mercury Systems in 2023 to lead the company through its transformation program, bringing extensive aerospace and defense leadership experience.',
        previousCompanies: ['SRI International', 'Aerospace Corporation', 'Boeing'],
      },
    ],
    events: [
      {
        date: '1981-01-01',
        type: 'founding',
        title: 'Mercury Computer Systems founded',
        description: 'Founded in Chelmsford, Massachusetts as a high-performance computing company, later pivoting to defense electronics.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Mercury Systems Headquarters',
        type: 'headquarters',
        city: 'Andover',
        state: 'Massachusetts',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 48 },
    ],
  },

  // ─── 4. Shield AI ──────────────────────────────────────────────────────────
  {
    name: 'Shield AI',
    legalName: 'Shield AI, Inc.',
    slug: 'shield-ai',
    headquarters: 'San Diego, California',
    country: 'United States',
    foundedYear: 2015,
    employeeRange: '501-1000',
    employeeCount: 800,
    website: 'https://www.shield.ai',
    description: 'Shield AI builds autonomous systems powered by its Hivemind AI pilot, with applications spanning aerial drones, space ISR, and autonomous spacecraft operations. The company is a leading defense AI startup pursuing space domain awareness capabilities.',
    longDescription: 'Shield AI is a venture-backed defense technology company developing the world\'s best AI pilot, Hivemind, capable of operating autonomous systems without GPS, communications, or remote piloting. Originally focused on tactical drones for urban warfare, Shield AI has expanded into larger autonomous aircraft and is pursuing space ISR applications where autonomous decision-making is critical. The company\'s V-BAT vertical takeoff drone and Hivemind software stack position it for roles in persistent surveillance, space domain awareness, and autonomous spacecraft operations.',
    ceo: 'Ryan Tseng',
    isPublic: false,
    ownershipType: 'private',
    totalFunding: 2700000000,
    lastFundingRound: 'Series F',
    lastFundingDate: '2024-06-01',
    valuation: 5300000000,
    sector: 'defense-space',
    subsector: 'autonomous-systems',
    tags: ['autonomous-systems', 'AI-pilot', 'space-ISR', 'defense-AI', 'drones'],
    tier: 3,
    products: [
      {
        name: 'Hivemind AI Pilot',
        category: 'software',
        description: 'Autonomous AI pilot software capable of operating aircraft and spacecraft without GPS, communications, or human control, enabling autonomous ISR and space operations.',
        status: 'active',
      },
      {
        name: 'V-BAT',
        category: 'unmanned-systems',
        description: 'Vertical takeoff and landing autonomous drone for persistent surveillance and reconnaissance missions.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Ryan Tseng',
        title: 'Co-Founder and CEO',
        role: 'executive',
        bio: 'Co-founded Shield AI in 2015 with a mission to protect service members and civilians with intelligent systems. Former U.S. Navy officer.',
        previousCompanies: ['U.S. Navy'],
      },
      {
        name: 'Brandon Tseng',
        title: 'Co-Founder and President',
        role: 'executive',
        bio: 'Navy SEAL veteran who co-founded Shield AI, leading business development and government programs.',
        previousCompanies: ['U.S. Navy SEALs'],
      },
    ],
    fundingRounds: [
      {
        date: '2024-06-01',
        amount: 300000000,
        seriesLabel: 'F',
        roundType: 'series_f',
      },
    ],
    events: [
      {
        date: '2015-01-01',
        type: 'founding',
        title: 'Shield AI founded',
        description: 'Founded by Ryan and Brandon Tseng in San Diego with a mission to build the world\'s best AI pilot for defense applications.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Shield AI Headquarters',
        type: 'headquarters',
        city: 'San Diego',
        state: 'California',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 52 },
    ],
  },

  // ─── 5. Anduril Industries ──────────────────────────────────────────────────
  {
    name: 'Anduril Industries',
    legalName: 'Anduril Industries, Inc.',
    slug: 'anduril-industries',
    headquarters: 'Costa Mesa, California',
    country: 'United States',
    foundedYear: 2017,
    employeeRange: '1001-5000',
    employeeCount: 3000,
    website: 'https://www.anduril.com',
    description: 'Anduril Industries builds advanced defense technology including the Lattice AI platform for autonomous command and control across all domains including space. The company is rapidly emerging as a new-generation defense prime with significant space domain awareness capabilities.',
    longDescription: 'Anduril Industries is a defense technology company founded by Palmer Luckey, leveraging Silicon Valley innovation to transform U.S. and allied defense capabilities. Its core product, Lattice, is an AI-powered command-and-control platform that fuses sensor data across domains to enable autonomous threat detection and response. In the space domain, Lattice provides space domain awareness, satellite tracking, and orbital threat assessment capabilities. Anduril is also developing autonomous systems, counter-drone technology, and undersea vehicles, positioning itself as a next-generation defense prime competing with legacy contractors.',
    ceo: 'Brian Schimpf',
    isPublic: false,
    ownershipType: 'private',
    totalFunding: 5700000000,
    lastFundingRound: 'Series F',
    lastFundingDate: '2024-08-01',
    valuation: 14000000000,
    sector: 'defense-space',
    subsector: 'autonomous-defense',
    tags: ['space-domain-awareness', 'AI-platform', 'autonomous-systems', 'defense-tech', 'Lattice'],
    tier: 2,
    products: [
      {
        name: 'Lattice',
        category: 'software',
        description: 'AI-powered command-and-control operating system that fuses sensor data across land, sea, air, and space domains for autonomous threat detection and response.',
        status: 'active',
      },
      {
        name: 'Space Domain Awareness Suite',
        category: 'space-systems',
        description: 'Integrated space surveillance and tracking capabilities built on Lattice for monitoring orbital objects and assessing space-based threats.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Brian Schimpf',
        title: 'Co-Founder and CEO',
        role: 'executive',
        bio: 'Co-founded Anduril and serves as CEO, bringing engineering leadership experience from Palantir Technologies.',
        previousCompanies: ['Palantir Technologies'],
      },
      {
        name: 'Palmer Luckey',
        title: 'Co-Founder',
        role: 'founder',
        bio: 'Founded Anduril after creating Oculus VR. Drives the company\'s vision of leveraging commercial technology innovation for defense.',
        previousCompanies: ['Oculus VR', 'Facebook'],
      },
    ],
    fundingRounds: [
      {
        date: '2024-08-01',
        amount: 1500000000,
        seriesLabel: 'F',
        roundType: 'series_f',
        leadInvestor: 'Founders Fund',
      },
    ],
    events: [
      {
        date: '2017-06-01',
        type: 'founding',
        title: 'Anduril Industries founded',
        description: 'Founded by Palmer Luckey, Brian Schimpf, Matt Grimm, Trae Stephens, and Joe Chen with a mission to transform U.S. defense capabilities using commercial technology.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'Anduril Headquarters',
        type: 'headquarters',
        city: 'Costa Mesa',
        state: 'California',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 72 },
    ],
  },

  // ─── 6. Palantir Technologies (Space) ──────────────────────────────────────
  {
    name: 'Palantir Technologies',
    legalName: 'Palantir Technologies Inc.',
    slug: 'palantir-technologies',
    ticker: 'PLTR',
    exchange: 'NYSE',
    headquarters: 'Denver, Colorado',
    country: 'United States',
    foundedYear: 2003,
    employeeRange: '1001-5000',
    employeeCount: 3700,
    website: 'https://www.palantir.com',
    description: 'Palantir Technologies provides the Foundry and Gotham platforms used extensively by the U.S. Space Force and intelligence community for space operations, satellite data integration, and orbital domain awareness. The company is a critical software infrastructure provider for national security space.',
    longDescription: 'Palantir Technologies is a software company specializing in large-scale data integration and analytics for government and commercial customers. Its Gotham platform serves the intelligence community and military for operational planning and threat analysis, while Foundry provides a commercial data operations platform. In the space domain, Palantir\'s software is used by the U.S. Space Force for space operations command and control, satellite constellation management, and integrating space-based sensor data with terrestrial intelligence. The company has secured multiple contracts with USSF, the Space Development Agency, and the National Reconnaissance Office.',
    ceo: 'Alex Karp',
    cto: 'Shyam Sankar',
    isPublic: true,
    marketCap: 220000000000,
    revenueEstimate: 2800000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'data-analytics',
    tags: ['space-operations', 'data-analytics', 'USSF-contracts', 'AI-platform', 'intelligence'],
    tier: 2,
    products: [
      {
        name: 'Gotham',
        category: 'software',
        description: 'Intelligence and defense operations platform used by the U.S. Space Force and intelligence community for space domain awareness and operational planning.',
        status: 'active',
      },
      {
        name: 'Foundry for Space Operations',
        category: 'software',
        description: 'Data integration and operations platform tailored for satellite constellation management, space sensor fusion, and orbital operations.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Alex Karp',
        title: 'Co-Founder and CEO',
        role: 'executive',
        bio: 'Co-founded Palantir in 2003 and has led its growth into one of the most important software platforms in national security and defense.',
        previousCompanies: [],
      },
      {
        name: 'Shyam Sankar',
        title: 'CTO',
        role: 'executive',
        bio: 'Oversees Palantir\'s technology strategy including its expansion into space operations and AI-driven defense capabilities.',
      },
    ],
    events: [
      {
        date: '2003-05-01',
        type: 'founding',
        title: 'Palantir Technologies founded',
        description: 'Founded by Alex Karp, Peter Thiel, Joe Lonsdale, Stephen Cohen, and Nathan Gettings to build software for intelligence analysis and counterterrorism.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Palantir Denver HQ',
        type: 'headquarters',
        city: 'Denver',
        state: 'Colorado',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 70 },
    ],
  },

  // ─── 7. Hermeus ─────────────────────────────────────────────────────────────
  {
    name: 'Hermeus',
    legalName: 'Hermeus Corporation',
    slug: 'hermeus',
    headquarters: 'Atlanta, Georgia',
    country: 'United States',
    foundedYear: 2018,
    employeeRange: '101-500',
    employeeCount: 200,
    website: 'https://www.hermeus.com',
    description: 'Hermeus is developing hypersonic aircraft and reusable space access vehicles powered by its turbine-based combined cycle engine technology. The company bridges the gap between high-speed atmospheric flight and space access for both defense and commercial applications.',
    longDescription: 'Hermeus Corporation is a venture-backed aerospace startup developing hypersonic aircraft capable of Mach 5+ speeds using its proprietary Chimera turbine-based combined cycle (TBCC) engine. The company\'s Quarterhorse and Darkhorse autonomous aircraft programs are designed for rapid global strike, ISR, and eventually point-to-point hypersonic transport. Hermeus has secured contracts with the U.S. Air Force and DARPA, and its engine technology has potential applications for reusable space access vehicles that could transition from air-breathing to rocket propulsion for orbital insertion.',
    ceo: 'AJ Piplica',
    isPublic: false,
    ownershipType: 'private',
    totalFunding: 230000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2024-01-01',
    valuation: 1000000000,
    sector: 'defense-space',
    subsector: 'hypersonic-systems',
    tags: ['hypersonic', 'space-access', 'TBCC-engines', 'defense-startup'],
    tier: 3,
    products: [
      {
        name: 'Chimera TBCC Engine',
        category: 'propulsion',
        description: 'Turbine-based combined cycle engine capable of transitioning from subsonic turbofan to ramjet mode, enabling Mach 5+ flight with potential space access applications.',
        status: 'development',
      },
      {
        name: 'Quarterhorse',
        category: 'aircraft',
        description: 'Autonomous hypersonic aircraft demonstrator designed to validate Chimera engine technology at Mach 5+ speeds.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'AJ Piplica',
        title: 'Co-Founder and CEO',
        role: 'executive',
        bio: 'Co-founded Hermeus after working on propulsion systems at Generation Orbit and Blue Origin. Leads the company\'s vision for hypersonic and space access technology.',
        previousCompanies: ['Generation Orbit', 'Blue Origin'],
      },
    ],
    fundingRounds: [
      {
        date: '2024-01-01',
        amount: 100000000,
        seriesLabel: 'C',
        roundType: 'series_c',
        leadInvestor: 'Sam Altman',
      },
    ],
    events: [
      {
        date: '2018-03-01',
        type: 'founding',
        title: 'Hermeus Corporation founded',
        description: 'Founded in Atlanta by former Blue Origin and Generation Orbit engineers to develop hypersonic aircraft with reusable space access potential.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Hermeus Headquarters & Test Facility',
        type: 'headquarters',
        city: 'Atlanta',
        state: 'Georgia',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 45 },
    ],
  },

  // ─── 8. Rebellion Defence ───────────────────────────────────────────────────
  {
    name: 'Rebellion Defence',
    legalName: 'Rebellion Defence Ltd.',
    slug: 'rebellion-defence',
    headquarters: 'London, England',
    country: 'United Kingdom',
    foundedYear: 2019,
    employeeRange: '101-500',
    employeeCount: 150,
    website: 'https://www.rebelliondefence.com',
    description: 'Rebellion Defence applies artificial intelligence and machine learning to defense challenges including space domain awareness and satellite operations. The UK-based startup provides AI tools for military decision-making and threat assessment across multiple domains.',
    longDescription: 'Rebellion Defence is a UK-based defense AI company spun out from the Rebellion group (the video game developer). The company builds AI and machine learning tools for defense and national security customers in the UK, US, and allied nations. Its products focus on using AI to accelerate decision-making, automate intelligence analysis, and enhance space domain awareness. Rebellion Defence works with the UK Ministry of Defence and NATO allies on applications including space surveillance, satellite anomaly detection, and predictive analytics for orbital operations.',
    ceo: 'Jason Kingdon',
    isPublic: false,
    ownershipType: 'private',
    totalFunding: 150000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2022-06-01',
    sector: 'defense-space',
    subsector: 'defense-AI',
    tags: ['defense-AI', 'space-domain-awareness', 'UK-defense', 'machine-learning'],
    tier: 3,
    products: [
      {
        name: 'Rebellion AI Platform',
        category: 'software',
        description: 'AI and machine learning platform for defense decision-making, including space domain awareness, threat detection, and intelligence analysis applications.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Jason Kingdon',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Rebellion Defence, bringing experience from the Rebellion group and a background in AI and technology entrepreneurship in the UK defense sector.',
        previousCompanies: ['Rebellion Group'],
      },
    ],
    fundingRounds: [
      {
        date: '2022-06-01',
        amount: 100000000,
        seriesLabel: 'B',
        roundType: 'series_b',
      },
    ],
    events: [
      {
        date: '2019-01-01',
        type: 'founding',
        title: 'Rebellion Defence founded',
        description: 'Spun out from the Rebellion group to apply AI and machine learning technology to defense and national security challenges.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Rebellion Defence London Office',
        type: 'headquarters',
        city: 'London',
        state: 'England',
        country: 'United Kingdom',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 42 },
    ],
  },

  // ─── 9. Second Front Systems ────────────────────────────────────────────────
  {
    name: 'Second Front Systems',
    legalName: 'Second Front Systems, Inc.',
    slug: 'second-front-systems',
    headquarters: 'Washington, D.C.',
    country: 'United States',
    foundedYear: 2019,
    employeeRange: '51-100',
    employeeCount: 80,
    website: 'https://www.secondfront.com',
    description: 'Second Front Systems provides the Game Warden platform that accelerates software delivery to the Department of Defense, including space mission applications. The company enables rapid deployment of commercial software to classified and space operations environments.',
    longDescription: 'Second Front Systems is a defense software company that bridges the gap between commercial software innovation and Department of Defense operations. Its Game Warden platform provides a DevSecOps environment that enables rapid deployment of containerized applications to DoD networks, including classified environments used by the U.S. Space Force. The platform handles the complex Authority to Operate (ATO) process, allowing commercial software companies to deliver their products to space operations, satellite management, and defense intelligence customers without navigating years of compliance bureaucracy.',
    ceo: 'Enrique Oti',
    isPublic: false,
    ownershipType: 'private',
    totalFunding: 72000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-01-01',
    sector: 'defense-space',
    subsector: 'defense-software',
    tags: ['DevSecOps', 'DoD-software-delivery', 'space-operations', 'Game-Warden'],
    tier: 3,
    products: [
      {
        name: 'Game Warden',
        category: 'software',
        description: 'DevSecOps platform that enables rapid deployment of commercial software applications to DoD classified networks, including U.S. Space Force operations environments.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Enrique Oti',
        title: 'Co-Founder and CEO',
        role: 'executive',
        bio: 'Co-founded Second Front Systems to solve the software delivery bottleneck in DoD. Former Marine and defense technology executive.',
        previousCompanies: ['U.S. Marine Corps', 'Kessel Run'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-01-01',
        amount: 35000000,
        seriesLabel: 'B',
        roundType: 'series_b',
      },
    ],
    events: [
      {
        date: '2019-08-01',
        type: 'founding',
        title: 'Second Front Systems founded',
        description: 'Founded to accelerate the delivery of commercial software to Department of Defense operations, including space mission systems.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Second Front Systems HQ',
        type: 'headquarters',
        city: 'Washington',
        state: 'D.C.',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 44 },
    ],
  },

  // ─── 10. Collins Aerospace (RTX) ────────────────────────────────────────────
  {
    name: 'Collins Aerospace',
    legalName: 'Collins Aerospace Systems',
    slug: 'collins-aerospace',
    ticker: 'RTX',
    exchange: 'NYSE',
    headquarters: 'Charlotte, North Carolina',
    country: 'United States',
    foundedYear: 2018,
    employeeRange: '50001-100000',
    employeeCount: 76000,
    website: 'https://www.collinsaerospace.com',
    description: 'Collins Aerospace, a division of RTX Corporation, provides space suits, environmental control and life support systems (ECLSS), and avionics for human spaceflight and ISS operations. The company is a key supplier for NASA and commercial space programs.',
    longDescription: 'Collins Aerospace is one of the world\'s largest aerospace and defense suppliers, formed from the 2018 merger of UTC Aerospace Systems and Rockwell Collins. As a division of RTX Corporation (formerly Raytheon Technologies), Collins Aerospace provides critical space systems including extravehicular activity (EVA) space suits, environmental control and life support systems for the International Space Station and future commercial stations, and space-rated avionics and power systems. The company also supplies satellite components, space-qualified actuators, and communication systems for both military and commercial space programs.',
    ceo: 'Chris Calio',
    parentCompany: 'RTX Corporation',
    isPublic: true,
    marketCap: 160000000000,
    revenueEstimate: 21000000000,
    ownershipType: 'subsidiary',
    sector: 'defense-space',
    subsector: 'space-systems',
    tags: ['space-suits', 'ECLSS', 'human-spaceflight', 'ISS-systems', 'avionics'],
    tier: 2,
    products: [
      {
        name: 'Extravehicular Mobility Unit (EMU) Space Suit',
        category: 'life-support',
        description: 'Space suits and extravehicular activity systems used aboard the International Space Station, with next-generation designs for Artemis lunar missions.',
        status: 'active',
      },
      {
        name: 'Environmental Control and Life Support System (ECLSS)',
        category: 'life-support',
        description: 'Advanced life support systems providing atmospheric management, water recovery, and thermal control for the ISS and future commercial space stations.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Chris Calio',
        title: 'President, RTX Corporation',
        role: 'executive',
        bio: 'Leads RTX Corporation which includes Collins Aerospace. Oversees the company\'s space systems portfolio and human spaceflight programs.',
        previousCompanies: ['Pratt & Whitney'],
      },
      {
        name: 'Phil Jasper',
        title: 'President, Collins Aerospace',
        role: 'executive',
        bio: 'Leads Collins Aerospace, overseeing its space, avionics, and mission systems divisions serving both military and commercial customers.',
      },
    ],
    events: [
      {
        date: '2018-11-26',
        type: 'founding',
        title: 'Collins Aerospace formed',
        description: 'Created through the merger of UTC Aerospace Systems and Rockwell Collins as part of United Technologies\' acquisition strategy, combining space heritage from both companies.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Collins Aerospace Space Systems',
        type: 'manufacturing',
        city: 'Windsor Locks',
        state: 'Connecticut',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 65 },
    ],
  },

  // ─── 11. Moog Inc. ──────────────────────────────────────────────────────────
  {
    name: 'Moog Inc.',
    legalName: 'Moog Inc.',
    slug: 'moog-inc',
    ticker: 'MOG.A',
    exchange: 'NYSE',
    headquarters: 'East Aurora, New York',
    country: 'United States',
    foundedYear: 1951,
    employeeRange: '10001-50000',
    employeeCount: 14000,
    website: 'https://www.moog.com',
    description: 'Moog Inc. is a precision motion control manufacturer providing space actuators, propulsion systems, and avionics for satellites and launch vehicles. The company supplies critical components for nearly every major U.S. and European space program.',
    longDescription: 'Moog Inc. is a global manufacturer of precision motion control components and systems serving aerospace, defense, and space markets. The company\'s Space and Defense group provides spacecraft actuators, reaction wheel assemblies, solar array drive mechanisms, thruster valves, and propulsion systems used on satellites, launch vehicles, and space exploration missions. Moog components are aboard hundreds of satellites and have been integral to programs including James Webb Space Telescope, Mars rovers, GPS satellites, and commercial communications constellations. The company is also developing next-generation electric propulsion components and in-space servicing mechanisms.',
    ceo: 'Pat Roche',
    isPublic: true,
    marketCap: 5500000000,
    revenueEstimate: 3400000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'space-components',
    tags: ['space-actuators', 'propulsion-components', 'satellite-mechanisms', 'precision-motion', 'avionics'],
    tier: 2,
    products: [
      {
        name: 'Spacecraft Actuation Systems',
        category: 'components',
        description: 'Precision actuators, reaction wheel assemblies, and solar array drive mechanisms for satellite attitude control and mechanism deployment.',
        status: 'active',
      },
      {
        name: 'Space Propulsion Components',
        category: 'propulsion',
        description: 'Thruster valves, propellant management devices, and propulsion system components for satellite station-keeping and orbit transfer.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Pat Roche',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Moog Inc. overseeing its space and defense operations, which supply precision components to virtually every major space program in the Western world.',
        previousCompanies: ['Moog (career)'],
      },
    ],
    events: [
      {
        date: '1951-08-01',
        type: 'founding',
        title: 'Moog Inc. founded',
        description: 'Founded by William Moog in East Aurora, New York to develop precision servo valves, which became foundational technology for aerospace and space actuators.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Moog Space and Defense HQ',
        type: 'headquarters',
        city: 'East Aurora',
        state: 'New York',
        country: 'United States',
      },
      {
        name: 'Moog Space and Defense Operations',
        type: 'manufacturing',
        city: 'Chatsworth',
        state: 'California',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
    ],
  },

  // ─── 12. Curtiss-Wright ─────────────────────────────────────────────────────
  {
    name: 'Curtiss-Wright Corporation',
    legalName: 'Curtiss-Wright Corporation',
    slug: 'curtiss-wright',
    ticker: 'CW',
    exchange: 'NYSE',
    headquarters: 'Davidson, North Carolina',
    country: 'United States',
    foundedYear: 1929,
    employeeRange: '5001-10000',
    employeeCount: 8200,
    website: 'https://www.curtisswright.com',
    description: 'Curtiss-Wright provides defense electronics, space-rated computing modules, and ruggedized data handling systems for satellite and launch vehicle applications. The company supplies radiation-hardened components and embedded computing solutions for space programs.',
    longDescription: 'Curtiss-Wright Corporation is a diversified industrial company with deep roots in aviation history, descended from the Wright brothers\' and Glenn Curtiss\' original companies. Today, its Defense Solutions division manufactures rugged embedded computing modules, data acquisition systems, and electronic components qualified for space and defense applications. The company provides radiation-tolerant and space-rated electronics used in satellite payloads, launch vehicle avionics, and missile defense systems. Curtiss-Wright also supplies nuclear propulsion components for naval vessels, giving it relevant technology for future nuclear thermal propulsion in space.',
    ceo: 'Lynn Bamford',
    isPublic: true,
    marketCap: 11000000000,
    revenueEstimate: 2900000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'defense-electronics',
    tags: ['space-rated-electronics', 'defense-electronics', 'rugged-computing', 'nuclear-propulsion'],
    tier: 3,
    products: [
      {
        name: 'Space-Rated Embedded Computing Modules',
        category: 'electronics',
        description: 'Radiation-hardened and space-qualified single board computers and data processing modules for satellite payloads and launch vehicle avionics.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Lynn Bamford',
        title: 'Chair and CEO',
        role: 'executive',
        bio: 'Has led Curtiss-Wright since 2021, driving growth in defense electronics and expanding the company\'s space-rated product portfolio.',
        previousCompanies: ['Curtiss-Wright (career)'],
      },
    ],
    events: [
      {
        date: '1929-07-05',
        type: 'founding',
        title: 'Curtiss-Wright Corporation founded',
        description: 'Formed through the merger of companies founded by aviation pioneers Glenn Curtiss and the Wright brothers, creating one of America\'s earliest aerospace firms.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Curtiss-Wright Defense Solutions',
        type: 'headquarters',
        city: 'Davidson',
        state: 'North Carolina',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },

  // ─── 13. BWX Technologies ──────────────────────────────────────────────────
  {
    name: 'BWX Technologies',
    legalName: 'BWX Technologies, Inc.',
    slug: 'bwx-technologies',
    ticker: 'BWXT',
    exchange: 'NYSE',
    headquarters: 'Lynchburg, Virginia',
    country: 'United States',
    foundedYear: 2015,
    employeeRange: '5001-10000',
    employeeCount: 7800,
    website: 'https://www.bwxt.com',
    description: 'BWX Technologies is the leading developer of nuclear thermal propulsion systems for space and manufactures nuclear reactors for NASA deep-space missions. The company brings decades of naval nuclear expertise to next-generation space power and propulsion.',
    longDescription: 'BWX Technologies (BWXT) is the sole manufacturer of nuclear fuel and reactor components for the U.S. Navy\'s nuclear fleet and is leveraging that expertise for space nuclear applications. The company is the prime contractor for NASA\'s DRACO nuclear thermal propulsion program in partnership with DARPA, developing a nuclear thermal rocket engine designed to dramatically reduce transit times for Mars missions. BWXT also produces radioisotope power systems, microreactors for lunar surface power, and nuclear fuel for space reactor applications. The company\'s heritage traces back to Babcock & Wilcox, with over 60 years of nuclear technology leadership.',
    ceo: 'Rex Geveden',
    isPublic: true,
    marketCap: 14000000000,
    revenueEstimate: 2700000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'nuclear-space-propulsion',
    tags: ['nuclear-thermal-propulsion', 'space-reactors', 'DRACO', 'nuclear-power', 'deep-space'],
    tier: 2,
    products: [
      {
        name: 'DRACO Nuclear Thermal Rocket Engine',
        category: 'propulsion',
        description: 'Nuclear thermal propulsion system being developed under NASA/DARPA contract to enable rapid transit to Mars, using a compact nuclear reactor to heat propellant.',
        status: 'development',
      },
      {
        name: 'Kilopower/KRUSTY Space Reactor',
        category: 'power-systems',
        description: 'Compact nuclear fission reactor designed to provide kilowatts of power for lunar surface operations and deep-space missions.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Rex Geveden',
        title: 'President and CEO',
        role: 'executive',
        bio: 'Former NASA Associate Administrator who leads BWXT, bridging the company\'s naval nuclear expertise with space nuclear propulsion and power applications.',
        previousCompanies: ['NASA', 'Teledyne Brown Engineering'],
      },
    ],
    events: [
      {
        date: '2015-06-30',
        type: 'founding',
        title: 'BWX Technologies spun off from Babcock & Wilcox',
        description: 'Spun off as an independent company from Babcock & Wilcox, focusing on nuclear operations for government and defense applications including space nuclear programs.',
        importance: 7,
      },
    ],
    contracts: [
      {
        agency: 'NASA / DARPA',
        title: 'DRACO Nuclear Thermal Propulsion Development',
        description: 'Prime contract to design, build, and test a nuclear thermal rocket engine for the Demonstration Rocket for Agile Cislunar Operations program.',
        awardDate: '2023-07-01',
        value: 500000000,
      },
    ],
    facilities: [
      {
        name: 'BWXT Nuclear Operations Group',
        type: 'manufacturing',
        city: 'Lynchburg',
        state: 'Virginia',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 66 },
    ],
  },

  // ─── 14. Elbit Systems ──────────────────────────────────────────────────────
  {
    name: 'Elbit Systems',
    legalName: 'Elbit Systems Ltd.',
    slug: 'elbit-systems',
    ticker: 'ESLT',
    exchange: 'NASDAQ',
    headquarters: 'Haifa, Israel',
    country: 'Israel',
    foundedYear: 1966,
    employeeRange: '10001-50000',
    employeeCount: 20000,
    website: 'https://elbitsystems.com',
    description: 'Elbit Systems is an Israeli defense electronics company providing space electro-optics, satellite payloads, and UAV-space synergy systems. The company leverages its expertise in surveillance and reconnaissance for both atmospheric and space-based observation platforms.',
    longDescription: 'Elbit Systems is one of Israel\'s largest defense electronics companies, providing a broad range of solutions across land, sea, air, space, and cyber domains. In the space sector, Elbit develops advanced electro-optical payloads for reconnaissance satellites, space-qualified imaging systems, and satellite communication components. The company leverages its world-leading UAV and surveillance expertise to develop synergies between aerial and space-based observation platforms. Elbit has contributed to Israeli national satellite programs including the OFEQ reconnaissance satellite series and EROS commercial imaging satellites, and exports its space-qualified electro-optical technology to international customers.',
    ceo: 'Bezhalel Machlis',
    isPublic: true,
    marketCap: 11500000000,
    revenueEstimate: 6300000000,
    ownershipType: 'public',
    sector: 'defense-space',
    subsector: 'space-electro-optics',
    tags: ['electro-optics', 'satellite-payloads', 'UAV-space-synergy', 'Israeli-defense', 'reconnaissance'],
    tier: 2,
    products: [
      {
        name: 'Space Electro-Optical Imaging Payloads',
        category: 'payloads',
        description: 'Advanced electro-optical and infrared imaging payloads for reconnaissance and earth observation satellites, leveraging decades of Israeli satellite program heritage.',
        status: 'active',
      },
      {
        name: 'Integrated UAV-Satellite ISR Systems',
        category: 'systems-integration',
        description: 'Integrated intelligence, surveillance, and reconnaissance systems that combine UAV and satellite data for comprehensive multi-layer observation coverage.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Bezhalel Machlis',
        title: 'President and CEO',
        role: 'executive',
        bio: 'Has led Elbit Systems since 2013, expanding the company\'s space and electro-optics capabilities while growing its international defense business.',
        previousCompanies: ['Israel Military Industries'],
      },
    ],
    events: [
      {
        date: '1966-01-01',
        type: 'founding',
        title: 'Elbit Systems founded',
        description: 'Founded in Haifa, Israel as Elbit Computers, evolving into one of Israel\'s premier defense electronics companies with significant space capabilities.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Elbit Systems Headquarters',
        type: 'headquarters',
        city: 'Haifa',
        country: 'Israel',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 63 },
    ],
  },

  // ─── 15. Israel Aerospace Industries ────────────────────────────────────────
  {
    name: 'Israel Aerospace Industries',
    legalName: 'Israel Aerospace Industries Ltd.',
    slug: 'israel-aerospace-industries',
    headquarters: 'Ben Gurion International Airport, Israel',
    country: 'Israel',
    foundedYear: 1953,
    employeeRange: '10001-50000',
    employeeCount: 15000,
    website: 'https://www.iai.co.il',
    description: 'Israel Aerospace Industries is Israel\'s state-owned aerospace and defense company, operating the Spacecom subsidiary for communications satellites and manufacturing the AMOS commercial satellite series and OFEQ reconnaissance satellites.',
    longDescription: 'Israel Aerospace Industries (IAI) is Israel\'s largest defense and aerospace company, wholly owned by the State of Israel. IAI\'s Space Division is responsible for building Israel\'s national satellites, including the OFEQ series of military reconnaissance satellites known for their remarkable capabilities despite their small size. Through its Spacecom subsidiary, IAI operates the AMOS commercial communications satellite fleet serving the Middle East, Europe, and Asia. IAI also develops space-qualified electronics, satellite structures, and mission systems, and has launched satellites into retrograde orbit to counter Israel\'s geographic constraints. The company is expanding into small satellite constellations and space-based surveillance systems.',
    ceo: 'Boaz Levy',
    isPublic: false,
    ownershipType: 'state-owned',
    revenueEstimate: 5200000000,
    sector: 'defense-space',
    subsector: 'satellites-launch',
    tags: ['AMOS-satellites', 'OFEQ-reconnaissance', 'Spacecom', 'Israeli-space', 'state-owned'],
    tier: 2,
    products: [
      {
        name: 'AMOS Communications Satellite Series',
        category: 'satellites',
        description: 'Commercial geostationary communications satellites operated by Spacecom, providing broadcast, broadband, and government communication services across the Middle East, Europe, and Asia.',
        status: 'active',
      },
      {
        name: 'OFEQ Reconnaissance Satellite Series',
        category: 'satellites',
        description: 'Military reconnaissance satellite series featuring compact, high-resolution electro-optical imaging capabilities launched into retrograde orbit from Israel.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Boaz Levy',
        title: 'President and CEO',
        role: 'executive',
        bio: 'Has led IAI since 2021, overseeing the company\'s space, missile defense, and military aviation divisions as Israel\'s largest defense enterprise.',
        previousCompanies: ['IAI Systems Missiles & Space Division'],
      },
    ],
    events: [
      {
        date: '1953-01-01',
        type: 'founding',
        title: 'Israel Aerospace Industries founded',
        description: 'Established as Bedek Aviation Company by Al Schwimmer, later renamed Israel Aircraft Industries and then Israel Aerospace Industries, becoming the cornerstone of Israel\'s aerospace and space industry.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'IAI Headquarters & Space Division',
        type: 'headquarters',
        city: 'Lod',
        country: 'Israel',
      },
      {
        name: 'MBT Space Division',
        type: 'manufacturing',
        city: 'Yehud',
        country: 'Israel',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 64 },
    ],
  },

  // ─── 16. Hanwha Systems ─────────────────────────────────────────────────────
  {
    name: 'Hanwha Systems',
    legalName: 'Hanwha Systems Co., Ltd.',
    slug: 'hanwha-systems',
    ticker: '272210.KS',
    exchange: 'KRX',
    headquarters: 'Seongnam, South Korea',
    country: 'South Korea',
    foundedYear: 2018,
    employeeRange: '5001-10000',
    employeeCount: 7000,
    website: 'https://www.hanwhasystems.com',
    description: 'Hanwha Systems is a South Korean defense and ICT company with growing space ambitions, including a major investment in OneWeb and development of satellite communication systems. The company bridges Korean defense technology with global LEO constellation infrastructure.',
    longDescription: 'Hanwha Systems is the defense electronics and ICT subsidiary of the Hanwha Group, one of South Korea\'s largest conglomerates. The company has made a strategic push into the space sector through a $300 million investment in OneWeb, the LEO broadband satellite constellation, and is developing satellite communication terminals and ground systems. Hanwha Systems also provides defense electronics including radar systems, electronic warfare suites, and command-and-control systems for the South Korean military. The company\'s space strategy focuses on becoming a key player in the satellite communications value chain, from ground terminals to constellation operations, while leveraging Hanwha Group\'s broader space ambitions through Hanwha Aerospace\'s rocket engine and satellite manufacturing programs.',
    ceo: 'Eoh Sung-chul',
    isPublic: true,
    marketCap: 5000000000,
    revenueEstimate: 2200000000,
    ownershipType: 'subsidiary',
    parentCompany: 'Hanwha Group',
    sector: 'defense-space',
    subsector: 'satellite-communications',
    tags: ['OneWeb-investor', 'satellite-comms', 'Korean-defense', 'LEO-constellation', 'ground-systems'],
    tier: 2,
    products: [
      {
        name: 'Satellite Communication Terminal Systems',
        category: 'ground-systems',
        description: 'Military and commercial satellite communication terminals compatible with LEO, MEO, and GEO constellation architectures, including OneWeb ground integration.',
        status: 'active',
      },
      {
        name: 'Defense Radar and EW Systems',
        category: 'defense-electronics',
        description: 'Advanced radar systems and electronic warfare suites for the South Korean military with technology applicable to space surveillance and tracking.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Eoh Sung-chul',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Hanwha Systems\' expansion into space and satellite communications while maintaining the company\'s core defense electronics business.',
        previousCompanies: ['Hanwha Group'],
      },
    ],
    fundingRounds: [
      {
        date: '2021-04-01',
        amount: 300000000,
        roundType: 'strategic_investment',
        seriesLabel: 'OneWeb Investment',
      },
    ],
    events: [
      {
        date: '2018-01-01',
        type: 'founding',
        title: 'Hanwha Systems established',
        description: 'Spun off from Hanwha Thales as an independent defense electronics and ICT company within the Hanwha Group, with a strategic mandate to expand into space and satellite communications.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Hanwha Systems Headquarters',
        type: 'headquarters',
        city: 'Seongnam',
        country: 'South Korea',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
    ],
  },
];

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
  console.log('🚀 Seeding Batch 2: Defense Primes & Subcontractors...\n');
  for (const company of COMPANIES) {
    try {
      const p = await seedCompanyProfile(company);
      console.log(`  ✓ ${company.name} (${p.id})`);
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`);
    }
  }
  const total = await prisma.companyProfile.count();
  console.log(`\n✅ Batch 2 done! Total company profiles: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
