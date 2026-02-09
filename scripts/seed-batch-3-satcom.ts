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

// ═══════════════════════════════════════════════════════════════
// SATELLITE OPERATORS (18 companies)
// ═══════════════════════════════════════════════════════════════

const SAT_OPERATORS: CompanyData[] = [
  // 1. EchoStar / Hughes
  {
    name: 'EchoStar',
    legalName: 'EchoStar Corporation',
    slug: 'echostar',
    ticker: 'SATS',
    exchange: 'NASDAQ',
    headquarters: 'Englewood, CO',
    country: 'United States',
    foundedYear: 1980,
    employeeRange: '5000-10000',
    employeeCount: 8000,
    website: 'https://www.echostar.com',
    description: 'EchoStar Corporation is a global provider of satellite communication and broadband services through its Hughes subsidiary. The company operates the Jupiter satellite fleet delivering high-speed internet to residential, enterprise, and government customers across the Americas. Following the 2024 merger with DISH Network, EchoStar also controls a significant direct-broadcast satellite and wireless spectrum portfolio.',
    longDescription: 'EchoStar, through Hughes Network Systems, is one of the largest satellite broadband providers in the world. The Jupiter satellite constellation delivers connectivity to underserved and rural communities. The company has pioneered innovations in Ka-band high-throughput satellite technology and VSAT networking platforms.',
    ceo: 'Hamid Akhavan',
    isPublic: true,
    marketCap: 8500000000,
    sector: 'satellite-operator',
    subsector: 'broadband',
    tags: ['broadband', 'HTS', 'VSAT', 'direct-broadcast', 'Ka-band'],
    tier: 2,
    revenueEstimate: 4200000000,
    ownershipType: 'public',
    products: [
      {
        name: 'Jupiter 3',
        category: 'satellite',
        description: 'Ultra high-density satellite delivering 500+ Gbps capacity across the Americas, one of the highest-capacity commercial satellites ever built.',
        status: 'active',
      },
      {
        name: 'Hughes JUPITER System',
        category: 'platform',
        description: 'End-to-end broadband satellite platform powering residential and enterprise internet services.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Hamid Akhavan',
        title: 'President & CEO',
        role: 'executive',
        previousCompanies: ['T-Mobile International', 'Deutsche Telekom'],
      },
      {
        name: 'Pradman Kaul',
        title: 'President, Hughes Network Systems',
        role: 'executive',
        previousCompanies: ['Hughes'],
      },
    ],
    events: [
      {
        date: '1980-01-01',
        type: 'founding',
        title: 'EchoStar founded by Charlie Ergen',
        description: 'Charlie Ergen founded EchoStar Communications Corporation as a satellite TV distribution company.',
        importance: 8,
      },
      {
        date: '2024-01-02',
        type: 'merger',
        title: 'DISH Network merger completed',
        description: 'EchoStar completed its re-merger with DISH Network, consolidating satellite TV, broadband, and wireless assets.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'EchoStar Corporate HQ',
        type: 'headquarters',
        city: 'Englewood',
        state: 'CO',
        country: 'United States',
      },
      {
        name: 'Hughes Network Systems HQ',
        type: 'office',
        city: 'Germantown',
        state: 'MD',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 72 },
    ],
  },

  // 2. Globalstar
  {
    name: 'Globalstar',
    legalName: 'Globalstar, Inc.',
    slug: 'globalstar',
    ticker: 'GSAT',
    exchange: 'NYSE',
    headquarters: 'Covington, LA',
    country: 'United States',
    foundedYear: 1991,
    employeeRange: '500-1000',
    employeeCount: 650,
    website: 'https://www.globalstar.com',
    description: 'Globalstar operates a LEO satellite constellation providing mobile voice, data, and IoT connectivity services worldwide. The company gained major consumer visibility through its strategic partnership with Apple to enable satellite-based Emergency SOS on iPhones. Globalstar also provides SPOT satellite messenger devices and commercial IoT solutions.',
    longDescription: 'Globalstar maintains a constellation of LEO satellites in 1,414 km orbits, supported by a global network of ground gateways. The Apple partnership has transformed the company, providing a major revenue stream and funding for next-generation satellite procurement. Globalstar is building its next-gen constellation to expand capacity for Apple services and enterprise IoT.',
    ceo: 'Paul Jacobs',
    isPublic: true,
    marketCap: 6000000000,
    sector: 'satellite-operator',
    subsector: 'mobile-satellite-services',
    tags: ['LEO', 'IoT', 'Apple-partnership', 'emergency-SOS', 'MSS'],
    tier: 2,
    totalFunding: 1700000000,
    revenueEstimate: 250000000,
    ownershipType: 'public',
    products: [
      {
        name: 'Globalstar LEO Constellation',
        category: 'satellite-constellation',
        description: 'Second-generation constellation of 24+ LEO satellites providing voice, data, and IoT connectivity with global coverage.',
        status: 'active',
      },
      {
        name: 'SPOT Satellite Messenger',
        category: 'consumer-device',
        description: 'Personal satellite tracking and emergency messaging device for outdoor enthusiasts and remote workers.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Paul Jacobs',
        title: 'Executive Chairman',
        role: 'executive',
        previousCompanies: ['Qualcomm'],
        bio: 'Former CEO of Qualcomm, joined Globalstar to lead its next-generation constellation strategy.',
      },
      {
        name: 'Rebecca Clary',
        title: 'CFO',
        role: 'executive',
      },
    ],
    events: [
      {
        date: '1991-01-01',
        type: 'founding',
        title: 'Globalstar founded as Loral/Qualcomm partnership',
        description: 'Globalstar was founded as a partnership between Loral Space & Communications and Qualcomm to build a LEO satellite phone system.',
        importance: 8,
      },
      {
        date: '2022-09-07',
        type: 'partnership',
        title: 'Apple Emergency SOS partnership announced',
        description: 'Apple announced satellite-based Emergency SOS feature on iPhone 14 powered by Globalstar constellation.',
        importance: 10,
      },
    ],
    facilities: [
      {
        name: 'Globalstar HQ',
        type: 'headquarters',
        city: 'Covington',
        state: 'LA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 70 },
    ],
  },

  // 3. Orbcomm
  {
    name: 'Orbcomm',
    legalName: 'ORBCOMM Inc.',
    slug: 'orbcomm',
    headquarters: 'Rochelle Park, NJ',
    country: 'United States',
    foundedYear: 1993,
    employeeRange: '500-1000',
    employeeCount: 700,
    website: 'https://www.orbcomm.com',
    description: 'Orbcomm is a global provider of IoT and M2M satellite connectivity solutions, operating a LEO constellation for asset tracking, fleet management, and supply chain visibility. Acquired by GI Partners in 2021, the company serves transportation, heavy equipment, maritime, and government sectors.',
    longDescription: 'Orbcomm combines its proprietary LEO satellite network with terrestrial connectivity (cellular, dual-mode) to provide comprehensive IoT solutions. The company specializes in cold chain monitoring, container tracking, heavy equipment telematics, and compliance management for the trucking industry.',
    ceo: 'Marc Eisenberg',
    sector: 'satellite-operator',
    subsector: 'iot-m2m',
    tags: ['IoT', 'M2M', 'asset-tracking', 'fleet-management', 'LEO'],
    tier: 2,
    revenueEstimate: 300000000,
    ownershipType: 'private',
    parentCompany: 'GI Partners',
    products: [
      {
        name: 'Orbcomm OG2 Constellation',
        category: 'satellite-constellation',
        description: 'Second-generation LEO constellation of 18 OG2 satellites providing global IoT and M2M data relay services.',
        status: 'active',
      },
      {
        name: 'FleetEdge',
        category: 'platform',
        description: 'Cloud-based fleet management platform offering real-time GPS tracking, driver behavior analytics, and compliance tools.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Marc Eisenberg',
        title: 'CEO',
        role: 'executive',
        previousCompanies: ['IntelliCheck'],
      },
    ],
    events: [
      {
        date: '1993-01-01',
        type: 'founding',
        title: 'Orbcomm founded as Orbital Communications',
        description: 'Founded as a subsidiary of Orbital Sciences to develop a low-cost LEO satellite messaging system.',
        importance: 7,
      },
      {
        date: '2021-09-01',
        type: 'acquisition',
        title: 'Acquired by GI Partners for $1.1B',
        description: 'GI Partners completed acquisition of Orbcomm, taking the company private in a $1.1 billion deal.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Orbcomm HQ',
        type: 'headquarters',
        city: 'Rochelle Park',
        state: 'NJ',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 65 },
    ],
  },

  // 4. Fleet Space
  {
    name: 'Fleet Space Technologies',
    legalName: 'Fleet Space Technologies Pty Ltd',
    slug: 'fleet-space',
    headquarters: 'Adelaide, SA',
    country: 'Australia',
    foundedYear: 2015,
    employeeRange: '100-250',
    employeeCount: 180,
    website: 'https://www.fleetspace.com',
    description: 'Fleet Space Technologies is an Australian space company building a constellation of LEO nanosatellites to enable ExoSphere, a mineral exploration platform that combines satellite connectivity with ambient noise tomography. The company provides real-time subsurface intelligence for the mining and resources sector.',
    longDescription: 'Fleet Space has developed a unique value proposition by combining its Centauri LEO satellite constellation with ground-based sensor networks for mineral exploration. The ExoSphere platform dramatically reduces the cost and time required for subsurface mapping, creating a space-enabled geoscience solution.',
    ceo: 'Flavia Tata Nardini',
    cto: 'Matthew Pearson',
    sector: 'satellite-operator',
    subsector: 'mineral-exploration',
    tags: ['LEO', 'nanosatellite', 'mineral-exploration', 'IoT', 'geoscience'],
    tier: 3,
    totalFunding: 70000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2023-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'ExoSphere',
        category: 'platform',
        description: 'Satellite-connected mineral exploration platform using ambient noise tomography for real-time subsurface intelligence.',
        status: 'active',
      },
      {
        name: 'Centauri Constellation',
        category: 'satellite-constellation',
        description: 'LEO nanosatellite constellation providing low-latency data relay for IoT sensors deployed in remote mining areas.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Flavia Tata Nardini',
        title: 'Co-founder & CEO',
        role: 'executive',
        bio: 'Former TNO and European Space Agency engineer who co-founded Fleet Space to democratize access to space connectivity.',
        previousCompanies: ['TNO', 'European Space Agency'],
      },
      {
        name: 'Matthew Pearson',
        title: 'Co-founder & CTO',
        role: 'technical',
        previousCompanies: ['University of South Australia'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-06-01',
        amount: 50000000,
        seriesLabel: 'Series C',
        roundType: 'series_c',
        leadInvestor: 'Blackbird Ventures',
      },
    ],
    events: [
      {
        date: '2015-01-01',
        type: 'founding',
        title: 'Fleet Space Technologies founded in Adelaide',
        description: 'Flavia Tata Nardini and Matthew Pearson founded Fleet Space to build satellite-connected IoT solutions.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Fleet Space HQ & Manufacturing',
        type: 'headquarters',
        city: 'Adelaide',
        state: 'SA',
        country: 'Australia',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
    ],
  },

  // 5. Kepler Communications
  {
    name: 'Kepler Communications',
    legalName: 'Kepler Communications Inc.',
    slug: 'kepler-communications',
    headquarters: 'Toronto, ON',
    country: 'Canada',
    foundedYear: 2015,
    employeeRange: '100-250',
    employeeCount: 150,
    website: 'https://www.keplercommunications.com',
    description: 'Kepler Communications is building a LEO constellation to provide high-bandwidth data relay services for other satellites and space infrastructure. The company offers store-and-forward and real-time connectivity for in-orbit assets, enabling continuous data transfer between spacecraft and ground stations.',
    longDescription: 'Kepler is focused on building the connectivity infrastructure for the space economy. Its constellation acts as a data relay network in orbit, allowing satellite operators to move data from their spacecraft to the ground faster and more affordably than traditional ground station networks alone.',
    ceo: 'Mina Mitry',
    sector: 'satellite-operator',
    subsector: 'data-relay',
    tags: ['LEO', 'data-relay', 'Ku-band', 'space-infrastructure', 'connectivity'],
    tier: 3,
    totalFunding: 100000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2022-09-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Kepler LEO Data Relay Network',
        category: 'satellite-constellation',
        description: 'LEO constellation providing real-time and store-and-forward data relay for satellite operators and space agencies.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Mina Mitry',
        title: 'Co-founder & CEO',
        role: 'executive',
        bio: 'Co-founded Kepler while at the University of Toronto Institute for Aerospace Studies.',
        previousCompanies: ['University of Toronto'],
      },
    ],
    fundingRounds: [
      {
        date: '2022-09-01',
        amount: 60000000,
        seriesLabel: 'Series C',
        roundType: 'series_c',
        leadInvestor: 'Tribe Capital',
      },
    ],
    events: [
      {
        date: '2015-01-01',
        type: 'founding',
        title: 'Kepler Communications founded in Toronto',
        description: 'Founded by Mina Mitry and Jeff Osborne to build space-to-space and space-to-ground data relay infrastructure.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Kepler HQ',
        type: 'headquarters',
        city: 'Toronto',
        state: 'ON',
        country: 'Canada',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },

  // 6. OQ Technology
  {
    name: 'OQ Technology',
    legalName: 'OQ Technology S.a.r.l.',
    slug: 'oq-technology',
    headquarters: 'Luxembourg City',
    country: 'Luxembourg',
    foundedYear: 2016,
    employeeRange: '50-100',
    employeeCount: 70,
    website: 'https://www.oqtec.com',
    description: 'OQ Technology is a satellite IoT connectivity provider building a LEO constellation to deliver 5G narrowband IoT (NB-IoT) and machine-to-machine communications globally. The company is one of the first to demonstrate 5G-standard protocols from space, targeting industrial IoT, agriculture, and logistics sectors.',
    longDescription: 'OQ Technology differentiates itself by implementing 3GPP-standard 5G NB-IoT protocols on its satellite constellation, enabling existing cellular IoT devices to connect via satellite without hardware modifications. This approach leverages the massive installed base of NB-IoT chipsets for seamless terrestrial-satellite convergence.',
    ceo: 'Omar Qaise',
    sector: 'satellite-operator',
    subsector: '5g-iot',
    tags: ['LEO', '5G', 'NB-IoT', 'M2M', 'direct-to-device'],
    tier: 3,
    totalFunding: 20000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'OQ Technology 5G IoT Constellation',
        category: 'satellite-constellation',
        description: 'LEO satellite constellation providing 3GPP-standard 5G NB-IoT connectivity for industrial and commercial IoT devices.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Omar Qaise',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Satellite communications engineer who founded OQ Technology to bring cellular IoT standards to space.',
        previousCompanies: ['SES'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-01-01',
        amount: 12000000,
        seriesLabel: 'Series A',
        roundType: 'series_a',
        leadInvestor: 'Saudi Venture Capital',
      },
    ],
    events: [
      {
        date: '2016-01-01',
        type: 'founding',
        title: 'OQ Technology founded in Luxembourg',
        description: 'Omar Qaise founded OQ Technology to develop 5G IoT satellite connectivity solutions.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'OQ Technology HQ',
        type: 'headquarters',
        city: 'Luxembourg City',
        country: 'Luxembourg',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 48 },
    ],
  },

  // 7. Kineis
  {
    name: 'Kineis',
    legalName: 'Kineis SAS',
    slug: 'kineis',
    headquarters: 'Toulouse',
    country: 'France',
    foundedYear: 2018,
    employeeRange: '50-100',
    employeeCount: 80,
    website: 'https://www.kineis.com',
    description: 'Kineis is a French IoT satellite operator and CNES spinoff building a 25-nanosatellite LEO constellation to provide global IoT connectivity. The company is the successor and modernization of the Argos system, which has been tracking wildlife and collecting environmental data since 1978.',
    longDescription: 'Kineis emerged from the Collecte Localisation Satellites (CLS) organization, inheriting the legacy Argos environmental monitoring system. The new constellation dramatically increases the capacity and reduces latency of satellite-based IoT services for environmental monitoring, maritime tracking, agriculture, and logistics.',
    ceo: 'Alexandre Tisserant',
    sector: 'satellite-operator',
    subsector: 'iot-environmental',
    tags: ['LEO', 'IoT', 'nanosatellite', 'Argos', 'environmental-monitoring'],
    tier: 3,
    totalFunding: 110000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-05-01',
    ownershipType: 'private',
    parentCompany: 'CLS/CNES',
    products: [
      {
        name: 'Kineis IoT Constellation',
        category: 'satellite-constellation',
        description: '25-nanosatellite LEO constellation for global IoT connectivity, successor to the Argos environmental data collection system.',
        status: 'deploying',
      },
    ],
    keyPersonnel: [
      {
        name: 'Alexandre Tisserant',
        title: 'CEO',
        role: 'executive',
        bio: 'Led Kineis from CNES spinoff through constellation deployment, bridging legacy Argos heritage with modern IoT.',
        previousCompanies: ['CLS'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-05-01',
        amount: 60000000,
        seriesLabel: 'Series B',
        roundType: 'series_b',
        leadInvestor: 'Bpifrance',
      },
    ],
    events: [
      {
        date: '2018-01-01',
        type: 'founding',
        title: 'Kineis spun off from CLS/CNES',
        description: 'Kineis was established as a CNES spinoff to modernize and expand the Argos satellite IoT system with a new constellation.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Kineis HQ',
        type: 'headquarters',
        city: 'Toulouse',
        country: 'France',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 52 },
    ],
  },

  // 8. E-Space
  {
    name: 'E-Space',
    legalName: 'E-Space Inc.',
    slug: 'e-space',
    headquarters: 'Sarasota, FL',
    country: 'United States',
    foundedYear: 2021,
    employeeRange: '100-250',
    employeeCount: 130,
    website: 'https://www.e-space.com',
    description: 'E-Space is developing a LEO mega-constellation of over 100,000 small, debris-reducing satellites designed to provide global IoT and communications services while actively mitigating orbital debris. Founded by Greg Wyler, the company holds ITU filings from Rwanda for its constellation and focuses on sustainable space operations.',
    longDescription: 'E-Space takes a unique approach to mega-constellations by designing satellites that will demise quickly upon reentry and can actively capture small debris objects. The company aims to prove that very large constellations can be operated responsibly while providing affordable global connectivity.',
    ceo: 'Greg Wyler',
    sector: 'satellite-operator',
    subsector: 'mega-constellation',
    tags: ['LEO', 'mega-constellation', 'debris-reduction', 'IoT', 'sustainability'],
    tier: 3,
    totalFunding: 50000000,
    lastFundingRound: 'Seed',
    lastFundingDate: '2022-03-01',
    ownershipType: 'private',
    products: [
      {
        name: 'E-Space LEO Mega-Constellation',
        category: 'satellite-constellation',
        description: 'Planned 100,000+ satellite constellation with debris-reducing design for global IoT and communications.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Greg Wyler',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Serial satellite entrepreneur who previously founded O3b Networks (now part of SES) and OneWeb.',
        previousCompanies: ['O3b Networks', 'OneWeb'],
      },
    ],
    events: [
      {
        date: '2021-01-01',
        type: 'founding',
        title: 'E-Space founded by Greg Wyler',
        description: 'Greg Wyler founded E-Space to build a sustainable mega-constellation with debris mitigation at its core.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'E-Space HQ',
        type: 'headquarters',
        city: 'Sarasota',
        state: 'FL',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 45 },
    ],
  },

  // 9. Mangata Networks
  {
    name: 'Mangata Networks',
    legalName: 'Mangata Networks Inc.',
    slug: 'mangata-networks',
    headquarters: 'Dallas, TX',
    country: 'United States',
    foundedYear: 2020,
    employeeRange: '50-100',
    employeeCount: 60,
    website: 'https://www.mangatanetworks.com',
    description: 'Mangata Networks is developing a hybrid MEO/HEO constellation combining medium and highly elliptical orbit satellites to provide broadband connectivity with a focus on polar and high-latitude regions traditionally underserved by GEO and LEO systems.',
    longDescription: 'Mangata uniquely combines MEO and HEO orbits to deliver low-latency broadband with edge computing capabilities. The HEO component provides persistent coverage over polar regions and high latitudes, while MEO satellites serve mid-latitude and equatorial markets. The architecture also integrates on-orbit edge processing.',
    ceo: 'Brian Holz',
    sector: 'satellite-operator',
    subsector: 'broadband',
    tags: ['MEO', 'HEO', 'broadband', 'edge-computing', 'polar-coverage'],
    tier: 3,
    totalFunding: 33000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2022-09-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Mangata MEO/HEO Broadband Constellation',
        category: 'satellite-constellation',
        description: 'Hybrid MEO/HEO constellation delivering low-latency broadband with integrated edge computing, focused on polar and underserved regions.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Brian Holz',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Experienced satellite and telecommunications executive who founded Mangata to address polar connectivity gaps.',
        previousCompanies: ['ICG Communications'],
      },
    ],
    fundingRounds: [
      {
        date: '2022-09-01',
        amount: 33000000,
        seriesLabel: 'Series A',
        roundType: 'series_a',
        leadInvestor: 'Playground Global',
      },
    ],
    events: [
      {
        date: '2020-01-01',
        type: 'founding',
        title: 'Mangata Networks founded in Dallas',
        description: 'Brian Holz founded Mangata Networks to build a hybrid MEO/HEO broadband constellation with edge computing.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Mangata Networks HQ',
        type: 'headquarters',
        city: 'Dallas',
        state: 'TX',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 40 },
    ],
  },

  // 10. Tomorrow.io
  {
    name: 'Tomorrow.io',
    legalName: 'Tomorrow.io Inc.',
    slug: 'tomorrow-io',
    headquarters: 'Boston, MA',
    country: 'United States',
    foundedYear: 2016,
    employeeRange: '250-500',
    employeeCount: 350,
    website: 'https://www.tomorrow.io',
    description: 'Tomorrow.io is a weather intelligence company building a proprietary constellation of radar-equipped microsatellites to provide real-time, high-resolution global weather data. The company combines its satellite observations with AI-driven weather models to deliver decision-ready forecasts for aviation, defense, logistics, and energy sectors.',
    longDescription: 'Tomorrow.io (formerly ClimaCell) has expanded from a software-only weather analytics platform to a vertically integrated space and AI weather company. Its satellite constellation carries miniaturized radar instruments that fill critical data gaps in global weather observation, particularly over oceans and developing regions.',
    ceo: 'Shimon Elkabetz',
    sector: 'satellite-operator',
    subsector: 'weather-intelligence',
    tags: ['weather', 'microsatellite', 'radar', 'AI', 'earth-observation'],
    tier: 3,
    totalFunding: 380000000,
    lastFundingRound: 'Series E',
    lastFundingDate: '2023-11-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Tomorrow.io Weather Radar Constellation',
        category: 'satellite-constellation',
        description: 'Proprietary constellation of microsatellites equipped with Ka-band radar for global precipitation and weather observation.',
        status: 'deploying',
      },
      {
        name: 'Tomorrow.io Weather Intelligence Platform',
        category: 'platform',
        description: 'AI-powered weather forecasting platform providing hyperlocal, real-time weather insights for enterprise decision-making.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Shimon Elkabetz',
        title: 'Co-founder & CEO',
        role: 'executive',
        bio: 'Former Israel Defense Forces intelligence officer who co-founded Tomorrow.io to revolutionize weather prediction.',
        previousCompanies: ['IDF Intelligence'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-11-01',
        amount: 87000000,
        seriesLabel: 'Series E',
        roundType: 'series_e',
        leadInvestor: 'SquarePoint Capital',
      },
    ],
    events: [
      {
        date: '2016-01-01',
        type: 'founding',
        title: 'ClimaCell (now Tomorrow.io) founded in Boston',
        description: 'Shimon Elkabetz and Rei Goffer co-founded ClimaCell (later rebranded Tomorrow.io) to build next-gen weather intelligence.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Tomorrow.io HQ',
        type: 'headquarters',
        city: 'Boston',
        state: 'MA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
    ],
  },

  // 11. PlanetiQ
  {
    name: 'PlanetiQ',
    legalName: 'PlanetiQ LLC',
    slug: 'planetiq',
    headquarters: 'Golden, CO',
    country: 'United States',
    foundedYear: 2012,
    employeeRange: '50-100',
    employeeCount: 60,
    website: 'https://www.planetiq.com',
    description: 'PlanetiQ builds and operates a constellation of GNSS radio occultation (GNSS-RO) weather satellites that measure atmospheric temperature, pressure, and moisture profiles with high accuracy. The company sells its data to meteorological agencies and commercial weather forecasters to improve numerical weather prediction models.',
    longDescription: 'PlanetiQ satellites use the GNSS-RO technique, measuring how GPS and other GNSS signals bend as they pass through the atmosphere, to generate precise vertical profiles of atmospheric conditions. This data type is considered among the most valuable per-observation inputs for global weather models.',
    ceo: 'Chris McCormick',
    sector: 'satellite-operator',
    subsector: 'weather-data',
    tags: ['GNSS-RO', 'weather', 'atmospheric-science', 'LEO', 'meteorology'],
    tier: 3,
    totalFunding: 80000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2021-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'PlanetiQ GNSS-RO Constellation',
        category: 'satellite-constellation',
        description: 'LEO constellation of GNSS radio occultation satellites generating high-accuracy atmospheric sounding data for weather forecasting.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Chris McCormick',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads PlanetiQ operations and strategy, driving commercial weather data from space.',
        previousCompanies: ['Ball Aerospace'],
      },
    ],
    events: [
      {
        date: '2012-01-01',
        type: 'founding',
        title: 'PlanetiQ founded in Golden, Colorado',
        description: 'PlanetiQ was founded to commercialize GNSS radio occultation weather observation from a dedicated satellite constellation.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'PlanetiQ HQ',
        type: 'headquarters',
        city: 'Golden',
        state: 'CO',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 48 },
    ],
  },

  // 12. Synspective
  {
    name: 'Synspective',
    legalName: 'Synspective Inc.',
    slug: 'synspective',
    headquarters: 'Tokyo',
    country: 'Japan',
    foundedYear: 2018,
    employeeRange: '100-250',
    employeeCount: 180,
    website: 'https://www.synspective.com',
    description: 'Synspective is a Japanese space startup building the StriX constellation of small SAR (Synthetic Aperture Radar) satellites for all-weather, day-and-night earth observation. The company provides land displacement monitoring, infrastructure analysis, and disaster response data products.',
    longDescription: 'Synspective combines its StriX SAR satellite constellation with proprietary analytics to deliver actionable geospatial intelligence. SAR satellites can image the Earth through clouds and at night, making them essential for infrastructure monitoring, disaster response, and defense applications. The company aims to deploy 30 satellites for near-real-time global SAR coverage.',
    ceo: 'Motoyuki Arai',
    sector: 'earth-observation',
    subsector: 'SAR',
    tags: ['SAR', 'earth-observation', 'infrastructure-monitoring', 'LEO', 'disaster-response'],
    tier: 3,
    totalFunding: 230000000,
    lastFundingRound: 'Series C',
    lastFundingDate: '2023-10-01',
    ownershipType: 'private',
    products: [
      {
        name: 'StriX SAR Constellation',
        category: 'satellite-constellation',
        description: 'Constellation of small X-band SAR satellites providing all-weather, day-and-night earth observation imagery.',
        status: 'deploying',
      },
      {
        name: 'Land Displacement Monitoring',
        category: 'data-product',
        description: 'InSAR-based analytics service detecting ground subsidence and land displacement for infrastructure protection.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Motoyuki Arai',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Former JAXA researcher who founded Synspective to commercialize small SAR satellite technology.',
        previousCompanies: ['JAXA', 'University of Tokyo'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-10-01',
        amount: 100000000,
        seriesLabel: 'Series C',
        roundType: 'series_c',
        leadInvestor: 'Sompo Holdings',
      },
    ],
    events: [
      {
        date: '2018-01-01',
        type: 'founding',
        title: 'Synspective founded in Tokyo',
        description: 'Motoyuki Arai founded Synspective to build a constellation of small SAR satellites for global observation.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Synspective HQ',
        type: 'headquarters',
        city: 'Tokyo',
        country: 'Japan',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 58 },
    ],
  },

  // 13. Warpspace
  {
    name: 'Warpspace',
    legalName: 'Warpspace Inc.',
    slug: 'warpspace',
    headquarters: 'Tsukuba',
    country: 'Japan',
    foundedYear: 2016,
    employeeRange: '10-50',
    employeeCount: 40,
    website: 'https://warpspace.jp',
    description: 'Warpspace is a Japanese startup developing an optical inter-satellite data relay constellation in MEO to enable high-speed data downlink from LEO satellites. The company aims to solve the bottleneck of limited ground station contact time by relaying data between orbits using laser communications.',
    longDescription: 'Warpspace was spun out of the University of Tsukuba and focuses on optical (laser) inter-satellite links for data relay. By placing relay satellites in MEO, the system can receive data from LEO satellites and forward it to ground stations with much higher availability than direct LEO-to-ground passes.',
    ceo: 'Toshihiro Kameda',
    sector: 'satellite-operator',
    subsector: 'optical-data-relay',
    tags: ['optical-comms', 'data-relay', 'MEO', 'laser-links', 'OISL'],
    tier: 3,
    totalFunding: 25000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-03-01',
    ownershipType: 'private',
    products: [
      {
        name: 'WarpHub Optical Data Relay',
        category: 'satellite-constellation',
        description: 'MEO optical data relay constellation using laser inter-satellite links for high-speed LEO-to-ground data transfer.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Toshihiro Kameda',
        title: 'Co-founder & CEO',
        role: 'executive',
        bio: 'Founded Warpspace from University of Tsukuba research to commercialize optical inter-satellite data relay.',
        previousCompanies: ['University of Tsukuba'],
      },
    ],
    events: [
      {
        date: '2016-01-01',
        type: 'founding',
        title: 'Warpspace founded as University of Tsukuba spinoff',
        description: 'Warpspace was founded to develop and commercialize optical data relay technology for LEO satellite operators.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Warpspace HQ',
        type: 'headquarters',
        city: 'Tsukuba',
        country: 'Japan',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 38 },
    ],
  },

  // 14. GeoOptics
  {
    name: 'GeoOptics',
    legalName: 'GeoOptics Inc.',
    slug: 'geooptics',
    headquarters: 'Pasadena, CA',
    country: 'United States',
    foundedYear: 2006,
    employeeRange: '10-50',
    employeeCount: 35,
    website: 'https://www.geooptics.com',
    description: 'GeoOptics operates a constellation of GNSS radio occultation (GNSS-RO) weather satellites under the CICERO program, providing high-quality atmospheric sounding data for weather forecasting and climate research. The company sells data to NOAA and international meteorological agencies.',
    longDescription: 'GeoOptics developed the CICERO (Community Initiative for Continuing Earth Radio Occultation) constellation to provide commercial GNSS-RO data. Radio occultation measurements are among the most cost-effective and accurate observations for improving numerical weather prediction, particularly for temperature and moisture profiles.',
    ceo: 'Conrad Lautenbacher',
    sector: 'satellite-operator',
    subsector: 'weather-data',
    tags: ['GNSS-RO', 'weather', 'CICERO', 'atmospheric-science', 'NOAA'],
    tier: 3,
    totalFunding: 40000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2020-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'CICERO GNSS-RO Constellation',
        category: 'satellite-constellation',
        description: 'LEO constellation of GNSS radio occultation satellites providing atmospheric sounding data for weather prediction improvement.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Conrad Lautenbacher',
        title: 'CEO',
        role: 'executive',
        bio: 'Former NOAA Administrator and Vice Admiral (USN, Ret.) who leads GeoOptics commercial weather data mission.',
        previousCompanies: ['NOAA', 'US Navy'],
      },
    ],
    events: [
      {
        date: '2006-01-01',
        type: 'founding',
        title: 'GeoOptics founded in Pasadena',
        description: 'GeoOptics was founded to commercialize GNSS radio occultation technology for weather and climate observations.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'GeoOptics HQ',
        type: 'headquarters',
        city: 'Pasadena',
        state: 'CA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 42 },
    ],
  },

  // 15. Open Cosmos
  {
    name: 'Open Cosmos',
    legalName: 'Open Cosmos Ltd',
    slug: 'open-cosmos',
    headquarters: 'Harwell, Oxfordshire',
    country: 'United Kingdom',
    foundedYear: 2014,
    employeeRange: '100-250',
    employeeCount: 200,
    website: 'https://www.open-cosmos.com',
    description: 'Open Cosmos provides end-to-end satellite missions as a service, from spacecraft design and manufacturing through launch, operations, and data delivery. The company enables organizations to deploy their own Earth observation, IoT, and communications satellites without building in-house space capabilities.',
    longDescription: 'Open Cosmos has delivered multiple satellite missions for government agencies, international organizations, and commercial customers. Their vertically integrated model covers mission design, satellite manufacturing at their UK facility, launch procurement, ground segment operations, and downstream data processing.',
    ceo: 'Rafel Jorda Siquier',
    sector: 'satellite-operator',
    subsector: 'satellite-as-a-service',
    tags: ['satellite-as-a-service', 'earth-observation', 'smallsat', 'mission-design', 'UK-space'],
    tier: 3,
    totalFunding: 75000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-04-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Open Cosmos Mission-as-a-Service',
        category: 'service',
        description: 'End-to-end satellite mission service including spacecraft design, build, launch, operations, and data delivery.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Rafel Jorda Siquier',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Aerospace engineer who founded Open Cosmos to democratize access to space through mission-as-a-service.',
        previousCompanies: ['Deimos Space'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-04-01',
        amount: 50000000,
        seriesLabel: 'Series B',
        roundType: 'series_b',
        leadInvestor: 'Seraphim Space',
      },
    ],
    events: [
      {
        date: '2014-01-01',
        type: 'founding',
        title: 'Open Cosmos founded in the UK',
        description: 'Rafel Jorda Siquier founded Open Cosmos to provide turnkey satellite missions for organizations worldwide.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Open Cosmos HQ & Manufacturing',
        type: 'headquarters',
        city: 'Harwell',
        state: 'Oxfordshire',
        country: 'United Kingdom',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },

  // 16. Astranis
  {
    name: 'Astranis',
    legalName: 'Astranis Space Technologies Corp.',
    slug: 'astranis',
    headquarters: 'San Francisco, CA',
    country: 'United States',
    foundedYear: 2015,
    employeeRange: '250-500',
    employeeCount: 400,
    website: 'https://www.astranis.com',
    description: 'Astranis designs and manufactures small GEO broadband satellites (MicroGEO) that are a fraction of the size and cost of traditional geostationary communications satellites. Each Astranis satellite provides dedicated broadband capacity to a single country or region, enabling faster deployment of satellite internet services.',
    longDescription: 'Astranis has pioneered the MicroGEO concept, building geostationary broadband satellites weighing around 400 kg compared to 5,000-6,000 kg for traditional GEO commsats. This dramatically lowers the cost and timeline to deploy dedicated satellite broadband, making it viable for smaller markets and nations that could not previously justify a full-size GEO satellite.',
    ceo: 'John Gedmark',
    sector: 'satellite-operator',
    subsector: 'broadband',
    tags: ['MicroGEO', 'GEO', 'broadband', 'dedicated-capacity', 'smallsat'],
    tier: 2,
    totalFunding: 560000000,
    lastFundingRound: 'Series D',
    lastFundingDate: '2024-01-01',
    valuation: 3500000000,
    ownershipType: 'private',
    products: [
      {
        name: 'Astranis MicroGEO Satellite',
        category: 'satellite',
        description: 'Small geostationary broadband satellite delivering 7.5+ Gbps dedicated capacity per spacecraft at a fraction of traditional GEO satellite cost.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'John Gedmark',
        title: 'Co-founder & CEO',
        role: 'executive',
        bio: 'Former executive director of the Commercial Spaceflight Federation who co-founded Astranis to disrupt GEO broadband.',
        previousCompanies: ['Commercial Spaceflight Federation'],
      },
      {
        name: 'Ryan McLinko',
        title: 'Co-founder & CTO',
        role: 'technical',
        previousCompanies: ['Qualcomm'],
      },
    ],
    fundingRounds: [
      {
        date: '2024-01-01',
        amount: 200000000,
        seriesLabel: 'Series D',
        roundType: 'series_d',
        leadInvestor: 'Andreessen Horowitz',
      },
    ],
    events: [
      {
        date: '2015-01-01',
        type: 'founding',
        title: 'Astranis founded in San Francisco',
        description: 'John Gedmark and Ryan McLinko founded Astranis to build smaller, cheaper GEO broadband satellites.',
        importance: 8,
      },
      {
        date: '2023-04-01',
        type: 'launch',
        title: 'First MicroGEO satellite launched',
        description: 'Astranis launched its first commercial MicroGEO satellite for dedicated broadband service.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'Astranis HQ & Factory',
        type: 'headquarters',
        city: 'San Francisco',
        state: 'CA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 68 },
    ],
  },

  // 17. Satellogic
  {
    name: 'Satellogic',
    legalName: 'Satellogic Inc.',
    slug: 'satellogic',
    ticker: 'SATL',
    exchange: 'NASDAQ',
    headquarters: 'Montevideo / Buenos Aires',
    country: 'Uruguay',
    foundedYear: 2010,
    employeeRange: '250-500',
    employeeCount: 300,
    website: 'https://www.satellogic.com',
    description: 'Satellogic is a vertically integrated earth observation company operating a constellation of high-resolution multispectral and hyperspectral imaging satellites. The company provides sub-meter imagery and analytics to government, agriculture, energy, and financial services customers worldwide.',
    longDescription: 'Satellogic designs, builds, and operates its own satellites in-house, achieving some of the lowest per-unit satellite costs in the industry. Its constellation delivers both multispectral (sub-meter) and hyperspectral imagery, providing a unique dual-sensor capability for detailed surface analysis and change detection.',
    ceo: 'Emiliano Kargieman',
    isPublic: true,
    marketCap: 300000000,
    sector: 'earth-observation',
    subsector: 'multispectral-imaging',
    tags: ['earth-observation', 'multispectral', 'hyperspectral', 'sub-meter', 'LEO'],
    tier: 2,
    totalFunding: 250000000,
    revenueEstimate: 25000000,
    ownershipType: 'public',
    products: [
      {
        name: 'Satellogic EO Constellation',
        category: 'satellite-constellation',
        description: 'LEO constellation of multispectral and hyperspectral earth observation satellites delivering sub-meter resolution imagery.',
        status: 'active',
      },
      {
        name: 'Aleph-1 Platform',
        category: 'platform',
        description: 'Cloud-based geospatial analytics platform providing access to Satellogic constellation imagery and derived data products.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Emiliano Kargieman',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Argentine entrepreneur and hacker who founded Satellogic to democratize access to high-resolution satellite imagery.',
        previousCompanies: ['Aconcagua Ventures', 'Core Security'],
      },
    ],
    events: [
      {
        date: '2010-01-01',
        type: 'founding',
        title: 'Satellogic founded in Buenos Aires',
        description: 'Emiliano Kargieman founded Satellogic to build an affordable high-resolution earth observation constellation.',
        importance: 8,
      },
      {
        date: '2022-01-25',
        type: 'ipo',
        title: 'Satellogic goes public via SPAC merger',
        description: 'Satellogic completed its SPAC merger with CF Acquisition Corp VIII, listing on NASDAQ under ticker SATL.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Satellogic HQ',
        type: 'headquarters',
        city: 'Montevideo',
        country: 'Uruguay',
      },
      {
        name: 'Satellogic Buenos Aires Office',
        type: 'office',
        city: 'Buenos Aires',
        country: 'Argentina',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 62 },
    ],
  },

  // 18. Rivada Space Networks
  {
    name: 'Rivada Space Networks',
    legalName: 'Rivada Space Networks GmbH',
    slug: 'rivada-space-networks',
    headquarters: 'Munich',
    country: 'Germany',
    foundedYear: 2021,
    employeeRange: '100-250',
    employeeCount: 150,
    website: 'https://www.rivadasn.com',
    description: 'Rivada Space Networks is developing a 600-satellite LEO constellation with laser inter-satellite links to create a secure, low-latency mesh network in space. The system is designed to provide sovereign, end-to-end encrypted connectivity for government, defense, and enterprise customers without data touching third-party ground infrastructure.',
    longDescription: 'Rivada Space Networks is building what it calls an OuterNET - a fully meshed optical network in space that routes data between satellites before delivering it to dedicated ground stations. This architecture enables data sovereignty, as traffic can be routed entirely in orbit without transiting foreign ground segments.',
    ceo: 'Declan Ganley',
    sector: 'satellite-operator',
    subsector: 'secure-communications',
    tags: ['LEO', 'mesh-network', 'laser-ISL', 'data-sovereignty', 'secure-comms'],
    tier: 3,
    totalFunding: 100000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Rivada OuterNET',
        category: 'satellite-constellation',
        description: '600-satellite LEO constellation with optical inter-satellite links forming a secure, sovereign mesh network for encrypted connectivity.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Declan Ganley',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Irish entrepreneur and telecommunications executive who founded Rivada Networks and its space subsidiary.',
        previousCompanies: ['Rivada Networks'],
      },
    ],
    events: [
      {
        date: '2021-01-01',
        type: 'founding',
        title: 'Rivada Space Networks founded in Munich',
        description: 'Declan Ganley founded Rivada Space Networks to build a sovereign LEO mesh constellation with laser inter-satellite links.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Rivada Space Networks HQ',
        type: 'headquarters',
        city: 'Munich',
        country: 'Germany',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// GROUND SEGMENT (12 companies)
// ═══════════════════════════════════════════════════════════════

const GROUND_SEGMENT: CompanyData[] = [
  // 1. KSAT (Kongsberg Satellite Services)
  {
    name: 'KSAT',
    legalName: 'Kongsberg Satellite Services AS',
    slug: 'ksat',
    headquarters: 'Tromso',
    country: 'Norway',
    foundedYear: 2002,
    employeeRange: '500-1000',
    employeeCount: 600,
    website: 'https://www.ksat.no',
    description: 'KSAT (Kongsberg Satellite Services) is the world\'s largest commercial ground station network operator, with 270+ antennas across 26 ground station locations including unique polar sites in Svalbard and Antarctica. The company provides satellite ground segment services to space agencies, defense customers, and commercial satellite operators.',
    longDescription: 'KSAT provides ground segment services for all orbit types including LEO, MEO, and GEO. Its Svalbard and TrollSat (Antarctica) ground stations provide unparalleled polar coverage, making KSAT the preferred ground segment partner for Earth observation missions requiring rapid data downlink. The company also offers KSATlite, a network of small antennas optimized for smallsat and NewSpace operators.',
    ceo: 'Rolf Skatteboe',
    sector: 'ground-segment',
    subsector: 'ground-station-network',
    tags: ['ground-station', 'polar-coverage', 'Svalbard', 'LEO-support', 'satellite-operations'],
    tier: 2,
    revenueEstimate: 200000000,
    ownershipType: 'private',
    parentCompany: 'Kongsberg Defence & Aerospace / Space Norway',
    products: [
      {
        name: 'KSAT Ground Station Network',
        category: 'ground-segment',
        description: 'Global network of 270+ antennas at 26 locations providing TT&C, data downlink, and mission support for satellite operators.',
        status: 'active',
      },
      {
        name: 'KSATlite',
        category: 'ground-segment',
        description: 'Cost-effective network of small antennas optimized for NewSpace and smallsat operators needing scalable ground support.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Rolf Skatteboe',
        title: 'CEO',
        role: 'executive',
        bio: 'Long-serving CEO who built KSAT into the world\'s largest commercial ground station network.',
        previousCompanies: ['Kongsberg'],
      },
    ],
    events: [
      {
        date: '2002-01-01',
        type: 'founding',
        title: 'KSAT founded as Kongsberg/Space Norway joint venture',
        description: 'Kongsberg Satellite Services was established as a joint venture between Kongsberg Defence & Aerospace and Space Norway to operate ground stations.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'KSAT HQ',
        type: 'headquarters',
        city: 'Tromso',
        country: 'Norway',
      },
      {
        name: 'Svalbard Ground Station',
        type: 'ground-station',
        city: 'Longyearbyen',
        country: 'Norway',
      },
      {
        name: 'TrollSat Antarctica',
        type: 'ground-station',
        country: 'Antarctica',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 72 },
    ],
  },

  // 2. SSC (Swedish Space Corporation)
  {
    name: 'SSC',
    legalName: 'Swedish Space Corporation',
    slug: 'ssc-swedish-space',
    headquarters: 'Solna',
    country: 'Sweden',
    foundedYear: 1972,
    employeeRange: '500-1000',
    employeeCount: 700,
    website: 'https://www.sscspace.com',
    description: 'SSC (Swedish Space Corporation) operates a global network of ground stations and provides launch services, satellite management, and engineering support. The company runs ground stations from Esrange in northern Sweden to facilities in Australia, Chile, and other global locations.',
    longDescription: 'SSC is a Swedish state-owned enterprise that has been a pillar of European space infrastructure for over 50 years. Beyond ground stations, SSC operates the Esrange Space Center for sounding rockets and stratospheric balloons, and provides complete satellite operations services including mission control, orbit determination, and data distribution.',
    ceo: 'Stefan Gardefjord',
    sector: 'ground-segment',
    subsector: 'ground-station-network',
    tags: ['ground-station', 'Esrange', 'launch-services', 'satellite-operations', 'European-space'],
    tier: 2,
    revenueEstimate: 250000000,
    ownershipType: 'state-owned',
    products: [
      {
        name: 'SSC Global Ground Station Network',
        category: 'ground-segment',
        description: 'Worldwide network of ground stations providing TT&C, data reception, and satellite management across multiple continents.',
        status: 'active',
      },
      {
        name: 'Esrange Space Center',
        category: 'launch-facility',
        description: 'Northern Sweden space center providing sounding rocket launches, stratospheric balloon flights, and satellite ground services.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Stefan Gardefjord',
        title: 'President & CEO',
        role: 'executive',
        bio: 'Leads SSC as it expands from traditional ground segment services into commercial launch support from Esrange.',
        previousCompanies: ['SSC'],
      },
    ],
    events: [
      {
        date: '1972-01-01',
        type: 'founding',
        title: 'Swedish Space Corporation established',
        description: 'The Swedish government established SSC to manage Sweden\'s space activities and the Esrange Space Center.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'SSC HQ',
        type: 'headquarters',
        city: 'Solna',
        country: 'Sweden',
      },
      {
        name: 'Esrange Space Center',
        type: 'launch-facility',
        city: 'Kiruna',
        country: 'Sweden',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 70 },
    ],
  },

  // 3. AWS Ground Station
  {
    name: 'AWS Ground Station',
    legalName: 'Amazon Web Services, Inc.',
    slug: 'aws-ground-station',
    headquarters: 'Seattle, WA',
    country: 'United States',
    foundedYear: 2018,
    employeeRange: '100-250',
    employeeCount: 150,
    website: 'https://aws.amazon.com/ground-station/',
    description: 'AWS Ground Station is a fully managed ground station as a service (GSaaS) from Amazon Web Services that enables satellite operators to control satellites and ingest data directly into the AWS cloud. The service eliminates the need for customers to build and maintain their own ground station infrastructure.',
    longDescription: 'AWS Ground Station integrates directly with the broader AWS cloud ecosystem, allowing satellite operators to process, store, and analyze downlinked data using services like EC2, S3, and SageMaker immediately after reception. The service operates antenna systems at multiple AWS regions worldwide and supports S-band and X-band frequencies.',
    ceo: 'Matt Garman',
    sector: 'ground-segment',
    subsector: 'gsaas',
    tags: ['GSaaS', 'cloud', 'AWS', 'satellite-data', 'managed-service'],
    tier: 2,
    ownershipType: 'subsidiary',
    parentCompany: 'Amazon',
    products: [
      {
        name: 'AWS Ground Station',
        category: 'ground-segment',
        description: 'Fully managed cloud-integrated ground station service enabling satellite operators to downlink data directly into AWS for processing.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Matt Garman',
        title: 'CEO, Amazon Web Services',
        role: 'executive',
        bio: 'Leads AWS including the Ground Station and aerospace/satellite services portfolio.',
        previousCompanies: ['Amazon'],
      },
    ],
    events: [
      {
        date: '2018-11-01',
        type: 'founding',
        title: 'AWS Ground Station announced at re:Invent',
        description: 'Amazon Web Services announced AWS Ground Station at the 2018 re:Invent conference, entering the satellite ground segment market.',
        importance: 9,
      },
    ],
    facilities: [
      {
        name: 'AWS Ground Station - US East',
        type: 'ground-station',
        state: 'OH',
        country: 'United States',
      },
      {
        name: 'AWS Ground Station - US West',
        type: 'ground-station',
        state: 'OR',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 75 },
    ],
  },

  // 4. ATLAS Space Operations
  {
    name: 'ATLAS Space Operations',
    legalName: 'ATLAS Space Operations Inc.',
    slug: 'atlas-space-operations',
    headquarters: 'Traverse City, MI',
    country: 'United States',
    foundedYear: 2015,
    employeeRange: '50-100',
    employeeCount: 80,
    website: 'https://www.atlasground.com',
    description: 'ATLAS Space Operations provides a software-defined ground network called Freedom that enables satellite operators to schedule and manage ground station contacts across a federated network of antennas worldwide. The platform offers automated satellite communication management and data delivery.',
    longDescription: 'ATLAS takes a software-first approach to ground segment operations, connecting satellite operators with a federated network of ground station partners through its Freedom platform. The system automates contact scheduling, antenna pointing, data capture, and delivery, reducing the complexity and cost of ground segment management for NewSpace operators.',
    ceo: 'Sean McDaniel',
    sector: 'ground-segment',
    subsector: 'software-defined-ground',
    tags: ['ground-station', 'software-defined', 'federated-network', 'automation', 'NewSpace'],
    tier: 3,
    totalFunding: 30000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2022-06-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Freedom Ground Network',
        category: 'ground-segment',
        description: 'Software-defined ground station platform providing automated satellite contact scheduling, data capture, and delivery across a federated antenna network.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Sean McDaniel',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Former USAF officer who founded ATLAS to modernize satellite ground station operations with software automation.',
        previousCompanies: ['US Air Force'],
      },
    ],
    fundingRounds: [
      {
        date: '2022-06-01',
        amount: 18000000,
        seriesLabel: 'Series B',
        roundType: 'series_b',
        leadInvestor: 'Lockheed Martin Ventures',
      },
    ],
    events: [
      {
        date: '2015-01-01',
        type: 'founding',
        title: 'ATLAS Space Operations founded in Michigan',
        description: 'Sean McDaniel founded ATLAS to build a software-defined ground station network for the NewSpace industry.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'ATLAS HQ',
        type: 'headquarters',
        city: 'Traverse City',
        state: 'MI',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 50 },
    ],
  },

  // 5. Infostellar
  {
    name: 'Infostellar',
    legalName: 'Infostellar Inc.',
    slug: 'infostellar',
    headquarters: 'Tokyo',
    country: 'Japan',
    foundedYear: 2016,
    employeeRange: '10-50',
    employeeCount: 40,
    website: 'https://www.infostellar.net',
    description: 'Infostellar operates StellarStation, a cloud-based marketplace that connects satellite operators with available ground station antenna time worldwide. The platform allows ground station owners to monetize idle capacity while giving satellite operators flexible, on-demand access to global ground infrastructure.',
    longDescription: 'Infostellar has built a sharing economy model for satellite ground stations. StellarStation acts as an intermediary platform that aggregates unused antenna time from ground station operators around the world and makes it available to satellite operators via API. This approach maximizes utilization of existing ground infrastructure while reducing costs for satellite operators.',
    ceo: 'Naomi Kurahara',
    sector: 'ground-segment',
    subsector: 'ground-station-marketplace',
    tags: ['ground-station', 'marketplace', 'sharing-economy', 'StellarStation', 'cloud-platform'],
    tier: 3,
    totalFunding: 18000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2021-04-01',
    ownershipType: 'private',
    products: [
      {
        name: 'StellarStation',
        category: 'platform',
        description: 'Cloud-based marketplace connecting satellite operators with available ground station antenna time for on-demand satellite communications.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Naomi Kurahara',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Former Mitsubishi Electric satellite engineer who founded Infostellar to create a ground station sharing marketplace.',
        previousCompanies: ['Mitsubishi Electric'],
      },
    ],
    events: [
      {
        date: '2016-01-01',
        type: 'founding',
        title: 'Infostellar founded in Tokyo',
        description: 'Naomi Kurahara founded Infostellar to build a ground station sharing marketplace connecting satellite and antenna operators.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Infostellar HQ',
        type: 'headquarters',
        city: 'Tokyo',
        country: 'Japan',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 45 },
    ],
  },

  // 6. Leaf Space
  {
    name: 'Leaf Space',
    legalName: 'Leaf Space S.r.l.',
    slug: 'leaf-space',
    headquarters: 'Lomazzo, Como',
    country: 'Italy',
    foundedYear: 2014,
    employeeRange: '50-100',
    employeeCount: 70,
    website: 'https://www.leaf.space',
    description: 'Leaf Space provides ground segment as a service (GSaaS) for LEO satellite operators through its Leaf Line network of globally distributed ground stations. The company offers end-to-end ground segment solutions including automated satellite pass scheduling, data downlink, and delivery via cloud APIs.',
    longDescription: 'Leaf Space focuses exclusively on supporting the LEO satellite market with affordable, scalable ground segment services. Its Leaf Line ground stations are standardized and rapidly deployable, enabling the company to expand coverage as customer demand grows. The company supports S-band, X-band, and UHF frequencies.',
    ceo: 'Jonata Puglia',
    sector: 'ground-segment',
    subsector: 'gsaas',
    tags: ['GSaaS', 'LEO-support', 'ground-station', 'automated', 'European-space'],
    tier: 3,
    totalFunding: 25000000,
    lastFundingRound: 'Series B',
    lastFundingDate: '2023-02-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Leaf Line Ground Network',
        category: 'ground-segment',
        description: 'Globally distributed network of standardized ground stations providing automated GSaaS for LEO satellite operators.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Jonata Puglia',
        title: 'Co-founder & CEO',
        role: 'executive',
        bio: 'Co-founded Leaf Space to provide affordable, scalable ground segment services for the growing LEO satellite market.',
        previousCompanies: ['Politecnico di Milano'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-02-01',
        amount: 14000000,
        seriesLabel: 'Series B',
        roundType: 'series_b',
        leadInvestor: 'Primo Space',
      },
    ],
    events: [
      {
        date: '2014-01-01',
        type: 'founding',
        title: 'Leaf Space founded in Italy',
        description: 'Leaf Space was founded to provide ground segment as a service for the emerging LEO smallsat market.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'Leaf Space HQ',
        type: 'headquarters',
        city: 'Lomazzo',
        country: 'Italy',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 48 },
    ],
  },

  // 7. Mynaric
  {
    name: 'Mynaric',
    legalName: 'Mynaric AG',
    slug: 'mynaric',
    ticker: 'MYNA',
    exchange: 'NASDAQ',
    headquarters: 'Munich',
    country: 'Germany',
    foundedYear: 2009,
    employeeRange: '250-500',
    employeeCount: 400,
    website: 'https://www.mynaric.com',
    description: 'Mynaric develops and manufactures laser communication terminals for air and space applications, enabling high-bandwidth optical inter-satellite links (OISL) and satellite-to-ground data transfer. The company is a key supplier of free-space optical communication hardware for government and commercial satellite constellations.',
    longDescription: 'Mynaric was spun out of the German Aerospace Center (DLR) and has become a leading producer of laser communication terminals. The company supplies hardware for programs including the Space Development Agency Transport Layer and commercial mega-constellations. Mynaric\'s CONDOR series terminals support Gbps-class optical links between satellites.',
    ceo: 'Mustafa Veziroglu',
    isPublic: true,
    marketCap: 200000000,
    sector: 'ground-segment',
    subsector: 'optical-communications',
    tags: ['laser-comms', 'OISL', 'optical-terminals', 'free-space-optics', 'SDA'],
    tier: 2,
    totalFunding: 180000000,
    revenueEstimate: 15000000,
    ownershipType: 'public',
    products: [
      {
        name: 'CONDOR Mk3',
        category: 'hardware',
        description: 'Optical inter-satellite link terminal for LEO constellations, supporting multi-Gbps laser communications between spacecraft.',
        status: 'active',
      },
      {
        name: 'HAWK',
        category: 'hardware',
        description: 'Airborne optical communications terminal for high-altitude platforms and aircraft-to-satellite laser links.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Mustafa Veziroglu',
        title: 'CEO',
        role: 'executive',
        bio: 'Aerospace executive leading Mynaric through its transition from R&D to volume production of laser communication terminals.',
        previousCompanies: ['Airbus Defence and Space'],
      },
    ],
    events: [
      {
        date: '2009-01-01',
        type: 'founding',
        title: 'Mynaric founded as DLR spinoff',
        description: 'Mynaric was spun out of the German Aerospace Center (DLR) to commercialize free-space optical communication technology.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Mynaric HQ & Manufacturing',
        type: 'headquarters',
        city: 'Munich',
        country: 'Germany',
      },
      {
        name: 'Mynaric US Operations',
        type: 'manufacturing',
        city: 'Los Angeles',
        state: 'CA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 60 },
    ],
  },

  // 8. Aalyria
  {
    name: 'Aalyria',
    legalName: 'Aalyria Technologies Inc.',
    slug: 'aalyria',
    headquarters: 'Livermore, CA',
    country: 'United States',
    foundedYear: 2022,
    employeeRange: '50-100',
    employeeCount: 90,
    website: 'https://www.aalyria.com',
    description: 'Aalyria Technologies builds network orchestration software and free-space optical communication systems for managing complex multi-domain networks spanning space, air, and ground. The company spun out of Alphabet (Google), inheriting technology from Project Loon and Fsoc (Free Space Optical Communications).',
    longDescription: 'Aalyria\'s Spacetime platform provides AI-driven network orchestration for heterogeneous communications networks that span satellites, high-altitude platforms, aircraft, ships, and terrestrial infrastructure. Combined with its Tightbeam laser communication hardware, Aalyria enables seamless connectivity management across domains.',
    ceo: 'Chris Taylor',
    sector: 'ground-segment',
    subsector: 'network-orchestration',
    tags: ['network-orchestration', 'laser-comms', 'ex-Google', 'multi-domain', 'AI-networking'],
    tier: 3,
    totalFunding: 50000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2023-04-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Spacetime',
        category: 'software',
        description: 'AI-driven network orchestration platform for managing multi-domain communications across space, air, and ground networks.',
        status: 'active',
      },
      {
        name: 'Tightbeam',
        category: 'hardware',
        description: 'Free-space optical communication terminal for high-bandwidth laser links between satellites, aircraft, and ground stations.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Chris Taylor',
        title: 'CEO',
        role: 'executive',
        bio: 'Former Google/Alphabet executive who led the spinout of Loon and FSOC technology into Aalyria.',
        previousCompanies: ['Google', 'Alphabet', 'Project Loon'],
      },
    ],
    fundingRounds: [
      {
        date: '2023-04-01',
        amount: 50000000,
        seriesLabel: 'Series A',
        roundType: 'series_a',
        leadInvestor: 'J2 Ventures',
      },
    ],
    events: [
      {
        date: '2022-01-01',
        type: 'founding',
        title: 'Aalyria spun out of Alphabet/Google',
        description: 'Aalyria Technologies was founded as a spinout from Alphabet, inheriting Project Loon networking and FSOC laser communication technology.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Aalyria HQ',
        type: 'headquarters',
        city: 'Livermore',
        state: 'CA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 55 },
    ],
  },

  // 9. Hubble Network
  {
    name: 'Hubble Network',
    legalName: 'Hubble Network Inc.',
    slug: 'hubble-network',
    headquarters: 'Seattle, WA',
    country: 'United States',
    foundedYear: 2021,
    employeeRange: '10-50',
    employeeCount: 30,
    website: 'https://www.hubblenetwork.com',
    description: 'Hubble Network is developing technology to connect standard Bluetooth devices directly to satellites, enabling global IoT connectivity without any modifications to existing Bluetooth chips. The company has demonstrated Bluetooth-to-satellite communication from orbit, potentially unlocking satellite connectivity for billions of existing IoT devices.',
    longDescription: 'Hubble Network takes a radically different approach to satellite IoT by targeting the ubiquitous Bluetooth Low Energy (BLE) standard rather than requiring custom satellite modems. By building highly sensitive receivers on their satellites, Hubble can detect standard Bluetooth signals from the ground, enabling asset tracking and monitoring for devices that already contain Bluetooth chips.',
    ceo: 'Alex Haro',
    sector: 'ground-segment',
    subsector: 'direct-to-device',
    tags: ['Bluetooth', 'direct-to-device', 'IoT', 'LEO', 'satellite-connectivity'],
    tier: 3,
    totalFunding: 23000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2024-04-01',
    ownershipType: 'private',
    products: [
      {
        name: 'Hubble Bluetooth-to-Satellite Network',
        category: 'satellite-constellation',
        description: 'LEO satellite network capable of receiving standard Bluetooth Low Energy signals from ground-based IoT devices for global asset tracking.',
        status: 'development',
      },
    ],
    keyPersonnel: [
      {
        name: 'Alex Haro',
        title: 'Co-founder & CEO',
        role: 'executive',
        bio: 'Former Amazon and Life360 executive who co-founded Hubble Network to connect Bluetooth devices directly to satellites.',
        previousCompanies: ['Amazon', 'Life360'],
      },
    ],
    fundingRounds: [
      {
        date: '2024-04-01',
        amount: 20000000,
        seriesLabel: 'Series A',
        roundType: 'series_a',
        leadInvestor: 'a16z',
      },
    ],
    events: [
      {
        date: '2021-01-01',
        type: 'founding',
        title: 'Hubble Network founded in Seattle',
        description: 'Alex Haro and Ben Wild co-founded Hubble Network to enable Bluetooth-to-satellite IoT connectivity.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Hubble Network HQ',
        type: 'headquarters',
        city: 'Seattle',
        state: 'WA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 42 },
    ],
  },

  // 10. RBC Signals
  {
    name: 'RBC Signals',
    legalName: 'RBC Signals Inc.',
    slug: 'rbc-signals',
    headquarters: 'Seattle, WA',
    country: 'United States',
    foundedYear: 2017,
    employeeRange: '10-50',
    employeeCount: 25,
    website: 'https://www.rbcsignals.com',
    description: 'RBC Signals operates a global ground station aggregation platform that connects satellite operators with over 50 partner ground stations worldwide. The company provides affordable, on-demand satellite communication services by pooling underutilized antenna capacity from existing ground station operators.',
    longDescription: 'RBC Signals takes a capital-light approach to ground segment services by aggregating capacity from existing ground stations rather than building its own. The platform connects satellite operators with a network of partner antennas, offering flexible scheduling, data capture, and delivery without the upfront investment of building dedicated ground infrastructure.',
    ceo: 'Christopher Richins',
    sector: 'ground-segment',
    subsector: 'ground-station-aggregation',
    tags: ['ground-station', 'aggregation', 'on-demand', 'NewSpace', 'platform'],
    tier: 3,
    totalFunding: 8000000,
    lastFundingRound: 'Series A',
    lastFundingDate: '2020-01-01',
    ownershipType: 'private',
    products: [
      {
        name: 'RBC Signals Ground Station Platform',
        category: 'platform',
        description: 'Global ground station aggregation platform connecting satellite operators with 50+ partner antenna sites for on-demand communication services.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Christopher Richins',
        title: 'Founder & CEO',
        role: 'executive',
        bio: 'Former NASA and Planetary Resources engineer who founded RBC Signals to aggregate global ground station capacity.',
        previousCompanies: ['NASA', 'Planetary Resources'],
      },
    ],
    events: [
      {
        date: '2017-01-01',
        type: 'founding',
        title: 'RBC Signals founded in Seattle',
        description: 'Christopher Richins founded RBC Signals to build a ground station aggregation platform for the NewSpace industry.',
        importance: 6,
      },
    ],
    facilities: [
      {
        name: 'RBC Signals HQ',
        type: 'headquarters',
        city: 'Seattle',
        state: 'WA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 38 },
    ],
  },

  // 11. Comtech Telecommunications
  {
    name: 'Comtech Telecommunications',
    legalName: 'Comtech Telecommunications Corp.',
    slug: 'comtech-telecommunications',
    ticker: 'CMTL',
    exchange: 'NASDAQ',
    headquarters: 'Chandler, AZ',
    country: 'United States',
    foundedYear: 1967,
    employeeRange: '1000-5000',
    employeeCount: 2000,
    website: 'https://www.comtech.com',
    description: 'Comtech Telecommunications is a leading provider of satellite modem and ground infrastructure technology, next-generation 911 systems, and troposcatter communication equipment. The company supplies satellite earth station equipment, VSAT platforms, and network management systems to defense, government, and commercial operators.',
    longDescription: 'Comtech has a long heritage in satellite ground infrastructure, producing high-performance satellite modems, frequency converters, amplifiers, and network management systems used by military and commercial satellite operators worldwide. The company also provides location technologies and next-gen 911 infrastructure for public safety communications.',
    ceo: 'Ken Peterman',
    isPublic: true,
    marketCap: 600000000,
    sector: 'ground-segment',
    subsector: 'satellite-modems',
    tags: ['satellite-modem', 'VSAT', 'ground-infrastructure', 'defense', 'troposcatter'],
    tier: 2,
    revenueEstimate: 550000000,
    ownershipType: 'public',
    products: [
      {
        name: 'Comtech Satellite Modem Portfolio',
        category: 'hardware',
        description: 'Family of high-performance satellite modems and VSAT platforms for government, defense, and commercial satellite communications.',
        status: 'active',
      },
      {
        name: 'Heights Networking Platform',
        category: 'platform',
        description: 'Advanced VSAT networking platform providing dynamic bandwidth allocation and network optimization for satellite operators.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Ken Peterman',
        title: 'President & CEO',
        role: 'executive',
        bio: 'Former Viasat and Harris Corporation executive who leads Comtech\'s transformation strategy.',
        previousCompanies: ['Viasat', 'Harris Corporation'],
      },
    ],
    events: [
      {
        date: '1967-01-01',
        type: 'founding',
        title: 'Comtech Telecommunications founded',
        description: 'Comtech was founded in 1967 and has grown into a leading provider of satellite ground infrastructure and communications technology.',
        importance: 7,
      },
    ],
    facilities: [
      {
        name: 'Comtech HQ',
        type: 'headquarters',
        city: 'Chandler',
        state: 'AZ',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 65 },
    ],
  },

  // 12. Gilat Satellite Networks
  {
    name: 'Gilat Satellite Networks',
    legalName: 'Gilat Satellite Networks Ltd.',
    slug: 'gilat-satellite-networks',
    ticker: 'GILT',
    exchange: 'NASDAQ',
    headquarters: 'Petah Tikva',
    country: 'Israel',
    foundedYear: 1987,
    employeeRange: '1000-5000',
    employeeCount: 1500,
    website: 'https://www.gilat.com',
    description: 'Gilat Satellite Networks is a global leader in VSAT satellite ground systems, providing satellite-based broadband communication solutions for telecom operators, defense forces, and enterprise customers. The company manufactures satellite terminals, hub systems, and network management platforms deployed in over 100 countries.',
    longDescription: 'Gilat has been a pioneer in VSAT technology for nearly four decades, delivering end-to-end satellite communication solutions from small remote terminals to large hub infrastructure. The company serves cellular backhaul, enterprise networking, broadband access, in-flight connectivity, and defense applications. Gilat is also a key ground technology supplier for LEO and MEO constellation operators.',
    ceo: 'Adi Sfadia',
    isPublic: true,
    marketCap: 450000000,
    sector: 'ground-segment',
    subsector: 'VSAT',
    tags: ['VSAT', 'ground-systems', 'cellular-backhaul', 'broadband', 'defense'],
    tier: 2,
    revenueEstimate: 300000000,
    ownershipType: 'public',
    products: [
      {
        name: 'SkyEdge IV Platform',
        category: 'platform',
        description: 'Multi-service VSAT platform supporting GEO, MEO, and LEO satellite networks with dynamic bandwidth management.',
        status: 'active',
      },
      {
        name: 'Gilat Satellite Terminals',
        category: 'hardware',
        description: 'Range of VSAT satellite terminals for enterprise, cellular backhaul, broadband access, and defense applications deployed in 100+ countries.',
        status: 'active',
      },
    ],
    keyPersonnel: [
      {
        name: 'Adi Sfadia',
        title: 'CEO',
        role: 'executive',
        bio: 'Leads Gilat Satellite Networks, driving the company into multi-orbit ground technology for LEO and MEO constellations.',
        previousCompanies: ['Gilat'],
      },
    ],
    events: [
      {
        date: '1987-01-01',
        type: 'founding',
        title: 'Gilat Satellite Networks founded in Israel',
        description: 'Gilat was founded in Israel and became a pioneer in VSAT satellite ground communication systems.',
        importance: 8,
      },
    ],
    facilities: [
      {
        name: 'Gilat HQ & R&D Center',
        type: 'headquarters',
        city: 'Petah Tikva',
        country: 'Israel',
      },
      {
        name: 'Gilat US Office',
        type: 'office',
        city: 'McLean',
        state: 'VA',
        country: 'United States',
      },
    ],
    scores: [
      { scoreType: 'overall', score: 68 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🚀 Seeding Batch 3: Satellite Operators & Ground Segment...\n');

  console.log('── Satellite Operators ──');
  for (const company of SAT_OPERATORS) {
    try {
      const p = await seedCompanyProfile(company);
      console.log(`  ✓ ${company.name} (${p.id})`);
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`);
    }
  }

  console.log('\n── Ground Segment ──');
  for (const company of GROUND_SEGMENT) {
    try {
      const p = await seedCompanyProfile(company);
      console.log(`  ✓ ${company.name} (${p.id})`);
    } catch (err) {
      console.error(`  ✗ ${company.name}: ${err}`);
    }
  }

  const total = await prisma.companyProfile.count();
  console.log(`\n✅ Batch 3 done! Total company profiles: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
