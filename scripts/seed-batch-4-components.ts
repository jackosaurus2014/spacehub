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

// ============================================================================
// BATCH 4: Components & Manufacturing Supply Chain (15 companies)
// ============================================================================

const COMPANIES: CompanyData[] = [
  // ---------------------------------------------------------------------------
  // 1. Safran
  // ---------------------------------------------------------------------------
  {
    name: 'Safran',
    legalName: 'Safran SA',
    slug: 'safran',
    ticker: 'SAF.PA',
    exchange: 'Euronext',
    headquarters: 'Paris, France',
    country: 'France',
    foundedYear: 2005,
    employeeRange: '5000+',
    employeeCount: 83000,
    website: 'https://www.safran-group.com',
    description: 'Safran is a leading French aerospace and defense group specializing in aircraft engines, rocket propulsion, and aerospace equipment. The company produces the Vulcain and Vinci engines that power the Ariane launch vehicle family, making it a cornerstone of European space access.',
    longDescription: 'Formed in 2005 from the merger of Snecma and Sagem, Safran has grown into one of the world\'s largest aerospace suppliers. Through its subsidiary ArianeGroup (a 50/50 joint venture with Airbus), Safran develops and manufactures the cryogenic rocket engines that power Europe\'s Ariane 5 and Ariane 6 launchers. The Vulcain engine serves as the main stage engine while the re-ignitable Vinci engine powers the upper stage. Beyond space propulsion, Safran is a global leader in aircraft engines through its CFM International joint venture with GE Aviation, producing the best-selling CFM56 and LEAP engine families.',
    ceo: 'Olivier Andries',
    isPublic: true,
    marketCap: 95000000000,
    revenueEstimate: 23000000000,
    ownershipType: 'public',
    sector: 'propulsion',
    subsector: 'rocket-engines',
    tags: ['rocket-engines', 'ariane', 'propulsion', 'european-space', 'defense'],
    tier: 2,
    products: [
      {
        name: 'Vulcain 2.1',
        category: 'Rocket Engine',
        description: 'Cryogenic main-stage engine for Ariane 6, producing 135 tonnes of thrust using liquid hydrogen and liquid oxygen.',
        status: 'active',
        specs: { thrust_kn: 1359, propellant: 'LH2/LOX', application: 'Ariane 6 core stage' },
      },
      {
        name: 'Vinci',
        category: 'Rocket Engine',
        description: 'Re-ignitable cryogenic upper-stage engine for Ariane 6, enabling complex multi-burn mission profiles.',
        status: 'active',
        specs: { thrust_kn: 180, propellant: 'LH2/LOX', reignitions: 'multiple', application: 'Ariane 6 upper stage' },
      },
      {
        name: 'M51 Solid Rocket Motor',
        category: 'Solid Propulsion',
        description: 'Strategic solid-propellant ballistic missile motor for the French Navy submarine-launched deterrent.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Olivier Andries',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO of Safran since January 2021, previously served as CEO of Safran Aircraft Engines.',
        previousCompanies: ['Safran Aircraft Engines', 'Snecma'],
      },
      {
        name: 'Pascal Bantegnie',
        title: 'Chief Technology Officer',
        role: 'technical',
        bio: 'Leads Safran\'s R&D efforts across propulsion, materials, and avionics technologies.',
      },
    ],
    events: [
      {
        date: '2005-05-11',
        type: 'founding',
        title: 'Safran formed from Snecma-Sagem merger',
        description: 'Safran was created through the merger of Snecma (engines) and Sagem (defense electronics), forming a major French aerospace group.',
        importance: 9,
      },
      {
        date: '2023-07-05',
        type: 'milestone',
        title: 'Ariane 6 Vulcain 2.1 engine qualification',
        description: 'Successful qualification of the Vulcain 2.1 engine for the Ariane 6 launcher program.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Vernon Rocket Engine Facility',
        type: 'manufacturing',
        city: 'Vernon',
        state: 'Normandy',
        country: 'France',
      },
      {
        name: 'Safran Aircraft Engines HQ',
        type: 'headquarters',
        city: 'Gennevilliers',
        country: 'France',
      },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 23000000000, source: 'Annual Report', confidenceLevel: 'reported' },
      { year: 2024, revenue: 27000000000, source: 'Guidance', confidenceLevel: 'estimate' },
    ],
    scores: [
      { scoreType: 'overall', score: 82 },
      { scoreType: 'technology', score: 88 },
      { scoreType: 'market_position', score: 85 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. OHB SE
  // ---------------------------------------------------------------------------
  {
    name: 'OHB SE',
    legalName: 'OHB SE',
    slug: 'ohb-se',
    ticker: 'OHB.DE',
    exchange: 'XETRA',
    headquarters: 'Bremen, Germany',
    country: 'Germany',
    foundedYear: 1981,
    employeeRange: '1001-5000',
    employeeCount: 3200,
    website: 'https://www.ohb.de',
    description: 'OHB SE is a leading European space and technology company specializing in satellite manufacturing, Earth observation, and navigation systems. The company is a prime contractor for the European Galileo navigation satellites and contributes to the Meteosat Third Generation (MTG) program.',
    longDescription: 'Founded in 1981 in Bremen, Germany, OHB has grown from a small engineering firm into one of Europe\'s top three space companies. As prime contractor for the Galileo navigation constellation, OHB has delivered over 30 satellites that form the backbone of Europe\'s independent satellite navigation system. The company also builds Earth observation satellites, scientific missions, and provides launch services through its subsidiary MT Aerospace, which manufactures structures for the Ariane launcher family.',
    ceo: 'Marco Fuchs',
    isPublic: true,
    marketCap: 750000000,
    revenueEstimate: 1200000000,
    ownershipType: 'public',
    sector: 'manufacturing',
    subsector: 'satellite-manufacturing',
    tags: ['satellite-manufacturing', 'galileo', 'earth-observation', 'european-space', 'navigation'],
    tier: 2,
    products: [
      {
        name: 'Galileo Navigation Satellites',
        category: 'Navigation Satellite',
        description: 'Medium Earth orbit navigation satellites for the European Galileo constellation, providing global positioning services.',
        status: 'active',
        specs: { orbit: 'MEO', altitude_km: 23222, constellation_size: 30, accuracy: 'sub-meter' },
      },
      {
        name: 'EnMAP Hyperspectral Satellite',
        category: 'Earth Observation',
        description: 'Environmental mapping and analysis satellite using hyperspectral imaging for land and water resource monitoring.',
        status: 'active',
      },
      {
        name: 'MTG-S (Meteosat Third Generation Sounder)',
        category: 'Weather Satellite',
        description: 'Infrared sounding satellite for next-generation European weather forecasting, built as part of the MTG program.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Marco Fuchs',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO and majority shareholder of OHB SE, guiding the company since 2000. Holds a law degree and MBA.',
        previousCompanies: ['OHB-System'],
      },
      {
        name: 'Lutz Bertling',
        title: 'Chief Operating Officer',
        role: 'executive',
        bio: 'COO responsible for operations and new business development, with extensive aerospace industry experience.',
        previousCompanies: ['Airbus Helicopters'],
      },
    ],
    events: [
      {
        date: '1981-01-01',
        type: 'founding',
        title: 'OHB founded in Bremen',
        description: 'OHB was founded as Otto Hydraulik Bremen, initially focused on hydraulic systems before pivoting to space technology.',
        importance: 7,
      },
      {
        date: '2010-01-07',
        type: 'contract',
        title: 'Galileo FOC satellite contract award',
        description: 'ESA selected OHB as prime contractor for 14 Galileo Full Operational Capability satellites.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'OHB System AG HQ & Cleanroom',
        type: 'manufacturing',
        city: 'Bremen',
        country: 'Germany',
      },
      {
        name: 'MT Aerospace',
        type: 'manufacturing',
        city: 'Augsburg',
        country: 'Germany',
      },
    ],
    contracts: [
      {
        agency: 'ESA',
        title: 'Galileo Batch 3 Satellites',
        description: 'Contract for additional Galileo second-generation navigation satellites.',
        awardDate: '2021-01-20',
        value: 1470000000,
      },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 1200000000, source: 'Annual Report', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'overall', score: 72 },
      { scoreType: 'technology', score: 78 },
      { scoreType: 'market_position', score: 70 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Leonardo
  // ---------------------------------------------------------------------------
  {
    name: 'Leonardo',
    legalName: 'Leonardo S.p.A.',
    slug: 'leonardo',
    ticker: 'LDO.MI',
    exchange: 'Borsa Italiana',
    headquarters: 'Rome, Italy',
    country: 'Italy',
    foundedYear: 1948,
    employeeRange: '5000+',
    employeeCount: 53000,
    website: 'https://www.leonardo.com',
    description: 'Leonardo is a major Italian aerospace, defense, and security company with significant space capabilities through its partnership in Thales Alenia Space. The company excels in electro-optics, space electronics, satellite communications, and Earth observation systems.',
    longDescription: 'Tracing its origins to 1948 as Finmeccanica, Leonardo is one of the world\'s largest defense and aerospace companies. In the space domain, Leonardo holds a 33% stake in Thales Alenia Space (with Thales holding 67%), one of Europe\'s premier satellite manufacturers. Leonardo\'s own space division produces advanced electro-optical instruments, star trackers, solar arrays, and space-qualified electronics. The company\'s products fly on major ESA missions including COSMO-SkyMed radar satellites and the ExoMars rover. Leonardo is also a key contributor to the International Space Station through its construction of pressurized modules.',
    ceo: 'Roberto Cingolani',
    isPublic: true,
    marketCap: 16000000000,
    revenueEstimate: 15800000000,
    ownershipType: 'public',
    sector: 'components',
    subsector: 'electro-optics',
    tags: ['electro-optics', 'satellite-components', 'defense', 'thales-alenia-space', 'earth-observation'],
    tier: 2,
    products: [
      {
        name: 'Star Tracker AA-STR',
        category: 'Spacecraft Component',
        description: 'Autonomous star tracker for spacecraft attitude determination, used on numerous European and international satellite missions.',
        status: 'active',
        specs: { accuracy_arcsec: 2, mass_kg: 3.5, application: 'Attitude determination' },
      },
      {
        name: 'COSMO-SkyMed Second Generation',
        category: 'Radar Satellite',
        description: 'X-band SAR satellite constellation for all-weather, day-night Earth observation and security monitoring.',
        status: 'active',
      },
      {
        name: 'Space Solar Arrays',
        category: 'Power Systems',
        description: 'High-efficiency solar array systems for satellites and space platforms, including flexible and deployable designs.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Roberto Cingolani',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO since 2023, physicist and former Italian Minister for Ecological Transition. Previously led the Italian Institute of Technology.',
        previousCompanies: ['Italian Institute of Technology'],
      },
      {
        name: 'Lorenzo Mariani',
        title: 'Co-General Manager - Strategic Business',
        role: 'executive',
        bio: 'Oversees Leonardo\'s space, cyber security, and electronics divisions.',
      },
    ],
    events: [
      {
        date: '1948-01-01',
        type: 'founding',
        title: 'Finmeccanica founded',
        description: 'Finmeccanica was established as a state-owned holding company, later becoming Leonardo in 2017.',
        importance: 8,
      },
      {
        date: '2007-04-01',
        type: 'partnership',
        title: 'Thales Alenia Space joint venture formed',
        description: 'Leonardo (then Finmeccanica) and Thales formed the Thales Alenia Space joint venture, combining satellite manufacturing capabilities.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'Leonardo Space Facility',
        type: 'manufacturing',
        city: 'Campi Bisenzio',
        state: 'Florence',
        country: 'Italy',
      },
      {
        name: 'Leonardo Corporate HQ',
        type: 'headquarters',
        city: 'Rome',
        country: 'Italy',
      },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 15800000000, source: 'Annual Report', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'overall', score: 78 },
      { scoreType: 'technology', score: 82 },
      { scoreType: 'market_position', score: 80 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. RUAG Space (Beyond Gravity)
  // ---------------------------------------------------------------------------
  {
    name: 'RUAG Space',
    legalName: 'Beyond Gravity AG',
    slug: 'ruag-space',
    headquarters: 'Zurich, Switzerland',
    country: 'Switzerland',
    foundedYear: 1906,
    employeeRange: '1001-5000',
    employeeCount: 1700,
    website: 'https://www.beyondgravity.com',
    description: 'RUAG Space, now operating as Beyond Gravity, is a leading European supplier of satellite structures, payload fairings, and space electronics. The company provides critical structural components for the Ariane, Vega, and Atlas V launch vehicles.',
    longDescription: 'Originally part of the Swiss arms manufacturer RUAG, the space division was rebranded as Beyond Gravity in 2022 to reflect its commercial focus. The company is Europe\'s largest independent supplier of space products, manufacturing payload fairings for Ariane 5 and Ariane 6, satellite structures, on-board computers, and thermal insulation. Beyond Gravity serves virtually every major satellite manufacturer and launch provider in Europe, and increasingly supplies components to NewSpace companies globally. With facilities in Switzerland, Sweden, Austria, and the United States, the company bridges traditional and commercial space.',
    ceo: 'Andre Wall',
    isPublic: false,
    ownershipType: 'private',
    parentCompany: 'Beyond Gravity',
    sector: 'manufacturing',
    subsector: 'structures',
    tags: ['satellite-structures', 'payload-fairings', 'space-electronics', 'european-space', 'launch-components'],
    tier: 2,
    products: [
      {
        name: 'Ariane 6 Payload Fairing',
        category: 'Launch Vehicle Component',
        description: 'Carbon fiber composite payload fairing protecting satellites during Ariane 6 ascent through the atmosphere.',
        status: 'active',
        specs: { material: 'CFRP', diameter_m: 5.4, application: 'Ariane 6' },
      },
      {
        name: 'Satellite On-Board Computer',
        category: 'Spacecraft Electronics',
        description: 'Radiation-hardened on-board computers for satellite command and data handling, used on over 600 satellites.',
        status: 'active',
      },
      {
        name: 'Thermal Insulation MLI',
        category: 'Thermal Control',
        description: 'Multi-layer insulation blankets for spacecraft thermal management, custom-designed for each mission profile.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Andre Wall',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO of Beyond Gravity since 2022, driving the company\'s transformation from a government supplier to a commercial space company.',
        previousCompanies: ['RUAG'],
      },
    ],
    events: [
      {
        date: '1906-01-01',
        type: 'founding',
        title: 'RUAG founded as Swiss federal arms manufacturer',
        description: 'The company traces its origins to 1906 as a Swiss government enterprise, later expanding into space technology.',
        importance: 6,
      },
      {
        date: '2022-01-01',
        type: 'milestone',
        title: 'Rebranded as Beyond Gravity',
        description: 'RUAG Space rebranded as Beyond Gravity to mark its transformation into a commercially focused space supplier.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Beyond Gravity Zurich',
        type: 'headquarters',
        city: 'Zurich',
        country: 'Switzerland',
      },
      {
        name: 'Fairing Production Facility',
        type: 'manufacturing',
        city: 'Emmen',
        country: 'Switzerland',
      },
      {
        name: 'Beyond Gravity Sweden',
        type: 'manufacturing',
        city: 'Gothenburg',
        country: 'Sweden',
      },
    ],
    revenueEstimates: [
      { year: 2023, revenueRange: '$350M-$450M', source: 'Industry estimate', confidenceLevel: 'estimate' },
    ],
    scores: [
      { scoreType: 'overall', score: 70 },
      { scoreType: 'technology', score: 75 },
      { scoreType: 'market_position', score: 72 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. MDA Space
  // ---------------------------------------------------------------------------
  {
    name: 'MDA Space',
    legalName: 'MDA Ltd.',
    slug: 'mda-space',
    ticker: 'MDA.TO',
    exchange: 'TSX',
    headquarters: 'Brampton, Ontario, Canada',
    country: 'Canada',
    foundedYear: 1969,
    employeeRange: '1001-5000',
    employeeCount: 3000,
    website: 'https://mda.space',
    description: 'MDA Space is a Canadian space technology company renowned for building the Canadarm robotic systems for the Space Shuttle and International Space Station. The company specializes in robotics, radar satellite systems, and satellite components for government and commercial customers.',
    longDescription: 'Founded in 1969, MDA (originally MacDonald Dettwiler and Associates) has been at the forefront of Canadian space technology for over five decades. The company built the iconic Canadarm, Canadarm2, and Dextre robotics systems that have been essential to Space Shuttle and ISS operations. MDA also developed the RADARSAT series of synthetic aperture radar satellites and is the prime contractor for the RADARSAT Constellation Mission. After being acquired by Maxar in 2017 and then re-established as an independent company in 2020, MDA went public on the TSX in 2021. The company is now building Canadarm3 for the NASA Lunar Gateway station.',
    ceo: 'Mike Greenley',
    isPublic: true,
    marketCap: 3200000000,
    revenueEstimate: 800000000,
    ownershipType: 'public',
    sector: 'manufacturing',
    subsector: 'space-robotics',
    tags: ['robotics', 'canadarm', 'radar-satellites', 'satellite-components', 'lunar-gateway'],
    tier: 2,
    products: [
      {
        name: 'Canadarm3',
        category: 'Space Robotics',
        description: 'Next-generation robotic arm system for the NASA Lunar Gateway station, capable of autonomous operation and AI-assisted maintenance.',
        status: 'in-development',
        specs: { application: 'Lunar Gateway', capability: 'autonomous operations', length_m: 8.5 },
      },
      {
        name: 'CHORUS Satellite Constellation',
        category: 'Radar Satellite',
        description: 'Commercial C-band SAR satellite constellation for maritime surveillance, environmental monitoring, and infrastructure management.',
        status: 'in-development',
      },
      {
        name: 'SAR Antenna Subsystems',
        category: 'Satellite Component',
        description: 'Synthetic aperture radar antenna assemblies for Earth observation satellites.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Mike Greenley',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO since 2020, led MDA\'s return to independence and public listing. Over 30 years of aerospace and defense experience.',
        previousCompanies: ['CAE', 'Canadian Armed Forces'],
      },
      {
        name: 'Vito Ciciretto',
        title: 'Chief Financial Officer',
        role: 'executive',
        bio: 'CFO overseeing MDA\'s financial strategy and investor relations since the 2021 IPO.',
      },
    ],
    events: [
      {
        date: '1969-01-01',
        type: 'founding',
        title: 'MacDonald Dettwiler and Associates founded',
        description: 'MDA was founded in British Columbia, Canada, beginning its journey as a leader in space robotics and Earth observation.',
        importance: 8,
      },
      {
        date: '2021-04-07',
        type: 'ipo',
        title: 'MDA IPO on Toronto Stock Exchange',
        description: 'MDA went public on the TSX, raising approximately $400M CAD to fund growth in robotics and satellite systems.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'MDA Brampton HQ',
        type: 'headquarters',
        city: 'Brampton',
        state: 'Ontario',
        country: 'Canada',
      },
      {
        name: 'MDA Satellite Systems Facility',
        type: 'manufacturing',
        city: 'Sainte-Anne-de-Bellevue',
        state: 'Quebec',
        country: 'Canada',
      },
    ],
    contracts: [
      {
        agency: 'Canadian Space Agency',
        title: 'Canadarm3 Development',
        description: 'Design, build, and operate the next-generation robotic system for the Lunar Gateway.',
        awardDate: '2020-12-16',
        value: 1990000000,
      },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 800000000, source: 'Annual Report', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'overall', score: 76 },
      { scoreType: 'technology', score: 85 },
      { scoreType: 'market_position', score: 74 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. Honeywell Aerospace
  // ---------------------------------------------------------------------------
  {
    name: 'Honeywell Aerospace',
    legalName: 'Honeywell Aerospace Technologies',
    slug: 'honeywell-aerospace',
    ticker: 'HON',
    exchange: 'NASDAQ',
    headquarters: 'Charlotte, North Carolina, USA',
    country: 'United States',
    foundedYear: 1906,
    employeeRange: '5000+',
    employeeCount: 40000,
    website: 'https://aerospace.honeywell.com',
    description: 'Honeywell Aerospace is a division of Honeywell International that provides avionics, navigation systems, and propulsion engines for aerospace and space applications. The company supplies critical inertial navigation and guidance systems used on launch vehicles, satellites, and crewed spacecraft.',
    longDescription: 'Honeywell Aerospace traces its heritage through companies like Honeywell, AlliedSignal, and Garrett that have been at the forefront of aerospace technology for over a century. In the space domain, Honeywell provides inertial measurement units, star trackers, reaction wheels, and flight computers used on virtually every major US space program. The company\'s navigation systems have guided missions from Apollo to the Space Launch System. Honeywell also develops propulsion systems for commercial and military aviation, environmental control systems for crewed spacecraft, and space-qualified sensors and electronics.',
    ceo: 'Jim Currier',
    isPublic: true,
    marketCap: 140000000000,
    revenueEstimate: 13500000000,
    ownershipType: 'public',
    parentCompany: 'Honeywell',
    sector: 'components',
    subsector: 'avionics-navigation',
    tags: ['avionics', 'navigation-systems', 'inertial-measurement', 'space-electronics', 'guidance-systems'],
    tier: 2,
    products: [
      {
        name: 'HG1930 Inertial Measurement Unit',
        category: 'Navigation Component',
        description: 'Space-grade inertial measurement unit using ring laser gyroscopes for precision guidance on launch vehicles and spacecraft.',
        status: 'active',
        specs: { type: 'Ring Laser Gyro IMU', application: 'Launch vehicles, spacecraft', radiation_tolerance: 'space-grade' },
      },
      {
        name: 'Momentum and Reaction Wheels',
        category: 'Attitude Control',
        description: 'Precision reaction wheel assemblies for satellite attitude control, ranging from small satellite to large GEO platform sizes.',
        status: 'active',
      },
      {
        name: 'Radiation-Hardened Processors',
        category: 'Spacecraft Electronics',
        description: 'Space-qualified processors and computing modules for satellite and deep space mission command and data handling.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Jim Currier',
        title: 'President & CEO, Honeywell Aerospace Technologies',
        role: 'executive',
        bio: 'Leads Honeywell\'s aerospace division encompassing commercial aviation, defense, and space technologies.',
        previousCompanies: ['Honeywell'],
      },
    ],
    events: [
      {
        date: '1906-01-01',
        type: 'founding',
        title: 'Honeywell founded as heating controls company',
        description: 'Honeywell\'s origins date to 1906, evolving through mergers with AlliedSignal and Garrett into a leading aerospace supplier.',
        importance: 7,
      },
      {
        date: '2024-10-01',
        type: 'milestone',
        title: 'Honeywell Aerospace Technologies separation announced',
        description: 'Honeywell announced plans to separate its Aerospace Technologies division into an independent publicly traded company.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Honeywell Aerospace HQ',
        type: 'headquarters',
        city: 'Charlotte',
        state: 'North Carolina',
        country: 'United States',
      },
      {
        name: 'Clearwater Navigation Systems',
        type: 'manufacturing',
        city: 'Clearwater',
        state: 'Florida',
        country: 'United States',
      },
      {
        name: 'Phoenix Avionics Center',
        type: 'manufacturing',
        city: 'Phoenix',
        state: 'Arizona',
        country: 'United States',
      },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 13500000000, source: 'Honeywell Annual Report', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'overall', score: 80 },
      { scoreType: 'technology', score: 85 },
      { scoreType: 'market_position', score: 88 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. HEICO Corporation
  // ---------------------------------------------------------------------------
  {
    name: 'HEICO Corporation',
    legalName: 'HEICO Corporation',
    slug: 'heico-corporation',
    ticker: 'HEI',
    exchange: 'NYSE',
    headquarters: 'Hollywood, Florida, USA',
    country: 'United States',
    foundedYear: 1957,
    employeeRange: '5000+',
    employeeCount: 9000,
    website: 'https://www.heico.com',
    description: 'HEICO Corporation is a leading manufacturer of FAA-approved aerospace replacement parts and electronic technologies for the aviation, defense, and space industries. The company provides cost-effective alternatives to OEM parts while maintaining the highest quality and safety standards.',
    longDescription: 'Founded in 1957 and led by the Mendelson family since 1990, HEICO has grown through a prolific acquisition strategy into one of the most successful aerospace companies in the world. The Flight Support Group manufactures FAA-approved replacement parts for jet engines and aircraft components at significant savings compared to OEM prices. The Electronic Technologies Group produces specialized electronic components for defense, space, and medical applications, including RF and microwave components, connectors, and power supplies used in satellites and space systems. HEICO has completed over 90 acquisitions, building a diversified portfolio of niche aerospace and electronics businesses.',
    ceo: 'Laurans Mendelson',
    isPublic: true,
    marketCap: 32000000000,
    revenueEstimate: 3900000000,
    ownershipType: 'public',
    sector: 'components',
    subsector: 'replacement-parts',
    tags: ['aerospace-parts', 'electronic-components', 'defense-electronics', 'space-components', 'aftermarket'],
    tier: 2,
    products: [
      {
        name: 'PMA Jet Engine Parts',
        category: 'Replacement Parts',
        description: 'FAA Parts Manufacturer Approval (PMA) replacement parts for jet engines offering significant cost savings over OEM equivalents.',
        status: 'active',
      },
      {
        name: 'Space-Qualified RF Components',
        category: 'Electronic Components',
        description: 'Radiation-hardened RF and microwave components for satellite communications and space-based radar systems.',
        status: 'active',
      },
      {
        name: 'Ruggedized Power Supplies',
        category: 'Power Electronics',
        description: 'Space and defense-grade power conversion units designed for extreme environments and radiation tolerance.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Laurans Mendelson',
        title: 'Chairman & Chief Executive Officer',
        role: 'executive',
        bio: 'Chairman and CEO since 1990, transformed HEICO from a small manufacturer into a multi-billion dollar aerospace conglomerate through strategic acquisitions.',
      },
      {
        name: 'Eric Mendelson',
        title: 'Co-President, HEICO Corporation',
        role: 'executive',
        bio: 'Co-President overseeing the Flight Support Group, responsible for the PMA replacement parts business.',
        previousCompanies: ['HEICO'],
      },
      {
        name: 'Victor Mendelson',
        title: 'Co-President, HEICO Corporation',
        role: 'executive',
        bio: 'Co-President overseeing the Electronic Technologies Group, responsible for defense and space electronics.',
        previousCompanies: ['HEICO'],
      },
    ],
    events: [
      {
        date: '1957-01-01',
        type: 'founding',
        title: 'HEICO Corporation founded',
        description: 'HEICO was incorporated in Florida as an aerospace components manufacturer.',
        importance: 7,
      },
      {
        date: '1990-01-01',
        type: 'milestone',
        title: 'Mendelson family acquires HEICO',
        description: 'Laurans Mendelson and partners acquired control of HEICO, beginning a transformation through acquisitions and organic growth.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'HEICO Corporate HQ',
        type: 'headquarters',
        city: 'Hollywood',
        state: 'Florida',
        country: 'United States',
      },
      {
        name: 'Flight Support Group Operations',
        type: 'manufacturing',
        city: 'Miami',
        state: 'Florida',
        country: 'United States',
      },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 3900000000, source: 'Annual Report (FY Oct)', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'overall', score: 77 },
      { scoreType: 'technology', score: 72 },
      { scoreType: 'market_position', score: 82 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. ILC Dover
  // ---------------------------------------------------------------------------
  {
    name: 'ILC Dover',
    legalName: 'ILC Dover LP',
    slug: 'ilc-dover',
    headquarters: 'Frederica, Delaware, USA',
    country: 'United States',
    foundedYear: 1947,
    employeeRange: '501-1000',
    employeeCount: 800,
    website: 'https://www.ilcdover.com',
    description: 'ILC Dover is a world leader in the design and manufacture of spacesuits, inflatable space structures, and engineered softgoods for aerospace applications. The company built the spacesuits worn by Apollo astronauts on the Moon and continues to develop next-generation EVA suits.',
    longDescription: 'Founded in 1947, ILC Dover has been the premier spacesuit manufacturer for NASA for over six decades. The company designed and built the A7L spacesuits worn during the Apollo Moon landings and has continued to produce every NASA spacesuit since, including the Extravehicular Mobility Units (EMUs) used on the Space Shuttle and International Space Station. Beyond spacesuits, ILC Dover develops inflatable habitats, aerodynamic decelerators for planetary entry, and engineered flexible materials for defense and pharmaceutical applications. The company was selected by Axiom Space to develop components for next-generation commercial spacesuits.',
    ceo: 'Fran DiNuzzo',
    isPublic: false,
    ownershipType: 'private',
    sector: 'manufacturing',
    subsector: 'spacesuits-softgoods',
    tags: ['spacesuits', 'inflatable-structures', 'softgoods', 'EVA', 'life-support'],
    tier: 3,
    products: [
      {
        name: 'Extravehicular Mobility Unit (EMU)',
        category: 'Spacesuit',
        description: 'Pressure garment assembly for NASA\'s EVA spacesuit system, providing protection and mobility for spacewalks on the ISS.',
        status: 'active',
        specs: { application: 'ISS EVA', pressure_psi: 4.3, heritage: 'Apollo-derived' },
      },
      {
        name: 'Inflatable Habitat Structures',
        category: 'Space Habitat',
        description: 'Expandable habitat modules using softgoods technology for potential lunar and Mars surface habitation.',
        status: 'in-development',
      },
      {
        name: 'HIAD (Hypersonic Inflatable Aerodynamic Decelerator)',
        category: 'Entry System',
        description: 'Inflatable heat shield technology for large-payload planetary entry, developed in partnership with NASA.',
        status: 'in-development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Fran DiNuzzo',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO of ILC Dover, leading the company\'s expansion in commercial space and next-generation spacesuit development.',
      },
    ],
    events: [
      {
        date: '1947-01-01',
        type: 'founding',
        title: 'ILC Dover founded',
        description: 'International Latex Corporation established its Dover, Delaware division, which would become the premier spacesuit manufacturer.',
        importance: 7,
      },
      {
        date: '1969-07-20',
        type: 'milestone',
        title: 'ILC Dover spacesuits worn on the Moon',
        description: 'Neil Armstrong and Buzz Aldrin wore ILC Dover A7L spacesuits during the Apollo 11 Moon landing.',
        importance: 10,
      },
    ],
    facilities: [
      {
        name: 'ILC Dover HQ & Manufacturing',
        type: 'manufacturing',
        city: 'Frederica',
        state: 'Delaware',
        country: 'United States',
      },
    ],
    contracts: [
      {
        agency: 'NASA',
        title: 'EVA Spacesuit Pressure Garments',
        description: 'Ongoing production and maintenance of pressure garment assemblies for ISS extravehicular activity suits.',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 68 },
      { scoreType: 'technology', score: 80 },
      { scoreType: 'market_position', score: 65 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 9. Draper Laboratory
  // ---------------------------------------------------------------------------
  {
    name: 'Draper Laboratory',
    legalName: 'The Charles Stark Draper Laboratory, Inc.',
    slug: 'draper-laboratory',
    headquarters: 'Cambridge, Massachusetts, USA',
    country: 'United States',
    foundedYear: 1932,
    employeeRange: '1001-5000',
    employeeCount: 2000,
    website: 'https://www.draper.com',
    description: 'Draper Laboratory is a not-for-profit research and development organization specializing in guidance, navigation, and control (GN&C) systems for space, defense, and autonomous systems. The lab developed the Apollo guidance computer and continues to provide critical avionics for NASA missions.',
    longDescription: 'Originally the MIT Instrumentation Laboratory founded by Charles Stark Draper in 1932, Draper became an independent nonprofit in 1973. The laboratory is renowned for developing the Apollo guidance computer and inertial navigation systems that guided astronauts to the Moon. Today, Draper designs GN&C systems for ballistic missiles, spacecraft, and autonomous vehicles. The lab provides navigation and guidance solutions for NASA\'s Space Launch System and Orion spacecraft, and is developing precision landing systems for lunar landers. Draper also works on MEMS-based inertial sensors, biomedical devices, and AI-driven autonomy systems.',
    ceo: 'John Scherrer',
    isPublic: false,
    ownershipType: 'nonprofit',
    sector: 'components',
    subsector: 'guidance-navigation-control',
    tags: ['GNC', 'avionics', 'navigation', 'apollo-heritage', 'autonomous-systems'],
    tier: 3,
    products: [
      {
        name: 'Spacecraft GN&C Systems',
        category: 'Guidance & Navigation',
        description: 'Integrated guidance, navigation, and control systems for crewed and uncrewed spacecraft, including SLS/Orion.',
        status: 'active',
        specs: { heritage: 'Apollo, Space Shuttle, Orion', application: 'Launch vehicles, spacecraft' },
      },
      {
        name: 'MEMS Inertial Sensors',
        category: 'Navigation Component',
        description: 'Micro-electromechanical systems (MEMS) based inertial sensors for precision navigation in size-constrained applications.',
        status: 'active',
      },
      {
        name: 'Precision Lunar Landing System',
        category: 'Landing System',
        description: 'Terrain-relative navigation and hazard avoidance system for autonomous precision landing on the lunar surface.',
        status: 'in-development',
      },
    ],
    keyPersonnel: [
      {
        name: 'John Scherrer',
        title: 'President & Director',
        role: 'executive',
        bio: 'President of Draper since 2023, leading the lab\'s research across space, defense, and biomedical domains.',
        previousCompanies: ['Draper Laboratory'],
      },
    ],
    events: [
      {
        date: '1932-01-01',
        type: 'founding',
        title: 'MIT Instrumentation Laboratory founded',
        description: 'Charles Stark Draper founded the MIT Instrumentation Laboratory, which would later become the independent Draper Laboratory.',
        importance: 9,
      },
      {
        date: '1969-07-20',
        type: 'milestone',
        title: 'Apollo guidance computer guides Moon landing',
        description: 'The Draper-designed Apollo guidance computer successfully navigated the Apollo 11 lunar module to the Moon\'s surface.',
        importance: 10,
      },
    ],
    facilities: [
      {
        name: 'Draper Laboratory HQ',
        type: 'research',
        city: 'Cambridge',
        state: 'Massachusetts',
        country: 'United States',
      },
    ],
    contracts: [
      {
        agency: 'NASA',
        title: 'SLS/Orion GN&C',
        description: 'Guidance, navigation, and control systems for NASA\'s Space Launch System and Orion spacecraft.',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 72 },
      { scoreType: 'technology', score: 90 },
      { scoreType: 'market_position', score: 60 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 10. Benchmark Space Systems
  // ---------------------------------------------------------------------------
  {
    name: 'Benchmark Space Systems',
    legalName: 'Benchmark Space Systems, Inc.',
    slug: 'benchmark-space-systems',
    headquarters: 'Burlington, Vermont, USA',
    country: 'United States',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 80,
    website: 'https://www.benchmarkspacesystems.com',
    description: 'Benchmark Space Systems develops green, non-toxic propulsion systems for small satellites and spacecraft. The company offers a range of chemical and electric propulsion products designed to be safe, affordable, and high-performance for the growing smallsat market.',
    longDescription: 'Founded in 2017, Benchmark Space Systems is addressing the growing need for safe, high-performance propulsion for small satellites. Traditional satellite propulsion often uses toxic hydrazine, which increases cost and complexity. Benchmark develops green bipropellant thrusters using non-toxic propellants that can be handled safely, reducing launch integration costs. The company offers products ranging from low-thrust electric systems to high-thrust chemical engines, covering missions from station-keeping to orbit transfer. Benchmark has secured contracts from the US Space Force and commercial satellite operators, positioning itself as a key supplier in the NewSpace propulsion market.',
    ceo: 'Ryan McDevitt',
    isPublic: false,
    totalFunding: 33000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2022-06-15',
    ownershipType: 'private',
    sector: 'propulsion',
    subsector: 'green-propulsion',
    tags: ['green-propulsion', 'smallsat-propulsion', 'non-toxic', 'chemical-propulsion', 'newspace'],
    tier: 3,
    products: [
      {
        name: 'Halcyon',
        category: 'Chemical Propulsion',
        description: 'Green bipropellant thruster system for small satellites, delivering high thrust with non-toxic propellants for orbit raising and maneuvering.',
        status: 'active',
        specs: { thrust_n: 22, propellant: 'Green bipropellant', isp_s: 285, application: 'Smallsat orbit transfer' },
      },
      {
        name: 'Xantus',
        category: 'Electric Propulsion',
        description: 'Low-thrust electric propulsion system for long-duration smallsat station-keeping and orbit maintenance.',
        status: 'active',
      },
      {
        name: 'Starling',
        category: 'Cold Gas Propulsion',
        description: 'Simple, reliable cold gas propulsion module for CubeSat attitude control and small maneuvers.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Ryan McDevitt',
        title: 'Chief Executive Officer & Co-Founder',
        role: 'executive',
        bio: 'Co-founded Benchmark Space Systems to bring safe, affordable propulsion to the small satellite market.',
      },
    ],
    fundingRounds: [
      {
        date: '2022-06-15',
        amount: 33000000,
        roundType: 'Series A',
        seriesLabel: 'Series A',
      },
    ],
    events: [
      {
        date: '2017-01-01',
        type: 'founding',
        title: 'Benchmark Space Systems founded',
        description: 'Benchmark Space Systems was established in Burlington, Vermont to develop green propulsion for smallsats.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Benchmark Space Systems HQ',
        type: 'headquarters',
        city: 'Burlington',
        state: 'Vermont',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
      { scoreType: 'technology', score: 72 },
      { scoreType: 'market_position', score: 45 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 11. Dawn Aerospace
  // ---------------------------------------------------------------------------
  {
    name: 'Dawn Aerospace',
    legalName: 'Dawn Aerospace Ltd.',
    slug: 'dawn-aerospace',
    headquarters: 'Christchurch, New Zealand',
    country: 'New Zealand',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 70,
    website: 'https://www.dawnaerospace.com',
    description: 'Dawn Aerospace develops green propulsion systems for satellites and is building a suborbital spaceplane for rapid, reusable access to space. The company offers non-toxic thruster products for CubeSats through large satellites alongside its Mk-II Aurora vehicle program.',
    longDescription: 'Founded in 2017 with operations in New Zealand and the Netherlands, Dawn Aerospace is pursuing a dual strategy in NewSpace. The propulsion division offers green (non-toxic) monopropellant and bipropellant thrusters as drop-in replacements for legacy hydrazine systems, serving the growing demand for safer satellite propulsion. The vehicle division is developing the Mk-II Aurora, a reusable rocket-powered suborbital spaceplane designed to fly multiple times per day from conventional runways. This two-stage-to-orbit concept aims to dramatically reduce launch costs by enabling aircraft-like operations. Dawn has completed multiple test flights of the Mk-II from New Zealand.',
    ceo: 'Stefan Powell',
    isPublic: false,
    totalFunding: 25000000,
    ownershipType: 'private',
    sector: 'propulsion',
    subsector: 'green-propulsion',
    tags: ['green-propulsion', 'suborbital-spaceplane', 'reusable', 'non-toxic', 'smallsat-propulsion'],
    tier: 3,
    products: [
      {
        name: 'B1 Green Bipropellant Thruster',
        category: 'Chemical Propulsion',
        description: 'Non-toxic bipropellant thruster for satellites, providing high performance with safe handling for orbit raising and de-orbit maneuvers.',
        status: 'active',
        specs: { thrust_n: 1, propellant: 'Nitrous oxide / propene', isp_s: 280 },
      },
      {
        name: 'B20 Green Thruster',
        category: 'Chemical Propulsion',
        description: 'Higher-thrust green bipropellant engine for medium satellites and orbit transfer applications.',
        status: 'active',
        specs: { thrust_n: 20, propellant: 'Green bipropellant' },
      },
      {
        name: 'Mk-II Aurora Spaceplane',
        category: 'Suborbital Vehicle',
        description: 'Reusable rocket-powered suborbital spaceplane designed for daily flights from conventional runways, serving as a technology demonstrator for orbital access.',
        status: 'in-development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Stefan Powell',
        title: 'Chief Executive Officer & Co-Founder',
        role: 'executive',
        bio: 'Co-founder and CEO of Dawn Aerospace, aerospace engineer with a vision for aircraft-like space access and green propulsion.',
      },
      {
        name: 'Jeroen Wink',
        title: 'Chief Technology Officer & Co-Founder',
        role: 'technical',
        bio: 'Co-founder and CTO leading propulsion technology development, with a background in green propellant chemistry.',
      },
    ],
    events: [
      {
        date: '2017-01-01',
        type: 'founding',
        title: 'Dawn Aerospace founded',
        description: 'Dawn Aerospace was established in New Zealand with a mission to develop green propulsion and reusable space access vehicles.',
        importance: 7,
      },
      {
        date: '2021-07-01',
        type: 'milestone',
        title: 'Mk-II Aurora first powered test flight',
        description: 'Dawn Aerospace completed the first powered test flight of its Mk-II Aurora suborbital spaceplane from a runway in New Zealand.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Dawn Aerospace NZ HQ',
        type: 'headquarters',
        city: 'Christchurch',
        country: 'New Zealand',
      },
      {
        name: 'Dawn Aerospace Netherlands',
        type: 'engineering',
        city: 'Delft',
        country: 'Netherlands',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
      { scoreType: 'technology', score: 70 },
      { scoreType: 'market_position', score: 42 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 12. Busek Co.
  // ---------------------------------------------------------------------------
  {
    name: 'Busek Co.',
    legalName: 'Busek Co., Inc.',
    slug: 'busek-co',
    headquarters: 'Natick, Massachusetts, USA',
    country: 'United States',
    foundedYear: 1985,
    employeeRange: '51-200',
    employeeCount: 100,
    website: 'https://www.busek.com',
    description: 'Busek Co. is a leading developer of electric propulsion systems, specializing in Hall effect thrusters, electrospray thrusters, and RF ion engines for small to medium satellites. The company has extensive flight heritage with NASA, DoD, and commercial missions.',
    longDescription: 'Founded in 1985 by Dr. Vlad Hruby, Busek has been a pioneer in electric propulsion technology for nearly four decades. The company develops and manufactures a full range of electric propulsion systems including Hall effect thrusters, electrospray (colloidal) thrusters, pulsed plasma thrusters, and RF ion engines. Busek\'s thrusters have flown on numerous NASA, Air Force, and commercial missions, providing orbit raising, station-keeping, and drag compensation. The company\'s BHT series of Hall thrusters spans from micro-propulsion for CubeSats to multi-kilowatt systems for large spacecraft. Busek also develops green chemical propulsion and advanced cathode technologies.',
    ceo: 'Vlad Hruby',
    isPublic: false,
    ownershipType: 'private',
    sector: 'propulsion',
    subsector: 'electric-propulsion',
    tags: ['electric-propulsion', 'hall-thrusters', 'electrospray', 'ion-engines', 'smallsat-propulsion'],
    tier: 3,
    products: [
      {
        name: 'BHT-200 Hall Thruster',
        category: 'Electric Propulsion',
        description: 'Compact 200W Hall effect thruster for small satellite orbit raising and station-keeping, with extensive flight heritage.',
        status: 'active',
        specs: { power_w: 200, thrust_mn: 13, isp_s: 1390, propellant: 'Xenon' },
      },
      {
        name: 'BIT-3 RF Ion Thruster',
        category: 'Electric Propulsion',
        description: 'Miniature RF ion thruster system for CubeSats and nanosatellites, providing high specific impulse for deep space and LEO missions.',
        status: 'active',
        specs: { power_w: 75, thrust_mn: 1.1, isp_s: 2150, propellant: 'Iodine' },
      },
      {
        name: 'Electrospray Thruster Array',
        category: 'Electric Propulsion',
        description: 'Colloidal electrospray thruster array for ultra-precise attitude control and formation flying applications.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Vlad Hruby',
        title: 'Founder & Chief Executive Officer',
        role: 'executive',
        bio: 'Founded Busek in 1985 and has led the company through nearly four decades of electric propulsion innovation. Holds a PhD in mechanical engineering.',
      },
    ],
    events: [
      {
        date: '1985-01-01',
        type: 'founding',
        title: 'Busek Co. founded',
        description: 'Dr. Vlad Hruby founded Busek Co. in Massachusetts to develop advanced electric propulsion technologies.',
        importance: 7,
      },
      {
        date: '2006-01-01',
        type: 'milestone',
        title: 'First BHT-200 Hall thruster flight',
        description: 'Busek\'s BHT-200 Hall thruster achieved its first spaceflight, validating the technology for operational satellite use.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Busek HQ & Test Facility',
        type: 'manufacturing',
        city: 'Natick',
        state: 'Massachusetts',
        country: 'United States',
      },
    ],
    contracts: [
      {
        agency: 'NASA',
        title: 'Small Spacecraft Electric Propulsion',
        description: 'Development and delivery of electric propulsion systems for NASA small spacecraft missions.',
      },
      {
        agency: 'US Air Force',
        title: 'Advanced Electric Propulsion R&D',
        description: 'Research and development of high-performance electric propulsion technologies for DoD space applications.',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 62 },
      { scoreType: 'technology', score: 85 },
      { scoreType: 'market_position', score: 50 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 13. Bradford Space
  // ---------------------------------------------------------------------------
  {
    name: 'Bradford Space',
    legalName: 'Bradford Space, Inc.',
    slug: 'bradford-space',
    headquarters: 'The Hague, Netherlands',
    country: 'Netherlands',
    foundedYear: 2000,
    employeeRange: '51-200',
    employeeCount: 120,
    website: 'https://www.bradford-space.com',
    description: 'Bradford Space is a provider of green propulsion systems for satellites, best known for its High Performance Green Propulsion (HPGP) technology using the non-toxic propellant LMP-103S. The company operates from the Netherlands and the United States, serving both commercial and government customers.',
    longDescription: 'Bradford Space, originally Bradford Engineering, has been a key player in advancing green propulsion for spacecraft. The company\'s flagship HPGP (High Performance Green Propulsion) system uses LMP-103S, a non-toxic monopropellant that delivers higher performance than hydrazine while being safer and easier to handle. HPGP has been demonstrated on multiple missions including ESA\'s PRISMA technology demonstrator. Bradford also provides complete propulsion subsystems, reaction control systems, and fluid management components. With facilities in The Hague and the US, the company serves the global market for safer, higher-performance satellite propulsion.',
    ceo: 'David Persson',
    isPublic: false,
    ownershipType: 'private',
    sector: 'propulsion',
    subsector: 'green-propulsion',
    tags: ['green-propulsion', 'HPGP', 'non-toxic', 'monopropellant', 'satellite-propulsion'],
    tier: 3,
    products: [
      {
        name: 'HPGP 1N Thruster',
        category: 'Green Propulsion',
        description: 'High Performance Green Propulsion 1-Newton thruster using non-toxic LMP-103S propellant, offering 6% higher Isp than hydrazine.',
        status: 'active',
        specs: { thrust_n: 1, propellant: 'LMP-103S (ADN-based)', isp_s: 235, application: 'Satellite attitude control' },
      },
      {
        name: 'HPGP 22N Thruster',
        category: 'Green Propulsion',
        description: 'Higher-thrust green propulsion thruster for orbit raising, station-keeping, and de-orbit maneuvers.',
        status: 'active',
        specs: { thrust_n: 22, propellant: 'LMP-103S', application: 'Orbit transfer' },
      },
      {
        name: 'Propulsion Subsystem Module',
        category: 'Propulsion System',
        description: 'Complete integrated propulsion subsystem with tanks, valves, tubing, and thrusters for plug-and-play satellite integration.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'David Persson',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO of Bradford Space, leading the commercialization of green propulsion technology for the satellite industry.',
      },
    ],
    events: [
      {
        date: '2000-01-01',
        type: 'founding',
        title: 'Bradford Engineering founded',
        description: 'Bradford Engineering was established in the Netherlands, later evolving into Bradford Space with a focus on green propulsion technology.',
        importance: 6,
      },
      {
        date: '2010-06-15',
        type: 'milestone',
        title: 'HPGP first spaceflight on PRISMA',
        description: 'Bradford\'s HPGP system achieved its first flight demonstration on ESA\'s PRISMA formation-flying mission, validating green propulsion in orbit.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'Bradford Space Netherlands HQ',
        type: 'headquarters',
        city: 'The Hague',
        country: 'Netherlands',
      },
      {
        name: 'Bradford Space US Office',
        type: 'engineering',
        city: 'Washington',
        state: 'D.C.',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 56 },
      { scoreType: 'technology', score: 74 },
      { scoreType: 'market_position', score: 48 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 14. Loft Orbital
  // ---------------------------------------------------------------------------
  {
    name: 'Loft Orbital',
    legalName: 'Loft Orbital Solutions Inc.',
    slug: 'loft-orbital',
    headquarters: 'San Francisco, California, USA',
    country: 'United States',
    foundedYear: 2017,
    employeeRange: '51-200',
    employeeCount: 150,
    website: 'https://www.loftorbital.com',
    description: 'Loft Orbital provides a satellite hosting platform that enables customers to deploy payloads to orbit without building their own satellite. The company offers space-as-a-service through standardized satellite buses that can host multiple customer missions on a single platform.',
    longDescription: 'Founded in 2017, Loft Orbital is pioneering the "space infrastructure as a service" model. Rather than customers spending years and tens of millions building a dedicated satellite, Loft offers standardized satellite platforms (called YAM, or Yet Another Mission) that can host multiple customer payloads simultaneously. Customers simply provide their sensor or instrument, and Loft handles everything from satellite integration to launch, operations, and data downlink. This approach dramatically reduces the time and cost to get a payload on orbit. With offices in San Francisco, Toulouse (France), and Tel Aviv, Loft has launched multiple YAM satellites carrying payloads for defense, intelligence, and commercial customers.',
    ceo: 'Pierre-Damien Vaujour',
    isPublic: false,
    totalFunding: 160000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2022-10-01',
    ownershipType: 'private',
    sector: 'manufacturing',
    subsector: 'satellite-hosting',
    tags: ['satellite-hosting', 'space-as-a-service', 'payload-integration', 'smallsat-platforms', 'rideshare'],
    tier: 3,
    products: [
      {
        name: 'YAM Satellite Platform',
        category: 'Satellite Platform',
        description: 'Standardized microsatellite bus designed to host multiple customer payloads per mission, providing power, data handling, comms, and attitude control.',
        status: 'active',
        specs: { mass_kg: 150, payload_slots: 'multiple', orbit: 'LEO/SSO', design_life_years: 5 },
      },
      {
        name: 'Payload Hosting Service',
        category: 'Space Service',
        description: 'End-to-end service to fly a customer payload on a shared satellite, from integration through operations and data delivery.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Pierre-Damien Vaujour',
        title: 'Chief Executive Officer & Co-Founder',
        role: 'executive',
        bio: 'Co-founder and CEO of Loft Orbital, previously held senior roles at Airbus Defence and Space.',
        previousCompanies: ['Airbus Defence and Space'],
      },
      {
        name: 'Alexander Greenberg',
        title: 'Chief Operating Officer & Co-Founder',
        role: 'executive',
        bio: 'Co-founder and COO, overseeing satellite operations and customer payload integration.',
      },
    ],
    fundingRounds: [
      {
        date: '2020-06-01',
        amount: 30000000,
        roundType: 'Series A',
        seriesLabel: 'Series A',
      },
      {
        date: '2022-10-01',
        amount: 130000000,
        roundType: 'Series B',
        seriesLabel: 'Series B',
      },
    ],
    events: [
      {
        date: '2017-01-01',
        type: 'founding',
        title: 'Loft Orbital founded',
        description: 'Loft Orbital was founded in San Francisco to provide satellite hosting and space-as-a-service for payload operators.',
        importance: 7,
      },
      {
        date: '2021-06-30',
        type: 'launch',
        title: 'YAM-2 launched on SpaceX Transporter-2',
        description: 'Loft Orbital\'s YAM-2 satellite launched carrying customer payloads, demonstrating the shared satellite hosting model.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Loft Orbital HQ',
        type: 'headquarters',
        city: 'San Francisco',
        state: 'California',
        country: 'United States',
      },
      {
        name: 'Loft Orbital France',
        type: 'engineering',
        city: 'Toulouse',
        country: 'France',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
      { scoreType: 'technology', score: 68 },
      { scoreType: 'market_position', score: 55 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 15. GomSpace
  // ---------------------------------------------------------------------------
  {
    name: 'GomSpace',
    legalName: 'GomSpace A/S',
    slug: 'gomspace',
    ticker: 'GOMX.ST',
    exchange: 'Nasdaq First North (OMX)',
    headquarters: 'Aalborg, Denmark',
    country: 'Denmark',
    foundedYear: 2007,
    employeeRange: '51-200',
    employeeCount: 120,
    website: 'https://gomspace.com',
    description: 'GomSpace is a Danish nanosatellite company that designs and manufactures CubeSat components, platforms, and complete satellite solutions. The company provides off-the-shelf subsystems including power systems, radios, and on-board computers used by satellite developers worldwide.',
    longDescription: 'Founded in 2007 as a spin-off from Aalborg University, GomSpace has become one of the world\'s leading suppliers of nanosatellite technology. The company offers a comprehensive product line of CubeSat components including electrical power systems (EPS), UHF/S-band/X-band radios, on-board computers, attitude determination and control systems, and NanoPower battery packs. These components are used by universities, research institutions, and commercial operators globally. GomSpace also designs and builds complete nanosatellite platforms and provides turnkey mission solutions. The company went public on the Nasdaq First North exchange in Stockholm and has delivered components for over 300 satellite missions.',
    ceo: 'Peter Haurvig',
    isPublic: true,
    marketCap: 50000000,
    revenueEstimate: 20000000,
    ownershipType: 'public',
    sector: 'components',
    subsector: 'smallsat-components',
    tags: ['cubesat-components', 'nanosatellites', 'power-systems', 'smallsat-radios', 'COTS-space'],
    tier: 3,
    products: [
      {
        name: 'NanoPower P-Series EPS',
        category: 'Power System',
        description: 'Electrical power system for CubeSats providing solar panel regulation, battery charging, and power distribution in a compact form factor.',
        status: 'active',
        specs: { form_factor: 'PC/104', application: '1U-12U CubeSats', channels: 8 },
      },
      {
        name: 'NanoCom AX100 UHF Radio',
        category: 'Communications',
        description: 'UHF half-duplex transceiver for CubeSat telemetry, tracking, and command links, supporting AX.25 protocol.',
        status: 'active',
        specs: { frequency: 'UHF', data_rate_kbps: 19.2, protocol: 'AX.25' },
      },
      {
        name: 'NanoMind A3200 OBC',
        category: 'On-Board Computer',
        description: 'ARM-based on-board computer for nanosatellites providing command and data handling, storage, and mission management.',
        status: 'active',
      },
      {
        name: 'GOMX Platform',
        category: 'Satellite Platform',
        description: 'Complete nanosatellite platform for 3U-12U form factors, integrating all GomSpace subsystems into a mission-ready bus.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Peter Haurvig',
        title: 'Chief Executive Officer',
        role: 'executive',
        bio: 'CEO of GomSpace leading the company\'s growth in the nanosatellite components and platforms market.',
      },
      {
        name: 'Jesper A. Larsen',
        title: 'Co-Founder',
        role: 'founder',
        bio: 'Co-founded GomSpace from Aalborg University research, pioneering commercial CubeSat component manufacturing.',
        previousCompanies: ['Aalborg University'],
      },
    ],
    events: [
      {
        date: '2007-01-01',
        type: 'founding',
        title: 'GomSpace founded from Aalborg University',
        description: 'GomSpace was spun out of Aalborg University\'s nanosatellite research program to commercialize CubeSat technology.',
        importance: 7,
      },
      {
        date: '2016-07-01',
        type: 'ipo',
        title: 'GomSpace IPO on Nasdaq First North',
        description: 'GomSpace went public on the Nasdaq First North exchange in Stockholm to fund expansion of its satellite platform business.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'GomSpace Denmark HQ',
        type: 'headquarters',
        city: 'Aalborg',
        country: 'Denmark',
      },
      {
        name: 'GomSpace Sweden',
        type: 'engineering',
        city: 'Uppsala',
        country: 'Sweden',
      },
      {
        name: 'GomSpace Luxembourg',
        type: 'engineering',
        city: 'Luxembourg City',
        country: 'Luxembourg',
      },
    ],
    revenueEstimates: [
      { year: 2023, revenue: 20000000, source: 'Annual Report', confidenceLevel: 'reported' },
    ],
    scores: [
      { scoreType: 'overall', score: 54 },
      { scoreType: 'technology', score: 65 },
      { scoreType: 'market_position', score: 52 },
    ],
  },
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Seeding Batch 4: Components & Manufacturing...\n');
  for (const company of COMPANIES) {
    try {
      const p = await seedCompanyProfile(company);
      console.log(`  ✓ ${company.name} (${p.id})`);
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`);
    }
  }
  const total = await prisma.companyProfile.count();
  console.log(`\n✅ Batch 4 done! Total company profiles: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
